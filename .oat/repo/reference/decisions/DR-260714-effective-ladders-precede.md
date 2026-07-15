---
id: DR-260714-effective-ladders-precede
title: Effective ladders precede project ceilings
date: 2026-07-14
status: accepted
legacy_id: null
---

# Effective ladders precede project ceilings

## Context

Planning uses merged effective configuration as the authority for provider-tier ladder completeness and treats project ceiling selection as a separate decision. A resolver's `matrix: null` is therefore not evidence that ladder adoption is required.

## Decision

Use `oat config list --json` as the merged effective-configuration boundary
before offering dispatch-ladder adoption. Evaluate ladder completeness
independently from the project's named ceiling, and never treat a resolved
`matrix: null` value as proof that ladders are absent.

## Consequences

Users with complete shared, local, user, or default ladders proceed directly to
the project ceiling choice without a redundant adoption prompt. Adoption is
offered only when effective provider-tier cells are actually missing or
incomplete.
