---
id: DR-260217-introduce-oat-config-json
title: Introduce `.oat/config.json` for new non-sync settings and phase broader
  consolidation
date: 2026-02-17
status: accepted
legacy_id: ADR-010
---

### ADR-010: Introduce `.oat/config.json` for new non-sync settings and phase broader consolidation

- **Date:** 2026-02-17
- **Status:** accepted
- **Drivers:** Avoid configuration-file sprawl in `.oat/` while preserving backward compatibility for active workflow skills.
- **Related:**
  - `.oat/repo/reference/external-plans/2026-02-17-oat-worktree-bootstrap-and-config-consolidation.md`
  - `.oat/projects/shared/oat-worktree-bootstrap-and-config-consolidation/`
  - `.oat/repo/pjm/backlog/index.md`
  - `.oat/sync/config.json`

#### Context

While defining the worktree skill, we needed a persisted root setting for worktree location. Adding another single-purpose pointer file (for example, `.oat/worktrees-root`) would increase `.oat/` surface fragmentation alongside existing pointer files.

At the same time, existing skill contracts depend on current pointer/sync files, so an immediate full migration to one unified config surface would be higher risk than needed for the current scope.

#### Options Considered

1. Add another single-purpose text file (for example, `.oat/worktrees-root`)
2. Introduce `.oat/config.json` now for new non-sync settings and keep existing files stable
3. Immediately migrate all `.oat` pointers/config to a single consolidated config file

#### Decision

Adopt option 2:

- Introduce `.oat/config.json` as the canonical home for **new non-sync** repo-level settings.
- First key: `worktrees.root` (phase A).
- Do **not** add `.oat/worktrees-root`.
- Keep existing v1 files unchanged for now:
  - `.oat/active-project`
  - `.oat/active-idea`
  - `.oat/projects-root`
  - `.oat/sync/config.json`
- Track broader consolidation as phased follow-up backlog work (phase B/C), rather than forcing immediate migration.

#### Consequences

- Positive:
  - Prevents continued growth of one-off text files for new settings.
  - Creates a clear path to eventual consolidation without breaking current skills.
  - Keeps worktree feature scope contained while still improving config hygiene.
- Negative / trade-offs:
  - OAT config remains split across multiple files during transition.
  - Requires clear docs to avoid ambiguity about which file owns which setting.

#### Follow-ups

- Add/maintain phased backlog work for broader config consolidation.
- Define migration sequencing and compatibility reads before moving existing pointers into `.oat/config.json`.
- Revisit whether sync config should remain under `.oat/sync/config.json` or move in a future CLI-owned migration.

---
