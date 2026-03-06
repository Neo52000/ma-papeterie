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

const BASE_URL = "https://b2b.alkorshop.com";
// The Intershop platform does not use /login — we discover the login page dynamically

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
 * Fetch with retry logic.
 */
async function fetchWithRetry(url, options = {}, retries = MAX_RETRIES) {
  for (let attempt = 1; attempt <= retries; attempt++) {
    try {
      const response = await fetch(url, {
        ...options,
        redirect: "manual",
      });
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

async function login() {
  log("Logging in to Alkor B2B...");

  if (!CLIENT_CODE || !USERNAME || !PASSWORD) {
    throw new Error(
      "Missing credentials. Set ALKOR_CLIENT_CODE, ALKOR_USERNAME, and ALKOR_PASSWORD."
    );
  }

  const UA =
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36";

  // Step 1: Visit homepage and follow redirects to discover the login page
  log("  Discovering login page...");
  const { response: homePage, cookies: initialCookies, url: landingUrl } =
    await fetchFollowRedirects(BASE_URL, {
      headers: { "User-Agent": UA },
    });
  const homeHtml = await homePage.text();
  log(`  Landed on: ${landingUrl}`);

  // Try to find the login page URL from the landing page
  // Intershop patterns: LogonForm, ViewLogon, UserAccount-ShowLogin, etc.
  let loginPageUrl = landingUrl;
  let loginHtml = homeHtml;
  let loginCookies = initialCookies;

  // If the landing page doesn't have a login form, look for login links
  const hasLoginForm =
    /<form[^>]*>[\s\S]*?type="password"/i.test(homeHtml);

  if (!hasLoginForm) {
    // Search for common login page links
    const loginLinkPatterns = [
      /href="([^"]*(?:Logon|Login|LogonForm|ShowLogin|connexion|identification|authenticate)[^"]*)"/gi,
      /href="([^"]*(?:ViewUserAccount)[^"]*)"/gi,
    ];

    let loginLink = null;
    for (const pattern of loginLinkPatterns) {
      const match = pattern.exec(homeHtml);
      if (match) {
        loginLink = match[1];
        break;
      }
    }

    if (loginLink) {
      const resolvedUrl = loginLink.startsWith("http")
        ? loginLink
        : new URL(loginLink, landingUrl).href;
      log(`  Found login link: ${resolvedUrl}`);
      const result = await fetchFollowRedirects(
        resolvedUrl,
        { headers: { "User-Agent": UA } },
        initialCookies
      );
      loginHtml = await result.response.text();
      loginCookies = result.cookies;
      loginPageUrl = result.url;
    } else {
      // Try common Intershop login paths
      const commonPaths = [
        "/ebureau/ViewLogon-Start",
        "/ebureau/ViewUserAccount-ShowLogin",
        "/ebureau/LogonForm",
      ];
      for (const path of commonPaths) {
        try {
          const tryUrl = `${BASE_URL}${path}`;
          log(`  Trying: ${tryUrl}`);
          const result = await fetchFollowRedirects(
            tryUrl,
            { headers: { "User-Agent": UA } },
            initialCookies
          );
          const html = await result.response.text();
          if (/<form[^>]*>[\s\S]*?type="password"/i.test(html)) {
            loginHtml = html;
            loginCookies = result.cookies;
            loginPageUrl = result.url;
            log(`  Found login form at: ${loginPageUrl}`);
            break;
          }
        } catch {
          continue;
        }
      }
    }
  }

  log(`  Login page URL: ${loginPageUrl}`);

  // Log a snippet of what we found for debugging
  const titleMatch = loginHtml.match(/<title[^>]*>([^<]*)<\/title>/i);
  log(`  Page title: ${titleMatch ? titleMatch[1].trim() : "(none)"}`);

  // Try to find a CSRF token (various patterns)
  const csrfMatch =
    loginHtml.match(/name="_token"\s+value="([^"]+)"/) ||
    loginHtml.match(/name="csrf[_-]?token"\s+value="([^"]+)"/) ||
    loginHtml.match(/name="_csrf"\s+value="([^"]+)"/) ||
    loginHtml.match(/name="CSRFToken"\s+value="([^"]+)"/i);
  const csrfToken = csrfMatch ? csrfMatch[1] : "";

  // Detect all form action URLs — prefer the one with password field
  const formPattern = /<form[^>]*action="([^"]+)"[^>]*>([\s\S]*?)<\/form>/gi;
  let formAction = loginPageUrl;
  let formHtml = loginHtml;
  let formMatch;
  while ((formMatch = formPattern.exec(loginHtml)) !== null) {
    if (/type="password"/i.test(formMatch[2])) {
      formAction = formMatch[1].startsWith("http")
        ? formMatch[1]
        : new URL(formMatch[1], loginPageUrl).href;
      formHtml = formMatch[2];
      break;
    }
  }

  // Detect field names from the login form
  const inputNames = [...formHtml.matchAll(/<input[^>]*name="([^"]+)"[^>]*>/gi)]
    .map((m) => m[1])
    .filter((n) => !n.startsWith("_") || n === "_token");
  log(`  Form fields detected: ${inputNames.join(", ")}`);

  // Build login payload — adapt to detected fields
  const formData = new URLSearchParams();
  if (csrfToken) {
    // Set the CSRF token with whatever field name it uses
    const csrfFieldName = csrfMatch[0].match(/name="([^"]+)"/)?.[1] || "_token";
    formData.set(csrfFieldName, csrfToken);
  }

  // Also capture any hidden fields from the form
  const hiddenPattern = /<input[^>]*type="hidden"[^>]*name="([^"]+)"[^>]*value="([^"]*)"[^>]*>/gi;
  let hiddenMatch;
  while ((hiddenMatch = hiddenPattern.exec(formHtml)) !== null) {
    if (!formData.has(hiddenMatch[1])) {
      formData.set(hiddenMatch[1], hiddenMatch[2]);
    }
  }
  // Also try reverse attribute order (value before name)
  const hiddenPattern2 = /<input[^>]*type="hidden"[^>]*value="([^"]*)"[^>]*name="([^"]+)"[^>]*>/gi;
  while ((hiddenMatch = hiddenPattern2.exec(formHtml)) !== null) {
    if (!formData.has(hiddenMatch[2])) {
      formData.set(hiddenMatch[2], hiddenMatch[1]);
    }
  }

  // Map our 3 credentials to the detected form fields
  // Intershop patterns: logonId, logonPassword, CustomerCode, etc.
  // Also support: code_client, username/login/identifiant, password/mdp
  const clientCodeField =
    inputNames.find((n) => /code|client|customer/i.test(n)) || "code_client";
  const usernameField =
    inputNames.find((n) => /user|login|logonId|identif|email/i.test(n)) || "logonId";
  const passwordField =
    inputNames.find((n) => /pass|mdp|pwd|logonPassword/i.test(n)) || "logonPassword";

  formData.set(clientCodeField, CLIENT_CODE);
  formData.set(usernameField, USERNAME);
  formData.set(passwordField, PASSWORD);

  log(`  Posting login to ${formAction}`);
  log(`  Fields: ${clientCodeField}=${CLIENT_CODE}, ${usernameField}=${USERNAME}, ${passwordField}=***`);

  // Step 2: POST the login form
  const { response: loginResponse, cookies: sessionCookies, url: postLoginUrl } =
    await fetchFollowRedirects(
      formAction,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/x-www-form-urlencoded",
          Referer: loginPageUrl,
          "User-Agent": UA,
          Origin: BASE_URL,
        },
        body: formData.toString(),
      },
      loginCookies
    );

  const responseHtml = await loginResponse.text();
  const postTitle = responseHtml.match(/<title[^>]*>([^<]*)<\/title>/i);
  log(`  Post-login page: ${postLoginUrl}`);
  log(`  Post-login title: ${postTitle ? postTitle[1].trim() : "(none)"}`);

  // Check if login succeeded — look for typical post-login indicators
  const hasLogout =
    /d[ée]connexion|logout|logoff|SignOff/i.test(responseHtml);
  const hasAccount =
    /Mon\s*compte|account|profil|panier|basket|cart/i.test(responseHtml);
  const hasError =
    /mot de passe incorrect|identifiants invalides|invalid|error|erreur.*connexion|login.*(failed|incorrect|invalid)/i.test(responseHtml);
  const stillOnLogin = /<input[^>]*type="password"/i.test(responseHtml);

  const isLoggedIn =
    (hasLogout || hasAccount) && !hasError && !stillOnLogin;

  if (!isLoggedIn) {
    if (stillOnLogin || hasError) {
      throw new Error(
        `Login failed (status ${loginResponse.status}). Check your credentials.`
      );
    }
    // If we got a 200 and no obvious error, cautiously proceed
    if (loginResponse.status >= 400) {
      throw new Error(
        `Login failed (status ${loginResponse.status}). The login page may have changed.`
      );
    }
    log("  Warning: Could not confirm login success, proceeding cautiously...");
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

  const UA = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36";

  // Try multiple possible catalog entry points (Intershop + generic patterns)
  const candidateUrls = [
    `${BASE_URL}/ebureau/`,
    `${BASE_URL}/catalogue`,
    `${BASE_URL}/ebureau/ViewStandardCatalog-Browse`,
    `${BASE_URL}/ebureau/ViewParametricSearch-SimpleOfferSearch`,
    BASE_URL,
  ];

  let html = "";
  let landedUrl = "";

  for (const candidateUrl of candidateUrls) {
    try {
      const result = await fetchFollowRedirects(
        candidateUrl,
        { headers: { "User-Agent": UA, Referer: BASE_URL } },
        cookies
      );
      const candidateHtml = await result.response.text();
      // Check if this page has product/category links
      if (
        /href="[^"]*(?:categ|product|famille|catalog|Browse|Search|article|fiche)/i.test(candidateHtml) ||
        candidateHtml.length > 5000
      ) {
        html = candidateHtml;
        landedUrl = result.url;
        log(`  Catalog entry point: ${landedUrl}`);
        break;
      }
    } catch {
      continue;
    }
  }

  if (!html) {
    log("  Warning: Could not find catalog entry point");
    return [BASE_URL];
  }

  // Find all category/catalog links (generic + Intershop patterns)
  const categoryLinks = new Set();
  const linkPattern = /href="([^"]*(?:\/catalogue|\/categorie|\/products?|\/famille|Browse|Category|ViewStandardCatalog|ViewParametricSearch|categ|catalog)[^"]*)"/gi;
  let match;
  while ((match = linkPattern.exec(html)) !== null) {
    let url = match[1];
    if (!url.startsWith("http")) {
      url = new URL(url, landedUrl || BASE_URL).href;
    }
    if (url.startsWith(BASE_URL)) {
      categoryLinks.add(url);
    }
  }

  // Also look for any navigation links that might be categories
  const navPattern = /href="([^"]*ebureau[^"]*)"/gi;
  while ((match = navPattern.exec(html)) !== null) {
    let url = match[1];
    if (!url.startsWith("http")) {
      url = new URL(url, landedUrl || BASE_URL).href;
    }
    if (url.startsWith(BASE_URL) && !url.includes("Logon") && !url.includes("Logoff")) {
      categoryLinks.add(url);
    }
  }

  if (categoryLinks.size === 0 && landedUrl) {
    categoryLinks.add(landedUrl);
  }

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

  // Find product detail links (generic + Intershop patterns)
  const productPattern =
    /href="([^"]*\/produit[^"]*|[^"]*\/product[^"]*|[^"]*\/article[^"]*|[^"]*\/fiche[^"]*|[^"]*ViewProduct[^"]*|[^"]*ViewOffer[^"]*|[^"]*ProductDisplay[^"]*)"/gi;
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

  // Find pagination links (support both ?page=N and Intershop patterns)
  const paginationUrls = new Set();
  const pagePattern = /href="([^"]*(?:[?&]page=\d+|[?&]PageNumber=\d+|[?&]beginIndex=\d+)[^"]*)"/gi;
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
