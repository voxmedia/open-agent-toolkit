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
fact base ──▶ author stage ──▶ content records ──▶ render ──▶ validate ──▶ render QA ──▶ approval ──▶ manifest ──▶ (publish)
              brief + facts     markdown | HTML     per-path    safety=hard   warnings      gate (D4)    warnings[]
              per artifact      + provenance                    floors=warn                 marking
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
artifacts, hashes, and warnings exactly as today, while approval marking
stays in the approval record and run result.

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
  content (event handlers, external active content, and any script that is
  not a hash-pinned core shell script per decision D3), warn on style-family
  deviations (missing theme token usage, missing required anchors).
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

- **Purpose:** Content-driven set scaling, with policy owned by the recipe.
- **Responsibilities:** Declare the floor (required artifacts with types and
  briefs — for `project-recap`: one narrative hub page) and the allowed
  expansion as _profiles_: each profile fixes a `type`, `authoring`,
  `briefRef`, optional `shell`, and `maxCount`. The author selects a profile
  by ID and supplies only `{id, profileId, rationale}`; it never chooses the
  rendering path, brief, or shell. Validation treats floor misses as warnings
  (guideline checker); unknown profiles, unsafe or duplicate artifact IDs, and
  collisions with floor IDs are errors; over-limit proposals are rejected with
  a warning.
- **Interfaces:** `recipe/v2` replaces the exact `artifacts[]` list with
  `floor[]` + `expansion{profiles[], limits}`. Only the recipe file's
  `schemaVersion` moves to v2; each recipe's own `version` selector stays
  `"1"`, so `{id, version}` callers and manifest cross-checks are unaffected.
  The manifest's artifact list remains variable-length as today (no manifest
  change), and every declared type stays inside the frozen `manifest/v1` enum
  (`hub`, `diagram`, `explainer`, `deck`, `catalog`) — narrative sub-pages use
  `explainer` rather than introducing a new type.
- **Notes:** With multi-artifact sets, the narrative page assumes hub duty via
  the existing `artifactLinks` mechanism.

### 8. Approval & marking

- **Purpose:** Keep human gating optional-but-real; make autonomy honest.
- **Responsibilities:** Interactive runs pause at the approval checkpoint —
  relocated after render and QA per D4 — with the rendered artifacts, their
  Markdown sources, and the complete accumulated warning set as the review
  surface. Unattended runs (including automated project completion) flow
  through end-to-end; the approval record carries `auto-drafted` (vs
  `human-approved`) so downstream consumers can mark and filter.
- **Interfaces:** Extends the existing content-approval record with the
  marking field and surfaces it in the run result. It is deliberately **not**
  added to the manifest: `manifest/v1` is `additionalProperties: false` with
  no marking field, and this design keeps that rail frozen. No change to
  run-request modes. The author callback is required in both modes, since
  synthetic content models are removed; interactive runs differ only in
  pausing at the approval gate. The lifecycle's automated completion chain
  (document / summary / pr-final / recap) always invokes recap runs with
  `mode: unattended`, and those callers construct the brief-aware author
  callback alongside the existing critic callback.

## Resolved Interface Decisions

Five decisions the third plan gate correctly identified as unresolved design
questions rather than plan defects. Each was verified against current code and
is binding on the plan.

### D1. Expansion sub-pages get ID-bearing paths; floor artifacts keep today's

`artifactPath` currently appends `artifact.id` only for `diagram` and `deck`
(`scripts/lib/render.mjs:256-263`), so every `explainer` artifact resolves to
`site/explainers/{slug}/index.html`. Routing narrative sub-pages to
`explainer` would therefore make multiple sub-pages overwrite each other and
trip the duplicate-path cross-record check (`scripts/lib/contracts.mjs:538-545`).

**Decision:** the path rule keys on the artifact's declared role, not its
type. Floor artifacts keep the current path function byte-for-byte, so no
existing published URL changes. Expansion artifacts always receive
`site/{directory}/{slug}/{artifactId}/index.html`. Expansion IDs are already
validated unique and non-colliding with floor IDs, and an expansion page nests
one level below the floor's `index.html`, so uniqueness is structural rather
than conventional.

The origin is carried explicitly rather than inferred. Renderer artifact
descriptors (`render.mjs:339-355`) gain a required
`origin: "floor" | "expansion"` field that `artifactPath` reads, and
`artifactLinks` entries widen from `{id, type, label}` to
`{id, type, label, origin}` (`:389-405`) so a generated hub link resolves
through the identical rule instead of falling back to the floor path.
Transitional v1 descriptors default to `"floor"`. Both the rendered path and
the relative/public link must be asserted.

### D2. `requiredNarrative` survives as a floor-entry field

