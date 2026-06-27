---
oat_generated: true
oat_generated_at: 2026-06-27
oat_review_scope: final
oat_review_type: code
oat_review_invocation: manual
oat_project: .oat/projects/shared/cli-help-flag-coverage
---

# Code Review: final

**Reviewed:** 2026-06-27
**Scope:** Full branch (`5d9bf2d937ecfec36626f5257974bfb9649c2d7d..HEAD`)
**Files reviewed:** 59 changed files, plus project artifacts and prior final-review artifact
**Commits:** `05cf3e43` through `8d25119e`

## Summary

The implementation covers the main help/global-option visibility work, the `providers set` default fix, the five P1 JSON contract fixes, and the lockstep public-package bump. The broad verification set is green, including workspace `pnpm test` and `pnpm release:validate`.

I found one Important requirements-alignment issue: the hardcoded `init/tools core` and `project-management` leaves still advertise `--scope` through parent command options, even though those leaves ignore it. This leaves the P1-3 false-accept/discoverability finding unresolved for those commands.

## Findings

### Critical

None

### Important

- **I1 - Hardcoded tool-pack leaves still advertise an ignored `--scope`, so P1-3 is not resolved.** `packages/cli/src/commands/init/index.ts:1033`, `packages/cli/src/commands/tools/install/index.ts:53`, `packages/cli/src/commands/init/tools/core/index.ts:75`, `packages/cli/src/commands/init/tools/project-management/index.ts:56`
  - The project decision says `init tools core` and `init tools project-management` are hardcoded scope leaves that should not get `--scope` (`discovery.md:42-44`), and the audit's P1-3 finding calls these misleading because sibling packs honor scope (`references/audit.md:36-38`).
  - The implementation adds `withScopeOption()` to the `init` parent and the `tools install` parent. Commander then shows ancestor options under `Global Options` for leaf help. Live checks show `--scope <scope>` still appears in all four hardcoded leaf help outputs: `oat init tools core --help`, `oat init tools project-management --help`, `oat tools install core --help`, and `oat tools install project-management --help`.
  - The leaf handlers still ignore that value: core always resolves `user`, and project-management always resolves the project root. So a user still sees a scope flag on a command where the flag is not honored.
  - The current regression tests only assert `--scope` is absent from the local `Options:` section (`help-snapshots.test.ts:68-101`). That misses the user-visible inherited `Global Options:` leak.
  - Fix guidance: either prevent parent `--scope` from appearing on hardcoded leaf help/parse paths, or make those leaf commands reject/invalidate inherited scope values that disagree with their fixed scope and update help/tests accordingly. Add assertions that the full hardcoded leaf help output does not advertise actionable `--scope`, or that passing it produces an explicit rejection instead of silent ignore.

### Medium

None

### Minor

- **m1 - Non-interactive triage JSON test still does not directly assert no stderr bypass.** `packages/cli/src/commands/repo/pr-comments/triage-collection/triage-comments.test.ts:124`
  - The test name promises direct stderr is not used, but it only verifies a JSON payload exists. This remains a non-blocking test-strength issue from the phase review. A spy on `process.stderr.write` would make the assertion match the test name.

- **m2 - `printCommentSummary` still writes directly to stderr on the interactive path.** `packages/cli/src/commands/repo/pr-comments/triage-collection/triage-comments.ts:119`
  - This is the pre-existing audit P3-3 item and remains outside the selected P0/P1 scope. It is acceptable to defer to the captured P2/P3 follow-up, but it is still visible carry-forward debt.

## Spec/Design Alignment

### Deferred Findings Ledger

- Deferred Medium count: 0
- Deferred Minor count: 2
- `p02/m1`: triage stderr spy assertion remains deferred.
- `p02/m3`: `printCommentSummary` direct stderr path remains deferred to the P2/P3 follow-up.

### Requirements Coverage

