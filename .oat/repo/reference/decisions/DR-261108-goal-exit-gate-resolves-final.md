---
id: DR-261108-goal-exit-gate-resolves-final
title: Goal exit gate resolves final to the milestone
date: 2026-11-08
status: accepted
legacy_id: null
---

# Goal exit gate resolves final to the milestone

## Context

In a goal project, the configured implement exit gate (--review-scope final with the state-selection prompt) expanded to the whole project and refused on an earlier milestone's squash-merged phase anchors, so every milestone after the first needed operator scope routing at its exit gate (review-gate-integrity m02 run 788ae91a).

## Decision

In a goal milestone closeout, review-provide resolves a state-selected final hint to the active milestone's ordered accepted phases, records the original final hint and the resolved phase set, and leaves the configured gate command unchanged. An explicit whole-project code final request, without the state-selection instruction, keeps its whole-project meaning.

## Consequences

Goal milestone exit gates no longer need manual phase-range routing once the release carrying this rule is installed; gates run the installed CLI and user-scope skills, so it does not help a goal's own milestone that ships it. A single-phase milestone keeps its milestone identity. Shipped in review-gate-integrity m03 (PR #407, p15 and p16).
