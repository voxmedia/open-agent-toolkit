---
oat_status: complete
oat_ready_for: oat-project-implement
oat_blockers: []
oat_last_updated: 2026-02-18
oat_phase: plan
oat_phase_status: complete
oat_plan_hil_phases: ["p04"]
oat_plan_source: imported
oat_import_reference: references/imported-plan.md
oat_import_source_path: /Users/thomas.stang/Code/open-agent-toolkit/.oat/repo/reference/external-plans/2026-02-18-oat-cleanup-project-and-artifacts.md
oat_import_provider: null
oat_generated: false
---

# Implementation Plan: oat-cleanup-project-and-artifacts

> Execute this plan using the `oat-project-implement` skill, task-by-task with phase checkpoints and review gates.

**Goal:** Deliver a single `oat cleanup` command family that repairs project-state drift and triages stale artifacts with safe dry-run/apply behavior.

**Architecture:** Add a new cleanup command module with two focused flows (`project`, `artifacts`) sharing action-normalization and summary contracts.

**Tech Stack:** TypeScript, Commander CLI, Vitest, Biome.

**Commit Convention:** `{type}({scope}): {description}` - e.g., `feat(p01-t01): register cleanup command group`

## Planning Checklist

- [x] Imported external plan preserved at `references/imported-plan.md`
- [x] Generated canonical `pNN-tNN` task sequence
- [x] Marked plan ready for `oat-project-implement`

---

## Phase 1: Command Surface and Shared Contracts

### Task p01-t01: Register `oat cleanup` command group and subcommands

**Files:**
- Modify: `packages/cli/src/commands/index.ts`
- Create: `packages/cli/src/commands/cleanup/index.ts`

**Step 1: Write test (RED)**

Add/extend command registration tests to assert `cleanup project` and `cleanup artifacts` are present.

Run: `pnpm --filter @oat/cli test -- packages/cli/src/commands/index.test.ts`
Expected: Fails until cleanup command wiring exists.

**Step 2: Implement (GREEN)**

Register the cleanup command group in root command assembly and wire both subcommands.

Run: `pnpm --filter @oat/cli test -- packages/cli/src/commands/index.test.ts`
Expected: Registration tests pass.

**Step 3: Refactor**

Keep command registration consistent with existing command module patterns.

**Step 4: Verify**

Run: `pnpm --filter @oat/cli lint && pnpm --filter @oat/cli type-check`
Expected: No errors.

**Step 5: Commit**

```bash
git add packages/cli/src/commands/index.ts packages/cli/src/commands/cleanup/index.ts
git commit -m "feat(p01-t01): register cleanup command group"
```

---

### Task p01-t02: Scaffold cleanup module tree with shared types and utils

**Files:**
- Create: `packages/cli/src/commands/cleanup/cleanup.types.ts`
- Create: `packages/cli/src/commands/cleanup/cleanup.utils.ts`
- Create: `packages/cli/src/commands/cleanup/project/project.types.ts`
- Create: `packages/cli/src/commands/cleanup/project/project.utils.ts`
- Create: `packages/cli/src/commands/cleanup/artifacts/artifacts.types.ts`
- Create: `packages/cli/src/commands/cleanup/artifacts/artifacts.utils.ts`

**Step 1: Write test (RED)**

Add unit tests for action typing/normalization helpers and deterministic summary shaping.

Run: `pnpm --filter @oat/cli test -- packages/cli/src/commands/cleanup/**/*.test.ts`
Expected: Tests fail until types/utils exist.

**Step 2: Implement (GREEN)**

Create base contracts for `status`, `mode`, `summary`, and `actions` records shared by both subcommands.

Run: `pnpm --filter @oat/cli test -- packages/cli/src/commands/cleanup/**/*.test.ts`
Expected: New helper tests pass.

**Step 3: Refactor**

Extract repeated shape/format logic into shared utility functions.

**Step 4: Verify**

Run: `pnpm --filter @oat/cli lint && pnpm --filter @oat/cli type-check`
Expected: No errors.

**Step 5: Commit**

```bash
git add packages/cli/src/commands/cleanup
git commit -m "feat(p01-t02): scaffold cleanup contracts and utilities"
```

