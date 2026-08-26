---
id: DR-260826-derive-the-sync-apply-restamp
title: Derive the sync apply restamp from the version-skew diagnostic
date: 2026-08-26
status: accepted
legacy_id: null
---

# Derive the sync apply restamp from the version-skew diagnostic

## Context

wave-2-execution shipped the oat sync producer/invoker version-skew advisory. runSyncApply already restamped a stale manifest with its own predicate, so the advisory and the restamp could silently diverge; the p01 review named a desync mutation that no test caught.

## Decision

Key the apply-path manifest restamp off scopePlan.versionSkew !== undefined rather than a duplicated predicate, remove two unreachable empty-string guards, and pin the coupling with a mutation-style test.

## Consequences

The restamp condition is bit-exact with the previous behaviour for reachable inputs while the advisory and restamp share one source of truth; the existing invalid-oatVersion validation error is preserved; making versionSkew non-optional remains deferred (p01-r2-m1).
