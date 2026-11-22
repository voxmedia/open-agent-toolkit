---
oat_template: false
oat_status: complete
oat_ready_for: oat-project-implement
oat_blockers: []
oat_last_updated: 2026-11-21
oat_phase: plan
oat_phase_status: complete
oat_plan_hill_phases: [] # [] = none for brief modes
oat_plan_parallel_groups: [] # groups of phases that run concurrently in worktrees; [] = fully sequential
oat_auto_review_at_hill_checkpoints: false # brief: no checkpoints
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

1. **A freestyle project can be created and is recognized everywhere as freestyle.** `oat project new <name> --mode freestyle` scaffolds a minimal `state.md`, the project `AGENTS.md` (fixed rules) and `shape.md` (how the project runs, every section marked not yet shaped), and no document templates; `list`, `status`, routers and the dashboard show it as freestyle and recommend nothing; no validator, closeout or completion path treats it as spec-driven. Creation names `AGENTS.md` and `shape.md` and directs the user to shape the project with `oat-project-freestyle`. Works in every project scope (shared, local, synced); a synced project not yet pulled into a checkout shows only the storage instruction to pull it, never a lifecycle recommendation. — Evidence: CLI and control-plane tests over a freestyle fixture for each consumer in the workflow-mode change inventory; an assertion on `oat project new --mode freestyle` output; scratch projects created and inspected with the branch build in each scope, including `oat project push` and `pull` for synced and a second checkout inspected before and after its first pull.
2. **The project log and journal work on a freestyle project without lifecycle fields.** Log commands work by path; structural entries accept an optional time of day, subject and source project (used for "merged" and other events); journal check reports how many phases it recognized, validated and skipped, with reasons, and reports rather than errors when the project has no `plan.md` or `implementation.md`. — Evidence: log and journal-check tests over freestyle fixtures with both files, neither, plan only and journal only, asserting which input was missing, the coverage counts and a successful exit; existing judgment and structural logs still parse; an append/check/synthesize run on the scratch project.
3. **A child project can be linked to its parent and the parent cannot miss it.** `--link-to <parent>` records `oat_linked_from` and adds one file to the parent's `linked-projects/`; `status` on the parent flags unacknowledged links until the orchestrator logs an acknowledgment. — Evidence: tests for creation, flagging and acknowledgment; a parent/child scratch pair where the child's file arrives by merge.
4. **`status` warns when a newer copy of the records exists on another branch.** — Evidence: tests over a git fixture with the records branch behind, equal to and ahead of another branch.
5. **Lane state survives compaction in one file written by one command.** `oat project lane set` maintains `lanes.md` (Active, Closed, History), files lane reports with `--report`, and flags a lane head ahead of its last report. — Evidence: ledger tests for create, update, close, supersede, history and the head-ahead check; atomic-write test; a multi-lane scratch run that ends with one unfinished dispatch, after which a fresh session given only the project files and forge access identifies that lane's handle, owner and next action before any redispatch.
6. **A freestyle project is shaped with the user, and stays reshapable.** The `oat-project-freestyle` skill creates the project and runs the shaping conversation from its kickoff reference, writing each answer into `shape.md` as it is given; on resume it returns to the first section not yet shaped and checks undecided items and reshape checkpoints; its reshape reference guides later changes. — Evidence: skill validation and contract tests pinning the `AGENTS.md` and `shape.md` section headings; a shaping run on a scratch project that detours through `oat-brainstorm` before commits are shaped and returns to `oat-project-freestyle` by its handoff, with no commit or push made; a fresh session given the partly shaped project (one section answered, the detour recorded) resumes at the first unshaped section without redoing answered ones; the same project then reshaped once (an `## Undecided` item come due or a review mechanism changed), with only the affected section edited, the review intent kept, `Last shaped:` updated, the effective point stated and the `decision` append attempted.
7. **Skills and docs describe freestyle accurately.** The `oat-project-freestyle` skill, the docs pages that list modes, and the mode-aware skills name freestyle correctly. — Evidence: skill validation and contract tests; docs build; a fresh-context review of changed docs against the code.

