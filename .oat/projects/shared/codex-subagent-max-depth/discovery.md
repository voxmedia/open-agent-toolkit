---
oat_status: in_progress
oat_ready_for: null
oat_blockers: []
oat_last_updated: 2026-07-10
oat_generated: false
---

# Discovery: codex-subagent-max-depth

## Phase Guardrails (Discovery)

Discovery is for requirements and decisions, not implementation details.

- Prefer outcomes and constraints over concrete deliverables (no specific scripts, file paths, or function names).
- If an implementation detail comes up, capture it as an **Open Question** for design (or a constraint), not as a deliverable list.

## Initial Request

Ensure OAT-managed Codex coordinator/worker roles support the native execution
topology `root (depth 0) → phase coordinator (depth 1) → task worker (depth 2)`.
Both project and explicit user materialization must enforce an effective
`agents.max_depth` of at least `2` without lowering higher user values,
overwriting unrelated configuration, or crossing configuration scopes.

Doctor/preflight must identify managed roles whose effective depth is too low,
explain the required topology, and provide scope-appropriate remediation.
Coverage must include merge thresholds, preservation, idempotence, scope,
sync output, and doctor behavior. Provider documentation, generated assets,
lockstep public-package versions, and release validation are part of delivery.

## Clarifying Questions

### Question 1: Coordinator sandbox failure

**Q:** Does native nested delegation require broadening the coordinator sandbox
because a workspace-write coordinator could not launch nested `codex exec`?
**A:** Diagnostics showed that nested CLI execution fails during app-server
initialization under an outer workspace-write sandbox, but native depth-2
`spawn_agent` succeeds under workspace-write when `agents.max_depth=2`.
**Decision:** Do not broaden coordinator permissions or redesign the topology.
The CLI fallback limitation is separate from the native path this project owns.

### Question 2: Dispatch provenance

**Q:** Must coordinators and workers self-report their model and reasoning effort?
**A:** No. The user considers the exact launcher-selected `agent_type`
authoritative; agent self-reporting is unnecessary.
**Decision:** The launcher records the selected materialized role and its
config-declared model/effort. Coordinator and worker reports remain focused on
task outcomes, commits, verification, blockers, and deviations.

## Solution Space

### Approach 1: Native exact-role delegation _(Chosen)_

Enforce depth `2`, dispatch the exact materialized `agent_type`, and treat the
launcher record plus role configuration as provenance. This preserves
workspace-write role isolation and the existing coordinator/worker topology.

### Approach 2: Full-access CLI coordinator with sandboxed CLI workers

Launch a full-access coordinator process and have it launch exact
workspace-write workers through `codex exec`. Diagnostics proved this can work,
but it replaces native depth-2 delegation with nested processes and broadens
the coordinator trust boundary.

### Approach 3: Root dispatch broker or direct root coordination

Move worker launching to the root so it owns runtime provenance. This provides
strong evidence but introduces a broker/resume protocol or removes the
coordinator, materially changing the topology.

### Chosen Direction

**Approach:** Native exact-role delegation with launcher-owned provenance.
**Rationale:** A no-edit runtime probe demonstrated that a workspace-write root
can spawn a coordinator at depth 1 and that coordinator can spawn an exact
materialized role at depth 2. Self-reported model metadata adds no trustworthy
evidence beyond the launcher-selected role and its static configuration.
**User validated:** Yes, explicitly on 2026-07-10.

## Options Considered

- Enforce the minimum in the existing shared Codex config merge used by sync
  and direct materialization rather than duplicating command-specific writes.
- Preserve `sandbox_mode = "workspace-write"` on managed implementer roles.
- Record model/effort as launcher-selected and config-declared, not
  worker-observed.
- Keep exact-role selection fail-closed for managed capped dispatch.

## Key Decisions

1. **Depth floor:** Managed Codex role materialization requires
   `agents.max_depth >= 2`; missing or lower values become `2`, equal and higher
   values are preserved.
2. **Scope ownership:** Project materialization mutates only project Codex
   config; explicit user materialization mutates only user Codex config.
3. **Provenance ownership:** The launcher owns coordinator and worker dispatch
   provenance from the exact `agent_type` and materialized role configuration.
4. **Sandbox posture:** Native coordinator and worker roles remain
   workspace-write; no full-access default is introduced.
5. **Failure behavior:** Managed exact-role dispatch still blocks when the
   requested `agent_type` cannot be selected.

## Constraints

- Preserve unrelated Codex configuration and custom roles.
- Remain idempotent and never lower a configured depth.
- Do not change `agents.max_threads`.
- Use normal repository sync/generation and package release policy.
- Bump each changed canonical skill version once in the final PR diff.

## Success Criteria

- Shared merge behavior covers missing, lower, equal, and higher depth values.
- Sync and direct materialization converge on the same depth-floor semantics.
- Project and user scopes remain isolated.
- Doctor passes at depth `2+` and warns below `2` with correct remediation.
- Exact native depth-2 role delegation remains compatible with workspace-write.
- Focused tests, generated assets, provider docs, package versions, and
  `pnpm release:validate` all pass.

## Out of Scope

- Redesigning or removing the phase coordinator.
- Introducing a root dispatch broker.
- Making full-access coordinators the default.
- Repairing unrelated custom `agent_type` selection behavior.
- Generic or unknown-target fallback for managed capped dispatch.
- Increasing required depth above `2` or changing `agents.max_threads`.

## Deferred Ideas

- Launcher-owned runtime attestations beyond config-declared role provenance.
- Nested `codex exec` support from sandboxed coordinators.

## Open Questions

- None blocking plan generation.

## Assumptions

- Codex honors `model` and `model_reasoning_effort` declared by the exact
  selected materialized role.
- Native spawn success plus exact launcher selection is sufficient provenance;
  runtime model telemetry is not currently available to the coordinator.

## Risks

- **Configured versus observed target:** Codex does not return independent
  runtime model/effort telemetry to the parent.
  - **Likelihood:** High
  - **Impact:** Medium
  - **Mitigation Ideas:** Label provenance accurately as launcher-selected and
    config-declared; never describe it as worker-observed.
- **Fallback regression:** Existing instructions may choose nested CLI even
  when exact native role selection is available.
  - **Likelihood:** Medium
  - **Impact:** Medium
  - **Mitigation Ideas:** Keep native exact-role dispatch primary and preserve
    fail-closed behavior when exact selection is unavailable.

## Next Steps

Use this discovery artifact to drive the next workflow step:

- **Spec-driven mode:** continue to `oat-project-design` (which confirms
  requirements and produces both `spec.md` and `design.md`).
- **Spec-driven mode → formalize-only:** use `oat-project-spec` standalone
  if you want a formalized requirements artifact but aren't ready to
  design yet.
- Proceed through the quick workflow decision gate. The implementation is
  bounded, but lightweight design may be useful to pin the provenance boundary
  between launcher records and agent reports before planning.
