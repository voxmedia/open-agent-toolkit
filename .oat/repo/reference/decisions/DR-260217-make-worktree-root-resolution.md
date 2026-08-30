---
id: DR-260217-make-worktree-root-resolution
title: Make worktree-root resolution deterministic and default `worktrees.root`
  to repo-local `.worktrees`
date: 2026-02-17
status: accepted
legacy_id: ADR-011
---

### ADR-011: Make worktree-root resolution deterministic and default `worktrees.root` to repo-local `.worktrees`

- **Date:** 2026-02-17
- **Status:** accepted
- **Drivers:** Remove ambiguity in worktree root selection and keep default worktree artifacts isolated to the repo by default.
- **Related:**
  - `.agents/skills/oat-worktree-bootstrap/SKILL.md`
  - `.oat/config.json`
  - `.oat/repo/pjm/current-state.md`

#### Context

The initial worktree bootstrap contract allowed multiple candidate roots, but did not make "first match wins" ordering explicit. In mixed environments (for example, both repo-local and sibling worktree roots existing), this made behavior harder to predict and explain.

We also needed a stable default for `worktrees.root` after introducing `.oat/config.json` phase-A ownership.

#### Options Considered

1. Keep loosely-defined candidate scanning and rely on implementation detail ordering
2. Define strict ordered precedence and stop at first match; set repo-local default
3. Require explicit `--path` for all worktree operations

#### Decision

Adopt option 2:

- Define strict precedence for worktree root resolution in `oat-worktree-bootstrap`:
  1. `--path`
  2. `OAT_WORKTREES_ROOT`
  3. `.oat/config.json` -> `worktrees.root`
  4. first existing root in ordered candidates (`.worktrees`, `worktrees`, `../<repo>-worktrees`)
  5. fallback `../<repo>-worktrees`
- Treat precedence level 4 as ordered first-match behavior (no continued scanning after a match).
- Set repo default `worktrees.root` to `.worktrees`.

#### Consequences

- Positive:
  - Predictable root selection across environments.
  - Better local isolation by default (`.worktrees` under repo root).
  - Clearer docs and fewer bootstrap surprises.
- Negative / trade-offs:
  - Repo-local defaults require ignore hygiene for `.worktrees` in repositories that track strict clean status.
  - Teams with existing sibling-root conventions may need to override via config/env/flag.

#### Follow-ups

- Keep current-state/roadmap docs aligned with the precedence contract.
- Preserve non-breaking override paths (`--path`, env, config) for repos with different conventions.

---