---

### Task p01-t03: Add help snapshots and command-surface tests for cleanup

**Files:**
- Modify: `packages/cli/src/commands/help-snapshots.test.ts`
- Modify: `packages/cli/src/commands/commands.integration.test.ts`
- Create: `packages/cli/src/commands/cleanup/index.test.ts`

**Step 1: Write test (RED)**

Update snapshots and integration assertions for the new command surface.

Run: `pnpm --filter @oat/cli test -- packages/cli/src/commands/help-snapshots.test.ts packages/cli/src/commands/commands.integration.test.ts`
Expected: Snapshot/assertion failures before cleanup wiring is complete.

**Step 2: Implement (GREEN)**

Regenerate/update snapshots and finalize integration coverage for both subcommands.

Run: `pnpm --filter @oat/cli test -- packages/cli/src/commands/help-snapshots.test.ts packages/cli/src/commands/commands.integration.test.ts`
Expected: Tests pass with stable output.

**Step 3: Refactor**

Remove duplicate command expectation helpers and keep snapshots deterministic.

**Step 4: Verify**

Run: `pnpm --filter @oat/cli test -- packages/cli/src/commands/help-snapshots.test.ts`
Expected: Snapshot test remains stable.

**Step 5: Commit**

```bash
git add packages/cli/src/commands/help-snapshots.test.ts packages/cli/src/commands/commands.integration.test.ts packages/cli/src/commands/cleanup/index.test.ts
git commit -m "test(p01-t03): cover cleanup command surface"
```

---

## Phase 2: Implement `cleanup project`

### Task p02-t01: Implement project drift scanning and dry-run planning

**Files:**
- Create: `packages/cli/src/commands/cleanup/project/project.ts`
- Modify: `packages/cli/src/commands/cleanup/project/project.utils.ts`

**Step 1: Write test (RED)**

Add tests for detecting invalid `.oat/active-project`, missing `state.md`, and missing lifecycle completion metadata.

Run: `pnpm --filter @oat/cli test -- packages/cli/src/commands/cleanup/project/project.test.ts`
Expected: Detection/planning tests fail until scan logic is implemented.

**Step 2: Implement (GREEN)**

Build dry-run scan across shared/local project roots and produce deterministic planned actions.

Run: `pnpm --filter @oat/cli test -- packages/cli/src/commands/cleanup/project/project.test.ts`
Expected: Drift-scan tests pass.

**Step 3: Refactor**

Split filesystem probing from action planning for clearer coverage.

**Step 4: Verify**

Run: `pnpm --filter @oat/cli lint && pnpm --filter @oat/cli type-check`
Expected: No errors.

**Step 5: Commit**

```bash
git add packages/cli/src/commands/cleanup/project/project.ts packages/cli/src/commands/cleanup/project/project.utils.ts packages/cli/src/commands/cleanup/project/project.test.ts
git commit -m "feat(p02-t01): add cleanup project drift scanner"
```

---

### Task p02-t02: Implement apply-mode project remediations and dashboard regeneration

**Files:**
- Modify: `packages/cli/src/commands/cleanup/project/project.ts`
- Modify: `packages/cli/src/commands/cleanup/project/project.utils.ts`
- Modify: `packages/cli/src/commands/state/generate.ts`

**Step 1: Write test (RED)**

Add apply-mode tests covering pointer clearing, `state.md` regeneration from template, lifecycle upsert, and dashboard regeneration trigger.

Run: `pnpm --filter @oat/cli test -- packages/cli/src/commands/cleanup/project/project.test.ts`
Expected: Apply-mode assertions fail before mutation code exists.

**Step 2: Implement (GREEN)**

Execute planned remediations only with `--apply` and preserve dry-run behavior by default.

Run: `pnpm --filter @oat/cli test -- packages/cli/src/commands/cleanup/project/project.test.ts`
Expected: Apply-mode tests pass.

**Step 3: Refactor**

Consolidate mutation execution and result mapping into reusable helpers.

**Step 4: Verify**

Run: `pnpm --filter @oat/cli test -- packages/cli/src/commands/cleanup/project/project.test.ts`
Expected: Deterministic pass across dry-run and apply scenarios.

