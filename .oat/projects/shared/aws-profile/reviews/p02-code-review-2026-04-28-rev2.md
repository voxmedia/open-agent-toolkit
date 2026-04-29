---
oat_generated: true
oat_generated_at: 2026-04-28
oat_review_scope: p02
oat_review_type: code
oat_project: .oat/projects/shared/aws-profile
oat_supersedes: reviews/p02-code-review-2026-04-28.md
---

# Code Review: p02 (task p02-t01) — rev2

**Reviewed:** 2026-04-28
**Scope:** Phase 2, task p02-t01 — fix-up pass: align `buildAwsEnv` with discovery decision #3
**Files reviewed:** 2 (`archive-utils.ts`, `archive-utils.test.ts`)
**Commits:** 2 (`523ded9b` original feature, `e9f93745` fix-up)
**Range:** `770d57d5..e9f93745`

> **Supersedes:** `reviews/p02-code-review-2026-04-28.md`. The prior artifact's one Important finding ("helper-level precedence contradicts discovery decision #3 for the completion path") and its two related Minor findings (doc over-promise, whitespace-only coverage) are all resolved by `e9f93745`. The remaining Minor finding from rev1 (explicit completion-path parent+config test) is intentionally not addressed and is downgraded here — see Findings/Minor.

## Verdict

**PASS** — Important finding from rev1 is fully resolved. `buildAwsEnv` is now non-clobbering: a non-empty value in `opts` is applied only when `parentEnv` does not already provide that key. JSDoc on the helper and on both option interfaces now spells out the contract and explicitly cites discovery decision #3. Tests are inverted (parent env wins) and a sibling `AWS_REGION` case plus a whitespace-only case are added. All 22 tests in `archive-utils.test.ts` pass (up from 20), all 33 archive command tests pass, lint and type-check are clean. No regressions, no scope creep.

## Summary

The fix-up commit (`e9f93745`) addresses the rev1 Important finding by gating the `env.AWS_PROFILE`/`env.AWS_REGION` writes behind a `parentHas(key)` predicate that checks whether the parent env already supplies a non-empty value for the same key. Behavior now matches the discovery contract: shell env wins over config; config still wins over "nothing"; flag-style overrides are deferred to p04 by callers populating the env entry themselves before calling the helper. JSDoc on `buildAwsEnv`, `EnsureS3ArchiveAccessOptions`, and `ArchiveProjectOnCompletionOptions` is updated to document the non-clobbering contract and reference discovery decision #3 by name. The original "config overrides parent env" test is replaced with its inverse, an `AWS_REGION` parity case is added, and a whitespace-only case (rev1 Minor #3) is added. The full review-range diff is the type-extension + helper + JSDoc + tests — exactly what p02 declared.

## Findings

### Critical

None.

### Important

None.

### Medium

None.

### Minor

- **Plan p02-t01 step 1 still describes "override" semantics, contradicting both discovery and the now-shipped helper** (`.oat/projects/shared/aws-profile/plan.md:162`)
  - Issue: Plan p02-t01 step 1 says "Assert that an existing parent-process `AWS_PROFILE` is preserved (not clobbered by an unset config value) and is overridden when config provides one." The discovery decision #3 (and now the implementation + tests) say the opposite for the "config provides one" case: parent env wins, config does not clobber. The plan is the only artifact that still encodes the old (rev1-implemented) behavior.
  - Suggestion: Update plan.md p02-t01 step 1 to "and is preserved when config also provides one — config does not clobber an explicit parent-env `AWS_PROFILE`. Flag-style overrides are p04's responsibility." Low-impact (plan task is already executed, frontmatter is `oat_status: complete`), but leaves a lower-friction trail for anyone re-running or auditing the project. Out of scope to block on, but worth handling during plan-touch in p04 or via a quick edit-receive cycle.
  - Requirement: discovery decision #3.

