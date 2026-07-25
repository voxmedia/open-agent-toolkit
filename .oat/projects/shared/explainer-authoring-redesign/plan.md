---
oat_status: complete
oat_ready_for: oat-project-implement
oat_blockers: []
oat_last_updated: 2026-07-25
oat_phase: plan
oat_phase_status: complete
oat_plan_hill_phases: []
oat_plan_parallel_groups: [['p02', 'p03', 'p04']]
oat_plan_source: quick
oat_import_reference: null
oat_import_source_path: null
oat_import_provider: null
oat_generated: false
oat_template: false
oat_template_name: plan
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
`.agents/skills/oat-explainer-kit/` (adapter), plus docs and release
bookkeeping. Skill tests run with `node --test
.agents/skills/explainer-kit/tests/`.

## Phase 1: Contracts v2 (schemas, recipes, approval marking)

### Task p01-t01: Author contract v2 schemas

**Files:**

- Create: `.agents/skills/explainer-kit/schemas/author-request.schema.json` (v2 `$id`)
- Create: `.agents/skills/explainer-kit/schemas/author-result.schema.json` (v2 `$id`)
- Modify: `.agents/skills/explainer-kit/scripts/lib/contracts.mjs`
- Modify: `.agents/skills/explainer-kit/tests/contracts.test.mjs`

**Step 1:** Define `explainer-kit.author-request/v2`: `{schemaVersion,
artifactId, artifactType, brief, factBase, shell?, theme, floor?}` and
`explainer-kit.author-result/v2`: `{schemaVersion, artifactId, content:
{markdown | html} (exactly one), provenance{authorId, generatedAt, method?}}`.
Keep the v1 author schemas registered for now — `run.mjs` consumes them until
p06-t01 rewires the author stage; v1 removal happens there so every
intermediate phase stays green (clean break still lands within this release).

**Step 2:** Register the v2 contracts in `contracts.mjs` validation alongside
v1.

**Step 3: Verify**
Run: `node --test .agents/skills/explainer-kit/tests/contracts.test.mjs`
Expected: v2 fixtures validate; existing v1 validation unchanged.

**Step 4: Commit**

```bash
git add .agents/skills/explainer-kit/schemas .agents/skills/explainer-kit/scripts/lib/contracts.mjs .agents/skills/explainer-kit/tests/contracts.test.mjs
git commit -m "feat(p01-t01): author contract v2 (markdown/html content, minimal shape)"
```

### Task p01-t02: Recipe contract v2 (floor + expansion)

**Files:**

- Modify: `.agents/skills/explainer-kit/scripts/lib/recipes.mjs`
- Modify: `.agents/skills/explainer-kit/tests/recipes.test.mjs`

**Step 1:** Replace exact `artifacts[]` semantics with `floor[]` (required
artifacts: id, type, authoring `markdown|html`, template/shell ref) plus
`expansion{allowedTypes[], limits}`. Validation: undeclared artifact type →
error; floor miss → deferred to guideline checker (warning), not a recipe
error.

**Step 2:** Update `loadRecipe`/`validateContentModel` call sites for the new
shape; keep source-role validation unchanged.

**Step 3: Verify**
Run: `node --test .agents/skills/explainer-kit/tests/recipes.test.mjs`
Expected: floor+expansion fixtures pass; undeclared-type fixture errors;
floor-miss fixture does not error.

**Step 4: Commit**

```bash
git add .agents/skills/explainer-kit/scripts/lib/recipes.mjs .agents/skills/explainer-kit/tests/recipes.test.mjs
git commit -m "feat(p01-t02): recipe v2 floor+expansion semantics"
```

### Task p01-t03: Rewrite bundled recipes to v2

**Files:**

- Modify: `.agents/skills/explainer-kit/recipes/project-recap.json`
- Modify: `.agents/skills/explainer-kit/recipes/program-recap.json`
- Modify: `.agents/skills/explainer-kit/recipes/project-explainer.json`
- Modify: `.agents/skills/explainer-kit/recipes/engineer-tour.json`

