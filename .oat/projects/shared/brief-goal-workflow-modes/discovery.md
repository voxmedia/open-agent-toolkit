---
oat_status: complete
oat_ready_for: oat-project-quick-start
oat_blockers: []
oat_last_updated: 2026-10-11
oat_generated: false
oat_template: false
---

# Discovery: brief-goal-workflow-modes

## Phase Guardrails (Discovery)

Discovery is for requirements and decisions, not implementation details.

- Prefer outcomes and constraints over concrete deliverables.
- Implementation details surfaced here are captured as open questions or constraints for design.

## Initial Request

Add two OAT workflow modes that replace heavy planning artifacts with a
rigorous alignment interview ending in one approved brief, while keeping the
durable records (project log, implementation journal, retro, summary,
post-implementation flows, gates, self-review guidance), freeform phases, and
an execution model where the root agent fans out subagents, spawns a fresh
reviewer per phase, keeps plan-declared parallel phases, and uses dynamic task
records for recovery:

- **`brief`**: one delivery, one approved brief, phases without required tasks.
- **`goal`**: a multi-milestone greenfield starter that cycles align →
  implement → integrated review → deliver → re-align until the user declares
  the goal met.

The design was brainstormed over seven rounds between Claude and Astra
(gpt-6-astra) and settled with Thomas on 2026-10-10. The full record is
`.oat/repo/analysis/freestyle-brainstorm/consensus-proposal.md` (machine-local
scratch, contracts F1–F9, G2–G3, F12–F13, clarifications C1–C6, decisions
T1–T9) and `design-overview.html` beside it. This discovery condenses that
record; the proposal remains the detailed source until the design and plan
supersede it.

Request classification: **well-understood**. Requirements and approach were
settled before this project was scaffolded; discovery is synthesized from the
session rather than interviewed.

## Clarifying Questions

Decisions Thomas made after the proposal converged (2026-10-10).

### Question 1: Task model

**Q:** Must execution carry a task plan?
**A:** No. Tasks are execution records opened when work starts and closed at
the implementation commit; lightweight lookahead is allowed. A request for a
formal up-front task plan triggers an offer to promote to quick.
**Decision:** F13 as written; promotion offered, never automatic.

### Question 2: Phase flexibility

**Q:** May the agent add, split or reorder phases without re-approval?
**A:** Yes, within approved outcomes, constraints, authority and evidence,
logging the change. Reversing a brief Decision or departing from the agreed
Approach triggers a focused realignment.
**Decision:** F4 plus the C4 trigger amendment.

### Question 3: Retro

**Q:** Prompt for retro or follow configuration?
**A:** Follow `workflow.postImplementSequence`; no mode-specific prompt.

### Question 4: Brief filename

**Q:** `plan.md` or a new filename?
**A:** `plan.md` titled "Project Brief", new `plan-brief` template with the
existing plan frontmatter so every consumer that keys on `plan.md` keeps working.

### Question 5: Interview shape

**Q:** Readiness rounds or strictly one question at a time?
**A:** Readiness rounds with recommendations and tradeoffs. Readiness is
overall design alignment, never a round count.

### Question 6: Mode name for the multi-milestone mode

**Q:** Accept `goal` despite host-native goal controls?
**A:** Yes. Entry through `oat-project-goal`; OAT never activates Codex
`create_goal` or `pursuing-goals`; no bare `/goal` surface.

### Question 7: Release and project shape

**Q:** One release or two; one project or two?
**A:** Brief ships first (v1), goal second (v1.5). One quick-mode OAT project
with staged delivery: brief phases ship through `oat-project-pr-progress`,
goal phases follow, the final PR closes the project.

### Question 8: Brief review ladder

**Q:** Does the brief get independent review before implementation?
**A:** Yes: brief committed → independent artifact review (reviewer gets the
brief, not the session) → configured plan gate (reruns capped at 2–3) → one
user approval of the reviewed brief → implementation. The earlier
"approval replaces review" sentence is withdrawn.

### Question 9: Mode or quick profile

