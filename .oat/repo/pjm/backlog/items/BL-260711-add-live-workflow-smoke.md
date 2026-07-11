---
id: BL-260711-add-live-workflow-smoke
title: 'Add live workflow smoke fixture'
status: open # open | in_progress | closed | wont_do
priority: high # urgent | high | medium | low | none
scope: feature # idea | task | feature | initiative
scope_estimate: L # XS | S | M | L | XL | XXL
labels: [workflow, smoke-test, e2e, gates, dispatch]
assignee: null
created: '2026-07-11T00:00:45Z'
updated: '2026-07-11T00:00:45Z'
associated_issues: []
---

## Description

Add an opt-in, disposable live-provider smoke workflow that exercises real OAT
project execution end to end. The fixture should contain two short phases with
three explicit tasks each; every task makes a deterministic append to a fixture
log so the implementation is intentionally trivial while the orchestration is
real.

The smoke runner must use real authenticated provider runtimes and the normal
project lifecycle, including exact task-worker dispatch, configured phase
reviews, and the final lifecycle gate. It should leave the user's OAT config
and the source repository unchanged, then summarize the recorded dispatch and
gate evidence. This is the practical acceptance surface for cross-cutting
workflow, gate, and dispatch changes that are hard to prove with unit tests
alone. It is deliberately opt-in rather than a required CI check because it
consumes provider time and depends on local provider readiness.

## Acceptance Criteria

- A version-controlled fixture can be copied into a disposable worktree and
  contains two phases with three stable task IDs each; every task has a bounded,
  deterministic log-append outcome.
- An opt-in smoke command or documented runner executes the normal project
  lifecycle against real authenticated providers without modifying the source
  repository or the user's persisted OAT configuration.
- The fixture config and report prove phase/task dispatch, the exact selected
  provider model or Codex role, phase review execution, final gate execution,
  declared review project, and recorded invocation/producer provenance.
- The standard fixture exercises a lower exact candidate beneath a higher named
  project ceiling, including a Cursor opaque model argument when Cursor is
  available.
- Provider/readiness preflight reports unavailable runtimes or targets clearly
  and exits without starting a partial workflow; cleanup handles interrupted
  runs without deleting unrelated worktrees or project artifacts.
- The runner is documented as a manual or release-validation smoke test and is
  not added to the default CI test suite.
