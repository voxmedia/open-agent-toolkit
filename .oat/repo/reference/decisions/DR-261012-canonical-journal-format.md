---
id: DR-261012-canonical-journal-format
title: Canonical journal format and validator
date: 2026-10-12
status: accepted
legacy_id: null
---

# Canonical journal format and validator

## Context

Completion accepted journals whose statuses disagreed with state.md, plan tasks with no journal block, tables or checklists in place of task blocks, and pasted dispatch payloads. The audit's own regex check produced a false positive on flow-style YAML frontmatter.

## Decision

One canonical journal format: ### Task pNN-tNN blocks with exactly one status and commit evidence in task modes, phase-unit records in brief and goal, read through a shared heading-only record reader in the control plane. oat project journal check validates it at implement-preflight, review (explicit phase scope) and completion, using the production frontmatter parser; complete-state re-runs it and writes nothing on refusal. Dispatch launches are one-line run records rendered by dispatch record --format line, and a pasted payload or unresolved run line refuses at completion. Overrides are journal-only reason codes (artifact-cleanup D5, D6).

## Consequences

Tables and checklists are display, never completion evidence. Failed, cancelled and no-change execution records need no SHA. Every refusal names a code, path, line and owner. No second ledger is introduced.
