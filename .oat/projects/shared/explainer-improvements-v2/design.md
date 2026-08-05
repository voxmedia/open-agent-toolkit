---
oat_status: in_progress
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
  as floor; diagram and deck move to planner-justified expansion with
  distinct-reader-question justification kinds.
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

_To be drafted._

## Data Models

_To be drafted._

## Error Handling

_To be drafted._

## Testing Strategy

_To be drafted._
