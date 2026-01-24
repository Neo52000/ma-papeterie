import { Helmet } from "react-helmet-async";
import Header from "@/components/layout/Header";
import Footer from "@/components/layout/Footer";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Link } from "react-router-dom";
import { Stamp, Clock, CheckCircle, Users, Building2, Phone, MapPin, Briefcase, Calendar } from "lucide-react";

const TamponProfessionnel = () => {
  const faqData = [
    {
      question: "Où faire fabriquer un tampon professionnel à Chaumont ?",
      answer: "Ma Papeterie à Chaumont, Haute-Marne, propose la fabrication de tampons personnalisés sur mesure. Le magasin réalise des tampons encreurs, tampons dateurs et cachets professionnels pour les entreprises, artisans et professions libérales."
    },
    {
      question: "Quel est le délai de fabrication d'un tampon ?",
      answer: "Les tampons standards peuvent être réalisés rapidement, souvent en 24 à 48 heures. Pour les modèles personnalisés complexes, un délai supplémentaire peut être nécessaire. Contactez le magasin pour connaître les disponibilités."
    },
    {
      question: "Quels types de tampons peut-on faire réaliser ?",
      answer: "Tampons encreurs automatiques, tampons à encrage séparé, tampons dateurs, numéroteurs, cachets ronds, tampons de société, tampons adresse. Personnalisation du texte, logo et format selon vos besoins."
    },
    {
      question: "Peut-on intégrer un logo sur le tampon ?",
      answer: "Oui, les tampons peuvent intégrer votre logo d'entreprise. Fournissez un fichier image de qualité (format vectoriel de préférence) pour un résultat optimal sur votre tampon personnalisé."
    },
    {
      question: "Quel est le tarif d'un tampon professionnel à Chaumont ?",
      answer: "Les tarifs varient selon le type de tampon, la taille et la personnalisation souhaitée. Demandez un devis en magasin ou par téléphone pour connaître le prix exact de votre tampon."
    }
  ];

  const serviceSchema = {
    "@context": "https://schema.org",
    "@type": "Service",
    "name": "Tampon professionnel express à Chaumont",
    "description": "Fabrication de tampons personnalisés pour professionnels à Chaumont, Haute-Marne. Tampons encreurs, dateurs, cachets de société.",
    "provider": {
      "@type": "LocalBusiness",
      "name": "Ma Papeterie",
      "address": {
        "@type": "PostalAddress",
        "addressLocality": "Chaumont",
        "addressRegion": "Haute-Marne",
        "postalCode": "52000",
        "addressCountry": "FR"
      }
    },
    "areaServed": {
      "@type": "City",
      "name": "Chaumont"
    },
    "serviceType": "Fabrication de tampons personnalisés"
  };

  const faqSchema = {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    "mainEntity": faqData.map(item => ({
      "@type": "Question",
      "name": item.question,
      "acceptedAnswer": {
        "@type": "Answer",
        "text": item.answer
      }
    }))
  };

  return (
    <>
      <Helmet>
        <title>Tampon professionnel express à Chaumont | Fabrication sur mesure | Ma Papeterie</title>
        <meta name="description" content="Fabrication de tampons professionnels personnalisés à Chaumont, Haute-Marne. Tampons encreurs, dateurs, cachets de société. Service rapide pour entreprises et professionnels." />
        <meta name="robots" content="index, follow" />
        <link rel="canonical" href="https://ma-papeterie.lovable.app/tampon-professionnel-chaumont" />
        <script type="application/ld+json">{JSON.stringify(serviceSchema)}</script>
        <script type="application/ld+json">{JSON.stringify(faqSchema)}</script>
      </Helmet>

      <div className="min-h-screen bg-background">
        <Header />
        
        <main>
          {/* Hero Section */}
          <section className="bg-gradient-to-b from-primary/10 to-background py-16">
            <div className="container mx-auto px-4">
              <div className="max-w-4xl mx-auto text-center">
                <Badge variant="secondary" className="mb-4">
                  <Stamp className="h-3 w-3 mr-1" />
                  Sur mesure
                </Badge>
                <h1 className="text-3xl md:text-5xl font-bold text-foreground mb-6">
                  Tampon professionnel express à Chaumont
                </h1>
                <p className="text-xl text-muted-foreground mb-8">
                  Fabrication de tampons personnalisés pour entreprises et professionnels.
                  Service local à Chaumont, Haute-Marne.
                </p>
                <div className="flex flex-col sm:flex-row gap-4 justify-center">
                  <Button size="lg" asChild>
                    <Link to="/contact">
                      <MapPin className="h-4 w-4 mr-2" />
                      Demander un devis
                    </Link>
                  </Button>
                  <Button size="lg" variant="outline" asChild>
                    <a href="tel:+33325000000">
                      <Phone className="h-4 w-4 mr-2" />
                      Appeler maintenant
                    </a>
                  </Button>
                </div>
              </div>
            </div>
          </section>

          {/* Avantages */}
          <section className="py-16 container mx-auto px-4">
            <div className="grid md:grid-cols-3 gap-8 max-w-5xl mx-auto">
              <Card className="text-center">
                <CardHeader>
                  <div className="mx-auto w-12 h-12 bg-primary/10 rounded-full flex items-center justify-center mb-4">
                    <Stamp className="h-6 w-6 text-primary" />
                  </div>
                  <CardTitle>100% personnalisé</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-muted-foreground">
                    Texte, logo, format : votre tampon est réalisé selon vos spécifications exactes.
                  </p>
                </CardContent>
              </Card>
              
              <Card className="text-center">
                <CardHeader>
                  <div className="mx-auto w-12 h-12 bg-primary/10 rounded-full flex items-center justify-center mb-4">
                    <Clock className="h-6 w-6 text-primary" />
                  </div>
                  <CardTitle>Délai rapide</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-muted-foreground">
                    Fabrication en 24 à 48h pour les modèles standards. Urgences possibles.
                  </p>
                </CardContent>
              </Card>
              
              <Card className="text-center">
                <CardHeader>
                  <div className="mx-auto w-12 h-12 bg-primary/10 rounded-full flex items-center justify-center mb-4">
                    <Briefcase className="h-6 w-6 text-primary" />
                  </div>
                  <CardTitle>Qualité pro</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-muted-foreground">
                    Tampons durables et précis, adaptés à un usage professionnel intensif.
                  </p>
                </CardContent>
              </Card>
            </div>
          </section>

          {/* Types de tampons */}
          <section className="py-16 bg-muted/30">
            <div className="container mx-auto px-4">
              <h2 className="text-2xl md:text-3xl font-bold text-center mb-12">
                Types de tampons disponibles
              </h2>
              <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6 max-w-5xl mx-auto">
                <Card className="p-6">
                  <Stamp className="h-8 w-8 text-primary mb-3" />
                  <h3 className="font-semibold mb-2">Tampon encreur automatique</h3>
                  <p className="text-sm text-muted-foreground">Encrage intégré, pratique et propre. Idéal pour usage quotidien.</p>
                </Card>
                <Card className="p-6">
                  <Stamp className="h-8 w-8 text-primary mb-3" />
                  <h3 className="font-semibold mb-2">Tampon bois classique</h3>
                  <p className="text-sm text-muted-foreground">Modèle traditionnel avec encreur séparé. Économique et durable.</p>
                </Card>
                <Card className="p-6">
                  <Calendar className="h-8 w-8 text-primary mb-3" />
                  <h3 className="font-semibold mb-2">Tampon dateur</h3>
                  <p className="text-sm text-muted-foreground">Date réglable. Indispensable pour courrier et documents.</p>
                </Card>
                <Card className="p-6">
                  <Stamp className="h-8 w-8 text-primary mb-3" />
                  <h3 className="font-semibold mb-2">Cachet rond</h3>
                  <p className="text-sm text-muted-foreground">Format officiel pour associations et professions réglementées.</p>
                </Card>
                <Card className="p-6">
                  <Building2 className="h-8 w-8 text-primary mb-3" />
                  <h3 className="font-semibold mb-2">Tampon société</h3>
                  <p className="text-sm text-muted-foreground">Raison sociale, adresse, SIRET. Format adapté à votre entreprise.</p>
                </Card>
                <Card className="p-6">
                  <Stamp className="h-8 w-8 text-primary mb-3" />
                  <h3 className="font-semibold mb-2">Numéroteur</h3>
                  <p className="text-sm text-muted-foreground">Numérotation automatique pour factures et documents.</p>
                </Card>
              </div>
            </div>
          </section>

          {/* Pour qui ? */}
          <section className="py-16 container mx-auto px-4">
            <h2 className="text-2xl md:text-3xl font-bold text-center mb-12">
              Pour qui sont ces tampons ?
            </h2>
            <div className="grid md:grid-cols-2 gap-8 max-w-4xl mx-auto">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-3">
                    <Building2 className="h-5 w-5 text-primary" />
                    Entreprises & commerces
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <ul className="space-y-2 text-muted-foreground">
                    <li className="flex items-start gap-2">
                      <CheckCircle className="h-4 w-4 text-primary mt-1 flex-shrink-0" />
                      Tampon société avec coordonnées complètes
                    </li>
                    <li className="flex items-start gap-2">
                      <CheckCircle className="h-4 w-4 text-primary mt-1 flex-shrink-0" />
                      Cachet pour factures et devis
                    </li>
                    <li className="flex items-start gap-2">
                      <CheckCircle className="h-4 w-4 text-primary mt-1 flex-shrink-0" />
                      Tampon dateur pour courrier
                    </li>
                    <li className="flex items-start gap-2">
                      <CheckCircle className="h-4 w-4 text-primary mt-1 flex-shrink-0" />
                      Mentions légales (PAYÉ, COPIE, etc.)
                    </li>
                  </ul>
                </CardContent>
              </Card>
              
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-3">
                    <Users className="h-5 w-5 text-primary" />
                    Professions libérales & artisans
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <ul className="space-y-2 text-muted-foreground">
                    <li className="flex items-start gap-2">
                      <CheckCircle className="h-4 w-4 text-primary mt-1 flex-shrink-0" />
                      Cachet professionnel réglementaire
                    </li>
                    <li className="flex items-start gap-2">
                      <CheckCircle className="h-4 w-4 text-primary mt-1 flex-shrink-0" />
                      Tampon avec numéro d'agrément
                    </li>
                    <li className="flex items-start gap-2">
                      <CheckCircle className="h-4 w-4 text-primary mt-1 flex-shrink-0" />
                      Cachet signature
                    </li>
                    <li className="flex items-start gap-2">
                      <CheckCircle className="h-4 w-4 text-primary mt-1 flex-shrink-0" />
                      Tampon adresse personnalisé
                    </li>
                  </ul>
                </CardContent>
              </Card>
            </div>
          </section>

          {/* FAQ */}
          <section className="py-16 bg-muted/30">
            <div className="container mx-auto px-4">
              <h2 className="text-2xl md:text-3xl font-bold text-center mb-12">
                Questions fréquentes – Tampons à Chaumont
              </h2>
              <div className="max-w-3xl mx-auto">
                <Accordion type="single" collapsible className="space-y-4">
                  {faqData.map((item, index) => (
                    <AccordionItem key={index} value={`item-${index}`} className="bg-background rounded-lg px-6">
                      <AccordionTrigger className="text-left font-medium">
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
          <section className="py-16 container mx-auto px-4">
            <Card className="max-w-2xl mx-auto text-center bg-primary text-primary-foreground">
              <CardContent className="pt-8 pb-8">
                <h2 className="text-2xl font-bold mb-4">
                  Besoin d'un tampon professionnel ?
                </h2>
                <p className="mb-6 opacity-90">
                  Demandez un devis gratuit en magasin ou par téléphone. Fabrication locale à Chaumont.
                </p>
                <div className="flex flex-col sm:flex-row gap-4 justify-center">
                  <Button size="lg" variant="secondary" asChild>
                    <Link to="/contact">Demander un devis</Link>
                  </Button>
                  <Button size="lg" variant="outline" className="bg-transparent border-primary-foreground hover:bg-primary-foreground hover:text-primary" asChild>
                    <a href="tel:+33325000000">Appeler</a>
                  </Button>
                </div>
              </CardContent>
            </Card>
          </section>

          {/* Maillage interne */}
          <section className="py-8 border-t">
            <div className="container mx-auto px-4">
              <p className="text-sm text-muted-foreground text-center">
                Découvrez aussi nos autres services à Chaumont : {" "}
                <Link to="/impression-urgente-chaumont" className="text-primary hover:underline">Impression urgente</Link> • {" "}
                <Link to="/photocopie-express-chaumont" className="text-primary hover:underline">Photocopie express</Link> • {" "}
                <Link to="/plaque-immatriculation-chaumont" className="text-primary hover:underline">Plaques d'immatriculation</Link> • {" "}
                <Link to="/solutions-institutions-chaumont" className="text-primary hover:underline">Solutions B2B</Link>
              </p>
            </div>
          </section>
        </main>

        <Footer />
      </div>
    </>
  );
};

export default TamponProfessionnel;