**Q:** Is the single-delivery mode a workflow mode or a planning profile of
quick?
**A:** A mode in the goal family. Progress, template, resume and summary
semantics are mode-keyed today, the recommender needs a name, and the family
exists for goal regardless.

### Question 10: Name of the single-delivery mode

**Q:** Is `freestyle` the right name?
**A:** No. `brief`, after Astra's review. `adaptive` was rejected because
quick-start already uses "adaptive depth". `brief` follows the spec-driven
precedent of naming a mode after its artifact and matches the plan-brief
template and the `isBriefMode` seam.

### Question 11: Design alignment

**Q:** Where does the user align on the design?
**A:** At the brief level, inside the interview. The interview has an explicit
design strand (architecture, behavior, alternatives and tradeoffs, risks).
Brief approval confirms a design the user already agreed to. Phase-level
design stays agent-decided within that agreement.

## Solution Space

Settled before scaffolding: a new mode family (`brief`, `goal`) sharing one
brief contract and an `isBriefMode` seam, rather than a planning profile of
quick (Question 9) or a lite extension. The seven-round record in the
consensus proposal is the exploration.

## Options Considered

### Option A: Mode family with shared seam _(chosen)_

**Description:** Register `brief` and `goal` in `WORKFLOW_MODES`; branch on
`isBriefMode(mode)` where behavior is identical and on `goal` only for
milestone routing and delivery.

**Pros:** recommender can name it; mode-keyed consumers get explicit branches;
goal needs the family anyway; brief is goal with one milestone.

**Cons:** the workflow-mode change inventory is large (every consumer in the
recon inventories below).

### Option B: Brief as a quick planning profile

**Description:** quick gains `oat_plan_source: brief` and a brief-shaped plan.

**Pros:** fewer surfaces. **Cons:** quick's router, readiness predicate,
summary freshness and agent contracts all assume tasks; goal still needs a
mode; `isBriefMode` becomes a profile flag by another name.

**Chosen:** A.

## Key Decisions

1. **Two modes, one family:** `brief` (one delivery) and `goal` (milestones),
   `isBriefMode` seam, shared `references/brief-contract.md`.
2. **One authored artifact:** `plan.md` titled "Project Brief" from a new
   `plan-brief.md` template with unchanged plan frontmatter
   (`oat_plan_source: brief | goal`). Sections: Goal, Outcomes with intended
   evidence, Approach (optional `### Design`), Constraints and Out of Scope,
   Decisions, Known Unknowns, Delivery endpoint and authority, Phases, Reviews.
3. **Phases, not tasks:** `## Phase pNN:` with Intent, Exit evidence,
   provisional flag; only the next phase must be concrete; stable IDs;
   document order governs execution and review ranges.
4. **Bounded phase-unit progress contract (F5):** a taskless phase is one
   unit completed by a phase-level `**Status:** completed` line in
   `implementation.md`; completion-marker ownership resets at every phase
   heading; `oat_current_task_id` may hold a phase ID; review scope is
   base/head anchors recorded per phase; finalization requires all units
   complete; summary freshness keys on completed phase-units and journal
   changes.
5. **Tasks as execution records (F13):** opened at work start, closed at
   commit with the SHA or a terminal disposition; same `### Task pNN-tNN:`
   heading and `(pNN-tNN)` commit convention; supplement F5, never replace it;
   lookahead allowed; journal stays compact.
6. **Execution precedence (F12):** declared parallel groups → root fan-out
   when at least two slices pass the independence test → one phase
   implementer → inline only by a written exception satisfying every
   tiny-work predicate. One committing owner per worktree; nested workers
   never commit; fresh reviewer per phase on base..head; parallel groups may
   be declared whenever phases become concrete.
7. **Interview (F2 + C4):** readiness rounds with recommendations; explicit
   design strand; readiness is design alignment; facts resolved by the agent,
   decisions by the user; unresolved items go to Known Unknowns with the phase
   that settles them.
8. **Review ladder (F7 + T8):** brief artifact review → configured plan gate
   → one approval → per-phase self-check → fresh per-phase review → optional
   `oat_phase_review_gate` → final integrated review → configured implement
   exit gate.
