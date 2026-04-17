import { Helmet } from "react-helmet-async";
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
  Palette,
  Image,
  CheckCircle,
  Phone,
  Send,
  Shield,
  Eye,
  Zap,
  Home,
  Building2,
  PartyPopper,
  Briefcase,
  Upload,
  Search,
  Printer,
  Package,
} from "lucide-react";
import { OptimizedImage } from "@/components/ui/OptimizedImage";
import heroImg from "@/assets/services/papier-peint-hero.jpg";
import interiorImg from "@/assets/services/papier-peint-interieur.jpg";

const PapierPeintPersonnalise = () => {
  const faqData = [
    {
      question: "Quelles dimensions peut-on imprimer pour un papier peint personnalisé ?",
      answer: "Nos papiers peints sont imprimés sur mesure, au millimètre près. Il n'y a pas de limite de largeur ou de hauteur : nous nous adaptons exactement à votre mur. Envoyez-nous les dimensions et nous vous proposons un devis adapté.",
    },
    {
      question: "Quelle résolution de photo faut-il pour un bon rendu mural ?",
      answer: "Pour un résultat optimal, nous recommandons une résolution minimale de 150 dpi à la taille finale. Notre équipe vérifie gratuitement votre fichier et vous conseille avant toute impression.",
    },
    {
      question: "Quels types de supports sont disponibles ?",
      answer: "Nous proposons trois supports : l'intissé premium (200g/m², surface ultra-lisse), l'adhésif standard (175g/m², pose à l'eau) et le film autocollant mat (repositionnable, sans colle). Chaque support est adapté à un usage différent.",
    },
    {
      question: "Le papier peint est-il résistant à la lumière ?",
      answer: "Oui, nous utilisons des encres latex photorealistes, résistantes à la lumière et aux UV. Vos couleurs restent éclatantes pendant de nombreuses années, même en exposition directe.",
    },
    {
      question: "Comment se passe la pose du papier peint personnalisé ?",
      answer: "Le papier peint est livré en lés numérotés, prêts à poser. L'intissé se pose avec de la colle murale classique, l'adhésif s'active à l'eau, et le film autocollant se pose sans colle. Nous fournissons des instructions détaillées avec chaque commande.",
    },
  ];

  const serviceSchema = {
    "@context": "https://schema.org",
    "@type": "Service",
    "name": "Papier peint photo personnalisé — Impression murale sur mesure",
    "description":
      "Impression de papier peint photo personnalisé sur mesure. Intissé premium, adhésif ou autocollant. Qualité photorealistic, encres latex résistantes UV.",
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
    "serviceType": "Impression de papier peint personnalisé",
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

  const supports = [
    {
      name: "Intissé premium",
      grammage: "200 g/m²",
      description:
        "Surface ultra-lisse pour une reproduction photo éclatante. Pose classique à la colle.",
      ideal: "Décoration durable, pièces à vivre",
    },
    {
      name: "Adhésif standard",
      grammage: "175 g/m²",
      description:
        "Support pré-adhésif qui s'active à l'eau ou au spray. Pose facile et rapide.",
      ideal: "Projets ponctuels, rénovation",
    },
    {
      name: "Film autocollant mat",
      grammage: "Finition mate texturée",
      description:
        "Pose sans colle, repositionnable. Finition mate élégante sans reflets.",
      ideal: "Location, événements, décoration temporaire",
    },
  ];

  const useCases = [
    {
      icon: Home,
      title: "Décoration intérieure",
      description:
        "Transformez votre salon, chambre ou cuisine avec une photo panoramique, un paysage ou une œuvre d'art en format mural.",
    },
    {
      icon: Building2,
      title: "Commerces & restaurants",
      description:
        "Créez une ambiance unique pour votre établissement : fresque murale, branding XXL, décor thématique.",
    },
    {
      icon: Briefcase,
      title: "Bureaux & espaces de travail",
      description:
        "Personnalisez vos locaux professionnels avec votre identité visuelle ou des visuels inspirants.",
    },
    {
      icon: PartyPopper,
      title: "Événements & décors éphémères",
      description:
        "Mariages, salons, expositions : un décor mural sur mesure pour un impact visuel immédiat.",
    },
  ];

  return (
    <>
      <Helmet>
        <title>
          Papier peint photo personnalisé | Impression murale sur mesure | Ma
          Papeterie
        </title>
        <meta
          name="description"
          content="Papier peint photo personnalisé sur mesure. Impression grand format qualité premium sur intissé, adhésif ou autocollant. Vérification fichier gratuite, livraison France entière."
        />
        <meta
          name="keywords"
          content="papier peint personnalisé, papier peint photo sur mesure, impression murale grand format, décoration murale personnalisée, poster mural géant, papier peint imprimé"
        />
        <link
          rel="canonical"
          href="https://ma-papeterie.fr/papier-peint-personnalise"
        />
        <meta
          property="og:title"
          content="Papier peint photo personnalisé | Impression murale sur mesure"
        />
        <meta
          property="og:description"
          content="Transformez vos murs avec un papier peint photo sur mesure. Qualité premium, encres résistantes UV, formats illimités."
        />
        <meta property="og:type" content="website" />
        <meta
          property="og:url"
          content="https://ma-papeterie.fr/papier-peint-personnalise"
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
                      <a href="/">Accueil</a>
                    </BreadcrumbLink>
                  </BreadcrumbItem>
                  <BreadcrumbSeparator />
                  <BreadcrumbItem>
                    <BreadcrumbLink asChild>
                      <a href="/services">Services</a>
                    </BreadcrumbLink>
                  </BreadcrumbItem>
                  <BreadcrumbSeparator />
                  <BreadcrumbItem>
                    <BreadcrumbPage>Papier peint personnalisé</BreadcrumbPage>
                  </BreadcrumbItem>
                </BreadcrumbList>
              </Breadcrumb>
            </div>
          </div>

          {/* Hero */}
          <section className="relative overflow-hidden bg-gradient-to-b from-primary/10 to-background py-16">
            <div className="container mx-auto px-4">
              <div className="grid md:grid-cols-2 gap-10 items-center max-w-6xl mx-auto">
                <div>
                  <Badge variant="secondary" className="mb-4">
                    <Palette className="h-3 w-3 mr-1" />
                    Grand format & décoration
                  </Badge>
                  <h1 className="text-3xl md:text-5xl font-bold text-foreground mb-6">
                    Transformez vos murs avec un papier peint photo sur mesure
                  </h1>
                  <p className="text-xl text-muted-foreground mb-8">
                    Votre photo, votre ambiance, votre intérieur unique —
                    impression grand format qualité premium, formats sur mesure au
                    millimètre près.
                  </p>
                  <div className="flex flex-col sm:flex-row gap-4">
                    <Button asChild size="lg">
                      <a href="/contact">
                        <Send className="mr-2 h-4 w-4" />
                        Demander un devis gratuit
                      </a>
                    </Button>
                    <Button asChild size="lg" variant="outline">
                      <a href="tel:0310960224">
                        <Phone className="mr-2 h-4 w-4" />
                        03 10 96 02 24
                      </a>
                    </Button>
                  </div>
                </div>
                <div className="relative">
                  <div className="rounded-2xl overflow-hidden shadow-2xl">
                    <OptimizedImage
                      src={heroImg.src}
                      alt="Papier peint photo personnalisé — impression murale sur mesure"
                      className="w-full h-full object-cover"
                      wrapperClassName="w-full aspect-[8/5]"
                      loading="eager"
                      width={800}
                      height={500}
                    />
                  </div>
                  <div className="absolute -bottom-4 -right-4 bg-primary text-primary-foreground rounded-xl px-4 py-2 text-sm font-medium shadow-lg">
                    Formats sur mesure
                  </div>
                </div>
              </div>
            </div>
          </section>

          {/* Bénéfices */}
          <section className="py-12 md:py-16">
            <div className="container mx-auto px-4">
              <div className="text-center mb-10">
                <h2 className="text-2xl md:text-3xl font-bold text-foreground mb-3">
                  Pourquoi choisir notre impression murale ?
                </h2>
                <p className="text-muted-foreground max-w-2xl mx-auto">
                  Un rendu photographique saisissant, des matériaux premium et
                  un accompagnement de A à Z.
                </p>
              </div>
              <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-6 max-w-5xl mx-auto">
                {[
                  {
                    icon: Image,
                    title: "Qualité photoréaliste",
                    desc: "Encres latex haute définition pour des couleurs éclatantes et un rendu photographique bluffant.",
                  },
                  {
                    icon: Shield,
                    title: "Résistance UV",
                    desc: "Encres résistantes à la lumière : vos couleurs restent vives pendant des années.",
                  },
                  {
                    icon: Eye,
                    title: "Vérification gratuite",
                    desc: "Notre équipe contrôle résolution, couleurs et format de votre fichier avant impression.",
                  },
                  {
                    icon: Zap,
                    title: "Sur mesure exact",
                    desc: "Dimensions au millimètre près, adaptées à votre mur. Aucune limite de taille.",
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

          {/* Supports disponibles */}
          <section className="py-12 md:py-16">
            <div className="container mx-auto px-4">
              <div className="grid md:grid-cols-2 gap-10 items-center max-w-6xl mx-auto mb-12">
                <div className="rounded-2xl overflow-hidden shadow-lg">
                  <OptimizedImage
                    src={interiorImg.src}
                    alt="Exemple de décoration murale avec papier peint personnalisé dans un intérieur"
                    className="w-full h-full object-cover"
                    wrapperClassName="w-full aspect-[4/3]"
                    loading="lazy"
                    width={400}
                    height={300}
                  />
                </div>
                <div>
                  <h2 className="text-2xl md:text-3xl font-bold text-foreground mb-3">
                    Nos supports d'impression
                  </h2>
                  <p className="text-muted-foreground">
                    Trois supports premium pour répondre à tous les projets de
                    décoration murale.
                  </p>
                </div>
              </div>
              <div className="grid md:grid-cols-3 gap-6 max-w-5xl mx-auto">
                {supports.map((support) => (
                  <Card
                    key={support.name}
                    className="transition-all duration-300 hover:shadow-lg hover:border-primary/50"
                  >
                    <CardHeader>
                      <CardTitle className="text-lg">{support.name}</CardTitle>
                      <Badge variant="outline" className="w-fit">
                        {support.grammage}
                      </Badge>
                    </CardHeader>
                    <CardContent className="space-y-3">
                      <p className="text-sm text-muted-foreground">
                        {support.description}
                      </p>
                      <p className="text-sm">
                        <span className="font-medium">Idéal pour :</span>{" "}
                        <span className="text-muted-foreground">
                          {support.ideal}
                        </span>
                      </p>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </div>
          </section>

          {/* Comment ça marche */}
          <section className="py-12 md:py-16 bg-muted/30">
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
                    desc: "Par email, formulaire en ligne ou directement en boutique.",
                  },
                  {
                    icon: Search,
                    step: "2",
                    title: "Vérification gratuite",
                    desc: "On contrôle résolution, format et couleurs de votre image.",
                  },
                  {
                    icon: Printer,
                    step: "3",
                    title: "Impression premium",
                    desc: "Réalisation sur le support de votre choix, qualité photoréaliste.",
                  },
                  {
                    icon: Package,
                    step: "4",
                    title: "Réception",
                    desc: "Livraison soignée à domicile ou retrait en boutique à Chaumont.",
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

          {/* Pourquoi nous choisir */}
          <section className="py-12 md:py-16">
            <div className="container mx-auto px-4">
              <div className="max-w-4xl mx-auto">
                <div className="text-center mb-10">
                  <h2 className="text-2xl md:text-3xl font-bold text-foreground mb-3">
                    Pourquoi nous confier votre projet ?
                  </h2>
                </div>
                <div className="grid sm:grid-cols-2 gap-4">
                  {[
                    "Conseil d'expert : on vous aide à choisir le support idéal",
                    "Vérification de fichier gratuite avant impression",
                    "Qualité premium garantie — encres latex professionnelles",
                    "Livraison partout en France ou retrait en boutique",
                    "Formats sur mesure au millimètre — aucune limite de taille",
                    "Accompagnement personnalisé du projet à la livraison",
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
          <section className="py-12 md:py-16 bg-muted/30">
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
                Un projet de décoration murale ?
              </h2>
              <p className="text-primary-foreground/80 mb-6 max-w-xl mx-auto">
                Envoyez-nous votre photo et les dimensions de votre mur.
                Devis gratuit sous 24h, vérification de fichier offerte.
              </p>
              <div className="flex flex-col sm:flex-row justify-center gap-4">
                <Button asChild size="lg" variant="secondary">
                  <a href="/contact">
                    <Send className="mr-2 h-4 w-4" />
                    Demander un devis gratuit
                  </a>
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
                    <a href="/impression-fine-art">Impression Fine Art</a>
                  </Button>
                  <Button asChild variant="outline" size="sm">
                    <a href="/impression-plans-techniques">
                      Plans techniques
                    </a>
                  </Button>
                  <Button asChild variant="outline" size="sm">
                    <a href="/impression-patron-couture">
                      Patrons de couture
                    </a>
                  </Button>
                  <Button asChild variant="outline" size="sm">
                    <a href="/services">Tous nos services</a>
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

export default PapierPeintPersonnalise;
