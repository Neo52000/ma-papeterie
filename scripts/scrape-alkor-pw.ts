#!/usr/bin/env npx tsx
/**
 * scrape-alkor-pw.ts — Alkor B2B catalog scraper using Playwright
 *
 * Replaces the old fetch+regex scraper (scrape-alkor.mjs) with a real
 * Chromium browser via Playwright. This handles JavaScript-rendered pages,
 * dynamic login forms, and proper cookie/session management.
 *
 * Environment variables:
 *   ALKOR_CLIENT_CODE       — Code client (e.g. 991002005031)
 *   ALKOR_USERNAME          — Identifiant utilisateur
 *   ALKOR_PASSWORD          — Mot de passe
 *   ALKOR_BASE_URL          — Base URL (default: https://b2b.alkorshop.com)
 *   UPLOAD_IMAGES_SUPABASE  — "true" to upload images to Supabase Storage
 *   PUSH_TO_SUPABASE        — "true" to push product data to Supabase
 *   SUPABASE_URL            — Supabase project URL
 *   SUPABASE_SERVICE_ROLE_KEY — Supabase service role key
 *   CRAWL_JOB_ID            — Optional crawl_jobs.id for progress tracking
 */

import { chromium, type Page, type BrowserContext } from "playwright";
import { createHash } from "node:crypto";
import { mkdirSync, writeFileSync, existsSync, readFileSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, "..");
const DATA_DIR = join(ROOT, "data");
const SCREENSHOTS_DIR = join(__dirname, "screenshots");

// ── Config ──────────────────────────────────────────────────────────────────
const BASE_URL = (process.env.ALKOR_BASE_URL || "https://b2b.alkorshop.com").replace(/\/+$/, "");
const UPLOAD_IMAGES_SUPABASE = process.env.UPLOAD_IMAGES_SUPABASE === "true";
const PUSH_TO_SUPABASE = process.env.PUSH_TO_SUPABASE === "true";
const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
const CRAWL_JOB_ID = process.env.CRAWL_JOB_ID || null;

const REQUEST_DELAY_MS = 500;
const LOGIN_TIMEOUT_MS = 30_000;
const NAVIGATION_TIMEOUT_MS = 20_000;

interface Credentials {
  clientCode: string;
  username: string;
  password: string;
}

interface Product {
  sku: string;
  name: string;
  slug: string;
  description: string;
  price: string;
  category: string;
  specs: Record<string, string>;
  labels: string[];
  imagesHD: string[];
  storageImages: string[];
  sourceUrl: string;
  lastSync: string;
}

// ── Helpers ─────────────────────────────────────────────────────────────────

function log(msg: string) {
  console.log(`[${new Date().toISOString()}] ${msg}`);
}

function slugify(text: string): string {
  return text
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .substring(0, 120);
}

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function saveScreenshot(page: Page, name: string) {
  mkdirSync(SCREENSHOTS_DIR, { recursive: true });
  const path = join(SCREENSHOTS_DIR, `${name}-${Date.now()}.png`);
  await page.screenshot({ path, fullPage: true });
  log(`  Screenshot saved: ${path}`);
}

// ── Crawl job tracking ──────────────────────────────────────────────────────

async function updateCrawlJob(updates: Record<string, unknown>) {
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
    log(`  Warning: Failed to update crawl job: ${(err as Error).message}`);
  }
}

// ── Credentials loading ─────────────────────────────────────────────────────

