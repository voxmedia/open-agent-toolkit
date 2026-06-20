---
oat_generated: true
oat_generated_at: 2026-06-20
oat_project: tools-install-additive-scope
oat_workflow_mode: quick
---

# Summary: tools-install-additive-scope

## Overview

Fixes a destructive bug in `oat tools install`: installing a tool pack at one
scope removed it from the other scope. Choosing `project` for a pack already
installed at `user` (via the interactive flow or the `--scope project` override)
silently deleted the user-level install, and vice versa. Installation is now
**additive** — choosing a scope never removes a pack from another scope — and
removal is an explicit, confirmed, interactive-only action.

## What Was Implemented

- **Additive scope model.** `resolvePackScopes` now produces a per-pack desired
  _end-state_ (`project | user | both`) defaulting to current placement. A pure
  reconciliation helper diffs current vs desired into `adds`/`removes`.
- **Interactive reconcile manager.** The binary "which packs at user scope"
  prompt was replaced by a per-pack end-state selector (`project / user / both`)
  defaulting to the pack's current placement; leaving the default makes no
  changes.
- **Batch-confirmed removals.** Removals happen only when a user explicitly
  picks a narrower end-state, are shown in a single change summary, and are
  applied only after one `Apply? (y/n)` confirmation. Declining mutates nothing.
- **Strictly-additive non-interactive paths.** `--scope project|user` and the
  default pack set union with current placement and can never remove a scope
  (guarded with a fail-loud assertion).
- **No-prune auto-sync.** `affectedScopes` records only scopes that actually
  changed, so a preserved scope is never re-synced or pruned (manifests are
  per-scope).
- **Release closeout.** Lockstep patch bump (0.1.27 → 0.1.28) across the five
  public packages + regenerated bundled `public-package-versions.json`;
  `pnpm release:validate` passes.

## Key Decisions

- Installing is additive by default; removal is interactive-only behind a batch
  confirmation (no `--move`/`--exclusive` flag for now; future `oat tools
uninstall` owns non-interactive removal). Recorded as ADR-021.
- Accepted design deviation: installs copy the full desired end-state
  idempotently (not adds-only), with `affectedScopes` restricted to the diff —
  preserves the idempotent-refresh contract while keeping the no-prune
  guarantee. Code is source of truth.

## Verification

- `pnpm test` (workspace, 10/10 turbo tasks; CLI 1837 tests), `pnpm lint`,
  `pnpm type-check`, `pnpm build`, `pnpm release:validate` — all pass.
- Final/p01 code review (oat-reviewer, opus): pass; one Important test-quality
  finding fixed in the bounded loop, one Minor deferred with rationale.

## Workflow

Quick mode. Brainstorm → discovery (seeded) → lightweight collaborative design →
plan (5 tasks, artifact review passed) → implementation (Tier 1 subagents, opus
ceiling) → final review passed → docs sync (tool-packs.md + ADR-021).

## Follow-ups

- Consider `oat tools uninstall` for non-interactive scope removal if needed.
- Minor (deferred): when an outdated skill is refreshed in a preserved
  (non-added) scope, add that scope to `affectedScopes` so it auto-syncs.
