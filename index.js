import express from "express";
import http from "http";
import fs from "fs";
import util from "util";
import mysql from "mysql";
import {
  validateDocument,
  filterRelevantData,
  calculateTotalDebt,
} from "./utils/documentValidate.js";
import {
  createConsulta,
  addUrlAws,
  getUrlViaId,
  addUnidade,
} from "./controlers/tbConsultas.js";
import VerifyFaixa, { verifyRegion } from "./controlers/faixaControler.js";
import dotenv from "dotenv";
import { createPDF } from "./utils/PdfCreation.js";
import { generatePresignedUrl, uploadFileToS3 } from "./controlers/Upload.js";
import { consultDocument } from "./utils/consultDocument.js"; // Importar a função consultDocument
import { downloadpdf } from "./utils/consultDocument.js";
import Consultas from "./models/tbconsultas.js";
import Ticket from "./models/TbTIcket.js";
import path, { dirname } from "path";
import { fileURLToPath } from "url";
import { formatCurrency } from "./utils/formatNumber.js";
import cors from "cors"; // Import cors
import { Op } from "sequelize";
import multer from "multer";
import puppeteer from "puppeteer";
import FormData from "form-data";
import axios from "axios";
import mysql from "mysql/promise";
// import swaggerDocs from "./swagger.js";

const upload = multer({ storage: multer.memoryStorage() });

dotenv.config();

const app = express();
const port = 80;

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

let connection;

const handleDisconnect = () => {
  connection = mysql.createConnection({
    host: process.env.DB_HOST,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: "drlimpanome",
  });

  connection.promise = () => ({
    query: (sql, values) => new Promise((resolve, reject) => {
      connection.query(sql, values, (err, result) => {
        if (err) reject(err);
        else resolve([result]);
      });
    }),
  });

  connection.connect((err) => {
    if (err) {
      console.error("Error connecting to the database:", err);
      setTimeout(handleDisconnect, 2000);
    } else {
      console.log("Connected to the database.");
    }
  });

  connection.on("error", (err) => {
    console.error("Database error:", err);
    if (err.code === "PROTOCOL_CONNECTION_LOST") {
      handleDisconnect();
    } else {
      throw err;
    }
  });
};

handleDisconnect();

app.use(express.json());

app.use(
  cors({
    origin: "*",
    methods: ["GET", "POST", "PUT", "DELETE"],
    allowedHeaders: ["Content-Type", "Authorization"],
  })
);

app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ message: "Ocorreu um erro interno", error: err.message });
});

process.on("unhandledRejection", (reason, promise) => {
  console.error("Unhandled Rejection at:", promise, "reason:", reason);
});

process.on("uncaughtException", (err) => {
  console.error("Uncaught Exception:", err);
  process.exit(1);
});

