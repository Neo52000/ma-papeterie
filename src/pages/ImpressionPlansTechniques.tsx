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
  Ruler,
  CheckCircle,
  Phone,
  Send,
  Shield,
  Eye,
  Zap,
  Building2,
  GraduationCap,
  Landmark,
  HardHat,
  Upload,
  Search,
  Printer,
  Package,
  FoldVertical,
  FileText,
} from "lucide-react";

const ImpressionPlansTechniques = () => {
  const faqData = [
    {
      question: "Quels formats de plans pouvez-vous imprimer ?",
      answer: "Nous imprimons tous les formats standards (A4, A3, A2, A1, A0) ainsi que les formats personnalisés jusqu'à 1050 mm de largeur, sans limite de longueur. Formats PDF et PLT acceptés.",
    },
    {
      question: "Quelle est la différence entre impression CAD et qualité présentation ?",
      answer: "L'impression CAD (noir & blanc ou couleur) utilise du papier technique standard, idéal pour le travail quotidien et les réunions de chantier. La qualité présentation utilise un papier couché premium avec un rendu plus fin, parfait pour les présentations clients, concours ou permis de construire.",
    },
    {
      question: "Proposez-vous le pliage des plans ?",
      answer: "Oui, nous proposons le pliage selon les normes DIN 824-A (pliage compact pour classeur), DIN 824-B (pliage avec marge visible) et DIN 824-C (pliage standard). Le pliage est disponible en option sur tous les formats.",
    },
    {
      question: "Quel est le délai d'impression pour des plans ?",
      answer: "Pour les commandes standard, comptez 48h. Pour les projets urgents, contactez-nous directement — nous faisons notre maximum pour répondre aux délais serrés des professionnels.",
    },
    {
      question: "Proposez-vous des tarifs pour les gros volumes ?",
      answer: "Oui, nous proposons des tarifs dégressifs pour les volumes importants. Architectes, bureaux d'études et entreprises BTP : demandez un devis personnalisé pour bénéficier de nos conditions professionnelles.",
    },
  ];

  const serviceSchema = {
    "@context": "https://schema.org",
    "@type": "Service",
    "name": "Impression de plans techniques — Plans architecte & CAD grand format",
    "description":
      "Impression de plans techniques grand format : plans architecte, CAD, ingénierie. Du A4 au A0+, noir & blanc ou couleur. Pliage DIN 824, encres pigmentées résistantes.",
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
    "serviceType": "Impression de plans techniques",
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

  const printOptions = [
    {
      name: "Plans N&B — CAD",
      description:
        "Impression noir & blanc avec 256 niveaux de gris. Encres pigmentées résistantes à la lumière. Idéal pour le travail quotidien.",
      formats: "A4 à A0+ (largeur max 1050 mm)",
      ideal: "Chantier, réunions, archives",
    },
    {
      name: "Plans Couleur — CAD",
      description:
        "Impression couleur haute fidélité, encres pigmentées. Parfait pour les plans avec légendes, zones colorées et annotations.",
      formats: "A4 à A0+ (largeur max 1050 mm)",
      ideal: "Plans annotés, réseaux, urbanisme",
    },
    {
      name: "Qualité Présentation",
      description:
        "Impression couleur sur papier couché premium. Rendu supérieur pour les documents destinés aux clients ou aux jurys.",
      formats: "A4 à A0+ (largeur max 1050 mm)",
      ideal: "Concours, permis de construire, clients",
    },
  ];

  const useCases = [
    {
      icon: Building2,
      title: "Architectes & cabinets",
      description:
        "Plans d'exécution, coupes, élévations, détails constructifs — du travail quotidien aux rendus clients.",
    },
    {
      icon: HardHat,
      title: "Entreprises BTP",
      description:
        "Plans de chantier, plans de coffrage, réseaux. Volumes importants avec tarifs dégressifs.",
    },
    {
      icon: Landmark,
      title: "Collectivités & urbanisme",
      description:
        "PLU, plans de masse, projets d'aménagement. Qualité présentation pour les délibérations.",
    },
    {
      icon: GraduationCap,
      title: "Étudiants en architecture",
      description:
        "Rendus de projet, planches de concours. Qualité professionnelle à prix étudiant.",
    },
  ];

  return (
    <>
      <Helmet>
        <title>
          Impression de plans techniques | Plans architecte & CAD grand format |
          Ma Papeterie
        </title>
        <meta
          name="description"
          content="Impression de plans techniques grand format : plans architecte, CAD, ingénierie. Du A4 au A0+, N&B ou couleur, pliage DIN 824. Vérification fichier gratuite, livraison France."
        />
        <meta
          name="keywords"
          content="impression plan architecte, tirage plan grand format, impression plan A0, impression CAD couleur, impression plan technique, plan grand format en ligne"
        />
        <link
          rel="canonical"
          href="https://ma-papeterie.fr/impression-plans-techniques"
        />
        <meta
          property="og:title"
          content="Impression de plans techniques | Plans architecte & CAD grand format"
        />
        <meta
          property="og:description"
          content="Plans techniques grand format : du A4 au A0+, N&B ou couleur, pliage DIN 824. Encres pigmentées, livraison France entière."
        />
        <meta property="og:type" content="website" />
        <meta
          property="og:url"
          content="https://ma-papeterie.fr/impression-plans-techniques"
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
                    <BreadcrumbPage>Plans techniques</BreadcrumbPage>
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
                  <Ruler className="h-3 w-3 mr-1" />
                  Impression technique & pro
                </Badge>
                <h1 className="text-3xl md:text-5xl font-bold text-foreground mb-6">
                  Impression de plans techniques : précision et rapidité
                  garanties
                </h1>
                <p className="text-xl text-muted-foreground mb-8">
                  Du A4 au A0+ — plans architecte, ingénierie, BTP — encres
                  pigmentées résistantes, pliage aux normes, livraison France
                  entière.
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
                  L'impression technique au service des pros
                </h2>
              </div>
              <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-6 max-w-5xl mx-auto">
                {[
                  {
                    icon: Ruler,
                    title: "Précision millimétrique",
                    desc: "Reproduction fidèle de vos plans avec une précision irréprochable, du trait le plus fin au détail le plus complexe.",
                  },
                  {
                    icon: Shield,
                    title: "Encres résistantes",
                    desc: "Encres pigmentées résistantes à la lumière et à l'eau — vos plans restent lisibles en toutes conditions.",
                  },
                  {
                    icon: FoldVertical,
                    title: "Pliage normalisé",
                    desc: "Pliage aux normes DIN 824 (A, B, C) pour un rangement en classeur ou une consultation facilitée.",
                  },
                  {
                    icon: Eye,
                    title: "Vérification gratuite",
                    desc: "Contrôle de votre fichier (échelle, format, lisibilité) avant chaque impression.",
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

          {/* Options d'impression */}
          <section className="py-12 md:py-16">
            <div className="container mx-auto px-4">
              <div className="text-center mb-10">
                <h2 className="text-2xl md:text-3xl font-bold text-foreground mb-3">
                  Nos options d'impression
                </h2>
                <p className="text-muted-foreground max-w-2xl mx-auto">
                  Trois niveaux de qualité pour répondre à chaque besoin, du
                  chantier à la présentation client.
                </p>
              </div>
              <div className="grid md:grid-cols-3 gap-6 max-w-5xl mx-auto">
                {printOptions.map((option) => (
                  <Card
                    key={option.name}
                    className="transition-all duration-300 hover:shadow-lg hover:border-primary/50"
                  >
                    <CardHeader>
                      <CardTitle className="text-lg">{option.name}</CardTitle>
                      <Badge variant="outline" className="w-fit">
                        {option.formats}
                      </Badge>
                    </CardHeader>
                    <CardContent className="space-y-3">
                      <p className="text-sm text-muted-foreground">
                        {option.description}
                      </p>
                      <p className="text-sm">
                        <span className="font-medium">Idéal pour :</span>{" "}
                        <span className="text-muted-foreground">
                          {option.ideal}
                        </span>
                      </p>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </div>
          </section>

          {/* Pack Architecte */}
          <section className="py-12 md:py-16 bg-muted/30">
            <div className="container mx-auto px-4">
              <Card className="max-w-3xl mx-auto bg-gradient-to-br from-primary/5 to-background border-primary/20">
                <CardHeader className="text-center">
                  <Badge variant="secondary" className="w-fit mx-auto mb-2">
                    <Zap className="h-3 w-3 mr-1" />
                    Offre Pro
                  </Badge>
                  <CardTitle className="text-2xl">Pack Architecte</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <p className="text-center text-muted-foreground">
                    Une solution complète pour vos dossiers professionnels :
                    impression, pliage et reliure en un seul devis.
                  </p>
                  <div className="grid sm:grid-cols-3 gap-4">
                    {[
                      {
                        icon: FileText,
                        label: "Impression",
                        detail: "N&B, couleur ou présentation",
                      },
                      {
                        icon: FoldVertical,
                        label: "Pliage",
                        detail: "DIN 824-A, B ou C",
                      },
                      {
                        icon: Package,
                        label: "Reliure",
                        detail: "Spirale, thermocollée ou dos carré",
                      },
                    ].map((item) => (
                      <div key={item.label} className="text-center">
                        <item.icon className="h-8 w-8 mx-auto text-primary mb-2" />
                        <p className="font-medium text-sm">{item.label}</p>
                        <p className="text-xs text-muted-foreground">
                          {item.detail}
                        </p>
                      </div>
                    ))}
                  </div>
                  <div className="text-center pt-4">
                    <Button asChild>
                      <Link to="/contact">
                        <Send className="mr-2 h-4 w-4" />
                        Demander un devis Pack Architecte
                      </Link>
                    </Button>
                  </div>
                </CardContent>
              </Card>
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
                    title: "Envoyez vos fichiers",
                    desc: "PDF ou PLT, jusqu'à 900 Mo par fichier. Par email ou formulaire.",
                  },
                  {
                    icon: Search,
                    step: "2",
                    title: "Vérification gratuite",
                    desc: "Contrôle d'échelle, de format et de lisibilité de vos plans.",
                  },
                  {
                    icon: Printer,
                    step: "3",
                    title: "Impression & finition",
                    desc: "Impression, pliage et reliure selon vos spécifications.",
                  },
                  {
                    icon: Package,
                    step: "4",
                    title: "Réception",
                    desc: "Livraison protégée en France ou retrait en boutique.",
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
                    Pourquoi nous confier vos plans ?
                  </h2>
                </div>
                <div className="grid sm:grid-cols-2 gap-4">
                  {[
                    "Précision millimétrique — reproduction fidèle de chaque trait",
                    "Vérification de fichier gratuite — échelle, format, lisibilité",
                    "Pliage normalisé DIN 824 inclus sur demande",
                    "Tarifs dégressifs pour les volumes importants",
                    "Livraison protégée partout en France ou retrait en boutique",
                    "Pack Architecte : impression + pliage + reliure en un seul devis",
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
                Un projet d'impression de plans ?
              </h2>
              <p className="text-primary-foreground/80 mb-6 max-w-xl mx-auto">
                Du simple tirage A3 au dossier complet A0 relié — envoyez-nous
                vos fichiers pour un devis gratuit et rapide.
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
                    <Link to="/impression-fine-art">Impression Fine Art</Link>
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

export default ImpressionPlansTechniques;
