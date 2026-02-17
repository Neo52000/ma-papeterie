import { useState, useEffect } from "react";
import { AdminLayout } from "@/components/admin/AdminLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Star, Trash2, Plus, ImageIcon } from "lucide-react";

interface ProductImage {
  id: string;
  product_id: string;
  source: string;
  url_originale: string;
  url_optimisee: string | null;
  alt_seo: string | null;
  is_principal: boolean;
  created_at: string;
}

interface ProductWithImages {
  id: string;
  name: string;
  ean: string | null;
  images: ProductImage[];
}

export default function AdminProductImages() {
  const [products, setProducts] = useState<ProductWithImages[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      setLoading(true);
      const { data: prods } = await supabase
        .from('products')
        .select('id, name, ean')
        .order('name');

      const { data: imgs } = await supabase
        .from('product_images')
        .select('*')
        .order('is_principal', { ascending: false });

      const mapped = (prods || []).map(p => ({
        ...p,
        images: (imgs || []).filter((i: any) => i.product_id === p.id),
      }));
      setProducts(mapped);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const setPrincipal = async (imageId: string, productId: string) => {
    await supabase.from('product_images').update({ is_principal: false }).eq('product_id', productId);
    await supabase.from('product_images').update({ is_principal: true }).eq('id', imageId);
    toast.success('Image principale mise à jour');
    fetchData();
  };

  const deleteImage = async (id: string) => {
    await supabase.from('product_images').delete().eq('id', id);
    toast.success('Image supprimée');
    fetchData();
  };

  const addImage = async (productId: string, url: string, altSeo: string) => {
    const isFirst = !products.find(p => p.id === productId)?.images.length;
    await supabase.from('product_images').insert({
      product_id: productId,
      url_originale: url,
      alt_seo: altSeo,
      source: 'manual',
      is_principal: isFirst,
    });
    toast.success('Image ajoutée');
    fetchData();
  };

  const updateAltSeo = async (imageId: string, altSeo: string) => {
    await supabase.from('product_images').update({ alt_seo: altSeo }).eq('id', imageId);
  };

  const filtered = products.filter(p =>
    !search || p.name.toLowerCase().includes(search.toLowerCase()) || (p.ean || '').includes(search)
  );

  if (loading) {
    return (
      <AdminLayout title="Images Produits" description="Gestion des images par produit">
        <div className="text-center">Chargement...</div>
      </AdminLayout>
    );
  }

  return (
    <AdminLayout title="Images Produits" description="Gestion des images SEO par produit">
      <div className="mb-6">
        <Input
          placeholder="Rechercher par nom ou EAN..."
          value={search}
          onChange={e => setSearch(e.target.value)}
          className="max-w-md"
        />
      </div>

      <div className="space-y-4">
        {filtered.map(product => (
          <Card key={product.id}>
            <CardHeader className="pb-2">
              <CardTitle className="text-base flex items-center gap-2">
                {product.name}
                {product.ean && <Badge variant="outline" className="text-xs">{product.ean}</Badge>}
                <Badge variant="secondary" className="text-xs">{product.images.length} image(s)</Badge>
              </CardTitle>
            </CardHeader>
            <CardContent>
              {product.images.length === 0 ? (
                <p className="text-sm text-muted-foreground mb-2">Aucune image</p>
              ) : (
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-3">
                  {product.images.map(img => (
                    <div key={img.id} className="relative border rounded-lg p-2 space-y-2">
                      <img
                        src={img.url_originale}
                        alt={img.alt_seo || product.name}
                        className="w-full h-24 object-contain rounded"
                      />
                      {img.is_principal && (
                        <Badge className="absolute top-1 left-1 text-xs">Principale</Badge>
                      )}
                      <Input
                        placeholder="Alt SEO"
                        defaultValue={img.alt_seo || ''}
                        onBlur={e => updateAltSeo(img.id, e.target.value)}
                        className="text-xs h-7"
                      />
                      <div className="flex gap-1">
                        {!img.is_principal && (
                          <Button size="sm" variant="ghost" onClick={() => setPrincipal(img.id, product.id)} className="h-6 text-xs">
                            <Star className="h-3 w-3 mr-1" />
                            Principale
                          </Button>
                        )}
                        <Button size="sm" variant="ghost" onClick={() => deleteImage(img.id)} className="h-6 text-xs text-destructive">
                          <Trash2 className="h-3 w-3" />
                        </Button>
                      </div>
                      <Badge variant="outline" className="text-xs">{img.source}</Badge>
                    </div>
                  ))}
                </div>
              )}
              <AddImageForm productId={product.id} onAdd={addImage} />
            </CardContent>
          </Card>
        ))}
      </div>
    </AdminLayout>
  );
}

function AddImageForm({ productId, onAdd }: { productId: string; onAdd: (pid: string, url: string, alt: string) => void }) {
  const [url, setUrl] = useState('');
  const [alt, setAlt] = useState('');
  const [open, setOpen] = useState(false);

  if (!open) {
    return (
      <Button variant="outline" size="sm" onClick={() => setOpen(true)}>
        <Plus className="h-3 w-3 mr-1" />
        Ajouter une image
      </Button>
    );
  }

  return (
    <div className="flex gap-2 items-end">
      <div className="flex-1">
        <Input placeholder="URL de l'image" value={url} onChange={e => setUrl(e.target.value)} className="text-sm" />
      </div>
      <div className="flex-1">
        <Input placeholder="Alt SEO" value={alt} onChange={e => setAlt(e.target.value)} className="text-sm" />
      </div>
      <Button size="sm" onClick={() => { if (url) { onAdd(productId, url, alt); setUrl(''); setAlt(''); setOpen(false); } }}>
        Ajouter
      </Button>
      <Button size="sm" variant="ghost" onClick={() => setOpen(false)}>Annuler</Button>
    </div>
  );
}
