---
oat_status: complete
oat_ready_for: oat-project-quick-start
oat_blockers: []
oat_last_updated: 2026-09-04
oat_generated: false
---

# Discovery: lite-workflow-mode

## Phase Guardrails (Discovery)

Discovery is for requirements and decisions, not implementation details.

- Prefer outcomes and constraints over concrete deliverables (no specific scripts, file paths, or function names).
- If an implementation detail comes up, capture it as an **Open Question** for design (or a constraint), not as a deliverable list.

## Initial Request

OAT's project workflows are strong for real projects, and quick-start adapts
its depth to the work. But for a single-sitting change (one React component,
one bug fix, one small refactor) the quick workflow is still far too heavy.
Quick-start runs roughly twenty numbered steps between preflight and "output
next action"; only two of them (discovery and plan generation) are the ones
worth keeping for a small change. The rest is ceremony that exists so a
multi-session project can resume and be reviewed in phases.

The goal is a workflow mode lighter than quick that still keeps what makes
OAT valuable for small work: a critical interview before code, a written
plan with validation criteria, an approval gate, atomic commits per task so an
interrupted session can be picked up or handed to another agent, dispatch
ceilings so a cheap model can implement while a stronger model reviews, and a
final review.

Reference point supplied during brainstorming: the Warp software-factory
"spec agent" prompt, which produces one self-contained spec document (summary,
behavior or design, decisions, assumptions, out of scope, validation
criteria), scaled to the work, committed on the feature branch, with one
user-approval gate before implementation.

## Clarifying Questions

### Question 1: Change class

**Q:** Which change class is the lighter mode for: single-sitting changes,
small-but-resumable multi-day work, or exploration of unknown size?
**A:** Single-sitting changes.
**Decision:** Durable multi-session machinery (state sync, dashboard refresh,
phase gates, post-implementation summary/document/retro) is the first thing
to cut. Resume and handoff still matter, but the artifact that carries them
must be tiny.

### Question 2: What survives the session

**Q:** Conversation-only micro mode, a single-file task record, or a
quick-start "minimal profile" flag?
**A:** Value in both micro and single-file, but the record of discovery, the
task list, handoff, interruption recovery, and atomic commits are all wanted.
A collapsed single artifact (discovery + design + plan in one file, like a
Claude/Cursor/Codex plan document) is the right shape.
**Decision:** A conversation-only micro mode does not earn its place: once
resume and handoff are required, the file is the product. Micro mode collapses
into "single-file mode with a tiny file" and is dropped as a separate concept.

### Question 3: Is a lite project a kind of project or a separate concept?

**Q:** Project mode under the projects root, a separate `.oat/tasks/`
concept, or a branch-only spec committed in a draft PR?
**A:** The branch-only variant was challenged and found to be no different
from a shared-scope project collapsed to one artifact; shared projects already
commit their artifacts on the feature branch.
**Decision:** A lite project is a project with a new workflow mode. Where the
file lives is not the decision that matters; which lifecycle steps run, and
whether the project is registered with progress/next/dashboard tooling, are.
Registered, so existing resume and handoff tooling works unchanged.

### Question 4: State in frontmatter or a separate state.md?

**Q:** Should the single artifact carry its own state in frontmatter, or
should the project keep state.md?
**A:** Keep the project shape.
**Decision:** Keep state.md. The plan artifact is the thing the user approves;
state is machine-mutated on every task completion and should not dirty the
approved artifact's diff. The dispatch ceiling already persists in state.md
and every cross-cutting reader (progress, next, open, dashboard) already
parses it. The overhead being removed is steps, not file count.

### Question 5: Is implementation.md still needed?

**Q:** Should implementation.md survive in lite mode?
**A:** Yes.
**Decision:** implementation.md holds the resume pointer to the next task, the
per-run dispatch record, the divergence log, and the final summary the PR
step reads. The implement skill's bookkeeping contract names it. It is
machine-written and costs the user nothing.

### Question 6: Execution and dispatch

**Q:** Should lite still run the implement skill and the phase implementer,
honoring the dispatch ceiling (e.g. plan with Fable, implement with Sonnet,
review with Opus)? Or should the root be the implementer and dispatch
subagents per task, possibly in parallel?
**A:** Keep the ceiling. Root-as-implementer is attractive because a lite
project is assumed to be one phase.
**Decision:** Reuse the implement skill as a single phase. The ceiling caps
the reviewer; the implementer runs at or below it. The implement skill's
existing root-inline path covers root-as-implementer. Phase-gate review is
skipped because there is one phase by definition. Holes identified in the
parallel-subagent idea: parallelism is rare and conflict-prone for
single-sitting changes; concurrent commits break the atomic-commit recovery
trail; the root cannot review its own work; root context bloat on a
twelve-item task signals the work was undersized; an escalation path is
needed.

### Question 7: Mode name

**Q:** "task" collides with plan tasks within a phase. What should the mode
be called?
**A:** `lite`.
**Decision:** Mode name is `lite`, sitting beside `spec-driven` and `quick`.
The single authored artifact is `plan.md` with spec sections prepended, so
the implement skill needs no new file name or parser.

