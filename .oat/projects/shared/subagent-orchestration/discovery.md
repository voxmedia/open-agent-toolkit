---
oat_status: complete
oat_ready_for: null
oat_blockers: []
oat_last_updated: 2026-07-22
oat_generated: false
---

# Discovery: subagent-orchestration

## Phase Guardrails (Discovery)

Discovery is for requirements and decisions, not implementation details.

- Prefer outcomes and constraints over concrete deliverables (no specific scripts, file paths, or function names).
- If an implementation detail comes up, capture it as an **Open Question** for design (or a constraint), not as a deliverable list.

## Initial Request

Create a quick-mode project for the proposed subagent-orchestration guidance
split. Import the prior project dossier from the operator's laptop, read its
handoff, and review the proposal collaboratively before planning.

## Clarifying Questions

### Question 1: Dispatch skill naming

**Q:** Should this project preserve `oat-dispatch-subagents`, rename it now, or
defer the naming migration?
**A:** Keep `oat-dispatch-subagents` for this project and evaluate a rename
separately.
**Decision:** Implement only the guidance-versus-mechanics ownership split.
Treat any dispatch-skill rename as a separate migration with its own consumer
and compatibility review.

### Question 2: Claude routing ladder

**Q:** Should the generic guidance adopt the imported Fable-first ladder,
retain the current Opus-first policy, or defer the matrix pending more evidence?
**A:** Keep Opus first and reserve Fable for exceptional work.
**Decision:** Revise the imported Claude provider draft so Opus remains the
default Claude route for hard-reasoning and consequential work. Keep Fable as
the exceptional escalation route rather than the default.

### Question 3: Guidance skill invocation

**Q:** Should the generic guidance skill be user-invocable, agent-discoverable
only, or an internal dependency?
**A:** Make it user-invocable and agent-discoverable.
**Decision:** Preserve the imported skill's public, self-contained invocation
posture. Keep the OAT dispatch machinery internal and non-invocable.

### Question 4: Direction validation

**Q:** Does the synthesized project direction accurately capture the intended
scope and decisions?
**A:** Yes; lock in the direction.
**Decision:** Discovery has explicit user buy-in and can advance to the
design-depth decision.

### Question 5: Design depth and interaction

**Q:** Should quick start proceed directly to planning, produce a lightweight
design, or promote to the spec-driven workflow?
**A:** Produce a lightweight design, then switch from the persisted
collaborative preference to draft-and-review for this project.
**Decision:** Create one focused design covering architecture, component
boundaries, additive evidence fields, failure behavior, and testing. Present
the complete draft for holistic user review.

## Solution Space

### Approach 1: Split guidance from mechanics without renaming _(Recommended)_

**Description:** Introduce a generic, portable guidance skill as the canonical
home for task classes, model-selection principles, dated provider mappings,
and evidence-refresh policy. Keep the existing OAT dispatch skill name and
reduce it to launch mechanics, catalog intersection, recovery, and records.
**When this is the right choice:** When the priority is a reviewable ownership
split with low migration risk.
**Tradeoffs:** The dispatch skill retains OAT branding even though most of its
contract is provider-neutral.

### Approach 2: Split and rename the dispatch skill in one change

**Description:** Perform the ownership split and rename the dispatch machinery
to a generic name at the same time.
**When this is the right choice:** When naming consistency is important enough
to justify updating every consumer, adapter, test, and distribution surface in
one coordinated migration.
**Tradeoffs:** A larger compatibility surface makes review harder and couples
an architectural split to a broad naming migration.

### Approach 3: Land the guidance skill before migrating dispatch ownership

**Description:** Add and distribute the guidance skill first, then move
selection ownership out of dispatch in a follow-up.
**When this is the right choice:** When downstream availability must be proven
before the dispatch contract can fail closed on a missing guidance dependency.
**Tradeoffs:** The intermediate state temporarily duplicates canonical policy
and needs a tightly controlled follow-up.

