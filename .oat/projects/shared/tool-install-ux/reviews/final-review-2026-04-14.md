---
oat_generated: true
oat_generated_at: 2026-04-14
oat_review_scope: final
oat_review_type: code
oat_review_invocation: manual
oat_project: /Users/thomas.stang/.codex/worktrees/8074/open-agent-toolkit/.oat/projects/shared/tool-install-ux
---

# Code Review: final

**Reviewed:** 2026-04-14
**Scope:** Final code review across p01-t01, p01-t02, p02-t01, p02-t02
**Files reviewed:** 6 (code) + OAT bookkeeping referenced for traceability only
**Commits:** `9e77fc6f..HEAD` (5 fix commits + bookkeeping: `6f551c4e`, `dfe447a9`, `d88e12d6`, `99dc97ff`, plus OAT chore commits)

## Summary

All four quick-mode tasks deliver their intended outcomes: install-state aggregation across scopes, canonical migration cleanup for user-eligible packs, prompt prepopulation with current install location, and per-pack summary output. Focused regressions cover the new behaviors, and code quality is in line with `packages/cli/AGENTS.md` conventions (alias imports, domain-local tests, logger-routed output, no destructive root mutations). The single lingering concern is the p02-deferred "both-scope default submit silently removes user copy" behavior, which is intentionally accepted as a tradeoff for this fix and should be tracked as a follow-up rather than blocking final.

## Findings

### Critical

None

### Important

None

### Medium

#### Deferred Findings Disposition

**Ledger entry:** [p02 / Medium] "Both-scope installs still normalize to project on default submit"

- **Source:** `reviews/p02-review-2026-04-13.md` (Medium section)
- **Location (current code):** `packages/cli/src/commands/init/tools/index.ts:351-366` (`buildUserScopeChoices`), `packages/cli/src/commands/init/tools/index.test.ts:406-411` (asserts `checked: false` for `both`-state)
- **Disposition:** **Accept-defer** (follow-up work, not a final blocker)
- **Justification:**
  - The behavior is unchanged from p02. `buildUserScopeChoices` still derives `checked: location === 'user'` (index.ts:363), so a `both`-state pack submits as `project` by default and the migration loop (index.ts:642-645) removes the user-scope canonical copy.
  - Discovery explicitly records this as an acknowledged mitigation path: Key Decision 4 calls for "normalize to the selected scope and report cleanup of the opposite-scope canonical content" when a pack is installed in both scopes. The current UI communicates this via the `(current: project + user)` follow-up label (index.ts:361) plus the prompt text "unselected go to project scope" (index.ts:442) and the per-pack summary that names the final scope (reportSuccess at index.ts:469-480).
  - `implementation.md` line 168-169 captures the deliberate scope boundary: "Both-scope installs remain visible in the prompt label; changing that to a true three-state selection remains outside this fix."
  - No Critical/Important risk: a user already in the `both` state has both copies available; submitting the default only collapses to the project copy (which already exists), so no unique content is lost. The change is destructive only for users who relied on the user-scope canonical copy as the canonical one.
- **Recommended follow-up (non-blocking):** Add a separate OAT project/task to replace the `both`-pack follow-up with a three-state selection (`keep project` / `keep user` / `leave both`) or at minimum default a `both`-state checkbox to `true` so the default submit preserves the user copy instead of removing it. Capture a regression test asserting the default for `both`-state packs once the UX direction is chosen.

(No other Medium findings introduced by this review.)

### Minor

- **`loadInstalledPackStates` runs twice per invocation** (`packages/cli/src/commands/init/tools/index.ts:588-593` and `:845-850`)
  - Issue: The installer scans both scopes up front to drive prompts, then re-scans at the end to refresh `tools` config booleans. Each scan walks `.agents/skills` and `.agents/agents` under both roots.
  - Suggestion: Either (a) derive the post-install config map from the known `packScopes` plus `affectedScopes` and the selected-packs list, or (b) consolidate into one scan after writes and compute prompt state incrementally. Not urgent because install is an explicitly-invoked command, but worth noting for maintainability.
- **`migrate-cleanup` loop does not account for core** (`packages/cli/src/commands/init/tools/index.ts:627-646`)
  - Issue: Only user-eligible packs are migrated. If core were ever installed at project scope by another path, it would not be cleaned up.
  - Suggestion: Non-blocking — core is hard-wired to user scope in this command, so the current architecture prevents that state from being produced here. A defense-in-depth cleanup for core could be added later but is outside the discovery scope.
- **Install-state tests do not exercise agents-only packs** (`packages/cli/src/commands/init/tools/install-state.test.ts:41-82`)
  - Issue: Coverage hits skill-only and mixed-pack cases; research is the only pack with bundled agents, and the aggregation path for `type: 'agent'` entries is exercised indirectly through `index.test.ts:563-586` but not through `install-state.test.ts`.
  - Suggestion: Add a small case to `install-state.test.ts` covering a pack seen only via an agent entry to lock the behavior of `buildPackInstallStateMap` when tools are agents, not skills.

