---
id: DR-261012-journal-slots-and-state-owned
title: Journal slots and state-owned gates
date: 2026-10-12
status: accepted
legacy_id: null
---

# Journal slots and state-owned gates

## Context

Writers appended receipts, deferrals and gate transitions wherever convenient, often after ## References, and mirrored every gate transition from state.md into the journal.

## Decision

implementation.md and implementation-brief.md gain fixed slots ## Reviews and Gates and ## Deferred Findings; the implementation log, per-phase test table and conventions blockquote are dropped; the project-log header becomes two lines. Every writer targets the slots, and ## References stays last. state.md owns gate transitions; the journal keeps one terminal line per gate run plus waivers, overrides, operator choices and failure dispositions (artifact-cleanup D7, D8).

## Consequences

Slots, templates and the log header change together with every writer. The journal validator refuses misplaced receipts and deferrals. Receipts are more than status mirrors, so they stay in the journal.
