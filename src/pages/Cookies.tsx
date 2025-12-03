import Header from "@/components/layout/Header";
import Footer from "@/components/layout/Footer";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Cookie, Settings, Shield, BarChart, Target } from "lucide-react";
import { useCookieConsent } from "@/hooks/useCookieConsent";
import { useState, useEffect } from "react";
import { useToast } from "@/hooks/use-toast";

export default function Cookies() {
  const { preferences, saveCustom, resetConsent } = useCookieConsent();
  const [localPrefs, setLocalPrefs] = useState(preferences);
  const { toast } = useToast();

  useEffect(() => {
    setLocalPrefs(preferences);
  }, [preferences]);

  const handleSave = () => {
    saveCustom(localPrefs);
    toast({
      title: "Préférences enregistrées",
      description: "Vos préférences de cookies ont été mises à jour"
    });
  };

  const handleReset = () => {
    resetConsent();
    toast({
      title: "Préférences réinitialisées",
      description: "Vous pouvez maintenant choisir à nouveau vos préférences"
    });
  };

  return (
    <div className="min-h-screen bg-background">
      <Header />
      
      <main className="container mx-auto px-4 py-12">
        <div className="max-w-4xl mx-auto">
          <div className="text-center mb-12">
            <Cookie className="h-16 w-16 text-primary mx-auto mb-4" />
            <h1 className="text-4xl font-bold text-primary mb-4">Gestion des Cookies</h1>
            <p className="text-muted-foreground max-w-2xl mx-auto">
              Nous utilisons des cookies pour améliorer votre expérience. Gérez vos préférences ci-dessous.
            </p>
          </div>

          {/* Préférences */}
          <Card className="mb-8">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Settings className="h-5 w-5" />
                Vos préférences
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="flex items-center justify-between p-4 bg-muted/50 rounded-lg">
                <div className="flex items-center gap-3">
                  <Shield className="h-8 w-8 text-primary" />
                  <div>
                    <h4 className="font-semibold">Cookies essentiels</h4>
                    <p className="text-sm text-muted-foreground">
                      Nécessaires au fonctionnement du site (panier, session, sécurité)
                    </p>
                  </div>
                </div>
                <Switch checked disabled />
              </div>

              <div className="flex items-center justify-between p-4 bg-muted/50 rounded-lg">
                <div className="flex items-center gap-3">
                  <BarChart className="h-8 w-8 text-blue-500" />
                  <div>
                    <h4 className="font-semibold">Cookies analytiques</h4>
                    <p className="text-sm text-muted-foreground">
                      Nous aident à comprendre comment vous utilisez le site
                    </p>
                  </div>
                </div>
                <Switch 
                  checked={localPrefs.analytics} 
                  onCheckedChange={(checked) => setLocalPrefs({ ...localPrefs, analytics: checked })}
                />
              </div>

              <div className="flex items-center justify-between p-4 bg-muted/50 rounded-lg">
                <div className="flex items-center gap-3">
                  <Target className="h-8 w-8 text-orange-500" />
                  <div>
                    <h4 className="font-semibold">Cookies marketing</h4>
                    <p className="text-sm text-muted-foreground">
                      Permettent la personnalisation des publicités
                    </p>
                  </div>
                </div>
                <Switch 
                  checked={localPrefs.marketing} 
                  onCheckedChange={(checked) => setLocalPrefs({ ...localPrefs, marketing: checked })}
                />
              </div>

              <div className="flex gap-4 pt-4">
                <Button onClick={handleSave} variant="cta">
                  Enregistrer mes préférences
                </Button>
                <Button onClick={handleReset} variant="outline">
                  Réinitialiser
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Liste des cookies */}
          <div className="space-y-6">
            <h2 className="text-2xl font-bold">Détail des cookies utilisés</h2>

            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Cookies essentiels</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b">
                        <th className="text-left py-2 font-medium">Nom</th>
                        <th className="text-left py-2 font-medium">Finalité</th>
                        <th className="text-left py-2 font-medium">Durée</th>
                      </tr>
                    </thead>
                    <tbody className="text-muted-foreground">
                      <tr className="border-b">
                        <td className="py-2">sb-auth-token</td>
                        <td className="py-2">Authentification utilisateur</td>
                        <td className="py-2">Session</td>
                      </tr>
                      <tr className="border-b">
                        <td className="py-2">cookie_consent</td>
                        <td className="py-2">Mémorisation des choix cookies</td>
                        <td className="py-2">1 an</td>
                      </tr>
                      <tr>
                        <td className="py-2">cart_items</td>
                        <td className="py-2">Contenu du panier</td>
                        <td className="py-2">7 jours</td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Cookies analytiques</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b">
                        <th className="text-left py-2 font-medium">Nom</th>
                        <th className="text-left py-2 font-medium">Finalité</th>
                        <th className="text-left py-2 font-medium">Durée</th>
                      </tr>
                    </thead>
                    <tbody className="text-muted-foreground">
                      <tr className="border-b">
                        <td className="py-2">_ga</td>
                        <td className="py-2">Google Analytics - Identification visiteur</td>
                        <td className="py-2">2 ans</td>
                      </tr>
                      <tr>
                        <td className="py-2">_gid</td>
                        <td className="py-2">Google Analytics - Session</td>
                        <td className="py-2">24 heures</td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Cookies marketing</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b">
                        <th className="text-left py-2 font-medium">Nom</th>
                        <th className="text-left py-2 font-medium">Finalité</th>
                        <th className="text-left py-2 font-medium">Durée</th>
                      </tr>
                    </thead>
                    <tbody className="text-muted-foreground">
                      <tr className="border-b">
                        <td className="py-2">_fbp</td>
                        <td className="py-2">Facebook Pixel - Suivi conversions</td>
                        <td className="py-2">3 mois</td>
                      </tr>
                      <tr>
                        <td className="py-2">fr</td>
                        <td className="py-2">Facebook - Publicité ciblée</td>
                        <td className="py-2">3 mois</td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </main>

      <Footer />
    </div>
  );
}