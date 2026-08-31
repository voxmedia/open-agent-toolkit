---
id: BL-260818-require-repo-wide-call-site
title: Require repo-wide call-site sweeps for cross-cutting options in
  phase-implementer guidance
status: open
priority: medium
scope: task
scope_estimate: S
labels:
  - skills
  - workflow
  - implementation
assignee: null
created: 2026-08-18T00:01:03.100Z
updated: 2026-08-31T00:11:26Z
associated_issues: []
external_plans:
  - .oat/repo/reference/external-plans/2026-08-30-require-repo-wide-call-site-sweeps.md
---

## Description

In explainer-improvements-v2, a cross-cutting option (publicAccess on catalogFromManifest) was threaded only within the task's declared file boundary; the four files carrying the resulting protected-mode durability regression were exactly the four outside commit 6f20182cd's diff, and two self-consistent fixtures concealed it. Add guidance to the phase-implementer contract (canonical skill content — .agents/agents/oat-phase-implementer.md and/or oat-project-implement/references/phase-execution.md, with required version bumps): when a task adds or changes an option consumed across module boundaries, enumerate every call site repo-wide and either widen the boundary mechanically or stop for direction. A declared file boundary is a review scope, not a correctness scope. Related (different mechanism): BL-260706-front-load-recurring-gate covers front-loading recurring gate-finding classes into briefs generally. Source: explainer-improvements-v2 retro RP-05.

## Acceptance Criteria

- The phase-implementer contract names the repo-wide call-site sweep obligation for cross-cutting option changes, with the widen-or-stop rule.
- Changed canonical skills carry version bumps per the repo rule.
- Provider views regenerate cleanly (oat sync --scope all).

## Acceptance Criteria

- {Outcome 1}
- {Outcome 2}
