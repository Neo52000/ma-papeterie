import { useParams, Navigate } from "react-router-dom";
import { Helmet } from "react-helmet-async";
import Header from "@/components/layout/Header";
import Footer from "@/components/layout/Footer";
import { ConsumablesFinderFull } from "@/components/consumables/ConsumablesFinderFull";
import { useConsumableRouteInit } from "@/hooks/consumables/useConsumableRouteInit";
import { Loader2 } from "lucide-react";

function buildSeoTitle(brandName?: string, modelName?: string): string {
  if (brandName && modelName) {
    return `Consommables ${brandName} ${modelName} | Toner & encre — Ma Papeterie`;
  }
  if (brandName) {
    return `Consommables ${brandName} | Toner, encre & cartouches — Ma Papeterie`;
  }
  return "Consommables informatiques | Toner, encre & cartouches — Ma Papeterie";
}

function buildSeoDescription(brandName?: string, modelName?: string): string {
  if (brandName && modelName) {
    return `Toners, cartouches d'encre et tambours compatibles avec votre ${brandName} ${modelName}. Originaux et compatibles, livraison rapide.`;
  }
  if (brandName) {
    return `Trouvez les consommables pour votre imprimante ${brandName} : toner, cartouches d'encre, tambours. Originaux et compatibles.`;
  }
  return "Trouvez vos consommables d'imprimante en 3 clics : toner, cartouches d'encre, tambours. HP, Canon, Epson, Brother et plus. Originaux et compatibles.";
}

function buildCanonical(brandSlug?: string, modelSlug?: string): string {
  if (brandSlug && modelSlug) {
    return `https://ma-papeterie.fr/consommables/${brandSlug}/${modelSlug}`;
  }
  if (brandSlug) {
    return `https://ma-papeterie.fr/consommables/${brandSlug}`;
  }
  return "https://ma-papeterie.fr/consommables";
}

function buildBreadcrumbSchema(brandName?: string, brandSlug?: string, modelName?: string, modelSlug?: string) {
  const items: Array<{ "@type": string; position: number; name: string; item?: string }> = [
    { "@type": "ListItem", position: 1, name: "Accueil", item: "https://ma-papeterie.fr" },
    { "@type": "ListItem", position: 2, name: "Consommables", item: "https://ma-papeterie.fr/consommables" },
  ];
  if (brandName && brandSlug) {
    items.push({
      "@type": "ListItem",
      position: 3,
      name: brandName,
      item: `https://ma-papeterie.fr/consommables/${brandSlug}`,
    });
  }
  if (modelName && brandSlug && modelSlug) {
    items.push({
      "@type": "ListItem",
      position: 4,
      name: modelName,
      item: `https://ma-papeterie.fr/consommables/${brandSlug}/${modelSlug}`,
    });
  }
  return {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: items,
  };
}

function buildHeading(brandName?: string, modelName?: string): string {
  if (brandName && modelName) {
    return `Consommables ${brandName} ${modelName}`;
  }
  if (brandName) {
    return `Consommables ${brandName}`;
  }
  return "Consommables informatiques";
}

function buildSubHeading(brandName?: string, modelName?: string): string {
  if (brandName && modelName) {
    return `Toners, cartouches d'encre, tambours et accessoires compatibles avec votre ${brandName} ${modelName}.`;
  }
  if (brandName) {
    return `Sélectionnez votre modèle d'imprimante ${brandName} pour trouver les consommables compatibles.`;
  }
  return "Trouvez les toners, cartouches d'encre et tambours compatibles avec votre imprimante en 3 clics.";
}

const Consommables = () => {
  const { brandSlug, modelSlug } = useParams<{ brandSlug?: string; modelSlug?: string }>();
  const { brand, model, isLoading, notFound } = useConsumableRouteInit(brandSlug, modelSlug);

  if (notFound) {
    return <Navigate to="/consommables" replace />;
  }

  if (isLoading && brandSlug) {
    return (
      <div className="min-h-screen bg-background">
        <Header />
        <main className="container mx-auto px-4 py-8 max-w-6xl">
          <div className="flex items-center justify-center py-20">
            <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
          </div>
        </main>
        <Footer />
      </div>
    );
  }

  const seoTitle = buildSeoTitle(brand?.name, model?.name);
  const seoDescription = buildSeoDescription(brand?.name, model?.name);
  const canonical = buildCanonical(brandSlug, modelSlug);
  const breadcrumbSchema = buildBreadcrumbSchema(brand?.name, brandSlug, model?.name, modelSlug);

  return (
    <div className="min-h-screen bg-background">
      <Helmet>
        <title>{seoTitle}</title>
        <meta name="description" content={seoDescription} />
        <meta
          name="keywords"
          content={`toner, cartouche encre, consommable imprimante, ${brand?.name || "HP, Canon, Epson, Brother"}, compatible, original`}
        />
        <link rel="canonical" href={canonical} />
        <meta property="og:title" content={seoTitle} />
        <meta property="og:description" content={seoDescription} />
        <meta property="og:type" content="website" />
        <meta property="og:url" content={canonical} />
        <meta property="og:image" content="https://ma-papeterie.fr/og-image.png" />
        <script type="application/ld+json">{JSON.stringify(breadcrumbSchema)}</script>
      </Helmet>
      <Header />
      <main id="main-content" className="container mx-auto px-4 py-8 max-w-6xl">
        <div className="mb-8">
          <h1 className="text-2xl md:text-3xl font-bold">
            {buildHeading(brand?.name, model?.name)}
          </h1>
          <p className="text-muted-foreground mt-2">
            {buildSubHeading(brand?.name, model?.name)}
          </p>
        </div>
        <ConsumablesFinderFull initialBrand={brand} initialModel={model} />
      </main>
      <Footer />
    </div>
  );
};

export default Consommables;
