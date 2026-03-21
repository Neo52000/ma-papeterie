import { createHandler } from "../_shared/handler.ts";

// Seuils d'alerte
const THRESHOLDS = {
  RATE_LIMIT_SPIKE: 50,       // IPs avec > 50 requêtes/heure
  SUSPICIOUS_ORDER_AMOUNT: 1000, // Commandes > 1000 EUR
  HIGH_RATE_LIMIT_COUNT: 100,  // > 100 entrées de rate limit en 5 min
};

Deno.serve(createHandler({
  name: "security-monitor",
  auth: "secret",
  rateLimit: { prefix: "security-monitor", max: 5, windowMs: 60_000 },
}, async ({ supabaseAdmin }) => {
  const alerts: Array<{ type: string; severity: string; message: string; data?: unknown }> = [];

  // ── 1. Pics de rate limiting ────────────────────────────────────────────
  const { data: rateLimitData } = await supabaseAdmin
    .from("rate_limit_entries")
    .select("key, count")
    .gt("count", THRESHOLDS.RATE_LIMIT_SPIKE)
    .gte("window_start", new Date(Date.now() - 3600_000).toISOString());

  if (rateLimitData && rateLimitData.length > 0) {
    alerts.push({
      type: "RATE_LIMIT_SPIKE",
      severity: "warning",
      message: `${rateLimitData.length} IP(s) avec plus de ${THRESHOLDS.RATE_LIMIT_SPIKE} requêtes/heure`,
      data: rateLimitData.slice(0, 10),
    });
  }

  // ── 2. Commandes suspectes ──────────────────────────────────────────────
  const { data: suspiciousOrders } = await supabaseAdmin
    .from("orders")
    .select("id, user_id, total_amount, created_at")
    .gt("total_amount", THRESHOLDS.SUSPICIOUS_ORDER_AMOUNT)
    .gte("created_at", new Date(Date.now() - 3600_000).toISOString());

  if (suspiciousOrders && suspiciousOrders.length > 0) {
    alerts.push({
      type: "SUSPICIOUS_ORDER",
      severity: "warning",
      message: `${suspiciousOrders.length} commande(s) > ${THRESHOLDS.SUSPICIOUS_ORDER_AMOUNT} EUR dans la dernière heure`,
      data: suspiciousOrders,
    });
  }

  // ── 3. Changements de rôle récents ──────────────────────────────────────
  const { data: roleChanges } = await supabaseAdmin
    .from("audit_logs")
    .select("id, admin_email, action, changes, created_at")
    .eq("resource_type", "user_roles")
    .gte("created_at", new Date(Date.now() - 3600_000).toISOString());

  if (roleChanges && roleChanges.length > 0) {
    alerts.push({
      type: "ROLE_CHANGE",
      severity: "info",
      message: `${roleChanges.length} changement(s) de rôle dans la dernière heure`,
      data: roleChanges,
    });
  }

  // ── 4. Requêtes GDPR en attente ────────────────────────────────────────
  const { data: pendingGdpr } = await supabaseAdmin
    .from("gdpr_requests")
    .select("id, request_type, status, created_at")
    .in("status", ["pending", "processing"]);

  if (pendingGdpr && pendingGdpr.length > 0) {
    alerts.push({
      type: "GDPR_PENDING",
      severity: "info",
      message: `${pendingGdpr.length} demande(s) GDPR en attente de traitement`,
      data: pendingGdpr,
    });
  }

  // ── Envoyer les alertes critiques par email via Resend ──────────────────
  const criticalAlerts = alerts.filter((a) => a.severity === "critical" || a.severity === "warning");

  if (criticalAlerts.length > 0) {
    const resendKey = Deno.env.get("RESEND_API_KEY");
    const alertEmail = Deno.env.get("SECURITY_ALERT_EMAIL") || "contact@ma-papeterie.fr";

    if (resendKey) {
      try {
        await fetch("https://api.resend.com/emails", {
          method: "POST",
          headers: {
            "Authorization": `Bearer ${resendKey}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            from: "security@ma-papeterie.fr",
            to: [alertEmail],
            subject: `[SÉCURITÉ] ${criticalAlerts.length} alerte(s) - ma-papeterie.fr`,
            html: `<h2>Alertes de sécurité</h2>
              <p>${new Date().toLocaleString("fr-FR")}</p>
              ${criticalAlerts.map((a) => `
                <div style="margin: 10px 0; padding: 10px; border-left: 3px solid ${a.severity === "critical" ? "red" : "orange"}">
                  <strong>[${a.severity.toUpperCase()}] ${a.type}</strong><br/>
                  ${a.message}
                </div>
              `).join("")}`,
          }),
        });
      } catch (emailErr) {
        console.error("Erreur envoi email alerte:", emailErr);
      }
    }
  }

  console.log(`security-monitor: ${alerts.length} alerte(s) détectée(s)`);

  return {
    success: true,
    timestamp: new Date().toISOString(),
    alerts_count: alerts.length,
    alerts,
  };
}));
