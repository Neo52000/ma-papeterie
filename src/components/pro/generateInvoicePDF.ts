import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import type { B2BInvoice } from '@/hooks/useB2BInvoices';
import type { B2BAccount } from '@/hooks/useB2BAccount';

const STATUS_LABELS: Record<string, string> = {
  draft: 'Brouillon',
  issued: 'Émise',
  paid: 'Payée',
  cancelled: 'Annulée',
};

export function generateInvoicePDF(invoice: B2BInvoice, account: B2BAccount): void {
  const doc = new jsPDF({ unit: 'mm', format: 'a4' });

  const primary = [59, 130, 246]; // blue-500
  const textDark = [30, 30, 30];
  const textMuted = [100, 100, 100];

  // ── En-tête ──────────────────────────────────────────────────────────────

  // Logo / nom société émettrice
  doc.setFontSize(22);
  doc.setTextColor(...primary as [number, number, number]);
  doc.setFont('helvetica', 'bold');
  doc.text('Ma Papeterie', 14, 20);

  doc.setFontSize(9);
  doc.setTextColor(...textMuted as [number, number, number]);
  doc.setFont('helvetica', 'normal');
  doc.text('Reine & Fils • Chaumont', 14, 26);
  doc.text('52000 Chaumont, France', 14, 30);
  doc.text('contact@ma-papeterie.fr', 14, 34);

  // Titre facture
  doc.setFontSize(28);
  doc.setTextColor(...primary as [number, number, number]);
  doc.setFont('helvetica', 'bold');
  doc.text('FACTURE', 140, 20);

  doc.setFontSize(10);
  doc.setTextColor(...textDark as [number, number, number]);
  doc.setFont('helvetica', 'normal');
  doc.text(`N° ${invoice.invoice_number}`, 140, 28);
  doc.text(`Statut : ${STATUS_LABELS[invoice.status] || invoice.status}`, 140, 34);
  if (invoice.issued_at) {
    doc.text(`Émise le : ${format(new Date(invoice.issued_at), 'd MMMM yyyy', { locale: fr })}`, 140, 40);
  }
  if (invoice.due_date) {
    doc.text(`Échéance : ${format(new Date(invoice.due_date), 'd MMMM yyyy', { locale: fr })}`, 140, 46);
  }

  // Ligne séparatrice
  doc.setDrawColor(...primary as [number, number, number]);
  doc.setLineWidth(0.5);
  doc.line(14, 50, 196, 50);

  // ── Adresse client ────────────────────────────────────────────────────────

  doc.setFontSize(9);
  doc.setTextColor(...textMuted as [number, number, number]);
  doc.text('FACTURÉ À', 14, 58);

  doc.setFontSize(11);
  doc.setTextColor(...textDark as [number, number, number]);
  doc.setFont('helvetica', 'bold');
  doc.text(account.name, 14, 64);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);
  if (account.siret) doc.text(`SIRET : ${account.siret}`, 14, 69);
  if (account.vat_number) doc.text(`TVA : ${account.vat_number}`, 14, 73);
  if (account.email) doc.text(account.email, 14, 77);
  if (account.billing_address) {
    const addr = account.billing_address as Record<string, string>;
    const lines = [addr.line1, addr.line2, `${addr.postal_code || ''} ${addr.city || ''}`.trim()]
      .filter(Boolean);
    lines.forEach((line, i) => doc.text(line, 14, 81 + i * 4));
  }

  // ── Période ──────────────────────────────────────────────────────────────

  doc.setFontSize(9);
  doc.setTextColor(...textMuted as [number, number, number]);
  const periodStr = `Période : du ${format(new Date(invoice.period_start), 'd MMM yyyy', { locale: fr })} au ${format(new Date(invoice.period_end), 'd MMM yyyy', { locale: fr })}`;
  doc.text(periodStr, 140, 64);

  // ── Tableau des commandes ─────────────────────────────────────────────────

  const rows = (invoice.b2b_invoice_orders ?? []).map((io, i) => [
    `${i + 1}`,
    io.orders?.order_number ?? io.order_id.slice(0, 8),
    io.orders?.created_at
      ? format(new Date(io.orders.created_at), 'd MMM yyyy', { locale: fr })
      : '-',
    io.orders?.status ?? '-',
    `${(io.amount).toFixed(2)} €`,
  ]);

  autoTable(doc, {
    startY: 100,
    head: [['#', 'N° Commande', 'Date', 'Statut', 'Montant TTC']],
    body: rows.length > 0 ? rows : [['', 'Aucune commande liée', '', '', '']],
    theme: 'striped',
    headStyles: { fillColor: primary, textColor: [255, 255, 255], fontStyle: 'bold', fontSize: 9 },
    bodyStyles: { fontSize: 9 },
    columnStyles: {
      0: { cellWidth: 10 },
      4: { halign: 'right', fontStyle: 'bold' },
    },
    margin: { left: 14, right: 14 },
  });

  // ── Totaux ────────────────────────────────────────────────────────────────

  const finalY = (doc as any).lastAutoTable?.finalY ?? 150;

  const tva = invoice.total_ttc - invoice.total_ht;

  doc.setFontSize(10);
  const startX = 130;
  let rowY = finalY + 10;

  const drawTotalRow = (label: string, value: string, bold = false) => {
    doc.setFont('helvetica', bold ? 'bold' : 'normal');
    doc.setTextColor(...textDark as [number, number, number]);
    doc.text(label, startX, rowY);
    doc.text(value, 196, rowY, { align: 'right' });
    rowY += 6;
  };

  drawTotalRow('Total HT', `${invoice.total_ht.toFixed(2)} €`);
  drawTotalRow('TVA (20%)', `${tva.toFixed(2)} €`);

  // Ligne séparatrice avant total TTC
  doc.setDrawColor(200, 200, 200);
  doc.line(startX, rowY - 2, 196, rowY - 2);

  drawTotalRow('TOTAL TTC', `${invoice.total_ttc.toFixed(2)} €`, true);

  // ── Notes ─────────────────────────────────────────────────────────────────

  if (invoice.notes) {
    doc.setFontSize(9);
    doc.setTextColor(...textMuted as [number, number, number]);
    doc.text('Notes :', 14, rowY + 10);
    doc.setTextColor(...textDark as [number, number, number]);
    doc.text(invoice.notes, 14, rowY + 15, { maxWidth: 120 });
  }

  // ── Pied de page ──────────────────────────────────────────────────────────

  const pageCount = doc.getNumberOfPages();
  for (let i = 1; i <= pageCount; i++) {
    doc.setPage(i);
    doc.setFontSize(8);
    doc.setTextColor(...textMuted as [number, number, number]);
    doc.text(
      `Page ${i} / ${pageCount} — Ma Papeterie • Reine & Fils • 52000 Chaumont`,
      doc.internal.pageSize.getWidth() / 2,
      doc.internal.pageSize.getHeight() - 10,
      { align: 'center' }
    );
  }

  // ── Sauvegarde ────────────────────────────────────────────────────────────

  doc.save(`Facture-${invoice.invoice_number}.pdf`);
}

// Export CSV via xlsx (déjà installé)
export async function exportInvoicesCSV(invoices: B2BInvoice[]): Promise<void> {
  const { utils, writeFile } = await import('xlsx');

  const rows = invoices.map(inv => ({
    'N° Facture': inv.invoice_number,
    Statut: STATUS_LABELS[inv.status] || inv.status,
    'Période début': inv.period_start,
    'Période fin': inv.period_end,
    'Total HT (€)': inv.total_ht,
    'Total TTC (€)': inv.total_ttc,
    'Émise le': inv.issued_at ? format(new Date(inv.issued_at), 'd/MM/yyyy', { locale: fr }) : '',
    'Payée le': inv.paid_at ? format(new Date(inv.paid_at), 'd/MM/yyyy', { locale: fr }) : '',
    Échéance: inv.due_date ? format(new Date(inv.due_date), 'd/MM/yyyy', { locale: fr }) : '',
  }));

  const ws = utils.json_to_sheet(rows);
  const wb = utils.book_new();
  utils.book_append_sheet(wb, ws, 'Factures');
  writeFile(wb, 'factures-pro.xlsx');
}
