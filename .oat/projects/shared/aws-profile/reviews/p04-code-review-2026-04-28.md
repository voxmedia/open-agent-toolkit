---
oat_generated: true
oat_generated_at: 2026-04-28
oat_review_scope: p04
oat_review_type: code
oat_project: .oat/projects/shared/aws-profile
---

# Code Review: p04 (archive sync `--profile` / `--region` flags)

**Reviewed:** 2026-04-28
**Scope:** p04-t01 — Add `--profile` and `--region` flags to `oat project archive sync`
**Files reviewed:** 3
**Commits:** `bab791ab..65696c0f` (1 commit: `feat(p04-t01): add --profile + --region flags to oat project archive sync`)

## Verdict

**Request changes — 1 Critical finding** that breaks the documented end-to-end precedence guarantee for the preflight call. The bug is not caught by the new tests because `ensureS3ArchiveAccess` is mocked. Everything else lands cleanly: structure, scope discipline, lint/type-check/test-suite (1386/1386) green, helper export is genuinely package-internal.

## Summary

Phase 4 wires `--profile`/`--region` into `oat project archive sync` and resolves precedence via a new `resolveSyncAwsEnv` that layers the flag onto a cloned parent env before delegating to the existing non-clobbering `buildAwsEnv`. The implementer also promoted `buildAwsEnv` to a module-internal export (no public-package surface). Six targeted tests cover the sync/list `aws` callsites end-to-end. The Critical issue: when the user has `AWS_PROFILE` set in their shell, the flag override is silently dropped for the preflight `aws sts get-caller-identity` call — only the `aws s3 ls` / `aws s3 sync` calls actually see the flag. This means the preflight validates a different identity from the one used for the sync, contradicting discovery decision #3 and the verifier item that says "ensureS3ArchiveAccess is called with the resolved awsProfile/awsRegion (so the preflight `aws sts get-caller-identity` uses the right credentials)."

## Findings

### Critical

