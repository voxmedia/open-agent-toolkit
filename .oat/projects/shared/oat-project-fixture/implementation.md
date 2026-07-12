---
oat_status: in_progress
oat_ready_for: null
oat_blockers: []
oat_last_updated: 2026-07-11
oat_current_task_id: p03-t03
oat_generated: false
---

# Implementation: oat-project-fixture

**Started:** 2026-07-11
**Last Updated:** 2026-07-11

## Gate Feedback Log (quick-start plan gate, `onFailure: block`, maxAttempts exhausted)

- **Run 1** (`262c4812`, codex-5-6-sol-max): killed at the 600 s fixed timeout
  while the nested managed reviewer was actively working; no artifact; work
  lost. Spawned `BL-260711-add-activity-aware-gate`. Not counted as a
  remediation attempt (operational failure).
- **Attempt 1** (`2904d24d`, 20-min override): blocked — 2 Important
  (non-deterministic unavailable-target control; `node --test <dir>` invalid
  under Node 22) + 2 Medium (unbounded conditional fix clauses; missing exact
  live-task commands). All four fixed in plan; row set `fixes_completed`.
- **Attempt 2** (`7c142d9e`, merged 15-min default): prior fixes verified
  clean; blocked on 3 new Important (preflight lacks authenticated-readiness
  probes; Codex live task lacks `report.mjs --check` acceptance commands;
  p06-t01 hand-authors project docs instead of invoking
  `oat-project-document` per `apps/oat-docs/AGENTS.md`) + 1 Medium
  (p06-t03 conditional re-verification evidence outside declared file/commit
  scope). Artifact: `reviews/artifact-plan-review-2026-07-11T170953Z.md`.
- **Escalated to user 2026-07-11** with accumulated feedback per gate
  contract.
- **User decision 2026-07-11:** apply all attempt-2 fixes, skip further gate
  runs; plan accepted with fixes recorded. Docs-workflow nuance recorded: the
  `oat-project-document` flow is default guidance, not a hard prohibition —
  an explicit doc-authoring task is sanctioned when documentation is central
  to project scope (as here), provided the skill's guidance is generally
  followed. Core requirement reaffirmed: the smoke process must be documented
  well enough that future workflow changes have a clear testing process and
  fixture-update path (dedicated runbook is a named p06-t01 deliverable).

## Cross-Harness Dispatch Capability Verification

- Fresh canonical combined-capability packets are complete for Codex, Claude,
  Cursor IDE, and Cursor CLI under
  `references/dispatching-subagents/verification/runs/`.
- Shared `claims.md` and `protocol.md` input hashes matched across the four
  canonical runs; each run recorded its provider-draft hash and provenance.
- Codex, Claude, and Cursor IDE confirmed their required capability claim sets.
  Cursor CLI confirmed the exact CLI route and retained five native-topology
  claims as inconclusive after the one native connection closed mid-flight.
- Verified provider-neutral guidance now lives in
  `references/dispatching-subagents/contract.md`; provider qualifications and
  the promotion matrix live beside it. Flat drafts and run packets remain
  frozen inputs.
- This verification resolves the external precondition for Phase 2
  self-review. It does not advance `oat_current_task_id` or complete a planned
  implementation task.

> This document is used to resume interrupted implementation sessions.
>
> Conventions:
>
> - `oat_current_task_id` always points at the **next plan task to do** (not the last completed task).
> - When all plan tasks are complete, set `oat_current_task_id: null`.
> - Reviews are **not** plan tasks. Track review status in `plan.md` under `## Reviews` (e.g., `| final | code | passed | ... |`).
> - Keep phase/task statuses consistent with the Progress Overview table so restarts resume correctly.
> - Before running the `oat-project-pr-final` skill, ensure `## Final Summary (for PR/docs)` is filled with what was actually implemented.

## Progress Overview

| Phase   | Status      | Tasks | Completed |
| ------- | ----------- | ----- | --------- |
| Phase 1 | complete    | 3     | 3/3       |
| Phase 2 | in_progress | 5     | 5/5       |
| Phase 3 | in_progress | 3     | 2/3       |
| Phase 4 | pending     | 3     | 0/3       |
| Phase 5 | pending     | 6     | 0/6       |
| Phase 6 | pending     | 3     | 0/3       |

**Total:** 10/23 tasks completed

---

## Phase 1: Fixture Project Template

**Status:** complete
**Started:** 2026-07-11
**Completed:** 2026-07-11

### Phase Summary (fill when phase is complete)

**Outcome (what changed):**

- Added a deterministic three-phase, nine-task quick-mode project fixture with
  parallel p01/p02 work and p03 fan-in.
