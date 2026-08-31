---
id: DR-260216-centralize-spec-driven-quick
title: Centralize spec-driven/quick/import plan semantics in
  `oat-project-plan-writing`
date: 2026-02-16
status: accepted
legacy_id: ADR-009
---

### ADR-009: Centralize spec-driven/quick/import plan semantics in `oat-project-plan-writing`

- **Date:** 2026-02-16
- **Status:** accepted
- **Drivers:** Plan-writing logic diverged across skills and required repeated fixes when routing/review semantics changed.
- **Related:**
  - `.agents/skills/oat-project-plan-writing/SKILL.md`
  - `.agents/skills/oat-project-plan/SKILL.md`
  - `.agents/skills/oat-project-quick-start/SKILL.md`
  - `.agents/skills/oat-project-import-plan/SKILL.md`
  - `.agents/skills/oat-project-review-receive/SKILL.md`

#### Context

Spec-driven planning, quick-mode planning, and imported-plan normalization all touched `plan.md` with overlapping but non-identical rules. This increased drift risk and made mode-aware routing hard to keep consistent.

#### Options Considered

1. Keep per-skill duplicated plan-writing instructions
2. Introduce a canonical shared plan-writing skill and reference it from dependent skills
3. Move plan writing to ad-hoc scripts without a documented contract

#### Decision

Adopt option 2:

- Add `oat-project-plan-writing` as the canonical plan contract for `spec-driven|quick|import` modes.
- Update dependent skills to route through/shared-reference this contract.
- Standardize plan status transitions and mode-aware guardrails (including resume behavior and stop-and-route semantics).

#### Consequences

- Positive:
  - Single source of truth for plan semantics.
  - Faster updates when mode contracts evolve.
  - Reduced inconsistency across planning/import/review flows.
- Negative / trade-offs:
  - Adds one more dependency skill to maintain.
  - Requires discipline so future skills do not reintroduce duplicated plan rules.

#### Follow-ups

- Keep `oat-project-plan-writing` coverage in skill validation checks.
- Continue aligning downstream skills when plan metadata contracts evolve.

---
