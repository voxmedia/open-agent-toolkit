---
oat_status: complete
oat_ready_for: oat-project-quick-start
oat_blockers: []
oat_last_updated: 2026-07-10
oat_generated: false
---

# Discovery: post-implementation-sequencing

## Phase Guardrails (Discovery)

Discovery is for requirements and decisions, not implementation details.

- Prefer outcomes and constraints over concrete deliverables (no specific scripts, file paths, or function names).
- If an implementation detail comes up, capture it as an **Open Question** for design (or a constraint), not as a deliverable list.

## Initial Request

Create the quick-mode `post-implementation-sequencing` project scoped to
`BL-260709-split-post-implementation`. Extend
`workflow.postImplementSequence` with an ordered structured form containing
`preApproval` and `postApproval` arrays while preserving all existing string
values. Pre-approval work must run after the final implementation review passes
and before final HiLL approval; post-approval work must run only after that
approval.

## Clarifying Questions

No additional product clarification was required: the backlog item provides the
target shape, legacy mappings, sequencing boundaries, and acceptance criteria.
Repository reconnaissance did surface restart-safety and configuration-surface
decisions that should be resolved in lightweight design before task planning.

## Solution Space

The chosen direction is the structured two-boundary sequence from the backlog.
Keeping one legacy-only sequence or adding separate preference keys would not
meet the requested ordered pre/post approval model and would complicate
compatibility.

### Chosen Direction

**Approach:** Treat the setting as a compatibility union: legacy string values
normalize to the new ordered structure, and structured values pass through
strict validation.

**Rationale:** This provides one canonical runtime shape without breaking
existing repositories or changing the meaning of the four shipped strings.

**User validated:** Yes — the requested scope and linked backlog explicitly
select this shape.

## Options Considered

- **Legacy strings only:** Rejected because it cannot express steps on both
  sides of approval.
- **Separate pre/post workflow keys:** Rejected because it fragments one
  lifecycle preference and weakens compatibility with the existing key.
- **Structured union with normalization:** Chosen because it preserves the
  public key and gives execution one canonical ordered representation.

## Key Decisions

1. **Project boundary:** Scope all work to
   `BL-260709-split-post-implementation` and its acceptance criteria.
2. **Configuration shape:** Accept the four existing strings and a structured
   object with `preApproval` and `postApproval` arrays.
3. **Canonical step vocabulary:** Structured arrays are ordered sequences of
   `summary`, `document`, and `pr`; unknown or malformed values must fail
   validation clearly rather than disappear silently.
4. **Legacy normalization:** Map `wait` to no steps, `summary` to pre-approval
   summary, `pr` to pre-approval summary then PR, and `docs-pr` to pre-approval
   summary then document then PR. Legacy strings have no post-approval steps.
5. **Lifecycle boundary:** Run pre-approval steps only after the final review
   passes and before a configured final-phase HiLL prompt. Run post-approval
   steps only after explicit final approval is durably recorded.
6. **Failure behavior:** Stop on the first failed sequence step, preserve a
   clear resumable next action, and never infer or record human approval from a
   step result.

## Constraints

- Non-final HiLL checkpoint behavior must remain unchanged.
- Existing three-layer workflow preference resolution and all four public string
  values must remain compatible.
- Configuration retrieval must preserve the structured value as one setting;
  nested arrays cannot be lost through generic object flattening or string
  coercion.
- A changed canonical skill requires one frontmatter version bump in the PR.
- CLI, bundled skill, or docs changes are shipped functionality, so all five
  public packages must receive the lockstep version bump and release validation.

## Success Criteria

- Both legacy strings and valid structured sequences load, resolve, describe,
  and round-trip without ambiguity; invalid steps and malformed arrays are
  rejected or ignored according to one documented validation contract.
- Runtime consumers receive a canonical two-array sequence with the required
  legacy mappings.
- Final review always completes before any pre-approval step or final approval
  prompt.
- Pre-approval steps finish before final HiLL approval is requested; post-
  approval steps cannot run until that approval has been recorded.
- A failure at either boundary stops the chain with a precise recovery action
  and restart-safe state.
- Non-final checkpoints behave exactly as before.
- Configuration reference, lifecycle/HiLL documentation, CLI description, and
  focused tests cover both forms and the ordering/failure boundaries.
- Repository verification and `pnpm release:validate` pass.

## Out of Scope

- New arbitrary-command sequence steps or a plugin system for post-
  implementation actions.
- Changes to non-final checkpoint prompts, review scopes, or approval semantics.
- Redesign of unrelated workflow preferences such as PR-on-complete or archive
  behavior.
- Changing repository documentation requirements or the behavior of the
  individual summary, document, and PR skills beyond what sequencing needs.

## Deferred Ideas

None identified within this backlog item.

## Open Questions

- **Approval record:** Choose a durable marker for final plan-phase approval and
  sequence progress so a resumed run cannot execute post-approval work early or
  repeat completed steps unnecessarily.
- **No final checkpoint:** Define whether `postApproval` runs immediately after
  pre-approval work when the user configured no final-phase HiLL gate, or is
  treated as inapplicable.
- **Configuration authoring:** Decide whether structured values are supported by
  JSON configuration files only or also by `oat config set` with a JSON value;
  `oat config get` must expose an unambiguous machine-readable representation in
  either case.
- **Sequence validation:** Define duplicate-step handling and the exact recovery
  contract for a partially completed ordered sequence.

## Assumptions

- Sequence arrays preserve configured order.
- The existing repository-level `docs-pr` preference intentionally normalizes
  to pre-approval summary, documentation, and PR preparation.
- Final approval is meaningful only when the final plan phase is a configured
  HiLL checkpoint; design will make the no-gate fallback explicit.

## Risks

- **Restart ambiguity:** Today plan-phase checkpoint approval has no dedicated
  persisted completion field. Without one, a resumed run could misclassify the
  approval boundary.
  - **Likelihood:** High
  - **Impact:** High
  - **Mitigation Ideas:** Persist explicit final approval and sequence progress
    before dispatching post-approval work.
- **Resolver data loss:** Generic config flattening currently treats nested
  objects as separate leaves, and scalar display can coerce objects to an
  unusable string.
  - **Likelihood:** High
  - **Impact:** High
  - **Mitigation Ideas:** Define the sequence as an atomic resolved value and
    test structured get/resolve behavior end to end.
- **Duplicate side effects:** Retrying a partially completed sequence could
  regenerate summaries/docs or attempt PR work twice.
  - **Likelihood:** Medium
  - **Impact:** Medium
  - **Mitigation Ideas:** Record step progress or make resume checks explicit
    for each lifecycle action.

## Next Steps

Produce a focused quick-mode design to settle the configuration normalization,
durable approval/progress marker, no-final-gate behavior, and failure/resume
contract before generating the implementation plan.
