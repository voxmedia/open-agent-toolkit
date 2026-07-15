---
id: DR-260714-mutually-exclusive-resolver
title: Mutually exclusive resolver selection paths
date: 2026-07-14
status: accepted
legacy_id: null
---

# Mutually exclusive resolver selection paths

## Context

Dispatch guidance could be read as combining preferred selection with exact candidate flags even though the resolver intentionally rejects that combination.

## Decision

Document preferred selection and exact-candidate selection as mutually exclusive branches; exact-candidate dispatch does not inherit --preferred.

## Consequences

Literal documented resolver invocations validate successfully while runtime re-resolution and resolver-owned priority routing remain intact.
