---
oat_plan_source: quick
oat_status: complete
oat_ready_for: oat-project-implement
oat_phase: plan
oat_phase_status: complete
oat_plan_parallel_groups: []
oat_plan_hill_phases: ['p03']
oat_auto_review_at_hill_checkpoints: true
oat_import_reference: null
oat_import_source_path: null
oat_import_provider: null
oat_last_updated: 2026-07-18
oat_generated: false
oat_template: false
---

# Implementation Plan: reviewer-parallelism

> Execute this plan using `oat-project-implement`.

**Goal:** Enable `oat-reviewer` to accelerate broad reviews through bounded, task-class-aware reconnaissance workers without delegating source validation, synthesis, severity judgment, validation decisions, or final findings.

**Architecture:** Preserve one provider-neutral, capability-gated advisory layer, but separate worker authority (`role.class`) from an artifact-informed per-lane `task_class` model floor. Deterministic checks use mechanical workers, interpretive reconnaissance uses intelligent workers, stronger bounded analysis is escalated by ambiguity/consequence, and the root reviewer remains responsible for verification, cross-lane synthesis, severity, and final output.

**Tech Stack:** Canonical Markdown agent definitions, TypeScript/Vitest contract tests, Fumadocs Markdown, OAT provider sync, pnpm workspace release tooling.

**Commit Convention:** `{type}(pNN-tNN): {description}`

## Planning Checklist

- [x] Requirements confirmed with the user
- [x] Lightweight design initially skipped; supplemental model-class revision design added and reviewed after dogfooding
- [x] Phases evaluated for parallelism
- [x] `oat_plan_parallel_groups` set from dependency/write-set analysis
- [x] Dispatch policy resolved before implementation readiness
- [x] Original plan artifact review passed
- [x] Supplemental revision plan artifact review passed

## Parallelism

`oat_plan_parallel_groups: []` keeps execution sequential. Phases 1-3 preserve the completed pre-revision history. Revision Phase 4 updates the shared dispatch contract and canonical reviewer first, documents that finalized behavior second, and regenerates provider/release outputs last. Running distribution or release validation concurrently would risk stale generated output and would validate an incomplete shipped diff.

---

## Phase 1: Canonical Reviewer Orchestration Contract

### Task p01-t01: Add bounded reconnaissance behavior with semantic regression coverage

**Files:**

- Modify: `.agents/agents/oat-reviewer.md`
- Modify: `packages/cli/src/validation/skills.test.ts`
- Modify: `packages/cli/src/commands/init/tools/shared/review-skill-contracts.test.ts`

**Step 1: Write the contract test (RED)**

Add a dedicated semantic contract test that reads the canonical reviewer and asserts all load-bearing boundaries:

- broad-review eligibility examples: final code reviews, broad phase/range reviews, docs sweeps, and provider-view audits;
- narrow-review inline behavior;
- one bounded, read-only, non-recursive round of disjoint lanes;
- compact reports with coverage, checks performed, exact `file:line` evidence, gaps, and explicit uncertainty;
- `Task` is present in the canonical reviewer tool allowlist;
- delegated reconnaissance requires loading `.agents/skills/oat-dispatch-subagents/SKILL.md` plus exactly one active-provider reference, maps workers to the `recon` role class, and leaves capability, catalog, model, effort, route, authorization, and launch evidence to that shared contract;
- reviewer-local reconnaissance does not load or depend on `.agents/skills/oat-project-dispatch-subagents/SKILL.md`, which is reserved for project lifecycle phase/task policy;
- cheaper/faster worker preference only when the host reliably exposes that control;
- primary-only source validation, reconciliation, synthesis, severity, validation decisions, artifact writing, and `StructuredFindings`;
- capability/authorization/failure fallback with no checklist or output-contract downgrade.

Run:

```bash
pnpm --filter @open-agent-toolkit/cli exec vitest run src/validation/skills.test.ts
```

Expected: the new assertions fail because the orchestration contract is not yet present.

**Step 2: Implement the canonical reviewer contract (GREEN)**

Update `.agents/agents/oat-reviewer.md` and both existing exact-version assertions:

- bump the canonical reviewer `version` from `1.1.7` to `1.1.8`;
- update the reviewer version assertions in `packages/cli/src/validation/skills.test.ts` and `packages/cli/src/commands/init/tools/shared/review-skill-contracts.test.ts` from `1.1.7` to `1.1.8`;
- add `Task` to the canonical reviewer tool allowlist so hosts that enforce agent tools can expose nested dispatch;
- add a provider-neutral bounded-reconnaissance policy after dispatch control;
- require the reviewer to read `.agents/skills/oat-dispatch-subagents/SKILL.md` before delegated reconnaissance, resolve the active provider, and read exactly one matching provider reference;
- map reconnaissance workers to the shared `recon` role class and leave capability, catalog, model, effort, route, authorization, and launch evidence to the generic dispatch contract, including explicit economical target selection that never silently inherits the primary reviewer's model;
- forbid loading or depending on `.agents/skills/oat-project-dispatch-subagents/SKILL.md` for reviewer-local reconnaissance because that adapter owns project lifecycle phase/task policy;
- make the primary reviewer establish authoritative scope before considering delegation;
- define a compact lane prompt/return contract requiring coverage, checks performed, exact `file:line` evidence, gaps, and explicit uncertainty, with a one-level fan-out limit;
- require direct re-verification of load-bearing positive and negative claims;
- keep workers advisory and prevent them from mutating files, emitting findings, assigning severity, or writing either output sink;
- preserve the existing artifact-mode, gate-parsing, and structured-output schemas unchanged;
- fall back to inline coverage when nested delegation or tier selection is unavailable.

