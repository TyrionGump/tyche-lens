# Normalization and discovery data

Normalization converts the nested Company Facts hierarchy into a line-oriented
observation stream and a compact concept catalogue. It prepares data for
selection without deciding which facts matter financially.

## Inputs and integrity checks

`normalize_company_facts` receives a `SourceSnapshot` and reads the preserved
`raw/companyfacts.json`.

Before conversion it verifies:

- the file SHA-256 still equals the source snapshot hash;
- the parsed CIK equals the configured ten-digit CIK; and
- `entityName` still equals the preserved entity name.

A change between preservation and normalization fails the company run.

## Conversion order

The transformation is mechanical:

1. Parse the preserved Company Facts JSON.
2. Iterate taxonomies in sorted name order.
3. Iterate concepts in sorted tag order.
4. Validate that every concept contains a `units` object.
5. Iterate units in sorted name order.
6. Retain every provider observation under that unit in provider order.
7. Add company, taxonomy, concept, and unit identity to each observation.
8. Write one compact JSON object per line to `observations.jsonl`.
9. Build one discovery summary per taxonomy/tag pair.
10. Write `concepts.json` with source references, counts, and summaries.

Sorting makes taxonomy, concept, and unit output deterministic. Observation
order inside one unit remains the order supplied by the SEC response.

## Normalized observation JSONL

`normalized/observations.jsonl` has no envelope. Each line is an independent
JSON object.

### Fields added by the pipeline

| Field | Type | Meaning |
| --- | --- | --- |
| `cik` | Text | Zero-padded ten-digit CIK |
| `entity` | Text | SEC-reported entity name |
| `taxonomy` | Text | Parent key under Company Facts `facts`, such as `us-gaap` |
| `tag` | Text | Concept key within the taxonomy |
| `unit` | Text | Unit key containing the source observation |

### Common SEC observation fields retained

The pipeline copies the complete provider observation object after adding the
identity fields. Company Facts commonly supplies:

| Field | Type | Meaning | Used by current selection? |
| --- | --- | --- | --- |
| `start` | Date text | Inclusive duration start | Required for duration evidence |
| `end` | Date text | Duration end or instant date | Required |
| `val` | JSON scalar | SEC-reported value | Published when selected |
| `accn` | Text | Filing accession number | Required for duplicate ordering and filing URL |
| `fy` | Number | Fiscal year associated with the filing | Retained, not used for period identity |
| `fp` | Text | Fiscal-period code | Must equal configured `FY` |
| `form` | Text | Filing form | Must be an eligible annual form |
| `filed` | Date text | Filing date | Cutoff and duplicate ordering |
| `frame` | Text | Optional SEC frame | Retained, not used as primary period identity |

Additional provider fields survive because the full observation object is
copied. The normalizer does not maintain a whitelist that would silently discard
a new SEC field.

Example line:

```json
{"cik":"0000104169","entity":"WALMART INC.","taxonomy":"us-gaap","tag":"Revenues","unit":"USD","start":"2025-02-01","end":"2026-01-31","val":713163000000,"accn":"0000104169-26-000055","fy":2026,"fp":"FY","form":"10-K","filed":"2026-03-13","frame":"CY2025"}
```

## Concept catalogue

`normalized/concepts.json` is a discovery index, not selected evidence.

### Root fields

| Field | Meaning |
| --- | --- |
| `schema_version` | Catalogue schema, currently `1` |
| `company.entity` | Source-reported entity |
| `company.cik` | Ten-digit CIK |
| `source.company_facts` | Run-relative raw document artifact reference |
| `source.manifest` | Run-relative raw manifest artifact reference |
| `counts.concepts` | Number of taxonomy/tag summaries |
| `counts.observations` | Number of JSONL rows written |
| `concepts[]` | Sorted concept summaries |

Every artifact reference contains `file`, `sha256`, and `bytes`.

### Concept summary fields

| Field | Meaning |
| --- | --- |
| `taxonomy` | Source taxonomy name |
| `tag` | Source concept tag |
| `label` | SEC concept label when present |
| `description` | SEC concept description when present |
| `observation_count` | Total observations across all units |
| `units[]` | Sorted unit summaries |

### Unit summary fields

| Field | Meaning |
| --- | --- |
| `unit` | Company Facts unit key |
| `observation_count` | Observation count for this unit |
| `first_end` | Lexicographically earliest available `end` date, or `null` |
| `last_end` | Lexicographically latest available `end` date, or `null` |
| `forms` | Sorted unique filing forms present in the unit observations |

The catalogue is intended for reviewing available concepts, units, forms, and
date coverage before adding an evidence definition. It is not a substitute for
checking the actual observations or the filing meaning.

## What normalization preserves

- The complete accepted Company Facts document remains in `raw/`.
- Every observation is retained, not only annual or configured concepts.
- Provider values remain associated with taxonomy, tag, unit, filing, and
  period fields.
- Labels and descriptions remain available in the catalogue.
- Source artifacts remain connected through path, SHA-256, and byte count.
- Missing optional fields stay absent instead of receiving invented defaults.

## What normalization changes

- The nested taxonomy/concept/unit hierarchy becomes repeated identity fields
  in JSONL rows.
- JSON is parsed and serialized again.
- Taxonomies, tags, and units receive deterministic ordering.
- Concept summaries aggregate counts, end-date coverage, and forms.

No financial calculations, tag substitution, unit conversion, period
selection, deduplication, or company assessment occurs here.

## Numeric representation limitation

The source bytes are preserved exactly, but normalized observations are parsed
with Python's standard `json` module and serialized again.

- JSON integers remain arbitrary-precision Python integers and therefore remain
  numerically exact.
- Non-integer JSON numbers become Python binary floating-point values. Their
  lexical form—for example trailing zeros—may not survive normalization.
- The current output stores `val` as a JSON scalar, not as a separate canonical
  decimal string.

Consumers can always audit against the preserved source bytes. If exact decimal
lexical preservation becomes a requirement for all fact types, normalization
must adopt a deliberate decimal-token representation and version the affected
schemas. Documentation must not claim that this is already implemented.

## Boundaries of Company Facts normalization

Company Facts is already an SEC-extracted, concept-centric dataset. It does not
carry the complete inline-XBRL context graph, all dimensions, visible table
layout, or untagged narrative values from an individual filing. Flattening
Company Facts therefore cannot recover information the endpoint did not supply.

These boundaries and the Walmart gross-profit example are documented in
[`70-evidence-boundaries.md`](70-evidence-boundaries.md).

## Failure and atomicity

Normalization fails on an invalid taxonomy object, a concept without a units
object, a unit without an observation list, malformed JSON, or changed identity
or source hash.

Both output files use temporary files followed by atomic replacement. A failed
write does not expose a partially written destination under its final name.

