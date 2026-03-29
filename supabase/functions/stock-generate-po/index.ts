import { createHandler } from "../_shared/handler.ts";

/**
 * Génère automatiquement des bons de commande fournisseurs
 * à partir des alertes stock (vue matérialisée stock_alerts).
 *
 * Paramètres :
 * - auto : true → prend tous les produits en alerte (rupture + critique)
 * - supplier_id : UUID → filtre par fournisseur
 * - product_ids : UUID[] → produits spécifiques
 * - dry_run : boolean (défaut: true)
 */

Deno.serve(createHandler({
  name: "stock-generate-po",
  auth: "admin",
  rateLimit: { prefix: "stock-generate-po", max: 10, windowMs: 60_000 },
}, async ({ supabaseAdmin, body, userId }) => {
  const startTime = Date.now();
  const {
    auto = false,
    supplier_id: supplierId,
    product_ids: productIds,
    dry_run = true,
  } = (body || {}) as any;

  // ── 1. Rafraîchir la vue matérialisée ──────────────────────────────────
  try {
    await supabaseAdmin.rpc("refresh_stock_alerts");
  } catch (e: any) {
    console.error("refresh_stock_alerts failed:", e.message);
  }

  // ── 2. Récupérer les produits en alerte ────────────────────────────────
  let alertsQuery = supabaseAdmin
    .from("stock_alerts")
    .select("*");

  if (auto) {
    alertsQuery = alertsQuery.in("stock_status", ["rupture", "critique"]);
  }
  if (supplierId) {
    alertsQuery = alertsQuery.eq("supplier_id", supplierId);
  }
  if (productIds?.length) {
    alertsQuery = alertsQuery.in("product_id", productIds);
  }

  const { data: alerts, error: alertsError } = await alertsQuery;
  if (alertsError) throw alertsError;

  if (!alerts?.length) {
    return { message: "No products in alert", checked: 0 };
  }

  // ── 3. Résoudre les fournisseurs manquants via supplier_products ───────
  const alertsWithSupplier: Array<typeof alerts[0] & { resolved_supplier_id: string }> = [];

  for (const alert of alerts) {
    if (alert.supplier_id) {
      alertsWithSupplier.push({ ...alert, resolved_supplier_id: alert.supplier_id });
      continue;
    }

    // Chercher le fournisseur préféré via supplier_products
    const { data: sp } = await supabaseAdmin
      .from("supplier_products")
      .select("supplier_id, supplier_price, is_preferred, priority_rank, min_order_quantity")
      .eq("product_id", alert.product_id)
      .order("is_preferred", { ascending: false })
      .order("priority_rank", { ascending: true })
      .order("supplier_price", { ascending: true })
      .limit(1)
      .maybeSingle();

    if (sp) {
      alertsWithSupplier.push({ ...alert, resolved_supplier_id: sp.supplier_id });
    }
  }

  if (alertsWithSupplier.length === 0) {
    return { message: "No alerts with resolved suppliers", alerts_found: alerts.length };
  }

  // ── 4. Grouper par fournisseur ─────────────────────────────────────────
  const ordersBySupplier = new Map<string, {
    supplierName: string;
    items: Array<{ productId: string; name: string; quantity: number; unitPriceHt: number }>;
  }>();

  for (const alert of alertsWithSupplier) {
    const sid = alert.resolved_supplier_id;
    const quantity = Math.max(1, (alert.reorder_quantity ?? 20) - Math.max(0, alert.current_stock ?? 0));

    // Chercher le prix fournisseur
    const { data: sp } = await supabaseAdmin
      .from("supplier_products")
      .select("supplier_price, min_order_quantity")
      .eq("product_id", alert.product_id)
      .eq("supplier_id", sid)
      .limit(1)
      .maybeSingle();

    const finalQty = Math.max(quantity, sp?.min_order_quantity ?? 1);
    const unitPrice = sp?.supplier_price ?? 0;

    if (!ordersBySupplier.has(sid)) {
      ordersBySupplier.set(sid, {
        supplierName: alert.supplier_name || sid,
        items: [],
      });
    }

    ordersBySupplier.get(sid)!.items.push({
      productId: alert.product_id,
      name: alert.name,
      quantity: finalQty,
      unitPriceHt: unitPrice,
    });
  }

  // ── 5. Créer les PO ───────────────────────────────────────────────────
  const createdOrders: any[] = [];

  if (!dry_run) {
    for (const [sid, orderData] of ordersBySupplier) {
      // Générer une référence auto
      const { data: lastOrder } = await supabaseAdmin
        .from("purchase_orders")
        .select("order_number")
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();

      const year = new Date().getFullYear();
      let nextNum = 1;
      if (lastOrder?.order_number) {
        const match = lastOrder.order_number.match(/(\d+)$/);
        if (match) nextNum = parseInt(match[1], 10) + 1;
      }
      const orderNumber = `PO-${year}-${String(nextNum).padStart(4, "0")}`;

      const totalHt = orderData.items.reduce((sum, i) => sum + i.unitPriceHt * i.quantity, 0);
      const totalTtc = totalHt * 1.2;

      const { data: order, error: orderError } = await supabaseAdmin
        .from("purchase_orders")
        .insert({
          order_number: orderNumber,
          reference: orderNumber,
          supplier_id: sid,
          status: "draft",
          total_ht: totalHt,
          total_ttc: totalTtc,
          created_by: userId || "00000000-0000-0000-0000-000000000000",
          notes: "Commande auto-générée depuis module stock",
        })
        .select()
        .single();

      if (orderError) {
        console.error("Error creating PO:", orderError);
        continue;
      }

      const items = orderData.items.map((item) => ({
        purchase_order_id: order.id,
        product_id: item.productId,
        quantity: item.quantity,
        unit_price_ht: item.unitPriceHt,
        unit_price_ttc: item.unitPriceHt * 1.2,
      }));

      await supabaseAdmin.from("purchase_order_items").insert(items);

      createdOrders.push({
        order_id: order.id,
        order_number: orderNumber,
        supplier: orderData.supplierName,
        items_count: items.length,
        total_ht: totalHt,
      });
    }
  }

  const duration = Date.now() - startTime;

  return {
    message: dry_run ? "Dry run complete" : "Purchase orders created",
    alerts_found: alerts.length,
    with_supplier: alertsWithSupplier.length,
    suppliers: ordersBySupplier.size,
    orders_created: createdOrders.length,
    orders: dry_run
      ? Array.from(ordersBySupplier.entries()).map(([, data]) => ({
          supplier: data.supplierName,
          items: data.items,
        }))
      : createdOrders,
    dry_run,
    duration_ms: duration,
  };
}));
