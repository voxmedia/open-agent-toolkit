---
oat_plan_source: quick
oat_status: complete
oat_ready_for: oat-project-implement
oat_blockers: []
oat_last_updated: 2026-06-05
oat_phase: plan
oat_phase_status: complete
oat_plan_parallel_groups:
  - ['p03', 'p04', 'p05']
oat_plan_hill_phases:
  - p06
oat_auto_review_at_hill_checkpoints: true
oat_import_reference: null
oat_import_source_path: null
oat_import_provider: null
oat_generated: false
---

# Implementation Plan: docs-authoring-skills

> Execute this plan using `oat-project-implement`. The first two phases establish skill boundaries, the middle three phases may run in isolated parallel worktrees, and the final phase integrates distribution, versioning, and release validation.

**Goal:** Ship a layered documentation-authoring ecosystem for OAT: an agnostic `authoring-docs` baseline, a thin OAT/Fumadocs `oat-docs-authoring` wrapper, targeted `oat-docs-analyze` and `oat-docs-bootstrap` improvements, and a standalone MkDocs-to-OAT-Fumadocs migration handoff guide.

**Architecture:** Research artifacts feed the agnostic baseline, the wrapper layers the OAT/Fumadocs contract on top, existing lifecycle skills consume the contract where they own enforcement or scaffold guidance, and final distribution/versioning work makes the shipped asset set coherent.

**Tech Stack:** Agent Skills open standard, OAT workflow skills, TypeScript/Node CLI tooling, pnpm workspaces, Turborepo, Fumadocs/Next.js docs app, oxlint/oxfmt, Vitest where TypeScript behavior changes.

**Commit Convention:** `{type}({scope}): {description}` with task IDs in implementation commits when useful, for example `feat(p02-t01): add oat docs authoring skill`.

## Parallelism

Phases `p01` and `p02` run sequentially. `p02` depends on the baseline skill from `p01` so the wrapper can reference a stable agnostic contract instead of duplicating universal writing guidance.

After `p02`, phases `p03`, `p04`, and `p05` may run concurrently in isolated worktrees because their write boundaries are intentionally disjoint:

- `p03` owns `oat-docs-analyze` skill instructions and references, plus analyzer-specific tests only if implementation adds TypeScript behavior.
- `p04` owns `oat-docs-bootstrap` bootstrap guidance/templates and OAT docs contract pages.
- `p05` owns the standalone migration guide under the brainstorm reference directory.

Phase `p06` must run after the parallel group merges. It owns shared distribution files, provider sync output, lockstep public package version bumps, generated assets, and repository-wide validation. No earlier phase should edit public package versions or bundled skill manifests except where explicitly assigned in `p06`.

The frontmatter `oat_plan_parallel_groups` value is authoritative. The following block mirrors that value for readability and must be kept aligned if the frontmatter changes:

```yaml
oat_plan_parallel_groups:
  - ['p03', 'p04', 'p05']
```

## Phase p01: Build the agnostic `authoring-docs` baseline

### Task p01-t01: Define the baseline skill structure

**Files:**

- Create: `.agents/skills/authoring-docs/SKILL.md`
- Create: `.agents/skills/authoring-docs/references/` files as needed
- Read: `.agents/skills/create-agnostic-skill/SKILL.md`
- Read: `.oat/projects/shared/docs-authoring-skills/reference/docs-authoring-skill/SKILL.md`
- Read: `.oat/projects/shared/docs-authoring-skills/reference/docs-authoring-skill/01-principles.md`
- Read: `.oat/projects/shared/docs-authoring-skills/reference/docs-authoring-skill/02-agent-workflow.md`
- Read: `.oat/projects/shared/docs-authoring-skills/reference/docs-authoring-skill/03-information-architecture.md`
- Read: `.oat/projects/shared/docs-authoring-skills/reference/docs-authoring-skill/04-page-types.md`
- Read: `.oat/projects/shared/docs-authoring-skills/reference/docs-authoring-skill/05-writing-style.md`
- Read: `.oat/projects/shared/docs-authoring-skills/reference/docs-authoring-skill/14-review-rubric.md`

**Step 1: Reconfirm conventions**

Read the agnostic skill creation guidance and source research pack. Confirm the new skill starts at `version: 1.0.0`, uses a single-line description under 500 characters, remains provider-agnostic, and follows progressive disclosure.

**Step 2: Create the entrypoint**

Create `SKILL.md` with a concise trigger, when-to-use/when-not-to-use boundaries, an evidence-first workflow, and references to deeper guidance files.

**Step 3: Split deeper material into references**

Move reusable details into reference files instead of overloading `SKILL.md`: principles, workflow, information architecture, page types, writing style, templates, and review rubric.

**Step 4: Verify**

Run: `pnpm oat:validate-skills`
Expected: skill validation passes, including frontmatter and required skill-file structure.

**Step 5: Commit**

Run: `git add .agents/skills/authoring-docs && git commit -m "feat(p01-t01): add authoring docs baseline skill"`

