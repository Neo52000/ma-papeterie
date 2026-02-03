import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';

export interface ProductDraft {
  id?: string;
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
  image_url: string | null;
  category: string;
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

interface ProductFormStore {
  draftProduct: ProductDraft | null;
  isEditing: boolean;
  editingProductId: string | null;
  lastModified: number | null;

  // Actions
  setDraft: (data: Partial<ProductDraft>) => void;
  clearDraft: () => void;
  startEditing: (product: ProductDraft) => void;
  startCreating: (emptyProduct: ProductDraft) => void;
  hasDraft: () => boolean;
}

export const useProductFormStore = create<ProductFormStore>()(
  persist(
    (set, get) => ({
      draftProduct: null,
      isEditing: false,
      editingProductId: null,
      lastModified: null,

      setDraft: (data) => {
        const current = get().draftProduct;
        set({
          draftProduct: current ? { ...current, ...data } : data as ProductDraft,
          lastModified: Date.now(),
        });
      },

      clearDraft: () => {
        set({
          draftProduct: null,
          isEditing: false,
          editingProductId: null,
          lastModified: null,
        });
      },

      startEditing: (product) => {
        set({
          draftProduct: product,
          isEditing: true,
          editingProductId: product.id || null,
          lastModified: Date.now(),
        });
      },

      startCreating: (emptyProduct) => {
        set({
          draftProduct: emptyProduct,
          isEditing: false,
          editingProductId: null,
          lastModified: Date.now(),
        });
      },

      hasDraft: () => {
        const { draftProduct } = get();
        return draftProduct !== null && draftProduct.name !== '';
      },
    }),
    {
      name: 'product-form-draft',
      storage: createJSONStorage(() => localStorage),
    }
  )
);
