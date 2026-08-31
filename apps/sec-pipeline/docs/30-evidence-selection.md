# Evidence selection

Selection applies reviewed financial meaning to normalized Company Facts. It
does not discover arbitrary substitutes and does not calculate missing values.

## Evidence definitions

Every selected series begins with one `EvidenceDefinition` in `profiles/`.

| Field | Meaning |
| --- | --- |
| `name` | Stable pipeline-facing series identifier within one company |
| `label` | Human-readable label |
| `category` | `common` or `company_specific` |
| `taxonomy` | Exact Company Facts taxonomy |
| `tag` | Exact Company Facts concept tag |
| `unit` | Exact Company Facts unit key |
| `period_type` | `duration` or `instant` |
| `reason` | Reviewed explanation for choosing this definition |

`common` means the definition is intended to be reusable where its accounting
meaning fits. It does not mean every company should have it.
`company_specific` means the current profile deliberately includes it; it does
not mean the concept can never apply elsewhere.

Definitions match normalized rows by the exact tuple `(taxonomy, tag, unit)`.
The selector never falls back to a similarly named concept.

## Annual eligibility

An observation is eligible only when all applicable rules pass:

1. `form` is `10-K` or `10-K/A`.
2. `fp` is `FY`.
3. `filed` exists, is a valid ISO date, and is on or before `as_of`.
4. `end` exists and is a valid ISO date.
5. A duration fact has `start`, and its inclusive duration is between 300 and
   400 days.
6. An instant fact needs only its end date after the common rules pass.

The duration calculation is:

```text
inclusive days = end date − start date + 1
```

`fy` and `frame` are retained but do not define period identity. The explicit
start/end pair is primary for duration evidence; end date is primary for instant
evidence.

## Period anchoring

Each company profile names one duration definition as `period_anchor`, currently
`revenue` for all three fixtures.

The selector:

1. groups all eligible anchor observations by exact `(start, end)`;
2. sorts those period keys by end date and then start date;
3. retains the latest configured number, currently three; and
4. fails the company run if fewer than three periods exist.

Every other duration definition must match those exact start/end pairs. Every
instant definition must match the anchored end dates. This prevents plausible
but misaligned periods from being silently compared.

## Duplicate observations

Several eligible filings may report the same period. For one definition and
period, the selector chooses the maximum tuple:

```text
(filed date, accession number)
```

The result records:

- `eligible_observation_count`: number of eligible candidates; and
- `different_reported_values`: whether candidate `val` JSON values differed.

When eligible values differ, selection still uses the deterministic latest
candidate and emits a `different_reported_values` warning. The earlier values
are not copied into the publication, but remain available in normalized data
and the preserved source.

## Selected evidence document

`selected/evidence.json` is an internal working artifact with schema version
`1`.

### Root fields

| Field | Meaning |
| --- | --- |
| `schema_version` | Selected-evidence schema version |
| `configuration_sha256` | Identity of the company profile and selection policy |
| `as_of` | Inclusive filed-date cutoff |
| `company` | Slug, source-reported entity, and CIK |
| `selection_policy` | Effective annual selection rules |
| `periods[]` | Ordered anchored start/end periods |
| `source` | Internal artifact references for raw and normalized inputs |
| `evidence[]` | One output series per configured definition |
| `issues[]` | Structured missing or differing-value conditions |

### Selection-policy fields

| Field | Meaning |
| --- | --- |
| `forms` | Eligible annual filing forms |
| `fiscal_period` | Required SEC fiscal-period code |
| `annual_duration_days` | Inclusive minimum and maximum duration |
| `period_count` | Required number of anchored annual periods |
| `period_anchor` | Evidence definition used to establish those periods |
| `duplicate_rule` | Human-readable deterministic candidate rule |

### Evidence-series fields

| Field | Meaning |
| --- | --- |
| `name` | Stable series identifier |
| `label` | Human-readable label |
| `category` | `common` or `company_specific` |
| `evidence_type` | Currently always `structured_reported_fact` |
| `taxonomy` | Exact selected taxonomy |
| `tag` | Exact selected concept |
| `unit` | Exact selected Company Facts unit |
| `period_type` | `duration` or `instant` |
| `selection_reason` | Reviewed rationale copied from the profile |
| `observations[]` | One result for every anchored period |

## Reported observation

When candidates exist, the result is:

| Field | Meaning |
| --- | --- |
| `status` | `reported` |
| `period.start` | Anchored duration start, including for instant evidence context |
| `period.end` | Anchored period end |
| `fact` | Selected provider observation minus repeated company/concept/unit identity |
| `fact.start` | Original fact start when supplied |
| `fact.end` | Original fact end |
| `fact.val` | Selected SEC JSON value |
| `fact.accn` | Accession number |
| `fact.fy` | SEC fiscal year |
| `fact.fp` | SEC fiscal-period code |
| `fact.form` | Filing form |
| `fact.filed` | Filing date used in cutoff and duplicate ordering |
| `fact.frame` | Optional SEC frame when supplied |
| `fact.filing_url` | SEC Archives directory derived from CIK and accession |
| `selection.eligible_observation_count` | Eligible candidate count |
| `selection.different_reported_values` | Whether candidate values differed |

The `fact` object also retains any additional provider observation fields.

## Missing observation

When no eligible candidate exactly matches a configured series and anchored
period, the result is:

```json
{
  "status": "missing",
  "period": {"start": "2025-02-01", "end": "2026-01-31"},
  "candidate_count": 0
}
```

No alternate tag, unit, duration, prior period, visible filing value, or
calculation replaces it.

## Issues

Current issue codes are:

| Code | Trigger | Meaning |
| --- | --- | --- |
| `missing_evidence` | One or more anchored periods have no eligible candidate | The configured structured fact is unavailable under current rules |
| `different_reported_values` | Eligible candidates for a period contain different values | The latest deterministic candidate was selected from a revision set |

Every issue contains:

- `code`;
- `severity`, currently `warning`;
- `evidence_name`;
- affected `period_ends`; and
- a human-readable `message`.

Issues describe source and selection conditions. They are not judgments about
company quality.

## Walmart gross-profit example

The Walmart profile requests `us-gaap:GrossProfit` in `USD` as a duration fact.
The current Company Facts source contains no eligible observation for the three
anchored annual periods. Selection therefore publishes three `missing`
observations and one `missing_evidence` issue.

This is correct under the configured definition. Walmart's filing exposes the
underlying economics through other facts and visible tables, but using them
would be a different evidence rule or a derived calculation. The selector must
not silently change the requested evidence type.

See [`70-evidence-boundaries.md`](70-evidence-boundaries.md) for the complete
source distinction.

## Configuration identity

The configuration SHA-256 is calculated from canonical JSON containing:

- configuration schema version `3`;
- company slug, CIK, and period anchor;
- every evidence-definition field in declared order; and
- forms, fiscal-period code, annual-duration range, and period count.

Acquisition mode, data directory, timestamps, and request settings do not affect
financial selection identity.

## What selection does not do

- infer synonyms or choose a fallback tag;
- convert currencies or units;
- combine quarterly values into annual values;
- calculate gross profit, margins, growth, ratios, or totals;
- interpret revisions as positive or negative;
- rank evidence or companies; or
- claim that a configured common definition applies universally.
