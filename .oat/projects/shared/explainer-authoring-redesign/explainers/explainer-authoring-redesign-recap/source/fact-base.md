# Fact base

## Confirmed claims

- **design:** ---
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

### D9. The author seam stays caller-owned; autonomous richness is verified, not generated

Final review (I1) observed that `author-request/v2` appears only in tests and
documentation, and that the existing anti-regression coverage feeds a checked-in
rich Markdown fixture through the author callback. That proves the renderer
_preserves_ richness while leaving the "basic AF" failure mode — a pipeline that
_generates_ thin output from real project evidence — unproven.

**Decision:** no code-level author driver ships, and the seam stays caller-owned.
Shipping a content generator inside the core or the OAT adapter would recreate
the slot-filling rigidity this redesign exists to remove, and neither component
can author prose; the executing agent is the author by the "prose carries
quality" premise. The adapter's refusal to synthesize one
(`E_AUTHOR_REQUIRED`, and `coreOptions.author` rejected at the boundary) is
therefore correct as designed.

What was genuinely missing is the **outcome check**. The verification gap is
closed by a behavioral completion → adapter → core test that runs the real
bundled core over real lifecycle artifacts with an author holding no prewritten
recap: every heading, list item, table row, diagram node, callout, and timeline
entry is derived from the `brief`, `factBase`, and `floor` the request carries.
The test asserts three things the previous fixture-driven coverage could not:
the six brief-declared sections are all present without a coverage warning; the
rendered hub carries real block structure (table, list, callout, inline
`narrative-diagram` SVG, timeline) rather than paragraphs; and the output tracks
_this_ project's evidence, shown by running the same author against two
different artifact sets and asserting the recaps differ accordingly. A thin
author over the same evidence is asserted to raise the narrative-coverage,
structured-depth, and architecture-diagram guideline warnings, so the check
discriminates rather than merely passing.

This keeps the request contract — not a bundled generator — as the thing that
must carry enough for an agent to author richly, which is what the seam actually
promises.

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

- **implementation:** ---
  oat_status: complete
  oat_ready_for: oat-project-review-provide
  oat_blockers: []
  oat_last_updated: 2026-07-26
  oat_current_task_id: null
  oat_generated: false

---

# Implementation: explainer-authoring-redesign

**Started:** 2026-07-25
**Last Updated:** 2026-07-26

> This document is used to resume interrupted implementation sessions.
>
> Conventions:
>
> - `oat_current_task_id` always points at the **next plan task to do** (not the last completed task).
> - When all plan tasks are complete, set `oat_current_task_id: null`.
> - Reviews are **not** plan tasks. Track review status in `plan.md` under `## Reviews`.
> - Keep phase/task statuses consistent with the Progress Overview table so restarts resume correctly.
> - Before running the `oat-project-pr-final` skill, ensure `## Final Summary (for PR/docs)` is filled with what was actually implemented.

## Run Configuration

- **Tier:** 1 (subagents) — Cursor-native
- **Dispatch policy:** high (managed, capped) — source: project state
- **Resolved target:** `oat-phase-implementer-gpt-5-6-sol-high`
- **HiLL checkpoints:** `['p08']` (final phase only, from `workflow.hillCheckpointDefault: final`)
- **Auto-review at HiLL checkpoints:** enabled (from `workflow.autoReviewAtHillCheckpoints`)
- **Phase review gate:** not configured (no external cross-provider phase gate)
- **Parallel group:** `[p02, p03, p04]` — worktree-isolated

## Progress Overview

| Phase                                        | Status   | Tasks | Completed |
| -------------------------------------------- | -------- | ----- | --------- |
| Phase 1: Contracts, briefs, and recipes v2   | complete | 6     | 6/6       |
| Phase 2: Lifecycle caller wiring             | complete | 1     | 1/1       |
| Phase 3: Narrative renderer                  | complete | 3     | 3/3       |
| Phase 4: Artistic composer path              | complete | 2     | 2/2       |
| Phase 5: Guideline checker and render QA     | complete | 4     | 4/4       |
| Phase 6: Pipeline integration, v1 retirement | complete | 4     | 4/4       |
| Phase 7: End-to-end anti-regression fixture  | complete | 1     | 1/1       |
| Phase 8: Documentation and release closure   | complete | 2     | 2/2       |
| Phase rev1: Final review fixes               | complete | 10    | 10/10     |

**Total:** 33/33 tasks completed. The 23 implementation tasks (20 planned +
correctives p01-t02a, p05-t02a, p05-t02b) and all 10 review-fix tasks from the
final review are complete.

`oat project status` reports `Progress: 20/20`, which is consistent, not drift.
The control-plane task parser counts only IDs matching `pNN-tNN` or
`p-revN-tNN`, so it cannot see the three lettered correctives (`p01-t02a`,
`p05-t02a`, `p05-t02b`) or this plan's `prev1-tNN` review-fix IDs, which predate
the `p-revN` convention. All 20 IDs it can see are counted complete. Task
statuses in this document use the template's `completed` vocabulary, which is
what that parser matches; phase statuses use `complete`.

---

## Phase 1: Contracts, briefs, and recipes v2

**Status:** complete
**Started:** 2026-07-25
**Completed:** 2026-07-25
**Phase base:** `c777e838` → **head:** `5ebd7049`
**Verification:** 158/158 core suite passing, clean tree (verified at root, not
only reported by the implementer)
**Root review:** pass. Scanned the full phase diff for the failure mode that
blocked the first attempt — no `skip`/`only`/`todo` tests introduced, and every
removed assertion traces to a field that legitimately moved (recipe root
`requiredNarrative` and `artifacts[]` down into `floor[]`). The one removed
approval assertion was replaced by five stronger ones.

### Task p01-t01: Author contract v2 schemas (coexisting with v1)

**Status:** completed
**Commit:** `b1613d1c`

### Task p01-t02: Dual-version recipe loader and shape accessors

**Status:** completed
**Commit:** `ea55d86c`

### Task p01-t03: Author briefs (prerequisite for v2 recipes)

**Status:** completed
**Commit:** `ea60381f`

### Task p01-t02a: Make p01-t02 survive the v2 cutover (corrective, inserted)

**Status:** completed
**Commit:** `97aebb08` (plan amendment: `4a321ad4`)

Inserted mid-phase after the first p01-t04 attempt blocked. See Deviations.

### Task p01-t04: Rewrite bundled recipes to v2

**Status:** completed
**Commit:** `1b82714a`

### Task p01-t05: Approval record v2 with marking and resume compatibility

**Status:** completed
**Commit:** `5ebd7049`

---

## Phase 2: Lifecycle caller wiring

**Status:** complete (parallel group, worktree `wt-p02`, merged `2e5ee9df`)
**Started:** -

### Task p02-t01: Lifecycle callers construct the author callback

**Status:** completed
**Commit:** `3571b345`

---

## Phase 3: Narrative renderer

**Status:** complete (parallel group, worktree `wt-p03`, merged `6c327e81`)
**Started:** -

### Task p03-t01: Markdown parsing and AST safety validation

**Status:** completed
**Commit:** `07f5be21`

### Task p03-t02: Themed block library and expansion path rule

**Status:** completed
**Commit:** `0b01aa58`

### Task p03-t03: Diagram blocks rendered to inline SVG

**Status:** completed
**Commit:** `ed612264`

---

## Phase 4: Artistic composer path

**Status:** complete (parallel group, worktree `wt-p04`, merged `97ef5349`)
**Started:** -

### Task p04-t01: DOM safety validator with hash-pinned shell scripts

**Status:** completed
**Commit:** `6051f28c`

D3 enforcement verified empirically at the root, not just by reading the code:
unmodified shell accepted, a mutated core script rejected
(`core-script-hash-mismatch:0`), an authored extra script rejected
(`core-script-count-mismatch`).

### Task p04-t02: Shell canvases

**Status:** completed
**Commit:** `a5bd6a1b`

---

## Phase 5: Guideline checker and render QA

**Status:** complete
**Started:** -

### Task p05-t01: Guideline checker with warning vocabulary

**Status:** completed
**Commit:** `a75bcb32`

Closes the coverage gap Phase 1 deliberately deferred. Verified empirically at
the root against the real v2 `project-recap`: full section coverage emits no
coverage warning, and dropping a required section emits
`guideline-narrative-coverage-missing`. The v1 hard error and the v2 warning
now both exist, so the guarantee moved rather than disappeared.

### Task p05-t02: Render QA probe battery

**Status:** completed
**Commit:** `651aac80` (corrected by p05-t02a `c926b4fe`)

### Task p05-t02a: Viewport clipping exempts paged deck slides (corrective)

**Status:** completed
**Commit:** `c926b4fe` (plan amendment: `e45c0c6e`)

See Deviations.

### Task p05-t02b: Animation probe accepts suppressed reduced motion (corrective)

**Status:** completed
**Commit:** `df237bf8` (plan amendment: `d6dec1c2`)

Second false positive from the same p05-t02 probe battery, found when
`pnpm release:validate` ran for the first time in p08-t02. See Deviations.

---

## Phase 6: Pipeline integration and v1 retirement

**Status:** complete
**Verification:** core 199/199, adapter 55/55, smoke 129/129, release 41/41
**Carry-forward confirmed:** `renderDescriptor()` now passes `origin` through.
Verified at the root by exercising `artifactPath` directly — floor artifacts
keep today's URLs (`site/explainers/{slug}/index.html`) and expansion
artifacts get D1 ID-bearing paths
(`site/explainers/{slug}/{artifactId}/index.html`). This was the project's
one silent-failure risk and it is closed.
**Started:** -

### Task p06-t01: Relocate the approval gate after render and QA

**Status:** completed
**Commit:** `144051f2`

### Task p06-t02: Author stage wiring and QA severity split

**Status:** completed
**Commit:** `fb787584`

### Task p06-t03: Marking surfacing through core and adapter results

**Status:** completed
**Commit:** `b4cbd5c2`

### Task p06-t04: Retire recipe v1 and migrate all remaining consumers

**Status:** completed
**Commit:** `781f8289`

---

## Phase 7: End-to-end anti-regression fixture

**Status:** complete
**Verification:** core 207/207, adapter 55/55, smoke 129/129, release 42 pass + 1 skip

The fixture was confirmed non-vacuous at the root rather than trusted: with
the Markdown table renderer deliberately regressed, 6 of the 8 new tests fail;
restored, 8/8 pass. This is the guard on the original "recap is basic AF"
complaint, so a vacuous fixture would have been worse than none.
**Started:** -

### Task p07-t01: Recap anti-regression fixture

**Status:** completed
**Commit:** `c3e25d31`

---

## Phase 8: Documentation and release closure

**Status:** complete
**Verification (repo definition of done):** `pnpm release:validate`, `pnpm lint`,
`pnpm type-check`, and `pnpm test` all pass against the committed tree.
Suites: core 207, adapter 55, smoke 129, release 43 pass + 1 skip.
**Started:** -

### Task p08-t01: Docs and skill guidance updates

**Status:** completed
**Commit:** `d1a72286`

### Task p08-t02: Provider sync, version bumps, release validation (final task)

**Status:** completed
**Commit:** `81fd68a5`

Skills bumped (minor, each carrying a behavioral guidance change):
`oat-project-complete` 1.5.4 -> 1.6.0, `oat-project-implement` 2.1.8 -> 2.2.0,
`oat-wave-execute` 1.7.1 -> 1.8.0, `oat-wave-program` 1.3.1 -> 1.4.0.
`explainer-kit` (2.0.0) and `oat-explainer-kit` (1.0.2) were bumped in p06-t04
and deliberately not bumped again, preserving one bump per changed skill in the
final PR diff. All five lockstep public packages went 0.2.17 -> 0.2.18.

---

## Phase rev1: Final review fixes

**Status:** complete
**Phase base:** `4f156766` → **head:** this commit (`prev1-t10`), the eleventh
on top of the base
**Started:** 2026-07-26
**Completed:** 2026-07-26
**Verification (every commit):** core, adapter, smoke, and `tools/release/*`
suites plus `pnpm lint` and `pnpm type-check`; `pnpm release:validate`,
`pnpm test:smoke`, and `pnpm test` additionally on the tasks touching
`qa.mjs`, `html-safety.mjs`, or provenance. Narrow core+adapter verification is
what let these ten findings escape, so all four suites gated every commit.
Final counts: core 226, adapter 60, smoke 129, release 44 pass + 1 skip
(RC-integration, env-gated).

### Task prev1-t01: URL policy is a hard error again (I2)

**Status:** completed
**Commit:** `fada5be0`

`<form>` left `ALLOWED_ELEMENTS` entirely — no bundled shell needs form
controls — and submission attributes (`action`, `formaction`, `ping`) are now
rejected unconditionally rather than only when they look external. Dangerous
schemes (`javascript:`, `vbscript:`, `file:`, `data:text/html`,
`data:image/svg+xml`) are rejected before the external-URL test that previously
short-circuited them. Resource references generalized: every element that can
pull in external content (including the SVG reference elements `animate`,
`clipPath`, `feImage`, …) must resolve to an inline `data:` URI or a
same-document fragment. `srcset` is parsed per candidate instead of as one URL.
The policy now lives only in `html-safety.mjs`; `qa.mjs` imports
`findUnpinnedResourceRefs` instead of keeping its own divergent regex.

### Task prev1-t02: Harden the render QA probe battery (I4)

**Status:** completed
**Commit:** `5f202ee7`

Treated as module hardening, not three point fixes. Each sub-fix was
revert-verified in real Chromium — the new test was observed failing with the
fix removed, then passing with it restored:

- **Scroll reachability.** `p05-t02a` exempted every descendant of a
  scrollable ancestor; reachability is now computed against the scroll extent.
  Reverted: `viewport clipping distinguishes paged slides from unreachable
content` fails (`actual: []`, `expected: ['#behind']`).
- **Presented headings.** `checkVisibility()` (with a `getClientRects()`
  fallback) plus an `aria-hidden` check separates deliberately hidden panels
  from genuinely unreadable headings. Reverted: `heading readability separates
hidden panels from unreadable headings` fails (`actual: ['#panel']`,
  `expected: []`).
- **Pseudo-element motion.** `::before`/`::after` are inspected for running
  animations and transitions once they generate content. Reverted: `animation
probe accepts suppressed motion and still reports perceptible motion` fails
  (`a running pseudo-element keyframe animation reports: true !== false`).

One new fixture expectation was corrected rather than the code: an absolutely
positioned element at `left:900px` inside a `position:relative` scroller is
genuinely reachable, because the browser extends `scrollWidth` to include it.
The fixture drops `position:relative` so the element positions against the
viewport and is actually unreachable.

### Task prev1-t03: Render degradation warnings reach the manifest (I5)

**Status:** completed
**Commit:** `3a7da577`

`rendered.warnings` had no consumer anywhere in `run.mjs`. Renderer codes now
map to stable `render-*` IDs (`render-unsupported-diagram`,
`render-heading-depth-jump`, `render-timeline-entry-shape`,
`render-legacy-raw-html-escaped`) and flow into the run result, the render
stage record, and the manifest. Resume audit trail preserved: `stage-reopened`
markers from a prior run are merged with new degradation warnings instead of
being overwritten, and they do not leak into the resumed run's warnings.

### Task prev1-t04: One stable warning ID per browser finding (M1)

**Status:** completed
**Commit:** `154747f1`

Browser findings already mapped to `render-qa-*` no longer also receive a
generic `qa-*` prefix. Revert-verified at the manifest level with a
`defectiveProbe` fixture: without the dedupe, `qa-viewport-overflow`,
`qa-inner-x-overflow`, `qa-viewport-clipping`, `qa-heading-readability`,
`qa-animations-enabled`, `qa-reduced-motion`, and `qa-keyboard-navigation` all
appear alongside their `render-qa-` counterparts.

### Task prev1-t05: Author provenance is caller-bound (I6)

**Status:** completed
**Commits:** `eea9ad80`, `f257f96d`

The core now stamps `generatedAt` from the run clock always, verifies
`authorId` and `method` against `options.authorProvenance` when a trusted
context exists, rejects any author-supplied `trust`, and records
`trust: caller-bound | self-asserted` on the retained provenance.
`author-result.v2.schema.json` gains the optional `trust` enum, stamped by the
core rather than the author. Smoke fixtures were migrated, not weakened: they
now assert the `trust` field is present and that a backdated author
`generatedAt` is overwritten by the core clock — a strictly stronger assertion
than the previous hardcoded-timestamp equality. `f257f96d` is a follow-up that
both renamed an intentionally unused destructured binding to satisfy lint and
set `EXPLAINER_KIT_HEADLESS_PROBE=off` for the wrapper smoke suite. That
opt-out is no longer present: `f3917a8f` made render QA opt-in, so nothing
self-launches a runtime for the suite to switch off.

### Task prev1-t06: Real headless runtime seam for render QA (I3)

**Status:** completed
**Commit:** `a3b776a3`

`browserProbe` existed only as an injected option, so every normal run emitted
the skip warning. Extracted the shared `browser-runtime.mjs` module (runtime
resolution, page probing, keyboard/theme probes) that both `render-qa.mjs` and
the release visual validator now use instead of duplicating it. Runs resolve a
headless runtime automatically; a `--browser-probe-module` CLI flag and the
adapter's `browserProbeModulePath` allow explicit injection, and an explicitly
named module that fails to load is a hard `E_BROWSER_PROBE` error rather than a
silent skip. `EXPLAINER_KIT_HEADLESS_PROBE=off` distinguishes a configured
opt-out (`render-qa-disabled-by-configuration`) from a genuinely missing
runtime (`render-qa-skipped-no-headless-runtime`), and keeps unit suites
hermetic. Revert-verified: 7 failures across core and adapter without the
change.

