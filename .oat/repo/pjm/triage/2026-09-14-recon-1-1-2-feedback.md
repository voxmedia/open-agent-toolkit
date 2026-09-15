---
oat_triage_record: true
schema_version: 1
status: proposed
scope: Seven remaining-friction claims from the 2026-09-14 operator report against recon 1.1.2 and recon-worker 1.0.1
baseline_sha: 81bf04c1e48798276f5a56872d759057893f4efe
triage_pr: null
created: 2026-09-14
updated: 2026-09-14
---

# Recon 1.1.2 follow-up feedback

## Scope and exclusions

- In scope: the seven claims under "Still open" in the operator's 2026-09-14
  Cursor report, verified against the canonical OAT repository after PR #285.
- Excluded: items the report marks addressed; the private downstream repository
  and its evidence packet; implementation; new public GitHub issues; Cursor
  product changes outside OAT's repository.
- Public-safe source description: operator report from a Cursor IDE run using
  recon 1.1.2 and recon-worker 1.0.1. Private downstream paths and findings are
  intentionally omitted.

## Evidence baseline

- `origin/main` and `HEAD` were both
  `81bf04c1e48798276f5a56872d759057893f4efe` on 2026-09-14; the dedicated
  `recon-feedback` worktree was clean before this record was written.
- GitHub CLI authentication and repository remote were verified. Open and closed
  issues and pull requests were searched. PR #285 is the merged 1.1.2 change;
  no GitHub issue directly covers these seven follow-ups.
- Three read-only skeptical-evaluator lanes independently checked the Cursor,
  runtime/CLI, and artifact-contract clusters, seeking contradicting evidence
  before support. Load-bearing conclusions below were rechecked against the
  current source and tests.
- Current-host caveat: the user-scope copies under `~/.agents/agents/`,
  `~/.claude/agents/`, and `~/.cursor/agents/` are recon-worker 1.0.0 on this
  machine, while the canonical checkout is 1.0.1. The operator's 1.0.1 install
  and live Cursor catalog observation are treated as a separate per-host report,
  not as verified state on this host.

## Disposition ledger

All repository-owned rows below are proposed as one backlog item: **Harden recon
controller and artifact contracts after 1.1.2** — priority `high`, scope
`feature`, estimate `M`. High reflects repeatable loss or invalidation of
multi-minute evidence work plus an ambiguity at the assurance-bearing
reconciliation boundary. `M` reflects changes across the controller and worker
contracts, routing/validation helpers, fixtures, tests, bundled-skill and agent
versions, public package lockstep versions, release validation, and docs, while
remaining localized to recon and its Cursor mechanics reference.

### CLAIM-001 — Interactive Cursor background dispatch

- Source: operator report, item 1.
- Claim: recon does not require Cursor background leaves, so ordinary chat can
  interrupt multi-minute foreground waves.
- Verification: **Confirmed but narrower**. Recon requires controllers to load
  the active provider mechanics and launch through `oat-dispatch-subagents`
  (`.agents/skills/recon/SKILL.md:152-160,212-220`). Those mechanics already say
  interactive Cursor user messages can interrupt foreground children and prefer
  background for multi-minute work
  (`.agents/skills/oat-dispatch-subagents/references/provider-cursor.md:96-103`).
  The remaining gap is that recon Step 5 does not make or test a per-lane
  foreground/background choice. The stronger claim that a controller faithfully
  following recon has no warning is not supported.
- Confidence: high.
- Existing coverage: dispatch mechanics document the host behavior; no recon
  test binds that behavior into a lane launch.
- Proposed GitHub action: none; no public issue was requested.
- Backlog action: create/link the consolidated item. Require background for an
  interactive Cursor lane expected to exceed a short check when a durable
  awaited handle exists; record the mode and reason. Keep the foreground
  exception and avoid copying provider launch grammar into recon.
- Priority and size rationale: recurring interruption risk with an existing
  documented workaround; small alone, but part of the consolidated reliability
  contract.
- Approval: pending.
- Post-merge result: pending.

### CLAIM-002 — Valid artifact followed by stream-close error

- Source: operator report, item 2.
- Claim: a valid assigned artifact followed by an RPC stream-close error has no
  deterministic success rule.
- Verification: **Confirmed but narrower**. Replacement is not ambiguous: it is
  already forbidden after acceptance (`recon/SKILL.md:228-236` and
  `oat-dispatch-subagents/SKILL.md:455-479`). What is missing is outcome
  precedence when the approved path contains a schema-valid, lane-matching,
  digestable artifact but the accepted handle later reports an RPC error. The
  current fake controller has no such case.