---

### Task p01-t02: Cover documentation categories without OAT coupling

**Files:**

- Modify: `.agents/skills/authoring-docs/SKILL.md`
- Modify/Create: `.agents/skills/authoring-docs/references/*.md`
- Read: `.oat/projects/shared/docs-authoring-skills/reference/docs-authoring-skill/07-api-docs.md`
- Read: `.oat/projects/shared/docs-authoring-skills/reference/docs-authoring-skill/08-cli-docs.md`
- Read: `.oat/projects/shared/docs-authoring-skills/reference/docs-authoring-skill/09-app-service-docs.md`
- Read: `.oat/projects/shared/docs-authoring-skills/reference/docs-authoring-skill/10-library-framework-docs.md`
- Read: `.oat/projects/shared/docs-authoring-skills/reference/docs-authoring-skill/03-information-architecture.md`
- Read: `.oat/projects/shared/docs-authoring-skills/reference/docs-authoring-skill/11-architecture-operations-docs.md`
- Read: `.oat/projects/shared/docs-authoring-skills/reference/docs-authoring-skill/12-internal-vs-public.md`

**Step 1: Add category guidance**

Add category-specific guidance for APIs, CLIs, apps/services, libraries/frameworks, monorepos, architecture/operations, and internal/public docs.

**Step 2: Keep the baseline portable**

Remove or relocate any OAT/Fumadocs-only assumptions from the baseline. The baseline may discuss Markdown hygiene generally, but OAT `index.md`, generated-index, and Fumadocs conventions belong to `oat-docs-authoring`.

**Step 3: Verify**

Run: `grep -R "OAT\|Fumadocs\|fumadocs" .agents/skills/authoring-docs || true`
Expected: any matches are intentional context labels, not normative OAT/Fumadocs instructions.

Run: `pnpm oat:validate-skills`
Expected: validation passes.

**Step 4: Commit**

Run: `git add .agents/skills/authoring-docs && git commit -m "feat(p01-t02): expand authoring docs category guidance"`

---

### Task p01-t03: Add templates and review rubric guidance

**Files:**

- Modify/Create: `.agents/skills/authoring-docs/references/*.md`
- Read: `.oat/projects/shared/docs-authoring-skills/reference/docs-authoring-skill/13-templates.md`
- Read: `.oat/projects/shared/docs-authoring-skills/reference/docs-authoring-skill/16-docs-audit-prompts.md`
- Read: `.oat/projects/shared/docs-authoring-skills/reference/docs-authoring-skill/manifest.json`

**Step 1: Add reusable templates**

Add concise templates for common page types and handoff summaries. Keep examples generic and repository-agnostic.

**Step 2: Add review rubric**

Add a rubric that checks evidence, reader task support, navigation, operational safety, public/internal boundaries, and maintainability.

**Step 3: Cross-check source coverage**

Compare the new references against the imported manifest and research pack. Preserve useful guidance, but avoid copying low-signal prose that would bloat the skill.

**Step 4: Verify**

Run: `pnpm oat:validate-skills`
Expected: validation passes.

**Step 5: Commit**

Run: `git add .agents/skills/authoring-docs && git commit -m "feat(p01-t03): add docs authoring templates and rubric"`

---

### Task p01-t04: Baseline acceptance review

**Files:**

- Modify: `.agents/skills/authoring-docs/SKILL.md`
- Modify: `.agents/skills/authoring-docs/references/*.md`

**Step 1: Self-review against discovery criteria**

Confirm the skill satisfies these baseline requirements:

- evidence-first authoring;
- page-type guidance;
- category-specific guidance;
- templates and rubric;
- no OAT/Fumadocs-specific authoring contract;
- provider-portable skill format.

**Step 2: Apply cleanup**

Fix unclear trigger wording, overlong sections, duplicated material, or missing reference links.

**Step 3: Verify**

Run: `pnpm oat:validate-skills`
Expected: validation passes.

**Step 4: Commit**

Run: `git add .agents/skills/authoring-docs && git commit -m "chore(p01-t04): polish authoring docs baseline"`

---

## Phase p02: Build the `oat-docs-authoring` wrapper

### Task p02-t01: Create the wrapper skill entrypoint

**Files:**

- Create: `.agents/skills/oat-docs-authoring/SKILL.md`
- Create: `.agents/skills/oat-docs-authoring/references/` files as needed
- Read: `.agents/skills/create-oat-skill/SKILL.md`
- Read: `.agents/skills/authoring-docs/SKILL.md`
- Read: `.oat/projects/shared/docs-authoring-skills/reference/docs-authoring-skill/oat-docs-authoring-wrapper-pattern-analysis.md`
- Read: `.oat/projects/shared/docs-authoring-skills/reference/docs-authoring-skill/brainstorm-notes.md`

**Step 1: Apply OAT skill conventions**

Create a user-invocable `oat-docs-authoring` skill at `version: 1.0.0` with OAT progress indicators, mode boundaries, and a clear trigger for targeted authoring or restructuring inside OAT/Fumadocs docs apps.

