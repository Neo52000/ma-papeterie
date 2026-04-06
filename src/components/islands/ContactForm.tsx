/**
 * Island component for the contact form.
 * Uses react-hook-form + HoneypotField — requires client-side JS.
 */
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { MessageCircle } from "lucide-react";
import { HoneypotField } from "@/components/HoneypotField";

export default function ContactForm() {
  return (
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
      <CardContent className="space-y-4">
        <HoneypotField />
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="text-sm font-medium mb-2 block">Prenom *</label>
            <Input placeholder="Votre prénom" />
          </div>
          <div>
            <label className="text-sm font-medium mb-2 block">Nom *</label>
            <Input placeholder="Votre nom" />
          </div>
        </div>

        <div>
          <label className="text-sm font-medium mb-2 block">Email *</label>
          <Input type="email" placeholder="votre@email.com" />
        </div>

        <div>
          <label className="text-sm font-medium mb-2 block">Telephone</label>
          <Input type="tel" placeholder="01 23 45 67 89" />
        </div>

        <div>
          <label className="text-sm font-medium mb-2 block">Type de demande</label>
          <select className="w-full p-2 border border-input rounded-md bg-background">
            <option>Particulier - Question produit</option>
            <option>Particulier - Commande</option>
            <option>Professionnel - Devis</option>
            <option>Professionnel - Compte B2B</option>
            <option>SAV - Retour/Echange</option>
            <option>Autre</option>
          </select>
        </div>

        <div>
          <label className="text-sm font-medium mb-2 block">Votre message *</label>
          <Textarea
            placeholder="Decrivez votre demande en detail..."
            className="min-h-[120px]"
          />
        </div>

        <Button className="w-full" variant="cta" size="lg">
          Envoyer le message
        </Button>
      </CardContent>
    </Card>
  );
}
