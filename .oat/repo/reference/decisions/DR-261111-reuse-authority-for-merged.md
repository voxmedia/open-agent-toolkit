---
id: DR-261111-reuse-authority-for-merged
title: Reuse authority for merged completion
date: 2026-11-11
status: accepted
legacy_id: null
---

# Reuse authority for merged completion

## Context

The goal-delivery-freshness retro UP-02 showed completion writes landing on an already-merged PR branch. The approved complete-after-merge-and-state-parse brief also replaces the goal-specific requirement for a new bookkeeping-PR request in every run. DR-261003-autonomous-completion-uses previously stated that the companion never creates a PR.

## Decision

Observe the tracked PR live before completion writes. For durable shared/synced projects whose PR merged, prepare or reuse a branch from the updated base and publish a separate bookkeeping PR when existing explicit authority covers the project and original PR. Preserve the merged original identity/body. Goal bookkeeping never becomes a delivery or coverage. PR_ON_COMPLETE and autonomy opt-in alone are insufficient authority. Local projects keep their branch and do not create a follow-up.

## Consequences

This amends only the unconditional no-PR clause of DR-261003-autonomous-completion-uses: the companion can publish the separately authorized merged-completion follow-up. Its standing opt-in, named caller and other preconditions remain. Missing authority routes to interactive completion; open/no-PR and closed interactive behavior is preserved. Separate original and follow-up identities and durable branch reuse are required.
