import Header from "@/components/layout/Header";
import Footer from "@/components/layout/Footer";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ContactSeoContent } from "@/components/sections/SeoContent";
import GoogleMapEmbed from "@/components/contact/GoogleMapEmbed";
import { MapPin, Phone, Mail, Clock, MessageCircle } from "lucide-react";
export default function Contact() {
  return (
    <div className="min-h-screen bg-background">
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
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium mb-2 block">Prénom *</label>
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
                <label className="text-sm font-medium mb-2 block">Téléphone</label>
                <Input type="tel" placeholder="01 23 45 67 89" />
              </div>

              <div>
                <label className="text-sm font-medium mb-2 block">Type de demande</label>
                <select className="w-full p-2 border border-input rounded-md bg-background">
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
                />
              </div>

              <Button className="w-full" variant="cta" size="lg">
                Envoyer le message
              </Button>
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
                    <span>07 45 062 162</span>
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
                  <span className="font-medium">9h00 - 18h30</span>
                </div>
                <div className="flex justify-between">
                  <span>Samedi</span>
                  <span className="font-medium">9h00 - 17h00</span>
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