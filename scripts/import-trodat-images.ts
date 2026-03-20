#!/usr/bin/env npx tsx
/**
 * Script d'import des photos produits Trodat depuis trodat.net
 *
 * Usage: npx tsx scripts/import-trodat-images.ts
 *
 * Ce script :
 * 1. Récupère les pages produit Trodat pour extraire les URLs d'images
 * 2. Télécharge chaque image
 * 3. Upload dans le bucket Supabase "stamp-assets"
 * 4. Met à jour la colonne image_url de stamp_models
 */

import { createClient } from '@supabase/supabase-js';
import * as fs from 'fs';
import * as path from 'path';
import * as https from 'https';

// ── Config ──────────────────────────────────────────────────────────────────────

const SUPABASE_URL = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL || '';
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || '';

if (!SUPABASE_URL || !SUPABASE_SERVICE_KEY) {
  console.error('❌ Variables manquantes. Définissez SUPABASE_URL et SUPABASE_SERVICE_ROLE_KEY');
  console.error('   export SUPABASE_URL="https://mgojmkzovqgpipybelrr.supabase.co"');
  console.error('   export SUPABASE_SERVICE_ROLE_KEY="eyJ..."');
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

const BUCKET = 'stamp-assets';
const TMP_DIR = '/tmp/trodat-images';

// ── Modèles Trodat à importer ───────────────────────────────────────────────────

interface ModelSource {
  slug: string;
  name: string;
  /** URLs de pages produit Trodat à scraper pour trouver l'image */
  pageUrls: string[];
  /** Mots-clés pour filtrer les bonnes images (alt text, filename) */
  keywords: string[];
}

const TRODAT_MODELS: ModelSource[] = [
  {
    slug: 'trodat-printy-4911',
    name: 'Trodat Printy 4911',
    pageUrls: [
      'https://www.trodat.net/int/en/products/b2c/c1/at-work/c2/original-trodat-printy/c3/text-stamp-1/p/4911',
      'https://www.trodat.net/us/en/products/b2c/c1/at-work/c2/original-trodat-printy/c3/text-stamp-1/p/4911',
    ],
    keywords: ['4911', 'printy'],
  },
  {
    slug: 'trodat-printy-4912',
    name: 'Trodat Printy 4912',
    pageUrls: [
      'https://www.trodat.net/int/en/products/b2c/c1/at-work/c2/original-trodat-printy/c3/text-stamp-1/p/4912',
      'https://www.trodat.net/us/en/products/b2c/c1/at-work/c2/original-trodat-printy/c3/text-stamp-1/p/4912',
    ],
    keywords: ['4912', 'printy'],
  },
  {
    slug: 'trodat-printy-4913',
    name: 'Trodat Printy 4913',
    pageUrls: [
      'https://www.trodat.net/int/en/products/b2c/c1/at-work/c2/original-trodat-printy/c3/text-stamp-1/p/4913',
      'https://www.trodat.net/us/en/products/b2c/c1/at-work/c2/original-trodat-printy/c3/text-stamp-1/p/4913',
    ],
    keywords: ['4913', 'printy'],
  },
  {
    slug: 'trodat-printy-4926',
    name: 'Trodat Printy 4926',
    pageUrls: [
      'https://www.trodat.net/int/en/products/b2c/c1/at-work/c2/original-trodat-printy/c3/text-stamp-1/p/4926',
      'https://www.trodat.net/us/en/products/b2c/c1/at-work/c2/original-trodat-printy/c3/text-stamp-1/p/4926',
    ],
    keywords: ['4926', 'printy'],
  },
  {
    slug: 'trodat-printy-4927',
    name: 'Trodat Printy 4927',
    pageUrls: [
      'https://www.trodat.net/int/en/products/b2c/c1/at-work/c2/original-trodat-printy/c3/text-stamp-1/p/4927',
      'https://www.trodat.net/us/en/products/b2c/c1/at-work/c2/original-trodat-printy/c3/text-stamp-1/p/4927',
    ],
    keywords: ['4927', 'printy'],
  },
  {
    slug: 'trodat-printy-46040',
    name: 'Trodat Printy 46040',
    pageUrls: [
      'https://www.trodat.net/int/en/products/b2c/c1/at-work/c2/original-trodat-printy/c3/round-stamp/p/46040',
      'https://www.trodat.net/us/en/products/b2c/c1/at-work/c2/original-trodat-printy/c3/round-stamp/p/46040',
    ],
    keywords: ['46040', 'printy'],
  },
  {
    slug: 'trodat-printy-dateur-4820',
    name: 'Trodat Printy Dateur 4820',
    pageUrls: [
      'https://www.trodat.net/int/en/products/b2c/c1/at-work/c2/original-trodat-printy/c3/date-stamp--numberer/p/4820',
      'https://www.trodat.net/us/en/products/b2c/c1/at-home/c2/original-trodat-printy-2/c3/date-stamp--numberer-1/p/4820',
    ],
    keywords: ['4820', 'printy', 'dater'],
  },
  {
    slug: 'trodat-professional-5460',
    name: 'Trodat Professional 5460',
    pageUrls: [
      'https://www.trodat.net/int/en/products/b2c/c1/at-work/c2/trodat-professional/c3/date-stamp/p/5460',
      'https://www.trodat.net/us/en/products/b2c/c1/at-work/c2/trodat-professional/c3/date-stamp/p/5460',
    ],
    keywords: ['5460', 'professional'],
  },
];

// ── Colop models ────────────────────────────────────────────────────────────────

const COLOP_MODELS: ModelSource[] = [
  {
    slug: 'colop-printer-20',
    name: 'Colop Printer 20',
    pageUrls: ['https://www.colop.com/en/products/stamps/self-inking-stamps/printer/printer-20'],
    keywords: ['printer-20', 'printer 20'],
  },
  {
    slug: 'colop-printer-30',
    name: 'Colop Printer 30',
    pageUrls: ['https://www.colop.com/en/products/stamps/self-inking-stamps/printer/printer-30'],
    keywords: ['printer-30', 'printer 30'],
  },
  {
    slug: 'colop-printer-40',
    name: 'Colop Printer 40',
    pageUrls: ['https://www.colop.com/en/products/stamps/self-inking-stamps/printer/printer-40'],
    keywords: ['printer-40', 'printer 40'],
  },
  {
    slug: 'colop-printer-50',
    name: 'Colop Printer 50',
    pageUrls: ['https://www.colop.com/en/products/stamps/self-inking-stamps/printer/printer-50'],
    keywords: ['printer-50', 'printer 50'],
  },
  {
    slug: 'colop-printer-r40',
    name: 'Colop Printer R40',
    pageUrls: ['https://www.colop.com/en/products/stamps/self-inking-stamps/printer/printer-r-40'],
    keywords: ['r40', 'r-40', 'printer r'],
  },
];

const ALL_MODELS = [...TRODAT_MODELS, ...COLOP_MODELS];

// ── Helpers ─────────────────────────────────────────────────────────────────────

function fetchPage(url: string): Promise<string> {
  return new Promise((resolve, reject) => {
    const req = https.get(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
        'Accept-Language': 'fr-FR,fr;q=0.9,en;q=0.8',
      },
    }, (res) => {
      // Follow redirects
      if (res.statusCode && res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
        const redirectUrl = res.headers.location.startsWith('http')
          ? res.headers.location
          : new URL(res.headers.location, url).href;
        fetchPage(redirectUrl).then(resolve).catch(reject);
        return;
      }
      if (res.statusCode !== 200) {
        reject(new Error(`HTTP ${res.statusCode} for ${url}`));
        return;
      }
      let data = '';
      res.on('data', (chunk) => data += chunk);
      res.on('end', () => resolve(data));
    });
    req.on('error', reject);
    req.setTimeout(15000, () => { req.destroy(); reject(new Error(`Timeout for ${url}`)); });
  });
}

