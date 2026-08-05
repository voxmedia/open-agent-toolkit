---
oat_status: complete
oat_ready_for: null
oat_blockers: []
oat_last_updated: 2026-08-05
oat_generated: false
oat_template: false
---

# Design: explainer-improvements-v2

> Lightweight quick-mode design. Requirements live in
> `references/handoff-cyclone-case-study.md` (normative acceptance criteria)
> and `discovery.md`.

## Overview

This project hardens the explainer pipeline's integrity contracts and raises
its visual floor, in two largely independent tracks. Track one (integrity)
closes the path-derivation, link-construction, publication-verification, and
lifecycle-ordering gaps the Cyclone case study exposed: the OAT adapter gains
per-invocation remote destination derivation (`<repository-root>/projects/
<project-slug>` for project runs, repository root for repo runs) so the core
can keep blindly joining site-relative paths onto whatever `s3Uri`/
`publicBaseUrl` it is handed; the core gains a manifest-anchored post-render
internal-link validator plus canonical artifact URLs in author requests, so
free-form authors can no longer invent directory-style links; and publication
gains an explicit protected-destination policy (operator-approved
2026-08-05): a destination explicitly declared protected in config verifies
published bytes through authenticated in-bucket object checks (hash and
metadata compared against the manifest) and records canonical public URLs in
the receipt without fetching them, marked as
skipped-protected; undeclared destinations keep the strict credential-free
anonymous check and fail closed on 401/403. No injected verification
callback is built; a 401 is never treated as success — verification is
either run and passed, or explicitly skipped by declared config and recorded
as skipped. Published bytes must match finalized manifest hashes;
corrections re-enter the pipeline through rebuild and review, never
publication-time transformation.

Track two (visual) shifts standard recipe artifacts from author-owned
full-document HTML to renderer-owned structured content contracts. Authors
supply semantic content — slides with declared archetypes, diagrams as
semantic graph data, hub sections/cards/callouts — and versioned central
renderers own layout, typography, spacing, responsive behavior, and
components. A deterministic role-based type system (display/heading/body/UI/
annotation/mono with per-medium scales) replaces the generic `system-ui`/
`ui-serif` stacks. The `project-recap` recipe drops its three-artifact floor:
the hub remains required, and the planner must justify a diagram or deck with
a distinct reader question and sufficient evidence. The visual-review rubric
expands from legibility/clipping to scored design judgment (typography,
hierarchy, composition, density, medium leverage, repetition, diagram
semantics, cohesion), with the case study's deck and diagram enshrined as a
negative fixture that must yield `correct`, not `pass`.

Lifecycle changes adopt a flag-not-block stance (operator-approved
2026-08-05). The recap gate is ordered ahead of final approval: when a recap
resolves to `generate`, approval completion waits only for the gate to record
a terminal outcome — and `built-needs-review` is a valid terminal outcome, so
approval is never held hostage to visual polish. A `built-needs-review`
result automatically enters the bounded correction path (the existing
one-correction-then-final-review machinery): rebuild, re-review, and if still
not clean, keep the artifact, durably record residual findings, flag them for
the operator, and let the lifecycle proceed. Publication alone remains
quality-gated: a flagged run is durable and inspectable but is not published
until reviews pass or the operator explicitly overrides. The design also
defines a durable failed-run-evidence policy (compact failure record
retained; bulky diagnostics intentionally archived or deleted) and adds
regression coverage for the `request.sourceIds is not iterable`
content-processing failure. All existing
safety guarantees — immutable manifests, additive publishing, the human
publish gate, credential hygiene, provenance, accessibility — carry forward
unchanged, and nothing Duet-, VoxOps-, or bucket-specific enters the core.

## Architecture

### System Context

Everything lands in the two canonical skills: `.agents/skills/explainer-kit`
(provider- and destination-neutral core) and
`.agents/skills/oat-explainer-kit` (OAT adapter). The core continues to know
nothing about OAT topology, Duet, VoxOps, or buckets; the adapter continues to
own config resolution, invocation topology, and lifecycle integration. The
recap-gate ordering invariant additionally touches the OAT lifecycle surface
that invokes the adapter (project completion/approval flow).

