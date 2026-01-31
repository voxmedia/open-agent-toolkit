# OAT Decision Record (Internal / Dogfood)

Track notable decisions made while evolving OAT in this repo, so future sessions have quick, reliable context.

## Decision Index

| ID | Date | Status | Title |
|----|------|--------|-------|
| ADR-001 | 2026-01-30 | accepted | Keep `.oat/active-project` path-based for dogfood v1; defer name-only migration |
| ADR-002 | 2026-01-31 | accepted | Standardize user-facing progress indicators in OAT skills |
| ADR-003 | 2026-01-31 | accepted | Add `create-oat-skill` to keep OAT skill conventions consistent |

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

---

### ADR-002: Standardize user-facing progress indicators in OAT skills

- **Date:** 2026-01-31
- **Status:** accepted
- **Drivers:** Reduce “silent work” confusion during dogfooding; make long-running skills feel alive; align with GSD-style UX without adding noise.
- **Related:**
  - `.oat/internal-project-reference/temp/workflow-user-feedback.md`
  - `.oat/internal-project-reference/current-state.md`

#### Decision

OAT skills should provide lightweight, consistent progress feedback:
- A prominent **separator banner** at the start of the skill: `OAT ▸ {LABEL}`
- A small number of **step indicators** (2–5) for multi-step work (finalize/commit paths)
- For **long-running operations** (tests, builds, large diffs, subagents), print a brief “starting…” line and a matching “done” line (duration optional)

#### Consequences

- Positive:
  - Users can tell the workflow is progressing after they confirm.
  - Improves trust without forcing verbose per-command logging.
- Trade-offs:
  - This is guidance only; enforcement requires linting/validation later if we want stronger guarantees.

---

### ADR-003: Add `create-oat-skill` to keep OAT skill conventions consistent

- **Date:** 2026-01-31
- **Status:** accepted
- **Drivers:** Avoid convention drift across new `/oat:*` skills; keep skill authoring consistent without duplicating the entire `create-skill` guidance.
- **Related:**
  - `.agent/skills/create-skill/SKILL.md`
  - `.agent/skills/create-oat-skill/SKILL.md`

#### Decision

Add a `create-oat-skill` skill as a specialization of `create-skill`:
- `create-oat-skill` explicitly references baseline guidance from `create-skill`.
- It adds OAT-specific requirements via a template (banner separators, progress indicators, `{PROJECTS_ROOT}` + `.oat/active-project` resolution, and safe bash patterns).

#### Consequences

- Positive:
  - Faster, more consistent creation of new OAT skills.
  - Less copy/paste of conventions into every new skill.
- Trade-offs:
  - Two “skill creation” skills exist; users need simple routing guidance (e.g., “if it’s an `oat-*` skill, use `create-oat-skill`”).

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
