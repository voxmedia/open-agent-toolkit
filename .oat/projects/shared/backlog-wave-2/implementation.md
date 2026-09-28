---
oat_status: in_progress
oat_ready_for: null
oat_blockers: []
oat_last_updated: 2026-09-27
oat_current_task_id: null
oat_generated: false
---

# Implementation: backlog-wave-2

**Started:** 2026-09-27
**Last Updated:** 2026-09-27

> This document is used to resume interrupted implementation sessions.
>
> Conventions:
>
> - `oat_current_task_id` always points at the **next plan task to do** (not the last completed task).
> - When all plan tasks are complete, set `oat_current_task_id: null`.
> - Reviews are **not** plan tasks. Track review status in `plan.md` under `## Reviews` (e.g., `| final | code | passed | ... |`).
> - Keep phase/task statuses consistent with the Progress Overview table so restarts resume correctly.
> - Before running the `oat-project-pr-final` skill, fill the Final Summary (for PR/docs) section below with what was actually implemented.

## Progress Overview

| Phase        | Status   | Tasks | Completed |
| ------------ | -------- | ----- | --------- |
| Phase 1      | complete | 8     | 8/8       |
| Phase 2      | complete | 8     | 8/8       |
| Phase 3      | complete | 5     | 5/5       |
| Phase 4      | complete | 7     | 7/7       |
| Phase 5      | complete | 12    | 12/12     |
| Phase p-rev1 | complete | 9     | 9/9       |

**Total:** 49/49 tasks completed

---

## Phase 1: AGENTS.md guidance

**Status:** complete
**Started:** 2026-09-27

### Task p01-t01: Give each unsafe-directory variant its own outside directory

**Status:** completed
**Commit:** 8d84a43cf

---

### Task p01-t02: Append absent managed blocks to an existing AGENTS.md

**Status:** completed
**Commit:** 005f84b58

---

### Task p01-t03: Print guidance once and prove the fresh-repo sequence

**Status:** completed
**Commit:** 27de0e30e

---

### Task p01-t04: Make every --project-guidance consumer act or reject

**Status:** completed
**Commit:** c73970479

---

### Task p01-t05: Add read-only guidance emission and fix the oat-doctor hint

**Status:** completed
**Commit:** 2dfc72266

---

### Task p01-t06: Name only installed pack locations in the guidance block

**Status:** completed
**Commit:** 6aa11df62

---

### Task p01-t07: (review) Close p01 review findings M1, M2, L1-L4

**Status:** completed
**Commit:** 1ea888506

---

### Task p01-t08: (review) Close p01 round-2 Low findings L1-L3

**Status:** completed
**Commit:** bb44a14ff

---

## Phase 2: CLAUDE.md shims

**Status:** complete
**Started:** 2026-09-28

### Task p02-t01: Persist a configurable instruction sync strategy

**Status:** completed
**Commit:** e90c64783

---

### Task p02-t02: Stop creating shims and remove OAT-managed shims under none

**Status:** completed
**Commit:** 684880c9a

---

### Task p02-t03: Warn about leftover CLAUDE.md files and adopt strays without shims

**Status:** completed
**Commit:** a80dfd987

---

### Task p02-t04: Update doctor, instructions skills, and provider detection

**Status:** completed
**Commit:** 20b69c44e

---

### Task p02-t05: Document the no-shim default and the pjm init hint

**Status:** completed
**Commit:** 8d3ab82c6

---

### Task p02-t06: Drop this repository's shims

**Status:** completed
**Commit:** 5d54d89c6

---

### Task p02-t07: (review) Close p02 review findings C1, M1, M2, L1-L3

**Status:** completed
**Commit:** b1c48d5bc

---

### Task p02-t08: (review) Close p02 round-2 findings M1, M2, L1

**Status:** completed
**Commit:** e64ec3dd5

---

## Phase 3: Lifecycle skill routing and bookkeeping

**Status:** complete
**Started:** 2026-09-28

### Task p03-t01: Route quick-mode discovery rows straight to quick-start

**Status:** completed
**Commit:** 776d80724

---

### Task p03-t02: Record absorbed projects in Lite consolidations

**Status:** completed
**Commit:** 15b54a918 (+ recovery e4a7c7219)

---

### Task p03-t03: Commit phase bookkeeping before per-phase review dispatch

**Status:** completed
**Commit:** 2938214b8

---

### Task p03-t04: (review) Close p03 review findings M1, M2, L2-L4

**Status:** completed
**Commit:** 794b76561

---

### Task p03-t05: (review) Keep the phase row nonterminal until review fixes and the gate settle

**Status:** completed
**Commit:** 3ab87b7d6

---

## Phase 4: Agent roles and recon validation

**Status:** complete
**Started:** 2026-09-28

### Task p04-t01: Repair bare fences outside .agents/skills and extend the scanner

**Status:** completed
**Commit:** 459f7e8c8

---

### Task p04-t02: Validate recon assignment envelopes before launch

**Status:** completed
**Commit:** e093b8fbc

---

### Task p04-t03: (review) Close p04 review findings M1, L1-L7

**Status:** completed
**Commit:** 28d9ced4e

---

### Task p04-t04: (review) Close p04 gate findings H1, M1

**Status:** completed
**Commit:** d9240c2c1

---

### Task p04-t05: (review) Close p04 round-2 findings M1-M3, L1-L2

**Status:** completed
**Commit:** 7c1e07245

---

### Task p04-t06: (review) Restrict read-only tool authority to an allowlist

**Status:** completed
**Commit:** ab672560e

---

### Task p04-t07: (review) Bound recon write paths and make wave duplicate checks case-insensitive

**Status:** completed
**Commit:** 7bcaefe2a

---

## Phase 5: CI and backlog tooling, release fan-in

**Status:** complete
**Started:** 2026-09-28

### Task p05-t01: Give packages/control-plane a check script

**Status:** completed
**Commit:** 2ed6e9fec

---

### Task p05-t02: Rewrite inbound references when a backlog item is archived

**Status:** completed
**Commit:** c8454ecf6

---

### Task p05-t03: Record ten uncached runs of the collection-detach test

**Status:** completed
**Commit:** 9af7e669c

---

### Task p05-t04: Bump the lockstep public package versions

**Status:** completed
**Commit:** 28199df01

---

### Task p05-t05: Archive the shipped backlog items

**Status:** completed
**Commit:** 341961ce7

---

### Task p05-t06: Run the full Definition of Done

**Status:** completed
**Commit:** 349d64442

---

### Task p05-t07: (review) Close p05 review findings M1, L1-L7

**Status:** completed
**Commit:** 6da8ac2f8

---

### Task p05-t08: (review) Close p05 gate findings H1, M1, M2

**Status:** completed
**Commit:** 9c352de4d

---

### Task p05-t09: (review) Close p05 re-review findings H1, M1, M2, L1-L3

**Status:** completed
**Commit:** fbd0d5b16

---

### Task p05-t10: (review) Keep moved-item code spans intact and rebase query links

**Status:** completed
**Commit:** 6dfea1158

---

### Task p05-t11: (review) Align oat-reviewer mechanical-lane guidance with the validator

**Status:** completed
**Commit:** 0d029f9e4

---

### Task p05-t12: (review) Replace rewritten files atomically so hard links are never written through

**Status:** completed
**Commit:** 2e28e2994

---

## Phase p-rev1: Revision 1

**Status:** complete
**Started:** 2026-09-28

### Task prev1-t01: (revision) Rename the CLAUDE.md shim config keys under instructions.claude

**Status:** completed
**Commit:** 54e8fa4a1 (+ recovery 0f53a5cea)

### Task prev1-t02: (revision) Remove nothing when any CLAUDE.md has real content

**Status:** completed
**Commit:** 789be2615

### Task prev1-t03: (revision) Pin that rules and provider sync ignore the shim setting

**Status:** completed
**Commit:** 8f5d9589c

