/**
 * Alkor B2B products API handler for Netlify Functions.
 *
 * To deploy: copy this file to netlify/functions/products.mts
 *
 * Endpoints:
 *   GET /.netlify/functions/products                     → paginated list
 *   GET /.netlify/functions/products?sku=304876          → single product
 *   GET /.netlify/functions/products?q=papier            → search
 *   GET /.netlify/functions/products?cat=Hygiène         → by category
 *   GET /.netlify/functions/products?stats=true          → catalog stats
 */

import {
  getAllProducts,
  getProductBySKU,
  searchProducts,
  getProductsByCategory,
  getProductStats,
  type AlkorProduct,
} from "./products";

interface APIResponse {
  statusCode: number;
  headers: Record<string, string>;
  body: string;
}

const CORS_HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type",
  "Content-Type": "application/json",
};

function jsonResponse(data: unknown, statusCode = 200): APIResponse {
  return {
    statusCode,
    headers: CORS_HEADERS,
    body: JSON.stringify(data),
  };
}

function paginate(
  products: AlkorProduct[],
  page: number,
  perPage: number
) {
  const totalPages = Math.ceil(products.length / perPage);
  const start = (page - 1) * perPage;
  const items = products.slice(start, start + perPage);

  return {
    data: items,
    pagination: {
      page,
      per_page: perPage,
      total: products.length,
      total_pages: totalPages,
      has_next: page < totalPages,
      has_prev: page > 1,
    },
  };
}

export function handler(event: { queryStringParameters: Record<string, string> | null }): APIResponse {
  const params = event.queryStringParameters || {};

  // OPTIONS (CORS preflight)
  if (!params) {
    return jsonResponse({});
  }

  // Stats
  if (params.stats === "true") {
    return jsonResponse(getProductStats());
  }

  // Single product by SKU
  if (params.sku) {
    const product = getProductBySKU(params.sku);
    if (!product) {
      return jsonResponse({ error: "Product not found" }, 404);
    }
    return jsonResponse(product);
  }

  // Search
  if (params.q) {
    const results = searchProducts(params.q);
    const page = Math.max(1, parseInt(params.page || "1", 10));
    const perPage = Math.min(100, Math.max(1, parseInt(params.per_page || "24", 10)));
    return jsonResponse(paginate(results, page, perPage));
  }

  // Category filter
  if (params.cat) {
    const results = getProductsByCategory(params.cat);
    const page = Math.max(1, parseInt(params.page || "1", 10));
    const perPage = Math.min(100, Math.max(1, parseInt(params.per_page || "24", 10)));
    return jsonResponse(paginate(results, page, perPage));
  }

  // Default: all products paginated
  const page = Math.max(1, parseInt(params.page || "1", 10));
  const perPage = Math.min(100, Math.max(1, parseInt(params.per_page || "24", 10)));
  return jsonResponse(paginate(getAllProducts(), page, perPage));
}
