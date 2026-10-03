---
id: BL-261002-port-the-complexity-review
title: Port the complexity-review skill into an OAT pack
status: open
priority: medium
scope: task
scope_estimate: M
labels:
  - skills
  - review
assignee: null
created: 2026-10-02T11:58:15.066Z
updated: 2026-10-02T11:58:15.066Z
associated_issues: []
external_plans: []
---

## Description

Wave 4 (2026-10-02) wires a complexity review into every review and gate
budget-exhaustion point (`BL-261001-run-a-complexity-review-when`). The
`complexity-review` skill lives only in the operator's personal
`tkstang/skills` repository, so Wave 4 probes for an installed copy and ships a
condensed version of its guidance in the OAT skill references as the fallback
(operator decision, 2026-10-02). OAT users without the personal skill
therefore get a reduced review, and the condensed guidance can drift from the
source skill.

Port `complexity-review` into an OAT pack so the behavior is the same for
every OAT user, then remove the condensed fallback. Record the source and
attribution in `NOTICES.md` if the port adapts external prose.

## Acceptance Criteria

- `complexity-review` ships in an OAT pack (choose the pack and record why),
  installs through `oat tools`, and passes `oat:validate-skills`.
- The lifecycle exhaustion points use the bundled skill; the condensed
  reference guidance from Wave 4 is removed or reduced to a pointer.
- Docs describe the skill and its pack; `NOTICES.md` records the source when
  external prose is adapted.
- Skill version bumps and the lockstep package bump ship in the same PR.
