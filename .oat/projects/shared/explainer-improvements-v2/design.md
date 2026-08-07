---
oat_status: complete
oat_ready_for: null
oat_blockers: []
oat_last_updated: 2026-08-06
oat_generated: false
oat_template: false
---

# Design: explainer-improvements-v2

> Revised lightweight design. The production observations in
> `references/handoff-cyclone-case-study.md` remain the evidence base. The
> operator's 2026-08-06 scope decision supersedes its prescribed structured
> renderer, deterministic visual-heuristic, and expanded golden-fixture
> implementation details.

## Overview

The explainer system will use a small executable safety kernel and a
prose-driven creative layer.

The executable kernel owns behavior that must be deterministic: destination
derivation, credential hygiene, canonical internal links, post-render link
validation, manifest/hash equality, complete publication receipts, protected
destination verification, publication authorization, and lifecycle ordering.
These checks remain code because guidance alone cannot guarantee them.

Skill and recipe prose owns behavior that requires editorial judgment:
artifact selection, narrative purpose, typography, composition, slide
archetypes, diagram semantics, density, medium choice, and visual critique.
Authors continue producing Markdown or artistic HTML. This project will not add
structured hub/deck/diagram content schemas, general-purpose renderer engines,
semantic graph layout code, deterministic visual-quality scoring, or new
golden-test matrices.

Phase p01 already established the adapter path boundary. Project runs derive
`<repository-root>/projects/<encoded-project-slug>`; repository and direct runs
retain their repository roots. Credential-bearing and malformed destination
roots are rejected before core invocation or request persistence. The
provider-neutral core remains unaware of OAT project topology and private
configuration.

## Architecture

### Core: `explainer-kit`

The core remains destination-neutral and config-blind. It owns:

- versioned author and publication contracts;
- manifest-relative artifact path composition;
- canonical internal-link generation and validation;
- rendering, browser evidence, visual-review orchestration, and durability;
- immutable manifest hashes and additive publication;
- publisher entry-point enforcement and durable receipts.

The core receives already-derived destination roots. It does not read OAT
configuration, derive project topology, or acquire credentials.

### Adapter: `oat-explainer-kit`

The adapter owns:

- OAT project/repository/direct invocation topology;
- source binding and reviewed-repository provenance;
- config resolution and source-aware `publicAccess`;
- per-invocation local and remote destination derivation;
- lifecycle summaries and completion integration.

Only validated, credential-free, topology-free destination data crosses into
the core.

### Lifecycle callers

Project completion and implementation closeout call a shared terminal-outcome
guard. When recap generation is selected, final approval cannot complete until
the recap records one of:

- `built-durable`;
- `built-not-durable`;
- `built-needs-review`;
- `failed`.

Missing records and `incomplete` are non-terminal and block approval.
`built-not-durable`, `built-needs-review`, and `failed` do not block project
completion once recorded, but they are categorically unpublishable. One bounded
correction may rebuild and re-review a flagged run. A remaining failure or
quality flag is recorded as closed, locally generated evidence rather than
hidden.

### Retained evidence boundary

Provider-controlled free text is ephemeral. It may guide an in-memory correction
within the current run, but it never crosses into terminal evidence, build
records, manifests, warnings, returned loggable results, archive exports, or
other durable state.

Retained failure and review evidence contains only:

- run and manifest identity;
- terminal outcome and evidence disposition;
- stable locally generated reason/finding codes from closed enums;
- validated local artifact identifiers where needed;
- bounded counts and fixed redaction markers.

The code model is a closed pair rather than provider-supplied text:

- `stage`: `planning`, `authoring`, `rendering`, `link-validation`,
  `browser-review`, `visual-review`, `durability`, or `finalization`;
- `kind`: `finding`, `provider-failure`, `pipeline-failure`, or `superseded`.

Optional artifact IDs are validated against the run manifest. Counts are
bounded non-negative integers. No generic message, description, evidence,
correction, details, metadata, or arbitrary code field exists in the retained
shape.

Provider messages, descriptions, evidence prose, correction prose, serialized
objects, token-like strings, and arbitrary thrown values are mapped to local
codes at the provider boundary and then discarded. Consumers reject unknown
fields rather than trying to sanitize arbitrary text. Credential scrubbing may
remain defense in depth for ephemeral display, but it is not the durable safety
boundary.

### Prose-driven creative layer

Recipes, briefs, and skill guidance define:

- a required navigational hub;
- optional diagrams, decks, or deep dives only when they answer a distinct
  reader question supported by evidence;
- typographic roles and hierarchy rather than a hardcoded universal type
  engine;
- slide archetypes as editorial patterns, not renderer enums;
- diagram expectations such as meaningful topology, readable labels,
  fit-to-content framing, and explicit relationships;
- visual-review dimensions covering hierarchy, composition, density,
  repetition, medium leverage, diagram semantics, and cross-artifact cohesion.

The critic continues returning the existing actionable pass/correct outcome.
The rubric guides judgment; scripts do not pretend to measure design quality
deterministically.

## Data and Control Flows

### Authoring and links

1. The set planner chooses artifacts and assigns stable artifact IDs.
2. The core derives each artifact's explicit site-relative path ending in
   `index.html`.
3. Each author request receives a canonical link table appropriate to its own
   location.
