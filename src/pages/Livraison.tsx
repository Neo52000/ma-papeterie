import Header from "@/components/layout/Header";
import Footer from "@/components/layout/Footer";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Truck, RotateCcw, HelpCircle, Store } from "lucide-react";
import { usePriceModeStore } from "@/stores/priceModeStore";

const SHIPPING_RATES = [
  { label: "< 250g (Lettre suivie)", priceHt: 3.50, delay: "2-3 jours ouvrés" },
  { label: "250g – 1kg (Colissimo)", priceHt: 5.50, delay: "2-3 jours ouvrés" },
  { label: "1kg – 3kg", priceHt: 7.50, delay: "3-5 jours ouvrés" },
  { label: "> 3kg", priceHt: 9.50, delay: "3-5 jours ouvrés" },
] as const;

const Livraison = () => {
  const mode = usePriceModeStore((s) => s.mode);
  const fmt = (ht: number) => {
    const val = mode === "ttc" ? ht * 1.2 : ht;
    return `${val.toFixed(2)} €`;
  };
  const suffix = mode === "ttc" ? "TTC" : "HT";

  return (
    <div className="min-h-screen bg-background">
      <Header />
      
      <main className="pt-24 pb-16">
        <div className="container mx-auto px-4 max-w-4xl">
          <h1 className="text-4xl font-bold text-foreground mb-8">Livraison & Retours</h1>
          
          {/* Cards Grid */}
          <div className="grid md:grid-cols-2 gap-6 mb-12">
            <Card>
              <CardContent className="p-6">
                <Truck className="h-10 w-10 text-primary mb-4" />
                <h3 className="text-xl font-semibold mb-2">Livraison Rapide</h3>
                <p className="text-muted-foreground">
                  Expédition sous 24-48h pour toute commande passée avant 14h.
                </p>
              </CardContent>
            </Card>
            
            <Card>
              <CardContent className="p-6">
                <RotateCcw className="h-10 w-10 text-primary mb-4" />
                <h3 className="text-xl font-semibold mb-2">Retours Gratuits</h3>
                <p className="text-muted-foreground">
                  30 jours pour changer d'avis, retours gratuits en France.
                </p>
              </CardContent>
            </Card>
          </div>

          {/* Livraison Section */}
          <section className="mb-12">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-2xl font-bold">Frais de Livraison</h2>
              <Badge variant="outline">Prix {suffix}</Badge>
            </div>

            <div className="space-y-4">
              {SHIPPING_RATES.map((rate) => (
                <Card key={rate.label}>
                  <CardContent className="p-6">
                    <div className="flex justify-between items-start">
                      <div>
                        <h4 className="font-semibold">{rate.label}</h4>
                        <p className="text-sm text-muted-foreground">{rate.delay}</p>
                      </div>
                      <span className="font-bold text-primary">{fmt(rate.priceHt)} {suffix}</span>
                    </div>
                  </CardContent>
                </Card>
              ))}

              <Card className="border-primary">
                <CardContent className="p-6">
                  <div className="flex justify-between items-start">
                    <div className="flex items-center gap-2">
                      <Store className="h-5 w-5 text-primary" />
                      <div>
                        <h4 className="font-semibold text-primary">Retrait en boutique</h4>
                        <p className="text-sm text-muted-foreground">Disponible sous 1h</p>
                      </div>
                    </div>
                    <span className="font-bold text-primary">GRATUIT</span>
                  </div>
                </CardContent>
              </Card>
            </div>
          </section>

          {/* Retours Section */}
          <section className="mb-12">
            <h2 className="text-2xl font-bold mb-6">Politique de Retour</h2>
            
            <div className="prose prose-sm max-w-none text-muted-foreground space-y-4">
              <p>
                Vous disposez d'un délai de <strong className="text-foreground">30 jours</strong> à compter de la réception 
                de votre commande pour retourner tout article qui ne vous conviendrait pas.
              </p>
              
              <h3 className="text-lg font-semibold text-foreground mt-6">Conditions de retour</h3>
              <ul className="list-disc pl-6 space-y-2">
                <li>Les articles doivent être retournés dans leur emballage d'origine</li>
                <li>Les produits ne doivent pas avoir été utilisés ou ouverts</li>
                <li>Les étiquettes et codes-barres doivent être intacts</li>
              </ul>
              
              <h3 className="text-lg font-semibold text-foreground mt-6">Procédure de retour</h3>
              <ol className="list-decimal pl-6 space-y-2">
                <li>Connectez-vous à votre espace client</li>
                <li>Sélectionnez la commande concernée</li>
                <li>Cliquez sur "Demander un retour"</li>
                <li>Imprimez l'étiquette de retour prépayée</li>
                <li>Déposez le colis dans le point relais de votre choix</li>
              </ol>
              
              <h3 className="text-lg font-semibold text-foreground mt-6">Remboursement</h3>
              <p>
                Le remboursement est effectué sous 14 jours suivant la réception du retour, 
                via le même moyen de paiement utilisé lors de la commande.
              </p>
            </div>
          </section>

          {/* FAQ Livraison */}
          <section>
            <h2 className="text-2xl font-bold mb-6">Questions Fréquentes</h2>
            
            <div className="space-y-4">
              <Card>
                <CardContent className="p-6">
                  <h4 className="font-semibold flex items-center gap-2 mb-2">
                    <HelpCircle className="h-4 w-4 text-primary" />
                    Comment suivre ma commande ?
                  </h4>
                  <p className="text-sm text-muted-foreground">
                    Vous recevrez un email avec un lien de suivi dès l'expédition de votre commande. 
                    Vous pouvez également suivre votre colis depuis votre espace client.
                  </p>
                </CardContent>
              </Card>
              
              <Card>
                <CardContent className="p-6">
                  <h4 className="font-semibold flex items-center gap-2 mb-2">
                    <HelpCircle className="h-4 w-4 text-primary" />
                    Livrez-vous en Belgique, Suisse, Luxembourg ?
                  </h4>
                  <p className="text-sm text-muted-foreground">
                    Oui, nous livrons dans toute l'Europe. Les frais de port et délais varient 
                    selon la destination. Consultez le détail lors du passage de commande.
                  </p>
                </CardContent>
              </Card>
              
              <Card>
                <CardContent className="p-6">
                  <h4 className="font-semibold flex items-center gap-2 mb-2">
                    <HelpCircle className="h-4 w-4 text-primary" />
                    Mon colis est arrivé endommagé, que faire ?
                  </h4>
                  <p className="text-sm text-muted-foreground">
                    Contactez notre service client dans les 48h avec des photos du colis et des 
                    produits endommagés. Nous vous enverrons un remplacement gratuitement.
                  </p>
                </CardContent>
              </Card>
            </div>
          </section>
        </div>
      </main>
      
      <Footer />
    </div>
  );
};

export default Livraison;
