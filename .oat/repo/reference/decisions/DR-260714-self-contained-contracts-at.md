---
id: DR-260714-self-contained-contracts-at
title: Self-contained contracts at writing boundaries
date: 2026-07-14
status: accepted
legacy_id: null
---

# Self-contained contracts at writing boundaries

## Context

The approved runtime paragraph is duplicated at every dispatch or lifecycle boundary because referenced shared files may not be loaded or available in another runtime. A stable lead-in and full-copy regression tests make the intentional duplication auditable.

## Decision

Place the complete artifact hygiene contract at every canonical role, skill,
and CLI prompt boundary that can write tracked output. Keep the stable
`Artifact hygiene contract:` lead-in and verify that all runtime copies remain
equivalent.

## Consequences

Each dispatched writer can enforce formatting without relying on another file
being loaded in its runtime. The intentional duplication requires canonical
contract tests and coordinated provider projection whenever a copy changes.
