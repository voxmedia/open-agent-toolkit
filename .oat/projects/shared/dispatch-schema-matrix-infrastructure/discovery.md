---
oat_status: in_progress
oat_ready_for: null
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

## Clarifying Questions

No additional clarification was required. The named backlog records provide
specific acceptance criteria, compatibility expectations, and fallback
behavior.

## Solution Space

The request is well-understood. Use one cohesive infrastructure project so the
shared matrix helpers become the basis for validation improvements while the
dispatch report contract and live Cursor slug verification remain separately
testable workstreams.

## Options Considered

### Option A: Consolidate and extend in one project

**Description:** Extract the shared matrix boundaries first, then build the
reporting, catalog-cache, and verification outcomes against those stable
boundaries.

**Pros:**

- Removes known duplication before the next matrix shape evolves.
- Keeps compatibility, validation, evidence, and documentation checks in one
  release-ready plan.

**Cons:**

- Requires careful phase boundaries because reporting and validation touch
  adjacent dispatch infrastructure.

**Chosen:** A

**Summary:** This matches the user's explicit grouping and reduces the risk of
shipping another matrix-shape change through duplicated traversal logic.

## Key Decisions

1. **Source of truth:** Keep policy rungs abstract and keep concrete provider
   targets in dispatch-matrix cells; do not hard-code GPT-5.6 family models into
   policy mappings.
2. **Matrix helpers:** Establish one shared normalizer for config and sparse
   project-state inputs and one shared cell-reference walker for adopt and
   doctor traversal.
3. **Dispatch report contract:** Represent route/invocation target, OAT policy,
   requested controls, configured defaults, and runtime confirmation as
   separate data, while retaining the parseable `Dispatch:` stamp as a
   compatibility surface.
4. **Cursor cache lifetime:** Cache the parsed Cursor model catalog only for a
   single validation pass, preserving valid, invalid, and unvalidated outcomes
   plus existing CLI/fallback behavior.
5. **Slug evidence:** Accept only live Cursor Task/subagent probe results for
   Sol, Terra, and Luna. If models are unavailable, record exact observed
   output and a concrete recheck date instead of guessing slugs.
6. **Workflow:** Use quick mode with implementation-ready tasks and no formal
   spec artifact.

## Constraints

- Preserve bare provider values, tier maps, ordered route cells, malformed-cell
  handling, sparse project overrides, and inherit/default behavior.
- Preserve Codex materialized-role and base-role fallback semantics plus
  Claude/Cursor model-argument dispatch behavior.
- Keep requested/configured controls distinct from observed or inferred runtime
  identity; do not lead human output with `producer=unknown` when identity was
  simply not reported.
- Make live Cursor verification reproducible with exact command/output evidence.
- If shipped CLI functionality changes, bump the lockstep public package set and
  pass `pnpm release:validate` before implementation is considered done.

## Success Criteria

- Shared dispatch-matrix normalization and traversal helpers replace the known
  duplicated paths without behavior drift.
- A reusable dispatch report schema produces stable machine output and clear
  human-facing output while supporting the existing parseable stamp.
- One adopt/doctor validation pass fetches the Cursor catalog at most once and
  retains explicit fallback/result semantics.
- Cursor GPT-5.6 Sol, Terra, and Luna subagent slugs are either verified by live
  probes and used consistently, or their unavailable state and next recheck are
  recorded with reproducible evidence.
- Focused tests cover helpers, consumers, cache call counts, formatter variants,
  fallback routes, and runtime-identity-unverified cases.
- Relevant CLI/workflow documentation distinguishes requested controls,
  configured defaults, and runtime confirmation.
- Repository lint, formatting, type checks, tests, and release validation pass
  as required by the final diff.

## Out of Scope

- Changing abstract dispatch-policy definitions or introducing a default
  GPT-5.6 policy mapping.
- Guessing Cursor slugs from a general model listing without a subagent probe.
- Redesigning unrelated provider dispatch, gate, or orchestration behavior.
- Producing spec-driven `spec.md` or full `design.md` artifacts unless the user
  explicitly promotes the project.

## Deferred Ideas

- Broader dispatch telemetry or long-lived/cross-command provider catalog
  caching; this project limits cache lifetime to one validation pass.
- Additional model families beyond the GPT-5.6 Sol, Terra, and Luna verification
  requested here.

## Open Questions

- **Design depth:** Whether to go straight to the plan or capture a lightweight
  design for the shared schema/helper boundaries first.
- **Live availability:** Whether the current Cursor installation exposes all
  three GPT-5.6 family models to Task/subagent execution.

## Assumptions

- The existing dispatch resolver/config/doctor tests are the behavioral
  baseline for matrix consolidation.
- Cursor verification may legitimately conclude that one or more models are not
  yet exposed, provided the evidence and recheck date are recorded.

## Risks

- **Compatibility drift:** Consolidating duplicated code could subtly change
  malformed or sparse-cell behavior.
  - **Likelihood:** Medium
  - **Impact:** High
  - **Mitigation Ideas:** Characterization tests around every existing input
    shape before switching consumers.
- **Environment-dependent evidence:** Cursor catalog or subagent access may vary
  by account, rollout, or installed client state.
  - **Likelihood:** Medium
  - **Impact:** Medium
  - **Mitigation Ideas:** Record client context, exact commands, raw outcomes,
    and a dated recheck when verification cannot complete.

## Next Steps

Choose whether the shared data-model and component-boundary decisions warrant a
lightweight quick-mode `design.md`; otherwise confirm these requirements and
generate `plan.md` directly.