function generateHTML(dataMap) {
  // Validação inicial
  if (!dataMap || !dataMap.header || !dataMap.data || typeof dataMap.data !== 'object') {
    throw new Error("Dados inválidos: o objeto dataMap está incompleto ou no formato incorreto.");
  }

  // Gerar HTML do cabeçalho
  const headerHtml = Object.entries(dataMap.header).map(([key, value]) => `
      <tr>
          <th>${key}:</th>
          <td>${value}</td>
      </tr>
  `).join('');

  // Adicionar o total da dívida no cabeçalho
  const totalDebtFormatted = parseFloat(dataMap.divida).toFixed(2).replace('.', ',').replace(/\B(?=(\d{3})+(?!\d))/g, '.').toLocaleString('pt-BR');
  const totalDebtHtml = `
      <tr>
          <th>Total da Dívida:</th>
          <td>${dataMap.divida === 0 ? 'Nenhuma dívida encontrada.' : `R$ ${totalDebtFormatted}`}</td>
      </tr>
  `;

  // Gerar tabelas de dívidas
  const debtsTablesHtml = Object.entries(dataMap.data).map(([tableName, debts]) => {
    if (!debts.length) return '';

    // Obter todos os campos presentes nas dívidas desta tabela
    const allFields = new Set();
    debts.forEach(debt => {
      Object.keys(debt).forEach(field => {
        if (field !== 'table') {
          allFields.add(field);
        }
      });
    });

    // Gerar cabeçalho específico para cada tabela
    const tableHeaders = Array.from(allFields).map(key => `<th>${key.charAt(0).toUpperCase() + key.slice(1)}</th>`).join('');

    // Gerar linhas de dados
    const debtsHtml = debts.map(debt => {
      const debtValues = Array.from(allFields).map(key => {
        let value = debt[key] || '';
        if (key === 'valor' && value) {
          value = `R$ ${parseFloat(value).toFixed(2).replace('.', ',').replace(/\B(?=(\d{3})+(?!\d))/g, '.').toLocaleString('pt-BR')}`;
        }
        return `<td>${value}</td>`;
      }).join('');
      return `<tr>${debtValues}</tr>`;
    }).join('');

    return `
      <h5 class="p-2 bg-head mt-4 mb-0">${tableName}</h5>
      <table class="table table-striped table-hover border">
        <thead>
          <tr>
            ${tableHeaders}
          </tr>
        </thead>
        <tbody>
          ${debtsHtml}
        </tbody>
      </table>
    `;
  }).join('');

  // Retornar o HTML completo com ajustes estéticos
  return `
    <!DOCTYPE html>
    <html lang="pt-BR">
    <head>
      <meta charset="UTF-8">
      <title>Relatório de Dívidas</title>
      <style>
        .bg-head {
            color: #fff !important;
            background-color: #10163a !important;
            border-color: #10163a !important;
        }
        td{
            font-size: 14px;
        }
      </style>
      <link href="https://cdn.jsdelivr.net/npm/bootstrap@5.3.3/dist/css/bootstrap.min.css" rel="stylesheet" integrity="sha384-QWTKZyjpPEjISv5WaRU9OFeRpok6YctnYmDr5pNlyT2bRjXh0JMhjY6hW+ALEwIH" crossorigin="anonymous">
    </head>
    <body style="zoom: 0.75;">
      <div class="nav-align-top m-4">
      <div class="bg-white" style="align-self: center;">
        <div class="row">
                   <div class="col d-flex justify-content-start">
                       <img src="https://marcaspelomundo.com.br/wp-content/uploads/2021/03/Ref-Serasa.png" alt="Logo Serasa" style="width:200px;">
                   </div>
                   <div class="col d-flex justify-content-end">
                       <img src="https://aciav.org.br/wp-content/uploads/2020/01/logo-boa-vista-scpc.png" alt="Logo Boa Vista SCPC" style="width:200px;">
                   </div>
               </div> 
           <table class="table table-striped table-hover mt-4 border">
        <thead>
          <tr><th colspan="2" class="bg-head">DADOS BÁSICOS</th></tr>
        </thead>
        <tbody>
          ${headerHtml}
          ${totalDebtHtml}
        </tbody>
      </table>
      ${debtsTablesHtml}
      </div>
    </body>
    </html>
  `;
}


app.post("/generate-pdf", async (req, res) => {
  const { header, data, divida } = req.body;
  const { idTicket, fileName } = req.query;
  console.log("Dados recebidos:", { header, data, divida });

  let browser;
  try {
    await updateDivida(idTicket, divida);

    browser = await puppeteer.launch({ 
	headles: true,
	executablePath: '/usr/bin/google-chrome',
    	args: ['--no-sandbox', '--disable-setuid-sandbox']
});
    const page = await browser.newPage();

    const htmlContent = generateHTML({ header, data, divida });

    if (!htmlContent) {
      throw new Error("Conteúdo HTML gerado é inválido.");
    }

    await page.setContent(htmlContent);

    const pdfBuffer = await page.pdf({
      format: "A4",
      printBackground: true,
    });

    const safeFileName = fileName || "default.pdf";
    const filePath = path.join(__dirname, "pdfs", safeFileName);

    fs.writeFileSync(filePath, pdfBuffer);

    await updateUrl(idTicket, fileName);

    res.status(200).json({
      message: "PDF gerado com sucesso",
    });
  } catch (error) {
    console.error("Erro ao gerar o PDF:", error.message, error.stack);
    res.status(500).send("Erro ao gerar e enviar o PDF");
  } finally {
    if (browser) {
      await browser.close();
    }
  }
});