**Key Components (changed or new):**

- **Adapter destination derivation (new, adapter):** composes the
  repository-scoped publish config (`s3Uri` root, `publicBaseUrl` root,
  region, provider) with the invocation to produce the per-run destination:
  project runs get `<root>/projects/<project-slug>`, repo runs get the root
  unchanged. Also unblocks the existing `repo` invocation path in the entry
  point (`resolve-paths.mjs` already supports it; `run.mjs` rejects it).
- **Canonical artifact link table (new, core):** the set plan already names
  every artifact; render exposes each artifact's site-relative
  `renderedPath` (always ending `index.html`) to authors as the only legal
  link targets — by URL or by artifact ID that the renderer resolves.
- **Internal-link validator (new, core):** post-render pass over every HTML
  artifact; resolves each local `href` against the source artifact's
  location, requires the target to exist in the manifest/site tree with
  explicit `index.html`, rejects directory-style links. Runs as a build
  failure, not a warning.
- **Publish connector protected-destination mode (changed, core):**
  publish-request gains an explicit public-access declaration; protected
  roots verify via authenticated in-bucket object hash/metadata checks and
  record unfetched canonical public URLs; undeclared roots keep the strict
  anonymous check. Receipt lists every artifact's ID, rendered path, S3 URI,
  public URL, content hash, and verification result.
- **Structured content renderers (new, core):** artifact-specific content
  contracts (hub sections/cards/callouts, deck slides with archetypes,
  diagrams as semantic graph data) rendered by core-owned renderers that own
  layout, typography, spacing, and responsive behavior. Builds on the
  existing deterministic diagram/graph machinery from explainer-improvements.
- **Type system (new, core):** deterministic role-based tokens
  (display/heading/body/UI/annotation/mono) with per-medium scales, consumed
  by the renderers and curated styles.
- **Visual review rubric v2 (changed, core):** expanded request/result
  contract scoring typography, hierarchy, composition, density, medium
  leverage, repetition, diagram semantics, and cohesion; the Cyclone deck and
  diagram become a bundled negative fixture.
- **Recipe floor change (changed, core):** `project-recap` keeps only the hub
  as floor; every other artifact — explainer views, diagrams, and decks —
  is planner-justified expansion requiring a distinct reader question and
  sufficient supporting evidence (diagram and deck join the existing
  justified expansion profiles).
- **Lifecycle ordering and correction (changed, adapter + OAT lifecycle):**
  recap gate must record a terminal outcome before final approval completes;
  `built-needs-review` auto-enters the existing bounded correction machinery;
  residual findings are durably flagged, never project-blocking; failed runs
  leave a compact durable failure record.

### Data Flow

```
oat lifecycle (approval waits for terminal recap outcome)
  └─ oat-explainer-kit run
       ├─ resolve config (provider, roots, region, publicAccess)
       ├─ resolve local output root (project|repo|direct)
       ├─ derive remote destination (root [+ projects/<slug>])
       └─ invoke explainer-kit core
            ├─ plan set (hub floor; justified diagram/deck)
            ├─ author structured content (canonical link table injected)
            ├─ render (core-owned layout + type system)
            ├─ validate internal links against manifest  ← new hard gate
            ├─ browser evidence (320/768/1440)
            ├─ visual review (rubric v2)
            │    └─ needs-review → bounded correction → re-review
            ├─ durability (flagged or clean; failure record if failed)
            └─ [human gate] publish
                 ├─ public root: anonymous byte verification
                 ├─ protected root: authenticated in-bucket verification
                 └─ receipt: every artifact's URLs, hash, verification
```

## Component Design

### 1. Adapter destination derivation (`oat-explainer-kit`)

**Purpose:** Turn repository-scoped publish config into a per-invocation
destination without the core learning OAT topology.

**Responsibilities:**

- Resolve the complete publish config (`provider: s3-static`, repository
  `s3Uri` root, repository `publicBaseUrl` root, `awsRegion`, and the new
  public-access declaration) and validate completeness before any publish
  intent is honored; incomplete config keeps runs build-only with an explicit
  report of what is missing.
