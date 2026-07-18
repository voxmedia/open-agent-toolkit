---
oat_generated: true
oat_generated_at: 2026-07-18T16:51:09Z
oat_review_scope: p01
oat_review_type: code
oat_review_round: 2
oat_review_invocation: root-phase-review
oat_project: .oat/projects/shared/wave-skills-promotion
oat_commit_range: 8016b188fd715eb58aff8dcfe3765188bb7fb00b..3aa46d5c5e2d6897f76195804d0dd650ea2854d0
oat_prior_review: reviews/code-p01-review-2026-07-18T164109Z.md
oat_dispatch_stamp: 'Dispatch: scope=p01 action=review role=reviewer producer=oat-phase-implementer-gpt-5-6-sol-high provenance=declared model_axis=selected:gpt-5.6-sol-high effort_axis=not-applicable dispatch_policy=high dispatch_ceiling=high target=oat-reviewer-gpt-5-6-sol-high'
---

# Code Review: p01 (Round 2)

**Reviewed:** 2026-07-18T16:51:09Z
**Scope:** Bounded re-review of the round-1 Critical fix, commit `3aa46d5c`, range `8016b188..3aa46d5c`
**Changed files reviewed:** 3 (the fix commit's declared boundary)
**Commits reviewed:** 1 new (`3aa46d5c`); the three round-1 commits were not re-reviewed
**Prior review:** `reviews/code-p01-review-2026-07-18T164109Z.md` (FAIL: 1 Critical, 1 Important)

## Summary

The round-1 Critical is fixed and independently re-verified: `copyDirectory` now preserves source file modes generally (stat + `writeFile` mode + explicit `chmod`), both regression tests cover the exact failure class, and my own fresh temp-repo install with the built CLI now yields an executable `bootstrap-group.sh` (mode 755) where round 1 produced 644. The full CLI suite is green with no collateral. The round-1 Important (missing `implementation.md` phase evidence) is root-owned bookkeeping outside this code re-review's scope and is not re-counted here.

Findings: 0 critical, 0 important, 0 medium, 0 minor

## Findings

### Critical

None.

### Important

None.

### Medium

None.

### Minor

None.

## Fix Verification

### 1. Commit boundary and fix generality — PASS

`git show --name-status 3aa46d5c` touches exactly the three declared files:

- `packages/cli/src/fs/io.ts` (+7/−1)
- `packages/cli/src/fs/io.test.ts` (+22)
- `packages/cli/src/commands/init/tools/workflows/install-workflows.test.ts` (+28)

The fix is general mode preservation, not a special case: for every copied file, `copyDirectory` stats the source, passes `{ mode: sourceStat.mode }` to `writeFile`, and then runs an explicit `chmod` to cover the pre-existing-destination case where `writeFile`'s mode applies only on creation. No filename or extension matching; all callers of `copyDirectory` (installers, symlink copy-fallback) inherit the fix. Commit subject follows the conventional `fix(p01-t02)` format.

### 2. Regression tests cover the failure class — PASS

- `io.test.ts` — `copyDirectory preserves executable mode on nested files`: seeds a `0o755` script nested under `scripts/` beside a plain file, copies, asserts `mode & 0o111` nonzero on the copy. This is a direct unit-level reproduction of the round-1 root cause.
- `install-workflows.test.ts` — `preserves executable mode on scripts nested inside skill directories`: seeds an executable `scripts/bootstrap-group.sh` inside a skill fixture, runs `installWorkflows`, asserts the installed copy under `.agents/skills/<skill>/scripts/` keeps the execute bit. This closes the exact gap the round-1 review named (prior chmod coverage only reached standalone `.oat/scripts` assets).

Both files run green: `pnpm --filter @open-agent-toolkit/cli exec vitest run src/fs/io.test.ts src/commands/init/tools/workflows/install-workflows.test.ts` → 2 files, 23/23 tests passed.

### 3. Independent re-reproduction of the round-1 failing probe — PASS

Rebuilt (`pnpm build` — 5/5 packages, includes `bundle-assets.sh`; bundled `bootstrap-group.sh` mode 755), then ran a fresh install into an isolated temp git repo using the branch-local **built** CLI (`node packages/cli/dist/index.js --cwd <temp> tools install workflows --scope project`):

- Installed `.agents/skills/oat-wave-execute/scripts/bootstrap-group.sh` mode = **755**; `test -x` **PASS** (round 1: mode 644, `test -x` FAIL).
- All six skill files materialized; auto-sync completed; all four Claude/Cursor provider views present.
- Temp repo removed; working tree unchanged apart from review artifacts.

### 4. No collateral — PASS

`pnpm --filter @open-agent-toolkit/cli test`: **250 files, 3001 tests, all passed** at HEAD `3aa46d5c`.

## Requirements Alignment Delta

| Requirement | Round 1 | Round 2     | Notes                                                                      |
| ----------- | ------- | ----------- | -------------------------------------------------------------------------- |
| FR1         | partial | implemented | Executable-install acceptance criterion now satisfied under fresh install. |
| FR4         | —       | unchanged   | Fix commit does not touch skill content; verbatim-port result stands.      |
| NFR4        | —       | unchanged   | Provider views re-confirmed incidentally during the fresh-install probe.   |

## Out-of-Scope Note

The round-1 Important finding (Phase 1 status and p01-t05 fresh-install evidence missing from `implementation.md`) is root-owned bookkeeping, per this dispatch, and remains for the root to reconcile — including recording the now-passing install evidence. It does not count against this code-scope verdict.

## Verification Commands and Results

| Probe                                                                                                                                                                        | Result                                     |
| ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------ |
| `git show --stat --name-status 3aa46d5c`                                                                                                                                     | PASS; exactly the 3 declared files, +56/−1 |
| `pnpm --filter @open-agent-toolkit/cli exec vitest run src/fs/io.test.ts src/commands/init/tools/workflows/install-workflows.test.ts`                                        | PASS; 23/23 tests                          |
| `pnpm build && bash packages/cli/scripts/bundle-assets.sh`                                                                                                                   | PASS; bundled script mode 755              |
| Fresh temp-repo install via built CLI (`node packages/cli/dist/index.js --cwd <temp> tools install workflows --scope project`) + `test -x` on installed `bootstrap-group.sh` | PASS; mode 755, executable                 |
| `pnpm --filter @open-agent-toolkit/cli test`                                                                                                                                 | PASS; 250 files, 3001 tests                |
| `git status --short` after probes                                                                                                                                            | PASS; only review artifacts untracked      |

## Verdict

**PASS** — 0 Critical and 0 Important findings in the code scope. The round-1 Critical is fixed, regression-tested at two levels, and re-verified by independent reproduction.

## Recommended Next Step

Root: record the p01-t05 fresh-install evidence and Phase 1 status in `implementation.md` (round-1 Important), update the plan Reviews table, and proceed to Phase 2.
