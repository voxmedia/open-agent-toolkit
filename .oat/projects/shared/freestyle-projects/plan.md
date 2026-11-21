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

1. **A freestyle project can be created and is recognized everywhere as freestyle.** `oat project new <name> --mode freestyle` scaffolds a minimal `state.md`, the project `AGENTS.md` and deletable templates; `list`, `status`, routers and the dashboard show it as freestyle and recommend nothing; no validator, closeout or completion path treats it as spec-driven. Creation names the project `AGENTS.md` and directs the user to review and adjust it. Works in every project scope (shared, local, synced); a synced project not yet pulled into a checkout shows only the storage instruction to pull it, never a lifecycle recommendation. — Evidence: CLI and control-plane tests over a freestyle fixture for each consumer in the workflow-mode change inventory; an assertion on `oat project new --mode freestyle` output; scratch projects created and inspected with the branch build in each scope, including `oat project push` and `pull` for synced and a second checkout inspected before and after its first pull.
2. **The project log and journal work on a freestyle project without lifecycle fields.** Log commands work by path; structural entries accept an optional time of day, subject and source project (used for "merged" and other events); journal check reports how many phases it recognized, validated and skipped, with reasons, and reports rather than errors when the user deleted `plan.md` or `implementation.md`. — Evidence: log and journal-check tests over a freestyle fixture, including deleted templates; existing judgment and structural logs still parse; an append/check/synthesize run on the scratch project.
3. **A child project can be linked to its parent and the parent cannot miss it.** `--link-to <parent>` records `oat_linked_from` and adds one file to the parent's `linked-projects/`; `status` on the parent flags unacknowledged links until the orchestrator logs an acknowledgment. — Evidence: tests for creation, flagging and acknowledgment; a parent/child scratch pair where the child's file arrives by merge.
4. **`status` warns when a newer copy of the records exists on another branch.** — Evidence: tests over a git fixture with the records branch behind, equal to and ahead of another branch.
5. **Lane state survives compaction in one file written by one command.** `oat project lane set` maintains `lanes.md` (Active, Closed, History), files lane reports with `--report`, and flags a lane head ahead of its last report. — Evidence: ledger tests for create, update, close, supersede, history and the head-ahead check; atomic-write test; a multi-lane scratch run that ends with one unfinished dispatch, after which a fresh session given only the project files and forge access identifies that lane's handle, owner and next action before any redispatch.
6. **Skills and docs describe freestyle accurately.** The `oat-project-freestyle` skill, the docs pages that list modes, and the mode-aware skills name freestyle correctly. — Evidence: skill validation and contract tests; docs build; a fresh-context review of changed docs against the code.

## Approach

