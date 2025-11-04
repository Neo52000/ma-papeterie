import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Plus, Trash2, Star, TrendingUp, TrendingDown } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useSuppliers } from "@/hooks/useSuppliers";

interface SupplierProduct {
  id: string;
  supplier_id: string;
  product_id: string;
  supplier_price: number;
  supplier_reference: string | null;
  quantity_discount: any;
  stock_quantity: number;
  lead_time_days: number;
  is_preferred: boolean;
  source_type: string;
  priority_rank: number;
  min_order_quantity: number;
  delivery_cost: number;
  free_delivery_threshold: number | null;
  payment_terms_days: number;
  suppliers: {
    name: string;
  };
}

interface SupplierComparisonProps {
  productId: string;
  productPrice: number;
}

export function SupplierComparison({ productId, productPrice }: SupplierComparisonProps) {
  const { toast } = useToast();
  const { suppliers } = useSuppliers();
  const [supplierProducts, setSupplierProducts] = useState<SupplierProduct[]>([]);
  const [isAdding, setIsAdding] = useState(false);
  const [loading, setLoading] = useState(true);

  const [newSupplier, setNewSupplier] = useState({
    supplier_id: "",
    supplier_price: 0,
    supplier_reference: "",
    source_type: "direct",
    priority_rank: 1,
    stock_quantity: 0,
    lead_time_days: 7,
    min_order_quantity: 1,
    delivery_cost: 0,
    free_delivery_threshold: null as number | null,
    payment_terms_days: 30,
  });

  useEffect(() => {
    fetchSupplierProducts();
  }, [productId]);

  const fetchSupplierProducts = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('supplier_products')
        .select('*, suppliers(name)')
        .eq('product_id', productId)
        .order('priority_rank', { ascending: true });

      if (error) throw error;
      setSupplierProducts(data || []);
    } catch (error) {
      console.error('Error fetching supplier products:', error);
      toast({
        title: "Erreur",
        description: "Impossible de charger les fournisseurs",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleAddSupplier = async () => {
    if (!newSupplier.supplier_id || newSupplier.supplier_price <= 0) {
      toast({
        title: "Erreur",
        description: "Veuillez remplir tous les champs obligatoires",
        variant: "destructive",
      });
      return;
    }

    try {
      const { error } = await supabase
        .from('supplier_products')
        .insert([{
          product_id: productId,
          ...newSupplier,
        }]);

      if (error) throw error;

      toast({
        title: "Succès",
        description: "Fournisseur ajouté",
      });

      setIsAdding(false);
      setNewSupplier({
        supplier_id: "",
        supplier_price: 0,
        supplier_reference: "",
        source_type: "direct",
        priority_rank: 1,
        stock_quantity: 0,
        lead_time_days: 7,
        min_order_quantity: 1,
        delivery_cost: 0,
        free_delivery_threshold: null,
        payment_terms_days: 30,
      });
      fetchSupplierProducts();
    } catch (error) {
      console.error('Error adding supplier:', error);
      toast({
        title: "Erreur",
        description: "Impossible d'ajouter le fournisseur",
        variant: "destructive",
      });
    }
  };

  const handleDeleteSupplier = async (id: string) => {
    if (!confirm('Êtes-vous sûr de vouloir supprimer ce fournisseur ?')) return;

    try {
      const { error } = await supabase
        .from('supplier_products')
        .delete()
        .eq('id', id);

      if (error) throw error;

      toast({
        title: "Succès",
        description: "Fournisseur supprimé",
      });
      fetchSupplierProducts();
    } catch (error) {
      console.error('Error deleting supplier:', error);
      toast({
        title: "Erreur",
        description: "Impossible de supprimer le fournisseur",
        variant: "destructive",
      });
    }
  };

  const handleTogglePreferred = async (id: string, currentValue: boolean) => {
    try {
      const { error } = await supabase
        .from('supplier_products')
        .update({ is_preferred: !currentValue })
        .eq('id', id);

      if (error) throw error;

      toast({
        title: "Succès",
        description: currentValue ? "Fournisseur retiré des préférés" : "Fournisseur marqué comme préféré",
      });
      fetchSupplierProducts();
    } catch (error) {
      console.error('Error updating supplier:', error);
      toast({
        title: "Erreur",
        description: "Impossible de mettre à jour le fournisseur",
        variant: "destructive",
      });
    }
  };

  const calculateMargin = (supplierPrice: number) => {
    if (!productPrice || !supplierPrice) return 0;
    return ((productPrice - supplierPrice) / productPrice * 100).toFixed(2);
  };

  const getBestPrice = () => {
    if (supplierProducts.length === 0) return null;
    return Math.min(...supplierProducts.map(sp => sp.supplier_price));
  };

  const bestPrice = getBestPrice();

  if (loading) {
    return <div>Chargement...</div>;
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <span>Sources d'approvisionnement ({supplierProducts.length})</span>
          <Button size="sm" onClick={() => setIsAdding(!isAdding)}>
            <Plus className="h-4 w-4 mr-2" />
            Ajouter une source
          </Button>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {isAdding && (
          <div className="border rounded-lg p-4 space-y-3 bg-muted/50">
            <h4 className="font-semibold">Nouveau fournisseur</h4>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              <div>
                <Label>Fournisseur *</Label>
                <Select value={newSupplier.supplier_id} onValueChange={(value) => setNewSupplier({ ...newSupplier, supplier_id: value })}>
                  <SelectTrigger>
                    <SelectValue placeholder="Sélectionner..." />
                  </SelectTrigger>
                  <SelectContent>
                    {suppliers.map((supplier) => (
                      <SelectItem key={supplier.id} value={supplier.id}>
                        {supplier.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Type de source *</Label>
                <Select value={newSupplier.source_type} onValueChange={(value) => setNewSupplier({ ...newSupplier, source_type: value })}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="direct">Fournisseur direct</SelectItem>
                    <SelectItem value="wholesaler">Grossiste</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Prix d'achat HT (€) *</Label>
                <Input
                  type="number"
                  step="0.01"
                  value={newSupplier.supplier_price}
                  onChange={(e) => setNewSupplier({ ...newSupplier, supplier_price: parseFloat(e.target.value) || 0 })}
                />
              </div>
              <div>
                <Label>Référence fournisseur</Label>
                <Input
                  value={newSupplier.supplier_reference}
                  onChange={(e) => setNewSupplier({ ...newSupplier, supplier_reference: e.target.value })}
                />
              </div>
              <div>
                <Label>Priorité</Label>
                <Input
                  type="number"
                  value={newSupplier.priority_rank}
                  onChange={(e) => setNewSupplier({ ...newSupplier, priority_rank: parseInt(e.target.value) || 1 })}
                />
              </div>
              <div>
                <Label>Stock fournisseur</Label>
                <Input
                  type="number"
                  value={newSupplier.stock_quantity}
                  onChange={(e) => setNewSupplier({ ...newSupplier, stock_quantity: parseInt(e.target.value) || 0 })}
                />
              </div>
              <div>
                <Label>Délai livraison (jours)</Label>
                <Input
                  type="number"
                  value={newSupplier.lead_time_days}
                  onChange={(e) => setNewSupplier({ ...newSupplier, lead_time_days: parseInt(e.target.value) || 7 })}
                />
              </div>
              <div>
                <Label>Qté min commande</Label>
                <Input
                  type="number"
                  value={newSupplier.min_order_quantity}
                  onChange={(e) => setNewSupplier({ ...newSupplier, min_order_quantity: parseInt(e.target.value) || 1 })}
                />
              </div>
              <div>
                <Label>Frais de port (€)</Label>
                <Input
                  type="number"
                  step="0.01"
                  value={newSupplier.delivery_cost}
                  onChange={(e) => setNewSupplier({ ...newSupplier, delivery_cost: parseFloat(e.target.value) || 0 })}
                />
              </div>
            </div>
            <div className="flex justify-end space-x-2">
              <Button variant="outline" onClick={() => setIsAdding(false)}>Annuler</Button>
              <Button onClick={handleAddSupplier}>Ajouter</Button>
            </div>
          </div>
        )}

        {supplierProducts.length === 0 ? (
          <p className="text-muted-foreground text-center py-4">Aucun fournisseur configuré</p>
        ) : (
          <div className="space-y-3">
            {supplierProducts.map((sp) => {
              const margin = calculateMargin(sp.supplier_price);
              const isBestPrice = sp.supplier_price === bestPrice;
              return (
                <div key={sp.id} className="border rounded-lg p-4 space-y-2">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-2">
                        <h4 className="font-semibold">{sp.suppliers.name}</h4>
                        {sp.is_preferred && <Star className="h-4 w-4 fill-yellow-400 text-yellow-400" />}
                        {isBestPrice && (
                          <Badge className="bg-green-100 text-green-800">
                            <TrendingDown className="h-3 w-3 mr-1" />
                            Meilleur prix
                          </Badge>
                        )}
                        <Badge variant={sp.source_type === 'direct' ? 'default' : 'secondary'}>
                          {sp.source_type === 'direct' ? 'Direct' : 'Grossiste'}
                        </Badge>
                        <Badge variant="outline">Priorité {sp.priority_rank}</Badge>
                      </div>
                      
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-sm">
                        <div>
                          <span className="text-muted-foreground">Prix d'achat:</span>
                          <p className="font-semibold">{sp.supplier_price.toFixed(2)} € HT</p>
                        </div>
                        <div>
                          <span className="text-muted-foreground">Marge:</span>
                          <p className="font-semibold flex items-center gap-1">
                            {Number(margin) > 0 ? (
                              <TrendingUp className="h-3 w-3 text-green-600" />
                            ) : (
                              <TrendingDown className="h-3 w-3 text-red-600" />
                            )}
                            {margin}%
                          </p>
                        </div>
                        <div>
                          <span className="text-muted-foreground">Stock:</span>
                          <p className="font-semibold">{sp.stock_quantity}</p>
                        </div>
                        <div>
                          <span className="text-muted-foreground">Délai:</span>
                          <p className="font-semibold">{sp.lead_time_days}j</p>
                        </div>
                        <div>
                          <span className="text-muted-foreground">Qté min:</span>
                          <p className="font-semibold">{sp.min_order_quantity}</p>
                        </div>
                        <div>
                          <span className="text-muted-foreground">Frais port:</span>
                          <p className="font-semibold">{sp.delivery_cost.toFixed(2)} €</p>
                        </div>
                        <div>
                          <span className="text-muted-foreground">Paiement:</span>
                          <p className="font-semibold">{sp.payment_terms_days}j</p>
                        </div>
                        {sp.supplier_reference && (
                          <div>
                            <span className="text-muted-foreground">Réf:</span>
                            <p className="font-semibold">{sp.supplier_reference}</p>
                          </div>
                        )}
                      </div>
                    </div>
                    
                    <div className="flex space-x-1">
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => handleTogglePreferred(sp.id, sp.is_preferred)}
                      >
                        <Star className={`h-4 w-4 ${sp.is_preferred ? 'fill-yellow-400 text-yellow-400' : ''}`} />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => handleDeleteSupplier(sp.id)}
                      >
                        <Trash2 className="h-4 w-4 text-destructive" />
                      </Button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
