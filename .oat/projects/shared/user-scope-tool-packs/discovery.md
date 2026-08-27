---
oat_status: complete
oat_ready_for: oat-project-design
oat_blockers: []
oat_last_updated: 2026-08-27
oat_generated: false
---

# Discovery: user-scope-tool-packs

## Phase Guardrails (Discovery)

Discovery is for requirements and decisions, not implementation details.

- Prefer outcomes and constraints over concrete deliverables (no specific scripts, file paths, or function names).
- If an implementation detail comes up, capture it as an **Open Question** for design (or a constraint), not as a deliverable list.

## Initial Request

Park the native plugin effort for now and make OAT work completely at user
scope through its regular installation path, including the project-management
tool pack. The user depends on OAT's agents in Codex and would otherwise need
the regular installation regardless of plugin availability. The user-scope
direction should also make installation and updates easier while reducing
repeated managed tool files, version-bump commits, and update pull requests in
consumer repositories.

Preserve repository ownership of project-specific PJM data and policy. The
parked plugin discovery and partial specification remain available for a future
restart rather than being folded into this project.

## Clarifying Questions

### Question 1: Discovery Breadth

**Q:** Should discovery cover the exact capability inventory, the PJM
ownership boundary, and migration/update behavior together, or focus on one
area first?
**A:** Cover all three.
**Decision:** Treat complete pack eligibility, repository ownership, and safe
scope migration as one product boundary during discovery.

### Question 2: Supported Installation Scopes

**Q:** Should project-scoped installation remain supported after every pack
becomes user-eligible?
**A:** No explicit correction was provided; continue with the compatibility
boundary established by the approved backlog direction.
**Decision:** Preserve both scopes. User scope becomes fully supported and is
recommended for personal reuse, while project scope remains available for
repository-owned reproducibility.

### Question 3: Fresh-Install Default and Migration

**Q:** Should fresh pack installations default to user scope, and what should
happen to existing placements?
**A:** Default fresh installations to user scope while preserving existing
placements unless the user explicitly migrates them.
**Decision:** User scope is the new default, not a forced migration. Existing
project-scoped or dual-scope installations remain unchanged until the user
chooses and confirms a scope transition.

### Question 4: PJM Adoption Safety

**Q:** What should happen when a user-scoped PJM skill is invoked in a
repository that has not initialized PJM?
**A:** Stop and explain how to initialize PJM explicitly.
**Decision:** Global capability availability never authorizes repository
initialization or writes. Uninitialized use fails safely and actionably without
side effects.

### Question 5: PJM Template Ownership

**Q:** How should user-installed PJM templates participate when a repository is
initialized?
**A:** Treat them as managed defaults.
**Decision:** User-installed PJM templates provide reusable managed defaults.
Repository-owned overrides remain authoritative, and bundled CLI templates are
the final fallback.

### Question 6: Evolving Pack Membership

**Q:** Should OAT preserve its current model where installing a tool pack opts
the user into the pack's complete, evolving contents, including members added
in future releases?
**A:** Yes. Preserve that model rather than introducing a separate partial-pack
product mode.
**Decision:** An installed pack represents its complete current managed
surface. Pack updates reconcile every required skill, agent, template, script,
and other managed asset at the installed scope, including newly added members.
Installing or removing an individual tool does not create a persistent pack
exclusion.

### Question 7: Scope Migration Safety

**Q:** When moving an existing pack from project scope to user scope, what
guarantee should OAT provide?
**A:** Use a verified guided move.
**Decision:** Scope migration previews the change, establishes and verifies the
destination copy first, and removes the source copy only after explicit
confirmation. The migration must preserve a rollback path.

### Question 8: Project Cohesion

**Q:** Should all-pack user eligibility, lifecycle consistency, PJM ownership,
and migration safety remain one project or be split into separate projects?
**A:** Proceed as one cohesive project.
**Decision:** Keep the work together because every outcome depends on the same
user-scope pack contract. The subsystems differ, but they do not represent
independently shippable product boundaries.

## Current State Findings

- OAT defines eight tool packs. Project-management is the only pack explicitly
  restricted to project scope today.
- The reusable project-management capability consists of four skills and seven
  default templates. Its backlog, roadmap, decisions, policy, initialized
  structure, and customized templates are repository-owned.
- User-scoped agents and companion assets can already be installed by some
  packs, but normal lifecycle scanning and cleanup do not manage all of them
  consistently.
