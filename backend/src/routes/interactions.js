const express = require('express');
const { query } = require('../db');

const router = express.Router();
const ACCOUNT_ID = '11111111-1111-1111-1111-111111111111';

router.get('/', async (req, res) => {
  try {
    const { entity_id, interaction_type, limit = 50, offset = 0 } = req.query;
    const params = [ACCOUNT_ID];
    const conditions = ['i.account_id = $1'];

    if (entity_id) {
      params.push(entity_id);
      conditions.push(`i.entity_id = $${params.length}`);
    }
    if (interaction_type) {
      params.push(interaction_type);
      conditions.push(`i.interaction_type = $${params.length}`);
    }

    params.push(parseInt(limit), parseInt(offset));
    const result = await query(
      `SELECT i.*, e.company_name AS entity_name
       FROM crm_interactions i
       LEFT JOIN crm_entities e ON e.id = i.entity_id
       WHERE ${conditions.join(' AND ')}
       ORDER BY i.interaction_at DESC
       LIMIT $${params.length - 1} OFFSET $${params.length}`,
      params
    );
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.post('/', async (req, res) => {
  try {
    const {
      entity_id, contact_id, opportunity_id, task_id, email_id,
      interaction_type, title, content, interaction_at, metadata,
    } = req.body;

    if (!interaction_type) return res.status(400).json({ error: 'interaction_type requis' });

    const result = await query(
      `INSERT INTO crm_interactions (
        account_id, entity_id, contact_id, opportunity_id, task_id, email_id,
        interaction_type, title, content, interaction_at, metadata, created_by
      ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12) RETURNING *`,
      [
        ACCOUNT_ID,
        entity_id || null, contact_id || null,
        opportunity_id || null, task_id || null, email_id || null,
        interaction_type, title || null, content || null,
        interaction_at || new Date().toISOString(),
        metadata ? JSON.stringify(metadata) : '{}',
        req.user.id || null,
      ]
    );
    res.status(201).json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