// Função para verificar se um arquivo está em uso
function isFileInUse(filePath) {
  try {
    fs.accessSync(filePath, fs.constants.R_OK | fs.constants.W_OK);
    return false; // O arquivo não está em uso
  } catch (err) {
    return true; // O arquivo está em uso
  }
}

/**
 * @swagger
 * /consultDocument/{id}:
 *   post:
 *     summary: Consulta um documento baseado no ID fornecido
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: ID do ticket
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               numeroDocumento:
 *                 type: string
 *                 description: Número do documento para consulta
 *     responses:
 *       200:
 *         description: Retorna os dados filtrados e URL do PDF, se disponível
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 status:
 *                   type: string
 *                 totalDebt:
 *                   type: number
 *                 data:
 *                   type: array
 *                   items:
 *                     type: object
 *                 pdfUrl:
 *                   type: string
 *       400:
 *         description: Erro ao consultar o documento
 */
app.post("/consultDocument/:id", async (req, res) => {
  const { numeroDocumento } = req.body;
  const idTicket = req.params.id;

  try {
    // Consulta usando Promises
    const query = 'SELECT contact_id, flow_id, origin FROM drlimpanome.tbconsultas WHERE id_ticket = ? ORDER BY ID_CONSULTA DESC LIMIT 1';
    const [result] = await connection.promise().query(query, [idTicket]); // <-- Usando promise()

    if (result.length === 0) {
      return res.status(404).json({ message: 'Ticket não encontrado' });
    }

    const { contact_id, flow_id, origin } = result[0];

    if (origin === "E1S22C3A4L5A6M7A8I9S") {
      // Resposta imediata
      res.status(200).send("ok recebido");

      try {
        const response = await consultDocument(numeroDocumento, idTicket);
        const { status, pdfUrl, totalDebt } = response;

        // Disparar POST
        const postUrl = `https://app.escalamais.ai/api/users/${contact_id}/send/${flow_id}/`;
        await axios.post(postUrl, { status, pdfUrl, totalDebt });
        console.log("POST enviado para:", postUrl);
      } catch (error) {
        console.error("Erro no processamento assíncrono:", error.message);
      }

    } else {
      // Fluxo normal
      const response = await consultDocument(numeroDocumento, idTicket);
      const { status, pdfUrl, totalDebt } = response;
      res.status(200).json({
        status,
        pdfUrl,
        totalDebt: formatCurrency(totalDebt),
      });
    }

  } catch (error) {
    console.error("Erro geral:", error.message);
    res.status(500).json({
      status: "error",
      message: "Erro interno no servidor"
    });
  }
});

app.get("/", (req, res) => {
  res.writeHead(200, { "Content-Type": "text/html" });
  res.end(
    "<html><head><title>Hello</title></head><body><h1>Hello, World!</h1></body></html>"
  );
});

/**
 * @swagger
 * /ticketConsult:
 *   post:
 *     summary: Consulta o status de um ticket e retorna a unidade associada
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               contactid:
 *                 type: string
 *                 description: ID de contato
 *               whatsappid:
 *                 type: string
 *                 description: ID do WhatsApp
 *     responses:
 *       200:
 *         description: Retorna o ID do ticket e unidade
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 idTicket:
 *                   type: integer
 *                 unidade:
 *                   type: string
 *       500:
 *         description: Erro ao consultar o ticket
 */