**Step 2: Reference the baseline**

Tell agents to use `authoring-docs` for universal docs-writing standards and keep the wrapper focused on OAT/Fumadocs placement, navigation, generated artifacts, validation, and lifecycle boundaries.

**Step 3: Verify**

Run: `pnpm oat:validate-skills`
Expected: validation passes.

**Step 4: Commit**

Run: `git add .agents/skills/oat-docs-authoring && git commit -m "feat(p02-t01): add oat docs authoring wrapper skill"`

---

### Task p02-t02: Add OAT/Fumadocs contract references

**Files:**

- Modify: `.agents/skills/oat-docs-authoring/SKILL.md`
- Create/Modify: `.agents/skills/oat-docs-authoring/references/*.md`
- Read: `apps/oat-docs/AGENTS.md`
- Read: `.agents/skills/oat-docs-bootstrap/assets/AGENTS.md.template`
- Read: `.agents/skills/oat-docs-analyze/references/quality-checklist.md`
- Read: `.agents/skills/oat-docs-analyze/references/directory-assessment-criteria.md`

**Step 1: Document docs-root resolution**

Add guidance to resolve the docs app root and authored docs root from `.oat/config.json`, package scripts, Fumadocs files, and local `AGENTS.md` files instead of assuming a path.

**Step 2: Document the authoring contract**

Add references for authored `docs/**/index.md`, `## Contents`, `.md`-suffixed relative links, child `subdir/index.md` links, default `.md`, limited `.mdx`, no `overview.md`, generated root index boundaries, and asset-only directory exceptions.

**Step 3: Document validation**

Add validation guidance to run local docs scripts, regenerate or freshness-check generated root indexes, and spot-check rendering when syntax or migration-sensitive content changes.

**Step 4: Verify**

Run: `pnpm oat:validate-skills`
Expected: validation passes.

**Step 5: Commit**

Run: `git add .agents/skills/oat-docs-authoring && git commit -m "feat(p02-t02): document oat fumadocs authoring contract"`

---

### Task p02-t03: Encode lifecycle boundaries and migration pointers

**Files:**

- Modify: `.agents/skills/oat-docs-authoring/SKILL.md`
- Modify/Create: `.agents/skills/oat-docs-authoring/references/*.md`
- Read: `.agents/skills/oat-docs-bootstrap/SKILL.md`
- Read: `.agents/skills/oat-docs-analyze/SKILL.md`
- Read: `.agents/skills/oat-docs-apply/SKILL.md`
- Read: `.agents/skills/oat-project-document/SKILL.md`
- Read: `.oat/projects/shared/docs-authoring-skills/reference/docs-authoring-skill/mkdocs-to-oat-fumadocs-refactor-guide.md`

**Step 1: Add routing rules**

Route lifecycle-sized work to existing skills:

- new docs app setup -> `oat-docs-bootstrap`;
- read-only audits -> `oat-docs-analyze`;
- approved bulk changes -> `oat-docs-apply`;
- project-derived docs deltas -> `oat-project-document`;
- MkDocs-to-OAT-Fumadocs migration -> standalone migration guide.

**Step 2: Add self-correction rules**

Warn the agent to stop if it starts hand-editing generated files, treating generated root indexes as source, doing a broad audit manually, or turning bootstrap into migration.

**Step 3: Verify**

Run: `pnpm oat:validate-skills`
Expected: validation passes.

**Step 4: Commit**

Run: `git add .agents/skills/oat-docs-authoring && git commit -m "feat(p02-t03): add oat docs authoring lifecycle boundaries"`

---

### Task p02-t04: Wrapper acceptance review

**Files:**

- Modify: `.agents/skills/oat-docs-authoring/SKILL.md`
- Modify: `.agents/skills/oat-docs-authoring/references/*.md`

**Step 1: Review against wrapper analysis**

Confirm the wrapper covers the top findings from the cross-repo wrapper analysis without duplicating the agnostic baseline.

**Step 2: Apply cleanup**

Fix over-broad instructions, duplicated generic writing guidance, or lifecycle ambiguity.

**Step 3: Verify**

Run: `pnpm oat:validate-skills`
Expected: validation passes.

**Step 4: Commit**

Run: `git add .agents/skills/oat-docs-authoring && git commit -m "chore(p02-t04): polish oat docs authoring wrapper"`

---

## Phase p03: Improve `oat-docs-analyze` checks and references

### Task p03-t01: Confirm analyzer implementation boundary

**Files:**

- Read: `.agents/skills/oat-docs-analyze/SKILL.md`
- Read: `.agents/skills/oat-docs-analyze/references/analysis-artifact-template.md`
- Read: `.agents/skills/oat-docs-analyze/references/quality-checklist.md`
- Read: `.agents/skills/oat-docs-analyze/references/directory-assessment-criteria.md`
- Read: `packages/cli/AGENTS.md`
- Read: `packages/cli/src/commands/docs/analyze.ts`
- Read: `.oat/projects/shared/docs-authoring-skills/reference/docs-authoring-skill/oat-docs-analyze-improvement-recommendations.md`