- Derive `<root>/projects/<project-slug>` for project invocations and pass
  the root unchanged for repo invocations; slug segments use the same
  encoding rules as render-time URL construction.
- Accept the `repo` invocation at the entry point and route it through the
  existing `resolveExplainerOutputRoot` repo branch.
- Reject or normalize caller-supplied output roots that already end in the
  run slug (double-nesting guard).

**Interfaces:** extends the existing `resolve-config.mjs`/`run.mjs` seam; the
core continues to receive a fully-formed publish request and never sees
project/repo distinctions.

### 2. Canonical artifact link table (core)

**Purpose:** Make manifest-declared paths the only expressible internal link
targets for authors.

**Responsibilities:**

- Derive, from the set plan, each artifact's site-relative `renderedPath`
  (always explicit `index.html`).
- Inject the table into every author request (structured and artistic):
  artifact ID → canonical relative URL from the authoring artifact's
  location.
- Structured content references artifacts by ID only; the renderer resolves
  IDs to URLs. Artistic HTML must use the provided canonical URLs verbatim.

### 3. Internal-link validator (core)

**Purpose:** Hard post-render gate proving every internal link resolves.

**Responsibilities:**

- Parse every rendered HTML artifact (not only the hub); extract local
  `href`/`src` targets.
- Resolve each against the artifact's own site location; require the target
  to exist in the manifest/site tree; require explicit `index.html` for page
  links; reject directory-style links and any target outside the site tree.
- Fail the build with per-link findings; failures route into the bounded
  correction path like any other build defect.

### 4. Publish connector: protected destinations and complete receipts (core)

**Purpose:** Honest verification for both public and protected roots; durable
complete publication records.

**Responsibilities:**

- Publish-request declares `publicAccess: "public" | "protected"` (default
  `public`, preserving current strict behavior).
- `public`: unchanged sentinel + anonymous byte verification.
- `protected`: skip anonymous fetches entirely; verify each uploaded object
  via authenticated `head-object` hash/metadata comparison against the
  manifest; record canonical public URLs unfetched, verification result
  `verified-authenticated` per object with public fetch `skipped-protected`.
- Receipt (`publish-receipt.json`, durable in the run package) lists every
  artifact's ID, rendered path, S3 URI, canonical public URL, content hash,
  and verification result. Lifecycle summaries copy the complete URL set from
  the receipt instead of recording only the hub.
- Published bytes always match finalized manifest hashes; no
  publication-time transformation exists anywhere in the connector.

### 5. Structured content contracts and renderers (core)

**Purpose:** Move layout ownership from authors to versioned core renderers.

**Responsibilities:**

- Define artifact-specific structured content contracts:
  - **hub:** ordered sections, evidence tables, cards, callouts, artifact
    references (by ID);
  - **deck:** slides each declaring purpose, layout archetype (outcome hero,
    before/after, architecture, decision/trade-off, evidence scoreboard,
    comparison, next action), headline, evidence, optional
    comparison/visual, action;
  - **diagram:** nodes, groups/containers, edges with labels, layout
    direction, emphasis — semantic graph data, no author-supplied
    coordinates.
- Renderers own layout, typography, spacing, responsive behavior, print,
  reduced-motion, and components; diagram rendering extends the existing
  deterministic graph machinery with auto-fit viewBox, containers/swimlanes,
  edge labels, overlap/crossing detection, content-aware spacing, and
  zoom/pan only when the graph exceeds the viewport.
- Deterministic deck anti-filler checks: repeated title-plus-paragraph
  slides, excessive empty space, duplicated slide-position text, lack of
  visual variation, overflow, presentation-distance legibility.
- Artistic (free-form HTML) authoring remains available where recipes allow
  it, but always passes the link validator and visual review; standard recipe
  artifacts default to structured contracts.

### 6. Role-based type system (core)

**Purpose:** Deterministic, intentional typography without external active
content.

**Responsibilities:**

- Roles: display, heading, body, UI, annotation, mono — each with weights,
  tracking, line heights, and measures; medium-specific scales for pages,
  decks, and SVG labels.
