---
oat_triage_record: true
schema_version: 1
status: approved
scope: Seven remaining-friction claims from the 2026-09-14 operator report against recon 1.1.2 and recon-worker 1.0.1
baseline_sha: 81bf04c1e48798276f5a56872d759057893f4efe
triage_pr: null
created: 2026-09-14
updated: 2026-09-15
---

# Recon 1.1.2 follow-up feedback

## Scope and exclusions

- In scope: the seven claims under "Still open" in the operator's 2026-09-14
  Cursor report, verified against the canonical OAT repository after PR #285.
- Excluded: items the report marks addressed; the private downstream repository
  and its evidence packet; new public GitHub issues; Cursor product changes
  outside OAT's repository.
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

The user approved all seven repository-owned rows on 2026-09-14 for direct
implementation through the Lite project
`.oat/projects/shared/recon-1-1-2-follow-ups`. No consolidated backlog item or
public GitHub issue is required. Existing backlog references remain context,
not owners of this implementation.

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
- Accepted disposition: require every Cursor recon leaf to launch in the
  background while keeping provider launch grammar in the provider mechanics.
- Priority and size rationale: recurring interruption risk with an existing
  documented workaround; small alone, but part of the consolidated reliability
  contract.
- Approval: approved by user on 2026-09-14 for the Lite project.
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
- Accepted disposition: a valid artifact at the approved path takes precedence
  over a later stream-close error; record the provider diagnostic and do not
  relaunch. `BL-260906-harden-dispatch-launch` remains related context only.
- Priority and size rationale: a real host error can discard expensive valid
  work or tempt an unsafe duplicate launch; targeted controller/test change.
- Approval: approved by user on 2026-09-14 for the Lite project.
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
- Accepted disposition: centralize a realpath-based ESM-main predicate and add
  canonical-plus-symlink subprocess controls for the six executables, including
  the controller reconciliation CLI.
- Priority and size rationale: silent success is misleading and mechanically
  reproducible; implementation is small, with the main burden in regression
  coverage.
- Approval: approved by user on 2026-09-14 for the Lite project.
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
- Accepted disposition: state and test that a materialized role file is not live
  Task-catalog evidence, retain the generic fallback, and do not claim Cursor
  Task exposure. `BL-260719-add-pinned-recon-agents` remains context only.
- Priority and size rationale: OAT behavior is already fail-closed; this is
  clarity against a repeatedly confusing provider boundary.
- Approval: approved by user on 2026-09-14 for the Lite project.
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
- Accepted disposition: require a contiguous exact excerpt, with a narrowly
  recorded source-required redaction exception, and add a compile-stage negative
  control. Locator-repair revisions remain deliberately out of scope.
- Priority and size rationale: current packets already fail closed; reducing
  avoidable failed runs is medium-value, while repair is intentionally deferred.
- Approval: approved by user on 2026-09-14 for the Lite project.
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
- Accepted disposition: add compact closed examples for every review kind,
  enforce string-only unresolved issues, and require each worker to self-validate
  once within the same accepted task. An invalid accepted artifact is terminal;
  no controller schema-retry semantics are added.
- Priority and size rationale: invalid artifacts occurred in a real run, and the
  advertised retry budget currently has no usable meaning after acceptance;
  contract and negative-control work make this medium-sized.
- Approval: approved by user on 2026-09-14 for the Lite project.
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
- Accepted disposition: reconciliation is controller-owned and deterministic.
  The manifest binds its input ledger, candidate-ledger output, reconciliation
  review output, review set, and literal producer. The controller validates both
  outputs and atomically promotes only the candidate ledger to `claims.json`;
  missing, swapped, tampered, and valid-promotion controls are required.
- Priority and size rationale: this is an assurance-bearing ownership ambiguity
  that made the real run easy to invert; localized but cross-schema.
- Approval: approved by user on 2026-09-14 for the Lite project.
- Post-merge result: pending.

## Open concerns

- Controller schema retry is deliberately deferred. Workers self-validate once
  in their accepted task, and an invalid accepted artifact is terminal.
- A locator-repair revision is not included in the proposed item. Any future
  design must preserve evidence identity and distinguish correction from
  invented or silently replaced evidence.
- Cursor Task-type exposure remains provider-owned. OAT can document and test
  the live-catalog gate but cannot promise the canonical role is launchable.
- `BL-260908-restore-recon-s-cheap-fan-out` is still open even though PR #285 is
  merged and issue #274 is closed; backlog lifecycle cleanup is adjacent drift,
  not part of this feedback item.

## Resume instructions

Implementation is owned by the approved Lite project. Complete its independent
review and normal merge workflow; do not create a consolidated backlog item or
mutate GitHub issues from this triage record.
