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

Maintain an explicit flat-ID-to-bracket-form registry and require mapping-specific Cursor IDE launch evidence before shipping each entry.

## Consequences

New mappings require live verification and registry maintenance, but OAT never derives or emits undocumented pin syntax.
