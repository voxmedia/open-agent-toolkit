---
id: BL-260724-support-provider-directory
title: Support provider directory symlinks as full collection sync
status: open
priority: high
scope: feature
scope_estimate: M
labels:
  - cli
  - sync
  - manifest
  - safety
assignee: null
created: 2026-07-24T16:10:37.662Z
updated: 2026-08-28T23:46:00.000Z
associated_issues: []
external_plans: []
---

## Description

Support provider collection directory symlinks as the preferred low-churn sync
mode when a provider collection can safely inherit the canonical OAT collection
(for example, `.claude/skills -> .agents/skills`). Reconcile manifest state for
all inherited entries without creating child symlinks or allowing update,
removal, or provider-disable operations to mutate canonical content through the
directory alias. When the provider collection has unmanaged divergence or the
alias cannot be proven safe, retain or fall back to ordinary per-entry sync.

## Status Note (2026-09-03)

Left **open** by operator decision after the tool-pack-scope-provider-truthfulness
project. Part of this item shipped; its headline criterion did not.

**What shipped.** Adoption and detachment of an exact collection alias, with
manifest tracking for inherited entries, reconciliation on add/remove, detach
without deletion, fail-closed handling of unsafe links, and documentation. Unlink
is structurally impossible: `fs/io.ts` returns `false` rather than removing.

**What did not.** Criterion 1 — `auto` preferring a collection symlink when the
provider collection is absent — is not in the shipped product. An absent
destination always falls back to per-entry sync. `collectionAliasCreationAvailable`
defaults to `false` and no production caller sets it, and the creation primitive
throws `E_COLLECTION_LINK_UNSAFE` unconditionally, because the Node runtime
exposes no securely guarded parent-relative symlink primitive. Switching an
adopted alias to an explicit `symlink` or `copy` strategy is also inert. Net
behavior is adopt-only and detach-only: never create, never unlink, never
transition.

**Coverage is narrower than the criteria imply.** Collection aliases are gated to
`contentType === 'skill'`, and `getSyncMappings` drops `nativeRead` mappings, so
in practice this applies to Claude skills only.

**A caution for whoever picks this up.** The happy-path tests pass only because
the test wrapper forces `collectionAliasCreationAvailable` to `true` and
substitutes an unguarded test-local creation function. The one end-to-end test
that exercises the real `oat sync` command is named "falls Claude skills back
per-entry" and asserts no collection is created. Do not read the green suite as
evidence the capability exists.

**What would close it.** An identity-bound parent-relative creation primitive
(`symlinkat`-class), wiring the availability flag to a production caller, a
lifecycle test starting from adoption rather than injected creation, and a guard
test asserting no production caller enables the flag until that primitive exists.
This is the same missing `openat`/`renameat`/`linkat` class of primitive that
constrains the `AGENTS.md` work in `BL-260903-close-manual-only-agents-md`.

The reduction was documented, not silent: see `design.md:504-517` in that project.

## Acceptance Criteria

- `auto` prefers a collection directory symlink for supported provider/content
  mappings when the provider collection is absent or otherwise has no unmanaged
  divergence, while an explicit per-entry strategy remains available.
- An existing provider collection symlink is treated as a full inherited sync
  only when its resolved target exactly matches the corresponding canonical OAT
  collection root; relative links are supported.
- Before creating or adopting an alias, OAT detects non-empty unmanaged provider
  content, conflicting paths, broken links, external targets, and other stray
  divergence. It preserves those entries and uses per-entry synchronization
  rather than replacing or hiding them behind the alias.
- Sync planning and execution update manifest state for every canonical entry
  visible through the collection alias without creating, replacing, or removing
  child paths through that alias.
- Canonical additions and removals reconcile inherited manifest entries
  deterministically, and disabling or changing a provider detaches ownership
  without deleting canonical content.
- Broken, external, mismatched, nested, or race-swapped directory symlinks fail
  closed with actionable diagnostics; divergence never causes OAT to follow an
  unsafe alias or silently delete provider or canonical content. Ordinary
  per-entry managed symlinks retain their existing behavior.
- Focused and integration tests cover initial adoption, repeated no-op sync,
  canonical entry addition/removal, provider disablement, incorrect targets,
  unmanaged strays/divergence, automatic preference, explicit per-entry
  fallback, and apply-time ancestry changes.
- User-facing tool-pack/provider-sync documentation explains collection-alias
  behavior, the low-churn preference, divergence/fallback behavior, and
  recovery for rejected directory symlinks.