**Step 1:** Convert each recipe: `project-recap` floor = one markdown
narrative page; expansion allows diagram/deck/page artifacts. `project-explainer`
and `engineer-tour` floors include their artistic artifacts (html authoring,
shell refs). Each recipe carries a `briefRef`.

**Step 2: Verify**
Run: `node --test .agents/skills/explainer-kit/tests/recipes.test.mjs`
Expected: all four bundled recipes load and validate as v2.

**Step 3: Commit**

```bash
git add .agents/skills/explainer-kit/recipes
git commit -m "feat(p01-t03): bundled recipes on v2 floor+expansion"
```

### Task p01-t04: Approval marking (auto-drafted vs human-approved)

**Files:**

- Modify: `.agents/skills/explainer-kit/scripts/lib/content-approval.mjs`
- Modify: `.agents/skills/explainer-kit/tests/content-approval.test.mjs`

**Step 1:** Add `marking: "human-approved" | "auto-drafted"` to the approval
record: unattended auto-approval records `auto-drafted`; interactive approve
records `human-approved`. Surface the marking in the run result so the
manifest assembly step (p06-t02) can carry it.

**Step 2: Verify**
Run: `node --test .agents/skills/explainer-kit/tests/content-approval.test.mjs`
Expected: unattended fixture records `auto-drafted`; interactive approve
records `human-approved`; reject flow unchanged.

**Step 3: Commit**

```bash
git add .agents/skills/explainer-kit/scripts/lib/content-approval.mjs .agents/skills/explainer-kit/tests/content-approval.test.mjs
git commit -m "feat(p01-t04): approval marking distinguishes auto-drafted runs"
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
plain-language editing rules from the original 0.4.1 skill.

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
- Modify: `.agents/skills/oat-explainer-kit/SKILL.md` (version bump + brief wiring)

**Step 1:** Document how the adapter/lifecycle constructs the author callback:
brief inlined into `author-request/v2`, fact base attached, shell/theme for
artistic artifacts — closing the closeout gap (critic documented, author not).
Include the automated-completion rule: recap runs invoked by the completion
chain always use `mode: unattended`.

**Step 2: Verify**
Run: `rg -n "author-request/v2" .agents/skills/oat-explainer-kit | head`
Expected: adapter references describe author-callback construction and the
unattended completion rule.

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

**Step 1:** Implement CommonMark + GFM-tables/task-list parsing to an internal
AST. Decision recorded in design: the core stays dependency-light — implement
the required subset natively (no npm runtime deps in the packaged skill);
scope is the block vocabulary, not full spec compliance.

**Step 2:** AST validation: safe node allowlist (no raw HTML passthrough),
absolute-link rule per publish contract, fenced diagram blocks recognized as a
distinct node type. Safety violations are hard errors; style findings return
as warnings.

**Step 3: Verify**
Run: `node --test .agents/skills/explainer-kit/tests/markdown.test.mjs`
Expected: block fixtures parse; raw-HTML and unsafe-link fixtures hard-fail;
warning fixtures return findings without throwing.

**Step 4: Commit**

```bash
git add .agents/skills/explainer-kit/scripts/lib/markdown.mjs .agents/skills/explainer-kit/tests/markdown.test.mjs
git commit -m "feat(p03-t01): markdown AST parse + safety validation"
```

### Task p03-t02: Themed block library rendering

**Files:**

- Modify: `.agents/skills/explainer-kit/scripts/lib/render.mjs`
- Modify: `.agents/skills/explainer-kit/templates/house-style.html`
- Modify: `.agents/skills/explainer-kit/tests/templates.test.mjs`

**Step 1:** Replace `renderSections`' escaped single-`<p>` emission with AST →
block rendering: headings, paragraphs, GFM tables, lists, callouts,
timelines, code blocks, figures — all themed via existing tokens, preserving
section anchors/numbering/TOC and the self-contained HTML profile.

**Step 2:** Keep deck/slide rendering delegated to the artistic path (p04);
narrative rendering no longer feeds `renderSlides`.

**Step 3: Verify**
Run: `node --test .agents/skills/explainer-kit/tests/templates.test.mjs .agents/skills/explainer-kit/tests/theme.test.mjs`
Expected: golden-file renders per block type and theme mode; identical input
→ identical output.

**Step 4: Commit**

```bash
git add .agents/skills/explainer-kit/scripts/lib/render.mjs .agents/skills/explainer-kit/templates/house-style.html .agents/skills/explainer-kit/tests/templates.test.mjs
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
required anchors). Parser is the same dependency-light HTML tokenizer used
for validation only (no rendering).

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
signals. Emit stable warning identifiers into manifest `warnings[]`; never
block.

