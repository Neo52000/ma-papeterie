import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';

export type ServiceType = 'photo' | 'reprography';

export interface ServiceCartItem {
  id: string;
  fileId: string;
  filePath: string;
  fileName: string;
  fileSize: number;
  fileType: string;
  preview: string | null;
  // Reprography-specific
  format?: string;
  color?: string;
  rectoVerso?: boolean;
  paperWeight?: number;
  finishing?: string;
  copies?: number;
  // Photo-specific
  photoFormat?: string;
  paperType?: string;
  whiteMargin?: boolean;
  quantity?: number;
  // Pricing
  unitPrice: number;
  lineTotal: number;
  // Meta
  resolutionWarning?: boolean;
  dimensions?: { width: number; height: number };
}

export interface DeliveryInfo {
  mode: 'pickup' | 'delivery';
  address?: {
    street: string;
    city: string;
    postal_code: string;
    country: string;
  };
}

export interface CustomerInfo {
  email: string;
  name: string;
  phone: string;
  emailNotifications: boolean;
}

interface ServiceCartState {
  serviceType: ServiceType;
  items: ServiceCartItem[];
  delivery: DeliveryInfo;
  customer: CustomerInfo;
  notes: string;

  setServiceType: (type: ServiceType) => void;
  addItem: (item: ServiceCartItem) => void;
  updateItem: (id: string, updates: Partial<ServiceCartItem>) => void;
  removeItem: (id: string) => void;
  setItems: (items: ServiceCartItem[]) => void;
  setDelivery: (delivery: DeliveryInfo) => void;
  setCustomer: (customer: CustomerInfo) => void;
  setNotes: (notes: string) => void;
  clearCart: () => void;

  totalHT: () => number;
  deliveryFee: () => number;
  totalTTC: () => number;
}

const DELIVERY_FEE = 5.90;
const TVA_RATE = 0.20;

const defaultCustomer: CustomerInfo = {
  email: '',
  name: '',
  phone: '',
  emailNotifications: true,
};

const defaultDelivery: DeliveryInfo = { mode: 'pickup' };

export const useServiceCartStore = create<ServiceCartState>()(
  persist(
    (set, get) => ({
      serviceType: 'photo' as ServiceType,
      items: [] as ServiceCartItem[],
      delivery: defaultDelivery,
      customer: defaultCustomer,
      notes: '',

      setServiceType: (type) => set({ serviceType: type }),

      addItem: (item) => set(state => ({
        items: [...state.items, item],
      })),

      updateItem: (id, updates) => set(state => ({
        items: state.items.map(i => i.id === id ? { ...i, ...updates } : i),
      })),

      removeItem: (id) => set(state => ({
        items: state.items.filter(i => i.id !== id),
      })),

      setItems: (items) => set({ items }),

      setDelivery: (delivery) => set({ delivery }),
      setCustomer: (customer) => set({ customer }),
      setNotes: (notes) => set({ notes }),

      clearCart: () => set({
        items: [],
        delivery: defaultDelivery,
        customer: defaultCustomer,
        notes: '',
      }),

      totalHT: () => {
        return Math.round(get().items.reduce((sum, i) => sum + i.lineTotal, 0) * 100) / 100;
      },

      deliveryFee: () => {
        return get().delivery.mode === 'delivery' ? DELIVERY_FEE : 0;
      },

      totalTTC: () => {
        const ht = get().totalHT();
        const fee = get().deliveryFee();
        return Math.round((ht * (1 + TVA_RATE) + fee) * 100) / 100;
      },
    }),
    {
      name: 'service-cart',
      storage: createJSONStorage(() => sessionStorage),
      partialize: (state) => ({
        serviceType: state.serviceType,
        items: state.items,
        delivery: state.delivery,
        customer: state.customer,
        notes: state.notes,
      }),
    }
  )
);
