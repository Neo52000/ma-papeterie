const express = require('express');
const { query } = require('../db');

const router = express.Router();
const ACCOUNT_ID = '11111111-1111-1111-1111-111111111111';

router.get('/', async (req, res) => {
  try {
    const { status, due_today, entity_id, priority, limit = 50, offset = 0 } = req.query;
    const params = [ACCOUNT_ID];
    const conditions = ['t.account_id = $1'];

    if (status) {
      params.push(status);
      conditions.push(`t.status = $${params.length}`);
    }
    if (entity_id) {
      params.push(entity_id);
      conditions.push(`t.entity_id = $${params.length}`);
    }
    if (priority) {
      params.push(priority);
      conditions.push(`t.priority = $${params.length}`);
    }
    if (due_today === 'true') {
      conditions.push(`t.due_at::date = current_date`);
    }

    params.push(parseInt(limit));
    params.push(parseInt(offset));

    const result = await query(
      `SELECT t.*, e.company_name AS entity_name
       FROM crm_tasks t
       LEFT JOIN crm_entities e ON e.id = t.entity_id
       WHERE ${conditions.join(' AND ')}
       ORDER BY t.due_at ASC NULLS LAST, t.priority DESC
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
      entity_id, contact_id, opportunity_id, title, description,
      task_type, status, priority, due_at,
    } = req.body;

    if (!title) return res.status(400).json({ error: 'title requis' });

    const result = await query(
      `INSERT INTO crm_tasks (
        account_id, entity_id, contact_id, opportunity_id, title, description,
        task_type, status, priority, due_at, created_by
      ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11) RETURNING *`,
      [
        ACCOUNT_ID,
        entity_id || null, contact_id || null, opportunity_id || null,
        title, description || null,
        task_type || 'autre',
        status || 'a_faire',
        priority || 'normale',
        due_at || null,
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
    const allowed = ['title','description','task_type','status','priority','due_at','completed_at','entity_id'];
    const updates = [];
    const params = [];

    for (const key of allowed) {
      if (key in req.body) {
        params.push(req.body[key]);
        updates.push(`${key} = $${params.length}`);
      }
    }

    if (req.body.status === 'terminee' && !('completed_at' in req.body)) {
      updates.push(`completed_at = now()`);
    }

    updates.push(`updated_at = now()`);
    params.push(req.params.id, ACCOUNT_ID);

    const result = await query(
      `UPDATE crm_tasks SET ${updates.join(', ')} WHERE id = $${params.length - 1} AND account_id = $${params.length} RETURNING *`,
      params
    );
    if (result.rows.length === 0) return res.status(404).json({ error: 'Tâche introuvable' });
    res.json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.delete('/:id', async (req, res) => {
  try {
    const result = await query(
      `DELETE FROM crm_tasks WHERE id = $1 AND account_id = $2`,
      [req.params.id, ACCOUNT_ID]
    );
    if (result.rowCount === 0) return res.status(404).json({ error: 'Tâche introuvable' });
    res.json({ deleted: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
