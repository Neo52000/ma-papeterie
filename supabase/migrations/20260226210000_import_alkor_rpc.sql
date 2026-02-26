-- ============================================================================
-- Import ALKOR via RPC (bypass Edge Functions completely)
-- Uses SECURITY DEFINER to bypass RLS on supplier_products
-- Called via supabase.rpc() which uses PostgREST (no CORS issues)
-- ============================================================================

-- ── Catalogue import batch ──────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.import_alkor_batch(
  p_rows jsonb,
  p_mode text DEFAULT 'create'
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_row jsonb;
  v_ean text;
  v_ref text;
  v_product_id uuid;
  v_created int := 0;
  v_updated int := 0;
  v_skipped int := 0;
  v_errors int := 0;
  v_details text[] := ARRAY[]::text[];
  v_supplier_id uuid;
  v_is_active boolean;
  v_is_eco boolean;
  v_name text;
  v_description text;
  v_rollups_recomputed int := 0;
  v_touched_ids uuid[] := ARRAY[]::uuid[];
BEGIN
  -- Security: require authenticated admin
  IF NOT (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'super_admin'::app_role)) THEN
    RAISE EXCEPTION 'Accès non autorisé';
  END IF;

  -- Resolve ALKOR supplier_id once
  SELECT id INTO v_supplier_id FROM public.suppliers WHERE name ILIKE '%alkor%' LIMIT 1;

  FOR v_row IN SELECT * FROM jsonb_array_elements(p_rows)
  LOOP
    BEGIN
      v_ean := NULLIF(TRIM(v_row->>'ean'), '');
      v_ref := NULLIF(TRIM(v_row->>'ref_art'), '');

      IF v_ref IS NULL AND v_ean IS NULL THEN
        v_skipped := v_skipped + 1;
        CONTINUE;
      END IF;

      v_is_active := LOWER(TRIM(COALESCE(v_row->>'cycle_vie', ''))) = 'actif';
      v_is_eco := UPPER(TRIM(COALESCE(v_row->>'produit_eco', ''))) = 'X';
      v_description := COALESCE(NULLIF(TRIM(v_row->>'libelle_commercial'), ''), NULLIF(TRIM(v_row->>'description'), ''));
      v_name := COALESCE(NULLIF(TRIM(v_row->>'description'), ''), NULLIF(TRIM(v_row->>'libelle_court'), ''), 'Sans nom');
      v_product_id := NULL;

      -- Find existing product by EAN
      IF v_ean IS NOT NULL THEN
        SELECT id INTO v_product_id FROM public.products WHERE ean = v_ean LIMIT 1;
      END IF;

      IF v_product_id IS NOT NULL THEN
        -- Enrich existing product
        UPDATE public.products SET
          name = LEFT(v_name, 255),
          name_short = LEFT(NULLIF(TRIM(v_row->>'libelle_court'), ''), 60),
          description = v_description,
          category = COALESCE(NULLIF(TRIM(v_row->>'famille'), ''), 'Non classé'),
          subcategory = NULLIF(TRIM(v_row->>'sous_famille'), ''),
          brand = COALESCE(NULLIF(TRIM(v_row->>'marque_produit'), ''), NULLIF(TRIM(v_row->>'marque_fabricant'), '')),
          manufacturer_code = NULLIF(TRIM(v_row->>'code_fabricant'), ''),
          oem_ref = NULLIF(TRIM(v_row->>'ref_commerciale'), ''),
          eco = v_is_eco,
          is_end_of_life = NOT v_is_active,
          is_active = v_is_active,
          updated_at = now(),
          attributs = jsonb_build_object(
            'source', 'alkor',
            'ref_alkor', v_ref,
            'nom_fabricant', NULLIF(TRIM(v_row->>'nom_fabricant'), ''),
            'fournisseur', NULLIF(TRIM(v_row->>'fournisseur'), ''),
            'article_mdd', TRIM(COALESCE(v_row->>'article_mdd', '')) = 'X',
            'norme_env1', NULLIF(TRIM(v_row->>'norme_env1'), ''),
            'norme_env2', NULLIF(TRIM(v_row->>'norme_env2'), ''),
            'num_agreement', NULLIF(TRIM(v_row->>'num_agreement'), ''),
            'eligible_agec', LOWER(TRIM(COALESCE(v_row->>'eligible_agec', ''))) = 'oui',
            'complement_env', NULLIF(TRIM(v_row->>'complement_env'), ''),
            'tx_recycle', NULLIF(TRIM(v_row->>'tx_recycle'), ''),
            'tx_recyclable', NULLIF(TRIM(v_row->>'tx_recyclable'), ''),
            'remplacement', NULLIF(TRIM(v_row->>'remplacement'), '')
          )
        WHERE id = v_product_id;
        v_updated := v_updated + 1;

      ELSIF p_mode = 'create' THEN
        -- Create new product
        INSERT INTO public.products (
          ean, name, name_short, description, category, subcategory,
          brand, manufacturer_code, oem_ref, eco, is_end_of_life, is_active,
          price, price_ht, price_ttc, updated_at, attributs
        ) VALUES (
          v_ean,
          LEFT(v_name, 255),
          LEFT(NULLIF(TRIM(v_row->>'libelle_court'), ''), 60),
          v_description,
          COALESCE(NULLIF(TRIM(v_row->>'famille'), ''), 'Non classé'),
          NULLIF(TRIM(v_row->>'sous_famille'), ''),
          COALESCE(NULLIF(TRIM(v_row->>'marque_produit'), ''), NULLIF(TRIM(v_row->>'marque_fabricant'), '')),
          NULLIF(TRIM(v_row->>'code_fabricant'), ''),
          NULLIF(TRIM(v_row->>'ref_commerciale'), ''),
          v_is_eco,
          NOT v_is_active,
          v_is_active,
          0.01, 0, 0,
          now(),
          jsonb_build_object(
            'source', 'alkor',
            'ref_alkor', v_ref,
            'nom_fabricant', NULLIF(TRIM(v_row->>'nom_fabricant'), ''),
            'fournisseur', NULLIF(TRIM(v_row->>'fournisseur'), ''),
            'article_mdd', TRIM(COALESCE(v_row->>'article_mdd', '')) = 'X',
            'norme_env1', NULLIF(TRIM(v_row->>'norme_env1'), ''),
            'norme_env2', NULLIF(TRIM(v_row->>'norme_env2'), ''),
            'num_agreement', NULLIF(TRIM(v_row->>'num_agreement'), ''),
            'eligible_agec', LOWER(TRIM(COALESCE(v_row->>'eligible_agec', ''))) = 'oui',
            'complement_env', NULLIF(TRIM(v_row->>'complement_env'), ''),
            'tx_recycle', NULLIF(TRIM(v_row->>'tx_recycle'), ''),
            'tx_recyclable', NULLIF(TRIM(v_row->>'tx_recyclable'), ''),
            'remplacement', NULLIF(TRIM(v_row->>'remplacement'), '')
          )
        ) RETURNING id INTO v_product_id;
        v_created := v_created + 1;

      ELSE
        v_skipped := v_skipped + 1;
      END IF;

      -- Track touched product
      IF v_product_id IS NOT NULL THEN
        v_touched_ids := array_append(v_touched_ids, v_product_id);
      END IF;

      -- Upsert supplier_offers (ALKOR catalogue — sans prix)
      IF v_product_id IS NOT NULL AND v_ref IS NOT NULL THEN
        INSERT INTO public.supplier_offers (
          product_id, supplier, supplier_product_id,
          purchase_price_ht, pvp_ttc, vat_rate, tax_breakdown,
          stock_qty, is_active, last_seen_at
        ) VALUES (
          v_product_id, 'ALKOR', v_ref,
          NULL, NULL, 20, '{}'::jsonb,
          0, v_is_active, now()
        )
        ON CONFLICT (supplier, supplier_product_id)
        DO UPDATE SET
          product_id = EXCLUDED.product_id,
          is_active = EXCLUDED.is_active,
          last_seen_at = EXCLUDED.last_seen_at;
      END IF;

      -- Upsert supplier_products (stable mapping)
      IF v_product_id IS NOT NULL AND v_supplier_id IS NOT NULL AND v_ref IS NOT NULL THEN
        INSERT INTO public.supplier_products (
          supplier_id, product_id, supplier_reference, source_type, is_preferred, updated_at
        ) VALUES (
          v_supplier_id, v_product_id, v_ref, 'alkor-catalogue', false, now()
        )
        ON CONFLICT (supplier_id, product_id)
        DO UPDATE SET
          supplier_reference = EXCLUDED.supplier_reference,
          source_type = EXCLUDED.source_type,
          updated_at = EXCLUDED.updated_at;
      END IF;

    EXCEPTION WHEN OTHERS THEN
      v_errors := v_errors + 1;
      IF coalesce(array_length(v_details, 1), 0) < 30 THEN
        v_details := array_append(v_details, COALESCE(v_ref, v_ean, '?') || ': ' || SQLERRM);
      END IF;
    END;
  END LOOP;

  -- Recompute rollups for all touched products
  IF array_length(v_touched_ids, 1) > 0 THEN
    DECLARE
      v_pid uuid;
    BEGIN
      FOREACH v_pid IN ARRAY v_touched_ids LOOP
        BEGIN
          PERFORM public.recompute_product_rollups(v_pid);
          v_rollups_recomputed := v_rollups_recomputed + 1;
        EXCEPTION WHEN OTHERS THEN
          NULL; -- ignore rollup errors
        END;
      END LOOP;
    END;
  END IF;

  -- Log the import
  BEGIN
    INSERT INTO public.supplier_import_logs (format, total_rows, success_count, error_count, errors, imported_at)
    VALUES ('alkor-catalogue', jsonb_array_length(p_rows), v_created + v_updated, v_errors, v_details[1:50], now());
  EXCEPTION WHEN OTHERS THEN
    NULL; -- ignore logging errors
  END;

  RETURN jsonb_build_object(
    'created', v_created,
    'updated', v_updated,
    'skipped', v_skipped,
    'errors', v_errors,
    'rollups_recomputed', v_rollups_recomputed,
    'details', to_jsonb(v_details)
  );
