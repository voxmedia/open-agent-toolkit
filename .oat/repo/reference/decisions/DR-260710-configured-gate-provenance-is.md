---
id: DR-260710-configured-gate-provenance-is
title: Configured gate provenance is separate from reviewer identity
date: 2026-07-10
status: accepted
legacy_id: null
---

# Configured gate provenance is separate from reviewer identity

## Context

Gate invocation model and reasoning effort are the configuration selected by OAT before dispatch. Review artifacts and gate JSON must preserve that immutable record, while self-reported or observed provider identity remains diagnostic and cannot overwrite it.

## Decision

Gate reviews preserve the invocation record resolved from the selected
`workflow.gates.execTargets` entry: target ID, runtime, model, reasoning effort,
and source. OAT injects that record into the review prompt and corroborates the
same fields in the returned artifact before applying a verdict. Observed or
self-reported model identity remains separate diagnostic provenance.

## Consequences

Artifacts and gate JSON can state exactly what OAT configured without claiming
runtime confirmation. Review guidance must never ask a provider to replace the
configured record with self-identification, and missing or mismatched stamped
fields fail the gate rather than weakening its provenance contract.
