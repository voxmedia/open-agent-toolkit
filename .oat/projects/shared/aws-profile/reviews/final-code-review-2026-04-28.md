---
oat_generated: true
oat_generated_at: 2026-04-28
oat_review_scope: final
oat_review_type: code
oat_review_invocation: auto
oat_project: .oat/projects/shared/aws-profile
---

# Final Code Review: aws-profile (auto, HiLL p05)

**Reviewed:** 2026-04-28
**Scope:** Final / cross-phase (5 phases, 7 tasks)
**Range:** `0e39b494..6577cd94` (15 commits)
**Files reviewed:** 28 changed (10 production source + tests + docs + 5 package.json + asset map + project artifacts)
**Workflow mode:** quick
**Prior phase reviews:** all five passed (p02 + p04 after one rev each)

## Verdict

**PASS.** All five phase reviews resolved cleanly. Cross-phase the precedence story is coherent end-to-end (flag > shell env > config) for both code paths. Discovery decisions #1, #3, #5, #6 are honored; decision #4 (region as sibling) is implemented at parity with profile. Lockstep release validated for all five public packages (`0.0.52` -> `0.0.53`). Docs accurately describe the shipped surface. Lint, type-check, all 167 tests across the touched files, full repo `release:validate` pass on the merge-base SHA. Findings are confined to **Minor** bookkeeping items in OAT artifacts — no shipping-code blockers.

## Summary

The change set landed cleanly under quick mode: extend `OatArchiveConfig` with `awsProfile`/`awsRegion` (p01), plumb them as `AWS_PROFILE`/`AWS_REGION` env vars at every `aws` spawn in `archive-utils.ts` via a non-clobbering `buildAwsEnv` helper (p02), wire them into `oat config` whitelist/catalog/set-handler (p03), add `--profile`/`--region` flags to `oat project archive sync` (p04), and document + lockstep-bump (p05). The non-clobbering helper is the load-bearing piece: parent-env wins over `opts`, so the precedence chain is achieved by **layering the flag onto a clone of the parent env up-front in the sync command's action** (`resolveSyncAwsEnv`, `index.ts:45-92`) rather than threading three booleans through the call graph. The same env is then passed to `ensureS3ArchiveAccess` so the preflight `aws sts get-caller-identity` honors flags too — this was the rev2 fix in p04.

