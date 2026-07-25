---
oat_status: complete
oat_ready_for: null
oat_blockers: []
oat_last_updated: 2026-07-25
oat_generated: false
oat_template: false
---

# Design: explainer-authoring-redesign

## Overview

This redesign replaces explainer-kit's content layer while leaving its machine
rails — run identity, manifest and immutable hashing, approval modes, publish
safety, and RC acceptance — untouched. The v1 content model
(`author-result/v1` flat prose sections rendered through an HTML-escaping
single-paragraph template) is retired and replaced with **two first-class
authoring paths, selected per artifact type**: a _narrative path_, where
content is authored in Markdown against a strong prose brief and rendered
deterministically into a rich, house-styled block vocabulary (headings,
tables, lists, callouts, timelines, inline diagrams); and an _artistic path_
for decks, explainers, and standalone diagrams, where the agent composes HTML
starting from curated shells with theme tokens, licensed by prose to expand
beyond them when the content warrants.

The quality mechanism inverts: **prose carries quality, schemas carry
identity.** Content contracts shrink to essentially `{artifact, authored
content, provenance}`; editorial expectations (required narrative coverage,
"≥1 high-level architecture diagram," depth floors) live in versioned author
briefs that the lifecycle passes into every run — including unattended ones —
and are checked as _guidelines that degrade to manifest warnings_, never hard
failures. Hard validation is reserved for genuine invariants: HTML/script
safety on the artistic path, citation and provenance integrity, and the
publish boundary. Render QA returns as a first-class stage (headless load plus
layout probes) whose findings are recorded as warnings in every mode.

Artifact sets scale with content: recipes declare a floor (one rich narrative
page with at least one architecture diagram) plus licensed expansion, rather
than an exact artifact list — a substantial project may legitimately grow
standalone diagrams, sub-diagrams, and a deck, with the narrative page
assuming hub duty. Cross-run determinism of content is an explicit non-goal
(cohesion comes from shared shells, themes, and briefs); per-run integrity
hashing is retained unchanged. Interactive runs keep the existing approval
gate, now reviewing a Markdown draft; unattended runs — including recaps
triggered by automated project completion — flow through end-to-end and are
distinguishably marked as auto-drafted.

## Architecture

### System Context

The explainer-kit core remains a packaged, provider-neutral pipeline invoked
through `run-request/v1` by adapters (the `oat-explainer-kit` lifecycle
adapter, personal wrappers, autonomous project completion). This redesign
replaces the middle of the pipeline — authoring, rendering, and content QA —
and leaves both ends alone: upstream, fact-base processing
(supplied/federated) and the approval-mode machinery; downstream, manifest
assembly, immutable hashing, and the s3-static publish connector.

### Component Diagram

```
fact base ──▶ author stage ──▶ content records ──▶ render ──▶ validate ──▶ render QA ──▶ manifest ──▶ (publish)
              brief + facts     markdown | HTML     per-path    safety=hard   warnings      warnings[],
              per artifact      + provenance                    floors=warn                 auto-drafted mark
```

**Key Components:**

- **Author briefs:** versioned prose artifacts, per recipe/artifact type,
  carrying audience, voice, per-section intent, floors, and the expansion
  license. The lifecycle (closeout, autonomous completion) constructs and
  passes them into unattended runs; closes the "critic callback documented,
  author callback not" gap.
- **Author contract v2:** minimal — artifact identity + authored content
  (Markdown for narrative artifacts, HTML for artistic ones) + provenance. No
  section-shape enforcement.
- **Narrative renderer:** Markdown → validated AST → themed block library.
  Deterministic given the same input; the house style lives here once.
- **Artistic composer path:** curated shells + theme tokens as the starting
  canvas; agent-composed HTML validated at the DOM level rather than rendered.
- **Guideline checker:** evaluates brief floors; emits manifest `warnings[]`;
  never blocks.
- **Render QA stage:** headless load + layout-probe battery for every built
  artifact in every mode; findings as warnings; degrades gracefully where no
  headless runtime exists.
- **Recipe contract v2:** artifact floor + allowed expansion types instead of
  an exact artifact list.
- **Approval & marking:** interactive gate reviews the Markdown draft(s);
  unattended runs auto-approve with a distinguishable `auto-drafted` marking.

**Data flow (per artifact):** the author stage receives the fact base plus the
artifact's brief and returns authored content with provenance; narrative
artifacts flow through the renderer, artistic ones through DOM validation; the
guideline checker and render QA append warnings; the manifest records
artifacts, hashes, warnings, and approval marking exactly as today.

## Component Design

