"""Publish a self-contained, versioned handoff for downstream consumers."""

import json
from pathlib import Path

from ..models import CompanyConfig, DeliveryResult
from ..storage import artifact, sha256_bytes, write_bytes, write_json
from .company import CompanyPublication, load_latest_company_publication

SCHEMA_VERSION = 1
CONTRACT_TYPE = "company_evidence_publications"


def publish_delivery(
    companies: tuple[CompanyConfig, ...], data_directory: Path, pipeline_directory: Path
) -> DeliveryResult:
    """Bundle validated latest publications into one content-addressed handoff."""
    publications = sorted(
        (load_latest_company_publication(company, data_directory, pipeline_directory) for company in companies),
        key=lambda candidate_publication: candidate_publication.company_slug,
    )
    delivery_id = _delivery_id(publications)
    deliveries_directory = data_directory / "deliveries"
    bundle_directory = deliveries_directory / "bundles" / delivery_id
    publication_directory = bundle_directory / "publications"

    publication_entries = []
    for company_publication in publications:
        destination = publication_directory / f"{company_publication.company_slug}.json"
        _write_immutable(destination, company_publication.content)
        publication_entries.append(
            {
                "company": company_publication.company_identity,
                "publication_id": company_publication.publication_id,
                "publication_schema_version": company_publication.schema_version,
                "as_of": company_publication.as_of,
                "artifact": artifact(destination, bundle_directory),
            }
        )

    publication_bytes = sum(entry["artifact"]["bytes"] for entry in publication_entries)
    manifest = {
        "schema_version": SCHEMA_VERSION,
        "delivery_id": delivery_id,
        "contract": {
            "type": CONTRACT_TYPE,
            "publication_schema_versions": sorted({publication.schema_version for publication in publications}),
        },
        "publication_count": len(publication_entries),
        "publication_bytes": publication_bytes,
        "publications": publication_entries,
    }
    manifest_file = bundle_directory / "manifest.json"
    _write_immutable(manifest_file, _json_bytes(manifest))

    latest_pointer_file = deliveries_directory / "latest.json"
    write_json(
        latest_pointer_file,
        {
            "schema_version": SCHEMA_VERSION,
            "delivery_id": delivery_id,
            "manifest": artifact(manifest_file, deliveries_directory),
        },
    )
    return DeliveryResult(
        delivery_id=delivery_id,
        manifest_file=manifest_file,
        latest_pointer_file=latest_pointer_file,
        publication_count=len(publication_entries),
        publication_bytes=publication_bytes,
    )


def _delivery_id(publications: list[CompanyPublication]) -> str:
    # Only consumer-visible identity participates, keeping equivalent bundles stable.
    identity = {
        "schema_version": SCHEMA_VERSION,
        "contract_type": CONTRACT_TYPE,
        "publications": [
            {
                "company_slug": publication.company_slug,
                "cik": publication.cik,
                "publication_id": publication.publication_id,
                "publication_schema_version": publication.schema_version,
                "as_of": publication.as_of,
                "sha256": publication.sha256,
                "bytes": len(publication.content),
            }
            for publication in publications
        ],
    }
    return sha256_bytes(_canonical_json_bytes(identity))


def _write_immutable(path: Path, content: bytes) -> None:
    if path.exists():
        if not path.is_file() or path.read_bytes() != content:
            raise ValueError(f"Delivery ID collision with different content: {path}")
        return
    write_bytes(path, content)


def _json_bytes(value: object) -> bytes:
    return (json.dumps(value, indent=2) + "\n").encode("utf-8")


def _canonical_json_bytes(value: object) -> bytes:
    return json.dumps(value, sort_keys=True, separators=(",", ":")).encode()
