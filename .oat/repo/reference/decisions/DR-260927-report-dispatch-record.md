---
id: DR-260927-report-dispatch-record
title: Report dispatch-record violations in one redacted message
date: 2026-09-27
status: accepted
legacy_id: null
---

# Report dispatch-record violations in one redacted message

## Context

Managed Claude dispatch-record validation stopped at the first violation, echoed bare field paths without the expected pattern, and was documented only with placeholders, so building a valid input took repeated trial runs (BL-260927-make-the-managed-claude, GitHub #326).

## Decision

oat project dispatch record collects every independent violation into a single multi-line error instead of adding a new violations JSON field, names checks it had to skip, states expected patterns, and scrubs secret-shaped values from each violation line before joining. oat project dispatch canonical-role produces canonical-role-resolution evidence, and a published managed-claude-example.json in oat-dispatch-subagents is pinned by validating it as-is. Shipped in triage-correctness-wave p03.

## Consequences

One run surfaces every problem without widening the JSON contract. Every echoed value passes through the scrub, and removing it fails tests, because the combined report was found to echo secrets during review. Whether to keep or remove the per-dispatch journal remains owned by BL-260909-give-the-dispatch-record.
