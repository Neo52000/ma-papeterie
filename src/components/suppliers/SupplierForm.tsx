import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { Supplier } from "@/types/supplier";

type SupplierFormData = Partial<Supplier> & {
  supplier_type?: string;
  format_source?: string;
};

interface SupplierFormProps {
  supplier: Supplier | null;
  onSave: (supplier: Partial<Supplier>) => void;
  onCancel: () => void;
}

export function SupplierForm({ supplier, onSave, onCancel }: SupplierFormProps) {
  const [formData, setFormData] = useState<SupplierFormData>(
    supplier || {
      name: '',
      company_name: '',
      email: '',
      phone: '',
      address: '',
      postal_code: '',
      city: '',
      country: 'France',
      siret: '',
      vat_number: '',
      payment_terms: '',
      delivery_terms: '',
      minimum_order_amount: 0,
      notes: '',
      is_active: true,
    }
  );

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSave(formData);
  };

  return (
    <Card className="mb-8">
      <CardHeader>
        <CardTitle>{supplier ? 'Modifier' : 'Nouveau'} Fournisseur</CardTitle>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="text-sm font-medium">Nom du fournisseur *</label>
              <Input
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                required
              />
            </div>
            <div>
              <label className="text-sm font-medium">Raison sociale</label>
              <Input
                value={formData.company_name || ''}
                onChange={(e) => setFormData({ ...formData, company_name: e.target.value })}
              />
            </div>
            <div>
              <label className="text-sm font-medium">Email</label>
              <Input
                type="email"
                value={formData.email || ''}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
              />
            </div>
            <div>
              <label className="text-sm font-medium">Téléphone</label>
              <Input
                value={formData.phone || ''}
                onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
              />
            </div>
            <div className="md:col-span-2">
              <label className="text-sm font-medium">Adresse</label>
              <Input
                value={formData.address || ''}
                onChange={(e) => setFormData({ ...formData, address: e.target.value })}
              />
            </div>
            <div>
              <label className="text-sm font-medium">Code postal</label>
              <Input
                value={formData.postal_code || ''}
                onChange={(e) => setFormData({ ...formData, postal_code: e.target.value })}
              />
            </div>
            <div>
              <label className="text-sm font-medium">Ville</label>
              <Input
                value={formData.city || ''}
                onChange={(e) => setFormData({ ...formData, city: e.target.value })}
              />
            </div>
            <div>
              <label className="text-sm font-medium">SIRET</label>
              <Input
                value={formData.siret || ''}
                onChange={(e) => setFormData({ ...formData, siret: e.target.value })}
              />
            </div>
            <div>
              <label className="text-sm font-medium">N° TVA</label>
              <Input
                value={formData.vat_number || ''}
                onChange={(e) => setFormData({ ...formData, vat_number: e.target.value })}
              />
            </div>
            <div>
              <label className="text-sm font-medium">Conditions de paiement</label>
              <Input
                value={formData.payment_terms || ''}
                onChange={(e) => setFormData({ ...formData, payment_terms: e.target.value })}
                placeholder="Ex: 30 jours net"
              />
            </div>
            <div>
              <label className="text-sm font-medium">Conditions de livraison</label>
              <Input
                value={formData.delivery_terms || ''}
                onChange={(e) => setFormData({ ...formData, delivery_terms: e.target.value })}
                placeholder="Ex: Franco à partir de 100€"
              />
            </div>
            <div>
              <label className="text-sm font-medium">Montant minimum de commande (€)</label>
              <Input
                type="number"
                step="0.01"
                value={formData.minimum_order_amount}
                onChange={(e) => setFormData({ ...formData, minimum_order_amount: parseFloat(e.target.value) || 0 })}
              />
            </div>
            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                checked={formData.is_active}
                onChange={(e) => setFormData({ ...formData, is_active: e.target.checked })}
                className="rounded"
              />
              <label className="text-sm font-medium">Fournisseur actif</label>
            </div>
            <div>
              <label className="text-sm font-medium">Type fournisseur</label>
              <select
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                value={formData.supplier_type || ''}
                onChange={(e) => setFormData({ ...formData, supplier_type: e.target.value })}
              >
                <option value="">Non défini</option>
                <option value="grossiste">Grossiste</option>
                <option value="fabricant">Fabricant</option>
                <option value="distributeur">Distributeur</option>
              </select>
            </div>
            <div>
              <label className="text-sm font-medium">Format source</label>
              <select
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                value={formData.format_source || ''}
                onChange={(e) => setFormData({ ...formData, format_source: e.target.value })}
              >
                <option value="">Non défini</option>
                <option value="api">API</option>
                <option value="csv">CSV</option>
                <option value="excel">Excel</option>
                <option value="edi">EDI</option>
                <option value="scraping">Scraping</option>
              </select>
            </div>
          </div>

          <div>
            <label className="text-sm font-medium">Notes</label>
            <Input
              value={formData.notes || ''}
              onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
              placeholder="Notes internes sur le fournisseur"
            />
          </div>

          <div className="flex gap-2">
            <Button type="submit" className="flex-1">
              {supplier ? 'Modifier' : 'Créer'}
            </Button>
            <Button type="button" variant="outline" onClick={onCancel}>
              Annuler
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}
