import { createHandler } from "../_shared/handler.ts";

Deno.serve(createHandler({
  name: "calculate-rfm-scores",
  auth: "admin",
  rateLimit: { prefix: "calc-rfm", max: 15, windowMs: 60_000 },
}, async ({ supabaseAdmin }) => {
  // Get all users with orders
  const { data: users, error: usersError } = await supabaseAdmin
    .from("orders")
    .select("user_id, total_amount, created_at")
    .order("created_at", { ascending: false });

  if (usersError) throw usersError;

  const userStats = new Map();

  users?.forEach((order) => {
    if (!userStats.has(order.user_id)) {
      userStats.set(order.user_id, {
        orders: [],
        totalSpent: 0,
      });
    }
    const stats = userStats.get(order.user_id);
    stats.orders.push(order);
    stats.totalSpent += parseFloat(order.total_amount);
  });

  const now = new Date();
  const rfmScores = [];

  for (const [userId, stats] of userStats) {
    const lastOrderDate = new Date(stats.orders[0].created_at);
    const daysSinceLastOrder = Math.floor(
      (now.getTime() - lastOrderDate.getTime()) / (1000 * 60 * 60 * 24),
    );

    // Calculate RFM scores (1-5)
    const recencyScore =
      daysSinceLastOrder < 30 ? 5 : daysSinceLastOrder < 90 ? 4 : daysSinceLastOrder < 180 ? 3 : daysSinceLastOrder < 365 ? 2 : 1;
    const frequencyScore =
      stats.orders.length >= 10 ? 5 : stats.orders.length >= 5 ? 4 : stats.orders.length >= 3 ? 3 : stats.orders.length >= 2 ? 2 : 1;
    const monetaryScore =
      stats.totalSpent >= 1000 ? 5 : stats.totalSpent >= 500 ? 4 : stats.totalSpent >= 200 ? 3 : stats.totalSpent >= 100 ? 2 : 1;

    // Determine segment
    let segment = "Nouveau";
    if (recencyScore >= 4 && frequencyScore >= 4 && monetaryScore >= 4) segment = "Champions";
    else if (recencyScore >= 3 && frequencyScore >= 3) segment = "Loyaux";
    else if (recencyScore >= 3 && frequencyScore <= 2) segment = "Prometteurs";
    else if (recencyScore <= 2 && frequencyScore >= 3) segment = "À risque";
    else if (recencyScore <= 2) segment = "Perdus";

    // Calculate churn risk (0-100)
    const churnRisk = Math.min(100, (daysSinceLastOrder / 365) * 100);

    // Estimate lifetime value
    const avgOrderValue = stats.totalSpent / stats.orders.length;
    const lifetimeValue = avgOrderValue * stats.orders.length * 1.5;

    rfmScores.push({
      user_id: userId,
      recency_score: recencyScore,
      frequency_score: frequencyScore,
      monetary_score: monetaryScore,
      rfm_segment: segment,
      total_orders: stats.orders.length,
      total_spent: stats.totalSpent,
      avg_order_value: avgOrderValue,
      last_order_date: lastOrderDate.toISOString(),
      churn_risk: churnRisk,
      lifetime_value_estimate: lifetimeValue,
    });
  }

  // Upsert RFM scores
  const { error: upsertError } = await supabaseAdmin
    .from("customer_rfm_scores")
    .upsert(rfmScores, { onConflict: "user_id" });

  if (upsertError) throw upsertError;

  return { success: true, processed: rfmScores.length };
}));
