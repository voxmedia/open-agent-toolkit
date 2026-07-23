---
oat_status: in_progress
oat_ready_for: null
oat_blockers: []
oat_last_updated: 2026-07-23
oat_generated: false
---

# Discovery: config-bug

## Phase Guardrails (Discovery)

Discovery is for requirements and decisions, not implementation details.

- Prefer outcomes and constraints over concrete deliverables (no specific scripts, file paths, or function names).
- If an implementation detail comes up, capture it as an **Open Question** for design (or a constraint), not as a deliverable list.

## Initial Request

Running `oat tools update` in a repository with no project-scoped OAT tool
packs writes `.oat/config.json#tools` flags as `true` for packs installed only
at user scope. Shared repository config should not present one developer's
user-level installation as project-level installed state.

## Clarifying Questions

### Question 1: Desired scope model

**Q:** Should the fix only make shared `tools.*` project-scoped, or should it
also preserve a separate effective-availability signal for workflows that can
use user-scoped packs?
**A:** Preserve both concepts separately.
**Decision:** Shared config will represent project installation while a runtime
query will represent effective project-plus-user availability.

## Solution Space

### Approach 1: Separate project installation from effective availability _(Recommended)_

**Description:** Reconcile shared `.oat/config.json#tools` from project-scoped
assets only. Add a runtime capability check that reports whether a pack is
available from project or user scope, and migrate pack-gated workflows to that
check.

**When this is the right choice:** User-scoped packs should remain usable in a
repository without being represented as repo-owned installations.

**Tradeoffs:** More code and migration work than changing the scan filter
alone, including updates to bundled skills and release versions.

### Approach 2: Make `tools.*` project-only without an effective signal

**Description:** Change install, update, and remove reconciliation so shared
config only reflects project-scoped assets.

**When this is the right choice:** Pack-gated workflows should intentionally
require repository installation even when the same pack exists at user scope.

**Tradeoffs:** Smallest implementation, but existing workflows that consult
`oat config get tools.<pack>` would stop recognizing user-scoped capabilities.

### Approach 3: Persist the combined signal in local config

**Description:** Keep the project-plus-user union but move it to
`.oat/config.local.json`.

**When this is the right choice:** Avoiding tracked configuration churn matters
more than maintaining a clean distinction between installation and
availability.

**Tradeoffs:** The value remains a stale cache of filesystem state and adds
`tools.*` semantics to another config surface.

### Chosen Direction

**Approach:** Separate project installation from effective availability.
**Rationale:** Approach 1 is recommended because shared state remains
repository-truthful while user-installed capabilities continue to work.
**User validated:** Yes.

## Options Considered

- Reuse the existing tool scanner for project-only reconciliation.
- Introduce a dedicated machine-readable capability query instead of inferring
  effective availability from shared config.
- Avoid persisting the project-plus-user union in repo-local config unless the
  runtime query proves impractical.

## Key Decisions

1. **Shared-config meaning:** `tools.*` must not claim user-only installations
   as repository-installed packs.
2. **Lifecycle coverage:** Installation, update, and removal must use the same
   scope semantics.
3. **No empty-repo pollution:** A user-only update should not create shared repo
   config solely to cache global pack availability.
4. **Effective capability:** Pack-gated workflows should query current
   project-plus-user availability rather than shared config.
5. **Empty project state:** When no project packs remain, omit the shared
   `tools` map. Preserve any unrelated shared config and do not remove the
   config file itself.

## Constraints

- Preserve unrelated shared configuration keys during reconciliation.
- Keep `oat tools list` scope reporting unchanged.
- Maintain machine-readable behavior for pack-gated workflows.
- Update canonical skill versions for every changed `.agents/skills/*/SKILL.md`.
- Apply lockstep version bumps to all five public packages and run
  `pnpm release:validate`.

## Success Criteria

- User-only tool packs do not become `true` in shared repo config.
- Project-installed packs remain accurately represented after install, update,
  and remove operations.
- Removing a project pack while it remains installed for the user clears the
  shared project flag.
- User-scoped packs remain discoverable through the chosen effective
  availability mechanism if Approach 1 is selected.
- Tests cover user-only, project-only, both-scope, and empty-repo cases.
- User-facing tool-pack and configuration documentation matches the new
  semantics.

## Out of Scope

- Changing provider-sync scope behavior.
- Redesigning the complete OAT configuration precedence model.
- Migrating unrelated workflow preferences or local state.

## Deferred Ideas

- A richer structured installed-pack inventory with per-scope version metadata;
  the current bug only requires truthful scope-aware capability state.

## Open Questions

None.

## Assumptions

- `.oat/config.json#tools` is intended to be repository-owned, team-shareable
  state.
- User-scope installation is already observable through canonical filesystem
  scanning and does not require a repo-level cache.

## Risks

- **Workflow capability regression:** Making shared flags project-only could
  hide valid user-scoped packs from workflows.
  - **Likelihood:** High for the narrow approach
  - **Impact:** Medium
  - **Mitigation Ideas:** Add and migrate to an effective capability query.
- **Config migration ambiguity:** Existing shared `true` values may have been
  produced from user scope.
  - **Likelihood:** Medium
  - **Impact:** Low
  - **Mitigation Ideas:** Reconciliation should deterministically rewrite flags
    from project scope on the next pack lifecycle operation.

## Next Steps

Confirm the capability semantics, then produce a lightweight design because the
change crosses shared configuration ownership, runtime capability resolution,
and bundled workflow consumers.
