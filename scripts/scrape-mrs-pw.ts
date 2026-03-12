#!/usr/bin/env npx tsx
/**
 * scrape-mrs-pw.ts — ma-rentree-scolaire.fr public catalog scraper using Playwright
 *
 * Scrapes the public-facing site (no auth needed) to enrich existing Alkor
 * product data with public descriptions, images, and retail prices.
 *
 * Environment variables:
 *   MRS_BASE_URL              — Base URL (default: https://ma-rentree-scolaire.fr)
 *   UPLOAD_IMAGES_SUPABASE    — "true" to upload images to Supabase Storage
 *   PUSH_TO_SUPABASE          — "true" to push product data to Supabase
 *   SUPABASE_URL              — Supabase project URL
 *   SUPABASE_SERVICE_ROLE_KEY — Supabase service role key
 *   CRAWL_JOB_ID              — Optional crawl_jobs.id for progress tracking
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
const BASE_URL = (process.env.MRS_BASE_URL || "https://ma-rentree-scolaire.fr").replace(/\/+$/, "");
const UPLOAD_IMAGES_SUPABASE = process.env.UPLOAD_IMAGES_SUPABASE === "true";
const PUSH_TO_SUPABASE = process.env.PUSH_TO_SUPABASE === "true";
const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
const CRAWL_JOB_ID = process.env.CRAWL_JOB_ID || null;

const REQUEST_DELAY_MS = 300;
const NAVIGATION_TIMEOUT_MS = 20_000;

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

// ── Catalog discovery ───────────────────────────────────────────────────────

async function discoverCatalog(page: Page): Promise<string[]> {
  log("Discovering catalog pages...");

  await page.goto(BASE_URL, { waitUntil: "domcontentloaded", timeout: NAVIGATION_TIMEOUT_MS });
  log(`  Landed on: ${page.url()}`);
  log(`  Page title: ${await page.title()}`);

  // Extract category links from navigation and page content
  const categoryLinks = await page.evaluate((baseUrl) => {
    const allLinks = Array.from(document.querySelectorAll("a[href]")).map(a => (a as HTMLAnchorElement).href);

    // Filter for category/listing pages
    const categories = allLinks.filter(href => {
      if (!href.startsWith(baseUrl)) return false;
      // Skip non-content pages
      if (/login|connexion|panier|cart|checkout|compte|contact|mentions|cgv|faq/i.test(href)) return false;
      // Match category patterns
      return /categ|produit|product|collection|rayon|fourniture|scolaire|bureau|papeterie|classeur|cahier|stylo|colle|ciseaux|trousse|cartable|sac/i.test(href);
    });

    return [...new Set(categories)];
  }, BASE_URL);

  if (categoryLinks.length > 0) {
    log(`  Found ${categoryLinks.length} category links`);
    return categoryLinks;
  }

  // Fallback: collect all internal links
  const allLinks = await page.evaluate((baseUrl) => {
    return [...new Set(
      Array.from(document.querySelectorAll("a[href]"))
        .map(a => (a as HTMLAnchorElement).href)
        .filter(href =>
          href.startsWith(baseUrl) &&
          !href.includes("#") &&
          !/login|connexion|javascript/i.test(href)
        )
    )];
  }, BASE_URL);

  log(`  Found ${allLinks.length} navigation links (fallback)`);
  return allLinks.slice(0, 100);
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

    // Product page patterns (individual product pages)
    const productUrls = allLinks.filter(href =>
      href.startsWith(baseUrl) &&
      /\/produit|\/product|\/article|\/fiche|[/-]\d{4,}[\-.]|\.html$/i.test(href) &&
      !/categ|collection|rayon|page=|login|panier|cart/i.test(href)
    );

    // Pagination
    const nextPageUrls = allLinks.filter(href =>
      href.startsWith(baseUrl) &&
      /[?&]page=\d+|[?&]p=\d+|\/page\/\d+/i.test(href)
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

    // Extract SKU / reference
    const sku =
      getAttr('[data-sku]', 'data-sku') ||
      getAttr('[data-ref]', 'data-ref') ||
      getAttr('[data-product-id]', 'data-product-id') ||
      getText('[itemprop="sku"]') ||
      getText('.product-reference') ||
      getText('.reference') ||
      (() => {
        const refEl = Array.from(document.querySelectorAll("*")).find(el =>
          /^(Réf|Ref|SKU|Code|Référence)/i.test(el.textContent?.trim() || "")
        );
        if (refEl) {
          const match = refEl.textContent?.match(/(?:Réf|Ref|SKU|Code|Référence)[^:]*[:\s]+(\S+)/i);
          return match?.[1] || "";
        }
        return "";
      })();

    // Extract EAN
    const ean =
      getAttr('[data-ean]', 'data-ean') ||
      getText('[itemprop="gtin13"]') ||
      getText('[itemprop="gtin"]') ||
      (() => {
        const eanEl = Array.from(document.querySelectorAll("*")).find(el =>
          /^(EAN|GTIN|Code.barre)/i.test(el.textContent?.trim() || "")
        );
        if (eanEl) {
          const match = eanEl.textContent?.match(/(?:EAN|GTIN|Code.barre)[^:]*[:\s]+(\d{8,14})/i);
          return match?.[1] || "";
        }
        return "";
      })();

    // Extract name
    const name =
      getText("h1") ||
      getText('[itemprop="name"]') ||
      getText('.product-name') ||
      "";

    // Extract description
    const description =
      getText('[itemprop="description"]') ||
      getText('.product-description') ||
      getText('.description') ||
      getText('#description') ||
      "";

    // Extract price
    const price =
      getAttr('[itemprop="price"]', 'content') ||
      getText('[itemprop="price"]') ||
      getText('.current-price') ||
      getText('.product-price') ||
      getText('.price') ||
      "";

    // Extract category from breadcrumbs
    const breadcrumbs = Array.from(document.querySelectorAll('.breadcrumb a, .breadcrumb li, nav[aria-label*="breadcrumb"] a, ol.breadcrumb a'));
    const category = breadcrumbs.length > 1 ? (breadcrumbs[breadcrumbs.length - 2]?.textContent?.trim() || "") : "";

    // Extract specs from tables/definition lists
    const specs: Record<string, string> = {};
    if (ean) specs["EAN"] = ean;

    document.querySelectorAll("table tr, .product-features tr, .data-sheet tr").forEach(tr => {
      const cells = tr.querySelectorAll("th, td");
      if (cells.length >= 2) {
        const key = cells[0].textContent?.trim() || "";
        const val = cells[1].textContent?.trim() || "";
        if (key && val && key !== val) specs[key] = val;
      }
    });
    document.querySelectorAll("dl, .product-features dl").forEach(dl => {
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
    document.querySelectorAll(".label, .badge, .tag, .flag").forEach(el => {
      const text = el.textContent?.trim() || "";
      if (/agec|eco|vert|france|recycl|label|promo|nouveau/i.test(text)) {
        labels.push(text);
      }
    });

    // Extract images
    const images: string[] = [];
    const addImage = (url: string) => {
      if (url && !images.includes(url) && !url.includes("logo") && !url.includes("icon") && url.length > 10) {
        // Prefer large/HD versions
        const hdUrl = url
          .replace(/(-small|-thumb|-mini|-cart|-home|-medium|-listing)(\.[a-z]+)$/i, '-large$2')
          .replace(/\/small\/|\/thumb\/|\/medium\//i, '/large/');
        images.push(hdUrl !== url ? hdUrl : url);
      }
    };

    // High-res first
    document.querySelectorAll("[data-zoom-image], [data-image-large-src], [data-full-size], [data-large]").forEach(el => {
      addImage(
        el.getAttribute("data-zoom-image") ||
        el.getAttribute("data-image-large-src") ||
        el.getAttribute("data-full-size") ||
        el.getAttribute("data-large") || ""
      );
    });

    // Product gallery images
    document.querySelectorAll(".product-images img, .product-cover img, .images-container img, #product-images img, .product-thumbs img").forEach(img => {
      const src = (img as HTMLImageElement).src || img.getAttribute("data-src") || img.getAttribute("data-lazy") || "";
      addImage(src);
    });

    // Fallback: img with product-ish patterns
    if (images.length === 0) {
      document.querySelectorAll("img[src]").forEach(img => {
        const src = (img as HTMLImageElement).src;
        if (src && /product|article|image/i.test(src) && !/logo|icon|pixel|sprite/i.test(src)) {
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
        const response = await context.request.get(imgUrl, {
          headers: { Referer: BASE_URL },
          timeout: 15_000,
        });

        if (!response.ok()) continue;

        const buffer = await response.body();
        if (buffer.length < 100) continue;

        const sha256 = createHash("sha256").update(buffer).digest("hex");
        const contentType = response.headers()["content-type"] || "image/jpeg";
        const ext = contentType.includes("png") ? "png" : contentType.includes("webp") ? "webp" : "jpg";
        const storagePath = `mrs/${product.sku}/${sha256.slice(0, 12)}_${i + 1}.${ext}`;

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
          if (totalUploaded % 10 === 0) {
            await updateCrawlJob({ images_uploaded: totalUploaded });
          }
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

// ── Supabase enrichment push ────────────────────────────────────────────────

async function pushToSupabase(products: Product[]): Promise<void> {
  if (!PUSH_TO_SUPABASE || !SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) return;

  log(`Pushing ${products.length} products to Supabase (enrich mode)...`);

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
      marque_produit: p.specs?.Marque || p.specs?.marque || null,
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
          body: JSON.stringify({ rows: batch, mode: "enrich" }),
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

  const productsPath = join(DATA_DIR, "mrs-products.json");
  writeFileSync(productsPath, JSON.stringify(products, null, 2), "utf-8");
  log(`Wrote ${products.length} products to ${productsPath}`);
}

// ── Main ────────────────────────────────────────────────────────────────────

async function main() {
  log("=== ma-rentree-scolaire.fr Catalog Sync (Playwright) ===");

  await updateCrawlJob({ status: "running", phase: "discovery" });

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
    // Step 1: Discover catalog pages (no login needed — public site)
    const catalogPages = await discoverCatalog(page);

    // Step 2: Collect product URLs
    const allProductUrls = new Set<string>();
    const visitedPages = new Set<string>();
    const pagesToVisit = [...catalogPages];

    while (pagesToVisit.length > 0) {
      const pageUrl = pagesToVisit.shift()!;
      if (visitedPages.has(pageUrl)) continue;
      visitedPages.add(pageUrl);

      try {
        log(`  Scraping listing: ${pageUrl}`);
        const { productUrls, nextPageUrls } = await scrapeProductList(page, pageUrl);

        for (const url of productUrls) allProductUrls.add(url);
        for (const url of nextPageUrls) {
          if (!visitedPages.has(url)) pagesToVisit.push(url);
        }

        if (visitedPages.size % 5 === 0) {
          await updateCrawlJob({ pages_visited: visitedPages.size });
        }
      } catch (err) {
        log(`  Warning: Failed to scrape listing ${pageUrl}: ${(err as Error).message}`);
      }
    }

    log(`  Found ${allProductUrls.size} product URLs across ${visitedPages.size} listing pages`);
    const totalExpectedPages = visitedPages.size + allProductUrls.size;
    await updateCrawlJob({
      pages_visited: visitedPages.size,
      max_pages: totalExpectedPages,
      phase: "scraping",
    });

    // Step 3: Scrape each product
    const products: Product[] = [];
    let scraped = 0;
    let errors = 0;
    let imagesFound = 0;

    for (const productUrl of allProductUrls) {
      scraped++;
      if (scraped % 10 === 0 || scraped === allProductUrls.size) {
        log(`  Progress: ${scraped}/${allProductUrls.size} products`);
        await updateCrawlJob({
          pages_visited: visitedPages.size + scraped,
          images_found: imagesFound,
        });
      }

      try {
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

    // Step 4: Download and upload images
    await updateCrawlJob({ phase: "uploading" });
    await downloadAndUploadImages(context, products);
    const imagesUploaded = products.reduce((s, p) => s + (p.storageImages?.length || 0), 0);

    // Step 5: Write output files
    writeOutputFiles(products);

    // Step 6: Push to Supabase (enrich mode)
    await updateCrawlJob({ phase: "pushing", images_uploaded: imagesUploaded });
    await pushToSupabase(products);

    // Step 7: Final crawl job update
    await updateCrawlJob({
      status: "done",
      phase: "done",
      pages_visited: visitedPages.size + scraped,
      images_found: imagesFound,
      images_uploaded: imagesUploaded,
    });

    log(`=== Sync complete: ${products.length} products, ${imagesUploaded} images uploaded ===`);
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