function downloadFile(url: string, dest: string): Promise<void> {
  return new Promise((resolve, reject) => {
    const file = fs.createWriteStream(dest);
    https.get(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36',
        'Accept': 'image/*',
      },
    }, (res) => {
      if (res.statusCode && res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
        file.close();
        fs.unlinkSync(dest);
        const redirectUrl = res.headers.location.startsWith('http')
          ? res.headers.location
          : new URL(res.headers.location, url).href;
        downloadFile(redirectUrl, dest).then(resolve).catch(reject);
        return;
      }
      if (res.statusCode !== 200) {
        file.close();
        fs.unlinkSync(dest);
        reject(new Error(`HTTP ${res.statusCode} downloading ${url}`));
        return;
      }
      res.pipe(file);
      file.on('finish', () => { file.close(); resolve(); });
    }).on('error', (err) => {
      file.close();
      if (fs.existsSync(dest)) fs.unlinkSync(dest);
      reject(err);
    });
  });
}

/** Extract product image URLs from an HTML page */
function extractImageUrls(html: string, baseUrl: string, keywords: string[]): string[] {
  const imgRegex = /<img[^>]+src=["']([^"']+)["'][^>]*>/gi;
  const ogRegex = /<meta[^>]+property=["']og:image["'][^>]+content=["']([^"']+)["']/gi;
  const srcsetRegex = /srcset=["']([^"']+)["']/gi;

  const urls = new Set<string>();

  // Extract og:image (usually the best product image)
  let match;
  while ((match = ogRegex.exec(html)) !== null) {
    urls.add(match[1]);
  }

  // Extract img src
  while ((match = imgRegex.exec(html)) !== null) {
    const src = match[1];
    const fullTag = match[0].toLowerCase();
    // Skip tiny images, icons, logos
    if (src.includes('logo') || src.includes('icon') || src.includes('favicon')) continue;
    if (src.includes('.svg') && !src.includes('product')) continue;
    // Check if alt text or src contains our keywords
    const lowerSrc = src.toLowerCase();
    const hasKeyword = keywords.some(k => fullTag.includes(k.toLowerCase()) || lowerSrc.includes(k.toLowerCase()));
    if (hasKeyword) urls.add(src);
  }

  // Extract from srcset
  while ((match = srcsetRegex.exec(html)) !== null) {
    const parts = match[1].split(',').map(s => s.trim().split(/\s+/)[0]);
    for (const src of parts) {
      const lowerSrc = src.toLowerCase();
      if (keywords.some(k => lowerSrc.includes(k.toLowerCase()))) {
        urls.add(src);
      }
    }
  }

  // Make URLs absolute
  return Array.from(urls).map(u => {
    if (u.startsWith('http')) return u;
    if (u.startsWith('//')) return 'https:' + u;
    return new URL(u, baseUrl).href;
  });
}

/** Pick the best image URL (prefer large, og:image, jpg/png) */
function pickBestImage(urls: string[]): string | null {
  if (urls.length === 0) return null;
  // Prefer og:image or large images
  const scored = urls.map(url => {
    let score = 0;
    if (url.includes('og:') || url.includes('og_')) score += 10;
    if (url.includes('large') || url.includes('hero') || url.includes('main')) score += 5;
    if (url.includes('.jpg') || url.includes('.jpeg') || url.includes('.png')) score += 3;
    if (url.includes('.webp')) score += 2;
    if (url.includes('thumb') || url.includes('small')) score -= 5;
    return { url, score };
  });
  scored.sort((a, b) => b.score - a.score);
  return scored[0].url;
}

// ── Main ────────────────────────────────────────────────────────────────────────

async function main() {
  console.log('🔧 Import des photos produits Trodat & Colop');
  console.log(`   Supabase: ${SUPABASE_URL}`);
  console.log(`   Bucket: ${BUCKET}`);
  console.log(`   Modèles: ${ALL_MODELS.length}`);
  console.log('');

  // Create temp dir
  if (!fs.existsSync(TMP_DIR)) fs.mkdirSync(TMP_DIR, { recursive: true });

  let successCount = 0;
  let failCount = 0;

  for (const model of ALL_MODELS) {
    console.log(`\n📦 ${model.name} (${model.slug})`);

    // Step 1: Try to find image URL from product pages
    let imageUrl: string | null = null;

    for (const pageUrl of model.pageUrls) {
      try {
        console.log(`   🔍 Scraping ${pageUrl}...`);
        const html = await fetchPage(pageUrl);
        const urls = extractImageUrls(html, pageUrl, model.keywords);
        console.log(`   📸 Trouvé ${urls.length} images`);
        if (urls.length > 0) {
          imageUrl = pickBestImage(urls);
          if (imageUrl) {
            console.log(`   ✅ Image: ${imageUrl}`);
            break;
          }
        }
      } catch (err: any) {
        console.log(`   ⚠️  Erreur: ${err.message}`);
      }
    }

    if (!imageUrl) {
      console.log(`   ❌ Aucune image trouvée pour ${model.name}`);
      failCount++;
      continue;
    }

    // Step 2: Download image
    const ext = imageUrl.match(/\.(jpg|jpeg|png|webp)/i)?.[1] || 'jpg';
    const localFile = path.join(TMP_DIR, `${model.slug}.${ext}`);

    try {
      console.log(`   ⬇️  Téléchargement...`);
      await downloadFile(imageUrl, localFile);
      const stats = fs.statSync(localFile);
      console.log(`   📁 ${(stats.size / 1024).toFixed(1)} KB`);
    } catch (err: any) {
      console.log(`   ❌ Échec téléchargement: ${err.message}`);
      failCount++;
      continue;
    }

    // Step 3: Upload to Supabase Storage
    const storagePath = `products/${model.slug}.${ext}`;
    const contentType = ext === 'png' ? 'image/png' : ext === 'webp' ? 'image/webp' : 'image/jpeg';

    try {
      console.log(`   ☁️  Upload vers ${BUCKET}/${storagePath}...`);
      const fileBuffer = fs.readFileSync(localFile);

      const { error: uploadError } = await supabase.storage
        .from(BUCKET)
        .upload(storagePath, fileBuffer, {
          contentType,
          upsert: true,
        });

      if (uploadError) throw uploadError;

      // Get public URL
      const { data: urlData } = supabase.storage
        .from(BUCKET)
        .getPublicUrl(storagePath);

      const publicUrl = urlData.publicUrl;
      console.log(`   🔗 ${publicUrl}`);

      // Step 4: Update database
      const { error: updateError } = await supabase
        .from('stamp_models')
        .update({ image_url: publicUrl })
        .eq('slug', model.slug);

      if (updateError) throw updateError;

      console.log(`   ✅ Base de données mise à jour`);
      successCount++;
    } catch (err: any) {
      console.log(`   ❌ Échec upload/update: ${err.message}`);
      failCount++;
    }

    // Clean up local file
    if (fs.existsSync(localFile)) fs.unlinkSync(localFile);
  }

  console.log('\n' + '═'.repeat(60));
  console.log(`✅ Succès: ${successCount} | ❌ Échecs: ${failCount} | Total: ${ALL_MODELS.length}`);

  // Clean up temp dir
  if (fs.existsSync(TMP_DIR)) fs.rmSync(TMP_DIR, { recursive: true });
}

main().catch((err) => {
  console.error('❌ Erreur fatale:', err);
  process.exit(1);
});