Do not hard-code provider model names or claim that nested workers inherit the primary reviewer's managed target.

Run:

```bash
pnpm --filter @open-agent-toolkit/cli exec vitest run   src/validation/skills.test.ts   src/agents/canonical/parse.test.ts   src/commands/init/tools/shared/review-skill-contracts.test.ts
```

Expected: all focused reviewer and canonical-agent contract tests pass.

**Step 3: Verify scope and formatting**

Run:

```bash
pnpm exec oxfmt --write \
  .agents/agents/oat-reviewer.md \
  packages/cli/src/validation/skills.test.ts \
  packages/cli/src/commands/init/tools/shared/review-skill-contracts.test.ts
pnpm --filter @open-agent-toolkit/cli exec vitest run src/validation/skills.test.ts
pnpm exec oxfmt --check \
  .agents/agents/oat-reviewer.md \
  packages/cli/src/validation/skills.test.ts \
  packages/cli/src/commands/init/tools/shared/review-skill-contracts.test.ts
git diff --check
```

Expected: tests and formatting pass; the diff changes no review payload schema, CLI runtime, severity definitions, or final output structure.

**Step 4: Commit**

```bash
git add \
  .agents/agents/oat-reviewer.md \
  packages/cli/src/validation/skills.test.ts \
  packages/cli/src/commands/init/tools/shared/review-skill-contracts.test.ts
git commit -m "feat(p01-t01): add bounded reviewer reconnaissance"
```

---

## Phase 2: Review Workflow Documentation

### Task p02-t01: Document broad-review latency benefit and safety boundary

**Files:**

- Modify: `apps/oat-docs/docs/workflows/projects/reviews.md`

**Step 1: Extend the existing review documentation**

Expand the existing `Subagent Compatibility` section to distinguish:

- outer dispatch of `oat-reviewer` from optional reviewer-local reconnaissance;
- eligible broad-review examples and the expected wall-clock/cost benefit;
- the one-round, read-only, non-recursive lane boundary;
- worker-report coverage, checks performed, exact evidence, gaps, and uncertainty requirements;
- shared `oat-dispatch-subagents` ownership of nested capability, catalog, model, effort, route, authorization, launch evidence, and provider-specific mechanics;
- reviewer-local use of the generic `oat-dispatch-subagents` contract, contrasted with `oat-project-dispatch-subagents`, which remains reserved for lifecycle phase/task dispatch;
- primary-reviewer ownership of verification, synthesis, severity, and final findings;
- inline fallback when nested workers or explicit cheaper-tier controls are unavailable.

Do not add a new page or modify generated navigation; this is a focused edit to an existing authored page.

**Step 2: Verify documentation**

Run:

```bash
pnpm exec oxfmt --write apps/oat-docs/docs/workflows/projects/reviews.md
pnpm docs:check-links
pnpm build:docs
pnpm exec oxfmt --check apps/oat-docs/docs/workflows/projects/reviews.md
git diff --check
```

Expected: links, docs build, and formatting pass; the documentation matches the canonical reviewer contract without promising unsupported provider behavior.

**Step 3: Commit**

```bash
git add apps/oat-docs/docs/workflows/projects/reviews.md
git commit -m "docs(p02-t01): explain reviewer reconnaissance boundaries"
```

---

## Phase 3: Provider Sync and Shipped Release Validation

### Task p03-t01: Regenerate provider views and finalize lockstep release metadata

**Files:**

- Modify: `packages/cli/package.json`
- Modify: `packages/control-plane/package.json`
- Modify: `packages/docs-config/package.json`
- Modify: `packages/docs-theme/package.json`
- Modify: `packages/docs-transforms/package.json`
- Regenerate: `packages/cli/assets/public-package-versions.json`
- Regenerate: `.codex/agents/oat-reviewer*.toml` (base role and all tracked materialized variants)
- Regenerate as applicable: `.codex/config.toml`
- Regenerate as applicable: `.oat/sync/manifest.json`
- Verify symlink-backed views: `.claude/agents/oat-reviewer.md`, `.cursor/agents/oat-reviewer.md`

**Step 1: Apply the lockstep patch release**

Re-read all five public package manifests to confirm the lockstep baseline is still `0.1.73`, then bump them together to `0.1.74`. If the baseline has advanced, stop and use the next shared patch version instead of downgrading or reusing a released version.

Run the asset bundler after the version changes:

```bash
bash packages/cli/scripts/bundle-assets.sh
```

Expected: `packages/cli/assets/public-package-versions.json` reflects the new public package versions. Do not run the asset bundler concurrently with builds or validations that read `packages/cli/assets`.

**Step 2: Refresh provider views**

Run:

```bash
pnpm run cli -- sync --scope all
pnpm run cli -- sync --scope project --dry-run
```

Expected: the tracked Codex base reviewer and every materialized `oat-reviewer*.toml` variant contain the finalized canonical contract; Claude and Cursor symlinks still resolve to the canonical agent; the project-scope dry run reports no remaining drift. Include `.codex/config.toml` only if sync changes it.

**Step 3: Run focused distribution checks**

Run:

```bash
pnpm exec oxfmt --write \
  packages/cli/package.json \
  packages/control-plane/package.json \
  packages/docs-config/package.json \
  packages/docs-theme/package.json \
  packages/docs-transforms/package.json \
  packages/cli/assets/public-package-versions.json \
  .oat/sync/manifest.json
pnpm --filter @open-agent-toolkit/cli exec vitest run   src/validation/skills.test.ts   src/agents/canonical/parse.test.ts   src/commands/init/tools/shared/review-skill-contracts.test.ts   src/providers/codex/codec/sync-extension.test.ts
pnpm release:check-versions
pnpm format
git status --short
git diff --check
```

Expected: reviewer contracts, provider generation, version checks, and formatting pass; status contains only the intended package, generated reviewer, and sync outputs for this task.

**Step 4: Commit the shipped surface**

```bash
git add \
  packages/cli/package.json \
  packages/control-plane/package.json \
  packages/docs-config/package.json \
  packages/docs-theme/package.json \
  packages/docs-transforms/package.json \
  packages/cli/assets/public-package-versions.json \
  .codex/agents/oat-reviewer*.toml \
  .oat/sync/manifest.json
[ ! -e .codex/config.toml ] || git add .codex/config.toml
git commit -m "chore(p03-t01): finalize reviewer orchestration release"
```

If a listed generated file is unchanged, omit it from `git add`.

**Step 5: Validate the committed release diff**

Run sequentially after the task commit so release tooling evaluates the committed `merge-base..HEAD` surface:

```bash
pnpm lint
pnpm type-check
pnpm test
pnpm build
pnpm build:docs
pnpm release:check-versions
pnpm release:validate
git status --short
```

Expected: all repository and publishable-package checks pass and no generated provider drift remains. If a correction is required, fix it within this task and amend the task commit before continuing.

---

### Task p03-t02: Close the shipped backlog item

**Files:**

- Move: `.oat/repo/pjm/backlog/items/BL-260708-enable-oat-reviewer-subagent.md` → `.oat/repo/pjm/backlog/archived/BL-260708-enable-oat-reviewer-subagent.md`
- Modify: `.oat/repo/pjm/backlog/completed.md`
- Regenerate: `.oat/repo/pjm/backlog/index.md`
- Modify: `.oat/repo/pjm/roadmap.md`
- Modify as applicable: `.oat/repo/pjm/current-state.md`

**Step 1: Archive the completed backlog item**

After the implementation and release validation satisfy the item acceptance criteria:

1. Remove the instantiated item's template-only `oat_template` and `oat_template_name` frontmatter entries.
2. Format the active item before archival:

   ```bash
   pnpm exec oxfmt --write .oat/repo/pjm/backlog/items/BL-260708-enable-oat-reviewer-subagent.md
   ```

3. Run the archive through the repository source CLI:

```bash
pnpm run cli:source -- backlog archive BL-260708-enable-oat-reviewer-subagent --summary "Enabled bounded reviewer-local reconnaissance for faster broad reviews while preserving primary-reviewer judgment and evidence validation."
```

Expected: the item is marked closed, moved to `backlog/archived/`, recorded in `backlog/completed.md`, and removed from the active generated index.

**Step 2: Reconcile curated PJM surfaces**

- Remove this item from `roadmap.md` under `Next (Planned)`.
- Update the curated overview in `backlog/index.md` to describe bounded reviewer reconnaissance as shipped rather than tracked active work.
- Inspect `current-state.md`; update it only if its operating-picture prose still describes this item as active or planned.

**Step 3: Verify backlog integrity and formatting**

Run:

```bash
test ! -e .oat/repo/pjm/backlog/items/BL-260708-enable-oat-reviewer-subagent.md
test -f .oat/repo/pjm/backlog/archived/BL-260708-enable-oat-reviewer-subagent.md
! rg -n '^oat_template(_name)?:' .oat/repo/pjm/backlog/archived/BL-260708-enable-oat-reviewer-subagent.md
rg -n 'BL-260708-enable-oat-reviewer-subagent' .oat/repo/pjm/backlog/completed.md
! rg -n 'BL-260708-enable-oat-reviewer-subagent' .oat/repo/pjm/backlog/index.md
! rg -n 'BL-260708-enable-oat-reviewer-subagent' .oat/repo/pjm/roadmap.md
pnpm run cli:source -- pjm doctor --json || test $? -eq 2
pnpm exec oxfmt --write \
  .oat/repo/pjm/backlog/archived/BL-260708-enable-oat-reviewer-subagent.md \
  .oat/repo/pjm/backlog/completed.md \
  .oat/repo/pjm/backlog/index.md \
  .oat/repo/pjm/roadmap.md \
  .oat/repo/pjm/current-state.md
pnpm exec oxfmt --check \
  .oat/repo/pjm/backlog/archived/BL-260708-enable-oat-reviewer-subagent.md \
  .oat/repo/pjm/backlog/completed.md \
  .oat/repo/pjm/backlog/index.md \
  .oat/repo/pjm/roadmap.md \
  .oat/repo/pjm/current-state.md
git diff --check
```

Expected: this item exists only in the archive, has no template markers, appears in the completed ledger, and is absent from the active index and roadmap. The curated overview describes the capability as shipped. The doctor may retain its pre-existing unrelated template-frontmatter failure (exit `2`), but it must no longer name this item or report any new failure introduced by this task.

**Step 4: Commit**

```bash
git add \
  .oat/repo/pjm/backlog/items/BL-260708-enable-oat-reviewer-subagent.md \
  .oat/repo/pjm/backlog/archived/BL-260708-enable-oat-reviewer-subagent.md \
  .oat/repo/pjm/backlog/completed.md \
  .oat/repo/pjm/backlog/index.md \
  .oat/repo/pjm/roadmap.md \
  .oat/repo/pjm/current-state.md
git commit -m "chore(p03-t02): close reviewer orchestration backlog item"
```