**Step 1: Inspect current boundaries**

Confirm whether implementation can stay in the skill and reference artifacts. The current CLI `oat docs analyze` is a guidance shim to the skill; do not rewrite it unless a concrete non-mutating primitive is needed.

**Step 2: Choose the minimal implementation surface**

Default to updating `oat-docs-analyze` instructions/references. If TypeScript CLI behavior is added, follow `packages/cli/AGENTS.md`, keep handlers thin, add tests, and avoid parent-relative imports.

**Step 3: Prepare boundary handoff note**

Prepare a concise boundary note for the phase handoff/status output so future maintainers know whether analyzer changes are skill-only or include CLI support. Do not edit shared project tracking files such as `implementation.md` from the parallel `p03` worktree; final tracking updates are centralized after fan-in.

**Step 4: Verify**

Run: `pnpm oat:validate-skills`
Expected: current skill set still validates before behavior edits.

**Step 5: Commit**

Run: `git add .agents/skills/oat-docs-analyze packages/cli/src/commands/docs && git diff --cached --quiet || git commit -m "chore(p03-t01): confirm analyzer implementation boundary"`

---

### Task p03-t02: Add generated-index and local-map checks

**Files:**

- Modify: `.agents/skills/oat-docs-analyze/SKILL.md`
- Modify: `.agents/skills/oat-docs-analyze/references/analysis-artifact-template.md`

**Step 1: Bump skill version**

Bump `oat-docs-analyze` frontmatter from `1.3.0` to the appropriate next semver version, expected `1.4.0` for backward-compatible analysis behavior additions.

**Step 2: Extend analysis workflow**

Add explicit read-only checks for generated root index existence, generated warning banners, freshness, stale entries, missing entries, ordering drift, generated entries not reachable from authored `## Contents`, and generator-semantics uncertainty.

**Step 3: Extend artifact output**

Ensure analysis artifacts can classify generated-index findings as missing output, ignored/local output, stale output, authored-source contract drift, or unclear generator semantics. Require exact evidence paths and prohibit hand-editing generated files.

**Step 4: Verify**

Run: `pnpm oat:validate-skills`
Expected: validation passes.

**Step 5: Commit**

Run: `git add .agents/skills/oat-docs-analyze && git commit -m "feat(p03-t02): add generated index analysis checks"`

---

### Task p03-t03: Add link, Contents, and Markdown hygiene checks

**Files:**

- Modify: `.agents/skills/oat-docs-analyze/SKILL.md`
- Modify: `.agents/skills/oat-docs-analyze/references/quality-checklist.md`
- Modify: `.agents/skills/oat-docs-analyze/references/directory-assessment-criteria.md`
- Modify: `.agents/skills/oat-docs-analyze/references/analysis-artifact-template.md`

**Step 1: Expand authored-link checks**

Add checks for broken local relative Markdown links, extensionless local links in OAT/Fumadocs docs apps, anchors on `.md` links, and false-positive avoidance for inline-code examples.

**Step 2: Expand `index.md` checks**

Add placeholder-only `## Contents` detection, parent map coverage for immediate child directories, single-page directory guidance, asset-only exemptions, lingering `overview.md`, and unexpected `.mdx` for plain content.

**Step 3: Add Markdown hygiene checks**

Add checks for unlabeled code fences, shell fence convention drift, empty headings, multiple H1s outside intentional imports, overlong or ellipsis-truncated descriptions when local guidance defines limits, and README-copy metadata signals.

**Step 4: Verify**

Run: `pnpm oat:validate-skills`
Expected: validation passes.

**Step 5: Commit**

Run: `git add .agents/skills/oat-docs-analyze && git commit -m "feat(p03-t03): expand docs analysis hygiene checks"`

---

### Task p03-t04: Add docs-app guidance and coverage checks

**Files:**

- Modify: `.agents/skills/oat-docs-analyze/SKILL.md`
- Modify: `.agents/skills/oat-docs-analyze/references/quality-checklist.md`
- Modify: `.agents/skills/oat-docs-analyze/references/analysis-artifact-template.md`

**Step 1: Add local guidance checks**

Tell the analyzer to verify docs-app `AGENTS.md` or contributing docs cover authored docs location, generated root manifests, `index.md`, `## Contents`, `.md` links, `.md` vs `.mdx`, analyze/apply boundaries, and generated artifact freshness.

**Step 2: Add coverage checks**

Add app/service, API, CLI, and operations coverage checks from the recommendation artifact, including owner-reviewed gaps for unsupported or unverifiable claims.

**Step 3: Verify**

Run: `pnpm oat:validate-skills`
Expected: validation passes.

**Step 4: Commit**

Run: `git add .agents/skills/oat-docs-analyze && git commit -m "feat(p03-t04): add docs guidance and coverage checks"`

---

### Task p03-t05: Analyzer validation pass

**Files:**

