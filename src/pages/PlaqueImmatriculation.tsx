import { Helmet } from "react-helmet-async";
import Header from "@/components/layout/Header";
import Footer from "@/components/layout/Footer";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Link } from "react-router-dom";
import { Car, Clock, CheckCircle, Shield, Users, Building2, Phone, MapPin, Bike } from "lucide-react";

const PlaqueImmatriculation = () => {
  const faqData = [
    {
      question: "Où faire une plaque d'immatriculation à Chaumont ?",
      answer: "Ma Papeterie à Chaumont fabrique des plaques d'immatriculation homologuées sur place. Le service est disponible sans rendez-vous pendant les heures d'ouverture du magasin, en centre-ville de Chaumont, Haute-Marne."
    },
    {
      question: "Quels documents apporter pour une plaque d'immatriculation ?",
      answer: "Présentez votre carte grise (certificat d'immatriculation) avec le numéro d'immatriculation visible. Pour les véhicules neufs, le certificat provisoire suffit."
    },
    {
      question: "Quel est le délai de fabrication d'une plaque à Chaumont ?",
      answer: "La fabrication est réalisée sur place en quelques minutes. Vous repartez immédiatement avec votre plaque d'immatriculation, prête à être posée."
    },
    {
      question: "Fabriquez-vous des plaques pour tous les véhicules ?",
      answer: "Oui, Ma Papeterie fabrique des plaques pour voitures, utilitaires, motos, scooters et remorques. Toutes les plaques sont conformes à la réglementation française en vigueur."
    },
    {
      question: "Les plaques sont-elles homologuées ?",
      answer: "Oui, toutes les plaques fabriquées sont homologuées et conformes à l'arrêté du 9 février 2009. Elles comportent le numéro TPPR d'homologation obligatoire."
    }
  ];

  const serviceSchema = {
    "@context": "https://schema.org",
    "@type": "Service",
    "name": "Plaque d'immatriculation rapide à Chaumont",
    "description": "Fabrication de plaques d'immatriculation homologuées sans rendez-vous à Chaumont, Haute-Marne. Voitures, motos, utilitaires.",
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
    "serviceType": "Fabrication de plaques d'immatriculation"
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
        <title>Plaque d'immatriculation rapide à Chaumont | Fabrication sans rendez-vous | Ma Papeterie</title>
        <meta name="description" content="Fabrication de plaques d'immatriculation homologuées à Chaumont, Haute-Marne. Service rapide sans rendez-vous. Voitures, motos, utilitaires. Plaques conformes." />
        <meta name="robots" content="index, follow" />
        <link rel="canonical" href="https://ma-papeterie.fr/plaque-immatriculation-chaumont" />
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
                  Fabrication immédiate
                </Badge>
                <h1 className="text-3xl md:text-5xl font-bold text-foreground mb-6">
                  Plaque d'immatriculation rapide à Chaumont
                </h1>
                <p className="text-xl text-muted-foreground mb-8">
                  Plaques homologuées fabriquées sur place, sans rendez-vous.
                  Service disponible à Chaumont, Haute-Marne.
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
                  <CardTitle>Fabrication immédiate</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-muted-foreground">
                    Plaque réalisée en quelques minutes pendant votre visite. Repartez avec.
                  </p>
                </CardContent>
              </Card>
              
              <Card className="text-center">
                <CardHeader>
                  <div className="mx-auto w-12 h-12 bg-primary/10 rounded-full flex items-center justify-center mb-4">
                    <Shield className="h-6 w-6 text-primary" />
                  </div>
                  <CardTitle>100% homologuées</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-muted-foreground">
                    Toutes nos plaques sont conformes à la réglementation française.
                  </p>
                </CardContent>
              </Card>
              
              <Card className="text-center">
                <CardHeader>
                  <div className="mx-auto w-12 h-12 bg-primary/10 rounded-full flex items-center justify-center mb-4">
                    <Car className="h-6 w-6 text-primary" />
                  </div>
                  <CardTitle>Tous véhicules</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-muted-foreground">
                    Voitures, utilitaires, motos, scooters et remorques.
                  </p>
                </CardContent>
              </Card>
            </div>
          </section>

          {/* Types de véhicules */}
          <section className="py-16 bg-muted/30">
            <div className="container mx-auto px-4">
              <h2 className="text-2xl md:text-3xl font-bold text-center mb-12">
                Plaques pour tous types de véhicules
              </h2>
              <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-6 max-w-5xl mx-auto">
                <Card className="text-center p-6">
                  <Car className="h-10 w-10 text-primary mx-auto mb-3" />
                  <h3 className="font-semibold">Voitures</h3>
                  <p className="text-sm text-muted-foreground mt-2">Plaques avant et arrière</p>
                </Card>
                <Card className="text-center p-6">
                  <Car className="h-10 w-10 text-primary mx-auto mb-3" />
                  <h3 className="font-semibold">Utilitaires</h3>
                  <p className="text-sm text-muted-foreground mt-2">Tous gabarits</p>
                </Card>
                <Card className="text-center p-6">
                  <Bike className="h-10 w-10 text-primary mx-auto mb-3" />
                  <h3 className="font-semibold">Motos & Scooters</h3>
                  <p className="text-sm text-muted-foreground mt-2">Format réglementaire</p>
                </Card>
                <Card className="text-center p-6">
                  <Car className="h-10 w-10 text-primary mx-auto mb-3" />
                  <h3 className="font-semibold">Remorques</h3>
                  <p className="text-sm text-muted-foreground mt-2">Plaques arrière</p>
                </Card>
              </div>
            </div>
          </section>

          {/* Comment ça marche */}
          <section className="py-16 container mx-auto px-4">
            <h2 className="text-2xl md:text-3xl font-bold text-center mb-12">
              Comment obtenir votre plaque ?
            </h2>
            <div className="grid md:grid-cols-3 gap-8 max-w-4xl mx-auto">
              <div className="text-center">
                <div className="w-12 h-12 bg-primary text-primary-foreground rounded-full flex items-center justify-center mx-auto mb-4 text-xl font-bold">
                  1
                </div>
                <h3 className="font-semibold mb-2">Apportez votre carte grise</h3>
                <p className="text-sm text-muted-foreground">
                  Certificat d'immatriculation original ou provisoire
                </p>
              </div>
              <div className="text-center">
                <div className="w-12 h-12 bg-primary text-primary-foreground rounded-full flex items-center justify-center mx-auto mb-4 text-xl font-bold">
                  2
                </div>
                <h3 className="font-semibold mb-2">Choisissez le département</h3>
                <p className="text-sm text-muted-foreground">
                  Logo régional et numéro de département de votre choix
                </p>
              </div>
              <div className="text-center">
                <div className="w-12 h-12 bg-primary text-primary-foreground rounded-full flex items-center justify-center mx-auto mb-4 text-xl font-bold">
                  3
                </div>
                <h3 className="font-semibold mb-2">Fabrication sur place</h3>
                <p className="text-sm text-muted-foreground">
                  Plaque prête en quelques minutes
                </p>
              </div>
            </div>
          </section>

          {/* FAQ */}
          <section className="py-16 bg-muted/30">
            <div className="container mx-auto px-4">
              <h2 className="text-2xl md:text-3xl font-bold text-center mb-12">
                Questions fréquentes – Plaques d'immatriculation à Chaumont
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
                  Besoin d'une plaque rapidement ?
                </h2>
                <p className="mb-6 opacity-90">
                  Venez avec votre carte grise. Fabrication immédiate à Chaumont, sans rendez-vous.
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
                <Link to="/photocopie-express-chaumont" className="text-primary hover:underline">Photocopie express</Link> • {" "}
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

export default PlaqueImmatriculation;
