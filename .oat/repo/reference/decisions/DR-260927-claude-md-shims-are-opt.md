---
id: DR-260927-claude-md-shims-are-opt
title: CLAUDE.md shims are opt-in
date: 2026-09-27
status: accepted
legacy_id: null
---

# CLAUDE.md shims are opt-in

## Context

`oat instructions sync` creates a CLAUDE.md shim (`@AGENTS.md`, a symlink, or a
copy) beside every AGENTS.md by default, so Claude Code would load the shared
instructions. Claude Code now reads AGENTS.md itself through its built-in
`agents-md` plugin (anthropics/claude-code `mods/agents-md`, v2.1.278), whose
default `instructionFiles` mode is `claude-md-or-agents-md`. In that mode the
plugin stands down for the whole project when any `CLAUDE.md`,
`.claude/CLAUDE.md`, or `CLAUDE.local.md` exists from the project root down to
the working directory (a user's `~/.claude/CLAUDE.md` does not count). A
repository with some shims but not others therefore loses every AGENTS.md that
lacks one. The option can be set only in user or managed settings, not in a
project's `.claude/settings.json`. Tracked by
`BL-260927-make-claude-md-shims-opt`.

## Decision

- Shim creation is opt-in through `.oat/config.json`. With no configuration,
  `oat instructions sync` creates no CLAUDE.md and a missing CLAUDE.md is not
  drift.
- Under the no-shim default, sync removes CLAUDE.md files OAT created (exact
  `@AGENTS.md` pointer content, a symlink to the sibling AGENTS.md, or a
  byte-identical copy) automatically on a non-dry-run sync. Hand-written or
  modified CLAUDE.md files are reported and never deleted. The release notes
  call out the removal.
- This repository drops its own shims in the implementing PR, dogfooding the
  default.

Rejected alternatives: report managed shims and remove them only behind a flag
(a repository can sit in the partial state where Claude Code ignores
unshimmed AGENTS.md files); write the old strategy into existing repositories'
config so only new repositories change (keeps redundant files everywhere OAT
is already installed).

## Consequences

- Contributors on Claude Code releases without the `agents-md` plugin, or who
  set `instructionFiles` to `claude-md`, no longer see AGENTS.md content in
  repositories that follow the default. Those repositories opt back in through
  config; the docs say when to.
- Validation, `oat-doctor`, and the agent-instructions analyze and apply skills
  stop requiring shims unless a shim strategy is configured.
- `BL-260830-persist-instruction-sync` is absorbed; its criterion that migration
  preserves existing installations is superseded by the automatic removal
  above.
