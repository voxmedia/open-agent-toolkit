---
id: DR-260729-lineage-qualified-guarded
title: Lineage-qualified guarded ranges
date: 2026-07-29
status: accepted
legacy_id: null
---

# Lineage-qualified guarded ranges

## Context

Silent narrowing is safe only when its baseline belongs to the same review lineage and remains a valid ancestor of the reviewed head.

## Decision

Narrow to prior-reviewed-head through current-head only within lifecycle lineage or the same exact gate target and scope, after full-SHA, object-existence, and ancestry checks; fail open on ambiguity.

## Consequences

Lifecycle and gate coverage never cross-feed, and stale or missing provenance causes a full-scope review rather than under-review.
