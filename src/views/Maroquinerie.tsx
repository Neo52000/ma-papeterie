import { Helmet } from "react-helmet-async";
import Header from "@/components/layout/Header";
import Footer from "@/components/layout/Footer";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Link } from "react-router-dom";
import {
  Briefcase, Truck, Award, ShoppingBag, Phone,
  BookOpen, ArrowDown, Headphones, Package,
} from "lucide-react";
import { FlipbookViewer } from "@/components/emballage/FlipbookViewer";
import { MaroquinerieProductGrid } from "@/components/maroquinerie/MaroquinerieProductGrid";
import { useMaroquinerieCount } from "@/hooks/useMaroquinerieProducts";

const Maroquinerie = () => {
  const { data: productCount } = useMaroquinerieCount();

  const serviceSchema = {
    "@context": "https://schema.org",
    "@type": "Service",
    "name": "Maroquinerie, Bagagerie & Accessoires — Ma Papeterie Chaumont",
    "description": `Plus de ${productCount ?? 870} références de maroquinerie et bagagerie : sacs à dos, sacoches, trousses, valises. Marques Antartik, Eastpak, Liderpapel et plus.`,
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
    "serviceType": "Maroquinerie et bagagerie",
  };

  function scrollTo(id: string) {
    document.getElementById(id)?.scrollIntoView({ behavior: "smooth" });
  }

  return (
    <>
      <Helmet>
        <title>Maroquinerie, Bagagerie & Accessoires | Ma Papeterie Chaumont</title>
        <meta
          name="description"
          content="Découvrez notre sélection de maroquinerie et bagagerie : sacs à dos, sacoches, trousses, valises, porte-documents. Plus de 870 références Antartik, Eastpak, Liderpapel à Chaumont."
        />
        <meta name="robots" content="index, follow" />
        <link rel="canonical" href="https://ma-papeterie.fr/maroquinerie-bagagerie-accessoires" />
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
                  <Briefcase className="h-3.5 w-3.5 mr-1.5" />
                  {productCount ?? "870"}+ références
                </Badge>
                <h1 className="text-3xl md:text-5xl font-bold text-foreground mb-6 leading-tight">
                  Maroquinerie, Bagagerie & Accessoires
                </h1>
                <p className="text-lg md:text-xl text-muted-foreground mb-8 max-w-2xl mx-auto">
                  Sacs à dos, sacoches, trousses, valises, porte-documents — tout pour transporter
                  et protéger vos affaires. Antartik, Eastpak, Liderpapel et bien d'autres marques.
                </p>
                <div className="flex flex-col sm:flex-row gap-4 justify-center">
                  <Button size="lg" onClick={() => scrollTo("catalogue-flipbook")}>
                    <BookOpen className="h-4 w-4 mr-2" />
                    Feuilleter le catalogue
                  </Button>
                  <Button size="lg" variant="outline" onClick={() => scrollTo("produits-maroquinerie")}>
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
                  <Award className="h-10 w-10 text-primary mx-auto mb-3" />
                  <h3 className="font-semibold mb-1">Marques de qualité</h3>
                  <p className="text-sm text-muted-foreground">
                    Antartik, Eastpak, Liderpapel, Exacompta…
                  </p>
                </Card>
                <Card className="text-center p-6 hover:shadow-lg transition-shadow">
                  <ShoppingBag className="h-10 w-10 text-primary mx-auto mb-3" />
                  <h3 className="font-semibold mb-1">Large choix</h3>
                  <p className="text-sm text-muted-foreground">
                    Plus de {productCount ?? 870} références disponibles
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
                  Catalogue Maroquinerie & Accessoires Antartik
                </h2>
                <p className="text-muted-foreground max-w-xl mx-auto">
                  Parcourez notre catalogue interactif pour découvrir l'ensemble de notre gamme maroquinerie et bagagerie.
                </p>
              </div>
              <div className="max-w-4xl mx-auto">
                <FlipbookViewer
                  /* pdfUrl sera ajouté une fois le PDF uploadé sur Supabase Storage */
                  title="Catalogue Maroquinerie & Accessoires Antartik — Ma Papeterie"
                />
              </div>
            </div>
          </section>

          {/* Grille Produits */}
          <section id="produits-maroquinerie" className="py-12 md:py-16">
            <div className="container mx-auto px-4">
              <div className="text-center mb-8">
                <h2 className="text-2xl md:text-3xl font-bold mb-3">
                  Nos produits maroquinerie & bagagerie
                </h2>
                <p className="text-muted-foreground max-w-xl mx-auto">
                  Parcourez notre sélection complète, filtrez par type de produit et ajoutez directement au panier.
                </p>
              </div>
              <MaroquinerieProductGrid />
            </div>
          </section>

          {/* CTA B2B */}
          <section className="py-12 md:py-16 bg-primary text-primary-foreground">
            <div className="container mx-auto px-4">
              <div className="max-w-3xl mx-auto text-center">
                <Briefcase className="h-12 w-12 mx-auto mb-4 opacity-90" />
                <h2 className="text-2xl md:text-3xl font-bold mb-4">
                  Besoin d'un devis pour votre entreprise ?
                </h2>
                <p className="text-lg mb-8 opacity-90">
                  Nous proposons des tarifs dégressifs, des conditions de paiement adaptées et un accompagnement dédié pour les professionnels.
                </p>
                <div className="flex flex-col sm:flex-row gap-4 justify-center">
                  <Button size="lg" variant="secondary" asChild>
                    <Link to="/contact">
                      <Phone className="h-4 w-4 mr-2" />
                      Demander un devis
                    </Link>
                  </Button>
                  <Button size="lg" variant="outline" className="border-primary-foreground/30 text-primary-foreground hover:bg-primary-foreground/10" asChild>
                    <Link to="/pack-pro-local-chaumont">
                      <Package className="h-4 w-4 mr-2" />
                      Découvrir le Pack Pro
                    </Link>
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

export default Maroquinerie;
