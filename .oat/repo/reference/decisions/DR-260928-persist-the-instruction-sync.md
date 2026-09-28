---
id: DR-260928-persist-the-instruction-sync
title: Persist the instruction sync strategy in project config
date: 2026-09-28
status: accepted
legacy_id: null
---

# Persist the instruction sync strategy in project config

## Context

With CLAUDE.md shims becoming opt-in, users who still want shims needed a durable way to choose the strategy instead of passing --strategy on every oat instructions sync run. BL-260830-persist-instruction-sync had also asked for a persisted strategy plus an init prompt.

## Decision

Persist the strategy as instructions.claude.shims (none | pointer | symlink | copy; absent means none), beside instructions.claude.excludes, which governs the same oat instructions commands (key names per DR-260928-name-the-claude-md-shim-keys). --strategy overrides a single run. BL-260830-persist-instruction-sync is closed as absorbed and its init prompt is dropped, because the default is none and opting in is one oat config set.

## Consequences

Opting back in is oat config set instructions.claude.shims pointer followed by oat instructions sync. The key is accepted only together with the behavior it controls. BL-260830's migration-preservation criterion is superseded by DR-260927-claude-md-shims-are-opt. Shipped in backlog-wave-2 (lockstep 0.3.9).
