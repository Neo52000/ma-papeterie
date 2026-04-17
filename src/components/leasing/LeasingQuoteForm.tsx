import { useState } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";
import { Loader2, ArrowRight, ArrowLeft, Check, Send } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { supabase } from "@/integrations/supabase/client";
import { calculateLeasing } from "@/hooks/useLeasingCalculator";
import { LEASING_DURATIONS, LEASING_DISCLAIMER, PROFILE_TYPES } from "@/lib/leasingConstants";

const leasingQuoteSchema = z.object({
  // Step 1 — Project
  total_amount_ht: z.number({ required_error: "Montant requis" }).min(400, "Montant minimum : 400 € HT"),
  desired_duration: z.number({ required_error: "Durée requise" }),
  notes: z.string().optional(),
  // Step 2 — Contact
  first_name: z.string().min(2, "Prénom requis"),
  last_name: z.string().min(2, "Nom requis"),
  email: z.string().email("Email invalide"),
  phone: z.string().optional(),
  company_name: z.string().min(2, "Raison sociale requise"),
  siret: z
    .string()
    .regex(/^\d{14}$/, "Le SIRET doit contenir 14 chiffres")
    .optional()
    .or(z.literal("")),
  profile_type: z.enum(["tpe", "liberal", "cowork", "association", "autre"], {
    required_error: "Type de profil requis",
  }),
});

type LeasingQuoteFormData = z.infer<typeof leasingQuoteSchema>;

interface LeasingProduct {
  product_id: string;
  name: string;
  quantity: number;
  price_ht: number;
}

interface LeasingQuoteFormProps {
  prefillProducts?: LeasingProduct[];
  prefillAmountHT?: number;
  className?: string;
}

