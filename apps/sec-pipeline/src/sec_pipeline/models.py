"""Immutable domain, policy, and stage-result contracts shared by the pipeline."""

from dataclasses import dataclass, field
from pathlib import Path
from typing import Literal

PeriodType = Literal["duration", "instant"]
EvidenceCategory = Literal["common", "company_specific"]
AcquisitionMode = Literal["replay", "live"]
AcquisitionStatus = Literal["replayed", "downloaded", "unchanged"]


@dataclass(frozen=True)
class EvidenceDefinition:
    """Reviewed mapping from a domain evidence name to one SEC XBRL fact."""

    name: str
    label: str
    category: EvidenceCategory
    taxonomy: str
    tag: str
    unit: str
    period_type: PeriodType
    reason: str


@dataclass(frozen=True)
class ArchivedCompanyFactsSource:
    manifest: Path


@dataclass(frozen=True)
class CompanyConfig:
    """Reviewed company profile, source location, and annual-period anchor."""

    slug: str
    cik: str
    source: ArchivedCompanyFactsSource
    period_anchor: str
    evidence: tuple[EvidenceDefinition, ...]


@dataclass(frozen=True)
class SecAcquisitionSettings:
    mode: AcquisitionMode = "replay"
    user_agent: str = ""
    request_timeout_seconds: float = 30.0
    minimum_request_interval_seconds: float = 0.2
    max_attempts: int = 3


@dataclass(frozen=True)
class SelectionPolicy:
    """Rules for deciding which annual SEC observations are eligible."""

    annual_forms: tuple[str, ...] = ("10-K", "10-K/A")
    fiscal_period: str = "FY"
    annual_duration_days: tuple[int, int] = (300, 400)
    period_count: int = 3


@dataclass(frozen=True)
class PipelineSettings:
    """Top-level run configuration from which the runner passes narrower inputs."""

    data_directory: Path
    as_of: str
    companies: tuple[CompanyConfig, ...]
    acquisition: SecAcquisitionSettings = field(default_factory=SecAcquisitionSettings)
    selection: SelectionPolicy = field(default_factory=SelectionPolicy)


@dataclass(frozen=True)
class SourceSnapshot:
    """Immutable per-run source identity and artifacts passed to evidence stages."""

    run_id: str
    configuration_sha256: str
    run_directory: Path
    raw_file: Path
    manifest_file: Path
    raw_sha256: str
    entity: str
    cik: str


@dataclass(frozen=True)
class CollectedCompanyFacts:
    content: bytes
    url: str
    fetched_at: str
    status_code: int
    response_headers: dict[str, str]
    content_encoding: str
    transformation: str | None


@dataclass(frozen=True)
class AcquisitionResult:
    mode: AcquisitionMode
    status: AcquisitionStatus
    source_manifest_file: Path
    source_sha256: str
    source_url: str
    source_fetched_at: str
    request_finished_at: str | None


@dataclass(frozen=True)
class NormalizationResult:
    observations_file: Path
    catalog_file: Path
    observation_count: int
    concept_count: int


@dataclass(frozen=True)
class SelectionResult:
    evidence_file: Path
    evidence_count: int
    reported_observation_count: int
    issue_count: int


@dataclass(frozen=True)
class PublicationResult:
    publication_id: str
    publication_file: Path
    latest_updated: bool


@dataclass(frozen=True)
class DeliveryResult:
    delivery_id: str
    manifest_file: Path
    latest_pointer_file: Path
    publication_count: int
    publication_bytes: int