### Task prev1-t04: (revision) Exclude project and repository records from exit-gate freshness

**Status:** completed
**Commit:** ae6b09d98

### Task prev1-t05: (revision) Take recon-worker out of oat-reviewer

**Status:** completed
**Commit:** 67a46703d

### Task prev1-t06: (revision) Restore the recon skill to main

**Status:** completed
**Commit:** 0da130fdb

### Task prev1-t07: (revision) Correct the recon records

**Status:** completed
**Commit:** 512493326

### Task prev1-t08: (review) Close p-rev1 review findings M1, M2, L1, L2

**Status:** completed
**Commit:** 4f30b57cb

### Task prev1-t09: (review) Close final review findings L2, L3

**Status:** completed
**Commit:** b7536b1be

---

## Orchestration Runs

### Run 1

- Started: 2026-09-27; autonomous (`oat-project-autonomous`), Tier 1 subagents.
- Gate `IMPLEMENT-03`: HiLL checkpoints resolved to `['p05']` (final phase,
  first run, field absent) with `oat_auto_review_at_hill_checkpoints: true`.
- Gate `IMPLEMENT-08`: not needed; Claude Code Task-tool dispatch of the
  generated `oat-phase-implementer` and `oat-reviewer` variants is available
  without extra authorization.
- Phase review gate: `oat_phase_review_gate` enabled for every phase
  (`review_type: code`, `exit_nonzero_on: high`), configured target resolves
  to `codex-6-sol-xhigh`.
- Dispatch policy: managed `high` from project state; implementer and reviewer
  launches use the resolver-returned Claude variants after a validation-only
  `oat project dispatch record` (`status: validated-only`) with the branch CLI,
  because the installed 0.3.7 CLI lacks `canonical-role`.

### Phase p01 dispatch

- Request `bw2-p01-impl-1`: accepted and returned `DONE`; target
  `oat-phase-implementer-claude-claude-opus-5-5-high`; commits
  `8d84a43cf..6aa11df62` (p01-t01..t06), phase verification pass, recovery
  0/10. `Dispatch: scope=p01 action=implementation role=implementer producer=unknown provenance=unknown model_axis=selected:claude-opus-5-5 effort_axis=selected:high dispatch_policy=high dispatch_ceiling=high target=oat-phase-implementer-claude-claude-opus-5-5-high`
- Request `bw2-p01-review-1`: accepted; target
  `oat-reviewer-claude-claude-opus-5-5-high`; reconnaissance not-attempted;
  `reviews/archived/p01-review-2026-09-27T235828Z.md`: 0 Critical, 0 High,
  2 Medium, 4 Low (passes the phase threshold). Received in auto-disposition
  mode: all six converted to `p01-t07`. `Dispatch: scope=p01 action=review role=reviewer producer=unknown provenance=unknown model_axis=selected:claude-opus-5-5 effort_axis=selected:high dispatch_policy=high dispatch_ceiling=high target=oat-reviewer-claude-claude-opus-5-5-high`
- Continuation `cont-backlog-wave-2-p01-fix-1` (same handle, fix mode):
  `1ea888506` closed M1 (link count above 1 takes the manual patch, at planning
  and after open), M2 (zero-pack guidance is `skipped`, exit 0), L1 (real cause
  plus patch; partial writes distinguished), L2 (`O_NONBLOCK`, non-regular
  refused), L3 (doctor wording), L4 (test title); failing-first and
  neutralize-and-restore evidence in the commit body; 2492 tests green.
- Request `bw2-p01-review-2` (round 2, `oat-reviewer-claude-claude-opus-5-5-high`,
  reconnaissance not-attempted): `reviews/archived/p01-review-2026-09-28T000859Z.md`
  passed with 0 Critical/High/Medium; all six round-1 findings verified fixed;
  three new Lows converted to `p01-t08`. The M2 fix landed in
  `init/tools/index.ts` rather than the plan's `init/index.ts` (plan wording
  only).
- Continuation `cont-backlog-wave-2-p01-fix-2`: `bb44a14ff` closed round-2
  L1 (refusal header names the cause via `appendRefusal`), L2 (`EISDIR`,
  `ENOTDIR`, `EMLINK` open errors report an identity change), L3
  (`oat tools guidance` with no packs prints a note; `--json` status
  `no-packs`); 2557 tests green.
- Phase gate (`codex-6-sol-xhigh`, inline Codex runtime, `exit_nonzero_on: high`):
  `reviews/archived/p01-review-2026-09-28T001719Z.md` status `ok`, receive-eligible, 0 Critical/High, 1
  Medium. Judgment sweep: M1 (concurrent invocations can append the same
  absent block twice, leaving duplicate markers that block later runs)
  deferred to final; see Deferred Findings (Medium).
- Phase p01 outcome: pass after 2 fix rounds (p01-t07, p01-t08); 8/8 tasks.
- Implementer-reported deviations: evidence lives in commit bodies (root owns
  `implementation.md`); the e2e legacy-workflows-block cases stay
  `manual-required` (control (f)); no test pinned oat-doctor 2.0.1.

### Phase p02 dispatch

- Request `bw2-p02-impl-1`: accepted, returned `DONE_WITH_CONCERNS`; target
  `oat-phase-implementer-claude-claude-opus-5-5-high`; commits
  `e90c64783..5d54d89c6` (p02-t01..t06); declared phase verification pass
  (2463 tests); full CLI suite fails one file. `Dispatch: scope=p02 action=implementation role=implementer producer=unknown provenance=unknown model_axis=selected:claude-opus-5-5 effort_axis=selected:high dispatch_policy=high dispatch_ceiling=high target=oat-phase-implementer-claude-claude-opus-5-5-high`

### Recovery Event bw2-p02-rec-1 (initial stop)

- Phase/task: p02 / p02-t01
- Original request: bw2-p02-impl-1
- Original commit: e90c64783
- Defect class: test
- Discovered by: `HOME=$(mktemp -d) pnpm --filter @open-agent-toolkit/cli exec vitest run` (full CLI suite)
- Disposition: direction-required
- Authorization: phase-standing
- Attempt: 0/10
- Dispatch target: oat-phase-implementer-claude-claude-opus-5-5-high
- Recovery commit: -
- Verification: declared phase checks pass; `src/commands/tools/update/config-write.test.ts` fails at import because its partial `@config/oat-config` mock lacks the new `DEFAULT_INSTRUCTION_SYNC_STRATEGY` export used by `config/resolve.ts`.
- Reason: the root brief forbade `state.md` edits, which conflicts with the recovery contract's implementer-owned ledger reservation; no reservation, edit, or commit was made. Root direction: the brief conflict was a root error; the narrow `oat_phase_recovery_policy` ledger write is authorized, and the correction is bounded to the failing test's mock (build it on the real module).

### Recovery Event bw2-p02-rec-1

- Phase/task: p02 / p02-t01
- Original request: bw2-p02-impl-1
- Original commit: e90c64783
- Defect class: test
- Discovered by: `HOME=$(mktemp -d) pnpm --filter @open-agent-toolkit/cli exec vitest run` (full CLI suite)
- Disposition: recovered
- Authorization: operator-extension (root direction after the direction-required stop)
- Attempt: 1/10
- Dispatch target: oat-phase-implementer-claude-claude-opus-5-5-high
- Recovery commit: 02fbaa486
- Verification: focused `config-write.test.ts` exit 0 before and after commit; full CLI suite exit 0 before and after commit (397 files, 7833 tests)
- Reason: test-only mock fix (`importOriginal`); root validated the committed `completed` marker, then cleared it (`used_attempts: 1`, `pending_attempt: null`).

