# OAT Decision Record (Internal / Dogfood)

Track notable decisions made while evolving OAT in this repo, so future sessions have quick, reliable context.

## Decision Index

| ID | Date | Status | Title |
|----|------|--------|-------|
| ADR-001 | 2026-01-30 | accepted | Keep `.oat/active-project` path-based for dogfood v1; defer name-only migration |

## Decisions

### ADR-001: Keep `.oat/active-project` path-based for dogfood v1; defer name-only migration

- **Date:** 2026-01-30
- **Status:** accepted
- **Drivers:** Avoid breaking existing skills that assume `.oat/active-project` contains a full path; keep dogfood v1 stable while we iterate on projects-root and multi-project workflows.
- **Related:**
  - `.oat/internal-project-reference/deferred-phases.md`
  - `.oat/projects-root`

#### Context

We considered migrating `.oat/active-project` from storing a full project path to storing only a project name (resolved at runtime via `{PROJECTS_ROOT}/{name}`).

However, existing `oat-*` skills currently read `.oat/active-project` as a path. Flipping the write format in one place would silently break other skills and create hard-to-debug “wrong project” behavior.

#### Options Considered

1. **Write name-only now** and update only the new tooling to support it
2. **Keep writing path** for dogfood v1, allow new tooling to read both formats, and treat name-only migration as a coordinated follow-up

#### Decision

For dogfood v1:
- **Canonical write format:** `.oat/active-project` stores a **full path** to the active project directory.
- **Read behavior (new tooling):** May accept either:
  - Legacy full path (canonical for v1)
  - Name-only (future), resolved via `.oat/projects-root` / `OAT_PROJECTS_ROOT`
- **Migration:** Name-only becomes a separate coordinated update that must update every skill’s “resolve active project” logic before flipping writes.

#### Consequences

- Positive:
  - Prevents breaking existing skills during dogfooding.
  - Enables incremental adoption of projects-root and future pointer formats.
- Negative / trade-offs:
  - If `{PROJECTS_ROOT}` changes, existing path pointers may become invalid until user re-selects/clears the active project.
  - Name-only pointer benefits (root-stable pointer) are delayed until the coordinated migration ships.

#### Follow-ups

- When ready, implement a coordinated name-only migration:
  - Centralize “resolve active project” logic (or update all skills consistently)
  - Flip `.oat/active-project` writes to name-only only after the read side is fully updated
  - Document the migration and compatibility window

## ADR Template

### ADR-XXX: {Title}

- **Date:** YYYY-MM-DD
- **Status:** proposed \| accepted \| superseded
- **Drivers:** {why this decision matters}
- **Related:** {links to commits, PRs, docs, feedback}

#### Context

{What problem are we solving? What constraints matter?}

#### Options Considered

1. {Option A}
2. {Option B}

#### Decision

{What we decided. Be explicit.}

#### Consequences

- Positive:
- Negative / trade-offs:

#### Follow-ups

- {Concrete next steps}