app.post("/ticketConsult", async (req, res) => {
  // Dados recebidos da solicitação
  const { contactid, whatsappid } = req.body;

  try {
    const alreeadyExist = await Consultas.findOne({
      where: { contact_id: contactid },
    });
    if (alreeadyExist) {
      console.log(alreeadyExist.status_id);
      if (alreeadyExist.status_id != 1) {
        await Consultas.update(
          { status_id: 1 },
          { where: { contact_id: contactid } }
        );
      }
      if (alreeadyExist.unidade == null || alreeadyExist.unidade.length != 3) {
        const region = await verifyRegion(alreeadyExist.id_ticket);
        await addUnidade(region, alreeadyExist.id_ticket);
        return res.status(200).send({
          idTicket: alreeadyExist.id_ticket,
          unidade: region,
        });
      } else {
        return res.status(200).send({
          idTicket: alreeadyExist.id_ticket,
          unidade: alreeadyExist.unidade,
        });
      }
    } else {
      const created = await Ticket.create({
        contact_id: contactid,
        whatsapp_id: whatsappid,
      });
      console.log("new created");
      const region = await verifyRegion(created.id_ticket);
      await addUnidade(region, created.id_ticket);
      await Consultas.create({
        id_ticket: created.id_ticket,
        contact_id: contactid,
        unidade: region,
        status_id: 1,
      });
      return res.status(200).send({
        idTicket: created.id_ticket,
        unidade: region,
      });
    }
  } catch (error) {
    console.log(error);
    return res.status(500).send("Erro ao inserir dados na tabela tbTickets");
  }
});

/**
 * @swagger
 * /ticketGenerate:
 *   post:
 *     summary: Gera um novo ticket e uma consulta associada
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               contactid:
 *                 type: string
 *                 description: ID de contato
 *               whatsappid:
 *                 type: string
 *                 description: ID do WhatsApp
 *     responses:
 *       200:
 *         description: Retorna o ID do ticket e a unidade associada
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 idTicket:
 *                   type: integer
 *                 unidade:
 *                   type: string
 *       500:
 *         description: Erro ao gerar o ticket
 */
app.post("/ticketGenerate", (req, res) => {
  // Dados recebidos da solicitação
  const { contactid, whatsappid, flowid, origin } = req.body;

  // Consulta SQL para inserir dados na tabela tbTickets
  const ticketSql =
    "INSERT INTO tbtickets (contact_id, whatsapp_id) VALUES (?, ?)";
  const ticketValues = [contactid, whatsappid];

  // Executar a consulta SQL para inserção na tabela tbtickets
  connection.query(ticketSql, ticketValues, (err, ticketResult) => {
    if (err) {
      console.error(
        "Erro ao inserir dados na tabela tbtickets: " + err.message
      );
      return res.status(500).send("Erro ao inserir dados na tabela tbtickets");
    }

    // ID gerado pela inserção na tabela tbtickets
    const idTicktet = ticketResult.insertId;
    console.log("Novo registro de ticket inserido com ID: " + idTicktet);

    // Consulta SQL para inserir dados na tabela tbconsultas
    const consultaSql =
      "INSERT INTO tbconsultas (id_ticket, contact_id, flow_id, origin) VALUES (?, ?, ?, ?)";
    const consultaValues = [idTicktet, contactid, flowid, origin]; // Defina o status como 'Pendente' por padrão e utilize a data atual

    // Executar a consulta SQL para inserção na tabela tbconsultas
    connection.query(
      consultaSql,
      consultaValues,
      async (err, consultaResult) => {
        if (err) {
          console.error(
            "Erro ao inserir dados na tabela tbconsultas: " + err.message
          );
          return res
            .status(500)
            .send("Erro ao inserir dados na tabela tbconsultas");
        }

        // ID gerado pela inserção na tabela tbconsultas
        const idConsult = consultaResult.insertId;
        console.log("Nova consulta inserida com ID: " + idConsult);
        let region;
        try {
          region = await verifyRegion(idTicktet);
          await addUnidade(region, idTicktet);
        } catch (e) {
          console.log(e);
        }

        // Retornar o ID do ticket na resposta da API
        return res.status(200).json({ idTicket: idTicktet, unidade: region });
      }
    );
  });
});

