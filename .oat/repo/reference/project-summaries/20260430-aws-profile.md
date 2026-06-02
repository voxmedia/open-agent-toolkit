---
oat_status: complete
oat_ready_for: null
oat_blockers: []
oat_last_updated: 2026-04-30
oat_generated: true
oat_summary_last_task: prev1-t03
oat_summary_revision_count: 1
oat_summary_includes_revisions: ['p-rev1']
---

# Summary: aws-profile

> **Amendment (2026-05-02):** Decision #3 (non-clobbering precedence — config does not override parent shell env) was reversed in a follow-up PR after a real-world friction case where `AWS_PROFILE=voxmedia` in the calling shell silently overrode the repo's configured `archive.awsProfile=tkstang-artifact-sync` and the sync ran against the wrong account/bucket. The shipped precedence is now **flag > config > shell env**: explicit `archive.awsProfile` config is treated as deliberate, repo-scoped intent and clobbers ambient `AWS_PROFILE`. The rest of this summary describes the original 2026-04-30 design and is preserved as-is for historical context.

## Overview

Before this project, the S3 archive sync that runs during `oat-project-complete` and the standalone archive hydration command used whatever ambient AWS credentials happened to be in the shell — there was no way to scope a different AWS profile or region per repo, and no way to override profile/region for a single run. This project added per-repo config keys and per-invocation CLI flags so users can route the archive sync through a specific AWS identity without exporting environment variables in their shell.

## What Was Implemented

