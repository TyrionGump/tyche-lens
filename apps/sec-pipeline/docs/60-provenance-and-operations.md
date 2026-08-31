# Provenance, identities, and operations

The pipeline keeps financial data identity separate from operational execution
identity. This allows deterministic replay while retaining enough information
to diagnose each invocation.

## Identity model

| Identity | Shape | Purpose |
| --- | --- | --- |
| Source document SHA-256 | 64 hex characters | Identifies exact preserved Company Facts bytes |
| Configuration SHA-256 | 64 hex characters | Identifies company definitions and selection rules |
| Logical company run ID | `<as_of>-<source10>-<source-manifest10>-<config10>` | Identifies one reproducible company evidence result |
| Publication ID | Logical company run ID | Exposes that result at the application boundary |
| Delivery ID | SHA-256 of canonical publication-set identity | Identifies one complete consumer handoff |
| Pipeline run ID | UTC timestamp plus random suffix | Identifies one operational invocation |

The logical run also includes the source-manifest hash because two archives can
contain identical document bytes while recording different provenance or
representation. Operational durations, memory use, and timestamps do not alter
the configuration hash or delivery identity.

The configuration identity schema is currently `3`. It hashes canonical JSON
containing:

- company slug, CIK, annual period anchor, and every evidence-definition field;
- eligible annual forms and fiscal period;
- inclusive annual-duration range; and
- requested period count.

Changing any of those inputs creates a different logical result even when the
source document is unchanged.

## Artifact references

Operational documents refer to another artifact using:

| Field | Type | Meaning |
| --- | --- | --- |
| `file` | string | Display path relative to the document's declared boundary |
| `sha256` | string | Hash of exact file bytes at report creation |
| `bytes` | integer | Exact file byte count |

These references make silent mutation detectable. Paths are operational
metadata; hashes and logical identities provide content identity.

## Company run report

Each completed logical run stores:

```text
<company>/runs/<logical-run-id>/run.json
```

The current company-run schema version is `3`.

| Field | Meaning |
| --- | --- |
| `schema_version` | Operational company-run report version |
| `run_id` | Logical company run identity |
| `configuration_sha256` | Full selection-configuration hash |
| `status` | `completed` for a written company report |
| `company` | Slug, source entity name, and CIK |
| `as_of` | Inclusive evidence cutoff |
| `acquisition` | Mode, result status, source manifest, hashes, URL, and request times |
| `started_at`, `finished_at`, `duration_seconds` | Company execution timing |
| `stage_durations_seconds` | Time spent in acquire, source, normalize, select, and publish |
| `process_peak_memory_bytes_after_run` | Process high-water memory after this company, when supported |
| `counts` | Concepts, normalized rows, definitions, reported observations, and issues |
| `artifact_bytes` | Sum of byte counts for the report's primary artifacts |
| `artifacts` | Raw, normalized, selected, and publication artifact references |
| `publication` | Publication ID and whether its company pointer advanced |

The company working pointer at `<company>/latest.json` records the run,
selected-evidence, and publication artifacts for the most recently completed
processing operation in that data directory. It is an operator convenience,
not the downstream delivery contract.

## Pipeline run report

Every invocation writes:

```text
pipeline-runs/<pipeline-run-id>.json
latest-run.json
```

Both contain the same report at write time. The current pipeline-run schema
version is `5`.

| Field | Meaning |
| --- | --- |
| `pipeline_run_id` | Operational invocation identity |
| `status` | `completed`, `partial`, or `failed` |
| `acquisition_mode` | `replay` or `live` |
| `started_at`, `finished_at`, `duration_seconds` | Whole-invocation timing |
| `as_of` | Filed-date cutoff shared by configured companies |
| `company_count`, `completed_company_count` | Completion summary |
| `process_peak_memory_bytes` | Process high-water memory, when supported |
| `run_file` | Path of this immutable invocation report |
| `companies` | Compact success or failure record for every configured company |
| `delivery` | Completed, skipped, or failed delivery-stage report |

A completed company entry contains its logical run and acquisition identities,
paths, duration, and issue count. A failed entry instead contains:

- `failed_stage`;
- durations of stages completed before failure;
- exception type and message;
- company/configuration/as-of identity; and
- acquisition or run details when those stages had already completed.

Failures are intentionally data, not only log text.

## Status and exit behavior

| Condition | Pipeline status | Delivery status | Exit code |
| --- | --- | --- | ---: |
| Every company and delivery completes | `completed` | `completed` | `0` |
| Some companies complete, another fails | `partial` | `skipped` | `1` |
| No company completes | `failed` | `skipped` | `1` |
| Companies complete but delivery fails | `partial` | `failed` | `1` |
| Settings, lock, or setup fails before reporting | No run report guaranteed | Not run | `1` |

The company loop isolates failures so one bad company does not erase successful
company work. It does not publish a partial current delivery.

## Concurrency and atomic writes

One non-blocking file lock at `data/.pipeline.lock` permits a single writer for
each data directory. A concurrent process fails immediately rather than
interleaving output.

Files are written to a unique temporary sibling and atomically replaced.
Immutable publication and delivery paths add a stronger rule: existing content
must be byte-identical or the operation fails. Atomic replacement protects
individual pointers; the delivery contract protects the multi-file handoff.

## Provenance chain

For a published observation, the review chain is:

```text
delivery pointer
  -> delivery manifest + publication hash
  -> publication + configuration/source hashes
  -> selected observation + accession/form/filed date
  -> normalized Company Facts observation
  -> raw logical-run copy
  -> source-store manifest
  -> acquisition manifest + preserved source bytes
```

Replay verifies this chain before normalization: paths must remain inside the
configured source store, identities must match, files must exist, hashes and
byte counts must match, and the Company Facts root must be structurally valid.

When a live request returns bytes identical to the current source document, the
acquisition status is `unchanged`. The stored source artifact and its original
`fetched_at` remain unchanged, while the new `request_finished_at` is recorded
in the operational report. This distinguishes source identity from the fact
that another request occurred.

## Current operational boundary

The code deliberately leaves these deployment choices open:

- schedule and orchestration mechanism;
- retention and garbage collection;
- remote object storage or database loading;
- alerting, metrics export, and operator notification;
- consumer acknowledgement and rollback; and
- credentials or authentication for a remote delivery transport.

Those concerns can wrap the batch executable without changing evidence
selection or making the backend depend on producer internals.