**Step 5: Commit**

```bash
git add packages/cli/src/commands/cleanup/project/project.ts packages/cli/src/commands/cleanup/project/project.utils.ts packages/cli/src/commands/state/generate.ts
git commit -m "feat(p02-t02): add cleanup project apply remediations"
```

---

### Task p02-t03: Finalize `cleanup project` JSON output contract coverage

**Files:**
- Modify: `packages/cli/src/commands/cleanup/project/project.test.ts`
- Modify: `packages/cli/src/commands/cleanup/cleanup.types.ts`

**Step 1: Write test (RED)**

Add assertions for `status`, `mode`, `summary` counters, and normalized `actions` payload shape.

Run: `pnpm --filter @oat/cli test -- packages/cli/src/commands/cleanup/project/project.test.ts`
Expected: Contract tests fail until payload shape is stable.

**Step 2: Implement (GREEN)**

Normalize project cleanup output to the shared contract and include deterministic count semantics.

Run: `pnpm --filter @oat/cli test -- packages/cli/src/commands/cleanup/project/project.test.ts`
Expected: Contract tests pass.

**Step 3: Refactor**

Ensure summary and action normalization reuse shared cleanup helpers.

**Step 4: Verify**

Run: `pnpm --filter @oat/cli lint && pnpm --filter @oat/cli type-check`
Expected: No errors.

**Step 5: Commit**

```bash
git add packages/cli/src/commands/cleanup/project/project.test.ts packages/cli/src/commands/cleanup/cleanup.types.ts
git commit -m "test(p02-t03): lock cleanup project output contract"
```

---

## Phase 3: Implement `cleanup artifacts`

### Task p03-t01: Implement duplicate-chain detection and prune planning

**Files:**
- Create: `packages/cli/src/commands/cleanup/artifacts/artifacts.ts`
- Modify: `packages/cli/src/commands/cleanup/artifacts/artifacts.utils.ts`
- Create: `packages/cli/src/commands/cleanup/artifacts/duplicate-chains.test.ts`

**Step 1: Write test (RED)**

Add parser tests for chains (`foo.md`, `foo-v2.md`, `foo-v3.md`) and latest-version selection.

Run: `pnpm --filter @oat/cli test -- packages/cli/src/commands/cleanup/artifacts/duplicate-chains.test.ts`
Expected: Chain parsing tests fail before utility implementation.

**Step 2: Implement (GREEN)**

Implement duplicate-chain discovery and mark older versions for prune actions.

Run: `pnpm --filter @oat/cli test -- packages/cli/src/commands/cleanup/artifacts/duplicate-chains.test.ts`
Expected: Chain tests pass.

**Step 3: Refactor**

Separate version parsing from candidate selection for clearer behavior.

**Step 4: Verify**

Run: `pnpm --filter @oat/cli lint && pnpm --filter @oat/cli type-check`
Expected: No errors.

**Step 5: Commit**

```bash
git add packages/cli/src/commands/cleanup/artifacts/artifacts.ts packages/cli/src/commands/cleanup/artifacts/artifacts.utils.ts packages/cli/src/commands/cleanup/artifacts/duplicate-chains.test.ts
git commit -m "feat(p03-t01): add duplicate-chain pruning for cleanup artifacts"
```

---

### Task p03-t02: Implement stale-candidate discovery and reference guards

**Files:**
- Modify: `packages/cli/src/commands/cleanup/artifacts/artifacts.ts`
- Modify: `packages/cli/src/commands/cleanup/artifacts/artifacts.utils.ts`
- Create: `packages/cli/src/commands/cleanup/artifacts/reference-guards.test.ts`

**Step 1: Write test (RED)**

Add tests for stale candidate sets under `.oat/repo/reviews` and `.oat/repo/reference/external-plans`, including reference hits from active project artifacts and `.oat/repo/reference/**/*.md`.

Run: `pnpm --filter @oat/cli test -- packages/cli/src/commands/cleanup/artifacts/reference-guards.test.ts`
Expected: Guard tests fail until scan logic exists.

