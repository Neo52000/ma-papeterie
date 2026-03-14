/**
 * Helpers partagés pour les imports fournisseurs (Alkor, Comlandi, Softcarrier).
 * Centralise les fonctions communes pour éviter la duplication de code.
 */

// ─── Parsing helpers ───

/** Parse un nombre depuis une chaîne (supporte le format européen 1.234,56) */
export function parseNum(val?: string | null): number {
  if (!val || val.trim() === "" || val === "N/D") return 0;
  const s = val.trim();
  // Format européen : 1.234,56 → 1234.56
  if (s.includes(",") && s.includes(".")) {
    return parseFloat(s.replace(/\./g, "").replace(",", ".")) || 0;
  }
  // Virgule comme séparateur décimal
  if (s.includes(",")) {
    return parseFloat(s.replace(",", ".")) || 0;
  }
  return parseFloat(s) || 0;
}

/** Nettoie une chaîne : retourne null si vide ou "N/D" */
export function cleanStr(val?: string | null): string | null {
  if (!val || val.trim() === "" || val === "N/D") return null;
  return val.trim();
}

// ─── Supplier resolution ───

/** Résout l'ID d'un fournisseur par nom (recherche ILIKE) */
export async function resolveSupplier(
  supabase: any,
  name: string,
): Promise<string | null> {
  try {
    const { data } = await supabase
      .from("suppliers")
      .select("id")
      .ilike("name", `%${name}%`)
      .eq("is_active", true)
      .limit(1)
      .maybeSingle();
    return data?.id ?? null;
  } catch {
    return null;
  }
}

// ─── Batch EAN lookup ───

/** Charge en batch les produits existants par EAN (évite N requêtes individuelles) */
export async function batchEanLookup(
  supabase: any,
  eans: string[],
  selectFields = "id, ean",
): Promise<Map<string, any>> {
  const uniqueEans = [...new Set(eans.filter(Boolean))];
  const result = new Map<string, any>();
  if (uniqueEans.length === 0) return result;

  const CHUNK = 500;
  for (let i = 0; i < uniqueEans.length; i += CHUNK) {
    const chunk = uniqueEans.slice(i, i + CHUNK);
    const { data } = await supabase
      .from("products")
      .select(selectFields)
      .in("ean", chunk);
    for (const p of data || []) {
      if (p.ean) result.set(p.ean, p);
    }
  }
  return result;
}

// ─── Price history ───

export interface PriceHistoryEntry {
  product_id: string;
  changed_by: string;
  supplier_id: string | null;
  old_cost_price: number | null;
  new_cost_price: number | null;
  old_price_ht: number | null;
  new_price_ht: number | null;
  old_price_ttc: number | null;
  new_price_ttc: number | null;
  change_reason: string;
}

/** Construit une entrée d'historique de prix si les prix ont changé */
export function buildPriceHistoryEntry(
  productId: string,
  changedBy: string,
  supplierId: string | null,
  oldPrices: { price_ht?: number | null; price_ttc?: number | null; cost_price?: number | null },
  newPrices: { price_ht: number; price_ttc: number; cost_price?: number | null },
  reason: string,
): PriceHistoryEntry | null {
  const changed =
    oldPrices.price_ht !== newPrices.price_ht ||
    oldPrices.price_ttc !== newPrices.price_ttc;
  if (!changed) return null;

  return {
    product_id: productId,
    changed_by: changedBy,
    supplier_id: supplierId,
    old_cost_price: oldPrices.cost_price ?? null,
    new_cost_price: newPrices.cost_price ?? null,
    old_price_ht: oldPrices.price_ht ?? null,
    new_price_ht: newPrices.price_ht,
    old_price_ttc: oldPrices.price_ttc ?? null,
    new_price_ttc: newPrices.price_ttc,
    change_reason: reason,
  };
}

// ─── Batch flush ───

const MAX_WARNINGS = 50;

export interface WarningState {
  total: number;
  list: string[];
}

