---
oat_status: in_progress
oat_ready_for: null
oat_blockers: []
oat_last_updated: 2026-06-28
oat_generated: false
oat_template: false
---

# Discovery: workflow-gate-improvements

## Phase Guardrails (Discovery)

Discovery is for requirements and decisions, not implementation details.

- Prefer outcomes and constraints over concrete deliverables.
- Capture implementation details only when they are needed to bound the plan.

## Initial Request

Create a quick OAT project for a follow-up PR that addresses dogfood feedback from
the workflow-gates feature. The user agrees with the general fix direction:
semantic review-gate blocking, gate-aware quick/import planning paths, gate
review handoff/provenance, explicit high-effort target configuration, and command
reference polish.

The user explicitly does not want a read-only review mode. A gate review should
behave like running `oat-project-review-provide` in another terminal/provider:
writing the review artifact, updating the plan Reviews row, and committing review
bookkeeping are expected side effects.

## Clarifying Questions

### Question 1: Gate Review Side Effects

**Q:** Should gate reviews avoid mutating the repo or committing artifacts?
**A:** No. The provider following the normal review workflow is fine; creating
files and commits is expected from `review-provide`.
**Decision:** Do not add a read-only review mode. Treat stateful
`oat-project-review-provide` behavior as the contract and improve handoff,
provenance, and docs around it.

### Question 2: Durable Gate Command References

**Q:** Should gate config and docs use absolute dev-build or linked-binary paths?
**A:** No. All durable references should use `oat`, except during local
development of unmerged gate functionality. Once merged, even locally linked
binaries should still be invoked as `oat`.
**Decision:** Docs, examples, and durable user-level setup must reference
`oat gate ...`; local PATH or shell setup is responsible for resolving the linked
binary when relevant.

## Solution Space

The chosen direction is a focused follow-up PR rather than a broad Gates V2
redesign. The project should repair defects in the shipped cross-runtime review
workflow while preserving the useful dogfood signal: a different provider caught
a real plan gap that same-runtime review missed.

### Approach 1: Gate Review Semantics + Lifecycle Handoff _(Recommended)_

**Description:** Keep `cross-provider-exec` as the execution mechanism, but add
a review-gate contract that can translate `oat-project-review-provide` verdicts
into gate pass/fail semantics and leave a clear handoff to
`oat-project-review-receive`.

**When this is the right choice:** Best when the primary defect is that review
findings are semantically blocking but the child process exits 0.

**Tradeoffs:** Requires a small review-artifact or review-skill contract, but it
avoids redesigning target selection or provider dispatch.

### Approach 2: Broad Gate Dispatch V2

**Description:** Fold the dogfood feedback into the existing Gates V2
same-target/target-detection backlog item.

**When this is the right choice:** Best if the main problem were model/effort
identity or same-runtime target switching.

**Tradeoffs:** Too broad for the observed blocking bug. It delays fixes for
quick/import gate coverage and review handoff behind harder target-detection
work.

### Approach 3: Documentation-Only Clarification

**Description:** Document that V1 gates are exit-code-only and require users to
configure review commands that exit nonzero themselves.

**When this is the right choice:** Best if the current behavior were acceptable
and only expectations were wrong.

**Tradeoffs:** Insufficient. The advertised independent review gate use case
should block on blocking review findings without users hand-building brittle
parsing.

### Chosen Direction

**Approach:** Gate Review Semantics + Lifecycle Handoff.
**Rationale:** It fixes the real dogfood failure while keeping the deliberately
thin V1 dispatch model and normal review workflow side effects.
**User validated:** Yes.

## Options Considered

### Option A: Add Review Skill Gate Mode

**Description:** Add a gate-oriented mode to project/ad-hoc review-provide
surfaces that exits nonzero when findings at or above a configured severity are
present and emits or records enough structured metadata for the gate runner.

**Chosen:** Possible implementation path.

**Summary:** This keeps verdict ownership close to the review skill but may
require touching skill instructions and any helper surfaces that parse review
artifacts.

### Option B: Add Dedicated Gate Review Wrapper

**Description:** Add an `oat gate review ...` style command or wrapper that
dispatches the review, inspects the resulting artifact, surfaces the artifact
path, and maps findings to an exit code.

**Chosen:** Possible implementation path.

**Summary:** This centralizes gate semantics in the CLI and can preserve
`cross-provider-exec` as a lower-level executor.

### Option C: Inspect Review Artifact After `cross-provider-exec`

**Description:** Keep existing gate commands but have the Gate Execution step or
CLI inspect the review artifact produced by the child runtime.

**Chosen:** Possible implementation path, but only if artifact discovery is
reliable.

**Summary:** This may be the smallest behavioral change, but the plan should make
the artifact-resolution and provenance rules explicit to avoid guessing.

## Key Decisions

1. **Stateful Review Contract:** Gate reviews remain normal
   `oat-project-review-provide` runs. Review artifact writes, Reviews-row
   updates, and review bookkeeping commits are expected.