- Current installed-pack state can be satisfied by finding any declared member;
  it does not establish that the pack's complete managed surface is present.
- Some ostensibly user-scoped lifecycle operations still require a Git project
  and can update repository configuration or guidance.
- Pack membership, eligibility, defaults, companion assets, updates, removals,
  and bundled inputs are governed by several partially overlapping authorities.

## Solution Space

### Approach 1: Unified User-Scope Pack Contract _(Recommended)_

**Description:** Treat user scope as a complete lifecycle for every OAT pack,
covering the pack's skills, agents, supporting assets, discovery, updates,
removal, synchronization, and diagnostics. Keep project scope as a supported
alternative. Separate globally available PJM capability from explicit
repository adoption and repository-owned data.

**When this is the right choice:** The goal is a durable product model that
actually eliminates repeated installs and managed repository churn rather than
merely permitting one additional copy location.

**Tradeoffs:** This exposes existing cross-pack lifecycle inconsistencies and
therefore has a larger scope than changing PJM eligibility alone.

### Approach 2: PJM Eligibility Unlock

**Description:** Permit only the project-management pack to install at user
scope while retaining the current per-pack lifecycle behavior and existing
repository coupling elsewhere.

**When this is the right choice:** A narrowly bounded improvement is more
important than consistent all-pack behavior.

**Tradeoffs:** It leaves user agents, companion assets, completeness checks,
and user-only operations inconsistent, so it does not satisfy the stated goal
that OAT work completely at user scope.

### Approach 3: User-Only Convergence

**Description:** Make reusable OAT packs user-owned by default and progressively
remove project-scoped installation as a supported model.

**When this is the right choice:** Personal reuse and centralized updates are
more important than repository-level reproducibility or team-owned tool
contracts.

**Tradeoffs:** It creates a disruptive migration and weakens the ability of a
repository to declare and reproduce its agent-tooling environment.

### Chosen Direction

**Approach:** Unified User-Scope Pack Contract
**Rationale:** It is the only approach that addresses installation/update
friction and repository churn while preserving project-scope compatibility and
PJM's repository authority.
**User validated:** Yes — approved 2026-08-21.

## Key Decisions

1. **Delivery Direction:** Use the regular OAT CLI/direct-install lifecycle;
   native plugin packaging remains parked and separate.
2. **Pack Coverage:** Every OAT pack, including project-management, is in scope
   for complete user-level operation.
3. **Scope Compatibility:** Preserve project-scoped installation while making
   user scope a fully supported, recommended placement.
4. **PJM Ownership:** Reusable PJM capability may be user-owned; PJM working
   state, policy, decisions, backlog, roadmap, and repository customizations
   remain repository-owned.
5. **Lifecycle Meaning:** A pack is not meaningfully installed merely because
   one member exists; lifecycle behavior must account for its complete managed
   capability surface.
6. **Default and Migration:** Fresh installations default to user scope, while
   existing placements change only through explicit, non-destructive migration.
7. **PJM Adoption:** User-level PJM availability does not initialize a
   repository. Use in an uninitialized repository stops with actionable
   guidance before any write.
8. **Template Ownership:** User-installed PJM templates are managed defaults;
   repository overrides take precedence, and bundled CLI templates remain the
   fallback.
9. **Pack Membership:** Installing a pack opts into its complete, evolving
   managed surface. Future pack updates add new required members and restore
   missing members rather than preserving pack-level exclusions.
10. **Scope Migration:** Moving a pack between scopes is a verified guided
    operation: preview, establish and verify the destination, explicitly
    confirm source removal, and retain a rollback path.
11. **Project Cohesion:** Keep all-pack eligibility, lifecycle consistency, PJM
    ownership, and migration safety in one project under a shared user-scope
    pack contract.

## Constraints

- Existing direct-install and project-scoped users require a safe compatibility
  and migration path.
- User-only lifecycle operations must not require or mutate an unrelated Git
  repository.
- User-scope availability must not imply that a repository has initialized or
  enabled PJM.
- User-installed template defaults must never overwrite repository-owned
  template customizations.
- Pack membership is release-defined and evolving; update behavior must not
  depend on a stale member list recorded at installation time.
- A scope migration must never remove the source before the destination is
  verified or without explicit confirmation.
- Repository-owned data and customized policy must never be removed as a side
  effect of pack migration or removal.
- Canonical provider synchronization and OAT CLI authority remain intact.
- The parked plugin artifacts remain independent and must not expand this
  project's acceptance boundary.

