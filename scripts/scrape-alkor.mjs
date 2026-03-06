#!/usr/bin/env node
/**
 * scrape-alkor.mjs — Alkor B2B catalog scraper
 *
 * Zero dependencies — uses native Node.js fetch (Node 18+).
 * Scrapes b2b.alkorshop.com, outputs JSON + optional images.
 *
 * Environment variables:
 *   ALKOR_CLIENT_CODE   — Code client (e.g. 991002005031)
 *   ALKOR_USERNAME      — Identifiant utilisateur (e.g. REINE&FILS)
 *   ALKOR_PASSWORD      — Mot de passe
 *   DOWNLOAD_IMAGES     — "true" to download product images locally (default: false)
 *   UPLOAD_IMAGES_SUPABASE — "true" to upload images to Supabase Storage (default: false)
 *   PUSH_TO_SUPABASE    — "true" to push data to Supabase (default: false)
 *   SUPABASE_URL        — Supabase project URL (required if PUSH_TO_SUPABASE or UPLOAD_IMAGES_SUPABASE)
 *   SUPABASE_SERVICE_ROLE_KEY — Supabase service role key (required if PUSH_TO_SUPABASE or UPLOAD_IMAGES_SUPABASE)
 *   CRAWL_JOB_ID        — optional crawl_jobs.id to update progress
 */

import { writeFileSync, mkdirSync, existsSync, readFileSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { createHash } from "node:crypto";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, "..");
const DATA_DIR = join(ROOT, "data");
const IMAGES_DIR = join(ROOT, "public", "images", "products");

const DEFAULT_BASE_URL = "https://b2b.alkorshop.com";
const BASE_URL = (process.env.ALKOR_BASE_URL || DEFAULT_BASE_URL).replace(/\/+$/, "");

// ── Config ──────────────────────────────────────────────────────────────────
const CLIENT_CODE = process.env.ALKOR_CLIENT_CODE;
const USERNAME = process.env.ALKOR_USERNAME;
const PASSWORD = process.env.ALKOR_PASSWORD;
const DOWNLOAD_IMAGES = process.env.DOWNLOAD_IMAGES === "true";
const UPLOAD_IMAGES_SUPABASE = process.env.UPLOAD_IMAGES_SUPABASE === "true";
const PUSH_TO_SUPABASE = process.env.PUSH_TO_SUPABASE === "true";
const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
const CRAWL_JOB_ID = process.env.CRAWL_JOB_ID || null;

// Delay between requests to avoid hammering the server
const REQUEST_DELAY_MS = 500;
const MAX_RETRIES = 3;

// ── Helpers ─────────────────────────────────────────────────────────────────

function log(msg) {
  console.log(`[${new Date().toISOString()}] ${msg}`);
}

function slugify(text) {
  return text
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .substring(0, 120);
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Extract cookies from Set-Cookie headers.
 * Returns a cookie string suitable for the Cookie header.
 */
function extractCookies(response, existingCookies = "") {
  const setCookieHeaders = response.headers.getSetCookie?.() || [];
  const cookieMap = new Map();

  // Parse existing cookies
  if (existingCookies) {
    for (const part of existingCookies.split(";")) {
      const [key, ...val] = part.trim().split("=");
      if (key) cookieMap.set(key.trim(), val.join("="));
    }
  }

  // Parse new Set-Cookie headers
  for (const header of setCookieHeaders) {
    const [cookiePart] = header.split(";");
    const [key, ...val] = cookiePart.split("=");
    if (key) cookieMap.set(key.trim(), val.join("="));
  }

  return Array.from(cookieMap.entries())
    .map(([k, v]) => `${k}=${v}`)
    .join("; ");
}

/**
 * Fetch with retry logic and timeout.
 */
async function fetchWithRetry(url, options = {}, retries = MAX_RETRIES) {
  for (let attempt = 1; attempt <= retries; attempt++) {
    try {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 30000);
      const response = await fetch(url, {
        ...options,
        signal: controller.signal,
        redirect: "manual",
      });
      clearTimeout(timeout);
      return response;
    } catch (err) {
      if (attempt === retries) throw err;
      log(`  Retry ${attempt}/${retries} for ${url}: ${err.message}`);
      await sleep(1000 * attempt);
    }
  }
}

