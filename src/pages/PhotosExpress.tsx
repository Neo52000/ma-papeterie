import { Helmet } from "react-helmet-async";
import Header from "@/components/layout/Header";
import Footer from "@/components/layout/Footer";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Link } from "react-router-dom";
import { Camera, Clock, CheckCircle, Users, Building2, MapPin, Image, Zap, LogIn } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import ServiceOrderTunnel from "@/components/service-tunnel/ServiceOrderTunnel";

const PhotosExpress = () => {
  const { user } = useAuth();

  const faqData = [
    {
      question: "Où faire des tirages photo à Chaumont ?",
      answer: "Ma Papeterie à Chaumont propose un service de tirage photo express. Envoyez vos photos en ligne et récupérez vos tirages en magasin, ou venez directement avec votre clé USB.",
    },
    {
      question: "Quels formats de tirage photo sont disponibles ?",
      answer: "Nous proposons les formats classiques : 10x15 cm, 13x18 cm, 15x20 cm, 20x30 cm et 30x45 cm. Finition mate ou brillante au choix.",
    },
    {
      question: "Peut-on envoyer ses photos en ligne pour tirage ?",
      answer: "Oui ! Créez un compte sur notre site, importez vos photos (JPG, PNG), choisissez le format et la finition, et récupérez vos tirages en magasin à Chaumont.",
    },
    {
      question: "Quel est le délai pour un tirage photo express ?",
      answer: "Les tirages standards sont généralement prêts sous 24h. Pour les petites quantités, le retrait peut être possible le jour même selon les horaires.",
    },
  ];

  const serviceSchema = {
    "@context": "https://schema.org",
    "@type": "Service",
    "name": "Tirage photo express à Chaumont",
    "description": "Service de tirage photo rapide à Chaumont, Haute-Marne. Tirages 10x15 à 30x45, finition mate ou brillante. Envoi en ligne et retrait en magasin.",
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
    "areaServed": { "@type": "City", "name": "Chaumont" },
    "serviceType": "Tirage photo",
  };

  const faqSchema = {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    "mainEntity": faqData.map(item => ({
      "@type": "Question",
      "name": item.question,
      "acceptedAnswer": { "@type": "Answer", "text": item.answer },
    })),
  };

  return (
    <>
      <Helmet>
        <title>Tirage photo express à Chaumont | Photos en ligne & retrait magasin | Ma Papeterie</title>
        <meta name="description" content="Tirage photo express à Chaumont, Haute-Marne. Envoyez vos photos en ligne, choisissez format et finition, et récupérez vos tirages en magasin. Du 10x15 au 30x45." />
        <meta name="robots" content="index, follow" />
        <link rel="canonical" href="https://ma-papeterie.fr/photos-express-chaumont" />
        <script type="application/ld+json">{JSON.stringify(serviceSchema)}</script>
        <script type="application/ld+json">{JSON.stringify(faqSchema)}</script>
      </Helmet>

      <div className="min-h-screen bg-background">
        <Header />

        <main>
          {/* Hero */}
          <section className="bg-gradient-to-b from-primary/10 to-background py-16">
            <div className="container mx-auto px-4">
              <div className="max-w-4xl mx-auto text-center">
                <Badge variant="secondary" className="mb-4">
                  <Zap className="h-3 w-3 mr-1" />
                  Service express
                </Badge>
                <h1 className="text-3xl md:text-5xl font-bold text-foreground mb-6">
                  Tirage photo express à Chaumont
                </h1>
                <p className="text-xl text-muted-foreground mb-8">
                  Envoyez vos photos en ligne et récupérez vos tirages en magasin.
                  Du 10x15 au 30x45, finition mate ou brillante.
                </p>
                <div className="flex flex-col sm:flex-row gap-4 justify-center">
                  <Button size="lg" asChild>
                    <a href="#envoyer-photos">
                      <Camera className="h-4 w-4 mr-2" />
                      Envoyer mes photos
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

          {/* Section envoi de photos */}
          <section className="py-16 container mx-auto px-4" id="envoyer-photos">
            {/* CTA vers le tunnel de commande avec paiement */}
            <Card className="max-w-2xl mx-auto mb-10 border-primary/30 bg-primary/5">
              <CardContent className="pt-6 pb-6 text-center space-y-3">
                <h2 className="text-xl md:text-2xl font-bold">Commander en ligne avec paiement sécurisé</h2>
                <p className="text-muted-foreground text-sm">
                  Uploadez vos photos, choisissez le format et la finition, payez en ligne et récupérez en boutique ou faites-vous livrer.
                </p>
                <Button asChild size="lg" className="mt-2">
                  <Link to="/services/developpement-photo">Commander en ligne</Link>
                </Button>
              </CardContent>
            </Card>

            <h2 className="text-2xl md:text-3xl font-bold text-center mb-4">
              Envoyez vos photos en ligne
            </h2>
            <p className="text-center text-muted-foreground mb-8 max-w-xl mx-auto">
              Importez jusqu'à 50 photos, choisissez le format et la finition, et récupérez vos tirages en magasin.
            </p>

            {user ? (
              <ServiceOrderTunnel serviceType="photo" />
            ) : (
              <Card className="max-w-lg mx-auto text-center">
                <CardContent className="pt-8 pb-8 space-y-4">
                  <LogIn className="h-12 w-12 mx-auto text-muted-foreground" />
                  <h3 className="text-lg font-semibold">Connectez-vous pour envoyer vos photos</h3>
                  <p className="text-sm text-muted-foreground">
                    Créez un compte ou connectez-vous pour accéder au service de tirage photo en ligne.
                  </p>
                  <div className="flex flex-col sm:flex-row gap-3 justify-center">
                    <Button asChild size="lg">
                      <Link to="/auth?redirect=/photos-express-chaumont#envoyer-photos">
                        Se connecter
                      </Link>
                    </Button>
                    <Button asChild size="lg" variant="outline">
                      <Link to="/auth?redirect=/photos-express-chaumont#envoyer-photos">
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
                  <CardTitle>Rapide</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-muted-foreground">
                    Envoyez vos photos en quelques clics. Tirages prêts sous 24h, voire le jour même.
                  </p>
                </CardContent>
              </Card>

              <Card className="text-center">
                <CardHeader>
                  <div className="mx-auto w-12 h-12 bg-primary/10 rounded-full flex items-center justify-center mb-4">
                    <Image className="h-6 w-6 text-primary" />
                  </div>
                  <CardTitle>Qualité pro</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-muted-foreground">
                    Tirages haute définition sur papier photo premium. Finition mate ou brillante.
                  </p>
                </CardContent>
              </Card>

              <Card className="text-center">
                <CardHeader>
                  <div className="mx-auto w-12 h-12 bg-primary/10 rounded-full flex items-center justify-center mb-4">
                    <CheckCircle className="h-6 w-6 text-primary" />
                  </div>
                  <CardTitle>Tous formats</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-muted-foreground">
                    Du 10x15 classique au 30x45 grand format. Choisissez le format idéal pour chaque photo.
                  </p>
                </CardContent>
              </Card>
            </div>
          </section>

          {/* Pour qui */}
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
                        Photos de vacances et souvenirs de famille
                      </li>
                      <li className="flex items-start gap-2">
                        <CheckCircle className="h-4 w-4 text-primary mt-1 flex-shrink-0" />
                        Tirages pour albums et cadres
                      </li>
                      <li className="flex items-start gap-2">
                        <CheckCircle className="h-4 w-4 text-primary mt-1 flex-shrink-0" />
                        Photos pour événements (mariage, anniversaire)
                      </li>
                      <li className="flex items-start gap-2">
                        <CheckCircle className="h-4 w-4 text-primary mt-1 flex-shrink-0" />
                        Agrandissements pour décoration
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
                        Photos pour supports de communication
                      </li>
                      <li className="flex items-start gap-2">
                        <CheckCircle className="h-4 w-4 text-primary mt-1 flex-shrink-0" />
                        Tirages pour présentations et showrooms
                      </li>
                      <li className="flex items-start gap-2">
                        <CheckCircle className="h-4 w-4 text-primary mt-1 flex-shrink-0" />
                        Photos produits pour catalogues
                      </li>
                      <li className="flex items-start gap-2">
                        <CheckCircle className="h-4 w-4 text-primary mt-1 flex-shrink-0" />
                        Décoration de bureaux et locaux
                      </li>
                    </ul>
                  </CardContent>
                </Card>
              </div>
            </div>
          </section>

          {/* Formats disponibles */}
          <section className="py-16 container mx-auto px-4">
            <h2 className="text-2xl md:text-3xl font-bold text-center mb-12">
              Formats de tirage disponibles
            </h2>
            <div className="grid sm:grid-cols-2 lg:grid-cols-5 gap-6 max-w-5xl mx-auto">
              {[
                { format: '10x15', label: '10 x 15 cm', price: '0,15' },
                { format: '13x18', label: '13 x 18 cm', price: '0,30' },
                { format: '15x20', label: '15 x 20 cm', price: '0,50' },
                { format: '20x30', label: '20 x 30 cm', price: '2,00' },
                { format: '30x45', label: '30 x 45 cm', price: '5,00' },
              ].map(f => (
                <Card key={f.format} className="text-center p-6">
                  <Camera className="h-8 w-8 text-primary mx-auto mb-3" />
                  <h3 className="font-semibold">{f.label}</h3>
                  <p className="text-sm text-muted-foreground mt-1">à partir de {f.price} &euro;</p>
                </Card>
              ))}
            </div>
          </section>

          {/* FAQ */}
          <section className="py-16 bg-muted/30">
            <div className="container mx-auto px-4">
              <h2 className="text-2xl md:text-3xl font-bold text-center mb-12">
                Questions fréquentes – Tirage photo à Chaumont
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
                  Vos photos méritent d'être imprimées !
                </h2>
                <p className="mb-6 opacity-90">
                  Envoyez vos photos en ligne maintenant et récupérez vos tirages en magasin à Chaumont.
                </p>
                <div className="flex flex-col sm:flex-row gap-4 justify-center">
                  <Button size="lg" variant="secondary" asChild>
                    <a href="#envoyer-photos">Envoyer mes photos</a>
                  </Button>
                  <Button size="lg" variant="outline" className="bg-transparent border-primary-foreground hover:bg-primary-foreground hover:text-primary" asChild>
                    <Link to="/contact">Voir l'adresse</Link>
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
                <Link to="/photocopie-express-chaumont" className="text-primary hover:underline">Photocopie Express</Link> • {" "}
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

export default PhotosExpress;
