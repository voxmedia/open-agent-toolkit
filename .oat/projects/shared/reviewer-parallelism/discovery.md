---
oat_status: complete
oat_ready_for: oat-project-quick-start
oat_blockers: []
oat_last_updated: 2026-07-18
oat_generated: false
---

# Discovery: reviewer-parallelism

## Phase Guardrails (Discovery)

Discovery captures the review-orchestration contract and its boundaries. It does not implement the agent guidance, tests, generated provider views, documentation, or release bookkeeping.

## Initial Request

Scope this quick-mode project to `BL-260708-enable-oat-reviewer-subagent`: teach `oat-reviewer` when and how to delegate bounded reconnaissance to cheaper/faster subagents while keeping synthesis, severity judgment, validation, and final findings in the primary reviewer.

## Clarifying Questions

No blocking clarification was needed. The backlog item and current reviewer contract make the intended boundary explicit: improve broad-review latency and cost without weakening evidence quality or transferring reviewer judgment to workers.

## Solution Space

The request is well understood. The selected direction is a provider-neutral, reviewer-local orchestration contract backed by contract tests and workflow documentation. A new CLI dispatcher, payload schema, or generalized orchestration subsystem would expand the work beyond this backlog item without improving the v1 safety boundary.

## Options Considered

### Option A: Reviewer-local bounded reconnaissance contract (chosen)

Add eligibility, lane, evidence, verification, fallback, and ownership rules directly to the canonical `oat-reviewer` instructions. Preserve identical review coverage and output behavior when delegation is unavailable.

### Option B: New CLI/runtime nested-dispatch subsystem

Rejected for this project. Existing host-native subagent mechanisms are sufficient for capability-gated reconnaissance, while provider routing and concrete model values already belong to dispatch configuration.

### Option C: Fan-out in every outer review workflow

Rejected for this project. The primary reviewer has the best context to decide whether a resolved review scope is broad enough to partition; duplicating this policy across review-provide skills would scatter the contract.

## Key Decisions

1. **Eligibility:** Delegate only broad reviews with multiple independent evidence lanes, especially final code reviews, broad phase/range reviews, docs sweeps, and provider-view audits. Keep narrow task or artifact reviews inline when coordination cost would outweigh the benefit.
2. **Bounded fan-out:** Use one read-only reconnaissance round with disjoint, explicitly scoped lanes. Workers must not mutate files, write review artifacts, emit final structured findings, or spawn additional workers.
3. **Worker output:** Require compact lane reports containing coverage, checks performed, exact `file:line` evidence, gaps, and explicit uncertainty. Candidate observations are advisory, not accepted findings.
4. **Primary ownership:** The primary reviewer establishes authoritative scope, reopens and verifies every load-bearing source, reconciles overlap or disagreement, deduplicates, assigns severity, determines validation, and alone produces the artifact-mode review or canonical `StructuredFindings` response.
5. **Dispatch preference:** Before delegated reconnaissance, require the primary reviewer to load `.agents/skills/oat-dispatch-subagents/SKILL.md` and its single active-provider reference. That generic contract owns capability, catalog, model, effort, route, authorization, and launch evidence, including economical `recon` target selection. Do not load the project lifecycle adapter for reviewer-local lanes, hard-code provider model names, or imply that nested workers inherit the primary reviewer's managed dispatch target.
6. **Capability and fallback:** Capability-check reviewer-local delegation once. If it is unsupported, unauthorized, failed, empty, or malformed, cover the same lane inline without weakening the checklist or output contract.
7. **Implementation surface:** Update the canonical reviewer instructions and version, add durable semantic contract assertions, document the latency/cost benefit and safety boundary, regenerate provider views, and complete lockstep public-package release bookkeeping.

## Constraints

- Preserve the existing authoritative commit-range/scope rules, severity model, artifact-mode format, gate parsing contract, and structured-output schema.
- Keep concrete provider targets in the existing dispatch matrix/provider adapters; reviewer guidance stays provider-neutral.
- Add the `Task` tool to the canonical reviewer so hosts that enforce agent tool allowlists can expose nested dispatch.
- Account for hosts where a dispatched reviewer cannot itself spawn subagents; inline fallback is required.
- Generated provider views must be refreshed through `oat sync`; canonical files remain the source of truth.
- Changes under `.agents/agents` and the docs app are shipped CLI functionality, requiring all five public package versions to move in lockstep and `pnpm release:validate` to pass.
- The canonical `oat-reviewer` version must increase so installed copies do not appear current after its instructions change.

## Success Criteria

