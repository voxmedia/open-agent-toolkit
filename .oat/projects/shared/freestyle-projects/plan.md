---
oat_template: true
oat_status: in_progress
oat_ready_for: null
oat_blockers: []
oat_last_updated: 2026-11-21
oat_phase: plan
oat_phase_status: in_progress
oat_plan_hill_phases: [] # [] = none for brief modes
oat_plan_parallel_groups: [] # groups of phases that run concurrently in worktrees; [] = fully sequential
oat_plan_source: goal
oat_import_reference: null
oat_import_source_path: null
oat_import_provider: null
oat_generated: false
---

# Project Brief: freestyle-projects

> Execute this brief using `oat-project-implement`. Phases are the units of
> progress: each `## Phase pNN:` block carries intent and exit evidence instead
> of planned tasks, and only the next phase must be concrete. Execution records
> (`### Task pNN-tNN:`) live in `implementation.md`, never here.

**Commit Convention:** `{type}({scope}): {description}` - e.g., `feat(p01-t01): add user auth endpoint`

## Goal

Add a `freestyle` OAT project mode (GitHub issue #420): a project that has OAT's
structure and records but no lifecycle workflow. It serves an orchestrating
agent that runs its own multi-week execution with many delegated lanes, many
PRs, restarts and context compaction. Today such a run either fights a
lifecycle mode's gates or keeps its state in conversation, where compaction
loses it. Two consults with the Factory Platform T3 MVP orchestrator (2026-11-15
and 2026-11-20) supplied the motivating failures: stale "next action" prose
surviving under newer checkpoints, lane state existing only in the conversation
after compaction, and a spun-off project whose records the orchestrator merged
but never read.

## Outcomes

1. **A freestyle project can be created and is recognized everywhere as freestyle.** `oat project new <name> --mode freestyle` scaffolds a minimal `state.md`, the project `AGENTS.md` and deletable templates; `list`, `status`, routers and the dashboard show it as freestyle and recommend nothing; no validator, closeout or completion path treats it as spec-driven. — Evidence: CLI and control-plane tests over a freestyle fixture for each consumer in the workflow-mode change inventory; a scratch project created and inspected with the branch build.
2. **The project log and journal work on a freestyle project without lifecycle fields.** Log commands work by path; timestamped event entries can be appended (including a "merged" event with an optional source project); journal check reports how many phases it recognized, validated and skipped, with reasons. — Evidence: log and journal-check tests over a freestyle fixture; an append/check/synthesize run on the scratch project.
3. **A child project can be linked to its parent and the parent cannot miss it.** `--link-to <parent>` records `oat_linked_from` and adds one file to the parent's `linked-projects/`; `status` on the parent flags unacknowledged links until the orchestrator logs an acknowledgment. — Evidence: tests for creation, flagging and acknowledgment; a parent/child scratch pair where the child's file arrives by merge.
4. **`status` warns when a newer copy of the records exists on another branch.** — Evidence: tests over a git fixture with the records branch behind, equal to and ahead of another branch.
5. **Lane state survives compaction in one file written by one command.** `oat project lane set` maintains `lanes.md` (Active, Closed, History), files lane reports with `--report`, and flags a lane head ahead of its last report. — Evidence: ledger tests for create, update, close, supersede, history and the head-ahead check; atomic-write test; a multi-lane scratch run.
6. **Skills and docs describe freestyle accurately.** The `oat-project-freestyle` skill, the docs pages that list modes, and the mode-aware skills name freestyle correctly. — Evidence: skill validation and contract tests; docs build; a fresh-context review of changed docs against the code.

## Approach

Freestyle is a new member of `WORKFLOW_MODES` (`packages/control-plane/src/types.ts:11-19`), recognized by the state parser before the spec-driven/discovery defaults (`control-plane/src/state/parser.ts:120-155`, `project.ts:89-95`). Every consumer of the mode then either handles freestyle or opts out explicitly: the recommender returns `skill: 'none'` (`recommender/router.ts`), the dashboard route maps gain a freestyle entry (`cli/src/commands/state/generate.ts:522-629`), and plan validation, closeout and complete-state skip lifecycle checks for it. The scaffold adds freestyle to `--mode` choices and to the exhaustive `TEMPLATES_BY_MODE` and `STATE_TEMPLATE_BY_MODE` maps (`project/new/scaffold.ts:124,173`), with templates resolved through the usual repository → user → bundle order.

Records commands need only `state.md` (`project/log/append.ts:1540-1551`, `check.ts:409-416`, `synthesize.ts:106-113`, `rollup.ts:139-146`), so the log works on a freestyle project once the mode is recognized. Event entries are a new, timestamped entry kind in the existing judgment log, kept sparse by convention. Journal check gains a coverage report instead of silently passing phases it does not recognize (`journal-check/index.ts:72-88`, `journal-records.ts:27-35`).

Linked projects use new names so the coordination fields (`oat_parent`, `oat_children`; `validation/project-state.ts:296-350`) and the reviewer-links command (`oat project links`) keep their meaning. The lane ledger is a new `lanes.md` with one writer command; the project log stays the judgment log of DR-260718.

The project `AGENTS.md` carries the operating rules OAT does not enforce: single writer, records branch, dispatch and report contract, lane placement, links. `oat instructions sync` skips `.oat/projects` (`instructions.utils.ts:38-48`), so `status` and dispatch briefs name the file's path.

Delivery follows the repository's Workflow Mode Change Inventory: p01 enumerates every consumer before code changes, and the final review of each milestone re-checks it.

## Constraints and Out of Scope

- **Constraint:** existing modes behave exactly as before; every freestyle branch in shared code is additive and tested against an existing-mode fixture too.
- **Constraint:** OAT enforces structure and records only in freestyle: no gates, checkpoints, automatic commits, pushes, PRs or required reviews.
- **Constraint:** the repository's Definition of Done applies to each milestone PR, including skill bumps and the lockstep package version bump.
- **Constraint:** no material complexity for speculative failure modes without the operator's buy-in (AGENTS.md Feature Planning Triage).
- **Constraint:** this project never changes the Factory Platform T3 MVP records, goal state, delegates, PRs or watches; that thread is consulted read-only.
- **Out of scope:** promotion to or from freestyle.
- **Out of scope:** split storage between the code branch and a synced scope, a ref per remote delegate, a full outside-launch record system.
- **Out of scope:** links for other modes (BL-261120-evaluate-project-links).

## Decisions

- **Workflow fit:** goal mode, because the outcome needs several deliveries (mode first, multi-lane records next, evidence after real use) and the first milestone was agreed in conversation. Rejected: brief (one delivery too large to review; PRs #361 and #362 were 270–297 files), spec-driven (the design settled in conversation without a separate design document).
- **Name:** `freestyle`. OAT provides structure and records only: no gates, checkpoints, automatic commits, pushes or PRs, and no required reviews. The project's `AGENTS.md` defines how it runs, and editing it is step one. Rejected: `user-defined` (describes the mechanism, not the experience).
- **state.md:** minimal: `oat_workflow_mode: freestyle` plus identity fields, no lifecycle fields, so discovery and log commands keep working. Freestyle is recognized before the spec-driven/discovery defaults. Rejected: no `state.md` (every discovery, list and log path would need another way to recognize a project).
- **Surfaces:** list, status, routers and the dashboard show freestyle and recommend nothing. Log commands work by path. Journal check reports phases recognized, validated and skipped, with reasons.
- **Skill:** a thin `oat-project-freestyle` skill; creation and the first-step prompt live in the CLI. Rejected: CLI only (agents find workflows through skills).
- **Project AGENTS.md:** scaffolded with no CLAUDE.md pointer (Claude Code reads AGENTS.md). `status` and dispatch briefs name its path, because it sits in the project folder, not above the code.
- **Linked projects:** folder `linked-projects/` in the parent (scaffolded with a README so a new file is the signal), child field `oat_linked_from`, flag `--link-to <parent>`. The child adds one file; the parent orchestrator reads the child's records, updates its own docs and logs an acknowledgment; `status` flags unacknowledged links; AGENTS.md says to check after every merge and on resume. Coordination fields (`oat_parent`) and `oat project links` stay unchanged. Rejected: reusing `oat_parent` (a coordination parent lists children up front; links arrive by merge); `links/`, `subprojects/`, `offshoots/`, `related-projects/` (collision with `oat project links`, implied hierarchy, or too loose).
- **Records branch:** the orchestrator's branch is the integration branch and holds the records. AGENTS.md defaults: the orchestrator's checkout stays on it; side work and trial merges use other worktrees. `status` warns, judged by git ancestry, when a newer copy of the records exists on another branch.
- **Single writer:** only the orchestrator writes the shared records (plan, `lanes.md`, `project-log.md`, `lane-reports/`). Delegate PRs hold code only. On resume the orchestrator reconciles its records against the forge.
- **Lane ledger (`lanes.md`):** written only by `oat project lane set`; sections `## Active` (one block per open lane, rewritten in place), `## Closed` (one line per merged or superseded lane), `## History` (append-only, one line per update with an update ID). Fields: lane ID, task/run and thread handles, worktree/branch, head/base, state, next action and owner, review round and report pointer, blocker, last observed, wake source, optional configured provider/model/effort and observed model, optional `paths:` for lanes sharing a worktree. States: dispatched, running, turn finished, work settled, review accepted, merged, blocked (`waiting_on`: owner, lane, linked project or external), superseded (`replaced_by`). A lane may point to a linked child project. Holds no reasoning beyond one-line next/blocker. Rejected: history as project-log events (turns the judgment log mechanical, two writes with a crash window, lost when `workflow.projectLog` is off); one file per lane (resume needs N reads; revisit if `lanes.md` grows too long).
- **Ledger vs project log:** the ledger records operational facts a resuming orchestrator needs to act; the project log stays the judgment log (DR-260718) and gets timestamped event entries only for events that matter to the project's story (including "merged", optional source project), each pointing to a ledger update ID.
- **IDs:** lowercase, zero-padded, matching m01/p01: lanes `l07`, dispatches numbered per lane `d02`, reports `lane-reports/l07-d02.md`.
- **Dispatch:** one request from the orchestrator that ends in one report: the initial launch and each follow-up after the lane's turn ends. A message while the lane runs (steer) amends the open dispatch and gets a ledger history line; the report notes how it was handled. Every turn end, partial ones included, gets a report; an interrupted turn closes as "no report". Wakes are notifications, not dispatches.
- **Lane reports:** returned as the delegate's final message (works for remote delegates and for lanes that never merge); the orchestrator files it verbatim before acting, then runs `lane set --report <file>` (copies it into `lane-reports/` and sets the pointer in the same write), then appends accepted log entries keyed by dispatch ID. Reports are never edited. Sections: Summary (This round; Lane so far, cumulative), Delivered, Verification (tested SHA must equal the delivered head), Decisions, Deviations, Steering received, Review findings (fixed or declined with reason), Learnings, Open items, Proposed log entries. The shape is a deletable, user-editable template. Rejected: lanes writing their own record files (invisible until merge, cannot observe review/merge/supersede, unreachable for remote delegates, conflicts between lane PRs).
- **Head-ahead check:** for lanes in their own worktree, `lane set` and `status` flag a branch head past the last report's head; the orchestrator does not merge unreported commits unreviewed.
- **Lane placement:** the orchestrator decides per lane whether to use its own worktree or a subagent in the orchestrator's worktree; OAT supports both and prescribes neither. Shared-worktree lanes: placement is derived from the worktree path, attribution comes from the report's commit list, commits use exact paths, the orchestrator verifies the combined head, and the head-ahead check does not apply. AGENTS.md documents the rules per placement.
- **Milestones:** m01 freestyle mode, m02 multi-lane records, m03 evidence (provisional, re-planned after m02 is used in a real run). Each milestone ships as its own PR. m02 starts right after m01 merges; real use is re-alignment input, not a gate.

## Known Unknowns

- The full list of mode consumers, including the 27 skill files that mention `oat_workflow_mode` and about 17 docs pages that list modes — Settled by: p01 (inventory)
- How a freestyle project completes and archives (`complete-state/index.ts:90-130`, `closeout-invariant.ts:1246-1290`) — Settled by: p01
- Timestamp format for event entries, given date-only UTC log headings (`append.ts:1400`) — Settled by: p03
- Whether `rollup` supports freestyle without `summary.md` or refuses with a clear message (`rollup.ts:612-616`) — Settled by: p03
- Whether `--link-to` takes a name or a path, and how a parent in another scope resolves — Settled by: p05
- The parseable block format inside `lanes.md`, and whether existing `oat dispatch record` IDs can serve as dispatch IDs — Settled by: p07

## Delivery endpoint and authority

- **Endpoint:** merged — a milestone is delivered when its PR is merged into `main`.
- **Authority:** the operator approves the brief, each milestone's re-alignment and each delivery's merge. The agent decides alone on phase-internal implementation choices and on dispatching review and fix rounds. Anything that adds scope or a new guarantee goes to the operator first (AGENTS.md Feature Planning Triage; bookkeeping-findings `new-hardening`).

## Milestones

| Milestone | Phases             |
| --------- | ------------------ |
| m01       | p01, p02, p03, p04 |
| m02       | p05, p06, p07, p08 |
| m03       | p09                |

## Phase p01: Mode recognition and opt-outs

**Intent:** Enumerate every consumer in the Workflow Mode Change Inventory and record it in `implementation.md`; add `freestyle` to `WORKFLOW_MODES`; recognize it in the state parser before the spec-driven/discovery defaults; make list, status, routers and the dashboard show it and recommend nothing; make plan validation, closeout, complete-state and archive handle it without lifecycle checks.
**Exit evidence:** The inventory table in `implementation.md` with each consumer marked handled or opted out; tests over a freestyle fixture for each handled consumer, plus an existing-mode fixture on every changed path; `pnpm check`, `pnpm type-check`, `pnpm test` pass.
**Provisional:** no

## Phase p02: Scaffold, templates, project AGENTS.md and skill

**Intent:** Add `--mode freestyle` to `oat project new` with a minimal state template and deletable templates; scaffold the project `AGENTS.md` (how the project runs, single writer, records branch, editing it as step one); have `status` name its path; add the thin `oat-project-freestyle` skill that creates the project, walks the user through the `AGENTS.md`, and on resume points at the records.
**Exit evidence:** Scaffold tests (bundle tier under an isolated `HOME`); skill validation and contract tests; a scratch project created with the branch build and inspected with `status`.
**Provisional:** no

## Phase p03: Records commands

**Intent:** Make the log commands work by path on a freestyle project; add timestamped event entries, including a "merged" event with an optional source project; give journal check a coverage report of phases recognized, validated and skipped, with reasons.
**Exit evidence:** Log append/check/synthesize tests and journal-check tests over a freestyle fixture; an append/check/synthesize run on the scratch project.
**Provisional:** no

## Phase p04: m01 docs and release

**Intent:** Update the docs pages and mode-aware skills that list modes, the CLI and package READMEs, and help text; bump changed skills and the lockstep package versions.
**Exit evidence:** The full Definition of Done gate list passes, including `check:skill-bumps`, `release:check-versions`, `release:validate`, `build:docs` and docs-index freshness; a fresh-context docs review against the code.
**Provisional:** no

## Phase p05: Linked projects

**Intent:** Add `--link-to <parent>`, the `oat_linked_from` field, the `linked-projects/` inbox with its README, acknowledgment through a logged entry, the `status` flag for unacknowledged links, and the AGENTS.md links section.
**Exit evidence:** Tests for creation, flagging and acknowledgment; a parent/child scratch pair where the child's link file arrives by merge and `status` flags it until acknowledged.
**Provisional:** yes

## Phase p06: Records-branch warning

**Intent:** Have `status` warn, judged by git ancestry, when a newer copy of the project records exists on another branch.
**Exit evidence:** Tests over a git fixture with the records branch behind, equal to and ahead of another branch.
**Provisional:** yes

## Phase p07: Lane ledger and reports

**Intent:** Add `lanes.md` and `oat project lane set` (atomic write; Active, Closed and History sections), `--report` filing into `lane-reports/`, the lane-report template, the head-ahead check, and the AGENTS.md sections for dispatch, reports and lane placement.
**Exit evidence:** Ledger tests for create, update, close, supersede, history and steer lines; an atomic-write test; head-ahead check tests; a multi-lane scratch run with one shared-worktree lane.
**Provisional:** yes

## Phase p08: m02 docs and release

**Intent:** Document linked projects, the records branch and the lane ledger; bump changed skills and the lockstep package versions.
**Exit evidence:** The full Definition of Done gate list passes; a fresh-context docs review against the code.
**Provisional:** yes

## Phase p09: Evidence fields and optional templates

**Intent:** Add structured verification evidence (tested SHA, base SHA, passed only on retry, ran vs reasoned) to a new verification entry format, plus deletable questions/decisions and acceptance-rows templates, shaped by lane reports from a real run.
**Exit evidence:** Re-planned at m03 re-alignment.
**Provisional:** yes

---

## Parallelism

Phases that have no overlapping file modifications may run concurrently. To declare parallelism:

```yaml
oat_plan_parallel_groups: [['p02', 'p03']]
```

Each inner array is a group of phases that execute in parallel (each in its own worktree) and merge back in plan order after all pass. Groups may be declared whenever the phases become concrete.

Default is `[]` (fully sequential, no worktrees).

---

## Reviews

| Scope | Type     | Status  | Date | Artifact | Reviewed Head | Invocation | Gate Target |
| ----- | -------- | ------- | ---- | -------- | ------------- | ---------- | ----------- |
| plan  | artifact | pending | -    | -        | -             | -          | -           |
| p01   | code     | pending | -    | -        | -             | -          | -           |
| p02   | code     | pending | -    | -        | -             | -          | -           |
| p03   | code     | pending | -    | -        | -             | -          | -           |
| p04   | code     | pending | -    | -        | -             | -          | -           |
| final | code     | pending | -    | -        | -             | -          | -           |

Add one `code` row per phase as phases become concrete. For code-review events,
`Reviewed Head` is the full 40-character SHA at the head of the reviewed range.
Writers must preserve every existing row and every unknown trailing cell.

**Status values:** `pending` → `received` → `fixes_added` → `fixes_completed` → `passed`

---

## Implementation Complete

**Summary:**

- Phase p01: [Description]

**Total: [N] phases**

Ready for final code review and PR preparation.

---

## References

- Journal: `implementation.md`
- Research: `references/research/`
- Project log: `project-log.md` (when enabled)
