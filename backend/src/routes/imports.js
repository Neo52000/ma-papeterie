const express = require('express');
const { query } = require('../db');

const router = express.Router();
const ACCOUNT_ID = '11111111-1111-1111-1111-111111111111';

router.get('/', async (req, res) => {
  try {
    const { limit = 20, offset = 0 } = req.query;
    const result = await query(
      `SELECT * FROM crm_import_batches WHERE account_id = $1 ORDER BY started_at DESC LIMIT $2 OFFSET $3`,
      [ACCOUNT_ID, parseInt(limit), parseInt(offset)]
    );
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.post('/complete', async (req, res) => {
  try {
    const { batch_id, imported_rows, failed_rows, duplicate_rows, metadata } = req.body;
    if (!batch_id) return res.status(400).json({ error: 'batch_id requis' });

    const result = await query(
      `UPDATE crm_import_batches
       SET finished_at = now(),
           imported_rows = COALESCE($2, imported_rows),
           failed_rows = COALESCE($3, failed_rows),
           duplicate_rows = COALESCE($4, duplicate_rows),
           metadata = COALESCE($5::jsonb, metadata)
       WHERE id = $1 AND account_id = $6
       RETURNING *`,
      [
        batch_id,
        imported_rows !== undefined ? imported_rows : null,
        failed_rows !== undefined ? failed_rows : null,
        duplicate_rows !== undefined ? duplicate_rows : null,
        metadata ? JSON.stringify(metadata) : null,
        ACCOUNT_ID,
      ]
    );
    if (result.rows.length === 0) return res.status(404).json({ error: 'Batch introuvable' });
    res.json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
