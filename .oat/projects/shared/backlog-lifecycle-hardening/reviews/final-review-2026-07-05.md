---
oat_generated: true
oat_generated_at: 2026-07-05
oat_review_scope: final
oat_review_type: code
oat_review_invocation: gate
oat_project: .oat/projects/shared/backlog-lifecycle-hardening
---

# Code Review: final

**Reviewed:** 2026-07-05
**Scope:** Final independent code review for `.oat/projects/shared/backlog-lifecycle-hardening`
**Files reviewed:** 57 changed files in `d94561071e374a647810b1240f03a544939c65f9..HEAD`
**Commits:** `d94561071e374a647810b1240f03a544939c65f9..43e0c1ed9a26a8fd3366a8e965a591894de1f7dc`

## Summary

No blocking findings. The core backlog archive command, duplicate-id guard, doctor drift checks, `.oat/repo` instruction carve-in, PJM scaffold additions, skill version bumps, dogfood output, and lockstep release metadata are implemented and covered by tests. I found one minor documentation drift from the late duplicate-id fix: public docs still describe the pre-fix four-check surface and omit the duplicate-id archive failure case.

Findings: 0 critical, 0 important, 0 medium, 1 minor

## Findings

### Critical

None

### Important

None

### Medium

None

### Minor

- **Duplicate-id guard is missing from the public backlog lifecycle docs** (`apps/oat-docs/docs/cli-utilities/backlog-lifecycle.md:53`)
  - Issue: The implementation and tests now ship a fifth doctor check, `pjm:backlog_duplicate_id`, and `archiveBacklogItem` rejects an ID present in both `items/` and `archived/` before treating an archived item as a no-op. The public backlog lifecycle page still introduces the doctor list as the full drift surface and lists only the original four checks. The command reference also documents exit code `1` as unknown id or invalid status only, omitting the duplicate-id conflict path (`apps/oat-docs/docs/cli-utilities/config-and-local-state.md:48`).
  - Suggestion: Update the source docs to mention the duplicate-id conflict and `pjm:backlog_duplicate_id`, then regenerate bundled docs assets so `packages/cli/assets/docs/cli-utilities/backlog-lifecycle.md` and `packages/cli/assets/docs/cli-utilities/config-and-local-state.md` stay in sync.

## Requirements/Design Alignment

**Evidence sources used:** `discovery.md`, `design.md`, `plan.md`, `implementation.md`, changed code/docs/templates/skills in `d94561071e374a647810b1240f03a544939c65f9..HEAD`, and archived plan review artifacts.

### Deferred Findings Ledger

- Prior final-review deferred minor: `pjm:backlog_archived_open` hardcoded non-terminal statuses instead of deriving from `item-status`.
- Current disposition: fixed in `7fed0c16`; `doctor.ts` now uses `isValidBacklogStatus(item.status) && !isTerminalBacklogStatus(item.status)`.

### Requirements Coverage

| Requirement                                              | Status                            | Notes                                                                                                                                                             |
| -------------------------------------------------------- | --------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `oat backlog archive <id>` atomic close-out              | implemented                       | Status rewrite, completed-log insertion, duplicate-id refusal, move, regeneration, no-op, JSON payload, and git/non-git paths are implemented with focused tests. |
| Regenerate-index invalid-status visibility               | implemented                       | `regenerateBacklogIndex` returns warnings while preserving render behavior.                                                                                       |
| PJM doctor backlog drift checks                          | implemented                       | Terminal-in-items, invalid/missing status, archived-open, duplicate-id, and completed-unarchived checks are implemented and covered.                              |
| `.oat/repo/**` instruction scan carve-in                 | implemented                       | Scan re-enters `.oat/repo` while keeping `.oat/templates`, `.oat/projects`, and `.oat/sync` excluded; sync/validate integration coverage exists.                  |
| PJM init scaffold and handoff templates                  | implemented                       | README, handoffs README, lifecycle guidance, sync hint, canonical path nudge, and bundled-template copy list are implemented and tested.                          |
| Bundled skills and docs propagation                      | implemented with minor docs drift | Changed skills have version bumps; docs cover the main lifecycle, but need the duplicate-id late-fix update noted above.                                          |
| Lockstep public package bump and generated version asset | implemented                       | All five public manifests are `0.1.41`; `public-package-versions.json` matches the packages it is designed to expose.                                             |

### Extra Work (not in declared requirements)

None requiring reversal. The additional `pjm:backlog_duplicate_id` check and archive duplicate guard are a direct follow-up to the independent Codex review finding and align with the feature's drift-prevention goal.

## Verification Commands

```bash
git diff --check d94561071e374a647810b1240f03a544939c65f9..HEAD
pnpm --filter @open-agent-toolkit/cli exec vitest run src/commands/backlog/archive.test.ts src/commands/pjm/doctor.test.ts src/commands/instructions/instructions.integration.test.ts
pnpm release:validate
pnpm lint
pnpm type-check
pnpm build:docs
pnpm test
```

Note: an initial parallel `pnpm test` run failed because a separate `pnpm build:docs` run already held Next's `.next/lock`; rerunning `pnpm test` by itself passed.

## Recommended Next Step

Run the `oat-project-review-receive` skill to disposition the minor documentation finding.
