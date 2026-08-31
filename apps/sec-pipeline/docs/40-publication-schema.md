# Company publication schema

The publication is the stable, application-facing output for one company. It
contains selected evidence and enough provenance to review that evidence, but
none of the pipeline's local working paths.

The current publication schema version is `1`.

## Storage layout

```text
publications/
└── <company-slug>/
    ├── latest.json
    └── snapshots/
        └── <publication-id>/
            └── publication.json
```

`publication_id` is the logical company-run ID created from the source,
selection configuration, and `as_of` date. It is not the operational pipeline
invocation ID.

## Publication root fields

| Field | Type | Meaning |
| --- | --- | --- |
| `schema_version` | integer | Publication schema version, currently `1` |
| `publication_id` | string | Logical identity of this company evidence snapshot |
| `company` | object | Stable slug, source-reported entity name, and zero-padded CIK |
| `as_of` | `YYYY-MM-DD` string | Inclusive filing-date cutoff used by selection |
| `periods` | array | Ordered annual periods established by the configured anchor |
| `selection_policy` | object | Rules under which observations were eligible and selected |
| `evidence` | array | Evidence definitions with reported or explicitly missing observations |
| `issues` | array | Structured missingness or conflicting-revision conditions |
| `provenance` | object | Logical run, configuration, and preserved SEC source identity |

The shapes of `periods`, `selection_policy`, `evidence`, and `issues` are
defined in [evidence selection](30-evidence-selection.md). Publication does not
reinterpret those structures.

## `company`

| Field | Type | Meaning |
| --- | --- | --- |
| `slug` | string | Pipeline-owned stable company key, such as `aapl` |
| `entity` | string | Entity name reported at the root of SEC Company Facts |
| `cik` | string | Zero-padded ten-digit SEC Central Index Key |

The entity name is source data and may differ from a product display name.
Consumers should use `slug` or `cik` for identity, not `entity`.

## Evidence entry

Each evidence entry carries its definition beside its observations so that a
consumer does not need Python profile code to understand why a value appears.

| Field | Type | Meaning |
| --- | --- | --- |
| `name` | string | Stable profile-local evidence key |
| `label` | string | Human-readable neutral label |
| `category` | string | `common` or `company_specific` applicability hint |
| `evidence_type` | string | Currently `structured_reported_fact` |
| `taxonomy` | string | Required SEC taxonomy, currently normally `us-gaap` |
| `tag` | string | Exact required taxonomy concept |
| `unit` | string | Exact required SEC Company Facts unit |
| `period_type` | string | `duration` or `instant` |
| `selection_reason` | string | Reviewed explanation for selecting this exact definition |
| `observations` | array | One observation per anchored annual period |

`common` means the definition may be reused where its meaning fits. It does not
mean every company must report it. `company_specific` means it was selected for
the current company shape; it does not mean the concept is unique to that
company.

Every observation is either:

- `status: "reported"`, with the selected SEC value and its filing-level
  provenance; or
- `status: "missing"`, with the requested period and zero eligible candidates.

A consumer must preserve this distinction. Missing is neither zero nor an
instruction to derive or substitute a value.

## `provenance`

| Field | Type | Meaning |
| --- | --- | --- |
| `run_id` | string | Logical company-run ID; equal to `publication_id` |
| `configuration_sha256` | string | Hash of company definitions and selection policy |
| `source` | object | Identity and representation of the preserved Company Facts source |

### `provenance.source`

| Field | Type | Meaning |
| --- | --- | --- |
| `type` | string | Currently `sec_company_facts` |
| `url` | string | Official SEC Company Facts URL recorded at acquisition |
| `fetched_at` | timestamp string | Time associated with the preserved source bytes |
| `representation` | object | Whether bytes are a saved response or transformed snapshot, with details |
| `sha256` | string | SHA-256 of the exact preserved source document bytes |

Per-observation fields such as `filed`, `form`, and `accn` identify which SEC
filing supplied a selected value. Publication-level provenance identifies the
Company Facts document from which all candidates were processed. Both levels
are needed for review.

## Transformation from selected evidence

Publication performs a deliberately small boundary conversion:

1. It validates company identity, `as_of`, configuration hash, and required
   selected-document sections.
2. It copies the financial evidence structures without changing their meaning.
3. It moves `configuration_sha256` under `provenance`.
4. It builds source provenance from the validated raw manifest.
5. It excludes pipeline-local artifact paths and operational run measurements.

The publication is therefore storage-neutral application data, not a complete
operational audit report. Raw, normalized, and run artifacts remain available
inside the producer boundary when deeper review is necessary.

## Immutability and `latest.json`

A snapshot path is immutable:

- if its `publication.json` does not exist, the pipeline writes it atomically;
- if it exists with identical JSON content, replay is idempotent; and
- if the same publication ID resolves to different content, the pipeline fails
  with an identity-collision error.

The company publication pointer contains:

| Field | Type | Meaning |
| --- | --- | --- |
| `schema_version` | integer | Pointer schema version, currently `1` |
| `company` | object | `slug` and `cik` expected by the pointer |
| `as_of` | date string | Selection cutoff of the referenced publication |
| `publication_id` | string | Referenced logical publication identity |
| `publication` | artifact object | File, SHA-256, and byte count |

The pipeline updates this pointer only when the candidate `as_of` is equal to
or later than the current pointer's date. Reprocessing an older historical
cutoff still creates its immutable snapshot but does not replace a newer
company pointer.

## Versioning rule

Increment the publication schema when a consumer-visible field is removed,
renamed, changes type, or changes meaning. Additive fields still require
consumer review; the delivery declares every publication schema version it
contains so consumers can reject unsupported versions before changing state.
