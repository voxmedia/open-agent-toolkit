---
id: DR-260718-provider-neutral-extensions
title: Provider-neutral extensions
date: 2026-07-18
status: accepted
legacy_id: null
---

# Provider-neutral extensions

## Context

OAT materialization orchestration was Codex-specific even though providers require distinct native codecs and file semantics.

## Decision

Use a narrow provider-neutral extension lifecycle for plan computation and application while keeping Codex and Cursor codecs, markers, target collection, and collision rules provider-owned.

## Consequences

Sync, status, and init share lifecycle mechanics without forcing providers into one format; new providers implement the extension contract and retain native behavior.
