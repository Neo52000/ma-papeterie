import { Helmet } from "react-helmet-async";
import Header from "@/components/layout/Header";
import Footer from "@/components/layout/Footer";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Link } from "react-router-dom";
import { Printer, Clock, CheckCircle, FileText, Users, Building2, Phone, MapPin } from "lucide-react";

const ImpressionUrgente = () => {
  const faqData = [
    {
      question: "Peut-on imprimer des documents en urgence à Chaumont ?",
      answer: "Oui, Ma Papeterie à Chaumont propose un service d'impression express sans rendez-vous. Apportez votre fichier sur clé USB ou envoyez-le par email pour une impression immédiate pendant les heures d'ouverture."
    },
    {
      question: "Quels formats d'impression sont disponibles en urgence ?",
      answer: "Les formats A4 et A3 sont disponibles en impression urgente, en noir et blanc ou en couleur. D'autres formats peuvent être réalisés sur demande selon les besoins."
    },
    {
      question: "Quel est le délai pour une impression urgente à Chaumont ?",
      answer: "Pour les documents standards, l'impression peut être réalisée pendant votre attente. Pour les volumes importants, un délai de quelques heures peut être nécessaire."
    },
    {
      question: "Peut-on imprimer des documents professionnels en urgence ?",
      answer: "Oui, Ma Papeterie imprime tous types de documents professionnels : devis, factures, présentations, rapports, supports de communication. Service adapté aux entreprises et professionnels de Chaumont."
    }
  ];

  const serviceSchema = {
    "@context": "https://schema.org",
    "@type": "Service",
    "name": "Impression urgente à Chaumont",
    "description": "Service d'impression de documents express sans rendez-vous à Chaumont, Haute-Marne. Impression A4, A3, noir et blanc et couleur.",
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
    "serviceType": "Impression de documents"
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
        <title>Impression urgente à Chaumont | Documents express sans rendez-vous | Ma Papeterie</title>
        <meta name="description" content="Service d'impression urgente à Chaumont, Haute-Marne. Impression de documents express sans rendez-vous. A4, A3, couleur et noir & blanc. Particuliers et professionnels." />
        <meta name="robots" content="index, follow" />
        <link rel="canonical" href="https://ma-papeterie.lovable.app/impression-urgente-chaumont" />
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
                  <Clock className="h-3 w-3 mr-1" />
                  Service express
                </Badge>
                <h1 className="text-3xl md:text-5xl font-bold text-foreground mb-6">
                  Impression urgente à Chaumont
                </h1>
                <p className="text-xl text-muted-foreground mb-8">
                  Besoin d'imprimer des documents rapidement ? Service sans rendez-vous 
                  au cœur de Chaumont, Haute-Marne.
                </p>
                <div className="flex flex-col sm:flex-row gap-4 justify-center">
                  <Button size="lg" asChild>
                    <Link to="/contact">
                      <MapPin className="h-4 w-4 mr-2" />
                      Venir en magasin
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
                    <Clock className="h-6 w-6 text-primary" />
                  </div>
                  <CardTitle>Sans rendez-vous</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-muted-foreground">
                    Venez directement pendant les heures d'ouverture. Pas besoin de réserver.
                  </p>
                </CardContent>
              </Card>
              
              <Card className="text-center">
                <CardHeader>
                  <div className="mx-auto w-12 h-12 bg-primary/10 rounded-full flex items-center justify-center mb-4">
                    <Printer className="h-6 w-6 text-primary" />
                  </div>
                  <CardTitle>Service rapide</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-muted-foreground">
                    Impression pendant votre attente pour les documents standards.
                  </p>
                </CardContent>
              </Card>
              
              <Card className="text-center">
                <CardHeader>
                  <div className="mx-auto w-12 h-12 bg-primary/10 rounded-full flex items-center justify-center mb-4">
                    <CheckCircle className="h-6 w-6 text-primary" />
                  </div>
                  <CardTitle>Qualité garantie</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-muted-foreground">
                    Équipement professionnel pour des impressions de qualité.
                  </p>
                </CardContent>
              </Card>
            </div>
          </section>

          {/* Pour qui ? */}
          <section className="py-16 bg-muted/30">
            <div className="container mx-auto px-4">
              <h2 className="text-2xl md:text-3xl font-bold text-center mb-12">
                Pour qui est ce service ?
              </h2>
              <div className="grid md:grid-cols-2 gap-8 max-w-4xl mx-auto">
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-3">
                      <Users className="h-5 w-5 text-primary" />
                      Particuliers
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <ul className="space-y-2 text-muted-foreground">
                      <li className="flex items-start gap-2">
                        <CheckCircle className="h-4 w-4 text-primary mt-1 flex-shrink-0" />
                        Documents administratifs urgents
                      </li>
                      <li className="flex items-start gap-2">
                        <CheckCircle className="h-4 w-4 text-primary mt-1 flex-shrink-0" />
                        CV et lettres de motivation
                      </li>
                      <li className="flex items-start gap-2">
                        <CheckCircle className="h-4 w-4 text-primary mt-1 flex-shrink-0" />
                        Documents scolaires
                      </li>
                      <li className="flex items-start gap-2">
                        <CheckCircle className="h-4 w-4 text-primary mt-1 flex-shrink-0" />
                        Photos et images
                      </li>
                    </ul>
                  </CardContent>
                </Card>
                
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-3">
                      <Building2 className="h-5 w-5 text-primary" />
                      Professionnels
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <ul className="space-y-2 text-muted-foreground">
                      <li className="flex items-start gap-2">
                        <CheckCircle className="h-4 w-4 text-primary mt-1 flex-shrink-0" />
                        Devis et factures en urgence
                      </li>
                      <li className="flex items-start gap-2">
                        <CheckCircle className="h-4 w-4 text-primary mt-1 flex-shrink-0" />
                        Présentations commerciales
                      </li>
                      <li className="flex items-start gap-2">
                        <CheckCircle className="h-4 w-4 text-primary mt-1 flex-shrink-0" />
                        Rapports et dossiers
                      </li>
                      <li className="flex items-start gap-2">
                        <CheckCircle className="h-4 w-4 text-primary mt-1 flex-shrink-0" />
                        Supports de communication
                      </li>
                    </ul>
                  </CardContent>
                </Card>
              </div>
            </div>
          </section>

          {/* Comment ça marche */}
          <section className="py-16 container mx-auto px-4">
            <h2 className="text-2xl md:text-3xl font-bold text-center mb-12">
              Comment imprimer vos documents ?
            </h2>
            <div className="grid md:grid-cols-3 gap-8 max-w-4xl mx-auto">
              <div className="text-center">
                <div className="w-12 h-12 bg-primary text-primary-foreground rounded-full flex items-center justify-center mx-auto mb-4 text-xl font-bold">
                  1
                </div>
                <h3 className="font-semibold mb-2">Apportez votre fichier</h3>
                <p className="text-sm text-muted-foreground">
                  Sur clé USB, par email ou depuis votre téléphone
                </p>
              </div>
              <div className="text-center">
                <div className="w-12 h-12 bg-primary text-primary-foreground rounded-full flex items-center justify-center mx-auto mb-4 text-xl font-bold">
                  2
                </div>
                <h3 className="font-semibold mb-2">Choisissez vos options</h3>
                <p className="text-sm text-muted-foreground">
                  Format, couleur, nombre de copies, finition
                </p>
              </div>
              <div className="text-center">
                <div className="w-12 h-12 bg-primary text-primary-foreground rounded-full flex items-center justify-center mx-auto mb-4 text-xl font-bold">
                  3
                </div>
                <h3 className="font-semibold mb-2">Repartez avec vos documents</h3>
                <p className="text-sm text-muted-foreground">
                  Impression immédiate pendant votre attente
                </p>
              </div>
            </div>
          </section>

          {/* FAQ */}
          <section className="py-16 bg-muted/30">
            <div className="container mx-auto px-4">
              <h2 className="text-2xl md:text-3xl font-bold text-center mb-12">
                Questions fréquentes – Impression à Chaumont
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
                  Besoin d'imprimer maintenant ?
                </h2>
                <p className="mb-6 opacity-90">
                  Rendez-vous directement en magasin à Chaumont ou appelez-nous pour préparer votre commande.
                </p>
                <div className="flex flex-col sm:flex-row gap-4 justify-center">
                  <Button size="lg" variant="secondary" asChild>
                    <Link to="/contact">Voir l'adresse</Link>
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
                <Link to="/photocopie-express-chaumont" className="text-primary hover:underline">Photocopie express</Link> • {" "}
                <Link to="/plaque-immatriculation-chaumont" className="text-primary hover:underline">Plaques d'immatriculation</Link> • {" "}
                <Link to="/tampon-professionnel-chaumont" className="text-primary hover:underline">Tampons professionnels</Link> • {" "}
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

export default ImpressionUrgente;
