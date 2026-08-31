---
id: DR-260831-provider-aware-reachability
title: Provider-aware reachability
date: 2026-08-31
status: accepted
legacy_id: null
---

# Provider-aware reachability

## Context

Filesystem detection alone can disagree with explicit provider enablement or disablement and therefore misreport whether user-managed agents can materialize.

## Decision

Derive user-agent reachability from the config-aware active provider adapters used by sync; only active Codex and Cursor adapters supply the user managed-role extension.

## Consequences

Diagnostics align with sync across enabled, disabled, detected, and undetected states, while Claude-only configurations do not produce false managed-role reachability.