- Confidence: high.
- Evidence: the repository has separately recorded the same
  `WritableIterable is closed` class after durable artifact writes in
  `.oat/repo/reference/project-summaries/20260716-gate-execution-hardening.md:89-92`.
- Existing coverage: GitHub issue #266 and
  `BL-260906-harden-dispatch-launch` own general terminal reconciliation, but do
  not state recon's artifact-over-stream precedence rule.
- Proposed GitHub action: none; no public issue was requested.
- Backlog action: create/link the consolidated item and cross-reference
  `BL-260906-harden-dispatch-launch`. Validate only the approved path, lane
  identity, schema, and exact bytes; when all pass, record completion plus a
  provider diagnostic and do not relaunch. Otherwise record `PASS_FAILED`.
- Priority and size rationale: a real host error can discard expensive valid
  work or tempt an unsafe duplicate launch; targeted controller/test change.
- Approval: pending.
- Post-merge result: pending.

### CLAIM-003 — Bundled CLI entrypoint can silently no-op

- Source: operator report, item 3.
- Claim: five recon CLIs can exit zero without running `main()` because direct
  execution compares unresolved URL spellings.
- Verification: **Confirmed current defect**. The guard appears in
  `validate-artifact.mjs:88-95`, `create-review-brief.mjs:444-451`,
  `validate-packet.mjs:2601-2608`, `render-packet.mjs:439-446`, and
  `prepare-routing.mjs:82-87`. Canonical invocation reaches usage handling, but
  invoking each through a temporary symlink on this host exits 0 with zero
  stdout/stderr bytes.
- Confidence: very high.
- Existing coverage: current CLI tests invoke canonical real paths and do not
  exercise a symlink or alternate filesystem identity.
- Proposed GitHub action: none; no public issue was requested.
- Backlog action: create/link the consolidated item. Centralize a realpath-based
  ESM-main predicate and add canonical-plus-symlink subprocess controls for all
  five executables.
- Priority and size rationale: silent success is misleading and mechanically
  reproducible; implementation is small, with the main burden in regression
  coverage.
- Approval: pending.
- Post-merge result: pending.

### CLAIM-004 — Cursor role file is not live Task eligibility

- Source: operator report, item 4.
- Claim: installing `.cursor/agents/recon-worker.md` does not prove that the
  current Cursor Task catalog can launch `recon-worker`.
- Verification: **Provider limitation plus documentation hardening**. The claim
  holds. OAT already distinguishes the live Native Task/Subagent schema from UI
  role configuration and other catalogs
  (`oat-dispatch-subagents/references/provider-cursor.md:9-19`), and recon already
  requires a live catalog observation plus a pre-approval generic fallback
  (`recon/SKILL.md:152-169`). OAT cannot make Cursor expose a Task type. The
  remaining repository action is one explicit sentence and regression that a
  materialized role file is not catalog evidence.
- Confidence: high on the ownership boundary; the operator's exact live catalog
  is reported evidence and was not independently observable from this host.
- Existing coverage: `BL-260719-add-pinned-recon-agents` already preserves
  generic fallback when no pinned role is available; PR #285 tests generic
  fallback before approval.
- Proposed GitHub action: none; provider escalation is outside this triage.
- Backlog action: refine/link `BL-260719-add-pinned-recon-agents` for the provider
  capability boundary; include the small wording/test hardening in the
  consolidated item without claiming Cursor Task exposure.
- Priority and size rationale: OAT behavior is already fail-closed; this is
  clarity against a repeatedly confusing provider boundary.
- Approval: pending.
- Post-merge result: pending.

### CLAIM-005 — Compile excerpts and post-reconcile repair

- Source: operator report, item 5.
- Claim: compile does not require source-substring excerpts, and no
  post-reconcile locator-repair revision exists.
- Verification: **Confirmed but narrower**. The controller already reopens
  locators and rejects non-substring excerpts with
  `LOCATOR_EXCERPT_MISMATCH` before any review brief
  (`recon/SKILL.md:242-251`, `validate-packet.mjs:586-665`), with a negative
  control in `packet-validation.test.mjs:1580-1595`. The worker-facing compile
  instruction only says deduplicate and avoid invention
  (`recon-worker.md:74-78`), so it lacks the constructive exact-copy rule. No
  repair revision exists; current reconciliation deliberately rejects byte
  drift in prior evidence.
- Confidence: high.
- Existing coverage: strong pre-review fail-closed validation; no worker-facing
  rule or repair model.
- Proposed GitHub action: none; no public issue was requested.
- Backlog action: create/link the consolidated item for a contiguous exact or
  redacted-exact excerpt rule and a compile-stage negative control. Explicitly
  exclude locator-repair revisions from this item: they weaken the existing
  immutable-evidence model and need a separately approved design if still
  desired.
