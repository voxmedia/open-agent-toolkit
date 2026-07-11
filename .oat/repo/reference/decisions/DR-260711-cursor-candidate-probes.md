---
id: DR-260711-cursor-candidate-probes
title: Cursor candidate probes require passed structured controls
date: 2026-07-11
status: accepted
legacy_id: null
---

# Cursor candidate probes require passed structured controls

## Context

If the positive and negative controls cannot prove that the harness exposes exact Task-model evidence, the candidate pass stops without manufacturing model outcomes.

## Decision

Run a dynamically selected positive control and a deliberately invalid negative
control before probing Cursor recommendation candidates. The positive control
must expose an exact Task model argument, correlated completion, and sentinel;
the negative control must expose a structured rejection for the canonical
invalid value. Candidate probes run only when both controls pass.

If either control is inconclusive, stop the candidate pass and record a harness
or environment outcome without assigning eligibility outcomes to candidates.

## Consequences

- A client that omits Task events leaves recommendation candidates unresolved
  even when the parent process exits successfully.
- The recommendation is retained or changed only from candidate-level evidence
  produced by a proven harness.
- Rechecks start with the controls again, which spends two probes but prevents a
  broken observation path from creating false model claims.