export function LeasingQuoteForm({
  prefillProducts = [],
  prefillAmountHT,
  className = "",
}: LeasingQuoteFormProps) {
  const [step, setStep] = useState(1);
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  const form = useForm<LeasingQuoteFormData>({
    resolver: zodResolver(leasingQuoteSchema),
    defaultValues: {
      total_amount_ht: prefillAmountHT ?? 0,
      desired_duration: 36,
      notes: "",
      first_name: "",
      last_name: "",
      email: "",
      phone: "",
      company_name: "",
      siret: "",
      profile_type: undefined,
    },
  });

  const watchAmount = form.watch("total_amount_ht");
  const watchDuration = form.watch("desired_duration");
  const estimate = calculateLeasing(watchAmount || 0, watchDuration || 36);

  const validateStep1 = async () => {
    const valid = await form.trigger(["total_amount_ht", "desired_duration"]);
    if (valid) setStep(2);
  };

  const validateStep2 = async () => {
    const valid = await form.trigger([
      "first_name",
      "last_name",
      "email",
      "company_name",
      "profile_type",
    ]);
    if (valid) setStep(3);
  };

  const onSubmit = async (data: LeasingQuoteFormData) => {
    setSubmitting(true);
    try {
      const { monthlyHT } = calculateLeasing(data.total_amount_ht, data.desired_duration);

      const { error } = await (supabase as any).from("leasing_quotes").insert({
        first_name: data.first_name,
        last_name: data.last_name,
        email: data.email,
        phone: data.phone || null,
        company_name: data.company_name,
        siret: data.siret || null,
        profile_type: data.profile_type,
        total_amount_ht: data.total_amount_ht,
        desired_duration: data.desired_duration,
        products: prefillProducts.length > 0 ? prefillProducts : [],
        notes: data.notes || null,
        monthly_estimate: monthlyHT,
      });

      if (error) throw error;

      // Send confirmation email via edge function (fire-and-forget)
      supabase.functions.invoke("leasing-confirmation", {
        body: {
          first_name: data.first_name,
          last_name: data.last_name,
          email: data.email,
          company_name: data.company_name,
          total_amount_ht: data.total_amount_ht,
          desired_duration: data.desired_duration,
          monthly_estimate_ht: monthlyHT,
          products: prefillProducts,
        },
      }).catch((err) => { if (import.meta.env.DEV) console.error("Email notification failed:", err); });

      setSubmitted(true);
      toast.success("Votre demande a bien été envoyée !");
    } catch (err) {
      if (import.meta.env.DEV) console.error("Leasing quote submission failed:", err);
      toast.error("Erreur lors de l'envoi. Veuillez réessayer.");
    } finally {
      setSubmitting(false);
    }
  };

  if (submitted) {
    return (
      <Card className={className}>
        <CardContent className="py-12 text-center">
          <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <Check className="h-8 w-8 text-green-600" />
          </div>
          <h3 className="text-xl font-bold mb-2">Demande envoyée</h3>
          <p className="text-muted-foreground max-w-md mx-auto">
            Nous avons bien reçu votre demande de devis leasing. Notre équipe vous contacte sous 24h ouvrées.
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className={className}>
      <CardContent className="pt-6">
        {/* Step indicator */}
        <div className="flex items-center justify-center gap-2 mb-8">
          {[1, 2, 3].map((s) => (
            <div key={s} className="flex items-center gap-2">
              <div
                className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium transition-colors ${
                  s === step
                    ? "bg-primary text-primary-foreground"
                    : s < step
                    ? "bg-primary/20 text-primary"
                    : "bg-muted text-muted-foreground"
                }`}
              >
                {s < step ? <Check className="h-4 w-4" /> : s}
              </div>
              {s < 3 && (
                <div className={`w-12 h-0.5 ${s < step ? "bg-primary/40" : "bg-muted"}`} />
              )}
            </div>
          ))}
        </div>

        <form onSubmit={form.handleSubmit(onSubmit)}>
          {/* Step 1 — Project */}
          {step === 1 && (
            <div className="space-y-6">
              <div>
                <h3 className="text-lg font-semibold mb-1">Votre projet</h3>
                <p className="text-sm text-muted-foreground">Définissez le budget et la durée souhaitée</p>
              </div>

              {prefillProducts.length > 0 && (
                <div className="bg-muted/50 rounded-lg p-4 space-y-2">
                  <p className="text-sm font-medium">Produits sélectionnés :</p>
                  {prefillProducts.map((p) => (
                    <div key={p.product_id} className="flex justify-between text-sm text-muted-foreground">
                      <span>{p.name} (x{p.quantity})</span>
                      <span>{(p.price_ht * p.quantity).toFixed(2)} € HT</span>
                    </div>
                  ))}
                </div>
              )}

              <div className="space-y-2">
                <Label htmlFor="total_amount_ht">Budget total HT (€)</Label>
                <Input
                  id="total_amount_ht"
                  type="number"
                  min={400}
                  step={0.01}
                  placeholder="Ex : 2500"
                  aria-invalid={!!form.formState.errors.total_amount_ht || undefined}
                  aria-describedby={form.formState.errors.total_amount_ht ? "err-total_amount_ht" : undefined}
                  {...form.register("total_amount_ht", { valueAsNumber: true })}
                />
                {form.formState.errors.total_amount_ht && (
                  <p id="err-total_amount_ht" role="alert" className="text-xs text-destructive">
                    {form.formState.errors.total_amount_ht.message}
                  </p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="desired_duration">Durée souhaitée</Label>
                <Select
                  value={String(watchDuration)}
                  onValueChange={(v) => form.setValue("desired_duration", Number(v))}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Choisir une durée" />
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

              {estimate.isEligible && watchAmount >= 400 && (
                <div className="bg-primary/5 border border-primary/10 rounded-lg p-4">
                  <p className="text-sm text-muted-foreground mb-1">Mensualité estimée :</p>
                  <p className="text-2xl font-bold text-primary">
                    ≈ {estimate.monthlyHT.toFixed(2)} € HT/mois
                  </p>
                  <p className="text-sm text-muted-foreground">
                    soit ≈ {estimate.monthlyTTC.toFixed(2)} € TTC/mois
                  </p>
                  <p className="text-[10px] text-muted-foreground mt-2">{LEASING_DISCLAIMER}</p>
                </div>
              )}

              <div className="space-y-2">
                <Label htmlFor="notes">Besoins complémentaires (optionnel)</Label>
                <Textarea
                  id="notes"
                  placeholder="Décrivez vos besoins en mobilier, aménagement..."
                  rows={3}
                  {...form.register("notes")}
                />
              </div>

              <Button type="button" className="w-full" onClick={validateStep1}>
                Continuer <ArrowRight className="h-4 w-4 ml-2" />
              </Button>
            </div>
          )}

          {/* Step 2 — Contact */}
          {step === 2 && (
            <div className="space-y-6">
              <div>
                <h3 className="text-lg font-semibold mb-1">Vos coordonnées</h3>
                <p className="text-sm text-muted-foreground">Pour que nous puissions vous recontacter</p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="first_name">Prénom *</Label>
                  <Input
                    id="first_name"
                    aria-invalid={!!form.formState.errors.first_name || undefined}
                    aria-describedby={form.formState.errors.first_name ? "err-first_name" : undefined}
                    {...form.register("first_name")}
                  />
                  {form.formState.errors.first_name && (
                    <p id="err-first_name" role="alert" className="text-xs text-destructive">
                      {form.formState.errors.first_name.message}
                    </p>
                  )}
                </div>
                <div className="space-y-2">
                  <Label htmlFor="last_name">Nom *</Label>
                  <Input
                    id="last_name"
                    aria-invalid={!!form.formState.errors.last_name || undefined}
                    aria-describedby={form.formState.errors.last_name ? "err-last_name" : undefined}
                    {...form.register("last_name")}
                  />
                  {form.formState.errors.last_name && (
                    <p id="err-last_name" role="alert" className="text-xs text-destructive">
                      {form.formState.errors.last_name.message}
                    </p>
                  )}
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="email">Email professionnel *</Label>
                  <Input
                    id="email"
                    type="email"
                    autoComplete="email"
                    aria-invalid={!!form.formState.errors.email || undefined}
                    aria-describedby={form.formState.errors.email ? "err-email" : undefined}
                    {...form.register("email")}
                  />
                  {form.formState.errors.email && (
                    <p id="err-email" role="alert" className="text-xs text-destructive">
                      {form.formState.errors.email.message}
                    </p>
                  )}
                </div>
                <div className="space-y-2">
                  <Label htmlFor="phone">Téléphone</Label>
                  <Input id="phone" type="tel" autoComplete="tel" {...form.register("phone")} />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="company_name">Raison sociale *</Label>
                <Input
                  id="company_name"
                  aria-invalid={!!form.formState.errors.company_name || undefined}
                  aria-describedby={form.formState.errors.company_name ? "err-company_name" : undefined}
                  {...form.register("company_name")}
                />
                {form.formState.errors.company_name && (
                  <p id="err-company_name" role="alert" className="text-xs text-destructive">
                    {form.formState.errors.company_name.message}
                  </p>
                )}
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="siret">SIRET (optionnel)</Label>
                  <Input
                    id="siret"
                    placeholder="14 chiffres"
                    maxLength={14}
                    aria-invalid={!!form.formState.errors.siret || undefined}
                    aria-describedby={form.formState.errors.siret ? "err-siret" : undefined}
                    {...form.register("siret")}
                  />
                  {form.formState.errors.siret && (
                    <p id="err-siret" role="alert" className="text-xs text-destructive">
                      {form.formState.errors.siret.message}
                    </p>
                  )}
                </div>
                <div className="space-y-2">
                  <Label htmlFor="profile_type">Type de structure *</Label>
                  <Select
                    value={form.watch("profile_type") ?? ""}
                    onValueChange={(v) =>
                      form.setValue("profile_type", v as LeasingQuoteFormData["profile_type"], {
                        shouldValidate: true,
                      })
                    }
                  >
                    <SelectTrigger
                      id="profile_type"
                      aria-invalid={!!form.formState.errors.profile_type || undefined}
                      aria-describedby={form.formState.errors.profile_type ? "err-profile_type" : undefined}
                    >
                      <SelectValue placeholder="Choisir" />
                    </SelectTrigger>
                    <SelectContent>
                      {PROFILE_TYPES.map((pt) => (
                        <SelectItem key={pt.value} value={pt.value}>
                          {pt.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  {form.formState.errors.profile_type && (
                    <p id="err-profile_type" role="alert" className="text-xs text-destructive">
                      {form.formState.errors.profile_type.message}
                    </p>
                  )}
                </div>
              </div>

              <div className="flex gap-3">
                <Button type="button" variant="outline" onClick={() => setStep(1)}>
                  <ArrowLeft className="h-4 w-4 mr-2" /> Retour
                </Button>
                <Button type="button" className="flex-1" onClick={validateStep2}>
                  Continuer <ArrowRight className="h-4 w-4 ml-2" />
                </Button>
              </div>
            </div>
          )}

          {/* Step 3 — Confirmation */}
          {step === 3 && (
            <div className="space-y-6">
              <div>
                <h3 className="text-lg font-semibold mb-1">Récapitulatif</h3>
                <p className="text-sm text-muted-foreground">Vérifiez vos informations avant envoi</p>
              </div>

              <div className="bg-muted/50 rounded-lg p-4 space-y-3 text-sm">
                <div>
                  <p className="font-medium">Projet</p>
                  <p className="text-muted-foreground">
                    Budget : {watchAmount?.toFixed(2)} € HT · Durée : {watchDuration} mois
                  </p>
                  {estimate.isEligible && (
                    <p className="text-primary font-semibold">
                      Mensualité estimée : ≈ {estimate.monthlyHT.toFixed(2)} € HT/mois
                      ({estimate.monthlyTTC.toFixed(2)} € TTC)
                    </p>
                  )}
                </div>

                <Separator />

                <div>
                  <p className="font-medium">Contact</p>
                  <p className="text-muted-foreground">
                    {form.getValues("first_name")} {form.getValues("last_name")}
                  </p>
                  <p className="text-muted-foreground">{form.getValues("email")}</p>
                  {form.getValues("phone") && (
                    <p className="text-muted-foreground">{form.getValues("phone")}</p>
                  )}
                </div>

                <Separator />

                <div>
                  <p className="font-medium">Entreprise</p>
                  <p className="text-muted-foreground">{form.getValues("company_name")}</p>
                  {form.getValues("siret") && (
                    <p className="text-muted-foreground">SIRET : {form.getValues("siret")}</p>
                  )}
                  <p className="text-muted-foreground">
                    {PROFILE_TYPES.find((pt) => pt.value === form.getValues("profile_type"))?.label}
                  </p>
                </div>
              </div>

              <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 text-xs text-amber-800">
                {LEASING_DISCLAIMER}
              </div>

              <div className="flex gap-3">
                <Button type="button" variant="outline" onClick={() => setStep(2)}>
                  <ArrowLeft className="h-4 w-4 mr-2" /> Retour
                </Button>
                <Button type="submit" className="flex-1" disabled={submitting}>
                  {submitting ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" /> Envoi en cours...
                    </>
                  ) : (
                    <>
                      <Send className="h-4 w-4 mr-2" /> Envoyer ma demande
                    </>
                  )}
                </Button>
              </div>
            </div>
          )}
        </form>
      </CardContent>
    </Card>
  );
}
