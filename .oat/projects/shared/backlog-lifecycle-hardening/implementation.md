---
oat_status: complete
oat_ready_for: null
oat_blockers: []
oat_last_updated: 2026-07-05
oat_current_task_id: null
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

| Phase                               | Status | Tasks | Completed |
| ----------------------------------- | ------ | ----- | --------- |
| Phase 1: Backlog close-out core     | passed | 3     | 3/3       |
| Phase 2: Instructions scan carve-in | passed | 2     | 2/2       |
| Phase 3: Doctor drift checks        | passed | 1     | 1/1       |
| Phase 4: Templates + pjm init       | passed | 2     | 2/2       |
| Phase 5: Skills + docs propagation  | passed | 3     | 3/3       |
| Phase 6: Dogfood + release          | passed | 2     | 2/2       |

**Total:** 13/13 tasks completed

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

### Phase p03 — Doctor drift checks (complete, review passed)

Sequential Tier-1 opus dispatch. Commits `7fbeaf0f` (t01 four checks), `31e4643e` (t01 m1 fix).

- **Outcome:** four `pjm:*` checks added to `pjm doctor` (auto-aggregated into top-level `oat doctor`): `backlog_terminal_in_items` (FAIL), `backlog_invalid_status` (FAIL), `backlog_archived_open` (warn), `backlog_completed_unarchived` (warn). All derive from a single `collectBacklogItems` frontmatter pass and reuse the p01 `item-status` module.
- **Verification:** pjm doctor suite (19 tests) + top-level doctor aggregation (18) + lint + type-check clean.
- **Review (opus, in-memory):** PASS, 0C/0I/0M, 2 Minor. m1 (status-less items slipped past all checks) **fixed** in `31e4643e` — `backlog_invalid_status` now also FAILs on missing/empty status with distinct "missing status" wording + fixture. m2 (whole-file completed.md ID scan) accepted as-is per design's best-effort WARN wording.
- **Design alignment:** design.md Drift Checks row for `pjm:backlog_invalid_status` broadened to "missing/empty or out-of-enum status" to match the shipped m1 fix (implementation is source of truth; design updated in the p03 bookkeeping commit).

### Phase p04 — Templates + pjm init (complete, review passed)

Sequential Tier-1 opus dispatch. Commits `824fc3de` (t01 template content + bundle-assets + content assertions), `69d44db8` (t02 README/handoffs emission + sync hint + canonical nudge).

- **Outcome:** `pjm-agents.md` gains the Backlog Lifecycle section (built around `oat backlog archive` as primary, manual fallback retained, "never invent variants like `done`" clause, wont_do-entry-only-with-`--summary`) and the Project Kickoff Handoffs section (full required-content list, kickoff-stack-only, ID+title no bare IDs). New `repo-readme.md` and `pjm-handoffs-readme.md` templates; both appended to `bundle-assets.sh`. `pjm init` scaffolds `README.md` + `pjm/handoffs/README.md` (write-if-missing, nested parent created), flows into `CANONICAL_REPO_REFERENCE_PATHS` so `pjm doctor` nudges when they're missing (no doctor.ts production change), and prints an `oat instructions sync` hint. Init never writes CLAUDE.md.
- **Verification:** pjm suite (init/index/doctor/migrate, 48 tests) + full CLI suite (2154) + lint + type-check + `pnpm format` clean.
- **Review (opus, in-memory):** PASS, 0C/0I, 1 Minor — plan's p04-t02 file list under-specified the necessary touches to `pjm/index.ts` (emit the hint on the non-JSON path; JSON payload unchanged) and `index.test.ts`/`migrate.test.ts` (fixtures asserting init's created-file list). Mechanical, no regression; recorded here as plan-artifact drift rather than a code fix.

### Phase p05 — Skills + docs propagation (complete, review passed)

Sequential Tier-1 opus dispatch. Commits `a053dbde` (t01 skills sweep), `5d53a71c` (t02 docs), `d6ad0ed6` (t03 kickoff-handoff encoding).

