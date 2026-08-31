# Evidence boundaries and retained findings

This pipeline prepares traceable evidence for later application use. It does
not evaluate a company, score financial health, predict price movement, or
produce an investment recommendation.

That boundary affects the data model: facts, missingness, calculations, and
interpretation must not be silently collapsed into one value.

## Evidence types are not interchangeable

| Evidence type | Source | Required provenance | Current status |
| --- | --- | --- | --- |
| `structured_reported_fact` | SEC Company Facts observation | Taxonomy, tag, unit, period, accession, form, filed date, source hash | Implemented |
| Filing-specific XBRL fact | Inline XBRL filing instance | Concept, unit, period, full context dimensions, fact/context IDs, filing hash | Explored, not integrated |
| `reported_table_value` | Value visibly printed in a filing table | Filing and table fragment, location/rows, extraction rule, representation hash | Explored, not integrated |
| Derived evidence | Declared formula over identified inputs | Formula/version, component evidence, units, period alignment, rounding | Not implemented |
| Interpretation | Analysis over evidence | Method, assumptions, limitations, and input references | Downstream concern |

Two values may have the same financial meaning while requiring different
review. A visible number is not an XBRL fact. A number calculated from two XBRL
facts is not directly reported evidence. Interpretation is not source data.

Future work may give these types a shared envelope, but should preserve their
type-specific provenance and never upgrade one type to another implicitly.

## What Company Facts can establish

The current source is well suited to:

- normalized concept and unit discovery across a company;
- exact selection of reported observations by taxonomy, tag, unit, form,
  fiscal period, duration, and filed-date cutoff;
- comparison of the same declared evidence definition over anchored annual
  periods;
- filing-level provenance through accession, form, filing date, and SEC
  Archives URL; and
- explicit reporting of missing or revised candidates.

It does not by itself establish:

- complete inline-XBRL context dimensions and members;
- where a value appears in the human-readable filing;
- values printed as untagged HTML text;
- economic equivalence between alternative concepts;
- a derived ratio or subtotal; or
- whether a result is favorable, unfavorable, cheap, or expensive.

The normalized catalogue is therefore a discovery aid, not a semantic
dictionary. A concept appearing in the source does not prove that it is the
right evidence for a product question.

## Retained filing-specific XBRL finding

A probe of Walmart's fiscal 2026 10-K demonstrated that the complete context is
part of a filing fact's identity. The same standard concept can appear as:

- an entity-wide fact with no dimensions;
- reportable-segment facts with consolidation and segment axes;
- merchandise or geography detail with additional axes; or
- e-commerce facts under an axis whose name is not intuitively tied to
  e-commerce.

Company-specific meaning often came from custom members such as a Walmart
segment member applied to a standard `us-gaap` concept. Looking only for custom
concepts would therefore miss useful company-specific evidence.

The safe matching rule from that probe was:

```text
concept + unit + period + complete dimension/member set -> exactly one value
```

Subset dimension matching produced multiple plausible candidates. Any future
filing-instance stage should retain context IDs, fact IDs, qualified names, and
the full dimension/member set, and should fail on zero or multiple semantic
matches rather than guessing.

This finding does not change the current Company Facts row schema. Filing
instances are a richer, separate source whose integration needs its own
acquisition and normalization contract.

## Walmart gross-profit example

The accepted live Company Facts delivery for Walmart has three anchored annual
periods ending in 2024, 2025, and 2026. Under the declared evidence definition:

```text
us-gaap:GrossProfit + USD + duration + annual eligibility rules
```

all three observations are `missing`, and the publication carries one
`missing_evidence` warning. This means only that no eligible observation exists
for that exact structured concept under the current rule.

It does **not** mean:

- Walmart had zero gross profit;
- gross profit is economically unimportant;
- the filing did not visibly report the measure; or
- the pipeline should choose a different concept or perform subtraction.

A separate probe of Walmart's 2026 10-K, accession
`0000104169-26-000055`, found these visibly reported consolidated values:

