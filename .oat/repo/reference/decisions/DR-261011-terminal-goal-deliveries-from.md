---
id: DR-261011-terminal-goal-deliveries-from
title: Terminal goal deliveries from one head branch share their member PR
date: 2026-10-11
status: accepted
legacy_id: null
---

# Terminal goal deliveries from one head branch share their member PR

## Context

A frozen delivery scope never spans milestones (goal-delivered-scope-changed), so pr-final registers one terminal delivery per milestone with uncovered accepted phases; all are published from the project branch and GitHub allows one open pull request per head and base. The p11 review (M2) offered sharing the member PR or relaxing the validate-plan rule so one terminal delivery could span milestones.

## Decision

Keep the validate-plan rule. Terminal deliveries registered from one head branch share their member pull request, so one member URL may appear in several deliveries. Coverage judges each delivery's own frozen scope and bound evidence, never the shared member alone; a phase reachable only through the shared member is uncovered. Review artifacts of deliveries sharing a member are permitted bookkeeping for each other in the successor evaluator. oat_pr_url and oat_pr_status project the latest member.

## Consequences

pr-final runs pr-progress registration steps per delivery but never step 3a, and expects the shared member. The p12-t02 probe (two terminal deliveries on one PR) passed closeout after the evaluator learned the sibling-artifact rule; removing one delivery reports phase-uncovered.