## Success Criteria

- Every declared OAT pack can be installed, inspected, updated, synchronized,
  and removed at user scope without requiring repository-owned copies.
- User-scoped agents and supporting assets receive the same lifecycle ownership
  and diagnostics as user-scoped skills.
- Pack state distinguishes complete, partial, project-only, user-only, both,
  and unavailable conditions accurately enough for safe operations.
- A user-scoped PJM installation works in initialized repositories while
  remaining non-mutating and actionable in uninitialized repositories.
- PJM initialization can use managed user defaults while preserving repository
  overrides and falling back to the bundled CLI defaults.
- Pack updates reconcile the complete current managed surface at each installed
  scope, including members added after the original installation.
- Users can preview and complete a scope migration without losing capability,
  repository-owned state, or the ability to roll back.
- Existing project-scoped installations can remain in place or migrate
  explicitly without data loss, silent precedence changes, or removal of
  repository customizations.
- Provider synchronization and CLI diagnostics reflect the selected scope and
  surface stale or duplicate managed assets.
- Consumer repositories can use user-scoped packs without recurring commits
  that merely refresh OAT-managed capability copies.

## Out of Scope

- Resume or ship native provider plugins.
- Move PJM working data, policy, decisions, backlogs, or roadmaps into the user
  home directory.
- Automatically initialize PJM state merely because the user has installed its
  tool pack.
- Remove project-scoped installation or silently migrate existing users.
- Invent provider precedence or overwrite unowned/customized assets.
- Redesign PJM's domain workflows beyond what user-scope availability requires.

## Deferred Ideas

- **Native plugin distribution:** Preserve the parked discovery/specification
  for a future restart when Codex can deliver the required agent experience.
- **Project-scope deprecation:** Reconsider only with evidence that repository
  reproducibility no longer warrants a supported project placement.
- **New PJM agents or scripts:** Current PJM inventory has none; adding product
  capabilities is separate from making existing assets user-scoped.

## Open Questions

- **Resource Resolution:** How should a user-scoped skill reliably resolve its
  packaged static references without assuming a repository-local skill path?

## Assumptions

- Users value one reusable installation but some repositories still require a
  checked-in project tool contract.
- User scope is a capability ownership boundary, not a place for project data.
- The current provider adapters can support user-scoped skills and agents once
  the lifecycle manages both consistently.
- A repository can expose an explicit PJM adoption/initialization state that is
  independent of pack availability.

## Risks

- **Availability Triggers Repository Writes:** Existing workflows may treat a
  globally available PJM pack as proof that a repository adopted PJM.
  - **Likelihood:** High
  - **Impact:** High
  - **Mitigation Ideas:** Require a separate adoption signal and fail safely
    before unapproved repository writes.
- **Incomplete Lifecycle Ownership:** Agents, templates, scripts, or resources
  may be installed but invisible to update/removal/diagnostic flows.
  - **Likelihood:** High
  - **Impact:** High
  - **Mitigation Ideas:** Define pack completeness and companion-asset ownership
    as part of the shared scope contract.
- **Destructive Migration:** Scope changes could remove customized or
  repository-owned data while cleaning managed copies.
  - **Likelihood:** Medium
  - **Impact:** High
  - **Mitigation Ideas:** Distinguish managed capability assets from repository
    state; establish and verify the destination before explicitly confirmed
    source removal; preserve rollback.
- **Duplicate Provider Views:** Project and user copies may coexist with
  provider-specific precedence that users do not understand.
  - **Likelihood:** High
  - **Impact:** Medium
  - **Mitigation Ideas:** Diagnose both sources and avoid silent narrowing or
    precedence claims.

## Next Steps

Use this discovery artifact to drive the next workflow step:

- **Spec-driven mode:** continue to `oat-project-design` (which confirms
  requirements and produces both `spec.md` and `design.md`).
- **Spec-driven mode → formalize-only:** use `oat-project-spec` standalone
  if you want a formalized requirements artifact but aren't ready to
  design yet.
- **Quick mode → straight to plan:** proceed directly to `plan.md` when
  scope is clear and no architecture decisions remain.
- **Quick mode → optional lightweight design:** produce a focused
  `design.md` (architecture, components, data flow, testing) before
  planning. Choose this when discovery surfaced architecture choices
  or component boundaries.
- **Quick mode → promote:** escalate to spec-driven if discovery revealed
  the scope is larger or more complex than expected.
