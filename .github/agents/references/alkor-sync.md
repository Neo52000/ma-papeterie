# ALKOR B2B Sync Reference

## Overview
ALKOR is the primary supplier for ma-papeterie, providing stationery products through their B2B shop. The sync process scrapes product data, prices, and images, then imports them into the Supabase database.

## Architecture

### Data Flow
```
ALKOR B2B Shop → scrape-alkor.mjs → import-alkor Edge Function → products table
                                      → images table
                                      → supplier_offers table
```

### Key Components
- **scrape-alkor.mjs**: Node.js scraper using Puppeteer/Playwright
- **import-alkor Edge Function**: Deno function processing scraped data
- **GitHub Actions**: Scheduled sync triggers
- **Admin UI**: Manual trigger and monitoring

## Critical Patterns

### 1. Scraper Implementation
```javascript
// scrape-alkor.mjs - Core scraping logic
const scrapeAlkorProducts = async () => {
  const browser = await puppeteer.launch();
  const page = await browser.newPage();

  // Login to B2B shop
  await page.goto('https://b2b.alkor.fr/login');
  await page.type('#username', process.env.ALKOR_USERNAME);
  await page.type('#password', process.env.ALKOR_PASSWORD);
  await page.click('#login-btn');

  // Navigate to catalog
  await page.goto('https://b2b.alkor.fr/catalog');

  // Extract products with pagination
  const products = [];
  let hasNextPage = true;

  while (hasNextPage) {
    const pageProducts = await page.evaluate(() => {
      const items = document.querySelectorAll('.product-item');
      return Array.from(items).map(item => ({
        sku: item.dataset.sku,
        name: item.querySelector('.product-name').textContent,
        price: parseFloat(item.querySelector('.price').textContent.replace('€', '')),
        image_url: item.querySelector('img').src,
        category: item.dataset.category
      }));
    });

    products.push(...pageProducts);

    // Check for next page
    hasNextPage = await page.$('.next-page:not(.disabled)') !== null;
    if (hasNextPage) {
      await page.click('.next-page');
      await page.waitForTimeout(2000); // Rate limiting
    }
  }

  await browser.close();
  return products;
};
```

### 2. Edge Function Processing
```typescript
// supabase/functions/import-alkor/index.ts
import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

serve(async (req) => {
  const { supplier, mode } = await req.json()

  // Create Supabase client
  const supabase = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
  )

  try {
    // Fetch scraped data from crawl_jobs
    const { data: job } = await supabase
      .from('crawl_jobs')
      .select('result_data')
      .eq('supplier', supplier)
      .eq('status', 'completed')
      .order('created_at', { ascending: false })
      .limit(1)
      .single()

    const products = job.result_data.products

    // Batch insert/update products
    const { error } = await supabase
      .from('products')
      .upsert(products, {
        onConflict: 'sku',
        ignoreDuplicates: false
      })

    if (error) throw error

    // Update crawl job status
    await supabase
      .from('crawl_jobs')
      .update({ status: 'processed', processed_at: new Date() })
      .eq('id', job.id)

    return new Response(JSON.stringify({ success: true }), {
      headers: { 'Content-Type': 'application/json' }
    })

  } catch (error) {
    console.error('Import error:', error)
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    })
  }
})
```

### 3. Image Collection Pattern
```typescript
// Image collection with retry logic
const collectProductImages = async (products: AlkorProduct[]) => {
  const imagePromises = products.map(async (product) => {
    try {
      // Download image with timeout
      const response = await fetch(product.image_url, {
        timeout: 10000,
        headers: {
          'User-Agent': 'ma-papeterie-bot/1.0'
        }
      })

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`)
      }

      const imageBuffer = await response.arrayBuffer()

      // Upload to Supabase Storage
      const { data, error } = await supabase.storage
        .from('product-images')
        .upload(`${product.sku}.jpg`, imageBuffer, {
          contentType: 'image/jpeg',
          upsert: true
        })

      if (error) throw error

      // Update product with image URL
      await supabase
        .from('products')
        .update({ image_url: data.path })
        .eq('sku', product.sku)

    } catch (error) {
      console.error(`Failed to collect image for ${product.sku}:`, error)

      // Log failed image collection
      await supabase
        .from('import_logs')
        .insert({
          supplier: 'ALKOR',
          operation: 'image_collection',
          status: 'failed',
          error_message: error.message,
          product_sku: product.sku
        })
    }
  })

  await Promise.allSettled(imagePromises)
}
```

## Common Issues & Solutions

### Issue: Scraper Blocked by CAPTCHA
**Solution**: Implement headless browser with realistic delays, rotate user agents, use proxy rotation.

### Issue: Rate Limiting
**Solution**: Exponential backoff, respect robots.txt, implement crawl delays.

### Issue: Product Data Inconsistency
**Solution**: Validate data before insert, implement data quality checks, log discrepancies.

### Issue: Image URLs Expire
**Solution**: Download and store images immediately, implement image refresh cycle.

## Performance Optimizations

### 1. Batch Processing
```typescript
// Process products in batches to avoid memory issues
const batchSize = 100
for (let i = 0; i < products.length; i += batchSize) {
  const batch = products.slice(i, i + batchSize)
  await processBatch(batch)
}
```

### 2. Parallel Image Downloads
```typescript
// Limit concurrent downloads to avoid overwhelming the server
const downloadQueue = new PQueue({ concurrency: 5 })
const imagePromises = products.map(product =>
  downloadQueue.add(() => downloadImage(product))
)
```

### 3. Database Indexing
Ensure proper indexes on frequently queried columns:
- `products.sku`
- `products.supplier`
- `products.category`
- `crawl_jobs.supplier, crawl_jobs.status`

## Monitoring & Debugging

### Key Metrics to Track
- Sync duration
- Success rate per supplier
- Error rates by error type
- Data quality scores
- Image collection success rate

### Debug Commands
```sql
-- Check recent sync status
SELECT supplier, status, created_at, processed_at
FROM crawl_jobs
WHERE created_at > NOW() - INTERVAL '24 hours'
ORDER BY created_at DESC;

-- Find products with missing images
SELECT sku, name, image_url
FROM products
WHERE supplier = 'ALKOR' AND (image_url IS NULL OR image_url = '');

-- Check import logs for errors
SELECT operation, status, error_message, created_at
FROM import_logs
WHERE supplier = 'ALKOR' AND status = 'failed'
ORDER BY created_at DESC
LIMIT 10;
```

## Testing Strategy

### Unit Tests
- Scraper functions with mocked HTML
- Data transformation logic
- Error handling scenarios

### Integration Tests
- Full sync pipeline end-to-end
- Database state validation
- API endpoint testing

### E2E Tests
- Admin UI sync triggers
- Product catalog updates
- Image display validation