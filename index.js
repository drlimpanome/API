import express from 'express'
import http from 'http'
import fs from 'fs'
import mysql from 'mysql'
import { validateDocument, filterRelevantData, calculateTotalDebt } from './utils/documentValidate.js'
import { createConsulta, addUrlAws, getUrlViaId, addUnidade } from './controlers/tbConsultas.js'
import VerifyFaixa, { verifyRegion } from './controlers/faixaControler.js'
import dotenv from 'dotenv';
import { createPDF } from './utils/PdfCreation.js';
import { generatePresignedUrl, uploadFileToS3 } from './controlers/Upload.js'
import { consultDocument } from './utils/consultDocument.js'; // Importar a função consultDocument
import { downloadpdf } from './utils/consultDocument.js';
import Consultas from './models/tbconsultas.js'
import Ticket from './models/TbTIcket.js'
import { formatCurrency } from './utils/formatNumber.js'
dotenv.config(); // This ensures that environment variables from your .env file are loaded

const app = express();
const port = 80;

let connection;

const handleDisconnect = () => {
  connection = mysql.createConnection({
    host: process.env.DB_HOST,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: 'drlimpanome',
  });

  connection.connect((err) => {
    if (err) {
      console.error('Error connecting to the database:', err);
      setTimeout(handleDisconnect, 2000);
    } else {
      console.log('Connected to the database.');
    }
  });

  connection.on('error', (err) => {
    console.error('Database error:', err);
    if (err.code === 'PROTOCOL_CONNECTION_LOST') {
      handleDisconnect();
    } else {
      throw err;
    }
  });
};

handleDisconnect();

// Middleware para análise de corpo de solicitação JSON
app.use(express.json());

app.use((err, req, res, next) => {
    console.error(err.stack);
    res.status(500).send('Something broke!');
});

process.on('unhandledRejection', (reason, promise) => {
    console.error('Unhandled Rejection at:', promise, 'reason:', reason);
    // Optionally log the rejection and shut down gracefully
  });
  
  // Uncaught exceptions
  process.on('uncaughtException', (err) => {
    console.error('Uncaught Exception:', err);
    // Optionally log the exception and shut down gracefully
    process.exit(1);
  });

app.post('/consultDocument/:id', async (req, res) => {
    const { numeroDocumento } = req.body;
    const idTicket = req.params.id;

    try {
        const { status, data, pdfUrl, clientName } = await consultDocument(numeroDocumento);
        
        console.log(status, data, pdfUrl)
        const filteredData = filterRelevantData(data);
        const totalDebt = calculateTotalDebt(filteredData);

        if (pdfUrl) {
            try {
                const buffer = await downloadpdf(pdfUrl);
                const pdfBuffer = buffer.toString('base64');
                const filteredData = {};
                filteredData['pdf_base64'] = pdfBuffer;
                const path = 'pdfs/' + pdfUrl.split('/').pop();
                fs.writeFileSync(path, buffer, 'base64');
                console.log('PDF downloaded and saved:', path);
                await uploadFileToS3(path, `${clientName}_${numeroDocumento.replace(/[^\d]/g, '')}.pdf`); 
                // const update = await Consultas.update({ url: `${clientName}_${numeroDocumento.replace(/[^\d]/g, '')}.pdf`, divida: totalDebt, status_id: 3 }, { where: { id_ticket: idTicket } });
                fs.unlink(path, (err) => {
                    if (err) {
                      console.error('Error deleting the file:', err);
                      return;
                    }
                    console.log('File deleted successfully');
                  });
            } catch (error) {
                return res.status(400).json({ status: 'error', message: 'Erro ao baixar o PDF:' + error.message });
            }
        }

        return res.status(200).json({ status, totalDebt, data: filteredData, pdfUrl: `${clientName}_${numeroDocumento.replace(/[^\d]/g, '')}.pdf` });
    } catch (error) {
        console.log(error)
        console.error('Erro ao consultar o documento:', error.message);
        return res.status(400).json({ status: 'error', message: 'Ocorreu um erro ao consultar o documento.' });
    }
});


app.get('/', (req, res) => {
    res.writeHead(200, {'Content-Type': 'text/html'});
    res.end('<html><head><title>Hello</title></head><body><h1>Hello, World!</h1></body></html>');
  });

