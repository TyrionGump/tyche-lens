"""Run the visible acquire-to-deliver workflow and isolate company failures."""

import logging
from pathlib import Path
from time import perf_counter

from .evidence.normalize import normalize_company_facts
from .evidence.selection import select_evidence
from .identity import configuration_sha256, pipeline_run_id
from .locks import exclusive_pipeline_lock
from .models import (
    AcquisitionResult,
    CompanyConfig,
    PipelineSettings,
    SelectionPolicy,
    SourceSnapshot,
)
from .publishing.company import publish_company_evidence
from .publishing.delivery import publish_delivery
from .records import acquisition_details, now, record_completed_company, record_pipeline_run, seconds_since
from .sources.acquisition import SourceAcquirer
from .sources.snapshot import preserve_source
from .storage import artifact, display_path
from .validation import validate_settings

LOGGER = logging.getLogger(__name__)
DELIVERY_REPORT_SCHEMA_VERSION = 1


def run_pipeline(settings: PipelineSettings) -> int:
    """Validate, lock, and run all configured company stages and delivery."""
    validate_settings(settings)
    with exclusive_pipeline_lock(settings.data_directory):
        return _run_pipeline(settings)


def _run_pipeline(settings: PipelineSettings) -> int:
    pipeline_directory = settings.data_directory.parent.resolve()
    started_at = now()
    current_pipeline_run_id = pipeline_run_id(started_at)
    started = perf_counter()
    acquirer = SourceAcquirer(settings.acquisition)
    company_results = []

    # A company failure is recorded without hiding the outcome of the other companies.
    for company in settings.companies:
        company_results.append(
            _run_company(
                company=company,
                data_directory=settings.data_directory,
                as_of=settings.as_of,
                selection=settings.selection,
                acquirer=acquirer,
                pipeline_directory=pipeline_directory,
            )
        )

    completed_count = sum(result["status"] == "completed" for result in company_results)
    all_companies_completed = completed_count == len(company_results)
    delivery = _run_delivery(
        companies=settings.companies,
        data_directory=settings.data_directory,
        all_companies_completed=all_companies_completed,
        pipeline_directory=pipeline_directory,
    )

    if all_companies_completed and delivery["status"] == "completed":
        status = "completed"
    elif completed_count:
        status = "partial"
    else:
        status = "failed"

    run_file = record_pipeline_run(
        data_directory=settings.data_directory,
        acquisition_mode=settings.acquisition.mode,
        as_of=settings.as_of,
        company_count=len(settings.companies),
        pipeline_directory=pipeline_directory,
        pipeline_run_id=current_pipeline_run_id,
        status=status,
        started_at=started_at,
        started=started,
        company_results=company_results,
        completed_count=completed_count,
        delivery=delivery,
    )
    LOGGER.info("Pipeline %s: %s", status, display_path(run_file, pipeline_directory))
    return 0 if status == "completed" else 1


