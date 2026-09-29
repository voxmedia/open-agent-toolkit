---
id: DR-260928-backlog-archive-rewrites
title: Backlog archive rewrites inbound references
date: 2026-09-28
status: accepted
legacy_id: null
---

# Backlog archive rewrites inbound references

## Context

oat backlog archive moved an item file out of items/ without updating other .oat/repo files that linked to it, leaving dangling references (BL-260909-rewrite-inbound-references). Review rounds showed that a naive rewriter escapes the repository through symlinks, rewrites URLs and unrelated paths, corrupts footnotes, and writes through hard links.

## Decision

Archive rewrites inbound references rather than only warning: .oat/repo Markdown links, repository-root path strings, and whole-span code citations that resolve to the moved item. URLs, symlinks, out-of-root real paths, fenced code, and links that still resolve are left alone; unresolvable local forms warn; re-runs retry. Rewritten files are replaced through an O_EXCL | O_NOFOLLOW temporary file and rename in the verified parent after an lstat device and inode re-check.

## Consequences

Archive now edits other .oat/repo files, which users see in their diff. Hard links are never written through. Remaining edge cases (ownership change on replace, same-inode concurrent edit, long temporary names) are tracked in BL-260928-harden-the-backlog-reference. Older archived items with code-span citations are repointed only if archive is re-run on them.
