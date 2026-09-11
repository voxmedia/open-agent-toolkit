---
oat_status: complete
oat_ready_for: oat-project-quick-start
oat_blockers: []
oat_last_updated: 2026-09-08
oat_generated: false
oat_template: false
---

# Discovery: Recon rework

## Initial Request

Restore recon's intended purpose: cheap, high-volume, multi-wave collection of traceable evidence for an intelligent calling agent. Independently approve and route each wave across supported harnesses, with bounded preapproved escalation. The caller evaluates the packet and owns consequential conclusions.

On 2026-09-08 Thomas selected a native **quick** project in the existing `recon-rework` worktree, asked this agent to synthesize the already-covered discovery, draft lightweight design and plan, and hand off **before self-review, plan review, configured gate execution, or implementation**. These are draft planning artifacts, not an implementation authorization or a passed review.

## Clarifying Questions

### Where should the intelligence live?

Thomas: "the whole idea of the recon skill was like super cheap fan out, high volume, multiple waves" and "it's still up to whoever is consuming the recon to ... do so intelligently."

**Decision:** Workers collect observations, exact locators, excerpts, counterexamples, contradictions, and gaps. The calling agent judges sufficiency and conclusions. A packet is not a final product or architecture verdict.

### Are verification and adversarial work automatically expensive?

Thomas explicitly rejected that premise: looking for disagreeing evidence can be another cheap pass. Bounded synthesis is a plausible escalation point when reconciliation actually needs judgment.

**Decision:** Classify the concrete assignment, not the words "adversarial," "verification," or "synthesis." Cheap citation reopening and counterexample search remain the default. Preserve disagreement instead of requiring a worker to resolve it. Do not silently weaken a genuine capability floor to save money.

### How should this work across harnesses?

Thomas described inexpensive Claude workers such as Haiku/Sonnet, Cursor workers such as Composer with stronger consolidation when appropriate, and Codex Luna workers with Terra when reconciliation needs judgment. These are examples of roles, not fixed selectors or newly verified provider qualifications.

**Decision:** Resolve current targets through existing orchestration guidance and the dispatch dependency for the active harness. Model, effort, reasoning mode, and service tier remain separate, provider-native controls. Recon does not own a second provider/model ladder or assume every harness exposes every control.

### Why propose targets before launch?

Thomas wants the user to see the proposed subagent model and effort for each assignment and push back when a more expensive route is unnecessary.

**Decision:** One explicit approval covers a complete per-wave table, topology, authority, limits, and any bounded escalation. Explain choices above the economical default. A harder wave must not raise unrelated workers' targets.

### What does the approval guarantee?

Thomas confirmed **approved per-wave selection**. Actual-launch verification is only available where a harness provides real evidence.

**Decision:** Preserve the distinction between approved intent, constructed invocation, accepted execution, and observed runtime evidence. No invented launcher receipts, controller self-attestation as proof, or stronger publication claims based on a model name.

## Solution Space

Chosen direction: one recon-specific compatibility change combining economical assignment defaults with per-wave approved targets. This project is separate from wave 7 and the recap redesign. The user explicitly requested drafting now; discovery does not require another interview.

## Options Considered

- **Keep one target but lower compile's default:** rejected as the general fix. Any genuinely harder required or conditional wave still inflates the run.
- **Per-wave targets with automatic adversarial escalation:** rejected; it preserves unnecessary cost within those waves.
- **Cheap bounded work, caller judgment, per-wave approval and bounded escalation:** selected product direction; concrete schema/helper choices in `design.md` are draft engineering decisions for review.
- **Build actual-launch provenance infrastructure now:** excluded. The existing packet contract deliberately removed an unsupported receipt chain.

## Key Decisions

