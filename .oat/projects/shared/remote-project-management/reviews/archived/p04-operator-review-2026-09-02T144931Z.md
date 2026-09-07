---
oat_generated: true
oat_generated_at: 2026-09-02T14:49:31Z
oat_review_scope: p04
oat_review_type: code
oat_review_invocation: operator-extension
oat_project: .oat/projects/shared/remote-project-management
oat_review_head_sha: 97ca0ed13b0fc76689989e4a49f3e638a9701915
oat_review_range: 59998f8d170510a528730ed04b8f43976021e8ca..97ca0ed13b0fc76689989e4a49f3e638a9701915
oat_prior_review_artifact: .oat/projects/shared/remote-project-management/reviews/p04-final-review-2026-09-02T140132Z.md
oat_prior_review_head_sha: 77dd7afb444f1f5ef93397dacfbfc1eb96a50f67
oat_prior_review_artifacts:
  - .oat/projects/shared/remote-project-management/reviews/p04-review-2026-09-02T123746Z.md
  - .oat/projects/shared/remote-project-management/reviews/p04-rereview-2026-09-02T132440Z.md
  - .oat/projects/shared/remote-project-management/reviews/p04-final-review-2026-09-02T140132Z.md
oat_prior_review_head_shas:
  - 680424fe8f173fcbea7028f7bef63619574207c8
  - 407d82524dabe5590306f40286375c00ab38b9c3
  - 77dd7afb444f1f5ef93397dacfbfc1eb96a50f67
status: passed
verdict: PASS
oat_findings_critical: 0
oat_findings_important: 0
oat_findings_medium: 0
oat_findings_minor: 0
oat_dispatch_request_id: p04-operator-review-4-20260902-97ca0ed1
oat_dispatch_role: oat-reviewer-gpt-5-6-sol-high
oat_dispatch_model_axis: selected:gpt-5.6-sol
oat_dispatch_effort_axis: selected:high
oat_dispatch_policy: high
oat_dispatch_ceiling: high
oat_dispatch_task_class: consequential
oat_dispatch_model_class_floor: consequential
oat_dispatch_fallback: caller-inline
oat_dispatch_allow_below_task_class_floor: false
---

# Operator-Extension Code Review: p04

**Reviewed:** 2026-09-02T14:49:31Z
**Scope:** Full Phase 4 post-fix image, tasks p04-t01 through p04-t11 and the
three bounded fix commits
**Files reviewed:** 6 Phase 4 implementation/test post-images plus their directly
imported shared contracts
**Commits:**
`59998f8d170510a528730ed04b8f43976021e8ca..97ca0ed13b0fc76689989e4a49f3e638a9701915`
(21 commits: 11 task commits, 7 bookkeeping/review/authorization commits, and 3
fix commits)
**Reviewed code head:** `97ca0ed13b0fc76689989e4a49f3e638a9701915`
**Current bookkeeping head excluded:**
`c99848e3271835e209691945829779b884be0e16`
**Verdict:** PASS — zero Critical and zero Important findings

## Summary

The operator fix closes the final review's wrong-context duplicate recovery,
generic specialized-operation validation, and unavailable-evidence attribution
defects. Direct code inspection and adversarial regression execution found no
new Critical, Important, Medium, or Minor defect in the full six-file Phase 4
post-image; all proportionate live checks passed.

Findings: 0 critical, 0 important, 0 medium, 0 minor

**Reconnaissance:** not-attempted

## Prior Finding Disposition

### Review 1 — `680424fe8f173fcbea7028f7bef63619574207c8`

| Prior finding                                                             | Disposition                                                                                                                                                                                                                                                            |
| ------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| C1 — Repository transfer changed durable GitHub identity                  | Resolved. Stable identity remains GitHub host plus immutable issue identity while mutable repository/display references and historical aliases remain separate evidence.                                                                                               |
| C2 — Public mutations bypassed normalized projection and universal safety | Resolved. Create, update, transition, and annotation plans require the explicit operation projection and retain exact universal/publication-safety, preview, approval, action, observation, provenance, identity, and readback evidence.                               |
| C3 — Publication safety was advisory and unbound                          | Resolved. Public or ambiguously public publication requires current context/capability-bound visibility evidence and exact universal-safety evidence through action and readback without retaining private projection content in the publication preview.              |
| C4 — Read classification accepted unpinned or contradictory evidence      | Resolved. Read actions and observations bind provider, pinned context/capability, stable identity/node, action, step, and freshness; transfer and deletion require exact structured evidence.                                                                          |
| C5 — Duplicate/discussion evidence was not action-bound                   | Resolved. Outer observations bind the planned provider, context, capability, query or identity, cursor, and bounds; duplicate candidates additionally require exact repository identity or structured transfer evidence.                                               |
| I1 — Conformance/integration coverage was shallow                         | Resolved. Additive tests now exercise the public validation/verification pair, forged specialized actions, exact/mismatched mutation readback, persistence only after public validation, bounded duplicate/discussion evidence, and concrete non-persistence behavior. |

