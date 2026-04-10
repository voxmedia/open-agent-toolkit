---
oat_status: complete
oat_ready_for: null
oat_blockers: []
oat_last_updated: 2026-04-10
oat_generated: false
oat_template: false
oat_summary_last_task: prev2-t01
oat_summary_revision_count: 2
oat_summary_includes_revisions: ['p-rev1', 'p-rev2']
---

# Summary: Workflow Friction — User Preference Config

## Overview

OAT workflow skills ask a lot of repetitive confirmation prompts — HiLL checkpoint behavior, archive on complete, open a PR, post-implementation chaining, review execution model, re-review scope narrowing. Power users almost always answer these the same way, but each prompt interrupts an otherwise autonomous lifecycle. This project added a `workflow.*` config namespace that lets users set those answers once and have skills respect them automatically, built on top of the 3-layer config resolution (`resolveEffectiveConfig`) introduced in PR #38.

## What Was Implemented

**Six `workflow.*` preference keys** that let skills skip repetitive prompts when set:

- `workflow.hillCheckpointDefault` (`every` | `final`) — default HiLL checkpoint behavior for `oat-project-implement`. `every` writes `oat_plan_hill_phases: []` (pause after every phase); `final` writes the last phase ID (pause only at the end). Skipped when unset.
- `workflow.archiveOnComplete` (boolean) — skip the "Archive after completion?" prompt in `oat-project-complete`.
- `workflow.createPrOnComplete` (boolean) — skip the "Open a PR?" prompt in `oat-project-complete`. When set, completion auto-triggers PR creation. (See Key Decisions for why this was dropped from the OAT repo's own config.)
- `workflow.postImplementSequence` (`wait` | `summary` | `pr` | `docs-pr`) — controls what `oat-project-implement` Step 15 chains after final review passes. `wait` stops without auto-chaining, `summary` runs summary only, `pr` runs pr-final (which auto-generates summary), `docs-pr` runs docs sync + pr-final.
- `workflow.reviewExecutionModel` (`subagent` | `inline` | `fresh-session`) — default execution model for final review. `subagent` and `inline` run automatically without prompting; `fresh-session` is a soft preference that prints guidance for a separate session but still offers escape hatches to `subagent` or `inline` if the user changes their mind.
- `workflow.autoNarrowReReviewScope` (boolean) — auto-narrow re-review scope to fix-task commits in `oat-project-review-provide` when re-reviewing completed fix tasks. No effect on initial reviews.

**Three-layer config resolution refactor.** `getConfigValue()` in `packages/cli/src/commands/config/index.ts` was refactored to delegate to `resolveEffectiveConfig()` from PR #38, deleting ~150 lines of duplicated per-key if-else resolution. Every existing config key now benefits from the 3-layer precedence model (`env > local > shared > user > default`) without per-key special-casing. Source labels in `oat config get --json` and `oat config list` output changed from `config.json`/`config.local.json` → `shared`/`local`/`user` for consistency with `oat config dump`.

**Surface flags on `oat config set`.** New mutually exclusive `--shared`, `--local`, `--user` flags target specific config files with per-key restrictions: structural keys (`projects.root`, `worktrees.root`, `git.*`, `documentation.*`, `archive.*`, `tools.*`) remain shared-only; state keys (`activeProject`, `lastPausedProject`) remain local-only; `activeIdea` accepts both local and user (new behavior — previously rejected user writes); workflow keys accept all three surfaces; `autoReviewAtCheckpoints` remains shared-only pending a broader behavioral-key surface expansion.

**Skill integrations for five skills.** Every workflow skill that had a target prompt was updated to read the relevant preference before asking:

- `oat-project-implement` (v1.2.2 → v1.3.0): Step 2.5 (hillCheckpointDefault), Step 14 (reviewExecutionModel with fresh-session escape hatch), Step 15 (postImplementSequence). Also: always-resume default (removed interactive resume-or-fresh-start prompt; fresh start is now an argument-only override), CRITICAL / DO NOT SKIP callouts on all four existing bookkeeping commit sections plus a new Mode Assertion block warning that bookkeeping commits are mandatory.
- `oat-project-complete` (v1.3.7 → v1.4.0): Step 2 batched questions now read `workflow.archiveOnComplete` and `workflow.createPrOnComplete` before asking. Preserves the existing `oat_pr_status: open` short-circuit.
- `oat-project-review-provide` (v1.2.3 → v1.3.0): Step 3a re-review scope narrowing now reads `workflow.autoNarrowReReviewScope`.
- `oat-project-review-receive` (v1.2.1 → v1.3.0): new required Step 7.6 bookkeeping commit that atomically stages `plan.md`, `implementation.md`, `state.md`, and the project's `reviews/` directory (capturing the Step 7.5 archive move). CRITICAL / DO NOT SKIP framing.
- `oat-project-review-receive-remote` (v1.2.0 → v1.3.0): same pattern in a new Step 6.5.

**Documentation.** `apps/oat-docs/docs/cli-utilities/configuration.md` got a full "Workflow preferences" section with three-layer resolution explanation, surface setting examples, the `autoReviewAtCheckpoints` relationship note, a "Source labels" subsection (upgrade note for script consumers), and a "Choosing the right surface" subsection that codifies the per-repo-vs-personal rule. `apps/oat-docs/docs/workflows/projects/` updates: `lifecycle.md` gained a friction-reduction cross-link; `hill-checkpoints.md` gained a subsection on `workflow.hillCheckpointDefault`; `reviews.md` gained bookkeeping-commit and re-review-scope-narrowing subsections. `apps/oat-docs/docs/reference/cli-reference.md` gained the `oat config` surface flags and `workflow.*` preference key listing. `.oat/repo/reference/current-state.md` and `decision-record.md` were updated with the new capability and ADR-016 respectively.

## Key Decisions

- **Build on top of `resolveEffectiveConfig()` rather than add parallel resolution.** PR #38 (control-plane) introduced a generic 3-layer config resolution utility with per-key source attribution. Instead of building workflow-specific resolution logic, the entire `getConfigValue()` was refactored to delegate to that utility. This deleted duplicated code across all existing keys and gave them the 3-layer model for free. The refactor was captured as **Option A** during planning (vs. Option B: add a separate workflow-only branch) and was chosen because the scope-increase was offset by the code deletion.

- **Per-repo vs personal surface rule.** Workflow preferences expose a subtle design trap: some preferences (`hillCheckpointDefault`, `reviewExecutionModel`, `autoNarrowReReviewScope`) are genuinely personal and safe at user scope, while others (`archiveOnComplete`, `postImplementSequence`) depend on per-repo configuration to be correct (e.g., `postImplementSequence: pr` only works in repos without `documentation.requireForProjectCompletion: true`). The rule we settled on: **if a workflow preference's correctness depends on other repo-level settings, it belongs at shared (per-repo) scope, not user scope.** This is documented in `configuration.md` with a cross-repo foot-gun example.

- **Drop `workflow.autoFixBookkeepingDrift` from the plan.** The original plan included this as an escape hatch for the stale-state reconciliation prompt in `oat-project-implement`. During discovery we identified that the root cause of the drift was missing commits in `oat-project-review-receive` and `oat-project-review-receive-remote`, not a preference users needed. Phase 4 fixes the root cause (prev1-t01 extending the fix to stage the archive move), making the escape hatch redundant. The plan dropped from 7 preference keys to 6.

- **Drop `workflow.createPrOnComplete` from the OAT repo's own config.** During dogfooding we discovered that `createPrOnComplete` is dead letter in the normal flow: `postImplementSequence: docs-pr` causes `oat-project-pr-final` to run at the end of implement, which creates the PR and sets `oat_pr_status: open`. When `oat-project-complete` runs later, its existing `oat_pr_status: open` short-circuit fires regardless of `createPrOnComplete`. The key was kept in the schema for edge cases but not set at the OAT repo level, and the configuration guide documents the foot-gun.

- **`fresh-session` is a soft preference, not a hard lock.** The `workflow.reviewExecutionModel: fresh-session` value prints guidance telling the user to run the review in a separate session, but still offers `1) subagent` / `2) inline` escape hatches and a "press Enter to wait" option. The agent is stepping aside rather than refusing to act, because the user can legitimately change their mind at invocation time.

- **`activeIdea --user` is a legitimate write surface.** The pre-existing catalog entry for user-level `activeIdea` advertised the surface but the CLI rejected writes with "state key cannot be set at user scope". This was a latent inconsistency amplified by the new `--user` flag. prev1-t03 closed it by special-casing `activeIdea` to accept both `local` and `user` surfaces while keeping `activeProject`/`lastPausedProject` local-only.

## Design Deltas

- **Dropped `workflow.autoFixBookkeepingDrift`** from the plan after identifying root cause of the drift in the review-receive skills. Original plan had 7 preference keys; shipped with 6.
- **Dropped `workflow.createPrOnComplete` from the OAT repo's own shared config** after dogfooding revealed it's dead letter when `postImplementSequence: docs-pr` is set (which is the sensible default for repos with `documentation.requireForProjectCompletion: true`). The key still exists in the schema for other repos that might want it.
- **Changed `workflow.postImplementSequence` schema** during plan discussion. Original: `"all" | "summary-pr" | "exit"`. Final: `"wait" | "summary" | "pr" | "docs-pr"`. The change recognized that `oat-project-pr-final` already auto-generates summary, so a standalone "summary" path only makes sense when you specifically don't want a PR.
- **Source label user-facing change.** The `getConfigValue()` refactor changed `source` field values in `oat config get --json` output from `config.json`/`config.local.json` → `shared`/`local` for consistency with `oat config dump`. This is a minor breaking change for script consumers, documented in the `configuration.md` "Source labels" subsection with an upgrade note.

## Notable Challenges

- **Dogfooding the feature revealed several design gaps** that didn't show up in the original plan:
  - **CLI version skew between installed and source.** The implement skill reads preferences via `oat config get`, which resolves to the globally installed binary. Since the workflow-friction feature added new keys, the installed `oat` (v0.0.24) didn't know about them until rebuilt/reinstalled. The skill's `2>/dev/null || true` fallback gracefully treats unknown keys as unset, so behavior is correct — but the preferences don't take effect at development time without a rebuild/reinstall step.
  - **No `oat config unset` command.** Users can write any workflow preference but cannot remove one without hand-editing JSON. This is especially sharp for enum keys where no value represents "prompt me again". Captured as `bl-af93` (small follow-up).
  - **Cross-repo `createPrOnComplete` foot-gun.** Discovered when debating whether the key should be shared or user scope — see Key Decisions.
- **Catalog entry for user-surface `activeIdea` had stale `owningCommand` after prev1-t03.** The re-review v2 flagged that the catalog still advertised `owningCommand: 'user config APIs (not surfaced via oat config set)'` even though prev1-t03 made `oat config set activeIdea --user` work. Fixed in prev2-t01.
- **Step 7.6 commit fix missed the review artifact.** The original plan for p04-t02 (adding the bookkeeping commit to `oat-project-review-receive`) included `git add "$PROJECT_PATH/reviews/"` in the command block, but that line was dropped during implementation. The final review (v1) caught this as Important finding I1; prev1-t01 restored the line.

## Tradeoffs Made

- **Scope rename vs. source label rename.** Changing source labels from `config.json`/`config.local.json` → `shared`/`local` is a user-facing breaking change for scripts parsing `--json` output. The tradeoff: consistency with `oat config dump` and clearer vocabulary vs. silent breakage for anyone grep'ing on the old labels. Accepted the breakage, documented it prominently in `configuration.md`.
- **`getConfigValue()` refactor vs. parallel workflow branch.** Adding a workflow-specific branch (Option B) would have been a smaller change with less risk of regressing existing keys. The full refactor (Option A) required more tests and a source label change, but paid for itself by deleting ~150 lines of duplicated code. Accepted the bigger change.
- **Skill preference reads assume the installed CLI is current.** The `oat config get workflow.<key>` pattern in skill bodies assumes the installed `oat` binary has the new schema. In development or on cloud environments without the latest CLI, the read fails and the skill falls back to prompting. This is the correct behavior (backward-compatible) but creates a subtle gap between "I set the preference" and "the skill respects it" at development time. Tracked indirectly via `bl-281c` (which proposes `npx @open-agent-toolkit/cli` fallback for cloud environments; version skew is a related concern).

## Revision History

- **p-rev1 (2026-04-10):** First final review identified 3 Important and 6 Minor findings. 3 Important + 5 Minor were converted to fix tasks (prev1-t01 through prev1-t08); 1 Minor was deferred with rationale (`formatResolvedValue` comma handling — pre-existing latent edge case). Key fixes: restoring `git add "$PROJECT_PATH/reviews/"` in Step 7.6; documenting source label rename in `configuration.md`; extending `activeIdea` to accept `--user` surface.
- **p-rev2 (2026-04-10):** Narrowed re-review of prev1 commits identified 1 new Minor: stale `owningCommand` on the user-surface `activeIdea` catalog row (incidental drift from prev1-t03). Converted to prev2-t01 and fixed inline; final review marked `passed` without an additional review cycle since the fix was documentation-only polish with zero behavior change.

## Follow-up Items

- **`bl-af93`** — Add `oat config unset <key>` command. Small scope. Enables experiment-style preference changes and scope migration without hand-editing JSON. Especially sharp for enum workflow keys where no value represents "unset".
- **`bl-281c`** — Migrate read-only skills to control-plane-backed CLI (`oat project status --json`) with `npx @open-agent-toolkit/cli` fallback for cloud environments. This project's skill integrations still use manual `oat config get` reads; migrating them to control-plane-backed reads + cloud fallback would close the related version-skew gap and improve cloud-environment usability.
- **Deferred Minor from v1 review:** `formatResolvedValue()` joins arrays with commas without escaping. Pre-existing latent edge case for `localPaths` entries containing commas. No action taken; optional TODO comment could be added in a future pass.
- **Behavioral-key surface expansion.** `autoReviewAtCheckpoints` is currently shared-only per `validateSurfaceForKey`. Extending it to user/local surfaces follows the same pattern as workflow keys and could be a small follow-up.

## Associated Issues

None tracked in `state.md` `associated_issues` — this was an internal dogfood project, not tied to an external Linear/Jira/GitHub issue.
