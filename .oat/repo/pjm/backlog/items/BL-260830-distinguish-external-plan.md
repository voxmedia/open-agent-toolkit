---
id: BL-260830-distinguish-external-plan
title: Distinguish external-plan readiness from execution readiness
status: open
priority: high
scope: task
scope_estimate: M
labels:
  - repo-improve
  - external-plans
  - dependencies
  - planning
  - workflow
assignee: null
created: 2026-08-30T23:01:52.697Z
updated: 2026-09-03T00:08:42Z
associated_issues: []
external_plans:
  - .oat/repo/reference/external-plans/2026-09-02-enforce-external-plan-readiness-contract.md
---

## Description

Extend the oat-repo-improve external-plan contract so a well-scoped backlog item can be planned while execution remains blocked on named hard dependencies. Require bidirectional source-plan links, linked dependency evidence, hard-versus-soft classification, named unblock states, current-main provenance, and explicit revalidation triggers before import or execution.

## Acceptance Criteria

- `oat-repo-improve` evaluates `plan_ready` separately from
  `execution_ready`; an unshipped dependency does not disqualify a coherent,
  well-scoped item from receiving an external plan.
- Every generated plan and its source backlog item reverse-link each other.
  The plan also links related backlog items, projects, pull requests, and
  external plans by stable ID, title, repository path, or URL.
- Dependencies are classified as hard or soft. A plan with an unsatisfied hard
  dependency marks execution `BLOCKED` and names the exact dependency state
  required to unblock it; soft dependencies state their expected effect.
- Dated plan filenames and plan provenance record the exact current
  `origin/main` commit at planning time, rather than an arbitrary working-tree
  HEAD.
- The contract requires revalidation before import or execution when enough
  time has elapsed to exceed the named freshness policy, `origin/main`
  advances, cited source surfaces change, backlog or issue intent changes, or a
  dependency lands after planning.
- Candidate-table, plan-template, and verification fixtures cover a plan-ready
  item whose execution is blocked by a hard dependency and a plan-ready item
  with only a soft dependency.
