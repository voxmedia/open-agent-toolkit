---
oat_status: complete
oat_ready_for: null
oat_blockers: []
oat_last_updated: 2026-04-14
oat_current_task_id: null
oat_generated: false
---

# Implementation: install-sync

**Started:** 2026-04-14
**Last Updated:** 2026-04-14

> This document is used to resume interrupted implementation sessions.

## Progress Overview

| Phase   | Status   | Tasks | Completed |
| ------- | -------- | ----- | --------- |
| Phase 1 | complete | 2     | 2/2       |
| Phase 2 | complete | 2     | 2/2       |

**Total:** 4/4 tasks completed

---

## Phase 1: Scope Install-Triggered Sync

**Status:** complete
**Started:** 2026-04-14

### Task p01-t01: Reproduce and lock down the planning gap

**Status:** completed
**Commit:** ca70fab2

**Outcome (required):**

- Renamed the install-triggered sync filter contract from a removal-only concept to a general canonical scope
- Updated sync command plumbing to forward the broader canonical scope into plan computation
- Preserved existing stale-manifest removal behavior while making the API ready for scoped entry generation in the next task

**Files changed:**

- `packages/cli/src/engine/compute-plan.ts` - renamed the planner input from removal-only scoping to canonical-path scoping
- `packages/cli/src/engine/compute-plan.test.ts` - updated regression coverage to assert the broader canonical filter contract
- `packages/cli/src/commands/sync/index.ts` - forwarded the new canonical scope input into sync planning
- `packages/cli/src/commands/sync/index.test.ts` - verified install-triggered sync forwards canonical scope rather than a removal-only filter

**Verification:**

- Run: `pnpm --filter @open-agent-toolkit/cli test -- --run packages/cli/src/engine/compute-plan.test.ts packages/cli/src/commands/sync/index.test.ts`
- Result: Pass. Vitest executed the full CLI package suite, which provided broader coverage than planned and still passed.

**Notes / Decisions:**

- Kept behavior unchanged in this task apart from renaming and plumbing the scope contract
- Deferred actual entry-generation filtering to `p01-t02` so the planner API boundary lands before behavior changes

---

### Task p01-t02: Scope provider entry generation and removals to installed canonical paths

**Status:** completed
**Commit:** a8ad1a2f

**Outcome (required):**

- Scoped sync entry generation to the canonical paths passed by install-triggered sync
- Locked the planner behavior so unrelated canonical skills no longer produce provider sync operations during pack installs
- Completed phase 1 of the implementation plan

**Files changed:**

- `packages/cli/src/engine/compute-plan.ts` - filtered planned sync entries by the install-triggered canonical scope
- `packages/cli/src/engine/compute-plan.test.ts` - added regression coverage for unrelated canonical additions

**Verification:**

- Run: `pnpm --filter @open-agent-toolkit/cli exec vitest run src/engine/compute-plan.test.ts`
- Result: Pass

**Notes / Decisions:**

- Kept the canonical-path gate near `canonicalRelativePath` generation so all provider mappings share the same scoping rule

### Phase Summary (fill when phase is complete)

**Outcome (what changed):**

- Install-triggered sync now carries a general canonical-scope contract instead of a removal-only filter
- The sync planner excludes unrelated canonical entries when install scope is present
- Phase 1 established the core planner behavior needed before addressing Codex-specific side effects

**Key files touched:**

- `packages/cli/src/engine/compute-plan.ts` - planner contract and scoped entry filtering
- `packages/cli/src/engine/compute-plan.test.ts` - planner regression coverage
- `packages/cli/src/commands/sync/index.ts` - sync command plumbing for canonical scope
- `packages/cli/src/commands/sync/index.test.ts` - command-level forwarding coverage

**Verification:**

- Run: `pnpm --filter @open-agent-toolkit/cli test -- --run packages/cli/src/engine/compute-plan.test.ts packages/cli/src/commands/sync/index.test.ts`
- Result: Pass, with Vitest expanding to the full CLI package suite on the first run
- Run: `pnpm --filter @open-agent-toolkit/cli exec vitest run src/engine/compute-plan.test.ts`
- Result: Pass

