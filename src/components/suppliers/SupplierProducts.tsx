import { useState, useEffect, useMemo, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Zap, Package } from 'lucide-react';
import { toast } from 'sonner';
import { resolveSupplierCode } from '@/types/supplier';
import { SupplierProductFilters } from './SupplierProductFilters';
import { SupplierOffersTable, type DisplayOffer } from './SupplierOffersTable';
import { SupplierCatalogueTable, type SupplierProductRow } from './SupplierCatalogueTable';
import { SupplierProductFormDialog } from './SupplierProductFormDialog';

interface Product {
  id: string;
  name: string;
  price: number;
  image_url: string | null;
}

interface SupplierProductsProps {
  supplierId: string;
  supplierName?: string;
}

function matchesCommonFilters(
  name: string, ref: string, sku: string, ean: string,
  category: string | null | undefined, brand: string | null | undefined,
  stockQty: number | null | undefined,
  filterLower: string, stockFilter: string, categoryFilter: string, brandFilter: string,
): boolean {
  if (filterLower) {
    const haystack = `${name} ${ref} ${sku} ${ean}`.toLowerCase();
    if (!haystack.includes(filterLower)) return false;
  }
  if (stockFilter === 'in_stock' && (stockQty ?? 0) <= 0) return false;
  if (stockFilter === 'out_of_stock' && (stockQty ?? 0) > 0) return false;
  if (categoryFilter !== 'all' && (category ?? '') !== categoryFilter) return false;
  if (brandFilter !== 'all' && (brand ?? '') !== brandFilter) return false;
  return true;
}

