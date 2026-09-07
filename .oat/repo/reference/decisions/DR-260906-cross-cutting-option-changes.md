---
id: DR-260906-cross-cutting-option-changes
title: Cross-cutting option changes sweep the repository and widen mechanically
  or stop
date: 2026-09-06
status: accepted
legacy_id: null
---

# Cross-cutting option changes sweep the repository and widen mechanically or stop

## Context

Wave 3 p01 of the 2026-08-31 execution program. A regression once shipped because an implementer task changed a cross-cutting option and edited only the plan-listed files while fixtures, tests, and other callers kept the old shape.

## Decision

The phase-implementer contract requires a repository-wide sweep for every consumer of a changed cross-cutting option (including fixtures, mocks, snapshots, and tests) before editing; the effective task boundary is the declared files plus mechanical additions permitted by, and reported under, that sweep; an expansion that crosses another owner or needs a contract decision stops and reports. The implement route's root acceptance clause accepts the same effective boundary.

## Consequences

Task commits may legitimately touch files the plan did not list, reported under the sweep; root acceptance cannot regress to plan-list-only files (contract assertion); cross-owner expansions surface as reports rather than silent widenings.
