---
id: DR-261011-goal-completion-requires
title: Goal completion requires a declaration and an exhaustive outcome audit
date: 2026-10-11
status: accepted
legacy_id: null
---

# Goal completion requires a declaration and an exhaustive outcome audit

## Context

A goal has no natural last phase: new milestones can always be appended. Completion has to be a deliberate user act, and it must be checked against what the brief promised rather than against whichever phases happen to exist.

## Decision

Only oat-project-goal, after the user's explicit declaration, writes oat_goal_status: declared_met and oat_goal_outcome_audit; implement consumes the declaration and never declares. The declaration is recorded as one '**Goal declared met:**' line in implementation.md's Final Summary (declaration_ref points there). The audit is exhaustive: every phase in the full inventory is accepted, extracted, deferred or retired (deferred and retired need a non-empty reason and scope_decision_ref and stay historically incomplete), and every numbered outcome is keyed by its number and bound to its exact text as met, extracted, deferred or retired. disposition met is allowed only with nothing deferred or retired, otherwise met_with_deferrals. Declaration prevents further activation and opens closeout; delivery coverage completes it. closeout-check and complete-state refuse without writing on goal_not_declared, goal_audit_invalid, goal_extraction_unresolved, goal_observation_failed, goal_inputs_unreadable or goal_coverage_incomplete and name the next owner.

## Consequences

Renumbering or rewording an outcome invalidates the audit; the router routes an invalid audit to oat-project-goal (context audit). Goal is excluded from autonomous runs because the declaration is a product judgment. The declaration location moved from the brief to the journal after the p12-t02 probe showed a brief edit under Delivery endpoint and authority stales terminal deliveries.
