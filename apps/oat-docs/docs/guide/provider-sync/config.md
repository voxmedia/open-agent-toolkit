---
title: 'Sync Config (`.oat/sync/config.json`)'
description: 'Configuration schema and behavior for provider sync in .oat/sync/config.json.'
---

# Sync Config (`.oat/sync/config.json`)

This document defines the project sync config used by provider-interop commands.

## Location

- Project scope: `.oat/sync/config.json`

## Purpose

`config.json` controls provider enablement and sync strategy behavior.

Discovery note:

- `oat config describe` includes `.oat/sync/config.json` in its catalog so you can inspect the sync/provider keys from the main config help surface.
- Mutation ownership still lives with provider-sync commands such as `oat providers set`, not `oat config set`.

It is read by:

- `oat init` (provider selection and defaults)
- `oat sync` (active provider resolution and mismatch handling)
- `oat providers set` (explicit provider enable/disable updates)

## Schema (current)

```json
{
  "version": 1,
  "defaultStrategy": "auto",
  "providers": {
    "claude": {
      "enabled": true,
      "strategy": "symlink"
    },
    "cursor": {
      "enabled": false
    }
  }
}
```

### Fields

| Field                       | Required                              | Description                                                |
| --------------------------- | ------------------------------------- | ---------------------------------------------------------- |
| `version`                   | yes                                   | Config schema version (currently `1`)                      |
| `defaultStrategy`           | yes                                   | Global default sync strategy: `auto`, `symlink`, or `copy` |
| `providers`                 | no (persisted), normalized at runtime | Provider-specific overrides keyed by adapter name          |
| `providers.<name>.enabled`  | no                                    | Explicit provider activation (`true` / `false`)            |
| `providers.<name>.strategy` | no                                    | Per-provider strategy override (`auto`, `symlink`, `copy`) |

## Behavior notes

- If `providers.<name>.enabled` is:
  - `true`: provider is active even if provider directory detection is false.
  - `false`: provider is inactive even if directory is detected.
  - unset: provider falls back to directory detection.
- `defaultStrategy` is used when no provider-specific `strategy` is set.
- At runtime, config is normalized so `providers` is always present in memory.

## Recommended management flow

- Initial setup (interactive): `oat init --scope project`
- Explicit updates: `oat providers set --scope project --enabled <providers> --disabled <providers>`
- Apply sync changes: `oat sync --scope project`
- Inspect the sync config contract: `oat config describe sync.defaultStrategy` or `oat config describe sync.providers.<name>.enabled`

## Related references

- [`commands.md`](commands.md)
- [`manifest-and-drift.md`](manifest-and-drift.md)
- [`../../reference/oat-directory-structure.md`](../../reference/oat-directory-structure.md)
