import { useEffect } from "react";
import { useParams } from "react-router-dom";
import { Helmet } from "react-helmet-async";
import Header from "@/components/layout/Header";
import Footer from "@/components/layout/Footer";
import { useStampDesignerStore } from "@/stores/stampDesignerStore";
import { useStampModelBySlug } from "@/hooks/useStampModels";
import { StampModelGrid } from "@/components/stamp-designer/StampModelGrid";
import { StampDesignerWorkspace } from "@/components/stamp-designer/StampDesignerWorkspace";

const TamponDesigner = () => {
  const { modelSlug } = useParams<{ modelSlug?: string }>();
  const { selectedModel, selectModel, step } = useStampDesignerStore();
  const { data: preselectedModel } = useStampModelBySlug(modelSlug);

  // If a model slug is in the URL, auto-select it
  useEffect(() => {
    if (preselectedModel && !selectedModel) {
      selectModel(preselectedModel);
    }
  }, [preselectedModel, selectedModel, selectModel]);

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

        <main className="container mx-auto px-4 py-8">
          {step === "select" && !selectedModel ? (
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
          ) : (
            <StampDesignerWorkspace />
          )}
        </main>

        <Footer />
      </div>
    </>
  );
};

export default TamponDesigner;
