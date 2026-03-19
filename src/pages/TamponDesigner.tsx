import { useEffect } from "react";
import { useParams, Link } from "react-router-dom";
import { Helmet } from "react-helmet-async";
import { ShoppingCart } from "lucide-react";
import { Button } from "@/components/ui/button";
import Header from "@/components/layout/Header";
import Footer from "@/components/layout/Footer";
import { useStampDesignerStore } from "@/stores/stampDesignerStore";
import { useStampModelBySlug } from "@/hooks/useStampModels";
import { StampModelGrid } from "@/components/stamp-designer/StampModelGrid";
import { StampDesignerWorkspace } from "@/components/stamp-designer/StampDesignerWorkspace";
import { useCart } from "@/contexts/CartContext";

const TamponDesigner = () => {
  const { modelSlug } = useParams<{ modelSlug?: string }>();
  const { selectedModel, selectModel, step } = useStampDesignerStore();
  const { data: preselectedModel } = useStampModelBySlug(modelSlug);
  const { state: cartState } = useCart();

  // If a model slug is in the URL, auto-select it
  useEffect(() => {
    if (preselectedModel && !selectedModel) {
      selectModel(preselectedModel);
    }
  }, [preselectedModel, selectedModel, selectModel]);

  const isDesigning = step !== "select" || !!selectedModel;

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

      {isDesigning ? (
        /* Design mode — minimal chrome, full focus on configurator */
        <div className="min-h-screen flex flex-col bg-white">
          {/* Minimal header */}
          <header className="border-b px-4 py-2 flex items-center justify-between shrink-0">
            <Link to="/" className="flex items-center">
              <img
                src="/logo.svg"
                alt="Ma Papeterie"
                className="h-8"
                onError={(e) => {
                  // Fallback if logo.svg doesn't exist
                  (e.target as HTMLImageElement).style.display = "none";
                  (e.target as HTMLImageElement).parentElement!.innerHTML =
                    '<span class="font-bold text-lg">Ma Papeterie</span>';
                }}
              />
            </Link>
            <Button variant="ghost" size="sm" className="relative" asChild>
              <Link to="/panier">
                <ShoppingCart className="h-5 w-5" />
                {cartState.items.length > 0 && (
                  <span className="absolute -top-1 -right-1 bg-primary text-primary-foreground text-xs rounded-full h-4 w-4 flex items-center justify-center">
                    {cartState.items.length}
                  </span>
                )}
              </Link>
            </Button>
          </header>

          {/* Full-width workspace */}
          <main className="flex-1">
            <StampDesignerWorkspace />
          </main>
        </div>
      ) : (
        /* Catalog mode — normal page with header/footer */
        <div className="min-h-screen bg-background">
          <Header />
          <main className="container mx-auto px-4 py-8">
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
          </main>
          <Footer />
        </div>
      )}
    </>
  );
};

export default TamponDesigner;