- Modify if needed: `.agents/skills/oat-docs-analyze/**`
- Modify if needed: `packages/cli/src/commands/docs/analyze.ts`
- Modify if needed: `packages/cli/src/commands/docs/*.test.ts`

**Step 1: Run skill validation**

Run: `pnpm oat:validate-skills`
Expected: validation passes.

**Step 2: Run TypeScript tests only if CLI behavior changed**

If any `packages/cli/src/**` file changed, run: `pnpm --filter @open-agent-toolkit/cli test`
Expected: CLI tests pass.

**Step 3: Apply fixes**

Fix validator or test failures within the analyzer-owned files. Do not broaden into docs content fixes for the seven analyzed repos.

**Step 4: Commit**

Run: `git add .agents/skills/oat-docs-analyze packages/cli/src/commands/docs && git diff --cached --quiet || git commit -m "test(p03-t05): validate docs analysis updates"`

---

## Phase p04: Refine bootstrap guidance and OAT docs contract pages

### Task p04-t01: Clarify bootstrap generated-index behavior

**Files:**

- Modify: `.agents/skills/oat-docs-bootstrap/SKILL.md`
- Modify: `.agents/skills/oat-docs-bootstrap/assets/AGENTS.md.template`
- Read: `.oat/projects/shared/docs-authoring-skills/reference/docs-authoring-skill/oat-docs-bootstrap-gotchas.md`
- Read: `.oat/projects/shared/docs-authoring-skills/reference/docs-authoring-skill/oat-docs-analyze-improvement-recommendations.md`

**Step 1: Bump skill version**

Bump `oat-docs-bootstrap` frontmatter from `1.0.1` to the appropriate next semver version, expected `1.1.0` for backward-compatible bootstrap guidance additions.

**Step 2: Clarify generated artifacts**

Update bootstrap guidance and the scaffolded `AGENTS.md` template so new docs apps explain generated root indexes, generated warning banners, source `## Contents` maps, and freshness/regeneration expectations.

**Step 3: Keep migration out of bootstrap**

Remove or avoid instructions that make `oat-docs-bootstrap` own MkDocs migration. Bootstrap may detect existing docs and point to a migration guide, but it should not become the migration workflow.

**Step 4: Verify**

Run: `pnpm oat:validate-skills`
Expected: validation passes.

**Step 5: Commit**

Run: `git add .agents/skills/oat-docs-bootstrap && git commit -m "feat(p04-t01): clarify bootstrap generated index guidance"`

---

### Task p04-t02: Update OAT docs index contract semantics

**Files:**

- Modify: `apps/oat-docs/docs/reference/docs-index-contract.md`
- Modify if needed: `apps/oat-docs/docs/contributing/documentation.md`
- Modify if needed: `apps/oat-docs/docs/reference/index.md`
- Read: `apps/oat-docs/AGENTS.md`

**Step 1: Separate Fumadocs and MkDocs generated artifacts**

Clarify that Fumadocs docs apps use an app-root generated `index.md` manifest, while MkDocs flows may use `oat docs nav sync` to update `mkdocs.yml`. Do not imply Fumadocs currently uses MkDocs nav sync.

**Step 2: Reinforce authored-source contract**

Keep `docs/**/index.md` plus `## Contents` as the authored source of truth and explain `.md` link expectations, generated-file boundaries, and freshness checks.

**Step 3: Verify local docs lint**

Run: `pnpm --filter oat-docs docs:lint`
Expected: docs lint passes.

**Step 4: Commit**

Run: `git add apps/oat-docs/docs/reference/docs-index-contract.md apps/oat-docs/docs/contributing/documentation.md apps/oat-docs/docs/reference/index.md && git diff --cached --quiet || git commit -m "docs(p04-t02): clarify docs index contract semantics"`

---

### Task p04-t03: Align bootstrap-related docs references

**Files:**

- Modify if needed: `apps/oat-docs/docs/docs-tooling/add-docs-to-a-repo.md`
- Modify if needed: `apps/oat-docs/docs/docs-tooling/commands.md`
- Modify if needed: `apps/oat-docs/docs/docs-tooling/workflows.md`
- Modify if needed: `apps/oat-docs/docs/reference/docs-index-contract.md`

**Step 1: Inspect current docs-tooling pages**

Read the relevant docs-tooling pages and update only bootstrap-relevant wording that now contradicts the generated-index and authored-Contents contract.

**Step 2: Avoid migration expansion**

If migration is mentioned, link or point to the standalone migration guide conceptually; do not add a migration workflow to bootstrap docs.

**Step 3: Verify local docs lint**

Run: `pnpm --filter oat-docs docs:lint`
Expected: docs lint passes.

**Step 4: Commit**

Run: `git add apps/oat-docs/docs && git diff --cached --quiet || git commit -m "docs(p04-t03): align docs bootstrap references"`

---

### Task p04-t04: Bootstrap/docs validation pass

**Files:**

- Modify if needed: `.agents/skills/oat-docs-bootstrap/**`
- Modify if needed: `apps/oat-docs/docs/**`

