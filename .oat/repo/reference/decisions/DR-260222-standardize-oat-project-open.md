---
id: DR-260222-standardize-oat-project-open
title: Standardize `oat project open/pause` lifecycle semantics
date: 2026-02-22
status: accepted
legacy_id: ADR-013
---

### ADR-013: Standardize `oat project open/pause` lifecycle semantics

- **Date:** 2026-02-22
- **Status:** accepted
- **Drivers:** Provide a consistent operator model for activate/switch/pause/resume flows without introducing redundant commands.
- **Related:**
  - `packages/cli/src/commands/project/open/index.ts`
  - `packages/cli/src/commands/project/pause/index.ts`
  - `packages/cli/src/commands/state/generate.ts`
  - `.oat/repo/reference/external-plans/b15-b02-project-lifecycle-config-consolidation.md`

#### Context

Lifecycle interactions previously depended on direct pointer edits and ambiguous pause behavior. We needed deterministic semantics that work for both command consumers and dashboard guidance.

#### Options Considered

1. Separate commands for open/switch/resume with independent state handling
2. Single `open` command for activate/switch/resume plus `pause` for suspension with contextual pointer clearing
3. Keep pointer-level workflows and treat pause as UI-only metadata

#### Decision

Adopt option 2:

- `oat project open <name>` handles:
  - fresh activation
  - switching from another active project
  - resuming paused projects (clears paused frontmatter state)
- `oat project pause [name]` writes pause metadata to target project `state.md`.
- Pointer clearing occurs only when paused project matches current `activeProject`; when cleared, `lastPausedProject` is recorded for dashboard resume guidance.
- Resume guidance surfaces through dashboard/state generation using `lastPausedProject`.

#### Consequences

- Positive:
  - Simple lifecycle mental model: open to activate/resume, pause to suspend.
  - Deterministic behavior for named-project pause vs active-project pause.
  - Dashboard can guide next action even with no active project.
- Negative / trade-offs:
  - Pause metadata now influences both state frontmatter and local config fields.
  - Users expecting dedicated `resume`/`switch` verbs must adapt to `open` behavior.

#### Follow-ups

- Keep help text and skill wrappers aligned with open/pause semantics.
- Preserve regression coverage for pause/open + dashboard next-step behavior.
