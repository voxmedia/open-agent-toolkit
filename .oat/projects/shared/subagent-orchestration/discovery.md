---
oat_status: in_progress
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

Discussion is in progress. The first decision is whether to preserve the
existing dispatch-skill name or combine the guidance split with a rename.

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

**Approach:** Pending discussion.
**Rationale:** Approach 1 is the current recommendation because it realizes the
handoff's central progressive-disclosure decision without adding rename risk.
**User validated:** No.

## Options Considered

The imported dossier also proposes a dated Claude effort ladder that prefers
Fable for general hard-reasoning and consequential non-cyber work while
retaining Opus as an economy route and cyber-sensitive operational default.
That mapping remains review-required rather than settled.

## Key Decisions

1. **Canonical ownership:** Volatile model-selection guidance should have one
   canonical skill and be consumed through progressive disclosure.
2. **Separation of concerns:** Generic guidance owns task classification,
   provider mappings, and refresh evidence; OAT dispatch owns launch mechanics
   and dispatch records.
3. **Imported material:** The complete prior dossier is retained as review
   input, not treated as implementation-ready source.

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

- **Naming:** Keep `oat-dispatch-subagents`, rename it in this project, or defer
  the rename to a separate migration?
- **Claude ladder:** Is Fable the preferred hard-reasoning and consequential
  default, with Opus reserved for economy and cyber-sensitive workflows?
- **Invocation posture:** Should the generic guidance skill remain directly
  user-invocable, or primarily act as a discoverable dependency?
- **Compatibility:** Does any external OAT consumer require a transition alias
  if the dispatch skill is renamed?

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

Resolve the open product decisions one at a time, validate the chosen split,
then choose whether a lightweight design is warranted before planning.
