---
oat_status: in_progress
oat_ready_for: null
oat_blockers: []
oat_last_updated: 2026-07-25
oat_phase: plan
oat_phase_status: in_progress
oat_plan_hill_phases: []
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
set scaling, and honest auto-drafted marking for unattended runs. Machine
rails (fact base, manifest, hashing, publish, approval modes) stay unchanged.

Primary write surface: `.agents/skills/explainer-kit/` (core skill) and
`.agents/skills/oat-explainer-kit/` (adapter), plus consumer callers, docs,
and release bookkeeping. Skill tests run with `node --test
.agents/skills/explainer-kit/tests/`.

**Expansion protocol (design clarification, binding for p01/p06/p07):**
content-driven set scaling is expressed as a two-step author protocol. The
floor artifact's `author-result/v2` may carry an optional
`proposedArtifacts[]` (id, type, authoring, rationale) — the set-planning
response. The pipeline validates proposals against the recipe's
`expansion{allowedTypes, limits}`, then issues one `author-request/v2` per
accepted proposal and receives one `author-result/v2` per artifact. Hub
linking of accepted expansion artifacts rides the existing `artifactLinks`
mechanism. Rejected/over-limit proposals degrade to manifest warnings.

## Phase 1: Contracts v2 (schemas, recipes, approval marking)

### Task p01-t01: Author contract v2 schemas (coexisting with v1)

**Files:**

- Create: `.agents/skills/explainer-kit/schemas/author-request.v2.schema.json`
- Create: `.agents/skills/explainer-kit/schemas/author-result.v2.schema.json`
- Modify: `.agents/skills/explainer-kit/scripts/lib/contracts.mjs`
- Modify: `.agents/skills/explainer-kit/tests/contracts.test.mjs`

**Step 1:** Define `explainer-kit.author-request/v2`: `{schemaVersion,
artifactId, artifactType, brief, factBase, shell?, theme, floor?}` and
`explainer-kit.author-result/v2`: `{schemaVersion, artifactId, content:
{markdown | html} (exactly one), provenance{authorId, generatedAt, method?},
proposedArtifacts?: [{id, type, authoring, rationale}]}` per the expansion
protocol above. The v2 schemas live at **distinct versioned paths**; the
existing v1 files (`author-request.schema.json`, `author-result.schema.json`)
are untouched here — `run.mjs` consumes them until p06-t01.

**Step 2:** Extend `contracts.mjs` registration to be version-aware: both v1
and v2 author contracts resolve by `$id`/kind+version. No call-site behavior
changes in this task.

**Step 3: Verify**
Run: `node --test .agents/skills/explainer-kit/tests/contracts.test.mjs`
Expected: v2 fixtures (with and without `proposedArtifacts`) validate; v1
validation unchanged; a v2 result carrying both `markdown` and `html` is
rejected.

**Step 4: Commit**

```bash
git add .agents/skills/explainer-kit/schemas/author-request.v2.schema.json .agents/skills/explainer-kit/schemas/author-result.v2.schema.json .agents/skills/explainer-kit/scripts/lib/contracts.mjs .agents/skills/explainer-kit/tests/contracts.test.mjs
git commit -m "feat(p01-t01): author contract v2 with expansion proposals, coexisting with v1"
```

### Task p01-t02: Recipe contract v2 (floor + expansion limits)

**Files:**

- Modify: `.agents/skills/explainer-kit/scripts/lib/recipes.mjs`
- Modify: `.agents/skills/explainer-kit/tests/recipes.test.mjs`

**Step 1:** Replace exact `artifacts[]` semantics with `floor[]` (required
artifacts: id, type, authoring `markdown|html`, template/shell ref, briefRef)
plus `expansion{allowedTypes[], limits{maxArtifacts?, maxPerType?}}`.
Validation: undeclared artifact type in a proposal or result → error;
over-limit proposals → rejected with warning (consumed by p05-t01/p06-t01);
floor misses → deferred to the guideline checker (warning), not a recipe
error.