- **Sweep result (deviation from plan's "~14 skills" framing):** the grep matches 14 skills, but applying the "narrates the manual close-out sequence" qualifier rigorously, only **`oat-pjm-update-repo-reference`** actually did — re-pointed to `oat backlog archive <id>` as primary (manual regenerate-index kept as hand-edit fallback), v1.2.0→1.3.0. The other 13 match for benign reasons (project review-artifact `reviews/archived/`, reading completed.md as context, `oat repo archive sync`, item-add index regen, legacy `reference/backlog.md` checklist). Full triage enumerated in the implementer report; reviewer **independently verified** all 12 "no-change" calls plus a broader close-out-narration grep — no missed skill.
- **p05-t02 docs:** new `apps/oat-docs/docs/cli-utilities/backlog-lifecycle.md` (item states, close-out flow, four doctor checks) + `oat backlog archive` reference in `config-and-local-state.md` (flags/exit-codes/JSON payload, verified against `archive.ts`/`index.ts`); `index.md` regenerated via generate-index; `pnpm build:docs` green.
- **p05-t03:** `oat-pjm-review-backlog` gained the Project Kickoff Handoffs workflow mirroring the p04 template (generate/refresh at priority-alignment conclusion, human-owned lane count/order, ID+title no bare IDs, close-out = lifecycle + `git rm` handoff in same PR, stale-handoff deletion). v1.3.0→1.4.0, bumped exactly once (not in the t01 sweep).
- **Review (opus, in-memory):** PASS, 0C/0I/0M, 1 Minor — cosmetic missing comma in one re-pointed sentence; left unfixed to avoid a version re-bump for prose (reviewer-endorsed).
- **Note:** provider mirrors under `.claude`/`.codex`/`.cursor` are symlinks/generated, so skill edits need no separate staged files.

### Phase p06 — Dogfood + release (complete, awaiting final review)

Sequential Tier-1 opus dispatch. Commits `0c20c8ae` (t01 dogfood), `38d5493e` (t02 lockstep release).

- **p06-t01 dogfood:** `pnpm run cli -- pjm init` in this repo created `.oat/repo/pjm/**` (AGENTS.md with Backlog Lifecycle + Project Kickoff Handoffs, backlog scaffold, `handoffs/README.md`, current-state.md, roadmap.md) + backfilled `.oat/repo/AGENTS.md` and `reference/AGENTS.md`; existing curated `.oat/repo/README.md` preserved byte-for-byte (sha match). `pjm doctor`: canonical_files ✓, template_frontmatter ✓, top_level_layout ✓, all four new backlog checks ✓ — three pre-existing warnings on legacy `reference/` content (decision-record.md, backlog.md/backlog-completed.md, second roadmap) are unrelated to this feature, recorded not chased. `instructions sync --dry-run` listed the 3 new `.oat/repo/**` AGENTS.md with planned CLAUDE.md creations (proves the p02 carve-in end-to-end); `sync` applied 3 pointer shims; `validate` → ok (scanned=10, ok=10).
- **p06-t02 release:** lockstep bump of all five public packages 0.1.40 → **0.1.41**; `packages/cli/assets/public-package-versions.json` regenerated to match and staged. `pnpm release:validate` passed; full gates green (`build`, `lint`, `type-check`, `test`, `format`).
- **Deviation (accepted):** patch bump (0.1.41) rather than the plan's suggested minor — repo convention is patch-only across the 0.1.x line (the last lockstep release was `chore(release): bump public packages to 0.1.32`; feature PRs ship as patch), and the plan's escape hatch permits it. release:validate passed at patch.

### Final Review (code, scope=final, opus in-memory) — PASS

Auto-review fired at the p06 HiLL checkpoint (workflow.autoReviewAtHillCheckpoints=true). Covered the full feature range `9cf77e55..38d5493e`, with focused review of the previously-unreviewed p06 diff plus cross-phase integration.

- **Verdict:** PASS — 0 Critical, 0 Important, 0 Medium, 1 Minor.
- **Integration verified:** `item-status.ts` is the single source of truth (exactly 3 non-test consumers: archive, regenerate-index, doctor; no duplicated enum); archive write-ordering ↔ doctor drift checks are mutually consistent; `CANONICAL_REPO_REFERENCE_PATHS` (from TEMPLATE_TARGETS, imported by doctor) structurally prevents an init/doctor scaffold mismatch; p06 dogfood output matches the p04 templates; CLAUDE.md shims are correct `@AGENTS.md` pointer stubs; curated `.oat/repo/README.md` not overwritten; lockstep 0.1.41 with regenerated version map; no other package.json drift.
- **Gates at HEAD:** full CLI suite 2154 tests, lint 0/0, type-check, `pnpm build:docs`, `pnpm release:validate` (5 packages) — all green; working tree clean.
- **Minor m1 (deferred):** `pjm:backlog_archived_open` uses hardcoded `'open'/'in_progress'` literals instead of deriving the non-terminal set from `item-status` (`isValidBacklogStatus && !isTerminalBacklogStatus`). No current defect (literals equal today's non-terminal statuses); pure maintainability. Deferred with rationale (recommended as a follow-up backlog item) rather than fixed at the final gate.

### Independent Codex Final Review (cross-runtime second opinion) — 1 Important, fixed

The configured `oat-project-implement` gate (`oat gate review --review-type code --review-scope final`, a cross-runtime Codex review) was initially skipped during the run — I substituted an in-memory Claude opus review. On catching that, I ran the gate: it is **broken on this host** — `oat gate review` passes a two-part prompt as two positional argv to `codex exec` (which takes one PROMPT), so Codex errors with `unexpected argument` and no review runs, yet the gate still exits 0 (a broken gate reporting green). Both are defects in OAT's own gate→Codex adapter (candidate backlog items: argv construction, and exit-0-on-failure).

Ran the independent Codex review through the working rescue channel instead. Verdict: 1 Important finding (a genuine catch the three same-model-family reviews missed).

- **Important (fixed in `7fed0c16`):** `archiveBacklogItem` checked `archived/<id>.md` before `items/<id>.md`, so an id present in BOTH directories returned a `noop` "already archived" success while leaving the live `items/` copy unarchived — the command silently no-ops on the exact drift it exists to fix. Fix: guard the no-op on `items/` absence; if both exist, throw `BacklogArchiveError` (exit 1, no file touched) directing manual reconciliation. Added a fifth doctor check **`pjm:backlog_duplicate_id`** (FAIL) to detect the same-id-in-both-dirs invariant Codex noted the checks were missing. Also folded in the previously-deferred `archived_open` cleanup (now derives the non-terminal set from `item-status` instead of hardcoded literals). 129 backlog+pjm+doctor tests green; lint/type-check/`release:validate` (still 0.1.41, PR-scoped bump) clean. design.md data-flow + Drift Checks table updated.

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

**What shipped:** Backlog lifecycle hardening for the `oat` CLI, across four coupled surfaces plus propagation.

- **`oat backlog archive <id> [--wont-do] [--summary <text>] [--json]`** — atomic close-out: minimal-diff frontmatter rewrite (status + `updated`, enum comment preserved), canonical newest-first `completed.md` entry (closed always with TODO scaffold when no summary; wont_do only with `--summary`), `git mv` to `archived/` with `fs.rename` fallback, and index regeneration. Idempotent (already-archived → exit-0 no-op), exit semantics 0/1/2.
- **`oat backlog regenerate-index`** now warns on out-of-enum statuses (still renders the row) via an exported `regenerateBacklogIndex` core reused by the archive command; a dependency-free `item-status.ts` module is the single source of truth for the status enum.
- **`oat pjm doctor`** (and top-level `oat doctor` by aggregation) gained four drift checks: `pjm:backlog_terminal_in_items` (FAIL), `pjm:backlog_invalid_status` (FAIL, incl. missing/empty status), `pjm:backlog_archived_open` (warn), `pjm:backlog_completed_unarchived` (warn).
- **Instructions scan carve-in** — `.oat/repo/**` AGENTS.md/CLAUDE.md pairs are now scanned/synced/validated (rest of `.oat/` still excluded), so `oat instructions sync` creates their CLAUDE.md shims under the consumer's strategy.
- **`oat pjm init` scaffold** — new Backlog Lifecycle + Project Kickoff Handoffs sections in `pjm/AGENTS.md`, a source-of-truth map in `reference/AGENTS.md`, pointer bullets in the repo AGENTS.md, a human-facing `.oat/repo/README.md`, and a `pjm/handoffs/README.md` convention doc; init prints an `oat instructions sync` next-step hint and never writes CLAUDE.md. Delivered via two new bundled templates (`repo-readme.md`, `pjm-handoffs-readme.md`) wired into `bundle-assets.sh` and `CANONICAL_REPO_REFERENCE_PATHS`.
- **Propagation** — `oat-pjm-update-repo-reference` re-pointed at `oat backlog archive`; `oat-pjm-review-backlog` gained the kickoff-handoff workflow; new docs pages for the command + lifecycle; this repo dogfooded its own `.oat/repo/pjm/` scaffold; lockstep bump of the five public packages to 0.1.41.

**Key files/modules:** `packages/cli/src/commands/backlog/{archive,regenerate-index,index}.ts` + `shared/item-status.ts`; `commands/pjm/{doctor,init,index}.ts`; `commands/instructions/instructions.utils.ts`; `.oat/templates/{pjm-agents,reference-agents,repo-agents,repo-readme,pjm-handoffs-readme}.md`; `packages/cli/scripts/bundle-assets.sh`; `.agents/skills/{oat-pjm-update-repo-reference,oat-pjm-review-backlog}/SKILL.md`; `apps/oat-docs/docs/cli-utilities/**`.

**Verification:** per-phase opus reviews (p01–p05 all PASS 0C/0I; minors fixed inline); full CLI suite 2154 tests + docs build + lint + type-check + format green; `pnpm release:validate` passed; feature dogfooded end-to-end in this repo (`pjm init` → `doctor` → `instructions sync`/`validate`).

**Design deltas:** (1) p01/p02 declared parallel group executed sequentially per user direction (worktree reliability in this workspace); (2) `pjm:backlog_invalid_status` broadened to also flag missing/empty status (design.md updated to match); (3) release bumped patch (0.1.41) per repo convention rather than minor. All recorded in the Deviations table / task log above.
