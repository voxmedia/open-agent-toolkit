---
title: Provider Sync
description: Standalone adoption lane for canonical assets, provider views, sync commands, and drift management.
---

# Provider Sync

Provider Sync is the OAT lane for reconciling a canonical rules-and-skills
layout with provider-specific surfaces such as Claude, Cursor, Copilot, Gemini,
or Codex.

You can adopt this layer on its own. It does not require tracked OAT projects, and it is the right starting point when you mainly want interoperability and drift control.

In practice, you edit the canonical layout in `.agents/` and `.oat/`. OAT
generates provider-specific views where required, leaves native-read assets in
their canonical directories, and keeps intentional provider-local adoption
surfaces visible.

## Contents

- [Provider Interop Commands](commands.md) - `oat status`, `oat sync`, and `oat providers ...` behavior.
- [Sync Config](config.md) - Provider config model, enablement, and scope semantics.
- [Instruction Sync](instruction-sync.md) - Project-scoped `AGENTS.md` / `CLAUDE.md` validation, repair, and Claude-only adoption.
- [Manifest and Drift](manifest-and-drift.md) - How OAT tracks synced state, stray files, and adoption decisions.
- [Providers](providers.md) - Provider-specific mappings, capabilities, and path conventions.
- [Provider Interop CLI Scope and Surface](scope-and-surface.md) - Canonical assets, provider views, scopes, and the sync surface area.

## What This Section Is

This section explains how OAT treats `.agents/` and `.oat/` as the source of
truth, when provider views are derived from those canonical assets, how
native-read mappings avoid redundant output, and how provider-local adoption
surfaces remain discoverable.

## What OAT Treats As Canonical

- canonical skills, agents, and rules under `.agents/`
- sync state and related metadata under `.oat/`
- provider-specific files as derived views when a mapping requires output
- native-read assets in canonical directories without mirrored provider files
- provider-local extension files as adoption candidates until explicitly
  adopted or remembered as intentional strays

## Who It's For

- Teams adopting OAT primarily for provider interoperability
- Users who want one canonical asset layout instead of hand-maintaining provider copies
- Repos that need drift detection, adoption flows, and explicit sync control

## Typical Flow

1. Run `oat init` to create the base OAT layout and setup state.
2. Inspect current sync state with `oat status`.
3. Adjust provider enablement with `oat providers ...` if needed.
4. Run `oat sync` to materialize required provider views and reconcile managed
   state. Native-read assets do not produce provider-view operations.
5. Re-run `oat status` after edits to confirm whether anything drifted or needs adoption.

## Start Here

- Use [CLI Bootstrap](../cli-utilities/bootstrap.md) when you are bootstrapping OAT and want the sync-relevant setup path.
- Go to [Commands](commands.md) once you are actively using `oat status`, `oat sync`, and `oat providers`.
- Read [Scope and Surface](scope-and-surface.md) when you need the canonical/provider-view mental model.

## Common Tasks

- Understand the canonical/provider-view model in [Scope and Surface](scope-and-surface.md).
- Manage nested `AGENTS.md` / `CLAUDE.md` integrity in [Instruction Sync](instruction-sync.md).
- Learn provider-specific mappings in [Providers](providers.md).
- Diagnose drift and adoption behavior in [Manifest and Drift](manifest-and-drift.md).
- Adjust provider enablement and scope behavior in [Sync Config](config.md).

## Go Deeper

- [CLI Bootstrap](../cli-utilities/bootstrap.md) - Foundational setup before first sync.
- [Scope and Surface](scope-and-surface.md) - Canonical assets, provider views, scopes, and the sync surface area.
- [Commands](commands.md) - `oat status`, `oat sync`, and `oat providers ...` behavior.
- [Instruction Sync](instruction-sync.md) - Project-scoped `AGENTS.md` / `CLAUDE.md` validation, repair, and Claude-only adoption.
- [Providers](providers.md) - Provider-specific mappings, capabilities, and path conventions.
- [Manifest and Drift](manifest-and-drift.md) - How OAT tracks synced state, stray files, and adoption decisions.
- [Sync Config](config.md) - Provider config model, enablement, and scope semantics.
