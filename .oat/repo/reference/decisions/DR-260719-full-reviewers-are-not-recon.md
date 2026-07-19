---
id: DR-260719-full-reviewers-are-not-recon
title: Full reviewers are not recon workers
date: 2026-07-19
status: accepted
legacy_id: null
---

# Full reviewers are not recon workers

## Context

Providers may materialize full reviewer variants pinned to stronger models, but those roles carry complete reviewer authority rather than bounded reconnaissance authority.

## Decision

Do not recursively reuse full reviewer variants as recon workers; consider dedicated pinned recon roles only if observed value justifies their separate contract and maintenance cost.

## Consequences

The one-level non-recursive authority boundary stays clear; stronger unavailable lanes remain with the primary reviewer, while reusable pinned recon roles remain an explicit backlog option.
