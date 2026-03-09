const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { query } = require('../db');
const auth = require('../middleware/auth');

const router = express.Router();
const ACCOUNT_ID = '11111111-1111-1111-1111-111111111111';

router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) {
      return res.status(400).json({ error: 'Email et mot de passe requis' });
    }

    const result = await query(
      'SELECT * FROM crm_users WHERE email = $1 AND account_id = $2 AND is_active = true',
      [email.toLowerCase(), ACCOUNT_ID]
    );

    if (result.rows.length === 0) {
      return res.status(401).json({ error: 'Identifiants invalides' });
    }

    const user = result.rows[0];
    const valid = await bcrypt.compare(password, user.password_hash);
    if (!valid) {
      return res.status(401).json({ error: 'Identifiants invalides' });
    }

    const payload = {
      id: user.id,
      email: user.email,
      account_id: user.account_id,
      role: user.role,
    };

    const token = jwt.sign(payload, process.env.JWT_SECRET, { expiresIn: '8h' });
    const refreshToken = jwt.sign(payload, process.env.JWT_REFRESH_SECRET || process.env.JWT_SECRET, { expiresIn: '30d' });

    res.json({
      token,
      refresh_token: refreshToken,
      user: { id: user.id, email: user.email, full_name: user.full_name, role: user.role },
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.post('/refresh', async (req, res) => {
  try {
    const { refresh_token } = req.body;
    if (!refresh_token) return res.status(400).json({ error: 'refresh_token requis' });

    const payload = jwt.verify(refresh_token, process.env.JWT_REFRESH_SECRET || process.env.JWT_SECRET);
    const { iat, exp, ...data } = payload;

    const token = jwt.sign(data, process.env.JWT_SECRET, { expiresIn: '8h' });
    res.json({ token });
  } catch (err) {
    res.status(401).json({ error: 'Refresh token invalide' });
  }
});

router.get('/me', auth, async (req, res) => {
  try {
    const result = await query(
      'SELECT id, email, full_name, role, created_at FROM crm_users WHERE id = $1',
      [req.user.id]
    );
    if (result.rows.length === 0) return res.status(404).json({ error: 'Utilisateur introuvable' });
    res.json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
