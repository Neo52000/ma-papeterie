const express = require('express');
const { query } = require('../db');

const router = express.Router();
const ACCOUNT_ID = '11111111-1111-1111-1111-111111111111';

router.get('/', async (req, res) => {
  try {
    const { category, is_active, search, limit = 100, offset = 0 } = req.query;
    const params = [ACCOUNT_ID];
    const conditions = ['p.account_id = $1'];

    if (is_active !== undefined) {
      params.push(is_active === 'true');
      conditions.push(`p.is_active = $${params.length}`);
    }
    if (category) {
      params.push(category);
      conditions.push(`p.category = $${params.length}`);
    }
    if (search) {
      params.push(`%${search}%`);
      conditions.push(`(p.name ILIKE $${params.length} OR p.sku ILIKE $${params.length})`);
    }

    params.push(parseInt(limit), parseInt(offset));
    const result = await query(
      `SELECT * FROM crm_products p
       WHERE ${conditions.join(' AND ')}
       ORDER BY p.category NULLS LAST, p.name
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
      `SELECT * FROM crm_products WHERE id = $1 AND account_id = $2`,
      [req.params.id, ACCOUNT_ID]
    );
    if (result.rows.length === 0) return res.status(404).json({ error: 'Produit introuvable' });
    res.json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.post('/', async (req, res) => {
  try {
    const { sku, name, category, description, unit, unit_price_ht, vat_rate, is_active } = req.body;
    if (!name) return res.status(400).json({ error: 'name requis' });

    const result = await query(
      `INSERT INTO crm_products (account_id, sku, name, category, description, unit, unit_price_ht, vat_rate, is_active)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9) RETURNING *`,
      [
        ACCOUNT_ID, sku || null, name,
        category || null, description || null,
        unit || 'u',
        unit_price_ht || 0,
        vat_rate || 20,
        is_active !== undefined ? is_active : true,
      ]
    );
    res.status(201).json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.patch('/:id', async (req, res) => {
  try {
    const allowed = ['sku','name','category','description','unit','unit_price_ht','vat_rate','is_active'];
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
      `UPDATE crm_products SET ${updates.join(', ')} WHERE id = $${params.length - 1} AND account_id = $${params.length} RETURNING *`,
      params
    );
    if (result.rows.length === 0) return res.status(404).json({ error: 'Produit introuvable' });
    res.json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.delete('/:id', async (req, res) => {
  try {
    const result = await query(
      `DELETE FROM crm_products WHERE id = $1 AND account_id = $2`,
      [req.params.id, ACCOUNT_ID]
    );
    if (result.rowCount === 0) return res.status(404).json({ error: 'Produit introuvable' });
    res.json({ deleted: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
