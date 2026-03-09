const express = require('express');
const { query } = require('../db');
const aiService = require('../services/ai.service');

const router = express.Router();
const ACCOUNT_ID = '11111111-1111-1111-1111-111111111111';

router.post('/score-prospect', async (req, res) => {
  try {
    const { entity_id } = req.body;
    if (!entity_id) return res.status(400).json({ error: 'entity_id requis' });

    const entityResult = await query(
      `SELECT * FROM crm_entities WHERE id = $1 AND account_id = $2`,
      [entity_id, ACCOUNT_ID]
    );
    if (entityResult.rows.length === 0) return res.status(404).json({ error: 'Entité introuvable' });

    const entity = entityResult.rows[0];
    const result = await aiService.scoreProspect(entity);

    await query(
      `UPDATE crm_entities SET score = $1, temperature = $2, updated_at = now() WHERE id = $3`,
      [result.score, result.temperature, entity_id]
    );

    res.json(result);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.post('/generate-email', async (req, res) => {
  try {
    const { entity_id, purpose } = req.body;
    if (!entity_id) return res.status(400).json({ error: 'entity_id requis' });

    const entityResult = await query(
      `SELECT * FROM crm_entities WHERE id = $1 AND account_id = $2`,
      [entity_id, ACCOUNT_ID]
    );
    if (entityResult.rows.length === 0) return res.status(404).json({ error: 'Entité introuvable' });

    const entity = entityResult.rows[0];
    const result = await aiService.generateEmail(entity, purpose || 'prospection');

    await query(
      `INSERT INTO crm_emails (account_id, entity_id, direction, status, subject, body_text, body_html, created_by)
       VALUES ($1,$2,'outbound','draft',$3,$4,$5,$6)`,
      [ACCOUNT_ID, entity_id, result.subject, result.body_text, result.body_html, req.user.id || null]
    );

    res.json(result);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.post('/classify-reply', async (req, res) => {
  try {
    const { subject, body_text, entity_id } = req.body;
    if (!body_text) return res.status(400).json({ error: 'body_text requis' });

    const result = await aiService.classifyReply(subject || '', body_text, entity_id);
    res.json(result);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.post('/call-script', async (req, res) => {
  try {
    const { entity_id } = req.body;
    if (!entity_id) return res.status(400).json({ error: 'entity_id requis' });

    const entityResult = await query(
      `SELECT * FROM crm_entities WHERE id = $1 AND account_id = $2`,
      [entity_id, ACCOUNT_ID]
    );
    if (entityResult.rows.length === 0) return res.status(404).json({ error: 'Entité introuvable' });

    const entity = entityResult.rows[0];
    const script = await aiService.generateCallScript(entity);
    res.json({ script });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.get('/logs', async (req, res) => {
  try {
    const { entity_id, purpose, limit = 50, offset = 0 } = req.query;
    const params = [ACCOUNT_ID];
    const conditions = ['l.account_id = $1'];

    if (entity_id) {
      params.push(entity_id);
      conditions.push(`l.entity_id = $${params.length}`);
    }
    if (purpose) {
      params.push(purpose);
      conditions.push(`l.purpose = $${params.length}`);
    }

    params.push(parseInt(limit), parseInt(offset));
    const result = await query(
      `SELECT l.*, e.company_name AS entity_name
       FROM crm_ai_logs l
       LEFT JOIN crm_entities e ON e.id = l.entity_id
       WHERE ${conditions.join(' AND ')}
       ORDER BY l.created_at DESC
       LIMIT $${params.length - 1} OFFSET $${params.length}`,
      params
    );

    const countResult = await query(
      `SELECT count(*) FROM crm_ai_logs l WHERE ${conditions.join(' AND ')}`,
      params.slice(0, params.length - 2)
    );

    res.json({ data: result.rows, total: parseInt(countResult.rows[0].count) });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.delete('/logs/purge', async (req, res) => {
  try {
    const settingsResult = await query(
      `SELECT retention_logs_months FROM crm_settings WHERE account_id = $1`,
      [ACCOUNT_ID]
    );
    const months = settingsResult.rows[0]?.retention_logs_months || 36;

    const result = await query(
      `DELETE FROM crm_ai_logs WHERE account_id = $1 AND created_at < now() - interval '1 month' * $2`,
      [ACCOUNT_ID, months]
    );
    res.json({ deleted: result.rowCount, retention_months: months });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