END;
$$;

GRANT EXECUTE ON FUNCTION public.import_alkor_batch(jsonb, text) TO authenticated;

-- ── Price import batch ──────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.import_alkor_prices_batch(p_rows jsonb)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_row jsonb;
  v_ref text;
  v_offer_id uuid;
  v_product_id uuid;
  v_purchase_price_ht numeric;
  v_pvp_ttc numeric;
  v_vat_rate numeric;
  v_tax_breakdown jsonb;
  v_updated int := 0;
  v_skipped int := 0;
  v_errors int := 0;
  v_rollups_recomputed int := 0;
  v_details text[] := ARRAY[]::text[];
  v_touched_ids uuid[] := ARRAY[]::uuid[];
  v_val text;
  v_n numeric;
BEGIN
  -- Security: require authenticated admin
  IF NOT (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'super_admin'::app_role)) THEN
    RAISE EXCEPTION 'Accès non autorisé';
  END IF;

  FOR v_row IN SELECT * FROM jsonb_array_elements(p_rows)
  LOOP
    BEGIN
      v_ref := NULLIF(TRIM(v_row->>'ref_art'), '');
      IF v_ref IS NULL THEN
        v_skipped := v_skipped + 1;
        CONTINUE;
      END IF;

      -- Parse prices (handle comma as decimal separator)
      v_purchase_price_ht := NULL;
      v_pvp_ttc := NULL;
      v_vat_rate := 20;

      v_val := v_row->>'purchase_price_ht';
      IF v_val IS NOT NULL AND v_val != '' THEN
        BEGIN
          v_purchase_price_ht := REPLACE(v_val, ',', '.')::numeric;
        EXCEPTION WHEN OTHERS THEN NULL;
        END;
      END IF;

      v_val := v_row->>'pvp_ttc';
      IF v_val IS NOT NULL AND v_val != '' THEN
        BEGIN
          v_pvp_ttc := REPLACE(v_val, ',', '.')::numeric;
        EXCEPTION WHEN OTHERS THEN NULL;
        END;
      END IF;

      v_val := v_row->>'vat_rate';
      IF v_val IS NOT NULL AND v_val != '' THEN
        BEGIN
          v_vat_rate := REPLACE(REPLACE(v_val, ',', '.'), '%', '')::numeric;
        EXCEPTION WHEN OTHERS THEN v_vat_rate := 20;
        END;
      END IF;

      -- Build tax_breakdown
      v_tax_breakdown := '{}'::jsonb;
      DECLARE
        v_tax_key text;
        v_tax_field text;
        v_tax_pairs text[][] := ARRAY[
          ARRAY['eco', 'eco_tax'],
          ARRAY['d3e', 'd3e'],
          ARRAY['cop', 'cop'],
          ARRAY['sorecop', 'sorecop'],
          ARRAY['deee', 'deee']
        ];
      BEGIN
        FOR i IN 1..array_length(v_tax_pairs, 1) LOOP
          v_tax_key := v_tax_pairs[i][1];
          v_tax_field := v_tax_pairs[i][2];
          v_val := v_row->>v_tax_field;
          IF v_val IS NOT NULL AND v_val != '' THEN
            BEGIN
              v_n := REPLACE(v_val, ',', '.')::numeric;
              IF v_n > 0 THEN
                v_tax_breakdown := v_tax_breakdown || jsonb_build_object(v_tax_key, v_n);
              END IF;
            EXCEPTION WHEN OTHERS THEN NULL;
            END;
          END IF;
        END LOOP;
      END;

      IF v_purchase_price_ht IS NULL AND v_pvp_ttc IS NULL THEN
        v_skipped := v_skipped + 1;
        CONTINUE;
      END IF;

      -- Find matching ALKOR supplier_offer
      SELECT id, product_id INTO v_offer_id, v_product_id
      FROM public.supplier_offers
      WHERE supplier = 'ALKOR' AND supplier_product_id = v_ref
      LIMIT 1;

      IF v_offer_id IS NULL THEN
        v_skipped := v_skipped + 1;
        IF coalesce(array_length(v_details, 1), 0) < 20 THEN
          v_details := array_append(v_details, 'REF ' || v_ref || ': Aucune offre ALKOR trouvée — ignoré');
        END IF;
        CONTINUE;
      END IF;

      -- Update the offer with price data
      UPDATE public.supplier_offers SET
        purchase_price_ht = COALESCE(v_purchase_price_ht, purchase_price_ht),
        pvp_ttc = COALESCE(v_pvp_ttc, pvp_ttc),
        vat_rate = v_vat_rate,
        tax_breakdown = CASE WHEN v_tax_breakdown != '{}'::jsonb THEN v_tax_breakdown ELSE tax_breakdown END,
        last_seen_at = now()
      WHERE id = v_offer_id;

      v_touched_ids := array_append(v_touched_ids, v_product_id);
      v_updated := v_updated + 1;

    EXCEPTION WHEN OTHERS THEN
      v_errors := v_errors + 1;
      IF coalesce(array_length(v_details, 1), 0) < 30 THEN
        v_details := array_append(v_details, 'REF ' || COALESCE(v_ref, '?') || ': ' || SQLERRM);
      END IF;
    END;
  END LOOP;

  -- Recompute rollups for all touched products
  IF array_length(v_touched_ids, 1) > 0 THEN
    DECLARE
      v_pid uuid;
    BEGIN
      FOREACH v_pid IN ARRAY v_touched_ids LOOP
        BEGIN
          PERFORM public.recompute_product_rollups(v_pid);
          v_rollups_recomputed := v_rollups_recomputed + 1;
        EXCEPTION WHEN OTHERS THEN
          NULL;
        END;
      END LOOP;
    END;
  END IF;

  -- Log the import
  BEGIN
    INSERT INTO public.supplier_import_logs (format, total_rows, success_count, error_count, errors, imported_at)
    VALUES ('alkor-prices', jsonb_array_length(p_rows), v_updated, v_errors, v_details[1:50], now());
  EXCEPTION WHEN OTHERS THEN NULL;
  END;

  RETURN jsonb_build_object(
    'updated', v_updated,
    'skipped', v_skipped,
    'errors', v_errors,
    'rollups_recomputed', v_rollups_recomputed,
    'details', to_jsonb(v_details)
  );
END;
$$;

GRANT EXECUTE ON FUNCTION public.import_alkor_prices_batch(jsonb) TO authenticated;
