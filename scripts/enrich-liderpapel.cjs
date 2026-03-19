#!/usr/bin/env node
const { createClient } = require('@supabase/supabase-js');
const XLSX = require('xlsx');
const path = require('path');

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

const LIDERPAPEL_SUPPLIER_ID = '450c421b-c5d4-4357-997d-e0b7931b5de8';

async function main() {
  console.log('=== Enrich & Match Liderpapel Products ===');

  // Load tarifs XLS from argument or default path
  const xlsPath = process.argv[2] || 'data/TarifsB2B.xls';
  console.log(`Loading ${xlsPath}...`);
  const wb = XLSX.readFile(xlsPath);
  const ws = wb.Sheets[wb.SheetNames[0]];
  const rows = XLSX.utils.sheet_to_json(ws, { header: 1, defval: '' });
  
  // Skip header rows (row 0 = merged header, row 1 = column names)
  const headers = rows[1];
  const data = rows.slice(2).filter(r => r[0] && String(r[0]).trim() !== '');
  console.log(`Loaded ${data.length} products from XLS`);

  // Build lookup map: code → { ean, ref_fabricant, description, marque, prix, ... }
  const tarifMap = new Map();
  for (const r of data) {
    const code = String(r[0]).trim();
    const ean = String(r[21] || '').trim();
    const refFab = String(r[1] || '').trim();
    tarifMap.set(code, {
      code,
      ref_fabricant: refFab && refFab !== 'N/D' ? refFab : null,
      ean: ean && ean !== 'N/D' && ean.length >= 8 ? ean : null,
      description: String(r[4] || '').trim().substring(0, 500),
      desc_breve: String(r[28] || '').trim().substring(0, 200),
      marque: (String(r[30] || '').trim() || null),
      prix_achat: parseFloat(r[5]) || null,
      pvp_conseille: parseFloat(r[7]) || null,
      categorie: String(r[2] || '').trim(),
      sous_categorie: String(r[3] || '').trim(),
    });
  }
  console.log(`Tarif map: ${tarifMap.size} entries, ${[...tarifMap.values()].filter(t => t.ean).length} with EAN`);

  // ─── STEP 1: Enrich existing Liderpapel products ───
  console.log('\n--- Step 1: Enrich Liderpapel products ---');
  
  // Get all Liderpapel supplier_products
  const { data: spRows, error: spErr } = await supabase
    .from('supplier_products')
    .select('id, product_id, supplier_reference')
    .eq('supplier_id', LIDERPAPEL_SUPPLIER_ID);
  
  if (spErr) { console.error('Error fetching supplier_products:', spErr); return; }
  console.log(`Found ${spRows.length} Liderpapel supplier_products`);

  let enriched = 0, skipped = 0;
  const BATCH = 50;
  
  for (let i = 0; i < spRows.length; i += BATCH) {
    const batch = spRows.slice(i, i + BATCH);
    const updates = [];
    
    for (const sp of batch) {
      const tarif = tarifMap.get(sp.supplier_reference);
      if (!tarif) continue;
      
      const update = { updated_at: new Date().toISOString() };
      if (tarif.ean) update.ean = tarif.ean;
      if (tarif.ref_fabricant) update.manufacturer_ref = tarif.ref_fabricant;
      if (tarif.marque) update.brand = tarif.marque;
      if (tarif.description) update.name = tarif.description;
      if (tarif.categorie) update.family = tarif.categorie;
      if (tarif.sous_categorie) update.subfamily = tarif.sous_categorie;
      
      updates.push({ product_id: sp.product_id, update });
    }
    
    for (const { product_id, update } of updates) {
      const { error } = await supabase.from('products').update(update).eq('id', product_id);
      if (!error) enriched++;
      else skipped++;
    }
    
    if ((i / BATCH) % 20 === 0) {
      console.log(`  Progress: ${i}/${spRows.length} (${enriched} enriched, ${skipped} skipped)`);
    }
  }
  console.log(`Step 1 done: ${enriched} enriched, ${skipped} skipped`);

  // ─── STEP 2: Cross-match by EAN — merge duplicates ───
  console.log('\n--- Step 2: Cross-match by EAN ---');
  
  // Find Liderpapel products that now have an EAN
  const { data: lidWithEan } = await supabase
    .from('products')
    .select('id, ean')
    .in('id', spRows.map(sp => sp.product_id))
    .not('ean', 'is', null)
    .neq('ean', '');
  
  console.log(`Liderpapel products with EAN: ${lidWithEan?.length || 0}`);
  
  let merged = 0, newLinks = 0;
  
  for (const lidProduct of (lidWithEan || [])) {
    // Find if another product (non-Liderpapel) has the same EAN
    const { data: matches } = await supabase
      .from('products')
      .select('id, name')
      .eq('ean', lidProduct.ean)
      .neq('id', lidProduct.id)
      .limit(1);
    
    if (!matches || matches.length === 0) continue;
    
    const masterProduct = matches[0];
    
    // Get the Liderpapel supplier_product for this product
    const { data: lidSp } = await supabase
      .from('supplier_products')
      .select('*')
      .eq('product_id', lidProduct.id)
      .eq('supplier_id', LIDERPAPEL_SUPPLIER_ID)
      .limit(1);
    
    if (!lidSp || lidSp.length === 0) continue;
    
    // Check if master product already has a Liderpapel supplier_product
    const { data: existingLink } = await supabase
      .from('supplier_products')
      .select('id')
      .eq('product_id', masterProduct.id)
      .eq('supplier_id', LIDERPAPEL_SUPPLIER_ID)
      .limit(1);
    
    if (existingLink && existingLink.length > 0) continue; // Already linked
    
    // Move the supplier_product to point to the master product
    const { error: moveErr } = await supabase
      .from('supplier_products')
      .update({ product_id: masterProduct.id })
      .eq('id', lidSp[0].id);
    
    if (!moveErr) {
      merged++;
      if (merged <= 5) {
        console.log(`  Merged: "${lidProduct.ean}" → master "${masterProduct.name}" (${masterProduct.id})`);
      }
    }
  }
  console.log(`Step 2 done: ${merged} supplier_products moved to master products`);

  // ─── STEP 3: Summary ───
  console.log('\n--- Summary ---');
  const { count: totalLid } = await supabase
    .from('supplier_products')
    .select('*', { count: 'exact', head: true })
    .eq('supplier_id', LIDERPAPEL_SUPPLIER_ID);
  
  const { count: withEan } = await supabase
    .from('products')
    .select('*', { count: 'exact', head: true })
    .not('ean', 'is', null)
    .neq('ean', '')
    .in('id', spRows.map(sp => sp.product_id));
  
  console.log(`Total Liderpapel supplier_products: ${totalLid}`);
  console.log(`Products enriched with EAN: ${enriched}`);
  console.log(`Duplicates merged: ${merged}`);
  console.log('=== Done ===');
}

main().catch(console.error);
