const express = require('express');
const { query, pool } = require('../db');

const router = express.Router();
const ACCOUNT_ID = '11111111-1111-1111-1111-111111111111';

router.get('/', async (req, res) => {
  try {
    const result = await query(
      `SELECT * FROM crm_settings WHERE account_id = $1`,
      [ACCOUNT_ID]
    );
    res.json(result.rows[0] || {});
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.patch('/', async (req, res) => {
  try {
    const allowed = [
      'target_city','target_lat','target_lng','target_radius_km',
      'company_name','company_email','company_phone',
      'quote_prefix','invoice_prefix','ticket_prefix',
      'retention_prospect_months','retention_logs_months',
    ];
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
    params.push(ACCOUNT_ID);

    const result = await query(
      `UPDATE crm_settings SET ${updates.join(', ')} WHERE account_id = $${params.length} RETURNING *`,
      params
    );
    if (result.rows.length === 0) {
      const inserted = await query(
        `INSERT INTO crm_settings (account_id) VALUES ($1) RETURNING *`,
        [ACCOUNT_ID]
      );
      return res.json(inserted.rows[0]);
    }
    res.json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.get('/health', async (req, res) => {
  try {
    await pool.query('SELECT 1');
    res.json({ status: 'ok', db: 'connected', timestamp: new Date().toISOString() });
  } catch (err) {
    res.status(500).json({ status: 'error', db: 'disconnected', error: err.message });
  }
});

module.exports = router;
