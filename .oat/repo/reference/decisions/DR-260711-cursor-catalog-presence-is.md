---
id: DR-260711-cursor-catalog-presence-is
title: Cursor catalog presence is diagnostic only
date: 2026-07-11
status: accepted
legacy_id: null
---

# Cursor catalog presence is diagnostic only

## Context

Catalog retrieval may help explain availability, but only an exact correlated Task result can establish candidate eligibility for the current account and client.

## Decision

Treat Cursor's broad model catalog as diagnostic context, not proof of Task or
subagent eligibility. Exact eligibility requires a correlated Task result for
the byte-preserved candidate on the current account and client. Parent prose
and candidate spelling are also non-authoritative.

Within config adoption or doctor, retrieve the broad catalog lazily at most
once per validation pass while continuing to memoize one actual Task probe per
distinct exact candidate.

## Consequences

- Catalog presence alone cannot produce a `valid` eligibility result.
- Validation continues to preserve explicit `valid`, `unknown-value`, and
  `unvalidated` outcomes instead of guessing from model names.
- Adoption and doctor avoid repeated broad catalog calls without introducing a
  process-global cache, TTL, or cross-command stale state.