- Added reversible pre-review and implementation-ready state presets.
- Added structural integrity and format contracts for stable task IDs, review
  rows, dispatch policy, and task write boundaries.

**Key files touched:**

- `tools/smoke/fixture/project/` - canonical project artifacts.
- `tools/smoke/fixture/presets/` - reversible scenario state overlays.
- `tools/smoke/fixture/*.test.mjs` - integrity and format contracts.
- `tools/smoke/CONTRACT.md` - runner/evidence exchange contract.

**Verification:**

- Run: `node --test 'tools/smoke/fixture/**/*.test.mjs'`
- Run: `pnpm lint && pnpm format`
- Result: 10/10 fixture tests pass, including resolver-backed provider cases;
  lint and formatting pass.

**Notes / Decisions:**

- Root-owned exact task dispatch was used after Cursor nested catalogs exposed
  no eligible configured worker. This temporary topology is user-authorized
  and preserved as dispatch evidence.
- Root integration verification caught whitespace-fragile contract assertions
  after p01-t03; one bounded fix worker stabilized the tests.

### Task p01-t01: Scaffold the fixture project template

**Status:** completed
**Commit:** 35bfc3b6bc890b5301ea2148b724493b529d2ac7

**Outcome (required when completed):**

- Added a deterministic quick-mode fixture with three phases, three tasks per
  phase, disjoint log targets, and stable task IDs.
- Defined the runner/evidence interface in `tools/smoke/CONTRACT.md`.

**Files changed:**

- `tools/smoke/fixture/project/` - complete project artifact fixture.
- `tools/smoke/fixture/workspace/logs/` - phase-local deterministic work
  targets.
- `tools/smoke/fixture/fixture-integrity.test.mjs` - fixture structure and
  task-boundary contract.
- `tools/smoke/CONTRACT.md` - provisioning and evidence exchange contract.

**Verification:**

- Run: `node --test tools/smoke/fixture/fixture-integrity.test.mjs`
- Run: `pnpm lint`
- Run: `pnpm format`
- Result: all passed.

**Notes / Decisions:**

- Native nested dispatch rejected the configured Terra candidate before
  launch. The coordinator deliberately selected the exact Cursor CLI target
  before task execution.
- `selection_reason=pre-start-rejection`;
  `candidates_considered=[gpt-5.6-terra-medium,composer-2.5-fast]`.
- Dispatch stamp: `Dispatch: scope=p01-t01 action=implementation role=implementer producer=gpt-5.6-terra-medium provenance=declared model_axis=selected:gpt-5.6-terra-medium effort_axis=not-applicable dispatch_policy=high dispatch_ceiling=gpt-5.6-sol-high-fast target=cursor-cli:gpt-5.6-terra-medium`.

**Issues Encountered:**

- The coordinator's nested native catalog exposed only
  `composer-2.5-fast`, which is not an eligible configured candidate. The
  project-sanctioned pre-start CLI route resolved the mismatch.

---

### Task p01-t02: Fixture state presets

**Status:** completed
**Commit:** 36933c44265a116f8cb5c03431f50af8308e9db2

**Notes:**

- Exact Cursor CLI task launch with `gpt-5.6-terra-medium` was accepted and
  ran for approximately 710 seconds before user interruption.
- The user explicitly authorized root-owned task orchestration. A native root
  recovery worker pinned to the same exact Terra target completed the preserved
  partial files and committed them. This was recorded as
  `operator-authorized-recovery`, not automatic fallback.
- The native recovery connection was torn down after the worker committed.
  Root verification confirmed the expected commit, exact four-file boundary,
  clean worktree, and passing focused test.
- Dispatch stamp: `Dispatch: scope=p01-t02 action=implementation role=implementer producer=gpt-5.6-terra-medium provenance=declared model_axis=selected:gpt-5.6-terra-medium effort_axis=not-applicable dispatch_policy=high dispatch_ceiling=gpt-5.6-sol-high-fast target=cursor-cli:gpt-5.6-terra-medium`.
- Recovery dispatch stamp: `Dispatch: scope=p01-t02 action=implementation role=implementer producer=gpt-5.6-terra-medium provenance=declared model_axis=selected:gpt-5.6-terra-medium effort_axis=not-applicable dispatch_policy=high dispatch_ceiling=gpt-5.6-sol-xhigh target=cursor-native:gpt-5.6-terra-medium`.

**Outcome:**

- Added canonical `pre-review` and `implementation-ready` state overlays plus a
  pure applier with a small CLI.
- Unknown presets fail closed without modifying the fixture copy.