9. **Record ownership (F6):** brief owns intent; `state.md` owns routing and,
   for goal, the delivery registry; `implementation.md` owns the per-phase
   journal with base/head, verification, review disposition, authority
   changes, deviations, next action; `project-log.md` owns observations and
   amendments; `references/research/` holds research. `pr/` stays gitignored.
10. **Closeout (F8):** completion audited against Outcomes and the agreed
    endpoint; configured `postImplementSequence` runs unchanged; router never
    skips summary for brief modes; retro follows configuration.
11. **Mode changes are manual (F9):** brief → quick via `oat project promote`
    preserving phases, reviews and approvals; no reverse direction.
12. **Goal additions (G2–G3):** `## Milestones` index in the brief referencing
    global phase IDs; `state.md` gains `oat_milestone`,
    `oat_milestone_status`, `oat_deliveries`; delivery requires accepted phase
    evidence plus an integrated review of the delivery scope; post-merge
    corrections are new deliveries linked by `corrects_delivery_id`; gates are
    milestone-scoped; terminal closeout satisfies the snapshot `pr` step by
    verified delivery coverage; graduation extracts a milestone into a linked
    quick or spec-driven project (manual in v1.5).
13. **Staged delivery:** v1 brief phases → progress PR; v1.5 goal phases →
    final PR. `goal` enters `WORKFLOW_MODES` only when its resume, delivery,
    gate and closeout consumers ship (DR-260906 recognition rule).

## Constraints

- **Workflow Mode Change Inventory (root `AGENTS.md:221-235`)** applies: mode
  declaration and parsing; recommender, router, progress, resume, closeout
  consumers; scaffolds, templates, validators, split, promotion; lifecycle
  skills, agent contracts, named-skill call sites; docs, help text, bundled
  assets, provider projections. Test each producer with its real consumers.
- **Recon baseline (2026-10-10):** no code accepts a mode outside
  `WORKFLOW_MODES` (`packages/control-plane/src/types.ts:11-17`); unknown
  values parse to `null` and default to `spec-driven`
  (`parser.ts:142`, `project.ts:56,129`). `getWorkflowRoutes` falls through
  to spec-driven routes (`router.ts:388-402`). `TEMPLATES_BY_MODE` and
  `STATE_TEMPLATE_BY_MODE` are `Record<WorkflowMode, …>`
  (`scaffold.ts:119-135,156-235`), so registration is a type error until the
  new modes have entries. `parsePhaseProgress` drops a phase with no matching
  task heading (`tasks.ts:104-150`). The summary prerequisite exempts only
  lite (`router.ts:299-307`). `validateLitePlan` is a hardcoded lite branch,
  not a profile mechanism (`validate-plan.ts:67-115`).
- **Task-ID assumptions to replace for brief modes:** review-provide commit
  grep (`oat-project-review-provide/SKILL.md:427-442`), pr-progress phase
  commit grep (`oat-project-pr-progress/SKILL.md:136-150`), summary freshness
  on highest task ID (`oat-project-summary/SKILL.md:207-226,400`), revise
  `p-revN` task creation (`oat-project-revise/SKILL.md:160-214`), reconcile
  and review-receive task keys, and both agent contracts
  (`.agents/agents/oat-phase-implementer.md:116-130,148,446,513-515`;
  `oat-reviewer.md:276-283`).
- **Lite is the precedent:** PR #264 (`0f47bf700`) touched 171 files; every
  surface it touched is a candidate here. Contract tests pin per-mode skill
  prose (`packages/cli/src/validation/skills.test.ts:8315-9100`, including
  the rule that a skill line pairing quick with spec-driven must also mention
  lite).
- **Versioning:** skill `metadata.version` and agent-role `version:` bumps
  per PR; lockstep public package bump for shipped assets
  (`.agents/skills`, `.agents/agents`, `.oat/templates`, docs);
  `pnpm run check:skill-bumps` and `pnpm release:check-versions` gate it.
- **Generated projections are regenerated, never edited:** `.codex/agents/*`
  and `.cursor/agents/*-<model>-<effort>.md` carry mode lists.
