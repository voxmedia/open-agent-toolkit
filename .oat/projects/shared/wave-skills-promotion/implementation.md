---
oat_status: in_progress
oat_ready_for: null
oat_blockers: []
oat_last_updated: 2026-07-18
oat_current_task_id: p06-t01 # RC gate open (f212d630); gate-open plan revision next
oat_generated: false
---

# Implementation: wave-skills-promotion

**Started:** 2026-07-18
**Last Updated:** 2026-07-18

> This document is used to resume interrupted implementation sessions.
>
> Conventions:
>
> - `oat_current_task_id` always points at the **next plan task to do** (not the last completed task).
> - When all plan tasks are complete, set `oat_current_task_id: null`.
> - Reviews are **not** plan tasks. Track review status in `plan.md` under `## Reviews`.
> - Keep phase/task statuses consistent with the Progress Overview table so restarts resume correctly.
> - Before running the `oat-project-pr-final` skill, ensure `## Final Summary (for PR/docs)` is filled with what was actually implemented.

## HiLL / Checkpoint Configuration

- `oat_plan_hill_phases: ['p05', 'p06']` — resolved from `workflow.hillCheckpointDefault: final`, applied per mergeable delta: p05 ends this run's release-ready delta (p06 is RC-gated and merges separately with its own checkpoint). Recorded here because the literal "final phase" (p06) cannot complete in this run.
- `oat_auto_review_at_hill_checkpoints: true` — from `workflow.autoReviewAtHillCheckpoints`.
- Phase gate review (`oat_phase_review_gate`): enabled for p05, review_type code, exit_nonzero_on important.
- Dispatch policy: managed/high (project state); cursor target `gpt-5.6-sol-high` (enforced, model arg).

## Progress Overview

| Phase                                  | Status    | Tasks | Completed |
| -------------------------------------- | --------- | ----- | --------- |
| Phase 1: Port + toolkit integration    | completed | 4     | 4/4       |
| Phase 2: §2 queue + genericization     | completed | 9     | 9/9       |
| Phase 3: Dispositions                  | completed | 3     | 3/3       |
| Phase 4: Docs                          | completed | 2     | 2/2       |
| Phase 5: Validation + release          | completed | 5     | 5/5       |
| Phase 6: Explainer integration (GATED) | blocked   | 4     | 0/4       |

**Total:** 29/33 tasks completed (23 executable; 4 gated on explainer-kit RC)

---

## Phase 1: Port + toolkit integration

**Status:** completed
**Started:** 2026-07-18
**Completed:** 2026-07-18

### Phase Summary

**Outcome (what changed):**

- Both wave skills live verbatim in `.agents/skills/` (byte-identical to frozen sources, reviewer-verified per file at commit A) with `bootstrap-group.sh` executable.
- Workflow pack manifest + bundle script registered (bundle-consistency RED→GREEN); full CLI suite green.
- Provider views synced: 4 manifest entries (claude + cursor × 2 skills); codex reads natively from `.agents/skills` (adapter declares `nativeRead: true`).
- Fix loop shipped a real toolkit bug fix: `copyDirectory` now preserves file modes (fresh installs previously stripped the execute bit from nested skill scripts — first nested executable ever bundled).

**Key files touched:**

- `.agents/skills/oat-wave-execute/**`, `.agents/skills/oat-wave-program/**` — verbatim port
- `packages/cli/src/commands/init/tools/shared/skill-manifest.ts`, `packages/cli/scripts/bundle-assets.sh` — registration
- `packages/cli/src/fs/io.ts` (+2 regression tests) — mode-preservation fix
- `.oat/sync/manifest.json` + claude/cursor view symlinks

**Verification:**

- Run: bundle-consistency + full CLI suite (250 files / 3001 tests), lint, type-check, byte-diff port purity, fresh temp-repo install with built CLI.
- Result: pass (round 2; round 1 failed on the install execute-bit Critical, fixed in `3aa46d5c`).

### Task p01-t01: Verbatim copy — **completed**, commit `5a3179a4`

### Task p01-t02: Manifest + bundle registration — **completed**, commit `27126351` (+ fix commit `3aa46d5c` from review round 1). p01-t03 intentionally unused (merged at plan review).

