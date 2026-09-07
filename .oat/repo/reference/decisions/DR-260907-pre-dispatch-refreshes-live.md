---
id: DR-260907-pre-dispatch-refreshes-live
title: Pre-dispatch refreshes live in the source plans
date: 2026-09-07
status: accepted
legacy_id: null
---

# Pre-dispatch refreshes live in the source plans

## Context

Wave-boundary drift refreshes for external plans were placed in the wave wrapper as addenda during wave 5 (W3/W4 convention: plans are immutable inputs; corrections at wave close). The plan gate blocked three times (attempts 1, 3, 4) because the wrapper claimed the external plan is the entire and only contract while addenda claimed equal authority, and the governing oat-wave-execute brief rule cannot express a plan-plus-addendum model.

## Decision

A pre-dispatch refresh that changes a task's anchors, pin set, or current-state facts is applied to the source plan itself as a dated 'Refresh applied YYYY-MM-DD (wave-N boundary)' entry at the top of its Revalidation Before Execution section, the mechanism the execution program already used on 2026-09-03 and 2026-09-04. The wrapper stays single-contract (the external plan is the entire and only contract). Wave-close corrections are reserved for execution records and artifact-alignment findings from reviews.

## Consequences

Lane briefs point implementers at the plan including its dated refresh entry; reviewers verify against one document; the plan gate passed with zero findings on attempt 5 once the refreshes moved. The wave-execute skill guidance that plans are immutable inputs is superseded for contract-changing refreshes.
