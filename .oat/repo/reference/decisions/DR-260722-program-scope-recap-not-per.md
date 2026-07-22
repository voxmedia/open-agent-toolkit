---
id: DR-260722-program-scope-recap-not-per
title: Program-scope recap, not per-wave
date: 2026-07-22
status: accepted
legacy_id: null
---

# Program-scope recap, not per-wave

## Context

Wave programs generate recap decks via the explainer kit. The first consumer runs showed per-wave recaps create noise and silent-omission ambiguity: an autonomous orchestrator skipping an optional per-wave recap was indistinguishable from oversight.

## Decision

Recap generation defaults to program scope at program close, generated from the reconciled execution-program artifact and all wave records. Per-wave recaps run only on explicit operator request; otherwise the wave ledger records 'recap: deferred to program close' so the disposition is always explicit.

## Consequences

Discretion is distinguishable from oversight in every wave ledger. Program-close recap records land in the program ledger; wave ledger rows are reserved for explicitly requested per-wave recaps. Shipped in oat-wave-execute 1.7.1 / oat-wave-program 1.3.1 (p-rev4).
