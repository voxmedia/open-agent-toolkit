---
id: DR-260830-report-the-exact-adopted-pack
title: Report the exact adopted pack intents
date: 2026-08-30
status: accepted
legacy_id: null
---

# Report the exact adopted pack intents

## Context

Legacy project-pack reconciliation needed a deterministic contract that explains which missing intents it wrote without changing its idempotent behavior.

## Decision

Return and render only the exact pack intents newly adopted by the reconciliation operation.

## Consequences

JSON and human output identify the actual mutation, and a second reconciliation remains an unchanged no-op with no adopted packs.
