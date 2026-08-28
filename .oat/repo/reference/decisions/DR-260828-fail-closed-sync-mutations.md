---
id: DR-260828-fail-closed-sync-mutations
title: Fail-closed sync mutations
date: 2026-08-28
status: accepted
legacy_id: null
---

# Fail-closed sync mutations

## Context

Synced lifecycle operations span nested project history and a narrow set of parent-branch records, creating a risk of cross-project or unrelated-index mutation.

## Decision

Validate canonical slug, path, and ref identity; confine parent commits to explicit paths; reject ambiguous receipts; preserve unrelated staged state; and never force-push.

## Consequences

Invalid or contradictory states stop before publication or destructive cleanup, making retries more explicit but protecting both the parent checkout and project history.
