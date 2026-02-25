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
import {
  Trash2, Edit, Plus, Save, X, Upload, FileText, Clock, BarChart2,
  ExternalLink, Truck, Type, Image as ImageIcon, Search, Loader2,
} from "lucide-react";
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
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader,
  AlertDialogTitle, AlertDialogTrigger,
} from "@/components/ui/alert-dialog";

// ── Types ─────────────────────────────────────────────────────────────────────

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

// ── Utilitaires SEO & normalisation ──────────────────────────────────────────

/** Convertit un nom en ALL CAPS → Title Case français */
function toTitleCase(str: string): string {
  if (!str) return str;
  const upCount  = (str.match(/[A-Z]/g) || []).length;
  const letCount = (str.match(/[a-zA-Z]/g) || []).length;
  // Ne convertit que si le texte est majoritairement en majuscules
  if (letCount < 3 || upCount / letCount < 0.7) return str.trim();
  const minor = new Set(['de','du','des','la','le','les','un','une','et','ou','en',
    'à','au','aux','par','sur','sous','pour','avec','sans','dans']);
  return str.toLowerCase().split(' ').map((w, i) =>
    (!w || (i !== 0 && minor.has(w))) ? w : w[0].toUpperCase() + w.slice(1),
  ).join(' ').trim();
}

function buildMetaTitle(name: string): string {
  return `${name} | Ma Papeterie Chaumont`.slice(0, 70);
}

function buildMetaDesc(p: Partial<Product>): string {
  const price = p.price ? ` à ${p.price.toFixed(2)}€ TTC` : '';
  const base  = `${p.name || ''}${price} — Ma Papeterie Chaumont. Livraison rapide, expertise locale.`;
  const extra = p.description ? ` ${p.description}` : '';
  const full  = (base + extra).slice(0, 160);
  return full.length < (base + extra).length ? full.trimEnd() + '…' : full;
}

// ── Composant principal ───────────────────────────────────────────────────────

