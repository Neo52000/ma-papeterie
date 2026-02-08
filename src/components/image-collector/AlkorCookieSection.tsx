import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Alert, AlertDescription } from "@/components/ui/alert";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { KeyRound, Info, Loader2 } from "lucide-react";
import { useSetAlkorCookie } from "@/hooks/useCrawlJobs";

export function AlkorCookieSection() {
  const [dialogOpen, setDialogOpen] = useState(false);
  const [cookieValue, setCookieValue] = useState("");
  const setCookie = useSetAlkorCookie();

  const handleSave = () => {
    if (!cookieValue.trim()) return;
    setCookie.mutate(cookieValue, {
      onSuccess: () => {
        setDialogOpen(false);
        setCookieValue("");
      },
    });
  };

  return (
    <Card className="border-accent/30 bg-accent/5">
      <CardHeader>
        <CardTitle className="text-lg flex items-center gap-2">
          <KeyRound className="h-5 w-5 text-accent-foreground" />
          Session AlkorShop B2B
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <Alert>
          <Info className="h-4 w-4" />
          <AlertDescription>
            <strong>Comment récupérer le cookie de session (Chrome) :</strong>
            <ol className="list-decimal ml-4 mt-2 space-y-1 text-sm">
              <li>Connectez-vous à <code className="bg-muted px-1 rounded">b2b.alkorshop.com</code> dans votre navigateur</li>
              <li>Ouvrez les DevTools (F12) → onglet <strong>Network</strong></li>
              <li>Cliquez sur n'importe quelle requête vers alkorshop</li>
              <li>Dans <strong>Headers → Request Headers</strong>, copiez la valeur complète du champ <code className="bg-muted px-1 rounded">Cookie</code></li>
              <li>Collez-la ci-dessous</li>
            </ol>
          </AlertDescription>
        </Alert>

        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogTrigger asChild>
            <Button variant="outline" className="gap-2">
              <KeyRound className="h-4 w-4" />
              Mettre à jour le cookie de session
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Cookie de session AlkorShop</DialogTitle>
              <DialogDescription>
                Collez le cookie de session copié depuis votre navigateur. Il sera stocké de manière sécurisée côté serveur et ne sera jamais affiché.
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
              <Button variant="outline" onClick={() => setDialogOpen(false)}>
                Annuler
              </Button>
              <Button
                onClick={handleSave}
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
      </CardContent>
    </Card>
  );
}
