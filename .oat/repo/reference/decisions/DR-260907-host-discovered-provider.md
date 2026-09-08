---
id: DR-260907-host-discovered-provider
title: Host-discovered provider-neutral execution
date: 2026-09-07
status: accepted
legacy_id: null
---

# Host-discovered provider-neutral execution

## Context

Connector inventories and configured provider CLIs vary by host, while hard-coded tool names, native schemas, catalogs, and dialects would make OAT brittle and provider-coupled.

## Decision

Keep semantic intent, policy, approval, journaling, sanitized observations, and verification in OAT; let the live host discover a suitable connector or inspect an already configured CLI help surface at execution time.

## Consequences

Reusable OAT code and skills remain provider-neutral, capability availability can degrade explicitly, and native invocation details never become correctness authority.
