---
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

## Phase rev2: Remote review fixes

Fix tasks from the `remote` PR #179 review
(`reviews/archived/remote-pr-179-review-2026-07-27T221652Z.md`): 4 Medium and
2 Minor findings from Cursor Bugbot, each independently reproduced at the root
before conversion. One finding's stated mechanism was disproved and re-scoped;
see `prev2-t06`.

Ordered so the two shell regressions this PR introduced land first — they
degrade every rendered deep-dive and are the cheapest to verify visually — then
the contract and plumbing fixes, then the dead-configuration cleanup.

Verification note: `node --test` requires glob patterns in this repo, never a
bare directory. Every task must leave core, adapter, smoke, and release suites
green. Tasks touching shell CSS must be confirmed in a browser against a
generated artifact, not by assertion alone: both regressions in this round were
invisible to the existing structural tests.

### Task prev2-t01: (review) Stop snippet code blocks rendering a double frame

**Files:**

- Modify: `.agents/skills/explainer-kit/templates/engineer-tour.html`
- Modify: `.agents/skills/explainer-kit/tests/templates.test.mjs`

**Step 1: Understand the issue**

Review finding M2, `engineer-tour.html:192`. The global `pre` rule sets
`border`, `border-radius`, and `background`. `.snippet pre` (`:115`) is more
specific but declares only `max-width`, `margin`, `overflow-x`, `padding`, and
`font-family`, so border and background fall through from the global rule.
`.snippet` (`:95`) already draws a border and background, so every expandable
snippet renders a frame nested inside a frame. Introduced by this PR when
narrative block styling was ported into the shell.

**Step 2: Implement fix**

Reset `border`, `border-radius`, and `background` on `.snippet pre` so the
`.snippet` panel owns the frame. Do not weaken the global `pre` rule — standalone
fenced code outside a snippet still needs it. Confirm `house-style.html` does not
have the same collision before assuming it is tour-only.

**Step 3: Verify**

Assert that `.snippet pre` neutralizes the frame the global `pre` rule applies.
Run: `node --test .agents/skills/explainer-kit/tests/*.test.mjs`
then `pnpm test:smoke`.
Then render an artifact containing an expandable snippet and confirm in a browser
that exactly one frame is drawn. Revert-verify: restore the unreset rule and
confirm the new assertion fails.
Expected: single frame; standalone fenced code unchanged.

**Step 4: Commit**

```bash
git add .agents/skills/explainer-kit/templates .agents/skills/explainer-kit/tests
git commit -m "fix(prev2-t01): stop snippet code blocks drawing a nested frame"
```

### Task prev2-t02: (review) Stop rail diagram labels inheriting the node stroke

**Files:**

- Modify: `.agents/skills/explainer-kit/templates/engineer-tour.html`
- Modify: `.agents/skills/explainer-kit/tests/templates.test.mjs`

**Step 1: Understand the issue**

Review finding m1, `engineer-tour.html:233`. `.diagram-card .node` sets `stroke`
and `stroke-width` on the `<g>` that wraps both the `<rect>` and the `<text>`
(see the markup emitted at `render.mjs:372`). SVG stroke presentation inherits to
children and `.diagram-card text` overrides `fill` only, so section labels render
as outlined glyphs. Introduced by this PR alongside M2.

**Step 2: Implement fix**

Scope the node stroke to the shape rather than the group — apply it to
`.diagram-card .node rect` — or explicitly clear `stroke` on
`.diagram-card text`. Prefer scoping to the shape so future node geometry
inherits the intended treatment. Keep the `:not(.active)` opacity behavior and
the existing transition working.

**Step 3: Verify**

Assert that label text is not stroked while node shapes still are.
Run: `node --test .agents/skills/explainer-kit/tests/*.test.mjs`
then `pnpm test:smoke`.
Then render a deep-dive and confirm in a browser that rail labels are legible
flat glyphs and active/inactive highlighting still works. Revert-verify the new
assertion.
Expected: unstroked labels; highlighting intact.

**Step 4: Commit**

```bash
git add .agents/skills/explainer-kit/templates .agents/skills/explainer-kit/tests
git commit -m "fix(prev2-t02): scope diagram node stroke to the shape"
```

### Task prev2-t03: (review) Pair legacy approval content paths with their authoring mode

**Files:**

- Modify: `.agents/skills/explainer-kit/scripts/lib/content-approval.mjs`
- Modify: `.agents/skills/explainer-kit/tests/content-approval.test.mjs`

**Step 1: Understand the issue**

