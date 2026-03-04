import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.4";
import { getCorsHeaders, handleCorsPreFlight } from "../_shared/cors.ts";
import { requireAdmin, isAuthError } from "../_shared/auth.ts";
import { checkRateLimit, getRateLimitKey, rateLimitResponse } from "../_shared/rate-limit.ts";
import { checkBodySize } from "../_shared/body-limit.ts";

serve(async (req) => {
  const preFlightResponse = handleCorsPreFlight(req);
  if (preFlightResponse) return preFlightResponse;
  const corsHeaders = getCorsHeaders(req);

  const rlKey = getRateLimitKey(req, 'import-schools');
  if (!checkRateLimit(rlKey, 5, 60_000)) {
    return rateLimitResponse(corsHeaders);
  }

  const authResult = await requireAdmin(req, corsHeaders);
  if (isAuthError(authResult)) return authResult.error;

  const sizeError = checkBodySize(req, corsHeaders);
  if (sizeError) return sizeError;

  try {
    const { csvData } = await req.json();
    
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    const rows = csvData.trim().split('\n').slice(1);
    const results = { success: [], errors: [] };

    for (const row of rows) {
      try {
        const [name, address, postalCode, city, schoolType, officialCode] = row.split(',').map(v => v.trim());

        const { data: school, error } = await supabase
          .from('schools')
          .upsert({
            name,
            address,
            postal_code: postalCode,
            city,
            school_type: schoolType,
            official_code: officialCode,
          }, { onConflict: 'official_code' })
          .select()
          .single();

        if (error) throw error;
        results.success.push({ school: name });
      } catch (err) {
        results.errors.push({ row, error: err.message });
      }
    }

    return new Response(JSON.stringify(results), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('Error:', error);
    return new Response(JSON.stringify({ error: 'Erreur lors de l\'import scolaire' }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