**Step 1: Run skill validation**

Run: `pnpm oat:validate-skills`
Expected: validation passes.

**Step 2: Run docs validation**

Run: `pnpm --filter oat-docs docs:lint`
Expected: docs lint passes.

Run: `pnpm build:docs`
Expected: docs site and dependencies build successfully.

**Step 3: Apply fixes**

Fix only bootstrap/docs-contract issues introduced by this phase.

**Step 4: Commit**

Run: `git add .agents/skills/oat-docs-bootstrap apps/oat-docs/docs && git diff --cached --quiet || git commit -m "test(p04-t04): validate bootstrap docs guidance"`

---

## Phase p05: Polish the standalone migration handoff guide

### Task p05-t01: Audit guide scope and contradictions

**Files:**

- Modify: `.oat/projects/shared/docs-authoring-skills/reference/docs-authoring-skill/mkdocs-to-oat-fumadocs-refactor-guide.md`
- Read: `.oat/projects/shared/docs-authoring-skills/reference/docs-authoring-skill/oat-docs-bootstrap-gotchas.md`
- Read: `.oat/projects/shared/docs-authoring-skills/reference/docs-authoring-skill/oat-docs-authoring-wrapper-pattern-analysis.md`

**Step 1: Review the guide as an agent handoff**

Read the guide from the perspective of an agent tasked with migrating one remaining MkDocs repo. Identify missing preflight steps, ambiguous validation expectations, and any statements that imply bootstrap owns migration.

**Step 2: Remove contradictions**

Keep the guide standalone. It can refer to OAT docs conventions and bootstrap outputs, but it must not tell the agent to modify `oat-docs-bootstrap` or treat bootstrap as the migration workflow.

**Step 3: Verify**

Run: `pnpm oat:validate-skills`
Expected: skill validation still passes. Formatting for the standalone guide is covered by the final repository `pnpm format` check unless implementation discovers an existing supported scoped formatter command.

**Step 4: Commit**

Run: `git add .oat/projects/shared/docs-authoring-skills/reference/docs-authoring-skill/mkdocs-to-oat-fumadocs-refactor-guide.md && git commit -m "docs(p05-t01): audit migration handoff guide scope"`

---

### Task p05-t02: Add execution-ready migration flow

**Files:**

- Modify: `.oat/projects/shared/docs-authoring-skills/reference/docs-authoring-skill/mkdocs-to-oat-fumadocs-refactor-guide.md`

**Step 1: Add a crisp agent prompt section**

Add or improve a handoff prompt that states the target repo input, expected branch/PR behavior, inventory requirements, migration phases, validation commands to discover locally, and final report expectations.

**Step 2: Add migration phases**

Ensure the guide has actionable phases for preflight inventory, scaffold/app shell alignment, content conversion, navigation/index conversion, source-reference repair, render verification, OAT config updates, docs instruction surfaces, and final validation.

**Step 3: Add owner-review and uncertainty handling**

Tell agents to mark unverifiable commands, deploy paths, ownership/support claims, external integrations, and stale architecture claims for owner review instead of guessing.

**Step 4: Verify**

Run: `pnpm oat:validate-skills`
Expected: skill validation still passes; the guide is not a skill but this catches accidental skill breakage from nearby edits if any.

**Step 5: Commit**

Run: `git add .oat/projects/shared/docs-authoring-skills/reference/docs-authoring-skill/mkdocs-to-oat-fumadocs-refactor-guide.md && git commit -m "docs(p05-t02): make migration guide execution ready"`

---

### Task p05-t03: Final guide polish and handoff check

**Files:**

- Modify: `.oat/projects/shared/docs-authoring-skills/reference/docs-authoring-skill/mkdocs-to-oat-fumadocs-refactor-guide.md`

**Step 1: Review against prior refactor lessons**

Confirm the guide preserves the Duet/Honeycomb lessons: inventory before editing, current source over stale docs, integration path gravity, authored `index.md` maps, render checks beyond build, formatter hazards, OAT config validity, build/dev isolation, and accuracy audits.

**Step 2: Polish for standalone use**

Ensure all citations and paths are useful context but not required for the migration agent to run. Make the first-page instructions concise enough to hand off directly.

**Step 3: Verify**

Run: `pnpm format`
Expected: repository formatting check passes, or any failures are fixed before commit. This may not cover `.oat/repo/reference/**` Markdown; guide quality is also verified by the prior-refactor lesson review and standalone handoff check in Steps 1 and 2.

**Step 4: Commit**

Run: `git add .oat/projects/shared/docs-authoring-skills/reference/docs-authoring-skill/mkdocs-to-oat-fumadocs-refactor-guide.md && git commit -m "docs(p05-t03): polish migration handoff guide"`

---

## Phase p06: Register, version, sync, and validate the shipped asset set

### Task p06-t01: Register new docs skills for distribution

**Files:**

