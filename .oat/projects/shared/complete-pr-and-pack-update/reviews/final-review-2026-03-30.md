---
oat_generated: true
oat_generated_at: 2026-03-30
oat_review_scope: final
oat_review_type: code
oat_review_invocation: manual
oat_project: .oat/projects/shared/complete-pr-and-pack-update
---

# Code Review: final (063a7d8..5f65825)

**Reviewed:** 2026-03-30
**Scope:** Final review of all 4 tasks (p01-t01, p01-t02, p02-t01, p02-t02) across 2 phases
**Files reviewed:** 17
**Commits:** 063a7d8..5f65825 (8 commits)

## Summary

The implementation correctly addresses both goals from the imported plan: PR state tracking in the project lifecycle and installed-pack reconciliation during `oat tools update`. The TypeScript changes are well-structured with clean separation between the reconciliation logic and the command entrypoint, and all tests pass (1086 tests, lint clean, type-check clean). There are no critical issues. Two important findings relate to missing negative test coverage for name-based updates and a UX issue with synthesized tool display. Two minor findings relate to bookkeeping placeholders and implementation log duplication.

## Findings

### Critical

None

### Important

- **Missing negative test for name-based updates not reconciling pack siblings** (`packages/cli/src/commands/tools/update/update-tools.test.ts`)
  - Issue: The imported plan (section 2, Test Plan) explicitly calls for coverage that "Name-based update remains update-only." While the code correctly skips `expandInstalledPackEntries` for `target.kind === 'name'` (line 119 of `update-tools.ts`), there is no explicit test case that verifies a name-based update does NOT install missing pack siblings when the pack has uninstalled members. The existing name-based tests only have a single tool in the scope, so the non-reconciliation behavior is not proven under conditions where reconciliation could occur.
  - Fix: Add a test case that creates a tool belonging to a pack with only one of N members installed, runs a name-based update for that single installed tool, and asserts that (a) only the named tool is updated and (b) no additional pack siblings are installed (copies count remains 1 or 0).
  - Requirement: Imported plan Test Plan bullet 3: "Name-based update remains update-only."

- **Synthesized tools display `? -> ?` in update output** (`packages/cli/src/commands/tools/update/index.ts:149`)
  - Issue: When `expandInstalledPackEntries` synthesizes missing pack members at `update-tools.ts:207-215`, it creates `ToolInfo` objects with `version: null` and `bundledVersion: null`. These are marked as `status: 'outdated'` and will be installed. However, when displayed to the user at `index.ts:149`, they render as `Updated: oat-some-skill (? -> ?)` which is misleading -- the tool is being newly installed, not updated, and neither version is shown.
  - Fix: Either (a) populate `bundledVersion` on synthesized tools by reading the bundled SKILL.md version (would require an additional dependency), or (b) distinguish between "update" and "install" in the output message by checking `tool.version === null` and using a different verb like `Installed` or `Added`, or (c) add the synthesized tools to a separate `installed` result array so the command can display them distinctly. Option (b) is the simplest path.

### Minor

- **Unfilled placeholders in implementation.md Final Summary** (`.oat/projects/shared/complete-pr-and-pack-update/implementation.md:333-334`)
  - Issue: The Final Summary section contains leftover template placeholders `- {capability 1}` and `- {capability 2}` before the actual summary bullets. This will appear in PR descriptions if `oat-project-pr-final` reads this section.
  - Suggestion: Remove the two placeholder lines at lines 333-334 of `implementation.md`.

- **Duplicated session log entries in implementation.md** (`.oat/projects/shared/complete-pr-and-pack-update/implementation.md:282-309`)
  - Issue: The Implementation Log has two `### 2026-03-30` entries that partially duplicate each other. The second entry repeats p02-t01 and p02-t02 completion tracking that was already recorded in the first entry.
  - Suggestion: Consolidate into a single session log entry or clearly distinguish them (e.g., with different session start times or labels).