**Verification:**

- `node --test tools/smoke/fixture/presets/apply-preset.test.mjs` — 3/3 passed
  under independent root verification.
- Commit boundary: exactly the four planned preset files.

---

### Task p01-t03: Fixture format contract test

**Status:** completed
**Commits:**

- `3dd7716460ae40e954d4f7096fdeab8656e46478` — contract test and fixture gaps.
- `1963c70b63fc58305c29f5a299c73b597e6b57dd` — integration-verification fix.

**Outcome:**

- Fixture review rows and dispatch-policy state are validated structurally.
- Tests tolerate Markdown padding while preserving exact preset inversion.

**Verification:**

- `node --test 'tools/smoke/fixture/**/*.test.mjs'` — 10/10 passed after review
  fixes.
- `pnpm lint && pnpm format` — passed.

**Dispatch:**

- Implementation: `Dispatch: scope=p01-t03 action=implementation role=implementer producer=gpt-5.6-terra-medium provenance=declared model_axis=selected:gpt-5.6-terra-medium effort_axis=not-applicable dispatch_policy=high dispatch_ceiling=gpt-5.6-sol-xhigh target=cursor-native:gpt-5.6-terra-medium`.
- Fix: `Dispatch: scope=p01-t03 action=fix role=fix producer=gpt-5.6-terra-medium provenance=declared model_axis=selected:gpt-5.6-terra-medium effort_axis=not-applicable dispatch_policy=high dispatch_ceiling=gpt-5.6-sol-xhigh target=cursor-native:gpt-5.6-terra-medium`.

### Phase 1 Self-Review — Fix Iteration 1

**Reviewer:** native root Task, `gpt-5.6-sol-xhigh`

**Verdict:** fail — 0 Critical, 3 Important, 2 Medium, 0 Minor.

**Blocking scopes:**

- Fixture lifecycle metadata, local dispatch matrix, runnable task scopes, and
  canonical review table.
- Preset coverage for state plus atomic multi-artifact writes and rollback.

**Advisory scope included in fixes:**

- Align byte-stable fixture logs with launcher-owned target evidence.

**Review dispatch:** `Dispatch: scope=p01 action=review role=reviewer producer=gpt-5.6-sol-xhigh provenance=declared model_axis=selected:gpt-5.6-sol-xhigh effort_axis=not-applicable dispatch_policy=high dispatch_ceiling=gpt-5.6-sol-xhigh target=cursor-native:gpt-5.6-sol-xhigh`.

**Fix 1A — canonical fixture lifecycle contract:**

- Commit: `2005e625b57b661ba7b7d2e005e3d52e205986d7`
- Added quick lifecycle state, sparse provider matrices, canonical task/review
  contracts, and byte-stable log semantics.
- Focused integrity/format tests plus lint/format pass.
- Dispatch: `Dispatch: scope=p01-t01 action=fix role=fix producer=gpt-5.6-terra-medium provenance=declared model_axis=selected:gpt-5.6-terra-medium effort_axis=not-applicable dispatch_policy=high dispatch_ceiling=gpt-5.6-sol-xhigh target=cursor-native:gpt-5.6-terra-medium`.

**Fix 1B — state-complete atomic presets:**

- Commit: `939aae6d3b8ea935c774bd97313d952c1f817608`
- Presets now cover state, plan, and implementation coherently; staged
  publishing rolls every artifact back after an injected later-write failure.
- Full fixture suite passes 9/9 before and after formatting.
- The first scope packet omitted `task_id`; the same accepted child was resumed
  with `task_id=p01-t02` rather than launching a replacement.
- Dispatch: `Dispatch: scope=p01-t02 action=fix role=fix producer=gpt-5.6-terra-medium provenance=declared model_axis=selected:gpt-5.6-terra-medium effort_axis=not-applicable dispatch_policy=high dispatch_ceiling=gpt-5.6-sol-xhigh target=cursor-native:gpt-5.6-terra-medium`.

### Phase 1 Re-Review — Fix Iteration 2

**Reviewer:** native root Task, `gpt-5.6-sol-xhigh`

**Verdict:** fail — 0 Critical, 1 Important, 0 Medium, 0 Minor.

All iteration-1 lifecycle, task, review, log, preset, and rollback findings are
fixed. The remaining blocker is dispatch semantics: lower candidates were
placed inside the High cell, making them ceiling targets and violating Codex's
nondecreasing tier rule. Iteration 2 moves candidates into monotonic tier cells
and adds resolver-backed coverage.

