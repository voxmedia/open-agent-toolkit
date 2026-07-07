---
id: DR-260706-claude-remains-model-axis-only
title: Claude remains model-axis only
date: 2026-07-06
status: accepted
legacy_id: null
---

# Claude remains model-axis only

## Context

Claude Task dispatch uses the per-call model argument, including fable for Frontier, and keeps effort logged as not applicable until real usage justifies a separate effort-control model.

## Decision

Keep Claude dispatch selection on the model axis. OAT may pass a Task `model`
value such as `sonnet`, `opus`, or `fable`, but it does not create Claude effort
variants or log a separate selected effort for Claude dispatch.

## Consequences

Claude logs use `effort_axis=not-applicable`, and escalation proceeds through
the model ladder. Any future Claude effort-control work requires fresh evidence
that model-only selection is insufficient.
