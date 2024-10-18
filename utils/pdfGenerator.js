export function generateHTML(dataMap) {
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
        width: 20%;
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
              ${tableData.colunmName.map((col) => <th>${col}</th>).join("")}
            </tr>
          </thead>
          <tbody>
            ${tableData.rows
              .map(
                (row) => `
              <tr>
                ${row.map((cell) => <td>${cell}</td>).join("")}
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

// Sample data to test the function
const sampleData = {
  header: {
    Nome: "João Silva",
    CPF: "123.456.789-00",
    "Data de Nascimento": "01/01/1980",
    Endereço: "Rua Exemplo, 123 - São Paulo, SP",
  },
  data: [
    {
      title: "Contas Pagar",
      colunmName: ["Mês", "Valor", "Status"],
      rows: [
        ["Janeiro", "R$ 500,00", "Pago"],
        ["Fevereiro", "R$ 400,00", "Pago"],
        ["Março", "R$ 600,00", "Pendente"],
      ],
    },
    {
      title: "Contas Receber",
      colunmName: ["Mês", "Valor", "Status"],
      rows: [
        ["Janeiro", "R$ 300,00", "Recebido"],
        ["Fevereiro", "R$ 200,00", "Recebido"],
        ["Março", "R$ 700,00", "Pendente"],
      ],
    },
  ],
};

/** 
 * 
 * typescript for the DataTable
 * export interface DataTable {
  title: string;            // Title of the data table
  colunmName: string[];      // Array of column names
  rows: string[][];          // Array of rows, where each row is an array of strings (cells)
}

export interface DataMap {
  header: { [key: string]: string };  // Key-value pairs for the personal data (header)
  data: DataTable[];                  // Array of data tables
}


 */

// Call the generateHTML function
const generatedHTML = generateHTML(sampleData);

// Output the generated HTML to the console or save it to a file
console.log(generatedHTML);

// You can also save the HTML to a file for further testing:
import fs from "fs";
fs.writeFileSync("output.html", generatedHTML);