### Chosen Direction

**Approach:** Approach 1 — split guidance from mechanics without renaming.
**Rationale:** This realizes the handoff's central progressive-disclosure
decision without coupling it to a broad naming migration.
**User validated:** Yes.

## Options Considered

The imported dossier also proposes a dated Claude effort ladder that prefers
Fable for general hard-reasoning and consequential non-cyber work while
retaining Opus as an economy route and cyber-sensitive operational default.
The project will not adopt that mapping. It will retain the current Opus-first
policy and reserve Fable for exceptional work.

## Key Decisions

1. **Canonical ownership:** Volatile model-selection guidance should have one
   canonical skill and be consumed through progressive disclosure.
2. **Separation of concerns:** Generic guidance owns task classification,
   provider mappings, and refresh evidence; OAT dispatch owns launch mechanics
   and dispatch records.
3. **Imported material:** The complete prior dossier is retained as review
   input, not treated as implementation-ready source.
4. **Naming:** Keep `oat-dispatch-subagents` in this project and evaluate a
   generic rename separately.
5. **Claude routing:** Keep Opus as the hard-reasoning and consequential
   default; reserve Fable for exceptional escalation.
6. **Invocation posture:** Expose the generic guidance skill to both users and
   agents while keeping dispatch mechanics internal.
7. **Design depth:** Use a lightweight draft-and-review design before planning.

## Constraints

- Preserve existing launch, liveness, acceptance, and no-automatic-replacement
  safeguards while moving selection content.
- Keep provider-specific selection references separate and subordinate to live
  catalogs and current instructions.
- Co-install the guidance and dispatch skills so required loading is reliable.
- Any canonical skill changed in the eventual implementation needs its
  frontmatter version advanced once for the final PR diff.
- Bundled skill changes are shipped CLI functionality and therefore require the
  repository's lockstep public-package version update and release validation.
- Quick-mode design keeps `oat_ready_for: null`; the completed plan owns
  implementation readiness.

## Success Criteria

- Agents and humans can read one generic skill for durable model-selection
  policy without requiring OAT.
- OAT dispatch retains complete mechanics, evidence, recovery, and
  fail-closed behavior without duplicating provider selection policy.
- Tests enforce the selection-versus-mechanics ownership boundary and
  co-installation contract.
- Provider views and bundled distributions remain synchronized and validated.

## Out of Scope

- Changes to the operator's already-updated laptop-level harness files.
- Changes to downstream private-repository synchronization machinery.
- Automatic adoption of imported drafts without comparison to current OAT
  contracts and repository conventions.

## Deferred Ideas

- User-scope installation of the generic guidance skill may be considered
  later; this project first needs to establish the canonical OAT source and
  utility-pack behavior.

## Open Questions

No unresolved product questions remain from the imported handoff.

## Assumptions

- The imported dossier reflects the operator's intended starting point as of
  2026-07-22.
- The target repository's current contracts take precedence where the imported
  draft diverges.
- Progressive disclosure is preferred over retaining duplicated model matrices
  in global harness files and dispatch mechanics.

## Risks

- **Safeguard regression:** Moving provider content could accidentally remove
  launch or recovery constraints.
  - **Likelihood:** Medium
  - **Impact:** High
  - **Mitigation Ideas:** Compare mechanics references against current main and
    add boundary-focused validation.
- **Dependency drift:** Guidance and dispatch distributions could separate or
  become version-skewed.
  - **Likelihood:** Medium
  - **Impact:** High
  - **Mitigation Ideas:** Enforce co-installation and synced-provider checks.
- **Stale model policy:** Dated matrices can outlive their evidence.
  - **Likelihood:** High over time
  - **Impact:** Medium
  - **Mitigation Ideas:** Preserve verification metadata, review dates, and
    explicit candidate qualification rules.

## Next Steps

Review the lightweight design draft, incorporate any requested changes, then
generate the quick implementation plan.
