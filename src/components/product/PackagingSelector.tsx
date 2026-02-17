import { Badge } from "@/components/ui/badge";
import { Package } from "lucide-react";

interface Packaging {
  id: string;
  packaging_type: string;
  qty: number;
  ean: string | null;
  weight_gr: number | null;
  dimensions: string | null;
}

interface PackagingSelectorProps {
  packagings: Packaging[];
  selected?: string;
  onSelect: (type: string) => void;
}

const packagingLabels: Record<string, string> = {
  UMV: 'Unité',
  UVE: 'Lot',
  ENV: 'Enveloppe',
  EMB: 'Emballage',
  Palette: 'Palette',
};

export function PackagingSelector({ packagings, selected, onSelect }: PackagingSelectorProps) {
  if (!packagings || packagings.length <= 1) return null;

  return (
    <div className="space-y-2">
      <h3 className="text-sm font-semibold text-foreground flex items-center gap-1.5">
        <Package className="h-4 w-4" />
        Conditionnement
      </h3>
      <div className="flex flex-wrap gap-2">
        {packagings.map((pkg) => {
          const isActive = selected === pkg.packaging_type;
          return (
            <button
              key={pkg.id}
              onClick={() => onSelect(pkg.packaging_type)}
              className={`flex flex-col items-start px-3 py-2 rounded-lg border text-sm transition-all ${
                isActive
                  ? 'border-primary bg-primary/5 text-foreground'
                  : 'border-border bg-card text-muted-foreground hover:border-primary/50'
              }`}
            >
              <span className="font-medium">
                {packagingLabels[pkg.packaging_type] || pkg.packaging_type}
              </span>
              <span className="text-xs">
                x{pkg.qty}
                {pkg.weight_gr && ` · ${pkg.weight_gr}g`}
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
