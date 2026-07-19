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

**Goal:** Enable `oat-reviewer` to accelerate broad reviews through bounded, cheaper/faster reconnaissance workers without delegating source validation, synthesis, severity judgment, validation decisions, or final findings.

**Architecture:** Extend the canonical reviewer instruction contract with one provider-neutral, capability-gated reconnaissance layer. Preserve the existing review process and output sinks; workers only gather advisory evidence, while semantic tests, documentation, provider sync, and release validation keep the contract durable and distributable.

**Tech Stack:** Canonical Markdown agent definitions, TypeScript/Vitest contract tests, Fumadocs Markdown, OAT provider sync, pnpm workspace release tooling.

**Commit Convention:** `{type}(pNN-tNN): {description}`

## Planning Checklist

- [x] Requirements confirmed with the user
- [x] Lightweight design evaluated and intentionally skipped
- [x] Phases evaluated for parallelism
- [x] `oat_plan_parallel_groups` set from dependency/write-set analysis
- [x] Dispatch policy resolved before implementation readiness
- [x] Plan artifact review passed

## Parallelism

`oat_plan_parallel_groups: []` keeps execution sequential. Phase 2 must document the finalized reviewer contract from Phase 1, and Phase 3 must generate provider views and release assets from the combined canonical-agent and documentation changes. Running distribution or release validation concurrently would risk stale generated output and would validate an incomplete shipped diff.

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

## Reviews

| Scope  | Type     | Status          | Date       | Artifact                                                      |
| ------ | -------- | --------------- | ---------- | ------------------------------------------------------------- |
| p01    | code     | passed          | 2026-07-18 | reviews/archived/p01-review-2026-07-18T224716Z.md             |
| p02    | code     | passed          | 2026-07-18 | reviews/archived/p02-review-2026-07-18T225832Z.md             |
| p03    | code     | passed          | 2026-07-18 | reviews/archived/p03-review-2026-07-18T233038Z.md             |
| final  | code     | passed          | 2026-07-18 | reviews/archived/final-review-2026-07-18T234708Z.md           |
| spec   | artifact | pending         | -          | -                                                             |
| design | artifact | fixes_completed | 2026-07-19 | reviews/archived/artifact-design-review-2026-07-19T001316Z.md |
| plan   | artifact | fixes_completed | 2026-07-18 | reviews/archived/artifact-plan-review-2026-07-18T194838Z.md   |
| plan   | artifact | passed          | 2026-07-18 | reviews/archived/artifact-plan-review-2026-07-18T200447Z.md   |
| plan   | artifact | passed          | 2026-07-18 | reviews/archived/artifact-plan-review-2026-07-18T221957Z.md   |

**Status values:** `pending` → `received` → `fixes_added` → `fixes_completed` → `passed`

Quick-mode implementation readiness depends on the `plan` artifact review, not on optional `spec` or `design` rows.

The configured gate passed at its Important threshold on 2026-07-18. Its two non-blocking Medium findings were applied directly to this plan before finalization.

---

## Implementation Complete

**Summary:**

- Phase 1: 1 task - Canonical reviewer orchestration contract and regression coverage
- Phase 2: 1 task - User-facing review workflow documentation
- Phase 3: 3 tasks - Provider synchronization, lockstep release validation, backlog closeout, and unpublished-version correction

**Total: 3 phases, 5 tasks**

Ready for code review and merge after all tasks and required reviews pass.

---

## References

- Discovery: `discovery.md`
- Backlog item: “Enable oat-reviewer subagent orchestration for faster broad reviews” (`BL-260708-enable-oat-reviewer-subagent`) — current: `.oat/repo/pjm/backlog/items/BL-260708-enable-oat-reviewer-subagent.md`; after `p03-t02`: `.oat/repo/pjm/backlog/archived/BL-260708-enable-oat-reviewer-subagent.md`
- Current reviewer: `.agents/agents/oat-reviewer.md`
- Shared nested-dispatch contract: `.agents/skills/oat-dispatch-subagents/SKILL.md`
- Review workflow docs: `apps/oat-docs/docs/workflows/projects/reviews.md`
- Project summary follow-up: `.oat/repo/reference/project-summaries/20260709-codex-family-subagents.md`
