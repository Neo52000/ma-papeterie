import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Plus, Trash2, AlertTriangle, Package } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface StockLocation {
  id: string;
  product_id: string;
  location_type: string;
  location_name: string;
  supplier_id: string | null;
  stock_quantity: number;
  min_stock_alert: number;
  reorder_point: number;
  last_inventory_date: string | null;
  notes: string | null;
}

interface StockLocationsProps {
  productId: string;
}

export function StockLocations({ productId }: StockLocationsProps) {
  const { toast } = useToast();
  const [stockLocations, setStockLocations] = useState<StockLocation[]>([]);
  const [isAdding, setIsAdding] = useState(false);
  const [loading, setLoading] = useState(true);

  const [newLocation, setNewLocation] = useState({
    location_type: "store",
    location_name: "Magasin principal",
    stock_quantity: 0,
    min_stock_alert: 10,
    reorder_point: 20,
    notes: "",
  });

  useEffect(() => {
    fetchStockLocations();
  }, [productId]);

  const fetchStockLocations = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('product_stock_locations')
        .select('*')
        .eq('product_id', productId)
        .order('location_type', { ascending: true });

      if (error) throw error;
      setStockLocations(data || []);
    } catch (error) {
      console.error('Error fetching stock locations:', error);
      toast({
        title: "Erreur",
        description: "Impossible de charger les emplacements de stock",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleAddLocation = async () => {
    if (!newLocation.location_name) {
      toast({
        title: "Erreur",
        description: "Veuillez remplir le nom de l'emplacement",
        variant: "destructive",
      });
      return;
    }

    try {
      const { error } = await supabase
        .from('product_stock_locations')
        .insert([{
          product_id: productId,
          ...newLocation,
        }]);

      if (error) throw error;

      toast({
        title: "Succès",
        description: "Emplacement de stock ajouté",
      });

      setIsAdding(false);
      setNewLocation({
        location_type: "store",
        location_name: "Magasin principal",
        stock_quantity: 0,
        min_stock_alert: 10,
        reorder_point: 20,
        notes: "",
      });
      fetchStockLocations();
    } catch (error) {
      console.error('Error adding location:', error);
      toast({
        title: "Erreur",
        description: "Impossible d'ajouter l'emplacement de stock",
        variant: "destructive",
      });
    }
  };

  const handleDeleteLocation = async (id: string) => {
    if (!confirm('Êtes-vous sûr de vouloir supprimer cet emplacement ?')) return;

    try {
      const { error } = await supabase
        .from('product_stock_locations')
        .delete()
        .eq('id', id);

      if (error) throw error;

      toast({
        title: "Succès",
        description: "Emplacement supprimé",
      });
      fetchStockLocations();
    } catch (error) {
      console.error('Error deleting location:', error);
      toast({
        title: "Erreur",
        description: "Impossible de supprimer l'emplacement",
        variant: "destructive",
      });
    }
  };

  const handleUpdateStock = async (id: string, newQuantity: number) => {
    try {
      const { error } = await supabase
        .from('product_stock_locations')
        .update({ 
          stock_quantity: newQuantity,
          last_inventory_date: new Date().toISOString(),
        })
        .eq('id', id);

      if (error) throw error;

      toast({
        title: "Succès",
        description: "Stock mis à jour",
      });
      fetchStockLocations();
    } catch (error) {
      console.error('Error updating stock:', error);
      toast({
        title: "Erreur",
        description: "Impossible de mettre à jour le stock",
        variant: "destructive",
      });
    }
  };

  const getLocationTypeLabel = (type: string) => {
    const labels: Record<string, string> = {
      store: "Magasin",
      supplier: "Fournisseur",
      wholesaler_1: "Grossiste 1",
      wholesaler_2: "Grossiste 2",
    };
    return labels[type] || type;
  };

  const getLocationTypeColor = (type: string) => {
    const colors: Record<string, string> = {
      store: "bg-blue-100 text-blue-800",
      supplier: "bg-green-100 text-green-800",
      wholesaler_1: "bg-purple-100 text-purple-800",
      wholesaler_2: "bg-orange-100 text-orange-800",
    };
    return colors[type] || "bg-gray-100 text-gray-800";
  };

  const getTotalStock = () => {
    return stockLocations.reduce((sum, loc) => sum + loc.stock_quantity, 0);
  };

  if (loading) {
    return <div>Chargement...</div>;
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Package className="h-5 w-5" />
            <span>Stocks multi-emplacements</span>
            <Badge variant="secondary">{getTotalStock()} unités au total</Badge>
          </div>
          <Button size="sm" onClick={() => setIsAdding(!isAdding)}>
            <Plus className="h-4 w-4 mr-2" />
            Ajouter un emplacement
          </Button>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {isAdding && (
          <div className="border rounded-lg p-4 space-y-3 bg-muted/50">
            <h4 className="font-semibold">Nouvel emplacement</h4>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              <div>
                <Label>Type d'emplacement *</Label>
                <Select value={newLocation.location_type} onValueChange={(value) => setNewLocation({ ...newLocation, location_type: value })}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="store">Magasin</SelectItem>
                    <SelectItem value="supplier">Fournisseur</SelectItem>
                    <SelectItem value="wholesaler_1">Grossiste 1</SelectItem>
                    <SelectItem value="wholesaler_2">Grossiste 2</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Nom de l'emplacement *</Label>
                <Input
                  value={newLocation.location_name}
                  onChange={(e) => setNewLocation({ ...newLocation, location_name: e.target.value })}
                  placeholder="Ex: Magasin principal, Entrepôt A..."
                />
              </div>
              <div>
                <Label>Stock initial</Label>
                <Input
                  type="number"
                  value={newLocation.stock_quantity}
                  onChange={(e) => setNewLocation({ ...newLocation, stock_quantity: parseInt(e.target.value) || 0 })}
                />
              </div>
              <div>
                <Label>Alerte stock minimum</Label>
                <Input
                  type="number"
                  value={newLocation.min_stock_alert}
                  onChange={(e) => setNewLocation({ ...newLocation, min_stock_alert: parseInt(e.target.value) || 10 })}
                />
              </div>
              <div>
                <Label>Point de réappro</Label>
                <Input
                  type="number"
                  value={newLocation.reorder_point}
                  onChange={(e) => setNewLocation({ ...newLocation, reorder_point: parseInt(e.target.value) || 20 })}
                />
              </div>
            </div>
            <div>
              <Label>Notes</Label>
              <Input
                value={newLocation.notes}
                onChange={(e) => setNewLocation({ ...newLocation, notes: e.target.value })}
                placeholder="Notes sur cet emplacement..."
              />
            </div>
            <div className="flex justify-end space-x-2">
              <Button variant="outline" onClick={() => setIsAdding(false)}>Annuler</Button>
              <Button onClick={handleAddLocation}>Ajouter</Button>
            </div>
          </div>
        )}

        {stockLocations.length === 0 ? (
          <p className="text-muted-foreground text-center py-4">Aucun emplacement de stock configuré</p>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {stockLocations.map((location) => {
              const isLowStock = location.stock_quantity <= location.min_stock_alert;
              const needsReorder = location.stock_quantity <= location.reorder_point;
              
              return (
                <div key={location.id} className="border rounded-lg p-4 space-y-3">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-2">
                        <Badge className={getLocationTypeColor(location.location_type)}>
                          {getLocationTypeLabel(location.location_type)}
                        </Badge>
                        {isLowStock && (
                          <Badge variant="destructive" className="flex items-center gap-1">
                            <AlertTriangle className="h-3 w-3" />
                            Stock faible
                          </Badge>
                        )}
                        {needsReorder && !isLowStock && (
                          <Badge className="bg-orange-100 text-orange-800">
                            Réappro suggéré
                          </Badge>
                        )}
                      </div>
                      <h4 className="font-semibold">{location.location_name}</h4>
                    </div>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => handleDeleteLocation(location.id)}
                    >
                      <Trash2 className="h-4 w-4 text-destructive" />
                    </Button>
                  </div>

                  <div className="space-y-2">
                    <div>
                      <Label className="text-xs">Stock actuel</Label>
                      <div className="flex gap-2">
                        <Input
                          type="number"
                          value={location.stock_quantity}
                          onChange={(e) => handleUpdateStock(location.id, parseInt(e.target.value) || 0)}
                          className="flex-1"
                        />
                        <span className="flex items-center text-sm text-muted-foreground">unités</span>
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-2 text-sm">
                      <div>
                        <span className="text-muted-foreground text-xs">Alerte:</span>
                        <p className="font-semibold">{location.min_stock_alert}</p>
                      </div>
                      <div>
                        <span className="text-muted-foreground text-xs">Point réappro:</span>
                        <p className="font-semibold">{location.reorder_point}</p>
                      </div>
                    </div>

                    {location.last_inventory_date && (
                      <div className="text-xs text-muted-foreground">
                        Dernier inventaire: {new Date(location.last_inventory_date).toLocaleDateString('fr-FR')}
                      </div>
                    )}

                    {location.notes && (
                      <div className="text-xs text-muted-foreground italic">
                        {location.notes}
                      </div>
                    )}
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
