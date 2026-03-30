import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { AdminLayout } from "@/components/admin/AdminLayout";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useAuth } from "@/contexts/AuthContext";
import { useSuppliers } from "@/hooks/useSuppliers";
import { SupplierForm } from "@/components/suppliers/SupplierForm";
import { SupplierCard } from "@/components/suppliers/SupplierCard";
import { SupplierPricingImport } from "@/components/suppliers/SupplierPricingImport";
import { SupplierProducts } from "@/components/suppliers/SupplierProducts";
import { ReorderOptimization } from "@/components/suppliers/ReorderOptimization";
import { ImportLogsHistory } from "@/components/suppliers/ImportLogsHistory";
import { Plus, Building2, Package, Sparkles, History } from "lucide-react";
import { toast } from "sonner";
import type { Supplier } from "@/types/supplier";

export default function AdminSuppliers() {
  const navigate = useNavigate();
  const { user, isLoading: authLoading, isSuperAdmin } = useAuth();
  const { suppliers, loading, createSupplier, updateSupplier, deleteSupplier } = useSuppliers();

  const [editingSupplier, setEditingSupplier] = useState<Supplier | null>(null);
  const [isCreating, setIsCreating] = useState(false);
  const [selectedSupplier, setSelectedSupplier] = useState<string | null>(null);
  const [productsRefreshKey, setProductsRefreshKey] = useState(0);
  const [logsRefreshKey, setLogsRefreshKey] = useState(0);

  useEffect(() => {
    if (!authLoading && (!user || !isSuperAdmin)) {
      navigate('/auth');
    }
  }, [authLoading, user, isSuperAdmin, navigate]);

  const handleSaveSupplier = async (supplier: Partial<Supplier>) => {
    if (editingSupplier) {
      const { error } = await updateSupplier(editingSupplier.id, supplier);
      if (!error) {
        toast.success("Fournisseur modifié avec succès");
        setEditingSupplier(null);
      } else {
        toast.error("Erreur", { description: "Impossible de modifier le fournisseur" });
      }
    } else {
      if (!supplier.name) {
        toast.error("Erreur", { description: "Le nom du fournisseur est requis" });
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
        toast.success("Fournisseur créé avec succès");
        setIsCreating(false);
      } else {
        toast.error("Erreur", { description: "Impossible de créer le fournisseur" });
      }
    }
  };

  const handleDeleteSupplier = async (id: string) => {
    if (confirm('Êtes-vous sûr de vouloir supprimer ce fournisseur ?')) {
      const { error } = await deleteSupplier(id);
      if (!error) {
        toast.success("Fournisseur supprimé avec succès");
        if (selectedSupplier === id) {
          setSelectedSupplier(null);
        }
      } else {
        toast.error("Erreur", { description: "Impossible de supprimer le fournisseur" });
      }
    }
  };

  if (authLoading || loading) {
    return (
      <AdminLayout title="Gestion des Fournisseurs" description="Interface Super Admin - ERP Fournisseurs">
        <div className="text-center">Chargement...</div>
      </AdminLayout>
    );
  }

  if (!user || !isSuperAdmin) {
    return null;
  }

  const selectedSupplierData = suppliers.find(s => s.id === selectedSupplier);

  return (
    <AdminLayout title="Gestion des Fournisseurs" description="Interface Super Admin - ERP Fournisseurs">
      <Tabs defaultValue="suppliers" className="space-y-6">
        <TabsList>
          <TabsTrigger value="suppliers">Fournisseurs</TabsTrigger>
          {selectedSupplier && (
            <>
              <TabsTrigger value="products">
                <Package className="h-4 w-4 mr-2" />
                Produits ({selectedSupplierData?.name})
              </TabsTrigger>
              <TabsTrigger value="import">Import Catalogue</TabsTrigger>
            </>
          )}
          <TabsTrigger value="optimization">
            <Sparkles className="h-4 w-4 mr-2" />
            Optimisation IA
          </TabsTrigger>
          <TabsTrigger value="history">
            <History className="h-4 w-4 mr-2" />
            Historique Imports
          </TabsTrigger>
        </TabsList>

        <TabsContent value="suppliers" className="space-y-6">
          <div className="flex justify-between items-center">
            <div>
              {selectedSupplier && selectedSupplierData && (
                <div className="mb-4">
                  <Badge variant="outline" className="text-sm">
                    Sélectionné : {selectedSupplierData.name}
                  </Badge>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setSelectedSupplier(null)}
                    className="ml-2"
                  >
                    Désélectionner
                  </Button>
                </div>
              )}
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
              <SupplierCard
                key={supplier.id}
                supplier={supplier}
                isSelected={selectedSupplier === supplier.id}
                onSelect={setSelectedSupplier}
                onEdit={setEditingSupplier}
                onDelete={handleDeleteSupplier}
              />
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
        </TabsContent>

        <TabsContent value="products">
          {selectedSupplier && (
            <SupplierProducts
              key={`sp-${selectedSupplier}-${productsRefreshKey}`}
              supplierId={selectedSupplier}
              supplierName={selectedSupplierData?.name ?? ''}
            />
          )}
        </TabsContent>

        <TabsContent value="import">
          {selectedSupplier && (
            <SupplierPricingImport
              supplierId={selectedSupplier}
              onImportComplete={() => {
                toast.success("Import terminé avec succès");
                setProductsRefreshKey(k => k + 1);
                setLogsRefreshKey(k => k + 1);
              }}
            />
          )}
        </TabsContent>

        <TabsContent value="optimization">
          <ReorderOptimization />
        </TabsContent>

        <TabsContent value="history">
          <ImportLogsHistory key={`logs-${logsRefreshKey}`} supplierId={selectedSupplier || undefined} />
        </TabsContent>
      </Tabs>
    </AdminLayout>
  );
}