**Step 2:** Update `loadRecipe`/`validateContentModel` call sites for the new
shape; keep source-role validation unchanged.

**Step 3: Verify**
Run: `node --test .agents/skills/explainer-kit/tests/recipes.test.mjs`
Expected: floor+expansion fixtures pass; undeclared-type fixture errors;
over-limit proposal fixture yields a rejection outcome; floor-miss fixture
does not error.

**Step 4: Commit**

```bash
git add .agents/skills/explainer-kit/scripts/lib/recipes.mjs .agents/skills/explainer-kit/tests/recipes.test.mjs
git commit -m "feat(p01-t02): recipe v2 floor+expansion semantics with limit validation"
```

### Task p01-t03: Rewrite bundled recipes to v2 (all four, asserted)

**Files:**

- Modify: `.agents/skills/explainer-kit/recipes/project-recap.json`
- Modify: `.agents/skills/explainer-kit/recipes/program-recap.json`
- Modify: `.agents/skills/explainer-kit/recipes/project-explainer.json`
- Modify: `.agents/skills/explainer-kit/recipes/engineer-tour.json`
- Modify: `.agents/skills/explainer-kit/tests/recipes.test.mjs`

**Step 1:** Convert each recipe with explicit semantics:

- `project-recap`: floor = one markdown narrative page; expansion allows
  `diagram`, `deck`, additional `page` artifacts.
- `program-recap`: floor = one markdown narrative page (program-level
  aggregate); expansion allows `diagram` and `page` artifacts (per-project
  sub-pages), markdown authoring.
- `project-explainer`: floor = one markdown narrative page + one html
  explainer artifact (shell ref); expansion allows `diagram`.
- `engineer-tour`: floor = one html tour artifact (shell ref); expansion
  allows `diagram`.

Each floor entry carries its `briefRef`.

**Step 2: Verify**
Run: `node --test .agents/skills/explainer-kit/tests/recipes.test.mjs`
Expected: semantic assertions per recipe (floor artifact ids/types/authoring,
expansion allowedTypes, briefRef resolution) — not load-only checks.

**Step 3: Commit**

```bash
git add .agents/skills/explainer-kit/recipes .agents/skills/explainer-kit/tests/recipes.test.mjs
git commit -m "feat(p01-t03): bundled recipes on v2 floor+expansion with semantic assertions"
```

### Task p01-t04: Approval record v2 with marking and resume compatibility

**Files:**

- Modify: `.agents/skills/explainer-kit/scripts/lib/content-approval.mjs`
- Modify: `.agents/skills/explainer-kit/tests/content-approval.test.mjs`

**Step 1:** Emit `explainer-kit.content-approval/v2` records carrying
`marking: "human-approved" | "auto-drafted"`: unattended auto-approval records
`auto-drafted`; interactive approve records `human-approved`. Update all
version assertions that currently hard-code v1.

**Step 2:** Define resume compatibility: reading a persisted v1 approval
record from an in-flight run remains valid (treated as `human-approved` when
status is approved interactively, `auto-drafted` when unattended); new writes
are always v2. Surface the marking in the run result for manifest assembly
(p06-t02).

**Step 3: Verify**
Run: `node --test .agents/skills/explainer-kit/tests/content-approval.test.mjs`
Expected: new unattended runs record v2 `auto-drafted`; interactive approve
records v2 `human-approved`; resumed v1-record fixture is accepted with the
compatibility mapping; reject flow unchanged.

**Step 4: Commit**

```bash
git add .agents/skills/explainer-kit/scripts/lib/content-approval.mjs .agents/skills/explainer-kit/tests/content-approval.test.mjs
git commit -m "feat(p01-t04): content-approval v2 marking with v1 resume compatibility"
```

## Phase 2: Author briefs

### Task p02-t01: Brief format and bundled per-recipe briefs

**Files:**

