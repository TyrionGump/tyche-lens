"""Reviewed evidence definitions shared by non-financial company profiles."""

from ..models import EvidenceDefinition

GROSS_PROFIT = EvidenceDefinition(
    name="gross_profit",
    label="Gross profit",
    category="common",
    taxonomy="us-gaap",
    tag="GrossProfit",
    unit="USD",
    period_type="duration",
    reason="Use directly reported standardized gross profit; do not derive it.",
)

NET_INCOME = EvidenceDefinition(
    name="net_income",
    label="Net income",
    category="common",
    taxonomy="us-gaap",
    tag="NetIncomeLoss",
    unit="USD",
    period_type="duration",
    reason="Use reported standardized net income or loss for the entity.",
)

OPERATING_CASH_FLOW = EvidenceDefinition(
    name="operating_cash_flow",
    label="Operating cash flow",
    category="common",
    taxonomy="us-gaap",
    tag="NetCashProvidedByUsedInOperatingActivities",
    unit="USD",
    period_type="duration",
    reason="Use reported cash provided by or used in operating activities.",
)

CAPITAL_EXPENDITURE = EvidenceDefinition(
    name="capital_expenditure",
    label="Capital expenditure",
    category="common",
    taxonomy="us-gaap",
    tag="PaymentsToAcquirePropertyPlantAndEquipment",
    unit="USD",
    period_type="duration",
    reason="Use reported cash paid for property, plant, and equipment.",
)

DILUTED_EPS = EvidenceDefinition(
    name="diluted_eps",
    label="Diluted EPS",
    category="common",
    taxonomy="us-gaap",
    tag="EarningsPerShareDiluted",
    unit="USD/shares",
    period_type="duration",
    reason="Require the reported monetary-per-share unit.",
)

DILUTED_WEIGHTED_AVERAGE_SHARES = EvidenceDefinition(
    name="diluted_weighted_average_shares",
    label="Diluted weighted-average shares",
    category="common",
    taxonomy="us-gaap",
    tag="WeightedAverageNumberOfDilutedSharesOutstanding",
    unit="shares",
    period_type="duration",
    reason="Use reported diluted weighted-average shares for the annual period.",
)

CASH_AND_CASH_EQUIVALENTS = EvidenceDefinition(
    name="cash_and_cash_equivalents",
    label="Cash and cash equivalents",
    category="common",
    taxonomy="us-gaap",
    tag="CashAndCashEquivalentsAtCarryingValue",
    unit="USD",
    period_type="instant",
    reason="Match the reported balance to the annual period end date.",
)

NON_FINANCIAL_COMMON_EVIDENCE = (
    GROSS_PROFIT,
    NET_INCOME,
    OPERATING_CASH_FLOW,
    CAPITAL_EXPENDITURE,
    DILUTED_EPS,
    DILUTED_WEIGHTED_AVERAGE_SHARES,
    CASH_AND_CASH_EQUIVALENTS,
)
