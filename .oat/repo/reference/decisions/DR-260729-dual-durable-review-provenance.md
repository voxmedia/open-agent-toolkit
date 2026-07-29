---
id: DR-260729-dual-durable-review-provenance
title: Dual durable review provenance
date: 2026-07-29
status: accepted
legacy_id: null
---

# Dual durable review provenance

## Context

Review artifacts are archived locally after receive, so artifact-only reviewed-head provenance disappears across clones and worktrees.

## Decision

Record validated review provenance in the artifact and mirror it in the tracked Reviews ledger; require agreement when both sources exist and fail open when they conflict.

## Consequences

Re-review baselines survive receive and archival while preserving an auditable artifact source and conservative conflict handling.