app.get("/status", (req, res) => {
  res.json({ status: "online" });
});

/**
 * @swagger
 * /download/{fileName}:
 *   get:
 *     summary: Faz download de um arquivo PDF pelo nome do arquivo
 *     parameters:
 *       - in: path
 *         name: fileName
 *         required: true
 *         schema:
 *           type: string
 *         description: Nome do arquivo PDF a ser baixado
 *     responses:
 *       200:
 *         description: Retorna o arquivo PDF
 *         content:
 *           application/pdf:
 *             schema:
 *               type: string
 *               format: binary
 *       404:
 *         description: Arquivo não encontrado
 *       500:
 *         description: Erro ao visualizar o arquivo
 */
app.get("/download/:fileName", async (req, res) => {
  const fileName = req.params.fileName;

  if (fileName) {
    try {
      const filePath = path.join(__dirname, "pdfs", fileName);

      // Check if the file exists before attempting to serve it
      if (fs.existsSync(filePath)) {
        res.setHeader("Content-Type", "application/pdf");
        res.setHeader("Content-Disposition", "inline; filename=" + fileName);
        fs.createReadStream(filePath).pipe(res);
      } else {
        res.status(404).send("Arquivo não encontrado.");
      }
    } catch (error) {
      console.error("Erro ao visualizar o arquivo:", error);
      res.status(500).send("Erro ao visualizar o arquivo.");
    }
  } else {
    res.status(400).send("Nome do arquivo inválido.");
  }
});

/**
 * @swagger
 * /resetUnidade:
 *   post:
 *     summary: Atualiza a unidade de todos os registros com unidade nula
 *     responses:
 *       200:
 *         description: Unidades atualizadas com sucesso
 *       500:
 *         description: Erro ao atualizar unidades
 */
app.post("/resetUnidade", async (req, res) => {
  try {
    const allWithNull = await Consultas.findAll({
      where: {
        unidade: null,
      },
    });

    for (let i = 0; i < allWithNull.length; i++) {
      const region = await verifyRegion(allWithNull[i].id_ticket);
      await Consultas.update(
        { unidade: region },
        { where: { id_ticket: allWithNull[i].id_ticket } }
      );
      console.log(
        "atualizado -ticket",
        allWithNull[i].id_ticket,
        "region",
        region
      );
    }
  } catch (error) {
    console.log(error);
    return res.status(500).send("Erro ao inserir dados na tabela tbTickets");
  }
});

/**
 * @swagger
 * /askCpf/{id}:
 *   post:
 *     summary: Atualiza o ticket com informações do CPF ou CNPJ
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: ID do ticket a ser atualizado
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               document:
 *                 type: string
 *                 description: CPF ou CNPJ a ser validado
 *     responses:
 *       200:
 *         description: Atualização realizada com sucesso
 *       400:
 *         description: Documento inválido ou erro ao atualizar
 */
app.post("/askCpf/:id", async (req, res) => {
  try {
    // ID do ticket a ser atualizado
    const idTicket = req.params.id;

    // Documento (CPF ou CNPJ) recebido da solicitação
    const { document } = req.body;
    console.log(document);

    // Validação do documento (CPF ou CNPJ)
    const validationResult = validateDocument(document);
    if (!validationResult.isValid) {
      console.log("invalid_document");
      return res.status(200).json({ message: "invalid_document" }); // Stop execution and return immediately
    }
    await createConsulta(validationResult.document, idTicket, res);
    
    return res.status(200).json({ message: "Updated successfully" });
    
    // Explicitly indicate that response handling is complete
  } catch (e) {
    return res.status(400).json({ message: e.message });
    // Explicitly indicate that response handling is complete
  }
});

/**
 * @swagger
 * /faixa:
 *   post:
 *     summary: Retorna a faixa associada ao valor fornecido
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               value:
 *                 type: number
 *                 description: Valor a ser consultado
 *     responses:
 *       200:
 *         description: Retorna a faixa associada ao valor
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 faixa:
 *                   type: string
 *       400:
 *         description: Erro ao consultar a faixa
 */