### Review 2 — `407d82524dabe5590306f40286375c00ab38b9c3`

| Prior finding                                                       | Disposition                                                                                                                                                        |
| ------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| C1 — Public validation/verification accepted the wrong issue        | Resolved. Both public methods require exact mutation action evidence, provider/context, capability, stable identity, execution evidence, and create provenance.    |
| C2 — Public duplicate/discussion planning bypassed bounded planners | Resolved. The public adapter routes both operations through their typed bounded planners, and validators defensively reject incomplete or forged action contracts. |
| C3 — Stale deletion evidence was authoritative for a current read   | Resolved. Deletion evidence is current-action/current-step bound and must fall inside the documented freshness window without being future-dated.                  |
| I1 — Public adapter and persistence paths were not tested           | Resolved. Tests drive the public pair for all four mutation classes and prove persistence occurs only after successful public validation and verification.         |

### Review 3 — `77dd7afb444f1f5ef93397dacfbfc1eb96a50f67`

| Prior finding                                                                     | Disposition                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                              |
| --------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| C1 — Duplicate recovery accepted another host/account/repository identity         | Resolved. Candidate acceptance requires exact planned host/account and stable-ID host namespace. A same-repository result also requires current owner/name; a moved result requires self-consistent structured transfer evidence bound to stable identity, planned and current contexts, capability digest, query digest, and observation time (`packages/cli/src/commands/pjm/remote/providers/github.ts:1842`). The live regression matrix rejects wrong host, account, owner, name, namespace, forged history, and every independently altered transfer field (`packages/cli/src/commands/pjm/remote/providers/github.test.ts:1030`). |
| I1 — Generic adapter accepted unrelated issue evidence for specialized operations | Resolved. Generic validation explicitly fails closed and generic verification returns an unavailable sentinel for duplicate search and discussion reads, directing callers to their typed validators (`packages/cli/src/commands/pjm/remote/providers/github.ts:1166`). The public-surface regression covers both operations (`packages/cli/src/commands/pjm/remote/providers/github.test.ts:1590`).                                                                                                                                                                                                                                     |
| M1 — Unavailable/rate/permission classification preceded attribution              | Resolved. Duplicate and discussion validators now validate exact provider, context, capability, query or stable identity, and cursor before availability classification (`packages/cli/src/commands/pjm/remote/providers/github.ts:829`, `packages/cli/src/commands/pjm/remote/providers/github.ts:988`). Negative matrices cover misattributed unavailable duplicate and rate-limited discussion evidence (`packages/cli/src/commands/pjm/remote/providers/github.test.ts:1271`, `packages/cli/src/commands/pjm/remote/providers/github.test.ts:1542`).                                                                                 |

## Findings

### Critical

None (0)

### Important

None (0)

### Medium

None (0)

### Minor

None (0)

### Optional Improvements

None identified within the bounded Phase 4 scope.

## Requirements/Design Alignment

**Evidence sources used:** bounded Phase 4 and directly relevant safety/testing
sections of `spec.md`, `design.md`, `plan.md`, and `implementation.md`; all three
prior p04 review artifacts; all six Phase 4 post-images at
`97ca0ed13b0fc76689989e4a49f3e638a9701915`; and directly imported p03 provider,
conformance, outbound-safety, credential-safety, managed-Markdown,
purpose-policy, schema, preview, verification, and lifecycle-harness contracts.

### Requirements Coverage

