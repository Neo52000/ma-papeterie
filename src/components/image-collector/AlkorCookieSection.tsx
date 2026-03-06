import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { KeyRound, Info, Loader2, ChevronDown, Lock } from "lucide-react";
import { useSetAlkorCookie, useSetAlkorCredentials } from "@/hooks/useCrawlJobs";

export function AlkorCookieSection() {
  const [clientCode, setClientCode] = useState("");
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [baseUrl, setBaseUrl] = useState("");
  const setCredentials = useSetAlkorCredentials();

  // Legacy cookie mode
  const [cookieDialogOpen, setCookieDialogOpen] = useState(false);
  const [cookieValue, setCookieValue] = useState("");
  const setCookie = useSetAlkorCookie();

  const handleSaveCredentials = () => {
    if (!clientCode.trim() || !username.trim() || !password.trim()) return;
    setCredentials.mutate(
      { client_code: clientCode, username, password, base_url: baseUrl.trim() || undefined },
      {
        onSuccess: () => {
          setClientCode("");
          setUsername("");
          setPassword("");
          setBaseUrl("");
        },
      }
    );
  };

  const handleSaveCookie = () => {
    if (!cookieValue.trim()) return;
    setCookie.mutate(cookieValue, {
      onSuccess: () => {
        setCookieDialogOpen(false);
        setCookieValue("");
      },
    });
  };

  return (
    <Card className="border-accent/30 bg-accent/5">
      <CardHeader>
        <CardTitle className="text-lg flex items-center gap-2">
          <KeyRound className="h-5 w-5 text-accent-foreground" />
          Connexion AlkorShop B2B
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <Alert>
          <Info className="h-4 w-4" />
          <AlertDescription>
            Saisissez vos identifiants Alkor B2B. Le crawl se connectera automatiquement
            au site lors de chaque lancement. Les identifiants sont stockés de manière
            sécurisée côté serveur.
          </AlertDescription>
        </Alert>

        {/* Credentials form */}
        <div className="space-y-3">
          <div className="space-y-1.5">
            <Label htmlFor="alkor-client-code">Code client</Label>
            <Input
              id="alkor-client-code"
              value={clientCode}
              onChange={(e) => setClientCode(e.target.value)}
              placeholder="Ex: 991002005031"
              className="font-mono"
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="alkor-username">Identifiant</Label>
            <Input
              id="alkor-username"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              placeholder="Votre identifiant Alkor"
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="alkor-password">Mot de passe</Label>
            <Input
              id="alkor-password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Votre mot de passe"
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="alkor-base-url">URL du site B2B <span className="text-muted-foreground text-xs">(optionnel)</span></Label>
            <Input
              id="alkor-base-url"
              value={baseUrl}
              onChange={(e) => setBaseUrl(e.target.value)}
              placeholder="https://b2b.alkorshop.com"
              className="font-mono text-sm"
            />
            <p className="text-xs text-muted-foreground">
              Laissez vide pour utiliser l'URL par défaut. Modifiez si le site B2B a changé d'adresse.
            </p>
          </div>
          <Button
            onClick={handleSaveCredentials}
            disabled={
              !clientCode.trim() ||
              !username.trim() ||
              !password.trim() ||
              setCredentials.isPending
            }
            className="gap-2"
          >
            {setCredentials.isPending ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Lock className="h-4 w-4" />
            )}
            Enregistrer les identifiants
          </Button>
        </div>

        {/* Legacy cookie option (collapsed) */}
        <Collapsible>
          <CollapsibleTrigger asChild>
            <Button variant="ghost" size="sm" className="gap-1 text-xs text-muted-foreground">
              <ChevronDown className="h-3 w-3" />
              Mode avancé : cookie manuel
            </Button>
          </CollapsibleTrigger>
          <CollapsibleContent className="pt-2">
            <Dialog open={cookieDialogOpen} onOpenChange={setCookieDialogOpen}>
              <DialogTrigger asChild>
                <Button variant="outline" size="sm" className="gap-2">
                  <KeyRound className="h-4 w-4" />
                  Coller un cookie de session
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Cookie de session AlkorShop</DialogTitle>
                  <DialogDescription>
                    Collez le cookie de session copié depuis votre navigateur (DevTools &rarr; Network &rarr; Cookie header).
                  </DialogDescription>
                </DialogHeader>
                <Textarea
                  value={cookieValue}
                  onChange={(e) => setCookieValue(e.target.value)}
                  placeholder="Collez le cookie complet ici..."
                  rows={5}
                  className="font-mono text-xs"
                />
                <DialogFooter>
                  <Button variant="outline" onClick={() => setCookieDialogOpen(false)}>
                    Annuler
                  </Button>
                  <Button
                    onClick={handleSaveCookie}
                    disabled={!cookieValue.trim() || setCookie.isPending}
                  >
                    {setCookie.isPending && (
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    )}
                    Enregistrer
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          </CollapsibleContent>
        </Collapsible>
      </CardContent>
    </Card>
  );
}
