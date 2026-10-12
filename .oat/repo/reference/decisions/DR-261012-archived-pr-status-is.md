---
id: DR-261012-archived-pr-status-is
title: Archived PR status is an observation
date: 2026-10-12
status: accepted
legacy_id: null
---

# Archived PR status is an observation

## Context

Archived state.md files carry oat_pr_status and oat_pr_url values that read as live PR state long after the PR merged or closed.

## Decision

Label the archived PR fields as an observation at archive time: oat-project-complete writes oat_pr_status_observed_at (UTC) beside oat_pr_status before archive. No host-state observer is added (artifact-cleanup D12).

## Consequences

Readers treat archived PR status as historical. A live PR or CI observer for archived projects stays out of scope.
