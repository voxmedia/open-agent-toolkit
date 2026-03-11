---
title: Provider Interop CLI Docs
description: 'Provider interoperability overview with scope, command surface, and adapter behavior.'
---

# Provider Interop CLI Docs

This section describes provider interoperability behavior in `@oat/cli`.

It is a standalone adoption path and does not require workflow project artifacts.

Shared CLI conventions live in [`../design-principles.md`](../design-principles.md).

## Contents

- [Scope and Surface](scope-and-surface.md) - Scope, principles, and command surface.
- [Commands](commands.md) - Command-level behavior for provider interop such as `status`, `sync`, and `providers ...`.
- [Providers](providers.md) - Provider-specific mapping behavior for Claude, Cursor, Copilot, Gemini, and Codex.
- [Manifest and Drift](manifest-and-drift.md) - Manifest model, drift states, and stray adoption.
- [Config](config.md) - Sync config model and provider enablement semantics.
- [Hooks and Safety](hooks-and-safety.md) - Hook behavior and operational safety contracts.

## Related CLI docs (non-interop command families)

- [`../bootstrap.md`](../bootstrap.md) (`oat init`)
- [`../tool-packs-and-assets.md`](../tool-packs-and-assets.md) (`oat tools ...`)
- [`../diagnostics.md`](../diagnostics.md) (`oat doctor`)
