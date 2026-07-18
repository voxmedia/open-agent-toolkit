---
oat_status: complete
oat_ready_for: plan
oat_blockers: []
oat_last_updated: 2026-07-18
oat_generated: false
---

# Lightweight Design: Cursor Native Skills

## Summary

Model Cursor skills as native-read canonical assets while retaining
`.cursor/skills` as an explicit provider-local migration and extension surface.
Separate synchronization targets from adoption sources so OAT can stop
generating Cursor skill mirrors without losing the ability to discover and
adopt existing Cursor skills.

The upgrade is data-preserving: clean manifest-managed legacy views are removed,
modified or replaced legacy views are detached from management and surfaced for
an explicit decision, and unmanaged Cursor skills remain untouched until the
user chooses their disposition.

## Architecture

### 1. Distinguish sync mappings from adoption sources

Extend provider mapping metadata so a native-read mapping can declare one or
more provider-local adoption directories independently of its canonical loading
directory.

For Cursor skills:

- Canonical directory: `.agents/skills`
- Provider directory in the native-read mapping: `.agents/skills`
- Native-read: `true`
- Provider-local adoption directory: `.cursor/skills`
- No generated provider skill directory

Cursor agent and rule mappings remain unchanged.

Sync planning continues to consume only non-native mappings. Stray discovery
consumes adoption sources, which include:

- the provider directory for ordinary mirrored mappings; and
- explicit provider-local adoption directories for native-read mappings.

This avoids overloading `providerDir` with two meanings and keeps native-read
providers that have no legacy surface unchanged.

### 2. Retire legacy managed views safely

When Cursor's skill mapping becomes native-read, existing Cursor skill manifest
entries are no longer represented by a sync mapping and become retirement
candidates.

Retirement classifies each manifest-owned provider path:

1. **Clean symlink or clean managed copy:** remove the redundant provider path
   and manifest entry.
2. **Missing path:** remove only the stale manifest entry.
3. **Modified, replaced, or otherwise unverified path:** preserve the provider
   path, remove its obsolete manifest ownership, and surface it through the
   Cursor adoption flow.

The third case requires an explicit unmanage/detach operation rather than the
current unconditional removal behavior. This prevents an adapter mapping change
from deleting user-authored content that replaced an old generated view.

Dry-run output must distinguish removal from preservation-and-detachment.

### 3. Require an individual disposition for each Cursor skill

Interactive `oat init` and `oat status` process each unresolved Cursor skill
with a single-select prompt:

1. **Adopt into `.agents/skills`**
2. **Keep Cursor-only in `.cursor/skills`**

There is no implicit meaning for an unchecked item and no bulk checklist for
Cursor skills. Aborting stops the remaining migration without recording a
choice for unanswered skills.

Other provider strays retain the existing bulk adoption checklist.

#### Adopt

- Move the skill package into the canonical directory.
- Do not recreate a Cursor symlink or manifest entry.
- If identical canonical content already exists, remove the redundant
  provider-local copy.
- If different canonical content already exists, retain the existing explicit
  conflict prompt before replacement.

#### Keep Cursor-only

- Leave the skill package unchanged.
- Append its exact normalized provider path to the applicable sync config's
  `knownStrays`.
- Save after each selection so an interruption does not lose completed choices.

If a same-name canonical skill already exists, keeping a Cursor-local duplicate
is blocked because Cursor discovers both roots and does not document a safe
precedence rule. The prompt explains that one skill must be renamed before the
Cursor-only choice can be recorded.

Non-interactive and JSON modes report unresolved Cursor skills and remediation
without choosing or mutating a disposition.

### 4. Make user sync config ownership consistent

Canonical paths:

- Project sync config: `<repo>/.oat/sync/config.json`
- User sync config: `~/.oat/sync/config.json`
- Project sync manifest: `<repo>/.oat/sync/manifest.json`
- User sync manifest: `~/.oat/sync/manifest.json`

Remove `knownStrays` from the user-level general config model. Add an idempotent
legacy migration:

1. Read `knownStrays` from `~/.oat/config.json`, if present.
2. Read `~/.oat/sync/config.json` using the normal sync schema.
3. Normalize and union both exact-path arrays.
4. Atomically write the canonical user sync config first.
5. Remove only the legacy `knownStrays` key from the general user config,
   preserving all unrelated and unknown keys.

