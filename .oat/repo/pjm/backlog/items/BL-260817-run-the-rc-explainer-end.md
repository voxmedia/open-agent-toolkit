---
id: BL-260817-run-the-rc-explainer-end
title: Run the RC explainer end-to-end test in CI with a provisioned browser
status: open
priority: medium
scope: task
scope_estimate: M
labels:
  - ci
  - release
  - explainer-kit
assignee: null
created: 2026-08-17T12:38:19.416Z
updated: 2026-08-17T12:38:19.416Z
associated_issues: []
external_plans: []
---

## Description

The RC release lane's only always-on catalog assertion is tautological, and its compensating end-to-end test (`tools/release/run-explainer-rc.integration.test.mjs`) is permanently skipped in CI because CI installs no browsers and `validate-explainer-visuals.test.mjs` needs Playwright's chrome-headless-shell. The tautology itself is being fixed in explainer-improvements-v2 (final-fix-003); this item covers the CI half: decide on and provision a browser-install step (or a pinned Playwright cache) so the end-to-end RC test actually runs on the merge path. Deferred from the project because it is a CI environment decision, not a code fix. Source: final-review-2026-08-17T064111Z.md Medium 6.

## Acceptance Criteria

- {Outcome 1}
- {Outcome 2}
