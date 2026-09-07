---
id: BL-260907-type-check-cli-test-files
title: Type-check CLI test files with a test-scoped tsconfig gate
status: open
priority: medium
scope: task
scope_estimate: M
labels:
  - testing
  - tooling
  - wave-5-followup
assignee: null
created: 2026-09-07T14:05:32.386Z
updated: 2026-09-07T14:05:32.386Z
associated_issues: []
external_plans: []
---

## Description

packages/cli test files are excluded from tsc (tsconfig exclude) and from type-aware oxlint (--ignore-pattern '\*_/_.test.ts'), so no repository gate type-checks tests; the wave-5 p06 review counted 614 pre-existing errors repo-wide and the p06 lane had to type-check its two new test files by hand. Add a test-only tsconfig (or an incremental allowlist) that CI runs, so a test that no longer compiles is caught before review.

## Acceptance Criteria

- [ ] A `pnpm type-check` (or a dedicated script CI runs) covers `packages/cli/src/**/*.test.ts`, either fully or through an allowlist that new test files must join
- [ ] The 614 pre-existing errors are triaged: fixed, or excluded by an explicit per-file allowlist with a comment, never by the blanket `exclude`
- [ ] The p06 skill-script-reference tests and the p04 gate receipt tests are in the covered set