1. Economical workers and sufficient provider-native reasoning are the starting point for bounded evidence passes, including redundant and challenge work.
2. Decompose an overly broad task before escalating. Escalation needs work-specific reasoning or observed difficulty, not a phase label or total file count.
3. Mechanical synthesis groups/deduplicates evidence and preserves competing claims. Interpretation-heavy reconciliation may use a stronger worker or return to the caller.
4. The user sees and approves exact per-wave choices. Conditional escalation requires named targets, concrete triggers, and finite execution limits.
5. No run-wide maximum. Homogeneity is within a wave; split a wave if its lanes require different targets or floors.
6. Preserve source, locator, secret, authority, review independence, assurance, immutable-artifact, and atomic-publication safeguards.
7. Quick remains capped at supported evidence; standard/thorough retain their required independent passes and derived assurance. The root still judges use.
8. Accepted failed lanes cannot be silently retried or replaced under an escalation label. Partial outcomes remain visible.
9. Preserve valid legacy v1 packets and their original approval meaning.
   **Superseded 2026-09-11:** the operator explicitly declined backward
   compatibility; `DR-260911-use-session-local-recon` replaces this with a
   manifest-v2-only, session-local approval contract.

## Constraints

- Planning baseline: `bb93ad233befc75d0da9bd699ffc57db80dfe393`, CLI 0.2.65, recon 1.1.1. Target branch/worktree: `recon-rework` on this Mac.
- Narrowly align shared classification guidance so bounded counterexample searches do not inherit the floor for a final consequential review. Preserve stronger floors for actual judgment.
- Reuse the existing `ValidatedRun` boundary and canonical artifact hashing;
  approval itself no longer carries a fingerprint under `DR-260911`.
- Edit canonical skills/roles; generate bundled/provider copies with repository tooling.
- No live-provider launch during planning. Future live tests need exact bounded dispatch approval.
- No triage, GitHub, release, push, or merge changes are authorized by this draft.

## Success Criteria

- Standard-profile collection, checking, and challenge can stay inexpensive even when one wave needs stronger judgment.
- Approval shows every required/redundant/conditional wave, supported exact controls, rationale, scope, and worst-case execution cap.
- Unapproved target/topology/limit changes are refused. Preapproved escalation follows its declared trigger without changing the approved envelope.
- Provider-neutral tests cover Claude, Cursor, and Codex-shaped selections, unavailable controls, exact-target preservation, and opaque selectors.
- Valid v1 packets validate/render unchanged; v2 never silently reinterprets approval or accepts untyped extensions.
  **Superseded 2026-09-11:** `DR-260911-use-session-local-recon` makes manifest
  v2 the only supported manifest while version-1 evidence artifacts remain valid.
- Activated conditional work supplies an outcome or honest material gap; non-triggered work cannot count as a completed pass.
- Packets expose evidence and intended routing without claiming actual-launch proof or final correctness.

## Out of Scope

Recap generation; wave-7 corrective lanes; generic lifecycle integration of recon; unrelated dispatch ceilings/project review policy/native launchers; a new cost database; provider benchmarking; broad provider ladder refresh; automatic fallback after accepted failure; publication or deployment.

## Deferred Ideas

Launcher-produced provenance and provider billing telemetry may be integrated later when real producers exist. Do not recreate the removed receipt architecture as a prerequisite for ordinary recon.

## Open Questions

No product-discovery question blocks drafting. Receiving-agent review must assess the proposed version boundary, conditional escalation representation, and evidence checks in `design.md`. Implementation dispatch ceiling, optional phase gates, and implementation HiLL checkpoints remain deliberately unresolved until handoff.

## Assumptions

The calling agent can evaluate evidence. Additional cheap passes reduce omissions but do not guarantee their absence. "Cheapest" means the least costly qualified route supported by current harness guidance, not a globally verified price minimum or minimum reasoning effort for every task.

## Risks

- Classification language could reintroduce expensive defaults: cover all ten modes, bounded-work examples, and a tested policy helper.
- Schema fields could overclaim enforcement: distinguish structural/integrity checks from caller-owned semantic judgments.
- Conditional work could become retries: predeclare identities, triggers, outputs, caps, and accepted-failure behavior.
- Old recommendations conflict with later user direction: this discovery and its chronology supersede withdrawn proposal tiers.

## Next Steps

Read `design.md`, `plan.md`, and `handoff.md`. Resume quick-start in place for design/plan review and readiness setup. Do not restart discovery or implement merely because substantive tasks exist.
