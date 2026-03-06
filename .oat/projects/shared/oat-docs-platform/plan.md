---
oat_status: complete
oat_ready_for: oat-project-implement
oat_blockers: []
oat_last_updated: 2026-03-05
oat_phase: plan
oat_phase_status: complete
oat_plan_hill_phases: ["p03"]
oat_plan_source: imported
oat_import_reference: references/imported-plan.md
oat_import_source_path: .oat/repo/reference/external-plans/2026-03-05-oat-docs-platform.md
oat_import_provider: codex
oat_generated: false
---

# Implementation Plan: oat-docs-platform

> Execute this plan using `oat-project-implement` (sequential) or `oat-project-subagent-implement` (parallel), with phase checkpoints and review gates.

**Goal:** Add a first-class `oat docs` workflow that scaffolds an MkDocs-based docs app, dogfood it by migrating OAT’s existing docs into the new app, and then add docs analyze/apply workflows that mirror the agent-instructions family.

**Architecture:** Use the CLI for deterministic docs bootstrap and nav generation, then add docs skills for higher-judgment analysis and update flows. The OAT repo migration serves as the proving ground for the app contract, `index.md` convention, and analyze/apply workflow shape.

**Tech Stack:** TypeScript, Commander, MkDocs Material, markdown tooling, OAT skills, tracking artifacts under `.oat/`

**Commit Convention:** `{type}({scope}): {description}` - e.g., `feat(p01-t01): add oat docs command family`

## Planning Checklist

- [x] Confirmed implementation should run straight through until the final plan phase
- [x] Set `oat_plan_hill_phases: ["p03"]` in frontmatter

---

## Phase 1: Build the `oat docs` CLI Foundation

### Task p01-t01: Add the `oat docs` command family and help coverage

**Files:**
- Create: `packages/cli/src/commands/docs/**`
- Modify: `packages/cli/src/commands/index.ts`
- Modify: `packages/cli/src/commands/index.test.ts`
- Modify: `packages/cli/src/commands/help-snapshots.test.ts`

**Step 1: Write test (RED)**

Add failing registration/help tests for:
- `oat docs`
- `oat docs init`
- `oat docs nav sync`

Run: `pnpm test -- --runInBand packages/cli/src/commands/index.test.ts packages/cli/src/commands/help-snapshots.test.ts`
Expected: Tests fail because the docs command family is not registered yet

**Step 2: Implement (GREEN)**

Implement the new namespace and register it in the root command index with help text that establishes the docs surface without yet requiring full scaffold logic.

Run: `pnpm test -- --runInBand packages/cli/src/commands/index.test.ts packages/cli/src/commands/help-snapshots.test.ts`
Expected: New command registration and help snapshots pass

**Step 3: Refactor**

Align descriptions and option phrasing with existing OAT command conventions.

**Step 4: Verify**

Run: `pnpm lint && pnpm type-check`
Expected: No CLI regressions

**Step 5: Commit**

```bash
git add packages/cli/src/commands/docs packages/cli/src/commands/index.ts packages/cli/src/commands/index.test.ts packages/cli/src/commands/help-snapshots.test.ts
git commit -m "feat(p01-t01): add oat docs command family"
```

---

### Task p01-t02: Implement repo-shape detection and `oat docs init` option resolution

**Files:**
- Modify: `packages/cli/src/commands/docs/init/**`
- Modify: `packages/cli/src/commands/shared/shared.prompts.ts` (only if prompt helpers need extension)
- Create/Modify tests under `packages/cli/src/commands/docs/**`

**Step 1: Write test (RED)**

Add failing tests for:
- monorepo detection defaults to `apps/<app-name>`
- single-package repos default to `<app-name>/` at repo root
- interactive prompt flow resolves app name, target dir, lint, and format choices
- non-interactive flags skip prompting

**Step 2: Implement (GREEN)**

Implement repo-shape detection and init option resolution with these defaults:
- monorepo/workspace repo => default target `apps/<app-name>`
- single-package repo => default target `<app-name>/`
- supported flags: `--app-name`, `--target-dir`, `--lint`, `--format`, `--yes`

**Step 3: Refactor**

