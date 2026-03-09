const express = require('express');
const { query } = require('../db');
const pdfService = require('../services/pdf.service');

const router = express.Router();
const ACCOUNT_ID = '11111111-1111-1111-1111-111111111111';

router.post('/quote', async (req, res) => {
  try {
    const { quote_id } = req.body;
    if (!quote_id) return res.status(400).json({ error: 'quote_id requis' });

    const quoteResult = await query(
      `SELECT q.*, e.company_name AS entity_name, e.email AS entity_email,
              e.address_line1, e.postal_code, e.city, e.country,
              e.siret AS entity_siret, e.vat_number AS entity_vat
       FROM crm_quotes q
       JOIN crm_entities e ON e.id = q.entity_id
       WHERE q.id = $1 AND q.account_id = $2`,
      [quote_id, ACCOUNT_ID]
    );
    if (quoteResult.rows.length === 0) return res.status(404).json({ error: 'Devis introuvable' });

    const itemsResult = await query(
      `SELECT * FROM crm_quote_items WHERE quote_id = $1 ORDER BY position`,
      [quote_id]
    );

    const settingsResult = await query(
      `SELECT * FROM crm_settings WHERE account_id = $1`,
      [ACCOUNT_ID]
    );

    const quoteData = {
      ...quoteResult.rows[0],
      items: itemsResult.rows,
      settings: settingsResult.rows[0] || {},
    };

    const filePath = await pdfService.generateQuotePDF(quoteData);

    await query(
      `UPDATE crm_quotes SET pdf_path = $1, updated_at = now() WHERE id = $2`,
      [filePath, quote_id]
    );

    res.json({ path: filePath });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.post('/invoice', async (req, res) => {
  try {
    const { invoice_id } = req.body;
    if (!invoice_id) return res.status(400).json({ error: 'invoice_id requis' });

    const invResult = await query(
      `SELECT i.*, e.company_name AS entity_name, e.email AS entity_email,
              e.address_line1, e.postal_code, e.city, e.country,
              e.siret AS entity_siret, e.vat_number AS entity_vat
       FROM crm_invoices i
       JOIN crm_entities e ON e.id = i.entity_id
       WHERE i.id = $1 AND i.account_id = $2`,
      [invoice_id, ACCOUNT_ID]
    );
    if (invResult.rows.length === 0) return res.status(404).json({ error: 'Facture introuvable' });

    const itemsResult = await query(
      `SELECT * FROM crm_invoice_items WHERE invoice_id = $1 ORDER BY position`,
      [invoice_id]
    );

    const settingsResult = await query(
      `SELECT * FROM crm_settings WHERE account_id = $1`,
      [ACCOUNT_ID]
    );

    const invoiceData = {
      ...invResult.rows[0],
      items: itemsResult.rows,
      settings: settingsResult.rows[0] || {},
    };

    const filePath = await pdfService.generateInvoicePDF(invoiceData);

    await query(
      `UPDATE crm_invoices SET pdf_path = $1, updated_at = now() WHERE id = $2`,
      [filePath, invoice_id]
    );

    res.json({ path: filePath });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