export const SupplierProducts = ({ supplierId, supplierName = '' }: SupplierProductsProps) => {
  const [supplierProducts, setSupplierProducts] = useState<SupplierProductRow[]>([]);
  const [supplierOffers, setSupplierOffers] = useState<DisplayOffer[]>([]);
  const [offersFetchError, setOffersFetchError] = useState<string | null>(null);
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState<SupplierProductRow | null>(null);

  const supplierEnum = resolveSupplierCode(supplierName);

  const [searchFilter, setSearchFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'inactive'>('all');
  const [stockFilter, setStockFilter] = useState<'all' | 'in_stock' | 'out_of_stock'>('all');
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [brandFilter, setBrandFilter] = useState('all');

  const fetchData = useCallback(async () => {
    try {
      setLoading(true);

      const [spResult, pResult] = await Promise.all([
        supabase
          .from('supplier_products')
          .select('*, products(id, name, image_url, sku_interne, category, brand, ean)')
          .eq('supplier_id', supplierId),
        supabase
          .from('products')
          .select('id, name, price, image_url')
          .order('name'),
      ]);

      if (spResult.error) throw spResult.error;
      if (pResult.error) throw pResult.error;
      setSupplierProducts(spResult.data || []);
      setProducts(pResult.data || []);

      setOffersFetchError(null);
      if (supplierEnum) {
        const offersResult = await supabase
          .from('supplier_offers')
          .select('id, supplier, supplier_product_id, product_id, purchase_price_ht, pvp_ttc, stock_qty, is_active, last_seen_at, products(id, name, sku_interne, category, brand, ean, image_url)')
          .eq('supplier', supplierEnum)
          .order('last_seen_at', { ascending: false })
          .limit(500);
        if (!offersResult.error) {
          setSupplierOffers((offersResult.data as DisplayOffer[]) || []);
        } else {
          setSupplierOffers([]);
          setOffersFetchError(offersResult.error.message);
        }
      } else {
        setSupplierOffers([]);
      }
    } catch {
      toast.error('Erreur lors du chargement des données');
    } finally {
      setLoading(false);
    }
  }, [supplierId, supplierEnum]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const handleSubmit = async (data: {
    product_id: string;
    supplier_reference: string | null;
    supplier_price: number;
    stock_quantity: number;
    lead_time_days: number;
    is_preferred: boolean;
    notes: string | null;
  }) => {
    try {
      const payload = { supplier_id: supplierId, ...data };

      if (editingProduct) {
        const { error } = await supabase
          .from('supplier_products')
          .update(payload)
          .eq('id', editingProduct.id);
        if (error) throw error;
        toast.success('Produit fournisseur mis à jour');
      } else {
        const { error } = await supabase
          .from('supplier_products')
          .insert([payload]);
        if (error) throw error;
        toast.success('Produit fournisseur ajouté');
      }

      setIsDialogOpen(false);
      resetForm();
      fetchData();
    } catch (error) {
      toast.error((error instanceof Error ? error.message : String(error)) || "Erreur lors de l'enregistrement");
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Supprimer ce produit fournisseur ?')) return;
    try {
      const { error } = await supabase.from('supplier_products').delete().eq('id', id);
      if (error) throw error;
      toast.success('Produit fournisseur supprimé');
      fetchData();
    } catch {
      toast.error('Erreur lors de la suppression');
    }
  };

  const handleEdit = (sp: SupplierProductRow) => {
    setEditingProduct(sp);
    setIsDialogOpen(true);
  };

  const resetForm = () => {
    setEditingProduct(null);
  };

  // Fallback offers from supplier_products when no real offers exist
  const hasRealOffers = supplierOffers.length > 0;
  const fallbackOffers: DisplayOffer[] = supplierProducts.map((sp) => ({
    id: `fallback-${sp.id}`,
    supplier: supplierEnum || '',
    supplier_product_id: sp.supplier_reference,
    product_id: sp.product_id,
    purchase_price_ht: sp.supplier_price ?? null,
    pvp_ttc: null as number | null,
    stock_qty: sp.stock_quantity ?? 0,
    is_active: true,
    last_seen_at: (sp as SupplierProductRow & { updated_at?: string }).updated_at ?? null,
    products: sp.products ? {
      id: sp.products.id,
      name: sp.products.name,
      sku_interne: sp.products.sku_interne ?? null,
      category: sp.products.category ?? null,
      brand: sp.products.brand ?? null,
      ean: sp.products.ean ?? null,
      image_url: sp.products.image_url ?? null,
    } : null,
  }));
  const usingFallbackOffers = !!supplierEnum && !hasRealOffers && fallbackOffers.length > 0;
  const displayOffers = hasRealOffers ? supplierOffers : fallbackOffers;
  const activeOffers = displayOffers.filter((o) => o.is_active);
  const inactiveOffers = displayOffers.filter((o) => !o.is_active);

  // Extract unique categories and brands for filter dropdowns
  const allItems = [...displayOffers, ...supplierProducts.map(sp => ({
    products: sp.products ? { ...sp.products, sku_interne: sp.products.sku_interne ?? null } : null,
    stock_qty: sp.stock_quantity,
  }))];
  const categories = useMemo(() => {
    const set = new Set<string>();
    allItems.forEach(item => {
      const cat = item.products?.category;
      if (cat) set.add(cat);
    });
    return [...set].sort();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [displayOffers, supplierProducts]);
  const brands = useMemo(() => {
    const set = new Set<string>();
    allItems.forEach(item => {
      const b = item.products?.brand;
      if (b) set.add(b);
    });
    return [...set].sort();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [displayOffers, supplierProducts]);

  const hasActiveFilters = !!(searchFilter || statusFilter !== 'all' || stockFilter !== 'all' || categoryFilter !== 'all' || brandFilter !== 'all');
  const resetAllFilters = () => {
    setSearchFilter('');
    setStatusFilter('all');
    setStockFilter('all');
    setCategoryFilter('all');
    setBrandFilter('all');
  };

  const filterLower = searchFilter.toLowerCase().trim();

  const filteredOffers = displayOffers.filter((o) => {
    if (statusFilter === 'active' && !o.is_active) return false;
    if (statusFilter === 'inactive' && o.is_active) return false;
    return matchesCommonFilters(
      o.products?.name ?? '', o.supplier_product_id ?? '', o.products?.sku_interne ?? '',
      o.products?.ean ?? '', o.products?.category, o.products?.brand, o.stock_qty,
      filterLower, stockFilter, categoryFilter, brandFilter,
    );
  });

  const filteredCatalogue = supplierProducts.filter((sp) =>
    matchesCommonFilters(
      sp.products?.name ?? '', sp.supplier_reference ?? '', sp.products?.sku_interne ?? '',
      sp.products?.ean ?? '', sp.products?.category, sp.products?.brand, sp.stock_quantity,
      filterLower, stockFilter, categoryFilter, brandFilter,
    )
  );

  if (loading) {
    return <div className="text-muted-foreground p-4">Chargement...</div>;
  }

  return (
    <div className="space-y-4">
      <SupplierProductFilters
        searchFilter={searchFilter}
        onSearchChange={setSearchFilter}
        statusFilter={statusFilter}
        onStatusChange={setStatusFilter}
        stockFilter={stockFilter}
        onStockChange={setStockFilter}
        categoryFilter={categoryFilter}
        onCategoryChange={setCategoryFilter}
        brandFilter={brandFilter}
        onBrandChange={setBrandFilter}
        categories={categories}
        brands={brands}
        showStatusFilter={!!supplierEnum}
        hasActiveFilters={hasActiveFilters}
        onResetFilters={resetAllFilters}
        filteredCount={filteredOffers.length + filteredCatalogue.length}
        totalCount={displayOffers.length + supplierProducts.length}
      />

      <Tabs defaultValue={supplierEnum ? 'offers' : 'catalogue'}>
        <TabsList>
          {supplierEnum && (
            <TabsTrigger value="offers" className="flex items-center gap-2">
              <Zap className="h-4 w-4" />
              Offres importées
              <Badge variant="secondary" className="ml-1">{activeOffers.length}</Badge>
            </TabsTrigger>
          )}
          <TabsTrigger value="catalogue" className="flex items-center gap-2">
            <Package className="h-4 w-4" />
            Mapping catalogue
            <Badge variant="secondary" className="ml-1">{supplierProducts.length}</Badge>
          </TabsTrigger>
        </TabsList>

        {supplierEnum && (
          <TabsContent value="offers" className="space-y-4">
            <SupplierOffersTable
              supplierEnum={supplierEnum}
              offers={filteredOffers}
              activeCount={activeOffers.length}
              inactiveCount={inactiveOffers.length}
              usingFallback={usingFallbackOffers}
              fetchError={offersFetchError}
              hasSearchFilter={!!filterLower}
            />
          </TabsContent>
        )}

        <TabsContent value="catalogue" className="space-y-4">
          <div className="flex justify-between items-center">
            <p className="text-sm text-muted-foreground">
              Associations manuelles produit ↔ fournisseur avec tarifs et délais
            </p>
            <SupplierProductFormDialog
              products={products}
              editingProduct={editingProduct}
              isOpen={isDialogOpen}
              onOpenChange={setIsDialogOpen}
              onSubmit={handleSubmit}
              onReset={resetForm}
            />
          </div>

          <SupplierCatalogueTable
            items={filteredCatalogue}
            hasSearchFilter={!!filterLower}
            onEdit={handleEdit}
            onDelete={handleDelete}
          />
        </TabsContent>
      </Tabs>
    </div>
  );
};
