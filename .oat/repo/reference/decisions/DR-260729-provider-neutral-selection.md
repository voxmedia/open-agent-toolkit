---
id: DR-260729-provider-neutral-selection
title: Provider-neutral selection warnings
date: 2026-07-29
status: accepted
legacy_id: null
---

# Provider-neutral selection warnings

## Context

A managed named-cap implementation or fix dispatch could resolve without an exact candidate and leave no durable signal, while immediately failing such calls would break established successful resolution semantics.

## Decision

Detect skipped exact-candidate selection across providers and emit stable coded human and JSON warnings only for actual managed named-cap implementation or fix routes.

## Consequences

Skipped selection becomes auditable while status remains resolved and exit code remains zero; any later fail-closed transition requires separate compatibility work.
