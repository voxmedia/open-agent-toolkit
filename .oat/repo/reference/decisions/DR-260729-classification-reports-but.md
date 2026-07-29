---
id: DR-260729-classification-reports-but
title: Classification reports but does not skip
date: 2026-07-29
status: accepted
legacy_id: null
---

# Classification reports but does not skip

## Context

Operators need to distinguish empty, bookkeeping-only, and substantive re-review ranges, but path classification alone is not strong enough to authorize skipping verification.

## Decision

Report the resolved range classification on every re-review while always dispatching review over the complete selected range.

## Consequences

Review cost and range shape are visible without weakening coverage; any bookkeeping-only skip requires a separate deterministic contract.
