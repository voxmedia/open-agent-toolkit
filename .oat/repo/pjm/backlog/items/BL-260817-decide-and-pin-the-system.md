---
id: BL-260817-decide-and-pin-the-system
title: Decide and pin the system-Chromium requirement introduced by test:skills
  on the merge path
status: open
priority: medium
scope: task
scope_estimate: S
labels:
  - ci
  - testing
assignee: null
created: 2026-08-17T12:38:19.590Z
updated: 2026-08-17T12:38:19.590Z
associated_issues: []
external_plans: []
---

## Description

p07-t05 wired `.agents/skills/*/tests/*.test.mjs` into `pnpm test`, and the skill glob's golden benchmarks degrade gracefully without Playwright browsers — but they exercise system Chromium when present, making an unpinned system browser an implicit merge-gate dependency. The CI-safety check that cleared the glob neutralized Playwright rather than system Chrome, so it could not have detected this. Decide the policy: pin a browser provisioning step in CI, or make the benchmarks skip explicitly unless a browser is declared. Deferred from explainer-improvements-v2 because it is a CI environment policy call. Source: final-review-2026-08-17T064111Z.md Medium 7.

## Acceptance Criteria

- {Outcome 1}
- {Outcome 2}
