"""Chargement Supabase : upserts par batch dans les 10 tables."""

from __future__ import annotations

import logging
import time
from datetime import datetime, timezone, timedelta
from typing import Any

from .config import Config
from .models.category import Category
from .models.media import MultimediaLink
from .models.product import MergedProduct
from .models.relation import ProductRelation
from .report import ImportReport
from .transformer import (
    build_attributes,
    build_product_row,
    build_supplier_offer,
    build_supplier_product,
    normalize_ean,
)

log = logging.getLogger(__name__)


class BatchLoader:
    """Gère les upserts par batch vers Supabase."""

    def __init__(self, supabase: Any, config: Config):
        self.supabase = supabase
        self.config = config
        self.supplier_id: str | None = None
        self.coefficients: dict[str, float] = {}
        self.report = ImportReport()

        # Accumulator batches
        self._price_history: list[dict] = []
        self._lifecycle: list[dict] = []
        self._attributes: list[dict] = []
        self._supplier_offers: list[dict] = []
        self._supplier_products: list[dict] = []

        # Tracking
        self._ref_to_product_id: dict[str, str] = {}
        self._affected_product_ids: list[str] = []

    # ─── Resolution initiale ───

    def resolve_supplier_id(self) -> str | None:
        """Trouve l'ID fournisseur Comlandi/Liderpapel."""
        try:
            resp = (
                self.supabase.table("suppliers")
                .select("id")
                .or_("name.ilike.%comlandi%,name.ilike.%liderpapel%,name.ilike.%cs group%")
                .eq("is_active", True)
                .limit(1)
                .maybe_single()
                .execute()
            )
            if resp.data:
                self.supplier_id = resp.data["id"]
                log.info(f"Supplier ID résolu: {self.supplier_id}")
        except Exception as e:
            log.warning(f"Résolution supplier_id échouée: {e}")
        return self.supplier_id

    def load_coefficients(self) -> dict[str, float]:
        """Charge liderpapel_pricing_coefficients → {family::subfamily: coeff}."""
        try:
            resp = (
                self.supabase.table("liderpapel_pricing_coefficients")
                .select("family, subfamily, coefficient")
                .execute()
            )
            for c in resp.data or []:
                key = f"{c['family']}::{c.get('subfamily') or ''}"
                self.coefficients[key] = float(c["coefficient"])
            log.info(f"Coefficients chargés: {len(self.coefficients)} entrées")
        except Exception as e:
            log.warning(f"Chargement coefficients échoué: {e}")
        return self.coefficients

    # ─── Batch lookup (CRITIQUE pour perf) ───

    def batch_ean_lookup(self, eans: list[str]) -> dict[str, dict]:
        """Batch lookup produits existants par EAN. Chunks de 500."""
        unique_eans = list(set(e for e in eans if e))
        result: dict[str, dict] = {}
        if not unique_eans:
            return result

        chunk_size = 500
        for i in range(0, len(unique_eans), chunk_size):
            chunk = unique_eans[i : i + chunk_size]
            try:
                resp = (
                    self.supabase.table("products")
                    .select("id, ean, price_ht, price_ttc, cost_price")
                    .in_("ean", chunk)
                    .execute()
                )
                for p in resp.data or []:
                    if p.get("ean"):
                        result[p["ean"]] = p
            except Exception as e:
                log.warning(f"Batch EAN lookup chunk {i // chunk_size + 1} échoué: {e}")

        log.info(f"EAN lookup: {len(result)} produits trouvés sur {len(unique_eans)} EAN")
        return result

    def batch_ref_lookup(self, refs: list[str]) -> dict[str, dict]:
        """Batch lookup par ref via RPC find_products_by_refs + fallback supplier_products."""
        result: dict[str, dict] = {}
        if not refs:
            return result

        chunk_size = 500
        # 1. RPC find_products_by_refs
        for i in range(0, len(refs), chunk_size):
            chunk = refs[i : i + chunk_size]
            try:
                resp = self.supabase.rpc(
                    "find_products_by_refs", {"refs": chunk}
                ).execute()
                for r in resp.data or []:
                    ref = r.get("matched_ref")
                    pid = r.get("product_id")
                    if ref and pid and ref not in result:
                        result[ref] = {"id": pid, "matched_ref": ref}
            except Exception as e:
                log.warning(f"RPC find_products_by_refs chunk échoué: {e}")

        # 2. Fallback: supplier_products
        unmatched = [r for r in refs if r not in result]
        if unmatched:
            for i in range(0, len(unmatched), chunk_size):
                chunk = unmatched[i : i + chunk_size]
                try:
                    resp = (
                        self.supabase.table("supplier_products")
                        .select("supplier_reference, product_id")
                        .in_("supplier_reference", chunk)
                        .execute()
                    )
                    for r in resp.data or []:
                        ref = r.get("supplier_reference")
                        pid = r.get("product_id")
                        if ref and pid and ref not in result:
                            result[ref] = {"id": pid, "matched_ref": ref}
                except Exception as e:
                    log.warning(f"Fallback supplier_products lookup échoué: {e}")

        log.info(f"Ref lookup: {len(result)} produits trouvés sur {len(refs)} refs")
        return result

    # ─── Upsert produits ───

    def upsert_products(self, merged_products: dict[str, MergedProduct]) -> None:
        """Upsert principal des produits. Batch lookup puis traitement."""
        # Pre-load existing products
        eans = [m.ean for m in merged_products.values() if m.ean]
        existing_by_ean = self.batch_ean_lookup(eans)

        # Refs without EAN match
        refs_without = [
            ref for ref, m in merged_products.items()
            if not (m.ean and m.ean in existing_by_ean)
        ]
        existing_by_ref = self.batch_ref_lookup(refs_without)

        now = datetime.now(timezone.utc).isoformat()

        for ref, merged in merged_products.items():
            try:
                product_data = build_product_row(merged)
                existing_id: str | None = None
                old_prices: dict | None = None

                # Resolve existing product
                if merged.ean and merged.ean in existing_by_ean:
                    existing = existing_by_ean[merged.ean]
                    existing_id = existing["id"]
                    old_prices = existing
                elif ref in existing_by_ref:
                    existing = existing_by_ref[ref]
                    existing_id = existing["id"]
                    # Need to fetch prices for existing
                    try:
                        resp = (
                            self.supabase.table("products")
                            .select("price_ht, price_ttc, cost_price")
                            .eq("id", existing_id)
                            .maybe_single()
                            .execute()
                        )
                        old_prices = resp.data
                    except Exception:
                        pass

                saved_id: str | None = existing_id
                is_new = False

                if existing_id:
                    # Track price changes
                    if old_prices and (
                        old_prices.get("price_ht") != merged.price_ht
                        or old_prices.get("price_ttc") != merged.price_ttc
                    ):
                        self._price_history.append({
                            "product_id": existing_id,
                            "changed_by": "import-liderpapel",
                            "supplier_id": self.supplier_id,
                            "old_cost_price": old_prices.get("cost_price"),
                            "new_cost_price": merged.cost_price if merged.cost_price > 0 else None,
                            "old_price_ht": old_prices.get("price_ht"),
                            "new_price_ht": merged.price_ht,
                            "old_price_ttc": old_prices.get("price_ttc"),
                            "new_price_ttc": merged.price_ttc,
                            "change_reason": "import-liderpapel-catalogue",
                        })

                    # Update
                    resp = (
                        self.supabase.table("products")
                        .update(product_data)
                        .eq("id", existing_id)
                        .execute()
                    )
                    self.report.updated += 1
                else:
                    # Insert
                    product_data["ean"] = merged.ean
                    resp = (
                        self.supabase.table("products")
                        .insert(product_data)
                        .execute()
                    )
                    if resp.data:
                        saved_id = resp.data[0].get("id")
                    is_new = True
                    self.report.created += 1

                if saved_id:
                    self._ref_to_product_id[ref] = saved_id
                    self._affected_product_ids.append(saved_id)

                    # Attributes
                    self._attributes.extend(build_attributes(saved_id, merged))

                    # Lifecycle log
                    self._lifecycle.append({
                        "product_id": saved_id,
                        "event_type": "created" if is_new else "updated",
                        "performed_by": "import-liderpapel",
                        "details": {"ref": ref, "ean": merged.ean, "source": "liderpapel"},
                    })

                    # Supplier products
                    if self.supplier_id:
                        self._supplier_products.append(
                            build_supplier_product(self.supplier_id, saved_id, merged, ref)
                        )

                    # Supplier offers
                    self._supplier_offers.append(
                        build_supplier_offer(saved_id, merged, ref)
                    )

            except Exception as e:
                self.report.errors += 1
                if len(self.report.error_details) < 30:
                    self.report.error_details.append(f"{ref}: {e}")
                log.warning(f"Produit {ref} échoué: {e}")

    # ─── Categories ───

    def upsert_categories(self, categories: list[Category]) -> dict[str, str]:
        """Upsert catégories. Retourne {code: uuid}."""
        cat_map: dict[str, str] = {}

        for cat in categories:
            slug = f"liderpapel-{cat.code}"
            try:
                resp = (
                    self.supabase.table("categories")
                    .upsert(
                        {
                            "slug": slug,
                            "name": cat.name,
                            "level": "category" if cat.level == "1" else "subcategory",
                            "description": f"Catégorie Liderpapel {cat.code}",
                            "is_active": True,
                            "sort_order": int(cat.code) if cat.code.isdigit() else 0,
                        },
                        on_conflict="slug",
                    )
                    .execute()
                )
                if resp.data:
                    cat_map[cat.code] = resp.data[0]["id"]
            except Exception as e:
                log.warning(f"Catégorie {cat.code} échouée: {e}")

        # Link parents
        for cat in categories:
            if cat.parent_code and cat.parent_code in cat_map:
                parent_id = cat_map[cat.parent_code]
                slug = f"liderpapel-{cat.code}"
                try:
                    self.supabase.table("categories").update(
                        {"parent_id": parent_id}
                    ).eq("slug", slug).execute()
                except Exception:
                    pass

        log.info(f"Catégories: {len(cat_map)} upsertées")
        return cat_map

    # ─── Descriptions ───

    def upsert_descriptions(
        self,
        descriptions: dict[str, dict[str, str]],
        ref_to_pid: dict[str, str],
    ) -> None:
        """Upsert product_seo rows."""
        rows: list[dict] = []
        skipped = 0

        for ref, fields in descriptions.items():
            product_id = ref_to_pid.get(ref)
            if not product_id:
                skipped += 1
                continue

            seo_data: dict[str, Any] = {
                "product_id": product_id,
                "status": "imported",
                "description_source": "supplier",
                "lang": "fr",
            }
            seo_data.update(fields)
            rows.append(seo_data)

        # Bulk upsert
        stats = self._flush_table("product_seo", rows, on_conflict="product_id")
        log.info(
            f"Descriptions: {stats[0]} tentées, {stats[1]} échouées, {skipped} ignorées"
        )

    # ─── Multimedia ───

    def upsert_multimedia(
        self,
        multimedia: dict[str, list[MultimediaLink]],
        ref_to_pid: dict[str, str],
    ) -> None:
        """Delete + insert product_images."""
        rows: list[dict] = []
        product_ids_with_images: set[str] = set()
        principal_images: list[dict] = []

        for ref, links in multimedia.items():
            product_id = ref_to_pid.get(ref)
            if not product_id:
                continue

            is_first = True
            for link in links:
                row = {
                    "product_id": product_id,
                    "url_originale": link.url,
                    "alt_seo": link.name,
                    "source": "liderpapel",
                    "is_principal": is_first,
                }
                rows.append(row)
                product_ids_with_images.add(product_id)
                if is_first:
                    principal_images.append(row)
                is_first = False

        # Delete existing liderpapel images
        if product_ids_with_images:
            pids = list(product_ids_with_images)
            chunk_size = 500
            for i in range(0, len(pids), chunk_size):
                chunk = pids[i : i + chunk_size]
                try:
                    self.supabase.table("product_images").delete().in_(
                        "product_id", chunk
                    ).eq("source", "liderpapel").execute()
                except Exception as e:
                    log.warning(f"Delete images chunk échoué: {e}")

        # Insert new images
        stats = self._flush_table("product_images", rows)

        # Sync products.image_url from principal
        synced = 0
        for img in principal_images:
            try:
                self.supabase.table("products").update(
                    {"image_url": img["url_originale"]}
                ).eq("id", img["product_id"]).execute()
                synced += 1
            except Exception:
                pass

        log.info(
            f"Multimedia: {stats[0]} images tentées, {stats[1]} échouées, "
            f"{synced} products.image_url synchronisés"
        )

    # ─── Relations ───

    def upsert_relations(self, relations: list[ProductRelation]) -> None:
        """Insert product_relations rows."""
        rows = [
            {
                "product_id": rel.product_id,
                "related_product_id": rel.related_product_id,
                "relation_type": rel.relation_type,
            }
            for rel in relations
        ]
        stats = self._flush_table("product_relations", rows)
        log.info(f"Relations: {stats[0]} tentées, {stats[1]} échouées")

    # ─── Flush batches ───

    def flush_batches(self) -> None:
        """Flush tous les batches accumulés."""
        flush_results: dict[str, dict[str, int]] = {}

        # Price history
        attempted, failed = self._flush_table("product_price_history", self._price_history)
        flush_results["product_price_history"] = {"attempted": attempted, "failed": failed}

        # Lifecycle logs
        attempted, failed = self._flush_table("product_lifecycle_logs", self._lifecycle)
        flush_results["product_lifecycle_logs"] = {"attempted": attempted, "failed": failed}

        # Attributes
        attempted, failed = self._flush_table("product_attributes", self._attributes)
        flush_results["product_attributes"] = {"attempted": attempted, "failed": failed}

        # Supplier offers
        attempted, failed = self._flush_table(
            "supplier_offers", self._supplier_offers,
            on_conflict="supplier,supplier_product_id",
        )
        flush_results["supplier_offers"] = {"attempted": attempted, "failed": failed}

        # Supplier products
        attempted, failed = self._flush_table(
            "supplier_products", self._supplier_products,
            on_conflict="supplier_id,product_id",
        )
        flush_results["supplier_products"] = {"attempted": attempted, "failed": failed}

        self.report.flush_stats = flush_results

        log.info(
            f"Flush: price_history={len(self._price_history)}, "
            f"lifecycle={len(self._lifecycle)}, "
            f"attributes={len(self._attributes)}, "
            f"supplier_offers={len(self._supplier_offers)}, "
            f"supplier_products={len(self._supplier_products)}"
        )

    # ─── Ghost offers ───

    def deactivate_ghost_offers(self) -> None:
        """Désactive les offres COMLANDI non vues depuis ghost_offer_days."""
        try:
            # Dynamic threshold from app_settings
            ghost_days = self.config.ghost_offer_days
            try:
                resp = (
                    self.supabase.table("app_settings")
                    .select("value")
                    .eq("key", "ghost_offer_threshold_comlandi_days")
                    .maybe_single()
                    .execute()
                )
                if resp.data and resp.data.get("value"):
                    ghost_days = int(resp.data["value"])
            except Exception:
                pass

            threshold = (datetime.now(timezone.utc) - timedelta(days=ghost_days)).isoformat()
            self.supabase.table("supplier_offers").update(
                {"is_active": False}
            ).eq("supplier", self.config.supplier_name).eq(
                "is_active", True
            ).lt("last_seen_at", threshold).execute()

            log.info(f"Ghost offers désactivées (seuil: {ghost_days} jours)")
        except Exception as e:
            log.warning(f"Désactivation ghost offers échouée: {e}")

    # ─── Rollups ───

    def recompute_rollups(self) -> None:
        """Recompute rollups pour les produits affectés."""
        pids = list(set(self._affected_product_ids))
        if not pids:
            return

        # Try batch RPC first
        try:
            self.supabase.rpc(
                "recompute_product_rollups_batch", {"p_product_ids": pids}
            ).execute()
            log.info(f"Rollups batch recomputed: {len(pids)} produits")
            return
        except Exception:
            pass

        # Fallback: individual calls in chunks
        processed = 0
        chunk_size = 50
        for i in range(0, len(pids), chunk_size):
            chunk = pids[i : i + chunk_size]
            for pid in chunk:
                try:
                    self.supabase.rpc(
                        "recompute_product_rollups", {"p_product_id": pid}
                    ).execute()
                    processed += 1
                except Exception:
                    pass

        log.info(f"Rollups individuels: {processed}/{len(pids)} produits")

    # ─── Import log ───

    def log_import(self) -> None:
        """Insert dans supplier_import_logs."""
        from .report import generate_json_report

        try:
            self.supabase.table("supplier_import_logs").insert({
                "format": "liderpapel-catalogue",
                "total_rows": self.report.total_catalog,
                "success_count": self.report.created + self.report.updated,
                "error_count": self.report.errors,
                "errors": self.report.error_details[:50],
                "price_changes_count": len(self._price_history),
                "report_data": generate_json_report(self.report),
                "imported_at": datetime.now(timezone.utc).isoformat(),
            }).execute()
            log.info("Import loggé dans supplier_import_logs")
        except Exception as e:
            log.warning(f"Logging import échoué: {e}")

    # ─── Internal flush ───

    def _flush_table(
        self,
        table: str,
        batch: list[dict],
        on_conflict: str | None = None,
    ) -> tuple[int, int]:
        """Chunk un batch et upsert/insert. Returns (attempted, failed)."""
        if not batch:
            return 0, 0

        attempted = 0
        failed = 0
        chunk_size = self.config.batch_size

        for i in range(0, len(batch), chunk_size):
            chunk = batch[i : i + chunk_size]
            attempted += len(chunk)

            try:
                if on_conflict:
                    self.supabase.table(table).upsert(
                        chunk, on_conflict=on_conflict
                    ).execute()
                else:
                    self.supabase.table(table).insert(chunk).execute()
            except Exception as e:
                failed += len(chunk)
                self.report.warnings.append(
                    f"{table} chunk {i // chunk_size + 1}: {e}"
                )

        return attempted, failed

    @property
    def ref_to_product_id(self) -> dict[str, str]:
        return self._ref_to_product_id