| Requirement                                               | Status      | Notes                                                                                                                                                                                                    |
| --------------------------------------------------------- | ----------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| P0-1 `providers set` default works                        | implemented | `providers set` defaults local `--scope` to `project`, and bare invocations are covered by tests.                                                                                                        |
| P1-1 global options visible                               | implemented | Root and recursive help configuration expose true globals on command help.                                                                                                                               |
| P1-2 demote `--scope` away from root globals              | partial     | Root globals are fixed and unrelated command groups such as `config` and `instructions sync` no longer show `--scope`; however hardcoded init/tools leaves still inherit and advertise parent `--scope`. |
| P1-3 hardcoded scope leaves do not false-accept `--scope` | missing     | `init tools core`, `init tools project-management`, `tools install core`, and `tools install project-management` still show inherited `--scope` while ignoring it.                                       |
| P1-4 `project validate-plan --json`                       | implemented | JSON and human paths are branched and tested.                                                                                                                                                            |
| P1-5 `project split run --json`                           | implemented | Normal success and converted detected-parent success paths emit JSON payloads.                                                                                                                           |
| P1-6 `project split evaluate-signals` JSON gating         | implemented | JSON is gated on `context.json`; human below-threshold content is now asserted.                                                                                                                          |
| P1-7 `project split validate-plan` JSON gating            | implemented | JSON and human success/failure/read-error paths are branched and tested.                                                                                                                                 |
| P1-8 `repo pr-comments triage-collection --json`          | implemented | Non-interactive JSON path no longer throws; minor test-strength gap remains.                                                                                                                             |
| Lockstep public-package bump                              | implemented | All five public packages and bundled version asset are at `0.1.34`; release validation passed.                                                                                                           |

### Extra Work

The docs sync and P2/P3 follow-up backlog capture are lifecycle/bookkeeping work tied to the project closeout. I did not find a product-code regression there.

## Verification Commands

```bash
pnpm --filter @open-agent-toolkit/cli exec vitest run
pnpm --filter @open-agent-toolkit/cli lint
pnpm --filter @open-agent-toolkit/cli type-check
pnpm release:validate
git diff --check 5d9bf2d937ecfec36626f5257974bfb9649c2d7d..HEAD
pnpm test
pnpm exec tsx --tsconfig packages/cli/tsconfig.json packages/cli/src/index.ts -- init tools core --help
pnpm exec tsx --tsconfig packages/cli/tsconfig.json packages/cli/src/index.ts -- init tools project-management --help
pnpm exec tsx --tsconfig packages/cli/tsconfig.json packages/cli/src/index.ts -- tools install core --help
pnpm exec tsx --tsconfig packages/cli/tsconfig.json packages/cli/src/index.ts -- tools install project-management --help
```

## Gate Command Results

| Command                                                           | Result | Details                                                             |
| ----------------------------------------------------------------- | ------ | ------------------------------------------------------------------- |
| `pnpm --filter @open-agent-toolkit/cli exec vitest run`           | PASS   | 220 files, 1978 tests                                               |
| `pnpm --filter @open-agent-toolkit/cli lint`                      | PASS   | 0 warnings, 0 errors                                                |
| `pnpm --filter @open-agent-toolkit/cli type-check`                | PASS   | no TypeScript errors                                                |
| `pnpm release:validate`                                           | PASS   | five public packages validated at `0.1.34`                          |
| `git diff --check 5d9bf2d937ecfec36626f5257974bfb9649c2d7d..HEAD` | PASS   | no whitespace errors                                                |
| `pnpm test`                                                       | PASS   | 10 Turborepo tasks successful                                       |
| hardcoded leaf help spot checks                                   | FAIL   | all four checked hardcoded leaves still display inherited `--scope` |

## Verdict

**CHANGES REQUESTED** - 0 Critical, 1 Important, 0 Medium, 2 Minor.

## Recommended Next Step

Run `oat-project-review-receive` to convert I1 into a final review fix task. The two Minor items can remain deferred unless the receive step chooses to clean them up in the same pass.
