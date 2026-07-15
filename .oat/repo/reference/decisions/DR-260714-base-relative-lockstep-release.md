---
id: DR-260714-base-relative-lockstep-release
title: Base-relative lockstep release bump
date: 2026-07-14
status: accepted
legacy_id: null
---

# Base-relative lockstep release bump

## Context

PR 147 landed the previously reported formatting changes and advanced the integration baseline to public package version 0.1.64 during final review.

## Decision

Accept PR 147 as owner of those deltas and move all five public packages plus the bundled manifest to the next unused common version, 0.1.65.

## Consequences

The branch contains no unrelated formatter churn or lockfile drift and carries a real release-policy-valid delta that passes packaging validation.
