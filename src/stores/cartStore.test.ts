import { describe, it, expect, beforeEach } from "vitest";
import { useShopifyCart, ShopifyCartItem, ShopifyProduct } from "./shopifyCartStore";

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

function mockCartItem(overrides: Partial<ShopifyCartItem> = {}): ShopifyCartItem {
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

describe("shopifyCartStore", () => {
    beforeEach(() => {
          // Reset store between tests
                   useShopifyCart.setState({
                           items: [],
                           cartId: null,
                           checkoutUrl: null,
                           isLoading: false,
                   });
    });

           describe("addItem", () => {
                 it("adds a new item to empty cart", () => {
                         const item = mockCartItem();
                         useShopifyCart.getState().addItem(item);

                          expect(useShopifyCart.getState().items).toHaveLength(1);
                         expect(useShopifyCart.getState().items[0].variantId).toBe("gid://shopify/ProductVariant/1");
                 });

                        it("increments quantity when adding existing variant", () => {
                                const item = mockCartItem({ quantity: 2 });
                                useShopifyCart.getState().addItem(item);
                                useShopifyCart.getState().addItem(mockCartItem({ quantity: 3 }));

                                 expect(useShopifyCart.getState().items).toHaveLength(1);
                                expect(useShopifyCart.getState().items[0].quantity).toBe(5);
                        });

                        it("adds different variants as separate items", () => {
                                useShopifyCart.getState().addItem(mockCartItem({ variantId: "variant-A" }));
                                useShopifyCart.getState().addItem(mockCartItem({ variantId: "variant-B" }));

                                 expect(useShopifyCart.getState().items).toHaveLength(2);
                        });
           });

           describe("updateQuantity", () => {
                 it("updates the quantity of an existing item", () => {
                         useShopifyCart.getState().addItem(mockCartItem());
                         useShopifyCart.getState().updateQuantity("gid://shopify/ProductVariant/1", 5);

                          expect(useShopifyCart.getState().items[0].quantity).toBe(5);
                 });

                        it("removes item when quantity is 0", () => {
                                useShopifyCart.getState().addItem(mockCartItem());
                                useShopifyCart.getState().updateQuantity("gid://shopify/ProductVariant/1", 0);

                                 expect(useShopifyCart.getState().items).toHaveLength(0);
                        });

                        it("removes item when quantity is negative", () => {
                                useShopifyCart.getState().addItem(mockCartItem());
                                useShopifyCart.getState().updateQuantity("gid://shopify/ProductVariant/1", -1);

                                 expect(useShopifyCart.getState().items).toHaveLength(0);
                        });
           });

           describe("removeItem", () => {
                 it("removes an item by variantId", () => {
                         useShopifyCart.getState().addItem(mockCartItem({ variantId: "A" }));
                         useShopifyCart.getState().addItem(mockCartItem({ variantId: "B" }));
                         useShopifyCart.getState().removeItem("A");

                          expect(useShopifyCart.getState().items).toHaveLength(1);
                         expect(useShopifyCart.getState().items[0].variantId).toBe("B");
                 });

                        it("does nothing if variantId not found", () => {
                                useShopifyCart.getState().addItem(mockCartItem());
                                useShopifyCart.getState().removeItem("nonexistent");

                                 expect(useShopifyCart.getState().items).toHaveLength(1);
                        });
           });

           describe("clearCart", () => {
                 it("empties all items and resets checkout state", () => {
                         useShopifyCart.getState().addItem(mockCartItem());
                         useShopifyCart.getState().setCartId("cart-123");
                         useShopifyCart.getState().setCheckoutUrl("https://checkout.example.com");
                         useShopifyCart.getState().clearCart();

                          const state = useShopifyCart.getState();
                         expect(state.items).toHaveLength(0);
                         expect(state.cartId).toBeNull();
                         expect(state.checkoutUrl).toBeNull();
                 });
           });

           describe("getTotalItems", () => {
                 it("returns 0 for empty cart", () => {
                         expect(useShopifyCart.getState().getTotalItems()).toBe(0);
                 });

                        it("sums quantities across items", () => {
                                useShopifyCart.getState().addItem(mockCartItem({ variantId: "A", quantity: 3 }));
                                useShopifyCart.getState().addItem(mockCartItem({ variantId: "B", quantity: 2 }));

                                 expect(useShopifyCart.getState().getTotalItems()).toBe(5);
                        });
           });

           describe("getTotalPrice", () => {
                 it("returns 0 for empty cart", () => {
                         expect(useShopifyCart.getState().getTotalPrice()).toBe(0);
                 });

                        it("calculates total from price * quantity", () => {
                                useShopifyCart.getState().addItem(
                                          mockCartItem({
                                                      variantId: "A",
                                                      price: { amount: "10.00", currencyCode: "EUR" },
                                                      quantity: 2,
                                          })
                                        );
                                useShopifyCart.getState().addItem(
                                          mockCartItem({
                                                      variantId: "B",
                                                      price: { amount: "5.50", currencyCode: "EUR" },
                                                      quantity: 3,
                                          })
                                        );

                                 // 10*2 + 5.5*3 = 20 + 16.5 = 36.5
                                 expect(useShopifyCart.getState().getTotalPrice()).toBeCloseTo(36.5);
                        });
           });

           describe("setters", () => {
                 it("setCartId updates cartId", () => {
                         useShopifyCart.getState().setCartId("abc");
                         expect(useShopifyCart.getState().cartId).toBe("abc");
                 });

                        it("setCheckoutUrl updates checkoutUrl", () => {
                                useShopifyCart.getState().setCheckoutUrl("https://shop.com/checkout");
                                expect(useShopifyCart.getState().checkoutUrl).toBe("https://shop.com/checkout");
                        });

                        it("setLoading updates isLoading", () => {
                                useShopifyCart.getState().setLoading(true);
                                expect(useShopifyCart.getState().isLoading).toBe(true);
                        });
           });
});