Review finding M1, `content-approval.mjs:170`. `legacyFloorArtifacts` copies
`authoring` from the live v2 recipe (`artifact.authoring ?? 'markdown'`) but
hardcodes `contentPath: source/content/<id>.md`. An HTML floor artifact
normalizes to `authoring: 'html'` with a Markdown path, describing content the
artistic path cannot load or validate. Reachable through a bundled recipe:
`recipes/engineer-tour.json` declares its floor artifact as `authoring: html`.

**Step 2: Implement fix**

Derive the content path extension from the resolved `authoring` value so `html`
yields `source/content/<id>.html`. Use the same mapping the live path uses rather
than a second inline conditional, so the two cannot drift.

**Step 3: Verify**

Add a case normalizing a legacy approval for a recipe whose floor artifact is
`authoring: html`, and assert the path extension matches the authoring mode.
Run: `node --test .agents/skills/explainer-kit/tests/*.test.mjs`
then `pnpm test:smoke`.
Revert-verify: restore the hardcoded `.md` and confirm the new case fails.
Expected: html floor artifacts resolve to `.html`; markdown unchanged.

**Step 4: Commit**

```bash
git add .agents/skills/explainer-kit/scripts/lib .agents/skills/explainer-kit/tests
git commit -m "fix(prev2-t03): derive legacy approval content paths from authoring mode"
```

### Task prev2-t04: (review) Carry type-limit findings through the guideline checker

**Files:**

- Modify: `.agents/skills/explainer-kit/scripts/lib/qa.mjs`
- Modify: `.agents/skills/explainer-kit/tests/qa.test.mjs`

**Step 1: Understand the issue**

Review finding M3, `qa.mjs:850`. `addExpansionWarnings` filters
`expansion.warnings` through a `knownWarnings` set containing only
`expansionProfileLimit` and `expansionArtifactLimit`, and its rejected-reason
loop handles `profile-limit` and `recipe-limit` but not `type-limit`. So
`GUIDELINE_WARNING_IDS.expansionTypeLimit` is dead and declared `maxPerType`
overruns never reach the manifest.

This is a producer/consumer seam gap, not a producer bug: `recipes.mjs:189`
emits the warning and `tests/recipes.test.mjs:491` already asserts it lands in
`evaluated.warnings`. The passing producer test is what let the drop escape.

**Step 2: Implement fix**

Add `expansionTypeLimit` to `knownWarnings` and handle the `type-limit` rejected
reason alongside the other two. Check whether the three reason strings and three
warning IDs can be driven from one mapping rather than parallel lists, since this
is the second time they have drifted apart.

**Step 3: Verify**

Add a `checkGuidelines` case where proposals exceed a declared `maxPerType` and
assert `expansion-type-limit-exceeded` reaches the returned warnings — asserting
at the `checkGuidelines` boundary, not at `evaluateExpansionProposals`, since the
latter already passes.
Run: `node --test .agents/skills/explainer-kit/tests/*.test.mjs`
then `pnpm test:smoke`.
Revert-verify: remove the ID from `knownWarnings` and confirm the new case fails.
Expected: type-cap overruns surface as manifest warnings.

**Step 4: Commit**

```bash
git add .agents/skills/explainer-kit/scripts/lib .agents/skills/explainer-kit/tests
git commit -m "fix(prev2-t04): surface expansion type-limit findings in guideline checks"
```

### Task prev2-t05: (review) Apply the animation controls the probe request declares

**Files:**

- Modify: `.agents/skills/explainer-kit/scripts/lib/browser-runtime.mjs`
- Modify: `.agents/skills/explainer-kit/tests/browser-runtime.test.mjs`

**Step 1: Understand the issue**

Review finding M4, `browser-runtime.mjs:160`. `runBrowserProbes` sends
`disableAnimations` and `injectedCss` (`qa.mjs:490-491`), but
`probeRenderedPage` reads only `viewport`, `javascriptEnabled`, `media`,
`wideContent`, `evaluate`, and `themeToggle`. Both fields are dropped silently.

Scope correction from the review: the page context already sets
`reducedMotion: 'reduce'` (`:163`, and again for print at `:168`), so motion
gated on `prefers-reduced-motion` is suppressed today. The actual gaps are
animations not gated on that query, and `injectedCss` being ignored with no
error — which makes the `animations-enabled` check (`qa.mjs:557`) unable to
verify what it reports.

**Step 2: Implement fix**

Apply `injectedCss` to the page before navigation completes, and honor
`disableAnimations` with a stylesheet that neutralizes animation and transition
duration regardless of media query. Reject or warn on unrecognized request
fields rather than ignoring them, so a future dropped field fails loudly instead
of silently.

**Step 3: Verify**

Add a probe test asserting injected CSS is present in the page and that an
animation not gated on `prefers-reduced-motion` is neutralized when
`disableAnimations` is set.
Run: `node --test .agents/skills/explainer-kit/tests/*.test.mjs`
then `pnpm test:smoke` and the release visual gate
(`pnpm release:validate:visual`).
Revert-verify: drop the application and confirm the new assertions fail.
Expected: `animations-enabled` reflects real page state.

