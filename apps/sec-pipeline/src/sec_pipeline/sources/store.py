"""Own the durable, hash-validated Company Facts source-store contract."""

import json
from dataclasses import dataclass
from pathlib import Path

from ..models import CollectedCompanyFacts
from ..storage import (
    artifact,
    parse_json_object,
    required_object,
    required_text,
    sha256_bytes,
    sha256_file,
    write_bytes,
    write_json,
)

SCHEMA_VERSION = 1
SOURCE_TYPE = "sec_company_facts"


@dataclass(frozen=True)
class CompanyFactsDocument:
    """Validated document metadata exposed to downstream source stages."""

    file: str
    sha256: str
    byte_count: int
    acquisition_file: str
    url: str
    fetched_at: str
    representation: dict

    def manifest_value(self) -> dict:
        """Return the validated source-store representation for preservation."""
        return {
            "file": self.file,
            "sha256": self.sha256,
            "bytes": self.byte_count,
            "acquisition_file": self.acquisition_file,
            "url": self.url,
            "fetched_at": self.fetched_at,
            "representation": self.representation,
        }


@dataclass(frozen=True)
class CompanyFactsInput:
    """Validated Company Facts bytes, metadata, and resolved local artifacts."""

    content: bytes
    company_facts: dict
    document: CompanyFactsDocument
    manifest_file: Path
    document_file: Path
    acquisition_manifest_file: Path


@dataclass(frozen=True)
class StoredCompanyFacts:
    manifest_file: Path
    changed: bool


def import_company_facts(
    source_file: Path, acquisition_manifest_file: Path, destination: Path, expected_cik: str
) -> Path:
    """Import one saved Company Facts document into the pipeline source store."""
    content = source_file.read_bytes()
    acquisition_content = acquisition_manifest_file.read_bytes()
    stored = _store_company_facts(
        content=content,
        acquisition_content=acquisition_content,
        acquisition_filename=source_file.name,
        source_label=source_file,
        destination=destination,
        expected_cik=expected_cik,
    )
    return stored.manifest_file


def store_collected_company_facts(
    collected: CollectedCompanyFacts, destination: Path, expected_cik: str
) -> StoredCompanyFacts:
    """Store a live SEC response together with its acquisition provenance."""
    retrieval = {"method": "https", "content_encoding": collected.content_encoding}
    if collected.transformation is not None:
        retrieval["transformation"] = collected.transformation

    acquisition_manifest = {
        "schema_version": 1,
        "provider": "sec_edgar",
        "cik": expected_cik,
        "documents": [
            {
                "file": "companyfacts.json",
                "source": collected.url,
                "fetched_at": collected.fetched_at,
                "sha256": sha256_bytes(collected.content),
                "retrieval": retrieval,
                "http": {"status": collected.status_code, "headers": collected.response_headers},
            }
        ],
    }
    acquisition_content = (json.dumps(acquisition_manifest, indent=2) + "\n").encode("utf-8")
    return _store_company_facts(
        content=collected.content,
        acquisition_content=acquisition_content,
        acquisition_filename="companyfacts.json",
        source_label=Path("live-companyfacts.json"),
        destination=destination,
        expected_cik=expected_cik,
    )


def _store_company_facts(
    content: bytes,
    acquisition_content: bytes,
    acquisition_filename: str,
    source_label: Path,
    destination: Path,
    expected_cik: str,
) -> StoredCompanyFacts:
    company_facts = parse_company_facts(content, source_label)
    cik = str(company_facts["cik"]).zfill(10)
    if cik != expected_cik:
        raise ValueError(f"Expected CIK {expected_cik}, but {source_label} contains {cik}")

    acquisition_manifest = parse_json_object(acquisition_content, source_label, "acquisition manifest")
    manifest_cik = str(acquisition_manifest.get("cik", "")).zfill(10)
    if manifest_cik != expected_cik:
        raise ValueError(f"Expected CIK {expected_cik}, but the acquisition manifest declares {manifest_cik}")

    source_hash = sha256_bytes(content)
    source_record = _find_source_record(acquisition_manifest, acquisition_filename, source_hash, source_label)
    source_url = required_text(source_record, "source", source_label)
    fetched_at = required_text(source_record, "fetched_at", source_label)
    representation = _representation(source_record)

    document_file = destination / "companyfacts.json"
    preserved_acquisition_manifest = destination / "acquisition-manifest.json"
    manifest_file = destination / "manifest.json"

    if manifest_file.exists():
        existing = load_company_facts(manifest_file, expected_cik)
        if existing.document.sha256 == source_hash:
            return StoredCompanyFacts(manifest_file=manifest_file, changed=False)

    write_bytes(document_file, content)
    write_bytes(preserved_acquisition_manifest, acquisition_content)

    document = {
        **artifact(document_file, destination),
        "acquisition_file": acquisition_filename,
        "url": source_url,
        "fetched_at": fetched_at,
        "representation": representation,
    }
    manifest = {
        "schema_version": SCHEMA_VERSION,
        "source_type": SOURCE_TYPE,
        "company": {"cik": cik, "entity": company_facts["entityName"]},
        "document": document,
        "acquisition_manifest": artifact(preserved_acquisition_manifest, destination),
    }
    write_json(manifest_file, manifest)
    load_company_facts(manifest_file, expected_cik)
    return StoredCompanyFacts(manifest_file=manifest_file, changed=True)


