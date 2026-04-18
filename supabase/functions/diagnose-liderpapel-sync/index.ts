// Diagnostic read-only de la chaîne de sync Liderpapel.
// Appelé depuis Admin → Comlandi → onglet Liderpapel.
//
// Checks :
//   1. Credentials SFTP présents dans les secrets Supabase
//   2. Dernière exécution cron réussie (table cron_job_logs)
//   3. État du produit Liderpapel EAN 8423473806382 (fige canari)
//   4. RPC recompute_product_rollups fonctionnelle
//   5. Offres fournisseur actives sur ce produit
//   6. Dernier import Liderpapel (table supplier_import_logs)

import { createHandler } from "../_shared/handler.ts";

interface DiagCheck {
  check: string;
  status: "ok" | "warning" | "error";
  detail: string;
}

const CANARY_EAN = "8423473806382";

Deno.serve(createHandler({
  name: "diagnose-liderpapel-sync",
  auth: "admin-or-secret",
}, async ({ supabaseAdmin }) => {
  const checks: DiagCheck[] = [];

  // 1. Secrets SFTP
  const sftpUser = Deno.env.get("LIDERPAPEL_SFTP_USER");
  const sftpPass = Deno.env.get("LIDERPAPEL_SFTP_PASSWORD");
  const sftpHost = Deno.env.get("LIDERPAPEL_SFTP_HOST");
  checks.push({
    check: "Secrets SFTP",
    status: sftpUser && sftpPass && sftpHost ? "ok" : "error",
    detail: sftpUser && sftpPass && sftpHost
      ? `user=${sftpUser.slice(0, 3)}***, host=${sftpHost}`
      : `manquants : ${[
        !sftpHost && "LIDERPAPEL_SFTP_HOST",
        !sftpUser && "LIDERPAPEL_SFTP_USER",
        !sftpPass && "LIDERPAPEL_SFTP_PASSWORD",
      ].filter(Boolean).join(", ")}`,
  });

  // 2. Dernier run cron et dernier succès
  const { data: lastRuns } = await supabaseAdmin
    .from("cron_job_logs")
    .select("executed_at, status, error_message, duration_ms")
    .eq("job_name", "sync-liderpapel-sftp")
    .order("executed_at", { ascending: false })
    .limit(10);

  const lastRun = lastRuns?.[0];
  const lastSuccess = lastRuns?.find((r) => r.status === "success");
  const daysSinceLastSuccess = lastSuccess
    ? Math.floor(
      (Date.now() - new Date(lastSuccess.executed_at).getTime()) /
        (1000 * 60 * 60 * 24),
    )
    : null;

  checks.push({
    check: "Dernier cron sync-liderpapel-sftp",
    status: !lastRun
      ? "error"
      : lastRun.status === "success"
      ? "ok"
      : "error",
    detail: lastRun
      ? `${lastRun.status} il y a ${
        Math.round(
          (Date.now() - new Date(lastRun.executed_at).getTime()) /
            (1000 * 60 * 60),
        )
      }h${
        lastRun.error_message ? ` — ${lastRun.error_message.slice(0, 200)}` : ""
      }`
      : "aucune trace",
  });

  checks.push({
    check: "Dernier succès cron",
    status: daysSinceLastSuccess === null
      ? "error"
      : daysSinceLastSuccess > 2
      ? "warning"
      : "ok",
    detail: lastSuccess
      ? `il y a ${daysSinceLastSuccess} jour(s) (${lastSuccess.executed_at})`
      : "aucun succès dans les 10 derniers runs",
  });

  // 3. Produit canari (EAN Liderpapel de référence)
  const { data: canary } = await supabaseAdmin
    .from("products")
    .select(
      "id, ean, name, price_ht, price_ttc, price, cost_price, public_price_ttc, public_price_source, public_price_updated_at",
    )
    .eq("ean", CANARY_EAN)
    .maybeSingle();

  if (canary) {
    const ageDays = canary.public_price_updated_at
      ? Math.floor(
        (Date.now() - new Date(canary.public_price_updated_at).getTime()) /
          (1000 * 60 * 60 * 24),
      )
      : null;
    checks.push({
      check: `Produit canari (EAN ${CANARY_EAN})`,
      status: ageDays === null
        ? "warning"
        : ageDays > 2
        ? "warning"
        : "ok",
      detail: `public_price_ttc=${canary.public_price_ttc ?? "null"} (${
        canary.public_price_source ?? "no source"
      }), maj ${
        canary.public_price_updated_at
          ? `il y a ${ageDays} j`
          : "jamais"
      }. price_ht=${canary.price_ht}, cost=${canary.cost_price}`,
    });
  } else {
    checks.push({
      check: `Produit canari (EAN ${CANARY_EAN})`,
      status: "error",
      detail: "produit introuvable",
    });
  }

  // 4. Test live du RPC recompute_product_rollups sur le canari
  if (canary?.id) {
    const t0 = Date.now();
    const { error: rpcError } = await supabaseAdmin
      .rpc("recompute_product_rollups", { p_product_id: canary.id });
    const elapsed = Date.now() - t0;
    checks.push({
      check: "RPC recompute_product_rollups",
      status: rpcError ? "error" : "ok",
      detail: rpcError ? rpcError.message : `OK (${elapsed}ms)`,
    });
  }

  // 5. Offres actives sur le canari
  if (canary?.id) {
    const { data: offers } = await supabaseAdmin
      .from("supplier_offers")
      .select("supplier, pvp_ttc, purchase_price_ht, is_active, last_seen_at")
      .eq("product_id", canary.id)
      .eq("is_active", true)
      .order("last_seen_at", { ascending: false });

    const freshest = offers?.[0]?.last_seen_at;
    const ageDays = freshest
      ? Math.floor(
        (Date.now() - new Date(freshest).getTime()) / (1000 * 60 * 60 * 24),
      )
      : null;

    checks.push({
      check: "Offres fournisseur actives (canari)",
      status: !offers || offers.length === 0
        ? "warning"
        : ageDays !== null && ageDays > 2
        ? "warning"
        : "ok",
      detail: offers && offers.length > 0
        ? `${offers.length} offre(s) — fraîcheur ${
          ageDays !== null ? `${ageDays} j` : "?"
        } (${offers.map((o) => o.supplier).join(", ")})`
        : "aucune offre active",
    });
  }

  // 6. Dernier import Liderpapel
  const { data: lastImport } = await supabaseAdmin
    .from("supplier_import_logs")
    .select(
      "imported_at, format, success_count, error_count, total_rows, filename",
    )
    .eq("format", "liderpapel-catalogue")
    .order("imported_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (lastImport) {
    const ageHours = lastImport.imported_at
      ? Math.round(
        (Date.now() - new Date(lastImport.imported_at).getTime()) /
          (1000 * 60 * 60),
      )
      : null;
    checks.push({
      check: "Dernier import Liderpapel (supplier_import_logs)",
      status: ageHours === null
        ? "warning"
        : ageHours > 48
        ? "warning"
        : "ok",
      detail: `${lastImport.success_count ?? 0}/${
        lastImport.total_rows ?? 0
      } lignes, ${lastImport.error_count ?? 0} erreur(s), fichier ${
        lastImport.filename ?? "?"
      }, il y a ${ageHours ?? "?"}h`,
    });
  } else {
    checks.push({
      check: "Dernier import Liderpapel (supplier_import_logs)",
      status: "warning",
      detail: "aucune trace",
    });
  }

  const summary = {
    ok: checks.filter((c) => c.status === "ok").length,
    warning: checks.filter((c) => c.status === "warning").length,
    error: checks.filter((c) => c.status === "error").length,
  };

  return {
    timestamp: new Date().toISOString(),
    summary,
    checks,
  };
}));