- Create: `.agents/skills/explainer-kit/briefs/project-recap.md`
- Create: `.agents/skills/explainer-kit/briefs/program-recap.md`
- Create: `.agents/skills/explainer-kit/briefs/project-explainer.md`
- Create: `.agents/skills/explainer-kit/briefs/engineer-tour.md`

**Step 1:** Author the brief format (audience, voice, per-section intent,
floors, expansion license) and write the four bundled briefs. The
`project-recap` brief encodes the editorial bar: busy-reader prose, six-part
narrative coverage, ≥1 high-level architecture diagram (inline fine),
evidence tables for validation, expansion license keyed to project substance
("multiple diagrams/sub-diagrams/deck when complexity earns it"), and the
plain-language editing rules from the original 0.4.1 skill. The
`program-recap` brief covers program-level aggregation and per-project
sub-page expansion.

**Step 2: Verify**
Run: `node --test .agents/skills/explainer-kit/tests/recipes.test.mjs`
Expected: every bundled recipe's `briefRef` resolves to an existing brief.

**Step 3: Commit**

```bash
git add .agents/skills/explainer-kit/briefs
git commit -m "feat(p02-t01): bundled author briefs carry the editorial bar"
```

### Task p02-t02: Author-callback construction documented for the lifecycle

**Files:**

- Modify: `.agents/skills/oat-explainer-kit/references/` (author-callback construction guidance)
- Modify: `.agents/skills/oat-explainer-kit/SKILL.md` (brief wiring guidance; version bump deferred to p08-t02)

**Step 1:** Document how the adapter/lifecycle constructs the author callback:
brief inlined into `author-request/v2`, fact base attached, shell/theme for
artistic artifacts, and the expansion protocol (set-planning proposals →
per-artifact requests) — closing the closeout gap (critic documented, author
not). Include the automated-completion rule: recap runs invoked by the
completion chain always use `mode: unattended`.

**Step 2: Verify**
Run: `rg -n "author-request/v2" .agents/skills/oat-explainer-kit | head`
Expected: adapter references describe author-callback construction, the
expansion protocol, and the unattended completion rule.

**Step 3: Commit**

```bash
git add .agents/skills/oat-explainer-kit
git commit -m "docs(p02-t02): adapter author-callback construction + unattended completion rule"
```

## Phase 3: Narrative renderer

### Task p03-t01: Markdown parsing and AST safety validation

**Files:**

- Create: `.agents/skills/explainer-kit/scripts/lib/markdown.mjs`
- Create: `.agents/skills/explainer-kit/tests/markdown.test.mjs`

**Step 1:** Implement CommonMark + GFM (tables, task lists, strikethrough)
parsing to an internal AST. Decision recorded in design: the core stays
dependency-light — implement the required subset natively (no npm runtime
deps in the packaged skill); scope is the block vocabulary, not full spec
compliance.

**Step 2:** AST validation: safe node allowlist (no raw HTML passthrough),
absolute-link rule per the publish contract, fenced diagram blocks recognized
as a distinct node type. Safety violations are hard errors; style findings
return as warnings.

**Step 3: Verify**
Run: `node --test .agents/skills/explainer-kit/tests/markdown.test.mjs`
Expected: block fixtures (including tables, task lists, strikethrough) parse;
raw-HTML and unsafe-link fixtures hard-fail; warning fixtures return findings
without throwing.

**Step 4: Commit**

```bash
git add .agents/skills/explainer-kit/scripts/lib/markdown.mjs .agents/skills/explainer-kit/tests/markdown.test.mjs
git commit -m "feat(p03-t01): markdown AST parse (GFM incl. strikethrough) + safety validation"
```

### Task p03-t02: Themed block library rendering

**Files:**

- Modify: `.agents/skills/explainer-kit/scripts/lib/render.mjs`
- Modify: `.agents/skills/explainer-kit/templates/house-style.html`
- Create: `.agents/skills/explainer-kit/tests/narrative-render.test.mjs`

