"""JPMorgan's bank-specific reviewed evidence profile."""

from pathlib import Path

from ..models import ArchivedCompanyFactsSource, CompanyConfig, EvidenceDefinition
from .common import DILUTED_EPS, DILUTED_WEIGHTED_AVERAGE_SHARES, NET_INCOME

JPMORGAN_REVENUE = EvidenceDefinition(
    name="revenue",
    label="Revenue, net of interest expense",
    category="common",
    taxonomy="us-gaap",
    tag="RevenuesNetOfInterestExpense",
    unit="USD",
    period_type="duration",
    reason=(
        "Use the reported bank revenue concept after interest expense rather "
        "than a non-financial-company revenue concept."
    ),
)

JPMORGAN_INCOME_STATEMENT_EVIDENCE = (
    EvidenceDefinition(
        name="net_interest_income",
        label="Net interest income",
        category="company_specific",
        taxonomy="us-gaap",
        tag="InterestIncomeExpenseNet",
        unit="USD",
        period_type="duration",
        reason="Retain reported net interest income as a bank-specific component.",
    ),
    EvidenceDefinition(
        name="noninterest_income",
        label="Noninterest income",
        category="company_specific",
        taxonomy="us-gaap",
        tag="NoninterestIncome",
        unit="USD",
        period_type="duration",
        reason="Retain reported noninterest income as a separate component.",
    ),
    EvidenceDefinition(
        name="noninterest_expense",
        label="Noninterest expense",
        category="company_specific",
        taxonomy="us-gaap",
        tag="NoninterestExpense",
        unit="USD",
        period_type="duration",
        reason="Retain reported noninterest expense without deriving a ratio.",
    ),
    EvidenceDefinition(
        name="provision_for_credit_losses",
        label="Provision for credit losses",
        category="company_specific",
        taxonomy="us-gaap",
        tag="ProvisionForLoanLeaseAndOtherLosses",
        unit="USD",
        period_type="duration",
        reason="Retain the reported provision without interpreting credit quality.",
    ),
)

JPMORGAN_BALANCE_SHEET_EVIDENCE = (
    EvidenceDefinition(
        name="assets",
        label="Assets",
        category="company_specific",
        taxonomy="us-gaap",
        tag="Assets",
        unit="USD",
        period_type="instant",
        reason="Match the reported asset balance to the annual period end date.",
    ),
    EvidenceDefinition(
        name="deposits",
        label="Deposits",
        category="company_specific",
        taxonomy="us-gaap",
        tag="Deposits",
        unit="USD",
        period_type="instant",
        reason="Match the reported deposit balance to the annual period end date.",
    ),
)

JPMORGAN_EVIDENCE = (
    JPMORGAN_REVENUE,
    *JPMORGAN_INCOME_STATEMENT_EVIDENCE,
    NET_INCOME,
    DILUTED_EPS,
    DILUTED_WEIGHTED_AVERAGE_SHARES,
    *JPMORGAN_BALANCE_SHEET_EVIDENCE,
)


def build_jpmorgan_profile(source_manifest: Path) -> CompanyConfig:
    return CompanyConfig(
        slug="jpmorgan",
        cik="0000019617",
        source=ArchivedCompanyFactsSource(manifest=source_manifest),
        period_anchor="revenue",
        evidence=JPMORGAN_EVIDENCE,
    )
