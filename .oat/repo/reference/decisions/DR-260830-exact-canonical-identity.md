---
id: DR-260830-exact-canonical-identity
title: Exact canonical identity for loaded targets
date: 2026-08-30
status: accepted
legacy_id: null
---

# Exact canonical identity for loaded targets

## Context

Loaded provider roots can expose Claude or Cursor canonical symlinks alongside materialized variants and copies, while Codex exposes transformed TOML. Filename, extension, and byte equality do not prove that a provider view is the canonical Markdown source.

## Decision

Admit a loaded /agents/<canonical-name>.md target only when it is the direct same-scope .agents/agents/<canonical-name>.md file or a symlink whose realpath is exactly that file. Treat every other loaded representation as a candidate miss and continue to user and project canonical roots.

## Consequences

Unsuffixed Claude and Cursor canonical symlinks remain usable, while copies, model or effort variants, Codex TOML, broken links, and escaping links cannot become role instructions. Some otherwise identical copies are intentionally rejected in favor of deterministic fallback or fail-closed recovery.