The completion path (decision #5 — no flag) takes the simpler shape: `archiveProjectOnCompletion` accepts `awsProfile`/`awsRegion` only as config-only fallbacks and forwards them straight into `buildAwsEnv` against the inherited parent env. No new flag surface, no new skill prompt — decision #6 holds.

`archiveProjectOnCompletion` itself has no internal CLI consumer in this repo (it is a published library export consumed by external skill drivers). Plumbing the new options through its signature is therefore the correct seam; the test suite covers both completion and sync paths through it directly.

## Findings

### Critical

None.

### Important

None.

### Medium

None.

### Minor

- **Bookkeeping drift in `state.md`** (`.oat/projects/shared/aws-profile/state.md:25-31, 33-39`)
  - Issue: After a full successful 5-phase ship, `state.md` still reads `**Status:** Discovery` and "Plan complete - ready for `oat-project-implement`", and lists Plan/Implementation as "scaffolded template — not started." `oat_phase_status: in_progress` and `oat_pr_status: null`. None of this affects shipped code, but it is misleading for any future audit / fresh-session reload.
  - Fix: When `oat-project-pr-final` (or whichever post-implement skill runs next) executes, refresh state.md to reflect `phase: implement / phase_status: complete` (or `pr_open` once the PR opens) and update the human-readable Status / Current Phase / Progress lines. The orchestrator's bookkeeping commits (`6577cd94 chore(oat): bookkeeping after p05 pass`) appear to have only touched plan.md / implementation.md per the diff stat — state.md was missed.
  - Requirement: workflow housekeeping; not a discovery decision.

- **`implementation.md` Final Summary still a template** (`.oat/projects/shared/aws-profile/implementation.md:206-228`)
  - Issue: The "Final Summary (for PR/docs)" section reads as the unfilled scaffold (`{capability 1}`, `{capability 2}`, `{path}` placeholders, etc.). The orchestration-runs section _is_ populated correctly (lines 121-145), so a PR-final skill would still have material to draw from, but the explicit Final Summary that the file's own header (line 23) calls out as the precondition for `oat-project-pr-final` is empty.
  - Fix: Fill the section before running `oat-project-pr-final`, or rely on the skill to synthesize from orchestration-runs + plan/discovery. If the skill auto-synthesizes, this is a no-op; if not, this is a small follow-up.

- **`?? undefined` redundancy** (`packages/cli/src/commands/project/archive/index.ts:83-84`)
  - Issue: `const awsProfile = flagProfile ?? configProfile ?? undefined;` — the trailing `?? undefined` is a no-op (when both LHS expressions are `undefined` the value is already `undefined`). Same for `awsRegion`.
  - Fix: Drop the trailing `?? undefined`. Pure cosmetic; behavior unchanged. Optional.

- **No test cross-pins `archive.awsProfile` resolved entry source label `'shared'` round-trip vs raw config-write** (`packages/cli/src/config/resolve.test.ts:469-520`)
  - Issue: The shared/default coverage is good (lines 469, 492). There's no negative test asserting that an _empty-string_ on disk is normalized away by `readOatConfig` such that the resolver still labels the key as `'default'`, not `'shared'` with empty value. Behavior is correct (the normalizer drops empty strings — covered in `oat-config.test.ts:105-126`), so this is just a coverage seam, not a behavior bug.
  - Fix: Optional integration-style test to lock in the read-then-resolve seam. Cheap if added; no current observable.

- **Plan `p02-t01` step-1 wording carry-over** (`.oat/projects/shared/aws-profile/plan.md:162`)
  - Issue: Carried over from p02 rev2 review. Plan step still describes "overridden when config provides one" which is the inverse of the discovery decision #3 contract that shipped. The note is in the _executed_ plan's step description and does not affect any code; it is a lower-friction trail item for future audits.
  - Fix: One-line edit to align with what shipped, or leave with the rev2 review's note as the trail. Optional.

## Cross-cutting Verification

### Precedence chain coherence (decision #3)

End-to-end trace for `oat project archive sync --profile flag-x` with `process.env.AWS_PROFILE=env-y` and `archive.awsProfile=cfg-z` configured:

1. `resolveSyncAwsEnv` (`index.ts:45-92`) reads `flagProfile = 'flag-x'`.
2. Builds `effectiveParent = { ...processEnv, AWS_PROFILE: 'flag-x' }` — flag clobbers env in the _clone_. Original `process.env` is not mutated.
3. `awsProfile = flagProfile ?? configProfile = 'flag-x'`.
4. `awsEnv = buildAwsEnv(effectiveParent, { awsProfile: 'flag-x' })`. Helper sees `parentHas('AWS_PROFILE') === true`, so the opts value is **not** re-injected; the existing `'flag-x'` flows through unchanged.
5. Action invokes `ensureS3ArchiveAccess({ awsProfile: 'flag-x', ... }, { env: awsEnv })`. Helper internally calls `buildAwsEnv(awsEnv, { awsProfile: 'flag-x' })` — non-clobbering no-op, env retains `'flag-x'`.
6. `aws --version`, `aws sts get-caller-identity`, `aws s3 ls`, `aws s3 sync` all spawn with `AWS_PROFILE=flag-x`. ✓

For the completion path (`archiveProjectOnCompletion`) with no flag layer, the same trace collapses to `buildAwsEnv(dependencies.env ?? process.env, { awsProfile: 'cfg-z' })`. If `process.env.AWS_PROFILE='env-y'` is present, the helper preserves `env-y` (decision #3); else it injects `cfg-z`. Decision #5 (no per-invocation flag for completion) holds because `archiveProjectOnCompletionOptions` has no `flagProfile`-equivalent.

This precedence is locked by **both** unit tests (`archive-utils.test.ts:618, 641, 712-734`) and **integration-style** action tests (`index.test.ts:482-739`), with the explicit preflight regression test (`index.test.ts:563-586`) closing the rev1 Critical for `ensureS3ArchiveAccess`'s second-arg env.

### Discovery decision coverage

| Decision                                      | Status      | Evidence                                                                                                                                                                                                                                  |
| --------------------------------------------- | ----------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| #1 Profile-only auth (no raw access keys)     | implemented | No `AWS_ACCESS_KEY_ID` / `AWS_SECRET_ACCESS_KEY` config keys added; `OatArchiveConfig` (oat-config.ts:20-27) has only `awsProfile`/`awsRegion`. Docs explicitly note raw access keys remain a shell-env concern (`configuration.md:137`). |
| #2 Plumb env at archive-utils helper boundary | implemented | `buildAwsEnv` in `archive-utils.ts:143-167`; all four `aws` execFile callsites in this module route through it. Sync command re-imports the same helper (`index.ts:17`) — no duplication.                                                 |
| #3 Precedence flag > shell env > config       | implemented | `buildAwsEnv` non-clobbering merge + `resolveSyncAwsEnv` flag-onto-parent-env layering. Tests in archive-utils.test.ts and index.test.ts.                                                                                                 |
| #4 Region as sibling                          | implemented | Every test that exercises profile has a region twin. `awsRegion` mirrors `awsProfile` in option types, normalizer, resolver defaults, config catalog/set handler, CLI flag, helper, and docs.                                             |
| #5 Per-invocation flag on `archive sync` only | implemented | `--profile`/`--region` flags only on `oat project archive sync` (`index.ts:320-321`). `ArchiveProjectOnCompletionOptions` has no flag-equivalent — it accepts only config-derived values.                                                 |
| #6 Skill text unchanged at auth layer         | implemented | `git diff 0e39b494..6577cd94 -- .agents/skills/oat-project-complete/SKILL.md` produces empty diff.                                                                                                                                        |

### Documentation accuracy (p05-t01)

Cross-checked `apps/oat-docs/docs/cli-utilities/configuration.md` and `config-and-local-state.md` line-by-line against shipped code:

- "forwarded as `AWS_PROFILE` / `AWS_REGION` to every `aws` invocation" — ✓ matches the four spawns routed through `buildAwsEnv`.
- "Precedence: flag > shell env > config" + numbered list — ✓ matches `resolveSyncAwsEnv` + `buildAwsEnv` non-clobber.
- "If none of the three are present, OAT does not inject it" — ✓ helper guards on non-empty.
- "`oat-project-complete` does not accept per-invocation flags" — ✓ decision #5.
- "raw access keys remain a shell-environment concern" — ✓ decision #1.
- "`archive.awsProfile` and `archive.awsRegion` appear in the archive keys list" — ✓ both files updated.
- "every `aws` spawn (preflight `aws sts get-caller-identity`, `aws s3 ls`, `aws s3 sync`)" — ✓ matches the helper-routed spawns.

No drift between docs and code.

### Lockstep release (p05-t02)

| Package                               | Pre-PR | Post-PR | Bumped |
| ------------------------------------- | ------ | ------- | ------ |
| `@open-agent-toolkit/cli`             | 0.0.52 | 0.0.53  | ✓      |
| `@open-agent-toolkit/control-plane`   | 0.0.52 | 0.0.53  | ✓      |
| `@open-agent-toolkit/docs-config`     | 0.0.52 | 0.0.53  | ✓      |
| `@open-agent-toolkit/docs-theme`      | 0.0.52 | 0.0.53  | ✓      |
| `@open-agent-toolkit/docs-transforms` | 0.0.52 | 0.0.53  | ✓      |

All five public packages bumped consistently. `packages/cli/assets/public-package-versions.json` updated 0.0.51 -> 0.0.53 (pre-existing structure intentionally excludes control-plane; not a regression). `pnpm release:validate` passes on `6577cd94` ("release validation passed for 5 public packages"). Choice of patch (`.52` -> `.53`) rather than minor is a pragmatic lockstep continuation — discovery suggested minor, but that is a downstream housekeeping nit, not a contract violation.

### Cross-cutting code-quality scan

- **Type safety across module boundaries:** `EnsureS3ArchiveAccessOptions` exposes `awsProfile?: string | null` (the `null` arm is a deliberate "explicitly empty" allowance for the helper's empty-string trim). `ArchiveProjectOnCompletionOptions` matches. `ArchiveSyncOptions` (sync-command-side) uses `string | undefined` because Commander never emits `null`. The asymmetry is intentional and documented via JSDoc on the helper-side options. No type-check failures.
- **Dead code:** `archiveProjectOnCompletion` has no internal CLI consumer (`grep -rn` confirms only its own definition and tests reference it inside `packages/cli/src`). This is **not** dead code — it is a published library function consumed by external skill drivers, just like the existing `buildArchiveSnapshotName` etc. New `awsProfile`/`awsRegion` options on its signature ride the same export contract as the rest of the function. No zombie helpers introduced.
- **Drift between unit tests and integration behavior:** unit tests for `buildAwsEnv` are exercised through `ensureS3ArchiveAccess` (sync mode) and through `archiveProjectOnCompletion` (completion mode). Sync-action integration tests in `index.test.ts` independently assert env on the spy `execFile` for `s3 ls` / `s3 sync`. The preflight env regression test in `index.test.ts:563-586` pins the second-arg env on the mocked `ensureS3ArchiveAccess`, not the real helper. p04-rev2 explicitly noted this seam as Minor and accepted it given the layered coverage; reaffirmed here. No drift surfaces — the contract is provable by composition.
- **Security:** No new secret material on disk. `awsProfile` and `awsRegion` are non-secret named identifiers. Empty-string and whitespace-only inputs are trimmed to "unset" at all four entry points (config normalizer, set-handler, helper, sync flags) so accidental whitespace cannot inject a literal-whitespace AWS_PROFILE that would then break the AWS CLI's own resolution chain.
- **Error handling / boundaries:** No new error paths. Existing `CliError` shapes for "AWS CLI not on PATH" and "AWS CLI not configured" are unchanged; they now run with the correct env. The completion path's downgrade-to-warning behavior is preserved. The sync path's hard-error behavior is preserved.

## Verification Commands

```bash
# Tests for all touched files (167 tests across 7 files)
pnpm --filter @open-agent-toolkit/cli exec vitest run \
  src/commands/project/archive \
  src/commands/config \
  src/config

# Lint + type-check
pnpm --filter @open-agent-toolkit/cli lint
pnpm --filter @open-agent-toolkit/cli type-check

# Docs build
pnpm --filter oat-docs build

# Lockstep release validation
pnpm release:validate

# Confirm skill text untouched (decision #6)
git diff 0e39b494..6577cd94 -- ".agents/skills/oat-project-complete/SKILL.md"
# expect: empty diff

# Confirm five public packages all at 0.0.53
for f in packages/cli/package.json packages/control-plane/package.json packages/docs-config/package.json packages/docs-theme/package.json packages/docs-transforms/package.json; do
  jq -r '"\(.name) \(.version)"' "$f"
done
```

All commands above were run on `6577cd94` (HEAD of the orchestration branch) during this review and passed.

## Recommended Next Step

Run the `oat-project-review-receive` skill to (optionally) capture the Minor findings as plan tasks, then proceed to `oat-project-pr-final`. The two highest-leverage Minor items to handle before opening the PR:

1. Refresh `state.md` and the `implementation.md` Final Summary so the PR description and any future audit have an accurate paper trail. (Either by hand or by letting `oat-project-pr-final` synthesize.)
2. Optional one-line edit to plan.md p02-t01 step 1 if anyone is concerned about audit clarity. Cosmetic.

The shipped behavior is correct, fully tested, documented, and lockstep-validated. No blockers.