app.post("/faixa", async (req, res) => {
  const { value } = req.body;
  try {
    const faixaValue = await VerifyFaixa(value);
    return res.status(200).json({
      faixa: faixaValue.name,
    });
  } catch (e) {
    return res.status(400).json({
      message: e.message,
    });
  }
});

/**
 * @swagger
 * /not-consulted:
 *   get:
 *     summary: Busca um cliente que não foi consultado
 *     parameters:
 *       - in: query
 *         name: userId
 *         required: false
 *         schema:
 *           type: string
 *         description: ID do usuário (opcional)
 *     responses:
 *       200:
 *         description: Retorna um cliente que não foi consultado
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 notConsulted:
 *                   type: array
 *                   items:
 *                     type: object
 *       400:
 *         description: Erro ao buscar cliente
 */
app.get("/not-consulted", async (req, res) => {
  try {
    const userId = req.query.userId; // Assuming you're passing user ID in the request

    // Fetch a client that is not locked or has an expired lock (older than 5 minutes)
    const notConsulted = await Consultas.findOne({
      where: {
        status_id: 1,
        [Op.or]: [
          { locked: null },
          {
            locked_at: {
              [Op.lt]: new Date(new Date() - 5 * 60 * 1000), // Lock expired after 5 minutes
            },
          },
        ],
      },
    });

    if (!notConsulted) {
      return res.status(200).json({
        notConsulted: [],
      });
    }

    // Lock the client by updating the `locked_by` and `locked_at` columns
    await notConsulted.update({
      locked: true,
      locked_at: new Date(),
    });

    return res.status(200).json({
      notConsulted,
    });
  } catch (e) {
    return res.status(400).json({
      message: e.message,
    });
  }
});

/**
 * @swagger
 * /pdf/{id}:
 *   get:
 *     summary: Retorna informações sobre o PDF associado ao ticket
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: ID do ticket
 *     responses:
 *       200:
 *         description: Retorna informações do PDF, incluindo a URL e a faixa
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                 url:
 *                   type: string
 *                 faixa:
 *                   type: string
 *                 unidade:
 *                   type: string
 *                 divida:
 *                   type: string
 *       500:
 *         description: Erro ao consultar informações do PDF
 */
app.get("/pdf/:id", async (req, res) => {
  try {
    const idTicket = req.params.id;
    const getUrlAndStatus = await getUrlViaId(idTicket);
    if (getUrlAndStatus.status_id !== "3") {
      throw new Error("A consulta ainda não foi finalizada.");
    }
    // const urlParts = getUrlAndStatus.url.split("_");
    // const fullUrl = `${urlParts[0].replace(/ /g, "_")}_${urlParts[1]}`;
    
    const fullUrl = `https://drlimpanome.site/download/${getUrlAndStatus.url}`
    const returno = await VerifyFaixa(
      parseFloat(getUrlAndStatus.divida),
      idTicket
    );
    // await addUnidade(region, idTicket)

    return res.status(200).json({
      message: "Upload successful",
      url: fullUrl,
      faixa: returno.name,
      unidade: returno.region,
      divida: formatCurrency(returno.valor),
    });
  } catch (err) {
    console.log(err);
    const idTicket = req.params.id;
    const region = await verifyRegion(idTicket);
    // await addUnidade(region, idTicket)
    return res.status(200).json({
      unidade: region,
      message: "ocorreu um erro",
    });
  }
});

const unlinkFile = util.promisify(fs.unlink);

/**
 * @swagger
 * /upload-pdf/{id}:
 *   post:
 *     summary: Faz upload de um PDF associado a um ticket
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: ID do ticket
 *     requestBody:
 *       required: true
 *       content:
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             properties:
 *               pdf:
 *                 type: string
 *                 format: binary
 *                 description: Arquivo PDF a ser enviado
 *               fileName:
 *                 type: string
 *                 description: Nome do arquivo
 *               divida:
 *                 type: number
 *                 description: Valor da dívida associada
 *     responses:
 *       200:
 *         description: Upload realizado com sucesso
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                 url:
 *                   type: string
 *       400:
 *         description: Nenhum arquivo foi enviado
 *       500:
 *         description: Falha no upload
 */
