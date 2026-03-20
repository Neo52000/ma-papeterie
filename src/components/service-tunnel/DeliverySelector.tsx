import { Card, CardContent } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { MapPin, Truck } from 'lucide-react';
import { useServiceCartStore, type DeliveryInfo } from '@/stores/serviceCartStore';

const DELIVERY_FEE = 5.90;

export default function DeliverySelector() {
  const { delivery, setDelivery } = useServiceCartStore();

  const handleModeChange = (mode: 'pickup' | 'delivery') => {
    if (mode === 'pickup') {
      setDelivery({ mode: 'pickup' });
    } else {
      setDelivery({
        mode: 'delivery',
        address: delivery.address || { street: '', city: '', postal_code: '', country: 'France' },
      });
    }
  };

  const updateAddress = (field: string, value: string) => {
    setDelivery({
      mode: 'delivery',
      address: { ...delivery.address!, [field]: value },
    } as DeliveryInfo);
  };

  return (
    <div className="space-y-4">
      <h3 className="text-xl font-bold text-center">Mode de livraison</h3>

      <RadioGroup
        value={delivery.mode}
        onValueChange={v => handleModeChange(v as 'pickup' | 'delivery')}
        className="grid grid-cols-1 sm:grid-cols-2 gap-4"
      >
        <Label htmlFor="pickup" className="cursor-pointer">
          <Card className={`transition-colors ${delivery.mode === 'pickup' ? 'border-primary ring-2 ring-primary/20' : ''}`}>
            <CardContent className="p-4 flex items-start gap-3">
              <RadioGroupItem value="pickup" id="pickup" className="mt-1" />
              <div>
                <div className="flex items-center gap-2">
                  <MapPin className="h-4 w-4 text-primary" />
                  <span className="font-medium">Retrait en boutique</span>
                </div>
                <p className="text-sm text-muted-foreground mt-1">
                  Gratuit — Production sous 24-48h
                </p>
                <p className="text-xs text-muted-foreground mt-1">
                  Ma Papeterie, Chaumont (52000)
                </p>
              </div>
            </CardContent>
          </Card>
        </Label>

        <Label htmlFor="delivery" className="cursor-pointer">
          <Card className={`transition-colors ${delivery.mode === 'delivery' ? 'border-primary ring-2 ring-primary/20' : ''}`}>
            <CardContent className="p-4 flex items-start gap-3">
              <RadioGroupItem value="delivery" id="delivery" className="mt-1" />
              <div>
                <div className="flex items-center gap-2">
                  <Truck className="h-4 w-4 text-primary" />
                  <span className="font-medium">Livraison</span>
                </div>
                <p className="text-sm text-muted-foreground mt-1">
                  {DELIVERY_FEE.toFixed(2)} &euro; — Livraison sous 3-5 jours
                </p>
              </div>
            </CardContent>
          </Card>
        </Label>
      </RadioGroup>

      {/* Address form */}
      {delivery.mode === 'delivery' && (
        <Card>
          <CardContent className="p-4 space-y-3">
            <h4 className="font-medium text-sm">Adresse de livraison</h4>
            <div className="space-y-3">
              <div>
                <Label className="text-xs">Adresse</Label>
                <Input
                  value={delivery.address?.street || ''}
                  onChange={e => updateAddress('street', e.target.value)}
                  placeholder="123 rue Example"
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label className="text-xs">Code postal</Label>
                  <Input
                    value={delivery.address?.postal_code || ''}
                    onChange={e => updateAddress('postal_code', e.target.value)}
                    placeholder="52000"
                    maxLength={5}
                  />
                </div>
                <div>
                  <Label className="text-xs">Ville</Label>
                  <Input
                    value={delivery.address?.city || ''}
                    onChange={e => updateAddress('city', e.target.value)}
                    placeholder="Chaumont"
                  />
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