- Request `bw2-p02-review-1` (`oat-reviewer-claude-claude-opus-5-5-high`,
  reconnaissance not-attempted): `reviews/archived/p02-review-2026-09-28T005842Z.md` 1 Critical, 2 Medium,
  3 Low; blocking. C1: default sync deletes a hand-written `CLAUDE.md` when
  `AGENTS.md` is a symlink to it (copy check compares the file with itself),
  reproduced by the reviewer. Converted all six to `p02-t07` (fix round 1 of
  the retry limit 2).

- Continuation `cont-backlog-wave-2-p02-fix-1`: `b1c48d5bc` closed C1 (a
  `CLAUDE.md` that the sibling `AGENTS.md` resolves to, by symlink or hard
  link, is never a managed copy; guard proven by neutralize-and-restore), M1
  (scans stop at nested git checkouts), M2 (`.agents/docs/rules-files.md`),
  L1-L3; full CLI suite 7841 green; repository `validate`/`sync --dry-run`
  clean. Follow-up recorded (pre-existing, out of scope): with a shim strategy,
  `--strategy pointer --force` can overwrite the only `CLAUDE.md` in the
  `AGENTS.md -> CLAUDE.md` layout; file as a backlog item at closeout.

- Request `bw2-p02-review-2` (round 2, reconnaissance not-attempted):
  `reviews/archived/p02-review-2026-09-28T011221Z.md` passed (0 Critical/High); C1 and M1 verified across
  symlink, hard-link, chain, absolute-path, and seven apply-time race
  variants. Two new Mediums (cross-directory dangling link; unsafe "remove the
  file" advice when `AGENTS.md` links to the `CLAUDE.md`) and one Low (case
  variants) converted to `p02-t08` (fix round 2 of 2).

- Continuation `cont-backlog-wave-2-p02-fix-2`: `e64ec3dd5` closed M1
  (planning- and apply-time `findLinksThrough` check keeps any `CLAUDE.md` a
  scanned instruction file links through; stray layout is not adopted), M2
  (`linkedBy` in the leftover warning; replace-the-link advice in CLI, doctor,
  analyze, docs); L1 dispositioned as not reported (case-insensitive matching
  flagged real provider docs such as `tools/smoke/protocols/claude.md`;
  documented and pinned). Full CLI suite 7846 green; repository clean.

