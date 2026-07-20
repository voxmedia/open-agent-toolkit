---
id: DR-260718-durable-fail-closed-closeout
title: Durable fail-closed closeout state
date: 2026-07-18
status: accepted
legacy_id: null
---

# Durable fail-closed closeout state

## Context

Instruction ordering alone cannot make configured gate handling safe across interruption, ambiguous launch or receive evidence, retries, and implementation changes after review.

## Decision

Persist resolved gate inputs, launch and receive intent, run correlation, policy disposition, reviewed HEAD, and an implementation fingerprint; block ambiguous outcomes and mark successful dispositions stale after substantive changes.

## Consequences

Resume is deterministic, valid runs are not duplicated, operational and evidence failures fail closed, and only recognized closeout bookkeeping may preserve freshness.