- Modify: `packages/cli/src/commands/init/tools/shared/skill-manifest.ts`
- Modify: `packages/cli/scripts/bundle-assets.sh`
- Modify if needed: `packages/cli/src/commands/init/tools/docs/index.test.ts`
- Modify if needed: `packages/cli/src/commands/init/tools/shared/bundle-consistency.test.ts`
- Read: `packages/cli/AGENTS.md`

**Step 1: Add skills to docs pack**

Add `authoring-docs` and `oat-docs-authoring` to `DOCS_SKILLS` so `oat init tools docs` can install them. Keep ordering consistent with the existing manifest style.

**Step 2: Add skills to bundled assets**

Add both skill names to `packages/cli/scripts/bundle-assets.sh` `SKILLS` so the build includes them in `packages/cli/assets/skills`.

**Step 3: Update tests only if required**

Run the relevant CLI tests and update expectations only when the new docs skills change exact output or selection assertions.

**Step 4: Verify**

Run: `pnpm --filter @open-agent-toolkit/cli test -- src/commands/init/tools/docs/index.test.ts src/commands/init/tools/shared/bundle-consistency.test.ts`
Expected: docs pack install and bundle consistency tests pass. If Vitest does not accept this exact path form, run `pnpm --filter @open-agent-toolkit/cli test` and record the broader command.

**Step 5: Commit**

Run: `git add packages/cli/src/commands/init/tools packages/cli/scripts/bundle-assets.sh && git commit -m "feat(p06-t01): register docs authoring skills"`

---

### Task p06-t02: Sync provider views

**Files:**

- Modify generated/provider-linked files as produced by sync tooling, commonly under `.claude/`, `.cursor/`, `.codex/`, or related provider views
- Modify if produced: `.oat/sync/manifest.json`

**Step 1: Run sync**

Run: `oat sync --scope all`
Expected: provider-linked views refresh from canonical `.agents/skills` content.

**Step 2: Inspect generated changes**

Confirm generated views reflect canonical skills and do not introduce hand-authored divergence.

**Step 3: Verify**

Run: `git --no-pager diff -- .agents .claude .cursor .codex .oat/sync`
Expected: provider-linked views mirror canonical skill changes and contain no hand-authored-only edits.

**Step 4: Commit**

Run: `git add .claude .cursor .codex .oat/sync && git diff --cached --quiet || git commit -m "chore(p06-t02): sync provider skill views"`

---

### Task p06-t03: Apply lockstep public package version bumps

**Files:**

- Modify: `packages/cli/package.json`
- Modify: `packages/control-plane/package.json`
- Modify: `packages/docs-config/package.json`
- Modify: `packages/docs-theme/package.json`
- Modify: `packages/docs-transforms/package.json`
- Modify if needed: `pnpm-lock.yaml`

**Step 1: Determine next version**

Because `.agents/skills`, `apps/oat-docs/docs`, and bundled assets are shipped functionality, bump all five public package versions together. Expected next patch version from the current tree is `0.1.22`; if the base changed, use the next appropriate lockstep version.

**Step 2: Update package metadata**

Update all five public package `version` fields to the same value. Refresh `pnpm-lock.yaml` if pnpm records workspace package versions there.

**Step 3: Verify version policy**

Run: `pnpm release:check-versions`
Expected: no lockstep version-bump errors.

**Step 4: Commit**

Run: `git add packages/cli/package.json packages/control-plane/package.json packages/docs-config/package.json packages/docs-theme/package.json packages/docs-transforms/package.json pnpm-lock.yaml && git commit -m "chore(p06-t03): bump public package versions"`

---

### Task p06-t04: Run targeted validation after integration

**Files:**

- Modify if needed: files changed by earlier phases
- Generated if build runs: `packages/cli/assets/**`

**Step 1: Validate skills**

Run: `pnpm oat:validate-skills`
Expected: all canonical skills pass validation.

**Step 2: Run CLI tests**

Run: `pnpm --filter @open-agent-toolkit/cli test`
Expected: CLI tests pass, including bundle consistency and docs pack install tests.

**Step 3: Run docs validation**

Run: `pnpm --filter oat-docs docs:lint`
Expected: docs lint passes.

**Step 4: Commit fixes or generated assets if needed**

Run: `git add . && git diff --cached --quiet || git commit -m "test(p06-t04): validate integrated docs authoring changes"`

---

### Task p06-t05: Build and release-validate public packages

**Files:**

- Modify if generated and tracked: `packages/cli/assets/**`
- Modify if package metadata/build artifacts require updates: package files from changed public packages

**Step 1: Build packages**

Run: `pnpm build`
Expected: workspace build excluding docs succeeds and CLI assets are regenerated.

**Step 2: Build docs**

Run: `pnpm build:docs`
Expected: docs site and its dependencies build successfully.

**Step 3: Run release validation**

Run: `pnpm release:validate`
Expected: public package contract and version-policy validation pass.

**Step 4: Commit generated asset changes if tracked**

Run: `git add packages/cli/assets && git diff --cached --quiet || git commit -m "chore(p06-t05): regenerate bundled assets"`

