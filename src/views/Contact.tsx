import { useState } from "react";
import { Helmet } from "react-helmet-async";
import Header from "@/components/layout/Header";
import Footer from "@/components/layout/Footer";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ContactSeoContent } from "@/components/sections/SeoContent";
import GoogleMapEmbed from "@/components/contact/GoogleMapEmbed";
import { MapPin, Phone, Mail, Clock, MessageCircle, Loader2 } from "lucide-react";
import { HoneypotField } from "@/components/HoneypotField";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
const contactSchema = {
  "@context": "https://schema.org",
  "@type": "ContactPage",
  "name": "Contact — Ma Papeterie Chaumont",
  "description": "Contactez Ma Papeterie à Chaumont : formulaire, téléphone, adresse. Papeterie Reine & Fils, 10 rue Toupot de Beveaux, 52000 Chaumont.",
  "url": "https://ma-papeterie.fr/contact",
  "mainEntity": {
    "@type": "LocalBusiness",
    "name": "Papeterie Reine & Fils",
    "telephone": "+33310960224",
    "email": "contact@ma-papeterie.fr",
    "address": {
      "@type": "PostalAddress",
      "streetAddress": "10 rue Toupot de Beveaux",
      "addressLocality": "Chaumont",
      "postalCode": "52000",
      "addressCountry": "FR"
    },
    "openingHoursSpecification": [
      { "@type": "OpeningHoursSpecification", "dayOfWeek": ["Monday","Tuesday","Wednesday","Thursday","Friday"], "opens": "09:00", "closes": "19:00" },
      { "@type": "OpeningHoursSpecification", "dayOfWeek": "Saturday", "opens": "09:00", "closes": "18:00" }
    ],
    "contactPoint": [{
      "@type": "ContactPoint",
      "contactType": "customer service",
      "telephone": "+33310960224",
      "email": "contact@ma-papeterie.fr",
      "availableLanguage": ["French"]
    }]
  }
};

const B2B_TYPES = ["Professionnel - Devis", "Professionnel - Compte B2B"];

