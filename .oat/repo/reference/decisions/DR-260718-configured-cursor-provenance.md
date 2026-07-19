---
id: DR-260718-configured-cursor-provenance
title: Configured Cursor provenance
date: 2026-07-18
status: accepted
legacy_id: null
---

# Configured Cursor provenance

## Context

Cursor accepts configured variant pins but can silently substitute a compatible model and does not provide reliable runtime model identity for every launch.

## Decision

Report materialized-role controls as launcher-owned configured provenance and keep runtime model and effort not-reported without independent evidence.

## Consequences

Audit output is less assertive but accurately distinguishes configured invocation from observed runtime identity.
