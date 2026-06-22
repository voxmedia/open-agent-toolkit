---
oat_generated: true
oat_generated_at: 2026-06-22
oat_review_scope: final
oat_review_type: code
oat_review_invocation: manual
oat_project: .oat/projects/shared/oat-init-scope-selection
---

# Code Review: final

**Reviewed:** 2026-06-22
**Scope:** Full branch diff from `8be6fef3d026370e0f2c14c464c1def1b0725818..HEAD` (`7132c0f9dd14da4c8926db7d022b15828d92ce16`)
**Files reviewed:** 26 changed files plus project artifacts and archived reviews
**Commits:** 14
**Final gate status:** Passing for final gate purposes; no Critical or Important findings.

## Findings

### Critical

None

### Important

None

### Medium

- **Customization gate still runs before pack selection** (`packages/cli/src/commands/init/index.ts:657`)
  - Issue: The deferred p01 Medium finding is still present. Discovery says guided setup selects packs, then presents the `Customize per-pack scope? (y/N)` gate. Current code prompts the gate in `runGuidedSetupImpl` before `runToolPacks` (`packages/cli/src/commands/init/index.ts:657-663`), while pack selection happens inside `runInitTools` (`packages/cli/src/commands/init/tools/index.ts:824-829`). This can ask users about per-pack scope before they know which packs they are installing, including cases where no user-eligible pack is ultimately selected.
  - Fix: Move the guided-only gate into the tools flow after `selectedPacks` is known and before `resolvePackScopes`, gated on user-eligible packs. Keep ordinary `oat init tools` behavior unchanged, and add a regression test for pack-selection-before-gate ordering plus gate-skipped/no-eligible-pack behavior.
  - Requirement: Discovery success criteria for `oat init --setup` presenting the gate after pack selection.
  - Final disposition: Accepted as non-blocking Medium for this final gate. It should be converted into follow-up work or explicitly deferred by review receive, but it does not block final approval under the requested Critical/Important gate.

### Minor

None

## Deferred Finding Disposition

| Deferred finding                                    | Status                                     | Evidence                                                                                                                                                                                             |
| --------------------------------------------------- | ------------------------------------------ | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Customization gate still runs before pack selection | Still present; accepted/deferred as Medium | Gate prompt remains before `runToolPacks` at `packages/cli/src/commands/init/index.ts:657-663`; pack selection remains in `runInitTools` at `packages/cli/src/commands/init/tools/index.ts:824-829`. |

## Previous Findings Recheck

| Prior finding                                                                     | Status | Evidence                                                                                                                                                                                                                                                                                                                                                                                                                         |
| --------------------------------------------------------------------------------- | ------ | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Critical: Non-interactive `--setup` reached an interactive local-path prompt      | Fixed  | `promptForScopeSelectionMode` returns `defaults` without prompting when non-interactive (`packages/cli/src/commands/init/index.ts:571-572`), local-path selection is guarded by `context.interactive` (`packages/cli/src/commands/init/index.ts:679-687`), regression tests cover no gate/no local-path prompt (`packages/cli/src/commands/init/index.test.ts:1765-1813`), and a temp-repo `OAT_NON_INTERACTIVE=1` smoke passed. |
| Important: Concrete global `--scope project\|user` bypassed the guided scope gate | Fixed  | `scopeSelection: defaults` is handled before concrete scope, and `scopeSelection: interactive` suppresses concrete-scope short-circuiting (`packages/cli/src/commands/init/tools/index.ts:528-546`). Tests cover guided interactive and defaults overriding `--scope project` (`packages/cli/src/commands/init/tools/index.test.ts:529-550`, `packages/cli/src/commands/init/tools/index.test.ts:1362-1385`).                    |

## Requirements/Design Alignment

**Evidence sources used:** `discovery.md`, `plan.md`, `implementation.md`, `state.md`, archived reviews under `reviews/archived/`, branch diff `8be6fef3..7132c0f9`, root `AGENTS.md`, and `packages/cli/AGENTS.md`. `spec.md` and `design.md` are absent and optional for this quick-mode project.

### Requirements Coverage

