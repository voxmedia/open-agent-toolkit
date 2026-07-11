---
id: DR-260711-configured-invocation-is
title: Configured invocation is separate from runtime identity
date: 2026-07-11
status: accepted
legacy_id: null
---

# Configured invocation is separate from runtime identity

## Context

Exact selected targets and immutable gate invocation provenance are report inputs, while runtime identity remains not-reported unless trusted telemetry establishes it.

## Decision

Dispatch reports preserve launcher-configured invocation and runtime-observed
identity as separate evidence classes. The configured target, model, effort,
source, and immutable gate invocation record describe what OAT requested.
`runtimeIdentity` describes only independently observed or otherwise trusted
producer evidence and remains `not-reported` when that evidence is absent.

Observed output, producer self-identification, or role-name parsing must not
overwrite the configured invocation record.

## Consequences

- Consumers must read the configured and runtime sections independently rather
  than collapsing them into one model or producer field.
- Exact dispatch remains auditable even when the provider does not expose
  trusted runtime telemetry.
- The derived `Dispatch:` compatibility stamp cannot be used to manufacture or
  upgrade runtime identity confidence.