### Task p01-t04: Provider views — **completed**, commit `3d1ff180` (4 views + manifest; no unrelated deletions — B3-class inspection clean)

### Task p01-t05: Fresh-install verification — **completed**, no commit (verification-only)

**Evidence (re-run after fix):** `pnpm build && bash packages/cli/scripts/bundle-assets.sh`; temp repo via `mktemp -d` + `git init`; `node packages/cli/dist/index.js --cwd "$tmp" tools install workflows --scope project` (36 skills); `providers set --enabled claude,cursor,codex`; `sync --scope project`. Asserted: both skill trees + SKILL.md, all 3 asset templates, installed `bootstrap-group.sh` mode 755 + `test -x` pass, no `tests/` dir, 4 wave manifest entries, claude+cursor views on disk, codex native-read. Temp dir cleaned. (Round-1 evidence was invalid — original check only verified the bundle copy, not the installed copy; reviewer's independent reproduction caught it.)

**Notes / Decisions:**

- `pnpm run cli` source-dev wrapper cannot auto-sync an external `--cwd` (repo-relative tsconfig resolution); built CLI unaffected — candidate observation for p03-t03 triage.
- Gate-tooling observation for p03-t03: cross-family gate prompts that name a reviewer-dispatching skill can recurse (two concurrent gate runs observed during plan gate).

---

## Phase 2: §2 queue + genericization

**Status:** completed
**Started:** 2026-07-18
**Completed:** 2026-07-18

### Phase Summary

**Outcome (what changed):**

- All six §2 queue items applied, one commit each (B1 `52c59aa8`, B2 `98267802`, B3 `1ef49623`, B4 `db8b28a0`, B5 `d6440606`, B6 `4b32c611`); traceability table below in Implementation Log.
- Genericization complete with 69-row equivalence checklist (`references/equivalence-checklist.md`), reviewer-sampled adversarially (21 rows): intent preserved everywhere; one over-deleted provenance citation caught in review and restored (`7601d2d6`).
- Versions: `oat-wave-execute` 1.5.0, `oat-wave-program` 1.1.0; release-collapse (1.4.1+1.5.0 → 1.5.0) recorded in the t08 commit body; no dogfood/status prose remains.
- p02-t09 resolved as a **verified no-op**: provider views are symlinks, so text edits flow through; re-run `oat sync --scope all` reports "No changes required."

**Verification:** lint + type-check green; bash-3.2 syntax + construct checks on `bootstrap-group.sh`; byte-identical asset templates vs frozen sources; reviewer round 1 FAIL (1 Important) → round 2 PASS.

**Notes / Decisions:**

- Mid-phase sync-cleanliness event: `oat sync --scope all` materialized 24 supported-catalogue cursor dispatch-variant roles (oat-managed). Implementer correctly refused to stage (task-boundary discipline = the just-codified B3 class); root committed them separately (`08d7b205`); sync now idempotent-clean.

### Tasks

- p02-t01..t06: **completed** (queue commits above)
- p02-t07: **completed**, `d544b622` (checklist 69 rows: 44 execute / 25 program)
- p02-t08: **completed**, `de16cb5d` + fix `7601d2d6` (restored DR-260713-extract provenance citation; EX-I07 corrected)
- p02-t09: **completed (no-op)** — see Phase Summary; root catalogue commit `08d7b205` adjacent but outside task scope

---

## Phase 3: Dispositions

**Status:** completed
**Started:** 2026-07-18
**Completed:** 2026-07-18

### Phase Summary

**Outcome (what changed):**

- validate-plan rejection + help now state the singleton rule and the ungrouped-phase alternative (`cefdc4a2`, TDD).
- Ten §3 dispositions durable: 4 active deferred items with owner/trigger/groupings (`68906d88` + owner fix `2d889c19`); tracked-config guard filed-and-archived `wont_do` with root-cause rationale; triage closed 2 as already-fixed on main (`--scope all` placement; resolver flag conflict — both independently re-verified by the reviewer) and filed 3 (`BL-260718-harden-full-surface-gate` with both fresh gate observations, `BL-260718-add-generated-runbook`, `BL-260718-warn-when-oat-sync-uses`) (`50396aa3`).
- Every packet §3 row has a traceable disposition (reviewer cross-checked row-by-row).

**Verification:** CLI suite 250 files / 3002 tests; lint; type-check; pjm lifecycle checks. Review round 1 FAIL (1 Critical: missing owners) → round 2 PASS.

**Notes / Decisions:**

- Pre-existing `oat pjm doctor` baseline failure (10 older records, template frontmatter; exit 2 at phase base too) — out of scope; candidate for a follow-up backlog item at closeout.

### Tasks

- p03-t01: **completed**, `cefdc4a2`
- p03-t02: **completed**, `68906d88` + fix `2d889c19` (owner lines; repo convention keeps `assignee: null`)
- p03-t03: **completed**, `50396aa3` (dispositions: 2 closed-as-fixed, 3 filed)

---

## Phase 4: Docs

**Status:** completed
**Started:** 2026-07-18
**Completed:** 2026-07-18

### Phase Summary

**Outcome:** wave-workflow docs page shipped (`4648e3d8`) with authored `## Contents` navigation, descriptive artifact-format section + explicit "not a stable contract" note pointing at the deferred backlog grouping; generated index regenerated + docs build green (`4b86f380`); review round 1 caught a judgment-attribution error ("composes" assigned to oat-wave-program) — fixed in `1a6359ec`, round 2 PASS with independent ownership-language sweep.

**Notes / Decisions:**

- `oat docs nav sync` is MkDocs-only; Fumadocs equivalent = explicit generate-index + build. Filed `BL-260718-support-fumadocs-in-oat-docs`.
- Bare `oat docs generate-index` writes a stray repo-root index.md (cwd-relative defaults). Filed `BL-260718-fix-oat-docs-generate-index`.

### Tasks

- p04-t01: **completed**, `4648e3d8` + fix `1a6359ec` (orchestrator-judgment wording)
- p04-t02: **completed**, `4b86f380`

---

## Phase 5: Validation + release readiness

**Status:** completed
**Started:** 2026-07-18
**Completed:** 2026-07-18

### Phase Summary

**Outcome (what changed):**

- Mini-wave fixture shipped (`5d06bdb9`, 16 files): throwaway-repo materializer under `$TMPDIR`, 3 toy plans + index (p01+p02 write-disjoint, p03 ungrouped finale), DoD gate toggleable via `FIXTURE_GATE_FAIL=1`; bash-3.2 verified; bundle-excluded.
- Dry-run procedure README (`dbdb8631`): six stages with pass criteria, happy + unhappy legs.
- Dry-run EXECUTED against the promoted skills (`2b36ddd3`) — record below.
- Lockstep release bumps 0.1.73 → 0.2.0 across all five public packages + regenerated `public-package-versions.json` (`7f16bc02`); `release:validate` + full gates green (implementer AND reviewer runs).
- W6 handoff mini-runbook (`c05982d9`): pins `@open-agent-toolkit/cli@0.2.0`, migration sequence (delete repo-local copies → `oat tools update` → `oat sync --scope all`), row-stomp observation task closing `BL-260718-remove-post-w6-reviews-row`, regression protocol via equivalence checklist + lockstep patch.

### Dry-Run Record (p05-t03, executed 2026-07-18)

- Setup: clean fixture under `$TMPDIR`; gate executable.
- Program `new`: coverage invariant 3 indexed plans ↔ 3 program rows — PASS.
- Composition: p01+p02 write-disjoint group; p03 ungrouped — PASS.
- Bootstrap: bash 3.2; both lanes `view-parity=ok`, `git_clean=pass` — PASS.
- Happy leg: 6 task commits, 3 asserted `--no-ff` merges with pre-merge pwd/branch asserts, rebase choreography, both fan-in gates — PASS.
- Unhappy leg: `FIXTURE_GATE_FAIL=1` → gate exit 1 → closeout parked → stored verification record written (B5 discipline) → rerun passed and unparked — PASS.
- Wave-close: 3 rows → `done`; ledger records merged status, fixture PR, SHA, completion record — PASS.
- Findings dispositioned: (1) fixture pnpm hygiene — node_modules ignore + normalized lockfile committed (fixture-scoped); (2) README formatter-resolution + bootstrap assertions clarified (`git_clean=pass` required); (3) **zero promoted-skill-text or bootstrap-group.sh defects found**.

### Tasks

- p05-t01: **completed**, `5d06bdb9` — fixture + toggleable gate
- p05-t02: **completed**, `dbdb8631` — procedure README
- p05-t03: **completed**, `2b36ddd3` — dry-run executed; fixture-only fixes; checklist outcome appended (69 prior rows byte-preserved)
- p05-t04: **completed**, `7f16bc02` — 5×0.2.0 + version asset; release:validate green
- p05-t05: **completed**, `c05982d9` — W6 runbook (lowercase `w6` in subject: commitlint constraint, verified no lost commit)

---

## Phase 6: Explainer integration (RC-GATED)

**Status:** blocked (gate: packaged explainer-kit v1 RC; mandatory gate-open plan revision + re-review before execution)
**Started:** -

Tasks: p06-t01 (recipe), p06-t02 (close-callers), p06-t03 (personal-wrapper migration), p06-t04 (Phase 6 release choreography).

---

### Revision Received: GitHub PR #158 Bugbot Review

**Date:** 2026-07-18
**Source:** PR #158 Bugbot comments (4 Medium: 3609070068 fixture grep, 3609072481 sync-commit status, 3609072482 unquoted FILES, 3609163349 stale p06 state)

**New tasks added:** prev1-t01..t03 (Phase p-rev1) — completed 2026-07-18: 57c1ce7f, a7dc345c, 582eeff2; review passed (1 Medium root-fixed: residual stale p06 prose)

**Next:** Execute revision tasks via oat-project-implement.

### Revision Received: stoa W6-migration report

**Date:** 2026-07-18
**Source:** references/w6-migration-report-2026-07-18.md (2 findings: installer exec-bit defect via npm mode-stripping; runbook §2 stale-view gap) + §1 content-verify improvement

**New tasks added:** prev2-t01..t03 — completed same day: 2533d6a0 (chmod fix, both install paths, RED→GREEN on 0644 fixtures), 10481e1a (runbook hardening), f9257c72 (lockstep 0.2.1). Review: round 1 PASS clean; reviewer confirmed the fix would have prevented stoa's defect on both paths.

## Orchestration Runs

_Each run from `oat-project-implement` appends an entry below._

<!-- orchestration-runs-start -->

_Orchestration runs from `oat-project-implement` are appended here, most-recent-first within the file but append-only at the bottom of the log._

### Run 1 — 2026-07-18 (in progress)

- Branch: `wave-skills-promotion`; Tier 1 (Cursor-native subagents); policy managed/high → `gpt-5.6-sol-high` (enforced, model arg); retry limit 2 (default).
- Phase Outcomes:

| Phase  | Implementer                                              | Tasks | Review                                                           | Fix loops                                   | Result |
| ------ | -------------------------------------------------------- | ----- | ---------------------------------------------------------------- | ------------------------------------------- | ------ |
| p01    | oat-phase-implementer-gpt-5-6-sol-high (resumed for fix) | 4/4   | round 1 FAIL (1 Critical, 1 Important) → round 2 PASS (0/0/0/0)  | 1 (installer mode-preservation, `3aa46d5c`) | pass   |
| p02    | oat-phase-implementer-gpt-5-6-sol-high (resumed for fix) | 9/9   | round 1 FAIL (1 Important) → round 2 PASS (0/0/0/0)              | 1 (provenance citation restore, `7601d2d6`) | pass   |
| p03    | oat-phase-implementer-gpt-5-6-sol-high (resumed for fix) | 3/3   | round 1 FAIL (1 Critical) → round 2 PASS (0/0/0/0)               | 1 (owner lines, `2d889c19`)                 | pass   |
| p04    | oat-phase-implementer-gpt-5-6-sol-high (resumed for fix) | 2/2   | round 1 changes-requested (1 Important) → round 2 PASS           | 1 (ownership wording, `1a6359ec`)           | pass   |
| p05    | oat-phase-implementer-gpt-5-6-sol-high                   | 5/5   | round 1 FAIL (1 Important — root bookkeeping gap) → round 2 PASS | 1 root-side (`1e336990`, impl record)       | pass   |
| p-rev1 | oat-phase-implementer-gpt-5-6-sol-high                   | 3/3   | round 1 PASS (1 Medium, root-fixed inline)                       | 0                                           | pass   |
| p-rev2 | oat-phase-implementer-gpt-5-6-sol-high                   | 3/3   | round 1 PASS (0/0/0/0 — first clean round 1)                     | 0                                           | pass   |

- Dispatch stamps: `Dispatch: scope=p01 action=implementation role=implementer producer=unknown provenance=declared model_axis=selected:gpt-5.6-sol-high effort_axis=not-applicable dispatch_policy=high dispatch_ceiling=high target=oat-phase-implementer-gpt-5-6-sol-high` · `Dispatch: scope=p01 action=review role=reviewer producer=oat-phase-implementer-gpt-5-6-sol-high provenance=declared model_axis=selected:gpt-5.6-sol-high effort_axis=not-applicable dispatch_policy=high dispatch_ceiling=high target=oat-reviewer-gpt-5-6-sol-high`
- Selection reason: native-catalog; candidates: [gpt-5.6-sol-high]. Fix continuation resumed the original implementer handle (continuation event 1); re-review resumed the original reviewer handle (round 2).
- Parallel groups: none (sequential plan).
- Outstanding: round-1 Important (implementation.md evidence) resolved by this bookkeeping entry.

<!-- orchestration-runs-end -->

---

## Implementation Log

Chronological log of implementation progress.

### 2026-07-18

**Session Start:** 11:25 CDT

- Preflight: Tier 1 (Cursor-native subagents, available without auth); dispatch policy managed/high → `gpt-5.6-sol-high` (enforced).
- HiLL: `['p05','p06']` per-delta final interpretation of `hillCheckpointDefault: final` (p06 gated); auto-review enabled.

**Blockers:**

- Phase 6 blocked on explainer-kit v1 packaged RC (expected — plan-declared gate).

### Phase 2 queue traceability (implementer-provided)

| Item | Description                                                                     | Commit SHA                                 |
| ---- | ------------------------------------------------------------------------------- | ------------------------------------------ |
| 1    | Scaffold placeholder handling is verify-only on oat ≥0.1.65.                    | `52c59aa8bd4831ee9e106092da17f017b6c64dce` |
| 2    | Every merge is preceded by mandatory cwd and branch assertions.                 | `98267802ec7ebbf2d0e074856c941e3dd9922cc9` |
| 3    | Bootstrap verifies provider-view parity and choreography inspects sync commits. | `1ef49623f96a99800ac079fe6954469479d0e769` |
| 4    | Integration gates after every fan-in are a named standing rule.                 | `db8b28a08506363a4252d6f2f6b0a0c2d3506491` |
| 5    | Every fix disposition produces a stored verification record.                    | `d6440606a3384c6b08b36a2747c72c8296a8470a` |
| 6    | Fix continuations prefer resuming the live original implementer handle.         | `4b32c611423fdbfcfe221f0594e408abcbefdf36` |

---

## Deviations from Plan / Design

| Task / Review | Source Artifact | Planned / Documented                | Actual / Accepted                                 | Reason                                               | Source of Truth | Follow-up |
| ------------- | --------------- | ----------------------------------- | ------------------------------------------------- | ---------------------------------------------------- | --------------- | --------- |
| HiLL config   | plan.md         | `final` = literal final phase (p06) | `['p05','p06']` — final phase per mergeable delta | p06 is RC-gated; literal reading = 0 pauses this run | plan.md         | none      |
| p02-t09       | plan.md         | re-sync commits wave-view changes   | verified no-op (symlinked views; sync idempotent) | text edits flow through symlinked views              | Phase 2 notes   | none      |

## Test Results

| Phase | Tests Run                                                                                                | Passed | Failed | Coverage |
| ----- | -------------------------------------------------------------------------------------------------------- | ------ | ------ | -------- |
| 1     | CLI suite 3001 tests (250 files) + 2 new regression tests; lint; type-check                              | all    | 0      | n/a      |
| 2     | lint + type-check + bash-3.2 + citation-set + asset byte-diffs                                           | all    | 0      | n/a      |
| 3     | CLI suite 3002 tests + lint + type-check + pjm lifecycle checks                                          | all    | 0      | n/a      |
| 4     | docs build (build:docs) x3 runs + content rg checks                                                      | all    | 0      | n/a      |
| 5     | release:validate + lint + type-check + tests (123 smoke) + fixture both legs ×2 (implementer + reviewer) | all    | 0      | n/a      |

## Final Summary (for PR/docs)

_Covers the phases 1–5 mergeable delta. Phase 6 (explainer integration) is
RC-gated and ships as a separate, separately-versioned PR when the
explainer-kit v1 RC exists._

**What shipped:**

- `oat-wave-execute` 1.5.0 and `oat-wave-program` 1.1.0 as canonical workflow-pack skills (`.agents/skills/`), promoted from stoa's dogfooded 1.4.0/1.0.0 with all six §2 queue items applied (one traceable commit each) and stoa-isms genericized under a 69-row behavioral-equivalence checklist — no rule deleted or weakened.
- Toolkit integration: pack manifest + bundle registration (bundle-consistency-tested), provider views for claude/cursor, codex native-read.
- Also in this branch (disclosed): 24 oat-managed cursor dispatch-variant agent roles (`.cursor/agents/oat-{phase-implementer,reviewer}-*`, ~9k generated lines, commit `08d7b205`) — supported-catalogue materializations produced by `oat sync --scope all` on CLI 0.1.73 during p02, committed root-side as managed sync state (siblings of the already-tracked base roles; sync is idempotent-clean after tracking them). Verification: `oat sync` re-run reports "No changes required"; these are generated managed views, not hand-authored code.
- Installer bug fix exposed by the port: `copyDirectory` now preserves file modes (fresh installs previously stripped the execute bit from nested skill scripts); 2 regression tests.
- validate-plan now documents the singleton-group rule + ungrouped-phase alternative (message + help, TDD).
- 12 durable backlog dispositions: every packet §3 row traceable (wave CLI family, artifact-format contract, bootstrap-group TS rewrite, post-W6 watch removal, tracked-config guard archived `wont_do` with root cause); upstream triage (2 closed-as-fixed, verified; 3 filed with fresh evidence); 2 docs-CLI defects found live during p04.
- Wave-workflow docs page with authored navigation and a descriptive (explicitly non-contract) execution-program artifact format section.
- Mini-wave validation fixture (bash-3.2, toggleable-fail DoD gate) + documented dry-run procedure; dry-run EXECUTED green on both legs against the promoted skills with zero skill defects.
- Lockstep release bumps 0.1.73 → 0.2.0 across the five public packages + regenerated version asset; W6 handoff mini-runbook (version pin, migration sequence, row-stomp observation task, regression protocol).

**Behavioral changes (user-facing):**

- Workflow pack installs two new skills; installed nested skill scripts retain execute permissions; validate-plan singleton rejection message/help expanded.

**Key files / modules:**

- `.agents/skills/oat-wave-execute/**`, `.agents/skills/oat-wave-program/**` — the promoted skills
- `packages/cli/src/fs/io.ts` — mode-preservation fix
- `packages/cli/src/commands/project/validate-plan/**` — singleton guidance
- `packages/cli/src/commands/init/tools/shared/skill-manifest.ts`, `packages/cli/scripts/bundle-assets.sh` — registration
- `apps/oat-docs/docs/**` wave-workflow page; `.oat/repo/pjm/backlog/**` dispositions

**Verification performed:**

- Per-phase: root-owned reviews (each phase 1 bounded fix round → pass); p05 cross-runtime gate (codex, 2 rounds → pass).
- Fixture dry-run: happy + unhappy legs, twice (implementer + reviewer re-execution).
- Repo gates: `pnpm release:validate`, tests (CLI 3002 + workspace suites + 123 smoke), lint, type-check, build, docs build — all green; origin/main merged mid-run with green fan-in gates.

**Design deltas:**

- p02-t09 re-sync was a verified no-op (provider views are symlinks) — recorded in Deviations.
- HiLL `final` interpreted per mergeable delta (`['p05','p06']`) — recorded in Deviations.
- Fixture-only hygiene fixes during dry-run (node_modules ignore, lockfile normalization); no repo-behavior drift.

## References

- Plan: `plan.md`
- Design: `design.md`
- Spec: `spec.md`
