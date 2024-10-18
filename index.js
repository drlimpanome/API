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
import puppeteer from 'puppeteer';
// import swaggerDocs from "./swagger.js";

const upload = multer({ storage: multer.memoryStorage() });

dotenv.config(); // This ensures that environment variables from your .env file are loaded

const app = express();
const port = 80;

// Workaround to define __dirname in ES modules
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

// Middleware para análise de corpo de solicitação JSON
app.use(express.json());

app.use(cors());

app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).send("Something broke!");
});

process.on("unhandledRejection", (reason, promise) => {
  console.error("Unhandled Rejection at:", promise, "reason:", reason);
  // Optionally log the rejection and shut down gracefully
});

// Uncaught exceptions
process.on("uncaughtException", (err) => {
  console.error("Uncaught Exception:", err);
  // Optionally log the exception and shut down gracefully
  process.exit(1);
});

// HTML Template Generator
function generateHTML(dataMap) {
  // Verifica se dataMap, dataMap.header e dataMap.data são definidos
  if (!dataMap || !dataMap.header || !dataMap.data) {
    throw new Error("Dados inválidos: o objeto dataMap está incompleto.");
  }

  return `
  <!DOCTYPE html>
  <html lang="en">
  <head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>PDF Report</title>
    <style>
      body {
        font-family: Arial, sans-serif;
        margin: 20px;
      }
      table {
        width: 100%;
        border-collapse: collapse;
        margin-bottom: 20px;
      }
      table th, table td {
        border: 1px solid #ddd;
        padding: 8px;
        text-align: left;
      }
      table th {
        background-color: #f2f2f2;
      }
      .tr-header {
        background-color: #333;
        color: white;
        font-weight: bold;
        text-align: left;
        padding: 8px;
      }
      .client-info-header {
        font-weight: bold;
      }
      footer {
        text-align: center;
        margin-top: 20px;
        font-size: 12px;
      }
    </style>
  </head>
  <body>
    <div class="pdf-container">
      <!-- Header Table -->
      <table>
        <thead>
          <tr>
            <th colSpan="2" class="tr-header">DADOS PESSOAIS</th>
          </tr>
        </thead>
        <tbody>
          ${Object.entries(dataMap.header)
            .map(
              ([key, value]) => `
            <tr>
              <th class='client-info-header'>${key}</th>
              <td>${value}</td>
            </tr>
          `
            )
            .join("")}
        </tbody>
      </table>

      <!-- Data Tables -->
      ${dataMap.data
        .map(
          (tableData) => `
        <table>
          <thead>
            <tr>
              <th colSpan="${tableData.colunmName.length}" class="tr-header">
                ${tableData.title.toUpperCase()}
              </th>
            </tr>
            <tr>
              ${tableData.colunmName.map((col) => `<th>${col}</th>`).join("")}
            </tr>
          </thead>
          <tbody>
            ${tableData.rows
              .map(
                (row) => `
              <tr>
                ${row.map((cell) => `<td>${cell}</td>`).join("")}
              </tr>
            `
              )
              .join("")}
          </tbody>
        </table>
      `
        )
        .join("")}

      <!-- Footer -->
      <footer>
        <p>Gerado por Dr. limpa nome</p>
      </footer>
    </div>
  </body>
  </html>
  `;
}


/**
 * @swagger
 * /generate-pdf:
 *   post:
 *     summary: Gera um PDF com base nos dados fornecidos
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               header:
 *                 type: object
 *                 description: Dados do cabeçalho do PDF
 *               data:
 *                 type: array
 *                 items:
 *                   type: object
 *                 description: Dados para preencher as tabelas do PDF
 *     responses:
 *       200:
 *         description: PDF gerado com sucesso
 *         content:
 *           application/pdf:
 *             schema:
 *               type: string
 *               format: binary
 *       500:
 *         description: Erro ao gerar o PDF
 */