/**
 * Follow redirects manually to track cookies.
 */
async function fetchFollowRedirects(url, options = {}, cookies = "") {
  let currentUrl = url;
  let currentCookies = cookies;

  for (let i = 0; i < 10; i++) {
    const response = await fetchWithRetry(currentUrl, {
      ...options,
      headers: {
        ...options.headers,
        Cookie: currentCookies,
      },
    });

    currentCookies = extractCookies(response, currentCookies);

    if ([301, 302, 303, 307, 308].includes(response.status)) {
      const location = response.headers.get("location");
      if (!location) break;
      currentUrl = location.startsWith("http")
        ? location
        : new URL(location, currentUrl).href;
      continue;
    }

    return { response, cookies: currentCookies, url: currentUrl };
  }

  throw new Error(`Too many redirects for ${url}`);
}

// ── HTML parsing helpers (regex-based, no deps) ────────────────────────────

/**
 * Extract text content from an HTML element by regex.
 */
function extractText(html, pattern) {
  const match = html.match(pattern);
  if (!match) return "";
  return match[1]
    .replace(/<[^>]+>/g, "")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&nbsp;/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

/**
 * Extract all matches of a pattern.
 */
function extractAll(html, pattern) {
  const matches = [];
  let match;
  const regex = new RegExp(pattern, "gi");
  while ((match = regex.exec(html)) !== null) {
    matches.push(match[1].trim());
  }
  return matches;
}

// ── Login ───────────────────────────────────────────────────────────────────

/**
 * Discover the login page URL by checking known paths and the home page.
 */
async function discoverLoginUrl(baseCookies = "") {
  const candidatePaths = ["/login", "/connexion", "/auth", "/identification", "/account/login", "/customer/login", "/asb-direct/ViewUserAccount-ShowLogin"];

  // Try known paths first
  for (const path of candidatePaths) {
    const url = `${BASE_URL}${path}`;
    try {
      const { response, cookies } = await fetchFollowRedirects(url, {
        headers: {
          "User-Agent":
            "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
        },
      }, baseCookies);
      const html = await response.text();
      // Check if the page contains a login form (POST form with password field)
      if (
        response.status < 400 &&
        /<form[^>]*method=["']?post/i.test(html) &&
        /<input[^>]*type=["']?password/i.test(html)
      ) {
        log(`  Discovered login page at ${url} (status ${response.status})`);
        return { loginUrl: url, html, cookies };
      }
    } catch {
      // skip unreachable paths
    }
  }

  // Fallback: fetch the home page and look for login links
  log("  No login page found at known paths, checking home page...");
  try {
    const { response: homePage, cookies: homeCookies } = await fetchFollowRedirects(BASE_URL, {
      headers: {
        "User-Agent":
          "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
      },
    });
    const homeHtml = await homePage.text();

    // If home page itself is a login form (common for B2B sites)
    if (
      homePage.status < 400 &&
      /<form[^>]*method=["']?post/i.test(homeHtml) &&
      /<input[^>]*type=["']?password/i.test(homeHtml)
    ) {
      log(`  Home page is the login page (status ${homePage.status})`);
      return { loginUrl: BASE_URL, html: homeHtml, cookies: homeCookies };
    }

    // Look for login-related links
    const loginLinkPatterns = [
      /href=["']([^"']*(?:login|connexion|auth|identification|sign.?in)[^"']*)["']/gi,
      /href=["']([^"']*(?:compte|account)[^"']*)["']/gi,
    ];
    for (const pattern of loginLinkPatterns) {
      let match;
      while ((match = pattern.exec(homeHtml)) !== null) {
        const linkUrl = match[1].startsWith("http")
          ? match[1]
          : new URL(match[1], BASE_URL).href;
        if (!linkUrl.startsWith(BASE_URL)) continue;
        try {
          const { response: linkPage, cookies: linkCookies } = await fetchFollowRedirects(linkUrl, {
            headers: {
              "User-Agent":
                "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
            },
          }, homeCookies);
          const linkHtml = await linkPage.text();
          if (
            linkPage.status < 400 &&
            /<form[^>]*method=["']?post/i.test(linkHtml) &&
            /<input[^>]*type=["']?password/i.test(linkHtml)
          ) {
            log(`  Discovered login page via link at ${linkUrl}`);
            return { loginUrl: linkUrl, html: linkHtml, cookies: linkCookies };
          }
        } catch {
          // skip broken links
        }
      }
    }

    // If we got here but the home page loaded, include diagnostic info
    if (homePage.status < 400) {
      throw new Error(
        `No login form found on ${BASE_URL} (home page returned ${homePage.status} but no password field detected). ` +
        `The site may have changed its URL structure. Update ALKOR_BASE_URL if the B2B site has moved.`
      );
    }
    throw new Error(
      `Base URL ${BASE_URL} returned HTTP ${homePage.status}. The site may be down or the URL may have changed. Update ALKOR_BASE_URL.`
    );
  } catch (err) {
    if (err.message.includes("ALKOR_BASE_URL")) throw err;
    throw new Error(
      `Cannot reach ${BASE_URL}: ${err.message}. The site may be down or the URL may have changed. Update ALKOR_BASE_URL.`
    );
  }
}

async function login() {
  log("Logging in to Alkor B2B...");
  log(`  Base URL: ${BASE_URL}`);

  if (!CLIENT_CODE || !USERNAME || !PASSWORD) {
    throw new Error(
      "Missing credentials. Set ALKOR_CLIENT_CODE, ALKOR_USERNAME, and ALKOR_PASSWORD."
    );
  }

  // Step 1: Discover the login page (auto-detects URL)
  const { loginUrl, html: loginHtml, cookies: initialCookies } = await discoverLoginUrl();
  log(`  Login page: ${loginUrl}`);

  // Try to find a CSRF token
  const csrfMatch =
    loginHtml.match(/name="_token"\s+value="([^"]+)"/) ||
    loginHtml.match(/name="csrf[_-]?token"\s+value="([^"]+)"/) ||
    loginHtml.match(/name="_csrf"\s+value="([^"]+)"/);
  const csrfToken = csrfMatch ? csrfMatch[1] : "";

  // Detect form action URL
  const formActionMatch = loginHtml.match(
    /<form[^>]*id="(?:login|auth|identification)[^"]*"[^>]*action="([^"]+)"/i
  ) || loginHtml.match(
    /<form[^>]*action="([^"]+)"[^>]*method="post"/i
  );
  const formAction = formActionMatch
    ? formActionMatch[1].startsWith("http")
      ? formActionMatch[1]
      : new URL(formActionMatch[1], BASE_URL).href
    : loginUrl;

  // Detect field names from the login form
  const inputNames = [...loginHtml.matchAll(/<input[^>]*name="([^"]+)"[^>]*>/gi)]
    .map((m) => m[1])
    .filter((n) => !n.startsWith("_"));
  log(`  Form fields detected: ${inputNames.join(", ")}`);

  // Build login payload — adapt to detected fields
  const formData = new URLSearchParams();
  if (csrfToken) formData.set("_token", csrfToken);

  // Map our 3 credentials to the detected form fields
  const clientCodeField =
    inputNames.find((n) => /code|client|customer/i.test(n)) || "code_client";
  const usernameField =
    inputNames.find((n) => /user|login|identif/i.test(n)) || "username";
  const passwordField =
    inputNames.find((n) => /pass|mdp|pwd/i.test(n)) || "password";

  formData.set(clientCodeField, CLIENT_CODE);
  formData.set(usernameField, USERNAME);
  formData.set(passwordField, PASSWORD);

  log(`  Posting login to ${formAction}`);
  log(`  Fields: ${clientCodeField}, ${usernameField}, ${passwordField}`);

  // Step 2: POST the login form
  const { response: loginResponse, cookies: sessionCookies } =
    await fetchFollowRedirects(
      formAction,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/x-www-form-urlencoded",
          Referer: loginUrl,
          "User-Agent":
            "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
        },
        body: formData.toString(),
      },
      initialCookies
    );

  const responseHtml = await loginResponse.text();

  // Check for explicit login failure indicators
  const hasErrorIndicator =
    responseHtml.includes("mot de passe incorrect") ||
    responseHtml.includes("identifiants invalides") ||
    responseHtml.includes("incorrect password") ||
    responseHtml.includes("invalid credentials");

  // Check for positive login indicators
  const hasSuccessIndicator =
    responseHtml.includes("déconnexion") ||
    responseHtml.includes("Déconnexion") ||
    responseHtml.includes("Mon compte") ||
    responseHtml.includes("panier");

  // Still on a login page? (password field present = not logged in)
  const stillOnLoginPage =
    /<input[^>]*type=["']?password/i.test(responseHtml) &&
    responseHtml.includes("Identification");

  const isLoggedIn = !hasErrorIndicator && !stillOnLoginPage && hasSuccessIndicator;

  if (!isLoggedIn) {
    if (loginResponse.status === 404) {
      throw new Error(
        `Login endpoint not found (HTTP 404 on ${formAction}). The site URL may have changed. Update ALKOR_BASE_URL.`
      );
    }
    if (loginResponse.status === 403) {
      throw new Error(
        `Access denied (HTTP 403 on ${formAction}). The site may be blocking automated access.`
      );
    }
    if (hasErrorIndicator) {
      throw new Error(
        `Login failed: invalid credentials (HTTP ${loginResponse.status} on ${formAction}). Check ALKOR_CLIENT_CODE, ALKOR_USERNAME, ALKOR_PASSWORD.`
      );
    }
    throw new Error(
      `Login failed (HTTP ${loginResponse.status} on ${formAction}). No success indicators found in response. The site may have changed its login flow.`
    );
  }

  log(`  Login successful. Session cookies captured.`);
  return sessionCookies;
}

// ── Catalog scraping ────────────────────────────────────────────────────────

/**
 * Discover catalog/category page URLs.
 */
async function discoverCatalogPages(cookies) {
  log("Discovering catalog pages...");

  const { response } = await fetchFollowRedirects(
    `${BASE_URL}/catalogue`,
    {
      headers: {
        "User-Agent":
          "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
        Referer: BASE_URL,
      },
    },
    cookies
  );

  const html = await response.text();

  // Find all category/catalog links
  const categoryLinks = new Set();
  const linkPattern = /href="([^"]*\/catalogue[^"]*|[^"]*\/categorie[^"]*|[^"]*\/products?[^"]*|[^"]*\/famille[^"]*)"/gi;
  let match;
  while ((match = linkPattern.exec(html)) !== null) {
    let url = match[1];
    if (!url.startsWith("http")) {
      url = new URL(url, BASE_URL).href;
    }
    if (url.startsWith(BASE_URL)) {
      categoryLinks.add(url);
    }
  }

  // Also add the main catalog page itself
  categoryLinks.add(`${BASE_URL}/catalogue`);

  log(`  Found ${categoryLinks.size} catalog page(s)`);
  return [...categoryLinks];
}

/**
 * Scrape a catalog listing page to get product URLs.
 */
async function scrapeListingPage(url, cookies) {
  await sleep(REQUEST_DELAY_MS);

  const { response } = await fetchFollowRedirects(
    url,
    {
      headers: {
        "User-Agent":
          "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
        Referer: BASE_URL,
      },
    },
    cookies
  );

  const html = await response.text();
  const productUrls = new Set();

  // Find product detail links
  const productPattern =
    /href="([^"]*\/produit[^"]*|[^"]*\/product[^"]*|[^"]*\/article[^"]*|[^"]*\/fiche[^"]*)"/gi;
  let match;
  while ((match = productPattern.exec(html)) !== null) {
    let productUrl = match[1];
    if (!productUrl.startsWith("http")) {
      productUrl = new URL(productUrl, BASE_URL).href;
    }
    if (productUrl.startsWith(BASE_URL)) {
      productUrls.add(productUrl);
    }
  }

  // Find pagination links
  const paginationUrls = new Set();
  const pagePattern = /href="([^"]*[?&]page=\d+[^"]*)"/gi;
  while ((match = pagePattern.exec(html)) !== null) {
    let pageUrl = match[1];
    if (!pageUrl.startsWith("http")) {
      pageUrl = new URL(pageUrl, BASE_URL).href;
    }
    if (pageUrl.startsWith(BASE_URL)) {
      paginationUrls.add(pageUrl);
    }
  }

  return { productUrls: [...productUrls], paginationUrls: [...paginationUrls] };
}

/**
 * Scrape a single product detail page.
 */
async function scrapeProductPage(url, cookies) {
  await sleep(REQUEST_DELAY_MS);

  const { response } = await fetchFollowRedirects(
    url,
    {
      headers: {
        "User-Agent":
          "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
        Referer: BASE_URL,
      },
    },
    cookies
  );

  const html = await response.text();

  // Extract SKU / reference
  const sku =
    extractText(html, /(?:R[ée]f(?:[ée]rence)?|SKU|Code\s*article)\s*[:.]?\s*<[^>]*>([^<]+)/i) ||
    extractText(html, /data-sku="([^"]+)"/i) ||
    extractText(html, /data-ref="([^"]+)"/i) ||
    extractText(html, /itemprop="sku"[^>]*>([^<]+)/i) ||
    "";

  // Extract product name
  const name =
    extractText(html, /<h1[^>]*>([^<]+(?:<[^>]+>[^<]*)*)<\/h1>/i) ||
    extractText(html, /itemprop="name"[^>]*>([^<]+)/i) ||
    "";

  // Extract description
  const description =
    extractText(
      html,
      /(?:itemprop="description"|class="[^"]*description[^"]*")[^>]*>([\s\S]*?)<\/(?:div|p|span)/i
    ) || "";

  // Extract price
  const price =
    extractText(html, /class="[^"]*price[^"]*"[^>]*>([^<]+)/i) ||
    extractText(html, /itemprop="price"[^>]*content="([^"]+)"/i) ||
    "";

  const priceDetail =
    extractText(
      html,
      /class="[^"]*price-detail[^"]*"[^>]*>([\s\S]*?)<\/(?:div|span)/i
    ) || "";

  // Extract category
  const category =
    extractText(
      html,
      /class="[^"]*breadcrumb[^"]*"[^>]*>[\s\S]*?<(?:li|a)[^>]*>([^<]+)<\/(?:li|a)>\s*<(?:li|a)[^>]*>[^<]*<\/(?:li|a)>\s*$/i
    ) || "";

  // Extract specs table
  const specs = {};
  const specPattern =
    /<t[hd][^>]*>([^<]+)<\/t[hd]>\s*<t[hd][^>]*>([^<]+)<\/t[hd]>/gi;
  let specMatch;
  while ((specMatch = specPattern.exec(html)) !== null) {
    const key = specMatch[1].replace(/<[^>]+>/g, "").trim();
    const val = specMatch[2].replace(/<[^>]+>/g, "").trim();
    if (key && val && key !== val) {
      specs[key] = val;
    }
  }

  // Also try definition-list style specs
  const dlPattern =
    /<dt[^>]*>([^<]+)<\/dt>\s*<dd[^>]*>([^<]+)<\/dd>/gi;
  while ((specMatch = dlPattern.exec(html)) !== null) {
    const key = specMatch[1].trim();
    const val = specMatch[2].trim();
    if (key && val) specs[key] = val;
  }

  // Extract labels (eco, France, AGEC, etc.)
  const labels = extractAll(
    html,
    /class="[^"]*(?:label|badge|tag)[^"]*"[^>]*>([^<]+)/i
  ).filter(
    (l) =>
      /agec|eco|vert|france|recycl/i.test(l) || l.startsWith("product-")
  );

  // Also look for label images with alt text
  const labelImgAlts = extractAll(
    html,
    /class="[^"]*label[^"]*"[^>]*alt="([^"]+)"/i
  );
  labels.push(...labelImgAlts);

  // Extract images
  const imagesHD = [];
  const imgPattern =
    /(?:data-zoom-image|data-large|data-src|src)="(https?:\/\/[^"]*(?:Products|products|product)[^"]*\.(?:jpg|jpeg|png|webp)(?:\?[^"]*)?)"/gi;
  let imgMatch;
  while ((imgMatch = imgPattern.exec(html)) !== null) {
    const imgUrl = imgMatch[1];
    if (!imagesHD.includes(imgUrl)) {
      imagesHD.push(imgUrl);
    }
  }

  // Fallback: any large product images
  if (imagesHD.length === 0) {
    const fallbackPattern =
      /src="(https?:\/\/[^"]*alkor[^"]*\.(?:jpg|jpeg|png|webp)[^"]*)"/gi;
    while ((imgMatch = fallbackPattern.exec(html)) !== null) {
      if (
        !imgMatch[1].includes("logo") &&
        !imgMatch[1].includes("icon") &&
        !imagesHD.includes(imgMatch[1])
      ) {
        imagesHD.push(imgMatch[1]);
      }
    }
  }

  const slug = slugify(name || sku);

  return {
    sku,
    name,
    slug,
    description,
    price,
    priceDetail,
    category,
    specs,
    labels: [...new Set(labels)],
    imagesHD,
    localImages: [],
    sourceUrl: url,
    lastSync: new Date().toISOString(),
  };
}

