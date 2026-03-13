"""Rapport d'import : génération texte + JSON."""

from __future__ import annotations

import json
import logging
from dataclasses import dataclass, field
from datetime import datetime, timezone
from pathlib import Path

from .differ import DiffResult
from .validator import ValidationReport

log = logging.getLogger(__name__)


@dataclass
class ImportReport:
    started_at: datetime = field(default_factory=lambda: datetime.now(timezone.utc))
    finished_at: datetime | None = None
    duration_seconds: float = 0.0
    mode: str = "full"

    # File counts
    files_processed: int = 0
    total_catalog: int = 0
    total_prices: int = 0
    total_stocks: int = 0

    # DB operation counts
    created: int = 0
    updated: int = 0
    skipped: int = 0
    errors: int = 0

    # Quality metrics
    missing_eans: int = 0
    invalid_eans: int = 0
    missing_prices: int = 0
    missing_images: int = 0
    missing_descriptions: int = 0

    # Diff & validation
    diff: DiffResult | None = None
    validation: ValidationReport | None = None

    # Errors & warnings
    error_details: list[str] = field(default_factory=list)
    warnings: list[str] = field(default_factory=list)

    # Flush stats
    flush_stats: dict[str, dict[str, int]] = field(default_factory=dict)

    def finish(self) -> None:
        self.finished_at = datetime.now(timezone.utc)
        self.duration_seconds = (self.finished_at - self.started_at).total_seconds()


def generate_text_report(report: ImportReport) -> str:
    """Rapport lisible pour logs."""
    lines = [
        "=" * 60,
        f"  IMPORT COMLANDI/LIDERPAPEL — {report.mode.upper()}",
        f"  {report.started_at:%Y-%m-%d %H:%M:%S UTC}",
        "=" * 60,
        "",
        "── Fichiers ──",
        f"  Catalog:  {report.total_catalog} produits",
        f"  Prices:   {report.total_prices} produits",
        f"  Stocks:   {report.total_stocks} produits",
        "",
        "── Résultat DB ──",
        f"  Créés:    {report.created}",
        f"  Mis à jour: {report.updated}",
        f"  Ignorés:  {report.skipped}",
        f"  Erreurs:  {report.errors}",
        "",
        "── Qualité ──",
        f"  EAN manquants:     {report.missing_eans}",
        f"  EAN invalides:     {report.invalid_eans}",
        f"  Sans prix:         {report.missing_prices}",
        f"  Sans images:       {report.missing_images}",
        f"  Sans descriptions: {report.missing_descriptions}",
    ]

    if report.validation:
        lines.extend([
            "",
            "── Validation ──",
            f"  Erreurs:  {report.validation.error_count}",
            f"  Warnings: {report.validation.warning_count}",
            f"  Infos:    {report.validation.info_count}",
        ])

    if report.diff:
        s = report.diff.summary
        lines.extend([
            "",
            "── Diff vs précédent ──",
            f"  Nouveaux:    {s['new']}",
            f"  Supprimés:   {s['removed']}",
            f"  Prix changés: {s['price_changes']}",
            f"  Stocks changés: {s['stock_changes']}",
        ])

    if report.flush_stats:
        lines.extend(["", "── Flush DB ──"])
        for table, stats in report.flush_stats.items():
            lines.append(f"  {table}: {stats.get('attempted', 0)} tentés, {stats.get('failed', 0)} échoués")

    if report.error_details:
        lines.extend(["", "── Erreurs détaillées (max 30) ──"])
        for detail in report.error_details[:30]:
            lines.append(f"  • {detail}")

    lines.extend([
        "",
        f"── Durée: {report.duration_seconds:.1f}s ──",
        "=" * 60,
    ])

    return "\n".join(lines)


def generate_json_report(report: ImportReport) -> dict:
    """Rapport structuré pour supplier_import_logs.report_data."""
    data: dict = {
        "mode": report.mode,
        "started_at": report.started_at.isoformat(),
        "finished_at": report.finished_at.isoformat() if report.finished_at else None,
        "duration_seconds": report.duration_seconds,
        "files": {
            "catalog": report.total_catalog,
            "prices": report.total_prices,
            "stocks": report.total_stocks,
        },
        "result": {
            "created": report.created,
            "updated": report.updated,
            "skipped": report.skipped,
            "errors": report.errors,
        },
        "quality": {
            "missing_eans": report.missing_eans,
            "invalid_eans": report.invalid_eans,
            "missing_prices": report.missing_prices,
            "missing_images": report.missing_images,
            "missing_descriptions": report.missing_descriptions,
        },
        "warnings_count": len(report.warnings),
        "warnings": report.warnings[:50],
        "errors_detail": report.error_details[:50],
    }

    if report.diff:
        data["diff"] = report.diff.summary

    if report.validation:
        data["validation"] = {
            "errors": report.validation.error_count,
            "warnings": report.validation.warning_count,
            "infos": report.validation.info_count,
            "file_stats": report.validation.file_stats,
        }

    if report.flush_stats:
        data["flush_stats"] = report.flush_stats

    return data


def save_report(report: ImportReport, logs_dir: Path) -> Path:
    """Sauve le rapport texte et JSON dans logs_dir."""
    logs_dir.mkdir(parents=True, exist_ok=True)
    timestamp = report.started_at.strftime("%Y%m%d_%H%M%S")
    base = logs_dir / f"comlandi_import_{timestamp}"

    # Text report
    text_path = base.with_suffix(".txt")
    text_path.write_text(generate_text_report(report), encoding="utf-8")

    # JSON report
    json_path = base.with_suffix(".json")
    json_path.write_text(
        json.dumps(generate_json_report(report), indent=2, ensure_ascii=False),
        encoding="utf-8",
    )

    log.info(f"Rapports sauvés: {text_path}, {json_path}")
    return text_path
