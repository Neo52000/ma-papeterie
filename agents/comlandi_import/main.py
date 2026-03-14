#!/usr/bin/env python3
"""Pipeline d'import Comlandi/Liderpapel JSON v5.8 — CLI orchestrateur."""

from __future__ import annotations

import argparse
import glob
import json
import logging
import sys
from pathlib import Path

from .config import Config, FILE_PATTERNS
from .differ import compute_diff, load_previous_state, save_current_state
from .loader import BatchLoader
from .parser import (
    parse_catalog,
    parse_categories,
    parse_delivery_orders,
    parse_descriptions,
    parse_multimedia,
    parse_prices,
    parse_relations,
    parse_stocks,
)
from .report import ImportReport, generate_text_report, save_report
from .transformer import merge_all, normalize_ean_with_report
from .validator import run_validation

log = logging.getLogger("comlandi_import")


def setup_logging(verbose: bool = False) -> None:
    Path("logs").mkdir(exist_ok=True)
    level = logging.DEBUG if verbose else logging.INFO
    logging.basicConfig(
        level=level,
        format="%(asctime)s [%(levelname)s] %(name)s — %(message)s",
        handlers=[
            logging.FileHandler("logs/comlandi_import.log"),
            logging.StreamHandler(),
        ],
    )


def create_parser() -> argparse.ArgumentParser:
    parser = argparse.ArgumentParser(
        prog="comlandi_import",
        description="Import Comlandi/Liderpapel JSON v5.8 → Supabase",
    )
    parser.add_argument(
        "--mode",
        choices=["full", "daily", "enrich", "validate", "diff"],
        default="full",
        help="Mode d'import (default: full)",
    )
    parser.add_argument(
        "--data-dir",
        type=Path,
        default=None,
        help="Répertoire des fichiers JSON",
    )
    parser.add_argument("--dry-run", action="store_true", help="Pas d'écriture DB")
    parser.add_argument("--verbose", action="store_true", help="Logging debug")
    parser.add_argument("--batch-size", type=int, default=None, help="Taille des batches")
    return parser


def load_json_file(path: Path) -> dict | None:
    """Charge un fichier JSON."""
    if not path.exists():
        log.warning(f"Fichier non trouvé: {path}")
        return None
    try:
        with open(path) as f:
            return json.load(f)
    except Exception as e:
        log.error(f"Erreur parsing {path}: {e}")
        return None


def discover_files(data_dir: Path) -> dict[str, Path | None]:
    """Découvre les fichiers JSON dans data_dir."""
    found: dict[str, Path | None] = {}
    for key, pattern in FILE_PATTERNS.items():
        if "*" in pattern:
            matches = sorted(glob.glob(str(data_dir / pattern)))
            found[key] = Path(matches[0]) if matches else None
        else:
            path = data_dir / pattern
            found[key] = path if path.exists() else None

    present = [k for k, v in found.items() if v]
    missing = [k for k, v in found.items() if not v]
    log.info(f"Fichiers trouvés: {', '.join(present)}")
    if missing:
        log.info(f"Fichiers manquants: {', '.join(missing)}")
    return found


