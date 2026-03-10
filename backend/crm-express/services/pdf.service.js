require('dotenv').config();
const PDFDocument = require('pdfkit');
const fs = require('fs');
const path = require('path');

const UPLOADS_DIR = path.join(__dirname, '../../uploads');

function ensureDir(dir) {
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
}

function formatCurrency(amount) {
  return parseFloat(amount || 0).toFixed(2).replace('.', ',') + ' €';
}

function formatDate(date) {
  if (!date) return '';
  return new Date(date).toLocaleDateString('fr-FR');
}

function drawHeader(doc, data, type) {
  const settings = data.settings || {};

  doc.fontSize(22).font('Helvetica-Bold')
    .fillColor('#2563eb')
    .text(settings.company_name || 'ma-papeterie.fr', 50, 50);

  doc.fontSize(9).font('Helvetica').fillColor('#555');
  if (settings.company_email) doc.text(settings.company_email, 50, 78);
  if (settings.company_phone) doc.text(settings.company_phone, 50, 90);
  doc.text('Chaumont (52000) - Haute-Marne', 50, 102);

  const typeLabel = type === 'quote' ? 'DEVIS' : 'FACTURE';
  const number = type === 'quote' ? data.quote_number : data.invoice_number;

  doc.fontSize(18).font('Helvetica-Bold').fillColor('#1e293b')
    .text(typeLabel, 400, 50, { align: 'right', width: 145 });

  doc.fontSize(11).font('Helvetica').fillColor('#555')
    .text(`N° ${number}`, 400, 76, { align: 'right', width: 145 });

  doc.text(`Date : ${formatDate(data.issue_date)}`, 400, 91, { align: 'right', width: 145 });
  if (type === 'quote' && data.expiry_date) {
    doc.text(`Validité : ${formatDate(data.expiry_date)}`, 400, 106, { align: 'right', width: 145 });
  }
  if (type === 'invoice' && data.due_date) {
    doc.text(`Échéance : ${formatDate(data.due_date)}`, 400, 106, { align: 'right', width: 145 });
  }

  doc.moveTo(50, 130).lineTo(545, 130).strokeColor('#e2e8f0').lineWidth(1).stroke();
}

function drawClientBlock(doc, data) {
  doc.fontSize(10).font('Helvetica-Bold').fillColor('#1e293b')
    .text('DESTINATAIRE', 350, 145);

  doc.fontSize(10).font('Helvetica').fillColor('#374151');
  let y = 160;
  doc.text(data.entity_name || '', 350, y); y += 14;
  if (data.address_line1) { doc.text(data.address_line1, 350, y); y += 14; }
  if (data.postal_code || data.city) {
    doc.text(`${data.postal_code || ''} ${data.city || ''}`.trim(), 350, y); y += 14;
  }
  if (data.entity_email) { doc.text(data.entity_email, 350, y); y += 14; }
  if (data.entity_siret) { doc.text(`SIRET : ${data.entity_siret}`, 350, y); }
}

function drawItemsTable(doc, items, startY) {
  const colX = { pos: 50, label: 70, qty: 340, unit: 385, ht: 435, vat: 490, total: 510 };
  let y = startY;

  doc.rect(50, y, 495, 18).fill('#f1f5f9');
  doc.fontSize(9).font('Helvetica-Bold').fillColor('#374151');
  doc.text('#', colX.pos, y + 5);
  doc.text('Désignation', colX.label, y + 5);
  doc.text('Qté', colX.qty, y + 5);
  doc.text('P.U. HT', colX.unit, y + 5);
  doc.text('HT', colX.ht, y + 5);
  doc.text('TVA%', colX.vat, y + 5);
  y += 18;

  doc.font('Helvetica').fillColor('#1e293b');

  for (let i = 0; i < items.length; i++) {
    const item = items[i];
    const lineHT = parseFloat(item.line_total_ht || 0) || (parseFloat(item.quantity || 1) * parseFloat(item.unit_price_ht || 0));

    if (i % 2 === 0) {
      doc.rect(50, y, 495, 16).fill('#f8fafc');
    }

    doc.fontSize(9).fillColor('#1e293b');
    doc.text(String(i + 1), colX.pos, y + 4);
    doc.text(item.label || '', colX.label, y + 4, { width: 260, ellipsis: true });
    doc.text(String(parseFloat(item.quantity || 1)), colX.qty, y + 4);
    doc.text(formatCurrency(item.unit_price_ht), colX.unit, y + 4);
    doc.text(formatCurrency(lineHT), colX.ht, y + 4);
    doc.text(`${parseFloat(item.vat_rate || 20)}%`, colX.vat, y + 4);
    y += 16;
  }

  doc.moveTo(50, y).lineTo(545, y).strokeColor('#e2e8f0').stroke();
  return y + 10;
}