async function loadCredentials(): Promise<Credentials> {
  // Try env vars first (GitHub Secrets)
  if (process.env.ALKOR_CLIENT_CODE && process.env.ALKOR_USERNAME && process.env.ALKOR_PASSWORD) {
    return {
      clientCode: process.env.ALKOR_CLIENT_CODE,
      username: process.env.ALKOR_USERNAME,
      password: process.env.ALKOR_PASSWORD,
    };
  }

  // Fallback: query admin_secrets table via Supabase REST API
  if (SUPABASE_URL && SUPABASE_SERVICE_ROLE_KEY) {
    log("  Loading credentials from admin_secrets...");
    const keys = ["ALKOR_CLIENT_CODE", "ALKOR_USERNAME", "ALKOR_PASSWORD"];
    const resp = await fetch(
      `${SUPABASE_URL}/rest/v1/admin_secrets?key=in.(${keys.map(k => `"${k}"`).join(",")})&select=key,value`,
      {
        headers: {
          Authorization: `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`,
          apikey: SUPABASE_SERVICE_ROLE_KEY,
        },
      }
    );

    if (resp.ok) {
      const rows = await resp.json() as { key: string; value: string }[];
      const creds: Record<string, string> = {};
      for (const row of rows) {
        creds[row.key] = row.value;
      }

      if (creds.ALKOR_CLIENT_CODE && creds.ALKOR_USERNAME && creds.ALKOR_PASSWORD) {
        return {
          clientCode: creds.ALKOR_CLIENT_CODE,
          username: creds.ALKOR_USERNAME,
          password: creds.ALKOR_PASSWORD,
        };
      }
    }
  }

  throw new Error(
    "Missing credentials. Set ALKOR_CLIENT_CODE, ALKOR_USERNAME, and ALKOR_PASSWORD " +
    "as environment variables or in admin_secrets."
  );
}

// ── Login ───────────────────────────────────────────────────────────────────

