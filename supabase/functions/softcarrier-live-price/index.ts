import { createHandler, jsonResponse } from "../_shared/handler.ts";

Deno.serve(createHandler({
  name: "softcarrier-live-price",
  auth: "admin",
  rateLimit: { prefix: "softcarrier-price", max: 15, windowMs: 60_000 },
  methods: ["GET"],
  rawBody: true,
}, async ({ supabaseAdmin, corsHeaders, req }) => {
  const url = new URL(req.url);
  const ref = url.searchParams.get('ref');
  const qty = parseInt(url.searchParams.get('qty') || '1');

  if (!ref) {
    return jsonResponse(
      { error: 'Missing ref parameter' },
      400,
      corsHeaders,
    );
  }

  // Check cache (10 min)
  const tenMinAgo = new Date(Date.now() - 10 * 60 * 1000).toISOString();
  const { data: cached } = await supabaseAdmin
    .from('supplier_stock_snapshots')
    .select('*')
    .eq('ref_softcarrier', ref)
    .gte('fetched_at', tenMinAgo)
    .order('fetched_at', { ascending: false })
    .limit(1)
    .maybeSingle();

  if (cached) {
    return {
      ref_softcarrier: cached.ref_softcarrier,
      qty_available: cached.qty_available,
      delivery_week: cached.delivery_week,
      cached: true,
      fetched_at: cached.fetched_at,
    };
  }

  // Fetch credentials from admin_secrets
  const { data: secrets } = await supabaseAdmin
    .from('admin_secrets')
    .select('key, value')
    .in('key', ['SOFTCARRIER_CUSTOMER_ID', 'SOFTCARRIER_PASSWORD']);

  const creds: Record<string, string> = {};
  (secrets || []).forEach((s: any) => { creds[s.key] = s.value; });

  const customerId = creds['SOFTCARRIER_CUSTOMER_ID'];
  const password = creds['SOFTCARRIER_PASSWORD'];

  if (!customerId || !password) {
    return jsonResponse({
      error: 'Soft Carrier credentials not configured',
      hint: 'Set SOFTCARRIER_CUSTOMER_ID and SOFTCARRIER_PASSWORD in admin_secrets'
    }, 503, corsHeaders);
  }

  // Call Soft Carrier hbas API
  const apiUrl = `https://www.fr.softcarrier.com/hbas?aktion=1&firmenindikator=5&site=softfr&kundennr=${customerId}&userpassword=${password}&artikelnr=${ref}&menge=${qty}`;

  const response = await fetch(apiUrl);
  const text = await response.text();

  // Parse CSV response: reference;price_cents;delivery_days;stock;restock_week
  const parts = text.trim().split(';');
  const result = {
    ref_softcarrier: parts[0]?.trim() || ref,
    price_cents: parseInt(parts[1]) || 0,
    price_ht: (parseInt(parts[1]) || 0) / 100,
    delivery_days: parseInt(parts[2]) || 0,
    qty_available: parseInt(parts[3]) || 0,
    delivery_week: parts[4]?.trim() || null,
    cached: false,
    fetched_at: new Date().toISOString(),
  };

  // Cache the snapshot
  await supabaseAdmin.from('supplier_stock_snapshots').insert({
    ref_softcarrier: result.ref_softcarrier,
    qty_available: result.qty_available,
    delivery_week: result.delivery_week,
  });

  return result;
}));
