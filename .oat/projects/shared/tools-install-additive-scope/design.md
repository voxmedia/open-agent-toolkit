---
oat_status: complete
oat_ready_for: null
oat_blockers: []
oat_last_updated: 2026-06-19
oat_generated: false
oat_template: false
---

# Design: tools-install-additive-scope

## Overview

Today the interactive `oat tools install` flow treats pack scope as mutually
exclusive: choosing `project` for a pack already installed at `user` triggers
`removePackFromScope(pack, userRoot)`, silently destroying the user-level
install (and the symmetric case for `user`). The fix reframes installation as
**additive** — placement is a desired end-state, and the only way a scope is
removed is an explicit, batch-confirmed action in the interactive flow.

The change is contained to the scope-resolution and reconciliation logic in
`packages/cli/src/commands/init/tools/index.ts`. `resolvePackScopes` is reworked
to produce a per-pack desired **end-state** (defaulting to current placement),
collected interactively via a per-pack single-select (`project / user / both`).
A new reconciliation step diffs current vs desired placement into `adds` and
`removes`; removes are surfaced as one batch summary gated on a single
`Apply? (y/n)` before anything is deleted. Non-interactive paths are strictly
additive — they union the requested scope with current placement and can never
remove.

No manifest/sync changes are required. Manifests are per-scope
(`join(scopeRoot, '.oat/sync/manifest.json')`) and auto-sync only runs for the
scopes recorded in `affectedScopes`. Once additive installs stop calling
`removePackFromScope` on the preserved scope, that scope is never added to
`affectedScopes`, so it is never re-synced or pruned. A verification test pins
this behavior.

## Architecture

### System Context

- **Entry points:** `oat tools install` (alias of `oat init tools`) →
  `createToolsInstallCommand` → `createInitToolsCommand` → `runInitTools`
  (`commands/init/tools/index.ts`). Auto-sync runs in the command `postAction`
  hook (`commands/tools/install/index.ts`).
- **Scope model:** pack `location` is `not-installed | project | user | both`
  (`commands/init/tools/install-state.ts`). The `both` end-state already exists
  and is the additive result.
- **Prompt primitives:** `selectWithAbort` (single-select) and
  `selectManyWithAbort` (multiselect with pre-checked `checked` flags), provided
  via `InitToolsDependencies`.
- **Removal primitive:** `removePackFromScope(pack, root, deps)` deletes a
  pack's skills/agents under a scope root. Unchanged; called only from the
  confirmed-removal path after this change.

### Key Decision: per-pack end-state select

The interactive scope step becomes the single source of truth for end-state
placement of user-eligible packs. For each user-eligible pack in play, present a
`selectWithAbort` with options `project / user / both`, **defaulting to the
pack's current placement** (or its default scope when not yet installed).

- Picking the current placement → no-op.
- Picking a superset (current `user` → choose `both`) → additive add.
- Picking a subset (current `both` → choose `project`) → staged removal of the
  dropped scope.

This shape was chosen over two pre-checked multiselects (less explicit about
per-pack intent) and a single additive user-scope multiselect (can't express
project-side removal). It mirrors the existing `resolveBothScopeTarget` pattern.

Full uninstall (removing from all scopes) is **out of scope** — a future
`oat tools uninstall` owns that.

### Data Flow

1. Scan current placement → `PackInstallStateMap` (unchanged).
2. Select packs to act on (first prompt, unchanged). Packs not selected are
   left untouched — no removal as a side effect of deselection.
3. `resolvePackScopes` → desired end-state per selected user-eligible pack
   (default = current placement).
4. Reconcile: per pack, `adds = desired − current`, `removes = current −
desired`.
5. If `removes` is non-empty and interactive → batch summary + single
   `Apply? (y/n)`. Decline → abort with zero changes.
6. Apply `adds` (install into added scopes) and confirmed `removes`
   (`removePackFromScope`). Record every changed scope in `affectedScopes`.
7. `postAction` auto-sync runs only for `affectedScopes`.

## Component Design

### `resolvePackScopes` (rework)

- **Purpose:** produce a per-pack desired end-state map (`user | project |
both`), defaulting to current placement.
- **Interactive:** for each selected user-eligible pack, `selectWithAbort` over
  `project / user / both`, default = current location (or `resolvePackDefaultScope`
  when `not-installed`).
- **Non-interactive `--scope project|user`:** additive **union** of the
  requested scope with current placement (e.g., current `user` + `--scope
project` → `both`). Never returns a placement narrower than current.
- **Non-interactive default set:** preserve current placement (existing
  behavior at lines ~506-519, retained).

### Reconciliation step (replaces current loop at ~lines 757-780)

- Compute `adds` and `removes` per pack by diffing current vs desired.
- Collect all `removes` across packs.
- Interactive + non-empty removes → render a single change summary
  (`+ pack@scope` / `- pack@scope`) and gate on one confirmation
  (`selectWithAbort` yes/no). Decline → return early, mutate nothing.
- Non-interactive → `removes` is empty by construction; assert/guard so a
  removal can never be applied non-interactively.
- Apply `adds` via the existing per-pack install functions targeting the added
  scope(s); apply confirmed `removes` via `removePackFromScope`.
- Add each scope that received an add or a confirmed remove to
  `affectedScopes`.

### `removePackFromScope`

Unchanged. Invoked only from the confirmed-removal branch.

### Auto-sync (`commands/tools/install/index.ts`)

Unchanged. Correctness depends on `affectedScopes` accurately reflecting only
changed scopes — which the reconciliation step now guarantees.

## Testing Strategy

Vitest, following the mocked-dependency style in
`commands/init/tools/index.test.ts`.

- **Additive add:** current `user`, choose `both` (and, separately, `--scope
project`) → project installed; `removePackFromScope` **not** called for user;
  `affectedScopes = {project}`.
- **Confirmed removal:** current `both`, choose `project`, confirm Apply →
  `removePackFromScope(project)` called; batch summary surfaced.
- **Declined removal:** current `both`, choose `project`, decline Apply → zero
  filesystem changes; `removePackFromScope` not called.
- **No-op:** accept all defaults → zero adds, zero removes.
- **Non-interactive guard:** `--scope project` with packs at `user` never calls
  `removePackFromScope`; result is `both`.
- **Sync scoping:** additive project install invokes `autoSync` with `{project}`
  only (user scope/manifest untouched) — pins the no-prune guarantee.

Verification: `pnpm --filter @open-agent-toolkit/cli test` (scoped to the tools
install/init test files where practical).
