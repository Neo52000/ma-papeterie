import { useState, useEffect, useMemo } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { AdminLayout } from "@/components/admin/AdminLayout";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Trash2, Edit, Plus, Save, X, Upload, FileText, Clock, BarChart2, ExternalLink, Truck } from "lucide-react";
import { ProductQualityDashboard } from "@/components/admin/ProductQualityDashboard";
import { ProductHistoryPanel } from "@/components/admin/ProductHistoryPanel";
import { useToast } from "@/hooks/use-toast";
import { useNavigate, Link } from "react-router-dom";
import { ProductCsvImport } from "@/components/admin/ProductCsvImport";
import { SupplierComparison } from "@/components/admin/SupplierComparison";
import { StockLocations } from "@/components/admin/StockLocations";
import { CompetitorPrices } from "@/components/admin/CompetitorPrices";
import { useProductFormStore, ProductDraft } from "@/stores/productFormStore";
import { useCategories } from "@/hooks/useCategories";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";

interface Product {
  id: string;
  name: string;
  description: string | null;
  price: number;
  price_ht?: number;
  price_ttc?: number;
  tva_rate?: number;
  eco_tax?: number;
  eco_contribution?: number;
  ean?: string;
  manufacturer_code?: string;
  sku_interne?: string;
  attributs?: any;
  image_url: string | null;
  category: string;
  subcategory?: string;
  family?: string;
  subfamily?: string;
  badge: string | null;
  eco: boolean;
  stock_quantity: number;
  min_stock_alert?: number;
  reorder_quantity?: number;
  margin_percent?: number;
  weight_kg?: number;
  dimensions_cm?: string;
  is_featured: boolean;
  is_active?: boolean;
}

