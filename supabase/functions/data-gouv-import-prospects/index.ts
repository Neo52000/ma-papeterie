// ─────────────────────────────────────────────────────────────────────────────
// Import de prospects — data.gouv.fr (upsert par SIREN + scoring + enrollment)
// ─────────────────────────────────────────────────────────────────────────────
// Prend les résultats d'une recherche data.gouv (ou un tableau de SIREN déjà
// sélectionnés) et upsert en masse dans `prospects`. Skippe les entreprises
// qui existent déjà comme clients (b2b_accounts.siren). Optionnel : inscrit
// tous les nouveaux prospects dans une campaign_id.
//
// Body : {
//   entities: SireneEntity[],      // retour de data-gouv-search-prospects
//   campaign_id?: string,          // enrôler dans une campagne
//   assigned_to?: string,          // user_id commercial
//   cap?: number,                  // limite d'import (default 500)
// }

import { createHandler, jsonResponse } from "../_shared/handler.ts";
import type { SupabaseClient } from "https://esm.sh/@supabase/supabase-js@2";

// ── Types ────────────────────────────────────────────────────────────────────

interface EntityAddress {
  street: string;
  zip: string;
  city: string;
  dept: string | null;
  codeCommune: string | null;
}

interface SireneEntity {
  siren: string;
  siret: string;
  name: string;
  nafCode: string | null;
  nafLabel: string | null;
  legalForm: string | null;
  employeeRange: string | null;
  foundedDate: string | null;
  address: EntityAddress;
  administrativeStatus: "A" | "C" | null;
  raw: unknown;
}

interface ImportBody {
  entities?: SireneEntity[];
  campaign_id?: string;
  assigned_to?: string;
  cap?: number;
}

interface ScoringResult {
  score: number;
  segment: "educational" | "public" | "liberal" | "pme";
}

// ── NAF → Segment (duplicat compact de src/lib/nafToSegment.ts) ─────────────

const SEGMENT_EXACT: Record<string, ScoringResult["segment"]> = {
  "85.10Z": "educational", "85.20Z": "educational", "85.31Z": "educational",
  "85.32Z": "educational", "85.41Z": "educational", "85.42Z": "educational",
  "85.51Z": "educational", "85.52Z": "educational", "85.53Z": "educational",
  "85.59A": "educational", "85.59B": "educational", "85.60Z": "educational",
  "88.91A": "educational", "88.91B": "educational",
  "84.11Z": "public", "84.12Z": "public", "84.13Z": "public",
  "84.21Z": "public", "84.22Z": "public", "84.23Z": "public",
  "84.24Z": "public", "84.25Z": "public", "84.30A": "public",
  "87.10A": "public", "87.10B": "public", "87.30A": "public",
  "69.10Z": "liberal", "69.20Z": "liberal", "71.11Z": "liberal",
  "71.12A": "liberal", "71.12B": "liberal", "86.21Z": "liberal",
  "86.22A": "liberal", "86.22B": "liberal", "86.22C": "liberal",
  "86.23Z": "liberal", "86.90E": "liberal",
};

const SEGMENT_DIVISION: Record<string, ScoringResult["segment"]> = {
  "85": "educational", "84": "public", "86": "liberal", "87": "public",
  "69": "liberal", "70": "liberal", "71": "liberal", "72": "liberal",
  "73": "liberal", "74": "liberal", "75": "liberal",
};

function nafToSegment(naf: string | null): ScoringResult["segment"] {
  if (!naf) return "pme";
  const norm = naf.trim().toUpperCase();
  return SEGMENT_EXACT[norm] ?? SEGMENT_DIVISION[norm.slice(0, 2)] ?? "pme";
}

// ── Scoring (duplicat compact de src/lib/prospectScoring.ts) ────────────────

const SEGMENT_PTS: Record<ScoringResult["segment"], number> = {
  educational: 40, public: 35, liberal: 25, pme: 15,
};
const EFFECTIF_PTS: Record<string, number> = {
  "NN": 0, "00": 3, "01": 5, "02": 8, "03": 12, "11": 16, "12": 20,
  "21": 24, "22": 26, "31": 28, "32": 29, "41": 30, "42": 30,
  "51": 30, "52": 30, "53": 30,
};
const DEPT_PTS: Record<string, number> = {
  "52": 15, "10": 12, "51": 12, "55": 10, "88": 10, "70": 10,
  "21": 8, "54": 6, "57": 6, "67": 5, "68": 5, "08": 5,
};

function seniorityPts(date: string | null): number {
  if (!date) return 0;
  const t = Date.parse(date);
  if (Number.isNaN(t)) return 0;
  const years = (Date.now() - t) / (365.25 * 24 * 60 * 60 * 1000);
  if (years < 0.5) return 2;
  if (years < 1) return 5;
  if (years < 3) return 8;
  if (years < 5) return 12;
  return 15;
}

function computeScore(entity: SireneEntity): ScoringResult {
  const segment = nafToSegment(entity.nafCode);
  const segPts = SEGMENT_PTS[segment];
  const empPts = entity.employeeRange ? EFFECTIF_PTS[entity.employeeRange.toUpperCase()] ?? 0 : 0;
  const seniorPts = seniorityPts(entity.foundedDate);
  const geoPts = entity.address.dept ? DEPT_PTS[entity.address.dept] ?? 2 : 0;
  return {
    segment,
    score: Math.max(0, Math.min(100, segPts + empPts + seniorPts + geoPts)),
  };
}

// ── Import core ──────────────────────────────────────────────────────────────

