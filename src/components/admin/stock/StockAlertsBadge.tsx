import { useStockAlertsCount } from "@/hooks/admin/useStockAlerts";

export function StockAlertsBadge() {
  const { data: count } = useStockAlertsCount();

  if (!count || count === 0) return null;

  return (
    <span className="ml-auto flex h-4 min-w-4 items-center justify-center rounded-full bg-destructive px-1 text-[10px] font-bold text-destructive-foreground">
      {count}
    </span>
  );
}
