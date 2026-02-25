import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { getCorsHeaders, handleCorsPreFlight } from "../_shared/cors.ts";

Deno.serve(async (req) => {
  const preFlightResponse = handleCorsPreFlight(req);
  if (preFlightResponse) return preFlightResponse;
  const corsHeaders = getCorsHeaders(req);

  try {
    const url = new URL(req.url);
    const ref = url.searchParams.get('ref');
    const qty = parseInt(url.searchParams.get('qty') || '1');

    if (!ref) {
      return new Response(JSON.stringify({ error: 'Missing ref parameter' }), {
        status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    );

    // Check cache (10 min)
    const tenMinAgo = new Date(Date.now() - 10 * 60 * 1000).toISOString();
    const { data: cached } = await supabase
      .from('supplier_stock_snapshots')
      .select('*')
      .eq('ref_softcarrier', ref)
      .gte('fetched_at', tenMinAgo)
      .order('fetched_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    if (cached) {
      return new Response(JSON.stringify({
        ref_softcarrier: cached.ref_softcarrier,
        qty_available: cached.qty_available,
        delivery_week: cached.delivery_week,
        cached: true,
        fetched_at: cached.fetched_at,
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    // Fetch credentials from admin_secrets
    const { data: secrets } = await supabase
      .from('admin_secrets')
      .select('key, value')
      .in('key', ['SOFTCARRIER_CUSTOMER_ID', 'SOFTCARRIER_PASSWORD']);

    const creds: Record<string, string> = {};
    (secrets || []).forEach((s: any) => { creds[s.key] = s.value; });

    const customerId = creds['SOFTCARRIER_CUSTOMER_ID'];
    const password = creds['SOFTCARRIER_PASSWORD'];

    if (!customerId || !password) {
      return new Response(JSON.stringify({
        error: 'Soft Carrier credentials not configured',
        hint: 'Set SOFTCARRIER_CUSTOMER_ID and SOFTCARRIER_PASSWORD in admin_secrets'
      }), {
        status: 503, headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
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
    await supabase.from('supplier_stock_snapshots').insert({
      ref_softcarrier: result.ref_softcarrier,
      qty_available: result.qty_available,
      delivery_week: result.delivery_week,
    });

    return new Response(JSON.stringify(result), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });

  } catch (error) {
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }
});