**Notes / Decisions:**

- No checkpoint pause after phase 1 because `oat_plan_hill_phases` is set to `["p02"]`

---

## Phase 2: Scope Command-Level Side Effects

**Status:** in_progress
**Started:** 2026-04-14

### Task p02-t01: Prevent unrelated Codex config and provider writes during docs install

**Status:** completed
**Commit:** e2b50bfc

**Outcome (required):**

- Partial install-triggered sync now forwards canonical scope into Codex extension planning
- Codex extension planning no longer treats unrelated managed roles as stale during partial install sync
- Added targeted regression coverage for the Codex partial-sync path

**Files changed:**

- `packages/cli/src/commands/sync/index.ts` - forwarded install-triggered canonical scope into Codex extension planning
- `packages/cli/src/commands/sync/sync.types.ts` - updated dependency signatures for canonical-scoped sync and Codex extension planning
- `packages/cli/src/providers/codex/codec/sync-extension.ts` - filtered desired roles and disabled stale-role removal during partial install sync
- `packages/cli/src/commands/sync/index.test.ts` - added regression coverage for Codex extension scoping
- `packages/cli/src/providers/codex/codec/sync-extension.test.ts` - verified partial sync preserves unrelated managed roles/config

**Verification:**

- Run: `pnpm --filter @open-agent-toolkit/cli exec vitest run src/commands/sync/index.test.ts src/providers/codex/codec/sync-extension.test.ts`
- Result: Pass

**Notes / Decisions:**

- Used the conservative partial-sync rule: when install scope is present, Codex extension planning does not remove stale managed roles outside that scope

---

### Task p02-t02: Run focused validation and release guardrails

**Status:** completed
**Commit:** c4b2cf8a

**Outcome (required):**

- Ran the focused regression suite covering compute-plan, sync, install auto-sync, and Codex extension behavior
- Passed publishable-package release validation after bumping the lockstep public version to `0.0.37`
- Completed the final implementation task and phase 2

**Files changed:**

- `packages/cli/package.json` - bumped the CLI public package version to `0.0.37`
- `packages/control-plane/package.json` - kept public packages in lockstep for release validation
- `packages/docs-config/package.json` - kept public packages in lockstep for release validation
- `packages/docs-theme/package.json` - kept public packages in lockstep for release validation
- `packages/docs-transforms/package.json` - kept public packages in lockstep for release validation
- `packages/cli/assets/public-package-versions.json` - updated bundled public package version metadata

**Verification:**

- Run: `pnpm --filter @open-agent-toolkit/cli exec vitest run src/engine/compute-plan.test.ts src/commands/sync/index.test.ts src/commands/tools/install/index.test.ts src/providers/codex/codec/sync-extension.test.ts`
- Result: Pass
- Run: `pnpm release:validate`
- Result: Pass after the lockstep version bump

**Notes / Decisions:**

- Release validation required a version bump because this branch changes shipped CLI behavior

### Phase Summary (fill when phase is complete)

**Outcome (what changed):**

- Partial install-triggered sync now scopes provider-view planning and Codex extension planning to the installed canonical set
- Docs-only installs no longer cause unrelated Codex-managed roles to be removed or configured as stale
- The publishable-package contract is satisfied for the shipped CLI change

**Key files touched:**

- `packages/cli/src/commands/sync/index.ts` - Codex extension scope wiring
- `packages/cli/src/commands/sync/sync.types.ts` - sync dependency contract updates
- `packages/cli/src/providers/codex/codec/sync-extension.ts` - partial-sync preservation of unrelated managed roles
- `packages/cli/src/providers/codex/codec/sync-extension.test.ts` - partial-sync regression coverage
- `packages/cli/package.json` - CLI version bump to `0.0.37`

**Verification:**

- Run: `pnpm --filter @open-agent-toolkit/cli exec vitest run src/engine/compute-plan.test.ts src/commands/sync/index.test.ts src/commands/tools/install/index.test.ts src/providers/codex/codec/sync-extension.test.ts`
- Result: Pass
- Run: `pnpm release:validate`
- Result: Pass

**Notes / Decisions:**

- Final review should inspect both provider-view scoping and Codex partial-sync preservation

