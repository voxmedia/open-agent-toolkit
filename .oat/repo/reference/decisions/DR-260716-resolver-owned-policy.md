---
id: DR-260716-resolver-owned-policy
title: Resolver-owned policy and ladder diagnosis
date: 2026-07-16
status: accepted
legacy_id: null
---

# Resolver-owned policy and ladder diagnosis

## Context

Planning and review flows conflated a missing project policy with missing reusable dispatch ladders and offered incorrect remediation.

## Decision

The dispatch resolver reports unresolvedReason, merged effective matrix data, whole-ladder completeness, and exact missing cells as the single diagnosis source.

## Consequences

Planning adopts ladders only when cells are missing and handles policy selection separately, including deliberate pre-plan inheritance when policy alone is absent.
