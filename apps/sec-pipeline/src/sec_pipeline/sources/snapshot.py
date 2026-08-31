"""Preserve one immutable Company Facts input for a logical company run."""

import json
from dataclasses import dataclass
from datetime import UTC, datetime
from pathlib import Path

from ..models import CompanyConfig, SourceSnapshot
from ..storage import (
    artifact,
    display_path,
    required_object,
    required_text,
    sha256_bytes,
    sha256_file,
    write_bytes,
    write_json,
)
from .store import load_company_facts

SCHEMA_VERSION = 2


@dataclass(frozen=True)
class SourceProvenance:
    """Provenance fields that publishing may consume from a source snapshot."""

    url: str
    fetched_at: str
    representation: dict


def preserve_source(
    company: CompanyConfig, data_directory: Path, pipeline_directory: Path, as_of: str, configuration_sha256: str
) -> SourceSnapshot:
    """Copy validated source-store artifacts into a deterministic run directory."""
    archived = load_company_facts(company.source.manifest, company.cik)
    content = archived.content
    company_facts = archived.company_facts
    cik = company.cik

    source_hash = sha256_bytes(content)
    source_manifest_hash = sha256_file(archived.manifest_file)
    # Logical identity excludes wall-clock time, so replaying the same inputs is idempotent.
    run_id = f"{as_of}-{source_hash[:10]}-{source_manifest_hash[:10]}-{configuration_sha256[:10]}"
    run_directory = data_directory / company.slug / "runs" / run_id
    raw_directory = run_directory / "raw"
    raw_file = raw_directory / "companyfacts.json"
    manifest_file = raw_directory / "manifest.json"
    source_manifest_file = raw_directory / "source-manifest.json"
    upstream_file = raw_directory / "acquisition-manifest.json"

    if not raw_file.exists() or sha256_file(raw_file) != source_hash:
        write_bytes(raw_file, content)

    source_manifest = _preserve_metadata_file(
        archived.manifest_file, source_manifest_file, run_directory, pipeline_directory
    )
    upstream = _preserve_metadata_file(
        archived.acquisition_manifest_file, upstream_file, run_directory, pipeline_directory
    )
    expected_source = {
        "kind": "company_facts_source_store",
        "manifest": source_manifest,
        "document": archived.document.manifest_value(),
    }

    raw_artifact = artifact(raw_file, run_directory)
    company_identity = {"slug": company.slug, "entity": company_facts["entityName"], "cik": cik}
    representation = {
        "run_copy": "Byte-for-byte copy of the source-store document.",
        "source": archived.document.representation,
    }
    existing_manifest = _existing_manifest(manifest_file)
    if (
        existing_manifest.get("schema_version") != SCHEMA_VERSION
        or existing_manifest.get("company") != company_identity
        or existing_manifest.get("representation") != representation
        or existing_manifest.get("source") != expected_source
        or existing_manifest.get("artifact") != raw_artifact
        or existing_manifest.get("upstream_manifest") != upstream
    ):
        manifest = {
            "schema_version": SCHEMA_VERSION,
            "company": company_identity,
            "preserved_at": datetime.now(UTC).isoformat(),
            "representation": representation,
            "source": expected_source,
            "artifact": raw_artifact,
            "upstream_manifest": upstream,
        }
        write_json(manifest_file, manifest)

    return SourceSnapshot(
        run_id=run_id,
        configuration_sha256=configuration_sha256,
        run_directory=run_directory,
        raw_file=raw_file,
        manifest_file=manifest_file,
        raw_sha256=source_hash,
        entity=company_facts["entityName"],
        cik=cik,
    )


def load_source_provenance(snapshot: SourceSnapshot) -> SourceProvenance:
    """Load the provenance fields owned by the preserved-source artifact."""
    try:
        manifest = json.loads(snapshot.manifest_file.read_text(encoding="utf-8"))
    except json.JSONDecodeError as error:
        raise ValueError(f"Invalid raw manifest JSON: {snapshot.manifest_file}") from error
    if not isinstance(manifest, dict) or manifest.get("schema_version") != SCHEMA_VERSION:
        raise ValueError(f"Unsupported raw manifest schema: {snapshot.manifest_file}")

    company = required_object(manifest, "company", snapshot.manifest_file)
    if company.get("entity") != snapshot.entity or company.get("cik") != snapshot.cik:
        raise ValueError(f"Company identity changed in {snapshot.manifest_file}")
    raw_artifact = required_object(manifest, "artifact", snapshot.manifest_file)
    if raw_artifact.get("sha256") != snapshot.raw_sha256:
        raise ValueError(f"Source hash changed in {snapshot.manifest_file}")

    source = required_object(manifest, "source", snapshot.manifest_file)
    document = required_object(source, "document", snapshot.manifest_file)
    representation = required_object(document, "representation", snapshot.manifest_file)
    required_text(representation, "kind", snapshot.manifest_file)
    return SourceProvenance(
        url=required_text(document, "url", snapshot.manifest_file),
        fetched_at=required_text(document, "fetched_at", snapshot.manifest_file),
        representation=representation,
    )


def _preserve_metadata_file(source: Path, target: Path, run_directory: Path, pipeline_directory: Path) -> dict:
    content = source.read_bytes()
    source_hash = sha256_bytes(content)
    if not target.exists() or sha256_file(target) != source_hash:
        write_bytes(target, content)
    return {"source_file": display_path(source, pipeline_directory), **artifact(target, run_directory)}


def _existing_manifest(path: Path) -> dict:
    if not path.exists():
        return {}
    try:
        return json.loads(path.read_text(encoding="utf-8"))
    except json.JSONDecodeError:
        return {}


