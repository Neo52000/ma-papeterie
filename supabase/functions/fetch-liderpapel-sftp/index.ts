import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
};

// ─── Comlandi JSON structure types ───

interface ComlandiCatalogProduct {
  id: string;
  ownReference?: string;
  References?: {
    Reference?: Array<{ refCode?: string; value?: string; RefCode?: string; Value?: string }>;
  };
  Classifications?: {
    Classification?: Array<{
      level?: string; Level?: string;
      code?: string; Code?: string;
      name?: string; Name?: string;
    }>;
  };
  AdditionalInfo?: Record<string, any>;
  Validity?: string | number;
  Status?: string;
  CustomsCode?: string;
  CountryOfOrigin?: string;
  Weight?: string | number;
  UMV?: string | number;
  UVE?: string | number;
  Heavy?: boolean;
  DeliveredDays?: string | number;
}

interface ComlandiPriceProduct {
  id: string;
  ownReference?: string;
  Prices?: {
    Price?: Array<{
      priceType?: string;
      startDate?: string;
      endDate?: string;
      currency?: string;
      PriceLines?: {
        applied?: string;
        PriceLine?: Array<{
          PriceExcTax?: number | string;
          MinQuantity?: number | string;
          Supplements?: {
            Supplement?: Array<{
              suppCode?: string;
              country?: string;
              suppType?: string;
              mode?: string;
              value?: number | string;
            }>;
          };
        }>;
      };
      AddTaxes?: {
        AddTax?: Array<{
          taxCode?: string;
          country?: string;
          taxType?: string;
          mode?: string;
          value?: number | string;
        }>;
      };
    }>;
  };
  VATRates?: {
    VATRate?: Array<{ country?: string; value?: number | string; }> | { country?: string; value?: number | string; };
  };
}

interface ComlandiStockProduct {
  id: string;
  ownReference?: string;
  Stock?: {
    stockDate?: string;
    AvailableQuantity?: number | string;
    ExpectedDate?: string;
    ExpectedQuantity?: number | string;
  };
}

// ─── Parsers for Comlandi JSON structures ───

function parseCatalogJson(json: any): Map<string, Record<string, string>> {
  const map = new Map<string, Record<string, string>>();
  
  // Navigate: root > Products > Product[]
  const products = extractProductList(json, 'Products');
  
  for (const p of products) {
    const id = String(p.id || '');
    if (!id) continue;

    // Extract EAN from References
    let ean = '';
    let manufacturerRef = '';
    const refs = p.References?.Reference || [];
    const refList = Array.isArray(refs) ? refs : [refs];
    for (const ref of refList) {
      const code = ref.refCode || ref.RefCode || '';
      const val = ref.value || ref.Value || String(ref) || '';
      if (code === 'EAN_UMV' || code === 'EAN_UNITARIO' || code === 'EAN_UNIDAD') {
        if (!ean) ean = val;
      }
      if (code === 'FABRICANTE_GENERICO') {
        manufacturerRef = val;
      }
    }

    // Extract family/subfamily from Classifications
    let family = '';
    let subfamily = '';
    const classifs = p.Classifications?.Classification || [];
    const classifList = Array.isArray(classifs) ? classifs : [classifs];
    for (const c of classifList) {
      const level = c.level || c.Level || '';
      const name = c.name || c.Name || '';
      if (level === '1' || level === 'family' || level === 'Family') family = name;
      if (level === '2' || level === 'subfamily' || level === 'SubFamily') subfamily = name;
    }

    // Extract brand from AdditionalInfo
    const addInfo = p.AdditionalInfo || {};
    const brand = addInfo.Brand || addInfo.brand || addInfo.Marca || '';

    map.set(id, {
      reference: id,
      description: addInfo.Description || addInfo.description || '',
      family,
      subfamily,
      ean,
      brand: String(brand),
      weight_kg: String(p.Weight || addInfo.Weight || ''),
      dimensions: '',
      country_origin: String(p.CountryOfOrigin || addInfo.CountryOfOrigin || ''),
      customs_code: String(p.CustomsCode || addInfo.CustomsCode || ''),
      is_active: String(p.Validity ?? '1') === '0' ? '0' : '1',
      manufacturer_ref: manufacturerRef,
    });
  }
  return map;
}

