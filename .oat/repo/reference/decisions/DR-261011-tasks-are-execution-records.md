---
id: DR-261011-tasks-are-execution-records
title: Tasks are execution records in brief modes
date: 2026-10-11
status: accepted
legacy_id: null
---

# Tasks are execution records in brief modes

## Context

A brief agrees outcomes and design, not a task list. Planning tasks up front would reintroduce the quick workflow's plan maintenance cost.

## Decision

In brief modes '### Task pNN-tNN' entries are execution records opened in implementation.md when work starts and closed when the implementation commit lands (completed with the SHA, or failed, cancelled, or no-change with no fabricated commit). Whoever executes creates the record; commit messages keep (pNN-tNN). Lookahead sketches of several independent records are allowed; a maintained, approved up-front task plan is a promotion to quick instead. Task headings in the brief itself are a validation warning.

## Consequences

Records never change phase totals, and resume reconciles open records against git log and live handles before redispatch. Reviewers treat records as evidence of committed work, not requirements; requirements come from each phase's Intent and Exit evidence plus the brief's Outcomes.