async function login(page: Page, creds: Credentials): Promise<void> {
  log("Logging in to Alkor B2B...");

  // Navigate to the base URL and wait for the page to load
  await page.goto(BASE_URL, { waitUntil: "domcontentloaded", timeout: NAVIGATION_TIMEOUT_MS });
  log(`  Landed on: ${page.url()}`);
  log(`  Page title: ${await page.title()}`);

  // Wait for a password field to appear (the login form)
  // The page might redirect through several pages before showing the login form
  try {
    await page.waitForSelector('input[type="password"]', { timeout: LOGIN_TIMEOUT_MS });
    log("  Login form detected.");
  } catch {
    // Maybe the page has a login link we need to click first
    log("  No password field found, looking for login link...");
    const loginLink = await page.$('a[href*="ogin"], a[href*="connexion"], a[href*="dentif"], a[href*="ompte"]');
    if (loginLink) {
      await loginLink.click();
      await page.waitForSelector('input[type="password"]', { timeout: LOGIN_TIMEOUT_MS });
      log("  Login form found after clicking login link.");
    } else {
      await saveScreenshot(page, "no-login-form");
      throw new Error("No login form found on the page. The site may have changed.");
    }
  }

  // Detect form fields dynamically
  const fields = await page.evaluate(() => {
    const inputs = Array.from(document.querySelectorAll('form input:not([type="hidden"]):not([type="submit"]):not([type="button"])'));
    return inputs.map(input => ({
      name: (input as HTMLInputElement).name,
      type: (input as HTMLInputElement).type,
      id: (input as HTMLInputElement).id,
      placeholder: (input as HTMLInputElement).placeholder,
    }));
  });
  log(`  Form fields: ${fields.map(f => `${f.name}(${f.type})`).join(", ")}`);

  // Map credentials to detected fields
  const passwordField = fields.find(f => f.type === "password");
  const textFields = fields.filter(f => f.type !== "password");

  // Heuristic: identify which text field is client code vs username
  let clientCodeSelector: string | null = null;
  let usernameSelector: string | null = null;

  for (const field of textFields) {
    const nameLC = (field.name + field.id + field.placeholder).toLowerCase();
    if (/code|client|customer|collectif|eproc/i.test(nameLC)) {
      clientCodeSelector = field.name ? `input[name="${field.name}"]` : `#${field.id}`;
    } else if (/user|login|logon|identif|email|nom/i.test(nameLC)) {
      usernameSelector = field.name ? `input[name="${field.name}"]` : `#${field.id}`;
    }
  }

  // If we have 3 text fields, assume order: client code, username, password
  if (!clientCodeSelector && !usernameSelector && textFields.length >= 2) {
    clientCodeSelector = textFields[0].name ? `input[name="${textFields[0].name}"]` : `#${textFields[0].id}`;
    usernameSelector = textFields[1].name ? `input[name="${textFields[1].name}"]` : `#${textFields[1].id}`;
  } else if (!clientCodeSelector && usernameSelector && textFields.length >= 2) {
    // Take the other text field as client code
    const other = textFields.find(f => {
      const sel = f.name ? `input[name="${f.name}"]` : `#${f.id}`;
      return sel !== usernameSelector;
    });
    if (other) {
      clientCodeSelector = other.name ? `input[name="${other.name}"]` : `#${other.id}`;
    }
  } else if (clientCodeSelector && !usernameSelector && textFields.length >= 2) {
    const other = textFields.find(f => {
      const sel = f.name ? `input[name="${f.name}"]` : `#${f.id}`;
      return sel !== clientCodeSelector;
    });
    if (other) {
      usernameSelector = other.name ? `input[name="${other.name}"]` : `#${other.id}`;
    }
  }

  const passwordSelector = passwordField
    ? (passwordField.name ? `input[name="${passwordField.name}"]` : `#${passwordField.id}`)
    : 'input[type="password"]';

  log(`  Filling: clientCode=${clientCodeSelector}, username=${usernameSelector}, password=${passwordSelector}`);

  // Fill the form
  if (clientCodeSelector) {
    await page.fill(clientCodeSelector, creds.clientCode);
  }
  if (usernameSelector) {
    await page.fill(usernameSelector, creds.username);
  }
  await page.fill(passwordSelector, creds.password);

  // Submit: click submit button or press Enter
  const submitBtn = await page.$('button[type="submit"], input[type="submit"], button:has-text("connexion"), button:has-text("Connexion"), button:has-text("Se connecter"), button:has-text("Valider"), button:has-text("OK")');
  if (submitBtn) {
    await Promise.all([
      page.waitForNavigation({ waitUntil: "domcontentloaded", timeout: NAVIGATION_TIMEOUT_MS }).catch(() => {}),
      submitBtn.click(),
    ]);
  } else {
    await Promise.all([
      page.waitForNavigation({ waitUntil: "domcontentloaded", timeout: NAVIGATION_TIMEOUT_MS }).catch(() => {}),
      page.press(passwordSelector, "Enter"),
    ]);
  }

  // Wait a moment for any post-login redirects
  await sleep(2000);

  // Verify login success
  const postLoginUrl = page.url();
  const postLoginTitle = await page.title();
  log(`  Post-login page: ${postLoginUrl}`);
  log(`  Post-login title: ${postLoginTitle}`);

  const isLoggedIn = await page.evaluate(() => {
    const body = document.body.innerText.toLowerCase();
    const hasLogout = /déconnexion|logout|logoff|signoff/i.test(body);
    const hasAccount = /mon\s*compte|panier|basket|cart|commande|catalogue/i.test(body);
    const hasPasswordField = !!document.querySelector('input[type="password"]');
    const hasError = /mot de passe incorrect|identifiants invalides|invalid|erreur.*connexion/i.test(body);
    return (hasLogout || hasAccount) && !hasPasswordField && !hasError;
  });

  if (!isLoggedIn) {
    // Check if we're still on a login page
    const stillOnLogin = await page.$('input[type="password"]');
    if (stillOnLogin) {
      await saveScreenshot(page, "login-failed");
      throw new Error("Login failed. Still on login page after submission. Check your credentials.");
    }

    // Check for error messages
    const pageText = await page.evaluate(() => document.body.innerText);
    if (/incorrect|invalid|erreur|error/i.test(pageText)) {
      await saveScreenshot(page, "login-error");
      throw new Error("Login failed. Error message detected on page. Check your credentials.");
    }

    // If no obvious error but no success indicator either, proceed cautiously
    log("  Warning: Could not confirm login success, proceeding cautiously...");
    await saveScreenshot(page, "login-uncertain");
  }

  log("  Login successful.");
}

// ── Session expiry detection ────────────────────────────────────────────────

async function checkSessionAndRelogin(page: Page, creds: Credentials): Promise<boolean> {
  const hasPasswordField = await page.$('input[type="password"]');
  if (hasPasswordField) {
    log("  Session expired, re-authenticating...");
    await login(page, creds);
    return true;
  }
  return false;
}

