---
id: DR-260729-default-narrowing
title: Default narrowing with explicit opt-out
date: 2026-07-29
status: accepted
legacy_id: null
---

# Default narrowing with explicit opt-out

## Context

Repeated same-scope reviews were re-reading already reviewed work, while the unset narrowing preference still prompted on every re-review.

## Decision

Treat unset and true as narrowing enabled, treat false as the explicit full-scope opt-out, remove the narrowing decision prompt, and preserve explicit ranges and remote flags as per-invocation overrides.

## Consequences

The common re-review path is prompt-free and faster; users retain durable and one-run escape hatches to full scope.
