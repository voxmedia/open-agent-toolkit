---
id: DR-260830-use-content-digests
title: Use content digests as inventory authority
date: 2026-08-30
status: accepted
legacy_id: null
---

# Use content digests as inventory authority

## Context

Presence and version metadata do not prove that bundled and installed managed assets have equal content, and seed-if-missing assets must preserve legitimate user overrides.

## Decision

Use bounded bundled-versus-installed content digests as the authority for managed inventory equality while retaining version metadata as supplemental evidence.

## Consequences

Same-version skill and agent drift becomes visible, unchanged bundled seeds remain distinguishable from overrides, and hashing work stays limited to managed inventory paths.
