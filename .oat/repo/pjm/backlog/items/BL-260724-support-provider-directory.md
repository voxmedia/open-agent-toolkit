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
updated: 2026-10-31T21:08:00Z
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

**Delivery status (2026-10-31):** Landed: adopt-only and detach-only collection
aliases with inherited-entry manifest tracking, reconciliation, fail-closed
unsafe-link handling and documentation (tool-pack-scope-provider-truthfulness,
#255). Remaining: alias creation and strategy transitions.
`collectionAliasCreationAvailable` still defaults to `false`
(`packages/cli/src/engine/compute-plan.ts:628`), and the creation path waits
on a `symlinkat`-class primitive that Node does not expose. The criteria below
cover only that remaining scope; the original adoption, reconciliation,
fail-closed and documentation criteria are met.

## Acceptance Criteria

- `auto` prefers a collection directory symlink for supported provider/content
  mappings when the provider collection is absent or otherwise has no unmanaged
  divergence, while an explicit per-entry strategy remains available
  (switching an adopted alias to an explicit `symlink` or `copy` strategy takes
  effect instead of being inert).
- Before creating an alias, OAT detects non-empty unmanaged provider content,
  conflicting paths, broken links, external targets, and other stray
  divergence. It preserves those entries and uses per-entry synchronization
  rather than replacing or hiding them behind the alias.
- Creation uses an identity-bound parent-relative primitive
  (`symlinkat`-class), and a production caller enables
  `collectionAliasCreationAvailable` only once that primitive exists; a guard
  test asserts no production caller enables the flag before then.
- A lifecycle test starts from adoption rather than injected creation, and
  focused tests cover automatic preference and explicit per-entry fallback
  through the real `oat sync` command.
