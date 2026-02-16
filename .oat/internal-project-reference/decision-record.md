# OAT Decision Record (Internal / Dogfood)

Track notable decisions made while evolving OAT in this repo, so future sessions have quick, reliable context.

## Decision Index

| ID | Date | Status | Title |
|----|------|--------|-------|
| ADR-001 | 2026-01-30 | accepted | Keep `.oat/active-project` path-based for dogfood v1; defer name-only migration |
| ADR-002 | 2026-01-31 | accepted | Standardize user-facing progress indicators in OAT skills |
| ADR-003 | 2026-01-31 | accepted | Add `create-oat-skill` to keep OAT skill conventions consistent |
| ADR-004 | 2026-01-31 | accepted | Defer active-project name-only migration until CLI owns project commands |
| ADR-005 | 2026-02-14 | accepted | Use skill-first invocation language; treat `/oat:*` as optional host alias |

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
- **Drivers:** Avoid convention drift across new `oat-*` skills; keep skill authoring consistent without duplicating the entire `create-skill` guidance.
- **Related:**
  - `.agents/skills/create-skill/SKILL.md`
  - `.agents/skills/create-oat-skill/SKILL.md`

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

---

### ADR-004: Defer active-project name-only migration until CLI owns project commands

- **Date:** 2026-01-31
- **Status:** accepted
- **Drivers:** Avoid cross-skill coordination risk while we start the CLI; keep dogfood stable; let the CLI become the canonical interface for project creation/selection.
- **Related:**
  - `.oat/internal-project-reference/deferred-phases.md`
  - `.oat/internal-project-reference/current-state.md`
  - `.oat/scripts/generate-oat-state.sh` (already reads both formats)

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

### ADR-005: Use skill-first invocation language; treat `/oat:*` as optional host alias

- **Date:** 2026-02-14
- **Status:** accepted
- **Drivers:** Reduce cross-client confusion and workflow drift. Slash-style invocations (`/oat:*`) are not guaranteed across hosts, while skill names (`oat-*`) are the canonical workflow contract.
- **Related:**
  - `.oat/templates/plan.md`
  - `.oat/internal-project-reference/roadmap.md`
  - `.oat/internal-project-reference/backlog.md`

#### Context

OAT documentation and skill guidance frequently used slash command text as if universally available. In practice, slash commands depend on host/client wiring (for example, Codex may require prompt wrappers). This creates inconsistent operator expectations and avoidable friction.

#### Options Considered

1. Keep slash-first wording and document exceptions per host
2. Use skill-first wording everywhere, with slash command as optional alias where supported
3. Require wrapper generation for every host/client to preserve slash-first wording

#### Decision

Adopt option 2:
- **Canonical invocation contract:** skill names (for example, `oat-project-implement`).
- **Slash commands:** treated as optional host-specific aliases, documented only as "where slash prompts are supported."
- **Optional enhancement (not required):** support generation of thin Codex prompt wrappers (`.codex/prompts`) for users who explicitly opt in during skill sync.

#### Consequences

- Positive:
  - One clear invocation model across clients.
  - Lower risk of instructions failing in environments without slash-command wiring.
  - Cleaner separation between workflow semantics (skills) and host UX affordances (slash aliases).
- Negative / trade-offs:
  - Requires a docs/template/skill copy update sweep.
  - Short-term mixed wording may exist until migration is complete.

#### Follow-ups

- Update OAT templates, skills, and internal references to skill-first wording.
- Add a lightweight validation check to catch regressions to slash-only wording.
- Evaluate optional Codex wrapper generation after wording normalization lands.

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
