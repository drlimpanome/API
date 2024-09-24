import express from 'express';
import puppeteer from 'puppeteer';
import path from 'path';

const app = express();

app.use(express.json());

// HTML Template Generator
function generateHTML(dataMap) {
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
          ${Object.entries(dataMap.header).map(([key, value]) => `
            <tr>
              <th class='client-info-header'>${key}</th>
              <td>${value}</td>
            </tr>
          `).join('')}
        </tbody>
      </table>

      <!-- Data Tables -->
      ${dataMap.data.map(tableData => `
        <table>
          <thead>
            <tr>
              <th colSpan="${tableData.colunmName.length}" class="tr-header">
                ${tableData.title.toUpperCase()}
              </th>
            </tr>
            <tr>
              ${tableData.colunmName.map(col => `<th>${col}</th>`).join('')}
            </tr>
          </thead>
          <tbody>
            ${tableData.rows.map(row => `
              <tr>
                ${row.map(cell => `<td>${cell}</td>`).join('')}
              </tr>
            `).join('')}
          </tbody>
        </table>
      `).join('')}

      <!-- Footer -->
      <footer>
        <p>Gerado por Dr. limpa nome</p>
      </footer>
    </div>
  </body>
  </html>
  `;
}

// API Endpoint to Generate PDF
app.post('/generate-pdf', async (req, res) => {
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
      format: 'A4',
      printBackground: true,
    });

    await browser.close();

    // Set the response headers to force download
    res.set({
      'Content-Type': 'application/pdf',
      'Content-Disposition': 'attachment; filename="report.pdf"',
      'Content-Length': pdfBuffer.length,
    });

    // Send the PDF buffer as the response
    res.send(pdfBuffer);

  } catch (error) {
    console.error(error);
    res.status(500).send('Error generating PDF');
  }
});

// Start the server
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});