export default function Contact() {
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [requestType, setRequestType] = useState("Particulier - Question produit");
  const [message, setMessage] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();

    // Honeypot check
    const form = e.currentTarget;
    const honeypot = form.querySelector<HTMLInputElement>('[name="website"]');
    if (honeypot && honeypot.value) return;

    if (!firstName.trim() || !lastName.trim() || !email.trim() || !message.trim()) {
      toast.error("Veuillez remplir tous les champs obligatoires.");
      return;
    }

    setSubmitting(true);
    try {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const client = supabase as any;
      const contactName = `${firstName.trim()} ${lastName.trim()}`;
      const isB2B = B2B_TYPES.includes(requestType);

      // 1. Log interaction
      await client.from("customer_interactions").insert({
        interaction_type: "contact_form",
        channel: "web",
        subject: `[${requestType}] ${contactName}`,
        notes: message.trim(),
        description: `Formulaire contact — ${requestType}`,
        metadata: {
          first_name: firstName.trim(),
          last_name: lastName.trim(),
          email: email.trim(),
          phone: phone.trim() || null,
          request_type: requestType,
        },
      });

      // 2. If B2B request, create pipeline lead + task
      if (isB2B) {
        const { data: deal } = await client.from("crm_pipeline").insert({
          company_name: `${contactName} (à qualifier)`,
          contact_name: contactName,
          contact_email: email.trim(),
          contact_phone: phone.trim() || null,
          stage: "lead",
          source: "website",
          notes: `${requestType}: ${message.trim()}`,
        }).select("id").single();

        if (deal?.id) {
          await client.from("crm_tasks").insert({
            pipeline_id: deal.id,
            type: "call",
            title: `Rappeler ${contactName} — ${requestType}`,
            description: message.trim(),
            due_date: new Date().toISOString().slice(0, 10),
            priority: "high",
          });
        }
      }

      toast.success("Message envoyé ! Nous vous répondrons dans les plus brefs délais.");
      setSubmitted(true);
    } catch {
      toast.error("Erreur lors de l'envoi. Veuillez réessayer.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <Helmet>
        <title>Contact — Ma Papeterie Chaumont</title>
        <meta name="description" content="Contactez Ma Papeterie à Chaumont (52000) : formulaire, téléphone 03 10 96 02 24, adresse 10 rue Toupot de Beveaux. Conseil expert en fournitures." />
        <link rel="canonical" href="https://ma-papeterie.fr/contact" />
        <meta property="og:title" content="Contact — Ma Papeterie Chaumont" />
        <meta property="og:description" content="Contactez Ma Papeterie à Chaumont (52000) : formulaire, téléphone, adresse. Conseil expert en fournitures." />
        <meta property="og:type" content="website" />
        <meta property="og:url" content="https://ma-papeterie.fr/contact" />
        <meta property="og:image" content="https://ma-papeterie.fr/og-image.png" />
        <script type="application/ld+json">{JSON.stringify(contactSchema)}</script>
      </Helmet>
      <Header />

      <main className="container mx-auto px-4 py-8">
        {/* Page Header */}
        <div className="mb-8 text-center">
          <h1 className="text-4xl font-bold text-primary mb-4">Contactez-nous</h1>
          <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
            Notre équipe est à votre disposition pour répondre à toutes vos questions
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-12">
          {/* Contact Form */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <MessageCircle className="h-5 w-5 text-primary" />
                Envoyez-nous un message
              </CardTitle>
              <CardDescription>
                Remplissez ce formulaire et nous vous répondrons dans les plus brefs délais
              </CardDescription>
            </CardHeader>
            <CardContent>
              {submitted ? (
                <div className="text-center py-8 space-y-3">
                  <div className="h-12 w-12 bg-green-100 rounded-full flex items-center justify-center mx-auto">
                    <MessageCircle className="h-6 w-6 text-green-600" />
                  </div>
                  <h3 className="text-lg font-semibold">Message envoyé !</h3>
                  <p className="text-muted-foreground">
                    Nous vous répondrons dans les plus brefs délais.
                  </p>
                  <Button variant="outline" onClick={() => { setSubmitted(false); setFirstName(""); setLastName(""); setEmail(""); setPhone(""); setMessage(""); setRequestType("Particulier - Question produit"); }}>
                    Envoyer un autre message
                  </Button>
                </div>
              ) : (
                <form onSubmit={handleSubmit} className="space-y-4">
                  <HoneypotField />
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="text-sm font-medium mb-2 block">Prénom *</label>
                      <Input placeholder="Votre prénom" value={firstName} onChange={(e) => setFirstName(e.target.value)} required />
                    </div>
                    <div>
                      <label className="text-sm font-medium mb-2 block">Nom *</label>
                      <Input placeholder="Votre nom" value={lastName} onChange={(e) => setLastName(e.target.value)} required />
                    </div>
                  </div>

                  <div>
                    <label className="text-sm font-medium mb-2 block">Email *</label>
                    <Input type="email" placeholder="votre@email.com" value={email} onChange={(e) => setEmail(e.target.value)} required />
                  </div>

                  <div>
                    <label className="text-sm font-medium mb-2 block">Téléphone</label>
                    <Input type="tel" placeholder="01 23 45 67 89" value={phone} onChange={(e) => setPhone(e.target.value)} />
                  </div>

                  <div>
                    <label className="text-sm font-medium mb-2 block">Type de demande</label>
                    <select
                      className="w-full p-2 border border-input rounded-md bg-background"
                      value={requestType}
                      onChange={(e) => setRequestType(e.target.value)}
                    >
                      <option>Particulier - Question produit</option>
                      <option>Particulier - Commande</option>
                      <option>Professionnel - Devis</option>
                      <option>Professionnel - Compte B2B</option>
                      <option>SAV - Retour/Échange</option>
                      <option>Autre</option>
                    </select>
                  </div>

                  <div>
                    <label className="text-sm font-medium mb-2 block">Votre message *</label>
                    <Textarea
                      placeholder="Décrivez votre demande en détail..."
                      className="min-h-[120px]"
                      value={message}
                      onChange={(e) => setMessage(e.target.value)}
                      required
                    />
                  </div>

                  <Button className="w-full" variant="cta" size="lg" type="submit" disabled={submitting}>
                    {submitting ? (
                      <><Loader2 className="h-4 w-4 mr-2 animate-spin" />Envoi en cours...</>
                    ) : (
                      "Envoyer le message"
                    )}
                  </Button>
                </form>
              )}
            </CardContent>
          </Card>

          {/* Contact Info */}
          <div className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <MapPin className="h-5 w-5 text-primary" />
                  Notre Magasin
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  <div>
                    <h4 className="font-semibold">Papeterie Reine & Fils</h4>
                    <p className="text-muted-foreground">
                      10 rue Toupot de Beveaux<br />
                      52000 Chaumont, France
                    </p>
                  </div>
                  
                  <div className="flex items-center gap-3">
                    <Phone className="h-4 w-4 text-primary" />
                    <span>03 10 96 02 24</span>
                  </div>
                  
                  <div className="flex items-center gap-3">
                    <Mail className="h-4 w-4 text-primary" />
                    <span>contact@ma-papeterie.fr</span>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Clock className="h-5 w-5 text-primary" />
                  Horaires d'ouverture
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                <div className="flex justify-between">
                  <span>Lundi - Vendredi</span>
                  <span className="font-medium">9h00 - 19h00</span>
                </div>
                <div className="flex justify-between">
                  <span>Samedi</span>
                  <span className="font-medium">9h00 - 18h00</span>
                </div>
                <div className="flex justify-between">
                  <span>Dimanche</span>
                  <span className="text-muted-foreground">Fermé</span>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Services Clients</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex items-center justify-between">
                  <span>Support Email</span>
                  <Badge variant="secondary">24h/48h</Badge>
                </div>
                <div className="flex items-center justify-between">
                  <span>Support Téléphone</span>
                  <Badge variant="secondary">9h-18h</Badge>
                </div>
                <div className="flex items-center justify-between">
                  <span>Chat en ligne</span>
                  <Badge className="bg-eco-green text-white">En ligne</Badge>
                </div>
                <div className="flex items-center justify-between">
                  <span>WhatsApp Business</span>
                  <Badge className="bg-eco-green text-white">Actif</Badge>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>

        {/* Google Maps */}
        <div className="mt-12">
          <GoogleMapEmbed />
        </div>
        
        <ContactSeoContent />
      </main>

      <Footer />
    </div>
  );
}