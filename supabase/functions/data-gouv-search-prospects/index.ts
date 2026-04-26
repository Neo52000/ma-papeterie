// ─────────────────────────────────────────────────────────────────────────────
// Recherche de prospects — data.gouv.fr (filtres structurés)
// ─────────────────────────────────────────────────────────────────────────────
// Interroge l'API Recherche d'Entreprises avec des filtres avancés (multi-NAF,
// département, effectif, date de création) et retourne une preview paginée.
// L'admin/commercial choisit ensuite quels prospects importer via
// data-gouv-import-prospects.
//
// Body : {
//   nafCodes?: string[],
//   depts?: string[],
//   minEffectif?: string,   // code INSEE (ex: "11" pour 10-19)
//   maxEffectif?: string,
//   createdAfter?: string,  // ISO date
//   createdBefore?: string,
//   page?: number,
//   perPage?: number,       // cap 25
// }
//
// Réponse : {
//   results: SireneEntity[],
//   total: number,
//   page: number,
//   totalPages: number,
// }

import { createHandler, jsonResponse } from "../_shared/handler.ts";

// ── Types ────────────────────────────────────────────────────────────────────

interface SearchFilters {
  nafCodes?: string[];
  depts?: string[];
  minEffectif?: string;
  maxEffectif?: string;
  createdAfter?: string;
  createdBefore?: string;
  page?: number;
  perPage?: number;
}

interface SireneAddress {
  street: string;
  zip: string;
  city: string;
  dept: string | null;
  codeCommune: string | null;
}

export interface SireneEntity {
  siren: string;
  siret: string;
  name: string;
  nafCode: string | null;
  nafLabel: string | null;
  legalForm: string | null;
  employeeRange: string | null;
  foundedDate: string | null;
  address: SireneAddress;
  administrativeStatus: "A" | "C" | null;
  raw: unknown;
}

// ── Constants ────────────────────────────────────────────────────────────────

const API_BASE = "https://recherche-entreprises.api.gouv.fr/search";
const FETCH_TIMEOUT_MS = 10_000;
const MAX_PER_PAGE = 25;

// Ordre des codes INSEE d'effectif pour comparer min/max
const EFFECTIF_ORDER = [
  "NN","00","01","02","03","11","12","21","22","31","32","41","42","51","52","53",
];

// ── Utilities ────────────────────────────────────────────────────────────────

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function buildSearchUrl(filters: SearchFilters): string {
  const params = new URLSearchParams();
  const perPage = Math.min(filters.perPage ?? 10, MAX_PER_PAGE);
  params.set("per_page", String(perPage));
  params.set("page", String(Math.max(1, filters.page ?? 1)));

  // Filtres multi-valeurs : l'API attend des virgules
  if (filters.nafCodes?.length) {
    params.set("activite_principale", filters.nafCodes.join(","));
  }
  if (filters.depts?.length) {
    params.set("departement", filters.depts.join(","));
  }
  if (filters.minEffectif) {
    params.set("tranche_effectif_salarie_min", filters.minEffectif);
  }
  if (filters.maxEffectif) {
    params.set("tranche_effectif_salarie_max", filters.maxEffectif);
  }
  if (filters.createdAfter) {
    params.set("date_creation_min", filters.createdAfter);
  }
  if (filters.createdBefore) {
    params.set("date_creation_max", filters.createdBefore);
  }
  // Sans q=, l'API renvoie un 400. On met un wildcard accepté :
  params.set("q", "*");
  // On ne veut que les établissements siège (évite les doublons)
  params.set("matching_etablissements", "1");

  return `${API_BASE}?${params.toString()}`;
}

