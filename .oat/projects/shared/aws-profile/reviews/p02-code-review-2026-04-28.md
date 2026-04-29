---
oat_generated: true
oat_generated_at: 2026-04-28
oat_review_scope: p02
oat_review_type: code
oat_project: .oat/projects/shared/aws-profile
---

# Code Review: p02 (task p02-t01)

**Reviewed:** 2026-04-28
**Scope:** Phase 2, task p02-t01 — forward `archive.awsProfile` + `archive.awsRegion` env to every `aws` spawn in `archive-utils.ts`
**Files reviewed:** 2
**Commits:** 1 (`523ded9b`)

## Verdict

**PASS** — implementation matches the plan, tests are robust and not smoke-only, lint/type-check/tests all clean. One Important finding flags a discovery/plan precedence divergence that becomes user-visible only once the `oat-project-complete` flow surfaces config into this helper (no production caller today). All other findings are Minor.

## Summary

p02-t01 cleanly extends `EnsureS3ArchiveAccessOptions` and `ArchiveProjectOnCompletionOptions` with optional `awsProfile`/`awsRegion`, introduces a file-private `buildAwsEnv` helper, and routes it through every `execFile('aws', …)` callsite in the module. Six new test cases exercise the env-merge contract — including the unset, parent-only, override, and empty-string cases — and all 31 tests in `packages/cli/src/commands/project/archive` pass. The one architectural concern is a precedence divergence between discovery decision #3 (shell env should win over config) and the plan/implementation (config-when-set clobbers shell env). This is fine for the `archive sync` flow once p04 resolves precedence upstream of the helper, but is a behavior gap for the completion path that has no current production caller.

## Findings

### Critical

None.

### Important

