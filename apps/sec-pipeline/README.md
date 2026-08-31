# SEC data pipeline

> **Status:** first-class alpha batch producer. The end-to-end boundary is
> implemented and exercised, while evidence coverage and deployment choices
> remain intentionally evolvable.

This application turns SEC Company Facts into traceable, application-neutral
evidence for independently deployed consumers:

```text
acquire or replay
  -> preserve
  -> normalize
  -> select
  -> publish each company
  -> publish one complete delivery
  -> record the operation
```

It prepares source-grounded data. It does not evaluate a company, calculate an
investment score, forecast price movement, or give financial advice.

## Run

From `apps/sec-pipeline/`:

```sh
uv sync --locked
uv run --locked tyche-sec-pipeline
```

There is one executable and no command-line argument surface. Configuration
comes from the process environment.

The default mode is `replay`, which validates and reprocesses the current
preserved source store without contacting the SEC. Runtime source data is
ignored by Git, so a fresh checkout needs either a restored `data/sources/`
directory or one intentional live run.

For reproducible output, set an explicit filed-date cutoff:

```sh
export TYCHE_SEC_AS_OF=2026-08-13
uv run --locked tyche-sec-pipeline
```

Without that variable, `as_of` is the current local date. A later date can
legitimately create a different logical result from the same preserved source.

## Live collection

To update the normal source store from the official SEC Company Facts endpoint:

```sh
export TYCHE_SEC_SOURCE_MODE=live
uv run --locked tyche-sec-pipeline
```

To rehearse without changing the default store:

```sh
export TYCHE_SEC_SOURCE_MODE=live
export TYCHE_SEC_DATA_DIRECTORY=data/live-rehearsal
export TYCHE_SEC_AS_OF=2026-08-13
uv run --locked tyche-sec-pipeline
```

Change the source mode to `replay` while retaining that data directory to
reprocess the isolated snapshots.

Live requests use the contact identity hardcoded in `settings.py`:

```text
tyriongump@gmail.com
```

