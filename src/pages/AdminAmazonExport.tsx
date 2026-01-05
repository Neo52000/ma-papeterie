import { useState } from "react";
import { AdminLayout } from "@/components/admin/AdminLayout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useProducts } from "@/hooks/useProducts";
import { Download, Upload, FileSpreadsheet, Settings, AlertTriangle, CheckCircle, Package, RefreshCw } from "lucide-react";
import { toast } from "sonner";

export default function AdminAmazonExport() {
  const { products, loading: isLoading } = useProducts();
  const [selectedProducts, setSelectedProducts] = useState<string[]>([]);
  const [marketplace, setMarketplace] = useState("FR");
  const [exportFormat, setExportFormat] = useState("flat-file");
  const [isExporting, setIsExporting] = useState(false);
  const [priceMarkup, setPriceMarkup] = useState("15");
  const [fulfillmentType, setFulfillmentType] = useState("MFN");

  const toggleProductSelection = (productId: string) => {
    setSelectedProducts(prev => 
      prev.includes(productId) 
        ? prev.filter(id => id !== productId)
        : [...prev, productId]
    );
  };

  const selectAllProducts = () => {
    if (selectedProducts.length === products.length) {
      setSelectedProducts([]);
    } else {
      setSelectedProducts(products.map(p => p.id));
    }
  };

  const generateAmazonFlatFile = () => {
    if (selectedProducts.length === 0) {
      toast.error("Veuillez sélectionner au moins un produit");
      return;
    }

    setIsExporting(true);
    const selectedProductsData = products.filter(p => selectedProducts.includes(p.id));
    
    // Headers Amazon Seller Central Flat File
    const headers = [
      "item_sku", "item_name", "external_product_id", "external_product_id_type",
      "brand_name", "manufacturer", "product_description", "item_type",
      "standard_price", "quantity", "condition_type", "fulfillment_channel",
      "main_image_url", "bullet_point1", "bullet_point2", "bullet_point3",
      "recommended_browse_nodes", "search_terms", "variation_theme"
    ];

    const markup = parseFloat(priceMarkup) / 100;
    
    const rows = selectedProductsData.map(product => {
      const amazonPrice = (product.price * (1 + markup)).toFixed(2);
      return [
        product.ean || `SKU-${product.id.slice(0, 8)}`,
        product.name,
        product.ean || "",
        product.ean ? "EAN" : "",
        "Ma Papeterie",
        "Ma Papeterie",
        product.description || product.name,
        product.category,
        amazonPrice,
        product.stock_quantity || 0,
        "New",
        fulfillmentType,
        product.image_url || "",
        product.description?.slice(0, 100) || "",
        "",
        "",
        "",
        product.category,
        ""
      ];
    });

    const csvContent = [headers, ...rows]
      .map(row => row.map(cell => `"${String(cell).replace(/"/g, '""')}"`).join("\t"))
      .join("\n");

    const blob = new Blob([csvContent], { type: "text/tab-separated-values;charset=utf-8;" });
    const link = document.createElement("a");
    link.href = URL.createObjectURL(blob);
    link.download = `amazon_${marketplace}_export_${new Date().toISOString().split('T')[0]}.txt`;
    link.click();

    setIsExporting(false);
    toast.success(`${selectedProducts.length} produits exportés pour Amazon ${marketplace}`);
  };

  const generateInventoryFile = () => {
    if (selectedProducts.length === 0) {
      toast.error("Veuillez sélectionner au moins un produit");
      return;
    }

    const selectedProductsData = products.filter(p => selectedProducts.includes(p.id));
    
    const headers = ["sku", "product-id", "product-id-type", "price", "minimum-seller-allowed-price", 
                     "maximum-seller-allowed-price", "item-condition", "quantity", "add-delete", 
                     "will-ship-internationally", "expedited-shipping", "handling-time"];

    const markup = parseFloat(priceMarkup) / 100;
    
    const rows = selectedProductsData.map(product => {
      const amazonPrice = (product.price * (1 + markup)).toFixed(2);
      const minPrice = (parseFloat(amazonPrice) * 0.9).toFixed(2);
      const maxPrice = (parseFloat(amazonPrice) * 1.2).toFixed(2);
      
      return [
        product.ean || `SKU-${product.id.slice(0, 8)}`,
        product.ean || "",
        product.ean ? "EAN" : "",
        amazonPrice,
        minPrice,
        maxPrice,
        "11", // New
        product.stock_quantity || 0,
        "a", // Add
        "n",
        "y",
        "2"
      ];
    });

    const csvContent = [headers, ...rows]
      .map(row => row.join("\t"))
      .join("\n");

    const blob = new Blob([csvContent], { type: "text/tab-separated-values;charset=utf-8;" });
    const link = document.createElement("a");
    link.href = URL.createObjectURL(blob);
    link.download = `amazon_inventory_${marketplace}_${new Date().toISOString().split('T')[0]}.txt`;
    link.click();

    toast.success("Fichier inventaire généré");
  };

  const productsWithEan = products.filter(p => p.ean);
  const productsWithoutEan = products.filter(p => !p.ean);

  return (
    <AdminLayout 
      title="Export Amazon Seller Central" 
      description="Exportez vos produits vers Amazon Seller Central"
    >
      <Tabs defaultValue="export" className="space-y-6">
        <TabsList>
          <TabsTrigger value="export">Export Produits</TabsTrigger>
          <TabsTrigger value="inventory">Mise à jour Stock</TabsTrigger>
          <TabsTrigger value="settings">Configuration</TabsTrigger>
        </TabsList>

        <TabsContent value="export" className="space-y-6">
          {/* Stats Cards */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center gap-2">
                  <Package className="h-5 w-5 text-primary" />
                  <div>
                    <p className="text-2xl font-bold">{products.length}</p>
                    <p className="text-sm text-muted-foreground">Produits total</p>
                  </div>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center gap-2">
                  <CheckCircle className="h-5 w-5 text-green-500" />
                  <div>
                    <p className="text-2xl font-bold">{productsWithEan.length}</p>
                    <p className="text-sm text-muted-foreground">Avec EAN</p>
                  </div>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center gap-2">
                  <AlertTriangle className="h-5 w-5 text-orange-500" />
                  <div>
                    <p className="text-2xl font-bold">{productsWithoutEan.length}</p>
                    <p className="text-sm text-muted-foreground">Sans EAN</p>
                  </div>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center gap-2">
                  <FileSpreadsheet className="h-5 w-5 text-blue-500" />
                  <div>
                    <p className="text-2xl font-bold">{selectedProducts.length}</p>
                    <p className="text-sm text-muted-foreground">Sélectionnés</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Export Options */}
          <Card>
            <CardHeader>
              <CardTitle>Options d'export</CardTitle>
              <CardDescription>Configurez les paramètres d'export pour Amazon</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <div className="space-y-2">
                  <Label>Marketplace</Label>
                  <Select value={marketplace} onValueChange={setMarketplace}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="FR">Amazon.fr</SelectItem>
                      <SelectItem value="DE">Amazon.de</SelectItem>
                      <SelectItem value="ES">Amazon.es</SelectItem>
                      <SelectItem value="IT">Amazon.it</SelectItem>
                      <SelectItem value="UK">Amazon.co.uk</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Majoration prix (%)</Label>
                  <Input 
                    type="number" 
                    value={priceMarkup} 
                    onChange={(e) => setPriceMarkup(e.target.value)}
                    min="0"
                    max="100"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Type d'expédition</Label>
                  <Select value={fulfillmentType} onValueChange={setFulfillmentType}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="MFN">Expédié par le vendeur (MFN)</SelectItem>
                      <SelectItem value="AFN">Expédié par Amazon (FBA)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Format</Label>
                  <Select value={exportFormat} onValueChange={setExportFormat}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="flat-file">Flat File (.txt)</SelectItem>
                      <SelectItem value="xml">XML Feed</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Products Table */}
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>Sélection des produits</CardTitle>
                  <CardDescription>
                    Sélectionnez les produits à exporter vers Amazon
                  </CardDescription>
                </div>
                <div className="flex gap-2">
                  <Button variant="outline" onClick={selectAllProducts}>
                    {selectedProducts.length === products.length ? "Tout désélectionner" : "Tout sélectionner"}
                  </Button>
                  <Button onClick={generateAmazonFlatFile} disabled={isExporting || selectedProducts.length === 0}>
                    <Download className="h-4 w-4 mr-2" />
                    Exporter ({selectedProducts.length})
                  </Button>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              {isLoading ? (
                <div className="flex items-center justify-center py-8">
                  <RefreshCw className="h-6 w-6 animate-spin" />
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-12">
                        <Checkbox 
                          checked={selectedProducts.length === products.length}
                          onCheckedChange={selectAllProducts}
                        />
                      </TableHead>
                      <TableHead>Produit</TableHead>
                      <TableHead>EAN</TableHead>
                      <TableHead>Catégorie</TableHead>
                      <TableHead>Prix</TableHead>
                      <TableHead>Prix Amazon</TableHead>
                      <TableHead>Stock</TableHead>
                      <TableHead>Status</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {products.slice(0, 50).map((product) => {
                      const amazonPrice = (product.price * (1 + parseFloat(priceMarkup) / 100)).toFixed(2);
                      return (
                        <TableRow key={product.id}>
                          <TableCell>
                            <Checkbox 
                              checked={selectedProducts.includes(product.id)}
                              onCheckedChange={() => toggleProductSelection(product.id)}
                            />
                          </TableCell>
                          <TableCell className="font-medium">{product.name}</TableCell>
                          <TableCell>
                            {product.ean || <span className="text-muted-foreground">-</span>}
                          </TableCell>
                          <TableCell>{product.category}</TableCell>
                          <TableCell>{product.price.toFixed(2)} €</TableCell>
                          <TableCell className="font-medium text-primary">{amazonPrice} €</TableCell>
                          <TableCell>{product.stock_quantity || 0}</TableCell>
                          <TableCell>
                            {product.ean ? (
                              <Badge variant="default" className="bg-green-500">Prêt</Badge>
                            ) : (
                              <Badge variant="secondary">EAN manquant</Badge>
                            )}
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="inventory" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Mise à jour inventaire</CardTitle>
              <CardDescription>
                Générez un fichier de mise à jour des stocks et prix pour Amazon
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex gap-4">
                <Button onClick={generateInventoryFile} disabled={selectedProducts.length === 0}>
                  <FileSpreadsheet className="h-4 w-4 mr-2" />
                  Générer fichier inventaire
                </Button>
                <Button variant="outline">
                  <Upload className="h-4 w-4 mr-2" />
                  Importer rapport Amazon
                </Button>
              </div>
              <div className="rounded-lg border p-4 bg-muted/50">
                <h4 className="font-medium mb-2">Instructions :</h4>
                <ol className="list-decimal list-inside space-y-1 text-sm text-muted-foreground">
                  <li>Sélectionnez les produits dans l'onglet "Export Produits"</li>
                  <li>Cliquez sur "Générer fichier inventaire"</li>
                  <li>Importez le fichier .txt dans Amazon Seller Central</li>
                  <li>Section : Inventaire &gt; Ajouter des produits via un téléchargement</li>
                </ol>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="settings" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Settings className="h-5 w-5" />
                Configuration Amazon Seller Central
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-4">
                  <h4 className="font-medium">Identifiants MWS (optionnel)</h4>
                  <div className="space-y-2">
                    <Label>Seller ID</Label>
                    <Input placeholder="A1XXXXXXXXXXXXX" />
                  </div>
                  <div className="space-y-2">
                    <Label>MWS Auth Token</Label>
                    <Input type="password" placeholder="amzn.mws.xxxxxxxx" />
                  </div>
                </div>
                <div className="space-y-4">
                  <h4 className="font-medium">Paramètres par défaut</h4>
                  <div className="space-y-2">
                    <Label>Délai de traitement (jours)</Label>
                    <Input type="number" defaultValue="2" />
                  </div>
                  <div className="space-y-2">
                    <Label>Condition produit</Label>
                    <Select defaultValue="new">
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="new">Neuf</SelectItem>
                        <SelectItem value="refurbished">Reconditionné</SelectItem>
                        <SelectItem value="used">Occasion</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </div>
              <Button>
                Enregistrer la configuration
              </Button>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </AdminLayout>
  );
}