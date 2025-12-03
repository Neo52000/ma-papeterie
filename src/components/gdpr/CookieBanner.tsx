import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Switch } from '@/components/ui/switch';
import { Cookie, Settings, X } from 'lucide-react';
import { useCookieConsent } from '@/hooks/useCookieConsent';

export function CookieBanner() {
  const { hasConsented, preferences, acceptAll, rejectAll, saveCustom } = useCookieConsent();
  const [showSettings, setShowSettings] = useState(false);
  const [customPrefs, setCustomPrefs] = useState(preferences);

  // Don't show if user has already consented
  if (hasConsented !== null) {
    return null;
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/50 p-4">
      <Card className="w-full max-w-lg bg-background shadow-2xl animate-in slide-in-from-bottom-4">
        <div className="p-6">
          <div className="flex items-start justify-between mb-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-primary/10 rounded-full">
                <Cookie className="h-6 w-6 text-primary" />
              </div>
              <h3 className="text-lg font-semibold">Gestion des cookies</h3>
            </div>
          </div>

          {!showSettings ? (
            <>
              <p className="text-muted-foreground text-sm mb-6">
                Nous utilisons des cookies pour améliorer votre expérience sur notre site. 
                Certains cookies sont essentiels au fonctionnement du site, tandis que d'autres 
                nous aident à analyser le trafic et à personnaliser le contenu.
              </p>

              <div className="flex flex-col sm:flex-row gap-3">
                <Button onClick={rejectAll} variant="outline" className="flex-1">
                  Refuser tout
                </Button>
                <Button onClick={() => setShowSettings(true)} variant="secondary" className="flex-1 gap-2">
                  <Settings className="h-4 w-4" />
                  Personnaliser
                </Button>
                <Button onClick={acceptAll} variant="cta" className="flex-1">
                  Accepter tout
                </Button>
              </div>

              <p className="text-xs text-muted-foreground mt-4 text-center">
                En continuant votre navigation, vous acceptez notre{' '}
                <a href="/politique-confidentialite" className="underline hover:text-primary">
                  Politique de confidentialité
                </a>
              </p>
            </>
          ) : (
            <>
              <div className="space-y-4 mb-6">
                <div className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
                  <div>
                    <h4 className="font-medium text-sm">Cookies essentiels</h4>
                    <p className="text-xs text-muted-foreground">
                      Nécessaires au fonctionnement du site
                    </p>
                  </div>
                  <Switch checked disabled />
                </div>

                <div className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
                  <div>
                    <h4 className="font-medium text-sm">Cookies analytiques</h4>
                    <p className="text-xs text-muted-foreground">
                      Nous aident à comprendre l'utilisation du site
                    </p>
                  </div>
                  <Switch 
                    checked={customPrefs.analytics} 
                    onCheckedChange={(checked) => setCustomPrefs({ ...customPrefs, analytics: checked })}
                  />
                </div>

                <div className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
                  <div>
                    <h4 className="font-medium text-sm">Cookies marketing</h4>
                    <p className="text-xs text-muted-foreground">
                      Permettent la personnalisation des publicités
                    </p>
                  </div>
                  <Switch 
                    checked={customPrefs.marketing} 
                    onCheckedChange={(checked) => setCustomPrefs({ ...customPrefs, marketing: checked })}
                  />
                </div>
              </div>

              <div className="flex gap-3">
                <Button onClick={() => setShowSettings(false)} variant="outline" className="flex-1">
                  Retour
                </Button>
                <Button onClick={() => saveCustom(customPrefs)} variant="cta" className="flex-1">
                  Enregistrer mes choix
                </Button>
              </div>
            </>
          )}
        </div>
      </Card>
    </div>
  );
}