Extract reusable detection/normalization helpers so scaffold generation and future docs commands can share them.

**Step 4: Verify**

Run: `pnpm test -- --runInBand packages/cli/src/commands/docs`
Expected: Repo-shape and prompt-path tests pass

**Step 5: Commit**

```bash
git add packages/cli/src/commands/docs packages/cli/src/commands/shared/shared.prompts.ts
git commit -m "feat(p01-t02): add docs init option resolution"
```

---

### Task p01-t03: Scaffold the MkDocs docs app and docs standards assets

**Files:**
- Create: bundled docs app templates/assets under the CLI assets tree
- Modify: CLI docs/bootstrap docs as needed
- Create/Modify tests covering scaffold output
- Create/Modify integration fixtures for monorepo and single-package scaffold scenarios

**Step 1: Write test (RED)**

Add failing scaffold tests for generated output:
- `mkdocs.yml`
- `package.json`
- `requirements.txt`
- `setup-docs.sh`
- `docs/index.md`
- `docs/getting-started.md`
- `docs/contributing.md`

Add failing integration coverage for:
- scaffolding into a monorepo fixture under `apps/<app-name>`
- scaffolding into a single-package fixture at `<app-name>/`
- verifying the single-package fixture does not gain a workspace file or workspace-only wiring

Verify the generated contributing guide includes installed plugin/extension inventory and usage references.

**Step 2: Implement (GREEN)**

Implement scaffold generation for the default MkDocs Material stack, using Honeycomb as the reference shape and generating the contributor contract that explains all enabled plugins/extensions for agents.

**Step 3: Refactor**

Move reusable content into templates/assets instead of inlining long markdown strings in command code.

**Step 4: Verify**

Run: `pnpm test -- --runInBand packages/cli/src/commands/docs && pnpm run cli -- docs init --help`
Expected: Scaffold unit/integration tests pass for both monorepo and single-package fixtures, and help text matches the supported flags/options

**Step 5: Commit**

```bash
git add packages/cli/src/commands/docs packages/cli/assets docs/oat/cli
git commit -m "feat(p01-t03): scaffold mkdocs docs app"
```

---

### Task p01-t04: Implement `oat docs nav sync` from `index.md` `## Contents`

**Files:**
- Modify: `packages/cli/src/commands/docs/nav/**`
- Modify: `packages/cli/src/commands/docs/index.ts`
- Create/Modify tests for nav parsing and generation
- Create/Modify docs standards/reference content for the `index.md` contract

**Step 1: Write test (RED)**

Add failing tests for:
- valid `## Contents` parsing
- nested directory nav generation
- freeform prose outside `## Contents` preserved
- malformed/missing `## Contents` reported clearly

**Step 2: Implement (GREEN)**

Implement the nav sync command so it reads only the reserved `## Contents` section from each directory `index.md` and regenerates `mkdocs.yml` navigation deterministically.

**Step 3: Refactor**

Keep parsing logic isolated from file I/O so future docs analyze/apply flows can reuse the same contract checks.

**Step 4: Verify**

Run: `pnpm test -- --runInBand packages/cli/src/commands/docs`
Expected: Nav parsing and generation tests pass

**Step 5: Commit**

```bash
git add packages/cli/src/commands/docs docs/oat
git commit -m "feat(p01-t04): add docs nav sync from index contents"
```

---

## Phase 2: Dogfood the Docs App in the OAT Repo

### Task p02-t01: Scaffold the OAT docs app in this repository

**Files:**
- Create: `apps/oat-docs/**` (or the final chosen docs app path from `oat docs init`)
- Modify: workspace/root scripts or references needed to run the docs app in-repo

**Step 1: Prepare dogfood verification**

Capture the expected dogfood output before scaffolding:
- target docs app path
- required generated files
- expected root/workspace wiring
- expected commands for local docs development

Record these expectations in the docs command test suite or a repo-specific verification note so the dogfood run has a concrete pass/fail target.

**Step 2: Implement (GREEN)**

Run the new docs scaffold against the OAT repo and wire any repo-level script or workspace references needed for local dogfooding.

**Step 3: Refactor**

Adjust the scaffold templates if the OAT repo reveals gaps in the generated app contract.