---

### Task p03-t03: Correct the release to the next unpublished lockstep version

**Source Review:** `reviews/archived/p03-review-2026-07-18T231821Z.md` (Critical)

**Files:**

- Modify: `packages/cli/package.json`
- Modify: `packages/control-plane/package.json`
- Modify: `packages/docs-config/package.json`
- Modify: `packages/docs-theme/package.json`
- Modify: `packages/docs-transforms/package.json`
- Regenerate: `packages/cli/assets/public-package-versions.json`
- Regenerate as applicable: `.oat/sync/manifest.json`
- Regenerate as applicable: `.codex/agents/oat-reviewer*.toml`
- Modify: `.oat/repo/pjm/current-state.md`

**Step 1: Resolve the authoritative unpublished version**

Fetch the current `origin/main`, read all five public package versions from that ref, and query npm versions for all five package names. Select the next shared patch version that:

- is greater than the common upstream baseline;
- is unpublished for every public package;
- keeps all five manifests in lockstep; and
- does not rewrite or rebase existing task history.

Expected from review-time evidence: use `0.2.1` only if `origin/main` remains at `0.2.0` and npm confirms `0.2.1` is unused for every package.

**Step 2: Regenerate release and provider surfaces**

Update all five manifests together, align the release attribution in `.oat/repo/pjm/current-state.md`, then run sequentially:

```bash
bash packages/cli/scripts/bundle-assets.sh
pnpm run cli -- sync --scope all
pnpm run cli -- sync --scope project --dry-run
```

Expected: bundled public versions and sync metadata match the selected unpublished version, all provider views remain synchronized, and the project dry run reports no drift.

**Step 3: Verify uniqueness and the complete release**

Run:

```bash
pnpm exec oxfmt --write \
  packages/cli/package.json \
  packages/control-plane/package.json \
  packages/docs-config/package.json \
  packages/docs-theme/package.json \
  packages/docs-transforms/package.json \
  packages/cli/assets/public-package-versions.json \
  .oat/sync/manifest.json \
  .oat/repo/pjm/current-state.md
pnpm --filter @open-agent-toolkit/cli exec vitest run \
  src/validation/skills.test.ts \
  src/agents/canonical/parse.test.ts \
  src/commands/init/tools/shared/review-skill-contracts.test.ts \
  src/providers/codex/codec/sync-extension.test.ts
pnpm lint
pnpm type-check
pnpm test
pnpm build
pnpm build:docs
pnpm release:check-versions
pnpm format
pnpm release:validate
pnpm run cli -- sync --scope project --dry-run
git diff --check
git status --short
```

Also query npm immediately before commit and assert the selected version remains unpublished for each of the five public packages. If it has become occupied, select the next shared unused patch and repeat generation and validation.

Expected: all checks pass, registry uniqueness is explicit, no provider drift remains, and status contains only the bounded release-correction surfaces.

**Step 4: Commit**

```bash
git add \
  packages/cli/package.json \
  packages/control-plane/package.json \
  packages/docs-config/package.json \
  packages/docs-theme/package.json \
  packages/docs-transforms/package.json \
  packages/cli/assets/public-package-versions.json \
  .oat/sync/manifest.json \
  .oat/repo/pjm/current-state.md
git add .codex/agents/oat-reviewer*.toml
git commit -m "fix(p03-t03): use next unpublished release version"
```

If a listed generated file is unchanged, omit it from `git add`.

---

## Phase 4: Task-Class-Aware Reviewer Orchestration Revision

### Task p04-t01: Separate reviewer lane authority from model-class floors

**Files:**

- Modify: `.agents/agents/oat-reviewer.md`
- Modify: `.agents/skills/oat-dispatch-subagents/SKILL.md`
- Modify: `.agents/skills/oat-dispatch-subagents/references/record-schema.md`
- Modify: `.agents/skills/oat-dispatch-subagents/references/provider-cursor.md`
- Modify: `.agents/skills/oat-dispatch-subagents/references/provider-claude.md`
- Modify: `.agents/skills/oat-dispatch-subagents/references/provider-codex.md`
- Modify: `packages/cli/src/validation/skills.test.ts`

**Step 1: Write the semantic contract assertions (RED)**

Extend the existing focused tests without creating a nested-agent harness.
Assert:

- the primary reviewer reads the authoritative range and mode-required
  discovery/spec/design/plan/implementation artifacts before decomposition;
- reviewer-local lanes retain `role.class: recon` while requiring independent
  `task_class`, `classification_source`, and `classification_reason` fields;
- task-class metadata is generic-optional for existing callers and
  reviewer-required for delegated reviewer reconnaissance;
- the five task classes and escalation boundaries are based on deterministic
  verification, silent-miss risk, dispersed context, ambiguity, and
  consequence rather than file count;
- mechanical work includes deterministic inventories, parity checks, and
  test/lint/format/build execution, while interpretation and policy judgment
  require stronger classes or stay with the root;
- dispatch records include `task_class`, `model_class_floor`,
  `classification_source`, `classification_reason`, and
  `floor_satisfaction`;
- homogeneous waves share one record only when task class and model floor also
  match;
- class-constrained reviewer fallback is `caller-inline`, forbids
  below-floor selection, and leaves legacy `explicit-downgrade` available only
  to unconstrained callers;
