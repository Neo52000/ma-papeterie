-- =============================================================================
-- Module Pilotage — Seed : règles d'alertes par défaut
-- À exécuter une seule fois après le schema
-- =============================================================================

-- Règles d'alerte ma-papeterie par défaut
INSERT INTO pilotage_alert_rules (name, description, metric, operator, threshold, channel, severity, comparison_window_days)
VALUES
  (
    'Marge brute dégradée (<25%)',
    'Le taux de marge brute sur 7 jours est passé sous 25%, seuil critique pour la rentabilité papeterie B2B/B2C.',
    'taux_marge_7d', '<', 25.0, 'all', 'critical', 7
  ),
  (
    'Marge brute en baisse significative',
    'Le taux de marge brute a chuté de plus de 10% par rapport aux 30 jours précédents.',
    'taux_marge_delta_pct', 'delta_pct_down', 10.0, 'all', 'warning', 30
  ),
  (
    'Chute du chiffre d''affaires (>20% sur 7j)',
    'Le CA sur 7 jours est en baisse de plus de 20% par rapport à la semaine précédente.',
    'ca_ht_delta_pct_7d', 'delta_pct_down', 20.0, 'all', 'critical', 7
  ),
  (
    'Créances B2B élevées (>5000€)',
    'Les créances B2B en attente dépassent 5000€ TTC. Vérifier les relances.',
    'creances_pendantes_ttc', '>', 5000.0, 'web_b2b', 'warning', 0
  ),
  (
    'Objectif mensuel en retard (<50% à J+15)',
    'Moins de 50% de l''objectif mensuel réalisé alors qu''on est à plus de la moitié du mois.',
    'progression_mois_vs_jours', '<', 50.0, 'all', 'warning', 0
  ),
  (
    'Panier moyen B2C en baisse (>15%)',
    'Le panier moyen B2C a baissé de plus de 15% sur 30 jours.',
    'panier_moyen_delta_pct', 'delta_pct_down', 15.0, 'web_b2c', 'info', 30
  ),
  (
    'Boutique POS : aucune transaction sur 48h',
    'Aucune vente enregistrée en boutique physique depuis 48h (jour ouvré).',
    'nb_transactions_pos', '=', 0.0, 'pos', 'info', 2
  )
ON CONFLICT DO NOTHING;

-- Objectif exemple : mois courant
-- À adapter par l'utilisateur via l'UI /admin/pilotage/objectifs
INSERT INTO pilotage_goals (period, period_start, period_end, channel, objectif_ca_ht, objectif_taux_marge, notes)
VALUES (
  'month',
  date_trunc('month', CURRENT_DATE)::DATE,
  (date_trunc('month', CURRENT_DATE) + INTERVAL '1 month - 1 day')::DATE,
  'all',
  30000.00,   -- 30k€ HT mensuel → à adapter
  32.00,      -- 32% de taux de marge cible
  'Objectif exemple — à ajuster dans /admin/pilotage/objectifs'
)
ON CONFLICT DO NOTHING;
