---
oat_generated: true
oat_generated_at: 2026-04-13
oat_review_scope: final
oat_review_type: code
oat_review_invocation: manual
oat_project: /Users/thomas.stang/.codex/worktrees/bf36/open-agent-toolkit/.oat/projects/shared/claude-instructions-sync
---

# Code Review: final (v10, independent re-verification of v9 pass)

**Reviewed:** 2026-04-13
**Scope:** final — independent re-review requested by user after v9 marked `passed`
**HEAD:** `f09ec47cb33396c0375f7beef96d79ab29409a3d`
**Range:** `6d4e274325d9d21c4e42062ff94dc970a275ccde..HEAD` (65 commits)
**Workflow mode:** quick (discovery + plan; no spec/design by design)
**Files in scope:** 28 (code: `packages/cli/src/commands/instructions/**`; docs: `apps/oat-docs/docs/**`; OAT bookkeeping)
**Result:** passed

## Summary

Independently verified v9's `passed` verdict at current HEAD. Re-examined the scanner classification, sync planning, and validate drift-guidance code paths that v9 reviewed, and re-ran the full test suite. No new regressions observed; v9's verdict is warranted. The only commits between `8cc6ada1 fix(p10-t01)` and HEAD are OAT bookkeeping (`chore(oat): ...`), so code behavior is unchanged since v9 was recorded.

**Test suite:** `pnpm test` — 148 files / 1208 tests passed (exit 0).

## Findings

### Critical

None.

### Important

None.

### Medium

None.

### Minor

None.

## Independent Re-Check Against v9 Target Cases

v9 focused on the p09/p10 unreadable-symlink handling plus the v8 commit-traceability finding. I re-checked each code path and confirmed coverage.

1. **Dangling canonical `AGENTS.md` symlink, with sibling `CLAUDE.md`**
   - Scanner path: `instructions.utils.ts:192-216` (catch at `stat(entryPath)` → `brokenAgentsPath` + `brokenAgentsErrorCode`), classified at lines 273-284 → `content_mismatch` / `'broken AGENTS.md symlink'` (ENOENT) or `'unreadable AGENTS.md symlink target (<code>)'` (other).
   - Sync path: `sync.ts:89-96` `hasUnreadableCanonicalAgents` recognizes `'broken AGENTS.md symlink'` + `'unreadable AGENTS.md symlink target'` prefix; `planSyncActions` at lines 167-182 emits a `skip` with reason `'canonical AGENTS.md unreadable; repair manually'`.
   - Regression test: `instructions.utils.test.ts:463-479` (broken, paired) + `instructions.utils.test.ts:373-399` (unreadable EACCES, paired) + `sync.test.ts:170-201` / `sync.test.ts:204-236` (dry-run manual-repair skip).

2. **Dangling canonical `AGENTS.md` symlink, no sibling `CLAUDE.md`**
   - Scanner: classification uses `claudePath = directoryEntry.claudePath ?? join(directoryPath, 'CLAUDE.md')` (utils.ts:270-271), so a synthetic Claude path is reported even without a real sibling; still surfaces as content_mismatch.
   - Regression test: `instructions.utils.test.ts:482-498`.

3. **Dangling / unreadable `CLAUDE.md` symlink (Claude-only, no `AGENTS.md`)**
   - Scanner: `instructions.utils.ts:197-203` sets `claudePath` + `brokenClaudePath`; classification at lines 286-297 emits drift (`'broken CLAUDE.md symlink'` / `'unreadable CLAUDE.md symlink target (<code>)'`).
   - Sync path: `hasUnreadableClaudeSource` at `sync.ts:98-105` matches, `planSyncActions:157-165` emits skip `'CLAUDE.md unreadable; repair manually'`.
   - Regression tests: `instructions.utils.test.ts:402-428` (EACCES Claude-only) + `instructions.utils.test.ts:323-339` (broken Claude-only) + `instructions.utils.test.ts:341-371` (unreadable stat-passing but readFile EACCES) + `sync.test.ts:238-270` / `sync.test.ts:272-304`.

4. **Dangling / unreadable paired `CLAUDE.md` symlink (sibling `AGENTS.md` exists, `--strategy symlink`)**
   - Scanner: `brokenClaudePath` branch at lines 286-297 fires before normal paired symlink validation at lines 343-389, so paired broken/unreadable Claude symlinks are not laundered through the healthy-symlink branch. p10's fix remains correctly ordered.
   - Regression test: `instructions.utils.test.ts:430-461` (paired EACCES Claude symlink under `--strategy symlink`).

5. **Non-ENOENT target failures (`EACCES`, `EPERM`, `ELOOP`) on either side**
   - Scanner distinguishes ENOENT from other codes via `brokenAgentsErrorCode`/`brokenClaudeErrorCode` at lines 279-281 and 292-294, producing `'broken X symlink'` for ENOENT and `'unreadable X symlink target (<code>)'` otherwise. Handling applies to any non-null code string, so `EACCES`/`EPERM`/`ELOOP`/`ENOTDIR` all flow through the same branch.
   - Tests exercise `EACCES` explicitly; the code branch is code-agnostic beyond the ENOENT check, so other codes are covered by the same path.

