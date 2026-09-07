---
id: DR-260907-additive-post-selection
title: Additive post-selection recovery envelopes
date: 2026-09-07
status: accepted
legacy_id: null
---

# Additive post-selection recovery envelopes

## Context

The oat gate review command wrapped all post-selection work in one catch that reported unexpected_post_selection_failure with no artifact lookup and no sub-step name. A reviewer that had already committed a run-correlated, validating artifact was therefore reported as a failed gate, and callers had no deterministic branch other than re-dispatching the reviewer.

## Decision

Recover by re-validating the immutable content/signature snapshot selected at correlation time through the single eligibility function the normal path uses, returning the real ok or blocked status with an additive postSelectionRecovery marker; when nothing recovers, keep review_failed and add postSelection.step and postSelection.code to name the failing sub-step and cause. Add no terminal status, never re-read the artifact path, and never re-dispatch the reviewer.

## Consequences

A committed passing or blocking review is no longer lost to a transient post-selection error, and unrecoverable runs route deterministically on a named sub-step and cause. The six terminal statuses, the artifact_missing and targeting_correlation_failed envelopes, receive consumption, and ledger-event identity are unchanged; consumers keyed on status and outcome are unaffected. Replacement bytes, a non-gate invocation marker, and a foreign target still fail closed.
