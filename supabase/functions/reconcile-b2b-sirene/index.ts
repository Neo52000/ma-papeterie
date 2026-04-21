// ── Reconcile B2B accounts SIRENE — Edge Function ───────────────────────────
//
// Re-synchronise toutes les fiches b2b_accounts dont le sirene_synced_at est
// NULL ou plus ancien que le seuil (30 jours par défaut). Respecte la cadence
// de 7 req/s de l'API Recherche d'Entreprises.
//
// Appelé :
//   - par le cron GitHub Actions hebdomadaire (reconcile-b2b-sirene.yml)
//   - manuellement via curl avec le header `x-api-secret` (pattern "secret")
//
// Body : { stale_days?: number, limit?: number } (optionnels)

import { createHandler } from "../_shared/handler.ts";

const API_BASE = "https://recherche-entreprises.api.gouv.fr/search";
const REQ_SPACING_MS = 150; // 7 req/s → 143 ms → marge à 150 ms
const FETCH_TIMEOUT_MS = 10_000;
const DEFAULT_STALE_DAYS = 30;
const DEFAULT_LIMIT = 200;

interface Body {
  stale_days?: number;
  limit?: number;
}

interface Account {
  id: string;
  siret: string;
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function fetchSirene(siret: string): Promise<Record<string, unknown> | null> {
  const url = `${API_BASE}?q=${siret}&per_page=1&matching_etablissements=1`;
  for (let attempt = 0; attempt < 2; attempt++) {
    try {
      const res = await fetch(url, {
        headers: { Accept: "application/json", "User-Agent": "ma-papeterie-reconcile/1.0" },
        signal: AbortSignal.timeout(FETCH_TIMEOUT_MS),
      });
      if (res.status === 429 && attempt === 0) {
        await sleep(2000);
        continue;
      }
      if (!res.ok) return null;
      const json = (await res.json()) as { results?: Array<Record<string, unknown>> };
      return json.results?.[0] ?? null;
    } catch {
      if (attempt === 0) {
        await sleep(2000);
        continue;
      }
      return null;
    }
  }
  return null;
}

function extractSireneFields(entry: Record<string, unknown>) {
  const siege = entry.siege as Record<string, unknown> | undefined;
  return {
    naf_code: (entry.activite_principale as string) || null,
    naf_label:
      (entry.libelle_activite_principale as string) ||
      (entry.section_activite_principale as string) ||
      null,
    legal_form: (entry.nature_juridique as string) || null,
    founded_date: (entry.date_creation as string) || null,
    employee_range: (entry.tranche_effectif_salarie as string) || null,
    sirene_raw: entry,
    sirene_synced_at: new Date().toISOString(),
    // Si l'établissement est cessé côté INSEE, on désactive le compte.
    // On ne force pas la désactivation ici (geste admin), mais on flag dans notes.
    administrativeStatus: (siege?.etat_administratif as string) ?? null,
  };
}

Deno.serve(
  createHandler(
    {
      name: "reconcile-b2b-sirene",
      auth: "admin-or-secret",
      rateLimit: { prefix: "reconcile-b2b-sirene", max: 3, windowMs: 60_000 },
    },
    async ({ supabaseAdmin, body }) => {
      const params = (body ?? {}) as Body;
      const staleDays = params.stale_days ?? DEFAULT_STALE_DAYS;
      const limit = Math.min(params.limit ?? DEFAULT_LIMIT, 500);

      const staleThreshold = new Date(Date.now() - staleDays * 24 * 60 * 60 * 1000).toISOString();

      // Sélectionne les comptes avec SIRET, jamais sync ou sync périmée.
      const { data: accounts, error: fetchError } = await supabaseAdmin
        .from("b2b_accounts")
        .select("id, siret, sirene_synced_at")
        .not("siret", "is", null)
        .or(`sirene_synced_at.is.null,sirene_synced_at.lt.${staleThreshold}`)
        .limit(limit);

      if (fetchError) {
        throw new Error(`DB error: ${fetchError.message}`);
      }

      const list = (accounts ?? []).filter(
        (a: Record<string, unknown>) => /^\d{14}$/.test((a.siret as string).replace(/\s/g, "")),
      ) as unknown as Account[];

      let updated = 0;
      let notFound = 0;
      let errors = 0;
      const ceased: string[] = [];

      for (let i = 0; i < list.length; i++) {
        const account = list[i];
        const siret = account.siret.replace(/\s/g, "");

        try {
          const entry = await fetchSirene(siret);
          if (!entry) {
            notFound++;
          } else {
            const fields = extractSireneFields(entry);
            const { administrativeStatus, ...dbFields } = fields;
            if (administrativeStatus === "C") ceased.push(account.id);

            const { error: updateError } = await supabaseAdmin
              .from("b2b_accounts")
              .update({
                ...dbFields,
                updated_at: new Date().toISOString(),
              })
              .eq("id", account.id);
            if (updateError) {
              errors++;
            } else {
              updated++;
            }
          }
        } catch {
          errors++;
        }

        // Respect du plafond 7 req/s
        if (i < list.length - 1) await sleep(REQ_SPACING_MS);
      }

      // Log dans import_logs pour traçabilité (table partagée avec les imports fournisseurs)
      try {
        await supabaseAdmin.from("import_logs").insert({
          supplier: "data_gouv_b2b",
          operation: "reconcile_sirene",
          status: errors > 0 ? "partial" : "success",
          rows_total: list.length,
          rows_success: updated,
          rows_error: errors,
          details: {
            not_found: notFound,
            ceased_ids: ceased,
            stale_days: staleDays,
          },
        });
      } catch {
        // import_logs peut avoir un schéma différent — best effort
      }

      return {
        success: true,
        total: list.length,
        updated,
        not_found: notFound,
        errors,
        ceased_count: ceased.length,
      };
    },
  ),
);
