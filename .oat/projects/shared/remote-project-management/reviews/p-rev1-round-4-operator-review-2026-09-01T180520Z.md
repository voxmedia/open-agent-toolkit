---
oat_generated: true
oat_generated_at: 2026-09-01T18:05:20Z
oat_review_scope: p-rev1
oat_review_type: code
oat_review_invocation: operator-extension
oat_review_round: 4
oat_project: .oat/projects/shared/remote-project-management
oat_review_head_sha: 83ae7a9c160afdf4e6e4d08ff26268469403df0a
oat_review_range: 3a304e20c995f6d10f7de5d76430ef7d7c3f93fe..83ae7a9c160afdf4e6e4d08ff26268469403df0a
oat_prior_review_artifact: .oat/projects/shared/remote-project-management/reviews/p-rev1-round-3-re-review-2026-09-01T161854Z.md
oat_prior_review_head_sha: 15332edbf1a88e41fa1d909bb767273d527dcc28
oat_dispatch_request_id: remote-project-management-p-rev1-review-4-operator-20260901T180520Z
oat_dispatch_role: oat-reviewer-gpt-5-6-sol-high
oat_dispatch_model_selector: gpt-5.6-sol
oat_dispatch_effort_selector: high
oat_dispatch_policy: high
oat_dispatch_ceiling: high
oat_dispatch_route: native
---

# Code Review: p-rev1 Round 4 Operator Extension

**Reviewed:** 2026-09-01T18:05:20Z
**Scope:** Complete corrective Revision 1, including the Round-3 fixes and the
approved privacy, authorization, restart-safety, and provider-portability
contract
**Reviewed base:** `3a304e20c995f6d10f7de5d76430ef7d7c3f93fe`
**Reviewed full head:** `83ae7a9c160afdf4e6e4d08ff26268469403df0a`
**Latest fix parent:** `3f96634f1a769e8a1b2d99ba2de481551dc6b338`
**Latest fix commit:** `83ae7a9c160afdf4e6e4d08ff26268469403df0a`
**Files reviewed:** 20 implementation/test files, plus 5 project artifacts and
3 prior review artifacts used as requirements and history evidence
**Commits:** 13 in
`3a304e20c995f6d10f7de5d76430ef7d7c3f93fe..83ae7a9c160afdf4e6e4d08ff26268469403df0a`
**Verdict:** BLOCK — the operator extension is exhausted and Phase 4 remains
blocked
**Dispatch:** request
`remote-project-management-p-rev1-review-4-operator-20260901T180520Z`; caller
`oat-project-implement`; consequential review class; exact target
`oat-reviewer-gpt-5-6-sol-high`; model selector `gpt-5.6-sol`; effort selector
`high`; policy/ceiling `high/high`; native route; read-only authority except this
single review artifact; no fallback; configured runtime identity not
independently reported; selection source/reason `native-default / gate-target`

## Summary

The two Round-3 findings are closed at the boundaries they identified: the
public Commander continuation route now works without an observation for the
three durable pre-envelope create states, repeated no-handle direct-authorized
publishes converge on the deterministic active intent and fail closed on drift,
and structured previews carry distinct digest-bound revision freshness
evidence. The phase still does not pass. After a host create/update has been
accepted, the operation journal is advanced to `verification-pending` before
the verification-read action is made durable, so interruption at that handoff
can strand a remotely committed create with neither a resumable read action nor
a safe observation replay path.

Findings: 1 critical, 0 important, 1 medium, 0 minor

**Reconnaissance:** attempted

## Review Orchestration

| Wave | Task class    | Classification rationale                                                                                                         | Selected target                                                 | Acceptance / outcome                                                                                                                                                                                                                                                                                                                                                                                        | Floor satisfaction                                                                                     | Fallback                  |
| ---- | ------------- | -------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------ | ------------------------- |
| 1    | consequential | Restart/idempotency and privacy/approval failures can silently permit duplicate external effects or content-boundary violations. | `gpt-5.6-sol`, high effort, priority service tier, native route | Two disjoint read-only lanes completed. The restart lane's verification-handoff candidate was accepted after direct source confirmation; its pre-envelope, legacy-ID, and local-tamper candidates were rejected or bounded. The safety lane's universal-gate and freshness checks were accepted; its incomplete-intent compatibility observation was retained as Medium after direct reachability analysis. | Satisfied: explicit consequential-floor target matched the primary gate target; no below-floor launch. | `caller-inline`; not used |

**Primary reconciliation:** The primary reviewer independently reopened every
load-bearing location, reran the focused corrective suite and CLI gates, and
repeated the bounded absence checks. Worker reports remained advisory. The
accepted Critical is directly demonstrated by the ordering at
`service.ts:1261-1282`, the no-observation branch at `service.ts:1113-1136`, and
the duplicate-observation rejection at `external-action.ts:351-359`. The
remaining worker candidates either required manual corruption outside the
declared threat model or did not apply to a final-head code-generated intent.

## Findings

### Critical

