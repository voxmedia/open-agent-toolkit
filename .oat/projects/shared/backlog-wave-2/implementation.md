---
oat_status: in_progress
oat_ready_for: null
oat_blockers: []
oat_last_updated: 2026-09-27
oat_current_task_id: p05-t10
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

| Phase   | Status      | Tasks | Completed |
| ------- | ----------- | ----- | --------- |
| Phase 1 | complete    | 8     | 8/8       |
| Phase 2 | complete    | 8     | 8/8       |
| Phase 3 | complete    | 5     | 5/5       |
| Phase 4 | complete    | 7     | 7/7       |
| Phase 5 | in_progress | 10    | 9/10      |

**Total:** 37/38 tasks completed

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

**Status:** in_progress
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

**Status:** pending
**Commit:** -

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

### PR Requirements (hand-off to oat-project-pr-final)

- Title names the removal with a breaking marker, for example
  `feat!: stop creating and auto-remove OAT-managed CLAUDE.md shims by default (wave 2, lockstep 0.3.9)`;
  GitHub release notes list PR titles only.
- Body opens with a **Behavior change** callout: `oat instructions sync` no
  longer creates `CLAUDE.md` shims by default and removes OAT-managed shims
  (exact `@AGENTS.md` pointer, sibling symlink, or identical copy) on its next
  run; hand-written `CLAUDE.md` files, and any `CLAUDE.md` an `AGENTS.md` links
  to, are kept and reported. Opt back in with
  `oat config set documentation.instructionSyncStrategy pointer` and rerun
  `oat instructions sync`.
- Body also lists: append-only AGENTS.md guidance, `--project-guidance`
  honored or rejected everywhere, `oat tools guidance`, backlog archive link
  rewriting, the recon assignment validator, control-plane `check`.

## Implementation Log

Chronological log of implementation progress.

### 2026-09-27

**Session Start:** {time}

- [x] p01-t01: {Task name} - {commit sha}
- [ ] p01-t02: {Task name} - in progress

**What changed (high level):**

- {short bullets suitable for PR/docs}

**Decisions:**

- {Decision made and rationale}

**Follow-ups / TODO:**

- {anything discovered during implementation that should be captured for later}

**Blockers:**

- {Blocker description} - {status: resolved/pending}

**Session End:** {time}

---

### 2026-09-27

**Session Start:** {time}

{Continue log...}

---

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

- p04 re-review M2 (`reviews/archived/p04-review-2026-09-28T025845Z.md`): Codex workers read through their
  command-execution tool only, which the `READ_ONLY_TOOLS` allowlist rejects,
  so Codex recon lanes fail validation and fall back to inline coverage.
  Deferred by the operator with L1 (weaker `writePath` form checks), L2 (web
  tools allowed without URL sources), and L3 (mode not checked against
  artifact kind): file one follow-up backlog item at closeout.

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

| Task / Review | Source Artifact | Planned / Documented | Actual / Accepted | Reason | Source of Truth | Follow-up |
| ------------- | --------------- | -------------------- | ----------------- | ------ | --------------- | --------- |
| -             | -               | -                    | -                 | -      | -               | -         |

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
