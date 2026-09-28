---
id: DR-260928-exclude-project-and-repository
title: Exclude project and repository records from exit-gate freshness
date: 2026-09-28
status: accepted
legacy_id: null
---

# Exclude project and repository records from exit-gate freshness

## Context

The implementation exit gate binds a passed final review to an `effective-delta-v1` fingerprint that excludes only the project's `state.md` carrier. Every later write under `.oat/projects/` or `.oat/repo/` (review artifacts, summaries, project logs, backlog items, decision records) therefore changes the fingerprint, so a gate result goes stale, or must be rescued by per-path closeout-only classification, for changes that cannot alter shipped behavior. Templates, scripts, config, and the sync manifest under `.oat/` do ship or steer behavior and must keep invalidating the gate.

## Decision

New gate generations persist `sha256:effective-delta-v2:<digest>`. v2 is identical to v1 (prefix `effective-delta-v2\0`, Git `--raw -z --no-renames --no-abbrev` from the unique merge base) except that its exclusion set is the exact `$PROJECT_PATH/state.md` plus every path under `.oat/projects/` and `.oat/repo/`, expressed as literal exclusion pathspecs, never globs, so sibling names such as `.oat/projects-archive` stay included. `.oat/templates/`, `.oat/scripts/`, `.oat/config*.json`, and `.oat/sync/` stay fingerprinted. A stored `sha256:effective-delta-v1:<digest>` value keeps v1 semantics (only the `state.md` carrier excluded) and is never reinterpreted; its replacement generation after it goes stale uses v2.

## Consequences

Under v2, a descendant commit that only touches project artifacts or repository records leaves the effective delta unchanged, so it needs no owning closeout transition and never stales the gate. In-flight v1 generations behave exactly as before. The oat-project-implement completion reference, the implementation-execution docs page, and the `state.md` template name v2; `post-implement-sequence-contracts.test.ts` pins the exclusion set, the v1 preservation rule, and the kept `.oat` paths against a real Git repository.
