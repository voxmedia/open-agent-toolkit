---
oat_status: in_progress
oat_ready_for: null
oat_blockers: []
oat_last_updated: 2026-07-05
oat_current_task_id: p03-t01
oat_generated: false
---

# Implementation: backlog-lifecycle-hardening

**Started:** 2026-07-05
**Last Updated:** 2026-07-05

> This document is used to resume interrupted implementation sessions.
>
> Conventions:
>
> - `oat_current_task_id` always points at the **next plan task to do** (not the last completed task).
> - When all plan tasks are complete, set `oat_current_task_id: null`.
> - Reviews are **not** plan tasks. Track review status in `plan.md` under `## Reviews` (e.g., `| final | code | passed | ... |`).
> - Keep phase/task statuses consistent with the Progress Overview table so restarts resume correctly.
> - Before running the `oat-project-pr-final` skill, ensure `## Final Summary (for PR/docs)` is filled with what was actually implemented.

## Progress Overview

| Phase                               | Status  | Tasks | Completed |
| ----------------------------------- | ------- | ----- | --------- |
| Phase 1: Backlog close-out core     | passed  | 3     | 3/3       |
| Phase 2: Instructions scan carve-in | passed  | 2     | 2/2       |
| Phase 3: Doctor drift checks        | pending | 1     | 0/1       |
| Phase 4: Templates + pjm init       | pending | 2     | 0/2       |
| Phase 5: Skills + docs propagation  | pending | 3     | 0/3       |
| Phase 6: Dogfood + release          | pending | 2     | 0/2       |

**Total:** 5/13 tasks completed

Execution: p01/p02 declared as a parallel worktree group but run sequentially per user direction (see Deviations). HiLL pause: after p06 only. Dispatch ceiling: maximum (Claude: opus, enforced).

---

## Deviations from Plan / Design

| Item                       | Source Artifact                                                        | Planned                                                 | Actual / Accepted                                                                    | Reason                                                                                                                                                                                                                                                   | Source of Truth                                                                      | Follow-up                                                                      |
| -------------------------- | ---------------------------------------------------------------------- | ------------------------------------------------------- | ------------------------------------------------------------------------------------ | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------ | ------------------------------------------------------------------------------ |
| Execution mode for p01/p02 | plan.md `oat_plan_parallel_groups: [['p01','p02']]` + `## Parallelism` | Concurrent worktree execution, merge back in plan order | Sequential Tier-1 opus subagent dispatch on the `pjm-guidance` branch (p01 then p02) | User-directed at implement preflight: session-created git worktrees are unreliable in this Orca-relay workspace and each worktree needs its own `pnpm run worktree:init`; wall-clock savings for a 3+2-task group are modest against the failure surface | Plan's disjoint-write-set analysis still holds; only the execution mechanism changed | None — the declared group remains valid for repos where worktrees are reliable |

## Task Log

### Phase p01 — Backlog close-out core (complete, review passed)

Sequential Tier-1 opus dispatch. Commits `340fa03b` (t01 status module), `23cc3e8e` (t02 regeneration core export + invalid-status warnings), `d7594cc6` (t03 `oat backlog archive` command), `c57f3efe` (t03 minor fixes).

- **Outcome:** `oat backlog archive <id> [--wont-do] [--summary] [--json]` performs atomic close-out (minimal-diff frontmatter rewrite → completed.md entry → `git mv` with fs.rename fallback → index regeneration); `regenerateBacklogIndex` exported returning `{ itemCount, warnings }` and warns on out-of-enum statuses; dependency-free `item-status.ts` shared module ready for p03/doctor import.
- **Verification:** scoped backlog vitest (59 tests) + help-snapshot + lint + type-check all clean.
- **Review (opus, in-memory):** PASS, 0 Critical / 0 Important. 2 Minor fixed in `c57f3efe`: (m1) `#`-bearing item titles were truncated in completed.md entries — now read via `YAML.parse` instead of the comment-stripping frontmatter helper, with a regression test; (m2) added no-op `--json` payload coverage through the command wrapper.
- **Implementer deviations (accepted):** regenerate-index command-warning wiring landed in the t03 commit (its `git add backlog/` covers `index.ts`) rather than t02; `archive` gained a `--backlog-root` option mirroring sibling commands; `--json` payload uses the design's `{ id, result, status, ... }` shape (not the sibling `{ status: 'ok' }` convention) to avoid a `status` key collision. None change design intent.

### Phase p02 — Instructions scan carve-in (complete, review passed)

Sequential Tier-1 opus dispatch. Commits `b7110db6` (t01 carve-in), `c7e5b0dc` (t02 sync/validate integration coverage).

- **Outcome:** `scanInstructionDirectories` re-enters `.oat/repo` when the root-level `.oat` is skipped (via a `ROOT_EXCLUDED_DIRECTORY_CARVE_INS` map + injectable existence check); `ROOT_EXCLUDED_DIRECTORIES` unchanged, so `.oat/templates|projects|sync` stay unscanned. `sync` and `validate` inherit the carve-in through `scanInstructionFiles`.
- **Verification:** instructions suite (62 tests incl. 3-strategy sync dry-run + validate-drift + absent-repo) + lint + type-check clean.
- **Review (opus, in-memory):** PASS, 0C/0I/0M, 1 Minor — a symlinked-root-`.oat` layout bypasses the carve-in, consistent with the BFS's existing never-traverse-symlinked-dirs behavior; reviewer marked it no-fix-needed. Recorded, not fixed.
- **Deviation (accepted):** p02-t02's `sync --dry-run` assertion checks exit 0 with `create` actions present, not exit 1 — planned CLAUDE.md creations aren't skip actions, so sync exits 0 (verified against `sync.ts:421` `hasSkippedActions`). Test-assertion refinement, no production change.

### Review Received: plan (artifact, gate)

**Date:** 2026-07-05
**Review artifact:** reviews/archived/artifact-plan-review-2026-07-05.md

**Findings:** 0 critical, 0 important, 0 medium, 0 minor — review passed clean; no artifact edits, no fix tasks.

Preceding in-memory structured review loop (oat-reviewer ×2) is recorded in the plan Reviews-row note: round 1 → 7 findings fixed; round 2 → 0 Critical/Important with 4 accuracy fixes applied before this gate ran.

### Review Received: plan (artifact, manual — v2)

**Date:** 2026-07-05
**Review artifact:** reviews/archived/artifact-plan-review-2026-07-05-v2.md

**Findings:** 0 critical, 1 important, 0 medium, 0 minor

**Disposition:** I1 (release bump task omits the generated public package version map) → `resolve_in_artifact`, user-confirmed. Verified against `bundle-assets.sh` (writes `packages/cli/assets/public-package-versions.json` from public package versions; file is git-tracked and shipped via the CLI's `assets`). p06-t02 updated: version map added to Files and the Step 5 `git add`, regeneration note added to Step 2, clean-tree expectation added to Step 4. No plan tasks created (artifact review).

---

## Final Summary (for PR/docs)

_(fill before running `oat-project-pr-final`)_