**Step 4: Verify**

Run: `pnpm run cli -- docs init --app-name oat-docs --target-dir apps/oat-docs --yes`
Expected: Docs app scaffolds cleanly, the expected file tree exists, and root/workspace wiring matches the recorded dogfood expectations without manual file creation

**Step 5: Commit**

```bash
git add apps/oat-docs package.json pnpm-workspace.yaml
git commit -m "feat(p02-t01): scaffold oat docs app"
```

---

### Task p02-t02: Migrate OAT docs content into the new app and normalize to `index.md`

**Files:**
- Modify/Create: docs content under the new OAT docs app
- Modify: current `docs/oat/**` sources as they are moved or replaced

**Step 1: Write migration assertion (RED)**

Inventory the current docs tree and identify directories still using `overview.md` or missing `index.md`/`## Contents`.

Add a failing migration assertion that checks the target docs app contains no `overview.md` files after migration and that required directories expose `index.md` entrypoints.

Run: `pnpm test -- --runInBand packages/cli/src/commands/docs`
Expected: Migration assertion fails before the docs tree is normalized

**Step 2: Implement (GREEN)**

Migrate current OAT docs into the app’s `docs/` tree, flatten the redundant `oat/` layer, rename `overview.md` pages to `index.md`, and add `## Contents` sections where needed.

**Step 3: Refactor**

Use the migration to tighten the content model so every directory entrypoint is discoverable via its local index.

**Step 4: Verify**

Run: `pnpm test -- --runInBand packages/cli/src/commands/docs`
Expected: Migration assertion passes and no `overview.md` files remain in the migrated docs tree

**Step 5: Commit**

```bash
git add apps/oat-docs/docs docs README.md AGENTS.md
git commit -m "docs(p02-t02): migrate oat docs into docs app"
```

---

### Task p02-t03: Regenerate nav and update repo links to the new docs app

**Files:**
- Modify: `apps/oat-docs/mkdocs.yml`
- Modify: repo docs/README/reference files that point at the old paths

**Step 1: Write test (RED)**

Capture outdated references that still point at the pre-migration docs layout or rely on manually maintained nav assumptions.

Run: `grep -R -n "docs/oat/" README.md AGENTS.md docs .agents`
Expected: Existing references still point to the old docs surface

**Step 2: Implement (GREEN)**

Run the nav sync flow and update root references so the repo points at the new docs app and path model consistently.

**Step 3: Refactor**

Eliminate duplicated path guidance that can now rely on the generated docs app structure.

**Step 4: Verify**

Run: `pnpm run cli -- docs nav sync --target-dir apps/oat-docs && grep -R -n "docs/oat/" README.md AGENTS.md docs .agents`
Expected: Nav regenerates cleanly and stale path references are reduced to intentional compatibility mentions only

**Step 5: Commit**

```bash
git add apps/oat-docs/mkdocs.yml README.md AGENTS.md docs .agents
git commit -m "docs(p02-t03): sync nav and update oat docs references"
```

---

### Task p02-t04: Verify the scaffold and migration with live docs tooling

**Files:**
- Modify: scaffold templates or migrated docs files if verification uncovers issues

**Step 1: Run hardening verification**

Run the generated docs checks and capture any failures from build, lint, formatting, or environment assumptions.

Run: `pnpm --dir apps/oat-docs docs:build && pnpm --dir apps/oat-docs docs:lint && pnpm --dir apps/oat-docs docs:format:check`
Expected: Any concrete issues are identified and logged as hardening gaps to fix in this task; do not assume failure is required

**Step 2: Implement (GREEN)**

Fix scaffold gaps, migration issues, and contributing-guide omissions uncovered by the live toolchain run.

**Step 3: Refactor**

Push generalized fixes back into the scaffold/templates rather than carrying repo-specific hacks where possible.

**Step 4: Verify**

Run: `pnpm --dir apps/oat-docs docs:build && pnpm --dir apps/oat-docs docs:lint && pnpm --dir apps/oat-docs docs:format:check`
Expected: Docs app checks pass cleanly

**Step 5: Commit**

```bash
git add apps/oat-docs packages/cli docs
git commit -m "fix(p02-t04): harden docs scaffold through dogfood verification"
```