**Step 4: Commit**

```bash
git add .agents/skills/explainer-kit/scripts/lib .agents/skills/explainer-kit/tests
git commit -m "fix(prev2-t05): apply declared probe animation and CSS controls"
```

### Task prev2-t06: (review) Resolve the unused `shell` recipe key

**Files:**

- Modify: `.agents/skills/explainer-kit/scripts/lib/recipes.mjs`
- Modify: `.agents/skills/explainer-kit/tests/recipes.test.mjs`

**Step 1: Understand the issue**

Review finding m2, `recipes.mjs:437`. **Correction: this task previously carried
a re-scoping based on a false verification. Bugbot's original finding was right
and the re-scoping was wrong.** Treat the finding as reported.

`if ('shell' in profile)` validates `shell` only when the key is present, so an
`authoring: html` expansion profile without `shell` loads as valid and then fails
at authoring time reading `templates/undefined.html`.

This is reachable and reproduced. `run.mjs:865` passes `shell: profile.shell`
into the author request and `:866-869` sets `template` to `profile.shell` for
non-markdown authoring; `authorArtifact` then reads
`templates/${artifact.shell}.html` (`:990`, and again at `:468` on the
approval-resume path). With `shell` absent, both resolve to the literal string
`undefined`. The earlier claim that nothing reads `profile.shell` came from
searching only `scripts/lib/*.mjs` — the consuming code is in `scripts/run.mjs`.
`TEMPLATE_BY_TYPE` / `templateForType` governs only the `markdown` branch, not
the `html` branch.

Severity is medium, not minor. All four bundled recipes currently declare
`shell` for their html profiles, so this is latent for shipped recipes but breaks
any new or custom recipe that omits it, with an opaque `undefined.html` error.

**Step 2: Implement fix**

Require `shell` whenever `profile.authoring === 'html'`, rather than only
validating it when the key happens to be present. Keep it optional for
`markdown` profiles, which correctly resolve their template by type. Fail with a
message naming the profile and the missing key so the error is diagnosable at
recipe-load time instead of surfacing as a missing template file.

Do **not** remove the key — it is load-bearing for the html authoring path.

**Step 3: Verify**

Assert that an `authoring: html` profile without `shell` is rejected at recipe
load with a message naming the profile, that an `authoring: markdown` profile
without `shell` still loads, and that all four bundled recipes still load.
Run: `node --test .agents/skills/explainer-kit/tests/*.test.mjs`
then `pnpm test:smoke` and `pnpm release:validate`.
Revert-verify: restore the `'shell' in profile` guard and confirm the new
rejection case fails.
Expected: the invalid profile is caught at load time, never at
`templates/undefined.html`.

**Step 4: Commit**

```bash
git add .agents/skills/explainer-kit
git commit -m "fix(prev2-t06): resolve the unused shell recipe key"
```

## Reviews

| Scope  | Type      | Status          | Date       | Artifact                                                    |
| ------ | --------- | --------------- | ---------- | ----------------------------------------------------------- |
| plan   | artifact  | fixes_completed | 2026-07-25 | reviews/artifact-plan-review-2026-07-25T183814Z.md          |
| plan   | artifact  | fixes_completed | 2026-07-25 | reviews/artifact-plan-review-2026-07-25T190445Z.md          |
| plan   | artifact  | fixes_completed | 2026-07-25 | reviews/artifact-plan-review-2026-07-25T191042Z.md          |
| plan   | artifact  | fixes_completed | 2026-07-25 | reviews/artifact-plan-review-2026-07-25T194853Z.md          |
| plan   | artifact  | fixes_completed | 2026-07-25 | reviews/artifact-plan-review-2026-07-25T202242Z.md          |
| plan   | artifact  | fixes_completed | 2026-07-25 | reviews/artifact-plan-review-2026-07-25T204842Z.md          |
| final  | code      | fixes_added     | 2026-07-26 | reviews/archived/final-review-2026-07-26T155422Z.md         |
| final  | code      | fixes_completed | 2026-07-26 | reviews/archived/final-review-2026-07-26T155422Z.md         |
| remote | github-pr | fixes_completed | 2026-07-27 | reviews/archived/remote-pr-179-review-2026-07-27T221652Z.md |
| remote | github-pr | passed          | 2026-07-27 | reviews/archived/remote-pr-179-review-2026-07-27T234422Z.md |

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
- Phase rev2: 6 tasks — remote PR #179 review fixes (4 Medium, 2 Minor)

**Total: 36 planned tasks** (20 original + 16 review fixes; 23 implementation
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
