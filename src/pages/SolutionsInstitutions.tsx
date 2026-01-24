import { Helmet } from "react-helmet-async";
import Header from "@/components/layout/Header";
import Footer from "@/components/layout/Footer";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Link } from "react-router-dom";
import { 
  Building2, GraduationCap, Users, Landmark, 
  CheckCircle, Phone, MapPin, FileText, Printer, 
  Stamp, Package, Handshake, Clock
} from "lucide-react";

const SolutionsInstitutions = () => {
  const faqData = [
    {
      question: "Ma Papeterie fournit-elle les écoles de Chaumont ?",
      answer: "Oui, Ma Papeterie à Chaumont fournit les établissements scolaires en fournitures de bureau, papeterie et services d'impression. Le magasin propose des solutions adaptées aux besoins des écoles primaires, collèges et lycées de Chaumont et de Haute-Marne."
    },
    {
      question: "Proposez-vous des tarifs pour les collectivités ?",
      answer: "Des conditions tarifaires adaptées sont proposées aux collectivités locales, mairies et administrations. Contactez le magasin pour établir un devis personnalisé selon vos besoins et volumes."
    },
    {
      question: "Comment passer commande pour une association ?",
      answer: "Les associations peuvent passer commande directement en magasin ou par téléphone. Ma Papeterie propose une facturation adaptée aux structures associatives avec des délais de paiement possibles."
    },
    {
      question: "Livrez-vous les établissements à Chaumont ?",
      answer: "Pour les commandes importantes, des solutions de livraison peuvent être envisagées sur Chaumont et ses environs. Contactez le magasin pour discuter des modalités selon vos besoins."
    }
  ];

  const serviceSchema = {
    "@context": "https://schema.org",
    "@type": "Service",
    "name": "Solutions papeterie & impression pour institutions à Chaumont",
    "description": "Fournitures et services pour écoles, mairies, associations à Chaumont, Haute-Marne. Papeterie, impression, tampons pour collectivités.",
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
    "serviceType": "Fournitures et services pour institutions"
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
        <title>Solutions papeterie & impression pour écoles, mairies et associations à Chaumont | Ma Papeterie</title>
        <meta name="description" content="Fournitures de bureau et services pour écoles, mairies, associations et collectivités à Chaumont, Haute-Marne. Partenaire local fiable. Devis personnalisés." />
        <meta name="robots" content="index, follow" />
        <link rel="canonical" href="https://ma-papeterie.lovable.app/solutions-institutions-chaumont" />
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
                  <Handshake className="h-3 w-3 mr-1" />
                  Partenaire local
                </Badge>
                <h1 className="text-3xl md:text-5xl font-bold text-foreground mb-6">
                  Solutions papeterie & impression pour écoles, mairies et associations à Chaumont
                </h1>
                <p className="text-xl text-muted-foreground mb-8">
                  Votre partenaire de proximité pour les fournitures et services 
                  des institutions locales en Haute-Marne.
                </p>
                <div className="flex flex-col sm:flex-row gap-4 justify-center">
                  <Button size="lg" asChild>
                    <Link to="/contact">
                      <Phone className="h-4 w-4 mr-2" />
                      Nous contacter
                    </Link>
                  </Button>
                  <Button size="lg" variant="outline" asChild>
                    <Link to="/pack-pro-local-chaumont">
                      <Package className="h-4 w-4 mr-2" />
                      Découvrir le Pack Pro
                    </Link>
                  </Button>
                </div>
              </div>
            </div>
          </section>

          {/* Cibles */}
          <section className="py-16 container mx-auto px-4">
            <h2 className="text-2xl md:text-3xl font-bold text-center mb-12">
              Nous accompagnons les institutions de Chaumont
            </h2>
            <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-6 max-w-5xl mx-auto">
              <Card className="text-center p-6 hover:shadow-lg transition-shadow">
                <GraduationCap className="h-12 w-12 text-primary mx-auto mb-4" />
                <h3 className="font-semibold text-lg mb-2">Écoles</h3>
                <p className="text-sm text-muted-foreground">Primaires, collèges, lycées</p>
              </Card>
              <Card className="text-center p-6 hover:shadow-lg transition-shadow">
                <Landmark className="h-12 w-12 text-primary mx-auto mb-4" />
                <h3 className="font-semibold text-lg mb-2">Mairies</h3>
                <p className="text-sm text-muted-foreground">Services municipaux</p>
              </Card>
              <Card className="text-center p-6 hover:shadow-lg transition-shadow">
                <Users className="h-12 w-12 text-primary mx-auto mb-4" />
                <h3 className="font-semibold text-lg mb-2">Associations</h3>
                <p className="text-sm text-muted-foreground">Culturelles, sportives, sociales</p>
              </Card>
              <Card className="text-center p-6 hover:shadow-lg transition-shadow">
                <Building2 className="h-12 w-12 text-primary mx-auto mb-4" />
                <h3 className="font-semibold text-lg mb-2">Administrations</h3>
                <p className="text-sm text-muted-foreground">Services publics locaux</p>
              </Card>
            </div>
          </section>

          {/* Services proposés */}
          <section className="py-16 bg-muted/30">
            <div className="container mx-auto px-4">
              <h2 className="text-2xl md:text-3xl font-bold text-center mb-12">
                Services adaptés aux institutions
              </h2>
              <div className="grid md:grid-cols-2 gap-8 max-w-5xl mx-auto">
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-3">
                      <Package className="h-5 w-5 text-primary" />
                      Fournitures papier
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <ul className="space-y-2 text-muted-foreground">
                      <li className="flex items-start gap-2">
                        <CheckCircle className="h-4 w-4 text-primary mt-1 flex-shrink-0" />
                        Ramettes de papier (tous grammages)
                      </li>
                      <li className="flex items-start gap-2">
                        <CheckCircle className="h-4 w-4 text-primary mt-1 flex-shrink-0" />
                        Enveloppes et pochettes
                      </li>
                      <li className="flex items-start gap-2">
                        <CheckCircle className="h-4 w-4 text-primary mt-1 flex-shrink-0" />
                        Classeurs, chemises, dossiers
                      </li>
                      <li className="flex items-start gap-2">
                        <CheckCircle className="h-4 w-4 text-primary mt-1 flex-shrink-0" />
                        Fournitures de bureau courantes
                      </li>
                    </ul>
                  </CardContent>
                </Card>
                
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-3">
                      <Printer className="h-5 w-5 text-primary" />
                      Impression & photocopie
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <ul className="space-y-2 text-muted-foreground">
                      <li className="flex items-start gap-2">
                        <CheckCircle className="h-4 w-4 text-primary mt-1 flex-shrink-0" />
                        Impression de documents en volume
                      </li>
                      <li className="flex items-start gap-2">
                        <CheckCircle className="h-4 w-4 text-primary mt-1 flex-shrink-0" />
                        Photocopies pour réunions et assemblées
                      </li>
                      <li className="flex items-start gap-2">
                        <CheckCircle className="h-4 w-4 text-primary mt-1 flex-shrink-0" />
                        Supports de communication
                      </li>
                      <li className="flex items-start gap-2">
                        <CheckCircle className="h-4 w-4 text-primary mt-1 flex-shrink-0" />
                        Documents administratifs
                      </li>
                    </ul>
                  </CardContent>
                </Card>
                
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-3">
                      <FileText className="h-5 w-5 text-primary" />
                      Documents administratifs
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <ul className="space-y-2 text-muted-foreground">
                      <li className="flex items-start gap-2">
                        <CheckCircle className="h-4 w-4 text-primary mt-1 flex-shrink-0" />
                        Registres officiels
                      </li>
                      <li className="flex items-start gap-2">
                        <CheckCircle className="h-4 w-4 text-primary mt-1 flex-shrink-0" />
                        Carnets à souche
                      </li>
                      <li className="flex items-start gap-2">
                        <CheckCircle className="h-4 w-4 text-primary mt-1 flex-shrink-0" />
                        Formulaires personnalisés
                      </li>
                      <li className="flex items-start gap-2">
                        <CheckCircle className="h-4 w-4 text-primary mt-1 flex-shrink-0" />
                        Certificats et attestations
                      </li>
                    </ul>
                  </CardContent>
                </Card>
                
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-3">
                      <Stamp className="h-5 w-5 text-primary" />
                      Tampons officiels
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <ul className="space-y-2 text-muted-foreground">
                      <li className="flex items-start gap-2">
                        <CheckCircle className="h-4 w-4 text-primary mt-1 flex-shrink-0" />
                        Cachets de mairie
                      </li>
                      <li className="flex items-start gap-2">
                        <CheckCircle className="h-4 w-4 text-primary mt-1 flex-shrink-0" />
                        Tampons d'établissement scolaire
                      </li>
                      <li className="flex items-start gap-2">
                        <CheckCircle className="h-4 w-4 text-primary mt-1 flex-shrink-0" />
                        Cachets d'association
                      </li>
                      <li className="flex items-start gap-2">
                        <CheckCircle className="h-4 w-4 text-primary mt-1 flex-shrink-0" />
                        Tampons dateurs
                      </li>
                    </ul>
                  </CardContent>
                </Card>
              </div>
            </div>
          </section>

          {/* Pourquoi nous choisir */}
          <section className="py-16 container mx-auto px-4">
            <h2 className="text-2xl md:text-3xl font-bold text-center mb-12">
              Pourquoi choisir un partenaire local ?
            </h2>
            <div className="grid md:grid-cols-4 gap-6 max-w-5xl mx-auto">
              <div className="text-center">
                <div className="w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-4">
                  <MapPin className="h-8 w-8 text-primary" />
                </div>
                <h3 className="font-semibold mb-2">Proximité</h3>
                <p className="text-sm text-muted-foreground">
                  Un interlocuteur accessible en centre-ville de Chaumont
                </p>
              </div>
              <div className="text-center">
                <div className="w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-4">
                  <Clock className="h-8 w-8 text-primary" />
                </div>
                <h3 className="font-semibold mb-2">Réactivité</h3>
                <p className="text-sm text-muted-foreground">
                  Réponse rapide à vos besoins urgents
                </p>
              </div>
              <div className="text-center">
                <div className="w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-4">
                  <Handshake className="h-8 w-8 text-primary" />
                </div>
                <h3 className="font-semibold mb-2">Fiabilité</h3>
                <p className="text-sm text-muted-foreground">
                  Un commerce établi, partenaire de confiance
                </p>
              </div>
              <div className="text-center">
                <div className="w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-4">
                  <FileText className="h-8 w-8 text-primary" />
                </div>
                <h3 className="font-semibold mb-2">Facturation simple</h3>
                <p className="text-sm text-muted-foreground">
                  Procédures adaptées aux marchés publics
                </p>
              </div>
            </div>
          </section>

          {/* FAQ */}
          <section className="py-16 bg-muted/30">
            <div className="container mx-auto px-4">
              <h2 className="text-2xl md:text-3xl font-bold text-center mb-12">
                Questions fréquentes – Institutions à Chaumont
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
                  Établissons un partenariat
                </h2>
                <p className="mb-6 opacity-90">
                  Contactez-nous pour discuter de vos besoins et recevoir une proposition adaptée à votre structure.
                </p>
                <div className="flex flex-col sm:flex-row gap-4 justify-center">
                  <Button size="lg" variant="secondary" asChild>
                    <Link to="/contact">Nous contacter</Link>
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
                Découvrez aussi : {" "}
                <Link to="/pack-pro-local-chaumont" className="text-primary hover:underline">Pack Pro Local</Link> • {" "}
                <Link to="/impression-urgente-chaumont" className="text-primary hover:underline">Impression urgente</Link> • {" "}
                <Link to="/tampon-professionnel-chaumont" className="text-primary hover:underline">Tampons professionnels</Link> • {" "}
                <Link to="/photocopie-express-chaumont" className="text-primary hover:underline">Photocopie express</Link>
              </p>
            </div>
          </section>
        </main>

        <Footer />
      </div>
    </>
  );
};

export default SolutionsInstitutions;