- **Two new repo config keys** — `archive.awsProfile` and `archive.awsRegion`. Both round-trip through `oat config set` / `get` / `describe` / `list` and through the resolver. Empty strings normalize to "unset" (mirrors the existing `archive.s3Uri` pattern).
- **Two new CLI flags** on archive sync — `--profile <profile>` and `--region <region>`. Both override the config and the shell env for that single invocation. Current command: `oat repo archive sync`.
- **Non-clobbering env merge at the spawn boundary.** A new file-private `buildAwsEnv` helper in `archive-utils.ts` layers `AWS_PROFILE` and `AWS_REGION` into a cloned env only when the parent env doesn't already provide them. Every `aws` execFile callsite (`aws --version`, `aws sts get-caller-identity`, `aws s3 ls`, `aws s3 sync`) routes through it.
- **End-to-end precedence** — flag > shell env > config — implemented for both code paths. The sync command builds the precedence by layering the flag onto the parent env up-front (`resolveSyncAwsEnv` in `commands/project/archive/index.ts`), then passes that env into `ensureS3ArchiveAccess` so the preflight `aws sts get-caller-identity` honors flags too.
- **Completion path stays config-only** (discovery decision #5). `archiveProjectOnCompletion` accepts `awsProfile` / `awsRegion` only as config-derived options; no per-invocation flag, no skill-text change to `oat-project-complete`.
- **Documentation** — `apps/oat-docs/docs/cli-utilities/configuration.md` and `config-and-local-state.md` describe the new keys, the new flags, the precedence chain, and the explicit "raw access keys remain a shell-env concern" stance from discovery.
- **Lockstep release validation** — all five public packages bumped 0.0.52 → 0.0.55 (initial bump to 0.0.53, then 0.0.54 after a main rebase, then 0.0.55 after a second main merge); `pnpm release:validate` passes against current main.

## Post-PR Revisions (p-rev1)

After PR #67 was opened, a manual final review surfaced three additional findings, which were addressed in revision phase `p-rev1`:

- `prev1-t01` — merged `origin/main` into the branch and bumped lockstep packages 0.0.53 → 0.0.54 to clear failing PR CI / release-dry-run checks (root cause: main caught up to our prior bump).
- `prev1-t02` — refreshed the project `state.md` body and the `.oat/state.md` dashboard to match the actual post-PR phase status; both had stale "scaffolded template" / `oat-project-document`-recommendation content.
- `prev1-t03` — fixed historical drift in `plan.md` p02-t01 Step 1 that still described the rejected pre-fix precedence model (clobbering); now matches shipped non-clobbering behavior.

A second `origin/main` merge later in the cycle (after another PR landed) bumped the packages once more from 0.0.54 → 0.0.55. Behavior shipped is unchanged from the original p01–p05 work; the revisions were entirely housekeeping.

## Key Decisions

1. **Profile-only auth (decision #1).** No raw-access-key config keys or flags. Raw `AWS_ACCESS_KEY_ID` / `AWS_SECRET_ACCESS_KEY` remain a shell-env concern, both for credential-leakage reasons and because typical users are on SSO / role assumption already.
2. **Plumb at the helper boundary, not per-callsite (decision #2).** A single `buildAwsEnv` helper merges env once at the spawn boundary, rather than threading `--profile` flags through every `execFile` call.
3. **Non-clobbering precedence (decision #3).** Config does not override an explicit shell `AWS_PROFILE`. The helper only injects when the parent env lacks the key. This was inverted from the plan's original wording during the p02 fix loop.
4. **Region as a sibling of profile (decision #4).** `archive.awsRegion` and `--region` ship in lockstep with profile, same plumbing pattern. Cheap; avoids a follow-up PR.
5. **Per-invocation flag on `archive sync` only (decision #5).** `oat-project-complete`'s archive flow is non-interactive bookkeeping — no `--profile` flag added there. Users who need a different identity for completion set it in repo config or shell env.
6. **Skill text unchanged at the auth layer (decision #6).** `oat-project-complete`'s `SKILL.md` is untouched. Verified by empty diff at review time.

## Design Deltas

- Plan p02-t01 Step 1 originally specified that `buildAwsEnv` should override parent-env `AWS_PROFILE` when config supplied a value. The first p02 review flagged this as contradicting discovery decision #3, and the precedence model was inverted to non-clobbering during the p02 fix loop. The plan body still reflects the original wording (cosmetic carry-over; behavior is correct).
- Plan p05-t02 recommended a minor version bump (0.0.52 → 0.1.0) given the new public CLI surface. The implementer chose patch (0.0.52 → 0.0.53) to match every prior `feat:` lockstep bump in the 0.0.x series. Reviewer concurred.

## Notable Challenges

- **Preflight env regression.** The first p04 review caught that `--profile` flag wasn't reaching the preflight `aws sts get-caller-identity` because `ensureS3ArchiveAccess` was being called without the resolved env. The fix (`23ad1e2a fix(p04-t01): pass resolved env to ensureS3ArchiveAccess so flag wins for preflight`) threaded the resolved env through the helper's second arg, with a regression test pinning the behavior.
- **Parallel group degradation.** The plan declared `[p02, p03]` as a parallel group. At runtime, the orchestration's worktree isolation branched from primary repo's `main` rather than the orchestration HEAD, so neither phase could see p01's commits. The skill's degradation rule applied — phases ran sequentially in this checkout instead of parallel worktrees. Behavior was correct; only execution wall-clock changed. (Hardening this is a follow-up PR the user is handling separately.)

## Tradeoffs Made

- **`null` vs `undefined` asymmetry across module boundaries.** `EnsureS3ArchiveAccessOptions` exposes `awsProfile?: string | null` (the `null` arm is a deliberate "explicitly empty" allowance for the helper's empty-string trim). `ArchiveSyncOptions` (sync-command-side) uses `string | undefined` because Commander never emits `null`. Documented via JSDoc. Final review accepted as intentional.
- **Patch-level lockstep bump (0.0.52 → 0.0.53)** rather than minor. Trades semver-strict signaling against series consistency; final review accepted.

## Integration Notes

- The non-clobbering `buildAwsEnv` helper is package-internal — exported only so the sibling `archive sync` command in `commands/project/archive/index.ts` can reuse it. It is **not** part of the public package surface; downstream consumers should not depend on it.
- `archiveProjectOnCompletion` has no internal CLI consumer in this repo — it is a published library export consumed by external skill drivers. New `awsProfile` / `awsRegion` options on its signature ride that same export contract.
- Empty-string and whitespace-only inputs are trimmed to "unset" at all four entry points (config normalizer, `oat config set` handler, helper, sync flags). Whitespace cannot leak into a literal-whitespace `AWS_PROFILE` that would break the AWS CLI's own resolution.

## Follow-up Items

- **Cosmetic.** Drop the trailing `?? undefined` in `resolveSyncAwsEnv` (`commands/project/archive/index.ts:83-84`). Pure no-op; flagged Minor in final review.
- **Coverage.** Optional integration test that an empty-string `archive.awsProfile` on disk is normalized away by `readOatConfig` such that the resolver labels the key `'default'`, not `'shared'` with empty value. Behavior is correct; only the read-then-resolve seam isn't pinned.
- **Plan trail edit.** One-line update to plan.md p02-t01 Step 1 wording so it matches the shipped non-clobbering contract instead of the original "overridden when config provides one" phrasing. Cosmetic audit clarity.
- **Worktree branching hardening.** Parallel-group degradation surfaced when the orchestration's worktree isolation branched from primary repo's `main` instead of the orchestration HEAD. User is handling this in a separate follow-up PR.
