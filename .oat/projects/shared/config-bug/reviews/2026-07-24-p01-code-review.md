---
oat_generated: true
oat_generated_at: 2026-07-24T12:18:40Z
oat_review_scope: p01
oat_review_type: code
oat_review_invocation: manual
oat_project: /Users/tstang/orca/workspaces/open-agent-toolkit/oat-install-config-bug/.oat/projects/shared/config-bug
oat_review_request_id: config-bug-p01-review-20260724T1213Z
oat_original_phase_request_id: config-bug-p01-20260724T1152Z
---

# Code Review: p01

**Reviewed:** 2026-07-24T12:18:40Z
**Scope:** Phase p01 tasks p01-t01, p01-t02, p01-t03, and bounded repair p01-fix1
**Files reviewed:** 21 changed files, plus relevant surrounding command and config code
**Commits:** `eea4313d428553940f78fedb3e469ab123f2852f..22ae71c56ae87f134f0b4d610f7517fdbbd1bc61` (4 commits)
**Reconnaissance:** not-attempted

## Summary

The phase correctly separates project-scoped shared config from effective project-plus-user availability, implements the specified `oat tools has` output and exit contracts, migrates the declared canonical consumers, and keeps reconciliation ahead of auto-sync. One direct-install path still performs its legacy shared-config write before the new parent post-action reconciler, so a user-only brainstorm install creates a default-only `.oat/config.json`; this violates the explicit no-empty-repo-pollution requirement and blocks a phase pass.

Findings: 0 critical, 1 important, 0 medium, 0 minor

**Verdict:** Changes required — phase p01 does not pass until the Important finding is resolved.

## Findings

### Critical

None.

### Important

- **Direct user-only brainstorm install still creates shared repository config** (`packages/cli/src/commands/init/tools/brainstorm/index.ts:210`)
  - Issue: `runInitToolsBrainstorm` still calls `persistConfigAfterInstall`, which writes `tools.brainstorm: true` for every successful direct install, including `--scope user` (`packages/cli/src/commands/init/tools/brainstorm/index.ts:158-164,210-213`). The new parent `postAction` hook subsequently reconciles from project scope, but when no project pack exists it can only remove `tools` and rewrite the now-existing file (`packages/cli/src/commands/init/tools/index.ts:1404-1407`; `packages/cli/src/commands/tools/shared/project-tools-config.ts:97-105`). The final result is a newly created default-only `.oat/config.json`, contrary to discovery's no-empty-repo-pollution requirement and design's explicit direct-brainstorm boundary. Existing direct-command tests encode the stale behavior by requiring a user install to write the shared flag (`packages/cli/src/commands/init/tools/brainstorm/index.test.ts:261-289`).
  - Fix: Remove the direct brainstorm `tools` write and let the shared parent post-action reconciler own pack state. Replace the stale child-command config assertions with parent-level tests for both `oat init tools brainstorm --scope user` and `oat tools install brainstorm --scope user`, proving no config file/write occurs when no project packs exist; also retain a project-scope direct-install case proving reconciliation occurs before install auto-sync.
  - Requirement: Discovery Key Decisions 1, 3, and 5; Design Project Pack Reconciler responsibilities and Testing Strategy.

### Medium

None.

### Minor

None.

## Requirements/Design Alignment

**Evidence sources used:** `discovery.md`, `design.md`, current `plan.md` Phase 1 and approved autonomy-contract boundary, `implementation.md`, the authoritative commit diff, and surrounding CLI/config code in the p01 worktree.

### Requirements Coverage

| Requirement                                                | Status               | Notes                                                                                                                                                                                                                        |
| ---------------------------------------------------------- | -------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Shared `tools.*` is project-only across lifecycle commands | Partial              | Aggregate install, update, and remove use the shared project scanner. Direct brainstorm still performs a legacy user-derived write before reconciliation.                                                                    |
| No empty-repo shared-config pollution                      | Missing for one path | Direct user-only brainstorm install creates a default-only shared config file. Other reconciler-driven user-only paths suppress the write.                                                                                   |
| Preserve unrelated shared configuration                    | Implemented          | Reconciliation spreads normalized shared config and changes only `tools`; focused coverage verifies preservation.                                                                                                            |
| Effective project-plus-user availability                   | Implemented          | `oat tools has` scans requested concrete scopes and returns matching scopes without persistence. User-only packs remain available through the user/all query path.                                                           |
| Plain/JSON/error/exit contract                             | Implemented          | Plain booleans, JSON envelope, valid-unavailable exit 0, invalid-input exit 1, and runtime-failure exit 2 are implemented and covered.                                                                                       |
| Config write before auto-sync                              | Implemented          | Update/remove source order is reconciliation then auto-sync; Commander runtime verification confirmed nested order `action → child postAction → parent postAction`, and install coverage asserts config write precedes sync. |
| Canonical workflow migrations and skill versions           | Implemented          | Declared consumers use `oat tools has`; changed canonical skills each received one version bump.                                                                                                                             |
| Prompt-site inventory mapping                              | Implemented          | Approved autonomy-contract hash updates match the changed prompt sites; the inventory test passes.                                                                                                                           |
| Task/repair commit and file boundaries                     | Implemented          | Four commits follow the requested task/repair structure. The autonomy-contract mapping is confined to the approved repair boundary; no unrelated changed file was found.                                                     |

### Extra Work (not in declared requirements)

None. The autonomy-contract mapping changes are within the approved p01 repair boundary.

## Verification Commands

The following checks passed during this review:

```bash
pnpm --filter @open-agent-toolkit/cli exec vitest run \
  src/commands/tools/shared/project-tools-config.test.ts \
  src/commands/tools/update/config-write.test.ts \
  src/commands/tools/remove/config-write.test.ts \
  src/commands/init/tools/index.test.ts \
  src/commands/tools/install/index.test.ts \
  src/commands/tools/has/has-pack.test.ts \
  src/commands/tools/has/index.test.ts \
  src/commands/help-snapshots.test.ts \
  src/validation/skills.test.ts \
  src/validation/autonomy-gate-inventory.test.ts
pnpm run oat:validate-skills
pnpm --filter @open-agent-toolkit/cli type-check
pnpm --filter @open-agent-toolkit/cli lint
pnpm exec oxfmt --check <all-21-changed-files>
git diff --check eea4313d428553940f78fedb3e469ab123f2852f..22ae71c56ae87f134f0b4d610f7517fdbbd1bc61
```

Focused tests passed 256/256 across 10 files; skill validation passed for 61 skills; type-check, lint, changed-file formatting, and diff hygiene passed.

After the fix, also run:

```bash
pnpm --filter @open-agent-toolkit/cli exec vitest run \
  src/commands/init/tools/brainstorm/index.test.ts \
  src/commands/init/tools/index.test.ts \
  src/commands/tools/install/index.test.ts \
  src/commands/tools/shared/project-tools-config.test.ts
```

## Recommended Next Step

Run `oat-project-review-receive` to convert the Important finding into a bounded repair task, then re-review p01.
