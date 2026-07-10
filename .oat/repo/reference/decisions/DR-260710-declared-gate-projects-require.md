---
id: DR-260710-declared-gate-projects-require
title: Declared gate projects require artifact corroboration
date: 2026-07-10
status: accepted
legacy_id: null
---

# Declared gate projects require artifact corroboration

## Context

A lifecycle caller that knows the project under review must pass it explicitly to oat gate review. The gate accepts a verdict only when its run correlation, containing project, and artifact oat_project all match that declaration; mismatch is a fail-closed targeting outcome.

## Decision

Reusable lifecycle gate commands pass the active project explicitly through
`oat gate review --project "$PROJECT_PATH"` while remaining provider-target
neutral. After dispatch, OAT accepts a review only when the unique run ID,
artifact location, and normalized `oat_project` frontmatter all corroborate the
declared project.

## Consequences

An ambient active-project mismatch cannot produce a green gate or mutate a
sibling project's review lifecycle. Legacy manual invocations without
`--project` remain supported but report ambient resolution rather than declared
corroboration. Targeting-correlation failures are fail-closed and are not
remediated as ordinary review findings.