- Deterministic high-quality font stacks by default; bundled licensed fonts
  only if licensing allows redistribution inside self-contained artifacts (a
  plan-time decision; stacks are the floor).
- Tokens flow through curated styles and the resolved theme bundle so replay
  stays deterministic.

### 7. Visual review rubric v2 (core)

**Purpose:** Catch design mediocrity, not just clipping.

**Responsibilities:**

- Extend the visual-review request/result contracts to require scored
  findings on: intentional typography, hierarchy, composition/balance,
  information density, medium leverage, template repetition, diagram
  semantics, cross-artifact cohesion.
- Verdict vocabulary distinguishes `pass` (design-quality bar met) from
  `correct` (legible/unclipped but weak) and failing states; the Cyclone
  deck/diagram screenshots ship as a bundled negative fixture that must not
  receive `pass`.
- Existing accessibility, keyboard, reduced-motion, print, and mobile checks
  are unchanged and remain necessary conditions.

### 8. Recipe v2: hub floor (core)

**Purpose:** Content-adaptive artifact selection.

**Responsibilities:**

- `project-recap` floor shrinks to the hub; explainer views, diagrams, and
  decks become planner-justified expansion requiring a distinct reader
  question and sufficient supporting evidence.
- The set planner records each justification in the set plan; redundant or
  filler artifacts are rejected at planning time.
- Other recipes are audited for the same contradiction but changed only where
  the same defect exists.

### 9. Lifecycle ordering, bounded correction, failure evidence (adapter + OAT lifecycle)

**Purpose:** Flag-not-block lifecycle with honest durable records.

**Responsibilities:**

- When recap intent resolves to `generate`, final approval cannot complete
  until the recap gate records a terminal outcome; `built-needs-review` is a
  valid terminal outcome.
- `built-needs-review` automatically enters the existing bounded
  one-correction-then-final-review machinery; residual findings after the cap
  are durably recorded and flagged, and the lifecycle proceeds.
- Publication stays quality-gated: flagged runs publish only after passing
  review or explicit operator override.
- Failed/superseded runs leave a compact durable failure record (run ID,
  recipe, outcome, error class, timestamps, pointer to superseding run);
  bulky diagnostics are intentionally archived or deleted per policy, never
  left as untracked-only evidence.
- The `request.sourceIds is not iterable` failure is root-caused at the
  adapter/core request boundary and covered by a shape-validation regression
  test.

### 10. Secondary path-contract fixes (core + adapter)

**Purpose:** Close the audit's remaining gaps.

**Responsibilities:**

- Reconcile `publicBaseUrl` residence (`durability.publish` vs top-level
  request field) into one documented location consumed consistently by all
  render and publish paths.
- Render-time and publish-time URL construction share one segment-encoding
  helper.