## Approach

Freestyle is a new member of `WORKFLOW_MODES` (`packages/control-plane/src/types.ts:11-19`), normalized by the state parser (`control-plane/src/state/parser.ts:120-155`) and recognized before the spec-driven/discovery defaults (`control-plane/src/project.ts:89-95`; journal check's own default in `journal-check/evaluator.ts:34-37`). Every consumer of the mode then either handles freestyle or opts out explicitly: the recommender returns `skill: 'none'` (`recommender/router.ts`), the dashboard route maps gain a freestyle entry (`cli/src/commands/state/generate.ts:522-629`), and plan validation, closeout and complete-state skip lifecycle checks for it. The scaffold adds freestyle to `--mode` choices and to the exhaustive `TEMPLATES_BY_MODE` and `STATE_TEMPLATE_BY_MODE` maps (`project/new/scaffold.ts:124,173`), with templates resolved through the usual repository → user → bundle order.

Records commands need only `state.md` (`project/log/append.ts:1540-1551`, `check.ts:409-416`, `synthesize.ts:106-113`, `rollup.ts:139-146`), so the log works on a freestyle project once the mode is recognized. Events extend the existing structural entries (`log/grammar.ts:280-286`, `### <date> · structural · <producer> · <ref>`) with an optional time of day, subject and source project, kept sparse by convention. Journal check gains a coverage report of phases recognized, validated and skipped; today it requires `plan.md` and `implementation.md` (`journal-check/index.ts:72-88`) and recognizes only OAT phase headings (`journal-records.ts:27-35`).

Linked projects use new names so the coordination fields (`oat_parent`, `oat_children`; `validation/project-state.ts:296-350`) and the reviewer-links command (`oat project links`) keep their meaning. The lane ledger is a new `lanes.md` with one writer command; the project log keeps the role set by `DR-260718-general-purpose-project-log`.

Scope is independent of mode: `oat project new --scope shared|local|synced` and the synced push, pull, migrate and sync commands read no workflow mode (`push --refresh-pr` reads `oat_pr_*` and skips when they are absent; ref-sync reads `oat_kind` and `oat_children`). Before its first pull in a checkout, a synced project is known only by its pointer, so `list` shows no mode and recommends `oat project pull`; that storage instruction is accepted. A synced project keeps a tracked pointer (`.oat/projects/synced/<slug>.json`) on the code branch and its directory, `state.md` included, in a gitignored nested worktree published to `refs/oat/projects/<slug>`. Linked projects and the records-branch warning, which assume records ride on a git branch, decide their synced and local behavior in p05 and p06.

Two project files carry what OAT does not enforce. The project `AGENTS.md` is OAT-owned and holds the fixed rules: read `shape.md` first, single writer, where records live in each scope, the records commands, and later the dispatch, report, lane-placement and links rules. `shape.md` is owned by the orchestrator and the user and holds the current operating shape agreed in the shaping conversation. Splitting by file keeps user answers out of the file OAT later extends, and makes `shape.md`'s history the history of how the project ran. `oat instructions sync` skips `.oat/projects` (`instructions.utils.ts:38-48`), so `status` and dispatch briefs name both paths.

Documents reuse OAT's existing templates instead of new ones: `oat template resolve <name> --output <path>` already copies a template from the repository, user or bundle tier, raw and replacing the target (`template/resolve.ts:63-70`, `template/index.ts:92-99`); names share one namespace (`resolve.ts:11-25`).

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
- **Name:** `freestyle`. OAT provides structure and records only: no gates, checkpoints, automatic commits, pushes or PRs, and no required reviews. The project's `shape.md`, agreed with the user in a shaping conversation, defines how it runs; shaping is step one. Rejected: `user-defined` (describes the mechanism, not the experience).
- **state.md:** minimal: `oat_workflow_mode: freestyle` plus identity fields, no lifecycle fields, so discovery and log commands keep working. Freestyle is recognized before the spec-driven/discovery defaults. Rejected: no `state.md` (every discovery, list and log path would need another way to recognize a project).
- **Surfaces:** list, status, routers and the dashboard show freestyle and recommend nothing. Log commands work by path. Journal check reports phases recognized, validated and skipped, with reasons. Rejected: hiding freestyle projects from list and status (the orchestrator and the user still need to find them).
- **m01 scaffold:** `state.md`, the project `AGENTS.md` and `shape.md`, and no document templates; documents are chosen during shaping. p01 already ships the bare scaffold (minimal `state.md`) because the scaffold maps are exhaustive over modes; p02 adds `AGENTS.md` and `shape.md`. Rejected: hiding `--mode freestyle` until p02 (temporary code for no gain; nothing is released before the m01 PR merges); scaffolding `plan.md` and `implementation.md` by default (files a project may not want, left for the user to delete).
- **Documents:** no freestyle-specific document templates. The kickoff reference lists OAT's existing templates as starting points: the brief plan (`plan-brief.md`; goal mode adds a Milestones table to it), `plan-lite.md`, the spec-driven set (`discovery.md`, `spec.md`, `design.md`, `plan.md`) and the journals (`implementation.md`, `implementation-brief.md`), plus core elements worth keeping in any pattern (outcome, done criteria, decisions, open questions). The agent reviews them and recommends using one as is, adapting one, or its own pattern, usually leaning to the brief or goal style, and agrees it with the user. It copies a template with `oat template resolve --output` only when the target does not exist, then drops the `oat_*` lifecycle frontmatter, fills the placeholders and removes or adapts body instructions that conflict with the agreed shape (for example `plan-brief.md:21` directs execution through `oat-project-implement`, `implementation-brief.md:25` maintains `oat_current_task_id`), because the copy is raw. `shape.md` lists the documents the project uses. Apart from the scaffold templates (state, `AGENTS.md`, `shape.md`), the one other freestyle-specific template is the lane-report shape (p07), because it is a dispatch contract rather than a project document. Rejected: freestyle-specific document templates with a `--templates` flag or `template add` command (templates already ship and resolve; adding one only copies a file, which `oat template resolve --output` does).
- **Event entries:** structural entries gain an optional time of day, subject and source project. Rejected: a new third entry kind (every log reader learns it; #420 asks for timestamps on structural entries).
- **Skill:** `oat-project-freestyle` starts the project, as `oat-project-quick-start` and `oat-project-brief` do, and owns the shaping conversation. It has two references: a kickoff reference (the shaping topics, document starting points and the reviews discovery rule), loaded for a new or partly shaped project, and a reshape reference, loaded when a reshape is due. On resume the skill reads `AGENTS.md` and `shape.md`, returns to the first section not yet shaped, and checks `## Undecided` items and reshape checkpoints. The CLI only scaffolds and names the files; it never parses `shape.md`. Planning-triage note: this widens p02 from small to medium (two skill references, two scaffold templates, contract tests; no new CLI command). Incident: the factory run agreed its operating rules ad hoc in conversation and lost them across compaction, and recorded reviews inconsistently; this project's own missing reviewer pins show a review plan tied to one host. Rejected: a thin skill with the prompt in the CLI (the shaping conversation is agent work); a fixed scripted interview (the operator wants it flexible and proportionate to project size).
- **Shaping topics:** in order, each answerable or deferred with "decide later": (1) goal: outcome, what done means and how large the project is, which sets how much of the rest is worth asking; (2) brainstorm or discovery first, optional (`oat-brainstorm`, or an informal discovery pass in conversation, since `oat-project-discover` requires a spec-driven project); for a freestyle project `oat-brainstorm` captures the result as a brainstorming reference file (its branch 9j), follows the commit choices in `shape.md` (while that section is not yet shaped or is deferred to `## Undecided`, it writes the file without committing or pushing and tells the user where it is), and hands back to `oat-project-freestyle`, since its fold-back today picks `discovery.md` and its handoff table has no freestyle row (`oat-brainstorm/SKILL.md:625,769`); (3) documents; (4) execution: single agent or orchestrator with lanes, lane placement left to the orchestrator; (5) reviews; (6) commits, PRs and merges: who commits, when PRs open, who merges; (7) user involvement: what the user approves or is told; (8) reshape checkpoints. What goes in the project log is a default paragraph in `shape.md`, not a question. Scope is chosen at creation (`--scope`), not shaped. Rejected: four merged beats (the operator prefers the explicit questions); a log-content question (a default suffices).
- **Shaping guard:** `shape.md` is scaffolded with one section per topic marked not yet shaped, plus `## Undecided` and a `Last shaped:` line, so the file is the checklist and survives a detour or compaction. The agent writes each answer as it is given. A brainstorm or discovery pass is offered only after the goal is written, and before handing off the agent records in `shape.md` that shaping resumes at the next unshaped section. Shaping is complete when every section is answered or deferred to `## Undecided` with the moment it becomes due (for example "before the first PR"). Rejected: keeping progress in conversation (a brainstorm or compaction loses the remaining questions).
- **Reviews:** asked as _when_ first, then _who and how_. When options: after planning or design documents are written or revised, whatever the project calls them; after implementation (per phase, per lane, per feature, or the orchestrator's judgement); before merging into the integration branch. Who and how: the agent offers only what it can observe this session, from the host app's own tools, agent instruction files (user, repo and project `AGENTS.md`/`CLAUDE.md`) that carry delegation guidance, and orchestration or delegation skills in project or user scope, then takes options the user names, recording each with its source; a user-named option is unverified until first use. `shape.md` records each review as intent (when, the independence required such as a different model family, effort) and mechanism (tool or skill, host, source, date verified). When a review is due the agent re-checks the mechanism; if it is unavailable it keeps the intent, tells the user and logs it. Reviews never block, since freestyle has no required reviews. Rejected: a fixed reviewer list (hosts and installed tools differ); failing closed like lifecycle gates (freestyle has no gates).
- **Reshaping:** first-class and guidance only. Triggers: the checkpoints in `shape.md`, a user request, a change of host or execution shape, an agreement that stops working (a reviewer unavailable, a rule bypassed repeatedly), and an undecided item coming due. A reshape edits the affected `shape.md` sections, updates `Last shaped:`, states when the change takes effect for open lanes, and always attempts a `decision` log entry with what changed and why, accepting a `skipped` result; `shape.md` must stand alone because log appends can be skipped. `AGENTS.md` points to the skill's reshape reference. Rejected: a reshape command or a `status` "reshape due" flag (no incident behind it yet; Feature Planning Triage).
- **Project AGENTS.md:** OAT-owned fixed rules; agents do not edit it, and only OAT-supplied content changes it. Its first line says to read `shape.md` before acting. It states the records rule for every scope and tells the agent to resolve the current one with `oat project scope`, because shared-to-synced migration copies the project folder unchanged (`project/sync/ref-sync.ts:2209-2212`). Scaffolded with no CLAUDE.md pointer (Claude Code reads AGENTS.md). `status` and dispatch briefs name its path and `shape.md`'s, because both sit in the project folder, not above the code. Rejected: one file with editable and fixed sections (agents ignore section markers, and later OAT additions would collide with user answers).
- **Linked projects:** folder `linked-projects/` in the parent (scaffolded with a README so a new file is the signal), child field `oat_linked_from`, flag `--link-to <parent>`. The child adds one file; the parent orchestrator reads the child's records, updates its own docs and logs an acknowledgment; `status` flags unacknowledged links; AGENTS.md says to check after every merge and on resume. Coordination fields (`oat_parent`) and `oat project links` stay unchanged. Rejected: reusing `oat_parent` (a coordination parent lists children up front; links arrive by merge); `links/`, `subprojects/`, `offshoots/`, `related-projects/` (collision with `oat project links`, implied hierarchy, or too loose).
- **Records branch:** for a shared project, the orchestrator's branch is the integration branch and holds the records; a synced project's records live in its nested worktree, published with `oat project push`/`pull`; a local project's records stay uncommitted on one machine. The scaffolded AGENTS.md states the rule for every scope and directs the agent to resolve the current one with `oat project scope`. Shared defaults: the orchestrator's checkout stays on it; side work and trial merges use other worktrees. `status` warns, judged by git ancestry, when a newer copy of the records exists on another branch. Rejected: a branch named separately in AGENTS.md (drifts from where integration actually happens, as in the factory run); split storage (deferred).
- **Single writer:** only the orchestrator writes the shared records (`shape.md`, the project's documents, `lanes.md`, `project-log.md`, `lane-reports/`). Delegate PRs hold code only. On resume the orchestrator reconciles its records against the forge. Rejected: shared writing with merge reconciliation (conflicts between lane PRs; stale records arrive with merges).
- **Lane ledger (`lanes.md`):** written only by `oat project lane set`; sections `## Active` (one block per open lane, rewritten in place), `## Closed` (one line per merged or superseded lane), `## History` (append-only, one line per update with an update ID). Fields: lane ID, task/run and thread handles, worktree/branch, head/base, state, next action and owner, review round and report pointer, blocker, last observed, wake source, optional configured provider/model/effort and observed model, optional `paths:` for lanes sharing a worktree. States: dispatched, running, turn finished, work settled, review accepted, merged, blocked (`waiting_on`: owner, lane, linked project or external), superseded (`replaced_by`). A lane may point to a linked child project. Holds no reasoning beyond one-line next/blocker. Rejected: history as project-log events (turns the project log mechanical, two writes with a crash window, lost when `workflow.projectLog` is off); one file per lane (resume needs N reads; revisit if `lanes.md` grows too long).
- **Ledger vs project log:** the ledger records operational facts a resuming orchestrator needs to act; the project log keeps its judgment and structural entries (`DR-260718-general-purpose-project-log`) and gets timestamped structural events only for events that matter to the project's story (including "merged", optional source project), each pointing to a ledger update ID. Rejected: one combined file (operational churn buries the judgments a later reader needs).
- **IDs:** lowercase, zero-padded, matching m01/p01: lanes `l07`, dispatches numbered per lane `d02`, reports `lane-reports/l07-d02.md`. Rejected: capitalized `L7`/`D3` (inconsistent with existing IDs); project-wide dispatch numbers (harder to read per lane).
- **Dispatch:** one request from the orchestrator that ends in one report: the initial launch and each follow-up after the lane's turn ends. A message while the lane runs (steer) amends the open dispatch and gets a ledger history line; the report notes how it was handled. Every turn end, partial ones included, gets a report; an interrupted turn closes as "no report". Wakes are notifications, not dispatches. Rejected: a dispatch only when the lane believes it is done (partial turns and blockers would leave no report).
- **Lane reports:** returned as the delegate's final message (works for remote delegates and for lanes that never merge); the orchestrator files it verbatim before acting, then runs `lane set --report <file>` (copies it into `lane-reports/` and sets the pointer in the same write), then appends accepted log entries keyed by dispatch ID. Reports are never edited. Sections: Summary (This round; Lane so far, cumulative), Delivered, Verification (tested SHA must equal the delivered head), Decisions, Deviations, Steering received, Review findings (fixed or declined with reason), Learnings, Open items, Proposed log entries. The shape ships as the bundled `lane-report.md` template; the orchestrator copies it with `oat template resolve lane-report --output <path>` and embeds it in each dispatch brief (the resolver returns no path for the bundle tier, `template/resolve.ts:113-125`); a `lane-report.md` in the repository's `.oat/templates/` or the user's `~/.oat/templates/` overrides it. Rejected: lanes writing their own record files (invisible until merge, cannot observe review/merge/supersede, unreachable for remote delegates, conflicts between lane PRs).
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
- How events are recorded when `workflow.projectLog` is false and `project-log.md` is absent (`log/append.ts:1741-1749` skips appends only then) — Settled by: p03
- How links are acknowledged when `workflow.projectLog` is false and `project-log.md` is absent — Settled by: p05
- How an existing project's `AGENTS.md` picks up rules a later milestone adds (the links and lane sections): re-rendering the OAT-owned file from the bundled template, by the CLI or by the skill applying OAT-supplied sections, keyed on the headings p02 pins — Settled by: p05
- Which branches the records-branch check compares (local, remote-tracking, other worktrees), its cost on `status`, and what it means for synced and local projects — Settled by: p06
- The parseable block format inside `lanes.md`, and whether existing `oat project dispatch record` IDs can serve as dispatch IDs — Settled by: p07

## Delivery endpoint and authority

- **Endpoint:** merged — a milestone is delivered when its PR is merged into `main`.
- **Authority:** the operator approves the brief, each milestone's re-alignment and each delivery's merge. The agent decides alone on phase-internal implementation choices and on dispatching review and fix rounds. Anything that adds scope or a new guarantee goes to the operator first (AGENTS.md Feature Planning Triage; bookkeeping-findings `new-hardening`).
- **Brief approved:** 2026-11-21 by user at 4c6881ac5e2c5a431f6e7d479cf0122ab750e8b7

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

## Phase p02: Project AGENTS.md, shape.md and the shaping skill

**Intent:** Extend the bare freestyle scaffold with the OAT-owned project `AGENTS.md` (read `shape.md` first, single writer, where records live in each scope, resolved with `oat project scope`, the records commands, a pointer to the reshape reference) and `shape.md` (one section per shaping topic marked not yet shaped, a default project-log paragraph, `## Undecided`, `Last shaped:`); have `oat project new` name both files and direct the user to `oat-project-freestyle`, and `status` name both paths; add the `oat-project-freestyle` skill with its kickoff reference (shaping topics, shaping guard, document starting points and adaptation rules, reviews discovery rule) and reshape reference; give `oat-brainstorm` its freestyle route (reference file, commit choices from `shape.md` and no commit or push while they are unshaped or deferred, handoff to `oat-project-freestyle`).
**Exit evidence:** Scaffold tests (bundle tier under an isolated `HOME`) in each scope, asserting the AGENTS.md records text covers every scope and names `oat project scope`, `shape.md` carries every topic section unshaped, and `new` output names both files; skill validation and contract tests pinning the `AGENTS.md` and `shape.md` section headings; a test that every template the kickoff reference names resolves in the bundle; scratch projects created with the branch build in shared, local and synced scope (synced pushed and pulled, and a second checkout inspected before and after its first pull) and inspected with `status`; a shared project migrated to synced keeps its authored `shape.md` and its guidance still holds; one document adapted from `plan-brief.md` inspected for leftover lifecycle instructions; the Outcome 6 shaping, detour, resume and reshape run.
**Provisional:** no

## Phase p03: Records commands

**Intent:** Make the log commands work by path on a freestyle project; give structural entries an optional time of day, subject and source project (for "merged" and other events); give journal check a coverage report of phases recognized, validated and skipped, with reasons, that reports rather than errors when the project has no `plan.md` or `implementation.md`.
**Exit evidence:** Log append/check/synthesize tests and journal-check tests over freestyle fixtures with both files, neither, plan only and journal only, asserting which input was missing, the coverage counts and a successful exit; existing judgment and structural logs still parse; an append/check/synthesize run on the scratch project.
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

**Intent:** Add `lanes.md` and `oat project lane set` (atomic write; Active, Closed and History sections), `--report` filing into `lane-reports/`, the bundled `lane-report.md` template, the head-ahead check, and the AGENTS.md sections for dispatch, reports and lane placement.
**Exit evidence:** Ledger tests for create, update, close, supersede, history and steer lines; an atomic-write test; head-ahead check tests; a dispatch brief built under an isolated `HOME` with only the bundled `lane-report.md` carries the report shape; a multi-lane scratch run with one shared-worktree lane that ends with one unfinished dispatch, after which a fresh session given only the project files and forge access identifies that lane's handle, owner and next action before any redispatch.
**Provisional:** yes

## Phase p08: m02 docs and release

**Intent:** Document linked projects, the records branch and the lane ledger; bump changed skills and the lockstep package versions; file the follow-up issue for the deferred #420 items.
**Exit evidence:** The full Definition of Done gate list passes; a fresh-context docs review against the code; the follow-up issue is filed and linked from #420 and the m02 PR before the PR merges.
**Provisional:** yes

## Phase p09: Evidence fields

**Intent:** Add structured verification evidence (tested SHA, base SHA, passed only on retry, ran vs reasoned) to a new verification entry format, shaped by lane reports from a real run.
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

| Scope | Type     | Status   | Date       | Artifact                                    | Reviewed Head                            | Invocation | Gate Target |
| ----- | -------- | -------- | ---------- | ------------------------------------------- | ---------------------------------------- | ---------- | ----------- |
| plan  | artifact | passed   | 2026-11-21 | -                                           | 987d479b798cbc2b2b28df9a3b414d3262cea1df | auto       | -           |
| plan  | artifact | passed   | 2026-11-21 | -                                           | 987d479b798cbc2b2b28df9a3b414d3262cea1df | manual     | -           |
| p01   | code     | passed   | 2026-11-21 | p01-code-review-2026-11-21T204635Z.md       | 8220a9dab90b0c1e7bd2d5f56994c0128fcd7862 | auto       | -           |
| p02   | code     | passed   | 2026-11-21 | p02-code-review-2026-11-21T225453Z.md       | 539e419e891bdbacf1993cb88e4ce23444eaba32 | auto       | -           |
| p03   | code     | passed   | 2026-11-21 | p03-code-review-2026-11-21T233055Z.md       | 9b3b265b1ac4e5e6f7c41ed0180cfd03ba8eaeb1 | auto       | -           |
| p04   | code     | passed   | 2026-11-22 | p04-code-review-2026-11-22T021641Z.md       | 1af188b5c2aadaf47b1fa54ef90fc22510a2f970 | auto       | -           |
| final | code     | pending  | -          | -                                           | -                                        | -          | -           |
| m01   | code     | received | 2026-11-22 | m01-integrated-review-2026-11-22T134403Z.md | 6d97810c30cc24cf9fe96e4f189866b0f80a64b1 | manual     | -           |

**Plan artifact review (auto, Claude Opus 5.5 high):** brief rounds at `dc3d90918` (clean after two retries); amendment rounds at `ec7dd284f`, `9b16c94d6` and `987d479b7` (retry bound 2 reached; final retry's one low finding folded at receive without changing intent).

**Plan artifact review (manual, GPT 6.2 Astra high, per the Gates decision):** brief rounds at `dc3d90918` (0 blocking); amendment rounds at `ec7dd284f`, `9b16c94d6` and `987d479b7` (0 blocking, all findings resolved).

**m01 exit review (manual, GPT 6.2 Astra high, per the Gates decision; substitute for the project-disabled implement exit gate):** code review of m01 (p01, p02, p03, p04) in six rounds: `a5c28dca2..7c35a902e` (4 high, 7 medium), then fix ranges ending `86048bad1`, `749557100`, `686d424bc`, `4a3b2be5c` (fixes required each round), and `4a3b2be5c..c14f3517e` passed with 0 findings. Reviewed head `c14f3517e3d2a925204093b359c6c330b6d1742f`. Recorded here, not as an `m01 | code` table row, because `oat project delivery check` takes the latest `m01` code row as the integrated review (`delivery/check.ts:365`, `delivery/evidence.ts:1697`); the integrated review still comes from `oat-project-review-provide`.

**Finding classes:** final Opus retry at `987d479b7`: L1 accepted-requirement (Shaping guard decision: a deferred section counts as shaped). Earlier amendment rounds: every finding accepted-requirement (brief contract sections 1 and 12.9; Shaping topics, Shaping guard, Reshaping, Records branch and Lane reports decisions; Constraint: no automatic commits) or regression (brief internal consistency after the amendment); none bookkeeping or new-hardening.

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
