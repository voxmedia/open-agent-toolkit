---
title: Provider Sync Overview
description: Plain-language explanation of canonical assets, provider views, and the first-sync loop.
---

# Provider Sync Overview

Provider sync lets OAT manage one canonical set of agent assets and then project those assets into provider-specific views. In practice, that means you edit the canonical layout in `.agents/` and `.oat/`, then let OAT generate or reconcile the provider copies.

This is useful when you want consistent instructions, skills, and rules across multiple providers without treating each provider directory as a long-lived hand-maintained source of truth.

## What OAT Treats As Canonical

- canonical skills, agents, and rules under `.agents/`
- sync state and related metadata under `.oat/`
- provider-specific files as derived views unless they are explicitly adopted back into canonical form

## Typical Flow

1. Run `oat init` to create the base OAT layout and setup state.
2. Inspect current sync state with `oat status`.
3. Adjust provider enablement with `oat providers ...` if needed.
4. Run `oat sync` to materialize provider views from canonical assets.
5. Re-run `oat status` after edits to confirm whether anything drifted or needs adoption.

## When To Use This Section

Use Provider Sync when:

- you want to adopt OAT incrementally, without committing to tracked project workflows yet
- you need a clear model for drift, strays, and adoption
- you want to understand which files should be edited directly and which should be regenerated

## Continue Here

- [Getting Started](getting-started.md) for the first sync setup flow
- [Scope and Surface](scope-and-surface.md) for the canonical/provider-view model
- [Commands](commands.md) for the exact CLI behavior