---

## Phase 3: Add Docs Analyze/Apply and Dogfood Them

### Task p03-t01: Add shared docs analysis/apply helpers and reserve CLI entrypoints

**Files:**
- Create/Modify: `.agents/skills/oat-docs-analyze/SKILL.md`
- Create/Modify: `.agents/skills/oat-docs-analyze/references/**`
- Create/Modify: `.agents/skills/oat-docs-analyze/scripts/**`
- Create/Modify: `.agents/skills/oat-docs-apply/SKILL.md`
- Create/Modify: `.agents/skills/oat-docs-apply/references/**`
- Create/Modify: `.agents/skills/oat-docs-apply/scripts/**`
- Modify: `packages/cli/src/commands/docs/**`
- Modify: `packages/cli/src/commands/index.test.ts`
- Modify: `packages/cli/src/commands/help-snapshots.test.ts`
- Create/Modify: shared tracking/templates/helpers as needed

**Step 1: Write test (RED)**

Map the existing `oat-agent-instructions-analyze` and `oat-agent-instructions-apply` structure to failing docs workflow tests or fixture expectations for:
- docs-surface discovery
- tracking state
- artifact generation
- delta/full mode boundaries
- CLI registration/help coverage for `oat docs analyze` and `oat docs apply`

**Step 2: Implement (GREEN)**

Extract or replicate the shared deterministic pieces needed for docs analysis/apply so the docs family mirrors the agent-instructions family where appropriate, and register placeholder/real CLI entrypoints for `oat docs analyze` and `oat docs apply`.

**Step 3: Refactor**

Keep shared conventions aligned across the two workflow families without forcing misleading instruction-specific naming into docs code.

**Step 4: Verify**

Run: `pnpm test -- --runInBand packages/cli/src/commands/docs packages/cli/src/commands/index.test.ts packages/cli/src/commands/help-snapshots.test.ts && pnpm run cli -- internal validate-oat-skills`
Expected: Docs CLI entrypoint coverage passes and new `oat-*` skills/supporting artifacts validate cleanly

**Step 5: Commit**

```bash
git add .agents/skills packages/cli
git commit -m "feat(p03-t01): add shared docs workflow scaffolding"
```

---

### Task p03-t02: Implement `oat-docs-analyze`

**Files:**
- Create/Modify: `.agents/skills/oat-docs-analyze/SKILL.md`
- Create/Modify: `.agents/skills/oat-docs-analyze/references/analysis-artifact-template.md`
- Create/Modify: `.agents/skills/oat-docs-analyze/references/quality-checklist.md`
- Create/Modify: `.agents/skills/oat-docs-analyze/references/directory-assessment-criteria.md`
- Create/Modify: `.agents/skills/oat-docs-analyze/scripts/**`
- Modify: docs reference material or templates required by the skill

**Step 1: Write test (RED)**

Define failing fixture expectations for:
- full vs delta mode
- docs surface discovery across docs dirs, MkDocs sites, and README-only repos
- `index.md` contract violations
- severity-rated findings output

**Step 2: Implement (GREEN)**

Implement `oat-docs-analyze` to produce a structured artifact covering coverage, drift, staleness, verbosity, and navigation/index gaps.

**Step 3: Refactor**

Keep analyze output templates and severity semantics parallel to the agent-instructions family where it helps user comprehension.

**Step 4: Verify**

Run: `pnpm run cli -- docs analyze --target-dir test/fixtures/docs-site && pnpm run cli -- internal validate-oat-skills`
Expected: Analyze produces the expected artifact structure against the fixture docs tree and skill metadata/references are valid

**Step 5: Commit**

```bash
git add .agents/skills/oat-docs-analyze
git commit -m "feat(p03-t02): add oat-docs-analyze skill"
```

---

### Task p03-t03: Implement `oat-docs-apply`

**Files:**
- Create/Modify: `.agents/skills/oat-docs-apply/SKILL.md`
- Create/Modify: `.agents/skills/oat-docs-apply/references/apply-plan-template.md`
- Create/Modify: `.agents/skills/oat-docs-apply/references/**`
- Create/Modify: `.agents/skills/oat-docs-apply/scripts/**`
- Modify: any shared references/templates needed for approval plans, branch flow, and PR summaries