async function callApi(url: string): Promise<Record<string, unknown> | null> {
  for (let attempt = 0; attempt < 2; attempt++) {
    try {
      const res = await fetch(url, {
        headers: { Accept: "application/json", "User-Agent": "ma-papeterie/1.0" },
        signal: AbortSignal.timeout(FETCH_TIMEOUT_MS),
      });
      if (res.status === 429 && attempt === 0) {
        await sleep(2000);
        continue;
      }
      if (!res.ok) {
        console.warn(JSON.stringify({
          fn: "data-gouv-search-prospects",
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
        fn: "data-gouv-search-prospects",
        event: "fetch_failed",
        error: err instanceof Error ? err.message : String(err),
      }));
      return null;
    }
  }
  return null;
}

// ── Aplatir la réponse ───────────────────────────────────────────────────────

export function flattenEntity(entry: Record<string, unknown>): SireneEntity | null {
  const siren = entry.siren as string | undefined;
  if (!siren) return null;

  const name =
    (entry.nom_complet as string) ||
    (entry.nom_raison_sociale as string) ||
    "";

  const nafCode = (entry.activite_principale as string) || null;
  const nafLabel =
    (entry.libelle_activite_principale as string) ||
    (entry.section_activite_principale as string) ||
    null;
  const legalForm = (entry.nature_juridique as string) || null;
  const foundedDate = (entry.date_creation as string) || null;
  const employeeRange = (entry.tranche_effectif_salarie as string) || null;

  const siege = entry.siege as Record<string, unknown> | undefined;
  const siret =
    (siege?.siret as string) ||
    `${siren}${String(entry.nic_siege ?? "").padStart(5, "0")}`;

  const zip = (siege?.code_postal as string) || "";
  const dept = zip.length >= 2 ? zip.slice(0, 2) : null;

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
    zip,
    city: (siege?.libelle_commune as string) || "",
    dept,
    codeCommune: (siege?.commune as string) || null,
  };

  const administrativeStatus =
    (siege?.etat_administratif as "A" | "C" | undefined) ??
    (entry.etat_administratif as "A" | "C" | undefined) ??
    null;

  return {
    siren,
    siret,
    name,
    nafCode,
    nafLabel,
    legalForm,
    employeeRange,
    foundedDate,
    address,
    administrativeStatus,
    raw: entry,
  };
}

// ── Validation ───────────────────────────────────────────────────────────────

function validateFilters(filters: SearchFilters): string | null {
  if (filters.nafCodes && !Array.isArray(filters.nafCodes)) {
    return "`nafCodes` doit être un tableau.";
  }
  if (filters.nafCodes?.some((c) => !/^\d{2}\.\d{2}[A-Z]$/i.test(c))) {
    return "Chaque code NAF doit suivre le format 'XX.XXZ' (ex: '85.10Z').";
  }
  if (filters.depts?.some((d) => !/^\d{2,3}$/.test(d))) {
    return "Chaque département doit être 2-3 chiffres (ex: '52', '971').";
  }
  if (filters.minEffectif && !EFFECTIF_ORDER.includes(filters.minEffectif)) {
    return "`minEffectif` doit être un code INSEE valide (NN, 00, 01, 02, ...).";
  }
  if (filters.maxEffectif && !EFFECTIF_ORDER.includes(filters.maxEffectif)) {
    return "`maxEffectif` doit être un code INSEE valide.";
  }
  if (filters.createdAfter && !/^\d{4}-\d{2}-\d{2}$/.test(filters.createdAfter)) {
    return "`createdAfter` doit être au format YYYY-MM-DD.";
  }
  if (filters.createdBefore && !/^\d{4}-\d{2}-\d{2}$/.test(filters.createdBefore)) {
    return "`createdBefore` doit être au format YYYY-MM-DD.";
  }
  // Au moins un filtre pertinent pour éviter de ramener tout SIRENE
  const hasFilter = Boolean(
    filters.nafCodes?.length ||
    filters.depts?.length ||
    filters.createdAfter ||
    filters.createdBefore,
  );
  if (!hasFilter) {
    return "Au moins un filtre requis : nafCodes, depts, createdAfter ou createdBefore.";
  }
  return null;
}

// ── Handler ──────────────────────────────────────────────────────────────────

Deno.serve(
  createHandler(
    {
      name: "data-gouv-search-prospects",
      auth: "admin-or-secret",
      rateLimit: { prefix: "data-gouv-search", max: 30, windowMs: 60_000 },
    },
    async ({ body, corsHeaders }) => {
      const filters = (body ?? {}) as SearchFilters;

      const validationError = validateFilters(filters);
      if (validationError) {
        return jsonResponse({ error: validationError }, 400, corsHeaders);
      }

      const url = buildSearchUrl(filters);
      const raw = await callApi(url);
      if (!raw) {
        return jsonResponse(
          { error: "API Recherche d'Entreprises indisponible. Réessayez dans un instant." },
          502,
          corsHeaders,
        );
      }

      const entries = (raw.results as Array<Record<string, unknown>> | undefined) ?? [];
      const results = entries
        .map(flattenEntity)
        .filter((r): r is SireneEntity => r !== null);

      return {
        results,
        total: (raw.total_results as number) ?? results.length,
        page: (raw.page as number) ?? filters.page ?? 1,
        totalPages: (raw.total_pages as number) ?? 1,
      };
    },
  ),
);