---

### Task p06-t06: Final repository validation and handoff

**Files:**

- Modify: `.oat/projects/shared/docs-authoring-skills/implementation.md`
- Modify if needed: `.oat/projects/shared/docs-authoring-skills/state.md`
- Modify if needed: `.oat/projects/shared/docs-authoring-skills/plan.md`

**Step 1: Run final checks**

Run these commands unless an earlier command failure makes a later one meaningless:

- `pnpm format`
- `pnpm lint`
- `pnpm type-check`
- `pnpm test`
- `pnpm build`
- `pnpm build:docs`
- `pnpm release:validate`

Expected: all pass. If a command is too expensive or fails due to an unrelated existing issue, record exact output and rationale in `implementation.md`.

**Step 2: Review release policy**

Confirm every changed canonical skill has a correct frontmatter version bump, all five public package versions are lockstep, provider views were synced, and `pnpm release:validate` passed.

**Step 3: Update implementation tracker**

Mark plan tasks complete in `implementation.md`, update final summary, record validation results, and update `state.md` for implementation completion only when all implementation work is actually complete.

**Step 4: Commit final tracking updates**

Run: `git add .oat/projects/shared/docs-authoring-skills && git diff --cached --quiet || git commit -m "chore(p06-t06): complete docs authoring skills project tracking"`

---

## Reviews

| Scope     | Type     | Status   | Date       | Artifact                                            |
| --------- | -------- | -------- | ---------- | --------------------------------------------------- |
| p01       | code     | passed   | 2026-06-05 | reviews/archived/p01-review-2026-06-05.md           |
| p02       | code     | passed   | 2026-06-05 | reviews/archived/p02-review-2026-06-05.md           |
| p03       | code     | passed   | 2026-06-05 | reviews/archived/p03-review-2026-06-05-v2.md        |
| p04       | code     | passed   | 2026-06-05 | reviews/archived/p04-review-2026-06-05-v2.md        |
| p05       | code     | passed   | 2026-06-05 | reviews/archived/p05-review-2026-06-05.md           |
| p06       | code     | passed   | 2026-06-05 | reviews/archived/p06-review-2026-06-05.md           |
| final     | code     | passed   | 2026-06-05 | reviews/archived/final-review-2026-06-05.md         |
| discovery | artifact | passed   | 2026-06-05 | discovery.md                                        |
| spec      | artifact | pending  | -          | N/A quick mode                                      |
| design    | artifact | passed   | 2026-06-05 | design.md                                           |
| plan      | artifact | received | 2026-06-05 | reviews/archived/artifact-plan-review-2026-06-05.md |

**Status values:** `pending` → `received` → `fixes_added` → `fixes_completed` → `passed`

**Meaning:**

- `received`: review artifact exists but findings have not yet been converted into fix tasks.
- `fixes_added`: fix tasks were added to the plan.
- `fixes_completed`: fix tasks were implemented and await re-review.
- `passed`: review run and recorded as passing.

## Implementation Complete

**Summary:**

- Phase p01: 4 tasks - Build the agnostic `authoring-docs` baseline skill.
- Phase p02: 4 tasks - Build the `oat-docs-authoring` OAT/Fumadocs wrapper skill.
- Phase p03: 5 tasks - Improve `oat-docs-analyze` checks and analysis references.
- Phase p04: 4 tasks - Refine bootstrap guidance and OAT docs contract pages.
- Phase p05: 3 tasks - Polish the standalone migration handoff guide.
- Phase p06: 6 tasks - Register, version, sync, build, release-validate, and hand off.

**Total: 26 tasks**

Ready for `oat-project-implement` after the plan artifact review row is passed or residual review findings are explicitly surfaced.

## References

- Discovery: `.oat/projects/shared/docs-authoring-skills/discovery.md`
- Design: `.oat/projects/shared/docs-authoring-skills/design.md`
- Brainstorm notes: `.oat/projects/shared/docs-authoring-skills/reference/docs-authoring-skill/brainstorm-notes.md`
- Imported research pack manifest: `.oat/projects/shared/docs-authoring-skills/reference/docs-authoring-skill/manifest.json`
- Wrapper pattern analysis: `.oat/projects/shared/docs-authoring-skills/reference/docs-authoring-skill/oat-docs-authoring-wrapper-pattern-analysis.md`
- Analyzer recommendations: `.oat/projects/shared/docs-authoring-skills/reference/docs-authoring-skill/oat-docs-analyze-improvement-recommendations.md`
- Bootstrap gotchas: `.oat/projects/shared/docs-authoring-skills/reference/docs-authoring-skill/oat-docs-bootstrap-gotchas.md`
- Migration guide: `.oat/projects/shared/docs-authoring-skills/reference/docs-authoring-skill/mkdocs-to-oat-fumadocs-refactor-guide.md`
- Existing per-repo improvement artifacts: `.oat/projects/shared/docs-authoring-skills/reference/docs-authoring-skill/existing-oat-fumadocs-improvements/`