## Spec/Design Alignment

**Evidence sources used:** `discovery.md` (Key Decisions, Success Criteria, Out of Scope, Risks), `plan.md` (task breakdown), `implementation.md` (outcomes per task), `reviews/p02-review-2026-04-13.md` (prior findings and status). Spec and design are N/A for this quick-mode project.

### Requirements Coverage (against discovery.md Key Decisions + Success Criteria)

| Requirement (from discovery)                                                                                                       | Status      | Notes                                                                                                                                                                                                                                       |
| ---------------------------------------------------------------------------------------------------------------------------------- | ----------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| KD1: Scope change behaves as a migration for user-eligible packs                                                                   | implemented | `runInitTools` migration loop at `packages/cli/src/commands/init/tools/index.ts:627-646` removes the opposite-scope canonical copy before installs, and records affected scopes for auto-sync.                                              |
| KD2: Current install location inferred from disk, not config                                                                       | implemented | `loadInstalledPackStates` (`index.ts:269-292`) drives all prompt state and post-install config via `buildPackInstallStateMap` in `install-state.ts:30-63`; no new config schema.                                                            |
| KD3: Interactive installer shows current install location and already-installed state, and preselects user-scope from actual state | implemented | `buildPackChoices` (`index.ts:309-349`) adds `(installed: ...)` labels; `buildUserScopeChoices` (`index.ts:351-366`) emits `(current: ...)` labels and derives `checked` from current scope. Covered by tests at `index.test.ts:336-411`.   |
| KD4: Mixed-scope (`both`) normalization cleans up opposite scope and reports it                                                    | partial     | Cleanup itself is implemented and verified (`index.test.ts:563-586`). Reporting goes through per-pack final-scope summary. Default-submit UX for `both` is an accepted tradeoff (see Deferred Findings Disposition).                        |
| KD5: Summary output lists final per-pack scope outcomes (no coarse collapse)                                                       | implemented | `reportSuccess` (`index.ts:455-480`) prints `pack (scope)` entries and per-scope sync commands; verified at `index.test.ts:519-538` and `tools/install/index.test.ts:193-205`.                                                              |
| Success Criteria: Root cause of "user scope installed at project level anyway" covered                                             | implemented | Migration removes stale opposite-scope content before install, so additive installs + auto-sync can no longer leave both sides populated unintentionally. Wrapper command passes both affected scopes to auto-sync (`install/index.ts:54`). |
| Success Criteria: Plan includes regression coverage for migration and prompt prepopulation                                         | implemented | `index.test.ts` covers migration (p01-t02), both→project normalization (p02-t02), prompt labels/defaults (p02-t01); `install/index.test.ts` covers wrapper-level affected-scope sync.                                                       |
| Constraint: Avoid config/manifest format changes                                                                                   | respected   | No new config fields; the existing `tools` booleans are recomputed from scan state.                                                                                                                                                         |
| Constraint: Respect pack scope rules (`core` user-only; `workflows`/`project-management` project-only)                             | respected   | `resolvePackScopes` (`index.ts:390-453`) pins project-only packs and core regardless of `--scope` or per-pack selection.                                                                                                                    |

### Extra Work (not in discovery)

None detected. The wrapper-level `affectedScopes` propagation (`tools/install/index.ts:54-58`) looks like new surface area but is a direct enabler of KD1 (migration auto-sync must cover both sides). `consumeInitToolsRunMetadata` (`init/tools/index.ts:368-372`) is a module-level `let` used to pass state from `runInitTools` back into the wrapper's `postAction` hook; this is a minor concurrency foot-gun (not safe if multiple installs run in the same process) but is idiomatic with the existing command composition and is reset at the start of each run (`index.ts:578`). Not a finding, but worth noting for future refactors.

## Verification Commands

Run these to confirm the implementation (from repo root):

```bash
pnpm --filter @open-agent-toolkit/cli exec vitest run \
  src/commands/init/tools/install-state.test.ts \
  src/commands/init/tools/index.test.ts \
  src/commands/tools/install/index.test.ts

pnpm --filter @open-agent-toolkit/cli lint

# Package-wide type-check / test are known-blocked by unrelated
# @open-agent-toolkit/control-plane resolution failures in src/commands/project/*
# (documented in implementation.md verification notes).
pnpm --filter @open-agent-toolkit/cli type-check
```

Expected: focused Vitest suites pass; lint passes; full `type-check` and full `test` remain blocked by pre-existing, unrelated `@open-agent-toolkit/control-plane` resolution errors.

## Recommended Next Step

No Critical or Important findings. The deferred p02 Medium is explicitly accepted as a follow-up. If desired, run the `oat-project-review-receive` skill to convert the Minor items and the follow-up UX work into a new follow-up project (recommended) rather than re-opening this project. Otherwise, this project is ready for PR.
