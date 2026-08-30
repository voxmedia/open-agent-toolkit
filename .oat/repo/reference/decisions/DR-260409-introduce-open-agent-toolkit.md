---
id: DR-260409-introduce-open-agent-toolkit
title: Introduce `@open-agent-toolkit/control-plane` as the read-only OAT state layer
date: 2026-04-09
status: accepted
legacy_id: ADR-015
---

### ADR-015: Introduce `@open-agent-toolkit/control-plane` as the read-only OAT state layer

- **Date:** 2026-04-09
- **Status:** accepted
- **Drivers:** OAT skills and future UI surfaces need a typed, reusable read layer for project state instead of repeated markdown parsing and ad hoc CLI-only aggregation.
- **Related:**
  - `.oat/projects/shared/control-plane-state-parsing/discovery.md`
  - `.oat/projects/shared/control-plane-state-parsing/design.md`
  - `.oat/repo/reference/legacy-pjm/backlog/items/control-plane-list-projects-summary-fast-path.md`

#### Context

Before this project, project-aware workflows repeatedly reimplemented the same bootstrap logic: resolve the active project, read several markdown artifacts, parse frontmatter, infer progress, and then route to the next skill. That made downstream consumers expensive to build and easy to drift.

At the same time, we wanted new JSON inspection commands and eventual UI consumers without tying the parsing layer directly to Commander command code.

#### Options Considered

1. Add project-state parsing directly inside `packages/cli`
2. Introduce a separate package that owns state parsing and recommendation while the CLI remains a thin consumer

#### Decision

Adopt option 2:

- Add `packages/control-plane/` as a private workspace package exporting typed project-state readers and recommendation logic.
- Keep the control plane read-only: it parses artifacts and returns structured data, but does not own config mutation, CLI formatting, or workflow execution.
- Keep the CLI as the user-facing layer that resolves config and exposes the structured surfaces through `oat project status`, `oat project list`, and `oat config dump`.

#### Consequences

- Positive:
  - Creates one reusable read surface for CLI, future dashboards, and other tooling.
  - Reduces repeated artifact parsing logic across workflow entry points.
  - Makes recommendation logic easier to test outside the CLI.
- Trade-offs:
  - Adds another package boundary to maintain.
  - Summary-oriented optimizations such as a faster `listProjects()` path should be justified by measurement rather than assumed.

---
