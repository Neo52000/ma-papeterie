import { useState, useEffect } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import { Helmet } from "react-helmet-async";
import { supabase } from "@/integrations/supabase/client";
import Header from "@/components/layout/Header";
import Footer from "@/components/layout/Footer";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Separator } from "@/components/ui/separator";
import {
  ShoppingCart, Heart, ArrowLeft, Package, Truck, Shield,
  AlertTriangle, Weight, Zap, ChevronLeft, ChevronRight,
  ImageOff, Check, Clock,
} from "lucide-react";
import { toast } from "sonner";
import { useCartStore } from "@/stores/cartStore";
import { PrixTransparenceWidget } from "@/components/product/PrixTransparenceWidget";
import { RecoWidget } from "@/components/product/RecoWidget";
import { track } from "@/hooks/useAnalytics";

interface ProductDetail {
  id: string;
  name: string;
  description: string | null;
  price: number;
  price_ht: number | null;
  price_ttc: number | null;
  tva_rate: number | null;
  eco_tax: number | null;
  eco_contribution: number | null;
  ean: string | null;
  manufacturer_code: string | null;
  manufacturer_ref: string | null;
  sku_interne: string | null;
  brand: string | null;
  image_url: string | null;
  category: string;
  subcategory: string | null;
  family: string | null;
  subfamily: string | null;
  badge: string | null;
  eco: boolean | null;
  stock_quantity: number | null;
  weight_kg: number | null;
  dimensions_cm: string | null;
  country_origin: string | null;
  customs_code: string | null;
  is_active: boolean | null;
  is_end_of_life: boolean | null;
  is_fragile: boolean | null;
  is_heavy: boolean | null;
  requires_special_shipping: boolean | null;
  delivery_days: number | null;
  warranty_months: number | null;
  status: string | null;
  attributs: Record<string, any> | null;
}

interface ProductImage {
  id: string;
  url_originale: string;
  url_optimisee: string | null;
  alt_seo: string | null;
  is_principal: boolean;
  display_order: number;
}

interface ProductSeo {
  meta_title: string | null;
  meta_description: string | null;
  description_courte: string | null;
  description_longue: string | null;
  description_detaillee: string | null;
}

interface ProductAttribute {
  id: string;
  attribute_type: string;
  attribute_name: string;
  attribute_value: string;
  unit: string | null;
}

interface ProductPackaging {
  packaging_type: string;
  qty: number;
  ean: string | null;
  weight_gr: number | null;
  dimensions: string | null;
}

interface RelatedProduct {
  relation_type: string;
  related_product_id: string;
}