### Task prev1-t07: Verify autonomous authoring richness (I1)

**Status:** completed
**Commit:** `fd75dacd`

Resolved by the artifact-alignment route, not by shipping a content generator.
The seam is correct as designed — the author callback is caller-owned and the
"prose carries quality" premise makes the executing agent the author, so a
bundled code-level driver would reintroduce exactly the rigidity this project
removed. What was genuinely missing was the _outcome check_. Recorded as
design decision **D9** and verified behaviorally: an author that derives its
output purely from the `author-request/v2` brief, fact base, and required
narrative produces tables, diagrams, lists, callouts, and timelines with no
coverage or structured-depth warnings, and tracks different evidence rather
than emitting a stock recap. The check is proven discriminating — a thin author
run through the identical assertions fails them. `oat-project-complete/SKILL.md`
now states the richness outcome the seam is judged on.

### Task prev1-t08: Enforce per-type expansion caps (M2)

**Status:** completed
**Commit:** `4b160636`

`expansion.limits.maxPerType` was declared but never enforced.
`evaluateExpansionProposals` now tracks accepted counts per artifact type
across profiles and emits `expansion-type-limit-exceeded`. Tests cover a cap
binding across two profiles that share one artifact type, and confirm
undeclared types stay unconstrained while per-profile caps still apply.

### Task prev1-t09: Preserve Markdown lead, disambiguate section IDs (M3)

**Status:** completed
**Commit:** `a8f3c2c7`

Prose between the document title and the first `##` heading is preserved as its
own leading section (`overview`, then `introduction`, then `lead`), and
duplicate subheadings get unique anchors (`outcome`, `outcome-2`) instead of
colliding. Floor content models are validated against the recipe narrative
contract with an `E_CONTENT_MODEL` error. Assertions read section IDs out of
the rendered HTML, since the content model is never persisted as JSON.
Revert-verified: 2 core failures without the change.

### Task prev1-t10: Align lifecycle artifacts with shipped state (I7)

**Status:** completed
**Commit:** this commit (`docs(prev1-t10): align lifecycle artifacts with shipped state`)

Artifact drift, not a code defect. `implementation.md` moved to
`oat_status: complete` with `oat_current_task_id: null` (the contract's
sentinel, not the literal `complete` it previously carried), true task counts
(33/33), per-task rev1 outcomes, final suite counts, and a filled Final
Summary. `state.md`'s body was brought in line with its frontmatter — it still
read "Implementation in progress — Phase 1" and "0/20 tasks".

---

## Orchestration Runs

_Each run from `oat-project-implement` appends an entry below with:_
_- Run header (number, timestamp, branch, tier, policy, phase counts)_
_- Phase Outcomes table_
_- Parallel Groups list_
_- Outstanding Items_

<!-- orchestration-runs-start -->

_Orchestration runs from `oat-project-implement` are appended here, most-recent-first within the file but append-only at the bottom of the log._

<!-- orchestration-runs-end -->

---

## Implementation Log

Chronological log of implementation progress.

### 2026-07-25

**Session Start:** implementation initialized

- Plan phase closed as operator-accepted (not gate-passed); see `plan.md`
  "Plan acceptance basis" and the Gate Escalation record below.
- Plan frontmatter aligned to `oat_status: complete` /
  `oat_ready_for: oat-project-implement` so the implement workflow could start.
- HiLL checkpoints resolved to `['p08']` from `workflow.hillCheckpointDefault: final`
  (plan previously carried `[]`, i.e. every phase).
- Tier 1 dispatch confirmed with resolved target
  `oat-phase-implementer-gpt-5-6-sol-high`.

**p00 pre-phase (regression repair, before Phase 1):**

- First Phase 1 dispatch returned `BLOCKED` before any commit: the plan's
  mandatory phase-verification command `node --test .agents/skills/explainer-kit/tests/`
  fails on Node 22.17 (directory resolved as a module). The implementer
  correctly refused to substitute a different command. Its partial p01-t01 work
  was stashed and Phase 1 will be re-dispatched fresh.
- Bisect established the suite was 133/133 green at `2ad5b5cd` and 136/147 at
  `ffcae8f0` (PR #170), so the 11 failures were a regression, not a baseline.
- `8c81513b` restored the suite to 146/146: added the required
  immutable-coverage provenance paths to the manifest fixtures in
  `records.test.mjs` and `s3-static.test.mjs` (10 tests), and removed the
  obsolete 0.4.1 migration-provenance test plus its 293-line fixture from
  `rebuildability.test.mjs` (1 test), which depended on the archived
  `.oat/projects/shared/explainer-kit/` project. Operator decision: drop the
  provenance record rather than relocate it.
- Adjacent suites verified unaffected: `oat-explainer-kit` 52/52,
  `tools/release` 41 pass / 0 fail.

**Blockers:**

- None

### 2026-07-26

**Phase rev1 executed:** all ten final-review fix tasks, in the planned order —
safety boundary first (`prev1-t01`), then probe correctness (`prev1-t02`)
before the warning plumbing that depends on it (`prev1-t03`, `prev1-t04`), then
provenance and the runtime seam, then the two Medium fixes, with artifact
alignment (`prev1-t10`) last so it records true final state.

- `4f156766` (phase base) → `fada5be0`, `5f202ee7`, `3a7da577`, `154747f1`,
  `eea9ad80`, `f257f96d`, `a3b776a3`, `fd75dacd`, `4b160636`, `a8f3c2c7`, and
  this commit.
- `f257f96d` is an eleventh commit: a lint-only follow-up to `prev1-t05` for an
  intentionally unused destructured binding in a smoke fixture. It is recorded
  under `prev1-t05` rather than concealed or amended into it.
- Verification discipline changed deliberately. All four suites plus
  `pnpm lint` and `pnpm type-check` gated every commit, with
  `pnpm release:validate`, `pnpm test:smoke`, and `pnpm test` additionally on
  the tasks touching `qa.mjs`, `html-safety.mjs`, or provenance. Narrow
  core+adapter verification is precisely what let all ten findings escape.
- No assertion was weakened, loosened, or deleted to make a suite pass. Two
  existing expectations were corrected as genuinely wrong and are recorded in
  the deviations table with reasoning: the `prev1-t02` scroller fixture, and
  the `prev1-t05` provenance assertions (migrated to a strictly stronger
  core-clock-precedence check).

**Blockers:**

- None

---

---

### Review Received: final

**Date:** 2026-07-26
**Review artifact:** `reviews/archived/final-review-2026-07-26T155422Z.md`
**Reviewer target:** `gpt-5.6-sol-high` (resolved from the project's `high`
review ceiling, matrix-pinned)
**Review cycle:** 1 of 3

**Findings:**

- Critical: 0
- Important: 7
- Medium: 3
- Minor: 0

**Disposition:** all 10 converted to fix tasks at the operator's direction
(fix everything before PR). Nothing deferred. The empty deferred-medium ledger
was confirmed historically accurate by the reviewer — no prior finding had been
accepted and deferred.

**Root verification before conversion.** Every Important finding was reproduced
independently rather than accepted on the reviewer's word:

- I2 confirmed by reading `isUnsafeUrl`: the `if (!isExternal) return false;`
  early return precedes the form/resource checks, so `mailto:` and relative
  form actions pass the hard validator.
- I3 confirmed: `browserProbe` exists only as an injected option; there is no
  probe-module CLI seam, so normal runs always emit the skip warning.
- I4 confirmed in real Chromium on all three sub-claims — unreachable
  `left:-400px` content inside a scroller is exempt, `aria-hidden` +
  `display:none` headings are flagged, and `::before` keyframe animations
  report `animationsDisabled: true`.
- I5 confirmed: no `rendered.warnings` consumption exists anywhere in
  `run.mjs`, so render degradation warnings are computed and dropped.
- I6 confirmed: only theme provenance is validated in `run.mjs`; author
  provenance is retained as supplied.
- I7 confirmed against both artifacts.
- I1 confirmed: `author-request/v2` appears only in tests and documentation; no
  shipped code implements it.

**New tasks added:** `prev1-t01` … `prev1-t10`

**Design drift / artifact alignment notes:**

- I7: the review found lifecycle-artifact drift rather than a code defect. The
  shipped implementation is accepted; the artifacts are stale. `prev1-t10` is
  the artifact-alignment task and runs last so it records true final state.
- I1: partially a design question rather than a pure defect. The design's
  "prose carries quality" premise deliberately makes the executing agent the
  author, so the absent code-level author driver may be correct by design while
  the _verification_ of autonomous richness is genuinely missing. `prev1-t07`
  is scoped to resolve that explicitly — either ship a driver/protocol or record
  the seam as intended in `design.md` and add the outcome check — rather than
  silently reintroducing the rigidity this project removed.

**Root-cause note.** I4's first sub-finding is a regression introduced by the
`p05-t02a` corrective, which exempted every descendant of a scrollable ancestor
rather than testing reachability. The root verification at the time covered
overflow-hidden clipping and off-viewport absolute positioning but never tested
unreachable content _inside_ a scroller, so the "does not blind the probe"
claim was narrower than stated. Four defects have now been found in the
`qa.mjs` probe battery across three separate discoveries; `prev1-t02` should be
treated as hardening that module, not as one more point fix.

**Next:** Execute fix tasks via the `oat-project-implement` skill.

After the fix tasks are complete:

- Update this same artifact-identified review event to `fixes_completed`
- Re-run `oat-project-review-provide code final` then
  `oat-project-review-receive` to reach `passed`

## Deviations from Plan / Design

Document any intentional deviations from the original plan, spec, or design. Include accepted review findings where the shipped implementation is source of truth and a lifecycle artifact needs alignment.

| Task / Review        | Source Artifact                                             | Planned / Documented                                                                                                | Actual / Accepted                                                                     | Reason                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                 | Source of Truth                   | Follow-up                                                                                                   |
| -------------------- | ----------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------- | ----------------------------------------------------------------------------------------------------------- |
| p00 (pre-phase)      | `plan.md` verification commands                             | `node --test .agents/skills/explainer-kit/tests/` (bare directory) at 8 sites                                       | Explicit globs: `.../tests/*.test.mjs`, plus `tools/release/*.test.*`                 | The directory form never worked on Node 22.17 — it resolves the dir as a module and throws `MODULE_NOT_FOUND` without running any suite. Repo convention is globs (`test:smoke`).                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                      | `plan.md` (updated)               | None                                                                                                        |
| p00 (pre-phase)      | n/a — pre-existing main regression                          | Plan assumed a green core suite at every commit                                                                     | Repaired 11 failures introduced by PR #170 (`ffcae8f0`) before Phase 1                | Phase 6 rewrites `contracts.mjs` / `run.mjs` / `records.mjs`, the same files implicated; a red baseline there would make our breakage indistinguishable from #170's.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                   | Commit `8c81513b`                 | Consider upstreaming the fix to `main` independently                                                        |
| p01-t02a             | `plan.md` Phase 1 task list                                 | Phase 1 had five tasks; p01-t04 was expected to stay green because "all readers went through the p01-t02 accessors" | Inserted a sixth, corrective task between p01-t03 and p01-t04                         | That premise was false in two places invisible while every bundled recipe was v1: `renderArtifact` takes an exact four-key descriptor (`render.mjs:339-355`) and rejects normalized v2 floor entries, and p01-t02's dual-shape test used a live bundled recipe as its v1 example, so the v1 loader branch would have lost all coverage at p01-t04. Both sit in p01-t02-owned files, so p01-t04 could not repair them inside its declared boundary.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                     | Commits `4a321ad4`, `97aebb08`    | None                                                                                                        |
| p01-t04              | `plan.md` p01-t04 verification                              | Suite stays green with no bundled-recipe test changes called out                                                    | Two v1-era tests in `recipes.test.mjs` updated deliberately                           | The loader test asserted `schemaVersion === v1`, and `project recap requires all six accountability sections` asserted a hard error that stops applying once the recipe is v2. The enforcement half was dropped and the test renamed to "declares"; the `requiredNarrative` assertion was kept. The v1 guarantee is still held by p01-t02a's synthetic fixture.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                        | `plan.md` (updated)               | p05-t01 must supply the replacement coverage warning                                                        |
| Parallel group setup | n/a — environment                                           | Worktrees dispatched after verifying tests green                                                                    | All three phases aborted preflight on a dirty tree; restarted after remediation       | `pnpm run worktree:init` runs a provider sync that restamps `.oat/sync/manifest.json` `oatVersion` from the committed `0.2.14` to the locally installed `0.2.17`. Dispatch was gated on tests passing but not on a clean tree. Reverted in all three; implementers given a narrow exemption for that one file. No work lost.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                           | Base `b958bb86` unchanged         | Repo backlog candidate: `worktree:init` should not leave a fresh worktree dirty                             |
| p02-t01              | AGENTS.md skill version-bump rule                           | Bump `version:` for each changed canonical `SKILL.md`                                                               | No bump in this commit                                                                | The rule is PR-scoped, not edit-scoped. p02 touched `oat-explainer-kit` and `oat-project-complete`; the plan assigns those single bumps to p06-t04 and p08-t02 respectively, so bumping here would produce two bumps for one skill.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                    | `plan.md`                         | Verify both bumps actually land in p06-t04 / p08-t02                                                        |
| p03-t02              | D1 origin propagation                                       | Renderer descriptors carry `origin`                                                                                 | Carried, but `run.mjs`'s `renderDescriptor()` still strips it                         | p03 widened `assertRecipeArtifact` to accept both the legacy four-key shape and the five-key `origin` form, avoiding a cross-boundary write into p06-owned `run.mjs`. The tolerance means a missed follow-through in p06-t02 would silently give expansion artifacts floor paths.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                      | Commit `5a85f31d` (plan note)     | p06-t02 must widen `renderDescriptor()` and assert the expansion path                                       |
| p04-t01              | `plan.md` p04-t01 commit message                            | Subject capitalized "DOM"                                                                                           | Lowercased to "dom"                                                                   | Repo commitlint enforces subject-case and rejected the planned capitalization. Message-only; no code or boundary change.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                               | Commit `6051f28c`                 | None                                                                                                        |
| p04-t02              | Shell identity marker placement                             | Marker on the `<html>` element                                                                                      | Marker moved to `<body>` attributes                                                   | The renderer matches the exact `<html lang="en">` opening when injecting theme mode; marking `<html>` would have required editing p03-owned `render.mjs` mid-parallel-group. `<body>` preserves compatibility with no cross-boundary write.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                            | Commit `a5bd6a1b`                 | None                                                                                                        |
| n/a — environment    | `pnpm lint`                                                 | Full lint green                                                                                                     | Type-aware lint pass fails repo-wide                                                  | `oxlint-tsgolint` is not installed locally, so the `--type-aware` pass cannot run; the standard oxlint pass reports 0 errors in every package. Unrelated to this project — the whole merge touched only `.agents/` and `.oat/`, zero TypeScript.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                       | n/a                               | Must be resolved before p08-t02's `pnpm release:validate` or that gate fails for environmental reasons      |
| p05-t02a             | `plan.md` Phase 5 task list                                 | Phase 5 had two tasks and reported green on core + adapter                                                          | Inserted a corrective task after Phase 6                                              | p05-t02 introduced viewport-clipping detection, which did not previously exist, and its first real-Chromium run failed the release visual gate on `profile-editorial-deck` at 320px in both the default and no-js scenarios. Bisected to `651aac80`: green at `b958bb86`, `97ef5349`, `origin/main`, and `a75bcb32` (p05-t01). The finding was a **false positive** — `.deck` is `display: flex; overflow-x: auto; scroll-snap-type: x mandatory`, so slides after the first sit off-viewport by design and stay reachable by scroll, keyboard, and snap. The probe read intentional horizontal paging as clipped content. Fixed by exempting elements inside a horizontally scrollable ancestor, pinned by a real-browser regression test that fails without the exemption. Neither Phase 5 nor my own phase verification ran `tools/release/*`, which is how it escaped both.                                                                                        | Commits `e45c0c6e`, `c926b4fe`    | The exemption was itself too broad and was re-hardened in `prev1-t02`                                       |
| p05-t02b             | `plan.md` Phase 5 task list                                 | Phase 5 shipped a render QA probe battery assumed correct                                                           | Inserted a second corrective task during Phase 8                                      | `pnpm release:validate` ran for the first time in p08-t02 and failed the visual gate with six `animations-enabled` issues covering every `explainer`-type artifact. Reproduced identically at the untouched phase base `c3e25d31`, and absent at `origin/main` and `a75bcb32`, so it originates in `651aac80` (p05-t02) like p05-t02a. Also a false positive: `engineer-tour.html` carries the conventional `prefers-reduced-motion` idiom setting `transition-duration: 0.01ms !important` (byte-identical to `origin/main`), and a real-Chromium probe showed every element at `animationName: none` with no motion running. The probe demanded a duration of exactly `0`, so it read reduced-motion _compliance_ as a defect. Fixed by treating sub-millisecond durations as suppressed rather than active. Verified at the root that this does not blind the probe: 0.01ms reads disabled, while 200ms transitions, keyframe animations, and 1ms all still report. | Commits `d6dec1c2`, `df237bf8`    | The p05-t02 probe battery shipped two false positives; both were found only by gates outside core + adapter |
| p08-t02              | n/a — stale CLI contract tests                              | Plan assumed `pnpm test` was green before the bumps                                                                 | Two pre-existing red tests repaired inside p08-t02                                    | `pnpm test` had never been run by any earlier phase, so two stale assertions went unnoticed: `skills.test.ts` still pinned `explainer-kit` at 1.0.2 and `oat-explainer-kit` at 1.0.1 (stale since p06-t04), and `review-skill-contracts.test.ts` asserted a critic-only sentence that p02-t01 had replaced. Verified at the root that the prose assertion was strengthened, not weakened: one `toContain` became four `toMatch` assertions covering author-seam construction, both callback forms, the retained `critic` callback, and `mode: unattended`.                                                                                                                                                                                                                                                                                                                                                                                                             | Commit `81fd68a5`                 | Adopted in Phase rev1: every commit gated on all four suites plus `pnpm test`                               |
| p08-t01              | `plan.md` p08-t01 file list                                 | `apps/oat-docs/docs/` and `explainer-kit/SKILL.md`                                                                  | Also updated `explainer-kit/references/contracts.md` and two docs accuracy fixes      | `SKILL.md` delegates to `references/contracts.md`, which still described `AuthorRequestV1`/`AuthorResultV1`, an unattended-only author requirement, and a pipeline with no approval stage. Leaving it would have shipped a self-contradictory skill.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                   | Commit `d1a72286`                 | Doc tasks should declare the full delegation closure, not just the entry document                           |
| prev1-t07            | Review finding I1                                           | Review asked for a shipped code-level author driver implementing `author-request/v2`                                | Seam accepted as designed; verification added instead, recorded as design decision D9 | The design's "prose carries quality" premise makes the executing agent the author, so the author callback is deliberately caller-owned. A bundled generator would reintroduce the rigidity this project removed. The genuine gap was the absent outcome check, now covered by behavioral tests that prove an evidence-derived author yields structured richness and that a thin author fails the same assertions.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                      | `design.md` D9, commit `fd75dacd` | None                                                                                                        |
| prev1-t02            | Review finding I4                                           | Three independent probe defects                                                                                     | Treated as one hardening pass over the probe battery                                  | Four defects across three discoveries in the same module, one of them a regression from a prior fix, indicated the module's classification logic rather than three isolated bugs. Each sub-fix was individually revert-verified in real Chromium.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                      | Commit `5f202ee7`                 | None                                                                                                        |
| prev1-t02            | `tools/release/validate-explainer-visuals.test.mjs` fixture | New fixture expected an element at `left:900px` inside a `position:relative` scroller to be unreachable             | Fixture corrected to drop `position:relative`                                         | The original expectation was wrong, not the code: with a positioned ancestor the browser extends `scrollWidth` to include the element, making it genuinely reachable. Without the positioned ancestor it resolves against the viewport and is truly unreachable, which is the case the test needs.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                     | Commit `5f202ee7`                 | None                                                                                                        |
| prev1-t05            | Smoke provenance fixtures                                   | Fixtures asserted an author-supplied `generatedAt` verbatim                                                         | Migrated to assert core-clock precedence plus the new `trust` field                   | Required by the new trust boundary, and strictly stronger: the fixtures now prove a backdated author claim is overwritten rather than merely echoed.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                   | Commits `eea9ad80`, `f257f96d`    | None                                                                                                        |
| prev1-t06            | Unit-suite hermeticity                                      | Render QA had no runtime to resolve, so suites were incidentally hermetic                                           | `EXPLAINER_KIT_HEADLESS_PROBE=off` set explicitly in the affected suites              | Once runs resolve a real headless runtime by default, unit suites would otherwise launch Chromium. The opt-out is reported as `render-qa-disabled-by-configuration`, distinct from a missing runtime, so the distinction stays visible in the manifest.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                | Commit `a3b776a3`                 | None                                                                                                        |

## Test Results

Track test execution during implementation.

| Phase        | Tests Run | Passed | Failed | Coverage                                                                                                                                                                                                                                                                                                                                                                     |
| ------------ | --------- | ------ | ------ | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 1            | 158       | 158    | 0      | core suite (`.agents/skills/explainer-kit/tests/*.test.mjs`); baseline was 153                                                                                                                                                                                                                                                                                               |
| 2-4 (merged) | 242       | 242    | 0      | core 188 + adapter 54, on the merged trunk; core is exactly 158 + 18 (p03) + 12 (p04), so the merge was additive with no coverage lost                                                                                                                                                                                                                                       |
| 5            | 247       | 247    | 0      | core 193 + adapter 54                                                                                                                                                                                                                                                                                                                                                        |
| 6            | 424       | 424    | 0      | core 199 + adapter 55 + smoke 129 + release 41                                                                                                                                                                                                                                                                                                                               |
| 7            | 434       | 433    | 0      | core 207 + adapter 55 + smoke 129 + release 42 pass, 1 skip                                                                                                                                                                                                                                                                                                                  |
| 8            | 435       | 434    | 0      | core 207 + adapter 55 + smoke 129 + release 43 pass, 1 skip; plus `pnpm release:validate`, `pnpm lint`, `pnpm type-check`, `pnpm test`                                                                                                                                                                                                                                       |
| rev1         | 460       | 459    | 0      | core 226 + adapter 60 + smoke 129 + release 44 pass, 1 skip (RC-integration, env-gated); all four suites plus `pnpm lint` and `pnpm type-check` gated every one of the ten commits, with `pnpm release:validate`, `pnpm test:smoke`, and `pnpm test` additionally on the `qa.mjs` / `html-safety.mjs` / provenance tasks. Net new coverage: core +19, adapter +5, release +1 |

## Final Summary (for PR/docs)

**What shipped:**

- An author seam (`author-request/v2` → `author-result/v2`) that hands the
  brief, fact base, and required narrative to the calling agent and takes back
  authored content, replacing the hardcoded recap templates that produced
  uniformly thin output.
- Recipes v2 with a floor/expansion split: a recipe declares the narrative
  floor every artifact must cover, plus policy-owned expansion profiles with
  per-profile and per-type caps, so callers can propose extra artifacts without
  the recipe enumerating them.
- Two rendering paths — a narrative renderer (Markdown, blocks, diagrams,
  timelines) and an artistic composer path for agent-authored HTML — with a
  hash-pinned safety validator gating the latter.
- A guideline checker and an opt-in render QA stage covering layout,
  reachability, heading readability, reduced-motion compliance, keyboard
  operability, and theme toggling. The core never launches a browser itself; the
  stage runs only when a caller injects a probe.
- Approval relocated after render and QA, so a human approves what will
  actually ship rather than an intermediate plan, with resume-compatible
  approval records.
- Recipe v1 retired at the 2.0.0 boundary, with all consumers and fixtures
  migrated.

**Behavioral changes (user-facing):**

- Recap and explainer output is authored per run from actual lifecycle
  evidence, so two projects no longer produce near-identical prose.
- Unsafe authored HTML is a hard error: `<form>` is not an allowed element, and
  submission attributes, dangerous URL schemes, and unpinned external resource
  references are rejected outright rather than warned about.
- Render QA is opt-in and never self-launching. Without an injected probe the
  stage records a single `render-qa-skipped-no-probe` warning and the run
  continues; the earlier `render-qa-skipped-no-headless-runtime` and
  `render-qa-disabled-by-configuration` reasons no longer exist, having collapsed
  into that one ID when the auto-resolving runtime was cut.
- Every QA and render finding carries exactly one stable warning ID, and render
  degradation warnings now reach the run result and the manifest instead of
  being computed and dropped.
- Author provenance records `trust: caller-bound | self-asserted`, and
  `generatedAt` is always stamped by the core clock, so an author cannot
  backdate or spoof its own identity.
- Markdown lead prose (before the first `##`) is preserved as its own section,
  and repeated headings get unique anchors rather than colliding.
- Recipe v1 is no longer loadable; callers must supply v2.

**Key files / modules:**

- `.agents/skills/explainer-kit/scripts/run.mjs` - pipeline orchestration:
  fact base, author stage, render, QA, approval, provenance stamping
- `.agents/skills/explainer-kit/scripts/lib/recipes.mjs` - recipe v2 loading,
  narrative-floor validation, expansion evaluation and caps
- `.agents/skills/explainer-kit/scripts/lib/qa.mjs` - guideline checks, browser
  probe battery, stable warning-ID vocabulary
- `.agents/skills/explainer-kit/scripts/lib/html-safety.mjs` - the single
  source of authored-HTML policy: element allowlist, URL and resource rules
- `.agents/skills/explainer-kit/scripts/lib/browser-runtime.mjs` - shared
  headless runtime resolution and page probing, used by render QA and the
  release visual validator
- `.agents/skills/explainer-kit/scripts/render-qa.mjs` - render + QA stage entry
- `.agents/skills/explainer-kit/schemas/author-{request,result}.v2.schema.json` -
  the author contract
- `.agents/skills/oat-explainer-kit/scripts/run.mjs` - OAT lifecycle adapter,
  including the browser-probe module seam

**Verification performed:**

- Four suites green at every commit, and green on the shipped branch at core
  224, adapter 59, smoke 129, release 44 pass + 1 skip (RC-integration,
  env-gated). Phase rev1 ended at core 226 and adapter 60; the post-revision
  scope reduction then removed six tests along with the behavior they described,
  and four post-closeout rendering fixes added three back.
- `pnpm release:validate`, `pnpm lint`, `pnpm type-check`, and `pnpm test` all
  pass; `release:validate` includes the real-Chromium visual gate.
- Non-vacuity proven rather than assumed at three high-risk points: the p07
  anti-regression fixture (6 of 8 tests fail with the table renderer
  regressed), each of `prev1-t02`'s three probe sub-fixes (revert-verified
  individually in real Chromium), and `prev1-t07`'s richness check (a thin
  author fails the assertions a rich one passes).

