---
id: DR-261108-finding-classes-recorded-at
title: Finding classes recorded at receive
date: 2026-11-08
status: accepted
legacy_id: null
---

# Finding classes recorded at receive

## Context

Gate fix rounds repeatedly turned findings that no contract source required into fix work; in artifact-cleanup four rounds built an ownership protocol the operator then had deleted. Exhausted gates also could not show whether they were converging (#327).

## Decision

Every project review and gate receive records one class per finding in a Finding classes line of its receipt: bookkeeping (under the shared bookkeeping definition), regression, accepted-requirement (citing the discovery, spec, design or decision source that requires it) or new-hardening. A new-hardening finding reaches the operator before any fix task exists. The complexity-review fallback starts from the recorded classes and the gate's new or carried-over convergence marks.

## Consequences

The classes and convergence marks feed the existing exhaustion stop and complexity review; no authorization record or extra-cycle allowance is added, and the reviewer's findings, counts and verdicts are never rewritten. The rule is restated in root AGENTS.md and .agents/docs/bookkeeping-findings.md. Known gap: where an operator decision on a classed finding is recorded is unspecified (BL-261108-simplify-m03-gate-convergence). Shipped in review-gate-integrity m03 (PR #407).