interface ImportResult {
  total_received: number;
  imported: number;
  updated: number;
  skipped_existing_client: number;
  skipped_invalid: number;
  enrolled: number;
  errors: number;
  prospect_ids: string[];
}

async function fetchExistingClientSirens(
  supabase: SupabaseClient,
  sirens: string[],
): Promise<Set<string>> {
  if (sirens.length === 0) return new Set();
  const { data } = await supabase
    .from("b2b_accounts")
    .select("siren")
    .in("siren", sirens);
  return new Set((data ?? []).map((r: { siren: string | null }) => r.siren).filter(Boolean) as string[]);
}

async function importProspects(
  supabase: SupabaseClient,
  entities: SireneEntity[],
  userId: string | undefined,
  assignedTo: string | undefined,
  campaignId: string | undefined,
): Promise<ImportResult> {
  const result: ImportResult = {
    total_received: entities.length,
    imported: 0,
    updated: 0,
    skipped_existing_client: 0,
    skipped_invalid: 0,
    enrolled: 0,
    errors: 0,
    prospect_ids: [],
  };

  const validEntities = entities.filter((e) => e.siren && e.name);
  result.skipped_invalid = entities.length - validEntities.length;

  // Exclure les entreprises déjà clientes
  const existingSirens = await fetchExistingClientSirens(
    supabase,
    validEntities.map((e) => e.siren),
  );
  const toImport = validEntities.filter((e) => {
    if (existingSirens.has(e.siren)) {
      result.skipped_existing_client++;
      return false;
    }
    return true;
  });

  // Quels prospects existent déjà (pour stats updated vs imported) ?
  let existingProspectIds = new Map<string, string>();
  if (toImport.length > 0) {
    const { data: existing } = await supabase
      .from("prospects")
      .select("id, siren")
      .in("siren", toImport.map((e) => e.siren));
    existingProspectIds = new Map(
      (existing ?? []).map((p: { id: string; siren: string }) => [p.siren, p.id]),
    );
  }

  // Upsert par batch de 50 (limite du client Supabase)
  const rows = toImport.map((entity) => {
    const { segment, score } = computeScore(entity);
    return {
      siren: entity.siren,
      siret: entity.siret,
      name: entity.name,
      legal_form: entity.legalForm,
      naf_code: entity.nafCode,
      naf_label: entity.nafLabel,
      employee_range: entity.employeeRange,
      founded_date: entity.foundedDate,
      address: {
        street: entity.address.street,
        zip: entity.address.zip,
        city: entity.address.city,
        dept: entity.address.dept,
        code_commune: entity.address.codeCommune,
      },
      status: entity.administrativeStatus === "C" ? "unreachable" : "new",
      score,
      client_segment: segment,
      assigned_to: assignedTo ?? null,
      source: "data_gouv",
      sirene_raw: entity.raw,
      sirene_synced_at: new Date().toISOString(),
      tags: entity.administrativeStatus === "C" ? ["radiee"] : [],
    };
  });

  for (let i = 0; i < rows.length; i += 50) {
    const batch = rows.slice(i, i + 50);
    const { data, error } = await supabase
      .from("prospects")
      .upsert(batch, { onConflict: "siren" })
      .select("id, siren");

    if (error) {
      console.error(`[data-gouv-import-prospects] Batch upsert error: ${error.message}`);
      result.errors += batch.length;
      continue;
    }

    for (const row of data ?? []) {
      result.prospect_ids.push(row.id);
      if (existingProspectIds.has(row.siren)) {
        result.updated++;
      } else {
        result.imported++;
      }
    }
  }

  // Enrollment dans une campagne
  if (campaignId && result.prospect_ids.length > 0) {
    const enrollmentRows = result.prospect_ids.map((id) => ({
      prospect_id: id,
      campaign_id: campaignId,
      enrolled_at: new Date().toISOString(),
    }));
    const { error: enrolError } = await supabase
      .from("prospect_enrollments")
      .upsert(enrollmentRows, { onConflict: "prospect_id,campaign_id" });
    if (!enrolError) {
      result.enrolled = enrollmentRows.length;
    }
  }

  // Log dans import_logs si la table existe (best-effort)
  try {
    await supabase.from("import_logs").insert({
      supplier: "data_gouv_prospects",
      operation: "import",
      status: result.errors > 0 ? "partial" : "success",
      error_message: null,
      metadata: {
        total_received: result.total_received,
        imported: result.imported,
        updated: result.updated,
        skipped_existing_client: result.skipped_existing_client,
        enrolled: result.enrolled,
        triggered_by: userId ?? null,
      },
    } as never);
  } catch {
    // import_logs schema peut varier — on ignore les erreurs
  }

  return result;
}

// ── Handler ──────────────────────────────────────────────────────────────────

Deno.serve(
  createHandler(
    {
      name: "data-gouv-import-prospects",
      auth: "admin-or-secret",
      rateLimit: { prefix: "data-gouv-import", max: 10, windowMs: 60_000 },
    },
    async ({ supabaseAdmin, body, userId, corsHeaders }) => {
      const params = (body ?? {}) as ImportBody;

      if (!Array.isArray(params.entities) || params.entities.length === 0) {
        return jsonResponse(
          { error: "Le champ `entities` est requis et doit être un tableau non vide." },
          400,
          corsHeaders,
        );
      }

      const cap = Math.min(params.cap ?? 500, 500);
      const entities = params.entities.slice(0, cap);

      const result = await importProspects(
        supabaseAdmin,
        entities,
        userId,
        params.assigned_to,
        params.campaign_id,
      );

      return { success: true, ...result };
    },
  ),
);