function drawTotals(doc, data, y) {
  const rightX = 380;
  const valueX = 480;

  doc.fontSize(10).font('Helvetica').fillColor('#374151');
  doc.text('Sous-total HT :', rightX, y);
  doc.text(formatCurrency(data.subtotal_ht), valueX, y, { align: 'right', width: 65 });
  y += 18;

  doc.text('TVA :', rightX, y);
  doc.text(formatCurrency(data.total_vat), valueX, y, { align: 'right', width: 65 });
  y += 18;

  doc.rect(rightX - 5, y - 2, 175, 22).fill('#2563eb');
  doc.fontSize(12).font('Helvetica-Bold').fillColor('white');
  doc.text('TOTAL TTC :', rightX, y + 4);
  doc.text(formatCurrency(data.total_ttc), valueX, y + 4, { align: 'right', width: 65 });
  y += 30;

  return y;
}

function drawFooter(doc, data, type) {
  const pageHeight = doc.page.height;
  const footerY = pageHeight - 80;

  doc.moveTo(50, footerY - 10).lineTo(545, footerY - 10).strokeColor('#e2e8f0').lineWidth(0.5).stroke();

  doc.fontSize(8).font('Helvetica').fillColor('#94a3b8');
  doc.text(
    'ma-papeterie.fr | Chaumont (52) | Document généré automatiquement',
    50, footerY,
    { align: 'center', width: 495 }
  );

  if (data.notes) {
    doc.fontSize(9).fillColor('#374151')
      .text(`Note : ${data.notes}`, 50, footerY - 35, { width: 495 });
  }
}

async function generateQuotePDF(quoteData) {
  const dir = path.join(UPLOADS_DIR, 'quotes');
  ensureDir(dir);

  const filename = `${quoteData.quote_number}.pdf`;
  const filePath = path.join(dir, filename);

  return new Promise((resolve, reject) => {
    const doc = new PDFDocument({ margin: 0, size: 'A4' });
    const stream = fs.createWriteStream(filePath);

    doc.pipe(stream);

    drawHeader(doc, quoteData, 'quote');
    drawClientBlock(doc, quoteData);

    let y = 240;
    doc.fontSize(11).font('Helvetica-Bold').fillColor('#1e293b')
      .text('DÉTAIL DU DEVIS', 50, y);
    y += 20;

    y = drawItemsTable(doc, quoteData.items || [], y);
    y = drawTotals(doc, quoteData, y + 10);
    drawFooter(doc, quoteData, 'quote');

    doc.end();

    stream.on('finish', () => resolve(`/uploads/quotes/${filename}`));
    stream.on('error', reject);
  });
}

async function generateInvoicePDF(invoiceData) {
  const dir = path.join(UPLOADS_DIR, 'invoices');
  ensureDir(dir);

  const filename = `${invoiceData.invoice_number}.pdf`;
  const filePath = path.join(dir, filename);

  return new Promise((resolve, reject) => {
    const doc = new PDFDocument({ margin: 0, size: 'A4' });
    const stream = fs.createWriteStream(filePath);

    doc.pipe(stream);

    drawHeader(doc, invoiceData, 'invoice');
    drawClientBlock(doc, invoiceData);

    let y = 240;
    doc.fontSize(11).font('Helvetica-Bold').fillColor('#1e293b')
      .text('DÉTAIL DE LA FACTURE', 50, y);
    y += 20;

    y = drawItemsTable(doc, invoiceData.items || [], y);
    y = drawTotals(doc, invoiceData, y + 10);

    if (parseFloat(invoiceData.amount_paid || 0) > 0) {
      y += 5;
      doc.fontSize(10).font('Helvetica').fillColor('#16a34a');
      doc.text(`Montant déjà réglé : ${formatCurrency(invoiceData.amount_paid)}`, 380, y);
      y += 16;
      const remaining = parseFloat(invoiceData.total_ttc || 0) - parseFloat(invoiceData.amount_paid || 0);
      doc.font('Helvetica-Bold').text(`Reste à payer : ${formatCurrency(remaining)}`, 380, y);
    }

    drawFooter(doc, invoiceData, 'invoice');

    doc.end();

    stream.on('finish', () => resolve(`/uploads/invoices/${filename}`));
    stream.on('error', reject);
  });
}

module.exports = { generateQuotePDF, generateInvoicePDF };
