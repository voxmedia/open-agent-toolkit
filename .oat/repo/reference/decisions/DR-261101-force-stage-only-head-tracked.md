---
id: DR-261101-force-stage-only-head-tracked
title: Force-stage only HEAD-tracked exact paths
date: 2026-11-01
status: accepted
legacy_id: null
---

# Force-stage only HEAD-tracked exact paths

## Context

oat internal commit-paths staged with git add -A into an isolated index, so a tracked file under a directory matched by an ignore rule failed with exit 2 and Git's paths-are-ignored message. The helper must keep refusing untracked ignored paths.

## Decision

commit-paths stages paths already tracked in HEAD with Git's force flag and stages everything else normally. The repository's .lintstagedrc.mjs excludes packages/cli/assets from the Markdown and JSON tasks so the pre-commit hook's re-stage no longer fails on tracked template files.

## Consequences

Tracked files under ignored directories commit through the hook-safe primitive with hooks enabled and no manual git add -f, while untracked ignored paths are still refused, as negative controls showed. Exact-path commit changes keep a real-hook probe, since lint-staged exited 0 while its re-stage failed.
