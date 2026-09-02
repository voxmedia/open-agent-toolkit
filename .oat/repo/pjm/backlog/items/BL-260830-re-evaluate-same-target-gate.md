---
id: BL-260830-re-evaluate-same-target-gate
title: Re-evaluate same-target gate execution
status: open
priority: medium
scope: idea
scope_estimate: L
labels:
  - gates
  - workflow-end-triggers
  - cross-provider
  - v2
  - needs-discussion
  - legacy-promoted
assignee: null
created: 2026-08-30T22:33:07.319Z
updated: 2026-08-30T22:33:07.319Z
associated_issues: []
external_plans: []
---

## Description

Promoted from legacy backlog record bl-e6fc. Re-evaluate same-runtime different-model or effort execution against the current target-family and provenance architecture before committing to brittle target detection.

## Acceptance Criteria

- Current runtime, target-family, model, effort, and receipt provenance contracts are documented before choosing a design.
- Provider-specific target detection is evaluated for truthfulness and fail-closed behavior.
- The item is either approved with a bounded V2 contract or closed as unnecessary complexity.