This is an operator identifier, not a credential or secret. It requires no
application process and will be public when the source repository is public.
The [current SEC developer guidance](https://www.sec.gov/about/developer-resources)
asks scripted clients to declare a User-Agent, and its
[example](https://www.sec.gov/about/webmaster-frequently-asked-questions#developers)
includes an organization or application name plus a contact address. The
current email-only value was an explicit project choice; review a more
descriptive value before production use.

## Configuration

| Variable | Default | Meaning |
| --- | --- | --- |
| `TYCHE_SEC_SOURCE_MODE` | `replay` | Validate archived sources or collect `live` |
| `TYCHE_SEC_DATA_DIRECTORY` | `./data` | Source store, working data, publications, and deliveries |
| `TYCHE_SEC_AS_OF` | Current local date | Inclusive SEC filing-date cutoff in `YYYY-MM-DD` form |

The pipeline handles all configured companies, records failures by stage, and
returns `0` only when every company and the delivery complete. A non-blocking
lock prevents overlapping writers to one data directory.

## Documentation

The numbered files are the documentation source of truth and sort in reading
order:

| Document | Question answered |
| --- | --- |
| [`00-pipeline-overview.md`](docs/00-pipeline-overview.md) | What does the pipeline own, produce, and deliberately exclude? |
| [`10-source-acquisition.md`](docs/10-source-acquisition.md) | How are live and replay sources represented and validated? |
| [`20-normalization.md`](docs/20-normalization.md) | How does nested Company Facts become discovery data? |
| [`30-evidence-selection.md`](docs/30-evidence-selection.md) | Which observations qualify, and how are periods and duplicates resolved? |
| [`40-publication-schema.md`](docs/40-publication-schema.md) | What does one application-facing company document mean? |
| [`50-delivery-contract.md`](docs/50-delivery-contract.md) | What can an independent consumer safely load? |
| [`60-provenance-and-operations.md`](docs/60-provenance-and-operations.md) | How do identities, reports, failures, locking, and replay work? |
| [`70-evidence-boundaries.md`](docs/70-evidence-boundaries.md) | What did filing probes teach, and what must not be conflated? |
| [`80-extending-profiles.md`](docs/80-extending-profiles.md) | What do current profiles select, and how should coverage grow? |

The docs describe the current implementation and retained evidence-boundary
findings. They are not a long-term product roadmap.

## Read the code

| File | Responsibility |
| --- | --- |
| [`main.py`](src/sec_pipeline/main.py) | Minimal process entry point |
| [`runner.py`](src/sec_pipeline/runner.py) | Explicit stage order, per-company failure isolation, and exit status |
| [`settings.py`](src/sec_pipeline/settings.py) | Environment adapter that builds the pipeline configuration |
| [`validation.py`](src/sec_pipeline/validation.py) | Cross-stage configuration checks before any I/O |
| [`identity.py`](src/sec_pipeline/identity.py) | Configuration hashes and operational run identifiers |
| [`records.py`](src/sec_pipeline/records.py) | Company and pipeline operational run records |
| [`profiles/`](src/sec_pipeline/profiles) | Shared definitions, company-specific policy, and the profile registry |
| [`sources/`](src/sec_pipeline/sources) | SEC acquisition, validated source-store ownership, and logical-run snapshots |
| [`evidence/`](src/sec_pipeline/evidence) | Loss-minimizing normalization and deterministic evidence selection |
| [`publishing/`](src/sec_pipeline/publishing) | Company-publication ownership and immutable all-company delivery |
| [`locks.py`](src/sec_pipeline/locks.py) | Single-writer enforcement |
| [`models.py`](src/sec_pipeline/models.py) | Shared domain, policy, and stage-result contracts |
| [`storage.py`](src/sec_pipeline/storage.py) | Atomic writes, hashes, sizes, and display paths |

Only `runner.py` invokes stage operations, keeping their order visible
rather than hiding the workflow behind a backend-service abstraction.

### Enforced dependency layers

The import direction is a contract, declared in `pyproject.toml` under
`[tool.importlinter]` and checked by `uv run lint-imports`:

```text
main
runner | settings
publishing
evidence | sources | profiles | identity | records | validation
models | storage | locks
```

Each layer may import the layers below it and never above. Modules sharing a
layer are independent and must not import one another, so `evidence/` and
`sources/` cannot reach into each other, and `records.py` cannot reach into
`publishing/`. Adding an edge that inverts this order fails CI.

Four further contracts police the interior of each package, so direction holds
inside them as well as between them:

```text
sources/      acquisition | snapshot  >  store
evidence/     selection  >  normalize
publishing/   delivery  >  company
profiles/     registry  >  aapl | jpmorgan | walmart  >  common
```

`evidence/` has no internal edge today; it is ordered rather than declared
independent so that if selection ever reads normalization output back, it may do
so through a normalize-owned reader — the pattern every other stage boundary
already uses.

All five contracts are exhaustive: a new module must be placed in the order
deliberately, rather than arriving outside the architecture. Each
persisted artifact is loaded and validated by its owning package before another
stage consumes it; downstream code does not independently reconstruct its raw
JSON contract.

`models.py` owns the aggregate `PipelineSettings` value. The
environment adapter builds it, and the runner and validator consume it at the
composition boundary. Recording, delivery, and processing helpers receive only
the explicit values they need.

## Persistence boundary

Files are currently authoritative for raw provenance, deterministic replay, and
the application-facing handoff:

```text
data/
├── sources/          # current validated inputs
├── <company>/runs/   # raw, normalized, selected, and run artifacts
├── publications/     # immutable company snapshots
├── deliveries/       # immutable consumer bundles and latest pointer
└── pipeline-runs/    # operational invocation history
```

A normal consumer reads only `deliveries/latest.json` and its referenced
bundle. The Go backend can persist or project that delivery independently; it
does not need access to producer source code or working artifacts.

## Validate

The focused pipeline suite uses synthetic local Company Facts and does not
contact the SEC:

```sh
uv run --locked python -m unittest discover -s tests -v
uv build
```

The repository also retains a successful three-company live acceptance snapshot
under `data/acceptance-2026-08-13`.

## Deliberately unresolved

- production scheduling and orchestration;
- remote object storage, transport, retention, and monitoring;
- incremental rather than whole-document normalization;
- filing-specific XBRL and visible-table integration;
- exact-decimal representation in normalized and published JSON; and
- the eventual breadth of reviewed company evidence.

## Non-goals

- a web API or backend database service;
- a scheduler or workflow platform;
- one rigid evidence list for every company;
- silent tag substitution or derivation for missing evidence;
- deep financial analysis, valuation, forecasting, or recommendations; or
- a claim that three company profiles cover every SEC reporting shape.
