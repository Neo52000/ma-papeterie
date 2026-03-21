import { useState, useCallback, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { RotateCcw, Printer, ChevronRight, Search, List } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { BrandSelector } from "./BrandSelector";
import { ModelSelector } from "./ModelSelector";
import { ConsumableResults } from "./ConsumableResults";
import { ConsumableSearchBar } from "./ConsumableSearchBar";
import { PopularPrinters } from "./PopularPrinters";
import { useIncrementSearchCount } from "@/hooks/consumables/usePopularPrinters";
import type { PrinterBrand } from "@/hooks/consumables/usePrinterBrands";
import type { PrinterModel } from "@/hooks/consumables/usePrinterModels";

type Step = 1 | 2 | 3;

interface ConsumablesFinderFullProps {
  initialBrand?: PrinterBrand | null;
  initialModel?: PrinterModel | null;
}

export function ConsumablesFinderFull({
  initialBrand = null,
  initialModel = null,
}: ConsumablesFinderFullProps) {
  const navigate = useNavigate();
  const incrementSearchCount = useIncrementSearchCount();

  const computeInitialStep = (): Step => {
    if (initialBrand && initialModel) return 3;
    if (initialBrand) return 2;
    return 1;
  };

  const [step, setStep] = useState<Step>(computeInitialStep);
  const [brand, setBrand] = useState<PrinterBrand | null>(initialBrand ?? null);
  const [model, setModel] = useState<PrinterModel | null>(initialModel ?? null);

  // Sync when route-driven props change
  useEffect(() => {
    if (initialBrand && initialModel) {
      setBrand(initialBrand);
      setModel(initialModel);
      setStep(3);
    } else if (initialBrand) {
      setBrand(initialBrand);
      setModel(null);
      setStep(2);
    } else {
      setBrand(null);
      setModel(null);
      setStep(1);
    }
  }, [initialBrand?.id, initialModel?.id]);

  const reset = useCallback(() => {
    navigate("/consommables");
  }, [navigate]);

  const goToStep = useCallback(
    (target: Step) => {
      if (target < step) {
        if (target === 1) {
          navigate("/consommables");
        } else if (target === 2 && brand) {
          navigate(`/consommables/${brand.slug}`);
        }
      }
    },
    [step, brand, navigate]
  );

  const handleBrandSelect = useCallback(
    (selectedBrand: PrinterBrand) => {
      navigate(`/consommables/${selectedBrand.slug}`);
    },
    [navigate]
  );

  const handleModelSelect = useCallback(
    (selectedModel: PrinterModel) => {
      if (brand) {
        navigate(`/consommables/${brand.slug}/${selectedModel.slug}`);
        // Track popularity (fire-and-forget)
        incrementSearchCount(selectedModel.id);
      }
    },
    [brand, navigate, incrementSearchCount]
  );

  return (
    <div className="space-y-6">
      {/* Tabs: Par imprimante / Par référence */}
      <Tabs defaultValue="printer" className="w-full">
        <TabsList className="grid w-full max-w-md grid-cols-2">
          <TabsTrigger value="printer" className="gap-1.5">
            <List className="w-4 h-4" />
            Par imprimante
          </TabsTrigger>
          <TabsTrigger value="reference" className="gap-1.5">
            <Search className="w-4 h-4" />
            Par référence
          </TabsTrigger>
        </TabsList>

        {/* Tab: Search by reference */}
        <TabsContent value="reference" className="mt-4">
          <p className="text-sm text-muted-foreground mb-3">
            Tapez la référence, le nom ou le code EAN de votre consommable.
          </p>
          <ConsumableSearchBar />
        </TabsContent>

        {/* Tab: Search by printer */}
        <TabsContent value="printer" className="mt-4 space-y-6">
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
              {brand && (
                <>
                  {brand.logo_url && (
                    <img src={brand.logo_url} alt="" className="w-4 h-4 object-contain hidden sm:block" />
                  )}
                  <span className="font-medium hidden sm:inline">: {brand.name}</span>
                </>
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
              <span className="hidden sm:inline">Modèle</span>
              {model && (
                <span className="font-medium hidden sm:inline">: {model.name}</span>
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
              <PopularPrinters />
              <h2 className="text-lg font-semibold mb-2 flex items-center gap-2">
                <Printer className="w-5 h-5 text-primary" />
                Sélectionnez la marque de votre imprimante
              </h2>
              <p className="text-sm text-muted-foreground mb-4">
                Choisissez le fabricant pour trouver les consommables compatibles.
              </p>
              <BrandSelector onSelect={handleBrandSelect} />
            </div>
          )}

          {step === 2 && brand && (
            <div>
              <h2 className="text-lg font-semibold mb-2">
                Sélectionnez votre modèle {brand.name}
              </h2>
              <p className="text-sm text-muted-foreground mb-4">
                Choisissez le modèle exact de votre imprimante.
              </p>
              <ModelSelector
                brandId={brand.id}
                brandName={brand.name}
                onSelect={handleModelSelect}
              />
            </div>
          )}

          {step === 3 && brand && model && (
            <div>
              <h2 className="text-lg font-semibold mb-2">
                Consommables pour {brand.name} {model.name}
              </h2>
              <p className="text-sm text-muted-foreground mb-4">
                Toners, encres, tambours et accessoires compatibles avec votre imprimante.
              </p>
              <ConsumableResults
                modelId={model.id}
                modelName={model.name}
                brandName={brand.name}
              />
            </div>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}
