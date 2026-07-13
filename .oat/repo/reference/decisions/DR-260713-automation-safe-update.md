---
id: DR-260713-automation-safe-update
title: Automation-safe update eligibility
date: 2026-07-13
status: accepted
legacy_id: null
---

# Automation-safe update eligibility

## Context

Update output is limited to eligible human command runs and remains absent from machine-readable JSON behavior.

## Decision

Run update awareness only in eligible interactive human contexts. Suppress
both passive notices and the tool-bundle mutation guard for JSON,
non-interactive, CI, test, source-development, and ephemeral package-runner
invocations.

## Consequences

- Machine-readable JSON schemas and automation output remain unchanged.
- Automated commands never block on consent or launch an installer.
- Help and version output naturally bypass action hooks.
- The specialized guard is available only where explicit human consent and
  safe action cancellation are possible.
