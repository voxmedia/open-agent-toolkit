---
id: BL-261002-verify-local-scope-lifecycle
title: Verify local-scope lifecycle commits and empty HiLL phase defaults
status: open
priority: medium
scope: task
scope_estimate: S
labels:
  - lifecycle
  - skills
  - templates
  - docs-overhaul-followup
assignee: null
created: 2026-10-02T18:41:10.877Z
updated: 2026-10-02T18:41:10.877Z
associated_issues: []
external_plans: []
---

## Description

Two suspected defects, inferred from contract text and not yet verified:

- **E15.** Local-scope projects are gitignored, but lifecycle skills run
  `git add` on project files outside synced scope. That may fail (Git refuses
  to add ignored paths without `-f`) or stop the skill.
- **E16.** `.oat/templates/plan.md` may ship `oat_plan_hill_phases: []`, which
  autonomy would read as "every phase", so a plan that never chose checkpoints
  could pause at every phase.

Why it matters: if E15 holds, local-scope projects (the documented way to
keep project files out of Git) break lifecycle skills; if E16 holds, the
default checkpoint behavior differs from what users chose.

Unverified. Evidence:
`.oat/projects/shared/docs-improvement-overhaul/references/fable-lanes/verification/skill-guides-family-A.verify.md` (E15) and
`.oat/projects/shared/docs-improvement-overhaul/references/fable-lanes/verification/B-dispatch-policy-autonomy.verify.md` (E16).

Source: product defect list `.oat/projects/shared/docs-improvement-overhaul/references/product-defects-found.md` (docs-improvement-overhaul project, 2026-10-02), entry E15, E16.

## Acceptance Criteria

- Each suspicion is checked by running the branch CLI and the relevant skill
  steps in a scratch repository with an isolated HOME, and the result is
  recorded in this item.
- If E15 is confirmed: lifecycle skills skip Git staging for local-scope
  projects (or stage only tracked paths), with a test.
- If E16 is confirmed: the template's default and autonomy's reading of an
  empty list agree with the documented default, with a test.
- If either is refuted, close that part with the evidence.