function parsePricesJson(json: any): Map<string, Record<string, string>> {
  const map = new Map<string, Record<string, string>>();
  
  const products = extractProductList(json, 'Products');
  
  for (const p of products) {
    const id = String(p.id || '');
    if (!id) continue;

    let costPrice = '';
    let suggestedPrice = '';
    let tvaRate = '';
    const taxes: Record<string, string> = {};

    // Parse Prices
    const pricesContainer = Array.isArray(p.Prices) ? p.Prices[0] : p.Prices;
    const prices = pricesContainer?.Price || [];
    const priceList = Array.isArray(prices) ? prices : [prices];
    
    for (const price of priceList) {
      const priceType = price.priceType || '';
      const lines = price.PriceLines?.PriceLine || [];
      const lineList = Array.isArray(lines) ? lines : [lines];
      
      // Get the base price (MinQuantity=1 or first line)
      let basePrice = '';
      for (const line of lineList) {
        const minQty = Number(line.MinQuantity || 0);
        const priceVal = String(line.PriceExcTax || '');
        if (minQty <= 1 || !basePrice) {
          basePrice = priceVal;
        }
      }

      if (priceType === 'purchase') {
        costPrice = basePrice;
        
        // Extract AddTaxes (COP, D3E, MOB, SCM, SOD)
        const addTaxes = price.AddTaxes?.AddTax || [];
        const taxList = Array.isArray(addTaxes) ? addTaxes : [addTaxes];
        for (const tax of taxList) {
          const code = (tax.taxCode || '').toUpperCase();
          const val = String(tax.value ?? tax);
          if (code.includes('COP')) taxes.taxe_cop = val;
          if (code.includes('D3E')) taxes.taxe_d3e = val;
          if (code.includes('MOB')) taxes.taxe_mob = val;
          if (code.includes('SCM')) taxes.taxe_scm = val;
          if (code.includes('SOD')) taxes.taxe_sod = val;
        }
      } else if (priceType === 'suggestedCI' || priceType === 'suggested') {
        if (!suggestedPrice) suggestedPrice = basePrice;
      } else if (priceType === 'suggestedSco' || priceType === 'suggestedPVC') {
        if (!suggestedPrice) suggestedPrice = basePrice;
      }
    }

    // Parse VATRates
    const vatRates = p.VATRates?.VATRate || [];
    const vatList = Array.isArray(vatRates) ? vatRates : [vatRates];
    for (const vat of vatList) {
      const country = vat.country || '';
      if (country === 'FR' || !tvaRate) {
        tvaRate = String(vat.Value ?? vat.value ?? vat);
      }
    }

    map.set(id, {
      reference: id,
      cost_price: costPrice,
      suggested_price: suggestedPrice,
      tva_rate: tvaRate,
      ...taxes,
    });
  }
  return map;
}

function parseStocksJson(json: any): Map<string, Record<string, string>> {
  const map = new Map<string, Record<string, string>>();
  
  // Navigate: root > Storage > Stocks[] > Products > Product[]
  const storage = json?.Storage || json?.storage || json;
  const stocksArr = storage?.Stocks || storage?.stocks || [];
  const stocksList = Array.isArray(stocksArr) ? stocksArr : [stocksArr];
  
  for (const stocks of stocksList) {
    const products = stocks?.Products?.Product || stocks?.products?.Product || [];
    const productList = Array.isArray(products) ? products : [products];
    
    for (const p of productList) {
      const id = String(p.id || '');
      if (!id) continue;
      
      const stock = p.Stock || p.stock || {};
      const qty = String(stock.AvailableQuantity ?? stock.availableQuantity ?? '0');
      
      map.set(id, {
        reference: id,
        stock_quantity: qty,
      });
    }
  }
  return map;
}