// Rota para lidar com a solicitação de inserção de dados
app.post('/inserir', (req, res) => {
    // Dados recebidos da solicitação
    const { nome, telefone, mensagem } = req.body;

    // Consulta SQL para inserir dados
    const sql = 'INSERT INTO history (nome, telefone, mensagem) VALUES (?, ?, ?)';
    const values = [nome, telefone, mensagem];

    // Executar a consulta SQL
    connection.query(sql, values, (err, result) => {
        if (err) {
            console.error('Erro ao inserir dados: ' + err.message);
            return res.status(500).send('Erro ao inserir dados');
        }
        console.log('Novo registro inserido com ID: ' + result.insertId);
        return res.status(200).send('Dados inseridos com sucesso');
    });
});

app.post('/ticketConsult', async (req, res) => {
    // Dados recebidos da solicitação
    const { contactid, whatsappid } = req.body;

    try {
        const alreeadyExist = await Consultas.findOne({
            where: { contact_id: contactid }})
          if (alreeadyExist) {
            console.log(alreeadyExist.status_id)
            if (alreeadyExist.status_id != 1) {
                await Consultas.update({ status_id: 1 }, { where: { contact_id: contactid }})
            }
            if (alreeadyExist.unidade == null || alreeadyExist.unidade.length != 3) {
                const region = await verifyRegion(alreeadyExist.id_ticket);
                await addUnidade(region, alreeadyExist.id_ticket)
                return res.status(200).send({
                    idTicket: alreeadyExist.id_ticket,
                    unidade: region
                });
            } else {
                return res.status(200).send({
                    idTicket: alreeadyExist.id_ticket,
                    unidade: alreeadyExist.unidade
                });
            }
          } else {
            const created = await Ticket.create({
                contact_id: contactid,
                whatsapp_id: whatsappid,
            })
            console.log('new created');
            const region = await verifyRegion(created.id_ticket);
            await addUnidade(region, created.id_ticket)
            await Consultas.create({
                id_ticket: created.id_ticket,
                contact_id: contactid,
                unidade: region,
                status_id: 1,
            }) 
            return res.status(200).send({
                idTicket: created.id_ticket,
                unidade: region
            });
          }
    } catch (error) {
        console.log(error)
        return res.status(500).send('Erro ao inserir dados na tabela tbTickets');        
    }
});

app.post('/ticketGenerate', (req, res) => {
    // Dados recebidos da solicitação
    const { contactid, whatsappid } = req.body;

    // Consulta SQL para inserir dados na tabela tbTickets
    const ticketSql = 'INSERT INTO tbTickets (contact_id, whatsapp_id) VALUES (?, ?)';
    const ticketValues = [contactid, whatsappid];

    // Executar a consulta SQL para inserção na tabela tbTickets
    connection.query(ticketSql, ticketValues, (err, ticketResult) => {
        if (err) {
            console.error('Erro ao inserir dados na tabela tbTickets: ' + err.message);
            return res.status(500).send('Erro ao inserir dados na tabela tbTickets');
        }
        
        // ID gerado pela inserção na tabela tbTickets
        const idTicktet = ticketResult.insertId;
        console.log('Novo registro de ticket inserido com ID: ' + idTicktet);
        
        // Consulta SQL para inserir dados na tabela tbConsultas
        const consultaSql = 'INSERT INTO tbConsultas (id_ticket, contact_id) VALUES (?, ?)';
        const consultaValues = [idTicktet, contactid]; // Defina o status como 'Pendente' por padrão e utilize a data atual

        // Executar a consulta SQL para inserção na tabela tbConsultas
        connection.query(consultaSql, consultaValues, async (err, consultaResult) => {
            if (err) {
                console.error('Erro ao inserir dados na tabela tbConsultas: ' + err.message);
                return res.status(500).send('Erro ao inserir dados na tabela tbConsultas');
            }
            
            // ID gerado pela inserção na tabela tbConsultas
            const idConsult = consultaResult.insertId;
            console.log('Nova consulta inserida com ID: ' + idConsult);
            let region;
            try {
               region = await verifyRegion(idTicktet)
               await addUnidade(region, idTicktet)
            } catch (e) {
                console.log(e)
            }
            
            // Retornar o ID do ticket na resposta da API
            return res.status(200).json({ idTicket: idTicktet, unidade: region });
        });
    });
});