**Review dispatch:** `Dispatch: scope=p01 action=review role=reviewer producer=gpt-5.6-sol-xhigh provenance=declared model_axis=selected:gpt-5.6-sol-xhigh effort_axis=not-applicable dispatch_policy=high dispatch_ceiling=gpt-5.6-sol-xhigh target=cursor-native:gpt-5.6-sol-xhigh`.

**Fix 2 — monotonic dispatch tiers:**

- Commit: `f611c31deb4571dfaddd68de33fee7eda17fec46`
- Lower candidates now occupy lower named tiers while each provider retains a
  valid High ceiling target.
- Resolver-backed tests prove exact lower selection under High for Codex,
  Claude, and Cursor with `source=invocation`.
- Full fixture suite passes 10/10.
- Dispatch: `Dispatch: scope=p01-t01 action=fix role=fix producer=gpt-5.6-sol-xhigh provenance=declared model_axis=selected:gpt-5.6-sol-xhigh effort_axis=not-applicable dispatch_policy=high dispatch_ceiling=gpt-5.6-sol-xhigh target=cursor-native:gpt-5.6-sol-xhigh`.

### Phase 1 Final Self-Review

**Verdict:** pass — 0 Critical, 0 Important, 1 Medium, 1 Minor.

All prior blocking findings are fixed. Before the external gate, a
non-substantive cleanup will directly format/lint the four smoke MJS files. The
root scripts do not currently include that path. The stale state summary is
corrected in this bookkeeping update.

**Review dispatch:** `Dispatch: scope=p01 action=review role=reviewer producer=gpt-5.6-sol-xhigh provenance=declared model_axis=selected:gpt-5.6-sol-xhigh effort_axis=not-applicable dispatch_policy=high dispatch_ceiling=gpt-5.6-sol-xhigh target=cursor-native:gpt-5.6-sol-xhigh`.

**Advisory cleanup:**

- Commit: `3e2d034f47fa17f2d769198e5c61f4b7bdf8579c`
- Direct `oxlint` and `oxfmt` now pass for all smoke MJS files; caught errors
  preserve their causes.
- Fixture suite remains 10/10.
- Dispatch: `Dispatch: scope=p01-t03 action=fix role=fix producer=gpt-5.6-terra-medium provenance=declared model_axis=selected:gpt-5.6-terra-medium effort_axis=not-applicable dispatch_policy=high dispatch_ceiling=gpt-5.6-sol-xhigh target=cursor-native:gpt-5.6-terra-medium`.

### Phase 1 External Gate — Received

**Artifact:** `reviews/archived/p01-review-2026-07-11T200543Z.md`

**Verdict:** pass — 0 Critical, 0 Important, 2 Medium, 0 Minor.

**Finding dispositions:**

- `M1` implementation-ready template markers — **addressed now** in
  `af996964f3723477ec65f03bd6dfdbf9bc3dd5bb`. State and implementation
  artifacts now clear `oat_template`; the local project-status assertion
  confirms implementation routing with non-template artifacts.
- `M2` normal repository/CI enrollment — **deferred to final**. The smoke
  surface expands through p02–p05; enrolling it once after those files exist
  avoids repeatedly changing root verification scripts while preserving one
  complete CI contract. Trigger: before the final review, wire all smoke tests
  and direct smoke lint/format checks into normal root verification.

**Gate dispatch:** `Dispatch: scope=p01 action=review role=reviewer producer=unknown provenance=unknown model_axis=selected:gpt-5.6-sol effort_axis=selected:max dispatch_policy=high dispatch_ceiling=high target=codex-5-6-sol-max`.

**Fix dispatch:** `Dispatch: scope=p01-t02 action=fix role=fix producer=gpt-5.6-terra-medium provenance=declared model_axis=selected:gpt-5.6-terra-medium effort_axis=not-applicable dispatch_policy=high dispatch_ceiling=gpt-5.6-sol-xhigh target=cursor-native:gpt-5.6-terra-medium`.

## Deferred Findings (Medium)

- `p01-M2`: Enroll the complete `tools/smoke` test, lint, and format surface in
  normal repository/CI verification after p05 and before final review.

---

## Phase 2: Smoke Runner Core

**Status:** in_progress
**Started:** 2026-07-11

### Task p02-t01: Runner skeleton and argument contract

**Status:** completed
**Commit:** 4d43b045cd112e3ed7846d9049ad7695ac0ab300

**Outcome:**

- Added fail-closed parsing for harness, scenario, stage, dry-run, and keep
  options.
- Added an injectable staged runner skeleton without prematurely implementing
  later phase handlers.

**Verification:**

