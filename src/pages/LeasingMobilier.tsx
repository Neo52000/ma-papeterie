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
  Building2, Briefcase, Users, Phone, ArrowRight, Mail,
  CheckCircle, Clock, MapPin, Percent,
} from "lucide-react";
import { calculateLeasing } from "@/hooks/useLeasingCalculator";
import { LeasingQuoteForm } from "@/components/leasing/LeasingQuoteForm";
import { LEASING_DURATIONS, LEASING_DISCLAIMER } from "@/lib/leasingConstants";

const LeasingMobilier = () => {
  const [simAmount, setSimAmount] = useState(3000);
  const [simDuration, setSimDuration] = useState(36);
  const [simProfile, setSimProfile] = useState("tpe");
  const estimate = calculateLeasing(simAmount, simDuration);

  const profileOptions = [
    { value: "tpe", label: "TPE / Artisan (1–5 salariés)" },
    { value: "pme", label: "PME (5–20 salariés)" },
    { value: "liberal", label: "Profession libérale (cabinet)" },
    { value: "cowork", label: "Espace coworking / télétravail" },
  ];

  const trustIndicators = [
    "Réponse sous 24h",
    "0 € d'apport",
    "Livraison & installation incluses",
    "Dès 500 € HT",
  ];

  const statsData = [
    { value: "0 €", accent: true, label: "d'apport initial\nrequis", icon: CreditCard },
    { value: "100 %", accent: false, label: "déductible en\ncharges d'exploitation", icon: Percent },
    { value: "48h", accent: false, label: "délai réponse\nfinancement", icon: Clock },
    { value: "Local", accent: true, label: "Livraison & installation\nHaute-Marne & Aube", icon: MapPin },
  ];

  const processSteps = [
    {
      step: 1,
      title: "Vous choisissez",
      description: "Sur notre site ou par téléphone. Bureau, sièges, rangements, mobilier de réunion — tout est éligible dès 500 € HT.",
    },
    {
      step: 2,
      title: "Nous montons le dossier",
      description: "Nous soumettons votre demande à Leasecom, 1er acteur indépendant du leasing en France. Réponse sous 48h.",
    },
    {
      step: 3,
      title: "Livraison & installation",
      description: "Notre équipe livre, monte et installe dans vos locaux — Chaumont, Haute-Marne, Aube. Vous n'avez rien à faire.",
    },
    {
      step: 4,
      title: "Mensualité fixe",
      description: "Déductible à 100 % en charges. En fin de contrat : rachat, restitution ou renouvellement vers du neuf.",
    },
  ];

  const pricingTiers = [
    {
      name: "Essentiel",
      price: "~28 €",
      priceSuffix: "/ mois",
      description: "1 poste complet · à partir de 900 € HT",
      features: [
        "Bureau réglable en hauteur",
        "Siège ergonomique",
        "Caisson de rangement",
        "Livraison + installation incluses",
        "Option d'achat en fin de contrat",
      ],
      highlighted: false,
      ctaLabel: "Demander un devis",
    },
    {
      name: "Bureau Complet",
      price: "~138 €",
      priceSuffix: "/ mois",
      description: "5 postes + salle de réunion · à partir de 4 500 € HT",
      features: [
        "5 postes de travail complets",
        "Mobilier accueil / réception",
        "Table réunion 6 places + chaises",
        "Conseil aménagement inclus",
        "Livraison + installation incluses",
      ],
      highlighted: true,
      ctaLabel: "Demander un devis",
    },
    {
      name: "Espace Coworking",
      price: "Sur devis",
      priceSuffix: "",
      description: "Configuration flexible · 24 à 60 mois",
      features: [
        "Postes modulaires configurables",
        "Mobilier lounge / zones détente",
        "Cabines acoustiques téléphonie",
        "Modification config. en cours de contrat",
        "Conseil aménagement + suivi",
      ],
      highlighted: false,
      ctaLabel: "Nous contacter",
    },
  ];

  const profiles = [
    {
      emoji: "⚕️",
      icon: Briefcase,
      title: "Professions libérales",
      subtitle: "Médecin · Avocat · Notaire · Architecte",
      description:
        "Vous installez votre cabinet ou déménagez. L'investissement mobilier est conséquent et immédiat. Avec le leasing, il passe en charges — et votre mobilier reste impeccable pendant toute la durée d'exercice.",
      testimonial:
        "« 3 ans de leasing pour ma salle d'attente et mon bureau : 180 €/mois au lieu de 6 500 € d'un coup. »",
    },
    {
      emoji: "🏢",
      icon: Building2,
      title: "TPE en croissance",
      subtitle: "Agences · Artisans · Commerçants · Start-ups",
      description:
        "Vous recrutez et devez ajouter des postes rapidement sans épuiser votre trésorerie. Chaque nouveau collaborateur représente ~30 €/mois en mobilier plutôt que 1 200 € cash.",
      testimonial:
        "« J'ai équipé 4 postes d'un coup à l'ouverture. J'aurais jamais pu faire ça en achat direct. »",
    },
    {
      emoji: "☕",
      icon: Users,
      title: "Espaces partagés",
      subtitle: "Coworking · Tiers-lieux · Résidences pro",
      description:
        "Vous avez besoin de flexibilité maximale : reconfigurer selon les usages, renouveler facilement, intégrer de nouveaux postes sans tout remettre à plat.",
      testimonial:
        "« La possibilité de modifier la configuration en cours de contrat, c'est ce qui a fait la différence. »",
    },
  ];

  const faqData = [
    {
      question: "Quelle est la différence entre leasing et crédit classique ?",
      answer:
        "Le leasing mobilier n'apparaît pas dans vos encours bancaires. Vos mensualités sont des charges d'exploitation déductibles à 100 % l'année N. Votre capacité d'endettement reste intacte.",
    },
    {
      question: "Quel est le ticket minimum ?",
      answer:
        "Dès 500 € HT de commande mobilier, le financement par leasing est disponible. L'intérêt est maximal à partir de 1 500 € (poste complet ou salle de réunion).",
    },
    {
      question: "Comment se déroule la livraison et l'installation ?",
      answer:
        "Une fois le dossier validé (48h), nous livrons et installons directement dans vos locaux. Montage, vérification ergonomique, évacuation des emballages : tout est inclus. Zone couverte : Chaumont, Haute-Marne, Aube et environs.",
    },
    {
      question: "Que se passe-t-il en fin de contrat ?",
      answer:
        "Trois options : rachat à valeur résiduelle (~1 % du prix initial), restitution et remplacement par du neuf, ou prolongation du loyer en cours. Aucun engagement à la signature.",
    },
    {
      question: "Peut-on ajouter du mobilier en cours de contrat ?",
      answer:
        "Oui. Vous pouvez intégrer de nouveaux équipements à vos mensualités existantes, sans repartir de zéro. Idéal si vous recrutez ou réaménagez.",
    },
    {
      question: "Ma TPE est-elle éligible ?",
      answer:
        "Oui. Auto-entrepreneurs, SAS, SARL, SCI, associations, collectivités — tous éligibles. Dossier étudié sur la santé financière, pas sur la taille.",
    },
  ];

  const serviceSchema = {
    "@context": "https://schema.org",
    "@type": "Service",
    name: "Leasing mobilier de bureau – Ma Papeterie Reine & Fils",
    description:
      "Équipez vos bureaux en leasing : 0 € d'apport, mensualités déductibles. Financement Leasecom pour TPE, professions libérales et espaces coworking.",
    provider: {
      "@type": "LocalBusiness",
      name: "Ma Papeterie — Reine & Fils",
      address: {
        "@type": "PostalAddress",
        addressLocality: "Chaumont",
        addressRegion: "Haute-Marne",
        postalCode: "52000",
        addressCountry: "FR",
      },
    },
    areaServed: { "@type": "Country", name: "France" },
    serviceType: "Leasing mobilier professionnel",
  };

  const faqSchema = {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: faqData.map((item) => ({
      "@type": "Question",
      name: item.question,
      acceptedAnswer: { "@type": "Answer", text: item.answer },
    })),
  };

  return (
    <>
      <Helmet>
        <title>Leasing Mobilier de Bureau | Ma Papeterie — Reine & Fils</title>
        <meta
          name="description"
          content="Équipez vos bureaux sans immobiliser votre trésorerie. Service clé en main : conseil, livraison, installation. TPE, professions libérales, coworking."
        />
        <meta name="robots" content="index, follow" />
        <link rel="canonical" href="https://ma-papeterie.fr/leasing-mobilier-bureau" />
        <script type="application/ld+json">{JSON.stringify(serviceSchema)}</script>
        <script type="application/ld+json">{JSON.stringify(faqSchema)}</script>
      </Helmet>

      <div className="min-h-screen bg-background">
        <Header />

        <main>
          {/* Hero + Simulator — 2-column layout */}
          <section className="bg-gradient-to-b from-primary/10 to-background py-12 lg:py-20">
            <div className="container mx-auto px-4">
              <div className="max-w-6xl mx-auto grid lg:grid-cols-2 gap-8 lg:gap-12 items-center">
                {/* Left — Copy */}
                <div>
                  <Badge variant="secondary" className="mb-4 text-xs tracking-widest uppercase">
                    Service Professionnel · Haute-Marne & Région
                  </Badge>
                  <h1 className="text-3xl md:text-4xl lg:text-5xl font-bold text-foreground leading-tight mb-6">
                    Équipez vos bureaux<br />
                    sans immobiliser<br />
                    <em className="italic text-muted-foreground font-normal">votre trésorerie.</em>
                  </h1>
                  <p className="text-lg text-muted-foreground leading-relaxed mb-8 max-w-lg">
                    Mobilier de bureau livré, installé et financé par mensualités déductibles.
                    Un interlocuteur local, un service clé en main, zéro avance de fonds.
                  </p>
                  <div className="flex flex-wrap gap-3 mb-8">
                    <Button size="lg" asChild>
                      <a href="#demande-devis">
                        Obtenir un devis gratuit <ArrowRight className="h-4 w-4 ml-2" />
                      </a>
                    </Button>
                    <Button size="lg" variant="outline" asChild>
                      <a href="#comment">Comment ça marche</a>
                    </Button>
                  </div>
                  <div className="flex flex-wrap gap-4">
                    {trustIndicators.map((text) => (
                      <span
                        key={text}
                        className="flex items-center gap-2 text-xs text-muted-foreground font-medium"
                      >
                        <span className="w-2 h-2 rounded-full bg-green-500 flex-shrink-0" />
                        {text}
                      </span>
                    ))}
                  </div>
                </div>

                {/* Right — Simulator */}
                <div className="bg-foreground text-background rounded-2xl p-6 lg:p-8">
                  <h2 className="text-xl font-bold mb-1">Estimez votre mensualité</h2>
                  <p className="text-xs tracking-widest uppercase text-background/40 mb-6">
                    Simulateur indicatif
                  </p>

                  <div className="space-y-5">
                    <div>
                      <label className="block text-xs tracking-wider uppercase text-background/45 mb-2">
                        Mon profil
                      </label>
                      <Select value={simProfile} onValueChange={setSimProfile}>
                        <SelectTrigger className="bg-background/10 border-background/15 text-background">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {profileOptions.map((p) => (
                            <SelectItem key={p.value} value={p.value}>
                              {p.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    <div>
                      <label className="block text-xs tracking-wider uppercase text-background/45 mb-2">
                        Budget mobilier estimé (€ HT)
                      </label>
                      <Slider
                        value={[simAmount]}
                        onValueChange={(v) => setSimAmount(v[0])}
                        min={500}
                        max={20000}
                        step={250}
                        className="mb-2"
                      />
                      <div className="text-lg font-bold text-background">
                        {simAmount.toLocaleString("fr-FR")} €
                      </div>
                    </div>

                    <div>
                      <label className="block text-xs tracking-wider uppercase text-background/45 mb-2">
                        Durée souhaitée
                      </label>
                      <Select
                        value={String(simDuration)}
                        onValueChange={(v) => setSimDuration(Number(v))}
                      >
                        <SelectTrigger className="bg-background/10 border-background/15 text-background">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {LEASING_DURATIONS.map((d) => (
                            <SelectItem key={d} value={String(d)}>
                              {d} mois ({d / 12} ans)
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    {/* Results */}
                    <div className="bg-background/5 border border-background/10 rounded-lg p-4 space-y-3">
                      <div className="flex justify-between items-baseline border-b border-background/10 pb-3">
                        <span className="text-xs text-background/45 tracking-wide">Mensualité estimée HT</span>
                        <span className="text-2xl font-bold text-secondary">
                          ~{Math.round(estimate.monthlyHT).toLocaleString("fr-FR")} €
                        </span>
                      </div>
                      <div className="flex justify-between items-baseline border-b border-background/10 pb-3">
                        <span className="text-xs text-background/45 tracking-wide">Total loyers</span>
                        <span className="text-base font-semibold text-background">
                          {Math.round(estimate.totalCost).toLocaleString("fr-FR")} €
                        </span>
                      </div>
                      <div className="flex justify-between items-baseline">
                        <span className="text-xs text-background/45 tracking-wide">Trésorerie préservée (3 mois)</span>
                        <span className="text-base font-semibold text-green-400">
                          +{Math.round(simAmount - estimate.monthlyHT * 3).toLocaleString("fr-FR")} €
                        </span>
                      </div>
                    </div>

                    <p className="text-[11px] text-background/30">
                      {LEASING_DISCLAIMER} · Financement Leasecom
                    </p>

                    <Button className="w-full" size="lg" asChild>
                      <a href="#demande-devis">
                        Valider mon devis <ArrowRight className="h-4 w-4 ml-2" />
                      </a>
                    </Button>
                  </div>
                </div>
              </div>
            </div>
          </section>

          {/* Stats Bar */}
          <section className="bg-foreground text-background py-10">
            <div className="container mx-auto px-4">
              <div className="max-w-5xl mx-auto grid grid-cols-2 lg:grid-cols-4 gap-8 text-center">
                {statsData.map((stat) => (
                  <div key={stat.label}>
                    <div className={`text-3xl lg:text-4xl font-bold mb-2 ${stat.accent ? "text-secondary" : "text-background"}`}>
                      {stat.value}
                    </div>
                    <p className="text-sm text-background/50 whitespace-pre-line leading-relaxed">
                      {stat.label}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          </section>

          {/* Process Steps */}
          <section id="comment" className="py-16">
            <div className="container mx-auto px-4">
              <div className="max-w-5xl mx-auto">
                <Badge variant="secondary" className="mb-3 text-xs tracking-widest uppercase">
                  Processus
                </Badge>
                <h2 className="text-2xl md:text-3xl font-bold mb-2">
                  Simple comme passer commande
                </h2>
                <p className="text-muted-foreground mb-10 max-w-xl">
                  Quatre étapes. 48h du devis à l'accord. Aucune démarche bancaire de votre côté.
                </p>
                <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-6">
                  {processSteps.map((s, idx) => (
                    <div key={s.step} className="relative">
                      <Card className="h-full">
                        <CardContent className="pt-6">
                          <span className="text-4xl font-bold text-muted-foreground/20 block mb-3">
                            {String(s.step).padStart(2, "0")}
                          </span>
                          <h3 className="font-semibold mb-2">{s.title}</h3>
                          <p className="text-sm text-muted-foreground leading-relaxed">{s.description}</p>
                        </CardContent>
                      </Card>
                      {idx < processSteps.length - 1 && (
                        <ArrowRight className="hidden lg:block absolute -right-4 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground/30 z-10" />
                      )}
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </section>

          {/* Pricing Formulas */}
          <section className="py-16 bg-muted/30">
            <div className="container mx-auto px-4">
              <div className="max-w-5xl mx-auto">
                <Badge variant="secondary" className="mb-3 text-xs tracking-widest uppercase">
                  Formules
                </Badge>
                <h2 className="text-2xl md:text-3xl font-bold mb-2">
                  Quelle configuration vous correspond ?
                </h2>
                <p className="text-muted-foreground mb-10 max-w-xl">
                  Exemples indicatifs — 36 mois. Chaque offre est adaptée sur devis.
                </p>
                <div className="grid md:grid-cols-3 gap-6">
                  {pricingTiers.map((tier) => (
                    <Card
                      key={tier.name}
                      className={`flex flex-col transition-all hover:-translate-y-1 hover:shadow-lg ${
                        tier.highlighted ? "ring-2 ring-primary" : ""
                      }`}
                    >
                      <CardHeader className="relative border-b">
                        {tier.highlighted && (
                          <Badge className="absolute top-4 right-4 text-[10px] tracking-wider uppercase">
                            Le + choisi
                          </Badge>
                        )}
                        <p className="text-xs tracking-widest uppercase text-muted-foreground mb-1">
                          {tier.name}
                        </p>
                        <div className="text-3xl font-bold">
                          {tier.price}
                          {tier.priceSuffix && (
                            <span className="text-base font-normal text-muted-foreground ml-1">
                              {tier.priceSuffix}
                            </span>
                          )}
                        </div>
                        <p className="text-sm text-muted-foreground mt-1">{tier.description}</p>
                      </CardHeader>
                      <CardContent className="flex-1 pt-6">
                        <ul className="space-y-3">
                          {tier.features.map((feat) => (
                            <li key={feat} className="flex items-start gap-2 text-sm">
                              <CheckCircle className="h-4 w-4 text-green-500 flex-shrink-0 mt-0.5" />
                              {feat}
                            </li>
                          ))}
                        </ul>
                      </CardContent>
                      <div className="p-6 pt-0">
                        <Button
                          className="w-full"
                          variant={tier.highlighted ? "default" : "outline"}
                          asChild
                        >
                          <a href="#demande-devis">
                            {tier.ctaLabel} {tier.highlighted && <ArrowRight className="h-4 w-4 ml-1" />}
                          </a>
                        </Button>
                      </div>
                    </Card>
                  ))}
                </div>
              </div>
            </div>
          </section>

          {/* Target Profiles */}
          <section className="py-16">
            <div className="container mx-auto px-4">
              <div className="max-w-5xl mx-auto">
                <Badge variant="secondary" className="mb-3 text-xs tracking-widest uppercase">
                  Pour qui
                </Badge>
                <h2 className="text-2xl md:text-3xl font-bold mb-2">
                  Vous reconnaissez-vous ?
                </h2>
                <p className="text-muted-foreground mb-10 max-w-xl">
                  Notre service s'adresse à tout professionnel qui veut un espace de travail soigné sans immobiliser son capital.
                </p>
                <div className="grid md:grid-cols-3 gap-6">
                  {profiles.map((p) => (
                    <Card key={p.title} className="h-full">
                      <CardContent className="pt-8 space-y-3">
                        <span className="text-3xl">{p.emoji}</span>
                        <h3 className="text-lg font-bold">{p.title}</h3>
                        <p className="text-xs tracking-wider text-primary font-medium uppercase">
                          {p.subtitle}
                        </p>
                        <p className="text-sm text-muted-foreground leading-relaxed">
                          {p.description}
                        </p>
                        <div className="bg-muted/50 rounded-md p-3 mt-4">
                          <p className="text-sm italic text-foreground/80 leading-relaxed">
                            {p.testimonial}
                          </p>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
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
              <div className="max-w-5xl mx-auto">
                <Badge variant="secondary" className="mb-3 text-xs tracking-widest uppercase">
                  Questions fréquentes
                </Badge>
                <h2 className="text-2xl md:text-3xl font-bold mb-10">
                  Tout ce que vous voulez savoir
                </h2>
                <div className="max-w-3xl">
                  <Accordion type="single" collapsible className="space-y-4">
                    {faqData.map((item, index) => (
                      <AccordionItem
                        key={index}
                        value={`item-${index}`}
                        className="bg-background rounded-lg px-6"
                      >
                        <AccordionTrigger className="text-left font-medium">
                          {item.question}
                        </AccordionTrigger>
                        <AccordionContent className="text-muted-foreground leading-relaxed">
                          {item.answer}
                        </AccordionContent>
                      </AccordionItem>
                    ))}
                  </Accordion>
                </div>
              </div>
            </div>
          </section>

          {/* CTA Final */}
          <section className="bg-foreground text-background py-16">
            <div className="container mx-auto px-4 text-center">
              <Badge variant="secondary" className="mb-3 text-xs tracking-widest uppercase opacity-80">
                Prochaine étape
              </Badge>
              <h2 className="text-2xl md:text-3xl font-bold text-background mb-3">
                Votre devis en 24h, sans engagement
              </h2>
              <p className="text-background/55 max-w-xl mx-auto mb-10">
                Décrivez-nous votre besoin — nous constituons l'offre et revenons vers vous avec une proposition chiffrée, financement inclus.
              </p>
              <div className="flex flex-wrap justify-center gap-4">
                <Button size="lg" variant="secondary" asChild>
                  <a href="mailto:pro@ma-papeterie.fr">
                    <Mail className="h-4 w-4 mr-2" /> pro@ma-papeterie.fr
                  </a>
                </Button>
                <Button
                  size="lg"
                  variant="outline"
                  className="bg-transparent border-background/20 text-background/75 hover:border-background/60 hover:text-background"
                  asChild
                >
                  <a href="tel:0745062162">
                    <Phone className="h-4 w-4 mr-2" /> Nous appeler
                  </a>
                </Button>
                <Button
                  size="lg"
                  variant="outline"
                  className="bg-transparent border-background/20 text-background/75 hover:border-background/60 hover:text-background"
                  asChild
                >
                  <Link to="/catalogue">
                    Voir le catalogue <ArrowRight className="h-4 w-4 ml-2" />
                  </Link>
                </Button>
              </div>
            </div>
          </section>

          {/* Footer note + Internal linking */}
          <section className="py-8 border-t">
            <div className="container mx-auto px-4 text-center space-y-4">
              <p className="text-xs text-muted-foreground leading-relaxed max-w-2xl mx-auto">
                Offre de financement en partenariat avec Leasecom, 1er acteur indépendant du financement locatif en France.
                Mensualités indicatives hors taxes. Offre définitive sur devis. Sous réserve d'acceptation du dossier.
              </p>
              <p className="text-sm text-muted-foreground">
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
