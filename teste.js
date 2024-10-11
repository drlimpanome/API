import { decode } from 'html-entities';
import mysql from 'mysql'
import dotenv from 'dotenv';
import { JSDOM } from 'jsdom';
import fs  from 'fs';
dotenv.config();

const connection = mysql.createConnection({
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: 'drlimpanome',
    host: process.env.DB_HOST,
});

const html = `
<link href="../css/bootstrap.min.css" rel="stylesheet">
<link href="../font-awesome/css/font-awesome.css" rel="stylesheet">

<link href="../css/animate.css" rel="stylesheet">
<link href="../css/style.css" rel="stylesheet">
<div class="wrapper wrapper-content animated fadeInRight">
	<div class="ibox-content p-xl">




		<head>

			<meta charset="utf-8">
			<meta name="viewport" content="width=device-width, initial-scale=1.0">

			<title>CONSULTA | (#CPF)</title>


			<link href="https://cons.myconsulta.net/css/bootstrap.min.css" rel="stylesheet">
			<link href="https://cons.myconsulta.net/font-awesome/css/font-awesome.css" rel="stylesheet">


			<link href="https://cons.myconsulta.net/css/style.css" rel="stylesheet">

			<link href="https://cons.myconsulta.net/css/animate.css" rel="stylesheet">

		</head>

		<body>


			<div class="row">


				<div class="row">
					<div class="col-sm-6">
						<h4>NOME</h4>
						<address>
							<strong >(#clientName)</strong><br>
							<h4> <span class="text-danger"><strong>STATUS:</strong> COM RESTRIÇÃO</span> </h4>
						</address>
						<p><a class="btn btn-danger btn-outline" target=_blank
								href="https://app.myconsulta.net/cons_caixa/files/CPF_93866917287_15_05_2024.pdf"
								download="CPF_93866917287_15_05_2024.pdf">
								<i class="fa fa-file-pdf-o"> </i> Baixar PDF
							</a> </p>
					</div>

					<div class="col-sm-6 text-right">
						<h4>CPF / CNPJ</h4>
						<h4>(#CPF)</h4>


						<p>
							<span><strong>Data Consulta:</strong> 15/05/2024</span><br/>
							<span><strong>Hora Consulta:</strong> 10:27:49</span><br/>



                                        </p>
					</div>
				</div>

				<div class="table-responsive m-t">
					<table class="table invoice-table">
						<thead>
							<tr>
								<th>Credor</th>
								<th>Data Primeira Ocorrencia</th>
								<th>Data Ultima Ocorrencia</th>
								<th>Quantidade</th>
							</tr>
						</thead>
						<tbody>

							<tr>
								<td>SERASA</td>
								<td>10/03/2024</td>
								<td>10/03/2024</td>
								<td>1</td>
							</tr>


						</tbody>
					</table>
				</div><!-- /table-responsive -->
				<!-- /table-responsive -->

				<div class="row">
					<div class="col-lg-12">
						<div class="panel panel-default">
							<div class="panel-heading">
								DEVEDORES
							</div>
							<div class="panel-body">
								<div class="table-responsive m-t">
									<table class="table table-striped">
										<thead>
											<tr>
												<th>#</th>
												<th>Data</th>
												<th>Tp Financ</th>
												<th>Vlr Conv</th>
												<th>Cidade</th>
												<th>UF</th>
												<th>Banco</th>
												<th>Contrato</th>
												<th>CNPJ</th>
												<th>Razão Social</th>

											</tr>
										</thead>
										<tbody>



										</tbody>
									</table>
								</div>
							</div>
						</div>
					</div>
				</div>
				<div class="row">
					<div class="col-lg-12">
						<div class="panel panel-default">
							<div class="panel-heading">
								SICOW
							</div>
							<div class="panel-body">
								<div class="table-responsive m-t">
									<table class="table table-striped">
										<thead>
											<tr>
												<th>#</th>
												<th>Cargo</th>
												<th>Orgão</th>
												<th>Dt Nomeação</th>
												<th>Dt Exoneração</th>
												<th>CPF</th>
												<th>Nome</th>
												<th>Tp Vínculo</th>

											</tr>
										</thead>
										<tbody>



										</tbody>
									</table>
								</div>
							</div>
						</div>
					</div>
				</div>
				<div class="row">
					<div class="col-lg-12">
						<div class="panel panel-default">
							<div class="panel-heading">
								CONRES
							</div>
							<div class="panel-body">
								<div class="table-responsive m-t">
									<table class="table table-striped">
										<thead>
											<tr>
												<th>#</th>
												<th>Motivo/Número</th>
												<th>Motivo/Nome</th>
												<th>Dt Início</th>

												<th>Dt Fim</th>


											</tr>
										</thead>
										<tbody>



										</tbody>
									</table>
								</div>
							</div>
						</div>
					</div>
				</div>
				<div class="row">
					<div class="col-lg-12">
						<div class="panel panel-default">
							<div class="panel-heading">
								SINAD
							</div>
							<div class="panel-body">
								<div class="table-responsive m-t">
									<table class="table table-striped">
										<thead>
											<tr>
												<th>#</th>
												<th>Filial</th>
												<th>Tipo do Cliente</th>
												<th>Agência</th>
												<th>Número</th>
												<th>Operação</th>
												<th>Sistema</th>
												<th>Situação</th>
												<th>Data Inadimplencia</th>

											</tr>
										</thead>
										<tbody>



										</tbody>
									</table>
								</div>
							</div>
						</div>
					</div>
				</div>

				<div class="row">
					<div class="col-lg-12">
						<div class="panel panel-default">
							<div class="panel-heading">
								SCPC
							</div>
							<div class="panel-body">
								<div class="table-responsive m-t">
									<table class="table table-striped">
										<thead>
											<tr>
												<th>#</th>
												<th>Data</th>
												<th>Tipo</th>
												<th>Valor</th>
												<th>Contrato</th>
												<th>Origem</th>
												<th>Cidade</th>
												<th>UF</th>
											</tr>
										</thead>
										<tbody>

										</tbody>
									</table>
								</div>
							</div>
						</div>
					</div>
				</div>

				<div class="row">
					<div class="col-lg-12">
						<div class="panel panel-default">
							<div class="panel-heading">
								PROTESTO
							</div>
							<div class="panel-body">
								<div class="table-responsive m-t">
									<table class="table table-striped">
										<thead>
											<tr>
												<th>#</th>
												<th>Data</th>
												<th>Valor</th>
												<th>Cartório</th>
												<th>Cidade</th>
												<th>UF</th>
											</tr>
										</thead>
										<tbody>



										</tbody>
									</table>
								</div>
							</div>
						</div>
					</div>
				</div>
				<div class="row">
					<div class="col-lg-12">
						<div class="panel panel-default">
							<div class="panel-heading">
								SICCF
							</div>
							<div class="panel-body">
								<div class="table-responsive m-t">
									<table class="table table-striped">
										<thead>
											<tr>
												<th>#</th>
												<th>Banco</th>
												<th>Agência</th>
												<th>Tp Conta</th>
												<th>Alinea</th>
												<th>Qtd</th>
												<th>Data</th>
											</tr>
										</thead>
										<tbody>



										</tbody>
									</table>
								</div>
							</div>
						</div>
					</div>
				</div>
				<div class="row">
					<div class="col-lg-12">
						<div class="panel panel-default">
							<div class="panel-heading">
								CADIN
							</div>
							<div class="panel-body">
								<div class="table-responsive m-t">
									<table class="table table-striped">
										<thead>
											<tr>
												<th>#</th>
												<th>Sequencia</th>
												<th>Sigla Credor</th>
												<th>Nome Credor</th>
											</tr>
										</thead>
										<tbody>



										</tbody>
									</table>
								</div>
							</div>
						</div>
					</div>
				</div>

				<div class="row">
					<div class="col-lg-12">
						<div class="panel panel-default">
							<div class="panel-heading">
								CHEQUE SEM FUNDO
							</div>
							<div class="panel-body">
								<div class="table-responsive m-t">
									<table class="table table-striped">
										<thead>
											<tr>
												<th>#</th>
												<th>Data Cheque</th>
												<th>Alinea</th>
												<th>Qte Cheque</th>
												<th>Vlr Cheque</th>
												<th>Banco</th>
												<th>Agência</th>
												<th>Cidade</th>
												<th>UF</th>
											</tr>
										</thead>
										<tbody>



										</tbody>
									</table>
								</div>
							</div>
						</div>
					</div>
				</div>

				<div class="row">
					<div class="col-lg-12">
						<div class="panel panel-default">
							<div class="panel-heading">
								REFIN/PEFIN
							</div>
							<div class="panel-body">
								<div class="table-responsive m-t">
									<table class="table table-striped">
										<thead>
											<tr>
												<th>#</th>
												<th>Data</th>
												<th>Tipo</th>
												<th>Aval</th>
												<th>Valor</th>
												<th>Contrato</th>
												<th>Origem</th>
											</tr>
										</thead>
										<tbody>

											<tr>
												<td>1</td>

												<td>10/03/2024</td>
												<td>CAP REFIN</td>
												<td>CRED FINAN</td>
												<td>R$ 310,06</td>
												<td>80226</td>
												<td>020937849000101</td>
												<td></td>
											</tr>


										</tbody>
									</table>
								</div>
							</div>
						</div>
					</div>
				</div>

				<br>


				<br>
				<div class="row">
					<div class="col-lg-6"> &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;
						<!-- <img src="1.jpg" width="173" height="117">   -->
					</div>
					<div class="col-lg-6">
						<table class="table invoice-total">
							<tbody>
								<tr>
									<td><strong>Quantidade Total :</strong></td>
									<td>2</td>
								</tr>
								<tr>
									<td><strong>Valor Total Estimado :</strong></td>
									<td>310,06</td>
								</tr>

								<tr>
									<td><strong>Pontuação Score Estimado :</strong></td>
									<td class="text-danger"> ****</td>
								</tr>

							</tbody>
						</table>
					</div>
				</div>


				<br>

				<div class="well m-t"><strong>Score</strong>
					O score é baseado nas informações do BACEN, mercado financeiro, nos
					melhores parâmetros de análise de credito e inteligência artificial para
					definir o perfil do consumidor de baixo, médio e alto risco.
				</div>




				<div class="alert alert-warning alert-dismissable">

					<i class="fa fa-exclamation-triangle"></i> <b>Informação Confidencial</b> <br>
                         Uso exclusivo da empresa associada para auxílio na aprovação de crédito conforme Lei geral de
                         proteção de dados. A divulgação de tais informações a terceiros sujeitará o infrator às sanções
                         penais.

                     </div>
				</div>

			</div>

	</div>





</div>





</div>
`
export function recuperarDados(html) {
    const data = {};
    const tables = html.match(/<div class="panel-heading">[\s\S]*?<table[^>]*>[\s\S]*?<\/table>/g) || [];

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
	
	downloadpdf1(pdfUrl);

    return { status: 'success', data, 'pdfUrl': pdfUrl };
}

