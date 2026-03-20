import { useState, useMemo } from "react";
import { Loader2, Search, Printer } from "lucide-react";
import { Input } from "@/components/ui/input";
import { usePrinterBrands, type PrinterBrand } from "@/hooks/consumables/usePrinterBrands";

interface BrandSelectorProps {
  onSelect: (brand: PrinterBrand) => void;
}

export function BrandSelector({ onSelect }: BrandSelectorProps) {
  const { data: brands = [], isLoading } = usePrinterBrands();
  const [filter, setFilter] = useState("");

  const filtered = useMemo(() => {
    if (!filter.trim()) return brands;
    const q = filter.toLowerCase();
    return brands.filter((b) => b.name.toLowerCase().includes(q));
  }, [brands, filter]);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="relative max-w-sm">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
        <Input
          type="search"
          placeholder="Filtrer les marques..."
          className="pl-10"
          value={filter}
          onChange={(e) => setFilter(e.target.value)}
        />
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3">
        {filtered.map((brand) => (
          <button
            key={brand.id}
            onClick={() => onSelect(brand)}
            className="group flex flex-col items-center gap-2 p-4 rounded-xl border border-border bg-card hover:border-primary/50 hover:shadow-md transition-all text-center"
          >
            {brand.logo_url ? (
              <img
                src={brand.logo_url}
                alt={brand.name}
                className="w-12 h-12 object-contain"
                loading="lazy"
              />
            ) : (
              <div className="w-12 h-12 rounded-lg bg-primary/10 flex items-center justify-center">
                <Printer className="w-6 h-6 text-primary" />
              </div>
            )}
            <span className="text-sm font-medium group-hover:text-primary transition-colors">
              {brand.name}
            </span>
          </button>
        ))}
      </div>

      {filtered.length === 0 && (
        <p className="text-center text-sm text-muted-foreground py-8">
          Aucune marque ne correspond à votre recherche.
        </p>
      )}
    </div>
  );
}
