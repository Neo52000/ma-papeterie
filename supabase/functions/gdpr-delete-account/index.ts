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

  // Log deletions
  const logDeletion = async (dataType: string) => {
    await supabaseAdmin.from('data_retention_logs').insert({
      user_id: userId,
      data_type: dataType
    });
  };

  // Anonymize orders (keep for accounting)
  const { data: orders } = await supabaseAdmin
    .from('orders')
    .select('id')
    .eq('user_id', userId);

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
      .eq('user_id', userId);
    await logDeletion('orders_anonymized');
  }

  // Delete RFM scores
  await supabaseAdmin
    .from('customer_rfm_scores')
    .delete()
    .eq('user_id', userId);
  await logDeletion('customer_rfm_scores');

  // Delete recommendations
  await supabaseAdmin
    .from('customer_recommendations')
    .delete()
    .eq('user_id', userId);
  await logDeletion('customer_recommendations');

  // Delete interactions
  await supabaseAdmin
    .from('customer_interactions')
    .delete()
    .eq('user_id', userId);
  await logDeletion('customer_interactions');

  // Delete consents
  await supabaseAdmin
    .from('user_consents')
    .delete()
    .eq('user_id', userId);
  await logDeletion('user_consents');

  // Delete profile
  await supabaseAdmin
    .from('profiles')
    .delete()
    .eq('user_id', userId);
  await logDeletion('profile');

  // Delete user roles
  await supabaseAdmin
    .from('user_roles')
    .delete()
    .eq('user_id', userId);
  await logDeletion('user_roles');

  // Delete school list data (uploads, matches, carts)
  await supabaseAdmin.from('school_list_carts').delete().eq('user_id', userId);
  await logDeletion('school_list_carts');
  await supabaseAdmin.from('school_list_matches').delete().eq('user_id', userId);
  await logDeletion('school_list_matches');
  await supabaseAdmin.from('school_list_uploads').delete().eq('user_id', userId);
  await logDeletion('school_list_uploads');

  // Delete B2B data
  await supabaseAdmin.from('b2b_reorder_template_items')
    .delete()
    .in('template_id',
      (await supabaseAdmin.from('b2b_reorder_templates').select('id').eq('user_id', userId)).data?.map((t: { id: string }) => t.id) ?? []
    );
  await supabaseAdmin.from('b2b_reorder_templates').delete().eq('user_id', userId);
  await supabaseAdmin.from('b2b_company_users').delete().eq('user_id', userId);
  await logDeletion('b2b_data');

  // Anonymize product reviews (keep content, remove PII)
  await supabaseAdmin.from('product_reviews')
    .update({ author_name: 'Utilisateur supprimé', author_email: null })
    .eq('user_id', userId);
  await logDeletion('product_reviews_anonymized');

  // Anonymize blog comments
  await supabaseAdmin.from('blog_comments')
    .update({ author_name: 'Utilisateur supprimé', author_email: null })
    .eq('user_id', userId);
  await logDeletion('blog_comments_anonymized');

  // Delete recommendation logs
  await supabaseAdmin.from('recommendation_logs').delete().eq('user_id', userId);
  await logDeletion('recommendation_logs');

  // Update GDPR request
  await supabaseAdmin
    .from('gdpr_requests')
    .update({
      status: 'completed',
      processed_at: new Date().toISOString()
    })
    .eq('user_id', userId)
    .eq('request_type', 'deletion')
    .eq('status', 'processing');

  // Delete auth user
  const { error: deleteError } = await supabaseAdmin.auth.admin.deleteUser(userId!);
  if (deleteError) {
    console.error('Error deleting auth user:', deleteError);
  }
  await logDeletion('auth_user');

  console.log(`GDPR deletion completed for user: ${userId}`);

  return {
    success: true,
    message: 'Votre compte a été supprimé conformément au RGPD'
  };
}));
