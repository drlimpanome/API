
import fetch from 'node-fetch';
import { validateDocument, getConfereTK } from './documentValidate.js'; // Para validar o documento (CPF ou CNPJ)
import { decode } from 'html-entities';
import dotenv from 'dotenv';
import mysql from 'mysql';
import { JSDOM } from 'jsdom';
dotenv.config();

// const apiURL = 'https://drlimpanome.site'
 const apiURL = 'http://localhost:80';

let documento;

// Função para extrair o texto de uma célula
function getTextFromCell(cell) {
    return cell.textContent.trim();
}

// Função para extrair dados básicos do cabeçalho
function getHeaderData(table) {
    const headerMap = {};

            const key = table.querySelector("tbody tr th").textContent.trim();
            const value = table.querySelector("tbody tr td").textContent.trim();
            if (key && value) {
                headerMap[key] = value;
            }

    return headerMap;
}

// Mapeamento dos campos por tabela
const tableColumnMappings = {
	'Refin Pefin': {
			data: ['data'],
			tipo: ['tipo'],
			valor: ['valor'],
			contrato: ['contrato'],
			origem: ['Oorigem'],
			empresa: ['empresa']
	},
	'Crédito': {
			data: ['data'],
			tipo: ['tipo'],
			nome: ['nome'],
			valor: ['valor'],
			cidade: ['cidade'],
			uf: ['uf'],
			dataDisponivel: ['Data Disponível'],
	},
	'Protestos': {
			data: ['data'],
			valor: ['valor'],
			cartorio: ['cartório'],
			cidade: ['cidade'],
			uf: ['uf']
	},
    // Adicione outros mapeamentos conforme necessário
};

// Configuração de conexão com o banco de dados
const connection = mysql.createConnection({
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: 'drlimpanome',
    host: process.env.DB_HOST,
});


export async function consultDocument(numeroDocumento, idTicket) {
    const validationResult = validateDocument(numeroDocumento);
    console.log(validationResult, numeroDocumento)
    if (!validationResult.isValid) {
        throw new Error(`Erro ao consultar o documento: documento invalido`);
    }
    // const tk = await getConfereTK()
    const tk = 'L26A-KEG-3938471-W4J-4308'
    if (!tk) {
        throw Error('Ocorreu um erro ao obter token')
    }
    const apiUrl = `https://confere.link/api/?acao=DIVIDAS_${validationResult.type}&dado=${numeroDocumento}&tk=${tk}`;

    console.log(apiUrl);

    try {
        const response = await fetch(apiUrl, {
            headers: {
                'Content-Type': 'text/html; charset=utf-8'
            }
        });
        if (!response.ok) {
            throw new Error(`Erro ao consultar o documento: ${response.statusText}`);
        }
        const buffer = await response.arrayBuffer();
        const decoder = new TextDecoder('utf-8');
        const html = decoder.decode(buffer);
        
        const { status, pdfUrl, totalDebt } =  await scrapeAndSendData(html, idTicket);
        if (!pdfUrl) {
            throw new Error('Ocorreu um erro ao consultar o documento. Url do pdf nao foi encontrado');
        }
        return { status, pdfUrl, totalDebt };
    } catch (error) {
        console.log(error.message)
        console.error('Erro ao consultar o documento:', error.message);
        throw new Error('Ocorreu um erro ao consultar o documento.');
    }
}


function extractTableData(table, tableName) {
    const rows = Array.from(table.querySelectorAll('tbody tr'));

    // Encontrar o índice da linha de cabeçalho
    let headerRowIndex = 0;

    if (!rows[0]) {
        // Não encontrou o cabeçalho, não processa esta tabela
        return [];
    }

    const headerRow = Array.from(table.querySelectorAll('thead tr'))[headerRowIndex];
    const dataRows = rows.slice(headerRowIndex + 1);

    // **Ajuste aqui**: Verificar se a tabela não possui dados
    // const noDataRow = dataRows.find(row => row.classList.contains('text-danger'));
    // if (noDataRow) {
    //     // Tabela sem dados, retorna array vazio
    //     return [];
    // }

    // Obter os nomes das colunas
    const headerCells = Array.from(headerRow.querySelectorAll('th')).map(getTextFromCell);
    const headers = headerCells.map(header => header.toLowerCase().trim());

    // Mapear índices com base no nome das colunas
    const columnIndices = {};
    headers.forEach((header, index) => {
        columnIndices[header] = index;
    });

    // tableName = tableName.replace('Cr�dito', 'Crédito');
    const mapping = tableColumnMappings[tableName];

    if (!mapping) {
        // Não há mapeamento para esta tabela, pula
        return [];
    }

    const debts = [];

    dataRows.forEach(row => {
        const cells = Array.from(row.querySelectorAll('td')).map(getTextFromCell);

        // Criar um objeto de dívida
        const debtEntry = {};

        Object.keys(mapping).forEach(field => {
            const possibleHeaders = mapping[field];
            let value = '';
            for (let header of possibleHeaders) {
                const index = columnIndices[header.toLowerCase()];
                if (index !== undefined) {
                    value = cells[index];
                    break;
                }
            }
            if (field === 'valor') {
                value = value ? parseFloat(value.replace(/[^\d.,-]/g, '').replace('.', '').replace(',', '.').replace('r$', '').trim()) : null;
                // Arredondar para duas casas decimais
                value = value ? parseFloat(value.toFixed(2)) : null;
            }
            debtEntry[field] = value || '';
        });

        debts.push(debtEntry);
    });

    return debts;
}

