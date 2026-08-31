# Source acquisition and preservation

This document describes how a Company Facts response becomes a validated source
snapshot. It covers provider input, live and replay modes, source-store fields,
and the first logical-run artifact.

## Operational inputs

`settings.py` builds one immutable
[`PipelineSettings`](../src/sec_pipeline/models.py) value at
process start. The type belongs to orchestration; acquisition receives only its
`SecAcquisitionSettings` member.

| Setting | Environment variable | Default | Meaning |
| --- | --- | --- | --- |
| Acquisition mode | `TYCHE_SEC_SOURCE_MODE` | `replay` | Either `replay` or `live` |
| Data directory | `TYCHE_SEC_DATA_DIRECTORY` | `./data` | Root of sources, working artifacts, publications, and deliveries |
| Selection cutoff | `TYCHE_SEC_AS_OF` | Current local date | Inclusive SEC filing-date cutoff in `YYYY-MM-DD` form |
| User-Agent | Source constant | `tyriongump@gmail.com` | Declared operator identity sent in live SEC requests |
| Request timeout | Dataclass default | 30 seconds | Timeout for one HTTP attempt |
| Minimum interval | Dataclass default | 0.2 seconds | Minimum time between request starts within one invocation |
| Maximum attempts | Dataclass default | 3 | Initial attempt plus retry attempts |