**Step 2: Implement (GREEN)**

Compute candidate sets after duplicate pruning and annotate candidates as referenced/unreferenced.

Run: `pnpm --filter @oat/cli test -- packages/cli/src/commands/cleanup/artifacts/reference-guards.test.ts`
Expected: Guard tests pass.

**Step 3: Refactor**

Extract markdown reference scanning into isolated utilities for reuse.

**Step 4: Verify**

Run: `pnpm --filter @oat/cli test -- packages/cli/src/commands/cleanup/artifacts/reference-guards.test.ts`
Expected: Deterministic pass.

**Step 5: Commit**

```bash
git add packages/cli/src/commands/cleanup/artifacts/artifacts.ts packages/cli/src/commands/cleanup/artifacts/artifacts.utils.ts packages/cli/src/commands/cleanup/artifacts/reference-guards.test.ts
git commit -m "feat(p03-t02): add stale artifact discovery with reference guards"
```

---

### Task p03-t03: Implement interactive Keep/Archive/Delete stale triage

**Files:**
- Modify: `packages/cli/src/commands/cleanup/artifacts/artifacts.ts`
- Modify: `packages/cli/src/commands/shared/shared.prompts.ts`
- Create: `packages/cli/src/commands/cleanup/artifacts/interactive-triage.test.ts`

**Step 1: Write test (RED)**

Add interaction tests for archive/delete selection flows and explicit referenced-item confirmation.

Run: `pnpm --filter @oat/cli test -- packages/cli/src/commands/cleanup/artifacts/interactive-triage.test.ts`
Expected: Prompt flow tests fail before triage implementation.

**Step 2: Implement (GREEN)**

Implement interactive apply triage with Keep/Archive/Delete decisions and confirmation guardrails.

Run: `pnpm --filter @oat/cli test -- packages/cli/src/commands/cleanup/artifacts/interactive-triage.test.ts`
Expected: Triage tests pass.

**Step 3: Refactor**

Keep prompt orchestration isolated from action execution for testability.

**Step 4: Verify**

Run: `pnpm --filter @oat/cli test -- packages/cli/src/commands/cleanup/artifacts/interactive-triage.test.ts`
Expected: Stable pass.

**Step 5: Commit**

```bash
git add packages/cli/src/commands/cleanup/artifacts/artifacts.ts packages/cli/src/commands/shared/shared.prompts.ts packages/cli/src/commands/cleanup/artifacts/interactive-triage.test.ts
git commit -m "feat(p03-t03): add interactive stale artifact triage"
```

---

### Task p03-t04: Implement archive mechanics and non-interactive safety gates

**Files:**
- Modify: `packages/cli/src/commands/cleanup/artifacts/artifacts.ts`
- Modify: `packages/cli/src/commands/cleanup/artifacts/artifacts.utils.ts`
- Create: `packages/cli/src/commands/cleanup/artifacts/noninteractive.test.ts`

**Step 1: Write test (RED)**

Add tests for archive destination routing, collision-safe naming, `--all-candidates --yes` gating, and referenced candidate blocking in non-interactive mode.

Run: `pnpm --filter @oat/cli test -- packages/cli/src/commands/cleanup/artifacts/noninteractive.test.ts`
Expected: Safety-gate tests fail before implementation.

**Step 2: Implement (GREEN)**

Implement archive moves to repo archive conventions and enforce required confirmation flags for broad non-interactive deletes.

Run: `pnpm --filter @oat/cli test -- packages/cli/src/commands/cleanup/artifacts/noninteractive.test.ts`
Expected: Non-interactive and archive tests pass.

**Step 3: Refactor**

Unify action recording for archive/delete/skip/block outcomes.

**Step 4: Verify**

Run: `pnpm --filter @oat/cli lint && pnpm --filter @oat/cli type-check`
Expected: No errors.

**Step 5: Commit**

```bash
git add packages/cli/src/commands/cleanup/artifacts/artifacts.ts packages/cli/src/commands/cleanup/artifacts/artifacts.utils.ts packages/cli/src/commands/cleanup/artifacts/noninteractive.test.ts
git commit -m "feat(p03-t04): enforce archive and non-interactive cleanup safety"
```