**Step 1:** Replace `renderSections`' escaped single-`<p>` emission with AST →
block rendering: headings, paragraphs, GFM tables, lists (incl. task lists),
strikethrough, callouts, timelines, code blocks, figures — all themed via
existing tokens, preserving section anchors/numbering/TOC and the
self-contained HTML profile.

**Step 2:** Keep deck/slide rendering delegated to the artistic path (p04);
narrative rendering no longer feeds `renderSlides`. Golden-file tests live in
the **new** `narrative-render.test.mjs` (not `templates.test.mjs`, which p04
owns during the parallel group).

**Step 3: Verify**
Run: `node --test .agents/skills/explainer-kit/tests/narrative-render.test.mjs .agents/skills/explainer-kit/tests/theme.test.mjs`
Expected: golden-file renders per block type and theme mode; identical input
→ identical output.

**Step 4: Commit**

```bash
git add .agents/skills/explainer-kit/scripts/lib/render.mjs .agents/skills/explainer-kit/templates/house-style.html .agents/skills/explainer-kit/tests/narrative-render.test.mjs
git commit -m "feat(p03-t02): themed block library replaces escaped-paragraph rendering"
```

### Task p03-t03: Diagram blocks to build-time inline SVG

**Files:**

- Create: `.agents/skills/explainer-kit/scripts/lib/diagram.mjs`
- Create: `.agents/skills/explainer-kit/tests/diagram.test.mjs`

**Step 1:** Render fenced diagram blocks (flowchart/graph vocabulary per
design) to inline SVG at build time — no client-side script — themed for
light/dark modes. Unsupported diagram syntax degrades to a warning plus the
source in a code block (never a hard failure).

**Step 2: Verify**
Run: `node --test .agents/skills/explainer-kit/tests/diagram.test.mjs`
Expected: diagram fixtures produce deterministic inline SVG; unsupported
syntax degrades gracefully with a warning.

**Step 3: Commit**

```bash
git add .agents/skills/explainer-kit/scripts/lib/diagram.mjs .agents/skills/explainer-kit/tests/diagram.test.mjs
git commit -m "feat(p03-t03): build-time inline SVG diagram blocks"
```

## Phase 4: Artistic composer path

### Task p04-t01: DOM safety validator

**Files:**

- Create: `.agents/skills/explainer-kit/scripts/lib/html-safety.mjs`
- Create: `.agents/skills/explainer-kit/tests/html-safety.test.mjs`

**Step 1:** Parse-level allowlist validation for agent-composed HTML:
hard-fail on script elements, event-handler attributes, and external active
content; warn on style-family deviations (missing theme tokens, missing
required anchors). Parser is a dependency-light HTML tokenizer used for
validation only (no rendering).

**Step 2: Verify**
Run: `node --test .agents/skills/explainer-kit/tests/html-safety.test.mjs`
Expected: injection fixtures hard-fail; allowlisted rich fixtures pass;
deviation fixtures warn.

**Step 3: Commit**

```bash
git add .agents/skills/explainer-kit/scripts/lib/html-safety.mjs .agents/skills/explainer-kit/tests/html-safety.test.mjs
git commit -m "feat(p04-t01): DOM allowlist safety validation for artistic artifacts"
```

### Task p04-t02: Shell canvases and expansion license plumbing

**Files:**

- Modify: `.agents/skills/explainer-kit/templates/deck-shell.html`
- Modify: `.agents/skills/explainer-kit/templates/diagram-shell.html`
- Modify: `.agents/skills/explainer-kit/templates/engineer-tour.html`
- Modify: `.agents/skills/explainer-kit/tests/templates.test.mjs`

