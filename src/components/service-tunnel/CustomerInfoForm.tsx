import { useEffect } from 'react';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Switch } from '@/components/ui/switch';
import { useAuth } from '@/stores/authStore';
import { useServiceCartStore } from '@/stores/serviceCartStore';

export default function CustomerInfoForm() {
  const { user } = useAuth();
  const { customer, setCustomer } = useServiceCartStore();

  // Pre-fill from auth
  useEffect(() => {
    if (user && !customer.email) {
      setCustomer({
        ...customer,
        email: user.email || '',
        name: user.user_metadata?.full_name || user.user_metadata?.name || '',
        phone: user.user_metadata?.phone || '',
      });
    }
  }, [user]); // eslint-disable-line react-hooks/exhaustive-deps

  const update = (field: string, value: string | boolean) => {
    setCustomer({ ...customer, [field]: value });
  };

  return (
    <div className="space-y-4">
      <h3 className="text-xl font-bold text-center">Vos coordonnées</h3>

      <div className="space-y-3 max-w-md mx-auto">
        <div>
          <Label className="text-sm">Email *</Label>
          <Input
            type="email"
            value={customer.email}
            onChange={e => update('email', e.target.value)}
            placeholder="votre@email.fr"
            required
          />
        </div>

        <div>
          <Label className="text-sm">Nom complet *</Label>
          <Input
            value={customer.name}
            onChange={e => update('name', e.target.value)}
            placeholder="Jean Dupont"
            required
          />
        </div>

        <div>
          <Label className="text-sm">Téléphone (optionnel)</Label>
          <Input
            type="tel"
            value={customer.phone}
            onChange={e => update('phone', e.target.value)}
            placeholder="06 12 34 56 78"
          />
        </div>

        <div className="flex items-center gap-3 pt-2">
          <Switch
            checked={customer.emailNotifications}
            onCheckedChange={v => update('emailNotifications', v)}
            id="email-notif"
          />
          <Label htmlFor="email-notif" className="text-sm cursor-pointer">
            Recevoir les notifications par email (statut de commande)
          </Label>
        </div>
      </div>
    </div>
  );
}
