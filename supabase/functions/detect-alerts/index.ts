// =============================================================================
// Edge Function : detect-alerts
// Appelée par pg_cron tous les jours à 00h Paris
// Évalue toutes les règles actives et génère les alertes correspondantes
// =============================================================================

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { corsHeaders } from '../_shared/cors.ts';

type AlertSeverity = 'info' | 'warning' | 'critical';
type Channel = 'web_b2c' | 'web_b2b' | 'pos' | 'all';

interface AlertRule {
  id: string;
  name: string;
  description: string | null;
  metric: string;
  operator: string;
  threshold: number;
  channel: Channel;
  severity: AlertSeverity;
  is_active: boolean;
  comparison_window_days: number;
}

interface AlertToInsert {
  rule_id: string;
  severity: AlertSeverity;
  status: 'active';
  title: string;
  message: string;
  metric: string;
  metric_value: number;
  threshold: number;
  channel: Channel;
  context_data: Record<string, unknown>;
}

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });

  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    );

    // 1. Récupérer toutes les règles actives
    const { data: rules, error: rulesError } = await supabase
      .from('pilotage_alert_rules')
      .select('*')
      .eq('is_active', true);

    if (rulesError) throw rulesError;

    // 2. Récupérer le snapshot "all" et par canal des 30 derniers jours
    const today = new Date().toISOString().slice(0, 10);
    const thirtyDaysAgo = new Date(Date.now() - 30 * 86400000).toISOString().slice(0, 10);

    const { data: snapshots, error: snapError } = await supabase
      .from('pilotage_snapshots')
      .select('*')
      .gte('snapshot_date', thirtyDaysAgo)
      .lte('snapshot_date', today)
      .order('snapshot_date', { ascending: false });

    if (snapError) throw snapError;

    const alertsToInsert: AlertToInsert[] = [];

    // 3. Évaluer chaque règle
    for (const rule of (rules ?? []) as AlertRule[]) {
      const alert = await evaluateRule(supabase, rule, snapshots ?? [], today);
      if (alert) alertsToInsert.push(alert);
    }

    // 4. Dé-duplication : ne pas ré-insérer une alerte active avec même rule_id + metric
    if (alertsToInsert.length > 0) {
      const { data: existingAlerts } = await supabase
        .from('pilotage_alerts')
        .select('rule_id, metric')
        .eq('status', 'active');

      const existingKeys = new Set(
        (existingAlerts ?? []).map((a: { rule_id: string; metric: string }) => `${a.rule_id}__${a.metric}`)
      );

      const newAlerts = alertsToInsert.filter(a => !existingKeys.has(`${a.rule_id}__${a.metric}`));

      if (newAlerts.length > 0) {
        const { error: insertError } = await supabase
          .from('pilotage_alerts')
          .insert(newAlerts);

        if (insertError) throw insertError;
      }

      console.log(JSON.stringify({
        function: 'detect-alerts',
        action: 'success',
        rules_evaluated: rules?.length ?? 0,
        new_alerts: newAlerts.length,
        duplicates_skipped: alertsToInsert.length - newAlerts.length,
      }));

      return new Response(
        JSON.stringify({ success: true, new_alerts: newAlerts.length }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    return new Response(
      JSON.stringify({ success: true, new_alerts: 0 }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    const errorMsg = error instanceof Error ? error.message : 'Unknown error';
    console.error('[detect-alerts] Error:', errorMsg);
    return new Response(
      JSON.stringify({ error: errorMsg }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});

// eslint-disable-next-line @typescript-eslint/no-explicit-any
async function evaluateRule(supabase: any, rule: AlertRule, snapshots: any[], today: string): Promise<AlertToInsert | null> {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const channelSnapshots = snapshots.filter((s: any) => s.channel === rule.channel);
  if (channelSnapshots.length === 0) return null;

  const windowDays = rule.comparison_window_days || 7;
  const windowSnapshots = channelSnapshots.slice(0, windowDays);
  const prevWindowSnapshots = channelSnapshots.slice(windowDays, windowDays * 2);

  switch (rule.metric) {
    case 'taux_marge_7d': {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const avg = windowSnapshots.reduce((sum: number, s: any) => sum + Number(s.taux_marge ?? 0), 0) / Math.max(1, windowSnapshots.length);
      if (compareValue(avg, rule.operator, rule.threshold)) {
        return buildAlert(rule, avg, rule.threshold, {
          window_days: windowDays,
          avg_taux_marge: avg,
        });
      }
      break;
    }

    case 'taux_marge_delta_pct': {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const current = windowSnapshots.reduce((sum: number, s: any) => sum + Number(s.taux_marge ?? 0), 0) / Math.max(1, windowSnapshots.length);
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const prev = prevWindowSnapshots.reduce((sum: number, s: any) => sum + Number(s.taux_marge ?? 0), 0) / Math.max(1, prevWindowSnapshots.length);
      if (prev > 0) {
        const deltaPct = ((current - prev) / prev) * 100;
        if (rule.operator === 'delta_pct_down' && deltaPct < -rule.threshold) {
          return buildAlert(rule, Math.abs(deltaPct), rule.threshold, {
            current, prev, delta_pct: deltaPct,
          });
        }
      }
      break;
    }

    case 'ca_ht_delta_pct_7d': {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const current = windowSnapshots.reduce((sum: number, s: any) => sum + Number(s.ca_ht ?? 0), 0);
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const prev = prevWindowSnapshots.reduce((sum: number, s: any) => sum + Number(s.ca_ht ?? 0), 0);
      if (prev > 0) {
        const deltaPct = ((current - prev) / prev) * 100;
        if (rule.operator === 'delta_pct_down' && deltaPct < -rule.threshold) {
          return buildAlert(rule, Math.abs(deltaPct), rule.threshold, {
            current_ca: current, prev_ca: prev, delta_pct: deltaPct,
          });
        }
      }
      break;
    }

    case 'creances_pendantes_ttc': {
      const latest = channelSnapshots[0];
      if (!latest) break;
      const value = Number(latest.creances_pendantes_ttc ?? 0);
      if (compareValue(value, rule.operator, rule.threshold)) {
        return buildAlert(rule, value, rule.threshold, {
          snapshot_date: latest.snapshot_date,
        });
      }
      break;
    }

    case 'progression_mois_vs_jours': {
      // Récupérer l'objectif du mois en cours
      const { data: goal } = await supabase.rpc('get_goal_progress', {
        p_period: 'month',
        p_date: today,
      });
      if (!goal || goal.length === 0) break;
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const monthGoal = (goal as any[]).find((g: any) => g.channel === rule.channel);
      if (!monthGoal) break;

      const progressionPct = Number(monthGoal.progression_pct ?? 0);
      const daysInMonth = new Date(
        new Date(today).getFullYear(),
        new Date(today).getMonth() + 1,
        0
      ).getDate();
      const dayOfMonth = new Date(today).getDate();
      const monthProgressPct = (dayOfMonth / daysInMonth) * 100;

      // Alerte si progression CA < 50% alors qu'on est à plus de 50% du mois
      if (monthProgressPct > 50 && progressionPct < rule.threshold) {
        return buildAlert(rule, progressionPct, rule.threshold, {
          progression_ca: progressionPct,
          progression_temps: monthProgressPct,
          days_remaining: daysInMonth - dayOfMonth,
        });
      }
      break;
    }

    case 'panier_moyen_delta_pct': {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const current = windowSnapshots.reduce((sum: number, s: any) => sum + Number(s.panier_moyen_ht ?? 0), 0) / Math.max(1, windowSnapshots.length);
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const prev = prevWindowSnapshots.reduce((sum: number, s: any) => sum + Number(s.panier_moyen_ht ?? 0), 0) / Math.max(1, prevWindowSnapshots.length);
      if (prev > 0) {
        const deltaPct = ((current - prev) / prev) * 100;
        if (rule.operator === 'delta_pct_down' && deltaPct < -rule.threshold) {
          return buildAlert(rule, Math.abs(deltaPct), rule.threshold, {
            current_panier: current, prev_panier: prev, delta_pct: deltaPct,
          });
        }
      }
      break;
    }

    case 'nb_transactions_pos': {
      // Vérifier qu'il n'y a eu 0 transactions POS sur 48h
      const last48hSnapshots = channelSnapshots.slice(0, 2);
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const totalTx = last48hSnapshots.reduce((sum: number, s: any) => sum + Number(s.nb_transactions_pos ?? 0), 0);
      if (totalTx === 0 && last48hSnapshots.length >= 2) {
        return buildAlert(rule, 0, rule.threshold, {
          window_hours: 48,
        });
      }
      break;
    }
  }

  return null;
}

function compareValue(value: number, operator: string, threshold: number): boolean {
  switch (operator) {
    case '<': return value < threshold;
    case '<=': return value <= threshold;
    case '>': return value > threshold;
    case '>=': return value >= threshold;
    case '=': return value === threshold;
    default: return false;
  }
}

function buildAlert(rule: AlertRule, value: number, threshold: number, context: Record<string, unknown>): AlertToInsert {
  const formattedValue = value.toFixed(2);
  const formattedThreshold = threshold.toFixed(2);

  let message = rule.description ?? rule.name;
  message += ` Valeur actuelle : ${formattedValue} / Seuil : ${formattedThreshold}.`;

  return {
    rule_id: rule.id,
    severity: rule.severity,
    status: 'active',
    title: rule.name,
    message,
    metric: rule.metric,
    metric_value: Math.round(value * 100) / 100,
    threshold,
    channel: rule.channel,
    context_data: context,
  };
}
