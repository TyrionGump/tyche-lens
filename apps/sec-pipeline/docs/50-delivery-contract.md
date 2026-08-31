# Publication delivery contract

> **Status:** versioned application-neutral alpha contract. It transfers one
> complete set of company publications; it does not define a backend API,
> database schema, or financial assessment.

The delivery directory is the only producer boundary a normal downstream
consumer needs. Raw sources, normalized observations, selection files, Python
modules, and operational reports remain private to the pipeline.

The current delivery schema version is `1`, and the current contract type is
`company_evidence_publications`.

## Directory contract

```text
deliveries/
├── latest.json
└── bundles/
    └── <delivery-id>/
        ├── manifest.json
        └── publications/
            ├── aapl.json
            └── <company-slug>.json
```

The local directory is a transport, not an architectural dependency. A
complete bundle can later be copied unchanged to object storage or another
handoff mechanism.

## Contract invariants

- Every artifact is UTF-8 JSON.
- Every referenced artifact includes its relative file name, SHA-256, and exact
  byte count.
- Publication entries are ordered by company slug.
- A delivery is attempted only after every configured company completes.
- A bundle is immutable: an existing path under the same delivery ID must have
  exactly the same bytes.
- `latest.json` is replaced atomically only after the bundle and manifest are
  complete.
- A company or delivery failure leaves the previous delivery pointer intact.
- Publications contain no pipeline-local paths.

The producer validates source publication pointers, path containment, hashes,
byte counts, identities, schema fields, and required provenance before creating
a bundle.

## `latest.json`

The pointer is relative to the `deliveries/` directory.

| Field | Type | Meaning |
| --- | --- | --- |
| `schema_version` | integer | Pointer and manifest contract version, currently `1` |
| `delivery_id` | string | Deterministic SHA-256 identity of the publication set |
| `manifest` | artifact object | Referenced manifest file, SHA-256, and byte count |

The artifact object has this common shape:

| Field | Type | Meaning |
| --- | --- | --- |
| `file` | string | Path relative to the boundary that created the reference |
| `sha256` | string | SHA-256 of the exact referenced bytes |
| `bytes` | integer | Exact number of bytes in the referenced file |

## `manifest.json`

| Field | Type | Meaning |
| --- | --- | --- |
| `schema_version` | integer | Delivery-manifest schema version, currently `1` |
| `delivery_id` | string | Identity repeated from the pointer |
| `contract.type` | string | Currently `company_evidence_publications` |
| `contract.publication_schema_versions` | integer array | Sorted publication versions present |
| `publication_count` | integer | Number of included publication entries |
| `publication_bytes` | integer | Sum of referenced publication byte counts |
| `publications` | array | Ordered company identities and publication artifacts |

Each `publications` entry contains:

| Field | Type | Meaning |
| --- | --- | --- |
| `company` | object | Slug, source-reported entity name, and CIK |
| `publication_id` | string | Logical identity declared by the publication |
| `publication_schema_version` | integer | Schema declared inside the publication |
| `as_of` | date string | Inclusive selection cutoff |
| `artifact` | artifact object | Publication path relative to the bundle directory |

The referenced document follows the
[company publication schema](40-publication-schema.md).

## Deterministic delivery identity

The delivery ID is SHA-256 over canonical UTF-8 JSON with sorted keys and no
insignificant whitespace. Its identity input is:

```json
{
  "schema_version": 1,
  "contract_type": "company_evidence_publications",
  "publications": [
    {
      "company_slug": "aapl",
      "cik": "0000320193",
      "publication_id": "<logical-run-id>",
      "publication_schema_version": 1,
      "as_of": "2026-08-13",
      "sha256": "<publication-sha256>",
      "bytes": 123
    }
  ]
}
```

The publication list is sorted by slug before hashing. Operational timestamps
and storage locations are excluded. The same logical publication set therefore
produces the same delivery ID.

The manifest itself is not part of this hash. Its content is determined from
the same publication set and protected separately by the pointer's artifact
hash and byte count.

## Recommended consumer sequence

A filesystem or object-storage consumer should:

1. Read `deliveries/latest.json` without using pipeline working directories.
2. Require a supported pointer schema and expected delivery ID shape.
3. Resolve the manifest path within the delivery root; reject traversal outside
   that root.
4. Verify the manifest byte count and SHA-256 before parsing it.
5. Require the expected contract type and supported publication schema
   versions.
6. Verify delivery ID, counts, ordering, unique identities, and each
   publication artifact.
7. Parse and validate every publication before changing downstream state.
8. Replace its current downstream snapshot atomically only after the complete
   bundle succeeds.

The Go backend follows this separation by loading the delivery as a read-only
snapshot. The producer does not call the backend and the backend does not read
the producer's raw or normalized directories.

## Failure and version behavior

If one configured company fails, delivery status is `skipped`; no partial
bundle becomes current. If bundle validation or writing fails, delivery status
is `failed`; the existing pointer remains usable. The pipeline invocation then
returns a non-zero exit code.

Delivery and publication schemas are versioned independently. Consumers should
reject unknown versions before replacing their last valid state. The current
contract intentionally does not define scheduling, notification, retention,
authentication, remote transport, or acknowledgement.

