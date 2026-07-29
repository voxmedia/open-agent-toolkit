---
id: DR-260729-visual-correction-is-capped-at
title: Visual correction is capped at one pass
date: 2026-07-29
status: accepted
legacy_id: null
---

# Visual correction is capped at one pass

## Context

Visual judgment must affect production output without creating an unbounded autonomous revision loop.

## Decision

Permit exactly one targeted correction of failing artifacts followed by one final independent visual review, retaining all attempts and never recursing.

## Consequences

Execution remains bounded and auditable; any remaining failure is preserved with actionable findings and blocks publication.