- **Helper-level precedence contradicts discovery decision #3 for the completion path** (`packages/cli/src/commands/project/archive/archive-utils.ts:106-125`)
  - Issue: Discovery decision #3 states "Config does not clobber an explicit shell env or flag" — i.e., shell `AWS_PROFILE` should win over `archive.awsProfile`. The plan p02-t01 step 1 instead requires "overridden when config provides one" (line 163), and `buildAwsEnv` implements that: when `opts.awsProfile` is non-empty it unconditionally overwrites `parentEnv.AWS_PROFILE`. The test on line 618 ("overrides parent-process AWS_PROFILE when config provides a value") locks in the plan's behavior, not discovery's.
  - For p04's `archive sync` path this is benign because p04 will resolve `flag > parent env > config` in the action handler and only forward the resolved value into the helper.
  - For the **completion** path (`archiveProjectOnCompletion`) there is no such pre-resolution: `options.awsProfile` is forwarded raw from config (lines 453-454, 478-479), so a user who sets both shell `AWS_PROFILE` and `archive.awsProfile` will see config win — contradicting discovery decision #3.
  - There is no production caller of `archiveProjectOnCompletion` today (only tests), so no live regression. But once `oat-project-complete` surfaces the new config keys, the completion flow needs to either (a) pre-resolve precedence in the skill/caller layer, or (b) the helper needs to honor "shell env wins when config and shell both set" for the completion mode. Neither is documented.
  - Fix: Either reconcile discovery (update decision #3 to "config-when-set wins over shell env, simpler model") OR reconcile the helper / completion path (do not clobber `parentEnv.AWS_PROFILE` from config alone — only from a flag-resolved value). Whichever way it's resolved, document the contract on `buildAwsEnv`'s JSDoc and on `ArchiveProjectOnCompletionOptions.awsProfile` so the eventual caller wiring is unambiguous. Recommend addressing during p04 review when the precedence resolver lands, since p04 also touches the same precedence chain.
  - Requirement: discovery decision #3, success criterion "Shell-level `AWS_PROFILE` / `AWS_REGION` already set by the user are not overwritten by config; flags still win over both."

### Medium

None.

### Minor

- **Doc string slightly over-promises "unset" handling** (`packages/cli/src/commands/project/archive/archive-utils.ts:99-105`)
  - Issue: The JSDoc on `buildAwsEnv` says "An empty/whitespace value in `opts` is treated as unset (does not clobber a value the parent env already provides)." That description is accurate for the empty-string path, but the same helper _will_ clobber a parent-env value when `opts.awsProfile` is non-empty — and the doc does not mention that. Reading the doc alone, a contributor could conclude "this helper never clobbers parent env."
  - Suggestion: Add one sentence: "A non-empty value in `opts` overrides the corresponding parent-env key." Tied to the Important finding above; if the precedence semantics change, update the doc accordingly.

- **`AWS_PROFILE` clobber test does not cover the `archive sync` (`mode: 'sync'`) precedence intent** (`packages/cli/src/commands/project/archive/archive-utils.test.ts:618-639`)
  - Issue: The "overrides parent-process AWS_PROFILE when config provides a value" test asserts behavior in `mode: 'sync'`. The completion-path equivalent ("forwards … during completion", line 510) doesn't assert what happens when **both** `dependencies.env.AWS_PROFILE` and `options.awsProfile` are set. Coverage is implicit-via-shared-helper but explicit coverage at the completion call boundary would catch a future regression where someone changes only the completion call to use a different env-build path.
  - Suggestion: Add one completion-path test that sets `dependencies.env: { AWS_PROFILE: 'parent', PATH: ... }` and `options.awsProfile: 'config'` and asserts the s3 sync execFile receives `AWS_PROFILE=config`. Optional — not blocking.

- **`whitespace-only` config value not directly covered** (`packages/cli/src/commands/project/archive/archive-utils.test.ts`)
  - Issue: `buildAwsEnv` trims `opts.awsProfile`/`awsRegion` and treats whitespace-only as unset (lines 113, 119). The empty-string test (line 664) covers `''` but not `'   '`. The implementation handles both identically, but a contributor could "simplify" the trim out without breaking the empty-string test.
  - Suggestion: Either add a `awsProfile: '   '` test case alongside the empty-string one, or leave as-is. Very low impact.

## Requirements/Design Alignment

**Evidence sources used:** `discovery.md`, `plan.md`, `implementation.md` (no spec/design — quick mode).

### Plan Coverage (p02-t01)

| Plan item                                                                                          | Status      | Notes                                                                                                                                                                                                   |
| -------------------------------------------------------------------------------------------------- | ----------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Extend `EnsureS3ArchiveAccessOptions` with `awsProfile?` + `awsRegion?`                            | implemented | Lines 32-33                                                                                                                                                                                             |
| Extend `ArchiveProjectOnCompletionOptions` with same                                               | implemented | Lines 54-55                                                                                                                                                                                             |
| Add file-private `buildAwsEnv(parentEnv, opts)` helper                                             | implemented | Lines 106-125; not exported                                                                                                                                                                             |
| Replace four `aws` execFile env args with helper output                                            | implemented | Three callsites in this file (`aws --version`, `aws sts`, `aws s3 sync`) all use `buildAwsEnv`. Plan said "four" — accurate count is three; this is a plan-side count error, not an implementation gap. |
| Continue to base from `dependencies.env ?? process.env`                                            | implemented | Lines 477, 508                                                                                                                                                                                          |
| Pass new options through chain so `archiveProjectOnCompletion` forwards to `ensureS3ArchiveAccess` | implemented | Lines 453-454                                                                                                                                                                                           |
| Test: env contains `AWS_PROFILE`/`AWS_REGION` for sts and s3 sync calls                            | implemented | Lines 510-555, 557-594                                                                                                                                                                                  |
| Test: parent-env preserved when config unset                                                       | implemented | Lines 596-616                                                                                                                                                                                           |
| Test: parent-env overridden when config set                                                        | implemented | Lines 618-639                                                                                                                                                                                           |
| Test: no `AWS_PROFILE` injected when neither source supplies one                                   | implemented | Lines 641-662                                                                                                                                                                                           |
| Helper file-private; near top of file                                                              | implemented | Defined right after `normalizeS3Uri` (line 94 → 106). Not exported.                                                                                                                                     |
| No regression in existing fixtures                                                                 | verified    | All 20 archive-utils tests pass; existing `toHaveBeenCalledWith` assertions still match because Vitest treats `{a, b, c: undefined}` ≡ `{a, b}`.                                                        |
| Lint + type-check pass                                                                             | verified    | `oxlint`: 0 warnings/errors. `tsc --noEmit`: clean.                                                                                                                                                     |
| Empty-string config treated as unset                                                               | implemented | `trim()` + `length > 0` guard; explicitly tested at line 664.                                                                                                                                           |

### Discovery Coverage (decisions touched by p02-t01)

| Decision                                                                               | Status      | Notes                                                                                                                                                                  |
| -------------------------------------------------------------------------------------- | ----------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Decision #2 — Plumb env at `archive-utils.ts` helper boundary                          | implemented | All AWS spawns in this module routed through `buildAwsEnv`.                                                                                                            |
| Decision #3 — Precedence: flag > shell env > config; config does not clobber shell env | partial     | See Important finding. Helper unconditionally overrides parent env when config supplies a non-empty value, contradicting "config does not clobber explicit shell env." |
| Decision #4 — Region as a sibling, same plumbing                                       | implemented | `awsRegion` mirrors `awsProfile` exactly.                                                                                                                              |
| Decision #6 — Skill unchanged at the auth layer                                        | n/a here    | Skill changes (or absence thereof) are p05 territory; p02 only touches archive-utils.                                                                                  |

### Extra Work (not in declared requirements)

None. The diff is exactly the type extensions, the new helper, and the wiring at three callsites — no scope creep.

## Verification Commands

Run these to verify the implementation and (optionally) the suggested fix for the Important finding:

```bash
# Confirm tests pass
pnpm --filter @open-agent-toolkit/cli exec vitest run src/commands/project/archive/archive-utils.test.ts

# Confirm full archive command suite still green
pnpm --filter @open-agent-toolkit/cli exec vitest run src/commands/project/archive

# Lint + type-check
pnpm --filter @open-agent-toolkit/cli lint
pnpm --filter @open-agent-toolkit/cli type-check
```

## Recommended Next Step

Run the `oat-project-review-receive` skill to convert the Important and Minor findings into plan tasks, or accept the review as-is and proceed to p03/p04.
