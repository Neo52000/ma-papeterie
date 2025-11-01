import { CartItem } from '@/stores/cartStore';
import { toast } from 'sonner';

const SHOPIFY_API_VERSION = '2025-07';
// These will be fetched from tools
let SHOPIFY_STORE_PERMANENT_DOMAIN = '';
let SHOPIFY_STOREFRONT_TOKEN = '';

// Initialize Shopify config
export async function initializeShopify() {
  // In production, these would be fetched from environment or API
  // For now, we'll set them as empty and they'll be populated when needed
  return { domain: SHOPIFY_STORE_PERMANENT_DOMAIN, token: SHOPIFY_STOREFRONT_TOKEN };
}

export function setShopifyConfig(domain: string, token: string) {
  SHOPIFY_STORE_PERMANENT_DOMAIN = domain;
  SHOPIFY_STOREFRONT_TOKEN = token;
}

export function getStorefrontUrl() {
  return `https://${SHOPIFY_STORE_PERMANENT_DOMAIN}/api/${SHOPIFY_API_VERSION}/graphql.json`;
}

// Storefront API helper function
export async function storefrontApiRequest(query: string, variables: any = {}) {
  const response = await fetch(getStorefrontUrl(), {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-Shopify-Storefront-Access-Token': SHOPIFY_STOREFRONT_TOKEN
    },
    body: JSON.stringify({
      query,
      variables,
    }),
  });

  if (response.status === 402) {
    toast.error("Shopify: Paiement requis", {
      description: "L'accès à l'API Shopify nécessite un plan actif. Visitez https://admin.shopify.com pour mettre à niveau."
    });
    return;
  }

  if (!response.ok) {
    throw new Error(`HTTP error! status: ${response.status}`);
  }

  const data = await response.json();
  
  if (data.errors) {
    throw new Error(`Erreur Shopify: ${data.errors.map((e: any) => e.message).join(', ')}`);
  }

  return data;
}

// GraphQL queries
const CART_CREATE_MUTATION = `
  mutation cartCreate($input: CartInput!) {
    cartCreate(input: $input) {
      cart {
        id
        checkoutUrl
        totalQuantity
        cost {
          totalAmount {
            amount
            currencyCode
          }
        }
        lines(first: 100) {
          edges {
            node {
              id
              quantity
              merchandise {
                ... on ProductVariant {
                  id
                  title
                  price {
                    amount
                    currencyCode
                  }
                  product {
                    title
                    handle
                  }
                }
              }
            }
          }
        }
      }
      userErrors {
        field
        message
      }
    }
  }
`;

const STOREFRONT_PRODUCTS_QUERY = `
  query GetProducts($first: Int!) {
    products(first: $first) {
      edges {
        node {
          id
          title
          description
          handle
          priceRange {
            minVariantPrice {
              amount
              currencyCode
            }
          }
          images(first: 5) {
            edges {
              node {
                url
                altText
              }
            }
          }
          variants(first: 10) {
            edges {
              node {
                id
                title
                price {
                  amount
                  currencyCode
                }
                availableForSale
                selectedOptions {
                  name
                  value
                }
              }
            }
          }
          options {
            name
            values
          }
        }
      }
    }
  }
`;

// Create checkout function
export async function createStorefrontCheckout(items: CartItem[]): Promise<string> {
  try {
    const lines = items.map(item => ({
      quantity: item.quantity,
      merchandiseId: item.variantId,
    }));

    const cartData = await storefrontApiRequest(CART_CREATE_MUTATION, {
      input: {
        lines,
      },
    });

    if (cartData.data.cartCreate.userErrors.length > 0) {
      throw new Error(`Création panier échouée: ${cartData.data.cartCreate.userErrors.map((e: any) => e.message).join(', ')}`);
    }

    const cart = cartData.data.cartCreate.cart;
    
    if (!cart.checkoutUrl) {
      throw new Error('Aucune URL de paiement retournée par Shopify');
    }

    const url = new URL(cart.checkoutUrl);
    url.searchParams.set('channel', 'online_store');
    return url.toString();
  } catch (error) {
    console.error('Erreur création checkout storefront:', error);
    throw error;
  }
}

// Fetch products
export async function fetchShopifyProducts(first: number = 250) {
  try {
    const data = await storefrontApiRequest(STOREFRONT_PRODUCTS_QUERY, { first });
    return data.data.products.edges;
  } catch (error) {
    console.error('Erreur chargement produits:', error);
    return [];
  }
}