export default function ProductDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const addToCart = useCartStore.getState;

  const [product, setProduct] = useState<ProductDetail | null>(null);
  const [images, setImages] = useState<ProductImage[]>([]);
  const [seo, setSeo] = useState<ProductSeo | null>(null);
  const [attributes, setAttributes] = useState<ProductAttribute[]>([]);
  const [packagings, setPackagings] = useState<ProductPackaging[]>([]);
  const [relatedProducts, setRelatedProducts] = useState<RelatedProduct[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeImageIdx, setActiveImageIdx] = useState(0);

  useEffect(() => {
    if (id) fetchProduct(id);
  }, [id]);

  const fetchProduct = async (productId: string) => {
    setLoading(true);
    try {
      const [productRes, imagesRes, seoRes, attrsRes, packRes, relRes] = await Promise.all([
        supabase.from('products').select('*').eq('id', productId).maybeSingle(),
        supabase.from('product_images').select('*').eq('product_id', productId).order('display_order').order('is_principal', { ascending: false }),
        supabase.from('product_seo').select('meta_title, meta_description, description_courte, description_longue, description_detaillee').eq('product_id', productId).maybeSingle(),
        supabase.from('product_attributes').select('*').eq('product_id', productId).order('attribute_type'),
        supabase.from('product_packagings').select('*').eq('product_id', productId),
        supabase.from('product_relations').select('relation_type, related_product_id').eq('product_id', productId).limit(6),
      ]);

      if (productRes.error) throw productRes.error;
      if (!productRes.data) { navigate('/catalogue'); return; }

      setProduct(productRes.data as any);
      const pd = productRes.data as any;
      track('product_viewed', { product_id: productId, name: pd.name, category: pd.category });
      setImages((imagesRes.data as any) || []);
      setSeo((seoRes.data as any) || null);
      setAttributes((attrsRes.data as any) || []);
      setPackagings((packRes.data as any) || []);
      setRelatedProducts((relRes.data as any) || []);
    } catch (err) {
      console.error(err);
      toast.error("Impossible de charger le produit");
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <>
        <Header />
        <main className="max-w-7xl mx-auto px-4 py-12">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 animate-pulse">
            <div className="aspect-square bg-muted rounded-xl" />
            <div className="space-y-4">
              <div className="h-8 bg-muted rounded w-3/4" />
              <div className="h-6 bg-muted rounded w-1/4" />
              <div className="h-4 bg-muted rounded" />
              <div className="h-4 bg-muted rounded w-5/6" />
            </div>
          </div>
        </main>
        <Footer />
      </>
    );
  }

  if (!product) return null;

  const displayPrice = product.price_ttc ?? product.price ?? 0;
  const displayImages = images.length > 0 ? images : product.image_url ? [{ id: 'main', url_originale: product.image_url, url_optimisee: null, alt_seo: product.name, is_principal: true, display_order: 0 }] : [];
  const currentImage = displayImages[activeImageIdx];

  // T5.2 — UX disponibilité granulaire
  const stock = product.stock_quantity ?? 0;
  const deliveryDays = product.delivery_days;
  let stockLabel: string;
  let stockColor: string;
  let stockIcon: 'check' | 'clock' | 'x';
  if (product.is_end_of_life) {
    stockLabel = 'Fin de vie — stock limité';
    stockColor = 'text-amber-600';
    stockIcon = 'clock';
  } else if (stock > 0) {
    stockLabel = `En stock (${stock} unités)`;
    stockColor = 'text-primary';
    stockIcon = 'check';
  } else if (deliveryDays) {
    stockLabel = `Disponible sous ${deliveryDays} jours ouvrés`;
    stockColor = 'text-amber-600';
    stockIcon = 'clock';
  } else {
    stockLabel = 'Sur commande';
    stockColor = 'text-muted-foreground';
    stockIcon = 'x';
  }
  const isOrderable = stock > 0 || !!deliveryDays;

  // T4.3 — Taxes détaillées depuis attributs
  const taxeD3e = product.attributs?.taxe_d3e ? parseFloat(product.attributs.taxe_d3e) : null;
  const taxeCop = product.attributs?.taxe_cop ? parseFloat(product.attributs.taxe_cop) : null;

  // Legacy compat alias
  const stockStatus = stock > 0 ? 'in_stock' : 'out_of_stock';

  const attributesByType = attributes.reduce((acc, attr) => {
    if (!acc[attr.attribute_type]) acc[attr.attribute_type] = [];
    acc[attr.attribute_type].push(attr);
    return acc;
  }, {} as Record<string, ProductAttribute[]>);

  const pageTitle = seo?.meta_title || product.name;
  const pageDescription = seo?.meta_description || seo?.description_courte || product.description || '';

  const handleAddToCart = () => {
    if (stockStatus === 'out_of_stock') return;
    toast.success(`${product.name} ajouté au panier`);
  };

  return (
    <>
      <Helmet>
        <title>{pageTitle} | Ma Papeterie</title>
        <meta name="description" content={pageDescription.slice(0, 160)} />
        {product.ean && <meta name="product:retailer_item_id" content={product.ean} />}
      </Helmet>
      <Header />
      <main className="max-w-7xl mx-auto px-4 py-8">
        {/* Breadcrumb */}
        <nav className="flex items-center gap-2 text-sm text-muted-foreground mb-8">
          <Link to="/" className="hover:text-foreground transition-colors">Accueil</Link>
          <span>/</span>
          <Link to="/catalogue" className="hover:text-foreground transition-colors">Catalogue</Link>
          {product.category && (
            <>
              <span>/</span>
              <span className="text-foreground">{product.category}</span>
            </>
          )}
        </nav>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 mb-12">
          {/* Galerie images */}
          <div className="space-y-4">
            <div className="relative aspect-square rounded-xl border bg-card overflow-hidden">
              {currentImage ? (
                <img
                  src={currentImage.url_originale}
                  alt={currentImage.alt_seo || product.name}
                  className="w-full h-full object-contain p-4"
                  onError={(e) => { (e.target as HTMLImageElement).src = '/placeholder.svg'; }}
                />
              ) : (
                <div className="flex flex-col items-center justify-center h-full text-muted-foreground gap-3">
                  <ImageOff className="h-16 w-16 opacity-30" />
                  <span className="text-sm">Image non disponible</span>
                </div>
              )}

              {displayImages.length > 1 && (
                <>
                  <button
                    onClick={() => setActiveImageIdx(Math.max(0, activeImageIdx - 1))}
                    disabled={activeImageIdx === 0}
                    className="absolute left-2 top-1/2 -translate-y-1/2 bg-background/80 backdrop-blur rounded-full p-1.5 shadow disabled:opacity-30"
                  >
                    <ChevronLeft className="h-4 w-4" />
                  </button>
                  <button
                    onClick={() => setActiveImageIdx(Math.min(displayImages.length - 1, activeImageIdx + 1))}
                    disabled={activeImageIdx === displayImages.length - 1}
                    className="absolute right-2 top-1/2 -translate-y-1/2 bg-background/80 backdrop-blur rounded-full p-1.5 shadow disabled:opacity-30"
                  >
                    <ChevronRight className="h-4 w-4" />
                  </button>
                </>
              )}

              {/* Badges contraintes */}
              <div className="absolute top-3 left-3 flex flex-col gap-1">
                {product.is_fragile && (
                  <Badge variant="secondary" className="text-xs gap-1">
                    <AlertTriangle className="h-3 w-3" /> Fragile
                  </Badge>
                )}
                {product.is_heavy && (
                  <Badge variant="secondary" className="text-xs gap-1">
                    <Weight className="h-3 w-3" /> Lourd
                  </Badge>
                )}
                {product.requires_special_shipping && (
                  <Badge variant="secondary" className="text-xs gap-1">
                    <Truck className="h-3 w-3" /> Livraison spéciale
                  </Badge>
                )}
                {product.is_end_of_life && (
                  <Badge variant="destructive" className="text-xs">Fin de vie</Badge>
                )}
              </div>
            </div>

            {/* Miniatures */}
            {displayImages.length > 1 && (
              <div className="flex gap-2 overflow-x-auto pb-1">
                {displayImages.map((img, idx) => (
                  <button
                    key={img.id}
                    onClick={() => setActiveImageIdx(idx)}
                    className={`shrink-0 w-16 h-16 rounded-lg border-2 overflow-hidden transition-all ${idx === activeImageIdx ? 'border-primary' : 'border-transparent hover:border-muted-foreground'}`}
                  >
                    <img
                      src={img.url_originale}
                      alt={img.alt_seo || `${product.name} ${idx + 1}`}
                      className="w-full h-full object-contain p-1"
                      onError={(e) => { (e.target as HTMLImageElement).src = '/placeholder.svg'; }}
                    />
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Informations produit */}
          <div className="space-y-6">
            {/* En-tête */}
            <div>
              {product.brand && (
                <p className="text-sm text-muted-foreground font-medium uppercase tracking-wide mb-1">{product.brand}</p>
              )}
              <h1 className="text-2xl font-bold leading-tight">{product.name}</h1>
              <div className="flex flex-wrap gap-2 mt-2">
                {product.badge && <Badge>{product.badge}</Badge>}
                {product.eco && <Badge variant="secondary" className="gap-1"><Zap className="h-3 w-3" />Éco-responsable</Badge>}
                <Badge variant="outline">{product.category}</Badge>
              </div>
            </div>

            {/* Prix — T4.3 taxes détaillées */}
            <div className="p-4 rounded-xl bg-primary/5 border border-primary/10 space-y-1">
              <div className="flex items-baseline gap-3">
                <span className="text-3xl font-bold text-primary">{displayPrice.toFixed(2)} €</span>
                <span className="text-sm text-muted-foreground">TTC</span>
              </div>
              {product.price_ht && (
                <p className="text-sm text-muted-foreground">soit {product.price_ht.toFixed(2)} € HT (TVA {product.tva_rate ?? 20}%)</p>
              )}
              {product.eco_tax && product.eco_tax > 0 && (
                <p className="text-xs text-muted-foreground">dont éco-taxes : {product.eco_tax.toFixed(2)} €</p>
              )}
              {taxeD3e && taxeD3e > 0 && (
                <p className="text-xs text-muted-foreground">dont D3E : {taxeD3e.toFixed(2)} €</p>
              )}
              {taxeCop && taxeCop > 0 && (
                <p className="text-xs text-muted-foreground">dont COP : {taxeCop.toFixed(2)} €</p>
              )}
            </div>

            {/* Disponibilité — T5.2 UX granulaire */}
            <div className={`flex items-center gap-2 text-sm font-medium ${stockColor}`}>
              {stockIcon === 'check' && <Check className="h-4 w-4" />}
              {stockIcon === 'clock' && <Clock className="h-4 w-4" />}
              {stockIcon === 'x' && <Package className="h-4 w-4" />}
              {stockLabel}
            </div>

            {/* Transparence prix */}
            <PrixTransparenceWidget productId={product.id} ourPriceTtc={displayPrice} />

            {/* Garantie */}
            {product.warranty_months && (
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Shield className="h-4 w-4" />
                Garantie {product.warranty_months} mois
              </div>
            )}

            {/* Références */}
            <div className="grid grid-cols-2 gap-2 text-xs text-muted-foreground">
              {product.ean && <div><span className="font-medium">EAN :</span> {product.ean}</div>}
              {product.sku_interne && <div><span className="font-medium">Réf. interne :</span> {product.sku_interne}</div>}
              {product.manufacturer_ref && <div><span className="font-medium">Réf. fabricant :</span> {product.manufacturer_ref}</div>}
              {product.manufacturer_code && <div><span className="font-medium">Code fabricant :</span> {product.manufacturer_code}</div>}
            </div>

            <Separator />

            {/* CTA */}
            <div className="flex gap-3">
              <Button
                size="lg"
                className="flex-1 gap-2"
                disabled={!isOrderable}
                onClick={handleAddToCart}
              >
                <ShoppingCart className="h-5 w-5" />
                {!isOrderable ? 'Non disponible' : 'Ajouter au panier'}
              </Button>
              <Button variant="outline" size="lg">
                <Heart className="h-5 w-5" />
              </Button>
            </div>

            {/* Description courte */}
            {(seo?.description_courte || product.description) && (
              <p className="text-sm text-muted-foreground leading-relaxed">
                {seo?.description_courte || product.description}
              </p>
            )}
          </div>
        </div>

        {/* Onglets détaillés */}
        <Tabs defaultValue="description" className="mb-12">
          <TabsList className="mb-6">
            <TabsTrigger value="description">Description</TabsTrigger>
            <TabsTrigger value="specs">Caractéristiques</TabsTrigger>
            <TabsTrigger value="availability">Disponibilité & Conditionnements</TabsTrigger>
          </TabsList>

          {/* Description */}
          <TabsContent value="description">
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
              <div className="lg:col-span-2 space-y-6">
                {seo?.description_longue ? (
                  <div>
                    <h2 className="text-lg font-semibold mb-3">Description complète</h2>
                    <p className="text-muted-foreground leading-relaxed whitespace-pre-line">{seo.description_longue}</p>
                  </div>
                ) : product.description ? (
                  <div>
                    <h2 className="text-lg font-semibold mb-3">Description</h2>
                    <p className="text-muted-foreground leading-relaxed">{product.description}</p>
                  </div>
                ) : (
                  <p className="text-muted-foreground">Aucune description disponible pour ce produit.</p>
                )}

                {seo?.description_detaillee && (
                  <div>
                    <h2 className="text-lg font-semibold mb-3">Informations détaillées</h2>
                    <p className="text-muted-foreground leading-relaxed whitespace-pre-line">{seo.description_detaillee}</p>
                  </div>
                )}
              </div>

              <div className="space-y-4">
                <Card>
                  <CardContent className="p-4 space-y-3">
                    <h3 className="font-semibold text-sm">Informations pratiques</h3>
                    <dl className="space-y-2 text-sm">
                      {product.country_origin && (
                        <div className="flex justify-between">
                          <dt className="text-muted-foreground">Pays d'origine</dt>
                          <dd className="font-medium">{product.country_origin}</dd>
                        </div>
                      )}
                      {product.weight_kg && (
                        <div className="flex justify-between">
                          <dt className="text-muted-foreground">Poids</dt>
                          <dd className="font-medium">{product.weight_kg} kg</dd>
                        </div>
                      )}
                      {product.dimensions_cm && (
                        <div className="flex justify-between">
                          <dt className="text-muted-foreground">Dimensions</dt>
                          <dd className="font-medium">{product.dimensions_cm}</dd>
                        </div>
                      )}
                      {product.customs_code && (
                        <div className="flex justify-between">
                          <dt className="text-muted-foreground">Code douanier</dt>
                          <dd className="font-medium font-mono text-xs">{product.customs_code}</dd>
                        </div>
                      )}
                    </dl>
                  </CardContent>
                </Card>

                {/* Contraintes transport */}
                {(product.is_fragile || product.is_heavy || product.requires_special_shipping) && (
                  <Card className="border-destructive/30 bg-destructive/5">
                    <CardContent className="p-4 space-y-2">
                      <h3 className="font-semibold text-sm text-destructive flex items-center gap-2">
                        <AlertTriangle className="h-4 w-4" />
                        Contraintes transport
                      </h3>
                      {product.is_fragile && <p className="text-xs text-muted-foreground">⚠ Produit fragile — emballage soigné requis</p>}
                      {product.is_heavy && <p className="text-xs text-muted-foreground">⚠ Produit lourd — surcoût possible</p>}
                      {product.requires_special_shipping && <p className="text-xs text-muted-foreground">⚠ Expédition spéciale requise</p>}
                    </CardContent>
                  </Card>
                )}
              </div>
            </div>
          </TabsContent>

          {/* Caractéristiques */}
          <TabsContent value="specs">
            {attributes.length === 0 ? (
              <p className="text-muted-foreground text-sm">Aucun attribut normalisé disponible pour ce produit.</p>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {Object.entries(attributesByType).map(([type, attrs]) => (
                  <Card key={type}>
                    <CardContent className="p-4">
                      <h3 className="font-semibold text-sm capitalize mb-3">{type}</h3>
                      <dl className="space-y-2">
                        {attrs.map((attr) => (
                          <div key={attr.id} className="flex justify-between text-sm">
                            <dt className="text-muted-foreground">{attr.attribute_name}</dt>
                            <dd className="font-medium">{attr.attribute_value}{attr.unit ? ` ${attr.unit}` : ''}</dd>
                          </div>
                        ))}
                      </dl>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </TabsContent>

          {/* Disponibilité & Conditionnements */}
          <TabsContent value="availability">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
              {/* Stock */}
              <Card>
                <CardContent className="p-4 space-y-4">
                  <h3 className="font-semibold">Disponibilité</h3>
                  <div className={`flex items-center gap-3 p-3 rounded-lg ${stockStatus === 'in_stock' ? 'bg-primary/5 text-primary' : 'bg-destructive/5 text-destructive'}`}>
                    <Package className="h-5 w-5" />
                    <div>
                      <p className="font-semibold">
                        {stockStatus === 'in_stock' ? `En stock — ${product.stock_quantity} unités` : 'Rupture de stock'}
                      </p>
                      {product.delivery_days && (
                        <p className="text-xs text-muted-foreground">Délai fournisseur : {product.delivery_days} jours ouvrés</p>
                      )}
                    </div>
                  </div>
                  {product.warranty_months && (
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <Shield className="h-4 w-4" />
                      Garantie fabricant : {product.warranty_months} mois
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* Conditionnements */}
              {packagings.length > 0 && (
                <Card>
                  <CardContent className="p-4 space-y-3">
                    <h3 className="font-semibold">Conditionnements</h3>
                    <div className="space-y-2">
                      {packagings.map((pkg, idx) => (
                        <div key={idx} className="flex items-center justify-between text-sm p-2.5 rounded-lg border">
                          <div className="flex items-center gap-2">
                            <Package className="h-4 w-4 text-muted-foreground" />
                            <span className="font-medium uppercase">{pkg.packaging_type}</span>
                          </div>
                          <div className="text-right text-muted-foreground text-xs space-x-3">
                            <span>Qté : {pkg.qty}</span>
                            {pkg.ean && <span className="font-mono">{pkg.ean}</span>}
                            {pkg.weight_gr && <span>{(pkg.weight_gr / 1000).toFixed(2)} kg</span>}
                          </div>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              )}
            </div>
          </TabsContent>
        </Tabs>

        {/* Recommandations intelligentes */}
        <RecoWidget productId={product.id} />

        {/* Back */}
        <div className="mt-8">
          <Button variant="ghost" onClick={() => navigate(-1)} className="gap-2">
            <ArrowLeft className="h-4 w-4" />
            Retour au catalogue
          </Button>
        </div>
      </main>
      <Footer />
    </>
  );
}