Freestyle is a new member of `WORKFLOW_MODES` (`packages/control-plane/src/types.ts:11-19`), normalized by the state parser (`control-plane/src/state/parser.ts:120-155`) and recognized before the spec-driven/discovery defaults (`control-plane/src/project.ts:89-95`; journal check's own default in `journal-check/evaluator.ts:34-37`). Every consumer of the mode then either handles freestyle or opts out explicitly: the recommender returns `skill: 'none'` (`recommender/router.ts`), the dashboard route maps gain a freestyle entry (`cli/src/commands/state/generate.ts:522-629`), and plan validation, closeout and complete-state skip lifecycle checks for it. The scaffold adds freestyle to `--mode` choices and to the exhaustive `TEMPLATES_BY_MODE` and `STATE_TEMPLATE_BY_MODE` maps (`project/new/scaffold.ts:124,173`), with templates resolved through the usual repository → user → bundle order.

Records commands need only `state.md` (`project/log/append.ts:1540-1551`, `check.ts:409-416`, `synthesize.ts:106-113`, `rollup.ts:139-146`), so the log works on a freestyle project once the mode is recognized. Events extend the existing structural entries (`log/grammar.ts:280-286`, `### <date> · structural · <producer> · <ref>`) with an optional time of day, subject and source project, kept sparse by convention. Journal check gains a coverage report of phases recognized, validated and skipped; today it requires `plan.md` and `implementation.md` (`journal-check/index.ts:72-88`) and recognizes only OAT phase headings (`journal-records.ts:27-35`).

Linked projects use new names so the coordination fields (`oat_parent`, `oat_children`; `validation/project-state.ts:296-350`) and the reviewer-links command (`oat project links`) keep their meaning. The lane ledger is a new `lanes.md` with one writer command; the project log keeps the role set by `DR-260718-general-purpose-project-log`.

Scope is independent of mode: `oat project new --scope shared|local|synced` and the synced push, pull, migrate and sync commands read no workflow mode (`push --refresh-pr` reads `oat_pr_*` and skips when they are absent; ref-sync reads `oat_kind` and `oat_children`). Before its first pull in a checkout, a synced project is known only by its pointer, so `list` shows no mode and recommends `oat project pull`; that storage instruction is accepted. A synced project keeps a tracked pointer (`.oat/projects/synced/<slug>.json`) on the code branch and its directory, `state.md` included, in a gitignored nested worktree published to `refs/oat/projects/<slug>`. Linked projects and the records-branch warning, which assume records ride on a git branch, decide their synced and local behavior in p05 and p06.

The project `AGENTS.md` carries the operating rules OAT does not enforce: single writer, records branch, dispatch and report contract, lane placement, links. `oat instructions sync` skips `.oat/projects` (`instructions.utils.ts:38-48`), so `status` and dispatch briefs name the file's path.

Delivery follows the repository's Workflow Mode Change Inventory: p01 enumerates every consumer before code changes, and the final review of each milestone re-checks it.

## Constraints and Out of Scope

- **Constraint:** existing modes behave exactly as before; every freestyle branch in shared code is additive and tested against an existing-mode fixture too.
- **Constraint:** OAT enforces structure and records only in freestyle: no gates, checkpoints, automatic commits, pushes, PRs or required reviews after creation. Creation is an explicit command and keeps each scope's existing behavior: shared commits the scaffold unless `--no-commit`; synced publishes its initial ref.
- **Constraint:** the repository's Definition of Done applies to each milestone PR, including skill bumps and the lockstep package version bump.
- **Constraint:** no material complexity for speculative failure modes without the operator's buy-in (AGENTS.md Feature Planning Triage).
- **Constraint:** this project never changes the Factory Platform T3 MVP records, goal state, delegates, PRs or watches; that thread is consulted read-only.
- **Out of scope:** promotion to or from freestyle.
- **Out of scope (deferred to one follow-up issue):** splitting one project between the code branch (plan, designs, review records, verification log) and synced scope (journal, ledger, project log); a ref per remote delegate; a full record system for launches made outside the orchestrator. A whole freestyle project in any single scope is in scope.
- **Out of scope:** links for other modes (BL-261120-evaluate-project-links).
- **Issue #420 mapping:** the m01 PR references #420 and the m02 PR closes it; a follow-up issue carries the deferred items above. Criteria met differently from the issue's wording: records writable during a dirty checkout → exact-path commits on the records branch (shared), the nested worktree (synced), or no commits at all (local); delegates recording their own work → per-dispatch lane reports filed verbatim by the orchestrator; journal validation accepting outside phase IDs → coverage report listing unrecognized phases as skipped with reasons; resume and reconcile launches → lane ledger handles plus the AGENTS.md reconcile-on-resume rule.

## Decisions

- **Workflow fit:** goal mode, because the outcome needs several deliveries (mode first, multi-lane records next, evidence after real use) and the first milestone was agreed in conversation. Rejected: brief (one delivery too large to review; PRs #361 and #362 were 270–297 files), spec-driven (the design settled in conversation without a separate design document).
- **Name:** `freestyle`. OAT provides structure and records only: no gates, checkpoints, automatic commits, pushes or PRs, and no required reviews. The project's `AGENTS.md` defines how it runs, and editing it is step one. Rejected: `user-defined` (describes the mechanism, not the experience).
- **state.md:** minimal: `oat_workflow_mode: freestyle` plus identity fields, no lifecycle fields, so discovery and log commands keep working. Freestyle is recognized before the spec-driven/discovery defaults. Rejected: no `state.md` (every discovery, list and log path would need another way to recognize a project).
- **Surfaces:** list, status, routers and the dashboard show freestyle and recommend nothing. Log commands work by path. Journal check reports phases recognized, validated and skipped, with reasons. Rejected: hiding freestyle projects from list and status (the orchestrator and the user still need to find them).
- **m01 scaffold:** `state.md` and the project `AGENTS.md` are required; `plan.md` (free-form) and `implementation.md` (journal) are deletable templates. p01 already ships the bare scaffold (minimal `state.md`) because the scaffold maps are exhaustive over modes; p02 adds the rest. Rejected: hiding `--mode freestyle` until p02 (temporary code for no gain; nothing is released before the m01 PR merges).
- **Event entries:** structural entries gain an optional time of day, subject and source project. Rejected: a new third entry kind (every log reader learns it; #420 asks for timestamps on structural entries).
- **Skill:** a thin `oat-project-freestyle` skill; creation and the first-step prompt live in the CLI. Rejected: CLI only (agents find workflows through skills).
- **Project AGENTS.md:** scaffolded with no CLAUDE.md pointer (Claude Code reads AGENTS.md). `status` and dispatch briefs name its path, because it sits in the project folder, not above the code.
- **Linked projects:** folder `linked-projects/` in the parent (scaffolded with a README so a new file is the signal), child field `oat_linked_from`, flag `--link-to <parent>`. The child adds one file; the parent orchestrator reads the child's records, updates its own docs and logs an acknowledgment; `status` flags unacknowledged links; AGENTS.md says to check after every merge and on resume. Coordination fields (`oat_parent`) and `oat project links` stay unchanged. Rejected: reusing `oat_parent` (a coordination parent lists children up front; links arrive by merge); `links/`, `subprojects/`, `offshoots/`, `related-projects/` (collision with `oat project links`, implied hierarchy, or too loose).
- **Records branch:** for a shared project, the orchestrator's branch is the integration branch and holds the records; a synced project's records live in its nested worktree, published with `oat project push`/`pull`; a local project's records stay uncommitted on one machine. The scaffolded AGENTS.md states the rule for the project's scope. Shared defaults: the orchestrator's checkout stays on it; side work and trial merges use other worktrees. `status` warns, judged by git ancestry, when a newer copy of the records exists on another branch. Rejected: a branch named separately in AGENTS.md (drifts from where integration actually happens, as in the factory run); split storage (deferred).
- **Single writer:** only the orchestrator writes the shared records (plan, `lanes.md`, `project-log.md`, `lane-reports/`). Delegate PRs hold code only. On resume the orchestrator reconciles its records against the forge. Rejected: shared writing with merge reconciliation (conflicts between lane PRs; stale records arrive with merges).
- **Lane ledger (`lanes.md`):** written only by `oat project lane set`; sections `## Active` (one block per open lane, rewritten in place), `## Closed` (one line per merged or superseded lane), `## History` (append-only, one line per update with an update ID). Fields: lane ID, task/run and thread handles, worktree/branch, head/base, state, next action and owner, review round and report pointer, blocker, last observed, wake source, optional configured provider/model/effort and observed model, optional `paths:` for lanes sharing a worktree. States: dispatched, running, turn finished, work settled, review accepted, merged, blocked (`waiting_on`: owner, lane, linked project or external), superseded (`replaced_by`). A lane may point to a linked child project. Holds no reasoning beyond one-line next/blocker. Rejected: history as project-log events (turns the project log mechanical, two writes with a crash window, lost when `workflow.projectLog` is off); one file per lane (resume needs N reads; revisit if `lanes.md` grows too long).
- **Ledger vs project log:** the ledger records operational facts a resuming orchestrator needs to act; the project log keeps its judgment and structural entries (`DR-260718-general-purpose-project-log`) and gets timestamped structural events only for events that matter to the project's story (including "merged", optional source project), each pointing to a ledger update ID. Rejected: one combined file (operational churn buries the judgments a later reader needs).
- **IDs:** lowercase, zero-padded, matching m01/p01: lanes `l07`, dispatches numbered per lane `d02`, reports `lane-reports/l07-d02.md`. Rejected: capitalized `L7`/`D3` (inconsistent with existing IDs); project-wide dispatch numbers (harder to read per lane).
- **Dispatch:** one request from the orchestrator that ends in one report: the initial launch and each follow-up after the lane's turn ends. A message while the lane runs (steer) amends the open dispatch and gets a ledger history line; the report notes how it was handled. Every turn end, partial ones included, gets a report; an interrupted turn closes as "no report". Wakes are notifications, not dispatches. Rejected: a dispatch only when the lane believes it is done (partial turns and blockers would leave no report).
- **Lane reports:** returned as the delegate's final message (works for remote delegates and for lanes that never merge); the orchestrator files it verbatim before acting, then runs `lane set --report <file>` (copies it into `lane-reports/` and sets the pointer in the same write), then appends accepted log entries keyed by dispatch ID. Reports are never edited. Sections: Summary (This round; Lane so far, cumulative), Delivered, Verification (tested SHA must equal the delivered head), Decisions, Deviations, Steering received, Review findings (fixed or declined with reason), Learnings, Open items, Proposed log entries. The shape is a deletable, user-editable template. Rejected: lanes writing their own record files (invisible until merge, cannot observe review/merge/supersede, unreachable for remote delegates, conflicts between lane PRs).
- **Head-ahead check:** for lanes in their own worktree, `lane set` and `status` flag a branch head past the last report's head; the orchestrator does not merge unreported commits unreviewed. Rejected: no check (the factory failure was stale state nobody noticed).
- **Lane placement:** the orchestrator decides per lane whether to use its own worktree or a subagent in the orchestrator's worktree; OAT supports both and prescribes neither. Shared-worktree lanes: placement is derived from the worktree path, attribution comes from the report's commit list, commits use exact paths, the orchestrator verifies the combined head, and the head-ahead check does not apply. AGENTS.md documents the rules per placement. Rejected: requiring a worktree per lane (the operator leaves placement to the orchestrator).
- **Milestones:** m01 freestyle mode, m02 multi-lane records, m03 evidence (provisional, re-planned after m02 is used in a real run). Each milestone ships as its own PR. m02 starts right after m01 merges; real use is re-alignment input, not a gate. Rejected: one milestone for m01 and m02 (a PR the size of #361/#362, and later real use).
- **Gates:** the configured `oat-project-goal` and `oat-project-implement` lifecycle gates are disabled for this project (`oat_skill_gate_overrides`), because gate targets for GPT 6.2 Astra are not configured yet. The agent runs the equivalent reviews by hand on GPT 6.2 Astra high: the brief and each amendment before approval, a code review before each milestone's exit and integrated review, and one at terminal closeout. Each is recorded as a `## Reviews` row and a line under `implementation.md` `## Reviews and Gates` naming the model, effort and reviewed head, because the `project_disabled` carriers hold no reviewed head. Phase gate review is disabled; built-in phase reviews still run. Rejected: keeping the configured gate targets (not the operator's chosen reviewer model).

## Known Unknowns

- The full list of mode consumers, including the 27 skill files that mention `oat_workflow_mode` and about 17 docs pages that list modes — Settled by: p01 (inventory)
- How a freestyle project completes and archives, in each scope (`complete-state/index.ts:90-130`, `closeout-invariant.ts:1246-1290`; synced projects move to `refs/oat/completed/*`, `shared/project-scope.ts:25`) — Settled by: p01
- Timestamp format for event entries, given date-only UTC log headings (`append.ts:1400`) — Settled by: p03
- Whether `rollup` supports freestyle without `summary.md` or refuses with a clear message (`rollup.ts:612-616`) — Settled by: p03
- Whether `--link-to` takes a name or a path, and how a parent in another scope resolves — Settled by: p05
- How a link reaches a synced or local parent. Current lean for synced: a tracked link file beside the parent's pointer JSON, arriving by merge as for shared (rejected so far: writing into the parent's synced ref, which adds a second writer). Local: the child writes into the parent's folder directly — Settled by: p05
- How events are recorded when `workflow.projectLog` is false (`log/append.ts:1748-1749` skips appends) — Settled by: p03
- How links are acknowledged when `workflow.projectLog` is false — Settled by: p05
- Which branches the records-branch check compares (local, remote-tracking, other worktrees), its cost on `status`, and what it means for synced and local projects — Settled by: p06
- The parseable block format inside `lanes.md`, and whether existing `oat project dispatch record` IDs can serve as dispatch IDs — Settled by: p07

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

**Intent:** Enumerate every consumer in the Workflow Mode Change Inventory and record it in `implementation.md`; add `freestyle` to `WORKFLOW_MODES`; recognize it before the spec-driven/discovery defaults (control-plane and journal check); add the bare scaffold (freestyle entries in `TEMPLATES_BY_MODE` and `STATE_TEMPLATE_BY_MODE` with a minimal non-lifecycle state template), so `oat project new --mode freestyle` works; make list, status, routers and the dashboard show it and recommend nothing; make plan validation, closeout, complete-state and archive handle it without lifecycle checks.
**Exit evidence:** The inventory table in `implementation.md`, each row marked handled, opted out, or owned by a later phase (p02–p04) with its expected proof; tests over a freestyle fixture for each consumer p01 handles, plus an existing-mode fixture on every changed path; a bare freestyle project created with the branch build passes `oat project check-state` and shows as freestyle in `list` and `status`; `pnpm check`, `pnpm type-check`, `pnpm test` pass.
**Provisional:** no

## Phase p02: Scaffold, templates, project AGENTS.md and skill

**Intent:** Extend the bare freestyle scaffold with the deletable `plan.md` (free-form) and `implementation.md` (journal) templates; scaffold the project `AGENTS.md` (how the project runs, single writer, where records live for the project's scope, editing it as step one); have `oat project new` direct the user to review and adjust it, and `status` name its path; add the thin `oat-project-freestyle` skill that creates the project, walks the user through the `AGENTS.md`, and on resume points at the records.
**Exit evidence:** Scaffold tests (bundle tier under an isolated `HOME`) in each scope, asserting the AGENTS.md records text matches the scope and that `new` output names the AGENTS.md and directs the user to review it; skill validation and contract tests; scratch projects created with the branch build in shared, local and synced scope (synced pushed and pulled, and a second checkout inspected before and after its first pull) and inspected with `status`.
**Provisional:** no

## Phase p03: Records commands

**Intent:** Make the log commands work by path on a freestyle project; give structural entries an optional time of day, subject and source project (for "merged" and other events); give journal check a coverage report of phases recognized, validated and skipped, with reasons, that reports rather than errors when `plan.md` or `implementation.md` was deleted.
**Exit evidence:** Log append/check/synthesize tests and journal-check tests over a freestyle fixture, including deleted templates; existing judgment and structural logs still parse; an append/check/synthesize run on the scratch project.
**Provisional:** no

## Phase p04: m01 docs and release

**Intent:** Update the docs pages, mode-aware skills, agent contracts (`.agents/agents/oat-reviewer.md`, `oat-phase-implementer.md`, with `version:` bumps), bundled templates, the CLI and package READMEs, and help text; refresh provider views with the branch build's `sync`; bump changed skills and the lockstep package versions.
**Exit evidence:** Every p01 inventory entry is closed; the full Definition of Done gate list passes, including `check:skill-bumps`, `release:check-versions`, `release:validate`, `build:docs` and docs-index freshness; a fresh-context docs review against the code.
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
**Exit evidence:** Ledger tests for create, update, close, supersede, history and steer lines; an atomic-write test; head-ahead check tests; a multi-lane scratch run with one shared-worktree lane that ends with one unfinished dispatch, after which a fresh session given only the project files and forge access identifies that lane's handle, owner and next action before any redispatch.
**Provisional:** yes

## Phase p08: m02 docs and release

**Intent:** Document linked projects, the records branch and the lane ledger; bump changed skills and the lockstep package versions; file the follow-up issue for the deferred #420 items.
**Exit evidence:** The full Definition of Done gate list passes; a fresh-context docs review against the code; the follow-up issue is filed and linked from #420 and the m02 PR before the PR merges.
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
