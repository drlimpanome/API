
import fetch from 'node-fetch';
import { validateDocument, getConfereTK } from './documentValidate.js'; // Para validar o documento (CPF ou CNPJ)
import { decode } from 'html-entities';
import dotenv from 'dotenv';
import mysql from 'mysql';
import { JSDOM } from 'jsdom';
dotenv.config();



// Configuração de conexão com o banco de dados
const connection = mysql.createConnection({
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: 'positivonacional5',
    host: process.env.DB_HOST,
});


export async function consultDocument(numeroDocumento) {

    const validationResult = validateDocument(numeroDocumento);
    console.log(validationResult, numeroDocumento)
    if (!validationResult.isValid) {
        return res.status(400).json({ status: 'invalid_document', undefined });
    }
    const tk = await getConfereTK()
    if (!tk) {
        throw Error('Ocorreu um erro ao obter token')
    }
    const apiUrl = `https://confere.link/app/?acao=CONS_SERA_${validationResult.type}&dado=${numeroDocumento}&tk=${tk}`;

    try {
        const response = await fetch(apiUrl);
        if (!response.ok) {
            throw new Error(`Erro ao consultar o documento: ${response.statusText}`);
        }
        console.log(response)
        const html = await response.text();
        console.log(html)
        const { status, data, pdfUrl, clientName } = recuperarDados(html);
        if (!pdfUrl) {
            throw new Error('Ocorreu um erro ao consultar o documento. Url do pdf nao foi encontrado');
        }
        console.log(status, data, pdfUrl, clientName)
        return { status, data, pdfUrl, clientName };
    } catch (error) {
        console.log(error.message)
        console.error('Erro ao consultar o documento:', error.message);
        throw new Error('Ocorreu um erro ao consultar o documento.');
    }
}

export function recuperarDados(html) {
    const data = {};
    const tables = html.match(/<div class="panel-heading">[\s\S]*?<table[^>]*>[\s\S]*?<\/table>/g) || [];
    const addressRegex = /<address[^>]*>([\s\S]*?)<\/address>/i;
    const addressMatch = html.match(addressRegex);
    let clientName

    if (addressMatch && addressMatch[1]) {
        const addressContent = addressMatch[1];
        const strongRegex = /<strong[^>]*>([^<]+)<\/strong>/i;
        const strongMatch = addressContent.match(strongRegex);
        console.log(strongMatch);

        if (strongMatch && strongMatch[1]) {
            clientName = strongMatch[1].trim();
        }
    }


    tables.forEach((tableSection, tableIndex) => {
        const tableNameMatch = tableSection.match(/<div class="panel-heading">([\s\S]*?)<\/div>/);
        const tableName = tableNameMatch ? cleanName(tableNameMatch[1]) : `unknown_table_${tableIndex + 1}`;
        const tableMatch = tableSection.match(/<table[^>]*>[\s\S]*?<\/table>/);
        const table = tableMatch ? tableMatch[0] : '';

        const columns = {};
        let columnNames = [];

        const rows = table.match(/<tr[^>]*>[\s\S]*?<\/tr>/g) || [];
        rows.forEach((row, rowIndex) => {
            let result = {}
            const headers = row.match(/<th[^>]*>[\s\S]*?<\/th>/g) || [];
            const cells = row.match(/<td[^>]*>[\s\S]*?<\/td>/g) || [];
            
            if (headers.length > 0) {
                headers.forEach((header, headerIndex) => {
                    let headerContent = header.replace(/<\/?th[^>]*>/g, '').trim();
                    headerContent = cleanName(headerContent);
                    if (headerContent === '') return; // Skip columns with empty names
                    columnNames[headerIndex] = headerContent;
                    columns[columnNames[headerIndex]] = null; // Set initial value to null
                });
            } else if (cells.length > 0) {
                cells.forEach((cell, cellIndex) => {
                    const cellContent = decode(cell.replace(/<\/?td[^>]*>/g, '').trim());
                    const columnName = columnNames[cellIndex];
                    if (columnName) {
                        result[columnName] = cellContent || null;
                    }
                });
            }
            if (Object.keys(result).length > 0) {
                if (!Array.isArray(data[tableName])) {
                    data[tableName] = []
                }
                data[tableName].push(result);
            }
        });
    });

    const pdfUrl = extractPdfUrl(html);

    data['pdf_url'] = pdfUrl;

    return { status: 'success', data, 'pdfUrl': pdfUrl, clientName };
}

export async function downloadpdf(url) {
    const response = await fetch(url);
    if (!response.ok) {
        throw new Error(`Failed to download PDF: ${response.statusText}`);
    }
    const arrayBuffer = await response.arrayBuffer();
    return Buffer.from(arrayBuffer);
}

function extractPdfUrl(html) {
    const dom = new JSDOM(html);
    const document = dom.window.document;
    const pdfLink = document.querySelector('a[href$=".pdf"]');
    return pdfLink ? pdfLink.href : null;
}

function cleanName(name) {
    return name
        .toLowerCase()
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, '') // Remove accents
        .replace(/[^a-z0-9]+/g, '_')    // Replace non-alphanumeric characters with underscores
        .replace(/^_+|_+$/g, '');       // Remove leading or trailing underscores
}
// Função para inserir dados nas várias tabelas
async function insertDataIntoTables(contactId, data) {
    try {
        // Iterar sobre os dados do JSON e inseri-los nas tabelas correspondentes
        for (const tableName in data) {
            const columns = Object.keys(data[tableName]);
            const values = columns.map(column => data[tableName][column]);

            // Consulta SQL dinâmica para inserir dados na tabela atual
            const insertSql = `INSERT INTO ${tableName} (${columns.join(', ')}) VALUES (${Array(columns.length).fill('?').join(', ')})`;

            // Executar a consulta SQL para inserção na tabela atual
            await new Promise((resolve, reject) => {
                connection.query(insertSql, values, (err, result) => {
                    if (err) {
                        console.error(`Erro ao inserir dados na tabela ${tableName}: ${err.message}`);
                        reject(err);
                    } else {
                        // ID gerado pela inserção na tabela atual
                        const insertId = result.insertId;
                        console.log(`Novo registro inserido na tabela ${tableName} com ID: ${insertId}`);
                        resolve();
                    }
                });
            });
        }
    } catch (error) {
        throw new Error(`Erro ao inserir dados nas tabelas: ${error.message}`);
    }
}

// Função para atualizar o status da consulta na tabela tbConsultas
async function updateConsultStatus(idTicket, status) {
    try {
        const updateSql = `
            UPDATE tbConsultas 
            SET status_id = ?, updated_at = current_timestamp(), updated_by = "BOT1" 
            WHERE id_ticket = ?
        `;
        
        // Executar a consulta SQL para atualização do status
        const [result] = await connection.execute(updateSql, [status, idTicket]);
        
        // Verificar se a atualização foi bem-sucedida
        return result.affectedRows > 0;
    } catch (error) {
        throw new Error(`Erro ao atualizar o status da consulta: ${error.message}`);
    }
}
