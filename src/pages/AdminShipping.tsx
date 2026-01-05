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
import { Truck, Package, MapPin, Euro, Plus, Edit, Trash2, Settings, Globe } from "lucide-react";
import { toast } from "sonner";

interface ShippingZone {
  id: string;
  name: string;
  countries: string[];
  isActive: boolean;
}

interface ShippingMethod {
  id: string;
  zoneId: string;
  name: string;
  carrier: string;
  minWeight: number;
  maxWeight: number;
  baseCost: number;
  costPerKg: number;
  freeAbove: number | null;
  deliveryDays: string;
  isActive: boolean;
}

const initialZones: ShippingZone[] = [
  { id: "1", name: "France Métropolitaine", countries: ["FR"], isActive: true },
  { id: "2", name: "Europe Zone 1", countries: ["DE", "BE", "LU", "NL"], isActive: true },
  { id: "3", name: "Europe Zone 2", countries: ["ES", "IT", "PT", "AT", "CH"], isActive: true },
  { id: "4", name: "DOM-TOM", countries: ["GP", "MQ", "GF", "RE", "YT"], isActive: false },
];

const initialMethods: ShippingMethod[] = [
  { id: "1", zoneId: "1", name: "Colissimo Standard", carrier: "La Poste", minWeight: 0, maxWeight: 30, baseCost: 4.95, costPerKg: 0.5, freeAbove: 49, deliveryDays: "2-4", isActive: true },
  { id: "2", zoneId: "1", name: "Colissimo Express", carrier: "La Poste", minWeight: 0, maxWeight: 30, baseCost: 8.95, costPerKg: 0.8, freeAbove: null, deliveryDays: "1-2", isActive: true },
  { id: "3", zoneId: "1", name: "Mondial Relay", carrier: "Mondial Relay", minWeight: 0, maxWeight: 20, baseCost: 3.95, costPerKg: 0.3, freeAbove: 35, deliveryDays: "3-5", isActive: true },
  { id: "4", zoneId: "1", name: "Chronopost", carrier: "Chronopost", minWeight: 0, maxWeight: 30, baseCost: 12.95, costPerKg: 1.2, freeAbove: null, deliveryDays: "24h", isActive: true },
  { id: "5", zoneId: "2", name: "DPD Europe", carrier: "DPD", minWeight: 0, maxWeight: 30, baseCost: 9.95, costPerKg: 1.0, freeAbove: 99, deliveryDays: "3-5", isActive: true },
  { id: "6", zoneId: "3", name: "UPS Standard", carrier: "UPS", minWeight: 0, maxWeight: 30, baseCost: 14.95, costPerKg: 1.5, freeAbove: null, deliveryDays: "4-7", isActive: true },
];