**Design deltas (if any):**

- **D9 added.** The author seam is caller-owned by design: the core ships no
  content generator, because "prose carries quality" makes the executing agent
  the author. What the design had left implicit was how autonomous richness
  gets verified; D9 records the seam as intended and pins the outcome check.
- **Origin propagation (D1)** is carried end to end, but
  `assertRecipeArtifact` tolerates both the legacy four-key descriptor and the
  five-key `origin` form, a widening taken to avoid a cross-boundary write
  during the parallel group.
- **Shell identity marker** sits on `<body>` rather than `<html>`, because the
  renderer matches the exact `<html lang="en">` opening when injecting theme
  mode.

## References

- Plan: `plan.md`
- Design: `design.md`
- Spec: N/A (quick mode)

## Gate Escalation: plan artifact review (2026-07-25)

The configured quick-start exit gate (cross-family plan review, block on
Important, maxAttempts 2) blocked twice; attempts were exhausted and the plan
phase was escalated to the operator.

- Attempt 1: `reviews/artifact-plan-review-2026-07-25T183814Z.md` — 5
  Important, 3 Medium. All 8 findings remediated in commit `baa1b8d4`
  (expansion protocol defined, v2 schema coexistence at versioned paths,
  consumer-migration task added, parallel write sets made disjoint, release
  closure moved last with single per-skill bumps, approval-record v2 +
  resume compatibility, GFM strikethrough, program-recap semantics).
- Attempt 2: `reviews/artifact-plan-review-2026-07-25T191042Z.md` — 4
  Important, 1 Medium (new depth): expansion profiles must be policy-owned
  (briefRef/shell per allowed type, identity/collision validation); recipe
  v1→v2 needs staged coexistence and a full recipe-consumer inventory;
  `page` artifact type and manifest marking conflict with the frozen
  `manifest/v1` schema; actual lifecycle callers (`oat-project-complete`,
  closeout) must own author-callback construction; run-stage E_QA hard-fail
  must be split into safety errors vs warnings.

**Resolution (2026-07-25):** findings from attempts 1–2 and three further
cycles were remediated, and the interface-level questions the reviews surfaced
were promoted into `design.md` as resolved decisions D1–D8 rather than left as
plan defects. The operator then ended the gate loop and accepted the plan.
Implementation proceeds on that recorded decision; see `plan.md` "Plan
acceptance basis".

- **plan:** ---
  oat_status: complete
  oat_ready_for: oat-project-implement
  oat_blockers: []
  oat_last_updated: 2026-07-25
  oat_phase: plan
  oat_phase_status: complete
  oat_plan_hill_phases: ['p08']
  oat_auto_review_at_hill_checkpoints: true
  oat_plan_parallel_groups: [['p02', 'p03', 'p04']]
  oat_plan_source: quick
  oat_import_reference: null
  oat_import_source_path: null
  oat_import_provider: null
  oat_generated: false
  oat_template: false

---

# Implementation Plan: explainer-authoring-redesign

Replace explainer-kit's v1 content layer (flat-prose author contract +
escaping single-paragraph renderer) with the two-path authoring model from
`design.md`: markdown-first deterministic rendering for narrative artifacts,
shell-based agent-composed HTML for artistic artifacts, prose briefs as the
quality mechanism, guidelines-as-warnings, restored render QA, content-driven
set scaling, and honest auto-drafted marking for unattended runs.

Primary write surface: `.agents/skills/explainer-kit/` (core skill) and
`.agents/skills/oat-explainer-kit/` (adapter), plus lifecycle callers, docs,
release tooling fixtures, and release bookkeeping. Skill tests run with
`node --test .agents/skills/explainer-kit/tests/*.test.mjs`.

**Test invocation must use explicit globs, never a bare directory.**
`node --test <dir>` does not work in this repo on Node 22.17 — it resolves the
directory as a module and throws `MODULE_NOT_FOUND`, reporting a single failed
"test" without executing any suite. This is not specific to the hidden
`.agents/` path; `node --test tools/release/` fails the same way. The repo
convention is explicit globs, as `package.json`'s `test:smoke` script shows. Do
not "simplify" these commands back to directory form.

**Baseline:** the core suite is 146/146 green as of `8c81513b`, which repaired
11 failures that PR #170 (`ffcae8f0`) left on main — stale manifest fixtures in
`records.test.mjs` / `s3-static.test.mjs` missing the immutable-coverage
provenance paths, plus a 0.4.1 migration-provenance test in
`rebuildability.test.mjs` that depended on the since-archived
`.oat/projects/shared/explainer-kit/` project and was removed with its fixture.
Phase verification therefore expects a genuinely green suite, not a pinned
known-red set.

Bundled copies under `packages/cli/assets/skills/` are regenerated wholesale
by `packages/cli/scripts/bundle-assets.sh` during `pnpm build` (it `rm -rf`s
the assets tree and re-copies from `.agents/skills`, stripping `tests/`).
Tasks edit canonical paths only; the bundled tree refreshes at build.

## Binding decisions

`design.md` resolves eight interface questions (D1–D8) that this plan
implements verbatim: ID-bearing paths for expansion artifacts while floor
artifacts keep today's paths, carried by an explicit `origin` field (D1);
`requiredNarrative` relocated to the narrative floor entry (D2); an ordered
multiset of hash-pinned core shell scripts with all other scripts rejected
(D3); the interactive approval gate relocated to after render and QA (D4);
mandatory finite expansion caps (D5); GFM alert callouts plus fenced
`timeline` blocks (D6); a fixed minimum fenced-diagram grammar (D7); and the
accepted artifact set persisted in the approval record so paused expanded
runs rehydrate faithfully (D8). Three further boundaries are plan-level:

**B1. Manifest stays at v1, unmodified.** `manifest.schema.json` is
`additionalProperties: false` with artifact types restricted to `hub`,
`diagram`, `explainer`, `deck`, `catalog`. No new type is introduced;
narrative sub-pages use `explainer`. Approval marking is **not** added to the
manifest — it lives in the `content-approval/v2` record and the run result.
Guideline and render-QA findings need no schema change: `manifest/v1` already
requires `warnings` as `{type: array, items: {type: string}}`.

**B2. Recipe files carry two independent versions; only one moves.**
`recipes.mjs` distinguishes `schemaVersion` (`explainer-kit.recipe/v1`, the
file-format contract, line 3) from `version` (`"1"`, the recipe's identity,
line 173) used in the `{id, version}` selector and cross-checked against the
manifest at `oat-explainer-kit/scripts/run.mjs:309`. This plan moves
`schemaVersion` to `explainer-kit.recipe/v2` and **leaves every recipe's
`version` at `"1"`**, so identity pins in `resolve-config.mjs:182` and the
wave skills stay valid. Release/RC fixtures that assert the recipe _schema_
version are a separate surface and are migrated in p06-t04.

**B3. Floors are unchanged from v1.** Each recipe's floor reproduces its
current artifact set exactly — `project-recap`, `program-recap`, and
`project-explainer` each keep one `hub` on `house-style`; `engineer-tour`
keeps one `explainer` on the `engineer-tour` shell. Rendered URLs, recipe
identity, and artifact ID/type identity therefore do not churn. Internal
source paths may change with the authoring format: `engineer-tour` authors
html, so its `source/content/…` file (and the manifest `contentPath` that
records it) moves from `.md` to `.html`. Richness comes from expansion, not
from restructuring the floor.

## Expansion protocol

Recipes own policy; the author owns judgment about how many and why. Each
recipe declares `expansion.profiles[]`, where a profile fixes everything the
pipeline needs to build a follow-up request:

