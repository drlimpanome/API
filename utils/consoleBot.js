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
function updateStatus(idTicket, status, bot) {
    const url = `http://localhost:80/update_status`;
    
    fetch(url, {
        method: 'PUT',
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({
            id: idTicket,
            status: status,
            bot: bot
        })
    })
    .then(response => response.json())
    .then(data => console.log("Status atualizado:", data))
    .catch(error => console.error("Erro ao atualizar status:", error));
}

// Função para atualizar o valor da dívida no backend
function updateDebtValue(idTicket, value) {
    const url = `http://localhost:80/update_divida`;
    
    fetch(url, {
        method: 'PUT',
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({
            id: idTicket,
            value: value
        })
    })
    .then(response => response.json())
    .then(data => console.log("Dívida atualizada:", data))
    .catch(error => console.error("Erro ao atualizar dívida:", error));
}

// Função principal que faz o scrape da página e envia os dados para a API
function scrapeAndSendData() {
    const idTicket = 123; // Substitua pelo ID real do ticket
    const fileName = "relatorio_debitos.pdf"; // Substitua pelo nome real do arquivo

    const tables = document.querySelectorAll('.table-striped');
    const dataTables = {};

    // Processar as tabelas específicas
    tables.forEach(table => {
        const tableName = table.querySelector('thead td')?.textContent.trim();
        if (tableName && !tableName.includes("DADOS BASICOS") && !tableName.includes("ALERTAS")) {
            dataTables[tableName] = extractTableData(table, tableName);
        }
    });

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
    const pdfUrl = `http://localhost:80/generate-pdf?idTicket=${idTicket}&fileName=${encodeURIComponent(fileName)}`;

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
        updateStatus(idTicket, 2, 'bot_atualizador'); // Atualiza o status para 'concluído' ou outro

        // Exemplo: Atualizar o valor da dívida
        const totalDebt = 19142.24; // Calcule ou obtenha o valor real da dívida
        updateDebtValue(idTicket, totalDebt);
    })
    .catch(error => console.error("Erro ao gerar o PDF:", error));
}

// Chame a função scrapeAndSendData para capturar os dados e enviar para a API
scrapeAndSendData();