export default function AdminProducts() {
  const { user, isAdmin, isLoading } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();

  const [products, setProducts]           = useState<Product[]>([]);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [viewingProduct, setViewingProduct] = useState<Product | null>(null);
  const [isCreating, setIsCreating]         = useState(false);
  const [loading, setLoading]               = useState(true);
  const [searchTerm, setSearchTerm]         = useState('');
  const [syncingImageId, setSyncingImageId] = useState<string | null>(null);
  const [showCsvImport, setShowCsvImport]   = useState(false);

  const emptyProduct: Omit<Product, 'id'> = {
    name: '', description: '', price: 0, price_ht: 0, price_ttc: 0, tva_rate: 20,
    eco_tax: 0, eco_contribution: 0, ean: '', manufacturer_code: '', sku_interne: '',
    attributs: {}, image_url: '', category: 'Bureautique', badge: '', eco: false,
    stock_quantity: 0, min_stock_alert: 10, reorder_quantity: 50, margin_percent: 0,
    weight_kg: 0, dimensions_cm: '', is_featured: false, is_active: true,
  };

  useEffect(() => {
    if (!isLoading && (!user || !isAdmin)) navigate('/auth');
  }, [isLoading, user, isAdmin, navigate]);

  useEffect(() => {
    if (user && isAdmin) fetchProducts();
  }, [user, isAdmin]);

  // ── Données ────────────────────────────────────────────────────────────────

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
      toast({ title: "Erreur", description: "Impossible de charger les produits", variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  const filteredProducts = useMemo(() => {
    if (!searchTerm) return products;
    const q = searchTerm.toLowerCase();
    return products.filter(p =>
      p.name.toLowerCase().includes(q) ||
      p.ean?.toLowerCase().includes(q) ||
      p.manufacturer_code?.toLowerCase().includes(q),
    );
  }, [products, searchTerm]);

  // ── Tâches de fond : SEO + image sync ─────────────────────────────────────

  const autoGenerateSEO = async (product: Product) => {
    const json_ld = JSON.stringify({
      '@context': 'https://schema.org/',
      '@type': 'Product',
      name: product.name,
      description: product.description || buildMetaDesc(product),
      ...(product.ean ? { sku: product.ean } : {}),
      ...(product.image_url ? { image: product.image_url } : {}),
      offers: {
        '@type': 'Offer',
        price: product.price.toFixed(2),
        priceCurrency: 'EUR',
        availability: product.stock_quantity > 0
          ? 'https://schema.org/InStock'
          : 'https://schema.org/OutOfStock',
      },
    });

    const { error } = await supabase.from('product_seo').upsert({
      product_id: product.id,
      meta_title: buildMetaTitle(product.name),
      meta_description: buildMetaDesc(product),
      json_ld,
      status: 'draft',
      generated_at: new Date().toISOString(),
      lang: 'fr',
    }, { onConflict: 'product_id' });

    if (error) console.error('SEO generation error:', error);
  };

  const handleSyncImage = async (product: Product, silent = false) => {
    if (!product.image_url) return;
    if (!silent) setSyncingImageId(product.id);
    try {
      await supabase.functions.invoke('enrich-product-image', {
        body: { productId: product.id, imageUrl: product.image_url },
      });
      if (!silent) {
        toast({ title: 'Image synchronisée', description: 'Photo copiée dans le catalogue' });
        fetchProducts();
      }
    } catch (e) {
      if (!silent) toast({ title: 'Erreur', description: "Impossible de synchroniser l'image", variant: 'destructive' });
    } finally {
      if (!silent) setSyncingImageId(null);
    }
  };

  // ── CRUD produits ──────────────────────────────────────────────────────────

  const handleSaveProduct = async (productData: Omit<Product, 'id'> | Product) => {
    try {
      // 1. Normalisation automatique du nom (ALL CAPS → Title Case)
      const normalizedData = { ...productData, name: toTitleCase(productData.name) };

      let savedId: string;

      if ('id' in normalizedData && normalizedData.id) {
        // Mise à jour
        const { id, ...updateData } = normalizedData;
        savedId = id;
        const { error } = await supabase.from('products').update(updateData).eq('id', id);
        if (error) throw error;
        toast({ title: "Succès", description: "Produit mis à jour" });
      } else {
        // Création
        const { id: _id, ...insertData } = normalizedData as Product;
        const { data, error } = await supabase.from('products').insert([insertData]).select('id').single();
        if (error) throw error;
        savedId = data.id;
        toast({ title: "Succès", description: "Produit créé" });
      }

      setEditingProduct(null);
      setIsCreating(false);
      fetchProducts();

      // 2. Tâches de fond (non-bloquantes) : SEO + sync image
      const savedProduct = { ...normalizedData, id: savedId } as Product;
      autoGenerateSEO(savedProduct).catch(console.error);
      if (savedProduct.image_url && !savedProduct.image_url.includes('supabase')) {
        handleSyncImage(savedProduct, true).catch(console.error);
      }

    } catch (error: any) {
      console.error('Error saving product:', error?.message);
      toast({ title: "Erreur", description: error?.message || "Impossible de sauvegarder", variant: "destructive" });
    }
  };

  const handleDeleteProduct = async (id: string) => {
    if (!confirm('Êtes-vous sûr de vouloir supprimer ce produit ?')) return;
    try {
      const { error } = await supabase.from('products').delete().eq('id', id);
      if (error) throw error;
      toast({ title: "Succès", description: "Produit supprimé" });
      fetchProducts();
    } catch (error) {
      toast({ title: "Erreur", description: "Impossible de supprimer", variant: "destructive" });
    }
  };

  // ── Sélecteur de catégorie hiérarchique ───────────────────────────────────

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

  // ── Formulaire produit ─────────────────────────────────────────────────────

  const ProductForm = ({ product, onSave, onCancel }: {
    product: Omit<Product, 'id'> | Product;
    onSave: (product: Omit<Product, 'id'> | Product) => void;
    onCancel: () => void;
  }) => {
    const { draftProduct, setDraft, clearDraft, lastModified } = useProductFormStore();

    const initialData = draftProduct && (
      ('id' in product && draftProduct.id === product.id) ||
      (!('id' in product) && !draftProduct.id)
    ) ? draftProduct : product;

    const [formData, setFormData] = useState<Omit<Product, 'id'> | Product>(initialData as any);

    const updateFormData = (updates: Partial<Product>) => {
      const newData = { ...formData, ...updates };
      setFormData(newData);
      setDraft(newData as ProductDraft);
    };

    const handleSave  = () => { onSave(formData); clearDraft(); };
    const handleCancel = () => { clearDraft(); onCancel(); };
    const handleClearDraft = () => { clearDraft(); setFormData(product); };

    const formatLastModified = () => {
      if (!lastModified) return null;
      return new Date(lastModified).toLocaleString('fr-FR', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' });
    };

    // SEO preview live
    const metaTitle = buildMetaTitle(formData.name || '');
    const metaDesc  = buildMetaDesc(formData as Partial<Product>);

    return (
      <Card className="mb-6">
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              {'id' in product ? 'Modifier le produit' : 'Nouveau produit'}
              {lastModified && (
                <div className="flex items-center gap-2">
                  <Badge variant="secondary" className="flex items-center gap-1">
                    <FileText className="h-3 w-3" />Brouillon
                  </Badge>
                  <span className="text-xs text-muted-foreground flex items-center gap-1">
                    <Clock className="h-3 w-3" />{formatLastModified()}
                  </span>
                </div>
              )}
            </div>
            <div className="flex items-center gap-2">
              {lastModified && (
                <AlertDialog>
                  <AlertDialogTrigger asChild>
                    <Button variant="outline" size="sm">
                      <Trash2 className="h-3 w-3 mr-1" />Effacer brouillon
                    </Button>
                  </AlertDialogTrigger>
                  <AlertDialogContent>
                    <AlertDialogHeader>
                      <AlertDialogTitle>Effacer le brouillon ?</AlertDialogTitle>
                      <AlertDialogDescription>Cette action est irréversible.</AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                      <AlertDialogCancel>Annuler</AlertDialogCancel>
                      <AlertDialogAction onClick={handleClearDraft}>Effacer</AlertDialogAction>
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

          {/* ── Identification ── */}
          <div className="space-y-4">
            <h3 className="text-lg font-semibold border-b pb-2">Identification</h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <Label htmlFor="name">Nom *</Label>
                <div className="flex gap-2">
                  <Input
                    id="name"
                    value={formData.name}
                    onChange={(e) => updateFormData({ name: e.target.value })}
                    required
                  />
                  <Button
                    type="button"
                    variant="outline"
                    size="icon"
                    onClick={() => updateFormData({ name: toTitleCase(formData.name) })}
                    title="Normaliser la casse (ALL CAPS → Title Case)"
                  >
                    <Type className="h-4 w-4" />
                  </Button>
                </div>
                <p className="text-xs text-muted-foreground mt-1">
                  Cliquez <Type className="h-3 w-3 inline" /> pour convertir les majuscules
                </p>
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

          {/* ── Prix & Marges ── */}
          <div className="space-y-4">
            <h3 className="text-lg font-semibold border-b pb-2">Prix & Marges</h3>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div>
                <Label htmlFor="price_ht">Prix HT (€) *</Label>
                <Input
                  id="price_ht"
                  type="number" step="0.01"
                  value={formData.price_ht || ''}
                  onChange={(e) => {
                    const ht = parseFloat(e.target.value) || 0;
                    const tva = formData.tva_rate || 20;
                    const ttc = parseFloat((ht * (1 + tva / 100)).toFixed(2));
                    updateFormData({ price_ht: ht, price_ttc: ttc, price: ttc });
                  }}
                  required
                />
              </div>
              <div>
                <Label htmlFor="tva_rate">TVA (%)</Label>
                <Input
                  id="tva_rate"
                  type="number" step="0.1"
                  value={formData.tva_rate || 20}
                  onChange={(e) => {
                    const tva = parseFloat(e.target.value) || 20;
                    const ht = formData.price_ht || 0;
                    const ttc = parseFloat((ht * (1 + tva / 100)).toFixed(2));
                    updateFormData({ tva_rate: tva, price_ttc: ttc, price: ttc });
                  }}
                />
              </div>
              <div>
                <Label htmlFor="price_ttc">Prix TTC (€)</Label>
                <Input id="price_ttc" type="number" step="0.01" value={formData.price_ttc || ''} readOnly className="bg-muted" />
              </div>
              <div>
                <Label htmlFor="margin_percent">Marge (%)</Label>
                <Input
                  id="margin_percent"
                  type="number" step="0.1"
                  value={formData.margin_percent || ''}
                  onChange={(e) => updateFormData({ margin_percent: parseFloat(e.target.value) || 0 })}
                  placeholder="Marge commerciale"
                />
              </div>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <Label htmlFor="eco_tax">Éco-taxe (€)</Label>
                <Input id="eco_tax" type="number" step="0.01" value={formData.eco_tax || 0}
                  onChange={(e) => updateFormData({ eco_tax: parseFloat(e.target.value) || 0 })} />
              </div>
              <div>
                <Label htmlFor="eco_contribution">Éco-contribution (€)</Label>
                <Input id="eco_contribution" type="number" step="0.01" value={formData.eco_contribution || 0}
                  onChange={(e) => updateFormData({ eco_contribution: parseFloat(e.target.value) || 0 })} />
              </div>
              <div>
                <Label htmlFor="price">Prix Public TTC (€) *</Label>
                <Input id="price" type="number" step="0.01" value={formData.price}
                  onChange={(e) => updateFormData({ price: parseFloat(e.target.value) || 0 })} required />
              </div>
            </div>
          </div>

          {/* ── Logistique & Stock ── */}
          <div className="space-y-4">
            <h3 className="text-lg font-semibold border-b pb-2">Logistique & Stock</h3>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div>
                <Label htmlFor="stock">Stock actuel</Label>
                <Input id="stock" type="number" value={formData.stock_quantity}
                  onChange={(e) => updateFormData({ stock_quantity: parseInt(e.target.value) || 0 })} />
              </div>
              <div>
                <Label htmlFor="min_stock_alert">Alerte stock minimum</Label>
                <Input id="min_stock_alert" type="number" value={formData.min_stock_alert || 10}
                  onChange={(e) => updateFormData({ min_stock_alert: parseInt(e.target.value) || 10 })} />
              </div>
              <div>
                <Label htmlFor="reorder_quantity">Quantité de réappro</Label>
                <Input id="reorder_quantity" type="number" value={formData.reorder_quantity || 50}
                  onChange={(e) => updateFormData({ reorder_quantity: parseInt(e.target.value) || 50 })} />
              </div>
              <div>
                <Label htmlFor="weight_kg">Poids (kg)</Label>
                <Input id="weight_kg" type="number" step="0.001" value={formData.weight_kg || ''}
                  onChange={(e) => updateFormData({ weight_kg: parseFloat(e.target.value) || 0 })} />
              </div>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="dimensions_cm">Dimensions (cm)</Label>
                <Input id="dimensions_cm" value={formData.dimensions_cm || ''}
                  onChange={(e) => updateFormData({ dimensions_cm: e.target.value })}
                  placeholder="LxlxH (ex: 30x20x5)" />
              </div>
              <div>
                <Label htmlFor="image_url">URL de l'image</Label>
                <Input id="image_url" value={formData.image_url || ''}
                  onChange={(e) => updateFormData({ image_url: e.target.value })}
                  placeholder="https://..." />
                {formData.image_url && !formData.image_url.includes('supabase') && (
                  <p className="text-xs text-amber-600 mt-1">
                    ⚠ URL externe — sera synchronisée vers Supabase à la sauvegarde
                  </p>
                )}
              </div>
            </div>
          </div>

          {/* ── Description ── */}
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

          {/* ── Aperçu SEO (généré automatiquement à la sauvegarde) ── */}
          <div className="space-y-4">
            <h3 className="text-lg font-semibold border-b pb-2 flex items-center gap-2">
              Aperçu SEO
              <Badge variant="secondary" className="text-xs font-normal">Auto-généré à la sauvegarde</Badge>
            </h3>
            <div className="p-4 border rounded-lg bg-white dark:bg-card space-y-2">
              {/* Simulation résultat Google */}
              <p className="text-xs text-muted-foreground mb-1">Aperçu dans Google :</p>
              <div className="space-y-1">
                <p className="text-[15px] font-medium text-blue-600 leading-snug line-clamp-1">
                  {metaTitle || 'Nom du produit | Ma Papeterie Chaumont'}
                </p>
                <p className="text-xs text-green-700">
                  ma-papeterie.fr/produit/…
                </p>
                <p className="text-sm text-gray-600 line-clamp-2">
                  {metaDesc || 'Description générée automatiquement depuis le nom, le prix et la description du produit.'}
                </p>
              </div>
              <div className="flex gap-4 mt-2 pt-2 border-t text-xs text-muted-foreground">
                <span className={metaTitle.length > 60 ? 'text-orange-500' : ''}>
                  Titre : {metaTitle.length}/70 car.
                </span>
                <span className={metaDesc.length > 150 ? 'text-orange-500' : ''}>
                  Description : {metaDesc.length}/160 car.
                </span>
              </div>
            </div>
          </div>

          {/* ── Options ── */}
          <div className="space-y-4">
            <h3 className="text-lg font-semibold border-b pb-2">Options</h3>
            <div className="flex flex-wrap gap-6">
              <div className="flex items-center space-x-2">
                <Switch id="eco" checked={formData.eco} onCheckedChange={(c) => updateFormData({ eco: c })} />
                <Label htmlFor="eco">Produit écologique</Label>
              </div>
              <div className="flex items-center space-x-2">
                <Switch id="featured" checked={formData.is_featured} onCheckedChange={(c) => updateFormData({ is_featured: c })} />
                <Label htmlFor="featured">Produit mis en avant</Label>
              </div>
              <div className="flex items-center space-x-2">
                <Switch id="is_active" checked={formData.is_active !== false} onCheckedChange={(c) => updateFormData({ is_active: c })} />
                <Label htmlFor="is_active">Produit actif</Label>
              </div>
            </div>
          </div>

          <div className="flex justify-end space-x-2">
            <Button variant="outline" onClick={handleCancel}>Annuler</Button>
            <Button onClick={handleSave}>
              <Save className="h-4 w-4 mr-2" />
              Sauvegarder
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  };

  // ── Vue détail produit ─────────────────────────────────────────────────────

  const ProductDetailView = ({ product }: { product: Product }) => (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <span>{product.name}</span>
            <div className="flex space-x-2">
              <Button variant="outline" size="sm" onClick={() => { setViewingProduct(null); setEditingProduct(product); }}>
                <Edit className="h-4 w-4 mr-2" />Modifier
              </Button>
              <Button variant="ghost" size="sm" onClick={() => setViewingProduct(null)}>
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
                    <div className="flex justify-between"><dt className="text-muted-foreground">Prix TTC:</dt><dd className="font-semibold">{product.price.toFixed(2)} €</dd></div>
                    <div className="flex justify-between"><dt className="text-muted-foreground">Prix HT:</dt><dd>{product.price_ht?.toFixed(2)} €</dd></div>
                    <div className="flex justify-between"><dt className="text-muted-foreground">TVA:</dt><dd>{product.tva_rate}%</dd></div>
                    {product.ean && <div className="flex justify-between"><dt className="text-muted-foreground">EAN:</dt><dd>{product.ean}</dd></div>}
                    {product.manufacturer_code && <div className="flex justify-between"><dt className="text-muted-foreground">Code fabricant:</dt><dd>{product.manufacturer_code}</dd></div>}
                  </dl>
                </div>
                <div>
                  <h3 className="font-semibold mb-2">Stock & Logistique</h3>
                  <dl className="space-y-2 text-sm">
                    <div className="flex justify-between"><dt className="text-muted-foreground">Stock total:</dt><dd className="font-semibold">{product.stock_quantity}</dd></div>
                    <div className="flex justify-between"><dt className="text-muted-foreground">Alerte stock:</dt><dd>{product.min_stock_alert}</dd></div>
                    <div className="flex justify-between"><dt className="text-muted-foreground">Qté réappro:</dt><dd>{product.reorder_quantity}</dd></div>
                    {product.weight_kg && <div className="flex justify-between"><dt className="text-muted-foreground">Poids:</dt><dd>{product.weight_kg} kg</dd></div>}
                    {product.dimensions_cm && <div className="flex justify-between"><dt className="text-muted-foreground">Dimensions:</dt><dd>{product.dimensions_cm} cm</dd></div>}
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

  // ── Rendu ──────────────────────────────────────────────────────────────────

  if (isLoading || loading) {
    return (
      <AdminLayout title="Gestion des produits" description="Gérez votre catalogue de produits">
        <div className="text-center">Chargement...</div>
      </AdminLayout>
    );
  }

  if (!user || !isAdmin) return null;

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
          <ProductQualityDashboard onComplete={fetchProducts} />
        </TabsContent>

        <TabsContent value="catalogue">
          {/* ── Barre d'outils ── */}
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 mb-6">
            <div className="flex items-center gap-2 w-full sm:w-auto">
              <div className="relative flex-1 sm:flex-none">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Rechercher par nom, EAN, code…"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-9 w-full sm:w-72"
                />
              </div>
              {searchTerm && (
                <span className="text-sm text-muted-foreground whitespace-nowrap">
                  {filteredProducts.length} résultat{filteredProducts.length > 1 ? 's' : ''}
                </span>
              )}
            </div>
            <Button onClick={() => setIsCreating(true)}>
              <Plus className="h-4 w-4 mr-2" />
              Nouveau produit
            </Button>
          </div>

          {/* Import CSV — masqué par défaut, affiché sur demande */}
          <div className="mb-4">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowCsvImport(v => !v)}
            >
              <Upload className="h-4 w-4 mr-2" />
              {showCsvImport ? "Masquer l'import CSV" : 'Importer CSV produits'}
            </Button>
            {showCsvImport && (
              <div className="mt-3">
                <ProductCsvImport onComplete={() => { fetchProducts(); setShowCsvImport(false); }} />
              </div>
            )}
          </div>

          {isCreating && (
            <ProductForm product={emptyProduct} onSave={handleSaveProduct} onCancel={() => setIsCreating(false)} />
          )}

          {viewingProduct && <ProductDetailView product={viewingProduct} />}

          {editingProduct && !viewingProduct && (
            <ProductForm product={editingProduct} onSave={handleSaveProduct} onCancel={() => setEditingProduct(null)} />
          )}

          {/* ── Grille produits ── */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredProducts.map((product) => (
              <Card key={product.id} className="relative overflow-hidden">
                {/* Miniature image */}
                {product.image_url ? (
                  <div className="h-36 bg-muted flex items-center justify-center overflow-hidden border-b">
                    <img
                      src={product.image_url}
                      alt={product.name}
                      loading="lazy"
                      className="h-full w-full object-contain p-2"
                      onError={(e) => {
                        (e.currentTarget as HTMLImageElement).style.display = 'none';
                        (e.currentTarget.parentElement as HTMLElement).classList.add('after:content-["📷"] after:text-3xl after:opacity-20');
                      }}
                    />
                  </div>
                ) : (
                  <div className="h-36 bg-muted/50 flex items-center justify-center border-b">
                    <ImageIcon className="h-10 w-10 text-muted-foreground/20" />
                  </div>
                )}

                <CardContent className="p-4">
                  <div className="flex justify-between items-start mb-2">
                    <h3 className="font-semibold text-base leading-snug flex-1 mr-2 line-clamp-2">
                      {product.name}
                    </h3>
                    <div className="flex space-x-0.5 shrink-0">
                      {/* Sync image */}
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => handleSyncImage(product)}
                        disabled={syncingImageId === product.id}
                        title="Synchroniser l'image"
                        className="h-7 w-7"
                      >
                        {syncingImageId === product.id
                          ? <Loader2 className="h-3.5 w-3.5 animate-spin" />
                          : <ImageIcon className="h-3.5 w-3.5" />
                        }
                      </Button>
                      {/* Offres fournisseurs */}
                      <Button variant="ghost" size="icon" asChild title="Offres fournisseurs" className="h-7 w-7">
                        <Link to={`/admin/products/${product.id}/offers`}>
                          <Truck className="h-3.5 w-3.5" />
                        </Link>
                      </Button>
                      {/* Fiche publique */}
                      <Button variant="ghost" size="icon" asChild title="Voir fiche produit" className="h-7 w-7">
                        <Link to={`/produit/${product.id}`} target="_blank">
                          <ExternalLink className="h-3.5 w-3.5" />
                        </Link>
                      </Button>
                      {/* Modifier */}
                      <Button variant="ghost" size="icon" onClick={() => setViewingProduct(product)} className="h-7 w-7">
                        <Edit className="h-3.5 w-3.5" />
                      </Button>
                      {/* Supprimer */}
                      <Button variant="ghost" size="icon" onClick={() => handleDeleteProduct(product.id)} className="h-7 w-7">
                        <Trash2 className="h-3.5 w-3.5 text-destructive" />
                      </Button>
                    </div>
                  </div>

                  <p className="text-xs text-muted-foreground mb-3 line-clamp-2">
                    {product.description || <span className="italic opacity-60">Aucune description</span>}
                  </p>

                  <div className="flex items-center justify-between mb-2">
                    <span className="text-lg font-bold text-primary">
                      {product.price.toFixed(2)} €
                    </span>
                    <span className="text-sm text-muted-foreground">
                      Stock: {product.stock_quantity}
                    </span>
                  </div>

                  <div className="flex flex-wrap gap-1">
                    <Badge variant="secondary" className="text-xs">{product.category}</Badge>
                    {product.badge && <Badge variant="outline" className="text-xs">{product.badge}</Badge>}
                    {product.eco && <Badge variant="secondary" className="text-xs">Éco</Badge>}
                    {product.is_featured && <Badge variant="destructive" className="text-xs">Featured</Badge>}
                    {product.ean && product.price > 0
                      ? <Badge variant="secondary" className="text-xs text-primary">Vendable</Badge>
                      : <Badge variant="outline" className="text-xs">Non vendable</Badge>
                    }
                    {product.stock_quantity === 0 && <Badge variant="destructive" className="text-xs">Rupture</Badge>}
                    {product.stock_quantity > 0 && product.stock_quantity <= 10 && (
                      <Badge variant="outline" className="text-xs text-destructive">Stock faible</Badge>
                    )}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>

          {filteredProducts.length === 0 && !loading && (
            <div className="text-center py-16 text-muted-foreground">
              <Search className="h-10 w-10 mx-auto mb-3 opacity-20" />
              <p>Aucun produit trouvé{searchTerm ? ` pour "${searchTerm}"` : ''}</p>
            </div>
          )}
        </TabsContent>
      </Tabs>
    </AdminLayout>
  );
}