**Step 1: Write test (RED)**

Define failing expectations for:
- recommendation review/approval flow
- branch creation and PR summary structure
- applying approved docs updates
- legacy `overview.md` to `index.md` conversion guidance

**Step 2: Implement (GREEN)**

Implement `oat-docs-apply` with interactive recommendation handling, branch/PR workflow, and support for acting on docs analysis findings.

**Step 3: Refactor**

Ensure apply preserves user-authored docs content outside the targeted changes whenever possible.

**Step 4: Verify**

Run: `pnpm run cli -- docs apply --analysis .oat/repo/analysis/test-docs-analysis.md && pnpm run cli -- internal validate-oat-skills`
Expected: Apply flow produces the expected recommendation/approval output against a fixture analysis artifact and the skill validates cleanly

**Step 5: Commit**

```bash
git add .agents/skills/oat-docs-apply
git commit -m "feat(p03-t03): add oat-docs-apply skill"
```

---

### Task p03-t04: Dogfood docs analyze/apply against the OAT docs app

**Files:**
- Modify: OAT docs app content/templates/tests based on findings from the new docs workflow
- Modify: repo references/backlog/docs standards as needed

**Step 1: Write test (RED)**

Run the new docs analysis against the migrated OAT docs app and capture concrete findings before applying anything.

Run: `pnpm run cli -- docs analyze --target-dir apps/oat-docs`
Expected: A real analysis artifact is produced with actionable findings against the dogfooded docs app

**Step 2: Implement (GREEN)**

Use the new analyze/apply workflow to resolve the initial OAT docs findings and feed improvements back into templates, docs standards, and test coverage.

**Step 3: Refactor**

Trim rough edges exposed by dogfooding so the docs workflow is reusable outside this repository.

**Step 4: Verify**

Run: `pnpm build && pnpm lint && pnpm type-check && pnpm run cli -- internal validate-oat-skills`
Expected: Repo checks pass after the docs workflow lands

**Step 5: Commit**

```bash
git add packages/cli .agents docs apps/oat-docs .oat
git commit -m "chore(p03-t04): dogfood docs analyze apply workflow"
```

---

## Reviews

{Track reviews here after running the oat-project-review-provide and oat-project-review-receive skills.}

{Keep both code + artifact rows below. Add additional code rows (p03, p04, etc.) as needed, but do not delete `spec`/`design`.}

| Scope | Type | Status | Date | Artifact |
|-------|------|--------|------|----------|
| p01 | code | pending | - | - |
| p02 | code | pending | - | - |
| p03 | code | pending | - | - |
| final | code | passed | 2026-03-06 | inline-only |
| plan | artifact | passed | 2026-03-05 | reviews/artifact-plan-review-2026-03-05.md |
| spec | artifact | pending | - | - |
| design | artifact | pending | - | - |

**Status values:** `pending` → `received` → `fixes_added` → `fixes_completed` → `passed`

**Meaning:**
- `received`: review artifact exists (not yet converted into fix tasks)
- `fixes_added`: fix tasks were added to the plan (work queued)
- `fixes_completed`: fix tasks implemented, awaiting re-review
- `passed`: re-review run and recorded as passing (no Critical/Important)

Import-mode note: `spec` and `design` rows are retained for plan contract compatibility. They are not expected to be used for this project unless the workflow mode changes.

---

## Implementation Complete

**Summary:**
- Phase 1: 4 tasks - add the docs command family, interactive init defaults, scaffold templates, and nav sync
- Phase 2: 4 tasks - scaffold the OAT docs app, migrate content, regenerate nav, and verify the dogfood setup
- Phase 3: 4 tasks - add docs analyze/apply and harden them by running them against the new OAT docs app

**Total: 12 tasks**

Ready for merge / final PR handoff.

---

## References

- Design: `design.md` (required in spec-driven mode; optional in quick/import mode)
- Spec: `spec.md` (required in spec-driven mode; optional in quick/import mode)
- Discovery: `discovery.md`
- Imported Source: `references/imported-plan.md`
