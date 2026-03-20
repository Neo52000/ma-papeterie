import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Card, CardContent } from '@/components/ui/card';
import { ArrowLeft, ArrowRight, Store, Truck } from 'lucide-react';
import { useState } from 'react';

export interface DeliveryData {
  mode: 'pickup' | 'shipping';
  address: {
    street: string;
    city: string;
    postal_code: string;
    country: string;
  };
  phone: string;
}

interface StepDeliveryProps {
  delivery: DeliveryData;
  onDeliveryChange: (d: DeliveryData) => void;
  shippingCost: number;
  onBack: () => void;
  onNext: () => void;
}

export default function StepDelivery({ delivery, onDeliveryChange, shippingCost, onBack, onNext }: StepDeliveryProps) {
  const [errors, setErrors] = useState<Record<string, string>>({});

  const validate = (): boolean => {
    if (delivery.mode === 'pickup') return true;
    const errs: Record<string, string> = {};
    if (!delivery.address.street || delivery.address.street.length < 5)
      errs.street = 'Adresse requise (min. 5 caractères)';
    if (!delivery.address.city || delivery.address.city.length < 2)
      errs.city = 'Ville requise';
    if (!/^\d{5}$/.test(delivery.address.postal_code))
      errs.postal_code = 'Code postal invalide (5 chiffres)';
    if (delivery.phone && !/^(\+33|0)\d{9}$/.test(delivery.phone.replace(/\s/g, '')))
      errs.phone = 'Numéro de téléphone invalide';
    setErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const handleNext = () => {
    if (validate()) onNext();
  };

  const updateAddress = (field: string, value: string) => {
    onDeliveryChange({
      ...delivery,
      address: { ...delivery.address, [field]: value },
    });
  };

  return (
    <div className="space-y-6">
      <div className="text-center mb-2">
        <h3 className="text-xl font-bold">Mode de livraison</h3>
        <p className="text-sm text-muted-foreground">Choisissez comment récupérer votre commande</p>
      </div>

      <RadioGroup
        value={delivery.mode}
        onValueChange={v => onDeliveryChange({ ...delivery, mode: v as 'pickup' | 'shipping' })}
        className="space-y-3"
      >
        {/* Pickup */}
        <Card className={delivery.mode === 'pickup' ? 'border-primary' : ''}>
          <CardContent className="pt-4 pb-4">
            <div className="flex items-center space-x-3">
              <RadioGroupItem value="pickup" id="pickup" />
              <Label htmlFor="pickup" className="cursor-pointer flex-1">
                <div className="flex items-center gap-2">
                  <Store className="h-5 w-5 text-green-600" />
                  <div>
                    <p className="font-medium">Retrait en boutique</p>
                    <p className="text-sm text-green-600 font-medium">Gratuit</p>
                    <p className="text-xs text-muted-foreground mt-1">
                      Ma Papeterie — Chaumont (52000)
                    </p>
                  </div>
                </div>
              </Label>
            </div>
          </CardContent>
        </Card>

        {/* Shipping */}
        <Card className={delivery.mode === 'shipping' ? 'border-primary' : ''}>
          <CardContent className="pt-4 pb-4">
            <div className="flex items-center space-x-3">
              <RadioGroupItem value="shipping" id="shipping" />
              <Label htmlFor="shipping" className="cursor-pointer flex-1">
                <div className="flex items-center gap-2">
                  <Truck className="h-5 w-5 text-blue-600" />
                  <div>
                    <p className="font-medium">Livraison à domicile</p>
                    <p className="text-sm text-muted-foreground">
                      {shippingCost === 0
                        ? <span className="text-green-600 font-medium">Gratuit</span>
                        : <>{shippingCost.toFixed(2)} &euro; TTC</>
                      }
                    </p>
                  </div>
                </div>
              </Label>
            </div>
          </CardContent>
        </Card>
      </RadioGroup>

      {/* Shipping address form */}
      {delivery.mode === 'shipping' && (
        <div className="space-y-4 border rounded-lg p-4">
          <h4 className="font-medium text-sm">Adresse de livraison</h4>

          <div className="space-y-2">
            <Label htmlFor="street">Adresse</Label>
            <Input
              id="street"
              placeholder="123 rue de la Paix"
              value={delivery.address.street}
              onChange={e => updateAddress('street', e.target.value)}
            />
            {errors.street && <p className="text-xs text-red-500">{errors.street}</p>}
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label htmlFor="postal_code">Code postal</Label>
              <Input
                id="postal_code"
                placeholder="52000"
                maxLength={5}
                value={delivery.address.postal_code}
                onChange={e => updateAddress('postal_code', e.target.value)}
              />
              {errors.postal_code && <p className="text-xs text-red-500">{errors.postal_code}</p>}
            </div>
            <div className="space-y-2">
              <Label htmlFor="city">Ville</Label>
              <Input
                id="city"
                placeholder="Chaumont"
                value={delivery.address.city}
                onChange={e => updateAddress('city', e.target.value)}
              />
              {errors.city && <p className="text-xs text-red-500">{errors.city}</p>}
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="phone">Téléphone (optionnel)</Label>
            <Input
              id="phone"
              placeholder="06 12 34 56 78"
              value={delivery.phone}
              onChange={e => onDeliveryChange({ ...delivery, phone: e.target.value })}
            />
            {errors.phone && <p className="text-xs text-red-500">{errors.phone}</p>}
          </div>
        </div>
      )}

      <div className="flex justify-between">
        <Button variant="outline" onClick={onBack}>
          <ArrowLeft className="mr-2 h-4 w-4" /> Retour
        </Button>
        <Button onClick={handleNext} size="lg">
          Suivant <ArrowRight className="ml-2 h-4 w-4" />
        </Button>
      </div>
    </div>
  );
}
