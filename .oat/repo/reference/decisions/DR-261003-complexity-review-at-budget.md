---
id: DR-261003-complexity-review-at-budget
title: Complexity review at budget exhaustion
date: 2026-10-03
status: accepted
legacy_id: null
---

# Complexity review at budget exhaustion

## Context

Wave 3 review and gate loops kept producing fix cycles after their budgets ran out, and the operator asked that an exhausted budget instead surface why the loop stopped. The complexity-review skill exists only in the operator's personal skills repository, so OAT cannot assume it is installed (backlog-wave-4 discovery, Questions 2 and 5).

## Decision

Every review or gate budget-exhaustion point (root review cap, configured gate attempt exhaustion, final review cap, review-receive cycle cap, quick-start plan gate) dispatches one read-only complexity review before the decision message. It uses an installed complexity-review skill when present and otherwise a condensed OAT reference (.agents/docs/complexity-review-fallback.md). The operator chooses the disposition, including simplify; agents never self-select it, including under OAT_AUTONOMOUS=1, where the review is reported at a boundary. No automatic early trigger ships; the operator can request the review at any time.

## Consequences

Implement, quick-start, and review-receive gained the dispatch and a contract pin per exhaustion point; complexity reports are saved under reviews/archived/ and excluded from review-receive cycle counts. The review adds one subagent per exhaustion. Sibling gate-capable skills (plan, import-plan, design, discover, lite) and porting the skill into an OAT pack are follow-ups (BL-261002-wire-the-complexity-review, BL-261002-port-the-complexity-review). In Wave 4 the p01 review at the cap led the operator to simplify a non-converging guard.
