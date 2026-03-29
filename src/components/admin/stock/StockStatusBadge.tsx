import { Badge } from "@/components/ui/badge";

const STATUS_CONFIG: Record<string, { label: string; className: string }> = {
  rupture: { label: "Rupture", className: "bg-red-100 text-red-800 border-red-200" },
  critique: { label: "Critique", className: "bg-orange-100 text-orange-800 border-orange-200" },
  faible: { label: "Faible", className: "bg-yellow-100 text-yellow-800 border-yellow-200" },
  ok: { label: "OK", className: "bg-green-100 text-green-800 border-green-200" },
};

interface StockStatusBadgeProps {
  status: string;
}

export function StockStatusBadge({ status }: StockStatusBadgeProps) {
  const config = STATUS_CONFIG[status] ?? STATUS_CONFIG.ok;
  return (
    <Badge variant="outline" className={config.className}>
      {config.label}
    </Badge>
  );
}
