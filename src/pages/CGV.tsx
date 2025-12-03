import Header from "@/components/layout/Header";
import Footer from "@/components/layout/Footer";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { FileText, Truck, CreditCard, RotateCcw, Scale, Shield } from "lucide-react";

export default function CGV() {
  return (
    <div className="min-h-screen bg-background">
      <Header />
      
      <main className="container mx-auto px-4 py-12">
        <div className="max-w-4xl mx-auto">
          <div className="text-center mb-12">
            <FileText className="h-16 w-16 text-primary mx-auto mb-4" />
            <h1 className="text-4xl font-bold text-primary mb-4">Conditions Générales de Vente</h1>
            <p className="text-muted-foreground">
              Dernière mise à jour : {new Date().toLocaleDateString('fr-FR')}
            </p>
          </div>

          <div className="space-y-8">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <FileText className="h-5 w-5" />
                  Article 1 - Objet
                </CardTitle>
              </CardHeader>
              <CardContent className="prose prose-sm max-w-none text-muted-foreground">
                <p>
                  Les présentes conditions générales de vente régissent les relations contractuelles 
                  entre Ma Papeterie - Reine & Fils (ci-après "le Vendeur") et toute personne 
                  effectuant un achat via le site ma-papeterie.fr (ci-après "l'Acheteur").
                </p>
                <p>
                  Toute commande implique l'acceptation sans réserve des présentes CGV.
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <CreditCard className="h-5 w-5" />
                  Article 2 - Prix et paiement
                </CardTitle>
              </CardHeader>
              <CardContent className="prose prose-sm max-w-none text-muted-foreground">
                <p>
                  <strong>Prix :</strong> Les prix sont indiqués en euros TTC. Le Vendeur se réserve 
                  le droit de modifier ses prix à tout moment, les produits étant facturés au prix 
                  en vigueur au moment de la validation de la commande.
                </p>
                <p className="mt-2">
                  <strong>Modes de paiement acceptés :</strong>
                </p>
                <ul>
                  <li>Carte bancaire (Visa, Mastercard, CB)</li>
                  <li>PayPal</li>
                  <li>Virement bancaire (pour les professionnels)</li>
                </ul>
                <p className="mt-2">
                  Le paiement est exigé à la commande. Les données bancaires sont sécurisées 
                  et ne transitent pas par nos serveurs.
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Truck className="h-5 w-5" />
                  Article 3 - Livraison
                </CardTitle>
              </CardHeader>
              <CardContent className="prose prose-sm max-w-none text-muted-foreground">
                <p><strong>Zones de livraison :</strong> France métropolitaine, DOM-TOM, Union Européenne</p>
                <p className="mt-2"><strong>Délais de livraison :</strong></p>
                <ul>
                  <li>Standard : 3-5 jours ouvrés</li>
                  <li>Express : 24-48h</li>
                  <li>Click & Collect : sous 2h (magasin Paris)</li>
                </ul>
                <p className="mt-2"><strong>Frais de port :</strong></p>
                <ul>
                  <li>Gratuits dès 49€ d'achat (France métropolitaine)</li>
                  <li>4,90€ en dessous de 49€</li>
                  <li>Express : 9,90€</li>
                </ul>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <RotateCcw className="h-5 w-5" />
                  Article 4 - Droit de rétractation
                </CardTitle>
              </CardHeader>
              <CardContent className="prose prose-sm max-w-none text-muted-foreground">
                <p>
                  Conformément à l'article L221-18 du Code de la consommation, vous disposez 
                  d'un délai de <strong>14 jours</strong> à compter de la réception du produit 
                  pour exercer votre droit de rétractation.
                </p>
                <p className="mt-2">
                  <strong>Procédure :</strong> Contactez notre service client ou utilisez le 
                  formulaire de rétractation disponible dans votre espace client. Les produits 
                  doivent être retournés dans leur état d'origine, non utilisés.
                </p>
                <p className="mt-2">
                  <strong>Remboursement :</strong> Dans les 14 jours suivant la réception du retour.
                </p>
                <p className="mt-2">
                  <strong>Exclusions :</strong> Produits personnalisés, produits descellés pour 
                  raisons d'hygiène.
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Shield className="h-5 w-5" />
                  Article 5 - Garanties
                </CardTitle>
              </CardHeader>
              <CardContent className="prose prose-sm max-w-none text-muted-foreground">
                <p>Tous nos produits bénéficient de :</p>
                <ul>
                  <li><strong>Garantie légale de conformité</strong> (2 ans) - Articles L217-4 et suivants</li>
                  <li><strong>Garantie des vices cachés</strong> - Articles 1641 et suivants du Code civil</li>
                </ul>
                <p className="mt-2">
                  En cas de produit défectueux, contactez notre service client pour obtenir 
                  un échange ou un remboursement.
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Scale className="h-5 w-5" />
                  Article 6 - Litiges et médiation
                </CardTitle>
              </CardHeader>
              <CardContent className="prose prose-sm max-w-none text-muted-foreground">
                <p>
                  En cas de litige, une solution amiable sera recherchée avant toute action 
                  judiciaire. Vous pouvez recourir gratuitement au service de médiation :
                </p>
                <p className="mt-2">
                  <strong>Médiateur de la consommation :</strong><br />
                  CM2C - Centre de Médiation et de Résolution Amiable<br />
                  14 rue Saint Jean, 75017 Paris<br />
                  www.cm2c.net
                </p>
                <p className="mt-4">
                  Les présentes CGV sont soumises au droit français. Le tribunal compétent 
                  est celui du lieu du siège social du Vendeur.
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