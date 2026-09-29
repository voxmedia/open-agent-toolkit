---
id: DR-260928-remove-no-claude-md-shim-while
title: Remove no CLAUDE.md shim while any CLAUDE.md has content
date: 2026-09-28
status: accepted
legacy_id: null
---

# Remove no CLAUDE.md shim while any CLAUDE.md has content

## Context

Under strategy none, oat instructions sync removed every exact OAT shim and kept every CLAUDE.md with its own content. Any CLAUDE.md, .claude/CLAUDE.md, or CLAUDE.local.md makes Claude Code's agents-md plugin ignore AGENTS.md for the sessions it covers, so a partial removal stranded directories: the removed shims were what carried their AGENTS.md instructions into those sessions.

## Decision

Amends DR-260927-claude-md-shims-are-opt; key names per DR-260928-name-the-claude-md-shim-keys. Under none, removal is all or nothing. If any CLAUDE.md, .claude/CLAUDE.md, or CLAUDE.local.md anywhere in the repository (excluded and documentation trees included) is not an exact OAT shim (pointer, sibling symlink, identical copy), sync removes nothing, including the managed shims and the CLAUDE.md of an adopted stray. A lone CLAUDE.md that sync adopts (no sibling AGENTS.md) does not itself block. Sync reports each held-back removal as a skipped action (exit 1), and sync, validate, and oat-doctor report one claude_md_blocks_shim_removal finding naming the files with content (paths), the shims kept (wouldRemove), why any CLAUDE.md matters with a link to the docs, and the next steps: remove the file or move its content into an AGENTS.md and rerun sync, or set instructions.claude.shims to pointer, symlink, or copy. No new keep strategy value is added.

## Consequences

A repository with a hand-written CLAUDE.md keeps its shims until the person resolves that file or opts into a shim strategy; nothing is lost silently. Validate keeps reporting the managed shims as drift but omits the sync fix line while the block holds. Rules and provider sync are unaffected.
