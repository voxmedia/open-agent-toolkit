---
id: DR-261031-limit-journal-rewrite
title: Limit journal rewrite detection to goal projects
date: 2026-10-31
status: accepted
legacy_id: null
---

# Limit journal rewrite detection to goal projects

## Context

Delivery evidence rejects rewritten committed implementation.md lines in goal projects, but oat project journal check did not report them, so the violation surfaced only at delivery time (GitHub #385). Only goal mode enforces the append-only journal rule (brief contract section 12.8, judgeJournalChange); brief and other modes have no consumer that rejects rewrites.

## Decision

In goal projects only, and only at the implement-preflight and review boundaries, journal check compares the working journal with HEAD using the same exported journalRewrites rule delivery evidence applies, and refuses with one journal-line-rewritten reason per rewritten or removed committed line; unparseable committed frontmatter also refuses. --at completion and complete-state are unchanged.

## Consequences

Rewrites are caught before delivery check would reject them, with one shared rule and no false positives in non-goal projects. The check reports uncommitted rewrites only; already committed rewrites remain delivery check's to reject, and new extraction markers stay delivery evidence's to reject. This narrows the backlog item's goal-and-brief wording.