- Double-nesting guard (component 1) and repo-invocation unblock (component
  1. are the adapter-side halves of this cleanup.

## Data Models

All contracts are versioned JSON Schemas under `explainer-kit/schemas/`,
following the existing `explainer-kit.<name>/vN` convention. New versions are
additive where possible; consumers reject unknown schema versions as today.

- **Publish request (revised):** adds `publicAccess: "public" | "protected"`
  (default `public`). Roots remain credential-free; no other trust-model
  fields change.
- **Publish receipt (revised):** per-artifact entries gain canonical public
  URL and a structured verification result
  (`verified-anonymous | verified-authenticated | skipped-protected` plus the
  compared hash). Receipt remains atomic and durable in the run package.
- **Author request (revised):** gains the canonical artifact link table
  (artifact ID → site-relative canonical URL from the authoring artifact's
  location) and, for structured artifacts, the structured-content contract
  reference in place of full-HTML instructions.
- **Structured content contracts (new):** three schemas —
  `hub-content/v1`, `deck-content/v1` (slides with archetype enum),
  `diagram-content/v1` (semantic graph: nodes, groups, edges, labels,
  direction, emphasis). Author results carry structured content for standard
  artifacts; artistic artifacts keep the existing HTML result shape.
- **Set plan (revised):** expansion entries for diagram/deck/explainer views
  carry the planner's justification (reader question + evidence pointers);
  hub remains the only floor entry for `project-recap`.
- **Visual review request/result (v2):** request enumerates rubric
  dimensions; result requires per-dimension scored findings and a verdict
  that separates `pass` from `correct`.
- **Failure record (new):** compact durable record for failed/superseded
  runs — run ID, recipe, terminal outcome, error class, timestamps, pointer
  to any superseding run. Lives in the durable project tree, not untracked
  scratch space.
- **Type tokens (revised theme):** role-based typography tokens
  (display/heading/body/UI/annotation/mono, per-medium scales) join the
  resolved theme bundle so replay stays deterministic.

## Error Handling

- **Incomplete publish config:** the adapter reports exactly which fields are
  missing (provider, roots, region) and the run proceeds build-only; no
  partial publication is attempted.
- **Protected-root misdeclaration:** a root declared `public` that returns
  401/403 during verification fails closed exactly as today (sentinel
  failure aborts before artifact upload). A root declared `protected` never
  makes anonymous requests, so there is no 401 to misinterpret.
- **Link validation failures:** reported per link with source artifact,
  offending href, and expected canonical target; the build fails and the run
  routes into bounded correction, not publication.
- **Request-shape failures (`sourceIds` class):** the adapter/core request
  boundary validates shape before content processing and reports the exact
  field and expected type; regression coverage pins the original failing
  shape.
- **Bounded correction exhaustion:** residual findings are durably recorded
  in the run package and surfaced as flags; terminal outcome
  `built-needs-review` propagates to the lifecycle without blocking approval.
- **Failed runs:** always leave the compact failure record; diagnostic bulk
  follows the archive-or-delete policy and is never the only evidence.

## Testing Strategy

Tests live beside the existing suites (`explainer-kit/tests/`,
`oat-explainer-kit/tests/`) and run under `node:test` as today. The handoff's
required test matrix maps as:

- **Path derivation (unit, adapter):** local output roots for
  project/repo/direct invocations; remote destination derivation including
  `/projects/<slug>` composition, repo passthrough, double-nesting guard,
  and shared segment encoding.
- **Invocation fixtures (integration, adapter):** end-to-end project and
  repository invocation fixtures exercising the unblocked repo entry point.
- **Link validation (unit + fixture, core):** the exact broken links from the
  Cyclone hub (`../architecture/`, `../deck/`) as failing fixtures; passing
  fixtures with canonical `index.html` targets; validation across all
  artifacts, not only the hub.
- **Publication (integration, core):** explicit `index.html` in every object
  path; project-prefix placement; manifest-hash byte equality; receipt
  completeness (every artifact's URLs, hash, verification result);
  protected-root behavior (no anonymous fetch, authenticated verification,
  `skipped-protected` recording); declared-public 401/403 still fails
  closed; credential-hygiene assertions on requests, manifests, logs,
  receipts.
- **Request-shape regression (unit, adapter/core boundary):** the
  `request.sourceIds is not iterable` shape pinned as a failing input that
  now yields a structured validation error.
- **Structured rendering (unit + golden, core):** renderer output for each
  contract; deck anti-filler checks as deterministic unit tests; diagram
  semantic-layout properties (auto-fit, labels, overlap detection).
- **Golden fixtures (visual, core):** desktop/tablet/mobile (320/768/1440)
  golden fixtures for hub, diagram, and deck rendered from structured
  content; existing three golden benchmarks stay green throughout.
- **Negative visual-quality fixture (core):** the Cyclone deck and diagram
  bundled as a rubric-v2 fixture whose review must yield `correct`, not
  `pass`.
- **Lifecycle (integration, adapter):** gate-ordering invariant (approval
  waits for terminal outcome); auto-entry into bounded correction from
  `built-needs-review`; failure-record creation on failed runs; flagged runs
  blocked from publication without override.
- **Release gates:** five-package lockstep validation (`pnpm release:validate`)
  and canonical-skill version bumps with provider sync, per repo policy.