def run_pipeline(args: argparse.Namespace) -> int:
    """Pipeline principal."""
    setup_logging(args.verbose)
    config = Config.from_env()
    if args.data_dir:
        config.data_dir = args.data_dir
        config.state_dir = args.data_dir / ".state"
    if args.dry_run:
        config.dry_run = True
    if args.batch_size:
        config.batch_size = args.batch_size

    report = ImportReport(mode=args.mode)

    # ─── Validate config for DB modes ───
    needs_db = args.mode not in ("validate", "diff") and not config.dry_run
    if needs_db:
        errors = config.validate()
        if errors:
            for err in errors:
                log.error(err)
            return 1

    # ─── Discover files ───
    log.info(f"Mode: {args.mode} | Data: {config.data_dir} | Dry-run: {config.dry_run}")
    files = discover_files(config.data_dir)

    # ─── Parse ───
    log.info("Parsing des fichiers JSON...")
    parsed: dict = {}

    # Core files (always needed)
    if files.get("catalog"):
        data = load_json_file(files["catalog"])
        if data:
            parsed["catalog"] = parse_catalog(data)
            report.total_catalog = len(parsed["catalog"])
            report.files_processed += 1

    if files.get("prices"):
        data = load_json_file(files["prices"])
        if data:
            parsed["prices"] = parse_prices(data)
            report.total_prices = len(parsed["prices"])
            report.files_processed += 1

    if files.get("stocks"):
        data = load_json_file(files["stocks"])
        if data:
            parsed["stocks"] = parse_stocks(data)
            report.total_stocks = len(parsed["stocks"])
            report.files_processed += 1

    # Enrichment files
    if args.mode in ("full", "enrich"):
        if files.get("descriptions"):
            data = load_json_file(files["descriptions"])
            if data:
                parsed["descriptions"] = parse_descriptions(data)
                report.files_processed += 1

        if files.get("multimedia"):
            data = load_json_file(files["multimedia"])
            if data:
                parsed["multimedia"] = parse_multimedia(data)
                report.files_processed += 1

        if files.get("relations"):
            data = load_json_file(files["relations"])
            if data:
                parsed["relations"] = parse_relations(data)
                report.files_processed += 1

    if args.mode in ("full",):
        if files.get("categories"):
            data = load_json_file(files["categories"])
            if data:
                parsed["categories"] = parse_categories(data)
                report.files_processed += 1

    # ─── Validate ───
    log.info("Validation...")
    validation = run_validation(parsed)
    report.validation = validation

    if not validation.is_valid:
        log.error(f"Validation échouée: {validation.error_count} erreurs")
        for issue in validation.issues:
            if issue.severity == "error":
                log.error(f"  [{issue.file_type}] {issue.reference or '-'}: {issue.message}")

    if args.mode == "validate":
        report.finish()
        text = generate_text_report(report)
        print(text)
        save_report(report, config.logs_dir)
        return 0 if validation.is_valid else 1

    # ─── Transform & Merge ───
    catalog = parsed.get("catalog", {})
    prices = parsed.get("prices", {})
    stocks = parsed.get("stocks", {})

    if not catalog and not prices:
        log.error("Aucun catalogue ni prix à traiter")
        return 1

    # Quality metrics
    report.missing_eans = sum(1 for p in catalog.values() if not p.ean)
    ean_warnings = 0
    for p in catalog.values():
        if p.ean:
            _, warning = normalize_ean_with_report(p.ean)
            if warning:
                ean_warnings += 1
    report.invalid_eans = ean_warnings
    report.missing_prices = sum(
        1 for ref in catalog
        if ref not in prices or (prices[ref].cost_price == 0 and prices[ref].suggested_price == 0)
    )
    if parsed.get("multimedia") is not None:
        report.missing_images = sum(1 for ref in catalog if ref not in parsed["multimedia"])
    if parsed.get("descriptions") is not None:
        report.missing_descriptions = sum(1 for ref in catalog if ref not in parsed["descriptions"])

    # Load coefficients (need DB for non-dry-run, use defaults otherwise)
    coefficients: dict[str, float] = {}
    if needs_db:
        try:
            from supabase import create_client
            supabase = create_client(config.supabase_url, config.supabase_key)
            loader = BatchLoader(supabase, config)
            loader.resolve_supplier_id()
            coefficients = loader.load_coefficients()
        except Exception as e:
            log.error(f"Connexion Supabase échouée: {e}")
            return 1
    else:
        loader = None  # type: ignore

    log.info("Merge catalog + prices + stocks...")
    merged = merge_all(
        catalog, prices, stocks,
        coefficients=coefficients,
        default_coefficient=config.default_coefficient,
        default_tva_rate=config.default_tva_rate,
    )

    # ─── Diff ───
    log.info("Calcul du diff...")
    previous_state = load_previous_state(config.state_dir)
    diff = compute_diff(merged, previous_state)
    report.diff = diff

    if args.mode == "diff":
        report.finish()
        text = generate_text_report(report)
        print(text)
        save_report(report, config.logs_dir)
        return 0

    # ─── Dry-run stop ───
    if config.dry_run:
        log.info("Dry-run: arrêt avant écriture DB")
        report.finish()
        text = generate_text_report(report)
        print(text)
        save_report(report, config.logs_dir)
        return 0

    # ─── Load into Supabase ───
    assert loader is not None
    loader.report = report

    # Categories
    if parsed.get("categories"):
        log.info("Upsert catégories...")
        loader.upsert_categories(parsed["categories"])

    # Products
    log.info(f"Upsert {len(merged)} produits...")
    loader.upsert_products(merged)

    # Flush auxiliary batches
    log.info("Flush batches auxiliaires...")
    loader.flush_batches()

    # Enrichment
    ref_to_pid = loader.ref_to_product_id
    if parsed.get("descriptions") and args.mode in ("full", "enrich"):
        log.info("Upsert descriptions...")
        loader.upsert_descriptions(parsed["descriptions"], ref_to_pid)

    if parsed.get("multimedia") and args.mode in ("full", "enrich"):
        log.info("Upsert multimedia...")
        loader.upsert_multimedia(parsed["multimedia"], ref_to_pid)

    if parsed.get("relations") and args.mode in ("full", "enrich"):
        log.info("Upsert relations...")
        loader.upsert_relations(parsed["relations"])

    # Ghost offers
    log.info("Désactivation offres fantômes...")
    loader.deactivate_ghost_offers()

    # Rollups
    log.info("Recompute rollups...")
    loader.recompute_rollups()

    # Save state
    save_current_state(config.state_dir, merged)

    # Report
    report.finish()
    text = generate_text_report(report)
    print(text)
    save_report(report, config.logs_dir)

    # Log import
    loader.log_import()

    log.info(f"Import terminé en {report.duration_seconds:.1f}s")
    return 0


def main() -> int:
    args = create_parser().parse_args()
    try:
        return run_pipeline(args)
    except KeyboardInterrupt:
        log.info("Import interrompu par l'utilisateur")
        return 130
    except Exception as e:
        log.exception(f"Erreur fatale: {e}")
        return 1


if __name__ == "__main__":
    sys.exit(main())