- `node --test tools/smoke/runner/args.test.mjs` — passed.
- Full smoke suite — 17/17 passed.
- Direct smoke-runner lint/format — passed.

**Notes:**

- A concurrent session advanced HEAD with the non-overlapping dispatch
  verification workspace. The accepted worker returned `BLOCKED` before
  commit, then the same child session was resumed against the verified new
  baseline and committed exactly its three-file boundary.
- Dispatch: `Dispatch: scope=p02-t01 action=implementation role=implementer producer=gpt-5.6-terra-medium provenance=declared model_axis=selected:gpt-5.6-terra-medium effort_axis=not-applicable dispatch_policy=high dispatch_ceiling=gpt-5.6-sol-xhigh target=cursor-native:gpt-5.6-terra-medium`.

---

### Task p02-t02: Preflight module

**Status:** completed
**Commit:** d1361817c548a45ff3c2037ecb1597172ba47310

**Outcome:**

- Added separate installation/authentication readiness for all four harnesses,
  stale local/global OAT detection, fixture integrity checks, and deterministic
  forced-unavailable controls.
- Preflight fails before later stages and emits deterministic secret-free
  human/JSON reports.

**Verification:**

- Focused preflight tests — 9/9 passed.
- Full smoke suite — 26/26 passed.
- Direct runner lint/format — passed.

**Notes:**

- Concurrent verification edits under
  `references/dispatching-subagents/verification/` were preserved outside the
  task commit.
- Dispatch: `Dispatch: scope=p02-t02 action=implementation role=implementer producer=gpt-5.6-terra-medium provenance=declared model_axis=selected:gpt-5.6-terra-medium effort_axis=not-applicable dispatch_policy=high dispatch_ceiling=gpt-5.6-sol-xhigh target=cursor-native:gpt-5.6-terra-medium`.

---

### Task p02-t03: Provisioning with manifest and isolated config

**Status:** completed
**Commit:** 153bc07a6a6be223ea27061d9c87e5ad5add0457

**Outcome:**

- Added disposable worktree provisioning with flat collision-resistant branch
  names, isolated local config, scenario presets, and complete manifests.
- Recorded harness-specific writable roots and partial-failure state for safe
  cleanup.

**Verification:**

- Focused provisioning tests — 3/3 passed.
- Full smoke suite — 29/29 passed.
- Direct runner lint/format — passed.
- No test worktree or branch orphans remained.

**Dispatch:** `Dispatch: scope=p02-t03 action=implementation role=implementer producer=gpt-5.6-terra-medium provenance=declared model_axis=selected:gpt-5.6-terra-medium effort_axis=not-applicable dispatch_policy=high dispatch_ceiling=gpt-5.6-sol-xhigh target=cursor-native:gpt-5.6-terra-medium`.

---

### Task p02-t04: Cleanup and dry-run isolation proof

**Status:** completed
**Commit:** e7b14cccef453991909eacb5134011cd082e1464

**Outcome:**

- Added manifest-only cleanup with containment checks, idempotence, partial
  recovery, and safe Git worktree/branch ordering.
- Added full dry-run isolation plus SIGTERM recovery during provision and
  drive.

**Verification:**

- Focused cleanup tests — 7/7 passed.
- Complete runner suite — 26/26 passed.
- Full smoke suite — 36/36 passed.
- Direct runner lint/format — passed; no smoke worktree/branch orphans.

**Dispatch:** `Dispatch: scope=p02-t04 action=implementation role=implementer producer=gpt-5.6-sol-xhigh provenance=declared model_axis=selected:gpt-5.6-sol-xhigh effort_axis=not-applicable dispatch_policy=high dispatch_ceiling=gpt-5.6-sol-xhigh target=cursor-native:gpt-5.6-sol-xhigh`.

### Task p02-t05: Isolate approval-aware closeout configuration

**Status:** completed
**Commit:** a5499b70f2e346e924b4c498c91625ea08bd5348

**Outcome:**

- Added an immutable empty structured closeout policy to disposable local
  config and the provisioning manifest.
- Repository-local config resolution proves the local value atomically
  replaces main's summary/document/PR default.
- Disposable runs retain final approval ordering without any eligible external
  closeout child.

**Verification:**

- Focused provisioning tests — 3/3 passed.
- Complete runner suite — 26/26 passed.
- Full smoke suite — 36/36 passed.
- Direct runner/contract lint and format — passed.

**Dispatch:** `Dispatch: scope=p02-t05 action=implementation role=implementer producer=gpt-5.6-terra-medium provenance=declared model_axis=selected:gpt-5.6-terra-medium effort_axis=not-applicable dispatch_policy=high dispatch_ceiling=gpt-5.6-sol-xhigh target=cursor-native:gpt-5.6-terra-medium`.