// ── Catalog discovery ───────────────────────────────────────────────────────

async function discoverCatalog(page: Page): Promise<string[]> {
  log("Discovering catalog pages...");

  const candidateUrls = [
    `${BASE_URL}/ebureau/`,
    `${BASE_URL}/catalogue`,
    `${BASE_URL}/ebureau/ViewStandardCatalog-Browse`,
    `${BASE_URL}/ebureau/ViewParametricSearch-SimpleOfferSearch`,
  ];

  // First try navigating to candidate catalog pages
  for (const url of candidateUrls) {
    try {
      await page.goto(url, { waitUntil: "domcontentloaded", timeout: NAVIGATION_TIMEOUT_MS });
      if (page.url().includes("404") || page.url().includes("error")) continue;

      const links = await page.$$eval("a[href]", (anchors, baseUrl) => {
        return anchors
          .map(a => a.href)
          .filter(href =>
            href.startsWith(baseUrl) &&
            /categ|product|famille|catalog|Browse|Search|article|fiche/i.test(href) &&
            !/Logon|Logoff|login|logout/i.test(href)
          );
      }, BASE_URL);

      if (links.length > 0) {
        const unique = [...new Set(links)];
        log(`  Found ${unique.length} catalog links at ${url}`);
        return unique;
      }
    } catch {
      continue;
    }
  }

  // Fallback: look for navigation/category links on the current page
  const navLinks = await page.$$eval("a[href]", (anchors, baseUrl) => {
    return anchors
      .map(a => a.href)
      .filter(href =>
        href.startsWith(baseUrl) &&
        !/Logon|Logoff|login|logout|javascript/i.test(href)
      );
  }, BASE_URL);

  if (navLinks.length > 0) {
    const unique = [...new Set(navLinks)];
    log(`  Found ${unique.length} navigation links on current page`);
    return unique.slice(0, 50); // Limit to prevent crawling the entire site
  }

  log("  Warning: No catalog pages found, using base URL");
  return [BASE_URL];
}

// ── Product listing scraping ────────────────────────────────────────────────

async function scrapeProductList(page: Page, categoryUrl: string): Promise<{ productUrls: string[]; nextPageUrls: string[] }> {
  await sleep(REQUEST_DELAY_MS);

  try {
    await page.goto(categoryUrl, { waitUntil: "domcontentloaded", timeout: NAVIGATION_TIMEOUT_MS });
  } catch {
    return { productUrls: [], nextPageUrls: [] };
  }

  const result = await page.evaluate((baseUrl) => {
    const allLinks = Array.from(document.querySelectorAll("a[href]")).map(a => (a as HTMLAnchorElement).href);

    const productUrls = allLinks.filter(href =>
      href.startsWith(baseUrl) &&
      /\/produit|\/product|\/article|\/fiche|ViewProduct|ViewOffer|ProductDisplay/i.test(href)
    );

    const nextPageUrls = allLinks.filter(href =>
      href.startsWith(baseUrl) &&
      /[?&]page=\d+|[?&]PageNumber=\d+|[?&]beginIndex=\d+/i.test(href)
    );

    return {
      productUrls: [...new Set(productUrls)],
      nextPageUrls: [...new Set(nextPageUrls)],
    };
  }, BASE_URL);

  return result;
}

// ── Single product scraping ─────────────────────────────────────────────────

