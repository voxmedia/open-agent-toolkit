---
id: bl-3a4a
title: 'Codified sub-project split escape hatch'
status: open # open | in_progress | closed | wont_do
priority: medium # urgent | high | medium | low | none
priority_reviewed: '2026-04-27'
scope: feature # idea | task | feature | initiative
scope_estimate: L # XS | S | M | L | XL | XXL
labels: ['workflow-design', 'discovery', 'follow-up']
assignee: null
created: '2026-04-23T22:57:27Z'
updated: '2026-04-27T00:00:00Z'
associated_issues: []
oat_template: true
oat_template_name: backlog-item
---

## Description

When `oat-project-discover` surfaces that a request is really N loosely-related sub-projects, OAT currently has no codified hand-off mechanism. The agent organically notices the multi-subsystem scope during Step 9 solution-space exploration, but the workflow either crams everything into one project or loses context when the user manually creates separate projects.

This backlog item tracks a follow-up project to add a graceful split-escape-hatch. User-facing naming should prefer **split** (`oat-project-split`, "split this project into child projects") while internal artifact prose can describe the model as project decomposition.

Settled product direction:

- Treat the original project as a parent/umbrella project for broad discovery and optional cross-project integration thinking.
- Once the user chooses to split, continue only enough parent discovery to preserve the broad context and, optionally, create a lightweight integration sketch showing how the child projects fit together.
- Create child projects as the execution units, seed each with focused discovery, and ask which child should become active first.
- Mark the parent complete as "completed by decomposition" and archive it immediately rather than keeping it in shared until all children finish.
- Child projects must not require the parent to remain active in `.oat/projects/shared`; they should recover parent context from shared, local archive, or S3-backed archive sync when needed.

The split workflow still has two operating modes:

- **Option A — Split and park:** create N new projects, seed each with a brief discovery summary distilled from the parent conversation. User picks one to continue with now; others sit ready for refreshed discovery when picked up later. Clean separation, minimal cross-project context preserved.
- **Option B — Brainstorm broadly, execute one:** stay in the current conversation and do rich cross-cutting discovery covering all sub-projects. Optionally produce a parent-level integration sketch, then generate focused `discovery.md` files for each child with cross-references noting inter-project dependencies. Pick one child to make active; others sit with richer context for later.

Natural home: an extension to `oat-project-discover` (where multi-subsystem scope is typically detected) or a new dedicated `oat-project-split` skill.

**Origin:** Considered as Component 2 / Decision 9 of the `collaborative-design-workflow` project and dropped from that project's scope. Detection already happens organically during discover; the missing piece is the codified hand-off. Full context: `.oat/projects/shared/collaborative-design-workflow/discovery.md` (Question 10, Deferred Ideas, note at line 242).

## Parent/Child Lifecycle Model

When split is accepted, the parent project becomes a durable context artifact rather than an implementation unit.

Parent project responsibilities:

- Preserve the broad discovery conversation, split rationale, child list, child ordering recommendation, and shared constraints.
- Optionally include an integration sketch covering how the child projects relate, what dependencies exist, and which assumptions each child inherits.
- Record child project paths and mark the parent lifecycle as complete by decomposition.
- Archive on completion using the existing OAT project completion/archive flow.

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

## Archive Recovery

Because the parent should be completed and archived immediately after split, child resume flows need explicit parent recovery behavior.

Resolution order for parent context:

1. Check `.oat/projects/shared/<parent>` in case the parent has not yet been archived.
2. Check the local archive under `.oat/projects/archived/<parent>` and date/collision-suffixed variants.
3. If not found locally and `archive.s3Uri` is configured, hydrate archived projects with `oat project archive sync <parent>` or the equivalent targeted sync flow, then re-check the local archive.

Existing archive behavior to build on:

- Completion archives locally first.
- If `archive.s3SyncOnComplete=true` and `archive.s3Uri` is configured, completion can upload a repo-scoped S3 snapshot.
- S3 snapshots are under `{archive.s3Uri}/{repo-slug}/projects/{YYYYMMDD-project-name}`.
- S3 archive sync materializes the latest remote snapshot back into the bare local archive path under `.oat/projects/archived/<project>`.
- S3 archive sync excludes process artifacts such as `reviews/*` and `pr/*`; parent/child backlinks should rely on core deliverables (`discovery.md`, `design.md`, `summary.md`, `state.md`, etc.).

## Acceptance Criteria

- `oat-project-discover` offers a codified split prompt when the discovered scope spans independent subsystems, with a clear opt-out.
- User-facing naming uses `split`; internal docs may use `decomposition` for the parent/child model.
- Option A (split and park) produces N seeded project scaffolds with distilled per-project discovery summaries derived from the parent conversation.
- Option B (brainstorm broadly, execute one) produces focused `discovery.md` files for each child project with explicit inter-project dependency cross-references, and marks exactly one as active.
- The split flow supports an optional parent-level integration sketch before child generation; this is not a full implementation design.
- The parent project records split rationale, child project paths, sibling relationships, and inherited shared constraints.
- The parent project is marked complete by decomposition and archived immediately after child project creation unless the user explicitly opts out.
- Child projects include parent backlinks, sibling links, inherited-context notes, and a clear requirement to revalidate discovery before moving past discovery/design.
- Child resume/open flow checks for the parent in shared, then local archive, then S3-backed archive sync when `archive.s3Uri` is configured.
- The hand-off integrates with existing `state.md` phase routing — the chosen active project resumes at an appropriate phase (not forced back to the start).
- Non-interactive mode has a defined behavior (e.g., skip split and document the decision in discovery.md, or fail fast with a clear error).
- A new `oat-project-split` skill is documented and registered, or `oat-project-discover` has explicit new steps covering the split flow — whichever shape the design chooses.
- Test coverage includes at least one dogfooded run in each mode.