### Phase 2 Summary

**Outcome:**

- Implemented the staged smoke-runner shell from argument parsing through
  preflight, isolated provisioning, dry-run orchestration, and cleanup.
- Failures before and during execution preserve deterministic evidence and
  clean only manifest-owned resources.

**Key files:**

- `tools/smoke/runner/run-smoke.mjs` — staged orchestration and signal handling.
- `tools/smoke/runner/preflight.mjs` — runtime/auth/local-build readiness.
- `tools/smoke/runner/provision.mjs` — isolated worktree/config/manifest setup.
- `tools/smoke/runner/cleanup.mjs` — bounded cleanup and recovery.

**Phase verification:**

- `node --test 'tools/smoke/runner/**/*.test.mjs'` — 26/26 passed.
- Direct runner oxlint/oxfmt — passed.
- Worktree inspection — no smoke test orphans.

**Pre-review verification pause:**

- User requested a stable HEAD before Phase 2 self-review to run fresh
  subagent-verification sessions.
- Protocol v2, canned harness prompts, and Claude/Codex pilot packets were
  stabilized in `7fdb7a8f445aa39185144b5ac46a23339a5847f0`.
- The shared draft now states explicitly that a below-ceiling Cursor phase
  coordinator whose nested catalog lacks the ceiling reviewer must make a
  recorded pre-start CLI reviewer selection.
- Fresh canonical verification was synthesized in `2a45ea93`, then main was
  merged as `9e93aeca` without conflicts so every verification provenance
  commit remains an ancestor.
- Phase 2 self-review remained paused until p02-t05 isolated the merged
  approval-aware closeout configuration.
- p02-t05 completed that isolation with repository-local atomic-resolution
  evidence; Phase 2 is ready for self-review.

**Self-review iteration 1:**

- Reviewer target:
  `gpt-5.6-sol-xhigh` at the project High ceiling.
- Verdict: failed — 1 Critical / 6 Important / 3 Medium.
- C1: the copied fixture/workspace are untracked, so nested phase worktrees do
  not inherit the smoke baseline.
- I1/I2: drive failure skips collection; signal cleanup races active stages and
  non-atomic manifest writes.
- I3/I4: Cursor IDE auth uses the wrong command surface; fixture preflight
  checks existence rather than actual contract validity.
- I5/I6: normal worktree bootstrap can replace smoke-local config and perform
  hidden writes; cleanup can delete a pre-existing colliding branch.
- M1/M2/M3: invalid forced-unavailable values are ignored, local build
  freshness is not proven, and partial manifests claim an effective closeout
  policy before resolution.
- Fix iteration 1 is split into bounded provision/ownership,
  runner/interruption, preflight, and nested-bootstrap scopes.

**Fix iteration 1 completed:**

- `d6a8b914` — committed child-worktree-visible fixture baseline; added
  atomic/readiness-aware manifests and SHA-corroborated branch ownership.
- `f40e672a` — recovery collection now follows failed/interrupted drive;
  cancellation quiesces registered children/stages before cleanup and
  preserves resources when quiescence cannot be proved.
- `7f81e26a` — corrected Cursor auth argv, authenticated only the selected
  harness, ran real fixture contracts, rejected invalid negative controls, and
  made local-build identity/freshness evidence executable.
- `7b7c3f8e` — added a tracked smoke-bootstrap marker and strict nested mode
  preserving smoke config while skipping user state, hooks, S3, local-path
  sync, and provider sync; dependency setup is offline/frozen.
- Independent verification: 49/49 tests, direct lint/format, shell syntax, and
  orphan inspection passed.
- Self-review iteration 2 failed — 1 Critical / 5 Important / 0 Medium.
- C1: cleanup binds ownership to the baseline tip, so legitimate lifecycle
  commits block cleanup; nested worktrees/branches need an atomic ownership
  journal.
- I1/I2: a signal already observed during preflight does not block prepare;
  fixture preflight still omits preset/inverse/dispatch contracts.
- I3/I4: the canonical bootstrap skill runs local/provider sync outside the
  hardened script; disposable worktree creation/baseline commit can execute
  shared repository hooks.
- I5: the local build probe stopped comparing PATH `oat` with the validated
  repository binary.
- Fix iteration 2 is the final configured retry and covers these six findings.

**Fix iteration 2 completed:**

- `14602843` — cancellation now blocks later normal stages; preflight executes
  the real fixture contracts and requires PATH `oat` to equal the executable,
  current repository build.
