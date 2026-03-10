const express = require('express');
const { query } = require('../db');

const router = express.Router();
const ACCOUNT_ID = '11111111-1111-1111-1111-111111111111';

router.get('/', async (req, res) => {
  try {
    const { entity_id, direction, status, limit = 50, offset = 0 } = req.query;
    const params = [ACCOUNT_ID];
    const conditions = ['e.account_id = $1'];

    if (entity_id) {
      params.push(entity_id);
      conditions.push(`e.entity_id = $${params.length}`);
    }
    if (direction) {
      params.push(direction);
      conditions.push(`e.direction = $${params.length}`);
    }
    if (status) {
      params.push(status);
      conditions.push(`e.status = $${params.length}`);
    }

    params.push(parseInt(limit), parseInt(offset));
    const result = await query(
      `SELECT e.*, ent.company_name AS entity_name
       FROM crm_emails e
       LEFT JOIN crm_entities ent ON ent.id = e.entity_id
       WHERE ${conditions.join(' AND ')}
       ORDER BY e.created_at DESC
       LIMIT $${params.length - 1} OFFSET $${params.length}`,
      params
    );
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.get('/draft/:entity_id', async (req, res) => {
  try {
    const result = await query(
      `SELECT * FROM crm_emails
       WHERE account_id = $1 AND entity_id = $2 AND status = 'draft'
       ORDER BY created_at DESC LIMIT 1`,
      [ACCOUNT_ID, req.params.entity_id]
    );
    if (result.rows.length === 0) return res.status(404).json({ error: 'Aucun brouillon trouvé' });
    res.json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.post('/', async (req, res) => {
  try {
    const {
      entity_id, contact_id, opportunity_id, direction, status,
      subject, body_text, body_html, from_email, to_email,
      cc_email, bcc_email, provider_message_id, sent_at,
    } = req.body;

    if (!subject || !direction) return res.status(400).json({ error: 'subject et direction requis' });

    const result = await query(
      `INSERT INTO crm_emails (
        account_id, entity_id, contact_id, opportunity_id, direction, status,
        subject, body_text, body_html, from_email, to_email, cc_email, bcc_email,
        provider_message_id, sent_at, created_by
      ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16) RETURNING *`,
      [
        ACCOUNT_ID,
        entity_id || null, contact_id || null, opportunity_id || null,
        direction, status || 'draft',
        subject, body_text || null, body_html || null,
        from_email || null, to_email || null, cc_email || null, bcc_email || null,
        provider_message_id || null, sent_at || null,
        req.user.id || null,
      ]
    );
    res.status(201).json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.delete('/:id', async (req, res) => {
  try {
    const result = await query(
      `DELETE FROM crm_emails WHERE id = $1 AND account_id = $2`,
      [req.params.id, ACCOUNT_ID]
    );
    if (result.rowCount === 0) return res.status(404).json({ error: 'Email introuvable' });
    res.json({ deleted: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
