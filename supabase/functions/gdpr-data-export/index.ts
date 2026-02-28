import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { getCorsHeaders, handleCorsPreFlight } from "../_shared/cors.ts";
import { safeErrorResponse } from "../_shared/sanitize-error.ts";

serve(async (req) => {
  const preFlightResponse = handleCorsPreFlight(req);
  if (preFlightResponse) return preFlightResponse;
  const corsHeaders = getCorsHeaders(req);

  try {
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(JSON.stringify({ error: 'Non autorisé' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    // Get user from token
    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: userError } = await createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? ''
    ).auth.getUser(token);

    if (userError || !user) {
      return new Response(JSON.stringify({ error: 'Utilisateur non trouvé' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    console.log(`Exporting GDPR data for user: ${user.id}`);

    // Create GDPR request record
    await supabaseClient.from('gdpr_requests').insert({
      user_id: user.id,
      request_type: 'export',
      status: 'processing'
    });

    // Collect all user data
    const exportData: Record<string, unknown> = {
      export_date: new Date().toISOString(),
      user_info: {
        id: user.id,
        email: user.email,
        created_at: user.created_at,
        last_sign_in_at: user.last_sign_in_at
      }
    };

    // Profile data
    const { data: profile } = await supabaseClient
      .from('profiles')
      .select('*')
      .eq('user_id', user.id)
      .single();
    exportData.profile = profile;

    // Orders and items
    const { data: orders } = await supabaseClient
      .from('orders')
      .select('*, order_items(*)')
      .eq('user_id', user.id);
    exportData.orders = orders;

    // RFM scores
    const { data: rfmScores } = await supabaseClient
      .from('customer_rfm_scores')
      .select('*')
      .eq('user_id', user.id);
    exportData.rfm_scores = rfmScores;

    // Recommendations
    const { data: recommendations } = await supabaseClient
      .from('customer_recommendations')
      .select('*')
      .eq('user_id', user.id);
    exportData.recommendations = recommendations;

    // Consents
    const { data: consents } = await supabaseClient
      .from('user_consents')
      .select('*')
      .eq('user_id', user.id);
    exportData.consents = consents;

    // Interactions
    const { data: interactions } = await supabaseClient
      .from('customer_interactions')
      .select('*')
      .eq('user_id', user.id);
    exportData.interactions = interactions;

    // Update GDPR request to completed
    await supabaseClient
      .from('gdpr_requests')
      .update({ 
        status: 'completed', 
        processed_at: new Date().toISOString(),
        response_data: { records_exported: Object.keys(exportData).length }
      })
      .eq('user_id', user.id)
      .eq('request_type', 'export')
      .eq('status', 'processing');

    console.log(`GDPR export completed for user: ${user.id}`);

    return new Response(JSON.stringify({
      success: true,
      data: exportData,
      message: 'Export RGPD généré avec succès'
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });

  } catch (error) {
    console.error('Error in gdpr-data-export:', error);
    return safeErrorResponse(error, corsHeaders, { status: 500, context: "gdpr-data-export" });
  }
});