- **No host-native goal controls** are activated by selecting goal mode; no
  bare `/goal`.
- **Plan gate reruns capped at 2–3** for this project (lite plan gate
  blocked eleven times on a broad sweep without converging); implementation
  reviews carry the rest.
- **Branch hygiene:** fetch `origin/main` before plan approval, each phase
  start and each parallel dispatch; reconcile planned paths that main touched.

## Success Criteria

- `oat project new --mode brief` scaffolds state, `plan.md` from
  `plan-brief.md`, `implementation.md`, `references/research/`, and the
  project log when configured; `--mode goal` does the same once goal
  registers.
- `oat-project-brief` runs the interview, writes the brief in one pass,
  commits it, runs the artifact review and configured gate, records the
  disposition in `## Reviews`, and hands a ready brief to
  `oat-project-implement`.
- `oat project validate-plan` accepts a brief with taskless phases, Intent
  and Exit evidence per phase, unique normalized phase IDs, and parallel
  groups; it rejects duplicate phase IDs and phases without exit evidence.
- Progress, status, dashboard, `oat-project-next` and `oat-project-progress`
  count phase-units for brief modes; resume lands on the first incomplete
  unit in document order; a provisional phase is incomplete; finalization
  requires all units complete.
- Per-phase review scope resolves from recorded base/head anchors; task
  execution records with `(pNN-tNN)` commits still grep correctly as a
  fallback.
- Summary prerequisites and refresh detection key on completed phase-units
  and journal changes; closeout audits Outcomes; the configured
  `postImplementSequence` runs; `oat project promote --to quick` works from
  brief.
- Goal: milestone index, `oat_deliveries` registry, milestone-scoped gates,
  delivery prerequisites enforced in `oat-project-pr-progress`, re-align loop,
  terminal closeout by verified delivery coverage, manual extraction to a
  linked structured project.
- Docs: `choose-workflow`, lifecycle, project-state-machine,
  project-artifacts, cli-reference, starting-projects, planning-skills,
  execution-skills, closeout and review pages, root `AGENTS.md` Workflow
  Options and heuristic, lane diagrams, updated for both modes.
- Every gate in the Definition of Done passes with real (non-cached) runs;
  decision records capture the mode contracts; summary and retro follow
  configuration.

## Out of Scope

- v2 items: PR stacks (shared manifest and integrated review across
  dependent PRs), milestone-extraction automation, `references/` for all
  modes, quick-as-default recommendation (BL-260904).
- Executable coordination parents; reverse promotion (quick → brief).
- Activating Codex `create_goal` / `pursuing-goals` or any bare `/goal`.
- An imported "three resumes then a stronger model" retry rule; existing
  retry limits stay as configured.
- A separate `design.md` for brief modes; design lives in the brief.

## Deferred Ideas

- Extraction automation (`oat project extract-milestone`) — v2 after manual
  extraction proves the shape.
- `references/` scaffolding for lite, quick and spec-driven — v2.
- Stacks as a delivery kind — registry carries the slot from v1.5; machinery
  in v2.

## Open Questions

Items that still need alignment before or during planning. Each carries a
recommendation.

- **Plan-source values:** `oat_plan_source: brief | goal` (mode names) rather
  than following the `import` → `imported` mismatch. Recommend mode names.
- **Replacement for task-ID keyed surfaces:** review scope from phase
  base/head anchors (decided); pr-progress scope from the same anchors;
  summary freshness from a journal content hash plus completed phase-unit
  count; revise creates a `p-revN` phase with Intent/Exit evidence instead of
  tasks in brief modes; reconcile and review-receive key on phase IDs when no
  task record exists. Recommend these; confirm pr-progress and revise.
- **HiLL checkpoints in brief modes:** `oat_plan_hill_phases: []` means
  every phase in quick (`plan-and-resume.md:113-131`), which is heavy when
  later phases are provisional. Recommend: brief modes default to no phase
  checkpoints unless `oat_plan_hill_phases` names them, and the lite bypass
  is not reused. Needs confirmation.
