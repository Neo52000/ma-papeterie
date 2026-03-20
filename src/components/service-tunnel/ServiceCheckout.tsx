import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Loader2, CreditCard, ShieldCheck } from 'lucide-react';
import { useServiceCartStore } from '@/stores/serviceCartStore';
import { useServiceCheckout } from '@/hooks/useServiceCheckout';

export default function ServiceCheckout() {
  const { items, serviceType, totalHT, deliveryFee, totalTTC, delivery, customer } = useServiceCartStore();
  const { checkout, loading } = useServiceCheckout();

  const ht = totalHT();
  const fee = deliveryFee();
  const ttc = totalTTC();

  return (
    <div className="space-y-6">
      <h3 className="text-xl font-bold text-center">Récapitulatif & paiement</h3>

      {/* Order summary */}
      <Card>
        <CardContent className="p-4 space-y-3">
          <div className="flex justify-between text-sm">
            <span className="text-muted-foreground">Service</span>
            <span className="font-medium">{serviceType === 'photo' ? 'Tirage photo' : 'Reprographie'}</span>
          </div>
          <div className="flex justify-between text-sm">
            <span className="text-muted-foreground">Fichiers</span>
            <span>{items.length} fichier(s)</span>
          </div>
          <div className="flex justify-between text-sm">
            <span className="text-muted-foreground">Mode</span>
            <span>{delivery.mode === 'pickup' ? 'Retrait en boutique' : 'Livraison'}</span>
          </div>
          {delivery.mode === 'delivery' && delivery.address && (
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Adresse</span>
              <span className="text-right text-xs">
                {delivery.address.street}, {delivery.address.postal_code} {delivery.address.city}
              </span>
            </div>
          )}
          <div className="flex justify-between text-sm">
            <span className="text-muted-foreground">Email</span>
            <span>{customer.email}</span>
          </div>

          <div className="border-t pt-3 space-y-1">
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Sous-total HT</span>
              <span>{ht.toFixed(2)} &euro;</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">TVA (20%)</span>
              <span>{(ht * 0.2).toFixed(2)} &euro;</span>
            </div>
            {fee > 0 && (
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Livraison</span>
                <span>{fee.toFixed(2)} &euro;</span>
              </div>
            )}
            <div className="flex justify-between text-lg font-bold pt-2 border-t">
              <span>Total TTC</span>
              <span className="text-primary">{ttc.toFixed(2)} &euro;</span>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Payment button */}
      <div className="text-center space-y-3">
        <Button
          onClick={checkout}
          disabled={loading || items.length === 0}
          size="lg"
          className="w-full sm:w-auto min-w-[200px]"
        >
          {loading ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Redirection...
            </>
          ) : (
            <>
              <CreditCard className="mr-2 h-4 w-4" />
              Payer {ttc.toFixed(2)} &euro;
            </>
          )}
        </Button>
        <p className="text-xs text-muted-foreground flex items-center justify-center gap-1">
          <ShieldCheck className="h-3 w-3" />
          Paiement sécurisé par Stripe
        </p>
      </div>
    </div>
  );
}
