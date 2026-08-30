---
id: DR-260827-keep-plan-mandated-error
title: Keep plan-mandated error messages on the assets override path
date: 2026-08-27
status: accepted
legacy_id: null
---

# Keep plan-mandated error messages on the assets override path

## Context

The external plan required explicit-but-invalid OAT_ASSETS_DIR overrides to fail with the existing actionable errors; the final review noted those messages tell an override user to run pnpm build, which does not fix an operator-supplied path.

## Decision

Ship the plan-mandated messages unchanged and file an override-aware remedy wording as a backlog follow-up instead of widening the change.

## Consequences

The wave stays within its immutable plan; the misdirected remedy is tracked (with a partial-bundle structural check) for a later lane.
