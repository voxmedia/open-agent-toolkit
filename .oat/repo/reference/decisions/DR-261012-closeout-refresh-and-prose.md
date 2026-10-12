---
id: DR-261012-closeout-refresh-and-prose
title: Closeout refresh and prose rewrite
date: 2026-10-12
status: accepted
legacy_id: null
---

# Closeout refresh and prose rewrite

## Context

Plans carried refresh-only tasks that distorted the task ledger, and archived summaries and journals kept present-tense status prose such as PR pending that was no longer true.

## Decision

Mechanical pointer and projection refreshes belong to closeout and create no task; evidence corrections and accepted design changes remain traceable tasks. At closeout only summary.md and the journal's Final Summary are rewritten from observed facts; real follow-ups and timestamped historical observations stay, and project-log judgments are corrected by appending a source-linked correction, never by rewriting (artifact-cleanup D9, D10).

## Consequences

oat-project-complete performs the terminal prose refresh before the final journal check; review-provide states that refresh-only findings are not tasks. Append-only logs keep their old pending entries.