**Step 1:** Refresh shells as starting canvases: theme-token wiring, required
anchors (for validation and render QA), and clearly-marked extension regions.
Shells are delivered to the author inside `author-request/v2` (`shell` field).
Shell fidelity checks live in `templates.test.mjs`, which **only this phase**
touches during the parallel group (p03 golden tests live in
`narrative-render.test.mjs`).

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
coverage, diagram presence (inline or standalone), structured-block depth
signals, and rejected/over-limit expansion proposals. Emit stable warning
identifiers into manifest `warnings[]`; never block.

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
with animations disabled. Findings → warnings. When no headless runtime is
available, record the single skip warning and continue.

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

### Task p06-t01: Author stage wiring in the core run (v1 schemas retired)

**Files:**

- Modify: `.agents/skills/explainer-kit/scripts/run.mjs`
- Delete: `.agents/skills/explainer-kit/schemas/author-request.schema.json`
- Delete: `.agents/skills/explainer-kit/schemas/author-result.schema.json`
- Modify: `.agents/skills/explainer-kit/scripts/lib/contracts.mjs`
- Modify: `.agents/skills/explainer-kit/tests/contracts.test.mjs`
- Modify: `.agents/skills/explainer-kit/tests/records.test.mjs`

**Step 1:** Replace `createContentModel`'s joined-claims summary with the
author stage: construct `author-request/v2` per floor artifact (brief inlined,
shell/theme attached for html authoring), invoke the author callback, run the
expansion protocol (validate `proposedArtifacts` against recipe limits, issue
per-artifact requests for accepted proposals), persist authored content as
the real render input (`source/content/<artifact>.md` or `.html` — now
load-bearing, still hash-pinned). Route rendering by authoring type
(markdown → narrative renderer; html → safety validation). Link accepted
expansion artifacts from the narrative page via `artifactLinks`.

**Step 2:** Remove the v1 author schema files and their `contracts.mjs`
registrations now that nothing consumes them; update contract tests
accordingly. Unattended runs without an author callback fail with a clear
`E_AUTHOR_REQUIRED` (autonomous invokers must supply one — documented in
p02-t02); interactive runs pause at the approval gate with drafts + warnings
as the review surface.

**Step 3: Verify**
Run: `node --test .agents/skills/explainer-kit/tests/`
Expected: full core suite passes; run fixtures produce authored, rendered,
validated artifacts end-to-end, including an accepted-expansion fixture.

**Step 4: Commit**

```bash
git add .agents/skills/explainer-kit/scripts/run.mjs .agents/skills/explainer-kit/schemas .agents/skills/explainer-kit/scripts/lib/contracts.mjs .agents/skills/explainer-kit/tests
git commit -m "feat(p06-t01): author stage feeds both render paths; v1 author contracts retired"
```

### Task p06-t02: Manifest marking and adapter integration

**Files:**

- Modify: `.agents/skills/explainer-kit/scripts/lib/records.mjs`
- Modify: `.agents/skills/oat-explainer-kit/scripts/run.mjs`
- Modify: `.agents/skills/oat-explainer-kit/scripts/resolve-intent.mjs`
- Modify: `.agents/skills/explainer-kit/tests/records.test.mjs`

**Step 1:** Surface the approval marking through the run result/manifest
context; adapter passes briefs and author callback through, and the automated
completion chain (document/summary/pr-final/recap) invokes recap with
`mode: unattended` unconditionally.

**Step 2: Verify**
Run: `node --test .agents/skills/explainer-kit/tests/records.test.mjs`
Expected: unattended run records carry `auto-drafted`; adapter context fixtures
force unattended for completion-chain invocations.

**Step 3: Commit**

```bash
git add .agents/skills/explainer-kit/scripts/lib/records.mjs .agents/skills/oat-explainer-kit/scripts .agents/skills/explainer-kit/tests/records.test.mjs
git commit -m "feat(p06-t02): auto-drafted marking + unattended completion chain"
```

### Task p06-t03: Migrate every remaining v1 consumer (same release)

**Files:**