// ── Image download ──────────────────────────────────────────────────────────

async function downloadImages(product) {
  if (!DOWNLOAD_IMAGES || product.imagesHD.length === 0) return product;

  const skuDir = join(IMAGES_DIR, product.sku);
  mkdirSync(skuDir, { recursive: true });

  const localImages = [];

  for (let i = 0; i < product.imagesHD.length; i++) {
    const imgUrl = product.imagesHD[i];
    const ext = imgUrl.match(/\.(jpg|jpeg|png|webp)/i)?.[1] || "jpg";
    const filename = `${product.sku}_${i + 1}.${ext}`;
    const filepath = join(skuDir, filename);
    const localPath = `/images/products/${product.sku}/${filename}`;

    try {
      const response = await fetch(imgUrl, {
        headers: {
          "User-Agent":
            "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
          Referer: BASE_URL,
        },
      });

      if (response.ok) {
        const buffer = Buffer.from(await response.arrayBuffer());
        writeFileSync(filepath, buffer);
        localImages.push(localPath);
      }
    } catch (err) {
      log(`  Warning: Failed to download image for ${product.sku}: ${err.message}`);
    }

    await sleep(100);
  }

  return { ...product, localImages };
}

// ── Supabase Storage image upload ───────────────────────────────────────────

async function uploadImagesToSupabase(product) {
  if (!UPLOAD_IMAGES_SUPABASE || product.imagesHD.length === 0) return product;
  if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) return product;

  const uploadedImages = [];

  for (let i = 0; i < product.imagesHD.length; i++) {
    const imgUrl = product.imagesHD[i];

    try {
      const response = await fetch(imgUrl, {
        headers: {
          "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
          Referer: BASE_URL,
        },
      });

      if (!response.ok) continue;

      const buffer = Buffer.from(await response.arrayBuffer());
      if (buffer.length < 100) continue; // skip tracking pixels

      const sha256 = createHash("sha256").update(buffer).digest("hex");
      const contentType = response.headers.get("content-type") || "image/jpeg";
      const ext = contentType.includes("png") ? "png" : contentType.includes("webp") ? "webp" : "jpg";
      const storagePath = `alkor/${product.sku}/${sha256.slice(0, 12)}_${i + 1}.${ext}`;

      // Upload to Supabase Storage (image-crawls bucket)
      const uploadResp = await fetch(
        `${SUPABASE_URL}/storage/v1/object/image-crawls/${storagePath}`,
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`,
            "Content-Type": contentType,
            "x-upsert": "true",
          },
          body: buffer,
        }
      );

      if (uploadResp.ok) {
        uploadedImages.push(storagePath);
      } else {
        const errText = await uploadResp.text();
        log(`  Warning: Storage upload failed for ${product.sku} image ${i + 1}: ${errText}`);
      }
    } catch (err) {
      log(`  Warning: Failed to upload image for ${product.sku}: ${err.message}`);
    }

    await sleep(100);
  }

  if (uploadedImages.length > 0) {
    log(`  Uploaded ${uploadedImages.length} images for ${product.sku}`);
  }

  return { ...product, storageImages: uploadedImages };
}

// ── Crawl job tracking ──────────────────────────────────────────────────────

async function updateCrawlJob(updates) {
  if (!CRAWL_JOB_ID || !SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) return;

  try {
    await fetch(
      `${SUPABASE_URL}/rest/v1/crawl_jobs?id=eq.${CRAWL_JOB_ID}`,
      {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`,
          apikey: SUPABASE_SERVICE_ROLE_KEY,
          Prefer: "return=minimal",
        },
        body: JSON.stringify({ ...updates, updated_at: new Date().toISOString() }),
      }
    );
  } catch (err) {
    log(`  Warning: Failed to update crawl job: ${err.message}`);
  }
}

