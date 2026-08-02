---
id: DR-260731-canonical-policy
title: Canonical policy with generated provider parity
date: 2026-07-31
status: accepted
legacy_id: null
---

# Canonical policy with generated provider parity

## Context

The bounded recovery contract must behave consistently across Claude, Codex, and Cursor without allowing provider-specific instruction copies to drift into separate policy.

## Decision

Keep shared skills and canonical agent contracts authoritative. Treat provider assets as generated views and validate materialized providers with relational semantic-parity tests.

## Consequences

Policy changes require canonical versioning, provider regeneration, and parity validation rather than hand-maintained forks. Released bundled assets must stay synchronized through normal lockstep package and migration workflows.
