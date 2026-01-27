import { Helmet } from "react-helmet-async";
import { Link } from "react-router-dom";
import Header from "@/components/layout/Header";
import Footer from "@/components/layout/Footer";
import { 
  Printer, 
  Copy, 
  Car, 
  Stamp, 
  Building2, 
  Briefcase,
  Camera,
  FileText,
  ArrowRight,
  MapPin,
  Phone,
  Clock
} from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb";

const Services = () => {
  const servicesExpress = [
    {
      icon: Printer,
      title: "Impression urgente",
      description: "Impression de documents sans rendez-vous. Noir & blanc ou couleur, tous formats jusqu'à A3.",
      link: "/impression-urgente-chaumont",
      features: ["Sans rendez-vous", "Tous formats", "Couleur & N&B"]
    },
    {
      icon: Copy,
      title: "Photocopie express",
      description: "Photocopies rapides pour particuliers et professionnels. Service immédiat sur place.",
      link: "/photocopie-express-chaumont",
      features: ["Service immédiat", "Grands volumes", "Recto-verso"]
    },
    {
      icon: Car,
      title: "Plaques d'immatriculation",
      description: "Fabrication de plaques homologuées sur place. Apportez votre carte grise, repartez avec vos plaques.",
      link: "/plaque-immatriculation-chaumont",
      features: ["Homologuées", "Sur place", "Tous véhicules"]
    },
    {
      icon: Stamp,
      title: "Tampons professionnels",
      description: "Création de tampons personnalisés pour entreprises et professionnels. Devis gratuit.",
      link: "/tampon-professionnel-chaumont",
      features: ["Sur mesure", "Devis gratuit", "Livraison rapide"]
    }
  ];

  const servicesComplementaires = [
    {
      icon: Camera,
      title: "Borne photo",
      description: "Développement de photos numériques, tirages instantanés et impressions photo de qualité.",
      features: ["Photos d'identité", "Tirages tous formats", "Impressions sur toile"]
    },
    {
      icon: FileText,
      title: "Documents administratifs",
      description: "Aide à l'impression et la mise en forme de documents officiels et administratifs.",
      features: ["Formulaires CERFA", "CV & lettres", "Reliure & plastification"]
    }
  ];

  const solutionsB2B = [
    {
      icon: Building2,
      title: "Solutions Institutions",
      description: "Offres dédiées aux écoles, mairies et associations de Chaumont et alentours.",
      link: "/solutions-institutions-chaumont",
      cta: "Découvrir les solutions"
    },
    {
      icon: Briefcase,
      title: "Pack Pro Local",
      description: "Programme de fidélité pour entreprises et artisans locaux avec avantages exclusifs.",
      link: "/pack-pro-local-chaumont",
      cta: "Rejoindre le Pack Pro"
    }
  ];

  const localBusinessSchema = {
    "@context": "https://schema.org",
    "@type": "LocalBusiness",
    "@id": "https://ma-papeterie.lovable.app/#organization",
    "name": "Papeterie Reine & Fils",
    "alternateName": "Ma Papeterie Pro",
    "description": "Papeterie et services de proximité à Chaumont : impression, photocopie, plaques d'immatriculation, tampons professionnels, fournitures de bureau.",
    "url": "https://ma-papeterie.lovable.app",
    "telephone": "+33745062162",
    "email": "contact@papeterie-chaumont.fr",
    "address": {
      "@type": "PostalAddress",
      "streetAddress": "10 rue Toupot de Beveaux",
      "addressLocality": "Chaumont",
      "postalCode": "52000",
      "addressRegion": "Haute-Marne",
      "addressCountry": "FR"
    },
    "geo": {
      "@type": "GeoCoordinates",
      "latitude": 48.1119,
      "longitude": 5.1391
    },
    "openingHoursSpecification": [
      {
        "@type": "OpeningHoursSpecification",
        "dayOfWeek": ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday"],
        "opens": "09:00",
        "closes": "12:00"
      },
      {
        "@type": "OpeningHoursSpecification",
        "dayOfWeek": ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday"],
        "opens": "14:00",
        "closes": "19:00"
      },
      {
        "@type": "OpeningHoursSpecification",
        "dayOfWeek": "Saturday",
        "opens": "09:00",
        "closes": "12:00"
      }
    ],
    "priceRange": "€€",
    "currenciesAccepted": "EUR",
    "paymentAccepted": "Cash, Credit Card, Debit Card",
    "areaServed": {
      "@type": "GeoCircle",
      "geoMidpoint": {
        "@type": "GeoCoordinates",
        "latitude": 48.1119,
        "longitude": 5.1391
      },
      "geoRadius": "30000"
    },
    "hasOfferCatalog": {
      "@type": "OfferCatalog",
      "name": "Services de papeterie",
      "itemListElement": [
        {
          "@type": "Offer",
          "itemOffered": {
            "@type": "Service",
            "name": "Impression de documents",
            "description": "Impression urgente noir & blanc et couleur à Chaumont"
          }
        },
        {
          "@type": "Offer",
          "itemOffered": {
            "@type": "Service",
            "name": "Photocopie express",
            "description": "Service de photocopie rapide à Chaumont"
          }
        },
        {
          "@type": "Offer",
          "itemOffered": {
            "@type": "Service",
            "name": "Fabrication de plaques d'immatriculation",
            "description": "Plaques homologuées fabriquées sur place à Chaumont"
          }
        },
        {
          "@type": "Offer",
          "itemOffered": {
            "@type": "Service",
            "name": "Tampons professionnels",
            "description": "Création de tampons personnalisés à Chaumont"
          }
        }
      ]
    },
    "sameAs": []
  };

  const breadcrumbSchema = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    "itemListElement": [
      {
        "@type": "ListItem",
        "position": 1,
        "name": "Accueil",
        "item": "https://ma-papeterie.lovable.app/"
      },
      {
        "@type": "ListItem",
        "position": 2,
        "name": "Services",
        "item": "https://ma-papeterie.lovable.app/services"
      }
    ]
  };

  return (
    <>
      <Helmet>
        <title>Services papeterie & impression à Chaumont | Papeterie Reine & Fils</title>
        <meta 
          name="description" 
          content="Découvrez tous nos services à Chaumont : impression urgente, photocopie express, plaques d'immatriculation, tampons professionnels. Service rapide sans rendez-vous." 
        />
        <meta name="keywords" content="services papeterie Chaumont, impression Chaumont, photocopie Chaumont, plaque immatriculation Chaumont, tampon professionnel Chaumont, Haute-Marne" />
        <link rel="canonical" href="https://ma-papeterie.lovable.app/services" />
        <meta property="og:title" content="Services papeterie & impression à Chaumont" />
        <meta property="og:description" content="Impression, photocopie, plaques d'immatriculation et tampons professionnels à Chaumont. Service rapide sans rendez-vous." />
        <meta property="og:type" content="website" />
        <meta property="og:url" content="https://ma-papeterie.lovable.app/services" />
        <script type="application/ld+json">
          {JSON.stringify(localBusinessSchema)}
        </script>
        <script type="application/ld+json">
          {JSON.stringify(breadcrumbSchema)}
        </script>
      </Helmet>
      
      <Header />
      
      <main className="min-h-screen bg-background">
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
                  <BreadcrumbPage>Services</BreadcrumbPage>
                </BreadcrumbItem>
              </BreadcrumbList>
            </Breadcrumb>
          </div>
        </div>

        {/* Hero Section */}
        <section className="bg-gradient-to-b from-primary/5 to-background py-12 md:py-16">
          <div className="container mx-auto px-4">
            <div className="max-w-3xl mx-auto text-center">
              <h1 className="text-3xl md:text-4xl lg:text-5xl font-bold text-foreground mb-4">
                Nos services à Chaumont
              </h1>
              <p className="text-lg text-muted-foreground mb-6">
                Papeterie Reine & Fils vous accompagne au quotidien avec une gamme complète 
                de services de proximité. Particuliers, professionnels et institutions : 
                nous répondons à tous vos besoins.
              </p>
              <div className="flex flex-wrap justify-center gap-4 text-sm text-muted-foreground">
                <div className="flex items-center gap-2">
                  <MapPin className="h-4 w-4 text-primary" />
                  <span>10 rue Toupot de Beveaux, 52000 Chaumont</span>
                </div>
                <div className="flex items-center gap-2">
                  <Phone className="h-4 w-4 text-primary" />
                  <span>07 45 062 162</span>
                </div>
                <div className="flex items-center gap-2">
                  <Clock className="h-4 w-4 text-primary" />
                  <span>Lun-Ven 9h-19h, Sam 9h-12h</span>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Services Express */}
        <section className="py-12 md:py-16">
          <div className="container mx-auto px-4">
            <div className="text-center mb-10">
              <h2 className="text-2xl md:text-3xl font-bold text-foreground mb-3">
                Services express – Sans rendez-vous
              </h2>
              <p className="text-muted-foreground max-w-2xl mx-auto">
                Besoin d'un service rapide ? Venez directement en magasin, nous traitons 
                votre demande immédiatement.
              </p>
            </div>
            
            <div className="grid md:grid-cols-2 gap-6 max-w-5xl mx-auto">
              {servicesExpress.map((service) => (
                <Link key={service.title} to={service.link} className="group">
                  <Card className="h-full transition-all duration-300 hover:shadow-lg hover:border-primary/50">
                    <CardHeader>
                      <div className="flex items-start gap-4">
                        <div className="p-3 rounded-lg bg-primary/10 text-primary group-hover:bg-primary group-hover:text-primary-foreground transition-colors">
                          <service.icon className="h-6 w-6" />
                        </div>
                        <div className="flex-1">
                          <CardTitle className="text-xl group-hover:text-primary transition-colors">
                            {service.title}
                          </CardTitle>
                          <CardDescription className="mt-2">
                            {service.description}
                          </CardDescription>
                        </div>
                      </div>
                    </CardHeader>
                    <CardContent>
                      <div className="flex flex-wrap gap-2 mb-4">
                        {service.features.map((feature) => (
                          <span 
                            key={feature}
                            className="px-3 py-1 text-xs font-medium bg-secondary text-secondary-foreground rounded-full"
                          >
                            {feature}
                          </span>
                        ))}
                      </div>
                      <div className="flex items-center text-primary font-medium">
                        <span>En savoir plus</span>
                        <ArrowRight className="ml-2 h-4 w-4 group-hover:translate-x-1 transition-transform" />
                      </div>
                    </CardContent>
                  </Card>
                </Link>
              ))}
            </div>
          </div>
        </section>

        {/* Services Complémentaires */}
        <section className="py-12 md:py-16 bg-muted/30">
          <div className="container mx-auto px-4">
            <div className="text-center mb-10">
              <h2 className="text-2xl md:text-3xl font-bold text-foreground mb-3">
                Services complémentaires
              </h2>
              <p className="text-muted-foreground max-w-2xl mx-auto">
                Au-delà de nos services express, nous proposons également des prestations 
                pour tous vos besoins en documents et photos.
              </p>
            </div>
            
            <div className="grid md:grid-cols-2 gap-6 max-w-4xl mx-auto">
              {servicesComplementaires.map((service) => (
                <Card key={service.title} className="h-full">
                  <CardHeader>
                    <div className="flex items-start gap-4">
                      <div className="p-3 rounded-lg bg-secondary text-secondary-foreground">
                        <service.icon className="h-6 w-6" />
                      </div>
                      <div>
                        <CardTitle className="text-xl">{service.title}</CardTitle>
                        <CardDescription className="mt-2">
                          {service.description}
                        </CardDescription>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="flex flex-wrap gap-2">
                      {service.features.map((feature) => (
                        <span 
                          key={feature}
                          className="px-3 py-1 text-xs font-medium bg-background text-foreground rounded-full border"
                        >
                          {feature}
                        </span>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        </section>

        {/* Solutions B2B */}
        <section className="py-12 md:py-16">
          <div className="container mx-auto px-4">
            <div className="text-center mb-10">
              <h2 className="text-2xl md:text-3xl font-bold text-foreground mb-3">
                Solutions professionnelles & institutionnelles
              </h2>
              <p className="text-muted-foreground max-w-2xl mx-auto">
                Entreprises, artisans, écoles, mairies et associations : découvrez nos 
                offres dédiées pour un partenariat local de confiance.
              </p>
            </div>
            
            <div className="grid md:grid-cols-2 gap-6 max-w-4xl mx-auto">
              {solutionsB2B.map((solution) => (
                <Link key={solution.title} to={solution.link} className="group">
                  <Card className="h-full transition-all duration-300 hover:shadow-lg hover:border-primary/50 bg-gradient-to-br from-primary/5 to-background">
                    <CardHeader>
                      <div className="flex items-start gap-4">
                        <div className="p-3 rounded-lg bg-primary text-primary-foreground">
                          <solution.icon className="h-6 w-6" />
                        </div>
                        <div>
                          <CardTitle className="text-xl group-hover:text-primary transition-colors">
                            {solution.title}
                          </CardTitle>
                          <CardDescription className="mt-2">
                            {solution.description}
                          </CardDescription>
                        </div>
                      </div>
                    </CardHeader>
                    <CardContent>
                      <Button variant="outline" className="group-hover:bg-primary group-hover:text-primary-foreground transition-colors">
                        {solution.cta}
                        <ArrowRight className="ml-2 h-4 w-4 group-hover:translate-x-1 transition-transform" />
                      </Button>
                    </CardContent>
                  </Card>
                </Link>
              ))}
            </div>
          </div>
        </section>

        {/* CTA Section */}
        <section className="py-12 md:py-16 bg-primary text-primary-foreground">
          <div className="container mx-auto px-4 text-center">
            <h2 className="text-2xl md:text-3xl font-bold mb-4">
              Une question ? Un besoin particulier ?
            </h2>
            <p className="text-primary-foreground/80 mb-6 max-w-xl mx-auto">
              Notre équipe est à votre écoute pour répondre à toutes vos demandes. 
              Passez nous voir en magasin ou contactez-nous directement.
            </p>
            <div className="flex flex-col sm:flex-row justify-center gap-4">
              <Button asChild size="lg" variant="secondary">
                <Link to="/contact">
                  Nous contacter
                </Link>
              </Button>
              <Button asChild size="lg" variant="outline" className="border-primary-foreground/30 text-primary-foreground hover:bg-primary-foreground/10">
                <a href="tel:0745062162">
                  <Phone className="mr-2 h-4 w-4" />
                  07 45 062 162
                </a>
              </Button>
            </div>
          </div>
        </section>

        {/* SEO Content */}
        <section className="py-12 md:py-16 bg-muted/30">
          <div className="container mx-auto px-4">
            <div className="max-w-3xl mx-auto prose prose-slate">
              <h2 className="text-xl font-semibold text-foreground mb-4">
                Votre partenaire multiservices à Chaumont
              </h2>
              <p className="text-muted-foreground mb-4">
                Située au cœur de Chaumont en Haute-Marne, la Papeterie Reine & Fils 
                est votre référence locale pour tous vos besoins en papeterie et services 
                de proximité. Depuis notre magasin du 10 rue Toupot de Beveaux, nous 
                accompagnons les particuliers, les professionnels et les institutions 
                du territoire.
              </p>
              <p className="text-muted-foreground mb-4">
                Nos services express vous permettent d'obtenir rapidement ce dont vous 
                avez besoin : impression de documents urgents, photocopies pour vos 
                dossiers administratifs, fabrication de plaques d'immatriculation 
                homologuées ou création de tampons professionnels personnalisés.
              </p>
              <p className="text-muted-foreground">
                Pour les entreprises, artisans et institutions de Chaumont et des environs, 
                nous proposons des solutions adaptées avec le Pack Pro Local et des offres 
                dédiées aux écoles, mairies et associations. Un interlocuteur local, 
                une réactivité garantie et une facturation simplifiée.
              </p>
            </div>
          </div>
        </section>
      </main>
      
      <Footer />
    </>
  );
};

export default Services;