- **Create verification handoff can strand a committed create after restart**
  (`packages/cli/src/commands/pjm/remote/service.ts:1261`)
  - Issue: After accepting a non-read mutation observation, the service builds
    the authoritative verification-read action but first transitions the
    operation to `verification-pending`, appends the accepted observation, and
    completes the single attempt (`service.ts:1261-1281`). It writes that read
    action only afterward (`service.ts:1282`). A crash or failed durable write
    between those operations leaves the journal in `verification-pending` while
    the current action is still the already accepted create/update. A
    no-observation continuation cannot recover this state because create
    handoff recovery is limited to `planned`, `authorized`, and
    `attempt-started` (`service.ts:1113-1119`), and the generic path requires an
    observation (`service.ts:1133-1136`). Replaying the accepted observation is
    also rejected because its digest is already recorded
    (`external-action.ts:351-359`). For create, the remote identity needed to
    reconstruct the read exists only in the accepted observation, so the
    remotely committed effect can be permanently stranded before authoritative
    verification and materialization. The declared crash points stop before
    this boundary (`service.ts:80-93`), and no real-surface regression exercises
    it.
  - Impact: A host create can happen exactly once and be accepted locally, yet
    an interruption can make the durable workflow unrecoverable without either
    repeating a stale observation or manually reconstructing ephemeral
    identity evidence. This breaks P0 restart safety, verified-postcondition
    completion, and duplicate-create recovery.
  - Fix: Persist the exact verification-read action and its accepted-create
    identity evidence before exposing `verification-pending`, or introduce a
    recoverable staged state whose journal can deterministically reconstruct
    that exact next action. On restart, reconcile the journal/current-action
    pair and re-emit only the read action; never repeat the create. Add an
    injected failure boundary between accepted mutation observation, next-action
    persistence, state transition, and envelope return, plus a real Commander
    regression proving one create attempt and resumable authoritative read-back.
  - Requirement: FR11, FR14, NFR2, NFR3; design mutation-coordinator
    persist-before-effect and read-back-verification contract; Revision 1
    restart-boundary verification intent.

### Important

None.

### Medium

- **Incomplete project create intents promote remote fields to an “explicit” local publication**
  (`packages/cli/src/commands/pjm/remote/service.ts:1575`)
  - Issue: `PlannedBindingCreateSchema` permits `localProjection` to be absent
    (`schema.ts:170-184`). Although final-head create preparation always writes
    it, a compatible/incomplete project intent that reaches verified read-back
    falls back to the remote observation's title, description, and priority and
    labels them `explicit-project-publication` (`service.ts:1575-1600`). That is
    not an explicit local normalized source and weakens the meaning relied upon
    by later project mutation preparation. The path is limited to incomplete or
    externally supplied persisted state, so it is not a current generated-path
    authorization bypass.
  - Impact: Recovery of an incomplete project create can establish misleading
    durable source provenance and make later mutation planning rely on content
    that was never explicitly supplied by the local project owner.
  - Fix: Require `localProjection` for project create intents, or parse older
    incomplete project intents into an explicitly incomplete/reconcile-required
    state that fails closed. Do not synthesize an explicit local publication
    from remote-authored fields. Add a compatibility fixture for a project
    intent without the projection.
  - Requirement: NFR1, NFR2, FR18; design explicit-publication and fail-closed
    outbound-projection boundary.

### Minor

None.

## Round-3 Finding Closure

| Round-3 finding                                                                                               | Status                      | Round-4 evidence                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                          |
| ------------------------------------------------------------------------------------------------------------- | --------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Public pre-envelope create continuation was unreachable and no-handle direct-authorized retry could duplicate | Closed for the cited defect | `index.ts:170-203` makes observation input optional. `service.ts:541-688` derives and reopens one active-intent operation from provider/context/target/projection and compares all load-bearing preview inputs. `service.ts:1721-1779` re-emits the exact durable action for planned/authorized/attempt-started states. `index.test.ts:365-520` exercises the real Commander surface before the first envelope, verifies one operation/action digest/host effect, and rejects projection drift. The new Critical occurs later, after a host observation has been accepted, and does not reopen this pre-envelope finding. |
| Structured approval preview substituted preview time for revision freshness                                   | Closed                      | `service.ts:963-981` derives remote revision evidence, `service.ts:605-616` distinguishes an unbound local source, `schema.ts:1134-1147` requires equality with the operation revision evidence, and `service.ts:2792-2845` digest-binds the evidence. `index.test.ts:622-705` deliberately uses different invocation, capability, revision-updated, revision-observed, and preview times.                                                                                                                                                                                                                                |

## Requirements/Design Alignment

**Evidence sources used:** `spec.md`, `design.md`, `plan.md`,
`implementation.md`, `state.md`, the three prior p-rev1 review artifacts, and
all 20 implementation/test files in the authoritative corrective range.

### Requirements Coverage

