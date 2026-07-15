---
id: DR-260714-documentation-only-completion
title: Documentation-only completion ordering
date: 2026-07-14
status: accepted
legacy_id: null
---

# Documentation-only completion ordering

## Context

Completion before merge and merge before completion were both already supported, but lifecycle prose implied a merge-first sequence and left open-PR routing ambiguous.

## Decision

Name both supported orderings and route an open PR to project completion without adding a workflow.completeBeforeMerge preference.

## Consequences

Agents can complete and archive while a PR remains open, and the completion flow can synchronize the PR body. The configuration surface stays unchanged.
