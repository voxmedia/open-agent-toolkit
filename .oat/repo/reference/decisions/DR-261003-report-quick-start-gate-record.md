---
id: DR-261003-report-quick-start-gate-record
title: Report quick-start gate record without routing
date: 2026-10-03
status: accepted
legacy_id: null
---

# Report quick-start gate record without routing

## Context

BL-260927-persist-quick-start-prompt asked quick-start to persist its gate outcome and next and progress to read it the same way. Quick plan readiness is already the single routing rule for quick plans, defined in quick-start and mirrored by the router and dashboard, and the operator chose at the plan-gate escalation that next and progress report the record only (backlog-wave-4 discovery, Question 5 and decision 8).

## Decision

Quick-start persists its gate outcome as oat_quick_start_gate, whose five-field core shape is defined once in .agents/docs/gate-approval-record.md and vendored by the consuming skills. Next and progress validate and report the record but do not route on it; quick plan readiness remains the only routing rule for quick plans.

## Consequences

Routing behavior for quick plans is unchanged and stays defined in one place. A declined or deferred gate persists nothing that reads as approval; the project-disabled branch records allowed/project_disabled. Progress also reports the implement exit-gate record. Any future routing on the record needs a new decision.
