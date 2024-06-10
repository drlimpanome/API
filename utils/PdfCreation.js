import PDFDocument from 'pdfkit';
import fs from 'fs'

export function createPDF(value, document) {
    const doc = new PDFDocument();
    const fileName = 'example.pdf';
    doc.pipe(fs.createWriteStream(fileName)); // Salva o PDF localmente
    doc.text(`Olá, ${document}, sua divida esta avaliada na faixa de ${value}`, 100, 100);
    doc.end();
    return fileName;
}