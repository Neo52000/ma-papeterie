import jsPDF from 'jspdf';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import type { Order } from '@/hooks/useOrders';

const STATUS_LABELS: Record<string, string> = {
  pending: 'En attente',
  confirmed: 'Confirmée',
  preparing: 'En préparation',
  shipped: 'Expédiée',
  delivered: 'Livrée',
  cancelled: 'Annulée',
};

export function generateOrderPDF(order: Order): void {
  const doc = new jsPDF({ unit: 'mm', format: 'a4' });

  const primary   = [59, 130, 246] as [number, number, number];
  const textDark  = [30, 30, 30]   as [number, number, number];
  const textMuted = [100, 100, 100] as [number, number, number];

  // ── En-tête ──────────────────────────────────────────────────────────────

  doc.setFontSize(22);
  doc.setTextColor(...primary);
  doc.setFont('helvetica', 'bold');
  doc.text('Ma Papeterie', 14, 20);

  doc.setFontSize(9);
  doc.setTextColor(...textMuted);
  doc.setFont('helvetica', 'normal');
  doc.text('Reine & Fils • Chaumont', 14, 26);
  doc.text('52000 Chaumont, France', 14, 30);
  doc.text('contact@ma-papeterie.fr', 14, 34);

  // Titre bon de commande
  doc.setFontSize(20);
  doc.setTextColor(...primary);
  doc.setFont('helvetica', 'bold');
  doc.text('BON DE COMMANDE', 196, 20, { align: 'right' });

  doc.setFontSize(10);
  doc.setTextColor(...textDark);
  doc.setFont('helvetica', 'normal');
  doc.text(`N° ${order.order_number}`, 196, 28, { align: 'right' });
  doc.text(`Statut : ${STATUS_LABELS[order.status] || order.status}`, 196, 34, { align: 'right' });
  doc.text(
    `Date : ${format(new Date(order.created_at), 'd MMMM yyyy', { locale: fr })}`,
    196,
    40,
    { align: 'right' },
  );

  // Ligne séparatrice
  doc.setDrawColor(...primary);
  doc.setLineWidth(0.5);
  doc.line(14, 50, 196, 50);

  // ── Informations client ──────────────────────────────────────────────────

  doc.setFontSize(9);
  doc.setTextColor(...textMuted);
  doc.text('CLIENT', 14, 58);

  doc.setFontSize(11);
  doc.setTextColor(...textDark);
  doc.setFont('helvetica', 'bold');
  doc.text(order.customer_email, 14, 64);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);

  let clientY = 69;
  if (order.customer_phone) {
    doc.text(`Tél : ${order.customer_phone}`, 14, clientY);
    clientY += 4;
  }

  // Adresse de livraison
  if (order.shipping_address) {
    const addr = order.shipping_address as Record<string, string>;
    const lines = [
      addr.street,
      `${addr.postal_code || ''} ${addr.city || ''}`.trim(),
      addr.country,
    ].filter(Boolean);
    lines.forEach(line => {
      doc.text(line, 14, clientY);
      clientY += 4;
    });
  }

  // ── Tableau des articles ──────────────────────────────────────────────────

  const TABLE_X    = 14;
  const TABLE_W    = 182;
  const ROW_H      = 7;
  const COL_WIDTHS = [80, 20, 42, 40]; // Désignation, Qté, P.U. TTC, Total TTC
  const HEADERS    = ['Désignation', 'Qté', 'P.U. TTC', 'Total TTC'];

  const items = order.order_items ?? [];
  const rows  = items.map(item => [
    item.product_name,
    String(item.quantity),
    `${item.product_price.toFixed(2)} €`,
    `${item.subtotal.toFixed(2)} €`,
  ]);

  let tableY = 100;

  // En-tête tableau (fond bleu)
  doc.setFillColor(...primary);
  doc.rect(TABLE_X, tableY, TABLE_W, ROW_H, 'F');
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(9);
  doc.setFont('helvetica', 'bold');

  let colX = TABLE_X + 2;
  HEADERS.forEach((h, i) => {
    const isLast = i === HEADERS.length - 1;
    const x = isLast
      ? TABLE_X + COL_WIDTHS.slice(0, i + 1).reduce((a, b) => a + b, 0) - 2
      : colX;
    doc.text(h, x, tableY + 5, { align: isLast ? 'right' : 'left' });
    colX += COL_WIDTHS[i];
  });

  tableY += ROW_H;

  // Corps du tableau
  const displayRows = rows.length > 0 ? rows : [['Aucun article', '', '', '']];
  displayRows.forEach((row, rowIdx) => {
    if (rowIdx % 2 === 0) {
      doc.setFillColor(245, 247, 250);
      doc.rect(TABLE_X, tableY, TABLE_W, ROW_H, 'F');
    }
    doc.setTextColor(...textDark);
    doc.setFont('helvetica', rows.length === 0 && rowIdx === 0 ? 'italic' : 'normal');
    doc.setFontSize(9);

    colX = TABLE_X + 2;
    row.forEach((cell, i) => {
      const isLast = i === row.length - 1;
      const x = isLast
        ? TABLE_X + COL_WIDTHS.slice(0, i + 1).reduce((a, b) => a + b, 0) - 2
        : colX;
      doc.text(String(cell), x, tableY + 5, { align: isLast ? 'right' : 'left' });
      colX += COL_WIDTHS[i];
    });

    tableY += ROW_H;
  });

  // Bordure extérieure
  doc.setDrawColor(200, 200, 200);
  doc.setLineWidth(0.3);
  doc.rect(TABLE_X, 100, TABLE_W, tableY - 100);

  // ── Totaux ────────────────────────────────────────────────────────────────

  const totalHT = order.total_amount / 1.2;
  const tva     = order.total_amount - totalHT;

  doc.setFontSize(10);
  const startX = 130;
  let rowY = tableY + 10;

  const drawTotalRow = (label: string, value: string, bold = false) => {
    doc.setFont('helvetica', bold ? 'bold' : 'normal');
    doc.setTextColor(...textDark);
    doc.text(label, startX, rowY);
    doc.text(value, 196, rowY, { align: 'right' });
    rowY += 6;
  };

  drawTotalRow('Total HT', `${totalHT.toFixed(2)} €`);
  drawTotalRow('TVA (20%)', `${tva.toFixed(2)} €`);

  doc.setDrawColor(200, 200, 200);
  doc.line(startX, rowY - 2, 196, rowY - 2);

  drawTotalRow('TOTAL TTC', `${order.total_amount.toFixed(2)} €`, true);

  // ── Notes ─────────────────────────────────────────────────────────────────

  if (order.notes) {
    doc.setFontSize(9);
    doc.setTextColor(...textMuted);
    doc.text('Notes :', 14, rowY + 10);
    doc.setTextColor(...textDark);
    doc.text(order.notes, 14, rowY + 15, { maxWidth: 120 });
  }

  // ── Pied de page ──────────────────────────────────────────────────────────

  const pageCount = doc.getNumberOfPages();
  for (let i = 1; i <= pageCount; i++) {
    doc.setPage(i);
    doc.setFontSize(8);
    doc.setTextColor(...textMuted);
    doc.text(
      `Page ${i} / ${pageCount} — Ma Papeterie • Reine & Fils • 52000 Chaumont`,
      doc.internal.pageSize.getWidth() / 2,
      doc.internal.pageSize.getHeight() - 10,
      { align: 'center' },
    );
  }

  doc.save(`Commande-${order.order_number}.pdf`);
}

// ── Export XLSX ──────────────────────────────────────────────────────────────

export async function exportOrdersXLSX(orders: Order[]): Promise<void> {
  const { utils, writeFile } = await import('xlsx');

  const rows = orders.map(o => ({
    'N° Commande':    o.order_number,
    Statut:           STATUS_LABELS[o.status] || o.status,
    Email:            o.customer_email,
    Téléphone:        o.customer_phone || '',
    'Total TTC (€)':  o.total_amount,
    Date:             format(new Date(o.created_at), 'd/MM/yyyy HH:mm', { locale: fr }),
    Notes:            o.notes || '',
    Articles:         (o.order_items || [])
      .map(i => `${i.product_name} x${i.quantity}`)
      .join('; '),
  }));

  const ws = utils.json_to_sheet(rows);
  const wb = utils.book_new();
  utils.book_append_sheet(wb, ws, 'Commandes');
  writeFile(wb, 'commandes.xlsx');
}
