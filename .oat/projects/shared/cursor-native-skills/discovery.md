---
oat_status: complete
oat_ready_for: design
oat_blockers: []
oat_last_updated: 2026-07-18
oat_generated: false
---

# Discovery: cursor-native-skills

## Phase Guardrails (Discovery)

Discovery is for requirements and decisions, not implementation details.

- Prefer outcomes and constraints over concrete deliverables (no specific scripts, file paths, or function names).
- If an implementation detail comes up, capture it as an **Open Question** for design (or a constraint), not as a deliverable list.

## Initial Request

Cursor now discovers skills directly from `.agents/skills` at project and user
scope. Stop maintaining redundant generated skill views under `.cursor/skills`
while preserving `.cursor/skills` as an intentional home for Cursor-only skills
and as a migration source for users who have existing Cursor skills.

## Clarifying Questions

### Question 1: Existing Cursor skills

**Q:** Should unmanaged Cursor skills simply be treated as permanently local?
**A:** No. Users may be migrating from Cursor-specific skills and must still be
able to adopt them into the canonical inventory.
**Decision:** Preserve adoption as a first-class migration action.

### Question 2: Migration selection

**Q:** Can adoption be selected in bulk, with unselected skills implicitly kept
local?
**A:** No. Each Cursor skill needs an explicit, individual disposition.
**Decision:** Every discovered Cursor skill must offer an explicit choice between
canonical adoption and remaining Cursor-only.

### Question 3: Remembering Cursor-only choices

**Q:** How should OAT avoid asking about the same intentionally local skill on
every run?
**A:** Record the skill as a known stray when the user chooses to keep it
Cursor-only.
**Decision:** Persist each keep-local choice immediately as an exact known-stray
path.

### Question 4: User sync configuration

**Q:** Should user-level known strays remain in `~/.oat/config.json` while the
user sync manifest lives under `~/.oat/sync/`?
**A:** No. That split is unnecessarily inconsistent.
**Decision:** Make the user sync config the canonical owner and migrate the
legacy setting.

## Chosen Direction

Treat canonical Cursor skills as native-read assets. Retain the provider-local
directory as a supported Cursor-only extension and migration surface. During
interactive migration, require one explicit decision for every discovered
Cursor skill. Canonical adoption removes the redundant provider-local instance;
keeping it local records an exact known-stray path in the applicable sync
config.

## Key Decisions

1. **Canonical loading:** Cursor skills use `.agents/skills` directly at both
   project and user scope.
2. **Provider-local support:** `.cursor/skills` remains supported for genuinely
   Cursor-only skills.
3. **Explicit migration:** Each Cursor skill receives its own adopt-or-keep
   decision; an unchecked bulk list is not sufficient.
4. **Durable choice:** Keep-local records an exact known-stray path so the prompt
   is one-time.
5. **Configuration ownership:** User sync settings, including known strays,
   belong under `~/.oat/sync/`, with compatibility migration from the legacy
   user config.

## Constraints

- Existing manifest-managed Cursor skill views must be retired safely without
  deleting unrelated Cursor-only skills.
- Cursor agents and rules retain their current provider-specific synchronization
  behavior.
- Project and user scopes must use equivalent migration behavior and write to
  their respective sync configuration.
- Non-interactive operation must not make adoption or keep-local decisions on a
  user's behalf.
- Existing canonical-name conflicts must remain explicit and non-destructive.

## Success Criteria

- Sync no longer creates project- or user-level Cursor skill mirrors.
- A sync upgrade removes obsolete manifest-managed Cursor skill views and their
  manifest entries while preserving unmanaged entries.
- Each unmanaged Cursor skill is individually selectable as canonical or
  Cursor-only.
- Adopting a Cursor skill leaves one canonical skill and no redundant generated
  Cursor view.
- Keeping a Cursor skill local preserves it and prevents repeat prompts.
- Legacy user known-stray settings migrate without losing unrelated user
  configuration.
- Tests cover both scopes, mixed per-skill decisions, conflicts, interrupted
  migration safety, and non-interactive behavior.

## Out of Scope

- Changing Cursor agent synchronization.
- Changing Cursor rule rendering or synchronization.
- Changing other providers' skill loading behavior.
- Automatically converting Cursor-specific skill content to a portable format
  beyond relocating the skill package.

## Open Questions

- **Legacy config precedence:** Define deterministic behavior if both legacy and
  canonical user sync configs contain known-stray entries.
- **Migration entry points:** Confirm which interactive commands perform the
  per-skill migration and which only report pending action.
- **Native-read adoption seam:** Preserve scanning of `.cursor/skills` even
  though that directory is no longer a synchronization target.

## Assumptions

- Cursor's documented loading of `.agents/skills` applies equally to project and
  user scopes.
- Known-stray paths remain exact normalized paths rather than globs.
- Cursor-only skills are intentional provider-local assets, even though the
  existing drift vocabulary calls them strays.

## Risks

- **Accidental provider-local deletion:** Obsolete managed links and intentional
  Cursor-only skills share the same directory.
  - **Likelihood:** Medium
  - **Impact:** High
  - **Mitigation Ideas:** Delete only manifest-owned legacy views and cover
    mixed-directory upgrades in tests.
- **Lost migration visibility:** Native-read mappings are excluded from current
  sync and stray scanning.
  - **Likelihood:** High
  - **Impact:** Medium
  - **Mitigation Ideas:** Separate synchronization targets from provider-local
    adoption sources.
- **Partial config migration:** Moving a setting between two files cannot be one
  filesystem-atomic operation.
  - **Likelihood:** Low
  - **Impact:** Medium
  - **Mitigation Ideas:** Write the merged canonical config first, make retries
    idempotent, then remove the legacy key.

## Next Steps

Produce a lightweight draft design that resolves the configuration migration,
native-read adoption seam, command behavior, and verification strategy before
planning.
