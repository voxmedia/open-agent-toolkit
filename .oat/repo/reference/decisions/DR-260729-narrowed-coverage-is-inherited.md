---
id: DR-260729-narrowed-coverage-is-inherited
title: Narrowed coverage is inherited explicitly
date: 2026-07-29
status: accepted
legacy_id: null
---

# Narrowed coverage is inherited explicitly

## Context

A narrowed review verifies only part of its nominal scope and cannot honestly regenerate full requirements coverage from that pass alone.

## Decision

Require narrowed artifacts to name the prior artifact and reviewed head and to reference or mark inherited coverage rather than restating unverified claims.

## Consequences

The union of successive review passes remains auditable and a break in the coverage chain is visible.