async function scrapeProduct(page: Page, url: string): Promise<Product | null> {
  await sleep(REQUEST_DELAY_MS);

  try {
    await page.goto(url, { waitUntil: "domcontentloaded", timeout: NAVIGATION_TIMEOUT_MS });
  } catch {
    return null;
  }

  const data = await page.evaluate(() => {
    const getText = (sel: string): string => {
      const el = document.querySelector(sel);
      return el?.textContent?.trim() || "";
    };

    const getAttr = (sel: string, attr: string): string => {
      const el = document.querySelector(sel);
      return el?.getAttribute(attr) || "";
    };

    // Extract SKU
    const sku =
      getAttr('[data-sku]', 'data-sku') ||
      getAttr('[data-ref]', 'data-ref') ||
      getText('[itemprop="sku"]') ||
      (() => {
        const refEl = Array.from(document.querySelectorAll("*")).find(el =>
          /^(Réf|Ref|SKU|Code\s*article)/i.test(el.textContent?.trim() || "")
        );
        if (refEl) {
          const match = refEl.textContent?.match(/(?:Réf|Ref|SKU|Code\s*article)[^:]*:\s*(\S+)/i);
          return match?.[1] || "";
        }
        return "";
      })();

    // Extract name
    const name =
      getText("h1") ||
      getText('[itemprop="name"]') ||
      "";

    // Extract description
    const description =
      getText('[itemprop="description"]') ||
      getText('.description') ||
      "";

    // Extract price
    const price =
      getAttr('[itemprop="price"]', 'content') ||
      getText('.price') ||
      getText('[itemprop="price"]') ||
      "";

    // Extract category from breadcrumbs
    const breadcrumbs = Array.from(document.querySelectorAll('.breadcrumb a, .breadcrumb li, nav[aria-label*="breadcrumb"] a'));
    const category = breadcrumbs.length > 1 ? (breadcrumbs[breadcrumbs.length - 2]?.textContent?.trim() || "") : "";

    // Extract specs from tables/definition lists
    const specs: Record<string, string> = {};
    document.querySelectorAll("table tr").forEach(tr => {
      const cells = tr.querySelectorAll("th, td");
      if (cells.length >= 2) {
        const key = cells[0].textContent?.trim() || "";
        const val = cells[1].textContent?.trim() || "";
        if (key && val && key !== val) specs[key] = val;
      }
    });
    document.querySelectorAll("dl").forEach(dl => {
      const dts = dl.querySelectorAll("dt");
      const dds = dl.querySelectorAll("dd");
      dts.forEach((dt, i) => {
        const key = dt.textContent?.trim() || "";
        const val = dds[i]?.textContent?.trim() || "";
        if (key && val) specs[key] = val;
      });
    });

    // Extract labels (eco, France, AGEC, etc.)
    const labels: string[] = [];
    document.querySelectorAll(".label, .badge, .tag").forEach(el => {
      const text = el.textContent?.trim() || "";
      if (/agec|eco|vert|france|recycl/i.test(text)) {
        labels.push(text);
      }
    });
    document.querySelectorAll("img[alt]").forEach(img => {
      const alt = img.getAttribute("alt") || "";
      if (/agec|eco|vert|france|recycl|label/i.test(alt)) {
        labels.push(alt);
      }
    });

    // Extract images
    const images: string[] = [];
    const addImage = (url: string) => {
      if (url && !images.includes(url) && !url.includes("logo") && !url.includes("icon") && url.length > 10) {
        images.push(url);
      }
    };

    // High-res images first
    document.querySelectorAll("[data-zoom-image], [data-large], [data-full-size]").forEach(el => {
      addImage(el.getAttribute("data-zoom-image") || el.getAttribute("data-large") || el.getAttribute("data-full-size") || "");
    });

    // Product images (src and srcset)
    document.querySelectorAll("img").forEach(img => {
      const src = img.src || img.getAttribute("data-src") || "";
      if (/product|Products|article|image.*large|zoom/i.test(src)) {
        addImage(src);
      }
    });

    // Fallback: any large images from the same domain
    if (images.length === 0) {
      document.querySelectorAll("img[src]").forEach(img => {
        const src = img.src;
        if (src && !src.includes("logo") && !src.includes("icon") && !src.includes("pixel")) {
          addImage(src);
        }
      });
    }

    return { sku, name, description, price, category, specs, labels: [...new Set(labels)], imagesHD: images };
  });

  if (!data.sku && !data.name) return null;

  return {
    ...data,
    slug: slugify(data.name || data.sku),
    storageImages: [],
    sourceUrl: url,
    lastSync: new Date().toISOString(),
  };
}

// ── Image download and upload ───────────────────────────────────────────────

