---
id: DR-260701-provider-verification-happens
title: Provider verification happens at the CLI argv boundary
date: 2026-07-01
status: accepted
legacy_id: null
---

# Provider verification happens at the CLI argv boundary

## Context

Unit tests guard the command builder, and shimmed CLI smoke tests verify the real oat command path for codex-default, claude-default, and cursor-default without invoking real providers.

## Decision

Verify provider command shape at the CLI argv boundary. Unit tests cover command
assembly, and shimmed CLI smoke tests verify `codex-default`, `claude-default`,
and `cursor-default` dispatch without invoking real providers.

## Consequences

Provider-specific prompt-argument regressions should be caught where OAT builds
and dispatches argv. Tests should assert the real command path receives the
expected single prompt argument for review gates.
