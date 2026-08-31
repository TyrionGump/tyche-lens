# Current profiles and extension process

Profiles are reviewed selection policy, not a universal financial model. They
connect a stable evidence name to one exact SEC taxonomy, tag, unit, period
type, and rationale for one company shape.

The source of truth is the
[`profiles/`](../src/sec_pipeline/profiles) package. Shared definitions
live in `common.py`, each company owns one module, and `registry.py` defines the
configured order. This document explains the current choices and the review
process; code remains authoritative if they diverge.

## Definition fields

Every `EvidenceDefinition` requires:

| Field | Meaning |
| --- | --- |
| `name` | Unique stable key within the company publication |
| `label` | Neutral display label |
| `category` | `common` or `company_specific` applicability hint |
| `taxonomy` | Exact SEC taxonomy |
| `tag` | Exact concept name |
| `unit` | Exact Company Facts unit |
| `period_type` | `duration` or `instant` |
| `reason` | Reviewed explanation for choosing this exact source definition |

The publication renames `reason` to `selection_reason` and adds
`evidence_type: "structured_reported_fact"`.

Each company also declares:

| Field | Meaning |
| --- | --- |
| `slug` | Stable producer identity |
| `cik` | Zero-padded ten-digit SEC filer identifier |
| `source.manifest` | Source-store manifest location |
| `period_anchor` | Duration evidence name that establishes annual periods |
| `evidence` | Ordered tuple of reviewed definitions |

The annual anchor must exist in the profile and must be a duration definition.
Evidence names and company slugs must be unique.

## Shared non-financial definitions

Apple and Walmart currently reuse these definitions where they fit:

| Name | US GAAP tag | Unit | Type |
| --- | --- | --- | --- |
| `gross_profit` | `GrossProfit` | `USD` | duration |
| `net_income` | `NetIncomeLoss` | `USD` | duration |
| `operating_cash_flow` | `NetCashProvidedByUsedInOperatingActivities` | `USD` | duration |
| `capital_expenditure` | `PaymentsToAcquirePropertyPlantAndEquipment` | `USD` | duration |
| `diluted_eps` | `EarningsPerShareDiluted` | `USD/shares` | duration |
| `diluted_weighted_average_shares` | `WeightedAverageNumberOfDilutedSharesOutstanding` | `shares` | duration |
| `cash_and_cash_equivalents` | `CashAndCashEquivalentsAtCarryingValue` | `USD` | instant |

JPMorgan reuses only net income, diluted EPS, and diluted weighted-average
shares from this group. A definition being reusable does not make it applicable
to every business.

## Apple profile

Apple is a non-financial-company shape with revenue as its annual anchor.

| Name | Category | US GAAP tag | Unit | Type |
| --- | --- | --- | --- | --- |
| `revenue` | common | `RevenueFromContractWithCustomerExcludingAssessedTax` | `USD` | duration |
| `gross_profit` | common | `GrossProfit` | `USD` | duration |
| `net_income` | common | `NetIncomeLoss` | `USD` | duration |
| `operating_cash_flow` | common | `NetCashProvidedByUsedInOperatingActivities` | `USD` | duration |
| `capital_expenditure` | common | `PaymentsToAcquirePropertyPlantAndEquipment` | `USD` | duration |
| `diluted_eps` | common | `EarningsPerShareDiluted` | `USD/shares` | duration |
| `diluted_weighted_average_shares` | common | `WeightedAverageNumberOfDilutedSharesOutstanding` | `shares` | duration |
| `cash_and_cash_equivalents` | common | `CashAndCashEquivalentsAtCarryingValue` | `USD` | instant |
| `marketable_securities_current` | company_specific | `MarketableSecuritiesCurrent` | `USD` | instant |
| `marketable_securities_noncurrent` | company_specific | `MarketableSecuritiesNoncurrent` | `USD` | instant |
| `commercial_paper` | company_specific | `CommercialPaper` | `USD` | instant |

The securities and commercial-paper definitions remain separate from cash so
the pipeline does not invent an aggregate liquidity measure.

## Walmart profile

Walmart is a retailer shape. Its anchor uses total `Revenues` rather than a
narrower contract-revenue concept.

