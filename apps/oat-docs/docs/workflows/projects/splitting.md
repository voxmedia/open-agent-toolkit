---
title: Project Splitting
description: 'How OAT splits broad discoveries or brainstorms into a coordination parent and focused child projects.'
---

# Project Splitting

Use project splitting when one discovery or brainstorming thread turns into several independently shippable projects that should keep shared context but execute separately.

`oat-project-split` is the handoff skill for that moment. It creates a durable coordination parent, scaffolds flat sibling child projects, seeds each child with focused discovery context, and activates the first child by dependency or value order.

## When To Split

Split when the work has multiple deliverables that can ship independently, no single shared design surface owns all of them, separate PRs are expected, or the scope clearly spans distinct subsystems.

Do not split just because a project has many tasks. A large but coherent implementation can stay one project when it has one design surface and one release boundary.

## Entry Paths

Splitting can start from either discovery or brainstorming:

- **Declared:** the user states multi-project intent up front. `oat-brainstorm` skips detection and hands off to `oat-project-split`.
- **Detected mid-stream:** `oat-project-discover` evaluates codified split signals during solution-space exploration and prompts when the threshold is crossed.
- **Detected at convergence:** `oat-project-discover` performs an end-of-discovery scope check, and `oat-brainstorm` can expose a split destination when the accumulated scope is large.

Declared non-interactive runs can proceed. Detected non-interactive runs record the split recommendation and fail fast rather than silently creating projects.

## Coordination Parent

The parent becomes a coordination artifact, not an implementation project.

It stays in place under `.oat/projects/<scope>/<parent>/` with:

- `oat_kind: coordination`
- `oat_phase: decomposition`
- `oat_phase_status: complete`
- broad context, split rationale, shared constraints, child registry, and integration sketch
- `references/split-plan.json` as the durable resume source

Coordination parents do not keep executable phase artifacts. They should not contain `spec.md`, `design.md`, `plan.md`, or `implementation.md`.

## Child Projects

Children are flat sibling projects under the same projects root. They are not nested under the parent.

Each child gets:

- parent backlink and sibling links in `state.md`
- `depends-on` metadata when ordering or dependency constraints exist
- a seeded `discovery.md` with Origin, Inherited Context, Child Scope, Known Dependencies, Assumptions To Revalidate, Likely Workflow Mode, and Sibling Projects
- `oat_inherited_context_revalidated: false` until the child revalidates inherited assumptions

Only one child is activated immediately. The rest remain parked until opened or resumed.

## Resume And Recovery

The split plan is persisted before child writes. If a split is interrupted, resume reads `references/split-plan.json` from the coordination parent instead of reconstructing child inputs from state.

Resume requires explicit confirmation and seeds only missing child projects.

## Listing And Dashboard Behavior

Completed coordination parents are hidden from default `oat project list` output so normal project lists stay focused on executable work.

Use:

```bash
oat project list --include-coordination
```

to show them. Completed coordination parents render as `decomposition (complete)` with recommendation `none`.

`oat state refresh` also groups completed coordination parents under the repo dashboard's decompositions section.

## Related Pages

- [Lifecycle](lifecycle.md)
- [Artifacts](artifacts.md)
- [Implementation Execution](implementation-execution.md)