// ── Main scraping orchestrator ──────────────────────────────────────────────

async function scrapeAllProducts(cookies) {
  log("Starting catalog scrape...");

  // Load existing data to preserve on error
  let existingProducts = [];
  const productsPath = join(DATA_DIR, "products.json");
  if (existsSync(productsPath)) {
    try {
      existingProducts = JSON.parse(readFileSync(productsPath, "utf-8"));
      log(`  Loaded ${existingProducts.length} existing products`);
    } catch {
      log("  Could not read existing products.json, starting fresh");
    }
  }

  const existingMap = new Map(existingProducts.map((p) => [p.sku, p]));

  // Discover catalog pages
  const catalogPages = await discoverCatalogPages(cookies);

  // Collect all product URLs across all pages
  const allProductUrls = new Set();
  const visitedPages = new Set();

  const pagesToVisit = [...catalogPages];

  while (pagesToVisit.length > 0) {
    const pageUrl = pagesToVisit.shift();
    if (visitedPages.has(pageUrl)) continue;
    visitedPages.add(pageUrl);

    try {
      log(`  Scraping listing: ${pageUrl}`);
      const { productUrls, paginationUrls } = await scrapeListingPage(
        pageUrl,
        cookies
      );

      for (const url of productUrls) allProductUrls.add(url);

      // Add pagination pages we haven't visited
      for (const url of paginationUrls) {
        if (!visitedPages.has(url)) {
          pagesToVisit.push(url);
        }
      }
    } catch (err) {
      log(`  Warning: Failed to scrape listing ${pageUrl}: ${err.message}`);
    }
  }

  log(`  Found ${allProductUrls.size} product URLs across ${visitedPages.size} listing pages`);

  await updateCrawlJob({ status: "running", pages_visited: visitedPages.size });

  // Scrape each product
  const products = [];
  let scraped = 0;
  let errors = 0;
  let imagesFound = 0;
  let imagesUploaded = 0;

  for (const productUrl of allProductUrls) {
    scraped++;
    if (scraped % 50 === 0) {
      log(`  Progress: ${scraped}/${allProductUrls.size} products`);
      await updateCrawlJob({
        pages_visited: visitedPages.size + scraped,
        images_found: imagesFound,
        images_uploaded: imagesUploaded,
      });
    }

    try {
      let product = await scrapeProductPage(productUrl, cookies);

      if (!product.sku && !product.name) {
        log(`  Skipping empty product at ${productUrl}`);
        continue;
      }

      imagesFound += product.imagesHD?.length || 0;

      // Download images locally if enabled
      product = await downloadImages(product);

      // Upload images to Supabase Storage if enabled
      product = await uploadImagesToSupabase(product);
      imagesUploaded += product.storageImages?.length || 0;

      products.push(product);
    } catch (err) {
      errors++;
      log(`  Error scraping ${productUrl}: ${err.message}`);
    }
  }

  log(`  Scraped ${products.length} products (${errors} errors, ${imagesFound} images found, ${imagesUploaded} uploaded)`);

  // Merge: new data takes precedence, but keep existing products not found in this scrape
  const newMap = new Map(products.filter((p) => p.sku).map((p) => [p.sku, p]));
  for (const [sku, existing] of existingMap) {
    if (!newMap.has(sku)) {
      // Preserve existing product that wasn't in current scrape
      newMap.set(sku, existing);
    }
  }

  return [...newMap.values()].sort((a, b) => a.sku.localeCompare(b.sku));
}

