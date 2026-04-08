// ── sms-gateway-health : Vérification santé de la gateway SMS ───────────────
//
// Admin-only. Retourne l'état de la gateway et les stats d'envoi récentes.

import { createHandler, jsonResponse } from "../_shared/handler.ts";
import { getSmsGatewayConfig } from "../_shared/sms-client.ts";

Deno.serve(createHandler({
  name: "sms-gateway-health",
  auth: "admin",
  rateLimit: { prefix: "sms-health", max: 10, windowMs: 60_000 },
  methods: ["GET", "POST"],
}, async ({ supabaseAdmin, corsHeaders }) => {

  // 1. Load config
  const config = await getSmsGatewayConfig(supabaseAdmin);

  if (!config) {
    return jsonResponse({
      configured: false,
      error: "Gateway SMS non configurée dans admin_secrets",
      hint: "Configurer SMS_GATEWAY_USERNAME et SMS_GATEWAY_PASSWORD",
    }, 200, corsHeaders);
  }

  // 2. Test gateway connectivity
  const baseUrl = config.mode === "local" && config.localUrl
    ? config.localUrl
    : config.url;

  let gatewayReachable = false;
  let gatewayError: string | null = null;

  try {
    const auth = btoa(`${config.username}:${config.password}`);
    const response = await fetch(baseUrl, {
      method: "GET",
      headers: { Authorization: `Basic ${auth}` },
      signal: AbortSignal.timeout(10_000),
    });
    gatewayReachable = response.ok || response.status === 404; // 404 = server up but no root endpoint
  } catch (err) {
    gatewayError = err instanceof Error ? err.message : "Connexion impossible";
  }

  // 3. Fetch SMS stats (last 24h)
  const since = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();

  const { data: stats } = await supabaseAdmin
    .from("sms_logs")
    .select("status")
    .gte("created_at", since);

  const counts = { total: 0, sent: 0, delivered: 0, failed: 0, rejected: 0, pending: 0 };
  (stats || []).forEach((row: { status: string }) => {
    counts.total++;
    if (row.status in counts) {
      counts[row.status as keyof typeof counts]++;
    }
  });

  const deliveryRate = counts.sent > 0
    ? Math.round((counts.delivered / counts.sent) * 100)
    : null;

  // 4. Fetch stats for last 7 days (daily aggregation)
  const weekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();
  const { data: weekStats } = await supabaseAdmin
    .from("sms_logs")
    .select("status, created_at")
    .gte("created_at", weekAgo);

  const dailyStats: Record<string, { sent: number; delivered: number; failed: number }> = {};
  (weekStats || []).forEach((row: { status: string; created_at: string }) => {
    const day = row.created_at.substring(0, 10);
    if (!dailyStats[day]) dailyStats[day] = { sent: 0, delivered: 0, failed: 0 };
    if (row.status === "sent" || row.status === "delivered") dailyStats[day].sent++;
    if (row.status === "delivered") dailyStats[day].delivered++;
    if (row.status === "failed") dailyStats[day].failed++;
  });

  return jsonResponse({
    configured: true,
    mode: config.mode,
    gateway_url: baseUrl,
    gateway_reachable: gatewayReachable,
    gateway_error: gatewayError,
    limits: {
      daily_per_phone: config.dailyLimitPerPhone,
      hourly_global: config.hourlyGlobalLimit,
    },
    last_24h: {
      ...counts,
      delivery_rate_percent: deliveryRate,
    },
    daily_stats: dailyStats,
  }, 200, corsHeaders);
}));