async function downloadAndUploadImages(context: BrowserContext, products: Product[]): Promise<void> {
  if (!UPLOAD_IMAGES_SUPABASE || !SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) return;

  log("Uploading images to Supabase Storage...");
  let totalUploaded = 0;

  for (const product of products) {
    if (!product.sku || product.imagesHD.length === 0) continue;

    for (let i = 0; i < product.imagesHD.length; i++) {
      const imgUrl = product.imagesHD[i];

      try {
        // Use the browser context's request API to download with cookies
        const response = await context.request.get(imgUrl, {
          headers: { Referer: BASE_URL },
          timeout: 15_000,
        });

        if (!response.ok()) continue;

        const buffer = await response.body();
        if (buffer.length < 100) continue; // Skip tracking pixels

        const sha256 = createHash("sha256").update(buffer).digest("hex");
        const contentType = response.headers()["content-type"] || "image/jpeg";
        const ext = contentType.includes("png") ? "png" : contentType.includes("webp") ? "webp" : "jpg";
        const storagePath = `alkor/${product.sku}/${sha256.slice(0, 12)}_${i + 1}.${ext}`;

        // Upload to Supabase Storage
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
          product.storageImages.push(storagePath);
          totalUploaded++;
        } else {
          const errText = await uploadResp.text();
          log(`  Warning: Upload failed for ${product.sku} image ${i + 1}: ${errText}`);
        }
      } catch (err) {
        log(`  Warning: Failed to download image for ${product.sku}: ${(err as Error).message}`);
      }

      await sleep(100);
    }
  }

  log(`  Uploaded ${totalUploaded} images total`);
}

// ── Supabase data push ──────────────────────────────────────────────────────

async function pushToSupabase(products: Product[]): Promise<void> {
  if (!PUSH_TO_SUPABASE || !SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) return;

  log(`Pushing ${products.length} products to Supabase...`);

  const rows = products
    .filter(p => p.sku)
    .map(p => ({
      ref_art: p.sku,
      description: p.name,
      libelle_court: p.name?.substring(0, 60),
      libelle_commercial: p.description,
      famille: p.category || "Non classé",
      ean: p.specs?.EAN || p.specs?.ean || null,
      cycle_vie: "Actif",
      marque_produit: p.specs?.Marque || null,
    }));

  const BATCH_SIZE = 200;
  const total = { created: 0, updated: 0, errors: 0 };

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
        log(`  Batch error (${i}-${i + batch.length}): ${errText}`);
        total.errors += batch.length;
      }
    } catch (err) {
      log(`  Batch error: ${(err as Error).message}`);
      total.errors += batch.length;
    }

    await sleep(500);
  }

  log(`  Push done: ${total.created} created, ${total.updated} updated, ${total.errors} errors`);
}

// ── Output files ────────────────────────────────────────────────────────────

function writeOutputFiles(products: Product[]) {
  mkdirSync(DATA_DIR, { recursive: true });

  const productsPath = join(DATA_DIR, "products.json");
  writeFileSync(productsPath, JSON.stringify(products, null, 2), "utf-8");
  log(`Wrote ${products.length} products to ${productsPath}`);

  const slim = products.map(p => ({
    sku: p.sku,
    name: p.name,
    slug: p.slug,
    price: p.price,
    description: p.description?.substring(0, 200) || "",
    image: p.imagesHD?.[0] || null,
    imageCount: p.imagesHD?.length || 0,
  }));

  const slimPath = join(DATA_DIR, "products-slim.json");
  writeFileSync(slimPath, JSON.stringify(slim, null, 2), "utf-8");
  log(`Wrote slim data to ${slimPath}`);
}

// ── Main ────────────────────────────────────────────────────────────────────