export function pushWarning(state: WarningState | undefined, message: string) {
  if (!state) return;
  state.total += 1;
  if (state.list.length < MAX_WARNINGS) {
    state.list.push(message);
  }
}

export function createWarningState(): WarningState {
  return { total: 0, list: [] };
}

export interface FlushBatchOptions {
  onConflict?: string;
  ignoreDuplicates?: boolean;
  warningState?: WarningState;
  label?: string;
}

export interface FlushBatchStats {
  attempted: number;
  failed: number;
}

/** Flush un tableau d'objets vers une table Supabase par chunks */
export async function flushBatch(
  supabase: any,
  table: string,
  batch: any[],
  options: FlushBatchOptions = {},
): Promise<FlushBatchStats> {
  const stats: FlushBatchStats = { attempted: 0, failed: 0 };
  if (batch.length === 0) return stats;

  const CHUNK = 50;
  for (let i = 0; i < batch.length; i += CHUNK) {
    const chunk = batch.slice(i, i + CHUNK);
    const chunkNumber = Math.floor(i / CHUNK) + 1;
    stats.attempted += chunk.length;

    try {
      if (options.onConflict) {
        const { error } = await supabase.from(table).upsert(chunk, {
          onConflict: options.onConflict,
          ignoreDuplicates: options.ignoreDuplicates ?? false,
        });
        if (error) {
          stats.failed += chunk.length;
          pushWarning(
            options.warningState,
            `${options.label || table} chunk ${chunkNumber}: ${error.message}`,
          );
        }
      } else {
        const { error } = await supabase.from(table).insert(chunk);
        if (error) {
          stats.failed += chunk.length;
          pushWarning(
            options.warningState,
            `${options.label || table} chunk ${chunkNumber}: ${error.message}`,
          );
        }
      }
    } catch (err: any) {
      stats.failed += chunk.length;
      pushWarning(
        options.warningState,
        `${options.label || table} chunk ${chunkNumber}: ${err?.message || String(err)}`,
      );
    }
  }

  return stats;
}

// ─── Retry with exponential backoff ───

/** Exécute une fonction avec retry et backoff exponentiel */
export async function withRetry<T>(
  fn: () => Promise<T>,
  maxRetries = 3,
  baseDelayMs = 2000,
): Promise<T> {
  let lastError: any;
  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      return await fn();
    } catch (err) {
      lastError = err;
      if (attempt < maxRetries) {
        const delay = baseDelayMs * Math.pow(2, attempt);
        await new Promise((resolve) => setTimeout(resolve, delay));
      }
    }
  }
  throw lastError;
}

// ─── Ghost offer cleanup ───

/** Désactive les offres fournisseur fantômes (non vues depuis X jours) */
export async function deactivateGhostOffers(
  supabase: any,
  supplierName: string,
  settingKey: string,
  defaultDays = 7,
): Promise<void> {
  try {
    const { data: ghostSetting } = await supabase
      .from("app_settings")
      .select("value")
      .eq("key", settingKey)
      .maybeSingle();
    const ghostDays = Number(ghostSetting?.value ?? defaultDays);
    await supabase
      .from("supplier_offers")
      .update({ is_active: false })
      .eq("supplier", supplierName)
      .eq("is_active", true)
      .lt(
        "last_seen_at",
        new Date(Date.now() - ghostDays * 24 * 60 * 60 * 1000).toISOString(),
      );
  } catch {
    /* non-bloquant */
  }
}

// ─── Batch rollup recompute ───

/** Recompute les rollups produit pour un ensemble d'IDs */
export async function batchRecomputeRollups(
  supabase: any,
  productIds: string[],
): Promise<number> {
  if (productIds.length === 0) return 0;
  const ids = [...new Set(productIds)];

  try {
    const { data } = await supabase.rpc("recompute_product_rollups_batch", {
      p_product_ids: ids,
    });
    return data?.processed || ids.length;
  } catch {
    // Fallback : appels individuels par chunks
    let processed = 0;
    const CHUNK = 50;
    for (let i = 0; i < ids.length; i += CHUNK) {
      const chunk = ids.slice(i, i + CHUNK);
      await Promise.allSettled(
        chunk.map((pid) =>
          supabase.rpc("recompute_product_rollups", { p_product_id: pid })
        ),
      );
      processed += chunk.length;
    }
    return processed;
  }
}