---

## Phase 4: Convergence, Integration, and Docs

### Task p04-t01: Add integration coverage and idempotency checks

**Files:**
- Modify: `packages/cli/src/commands/commands.integration.test.ts`
- Create: `packages/cli/src/commands/cleanup/cleanup.integration.test.ts`
- Create: `packages/cli/src/commands/cleanup/__fixtures__/cleanup-scenarios/*`

**Step 1: Write test (RED)**

Add integration scenarios with mixed duplicate chains, stale artifacts, and references; include second-run idempotency assertion.

Run: `pnpm --filter @oat/cli test -- packages/cli/src/commands/cleanup/cleanup.integration.test.ts`
Expected: Integration tests fail before cleanup flows converge.

**Step 2: Implement (GREEN)**

Finish end-to-end flow behavior and deterministic summaries for both subcommands.

Run: `pnpm --filter @oat/cli test -- packages/cli/src/commands/cleanup/cleanup.integration.test.ts`
Expected: Integration tests pass.

**Step 3: Refactor**

Consolidate fixture helpers and reduce duplicated setup logic.

**Step 4: Verify**

Run: `pnpm --filter @oat/cli test -- packages/cli/src/commands/cleanup/cleanup.integration.test.ts`
Expected: Stable pass.

**Step 5: Commit**

```bash
git add packages/cli/src/commands/cleanup/cleanup.integration.test.ts packages/cli/src/commands/cleanup/__fixtures__ packages/cli/src/commands/commands.integration.test.ts
git commit -m "test(p04-t01): add cleanup integration and idempotency coverage"
```

---

### Task p04-t02: Update docs/backlog references and run final verification

**Files:**
- Modify: `.oat/repo/reference/backlog.md`
- Modify: `.oat/repo/reference/external-plans/2026-02-18-oat-cleanup-project-and-artifacts.md`
- Modify: CLI docs/help surfaces as needed

**Step 1: Write test (RED)**

TODO: If docs snapshot checks exist, add/update them so stale command references fail before docs refresh.

Run: `pnpm --filter @oat/cli test -- packages/cli/src/commands/help-snapshots.test.ts`
Expected: Snapshot mismatch before docs/help updates.

**Step 2: Implement (GREEN)**

Update documentation/backlog tracking and ensure JSON output examples align with implemented contract.

Run: `pnpm --filter @oat/cli test -- packages/cli/src/commands/help-snapshots.test.ts`
Expected: Help/doc snapshots pass.

**Step 3: Refactor**

Remove outdated wording about separate cleanup commands and keep one authoritative command surface.

**Step 4: Verify**

Run: `pnpm lint && pnpm type-check && pnpm test`
Expected: Workspace checks pass.

**Step 5: Commit**

```bash
git add .oat/repo/reference/backlog.md .oat/repo/reference/external-plans/2026-02-18-oat-cleanup-project-and-artifacts.md packages/cli/src/commands/help-snapshots.test.ts
git commit -m "docs(p04-t02): align cleanup docs and backlog with unified command"
```

---

### Task p04-t03: (review) Wire `cleanup artifacts` command options and execution flow

**Files:**
- Modify: `packages/cli/src/commands/cleanup/artifacts/artifacts.ts`
- Modify: `packages/cli/src/commands/help-snapshots.test.ts`
- Modify: `packages/cli/src/commands/commands.integration.test.ts`

**Step 1: Understand the issue**

Review finding: The `cleanup artifacts` command is registered but has no options or action handler, so it is effectively a no-op at CLI level.
Location: `packages/cli/src/commands/cleanup/artifacts/artifacts.ts`

**Step 2: Implement fix**

Add command options (`--apply`, `--all-candidates`, `--yes`) and wire the command action to orchestrate the existing artifact planning/triage utilities so behavior is reachable from CLI.

**Step 3: Verify**

Run: `pnpm --filter @oat/cli test -- packages/cli/src/commands/help-snapshots.test.ts packages/cli/src/commands/commands.integration.test.ts packages/cli/src/commands/cleanup/artifacts/*.test.ts`
Expected: Help snapshots and artifact command integration/tests pass with wired command behavior.

