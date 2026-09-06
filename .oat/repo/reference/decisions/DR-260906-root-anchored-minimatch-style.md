---
id: DR-260906-root-anchored-minimatch-style
title: Root-anchored minimatch-style docs-index exclusion grammar
date: 2026-09-06
status: accepted
legacy_id: null
---

# Root-anchored minimatch-style docs-index exclusion grammar

## Context

documentation.excludes needed a small, predictable pattern language in which a bare CLAUDE.md, \*\*/CLAUDE.md, and subdir/ have distinct behaviors, and the matcher must not be vulnerable to catastrophic backtracking.

## Decision

Patterns are root-anchored relative to the resolved docs directory and follow minimatch semantics (\*_ crosses segments, _ stays within a segment, a trailing slash prunes a directory), implemented as a greedy two-pointer matcher rather than compiled RegExp.

## Consequences

Gitignore-style any-depth matching is not supported for bare names; the grammar is documented on three docs pages and verified against a brute-force oracle; new operators require extending the matcher and its oracle test.
