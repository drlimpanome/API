const apiURL = 'https://drlimpanome.site'
// const apiURL = 'http://localhost:80'
let documento
let idTicket

// Função para extrair o texto de uma célula, removendo espaços extras
function getTextFromCell(cell) {
    return cell.textContent.trim();
}

// Função para extrair dados básicos do cabeçalho
function getHeaderData() {
    const headerMap = {};
    document.querySelectorAll(".table-striped:first-of-type tbody tr").forEach((row) => {
        const headerCells = row.querySelectorAll("td");
        if (headerCells.length === 2) {
            const key = getTextFromCell(headerCells[0]).replace(":", "");
            const value = getTextFromCell(headerCells[1]);
            if (key && value) {
                // if ( headerMap[key] === "CPF" ||  headerMap[key] === "CNPJ") {
                //     document = value;
                // }
                
                headerMap[key] = value;
            }
        }
    });
    return headerMap;
}

// Função para extrair dados de uma tabela e formatar como no formato esperado
function extractTableData(table, tableName) {
    const rows = Array.from(table.querySelectorAll('tbody tr')).slice(1); // Ignorar a primeira linha do cabeçalho
    const dataRows = rows.map(row => {
        const cells = Array.from(row.querySelectorAll('td')).map(getTextFromCell);
        
        // Caso a célula de valor (índice 3) não exista ou seja vazia, trate como null
        const value = cells[3] ? parseFloat(cells[3].replace('R$', '').replace('.', '').replace(',', '.').trim()) : null;

        return {
            data: cells[0] || "",  // Garantir que sempre haja valor na célula
            tipo: cells[1] || "",  // Tipo financeiro (ou outro valor esperado)
            aval: cells[2] || "",  // Aval (ou outro valor esperado)
            valor: value || "",    // Valor
            contrato: cells[4] || "",  // Contrato
            origem: cells[5] || "",    // Origem ou outra coluna
            table: tableName
        };
    }).filter(entry => entry.valor); // Filtrar entradas sem valor
    return dataRows;
}

// Função para atualizar o status da consulta no backend
function updateStatus(id, status, bot) {
    const url = `${apiURL}/update_status`;

    fetch(url, {
        method: 'PUT',
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({
            id: id,
            status: status,
            bot: bot
        })
    })
    .then(response => response.json())
    .then(data => console.log("Status atualizado:", data))
    .catch(error => console.error("Erro ao atualizar status:", error));
}

// Função para obter o idTicket (exemplo de como seria implementado)
async function obterIdTicket(documento) {
    try {
        const response = await fetch(`${apiURL}/get_idTicket?documento=${documento}`);
        const data = await response.json();
        console.log('ID do Ticket obtido:', data.idTicket);
        return data.idTicket; // Retorna o `idTicket` para ser usado na função scrapeAndSendData
    } catch (error) {
        console.error('Erro ao obter idTicket:', error);
    }
}

// Função principal que faz o scrape da página e envia os dados para a API
async function scrapeAndSendData() {
    
    const tables = document.querySelectorAll('.table-striped');
    const dataTables = {};

    // Processar as tabelas específicas
    tables.forEach(table => {
        const tableName = table.querySelector('thead td')?.textContent.trim();
        if (tableName && !tableName.includes("DADOS BASICOS") && !tableName.includes("ALERTAS")) {
            dataTables[tableName] = extractTableData(table, tableName);
        }
    });

    documento = getHeaderData().CPF;
    idTicket = await obterIdTicket(documento);

    console.log(`idTicket: ${idTicket}`)

    const nomeCliente = getHeaderData()["Nome do Cliente"];
    const fileName = `${nomeCliente.replace(/\s/g, '_')}_${documento}.pdf`;

    // Verifique se os dados estão corretos no console
    console.log("Dados enviados:", {
        header: getHeaderData(),
        data: dataTables
    });

    // Formatar os dados para a API
    const formattedData = {
        header: getHeaderData(),
        data: dataTables
    };

    // Gera a URL com os parâmetros de query para gerar o PDF
    const pdfUrl = `${apiURL}/generate-pdf?idTicket=${idTicket}&fileName=${encodeURIComponent(fileName)}`;

    // Envia os dados para gerar o PDF
    fetch(pdfUrl, {
        method: "POST",
        headers: {
            "Content-Type": "application/json"
        },
        body: JSON.stringify(formattedData)
    })
    .then(response => {
        if (!response.ok) {
            throw new Error("Falha ao gerar o PDF: " + response.statusText);
        }
        return response.json();
    })
    .then(data => {
        console.log("PDF gerado e salvo com sucesso.", data);

        // Exemplo: Após gerar o PDF, você pode atualizar o status da consulta
        updateStatus(idTicket, 3, 'console_bot'); // Atualiza o status para 'concluído' ou outro
    })
    .catch(error => {
        console.error("Erro ao gerar o PDF:", error)
        updateStatus(idTicket, 4, 'console_bot');
    });
    
}

// Chame a função scrapeAndSendData para capturar os dados e enviar para a API
scrapeAndSendData();
