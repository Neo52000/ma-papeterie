import { createHandler } from "../_shared/handler.ts";

Deno.serve(createHandler({
  name: "crm-task-overdue",
  auth: "admin-or-secret",
  rateLimit: { prefix: "crm-overdue", max: 10, windowMs: 60_000 },
}, async ({ supabaseAdmin }) => {
  // Mark overdue tasks
  const today = new Date().toISOString().split("T")[0];

  const { data: overdueTasks, error: updateError } = await supabaseAdmin
    .from("crm_tasks")
    .update({ status: "overdue" })
    .eq("status", "pending")
    .lt("due_date", today)
    .select("id, title, profile_id, pipeline_id, quote_id");

  if (updateError) throw updateError;

  const overdueCount = overdueTasks?.length ?? 0;

  // Log execution
  await supabaseAdmin.from("cron_job_logs").insert({
    function_name: "crm-task-overdue",
    status: "success",
    details: JSON.stringify({ overdue_count: overdueCount }),
    executed_at: new Date().toISOString(),
  }).catch(() => {/* ignore log errors */});

  return {
    success: true,
    overdue_count: overdueCount,
    tasks: overdueTasks ?? [],
  };
}));