- outer Cursor lifecycle roles use the exact resolver-returned
  `providers.cursor.dispatchArgs.variant`, while reviewer-local
  `generalPurpose` recon uses an exact model choice advertised by the current
  nested dispatcher and never reconstructs lifecycle variants;
- root-only verification, reconciliation, severity, validation decisions, and
  output ownership remain unchanged.

Close deferred `p01-M1` with targeted assertions for:

- no hard-coded provider model names in the canonical reviewer;
- exactly one reviewer-local capability check; and
- no worker writes to review artifacts, `StructuredFindings`, or either output
  sink.

Update the shared-skill version assertion from branch `1.1.3` / upstream
`1.1.4` to final PR version `1.1.5`. Keep the canonical reviewer assertion at
its existing single PR-scoped bump `1.1.8`.

Run:

```bash
pnpm --filter @open-agent-toolkit/cli exec vitest run \
  src/validation/skills.test.ts \
  src/agents/canonical/parse.test.ts \
  src/commands/init/tools/shared/review-skill-contracts.test.ts \
  src/providers/codex/codec/sync-extension.test.ts
```

Expected: new assertions fail against the homogeneous economical-recon
contract.

**Step 2: Implement the reviewed class-aware contract (GREEN)**

Apply `design.md` exactly:

- bump `oat-dispatch-subagents` once to `1.1.5`;
- keep `oat-reviewer` at `1.1.8`;
- make task-class fields generic-optional and reviewer-required;
- record exact class-floor and floor-satisfaction fields;
- require separate wave records when task classes differ;
- encode floor-safe caller-inline fallback;
- document provider-neutral class selection and active
  user/repository-instruction precedence;
- preserve outer Cursor lifecycle resolver variants while defining the
  instruction-only nested `generalPurpose` exact-model path;
- require the root reviewer to classify lanes after understanding the actual
  artifacts and diff; and
- preserve advisory workers and root-only final judgment.

Do not add CLI resolver/config changes, a scheduler, benchmark logic, an E2E
subagent harness, or tests pinned to named models.

**Step 3: Verify and format**

Run:

```bash
pnpm exec oxfmt --write \
  .agents/agents/oat-reviewer.md \
  .agents/skills/oat-dispatch-subagents/SKILL.md \
  .agents/skills/oat-dispatch-subagents/references/record-schema.md \
  .agents/skills/oat-dispatch-subagents/references/provider-cursor.md \
  .agents/skills/oat-dispatch-subagents/references/provider-claude.md \
  .agents/skills/oat-dispatch-subagents/references/provider-codex.md \
  packages/cli/src/validation/skills.test.ts
pnpm --filter @open-agent-toolkit/cli exec vitest run \
  src/validation/skills.test.ts \
  src/agents/canonical/parse.test.ts \
  src/commands/init/tools/shared/review-skill-contracts.test.ts \
  src/providers/codex/codec/sync-extension.test.ts
pnpm exec oxfmt --check \
  .agents/agents/oat-reviewer.md \
  .agents/skills/oat-dispatch-subagents/SKILL.md \
  .agents/skills/oat-dispatch-subagents/references/record-schema.md \
  .agents/skills/oat-dispatch-subagents/references/provider-cursor.md \
  .agents/skills/oat-dispatch-subagents/references/provider-claude.md \
  .agents/skills/oat-dispatch-subagents/references/provider-codex.md \
  packages/cli/src/validation/skills.test.ts
git diff --check
```

Expected: focused semantic, canonical, and provider tests pass without exact
model-name assertions.

**Step 4: Commit**

```bash
git add \
  .agents/agents/oat-reviewer.md \
  .agents/skills/oat-dispatch-subagents/SKILL.md \
  .agents/skills/oat-dispatch-subagents/references/record-schema.md \
  .agents/skills/oat-dispatch-subagents/references/provider-cursor.md \
  .agents/skills/oat-dispatch-subagents/references/provider-claude.md \
  .agents/skills/oat-dispatch-subagents/references/provider-codex.md \
  packages/cli/src/validation/skills.test.ts
git commit -m "feat(p04-t01): classify reviewer recon by task complexity"
```

---

### Task p04-t02: Document model-class-aware review lanes

**Files:**

- Modify: `apps/oat-docs/docs/workflows/projects/reviews.md`

**Step 1: Update the existing reviewer-local reconnaissance section**

Explain:

- role/authority and task/model class are independent;
- the root reviewer reads the review artifacts and diff before deciding lane
  boundaries and task classes;
- deterministic inventories, parity, and command execution are mechanical;
- silent-miss-prone interpretation and unfamiliar-code auditing are
  intelligent;
- hard/consequential analysis is used only when ambiguity or failure cost
  warrants it, while root judgment remains final;
- active provider/user instructions and live catalogs resolve examples without
  canonical model-name promises;
- mixed classes create separate waves;
- below-floor fallback is prohibited; and
- workers remain advisory and non-recursive.

Do not add a new page or generated navigation entry.

**Step 2: Verify and commit**

Run:

```bash
pnpm exec oxfmt --write apps/oat-docs/docs/workflows/projects/reviews.md
pnpm build:docs
pnpm exec oxfmt --check apps/oat-docs/docs/workflows/projects/reviews.md
git diff --check
git add apps/oat-docs/docs/workflows/projects/reviews.md
git commit -m "docs(p04-t02): explain task-class-aware review lanes"
```

Expected: docs build and formatting pass; the page matches the canonical
contract without promising named provider models.

---

### Task p04-t03: Regenerate provider views and finalize the revised release

**Files:**

