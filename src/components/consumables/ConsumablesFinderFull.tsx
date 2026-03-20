import { useState, useCallback } from "react";
import { useSearchParams } from "react-router-dom";
import { RotateCcw, Printer, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { BrandSelector } from "./BrandSelector";
import { ModelSelector } from "./ModelSelector";
import { ConsumableResults } from "./ConsumableResults";
import type { PrinterBrand } from "@/hooks/consumables/usePrinterBrands";
import type { PrinterModel } from "@/hooks/consumables/usePrinterModels";

type Step = 1 | 2 | 3;

interface Selection {
  brand: PrinterBrand | null;
  model: PrinterModel | null;
}

export function ConsumablesFinderFull() {
  const [searchParams] = useSearchParams();
  const [step, setStep] = useState<Step>(1);
  const [selection, setSelection] = useState<Selection>({
    brand: null,
    model: null,
  });

  const reset = useCallback(() => {
    setStep(1);
    setSelection({ brand: null, model: null });
  }, []);

  const goToStep = useCallback(
    (target: Step) => {
      if (target < step) {
        if (target === 1) {
          setSelection({ brand: null, model: null });
        } else if (target === 2) {
          setSelection((s) => ({ ...s, model: null }));
        }
        setStep(target);
      }
    },
    [step]
  );

  const handleBrandSelect = useCallback((brand: PrinterBrand) => {
    setSelection({ brand, model: null });
    setStep(2);
  }, []);

  const handleModelSelect = useCallback(
    (model: PrinterModel) => {
      setSelection((s) => ({ ...s, model }));
      setStep(3);
    },
    []
  );

  return (
    <div className="space-y-6">
      {/* Stepper / Breadcrumb */}
      <div className="flex items-center gap-2 text-sm flex-wrap">
        <button
          onClick={() => goToStep(1)}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full transition-colors ${
            step >= 1
              ? "bg-primary text-primary-foreground"
              : "bg-muted text-muted-foreground"
          }`}
        >
          <span className="font-bold">1</span>
          <span className="hidden sm:inline">Marque</span>
          {selection.brand && (
            <span className="font-medium hidden sm:inline">: {selection.brand.name}</span>
          )}
        </button>

        <ChevronRight className="w-4 h-4 text-muted-foreground shrink-0" />

        <button
          onClick={() => goToStep(2)}
          disabled={step < 2}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full transition-colors ${
            step >= 2
              ? "bg-primary text-primary-foreground"
              : "bg-muted text-muted-foreground"
          } disabled:opacity-50 disabled:cursor-not-allowed`}
        >
          <span className="font-bold">2</span>
          <span className="hidden sm:inline">Mod\u00e8le</span>
          {selection.model && (
            <span className="font-medium hidden sm:inline">: {selection.model.name}</span>
          )}
        </button>

        <ChevronRight className="w-4 h-4 text-muted-foreground shrink-0" />

        <div
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full ${
            step >= 3
              ? "bg-primary text-primary-foreground"
              : "bg-muted text-muted-foreground"
          }`}
        >
          <span className="font-bold">3</span>
          <span className="hidden sm:inline">Consommables</span>
        </div>

        {step > 1 && (
          <Button variant="ghost" size="sm" onClick={reset} className="ml-auto">
            <RotateCcw className="w-3.5 h-3.5 mr-1" />
            Recommencer
          </Button>
        )}
      </div>

      {/* Step content */}
      {step === 1 && (
        <div>
          <h2 className="text-lg font-semibold mb-2 flex items-center gap-2">
            <Printer className="w-5 h-5 text-primary" />
            S\u00e9lectionnez la marque de votre imprimante
          </h2>
          <p className="text-sm text-muted-foreground mb-4">
            Choisissez le fabricant pour trouver les consommables compatibles.
          </p>
          <BrandSelector onSelect={handleBrandSelect} />
        </div>
      )}

      {step === 2 && selection.brand && (
        <div>
          <h2 className="text-lg font-semibold mb-2">
            S\u00e9lectionnez votre mod\u00e8le {selection.brand.name}
          </h2>
          <p className="text-sm text-muted-foreground mb-4">
            Choisissez le mod\u00e8le exact de votre imprimante.
          </p>
          <ModelSelector
            brandId={selection.brand.id}
            brandName={selection.brand.name}
            onSelect={handleModelSelect}
          />
        </div>
      )}

      {step === 3 && selection.brand && selection.model && (
        <div>
          <h2 className="text-lg font-semibold mb-2">
            Consommables pour {selection.brand.name} {selection.model.name}
          </h2>
          <p className="text-sm text-muted-foreground mb-4">
            Toners, encres, tambours et accessoires compatibles avec votre imprimante.
          </p>
          <ConsumableResults
            modelId={selection.model.id}
            modelName={selection.model.name}
            brandName={selection.brand.name}
          />
        </div>
      )}
    </div>
  );
}
