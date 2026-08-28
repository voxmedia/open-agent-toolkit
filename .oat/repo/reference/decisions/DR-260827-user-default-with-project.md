---
id: DR-260827-user-default-with-project
title: User default with project compatibility
date: 2026-08-27
status: accepted
legacy_id: null
---

# User default with project compatibility

## Context

Personal reuse benefits from user-scope defaults, while teams still need project-scoped reproducibility and existing placements must not move silently.

## Decision

Default fresh reusable pack installs to user scope, retain project scope, and preserve existing project, user, or dual placement until explicit migration.

## Consequences

Consumer repositories avoid routine managed-copy churn without forcing disruptive migration or removing repository-declared tooling.
