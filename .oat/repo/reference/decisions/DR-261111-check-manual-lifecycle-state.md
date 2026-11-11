---
id: DR-261111-check-manual-lifecycle-state
title: Check manual lifecycle state parsing
date: 2026-11-11
status: accepted
legacy_id: null
---

# Check manual lifecycle state parsing

## Context

The goal-delivery-freshness retro UP-03 records malformed state.md YAML that was not caught at the write boundary. The approved brief chose a bounded shared parser check rather than migrating all lifecycle state writers to CLI setters.

## Decision

Require the installed read-only oat project check-state command immediately after manual lifecycle state.md frontmatter writes, before commit or continued workflow effects. It checks the frontmatter mapping and strict YAML parsing with the existing grammar; failure stops the workflow until repair and recheck. CLI-owned writes remain owned by their commands.

## Consequences

The shared check preserves bytes and is usable outside the repository checkout. Its guarantee excludes semantic lifecycle validation, provenance and correctness of field values. Canonical instructions and the reviewed manual-writer inventory carry coverage; instruction presence does not prove agent compliance. Template cleanup and a generalized state editor remain outside this change.