### Question 8: Interview cadence

**Q:** One question at a time (OAT default) or batched (Warp style)?
**A:** Batched is ideal for this mode.
**Decision:** Batched critical interview. A second round only for questions
the first round's answers created. If the user says "just proceed", choose
the most careful interpretation of each open question and record it under
Assumptions in plan.md.

### Question 9: New skill or quick-start flag?

**Q:** New entry skill, a flag on quick-start, or a new skill quick-start can
downgrade into?
**A:** New skill.
**Decision:** New entry skill (working name `oat-project-lite`). Quick-start
is already ~900 lines with adaptive-depth branching; a lite branch would make
it harder to read and every lite run would pay quick-start's step-resolution
cost. Shared pieces (git preflight, dispatch-ladder adoption contract) are
reused by reference, as other skills already do. Single entry point:
`oat project new <slug> --mode lite`.

### Question 10: Escalation when the interview reveals larger scope

**Q:** Promote in place, abandon and restart, or let lite grow phases?
**A:** Promote in place.
**Decision:** A lite-to-quick promotion mirroring the existing spec-driven
promotion. The lite plan's summary, decisions, and assumptions become
discovery's initial request and key decisions; the task list is discarded and
quick-start regenerates a phased plan; state.md flips mode; slug and branch
survive. The trigger is the interview itself: if the batched answers yield a task
list that will not fit one sitting, or surface a design decision the
implementer cannot be trusted to make, propose promotion. Ordering
(revised during design and plan review): the interview result is first
written to plan.md as a durable pre-approval draft (still
`oat_template: true`, not yet approved or complete), and the escalation
check then runs against that draft so promotion consumes and preserves the
answers. "Before the plan is written" in the original answer meant before
plan completion, not before the draft exists.

### Question 11: Who commits when the executor dispatches subagents?

**Q:** One committer per run, subagents commit their own tasks, or root
squashes at the end?
**A:** One committer per run. Confirmed this matches current behavior at the
phase level (phase implementer commits per task sequentially; root does not
touch the tree until it returns; root-inline is the fallback).
**Decision:** Whoever executes the phase owns the tree and the commits.
Helper subagents dispatched for individual tasks within the phase never
commit; the executor commits after each returns. Parallel helpers are an
explicit per-task opt-in for disjoint file sets only, committed in task order
after return. This extends the existing rule one level down; it does not
change current behavior.

## Solution Space

### Approach 1: Lite as a new project workflow mode _(Recommended)_

**Description:** A third workflow mode, `lite`, beside `spec-driven` and
`quick`. A lite project has the standard project shape (plan.md, state.md,
implementation.md) but a single authored artifact and a collapsed lifecycle:
git preflight, batched critical interview, one plan.md with spec sections
and a task list, one approval gate, hand to the implement skill as a single
phase, atomic commits per task, final review at the ceiling model, PR.
**When this is the right choice:** Single-sitting changes where the
interview and a written plan still pay off but multi-session machinery does
not.
**Tradeoffs:** Adds a third mode to every mode-aware surface (CLI, skills,
templates, docs, tests).

### Approach 2: Conversation-only micro mode

**Description:** No project directory. Interview and checklist live in chat
or a scratch file; only the commit and PR survive.
**When this is the right choice:** Throwaway changes with no handoff or
resume requirement.
**Tradeoffs:** Once resume and handoff are required, this is chat with a
transcript nobody else can read. Rejected.

### Approach 3: Quick-start minimal profile

**Description:** A config flag on quick-start that skips the design decision,
requirements gate, dispatch policy, phase gate, and plan review loop.
**When this is the right choice:** When avoiding any new skill is the
priority.
**Tradeoffs:** Every lite run still pays quick-start's step resolution;
quick-start becomes harder to maintain in both modes. Rejected.

### Approach 4: Branch-only spec in a draft PR (Warp shape)

**Description:** Spec committed as the first commit on the feature branch,
implementation reuses the branch, PR is the durable reference; no project
tree.
**When this is the right choice:** Systems with no project registry.
**Tradeoffs:** Indistinguishable from a shared-scope project collapsed to one
file, minus registration. Rejected in favor of Approach 1, which keeps
registration and reuses existing tooling.

### Chosen Direction

**Approach:** Approach 1, lite as a new project workflow mode.
**Rationale:** Keeps every piece the user values (interview, plan with
validation criteria, approval gate, atomic commits, ceiling-based dispatch,
final review, resume, handoff) while cutting the ceremony to roughly eight
steps. Reuses the implement skill and all state.md readers unchanged.
**User validated:** Yes.

## Key Decisions

1. **Mode name:** `lite`, beside `spec-driven` and `quick`. "task" was
   rejected because it collides with plan tasks.
2. **Single authored artifact is plan.md:** spec sections (summary,
   decisions, assumptions, out of scope, validation criteria) prepended to
   the task list in today's plan grammar. No new file name or parser.
