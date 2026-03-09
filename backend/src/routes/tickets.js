const express = require('express');
const { query } = require('../db');

const router = express.Router();
const ACCOUNT_ID = '11111111-1111-1111-1111-111111111111';

router.get('/', async (req, res) => {
  try {
    const { entity_id, status, priority, limit = 50, offset = 0 } = req.query;
    const params = [ACCOUNT_ID];
    const conditions = ['t.account_id = $1'];

    if (entity_id) {
      params.push(entity_id);
      conditions.push(`t.entity_id = $${params.length}`);
    }
    if (status) {
      params.push(status);
      conditions.push(`t.status = $${params.length}`);
    }
    if (priority) {
      params.push(priority);
      conditions.push(`t.priority = $${params.length}`);
    }

    params.push(parseInt(limit), parseInt(offset));
    const result = await query(
      `SELECT t.*, e.company_name AS entity_name
       FROM crm_tickets t
       LEFT JOIN crm_entities e ON e.id = t.entity_id
       WHERE ${conditions.join(' AND ')}
       ORDER BY
         CASE t.priority WHEN 'critique' THEN 1 WHEN 'haute' THEN 2 WHEN 'normale' THEN 3 ELSE 4 END,
         t.opened_at DESC
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
    const ticketResult = await query(
      `SELECT t.*, e.company_name AS entity_name
       FROM crm_tickets t
       LEFT JOIN crm_entities e ON e.id = t.entity_id
       WHERE t.id = $1 AND t.account_id = $2`,
      [req.params.id, ACCOUNT_ID]
    );
    if (ticketResult.rows.length === 0) return res.status(404).json({ error: 'Ticket introuvable' });

    const messagesResult = await query(
      `SELECT * FROM crm_ticket_messages WHERE ticket_id = $1 ORDER BY created_at ASC`,
      [req.params.id]
    );

    res.json({ ...ticketResult.rows[0], messages: messagesResult.rows });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.post('/', async (req, res) => {
  try {
    const { entity_id, contact_id, ticket_number, subject, description, status, priority } = req.body;

    if (!subject) return res.status(400).json({ error: 'subject requis' });

    let ticketNum = ticket_number;
    if (!ticketNum) {
      const settings = await query(`SELECT ticket_prefix FROM crm_settings WHERE account_id = $1`, [ACCOUNT_ID]);
      const prefix = settings.rows[0]?.ticket_prefix || 'SAV';
      const dateStr = new Date().toISOString().slice(0, 10).replace(/-/g, '');
      const rand = String(Math.floor(Math.random() * 99999) + 1).padStart(5, '0');
      ticketNum = `${prefix}-${dateStr}-${rand}`;
    }

    const result = await query(
      `INSERT INTO crm_tickets (account_id, entity_id, contact_id, ticket_number, subject, description, status, priority, created_by)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9) RETURNING *`,
      [
        ACCOUNT_ID,
        entity_id || null, contact_id || null,
        ticketNum, subject, description || null,
        status || 'ouvert',
        priority || 'normale',
        req.user.id || null,
      ]
    );
    res.status(201).json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.patch('/:id', async (req, res) => {
  try {
    const allowed = ['subject','description','status','priority','assigned_to','resolved_at','closed_at'];
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
      `UPDATE crm_tickets SET ${updates.join(', ')} WHERE id = $${params.length - 1} AND account_id = $${params.length} RETURNING *`,
      params
    );
    if (result.rows.length === 0) return res.status(404).json({ error: 'Ticket introuvable' });
    res.json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.post('/:id/messages', async (req, res) => {
  try {
    const { author_type, author_name, message, is_private } = req.body;
    if (!message) return res.status(400).json({ error: 'message requis' });

    const ticketCheck = await query(
      `SELECT id FROM crm_tickets WHERE id = $1 AND account_id = $2`,
      [req.params.id, ACCOUNT_ID]
    );
    if (ticketCheck.rows.length === 0) return res.status(404).json({ error: 'Ticket introuvable' });

    const result = await query(
      `INSERT INTO crm_ticket_messages (ticket_id, author_type, author_name, message, is_private)
       VALUES ($1,$2,$3,$4,$5) RETURNING *`,
      [req.params.id, author_type || 'internal', author_name || null, message, is_private || false]
    );
    res.status(201).json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.delete('/:id', async (req, res) => {
  try {
    const result = await query(
      `DELETE FROM crm_tickets WHERE id = $1 AND account_id = $2`,
      [req.params.id, ACCOUNT_ID]
    );
    if (result.rowCount === 0) return res.status(404).json({ error: 'Ticket introuvable' });
    res.json({ deleted: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
