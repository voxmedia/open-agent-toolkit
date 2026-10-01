---
id: DR-260718-explicit-cursor-pin-mapping
title: Explicit Cursor pin mapping
date: 2026-07-18
status: accepted
legacy_id: null
---

# Explicit Cursor pin mapping

## Context

Cursor ladder IDs and documented agent-frontmatter pins are different surfaces, and invalid pins can silently fall back.

## Decision

Maintain an explicit ladder-ID-to-frontmatter-selector registry and require mapping-specific Cursor IDE launch evidence before shipping each entry. A selector may use bracket parameters or an exact model ID; neither form is inferred from the ladder ID.

The 2026-10-01 revision admits verified exact-ID entries. [Cursor's subagent documentation](https://cursor.com/docs/subagents) supports specific model IDs, and the native Cursor 3.22.12 Sonnet 5.5 probe resolved all five exact effort IDs correctly while every bracket selector fell back. The retained evidence is in `packages/cli/src/providers/cursor/codec/__fixtures__/cursor-pin-probe-2026-10-01{,-events}.jsonl`.

An exact-ID entry requires an independent probe record whose submitted selector and resolved model match the mapping. Verify every shipped rung with native `subagentStart` and child `preToolUse` events, a known positive control, and unknown-family and unsupported-effort controls. Catalog presence alone does not approve an entry.

## Consequences

New mappings require live verification and registry maintenance, but OAT never derives pin syntax or passes arbitrary model IDs through. Existing bracket mappings remain unchanged. Earlier observations of other families, such as Grok 4.7, do not automatically add entries to the shipped catalog.
