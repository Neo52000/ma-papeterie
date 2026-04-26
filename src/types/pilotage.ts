// Types du module pilotage ma-papeterie.fr

export type PilotageChannel = 'web_b2c' | 'web_b2b' | 'pos' | 'all';
export type PilotagePeriod = 'day' | 'week' | 'month' | 'quarter' | 'year';
export type AlertSeverity = 'info' | 'warning' | 'critical';
export type AlertStatus = 'active' | 'acknowledged' | 'resolved' | 'dismissed';
export type CoachRole = 'system' | 'user' | 'assistant';

export interface PilotageSnapshot {
  id: string;
  snapshot_date: string;
  channel: PilotageChannel;
  ca_ht: number;
  ca_ttc: number;
  cogs_ht: number;
  marge_brute: number;
  taux_marge: number;
  nb_orders: number;
  nb_orders_paid: number;
  panier_moyen_ht: number;
  nb_customers_unique: number;
  nb_customers_new: number;
  nb_customers_returning: number;
  encaissements_ttc: number;
  creances_pendantes_ttc: number;
  nb_transactions_pos: number | null;
  ticket_moyen_pos_ttc: number | null;
  nb_sessions: number | null;
  taux_conversion: number | null;
  computed_at: string;
  raw_data: Record<string, unknown> | null;
}

export interface PilotageOverviewCurrent {
  channel: PilotageChannel;
  ca_ht_7d: number;
  marge_brute_7d: number;
  taux_marge_7d: number;
  nb_orders_7d: number;
  encaissements_7d: number;
  ca_ht_30d: number;
  marge_brute_30d: number;
  taux_marge_30d: number;
  nb_orders_30d: number;
  encaissements_30d: number;
  panier_moyen_30d: number;
  ca_ht_30d_prev: number;
  marge_brute_30d_prev: number;
  taux_marge_30d_prev: number;
  ca_delta_pct: number;
  marge_delta_pct: number;
  ca_ht_90d: number;
  marge_brute_90d: number;
  encaissements_90d: number;
  refreshed_at: string;
}

export interface PilotageGoal {
  id: string;
  period: PilotagePeriod;
  period_start: string;
  period_end: string;
  channel: PilotageChannel;
  objectif_ca_ht: number | null;
  objectif_marge_brute: number | null;
  objectif_taux_marge: number | null;
  objectif_nb_orders: number | null;
  objectif_panier_moyen_ht: number | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
}

export interface GoalProgress {
  goal_id: string;
  period_start: string;
  period_end: string;
  channel: PilotageChannel;
  objectif_ca_ht: number;
  realise_ca_ht: number;
  progression_pct: number;
  jours_restants: number;
  rythme_quotidien_requis: number;
}

export interface PilotageAlertRule {
  id: string;
  name: string;
  description: string | null;
  metric: string;
  operator: string;
  threshold: number;
  channel: PilotageChannel;
  severity: AlertSeverity;
  is_active: boolean;
  comparison_window_days: number;
  created_at: string;
  updated_at: string;
}

export interface PilotageAlert {
  id: string;
  rule_id: string | null;
  severity: AlertSeverity;
  status: AlertStatus;
  title: string;
  message: string;
  metric: string | null;
  metric_value: number | null;
  threshold: number | null;
  channel: PilotageChannel | null;
  triggered_at: string;
  acknowledged_at: string | null;
  resolved_at: string | null;
  context_data: Record<string, unknown> | null;
}

export interface CoachConversation {
  id: string;
  title: string;
  summary: string | null;
  created_at: string;
  updated_at: string;
  last_message_at: string;
  archived: boolean;
}

export interface CoachMessage {
  id: string;
  conversation_id: string;
  role: CoachRole;
  content: string;
  kpi_snapshot: Record<string, unknown> | null;
  model: string | null;
  tokens_input: number | null;
  tokens_output: number | null;
  created_at: string;
}

export interface TimeseriesPoint {
  snapshot_date: string;
  ca_ht: number;
  marge_brute: number;
  taux_marge: number;
  nb_orders: number;
  panier_moyen_ht: number;
  encaissements_ttc: number;
}

export interface TresorerieProjectionPoint {
  encaissement_prevu_date: string;
  channel: PilotageChannel;
  payment_status: string;
  montant_ttc: number;
  nb_orders: number;
}
