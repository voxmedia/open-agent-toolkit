---
id: DR-260830-keep-legacy-false-values
title: Keep legacy false values readable but unwritable
date: 2026-08-30
status: accepted
legacy_id: null
---

# Keep legacy false values readable but unwritable

## Context

Existing tools.<pack> false values are migration input, but allowing supported configuration commands to create new false intents would preserve a conflicting legacy state.

## Decision

Continue reading existing false pack intents for migration while rejecting new false writes and directing callers to scoped removal.

## Consequences

Legacy repositories remain readable, supported commands cannot create new conflict states, and callers receive an actionable supported alternative.
