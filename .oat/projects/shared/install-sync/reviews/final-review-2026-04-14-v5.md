---
oat_generated: true
oat_generated_at: 2026-04-14
oat_review_scope: final
oat_review_type: code
oat_review_invocation: manual
oat_project: /Users/thomas.stang/.codex/worktrees/8074/open-agent-toolkit/.oat/projects/shared/install-sync
---

# Code Review: final (install-sync, post-rebase)

**Reviewed:** 2026-04-14
**Scope:** Final review of the full install-sync branch after rebase onto `origin/main` (merge base `a32272c9`).
**Files reviewed:** 18 (11 source/tests + 5 package.json + public-package-versions + 1 OAT tracking file)
**Commits:** 21 post-rebase commits (`a32272c9..HEAD`)
**Workflow mode:** quick (discovery + plan; no spec/design expected)

## Summary

The branch correctly scopes install-triggered sync across the planner (`compute-plan.ts`), the sync command (`commands/sync/index.ts`), and the Codex extension planner (`providers/codex/codec/sync-extension.ts`). All four discovery success criteria are met, the zero-role partial-sync no-op is enforced in both fresh and existing-config cases, and the publishable-package lockstep bump landed cleanly at `0.0.39` (a proper `+1` on top of the current `main` at `0.0.38`, even though the implementation notes still reference the originally planned `0.0.37`). Focused test suite (38 tests across four files) and `pnpm release:validate` both pass against the rebased HEAD. No blocking findings.

## Findings

### Critical

None

### Important

None

### Medium

None

### Minor

- **Implementation.md references stale version `0.0.37`** (`.oat/projects/shared/install-sync/implementation.md:167,198`)
  - Issue: The implementation log records the lockstep bump as going to `0.0.37`, but after the rebase the actual recorded version across all five public packages is `0.0.39` (main advanced to `0.0.38` and the branch bumped to `0.0.39`). This is doc drift, not a behavioral issue.
  - Suggestion: On the next bookkeeping pass, update the implementation.md outcome lines and the phase summary to note the final shipped version is `0.0.39`. Not a blocker for merge.

- **Small wording drift: `state.md` still says `oat_phase_status: in_progress`** (`.oat/projects/shared/install-sync/state.md:10`)
  - Issue: All 6 tasks are complete per implementation.md and the status line reads "Implementation tasks are complete." but the frontmatter still shows `oat_phase_status: in_progress`.
  - Suggestion: The review-receive / docs-updated step should flip this to `complete` once the final review passes. Not blocking.

## Requirements/Design Alignment

**Evidence sources used:** discovery.md, plan.md, implementation.md (quick mode — no spec/design present, which matches the mode contract).

### Discovery Success Criteria

| Success Criterion                                                            | Status      | Evidence                                                                                                                                                                                                                                                                                              |
| ---------------------------------------------------------------------------- | ----------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Running `oat tools install docs` only syncs docs-pack canonical content      | implemented | `commands/tools/install/index.ts:29-30` forwards `installedCanonicalPaths` as `--install-canonical` args. `commands/init/tools/docs/index.ts:159` sets the canonical scope to `canonicalSkillPaths(selectedSkills)`. Planner filters entries via `canonicalPathAllowed` in `compute-plan.ts:316-324`. |
| Unrelated provider views are not added during install-triggered auto-sync    | implemented | `compute-plan.ts:297-302` builds `canonicalFilter`. The filter is applied during both entry generation (line 322) and stale-manifest removals (line 399-404). Covered by `compute-plan.test.ts:185-259`.                                                                                              |
| `.codex/config.toml` does not gain unrelated agents during docs-pack install | implemented | `sync-extension.ts:196-221` treats partial sync with zero desired roles as a true no-op (for both missing and existing config). Stale-role collection is skipped when `isPartialSync` (line 207-213). Regression coverage at `sync-extension.test.ts:79-151`.                                         |
| Regression tests fail before the fix and pass after                          | implemented | Implementation log shows RED/GREEN cycle for each task. The focused suite (`src/engine/compute-plan.test.ts`, `src/commands/sync/index.test.ts`, `src/commands/tools/install/index.test.ts`, `src/providers/codex/codec/sync-extension.test.ts`) — 38 tests — all pass on HEAD.                       |

### Plan Task Coverage

