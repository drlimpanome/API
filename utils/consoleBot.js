 const apiURL = 'https://drlimpanome.site'
// const apiURL = 'http://localhost:80';
let documento;

// Função para extrair o texto de uma célula
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

// Mapeamento dos campos por tabela
const tableColumnMappings = {
	'Pendências REFIN/PEFIN': {
			data: ['data'],
			tipo: ['tipo financ.'],
			aval: ['aval'],
			valor: ['valor (r$)'],
			contrato: ['contrato'],
			origem: ['origem']
	},
	'SERASA': {
			data: ['data'],
			tipo: ['tipo financ.'],
			aval: ['aval'],
			valor: ['valor (r$)'],
			contrato: ['contrato'],
			origem: ['origem']
	},
	'SERASA - Protesto': {
			data: ['data'],
			valor: ['valor protesto'],
			cartorio: ['cartório'],
			cidade: ['cidade'],
			uf: ['uf']
	},
	'SERASA - Ação Judicial': {
			data: ['data'],
			tipo: ['natureza'],
			valor: ['valor'],
			vara: ['vara'],
			cidade: ['cidade'],
			uf: ['uf']
	},
	'SCPC': {
			data: ['dt ocorr'],
			tipo: ['tp devedor'],
			nome: ['nome'],
			valor: ['vr dívida', 'vr divida'],
			cidade: ['cidade'],
			uf: ['uf'],
			contrato: ['contrato']
	},
	'Protesto': {
			data: ['data'],
			valor: ['valor protesto'],
			cartorio: ['cartório'],
			cidade: ['cidade'],
			uf: ['uf']
	},
    // Adicione outros mapeamentos conforme necessário
};

// Função para extrair dados de uma tabela específica
function extractTableData(table, tableName) {
    const rows = Array.from(table.querySelectorAll('tbody tr'));

    // Encontrar o índice da linha de cabeçalho
    let headerRowIndex = rows.findIndex(row => {
        return row.classList.contains('tdfon10tb') && row.classList.contains('fw-bold') && row.classList.contains('text-center');
    });

    if (headerRowIndex === -1) {
        // Não encontrou o cabeçalho, não processa esta tabela
        return [];
    }

    const headerRow = rows[headerRowIndex];
    const dataRows = rows.slice(headerRowIndex + 1);

    // **Ajuste aqui**: Verificar se a tabela não possui dados
    const noDataRow = dataRows.find(row => row.classList.contains('text-danger'));
    if (noDataRow) {
        // Tabela sem dados, retorna array vazio
        return [];
    }

    // Obter os nomes das colunas
    const headerCells = Array.from(headerRow.querySelectorAll('td')).map(getTextFromCell);
    const headers = headerCells.map(header => header.toLowerCase().trim());

    // Mapear índices com base no nome das colunas
    const columnIndices = {};
    headers.forEach((header, index) => {
        columnIndices[header] = index;
    });

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
                value = value ? parseFloat(value.replace(/[^\d.,-]/g, '').replace('.', '').replace(',', '.').trim()) : null;
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
async function scrapeAndSendData(idTicket) {
	const tables = document.querySelectorAll('.table-striped');
	const debtsByTable = {};

	tables.forEach(table => {
			const tableNameElement = table.querySelector('thead td') || table.querySelector('thead th');
			const tableName = tableNameElement?.textContent.trim();
			if (tableName && !tableName.includes("DADOS BASICOS") && !tableName.includes("ALERTAS")) {
					const debts = extractTableData(table, tableName);
					if (debts.length > 0) {
							debtsByTable[tableName] = debts;
					}
			}
	});

	// Calcular o total
	const totalDebt = Object.values(debtsByTable).flat().reduce((sum, debt) => sum + (debt.valor || 0), 0).toFixed(2);

	// Obter dados do cabeçalho
	const headerData = getHeaderData();
	documento = headerData.CPF;

	const nomeCliente = headerData["Nome do Cliente"] || 'Cliente';
	const fileName = `${nomeCliente.replace(/\s/g, '_')}_${documento}.pdf`;

	// Verificar se os dados estão corretos no console
	console.log("Dados enviados:", {
			header: headerData,
			data: debtsByTable,
			divida: parseFloat(totalDebt)
	});

	// Formatar os dados para a API
	const formattedData = {
			header: headerData,
			data: debtsByTable,
			divida: parseFloat(totalDebt)
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

			// Atualiza o status para 'concluído'
			updateStatus(idTicket, 3, 'console_bot');
	})
	.catch(error => {
			console.error("Erro ao gerar o PDF:", error);
			updateStatus(idTicket, 4, 'console_bot');
	});
}


