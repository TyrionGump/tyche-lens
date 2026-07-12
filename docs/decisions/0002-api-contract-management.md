# 0002 — API contract management between tyche-ui and tyche-api

> **Status:** proposed · **Date:** 2026-07-06

> **Note (2026-07-12):** written when `tyche-ui` and `tyche-api` were separate
> repositories; they now live in this monorepo as `apps/web` and `apps/api`.
> That changes the premise — client generation happens in the same working tree
> and lands in the same commit, so build attribution is automatic and the
> tag/pin scheme below is not currently practiced. Re-evaluate (accept a
> monorepo-adapted version or supersede) when the contract or consumer
> situation changes. The body below is unchanged apart from repointing two
> file references that moved when the repositories merged.

## Context

The UI (`tyche-ui`, React/TypeScript) and the general backend (`tyche-api`, Go)
live in separate repositories and exchange data over a REST API. The contract
is an OpenAPI document owned by `tyche-api` (`api/openapi.yaml`); the Go server
interface and the TypeScript client are both generated from it, so drift
between the two sides is caught by compilers — this was validated end to end
in the wire-up prototype (see the
[prototype spec](../../apps/api/docs/superpowers/specs/2026-07-04-ui-api-wireup-prototype-design.md)).

What the prototype does *not* have is change governance: `tyche-ui` generates
its client from the sibling checkout's working tree, so there is no statement
of which contract version a UI build used, no review gate on contract changes,
and no machine distinction between additive and breaking changes. Fine for one
developer; unacceptable between two teams.

A stated goal of this project is practicing professional development process.
Industry practice for REST APIs between separately deployed teams is
consistent: a provider-owned, machine-readable contract published as a
versioned artifact, generated clients, and CI gates for breaking changes
(Stripe, GitHub, Twilio, Kubernetes, Azure publish specs and generate SDKs;
Zalando's guidelines mandate spec-first authoring with CI linting). Companies
using other technologies (protobuf/gRPC, Thrift, Smithy, GraphQL with
persisted queries) enforce the same invariants with different tools.

Constraints: solo developer today, no CI yet, repositories not published, and
learning value is a first-class goal.

## Decision

Adopt **provider-owned, design-first OpenAPI with versioned releases and
pinned consumption**, growing governance in steps as the project grows:

- `tyche-api` owns `api/openapi.yaml`. The contract is hand-authored yaml,
  written and reviewed before implementation (design-first).
- Contract releases are git tags in `tyche-api` (`contract-vMAJOR.MINOR.PATCH`):
  additive changes bump minor, breaking changes bump major.
- `tyche-ui` generates its client from a **pinned tag**, never from the
  sibling working tree. Upgrading the pin is a deliberate, reviewable change.
- Compatibility policy:
  - Additive changes (new endpoints, new **optional** response fields) may
    ship at any time.
  - Renames, removals, and type changes only via deprecate-then-remove across
    a major contract version.
  - Values that can be legitimately unknown are `required` + `nullable`
    (always present, `null` when unknown) — never omitted.
- When CI exists: an `oasdiff` breaking-change gate on contract changes in
  `tyche-api`, and a regenerate-and-diff check in `tyche-ui` so the committed
  generated client cannot go stale.
- When a second consumer or team exists: publish the generated client as a
  versioned package and require consumer-team review (CODEOWNERS) on the
  contract file.
- Authoring format: raw OpenAPI yaml for now. Revisit when the contract
  exceeds roughly ten operations or yaml maintenance becomes error-prone;
  **TypeSpec** is the default upgrade (it emits OpenAPI, preserving
  design-first and the entire downstream toolchain). Code-first (e.g. huma)
  only if contract ownership is deliberately moved into the server team.

## Consequences

- ➕ Every UI build is attributable to a stated contract version; breaking
  changes become deliberate, visible events instead of silent drift.
- ➕ Same invariants the industry uses (contract as source of truth, codegen
  on both sides, machine-checked compatibility) at prototype-scale cost.
- ➕ The authoring format stays swappable: everything downstream consumes
  `openapi.yaml`, so adopting TypeSpec later is a contained change.
- ➖ Ceremony: contract changes require a tag, and reach the UI in two steps
  (release, then pin bump).
- ➖ Committed generated code can go stale until the CI drift check exists;
  until then, regeneration discipline is manual.
- 🔁 Revisit on: a second consumer (publish the client package; reconsider a
  dedicated contract repository), contract growth past ~10 operations
  (TypeSpec), or behavioral contract gaps that schemas cannot express —
  e.g. fields that are present but always `null` in practice, as discovered
  with FMP's `pe`/`eps` — which would motivate consumer-driven contract
  testing (Pact) as a complement.

## Alternatives considered

- **Sibling-path generation (status quo)** — zero ceremony, and how the
  prototype bootstrapped. Rejected as an ongoing practice: no version pinning,
  no change control, requires a co-located checkout.
- **Dedicated contract repository** — right shape when a contract is
  co-designed by many parties; ceremony without benefit while there is one
  provider and one consumer.
- **Code-first spec generation (huma, swag)** — makes the spec a build output
  that cannot lie about the server, but forfeits the contract as a reviewable
  design artifact (the property two teams need most) and would replace the
  working oapi-codegen server layer.
- **GraphQL** — a minority pattern concentrated in companies with platform
  teams; at scale its governance converges on persisted queries, i.e. fixed
  contracts again. Wrong cost/benefit here.
- **tRPC** — end-to-end types without codegen, but only inside a single
  TypeScript codebase; the server is Go.
- **Protobuf + Connect RPC** — the strongest typing and the industry norm for
  internal service-to-service RPC; a candidate for a future
  `tyche-api` ↔ `tyche-data-engine` boundary, but unnecessary indirection for
  a browser-facing REST API today.
- **Consumer-driven contract testing (Pact)** — verifies behavior rather than
  shape; established but niche, and it complements rather than replaces a
  schema. Deferred until behavioral gaps actually bite.

_See the [wire-up prototype spec](../../apps/api/docs/superpowers/specs/2026-07-04-ui-api-wireup-prototype-design.md)
for the prototype that validated the mechanics, and [0001](0001-compute-on-request-and-short-cache.md)
for the data-fetching model this API serves._