app.post("/upload-pdf/:id", upload.single("pdf"), async (req, res) => {
  const idTicket = req.params.id;
  const file = req.file; // Arquivo enviado
  const { fileName, divida } = req.body;

  if (!file) {
    return res.status(400).json({ message: "Nenhum arquivo enviado" });
  }

  try {
    // Salvar o arquivo localmente antes de fazer o upload
    const filePath = path.join(__dirname, "pdfs", fileName || 'default.pdf');
    
    // Certifique-se que o arquivo foi corretamente salvo antes de iniciar o upload
    fs.writeFileSync(filePath, file.buffer);
gi
    await Consultas.update(
      { url: fileName, status_id: 3, divida },
      { where: { id_ticket: idTicket } }
    );

    return res.status(200).json({
      message: "Upload realizado com sucesso",
      url: `/download/${fileName}`,
    });
  } catch (err) {
    console.error(err);
    return res.status(500).json({
      message: "Falha no upload",
    });
  }
});


/**
 * @swagger
 * /get_cpfs:
 *   get:
 *     summary: Retrieve CPFs with the maximum ticket ID for each document
 *     responses:
 *       200:
 *         description: A list of documents with their maximum ticket ID
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 type: object
 *                 properties:
 *                   documento:
 *                     type: string
 *                   id_ticket:
 *                     type: integer
 *       404:
 *         description: No CPF found
 *       500:
 *         description: Server error occurred while fetching CPFs
 */
app.get('/get_cpfs', (req, res) => {

  const query = `SELECT REPLACE(REPLACE(documento,'.',''),'-','') AS documento FROM tbconsultas WHERE status_id in (1,4) and LENGTH (DOCUMENTO) = 14 limit 1`;

  connection.query(query, (err, results) => {
      if (err) {
          console.error('Erro ao obter CPFs:', err);
          res.status(500).json({ error: 'Erro ao obter CPFs' });
      } else {
          const cpfList = results.map(row => row.documento);
          res.json({ cpfList });
      }
  });
});

/**
 * @swagger
 * /update_status:
 *   put:
 *     summary: Atualiza o status de um ticket
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               id:
 *                 type: integer
 *                 description: ID do ticket
 *               status:
 *                 type: integer
 *                 description: Novo status do ticket
 *               bot:
 *                 type: string
 *                 description: Nome do bot que atualiza o status
 *     responses:
 *       200:
 *         description: Status atualizado com sucesso
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *       400:
 *         description: ID, status ou bot ausentes
 *       404:
 *         description: Consulta não encontrada
 *       500:
 *         description: Erro no servidor
 */
app.put('/update_status_por_cpf', (req, res) => {
  const { id_ticket, status, bot } = req.body;
  if (!id_ticket || !status || !bot) {
    return res.status(400).json({ message: 'idTicket, status ou bot ausentes' });
  }

  const query = `
    UPDATE tbconsultas 
    SET status_id = ?, updated_at = NOW(), updated_by = ?
    WHERE id_ticket = ?
  `;
  
  connection.query(query, [status, bot, id_ticket], (err, result) => {
    if (err) {
      console.error('Erro ao atualizar status:', err);
      return res.status(500).json({ error: 'Erro no servidor' });
    }
    if (result.affectedRows > 0) {
      return res.status(200).json({ message: 'Status atualizado com sucesso' });
    } else {
      return res.status(404).json({ message: 'Consulta não encontrada' });
    }
  });
});



/**
 * @swagger
 * /update_divida:
 *   put:
 *     summary: Atualiza a dívida de um ticket
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               id:
 *                 type: integer
 *                 description: ID do ticket
 *               value:
 *                 type: string
 *                 description: Novo valor da dívida
 *     responses:
 *       200:
 *         description: Dívida atualizada com sucesso
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *       400:
 *         description: ID ou valor ausentes
 *       404:
 *         description: Consulta não encontrada
 *       500:
 *         description: Erro no servidor
 */
