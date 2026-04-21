import { useState, useEffect, useCallback } from "react";
import { Helmet } from "react-helmet-async";
import Header from "@/components/layout/Header";
import Footer from "@/components/layout/Footer";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import {
  Building2, User, Mail, Lock, Phone, MapPin,
  FileText, CheckCircle, Loader2, ArrowRight, ArrowLeft,
  BadgePercent, Truck, Headphones, Shield
} from "lucide-react";
import { useAuth } from "@/stores/authStore";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { SiretAutocomplete } from "@/components/b2b/SiretAutocomplete";
import type { SireneResult } from "@/hooks/useSireneLookup";
import { computeVatNumber, isValidLuhn } from "@/lib/b2bAccountSchema";

type Step = 1 | 2 | 3;

const InscriptionPro = () => {
  const navigate = useCallback((url: string) => { window.location.href = url; }, []);
  const { user } = useAuth();
  const [step, setStep] = useState<Step>(1);
  const [isLoading, setIsLoading] = useState(false);
  const [success, setSuccess] = useState(false);

  // Step 1 — Compte utilisateur
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [displayName, setDisplayName] = useState("");

  // Step 2 — Informations entreprise
  const [companyName, setCompanyName] = useState("");
  const [siret, setSiret] = useState("");
  const [vatNumber, setVatNumber] = useState("");
  const [companyPhone, setCompanyPhone] = useState("");
  const [companyEmail, setCompanyEmail] = useState("");
  // Auto-complétion INSEE (data.gouv — API Recherche d'Entreprises)
  const [sireneQuery, setSireneQuery] = useState("");
  const [sireneData, setSireneData] = useState<SireneResult | null>(null);

  // Step 3 — Adresse de facturation
  const [street, setStreet] = useState("");
  const [zipCode, setZipCode] = useState("");
  const [city, setCity] = useState("");
  const [notes, setNotes] = useState("");

  useEffect(() => {
    if (user) {
      navigate("/pro/dashboard");
    }
  }, [user, navigate]);

  function validateStep1(): boolean {
    if (!email || !password || !confirmPassword || !displayName) {
      toast.error("Erreur", { description: "Veuillez remplir tous les champs obligatoires" });
      return false;
    }
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      toast.error("Erreur", { description: "Veuillez saisir un email valide" });
      return false;
    }
    if (password.length < 12) {
      toast.error("Erreur", { description: "Le mot de passe doit contenir au moins 12 caractères" });
      return false;
    }
    const hasUpperCase = /[A-Z]/.test(password);
    const hasLowerCase = /[a-z]/.test(password);
    const hasNumber = /[0-9]/.test(password);
    const hasSpecial = /[^A-Za-z0-9]/.test(password);
    if (!hasUpperCase || !hasLowerCase || !hasNumber || !hasSpecial) {
      toast.error("Erreur", { description: "Le mot de passe doit contenir majuscule, minuscule, chiffre et caractère spécial" });
      return false;
    }
    if (password !== confirmPassword) {
      toast.error("Erreur", { description: "Les mots de passe ne correspondent pas" });
      return false;
    }
    return true;
  }

  function validateStep2(): boolean {
    if (!companyName) {
      toast.error("Erreur", { description: "Le nom de l'entreprise est obligatoire" });
      return false;
    }
    const cleanSiret = siret.replace(/\s/g, "");
    if (cleanSiret) {
      if (!/^\d{14}$/.test(cleanSiret)) {
        toast.error("Erreur", { description: "Le SIRET doit contenir 14 chiffres" });
        return false;
      }
      // On tolère un SIRET non-Luhn s'il a été vérifié auprès de l'INSEE
      // (quelques établissements publics dérogent), sinon on vérifie la clé.
      if (!sireneData && !isValidLuhn(cleanSiret)) {
        toast.error("Erreur", { description: "SIRET invalide (clé de contrôle)" });
        return false;
      }
    }
    if (vatNumber && !/^FR\d{11}$/i.test(vatNumber.replace(/\s/g, ""))) {
      toast.error("Erreur", { description: "Le numéro de TVA doit être au format FR + 11 chiffres" });
      return false;
    }
    return true;
  }

  function handleSireneSelect(result: SireneResult) {
    setSireneData(result);
    setSireneQuery(result.name);
    setCompanyName(result.name);
    setSiret(result.siret);
    // TVA = FR + clé modulo 97 + SIREN (fallback si l'API ne l'expose pas)
    try {
      setVatNumber(computeVatNumber(result.siren));
    } catch {
      // SIREN exotique : on laisse vide, saisie manuelle possible
    }
    // Pré-remplit l'adresse de facturation (Step 3)
    if (result.address.street) setStreet(result.address.street);
    if (result.address.zip) setZipCode(result.address.zip);
    if (result.address.city) setCity(result.address.city);

    if (result.administrativeStatus === "C") {
      toast.warning("Entreprise cessée", {
        description: "Cette entreprise est marquée « cessée » à l'INSEE. Vérifiez les informations avant de valider.",
      });
    }
  }

  function handleSireneClear() {
    setSireneData(null);
  }

  function handleNext() {
    if (step === 1 && validateStep1()) setStep(2);
    else if (step === 2 && validateStep2()) setStep(3);
  }

  function handleBack() {
    if (step > 1) setStep((s) => (s - 1) as Step);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!companyName) return;

    setIsLoading(true);
    try {
      // 1. Créer le compte utilisateur
      const { data: authData, error: authError } = await supabase.auth.signUp({
        email,
        password,
        options: {
          emailRedirectTo: `${window.location.origin}/pro/dashboard`,
          data: {
            display_name: displayName,
            is_pro_signup: true,
          },
        },
      });

      if (authError) throw authError;
      if (!authData.user) throw new Error("Erreur lors de la création du compte");

      const userId = authData.user.id;

      // 2. Créer le compte B2B
      const billingAddress: Record<string, string> = {};
      if (street) billingAddress.street = street;
      if (zipCode) billingAddress.zip_code = zipCode;
      if (city) billingAddress.city = city;
      billingAddress.country = "FR";

      // Colonnes SIRENE pré-remplies si l'utilisateur a sélectionné un résultat INSEE.
      // Cast via `as never` car ces colonnes sont ajoutées par la migration
      // 20260421120000 mais pas encore reflétées dans les types auto-générés.
      const sireneColumns = sireneData
        ? {
            naf_code: sireneData.nafCode,
            naf_label: sireneData.nafLabel,
            legal_form: sireneData.legalForm,
            founded_date: sireneData.foundedDate,
            employee_range: sireneData.employeeRange,
            sirene_raw: sireneData.raw,
            sirene_synced_at: new Date().toISOString(),
          }
        : {};

      const insertPayload = {
        name: companyName,
        siret: siret.replace(/\s/g, "") || null,
        vat_number: vatNumber.replace(/\s/g, "").toUpperCase() || null,
        phone: companyPhone || null,
        email: companyEmail || email,
        billing_address: Object.keys(billingAddress).length > 0 ? billingAddress : null,
        notes: notes || null,
        is_active: true,
        payment_terms: 30,
        ...sireneColumns,
      };

      const { data: accountData, error: accountError } = await supabase
        .from("b2b_accounts")
        .insert(insertPayload as never)
        .select("id")
        .single();

      if (accountError) throw accountError;

      // 3. Lier l'utilisateur au compte B2B
      const { error: linkError } = await supabase
        .from("b2b_company_users")
        .insert({
          account_id: accountData.id,
          user_id: userId,
          role: "admin",
          is_primary: true,
        });

      if (linkError) throw linkError;

      // 4. Assigner le rôle "pro" (via insert dans user_roles si pas de trigger auto)
      // Note: selon la config, un trigger Supabase peut gérer cela automatiquement
      // On tente l'insertion, on ignore si elle échoue (rôle déjà attribué ou trigger en place)
      await supabase
        .from("user_roles")
        .upsert({ user_id: userId, role: "user" }, { onConflict: "user_id" })
        .then(() => {});

      setSuccess(true);
    } catch (error: unknown) {
      if (import.meta.env.DEV) console.error("Erreur inscription pro:", error);
      toast.error("Erreur", {
        description: error instanceof Error ? error.message : "Une erreur est survenue lors de l'inscription",
      });
    } finally {
      setIsLoading(false);
    }
  }

  const serviceSchema = {
    "@context": "https://schema.org",
    "@type": "WebPage",
    "name": "Inscription Professionnel — Ma Papeterie Chaumont",
    "description": "Créez votre compte professionnel pour bénéficier de tarifs B2B, facturation mensuelle et accompagnement dédié.",
  };

  if (success) {
    return (
      <>
        <Helmet>
          <title>Inscription confirmée | Ma Papeterie</title>
          <meta name="robots" content="noindex" />
        </Helmet>
        <div className="min-h-screen bg-background">
          <Header />
          <main className="container mx-auto px-4 py-16 max-w-lg">
            <Card className="text-center">
              <CardContent className="pt-8 pb-8 space-y-4">
                <CheckCircle className="h-16 w-16 text-green-500 mx-auto" />
                <h1 className="text-2xl font-bold">Inscription réussie !</h1>
                <p className="text-muted-foreground">
                  Un email de confirmation a été envoyé à <strong>{email}</strong>.
                  Veuillez cliquer sur le lien pour activer votre compte.
                </p>
                <p className="text-sm text-muted-foreground">
                  Notre équipe vérifiera vos informations professionnelles et activera
                  vos avantages B2B sous 24h ouvrées.
                </p>
                <Separator />
                <Button asChild>
                  <a href="/">Retour à l'accueil</a>
                </Button>
              </CardContent>
            </Card>
          </main>
          <Footer />
        </div>
      </>
    );
  }

  return (
    <>
      <Helmet>
        <title>Inscription Professionnel — Compte B2B | Ma Papeterie Chaumont</title>
        <meta
          name="description"
          content="Créez votre compte professionnel Ma Papeterie : tarifs B2B dégressifs, facturation mensuelle, livraison prioritaire et accompagnement dédié à Chaumont."
        />
        <meta name="robots" content="index, follow" />
        <link rel="canonical" href="https://ma-papeterie.fr/inscription-pro" />
        <script type="application/ld+json">{JSON.stringify(serviceSchema)}</script>
      </Helmet>

      <div className="min-h-screen bg-background">
        <Header />

        <main id="main-content">
          {/* Hero */}
          <section className="bg-gradient-to-br from-primary/10 via-background to-secondary/10 py-12 md:py-16">
            <div className="container mx-auto px-4 text-center">
              <Badge variant="secondary" className="mb-4">
                <Building2 className="h-3.5 w-3.5 mr-1.5" />
                Espace Professionnel
              </Badge>
              <h1 className="text-3xl md:text-4xl font-bold mb-4">
                Créez votre compte professionnel
              </h1>
              <p className="text-lg text-muted-foreground max-w-xl mx-auto">
                Accédez à des tarifs préférentiels, la facturation mensuelle et un accompagnement dédié.
              </p>
            </div>
          </section>

          {/* Avantages */}
          <section className="py-10">
            <div className="container mx-auto px-4">
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 max-w-4xl mx-auto">
                <div className="flex items-start gap-3 p-4 rounded-lg bg-muted/30">
                  <BadgePercent className="h-6 w-6 text-primary shrink-0 mt-0.5" />
                  <div>
                    <p className="font-semibold text-sm">Prix HT dégressifs</p>
                    <p className="text-xs text-muted-foreground">Remises sur volume</p>
                  </div>
                </div>
                <div className="flex items-start gap-3 p-4 rounded-lg bg-muted/30">
                  <FileText className="h-6 w-6 text-primary shrink-0 mt-0.5" />
                  <div>
                    <p className="font-semibold text-sm">Facturation mensuelle</p>
                    <p className="text-xs text-muted-foreground">Paiement à 30 jours</p>
                  </div>
                </div>
                <div className="flex items-start gap-3 p-4 rounded-lg bg-muted/30">
                  <Truck className="h-6 w-6 text-primary shrink-0 mt-0.5" />
                  <div>
                    <p className="font-semibold text-sm">Livraison prioritaire</p>
                    <p className="text-xs text-muted-foreground">Expédition express</p>
                  </div>
                </div>
                <div className="flex items-start gap-3 p-4 rounded-lg bg-muted/30">
                  <Headphones className="h-6 w-6 text-primary shrink-0 mt-0.5" />
                  <div>
                    <p className="font-semibold text-sm">Conseiller dédié</p>
                    <p className="text-xs text-muted-foreground">Accompagnement sur mesure</p>
                  </div>
                </div>
              </div>
            </div>
          </section>

          {/* Formulaire */}
          <section className="py-8 pb-16">
            <div className="container mx-auto px-4 max-w-2xl">
              {/* Progress Steps */}
              <div className="flex items-center justify-center gap-2 mb-8">
                {[1, 2, 3].map((s) => (
                  <div key={s} className="flex items-center gap-2">
                    <div
                      className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold transition-colors ${
                        step >= s ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground"
                      }`}
                    >
                      {step > s ? <CheckCircle className="h-4 w-4" /> : s}
                    </div>
                    <span className="text-xs text-muted-foreground hidden sm:inline">
                      {s === 1 ? "Compte" : s === 2 ? "Entreprise" : "Adresse"}
                    </span>
                    {s < 3 && <div className={`w-8 h-0.5 ${step > s ? "bg-primary" : "bg-muted"}`} />}
                  </div>
                ))}
              </div>

              <form onSubmit={handleSubmit}>
                {/* Step 1 — Compte utilisateur */}
                {step === 1 && (
                  <Card>
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2">
                        <User className="h-5 w-5 text-primary" />
                        Votre compte
                      </CardTitle>
                      <CardDescription>
                        Créez vos identifiants de connexion
                      </CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <div className="space-y-2">
                        <Label htmlFor="displayName">Nom complet *</Label>
                        <Input
                          id="displayName"
                          value={displayName}
                          onChange={(e) => setDisplayName(e.target.value)}
                          placeholder="Jean Dupont"
                          required
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="email">Email professionnel *</Label>
                        <div className="relative">
                          <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                          <Input
                            id="email"
                            type="email"
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            placeholder="contact@entreprise.fr"
                            className="pl-9"
                            required
                          />
                        </div>
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="password">Mot de passe *</Label>
                        <div className="relative">
                          <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                          <Input
                            id="password"
                            type="password"
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            placeholder="12 caractères minimum"
                            className="pl-9"
                            required
                          />
                        </div>
                        <p className="text-xs text-muted-foreground">
                          Majuscule, minuscule, chiffre et caractère spécial requis
                        </p>
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="confirmPassword">Confirmer le mot de passe *</Label>
                        <Input
                          id="confirmPassword"
                          type="password"
                          value={confirmPassword}
                          onChange={(e) => setConfirmPassword(e.target.value)}
                          placeholder="Confirmez votre mot de passe"
                          required
                        />
                      </div>
                      <div className="flex justify-between pt-4">
                        <a href="/auth" className="text-sm text-muted-foreground hover:text-foreground transition-colors">
                          Déjà un compte ? Se connecter
                        </a>
                        <Button type="button" onClick={handleNext}>
                          Suivant <ArrowRight className="h-4 w-4 ml-1" />
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                )}

                {/* Step 2 — Entreprise */}
                {step === 2 && (
                  <Card>
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2">
                        <Building2 className="h-5 w-5 text-primary" />
                        Votre entreprise
                      </CardTitle>
                      <CardDescription>
                        Informations de votre société
                      </CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <div className="space-y-2">
                        <Label htmlFor="sireneSearch">
                          Rechercher mon entreprise <span className="text-muted-foreground font-normal">(nom ou SIRET)</span>
                        </Label>
                        <SiretAutocomplete
                          id="sireneSearch"
                          value={sireneQuery}
                          onChange={setSireneQuery}
                          onSelect={handleSireneSelect}
                          verified={!!sireneData}
                          onClearVerified={handleSireneClear}
                          placeholder="Ex. Ma Papeterie ou 12345678901234"
                        />
                        <p className="text-xs text-muted-foreground">
                          Base officielle INSEE (data.gouv.fr). Les champs ci-dessous se remplissent automatiquement.
                          Vous pouvez aussi tout saisir manuellement.
                        </p>
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="companyName">Raison sociale *</Label>
                        <Input
                          id="companyName"
                          value={companyName}
                          onChange={(e) => setCompanyName(e.target.value)}
                          placeholder="Nom de votre entreprise"
                          required
                        />
                      </div>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <Label htmlFor="siret">SIRET</Label>
                          <Input
                            id="siret"
                            value={siret}
                            onChange={(e) => {
                              setSiret(e.target.value);
                              // Dès que l'utilisateur modifie le SIRET, on invalide le badge "Vérifié INSEE"
                              if (sireneData) setSireneData(null);
                            }}
                            placeholder="123 456 789 00012"
                            maxLength={17}
                          />
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="vatNumber">N° TVA intracommunautaire</Label>
                          <Input
                            id="vatNumber"
                            value={vatNumber}
                            onChange={(e) => setVatNumber(e.target.value)}
                            placeholder="FR12345678901"
                            maxLength={15}
                          />
                        </div>
                      </div>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <Label htmlFor="companyPhone">Téléphone</Label>
                          <div className="relative">
                            <Phone className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                            <Input
                              id="companyPhone"
                              type="tel"
                              value={companyPhone}
                              onChange={(e) => setCompanyPhone(e.target.value)}
                              placeholder="03 XX XX XX XX"
                              className="pl-9"
                            />
                          </div>
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="companyEmail">Email de facturation</Label>
                          <Input
                            id="companyEmail"
                            type="email"
                            value={companyEmail}
                            onChange={(e) => setCompanyEmail(e.target.value)}
                            placeholder="compta@entreprise.fr"
                          />
                        </div>
                      </div>
                      <div className="flex justify-between pt-4">
                        <Button type="button" variant="outline" onClick={handleBack}>
                          <ArrowLeft className="h-4 w-4 mr-1" /> Retour
                        </Button>
                        <Button type="button" onClick={handleNext}>
                          Suivant <ArrowRight className="h-4 w-4 ml-1" />
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                )}

                {/* Step 3 — Adresse + finalisation */}
                {step === 3 && (
                  <Card>
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2">
                        <MapPin className="h-5 w-5 text-primary" />
                        Adresse de facturation
                      </CardTitle>
                      <CardDescription>
                        Adresse pour vos factures et livraisons
                      </CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <div className="space-y-2">
                        <Label htmlFor="street">Adresse</Label>
                        <Input
                          id="street"
                          value={street}
                          onChange={(e) => setStreet(e.target.value)}
                          placeholder="12 rue du Commerce"
                        />
                      </div>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <Label htmlFor="zipCode">Code postal</Label>
                          <Input
                            id="zipCode"
                            value={zipCode}
                            onChange={(e) => setZipCode(e.target.value)}
                            placeholder="52000"
                            maxLength={5}
                          />
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="city">Ville</Label>
                          <Input
                            id="city"
                            value={city}
                            onChange={(e) => setCity(e.target.value)}
                            placeholder="Chaumont"
                          />
                        </div>
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="notes">Commentaire (optionnel)</Label>
                        <Textarea
                          id="notes"
                          value={notes}
                          onChange={(e) => setNotes(e.target.value)}
                          placeholder="Précisez vos besoins, volumes habituels, secteur d'activité..."
                          rows={3}
                        />
                      </div>

                      {/* Récapitulatif */}
                      <div className="bg-muted/30 rounded-lg p-4 space-y-2 text-sm">
                        <p className="font-semibold">Récapitulatif</p>
                        <div className="grid grid-cols-2 gap-1 text-muted-foreground">
                          <span>Contact :</span><span className="text-foreground">{displayName}</span>
                          <span>Email :</span><span className="text-foreground">{email}</span>
                          <span>Entreprise :</span><span className="text-foreground">{companyName}</span>
                          {siret && <><span>SIRET :</span><span className="text-foreground">{siret}</span></>}
                          {city && <><span>Ville :</span><span className="text-foreground">{city}</span></>}
                        </div>
                      </div>

                      <div className="flex justify-between pt-4">
                        <Button type="button" variant="outline" onClick={handleBack}>
                          <ArrowLeft className="h-4 w-4 mr-1" /> Retour
                        </Button>
                        <Button type="submit" disabled={isLoading}>
                          {isLoading ? (
                            <>
                              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                              Création en cours...
                            </>
                          ) : (
                            <>
                              <Shield className="h-4 w-4 mr-2" />
                              Créer mon compte pro
                            </>
                          )}
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                )}
              </form>

              <p className="text-xs text-center text-muted-foreground mt-6">
                En créant un compte, vous acceptez nos{" "}
                <a href="/cgv" className="underline hover:text-foreground">CGV</a>{" "}
                et notre{" "}
                <a href="/politique-confidentialite" className="underline hover:text-foreground">politique de confidentialité</a>.
              </p>
            </div>
          </section>
        </main>

        <Footer />
      </div>
    </>
  );
};

export default InscriptionPro;
