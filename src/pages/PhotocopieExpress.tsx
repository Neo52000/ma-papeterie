import { Helmet } from "react-helmet-async";
import Header from "@/components/layout/Header";
import Footer from "@/components/layout/Footer";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Link } from "react-router-dom";
import { Copy, Clock, CheckCircle, FileText, Users, Building2, Phone, MapPin, Zap, Upload, LogIn } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import PrintDocumentUpload from "@/components/print/PrintDocumentUpload";
import { PricingDetailSection, REPROGRAPHY_PRICING, SHIPPING_PRICING } from "@/components/pricing/PricingDetailSection";
import ServiceOrderTunnel from "@/components/service-tunnel/ServiceOrderTunnel";

const PhotocopieExpress = () => {
  const { user } = useAuth();
  const faqData = [
    {
      question: "Où faire des photocopies rapidement à Chaumont ?",
      answer: "Ma Papeterie à Chaumont propose un service de photocopie express sans rendez-vous. Le magasin est situé en centre-ville et accessible pendant les heures d'ouverture pour des photocopies immédiates."
    },
    {
      question: "Quels types de photocopies peut-on faire ?",
      answer: "Photocopies A4 et A3, noir et blanc ou couleur, recto simple ou recto-verso. Possibilité d'agrandissement et de réduction selon les besoins."
    },
    {
      question: "Peut-on faire des photocopies en grande quantité ?",
      answer: "Oui, Ma Papeterie réalise des photocopies en volume pour les particuliers et professionnels. Pour les grandes quantités, un délai peut être nécessaire selon la charge."
    },
    {
      question: "Quel est le tarif des photocopies à Chaumont ?",
      answer: "Nos tarifs commencent à 0,10€ HT la copie A4 noir & blanc et 0,50€ HT la copie A4 couleur. Des suppléments s'appliquent pour le recto-verso, les papiers épais, la reliure et la plastification. Consultez notre grille tarifaire ci-dessus pour le détail complet."
    }
  ];

  const serviceSchema = {
    "@context": "https://schema.org",
    "@type": "Service",
    "name": "Photocopie express à Chaumont",
    "description": "Service de photocopie rapide sans rendez-vous à Chaumont, Haute-Marne. Photocopies A4, A3, noir et blanc et couleur.",
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
    "serviceType": "Photocopie"
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
        <title>Photocopie express à Chaumont | Service rapide sans rendez-vous | Ma Papeterie</title>
        <meta name="description" content="Service de photocopie express à Chaumont, Haute-Marne. Photocopies A4, A3, couleur et noir & blanc sans rendez-vous. Particuliers et professionnels." />
        <meta name="robots" content="index, follow" />
        <link rel="canonical" href="https://ma-papeterie.fr/photocopie-express-chaumont" />
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
                  <Zap className="h-3 w-3 mr-1" />
                  Service express
                </Badge>
                <h1 className="text-3xl md:text-5xl font-bold text-foreground mb-6">
                  Photocopie express à Chaumont
                </h1>
                <p className="text-xl text-muted-foreground mb-8">
                  Photocopies rapides et de qualité, sans rendez-vous, 
                  au cœur de Chaumont en Haute-Marne.
                </p>
                <div className="flex flex-col sm:flex-row gap-4 justify-center">
                  <Button size="lg" asChild>
                    <a href="#envoyer-document">
                      <Upload className="h-4 w-4 mr-2" />
                      Envoyer mon document
                    </a>
                  </Button>
                  <Button size="lg" variant="outline" asChild>
                    <Link to="/contact">
                      <MapPin className="h-4 w-4 mr-2" />
                      Venir en magasin
                    </Link>
                  </Button>
                </div>
              </div>
            </div>
          </section>

          {/* Section envoi de document */}
          <section className="py-16 container mx-auto px-4" id="envoyer-document">
            {/* CTA vers le tunnel de commande avec paiement */}
            <Card className="max-w-2xl mx-auto mb-10 border-primary/30 bg-primary/5">
              <CardContent className="pt-6 pb-6 text-center space-y-3">
                <h2 className="text-xl md:text-2xl font-bold">Commander en ligne avec paiement sécurisé</h2>
                <p className="text-muted-foreground text-sm">
                  Envoyez votre document, choisissez vos options, payez en ligne et récupérez en boutique ou faites-vous livrer.
                </p>
                <Button asChild size="lg" className="mt-2">
                  <Link to="/services/reprographie">Commander en ligne</Link>
                </Button>
              </CardContent>
            </Card>

            <h2 className="text-2xl md:text-3xl font-bold text-center mb-4">
              Envoyez votre document en ligne
            </h2>
            <p className="text-center text-muted-foreground mb-8 max-w-xl mx-auto">
              Gagnez du temps : envoyez votre fichier PDF depuis chez vous et récupérez vos copies en magasin.
            </p>

            {user ? (
              <ServiceOrderTunnel serviceType="reprography" />
            ) : (
              <Card className="max-w-lg mx-auto text-center">
                <CardContent className="pt-8 pb-8 space-y-4">
                  <LogIn className="h-12 w-12 mx-auto text-muted-foreground" />
                  <h3 className="text-lg font-semibold">Connectez-vous pour envoyer vos documents</h3>
                  <p className="text-sm text-muted-foreground">
                    Créez un compte ou connectez-vous pour accéder au service d'envoi de documents en ligne.
                  </p>
                  <div className="flex flex-col sm:flex-row gap-3 justify-center">
                    <Button asChild size="lg">
                      <Link to="/auth?redirect=/photocopie-express-chaumont#envoyer-document">
                        Se connecter
                      </Link>
                    </Button>
                    <Button asChild size="lg" variant="outline">
                      <Link to="/auth?redirect=/photocopie-express-chaumont#envoyer-document">
                        Créer un compte
                      </Link>
                    </Button>
                  </div>
                </CardContent>
              </Card>
            )}
          </section>

          {/* Avantages */}
          <section className="py-16 container mx-auto px-4">
            <div className="grid md:grid-cols-3 gap-8 max-w-5xl mx-auto">
              <Card className="text-center">
                <CardHeader>
                  <div className="mx-auto w-12 h-12 bg-primary/10 rounded-full flex items-center justify-center mb-4">
                    <Clock className="h-6 w-6 text-primary" />
                  </div>
                  <CardTitle>Sans attente</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-muted-foreground">
                    Service immédiat pour les petits volumes. Venez avec vos documents originaux.
                  </p>
                </CardContent>
              </Card>
              
              <Card className="text-center">
                <CardHeader>
                  <div className="mx-auto w-12 h-12 bg-primary/10 rounded-full flex items-center justify-center mb-4">
                    <Copy className="h-6 w-6 text-primary" />
                  </div>
                  <CardTitle>Tous formats</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-muted-foreground">
                    A4, A3, réduction, agrandissement. Noir et blanc ou couleur.
                  </p>
                </CardContent>
              </Card>
              
              <Card className="text-center">
                <CardHeader>
                  <div className="mx-auto w-12 h-12 bg-primary/10 rounded-full flex items-center justify-center mb-4">
                    <CheckCircle className="h-6 w-6 text-primary" />
                  </div>
                  <CardTitle>Tarifs dégressifs</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-muted-foreground">
                    Prix avantageux pour les volumes importants et les professionnels.
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
                        Documents administratifs (carte d'identité, permis...)
                      </li>
                      <li className="flex items-start gap-2">
                        <CheckCircle className="h-4 w-4 text-primary mt-1 flex-shrink-0" />
                        Dossiers de location, assurance
                      </li>
                      <li className="flex items-start gap-2">
                        <CheckCircle className="h-4 w-4 text-primary mt-1 flex-shrink-0" />
                        Documents scolaires et universitaires
                      </li>
                      <li className="flex items-start gap-2">
                        <CheckCircle className="h-4 w-4 text-primary mt-1 flex-shrink-0" />
                        Courriers et correspondances
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
                        Contrats et documents juridiques
                      </li>
                      <li className="flex items-start gap-2">
                        <CheckCircle className="h-4 w-4 text-primary mt-1 flex-shrink-0" />
                        Supports de réunion
                      </li>
                      <li className="flex items-start gap-2">
                        <CheckCircle className="h-4 w-4 text-primary mt-1 flex-shrink-0" />
                        Documentation technique
                      </li>
                      <li className="flex items-start gap-2">
                        <CheckCircle className="h-4 w-4 text-primary mt-1 flex-shrink-0" />
                        Archivage et duplicatas
                      </li>
                    </ul>
                  </CardContent>
                </Card>
              </div>
            </div>
          </section>

          {/* Options disponibles */}
          <section className="py-16 container mx-auto px-4">
            <h2 className="text-2xl md:text-3xl font-bold text-center mb-12">
              Options de photocopie disponibles
            </h2>
            <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-6 max-w-5xl mx-auto">
              <Card className="text-center p-6">
                <FileText className="h-8 w-8 text-primary mx-auto mb-3" />
                <h3 className="font-semibold">Noir & blanc</h3>
                <p className="text-sm text-muted-foreground mt-2">A4 et A3</p>
              </Card>
              <Card className="text-center p-6">
                <FileText className="h-8 w-8 text-primary mx-auto mb-3" />
                <h3 className="font-semibold">Couleur</h3>
                <p className="text-sm text-muted-foreground mt-2">A4 et A3</p>
              </Card>
              <Card className="text-center p-6">
                <Copy className="h-8 w-8 text-primary mx-auto mb-3" />
                <h3 className="font-semibold">Recto-verso</h3>
                <p className="text-sm text-muted-foreground mt-2">Économique</p>
              </Card>
              <Card className="text-center p-6">
                <Copy className="h-8 w-8 text-primary mx-auto mb-3" />
                <h3 className="font-semibold">Agrandissement</h3>
                <p className="text-sm text-muted-foreground mt-2">Jusqu'à A3</p>
              </Card>
            </div>
          </section>

          {/* Tarifs reprographie */}
          <section className="py-16 bg-muted/30" id="tarifs">
            <div className="container mx-auto px-4 max-w-4xl">
              <h2 className="text-2xl md:text-3xl font-bold text-center mb-8">
                Tarifs reprographie
              </h2>
              <PricingDetailSection tables={REPROGRAPHY_PRICING} />
              <div className="mt-12">
                <PricingDetailSection title="Frais de livraison" tables={[SHIPPING_PRICING]} />
              </div>
            </div>
          </section>

          {/* FAQ */}
          <section className="py-16">
            <div className="container mx-auto px-4">
              <h2 className="text-2xl md:text-3xl font-bold text-center mb-12">
                Questions fréquentes – Photocopie à Chaumont
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
                  Besoin de photocopies maintenant ?
                </h2>
                <p className="mb-6 opacity-90">
                  Apportez vos documents originaux en magasin à Chaumont. Service immédiat sans rendez-vous.
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
                <Link to="/impression-urgente-chaumont" className="text-primary hover:underline">Impression urgente</Link> • {" "}
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

export default PhotocopieExpress;