6. **v8 p10 commit traceability**
   - `git log --grep="(p10-t01)"` finds `8cc6ada1 fix(p10-t01): preserve paired unreadable claude symlinks`. p10 task discovery resolves cleanly.

## Post-v9 Delta

`git diff --stat 8cc6ada1..HEAD -- packages/cli apps/oat-docs` returns no changes. All 14 commits since `8cc6ada1` are OAT bookkeeping under `.oat/projects/shared/claude-instructions-sync/**`. Behavior reviewed by v9 is behavior at current HEAD.

## Requirements/Design Alignment

**Evidence sources used:** `discovery.md`, `plan.md`, `implementation.md`, `state.md`, prior archived review `final-review-2026-04-13-v9.md`. Quick-mode project — no `spec.md` / `design.md` by design.

| Requirement (from discovery.md "Success Criteria")                                                          | Status      | Notes                                                                                                                                                                                         |
| ----------------------------------------------------------------------------------------------------------- | ----------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `oat instructions validate` distinguishes pairs / drifted pairs / missing / adoptable strays in nested dirs | implemented | `scanInstructionFiles` + `buildInstructionsPayload` produce `ok`/`missing`/`content_mismatch`/`stray` with nested recursion. Integration tests at `instructions.integration.test.ts:166,355`. |
| `oat instructions sync` repairs `CLAUDE.md` using pointer / symlink / copy                                  | implemented | `sync.ts:273-285` branches on strategy; integration tests cover all three strategies (`235`, `275`, `316`).                                                                                   |
| Claude-only strays adopted into `AGENTS.md` with conflict handling                                          | implemented | `sync.ts:236-262` plus race guard at `238-250`; readable strays adopted, unreadable Claude-only classified as drift (p08).                                                                    |
| Existing exclusions (`.git`, `.oat`, `.worktrees`, `node_modules`) preserved                                | implemented | Constants at `instructions.utils.ts:27-28`; integration test at line 166.                                                                                                                     |
| Project-only behavior documented and tested                                                                 | implemented | `apps/oat-docs/docs/provider-sync/scope-and-surface.md`, `apps/oat-docs/docs/reference/troubleshooting.md`, help snapshots.                                                                   |
| Unsafe content loss prevention                                                                              | implemented | `--force` gate for content mismatch overwrites (`sync.ts:184-192`); race guard for adoption (`sync.ts:236-250`); partial-adoption error wrap (`sync.ts:107-117,286-291`).                     |
| Unreadable `AGENTS.md` symlink targets surfaced as drift (p09)                                              | implemented | Preserved across ENOENT and non-ENOENT codes; regression tests present.                                                                                                                       |
| Paired unreadable `CLAUDE.md` symlink targets surfaced under `--strategy symlink` (p10)                     | implemented | `brokenClaudePath` handled before paired symlink validation; regression test at `instructions.utils.test.ts:430-461`.                                                                         |
| Post-v8 commit traceability (p11)                                                                           | implemented | `8cc6ada1` commit subject correctly scoped to `p10-t01`.                                                                                                                                      |

### Extra Work (not in declared requirements)

None observed. All code changes in scope map back to discovery success criteria or follow-up review fixes recorded in `plan.md`.

### Deferred Findings Ledger

Empty at entry. `implementation.md` records "Deferred findings: none" across all six review-fix receive entries (lines 1262, 1284, 1308, 1331, 1354, 1377). No carry-forward debt to re-evaluate. Exit state also empty.

## Verification Commands

```bash
git rev-parse HEAD
git log --oneline --grep="(p10-t01)" --max-count=5
git diff --stat 8cc6ada1..HEAD -- packages/cli apps/oat-docs
pnpm test
```

Observed results:

- `HEAD = f09ec47cb33396c0375f7beef96d79ab29409a3d` (matches caller-provided HEAD).
- `git log --grep="(p10-t01)"` returns `8cc6ada1 fix(p10-t01): preserve paired unreadable claude symlinks` (task-scoped commit present).
- `git diff --stat 8cc6ada1..HEAD -- packages/cli apps/oat-docs` → empty (no post-fix code/doc drift).
- `pnpm test` → 8 successful / 8 total turbo tasks; CLI suite: 148 test files, 1208 tests passed (exit 0); docs build succeeded.

## Environment Notes

Unrelated pre-existing dirty files in worktree (not within scope, not reviewed): `.oat/config.json`, `packages/cli/assets/skills/oat-project-document/SKILL.md`. Detached HEAD is intentional per worktree context.

## Recommended Next Step

No fix work needed. Run `oat-project-review-receive` to record v10 as `passed` and then proceed to `oat-project-pr-final` for PR flow.