async function processarCPFsDisponiveis() {
	const cpfs = await getCPFsDisponiveis();
	
	if (cpfs.length === 0) {
		console.log("Nenhum CPF pendente encontrado.");
	}else{
		for (const cpf of cpfs) {
			const idTicket = await obterIdTicket(cpf);
			console.log(`idTicket: ${idTicket}`);
			try {
				// Inicia o processo de consulta para o CPF atual
				await iniciarProcessoConsulta(idTicket, cpf);
	
			} catch (error) {
				console.error(`Erro ao processar CPF ${cpf}:`, error);
	
				// Atualiza o status para 'erro' (status 4)
				await updateStatus(cpf, 4, 'console_bot');
			}
		}
	}
	
	setTimeout(processarCPFsDisponiveis, 120000);
	return;
}

async function iniciarProcessoConsulta(idTicket, cpf) {
	try {
		console.log(`Iniciando processo para o CPF: ${cpf}`);

		// Atualiza o status para 'em processamento' (status 2)
		await updateStatus(idTicket, 2, 'console_bot');

		// Preenche o campo de CPF
		document.getElementById('cpf').value = cpf;
		await new Promise(resolve => setTimeout(resolve, 1000)); // Aguarda 1s

		// Chama a função enviarFormulario sem parâmetros
		let verifyCaptcha = false
		verifyCaptcha = await captchaRequest(cpf);

		if (!verifyCaptcha) {
			let tentativas = 0;
			while (tentativas < 3 && !verifyCaptcha) {
				console.log(`Tentativa ${tentativas + 1} de 3`);
				await new Promise(resolve => setTimeout(resolve, 60000)); // Aguarda 60s
				verifyCaptcha = await captchaRequest(cpf);
				tentativas++;
			}
			if (!verifyCaptcha) {
				throw new Error('Erro ao verificar captcha');
			}
		}

		await new Promise(resolve => setTimeout(resolve, 5000)); // Aguarda 1s

		// Espera a página carregar ou o botão estar habilitado
		while (document.getElementById('btn-consulta-cpf').disabled) {
				await new Promise(resolve => setTimeout(resolve, 100)); // Espera 100ms antes de verificar novamente
		}

		// Executar o script de extração de dados
		await scrapeAndSendData(idTicket);

		// Atualiza o status para 'concluído' (status 3)
		await updateStatus(idTicket, 3, 'console_bot');

		console.log(`Processo concluído para o CPF: ${cpf}`);
	} catch (error) {
		console.error(`Erro ao processar CPF ${cpf}:`, error);

		// Atualiza o status para 'erro' (status 4)
		await updateStatus(cpf, 4, 'console_bot');
	}
}

// Função para obter o idTicket
async function obterIdTicket(documento) {
	try {
			const response = await fetch(`${apiURL}/get_idTicket?documento=${documento}`);
			const data = await response.json();
			console.log('ID do Ticket obtido:', data.idTicket);
			return data.idTicket;
	} catch (error) {
			console.error('Erro ao obter idTicket:', error);
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

async function getCPFsDisponiveis() {
    try {
        const response = await fetch(`${apiURL}/get_cpfs`);
        console.log('Resposta do fetch:', response);
        const data = await response.json();
        console.log('Dados recebidos:', data);

        // Verifica se data é um array ou um objeto
        if (Array.isArray(data)) {
            return data; // Se for um array de CPFs
        } else if (data.cpfList) {
            return data.cpfList; // Se for um objeto com cpfList
        } else {
            console.error('Formato de resposta inesperado:', data);
            return [];
        }
    } catch (error) {
        console.error('Erro ao obter CPFs disponíveis:', error);
        return [];
    }
}


async function captchaRequest(campo) {

	var captchaResponse = await turnstile.getResponse();

	if (captchaResponse) {
		requestConsulta('/bases/consulta/82', campo, 'cpf', captchaResponse);
		turnstile.reset();
		return true;
	} else {
		turnstile.reset();
		return false;
	}

}


