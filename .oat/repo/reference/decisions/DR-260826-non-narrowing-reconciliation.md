---
id: DR-260826-non-narrowing-reconciliation
title: Non-narrowing reconciliation of the release-guard plan
date: 2026-08-26
status: accepted
legacy_id: null
---

# Non-narrowing reconciliation of the release-guard plan

## Context

The external plan scoped the current-main comparison to tools/release/check-version-bumps.ts and release-utils.ts, while the existing lockstep errors it appends to are produced in validate-public-packages.ts, which also backs release:validate.

## Decision

Keep the strict-greater comparison in check-version-bumps.ts / release-utils.ts exactly as scoped, appended to the result that already aggregates the merge-base lockstep errors, and leave release:validate's separate lockstep pass unchanged.

## Consequences

release:check-versions is the single enforcement point for the overtaken-main case; no competing gate was added; release:validate remains merge-base-only by design.
