import { useEffect } from "react";
import { Helmet } from "react-helmet-async";
import { ArrowLeft, Stamp, Check, Image, Package } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import Header from "@/components/layout/Header";
import Footer from "@/components/layout/Footer";
import { useStampDesignerStore } from "@/stores/stampDesignerStore";
import { useStampModelBySlug } from "@/hooks/useStampModels";
import { StampModelGrid } from "@/components/stamp-designer/StampModelGrid";
import { StampDesignerWorkspace } from "@/components/stamp-designer/StampDesignerWorkspace";
import { STAMP_TYPE_LABELS } from "@/components/stamp-designer/constants";

const TamponDesigner = () => {
  const modelSlug = window.location.pathname.split('/tampon-designer/')[1]?.split('/')[0] || undefined;
  const { selectedModel, selectModel, goBackToSelect, step } =
    useStampDesignerStore();
  const { data: preselectedModel } = useStampModelBySlug(modelSlug);

  // If a model slug is in the URL, auto-select it
  useEffect(() => {
    if (preselectedModel && !selectedModel) {
      selectModel(preselectedModel);
    }
  }, [preselectedModel, selectedModel, selectModel]);

  const isDesigning = step !== "select" || !!selectedModel;

  const formattedPrice = selectedModel
    ? new Intl.NumberFormat("fr-FR", {
        style: "currency",
        currency: "EUR",
      }).format(selectedModel.base_price_ttc)
    : "";

  return (
    <>
      <Helmet>
        <title>
          {selectedModel
            ? `Personnaliser ${selectedModel.name} | Ma Papeterie`
            : "Concepteur de tampons personnalisés | Ma Papeterie"}
        </title>
        <meta
          name="description"
          content="Concevez votre tampon personnalisé en ligne. Choisissez votre modèle, ajoutez texte, logo et formes, puis commandez directement."
        />
        <link rel="canonical" href="https://ma-papeterie.fr/tampon-designer" />
      </Helmet>

      <div className="min-h-screen bg-background">
        <Header />

        <main className="container mx-auto px-4 py-6">
          {isDesigning && selectedModel ? (
            <>
              {/* Back link */}
              <Button
                variant="ghost"
                size="sm"
                className="gap-1 text-muted-foreground mb-4 -ml-2"
                onClick={goBackToSelect}
              >
                <ArrowLeft className="h-4 w-4" />
                Retour au catalogue
              </Button>

              {/* Fiche produit */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-8">
                {/* Image */}
                <div className="aspect-[4/3] w-full rounded-lg bg-muted flex items-center justify-center overflow-hidden border">
                  {selectedModel.image_url ? (
                    <img
                      src={selectedModel.image_url}
                      alt={selectedModel.name}
                      className="w-full h-full object-contain p-4"
                    />
                  ) : (
                    <Stamp className="h-24 w-24 text-muted-foreground/40" />
                  )}
                </div>

                {/* Infos */}
                <div className="space-y-4">
                  <div>
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-sm text-muted-foreground uppercase tracking-wide">
                        {selectedModel.brand}
                      </span>
                    </div>
                    <h1 className="text-2xl md:text-3xl font-bold">
                      {selectedModel.name}
                    </h1>
                  </div>

                  <div className="flex flex-wrap gap-2">
                    {STAMP_TYPE_LABELS[selectedModel.type] && (
                      <Badge variant="secondary">
                        {STAMP_TYPE_LABELS[selectedModel.type]}
                      </Badge>
                    )}
                    <Badge variant="outline">
                      {selectedModel.width_mm} × {selectedModel.height_mm} mm
                    </Badge>
                    <Badge variant="outline">
                      Max {selectedModel.max_lines} lignes
                    </Badge>
                  </div>

                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    {selectedModel.supports_logo ? (
                      <>
                        <Check className="h-4 w-4 text-green-600" />
                        Logo supporté
                      </>
                    ) : (
                      <>
                        <Image className="h-4 w-4" />
                        Sans logo
                      </>
                    )}
                  </div>

                  <Separator />

                  <div className="space-y-2">
                    <span className="text-3xl font-bold">{formattedPrice}</span>
                    <p className="text-sm text-muted-foreground">TTC</p>
                  </div>

                  {selectedModel.stock_quantity > 0 ? (
                    <div className="flex items-center gap-1.5 text-sm text-green-700">
                      <Package className="h-4 w-4" />
                      En stock
                    </div>
                  ) : (
                    <div className="flex items-center gap-1.5 text-sm text-red-600">
                      <Package className="h-4 w-4" />
                      Rupture de stock
                    </div>
                  )}

                  {selectedModel.description && (
                    <>
                      <Separator />
                      <p className="text-sm text-muted-foreground leading-relaxed">
                        {selectedModel.description}
                      </p>
                    </>
                  )}
                </div>
              </div>

              {/* Personnalisation heading */}
              <Separator className="mb-6" />
              <h2 className="text-xl font-bold mb-6">
                Personnalisation de la plaque
              </h2>

              {/* Configurateur */}
              <StampDesignerWorkspace />
            </>
          ) : (
            /* Catalog mode */
            <>
              <div className="text-center mb-8">
                <h1 className="text-3xl md:text-4xl font-bold mb-4">
                  Concepteur de tampons personnalisés
                </h1>
                <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
                  Choisissez votre modèle de tampon, puis personnalisez-le avec
                  votre texte, logo et couleurs.
                </p>
              </div>
              <StampModelGrid onSelectModel={selectModel} />
            </>
          )}
        </main>

        <Footer />
      </div>
    </>
  );
};

export default TamponDesigner;
