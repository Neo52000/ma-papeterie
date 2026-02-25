import { describe, it, expect, beforeEach } from "vitest";
import { useCartStore, CartItem, ShopifyProduct } from "./cartStore";

// Helper to create a mock product
function mockProduct(overrides: Partial<ShopifyProduct["node"]> = {}): ShopifyProduct {
  return {
    node: {
      id: "gid://shopify/Product/1",
      title: "Stylo Bic",
      description: "Un stylo classique",
      handle: "stylo-bic",
      priceRange: {
        minVariantPrice: { amount: "1.50", currencyCode: "EUR" },
      },
      images: { edges: [] },
      variants: {
        edges: [
          {
            node: {
              id: "gid://shopify/ProductVariant/1",
              title: "Default",
              price: { amount: "1.50", currencyCode: "EUR" },
              availableForSale: true,
              selectedOptions: [{ name: "Title", value: "Default" }],
            },
          },
        ],
      },
      options: [{ name: "Title", values: ["Default"] }],
      ...overrides,
    },
  };
}

function mockCartItem(overrides: Partial<CartItem> = {}): CartItem {
  return {
    product: mockProduct(),
    variantId: "gid://shopify/ProductVariant/1",
    variantTitle: "Default",
    price: { amount: "1.50", currencyCode: "EUR" },
    quantity: 1,
    selectedOptions: [{ name: "Title", value: "Default" }],
    ...overrides,
  };
}

describe("cartStore", () => {
  beforeEach(() => {
    // Reset store between tests
    useCartStore.setState({
      items: [],
      cartId: null,
      checkoutUrl: null,
      isLoading: false,
    });
  });

  describe("addItem", () => {
    it("adds a new item to empty cart", () => {
      const item = mockCartItem();
      useCartStore.getState().addItem(item);

      expect(useCartStore.getState().items).toHaveLength(1);
      expect(useCartStore.getState().items[0].variantId).toBe("gid://shopify/ProductVariant/1");
    });

    it("increments quantity when adding existing variant", () => {
      const item = mockCartItem({ quantity: 2 });
      useCartStore.getState().addItem(item);
      useCartStore.getState().addItem(mockCartItem({ quantity: 3 }));

      expect(useCartStore.getState().items).toHaveLength(1);
      expect(useCartStore.getState().items[0].quantity).toBe(5);
    });

    it("adds different variants as separate items", () => {
      useCartStore.getState().addItem(mockCartItem({ variantId: "variant-A" }));
      useCartStore.getState().addItem(mockCartItem({ variantId: "variant-B" }));

      expect(useCartStore.getState().items).toHaveLength(2);
    });
  });

  describe("updateQuantity", () => {
    it("updates the quantity of an existing item", () => {
      useCartStore.getState().addItem(mockCartItem());
      useCartStore.getState().updateQuantity("gid://shopify/ProductVariant/1", 5);

      expect(useCartStore.getState().items[0].quantity).toBe(5);
    });

    it("removes item when quantity is 0", () => {
      useCartStore.getState().addItem(mockCartItem());
      useCartStore.getState().updateQuantity("gid://shopify/ProductVariant/1", 0);

      expect(useCartStore.getState().items).toHaveLength(0);
    });

    it("removes item when quantity is negative", () => {
      useCartStore.getState().addItem(mockCartItem());
      useCartStore.getState().updateQuantity("gid://shopify/ProductVariant/1", -1);

      expect(useCartStore.getState().items).toHaveLength(0);
    });
  });

  describe("removeItem", () => {
    it("removes an item by variantId", () => {
      useCartStore.getState().addItem(mockCartItem({ variantId: "A" }));
      useCartStore.getState().addItem(mockCartItem({ variantId: "B" }));
      useCartStore.getState().removeItem("A");

      expect(useCartStore.getState().items).toHaveLength(1);
      expect(useCartStore.getState().items[0].variantId).toBe("B");
    });

    it("does nothing if variantId not found", () => {
      useCartStore.getState().addItem(mockCartItem());
      useCartStore.getState().removeItem("nonexistent");

      expect(useCartStore.getState().items).toHaveLength(1);
    });
  });

  describe("clearCart", () => {
    it("empties all items and resets checkout state", () => {
      useCartStore.getState().addItem(mockCartItem());
      useCartStore.getState().setCartId("cart-123");
      useCartStore.getState().setCheckoutUrl("https://checkout.example.com");
      useCartStore.getState().clearCart();

      const state = useCartStore.getState();
      expect(state.items).toHaveLength(0);
      expect(state.cartId).toBeNull();
      expect(state.checkoutUrl).toBeNull();
    });
  });

  describe("getTotalItems", () => {
    it("returns 0 for empty cart", () => {
      expect(useCartStore.getState().getTotalItems()).toBe(0);
    });

    it("sums quantities across items", () => {
      useCartStore.getState().addItem(mockCartItem({ variantId: "A", quantity: 3 }));
      useCartStore.getState().addItem(mockCartItem({ variantId: "B", quantity: 2 }));

      expect(useCartStore.getState().getTotalItems()).toBe(5);
    });
  });

  describe("getTotalPrice", () => {
    it("returns 0 for empty cart", () => {
      expect(useCartStore.getState().getTotalPrice()).toBe(0);
    });

    it("calculates total from price * quantity", () => {
      useCartStore.getState().addItem(
        mockCartItem({
          variantId: "A",
          price: { amount: "10.00", currencyCode: "EUR" },
          quantity: 2,
        })
      );
      useCartStore.getState().addItem(
        mockCartItem({
          variantId: "B",
          price: { amount: "5.50", currencyCode: "EUR" },
          quantity: 3,
        })
      );

      // 10*2 + 5.5*3 = 20 + 16.5 = 36.5
      expect(useCartStore.getState().getTotalPrice()).toBeCloseTo(36.5);
    });
  });

  describe("setters", () => {
    it("setCartId updates cartId", () => {
      useCartStore.getState().setCartId("abc");
      expect(useCartStore.getState().cartId).toBe("abc");
    });

    it("setCheckoutUrl updates checkoutUrl", () => {
      useCartStore.getState().setCheckoutUrl("https://shop.com/checkout");
      expect(useCartStore.getState().checkoutUrl).toBe("https://shop.com/checkout");
    });

    it("setLoading updates isLoading", () => {
      useCartStore.getState().setLoading(true);
      expect(useCartStore.getState().isLoading).toBe(true);
    });
  });
});
