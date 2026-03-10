const express = require('express');
const { query } = require('../db');

const router = express.Router();
const ACCOUNT_ID = '11111111-1111-1111-1111-111111111111';

router.get('/', async (req, res) => {
  try {
    const { entity_id, status, limit = 50, offset = 0 } = req.query;
    const params = [ACCOUNT_ID];
    const conditions = ['q.account_id = $1'];

    if (entity_id) {
      params.push(entity_id);
      conditions.push(`q.entity_id = $${params.length}`);
    }
    if (status) {
      params.push(status);
      conditions.push(`q.status = $${params.length}`);
    }

    params.push(parseInt(limit), parseInt(offset));
    const result = await query(
      `SELECT q.*, e.company_name AS entity_name
       FROM crm_quotes q
       JOIN crm_entities e ON e.id = q.entity_id
       WHERE ${conditions.join(' AND ')}
       ORDER BY q.created_at DESC
       LIMIT $${params.length - 1} OFFSET $${params.length}`,
      params
    );
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.get('/:id', async (req, res) => {
  try {
    const quoteResult = await query(
      `SELECT q.*, e.company_name AS entity_name, e.email AS entity_email,
              e.address_line1, e.postal_code, e.city
       FROM crm_quotes q
       JOIN crm_entities e ON e.id = q.entity_id
       WHERE q.id = $1 AND q.account_id = $2`,
      [req.params.id, ACCOUNT_ID]
    );
    if (quoteResult.rows.length === 0) return res.status(404).json({ error: 'Devis introuvable' });

    const itemsResult = await query(
      `SELECT * FROM crm_quote_items WHERE quote_id = $1 ORDER BY position ASC`,
      [req.params.id]
    );

    res.json({ ...quoteResult.rows[0], items: itemsResult.rows });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.post('/', async (req, res) => {
  try {
    const {
      entity_id, contact_id, opportunity_id, quote_number,
      status, issue_date, expiry_date, currency, notes, terms, items = [],
    } = req.body;

    if (!entity_id) return res.status(400).json({ error: 'entity_id requis' });

    let quoteNum = quote_number;
    if (!quoteNum) {
      const settings = await query(`SELECT quote_prefix FROM crm_settings WHERE account_id = $1`, [ACCOUNT_ID]);
      const prefix = settings.rows[0]?.quote_prefix || 'DEV';
      const dateStr = new Date().toISOString().slice(0, 10).replace(/-/g, '');
      const rand = String(Math.floor(Math.random() * 99999) + 1).padStart(5, '0');
      quoteNum = `${prefix}-${dateStr}-${rand}`;
    }

    let subtotal_ht = 0, total_vat = 0;
    for (const item of items) {
      const lineHT = parseFloat(item.quantity || 1) * parseFloat(item.unit_price_ht || 0);
      subtotal_ht += lineHT;
      total_vat += lineHT * (parseFloat(item.vat_rate || 20) / 100);
    }
    const total_ttc = subtotal_ht + total_vat;

    const quoteResult = await query(
      `INSERT INTO crm_quotes (
        account_id, entity_id, contact_id, opportunity_id, quote_number,
        status, issue_date, expiry_date, currency,
        subtotal_ht, total_vat, total_ttc, notes, terms, created_by
      ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15) RETURNING *`,
      [
        ACCOUNT_ID, entity_id,
        contact_id || null, opportunity_id || null,
        quoteNum,
        status || 'brouillon',
        issue_date || new Date().toISOString().slice(0, 10),
        expiry_date || null,
        currency || 'EUR',
        subtotal_ht.toFixed(2), total_vat.toFixed(2), total_ttc.toFixed(2),
        notes || null, terms || null,
        req.user.id || null,
      ]
    );

    const quote = quoteResult.rows[0];

    for (let i = 0; i < items.length; i++) {
      const item = items[i];
      await query(
        `INSERT INTO crm_quote_items (quote_id, product_id, position, label, description, quantity, unit_price_ht, vat_rate)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8)`,
        [
          quote.id, item.product_id || null,
          item.position || i + 1,
          item.label, item.description || null,
          item.quantity || 1,
          item.unit_price_ht || 0,
          item.vat_rate || 20,
        ]
      );
    }

    const itemsResult = await query(`SELECT * FROM crm_quote_items WHERE quote_id = $1 ORDER BY position`, [quote.id]);
    res.status(201).json({ ...quote, items: itemsResult.rows });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.patch('/:id', async (req, res) => {
  try {
    const allowed = ['status','issue_date','expiry_date','currency','notes','terms','pdf_path','accepted_at','refused_at'];
    const updates = [];
    const params = [];

    for (const key of allowed) {
      if (key in req.body) {
        params.push(req.body[key]);
        updates.push(`${key} = $${params.length}`);
      }
    }
    if (updates.length === 0) return res.status(400).json({ error: 'Aucun champ à mettre à jour' });

    updates.push(`updated_at = now()`);
    params.push(req.params.id, ACCOUNT_ID);

    const result = await query(
      `UPDATE crm_quotes SET ${updates.join(', ')} WHERE id = $${params.length - 1} AND account_id = $${params.length} RETURNING *`,
      params
    );
    if (result.rows.length === 0) return res.status(404).json({ error: 'Devis introuvable' });
    res.json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.delete('/:id', async (req, res) => {
  try {
    const result = await query(
      `DELETE FROM crm_quotes WHERE id = $1 AND account_id = $2`,
      [req.params.id, ACCOUNT_ID]
    );
    if (result.rowCount === 0) return res.status(404).json({ error: 'Devis introuvable' });
    res.json({ deleted: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