async function downloadpdf1(pdfUrl) {
	if (pdfUrl) {
		try {
			const buffer = await downloadpdf(pdfUrl);
			const pdfBuffer = buffer.toString('base64');
			const filteredData = {};
			filteredData['pdf_base64'] = pdfBuffer;
			const path = 'pdfs/' + pdfUrl.split('/').pop();
			fs.writeFileSync(path, buffer, 'base64');
			console.log('PDF downloaded and saved:', path);
		} catch (error) {
			console.error('Erro ao baixar o PDF:', error);
		}
	}
}

async function downloadpdf(url) {
    const response = await fetch(url);
    if (!response.ok) {
        throw new Error(`Failed to download PDF: ${response.statusText}`);
    }
    const arrayBuffer = await response.arrayBuffer();
    return Buffer.from(arrayBuffer);
}
function filterRelevantData(data) {
    const relevantTables = ['scpc', 'protesto', 'refin_pefin'];
    const filteredData = {};
    
    relevantTables.forEach(table => {
        if (data[table]) {
            filteredData[table] = data[table];
        }
    });

    return filteredData;
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
async function insertDataIntoTables(ticketId, data) {
    try {
        // Iterar sobre os dados do JSON e inseri-los nas tabelas correspondentes
        for (const tableName in data) {
            const columns = ['ticket_id', ...Object.keys(data[tableName])];
            const values = [ticketId, ...Object.values(data[tableName])];
			
			console.log({tableName, columns, values});

            // Consulta SQL dinâmica para inserir dados na tabela atual
            const insertSql = `INSERT INTO ${tableName} (${columns.join(', ')}) VALUES (${Array(columns.length).fill('?').join(', ')})`;
			
			console.log(insertSql)
            
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
async function updateConsultStatus(ticketId, status) {
    try {
        const updateSql = `
            UPDATE tbconsultas 
            SET status_id = ?, updated_at = current_timestamp(), updated_by = "BOT1" 
            WHERE ticket_id = ?
        `;
        
        // Executar a consulta SQL para atualização do status
        const [result] = await connection.execute(updateSql, [status, ticketId]);
        
        // Verificar se a atualização foi bem-sucedida
        return result.affectedRows > 0;
    } catch (error) {
        throw new Error(`Erro ao atualizar o status da consulta: ${error.message}`);
    }
}

const resultado = recuperarDados(html);
// console.log(resultado);
// insertDataIntoTables(123,recuperarDados(html).data);
let res = filterRelevantData(resultado.data);
console.log(JSON.stringify(res));