---

## Orchestration Runs

<!-- orchestration-runs-start -->
<!-- orchestration-runs-end -->

---

## Implementation Log

### 2026-04-14

**Session Start:** 22:16 UTC

- [x] p01-t01: Reproduce and lock down the planning gap - `ca70fab2`
- [x] p01-t02: Scope provider entry generation and removals to installed canonical paths - `a8ad1a2f`
- [x] p02-t01: Prevent unrelated Codex config and provider writes during docs install - `e2b50bfc`
- [x] p02-t02: Run focused validation and release guardrails - `c4b2cf8a`

**What changed (high level):**

- Quick-start artifacts created for the install-triggered sync scoping follow-up

**Decisions:**

- Treat install canonical paths as the authoritative sync scope for this project

**Follow-ups / TODO:**

- Create a fresh implementation branch before code changes begin

**Blockers:**

- None

---

## Deviations from Plan

| Task | Planned | Actual | Reason |
| ---- | ------- | ------ | ------ |
| -    | -       | -      | -      |

## Test Results

| Phase | Tests Run                                                                                                                                                                                                                                                                                                                                                                            | Passed | Failed | Coverage                 |
| ----- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | ------ | ------ | ------------------------ |
| 1     | `pnpm --filter @open-agent-toolkit/cli test -- --run packages/cli/src/engine/compute-plan.test.ts packages/cli/src/commands/sync/index.test.ts`; `pnpm --filter @open-agent-toolkit/cli exec vitest run src/engine/compute-plan.test.ts`                                                                                                                                             | yes    | no     | package-level + targeted |
| 2     | `pnpm --filter @open-agent-toolkit/cli exec vitest run src/commands/sync/index.test.ts src/providers/codex/codec/sync-extension.test.ts`; `pnpm --filter @open-agent-toolkit/cli exec vitest run src/engine/compute-plan.test.ts src/commands/sync/index.test.ts src/commands/tools/install/index.test.ts src/providers/codex/codec/sync-extension.test.ts`; `pnpm release:validate` | yes    | no     | targeted + release       |

## Final Summary (for PR/docs)

**What shipped:**

- Install-triggered sync now scopes planner entries to the canonical paths passed by the installer instead of only scoping removals
- Codex partial-sync planning preserves unrelated managed roles and `.codex/config.toml` entries during docs-only installs
- The CLI package and public package metadata were bumped to `0.0.37` to satisfy the publishable-package release contract

**Behavioral changes (user-facing):**

- `oat tools install docs` can no longer fan out unrelated provider-view additions from existing canonical content during auto-sync
- Docs-only installs no longer update Codex managed-role config for unrelated agents

**Key files / modules:**

- `packages/cli/src/engine/compute-plan.ts` - install-triggered canonical scoping in the sync planner
- `packages/cli/src/commands/sync/index.ts` - sync orchestration for scoped Codex extension planning
- `packages/cli/src/providers/codex/codec/sync-extension.ts` - partial-sync Codex role/config preservation
- `packages/cli/src/commands/sync/index.test.ts` - sync command regression coverage
- `packages/cli/src/providers/codex/codec/sync-extension.test.ts` - Codex extension partial-sync regression coverage

**Verification performed:**

- `pnpm --filter @open-agent-toolkit/cli test -- --run packages/cli/src/engine/compute-plan.test.ts packages/cli/src/commands/sync/index.test.ts`
- `pnpm --filter @open-agent-toolkit/cli exec vitest run src/engine/compute-plan.test.ts`
- `pnpm --filter @open-agent-toolkit/cli exec vitest run src/commands/sync/index.test.ts src/providers/codex/codec/sync-extension.test.ts`
- `pnpm --filter @open-agent-toolkit/cli exec vitest run src/engine/compute-plan.test.ts src/commands/sync/index.test.ts src/commands/tools/install/index.test.ts src/providers/codex/codec/sync-extension.test.ts`
- `pnpm release:validate`

**Design deltas (if any):**

- No design artifact was needed in quick mode; the implementation followed the discovery and plan directly

## References

- Plan: `plan.md`
- Discovery: `discovery.md`
