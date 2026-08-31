import json
from pathlib import Path

from sec_pipeline.models import ArchivedCompanyFactsSource, CompanyConfig, EvidenceDefinition, PipelineSettings
from sec_pipeline.sources.store import import_company_facts
from sec_pipeline.storage import sha256_bytes

CIK = "0001234567"
SLUG = "synthetic"
ENTITY = "Synthetic Pipeline Fixture Inc."
AS_OF = "2025-12-31"


def install_synthetic_source(root: Path) -> tuple[Path, Path]:
    """Install declared synthetic Company Facts data in a source store."""
    fixture_directory = root / "fixture"
    fixture_directory.mkdir(parents=True)
    source_file = fixture_directory / "companyfacts.json"
    acquisition_file = fixture_directory / "acquisition-manifest.json"

    content = _json_bytes(_company_facts())
    source_file.write_bytes(content)
    acquisition_file.write_bytes(
        _json_bytes(
            {
                "schema_version": 1,
                "provider": "synthetic_test_fixture",
                "cik": CIK,
                "documents": [
                    {
                        "file": source_file.name,
                        "source": f"https://data.sec.gov/api/xbrl/companyfacts/CIK{CIK}.json",
                        "fetched_at": "2025-01-15T00:00:00+00:00",
                        "sha256": sha256_bytes(content),
                        "retrieval": {
                            "method": "synthetic_test_fixture",
                            "transformation": "Synthetic test data; not an SEC response.",
                        },
                    }
                ],
            }
        )
    )

    data_directory = root / "data"
    manifest = import_company_facts(
        source_file=source_file,
        acquisition_manifest_file=acquisition_file,
        destination=data_directory / "sources" / SLUG,
        expected_cik=CIK,
    )
    return data_directory, manifest


def company_config(manifest: Path) -> CompanyConfig:
    revenue = EvidenceDefinition(
        name="revenue",
        label="Revenue",
        category="common",
        taxonomy="us-gaap",
        tag="Revenues",
        unit="USD",
        period_type="duration",
        reason="Anchor recent annual periods using reported revenue.",
    )
    net_income = EvidenceDefinition(
        name="net_income",
        label="Net income",
        category="common",
        taxonomy="us-gaap",
        tag="NetIncomeLoss",
        unit="USD",
        period_type="duration",
        reason="Retain reported annual net income when present.",
    )
    return CompanyConfig(
        slug=SLUG,
        cik=CIK,
        source=ArchivedCompanyFactsSource(manifest=manifest),
        period_anchor=revenue.name,
        evidence=(revenue, net_income),
    )


def pipeline_settings(data_directory: Path, manifest: Path) -> PipelineSettings:
    return PipelineSettings(data_directory=data_directory, as_of=AS_OF, companies=(company_config(manifest),))


def company_facts_bytes() -> bytes:
    return _json_bytes(_company_facts())


def _company_facts() -> dict:
    return {
        "cik": int(CIK),
        "entityName": ENTITY,
        "facts": {
            "us-gaap": {
                "Revenues": _concept(
                    "Revenue",
                    [
                        _annual_fact("2021-01-01", "2021-12-31", 100, "2022-02-01", "0001234567-22-000001", 2021),
                        _annual_fact("2022-01-01", "2022-12-31", 120, "2023-02-01", "0001234567-23-000001", 2022),
                        _annual_fact(
                            "2022-01-01", "2022-12-31", 125, "2023-03-01", "0001234567-23-000002", 2022, form="10-K/A"
                        ),
                        _annual_fact("2023-01-01", "2023-12-31", 150, "2024-02-01", "0001234567-24-000001", 2023),
                        _annual_fact("2024-01-01", "2024-12-31", 175, "2026-01-10", "0001234567-26-000001", 2024),
                    ],
                ),
                "NetIncomeLoss": _concept(
                    "Net income",
                    [
                        _annual_fact("2021-01-01", "2021-12-31", 10, "2022-02-01", "0001234567-22-000001", 2021),
                        _annual_fact("2023-01-01", "2023-12-31", 15, "2024-02-01", "0001234567-24-000001", 2023),
                    ],
                ),
            }
        },
    }


def _concept(label: str, observations: list[dict]) -> dict:
    return {
        "label": label,
        "description": f"Synthetic {label.lower()} test observations.",
        "units": {"USD": observations},
    }


def _annual_fact(
    start: str, end: str, value: int, filed: str, accession: str, fiscal_year: int, form: str = "10-K"
) -> dict:
    return {
        "start": start,
        "end": end,
        "val": value,
        "accn": accession,
        "fy": fiscal_year,
        "fp": "FY",
        "form": form,
        "filed": filed,
    }


def _json_bytes(value: object) -> bytes:
    return (json.dumps(value, indent=2) + "\n").encode("utf-8")