- Modify: `packages/cli/package.json`
- Modify: `packages/control-plane/package.json`
- Modify: `packages/docs-config/package.json`
- Modify: `packages/docs-theme/package.json`
- Modify: `packages/docs-transforms/package.json`
- Regenerate: `packages/cli/assets/public-package-versions.json`
- Regenerate: `.codex/agents/oat-reviewer*.toml`
- Regenerate as applicable: `.claude/skills/oat-dispatch-subagents/**`
- Regenerate as applicable: `.cursor/skills/oat-dispatch-subagents/**`
- Regenerate as applicable: `.codex/config.toml`
- Regenerate: `.oat/sync/manifest.json`
- Modify: `.oat/repo/pjm/current-state.md`

**Step 1: Resolve the current unpublished lockstep version**

Fetch `origin/main`, verify all five upstream public manifests and the upstream
`oat-dispatch-subagents` version, then query npm for all five packages.
Select the next shared patch that is greater than upstream and unpublished for
every package.

Expected from plan-time evidence:

- upstream public packages: `0.2.1`;
- upstream dispatch skill: `1.1.4`;
- final dispatch skill: `1.1.5`; and
- public release: `0.2.2` only if it remains unpublished immediately before
  commit.

Never reuse a published package or skill version.

**Step 2: Regenerate shipped surfaces**

Update all five manifests together and align the reviewer capability
attribution in `.oat/repo/pjm/current-state.md`. Then run sequentially:

```bash
bash packages/cli/scripts/bundle-assets.sh
pnpm run cli -- sync --scope all
pnpm run cli -- sync --scope project --dry-run
```

Expected: every provider view contains the final canonical reviewer/dispatch
contracts, all version metadata agrees, and project dry-run reports no drift.

**Step 3: Run focused distribution checks**

Run:

```bash
pnpm exec oxfmt --write \
  packages/cli/package.json \
  packages/control-plane/package.json \
  packages/docs-config/package.json \
  packages/docs-theme/package.json \
  packages/docs-transforms/package.json \
  packages/cli/assets/public-package-versions.json \
  .oat/sync/manifest.json \
  .oat/repo/pjm/current-state.md
pnpm --filter @open-agent-toolkit/cli exec vitest run \
  src/validation/skills.test.ts \
  src/agents/canonical/parse.test.ts \
  src/commands/init/tools/shared/review-skill-contracts.test.ts \
  src/providers/codex/codec/sync-extension.test.ts
pnpm release:check-versions
pnpm format
pnpm run cli -- sync --scope project --dry-run
git diff --check
git status --short
```

Repeat the five-package npm uniqueness check immediately before commit. If the
candidate is occupied, choose the next shared patch and repeat generation and
validation.

**Step 4: Commit the revised shipped surface**

Stage only changed files from the declared package, provider-view, sync, and
PJM paths:

```bash
git add \
  packages/cli/package.json \
  packages/control-plane/package.json \
  packages/docs-config/package.json \
  packages/docs-theme/package.json \
  packages/docs-transforms/package.json \
  packages/cli/assets/public-package-versions.json \
  .oat/sync/manifest.json \
  .oat/repo/pjm/current-state.md
git add .codex/agents/oat-reviewer*.toml
git add -A \
  .claude/skills/oat-dispatch-subagents \
  .cursor/skills/oat-dispatch-subagents
[ ! -e .codex/config.toml ] || git add .codex/config.toml
git commit -m "chore(p04-t03): finalize class-aware reviewer release"
```

If a listed generated path is unchanged, omit it from staging.

**Step 5: Validate the committed release**

Run sequentially:

```bash
pnpm lint
pnpm type-check
pnpm test
pnpm build
pnpm build:docs
pnpm release:check-versions
pnpm release:validate
pnpm run cli -- sync --scope project --dry-run
git status --short
```

Expected: all repository/release checks pass, all five tarballs target the
same still-unpublished version, and no provider drift remains. Correct and
amend the task commit before review if needed.

---

### Task p04-t04: Correct recon baselines and nested model-choice terminology

**Files:**

- Modify: `.agents/skills/oat-dispatch-subagents/SKILL.md`
- Modify: `.agents/skills/oat-dispatch-subagents/references/record-schema.md`
- Modify: `.agents/skills/oat-dispatch-subagents/references/provider-cursor.md`
- Modify: `packages/cli/src/validation/skills.test.ts`

**Step 1: Add the review-driven regression assertions**

Assert that:

- the baseline `recon` role resolves an economical target only when no
  `task_class` floor was supplied;
- class-constrained recon selects at or above `model_class_floor` or returns
  `caller-inline` with `floor_satisfaction: unsatisfied`;
- an economical target is never treated as a universal recon baseline;
- Cursor nested dispatch uses the plain-language concept “exact model choice
  advertised by the current nested dispatcher”; and
- record granularity uses `exact-native-model-choice`, not enum terminology.

Run the focused skill tests and confirm the baseline assertion fails before the
contract fix.

**Step 2: Correct the canonical contract**

Make economical selection the default only for unconstrained legacy recon.
For a supplied task class, resolve the advertised nested model choices against
the class floor and policy/ceiling; fail closed to caller-inline when none can
demonstrably satisfy the floor. Replace “enum” prose and record values with the
plain-language advertised-model-choice terminology.

Keep `oat-dispatch-subagents` at its existing PR-scoped `1.1.5` version.

**Step 3: Verify and commit**