| Fiscal year | Visible gross profit | Visible rate |
| --- | ---: | ---: |
| 2024 | USD 152.495 billion | 23.7% |
| 2025 | USD 162.785 billion | 24.1% |
| 2026 | USD 171.018 billion | 24.2% |

The gross-profit rows contained no inline XBRL facts at that table location.
Tagged net sales minus tagged cost of sales matched all displayed amounts and
one-decimal rates, but the calculation served only as validation. The source
evidence remained the visible table.

The result justifies preserving three distinct states:

1. the standardized Company Facts `GrossProfit` observation is missing;
2. a value is visibly reported in a specific filing table; and
3. an independently derived cross-check agrees with that visible value.

The current publication implements only the first. Integrating the second or
third requires an explicit new evidence type and validation policy.

## Missingness rules

Missing evidence is a valid pipeline result when:

- the company does not use the configured concept;
- the source omits the concept or requested unit;
- observations exist but fail form, fiscal-period, duration, period, or
  `as_of` eligibility; or
- the requested evidence genuinely does not apply to the company shape.

Current selection does not distinguish these causes beyond the exact rule and
candidate count for the anchored period. Deeper missingness diagnostics could
be added later, but must remain descriptive.

Do not:

- convert missing to zero;
- fall back to a similarly named tag;
- mix units;
- use a different duration or period;
- take a later-filed value past `as_of`;
- substitute a visible table value; or
- manufacture a derived value.

Any such behavior would be a new, reviewed evidence definition or analysis
rule, not a cleanup of missing data.

## Company-specific selection

The normalization shape remains general, while selection profiles can vary by
business. Apple, Walmart, and JPMorgan deliberately demonstrate that a single
rigid evidence list is inappropriate:

- a bank's revenue and useful operating components differ from those of a
  product company;
- retailer inventory and accounts payable are useful company-shape evidence;
  and
- cash, securities, and commercial paper may deserve separate treatment for a
  particular profile.

`common` definitions are reusable candidates, not universal requirements.
Applicability must be reviewed when extending coverage.

## Retained consumer findings

The discarded consumer and presentation probes also exposed boundaries worth
retaining. These are constraints for later application design, not behavior to
add to normalization:

- A delivery contains enough definition, period, filing, selection, issue, and
  source context to support a neutral evidence view without exposing producer
  working artifacts.
- A selected filing can be newer than the evidence period because a later
  annual filing may repeat an earlier value. Interfaces should show both the
  evidence period and filing date rather than treating them as contradictory.
- Numeric calculation needs an explicit decimal and rounding policy. Parsing a
  published number as binary floating point adds avoidable error, although a
  decimal consumer still cannot recover lexical precision already changed
  during current normalization.
- The publication has no dedicated stable observation ID. A future analysis
  artifact may need one rather than repeatedly embedding company, evidence,
  period, accession, and value identity.
- Period comparisons require application policy: whether only adjacent selected
  periods may be compared, what happens after a missing period, how zero or
  negative bases affect percentage change, and which rounding rule applies.
- A catalog of user questions and its many-to-many mapping to evidence is
  replaceable application policy. It should consume reported and explicitly
  derived evidence rather than become part of SEC selection.
- Missing observations and source issues should remain visible in presentation,
  while dense hashes and representation details can be available on demand.

The experiments used SQLite projections, read contracts, generated comparison
documents, and static views to test these points. None of those experimental
schemas is a compatibility target for the pipeline.

## Where later analysis belongs

Trends, ratios, comparisons, valuation, claims, narrative explanation, and
decision support should consume a validated delivery. They should retain input
publication IDs and observation provenance so a user can inspect the reported
facts behind an analysis.

Those downstream layers may answer questions such as “how has operating cash
flow changed?” They must still disclose calculations and limitations. The SEC
pipeline itself should continue to answer the narrower question: “what source
data was preserved, and what evidence was selected under the declared rules?”
