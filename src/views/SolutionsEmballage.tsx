import { Helmet } from "react-helmet-async";
import Header from "@/components/layout/Header";
import Footer from "@/components/layout/Footer";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Package, Truck, BadgePercent, ShieldCheck, Phone,
  BookOpen, ArrowDown, Headphones
} from "lucide-react";
import { FlipbookViewer } from "@/components/emballage/FlipbookViewer";
import { EmballageProductGrid } from "@/components/emballage/EmballageProductGrid";

const SolutionsEmballage = () => {
  const serviceSchema = {
    "@context": "https://schema.org",
    "@type": "Service",
    "name": "Solutions d'emballage professionnelles — Ma Papeterie Chaumont",
    "description": "Plus de 1100 références d'emballage professionnel : cartons, protection, adhésifs, expédition. Livraison rapide et prix dégressifs B2B.",
    "provider": {
      "@type": "LocalBusiness",
      "name": "Ma Papeterie",
      "address": {
        "@type": "PostalAddress",
        "addressLocality": "Chaumont",
        "addressRegion": "Haute-Marne",
        "postalCode": "52000",
        "addressCountry": "FR",
      },
    },
    "areaServed": {
      "@type": "City",
      "name": "Chaumont",
    },
    "serviceType": "Fournitures d'emballage professionnel",
  };

  function scrollTo(id: string) {
    document.getElementById(id)?.scrollIntoView({ behavior: "smooth" });
  }

  return (
    <>
      <Helmet>
        <title>Solutions d'emballage professionnelles | Ma Papeterie Chaumont</title>
        <meta
          name="description"
          content="Découvrez nos solutions d'emballage : cartons, papier bulle, adhésifs, enveloppes matelassées. Plus de 1100 références pour professionnels et particuliers à Chaumont."
        />
        <meta name="robots" content="index, follow" />
        <link rel="canonical" href="https://ma-papeterie.fr/solutions-emballage" />
        <script type="application/ld+json">{JSON.stringify(serviceSchema)}</script>
      </Helmet>

      <div className="min-h-screen bg-background">
        <Header />

        <main id="main-content">
          {/* Hero Section */}
          <section className="bg-gradient-to-br from-primary/10 via-background to-secondary/10 py-16 md:py-24">
            <div className="container mx-auto px-4">
              <div className="max-w-4xl mx-auto text-center">
                <Badge variant="secondary" className="mb-4 text-sm">
                  <Package className="h-3.5 w-3.5 mr-1.5" />
                  1 100+ références
                </Badge>
                <h1 className="text-3xl md:text-5xl font-bold text-foreground mb-6 leading-tight">
                  Solutions d'emballage professionnelles
                </h1>
                <p className="text-lg md:text-xl text-muted-foreground mb-8 max-w-2xl mx-auto">
                  Cartons, protections, adhésifs, expédition — tout pour emballer, protéger et expédier
                  vos produits. Catalogue complet avec prix dégressifs pour les professionnels.
                </p>
                <div className="flex flex-col sm:flex-row gap-4 justify-center">
                  <Button size="lg" onClick={() => scrollTo("catalogue-flipbook")}>
                    <BookOpen className="h-4 w-4 mr-2" />
                    Feuilleter le catalogue
                  </Button>
                  <Button size="lg" variant="outline" onClick={() => scrollTo("produits-emballage")}>
                    <ArrowDown className="h-4 w-4 mr-2" />
                    Voir les produits
                  </Button>
                </div>
              </div>
            </div>
          </section>

          {/* Avantages */}
          <section className="py-12 md:py-16">
            <div className="container mx-auto px-4">
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 md:gap-6 max-w-5xl mx-auto">
                <Card className="text-center p-6 hover:shadow-lg transition-shadow">
                  <Package className="h-10 w-10 text-primary mx-auto mb-3" />
                  <h3 className="font-semibold mb-1">Large choix</h3>
                  <p className="text-sm text-muted-foreground">
                    Plus de 1 100 références d'emballage
                  </p>
                </Card>
                <Card className="text-center p-6 hover:shadow-lg transition-shadow">
                  <BadgePercent className="h-10 w-10 text-primary mx-auto mb-3" />
                  <h3 className="font-semibold mb-1">Prix dégressifs</h3>
                  <p className="text-sm text-muted-foreground">
                    Tarifs B2B attractifs sur volume
                  </p>
                </Card>
                <Card className="text-center p-6 hover:shadow-lg transition-shadow">
                  <Truck className="h-10 w-10 text-primary mx-auto mb-3" />
                  <h3 className="font-semibold mb-1">Livraison rapide</h3>
                  <p className="text-sm text-muted-foreground">
                    Expédition sous 24-48h
                  </p>
                </Card>
                <Card className="text-center p-6 hover:shadow-lg transition-shadow">
                  <Headphones className="h-10 w-10 text-primary mx-auto mb-3" />
                  <h3 className="font-semibold mb-1">Conseil expert</h3>
                  <p className="text-sm text-muted-foreground">
                    Accompagnement personnalisé
                  </p>
                </Card>
              </div>
            </div>
          </section>

          {/* Catalogue Flipbook */}
          <section id="catalogue-flipbook" className="py-12 md:py-16 bg-muted/30">
            <div className="container mx-auto px-4">
              <div className="text-center mb-8">
                <h2 className="text-2xl md:text-3xl font-bold mb-3">
                  Feuilletez notre catalogue emballage
                </h2>
                <p className="text-muted-foreground max-w-xl mx-auto">
                  Parcourez notre catalogue interactif pour découvrir l'ensemble de nos solutions d'emballage.
                </p>
              </div>
              <div className="max-w-4xl mx-auto">
                <FlipbookViewer
                  pdfUrl="https://mgojmkzovqgpipybelrr.supabase.co/storage/v1/object/public/catalogues/Catalogue%20Emballage.pdf"
                  title="Catalogue Solutions d'emballage — Ma Papeterie"
                />
              </div>
            </div>
          </section>

          {/* Grille Produits */}
          <section id="produits-emballage" className="py-12 md:py-16">
            <div className="container mx-auto px-4">
              <div className="text-center mb-8">
                <h2 className="text-2xl md:text-3xl font-bold mb-3">
                  Nos produits d'emballage
                </h2>
                <p className="text-muted-foreground max-w-xl mx-auto">
                  Parcourez notre sélection complète de solutions d'emballage, filtrez par catégorie et ajoutez directement au panier.
                </p>
              </div>
              <EmballageProductGrid />
            </div>
          </section>

          {/* CTA B2B */}
          <section className="py-12 md:py-16 bg-primary text-primary-foreground">
            <div className="container mx-auto px-4">
              <div className="max-w-3xl mx-auto text-center">
                <ShieldCheck className="h-12 w-12 mx-auto mb-4 opacity-90" />
                <h2 className="text-2xl md:text-3xl font-bold mb-4">
                  Besoin d'un devis pour votre entreprise ?
                </h2>
                <p className="text-lg mb-8 opacity-90">
                  Nous proposons des tarifs dégressifs, des conditions de paiement adaptées et un accompagnement dédié pour les professionnels.
                </p>
                <div className="flex flex-col sm:flex-row gap-4 justify-center">
                  <Button size="lg" variant="secondary" asChild>
                    <a href="/contact">
                      <Phone className="h-4 w-4 mr-2" />
                      Demander un devis
                    </a>
                  </Button>
                  <Button size="lg" variant="outline" className="border-primary-foreground/30 text-primary-foreground hover:bg-primary-foreground/10" asChild>
                    <a href="/pack-pro-local-chaumont">
                      <Package className="h-4 w-4 mr-2" />
                      Découvrir le Pack Pro
                    </a>
                  </Button>
                </div>
              </div>
            </div>
          </section>
        </main>

        <Footer />
      </div>
    </>
  );
};

export default SolutionsEmballage;