```json
{
  "profileId": "supporting-diagram",
  "type": "diagram",
  "authoring": "html",
  "briefRef": "briefs/supporting-diagram.md",
  "shell": "diagram-shell",
  "maxCount": 4
}
```

The floor artifact's `author-result/v2` may carry an optional
`proposedArtifacts[]` of `{id, profileId, rationale}`. Proposals carry **no**
`authoring`, `briefRef`, or `shell`; those are read from the profile. The
pipeline then:

1. Validates each proposal: `profileId` must resolve; `id` must be a safe
   slug, unique across proposals, and must not collide with any floor
   artifact id.
2. Enforces caps: per-profile `maxCount` and recipe-level
   `expansion.limits.maxArtifacts` (both mandatory per D5; floor artifacts do
   not count toward `maxArtifacts`). Over-limit proposals are rejected with a
   stable warning ID rather than failing the run.
3. Issues one `author-request/v2` per accepted proposal, populated from the
   profile, and receives one `author-result/v2` per artifact.

Malformed proposals (unknown profile, unsafe/duplicate/colliding id) are hard
errors — they indicate a broken author, not thin content. Accepted expansion
artifacts render to ID-bearing paths per D1 and are linked from the floor hub
via the existing `artifactLinks` mechanism.

## Phase 1: Contracts, briefs, and recipes v2

### Task p01-t01: Author contract v2 schemas (coexisting with v1)

**Files:**

- Create: `.agents/skills/explainer-kit/schemas/author-request.v2.schema.json`
- Create: `.agents/skills/explainer-kit/schemas/author-result.v2.schema.json`
- Modify: `.agents/skills/explainer-kit/scripts/lib/contracts.mjs`
- Modify: `.agents/skills/explainer-kit/tests/contracts.test.mjs`

**Step 1:** Define `explainer-kit.author-request/v2`: `{schemaVersion,
artifactId, artifactType, authoring, brief, factBase, shell?, theme, floor?}`
where `floor` carries the artifact's `requiredNarrative` per D2. Define
`explainer-kit.author-result/v2`: `{schemaVersion, artifactId, content:
{markdown | html} (exactly one), provenance{authorId, generatedAt, method?},
proposedArtifacts?: [{id, profileId, rationale}]}`. Proposal entries are
`additionalProperties: false` and must **not** accept `authoring`,
`briefRef`, or `shell` — the schema is the first enforcement point for policy
ownership.

The v2 schemas live at **distinct versioned paths**; the v1 files
(`author-request.schema.json`, `author-result.schema.json`) are untouched
here — `run.mjs` consumes them until p06-t02.

**Step 2:** Extend `contracts.mjs` registration to be version-aware: both v1
and v2 author contracts resolve by `$id`/kind+version. No call-site behavior
changes in this task.

**Step 3: Verify**
Run: `node --test .agents/skills/explainer-kit/tests/contracts.test.mjs`
Expected: v2 fixtures (with and without `proposedArtifacts`) validate; v1
validation unchanged; a v2 result carrying both `markdown` and `html` is
rejected; a proposal carrying `authoring` or `shell` is rejected.

**Step 4: Commit**

```bash
git add .agents/skills/explainer-kit/schemas/author-request.v2.schema.json .agents/skills/explainer-kit/schemas/author-result.v2.schema.json .agents/skills/explainer-kit/scripts/lib/contracts.mjs .agents/skills/explainer-kit/tests/contracts.test.mjs
git commit -m "feat(p01-t01): author contract v2 with profile-referencing expansion proposals"
```

### Task p01-t02: Dual-version recipe loader and shape accessors

**Files:**

- Modify: `.agents/skills/explainer-kit/scripts/lib/recipes.mjs`
- Modify: `.agents/skills/explainer-kit/scripts/run.mjs`
- Modify: `.agents/skills/explainer-kit/tests/recipes.test.mjs`
- Modify: `.agents/skills/explainer-kit/tests/render.test.mjs`

**Step 1:** `recipes.mjs` loads and validates all four bundled recipes at
module import (line 41) and `requiredNarrative` is a required field (line
175, consumed at 132), so a bare swap of the validation rules would red every
intermediate commit. Make the loader **dual-version**: dispatch on each
file's declared `schemaVersion`, validating `artifacts[]` + root
`requiredNarrative` for `explainer-kit.recipe/v1` (current rules, unchanged)
and `floor[]` + `expansion{profiles[], limits{}}` with floor-entry
`requiredNarrative` for `explainer-kit.recipe/v2`.

v2 validation covers: floor entries (`id`, `type` within the manifest enum,
`authoring`, template/shell ref, `briefRef`, `requiredNarrative`); profile
completeness (`profileId`, `type`, `authoring`, `briefRef`, `shell?`, and a
**finite `maxCount`** per D5); a **finite `expansion.limits.maxArtifacts`**
per D5; duplicate `profileId`s; and floor/profile id hygiene. Undeclared
artifact type in a proposal or result → error. Over-limit proposals →
rejection with warning. Floor misses → guideline checker (warning), never a
recipe error.

**Step 2:** Introduce normalized accessors — `recipeFloor(recipe)`,
`recipeExpansion(recipe)`, and `recipeRequiredNarrative(recipe, artifactId)`
— that work for **both** shapes: for v1, map `artifacts[]` to floor entries
with empty expansion and read `requiredNarrative` from the recipe root; for
v2, read from floor entries. Convert every recipe-shape reader to the
accessors. The complete reader inventory, verified by
`rg -n "recipe\.artifacts|\.artifacts\[|requiredNarrative" .agents/skills/explainer-kit --glob '!**/assets/**'`:

- `scripts/run.mjs` — 5 `recipe.artifacts` sites plus the
  `requiredNarrative` consumers in the authoring/content path (≈ lines
  587-620 and 693-709)
- `tests/recipes.test.mjs` — 2 sites (lines 31, 202)
- `tests/render.test.mjs` — 5 `loadRecipe('project-explainer', '1').artifacts[0]`
  reads (lines 41, 63, 80, 158, 200)

This step is mechanical and behavior-preserving: v1 recipes still load and
the full suite stays green before any recipe file changes.

**Step 3: Verify**
Run: `node --test .agents/skills/explainer-kit/tests/*.test.mjs`
Expected: the whole core suite passes unchanged with v1 recipes on disk;
synthetic v2 fixtures (floor + profiles + caps) pass; undeclared-type,
duplicate-profileId, id-collision, missing-`maxCount`, and
missing-`maxArtifacts` fixtures error; over-limit proposal fixture yields a
rejection outcome; floor-miss fixture does not error.

**Step 4: Commit**

```bash
git add .agents/skills/explainer-kit/scripts/lib/recipes.mjs .agents/skills/explainer-kit/scripts/run.mjs .agents/skills/explainer-kit/tests/recipes.test.mjs .agents/skills/explainer-kit/tests/render.test.mjs
git commit -m "feat(p01-t02): dual-version recipe loader with normalized shape accessors"
```

### Task p01-t03: Author briefs (prerequisite for v2 recipes)

**Files:**

- Create: `.agents/skills/explainer-kit/briefs/project-recap.md`
- Create: `.agents/skills/explainer-kit/briefs/program-recap.md`
- Create: `.agents/skills/explainer-kit/briefs/project-explainer.md`
- Create: `.agents/skills/explainer-kit/briefs/engineer-tour.md`
- Create: `.agents/skills/explainer-kit/briefs/supporting-diagram.md`
- Create: `.agents/skills/explainer-kit/briefs/deep-dive.md`
- Create: `.agents/skills/explainer-kit/briefs/walkthrough-deck.md`
- Create: `.agents/skills/explainer-kit/briefs/project-page.md`

**Step 1:** Briefs land **before** the v2 recipes because p01-t04 verifies
that every `briefRef` resolves. Author the brief format (audience, voice,
per-section intent, floors, expansion license) and write all eight bundled
briefs — one per recipe floor entry (4) and one per expansion profile (4).

