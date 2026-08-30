---
id: bl-3a4a
title: 'Codified sub-project split escape hatch'
status: closed # open | in_progress | closed | wont_do
priority: medium # urgent | high | medium | low | none
priority_reviewed: '2026-04-27'
scope: feature # idea | task | feature | initiative
scope_estimate: L # XS | S | M | L | XL | XXL
labels: ['workflow-design', 'discovery', 'follow-up']
assignee: null
created: '2026-04-23T22:57:27Z'
updated: '2026-05-21T00:00:00Z'
associated_issues: []
oat_template: true
oat_template_name: backlog-item
---

## Description

When `oat-project-discover` or `oat-brainstorm` surfaces that a request is really N loosely-related sub-projects, OAT needs a codified hand-off mechanism. Without one, the workflow either crams independent efforts into one project or loses shared context when the user manually creates separate projects.

This backlog item tracks a follow-up project to add a graceful split-escape-hatch. User-facing naming should prefer **split** (`oat-project-split`, "split this project into child projects") while internal artifact prose can describe the model as project decomposition.

Settled product direction:

- Add a standalone `oat-project-split` skill invoked from both `oat-project-discover` and `oat-brainstorm`.
- Treat the parent as a durable coordination artifact, never an executable project. It records broad discovery, split rationale, child ordering, shared constraints, sibling links, and an optional integration sketch.
- Keep the parent in place under `.oat/projects/<scope>/`, mark it `oat_kind: coordination`, `oat_phase: decomposition`, and `oat_phase_status: complete`, and filter/dim it from normal active listings. Do not archive or relocate it as part of the split.
- Create child projects as flat sibling execution units, seed each with distilled focused discovery, and link each child back to the parent and siblings through project state.
- Select exactly one initial active child by dependency/value order; park siblings for later revalidation.

The split workflow has three trigger surfaces:

- **Declared:** the user states multi-project intent up front. Detection is skipped; umbrella framing starts immediately and asks whether the children are already known or should be decomposed together.
- **Detected mid-stream:** `oat-project-discover` silently evaluates codified split signals during solution-space exploration and prompts once the threshold is crossed.
- **Detected at convergence:** `oat-project-discover` always performs an end-of-discovery scope check, and `oat-brainstorm` exposes a conditional split destination when accumulated scope is large.

The old A/B mode split is collapsed: trigger timing determines how much parent context exists, and the only split-time knob is whether to split with current context or run one broad cross-cutting discovery round first.

**Origin:** Considered as Component 2 / Decision 9 of the `collaborative-design-workflow` project and dropped from that project's scope. Detection already happens organically during discover; the missing piece is the codified hand-off. Full context: `.oat/projects/shared/collaborative-design-workflow/discovery.md` (Question 10, Deferred Ideas, note at line 242).

## Parent/Child Lifecycle Model

When split is accepted, the parent project becomes a durable coordination artifact rather than an implementation unit.

Parent project responsibilities:

- Preserve the broad discovery conversation, split rationale, child list, child ordering recommendation, and shared constraints.
- Optionally include an integration sketch covering how the child projects relate, what dependencies exist, and which assumptions each child inherits.
- Record child project paths and mark the parent lifecycle as complete by decomposition.
- Persist `references/split-plan.json` as the durable resume source.
- Remain in place under `.oat/projects/<scope>/`; completion is represented by `oat_phase: decomposition` and `oat_phase_status: complete`, not by archive relocation.

Child project responsibilities:

- Include a backlink to the parent project and sibling links.
- Seed `discovery.md` with only relevant inherited context, not a wholesale copy of the parent discovery.
- Clearly mark inherited context as partial/stale-prone.
- Require discovery revalidation before moving past discovery/design, because sibling projects may have shipped or changed assumptions since the split.

Suggested child discovery sections:

- Origin
- Inherited Context
- Child Scope
- Known Dependencies
- Assumptions To Revalidate
- Likely Workflow Mode
- Sibling Projects

## Acceptance Criteria

- A standalone `oat-project-split` skill is documented, registered, and invocable from both `oat-project-discover` and `oat-brainstorm`.
- User-facing naming uses `split`; internal docs may use `decomposition` for the parent/child model.
- The three trigger surfaces work: declared intent, detected mid-stream discovery signals, and detected-at-convergence scope checks / brainstorm picker option.
- Declared non-interactive runs can proceed; detected non-interactive runs record the detection and fail fast instead of silently splitting or silently continuing.
- The split skill writes a coordination parent with `oat_kind: coordination`, no executable phase artifacts, broad context, split rationale, child registry, ordering, sibling relationships, shared constraints, and an integration-sketch section.
- The parent is marked complete by decomposition in place and is never relocated as part of the split flow.
- Child projects are flat siblings, not nested under the parent.
- Child projects include parent backlinks, sibling links, inherited-context notes, known dependencies, and a clear requirement to revalidate discovery before moving past discovery/design.
- Each child receives a distilled seeded `discovery.md` with Origin, Inherited Context, Child Scope, Known Dependencies, Assumptions To Revalidate, Likely Workflow Mode, and Sibling Projects sections.
- Exactly one child becomes active by dependency/value order; siblings are scaffolded but parked.
- The hand-off integrates with existing `state.md` phase routing — the chosen active project resumes at an appropriate phase (not forced back to the start).
- Resume/retry detects partial split state and resumes from `references/split-plan.json` without reconstructing raw child inputs.
- Testing covers the signal evaluator, split-plan normalization, DAG/collision validation, parent/child writes, CLI orchestration, listing/dashboard filtering, integration hooks, and dogfooded declared/detected/resume scenarios.