- `oat-reviewer` defines when broad-review delegation is appropriate and when to stay inline.
- Delegable reconnaissance is clearly separated from primary-only synthesis, source validation, severity judgment, validation, and final findings.
- Fan-out is bounded, non-recursive, read-only, and based on disjoint lane prompts.
- Reconnaissance prefers cheaper/faster capable workers when the host can reliably select them, without hard-coded provider models.
- Worker reports preserve exact evidence and uncertainty, and the primary reviewer verifies load-bearing claims before use.
- Delegated and inline paths preserve the same review checklist and final output contracts.
- Contract tests prevent sync or future edits from silently dropping the orchestration boundary.
- Review workflow documentation explains the expected latency/cost benefit, supported broad-review examples, safety boundary, and fallback behavior.
- Provider views are regenerated, focused/full validation passes, and the five public packages receive a lockstep patch bump.

## Out of Scope

- A new CLI API, review payload field, nested-worker resolver, or machine schema.
- Hard-coded Claude, Codex, or Cursor model names for reconnaissance workers.
- Recursive, chained, or unbounded subagent trees.
- Delegating synthesis, severity assignment, source validation, validation judgment, artifact writing, or user-facing findings.
- General roadmap work for phase-level fan-out/reconciliation outside review reconnaissance.

## Deferred Ideas

- A provider-resolved nested-worker dispatch matrix can be considered later if host APIs expose reliable portable controls.
- Telemetry comparing review latency/cost before and after bounded fan-out can be considered after the contract is dogfooded.

## Open Questions

None blocking plan generation. Implementation should use the host's supported generic-worker capability rather than invent a new provider contract.

## Assumptions

- The current review input block already contains enough scope information to decide whether reconnaissance can be partitioned.
- The existing provider sync pipeline will propagate canonical reviewer instruction changes to supported provider views.
- A prompt-contract change plus semantic contract tests is sufficient for v1; no executable nested-dispatch helper is required.

## Risks

- **Cross-lane gaps or duplicates:** Partitioned workers may miss interactions or repeat observations.
  - **Likelihood:** Medium
  - **Impact:** High
  - **Mitigation:** Require coverage accounting, primary reconciliation, and direct verification of load-bearing claims.
- **Provider capability drift:** Some hosts may not permit nested delegation or explicit cheaper-tier selection.
  - **Likelihood:** High
  - **Impact:** Medium
  - **Mitigation:** Capability-check once, describe tier selection as a preference when available, and preserve full inline fallback.
- **Unverified negative claims:** A worker may report that a test, requirement mapping, or handler does not exist.
  - **Likelihood:** Medium
  - **Impact:** High
  - **Mitigation:** Treat negative claims as load-bearing and require the primary reviewer to repeat the relevant search before promoting them to findings.

## Revision Addendum: Task-Class-Aware Reconnaissance

Dogfooding the completed contract showed that every final-review lane used the
same Composer 2.5 Fast target. That target was appropriate for deterministic
parity and command-execution work, but the same homogeneous wave also handled
semantic contract interpretation, lifecycle reconciliation, and release
analysis. An earlier economical release lane missed a published-version
collision that the primary reviewer later caught.

This addendum supersedes the original blanket economical-selection portion of
Key Decision 5 and Success Criterion 4:

- `role.class: recon` continues to define read-only advisory authority; it no
  longer implies one cheap model class.
- After reading the authoritative diff and mode-required artifacts, the
  primary reviewer classifies each independent lane as mechanical,
  intelligent, context-heavy/default, hard-reasoning, or consequential.
- Mechanical inventories, exact parity, and test/lint/format/build execution
  use fast economical workers when available.
- Silent-miss-prone interpretation, unfamiliar-code auditing, and
  cross-artifact analysis require intelligent or stronger workers.
- Security, release-policy, and other expensive-failure judgments remain
  primary-owned even when a stronger bounded advisory lane is useful.
- Mixed task classes use separate dispatch records/waves and never silently
  downgrade below their declared floor.
- Canonical guidance remains provider-neutral. Active user/repository
  instructions, provider references, live catalogs, policy, and ceiling resolve
  current examples such as Composer-class mechanical workers and Grok-class
  intelligent workers.
- Reviewer-local task-class request/record fields are added to the generic
  instruction/schema contract as optional fields for compatibility and are
  required by `oat-reviewer`; no CLI resolver or runtime scheduler is added.

Testing remains lean: extend existing semantic assertions, close the three
deferred safety-assertion gaps, reuse parity/sync/release checks, and dogfood one
mixed-class review. Do not build a nested-agent E2E harness or pin tests to
specific model names.

## Next Steps

Execute the reviewed supplemental `design.md` through Phase 4 after the
revision plan amendment passes artifact review.
