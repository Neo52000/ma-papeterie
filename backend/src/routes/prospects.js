const express = require('express');
const { query } = require('../db');

const router = express.Router();
const ACCOUNT_ID = '11111111-1111-1111-1111-111111111111';

router.get('/', async (req, res) => {
  try {
    const { status, city, score_min, search, entity_type, pipeline_stage, limit = 50, offset = 0 } = req.query;
    const params = [ACCOUNT_ID];
    const conditions = ['e.account_id = $1', 'e.is_duplicate = false'];

    if (entity_type) {
      params.push(entity_type);
      conditions.push(`e.entity_type = $${params.length}`);
    }
    if (status) {
      params.push(status);
      conditions.push(`e.status = $${params.length}`);
    }
    if (pipeline_stage) {
      params.push(pipeline_stage);
      conditions.push(`e.pipeline_stage = $${params.length}`);
    }
    if (city) {
      params.push(`%${city}%`);
      conditions.push(`e.city ILIKE $${params.length}`);
    }
    if (score_min) {
      params.push(parseInt(score_min));
      conditions.push(`e.score >= $${params.length}`);
    }
    if (search) {
      params.push(`%${search}%`);
      conditions.push(`(e.company_name ILIKE $${params.length} OR e.email ILIKE $${params.length} OR e.siret ILIKE $${params.length})`);
    }

    params.push(parseInt(limit));
    params.push(parseInt(offset));

    const sql = `
      SELECT e.*,
        (SELECT count(*) FROM crm_tasks t WHERE t.entity_id = e.id AND t.status = 'a_faire') AS open_tasks_count,
        (SELECT count(*) FROM crm_emails em WHERE em.entity_id = e.id) AS emails_count
      FROM crm_entities e
      WHERE ${conditions.join(' AND ')}
      ORDER BY e.score DESC, e.created_at DESC
      LIMIT $${params.length - 1} OFFSET $${params.length}
    `;

    const countSql = `SELECT count(*) FROM crm_entities e WHERE ${conditions.join(' AND ')}`;
    const [rows, countResult] = await Promise.all([
      query(sql, params),
      query(countSql, params.slice(0, params.length - 2)),
    ]);

    res.json({ data: rows.rows, total: parseInt(countResult.rows[0].count) });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.get('/rgpd/expired', async (req, res) => {
  try {
    const result = await query(
      `SELECT id, company_name, email, rgpd_retention_until, status
       FROM crm_entities
       WHERE account_id = $1 AND rgpd_retention_until < now() AND is_duplicate = false
       ORDER BY rgpd_retention_until ASC`,
      [ACCOUNT_ID]
    );
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.delete('/rgpd/purge', async (req, res) => {
  try {
    const { entity_ids } = req.body;
    if (!Array.isArray(entity_ids) || entity_ids.length === 0) {
      return res.status(400).json({ error: 'entity_ids requis (tableau)' });
    }
    const result = await query(
      `DELETE FROM crm_entities WHERE id = ANY($1::uuid[]) AND account_id = $2`,
      [entity_ids, ACCOUNT_ID]
    );
    res.json({ deleted: result.rowCount });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.get('/find-by-email', async (req, res) => {
  try {
    const { email } = req.query;
    if (!email) return res.status(400).json({ error: 'email requis' });
    const result = await query(
      `SELECT * FROM crm_entities WHERE account_id = $1 AND lower(email) = lower($2) LIMIT 1`,
      [ACCOUNT_ID, email]
    );
    if (result.rows.length === 0) return res.status(404).json({ error: 'Non trouvé' });
    res.json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.post('/check-duplicate', async (req, res) => {
  try {
    const { siret, email, company_name } = req.body;
    const checks = [];

    if (siret) {
      const r = await query(
        `SELECT id, company_name, siret FROM crm_entities WHERE account_id = $1 AND siret = $2 AND is_duplicate = false LIMIT 1`,
        [ACCOUNT_ID, siret]
      );
      if (r.rows.length > 0) checks.push({ field: 'siret', match: r.rows[0] });
    }
    if (email) {
      const r = await query(
        `SELECT id, company_name, email FROM crm_entities WHERE account_id = $1 AND lower(email) = lower($2) LIMIT 1`,
        [ACCOUNT_ID, email]
      );
      if (r.rows.length > 0) checks.push({ field: 'email', match: r.rows[0] });
    }
    if (company_name) {
      const r = await query(
        `SELECT id, company_name FROM crm_entities WHERE account_id = $1 AND lower(company_name) = lower($2) AND is_duplicate = false LIMIT 1`,
        [ACCOUNT_ID, company_name]
      );
      if (r.rows.length > 0) checks.push({ field: 'company_name', match: r.rows[0] });
    }

    res.json({ is_duplicate: checks.length > 0, matches: checks });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.post('/import', async (req, res) => {
  try {
    const { entities, batch_id } = req.body;
    if (!Array.isArray(entities) || entities.length === 0) {
      return res.status(400).json({ error: 'entities requis' });
    }

    let imported = 0;
    let failed = 0;
    let duplicates = 0;
    const errors = [];

    for (const e of entities) {
      try {
        if (e.siret) {
          const dup = await query(
            `SELECT id FROM crm_entities WHERE account_id = $1 AND siret = $2 AND is_duplicate = false LIMIT 1`,
            [ACCOUNT_ID, e.siret]
          );
          if (dup.rows.length > 0) {
            duplicates++;
            continue;
          }
        }

        await query(
          `INSERT INTO crm_entities (
            account_id, entity_type, company_type, company_name, legal_name, siret, siren,
            naf_code, naf_label, email, phone, address_line1, postal_code, city, country,
            latitude, longitude, distance_km, within_target_radius,
            status, score, temperature, source_label, import_batch_id,
            rgpd_legal_basis, rgpd_collected_at, rgpd_retention_until
          ) VALUES (
            $1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18,$19,$20,$21,$22,$23,$24,$25,now(),now() + interval '3 years'
          )`,
          [
            ACCOUNT_ID,
            e.entity_type || 'prospect',
            e.company_type || 'entreprise',
            e.company_name,
            e.legal_name || e.company_name,
            e.siret || null,
            e.siren || null,
            e.naf_code || null,
            e.naf_label || null,
            e.email || null,
            e.phone || null,
            e.address_line1 || null,
            e.postal_code || null,
            e.city || null,
            e.country || 'France',
            e.latitude || null,
            e.longitude || null,
            e.distance_km || null,
            e.within_target_radius !== undefined ? e.within_target_radius : true,
            e.status || 'a_contacter',
            e.score || 0,
            e.temperature || 'froid',
            e.source_label || null,
            batch_id || null,
          ]
        );
        imported++;
      } catch (err) {
        failed++;
        errors.push({ company_name: e.company_name, error: err.message });
      }
    }

    res.json({ imported, failed, duplicates, errors });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.get('/:id', async (req, res) => {
  try {
    const result = await query(
      `SELECT e.*,
        COALESCE(json_agg(DISTINCT c.*) FILTER (WHERE c.id IS NOT NULL), '[]') AS contacts,
        COALESCE(json_agg(DISTINCT t.*) FILTER (WHERE t.id IS NOT NULL), '[]') AS tags
       FROM crm_entities e
       LEFT JOIN crm_contacts c ON c.entity_id = e.id
       LEFT JOIN crm_entity_tags et ON et.entity_id = e.id
       LEFT JOIN crm_tags t ON t.id = et.tag_id
       WHERE e.id = $1 AND e.account_id = $2
       GROUP BY e.id`,
      [req.params.id, ACCOUNT_ID]
    );
    if (result.rows.length === 0) return res.status(404).json({ error: 'Entité introuvable' });
    res.json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.post('/', async (req, res) => {
  try {
    const {
      entity_type, company_type, company_name, legal_name, siret, siren, vat_number,
      naf_code, naf_label, email, phone, mobile, address_line1, address_line2,
      postal_code, city, country, latitude, longitude, website, notes,
      status, pipeline_stage, score, temperature, source_label,
      rgpd_legal_basis,
    } = req.body;

    if (!company_name) return res.status(400).json({ error: 'company_name requis' });

    const result = await query(
      `INSERT INTO crm_entities (
        account_id, entity_type, company_type, company_name, legal_name, siret, siren, vat_number,
        naf_code, naf_label, email, phone, mobile, address_line1, address_line2,
        postal_code, city, country, latitude, longitude, website, notes,
        status, pipeline_stage, score, temperature, source_label,
        rgpd_legal_basis, rgpd_collected_at, rgpd_retention_until, created_by
      ) VALUES (
        $1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18,$19,$20,$21,$22,$23,$24,$25,$26,$27,$28,now(),now() + interval '3 years',$29
      ) RETURNING *`,
      [
        ACCOUNT_ID,
        entity_type || 'prospect',
        company_type || 'entreprise',
        company_name,
        legal_name || company_name,
        siret || null, siren || null, vat_number || null,
        naf_code || null, naf_label || null,
        email || null, phone || null, mobile || null,
        address_line1 || null, address_line2 || null,
        postal_code || null, city || null, country || 'France',
        latitude || null, longitude || null,
        website || null, notes || null,
        status || 'a_contacter',
        pipeline_stage || 'a_contacter',
        score || 0,
        temperature || 'froid',
        source_label || null,
        rgpd_legal_basis || 'interet_legitime',
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
      'entity_type','company_type','company_name','legal_name','siret','siren','vat_number',
      'naf_code','naf_label','email','phone','mobile','address_line1','address_line2',
      'postal_code','city','country','latitude','longitude','website','notes',
      'status','pipeline_stage','score','temperature','source_label','is_blacklisted',
      'blacklist_reason','rgpd_opt_out','rgpd_legal_basis',
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

    params.push(req.user.id);
    updates.push(`updated_by = $${params.length}`);
    updates.push(`updated_at = now()`);

    params.push(req.params.id);
    params.push(ACCOUNT_ID);

    const result = await query(
      `UPDATE crm_entities SET ${updates.join(', ')} WHERE id = $${params.length - 1} AND account_id = $${params.length} RETURNING *`,
      params
    );
    if (result.rows.length === 0) return res.status(404).json({ error: 'Entité introuvable' });
    res.json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.delete('/:id', async (req, res) => {
  try {
    const result = await query(
      `DELETE FROM crm_entities WHERE id = $1 AND account_id = $2`,
      [req.params.id, ACCOUNT_ID]
    );
    if (result.rowCount === 0) return res.status(404).json({ error: 'Entité introuvable' });
    res.json({ deleted: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
