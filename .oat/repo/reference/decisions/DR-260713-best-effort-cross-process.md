---
id: DR-260713-best-effort-cross-process
title: Best-effort cross-process update cadence
date: 2026-07-13
status: accepted
legacy_id: null
---

# Best-effort cross-process update cadence

## Context

Check and notice TTLs are exact for serial invocations; cross-process locking is deferred unless overlapping processes cause practical duplicate notices.

## Decision

Use a 24-hour check-attempt TTL and a 72-hour same-version notice TTL without
adding a cross-process lock. Persist attempted refresh timestamps even when
the registry request fails, while preserving the last trusted version.

## Consequences

- Serial invocations honor the configured cadence exactly.
- Overlapping CLI processes can duplicate a registry check, passive notice, or
  guarded offer because cache decisions are not serialized.
- User documentation states this best-effort cross-process behavior.
- Cross-process claims and stale-lock recovery remain deferred unless
  duplicate output becomes a practical problem.