- **Flag override is dropped by `ensureS3ArchiveAccess` preflight when shell `AWS_PROFILE`/`AWS_REGION` is set** (`packages/cli/src/commands/project/archive/index.ts:356-362`)
  - **Issue:** The action calls `dependencies.ensureS3ArchiveAccess({ ..., awsProfile, awsRegion })` with **no second `dependencies` argument**. Inside `ensureS3ArchiveAccess` (`archive-utils.ts:545`), the parent env defaults to `process.env`, then `buildAwsEnv` applies its non-clobbering rule: if `process.env.AWS_PROFILE` is non-empty, the option value is **ignored**. The action's pre-resolved `awsEnv` (which had the flag layered onto a cloned parent) is never given to the preflight.
  - **Concrete failure mode:** User runs `oat project archive sync --profile work-sso` while their shell has `AWS_PROFILE=personal` exported. Trace:
    - `aws s3 ls` and `aws s3 sync`: env `AWS_PROFILE=work-sso` (correct, uses `awsEnv` from `resolveSyncAwsEnv`).
    - `aws sts get-caller-identity` (preflight): env `AWS_PROFILE=personal` (the flag is dropped by `buildAwsEnv`'s non-clobbering rule against `process.env`).
    - Net effect: the preflight validates the _shell_ identity while the sync uses the _flag_ identity. The user can get a misleading "credentials work" green light from one identity, then have the actual sync hit a totally different identity (which may have wrong perms, hit a different bucket policy, or — worst case — succeed against an unintended account).
  - **Verified empirically** by replaying the exact code paths against the live `buildAwsEnv` export:
    ```
    awsEnv (s3 sync):           { AWS_PROFILE: 'flag-profile',  AWS_REGION: 'flag-region'  }
    preflightEnv (sts):         { AWS_PROFILE: 'shell-profile', AWS_REGION: 'shell-region' }
    ```
  - **Why the new tests don't catch this:** the harness mocks `ensureS3ArchiveAccess` as a `vi.fn`, so the test only asserts the _option-arg shape_ (`awsProfile: 'flag-profile'`). It never executes `buildAwsEnv` against `process.env` inside the helper. The "flag overrides parent env" test at `index.test.ts:511-545` therefore reports green even though, in production, the preflight would silently use the shell profile.
  - **Fix:** Thread the resolved env into the helper so both the preflight and the sync see the same env source. Two equivalent options:
    1. Pass `awsEnv` as the helper's `dependencies.env`:
       ```ts
       await dependencies.ensureS3ArchiveAccess(
         { mode: 'sync', s3Uri, syncOnComplete, awsProfile, awsRegion },
         { env: awsEnv },
       );
       ```
       This requires widening `ProjectArchiveCommandDependencies['ensureS3ArchiveAccess']` from `typeof ensureS3ArchiveAccess` to a signature that accepts the deps arg (it already does — `typeof` includes both params, but the harness mocks need a small touch-up to receive 2 args). And, crucially, it correctly produces `flag > shell env > config` for the preflight because the shell env was already overwritten in `awsEnv`.
    2. Simpler: pass `effectiveParent` (the cloned env with the flag layered, before `buildAwsEnv` is called) as `{ env: effectiveParent }`. The helper will then re-apply non-clobbering against an env that already has the flag baked in — same end state.
  - **Verification:** Add a test that replaces the `ensureS3ArchiveAccess` mock with the real implementation (or a thin wrapper that asserts on `dependencies.env`) to prove the preflight env contains the flag value, not the shell value, when both are set. Suggested test name: `"preflight env honors flag over parent shell env"`.
  - **Requirement source:** Discovery decision #3 ("CLI flag (per-invocation) > caller's existing env (`AWS_PROFILE` already set in the shell) > config"); plan p04-t01 verifier "The resolved profile/region passed to `ensureS3ArchiveAccess` matches the same precedence (flag > parent env > config)"; dispatch verifier "ensureS3ArchiveAccess is called with the resolved `awsProfile`/`awsRegion` (so the preflight `aws sts get-caller-identity` uses the right credentials)."

### Important

- **`buildAwsEnv` JSDoc tells callers exactly the wrong thing for this codepath** (`packages/cli/src/commands/project/archive/archive-utils.ts:32-44`)
  - **Issue:** `EnsureS3ArchiveAccessOptions.awsProfile`'s JSDoc says: "Config-only AWS profile … Callers that need flag-style overrides must set the env entry themselves before calling this helper." This is correct guidance, but the new code in `index.ts` does not heed it — it relies on `awsProfile` option carrying the flag value, expecting it to win. The current JSDoc and the current call shape are inconsistent. After the Critical fix lands, please also tighten the JSDoc for `awsProfile`/`awsRegion` on `EnsureS3ArchiveAccessOptions` to explicitly note "callers that override via flags must pass `dependencies.env` containing the override; otherwise the parent process env wins for the preflight." Drift between the helper's contract and its only flag-aware caller is the root cause of the Critical.
  - **Fix:** Update the JSDoc once the fix is applied, and consider renaming `awsProfile`/`awsRegion` on `EnsureS3ArchiveAccessOptions` to `configAwsProfile`/`configAwsRegion` to make the "config-only fallback" semantic visible at the callsite. Optional, but it would make the precedence model self-documenting and prevent the same bug from recurring.

### Medium

- **`resolveSyncAwsEnv` returns `awsProfile`/`awsRegion` that are misleadingly labeled given the actual semantics** (`packages/cli/src/commands/project/archive/index.ts:82-83`)
  - **Issue:** The returned `awsProfile = flagProfile ?? configProfile ?? undefined` deliberately omits the parent env, with the inline comment explaining: "passing config as the fallback is correct because the helper will skip it whenever parent env already supplies the key." This reasoning is **only** correct under the assumption that the helper sees the same parent env as `effectiveParent`. As demonstrated by the Critical, that assumption fails for `ensureS3ArchiveAccess`. Once the Critical is fixed (by passing `{ env: awsEnv }` or `{ env: effectiveParent }`), this design will be self-consistent. Until then, the comment is actively misleading and contradicts what the code does end-to-end. Suggest rewording the inline comment after the fix to reflect the corrected wiring.
  - **Fix:** Update comment text in `resolveSyncAwsEnv` after the Critical fix to: "We forward `flagProfile ?? configProfile` because callers will pass `effectiveParent` (or `awsEnv`) as `dependencies.env` to `buildAwsEnv`, so parent-env-wins is preserved against `effectiveParent`, not the raw `process.env`."

### Minor

- **`processEnv` harness wiring uses spread-only-when-defined idiom that is functionally equivalent to direct assignment** (`packages/cli/src/commands/project/archive/index.test.ts:80`)
  - **Issue:** `...(options.processEnv ? { processEnv: options.processEnv } : {})` is equivalent to relying on the default in `defaultDependencies()` when undefined — but the spread idiom obscures that intent. Direct assignment with optional chaining (`processEnv: options.processEnv ?? undefined`) would still hit the default in `createProjectArchiveCommand`'s `{ ...defaultDependencies(), ...overrides }` merge as long as undefined keys get passed through the spread (they would). Cosmetic; not behaviorally different.
  - **Suggestion:** Consider just `processEnv: options.processEnv` and let the override merge handle the undefined case, or leave as-is — current form is defensive and harmless.

- **No assertion that `--dry-run` continues to thread `awsEnv` to the spawned `aws s3 sync`** (`packages/cli/src/commands/project/archive/index.test.ts:474+`)
  - **Issue:** The new precedence tests don't combine `--dry-run` with `--profile`. `runArchiveSync` is still called for dry-runs (it just adds `--dryrun` to the args), so `awsEnv` should still apply. The existing dry-run test (line 287) doesn't assert env. A single combined test would close the coverage gap.
  - **Suggestion:** Optional — add `it('threads awsEnv even with --dry-run')` that runs `--profile foo --dry-run` and asserts the s3-sync execFile env contains `AWS_PROFILE=foo`. Low value if the Critical is fixed and the helper-env-threading test exists, but cheap to add.

- **`resolveSyncAwsEnv` shadow-clones `processEnv` on every invocation, even when no flags are present** (`packages/cli/src/commands/project/archive/index.ts:66`)
  - **Issue:** `const effectiveParent: NodeJS.ProcessEnv = { ...processEnv };` runs unconditionally. For a typical env this is dozens of keys; one shallow clone per invocation is negligible (the command runs once per CLI call), so this is purely stylistic.
  - **Suggestion:** Skip the clone when both `flagProfile` and `flagRegion` are undefined. Trivial optimization, leave as-is unless you're already touching the function for the Critical fix.

## Requirements/Design Alignment

**Evidence sources used:** `discovery.md` (decisions #2, #3, #5), `plan.md` (p04-t01 spec), `implementation.md` (Run 1 phase outcomes). Quick mode: no spec.md / design.md (n/a).

### Requirements Coverage (p04-t01 verifier items)

| Requirement                                                                     | Status               | Notes                                                                                                                                                                                   |
| ------------------------------------------------------------------------------- | -------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `--profile` and `--region` flags added to `archive sync`                        | implemented          | `index.ts:319-320`                                                                                                                                                                      |
| `ArchiveSyncOptions` extended with `profile?: string` / `region?: string`       | implemented          | `index.ts:31-32`                                                                                                                                                                        |
| Precedence flag > parent env > config for `aws s3 ls` / `aws s3 sync` env       | implemented          | Verified by tests `index.test.ts:475-545`                                                                                                                                               |
| Precedence flag > parent env > config for `ensureS3ArchiveAccess` preflight env | **partial / broken** | `awsProfile`/`awsRegion` options correctly forwarded, but the helper's internal `buildAwsEnv` re-resolves against `process.env` and drops the flag when shell env is set. See Critical. |
| Empty-flag normalization (whitespace → fall through)                            | implemented          | Verified by test `'treats empty/whitespace flag values as not provided'` (`index.test.ts:572-606`)                                                                                      |
| `awsEnv` threaded to all archive `aws` execFile callsites                       | implemented          | `runArchiveSync` (line 163), `listArchiveSnapshots` (line 189), `syncArchiveSnapshot` (line 292) — all receive resolved `awsEnv`                                                        |
| `buildAwsEnv` exported package-internal only, not on public surface             | implemented          | Only re-imported by `index.ts` in the same dir; CLI public surface (`src/index.ts`, `package.json` `bin`) does not re-export it                                                         |
| Full CLI test suite green                                                       | implemented          | Reviewer re-ran: 159 files / 1386 tests passed; lint clean; type-check clean                                                                                                            |
| No drift into config-command code (p03)                                         | implemented          | `git diff --stat` shows only the 3 archive files                                                                                                                                        |
| `archive-utils.ts` change limited to `export` keyword + JSDoc                   | implemented          | Diff shows exactly that — no behavioral change to the helper                                                                                                                            |

### Extra Work (not in declared requirements)

None. The export-promotion of `buildAwsEnv` was explicitly authorized by the dispatch and is the right call (avoids duplicating the merge logic in two files).

## Verification Commands

```bash
# Reviewer ran these locally; they all passed at HEAD 65696c0f.
pnpm --filter @open-agent-toolkit/cli lint
pnpm --filter @open-agent-toolkit/cli type-check
pnpm --filter @open-agent-toolkit/cli exec vitest run src/commands/project/archive/index.test.ts
pnpm --filter @open-agent-toolkit/cli test

# To reproduce the Critical empirically (already done — output captured in finding):
# Replay the production code paths against the real buildAwsEnv export with a
# parent env that has AWS_PROFILE set, and observe that preflightEnv keeps the
# shell value while awsEnv has the flag value.

# Suggested verification once the fix lands:
# Add a test that uses the real ensureS3ArchiveAccess (not the mock) with a
# spy execFile, parent env with AWS_PROFILE=shell, --profile flag=fl, and
# assert the env on the `aws sts get-caller-identity` call has AWS_PROFILE=fl.
```

## Recommended Next Step

Run the `oat-project-review-receive` skill to convert findings into plan tasks. Recommend marking the Critical as a blocker for p04 sign-off — the bug is real, observable, and contradicts the documented precedence guarantee; tests as currently shaped cannot catch it because `ensureS3ArchiveAccess` is mocked end-to-end.
