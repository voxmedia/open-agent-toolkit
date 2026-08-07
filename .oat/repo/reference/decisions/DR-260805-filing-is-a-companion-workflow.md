---
id: DR-260805-filing-is-a-companion-workflow
title: Filing is a companion workflow
date: 2026-08-05
status: accepted
legacy_id: null
---

# Filing is a companion workflow

## Context

Tracker destinations have different availability, authentication, duplicate, metadata, and privacy constraints that do not belong in retrospective synthesis.

## Decision

Keep retro generation focused on evidence and proposals, and place destination preflight, deduplication, sanitization, filing execution, and filing-status writeback in oat-project-retro-file.

## Consequences

Generating a retrospective never creates an external issue or backlog item by itself. Filing can evolve independently while consuming the same machine-scannable artifact contract.
