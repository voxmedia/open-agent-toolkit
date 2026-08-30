---
id: DR-260222-adopt-config-local-lifecycle
title: Adopt config-local lifecycle state for active/paused project context
date: 2026-02-22
status: accepted
legacy_id: ADR-012
---

### ADR-012: Adopt config-local lifecycle state for active/paused project context

- **Date:** 2026-02-22
- **Status:** accepted
- **Supersedes:** ADR-001, ADR-004
- **Drivers:** Remove pointer-file churn, support worktree-safe project context, and align lifecycle state with CLI-managed config interfaces.
- **Related:**
  - `.oat/repo/reference/external-plans/b15-b02-project-lifecycle-config-consolidation.md`
  - `.oat/config.json`
  - `.oat/config.local.json`
  - `packages/cli/src/config/oat-config.ts`

#### Context

Earlier ADRs intentionally kept `.oat/active-project` path-based while deferring migration until CLI project commands existed. With `oat config` and lifecycle commands now in place, continuing to treat pointer files as primary state would keep dual representations and increase drift risk, especially across worktrees.

#### Options Considered

1. Keep pointer files as canonical and read config as optional compatibility
2. Move lifecycle state to config files and retain temporary fallback reads
3. Move lifecycle state to config files and remove pointer fallbacks after migration

#### Decision

Adopt option 3:

- Canonical per-developer lifecycle state is now `.oat/config.local.json`:
  - `activeProject`
  - `lastPausedProject`
- Canonical shared projects root is `.oat/config.json`:
  - `projects.root`
- Paths are stored repo-relative to keep worktree propagation portable.
- Active-idea pointers remain file-based (`.oat/active-idea`) as an explicit follow-up scope.
- Legacy `.oat/active-project` and `.oat/projects-root` fallback behavior is removed from migrated command paths.

#### Consequences

- Positive:
  - One lifecycle source of truth for active/paused project context.
  - Better portability across worktrees with repo-relative local config values.
  - Cleaner command/skill interfaces via `oat config get/set/list`.
- Negative / trade-offs:
  - Legacy pointer files become inert and can confuse users if manually inspected.
  - Active-idea remains on separate storage semantics until a future migration.

#### Follow-ups

- Track active-idea migration (`.oat/active-idea` / `~/.oat/active-idea`) as separate scoped work.
- Keep docs and skills aligned on config-first lifecycle reads/writes.

---
