// ── Recherche d'Entreprises (data.gouv.fr) — Proxy Edge Function ────────────
//
// Interroge l'API publique https://recherche-entreprises.api.gouv.fr/search
// et renvoie un payload aplati pour l'auto-complétion SIRET/nom côté client.
//
// Body : { query: string, mode: 'autocomplete' | 'siret' | 'siren', limit?: number }
//
// Particularités :
//   - Auth "none" : l'API est publique (données SIRENE), mais rate-limit strict.
//   - Cache interne 24h via table sirene_cache (évite de spammer data.gouv).
//   - Respect du plafond 7 req/s côté data.gouv (rate-limit 30/min/IP).

import { createHandler, jsonResponse } from "../_shared/handler.ts";
import type { SupabaseClient } from "https://esm.sh/@supabase/supabase-js@2";

// ── Types ────────────────────────────────────────────────────────────────────

type SearchMode = "autocomplete" | "siret" | "siren";

interface SearchBody {
  query?: string;
  mode?: SearchMode;
  limit?: number;
}

interface SireneAddress {
  street: string;
  zip: string;
  city: string;
  codeCommune: string | null;
}

interface SireneResult {
  siret: string;
  siren: string;
  name: string;
  nafCode: string | null;
  nafLabel: string | null;
  legalForm: string | null;
  foundedDate: string | null;
  employeeRange: string | null;
  address: SireneAddress;
  administrativeStatus: "A" | "C" | null; // A = actif, C = cessé
  raw: unknown;
}

// ── Constants ────────────────────────────────────────────────────────────────

const API_BASE = "https://recherche-entreprises.api.gouv.fr/search";
const CACHE_TTL_MS = 24 * 60 * 60 * 1000; // 24h
const FETCH_TIMEOUT_MS = 10_000;
const MAX_LIMIT = 10;

// ── Utilities ────────────────────────────────────────────────────────────────

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function cacheKey(mode: SearchMode, query: string, limit: number): string {
  return `${mode}:${query.toLowerCase().trim()}:${limit}`;
}

async function getFromCache(
  supabase: SupabaseClient,
  key: string,
): Promise<unknown | null> {
  const { data } = await supabase
    .from("sirene_cache")
    .select("response, expires_at")
    .eq("query_key", key)
    .maybeSingle();
  if (!data) return null;
  if (new Date(data.expires_at).getTime() < Date.now()) return null;
  return data.response;
}

async function putInCache(
  supabase: SupabaseClient,
  key: string,
  response: unknown,
): Promise<void> {
  const expiresAt = new Date(Date.now() + CACHE_TTL_MS).toISOString();
  await supabase
    .from("sirene_cache")
    .upsert(
      { query_key: key, response, expires_at: expiresAt },
      { onConflict: "query_key" },
    );
}

// ── API data.gouv ────────────────────────────────────────────────────────────

async function callRechercheEntreprises(
  url: string,
): Promise<Record<string, unknown> | null> {
  for (let attempt = 0; attempt < 2; attempt++) {
    try {
      const res = await fetch(url, {
        headers: { Accept: "application/json", "User-Agent": "ma-papeterie/1.0" },
        signal: AbortSignal.timeout(FETCH_TIMEOUT_MS),
      });

      if (res.status === 429 && attempt === 0) {
        // Backoff 2s puis retry
        await sleep(2000);
        continue;
      }
      if (!res.ok) {
        console.warn(JSON.stringify({
          fn: "recherche-entreprises-search",
          event: "api_error",
          status: res.status,
          url,
        }));
        return null;
      }
      return (await res.json()) as Record<string, unknown>;
    } catch (err) {
      if (attempt === 0) {
        await sleep(2000);
        continue;
      }
      console.error(JSON.stringify({
        fn: "recherche-entreprises-search",
        event: "fetch_failed",
        error: err instanceof Error ? err.message : String(err),
      }));
      return null;
    }
  }
  return null;
}

// ── Aplatir la réponse API vers notre contrat SireneResult ──────────────────

