---
id: DR-260831-synchronous-configured-command
title: Synchronous configured-command proof
date: 2026-08-31
status: accepted
legacy_id: null
---

# Synchronous configured-command proof

## Context

Direct gate-review tests did not prove that a persisted command resolved unchanged, completed required headless work synchronously, and produced the expected structured envelope.

## Decision

Require inline or synchronously awaited headless completion and exercise the exact stored command through a PATH-selected source CLI and deterministic fake runtime.

## Consequences

The public configuration-to-envelope seam now distinguishes correlated success, missing artifacts, and wrong-run mismatches without adding provider-specific execution behavior.