| Requirement | Status                                  | Notes                                                                                                                                       |
| ----------- | --------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------- |
| FR4         | Implemented                             | Public lifecycle and operation-continuation Commander surfaces are present; the no-observation create route is now reachable.               |
| FR5         | Partial                                 | Durable intent/action evidence is retained, but the mutation-to-verification handoff can leave an inconsistent journal/action pair.         |
| FR7         | Implemented                             | Description-policy choices remain fail-closed and projection-bound.                                                                         |
| FR8         | Implemented                             | Authority decisions and approval application remain bound to the persisted preview.                                                         |
| FR9         | Implemented                             | Preview-first normalized reconciliation remains in place.                                                                                   |
| FR11        | Missing at one P0 boundary              | The write-once host effect is followed by a non-atomic verification-action handoff that can prevent verified postconditions.                |
| FR12        | Implemented                             | Inbound fields are bounded and whole-field suppression is retained as incomplete evidence.                                                  |
| FR14        | Partial                                 | Pre-envelope duplicate-create recovery is closed, but post-create verification restart recovery is not.                                     |
| FR16        | Implemented                             | Execution remains live semantic host discovery over connector/configured-CLI surfaces.                                                      |
| FR18        | Implemented with a compatibility caveat | Generated project creates retain explicit publication data; incomplete stored intents should not synthesize that source from remote fields. |
| NFR1        | Implemented with a compatibility caveat | Universal outbound gating and inbound suppression are present; the Medium finding covers incomplete persisted project intent semantics.     |
| NFR2        | Partial                                 | Drift/ambiguity generally fail closed, but the verification handoff can strand a committed mutation.                                        |
| NFR3        | Missing at one P0 boundary              | Restart between accepted host observation and durable verification action is not recoverable.                                               |
| NFR4        | Implemented                             | Local PJM data remains available without a remote host surface.                                                                             |
| NFR6        | Implemented                             | Actual revision freshness and distinct evidence kinds are emitted.                                                                          |
| NFR8        | Implemented                             | Core execution stays provider-neutral and live-discovered.                                                                                  |

### Extra Work (not in declared requirements)

None.

## Bounded Safety and Portability Check

- The reviewed implementation performs no repository, worktree, Git-history,
  or arbitrary-file secret scan. Review searches were limited to the declared
  range and known artifacts.
- Inbound retention is limited to the four core snapshot fields and bounded
  adapter-extension allowlists. Sensitive-content signals replace the whole
  affected field with the suppression marker and retain incomplete/redaction
  evidence (`snapshot.ts:50-167`); the implementation makes no general-DLP or
  credential-value-parser claim.
- Every generated mutation action must supply a normalized projection whose
  writable fields exactly match the action, pass the universal current outbound
  safety result, and match the persisted preview hashes
  (`external-action.ts:230-280`). Preview, approval, action, and observation
  remain digest-bound.
- Connector and configured-CLI execution remain semantic live host-agent
  discovery/help surfaces. No reviewed core, skill, or test code hard-codes an
  MCP tool name, provider-native schema/catalog, or provider-specific CLI
  dialect, including a GitHub CLI command shape.

## Verification

The reviewer reran the following checks against the authoritative head:

```bash
pnpm --filter @open-agent-toolkit/cli exec vitest run \
  src/commands/pjm/remote/authority.test.ts \
  src/commands/pjm/remote/create-binding.test.ts \
  src/commands/pjm/remote/external-action.test.ts \
  src/commands/pjm/remote/index.test.ts \
  src/commands/pjm/remote/output.test.ts \
  src/commands/pjm/remote/schema.test.ts \
  src/commands/pjm/remote/service.test.ts \
  src/commands/pjm/remote/snapshot.test.ts \
  src/commands/pjm/remote/store.test.ts \
  src/commands/pjm/remote/__integration__/lifecycle.test.ts \
  src/commands/pjm/remote/capability.test.ts \
  src/commands/pjm/remote/credential-safety.test.ts \
  src/commands/pjm/remote/host-execution.test.ts \
  src/commands/pjm/remote/local-projection.test.ts \
  src/commands/pjm/remote/outbound-projection-safety.test.ts \
  src/commands/pjm/remote/preview.test.ts \
  src/commands/pjm/remote/provider.test.ts
pnpm --filter @open-agent-toolkit/cli type-check
pnpm --filter @open-agent-toolkit/cli build
git diff --check 3a304e20c995f6d10f7de5d76430ef7d7c3f93fe..83ae7a9c160afdf4e6e4d08ff26268469403df0a
pnpm run cli -- --json pjm remote operation continue --operation op_test
```

Results: 17 test files and 236 tests passed; CLI type-check passed; CLI build
passed; the range diff check passed. The deployed Commander probe reached the
operation lookup without requiring observation input and failed only because
the synthetic operation ID did not exist, confirming the public route itself
is reachable.

## Recommended Next Step

The operator extension is exhausted. Root should validate and receive this
review as the authoritative blocking result; Phase 4 remains blocked on the
Critical verification-handoff finding. No additional fix or review cycle is
authorized by this artifact.