// Função principal que faz o scrape da página e envia os dados para a API
async function scrapeAndSendData(html,idTicket) {
	const dom = new JSDOM(html);
    const document = dom.window.document;
    const tables = document.querySelectorAll('table');
	const debtsByTable = {};
    const headerData = {};

	tables.forEach(table => {
			const tableNameElement = table.previousElementSibling;
			const tableName = tableNameElement?.textContent.trim();
			if (tableName) {
                if (!tableName.includes("Dados Gerais")){
                    const debts = extractTableData(table, tableName);
                    if (debts.length > 0) {
                            debtsByTable[tableName] = debts;
                    }
                }else{
                    table.querySelectorAll("tbody tr").forEach((row) => {
                        const key = row.querySelector("th").textContent.trim();
                        const value = row.querySelector("td").textContent.trim();
                        if (["Nome", "Documento", "Data"].includes(key) && value) {
                            headerData[key] = value;
                        }
                });
                }
			}
	});

	// Calcular o total
	const totalDebt = parseFloat(Object.values(debtsByTable).flat().reduce((sum, debt) => sum + (debt.valor || 0), 0).toFixed(2));

	// Obter dados do cabeçalho
	
	documento = headerData.Documento;

	const nomeCliente = headerData["Nome"] || 'Cliente';
	const fileName = `${nomeCliente.replace(/\s/g, '_')}_${documento}.pdf`;

	// Verificar se os dados estão corretos no console
	console.log("Dados enviados:", {
			header: headerData,
			data: debtsByTable,
			divida: totalDebt
	});

	// Formatar os dados para a API
	const formattedData = {
			header: headerData,
			data: debtsByTable,
			divida: totalDebt
	};

	// Gera a URL com os parâmetros de query para gerar o PDF
	const pdfUrl = `${apiURL}/generate-pdf?idTicket=${idTicket}&fileName=${encodeURIComponent(fileName)}`;

	// Envia os dados para gerar o PDF
	try {
		const response = await fetch(pdfUrl, {
			method: "POST",
			headers: {
					"Content-Type": "application/json"
			},
			body: JSON.stringify(formattedData)
		});

		if (!response.ok) {
			throw new Error("Falha ao gerar o PDF: " + response.statusText);
		}

		const data = await response.json();
		console.log("PDF gerado e salvo com sucesso.", data);

		// Atualiza o status para 'concluído'
		updateStatus(idTicket, 3, 'confere_api');
		return { status: 3, pdfUrl, totalDebt };
	} catch (error) {
		console.error("Erro ao gerar o PDF:", error);
		updateStatus(idTicket, 4, 'confere_api');
	}
}

async function updateStatus(id_ticket, status, bot) {
	const url = `${apiURL}/update_status_por_cpf`;

	try {
		const response = await fetch(url, {
			method: 'PUT',
			headers: {
				'Content-Type': 'application/json',
			},
			body: JSON.stringify({
				id_ticket: id_ticket,
				status: status,
				bot: bot,
			}),
		});

		const data = await response.json();

		console.log(`Status do documento ${documento} atualizado para ${status}:`, data);
	} catch (error) {
		console.error(`Erro ao atualizar status do documento ${documento}:`, error);
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

// Função para atualizar o status da consulta na tabela tbconsultas
async function updateConsultStatus(idTicket, status) {
    try {
        const updateSql = `
            UPDATE tbconsultas 
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
