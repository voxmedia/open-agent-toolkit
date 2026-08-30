---
id: DR-260216-add-quick-import-workflow
title: Add quick/import workflow lanes with canonical plan normalization and
  mode-aware routing
date: 2026-02-16
status: accepted
legacy_id: ADR-006
---

### ADR-006: Add quick/import workflow lanes with canonical plan normalization and mode-aware routing

- **Date:** 2026-02-16
- **Status:** accepted
- **Drivers:** Support lower-touch execution for plan-first workflows from providers (Codex/Cursor/Claude) while preserving OAT state and review/PR tooling.
- **Related:**
  - `.agents/skills/oat-project-quick-start/SKILL.md`
  - `.agents/skills/oat-project-import-plan/SKILL.md`
  - `.agents/skills/oat-project-promote-spec-driven/SKILL.md`
  - `.oat/templates/state.md`
  - `.oat/templates/plan.md`

#### Context

OAT's spec-driven lifecycle (`discover -> spec -> design -> plan -> implement`) provides strong structure but is heavy for quick changes and externally-authored plans. We need a lightweight path that still keeps `plan.md`/`implementation.md`/`state.md` as the system of record.

#### Options Considered

1. Keep spec-driven lifecycle only (no quick/import support)
2. Add quick/import entry lanes that normalize into canonical OAT `plan.md`
3. Keep imported provider plans as non-canonical artifacts and teach all downstream skills new formats

#### Decision

Adopt option 2:

- Add `oat-project-quick-start` for quick lane projects.
- Add `oat-project-import-plan` for external markdown plan ingestion.
- Preserve imported source at `references/imported-plan.md`; canonical execution artifact remains `plan.md`.
- Add `oat-project-promote-spec-driven` for in-place promotion to spec-driven lifecycle.
- Keep quick mode discovery-first: synthesize/backfill `discovery.md` from session context and only create a separate `design.md` when the available technical detail justifies it.
- Introduce metadata:
  - `state.md`: `oat_workflow_mode` (`spec-driven|quick|import`), `oat_workflow_origin` (`native|imported`)
  - `plan.md`: `oat_plan_source` (`spec-driven|quick|imported`) plus import traceability fields.
- Make `oat-project-progress`, review, PR, and dashboard recommendations mode-aware.

#### Consequences

- Positive:
  - Lower setup friction for quick and imported workflows.
  - Reuses existing implementation/review/PR machinery.
  - Maintains a single canonical plan format for downstream skills.
- Trade-offs:
  - Mode-aware branching increases contract complexity across skills.
  - Quick/import projects may have reduced assurance when `spec.md`/`design.md` are absent.

#### Follow-ups

- Validate mode-aware behavior with dogfood projects.
- Consider thin CLI wrappers for quick/import project bootstrap after contracts stabilize.
- Keep optional provider-specific parsing enhancements deferred until demand warrants deeper normalization.

---
