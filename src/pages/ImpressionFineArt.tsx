import { Helmet } from "react-helmet-async";
import { Link } from "react-router-dom";
import Header from "@/components/layout/Header";
import Footer from "@/components/layout/Footer";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb";
import {
  Image,
  CheckCircle,
  Phone,
  Send,
  Shield,
  Eye,
  Award,
  Camera,
  Palette,
  Gift,
  Building2,
  Upload,
  Search,
  Printer,
  Package,
} from "lucide-react";

const ImpressionFineArt = () => {
  const faqData = [
    {
      question: "Qu'est-ce que l'impression Fine Art ?",
      answer: "L'impression Fine Art (ou tirage giclée) est une technique d'impression haut de gamme utilisant des encres pigmentées sur des papiers d'art premium. Avec une résolution de 2400 dpi et 12 encres pigmentées, elle garantit une reproduction fidèle et une durabilité de plus de 70 ans.",
    },
    {
      question: "Quels papiers sont disponibles pour l'impression Fine Art ?",
      answer: "Nous proposons une sélection de papiers premium : Hahnemühle Photo Rag (papier coton d'art), Canon Pro Glossy (300g/m², brillant professionnel) et Ilford Studio Satin (250g/m², finition satin). Chaque papier apporte un rendu différent — notre équipe vous conseille selon votre projet.",
    },
    {
      question: "Quelle résolution est nécessaire pour un tirage Fine Art ?",
      answer: "Pour un rendu optimal, nous recommandons une résolution de 300 dpi à la taille d'impression souhaitée. Notre équipe vérifie gratuitement votre fichier et vous alerte si la résolution est insuffisante, avec des recommandations de format adaptées.",
    },
    {
      question: "Quelle est la durée de vie d'un tirage Fine Art ?",
      answer: "Grâce aux encres pigmentées utilisées, nos tirages Fine Art sont garantis résistants à la lumière et aux UV pendant plus de 70 ans (garantie fabricant). C'est la même technologie utilisée par les musées et galeries.",
    },
    {
      question: "Peut-on encadrer un tirage Fine Art ?",
      answer: "Absolument. Le tirage Fine Art est le support idéal pour l'encadrement. Nous pouvons vous conseiller sur les marges et les formats adaptés. N'hésitez pas à nous demander un devis incluant l'encadrement.",
    },
  ];

  const serviceSchema = {
    "@context": "https://schema.org",
    "@type": "Service",
    "name": "Impression Fine Art — Tirage photo qualité galerie",
    "description":
      "Impression Fine Art haut de gamme : 2400 dpi, encres pigmentées 70+ ans, papiers d'art Hahnemühle, Canon, Ilford. Qualité musée et galerie.",
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
    "areaServed": { "@type": "Country", "name": "France" },
    "serviceType": "Impression Fine Art",
  };

  const faqSchema = {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    "mainEntity": faqData.map((item) => ({
      "@type": "Question",
      "name": item.question,
      "acceptedAnswer": { "@type": "Answer", "text": item.answer },
    })),
  };

  const papers = [
    {
      name: "Hahnemühle Photo Rag",
      type: "Papier coton d'art",
      description:
        "Le standard des galeries. Surface mate finement texturée, rendu exceptionnel pour la photographie et l'art. 100% coton, sans acide.",
      finishes: ["Mat texturé"],
    },
    {
      name: "Canon Pro Glossy",
      type: "300 g/m² — Brillant professionnel",
      description:
        "Papier photo brillant professionnel. Couleurs vives, noirs profonds, excellent contraste. Idéal pour les photos avec des couleurs intenses.",
      finishes: ["Brillant"],
    },
    {
      name: "Ilford Studio Satin",
      type: "250 g/m² — Satin studio",
      description:
        "Finition satin douce et élégante, entre le brillant et le mat. Polyvalent, réduit les reflets tout en gardant des couleurs riches.",
      finishes: ["Satin"],
    },
  ];

  const finishes = [
    { name: "Satin", desc: "Finition douce, anti-reflets, rendu élégant" },
    { name: "Brillant", desc: "Éclat maximal, couleurs vives, noirs profonds" },
    { name: "Pearl", desc: "Reflet nacré subtil, rendu photographique premium" },
    {
      name: "Metallic Pearl",
      desc: "Éclat métallique, effet tridimensionnel unique",
    },
  ];

  const useCases = [
    {
      icon: Camera,
      title: "Photographes",
      description:
        "Tirez le meilleur de vos clichés avec un rendu digne des plus grandes galeries. Portfolio, exposition, vente de tirages.",
    },
    {
      icon: Palette,
      title: "Artistes & illustrateurs",
      description:
        "Reproduisez vos œuvres numériques ou numérisées avec une fidélité de couleurs exceptionnelle sur papier d'art.",
    },
    {
      icon: Building2,
      title: "Galeries & expositions",
      description:
        "Tirages qualité musée pour expositions permanentes ou temporaires. Durabilité garantie 70+ ans.",
    },
    {
      icon: Gift,
      title: "Cadeaux prestige",
      description:
        "Offrez un tirage d'art personnalisé : un cadeau unique, élégant et durable pour toutes les occasions.",
    },
  ];

  return (
    <>
      <Helmet>
        <title>
          Impression Fine Art | Tirage photo qualité galerie & musée | Ma
          Papeterie
        </title>
        <meta
          name="description"
          content="Impression Fine Art haut de gamme : 2400 dpi, encres pigmentées 70+ ans, papiers Hahnemühle, Canon, Ilford. Tirage photo qualité galerie. Vérification fichier gratuite."
        />
        <meta
          name="keywords"
          content="impression fine art, tirage photo haut de gamme, impression giclée, tirage d'art photo, papier Hahnemühle, impression qualité musée, tirage fine art en ligne"
        />
        <link
          rel="canonical"
          href="https://ma-papeterie.fr/impression-fine-art"
        />
        <meta
          property="og:title"
          content="Impression Fine Art | Tirage photo qualité galerie & musée"
        />
        <meta
          property="og:description"
          content="Tirage Fine Art haut de gamme : 2400 dpi, 12 encres pigmentées, papiers d'art premium. Qualité musée garantie 70+ ans."
        />
        <meta property="og:type" content="website" />
        <meta
          property="og:url"
          content="https://ma-papeterie.fr/impression-fine-art"
        />
        <script type="application/ld+json">
          {JSON.stringify(serviceSchema)}
        </script>
        <script type="application/ld+json">
          {JSON.stringify(faqSchema)}
        </script>
      </Helmet>

      <div className="min-h-screen bg-background">
        <Header />

        <main>
          {/* Breadcrumb */}
          <div className="bg-muted/30 border-b">
            <div className="container mx-auto px-4 py-3">
              <Breadcrumb>
                <BreadcrumbList>
                  <BreadcrumbItem>
                    <BreadcrumbLink asChild>
                      <Link to="/">Accueil</Link>
                    </BreadcrumbLink>
                  </BreadcrumbItem>
                  <BreadcrumbSeparator />
                  <BreadcrumbItem>
                    <BreadcrumbLink asChild>
                      <Link to="/services">Services</Link>
                    </BreadcrumbLink>
                  </BreadcrumbItem>
                  <BreadcrumbSeparator />
                  <BreadcrumbItem>
                    <BreadcrumbPage>Impression Fine Art</BreadcrumbPage>
                  </BreadcrumbItem>
                </BreadcrumbList>
              </Breadcrumb>
            </div>
          </div>

          {/* Hero */}
          <section className="bg-gradient-to-b from-primary/10 to-background py-16">
            <div className="container mx-auto px-4">
              <div className="max-w-4xl mx-auto text-center">
                <Badge variant="secondary" className="mb-4">
                  <Award className="h-3 w-3 mr-1" />
                  Qualité galerie & musée
                </Badge>
                <h1 className="text-3xl md:text-5xl font-bold text-foreground mb-6">
                  Impression Fine Art : la qualité galerie pour vos photos et
                  œuvres
                </h1>
                <p className="text-xl text-muted-foreground mb-8">
                  2400 dpi, encres pigmentées garanties 70+ ans, papiers d'art
                  Hahnemühle — le standard des galeries et des musées, accessible
                  à tous.
                </p>
                <div className="flex flex-col sm:flex-row gap-4 justify-center">
                  <Button asChild size="lg">
                    <Link to="/contact">
                      <Send className="mr-2 h-4 w-4" />
                      Demander un devis gratuit
                    </Link>
                  </Button>
                  <Button asChild size="lg" variant="outline">
                    <a href="tel:0310960224">
                      <Phone className="mr-2 h-4 w-4" />
                      03 10 96 02 24
                    </a>
                  </Button>
                </div>
              </div>
            </div>
          </section>

          {/* Bénéfices */}
          <section className="py-12 md:py-16">
            <div className="container mx-auto px-4">
              <div className="text-center mb-10">
                <h2 className="text-2xl md:text-3xl font-bold text-foreground mb-3">
                  L'excellence de l'impression photographique
                </h2>
              </div>
              <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-6 max-w-5xl mx-auto">
                {[
                  {
                    icon: Image,
                    title: "2400 dpi, 12 encres",
                    desc: "Résolution exceptionnelle et gamme chromatique étendue pour une fidélité de reproduction inégalée.",
                  },
                  {
                    icon: Shield,
                    title: "70+ ans de durabilité",
                    desc: "Encres pigmentées résistantes UV — garantie fabricant. La même technologie que les musées.",
                  },
                  {
                    icon: Eye,
                    title: "Vérification gratuite",
                    desc: "Contrôle de résolution, profil colorimétrique et format avant chaque impression.",
                  },
                  {
                    icon: Award,
                    title: "Papiers d'art premium",
                    desc: "Sélection rigoureuse : Hahnemühle, Canon Pro, Ilford — les marques de référence.",
                  },
                ].map((item) => (
                  <Card key={item.title}>
                    <CardHeader className="text-center">
                      <div className="mx-auto p-3 rounded-lg bg-primary/10 text-primary w-fit mb-2">
                        <item.icon className="h-6 w-6" />
                      </div>
                      <CardTitle className="text-lg">{item.title}</CardTitle>
                    </CardHeader>
                    <CardContent className="text-center text-sm text-muted-foreground">
                      {item.desc}
                    </CardContent>
                  </Card>
                ))}
              </div>
            </div>
          </section>

          {/* Cas d'usage */}
          <section className="py-12 md:py-16 bg-muted/30">
            <div className="container mx-auto px-4">
              <div className="text-center mb-10">
                <h2 className="text-2xl md:text-3xl font-bold text-foreground mb-3">
                  Pour qui ? Pour quoi ?
                </h2>
              </div>
              <div className="grid sm:grid-cols-2 gap-6 max-w-4xl mx-auto">
                {useCases.map((uc) => (
                  <Card
                    key={uc.title}
                    className="transition-all duration-300 hover:shadow-lg"
                  >
                    <CardHeader>
                      <div className="flex items-start gap-4">
                        <div className="p-3 rounded-lg bg-primary/10 text-primary">
                          <uc.icon className="h-6 w-6" />
                        </div>
                        <div>
                          <CardTitle className="text-lg">{uc.title}</CardTitle>
                          <p className="mt-2 text-sm text-muted-foreground">
                            {uc.description}
                          </p>
                        </div>
                      </div>
                    </CardHeader>
                  </Card>
                ))}
              </div>
            </div>
          </section>

          {/* Papiers */}
          <section className="py-12 md:py-16">
            <div className="container mx-auto px-4">
              <div className="text-center mb-10">
                <h2 className="text-2xl md:text-3xl font-bold text-foreground mb-3">
                  Nos papiers d'art
                </h2>
                <p className="text-muted-foreground max-w-2xl mx-auto">
                  Une sélection exigeante de papiers premium, choisis pour leur
                  rendu exceptionnel et leur durabilité.
                </p>
              </div>
              <div className="grid md:grid-cols-3 gap-6 max-w-5xl mx-auto">
                {papers.map((paper) => (
                  <Card
                    key={paper.name}
                    className="transition-all duration-300 hover:shadow-lg hover:border-primary/50"
                  >
                    <CardHeader>
                      <CardTitle className="text-lg">{paper.name}</CardTitle>
                      <Badge variant="outline" className="w-fit">
                        {paper.type}
                      </Badge>
                    </CardHeader>
                    <CardContent className="space-y-3">
                      <p className="text-sm text-muted-foreground">
                        {paper.description}
                      </p>
                      <div className="flex flex-wrap gap-2">
                        {paper.finishes.map((f) => (
                          <span
                            key={f}
                            className="px-2 py-1 text-xs font-medium bg-secondary text-secondary-foreground rounded-full"
                          >
                            {f}
                          </span>
                        ))}
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </div>
          </section>

          {/* Finitions */}
          <section className="py-12 md:py-16 bg-muted/30">
            <div className="container mx-auto px-4">
              <div className="text-center mb-10">
                <h2 className="text-2xl md:text-3xl font-bold text-foreground mb-3">
                  Finitions disponibles
                </h2>
              </div>
              <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4 max-w-4xl mx-auto">
                {finishes.map((finish) => (
                  <Card key={finish.name} className="text-center">
                    <CardHeader>
                      <CardTitle className="text-base">{finish.name}</CardTitle>
                    </CardHeader>
                    <CardContent className="text-sm text-muted-foreground">
                      {finish.desc}
                    </CardContent>
                  </Card>
                ))}
              </div>
            </div>
          </section>

          {/* Comment ça marche */}
          <section className="py-12 md:py-16">
            <div className="container mx-auto px-4">
              <div className="text-center mb-10">
                <h2 className="text-2xl md:text-3xl font-bold text-foreground mb-3">
                  Comment ça marche ?
                </h2>
              </div>
              <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-6 max-w-5xl mx-auto">
                {[
                  {
                    icon: Upload,
                    step: "1",
                    title: "Envoyez votre fichier",
                    desc: "Par email, formulaire en ligne ou en boutique avec votre clé USB.",
                  },
                  {
                    icon: Search,
                    step: "2",
                    title: "Vérification gratuite",
                    desc: "Contrôle résolution, profil ICC et format. Conseils personnalisés.",
                  },
                  {
                    icon: Printer,
                    step: "3",
                    title: "Tirage Fine Art",
                    desc: "Impression sur le papier et la finition de votre choix.",
                  },
                  {
                    icon: Package,
                    step: "4",
                    title: "Réception",
                    desc: "Livraison protégée à domicile ou retrait en boutique à Chaumont.",
                  },
                ].map((item) => (
                  <div key={item.step} className="text-center">
                    <div className="mx-auto w-12 h-12 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-lg font-bold mb-4">
                      {item.step}
                    </div>
                    <h3 className="font-semibold mb-2">{item.title}</h3>
                    <p className="text-sm text-muted-foreground">{item.desc}</p>
                  </div>
                ))}
              </div>
            </div>
          </section>

          {/* Pourquoi nous */}
          <section className="py-12 md:py-16 bg-muted/30">
            <div className="container mx-auto px-4">
              <div className="max-w-4xl mx-auto">
                <div className="text-center mb-10">
                  <h2 className="text-2xl md:text-3xl font-bold text-foreground mb-3">
                    Pourquoi nous confier vos tirages ?
                  </h2>
                </div>
                <div className="grid sm:grid-cols-2 gap-4">
                  {[
                    "Conseil d'expert : choix du papier et de la finition adaptés à votre œuvre",
                    "Vérification de fichier gratuite — résolution, couleurs, format",
                    "Encres pigmentées garanties 70+ ans par le fabricant",
                    "Papiers d'art des plus grandes marques mondiales",
                    "Livraison protégée partout en France ou retrait en boutique",
                    "Impression test possible avant la commande finale",
                  ].map((item) => (
                    <div key={item} className="flex items-start gap-3">
                      <CheckCircle className="h-5 w-5 text-primary flex-shrink-0 mt-0.5" />
                      <span className="text-sm">{item}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </section>

          {/* FAQ */}
          <section className="py-12 md:py-16">
            <div className="container mx-auto px-4">
              <div className="max-w-3xl mx-auto">
                <h2 className="text-2xl md:text-3xl font-bold text-foreground text-center mb-8">
                  Questions fréquentes
                </h2>
                <Accordion type="single" collapsible className="w-full">
                  {faqData.map((item, index) => (
                    <AccordionItem key={index} value={`faq-${index}`}>
                      <AccordionTrigger className="text-left">
                        {item.question}
                      </AccordionTrigger>
                      <AccordionContent className="text-muted-foreground">
                        {item.answer}
                      </AccordionContent>
                    </AccordionItem>
                  ))}
                </Accordion>
              </div>
            </div>
          </section>

          {/* CTA Final */}
          <section className="py-12 md:py-16 bg-primary text-primary-foreground">
            <div className="container mx-auto px-4 text-center">
              <h2 className="text-2xl md:text-3xl font-bold mb-4">
                Prêt à sublimer vos photos ?
              </h2>
              <p className="text-primary-foreground/80 mb-6 max-w-xl mx-auto">
                Envoyez-nous votre fichier pour un devis gratuit. Notre équipe
                vous conseille sur le papier et la finition idéals pour votre
                projet.
              </p>
              <div className="flex flex-col sm:flex-row justify-center gap-4">
                <Button asChild size="lg" variant="secondary">
                  <Link to="/contact">
                    <Send className="mr-2 h-4 w-4" />
                    Demander un devis gratuit
                  </Link>
                </Button>
                <Button
                  asChild
                  size="lg"
                  variant="outline"
                  className="border-primary-foreground/30 text-primary-foreground hover:bg-primary-foreground/10"
                >
                  <a href="tel:0310960224">
                    <Phone className="mr-2 h-4 w-4" />
                    03 10 96 02 24
                  </a>
                </Button>
              </div>
            </div>
          </section>

          {/* Liens internes */}
          <section className="py-12 md:py-16">
            <div className="container mx-auto px-4">
              <div className="max-w-3xl mx-auto text-center">
                <h2 className="text-xl font-semibold text-foreground mb-6">
                  Découvrez nos autres services d'impression premium
                </h2>
                <div className="flex flex-wrap justify-center gap-3">
                  <Button asChild variant="outline" size="sm">
                    <Link to="/papier-peint-personnalise">
                      Papier peint personnalisé
                    </Link>
                  </Button>
                  <Button asChild variant="outline" size="sm">
                    <Link to="/impression-plans-techniques">
                      Plans techniques
                    </Link>
                  </Button>
                  <Button asChild variant="outline" size="sm">
                    <Link to="/impression-patron-couture">
                      Patrons de couture
                    </Link>
                  </Button>
                  <Button asChild variant="outline" size="sm">
                    <Link to="/services">Tous nos services</Link>
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

export default ImpressionFineArt;
