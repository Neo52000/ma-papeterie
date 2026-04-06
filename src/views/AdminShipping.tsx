import { useState } from "react";
import { AdminLayout } from "@/components/admin/AdminLayout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Truck, Package, MapPin, Euro, Plus, Trash2, Settings, Globe, Loader2 } from "lucide-react";
import { useAdminShipping } from "@/hooks/useAdminShipping";

export default function AdminShipping() {
  const {
    zones, methods, isLoading,
    createMethod, deleteMethod, toggleMethodActive,
    deleteZone,
  } = useAdminShipping();

  const [selectedZone, setSelectedZone] = useState<string>("");
  const [isAddMethodOpen, setIsAddMethodOpen] = useState(false);
  const [newMethod, setNewMethod] = useState({
    name: "", carrier: "", method_type: "delivery",
    minWeight: 0, maxWeight: 30, baseCost: 0, costPerKg: 0,
    freeAbove: "", deliveryDaysMin: "", deliveryDaysMax: "",
  });

  // Auto-select first zone
  const activeZoneId = selectedZone || zones[0]?.id || "";
  const zoneMethods = methods.filter(m => m.zone_id === activeZoneId);

  const handleAddMethod = () => {
    if (!activeZoneId || !newMethod.name || !newMethod.carrier) return;
    createMethod.mutate({
      zone_id: activeZoneId,
      name: newMethod.name,
      carrier: newMethod.carrier,
      method_type: newMethod.method_type,
      min_weight: newMethod.minWeight,
      max_weight: newMethod.maxWeight,
      base_cost: newMethod.baseCost,
      cost_per_kg: newMethod.costPerKg,
      free_above: newMethod.freeAbove ? parseFloat(newMethod.freeAbove) : null,
      delivery_days_min: newMethod.deliveryDaysMin ? parseInt(newMethod.deliveryDaysMin) : null,
      delivery_days_max: newMethod.deliveryDaysMax ? parseInt(newMethod.deliveryDaysMax) : null,
      is_active: true,
      sort_order: zoneMethods.length + 1,
    });
    setIsAddMethodOpen(false);
    setNewMethod({ name: "", carrier: "", method_type: "delivery", minWeight: 0, maxWeight: 30, baseCost: 0, costPerKg: 0, freeAbove: "", deliveryDaysMin: "", deliveryDaysMax: "" });
  };

  if (isLoading) {
    return (
      <AdminLayout title="Gestion Expéditions" description="Configurez les zones et frais de port">
        <div className="flex items-center justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      </AdminLayout>
    );
  }

  return (
    <AdminLayout
      title="Gestion Expéditions"
      description="Configurez les zones et frais de port"
    >
      <Tabs defaultValue="methods" className="space-y-6">
        <TabsList>
          <TabsTrigger value="methods">Modes d'expédition</TabsTrigger>
          <TabsTrigger value="zones">Zones géographiques</TabsTrigger>
          <TabsTrigger value="settings">Paramètres</TabsTrigger>
        </TabsList>

        <TabsContent value="methods" className="space-y-6">
          {/* Stats Cards */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center gap-2">
                  <Truck className="h-5 w-5 text-primary" />
                  <div>
                    <p className="text-2xl font-bold">{methods.length}</p>
                    <p className="text-sm text-muted-foreground">Modes d'expédition</p>
                  </div>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center gap-2">
                  <Globe className="h-5 w-5 text-blue-500" />
                  <div>
                    <p className="text-2xl font-bold">{zones.filter(z => z.is_active).length}</p>
                    <p className="text-sm text-muted-foreground">Zones actives</p>
                  </div>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center gap-2">
                  <Euro className="h-5 w-5 text-green-500" />
                  <div>
                    <p className="text-2xl font-bold">{methods.filter(m => m.free_above != null && m.free_above > 0).length}</p>
                    <p className="text-sm text-muted-foreground">Offres port gratuit</p>
                  </div>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center gap-2">
                  <Package className="h-5 w-5 text-orange-500" />
                  <div>
                    <p className="text-2xl font-bold">{new Set(methods.map(m => m.carrier)).size}</p>
                    <p className="text-sm text-muted-foreground">Transporteurs</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Zone Selector & Methods Table */}
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div className="space-y-2">
                  <CardTitle>Modes d'expédition par zone</CardTitle>
                  {zones.length > 0 && (
                    <Select value={activeZoneId} onValueChange={setSelectedZone}>
                      <SelectTrigger className="w-64">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {zones.map((zone) => (
                          <SelectItem key={zone.id} value={zone.id}>
                            {zone.name} {!zone.is_active && "(Désactivée)"}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  )}
                </div>
                <Dialog open={isAddMethodOpen} onOpenChange={setIsAddMethodOpen}>
                  <DialogTrigger asChild>
                    <Button>
                      <Plus className="h-4 w-4 mr-2" />
                      Ajouter un mode
                    </Button>
                  </DialogTrigger>
                  <DialogContent className="max-w-md">
                    <DialogHeader>
                      <DialogTitle>Nouveau mode d'expédition</DialogTitle>
                      <DialogDescription>
                        Ajoutez un mode d'expédition pour {zones.find(z => z.id === activeZoneId)?.name}
                      </DialogDescription>
                    </DialogHeader>
                    <div className="space-y-4 py-4">
                      <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <Label>Nom</Label>
                          <Input
                            value={newMethod.name}
                            onChange={(e) => setNewMethod({...newMethod, name: e.target.value})}
                            placeholder="Colissimo Standard"
                          />
                        </div>
                        <div className="space-y-2">
                          <Label>Transporteur</Label>
                          <Input
                            value={newMethod.carrier}
                            onChange={(e) => setNewMethod({...newMethod, carrier: e.target.value})}
                            placeholder="La Poste"
                          />
                        </div>
                      </div>
                      <div className="space-y-2">
                        <Label>Type</Label>
                        <Select value={newMethod.method_type} onValueChange={(v) => setNewMethod({...newMethod, method_type: v})}>
                          <SelectTrigger><SelectValue /></SelectTrigger>
                          <SelectContent>
                            <SelectItem value="delivery">Livraison à domicile</SelectItem>
                            <SelectItem value="relay_point">Point relais</SelectItem>
                            <SelectItem value="store_pickup">Retrait en magasin</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <Label>Prix de base (€)</Label>
                          <Input
                            type="number"
                            value={newMethod.baseCost}
                            onChange={(e) => setNewMethod({...newMethod, baseCost: parseFloat(e.target.value) || 0})}
                            step="0.01"
                          />
                        </div>
                        <div className="space-y-2">
                          <Label>Prix/kg (€)</Label>
                          <Input
                            type="number"
                            value={newMethod.costPerKg}
                            onChange={(e) => setNewMethod({...newMethod, costPerKg: parseFloat(e.target.value) || 0})}
                            step="0.01"
                          />
                        </div>
                      </div>
                      <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <Label>Poids max (kg)</Label>
                          <Input
                            type="number"
                            value={newMethod.maxWeight}
                            onChange={(e) => setNewMethod({...newMethod, maxWeight: parseFloat(e.target.value) || 30})}
                          />
                        </div>
                        <div className="space-y-2">
                          <Label>Gratuit dès (€)</Label>
                          <Input
                            type="number"
                            value={newMethod.freeAbove}
                            onChange={(e) => setNewMethod({...newMethod, freeAbove: e.target.value})}
                            placeholder="Optionnel"
                          />
                        </div>
                      </div>
                      <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <Label>Délai min (jours)</Label>
                          <Input
                            type="number"
                            value={newMethod.deliveryDaysMin}
                            onChange={(e) => setNewMethod({...newMethod, deliveryDaysMin: e.target.value})}
                            placeholder="2"
                          />
                        </div>
                        <div className="space-y-2">
                          <Label>Délai max (jours)</Label>
                          <Input
                            type="number"
                            value={newMethod.deliveryDaysMax}
                            onChange={(e) => setNewMethod({...newMethod, deliveryDaysMax: e.target.value})}
                            placeholder="4"
                          />
                        </div>
                      </div>
                      <Button onClick={handleAddMethod} className="w-full" disabled={createMethod.isPending}>
                        {createMethod.isPending ? "Ajout..." : "Ajouter"}
                      </Button>
                    </div>
                  </DialogContent>
                </Dialog>
              </div>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Nom</TableHead>
                    <TableHead>Type</TableHead>
                    <TableHead>Transporteur</TableHead>
                    <TableHead>Prix base</TableHead>
                    <TableHead>Prix/kg</TableHead>
                    <TableHead>Poids max</TableHead>
                    <TableHead>Gratuit dès</TableHead>
                    <TableHead>Délai</TableHead>
                    <TableHead>Actif</TableHead>
                    <TableHead className="w-20">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {zoneMethods.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={10} className="text-center py-8 text-muted-foreground">
                        Aucun mode d'expédition pour cette zone.
                      </TableCell>
                    </TableRow>
                  ) : zoneMethods.map((method) => (
                    <TableRow key={method.id}>
                      <TableCell className="font-medium">{method.name}</TableCell>
                      <TableCell>
                        <Badge variant="outline" className="text-xs">
                          {method.method_type === "store_pickup" ? "Retrait" : method.method_type === "relay_point" ? "Relais" : "Domicile"}
                        </Badge>
                      </TableCell>
                      <TableCell>{method.carrier}</TableCell>
                      <TableCell>{method.base_cost.toFixed(2)} €</TableCell>
                      <TableCell>{method.cost_per_kg.toFixed(2)} €</TableCell>
                      <TableCell>{method.max_weight} kg</TableCell>
                      <TableCell>
                        {method.free_above != null && method.free_above > 0 ? (
                          <Badge variant="secondary" className="bg-green-100 text-green-800">
                            {method.free_above} €
                          </Badge>
                        ) : method.method_type === "store_pickup" ? (
                          <Badge variant="secondary" className="bg-blue-100 text-blue-800">Gratuit</Badge>
                        ) : (
                          <span className="text-muted-foreground">-</span>
                        )}
                      </TableCell>
                      <TableCell>
                        {method.method_type === "store_pickup"
                          ? "Immédiat"
                          : method.delivery_days_min != null && method.delivery_days_max != null
                            ? `${method.delivery_days_min}-${method.delivery_days_max}j`
                            : "-"}
                      </TableCell>
                      <TableCell>
                        <Switch
                          checked={method.is_active}
                          onCheckedChange={(val) => toggleMethodActive.mutate({ id: method.id, is_active: val })}
                        />
                      </TableCell>
                      <TableCell>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => deleteMethod.mutate(method.id)}
                        >
                          <Trash2 className="h-4 w-4 text-destructive" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="zones" className="space-y-6">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>Zones géographiques</CardTitle>
                  <CardDescription>Gérez les zones de livraison</CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Zone</TableHead>
                    <TableHead>Pays</TableHead>
                    <TableHead>Modes d'expédition</TableHead>
                    <TableHead>Statut</TableHead>
                    <TableHead className="w-20">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {zones.map((zone) => (
                    <TableRow key={zone.id}>
                      <TableCell className="font-medium">
                        <div className="flex items-center gap-2">
                          <MapPin className="h-4 w-4 text-muted-foreground" />
                          {zone.name}
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex gap-1 flex-wrap">
                          {zone.countries.map((country) => (
                            <Badge key={country} variant="outline" className="text-xs">
                              {country}
                            </Badge>
                          ))}
                        </div>
                      </TableCell>
                      <TableCell>
                        {methods.filter(m => m.zone_id === zone.id).length} modes
                      </TableCell>
                      <TableCell>
                        <Badge variant={zone.is_active ? "default" : "secondary"}>
                          {zone.is_active ? "Active" : "Inactive"}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => deleteZone.mutate(zone.id)}
                        >
                          <Trash2 className="h-4 w-4 text-destructive" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="settings" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Settings className="h-5 w-5" />
                Paramètres généraux d'expédition
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-4">
                  <h4 className="font-medium">Informations</h4>
                  <p className="text-sm text-muted-foreground">
                    Les seuils de franco de port sont configurés individuellement sur chaque mode d'expédition.
                    Le seuil actuel pour Colissimo et Mondial Relay est de <strong>89€ TTC</strong>.
                  </p>
                  <p className="text-sm text-muted-foreground">
                    Le retrait en magasin est toujours gratuit.
                  </p>
                </div>
                <div className="space-y-4">
                  <h4 className="font-medium">Adresse du magasin</h4>
                  <p className="text-sm text-muted-foreground">
                    Ma Papeterie<br />
                    Chaumont (52000)<br />
                    Haute-Marne
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </AdminLayout>
  );
}
