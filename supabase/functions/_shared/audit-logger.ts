import { SupabaseClient } from "https://esm.sh/@supabase/supabase-js@2.33.1";

export interface AuditLogEntry {
  action: "INSERT" | "UPDATE" | "DELETE";
  resourceType: string;
  resourceId: string;
  changes?: Record<string, any>;
  metadata?: Record<string, any>;
}

/**
 * Log administrative action to audit_logs table
 * Used for GDPR compliance and security monitoring
 *
 * @param client Supabase client instance
 * @param userId Admin user ID
 * @param userEmail Admin user email
 * @param entry Audit log entry
 *
 * @example
 * await logAuditAction(client, userId, email, {
 *   action: "DELETE",
 *   resourceType: "product",
 *   resourceId: productId,
 *   changes: { before: oldProduct, after: null },
 *   metadata: { reason: "Out of stock" }
 * });
 */
export async function logAuditAction(
  client: SupabaseClient,
  userId: string,
  userEmail: string,
  entry: AuditLogEntry
): Promise<void> {
  try {
    await client.from("audit_logs").insert({
      admin_id: userId,
      admin_email: userEmail,
      action: entry.action,
      resource_type: entry.resourceType,
      resource_id: entry.resourceId,
      changes: entry.changes || null,
      metadata: {
        ...entry.metadata,
        logged_at: new Date().toISOString(),
      },
    });
  } catch (err) {
    // Log errors but don't throw — audit logging shouldn't block operations
    console.error("[AUDIT LOG ERROR]", {
      action: entry.action,
      resourceType: entry.resourceType,
      resourceId: entry.resourceId,
      error: err instanceof Error ? err.message : String(err),
    });
  }
}

/**
 * Retrieve audit logs for a specific resource
 *
 * @param client Supabase client instance
 * @param resourceType Type of resource (e.g., "product")
 * @param resourceId ID of the resource
 *
 * @example
 * const logs = await getAuditTrail(client, "product", productId);
 */
export async function getAuditTrail(
  client: SupabaseClient,
  resourceType: string,
  resourceId: string
) {
  const { data, error } = await client
    .from("audit_logs")
    .select("*")
    .eq("resource_type", resourceType)
    .eq("resource_id", resourceId)
    .order("created_at", { ascending: false });

  if (error) throw error;
  return data;
}

/**
 * Retrieve audit logs for a specific admin user
 *
 * @param client Supabase client instance
 * @param adminId Admin user ID
 * @param limit Number of records to retrieve (default: 100)
 *
 * @example
 * const userLogs = await getAdminLogs(client, adminUserId, 50);
 */
export async function getAdminLogs(
  client: SupabaseClient,
  adminId: string,
  limit: number = 100
) {
  const { data, error } = await client
    .from("audit_logs")
    .select("*")
    .eq("admin_id", adminId)
    .order("created_at", { ascending: false })
    .limit(limit);

  if (error) throw error;
  return data;
}
