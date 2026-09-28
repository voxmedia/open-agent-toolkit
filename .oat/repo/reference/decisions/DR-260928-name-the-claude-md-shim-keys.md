---
id: DR-260928-name-the-claude-md-shim-keys
title: Name the CLAUDE.md shim keys under instructions.claude
date: 2026-09-28
status: accepted
legacy_id: null
---

# Name the CLAUDE.md shim keys under instructions.claude

## Context

DR-260927-claude-md-shims-are-opt made CLAUDE.md shims opt-in and DR-260928-persist-the-instruction-sync first persisted the strategy, as implemented in this PR before release, as documentation.instructionSyncStrategy beside the released documentation.instructionPointerExcludes (shipped in 0.2.63); that record now names the renamed key. Neither key is about documentation: both govern how oat instructions sync and oat instructions validate treat Claude Code's CLAUDE.md files, and the documentation namespace made them hard to find. Most repositories run on the defaults, so few configs carry either key.

## Decision

Amends DR-260927-claude-md-shims-are-opt. The strategy key is instructions.claude.shims (none | pointer | symlink | copy; absent means none) and the pointer-site exclusion list is instructions.claude.excludes (repository-relative directories). This is a clean rename: the old documentation keys are no longer read, with no compatibility read and no deprecation warning. The --strategy flag still overrides a single run. No new strategy value is added; keeping hand-written CLAUDE.md files is expressed by choosing pointer, symlink, or copy.

## Consequences

A repository that set a documentation-namespaced key must set the instructions.claude key instead; until it does, the built-in default applies (none, no extra exclusions). A released instructionPointerExcludes list is therefore ignored: sync scans the formerly excluded directories and adopts and removes a lone CLAUDE.md there, so the upgrade notice tells users to re-set the list under instructions.claude.excludes before their first sync. oat config set/get/unset/describe, the instruction commands' messages and --json, the agent-instructions and doctor skills, and the docs name only the new keys. The release notes call out the rename through the PR title (they list merged PR titles only), and the PR body carries the upgrade notice.
