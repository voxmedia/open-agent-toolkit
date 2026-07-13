---
id: DR-260713-stable-npm-metadata
title: Stable npm metadata with a dedicated cache
date: 2026-07-13
status: accepted
legacy_id: null
---

# Stable npm metadata with a dedicated cache

## Context

Update availability follows npm's latest dist-tag and stores runtime timestamps separately from user-authored configuration.

## Decision

Resolve update availability from the npm `latest` endpoint for
`@open-agent-toolkit/cli`, accept only strict stable `major.minor.patch`
versions, and persist check/notice timestamps in
`~/.oat/update-check.json`. Reuse the same validated availability result for
passive notices and guarded tool-bundle mutations.

## Consequences

- Prerelease and malformed versions are ignored.
- Successful and failed refresh attempts are rate-limited so offline commands
  do not repeatedly pay the network timeout.
- Runtime cache state remains separate from user-authored configuration.
- Registry, parse, and cache failures remain best-effort and do not block
  ordinary commands.
