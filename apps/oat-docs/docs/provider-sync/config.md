---
title: 'Sync Config (`.oat/sync/config.json`)'
description: 'Configuration schema and behavior for provider sync in .oat/sync/config.json.'
---

# Sync Config (`.oat/sync/config.json`)

This document defines the project and user sync config used by provider-interop commands.

## Location

- Project scope: `.oat/sync/config.json`
- User scope: `~/.oat/sync/config.json`

## Purpose

`config.json` controls provider enablement and sync strategy behavior.

Discovery note:

- `oat config describe` includes both sync config scopes in its catalog so you can inspect sync/provider keys from the main config help surface.
- Mutation ownership still lives with provider-sync commands such as `oat providers set`, not `oat config set`.

It is read by:

- `oat init` (provider selection and defaults)
- `oat status` (known-stray suppression in drift reports and remediation)
- `oat sync` (active provider resolution and mismatch handling)
- `oat providers set` (explicit provider enable/disable updates)

## Schema (current)

```json
{
  "version": 1,
  "defaultStrategy": "auto",
  "knownStrays": [".cursor/skills/cloud-environment-setup"],
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
| `knownStrays`               | no                                    | Exact provider paths to suppress from stray reporting      |
| `providers`                 | no (persisted), normalized at runtime | Provider-specific overrides keyed by adapter name          |
| `providers.<name>.enabled`  | no                                    | Explicit provider activation (`true` / `false`)            |
| `providers.<name>.strategy` | no                                    | Per-provider strategy override (`auto`, `symlink`, `copy`) |

### Known strays

Use `knownStrays` for provider-local files that should remain unmanaged by OAT.
Entries are exact provider-path matches after path normalization; they are not
globs and do not suppress sibling paths.

Project-level config in `.oat/sync/config.json` applies to everyone using the
repository. A Keep Cursor-only choice for a project skill writes here:

```json
{
  "version": 1,
  "defaultStrategy": "auto",
  "knownStrays": [".cursor/skills/cloud-environment-setup"]
}
```

User-level config in `~/.oat/sync/config.json` owns personal provider-local
files and user-scope Keep Cursor-only choices:

```json
{
  "version": 1,
  "defaultStrategy": "auto",
  "knownStrays": [".cursor/skills/cloud-environment-setup"]
}
```

The common Cursor-only skill case is a good fit: the skill may intentionally
exist in `.cursor/skills/cloud-environment-setup` while remaining outside the
canonical `.agents/skills` inventory.

Earlier releases stored user `knownStrays` in `~/.oat/config.json`. Before OAT
resolves user sync config or writes any general user-config change, it
normalizes and unions those entries into `~/.oat/sync/config.json`, writes the
sync config first, then removes only the legacy key. Repeating the migration is
safe, including after interruption.

## Behavior notes

- If `providers.<name>.enabled` is:
  - `true`: provider is active even if provider directory detection is false.
  - `false`: provider is inactive even if directory is detected.
  - unset: provider falls back to directory detection.
- `defaultStrategy` is used when no provider-specific `strategy` is set.
- `auto` prefers a safe exact collection-directory alias when the canonical
  collection and provider mapping are eligible. The current runtime can adopt
  an existing exact alias; an absent destination falls back to per-entry sync
  because guarded alias creation is unavailable. OAT does not automatically
  unlink collection aliases. For an explicit-strategy transition, verify and
  remove the alias manually, then rerun sync so the new plan can independently
  prove the destination absent. A real provider directory falls back to
  per-entry sync; broken, foreign, nested, unsafe, or unverifiable collection
  identity fails closed without replacement.
- Explicit `symlink` and `copy` always remain per-entry strategies. Strategy is
  configured here (globally or per provider); `oat sync` intentionally has no
  `--strategy` flag.
- At runtime, config is normalized so `providers` is always present in memory.
- Project scans combine project and user known-stray paths. User scans use the
  user sync config.
- Codex project sync also manages generated materialized roles derived from
  canonical agents and explicit model+effort targets. Dispatch-aware roles such
  as `oat-phase-implementer-gpt-5-6-terra-xhigh` and
  `oat-reviewer-gpt-5-6-terra-xhigh` are managed outputs and should not be
  adopted as stray roles.

## Recommended management flow

- Initial setup (interactive): `oat init --scope project`
- Explicit updates: `oat providers set --scope project --enabled <providers> --disabled <providers>`
- Apply sync changes: `oat sync --scope project`
- Inspect the sync config contract: `oat config describe sync.defaultStrategy`, `oat config describe sync.knownStrays`, or `oat config describe sync.providers.<name>.enabled`

## Related references

- [`commands.md`](commands.md)
- [`manifest-and-drift.md`](manifest-and-drift.md)
- [`../reference/oat-directory-structure.md`](../reference/oat-directory-structure.md)
