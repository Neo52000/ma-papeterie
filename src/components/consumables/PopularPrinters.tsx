import { useNavigate } from "react-router-dom";
import { TrendingUp, Printer } from "lucide-react";
import { usePopularPrinters } from "@/hooks/consumables/usePopularPrinters";

export function PopularPrinters() {
  const navigate = useNavigate();
  const { data: printers = [] } = usePopularPrinters(8);

  if (printers.length === 0) return null;

  return (
    <div className="mb-6">
      <h3 className="text-sm font-semibold text-muted-foreground mb-3 flex items-center gap-1.5">
        <TrendingUp className="w-4 h-4" />
        Imprimantes populaires
      </h3>
      <div className="flex flex-wrap gap-2">
        {printers.map((p) => (
          <button
            key={p.id}
            onClick={() => navigate(`/consommables/${p.brand_slug}/${p.slug}`)}
            className="group flex items-center gap-2 px-3 py-2 rounded-lg border border-border bg-card hover:border-primary/50 hover:shadow-sm transition-all"
          >
            {p.brand_logo_url ? (
              <img
                src={p.brand_logo_url}
                alt={p.brand_name}
                className="w-5 h-5 object-contain"
                loading="lazy"
              />
            ) : (
              <Printer className="w-4 h-4 text-primary" />
            )}
            <span className="text-sm group-hover:text-primary transition-colors">
              {p.brand_name} {p.name}
            </span>
          </button>
        ))}
      </div>
    </div>
  );
}
