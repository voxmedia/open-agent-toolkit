---
id: DR-260718-preserve-uncertain-legacy
title: Preserve uncertain legacy content
date: 2026-07-18
status: accepted
legacy_id: null
---

# Preserve uncertain legacy content

## Context

Obsolete manifest-owned Cursor skill views can contain user modifications or replacements that are unsafe to delete during a mapping upgrade.

## Decision

Delete only re-verified clean legacy views; detach modified, replaced, broken, or otherwise unverified paths from manifest ownership while preserving their contents.

## Consequences

Legacy cleanup is data-preserving, and preserved paths re-enter the normal Cursor skill disposition flow.
