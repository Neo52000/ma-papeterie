import { createHandler } from "../_shared/handler.ts";

Deno.serve(createHandler({
  name: "gdpr-data-export",
  auth: "auth",
  rateLimit: { prefix: "gdpr-export", max: 3, windowMs: 60_000 },
}, async ({ supabaseAdmin, userId, email }) => {
  console.log(`Exporting GDPR data for user: ${userId}`);

  // Create GDPR request record
  await supabaseAdmin.from('gdpr_requests').insert({
    user_id: userId,
    request_type: 'export',
    status: 'processing'
  });

  // Collect all user data
  const exportData: Record<string, unknown> = {
    export_date: new Date().toISOString(),
    user_info: {
      id: userId,
      email,
    }
  };

  // Profile data
  const { data: profile } = await supabaseAdmin
    .from('profiles')
    .select('*')
    .eq('user_id', userId)
    .single();
  exportData.profile = profile;

  // Orders and items
  const { data: orders } = await supabaseAdmin
    .from('orders')
    .select('*, order_items(*)')
    .eq('user_id', userId);
  exportData.orders = orders;

  // RFM scores
  const { data: rfmScores } = await supabaseAdmin
    .from('customer_rfm_scores')
    .select('*')
    .eq('user_id', userId);
  exportData.rfm_scores = rfmScores;

  // Recommendations
  const { data: recommendations } = await supabaseAdmin
    .from('customer_recommendations')
    .select('*')
    .eq('user_id', userId);
  exportData.recommendations = recommendations;

  // Consents
  const { data: consents } = await supabaseAdmin
    .from('user_consents')
    .select('*')
    .eq('user_id', userId);
  exportData.consents = consents;

  // Interactions
  const { data: interactions } = await supabaseAdmin
    .from('customer_interactions')
    .select('*')
    .eq('user_id', userId);
  exportData.interactions = interactions;

  // Update GDPR request to completed
  await supabaseAdmin
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

  return {
    success: true,
    data: exportData,
    message: 'Export RGPD généré avec succès'
  };
}));
