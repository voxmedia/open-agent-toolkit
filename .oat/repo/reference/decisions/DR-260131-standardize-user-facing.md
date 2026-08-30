---
id: DR-260131-standardize-user-facing
title: Standardize user-facing progress indicators in OAT skills
date: 2026-01-31
status: accepted
legacy_id: ADR-002
---

### ADR-002: Standardize user-facing progress indicators in OAT skills

- **Date:** 2026-01-31
- **Status:** accepted
- **Drivers:** Reduce “silent work” confusion during dogfooding; make long-running skills feel alive; align with GSD-style UX without adding noise.
- **Related:**
  - `.oat/repo/archive/workflow-user-feedback.md`
  - `.oat/repo/reference/legacy-pjm/current-state.md`

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