| Requirement | Status      | Notes                                                                                                                                          |
| ----------- | ----------- | ---------------------------------------------------------------------------------------------------------------------------------------------- |
| FR5         | implemented | Durable GitHub identity is independent of mutable repository/display aliases; exact transfer evidence preserves continuity.                    |
| FR6         | implemented | All four mutation classes consume explicit operation-specific normalized projections and masks.                                                |
| FR11        | implemented | One attempt, exact authoritative readback, postcondition verification, uncertainty stop, and no blind retry are enforced.                      |
| FR13        | implemented | Reads distinguish inaccessible/ambiguous absence from current action/step/freshness-bound deletion and structured transfer.                    |
| FR14        | implemented | Duplicate recovery binds the query, capability, candidate identity/context, and exact structured transfer evidence before accepting one match. |
| FR15        | implemented | Transitions and annotations are independently gated, executed, and verified.                                                                   |
| FR16        | implemented | Host capability and observations remain semantic, exact-context bound, generic, and live-discovered.                                           |
| FR17        | implemented | Additive conformance and lifecycle fixtures cover the GitHub provider workflow.                                                                |
| FR18        | implemented | Inbound/discussion content is bounded and conservatively suppressed; discussion evidence is non-persistent.                                    |
| NFR1        | implemented | Universal and GitHub public-publication safety evidence remains exact and content-minimized through readback.                                  |
| NFR2        | implemented | Unsafe, ambiguous, forged, stale, or misattributed actions and observations fail closed.                                                       |
| NFR5        | implemented | GitHub aliases, transfers, extensions, and managed Markdown remain representable without weakening stable identity.                            |
| NFR8        | implemented | Core code and tests contain no native tool catalog, invocation schema, GitHub CLI dialect, or MCP-specific mapping.                            |

### Extra Work (not in declared requirements)

None.

## Provider-Neutral and Privacy Contract

- No MCP tool name, native connector schema, captured catalog, GraphQL request,
  GitHub CLI command/flag, or native invocation mapping appears in the six
  reviewed files. Host execution remains behind provider-neutral semantic
  capabilities and observations.
- Every mutation class retains exact normalized projection, field mask,
  universal safety result, GitHub publication safety, preview, approval, action,
  observation, identity/provenance, and readback evidence. Public or ambiguously
  public publication fails closed without embedding private artifact content in
  the publication preview.
- Inbound issue fields and bounded discussion bodies use conservative signal
  allowlists and whole-field suppression/incomplete evidence. The implementation
  does not claim credential-value parsing or general DLP.
- Duplicate candidates and discussion pages require exact provider, planned
  context, capability, identity/query/cursor, and bounds. No discussion body is
  stored in binding snapshots or journals.
- Shared p03 interfaces are unchanged; Phase 4 conformance and integration are
  additive within the six-file boundary.

## Verification Performed

- Resolved the phase base, three prior reviewed heads, operator-fix code head,
  bookkeeping head, and current `HEAD` to the supplied full SHAs. Current
  `HEAD` is the clean bookkeeping commit; its changes after the reviewed code
  head are limited to `plan.md`, `implementation.md`, and `state.md`.
- Verified the operator fix
  `97ca0ed13b0fc76689989e4a49f3e638a9701915` changes only
  `github.ts`, `github.test.ts`, and the GitHub integration test. The full phase
  owns exactly the declared six implementation/test files.
- Verified the authoritative range contains 21 commits and passed
  `git diff --check`.
- Inspected the exact duplicate candidate/transfer binding, specialized-operation
  fail-closed branches, and pre-classification evidence attribution. Executed
  the adversarial regression matrices for wrong host/account/owner/name/stable
  namespace, forged history, altered self-digested transfer fields, unrelated
  generic issue evidence, and misattributed unavailable/rate-limited evidence;
  none of the prior bypasses reproduced.
- Ran the focused Phase 4 suite live: 4 files, 116/116 tests passed.
- Ran the broader remote suite live: 30 files, 451/451 tests passed.
- Ran the six-file linter: 0 warnings and 0 errors.
- Ran the six-file formatter check: all files matched.
- Ran workspace type-check: 10/10 tasks passed; the CLI type-check and build ran
  live, while eight unaffected workspace tasks replayed cache.
- Searched all six files for MCP/native schema/catalog/GraphQL/GitHub CLI
  dialect indicators; no prohibited mapping was present.

## Residual Risks

- These are semantic fake-host tests, consistent with the phase boundary; they
  do not exercise a specific live GitHub host or native invocation dialect.
- Repository-wide release version gates were not rerun because this review did
  not modify implementation and the known lockstep version bump is explicitly
  deferred to p08-t05. No independent Phase 4 release defect was observed.
- This artifact records the sole authorized operator extension. No additional
  fix/review loop is implied.

## Final Verdict

PASS. All prior findings are resolved, the live safety regressions pass, and
the reviewed Phase 4 image has zero Critical and zero Important findings.

## Recommended Next Step

The root workflow may record this passing operator-extension result and continue
the already authorized project bookkeeping/execution sequence.