function flattenResult(entry: Record<string, unknown>): SireneResult | null {
  const siren = entry.siren as string | undefined;
  if (!siren) return null;

  // Nom : nom_complet (personne morale) ou nom_raison_sociale ou concat prénom/nom
  const name =
    (entry.nom_complet as string) ||
    (entry.nom_raison_sociale as string) ||
    "";

  const nafCode = (entry.activite_principale as string) || null;
  // naf_libelle is provided via section_activite_principale or nature_juridique labels, but
  // the API exposes a human label under "libelle_activite_principale" in some deployments.
  const nafLabel =
    (entry.libelle_activite_principale as string) ||
    (entry.section_activite_principale as string) ||
    null;
  const legalForm = (entry.nature_juridique as string) || null;
  const foundedDate = (entry.date_creation as string) || null;
  const employeeRange = (entry.tranche_effectif_salarie as string) || null;

  // Établissement siège (source de l'adresse par défaut)
  const siege = entry.siege as Record<string, unknown> | undefined;
  const siret =
    (siege?.siret as string) ||
    `${siren}${String(entry.nic_siege ?? "").padStart(5, "0")}`;

  const address: SireneAddress = {
    street: [
      siege?.numero_voie,
      siege?.type_voie,
      siege?.libelle_voie,
    ]
      .filter((v): v is string => typeof v === "string" && v.length > 0)
      .join(" ") ||
      (siege?.adresse as string) ||
      "",
    zip: (siege?.code_postal as string) || "",
    city: (siege?.libelle_commune as string) || "",
    codeCommune: (siege?.commune as string) || null,
  };

  const administrativeStatus =
    (siege?.etat_administratif as "A" | "C" | undefined) ??
    (entry.etat_administratif as "A" | "C" | undefined) ??
    null;

  return {
    siret,
    siren,
    name,
    nafCode,
    nafLabel,
    legalForm,
    foundedDate,
    employeeRange,
    address,
    administrativeStatus,
    raw: entry,
  };
}

// ── Modes de recherche ───────────────────────────────────────────────────────

function buildSearchUrl(mode: SearchMode, query: string, limit: number): string {
  const params = new URLSearchParams();
  params.set("per_page", String(Math.min(limit, MAX_LIMIT)));

  if (mode === "siret") {
    // Recherche par SIRET → q=<siret> renvoie l'entreprise + matching_etablissements
    params.set("q", query);
    params.set("matching_etablissements", "1");
  } else if (mode === "siren") {
    params.set("q", query);
  } else {
    // autocomplete : recherche full-text par nom
    params.set("q", query);
  }
  return `${API_BASE}?${params.toString()}`;
}

// ── Handler ──────────────────────────────────────────────────────────────────

Deno.serve(
  createHandler(
    {
      name: "recherche-entreprises-search",
      auth: "none",
      rateLimit: { prefix: "recherche-entreprises", max: 30, windowMs: 60_000 },
    },
    async ({ supabaseAdmin, body, corsHeaders }) => {
      const params = (body ?? {}) as SearchBody;
      const query = (params.query ?? "").trim();
      const mode: SearchMode = params.mode ?? "autocomplete";
      const limit = Math.min(params.limit ?? 5, MAX_LIMIT);

      if (!query || query.length < 2) {
        return jsonResponse(
          { error: "Paramètre `query` requis (min. 2 caractères)." },
          400,
          corsHeaders,
        );
      }
      if (mode === "siret" && !/^\d{14}$/.test(query)) {
        return jsonResponse(
          { error: "Un SIRET valide (14 chiffres) est requis en mode `siret`." },
          400,
          corsHeaders,
        );
      }
      if (mode === "siren" && !/^\d{9}$/.test(query)) {
        return jsonResponse(
          { error: "Un SIREN valide (9 chiffres) est requis en mode `siren`." },
          400,
          corsHeaders,
        );
      }

      // 1. Cache
      const key = cacheKey(mode, query, limit);
      const cached = await getFromCache(supabaseAdmin, key);
      if (cached) {
        return { results: cached, cached: true };
      }

      // 2. Appel API data.gouv
      const url = buildSearchUrl(mode, query, limit);
      const raw = await callRechercheEntreprises(url);
      if (!raw) {
        return jsonResponse(
          { error: "API Recherche d'Entreprises indisponible. Réessayez dans un instant." },
          502,
          corsHeaders,
        );
      }

      const entries = (raw.results as Array<Record<string, unknown>> | undefined) ?? [];
      const results = entries
        .map(flattenResult)
        .filter((r): r is SireneResult => r !== null);

      // 3. Mise en cache (best-effort, ignore les erreurs)
      try {
        await putInCache(supabaseAdmin, key, results);
      } catch (err) {
        console.warn(JSON.stringify({
          fn: "recherche-entreprises-search",
          event: "cache_write_failed",
          error: err instanceof Error ? err.message : String(err),
        }));
      }

      return { results, cached: false };
    },
  ),
);