| Task    | Status      | Notes                                                                                                                                                                                                     |
| ------- | ----------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| p01-t01 | implemented | Renamed planner input from removal-only to canonical-path scoping; sync command plumbing forwards scope. Coverage: `compute-plan.test.ts:185-231`.                                                        |
| p01-t02 | implemented | Entry generation filtered by `canonicalPathAllowed` (compute-plan.ts:322-324). Coverage: `compute-plan.test.ts:233-259`.                                                                                  |
| p02-t01 | implemented | `computeCodexProjectExtensionPlan` receives scope arg; filters desired roles and skips stale-role collection during partial sync. Coverage: sync-extension.test.ts:79-120 and sync/index.test.ts:711-752. |
| p02-t02 | implemented | Focused vitest suite and `pnpm release:validate` both pass. Lockstep public-package bump landed at 0.0.39.                                                                                                |
| p03-t01 | implemented | Zero-role partial sync returns empty operations + empty managedRoles when no existing config exists. Coverage: sync-extension.test.ts:122-134.                                                            |
| p03-t02 | implemented | Same no-op guard also applies when `.codex/config.toml` exists with user content. `aggregateConfigHash` hashes existing content to maintain invariance. Coverage: sync-extension.test.ts:136-151.         |

### Extra Work (not in declared requirements)

- Publishable-package lockstep bump to `0.0.39` across all five public packages — **required** by project guardrails (AGENTS.md "lockstep public package set"), so this is in-scope even though not called out in discovery.
- Command-level validation of `--install-canonical` via regex (`INSTALL_CANONICAL_PATH_PATTERN`, `commands/sync/index.ts:85-102`) — defensive hardening beyond what discovery required, appropriate given this flag is user-invocable via spawned subprocess.

No genuinely unplanned or out-of-scope work detected.

## Code Quality Observations (non-blocking)

- The no-op branch in `sync-extension.ts:215-221` returns `aggregateConfigHash: hashContent(existingConfigContent ?? '')`. Hashing "unchanged" content produces a stable fingerprint for any callers watching hash stability across runs; this is the right semantic.
- `compute-plan.ts:297-302` uses `normalize()` on both sides of the set comparison, which is robust on POSIX. On Windows the input regex (`commands/sync/index.ts:85-86`) already rejects backslashes, so the comparison remains consistent. No portability concern.
- `sync-extension.ts:61-76` uses raw string comparison (no normalize) on the allowed-set. This is safe because the install command constructs paths with forward slashes via `join('.agents/skills/...')` — actually `canonicalSkillPaths` in `install-sync-context.ts:21-25` uses string concatenation with `/`, and `toRelativePath` normalizes to forward slashes. Consistent on POSIX; Windows users would need backslash awareness, but that's outside the install-sync feature scope.
- `apply.ts:80-89` correctly treats `operations: []` as a no-op — no `executeSyncPlan` call when there are no entries/removals, and no `applyCodexProjectExtensionPlan` call when there are no non-skip codex operations. This double-verifies the zero-role partial-sync case is a true no-op on disk.

## Tests & Verification Performed

All commands executed at HEAD in the worktree:

```bash
pnpm --filter @open-agent-toolkit/cli exec vitest run \
  src/engine/compute-plan.test.ts \
  src/commands/sync/index.test.ts \
  src/commands/tools/install/index.test.ts \
  src/providers/codex/codec/sync-extension.test.ts
# Result: 4 test files, 38 tests, all passed (420ms)

pnpm release:validate
# Result: "release validation passed for 5 public packages"
# - @open-agent-toolkit/cli 0.0.39
# - @open-agent-toolkit/control-plane 0.0.39
# - @open-agent-toolkit/docs-config 0.0.39
# - @open-agent-toolkit/docs-theme 0.0.39
# - @open-agent-toolkit/docs-transforms 0.0.39
```

## Deferred Findings Carry-Forward

Per the ledger supplied in the review scope, zero Medium and zero Minor findings were deferred in prior review-receive runs. Nothing to carry forward.

## Verdict

**Pass.** All four discovery success criteria are satisfied. Both review-fix tasks (p03-t01, p03-t02) close the previously-flagged Codex-config leaks. The implementation stays within scope (no planner refactor, no manifest schema changes, no install architecture churn). Publishable-package lockstep is intact at `0.0.39` and release validation passes. The two minor findings are documentation drift that can be fixed in the next bookkeeping commit and do not affect shipped behavior.

## Recommended Next Step

Run the `oat-project-review-receive` skill to record the pass. Since both minor findings are bookkeeping-only (implementation.md version annotation and state.md phase-status flag), they do not need new plan tasks and can be resolved in the `oat_docs_updated` / `review-receive` housekeeping pass.
