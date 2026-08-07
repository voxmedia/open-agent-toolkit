---
id: DR-260805-generation-application
title: Generation, application, and filing have separate consent boundaries
date: 2026-08-05
status: accepted
legacy_id: null
---

# Generation, application, and filing have separate consent boundaries

## Context

Retrospective generation is read-and-write work inside the project, while applying repo edits and filing tracker items introduce distinct side effects that need explicit authorization.

## Decision

Treat configured post-approval sequencing as generation consent, workflow.retro.apply=auto as bounded non-interactive promotion consent, and configured filing destinations as consent for new filings only.

## Consequences

Unset non-interactive runs remain propose-only. Interactive runs still confirm side effects, and mutating an existing duplicate or crossing consequential boundaries requires separate direction.