- Priority and size rationale: current packets already fail closed; reducing
  avoidable failed runs is medium-value, while repair is intentionally deferred.
- Approval: pending.
- Post-merge result: pending.

### CLAIM-006 — Closed examples and schema retry

- Source: operator report, item 6.
- Claim: workers lack usable per-review-kind examples, and accepted schema
  failure is conflated with forbidden lane replacement.
- Verification: **Confirmed contract defect**. Worker-facing contracts provide
  no JSON examples (`recon-worker.md:109-125`,
  `references/worker-contract.md:62-89`). Test fixtures are machine examples but
  are not supplied as worker guidance. `unresolvedIssues` is required to be an
  array without validating string elements (`contracts.mjs:2181-2194`); a direct
  probe accepts an object element. Routing exposes `retryLimit` and
  `worstCaseLaneAttempts`, while the execution path makes any accepted invalid
  write terminal. The contract does not define a legal explicit same-lane retry.
- Confidence: high.
- Existing coverage: GitHub issue #295 covers pre-acceptance envelope rejection,
  not a post-acceptance schema-invalid artifact. General same-target recovery is
  default-deny unless a caller-specific contract defines it
  (`oat-dispatch-subagents/SKILL.md:465-477`).
- Proposed GitHub action: none; no public issue was requested.
- Backlog action: create/link the consolidated item. Add compact closed examples
  for each review kind; enforce string-only unresolved issues; define a
  controller-only schema retry bounded by the already approved `retryLimit`,
  with the same lane, target, authority, and write path, quarantining the invalid
  attempt and forbidding route or worker substitution. Exhaustion becomes
  `PASS_FAILED`.
- Priority and size rationale: invalid artifacts occurred in a real run, and the
  advertised retry budget currently has no usable meaning after acceptance;
  contract and negative-control work make this medium-sized.
- Approval: pending.
- Post-merge result: pending.

### CLAIM-007 — Reconciliation has two outputs but one approved path

- Source: operator report, item 7.
- Claim: reconciliation requires both a review result and candidate ledger but
  authorizes one worker artifact/write path, leaving promotion ownership
  ambiguous.
- Verification: **Confirmed current contract defect**. The routing fixture gives
  reconciliation one file path; the packet contract counts one
  `recon.review-result`; the worker must write exactly one JSON artifact; and
  recon Step 5 nevertheless says the same wave writes a new ledger candidate.
  `reconcileLedger()` returns `{ ledger, reconciliation }`, and validation expects
  separate `claims.json` and reconciliation review artifacts. `claims.json` is
  excluded from lane-output accounting, so the controller's promotion ownership
  is not stated.
- Confidence: very high.
- Evidence: `packet-fixture.mjs:42-50`, `packet-contract.md:179-189`,
  `recon-worker.md:109-124`, `recon/SKILL.md:261-264`,
  `reconcile-ledger.mjs:324-359`, and `validate-packet.mjs:988-1008`.
- Existing coverage: no GitHub issue or backlog item states this two-output
  authorization gap. PR #285 introduced the current terminal topology but did
  not settle promotion ownership.
- Proposed GitHub action: none; no public issue was requested.
- Backlog action: create/link the consolidated item. Make the approved
  reconciliation envelope name both the review-result path and candidate-ledger
  path, preferably contained by one approved reconciliation directory; state
  that the controller validates both and atomically promotes only the candidate
  ledger to canonical `claims.json`. Add swapped, missing, unapproved-path, and
  valid-promotion controls.
- Priority and size rationale: this is an assurance-bearing ownership ambiguity
  that made the real run easy to invert; localized but cross-schema.
- Approval: pending.
- Post-merge result: pending.

## Open concerns

- The exact mechanics of a schema retry need one lightweight design decision:
  continuation through the accepted handle when possible versus an explicitly
  linked same-target attempt when the handle is gone. The generic dispatch
  contract permits either only when recon defines the boundary before launch.
- A locator-repair revision is not included in the proposed item. Any future
  design must preserve evidence identity and distinguish correction from
  invented or silently replaced evidence.
- Cursor Task-type exposure remains provider-owned. OAT can document and test
  the live-catalog gate but cannot promise the canonical role is launchable.
- `BL-260908-restore-recon-s-cheap-fan-out` is still open even though PR #285 is
  merged and issue #274 is closed; backlog lifecycle cleanup is adjacent drift,
  not part of this feedback item.

## Resume instructions

Pending consolidated approval of the disposition ledger. If approved, create
the one proposed backlog item, refine/cross-link existing coverage as stated,
regenerate managed indexes, and open the triage PR. No GitHub issue mutations
are proposed.