// ─── Category mapping ───

/** Résout la catégorie interne via supplier_category_mappings */
export async function resolveCategory(
  supabase: any,
  supplierId: string | null,
  supplierCategory: string | null,
  supplierSubcategory: string | null,
): Promise<string | null> {
  if (!supplierCategory) return null;

  try {
    // 1. Chercher un mapping vérifié exact
    let query = supabase
      .from("supplier_category_mappings")
      .select("category_id")
      .eq("supplier_category_name", supplierCategory)
      .eq("is_verified", true)
      .limit(1);

    if (supplierId) {
      query = query.eq("supplier_id", supplierId);
    }
    if (supplierSubcategory) {
      query = query.eq("supplier_subcategory_name", supplierSubcategory);
    }

    const { data: verified } = await query.maybeSingle();
    if (verified?.category_id) return verified.category_id;

    // 2. Chercher un mapping non vérifié
    let query2 = supabase
      .from("supplier_category_mappings")
      .select("category_id")
      .eq("supplier_category_name", supplierCategory)
      .limit(1);

    if (supplierId) {
      query2 = query2.eq("supplier_id", supplierId);
    }

    const { data: unverified } = await query2.maybeSingle();
    if (unverified?.category_id) return unverified.category_id;

    // 3. Chercher par nom dans la table categories
    const { data: byName } = await supabase
      .from("categories")
      .select("id")
      .ilike("name", supplierCategory)
      .eq("is_active", true)
      .limit(1)
      .maybeSingle();

    return byName?.id ?? null;
  } catch {
    return null;
  }
}

/** Crée un mapping non vérifié si aucun n'existe */
export async function createUnverifiedMapping(
  supabase: any,
  supplierId: string,
  supplierCategoryName: string,
  supplierSubcategoryName: string | null,
  categoryId: string,
): Promise<void> {
  try {
    await supabase.from("supplier_category_mappings").upsert(
      {
        supplier_id: supplierId,
        supplier_category_name: supplierCategoryName,
        supplier_subcategory_name: supplierSubcategoryName,
        category_id: categoryId,
        is_verified: false,
      },
      {
        onConflict: "supplier_id,supplier_category_name,supplier_subcategory_name",
        ignoreDuplicates: true,
      },
    );
  } catch {
    /* non-bloquant */
  }
}

// ─── Import logging ───

/** Log un import dans supplier_import_logs */
export async function logImport(
  supabase: any,
  format: string,
  totalRows: number,
  result: { created: number; updated: number; errors: number; details: string[] },
  extra: Record<string, any> = {},
): Promise<void> {
  try {
    await supabase.from("supplier_import_logs").insert({
      format,
      total_rows: totalRows,
      success_count: result.created + result.updated,
      error_count: result.errors,
      errors: result.details.slice(0, 50),
      imported_at: new Date().toISOString(),
      ...extra,
    });
  } catch {
    /* non-bloquant */
  }
}

// ─── Dry-run result ───

export interface DryRunResult {
  would_create: number;
  would_update: number;
  would_skip: number;
  errors: number;
  sample_creates: Array<{ ean: string | null; name: string; ref: string | null }>;
  sample_updates: Array<{ ean: string | null; name: string; ref: string | null; changes: string[] }>;
  sample_errors: string[];
}

export function createDryRunResult(): DryRunResult {
  return {
    would_create: 0,
    would_update: 0,
    would_skip: 0,
    errors: 0,
    sample_creates: [],
    sample_updates: [],
    sample_errors: [],
  };
}
