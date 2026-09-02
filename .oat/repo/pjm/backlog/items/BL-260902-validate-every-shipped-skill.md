---
id: BL-260902-validate-every-shipped-skill
title: Validate every shipped skill-to-script reference against its pack manifest
status: open
priority: high
scope: task
scope_estimate: M
labels:
  - tool-packs
  - skills
  - validation
  - tests
assignee: null
created: 2026-09-02T23:48:42.130Z
updated: 2026-09-02T23:49:54Z
associated_issues:
  - type: github
    ref: https://github.com/voxmedia/open-agent-toolkit/issues/199
external_plans: []
---

## Description

Commit 4eed6fa7 fixed the one broken tracking-helper reference reported in #199, but no contract test checks every script path named by every shipped skill against the owning pack manifest; `skills-bundled-docs-contract.test.ts` checks only `resolve-tracking.sh` and `bundle-consistency.test.ts` does not enumerate skill-declared script paths. Add a syntax-aware extraction of script references from bundled skills and fail the bundle contract when a referenced script is absent from the owning pack, with owning-pack diagnostics and a mutation proof. Source: GitHub issue #199 (residual).

## Acceptance Criteria

- A contract test extracts every script path referenced by every shipped skill (syntax-aware, not a bare substring match) and fails when the path is absent from the owning pack manifest.
- Failure output names the skill, the reference, and the owning pack.
- A mutation proof demonstrates the test fails when a referenced script is removed or renamed.
- The existing `resolve-tracking.sh` check remains covered by the general mechanism.
