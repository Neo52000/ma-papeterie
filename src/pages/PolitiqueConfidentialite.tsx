import Header from "@/components/layout/Header";
import Footer from "@/components/layout/Footer";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Shield, User, Clock, Mail, FileText, Globe } from "lucide-react";

export default function PolitiqueConfidentialite() {
  return (
    <div className="min-h-screen bg-background">
      <Header />
      
      <main className="container mx-auto px-4 py-12">
        <div className="max-w-4xl mx-auto">
          <div className="text-center mb-12">
            <Shield className="h-16 w-16 text-primary mx-auto mb-4" />
            <h1 className="text-4xl font-bold text-primary mb-4">Politique de Confidentialité</h1>
            <p className="text-muted-foreground">
              Dernière mise à jour : {new Date().toLocaleDateString('fr-FR')}
            </p>
          </div>

          <div className="space-y-8">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <User className="h-5 w-5" />
                  1. Responsable du traitement
                </CardTitle>
              </CardHeader>
              <CardContent className="prose prose-sm max-w-none text-muted-foreground">
                <p>
                  <strong>Ma Papeterie - Reine & Fils</strong><br />
                  123 Rue de la Papeterie<br />
                  75001 Paris, France<br />
                  Email : contact@ma-papeterie.fr<br />
                  Téléphone : 01 23 45 67 89
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <FileText className="h-5 w-5" />
                  2. Données collectées
                </CardTitle>
              </CardHeader>
              <CardContent className="prose prose-sm max-w-none text-muted-foreground">
                <p>Nous collectons les données suivantes :</p>
                <ul>
                  <li><strong>Données d'identification :</strong> nom, prénom, email, téléphone</li>
                  <li><strong>Données de livraison :</strong> adresse postale</li>
                  <li><strong>Données de commande :</strong> historique d'achats, préférences</li>
                  <li><strong>Données de navigation :</strong> cookies, pages visitées</li>
                  <li><strong>Données de paiement :</strong> traitées par nos prestataires sécurisés (non stockées)</li>
                </ul>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Globe className="h-5 w-5" />
                  3. Finalités du traitement
                </CardTitle>
              </CardHeader>
              <CardContent className="prose prose-sm max-w-none text-muted-foreground">
                <ul>
                  <li>Gestion de votre compte client et authentification</li>
                  <li>Traitement et suivi de vos commandes</li>
                  <li>Service client et assistance</li>
                  <li>Envoi de communications marketing (avec votre consentement)</li>
                  <li>Amélioration de nos services et personnalisation</li>
                  <li>Respect de nos obligations légales</li>
                </ul>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Clock className="h-5 w-5" />
                  4. Durée de conservation
                </CardTitle>
              </CardHeader>
              <CardContent className="prose prose-sm max-w-none text-muted-foreground">
                <ul>
                  <li><strong>Données de compte :</strong> durée de la relation commerciale + 3 ans</li>
                  <li><strong>Données de commande :</strong> 10 ans (obligations comptables)</li>
                  <li><strong>Données de navigation :</strong> 13 mois maximum</li>
                  <li><strong>Consentements :</strong> 3 ans à compter du dernier consentement</li>
                </ul>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Shield className="h-5 w-5" />
                  5. Vos droits
                </CardTitle>
              </CardHeader>
              <CardContent className="prose prose-sm max-w-none text-muted-foreground">
                <p>Conformément au RGPD, vous disposez des droits suivants :</p>
                <ul>
                  <li><strong>Droit d'accès :</strong> obtenir une copie de vos données</li>
                  <li><strong>Droit de rectification :</strong> corriger des données inexactes</li>
                  <li><strong>Droit à l'effacement :</strong> demander la suppression de vos données</li>
                  <li><strong>Droit à la portabilité :</strong> recevoir vos données dans un format structuré</li>
                  <li><strong>Droit d'opposition :</strong> vous opposer au traitement</li>
                  <li><strong>Droit de retirer votre consentement</strong></li>
                </ul>
                <p className="mt-4">
                  Pour exercer ces droits, rendez-vous dans votre espace "Mon Compte" &gt; "Vie Privée" 
                  ou contactez-nous à : <strong>rgpd@ma-papeterie.fr</strong>
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Mail className="h-5 w-5" />
                  6. Contact DPO
                </CardTitle>
              </CardHeader>
              <CardContent className="prose prose-sm max-w-none text-muted-foreground">
                <p>
                  Pour toute question relative à la protection de vos données personnelles, 
                  vous pouvez contacter notre Délégué à la Protection des Données :
                </p>
                <p className="mt-2">
                  <strong>Email :</strong> dpo@ma-papeterie.fr<br />
                  <strong>Adresse :</strong> Ma Papeterie - DPO, 123 Rue de la Papeterie, 75001 Paris
                </p>
                <p className="mt-4">
                  Vous pouvez également introduire une réclamation auprès de la CNIL : 
                  <a href="https://www.cnil.fr" target="_blank" rel="noopener" className="text-primary hover:underline ml-1">
                    www.cnil.fr
                  </a>
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