Union semantics avoid data loss and make precedence irrelevant. If the process
stops between writes, the next run repeats safely because normalization
deduplicates entries.

The migration runs before user-scope stray filtering in interactive and
read-only reporting paths. Commands that already load user sync config should
share the same resolver so ownership does not diverge again.

### 5. Persist known-stray choices by scope

- A project `.cursor/skills/<name>` choice writes to the project's
  `.oat/sync/config.json`.
- A user `~/.cursor/skills/<name>` choice writes to
  `~/.oat/sync/config.json`.

Preserve the current additive suppression model for project scans: project
known-stray paths and user known-stray paths are unioned. User-scope scans use
the user sync config. This keeps personal cross-repository suppression behavior
while ensuring a project keep-local decision is shared through project config.

## Component Changes

### Provider metadata and mapping utilities

- Mark Cursor project and user skill mappings native-read.
- Add explicit adoption-source metadata.
- Add a mapping utility for adoption scans, separate from sync mappings.
- Preserve existing agent and rule mappings.

### Drift and execution engine

- Detect unmanaged entries from provider-local adoption directories.
- Do not skip a provider-local candidate solely because a canonical skill has
  the same name; compare or defer to conflict handling.
- Add safe detach semantics for obsolete managed mappings.
- Keep destructive removal limited to provider paths verified as clean managed
  output.
- Use adoption-source metadata, rather than sync mappings, anywhere commands
  inspect provider-local skill collisions or removal hazards.

### Adoption service

- For native-read mappings, adoption moves to canonical without recreating a
  provider view or manifest row.
- Add keep-local persistence as a reusable operation.
- Keep normalization and exact matching centralized in sync-config helpers.

### Init and status commands

- Partition Cursor skill candidates from ordinary provider strays.
- Prompt once per Cursor skill with explicit adopt/keep actions.
- Save each completed action immediately.
- Preserve existing conflict confirmation behavior for adoption.
- Report unresolved actions in non-interactive and JSON output.

### Configuration

- Move user `knownStrays` ownership to the user sync config.
- Add an idempotent legacy migration helper.
- Remove the field from the normalized general user-config interface after the
  compatibility path is established.
- Update config discovery/help to show both project and user sync locations.

### Documentation and release metadata

- Update provider mappings, sync config, drift/adoption, configuration, and file
  location documentation.
- Describe `.cursor/skills` as provider-local rather than generated output.
- Document the per-skill migration and legacy user-config move.
- Bump the five lockstep public package versions because this changes shipped
  CLI behavior and bundled docs.

## Verification Strategy

### Unit tests

- Cursor mappings are native-read at project and user scope while agents/rules
  remain mirrored/rendered.
- Adoption-source resolution includes `.cursor/skills` but sync mappings do not.
- Native-read adoption does not create a symlink or manifest entry.
- Keep-local writes a normalized exact path to the correct scope config.
- Legacy user known strays union into user sync config and are removed from the
  old file without losing unrelated keys.
- Re-running a partial or completed config migration is idempotent.
- Same-name canonical conflicts cannot silently create duplicate Cursor skills.

### Command tests

- Mixed Cursor skills can be individually split between adopt and keep-local.
- Aborting after some decisions preserves completed decisions and leaves the
  remainder pending.
- Project and user prompts write to different sync configs.
- JSON and non-interactive runs report but do not mutate.
- Existing non-Cursor stray adoption keeps its checklist behavior.

### Engine and integration tests

- A clean legacy Cursor symlink is removed on upgrade.
- A clean legacy copy is removed on upgrade.
- A missing legacy view drops only its manifest entry.
- A replaced or modified legacy view is preserved, detached, and later offered
  for migration.
- Mixed legacy managed and unmanaged contents under `.cursor/skills` are handled
  without data loss.
- Subsequent sync does not recreate adopted Cursor skill views.

### Required validation

- Focused CLI tests for provider, config, drift, engine, init, and status.
- `pnpm lint`
- `pnpm format`
- `pnpm type-check`
- `pnpm test`
- `pnpm build`
- `pnpm release:validate`

## Confirmed Review Decisions

1. Per-skill migration remains available through both interactive `oat init`
   and `oat status`, matching current adoption behavior.
2. Keep-local is blocked on a same-name canonical collision until one skill is
   renamed; OAT will not rely on Cursor's undocumented duplicate-resolution
   behavior.
