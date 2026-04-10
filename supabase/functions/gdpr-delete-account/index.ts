import { createHandler, jsonResponse } from "../_shared/handler.ts";

Deno.serve(createHandler({
  name: "gdpr-delete-account",
  auth: "auth",
  rateLimit: { prefix: "gdpr-delete", max: 3, windowMs: 60_000 },
}, async ({ supabaseAdmin, body, corsHeaders, userId }) => {
  const { confirm } = body as { confirm?: string };
  if (confirm !== 'DELETE_MY_ACCOUNT') {
    return jsonResponse({ error: 'Confirmation invalide' }, 400, corsHeaders);
  }

  console.log(`Starting GDPR deletion for user: ${userId}`);

  // Create GDPR request
  await supabaseAdmin.from('gdpr_requests').insert({
    user_id: userId,
    request_type: 'deletion',
    status: 'processing'
  });

  // Track errors without stopping the process — partial deletion is better than none
  const errors: string[] = [];

  // Log deletions
  const logDeletion = async (dataType: string) => {
    await supabaseAdmin.from('data_retention_logs').insert({
      user_id: userId,
      data_type: dataType
    });
  };

  const safeDelete = async (label: string, fn: () => Promise<{ error: unknown }>) => {
    const { error } = await fn();
    if (error) {
      console.error(`GDPR: failed [${label}]:`, error);
      errors.push(label);
    }
    await logDeletion(label);
  };

  // Anonymize orders (keep for accounting)
  const { data: orders } = await supabaseAdmin
    .from('orders')
    .select('id')
    .eq('user_id', userId);

  if (orders && orders.length > 0) {
    await safeDelete('orders_anonymized', () =>
      supabaseAdmin.from('orders').update({
        customer_email: 'anonymized@deleted.user',
        customer_phone: null,
        shipping_address: { anonymized: true },
        billing_address: { anonymized: true },
        notes: 'Données anonymisées suite à demande RGPD'
      }).eq('user_id', userId)
    );
  }

  await safeDelete('customer_rfm_scores', () =>
    supabaseAdmin.from('customer_rfm_scores').delete().eq('user_id', userId));

  await safeDelete('customer_recommendations', () =>
    supabaseAdmin.from('customer_recommendations').delete().eq('user_id', userId));

  await safeDelete('customer_interactions', () =>
    supabaseAdmin.from('customer_interactions').delete().eq('user_id', userId));

  await safeDelete('user_consents', () =>
    supabaseAdmin.from('user_consents').delete().eq('user_id', userId));

  await safeDelete('profile', () =>
    supabaseAdmin.from('profiles').delete().eq('user_id', userId));

  await safeDelete('user_roles', () =>
    supabaseAdmin.from('user_roles').delete().eq('user_id', userId));

  // Delete school list data (uploads, matches, carts)
  await safeDelete('school_list_carts', () =>
    supabaseAdmin.from('school_list_carts').delete().eq('user_id', userId));
  await safeDelete('school_list_matches', () =>
    supabaseAdmin.from('school_list_matches').delete().eq('user_id', userId));
  await safeDelete('school_list_uploads', () =>
    supabaseAdmin.from('school_list_uploads').delete().eq('user_id', userId));

  // Delete B2B data
  const { data: templates } = await supabaseAdmin
    .from('b2b_reorder_templates').select('id').eq('user_id', userId);
  const templateIds = templates?.map((t: { id: string }) => t.id) ?? [];
  if (templateIds.length > 0) {
    await safeDelete('b2b_reorder_template_items', () =>
      supabaseAdmin.from('b2b_reorder_template_items').delete().in('template_id', templateIds));
  }
  await safeDelete('b2b_reorder_templates', () =>
    supabaseAdmin.from('b2b_reorder_templates').delete().eq('user_id', userId));
  await safeDelete('b2b_company_users', () =>
    supabaseAdmin.from('b2b_company_users').delete().eq('user_id', userId));

  // Anonymize product reviews (keep content, remove PII)
  await safeDelete('product_reviews_anonymized', () =>
    supabaseAdmin.from('product_reviews')
      .update({ author_name: 'Utilisateur supprimé', author_email: null })
      .eq('user_id', userId));

  // Anonymize blog comments
  await safeDelete('blog_comments_anonymized', () =>
    supabaseAdmin.from('blog_comments')
      .update({ author_name: 'Utilisateur supprimé', author_email: null })
      .eq('user_id', userId));

  // Delete recommendation logs
  await safeDelete('recommendation_logs', () =>
    supabaseAdmin.from('recommendation_logs').delete().eq('user_id', userId));

  // Update GDPR request status
  const gdprStatus = errors.length > 0 ? 'completed_with_errors' : 'completed';
  await supabaseAdmin
    .from('gdpr_requests')
    .update({
      status: gdprStatus,
      processed_at: new Date().toISOString()
    })
    .eq('user_id', userId)
    .eq('request_type', 'deletion')
    .eq('status', 'processing');

  // Delete auth user
  const { error: deleteError } = await supabaseAdmin.auth.admin.deleteUser(userId!);
  if (deleteError) {
    console.error('Error deleting auth user:', deleteError);
    errors.push('auth_user');
  }
  await logDeletion('auth_user');

  if (errors.length > 0) {
    console.error(`GDPR deletion completed with ${errors.length} error(s):`, errors);
  }

  console.log(`GDPR deletion completed for user: ${userId}`);

  return {
    success: true,
    message: 'Votre compte a été supprimé conformément au RGPD'
  };
}));