function extractProductList(json: any, containerKey: string): any[] {
  // Try multiple paths: root.Products.Product, Products.Product, direct array
  const root = json?.root || json;
  const container = root?.[containerKey] || root?.[containerKey.toLowerCase()] || root;
  const products = container?.Product || container?.product || [];
  return Array.isArray(products) ? products : products ? [products] : [];
}

// ─── Auxiliary JSON parsers ───

function parseCategoriesJson(json: any): Array<{ code: string; name: string; level: string; parentCode?: string; parentSlug?: string }> {
  const root = json?.root || json;
  const container = root?.Categories || root?.categories || root;
  const cats = container?.Category || container?.category || [];
  const catList = Array.isArray(cats) ? cats : [cats];
  
  return catList.map((c: any) => {
    const texts = c.Texts || c.texts || [];
    const textList = Array.isArray(texts) ? texts : [texts];
    const frText = textList.find((t: any) => (t.lang || '').startsWith('fr')) || textList[0] || {};
    return {
      code: String(c.code || ''),
      name: frText.value || frText.Value || '',
      level: String(c.level || '1'),
      parentCode: c.parentCode || undefined,
    };
  }).filter((c: any) => c.code);
}

function parseDeliveryOrdersJson(json: any): any[] {
  const root = json?.root || json;
  const container = root?.DeliveryOrders || root?.deliveryOrders || root;
  const orders = container?.DeliveryOrder || container?.deliveryOrder || [];
  const orderList = Array.isArray(orders) ? orders : [orders];
  
  return orderList.map((o: any) => {
    const lines = o.Lines?.Line || [];
    const lineList = Array.isArray(lines) ? lines : [lines];
    return {
      code: o.deliveryOrderCode || '',
      date: o.Date || '',
      orderCode: o.Order?.Code || '',
      ownCode: o.Order?.OwnCode || '',
      agent: o.Agent || '',
      transport: o.Transport?.TransportName || '',
      packages: o.Packages || '',
      subtotal: parseFloat(o.Subtotal || '0'),
      taxes: parseFloat(o.Taxes || '0'),
      total: parseFloat(o.Total || '0'),
      lines_count: lineList.length,
      lines: lineList.slice(0, 100).map((l: any) => ({
        reference: l.Product?.Reference || '',
        description: l.Product?.Description || '',
        quantity: l.Quantity || '',
        price: l.Price || '',
        amount: l.Amount || '',
      })),
    };
  });
}

function parseMyAccountJson(json: any): any {
  const root = json?.root || json;
  const account = root?.MyAccount || root?.myAccount || root;
  const addresses = account?.MyAddresses?.Addr || [];
  const addrList = Array.isArray(addresses) ? addresses : [addresses];
  
  return {
    code: account?.Code || '',
    name: account?.Name || '',
    date: account?.date || '',
    addresses: addrList.map((a: any) => ({
      addressee: a.Addressee || '',
      phone: a.Phone || '',
      address: a.Address || '',
      zipCode: a.ZipCode || '',
      location: a.Location || '',
      province: a.Province || '',
      country: a.Country || '',
    })),
  };
}

// ─── Legacy CSV parsers (kept for backward compatibility) ───

function parseCsvLines(text: string, separator = ';'): Record<string, string>[] {
  const lines = text.split(/\r?\n/).filter(l => l.trim());
  if (lines.length < 2) return [];
  const headerLine = lines[0].replace(/^\uFEFF/, '');
  const headers = headerLine.split(separator).map(h => h.trim().toLowerCase());
  return lines.slice(1).map(line => {
    const vals = line.split(separator);
    const obj: Record<string, string> = {};
    headers.forEach((h, idx) => {
      obj[h] = (vals[idx] || '').trim();
    });
    return obj;
  });
}

function normalizeKey(key: string): string {
  return key.normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/\s+/g, '_').toLowerCase();
}