export default function AdminShipping() {
  const [zones, setZones] = useState<ShippingZone[]>(initialZones);
  const [methods, setMethods] = useState<ShippingMethod[]>(initialMethods);
  const [selectedZone, setSelectedZone] = useState<string>("1");
  const [isAddMethodOpen, setIsAddMethodOpen] = useState(false);
  const [editingMethod, setEditingMethod] = useState<ShippingMethod | null>(null);

  // Form state
  const [newMethod, setNewMethod] = useState({
    name: "",
    carrier: "",
    minWeight: 0,
    maxWeight: 30,
    baseCost: 0,
    costPerKg: 0,
    freeAbove: "",
    deliveryDays: "",
  });

  const zoneMethods = methods.filter(m => m.zoneId === selectedZone);

  const handleAddMethod = () => {
    const method: ShippingMethod = {
      id: Date.now().toString(),
      zoneId: selectedZone,
      name: newMethod.name,
      carrier: newMethod.carrier,
      minWeight: newMethod.minWeight,
      maxWeight: newMethod.maxWeight,
      baseCost: newMethod.baseCost,
      costPerKg: newMethod.costPerKg,
      freeAbove: newMethod.freeAbove ? parseFloat(newMethod.freeAbove) : null,
      deliveryDays: newMethod.deliveryDays,
      isActive: true,
    };
    setMethods([...methods, method]);
    setIsAddMethodOpen(false);
    setNewMethod({ name: "", carrier: "", minWeight: 0, maxWeight: 30, baseCost: 0, costPerKg: 0, freeAbove: "", deliveryDays: "" });
    toast.success("Mode d'expédition ajouté");
  };

  const toggleMethodStatus = (methodId: string) => {
    setMethods(methods.map(m => 
      m.id === methodId ? { ...m, isActive: !m.isActive } : m
    ));
  };

  const deleteMethod = (methodId: string) => {
    setMethods(methods.filter(m => m.id !== methodId));
    toast.success("Mode d'expédition supprimé");
  };

  const toggleZoneStatus = (zoneId: string) => {
    setZones(zones.map(z => 
      z.id === zoneId ? { ...z, isActive: !z.isActive } : z
    ));
  };

  return (
    <AdminLayout 
      title="Gestion Expéditions" 
      description="Configurez les zones et frais de port"
    >
      <Tabs defaultValue="methods" className="space-y-6">
        <TabsList>
          <TabsTrigger value="methods">Modes d'expédition</TabsTrigger>
          <TabsTrigger value="zones">Zones géographiques</TabsTrigger>
          <TabsTrigger value="carriers">Transporteurs</TabsTrigger>
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
                    <p className="text-2xl font-bold">{zones.filter(z => z.isActive).length}</p>
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
                    <p className="text-2xl font-bold">{methods.filter(m => m.freeAbove).length}</p>
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
                  <Select value={selectedZone} onValueChange={setSelectedZone}>
                    <SelectTrigger className="w-64">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {zones.map((zone) => (
                        <SelectItem key={zone.id} value={zone.id}>
                          {zone.name} {!zone.isActive && "(Désactivée)"}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
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
                        Ajoutez un mode d'expédition pour {zones.find(z => z.id === selectedZone)?.name}
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
                      <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <Label>Prix de base (€)</Label>
                          <Input 
                            type="number"
                            value={newMethod.baseCost}
                            onChange={(e) => setNewMethod({...newMethod, baseCost: parseFloat(e.target.value)})}
                            step="0.01"
                          />
                        </div>
                        <div className="space-y-2">
                          <Label>Prix/kg (€)</Label>
                          <Input 
                            type="number"
                            value={newMethod.costPerKg}
                            onChange={(e) => setNewMethod({...newMethod, costPerKg: parseFloat(e.target.value)})}
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
                            onChange={(e) => setNewMethod({...newMethod, maxWeight: parseFloat(e.target.value)})}
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
                      <div className="space-y-2">
                        <Label>Délai de livraison</Label>
                        <Input 
                          value={newMethod.deliveryDays}
                          onChange={(e) => setNewMethod({...newMethod, deliveryDays: e.target.value})}
                          placeholder="2-4 jours"
                        />
                      </div>
                      <Button onClick={handleAddMethod} className="w-full">
                        Ajouter
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
                  {zoneMethods.map((method) => (
                    <TableRow key={method.id}>
                      <TableCell className="font-medium">{method.name}</TableCell>
                      <TableCell>{method.carrier}</TableCell>
                      <TableCell>{method.baseCost.toFixed(2)} €</TableCell>
                      <TableCell>{method.costPerKg.toFixed(2)} €</TableCell>
                      <TableCell>{method.maxWeight} kg</TableCell>
                      <TableCell>
                        {method.freeAbove ? (
                          <Badge variant="secondary" className="bg-green-100 text-green-800">
                            {method.freeAbove} €
                          </Badge>
                        ) : (
                          <span className="text-muted-foreground">-</span>
                        )}
                      </TableCell>
                      <TableCell>{method.deliveryDays}</TableCell>
                      <TableCell>
                        <Switch 
                          checked={method.isActive}
                          onCheckedChange={() => toggleMethodStatus(method.id)}
                        />
                      </TableCell>
                      <TableCell>
                        <div className="flex gap-1">
                          <Button variant="ghost" size="icon">
                            <Edit className="h-4 w-4" />
                          </Button>
                          <Button 
                            variant="ghost" 
                            size="icon" 
                            onClick={() => deleteMethod(method.id)}
                          >
                            <Trash2 className="h-4 w-4 text-destructive" />
                          </Button>
                        </div>
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
                <Button>
                  <Plus className="h-4 w-4 mr-2" />
                  Nouvelle zone
                </Button>
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
                        {methods.filter(m => m.zoneId === zone.id).length} modes
                      </TableCell>
                      <TableCell>
                        <Switch 
                          checked={zone.isActive}
                          onCheckedChange={() => toggleZoneStatus(zone.id)}
                        />
                      </TableCell>
                      <TableCell>
                        <div className="flex gap-1">
                          <Button variant="ghost" size="icon">
                            <Edit className="h-4 w-4" />
                          </Button>
                          <Button variant="ghost" size="icon">
                            <Trash2 className="h-4 w-4 text-destructive" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="carriers" className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {[
              { name: "La Poste / Colissimo", logo: "🇫🇷", services: 2, active: true },
              { name: "Mondial Relay", logo: "📦", services: 1, active: true },
              { name: "Chronopost", logo: "⚡", services: 1, active: true },
              { name: "DPD", logo: "🚚", services: 1, active: true },
              { name: "UPS", logo: "📮", services: 1, active: true },
              { name: "DHL", logo: "✈️", services: 0, active: false },
            ].map((carrier) => (
              <Card key={carrier.name}>
                <CardContent className="pt-6">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <span className="text-2xl">{carrier.logo}</span>
                      <div>
                        <h4 className="font-medium">{carrier.name}</h4>
                        <p className="text-sm text-muted-foreground">{carrier.services} service(s) actif(s)</p>
                      </div>
                    </div>
                    <Switch checked={carrier.active} />
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
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
                  <h4 className="font-medium">Règles générales</h4>
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <div>
                        <Label>Livraison gratuite globale</Label>
                        <p className="text-sm text-muted-foreground">Activer la livraison gratuite au-dessus d'un montant</p>
                      </div>
                      <Switch defaultChecked />
                    </div>
                    <div className="space-y-2">
                      <Label>Seuil franco de port (€)</Label>
                      <Input type="number" defaultValue="49" />
                    </div>
                    <div className="space-y-2">
                      <Label>Délai de préparation (jours)</Label>
                      <Input type="number" defaultValue="1" />
                    </div>
                  </div>
                </div>
                <div className="space-y-4">
                  <h4 className="font-medium">Emballage</h4>
                  <div className="space-y-3">
                    <div className="space-y-2">
                      <Label>Poids emballage par défaut (g)</Label>
                      <Input type="number" defaultValue="100" />
                    </div>
                    <div className="space-y-2">
                      <Label>Supplément emballage fragile (€)</Label>
                      <Input type="number" defaultValue="1.50" step="0.01" />
                    </div>
                    <div className="flex items-center justify-between">
                      <div>
                        <Label>Emballage cadeau</Label>
                        <p className="text-sm text-muted-foreground">Proposer l'option emballage cadeau</p>
                      </div>
                      <Switch defaultChecked />
                    </div>
                  </div>
                </div>
              </div>
              <Button>Enregistrer les paramètres</Button>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </AdminLayout>
  );
}