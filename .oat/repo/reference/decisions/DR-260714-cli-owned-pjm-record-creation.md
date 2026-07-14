---
id: DR-260714-cli-owned-pjm-record-creation
title: CLI-owned PJM record creation
date: 2026-07-14
status: accepted
legacy_id: null
---

# CLI-owned PJM record creation

## Context

Agents previously combined ID generation, hand-authored templates, and index regeneration, and decision creation could leave substantive sections as TODO.

## Decision

Make decision creation accept every substantive section and make backlog creation own validation, canonical rendering, collision checks, rollback, and atomic index refresh.

## Consequences

Canonical skills use one owning CLI command per record, generated records are complete, and failures do not leave partial item or index state.