| Name | Category | US GAAP tag | Unit | Type |
| --- | --- | --- | --- | --- |
| `revenue` | common | `Revenues` | `USD` | duration |
| `gross_profit` | common | `GrossProfit` | `USD` | duration |
| `net_income` | common | `NetIncomeLoss` | `USD` | duration |
| `operating_cash_flow` | common | `NetCashProvidedByUsedInOperatingActivities` | `USD` | duration |
| `capital_expenditure` | common | `PaymentsToAcquirePropertyPlantAndEquipment` | `USD` | duration |
| `diluted_eps` | common | `EarningsPerShareDiluted` | `USD/shares` | duration |
| `diluted_weighted_average_shares` | common | `WeightedAverageNumberOfDilutedSharesOutstanding` | `shares` | duration |
| `cash_and_cash_equivalents` | common | `CashAndCashEquivalentsAtCarryingValue` | `USD` | instant |
| `inventory` | company_specific | `InventoryNet` | `USD` | instant |
| `accounts_payable` | company_specific | `AccountsPayableCurrent` | `USD` | instant |

The current gross-profit definition deliberately remains missing when the
standardized fact is absent. See
[evidence boundaries](70-evidence-boundaries.md) for why another concept,
visible table value, or calculation is not a silent substitute.

## JPMorgan profile

JPMorgan exercises a bank shape. Its revenue anchor and company-specific
components differ materially from the non-financial profiles.

| Name | Category | US GAAP tag | Unit | Type |
| --- | --- | --- | --- | --- |
| `revenue` | common | `RevenuesNetOfInterestExpense` | `USD` | duration |
| `net_interest_income` | company_specific | `InterestIncomeExpenseNet` | `USD` | duration |
| `noninterest_income` | company_specific | `NoninterestIncome` | `USD` | duration |
| `noninterest_expense` | company_specific | `NoninterestExpense` | `USD` | duration |
| `provision_for_credit_losses` | company_specific | `ProvisionForLoanLeaseAndOtherLosses` | `USD` | duration |
| `net_income` | common | `NetIncomeLoss` | `USD` | duration |
| `diluted_eps` | common | `EarningsPerShareDiluted` | `USD/shares` | duration |
| `diluted_weighted_average_shares` | common | `WeightedAverageNumberOfDilutedSharesOutstanding` | `shares` | duration |
| `assets` | company_specific | `Assets` | `USD` | instant |
| `deposits` | company_specific | `Deposits` | `USD` | instant |

The profile intentionally stops at reported facts. Capital ratios, credit
quality, efficiency ratios, and judgments about bank performance require
separate definitions and analysis.

## Adding or changing a company

Treat profile work as a small evidence-review exercise:

1. Add one company module under `profiles/` and register it in `registry.py`.
2. Acquire a source into an isolated data directory using live mode, or add a
   validated archived source for replay.
3. Run normalization and inspect `normalized/concepts.json` for exact tags,
   units, forms, and period coverage.
4. Choose one duration anchor with stable annual coverage.
5. Add only definitions whose reported meaning and applicability have been
   reviewed for this company.
6. Run with a fixed `TYCHE_SEC_AS_OF` so the result is reproducible.
7. Inspect every selected fact, filing URL, duplicate condition, and missing
   observation.
8. Replay the preserved source and confirm the same logical IDs and delivery.
9. Add focused tests for new selection behavior and record any data-boundary
   finding in these documents.

Do not begin by copying another company's entire list. Reuse an existing
definition only after checking its meaning and coverage.

## Review checklist

Before treating a profile as accepted:

- the CIK and source-reported entity agree;
- the anchor produces the requested number of exact annual periods;
- every definition has the intended taxonomy, tag, unit, and period type;
- instant facts align to each anchored period end;
- selected filing dates do not exceed `as_of`;
- later repeats or amendments follow the declared duplicate rule;
- differing values and missing periods are visible as structured issues;
- company-specific evidence is descriptive and not evaluative;
- live and replay paths preserve provenance and pass validation; and
- the delivery remains readable without any producer working directory.

## Current live acceptance snapshot

The retained acceptance directory at `data/acceptance-2026-08-13` records one
successful live run across all three profiles:

| Company | Definitions | Selection issues |
| --- | ---: | ---: |
| Apple | 11 | 0 |
| Walmart | 10 | 1 missing-gross-profit issue |
| JPMorgan | 10 | 0 |

Its delivery ID is
`b39837304d010613a4d1ac23d42a7c8a2c21cc94eb60368f0c755a511619a55f`.
This snapshot validates the basic workflow and profile diversity. It is not a
benchmark, a production service-level claim, or a company assessment.