**Step 2: Verify**
Run: `node --test .agents/skills/explainer-kit/tests/qa.test.mjs`
Expected: floor-miss fixtures produce the expected warning ids; rich fixtures
produce none.

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

## Phase 6: Pipeline integration

### Task p06-t01: Author stage wiring in the core run

**Files:**

- Modify: `.agents/skills/explainer-kit/scripts/run.mjs`
- Modify: `.agents/skills/explainer-kit/tests/records.test.mjs`

**Step 1:** Replace `createContentModel`'s joined-claims summary with the
author stage: construct `author-request/v2` per floor artifact (brief inlined,
shell/theme attached for html authoring), invoke the author callback, persist
authored content as the real render input (`source/content/<artifact>.md` or
`.html` — now load-bearing, still hash-pinned). Route rendering by authoring
type (markdown → narrative renderer; html → safety validation). Accept
expansion artifacts the author returns within recipe limits. Remove the v1
author schemas and their `contracts.mjs` registrations here (deferred from
p01-t01) now that nothing consumes them.

**Step 2:** Unattended runs without an author callback fail with a clear
`E_AUTHOR_REQUIRED` (autonomous invokers must supply one — documented in
p02-t02); interactive runs pause at the approval gate with drafts + warnings
as the review surface.

**Step 3: Verify**
Run: `node --test .agents/skills/explainer-kit/tests/`
Expected: full core suite passes; run fixtures produce authored, rendered,
validated artifacts end-to-end.

**Step 4: Commit**

