import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import Header from "@/components/layout/Header";
import Footer from "@/components/layout/Footer";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useAuth } from "@/contexts/AuthContext";
import { useSuppliers, Supplier } from "@/hooks/useSuppliers";
import { Plus, Edit, Trash2, Building2, Phone, Mail, MapPin } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

export default function AdminSuppliers() {
  const navigate = useNavigate();
  const { user, isLoading: authLoading, isSuperAdmin } = useAuth();
  const { suppliers, loading, createSupplier, updateSupplier, deleteSupplier } = useSuppliers();
  const { toast } = useToast();
  
  const [editingSupplier, setEditingSupplier] = useState<Supplier | null>(null);
  const [isCreating, setIsCreating] = useState(false);

  useEffect(() => {
    if (!authLoading && (!user || !isSuperAdmin)) {
      navigate('/auth');
    }
  }, [authLoading, user, isSuperAdmin, navigate]);

  const handleSaveSupplier = async (supplier: Partial<Supplier>) => {
    if (editingSupplier) {
      const { error } = await updateSupplier(editingSupplier.id, supplier);
      if (!error) {
        toast({ title: "Fournisseur modifié avec succès" });
        setEditingSupplier(null);
      } else {
        toast({ title: "Erreur", description: "Impossible de modifier le fournisseur", variant: "destructive" });
      }
    } else {
      if (!supplier.name) {
        toast({ title: "Erreur", description: "Le nom du fournisseur est requis", variant: "destructive" });
        return;
      }
      const newSupplier: Omit<Supplier, 'id' | 'created_at' | 'updated_at'> = {
        name: supplier.name,
        company_name: supplier.company_name || null,
        email: supplier.email || null,
        phone: supplier.phone || null,
        address: supplier.address || null,
        postal_code: supplier.postal_code || null,
        city: supplier.city || null,
        country: supplier.country || 'France',
        siret: supplier.siret || null,
        vat_number: supplier.vat_number || null,
        payment_terms: supplier.payment_terms || null,
        delivery_terms: supplier.delivery_terms || null,
        minimum_order_amount: supplier.minimum_order_amount || 0,
        notes: supplier.notes || null,
        is_active: supplier.is_active ?? true,
      };
      const { error } = await createSupplier(newSupplier);
      if (!error) {
        toast({ title: "Fournisseur créé avec succès" });
        setIsCreating(false);
      } else {
        toast({ title: "Erreur", description: "Impossible de créer le fournisseur", variant: "destructive" });
      }
    }
  };

  const handleDeleteSupplier = async (id: string) => {
    if (confirm('Êtes-vous sûr de vouloir supprimer ce fournisseur ?')) {
      const { error } = await deleteSupplier(id);
      if (!error) {
        toast({ title: "Fournisseur supprimé avec succès" });
      } else {
        toast({ title: "Erreur", description: "Impossible de supprimer le fournisseur", variant: "destructive" });
      }
    }
  };

  if (authLoading || loading) {
    return <div className="min-h-screen flex items-center justify-center">Chargement...</div>;
  }

  if (!user || !isSuperAdmin) {
    return null;
  }

  return (
    <div className="min-h-screen bg-background">
      <Header />
      
      <main className="container mx-auto px-4 py-8">
        <div className="mb-8 flex justify-between items-center">
          <div>
            <h1 className="text-4xl font-bold text-primary mb-2">Gestion des Fournisseurs</h1>
            <p className="text-muted-foreground">Interface Super Admin - ERP Fournisseurs</p>
          </div>
          <Button onClick={() => setIsCreating(true)} className="flex items-center gap-2">
            <Plus className="h-4 w-4" />
            Nouveau Fournisseur
          </Button>
        </div>

        {(isCreating || editingSupplier) && (
          <SupplierForm
            supplier={editingSupplier}
            onSave={handleSaveSupplier}
            onCancel={() => {
              setIsCreating(false);
              setEditingSupplier(null);
            }}
          />
        )}

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {suppliers.map((supplier) => (
            <Card key={supplier.id}>
              <CardHeader>
                <div className="flex justify-between items-start">
                  <div className="flex items-center gap-2">
                    <Building2 className="h-5 w-5 text-primary" />
                    <CardTitle className="text-lg">{supplier.name}</CardTitle>
                  </div>
                  <Badge variant={supplier.is_active ? "default" : "secondary"}>
                    {supplier.is_active ? "Actif" : "Inactif"}
                  </Badge>
                </div>
              </CardHeader>
              <CardContent className="space-y-3">
                {supplier.company_name && (
                  <p className="text-sm text-muted-foreground">{supplier.company_name}</p>
                )}
                
                {supplier.email && (
                  <div className="flex items-center gap-2 text-sm">
                    <Mail className="h-4 w-4 text-muted-foreground" />
                    <span>{supplier.email}</span>
                  </div>
                )}
                
                {supplier.phone && (
                  <div className="flex items-center gap-2 text-sm">
                    <Phone className="h-4 w-4 text-muted-foreground" />
                    <span>{supplier.phone}</span>
                  </div>
                )}
                
                {supplier.city && (
                  <div className="flex items-center gap-2 text-sm">
                    <MapPin className="h-4 w-4 text-muted-foreground" />
                    <span>{supplier.postal_code} {supplier.city}</span>
                  </div>
                )}

                {supplier.minimum_order_amount > 0 && (
                  <div className="text-sm">
                    <span className="text-muted-foreground">Commande min: </span>
                    <span className="font-semibold">{supplier.minimum_order_amount}€</span>
                  </div>
                )}

                <div className="flex gap-2 pt-4">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setEditingSupplier(supplier)}
                    className="flex-1"
                  >
                    <Edit className="h-4 w-4 mr-1" />
                    Modifier
                  </Button>
                  <Button
                    variant="destructive"
                    size="sm"
                    onClick={() => handleDeleteSupplier(supplier.id)}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        {suppliers.length === 0 && !isCreating && (
          <div className="text-center py-12">
            <Building2 className="h-16 w-16 mx-auto text-muted-foreground mb-4" />
            <h3 className="text-xl font-semibold mb-2">Aucun fournisseur</h3>
            <p className="text-muted-foreground mb-4">
              Commencez par ajouter votre premier fournisseur
            </p>
            <Button onClick={() => setIsCreating(true)}>
              <Plus className="h-4 w-4 mr-2" />
              Ajouter un fournisseur
            </Button>
          </div>
        )}
      </main>

      <Footer />
    </div>
  );
}

interface SupplierFormProps {
  supplier: Supplier | null;
  onSave: (supplier: Partial<Supplier>) => void;
  onCancel: () => void;
}

function SupplierForm({ supplier, onSave, onCancel }: SupplierFormProps) {
  const [formData, setFormData] = useState<Partial<Supplier>>(
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