- Phase gate (`codex-6-sol-xhigh`): `reviews/archived/p02-review-2026-09-28T013003Z.md` status `ok`,
  0 Critical/High/Medium, 1 Low (analyze/apply overstated a nested
  `CLAUDE.md`'s effect). Judgment sweep: addressed now (two wording lines; no re-gate). The
  wording change landed inside bookkeeping commit `e13fa06cd` because its own
  commit was rejected by commitlint (body line over 100 characters) after the
  files were staged; recorded as a deviation rather than rewriting pushed
  history.
- Phase p02 outcome: pass after 1 recovery (bw2-p02-rec-1) and 2 fix rounds
  (p02-t07, p02-t08); 8/8 tasks.

### Phase p03 dispatch

- Request `bw2-p03-impl-1`: accepted, returned `DONE_WITH_CONCERNS` (one
  recovered defect); target `oat-phase-implementer-claude-claude-opus-5-5-medium`;
  commits `776d80724` (t01), `15b54a918` (t02), `e4a7c7219` (recovery),
  `2938214b8` (t03); phase verification pass (888 vitest, 37 implement node
  tests, skill bumps, validate-skills, docs check, type-check). `Dispatch: scope=p03 action=implementation role=implementer producer=unknown provenance=unknown model_axis=selected:claude-opus-5-5 effort_axis=selected:medium dispatch_policy=high dispatch_ceiling=high target=oat-phase-implementer-claude-claude-opus-5-5-medium`
- Implementer notes: routing rows pinned by a dedicated row-parsing test (the
  load-contract matrix covers prose only); p03-t03 sweep added the Step 7a push
  anchor to `synced-bookkeeping-sites.json` and moved the staging-block count
  3 -> 4; BL-260829 stays open with its live-observation note; BL-260711 notes
  the relationship.

### Recovery Event bw2-p03-rec-1

- Phase/task: p03 / p03-t02
- Original request: bw2-p03-impl-1
- Original commit: 15b54a918
- Defect class: test
- Discovered by: `HOME=$(mktemp -d) pnpm --filter @open-agent-toolkit/cli exec vitest run src/validation/named-skill-load-contract.test.ts` (p03-t03 transition run)
- Disposition: recovered
- Authorization: phase-standing
- Attempt: 1/10
- Dispatch target: oat-phase-implementer-claude-claude-opus-5-5-medium
- Recovery commit: e4a7c7219
- Verification: focused 34 and phase 882 passing before and after commit
- Reason: a new Lite sentence used a load-contract execution verb ("use"); reworded without changing meaning. Root validated the committed `completed` marker and cleared it (`used_attempts: 1`, `pending_attempt: null`).

- Request `bw2-p03-review-1` (`oat-reviewer-claude-claude-opus-5-5-high`,
  reconnaissance not-attempted): `reviews/archived/p03-review-2026-09-28T014814Z.md` passed the phase
  threshold (0 Critical/High), 2 Medium, 4 Low. M1, M2, L2-L4 converted to
  `p03-t04`. L1 (the control-plane recommender `router.ts:66-67` and the
  dashboard `state/generate.ts:411-414` still route quick-mode discovery to
  `oat-project-plan`) deferred to a follow-up backlog item at closeout.

- Continuation `cont-backlog-wave-2-p03-fix-1`: `794b76561` closed M1
  (Step 7a settles recovery markers; no-review stops commit through 7a), M2
  (phase status set in 7b from the review outcome), L2-L4; 893 vitest and 37
  node tests green.

- Phase gate (`codex-6-sol-xhigh`): `reviews/archived/p03-review-2026-09-28T015614Z.md` status `ok`,
  0 Critical/High, 2 Medium. Judgment sweep, both addressed now: M1 (resume
  pointers named completed `p03-t04`) fixed in root bookkeeping at phase
  close; M2 (Step 7b marked a phase complete before queued fixes and the gate
  settle) routed to `p03-t05` on the original handle, no re-gate.

- Continuation `cont-backlog-wave-2-p03-fix-2`: `3ab87b7d6` closed gate M2
  (phase row stays nonterminal until review dispositions and selected gates
  settle); 894 vitest and 37 node tests green.
- Phase p03 outcome: pass after 1 recovery (bw2-p03-rec-1), 1 review fix
  round (p03-t04), and 1 gate sweep fix (p03-t05); 5/5 tasks. BL-260829 stays
  open for live observation.

### Phase p04 dispatch

- Request `bw2-p04-impl-1`: accepted, returned `DONE`; target
  `oat-phase-implementer-claude-claude-opus-5-5-medium`; commits `459f7e8c8`
  (t01), `e093b8fbc` (t02); phase verification pass (960 vitest, 343 recon node
  tests, skill bumps, validate-skills, type-check, `status --scope project`
  clean). `Dispatch: scope=p04 action=implementation role=implementer producer=unknown provenance=unknown model_axis=selected:claude-opus-5-5 effort_axis=selected:medium dispatch_policy=high dispatch_ceiling=high target=oat-phase-implementer-claude-claude-opus-5-5-medium`
- p04-t01 evidence (from the commit body): the extended scanner failed first
  on exactly the five fences; a seeded bare fence failed the live test in
  `.agents/agents` and in `.oat/templates`; neutralizing the new roots turned
  five tests red; inventory floor 207 -> 246; scanner laxity narrowing left
  as-is with a recorded reason and trigger (item notes).
- p04-t02: new `recon/scripts/validate-assignment.mjs` (envelope
  `kind: recon.assignment`, `schemaVersion: 1`, documented in
  `worker-contract.md`) reports every invalid field; truncation control turned
  two tests red; reviewer role resolves recon through the sibling-skill probe;
  recon 1.1.6; recon-worker unchanged.

- Request `bw2-p04-review-1` (reconnaissance not-attempted):
  `reviews/archived/p04-review-2026-09-28T021519Z.md` passed the phase threshold (0 Critical/High), 1 Medium
  (array not enforced as one homogeneous wave), 7 Low; all converted to
  `p04-t03`.

- Continuation `cont-backlog-wave-2-p04-fix-1`: `28d9ced4e` closed M1
  (`WAVE_MISMATCH` across run, wave, wave mode, mode, task class) and L1-L7;
  347 recon node tests, 897 vitest, skill bumps, provider status clean.

- Phase gate attempt 1 (`codex-6-sol-xhigh`): `reviews/archived/p04-review-2026-09-28T022315Z.md` status
  `blocked`, receive-eligible: H1 (read sources not bounded by allowed and
  excluded inputs) and M1 (arbitrary output schema accepted). Converted to
  `p04-t04` (gate fix round 1 of 2); root review and gate rerun after the fix.

- Continuation `cont-backlog-wave-2-p04-fix-2`: `d9240c2c1` closed gate H1
  (read sources must sit inside allowed inputs and included scope, outside
  exclusions, segment-aware; unverifiable forms rejected) and M1 (output
  schema must be the approved packet-contract reference or a closed inline
  schema); 352 recon node tests, 897 vitest.

- Request `bw2-p04-review-2` (reconnaissance not-attempted):
  `reviews/archived/p04-review-2026-09-28T023246Z.md` passed (0 Critical/High); gate H1/M1 and first-review
  findings verified fixed; adversarial probing found 3 Medium (scheme-without-
  slashes URLs, case-variant exclusion bypass, schema anchors that do not
  resolve) and 2 Low, converted to `p04-t05` before gate attempt 2.

- Continuation `cont-backlog-wave-2-p04-fix-3`: `7c1e07245` closed M1 (any
  `scheme:` string is a URL; only http/https accepted, compared by origin),
  M2 (case-insensitive exclusion, exact inclusion), M3 (stable per-kind
  anchors in `packet-contract.md`, tested), L1, L2 (inline output schemas
  dropped; the artifact kind fixes the schema); 355 recon node tests.

- Phase gate attempt 2 (`codex-6-sol-xhigh`): `reviews/archived/p04-review-2026-09-28T024124Z.md` status
  `blocked`: one High (the validator accepts mutation-capable and unknown
  names such as `Bash`, `exec_command`, `NotARealTool` in
  `readSources.tools`). Review-fix and gate rounds for p04 are exhausted
  (`oat_orchestration_retry_limit` 2), so the run stopped at the gate-policy
  boundary for operator direction.

- Operator disposition (2026-09-28) for the exhausted p04 gate budget: fix
  the High in `p04-t06`, run one root re-review, then continue to p05 without
  a third gate run; the final review covers p04.

- Continuation `cont-backlog-wave-2-p04-fix-4`: `ab672560e` replaced the
  mutating-tool denylist with a `READ_ONLY_TOOLS` allowlist
  (`MUTATING_TOOL`, `EXECUTION_TOOL`, `UNKNOWN_TOOL` rejections); 357 recon
  node tests, 897 vitest.

- Request `bw2-p04-review-3` (operator-authorized re-review):
  `reviews/archived/p04-review-2026-09-28T025845Z.md` 1 High (write paths not bounded to the artifact-kind
  packet directory; controller-owned files accepted), 2 Medium, 3 Low; gate-2
  High verified fixed. Operator direction: fix H1 and M1 in `p04-t07`; defer
  M2 (Codex has no allowlisted read tool, so Codex recon lanes fall back to
  inline) and L1-L3 to a follow-up backlog item; continue without another p04
  review.

- Continuation `cont-backlog-wave-2-p04-fix-5`: `7bcaefe2a` closed H1
  (write paths bound to each artifact kind's packet folder; controller-owned
  paths refused) and M1 (case- and NFC-insensitive duplicate and exclusion
  matching); 359 recon node tests, 897 vitest.
- Phase p04 outcome: complete under operator override (2026-09-28). Two gate
  attempts blocked (each with a new validator authority gap, both fixed); the
  gate retry budget was exhausted, and the operator directed fixing the
  remaining High and continuing, with the final review covering p04. 7/7
  tasks. Follow-ups filed: `BL-260928-serialize-concurrent-agents-md` (p01
  deferred Medium), `BL-260928-keep-instructions-sync-force` (p02 pre-existing
  `--force` gap), `BL-260928-route-quick-mode-discovery` (p03 L1 routers),
  `BL-260928-settle-codex-read-authority` (p04 M2, L1-L3).

### Phase p05 dispatch

- Request `bw2-p05-impl-1`: accepted, returned `DONE`; target
  `oat-phase-implementer-claude-claude-opus-5-5-medium`; commits `2ed6e9fec`
  (t01), `c8454ecf6` (t02), `9af7e669c` (t03), `28199df01` (t04), `341961ce7`
  (t05), `349d64442` (t06). `Dispatch: scope=p05 action=implementation role=implementer producer=unknown provenance=unknown model_axis=selected:claude-opus-5-5 effort_axis=selected:medium dispatch_policy=high dispatch_ceiling=high target=oat-phase-implementer-claude-claude-opus-5-5-medium`
- p05-t01: red control (`turbo run check` for control-plane executed no task
  with a seeded violation, exit 0), green (exit 1 with the seed, 0 without);
  `scripts.lint` delete control exit 1, restored 0; both AGENTS.md passages
  and `contributing/code.md` updated.
- p05-t02: archive rewrites inbound `.oat/repo` Markdown links and
  repository-root path strings; failing-first; scratch probe on real linked
  items rewrote both links.
- p05-t03: ten uncached runs of the collection-detach case, all exit 0, head
  `c8454ecf6`, Darwin 25.4.0 arm64, Node v24.18.0.
- p05-t04: lockstep 0.3.8 -> 0.3.9; `release:check-versions` and
  `release:validate` exit 0.
- p05-t05: twelve items archived with the branch CLI (0 inbound rewrites
  needed); dangling-link sweep empty; external-plan bidirectional-link
  contract test pass; `pjm doctor` shows only the pre-existing
  `backlog_completed_unarchived` false positive (14 -> 11 listed).
  BL-260829 and the four BL-260928-\* follow-ups stay open.
- p05-t06 Definition of Done at `341961ce7` (all exit 0): `pnpm check` (0/11
  cached), `type-check`, `HOME=$(mktemp -d) pnpm exec turbo run test --force`
  (0/10 cached; cli 7866, control-plane 151, docs-transforms 31, docs-config
  10), `build`, `check:skill-bumps`, `release:check-versions`,
  `release:validate`, `build:docs`, `test:smoke` 163/163, `test:skills`
  690/690, `test:scripts` 1/1, `lint`, `format`.

- Request `bw2-p05-review-1` (reconnaissance not-attempted):
  `reviews/archived/p05-review-2026-09-28T103350Z.md` passed (0 Critical/High), 1 Medium (control-plane
  lacks `check:fix`/`lint:fix`), 7 Low; all converted to `p05-t07`.

- Continuation `cont-backlog-wave-2-p05-fix-1`: `6da8ac2f8` closed M1
  (control-plane `check:fix`/`lint:fix`) and L1-L7 (wording, `check` pins,
  scan-flag and depth tests, code-span skip, reference-definition rebase,
  retryable rewrite, help and docs, macOS/Linux evidence note citing Linux CI
  runs 34081195164 and 34081580680); 148 vitest, check, lint, format,
  type-check green.

- Phase gate attempt 1 (`codex-6-sol-xhigh`): `reviews/archived/p05-review-2026-09-28T104612Z.md` status
  `blocked`: H1 (tracked Markdown symlink lets the rewriter write outside
  `.oat/repo`), M1 (suffix fallback rewrites URLs and unrelated paths), M2
  (angle-bracket links malformed). Converted to `p05-t08` (gate round 1 of 2).

- Continuation `cont-backlog-wave-2-p05-fix-2`: `9c352de4d` closed H1
  (symlinks and out-of-root real paths skipped; `O_NOFOLLOW` reads and
  writes), M1 (rewrite only tokens resolving to the former path; URLs
  untouched; unresolved local forms warned), M2 (angle-delimited links);
  controls neutralized and restored; 88 backlog tests.

- Request `bw2-p05-review-2` (reconnaissance not-attempted):
  `reviews/archived/p05-review-2026-09-28T105839Z.md` 1 High (skipping inline code spans, added in
  `p05-t07`, leaves the canonical external-plan Source citations unrewritten;
  reproduced on real data), 2 Medium (fallback breaks a working link;
  footnotes corrupted by the reference-definition rebase), 3 Low. Converted to
  `p05-t09` (blocking round 2 of 2). DoD re-run at head by the reviewer: all
  gates green.

- Continuation `cont-backlog-wave-2-p05-fix-3`: `fbd0d5b16` closed H1
  (whole-span path citations rewritten; commands and fenced blocks warned and
  kept), M1 (fallbacks only when the relative path does not exist), M2
  (footnotes and prose definitions untouched), L1-L3; scratch real-data runs
  rewrote exactly the citing plan lines. Implementer notes: seven older,
  already-archived items still have code-span citations in the repository
  (re-running archive on them would repoint via the retry path; out of scope,
  noted for the PR); the Definition of Done is re-run at closeout.

- Phase gate attempt 2 (`codex-6-sol-xhigh`): `reviews/archived/p05-review-2026-09-28T111050Z.md` status
  `ok` (0 Critical/High), 1 Medium, 1 Low; judgment sweep: both addressed now
  in `p05-t10`, no re-gate.

- Continuation `cont-backlog-wave-2-p05-fix-4`: `6dfea1158` closed the gate
  sweep M1 (definition rebase on prose only) and L1 (query-bearing links); 95
  backlog tests.
- Phase p05 outcome: pass after 1 blocked gate attempt and 3 review-fix rounds
  plus 1 sweep fix; 10/10 tasks. The Definition of Done is re-run at closeout
  because p05-t06 predates the later fix commits.

### Final Review

- Request `bw2-final-review-1` (`oat-reviewer-claude-claude-opus-5-5-high`,
  `oat-project-review-provide code final`, reconnaissance not-attempted):
  `reviews/archived/final-review-2026-09-28T112631Z.md` 0 Critical/High, 1 Medium (PR behavior-change text
  inaccurate: stray adoption removes a lone `CLAUDE.md`; `validate` exits 1 on
  upgraded repositories until sync), 3 Low (summary counts, `oat-reviewer.md`
  mechanical-lane checks wording vs the validator, template placeholders).
  Deferred Mediums judged acceptable as filed follow-ups. Root fixed the
  Medium, L1, and L3 in bookkeeping; L2 went to `p05-t11` (`0d029f9e4`,
  reviewer mechanical-lane wording plus regenerated views). Gate
  `IMPLEMENT-11` recorded.

- Request `bw2-final-review-2` (round 2, scoped to the fixes):
  `reviews/archived/final-review-2026-09-28T113124Z.md` passed (0 Critical/High/Medium); M1, L1, L2 verified
  against the branch CLI; two bookkeeping Lows (a stale "never touches
  hand-written files" sentence; the placeholder Deviations row and References)
  fixed in root bookkeeping.

### Implementation exit gate

- Generation 1, attempt 1 (`codex-6-sol-xhigh`, run
  `0415d270-2faa-4559-901c-65430d5c405d`, reviewed head `1973af8f0`):
  `reviews/archived/final-review-2026-09-28T113721Z.md` status `blocked`, receive-eligible: H1 (the archive
  rewriter truncates in place, so an in-tree file hard-linked to an outside
  file rewrites the outside file). Both deferred Mediums judged acceptable as
  filed follow-ups. `on_failure: block`: attempt 1 of 2 consumed; remediation
  `p05-t12`; the basis becomes stale and Steps 12-13 rerun before attempt 2.
- Deviation: the launch intent was not persisted before this launch (the
  intent write and the launch ran in one batch and the write failed a
  substring guard); the accepted run was kept, never replaced, and its state
  was persisted from the result receipt afterwards.

- Remediation `p05-t12` (`2e28e2994`): rewritten files are replaced through
  an `O_EXCL | O_NOFOLLOW` temporary file and rename in the verified parent
  after an `lstat` device/inode re-check; hard-link fixture proven by
  neutralize-and-restore. Generation 1 basis marked stale; Steps 12-13 rerun.

- Steps 12-13 rerun for the stale basis: Definition of Done at `ba69e2052` all
  exit 0 (0/10 cached; cli 7875 tests); final re-review `bw2-final-review-3`
  (`reviews/archived/final-review-2026-09-28T114422Z.md`) passed with 0 Critical/High/Medium and 3 Low
  (ownership change on replace, same-inode concurrent edit, long temp names),
  deferred to `BL-260928-harden-the-backlog-reference`.

- Generation 1, attempt 2 (run `0c5dbb3e-18a9-4059-a857-ca4209e3b9e4`,
  reviewed head `531ce5f4e`, intent persisted before launch in `b54d67306`):
  `reviews/archived/final-review-2026-09-28T114805Z.md` status `ok`, 0 findings; deferred Mediums reconfirmed
  as acceptable follow-ups. Received; exit gate `allowed/passed`.

- PR step (pre-approval `pr`) stopped at PRFINAL-05: a root-written prose
  note under `plan.md` `## Reviews` wrapped an inline-code flag list so a line
  began with `|`, which the ledger guard parses as a malformed row. Root
  repaired its own bookkeeping note (flags listed without pipes; project
  tracking, closeout-only), recorded a freshness checkpoint, and reran the PR
  step. The guard treating prose pipes as rows is a pr-final false positive
  worth a follow-up.

- PR step rerun at `36d48005d`: PRFINAL-03 passed (latest final/code row
  `passed`); PRFINAL-05 passed (27 of 27 ledger rows resolve); PRFINAL-02
  auto-resolved the title and base `main` from PR Requirements. Opened
  https://github.com/voxmedia/open-agent-toolkit/pull/332; `state.md` set to
  `pr_open`. The `pr` sequence step stays open for the closeout orchestrator.

- Generation 2 (Revision 1): generation 1 (`allowed/passed` at `531ce5f4e`)
  was marked `stale` by the revision's substantive changes; its provenance is
  kept above. Final review passed at `7b389c5af` (gate row), DoD at
  `c95e17aad`. Generation 2 intent persisted before launch: reviewed head
  `b1d8ab9cb`, `effective-delta-v1` (installed skill rules), unchanged
  `config_fingerprint`, attempts 0 of 2.

### Final HiLL approval and completion

- Closeout sequence (configured `[summary, document, pr]`, post-approval `[]`):
  summary `759edbb1e`, document `343426ada`, project recap `built`
  (`db4bbcd59`), PR #332 opened. Each step was followed by a state-only
  freshness checkpoint; the exit gate stayed `allowed/passed`.
- Gate `IMPLEMENT-16`: final HiLL approval auto-approved under the autonomy
  contract (`approval_source: oat-autonomous`) after the passing final review
  (`final-review-2026-09-28T114805Z.md`, gate run
  `0c5dbb3e-18a9-4059-a857-ca4209e3b9e4`) and all pre-approval steps. No
  post-approval steps. Implementation complete; the project stays `pr_open`
  for revise or completion.

### PR Requirements (hand-off to oat-project-pr-final)

- Title names the removal and the key rename with a breaking marker, for
  example
  `feat!: stop creating CLAUDE.md shims by default and rename shim config to instructions.claude.* (wave 2, lockstep 0.3.9)`;
  GitHub release notes list PR titles only.
- Body opens with a **Behavior change** callout: `oat instructions sync` no
  longer creates `CLAUDE.md` shims by default and removes OAT-managed shims
  (exact `@AGENTS.md` pointer, sibling symlink, or identical copy) on its next
  run. Removal is all or nothing: while any `CLAUDE.md`, `CLAUDE.local.md`, or
  `.claude/CLAUDE.md` with its own content exists, sync removes no shim and
  `sync`/`validate` exit 1, naming the file, the shims it would remove, a docs
  link, and the fixes (move the content into `AGENTS.md` and remove the file,
  or set `instructions.claude.shims`). A lone `CLAUDE.md` with no `AGENTS.md`
  is adopted: its content moves into a new `AGENTS.md` and the `CLAUDE.md` is
  removed (unless an `AGENTS.md` elsewhere links to it). After upgrading,
  `oat instructions validate` exits 1 in a repository that still has shims
  from the old default until `oat instructions sync` runs, so CI that runs
  validate goes red until then. Opt back in with
  `oat config set instructions.claude.shims pointer` and rerun
  `oat instructions sync`.
- Body calls out the rename: `documentation.instructionSyncStrategy` and
  `documentation.instructionPointerExcludes` become
  `instructions.claude.shims` and `instructions.claude.excludes`, with no
  compatibility read; the old keys are ignored and are dropped on the next
  `oat config set`. Upgrade notice: a repository that set
  `documentation.instructionPointerExcludes` must re-set the list as
  `instructions.claude.excludes` before its first sync; until then sync scans
  the formerly excluded directories and adopts and removes a lone `CLAUDE.md`
  there.
- Body also lists: append-only AGENTS.md guidance, `--project-guidance`
  honored or rejected everywhere, `oat tools guidance`, backlog archive link
  rewriting, `oat-reviewer` no longer launching `recon-worker` (recon skill
  unchanged from `main`), `effective-delta-v2` exit-gate freshness,
  control-plane `check`.

### Revision Received: Inline Feedback

**Date:** 2026-09-28
**Source:** inline conversation (operator, after PR #332 opened)

**Changes requested:**

- Clean-rename the shim keys: `instructions.claude.shims` and
  `instructions.claude.excludes` (no compatibility read).
- Under `none`, remove nothing while any `CLAUDE.md`, `.claude/CLAUDE.md`, or
  `CLAUDE.local.md` has real content; explain why, link the docs, and point to
  removing or moving the file or setting a shim strategy.
- Keep rules and provider sync independent of the shim setting, pinned by a
  test.
- `effective-delta-v2`: changes only under `.oat/projects/**` and
  `.oat/repo/**` no longer make the exit gate stale.
- Only the `recon` skill uses `recon-worker`: remove the reviewer's
  `recon-worker` path, restore the recon skill to `main` (dropping this wave's
  ~1,900-line assignment validator, which also blocked Codex recon lanes), and
  correct the recon records; rescope the Codex follow-up to a live check.
- Declined after discussion: repointing old links to already-archived backlog
  items; a new `keep` strategy value.

**New tasks added:** prev1-t01 through prev1-t07

**Next:** Execute revision tasks via `oat-project-implement`, then a new final
review and exit-gate generation, update PR #332 (title, Behavior change
callout with the new key names and the all-or-nothing rule, release note that
the keys were renamed), and refresh the Final Summary and summary.md.

### Phase p-rev1 dispatch

- Request `bw2-prev1-impl-1` (`oat-phase-implementer-claude-claude-opus-5-5-high`,
  hard-reasoning): interrupted when the previous session ended after
  prev1-t03 with prev1-t04 uncommitted; resumed on the same handle (the agent
  owned the in-progress edits), returned `DONE_WITH_CONCERNS`. Commits
  `54e8fa4a1`, recovery `0f53a5cea`, `789be2615`, `8f5d9589c`, `ae6b09d98`,
  `67a46703d`, `0da130fdb`, `512493326`. Full Definition of Done at
  `512493326` all exit 0 (tests 0/10 cached; test:skills 660/660).
  `Dispatch: scope=p-rev1 action=implementation role=implementer producer=unknown provenance=unknown model_axis=selected:claude-opus-5-5 effort_axis=selected:high dispatch_policy=high dispatch_ceiling=high target=oat-phase-implementer-claude-claude-opus-5-5-high`
- Recovery event `bw2-prev1-rec-1` (prev1-t01, lint, `no-useless-concat` in a
  test file) recovered in `0f53a5cea`, attempt 1/10; root validated and
  cleared the `completed` marker.
- Verified by root: `git diff origin/main -- .agents/skills/recon` is empty;
  `oat-reviewer.md` no longer names `recon-worker` or `validate-assignment`;
  the old key names survive only in historical explainer-kit test fixtures.
  `summary.md` and the recap are stale and are regenerated at closeout.
- Exit gate generation 1 marked `stale` (substantive changes after the
  allowed result); a new final review and gate generation run at closeout.

- Review `bw2-prev1-review-1` (`oat-reviewer-claude-claude-opus-5-5-high`,
  auto) at `091873d80`: 0 Critical/High, 2 Medium, 3 Low
  (`reviews/archived/p-rev1-review-2026-09-28T155753Z.md`). Reconnaissance:
  not-attempted. M1, M2, L1, L2 converted to prev1-t08. L3 recorded here: the
  prev1-t04 and prev1-t05 commit bodies lack failing-first records; the
  reviewer confirmed both tests fail against the pre-change files (the v2 test
  asserts the three exclusion pathspecs extracted from the skill text; the
  reviewer test asserts `not.toContain('recon-worker')`, which the
  pre-change `oat-reviewer.md` contained).- prev1-t08 (resume of `bw2-prev1-impl-1`, DONE) at `4f30b57cb`: M1 `linkedBy`
  per blocker with replace-then-remove advice; M2 per-file leftover warnings
  suppressed for `wouldRemove` while blocked; L1 wording; L2 docs. Failing
  first recorded in the commit body (vitest 2 failed, oat-doctor 2 failed).
  Removal set unchanged (probes keep every shim). `pnpm check` 0/11 cached,
  instructions+sync 226/226, oat-doctor 11/11.
- Gate run `b282ca69` (`codex-6-sol-xhigh`) at `f4599bec3`: the reviewer wrote
  `reviews/archived/p-rev1-review-2026-09-28T160943Z.md` (0 findings) but never
  ran the branch-local `gate route` step, so no route receipt existed and the
  gate failed closed (`review_failed`, `unexpected_post_selection_failure`).
  Not accepted as gate evidence; the gate reruns once.
- Gate run 2 (`codex-6-sol-xhigh`, route `inline` from the installed 0.3.7
  `gate route`) at `71aef4127`: `review_completed_gate_passed`, 0 Critical,
  High and Medium, 1 Low (this log's joined list item, fixed by root). The
  rerun narrowed to the bookkeeping delta; product code through `4f30b57cb`
  was covered by run 1's 0-finding review. Both runs' artifacts are archived
  locally; both ledger rows are `passed`.
- Final review `bw2-final-review-3` (`oat-reviewer-claude-claude-opus-5-5-high`,
  auto, whole PR `5bb73dd08..11008080c`, weighted to the revision delta):
  0 Critical/High, 2 Medium, 4 Low
  (`reviews/archived/final-review-2026-09-28T163142Z.md`); reconnaissance
  not-attempted; removal-block neutralization breaks 5 tests. Root fixed M1
  (PR hand-off and plan PR Requirements: title names the rename, body carries
  all-or-nothing and the rename), L1 (Final Summary proofs and follow-ups), and
  L4 (Deviations row). M2 is a closeout requirement: `summary.md` is fully
  regenerated (Key Decisions, Integration Notes, and Tradeoffs included, not
  only the incremental revision sections) with
  `oat_summary_includes_revisions: [p-rev1]`, the recap is rebuilt from the
  refreshed facts, and
  `rg -n "instructionSyncStrategy|instructionPointerExcludes|validate-assignment"`
  over `summary.md` and `explainers/` returns nothing. L2 and L3 became
  prev1-t09.
- The same final reviewer left a second artifact
  (`reviews/archived/final-review-2026-09-28T163513Z.md`, 0 Critical/High,
  1 Medium, 5 Low) overlapping the first, with three additions, all fixed by
  root: the PR upgrade notice (a released `instructionPointerExcludes` list is
  ignored, so sync adopts and removes a lone `CLAUDE.md` in formerly excluded
  directories until the list is re-set under `instructions.claude.excludes`),
  the `effective-delta-v2` literal `.oat/projects` assumption (stated in the
  completion reference and `DR-260928-exclude-project-and-repository`), and
  `DR-260928-name-the-claude-md-shim-keys` Context wording plus its release
  note location (PR title). Its stale-DoD Low is closed by the closeout DoD.
- prev1-t09 (resume of `bw2-prev1-impl-1`, DONE) at `b7536b1be`: L2 docs and
  `current-state.md`; L3 analyze skill reports `claude_md_blocks_shim_removal`
  (failing first, 6/6 after); apply has no gap. `pnpm check` 0/11 cached,
  `pnpm lint` exit 0.
- Final gate re-review (`codex-6-sol-xhigh`, threshold high) at `7b389c5af`:
  `review_completed_gate_passed`, 0 Critical/High, 2 Medium, 2 Low
  (`reviews/archived/final-review-2026-09-28T164247Z.md`). M1 (live PR title
  and body stale) and M2 (summary and recap stale) and L2 (DoD record predates
  the revision) are the pending closeout steps: summary and recap are fully
  regenerated and the live PR is refreshed from the hand-off before the exit
  gate, and the DoD is rerun at the final head. L1 (two joined log items)
  fixed by root.

## Implementation Log

Chronological execution is recorded per phase under Orchestration Runs above
(dispatch requests, commits, reviews, gates, recovery events, and operator
dispositions). Sessions: 2026-09-27 (planning, p01) and 2026-09-28 (p01 gate
through closeout).

## Plan Gate Feedback (quick-start, QS-12)

The configured quick-start gate (`oat-project-quick-start`, `onFailure: block`,
`maxAttempts: 2`, target `codex-6-sol-xhigh`, inline Codex runtime) blocked on
both attempts; every finding was resolved in `plan.md`:

- Attempt 1 (`reviews/archived/artifact-plan-review-2026-09-27T150947Z.md`):
  H1 re-verify identity and exact managed content at apply time before removing
  a CLAUDE.md shim (with changed-content and symlink-replacement controls); H2
  make leftover CLAUDE.md detection repository-wide and independent of the
  mutation exclusions at sync, `--json`, validate, and doctor; M1 accept `none`
  only in the same task as its behavior (p02-t02).
- Attempt 2 (`reviews/archived/artifact-plan-review-2026-09-27T151608Z.md`):
  H1 open the existing `AGENTS.md` with `O_WRONLY | O_APPEND | O_NOFOLLOW`
  (the flags as written opened read-only and failed with `EBADF`), plus a
  real-filesystem success assertion.

Attempts are exhausted, so plan readiness is an operator decision. Operator
decision (2026-09-27): proceed to implementation with the findings resolved in
the plan.

## Deferred Findings (Medium)

- p04 re-review M2 (`reviews/archived/p04-review-2026-09-28T025845Z.md`) and
  L1-L3: moot after revision 1 withdrew the recon validator;
  `BL-260928-settle-codex-read-authority` was rescoped to a live check that
  Codex `/recon` lanes launch `contract-enforced` on the released CLI.

- p01 gate M1 (`reviews/archived/p01-review-2026-09-28T001719Z.md`): two concurrent guidance invocations
  can both pass the absent-block check and append the same managed block
  twice; the duplicate markers make later runs return `blocked` until the file
  is repaired by hand. Deferred because a correct fix needs cross-process
  coordination on `AGENTS.md` (a lock file plus a re-read under the lock),
  which is larger than a sweep fix; the pre-wave behavior never wrote an
  existing file, and concurrent `oat` guidance runs against one checkout are
  rare. Resurface at final review; if not fixed in-wave, file a backlog item.

## Deviations from Plan / Design

- p02 gate Low address-now fix (analyze/apply nested `CLAUDE.md` wording) is
  in bookkeeping commit `e13fa06cd`, not a separate `fix(p02)` commit (its
  commit was rejected by commitlint's 100-character body line limit and the
  staged files rode along with the next commit). History was not rewritten.

Document any intentional deviations from the original plan, spec, or design. Include accepted review findings where the shipped implementation is source of truth and a lifecycle artifact needs alignment.

| Task / Review         | Source Artifact                                                   | Planned / Documented                                               | Actual / Accepted                                                                              | Reason                                                                                                               | Source of Truth                          | Follow-up                                          |
| --------------------- | ----------------------------------------------------------------- | ------------------------------------------------------------------ | ---------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------- | ---------------------------------------- | -------------------------------------------------- |
| p03-t03 / p03 reviews | discovery.md Key Decision 4                                       | Commit the task ledger before reviewer dispatch                    | Recovery-marker settlement also pre-review; phase row nonterminal until fixes and gates settle | p03 review M1/M2 and gate M2                                                                                         | Implementation                           | None                                               |
| p04-t02 / p04 reviews | plan.md p04-t02                                                   | Validator checks envelope fields                                   | Also enforces read, write, tool, and schema authority; inline output schemas dropped           | Four p04 review and gate rounds                                                                                      | Implementation                           | `BL-260928-settle-codex-read-authority`            |
| p04 gate              | plan.md Reviews                                                   | Gate passes within its retry budget                                | Completed under operator override after two blocked attempts                                   | Operator decision 2026-09-28                                                                                         | Implementation (final review covers p04) | None                                               |
| p02-t03               | backlog item AC4                                                  | Warn about leftover CLAUDE.md files                                | Case variants deliberately not warned about                                                    | Case-insensitive match flagged real provider docs                                                                    | Implementation                           | None                                               |
| p-rev1 (revision)     | plan.md p04-t02                                                   | Recon validator ships; reviewer validates recon lanes              | Validator withdrawn; recon restored to `main`; reviewer no longer launches `recon-worker`      | Operator direction 2026-09-28                                                                                        | Implementation                           | `BL-260928-settle-codex-read-authority` (rescoped) |
| p-rev1 (revision)     | discovery.md Key Decision 2 / `DR-260927-claude-md-shims-are-opt` | `documentation.*` keys; unconditional removal of OAT-managed shims | `instructions.claude.*` keys; all-or-nothing removal                                           | Operator direction 2026-09-28 (`DR-260928-name-the-claude-md-shim-keys`, `DR-260928-remove-no-claude-md-shim-while`) | Implementation                           | None                                               |

## Test Results

Final verification (Step 12) after Revision 1 at `c95e17aad`, full Definition
of Done in CI order, every gate exit 0: `pnpm check`, `pnpm type-check`,
`HOME=$(mktemp -d) pnpm exec turbo run test --force` (10/10 tasks, 0 cached,
no replays), `pnpm build`, `check:skill-bumps`, `release:check-versions`
(after `git fetch origin main`), `release:validate`, `build:docs`,
`test:smoke` 163/163, `test:skills` 660/660, `test:scripts`, `pnpm lint`,
`pnpm format`. The pre-revision run at `f0901755c` is superseded.
Per-phase verification is recorded under Orchestration Runs.

## Final Summary (for PR/docs)

**What shipped:**

- **CLAUDE.md shims are opt-in.** `instructions.claude.shims` in
  `.oat/config.json` (`none | pointer | symlink | copy`, default `none`)
  persists the choice and `instructions.claude.excludes` lists directories
  sync leaves alone (clean rename of the earlier `documentation.*` keys, no
  compatibility read); `--strategy` overrides one run. Under `none`, `oat instructions sync` creates
  no `CLAUDE.md`, removes only exact OAT-created shims (pointer, sibling
  symlink, identical copy) after apply-time identity and content re-checks,
  and never removes a hand-written `CLAUDE.md` beside an `AGENTS.md`,
  `CLAUDE.local.md`, `.claude/CLAUDE.md`,
  excluded or docs trees, nested git checkouts, or any `CLAUDE.md` an
  `AGENTS.md` resolves to (a lone `CLAUDE.md` with no `AGENTS.md` is adopted
  into a new `AGENTS.md` and removed). A repository-wide warning names every remaining
  `CLAUDE.md` that would make Claude Code ignore AGENTS.md, with two options
  (remove it, or set a shim strategy and rerun sync), and names linking
  `AGENTS.md` files first. Validate, doctor, and the agent-instructions skills
  follow the same rules; this repository's 11 shims were removed.
  Removal is all or nothing: while any `CLAUDE.md`, `CLAUDE.local.md`, or
  `.claude/CLAUDE.md` with its own content exists (including in excluded
  trees), sync removes no shim and reports `claude_md_blocks_shim_removal`
  with the files it would have removed, a docs link, and the fixes (move the
  content into `AGENTS.md` and remove the file, or set a shim strategy); a
  blocker an `AGENTS.md` links to gets replace-then-remove advice, and kept
  shims get no per-file "remove it" advice. Rules and provider sync
  (`.claude/rules`, skills, agents) are independent of the shim setting.
- **AGENTS.md guidance appends instead of demanding manual patches.** An
  absent managed block is appended with `O_WRONLY | O_APPEND | O_NOFOLLOW`
  after `fstat` identity checks; hard-linked, unwritable, swapped, or
  non-regular targets get the zero-write manual patch with the real cause.
  `oat pjm init` prints guidance once; every `--project-guidance` consumer acts
  or rejects; `oat init` without `--setup` honors it; zero-pack guidance is
  skipped; new read-only `oat tools guidance [--json]`; the tools block names
  only the skills directories installed packs use.
- **Backlog archive rewrites inbound references.** `oat backlog archive`
  rewrites `.oat/repo` Markdown links, repository-root path strings, and
  whole-span code citations to the moved item (URLs, symlinks, fenced code,
  and working links elsewhere are left alone; unresolvable local forms warn)
  and retries on re-run.
- **Recon.** `oat-reviewer` no longer launches `recon-worker`; only the
  `recon` skill does, with its evidence-packet machinery. The recon skill is
  unchanged from `main` (the validator built in p04 was withdrawn in the
  revision).
- **Lifecycle skills.** Quick-mode discovery routes straight to quick-start in
  next and progress; Lite records `absorbed_projects` /
  `absorbed_backlog_ids`; implement commits the phase task ledger before the
  per-phase reviewer is dispatched and keeps the phase row nonterminal until
  review fixes and gates settle. Exit-gate freshness uses
  `effective-delta-v2`, which ignores `.oat/projects/**` and `.oat/repo/**`
  record changes; v1 generations keep their rules.
- **Repairs and CI.** Five heading-swallowing bare fences repaired in agent
  roles and templates, with the fence scanner extended to `.agents/agents`
  and `.oat/templates`; `packages/control-plane` gains `check`, `check:fix`,
  and `lint:fix`, pinned by the lint-enrollment test; the agents-md
  unsafe-target test race is fixed.
- Lockstep public packages bumped to 0.3.9; fourteen backlog items archived:
  twelve shipped by this wave, plus `BL-260927-record-owner-overrides` and
  `BL-260901-add-corrective-revision` closed as superseded by the review-cap
  consolidation in the pre-wave decisions pass. The branch also carries that
  pass's six decision records (`DR-260927-*`) and the new backlog items it
  created.

**Behavioral changes (user-facing):**

- `oat instructions sync` no longer creates `CLAUDE.md` shims by default and
  removes OAT-created ones on its next run; a lone `CLAUDE.md` is adopted into
  a new `AGENTS.md` and removed; opt back in with
  `oat config set instructions.claude.shims pointer`.
- Removal is all or nothing: while a `CLAUDE.md` with its own content exists,
  sync removes no shim and `sync`/`validate` exit 1 with the reason and fixes.
- `documentation.instructionSyncStrategy` and
  `documentation.instructionPointerExcludes` are renamed to
  `instructions.claude.shims` and `instructions.claude.excludes`; the old keys
  are ignored.
- After upgrading, `oat instructions validate` exits 1 while old shims remain,
  until `oat instructions sync` removes them.
- `oat instructions validate` no longer reports a missing `CLAUDE.md` as drift
  under the default; it warns about leftover `CLAUDE.md` files instead.
- AGENTS.md guidance writers append absent blocks (exit 0) instead of printing
  a manual patch and exiting 1.
- `oat backlog archive` edits other `.oat/repo` files to repoint links.

**Key files / modules:**

- `packages/cli/src/commands/instructions/**`, `packages/cli/src/config/oat-config.ts`,
  `packages/cli/src/config/resolve.ts` - shim strategy, removal, warnings
- `packages/cli/src/commands/shared/agents-md.ts`,
  `packages/cli/src/commands/init/**`, `packages/cli/src/commands/pjm/**`,
  `packages/cli/src/commands/tools/guidance/**` - guidance append and emission
- `packages/cli/src/commands/backlog/{archive.ts,rewrite-references.ts}` -
  reference rewriting
- Skills: oat-doctor 2.0.2, oat-agent-instructions-analyze 1.12.4,
  oat-agent-instructions-apply 1.7.3, oat-project-next 1.1.3,
  oat-project-progress 1.4.3, oat-project-lite 1.1.6, oat-project-implement
  2.3.14; agent roles oat-reviewer 1.2.10, oat-codebase-mapper
  1.0.2, skeptical-evaluator 1.0.1

**Verification performed:**

- Failing-first tests for every behavior change; neutralize-and-restore proofs
  for every named negative control (append identity checks, shim deletion
  guards, the all-or-nothing removal block, rewriter symlink and resolution guards,
  lint and check pins); failing-first pins for the reviewer
  `recon-worker` removal and the `effective-delta-v2` pathspecs.
- Per-phase Opus 5.5 high root reviews with fix loops and Codex
  `codex-6-sol-xhigh` phase gates on every phase, including revision p-rev1
  (p04 completed under an operator override after its gate budget was
  exhausted).
- Full Definition of Done re-run after Revision 1 at `c95e17aad`, all gates
  exit 0 with 0 of 10 test tasks cached (see Test Results).

**Design deltas (if any):**

- Key decision 4's pre-review bookkeeping was refined during p03 review:
  recovery-marker settlement belongs to the pre-review commit, and the phase
  row stays nonterminal until review fixes and gates settle.
- Revision 1 (operator feedback on PR #332): renamed the shim keys under
  `instructions.claude`, made removal all or nothing, pinned rules-sync
  independence, added `effective-delta-v2`, and withdrew the recon validator
  and the reviewer's `recon-worker` path (recon restored to `main`).
- Case variants of `CLAUDE.md` are deliberately not warned about (they matched
  real provider docs); documented.
- Follow-ups filed: `BL-260928-serialize-concurrent-agents-md`,
  `BL-260928-keep-instructions-sync-force`,
  `BL-260928-route-quick-mode-discovery`,
  `BL-260928-settle-codex-read-authority`,
  `BL-260928-harden-the-backlog-reference`; `BL-260829-order-phase-bookkeeping-before`
  stays open for live observation.

## References

- Plan: `plan.md`
- Discovery: `discovery.md`
- Decision: `.oat/repo/reference/decisions/DR-260927-claude-md-shims-are-opt.md`
- Backlog review: `.oat/repo/pjm/backlog/reviews/backlog-and-roadmap-review.md`
