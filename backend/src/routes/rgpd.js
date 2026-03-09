const express = require('express');
const { query } = require('../db');

const router = express.Router();
const ACCOUNT_ID = '11111111-1111-1111-1111-111111111111';

router.post('/log-purge', async (req, res) => {
  try {
    const { entity_id, contact_id, action, details } = req.body;
    if (!action) return res.status(400).json({ error: 'action requis' });

    const result = await query(
      `INSERT INTO crm_rgpd_log (account_id, entity_id, contact_id, action, details, performed_by)
       VALUES ($1,$2,$3,$4,$5,$6) RETURNING *`,
      [
        ACCOUNT_ID,
        entity_id || null,
        contact_id || null,
        action,
        details ? JSON.stringify(details) : '{}',
        req.user.id || null,
      ]
    );
    res.status(201).json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.get('/logs', async (req, res) => {
  try {
    const { entity_id, limit = 50, offset = 0 } = req.query;
    const params = [ACCOUNT_ID];
    const conditions = ['r.account_id = $1'];

    if (entity_id) {
      params.push(entity_id);
      conditions.push(`r.entity_id = $${params.length}`);
    }

    params.push(parseInt(limit), parseInt(offset));
    const result = await query(
      `SELECT r.*, e.company_name AS entity_name
       FROM crm_rgpd_log r
       LEFT JOIN crm_entities e ON e.id = r.entity_id
       WHERE ${conditions.join(' AND ')}
       ORDER BY r.created_at DESC
       LIMIT $${params.length - 1} OFFSET $${params.length}`,
      params
    );
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