- `5f8106a1` — cleanup accepts marker-bound descendant lifecycle tips; a
  concurrency-safe manifest journal records nested worktrees/branches; scoped
  hook suppression prevents hidden checkout/commit effects.
- `5e9193f4` — canonical autonomous bootstrap detects smoke mode before
  worktree creation, skips local/provider sync and sync commits, uses the
  smoke-safe init path, and reports containment failures as fatal.
- Independent verification: 56/56 smoke tests, 82/82 skill/closeout contract
  tests, repository lint/format, and orphan inspection passed.
- Final Phase 2 self-review failed — 0 Critical / 1 Important / 0 Medium.
- Every iteration-2 target was verified fixed. The sole new finding is
  pre-baseline recovery: a durable manifest published after worktree creation
  has `baselineCommitSha: null`, but cleanup currently requires a completed
  baseline ownership record.
- The default retry limit of two is exhausted. Sequential execution is paused
  for a human decision on one narrow additional retry.

**User-authorized terminal fix:**

- User decision: apply the sole pre-baseline cleanup fix and skip another
  self-review; retain the independent external phase gate.
- `c8aebc68` — cleanup now safely handles path-only and exact-source
  pre-baseline ownership while refusing any pre-baseline branch advance.
- Direct acceptance: 60/60 smoke/bootstrap tests, including actual failures at
  worktree add, fixture copy, and baseline commit; direct lint/format passed.
- Phase 2 self-review requirement is recorded as user-waived after the bounded
  fix.

### Review Received: p02

**Date:** 2026-07-11
**Review artifact:** `reviews/archived/p02-review-2026-07-12T000418Z.md`

**Findings:**

- Critical: 0
- Important: 0
- Medium: 0
- Minor: 2

**Judgment-sweep dispositions:**

- `m1` rejected with rationale — the parent-relative imports are in standalone
  `.mjs` tooling with no configured alias infrastructure; changing module
  layout or adding an alias solely for convention compliance would add churn
  without functional benefit. Revisit if `tools/smoke` becomes a package with
  supported aliases.
- `m2` addressed now — normalized the runner entrypoint path to match the
  sibling journal CLI pattern in `9ba2ab03`; focused tests and lint/format
  passed.

**Gate result:** passed 0C/0I/0M/2m. Gate run
`38677f6b-b860-4e80-8bb1-cea5e8b702ee`; cross-family reviewer
`claude-fable-skip-permissions`.

---

## Phase 3: Evidence Collector & Report

**Status:** in_progress
**Started:** 2026-07-11

### Task p03-t01: Evidence collection module

**Status:** completed
**Commit:** 114d7660

**Outcome:**

- Added strict collector CLI and deterministic normalized bundle output.
- Kept configured invocation and runtime-observed identity as separate evidence
  layers, using `not-reported` rather than inference.
- Collected gate corroboration, fixture logs, orchestration events, and
  branch/worktree/commit topology from golden and real-shaped inputs.
- Output survives cleanup outside the disposable worktree and is atomically
  published.

**Verification:**

- Collector tests — 3/3 passed.
- Complete smoke/bootstrap suite — 63/63 passed.
- Direct evidence lint/format and diff checks — passed.

**Execution deviation:** Per user direction, remaining implementation tasks run
directly in the root thread. Subagents remain allowed only for phase
self-review; independent external gates remain enabled.

---

### Task p03-t02: Assertion engine and report emitters

**Status:** completed
**Commit:** a9b36e6c

**Outcome:**

- Added scenario-aware `plan-review`, `implement`, and deduplicated `full`
  assertion profiles.
- Added deterministic JSON/Markdown report emitters and executable
  `report.mjs --check` pass/fail semantics.
- Golden bundles cover plan stability, atomic transitions, dispatch
  completeness/ceiling selection, isolation, fan-in, gate corroboration, and
  explicit runtime identity status.

**Verification:**

- Evidence collector/assertion/report tests — 10/10 passed.
- Direct evidence lint/format and diff checks — passed.

---

### Task p03-t03: Negative-control assertions

**Status:** pending
**Commit:** -

---

## Phase 4: Orchestration Contract

**Status:** pending
**Started:** -

### Task p04-t01: Coordinator selection contract in workflow skills

**Status:** pending
**Commit:** -

---

### Task p04-t02: Cursor and Claude native topology guidance

**Status:** pending
**Commit:** -

---

### Task p04-t03: Selection-record fields for dispatch evidence

**Status:** pending
**Commit:** -

---

## Phase 5: Harness Protocols & Live Smoke Evidence

**Status:** pending
**Started:** -

