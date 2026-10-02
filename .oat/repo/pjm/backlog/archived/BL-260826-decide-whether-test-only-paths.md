---
id: BL-260826-decide-whether-test-only-paths
title: Decide whether test-only paths under packages/cli/src count as publishable
status: closed
priority: low
scope: task
scope_estimate: S
labels:
  - release
  - policy
  - wave-2-follow-up
assignee: null
created: 2026-08-26T22:57:19.711Z
updated: '2026-10-01T19:47:56Z'
associated_issues: []
external_plans: []
---

## Description

versionPolicyIgnorePatterns for packages/cli is only assets/\*_, so a change limited to _.test.ts under packages/cli/src forces the five-package lockstep bump (wave 1 carried 0.2.32 -> 0.2.33 for test files; DR-260826-wave-level-lockstep-bump). Decide whether test-only paths should be version-policy-ignored, and document the outcome in AGENTS.md.

Decided 2026-09-27 in `DR-260927-test-only-paths-skip`.

## Acceptance Criteria

- `versionPolicyIgnorePatterns` for each public package equals its tsconfig test exclusion (per `DR-260927-test-only-paths-skip`), and a contract test fails when they diverge.
- A branch whose only change is a `packages/cli/src/**/*.test.ts` file passes `pnpm release:check-versions` without a lockstep bump; a change to a non-test `src` file still requires one (negative control).
- AGENTS.md Package Management states the rule.