- **Goal re-alignment entry:** re-enter `oat-project-goal` at a settled
  milestone (router routes `delivered` → `oat-project-goal`) rather than a
  separate align skill; `oat-brainstorm` fold-back gains the "revise this
  delivery" vs "align next milestone" routing. Recommend this shape.
- **Stale surfaces found by recon:** `oat-brainstorm/references/destinations.md`
  (no lite row, no import) is in scope because fold-back routing changes;
  `.oat/scripts/generate-oat-state.sh` (legacy `full` default, no lite case)
  is either dead or a backlog item. Recommend: fix destinations.md here,
  check whether the script has any caller and backlog it if not.
- **Which phases form the v1 progress PR:** control-plane + CLI + brief skill
  - docs for brief; the goal phases follow. Confirm the boundary when the plan
    is drafted.
- **Agent-contract shape:** add a brief-mode branch to
  `oat-phase-implementer.md` and `oat-reviewer.md` (phase intent and exit
  evidence as the requirement source, execution-record tasks, base/head
  scope) and regenerate projections, versus new agent roles. Recommend
  branches in the existing roles.
- **`oat_phase_review_gate` and implement exit gate** behave as today for
  brief modes; milestone-scoped gates are goal-only. Confirm.

### Resolved 2026-10-10 (Thomas, before stepping away)

Every open question above resolves to its recommendation. Operating
decisions for the autonomous run: brief modes default to no HiLL phase
checkpoints; this project runs with no HiLL checkpoints; Claude approves the
plan after Astra alignment, artifact review and the configured gate (gate
reruns capped at three); at a review cap Claude runs the complexity review,
applies its recommendation, logs it and continues; the progress PR opens
after the brief phases and goal phases continue on the same branch; no PR is
merged by the agent; decision records are authored during the work and
confirmed at PR review; dispatch ceiling is frontier; delegated implementers
and reviewers run Claude Opus 5.5 at high effort; Astra reviews run as fresh
high-effort delegated tasks, bounded to three rounds on the design and two on
the plan.

## Assumptions

- The plan parser grammar (`## Phase pNN:` / `### Task pNN-tNN:`) is kept;
  brief modes add a phase-level completion marker rather than a new grammar.
- Execution-record tasks use the existing commit convention, so commit-grep
  consumers degrade gracefully rather than break.
- Thomas and Astra will review `design.md` before `plan.md` is drafted.
- The quick-start plan gate for this project converges within 2–3 reruns.

## Risks

- **Silent fall-through:** a consumer missed in the inventory treats brief as
  spec-driven or as a task-based mode and misroutes.
  - **Likelihood:** Medium **Impact:** High
  - **Mitigation Ideas:** extend the contract tests that pin per-mode prose
    (`skills.test.ts` lite contracts) to brief and goal; test each producer
    with its real consumer; final review lens "mode inventory coverage".
- **Parser contract regression:** changing completion-marker ownership or
  taskless-phase handling breaks lite, quick or spec-driven progress.
  - **Likelihood:** Medium **Impact:** High
  - **Mitigation Ideas:** behavior gated on `isBriefMode`; existing
    `tasks.test.ts` pins stay green; add negative controls.
- **Plan gate non-convergence** on a broad cross-surface sweep.
  - **Likelihood:** High **Impact:** Medium
  - **Mitigation Ideas:** cap reruns; rely on per-phase reviews.
- **Goal registered before consumers ship** violates DR-260906.
  - **Likelihood:** Low **Impact:** High
  - **Mitigation Ideas:** `goal` enters `WORKFLOW_MODES` in the goal phases
    only; `--mode` choices derive from the array.
- **Main drift** across a multi-PR staged project.
  - **Likelihood:** High **Impact:** Medium
  - **Mitigation Ideas:** fetch and reconcile at each phase start; progress
    PR merges before goal phases begin.

## Next Steps

Quick mode with lightweight design: `design.md` covers the mode-family seam,
the phase-unit parser contract, the two templates, the skill set, the goal
state model and the staged delivery shape. Thomas and Astra review it, then
`plan.md` is drafted.
