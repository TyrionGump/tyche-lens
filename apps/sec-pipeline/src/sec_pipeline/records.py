"""Write operational reports without owning evidence or delivery artifacts."""

import sys
from datetime import UTC, datetime
from pathlib import Path
from time import perf_counter

from .models import (
    AcquisitionMode,
    AcquisitionResult,
    CompanyConfig,
    NormalizationResult,
    PublicationResult,
    SelectionResult,
    SourceSnapshot,
)
from .storage import artifact, display_path, write_json

try:
    import resource
except ImportError:  # pragma: no cover - unavailable on Windows
    resource = None


PIPELINE_RUN_SCHEMA_VERSION = 5
COMPANY_RUN_SCHEMA_VERSION = 3


def record_pipeline_run(
    data_directory: Path,
    acquisition_mode: AcquisitionMode,
    as_of: str,
    company_count: int,
    pipeline_directory: Path,
    pipeline_run_id: str,
    status: str,
    started_at: str,
    started: float,
    company_results: list[dict],
    completed_count: int,
    delivery: dict,
) -> Path:
    """Record the aggregate result after all company and delivery attempts."""
    run_file = data_directory / "pipeline-runs" / f"{pipeline_run_id}.json"
    report = {
        "schema_version": PIPELINE_RUN_SCHEMA_VERSION,
        "pipeline_run_id": pipeline_run_id,
        "status": status,
        "acquisition_mode": acquisition_mode,
        "started_at": started_at,
        "finished_at": now(),
        "duration_seconds": seconds_since(started),
        "as_of": as_of,
        "company_count": company_count,
        "completed_company_count": completed_count,
        "process_peak_memory_bytes": peak_memory_bytes(),
        "run_file": display_path(run_file, pipeline_directory),
        "companies": company_results,
        "delivery": delivery,
    }
    write_json(run_file, report)
    write_json(data_directory / "latest-run.json", report)
    return run_file


def record_completed_company(
    company: CompanyConfig,
    data_directory: Path,
    as_of: str,
    acquisition: AcquisitionResult,
    snapshot: SourceSnapshot,
    normalized: NormalizationResult,
    selected: SelectionResult,
    publication: PublicationResult,
    started_at: str,
    started: float,
    stage_durations: dict,
    pipeline_directory: Path,
) -> tuple[dict, Path]:
    """Record metrics and artifact references for one completed company run."""
    artifacts = {
        "raw_company_facts": artifact(snapshot.raw_file, pipeline_directory),
        "raw_manifest": artifact(snapshot.manifest_file, pipeline_directory),
        "normalized_observations": artifact(normalized.observations_file, pipeline_directory),
        "concept_catalog": artifact(normalized.catalog_file, pipeline_directory),
        "selected_evidence": artifact(selected.evidence_file, pipeline_directory),
        "published_evidence": artifact(publication.publication_file, pipeline_directory),
    }
    report = {
        "schema_version": COMPANY_RUN_SCHEMA_VERSION,
        "run_id": snapshot.run_id,
        "configuration_sha256": snapshot.configuration_sha256,
        "status": "completed",
        "company": {"slug": company.slug, "entity": snapshot.entity, "cik": snapshot.cik},
        "as_of": as_of,
        "acquisition": acquisition_details(acquisition, pipeline_directory),
        "started_at": started_at,
        "finished_at": now(),
        "duration_seconds": seconds_since(started),
        "stage_durations_seconds": stage_durations,
        "process_peak_memory_bytes_after_run": peak_memory_bytes(),
        "counts": {
            "concepts": normalized.concept_count,
            "normalized_observations": normalized.observation_count,
            "evidence_definitions": selected.evidence_count,
            "reported_evidence_observations": selected.reported_observation_count,
            "issues": selected.issue_count,
        },
        "artifact_bytes": sum(item["bytes"] for item in artifacts.values()),
        "artifacts": artifacts,
        "publication": {
            "publication_id": publication.publication_id,
            "latest_pointer_updated": publication.latest_updated,
        },
    }
    run_file = snapshot.run_directory / "run.json"
    write_json(run_file, report)
    write_json(
        data_directory / company.slug / "latest.json",
        {
            "schema_version": COMPANY_RUN_SCHEMA_VERSION,
            "company": {"slug": company.slug, "cik": company.cik},
            "as_of": as_of,
            "run_id": snapshot.run_id,
            "configuration_sha256": snapshot.configuration_sha256,
            "run": artifact(run_file, pipeline_directory),
            "selected_evidence": artifact(selected.evidence_file, pipeline_directory),
            "publication": artifact(publication.publication_file, pipeline_directory),
        },
    )
    return report, run_file


def acquisition_details(acquisition: AcquisitionResult, pipeline_directory: Path) -> dict:
    return {
        "mode": acquisition.mode,
        "status": acquisition.status,
        "source_manifest": artifact(acquisition.source_manifest_file, pipeline_directory),
        "source_sha256": acquisition.source_sha256,
        "source_url": acquisition.source_url,
        "source_fetched_at": acquisition.source_fetched_at,
        "request_finished_at": acquisition.request_finished_at,
    }


def peak_memory_bytes() -> int | None:
    if resource is None:
        return None
    peak = resource.getrusage(resource.RUSAGE_SELF).ru_maxrss
    return int(peak if sys.platform == "darwin" else peak * 1024)


def now() -> str:
    return datetime.now(UTC).isoformat()


def seconds_since(started: float) -> float:
    return round(perf_counter() - started, 6)