4. The author emits Markdown or HTML using those links.
5. After rendering, the core validates internal `href`, `src`, and embedded
   references against the manifest and generated site tree.
6. Relative paths, fragments, and explicitly safe embedded references are
   classified separately. Invalid or ambiguous references fail closed.
7. A failed link gate may use the existing one-correction path. The corrected
   output is rerendered and revalidated before browser or visual review.

### Publication

1. The human publication gate remains mandatory.
2. The adapter supplies derived roots and the explicit public-access mode.
3. The core uploads finalized bytes without transforming them.
4. Public destinations verify object bytes and anonymous public URLs.
5. Protected destinations verify object bytes through authenticated
   service-computed checksums or authenticated download hashing. Public URL
   fetching is explicitly recorded as skipped-protected.
6. The receipt covers every manifest artifact plus generated auxiliary objects,
   with exact path, URI, URL, hash, and object/public verification facts.
7. Any mismatch fails publication; it never patches the published object.

### Lifecycle

1. The caller records recap intent before final approval.
2. Generation validates `sourceIds` at the contract boundary.
3. Rendering, link validation, browser review, and visual review produce a
   terminal outcome.
4. A flagged run may receive one correction. Remaining findings are projected
   to stable local codes in a compact durable record; provider prose is
   discarded.
5. Review-clean `built-durable` runs may proceed to the separate human
   publication gate. `built-not-durable`, flagged, failed, and superseded runs
   cannot publish.

## Versioning and Compatibility

Only contract changes required by the safety kernel receive new versions:

- `author-request/v3` for canonical link tables while retaining Markdown and
  HTML authoring;
- `publish-request/v2` for explicit public-access behavior;
- `publish-receipt/v2` for exact object/public verification and auxiliary
  object coverage;
- `project-recap@2` for the hub floor and prose-led adaptive expansion;
- `terminal-evidence/v1` for code-only terminal failure/review evidence.

`terminal-evidence/v1` is introduced and finalized within this unreleased
branch. Its final shipped shape is closed and code-only; no released consumer
depends on the superseded pre-release free-text shape. Producers and consumers
move atomically, and archive/finalizer paths reject unknown free-text fields.

Existing contract and recipe versions remain readable for deterministic replay.
New producers and all shipped consumers move atomically:

- author-request v3 activation includes the adapter completion callback fixture
  that currently asserts v2;
- publish-request v2 activation makes `run-request/v1` accept embedded publish
  request v1/v2, advances the core version and adapter minimum-core floor, and
  updates compatibility tests before the adapter emits v2;
- publish-receipt v2 activation updates release and smoke readers in the same
  task that emits v2;
- project-recap v2 activation switches and tests the adapter's live recipe
  selection while preserving v1 replay.

## Safety Invariants

- Publishing remains human-gated and additive.
- Published bytes equal finalized manifest bytes.
- No publication-time HTML or asset mutation is allowed.
- Credentials never appear in config-derived requests, manifests, receipts,
  logs, fixtures, or public URLs.
- Provider-controlled free text never appears in retained artifacts or returned
  loggable result shapes; durable evidence is code-only and closed.
- Protected public access is explicit; 401/403 is never treated as success.
- Flagged, failed, or superseded runs are unpublishable.
- Corrections rebuild, rerender, revalidate, and re-review.
- The core stays provider-neutral and OAT-topology-blind.
- Existing v1/v2 artifacts remain replayable where their contracts promise it.

## Testing Strategy

Tests are proportional to the invariant:

- pure unit tests for path/URL composition, credential rejection, reference
  classification, schema validation, and receipt coverage;
- focused integration tests for adapter-to-core request composition, hard link
  gating, lifecycle ordering, and publication behavior;
- canary tests that inject arbitrary provider strings and assert their exact
  bytes do not occur anywhere in retained trees or returned loggable results;
- one cross-boundary fake-destination acceptance test covering project and
  repository paths, exact bytes, explicit `index.html`, protected/public modes,
  and complete receipts;
- narrow regression coverage for `request.sourceIds is not iterable`.

This project adds no new Chromium golden matrix and does not expand the existing
three-case, 27-capture suite. Simplifying that suite is a separate follow-up
requiring an evidence-based coverage, runtime, and flakiness audit.

Repository completion gates remain:

1. `pnpm check`
2. `pnpm type-check`
3. `pnpm test`
4. `pnpm build`

Canonical-skill changes also run `pnpm lint` and `pnpm format`. Publishable
package changes run `pnpm release:validate`; docs changes run
`pnpm build:docs`.

## Deliberate Non-Goals

- Structured hub, deck, or diagram content schemas.
- Renderer-owned universal layout or typography engines.
- A general-purpose semantic graph layout/crossing engine.
- Deterministic whitespace, density, filler, or visual-quality scoring.
- Additional viewport goldens or negative visual snapshot matrices.
- Replacing the existing golden suite in this project.
- Silent publication overrides for flagged runs.
- Credential callbacks or persisted authentication material.

## Decision Record

The original design would have been robust but overengineered for the case
study. Its renderer subsystem, visual heuristics, contract fan-out, and golden
matrix increased maintenance and migration risk without protecting additional
safety invariants. The revised design preserves deterministic enforcement at
trust boundaries and moves creative quality back to the skills, recipes, and
human/agent critic where judgment belongs.
