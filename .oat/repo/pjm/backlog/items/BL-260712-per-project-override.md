---
id: BL-260712-per-project-override
title: 'Per-project override to disable configured external gates'
status: open # open | in_progress | closed | wont_do
priority: medium # urgent | high | medium | low | none
scope: feature # idea | task | feature | initiative
scope_estimate: M # XS | S | M | L | XL | XXL
labels: [workflow-gates, configuration, ux]
assignee: null
created: '2026-07-12T20:57:00Z'
updated: '2026-08-30T23:55:32Z'
associated_issues: []
external_plans:
  - .oat/repo/reference/external-plans/2026-08-30-disable-configured-gates-per-project.md
---

## Description

Skill lifecycle gates (`workflow.gates.skills`, keyed by gate-aware skill —
e.g. the plan gate on `oat-project-plan` and the final implementation gate on
`oat-project-implement`) are configured at config layers only. A user with
gates configured who wants to skip them for one project must edit shared
configuration and remember to restore it. There is no project-scoped lever
that says "gates are configured here, but disabled for this project."

Phase review gates already have the desired mechanism: `oat_phase_review_gate`
is per-project plan frontmatter, populated by an interactive choice
(all phases / selected phases / disabled) during plan writing. This item
extends the same posture to skill lifecycle gates.

### Design refinements (2026-07-12 discussion)

- **Ask before the plan is written.** Gate posture affects planning, so the
  prompt belongs in project setup before plan writing — in `oat-project-
quick-start`, `oat-project-plan`, and `oat-project-import-plan` preflight,
  adjacent to the existing phase-gate setup step. Present one combined "gate
  posture" step: list which skill gates are configured for this repo (by
  gate-aware skill name), let the user keep or disable each **per gate**
  (plan gate and implementation gate independently), then run the existing
  phase-gate choice. No new prompt when no skill gates are configured.
- **Per-gate granularity.** Opting out is per gate-aware skill, not
  all-or-nothing.
- **Persistence:** project `state.md` frontmatter, overrides only — absence
  means follow configuration:

  ```yaml
  oat_skill_gate_overrides:
    oat-project-plan: disabled
  ```

- **Enforcement:** the gate execution step in gate-aware skills (and/or
  `oat gate`) resolves config, then applies the project override. A disabled
  gate records explicit evidence — configured-but-disabled by project
  override, with source — distinct from "no gate configured." It must never
  present as a passed or missing gate.
- **Non-interactive runs:** default to configured behavior; never silently
  disable.
- **Status surfacing:** progress/status output shows the override so
  reviewers see gates were deliberately disabled for the project.
- **Forward compatibility, explicitly out of scope:** planned design gates
  for fully autonomous runs will use a different disable mechanism. Keying
  overrides by gate-aware skill name keeps this shape from blocking that
  work, but this item must not attempt to design it.

Origin: 2026-07-12 wall-clock cost review of the oat-project-fixture
hardening work — external gates are the largest remaining time cost after
the phase-agent topology restoration ("if you have the configuration set for
external gates but want to disable it for a specific project, you shouldn't
have to modify your config just to disable it for one project").

## Acceptance Criteria

- A gate-posture step runs before plan writing in quick-start, plan, and
  import-plan flows when at least one skill gate is configured, offering
  per-gate keep/disable for this project
- Overrides persist in project `state.md` frontmatter
  (`oat_skill_gate_overrides`, overrides only), without modifying user/global
  gate configuration
- Gate execution honors the override and records the configured-but-disabled
  state as explicit evidence, distinct from "no gate configured"
- Non-interactive resolution never silently disables a configured gate
- Progress/status output surfaces active overrides
- Phase review gates keep their existing `oat_phase_review_gate` mechanism
  (no regression; the two setup steps may be presented together)
- Documentation updated (workflow-gates page and relevant project-config
  docs), with the future autonomous-run design-gate mechanism noted as
  separate
- Contract tests updated; skill version bumps and five-package lockstep bump
  with `pnpm release:validate` passing