def _run_company(
    company: CompanyConfig,
    data_directory: Path,
    as_of: str,
    selection: SelectionPolicy,
    acquirer: SourceAcquirer,
    pipeline_directory: Path,
) -> dict:
    LOGGER.info("Starting %s", company.slug)
    started_at = now()
    started = perf_counter()
    failed_stage = "acquire"
    stage_durations = {}
    failed_acquisition: AcquisitionResult | None = None
    failed_snapshot: SourceSnapshot | None = None
    configuration_hash = configuration_sha256(company, selection)

    try:
        stage_started = perf_counter()
        acquisition = acquirer.acquire(company)
        failed_acquisition = acquisition
        stage_durations["acquire"] = seconds_since(stage_started)

        failed_stage = "source"
        stage_started = perf_counter()
        snapshot = preserve_source(
            company=company,
            data_directory=data_directory,
            pipeline_directory=pipeline_directory,
            as_of=as_of,
            configuration_sha256=configuration_hash,
        )
        failed_snapshot = snapshot
        stage_durations["source"] = seconds_since(stage_started)

        failed_stage = "normalize"
        stage_started = perf_counter()
        normalized = normalize_company_facts(snapshot)
        stage_durations["normalize"] = seconds_since(stage_started)

        failed_stage = "select"
        stage_started = perf_counter()
        selected = select_evidence(
            company=company,
            policy=selection,
            as_of=as_of,
            snapshot=snapshot,
            normalized=normalized,
        )
        stage_durations["select"] = seconds_since(stage_started)

        failed_stage = "publish"
        stage_started = perf_counter()
        publication = publish_company_evidence(
            company=company,
            data_directory=data_directory,
            as_of=as_of,
            snapshot=snapshot,
            selected=selected,
            pipeline_directory=pipeline_directory,
        )
        stage_durations["publish"] = seconds_since(stage_started)

        failed_stage = "record"
        report, run_file = record_completed_company(
            company=company,
            data_directory=data_directory,
            as_of=as_of,
            acquisition=acquisition,
            snapshot=snapshot,
            normalized=normalized,
            selected=selected,
            publication=publication,
            started_at=started_at,
            started=started,
            stage_durations=stage_durations,
            pipeline_directory=pipeline_directory,
        )
        LOGGER.info(
            "Completed %s: %d concepts, %d observations, %d evidence definitions",
            company.slug,
            normalized.concept_count,
            normalized.observation_count,
            selected.evidence_count,
        )
        return {
            "slug": company.slug,
            "status": "completed",
            "run_id": snapshot.run_id,
            "configuration_sha256": configuration_hash,
            "acquisition": acquisition_details(acquisition, pipeline_directory),
            "run_file": display_path(run_file, pipeline_directory),
            "publication_file": display_path(publication.publication_file, pipeline_directory),
            "duration_seconds": report["duration_seconds"],
            "issue_count": selected.issue_count,
        }
    except Exception as error:
        LOGGER.exception("%s failed during %s", company.slug, failed_stage)
        result = {
            "slug": company.slug,
            "status": "failed",
            "configuration_sha256": configuration_hash,
            "as_of": as_of,
            "started_at": started_at,
            "finished_at": now(),
            "duration_seconds": seconds_since(started),
            "failed_stage": failed_stage,
            "completed_stage_durations_seconds": stage_durations,
            "error": {"type": type(error).__name__, "message": str(error)},
        }
        if failed_acquisition is not None:
            result["acquisition"] = acquisition_details(failed_acquisition, pipeline_directory)
        if failed_snapshot is not None:
            result["run_id"] = failed_snapshot.run_id
            result["run_directory"] = display_path(failed_snapshot.run_directory, pipeline_directory)
        return result


def _run_delivery(
    companies: tuple[CompanyConfig, ...],
    data_directory: Path,
    all_companies_completed: bool,
    pipeline_directory: Path,
) -> dict:
    if not all_companies_completed:
        # A delivery is an all-company handoff; a partial bundle would change its contract silently.
        return {
            "schema_version": DELIVERY_REPORT_SCHEMA_VERSION,
            "status": "skipped",
            "reason": "A delivery is published only after every configured company completes.",
        }

    LOGGER.info("Publishing publication delivery")
    started = perf_counter()
    try:
        result = publish_delivery(companies, data_directory, pipeline_directory)
        report = {
            "schema_version": DELIVERY_REPORT_SCHEMA_VERSION,
            "status": "completed",
            "duration_seconds": seconds_since(started),
            "delivery_id": result.delivery_id,
            "manifest": artifact(result.manifest_file, pipeline_directory),
            "latest_pointer": artifact(result.latest_pointer_file, pipeline_directory),
            "counts": {"publications": result.publication_count, "publication_bytes": result.publication_bytes},
        }
        LOGGER.info("Published delivery %s with %d publications", result.delivery_id, result.publication_count)
        return report
    except Exception as error:
        LOGGER.exception("Publication delivery failed")
        return {
            "schema_version": DELIVERY_REPORT_SCHEMA_VERSION,
            "status": "failed",
            "duration_seconds": seconds_since(started),
            "error": {"type": type(error).__name__, "message": str(error)},
        }
