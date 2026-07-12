---
id: DR-260712-generic-dispatch-remains
title: Generic dispatch remains separate from project lifecycle policy
date: 2026-07-12
status: accepted
legacy_id: null
---

# Generic dispatch remains separate from project lifecycle policy

## Context

OAT now has analytical and lifecycle callers with different orchestration needs. A shared dispatch layer must support provider-neutral selection, launch evidence, recovery, and bounded reconnaissance without requiring an active project, while project workflows still need phase, task, gate, commit, and worktree semantics.

## Decision

Keep provider-neutral subagent dispatch separate from OAT project lifecycle
policy.

- `oat-dispatch-subagents` owns generic capability and authorization checks,
  live catalog evidence, route/model/effort selection, launch acceptance,
  continuation, recovery, and neutral dispatch records. It does not resolve or
  read active project state.
- `oat-project-dispatch-subagents` resolves project, phase, task, gate,
  write-boundary, commit, and worktree context, then translates that context
  into the generic dispatch request.
- Calling workflows retain decomposition, synthesis, user dialogue, artifact
  writes, and verification of load-bearing child claims.
- Provider-specific mechanics remain in load-one-only references selected
  after the active provider is known.

## Consequences

- Analytical OAT skills can fan out bounded reconnaissance without importing
  project lifecycle ceremony or requiring an active project.
- Project workflows load two layers, but provider selection and recovery policy
  have one reusable owner instead of being duplicated in every lifecycle role.
- Utility and workflows packs have an explicit cross-pack dependency; the
  project adapter must fail closed with installation guidance when the generic
  engine is unavailable.
- The general contract can standardize evidence and role classes, while each
  caller still owns its domain-specific findings, plans, and judgments.
- This decision defines skill contracts only. It does not close the separate
  root-owned runtime dispatch broker backlog.
