---
id: DR-260131-add-create-oat-skill-to-keep
title: Add `create-oat-skill` to keep OAT skill conventions consistent
date: 2026-01-31
status: accepted
legacy_id: ADR-003
---

### ADR-003: Add `create-oat-skill` to keep OAT skill conventions consistent

- **Date:** 2026-01-31
- **Status:** accepted
- **Drivers:** Avoid convention drift across new `oat-*` skills; keep skill authoring consistent without duplicating the entire `create-agnostic-skill` guidance.
- **Related:**
  - `.agents/skills/create-skill/SKILL.md`
  - `.agents/skills/create-oat-skill/SKILL.md`

#### Decision

Add a `create-oat-skill` skill as a specialization of `create-agnostic-skill`:

- `create-oat-skill` explicitly references baseline guidance from `create-agnostic-skill`.
- It adds OAT-specific requirements via a template (banner separators, progress indicators, `{PROJECTS_ROOT}` + `.oat/active-project` resolution, and safe bash patterns).

#### Consequences

- Positive:
  - Faster, more consistent creation of new OAT skills.
  - Less copy/paste of conventions into every new skill.
- Trade-offs:
  - Two “skill creation” skills exist; users need simple routing guidance (e.g., “if it’s an `oat-*` skill, use `create-oat-skill`”).

---