- Modify: `.agents/skills/oat-wave-execute/SKILL.md` (author-request/v1 → v2 guidance)
- Modify: `.agents/skills/explainer-kit/tests/schemas.test.mjs`
- Modify: `.agents/skills/oat-explainer-kit/tests/run.integration.test.mjs`
- Modify: `tools/smoke/explainer-kit/wrapper-compatibility.test.mjs`

**Step 1:** Inventory canonical v1 author-contract references (`rg -n
"author-request/v1|author-result/v1" .agents tools apps packages`) and migrate
each: the `oat-wave-execute` shipped guidance, core schema tests, adapter
integration fixtures, and the wrapper-compatibility smoke fixtures all
construct/reference v2 shapes. Any newly discovered consumer is migrated in
this task, not deferred.

**Step 2:** Refresh provider views (`oat sync --scope all`) so `.claude/`,
`.cursor/`, `.codex/` mirrors of changed canonical skills are current.

**Step 3: Verify**
Run: `rg -n "author-request/v1|author-result/v1" .agents tools apps packages | wc -l` then `node --test .agents/skills/explainer-kit/tests/ .agents/skills/oat-explainer-kit/tests/run.integration.test.mjs && pnpm test:smoke`
Expected: zero remaining v1 author-contract references; core, adapter, and
smoke suites pass.

**Step 4: Commit**

```bash
git add .agents/skills/oat-wave-execute/SKILL.md .agents/skills/explainer-kit/tests/schemas.test.mjs .agents/skills/oat-explainer-kit/tests/run.integration.test.mjs tools/smoke/explainer-kit/wrapper-compatibility.test.mjs .oat/sync/manifest.json .claude .cursor .codex
git commit -m "feat(p06-t03): migrate all v1 author-contract consumers to v2"
```

## Phase 7: End-to-end anti-regression fixture

### Task p07-t01: Recap anti-regression fixture

**Files:**

- Create: `.agents/skills/explainer-kit/tests/e2e-recap.test.mjs`
- Modify: `.agents/skills/explainer-kit/examples/project-recap/` (existing fixture set updated for v2)

**Step 1:** Build a completed-project fact base + author fixture (modeled on
the in5-game-cms evidence) and assert the rendered narrative page contains
structured blocks: ≥1 table, ≥1 inline diagram SVG, lists, and section
anchors — the direct anti-regression for the original complaint. Include an
expansion-path case (author proposes a standalone diagram; page links it).
Assert manifest warnings are empty for the rich fixture and populated for a
thin one.

**Step 2: Verify**
Run: `node --test .agents/skills/explainer-kit/tests/e2e-recap.test.mjs`
Expected: rich fixture renders rich (with linked expansion artifact); thin
fixture ships with floor warnings.

**Step 3: Commit**

```bash
git add .agents/skills/explainer-kit/tests/e2e-recap.test.mjs .agents/skills/explainer-kit/examples
git commit -m "test(p07-t01): recap richness anti-regression fixture"
```

## Phase 8: Documentation and release closure

### Task p08-t01: Docs and skill guidance updates

**Files:**

- Modify: `apps/oat-docs/docs/` (explainer-kit pages: authoring model, briefs, warnings, marking)
- Modify: `.agents/skills/explainer-kit/SKILL.md` (authoring model description; version bump lands in p08-t02)

**Step 1:** Update the docs surface: two-path authoring model, brief
authoring guidance, floor/expansion recipe semantics and the expansion
protocol, warning taxonomy, auto-drafted marking, render QA behavior.
Regenerate the docs index if nav changed (`oat docs generate-index`).

**Step 2: Verify**
Run: `pnpm build:docs`
Expected: docs build passes with updated pages.

**Step 3: Commit**

```bash
git add apps/oat-docs .agents/skills/explainer-kit/SKILL.md
git commit -m "docs(p08-t01): explainer authoring v2 documentation"
```

### Task p08-t02: Version bumps and release validation (final task)

**Files:**

