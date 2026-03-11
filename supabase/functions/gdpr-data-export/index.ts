import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { getCorsHeaders, handleCorsPreFlight } from "../_shared/cors.ts";
import { checkRateLimit, getRateLimitKey, rateLimitResponse } from "../_shared/rate-limit.ts";
import { requireAuth, isAuthError } from "../_shared/auth.ts";

serve(async (req) => {
  const preFlightResponse = handleCorsPreFlight(req);
  if (preFlightResponse) return preFlightResponse;
  const corsHeaders = getCorsHeaders(req);

  const rlKey = getRateLimitKey(req, 'gdpr-export');
  if (!(await checkRateLimit(rlKey, 3, 60_000))) {
    return rateLimitResponse(corsHeaders);
  }

  const authResult = await requireAuth(req, corsHeaders);
  if (isAuthError(authResult)) return authResult.error;
  const userId = authResult.userId;

  try {
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    console.log(`Exporting GDPR data for user: ${userId}`);

    // Create GDPR request record
    await supabaseClient.from('gdpr_requests').insert({
      user_id: userId,
      request_type: 'export',
      status: 'processing'
    });

    // Collect all user data
    const exportData: Record<string, unknown> = {
      export_date: new Date().toISOString(),
      user_info: {
        id: userId,
        email: authResult.email,
      }
    };

    // Profile data
    const { data: profile } = await supabaseClient
      .from('profiles')
      .select('*')
      .eq('user_id', userId)
      .single();
    exportData.profile = profile;

    // Orders and items
    const { data: orders } = await supabaseClient
      .from('orders')
      .select('*, order_items(*)')
      .eq('user_id', userId);
    exportData.orders = orders;

    // RFM scores
    const { data: rfmScores } = await supabaseClient
      .from('customer_rfm_scores')
      .select('*')
      .eq('user_id', userId);
    exportData.rfm_scores = rfmScores;

    // Recommendations
    const { data: recommendations } = await supabaseClient
      .from('customer_recommendations')
      .select('*')
      .eq('user_id', userId);
    exportData.recommendations = recommendations;

    // Consents
    const { data: consents } = await supabaseClient
      .from('user_consents')
      .select('*')
      .eq('user_id', userId);
    exportData.consents = consents;

    // Interactions
    const { data: interactions } = await supabaseClient
      .from('customer_interactions')
      .select('*')
      .eq('user_id', userId);
    exportData.interactions = interactions;

    // Update GDPR request to completed
    await supabaseClient
      .from('gdpr_requests')
      .update({ 
        status: 'completed', 
        processed_at: new Date().toISOString(),
        response_data: { records_exported: Object.keys(exportData).length }
      })
      .eq('user_id', userId)
      .eq('request_type', 'export')
      .eq('status', 'processing');

    console.log(`GDPR export completed for user: ${userId}`);

    return new Response(JSON.stringify({
      success: true,
      data: exportData,
      message: 'Export RGPD généré avec succès'
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });

  } catch (error) {
    console.error('Error in gdpr-data-export:', error);
    return new Response(JSON.stringify({ error: 'Erreur lors de l\'export RGPD' }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }
});