function mapCsvCatalogRow(raw: Record<string, string>): Record<string, string> {
  const n: Record<string, string> = {};
  for (const [k, v] of Object.entries(raw)) n[normalizeKey(k)] = v;
  return {
    reference: n.reference || n.ref || n.code || '',
    description: n.description || n.designation || n.libelle || '',
    family: n.family || n.famille || n.categorie || '',
    subfamily: n.subfamily || n.sous_famille || n.sous_categorie || '',
    ean: n.ean || n.ean13 || n.code_barre || '',
    brand: n.brand || n.marque || '',
    weight_kg: n.weight_kg || n.poids || n.poids_kg || '',
    dimensions: n.dimensions || n.dim || '',
    country_origin: n.country_origin || n.pays_origine || n.pays || '',
    customs_code: n.customs_code || n.code_douane || '',
    is_active: n.is_active || n.actif || '1',
  };
}

function mapCsvPriceRow(raw: Record<string, string>): Record<string, string> {
  const n: Record<string, string> = {};
  for (const [k, v] of Object.entries(raw)) n[normalizeKey(k)] = v;
  return {
    reference: n.reference || n.ref || n.code || '',
    cost_price: n.cost_price || n.prix_achat || n.prix_achat_ht || n.prix || '',
    suggested_price: n.suggested_price || n.prix_conseille || n.pvp || n.pvp_conseille || n.prix_ttc_conseille || '',
    tva_rate: n.tva_rate || n.tva || n.taux_tva || '',
    taxe_cop: n.taxe_cop || n.cop || '',
    taxe_d3e: n.taxe_d3e || n.d3e || '',
    taxe_mob: n.taxe_mob || n.mob || '',
    taxe_scm: n.taxe_scm || n.scm || '',
    taxe_sod: n.taxe_sod || n.sod || '',
  };
}

function mapCsvStockRow(raw: Record<string, string>): Record<string, string> {
  const n: Record<string, string> = {};
  for (const [k, v] of Object.entries(raw)) n[normalizeKey(k)] = v;
  return {
    reference: n.reference || n.ref || n.code || '',
    stock_quantity: n.stock_quantity || n.quantite || n.qty || n.stock || '',
  };
}

