---
id: DR-260214-use-skill-first-invocation
title: Use skill-first invocation language; treat `/oat:*` as optional host alias
date: 2026-02-14
status: accepted
legacy_id: ADR-005
---

### ADR-005: Use skill-first invocation language; treat `/oat:*` as optional host alias

- **Date:** 2026-02-14
- **Status:** accepted
- **Drivers:** Reduce cross-client confusion and workflow drift. Slash-style invocations (`/oat:*`) are not guaranteed across hosts, while skill names (`oat-*`) are the canonical workflow contract.
- **Related:**
  - `.oat/templates/plan.md`
  - `.oat/repo/pjm/roadmap.md`
  - `.oat/repo/pjm/backlog/index.md`

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

---
