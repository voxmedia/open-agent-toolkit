---
id: DR-261001-the-cli-owns-the-closeout
title: The CLI owns the closeout completeness check
date: 2026-10-01
status: accepted
legacy_id: null
---

# The CLI owns the closeout completeness check

## Context

A configured post-implement closeout could be marked complete with a missing or incomplete oat_post_implement_sequence snapshot. No executable code parsed that snapshot, and oat project complete-state already owned the completed-state transition (BL-260806-fail-closed-when-configured).

## Decision

A read-only oat project closeout-check reports the closeout invariant (configured, autonomous, or lite), and oat project complete-state refuses a configured closeout whose snapshot is missing or incomplete. oat-project-implement, oat-project-next, and oat-project-complete route through the check; complete runs it before its upfront questions and again before complete-state.

## Consequences

Every skill reaches the check without cross-skill script paths, and it is testable at the transition level. Lifecycle skills now need oat 0.3.11 or later; an older CLI makes complete treat the closeout as incomplete. Projects with malformed hand-written snapshots are refused until repaired, and legacy pr_open projects without a snapshot route back to implement.