`requiredNarrative` is a required recipe field today, validated at
`scripts/lib/recipes.mjs:175` and consumed at `:132` to check that fact-base
`sections` entries reference known section IDs. Dropping it would break
fact-base validation and leave the guideline checker without a coverage list.

**Decision:** it moves from the recipe root to the narrative floor entry in
`recipe/v2` rather than disappearing. This is consistent with "schemas carry
identity, prose carries quality": the _list_ of sections is machine identity
(fact-base validation, coverage checks), while what each section should
achieve editorially lives in the brief. `author-request/v2` already carries it
through the existing `floor` field.

### D3. Core shell scripts are hash-pinned; authored scripts are rejected

All three bundled shells contain `<script>` elements (`deck-shell.html`,
`diagram-shell.html`, `engineer-tour.html`), so a validator that hard-fails
every script would reject an unmodified shell.

**Decision:** the validator derives a hash-pinned **ordered multiset** of
script hashes from the declared core shell and requires the authored HTML's
scripts to match it exactly — same hashes, same count, same order. Membership
alone is insufficient: `deck-shell.html` carries two distinct core scripts
(lines 13 and 223), so a membership test would accept a deleted script, a
duplicated block, or one allowed block replaced by another. Comparison is over
exact bytes with no normalization. Missing, added, duplicated, reordered,
replaced, or mutated scripts are all hard errors, as are inline event-handler
attributes and external active content in all cases. Non-script markup stays fully free within the DOM
allowlist. The rejected alternative — accepting only authored extension
regions injected into a core-owned shell — was declined because it
reintroduces the slot-filling constraint this redesign exists to remove.

### D4. The interactive approval gate moves after render and QA

The gate currently resolves before theme and render (`scripts/run.mjs:112-191`),
its resume predicate requires `theme` still pending (`:225-230`), and tests
assert that `theme.resolved.json` and `site/` do not exist at the pause
(`tests/run.integration.test.mjs:141-178`). Post-render warnings therefore
cannot structurally reach the interactive reviewer.

**Decision:** theme, render, safety validation, the guideline checker, and
render QA all run before the approval checkpoint; approval sits immediately
before publish and durability. Rendering is local, cheap, and non-destructive,
and nothing leaves the machine before approval, so the meaningful invariant is
preserved and strengthened: the reviewer approves the rendered artifacts and
the complete warning set rather than raw markdown.

Consequences the plan must carry. The resume predicate keys on an
**unresolved approval state — `pending` or `rejected`** — plus completed
render/QA stages, replacing today's theme-pending check; keying on `pending`
alone would delete the reject → edit → approve correction loop. Because that
loop edits the source _after_ the rejection, a rejected resume must
**re-render and re-run QA against the edited sources** before approval is
processed; otherwise the run would approve stale artifacts backed by stale
safety evidence. Build-record stages are terminal once `passed`/`warned`
(`scripts/lib/records.mjs:18-23`, `:84-101`), so this requires a narrowly
guarded record-level reopen that re-runs the affected stages and leaves an
auditable trail rather than silently overwriting them. A direct, unedited
pending→approve resume may hydrate the already-validated render. The build
record shows render stages passed at the pause, and the existing "no
downstream work before approval" assertions are re-expressed as "nothing is
published or persisted externally before approval" — the `publish` and
`durability` call-count assertions remain exactly as they are.

### D5. Every bundled recipe declares finite expansion caps

`maxCount`, `maxArtifacts`, and `maxPerType` were all optional, so a recipe
could declare profiles with no effective bound and let an unattended author
propose an unbounded set.

**Decision:** `recipe/v2` validation requires a finite `maxCount` on every
profile and a finite `expansion.limits.maxArtifacts` on every recipe. Floor
artifacts do not count toward `maxArtifacts`; it caps expansion only. Bundled
values: `project-recap` — supporting-diagram 4, deep-dive 3, walkthrough-deck
1, maxArtifacts 6; `program-recap` — supporting-diagram 3, project-page 12,
maxArtifacts 12; `project-explainer` — supporting-diagram 4, maxArtifacts 4;
`engineer-tour` — supporting-diagram 4, maxArtifacts 4.

### D6. Callout and timeline source syntax

**Decision:** callouts use GFM alert syntax (`> [!NOTE]`, `> [!TIP]`,
`> [!IMPORTANT]`, `> [!WARNING]`, `> [!CAUTION]`) parsed from blockquotes into
a distinct callout AST node — no invented syntax. Timelines use a fenced
` ```timeline ` block with one `date — label` entry per line, in the same
family as fenced diagram blocks. Both map to dedicated AST node types with
parser and renderer fixtures.

### D7. Minimum supported fenced-diagram grammar

"Mermaid-class" is too loose to make p03-t03 acceptance objective against a
dependency-free native implementation, so the supported boundary is fixed.

**Decision:** a ` ```diagram ` fence must support exactly this grammar, and
everything within it must render:

