import { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { CheckCircle, Loader2, MapPin, Package } from 'lucide-react';
import { Link } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useServiceCartStore } from '@/stores/serviceCartStore';

interface ServiceOrder {
  id: string;
  order_number: string;
  service_type: string;
  status: string;
  total_ht: number;
  total_ttc: number;
  delivery_mode: string;
  customer_email: string;
  customer_name: string;
  created_at: string;
}

export default function ServiceOrderConfirmation() {
  const [searchParams] = useSearchParams();
  const [order, setOrder] = useState<ServiceOrder | null>(null);
  const [loading, setLoading] = useState(true);
  const clearCart = useServiceCartStore(s => s.clearCart);

  const sessionId = searchParams.get('session_id');

  useEffect(() => {
    if (!sessionId) {
      setLoading(false);
      return;
    }

    const fetchOrder = async () => {
      const { data, error } = await supabase
        .from('service_orders' as any)
        .select('*')
        .eq('stripe_session_id', sessionId)
        .single();

      if (!error && data) {
        setOrder(data as any);
        clearCart();
      }
      setLoading(false);
    };

    fetchOrder();
  }, [sessionId, clearCart]);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-16">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!order) {
    return (
      <div className="text-center py-16 space-y-4">
        <p className="text-muted-foreground">Commande introuvable.</p>
        <Button asChild variant="outline">
          <Link to="/">Retour à l'accueil</Link>
        </Button>
      </div>
    );
  }

  return (
    <div className="max-w-lg mx-auto space-y-6 py-8 px-4">
      <div className="text-center space-y-4">
        <div className="mx-auto w-16 h-16 bg-green-100 rounded-full flex items-center justify-center">
          <CheckCircle className="h-8 w-8 text-green-600" />
        </div>
        <h2 className="text-2xl font-bold">Commande confirmée !</h2>
        <p className="text-muted-foreground">
          Merci {order.customer_name}. Votre commande a bien été enregistrée.
        </p>
      </div>

      <Card>
        <CardContent className="p-4 space-y-3">
          <div className="flex justify-between text-sm">
            <span className="text-muted-foreground">Numéro de commande</span>
            <span className="font-mono font-bold">{order.order_number}</span>
          </div>
          <div className="flex justify-between text-sm">
            <span className="text-muted-foreground">Service</span>
            <span>{order.service_type === 'photo' ? 'Tirage photo' : 'Reprographie'}</span>
          </div>
          <div className="flex justify-between text-sm">
            <span className="text-muted-foreground">Total TTC</span>
            <span className="font-bold text-primary">{Number(order.total_ttc).toFixed(2)} &euro;</span>
          </div>
          <div className="flex justify-between text-sm">
            <span className="text-muted-foreground">Mode</span>
            <span>{order.delivery_mode === 'pickup' ? 'Retrait en boutique' : 'Livraison'}</span>
          </div>
          <div className="flex justify-center pt-2">
            <Badge variant="secondary">
              {order.status === 'confirmed' ? 'Paiement confirmé' : 'En cours de traitement'}
            </Badge>
          </div>
        </CardContent>
      </Card>

      <Card className="bg-muted/30">
        <CardContent className="p-4 space-y-2">
          <h4 className="font-medium text-sm">Prochaines étapes</h4>
          <ul className="text-sm text-muted-foreground space-y-2">
            <li className="flex items-start gap-2">
              <Package className="h-4 w-4 text-primary mt-0.5 flex-shrink-0" />
              Votre commande est en cours de préparation (24-48h).
            </li>
            <li className="flex items-start gap-2">
              <CheckCircle className="h-4 w-4 text-primary mt-0.5 flex-shrink-0" />
              Vous recevrez un email quand elle sera prête.
            </li>
            {order.delivery_mode === 'pickup' && (
              <li className="flex items-start gap-2">
                <MapPin className="h-4 w-4 text-primary mt-0.5 flex-shrink-0" />
                Retrait : Ma Papeterie, Centre-ville Chaumont (52000)
              </li>
            )}
          </ul>
        </CardContent>
      </Card>

      <div className="flex flex-col sm:flex-row gap-3 justify-center">
        <Button asChild variant="outline">
          <Link to="/mon-compte">Voir mes commandes</Link>
        </Button>
        <Button asChild>
          <Link to="/">Retour à l'accueil</Link>
        </Button>
      </div>
    </div>
  );
}