The `project-recap` brief encodes the editorial bar: busy-reader prose, the
six-part narrative coverage matching its `requiredNarrative`, ≥1 high-level
architecture diagram (inline fine), evidence tables for validation, an
expansion license keyed to project substance ("propose additional diagrams, a
deep-dive, or a walkthrough deck when complexity earns it"), and the
plain-language editing rules from the original 0.4.1 skill. The
`program-recap` brief covers program-level aggregation and per-project
sub-page expansion. `engineer-tour` is an artistic (html) brief and states
the shell-composition license under D3.

**Step 2: Verify**
Run: `node --test .agents/skills/explainer-kit/tests/recipes.test.mjs`
Expected: suite still green (briefs are inert until p01-t04 references them);
all eight files exist and are non-empty.

**Step 3: Commit**

```bash
git add .agents/skills/explainer-kit/briefs
git commit -m "feat(p01-t03): bundled author briefs carry the editorial bar"
```

### Task p01-t02a: Make p01-t02 survive the v2 cutover (corrective)

Inserted mid-flight, after p01-t03 landed. p01-t02's premise — that "all
readers went through the accessors", so p01-t04 would stay green — proved
false in two places that are unobservable while every bundled recipe is still
v1. Both live in files p01-t02 owns, so p01-t04 cannot repair them within its
declared boundary. This task lands the repairs as their own commit.

**Files:**

- Modify: `.agents/skills/explainer-kit/scripts/run.mjs`
- Modify: `.agents/skills/explainer-kit/tests/render.test.mjs`
- Modify: `.agents/skills/explainer-kit/tests/recipes.test.mjs`

**Step 1:** `renderArtifact` rejects anything that is not an exact
`{id, type, template, required}` descriptor
(`render.mjs:339-355`), but a normalized v2 floor entry also carries
`authoring`, `briefRef`, and `requiredNarrative`. Narrow the entry at the
`render` stage call site in `run.mjs` and mirror the same projection in the
`render.test.mjs` helpers. This is the interim shape; p03-t02 widens the
descriptor to carry `origin` under D1.

**Step 2:** p01-t02's dual-shape test uses the live `project-explainer`
recipe as its v1 example, so p01-t04 would leave the v1 loader branch with no
coverage at all. Replace it with a synthetic in-test v1 fixture and rebase the
synthetic v2 fixture on it, so both branches stay exercised permanently.

**Step 3:** Pin the coverage semantics that the cutover changes. Floor
narrative coverage is a hard error under v1 and intentionally _not_ an error
under v2, because it degrades to a guideline-checker warning in p05-t01. Assert
both halves against the synthetic fixtures so the v1 guarantee cannot be lost
silently and the v2 deferral is explicit rather than incidental.

**Step 4: Verify**
Run: `node --test .agents/skills/explainer-kit/tests/*.test.mjs`
Expected: 154/154 green, with the v1 branch still covered.

**Step 5: Commit**

```bash
git add .agents/skills/explainer-kit/scripts/run.mjs \
  .agents/skills/explainer-kit/tests/render.test.mjs \
  .agents/skills/explainer-kit/tests/recipes.test.mjs
git commit -m "fix(p01-t02a): carry p01-t02 accessors across the v2 cutover"
```

### Task p01-t04: Rewrite bundled recipes to v2

**Files:**

- Modify: `.agents/skills/explainer-kit/recipes/project-recap.json`
- Modify: `.agents/skills/explainer-kit/recipes/program-recap.json`
- Modify: `.agents/skills/explainer-kit/recipes/project-explainer.json`
- Modify: `.agents/skills/explainer-kit/recipes/engineer-tour.json`
- Modify: `.agents/skills/explainer-kit/tests/recipes.test.mjs`

**Step 1:** Convert each recipe to `schemaVersion:
"explainer-kit.recipe/v2"`, **keeping `version: "1"`** (B2) and **keeping the
floor identical to today's artifact set** (B3). Each floor entry carries its
`briefRef` and the `requiredNarrative` list moved down from the recipe root
(D2). Caps are the concrete D5 values:

| Recipe              | Floor (unchanged)                            | Profiles (maxCount)                                   | maxArtifacts |
| ------------------- | -------------------------------------------- | ----------------------------------------------------- | ------------ |
| `project-recap`     | 1 `hub`, markdown, house-style, 6 sections   | supporting-diagram 4, deep-dive 3, walkthrough-deck 1 | 6            |
| `program-recap`     | 1 `hub`, markdown, house-style, 6 sections   | supporting-diagram 3, project-page 12                 | 12           |
| `project-explainer` | 1 `hub`, markdown, house-style, 5 sections   | supporting-diagram 4                                  | 4            |
| `engineer-tour`     | 1 `explainer`, html, engineer-tour, 5 sects. | supporting-diagram 4                                  | 4            |

Profile types/authoring: `supporting-diagram` → `diagram`/html/diagram-shell;
`deep-dive` and `project-page` → `explainer`/markdown; `walkthrough-deck` →
`deck`/html/deck-shell.

**Step 2: Verify**
Run: `node --test .agents/skills/explainer-kit/tests/*.test.mjs`
Expected: semantic assertions per recipe (floor ids/types/authoring identical
to the v1 artifact set, `requiredNarrative` preserved per floor entry,
profile sets and caps, every `briefRef` resolving to a p01-t03 file,
`version` still `"1"`); the whole core suite stays green because the readers
went through the p01-t02 accessors and p01-t02a carried them across the
cutover.

Two bundled-recipe tests in `recipes.test.mjs` assert v1-era facts and must be
updated here, not worked around: the loader test asserting
`schemaVersion === 'explainer-kit.recipe/v1'`, and the `project-recap`
coverage test, whose hard-error assertion no longer holds once that recipe is
v2. Keep its `requiredNarrative` assertion and drop only the enforcement half
— the v1 guarantee is already held by p01-t02a's synthetic fixture, and v2
coverage becomes a p05-t01 warning. Do not invert an assertion in place.

**Step 3: Commit**

```bash
git add .agents/skills/explainer-kit/recipes .agents/skills/explainer-kit/tests/recipes.test.mjs
git commit -m "feat(p01-t04): bundled recipes on v2 floor+expansion profiles"
```

### Task p01-t05: Approval record v2 with marking and resume compatibility

**Files:**

- Modify: `.agents/skills/explainer-kit/scripts/lib/content-approval.mjs`
- Modify: `.agents/skills/explainer-kit/tests/content-approval.test.mjs`

**Step 1:** Emit `explainer-kit.content-approval/v2` records carrying
`marking: "human-approved" | "auto-drafted"`: unattended auto-approval
records `auto-drafted`; interactive approve records `human-approved`. Update
version assertions that hard-code v1. Per B1, marking surfaces in the
approval record and run result only — never the manifest.

**Step 2:** Define — but do not yet require — the D8 `artifacts[]` field:
`{artifactId, origin, profileId?, authoring, contentPath, authorResultPath?}`.
Activation is deliberately split from definition because the producer does not
exist yet: at this point the runner passes only `state.authorResultPaths` into
approval (`run.mjs:112-117`) and interactive runs synthesize content with no
author result at all (`:85-95`), so demanding complete entries here would be
unsatisfiable and would red p06-t01's intervening full-suite commit. This task
lands the shape, the reader, and the normalization; p06-t02 activates
complete-set writes atomically with the author stage that can populate them.

**Step 3:** Specify legacy normalization concretely. `authorResultPath` is
optional because current v1 pending/rejected records contain none
(`content-approval.mjs:42-67`); normalized v1 entries hydrate from the
existing content file rather than inventing a path to a file that never
existed. A persisted v1 record from an in-flight run stays readable (treated
as `human-approved` when approved interactively, `auto-drafted` when
unattended, with `artifacts[]` defaulting to the recipe floor); new writes are
always v2.

**Step 4: Verify**
Run: `node --test .agents/skills/explainer-kit/tests/*.test.mjs`
Expected: unattended runs record v2 `auto-drafted`; interactive approve
records v2 `human-approved`; a v2 record round-trips with and without
`artifacts[]`; a normalized v1 fixture with no author-result path hydrates
from its content file; reject flow unchanged; the full core suite stays green
under the pre-author-stage runner.

**Step 5: Commit**

```bash
git add .agents/skills/explainer-kit/scripts/lib/content-approval.mjs .agents/skills/explainer-kit/tests/content-approval.test.mjs
git commit -m "feat(p01-t05): content-approval v2 marking and resolved artifact set"
```

## Phase 2: Lifecycle caller wiring

### Task p02-t01: Lifecycle callers construct the author callback

**Files:**

- Modify: `.agents/skills/oat-project-complete/SKILL.md` (Step 3.6 recap invocation)
- Modify: `.agents/skills/oat-project-implement/references/completion-and-closeout.md` (closeout recap invocation)
- Modify: `.agents/skills/oat-explainer-kit/references/` (author-callback construction guidance)
- Modify: `.agents/skills/oat-explainer-kit/SKILL.md` (brief wiring guidance; version bump lands in p06-t04)
- Modify: `.agents/skills/oat-explainer-kit/tests/completion.integration.test.mjs`

**Step 1:** Edit the **real callers**, not just adapter docs. Today
`oat-project-complete/SKILL.md:281-285` invokes `runOatExplainer` in
unattended mode supplying only the critic callback, while the adapter already
throws `E_AUTHOR_REQUIRED` for unattended runs without an author
(`oat-explainer-kit/scripts/run.mjs:168-175`) — so the completion chain would
fail outright once synthetic content is removed. Update the completion skill
and the implementation-tail closeout reference to construct and pass the
brief-aware author callback (or validated author module entry point)
alongside the existing critic callback, stating that completion-chain recap
runs always use `mode: unattended`.

**Step 2:** Document in the adapter references how the callback is built:
brief inlined into `author-request/v2`, fact base attached, shell/theme for
artistic artifacts, and the expansion protocol. Record the both-modes rule
decided in p06-t03.

**Step 3:** Make the wiring behaviorally verifiable rather than prose-only.
The repository already has a completion contract test that reads
`oat-project-complete/SKILL.md`
(`oat-explainer-kit/tests/completion.integration.test.mjs:19-84`); extend it
with caller-contract assertions covering **both** instruction surfaces —
each must name an author seam, the critic seam, and `mode: unattended`.

**Step 4: Verify**
Run: `node --test .agents/skills/oat-explainer-kit/tests/completion.integration.test.mjs`
Expected: assertions fail if either caller omits the author seam, the critic
seam, or the unattended mode declaration.

**Step 5: Commit**

```bash
git add .agents/skills/oat-project-complete/SKILL.md .agents/skills/oat-project-implement/references/completion-and-closeout.md .agents/skills/oat-explainer-kit
git commit -m "feat(p02-t01): lifecycle callers construct the brief-aware author callback"
```

## Phase 3: Narrative renderer

### Task p03-t01: Markdown parsing and AST safety validation

**Files:**

- Create: `.agents/skills/explainer-kit/scripts/lib/markdown.mjs`
- Create: `.agents/skills/explainer-kit/tests/markdown.test.mjs`

**Step 1:** Implement CommonMark + GFM (tables, task lists, strikethrough)
parsing to an internal AST, plus the two D6 extensions: GFM alert callouts
(`> [!NOTE]`, `> [!TIP]`, `> [!IMPORTANT]`, `> [!WARNING]`, `> [!CAUTION]`
parsed from blockquotes into a callout node) and fenced ` ```timeline `
blocks (one `date — label` entry per line) into a timeline node. Fenced
diagram blocks are recognized as a third distinct node type. The core stays
dependency-light: implement the required subset natively (no npm runtime deps
in the packaged skill); scope is the block vocabulary, not full spec
compliance.

**Step 2:** AST validation: safe node allowlist (no raw HTML passthrough),
absolute-link rule per the publish contract. Safety violations are hard
errors; style findings return as warnings.

**Step 3: Verify**
Run: `node --test .agents/skills/explainer-kit/tests/markdown.test.mjs`
Expected: block fixtures (tables, task lists, strikethrough, all five alert
types, timeline, diagram fences) parse to the expected node types; raw-HTML
and unsafe-link fixtures hard-fail; warning fixtures return findings without
throwing.

**Step 4: Commit**

```bash
git add .agents/skills/explainer-kit/scripts/lib/markdown.mjs .agents/skills/explainer-kit/tests/markdown.test.mjs
git commit -m "feat(p03-t01): markdown AST parse (GFM, alerts, timelines) + safety validation"
```

### Task p03-t02: Themed block library and expansion path rule

**Files:**

- Modify: `.agents/skills/explainer-kit/scripts/lib/render.mjs`
- Modify: `.agents/skills/explainer-kit/templates/house-style.html`
- Create: `.agents/skills/explainer-kit/tests/narrative-render.test.mjs`

**Step 1:** Replace `renderSections`' escaped single-`<p>` emission with AST
→ block rendering: headings, paragraphs, GFM tables, lists (incl. task
lists), strikethrough, callouts, timelines, code blocks, figures — all themed
via existing tokens, preserving section anchors/numbering/TOC and the
self-contained HTML profile.

**Step 2:** Implement the D1 path rule in `artifactPath`
(`render.mjs:256-263`), which today appends `artifact.id` only for `diagram`
and `deck` and would therefore collapse every `explainer` to
`site/explainers/{slug}/index.html`. Key the rule on the artifact's declared
role: floor artifacts keep the current path exactly (no URL churn), while
expansion artifacts always resolve to
`site/{directory}/{slug}/{artifactId}/index.html`.

Carry the origin explicitly rather than inferring it. Add a required
`origin: "floor" | "expansion"` field to the renderer artifact descriptors
(`render.mjs:339-355`, which are exact-key objects) and widen `artifactLinks`
entries from `{id, type, label}` to `{id, type, label, origin}`
(`:389-405`), so generated hub links resolve through the identical rule
instead of falling back to the floor path. Transitional v1 descriptors
default to `"floor"`.

**Step 3:** Keep deck/slide rendering delegated to the artistic path (p04);
narrative rendering no longer feeds `renderSlides`. Golden-file tests live in
the **new** `narrative-render.test.mjs` (not `templates.test.mjs`, which p04
owns during the parallel group).

**Step 4: Verify**
Run: `node --test .agents/skills/explainer-kit/tests/narrative-render.test.mjs .agents/skills/explainer-kit/tests/theme.test.mjs .agents/skills/explainer-kit/tests/render.test.mjs`
Expected: golden-file renders per block type and theme mode; identical input
→ identical output; floor artifacts of every type resolve to their current
paths, while multiple expansion `explainer` artifacts resolve to distinct
ID-bearing paths — asserted for both the rendered path **and** the generated
relative/public hub link.

**Step 5: Commit**

```bash
git add .agents/skills/explainer-kit/scripts/lib/render.mjs .agents/skills/explainer-kit/templates/house-style.html .agents/skills/explainer-kit/tests/narrative-render.test.mjs
git commit -m "feat(p03-t02): themed block library + collision-safe expansion paths"
```

### Task p03-t03: Diagram blocks rendered to inline SVG

**Files:**

- Create: `.agents/skills/explainer-kit/scripts/lib/diagram.mjs`
- Create: `.agents/skills/explainer-kit/tests/diagram.test.mjs`
- Modify: `.agents/skills/explainer-kit/scripts/lib/render.mjs`
- Modify: `.agents/skills/explainer-kit/tests/narrative-render.test.mjs`

**Step 1:** Render fenced diagram blocks to inline SVG at build time — no
client-side script — themed for light/dark modes. The supported grammar is
fixed by D7 and everything inside it must render: a `graph TD`/`graph LR`
direction header; node declarations `id[Label]`, `id(Label)`, `id{Label}`,
and bare `id`; edges `a --> b`, `a --- b`, `a -->|label| b`; quoted labels
with HTML escaping; and `%%` comments. Any construct outside that grammar
(subgraphs, classDefs, sequence/state diagrams, styling directives) degrades
to a warning plus the source in a code block, never a hard failure.

**Step 2:** Wire the module into the narrative renderer: `render.mjs` must
dispatch diagram AST nodes to `diagram.mjs` and inline the returned SVG.
Without this the module is unreachable and the recap architecture-diagram
floor cannot be met.

**Step 3: Verify**
Run: `node --test .agents/skills/explainer-kit/tests/diagram.test.mjs .agents/skills/explainer-kit/tests/narrative-render.test.mjs`
Expected: a fixture exercising every D7 construct produces deterministic
inline SVG in isolation **and** through a full narrative render; one fixture
per degradation class (subgraph, classDef, non-graph diagram type) degrades
to the specified code-block warning.

**Step 4: Commit**

```bash
git add .agents/skills/explainer-kit/scripts/lib/diagram.mjs .agents/skills/explainer-kit/tests/diagram.test.mjs .agents/skills/explainer-kit/scripts/lib/render.mjs .agents/skills/explainer-kit/tests/narrative-render.test.mjs
git commit -m "feat(p03-t03): build-time inline SVG diagrams wired into narrative render"
```

## Phase 4: Artistic composer path

### Task p04-t01: DOM safety validator with hash-pinned shell scripts

**Files:**

- Create: `.agents/skills/explainer-kit/scripts/lib/html-safety.mjs`
- Create: `.agents/skills/explainer-kit/tests/html-safety.test.mjs`

**Step 1:** Parse-level allowlist validation for agent-composed HTML,
implementing the D3 trust boundary. All three bundled shells legitimately
contain `<script>` elements, so a blanket script ban would reject an
unmodified shell. Instead derive a hash-pinned **ordered multiset** of script
hashes from the declared core shell and require the authored HTML's scripts
to match it exactly — same hashes, same count, same order, compared over
exact bytes with no normalization. Membership alone is insufficient:
`deck-shell.html` carries two distinct core scripts (lines 13 and 223), so a
membership test would accept a deleted script, a duplicated block, or one
allowed block substituted for another. Hard-fail on missing, added,
duplicated, reordered, replaced, or mutated scripts; on inline event-handler
attributes; and on external active content. Warn on style-family deviations
(missing theme tokens, missing required anchors). Non-script markup is free
within the DOM allowlist. The parser is a dependency-light HTML tokenizer
used for validation only.

**Step 2: Verify**
Run: `node --test .agents/skills/explainer-kit/tests/html-safety.test.mjs`
Expected: each of the three bundled shells passes unmodified; deletion,
insertion, duplication, reordering, substitution, and mutation of scripts all
hard-fail (exercised against two-script `deck-shell.html`), as do
event-handler and external-active-content fixtures; rich non-script
elaboration of a shell passes; deviation fixtures warn.

**Step 3: Commit**

```bash
git add .agents/skills/explainer-kit/scripts/lib/html-safety.mjs .agents/skills/explainer-kit/tests/html-safety.test.mjs
git commit -m "feat(p04-t01): DOM allowlist with hash-pinned core shell scripts"
```

### Task p04-t02: Shell canvases

**Files:**

- Modify: `.agents/skills/explainer-kit/templates/deck-shell.html`
- Modify: `.agents/skills/explainer-kit/templates/diagram-shell.html`
- Modify: `.agents/skills/explainer-kit/templates/engineer-tour.html`
- Modify: `.agents/skills/explainer-kit/tests/templates.test.mjs`

**Step 1:** Refresh shells as starting canvases: theme-token wiring, required
anchors (for validation and render QA), and clearly-marked extension regions.
Shells are delivered to the author inside `author-request/v2` (`shell`
field), resolved from the floor entry or expansion profile — never chosen by
the author. Keep shell scripts minimal and self-contained, since D3 pins them
by hash. Shell fidelity checks live in `templates.test.mjs`, which **only
this phase** touches during the parallel group.

**Step 2: Verify**
Run: `node --test .agents/skills/explainer-kit/tests/templates.test.mjs`
Expected: shell fidelity checks pass (tokens + required anchors present).

**Step 3: Commit**

```bash
git add .agents/skills/explainer-kit/templates .agents/skills/explainer-kit/tests/templates.test.mjs
git commit -m "feat(p04-t02): shells as authoring canvases with validation anchors"
```

## Phase 5: Guideline checker and render QA

### Task p05-t01: Guideline checker with warning vocabulary

**Files:**

- Modify: `.agents/skills/explainer-kit/scripts/lib/qa.mjs`
- Modify: `.agents/skills/explainer-kit/tests/qa.test.mjs`

**Step 1:** Implement floor evaluation against built artifacts: narrative
coverage against the floor entry's `requiredNarrative`, diagram presence
(inline or standalone), structured-block depth signals, and
rejected/over-limit expansion proposals. Emit stable warning identifiers as
strings suitable for the existing manifest `warnings[]` array; the checker
never blocks. Run-stage wiring is p06-t02.

**Step 2: Verify**
Run: `node --test .agents/skills/explainer-kit/tests/qa.test.mjs`
Expected: floor-miss fixtures produce the expected warning ids; rich fixtures
produce none; over-limit proposal fixture yields its warning id.

**Step 3: Commit**

```bash
git add .agents/skills/explainer-kit/scripts/lib/qa.mjs .agents/skills/explainer-kit/tests/qa.test.mjs
git commit -m "feat(p05-t01): guideline checker emits floor warnings"
```

### Task p05-t02: Render QA probe battery

**Files:**

- Modify: `.agents/skills/explainer-kit/scripts/lib/qa.mjs`
- Modify: `.agents/skills/explainer-kit/scripts/render-qa.mjs`
- Modify: `.agents/skills/explainer-kit/tests/qa.test.mjs`

**Step 1:** Extend the existing `browserProbe` seam into a first-class stage:
serve the built site dir, load each artifact, run the layout-probe battery
(document/inner-container overflow, viewport clipping, heading readability)
with animations disabled. Findings become warning IDs. When no headless
runtime is available, record the single stable skip warning and continue.

**Step 2: Verify**
Run: `node --test .agents/skills/explainer-kit/tests/qa.test.mjs`
Expected: seeded-defect fixtures (clipped diagram, overflowing table) produce
render-QA warnings under an injected probe; absent-probe path records the
skip warning.

**Step 3: Commit**

```bash
git add .agents/skills/explainer-kit/scripts/lib/qa.mjs .agents/skills/explainer-kit/scripts/render-qa.mjs .agents/skills/explainer-kit/tests/qa.test.mjs
git commit -m "feat(p05-t02): render QA probe battery with graceful skip"
```

## Phase 6: Pipeline integration and v1 retirement

### Task p05-t02a: Viewport clipping must not flag paged deck slides (corrective)

Inserted after Phase 6, when the release visual gate surfaced the defect.
p05-t02 introduced viewport-clipping detection, which did not exist before it.
Its first real-Chromium run failed `validate-explainer-visuals.test.mjs` on
`profile-editorial-deck` at 320px, in both the default and no-js scenarios.

Bisected to `651aac80` (p05-t02): the gate passed at `b958bb86`, `97ef5349`,
`origin/main`, and `a75bcb32` (p05-t01), and failed only from p05-t02 onward.
The finding is a **false positive**, not a deck defect. `.deck` is
`display: flex; overflow-x: auto; scroll-snap-type: x mandatory`, so slides
after the first sit beyond the viewport **by design** and are reachable by
scroll, keyboard, and snap. The probe flagged any element whose rect exceeded
the viewport, which treats intentional horizontal paging as clipped content.

**Files:**

- Modify: `.agents/skills/explainer-kit/scripts/lib/qa.mjs`
- Modify: `tools/release/validate-explainer-visuals.test.mjs`

**Step 1:** Exempt elements that live inside a horizontally scrollable
ancestor (`overflow-x: auto|scroll` with `scrollWidth > clientWidth`) from the
viewport-clipping check. Genuine clipping is still caught: the separate
`clippedX` check covers `overflow: hidden|clip` ancestors, and content
positioned past the viewport with no scrollable ancestor still reports.

**Step 2:** Add a real-Chromium regression test pinning all three cases —
paged slides exempt, overflow-hidden clipping reported, absolutely positioned
off-viewport content reported. Exempting reachable content must never become
blindness to unreachable content.

**Step 3: Verify**
Run: `node --test tools/release/*.test.mjs` and the core suite.
Expected: release 41/41, core 199/199. The regression test must fail when the
exemption is reverted — confirmed: 2 failures without it, 0 with it.

### Task p05-t02b: Animation probe must accept suppressed motion (corrective)

Inserted during Phase 8, when p08-t02's `pnpm release:validate` ran the full
visual matrix for the first time. p05-t02 introduced the `animations-enabled`
probe, which did not exist before it (`rg animations-enabled` is empty at
`origin/main` and at `a75bcb32`, and first appears in `651aac80`).

`pnpm release:validate:visual` failed with six `animations-enabled` issues
covering **every** `explainer`-type artifact — `profile-clean-explainer`,
`profile-editorial-explainer`, and `profile-technical-explainer` at both probed
widths. Hub, diagram, and deck artifacts passed. Reproduced identically at the
untouched phase base `c3e25d31`, so it predates Phase 8 but is owned by this
project.

The finding is a **false positive**. Only `engineer-tour.html` — the explainer
template — carries a `@media (prefers-reduced-motion: reduce)` block setting
`transition-duration: 0.01ms !important`, and that block is unchanged from
`origin/main`. The probe runs under `reducedMotion: 'reduce'`, so the block
applies. Instrumenting a real Chromium run showed all 37 elements reporting
`animationName: none`, `animationDuration: 0s`, and
`transitionDuration: 1e-05s`: no motion is running, and the artifact is
_honoring_ reduced motion using the conventional 0.01ms idiom (chosen so
`transitionend` still fires). The probe required durations to be exactly `0`
and so read that compliance as a defect. Note the real-Chromium probe applies
only `reducedMotion: 'reduce'`; it never applies the request's `injectedCss`
animation reset, so nothing overrides the template.

**Files:**

- Modify: `.agents/skills/explainer-kit/scripts/lib/qa.mjs`
- Modify: `tools/release/validate-explainer-visuals.test.mjs`

**Step 1:** Treat sub-millisecond durations as suppressed rather than active.
`animationsDisabled` requires `animationName === 'none'` and every duration
below a `PERCEPTIBLE_SECONDS` threshold of `0.001`. Perceptible motion is still
caught: any duration at or above 1ms reports, as does any running keyframe
animation.

**Step 2:** Add a real-Chromium regression test pinning all three cases — the
0.01ms reduced-motion idiom accepted, a 180ms transition reported, and a
running keyframe animation reported. Accepting suppressed motion must never
become blindness to motion a reader would actually see.

**Step 3: Verify**
Run: `node --test tools/release/*.test.mjs`, the core suite, and
`pnpm release:validate:visual`.
Expected: release 43 pass / 1 skip, core 207/207, and the visual matrix
`valid: true` across all 65 measurements. The regression test must fail when
the threshold is reverted to `=== 0` — confirmed: 1 failure without it, 0 with
it.

**Step 4: Commit**

```bash
git add .agents/skills/explainer-kit/scripts/lib/qa.mjs \
  tools/release/validate-explainer-visuals.test.mjs
git commit -m "fix(p05-t02b): animation probe accepts suppressed reduced motion"
```

### Task p06-t01: Relocate the approval gate after render and QA

**Files:**

- Modify: `.agents/skills/explainer-kit/scripts/run.mjs`
- Modify: `.agents/skills/explainer-kit/scripts/lib/records.mjs`
- Modify: `.agents/skills/explainer-kit/tests/records.test.mjs`
- Modify: `.agents/skills/explainer-kit/tests/run.integration.test.mjs`

**Step 1:** Implement D4 as a standalone, behavior-preserving reordering
while the v1 content model is still in place, so this commit is independently
green. Today approval resolves before theme and render
(`run.mjs:112-191`) and the resume predicate requires `theme` pending
(`:225-230`). Move theme, render, safety validation, and the QA stage ahead
of `resolveContentApproval`, leaving approval immediately before publish and
durability.

**Step 2:** Update the dependent machinery. The resume predicate must key on
an **unresolved approval state — `pending` or `rejected` — plus completed
render/QA stages**, not `pending` alone. The existing workflow deliberately
resumes rejected records too: a rejection is persisted, the operator edits
the content, and a later approval resumes the same run
(`run.integration.test.mjs:179-223`), and `loadResumableRun` evaluates
persisted state before the new approval decision is processed. Keying on
`pending` alone would silently delete that correction loop. The build record
shows render stages passed at an interactive pause.

**Step 3:** Make the rejected-resume path safe, not just reachable. That loop
edits the source _after_ the rejection and asserts the corrected source
reaches the rendered artifact (`run.integration.test.mjs:179-238`), but render
and QA already completed before the pause and build-record stages are terminal
once `passed`/`warned` (`records.mjs:18-23`, `:84-101`). A literal
implementation would otherwise publish the pre-edit render, throw when
`executeStage` re-runs, or bypass the record and keep stale safety evidence.
Add a narrowly guarded record-level reopen/reset API to `records.mjs` and have
rejected resume reopen and re-run render plus QA against the edited sources
before approval is processed, leaving an auditable trail. A direct, unedited
pending→approve resume may hydrate the already-validated render.

**Step 4:** Re-express the existing `run.integration.test.mjs:141-178`
assertions. The meaningful invariant is that **nothing is published or
persisted externally** before approval, so the `publish` and `durability`
call-count assertions stay exactly as they are, while the
`theme.resolved.json`/`site/` absence assertions are replaced by assertions
that rendered output **is** present at the pause.

**Step 5: Verify**
Run: `node --test .agents/skills/explainer-kit/tests/*.test.mjs`
Expected: full core suite green; an interactive run pauses with rendered
artifacts on disk and zero publish/durability calls; direct pending→approve
resume completes the run; the reject → edit → approve → same-run resume loop
works end-to-end with the edited source reflected in the re-rendered artifact;
and a correction that newly fails QA updates the build record while keeping
publish and durability at zero calls.

**Step 6: Commit**

```bash
git add .agents/skills/explainer-kit/scripts/run.mjs .agents/skills/explainer-kit/scripts/lib/records.mjs .agents/skills/explainer-kit/tests/records.test.mjs .agents/skills/explainer-kit/tests/run.integration.test.mjs
git commit -m "refactor(p06-t01): approval gate moves after render and QA with guarded stage reopen"
```

### Task p06-t02: Author stage wiring and QA severity split

**Files:**

- Modify: `.agents/skills/explainer-kit/scripts/run.mjs`
- Delete: `.agents/skills/explainer-kit/schemas/author-request.schema.json`
- Delete: `.agents/skills/explainer-kit/schemas/author-result.schema.json`
- Modify: `.agents/skills/explainer-kit/scripts/lib/contracts.mjs`
- Modify: `.agents/skills/explainer-kit/scripts/lib/content-approval.mjs`
- Modify: `.agents/skills/explainer-kit/tests/contracts.test.mjs`
- Modify: `.agents/skills/explainer-kit/tests/content-approval.test.mjs`
- Modify: `.agents/skills/explainer-kit/tests/schemas.test.mjs`
- Modify: `.agents/skills/explainer-kit/tests/run.integration.test.mjs`
- Modify: `.agents/skills/explainer-kit/tests/records.test.mjs`

**Step 1:** Replace `createContentModel`'s joined-claims summary with the
author stage: construct `author-request/v2` per floor artifact (brief
inlined, `requiredNarrative` in `floor`, shell/theme attached for html
authoring), invoke the author callback, run the expansion protocol (validate
`proposedArtifacts` against declared profiles and caps, issue per-artifact
requests for accepted proposals), and persist authored content as the real
render input (`source/content/<artifact>.md` or `.html` — now load-bearing,
still hash-pinned). Route rendering by the floor/profile `authoring` value
(markdown → narrative renderer; html → `html-safety.mjs`). Link accepted
expansion artifacts from the floor hub via `artifactLinks`.

**Carry-forward from p01-t02a and p03-t02 — do not miss this.** The render
stage calls a `renderDescriptor()` helper in `run.mjs` that narrows floor
entries to exactly `{id, type, template, required}`. It predates `origin` and
strips it. p03-t02 made `assertRecipeArtifact` accept both that legacy shape
and the five-key `origin` form, so the stripped descriptor still validates —
which means a missed update here fails **silently**, handing expansion
artifacts the floor path instead of the D1 `{artifactId}/index.html` path,
with no error and no failing test. Widen `renderDescriptor()` to pass `origin`
through, and assert the resulting expansion path in this task rather than
relying on the transitional fallback.

**Step 2:** Make the variable artifact set survive an interactive pause per
D8, activating complete-set writes here — atomically with the author stage
that first makes them satisfiable. The author stage populates the
`content-approval/v2` `artifacts[]` field (shape defined in p01-t05) with
every floor and accepted expansion artifact —
`{artifactId, origin, profileId?, authoring, contentPath, authorResultPath}`
— written for pending and rejected states too, and the completeness
assertions land in this task. Resume hydration
(`run.mjs:261-294`), which today reads paths only from the approval record
and iterates recipe artifacts, instead rehydrates the set from that record so
the author is never re-invoked and expansion identities, source paths,
provenance, and hub links are stable across the pause.

**Step 3:** Split QA severity. Today `run.mjs:180-187` throws `E_QA` whenever
`auditArtifactSet().valid` is false, so nothing can degrade. Partition the
report: safety and provenance violations (unsafe DOM, raw HTML passthrough,
source-copying, link policy) keep throwing `E_QA`; editorial and layout
findings from p05 — including the no-headless-runtime skip — append their
stable IDs to `state.warnings` and let the run succeed.

**Step 4:** Retire the v1 author contracts atomically with their consumers.
Delete the two v1 schema files and their `contracts.mjs` registrations, and
migrate the tests that assert or construct them in the **same commit**:
`schemas.test.mjs:21-22` (asserts the v1 author schemas) and
`run.integration.test.mjs:68-89` (constructs v1 author results). The author
callback is required in **both** modes, since synthetic content models are
gone: runs without one fail with `E_AUTHOR_REQUIRED`. Interactive runs pause
at the relocated gate with rendered drafts + warnings as the review surface;
unattended runs auto-approve with `auto-drafted` marking.

**Step 5: Verify**
Run: `node --test .agents/skills/explainer-kit/tests/*.test.mjs`
Expected: full core suite passes; run fixtures produce authored, rendered,
validated artifacts end-to-end, including an accepted-expansion fixture and a
rejected-proposal fixture. Run-integration assertions confirm a successful
manifest carries editorial/layout warning IDs in `warnings[]` in **both**
modes and that warnings are visible at the interactive pause, while a
safety-violation fixture still fails `E_QA`. An interactive run carrying both
markdown and html expansions can pause, reject, edit, resume, and finish with
identical artifact IDs, paths, hub links, hashes, and a complete
`authorResultPaths` set without re-invoking the author.

**Step 6: Commit**

```bash
git add .agents/skills/explainer-kit/scripts/run.mjs .agents/skills/explainer-kit/schemas .agents/skills/explainer-kit/scripts/lib/contracts.mjs .agents/skills/explainer-kit/tests
git commit -m "feat(p06-t02): author stage feeds both render paths; QA severity split; v1 author contracts retired"
```

### Task p06-t03: Marking surfacing through core and adapter results

**Files:**

- Modify: `.agents/skills/explainer-kit/scripts/run.mjs` (`resultFor`)
- Modify: `.agents/skills/explainer-kit/scripts/lib/records.mjs`
- Modify: `.agents/skills/oat-explainer-kit/scripts/run.mjs`
- Modify: `.agents/skills/oat-explainer-kit/scripts/resolve-intent.mjs`
- Modify: `.agents/skills/explainer-kit/tests/records.test.mjs`
- Modify: `.agents/skills/explainer-kit/tests/run.integration.test.mjs`
- Modify: `.agents/skills/oat-explainer-kit/tests/run.integration.test.mjs`

**Step 1:** Surface the approval marking through the run result, not the
manifest (B1). The run result is assembled by `resultFor` in
`explainer-kit/scripts/run.mjs:823-845`, which currently returns approval
status and path only — `records.mjs` alone cannot add the marking, so the
core runner is in scope here.

**Step 2:** Adapter integration: pass briefs and the author callback through
to the core, require the author callback in **both** modes (extending the
current unattended-only `E_AUTHOR_REQUIRED` check at
`oat-explainer-kit/scripts/run.mjs:168-175`), and have the automated
completion chain invoke recap with `mode: unattended` unconditionally.

**Step 3: Verify**
Run: `node --test .agents/skills/explainer-kit/tests/*.test.mjs .agents/skills/oat-explainer-kit/tests/*.test.mjs`
Expected: core and adapter results both expose `auto-drafted` for unattended
and `human-approved` for interactive approval; manifests validate unchanged
against `manifest/v1` and carry no marking property; an interactive adapter
call without an author callback now fails `E_AUTHOR_REQUIRED`.

**Step 4: Commit**

```bash
git add .agents/skills/explainer-kit/scripts .agents/skills/explainer-kit/tests .agents/skills/oat-explainer-kit/scripts .agents/skills/oat-explainer-kit/tests
git commit -m "feat(p06-t03): marking in core+adapter results; author callback required in both modes"
```

### Task p06-t04: Retire recipe v1 and migrate all remaining consumers

**Files:**

- Modify: `.agents/skills/explainer-kit/scripts/lib/recipes.mjs` (drop the v1 branch)
- Modify: `.agents/skills/explainer-kit/SKILL.md` (version → 2.0.0)
- Modify: `.agents/skills/oat-explainer-kit/SKILL.md` (PR-scoped bump + minimum-core prose)
- Modify: `.agents/skills/oat-explainer-kit/scripts/run.mjs` (minimum core version)
- Modify: `.agents/skills/oat-explainer-kit/tests/run.integration.test.mjs` (1.x rejection coverage)
- Modify: `.agents/skills/oat-wave-execute/SKILL.md`
- Modify: `.agents/skills/oat-wave-program/SKILL.md`
- Modify: `tools/smoke/explainer-kit/wrapper-compatibility.test.mjs`
- Modify: `tools/smoke/explainer-kit/packaged-layout.test.mjs`
- Modify: `tools/smoke/explainer-kit/fixtures/package-root.mjs`
- Modify: `tools/release/build-explainer-rc.test.mjs`
- Modify: `tools/release/run-explainer-rc.test.mjs`
- Modify: `tools/release/validate-explainer-acceptance.test.mjs`

**Step 1:** With all four bundled recipes on v2 and every reader on the
accessors, remove the dual-version v1 branch from `recipes.mjs` so
`explainer-kit.recipe/v1` is retired in the same release.

**Step 2:** Migrate the recipe **schema-version** fixtures, which are a
distinct surface from the `{id, version: "1"}` identity pins that B2 leaves
alone. `build-explainer-rc.mjs:203-221` copies the schema version into RC
identity, so these must move together: `build-explainer-rc.test.mjs:309-317`,
`run-explainer-rc.test.mjs:406`,
`validate-explainer-acceptance.test.mjs:366`, and
`tools/smoke/explainer-kit/fixtures/package-root.mjs:195`.

**Step 3:** Update both wave skills' author guidance. `oat-wave-program`
carries stale "authoring seam pending upstream" prose around lines 140-149
that a literal v1-string search will not surface; refresh it and
`oat-wave-execute` while **preserving** their `{id, version: "1"}` recipe
identity pins.

**Step 4:** Move the entire 2.0.0 compatibility boundary into this one task so
no intermediate commit is self-rejecting. Raising the adapter minimum while
the core is still `1.0.2` would make the source adapter reject the source
core until p08-t02, so all of the following land together: bump
`explainer-kit/SKILL.md` to `2.0.0`; apply the adapter's single PR-scoped
bump; raise the minimum in `oat-explainer-kit/scripts/run.mjs:15-45` **and**
the shipped prose that still claims `1.0.0` (`oat-explainer-kit/SKILL.md:36`,
`:57`); and add adapter rejection coverage for a 1.x core.

**Step 5:** Update the smoke assertions that pin the old versions —
`wrapper-compatibility.test.mjs:194-195` (`1.0.2`/`1.0.1`) and
`packaged-layout.test.mjs:60` (`installedVersion` `1.0.2`) and `:87` (the
`1.0.2` → `0.9.0` incompatible fixture). Root `pnpm test` always runs
`pnpm test:smoke` (`package.json:32-33`), so leaving these stale would
guarantee a red final task. Prefer reading the expected versions from the
packaged candidate rather than re-hard-coding literals; keep an explicit
literal only where the fixture deliberately constructs an incompatible
version.

**Step 6:** Refresh provider views (`oat sync --scope all`).

**Step 7: Verify**
Run: `rg -n "author-request/v1|author-result/v1|explainer-kit\.recipe/v1" .agents tools apps packages --glob '!packages/cli/assets/**' | wc -l` then `node --test .agents/skills/explainer-kit/tests/*.test.mjs .agents/skills/oat-explainer-kit/tests/*.test.mjs && pnpm test:smoke && node --test tools/release/*.test.*`
Expected: zero remaining v1 author-contract or recipe-schema references
outside the generated assets tree; core, adapter, smoke, and release-tooling
suites pass; a 1.x core is rejected by the adapter and a 2.0.0 core is
accepted.

**Step 8: Commit**

```bash
git add .agents/skills tools .oat/sync/manifest.json .claude .cursor .codex
git commit -m "feat(p06-t04): retire recipe v1, migrate fixtures, land the 2.0.0 compatibility boundary"
```

## Phase 7: End-to-end anti-regression fixture

### Task p07-t01: Recap anti-regression fixture

**Files:**

- Create: `.agents/skills/explainer-kit/tests/e2e-recap.test.mjs`
- Modify: `.agents/skills/explainer-kit/examples/project-recap/` (fixture set updated for v2)

**Step 1:** Build a completed-project fact base + author fixture (modeled on
the in5-game-cms evidence) and assert the rendered narrative hub contains
structured blocks: ≥1 table, ≥1 inline diagram SVG, lists, and section
anchors — the direct anti-regression for the original complaint. Include an
expansion case (author proposes two `deep-dive` pages and a
`supporting-diagram` by profile ID) asserting **distinct** content paths,
rendered paths, and manifest identities per D1, plus hub links to each.
Include failure cases: unknown profile → hard error; over-cap proposal →
warning. Assert manifest warnings are empty for the rich fixture and
populated for a thin one.

**Step 2: Verify**
Run: `node --test .agents/skills/explainer-kit/tests/e2e-recap.test.mjs`
Expected: rich fixture renders rich with distinctly-pathed linked expansion
artifacts; thin fixture ships with floor warnings; malformed proposals fail
loudly.

**Step 3: Commit**

```bash
git add .agents/skills/explainer-kit/tests/e2e-recap.test.mjs .agents/skills/explainer-kit/examples
git commit -m "test(p07-t01): recap richness and expansion anti-regression fixture"
```

## Phase 8: Documentation and release closure

### Task p08-t01: Docs and skill guidance updates

**Files:**

- Modify: `apps/oat-docs/docs/` (explainer-kit pages: authoring model, briefs, warnings, marking)
- Modify: `.agents/skills/explainer-kit/SKILL.md` (authoring model description; version bump landed in p06-t04)

**Step 1:** Update the docs surface: two-path authoring model, brief
authoring guidance, floor/expansion-profile recipe semantics and the
expansion protocol, the relocated approval gate, warning taxonomy and the QA
severity split, auto-drafted marking, render QA behavior. Regenerate the docs
index if nav changed (`oat docs generate-index`).

**Step 2: Verify**
Run: `pnpm build:docs`
Expected: docs build passes with updated pages.

**Step 3: Commit**

```bash
git add apps/oat-docs .agents/skills/explainer-kit/SKILL.md
git commit -m "docs(p08-t01): explainer authoring v2 documentation"
```

### Task p08-t02: Provider sync, version bumps, release validation (final task)

**Files:**

- Modify: `.agents/skills/oat-wave-execute/SKILL.md` (single PR-scoped bump)
- Modify: `.agents/skills/oat-wave-program/SKILL.md` (single PR-scoped bump)
- Modify: `.agents/skills/oat-project-complete/SKILL.md` (single PR-scoped bump)
- Modify: `.agents/skills/oat-project-implement/SKILL.md` (single PR-scoped bump)
- Modify: `packages/*/package.json` (the five lockstep public packages)
- Modify: `.claude/`, `.cursor/`, `.codex/`, `.oat/sync/manifest.json` (regenerated views)

**Step 1:** As the final task, after all shipped skill/docs edits exist,
apply the remaining PR-scoped version bumps: `oat-wave-execute`,
`oat-wave-program`, `oat-project-complete`, and `oat-project-implement`.
`explainer-kit` (2.0.0) and `oat-explainer-kit` were already bumped in
p06-t04, where they had to land atomically with the adapter's minimum-core
floor; they are **not** bumped again here, preserving exactly one bump per
changed skill in the final PR diff. Bump the five lockstep public packages
(bundled assets count as shipped CLI functionality per the repo guardrail).

**Step 2:** Re-run `oat sync --scope all` **after** the p08-t01 and Step 1
canonical edits. The p06-t04 sync predates them, so without this pass the
provider-linked views ship stale. Stage the regenerated views and manifest.

**Step 3: Verify**
Run: `pnpm release:validate && pnpm lint && pnpm type-check && pnpm test`
Expected: release dry-run and full repo checks pass against the complete
tree — no shipped edits follow this task. `pnpm build` regenerates
`packages/cli/assets/skills/` from canonical sources as part of validation,
and provider views are current.

**Step 4: Commit**

```bash
git add .agents/skills packages .claude .cursor .codex .oat/sync/manifest.json
git commit -m "chore(p08-t02): provider sync, lockstep version bumps, release validation"
```

## Parallelism

Phase 1 is the contract foundation and runs first. Its ordering is
load-bearing: the dual-version loader and accessors (p01-t02) keep every
later commit executable while recipes change shape, and briefs (p01-t03)
precede the v2 recipes (p01-t04) because those recipes' `briefRef`s must
resolve at validation time.

After Phase 1 lands, **p02, p03, and p04 have disjoint write sets**:

- p02 — `oat-project-complete/SKILL.md`,
  `oat-project-implement/references/completion-and-closeout.md`, and the
  `oat-explainer-kit` skill/references/completion test
- p03 — `scripts/lib/{markdown,diagram,render}.mjs`, `house-style.html`, and
  `tests/{markdown,diagram,narrative-render}.test.mjs`
- p04 — `scripts/lib/html-safety.mjs`, the three shell templates, and
  `tests/{html-safety,templates}.test.mjs`

p03 owns `render.mjs` and `narrative-render.test.mjs` across both its tasks;
p04 owns `templates.test.mjs`. No file appears in two groups.

p05 (guideline checker + render QA) touches `qa.mjs`, which reads outputs
from both render paths, so it follows the group. Phase 6 is strictly
sequential and rewires `run.mjs` in three passes that are each independently
green — gate relocation, then the author stage and v1 author retirement, then
marking — before p06-t04 retires recipe v1, migrates the release/smoke
fixture surface, and lands the whole 2.0.0 compatibility boundary (core
version, adapter minimum, and the smoke assertions that pin them) in one
commit so no intermediate state is self-rejecting. p07 (e2e fixture) and p08
(docs, then remaining bumps + sync + release closure) follow.

## Phase rev1: Final review fixes

Fix tasks from the `final` code review
(`reviews/archived/final-review-2026-07-26T155422Z.md`): 7 Important and
3 Medium findings, all independently reproduced at the root before conversion.
Ordered so that safety lands first, QA correctness before the warning plumbing
that depends on it, and lifecycle bookkeeping last so it records final state.

Verification note: `node --test` requires glob patterns in this repo, never a
bare directory. Every task must leave core, adapter, smoke, and release suites
green — the narrow core+adapter verification used during Phases 1-7 is what let
these findings escape.

### Task prev1-t01: (review) Close the active-content URL policy gap

**Files:**

- Modify: `.agents/skills/explainer-kit/scripts/lib/html-safety.mjs`
- Modify: `.agents/skills/explainer-kit/scripts/lib/qa.mjs`
- Modify: `.agents/skills/explainer-kit/tests/html-safety.test.mjs`

**Step 1: Understand the issue**

Review finding I2, `html-safety.mjs:522`. `isUnsafeUrl` computes
`isExternal = /^(?:https?:)?\/\//` and returns `false` for everything that is
not external **before** reaching the form-submission and resource checks.
Confirmed consequence: `form action="mailto:..."`, relative `action`,
relative `formaction`, and relative `image`/`use` references all pass the hard
validator. The secondary QA regex only matches a subset of quoted `src`
attributes and does not cover SVG `href` (`qa.mjs:19`). This defeats the
self-contained / no-external-active-content hard boundary.

**Step 2: Implement fix**

Apply scheme-aware policy before the external-URL early return. Reject form
submission targets outright regardless of scheme (or drop form controls from
the allowlist entirely — prefer this if no bundled shell needs forms). Require
resource elements to reference only inline `data:` payloads on the existing
allowlist or same-document `#fragment` references. Keep this a hard error, not
a warning: it is a safety boundary, not a guideline.

**Step 3: Verify**

Add cases for `mailto:` action, relative action, relative `formaction`,
unquoted attribute values, SVG `<image href>`, SVG `<use href>`, and
`srcset`. Run: `node --test .agents/skills/explainer-kit/tests/*.test.mjs`
then `pnpm test:smoke`.
Expected: new cases rejected; existing artistic fixtures still pass.

**Step 4: Commit**

```bash
git add .agents/skills/explainer-kit/scripts/lib .agents/skills/explainer-kit/tests
git commit -m "fix(prev1-t01): reject non-http active content and unpinned resources"
```

### Task prev1-t02: (review) Repair the three remaining probe misclassifications

**Files:**

- Modify: `.agents/skills/explainer-kit/scripts/lib/qa.mjs`
- Modify: `tools/release/validate-explainer-visuals.test.mjs`

**Step 1: Understand the issue**

Review finding I4. Three defects, all reproduced in real Chromium at the root:

1. **Scroll exemption overreaches** (`qa.mjs:215`). The `p05-t02a` fix exempts
   every descendant of a horizontally scrollable ancestor. Verified: a
   `position:absolute; left:-400px` element inside a scroller whose scroll
   range is 0-320 is **not** flagged, though scrolling can never reveal it.
   The exemption must test reachability, not mere ancestry.
2. **Hidden headings flagged** (`qa.mjs:240`). Verified: an `<h2>` inside
   `aria-hidden="true"; display:none` reports as unreadable. Screen-reader-only
   headings correctly pass, so only the hidden-panel case is wrong.
3. **Pseudo-element motion missed** (`qa.mjs:259`). Verified: a running
   `::before` keyframe animation yields `animationsDisabled: true`. The probe
   reads element styles only.

**Step 2: Implement fix**

For (1) compute whether an off-viewport element falls within the ancestor's
actual scroll range (`scrollLeft` extent), and keep flagging it when it does
not. For (2) skip elements that are not rendered or are `aria-hidden`, while
continuing to exempt visually-hidden accessibility text as today. For (3)
inspect `::before` and `::after` computed styles alongside the element.

**Step 3: Verify**

Extend the real-Chromium regression test with all three cases plus the two
existing p05-t02a/p05-t02b boundaries. Each new assertion must fail without
its fix — verify by reverting locally, as was done for the prior two probe
correctives. Run: `node --test tools/release/*.test.mjs` and
`pnpm release:validate`.
Expected: release suite green; visual matrix still `valid: true`.

**Step 4: Commit**

```bash
git add .agents/skills/explainer-kit/scripts/lib/qa.mjs tools/release
git commit -m "fix(prev1-t02): probe reachability, hidden headings, pseudo-element motion"
```

### Task prev1-t03: (review) Propagate render degradation warnings to the manifest

**Files:**

- Modify: `.agents/skills/explainer-kit/scripts/run.mjs`
- Modify: `.agents/skills/explainer-kit/tests/e2e-recap.test.mjs`

**Step 1: Understand the issue**

Review finding I5, `run.mjs:182`. `renderArtifact` returns section warnings
(`render.mjs:88`) covering unsupported diagram grammar, heading-depth jumps,
and escaped raw HTML. `executeRenderStage` pushes `rendered` into
`state.rendered` and `state.artifacts` but never reads `rendered.warnings` —
confirmed: no `rendered.warnings` consumption exists anywhere in `run.mjs`.
D7's degradation warning is therefore computed and silently discarded.

**Step 2: Implement fix**

Aggregate `rendered.warnings` into the render stage result and `state.warnings`,
deduplicated, so they reach both the run result and the manifest. Keep them
warnings — this is guideline/style severity, not a hard error.

**Step 3: Verify**

Add end-to-end assertions that a `sequenceDiagram` fence surfaces the
unsupported-diagram warning in `result.warnings` **and** `manifest.warnings`,
plus cases for a heading-depth jump and escaped raw HTML.
Run: `node --test .agents/skills/explainer-kit/tests/*.test.mjs`.
Expected: warnings present; the rich fixture's empty-warning assertion still
holds.

**Step 4: Commit**

```bash
git add .agents/skills/explainer-kit/scripts/run.mjs .agents/skills/explainer-kit/tests
git commit -m "fix(prev1-t03): render degradation warnings reach result and manifest"
```

### Task prev1-t04: (review) Collapse the duplicate `qa-*` warning vocabulary

**Files:**

- Modify: `.agents/skills/explainer-kit/scripts/run.mjs`
- Modify: `.agents/skills/explainer-kit/tests/render-qa.test.mjs`

**Step 1: Understand the issue**

Review finding M3, `run.mjs:252`. After mapping browser codes through
`renderQaWarningIds`, the runner also prefixes every non-`viewport-*` warning
as `qa-*`. Inner overflow, heading readability, motion, keyboard, theme, and
deck-layout findings therefore emit two vocabularies, contradicting the
documented stable IDs.

**Step 2: Implement fix**

Exclude all mapped browser codes from the generic structural `qa-*` conversion,
so each browser finding emits exactly one stable `render-qa-*` ID.

**Step 3: Verify**

Assert the exact manifest warning set for an injected browser defect.
Run: `node --test .agents/skills/explainer-kit/tests/*.test.mjs`.
Expected: one stable ID per finding, no `qa-*` duplicates.

**Step 4: Commit**

```bash
git add .agents/skills/explainer-kit/scripts/run.mjs .agents/skills/explainer-kit/tests
git commit -m "fix(prev1-t04): emit one stable render-qa warning id per finding"
```

### Task prev1-t05: (review) Establish a provenance trust boundary

**Files:**

- Modify: `.agents/skills/explainer-kit/scripts/run.mjs`
- Modify: `.agents/skills/explainer-kit/schemas/author-result.v2.schema.json`
- Modify: `.agents/skills/explainer-kit/tests/author.test.mjs`

**Step 1: Understand the issue**

Review finding I6, `run.mjs:885`. The v2 schema accepts arbitrary `authorId`,
`generatedAt`, and `method` from the callback; the runner validates shape,
artifact identity, and content path, then retains and hash-pins the claim. A
callback can impersonate another author or backdate generation. Immutable
hashing then proves only that the spoofed claim was retained faithfully — it
proves nothing about authenticity, which the design treats as a hard invariant.

**Step 2: Implement fix**

Bind author identity and method through trusted caller configuration, and stamp
or verify `generatedAt` in the core using the injected clock rather than the
callback's value. Treat callback-supplied provenance as untrusted metadata
unless it matches trusted context; a mismatch stays a hard error.

**Step 3: Verify**

Add tests for a spoofed `authorId`, a backdated `generatedAt`, and the
matching-context happy path.
Run: `node --test .agents/skills/explainer-kit/tests/*.test.mjs` and
`node --test .agents/skills/oat-explainer-kit/tests/*.test.mjs`, then
`pnpm test:smoke` (smoke fixtures assert provenance shape).
Expected: spoofing rejected; smoke fixtures updated if the trusted shape moves.

**Step 4: Commit**

```bash
git add .agents/skills/explainer-kit .agents/skills/oat-explainer-kit tools/smoke
git commit -m "fix(prev1-t05): bind author provenance to trusted caller context"
```

### Task prev1-t06: (review) Give render QA a real runtime seam

**Files:**

- Modify: `.agents/skills/explainer-kit/scripts/run.mjs`
- Modify: `.agents/skills/oat-explainer-kit/scripts/run.mjs`
- Modify: `.agents/skills/explainer-kit/tests/render-qa.test.mjs`

**Step 1: Understand the issue**

Review finding I3, `run.mjs:236`. Browser probes run only when a caller injects
`options.browserProbe`; otherwise the run always records
`render-qa-skipped-no-headless-runtime`. Confirmed: the core CLI accepts
author/critic/publish/durability module paths but no probe module, and the
adapter ships no runtime. The documented first-class stage is injection-only,
so it is skipped on every normal CLI and lifecycle run even where Chromium is
installed.

**Step 2: Implement fix**

Expose a probe-runtime seam across the core and adapter invocation boundary
(module path plus resolution of a supported headless runtime). Attempt launch
on normal runs and emit the skip warning only after real capability detection
fails, so the warning means "no runtime available" rather than "nobody injected
one".

**Step 3: Verify**

Cover: runtime resolved and probes run; runtime genuinely absent yields exactly
the skip warning; injected probe still honored for tests.
Run: all four suites plus `pnpm release:validate`.
Expected: lifecycle runs exercise QA when a runtime exists.

**Step 4: Commit**

```bash
git add .agents/skills/explainer-kit .agents/skills/oat-explainer-kit
git commit -m "fix(prev1-t06): resolve a headless runtime for render qa on normal runs"
```

### Task prev1-t07: (review) Prove autonomous authoring produces rich output

**Files:**

- Modify: `.agents/skills/oat-explainer-kit/scripts/run.mjs`
- Modify: `.agents/skills/oat-project-complete/SKILL.md`
- Modify: `.agents/skills/oat-explainer-kit/tests/completion.integration.test.mjs`

**Step 1: Understand the issue**

Review finding I1, `oat-project-complete/SKILL.md:284`. This is the finding
closest to the project's reason for existing. Both lifecycle callers only
instruct the executing agent in prose to "construct" a brief-aware author seam.
Confirmed: no shipped code implements `author-request/v2` — it appears only in
tests and documentation. The completion test regex-matches the prose, and the
anti-regression fixture feeds a checked-in rich Markdown file through
`richAuthor`. Together those prove the renderer **preserves** richness; nothing
demonstrates the pipeline **generates** it from project evidence, which is the
original "basic AF" failure mode.

**Step 2: Implement fix**

Ship either a concrete lifecycle author driver or a precise, testable
callback/module-materialization protocol that can answer iterative
`author-request/v2` calls from lifecycle evidence. Then add a behavioral
completion → adapter → core test (or a recorded eval) that starts from
lifecycle artifacts and demonstrates rich authored output with no prewritten
recap fixture.

Note the design tension to resolve explicitly rather than silently: the
"prose carries quality" premise deliberately makes the agent the author, so the
goal is a verifiable seam and an outcome check, not a hardcoded generator that
would reintroduce the rigidity this project removed. If the conclusion is that
the seam is correct as designed and only the verification is missing, record
that as artifact alignment in `design.md` and ship the outcome check.

**Step 3: Verify**

Run: `node --test .agents/skills/oat-explainer-kit/tests/*.test.mjs` and the
core suite; confirm the new test fails if the author returns thin content.
Expected: autonomous path demonstrably yields structured output.

**Step 4: Commit**

```bash
git add .agents/skills/oat-explainer-kit .agents/skills/oat-project-complete
git commit -m "fix(prev1-t07): verify autonomous authoring yields rich structure"
```

### Task prev1-t08: (review) Enforce declared `maxPerType` expansion caps

**Files:**

- Modify: `.agents/skills/explainer-kit/scripts/lib/recipes.mjs`
- Modify: `.agents/skills/explainer-kit/tests/recipes.test.mjs`

**Step 1: Understand the issue**

Review finding M1, `recipes.mjs:166`. Recipe validation accepts and validates
`expansion.limits.maxPerType` (`recipes.mjs:437`), but proposal evaluation
checks only per-profile `maxCount` and total `maxArtifacts`. A valid recipe can
declare a finite type cap that an author bypasses by spreading proposals across
profiles.

**Step 2: Implement fix**

Track accepted counts per artifact type and reject over-cap proposals with a
stable warning ID consistent with the existing expansion-limit vocabulary.

**Step 3: Verify**

Add synthetic dual-profile coverage where two profiles share one type and
together exceed `maxPerType`.
Run: `node --test .agents/skills/explainer-kit/tests/*.test.mjs`.
Expected: cap enforced; existing D5 assertions unchanged.

**Step 4: Commit**

```bash
git add .agents/skills/explainer-kit/scripts/lib/recipes.mjs .agents/skills/explainer-kit/tests
git commit -m "fix(prev1-t08): enforce per-type expansion caps"
```

### Task prev1-t09: (review) Preserve Markdown lead and reject duplicate section IDs

**Files:**

- Modify: `.agents/skills/explainer-kit/scripts/run.mjs`
- Modify: `.agents/skills/explainer-kit/tests/e2e-recap.test.mjs`

**Step 1: Understand the issue**

Review finding M2, `run.mjs:945`. When any `##` heading exists,
`markdownContentModel` slices from the first such heading onward, silently
discarding prose between the document title and the first section. Repeated
headings also produce duplicate slug IDs because the run never calls the
existing content-model duplicate validation. Both reduce author freedom — the
opposite of this project's intent — and duplicate IDs break navigation anchors.

**Step 2: Implement fix**

Parse the document once, preserve lead content as a rendered introduction, and
either reject or deterministically disambiguate duplicate generated section IDs
by calling the existing validation.

**Step 3: Verify**

Add full-run fixtures for lead-prose preservation and for repeated headings.
Run: `node --test .agents/skills/explainer-kit/tests/*.test.mjs`.
Expected: lead prose rendered; duplicate IDs handled deterministically.

**Step 4: Commit**

```bash
git add .agents/skills/explainer-kit/scripts/run.mjs .agents/skills/explainer-kit/tests
git commit -m "fix(prev1-t09): preserve markdown lead and disambiguate section ids"
```

### Task prev1-t10: (review) Align lifecycle artifacts with shipped state

**Files:**

- Modify: `.oat/projects/shared/explainer-authoring-redesign/implementation.md`
- Modify: `.oat/projects/shared/explainer-authoring-redesign/state.md`

**Step 1: Understand the issue**

Review finding I7. Artifact drift, not a code defect, but it makes closeout
state unreliable. Confirmed: `implementation.md` is still
`oat_status: in_progress`, uses `oat_current_task_id: complete` where the
contract expects `null`, and leaves the Final Summary as placeholders;
`state.md` frontmatter says complete while its body still reads
"Implementation in progress — Phase 1" and "0/20 tasks".

**Step 2: Implement fix**

Align both artifacts with actual phase, task counts (23 implementation tasks
plus these 10 review-fix tasks), verification results, review status, design
deltas, and the next boundary. Run this task **last** so it records the true
final state including the preceding nine fixes.

**Step 3: Verify**

Run: `oat project status --project-path .oat/projects/shared/explainer-authoring-redesign`
Expected: reported phase, task counts, and review status match the artifacts;
no placeholder text remains in the Final Summary.

**Step 4: Commit**

```bash
git add .oat/projects/shared/explainer-authoring-redesign
git commit -m "docs(prev1-t10): align lifecycle artifacts with shipped state"
```

## Reviews

| Scope | Type     | Status          | Date       | Artifact                                            |
| ----- | -------- | --------------- | ---------- | --------------------------------------------------- |
| plan  | artifact | fixes_completed | 2026-07-25 | reviews/artifact-plan-review-2026-07-25T183814Z.md  |
| plan  | artifact | fixes_completed | 2026-07-25 | reviews/artifact-plan-review-2026-07-25T190445Z.md  |
| plan  | artifact | fixes_completed | 2026-07-25 | reviews/artifact-plan-review-2026-07-25T191042Z.md  |
| plan  | artifact | fixes_completed | 2026-07-25 | reviews/artifact-plan-review-2026-07-25T194853Z.md  |
| plan  | artifact | fixes_completed | 2026-07-25 | reviews/artifact-plan-review-2026-07-25T202242Z.md  |
| plan  | artifact | fixes_completed | 2026-07-25 | reviews/artifact-plan-review-2026-07-25T204842Z.md  |
| final | code     | fixes_added     | 2026-07-26 | reviews/archived/final-review-2026-07-26T155422Z.md |
| final | code     | fixes_completed | 2026-07-26 | reviews/archived/final-review-2026-07-26T155422Z.md |

**Status values:** `pending` → `received` → `fixes_added` →
`fixes_completed` → `passed`

**Plan acceptance basis:** no review reached `passed`. After six cycles with
monotonically converging findings, each round's remediations verified closed by
the next, the operator ended the loop and accepted the plan on 2026-07-25 —
judging the remaining class of finding to be design-detail refinement better
resolved against real code than through further max-effort gate cycles. The
plan is therefore operator-accepted, not gate-passed; implementation proceeds
on that recorded decision.

**Final review acceptance basis:** the final code review's ten findings were all
implemented in Phase rev1, recorded above as `fixes_completed`. A re-review of
those eleven fix commits (structured output, no file artifact) verified six
findings resolved and returned `block` on eight new ones. The operator triaged
them against a single question — does this affect whether the kit produces good
explainers. Two were fixed: stale render/QA warnings surviving a corrected
resume, and an artifact that misdescribed commit `f257f96d`. Two dissolved when
automatic render QA was cut, since the unshipped browser driver and the
unrestricted probe-module import existed only to serve it. Four were dropped
rather than backlogged: two HTML-safety gaps unreachable while artifacts are
composed from hash-pinned shells, an anchor collision requiring an author to use
`overview`, `introduction`, and `lead` at once, a warning the pipeline already
re-adds, and the objection that autonomous prose richness is unproven by unit
test — which it cannot be, and which the rendered example answers instead. The
final review is therefore operator-accepted at `fixes_completed`, not
gate-passed, and the review loop was deliberately ended rather than continued.

## Implementation Complete

**Summary:**

- Phase 1: 5 tasks — author contracts v2, dual-version recipe loader, briefs,
  v2 recipes, approval marking
- Phase 2: 1 task — lifecycle caller author-callback wiring with contract tests
- Phase 3: 3 tasks — narrative renderer (markdown, blocks + paths, diagrams)
- Phase 4: 2 tasks — artistic path (hash-pinned safety validator, shells)
- Phase 5: 2 tasks — guideline checker + render QA
- Phase 6: 4 tasks — approval relocation, author stage + QA split, marking,
  recipe v1 retirement + fixture migration + 2.0.0 boundary
- Phase 7: 1 task — e2e anti-regression fixture
- Phase 8: 2 tasks — docs, then remaining bumps + sync + release validation
- Phase rev1: 10 tasks — final review fixes (7 Important, 3 Medium)

**Total: 30 planned tasks** (20 original + 10 review fixes; 23 implementation
tasks were actually executed, including correctives p01-t02a, p05-t02a, and
p05-t02b)

## References

- Discovery: `discovery.md`
- Design: `design.md` — decisions D1–D8 in "Resolved Interface Decisions"
- Plan reviews: `reviews/artifact-plan-review-2026-07-25T183814Z.md`,
  `...T190445Z.md`, `...T191042Z.md`, `...T194853Z.md`, `...T202242Z.md`,
  `...T204842Z.md`
- Root-cause evidence: live in5-game-cms recap; `author-result/v1` +
  `render.mjs` escaped single-paragraph rendering; write-only markdown
  content records
- Original editorial bar: `~/.agents/skills-backup/oat-explainer-kit-0.4.1/SKILL.md`
- **summary:** ---
  oat_status: complete
  oat_ready_for: null
  oat_blockers: []
  oat_last_updated: 2026-07-26
  oat_generated: true
  oat_summary_last_task: prev1-t10
  oat_summary_revision_count: 1
  oat_summary_includes_revisions: ['rev1']

---

# Summary: explainer-authoring-redesign

## Overview

A prior Explainer Kit revision abstracted authoring into fixed slots, so every
generated recap filled the same shapes and the output was structurally thin —
the complaint that opened this project was that a shipped recap was "basic AF"
despite the kit passing its own gates. The diagnosis was that editorial
expectations had been encoded into machine contracts: the schema described
shapes rather than quality, so an author satisfying it exactly still produced a
formulaic page, and tightening the schema made it worse.

This project rebuilt authoring on two per-artifact paths and moved quality
expectations out of schemas and into prose.

## What Was Implemented

Eight phases, 20 planned tasks plus three correctives, then a 10-task revision
phase, a final scope reduction, and four post-closeout rendering fixes. Shipped
as PR #179: 77 commits, 109 files, +14,379/−1,544 as of `ba84368f`.

- **Two authoring paths.** A narrative path promotes Markdown from provenance to
  actual renderer input, so tables, GFM-alert callouts, fenced timelines, and
  fenced diagrams render as structure instead of flattening to prose. An
  artistic path has the executing agent compose HTML from hash-pinned shells.
  Recipe policy selects the path through expansion profiles; the author does not.
- **`recipe/v2` replaces v1.** A dual-version loader carried both schemas
  through the middle of the project, and `p06-t04` then retired
  `explainer-kit.recipe/v1` at the 2.0.0 boundary. Bundled recipes and fixtures
  were migrated, and finite per-recipe and per-type expansion caps are enforced.
- **Guidelines degrade to warnings.** Floor-coverage misses emit
  `guideline-narrative-coverage-missing` rather than failing the run, while
  safety and provenance stay hard errors.
- **Approval moved after render and QA**, with the accepted artifact set
  persisted in `content-approval/v2` so a rejected draft resumes faithfully.
- **Provenance trust boundary.** Author identity and method bind through trusted
  caller configuration; the core stamps time from its injected clock and rejects
  author-asserted trust levels.
- **Render QA is opt-in** and never self-launching.
- **End-to-end anti-regression fixture** built on the shipped `project-recap`
  example, verified non-vacuous — breaking the table renderer fails 6 of 8
  assertions.

Final gates: core 224, adapter 59, release 44 (1 env-gated skip), smoke 129,
plus `release:validate`, `release:check-versions`, `lint`, and `type-check`.

## Key Decisions

- **Explainer authoring is two-path with a caller-owned author seam.** Editorial
  expectations live in author briefs as prose while schemas define only machine
  boundaries — prose carries quality, schemas carry identity. No content
  generator ships in the core or adapter; the executing agent is the author.
  Promoted to `DR-260726-explainer-authoring-is-two`.
- **Explainer render QA is opt-in and never self-launching.** The core never
  launches a browser; the generating agent reviews output in a browser when one
  is available. Promoted to `DR-260726-explainer-render-qa-is-opt`.
- **Policy owns expansion, not authors.** Recipes declare profiles that dictate
  type, authoring path, brief, and shell, preventing authors from choosing their
  own freedom level. Promoted to `DR-260726-recipe-policy-owns-expansion`.
- **Expansion artifacts get ID-bearing paths; floor artifacts keep existing
  ones** (D1), with `origin` carried explicitly so URL stability holds for
  already-published artifacts. Promoted to
  `DR-260726-expansion-artifacts-get-id`.
- **Core shell scripts are hash-pinned and authored scripts are rejected** (D3),
  validated as an ordered multiset. Promoted to
  `DR-260726-core-shell-scripts-are-hash`.

## Design Deltas

- **D9 added during the revision phase.** The final review observed that
  `author-request/v2` appeared only in tests and documentation, so autonomous
  richness was unproven. Rather than ship a content generator, the project
  recorded the author seam as deliberately caller-owned and verified richness
  behaviorally. The underlying limitation is accepted, not closed: whether an
  agent writes well is not unit-testable.
- **Automated render QA was removed after implementation.** `prev1-t06` built an
  auto-resolving browser runtime; a later scope review cut it. The shared
  `browser-runtime.mjs` module was retained because the pre-existing visual
  release gate had come to depend on it.
- **Manifest warning vocabulary changed.** `render-qa-skipped-no-headless-runtime`
  and `render-qa-disabled-by-configuration` collapsed into
  `render-qa-skipped-no-probe`, carried by the `explainer-kit` 2.0.0 major.

## Notable Challenges

- **A pre-existing regression blocked the start.** 11 core tests were already
  failing on `origin/main`, bisected to PR #170: one test referenced a project
  directory that PR had deleted, and ten had fixtures stale against a new
  immutable-coverage validation. Repaired as a `p00` pre-phase to establish a
  green baseline before redesign work began.
- **Probe false positives blocked two later phases.** The layout probe reported
  intentionally paged deck slides as clipped, and read the conventional
  reduced-motion idiom (`0.01ms`) as active animation. Both required correctives
  (`p05-t02a`, `p05-t02b`) because they blocked `release:validate`.
- **Parallel phases aborted three times at preflight** because
  `pnpm run worktree:init` restamped `.oat/sync/manifest.json` outside the
  declared write sets. Resolved by reverting the file and re-dispatching with an
  explicit exemption.
- **The review loop did not converge.** The plan needed six gate cycles before
  implementation; the final code review produced 10 findings, and a re-review of
  those 11 fix commits produced 8 more. The loop was ended deliberately rather
  than continued.
- **No gate could see the styling surface.** The narrative renderer's markup and
  the shells' stylesheets are separate surfaces, and every assertion covered the
  former. Four defects reached rendered output through that gap, each found by
  looking at the page rather than by a test or the release gate — the bare
  section numeral, downscaled diagram labels, fragmented wrapped lists, and the
  `engineer-tour` shell's entirely unstyled block output. The shell gap was
  latent on `main` and became reachable only because this project's renderer
  emits that markup. This is the concrete case for the project's decision that
  the generating agent reviews output in a browser: the suite was green and
  `release:validate` passed at every one of those points.

## Tradeoffs Made

- **Richness is verified by example, not by test.** The alternative — a bundled
  content generator — would recreate the slot-filling rigidity the project
  existed to remove. A caller supplying a thin author still gets thin output.
- **Layout regressions rely on the release gate and agent review** rather than
  per-run automation, so a layout defect can reach a reader if nobody looks.
  Accepted because render QA had grown to own a browser dependency and a
  disproportionate share of the test surface for artifacts published to a
  private bucket.
- **Four review findings were dropped rather than fixed or backlogged.** Two
  HTML-safety gaps (`input[type=image]` with a remote `src`, and relative CSS
  `url()`) are real but unreachable while artifacts are composed from
  hash-pinned shells; an anchor collision requires an author to use `overview`,
  `introduction`, and `lead` simultaneously; and one warning is already re-added
  by the pipeline.

## Revision History

- **Phase rev1** — the final code review's 10 findings implemented across 11
  commits: HTML safety, three distinct probe defects (scroll reachability,
  hidden headings, pseudo-element motion), render degradation warnings reaching
  the manifest, a single stable warning ID per finding, the provenance trust
  boundary, the QA runtime seam, D9, per-type expansion caps, Markdown lead
  preservation with deterministic ID disambiguation, and artifact alignment.
  Each probe sub-fix was individually revert-verified in real Chromium.
- **Post-revision scope reduction** — three commits making render QA opt-in,
  clearing stale render/QA warnings on a corrected resume, and correcting the
  `f257f96d` deviation description. Core and adapter counts fell from 226 and 60
  to 221 and 59 as six tests were removed with the behavior they described.
- **Rendering this project's own recap after closeout found four more defects**,
  all in the styling surface no assertion covered. Three were narrow: bare
  body-size section numerals in the house shells (`191bdfcf`), wrapped list items
  reparsed as paragraphs so most lists broke into fragments (`bf0a8b43`), and
  diagram SVGs carrying only a `viewBox` so they stretched to the column and
  downscaled 14px labels to 8px (`0514b04d`). The fourth was larger
  (`fb55ba94`): the `engineer-tour` shell styled none of the blocks the narrative
  renderer emits, so deep-dive callouts rendered as bare text and tables without
  structure, and `renderLegacyDiagram` drew 360-wide nodes at `x=80` into a
  360-wide viewBox stacked past its 540 height, clipping every section-rail node
  into a solid black bar. Both were revert-verified; the `.section-number` guard
  was generalized to assert every structure the renderer emits, and a new test
  asserts the section rail stays inside the shell viewport. Core and adapter now
  stand at 224 and 59 — the 221 and 59 above plus the section-number guard, a
  wrapped-list-item Markdown test, and the viewport-fit test.

## Follow-up Items

Recorded for memory, explicitly not backlogged — the operator decided these do
not warrant tracked work:

- `isUnsafeUrl` accepts `<input type="image" src="https://…">` and relative CSS
  `url(...)` references. Verified reproducible. Matters only if artifact HTML
  ever stops coming from an agent working off hash-pinned shells.
- A generated lead section can take `#lead` from an authored heading when
  `overview`, `introduction`, and `lead` are all already used.
- `checkGuidelines` omits the per-type expansion warning that the main pipeline
  appends separately, so direct consumers of that exported function lose it.
- Autonomous prose richness remains verified by rendered example rather than by
  automated evaluation.

Two further items were backlogged after closeout, on separate topics from the
four above:

- `BL-260727-ship-mit-notices-inside` — Ship MIT notices inside distributed
  packages (high, task, S). Adapted MIT code (Nico Bailon's visual-explainer,
  Obra Superpowers, shadcn/improve) ships without the required copyright and
  permission notice, because repo-root `NOTICES.md` is not part of the published
  package payload.
- `BL-260727-close-the-explainer-kit-visual` — Close the Explainer Kit visual
  authoring capability gap (medium, feature, L). The inline fenced-diagram
  renderer silently flattens non-linear graphs — branches, fan-ins, and cycles —
  into a linear chain, and the upstream visual-explainer workflows remain
  unreachable from the bundled recipes.

## Workflow Observations

### 2026-07-25 · structural · oat gate review · plan

target=cursor-gpt-5-6-sol-max threshold=important findings=critical:0,important:5,medium:3,minor:0 exit=1 status=blocked artifact=.oat/projects/shared/explainer-authoring-redesign/reviews/artifact-plan-review-2026-07-25T183814Z.md

### 2026-07-25 · structural · oat gate review · plan

target=cursor-gpt-5-6-sol-max threshold=important findings=critical:0,important:5,medium:3,minor:0 exit=1 status=blocked artifact=.oat/projects/shared/explainer-authoring-redesign/reviews/artifact-plan-review-2026-07-25T190445Z.md

### 2026-07-25 · structural · oat gate review · plan

target=cursor-gpt-5-6-sol-max threshold=important findings=critical:0,important:4,medium:1,minor:0 exit=1 status=blocked artifact=.oat/projects/shared/explainer-authoring-redesign/reviews/artifact-plan-review-2026-07-25T191042Z.md

## Unresolved claims

- None.
