---
id: DR-260807-receipt-outcomes-use-one-pre
title: Receipt outcomes use one pre-action snapshot
date: 2026-08-07
status: accepted
legacy_id: null
---

# Receipt outcomes use one pre-action snapshot

## Context

A receipt generated after apply or filing could misclassify successful work as skipped if eligibility were sampled only after the action, while mixed lanes could satisfy multiple outcomes.

## Decision

Snapshot eligible work before entering the action, then derive exactly one of skipped, declined, deferred, or performed through a total precedence rule using entry, completion, and remaining-work state.

## Consequences

Successful settlement of all initially eligible work is performed, initially empty work is skipped, mixed lanes resolve deterministically, and transition fixtures can verify the outcome contract.