The User-Agent is not a credential and needs no application process. The
[current SEC developer guidance](https://www.sec.gov/about/developer-resources)
asks scripted clients to declare one, and the
[SEC example](https://www.sec.gov/about/webmaster-frequently-asked-questions#developers)
contains an organization or application name plus a contact address. This
project currently sends the explicitly chosen email-only literal; it is public
information and should be reviewed for a more descriptive production identity.

## Live mode

For each configured CIK, the collector requests:

```text
https://data.sec.gov/api/xbrl/companyfacts/CIK<ten-digit-cik>.json
```

Request headers are:

| Header | Value |
| --- | --- |
| `Accept` | `application/json` |
| `Accept-Encoding` | `gzip` |
| `User-Agent` | Configured contact-style operator identity |

The collector preserves only response headers relevant to representation or
conditional retrieval: `content-encoding`, `content-type`, `etag`, and
`last-modified`.

HTTP `429`, `500`, `502`, `503`, and `504`, plus connection and timeout errors,
are retryable. Backoff waits one second before the second attempt and two
seconds before the third. Other HTTP errors fail immediately. The 0.2-second
minimum interval limits one process to at most five request starts per second,
below the SEC's currently published ten-per-second ceiling. Rate limiting is
per process; this code does not coordinate request rates across machines.

### Response representation

The accepted document is always decompressed JSON bytes:

- `identity` or an absent content encoding is saved without transformation;
- `gzip` is decompressed before validation and storage; and
- any other content encoding fails explicitly.

If gzip is decompressed, the source is labelled `transformed_snapshot` and the
transformation description is retained. Otherwise it is labelled
`saved_response`. The source SHA-256 identifies the accepted, stored bytes—not
the compressed HTTP transfer bytes.

## Replay mode

Replay mode makes no network request. It loads the configured source-store
manifest, resolves the document and acquisition manifest, verifies both hashes
and byte counts, and revalidates company identity and metadata.

Replay is the default because it provides deterministic local development and
does not consume SEC capacity. A fresh checkout needs either a restored ignored
source store or one intentional live run.

## Imported sources

`source_store.import_company_facts` can install an externally acquired document
when both the Company Facts JSON and a matching acquisition manifest are
provided. It is currently an internal helper used by tests, not a command-line
workflow. Imported data is subject to the same CIK, hash, metadata, and
representation validation as live data.

## SEC Company Facts input

Only three root fields are required by the current parser:

| Field | Type | Meaning | Current use |
| --- | --- | --- | --- |
| `cik` | Number or numeric text | SEC Central Index Key | Zero-padded to ten digits and checked against the profile |
| `entityName` | Text | SEC-reported entity name | Retained in source, run, publication, and delivery identities |
| `facts` | Object | Taxonomy-to-concept hierarchy | Normalization input |

The relevant nested structure is:

```text
facts
  -> <taxonomy>
    -> <tag>
      -> label
      -> description
      -> units
        -> <unit>
          -> [observation, ...]
```

Concept labels and descriptions feed the discovery catalogue. Observation
fields are retained during normalization rather than being enumerated and
discarded at acquisition time.

## Acquisition manifest

Live collection writes `sources/<company>/acquisition-manifest.json`. Imported
sources must provide an equivalent declaration.

| Field | Meaning |
| --- | --- |
| `schema_version` | Acquisition-manifest shape, currently `1` |
| `provider` | Provider identity; live mode uses `sec_edgar` |
| `cik` | Expected ten-digit company CIK |
| `documents[]` | Declared acquired documents |
| `documents[].file` | Name used to match the stored document |
| `documents[].source` | Original provider URL |
| `documents[].fetched_at` | UTC retrieval timestamp |
| `documents[].sha256` | SHA-256 of the accepted decompressed document bytes |
| `documents[].retrieval.method` | Acquisition method, currently `https` in live mode |
| `documents[].retrieval.content_encoding` | HTTP content encoding observed by live mode |
| `documents[].retrieval.transformation` | Optional description of a representation change |
| `documents[].http.status` | HTTP response status for live acquisition |
| `documents[].http.headers` | Preserved response-header subset |

Exactly one document record must match the configured acquisition filename and
source hash.

## Source-store manifest

`sources/<company>/manifest.json` is the validated entry point used by replay
and logical-run preservation.

| Field | Meaning |
| --- | --- |
| `schema_version` | Source-store schema, currently `1` |
| `source_type` | `sec_company_facts` |
| `company.cik` | Validated ten-digit CIK |
| `company.entity` | Entity name parsed from Company Facts |
| `document.file` | `companyfacts.json`, relative to the source-store entry |
| `document.sha256` | SHA-256 of exact stored document bytes |
| `document.bytes` | Exact byte count |
| `document.acquisition_file` | Filename used to find the declaration in the acquisition manifest |
| `document.url` | Provider URL copied from the acquisition manifest |
| `document.fetched_at` | Retrieval time copied from the acquisition manifest |
| `document.representation.kind` | `saved_response` or `transformed_snapshot` |
| `document.representation.description` | Human-readable representation explanation |
| `acquisition_manifest.file` | Relative path to the preserved acquisition manifest |
| `acquisition_manifest.sha256` | Acquisition-manifest SHA-256 |
| `acquisition_manifest.bytes` | Acquisition-manifest byte count |

All paths are resolved beneath the source-store entry. Absolute paths and
traversal outside that directory are rejected.

### Unchanged live responses

If newly downloaded Company Facts bytes have the same SHA-256 as the existing
source-store document, the acquisition result is `unchanged`. The existing
source-store entry remains authoritative and is not rewritten with a newer
retrieval timestamp. The operational run still records the new request finish
time separately.

This distinction answers two different questions:

- `source_fetched_at`: when the accepted stored representation was retrieved;
- `request_finished_at`: when this invocation completed its live request.

## Logical-run raw snapshot

After acquisition, `sources/snapshot.py` copies the validated source and both
metadata manifests into `<company>/runs/<logical-run-id>/raw/`. This freezes the inputs
for the rest of that logical run even if a later live invocation replaces the
source-store entry.

The raw `manifest.json` has schema version `2`.

| Field | Meaning |
| --- | --- |
| `company` | Slug, source-reported entity, and CIK |
| `preserved_at` | Operational UTC time when the logical-run copy was written |
| `representation.run_copy` | Declares a byte-for-byte copy from the source store |
| `representation.source` | Original stored representation kind and description |
| `source.kind` | `company_facts_source_store` |
| `source.manifest` | Copied source-store manifest artifact plus original display path |
| `source.document` | Source-store document identity and provenance |
| `artifact` | Run-relative Company Facts file, hash, and byte count |
| `upstream_manifest` | Copied acquisition manifest artifact plus original display path |

The logical run ID combines the cutoff, source hash, source-manifest hash, and
configuration hash. `preserved_at` is deliberately excluded, so operational
time cannot change logical identity.

## Validation and failure behavior

Acquisition or replay fails before normalization when any of these checks fail:

- invalid JSON or a non-object root;
- missing `cik`, `entityName`, or `facts`;
- a non-object `facts` value;
- a CIK mismatch between profile, document, or acquisition manifest;
- an entity mismatch between document and source-store manifest;
- a missing, unsafe, hash-mismatched, or size-mismatched artifact;
- incomplete URL, timestamp, or representation metadata; or
- unsupported schema or source type.

No later stage is allowed to repair or guess invalid source metadata.
