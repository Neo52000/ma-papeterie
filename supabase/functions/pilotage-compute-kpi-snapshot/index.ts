// =============================================================================
// Edge Function : pilotage-compute-kpi-snapshot
// (Renommée pour éviter la collision avec `compute-kpi-snapshot` pré-existante
//  qui calcule un snapshot hebdo via RPC SQL.)
// Appelée par pg_cron tous les jours à 23h30 Paris
// Calcule le snapshot KPI de la journée pour chaque canal (web_b2c, web_b2b, pos, all)
//
// Adaptations ma-papeterie.fr :
// - orders n'a pas total_ht/total_ttc : on dérive ca_ht = total_amount / 1.20 (TVA 20%)
//   et ca_ttc = total_amount (cf. choix A1)
// - orders n'a pas source_name : POS est récupéré depuis shopify_orders WHERE source_name='pos' (choix B1)
// - pas de table customers : B2B détecté via EXISTS sur b2b_accounts.email (choix C1)
// - order_items : quantity (pas qty), product_price TTC (pas price_ht)
// - cost_ht : récupéré via products.cost_price (pas stocké sur order_items)
// - orders.user_id remplace orders.customer_id
// =============================================================================

import { createClient, type SupabaseClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { corsHeaders } from '../_shared/cors.ts';

type Channel = 'web_b2c' | 'web_b2b' | 'pos' | 'all';

const TVA_RATE = 0.20;
// Si plus de ce ratio d'items n'a pas de cost_price, on logge un warning
// (le taux de marge devient trompeusement haut sur le reste).
const MISSING_COST_WARN_RATIO = 0.10;

// Interfaces locales — les Edge Functions Deno ne peuvent pas importer les types front.
// On duplique uniquement les colonnes consommées ici.
interface OrderItemLite {
  id: string;
  product_id: string | null;
  quantity: number | null;
  product_price: number | null;
}

interface OrderLite {
  id: string;
  created_at: string;
  total_amount: number | null;
  status: string | null;
  payment_status: string | null;
  user_id: string | null;
  customer_email: string | null;
  order_items: OrderItemLite[] | null;
}

interface ShopifyLineItemLite {
  variant_id?: number | string | null;
  quantity?: number | null;
}

interface ShopifyOrderLite {
  id: string;
  shopify_order_id: string;
  source_name: string | null;
  financial_status: string | null;
  total_price: number | null;
  subtotal_price: number | null;
  total_tax: number | null;
  customer_email: string | null;
  line_items: ShopifyLineItemLite[] | null;
  shopify_created_at: string | null;
}

interface SnapshotRow {
  snapshot_date: string;
  channel: Channel;
  ca_ht: number;
  ca_ttc: number;
  cogs_ht: number;
  marge_brute: number;
  taux_marge: number;
  nb_orders: number;
  nb_orders_paid: number;
  panier_moyen_ht: number;
  nb_customers_unique: number;
  nb_customers_new: number;
  nb_customers_returning: number;
  encaissements_ttc: number;
  creances_pendantes_ttc: number;
  nb_transactions_pos: number | null;
  ticket_moyen_pos_ttc: number | null;
  raw_data: Record<string, unknown>;
}

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });

  const startTime = Date.now();

  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    );

    let body: { target_date?: string } = {};
    try {
      body = await req.json();
    } catch {
      // body vide = OK, on prend aujourd'hui
    }

    const targetDate = body.target_date ?? new Date().toISOString().slice(0, 10);

    console.log(JSON.stringify({
      function: 'compute-kpi-snapshot',
      action: 'start',
      target_date: targetDate,
    }));

    const channels: Channel[] = ['web_b2c', 'web_b2b', 'pos', 'all'];
    const snapshots: SnapshotRow[] = [];

    for (const channel of channels) {
      const snapshot = await computeChannelSnapshot(supabase, targetDate, channel);
      snapshots.push(snapshot);
    }

    const { error: upsertError } = await supabase
      .from('pilotage_snapshots')
      .upsert(snapshots, { onConflict: 'snapshot_date,channel' });

    if (upsertError) throw upsertError;

    const duration = Date.now() - startTime;
    console.log(JSON.stringify({
      function: 'compute-kpi-snapshot',
      action: 'success',
      target_date: targetDate,
      channels_computed: channels.length,
      duration_ms: duration,
    }));

    await supabase.from('cron_job_logs').insert({
      job_name: 'compute-kpi-snapshot',
      status: 'success',
      rows_processed: snapshots.length,
      duration_ms: duration,
      details: { target_date: targetDate, channels },
    }).then(() => {}).catch(() => {});

    return new Response(
      JSON.stringify({ success: true, target_date: targetDate, snapshots_count: snapshots.length }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    const errorMsg = error instanceof Error ? error.message : 'Unknown error';
    console.error('[compute-kpi-snapshot] Error:', errorMsg);
    return new Response(
      JSON.stringify({ error: errorMsg }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});

async function computeChannelSnapshot(
  supabase: SupabaseClient,
  targetDate: string,
  channel: Channel,
): Promise<SnapshotRow> {
  const startOfDay = `${targetDate}T00:00:00Z`;
  const endOfDay = `${targetDate}T23:59:59Z`;

  // -------------------------------------------------------------------------
  // 1) POS : lecture directe de shopify_orders WHERE source_name='pos'
  //    Les commandes POS ne vivent pas dans `orders` (cf. doc multi-locations).
  // -------------------------------------------------------------------------
  if (channel === 'pos') {
    return await computePosSnapshotFromShopify(supabase, targetDate, startOfDay, endOfDay);
  }

  // -------------------------------------------------------------------------
  // 2) Canaux web (web_b2c / web_b2b) et 'all' : lecture de `orders`
  //    - B2B détecté via b2b_accounts.email = orders.customer_email
  //    - COGS récupéré via products.cost_price (jointure manuelle par product_id)
  // -------------------------------------------------------------------------

  const { data: orders, error } = await supabase
    .from('orders')
    .select(`
      id,
      created_at,
      total_amount,
      status,
      payment_status,
      user_id,
      customer_email,
      order_items ( id, product_id, quantity, product_price )
    `)
    .gte('created_at', startOfDay)
    .lte('created_at', endOfDay)
    .not('status', 'in', '(cancelled,refunded,draft)');

  if (error) throw new Error(`orders fetch: ${error.message}`);

  const ordersList = (orders ?? []) as unknown as OrderLite[];

  // Détecter B2B : emails de comptes B2B existants
  const emails = Array.from(
    new Set(
      ordersList
        .map((o) => (o.customer_email ? o.customer_email.toLowerCase() : null))
        .filter((e): e is string => Boolean(e))
    )
  );

  const b2bEmails = new Set<string>();
  if (emails.length > 0) {
    const { data: b2bRows } = await supabase
      .from('b2b_accounts')
      .select('email')
      .in('email', emails);
    for (const r of (b2bRows ?? []) as { email: string | null }[]) {
      if (r.email) b2bEmails.add(r.email.toLowerCase());
    }
  }

  // Filtrer par canal (cf. B1 : aucune ligne orders n'est POS)
  const filteredOrders = ordersList.filter((o) => {
    const email = o.customer_email ? o.customer_email.toLowerCase() : null;
    const isB2b = email !== null && b2bEmails.has(email);
    if (channel === 'all') return true;
    if (channel === 'web_b2b') return isB2b;
    if (channel === 'web_b2c') return !isB2b;
    return false;
  });

  // Charger cost_price des produits concernés (COGS)
  const productIds = Array.from(
    new Set(
      filteredOrders.flatMap((o) =>
        (o.order_items ?? [])
          .map((i) => i.product_id)
          .filter((id): id is string => Boolean(id))
      )
    )
  );
  const costByProduct = new Map<string, number | null>();
  if (productIds.length > 0) {
    const { data: productRows } = await supabase
      .from('products')
      .select('id, cost_price')
      .in('id', productIds);
    for (const p of (productRows ?? []) as { id: string; cost_price: number | null }[]) {
      costByProduct.set(p.id, p.cost_price);
    }
  }

  // Agrégats
  let ca_ht = 0;
  let ca_ttc = 0;
  let cogs_ht = 0;
  let nb_orders_paid = 0;
  let encaissements_ttc = 0;
  let creances_pendantes_ttc = 0;
  let nb_items_total = 0;
  let nb_items_missing_cost = 0;
  const userIds = new Set<string>();

  for (const o of filteredOrders) {
    const totalTtc = Number(o.total_amount ?? 0);
    const totalHt = totalTtc / (1 + TVA_RATE); // A1 : conversion TTC → HT via taux standard

    ca_ttc += totalTtc;
    ca_ht += totalHt;

    if (o.user_id) userIds.add(o.user_id);

    for (const item of o.order_items ?? []) {
      nb_items_total += 1;
      const productId = item.product_id;
      const cost = productId ? costByProduct.get(productId) : null;
      if (cost == null || cost === 0) {
        nb_items_missing_cost += 1;
      } else {
        cogs_ht += cost * Number(item.quantity ?? 0);
      }
    }

    if (o.payment_status === 'paid' || o.payment_status === 'captured') {
      nb_orders_paid += 1;
      encaissements_ttc += totalTtc;
    } else if (o.payment_status === 'pending' || o.payment_status === 'authorized') {
      creances_pendantes_ttc += totalTtc;
    }
  }

  const marge_brute = ca_ht - cogs_ht;
  const taux_marge = ca_ht > 0 ? (marge_brute / ca_ht) * 100 : 0;
  const nb_orders = filteredOrders.length;
  const panier_moyen_ht = nb_orders > 0 ? ca_ht / nb_orders : 0;

  // Nouveaux clients vs récurrents — requête agrégée sur user_id uniquement.
  // Pas de .limit() : on veut tous les user_ids distincts déjà vus avant startOfDay.
  let nb_customers_new = 0;
  let nb_customers_returning = 0;
  if (userIds.size > 0) {
    const userIdsArray = Array.from(userIds);
    const { data: previouslySeen } = await supabase
      .from('orders')
      .select('user_id')
      .in('user_id', userIdsArray)
      .lt('created_at', startOfDay);

    const existingUsers = new Set(
      ((previouslySeen ?? []) as { user_id: string | null }[])
        .map((r) => r.user_id)
        .filter((u): u is string => Boolean(u))
    );
    for (const uid of userIds) {
      if (existingUsers.has(uid)) nb_customers_returning += 1;
      else nb_customers_new += 1;
    }
  }

  // Alerte si trop d'items sans cost_price : le taux de marge est trompeusement haut
  const missingCostRatio = nb_items_total > 0 ? nb_items_missing_cost / nb_items_total : 0;
  if (missingCostRatio > MISSING_COST_WARN_RATIO) {
    console.warn(JSON.stringify({
      function: 'pilotage-compute-kpi-snapshot',
      warning: 'products_missing_cost_price',
      channel,
      target_date: targetDate,
      nb_items_total,
      nb_items_missing_cost,
      ratio: round2(missingCostRatio),
    }));
  }

  return {
    snapshot_date: targetDate,
    channel,
    ca_ht: round2(ca_ht),
    ca_ttc: round2(ca_ttc),
    cogs_ht: round2(cogs_ht),
    marge_brute: round2(marge_brute),
    taux_marge: round2(taux_marge),
    nb_orders,
    nb_orders_paid,
    panier_moyen_ht: round2(panier_moyen_ht),
    nb_customers_unique: userIds.size,
    nb_customers_new,
    nb_customers_returning,
    encaissements_ttc: round2(encaissements_ttc),
    creances_pendantes_ttc: round2(creances_pendantes_ttc),
    nb_transactions_pos: null,
    ticket_moyen_pos_ttc: null,
    raw_data: {
      orders_count: filteredOrders.length,
      customers_unique: userIds.size,
      nb_items_total,
      nb_items_missing_cost,
      missing_cost_ratio: round2(missingCostRatio),
      computed_at: new Date().toISOString(),
    },
  };
}

async function computePosSnapshotFromShopify(
  supabase: SupabaseClient,
  targetDate: string,
  startOfDay: string,
  endOfDay: string,
): Promise<SnapshotRow> {
  // shopify_orders.shopify_created_at pour la date effective de la vente POS
  const { data: posOrders, error } = await supabase
    .from('shopify_orders')
    .select('id, shopify_order_id, source_name, financial_status, total_price, subtotal_price, total_tax, customer_email, line_items, shopify_created_at')
    .eq('source_name', 'pos')
    .gte('shopify_created_at', startOfDay)
    .lte('shopify_created_at', endOfDay);

  if (error) throw new Error(`shopify_orders fetch: ${error.message}`);

  const list = (posOrders ?? []) as unknown as ShopifyOrderLite[];

  // Récupérer les cost_price des produits vendus en POS via shopify_product_mapping
  const variantIds = Array.from(
    new Set(
      list.flatMap((o) =>
        Array.isArray(o.line_items)
          ? o.line_items
              .map((li) => String(li?.variant_id ?? ''))
              .filter((v) => v.length > 0)
          : []
      )
    )
  );

  const costByVariantId = new Map<string, number | null>();
  if (variantIds.length > 0) {
    const { data: mappings } = await supabase
      .from('shopify_product_mapping')
      .select('shopify_variant_id, product_id, products!inner(cost_price)')
      .in('shopify_variant_id', variantIds);
    type MappingRow = {
      shopify_variant_id: string | null;
      products: { cost_price: number | null } | null;
    };
    for (const m of (mappings ?? []) as MappingRow[]) {
      if (m.shopify_variant_id) {
        costByVariantId.set(String(m.shopify_variant_id), m.products?.cost_price ?? null);
      }
    }
  }

  let ca_ttc = 0;
  let ca_ht = 0;
  let cogs_ht = 0;
  let nb_orders_paid = 0;
  let encaissements_ttc = 0;
  let creances_pendantes_ttc = 0;
  let nb_items_total = 0;
  let nb_items_missing_cost = 0;

  for (const o of list) {
    const totalTtc = Number(o.total_price ?? 0);
    const totalTax = Number(o.total_tax ?? 0);
    const subtotalHt = Number(o.subtotal_price ?? 0); // Shopify : subtotal_price = HT si TVA configurée
    const totalHt = subtotalHt > 0 ? subtotalHt : totalTtc - totalTax;

    ca_ttc += totalTtc;
    ca_ht += totalHt;

    const items = Array.isArray(o.line_items) ? o.line_items : [];
    for (const li of items) {
      nb_items_total += 1;
      const variantKey = String(li?.variant_id ?? '');
      const cost = variantKey ? costByVariantId.get(variantKey) : null;
      if (cost == null || cost === 0) {
        nb_items_missing_cost += 1;
      } else {
        cogs_ht += cost * Number(li?.quantity ?? 0);
      }
    }

    if (o.financial_status === 'paid') {
      nb_orders_paid += 1;
      encaissements_ttc += totalTtc;
    } else if (o.financial_status === 'pending' || o.financial_status === 'authorized') {
      creances_pendantes_ttc += totalTtc;
    }
  }

  const marge_brute = ca_ht - cogs_ht;
  const taux_marge = ca_ht > 0 ? (marge_brute / ca_ht) * 100 : 0;
  const nb_orders = list.length;
  const panier_moyen_ht = nb_orders > 0 ? ca_ht / nb_orders : 0;
  const ticket_moyen_pos_ttc = nb_orders > 0 ? ca_ttc / nb_orders : 0;

  const missingCostRatio = nb_items_total > 0 ? nb_items_missing_cost / nb_items_total : 0;
  if (missingCostRatio > MISSING_COST_WARN_RATIO) {
    console.warn(JSON.stringify({
      function: 'pilotage-compute-kpi-snapshot',
      warning: 'products_missing_cost_price',
      channel: 'pos',
      target_date: targetDate,
      nb_items_total,
      nb_items_missing_cost,
      ratio: round2(missingCostRatio),
    }));
  }

  return {
    snapshot_date: targetDate,
    channel: 'pos',
    ca_ht: round2(ca_ht),
    ca_ttc: round2(ca_ttc),
    cogs_ht: round2(cogs_ht),
    marge_brute: round2(marge_brute),
    taux_marge: round2(taux_marge),
    nb_orders,
    nb_orders_paid,
    panier_moyen_ht: round2(panier_moyen_ht),
    // Shopify POS n'attache pas systématiquement un customer_email (ventes cash) →
    // un comptage "clients uniques" serait fortement sous-évalué. On utilise
    // `nb_orders` / `nb_transactions_pos` comme proxy "nb tickets" à la place.
    nb_customers_unique: nb_orders,
    nb_customers_new: 0,
    nb_customers_returning: 0,
    encaissements_ttc: round2(encaissements_ttc),
    creances_pendantes_ttc: round2(creances_pendantes_ttc),
    nb_transactions_pos: nb_orders,
    ticket_moyen_pos_ttc: round2(ticket_moyen_pos_ttc),
    raw_data: {
      shopify_orders_count: nb_orders,
      customers_note: 'nb_customers_unique = nb_orders (proxy, Shopify POS sans customer_email sur ventes cash)',
      nb_items_total,
      nb_items_missing_cost,
      missing_cost_ratio: round2(missingCostRatio),
      computed_at: new Date().toISOString(),
    },
  };
}

function round2(n: number): number {
  return Math.round(n * 100) / 100;
}
