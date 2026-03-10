const express = require('express');
const { query } = require('../db');

const router = express.Router();
const ACCOUNT_ID = '11111111-1111-1111-1111-111111111111';

router.get('/', async (req, res) => {
  try {
    const { entity_id, status, limit = 50, offset = 0 } = req.query;
    const params = [ACCOUNT_ID];
    const conditions = ['o.account_id = $1'];

    if (entity_id) {
      params.push(entity_id);
      conditions.push(`o.entity_id = $${params.length}`);
    }
    if (status) {
      params.push(status);
      conditions.push(`o.status = $${params.length}`);
    }

    params.push(parseInt(limit), parseInt(offset));
    const result = await query(
      `SELECT o.*, e.company_name AS entity_name
       FROM crm_opportunities o
       JOIN crm_entities e ON e.id = o.entity_id
       WHERE ${conditions.join(' AND ')}
       ORDER BY o.expected_close_date ASC NULLS LAST, o.estimated_amount DESC
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
    const result = await query(
      `SELECT o.*, e.company_name AS entity_name
       FROM crm_opportunities o
       JOIN crm_entities e ON e.id = o.entity_id
       WHERE o.id = $1 AND o.account_id = $2`,
      [req.params.id, ACCOUNT_ID]
    );
    if (result.rows.length === 0) return res.status(404).json({ error: 'Opportunité introuvable' });
    res.json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.post('/', async (req, res) => {
  try {
    const {
      entity_id, pipeline_id, stage_id, title, description,
      estimated_amount, probability, expected_close_date,
      status, source_label,
    } = req.body;

    if (!entity_id || !title) return res.status(400).json({ error: 'entity_id et title requis' });

    const result = await query(
      `INSERT INTO crm_opportunities (
        account_id, entity_id, pipeline_id, stage_id, title, description,
        estimated_amount, probability, expected_close_date, status, source_label, created_by
      ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12) RETURNING *`,
      [
        ACCOUNT_ID, entity_id,
        pipeline_id || null, stage_id || null,
        title, description || null,
        estimated_amount || 0, probability || 0,
        expected_close_date || null,
        status || 'a_contacter',
        source_label || null,
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
    const allowed = [
      'pipeline_id','stage_id','title','description','estimated_amount',
      'probability','expected_close_date','status','lost_reason','won_at','lost_at',
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
    params.push(req.params.id, ACCOUNT_ID);

    const result = await query(
      `UPDATE crm_opportunities SET ${updates.join(', ')} WHERE id = $${params.length - 1} AND account_id = $${params.length} RETURNING *`,
      params
    );
    if (result.rows.length === 0) return res.status(404).json({ error: 'Opportunité introuvable' });
    res.json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.delete('/:id', async (req, res) => {
  try {
    const result = await query(
      `DELETE FROM crm_opportunities WHERE id = $1 AND account_id = $2`,
      [req.params.id, ACCOUNT_ID]
    );
    if (result.rowCount === 0) return res.status(404).json({ error: 'Opportunité introuvable' });
    res.json({ deleted: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