| Requirement                                                                        | Status      | Notes                                                                                                                                                                                                                                                                                                                       |
| ---------------------------------------------------------------------------------- | ----------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Guided setup surfaces per-pack scope selection through an opt-in gate              | Partial     | Gate exists and routes yes/no correctly, but it still appears before pack selection.                                                                                                                                                                                                                                        |
| Gate "yes" runs the existing per-pack `Where should X install?` selector           | Implemented | Guided `scopeSelection: interactive` reaches the resolver prompt path and now overrides concrete `--scope project`.                                                                                                                                                                                                         |
| Gate "no" applies additive per-pack defaults instead of forced project scope       | Implemented | `scopeSelection: defaults` uses `resolvePackDefaultEndState` and preserves current placement.                                                                                                                                                                                                                               |
| Non-interactive setup remains prompt-safe                                          | Implemented | Non-interactive guided setup skips the gate/local-path prompt and the temp-repo smoke completed without prompting.                                                                                                                                                                                                          |
| Tests cover yes/no/non-interactive/additive behavior                               | Implemented | Focused init/guided/tools tests passed with 111 tests.                                                                                                                                                                                                                                                                      |
| Public-package release guardrail                                                   | Implemented | All five public packages are at `0.1.30`; `release:validate` passed.                                                                                                                                                                                                                                                        |
| Verification hardening: docs prebuild uses source CLI, not asset-bundling root CLI | Implemented | Root adds `cli:source` (`package.json:16`), docs prebuild/predev call it (`apps/oat-docs/package.json:6`, `apps/oat-docs/package.json:8`), scaffold generation emits it for OAT repos (`packages/cli/src/commands/docs/init/scaffold.ts:253`), and full `pnpm test` showed `oat-docs:build` using `pnpm -w run cli:source`. |
| Verification hardening: scaffold commit test has focused timeout                   | Implemented | The git-heavy scaffold commit test has a 15s timeout (`packages/cli/src/commands/project/new/scaffold.test.ts:664-703`) and passed in focused and full test runs.                                                                                                                                                           |

### Extra Work (not in declared requirements)

No problematic scope creep. The docs prebuild `cli:source` changes and focused scaffold timeout are post-task verification hardening recorded in `implementation.md` and verified here.

## Verification Commands

Reviewer-run checks:

```bash
pnpm --filter @open-agent-toolkit/cli exec vitest run src/commands/init/index.test.ts src/commands/init/guided-setup.test.ts src/commands/init/tools/index.test.ts
pnpm --filter @open-agent-toolkit/cli exec vitest run src/commands/docs/init/scaffold.test.ts src/commands/project/new/scaffold.test.ts --testNamePattern "uses workspace:\\* deps and pnpm -w run cli for OAT repo|commits only the scaffolded directory when commit:true"
pnpm --filter @open-agent-toolkit/cli exec vitest run src/commands/init/tools/shared/bundle-consistency.test.ts
pnpm release:validate
pnpm run cli:source -- project validate-plan --project-path .oat/projects/shared/oat-init-scope-selection
tmp=$(mktemp -d)
mkdir -p "$tmp/repo" "$tmp/home"
git -C "$tmp/repo" init --quiet
HOME="$tmp/home" OAT_NON_INTERACTIVE=1 pnpm run cli:source -- --cwd "$tmp/repo" --scope project init --setup --no-hook
rc=$?
rm -rf "$tmp"
exit $rc
pnpm --filter @open-agent-toolkit/cli lint
pnpm --filter @open-agent-toolkit/cli type-check
pnpm test
```

Results:

- Focused init/guided/tools tests passed: 3 files, 111 tests.
- Focused docs scaffold + project scaffold timeout checks passed: 2 tests selected, 32 skipped.
- Bundle consistency test file passed: 13 tests.
- `pnpm release:validate` passed for 5 public packages at `0.1.30`.
- Plan validation passed.
- Non-interactive temp-repo `init --setup --no-hook` smoke passed without prompting.
- CLI lint passed with 0 warnings and 0 errors.
- CLI type-check passed.
- Full `pnpm test` passed: 10/10 Turbo tasks, CLI 204 files and 1845 tests; `oat-docs:build` ran and its `prebuild` used `pnpm -w run cli:source`.
- Worktree remained clean after verification.

## Recommended Next Step

Run `oat-project-review-receive` to record the final pass and convert or explicitly defer the remaining Medium finding.