export default function AdminProducts() {
  const { user, isAdmin, isLoading } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [products, setProducts] = useState<Product[]>([]);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [viewingProduct, setViewingProduct] = useState<Product | null>(null);
  const [isCreating, setIsCreating] = useState(false);
  const [loading, setLoading] = useState(true);

  const emptyProduct: Omit<Product, 'id'> = {
    name: '',
    description: '',
    price: 0,
    price_ht: 0,
    price_ttc: 0,
    tva_rate: 20,
    eco_tax: 0,
    eco_contribution: 0,
    ean: '',
    manufacturer_code: '',
    sku_interne: '',
    attributs: {},
    image_url: '',
    category: 'Bureautique',
    badge: '',
    eco: false,
    stock_quantity: 0,
    min_stock_alert: 10,
    reorder_quantity: 50,
    margin_percent: 0,
    weight_kg: 0,
    dimensions_cm: '',
    is_featured: false,
    is_active: true,
  };

  useEffect(() => {
    if (!isLoading && (!user || !isAdmin)) {
      navigate('/auth');
    }
  }, [isLoading, user, isAdmin, navigate]);

  useEffect(() => {
    if (user && isAdmin) {
      fetchProducts();
    }
  }, [user, isAdmin]);

  const fetchProducts = async () => {
    try {
      const { data, error } = await supabase
        .from('products')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setProducts(data || []);
    } catch (error) {
      console.error('Error fetching products:', error);
      toast({
        title: "Erreur",
        description: "Impossible de charger les produits",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleSaveProduct = async (productData: Omit<Product, 'id'> | Product) => {
    try {
      if ('id' in productData && productData.id) {
        // Update existing product - exclude id from the update payload
        const { id, ...updateData } = productData;
        const { error } = await supabase
          .from('products')
          .update(updateData)
          .eq('id', id);

        if (error) throw error;
        toast({
          title: "Succès",
          description: "Produit mis à jour",
        });
      } else {
        // Create new product - remove id if present
        const { id, ...insertData } = productData as Product;
        const { error } = await supabase
          .from('products')
          .insert([insertData]);

        if (error) throw error;
        toast({
          title: "Succès",
          description: "Produit créé",
        });
      }

      setEditingProduct(null);
      setIsCreating(false);
      fetchProducts();
    } catch (error: any) {
      console.error('Error saving product:', error?.message, error?.details, error?.hint, error);
      toast({
        title: "Erreur",
        description: error?.message || "Impossible de sauvegarder le produit",
        variant: "destructive",
      });
    }
  };

  const handleDeleteProduct = async (id: string) => {
    if (!confirm('Êtes-vous sûr de vouloir supprimer ce produit ?')) return;

    try {
      const { error } = await supabase
        .from('products')
        .delete()
        .eq('id', id);

      if (error) throw error;
      
      toast({
        title: "Succès",
        description: "Produit supprimé",
      });
      fetchProducts();
    } catch (error) {
      console.error('Error deleting product:', error);
      toast({
        title: "Erreur",
        description: "Impossible de supprimer le produit",
        variant: "destructive",
      });
    }
  };

  // ===== Category Cascade Selector =====
  const CategoryCascadeSelector = ({ formData, updateFormData }: {
    formData: Omit<Product, 'id'> | Product;
    updateFormData: (updates: Partial<Product>) => void;
  }) => {
    const { categories: allCats } = useCategories();

    const familles = useMemo(() => allCats.filter(c => c.level === "famille"), [allCats]);
    const sousFamilles = useMemo(() => {
      const fam = familles.find(f => f.name === (formData as any).family);
      return fam ? allCats.filter(c => c.level === "sous_famille" && c.parent_id === fam.id) : [];
    }, [allCats, familles, (formData as any).family]);
    const cats = useMemo(() => {
      const sf = sousFamilles.find(f => f.name === (formData as any).subfamily);
      if (sf) return allCats.filter(c => c.level === "categorie" && c.parent_id === sf.id);
      // Also show categories without subfamily parent
      const fam = familles.find(f => f.name === (formData as any).family);
      if (fam) return allCats.filter(c => c.level === "categorie" && c.parent_id === fam.id);
      return allCats.filter(c => c.level === "categorie");
    }, [allCats, familles, sousFamilles, (formData as any).family, (formData as any).subfamily]);
    const sousCats = useMemo(() => {
      const cat = cats.find(c => c.name === formData.category);
      return cat ? allCats.filter(c => c.level === "sous_categorie" && c.parent_id === cat.id) : [];
    }, [allCats, cats, formData.category]);

    return (
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div>
          <Label>Famille</Label>
          <Select
            value={(formData as any).family || ""}
            onValueChange={(v) => updateFormData({ family: v, subfamily: "", category: "", subcategory: "" } as any)}
          >
            <SelectTrigger><SelectValue placeholder="Sélectionner..." /></SelectTrigger>
            <SelectContent>
              {familles.map(f => <SelectItem key={f.id} value={f.name}>{f.name}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
        {sousFamilles.length > 0 && (
          <div>
            <Label>Sous-famille</Label>
            <Select
              value={(formData as any).subfamily || ""}
              onValueChange={(v) => updateFormData({ subfamily: v, category: "", subcategory: "" } as any)}
            >
              <SelectTrigger><SelectValue placeholder="Sélectionner..." /></SelectTrigger>
              <SelectContent>
                {sousFamilles.map(f => <SelectItem key={f.id} value={f.name}>{f.name}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
        )}
        <div>
          <Label>Catégorie *</Label>
          <Select
            value={formData.category || ""}
            onValueChange={(v) => updateFormData({ category: v, subcategory: "" } as any)}
          >
            <SelectTrigger><SelectValue placeholder="Sélectionner..." /></SelectTrigger>
            <SelectContent>
              {cats.map(c => <SelectItem key={c.id} value={c.name}>{c.name}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
        {sousCats.length > 0 && (
          <div>
            <Label>Sous-catégorie</Label>
            <Select
              value={(formData as any).subcategory || ""}
              onValueChange={(v) => updateFormData({ subcategory: v } as any)}
            >
              <SelectTrigger><SelectValue placeholder="Sélectionner..." /></SelectTrigger>
              <SelectContent>
                {sousCats.map(c => <SelectItem key={c.id} value={c.name}>{c.name}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
        )}
      </div>
    );
  };

  const ProductForm = ({ product, onSave, onCancel }: {
    product: Omit<Product, 'id'> | Product;
    onSave: (product: Omit<Product, 'id'> | Product) => void;
    onCancel: () => void;
  }) => {
    const { draftProduct, setDraft, clearDraft, lastModified, hasDraft } = useProductFormStore();
    
    // Use draft if available and matches current context, otherwise use passed product
    const initialData = draftProduct && (
      ('id' in product && draftProduct.id === product.id) || 
      (!('id' in product) && !draftProduct.id)
    ) ? draftProduct : product;
    
    const [formData, setFormData] = useState<Omit<Product, 'id'> | Product>(initialData as any);

    // Sync form changes to persistent store
    const updateFormData = (updates: Partial<Product>) => {
      const newData = { ...formData, ...updates };
      setFormData(newData);
      setDraft(newData as ProductDraft);
    };

    const handleSave = () => {
      onSave(formData);
      clearDraft(); // Clear draft after successful save
    };

    const handleCancel = () => {
      clearDraft();
      onCancel();
    };

    const handleClearDraft = () => {
      clearDraft();
      setFormData(product);
    };

    const formatLastModified = () => {
      if (!lastModified) return null;
      const date = new Date(lastModified);
      return date.toLocaleString('fr-FR', { 
        day: '2-digit', 
        month: '2-digit', 
        hour: '2-digit', 
        minute: '2-digit' 
      });
    };

    return (
      <Card className="mb-6">
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              {'id' in product ? 'Modifier le produit' : 'Nouveau produit'}
              {lastModified && (
                <div className="flex items-center gap-2">
                  <Badge variant="secondary" className="flex items-center gap-1">
                    <FileText className="h-3 w-3" />
                    Brouillon
                  </Badge>
                  <span className="text-xs text-muted-foreground flex items-center gap-1">
                    <Clock className="h-3 w-3" />
                    {formatLastModified()}
                  </span>
                </div>
              )}
            </div>
            <div className="flex items-center gap-2">
              {lastModified && (
                <AlertDialog>
                  <AlertDialogTrigger asChild>
                    <Button variant="outline" size="sm">
                      <Trash2 className="h-3 w-3 mr-1" />
                      Effacer brouillon
                    </Button>
                  </AlertDialogTrigger>
                  <AlertDialogContent>
                    <AlertDialogHeader>
                      <AlertDialogTitle>Effacer le brouillon ?</AlertDialogTitle>
                      <AlertDialogDescription>
                        Cette action va supprimer toutes les données saisies dans le formulaire. Cette action est irréversible.
                      </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                      <AlertDialogCancel>Annuler</AlertDialogCancel>
                      <AlertDialogAction onClick={handleClearDraft}>
                        Effacer
                      </AlertDialogAction>
                    </AlertDialogFooter>
                  </AlertDialogContent>
                </AlertDialog>
              )}
              <Button variant="ghost" size="icon" onClick={handleCancel}>
                <X className="h-4 w-4" />
              </Button>
            </div>
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Section Identification */}
          <div className="space-y-4">
            <h3 className="text-lg font-semibold border-b pb-2">Identification</h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <Label htmlFor="name">Nom *</Label>
                <Input
                  id="name"
                  value={formData.name}
                  onChange={(e) => updateFormData({ name: e.target.value })}
                  required
                />
              </div>
              <div>
                <Label htmlFor="ean">Code EAN</Label>
                <Input
                  id="ean"
                  value={formData.ean || ''}
                  onChange={(e) => updateFormData({ ean: e.target.value })}
                  placeholder="Code barre international"
                />
              </div>
              <div>
                <Label htmlFor="manufacturer_code">Code fabricant</Label>
                <Input
                  id="manufacturer_code"
                  value={formData.manufacturer_code || ''}
                  onChange={(e) => updateFormData({ manufacturer_code: e.target.value })}
                  placeholder="Référence fabricant"
                />
              </div>
              <div>
                <Label htmlFor="sku_interne">SKU Interne</Label>
                <Input
                  id="sku_interne"
                  value={(formData as any).sku_interne || ''}
                  onChange={(e) => updateFormData({ sku_interne: e.target.value } as any)}
                  placeholder="Référence interne unique"
                />
              </div>
            </div>
            <CategoryCascadeSelector formData={formData} updateFormData={updateFormData} />
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="badge">Badge</Label>
                <Input
                  id="badge"
                  value={formData.badge || ''}
                  onChange={(e) => updateFormData({ badge: e.target.value })}
                  placeholder="Nouveau, Promo, etc."
                />
              </div>
            </div>
          </div>

          {/* Section Prix & Marges */}
          <div className="space-y-4">
            <h3 className="text-lg font-semibold border-b pb-2">Prix & Marges</h3>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div>
                <Label htmlFor="price_ht">Prix HT (€) *</Label>
                <Input
                  id="price_ht"
                  type="number"
                  step="0.01"
                  value={formData.price_ht || ''}
                  onChange={(e) => {
                    const ht = parseFloat(e.target.value) || 0;
                    const tva = formData.tva_rate || 20;
                    const ttc = ht * (1 + tva / 100);
                    updateFormData({ 
                      price_ht: ht,
                      price_ttc: parseFloat(ttc.toFixed(2)),
                      price: parseFloat(ttc.toFixed(2))
                    });
                  }}
                  required
                />
              </div>
              <div>
                <Label htmlFor="tva_rate">TVA (%)</Label>
                <Input
                  id="tva_rate"
                  type="number"
                  step="0.1"
                  value={formData.tva_rate || 20}
                  onChange={(e) => {
                    const tva = parseFloat(e.target.value) || 20;
                    const ht = formData.price_ht || 0;
                    const ttc = ht * (1 + tva / 100);
                    updateFormData({ 
                      tva_rate: tva,
                      price_ttc: parseFloat(ttc.toFixed(2)),
                      price: parseFloat(ttc.toFixed(2))
                    });
                  }}
                />
              </div>
              <div>
                <Label htmlFor="price_ttc">Prix TTC (€)</Label>
                <Input
                  id="price_ttc"
                  type="number"
                  step="0.01"
                  value={formData.price_ttc || ''}
                  readOnly
                  className="bg-muted"
                />
              </div>
              <div>
                <Label htmlFor="margin_percent">Marge (%)</Label>
                <Input
                  id="margin_percent"
                  type="number"
                  step="0.1"
                  value={formData.margin_percent || ''}
                  onChange={(e) => updateFormData({ margin_percent: parseFloat(e.target.value) || 0 })}
                  placeholder="Marge commerciale"
                />
              </div>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <Label htmlFor="eco_tax">Éco-taxe (€)</Label>
                <Input
                  id="eco_tax"
                  type="number"
                  step="0.01"
                  value={formData.eco_tax || 0}
                  onChange={(e) => updateFormData({ eco_tax: parseFloat(e.target.value) || 0 })}
                  placeholder="Taxe environnementale"
                />
              </div>
              <div>
                <Label htmlFor="eco_contribution">Éco-contribution (€)</Label>
                <Input
                  id="eco_contribution"
                  type="number"
                  step="0.01"
                  value={formData.eco_contribution || 0}
                  onChange={(e) => updateFormData({ eco_contribution: parseFloat(e.target.value) || 0 })}
                  placeholder="Contribution écologique"
                />
              </div>
              <div>
                <Label htmlFor="price">Prix Public TTC (€) *</Label>
                <Input
                  id="price"
                  type="number"
                  step="0.01"
                  value={formData.price}
                  onChange={(e) => updateFormData({ price: parseFloat(e.target.value) || 0 })}
                  required
                />
              </div>
            </div>
          </div>

          {/* Section Logistique */}
          <div className="space-y-4">
            <h3 className="text-lg font-semibold border-b pb-2">Logistique & Stock</h3>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div>
                <Label htmlFor="stock">Stock actuel</Label>
                <Input
                  id="stock"
                  type="number"
                  value={formData.stock_quantity}
                  onChange={(e) => updateFormData({ stock_quantity: parseInt(e.target.value) || 0 })}
                />
              </div>
              <div>
                <Label htmlFor="min_stock_alert">Alerte stock minimum</Label>
                <Input
                  id="min_stock_alert"
                  type="number"
                  value={formData.min_stock_alert || 10}
                  onChange={(e) => updateFormData({ min_stock_alert: parseInt(e.target.value) || 10 })}
                  placeholder="Seuil d'alerte"
                />
              </div>
              <div>
                <Label htmlFor="reorder_quantity">Quantité de réappro</Label>
                <Input
                  id="reorder_quantity"
                  type="number"
                  value={formData.reorder_quantity || 50}
                  onChange={(e) => updateFormData({ reorder_quantity: parseInt(e.target.value) || 50 })}
                  placeholder="Qté à commander"
                />
              </div>
              <div>
                <Label htmlFor="weight_kg">Poids (kg)</Label>
                <Input
                  id="weight_kg"
                  type="number"
                  step="0.001"
                  value={formData.weight_kg || ''}
                  onChange={(e) => updateFormData({ weight_kg: parseFloat(e.target.value) || 0 })}
                  placeholder="Poids unitaire"
                />
              </div>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="dimensions_cm">Dimensions (cm)</Label>
                <Input
                  id="dimensions_cm"
                  value={formData.dimensions_cm || ''}
                  onChange={(e) => updateFormData({ dimensions_cm: e.target.value })}
                  placeholder="LxlxH (ex: 30x20x5)"
                />
              </div>
              <div>
                <Label htmlFor="image_url">URL de l'image</Label>
                <Input
                  id="image_url"
                  value={formData.image_url || ''}
                  onChange={(e) => updateFormData({ image_url: e.target.value })}
                  placeholder="https://..."
                />
              </div>
            </div>
          </div>
          {/* Section Description */}
          <div className="space-y-4">
            <h3 className="text-lg font-semibold border-b pb-2">Description</h3>
            <div>
              <Label htmlFor="description">Description du produit</Label>
              <Textarea
                id="description"
                value={formData.description || ''}
                onChange={(e) => updateFormData({ description: e.target.value })}
                rows={4}
                placeholder="Description détaillée du produit..."
              />
            </div>
          </div>

          {/* Section Options */}
          <div className="space-y-4">
            <h3 className="text-lg font-semibold border-b pb-2">Options</h3>
            <div className="flex flex-wrap gap-6">
              <div className="flex items-center space-x-2">
                <Switch
                  id="eco"
                  checked={formData.eco}
                  onCheckedChange={(checked) => updateFormData({ eco: checked })}
                />
                <Label htmlFor="eco">Produit écologique</Label>
              </div>
              <div className="flex items-center space-x-2">
                <Switch
                  id="featured"
                  checked={formData.is_featured}
                  onCheckedChange={(checked) => updateFormData({ is_featured: checked })}
                />
                <Label htmlFor="featured">Produit mis en avant</Label>
              </div>
              <div className="flex items-center space-x-2">
                <Switch
                  id="is_active"
                  checked={formData.is_active !== false}
                  onCheckedChange={(checked) => updateFormData({ is_active: checked })}
                />
                <Label htmlFor="is_active">Produit actif</Label>
              </div>
            </div>
          </div>

          <div className="flex justify-end space-x-2">
            <Button variant="outline" onClick={handleCancel}>
              Annuler
            </Button>
            <Button onClick={handleSave}>
              <Save className="h-4 w-4 mr-2" />
              Sauvegarder
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  };

  const ProductDetailView = ({ product }: { product: Product }) => {
    return (
      <div className="space-y-6">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center justify-between">
              <span>{product.name}</span>
              <div className="flex space-x-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    setViewingProduct(null);
                    setEditingProduct(product);
                  }}
                >
                  <Edit className="h-4 w-4 mr-2" />
                  Modifier
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setViewingProduct(null)}
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <Tabs defaultValue="details" className="space-y-4">
              <TabsList>
                <TabsTrigger value="details">Détails</TabsTrigger>
                <TabsTrigger value="suppliers">Fournisseurs</TabsTrigger>
                <TabsTrigger value="stock">Stocks</TabsTrigger>
                <TabsTrigger value="competitors">Concurrents</TabsTrigger>
              </TabsList>

              <TabsContent value="details">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <h3 className="font-semibold mb-2">Informations générales</h3>
                    <dl className="space-y-2 text-sm">
                      <div className="flex justify-between">
                        <dt className="text-muted-foreground">Prix TTC:</dt>
                        <dd className="font-semibold">{product.price.toFixed(2)} €</dd>
                      </div>
                      <div className="flex justify-between">
                        <dt className="text-muted-foreground">Prix HT:</dt>
                        <dd>{product.price_ht?.toFixed(2)} €</dd>
                      </div>
                      <div className="flex justify-between">
                        <dt className="text-muted-foreground">TVA:</dt>
                        <dd>{product.tva_rate}%</dd>
                      </div>
                      {product.ean && (
                        <div className="flex justify-between">
                          <dt className="text-muted-foreground">EAN:</dt>
                          <dd>{product.ean}</dd>
                        </div>
                      )}
                      {product.manufacturer_code && (
                        <div className="flex justify-between">
                          <dt className="text-muted-foreground">Code fabricant:</dt>
                          <dd>{product.manufacturer_code}</dd>
                        </div>
                      )}
                    </dl>
                  </div>
                  <div>
                    <h3 className="font-semibold mb-2">Stock & Logistique</h3>
                    <dl className="space-y-2 text-sm">
                      <div className="flex justify-between">
                        <dt className="text-muted-foreground">Stock total:</dt>
                        <dd className="font-semibold">{product.stock_quantity}</dd>
                      </div>
                      <div className="flex justify-between">
                        <dt className="text-muted-foreground">Alerte stock:</dt>
                        <dd>{product.min_stock_alert}</dd>
                      </div>
                      <div className="flex justify-between">
                        <dt className="text-muted-foreground">Qté réappro:</dt>
                        <dd>{product.reorder_quantity}</dd>
                      </div>
                      {product.weight_kg && (
                        <div className="flex justify-between">
                          <dt className="text-muted-foreground">Poids:</dt>
                          <dd>{product.weight_kg} kg</dd>
                        </div>
                      )}
                      {product.dimensions_cm && (
                        <div className="flex justify-between">
                          <dt className="text-muted-foreground">Dimensions:</dt>
                          <dd>{product.dimensions_cm} cm</dd>
                        </div>
                      )}
                    </dl>
                  </div>
                </div>
              </TabsContent>

              <TabsContent value="suppliers">
                <SupplierComparison productId={product.id} productPrice={product.price} />
              </TabsContent>

              <TabsContent value="stock">
                <StockLocations productId={product.id} />
              </TabsContent>

              <TabsContent value="competitors">
                <CompetitorPrices productId={product.id} currentPrice={product.price} />
              </TabsContent>
            </Tabs>
          </CardContent>
        </Card>
      </div>
    );
  };

  if (isLoading || loading) {
    return (
      <AdminLayout title="Gestion des produits" description="Gérez votre catalogue de produits">
        <div className="text-center">Chargement...</div>
      </AdminLayout>
    );
  }

  if (!user || !isAdmin) {
    return null;
  }

  return (
    <AdminLayout title="Gestion des produits" description="Gérez votre catalogue de produits">
      <Tabs defaultValue="catalogue" className="space-y-6">
        <TabsList>
          <TabsTrigger value="catalogue">Catalogue</TabsTrigger>
          <TabsTrigger value="qualite" className="gap-1.5">
            <BarChart2 className="h-3.5 w-3.5" />
            Qualité données
          </TabsTrigger>
        </TabsList>

        <TabsContent value="qualite">
          <ProductQualityDashboard />
        </TabsContent>

        <TabsContent value="catalogue">
      <div className="flex items-center justify-between mb-8">
        <div className="flex gap-2">
          <Button onClick={() => setIsCreating(true)}>
            <Plus className="h-4 w-4 mr-2" />
            Nouveau produit
          </Button>
        </div>
      </div>

      <div className="mb-6">
        <ProductCsvImport onComplete={fetchProducts} />
      </div>

      {isCreating && (
        <ProductForm
          product={emptyProduct}
          onSave={handleSaveProduct}
          onCancel={() => setIsCreating(false)}
        />
      )}

      {viewingProduct && (
        <ProductDetailView product={viewingProduct} />
      )}

      {editingProduct && !viewingProduct && (
        <ProductForm
          product={editingProduct}
          onSave={handleSaveProduct}
          onCancel={() => setEditingProduct(null)}
        />
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {products.map((product) => (
          <Card key={product.id} className="relative">
            <CardContent className="p-4">
              <div className="flex justify-between items-start mb-2">
                <h3 className="font-semibold text-lg">{product.name}</h3>
                <div className="flex space-x-1">
                  <Button
                    variant="ghost"
                    size="icon"
                    asChild
                    title="Offres fournisseurs"
                  >
                    <Link to={`/admin/products/${product.id}/offers`}>
                      <Truck className="h-4 w-4" />
                    </Link>
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    asChild
                    title="Voir fiche produit"
                  >
                    <Link to={`/produit/${product.id}`} target="_blank">
                      <ExternalLink className="h-4 w-4" />
                    </Link>
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => setViewingProduct(product)}
                  >
                    <Edit className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => handleDeleteProduct(product.id)}
                  >
                    <Trash2 className="h-4 w-4 text-destructive" />
                  </Button>
                </div>
              </div>
              
              <p className="text-sm text-muted-foreground mb-2 line-clamp-2">
                {product.description}
              </p>
              
              <div className="flex items-center justify-between mb-2">
                <span className="text-lg font-bold text-primary">
                  {product.price.toFixed(2)} €
                </span>
                <span className="text-sm text-muted-foreground">
                  Stock: {product.stock_quantity}
                </span>
              </div>
              
              <div className="flex flex-wrap gap-1 mb-2">
                <Badge variant="secondary">{product.category}</Badge>
                {product.badge && <Badge variant="outline">{product.badge}</Badge>}
                {product.eco && <Badge variant="secondary">Éco</Badge>}
                {product.is_featured && <Badge variant="destructive">Featured</Badge>}
                {product.ean && product.price > 0 ? (
                  <Badge variant="secondary" className="text-primary">Vendable</Badge>
                ) : (
                  <Badge variant="outline">Non vendable</Badge>
                )}
                {product.stock_quantity <= 10 && product.stock_quantity > 0 && (
                  <Badge variant="outline" className="text-destructive">Stock faible</Badge>
                )}
                {product.stock_quantity === 0 && (
                  <Badge variant="destructive">Rupture</Badge>
                )}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
        </TabsContent>
      </Tabs>
    </AdminLayout>
  );
}