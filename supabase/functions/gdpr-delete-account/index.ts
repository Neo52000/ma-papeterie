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

    const supabaseAdmin = createClient(
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

    const { confirm } = await req.json();
    if (confirm !== 'DELETE_MY_ACCOUNT') {
      return new Response(JSON.stringify({ error: 'Confirmation invalide' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    console.log(`Starting GDPR deletion for user: ${user.id}`);

    // Create GDPR request
    await supabaseAdmin.from('gdpr_requests').insert({
      user_id: user.id,
      request_type: 'deletion',
      status: 'processing'
    });

    // Log deletions
    const logDeletion = async (dataType: string) => {
      await supabaseAdmin.from('data_retention_logs').insert({
        user_id: user.id,
        data_type: dataType
      });
    };

    // Anonymize orders (keep for accounting)
    const { data: orders } = await supabaseAdmin
      .from('orders')
      .select('id')
      .eq('user_id', user.id);
    
    if (orders && orders.length > 0) {
      await supabaseAdmin
        .from('orders')
        .update({
          customer_email: 'anonymized@deleted.user',
          customer_phone: null,
          shipping_address: { anonymized: true },
          billing_address: { anonymized: true },
          notes: 'Données anonymisées suite à demande RGPD'
        })
        .eq('user_id', user.id);
      await logDeletion('orders_anonymized');
    }

    // Delete RFM scores
    await supabaseAdmin
      .from('customer_rfm_scores')
      .delete()
      .eq('user_id', user.id);
    await logDeletion('customer_rfm_scores');

    // Delete recommendations
    await supabaseAdmin
      .from('customer_recommendations')
      .delete()
      .eq('user_id', user.id);
    await logDeletion('customer_recommendations');

    // Delete interactions
    await supabaseAdmin
      .from('customer_interactions')
      .delete()
      .eq('user_id', user.id);
    await logDeletion('customer_interactions');

    // Delete consents
    await supabaseAdmin
      .from('user_consents')
      .delete()
      .eq('user_id', user.id);
    await logDeletion('user_consents');

    // Delete profile
    await supabaseAdmin
      .from('profiles')
      .delete()
      .eq('user_id', user.id);
    await logDeletion('profile');

    // Delete user roles
    await supabaseAdmin
      .from('user_roles')
      .delete()
      .eq('user_id', user.id);
    await logDeletion('user_roles');

    // Update GDPR request
    await supabaseAdmin
      .from('gdpr_requests')
      .update({ 
        status: 'completed', 
        processed_at: new Date().toISOString() 
      })
      .eq('user_id', user.id)
      .eq('request_type', 'deletion')
      .eq('status', 'processing');

    // Delete auth user
    const { error: deleteError } = await supabaseAdmin.auth.admin.deleteUser(user.id);
    if (deleteError) {
      console.error('Error deleting auth user:', deleteError);
    }
    await logDeletion('auth_user');

    console.log(`GDPR deletion completed for user: ${user.id}`);

    return new Response(JSON.stringify({
      success: true,
      message: 'Votre compte a été supprimé conformément au RGPD'
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });

  } catch (error) {
    console.error('Error in gdpr-delete-account:', error);
    return safeErrorResponse(error, corsHeaders, { status: 500, context: "gdpr-delete-account" });
  }
});