- **No explicit completion-path test for parent+config collision** (`packages/cli/src/commands/project/archive/archive-utils.test.ts:510-555`)
  - Issue: Carried over from rev1 (Minor #2). The new "parent env wins" assertions exercise `ensureS3ArchiveAccess` directly (lines 618, 641). The completion-path test ("forwards awsProfile + awsRegion env to aws s3 sync during completion", lines 510-555) only sets `dependencies.env: { PATH: '/usr/bin' }` (no `AWS_PROFILE`). Coverage of "both `dependencies.env.AWS_PROFILE` AND `options.awsProfile` are set during `archiveProjectOnCompletion`, parent env wins on the `aws s3 sync` execFile" remains implicit-via-shared-helper.
  - The risk surface is low: both call paths funnel through the same `buildAwsEnv` helper, and the helper is unit-tested for that exact case via the `ensureS3ArchiveAccess` route. A future regression where someone changes only the completion call to use a different env-build path would not be caught.
  - Suggestion: Optional. Add one completion-path test mirroring lines 618-639 but exercising `archiveProjectOnCompletion` (with `dependencies.env.AWS_PROFILE = 'parent'`, `options.awsProfile = 'config'`, asserting the s3 sync execFile receives `AWS_PROFILE=parent`). Not blocking.

## Requirements/Design Alignment

**Evidence sources used:** `discovery.md`, `plan.md`, `implementation.md`, prior review (`reviews/p02-code-review-2026-04-28.md`). No spec/design — quick mode.

### Resolution of rev1 Findings

| rev1 Finding (severity)                                                                       | Status (rev2)                | Notes                                                                                                                                                                                                                                              |
| --------------------------------------------------------------------------------------------- | ---------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Helper-level precedence contradicts discovery decision #3 for the completion path (Important) | resolved                     | `archive-utils.ts:138-141` adds `parentHas` predicate; lines 145, 151 gate the writes; tests at lines 618, 641 lock in "parent env wins" for both `AWS_PROFILE` and `AWS_REGION`. Behavior now matches discovery decision #3 for both modes.       |
| Doc string slightly over-promises "unset" handling (Minor)                                    | resolved                     | JSDoc rewritten on `archive-utils.ts:117-131` to lead with "Non-clobbering merge" and explicitly state both branches: non-empty `opts` applied only when parent lacks the key, and unset/empty handling is unchanged. Cites discovery decision #3. |
| `whitespace-only` config value not directly covered (Minor)                                   | resolved                     | New test at `archive-utils.test.ts:712-734` asserts whitespace-only `awsProfile`/`awsRegion` (`'   '`, `'\t  '`) are treated as unset and never inject keys.                                                                                       |
| `AWS_PROFILE` clobber test does not cover the completion path's precedence intent (Minor)     | not addressed (carried over) | See Minor finding above. Coverage remains implicit-via-shared-helper.                                                                                                                                                                              |

### Plan Coverage (p02-t01) — rev2

| Plan item                                                                                          | Status      | Notes                                                                                                                                                                        |
| -------------------------------------------------------------------------------------------------- | ----------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Extend `EnsureS3ArchiveAccessOptions` with `awsProfile?` + `awsRegion?` (+ JSDoc per fix)          | implemented | `archive-utils.ts:32-43`. JSDoc explicitly cites discovery decision #3.                                                                                                      |
| Extend `ArchiveProjectOnCompletionOptions` with same (+ JSDoc per fix)                             | implemented | `archive-utils.ts:64-74`. JSDoc clarifies "completion path has no flag override."                                                                                            |
| Add file-private `buildAwsEnv(parentEnv, opts)` helper                                             | implemented | `archive-utils.ts:132-156`; not exported.                                                                                                                                    |
| Replace `aws` execFile env args with helper output                                                 | implemented | Three callsites — `aws --version` and `aws sts get-caller-identity` (lines 539-543, both via `execOptions`), `aws s3 sync` (lines 506-512). All route through `buildAwsEnv`. |
| Continue to base from `dependencies.env ?? process.env`                                            | implemented | Lines 508, 539.                                                                                                                                                              |
| Pass new options through chain so `archiveProjectOnCompletion` forwards to `ensureS3ArchiveAccess` | implemented | Lines 484-485.                                                                                                                                                               |
| Test: env contains `AWS_PROFILE`/`AWS_REGION` for sts and s3 sync calls                            | implemented | Test lines 510-555 (completion / s3 sync), 557-594 (ensureAccess / version + sts).                                                                                           |
| Test: parent-env preserved when config unset                                                       | implemented | Test lines 596-616.                                                                                                                                                          |
| Test: parent-env preserved when both parent and config set (rev2: inverted from rev1)              | implemented | Test lines 618-639 (`AWS_PROFILE`) and 641-662 (`AWS_REGION` parity). **Behavior now matches discovery decision #3.**                                                        |
| Test: no `AWS_PROFILE` injected when neither source supplies one                                   | implemented | Test lines 664-685.                                                                                                                                                          |
| Test: empty-string config treated as unset                                                         | implemented | Test lines 687-710.                                                                                                                                                          |
| Test: whitespace-only config treated as unset (rev2 addition)                                      | implemented | Test lines 712-734.                                                                                                                                                          |
| Helper file-private; near top of file                                                              | implemented | Line 132, immediately after `normalizeS3Uri`. Not exported.                                                                                                                  |
| No regression in existing fixtures                                                                 | verified    | All 22 archive-utils tests pass (up from 20 in rev1); all 33 archive command tests pass.                                                                                     |
| Lint + type-check pass                                                                             | verified    | `oxlint`: 0 warnings/errors on 373 files. `tsc --noEmit`: clean.                                                                                                             |

### Discovery Coverage (decisions touched by p02-t01) — rev2

| Decision                                                                                           | Status      | Notes                                                                                                                                                                                                                  |
| -------------------------------------------------------------------------------------------------- | ----------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Decision #2 — Plumb env at `archive-utils.ts` helper boundary                                      | implemented | All AWS spawns in this module routed through `buildAwsEnv`.                                                                                                                                                            |
| Decision #3 — Precedence: flag > shell env > config; config does not clobber an explicit shell env | implemented | `parentHas` guard at `archive-utils.ts:145, 151` ensures non-empty parent env wins. Flag-style override is explicitly deferred to p04 callers (per JSDoc). Tests at lines 618, 641 lock in the contract for both vars. |
| Decision #4 — Region as a sibling, same plumbing                                                   | implemented | `awsRegion` mirrors `awsProfile` exactly; sibling test cases at lines 641-662 and 712-734.                                                                                                                             |
| Decision #6 — Skill unchanged at the auth layer                                                    | n/a here    | Skill changes are p05 territory; p02 only touches archive-utils.                                                                                                                                                       |

### Extra Work (not in declared requirements)

None. The rev1+rev2 combined diff for p02-t01 is exactly the type extensions, the new helper (now with non-clobbering guard + JSDoc), and the wiring at three callsites — plus the corresponding tests. No scope creep into p03 (config command surface) or p04 (CLI flags / precedence resolver) territory.

## Verification Commands

```bash
# Confirm tests pass (22/22 archive-utils, 33/33 archive command suite)
pnpm --filter @open-agent-toolkit/cli exec vitest run src/commands/project/archive/archive-utils.test.ts
pnpm --filter @open-agent-toolkit/cli exec vitest run src/commands/project/archive

# Lint + type-check
pnpm --filter @open-agent-toolkit/cli lint
pnpm --filter @open-agent-toolkit/cli type-check
```

Spot-check the contract directly:

```bash
# Helper guard
sed -n '132,156p' packages/cli/src/commands/project/archive/archive-utils.ts

# Inverted parent-wins tests
sed -n '618,662p' packages/cli/src/commands/project/archive/archive-utils.test.ts
```

## Recommended Next Step

p02 is ready. Run the `oat-project-review-receive` skill to (optionally) capture the carried-over Minor findings as plan tasks for follow-up, then proceed to p04 (`oat project archive sync` flags + precedence resolver). The plan.md p02-t01 step-1 wording (Minor #1 above) can be corrected as a doc-only follow-up or rolled into p04 if convenient.