// ── Supabase push ───────────────────────────────────────────────────────────

async function pushToSupabase(products) {
  if (!PUSH_TO_SUPABASE) return;
  if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
    log("Warning: PUSH_TO_SUPABASE=true but SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY missing. Skipping.");
    return;
  }

  log(`Pushing ${products.length} products to Supabase...`);

  // Convert scraped products to the format expected by import-alkor edge function
  const rows = products
    .filter((p) => p.sku)
    .map((p) => ({
      ref_art: p.sku,
      description: p.name,
      libelle_court: p.name?.substring(0, 60),
      libelle_commercial: p.description,
      famille: p.category || "Non classé",
      ean: p.specs?.EAN || p.specs?.ean || null,
      cycle_vie: "Actif",
      marque_produit: p.specs?.Marque || null,
    }));

  // Send in batches of 200
  const BATCH_SIZE = 200;
  let total = { created: 0, updated: 0, errors: 0 };

  for (let i = 0; i < rows.length; i += BATCH_SIZE) {
    const batch = rows.slice(i, i + BATCH_SIZE);
    try {
      const response = await fetch(
        `${SUPABASE_URL}/functions/v1/import-alkor`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`,
            apikey: SUPABASE_SERVICE_ROLE_KEY,
          },
          body: JSON.stringify({ rows: batch, mode: "create" }),
        }
      );

      if (response.ok) {
        const result = await response.json();
        total.created += result.created || 0;
        total.updated += result.updated || 0;
        total.errors += result.errors || 0;
      } else {
        const errText = await response.text();
        log(`  Supabase batch error (${i}-${i + batch.length}): ${errText}`);
        total.errors += batch.length;
      }
    } catch (err) {
      log(`  Supabase batch error: ${err.message}`);
      total.errors += batch.length;
    }

    await sleep(500);
  }

  log(
    `  Supabase push done: ${total.created} created, ${total.updated} updated, ${total.errors} errors`
  );
}

// ── Output ──────────────────────────────────────────────────────────────────

function writeOutputFiles(products) {
  mkdirSync(DATA_DIR, { recursive: true });

  // Full data
  const productsPath = join(DATA_DIR, "products.json");
  writeFileSync(productsPath, JSON.stringify(products, null, 2), "utf-8");
  log(`Wrote ${products.length} products to ${productsPath}`);

  // Slim data for listings
  const slim = products.map((p) => ({
    sku: p.sku,
    name: p.name,
    slug: p.slug,
    price: p.price,
    description: p.description?.substring(0, 200) || "",
    image: p.localImages?.[0] || p.imagesHD?.[0] || null,
    imageCount: (p.localImages?.length || 0) + (p.imagesHD?.length || 0),
  }));

  const slimPath = join(DATA_DIR, "products-slim.json");
  writeFileSync(slimPath, JSON.stringify(slim, null, 2), "utf-8");
  log(`Wrote slim data to ${slimPath}`);
}

// ── Main ────────────────────────────────────────────────────────────────────

async function main() {
  log("=== Alkor B2B Catalog Sync ===");

  await updateCrawlJob({ status: "running" });

  try {
    const cookies = await login();
    const products = await scrapeAllProducts(cookies);

    writeOutputFiles(products);

    await pushToSupabase(products);

    await updateCrawlJob({
      status: "done",
      pages_visited: products.length,
      images_found: products.reduce((s, p) => s + (p.imagesHD?.length || 0), 0),
      images_uploaded: products.reduce((s, p) => s + (p.storageImages?.length || 0), 0),
    });

    log(`=== Sync complete: ${products.length} products ===`);
  } catch (err) {
    await updateCrawlJob({ status: "error", last_error: err.message });
    console.error(`[FATAL] ${err.message}`);
    process.exit(1);
  }
}

main();
