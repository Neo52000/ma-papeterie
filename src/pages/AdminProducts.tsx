import { useState, useEffect, useMemo, useRef, useCallback } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { AdminLayout } from "@/components/admin/AdminLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  Plus, Upload, BarChart2, Search, SlidersHorizontal, X,
} from "lucide-react";
import { ProductQualityDashboard } from "@/components/admin/ProductQualityDashboard";
import { useToast } from "@/hooks/use-toast";
import { useNavigate } from "react-router-dom";
import { ProductCsvImport } from "@/components/admin/ProductCsvImport";
import { usePageImageUpload } from "@/hooks/usePageImageUpload";
import type { Product } from "@/types/product";
import { toTitleCase, buildMetaTitle, buildMetaDesc } from "@/types/product";
import { ProductForm } from "@/components/admin/products/ProductForm";
import { ProductDetailView, ProductsGrid } from "@/components/admin/products/ProductsTable";

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
  const [filterCategory, setFilterCategory] = useState('all');
  const [filterStatus, setFilterStatus]     = useState('all');
  const [filterStock, setFilterStock]       = useState('all');
  const [filterImage, setFilterImage]       = useState('all');
  const [filterBrand, setFilterBrand]       = useState('all');
  const [aiImageProductId, setAiImageProductId] = useState<string | null>(null);
  const [uploadingProductId, setUploadingProductId] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const uploadTargetProductId = useRef<string | null>(null);
  const { upload: uploadImage } = usePageImageUpload();

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

  // ── Données ────────────────────────────────────────────────────────────────

  const fetchProducts = useCallback(async (search?: string) => {
    try {
      let query = supabase
        .from('products')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(500);

      if (search && search.trim().length >= 2) {
        const q = search.trim();
        // EAN exact ou recherche texte
        if (/^\d{8,14}$/.test(q)) {
          query = query.eq('ean', q);
        } else {
          query = query.or(`name.ilike.%${q}%,ean.ilike.%${q}%,manufacturer_code.ilike.%${q}%,brand.ilike.%${q}%`);
        }
      }

      const { data, error } = await query;
      if (error) throw error;
      setProducts(data || []);
    } catch (_error) {
      toast({ title: "Erreur", description: "Impossible de charger les produits", variant: "destructive" });
    } finally {
      setLoading(false);
    }
  }, [toast]);

  useEffect(() => {
    if (user && isAdmin) {
      fetchProducts();
    }
  }, [user, isAdmin, fetchProducts]);

  // Recherche serveur avec debounce
  useEffect(() => {
    if (!user || !isAdmin) return;
    const timer = setTimeout(() => {
      fetchProducts(searchTerm);
    }, 400);
    return () => clearTimeout(timer);
  }, [searchTerm, fetchProducts, user, isAdmin]);

  const categories = useMemo(() => {
    const cats = new Set(products.map(p => p.category).filter(Boolean));
    return Array.from(cats).sort();
  }, [products]);

  const brands = useMemo(() => {
    const set = new Set(products.map(p => p.brand).filter(Boolean));
    return Array.from(set as Set<string>).sort();
  }, [products]);

  const activeFilterCount = [filterCategory, filterStatus, filterStock, filterImage, filterBrand]
    .filter(f => f !== 'all').length;

  const resetFilters = () => {
    setFilterCategory('all');
    setFilterStatus('all');
    setFilterStock('all');
    setFilterImage('all');
    setFilterBrand('all');
  };

  const filteredProducts = useMemo(() => {
    return products.filter(p => {
      if (searchTerm) {
        const q = searchTerm.toLowerCase();
        if (
          !p.name.toLowerCase().includes(q) &&
          !p.ean?.toLowerCase().includes(q) &&
          !p.manufacturer_code?.toLowerCase().includes(q)
        ) return false;
      }
      if (filterCategory !== 'all' && p.category !== filterCategory) return false;
      if (filterStatus === 'active' && p.is_active === false) return false;
      if (filterStatus === 'inactive' && p.is_active !== false) return false;
      if (filterStock === 'in_stock' && p.stock_quantity <= 0) return false;
      if (filterStock === 'out_of_stock' && p.stock_quantity > 0) return false;
      if (filterStock === 'low_stock' && !(p.stock_quantity > 0 && p.stock_quantity <= (p.min_stock_alert || 10))) return false;
      if (filterImage === 'with_image' && !p.image_url) return false;
      if (filterImage === 'no_image' && !!p.image_url) return false;
      if (filterBrand !== 'all' && (p.brand ?? '') !== filterBrand) return false;
      return true;
    });
  }, [products, searchTerm, filterCategory, filterStatus, filterStock, filterImage, filterBrand]);

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

    if (error) return; // SEO generation failed silently
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
    } catch (_e) {
      if (!silent) toast({ title: 'Erreur', description: "Impossible de synchroniser l'image", variant: 'destructive' });
    } finally {
      if (!silent) setSyncingImageId(null);
    }
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    const productId = uploadTargetProductId.current;
    if (!file || !productId) return;
    e.target.value = '';
    setUploadingProductId(productId);
    try {
      const url = await uploadImage(file, `products/${productId}`);
      const { error } = await supabase
        .from('products')
        .update({ image_url: url })
        .eq('id', productId);
      if (error) throw error;
      toast({ title: 'Image uploadée', description: 'La photo a été enregistrée sur le produit' });
      fetchProducts();
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Impossible d'uploader l'image";
      toast({ title: 'Erreur', description: message, variant: 'destructive' });
    } finally {
      setUploadingProductId(null);
      uploadTargetProductId.current = null;
    }
  };

  const handleAiImageGenerated = async (url: string) => {
    if (!aiImageProductId) return;
    try {
      const { error } = await supabase
        .from('products')
        .update({ image_url: url })
        .eq('id', aiImageProductId);
      if (error) throw error;
      toast({ title: 'Image IA appliquée', description: 'La photo générée a été enregistrée sur le produit' });
      fetchProducts();
    } catch {
      toast({ title: 'Erreur', description: "Impossible de sauvegarder l'image", variant: 'destructive' });
    } finally {
      setAiImageProductId(null);
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
      autoGenerateSEO(savedProduct).catch(() => {});
      if (savedProduct.image_url && !savedProduct.image_url.includes('supabase')) {
        handleSyncImage(savedProduct, true).catch(() => {});
      }

    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : "Impossible de sauvegarder";
      toast({ title: "Erreur", description: message, variant: "destructive" });
    }
  };

  const handleDeleteProduct = async (id: string) => {
    if (!confirm('Êtes-vous sûr de vouloir supprimer ce produit ?')) return;
    try {
      const { error } = await supabase.from('products').delete().eq('id', id);
      if (error) throw error;
      toast({ title: "Succès", description: "Produit supprimé" });
      fetchProducts();
    } catch (_error) {
      toast({ title: "Erreur", description: "Impossible de supprimer", variant: "destructive" });
    }
  };

  const handleUploadClick = (productId: string) => {
    uploadTargetProductId.current = productId;
    fileInputRef.current?.click();
  };

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
            </div>
            <Button onClick={() => setIsCreating(true)}>
              <Plus className="h-4 w-4 mr-2" />
              Nouveau produit
            </Button>
          </div>

          {/* ── Barre de filtres ── */}
          <div className="flex flex-wrap items-center gap-2 mb-4">
            <SlidersHorizontal className="h-4 w-4 text-muted-foreground shrink-0" />
            <Select value={filterCategory} onValueChange={setFilterCategory}>
              <SelectTrigger className="h-8 w-44 text-sm">
                <SelectValue placeholder="Catégorie" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Toutes catégories</SelectItem>
                {categories.map(cat => (
                  <SelectItem key={cat} value={cat}>{cat}</SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Select value={filterStatus} onValueChange={setFilterStatus}>
              <SelectTrigger className="h-8 w-36 text-sm">
                <SelectValue placeholder="Statut" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Tous statuts</SelectItem>
                <SelectItem value="active">Actif</SelectItem>
                <SelectItem value="inactive">Inactif</SelectItem>
              </SelectContent>
            </Select>

            <Select value={filterStock} onValueChange={setFilterStock}>
              <SelectTrigger className="h-8 w-36 text-sm">
                <SelectValue placeholder="Stock" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Tout stock</SelectItem>
                <SelectItem value="in_stock">En stock</SelectItem>
                <SelectItem value="out_of_stock">Rupture</SelectItem>
                <SelectItem value="low_stock">Stock faible</SelectItem>
              </SelectContent>
            </Select>

            <Select value={filterImage} onValueChange={setFilterImage}>
              <SelectTrigger className="h-8 w-36 text-sm">
                <SelectValue placeholder="Image" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Toutes images</SelectItem>
                <SelectItem value="with_image">Avec image</SelectItem>
                <SelectItem value="no_image">Sans image</SelectItem>
              </SelectContent>
            </Select>

            <Select value={filterBrand} onValueChange={setFilterBrand}>
              <SelectTrigger className="h-8 w-40 text-sm">
                <SelectValue placeholder="Marque" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Toutes marques</SelectItem>
                {brands.map(b => (
                  <SelectItem key={b} value={b}>{b}</SelectItem>
                ))}
              </SelectContent>
            </Select>

            {activeFilterCount > 0 && (
              <>
                <Badge variant="secondary" className="h-7 px-2 text-xs">
                  {activeFilterCount} filtre{activeFilterCount > 1 ? 's' : ''} actif{activeFilterCount > 1 ? 's' : ''}
                </Badge>
                <Button variant="ghost" size="sm" className="h-7 px-2 text-xs" onClick={resetFilters}>
                  <X className="h-3 w-3 mr-1" />
                  Réinitialiser
                </Button>
              </>
            )}

            <span className="ml-auto text-sm text-muted-foreground">
              {filteredProducts.length.toLocaleString('fr-FR')} produit{filteredProducts.length > 1 ? 's' : ''}
            </span>
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

          {viewingProduct && (
            <ProductDetailView
              product={viewingProduct}
              onClose={() => setViewingProduct(null)}
              onEdit={(product) => { setViewingProduct(null); setEditingProduct(product); }}
            />
          )}

          {editingProduct && !viewingProduct && (
            <ProductForm product={editingProduct} onSave={handleSaveProduct} onCancel={() => setEditingProduct(null)} />
          )}

          <ProductsGrid
            products={filteredProducts}
            loading={loading}
            searchTerm={searchTerm}
            activeFilterCount={activeFilterCount}
            syncingImageId={syncingImageId}
            uploadingProductId={uploadingProductId}
            onSyncImage={handleSyncImage}
            onDelete={handleDeleteProduct}
            onView={setViewingProduct}
            onUploadClick={handleUploadClick}
            onAiImageClick={setAiImageProductId}
            onClearSearch={() => { setSearchTerm(''); resetFilters(); }}
            fileInputRef={fileInputRef}
            onFileUpload={handleFileUpload}
            aiImageProductId={aiImageProductId}
            onAiImageGenerated={handleAiImageGenerated}
            onAiImageDialogChange={(open) => { if (!open) setAiImageProductId(null); }}
          />
        </TabsContent>
      </Tabs>
    </AdminLayout>
  );
}
