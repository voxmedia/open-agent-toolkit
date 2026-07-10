---
oat_status: complete
oat_ready_for: oat-project-quick-start
oat_blockers: []
oat_last_updated: 2026-07-10
oat_generated: false
---

# Discovery: dispatch-schema-matrix-infrastructure

## Initial Request

Create one quick-mode implementation project for four related backlog items:

- `BL-260709-add-dispatch-machine-schema`
- `BL-260707-consolidate-dispatch-matrix`
- `BL-260707-cache-cursor-model-catalog`
- `BL-260708-verify-cursor-gpt-5-6-subagent`

The goal is to consolidate dispatch-matrix helpers, add a reusable dispatch
report schema and formatter, cache Cursor catalog validation per pass, and
close out Cursor GPT-5.6 slug verification with reproducible evidence.

## Shipped-Contract Refresh

The completed `gate-review-provenance-target-safety` project changed the
dispatch contract after this project's first discovery/design pass. It shipped:

- configuration-owned `{ candidates: [...] }` ladders and legacy-shape
  normalization;
- named project/phase ceilings that bound candidates rather than select an exact
  model preference;
- exact requested-candidate resolution with candidate tier, ceiling tier, cell
  source, and selected target;
- Codex materialization ownership and exact task-worker dispatch; and
- immutable gate invocation provenance separated from observed/self-reported
  producer identity.

It intentionally left all four backlog outcomes in this project open. The
original scalar/route-only design is therefore stale and must extend the
shipped contract rather than recreate it.

## Clarifying Questions

No additional user clarification is required. The refresh prompt explicitly
defines the compatibility algebra, provenance boundaries, cache lifetime, and
live-evidence standard.

## Solution Space

Use one canonical candidate-ladder matrix core beneath the existing resolver.
Normalize all supported legacy and modern input shapes into the shipped ladder
representation, then expose one provenance-rich walker to config adoption,
doctor, and project-state consumers. Build reporting and validation around the
resolver's existing exact-selection result instead of introducing another
selection model.

## Options Considered

### Option A: Patch each existing traversal for candidate ladders

**Description:** Add ladder handling independently to config, doctor, and
project-state parsing while keeping their private helpers.

**Tradeoffs:** This minimizes immediate movement but preserves the drift risk
that motivated the consolidation backlog and would add a third reporting
interpretation of matrix state.

**Chosen:** No

### Option B: Canonical ladder core with thin adapters

**Description:** Extract normalization and traversal into one shared module,
retain caller-specific warning/output policy in adapters, and derive report and
validation inputs from the canonical result.

**Tradeoffs:** Requires characterization tests and careful compatibility
exports, but produces one extensible contract for future candidate shapes.

**Chosen:** Yes

**Summary:** Option B is the only approach that handles the shipped ladder model
without preserving the known duplication.

## Key Decisions

1. **Policy and matrix roles:** Keep abstract policy names provider-neutral.
   Named tiers are maximum ceilings; concrete provider candidates remain in
   configuration-owned matrix ladders.
2. **Canonical input algebra:** Normalize legacy provider scalars, direct route
   targets, legacy ordered fallback routes, modern `{ candidates: [...] }`
   ladders, and sparse project-state overrides through one shared core.
3. **Traversal provenance:** One shared walker emits provider, value/target,
   candidate tier, candidate index, fallback-route index, path, and
   configuration source. Config and doctor consume it rather than maintaining
   private traversal.
4. **Provider opacity:** Keep Codex model-plus-effort pairs atomic and treat
   Cursor candidate strings as opaque. Never infer capabilities or translate
   values between provider vocabularies.
5. **Report semantics:** Keep policy, maximum ceiling, requested candidate,
   candidate tier, exact selected target, requested controls, configured
   defaults, gate invocation metadata, and runtime-observed identity as
   separate fields.
6. **Compatibility stamp:** Derive the existing parseable `Dispatch:` stamp
   from the report. It remains a compatibility surface, not the report schema.
7. **Immutable gate provenance:** Gate target/runtime/model/effort/source values
   are copied from configured invocation metadata and cannot be overwritten by
   observed or self-reported producer identity.
8. **Cursor validation pass:** Share one explicit pass context between config
   adoption and doctor. Resolve the broad Cursor catalog at most once per pass,
   while running one real Task/subagent probe for each distinct opaque Cursor
   candidate.
9. **Live evidence:** Probe every GPT-5.6 Cursor slug present in the current
   versioned recommendation asset. A sentinel-confirmed launch is definitive;
   an explicit subagent allow-list retains the existing availability semantics,
   while broad catalog context alone never proves eligibility.
10. **Workflow:** Remain in quick mode, revise lightweight design, and require
    explicit design approval before plan generation.

## Constraints

- Preserve valid behavior and malformed-input handling for legacy scalars,
  direct targets, ordered fallback routes, candidate ladders, and sparse
  overrides.
- Preserve candidate ladders as atomic values during layered-config flattening;
  never resolve individual `candidates[N]` entries from different layers.
