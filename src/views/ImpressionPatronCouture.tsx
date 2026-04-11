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
  Scissors,
  CheckCircle,
  Phone,
  Send,
  Shield,
  Eye,
  Zap,
  Ruler,
  Heart,
  GraduationCap,
  Store,
  Users,
  Upload,
  Search,
  Printer,
  Package,
} from "lucide-react";
import { OptimizedImage } from "@/components/ui/OptimizedImage";
import heroImg from "@/assets/services/patron-couture-hero.jpg";
import tissuImg from "@/assets/services/patron-couture-tissu.jpg";

const ImpressionPatronCouture = () => {
  const faqData = [
    {
      question: "Quels formats de patrons pouvez-vous imprimer ?",
      answer: "Nous imprimons vos patrons jusqu'à 105 cm de largeur, sans limite de longueur. Cela couvre tous les patrons couture du commerce, y compris les grandes tailles et les patrons multi-pièces. Formats PDF et PLT acceptés.",
    },
    {
      question: "L'impression est-elle vraiment à l'échelle 1:1 ?",
      answer: "Oui, absolument. L'impression est réalisée au millimètre près, à l'échelle exacte de votre fichier. Nous vérifions systématiquement l'échelle avant impression grâce au carré de contrôle présent sur la plupart des patrons PDF.",
    },
    {
      question: "Quels types de papier sont disponibles pour les patrons ?",
      answer: "Quatre options : papier 80g standard (économique), papier 90g premium lisse (meilleur rendu), papier 120g graphique (plus rigide, idéal pour les gabarits) et film transparent 110g (pour le traçage et la superposition de pièces).",
    },
    {
      question: "Puis-je envoyer un patron acheté sur Etsy ou Makerist ?",
      answer: "Oui, tant que vous disposez du fichier PDF. La plupart des patrons de couture vendus en ligne sont au format PDF A0 ou en version « plotter ». Envoyez-nous le fichier et nous nous chargeons de l'impression à taille réelle.",
    },
    {
      question: "Proposez-vous la découpe des pièces du patron ?",
      answer: "Oui, en option. Nous pouvons découper les pièces individuelles de votre patron pour un gain de temps considérable. Demandez cette option dans votre devis.",
    },
  ];

  const serviceSchema = {
    "@context": "https://schema.org",
    "@type": "Service",
    "name": "Impression de patrons de couture — Taille réelle 1:1 grand format",
    "description":
      "Impression de patrons de couture à taille réelle (1:1). Jusqu'à 105 cm de large, longueur illimitée. Papier standard, premium, graphique ou film transparent.",
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
    "serviceType": "Impression de patrons de couture",
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

  const paperOptions = [
    {
      name: "Papier standard",
      grammage: "80 g/m²",
      description:
        "Papier classique, économique. Parfait pour les patrons d'usage courant et les essais de toile.",
      ideal: "Usage courant, économique",
    },
    {
      name: "Papier premium lisse",
      grammage: "90 g/m²",
      description:
        "Papier couché lisse pour un rendu plus net des lignes et des repères. Meilleure tenue en main.",
      ideal: "Patrons détaillés, couture précise",
    },
    {
      name: "Papier graphique",
      grammage: "120 g/m²",
      description:
        "Papier rigide, idéal pour créer des gabarits réutilisables. Résiste aux manipulations répétées.",
      ideal: "Gabarits, production en série",
    },
    {
      name: "Film transparent",
      grammage: "110 g/m²",
      description:
        "Film polyester translucide. Permet la superposition de pièces et le traçage direct sur tissu.",
      ideal: "Traçage, superposition de tailles",
    },
  ];

  const useCases = [
    {
      icon: Heart,
      title: "Couturières & couturiers amateurs",
      description:
        "Fini l'assemblage de dizaines de feuilles A4. Recevez votre patron en un seul morceau, prêt à découper et à épingler.",
    },
    {
      icon: Store,
      title: "Créatrices indépendantes",
      description:
        "Vendeuses sur Etsy, Makerist ou en boutique : proposez vos patrons imprimés en option premium à vos clientes.",
    },
    {
      icon: GraduationCap,
      title: "Écoles de couture & ateliers",
      description:
        "Patrons pédagogiques en grand format pour vos cours et ateliers. Tarifs dégressifs pour les volumes.",
    },
    {
      icon: Users,
      title: "Merceries & associations",
      description:
        "Proposez un service d'impression de patrons à votre clientèle. Partenariat possible pour des volumes réguliers.",
    },
  ];

  return (
    <>
      <Helmet>
        <title>
          Impression de patrons de couture | Taille réelle 1:1 grand format | Ma
          Papeterie
        </title>
        <meta
          name="description"
          content="Impression de patrons de couture à taille réelle (1:1), jusqu'à 105 cm de large. Fini l'assemblage A4 ! Papier standard, premium ou transparent. Livraison France entière."
        />
        <meta
          name="keywords"
          content="impression patron couture, patron PDF taille réelle, impression patron couture grand format, imprimer patron couture A0, patron de couture imprimé, impression patron couture en ligne"
        />
        <link
          rel="canonical"
          href="https://ma-papeterie.fr/impression-patron-couture"
        />
        <meta
          property="og:title"
          content="Impression de patrons de couture | Taille réelle 1:1 grand format"
        />
        <meta
          property="og:description"
          content="Fini l'assemblage de feuilles A4. Vos patrons de couture imprimés à taille réelle, prêts à découper. Livraison France entière."
        />
        <meta property="og:type" content="website" />
        <meta
          property="og:url"
          content="https://ma-papeterie.fr/impression-patron-couture"
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
                    <BreadcrumbPage>Patrons de couture</BreadcrumbPage>
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
                    <Scissors className="h-3 w-3 mr-1" />
                    Création & textile
                  </Badge>
                  <h1 className="text-3xl md:text-5xl font-bold text-foreground mb-6">
                    Vos patrons de couture imprimés à taille réelle, prêts à
                    découper
                  </h1>
                  <p className="text-xl text-muted-foreground mb-8">
                    Fini l'assemblage de feuilles A4 — recevez votre patron en un
                    seul morceau, au millimètre près, sur le papier de votre
                    choix.
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
                      src={heroImg}
                      alt="Patron de couture imprimé à taille réelle en grand format"
                      className="w-full h-full object-cover"
                      wrapperClassName="w-full aspect-[8/5]"
                      loading="eager"
                      width={800}
                      height={500}
                    />
                  </div>
                  <div className="absolute -bottom-4 -right-4 bg-primary text-primary-foreground rounded-xl px-4 py-2 text-sm font-medium shadow-lg">
                    Échelle 1:1
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
                  Pourquoi imprimer vos patrons en grand format ?
                </h2>
              </div>
              <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-6 max-w-5xl mx-auto">
                {[
                  {
                    icon: Ruler,
                    title: "Échelle 1:1 exacte",
                    desc: "Impression au millimètre près. Chaque pièce est à la taille réelle, vérifiée avant impression.",
                  },
                  {
                    icon: Zap,
                    title: "Gain de temps énorme",
                    desc: "Plus besoin d'assembler et scotcher des dizaines de feuilles A4. Votre patron arrive prêt à l'emploi.",
                  },
                  {
                    icon: Shield,
                    title: "Précision garantie",
                    desc: "Fini les décalages entre feuilles. Lignes nettes, repères alignés, marges de couture précises.",
                  },
                  {
                    icon: Eye,
                    title: "Vérification gratuite",
                    desc: "On contrôle l'échelle via le carré de contrôle et le format avant chaque impression.",
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

          {/* Options papier */}
          <section className="py-12 md:py-16">
            <div className="container mx-auto px-4">
              <div className="grid md:grid-cols-2 gap-10 items-center mb-12">
                <div>
                  <h2 className="text-2xl md:text-3xl font-bold text-foreground mb-3">
                    Nos supports d'impression
                  </h2>
                  <p className="text-muted-foreground">
                    Quatre supports adaptés à chaque usage, du patron jetable au
                    gabarit professionnel.
                  </p>
                </div>
                <div className="rounded-2xl overflow-hidden shadow-lg">
                  <OptimizedImage
                    src={tissuImg}
                    alt="Patron de couture posé sur tissu, prêt à découper"
                    className="w-full h-full object-cover"
                    wrapperClassName="w-full aspect-[4/3]"
                    loading="lazy"
                    width={400}
                    height={300}
                  />
                </div>
              </div>
              <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-6 max-w-5xl mx-auto">
                {paperOptions.map((paper) => (
                  <Card
                    key={paper.name}
                    className="transition-all duration-300 hover:shadow-lg hover:border-primary/50"
                  >
                    <CardHeader>
                      <CardTitle className="text-base">{paper.name}</CardTitle>
                      <Badge variant="outline" className="w-fit">
                        {paper.grammage}
                      </Badge>
                    </CardHeader>
                    <CardContent className="space-y-3">
                      <p className="text-sm text-muted-foreground">
                        {paper.description}
                      </p>
                      <p className="text-sm">
                        <span className="font-medium">Idéal pour :</span>{" "}
                        <span className="text-muted-foreground">
                          {paper.ideal}
                        </span>
                      </p>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </div>
          </section>

          {/* Pack Couturière */}
          <section className="py-12 md:py-16 bg-muted/30">
            <div className="container mx-auto px-4">
              <Card className="max-w-3xl mx-auto bg-gradient-to-br from-primary/5 to-background border-primary/20">
                <CardHeader className="text-center">
                  <Badge variant="secondary" className="w-fit mx-auto mb-2">
                    <Zap className="h-3 w-3 mr-1" />
                    Offre spéciale
                  </Badge>
                  <CardTitle className="text-2xl">Pack Couturière</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <p className="text-center text-muted-foreground">
                    Tout ce qu'il faut pour passer du fichier PDF au tissu
                    découpé — en un seul envoi.
                  </p>
                  <div className="grid sm:grid-cols-3 gap-4">
                    {[
                      {
                        icon: Printer,
                        label: "Impression 1:1",
                        detail: "Taille réelle, papier au choix",
                      },
                      {
                        icon: Ruler,
                        label: "Mise à l'échelle",
                        detail: "Agrandissement ou réduction",
                      },
                      {
                        icon: Scissors,
                        label: "Découpe",
                        detail: "Pièces individuelles découpées",
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
                      <a href="/contact">
                        <Send className="mr-2 h-4 w-4" />
                        Demander un devis Pack Couturière
                      </a>
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
                    title: "Envoyez votre patron",
                    desc: "Fichier PDF ou PLT — patrons Etsy, Makerist, Burda, etc.",
                  },
                  {
                    icon: Search,
                    step: "2",
                    title: "Vérification gratuite",
                    desc: "Contrôle d'échelle (carré test), format et lisibilité.",
                  },
                  {
                    icon: Printer,
                    step: "3",
                    title: "Impression 1:1",
                    desc: "Votre patron imprimé à taille réelle sur le support choisi.",
                  },
                  {
                    icon: Package,
                    step: "4",
                    title: "Réception",
                    desc: "Livraison soignée (pliée ou en rouleau) ou retrait en boutique.",
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
                    Pourquoi nous confier vos patrons ?
                  </h2>
                </div>
                <div className="grid sm:grid-cols-2 gap-4">
                  {[
                    "Impression au millimètre près — échelle 1:1 vérifiée",
                    "Vérification de fichier gratuite avant chaque impression",
                    "4 supports au choix selon votre usage",
                    "Découpe des pièces en option — gain de temps garanti",
                    "Livraison partout en France ou retrait en boutique",
                    "Compatible tous patrons PDF : Etsy, Makerist, Burda, etc.",
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
                Prêt à imprimer votre patron ?
              </h2>
              <p className="text-primary-foreground/80 mb-6 max-w-xl mx-auto">
                Envoyez-nous votre fichier PDF — on vérifie l'échelle
                gratuitement et on vous envoie un devis dans la journée.
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
                    <a href="/papier-peint-personnalise">
                      Papier peint personnalisé
                    </a>
                  </Button>
                  <Button asChild variant="outline" size="sm">
                    <a href="/impression-fine-art">Impression Fine Art</a>
                  </Button>
                  <Button asChild variant="outline" size="sm">
                    <a href="/impression-plans-techniques">
                      Plans techniques
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

export default ImpressionPatronCouture;