- Modify: `.agents/skills/explainer-kit/SKILL.md` (version: 2.0.0)
- Modify: `.agents/skills/oat-explainer-kit/SKILL.md` (single PR-scoped bump)
- Modify: `.agents/skills/oat-wave-execute/SKILL.md` (single PR-scoped bump)
- Modify: `packages/cli/package.json`
- Modify: `packages/control-plane/package.json`
- Modify: `packages/docs-config/package.json`
- Modify: `packages/docs-theme/package.json`
- Modify: `packages/docs-transforms/package.json`

**Step 1:** As the final task, after all shipped skill/docs edits exist: bump
the core skill to 2.0.0 and apply exactly one PR-scoped version bump to every
other canonical skill changed on this branch (`oat-explainer-kit`,
`oat-wave-execute`); bump the five lockstep public packages (bundled assets
count as shipped CLI functionality per the repo guardrail).

**Step 2: Verify**
Run: `pnpm release:validate && pnpm lint && pnpm type-check && pnpm test`
Expected: release dry-run and full repo checks pass against the complete
tree — no shipped edits follow this task.

**Step 3: Commit**

```bash
git add .agents/skills/explainer-kit/SKILL.md .agents/skills/oat-explainer-kit/SKILL.md .agents/skills/oat-wave-execute/SKILL.md packages/cli/package.json packages/control-plane/package.json packages/docs-config/package.json packages/docs-theme/package.json packages/docs-transforms/package.json
git commit -m "chore(p08-t02): lockstep version bumps + release validation for explainer authoring v2"
```

## Parallelism

Phase 1 is the contract foundation and runs first. After it lands, **p02
(briefs), p03 (narrative renderer), and p04 (artistic path) have disjoint
write sets** — `briefs/` + adapter references; `scripts/lib/markdown|diagram
.mjs` + `render.mjs` + `house-style.html` + the new
`narrative-render.test.mjs`; and `html-safety.mjs` + shell templates +
`templates.test.mjs` respectively. The former shared surface
(`templates.test.mjs`) was removed by giving p03 its own test file, so the
group's write sets are genuinely disjoint with independent verification. p05
(guideline checker + render QA) touches `qa.mjs`, which reads outputs from
both render paths, so it follows the group. p06 (pipeline integration + v1
retirement + consumer migration) rewires `run.mjs` across everything and must
be sequential, as must p07 (e2e fixture) and p08 (docs, then release closure
as the final task so validation covers the complete tree).

## Reviews

| Scope | Type     | Status          | Date       | Artifact                                           |
| ----- | -------- | --------------- | ---------- | -------------------------------------------------- |
| plan  | artifact | fixes_completed | 2026-07-25 | reviews/artifact-plan-review-2026-07-25T183814Z.md |

**Status values:** `pending` → `received` → `fixes_added` →
`fixes_completed` → `passed`

## Implementation Complete

**Summary:**

- Phase 1: 4 tasks — contracts v2 (author+expansion, recipe, approval marking)
- Phase 2: 2 tasks — author briefs + lifecycle author-callback docs
- Phase 3: 3 tasks — narrative renderer (markdown, blocks, diagrams)
- Phase 4: 2 tasks — artistic path (safety validator, shells)
- Phase 5: 2 tasks — guideline checker + render QA
- Phase 6: 3 tasks — pipeline integration, marking, v1 consumer migration
- Phase 7: 1 task — e2e anti-regression fixture
- Phase 8: 2 tasks — docs, then version bumps + release validation

**Total: 19 tasks**

## References

- Discovery: `discovery.md`
- Design: `design.md` (expansion protocol clarified in this plan's preamble)
- Plan review: `reviews/artifact-plan-review-2026-07-25T183814Z.md`
- Root-cause evidence: live in5-game-cms recap; `author-result/v1` +
  `render.mjs` escaped single-paragraph rendering; write-only markdown
  content records
- Original editorial bar: `~/.agents/skills-backup/oat-explainer-kit-0.4.1/SKILL.md`