### Task p05-t01: Per-harness drive protocols and runner wiring

**Status:** pending
**Commit:** -

---

### Task p05-t02: Codex live smoke runs

**Status:** pending
**Commit:** -

---

### Task p05-t03: Claude live smoke runs

**Status:** pending
**Commit:** -

---

### Task p05-t04: Cursor IDE live smoke runs

**Status:** pending
**Commit:** -

---

### Task p05-t05: Cursor CLI live smoke runs

**Status:** pending
**Commit:** -

---

### Task p05-t06: Live negative controls and cross-harness evidence summary

**Status:** pending
**Commit:** -

---

## Phase 6: Documentation, Vault Capture & Release

**Status:** pending
**Started:** -

### Task p06-t01: OAT docs and smoke runbook

**Status:** pending
**Commit:** -

---

### Task p06-t02: Vault closing capture pass

**Status:** pending
**Commit:** -

---

### Task p06-t03: Release validation

**Status:** pending
**Commit:** -

---

## Orchestration Runs

_Each run from `oat-project-implement` appends an entry below with:_
_- Run header (number, timestamp, branch, tier, policy, phase counts)_
_- Phase Outcomes table_
_- Parallel Groups list_
_- Outstanding Items_

<!-- orchestration-runs-start -->

_Orchestration runs from `oat-project-implement` are appended here, most-recent-first within the file but append-only at the bottom of the log._

<!-- orchestration-runs-end -->

---

## Implementation Log

Chronological log of implementation progress.

### 2026-07-11

**Session Start:** 13:11 CDT

- [x] p01-t01: Scaffold the fixture project template -
      `35bfc3b6bc890b5301ea2148b724493b529d2ac7`
- [ ] p01-t02: Fixture state presets - interrupted after accepted child launch

**What changed (high level):**

- Shipped the deterministic fixture project and runner/evidence contract.
- Reproduced native-catalog drift at both root and nested dispatch boundaries.
- Drafted the shared subagent-dispatch contract and provider verification
  package so Codex and Claude can validate their harnesses concurrently.

**Decisions:**

- Used a recorded pre-start Cursor CLI selection for p01-t01 after the native
  nested catalog rejected the exact configured candidate.
- Preserved p01-t02 partial output after user interruption; no replacement
  worker or fallback was launched.
- P04 will refine and promote verified draft material into a dedicated
  internal `oat-dispatch-subagents` skill rather than authoring provider
  contracts independently inside each lifecycle skill.

**Follow-ups / TODO:**

- Decide how to resume p01-t02 without violating the accepted-launch terminal
  outcome.
- Decide whether this project should continue under the current root/nested
  catalog topology or restart under a runtime exposing the expected native
  catalog.

**Blockers:**

- Implementation intentionally paused for user discussion; no technical
  process remains active.

**Session End:** 13:29 CDT

---

### 2026-07-11

**Session Start:** {time}

{Continue log...}

---

## Deviations from Plan / Design

Document any intentional deviations from the original plan, spec, or design. Include accepted review findings where the shipped implementation is source of truth and a lifecycle artifact needs alignment.

| Task / Review   | Source Artifact                        | Planned / Documented                                                                        | Actual / Accepted                                                                                                                                   | Reason                                                                                                                                              | Source of Truth                                               | Follow-up                                                                  |
| --------------- | -------------------------------------- | ------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------- | -------------------------------------------------------------------------- |
| p04 preparation | `design.md` Component 5; `plan.md` p04 | Author dispatch language directly in implementation and phase-coordinator skills during p04 | Draft provider-neutral and harness contracts during p01; p04 promotes verified material into a shared internal skill with explicit consumer loading | Concurrent Codex/Claude verification can run while Cursor implementation continues, and one canonical progressive-disclosure contract reduces drift | Updated `design.md`, `plan.md`, and dispatch draft references | Collect harness reports before p04; retain unsupported/inconclusive claims |

## Test Results

Track test execution during implementation.

| Phase | Tests Run | Passed | Failed | Coverage |
| ----- | --------- | ------ | ------ | -------- |
| 1     | -         | -      | -      | -        |
| 2     | -         | -      | -      | -        |

## Final Summary (for PR/docs)

**What shipped:**

- {capability 1}
- {capability 2}

**Behavioral changes (user-facing):**

- {bullet}

**Key files / modules:**

- `{path}` - {purpose}

**Verification performed:**

- {tests/lint/typecheck/build/manual steps}

**Design deltas (if any):**

- {what changed vs design.md and why}

## References

- Plan: `plan.md`
- Design: `design.md`
- Spec: `spec.md`
