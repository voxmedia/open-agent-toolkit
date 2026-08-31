---
id: DR-260831-diagnostic-inventory-failures
title: Diagnostic inventory failures
date: 2026-08-31
status: accepted
legacy_id: null
---

# Diagnostic inventory failures

## Context

Doctor and status share the canonical pack inventory, but an inventory exception previously risked either silent fallback or termination of status output.

## Decision

Represent inventory failure as structured unavailable diagnostic data and render it explicitly through both doctor and status.

## Consequences

JSON and human output remain consistent, status degrades instead of crashing, and callers can distinguish unavailable inventory from an empty inventory.