// ─── Main handler ───

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    );

    const body = await req.json().catch(() => ({}));

    // ─── Handle enrichment JSON files (Descriptions, MultimediaLinks, RelationedProducts) ───
    if (body.descriptions_json || body.multimedia_json || body.relations_json) {
      const enrichResults: Record<string, any> = {};

      // Batch helper: resolve all Comlandi refs to product UUIDs in 2 queries max
      async function batchFindProductIds(refs: string[]): Promise<Map<string, string>> {
        const map = new Map<string, string>();
        if (refs.length === 0) return map;
        // 1. Bulk lookup via supplier_products
        const { data: spRows } = await supabase
          .from('supplier_products')
          .select('supplier_reference, product_id')
          .in('supplier_reference', refs);
        if (spRows) {
          for (const r of spRows) {
            if (r.supplier_reference && r.product_id) map.set(r.supplier_reference, r.product_id);
          }
        }
        // 2. For unmatched, try EAN lookup
        const unmatched = refs.filter(r => !map.has(r) && r.length >= 8);
        if (unmatched.length > 0) {
          const { data: prodRows } = await supabase
            .from('products')
            .select('id, ean')
            .in('ean', unmatched);
          if (prodRows) {
            for (const r of prodRows) {
              if (r.ean && !map.has(r.ean)) map.set(r.ean, r.id);
            }
          }
        }
        return map;
      }

      // Mode Descriptions
      if (body.descriptions_json) {
        const descData = typeof body.descriptions_json === 'string' ? JSON.parse(body.descriptions_json) : body.descriptions_json;
        const products = extractProductList(descData, 'Products');
        const allRefs = products.map((p: any) => String(p.id || '')).filter(Boolean);
        const refMap = await batchFindProductIds(allRefs);
        let updated = 0, skipped = 0, errors = 0;
        const upsertRows: any[] = [];

        for (const p of products) {
          const refId = String(p.id || '');
          const productId = refMap.get(refId);
          if (!productId) { skipped++; continue; }

          const descs = p.Descriptions?.Description || p.descriptions?.Description || [];
          const descList = Array.isArray(descs) ? descs : [descs];
          let metaTitle = '', descCourte = '', descLongue = '', metaDesc = '';

          for (const desc of descList) {
            const code = desc.DescCode || desc.descCode || '';
            const texts = desc.Texts?.Text || desc.texts?.Text || [];
            const textList = Array.isArray(texts) ? texts : [texts];
            const frText = textList.find((t: any) => (t.lang || t.Lang || '').startsWith('fr'));
            const value = frText?.value || frText?.Value || frText?.['#text'] || (typeof frText === 'string' ? frText : '');
            if (!value) continue;
            if (code === 'INT_VTE') metaTitle = value;
            else if (code === 'MINI_DESC') descCourte = value;
            else if (code === 'TXT_RCOM') descLongue = value;
            else if (code === 'ABRV_DEC') metaDesc = value;
            else if (code === 'AMPL_DESC' && !descLongue) descLongue = value;
          }

          if (!metaTitle && !descCourte && !descLongue && !metaDesc) { skipped++; continue; }
          const seoData: Record<string, any> = { product_id: productId, status: 'imported' };
          if (metaTitle) seoData.meta_title = metaTitle;
          if (descCourte) seoData.description_courte = descCourte;
          if (descLongue) seoData.description_longue = descLongue;
          if (metaDesc) seoData.meta_description = metaDesc;
          upsertRows.push(seoData);
        }

        // Bulk upsert in chunks of 200
        for (let i = 0; i < upsertRows.length; i += 200) {
          const chunk = upsertRows.slice(i, i + 200);
          const { error } = await supabase.from('product_seo').upsert(chunk, { onConflict: 'product_id' });
          if (error) errors += chunk.length; else updated += chunk.length;
        }
        enrichResults.descriptions = { total: products.length, updated, skipped, errors };
      }

      // Mode MultimediaLinks
      if (body.multimedia_json) {
        const mmData = typeof body.multimedia_json === 'string' ? JSON.parse(body.multimedia_json) : body.multimedia_json;
        const products = extractProductList(mmData, 'Products');
        const allRefs = products.map((p: any) => String(p.id || '')).filter(Boolean);
        const refMap = await batchFindProductIds(allRefs);
        let created = 0, skipped = 0, errors = 0;
        const upsertRows: any[] = [];

        for (const p of products) {
          const refId = String(p.id || '');
          const productId = refMap.get(refId);
          if (!productId) { skipped++; continue; }

          const links = p.MultimediaLinks?.MultimediaLink || p.multimediaLinks?.MultimediaLink || [];
          const linkList = Array.isArray(links) ? links : [links];
          let isFirst = true;
          for (const link of linkList) {
            const mmlType = (link.mmlType || link.MmlType || '').toUpperCase();
            const active = link.Active !== false && link.active !== false && link.Active !== 'false';
            if (mmlType !== 'IMG' || !active) continue;
            const url = link.Url || link.url || '';
            if (!url) continue;
            upsertRows.push({
              product_id: productId,
              url_originale: url,
              alt_seo: link.Name || link.name || null,
              source: 'liderpapel',
              is_principal: isFirst,
            });
            isFirst = false;
          }
          if (isFirst) skipped++;
        }

        for (let i = 0; i < upsertRows.length; i += 200) {
          const chunk = upsertRows.slice(i, i + 200);
          const { error } = await supabase.from('product_images').insert(chunk);
          if (error) errors += chunk.length; else created += chunk.length;
        }
        enrichResults.multimedia = { total: products.length, created, skipped, errors };
      }

      // Mode RelationedProducts
      if (body.relations_json) {
        const relData = typeof body.relations_json === 'string' ? JSON.parse(body.relations_json) : body.relations_json;
        const products = extractProductList(relData, 'Products');
        let created = 0, skipped = 0, errors = 0;
        const insertRows: any[] = [];

        for (const p of products) {
          const refId = String(p.id || '');
          if (!refId) { skipped++; continue; }
          const rels = p.RelationedProducts?.RelationedProduct || p.relationedProducts?.RelationedProduct || [];
          const relList = Array.isArray(rels) ? rels : [rels];
          for (const rel of relList) {
            const relatedId = String(rel.id || rel.Id || '');
            const relType = rel.type || rel.Type || rel.relationType || 'alternative';
            if (!relatedId) continue;
            insertRows.push({ product_id: refId, related_product_id: relatedId, relation_type: relType });
          }
          if (relList.length === 0) skipped++;
        }

        for (let i = 0; i < insertRows.length; i += 200) {
          const chunk = insertRows.slice(i, i + 200);
          const { error } = await supabase.from('product_relations').insert(chunk);
          if (error) errors += chunk.length; else created += chunk.length;
        }
        enrichResults.relations = { total: products.length, created, skipped, errors };
      }

      return new Response(JSON.stringify(enrichResults), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // ─── Handle auxiliary JSON files (Categories, DeliveryOrders, MyAccount) ───
    if (body.categories_json || body.delivery_orders_json || body.my_account_json) {
      const results: Record<string, any> = {};

      // Categories: store in categories table
      if (body.categories_json) {
        const catData = typeof body.categories_json === 'string' ? JSON.parse(body.categories_json) : body.categories_json;
        const categories = parseCategoriesJson(catData);
        let catCreated = 0, catUpdated = 0;
        for (const cat of categories) {
          const { error } = await supabase.from('categories').upsert({
            slug: `liderpapel-${cat.code}`,
            name: cat.name,
            level: cat.level === '1' ? 'category' : 'subcategory',
            parent_id: cat.parentSlug ? undefined : null,
            description: `Catégorie Liderpapel ${cat.code}`,
            is_active: true,
            sort_order: parseInt(cat.code) || 0,
          }, { onConflict: 'slug' });
          if (!error) {
            catCreated++;
          } else {
            catUpdated++;
          }
        }
        // Link parent categories
        for (const cat of categories) {
          if (cat.parentCode) {
            const parentSlug = `liderpapel-${cat.parentCode}`;
            const { data: parent } = await supabase.from('categories').select('id').eq('slug', parentSlug).single();
            if (parent) {
              await supabase.from('categories').update({ parent_id: parent.id }).eq('slug', `liderpapel-${cat.code}`);
            }
          }
        }
        results.categories = { total: categories.length, created: catCreated, errors: catUpdated };
      }

      // DeliveryOrders: store summary for reference
      if (body.delivery_orders_json) {
        const doData = typeof body.delivery_orders_json === 'string' ? JSON.parse(body.delivery_orders_json) : body.delivery_orders_json;
        const orders = parseDeliveryOrdersJson(doData);
        results.delivery_orders = { total: orders.length, orders: orders.slice(0, 20) };
      }

      // MyAccount: return parsed info
      if (body.my_account_json) {
        const accData = typeof body.my_account_json === 'string' ? JSON.parse(body.my_account_json) : body.my_account_json;
        const account = parseMyAccountJson(accData);
        results.my_account = account;
      }

      return new Response(JSON.stringify(results), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Detect format: JSON or CSV
    const hasJson = body.catalog_json || body.prices_json || body.stocks_json;
    const hasCsv = body.catalog_csv || body.prices_csv || body.stock_csv;

    if (!hasJson && !hasCsv) {
      return new Response(JSON.stringify({
        error: "Veuillez fournir au moins un fichier JSON (catalog_json, prices_json, stocks_json) ou CSV (catalog_csv, prices_csv, stock_csv).",
      }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    let catalogMap: Map<string, Record<string, string>>;
    let priceMap: Map<string, Record<string, string>>;
    let stockMap: Map<string, Record<string, string>>;

    if (hasJson) {
      // Parse Comlandi JSON format
      const catalogData = body.catalog_json ? (typeof body.catalog_json === 'string' ? JSON.parse(body.catalog_json) : body.catalog_json) : null;
      const pricesData = body.prices_json ? (typeof body.prices_json === 'string' ? JSON.parse(body.prices_json) : body.prices_json) : null;
      const stocksData = body.stocks_json ? (typeof body.stocks_json === 'string' ? JSON.parse(body.stocks_json) : body.stocks_json) : null;

      catalogMap = catalogData ? parseCatalogJson(catalogData) : new Map();
      priceMap = pricesData ? parsePricesJson(pricesData) : new Map();
      stockMap = stocksData ? parseStocksJson(stocksData) : new Map();
    } else {
      // Legacy CSV parsing
      const catalogRows = body.catalog_csv ? parseCsvLines(body.catalog_csv, ';') : [];
      const priceRows = body.prices_csv ? parseCsvLines(body.prices_csv, ';') : [];
      const stockRows = body.stock_csv ? parseCsvLines(body.stock_csv, ';') : [];

      catalogMap = new Map();
      for (const raw of catalogRows) {
        const mapped = mapCsvCatalogRow(raw);
        if (mapped.reference) catalogMap.set(mapped.reference, mapped);
      }
      priceMap = new Map();
      for (const raw of priceRows) {
        const mapped = mapCsvPriceRow(raw);
        if (mapped.reference) priceMap.set(mapped.reference, mapped);
      }
      stockMap = new Map();
      for (const raw of stockRows) {
        const mapped = mapCsvStockRow(raw);
        if (mapped.reference) stockMap.set(mapped.reference, mapped);
      }
    }

    // Merge all references
    const allRefs = new Set<string>([...catalogMap.keys(), ...priceMap.keys()]);

    const mergedRows: any[] = [];
    for (const ref of allRefs) {
      const cat = catalogMap.get(ref) || {};
      const price = priceMap.get(ref) || {};
      const stock = stockMap.get(ref);

      mergedRows.push({
        reference: ref,
        description: cat.description || '',
        family: cat.family || '',
        subfamily: cat.subfamily || '',
        ean: cat.ean || '',
        brand: cat.brand || '',
        weight_kg: cat.weight_kg || '',
        dimensions: cat.dimensions || '',
        country_origin: cat.country_origin || '',
        customs_code: cat.customs_code || '',
        is_active: cat.is_active || '1',
        cost_price: price.cost_price || '',
        suggested_price: price.suggested_price || '',
        tva_rate: price.tva_rate || '',
        taxe_cop: price.taxe_cop || '',
        taxe_d3e: price.taxe_d3e || '',
        taxe_mob: price.taxe_mob || '',
        taxe_scm: price.taxe_scm || '',
        taxe_sod: price.taxe_sod || '',
        stock_quantity: stock?.stock_quantity || '',
      });
    }

    // Send to import-comlandi in batches
    const functionUrl = `${Deno.env.get('SUPABASE_URL')}/functions/v1/import-comlandi`;
    const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const BATCH = 500;
    const totals = { created: 0, updated: 0, skipped: 0, errors: 0, details: [] as string[], price_changes: [] as any[] };

    for (let i = 0; i < mergedRows.length; i += BATCH) {
      const batch = mergedRows.slice(i, i + BATCH);
      const resp = await fetch(functionUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${serviceKey}`,
        },
        body: JSON.stringify({ source: 'liderpapel', rows: batch }),
      });

      if (!resp.ok) {
        const err = await resp.text();
        totals.errors += batch.length;
        totals.details.push(`Batch error: ${err}`);
        continue;
      }

      const data = await resp.json();
      totals.created += data.created || 0;
      totals.updated += data.updated || 0;
      totals.skipped += data.skipped || 0;
      totals.errors += data.errors || 0;
      totals.details.push(...(data.details || []));
      totals.price_changes.push(...(data.price_changes || []));
    }

    return new Response(JSON.stringify({
      ...totals,
      format: hasJson ? 'json' : 'csv',
      catalog_count: catalogMap.size,
      prices_count: priceMap.size,
      stock_count: stockMap.size,
      merged_total: mergedRows.length,
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error: any) {
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
