---
id: BL-261002-settle-dispatch-policy
title: Settle dispatch policy precedence and stop legacy presets overwriting
  ladder columns
status: open
priority: medium
scope: task
scope_estimate: M
labels:
  - dispatch
  - config
  - skills
  - docs-overhaul-followup
assignee: null
created: 2026-10-02T18:40:58.502Z
updated: 2026-10-02T18:40:58.502Z
associated_issues: []
external_plans: []
---

## Description

- **C2.** An explicit dispatch policy in any config scope (user, shared or
  local) overrides the policy each project chose in `state.md`:
  `resolveCeilingValue` uses `configCeiling ?? projectCeiling`
  (`dispatch-ceiling/index.ts:2558`; preflight reporting at `:2322-2324`;
  pinned by `index.test.ts:529`). "Explicit" means `mode=inherit`, or
  `mode=managed` plus a valid `policy`; a legacy bare
  `providers.<provider>` scalar also wins. Meanwhile the plan and quick-start
  skills (`oat-project-plan/SKILL.md:430-437`,
  `oat-project-quick-start/SKILL.md:678-684`) ask the user for a policy, save
  it in `state.md`, and describe config as only "a proposed starting value".
- **C3.** `oat config set workflow.dispatchCeiling.preset <name>` writes bare
  scalar `codex`/`claude` values into that scope's `providers`
  (`commands/config/index.ts:1949-1967`), overwriting the ladder columns
  (Cursor untouched); a scalar at a layer also wipes lower-layer tier cells
  for that provider (`index.ts:856-858`), and with the legacy scalar winning,
  exact model candidates are refused (`index.ts:2594-2599`).

Why it matters: a user who answers the planning question gets a different
policy at implementation time if anyone set a config value, with no message;
setting a legacy preset quietly disables exact model selection.

Confirmed by reading source (not run). Evidence:
`.oat/projects/shared/docs-improvement-overhaul/references/fable-lanes/verification/B-dispatch-policy-autonomy.verify.md`
(findings B1, S13, (a), (d)).

Source: product defect list `.oat/projects/shared/docs-improvement-overhaul/references/product-defects-found.md` (docs-improvement-overhaul project, 2026-10-02), entry C2, C3.

## Acceptance Criteria

- The intended precedence between config scopes and project `state.md` is
  decided (recorded as a decision if it changes behavior) and the resolver,
  preflight reporting, the plan and quick-start skills, and the implement
  skill all state and follow the same order.
- When a config value overrides a project's saved choice, planning and
  implementation say so instead of silently using the config value.
- Setting the legacy preset no longer destroys ladder columns or tier cells
  (it either maps to named tiers or is rejected with a pointer to the
  current keys); a test proves exact selection still works afterwards.
- Changed skills get `metadata.version` bumps; the precedence warning on the
  docs branch `docs-overhaul-readme-visual` (`workflows/advanced/dispatch-ceiling.md:631` and `:642-647`) is
  updated or removed to match.
