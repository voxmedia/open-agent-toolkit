---
oat_generated: true
oat_generated_at: 2026-07-24T12:32:05Z
oat_review_scope: p01 re-review 2
oat_review_type: code
oat_review_invocation: manual
oat_project: /Users/tstang/orca/workspaces/open-agent-toolkit/oat-install-config-bug/.oat/projects/shared/config-bug
oat_review_request_id: config-bug-p01-rereview-20260724T1228Z
oat_dispatch_policy: high
oat_dispatch_ceiling: high
oat_dispatch_target: oat-reviewer-gpt-5-6-sol-high
oat_model_axis: selected:gpt-5.6-sol-high
oat_effort_axis: not-applicable
---

# Code Review: p01 Re-review 2

**Reviewed:** 2026-07-24T12:32:05Z
**Scope:** Fresh root-owned phase p01 re-review after the direct-brainstorm persistence repair
**Files reviewed:** 23 changed files, plus relevant surrounding command, config, and test code
**Full range:** `eea4313d428553940f78fedb3e469ab123f2852f..fc1a974cac4bb91bc9a57094ce17251b78cb4c7d` (5 commits)
**Review-fix range:** `22ae71c56ae87f134f0b4d610f7517fdbbd1bc61..fc1a974cac4bb91bc9a57094ce17251b78cb4c7d` (1 commit)

## Summary

The production fix removes shared-config persistence from the direct brainstorm command, leaves project-only reconciliation with the shared parent hook, suppresses writes when no project packs exist, and preserves reconciliation-before-auto-sync ordering. However, both new command-path regression tests replace the real brainstorm action with a stub, so they would pass even if the removed child-level persistence were reintroduced; the prior Important behavior is fixed in code but is not yet protected by the explicitly required regression coverage.

Findings: 0 critical, 1 important, 0 medium, 0 minor

**Verdict:** Changes required — phase p01 does not pass until the direct-command regressions execute the real brainstorm action.

## Findings

### Critical

None.

### Important

- **Direct brainstorm regressions bypass the handler that owned the bug** (`packages/cli/src/commands/init/tools/index.test.ts:1231`)
  - Issue: The new `oat init tools brainstorm` test replaces `brainstormCommand`'s action at lines 1231-1238 with a stub that only sets canonical-path metadata, then observes the parent reconciler's injected `writeOatConfig` spy. The corresponding `oat tools install brainstorm` tests do the same at `packages/cli/src/commands/tools/install/index.test.ts:274-281` and `:311-318`. Consequently, none of these tests executes `runInitToolsBrainstorm`; they would have passed with the prior `persistConfigAfterInstall` implementation still present because the offending child action is never invoked. The child unit test confirms metadata recording but no longer has any assertion capable of detecting a direct shared-config write (`packages/cli/src/commands/init/tools/brainstorm/index.test.ts:244-250`). This leaves the exact prior Important regression unguarded despite the discovery/design/plan requirement for command-path coverage.
  - Fix: Exercise the real brainstorm subcommand through both `createInitToolsCommand` and `createToolsInstallCommand`. Add a child-command dependency/factory seam or targeted module mocks so the real action can run without filesystem side effects, and spy on the shared config module used by both child and parent. Assert that user-only installs perform zero shared writes when the project scan is empty, and that a real project install writes the reconciled map before wrapper auto-sync. The tests must fail if child-level persistence is restored.
  - Requirement: Discovery Success Criteria and Key Decision 3; Design Project Pack Reconciler responsibilities and Unit Tests; Plan p01-t01 Steps 1, 2, and 4; prior review Important fix guidance.

### Medium

None.

### Minor

None.

## Requirements/Design Alignment

**Evidence sources used:** `discovery.md`, `design.md`, `plan.md` (quick workflow), `implementation.md`, prior p01 review, the authoritative full and review-fix diffs, and surrounding CLI/config/test code in the implementation worktree. No `spec.md` exists, which is optional for this quick workflow.

### Requirements Coverage

| Requirement                                                                       | Status                             | Notes                                                                                                                                                                                                                                                                                  |
| --------------------------------------------------------------------------------- | ---------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Direct brainstorm no longer owns shared persistence                               | Implemented                        | `runInitToolsBrainstorm` performs installation and reports success without importing or calling config persistence; successful actions only publish installed canonical paths at `packages/cli/src/commands/init/tools/brainstorm/index.ts:224-233`.                                   |
| User-only direct commands do not create/write shared config with no project packs | Implemented, regression incomplete | The parent reconciler scans project scope and returns unchanged when both existing and derived `tools` are absent (`packages/cli/src/commands/tools/shared/project-tools-config.ts:80-105`). The added tests bypass the real child action and therefore do not guard the command path. |
| Project direct install reconciles before auto-sync                                | Implemented, regression incomplete | Pack post-action reconciliation runs at `packages/cli/src/commands/init/tools/index.ts:1372-1407`; wrapper auto-sync runs afterward at `packages/cli/src/commands/tools/install/index.ts:56-80`. The ordering assertion uses a stubbed child action rather than the real command path. |
| Shared `tools.*` derives only from project scope                                  | Implemented                        | The reconciler filters project tools into a deterministic complete pack map and ignores user scope (`packages/cli/src/commands/tools/shared/project-tools-config.ts:43-61,84-104`).                                                                                                    |
| Effective project-plus-user capability query                                      | Implemented                        | `oat tools has` scans requested concrete scopes and returns plain/JSON availability with the specified exit behavior (`packages/cli/src/commands/tools/has/has-pack.ts:37-67`; `packages/cli/src/commands/tools/has/index.ts:30-73`).                                                  |
| Pack-gated canonical consumers use effective availability                         | Implemented                        | Declared consumers use `oat tools has`; changed canonical skills have one version bump and the skill contracts pass.                                                                                                                                                                   |
| Complete p01 file and commit boundaries                                           | Implemented                        | The five commits touch only the 23 declared or approved p01 files; the review-fix commit is confined to the four approved direct-brainstorm command/test files.                                                                                                                        |

### Extra Work (not in declared requirements)

None.

## Verification Commands

The following checks passed during this re-review:

```bash
pnpm --filter @open-agent-toolkit/cli exec vitest run \
  src/commands/tools/shared/project-tools-config.test.ts \
  src/commands/tools/update/config-write.test.ts \
  src/commands/tools/remove/config-write.test.ts \
  src/commands/init/tools/index.test.ts \
  src/commands/init/tools/brainstorm/index.test.ts \
  src/commands/tools/install/index.test.ts \
  src/commands/tools/has/has-pack.test.ts \
  src/commands/tools/has/index.test.ts \
  src/commands/help-snapshots.test.ts \
  src/validation/skills.test.ts \
  src/validation/autonomy-gate-inventory.test.ts
pnpm --filter @open-agent-toolkit/cli type-check
pnpm --filter @open-agent-toolkit/cli lint
pnpm run oat:validate-skills
git diff --name-only -z eea4313d428553940f78fedb3e469ab123f2852f..fc1a974cac4bb91bc9a57094ce17251b78cb4c7d | xargs -0 pnpm exec oxfmt --check --
git diff --check eea4313d428553940f78fedb3e469ab123f2852f..fc1a974cac4bb91bc9a57094ce17251b78cb4c7d
```

Focused tests passed 272/272 across 11 files; type-check, lint, 61-skill validation, formatting for all 23 changed files, and diff hygiene passed.

## Recommended Next Step

Run `oat-project-review-receive` to add a bounded test-only repair, then re-review p01.