- a direction header, `graph TD` or `graph LR`
- node declarations with an ID and optional label shape: `id[Label]`
  (rectangle), `id(Label)` (rounded), `id{Label}` (diamond); a bare `id` is a
  rectangle labelled with its ID
- edges `a --> b`, `a --- b`, and labelled edges `a -->|label| b`
- labels may be quoted (`id["Label, with comma"]`); all label text is
  HTML-escaped on render
- `%%` line comments

Any construct outside this grammar (subgraphs, classDefs, sequence/state
diagrams, styling directives) degrades to the planned warning plus the source
in a code block rather than failing. Fixtures sit exactly at this boundary:
one exercising every supported construct, one per degradation class.

### D8. The accepted artifact set is persisted in the approval record

With a mandatory author callback and expansion, an interactive run can create
a variable artifact set _before_ pausing. Today the approval record stores no
`authorResultPaths` for pending/rejected states
(`scripts/lib/content-approval.mjs:42-49`) and resume hydration reads paths
only from that record while iterating recipe artifacts
(`scripts/run.mjs:261-294`) — so a paused expanded run would lose expansion
identities, source paths, provenance, and hub links on resume.

**Decision:** `content-approval/v2` becomes the durable source of truth for
the resolved set. It carries `artifacts[]` of `{artifactId, origin,
profileId?, authoring, contentPath, authorResultPath?}` for every floor and
accepted expansion artifact, written for **all** approval states including
pending and rejected. Resume hydrates the set from the record rather than from
the recipe, so the author is never re-invoked and IDs, paths, links, and
hashes are stable across a pause.

Two compatibility rules keep this implementable in order. First, the complete
set can only be written once the author stage exists to produce it — before
then the runner passes only `state.authorResultPaths` (`scripts/run.mjs:112-117`)
and interactive runs synthesize content with no author result at all
(`:85-95`). So the field is defined and readable when v2 lands, but
complete-set writes activate atomically with the author stage, not earlier.
Second, `authorResultPath` is optional precisely because normalized legacy v1
records have none (`scripts/lib/content-approval.mjs:42-67`); such entries
hydrate from the existing content file rather than inventing a path to a file
that never existed. For v1 records read during resume the set defaults to the
recipe floor, matching today's behavior.

## Data Models

Conceptual contract shapes (exact JSON Schema is implementation work):

- `author-request/v2`: `{schemaVersion, artifactId, artifactType, authoring,
brief, factBase, shell?, theme, floor?}`
- `author-result/v2`: `{schemaVersion, artifactId, content: {markdown |
html}, provenance{authorId, generatedAt, method?}, proposedArtifacts?: [{id,
profileId, rationale}]}` — proposals carry no `authoring`, `briefRef`, or
  `shell`; those come from the referenced profile.
- `recipe/v2`: `{schemaVersion, id, version, sourceRoles, floor: [{id, type,
authoring: markdown|html, template?, briefRef, requiredNarrative?}],
expansion: {profiles: [{profileId, type, authoring, briefRef, shell?,
maxCount}], limits: {maxArtifacts, maxPerType?}}, discoveryLimits}` —
  `requiredNarrative` moves from the recipe root to the narrative floor entry
  (D2), and caps are mandatory (D5).
- `content-approval/v2`: adds `marking: human-approved | auto-drafted` and
  `artifacts: [{artifactId, origin, profileId?, authoring, contentPath,
authorResultPath}]` (D8) to the existing record.
- Manifest (`manifest/v1`): unchanged shape. Its variable artifact list and
  required `warnings: string[]` already suffice for expansion sets and
  guideline/render-QA findings; approval marking rides in the approval record
  and run result only, never the manifest.

## Error Handling

Two-tier taxonomy, applied uniformly:

- **Hard errors (fail the stage, recorded in build record):** unsafe HTML/AST
  content (script, event handlers, active external content), citation or
  provenance integrity violations, undeclared artifact types, publish-boundary
  contract violations, malformed author results (missing content/provenance),
  and malformed expansion proposals (unknown `profileId`, unsafe or duplicate
  artifact ID, collision with a floor ID) — these signal a broken author
  rather than thin content.
- **Warnings (manifest `warnings[]`, never block):** floor misses (missing
  diagram, thin coverage), style-family deviations, render QA findings
  (overflow, clipping, readability), render-QA-skipped (no headless runtime),
  rejected over-limit expansion proposals, stale-input freshness findings
  (existing behavior).

The run stage enforces this split: safety and provenance violations keep
throwing `E_QA`, while editorial and layout findings append stable warning IDs
to the manifest's `warnings[]` and let the run succeed in both modes.

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
