---
id: DR-261011-goal-deliveries-are-registered
title: Goal deliveries are registered and delivery coverage closes the goal
date: 2026-10-11
status: accepted
legacy_id: null
---

# Goal deliveries are registered and delivery coverage closes the goal

## Context

A goal ships through several pull requests, possibly replaced or corrected, and its closeout must know which accepted phases each one carried and whether that evidence still holds, without a redundant final pull request.

## Decision

Each delivery is an oat_deliveries entry (dNN) with its milestone, a scope frozen at registration, the agreed endpoint, kind pr, status (registering | open | at_endpoint | superseded), supersession links (covers_scope_of / superseded_by, written together) or an additive corrects_delivery_id, persisted lookup keys, members with reviewed and observed revisions, the integrated_review it was delivered on, a set-once exit_gate binding, and the first observed endpoint_attainment. oat-project-pr-progress registers a milestone delivery only when oat project delivery check reports status ok; it writes the entry as registering and commits before creating the pull request, and a resume attaches exactly one gh pr list match, creates once on zero, and stops for reconcile on more. oat project delivery refresh persists only observations and derived staleness. The closeout boundary (closeout-check, complete-state) requires every accepted phase to be in some terminal delivery's effective scope (transitive covers_scope_of) with a passed, fresh integrated review and its persisted exit_gate; a snapshot pr step may be satisfied_by delivery-coverage only once pr is in the completed prefix.

## Consequences

delivery check judges the milestone's working exit carrier (exit.source: milestone-carrier); closeout judges each delivery's persisted exit_gate, so a fresh working carrier never repairs a stale binding. oat-project-complete opens no pull request when deliveries cover the work, even with workflow.createPrOnComplete true (probe p12-t02: zero gh pr create). Only a delivery that never reached its endpoint may be replaced; later corrections are additive. Validate-plan refuses changes to a registered delivery's frozen scope (goal-delivered-scope-changed).
