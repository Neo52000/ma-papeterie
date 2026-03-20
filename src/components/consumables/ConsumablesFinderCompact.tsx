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

export function ConsumablesFinderCompact() {
  const navigate = useNavigate();
  const [brandId, setBrandId] = useState<string | null>(null);
  const [modelId, setModelId] = useState<string | null>(null);

  const { data: brands = [] } = usePrinterBrands();
  const { data: models = [] } = usePrinterModels(brandId);

  const handleBrandChange = (value: string) => {
    setBrandId(value);
    setModelId(null);
  };

  const handleSearch = () => {
    if (brandId && modelId) {
      const brand = brands.find((b) => b.id === brandId);
      const model = models.find((m) => m.id === modelId);
      navigate(
        `/consommables?brand=${brand?.slug || brandId}&model=${model?.slug || modelId}`
      );
    } else if (brandId) {
      const brand = brands.find((b) => b.id === brandId);
      navigate(`/consommables?brand=${brand?.slug || brandId}`);
    } else {
      navigate("/consommables");
    }
  };

  return (
    <div className="bg-gradient-to-r from-primary/5 via-primary/10 to-primary/5 rounded-2xl p-6 border border-primary/10">
      <div className="flex items-center gap-2 mb-4">
        <Printer className="w-5 h-5 text-primary" />
        <h3 className="font-semibold text-base">
          Trouvez vos consommables en 3 clics
        </h3>
      </div>

      <div className="flex flex-col sm:flex-row items-stretch sm:items-end gap-3">
        <div className="flex-1">
          <label className="text-xs font-medium text-muted-foreground mb-1 block">
            1. Marque
          </label>
          <Select value={brandId || undefined} onValueChange={handleBrandChange}>
            <SelectTrigger>
              <SelectValue placeholder="S\u00e9lectionnez une marque" />
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
            2. Mod\u00e8le
          </label>
          <Select
            value={modelId || undefined}
            onValueChange={setModelId}
            disabled={!brandId}
          >
            <SelectTrigger>
              <SelectValue
                placeholder={brandId ? "S\u00e9lectionnez un mod\u00e8le" : "Choisissez d'abord la marque"}
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
    </div>
  );
}