app.get('/test/:id', async (req, res) => {
    try {
        const idTicket = req.params.id;
        const getUrlAndStatus = await getUrlViaId(idTicket);
        if (getUrlAndStatus.status_id !== '3') {
            throw new Error('A consulta ainda não foi finalizada.');
        }
        const urlParts = getUrlAndStatus.url.split("_");
        const fullUrl = `https://${req.get('host')}/download/${urlParts[0].replace(/ /g, "_")}_${urlParts[1]}`;
        const { name, region } = await VerifyFaixa(parseFloat(getUrlAndStatus.divida), idTicket);
        // await addUnidade(region, idTicket)

        return res.status(200).json({
            message: 'Upload successful',
            url: fullUrl,
            divida: name,
            unidade: region,
        });
    } catch (err) {
        const idTicket = req.params.id;
        const region = await verifyRegion(idTicket)
        // await addUnidade(region, idTicket)
        return res.status(200).json({
            unidade: region,
            message: 'ocorreu um erro'
        });
    }
});

app.get('/download/:fileName', async (req, res) => {
    const urlSplit = req.params.fileName.split("_");
    const document = urlSplit.pop(); // Removes and returns the last element
    const name = urlSplit.join(" "); // Joins the remaining elements with "_"
    const fileName = `${name}_${document}`;
    if (fileName) {
        try {
            const presignedUrl = await generatePresignedUrl(fileName);
            res.redirect(presignedUrl);
        } catch (error) {
            res.status(500).send('Erro ao gerar URL pré-assinada.');
        }
    }
})

app.post('/resetUnidade', async (req, res) => {
    try {
        const allWithNull = await Consultas.findAll({
            where: {
                unidade: null
            }
        });

        for (let i = 0; i < allWithNull.length; i++) {
            const region = await verifyRegion(allWithNull[i].id_ticket);
            await Consultas.update({ unidade: region }, { where: { id_ticket: allWithNull[i].id_ticket }});
            console.log('atualizado -ticket', allWithNull[i].id_ticket, 'region', region);
        }

    } catch (error) {
        console.log(error)
        return res.status(500).send('Erro ao inserir dados na tabela tbTickets');
    }
})

app.post('/askCpf/:id', async (req, res) => {
        try {
        // ID do ticket a ser atualizado
        const idTicket = req.params.id;

        // Documento (CPF ou CNPJ) recebido da solicitação
        const { document } = req.body;
        console.log(document);

        // Validação do documento (CPF ou CNPJ)
        const validationResult = validateDocument(document);
        if (!validationResult.isValid) {
            console.log('invalid_document');
            return res.status(200).json({message:'invalid_document'}); // Stop execution and return immediately
    }
        await createConsulta(validationResult.document, idTicket, res);
        return res.status(200).json({message: 'Updated successfully' });
        // Explicitly indicate that response handling is complete
    } catch(e) {
        return res.status(400).json({message: e.message});
         // Explicitly indicate that response handling is complete
    }
});

app.post('/faixa', async (req, res) => {
    const { value } = req.body;
    try {
        const faixaValue = await VerifyFaixa(value);
        return res.status(200).json({
            faixa: faixaValue.name
        });        
    } catch(e) {
        return res.status(400).json({
            message: e.message
        })
    }
})

app.get('/pdf/:id', async (req, res) => {
    try {
        const idTicket = req.params.id;
        const getUrlAndStatus = await getUrlViaId(idTicket);
        if (getUrlAndStatus.status_id !== '3') {
            throw new Error('A consulta ainda não foi finalizada.');
        }
        const urlParts = getUrlAndStatus.url.split("_");
        const fullUrl = `${urlParts[0].replace(/ /g, "_")}_${urlParts[1]}`;
        const returno = await VerifyFaixa(parseFloat(getUrlAndStatus.divida), idTicket);
        // await addUnidade(region, idTicket)

        return res.status(200).json({
            message: 'Upload successful',
            url: fullUrl,
            faixa: returno.name,
            unidade: returno.region,
            divida: formatCurrency(returno.valor),
        });
    } catch (err) {
        console.log(err)
        const idTicket = req.params.id;
        const region = await verifyRegion(idTicket)
        // await addUnidade(region, idTicket)
        return res.status(200).json({
            unidade: region,
            message: 'ocorreu um erro'
        });
    }
});

//https://positivonacional5.com/download/EDSON_APARECIDO_SANTOS_02360965166.pdf

// Opções do servidor HTTPS
const httpsOptions = {
    key: fs.readFileSync('./positivonacional5.pem'),
    cert: fs.readFileSync('./positivonacional5.crt')
};

// Criar servidor HTTPS
const server = http.createServer(/*httpsOptions, */app);

// Iniciar o servidor
server.listen(port, () => {
    console.log(`Servidor rodando em http://localhost:${port}`);
});