## Requirements/Design Alignment

**Evidence sources used:** `plan.md` (canonical imported plan), `references/imported-plan.md` (original imported plan), `implementation.md` (active tracker), `state.md` (project state)

### Requirements Coverage

| Requirement                                                                              | Status      | Notes                                                                                                   |
| ---------------------------------------------------------------------------------------- | ----------- | ------------------------------------------------------------------------------------------------------- |
| R1: Add `oat_pr_status` and `oat_pr_url` to state template                               | implemented | Both canonical and CLI bundled templates updated; scaffold test verifies                                |
| R2: `oat-project-pr-final` writes `ready` then `open` PR states                          | implemented | SKILL.md Step 6 now documents the `ready`/`open` state transitions and `oat_pr_url`                     |
| R3: `oat-project-complete` skips PR question when `oat_pr_status: open`                  | implemented | Step 2 now reads PR state and conditionally suppresses the question                                     |
| R4: `oat-project-complete` shows tracked PR URL                                          | implemented | Step 2 and Step 12 both reference `oat_pr_url` in completion summary                                    |
| R5: `oat_phase_status` behavior unchanged                                                | implemented | No changes to `oat_phase_status` values; kept as routing state                                          |
| R6: `oat tools update --pack <pack>` reconciles missing bundled members                  | implemented | `expandInstalledPackEntries` synthesizes missing members for targeted pack                              |
| R7: `oat tools update --all` reconciles missing bundled members for installed packs only | implemented | `--all` iterates installed packs per scope, skips uninstalled packs                                     |
| R8: `oat tools update <name>` remains update-only                                        | implemented | `expandInstalledPackEntries` skipped for `kind: 'name'`; missing explicit negative test                 |
| R9: Reconciliation is scope-aware                                                        | implemented | `entriesByScope` groups by scope, `getBundledPackMembers` filters agents for non-project scopes         |
| R10: Core docs refresh for `--all` when core is present                                  | implemented | `shouldRefreshCoreDocs` extracted and tested; covers `--pack core` and `--all`                          |
| R11: Keep reconciliation internal to `tools update`                                      | implemented | No changes to `tools list` or `tools outdated`                                                          |
| R12: Test coverage for PR lifecycle contracts                                            | implemented | `review-skill-contracts.test.ts` asserts key phrases in completion SKILL.md                             |
| R13: Test coverage for scaffold PR fields                                                | implemented | `scaffold.test.ts` asserts `oat_pr_status` and `oat_pr_url` in import-mode state and canonical template |
| R14: Test coverage for pack reconciliation                                               | implemented | `update-tools.test.ts` covers targeted pack, `--all` scope, scope isolation                             |
| R15: Test coverage for core docs refresh                                                 | implemented | `index.test.ts` covers explicit core, `--all` with core, `--all` without core                           |
| R16: Test: name-based update remains update-only                                         | partial     | Code is correct but no explicit negative test under reconciliation conditions                           |
| R17: Docs updated for update semantics                                                   | implemented | `tool-packs.md` updated with reconciliation and core docs refresh behavior                              |

### Extra Work (not in declared requirements)

- `packages/cli/assets/templates/state.md` sync (commit `0abb79b`) -- This was not explicitly in the plan but is a necessary consequence of changing the canonical template. The bundled CLI asset must stay in sync. This is legitimate maintenance, not scope creep.

## Verification Commands

Run these to verify the implementation:

```bash
# Full CLI test suite
pnpm --filter @tkstang/oat-cli test

# Targeted test suites
pnpm --filter @tkstang/oat-cli test -- update-tools
pnpm --filter @tkstang/oat-cli test -- scaffold
pnpm --filter @tkstang/oat-cli test -- review-skill-contracts

# Lint and type-check
pnpm --filter @tkstang/oat-cli lint
pnpm --filter @tkstang/oat-cli type-check
```