def load_company_facts(manifest_file: Path, expected_cik: str) -> CompanyFactsInput:
    """Load a source only after validating its schema, identity, hashes, and paths."""
    if not manifest_file.exists():
        raise FileNotFoundError(f"No Company Facts source-store manifest exists: {manifest_file}")

    manifest = parse_json_object(manifest_file.read_bytes(), manifest_file, "source-store manifest")
    if manifest.get("schema_version") != SCHEMA_VERSION:
        raise ValueError(f"Unsupported source-store schema: {manifest_file}")
    if manifest.get("source_type") != SOURCE_TYPE:
        raise ValueError(f"Unexpected source type in {manifest_file}")

    company = required_object(manifest, "company", manifest_file)
    document = required_object(manifest, "document", manifest_file)
    acquisition = required_object(manifest, "acquisition_manifest", manifest_file)
    declared_cik = required_text(company, "cik", manifest_file)
    if declared_cik != expected_cik:
        raise ValueError(f"Expected CIK {expected_cik}, but {manifest_file} declares {declared_cik!r}")

    document_file = _resolve_artifact(manifest_file, document, "document")
    acquisition_manifest_file = _resolve_artifact(manifest_file, acquisition, "acquisition manifest")
    content = document_file.read_bytes()
    company_facts = parse_company_facts(content, document_file)
    cik = str(company_facts["cik"]).zfill(10)
    if cik != expected_cik or company_facts["entityName"] != company.get("entity"):
        raise ValueError(f"Company identity does not match {manifest_file}")

    document_url = required_text(document, "url", manifest_file)
    document_fetched_at = required_text(document, "fetched_at", manifest_file)
    acquisition_file = required_text(document, "acquisition_file", manifest_file)
    representation = document.get("representation")
    if not isinstance(representation, dict):
        raise TypeError(f"Missing representation metadata in {manifest_file}")
    required_text(representation, "kind", manifest_file)
    required_text(representation, "description", manifest_file)
    acquisition_manifest = parse_json_object(
        acquisition_manifest_file.read_bytes(), acquisition_manifest_file, "acquisition manifest"
    )
    manifest_cik = str(acquisition_manifest.get("cik", "")).zfill(10)
    if manifest_cik != expected_cik:
        raise ValueError(f"Expected CIK {expected_cik}, but {acquisition_manifest_file} declares {manifest_cik}")
    source_record = _find_source_record(
        acquisition_manifest,
        acquisition_file,
        document["sha256"],
        acquisition_manifest_file,
    )
    expected_metadata = {
        "url": required_text(source_record, "source", acquisition_manifest_file),
        "fetched_at": required_text(source_record, "fetched_at", acquisition_manifest_file),
        "representation": _representation(source_record),
    }
    actual_metadata = {field: document.get(field) for field in expected_metadata}
    if actual_metadata != expected_metadata:
        raise ValueError(f"Document metadata does not match {acquisition_manifest_file}")

    return CompanyFactsInput(
        content=content,
        company_facts=company_facts,
        document=CompanyFactsDocument(
            file=required_text(document, "file", manifest_file),
            sha256=required_text(document, "sha256", manifest_file),
            byte_count=document["bytes"],
            acquisition_file=acquisition_file,
            url=document_url,
            fetched_at=document_fetched_at,
            representation=representation,
        ),
        manifest_file=manifest_file,
        document_file=document_file,
        acquisition_manifest_file=acquisition_manifest_file,
    )


def parse_company_facts(content: bytes, source_file: Path) -> dict:
    """Parse the minimum SEC Company Facts shape required by later stages."""
    company_facts = parse_json_object(content, source_file, "Company Facts")
    required = ("cik", "entityName", "facts")
    missing = [field for field in required if field not in company_facts]
    if missing:
        raise ValueError(f"Company Facts {source_file} is missing fields: {missing}")
    if not isinstance(company_facts["facts"], dict):
        raise TypeError(f"Company Facts 'facts' must be an object: {source_file}")
    return company_facts


def _find_source_record(manifest: dict, filename: str, expected_sha256: str, manifest_file: Path) -> dict:
    documents = manifest.get("documents")
    if not isinstance(documents, list):
        raise TypeError(f"No document list exists in {manifest_file}")
    matches = [document for document in documents if isinstance(document, dict) and document.get("file") == filename]
    if len(matches) != 1:
        raise ValueError(f"Expected one {filename!r} record in {manifest_file}, found {len(matches)}")
    document = matches[0]
    if document.get("sha256") != expected_sha256:
        raise ValueError(f"Source hash does not match {manifest_file}")
    return document


def _representation(source_record: dict) -> dict:
    retrieval = source_record.get("retrieval")
    transformation = retrieval.get("transformation") if isinstance(retrieval, dict) else None
    if transformation:
        return {"kind": "transformed_snapshot", "description": transformation}
    return {
        "kind": "saved_response",
        "description": "Saved response bytes; the acquisition manifest declares no transformation.",
    }


def _resolve_artifact(manifest_file: Path, value: dict, label: str) -> Path:
    filename = required_text(value, "file", manifest_file)
    candidate = (manifest_file.parent / filename).resolve()
    try:
        candidate.relative_to(manifest_file.parent.resolve())
    except ValueError as error:
        raise ValueError(f"Unsafe {label} path in {manifest_file}") from error
    if not candidate.is_file():
        raise FileNotFoundError(f"Missing {label}: {candidate}")

    expected_hash = required_text(value, "sha256", manifest_file)
    if sha256_file(candidate) != expected_hash:
        raise ValueError(f"Hash mismatch for {label}: {candidate}")
    expected_bytes = value.get("bytes")
    if not isinstance(expected_bytes, int) or candidate.stat().st_size != expected_bytes:
        raise ValueError(f"Byte-count mismatch for {label}: {candidate}")
    return candidate


