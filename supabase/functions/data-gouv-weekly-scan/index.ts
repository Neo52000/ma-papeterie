// ─────────────────────────────────────────────────────────────────────────────
// Scan hebdomadaire data.gouv — nouvelles créations + radiations
// ─────────────────────────────────────────────────────────────────────────────
// Cron lundi 06:00 UTC (déclenché via GitHub Action) :
//   1. Pour chaque département cible (par défaut [52, 10, 51, 55, 88]) et
//      chaque segment d'intérêt (educational, public, liberal), fetch les
//      entreprises créées dans les N derniers jours (default 7) et upsert
//      dans prospects avec score + tag 'nouvelle_creation'.
//   2. Pour chaque prospect existant dont sirene_synced_at > 30j OU statut non
//      'converted', re-check via SIREN : si état administratif = 'C', marque
//      status='unreachable' + tag 'radiee'.
//
// Body : {
//   depts?: string[],
//   segments?: ('educational'|'public'|'liberal'|'pme')[],
//   new_since_days?: number,
//   resync_stale_days?: number,
//   limit_per_segment?: number,
// }

import { createHandler } from "../_shared/handler.ts";
import type { SupabaseClient } from "https://esm.sh/@supabase/supabase-js@2";

const API_BASE = "https://recherche-entreprises.api.gouv.fr/search";
const REQ_SPACING_MS = 150;
const FETCH_TIMEOUT_MS = 10_000;

// Presets NAF par segment (duplicat compact de src/lib/nafToSegment.ts)
const SEGMENT_NAF: Record<string, string[]> = {
  educational: ["85.10Z", "85.20Z", "85.31Z", "85.32Z", "85.59A", "88.91A", "88.91B"],
  public:      ["84.11Z", "84.12Z", "87.10A", "87.30A"],
  liberal:     ["69.10Z", "69.20Z", "71.11Z", "71.12A", "86.21Z", "86.22B", "86.23Z"],
  pme:         [], // pas de preset, on s'appuie sur le filtre département
};

const DEFAULT_DEPTS = ["52", "10", "51", "55", "88"];
const DEFAULT_NEW_SINCE_DAYS = 7;
const DEFAULT_RESYNC_STALE_DAYS = 30;
const DEFAULT_LIMIT_PER_SEGMENT = 50;