**Step 4: Commit**

```bash
git add packages/cli/src/commands/cleanup/artifacts/artifacts.ts packages/cli/src/commands/help-snapshots.test.ts packages/cli/src/commands/commands.integration.test.ts packages/cli/src/commands/cleanup/artifacts/*.test.ts
git commit -m "feat(p04-t03): wire cleanup artifacts command execution"
```

---

### Task p04-t04: (review) Fix archive target double-resolution in `planArchiveActions`

**Files:**
- Modify: `packages/cli/src/commands/cleanup/artifacts/artifacts.ts`
- Modify: `packages/cli/src/commands/cleanup/artifacts/noninteractive.test.ts`

**Step 1: Understand the issue**

Review finding: `planArchiveActions` resolves archive base path before calling `buildArchiveTargetPath`, which resolves again internally.
Location: `packages/cli/src/commands/cleanup/artifacts/artifacts.ts`

**Step 2: Implement fix**

Make caller/callee responsibilities explicit so archive base path is resolved exactly once, and keep path behavior deterministic.

**Step 3: Verify**

Run: `pnpm --filter @oat/cli test -- packages/cli/src/commands/cleanup/artifacts/noninteractive.test.ts`
Expected: Archive planning tests pass and cover the no-double-resolution behavior.

**Step 4: Commit**

```bash
git add packages/cli/src/commands/cleanup/artifacts/artifacts.ts packages/cli/src/commands/cleanup/artifacts/noninteractive.test.ts
git commit -m "fix(p04-t04): resolve archive paths once in planArchiveActions"
```

---

### Task p04-t05: (review) Add structured error handling and exit codes to `cleanup project`

**Files:**
- Modify: `packages/cli/src/commands/cleanup/project/project.ts`
- Modify: `packages/cli/src/commands/cleanup/project/project.test.ts`

**Step 1: Understand the issue**

Review finding: Command action lacks try/catch and explicit exit-code handling for actionable vs runtime failures.
Location: `packages/cli/src/commands/cleanup/project/project.ts`

**Step 2: Implement fix**

Wrap command action in error handling aligned with CLI conventions, emit JSON-safe error payloads when `--json` is used, and set exit code `1`/`2` based on failure class.

**Step 3: Verify**

Run: `pnpm --filter @oat/cli test -- packages/cli/src/commands/cleanup/project/project.test.ts`
Expected: Project cleanup tests pass with explicit error-path and exit-code coverage.

**Step 4: Commit**

```bash
git add packages/cli/src/commands/cleanup/project/project.ts packages/cli/src/commands/cleanup/project/project.test.ts
git commit -m "fix(p04-t05): add cleanup project error handling and exit codes"
```

---

### Task p04-t06: (review) Extract shared repo-relative path helper for cleanup modules

**Files:**
- Modify: `packages/cli/src/commands/cleanup/cleanup.utils.ts`
- Modify: `packages/cli/src/commands/cleanup/project/project.ts`
- Modify: `packages/cli/src/commands/cleanup/artifacts/artifacts.ts`

**Step 1: Understand the issue**

Review finding: `toRepoRelativePath` is duplicated across project and artifacts modules.
Location: `packages/cli/src/commands/cleanup/project/project.ts`, `packages/cli/src/commands/cleanup/artifacts/artifacts.ts`

**Step 2: Implement fix**

Move path-normalization helper into shared cleanup utilities and update both modules to use the shared function.

**Step 3: Verify**

Run: `pnpm --filter @oat/cli test -- packages/cli/src/commands/cleanup/**/*.test.ts`
Expected: Cleanup module tests pass with shared helper usage.

**Step 4: Commit**

```bash
git add packages/cli/src/commands/cleanup/cleanup.utils.ts packages/cli/src/commands/cleanup/project/project.ts packages/cli/src/commands/cleanup/artifacts/artifacts.ts packages/cli/src/commands/cleanup/**/*.test.ts
git commit -m "refactor(p04-t06): share repo-relative path helper"
```

---

### Task p04-t07: (review) Remove unused cleanup types and scan-result factories