```bash
git add .agents/skills/explainer-kit/scripts/run.mjs .agents/skills/explainer-kit/tests
git commit -m "feat(p06-t01): author stage feeds real content through both render paths"
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

## Phase 7: End-to-end fixture and release validation

### Task p07-t01: Recap anti-regression fixture

**Files:**

- Create: `.agents/skills/explainer-kit/tests/e2e-recap.test.mjs`
- Modify: `.agents/skills/explainer-kit/examples/project-recap/` (existing fixture set updated for v2)

**Step 1:** Build a completed-project fact base + author fixture (modeled on
the in5-game-cms evidence) and assert the rendered narrative page contains
structured blocks: ≥1 table, ≥1 inline diagram SVG, lists, and section
anchors — the direct anti-regression for the original complaint. Assert
manifest warnings are empty for the rich fixture and populated for a thin one.

**Step 2: Verify**
Run: `node --test .agents/skills/explainer-kit/tests/e2e-recap.test.mjs`
Expected: rich fixture renders rich; thin fixture ships with floor warnings.

**Step 3: Commit**

```bash
git add .agents/skills/explainer-kit/tests/e2e-recap.test.mjs .agents/skills/explainer-kit/examples
git commit -m "test(p07-t01): recap richness anti-regression fixture"
```

### Task p07-t02: Version bumps and release validation

**Files:**

- Modify: `.agents/skills/explainer-kit/SKILL.md` (version: 2.0.0)
- Modify: `.agents/skills/oat-explainer-kit/SKILL.md` (version bump)
- Modify: `packages/cli/package.json`, `packages/control-plane/package.json`, `packages/docs-config/package.json`, `packages/docs-theme/package.json`, `packages/docs-transforms/package.json` (lockstep bump)

**Step 1:** Bump the core skill to 2.0.0 and the adapter accordingly (bundled
assets count as shipped CLI functionality → lockstep bump of all five public
packages per repo guardrail).

**Step 2: Verify**
Run: `pnpm release:validate && pnpm lint && pnpm type-check && pnpm test`
Expected: release dry-run and full repo checks pass.

**Step 3: Commit**

```bash
git add .agents/skills/explainer-kit/SKILL.md .agents/skills/oat-explainer-kit/SKILL.md packages/*/package.json
git commit -m "chore(p07-t02): lockstep version bumps for explainer authoring v2"
```

## Phase 8: Documentation

### Task p08-t01: Docs and skill guidance updates

**Files:**

- Modify: `apps/oat-docs/docs/` (explainer-kit pages: authoring model, briefs, warnings, marking)
- Modify: `.agents/skills/explainer-kit/SKILL.md` (authoring model description)

**Step 1:** Update the docs surface: two-path authoring model, brief
authoring guidance, floor/expansion recipe semantics, warning taxonomy,
auto-drafted marking, render QA behavior. Regenerate the docs index if nav
changed (`oat docs generate-index`).

**Step 2: Verify**
Run: `pnpm build:docs`
Expected: docs build passes with updated pages.

**Step 3: Commit**

```bash
git add apps/oat-docs .agents/skills/explainer-kit/SKILL.md
git commit -m "docs(p08-t01): explainer authoring v2 documentation"
```

## Parallelism

Phase 1 is the contract foundation and runs first. After it lands, **p02
(briefs), p03 (narrative renderer), and p04 (artistic path) have disjoint
write sets** — `briefs/` + adapter references, `scripts/lib/markdown|diagram
.mjs` + `render.mjs` + `house-style.html`, and `html-safety.mjs` + shell
templates respectively — with independent verification, so they are declared
as a parallel group. p05 (guideline checker + render QA) touches `qa.mjs`,
which reads outputs from both render paths, so it follows the group. p06
(pipeline integration) rewires `run.mjs` across everything and must be
sequential, as must p07 (e2e + release, depends on the whole) and p08 (docs
describe final behavior). `templates.test.mjs` is shared between p03-t02 and
p04-t02; the parallel groups tolerate this because worktree merges are
append-oriented test additions, but the merge order should land p03 first.

## Reviews

| Scope | Type     | Status | Date       | Artifact                                                                                                               |
| ----- | -------- | ------ | ---------- | ---------------------------------------------------------------------------------------------------------------------- |
| plan  | artifact | passed | 2026-07-25 | inline planning-parent review (deliberate inheritance, High ceiling met); 1 Important + 1 Minor finding fixed in-place |

**Status values:** `pending` → `received` → `fixes_added` →
`fixes_completed` → `passed`

## Implementation Complete

**Summary:**

- Phase 1: 4 tasks — contracts v2 (author, recipe, approval marking)
- Phase 2: 2 tasks — author briefs + lifecycle author-callback docs
- Phase 3: 3 tasks — narrative renderer (markdown, blocks, diagrams)
- Phase 4: 2 tasks — artistic path (safety validator, shells)
- Phase 5: 2 tasks — guideline checker + render QA
- Phase 6: 2 tasks — pipeline integration + marking
- Phase 7: 2 tasks — e2e anti-regression + release validation
- Phase 8: 1 task — documentation

**Total: 18 tasks**

## References

- Discovery: `discovery.md`
- Design: `design.md`
- Root-cause evidence: live in5-game-cms recap; `author-result/v1` +
  `render.mjs` escaped single-paragraph rendering; write-only markdown
  content records
- Original editorial bar: `~/.agents/skills-backup/oat-explainer-kit-0.4.1/SKILL.md`
