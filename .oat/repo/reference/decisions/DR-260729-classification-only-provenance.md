---
id: DR-260729-classification-only-provenance
title: Classification-only provenance
date: 2026-07-29
status: accepted
legacy_id: null
---

# Classification-only provenance

## Context

Managed implementation and fix dispatches needed auditable root-agent classification without conflating task judgment with policy ceilings, candidate requests, or target selection.

## Decision

Record provider-neutral task class and applicable Codex task effort as report provenance only; require report context, keep reviewer routes classification-free, and do not have the CLI judge classification correctness.

## Consequences

Dispatch reports preserve the root agent's judgment for audit while candidate normalization remains unchanged; callers must supply valid implementation or fix report context for classification flags.