**Files:**
- Modify: `packages/cli/src/commands/cleanup/project/project.types.ts`
- Modify: `packages/cli/src/commands/cleanup/project/project.utils.ts`
- Modify: `packages/cli/src/commands/cleanup/artifacts/artifacts.types.ts`
- Modify: `packages/cli/src/commands/cleanup/artifacts/artifacts.utils.ts`
- Modify: `packages/cli/src/commands/cleanup/project/project.ts`

**Step 1: Understand the issue**

Review finding: Several exported types/factories are currently unused and add dead surface area.
Location: cleanup project/artifacts types + utils modules.

**Step 2: Implement fix**

Remove dead definitions and adjust callers/imports to keep only active contracts used by runtime flow and tests.

**Step 3: Verify**

Run: `pnpm --filter @oat/cli lint && pnpm --filter @oat/cli type-check && pnpm --filter @oat/cli test -- packages/cli/src/commands/cleanup/**/*.test.ts`
Expected: No type/lint regressions and cleanup suites stay green.

**Step 4: Commit**

```bash
git add packages/cli/src/commands/cleanup/project/project.types.ts packages/cli/src/commands/cleanup/project/project.utils.ts packages/cli/src/commands/cleanup/artifacts/artifacts.types.ts packages/cli/src/commands/cleanup/artifacts/artifacts.utils.ts packages/cli/src/commands/cleanup/project/project.ts packages/cli/src/commands/cleanup/**/*.test.ts
git commit -m "refactor(p04-t07): remove unused cleanup scan contracts"
```

---

### Task p04-t08: (review) Cover `planArchiveActions` composition and keep exports intentional

**Files:**
- Modify: `packages/cli/src/commands/cleanup/artifacts/artifacts.ts`
- Modify: `packages/cli/src/commands/cleanup/artifacts/noninteractive.test.ts`

**Step 1: Understand the issue**

Review finding: `planArchiveActions` export lacks direct coverage and was previously unreferenced by command execution.
Location: `packages/cli/src/commands/cleanup/artifacts/artifacts.ts`

**Step 2: Implement fix**

Ensure `planArchiveActions` is either used in the command orchestration path or made internal; add direct composition tests to lock expected behavior.

**Step 3: Verify**

Run: `pnpm --filter @oat/cli test -- packages/cli/src/commands/cleanup/artifacts/noninteractive.test.ts packages/cli/src/commands/cleanup/cleanup.integration.test.ts`
Expected: Composition behavior is tested and stable.

**Step 4: Commit**

```bash
git add packages/cli/src/commands/cleanup/artifacts/artifacts.ts packages/cli/src/commands/cleanup/artifacts/noninteractive.test.ts packages/cli/src/commands/cleanup/cleanup.integration.test.ts
git commit -m "test(p04-t08): cover planArchiveActions composition"
```

---

## Reviews

| Scope | Type | Status | Date | Artifact |
|-------|------|--------|------|----------|
| p01 | code | pending | - | - |
| p02 | code | pending | - | - |
| p03 | code | pending | - | - |
| p04 | code | pending | - | - |
| final | code | passed | 2026-02-18 | reviews/final-review-2026-02-18.md |
| spec | artifact | pending | - | - |
| design | artifact | pending | - | - |

**Status values:** `pending` -> `received` -> `fixes_added` -> `fixes_completed` -> `passed`

---

## Implementation Complete

**Summary:**
- Phase 1: 3 tasks - command surface scaffolding and shared contracts
- Phase 2: 3 tasks - project drift detection/remediation and contract locking
- Phase 3: 4 tasks - artifact duplicate pruning, reference guards, and triage flows
- Phase 4: 8 tasks - integration convergence, docs, final verification, and final review fixes

**Total: 18 tasks**

Ready for implementation with `oat-project-implement`.

---

## References

- Imported Source: `references/imported-plan.md`
- External Source Path: `/Users/thomas.stang/Code/open-agent-toolkit/.oat/repo/reference/external-plans/2026-02-18-oat-cleanup-project-and-artifacts.md`
- Backlog: `.oat/repo/reference/backlog.md`
- CLI Commands Root: `packages/cli/src/commands`
