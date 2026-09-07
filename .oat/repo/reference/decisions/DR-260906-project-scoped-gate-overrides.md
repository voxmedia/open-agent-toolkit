---
id: DR-260906-project-scoped-gate-overrides
title: Project-scoped gate overrides and fail-closed gate resolution
date: 2026-09-06
status: accepted
legacy_id: null
---

# Project-scoped gate overrides and fail-closed gate resolution

## Context

Wave 4 p01 added per-project gate overrides. A project may record `oat_skill_gate_overrides` in its own `state.md`, `oat gate resolve --project` returns a discriminated envelope instead of a raw `GateConfig | null`, and implementation closeout gained a `project_disabled` disposition. DR-260718 was written before any of that existed, so two of its consequence clauses no longer describe the system.

## Decision

A project may disable a configured gate only for a skill declaring `oat_gateable: true`, and only through its own `state.md` `oat_skill_gate_overrides` map; overrides never mutate shared, local, or user config. Project-aware resolution distinguishes `configured`, `configured_disabled_by_project`, and `not_configured`. Only `not_configured` is an explicit no-gate allowance. A null, missing, malformed, or unrecognized resolver result fails closed as unresolved and is never treated as no gate. An override key naming a skill outside `oat_gateable` is rejected, so a configured gate on a non-gate-aware skill applies to every project.

## Consequences

DR-260718's clauses that a configured gate "cannot be disabled" and that null gate resolution retains an explicit no-gate terminal path are superseded. Everything else in DR-260718 stands: the configured exit gate remains independent from lifecycle self-review, optional phase review, and HiLL approval, and must still reach a fresh policy-allowed disposition before pre-approval automation. A project-disabled gate reaches that disposition as `allowed/configured` with `disposition: project_disabled`, never by executing the configured command.
