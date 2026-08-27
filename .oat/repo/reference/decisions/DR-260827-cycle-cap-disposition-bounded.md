---
id: DR-260827-cycle-cap-disposition-bounded
title: 'Cycle-cap disposition: bounded root-verified fix with gate as
  independent check'
date: 2026-08-27
status: accepted
legacy_id: null
---

# Cycle-cap disposition: bounded root-verified fix with gate as independent check

## Context

Both the p01 and final review scopes in wave 4 reached the three-cycle cap with reviewer-verified patches outstanding; the program forbids self-authorizing a fourth cycle.

## Decision

Apply the reviewer-specified patch as a bounded append-only fix, have the root re-run the reviewer's probe matrix as the stored verification record, delegate independent verification to the next scope (the final review for p01; the configured exit gate for final), and ledger anything beyond the plan-named regression classes with a backlog item.

## Consequences

No fourth cycle was opened in either scope; the exit gate independently reproduced the ledgered residuals, confirming the path; the wrapper should budget guard-hardening rounds explicitly in future waves.
