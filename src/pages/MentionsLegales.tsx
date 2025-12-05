import Header from "@/components/layout/Header";
import Footer from "@/components/layout/Footer";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { Scale, Building2, Mail, Phone } from "lucide-react";

export default function MentionsLegales() {
  return (
    <div className="min-h-screen bg-background">
      <Header />
      
      <main className="container mx-auto px-4 py-8">
        <div className="max-w-4xl mx-auto">
          {/* Page Header */}
          <div className="mb-8">
            <h1 className="text-4xl font-bold text-primary mb-4 flex items-center gap-2">
              <Scale className="h-8 w-8" />
              Mentions Légales
            </h1>
            <p className="text-lg text-muted-foreground">
              Informations légales obligatoires concernant Papeterie Reine & Fils
            </p>
          </div>

          <div className="space-y-8">
            {/* Éditeur du site */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Building2 className="h-5 w-5" />
                  Éditeur du site
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <h3 className="font-semibold mb-2">Raison sociale</h3>
                  <p>Papeterie Reine & Fils</p>
                  <p>Société par Actions Simplifiée (SAS)</p>
                </div>
                
                <Separator />
                
                <div>
                  <h3 className="font-semibold mb-2">Siège social</h3>
                  <p>10 rue Toupot de Beveaux</p>
                  <p>52000 Chaumont, France</p>
                </div>
                
                <Separator />
                
                <div className="grid md:grid-cols-2 gap-4">
                  <div>
                    <h3 className="font-semibold mb-2">SIRET</h3>
                    <p>123 456 789 00012</p>
                  </div>
                  <div>
                    <h3 className="font-semibold mb-2">N° TVA</h3>
                    <p>FR12 123456789</p>
                  </div>
                </div>
                
                <Separator />
                
                <div>
                  <h3 className="font-semibold mb-2">Capital social</h3>
                  <p>50 000 € entièrement libéré</p>
                </div>
                
                <Separator />
                
                <div>
                  <h3 className="font-semibold mb-2">Directeur de publication</h3>
                  <p>M. Jean Reine, Président</p>
                </div>
              </CardContent>
            </Card>

            {/* Contact */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Mail className="h-5 w-5" />
                  Contact
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid md:grid-cols-2 gap-4">
                  <div className="flex items-center gap-2">
                    <Phone className="h-4 w-4 text-secondary" />
                    <span>07 45 062 162</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Mail className="h-4 w-4 text-secondary" />
                    <span>contact@ma-papeterie.fr</span>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Hébergement */}
            <Card>
              <CardHeader>
                <CardTitle>Hébergement</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="mb-2">Ce site est hébergé par :</p>
                <p className="font-semibold">Lovable</p>
                <p>États-Unis</p>
              </CardContent>
            </Card>

            {/* Propriété intellectuelle */}
            <Card>
              <CardHeader>
                <CardTitle>Propriété intellectuelle</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <p>
                  Le contenu de ce site web (textes, images, graphismes, logo, icônes, sons, logiciels) 
                  est la propriété exclusive de Papeterie Reine & Fils, à l'exception des marques, 
                  logos ou contenus appartenant à d'autres sociétés partenaires ou auteurs.
                </p>
                
                <p>
                  Toute reproduction, représentation, modification, publication, adaptation de tout ou 
                  partie des éléments du site, quel que soit le moyen ou le procédé utilisé, est 
                  interdite, sauf autorisation écrite préalable de Papeterie Reine & Fils.
                </p>
              </CardContent>
            </Card>

            {/* Données personnelles */}
            <Card>
              <CardHeader>
                <CardTitle>Protection des données personnelles</CardTitle>
              </CardHeader>
              <CardContent>
                <p>
                  Les informations recueillies sur ce site sont enregistrées dans un fichier informatisé 
                  par Papeterie Reine & Fils pour la gestion des commandes et la relation client.
                </p>
                
                <p className="mt-4">
                  Conformément au Règlement Général sur la Protection des Données (RGPD), vous pouvez 
                  exercer votre droit d'accès aux données vous concernant et les faire rectifier en 
                  contactant : contact@ma-papeterie.fr
                </p>
              </CardContent>
            </Card>

            {/* Cookies */}
            <Card>
              <CardHeader>
                <CardTitle>Cookies</CardTitle>
              </CardHeader>
              <CardContent>
                <p>
                  Ce site utilise des cookies pour améliorer l'expérience utilisateur et réaliser des 
                  statistiques de visites. En poursuivant votre navigation sur ce site, vous acceptez 
                  l'utilisation de cookies.
                </p>
                
                <p className="mt-4">
                  Vous pouvez configurer votre navigateur pour refuser les cookies, mais certaines 
                  fonctionnalités du site pourraient ne plus être disponibles.
                </p>
              </CardContent>
            </Card>

            {/* Droit applicable */}
            <Card>
              <CardHeader>
                <CardTitle>Droit applicable</CardTitle>
              </CardHeader>
              <CardContent>
                <p>
                  Les présentes mentions légales sont soumises au droit français. Tout litige relatif 
                  à l'utilisation de ce site sera de la compétence exclusive des tribunaux de Chaumont.
                </p>
              </CardContent>
            </Card>
          </div>
        </div>
      </main>

      <Footer />
    </div>
  );
}