async function main() {
  log("=== Alkor B2B Catalog Sync (Playwright) ===");

  await updateCrawlJob({ status: "running" });

  const browser = await chromium.launch({
    headless: true,
    args: ["--disable-blink-features=AutomationControlled"],
  });

  const context = await browser.newContext({
    viewport: { width: 1280, height: 720 },
    userAgent: "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
    locale: "fr-FR",
  });

  const page = await context.newPage();

  try {
    // Load existing data to preserve on error
    let existingProducts: Product[] = [];
    const productsPath = join(DATA_DIR, "products.json");
    if (existsSync(productsPath)) {
      try {
        existingProducts = JSON.parse(readFileSync(productsPath, "utf-8"));
        log(`  Loaded ${existingProducts.length} existing products`);
      } catch {
        log("  Could not read existing products.json, starting fresh");
      }
    }
    const existingMap = new Map(existingProducts.map(p => [p.sku, p]));

    // Step 1: Login
    const creds = await loadCredentials();
    await login(page, creds);

    // Step 2: Discover catalog pages
    const catalogPages = await discoverCatalog(page);

    // Step 3: Collect product URLs
    const allProductUrls = new Set<string>();
    const visitedPages = new Set<string>();
    const pagesToVisit = [...catalogPages];

    while (pagesToVisit.length > 0) {
      const pageUrl = pagesToVisit.shift()!;
      if (visitedPages.has(pageUrl)) continue;
      visitedPages.add(pageUrl);

      try {
        // Check for session expiry
        await checkSessionAndRelogin(page, creds);

        log(`  Scraping listing: ${pageUrl}`);
        const { productUrls, nextPageUrls } = await scrapeProductList(page, pageUrl);

        for (const url of productUrls) allProductUrls.add(url);
        for (const url of nextPageUrls) {
          if (!visitedPages.has(url)) pagesToVisit.push(url);
        }
      } catch (err) {
        log(`  Warning: Failed to scrape listing ${pageUrl}: ${(err as Error).message}`);
      }
    }

    log(`  Found ${allProductUrls.size} product URLs across ${visitedPages.size} listing pages`);
    await updateCrawlJob({ pages_visited: visitedPages.size });

    // Step 4: Scrape each product
    const products: Product[] = [];
    let scraped = 0;
    let errors = 0;
    let imagesFound = 0;

    for (const productUrl of allProductUrls) {
      scraped++;
      if (scraped % 50 === 0) {
        log(`  Progress: ${scraped}/${allProductUrls.size} products`);
        await updateCrawlJob({
          pages_visited: visitedPages.size + scraped,
          images_found: imagesFound,
        });
      }

      try {
        // Check for session expiry periodically
        if (scraped % 100 === 0) {
          await checkSessionAndRelogin(page, creds);
        }

        const product = await scrapeProduct(page, productUrl);
        if (!product) continue;

        imagesFound += product.imagesHD.length;
        products.push(product);
      } catch (err) {
        errors++;
        log(`  Error scraping ${productUrl}: ${(err as Error).message}`);
      }
    }

    log(`  Scraped ${products.length} products (${errors} errors, ${imagesFound} images found)`);

    // Step 5: Download and upload images
    await downloadAndUploadImages(context, products);
    const imagesUploaded = products.reduce((s, p) => s + (p.storageImages?.length || 0), 0);

    // Step 6: Merge with existing data
    const newMap = new Map(products.filter(p => p.sku).map(p => [p.sku, p]));
    for (const [sku, existing] of existingMap) {
      if (!newMap.has(sku)) {
        newMap.set(sku, existing);
      }
    }
    const allProducts = [...newMap.values()].sort((a, b) => a.sku.localeCompare(b.sku));

    // Step 7: Write output files
    writeOutputFiles(allProducts);

    // Step 8: Push to Supabase
    await pushToSupabase(allProducts);

    // Step 9: Final crawl job update
    await updateCrawlJob({
      status: "done",
      pages_visited: visitedPages.size + scraped,
      images_found: imagesFound,
      images_uploaded: imagesUploaded,
    });

    log(`=== Sync complete: ${allProducts.length} products, ${imagesUploaded} images uploaded ===`);
  } catch (err) {
    await saveScreenshot(page, "fatal-error");
    await updateCrawlJob({ status: "error", last_error: (err as Error).message });
    console.error(`[FATAL] ${(err as Error).message}`);
    await browser.close();
    process.exit(1);
  }

  await browser.close();
}

main();