```bash
pnpm exec oxfmt --write \
  .agents/skills/oat-dispatch-subagents/SKILL.md \
  .agents/skills/oat-dispatch-subagents/references/record-schema.md \
  .agents/skills/oat-dispatch-subagents/references/provider-cursor.md \
  packages/cli/src/validation/skills.test.ts
pnpm --filter @open-agent-toolkit/cli exec vitest run \
  src/validation/skills.test.ts \
  src/commands/init/tools/shared/review-skill-contracts.test.ts
git diff --check
git add \
  .agents/skills/oat-dispatch-subagents/SKILL.md \
  .agents/skills/oat-dispatch-subagents/references/record-schema.md \
  .agents/skills/oat-dispatch-subagents/references/provider-cursor.md \
  packages/cli/src/validation/skills.test.ts
git commit -m "fix(p04-t04): honor recon model-class floors"
```

Expected: focused tests pass and no class-constrained lane can be downgraded to
the unconstrained economical default.

---

### Task p04-t05: Add root-owned review orchestration logging

**Files:**

- Modify: `.agents/agents/oat-reviewer.md`
- Modify: `.agents/skills/oat-project-implement/SKILL.md`
- Modify: `.agents/skills/oat-project-implement/references/phase-execution.md`
- Modify: `.agents/skills/oat-project-review-provide/SKILL.md`
- Modify: `packages/cli/src/validation/skills.test.ts`
- Modify: `packages/cli/src/commands/init/tools/shared/review-skill-contracts.test.ts`
- Modify: `apps/oat-docs/docs/workflows/projects/reviews.md`

**Step 1: Add semantic ownership assertions**

Assert that:

- review artifacts contain a compact orchestration section whenever delegated
  reconnaissance is attempted;
- the section records waves, task classes, classification rationale, selected
  targets, acceptance/outcomes, floor satisfaction, fallback, and primary
  reconciliation;
- reviewers and workers never write `project-log.md`;
- the root project implementation/review workflow validates the artifact and
  appends one structural project-log entry referencing it through
  `oat project log append`; and
- structured-output mode keeps the existing schema and summarizes
  orchestration in `summary`.

**Step 2: Implement the root-owned handoff**

Update the canonical reviewer artifact contract and the two root project
workflows. The reviewer reports orchestration evidence in its artifact; after
validating the returned artifact, the root appends one concise structural log
entry instead of copying every worker record. Keep logging capability-gated and
preserve read-only reviewer/worker authority.

Bump `oat-project-implement` from `2.1.3` to `2.1.4` and
`oat-project-review-provide` from merged upstream `1.3.21` to `1.3.22`. Keep
`oat-reviewer` at its existing PR-scoped `1.1.8` version.

**Step 3: Verify and commit**

```bash
pnpm exec oxfmt --write \
  .agents/agents/oat-reviewer.md \
  .agents/skills/oat-project-implement/SKILL.md \
  .agents/skills/oat-project-implement/references/phase-execution.md \
  .agents/skills/oat-project-review-provide/SKILL.md \
  packages/cli/src/validation/skills.test.ts \
  packages/cli/src/commands/init/tools/shared/review-skill-contracts.test.ts \
  apps/oat-docs/docs/workflows/projects/reviews.md
pnpm --filter @open-agent-toolkit/cli exec vitest run \
  src/validation/skills.test.ts \
  src/commands/init/tools/shared/review-skill-contracts.test.ts \
  src/agents/canonical/parse.test.ts
pnpm build:docs
git diff --check
git add \
  .agents/agents/oat-reviewer.md \
  .agents/skills/oat-project-implement/SKILL.md \
  .agents/skills/oat-project-implement/references/phase-execution.md \
  .agents/skills/oat-project-review-provide/SKILL.md \
  packages/cli/src/validation/skills.test.ts \
  packages/cli/src/commands/init/tools/shared/review-skill-contracts.test.ts \
  apps/oat-docs/docs/workflows/projects/reviews.md
git commit -m "feat(p04-t05): log review orchestration through root"
```

Expected: the review artifact is the detailed evidence source, one root-owned
project-log entry links to it, and no child gains write authority.

---

### Task p04-t06: Regenerate fix views and revalidate the release

**Files:**

- Regenerate as applicable: `.claude/agents/oat-reviewer.md`
- Regenerate as applicable: `.cursor/agents/oat-reviewer*.md`
- Regenerate as applicable: `.codex/agents/oat-reviewer*.toml`
- Regenerate as applicable: Claude/Codex provider views for
  `oat-dispatch-subagents`, `oat-project-implement`, and
  `oat-project-review-provide`
- Regenerate: `packages/cli/assets/**`
- Regenerate: `.oat/sync/manifest.json`

Cursor reads canonical skills natively from `.agents/skills`; do not recreate
the obsolete `.cursor/skills` managed views removed by merged upstream
`0.2.1`.

Run asset bundling, provider sync, focused contract tests, docs build, complete
workspace validation, release validation, provider dry-run, formatting, and
diff hygiene. Keep all public packages at the already-selected unpublished
`0.2.2` version and recheck npm uniqueness immediately before commit.

Commit only generated/release surfaces:

```bash
git add -A \
  packages/cli/assets \
  .claude/agents/oat-reviewer.md \
  .cursor/agents/oat-reviewer*.md \
  .codex/agents \
  .claude/skills/oat-dispatch-subagents \
  .claude/skills/oat-project-implement \
  .claude/skills/oat-project-review-provide \
  .oat/sync/manifest.json
git commit -m "chore(p04-t06): synchronize review orchestration fixes"
```

If a listed path is absent or unchanged for a provider, omit it from staging.
Expected: full release validation passes and project sync reports no drift.