3. **Project shape retained:** state.md and implementation.md stay as
   machine-owned bookkeeping. Lite is registered with progress, next, open,
   and dashboard tooling.
4. **Lifecycle kept:** git preflight, batched critical interview, plan.md,
   one approval gate, implement as one phase, atomic commits per task,
   final review at the ceiling model, PR.
5. **Lifecycle cut:** separate discovery/design/spec files; design-depth
   decision; requirements gate; phase-gate configuration and phase-boundary
   pauses; state sync and dashboard refresh as user-facing steps; summary,
   document, and retro default off. The plan artifact review loop is
   retained in structured mode because it adds no user pause; only its
   separate disposition step is folded into plan completion.
6. **Interview is batched and critical:** one round, a second only for
   questions the first created; "just proceed" records careful assumptions.
7. **Implement skill reused as a single phase:** ceiling caps the reviewer,
   implementer at or below it, root-inline is an existing dispatch shape.
8. **One committer per run:** helper subagents never commit; parallel
   helpers opt-in per task for disjoint files only.
9. **Escalation is promote-in-place to quick**, proposed by the interview
   after the interview result is written to plan.md as a pre-approval draft
   and before approval or completion, so promotion never loses interview
   content.
10. **New entry skill, not a quick-start flag.**

## Constraints

- Must not change current implement-skill commit semantics for quick or
  spec-driven projects; lite extends the existing one-committer rule.
- The dispatch ceiling and dispatch profile keep their current meaning and
  persistence location.
- Existing readers of state.md and implementation.md must work on lite
  projects without a second code path.
- Every canonical skill changed must get a frontmatter version bump; bundled
  skills, templates, and docs changes trigger the lockstep public package
  version bump.

## Success Criteria

- `oat project new <slug> --mode lite` scaffolds a lite project.
- A lite run from interview to PR-ready has on the order of eight
  user-visible steps and exactly one approval pause before implementation.
- The implement skill executes a lite plan.md as a single phase with no
  phase-gate prompt and dispatches a final review at the ceiling model.
- Interruption mid-implementation resumes from implementation.md's task
  pointer with per-task commits intact.
- A lite project can be promoted in place to quick without losing interview
  content.
- progress, next, open, and the dashboard report lite projects correctly.

## Out of Scope

- Renaming `quick` to the default mode and making `spec-driven` the explicit
  escalation. Captured as a separate backlog item; it is a repo-wide rename
  sweep.
- Parallel task-level subagent execution as a default behavior.
- Changes to spec-driven or quick lifecycles beyond mode awareness.

## Deferred Ideas

- Quick as the default mode, spec-driven as the explicit larger mode.
  Deferred because it is a rename sweep across CLI, tests, skills,
  templates, docs, and migration, and should not drag the lite work.
- Quick-start gaining a "this is lite-sized" downgrade exit during discovery.
  Deferred because it adds a decision point to quick-start.

## Open Questions

- **Promotion mechanics:** Exact mapping from lite plan.md sections into
  discovery.md fields during promote-in-place, and whether the promotion is a
  CLI command, a skill, or both.
- **Post-implementation chain:** Whether summary/document/retro are simply
  skipped in lite or offered once, off by default.
- **Plan.md section contract:** Which spec sections are required versus
  omitted when not applicable, and how the plan validator treats them.
- **Parallel opt-in syntax:** How a lite plan task declares it may run as a
  parallel helper on disjoint files.

## Assumptions

- Single-sitting changes rarely benefit from parallel execution; sequential
  is the correct default.
- The Warp-style "scale the spec to the work" rule means validation criteria
  are most of a lite plan for small changes.
- The implement skill's root-inline path is sufficient for
  root-as-implementer without new dispatch machinery.

## Risks

- **Lite becomes quick-with-fewer-files:** If lite grows phases or gates over
  time, the distinction erodes.
  - **Likelihood:** Medium
  - **Impact:** Medium
  - **Mitigation Ideas:** Hard rule that lite has one phase; scope growth
    goes through promotion, not through lite.
- **Mode-awareness misses:** A cross-cutting reader (progress, next, dashboard,
  validators) assumes discovery.md or design.md exists.
  - **Likelihood:** Medium
  - **Impact:** Low
  - **Mitigation Ideas:** Enumerate every mode-aware surface during planning;
    test a lite project through each.
- **Reviewer drift on approved plan.md:** Bookkeeping accidentally rewrites
  the approved artifact.
  - **Likelihood:** Low
  - **Impact:** Medium
  - **Mitigation Ideas:** Keep state and progress in state.md and
    implementation.md only; plan.md checkbox updates remain the only
    post-approval mutation, as today.

## Next Steps

Use this discovery artifact to drive the next workflow step:

- **Quick mode → optional lightweight design:** recommended here. Discovery
  surfaced component boundaries (new entry skill, mode enum, promotion path,
  plan.md section contract, mode-aware readers) that a short design pass
  should pin before planning.
- **Quick mode → straight to plan:** acceptable if the design questions above
  are resolved during plan authoring instead.
- **Quick mode → promote:** not expected; requirements are settled.
