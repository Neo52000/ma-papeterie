import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { getCorsHeaders, handleCorsPreFlight } from "../_shared/cors.ts";
import { safeErrorResponse } from "../_shared/sanitize-error.ts";
import { requireAdmin, isAuthError } from "../_shared/auth.ts";
import { checkRateLimit, getRateLimitKey, rateLimitResponse } from "../_shared/rate-limit.ts";

Deno.serve(async (req) => {
  const preFlightResponse = handleCorsPreFlight(req);
  if (preFlightResponse) return preFlightResponse;
  const corsHeaders = getCorsHeaders(req);

  const rlKey = getRateLimitKey(req, 'auto-purchase-orders');
  if (!checkRateLimit(rlKey, 10, 60_000)) {
    return rateLimitResponse(corsHeaders);
  }
  const authResult = await requireAdmin(req, corsHeaders);
  if (isAuthError(authResult)) return authResult.error;

  const supabase = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
  );

  const startTime = Date.now();

  try {
    const { dry_run = true } = await req.json().catch(() => ({}));

    // Find products needing reorder: stock <= reorder point AND has active suppliers
    const { data: products, error: fetchError } = await supabase
      .from("products")
      .select(`
        id, name, ean, sku_interne, stock_quantity, min_stock_alert, reorder_quantity,
        supplier_products!inner (
          id, supplier_id, supplier_price, stock_quantity, lead_time_days, 
          is_preferred, priority_rank, min_order_quantity,
          suppliers!inner ( id, name, is_active, minimum_order_amount )
        )
      `)
      .eq("is_active", true)
      .eq("supplier_products.suppliers.is_active", true);

    if (fetchError) throw fetchError;

    // Filter products below reorder threshold
    const needsReorder = (products || []).filter(p => {
      const stock = p.stock_quantity || 0;
      const threshold = p.min_stock_alert || 10;
      return stock <= threshold;
    });

    if (needsReorder.length === 0) {
      return new Response(JSON.stringify({ 
        message: "No products need reordering", 
        checked: products?.length || 0 
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    // Group by best supplier (preferred first, then priority_rank, then cheapest)
    const ordersBySupplier = new Map<string, { 
      supplier: any; 
      items: Array<{ product: any; supplierProduct: any; quantity: number }> 
    }>();

    for (const product of needsReorder) {
      const supplierProducts = (product as any).supplier_products || [];
      
      // Pick best supplier
      const sorted = [...supplierProducts].sort((a: any, b: any) => {
        if (a.is_preferred && !b.is_preferred) return -1;
        if (!a.is_preferred && b.is_preferred) return 1;
        if ((a.priority_rank || 99) !== (b.priority_rank || 99)) 
          return (a.priority_rank || 99) - (b.priority_rank || 99);
        return (a.supplier_price || 999) - (b.supplier_price || 999);
      });

      const best = sorted[0];
      if (!best) continue;

      const supplier = best.suppliers;
      const supplierId = best.supplier_id;
      const quantity = Math.max(
        product.reorder_quantity || 50,
        best.min_order_quantity || 1
      );

      if (!ordersBySupplier.has(supplierId)) {
        ordersBySupplier.set(supplierId, { supplier, items: [] });
      }
      ordersBySupplier.get(supplierId)!.items.push({
        product,
        supplierProduct: best,
        quantity,
      });
    }

    const createdOrders: any[] = [];

    if (!dry_run) {
      for (const [supplierId, orderData] of ordersBySupplier) {
        // Generate order number
        const { data: orderNumber } = await supabase.rpc("generate_purchase_order_number");

        const totalHt = orderData.items.reduce((sum, item) => 
          sum + (item.supplierProduct.supplier_price * item.quantity), 0);
        const totalTtc = totalHt * 1.2; // TVA 20%

        // Create purchase order
        const { data: order, error: orderError } = await supabase
          .from("purchase_orders")
          .insert({
            order_number: orderNumber || `PO-AUTO-${Date.now()}`,
            supplier_id: supplierId,
            status: "draft",
            total_ht: totalHt,
            total_ttc: totalTtc,
            created_by: "00000000-0000-0000-0000-000000000000",
            notes: "Commande générée automatiquement - stock sous seuil",
            expected_delivery_date: new Date(
              Date.now() + (Math.max(...orderData.items.map(i => i.supplierProduct.lead_time_days || 7)) * 86400000)
            ).toISOString(),
          })
          .select()
          .single();

        if (orderError) {
          console.error("Error creating order:", orderError);
          continue;
        }

        // Create order items
        const items = orderData.items.map(item => ({
          purchase_order_id: order.id,
          product_id: item.product.id,
          supplier_product_id: item.supplierProduct.id,
          quantity: item.quantity,
          unit_price_ht: item.supplierProduct.supplier_price,
          unit_price_ttc: item.supplierProduct.supplier_price * 1.2,
        }));

        await supabase.from("purchase_order_items").insert(items);

        createdOrders.push({
          order_id: order.id,
          order_number: order.order_number,
          supplier: orderData.supplier.name,
          items_count: items.length,
          total_ht: totalHt,
        });
      }
    }

    const duration = Date.now() - startTime;

    // Log
    await supabase.from("agent_logs").insert({
      agent_name: "auto-purchase-orders",
      action: dry_run ? "dry_run" : "generate_orders",
      status: "success",
      duration_ms: duration,
      output_data: {
        products_checked: products?.length || 0,
        needs_reorder: needsReorder.length,
        suppliers: ordersBySupplier.size,
        orders_created: createdOrders.length,
        dry_run,
      },
    });

    return new Response(JSON.stringify({
      message: dry_run ? "Dry run complete" : "Orders created",
      products_checked: products?.length || 0,
      needs_reorder: needsReorder.length,
      suppliers: ordersBySupplier.size,
      orders_created: createdOrders.length,
      orders: dry_run 
        ? Array.from(ordersBySupplier.entries()).map(([id, data]) => ({
            supplier: data.supplier.name,
            items: data.items.map(i => ({
              product: i.product.name,
              quantity: i.quantity,
              unit_price: i.supplierProduct.supplier_price,
            })),
          }))
        : createdOrders,
      duration_ms: duration,
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });

  } catch (error: any) {
    await supabase.from("agent_logs").insert({
      agent_name: "auto-purchase-orders",
      action: "generate_orders",
      status: "error",
      duration_ms: Date.now() - startTime,
      error_message: error.message,
    });

    return safeErrorResponse(error, corsHeaders, { status: 500, context: "auto-purchase-orders" });
  }
});
