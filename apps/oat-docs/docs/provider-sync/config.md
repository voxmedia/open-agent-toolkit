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
- Enablement mutation lives with `oat providers set`, not `oat config set`.
  Strategy fields are edited directly in sync config; the provider command does
  not set them.

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
  unlink collection aliases. Configuring an explicit per-entry strategy does
  not release an owned collection. Deferred collection-directory copies and
  symlinks fail closed with manual recovery guidance on the current runtime.
  To make the provider directory externally owned, disable the provider with
  `oat providers set --scope <scope> --disabled <provider>`, run
  `oat sync --scope <scope>` to detach OAT ownership, and then verify and remove
  the preserved alias before managing the directory manually. Automatic
  transition requires an identity-bound,
  non-following publication primitive. Deferred file operations and ordinary
  non-transition per-entry symlinks retain their existing behavior. A real
  provider directory falls back to per-entry sync; broken, foreign, nested,
  unsafe, or unverifiable collection identity fails closed without replacement.
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

## Choosing providers and strategy

### Which providers to enable

Enabling a provider tells OAT to maintain that agent tool's provider views (the
per-tool files it generates from your `.agents/` canonical assets). Set it with
`oat providers set --enabled <list> --disabled <list>`.

| `enabled`       | Choose it when                     | What you give up                                                                  |
| --------------- | ---------------------------------- | --------------------------------------------------------------------------------- |
| `true`          | Someone on the team uses that tool | Generated files appear in your diffs, even in checkouts without the tool's folder |
| `false`         | Nobody uses that tool              | OAT stops creating, updating, or removing its files; existing views stay on disk  |
| Unset (default) | You have not chosen yet            | Predictability: the provider is active only if its folder already exists          |

Interactive `oat init` writes an explicit choice for each provider. While a
disabled provider's folder still exists, a non-interactive `oat sync` warns
about it on every run, and an interactive `oat sync --scope project` offers to
re-enable it with that option already ticked. Untick it, or delete the folder.

- If your team uses only Claude Code, enable `claude` and disable the others.
- If your team mixes Claude Code, Cursor, and Codex, enable those three and
  disable `copilot` and `gemini`, so fresh checkouts and worktrees get the same
  views without depending on which folders happen to exist.
- If you stop using a tool, disable it, then delete its old views yourself.

### Links or copies

The strategy decides whether provider views are links to the canonical files or
copies of them. No command sets it: edit `defaultStrategy` or
`providers.<name>.strategy` in this file by hand, and keep `"version": 1` and
`"defaultStrategy"`, or sync and status stop with a validation error. The
"default strategy" that `oat providers inspect` prints for an adapter is not
used by sync; this file's setting always wins.

| Strategy         | Choose it when                       | What you give up                                                                                          |
| ---------------- | ------------------------------------ | --------------------------------------------------------------------------------------------------------- |
| `auto` (default) | Almost always                        | Once `auto` has adopted a whole-folder link, switching strategy needs the manual recovery described above |
| `symlink`        | You want one link per skill or agent | It refuses to sync through an existing whole-folder link                                                  |
| `copy`           | Links really cannot work for you     | Canonical edits reach the tools only after you run `oat sync` again                                       |

Rules are always copied, whatever the strategy. If the operating system refuses
to create a link, `auto` and `symlink` quietly copy that entry instead, so check
the views sync actually produced. With `copy`, `oat status` can still report a
stale copy as in sync, because it compares the copy with what OAT last wrote.

> [!WARNING]
> The `copy` strategy stamps the absolute path of the checkout that ran sync
> into each copied skill. Committed copies therefore show as drifted in every
> other checkout (teammates, worktrees, CI), and each `oat sync` there rewrites
> them, so expect constant churn in Git if you commit copied views.

- If you are unsure, keep `auto`.
- If you want one link per entry, choose `symlink`, but remove any whole-folder
  link first.
- If links truly cannot work, choose `copy`, rerun `oat sync` after every
  canonical edit, and expect the churn described above.
