---
id: DR-260714-graceful-missing-formatter
title: Graceful missing-formatter behavior
date: 2026-07-14
status: accepted
legacy_id: null
---

# Graceful missing-formatter behavior

## Context

Writers emit `no format command discovered in repo instructions; skipping` once and continue when repository instructions and relevant manifests expose no usable write/fix command. This surfaces configuration gaps without making missing formatter documentation a lifecycle failure.

## Decision

When no repository-documented write/fix command is discoverable, emit
`no format command discovered in repo instructions; skipping` once and
continue without formatting.

## Consequences

Missing formatter guidance remains visible to operators without blocking the
lifecycle. Writers must not infer or hardcode a formatter, and repositories
that require formatted artifacts should document an applicable write command.
