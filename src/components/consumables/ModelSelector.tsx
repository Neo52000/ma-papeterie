import { useState, useMemo } from "react";
import { Loader2, Search, ChevronRight } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { usePrinterModels, type PrinterModel } from "@/hooks/consumables/usePrinterModels";

interface ModelSelectorProps {
  brandId: string;
  brandName: string;
  onSelect: (model: PrinterModel) => void;
}

const printerTypeLabels: Record<string, string> = {
  laser: "Laser",
  inkjet: "Jet d'encre",
  multifunction: "Multifonction",
};

export function ModelSelector({ brandId, brandName, onSelect }: ModelSelectorProps) {
  const { data: models = [], isLoading } = usePrinterModels(brandId);
  const [filter, setFilter] = useState("");

  const grouped = useMemo(() => {
    let filtered = models;
    if (filter.trim()) {
      const q = filter.toLowerCase();
      filtered = models.filter(
        (m) =>
          m.name.toLowerCase().includes(q) ||
          (m.series && m.series.toLowerCase().includes(q))
      );
    }

    const groups = new Map<string, PrinterModel[]>();
    for (const model of filtered) {
      const key = model.series || "Autres";
      if (!groups.has(key)) groups.set(key, []);
      groups.get(key)!.push(model);
    }
    return groups;
  }, [models, filter]);

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
          placeholder={`Rechercher un modèle ${brandName}...`}
          className="pl-10"
          value={filter}
          onChange={(e) => setFilter(e.target.value)}
        />
      </div>

      {Array.from(grouped.entries()).map(([series, seriesModels]) => (
        <div key={series} className="space-y-2">
          <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">
            {series}
          </h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
            {seriesModels.map((model) => (
              <button
                key={model.id}
                onClick={() => onSelect(model)}
                className="group flex items-center justify-between gap-3 p-3 rounded-lg border border-border bg-card hover:border-primary/50 hover:shadow-sm transition-all text-left"
              >
                <div className="min-w-0">
                  <p className="text-sm font-medium truncate group-hover:text-primary transition-colors">
                    {model.name}
                  </p>
                  {model.printer_type && (
                    <Badge variant="secondary" className="mt-1 text-[10px]">
                      {printerTypeLabels[model.printer_type] || model.printer_type}
                    </Badge>
                  )}
                </div>
                <ChevronRight className="w-4 h-4 text-muted-foreground shrink-0 group-hover:text-primary transition-colors" />
              </button>
            ))}
          </div>
        </div>
      ))}

      {grouped.size === 0 && (
        <p className="text-center text-sm text-muted-foreground py-8">
          Aucun modèle trouvé.
        </p>
      )}
    </div>
  );
}
