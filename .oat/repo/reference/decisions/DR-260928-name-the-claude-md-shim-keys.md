---
id: DR-260928-name-the-claude-md-shim-keys
title: Name the CLAUDE.md shim keys under instructions.claude
date: 2026-09-28
status: accepted
legacy_id: null
---

# Name the CLAUDE.md shim keys under instructions.claude

## Context

DR-260927-claude-md-shims-are-opt made CLAUDE.md shims opt-in and DR-260928-persist-the-instruction-sync persisted the strategy as documentation.instructionSyncStrategy beside documentation.instructionPointerExcludes. Neither key is about documentation: both govern how oat instructions sync and oat instructions validate treat Claude Code's CLAUDE.md files, and the documentation namespace made them hard to find. Most repositories run on the defaults, so few configs carry either key.

## Decision

Amends DR-260927-claude-md-shims-are-opt. The strategy key is instructions.claude.shims (none | pointer | symlink | copy; absent means none) and the pointer-site exclusion list is instructions.claude.excludes (repository-relative directories). This is a clean rename: the old documentation keys are no longer read, with no compatibility read and no deprecation warning. The --strategy flag still overrides a single run. No new strategy value is added; keeping hand-written CLAUDE.md files is expressed by choosing pointer, symlink, or copy.

## Consequences

A repository that set a documentation-namespaced key must set the instructions.claude key instead; until it does, the built-in default applies (none, no extra exclusions). oat config set/get/unset/describe, the instruction commands' messages and --json, the agent-instructions and doctor skills, and the docs name only the new keys. The release notes call out the rename.
