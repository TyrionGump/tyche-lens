"""Apple's reviewed evidence profile and company-specific SEC concepts."""

from pathlib import Path

from ..models import ArchivedCompanyFactsSource, CompanyConfig, EvidenceDefinition
from .common import NON_FINANCIAL_COMMON_EVIDENCE

AAPL_REVENUE = EvidenceDefinition(
    name="revenue",
    label="Revenue",
    category="common",
    taxonomy="us-gaap",
    tag="RevenueFromContractWithCustomerExcludingAssessedTax",
    unit="USD",
    period_type="duration",
    reason="Use Apple's current total net sales concept.",
)

AAPL_SPECIFIC_EVIDENCE = (
    EvidenceDefinition(
        name="marketable_securities_current",
        label="Current marketable securities",
        category="company_specific",
        taxonomy="us-gaap",
        tag="MarketableSecuritiesCurrent",
        unit="USD",
        period_type="instant",
        reason="Retain current marketable securities separately from cash.",
    ),
    EvidenceDefinition(
        name="marketable_securities_noncurrent",
        label="Noncurrent marketable securities",
        category="company_specific",
        taxonomy="us-gaap",
        tag="MarketableSecuritiesNoncurrent",
        unit="USD",
        period_type="instant",
        reason="Retain noncurrent marketable securities separately from cash.",
    ),
    EvidenceDefinition(
        name="commercial_paper",
        label="Commercial paper",
        category="company_specific",
        taxonomy="us-gaap",
        tag="CommercialPaper",
        unit="USD",
        period_type="instant",
        reason="Retain the reported short-term commercial paper balance.",
    ),
)


def build_aapl_profile(source_manifest: Path) -> CompanyConfig:
    return CompanyConfig(
        slug="aapl",
        cik="0000320193",
        source=ArchivedCompanyFactsSource(manifest=source_manifest),
        period_anchor="revenue",
        evidence=(AAPL_REVENUE, *NON_FINANCIAL_COMMON_EVIDENCE, *AAPL_SPECIFIC_EVIDENCE),
    )
