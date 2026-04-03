---
title: Provider Sync
description: Standalone adoption lane for canonical assets, provider views, sync commands, and drift management.
---

# Provider Sync

Provider Sync is the OAT lane for keeping a canonical rules-and-skills layout in sync with provider-specific surfaces such as Claude, Cursor, Copilot, Gemini, or Codex.

You can adopt this layer on its own. It does not require tracked OAT projects, and it is the right starting point when you mainly want interoperability and drift control.

## What This Section Is

This section explains how OAT treats `.agents/` and `.oat/` as the source of truth, how provider views are derived from those canonical assets, and how sync/adoption workflows keep everything aligned.

## Who It's For

- Teams adopting OAT primarily for provider interoperability
- Users who want one canonical asset layout instead of hand-maintaining provider copies
- Repos that need drift detection, adoption flows, and explicit sync control

## Start Here

- Read [Overview](overview.md) for the plain-language model and the first-sync flow.
- Use [CLI Bootstrap](../guide/getting-started.md) when you are bootstrapping OAT and want the sync-relevant setup path.
- Go to [Commands](../guide/provider-sync/commands.md) once you are actively using `oat status`, `oat sync`, and `oat providers`.

## Common Tasks

- Understand the canonical/provider-view model in [Scope and Surface](../guide/provider-sync/scope-and-surface.md).
- Learn provider-specific mappings in [Providers](../guide/provider-sync/providers.md).
- Diagnose drift and adoption behavior in [Manifest and Drift](../guide/provider-sync/manifest-and-drift.md).
- Adjust provider enablement and scope behavior in [Sync Config](../guide/provider-sync/config.md).

## Go Deeper

- [Overview](overview.md) - What provider sync is, when to use it, and what a typical sync loop looks like.
- [CLI Bootstrap](../guide/getting-started.md) - Foundational setup before first sync.
- [Scope and Surface](../guide/provider-sync/scope-and-surface.md) - Canonical assets, provider views, scopes, and the sync surface area.
- [Commands](../guide/provider-sync/commands.md) - `oat status`, `oat sync`, and `oat providers ...` behavior.
- [Providers](../guide/provider-sync/providers.md) - Provider-specific mappings, capabilities, and path conventions.
- [Manifest and Drift](../guide/provider-sync/manifest-and-drift.md) - How OAT tracks synced state, stray files, and adoption decisions.
- [Sync Config](../guide/provider-sync/config.md) - Provider config model, enablement, and scope semantics.
