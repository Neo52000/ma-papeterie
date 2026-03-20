import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { CheckCircle } from 'lucide-react';
import { Link } from 'react-router-dom';
import type { ServiceConfig } from '@/lib/serviceConfig';

interface StepConfirmationProps {
  config: ServiceConfig;
  orderNumber: string;
  deliveryMode: 'pickup' | 'shipping';
}

export default function StepConfirmation({ config, orderNumber, deliveryMode }: StepConfirmationProps) {
  return (
    <div className="text-center space-y-6 py-6">
      <div className="mx-auto w-16 h-16 bg-green-100 rounded-full flex items-center justify-center">
        <CheckCircle className="h-8 w-8 text-green-600" />
      </div>

      <div>
        <h3 className="text-xl font-bold mb-2">Commande confirmée !</h3>
        <p className="text-muted-foreground">
          Votre commande de {config.title.toLowerCase()} a été enregistrée avec succès.
        </p>
      </div>

      <Card className="text-left bg-muted/50 max-w-md mx-auto">
        <CardContent className="pt-4 pb-4 space-y-3 text-sm">
          <div className="flex justify-between">
            <span className="text-muted-foreground">N° de commande :</span>
            <span className="font-mono font-medium">{orderNumber}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-muted-foreground">Mode :</span>
            <span>{deliveryMode === 'pickup' ? 'Retrait en boutique' : 'Livraison à domicile'}</span>
          </div>
          <div className="flex justify-center pt-2">
            <Badge variant="secondary">Paiement confirmé</Badge>
          </div>
        </CardContent>
      </Card>

      <p className="text-sm text-muted-foreground">
        {deliveryMode === 'pickup'
          ? 'Nous vous contacterons dès que votre commande sera prête à retirer en boutique.'
          : 'Vous recevrez un email avec le suivi de livraison.'}
      </p>

      <div className="flex flex-col sm:flex-row gap-3 justify-center">
        <Button asChild variant="outline">
          <Link to="/mon-compte">Mes commandes</Link>
        </Button>
        <Button asChild>
          <Link to={`/services/${config.slug}`}>Nouvelle commande</Link>
        </Button>
      </div>
    </div>
  );
}
