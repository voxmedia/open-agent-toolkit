---
id: DR-260131-defer-active-project-name-only
title: Defer active-project name-only migration until CLI owns project commands
date: 2026-01-31
status: accepted
legacy_id: ADR-004
---

### ADR-004: Defer active-project name-only migration until CLI owns project commands

- **Date:** 2026-01-31
- **Status:** accepted
- **Drivers:** Avoid cross-skill coordination risk while we start the CLI; keep dogfood stable; let the CLI become the canonical interface for project creation/selection.
- **Related:**
  - `.oat/repo/pjm/roadmap.md`
  - `.oat/repo/pjm/current-state.md`
  - `oat state refresh` CLI command (reads both formats)

#### Decision

For dogfood v1 (until CLI project commands exist):

- **Write format remains path-based:** `.oat/active-project` stores a full path.
- **Read behavior stays flexible for new tooling:** where safe, tooling may accept either:
  - full path (current canonical)
  - name-only (future), resolved via `{PROJECTS_ROOT}/{name}`
- **Migration is deferred:** we will not flip `.oat/active-project` to name-only writes until the CLI provides:
  - `oat project new/open` (or equivalent)
  - a coordinated rollout that updates all skills’ “resolve active project” logic first.

#### Consequences

- Positive:
  - Reduces risk of “wrong project” behavior while we iterate quickly.
  - Keeps the pointer migration aligned with the CLI architecture.
- Trade-offs:
  - Path pointers can break if `{PROJECTS_ROOT}` moves; users may need to re-open the project.

---
