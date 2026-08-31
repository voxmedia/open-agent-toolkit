---
id: BL-260827-harden-the-codex-skill-below
title: Harden the codex-skill below-floor guard against paraphrase and anaphora
status: open
priority: low
scope: task
scope_estimate: XS
labels:
  - skills
  - codex-skill
  - tests
  - wave-4-follow-up
assignee: null
created: 2026-08-27T06:56:35.323Z
updated: 2026-08-31T00:11:26Z
associated_issues: []
external_plans:
  - .oat/repo/reference/external-plans/2026-08-30-harden-codex-skill-anaphora-guard.md
---

## Description

The contract test's below-floor assertion (tests/codex-skill-contract.test.mjs) applies requiresConfirmation only to clauses containing 'below the route'; an anaphoric blocking requirement in the next clause ('In that case you must confirm before launching') escapes (wave-4 final review round 3 M3, probe y5; reproduced by the exit gate). Candidate: treat anaphors ('in that case', 'then') to a below-floor clause as below-floor, or a span-based rule; note a plain proximity window false-fails the shipped text.

## Acceptance Criteria

- {Outcome 1}
- {Outcome 2}
