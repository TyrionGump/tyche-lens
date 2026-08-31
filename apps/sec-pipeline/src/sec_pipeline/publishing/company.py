"""Publish and validate the stable per-company evidence contract."""

from dataclasses import dataclass
from datetime import date
from pathlib import Path

from ..evidence.selection import load_selected_evidence
from ..models import CompanyConfig, PublicationResult, SelectionResult, SourceSnapshot
from ..sources.snapshot import load_source_provenance
from ..storage import (
    artifact,
    parse_json_object,
    read_json_object,
    required_list,
    required_object,
    required_text,
    sha256_bytes,
    write_json,
)

SCHEMA_VERSION = 1


@dataclass(frozen=True)
class CompanyPublication:
    """Validated publication content made available to delivery bundling."""

    company_slug: str
    cik: str
    company_identity: dict
    publication_id: str
    schema_version: int
    as_of: str
    content: bytes
    sha256: str


def publish_company_evidence(
    company: CompanyConfig,
    data_directory: Path,
    as_of: str,
    snapshot: SourceSnapshot,
    selected: SelectionResult,
    pipeline_directory: Path,
) -> PublicationResult:
    """Publish an immutable company snapshot and advance its latest pointer."""
    selected_document = load_selected_evidence(selected, company, as_of, snapshot)
    source = load_source_provenance(snapshot)

    publication = {
        "schema_version": SCHEMA_VERSION,
        "publication_id": snapshot.run_id,
        "company": selected_document.company,
        "as_of": selected_document.as_of,
        "periods": selected_document.periods,
        "selection_policy": selected_document.selection_policy,
        "evidence": selected_document.evidence,
        "issues": selected_document.issues,
        "provenance": {
            "run_id": snapshot.run_id,
            "configuration_sha256": snapshot.configuration_sha256,
            "source": {
                "type": "sec_company_facts",
                "url": source.url,
                "fetched_at": source.fetched_at,
                "representation": source.representation,
                "sha256": snapshot.raw_sha256,
            },
        },
    }

    publication_directory = data_directory / "publications" / company.slug / "snapshots" / snapshot.run_id
    publication_file = publication_directory / "publication.json"
    if publication_file.exists():
        existing = read_json_object(publication_file, "publication")
        if existing != publication:
            raise ValueError(f"Publication ID collision with different content: {snapshot.run_id}")
    else:
        write_json(publication_file, publication)

    latest_file = data_directory / "publications" / company.slug / "latest.json"
    latest_updated = _should_update_latest(latest_file, as_of)
    if latest_updated:
        write_json(
            latest_file,
            {
                "schema_version": SCHEMA_VERSION,
                "company": {"slug": company.slug, "cik": company.cik},
                "as_of": as_of,
                "publication_id": snapshot.run_id,
                "publication": artifact(publication_file, pipeline_directory),
            },
        )

    return PublicationResult(
        publication_id=snapshot.run_id,
        publication_file=publication_file,
        latest_updated=latest_updated,
    )


def load_latest_company_publication(
    company: CompanyConfig, data_directory: Path, pipeline_directory: Path
) -> CompanyPublication:
    """Load and validate the latest company publication owned by this module."""
    pointer_file = data_directory / "publications" / company.slug / "latest.json"
    pointer = read_json_object(pointer_file, "latest publication pointer")
    if pointer.get("company") != {"slug": company.slug, "cik": company.cik}:
        raise ValueError(f"Company identity changed in {pointer_file}")

    publication_artifact = required_object(pointer, "publication", pointer_file)
    publication_file = _resolve_artifact(publication_artifact, pointer_file, pipeline_directory, data_directory)
    content = publication_file.read_bytes()
    document = parse_json_object(content, publication_file, "publication")
    _validate_publication(document, pointer, company, publication_file)
    return CompanyPublication(
        company_slug=company.slug,
        cik=company.cik,
        company_identity=document["company"],
        publication_id=document["publication_id"],
        schema_version=document["schema_version"],
        as_of=document["as_of"],
        content=content,
        sha256=publication_artifact["sha256"],
    )


def _should_update_latest(latest_file: Path, as_of: str) -> bool:
    try:
        candidate_as_of = date.fromisoformat(as_of)
    except ValueError as error:
        raise ValueError(f"Publication has an invalid as_of: {as_of!r}") from error
    if not latest_file.exists():
        return True
    latest = read_json_object(latest_file, "latest publication pointer")
    latest_as_of = latest.get("as_of")
    if not isinstance(latest_as_of, str):
        raise TypeError(f"Latest publication has no as_of: {latest_file}")
    try:
        current_as_of = date.fromisoformat(latest_as_of)
    except ValueError as error:
        raise ValueError(f"Latest publication has an invalid as_of: {latest_file}") from error
    # A historical replay must not move the consumer-facing pointer backwards.
    return candidate_as_of >= current_as_of


def _resolve_artifact(value: dict, source: Path, relative_to: Path, allowed_directory: Path) -> Path:
    filename = required_text(value, "file", source)
    candidate = (relative_to / filename).resolve()
    try:
        candidate.relative_to(allowed_directory.resolve())
    except ValueError as error:
        raise ValueError(f"Artifact is outside {allowed_directory}: {candidate}") from error
    if not candidate.is_file():
        raise FileNotFoundError(f"Missing artifact: {candidate}")

    content = candidate.read_bytes()
    expected_hash = required_text(value, "sha256", source)
    if sha256_bytes(content) != expected_hash:
        raise ValueError(f"Artifact hash changed: {candidate}")
    expected_bytes = value.get("bytes")
    if isinstance(expected_bytes, bool) or not isinstance(expected_bytes, int):
        raise TypeError(f"Artifact byte count is invalid in {source}")
    if len(content) != expected_bytes:
        raise ValueError(f"Artifact byte count changed: {candidate}")
    return candidate


def _validate_publication(publication: dict, pointer: dict, company: CompanyConfig, source: Path) -> None:
    identity = required_object(publication, "company", source)
    if identity.get("slug") != company.slug or identity.get("cik") != company.cik:
        raise ValueError(f"Company identity changed in {source}")
    required_text(identity, "entity", source)

    publication_id = required_text(publication, "publication_id", source)
    if publication_id != pointer.get("publication_id"):
        raise ValueError(f"Publication ID does not match {source}")
    as_of = required_text(publication, "as_of", source)
    if as_of != pointer.get("as_of"):
        raise ValueError(f"Publication as_of does not match {source}")
    schema_version = publication.get("schema_version")
    if isinstance(schema_version, bool) or not isinstance(schema_version, int):
        raise TypeError(f"Publication has no integer schema version: {source}")

    required_list(publication, "evidence", source)
    required_list(publication, "issues", source)
    provenance = required_object(publication, "provenance", source)
    if provenance.get("run_id") != publication_id:
        raise ValueError(f"Publication run ID does not match {source}")
    required_text(provenance, "configuration_sha256", source)
    source_details = required_object(provenance, "source", source)
    for field in ("type", "url", "fetched_at", "sha256"):
        required_text(source_details, field, source)
    representation = required_object(source_details, "representation", source)
    required_text(representation, "kind", source)