interface Body {
  depts?: string[];
  segments?: string[];
  new_since_days?: number;
  resync_stale_days?: number;
  limit_per_segment?: number;
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function fetchPage(url: string): Promise<Record<string, unknown> | null> {
  for (let attempt = 0; attempt < 2; attempt++) {
    try {
      const res = await fetch(url, {
        headers: { Accept: "application/json", "User-Agent": "ma-papeterie-weekly-scan/1.0" },
        signal: AbortSignal.timeout(FETCH_TIMEOUT_MS),
      });
      if (res.status === 429 && attempt === 0) {
        await sleep(2000);
        continue;
      }
      if (!res.ok) return null;
      return (await res.json()) as Record<string, unknown>;
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

// ── Scoring inline (identique aux autres edge functions) ────────────────────

const SEGMENT_PTS: Record<string, number> = {
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

function computeScore(segment: string, employeeRange: string | null, foundedDate: string | null, dept: string | null): number {
  const segPts = SEGMENT_PTS[segment] ?? 15;
  const empPts = employeeRange ? EFFECTIF_PTS[employeeRange.toUpperCase()] ?? 0 : 0;
  const seniorPts = seniorityPts(foundedDate);
  const geoPts = dept ? DEPT_PTS[dept] ?? 2 : 0;
  return Math.max(0, Math.min(100, segPts + empPts + seniorPts + geoPts));
}

// ── Étape 1 : nouvelles créations ───────────────────────────────────────────

interface NewCreationsResult {
  inserted: number;
  updated: number;
  errors: number;
}

async function scanNewCreations(
  supabase: SupabaseClient,
  depts: string[],
  segments: string[],
  sinceDate: string,
  limitPerSegment: number,
): Promise<NewCreationsResult> {
  const result: NewCreationsResult = { inserted: 0, updated: 0, errors: 0 };
  const nafSet = new Set<string>();
  for (const seg of segments) {
    for (const naf of SEGMENT_NAF[seg] ?? []) nafSet.add(naf);
  }

  for (const dept of depts) {
    const params = new URLSearchParams();
    params.set("q", "*");
    params.set("departement", dept);
    params.set("date_creation_min", sinceDate);
    params.set("per_page", String(Math.min(limitPerSegment, 25)));
    params.set("matching_etablissements", "1");
    if (nafSet.size > 0) {
      params.set("activite_principale", Array.from(nafSet).join(","));
    }

    const raw = await fetchPage(`${API_BASE}?${params.toString()}`);
    await sleep(REQ_SPACING_MS);
    if (!raw) {
      result.errors++;
      continue;
    }

    const entries = (raw.results as Array<Record<string, unknown>> | undefined) ?? [];
    if (entries.length === 0) continue;

    const rows = entries.map((e) => {
      const siren = e.siren as string;
      const siege = e.siege as Record<string, unknown> | undefined;
      const nafCode = (e.activite_principale as string) || null;
      const zip = (siege?.code_postal as string) || "";
      const entryDept = zip.length >= 2 ? zip.slice(0, 2) : null;
      const segment = (() => {
        if (!nafCode) return "pme";
        const norm = nafCode.toUpperCase();
        for (const [seg, list] of Object.entries(SEGMENT_NAF)) {
          if (list.includes(norm)) return seg;
        }
        return "pme";
      })();
      const employeeRange = (e.tranche_effectif_salarie as string) || null;
      const foundedDate = (e.date_creation as string) || null;

      return {
        siren,
        siret: (siege?.siret as string) || `${siren}00001`,
        name: (e.nom_complet as string) || (e.nom_raison_sociale as string) || "",
        legal_form: (e.nature_juridique as string) || null,
        naf_code: nafCode,
        naf_label: (e.libelle_activite_principale as string) || null,
        employee_range: employeeRange,
        founded_date: foundedDate,
        address: {
          street: [
            siege?.numero_voie, siege?.type_voie, siege?.libelle_voie,
          ].filter(Boolean).join(" "),
          zip,
          city: (siege?.libelle_commune as string) || "",
          dept: entryDept,
          code_commune: (siege?.commune as string) || null,
        },
        status: "new",
        score: computeScore(segment, employeeRange, foundedDate, entryDept),
        client_segment: segment,
        source: "data_gouv",
        sirene_raw: e,
        sirene_synced_at: new Date().toISOString(),
        tags: ["nouvelle_creation"],
      };
    }).filter((r) => r.name && r.siren);

    if (rows.length === 0) continue;

    const { data: existing } = await supabase
      .from("prospects")
      .select("siren")
      .in("siren", rows.map((r) => r.siren));
    const existingSet = new Set((existing ?? []).map((r: { siren: string }) => r.siren));

    const { error } = await supabase
      .from("prospects")
      .upsert(rows, { onConflict: "siren" });

    if (error) {
      result.errors += rows.length;
    } else {
      for (const r of rows) {
        if (existingSet.has(r.siren)) result.updated++;
        else result.inserted++;
      }
    }
  }

  return result;
}

// ── Étape 2 : détection radiations ──────────────────────────────────────────

interface RadiationScanResult {
  checked: number;
  radiated: number;
  errors: number;
  radiated_ids: string[];
}

async function scanRadiations(
  supabase: SupabaseClient,
  staleDays: number,
  cap: number = 100,
): Promise<RadiationScanResult> {
  const result: RadiationScanResult = { checked: 0, radiated: 0, errors: 0, radiated_ids: [] };

  const staleThreshold = new Date(Date.now() - staleDays * 24 * 60 * 60 * 1000).toISOString();

  const { data: stale } = await supabase
    .from("prospects")
    .select("id, siren")
    .neq("status", "converted")
    .neq("status", "unreachable")
    .or(`sirene_synced_at.is.null,sirene_synced_at.lt.${staleThreshold}`)
    .limit(cap);

  const rows = (stale ?? []) as Array<{ id: string; siren: string }>;

  for (const row of rows) {
    const params = new URLSearchParams();
    params.set("q", row.siren);
    params.set("per_page", "1");
    const raw = await fetchPage(`${API_BASE}?${params.toString()}`);
    await sleep(REQ_SPACING_MS);

    if (!raw) {
      result.errors++;
      continue;
    }
    const entry = (raw.results as Array<Record<string, unknown>> | undefined)?.[0];
    if (!entry) {
      result.errors++;
      continue;
    }

    result.checked++;
    const siege = entry.siege as Record<string, unknown> | undefined;
    const status = (siege?.etat_administratif as string) ?? (entry.etat_administratif as string);

    if (status === "C") {
      // Marque radié
      const { data: current } = await supabase
        .from("prospects")
        .select("tags")
        .eq("id", row.id)
        .single();
      const currentTags = ((current?.tags as string[]) ?? []).filter((t) => t !== "radiee");
      await supabase
        .from("prospects")
        .update({
          status: "unreachable",
          tags: [...currentTags, "radiee"],
          sirene_synced_at: new Date().toISOString(),
        })
        .eq("id", row.id);
      result.radiated++;
      result.radiated_ids.push(row.id);
    } else {
      // Simple refresh timestamp
      await supabase
        .from("prospects")
        .update({ sirene_synced_at: new Date().toISOString(), sirene_raw: entry })
        .eq("id", row.id);
    }
  }

  return result;
}

// ── Handler ──────────────────────────────────────────────────────────────────

Deno.serve(
  createHandler(
    {
      name: "data-gouv-weekly-scan",
      auth: "admin-or-secret",
      rateLimit: { prefix: "data-gouv-scan", max: 3, windowMs: 60_000 },
    },
    async ({ supabaseAdmin, body }) => {
      const params = (body ?? {}) as Body;
      const depts = params.depts ?? DEFAULT_DEPTS;
      const segments = params.segments ?? ["educational", "public", "liberal"];
      const newSinceDays = params.new_since_days ?? DEFAULT_NEW_SINCE_DAYS;
      const resyncStaleDays = params.resync_stale_days ?? DEFAULT_RESYNC_STALE_DAYS;
      const limitPerSegment = params.limit_per_segment ?? DEFAULT_LIMIT_PER_SEGMENT;

      const sinceDate = new Date(Date.now() - newSinceDays * 24 * 60 * 60 * 1000)
        .toISOString().slice(0, 10);

      const newCreations = await scanNewCreations(
        supabaseAdmin, depts, segments, sinceDate, limitPerSegment,
      );
      const radiations = await scanRadiations(supabaseAdmin, resyncStaleDays);

      // Log dans import_logs (best-effort)
      try {
        await supabaseAdmin.from("import_logs").insert({
          supplier: "data_gouv_prospects",
          operation: "weekly_scan",
          status: (newCreations.errors + radiations.errors) > 0 ? "partial" : "success",
          rows_total: newCreations.inserted + newCreations.updated + radiations.checked,
          rows_success: newCreations.inserted + newCreations.updated + radiations.radiated,
          rows_error: newCreations.errors + radiations.errors,
          details: {
            new_creations: newCreations,
            radiations,
            params: { depts, segments, newSinceDays, resyncStaleDays },
          },
        } as never);
      } catch {
        // Schema peut varier
      }

      return {
        success: true,
        new_creations: newCreations,
        radiations,
        params: { depts, segments, newSinceDays, resyncStaleDays },
      };
    },
  ),
);