const updateDivida = async (id, value) => {
  if (!id || value == null) {
    return { error: 'ID ou valor ausentes' };
  }

  // Arredondar para duas casas decimais
  const valorArredondado = parseFloat(value.toFixed(2));

  const query = `
    UPDATE tbconsultas 
    SET divida = ? 
    WHERE id_ticket = ?
  `;

  return new Promise((resolve, reject) => {
    connection.query(query, [valorArredondado, id], (err, result) => {
      if (err) {
        console.error('Erro ao atualizar dívida:', err);
        reject({ error: 'Erro no servidor' });
      } else if (result.affectedRows > 0) {
        resolve({ message: 'Dívida atualizada com sucesso' });
      } else {
        resolve({ error: 'Consulta não encontrada' });
      }
    });
  });
};



const updateUrl = async (id, url) => {
  if (!id || !url) {
    return { error: 'ID ou URL ausentes' };
  }

  // url = `https://drlimpanome.site/download/${url}`

  const query = `
    UPDATE tbconsultas 
    SET url = ? 
    WHERE id_ticket = ?
  `;

  try {
    const result = await connection.query(query, [url, id]);
    if (result.affectedRows > 0) {
      return { message: 'URL atualizada com sucesso' };
    } else {
      return { error: 'Consulta não encontrada' };
    }
  } catch (err) {
    console.error('Erro ao atualizar URL:', err);
    return { error: 'Erro no servidor' };
  }
};

/**
 * @swagger
 * /get_idTicket:
 *   get:
 *     summary: Buscar o ID do ticket mais recente para um documento
 *     description: Buscar o ID do ticket mais recente para um documento
 *     parameters:
 *       - in: query
 *         name: documento
 *         schema:
 *           type: string
 *         required: true
 *         description: Documento do ticket
 *     responses:
 *       200:
 *         description: Ticket encontrado com sucesso
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 idTicket:
 *                   type: integer
 *                   description: ID do ticket mais recente
 *       404:
 *         description: Ticket não encontrado
 *       500:
 *         description: Erro no servidor
 */
app.get('/get_idTicket', (req, res) => {
  
  try {

    // Documento (CPF ou CNPJ) recebido da solicitação
    let document = req.query.documento;
    console.log(document);

    // Validação do documento (CPF ou CNPJ)
    const validationResult = validateDocument(document);
    if (!validationResult.isValid) {
      console.log("invalid_document");
      return res.status(200).json({ message: "invalid_document" }); // Stop execution and return immediately
    }
    
    document = document.replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, '$1.$2.$3-$4');

    console.log(validationResult, document)
    if (!validationResult.isValid) {
        // throw new Error(`Erro ao consultar o documento: documento invalido`);
        return res.status(500).json({ erro: 'Documento inválido' });
    }  

    const query = 'SELECT max(id_ticket) as id_ticket FROM tbconsultas WHERE documento = ? AND status_id in (1,4) LIMIT 1';

    connection.query(query, [document], (err, result) => {
      if (err) {
        return res.status(500).json({ error: err });
      }

      if (result.length > 0) {
        console.log(`idTicket: ${result[0].id_ticket }`)
        return res.status(200).json({ idTicket: result[0].id_ticket });
      } else {
        return res.status(404).json({ message: 'Ticket não encontrado para o documento fornecido' });
      }
    });

    // Explicitly indicate that response handling is complete
  } catch (e) {
    return res.status(400).json({ message: e.message });
    // Explicitly indicate that response handling is complete
  }
});

// Criar servidor HTTPS
const server = http.createServer(/*httpsOptions, */ app);

// Iniciar o servidor
server.listen(port, () => {
  console.log(`Servidor rodando em http://localhost:${port}`);
});

//swaggerDocs(app, port);


