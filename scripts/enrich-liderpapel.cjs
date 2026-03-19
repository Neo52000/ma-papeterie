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
  
  // Get ALL Liderpapel supplier_products (paginated — Supabase max 1000 per query)
  let spRows = [];
  let page = 0;
  const PAGE_SIZE = 1000;
  while (true) {
    const { data, error } = await supabase
      .from('supplier_products')
      .select('id, product_id, supplier_reference')
      .eq('supplier_id', LIDERPAPEL_SUPPLIER_ID)
      .range(page * PAGE_SIZE, (page + 1) * PAGE_SIZE - 1);
    if (error) { console.error('Error fetching supplier_products:', error); return; }
    spRows.push(...data);
    if (data.length < PAGE_SIZE) break;
    page++;
  }
  console.log(`Found ${spRows.length} Liderpapel supplier_products (${page + 1} pages)`);

  // Build all updates first, then execute in parallel
  const allUpdates = [];
  for (const sp of spRows) {
    const tarif = tarifMap.get(sp.supplier_reference);
    if (!tarif) continue;
    const update = { updated_at: new Date().toISOString() };
    if (tarif.ean) update.ean = tarif.ean;
    if (tarif.ref_fabricant) update.manufacturer_ref = tarif.ref_fabricant;
    if (tarif.marque) update.brand = tarif.marque;
    if (tarif.description) update.name = tarif.description;
    if (tarif.categorie) update.family = tarif.categorie;
    if (tarif.sous_categorie) update.subfamily = tarif.sous_categorie;
    allUpdates.push({ product_id: sp.product_id, update });
  }
  console.log(`Updates to apply: ${allUpdates.length} (${spRows.length - allUpdates.length} refs not in XLS)`);

  let enriched = 0, skipped = 0;
  const CONCURRENT = 20; // parallel requests
  for (let i = 0; i < allUpdates.length; i += CONCURRENT) {
    const batch = allUpdates.slice(i, i + CONCURRENT);
    const results = await Promise.allSettled(
      batch.map(({ product_id, update }) =>
        supabase.from('products').update(update).eq('id', product_id)
      )
    );
    for (const r of results) {
      if (r.status === 'fulfilled' && !r.value.error) enriched++;
      else skipped++;
    }
    if (i % 2000 === 0) {
      console.log(`  Progress: ${i}/${allUpdates.length} (${enriched} enriched, ${skipped} skipped)`);
    }
  }
  console.log(`Step 1 done: ${enriched} enriched, ${skipped} skipped`);

  // ─── STEP 2: Cross-match by EAN — merge duplicates ───
  console.log('\n--- Step 2: Cross-match by EAN ---');

  // Use the tarifMap to get EANs directly (no need to query 60K products)
  // For each Liderpapel supplier_product with an EAN in tarifMap,
  // check if another product (non-Liderpapel) has the same EAN
  const spWithEan = spRows.filter(sp => {
    const tarif = tarifMap.get(sp.supplier_reference);
    return tarif && tarif.ean;
  });
  console.log(`Liderpapel refs with EAN from XLS: ${spWithEan.length}`);

  let merged = 0, alreadyLinked = 0, noMatch = 0;
  const MERGE_CONCURRENT = 10;

  for (let i = 0; i < spWithEan.length; i += MERGE_CONCURRENT) {
    const chunk = spWithEan.slice(i, i + MERGE_CONCURRENT);
    await Promise.all(chunk.map(async (sp) => {
      const tarif = tarifMap.get(sp.supplier_reference);
      const ean = tarif.ean;

      const { data: matches } = await supabase
        .from('products').select('id, name').eq('ean', ean).neq('id', sp.product_id).limit(1);
      if (!matches || matches.length === 0) { noMatch++; return; }

      const master = matches[0];
      const { data: existing } = await supabase
        .from('supplier_products').select('id').eq('product_id', master.id).eq('supplier_id', LIDERPAPEL_SUPPLIER_ID).limit(1);
      if (existing && existing.length > 0) { alreadyLinked++; return; }

      const { error } = await supabase.from('supplier_products').update({ product_id: master.id }).eq('id', sp.id);
      if (!error) {
        merged++;
        if (merged <= 10) console.log(`  Merged: EAN ${ean} (ref ${sp.supplier_reference}) → "${master.name}"`);
      }
    }));

    if (i % 2000 === 0 && i > 0) {
      console.log(`  Progress: ${i}/${spWithEan.length} (${merged} merged, ${noMatch} no match, ${alreadyLinked} already linked)`);
    }
  }
  console.log(`Step 2 done: ${merged} merged, ${noMatch} no match, ${alreadyLinked} already linked`);

  // ─── STEP 3: Summary ───
  console.log('\n--- Summary ---');
  const { count: totalLid } = await supabase
    .from('supplier_products')
    .select('*', { count: 'exact', head: true })
    .eq('supplier_id', LIDERPAPEL_SUPPLIER_ID);
  
  console.log(`Total Liderpapel supplier_products: ${totalLid}`);
  console.log(`Products enriched (Step 1): ${enriched}`);
  console.log(`Duplicates merged (Step 2): ${merged}`);
  console.log(`No EAN match found: ${noMatch}`);
  console.log('=== Done ===');
}

main().catch(console.error);