### 1. Author briefs

- **Purpose:** Carry the editorial bar into every run — the redesign's quality
  mechanism.
- **Responsibilities:** Define audience, voice, per-section intent, artifact
  floors ("one rich narrative page, ≥1 high-level architecture diagram"), and
  the expansion license ("add sub-diagrams / a deck / standalone pages when the
  content earns it"). One brief per recipe, with per-artifact-type sub-briefs
  where the artistic path needs its own guidance.
- **Interfaces:** Briefs ship with the core as versioned prose files alongside
  recipes; the author request references the brief content (inlined at request
  construction) so an unattended author callback receives everything needed in
  one payload. The lifecycle adapter (closeout / autonomous completion)
  selects the brief for the recipe it invokes — documentation for constructing
  the author callback becomes part of the closeout contract.
- **Notes:** Briefs are guidance, not schema. Changing a brief changes output
  quality expectations without any contract migration.

### 2. Author contract v2

- **Purpose:** Let authors produce rich content without shape constraints.
- **Responsibilities:** Bind an author response to an artifact and its
  provenance. Content is `markdown` for narrative artifacts and `html` for
  artistic artifacts (exactly one present, matching the artifact's declared
  path). Provenance carries author identity, generation time, and method as
  today.
- **Interfaces:** Replaces `author-result/v1` (`sections[].prose`) with
  `author-result/v2`: `{schemaVersion, artifactId, content: {markdown | html},
provenance}`. The author request (`author-request/v2`) carries the fact
  base, the artifact's brief, the shell/template reference for artistic
  artifacts, and the theme tokens.
- **Migration:** v2 schemas are new `$id`s; the core's semver majors (2.0.0).
  v1 recipes/schemas are removed rather than dual-supported — the packaged
  skill's consumers (lifecycle adapter, wrappers) move in the same release.

### 3. Narrative renderer

- **Purpose:** Deterministic rich rendering for markdown-authored artifacts.
- **Responsibilities:** Parse CommonMark + GFM (tables, task lists,
  strikethrough) plus fenced diagram blocks (mermaid-class vocabulary rendered
  build-time to inline SVG — no client-side script); validate the AST against
  a safe node set (no raw HTML passthrough by default; absolute links per the
  publish contract); render through the themed block library (section
  numbering, sticky TOC, callouts, timelines, evidence tables, code blocks,
  figures); emit the same self-contained HTML profile the current templates
  produce.
- **Interfaces:** Input: authored markdown + theme + artifact metadata.
  Output: rendered HTML written to the artifact's `site/` path, hashed into
  `immutableHashes` as today. AST validation failures that are safety-related
  are hard errors; style/structure findings are warnings.
- **Notes:** The block library is the single place the house style is defined
  for narrative surfaces; both light/dark modes come from the existing theme
  system.

### 4. Artistic composer path

- **Purpose:** Restore 0.4.1-level artistic latitude for decks, explainers,
  and standalone diagrams.
- **Responsibilities:** Provide curated shells (deck shell, explainer shell,
  diagram canvas) and theme tokens as the starting canvas; accept
  agent-composed HTML; validate at the DOM level — hard-fail on unsafe
  content (script elements, event handlers, external active content),
  warn on style-family deviations (missing theme token usage, missing
  required anchors).
- **Interfaces:** The author request for an artistic artifact includes the
  shell source and theme tokens; the response's `html` is the complete
  artifact document. Validation is a parse-level allowlist pass, not
  regex.
- **Notes:** Shells are starting points by explicit prose license — the brief
  states floors and grants expansion. Cross-set cohesion comes from tokens +
  shells, not from output determinism.

### 5. Guideline checker

- **Purpose:** Make editorial floors visible without blocking.
- **Responsibilities:** Evaluate brief floors against built artifacts:
  narrative coverage (recap's six-section story present in some form), "≥1
  architecture diagram" (inline or standalone), depth signals (e.g., presence
  of structured blocks for a completed project). Append findings to manifest
  `warnings[]` with a stable finding vocabulary.
- **Interfaces:** Runs post-render, pre-manifest. Findings surface at the
  interactive approval gate and persist in the manifest for unattended runs.

### 6. Render QA stage

- **Purpose:** Catch what structural checks cannot — clipped diagrams,
  overflow, unreadable output.
- **Responsibilities:** Serve the built site dir locally, load each artifact
  headlessly, run the layout-probe battery (document and inner-container
  overflow, viewport clipping, heading readability), with animations disabled
  for stability. Record findings as warnings.
- **Interfaces:** Uses the existing `browserProbe` injection seam in the QA
  stage; when no headless runtime is available (constrained cloud
  environments), the stage records a single "render QA skipped — no headless
  runtime" warning rather than failing.

### 7. Recipe contract v2

- **Purpose:** Content-driven set scaling.
- **Responsibilities:** Declare the floor (required artifacts with types and
  briefs — for `project-recap`: one narrative page) and the allowed expansion
  (artifact types the author may add: diagrams, decks, additional pages, up to
  sane limits). Validation treats floor misses as warnings (guideline checker)
  and undeclared artifact types as errors.
- **Interfaces:** `recipe/v2` replaces the exact `artifacts[]` list with
  `floor[]` + `expansion{allowedTypes, limits}`. The manifest's artifact list
  remains variable-length as today (no manifest change).
- **Notes:** With multi-artifact sets, the narrative page assumes hub duty via
  the existing `artifactLinks` mechanism.

### 8. Approval & marking

- **Purpose:** Keep human gating optional-but-real; make autonomy honest.
- **Responsibilities:** Interactive runs pause at the existing approval
  checkpoint with the Markdown draft(s) and accumulated warnings as the review
  surface. Unattended runs (including automated project completion) flow
  through end-to-end; the approval record and manifest carry `auto-drafted`
  (vs `human-approved`) so published pages and catalogs can mark and filter.
- **Interfaces:** Extends the existing content-approval record and manifest
  with the marking field; no change to run-request modes. The lifecycle's
  automated completion chain (document / summary / pr-final / recap) always
  invokes recap runs with `mode: unattended`.

## Data Models

Conceptual contract shapes (exact JSON Schema is implementation work):

- `author-request/v2`: `{schemaVersion, artifactId, artifactType, brief,
factBase, shell?, theme, floor?}`
- `author-result/v2`: `{schemaVersion, artifactId, content: {markdown |
html}, provenance{authorId, generatedAt, method?}}`
- `recipe/v2`: `{schemaVersion, id, version, sourceRoles, briefRef, floor:
[{id, type, authoring: markdown|html, template?}], expansion:
{allowedTypes[], limits?}, discoveryLimits}`
- `content-approval/v2`: adds `marking: human-approved | auto-drafted` to the
  existing record.
- Manifest (`manifest/v1`): unchanged shape; variable artifact list and
  `warnings[]` already suffice; approval marking rides in the existing
  approval record and is surfaced in the manifest's outcome context.

## Error Handling

Two-tier taxonomy, applied uniformly:

- **Hard errors (fail the stage, recorded in build record):** unsafe HTML/AST
  content (script, event handlers, active external content), citation or
  provenance integrity violations, undeclared artifact types, publish-boundary
  contract violations, malformed author results (missing content/provenance).
- **Warnings (manifest `warnings[]`, never block):** floor misses (missing
  diagram, thin coverage), style-family deviations, render QA findings
  (overflow, clipping, readability), render-QA-skipped (no headless runtime),
  stale-input freshness findings (existing behavior).

Interactive runs surface both tiers at the approval gate; unattended runs ship
warnings visibly in the manifest.

## Testing Strategy

- **Narrative renderer:** golden-file tests per block type (tables, callouts,
  timelines, diagrams) and per theme mode; AST safety-validation cases (raw
  HTML, unsafe links, unknown nodes); property: rendering is deterministic for
  identical input.
- **Artistic path validation:** DOM safety suite (script/event-handler/active
  content rejection; allowlist acceptance); shell fidelity checks (theme
  tokens and required anchors present in shipped shells).
- **Guideline checker:** floor-miss fixtures produce the expected warning
  vocabulary; rich fixtures produce none.
- **Recipe v2 semantics:** floor + expansion validation (undeclared type →
  error; floor miss → warning; expansion within limits → clean).
- **Approval marking:** unattended runs record `auto-drafted`; interactive
  approve/reject flows preserve existing behavior with the draft as review
  surface.
- **Render QA:** probe battery against seeded-defect fixtures (clipped
  diagram, overflowing table) in a headless runtime; graceful-skip path where
  the runtime is absent.
- **End-to-end recap fixture:** a completed-project fact base (modeled on the
  in5-game-cms evidence) must produce a rendered page with tables, ≥1
  diagram, and structured blocks — the anti-regression test for the original
  complaint — plus the packaged acceptance harness continuing to pass
  plumbing gates unchanged.

## Next Steps

Proceed to plan generation (`plan.md`) via the quick-start flow: stable task
IDs, per-task verification, parallelism analysis across renderer / artistic
path / recipe-and-brief / lifecycle workstreams.
