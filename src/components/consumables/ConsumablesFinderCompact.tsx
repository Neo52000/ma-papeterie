import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Printer, Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { usePrinterBrands } from "@/hooks/consumables/usePrinterBrands";
import { usePrinterModels } from "@/hooks/consumables/usePrinterModels";
import { ConsumableSearchBar } from "./ConsumableSearchBar";

export function ConsumablesFinderCompact() {
  const navigate = useNavigate();
  const [brandId, setBrandId] = useState<string | null>(null);
  const [modelId, setModelId] = useState<string | null>(null);
  const [mode, setMode] = useState<"printer" | "reference">("printer");

  const { data: brands = [] } = usePrinterBrands();
  const { data: models = [] } = usePrinterModels(brandId);

  const handleBrandChange = (value: string) => {
    setBrandId(value);
    setModelId(null);
  };

  const handleSearch = () => {
    const brand = brands.find((b) => b.id === brandId);
    const model = models.find((m) => m.id === modelId);

    if (brand && model) {
      navigate(`/consommables/${brand.slug}/${model.slug}`);
    } else if (brand) {
      navigate(`/consommables/${brand.slug}`);
    } else {
      navigate("/consommables");
    }
  };

  return (
    <div className="bg-gradient-to-r from-primary/5 via-primary/10 to-primary/5 rounded-2xl p-6 border border-primary/10">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <Printer className="w-5 h-5 text-primary" />
          <h3 className="font-semibold text-base">
            Trouvez vos consommables en 3 clics
          </h3>
        </div>
        <div className="flex gap-1">
          <Button
            variant={mode === "printer" ? "default" : "ghost"}
            size="sm"
            className="h-7 text-xs"
            onClick={() => setMode("printer")}
          >
            Par imprimante
          </Button>
          <Button
            variant={mode === "reference" ? "default" : "ghost"}
            size="sm"
            className="h-7 text-xs"
            onClick={() => setMode("reference")}
          >
            Par référence
          </Button>
        </div>
      </div>

      {mode === "reference" ? (
        <ConsumableSearchBar />
      ) : (
        <div className="flex flex-col sm:flex-row items-stretch sm:items-end gap-3">
          <div className="flex-1">
            <label className="text-xs font-medium text-muted-foreground mb-1 block">
              1. Marque
            </label>
            <Select value={brandId || undefined} onValueChange={handleBrandChange}>
              <SelectTrigger>
                <SelectValue placeholder="Sélectionnez une marque" />
              </SelectTrigger>
              <SelectContent>
                {brands.map((b) => (
                  <SelectItem key={b.id} value={b.id}>
                    {b.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="flex-1">
            <label className="text-xs font-medium text-muted-foreground mb-1 block">
              2. Modèle
            </label>
            <Select
              value={modelId || undefined}
              onValueChange={setModelId}
              disabled={!brandId}
            >
              <SelectTrigger>
                <SelectValue
                  placeholder={brandId ? "Sélectionnez un modèle" : "Choisissez d'abord la marque"}
                />
              </SelectTrigger>
              <SelectContent>
                {models.map((m) => (
                  <SelectItem key={m.id} value={m.id}>
                    {m.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <Button
            onClick={handleSearch}
            className="sm:w-auto whitespace-nowrap"
            disabled={!brandId}
          >
            <Search className="w-4 h-4 mr-2" />
            3. Voir les consommables
          </Button>
        </div>
      )}
    </div>
  );
}
