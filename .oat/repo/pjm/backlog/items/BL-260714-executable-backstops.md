---
id: BL-260714-executable-backstops
title: 'Executable backstops for contract claims — authoring guidance'
status: open # open | in_progress | closed | wont_do
priority: medium # urgent | high | medium | low | none
scope: task # idea | task | feature | initiative
scope_estimate: S # XS | S | M | L | XL | XXL
labels: [skill-authoring, contract-tests, guidance]
assignee: null
created: '2026-07-14T02:50:00Z'
updated: '2026-07-14T02:50:00Z'
associated_issues:
  [
    { type: project, ref: 'cursor-cloud-autonomous-projects' },
    { type: project, ref: 'orchestration-run-log' },
  ]
external_plans: [] # repo-relative .oat/repo/reference/external-plans/*.md paths
oat_template: false
oat_template_name: backlog-item
---

## Description

Three independent detections of the same failure class show that prose-only
exhaustiveness/invariant claims in skills and companion docs rot silently: the
autonomy gate inventory drifted 43 prompt sites within its own authoring phase
(now backstopped by `packages/cli/src/validation/autonomy-gate-inventory.test.ts`),
the `orchestration-run-log` design review forced its roll-up-before-archive
boundary out of skill prose into a testable CLI command (`oat project log
rollup`), and the pre-existing bundled-docs contract test caught the autonomy
contract shipping without its vendored copies. The lesson currently lives only
where each project happened to hit it. Generalize it into authoring guidance:
a standing invariant claimed by a skill or companion doc ("every X is
inventoried", "Y always happens before Z") requires an executable backstop in
the same PR — a CI contract test for repo-static claims, or a CLI command with
a structured result for runtime/lifecycle claims — matched on stable identity
(file + semantic ID/content hash, never line numbers), with the maintenance
rule stated inside the artifact. Draft section text exists in the
`cursor-cloud-autonomous-projects` session discussion (2026-07-14) and can be
lifted nearly verbatim.

## Acceptance Criteria

- `create-oat-skill/SKILL.md` gains an "Executable Backstops for Contract
  Claims" section covering: claim classification (point-in-time baseline vs
  standing invariant), backstop selection by claim type (CI contract test vs
  CLI-owned check with structured result), stable-identity matching (no line
  numbers), same-commit maintenance rules stated in the artifact, and the
  same-PR rule (never ship the claim and backstop separately). Version bump +
  any pinned-version contract test updates in the same commit.
- `oat-project-design`'s error-handling/enforcement guidance gains a short
  echo of the rule so designs declare backstops for invariants they introduce
  (version bump likewise).
- Guidance cites the existing precedents (`autonomy-gate-inventory.test.ts`,
  `skills-bundled-docs-contract.test.ts`, `oat project log rollup`) as
  reference implementations.
- `pnpm oat:validate-skills` and the prose-contract suites pass; provider
  views regenerated via `oat sync --scope project`.
