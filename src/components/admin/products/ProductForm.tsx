import { useState, useMemo } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  Trash2, Save, X, FileText, Clock, Type, Search, Loader2, Sparkles,
} from "lucide-react";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader,
  AlertDialogTitle, AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Separator } from "@/components/ui/separator";
import { useProductFormStore, ProductDraft } from "@/stores/productFormStore";
import { AIImageDialog } from "@/components/page-builder/AIImageDialog";
import { useCategories } from "@/hooks/useCategories";
import { useEanLookup } from "@/hooks/admin/useEanLookup";
import type { Product } from "@/types/product";
import { toTitleCase, buildMetaTitle, buildMetaDesc } from "@/types/product";

// ── Sélecteur de catégorie hiérarchique ───────────────────────────────────

const CategoryCascadeSelector = ({ formData, updateFormData }: {
  formData: Omit<Product, 'id'> | Product;
  updateFormData: (updates: Partial<Product>) => void;
}) => {
  const { categories: allCats } = useCategories();

  const formDataFamily = formData.family;
  const formDataSubfamily = formData.subfamily;
  const familles = useMemo(() => allCats.filter(c => c.level === "famille"), [allCats]);
  const sousFamilles = useMemo(() => {
    const fam = familles.find(f => f.name === formDataFamily);
    return fam ? allCats.filter(c => c.level === "sous_famille" && c.parent_id === fam.id) : [];
  }, [allCats, familles, formDataFamily]);
  const cats = useMemo(() => {
    const sf = sousFamilles.find(f => f.name === formDataSubfamily);
    if (sf) return allCats.filter(c => c.level === "categorie" && c.parent_id === sf.id);
    // Also show categories without subfamily parent
    const fam = familles.find(f => f.name === formDataFamily);
    if (fam) return allCats.filter(c => c.level === "categorie" && c.parent_id === fam.id);
    return allCats.filter(c => c.level === "categorie");
  }, [allCats, familles, sousFamilles, formDataFamily, formDataSubfamily]);
  const sousCats = useMemo(() => {
    const cat = cats.find(c => c.name === formData.category);
    return cat ? allCats.filter(c => c.level === "sous_categorie" && c.parent_id === cat.id) : [];
  }, [allCats, cats, formData.category]);

  return (
    <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
      <div>
        <Label>Famille</Label>
        <Select
          value={formData.family || ""}
          onValueChange={(v) => updateFormData({ family: v, subfamily: "", category: "", subcategory: "" })}
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
            value={formData.subfamily || ""}
            onValueChange={(v) => updateFormData({ subfamily: v, category: "", subcategory: "" })}
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
          onValueChange={(v) => updateFormData({ category: v, subcategory: "" })}
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
            value={formData.subcategory || ""}
            onValueChange={(v) => updateFormData({ subcategory: v })}
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

interface ProductFormProps {
  product: Omit<Product, 'id'> | Product;
  onSave: (product: Omit<Product, 'id'> | Product) => void;
  onCancel: () => void;
}

export function ProductForm({ product, onSave, onCancel }: ProductFormProps) {
  const { draftProduct, setDraft, clearDraft, lastModified } = useProductFormStore();

  const initialData = draftProduct && (
    ('id' in product && draftProduct.id === product.id) ||
    (!('id' in product) && !draftProduct.id)
  ) ? draftProduct : product;

  const [formData, setFormData] = useState<Omit<Product, 'id'> | Product>(initialData);

  const updateFormData = (updates: Partial<Product>) => {
    const newData = { ...formData, ...updates };
    setFormData(newData);
    setDraft(newData as ProductDraft);
  };

  const handleSave  = () => { onSave(formData); clearDraft(); };
  const handleCancel = () => { clearDraft(); onCancel(); };
  const handleClearDraft = () => { clearDraft(); setFormData(product); };

  // ── AI image generation ────────────────────────────────────────────────────
  const [showAiImageDialog, setShowAiImageDialog] = useState(false);

  // ── EAN lookup ─────────────────────────────────────────────────────────────
  const { eanLookupLoading, eanLookupResult, handleEanLookup, clearEanLookupResult } = useEanLookup();

  const applyEanLookup = () => {
    if (!eanLookupResult || eanLookupResult.erreur) return;
    updateFormData({
      name: eanLookupResult.titre_ecommerce || eanLookupResult.designation_courte || formData.name,
      brand: eanLookupResult.marque || formData.brand,
      manufacturer_code: eanLookupResult.reference_fabricant || formData.manufacturer_code,
      description: eanLookupResult.description || formData.description,
      ...(eanLookupResult.prix_ttc_constate ? { price: eanLookupResult.prix_ttc_constate } : {}),
    });
    clearEanLookupResult();
  };

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
              <div className="flex gap-2">
                <Input
                  id="ean"
                  value={formData.ean || ''}
                  onChange={(e) => { updateFormData({ ean: e.target.value }); clearEanLookupResult(); }}
                  placeholder="Code barre international"
                />
                <Button
                  type="button"
                  variant="outline"
                  size="icon"
                  disabled={!formData.ean || eanLookupLoading}
                  onClick={() => handleEanLookup(formData.ean)}
                  title="Identifier le produit via ChatGPT"
                >
                  {eanLookupLoading
                    ? <Loader2 className="h-4 w-4 animate-spin" />
                    : <Search className="h-4 w-4" />}
                </Button>
              </div>

              {eanLookupResult && (
                <div className="mt-3 p-3 border rounded-lg bg-muted/30 space-y-2 text-sm">
                  {eanLookupResult.erreur ? (
                    <p className="text-destructive">{eanLookupResult.erreur}</p>
                  ) : (
                    <>
                      <div className="flex items-center gap-2 font-medium">
                        <span>
                          {eanLookupResult.marque && <>{eanLookupResult.marque} — </>}
                          {eanLookupResult.designation_courte}
                        </span>
                        <Badge variant={eanLookupResult.source === 'local' ? 'default' : 'secondary'} className="text-[10px] px-1.5 py-0">
                          {eanLookupResult.source === 'local' ? 'Base locale' : 'ChatGPT'}
                        </Badge>
                      </div>
                      <div className="text-xs text-muted-foreground space-y-0.5">
                        {eanLookupResult.reference_fabricant && (
                          <p>Réf. fab. : {eanLookupResult.reference_fabricant}</p>
                        )}
                        {eanLookupResult.caracteristiques && (
                          <p>Caractéristiques : {eanLookupResult.caracteristiques}</p>
                        )}
                        {eanLookupResult.prix_ttc_constate != null && (
                          <p>Prix TTC constaté : {Number(eanLookupResult.prix_ttc_constate).toFixed(2)} €</p>
                        )}
                      </div>
                      <Separator />
                      <div className="font-medium text-xs">Fiche e-commerce générée</div>
                      {eanLookupResult.titre_ecommerce && (
                        <div className="font-medium">{eanLookupResult.titre_ecommerce}</div>
                      )}
                      {eanLookupResult.points_forts && eanLookupResult.points_forts.length > 0 && (
                        <ul className="text-xs text-muted-foreground list-disc pl-4 space-y-0.5">
                          {eanLookupResult.points_forts.map((p, i) => <li key={i}>{p}</li>)}
                        </ul>
                      )}
                      {eanLookupResult.description && (
                        <p className="text-xs text-muted-foreground line-clamp-4">{eanLookupResult.description}</p>
                      )}
                      <Button size="sm" className="w-full mt-1" onClick={applyEanLookup}>
                        Appliquer les informations
                      </Button>
                    </>
                  )}
                </div>
              )}
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
                value={formData.sku_interne || ''}
                onChange={(e) => updateFormData({ sku_interne: e.target.value })}
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
          <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
            <div>
              <Label htmlFor="cost_price">Prix d'achat HT (€)</Label>
              <Input id="cost_price" type="number" step="0.01"
                value={formData.cost_price || ''}
                onChange={(e) => {
                  const cp = parseFloat(e.target.value) || 0;
                  const ht = formData.price_ht || 0;
                  const margin = cp > 0 && ht > 0 ? Math.round(((ht - cp) / cp) * 10000) / 100 : 0;
                  updateFormData({ cost_price: cp || null, margin_percent: margin });
                }}
                placeholder="Coût fournisseur" />
            </div>
            <div>
              <Label htmlFor="margin_calc">Marge réelle (%)</Label>
              <Input id="margin_calc" readOnly className="bg-muted font-semibold"
                value={(() => {
                  const cp = formData.cost_price || 0;
                  const ht = formData.price_ht || 0;
                  if (cp > 0 && ht > 0) return `${((ht - cp) / cp * 100).toFixed(1)}%`;
                  return '—';
                })()} />
            </div>
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
              <div className="flex gap-2">
                <Input id="image_url" value={formData.image_url || ''}
                  onChange={(e) => updateFormData({ image_url: e.target.value })}
                  placeholder="https://..." className="flex-1" />
                <Button type="button" variant="outline" size="icon"
                  title="Générer une photo avec l'IA"
                  onClick={() => setShowAiImageDialog(true)}>
                  <Sparkles className="h-4 w-4" />
                </Button>
              </div>
              {formData.image_url && !formData.image_url.includes('supabase') && (
                <p className="text-xs text-amber-600 mt-1">
                  ⚠ URL externe — sera synchronisée vers Supabase à la sauvegarde
                </p>
              )}
              {formData.image_url && (
                <img src={formData.image_url} alt="Aperçu" className="mt-2 h-24 w-24 object-contain rounded border" loading="lazy" decoding="async" />
              )}
              <AIImageDialog
                open={showAiImageDialog}
                onOpenChange={setShowAiImageDialog}
                onImageGenerated={(url) => updateFormData({ image_url: url })}
                pageSlug={`products/${('id' in formData ? formData.id : 'new')}`}
              />
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
}
