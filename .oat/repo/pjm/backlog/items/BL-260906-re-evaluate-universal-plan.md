---
id: BL-260906-re-evaluate-universal-plan
title: Re-evaluate universal plan proof strategy and test-first guidance
status: open
priority: medium
scope: feature
scope_estimate: L
labels:
  - planning
  - testing
  - workflow
  - guidance
assignee: null
created: 2026-09-06T13:28:16.084Z
updated: 2026-09-06T13:28:16.084Z
associated_issues: []
external_plans: []
---

## Description

Re-evaluate DR-260714-flexible-plan-task-bodies and every shared plan template, planning skill, implementer contract, reviewer contract, documentation surface, and contract test that treats RED/GREEN/refactor or automated tests as the preferred default. Define one risk-proportionate proof policy that preserves objective evidence without encouraging low-value fixtures, bespoke harnesses, or test theater. Keep strict controls for bug reproduction, user-interface visual proof, and security, provenance, approval, receipt, publication, or other assurance-sensitive contracts.

## Acceptance Criteria

- Inventory every plan template, planning skill, implementer contract, reviewer
  contract, documentation surface, and contract test that prescribes
  RED/GREEN/refactor or automated testing.
- Re-evaluate `DR-260714-flexible-plan-task-bodies` and record the resulting
  universal decision. Define objective, risk-proportionate proof as the
  invariant instead of naming one development sequence as the default for all
  work.
- Define selection guidance for test-first development,
  characterization-first work, implementation followed by focused regression,
  static or build checks, and manual or computer-use visual proof. Require a
  concise rationale when an automated test would not add useful confidence.
- Preserve stronger evidence requirements for bug reproduction, user-interface
  visual proof, and security, provenance, approval, receipt, publication, or
  other assurance-sensitive contracts, including negative and valid controls
  where those controls are load-bearing.
- Align every supported workflow mode and shared agent contract with the new
  policy. Add focused contract checks that reject both unconditional test-first
  wording and proof-free task guidance without introducing a new fixture or
  harness framework solely for this policy.
- Validate the guidance against representative documentation, configuration,
  refactor, user-interface, bug-fix, and assurance-sensitive tasks. Document
  why each example's proof strategy is proportionate and confirm that no
  example requires ceremonial tests.
