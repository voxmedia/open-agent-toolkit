---
id: DR-260718-independent-configured-exit
title: Independent configured exit-gate boundary
date: 2026-07-18
status: accepted
legacy_id: null
---

# Independent configured exit-gate boundary

## Context

The implementation lifecycle could complete automated closeout, final approval, and success output without producing configured skill-exit gate provenance; lifecycle self-review, optional phase review, and HiLL approval are distinct mechanisms.

## Decision

Require a configured oat-project-implement exit gate to reach a fresh policy-allowed disposition after final verification and mandatory lifecycle review but before pre-approval automation, final HiLL approval, completion state, or success output.

## Consequences

A configured gate cannot be disabled or satisfied by another review mechanism, while projects with null gate resolution retain an explicit no-gate terminal path.
