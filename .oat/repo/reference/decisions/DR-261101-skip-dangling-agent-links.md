---
id: DR-261101-skip-dangling-agent-links
title: Skip dangling agent links in collision scans
date: 2026-11-01
status: accepted
legacy_id: null
---

# Skip dangling agent links in collision scans

## Context

The Cursor sync extension's collision scan over .cursor/agents, .claude/agents and .codex/agents validated every symbolic link's real path; a dangling link (missing target) failed that check and was reported as target escapes the sync scope. The throw happened during planning, so deleting or renaming a canonical agent broke oat sync, sync --dry-run and oat status before the main plan could remove the stale views.

## Decision

Skip a link whose target does not exist, because it cannot define a role, including a dangling link whose name collides with a desired role (main sync replaces it with a managed link). Keep the escapes-the-sync-scope refusal for an existing target outside the scope. Only ENOENT counts as dangling; other stat failures such as a link loop keep a controlled exit-1 error.

## Consequences

Agent delete and rename no longer abort sync, dry-run or status, and stale .claude, .cursor and .github/agents views are removed. A dangling link at a generated Cursor variant or Codex role path still stops sync with exit 1 until the link is deleted, because sync cannot write through it.
