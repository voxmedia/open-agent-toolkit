---
oat_status: in_progress
oat_ready_for: null
oat_blockers: []
oat_last_updated: 2026-07-28
oat_generated: false
---

# Discovery: surface-implementer-dispatches

## Phase Guardrails (Discovery)

Discovery is for requirements and decisions, not implementation details.

- Prefer outcomes and constraints over concrete deliverables (no specific scripts, file paths, or function names).
- If an implementation detail comes up, capture it as an **Open Question** for design (or a constraint), not as a deliverable list.

## Initial Request

Implement `BL-260727-surface-implementer-dispatches`: make skipped candidate
selection visible and auditable for managed-capped implementation and fix
dispatches. Include the agreed small companion disclosure that a configured
terminal Frontier reviewer may require model access and retention-policy
eligibility; do not create a separate backlog item.

## Solution Space

The chosen direction is additive enforcement and provenance rather than
automatic classification. The CLI can mechanically detect a skipped
exact-candidate selection, but it cannot judge whether the root classified the
phase correctly. The project will therefore warn and emit structured evidence
for the deterministic violation while preserving the root as the task-class
decider.

## Options Considered

- **Hard block versus warning:** use a coded warning for the current
  compatibility boundary, preserving `status: resolved` and exit code `0`.
  A later fail-closed transition can be considered after callers migrate.
- **Reuse `--preferred` versus separate classification inputs:** keep
  classification separate from candidate selection and the ceiling. Legacy
  `--preferred` remains a selection control and is not overloaded as provenance.
- **Single adoption disclosure versus resolved-target disclosure:** surface the
  recommendation during adoption/choice and surface the actual resolved target
  at runtime. Existing explicit cells may survive recommendation adoption, so a
  version stamp alone is not authoritative.

## Key Decisions

1. **Enforcement scope:** detect skipped selection for every managed named-cap
   implementer/fix route, not Cursor alone. Exclude reviewers, inherit,
   uncapped, unresolved, and policy-only preflight.
2. **Diagnostic behavior:** emit a stable coded diagnostic in JSON and a
   human-facing warning. Do not rely on logger-only warnings because JSON mode
   suppresses them.
3. **Classification provenance:** accept provider-neutral task class and
   provider-specific preferred effort as separate nullable inputs, then carry
   them into Dispatch Report output beside the selected candidate and ceiling.
4. **Judgment boundary:** require a recorded classification but do not claim
   that the CLI can validate whether the classification was correct.
5. **Fable disclosure:** keep the configured ladder unchanged. Disclose the
   terminal reviewer target and require users to confirm access and applicable
   retention-policy eligibility. Match the resolved target at runtime rather
   than inferring from recommendation version.

## Constraints

- Preserve existing resolver status and exit semantics for this release.
- Preserve policy-only preflight, reviewer, uncapped, inherit, and legacy
  compatibility behavior without false skipped-selection warnings.
- Keep classification distinct from policy ceiling, requested candidate, and
  selected candidate.
- Keep the compatibility `Dispatch:` stamp grammar unchanged.
- Make report-schema evolution additive and backward compatible, or explicitly
  version it if the V1 contract does not permit new nullable fields.
- Cursor candidate strings remain opaque.
- Canonical skills receive one PR-scoped version bump; provider-linked views
  remain sync-managed.
- Shipped CLI/assets/docs changes require the five public packages to move in
  lockstep and pass release validation.

## Success Criteria

- A real managed-capped implementation/fix resolution with no exact candidate
  emits a coded skipped-selection diagnostic in human and JSON output.
- Exact candidates at or below the cap remain successful and report
  `selectionMode=candidate`.
- Recorded task class/preferred effort survives into Dispatch Report output
  alongside the selected target.
- Policy preflight and non-applicable routes do not emit the warning.
- Tests cover skipped, deliberate-at-cap, below-cap, above-cap, preflight, and
  report serialization behavior.
- Adoption/choice output explains the configured Frontier reviewer target, and
  runtime preflight/reviewer resolution discloses the actual Fable target when
  present.
- Documentation explains the distinction between model access and applicable
  retention-policy eligibility without asserting that the CLI can determine
  organizational policy.
- Relevant CLI, docs, skill, build, and release validation commands pass.

## Out of Scope

- Automatically judging whether a task class is correct.
- Automatically checking organizational retention policy.
- Reordering or replacing the Frontier ladder.
- Turning the warning into a hard error in this release.
- Work tracked by `BL-260726-validate-cursor-pin-effort` or
  `BL-260708-verify-cursor-gpt-5-6-subagent`.

## Deferred Ideas

- Fail closed on skipped managed-capped candidate selection after a compatibility
  migration period.
- Analyze repeated at-cap classifications as an operational cost signal.

## Open Questions

- **Report schema:** does Dispatch Report V1 permit additive nullable
  classification/diagnostic fields, or should this introduce V2?
- **Disclosure representation:** should resolver disclosures reuse a generic
  diagnostic shape or use a separate advisory/disclosure collection?

## Assumptions

- The existing exact-candidate branch remains the required runtime path for
  managed-capped implementation and fix dispatches.
- `selectionMode=capped` is mechanically invalid only when full runtime report
  context identifies an actual managed-capped implementation/fix dispatch.
- Availability probing cannot establish organizational retention eligibility.

## Risks

- **False-positive diagnostics:** legacy preferred paths and policy-only
  preflight can also resolve without an exact candidate.
  - **Likelihood:** Medium
  - **Impact:** Medium
  - **Mitigation Ideas:** gate the warning on managed named-cap policy, runtime
    implementation/fix context, and exact selection state.
- **Schema drift:** report producers outside dispatch-ceiling may omit or
  misorder new fields.
  - **Likelihood:** Medium
  - **Impact:** Medium
  - **Mitigation Ideas:** centralize types/builders and add ordered
    serialization, formatter, gate, and integration tests.
- **Stale disclosure:** recommendation version may not match preserved explicit
  ladder cells.
  - **Likelihood:** Medium
  - **Impact:** Medium
  - **Mitigation Ideas:** derive runtime disclosure from the effective resolved
    target.

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
