import { Helmet } from "react-helmet-async";
import Header from "@/components/layout/Header";
import Footer from "@/components/layout/Footer";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Link } from "react-router-dom";
import { 
  Package, CheckCircle, Phone, MapPin, 
  Zap, Users, FileText, Clock, Star,
  Building2, Briefcase, Handshake
} from "lucide-react";

const PackProLocal = () => {
  const faqData = [
    {
      question: "Qu'est-ce que le Pack Pro Local de Ma Papeterie ?",
      answer: "Le Pack Pro Local est une offre de fidélisation destinée aux entreprises et professionnels de Chaumont et Haute-Marne. Il offre des avantages exclusifs : priorité de traitement, devis simplifiés, interlocuteur dédié et tarifs préférentiels sur les fournitures et services."
    },
    {
      question: "Qui peut bénéficier du Pack Pro Local ?",
      answer: "Toutes les structures professionnelles peuvent en bénéficier : entreprises, artisans, commerçants, professions libérales, associations. Le Pack est adapté aux besoins de chaque structure, quelle que soit sa taille."
    },
    {
      question: "Comment souscrire au Pack Pro Local ?",
      answer: "Contactez Ma Papeterie par téléphone ou venez en magasin à Chaumont. Un échange permettra de définir vos besoins et de vous proposer une formule adaptée. L'inscription est gratuite et sans engagement."
    },
    {
      question: "Quels sont les avantages concrets du Pack Pro ?",
      answer: "Priorité sur les commandes urgentes, devis rapides par téléphone ou email, possibilité de compte client avec facturation mensuelle, tarifs dégressifs sur volumes, conseil personnalisé et suivi de vos commandes."
    },
    {
      question: "Y a-t-il un engagement avec le Pack Pro Local ?",
      answer: "Non, le Pack Pro Local fonctionne sans engagement ni minimum d'achat. Vous bénéficiez des avantages dès votre inscription et restez libre de vos commandes."
    }
  ];

  const serviceSchema = {
    "@context": "https://schema.org",
    "@type": "Service",
    "name": "Pack Pro Local – Fournitures & services professionnels à Chaumont",
    "description": "Programme de fidélité pour entreprises et professionnels à Chaumont. Fournitures de bureau, impression, tampons avec avantages exclusifs.",
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
    "serviceType": "Programme fidélité professionnel"
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

  const benefits = [
    {
      icon: Zap,
      title: "Priorité de traitement",
      description: "Vos commandes et demandes sont traitées en priorité, même en période de forte activité."
    },
    {
      icon: FileText,
      title: "Devis simplifiés",
      description: "Obtenez des devis rapidement par téléphone ou email, sans vous déplacer."
    },
    {
      icon: Users,
      title: "Interlocuteur local",
      description: "Un contact unique qui connaît votre entreprise et vos besoins récurrents."
    },
    {
      icon: Clock,
      title: "Continuité de service",
      description: "Approvisionnement régulier assuré, anticipation de vos besoins saisonniers."
    },
    {
      icon: Star,
      title: "Tarifs préférentiels",
      description: "Conditions tarifaires avantageuses et tarifs dégressifs selon les volumes."
    },
    {
      icon: Handshake,
      title: "Compte client",
      description: "Possibilité de paiement différé avec facturation mensuelle regroupée."
    }
  ];

  return (
    <>
      <Helmet>
        <title>Pack Pro Local – Fournitures & services professionnels à Chaumont | Ma Papeterie</title>
        <meta name="description" content="Programme de fidélité pour entreprises à Chaumont, Haute-Marne. Fournitures de bureau, impression, tampons avec priorité, devis rapides et tarifs préférentiels." />
        <meta name="robots" content="index, follow" />
        <link rel="canonical" href="https://ma-papeterie.lovable.app/pack-pro-local-chaumont" />
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
                  <Package className="h-3 w-3 mr-1" />
                  Offre professionnelle
                </Badge>
                <h1 className="text-3xl md:text-5xl font-bold text-foreground mb-6">
                  Pack Pro Local – Fournitures & services professionnels à Chaumont
                </h1>
                <p className="text-xl text-muted-foreground mb-8">
                  L'offre de fidélisation pensée pour les entreprises, artisans et associations 
                  de Chaumont et de Haute-Marne.
                </p>
                <div className="flex flex-col sm:flex-row gap-4 justify-center">
                  <Button size="lg" asChild>
                    <Link to="/contact">
                      <Phone className="h-4 w-4 mr-2" />
                      Demander le Pack Pro
                    </Link>
                  </Button>
                  <Button size="lg" variant="outline" asChild>
                    <a href="tel:+33325000000">
                      <Phone className="h-4 w-4 mr-2" />
                      Appeler pour un devis
                    </a>
                  </Button>
                </div>
              </div>
            </div>
          </section>

          {/* Présentation du Pack */}
          <section className="py-16 container mx-auto px-4">
            <div className="max-w-3xl mx-auto text-center mb-12">
              <h2 className="text-2xl md:text-3xl font-bold mb-6">
                Simplifiez vos achats professionnels
              </h2>
              <p className="text-lg text-muted-foreground">
                Le Pack Pro Local vous offre un accès privilégié à l'ensemble des fournitures 
                et services de Ma Papeterie. Plus qu'un simple fournisseur, nous devenons 
                votre partenaire de proximité pour tous vos besoins en papeterie, 
                impression et services à Chaumont.
              </p>
            </div>
          </section>

          {/* Bénéfices */}
          <section className="py-16 bg-muted/30">
            <div className="container mx-auto px-4">
              <h2 className="text-2xl md:text-3xl font-bold text-center mb-12">
                Les avantages du Pack Pro Local
              </h2>
              <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6 max-w-5xl mx-auto">
                {benefits.map((benefit, index) => {
                  const IconComponent = benefit.icon;
                  return (
                    <Card key={index} className="h-full">
                      <CardHeader>
                        <div className="w-12 h-12 bg-primary/10 rounded-full flex items-center justify-center mb-4">
                          <IconComponent className="h-6 w-6 text-primary" />
                        </div>
                        <CardTitle className="text-lg">{benefit.title}</CardTitle>
                      </CardHeader>
                      <CardContent>
                        <p className="text-muted-foreground">{benefit.description}</p>
                      </CardContent>
                    </Card>
                  );
                })}
              </div>
            </div>
          </section>

          {/* Pour qui */}
          <section className="py-16 container mx-auto px-4">
            <h2 className="text-2xl md:text-3xl font-bold text-center mb-12">
              Le Pack Pro Local est fait pour vous
            </h2>
            <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-6 max-w-5xl mx-auto">
              <Card className="text-center p-6">
                <Building2 className="h-10 w-10 text-primary mx-auto mb-4" />
                <h3 className="font-semibold mb-2">Entreprises</h3>
                <p className="text-sm text-muted-foreground">TPE, PME, grandes entreprises</p>
              </Card>
              <Card className="text-center p-6">
                <Briefcase className="h-10 w-10 text-primary mx-auto mb-4" />
                <h3 className="font-semibold mb-2">Artisans</h3>
                <p className="text-sm text-muted-foreground">Tous corps de métiers</p>
              </Card>
              <Card className="text-center p-6">
                <Users className="h-10 w-10 text-primary mx-auto mb-4" />
                <h3 className="font-semibold mb-2">Professions libérales</h3>
                <p className="text-sm text-muted-foreground">Cabinets, indépendants</p>
              </Card>
              <Card className="text-center p-6">
                <Handshake className="h-10 w-10 text-primary mx-auto mb-4" />
                <h3 className="font-semibold mb-2">Associations</h3>
                <p className="text-sm text-muted-foreground">Culturelles, sportives, sociales</p>
              </Card>
            </div>
          </section>

          {/* Services inclus */}
          <section className="py-16 bg-muted/30">
            <div className="container mx-auto px-4">
              <h2 className="text-2xl md:text-3xl font-bold text-center mb-12">
                Services accessibles avec le Pack Pro
              </h2>
              <div className="grid md:grid-cols-2 gap-8 max-w-4xl mx-auto">
                <Card>
                  <CardHeader>
                    <CardTitle>Fournitures de bureau</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <ul className="space-y-2 text-muted-foreground">
                      <li className="flex items-start gap-2">
                        <CheckCircle className="h-4 w-4 text-primary mt-1 flex-shrink-0" />
                        Papier, enveloppes, classement
                      </li>
                      <li className="flex items-start gap-2">
                        <CheckCircle className="h-4 w-4 text-primary mt-1 flex-shrink-0" />
                        Stylos, surligneurs, accessoires
                      </li>
                      <li className="flex items-start gap-2">
                        <CheckCircle className="h-4 w-4 text-primary mt-1 flex-shrink-0" />
                        Cahiers, blocs, agendas
                      </li>
                      <li className="flex items-start gap-2">
                        <CheckCircle className="h-4 w-4 text-primary mt-1 flex-shrink-0" />
                        Consommables informatiques
                      </li>
                    </ul>
                  </CardContent>
                </Card>
                
                <Card>
                  <CardHeader>
                    <CardTitle>Services professionnels</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <ul className="space-y-2 text-muted-foreground">
                      <li className="flex items-start gap-2">
                        <CheckCircle className="h-4 w-4 text-primary mt-1 flex-shrink-0" />
                        <Link to="/impression-urgente-chaumont" className="hover:text-primary hover:underline">
                          Impression de documents
                        </Link>
                      </li>
                      <li className="flex items-start gap-2">
                        <CheckCircle className="h-4 w-4 text-primary mt-1 flex-shrink-0" />
                        <Link to="/photocopie-express-chaumont" className="hover:text-primary hover:underline">
                          Photocopies en volume
                        </Link>
                      </li>
                      <li className="flex items-start gap-2">
                        <CheckCircle className="h-4 w-4 text-primary mt-1 flex-shrink-0" />
                        <Link to="/tampon-professionnel-chaumont" className="hover:text-primary hover:underline">
                          Tampons personnalisés
                        </Link>
                      </li>
                      <li className="flex items-start gap-2">
                        <CheckCircle className="h-4 w-4 text-primary mt-1 flex-shrink-0" />
                        <Link to="/plaque-immatriculation-chaumont" className="hover:text-primary hover:underline">
                          Plaques d'immatriculation
                        </Link>
                      </li>
                    </ul>
                  </CardContent>
                </Card>
              </div>
            </div>
          </section>

          {/* Comment adhérer */}
          <section className="py-16 container mx-auto px-4">
            <h2 className="text-2xl md:text-3xl font-bold text-center mb-12">
              Comment rejoindre le Pack Pro Local ?
            </h2>
            <div className="grid md:grid-cols-3 gap-8 max-w-4xl mx-auto">
              <div className="text-center">
                <div className="w-12 h-12 bg-primary text-primary-foreground rounded-full flex items-center justify-center mx-auto mb-4 text-xl font-bold">
                  1
                </div>
                <h3 className="font-semibold mb-2">Contactez-nous</h3>
                <p className="text-sm text-muted-foreground">
                  Par téléphone ou en magasin à Chaumont
                </p>
              </div>
              <div className="text-center">
                <div className="w-12 h-12 bg-primary text-primary-foreground rounded-full flex items-center justify-center mx-auto mb-4 text-xl font-bold">
                  2
                </div>
                <h3 className="font-semibold mb-2">Échangeons</h3>
                <p className="text-sm text-muted-foreground">
                  Définissons ensemble vos besoins récurrents
                </p>
              </div>
              <div className="text-center">
                <div className="w-12 h-12 bg-primary text-primary-foreground rounded-full flex items-center justify-center mx-auto mb-4 text-xl font-bold">
                  3
                </div>
                <h3 className="font-semibold mb-2">Profitez</h3>
                <p className="text-sm text-muted-foreground">
                  Bénéficiez immédiatement de vos avantages
                </p>
              </div>
            </div>
          </section>

          {/* FAQ */}
          <section className="py-16 bg-muted/30">
            <div className="container mx-auto px-4">
              <h2 className="text-2xl md:text-3xl font-bold text-center mb-12">
                Questions fréquentes – Pack Pro Chaumont
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
                  Rejoignez le Pack Pro Local
                </h2>
                <p className="mb-6 opacity-90">
                  Inscription gratuite, sans engagement. Commencez à bénéficier de vos avantages dès aujourd'hui.
                </p>
                <div className="flex flex-col sm:flex-row gap-4 justify-center">
                  <Button size="lg" variant="secondary" asChild>
                    <Link to="/contact">Demander le Pack Pro</Link>
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
                <Link to="/solutions-institutions-chaumont" className="text-primary hover:underline">Solutions institutions</Link> • {" "}
                <Link to="/impression-urgente-chaumont" className="text-primary hover:underline">Impression urgente</Link> • {" "}
                <Link to="/tampon-professionnel-chaumont" className="text-primary hover:underline">Tampons professionnels</Link> • {" "}
                <Link to="/shop" className="text-primary hover:underline">Boutique</Link>
              </p>
            </div>
          </section>
        </main>

        <Footer />
      </div>
    </>
  );
};

export default PackProLocal;
