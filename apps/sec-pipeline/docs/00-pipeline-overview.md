# Pipeline overview

> **Status:** description of the current alpha implementation. This document
> explains the producer's responsibilities and artifact flow; it does not
> assess any company or define downstream analysis.

## Purpose and ownership

The SEC pipeline turns SEC Company Facts responses into a small, reviewable set
of annual reported evidence. Its job is to preserve source identity, make
mechanical transformations explicit, apply configured selection rules, and
publish an application-neutral delivery.

The pipeline owns:

- SEC Company Facts acquisition and replay;
- validation and preservation of source documents;
- loss-minimizing normalization for discovery;
- configured selection of reported facts;
- company publication documents;
- immutable multi-company delivery bundles; and
- operational run records.

The pipeline does not own:

- the Go API's response model;
- a consumer database or cache;
- UI presentation;
- derived ratios, comparisons, valuation, or forecasts; or
- company scores and investment recommendations.

The permanent application path is:

```text
SEC EDGAR
  -> apps/sec-pipeline
  -> immutable delivery bundle
  -> apps/api
  -> apps/web
```

Only the delivery bundle crosses the producer boundary. API and web code do not
import Python modules or read working artifacts.

## Stage order

`runner.py` invokes every stage explicitly. Stage modules do not invoke
one another; artifact-owner readers validate persisted handoffs between them.
`models.py` owns the aggregate `PipelineSettings` configuration, which is unpacked by
the runner into explicit inputs before calling company, recording, and delivery
helpers.

| Order | Stage | Input | Primary output | Implementation |
| ---: | --- | --- | --- | --- |
| 1 | Acquire or replay | Company profile and acquisition settings | Validated source-store entry | `sources/acquisition.py`, `sources/store.py` |
| 2 | Preserve source | Source-store entry and configuration identity | Logical-run raw snapshot | `sources/snapshot.py` |
| 3 | Normalize | Preserved Company Facts JSON | Observation JSONL and concept catalogue | `evidence/normalize.py` |
| 4 | Select evidence | Normalized observations and company profile | Selected reported evidence plus issues | `evidence/selection.py` |
| 5 | Publish company | Selected evidence and source provenance | Path-free company publication | `publishing/company.py` |
| 6 | Publish delivery | Latest publication for every configured company | Immutable delivery bundle and latest pointer | `publishing/delivery.py` |
| 7 | Record operation | Stage results and timings | Company and pipeline run records | `records.py` |

A company failure does not prevent later companies from running. A delivery is
published only when every configured company completes.

## Storage layout

The data directory defaults to `data/` and is ignored by Git.

```text
data/
├── .pipeline.lock
├── latest-run.json
├── pipeline-runs/<pipeline-run-id>.json
├── sources/<company>/
│   ├── companyfacts.json
│   ├── acquisition-manifest.json
│   └── manifest.json
├── <company>/
│   ├── latest.json
│   └── runs/<logical-run-id>/
│       ├── raw/
│       │   ├── companyfacts.json
│       │   ├── acquisition-manifest.json
│       │   ├── source-manifest.json
│       │   └── manifest.json
│       ├── normalized/
│       │   ├── observations.jsonl
│       │   └── concepts.json
│       ├── selected/evidence.json
│       └── run.json
├── publications/<company>/
│   ├── latest.json
│   └── snapshots/<logical-run-id>/publication.json
└── deliveries/
    ├── latest.json
    └── bundles/<delivery-id>/
        ├── manifest.json
        └── publications/<company>.json
```

Working artifacts intentionally include paths and operational detail. Published
company documents contain no local filesystem paths. Delivery paths are
relative and confined to the delivery directory.

## Identities

Several identities exist because they answer different questions.

| Identity | Answers | Construction |
| --- | --- | --- |
| Source SHA-256 | Which accepted Company Facts bytes were used? | SHA-256 of `companyfacts.json` |
| Source-manifest SHA-256 | Which acquisition metadata described those bytes? | SHA-256 of the source-store manifest |
| Configuration SHA-256 | Which company definitions and selection policy were used? | Canonical JSON of the versioned profile and policy |
| Logical run ID | Which source, metadata, configuration, and cutoff produced this company result? | `<as_of>-<source hash prefix>-<manifest hash prefix>-<configuration hash prefix>` |
| Publication ID | Which application-facing company snapshot is this? | Equal to the logical run ID |
| Delivery ID | Which ordered set of immutable company publications is this? | SHA-256 of a canonical delivery identity document |
| Pipeline run ID | Which operational invocation produced this report? | UTC timestamp plus random suffix |

Operational timestamps and timings do not affect logical evidence identities.
Replaying identical logical inputs creates another pipeline run record but
reuses the same publication and delivery identity.

## Schema versions

Every persisted document with an owned shape declares a schema version.

| Document | Current version | Defined in |
| --- | ---: | --- |
| Source-store manifest | 1 | `sources/store.py` |
| Logical-run raw manifest | 2 | `sources/snapshot.py` |
| Concept catalogue | 1 | `evidence/normalize.py` |
| Selected evidence | 1 | `evidence/selection.py` |
| Company publication and pointer | 1 | `publishing/company.py` |
| Delivery pointer and manifest | 1 | `publishing/delivery.py` |
| Company run record and pointer | 3 | `records.py` |
| Delivery stage report | 1 | `runner.py` |
| Pipeline run record | 5 | `records.py` |
| Configuration identity document | 3 | `identity.py` |

Changing an operational report does not require changing evidence identity.
Changing a field that participates in selection semantics requires reviewing
the configuration schema version. Changing a consumer-facing publication or
delivery shape requires its own contract version change.

## Core invariants

- A ten-digit CIK and source-reported entity identify a company.
- Accepted source bytes are hash- and size-checked before every replay.
- A logical run copies its source and acquisition metadata before processing.
- Normalization does not choose financial meaning or calculate replacements.
- Selection requires an explicit taxonomy, tag, unit, period type, and reason.
- Missing evidence and differing eligible values remain structured conditions.
- Publications are path-free and immutable for one publication ID.
- Delivery bundles are immutable and complete for all configured companies.
- `latest.json` pointers are replaced atomically only after their target exists.
- A failed or partial invocation does not replace the last complete delivery.
- The producer reports evidence; it does not evaluate company performance.

## Documentation map

Read the detailed documents in filename order:

1. [`10-source-acquisition.md`](10-source-acquisition.md) — raw SEC input,
   live/replay behavior, manifests, and source validation.
2. [`20-normalization.md`](20-normalization.md) — observation flattening,
   catalogue construction, field meanings, and current precision limitation.
3. [`30-evidence-selection.md`](30-evidence-selection.md) — eligibility,
   period anchoring, duplicate handling, missingness, and selected output.
4. [`40-publication-schema.md`](40-publication-schema.md) — the path-free
   company handoff and its mapping from selected evidence.
5. [`50-delivery-contract.md`](50-delivery-contract.md) — the complete producer
   boundary consumed by the Go API.
6. [`60-provenance-and-operations.md`](60-provenance-and-operations.md) —
   lineage, atomicity, statuses, run records, and failure behavior.
7. [`70-evidence-boundaries.md`](70-evidence-boundaries.md) — what Company
   Facts cannot represent and how reported, visible-table, and derived evidence
   must remain distinct.
8. [`80-extending-profiles.md`](80-extending-profiles.md) — current company
   definitions and the review process for adding evidence or companies.
