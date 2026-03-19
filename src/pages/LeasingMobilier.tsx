import { useState } from "react";
import { Helmet } from "react-helmet-async";
import { Link } from "react-router-dom";
import Header from "@/components/layout/Header";
import Footer from "@/components/layout/Footer";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Slider } from "@/components/ui/slider";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import {
  CreditCard, PiggyBank, RefreshCcw, Calculator,
  Building2, Briefcase, Users, Handshake,
  FileText, Phone, CheckCircle, ArrowRight,
} from "lucide-react";
import { calculateLeasing } from "@/hooks/useLeasingCalculator";
import { LeasingQuoteForm } from "@/components/leasing/LeasingQuoteForm";
import { LEASING_DURATIONS, LEASING_DISCLAIMER } from "@/lib/leasingConstants";

const LeasingMobilier = () => {
  const [simAmount, setSimAmount] = useState(3000);
  const [simDuration, setSimDuration] = useState(36);
  const estimate = calculateLeasing(simAmount, simDuration);

  const faqData = [
    {
      question: "Quel est le montant minimum pour un leasing mobilier ?",
      answer: "Le montant minimum pour une demande de leasing mobilier est de 400 € HT. Ce seuil permet de couvrir l'équipement d'un poste de travail de base (bureau, siège, rangement).",
    },
    {
      question: "Quelles sont les durées de financement proposées ?",
      answer: "Nous proposons des durées de 24, 36, 48 et 60 mois. La durée de 36 mois est la plus courante car elle offre un bon équilibre entre mensualité et coût total.",
    },
    {
      question: "Faut-il un apport initial ?",
      answer: "Non, le leasing mobilier via Leasecom ne nécessite aucun apport initial. Les mensualités commencent dès la livraison du mobilier.",
    },
    {
      question: "Les mensualités sont-elles déductibles ?",
      answer: "Oui, les loyers de leasing sont intégralement déductibles en charges d'exploitation. Cela réduit votre base imposable et optimise votre trésorerie.",
    },
    {
      question: "Que se passe-t-il en fin de contrat ?",
      answer: "En fin de contrat, vous pouvez renouveler votre mobilier avec un nouveau leasing, racheter le mobilier à sa valeur résiduelle, ou le restituer.",
    },
    {
      question: "Quels types de mobilier sont éligibles ?",
      answer: "Tout le mobilier de bureau professionnel est éligible : bureaux, sièges ergonomiques, rangements, tables de réunion, mobilier d'accueil, et aménagements d'espaces de travail.",
    },
    {
      question: "Combien de temps prend la validation du dossier ?",
      answer: "Après réception de votre demande, nous vous contactons sous 24h ouvrées. Le dossier Leasecom est traité en 48 à 72h ouvrées en moyenne.",
    },
  ];

  const serviceSchema = {
    "@context": "https://schema.org",
    "@type": "Service",
    "name": "Leasing mobilier de bureau – Ma Papeterie Reine & Fils",
    "description": "Équipez vos bureaux en leasing : 0 € d'apport, mensualités déductibles. Financement Leasecom pour TPE, professions libérales et espaces coworking.",
    "provider": {
      "@type": "LocalBusiness",
      "name": "Ma Papeterie — Reine & Fils",
      "address": {
        "@type": "PostalAddress",
        "addressLocality": "Chaumont",
        "addressRegion": "Haute-Marne",
        "postalCode": "52000",
        "addressCountry": "FR",
      },
    },
    "areaServed": { "@type": "Country", "name": "France" },
    "serviceType": "Leasing mobilier professionnel",
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

  const advantages = [
    {
      icon: CreditCard,
      title: "0 € d'apport",
      description: "Aucun investissement initial. Équipez vos locaux sans mobiliser votre trésorerie.",
    },
    {
      icon: PiggyBank,
      title: "Charges déductibles",
      description: "Les mensualités de leasing sont intégralement déductibles de votre résultat imposable.",
    },
    {
      icon: RefreshCcw,
      title: "Renouvellement facilité",
      description: "En fin de contrat, renouvelez votre mobilier pour des espaces toujours adaptés.",
    },
    {
      icon: Calculator,
      title: "Budget maîtrisé",
      description: "Mensualités fixes et prévisibles. Pas de mauvaise surprise sur votre trésorerie.",
    },
  ];

  const profiles = [
    {
      icon: Building2,
      title: "TPE / PME",
      description: "Équipez vos bureaux sans investissement lourd. Idéal pour les entreprises en croissance ou en création.",
    },
    {
      icon: Briefcase,
      title: "Professions libérales",
      description: "Cabinet médical, d'avocats ou d'architectes : aménagez votre espace professionnel sereinement.",
    },
    {
      icon: Users,
      title: "Espaces coworking",
      description: "Modulez et renouvelez vos aménagements selon l'évolution de vos espaces partagés.",
    },
  ];

  const processSteps = [
    {
      step: 1,
      title: "Demande de devis",
      description: "Remplissez le formulaire ci-dessous ou contactez-nous. Décrivez votre projet mobilier.",
    },
    {
      step: 2,
      title: "Étude personnalisée",
      description: "Nous étudions votre besoin et vous proposons une sélection de mobilier adaptée.",
    },
    {
      step: 3,
      title: "Validation Leasecom",
      description: "Nous montons le dossier de financement. Réponse sous 48 à 72h ouvrées.",
    },
    {
      step: 4,
      title: "Livraison & installation",
      description: "Votre mobilier est livré et installé. Les mensualités démarrent à la livraison.",
    },
  ];

  return (
    <>
      <Helmet>
        <title>Leasing mobilier de bureau | Ma Papeterie — Reine & Fils</title>
        <meta
          name="description"
          content="Équipez vos bureaux en leasing : 0 € d'apport, mensualités déductibles. Financement Leasecom pour TPE, professions libérales et espaces coworking."
        />
        <meta name="robots" content="index, follow" />
        <link rel="canonical" href="https://ma-papeterie.fr/leasing-mobilier-bureau" />
        <script type="application/ld+json">{JSON.stringify(serviceSchema)}</script>
        <script type="application/ld+json">{JSON.stringify(faqSchema)}</script>
      </Helmet>

      <div className="min-h-screen bg-background">
        <Header />

        <main>
          {/* Hero + Simulator */}
          <section className="bg-gradient-to-b from-primary/10 to-background py-16">
            <div className="container mx-auto px-4">
              <div className="max-w-5xl mx-auto">
                <div className="text-center mb-12">
                  <Badge variant="secondary" className="mb-4">
                    <CreditCard className="h-3 w-3 mr-1" />
                    Financement professionnel
                  </Badge>
                  <h1 className="text-3xl md:text-5xl font-bold text-foreground mb-6">
                    Leasing mobilier de bureau
                  </h1>
                  <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
                    Équipez vos espaces de travail sans investissement initial.
                    Mensualités fixes, déductibles en charges.
                  </p>
                </div>

                {/* Simulator */}
                <Card className="max-w-xl mx-auto">
                  <CardHeader>
                    <CardTitle className="text-center">Simulateur de mensualité</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-6">
                    <div>
                      <div className="flex justify-between items-baseline mb-3">
                        <label className="text-sm font-medium">Budget mobilier HT</label>
                        <span className="text-lg font-bold text-primary">{simAmount.toLocaleString("fr-FR")} €</span>
                      </div>
                      <Slider
                        value={[simAmount]}
                        onValueChange={(v) => setSimAmount(v[0])}
                        min={400}
                        max={25000}
                        step={100}
                      />
                      <div className="flex justify-between text-xs text-muted-foreground mt-1">
                        <span>400 €</span>
                        <span>25 000 €</span>
                      </div>
                    </div>

                    <div>
                      <label className="text-sm font-medium mb-2 block">Durée</label>
                      <Select value={String(simDuration)} onValueChange={(v) => setSimDuration(Number(v))}>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {LEASING_DURATIONS.map((d) => (
                            <SelectItem key={d} value={String(d)}>
                              {d} mois
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="bg-primary/5 border border-primary/10 rounded-lg p-4 text-center">
                      <p className="text-sm text-muted-foreground mb-1">Mensualité estimée</p>
                      <p className="text-3xl font-bold text-primary">~{estimate.monthlyHT.toFixed(2)} € HT</p>
                      <p className="text-sm text-muted-foreground">
                        soit ~{estimate.monthlyTTC.toFixed(2)} € TTC/mois
                      </p>
                    </div>

                    <p className="text-[10px] text-muted-foreground text-center">{LEASING_DISCLAIMER}</p>

                    <Button className="w-full" size="lg" asChild>
                      <a href="#demande-devis">
                        Demander un devis <ArrowRight className="h-4 w-4 ml-2" />
                      </a>
                    </Button>
                  </CardContent>
                </Card>
              </div>
            </div>
          </section>

          {/* Advantages */}
          <section className="py-16">
            <div className="container mx-auto px-4">
              <h2 className="text-2xl md:text-3xl font-bold text-center mb-12">
                Les avantages du leasing mobilier
              </h2>
              <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-6 max-w-5xl mx-auto">
                {advantages.map((adv) => {
                  const Icon = adv.icon;
                  return (
                    <Card key={adv.title} className="h-full">
                      <CardHeader>
                        <div className="w-12 h-12 bg-primary/10 rounded-full flex items-center justify-center mb-4">
                          <Icon className="h-6 w-6 text-primary" />
                        </div>
                        <CardTitle className="text-lg">{adv.title}</CardTitle>
                      </CardHeader>
                      <CardContent>
                        <p className="text-muted-foreground">{adv.description}</p>
                      </CardContent>
                    </Card>
                  );
                })}
              </div>
            </div>
          </section>

          {/* Target profiles */}
          <section className="py-16 bg-muted/30">
            <div className="container mx-auto px-4">
              <h2 className="text-2xl md:text-3xl font-bold text-center mb-12">
                Pour qui est le leasing mobilier ?
              </h2>
              <div className="grid md:grid-cols-3 gap-8 max-w-4xl mx-auto">
                {profiles.map((p) => {
                  const Icon = p.icon;
                  return (
                    <Card key={p.title} className="text-center h-full">
                      <CardContent className="pt-8">
                        <Icon className="h-12 w-12 text-primary mx-auto mb-4" />
                        <h3 className="text-lg font-semibold mb-2">{p.title}</h3>
                        <p className="text-sm text-muted-foreground">{p.description}</p>
                      </CardContent>
                    </Card>
                  );
                })}
              </div>
            </div>
          </section>

          {/* Process */}
          <section className="py-16">
            <div className="container mx-auto px-4">
              <h2 className="text-2xl md:text-3xl font-bold text-center mb-12">
                Comment ça marche ?
              </h2>
              <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-8 max-w-5xl mx-auto">
                {processSteps.map((s) => (
                  <div key={s.step} className="text-center">
                    <div className="w-12 h-12 bg-primary text-primary-foreground rounded-full flex items-center justify-center mx-auto mb-4 text-xl font-bold">
                      {s.step}
                    </div>
                    <h3 className="font-semibold mb-2">{s.title}</h3>
                    <p className="text-sm text-muted-foreground">{s.description}</p>
                  </div>
                ))}
              </div>
            </div>
          </section>

          {/* Quote Form */}
          <section id="demande-devis" className="py-16 bg-muted/30">
            <div className="container mx-auto px-4">
              <div className="max-w-2xl mx-auto">
                <h2 className="text-2xl md:text-3xl font-bold text-center mb-4">
                  Demandez votre devis leasing
                </h2>
                <p className="text-center text-muted-foreground mb-8">
                  Remplissez le formulaire, nous vous recontactons sous 24h ouvrées.
                </p>
                <LeasingQuoteForm />
              </div>
            </div>
          </section>

          {/* FAQ */}
          <section className="py-16">
            <div className="container mx-auto px-4">
              <h2 className="text-2xl md:text-3xl font-bold text-center mb-12">
                Questions fréquentes — Leasing mobilier
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
          <section className="py-16">
            <div className="container mx-auto px-4">
              <Card className="max-w-2xl mx-auto text-center bg-primary text-primary-foreground">
                <CardContent className="pt-8 pb-8">
                  <h2 className="text-2xl font-bold mb-4">
                    Prêt à équiper vos bureaux ?
                  </h2>
                  <p className="mb-6 opacity-90">
                    Contactez-nous pour un devis personnalisé. Financement sans apport, mensualités déductibles.
                  </p>
                  <div className="flex flex-col sm:flex-row gap-4 justify-center">
                    <Button size="lg" variant="secondary" asChild>
                      <a href="#demande-devis">Demander un devis</a>
                    </Button>
                    <Button
                      size="lg"
                      variant="outline"
                      className="bg-transparent border-primary-foreground hover:bg-primary-foreground hover:text-primary"
                      asChild
                    >
                      <a href="tel:0745062162">
                        <Phone className="h-4 w-4 mr-2" /> 07 45 062 162
                      </a>
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </div>
          </section>

          {/* Internal linking */}
          <section className="py-8 border-t">
            <div className="container mx-auto px-4">
              <p className="text-sm text-muted-foreground text-center">
                Découvrez aussi :{" "}
                <Link to="/pack-pro-local-chaumont" className="text-primary hover:underline">Pack Pro Local</Link> •{" "}
                <Link to="/solutions-institutions-chaumont" className="text-primary hover:underline">Solutions institutions</Link> •{" "}
                <Link to="/catalogue" className="text-primary hover:underline">Catalogue mobilier</Link> •{" "}
                <Link to="/contact" className="text-primary hover:underline">Contact</Link>
              </p>
            </div>
          </section>
        </main>

        <Footer />
      </div>
    </>
  );
};

export default LeasingMobilier;