2. **Semantic Blocking:** A gate configured with `onFailure: block` must fail
   when the produced review has blocking findings, even if the child provider
   process exits 0.
3. **Gate Provenance:** Gate-produced review artifacts should be distinguishable
   from manual and auto checkpoint reviews, for example with
   `oat_review_invocation: gate`.
4. **Receive Handoff:** The host workflow must surface the review artifact path
   and make the required `oat-project-review-receive` handoff explicit, or route
   automatically where the lifecycle can safely do so.
5. **Gate Coverage:** `oat-project-quick-start` and `oat-project-import-plan`
   should become gate-aware so configured plan gates fire regardless of how the
   plan was authored.
6. **Effort Configuration:** Do not infer gate effort from
   `oat_dispatch_ceiling`. Gate effort/model should be explicit in gate target
   config, with examples for high-effort review targets.
7. **Command Reference Convention:** Durable docs and config examples use
   `oat`, not absolute dev-build paths. Absolute paths are acceptable only while
   developing unmerged local functionality.
8. **Polish Warning:** Include the optional CLI/docs polish to warn or guide when
   a configured gate command looks like a dev-build `node .../dist/index.js`
   reference.

## Constraints

- Keep the follow-up focused; do not implement same-target/model-level Gates V2.
- Do not add read-only review mode.
- Preserve normal `review-provide` side effects and commits.
- Preserve the cross-provider benefit observed in dogfood.
- Use repo-local CLI commands for this project planning session when needed
  because the installed `oat` is older than the repo CLI, but planned user-facing
  docs/config references must say `oat`.
- Publishable package or bundled-skill changes may require lockstep public
  package version bumps and `pnpm release:validate` before the final PR is done.

## Success Criteria

- A cross-provider review gate can return nonzero or otherwise block when the
  review artifact contains blocking findings.
- Gate-produced review artifacts carry gate provenance and are discoverable by
  receive/review-latest flows.
- Gate Execution instructions tell the host what review artifact was produced
  and how it must be received before proceeding.
- `oat-project-quick-start` and `oat-project-import-plan` declare gate awareness
  and include the Gate Execution step.
- Workflow-gates docs explain stateful gate reviews, receive handoff, and
  explicit high-effort target setup.
- Docs/examples and durable config guidance use `oat gate ...`.
- The CLI or docs surface a warning/guidance path for dev-build absolute gate
  commands.
- Tests cover review-gate verdict mapping, gate provenance/handoff behavior,
  gateability validation for quick/import skills, and the command-reference
  polish when implemented in CLI.

## Out of Scope

- Read-only, inline-only, or no-commit review mode for gates.
- Automatic dispatch-ceiling coupling for gate target selection.
- Gates V2 same-target/model-level detection.
- Codex hook parsing warnings unless investigation proves OAT owns the generated
  hook payload.
- Changing the fact that `cross-provider-exec` exits with the child status for
  generic non-review commands.

## Deferred Ideas

- Same-runtime but different-target gate dispatch belongs to the existing Gates
  V2 follow-up.
- Broader provider-effort adapters beyond Codex/Claude examples can remain
  future work.
- A richer machine-readable review artifact schema can be expanded later if the
  minimal verdict contract is not enough.

## Open Questions

- **Verdict Contract Shape:** Should the first implementation add a review-skill
  gate mode, a dedicated `oat gate review` wrapper, or post-dispatch artifact
  inspection?
- **Automatic Receive:** Should a plan/implement gate automatically invoke
  `oat-project-review-receive`, or should it stop and require explicit user
  confirmation because receive mutates plan/implementation artifacts?
- **Severity Threshold:** Should "blocking" mean Critical+Important only, or
  include Medium for final reviews and artifact gates?

## Assumptions

- Existing review artifacts contain enough severity structure for a minimal
  verdict parser or can be updated to do so with bounded changes.
- Gate-aware skill validation can be extended to quick-start/import-plan without
  changing non-gateable skills.
- Docs and tests can be updated within one quick-mode PR.

## Risks

- **Brittle Artifact Parsing:** If review artifacts are prose-only, verdict
  parsing can be fragile.
  - **Likelihood:** Medium
  - **Impact:** High
  - **Mitigation Ideas:** Prefer a small structured verdict marker or explicit
    review gate mode over broad prose parsing.
- **Lifecycle Overreach:** Automatically receiving reviews could apply plan
  mutations without a deliberate user checkpoint.
  - **Likelihood:** Medium
  - **Impact:** Medium
  - **Mitigation Ideas:** Start with explicit handoff unless a lifecycle-safe
    receive route is clearly designed.
- **Release Churn:** Skill/doc changes may trigger lockstep package bumps.
  - **Likelihood:** High
  - **Impact:** Medium
  - **Mitigation Ideas:** Include release validation and version-bump tasks in
    the plan.

## Next Steps

Proceed straight to plan after requirements confirmation. Lightweight design is
not required because the user has already resolved the main product decisions
and explicitly narrowed the scope.
