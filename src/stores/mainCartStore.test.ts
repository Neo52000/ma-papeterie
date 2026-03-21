import { describe, it, expect, beforeEach, vi } from 'vitest';
import { useMainCartStore } from './mainCartStore';

// Mock sonner toast
vi.mock('sonner', () => ({
  toast: {
    success: vi.fn(),
    error: vi.fn(),
  },
}));

// Mock analytics
vi.mock('@/hooks/useAnalytics', () => ({
  track: vi.fn(),
}));

const sampleItem = {
  id: 'prod-1',
  name: 'Stylo bleu',
  price: '2.50',
  image: '/img/stylo.jpg',
  category: 'Ecriture',
  stock_quantity: 10,
};

describe('mainCartStore', () => {
  beforeEach(() => {
    useMainCartStore.setState({ items: [], total: 0, itemCount: 0 });
  });

  it('starts with empty cart', () => {
    const state = useMainCartStore.getState();
    expect(state.items).toEqual([]);
    expect(state.total).toBe(0);
    expect(state.itemCount).toBe(0);
  });

  it('adds an item to cart', () => {
    useMainCartStore.getState().addToCart(sampleItem);
    const state = useMainCartStore.getState();
    expect(state.items).toHaveLength(1);
    expect(state.items[0].quantity).toBe(1);
    expect(state.total).toBe(2.5);
    expect(state.itemCount).toBe(1);
  });

  it('increments quantity when adding same item', () => {
    useMainCartStore.getState().addToCart(sampleItem);
    useMainCartStore.getState().addToCart(sampleItem);
    const state = useMainCartStore.getState();
    expect(state.items).toHaveLength(1);
    expect(state.items[0].quantity).toBe(2);
    expect(state.total).toBe(5.0);
    expect(state.itemCount).toBe(2);
  });

  it('refuses to add out-of-stock item', () => {
    useMainCartStore.getState().addToCart({ ...sampleItem, stock_quantity: 0 });
    expect(useMainCartStore.getState().items).toHaveLength(0);
  });

  it('refuses to exceed stock quantity', () => {
    const limited = { ...sampleItem, stock_quantity: 1 };
    useMainCartStore.getState().addToCart(limited);
    useMainCartStore.getState().addToCart(limited);
    expect(useMainCartStore.getState().items[0].quantity).toBe(1);
  });

  it('removes an item from cart', () => {
    useMainCartStore.getState().addToCart(sampleItem);
    useMainCartStore.getState().removeFromCart('prod-1');
    expect(useMainCartStore.getState().items).toHaveLength(0);
    expect(useMainCartStore.getState().total).toBe(0);
  });

  it('updates quantity', () => {
    useMainCartStore.getState().addToCart(sampleItem);
    useMainCartStore.getState().updateQuantity('prod-1', 5);
    expect(useMainCartStore.getState().items[0].quantity).toBe(5);
    expect(useMainCartStore.getState().total).toBe(12.5);
  });

  it('removes item when updating quantity to 0', () => {
    useMainCartStore.getState().addToCart(sampleItem);
    useMainCartStore.getState().updateQuantity('prod-1', 0);
    expect(useMainCartStore.getState().items).toHaveLength(0);
  });

  it('refuses to update quantity beyond stock', () => {
    useMainCartStore.getState().addToCart(sampleItem);
    useMainCartStore.getState().updateQuantity('prod-1', 999);
    expect(useMainCartStore.getState().items[0].quantity).toBe(1);
  });

  it('clears all items', () => {
    useMainCartStore.getState().addToCart(sampleItem);
    useMainCartStore.getState().addToCart({ ...sampleItem, id: 'prod-2', name: 'Cahier' });
    useMainCartStore.getState().clearCart();
    expect(useMainCartStore.getState().items).toHaveLength(0);
    expect(useMainCartStore.getState().total).toBe(0);
    expect(useMainCartStore.getState().itemCount).toBe(0);
  });
});
