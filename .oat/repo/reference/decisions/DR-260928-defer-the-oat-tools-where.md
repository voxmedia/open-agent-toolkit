---
id: DR-260928-defer-the-oat-tools-where
title: Defer the oat tools where command
date: 2026-09-28
status: accepted
legacy_id: null
---

# Defer the oat tools where command

## Context

BL-260927-name-only-installed-pack (GitHub #323) required a recorded decision on shipping oat tools where [--json] to report where installed skills and packs live, because the managed tools guidance block named project skill directories even when packs were installed at user scope.

## Decision

Defer oat tools where. Ship only the scope-aware guidance block, which names only the skills directories that installed packs use, plus the read-only oat tools guidance command; oat tools list --json and oat tools info already report scope.

## Consequences

No new lookup command ships. Revisit only if a lookup by skill or pack name is still requested after the guidance fixes. Operator decision 2026-09-27, recorded in backlog-wave-2.
