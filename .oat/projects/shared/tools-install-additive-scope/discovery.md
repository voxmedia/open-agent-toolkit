---
oat_status: complete
oat_ready_for: oat-project-quick-start
oat_blockers: []
oat_last_updated: 2026-06-16
oat_generated: false
---

# Discovery: tools-install-additive-scope

## Phase Guardrails (Discovery)

Discovery is for requirements and decisions, not implementation details.

- Prefer outcomes and constraints over concrete deliverables.
- Implementation details captured here are root-cause pointers for the
  plan phase, not a committed deliverable list.

## Initial Request

Running the interactive `oat tools install` (bare command) walks through all
tool packs and lets you set user or project scope for each pack. Bug: setting a
pack to project scope **uninstalls** it from user scope (and vice versa). The
expectation is that installing a pack at a scope should be **additive** — it
must not remove the pack from a scope where it is already installed. Removing a
pack from a scope should only happen as a deliberate, confirmed action.

## Solution Space

### Approach 1: Additive scope management with an interactive reconcile manager _(Recommended)_

**Description:** Treat every install as additive. Redesign the interactive
`oat tools install` scope step into a reconcile-to-end-state manager that shows
each pack's current placement (pre-selected), where checking a scope adds and
unchecking a currently-installed scope stages a removal, gated by a batch
confirmation. Non-interactive paths are strictly additive (never remove).

**When this is the right choice:** The bug is a destructive side effect of
treating scope as mutually exclusive (move semantics). Making install additive
and isolating removal to an explicit, visible action directly resolves it.

**Tradeoffs:** Removal is no longer possible non-interactively (acceptable; a
future `oat tools uninstall` can add that path if a real need appears).

### Approach 2: Confirmation prompt on the existing move semantics

**Description:** Keep move semantics but prompt before stripping another scope.

**When this is the right choice:** Minimal change if move-by-default were
desired.

**Tradeoffs:** Still treats scope as exclusive by default; confirmation fatigue;
doesn't match the "installing is additive" mental model. Rejected.

### Chosen Direction

**Approach:** Approach 1 — Additive scope management with an interactive
reconcile manager.
**Rationale:** Installing should never destroy an existing install. Removal
becomes a deliberate, visible action (explicit uncheck + batch confirm) rather
than a silent side effect of choosing a scope.
**User validated:** Yes — explicit buy-in on additive-by-default, interactive
reconcile manager, batch-confirm removals, and strictly-additive non-interactive
parity.

## Key Decisions

1. **Additive by default:** Installing a pack at a scope never removes it from
   any other scope. A pack at `user` + install at `project` becomes `both`.
2. **Removal is interactive-only and explicit:** The only way an install path
   removes a pack from a scope is the user explicitly unchecking a
   currently-installed scope in the interactive flow.
3. **Interactive flow = reconcile-to-end-state manager:** Replace the binary
   _"which packs should install at user scope? (unselected go to project
   scope)"_ prompt with per-pack scope state, current placement pre-selected.
   Check = add; uncheck-currently-installed = stage removal.
4. **Batch confirm removals:** Collect staged adds/removes and show one change
   summary (`+ adds`, `- removes`) gated on a single `Apply? (y/n)` before
   applying. Breezing through with no changes = zero removals.
5. **Non-interactive parity (strictly additive):** Non-interactive install,
   including `--scope project` / `--scope user` and the default pack set, never
   removes a scope. This also fixes the `--scope project` override path that
   currently strips user.
6. **No `--move`/`--exclusive` flag for now:** Keep it simple; add later only if
   a real need surfaces.

## Root-Cause Pointers (for plan phase)

- `packages/cli/src/commands/init/tools/index.ts`
  - `runInitTools` reconciliation loop (~lines 757-780): drives
    `removePackFromScope` off `desiredScope` vs `currentLocation` (move
    semantics). The `desiredScope === 'project'` fall-through strips user
    (~line 777); the `desiredScope === 'user'` branch strips project (~line 770).
    Must be driven by explicit removal intent, not scope choice.
  - `resolvePackScopes` (~lines 456-544): the interactive binary user-scope
    prompt (~line 525) and the explicit `--scope project|user` overrides
    (~lines 483-495) force a single scope for all eligible packs. Non-interactive
    resolution (~lines 506-519) already preserves existing placement.
- Pack install state model: `location` is `not-installed | project | user |
both` (`packages/cli/src/commands/init/tools/install-state.ts`); a `both`
  end-state already exists and should be the additive result.
- Auto-sync after install (`packages/cli/src/commands/tools/install/index.ts`,
  `packages/cli/src/engine/compute-plan.ts`): verify the sync/removal plan does
  not prune the preserved scope once file-level removals stop happening.

## Success Criteria

- Interactive `oat tools install`: setting a pack to project when it is already
  at user results in `both` (user retained), not a move.
- Interactive flow shows current per-pack placement and only removes a scope
  when the user explicitly unchecks it, gated by a batch confirmation.
- Non-interactive install (incl. `--scope project`/`--scope user`) never removes
  a pack from an existing scope.
- Running interactive install and changing nothing produces zero removals.
- Tests cover: additive project install over user install → both; explicit
  uncheck + confirm → removal; non-interactive `--scope` additive.

## Out of Scope

- A dedicated `oat tools uninstall` command (possible future follow-up for
  non-interactive removal).
- A `--move`/`--exclusive` flag.

## Open Questions

- **Sync pruning:** Confirm `computeSyncPlan` removal logic won't prune a
  preserved scope's entries once the file-level move-removals are gone (validate
  during implementation; may need a scope-aware manifest/filter fix).
- **UI primitive:** Whether existing prompt primitives support per-pack
  two-toggle (user/project) state cleanly, or whether the reconcile manager is
  expressed as pre-checked multiselects + a change-summary step.

## Next Steps

- **Quick mode → straight to plan:** proceed to `oat-project-quick-start` to
  produce `plan.md`. Scope is clear; the one architectural unknown (sync
  pruning + prompt primitive) is captured as an Open Question to resolve in
  planning/implementation.