app.post("/generate-pdf", async (req, res) => {
  const dataMap = req.body; // Assuming the incoming data matches the DataTable structure

  try {
    // Launch Puppeteer and generate the PDF
    const browser = await puppeteer.launch();
    const page = await browser.newPage();

    // Set content as HTML
    const htmlContent = generateHTML(dataMap);
    await page.setContent(htmlContent);

    // Generate PDF
    const pdfBuffer = await page.pdf({
      format: "A4",
      printBackground: true,
    });

    await browser.close();

    // Set the response headers to force download
    res.set({
      "Content-Type": "application/pdf",
      "Content-Disposition": 'attachment; filename="report.pdf"',
      "Content-Length": pdfBuffer.length,
    });

    // Send the PDF buffer as the response
    res.send(pdfBuffer);
  } catch (error) {
    console.error(error);
    res.status(500).send("Error generating PDF");
  }
});

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
    const { status, data, pdfUrl, clientName } = await consultDocument(
      numeroDocumento
    );
    const filteredData = filterRelevantData(data);
    const totalDebt = calculateTotalDebt(filteredData);

    if (pdfUrl) {
      try {
        const buffer = await downloadpdf(pdfUrl);
        const sanitizedClientName = clientName.replace(/ /g, "_"); // Replace spaces with underscores
        const fileName = `${sanitizedClientName}_${numeroDocumento.replace(
          /[^\d]/g,
          ""
        )}.pdf`;
        const filePath = path.join(__dirname, "pdfs", fileName);

        fs.writeFileSync(filePath, buffer, "base64");
        console.log("PDF downloaded and saved:", filePath);

        await Consultas.update(
          {
            url: fileName,
            divida: totalDebt,
            status_id: 3,
          },
          { where: { id_ticket: idTicket } }
        );
      } catch (error) {
        return res.status(400).json({
          status: "error",
          message: "Erro ao baixar o PDF: " + error.message,
        });
      }
    }

    return res.status(200).json({
      status,
      totalDebt,
      data: filteredData,
      pdfUrl: `${clientName}_${numeroDocumento.replace(/[^\d]/g, "")}.pdf`,
    });
  } catch (error) {
    console.log(error);
    console.error("Erro ao consultar o documento:", error.message);
    return res.status(400).json({
      status: "error",
      message: "Ocorreu um erro ao consultar o documento.",
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
 * /inserir:
 *   post:
 *     summary: Insere dados na tabela de histórico
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               nome:
 *                 type: string
 *                 description: Nome da pessoa
 *               telefone:
 *                 type: string
 *                 description: Telefone de contato
 *               mensagem:
 *                 type: string
 *                 description: Mensagem associada
 *     responses:
 *       200:
 *         description: Dados inseridos com sucesso
 *       500:
 *         description: Erro ao inserir dados
 */
app.post("/inserir", (req, res) => {
  // Dados recebidos da solicitação
  const { nome, telefone, mensagem } = req.body;

  // Consulta SQL para inserir dados
  const sql = "INSERT INTO history (nome, telefone, mensagem) VALUES (?, ?, ?)";
  const values = [nome, telefone, mensagem];

  // Executar a consulta SQL
  connection.query(sql, values, (err, result) => {
    if (err) {
      console.error("Erro ao inserir dados: " + err.message);
      return res.status(500).send("Erro ao inserir dados");
    }
    console.log("Novo registro inserido com ID: " + result.insertId);
    return res.status(200).send("Dados inseridos com sucesso");
  });
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
  const { contactid, whatsappid } = req.body;

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
      "INSERT INTO tbconsultas (id_ticket, contact_id) VALUES (?, ?)";
    const consultaValues = [idTicktet, contactid]; // Defina o status como 'Pendente' por padrão e utilize a data atual

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

app.get("/test/:id", async (req, res) => {
  try {
    const idTicket = req.params.id;
    const getUrlAndStatus = await getUrlViaId(idTicket);
    if (getUrlAndStatus.status_id !== "3") {
      throw new Error("A consulta ainda não foi finalizada.");
    }
    const urlParts = getUrlAndStatus.url.split("_");
    const fullUrl = `https://${req.get("host")}/download/${urlParts[0].replace(
      / /g,
      "_"
    )}_${urlParts[1]}`;
    const { name, region } = await VerifyFaixa(
      parseFloat(getUrlAndStatus.divida),
      idTicket
    );
    // await addUnidade(region, idTicket)

    return res.status(200).json({
      message: "Upload successful",
      url: fullUrl,
      divida: name,
      unidade: region,
    });
  } catch (err) {
    const idTicket = req.params.id;
    const region = await verifyRegion(idTicket);
    // await addUnidade(region, idTicket)
    return res.status(200).json({
      unidade: region,
      message: "ocorreu um erro",
    });
  }
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
    const urlParts = getUrlAndStatus.url.split("_");
    const fullUrl = `${urlParts[0].replace(/ /g, "_")}_${urlParts[1]}`;
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
  const file = req.file; // The uploaded file
  const { fileName, divida } = req.body;

  if (!file) {
    return res.status(400).json({ message: "No file uploaded" });
  }

  try {
    // Salvar o arquivo localmente
    const filePath = path.join(__dirname, "pdfs", fileName);
    fs.writeFileSync(filePath, file.buffer);

    await Consultas.update(
      { url: fileName, status_id: 3, divida },
      { where: { id_ticket: idTicket } }
    );

    return res.status(200).json({
      message: "Upload successful",
      url: `/download/${fileName}`,
    });
  } catch (err) {
    console.error(err);
    return res.status(500).json({
      message: "Upload failed",
    });
  } // */
  res.status(200).json({
    message: "Upload successful",
  }); // */
});

//https://positivonacional5.com/download/EDSON_APARECIDO_SANTOS_02360965166.pdf

// Opções do servidor HTTPS
const httpsOptions = {
  key: fs.readFileSync("./drlimpanome.pem"),
  cert: fs.readFileSync("./drlimpanome.crt"),
};

// Criar servidor HTTPS
const server = http.createServer(/*httpsOptions, */ app);

// Iniciar o servidor
server.listen(port, () => {
  console.log(`Servidor rodando em http://localhost:${port}`);
});

//swaggerDocs(app, port);