- Preserve candidate tier/index, fallback-route index, exact target, and config
  source through normalization, traversal, validation, and reporting.
- Keep policy/invocation source, selected-cell source, and configured gate
  invocation source distinct.
- Preserve exact-candidate fail-closed behavior for missing, ambiguous,
  non-compilable, or above-ceiling managed targets.
- Do not reimplement candidate selection, task-worker coordination,
  materialization ownership, or gate provenance already delivered by the
  completed dependency project.
- Keep configured/requested values separate from runtime confirmation. A value
  read from config or sent to a provider is not observed producer identity.
- Keep Cursor credentials and tokens out of evidence; record only sanitized
  environment context.
- This branch is rebased onto merged PR #132 (`c5190684`), which contains the
  completed candidate-ladder contract. Re-verify the base only if `main`
  advances again before implementation.
- If shipped CLI functionality changes, bump the lockstep public package set and
  pass `pnpm release:validate`.

## Success Criteria

- One shared normalizer handles every supported legacy/modern matrix shape and
  replaces the duplicated config/project-state normalization paths.
- One shared provenance-rich walker replaces config and doctor traversal while
  preserving all structured indices, paths, tiers, and source layers.
- A versioned reusable dispatch report produces deterministic machine JSON and
  human output from the resolver's shipped exact-selection fields.
- The report distinguishes abstract policy, maximum ceiling, requested
  candidate, exact selected target, configured defaults, immutable gate
  invocation, and runtime-observed identity.
- `Dispatch:` parsing remains compatible and the stamp is derived from the
  report without weakening gate provenance.
- A validation pass invokes Cursor `models` at most once and
  `--list-models` at most once as fallback, while probing every distinct
  Cursor candidate exactly once in that pass.
- Valid, unknown-value, and unvalidated outcomes remain explicit in config and
  doctor output.
- Live evidence covers every currently recommended Cursor GPT-5.6 slug with
  exact command/prompt, sanitized environment, stdout/stderr, exit status,
  sentinel result, date, and a recheck date for unavailable candidates.
- Recommendation/config/docs changes are made only from live evidence; any
  unverified candidate is called out explicitly rather than silently retained
  or removed.
- Focused tests, repository checks, and `pnpm release:validate` pass.

## Out of Scope

- Changing the names or provider-neutral meaning of Economy, Balanced, High,
  Frontier, Uncapped, or Inherit Host Defaults.
- Rebuilding exact task-worker dispatch, candidate ladder resolution, Codex
  role materialization, or gate artifact corroboration.
- Hard-coding GPT-5.6 families into abstract policy compilation.
- Long-lived, cross-command, or global Cursor catalog caching.
- Treating broad catalog presence as proof of Task/subagent eligibility.
- Producing a formal `spec.md` or full spec-driven design.

## Deferred Ideas

- General dispatch telemetry or persistence beyond the reusable report contract.
- Provider capability inference from opaque candidate naming.
- Catalog caching beyond a single validation pass.

## Open Questions

- **Design approval:** Whether the revised full lightweight design accurately
  captures the shipped dependency contract before planning.
- **Live availability:** Which of the current recommendation's GPT-5.6 Cursor
  candidates will return the exact Task sentinel in the implementation
  environment.

## Assumptions

- The implementation base includes merged PR #132 and its completed
  `gate-review-provenance-target-safety` contract.
- The versioned recommendation asset is the source for the live-probe candidate
  set; implementation re-reads it rather than copying a stale list.
- No persisted live Task-success evidence currently exists for the 13 GPT-5.6
  Cursor candidates in recommendation version `2026-07-10.2`; prior broad
  catalog discussion does not satisfy the acceptance criterion.

## Risks

- **Compatibility drift:** Canonicalizing legacy shapes could change malformed
  or sparse behavior.
  - **Likelihood:** Medium
  - **Impact:** High
  - **Mitigation Ideas:** Lock current behavior with raw-shape and
    consumer-path characterization tests before switching adapters.
- **Provenance collapse:** A broad report could accidentally conflate configured
  invocation, requested candidate, and runtime identity.
  - **Likelihood:** Medium
  - **Impact:** High
  - **Mitigation Ideas:** Use distinct typed sections and fail gate
    corroboration on missing/mismatched immutable fields.
- **Environment-dependent evidence:** Cursor availability can vary by account,
  rollout, credentials, or client version.
  - **Likelihood:** High
  - **Impact:** Medium
  - **Mitigation Ideas:** Record sanitized context and dated rechecks without
    guessing or silently editing recommendations.
- **Upstream contract drift:** Further changes to `main` could move the
  candidate-ladder interfaces again before implementation begins.
  - **Likelihood:** Low
  - **Impact:** High
  - **Mitigation Ideas:** Refresh from `main` at implementation preflight and
    regenerate task file references if the interfaces changed.

## Next Steps

Review and approve the refreshed lightweight design. Do not generate
`plan.md` until that approval is explicit.
