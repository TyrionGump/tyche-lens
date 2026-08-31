"""Walmart's reviewed evidence profile and company-specific SEC concepts."""

from pathlib import Path

from ..models import ArchivedCompanyFactsSource, CompanyConfig, EvidenceDefinition
from .common import NON_FINANCIAL_COMMON_EVIDENCE

WALMART_REVENUE = EvidenceDefinition(
    name="revenue",
    label="Revenue",
    category="common",
    taxonomy="us-gaap",
    tag="Revenues",
    unit="USD",
    period_type="duration",
    reason="Use total revenue rather than the narrower contract-revenue concept.",
)

WALMART_SPECIFIC_EVIDENCE = (
    EvidenceDefinition(
        name="inventory",
        label="Inventory",
        category="company_specific",
        taxonomy="us-gaap",
        tag="InventoryNet",
        unit="USD",
        period_type="instant",
        reason="Retain the reported inventory balance.",
    ),
    EvidenceDefinition(
        name="accounts_payable",
        label="Accounts payable",
        category="company_specific",
        taxonomy="us-gaap",
        tag="AccountsPayableCurrent",
        unit="USD",
        period_type="instant",
        reason="Retain the reported current accounts-payable balance.",
    ),
)


def build_walmart_profile(source_manifest: Path) -> CompanyConfig:
    return CompanyConfig(
        slug="walmart",
        cik="0000104169",
        source=ArchivedCompanyFactsSource(manifest=source_manifest),
        period_anchor="revenue",
        evidence=(WALMART_REVENUE, *NON_FINANCIAL_COMMON_EVIDENCE, *WALMART_SPECIFIC_EVIDENCE),
    )