---

### Task p04-t07: Remove obsolete Cursor wave-skill mirrors

**Files:**

- Delete: `.cursor/skills/oat-wave-execute`
- Delete: `.cursor/skills/oat-wave-program`

Remove only the two tracked provider-view symlinks. Preserve their canonical
`.agents/skills/oat-wave-*` packages and current Claude views. These Cursor
paths are absent from the merged sync manifest because Cursor reads canonical
skills natively.

Verify:

```bash
pnpm run cli -- status --scope project --json
pnpm run cli -- sync --scope project --dry-run
pnpm --filter @open-agent-toolkit/cli exec vitest run \
  src/validation/skills.test.ts \
  src/commands/init/tools/shared/review-skill-contracts.test.ts \
  src/providers/cursor/codec/sync-extension.test.ts
git diff --check
git status --short
```

Expected: project status reports no Cursor skill strays, sync dry-run has no
changes, focused tests pass, and only the two obsolete symlinks are deleted.

Commit:

```bash
git add -u \
  .cursor/skills/oat-wave-execute \
  .cursor/skills/oat-wave-program
git commit -m "fix(p04-t07): remove obsolete Cursor skill mirrors"
```

### Phase 4 Review Acceptance

The rerun root-owned Phase 4 code review is also the class-aware dogfood
acceptance run. After reading `design.md`, the plan, implementation record, and
authoritative range, the primary reviewer must:

- classify at least one genuinely mechanical lane and one genuinely
  intelligent lane;
- delegate suitable mechanical work to an explicitly floor-satisfying nested
  target;
- delegate an intelligent lane only when the live nested catalog exposes a
  demonstrably floor-satisfying target; otherwise record it as unsatisfied and
  complete that lane itself;
- use separate dispatch records/waves and explicit provider targets;
- keep release/security/policy interpretation and all final judgment with the
  primary reviewer;
- independently verify every load-bearing worker claim; and
- record task classes, selected targets, lane purposes, and reconciliation in
  the review artifact.

Dogfood acceptance depends on correct classification, floor-safe dispatch, and
complete parent-owned coverage—not on successfully launching one worker per
class. Full pinned `oat-reviewer` variants are not recursively reused as recon
workers. Dedicated pinned recon roles may be considered later, but are not
required and remain out of scope for this project.

---

## Reviews

| Scope              | Type     | Status          | Date       | Artifact                                                      |
| ------------------ | -------- | --------------- | ---------- | ------------------------------------------------------------- |
| p01                | code     | passed          | 2026-07-18 | reviews/archived/p01-review-2026-07-18T224716Z.md             |
| p02                | code     | passed          | 2026-07-18 | reviews/archived/p02-review-2026-07-18T225832Z.md             |
| p03                | code     | passed          | 2026-07-18 | reviews/archived/p03-review-2026-07-18T233038Z.md             |
| p04                | code     | passed          | 2026-07-19 | reviews/archived/p04-review-2026-07-19T030013Z.md             |
| final-pre-revision | code     | passed          | 2026-07-18 | reviews/archived/final-review-2026-07-18T234708Z.md           |
| final              | code     | pending         | -          | -                                                             |
| spec               | artifact | pending         | -          | -                                                             |
| design             | artifact | passed          | 2026-07-19 | reviews/archived/artifact-design-review-2026-07-19T002158Z.md |
| plan               | artifact | fixes_completed | 2026-07-18 | reviews/archived/artifact-plan-review-2026-07-18T194838Z.md   |
| plan               | artifact | passed          | 2026-07-18 | reviews/archived/artifact-plan-review-2026-07-18T200447Z.md   |
| plan               | artifact | passed          | 2026-07-18 | reviews/archived/artifact-plan-review-2026-07-18T221957Z.md   |
| plan               | artifact | passed          | 2026-07-19 | reviews/archived/artifact-plan-review-2026-07-19T003101Z.md   |

**Status values:** `pending` → `received` → `fixes_added` → `fixes_completed` → `passed`

Quick-mode implementation readiness depends on the `plan` artifact review, not on optional `spec` or `design` rows.

The configured gate passed at its Important threshold on 2026-07-18. Its two non-blocking Medium findings were applied directly to this plan before finalization.

---

## Implementation Complete

**Summary:**

- Phase 1: 1 task - Canonical reviewer orchestration contract and regression coverage
- Phase 2: 1 task - User-facing review workflow documentation
- Phase 3: 3 tasks - Provider synchronization, lockstep release validation, backlog closeout, and unpublished-version correction
- Phase 4: 7 tasks - Task-class-aware dispatch contracts, review documentation, root-owned orchestration logging, provider synchronization, Cursor native-skill cleanup, and revised lockstep release

**Total: 4 phases, 12 tasks**

Ready for code review and merge after all tasks and required reviews pass.

---

## References

- Discovery: `discovery.md`
- Supplemental revision design: `design.md`
- Completed backlog item: “Enable oat-reviewer subagent orchestration for faster broad reviews” (`BL-260708-enable-oat-reviewer-subagent`) — `.oat/repo/pjm/backlog/archived/BL-260708-enable-oat-reviewer-subagent.md`
- Current reviewer: `.agents/agents/oat-reviewer.md`
- Shared nested-dispatch contract: `.agents/skills/oat-dispatch-subagents/SKILL.md`
- Review workflow docs: `apps/oat-docs/docs/workflows/projects/reviews.md`
- Project summary follow-up: `.oat/repo/reference/project-summaries/20260709-codex-family-subagents.md`
