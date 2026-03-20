#!/usr/bin/env node
const { createClient } = require('@supabase/supabase-js');
const XLSX = require('xlsx');

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

const LIDERPAPEL_SUPPLIER_ID = '450c421b-c5d4-4357-997d-e0b7931b5de8';
const CONCURRENT = 20;

async function main() {
  console.log('=== Enrich & Match Liderpapel Products v3 ===\n');

  // ─── Load XLS ───
  const xlsPath = process.argv[2] || 'data/TarifsB2B.xls';
  console.log(`Loading ${xlsPath}...`);
  const wb = XLSX.readFile(xlsPath);
  const ws = wb.Sheets[wb.SheetNames[0]];
  const rows = XLSX.utils.sheet_to_json(ws, { header: 1, defval: '' });
  const data = rows.slice(2).filter(r => r[0] && String(r[0]).trim() !== '');

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
      marque: (() => { const m = String(r[30] || '').trim(); return m && m !== 'N/D' ? m : null; })(),
      prix_achat: parseFloat(r[5]) || null,
      pvp_conseille: parseFloat(r[7]) || null,
      categorie: String(r[2] || '').trim(),
      sous_categorie: String(r[3] || '').trim(),
    });
  }
  console.log(`Tarif map: ${tarifMap.size} entries, ${[...tarifMap.values()].filter(t => t.ean).length} with EAN`);

  // ─── Fetch ALL Liderpapel supplier_products (paginated) ───
  let spRows = [];
  let page = 0;
  while (true) {
    const { data, error } = await supabase
      .from('supplier_products')
      .select('id, product_id, supplier_reference')
      .eq('supplier_id', LIDERPAPEL_SUPPLIER_ID)
      .range(page * 1000, (page + 1) * 1000 - 1);
    if (error) { console.error('Error:', error); return; }
    spRows.push(...data);
    if (data.length < 1000) break;
    page++;
  }
  console.log(`Found ${spRows.length} Liderpapel supplier_products\n`);

  // ─── STEP 1: Enrich products (handle EAN uniqueness) ───
  console.log('--- Step 1: Enrich Liderpapel products ---');

  // Pre-load existing EANs to avoid unique constraint violations
  const existingEans = new Set();
  let eanPage = 0;
  while (true) {
    const { data } = await supabase
      .from('products').select('ean')
      .not('ean', 'is', null).neq('ean', '')
      .range(eanPage * 1000, (eanPage + 1) * 1000 - 1);
    if (!data || data.length === 0) break;
    data.forEach(p => existingEans.add(p.ean));
    eanPage++;
  }
  console.log(`Existing EANs in DB: ${existingEans.size}`);

  const allUpdates = [];
  for (const sp of spRows) {
    const tarif = tarifMap.get(sp.supplier_reference);
    if (!tarif) continue;

    const update = { updated_at: new Date().toISOString() };
    if (tarif.ean && !existingEans.has(tarif.ean)) {
      update.ean = tarif.ean;
      existingEans.add(tarif.ean);
    }
    if (tarif.ref_fabricant) update.manufacturer_ref = tarif.ref_fabricant;
    if (tarif.marque) update.brand = tarif.marque;
    if (tarif.description) update.name = tarif.description;
    if (tarif.categorie) update.family = tarif.categorie;
    if (tarif.sous_categorie) update.subfamily = tarif.sous_categorie;

    allUpdates.push({ product_id: sp.product_id, update, sp_id: sp.id, tarif });
  }
  console.log(`Updates to apply: ${allUpdates.length}`);

  let enriched = 0, skipped = 0;
  for (let i = 0; i < allUpdates.length; i += CONCURRENT) {
    const batch = allUpdates.slice(i, i + CONCURRENT);
    const results = await Promise.allSettled(batch.map(async ({ product_id, update, sp_id, tarif }) => {
      const { error: pErr } = await supabase.from('products').update(update).eq('id', product_id);
      if (tarif.prix_achat) {
        await supabase.from('supplier_products')
          .update({ supplier_price: tarif.prix_achat }).eq('id', sp_id);
      }
      return pErr;
    }));
    for (const r of results) {
      if (r.status === 'fulfilled' && !r.value) enriched++;
      else skipped++;
    }
    if (i % 2000 === 0) console.log(`  Progress: ${i}/${allUpdates.length} (${enriched} enriched, ${skipped} skipped)`);
  }
  console.log(`Step 1 done: ${enriched} enriched, ${skipped} skipped\n`);

  // ─── STEP 2: Cross-match by EAN → move supplier_products to master ───
  console.log('--- Step 2: Cross-match by EAN ---');

  const spWithEan = spRows.filter(sp => {
    const tarif = tarifMap.get(sp.supplier_reference);
    return tarif && tarif.ean;
  });
  console.log(`Liderpapel refs with EAN: ${spWithEan.length}`);

  let merged = 0, alreadyLinked = 0, noMatch = 0;

  for (let i = 0; i < spWithEan.length; i += CONCURRENT) {
    const chunk = spWithEan.slice(i, i + CONCURRENT);
    await Promise.all(chunk.map(async (sp) => {
      const ean = tarifMap.get(sp.supplier_reference).ean;
      const { data: matches } = await supabase
        .from('products').select('id, name').eq('ean', ean).neq('id', sp.product_id).limit(1);
      if (!matches || matches.length === 0) { noMatch++; return; }

      const master = matches[0];
      const { data: existing } = await supabase
        .from('supplier_products').select('id')
        .eq('product_id', master.id).eq('supplier_id', LIDERPAPEL_SUPPLIER_ID).limit(1);
      if (existing && existing.length > 0) { alreadyLinked++; return; }

      const { error } = await supabase.from('supplier_products')
        .update({ product_id: master.id }).eq('id', sp.id);
      if (!error) {
        merged++;
        if (merged <= 10) console.log(`  Merged: EAN ${ean} → "${master.name}"`);
      }
    }));
    if (i % 2000 === 0 && i > 0) console.log(`  Progress: ${i}/${spWithEan.length} (${merged} merged, ${noMatch} no match)`);
  }
  console.log(`Step 2 done: ${merged} merged, ${noMatch} no match, ${alreadyLinked} already linked\n`);

  // ─── STEP 3: Cross-match by manufacturer ref (oem_ref) for products without EAN match ───
  console.log('--- Step 3: Cross-match by manufacturer ref ---');

  const spWithRef = spRows.filter(sp => {
    const tarif = tarifMap.get(sp.supplier_reference);
    return tarif && tarif.ref_fabricant;
  });
  // Exclude those already merged in Step 2
  const mergedIds = new Set();
  const spRefOnly = spWithRef.filter(sp => !mergedIds.has(sp.id));
  console.log(`Checking ${spRefOnly.length} refs for manufacturer match`);

  let refMerged = 0, refNoMatch = 0;

  for (let i = 0; i < spRefOnly.length; i += CONCURRENT) {
    const chunk = spRefOnly.slice(i, i + CONCURRENT);
    await Promise.all(chunk.map(async (sp) => {
      const refFab = tarifMap.get(sp.supplier_reference).ref_fabricant;
      const { data: matches } = await supabase
        .from('products').select('id, name')
        .or(`manufacturer_ref.eq.${refFab},oem_ref.eq.${refFab}`)
        .neq('id', sp.product_id).limit(1);
      if (!matches || matches.length === 0) { refNoMatch++; return; }

      const master = matches[0];
      const { data: existing } = await supabase
        .from('supplier_products').select('id')
        .eq('product_id', master.id).eq('supplier_id', LIDERPAPEL_SUPPLIER_ID).limit(1);
      if (existing && existing.length > 0) return;

      const { error } = await supabase.from('supplier_products')
        .update({ product_id: master.id }).eq('id', sp.id);
      if (!error) {
        refMerged++;
        if (refMerged <= 10) console.log(`  Ref match: ${refFab} → "${master.name}"`);
      }
    }));
    if (i % 2000 === 0 && i > 0) console.log(`  Progress: ${i}/${spRefOnly.length} (${refMerged} merged)`);
  }
  console.log(`Step 3 done: ${refMerged} merged by manufacturer ref\n`);

  // ─── Summary ───
  console.log('=== Summary ===');
  const { count: totalSp } = await supabase
    .from('supplier_products').select('*', { count: 'exact', head: true })
    .eq('supplier_id', LIDERPAPEL_SUPPLIER_ID);
  console.log(`Liderpapel supplier_products: ${totalSp}`);
  console.log(`Step 1 — Enriched: ${enriched} (EAN + nom + marque + prix)`);
  console.log(`Step 2 — Merged by EAN: ${merged}`);
  console.log(`Step 3 — Merged by ref fabricant: ${refMerged}`);
  console.log(`Total merged: ${merged + refMerged}`);
  console.log('=== Done ===');
}

main().catch(console.error);
