import React from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Trash2, Edit, ExternalLink, Truck, Image as ImageIcon,
  Search, Loader2, Upload, Sparkles, X,
} from "lucide-react";
import { Link } from "react-router-dom";
import { SupplierComparison } from "@/components/admin/SupplierComparison";
import { StockLocations } from "@/components/admin/StockLocations";
import { CompetitorPrices } from "@/components/admin/CompetitorPrices";
import { ProductPricing } from "@/components/admin/ProductPricing";
import { AIImageDialog } from "@/components/page-builder/AIImageDialog";
import type { Product } from "@/types/product";

// ── Vue détail produit ─────────────────────────────────────────────────────

interface ProductDetailViewProps {
  product: Product;
  onClose: () => void;
  onEdit: (product: Product) => void;
}

export function ProductDetailView({ product, onClose, onEdit }: ProductDetailViewProps) {
  return (
    <div className="space-y-6">
      <Card>
        <div className="p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold">{product.name}</h3>
            <div className="flex space-x-2">
              <Button variant="outline" size="sm" onClick={() => { onClose(); onEdit(product); }}>
                <Edit className="h-4 w-4 mr-2" />Modifier
              </Button>
              <Button variant="ghost" size="sm" onClick={onClose}>
                <X className="h-4 w-4" />
              </Button>
            </div>
          </div>
          <Tabs defaultValue="details" className="space-y-4">
            <TabsList>
              <TabsTrigger value="details">Détails</TabsTrigger>
              <TabsTrigger value="pricing">Tarifs</TabsTrigger>
              <TabsTrigger value="suppliers">Fournisseurs</TabsTrigger>
              <TabsTrigger value="stock">Stocks</TabsTrigger>
              <TabsTrigger value="competitors">Concurrents</TabsTrigger>
            </TabsList>
            <TabsContent value="details">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <h3 className="font-semibold mb-2">Informations générales</h3>
                  <dl className="space-y-2 text-sm">
                    {product.cost_price != null && product.cost_price > 0 && <div className="flex justify-between"><dt className="text-muted-foreground">Prix d'achat HT:</dt><dd className="font-semibold text-orange-600">{product.cost_price.toFixed(2)} €</dd></div>}
                    <div className="flex justify-between"><dt className="text-muted-foreground">Prix vente HT:</dt><dd>{product.price_ht?.toFixed(2)} €</dd></div>
                    <div className="flex justify-between"><dt className="text-muted-foreground">Prix vente TTC:</dt><dd className="font-semibold">{product.price.toFixed(2)} €</dd></div>
                    <div className="flex justify-between"><dt className="text-muted-foreground">TVA:</dt><dd>{product.tva_rate}%</dd></div>
                    {product.cost_price != null && product.cost_price > 0 && product.price_ht > 0 && (
                      <div className="flex justify-between"><dt className="text-muted-foreground">Marge:</dt><dd className={`font-semibold ${((product.price_ht - product.cost_price) / product.cost_price * 100) >= 20 ? 'text-green-600' : 'text-red-600'}`}>{(((product.price_ht - product.cost_price) / product.cost_price) * 100).toFixed(1)}%</dd></div>
                    )}
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
            <TabsContent value="pricing">
              <ProductPricing productId={product.id} basePrice={product.price} tvaRate={product.tva_rate ?? 20} />
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
        </div>
      </Card>
    </div>
  );
}

// ── Grille produits ────────────────────────────────────────────────────────

interface ProductsGridProps {
  products: Product[];
  loading: boolean;
  searchTerm: string;
  activeFilterCount: number;
  syncingImageId: string | null;
  uploadingProductId: string | null;
  onSyncImage: (product: Product) => void;
  onDelete: (id: string) => void;
  onView: (product: Product) => void;
  onUploadClick: (productId: string) => void;
  onAiImageClick: (productId: string) => void;
  onClearSearch: () => void;
  fileInputRef: React.RefObject<HTMLInputElement>;
  onFileUpload: (e: React.ChangeEvent<HTMLInputElement>) => void;
  aiImageProductId: string | null;
  onAiImageGenerated: (url: string) => void;
  onAiImageDialogChange: (open: boolean) => void;
}

export function ProductsGrid({
  products,
  loading,
  searchTerm,
  activeFilterCount,
  syncingImageId,
  uploadingProductId,
  onSyncImage,
  onDelete,
  onView,
  onUploadClick,
  onAiImageClick,
  onClearSearch,
  fileInputRef,
  onFileUpload,
  aiImageProductId,
  onAiImageGenerated,
  onAiImageDialogChange,
}: ProductsGridProps) {
  return (
    <>
      {/* ── Grille produits ── */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {products.map((product) => (
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
              <div className="h-36 bg-muted/50 flex flex-col items-center justify-center border-b gap-2">
                <ImageIcon className="h-8 w-8 text-muted-foreground/20" />
                <div className="flex gap-1.5">
                  <Button
                    variant="outline"
                    size="sm"
                    className="text-xs gap-1.5"
                    disabled={uploadingProductId === product.id}
                    onClick={(e) => {
                      e.stopPropagation();
                      onUploadClick(product.id);
                    }}
                  >
                    {uploadingProductId === product.id
                      ? <Loader2 className="h-3 w-3 animate-spin" />
                      : <Upload className="h-3 w-3" />
                    }
                    Photo
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    className="text-xs gap-1.5"
                    onClick={(e) => { e.stopPropagation(); onAiImageClick(product.id); }}
                  >
                    <Sparkles className="h-3 w-3" />
                    IA
                  </Button>
                </div>
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
                    onClick={() => onSyncImage(product)}
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
                  <Button variant="ghost" size="icon" onClick={() => onView(product)} className="h-7 w-7">
                    <Edit className="h-3.5 w-3.5" />
                  </Button>
                  {/* Supprimer */}
                  <Button variant="ghost" size="icon" onClick={() => onDelete(product.id)} className="h-7 w-7">
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

      {/* Input fichier caché pour upload photo */}
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={onFileUpload}
      />

      {/* Dialog IA pour génération d'image depuis la grille */}
      <AIImageDialog
        open={!!aiImageProductId}
        onOpenChange={onAiImageDialogChange}
        onImageGenerated={onAiImageGenerated}
        pageSlug={`products/${aiImageProductId ?? 'new'}`}
      />

      {products.length === 0 && !loading && (
        <div className="text-center py-16 text-muted-foreground">
          <Search className="h-10 w-10 mx-auto mb-3 opacity-20" />
          <p>Aucun produit trouvé{searchTerm ? ` pour "${searchTerm}"` : ''}</p>
          {(searchTerm || activeFilterCount > 0) && (
            <Button variant="ghost" size="sm" className="mt-2" onClick={onClearSearch}>
              Effacer la recherche et les filtres
            </Button>
          )}
        </div>
      )}
    </>
  );
}
