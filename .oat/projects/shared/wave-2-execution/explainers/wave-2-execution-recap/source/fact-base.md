# Fact base

## Confirmed claims

- **implementation:** ---
oat_status: in_progress
oat_ready_for: null
oat_blockers: []
oat_last_updated: 2026-08-26
oat_current_task_id: null
oat_generated: false
---

# Implementation: wave-2-execution

**Started:** 2026-08-26
**Last Updated:** 2026-08-26

> Resume conventions as in the Wave 1 log: `oat_current_task_id` points at the
> next task; reviews are tracked in `plan.md` `## Reviews`.

## Progress Overview

| Phase                             | Status   | Tasks | Completed |
| --------------------------------- | -------- | ----- | --------- |
| Phase 01 (warn-sync-version-skew) | complete | 1     | 1/1       |

**Total:** 1/1 tasks completed

## Autonomy Gate Provenance

- `IMPLEMENT-08`: subagent delegation authorized once for this run for
  `oat-phase-implementer` and `oat-reviewer` within the plan's bounded scopes;
  native Claude Code Task dispatch (Tier 1); no other authority widened.
- `IMPLEMENT-03` / `IMPLEMENT-04`: `oat_plan_hill_phases: ['p01']` (final phase)
  and `oat_auto_review_at_hill_checkpoints: true` explicit in `plan.md`.
- Dispatch policy preflight: managed / `high`, source `project-state`, value
  `opus`.
- Plan gate: three rounds (`a0c09a83` blocked 0C/2I → fixed; `492c318d`
  blocked 0C/2I → fixed; `cbe178ac` `ok` 0 findings) — `plan | artifact` →
  `passed`.

---

## Phase 01: warn-sync-version-skew (solo)

**Status:** complete
**Started:** 2026-08-26

### Phase Summary

**Outcome (what changed):**

- `oat sync` now surfaces producer/invoker version skew before any sync-manifest mutation (the restamp): a per-scope `versionSkew` diagnostic (`scope`, `producingVersion`, `invokingVersion`) is derived while building each scope plan, one human warning per skewed scope is logged before the dry-run/apply branch (suppressed in JSON mode), and both JSON envelopes carry the structured array (`[]` when none). Exit codes, counts, and apply eligibility are unchanged; the apply restamp is now derived from the same diagnostic so the two cannot drift; absent/invalid manifests keep their existing semantics. Lockstep bump 0.2.33 → 0.2.34.

**Key files touched:**

- `packages/cli/src/commands/sync/{sync.types,index,apply,dry-run}.ts` — diagnostic type, derivation, warning, JSON fields, restamp coupling.
- `packages/cli/src/commands/sync/index.test.ts`, `packages/cli/src/manifest/manager.test.ts` — ordering, JSON-only, equal/older/newer/absent/invalid, multi-scope, coupling cases.
- five `packages/*/package.json` + `packages/cli/assets/public-package-versions.json` — 0.2.34.

**Verification:**

- Run: focused sync + manifest suites (55/55); full DoD 8/8 exit 0 post-commit; reviewer mutation battery (reorder, delete, JSON-field delete, desync) all red; codex reviews ×2 zero findings.
- Result: pass; review rounds 1–2 → `passed`.

**Notes / Decisions:**

- The two unreachable empty-string guards in `detectVersionSkew` were removed so restamp coupling is bit-exact with the previous predicate (reviewer-verified; plan wording drift recorded as p01-r2-m2).

### Task p01-t01: Execute external plan — Surface sync producer and invoker version skew before mutation

**Status:** completed
**Commit:** b257e90861484c7628e1eab240d08340d781898b (+ fix commit 023c222948225be87955500cf6b73147ef6a75bd)

**Source plan:** `.oat/repo/reference/external-plans/2026-08-19-warn-sync-version-skew.md`

**Outcome:** `oat sync` derives a `versionSkew` diagnostic per scope when the loaded manifest's `oatVersion` differs from `OAT_VERSION`, warns once (human mode) before any apply mutation, exposes the same structured array in both JSON envelopes (including dry-run no-op), leaves exit codes/eligibility untouched, and preserves absent/invalid manifest semantics. Lockstep bump 0.2.33 → 0.2.34.

---

## Orchestration Runs

<!-- orchestration-runs-start -->

### Run 1 — 2026-08-26 (complete: 1 phase passed, 0 failed, 0 stopped)

- Branch: `wave-2-execution`; Tier 1 (native `oat-phase-implementer` /
  `oat-reviewer`); dispatch policy managed / `high` (Claude `opus`, enforced —
  Task model arg); schedule `[p01]` (solo, integration checkout).
- Phase recovery policy: default limit 10; usage ledger in `state.md`.

#### Dispatch records

- `w2-p01-impl-001` — caller `oat-project-implement`; scope `p01`; action
  implementation; role `oat-phase-implementer` (class worker); provider claude;
  dispatch_context root-native (Task tool); catalog: Task-tool model enum
  {sonnet, opus, haiku, fable} observed 2026-08-26; role_selector
  `oat-phase-implementer`; model_selector `opus` (tier-alias); effort
  not-exposed (`effort_axis=not-applicable`); selection_source native-default;
  selection_reason native-catalog; candidates_considered [opus]; task_class
  default-implementation (classification_source caller: additive typed
  diagnostic across four sync files + tests + lockstep bump; dispersed-context
  reconciliation, no novel architecture); floor satisfied; authority: write in
  the integration checkout within the source plan's scope; retry_limit 0
  (phase recovery contract owns post-commit repair); guidance
  `subagent-orchestration/references/provider-claude.md` 2026-07-25 (fresh).
  Stamp:
  `Dispatch: scope=p01 action=implementation role=implementer producer=unknown provenance=unknown model_axis=selected:opus effort_axis=not-applicable dispatch_policy=high dispatch_ceiling=opus target=opus`
- Enforcement log: `Dispatch policy: high; selected=opus; cap=opus (claude, enforced — Task model arg)`.
- Launch acceptance (2026-08-26): `w2-p01-impl-001` accepted by the Claude Code Task tool (native, `subagent_type: oat-phase-implementer`, `model: opus`), background/awaited, on the integration checkout at `e6c77e43`. child_outcome: DONE — commit `b257e90861484c7628e1eab240d08340d781898b` (12 files); focused suites 51/51; DoD 8/8 exit 0 post-commit (`pnpm test` 144s, 3682/3682; one pre-commit vitest 5s-timeout flake in `post-implement-sequence-contracts.test.ts`, green on the contract's single no-edit rerun); codex review 0.149.1 zero findings; no recovery attempt; declared-up extra file `packages/cli/src/manifest/manager.test.ts` (one focused case, authorized by the source plan's Test plan). Root re-ran the focused suites and verified the range/versions.

#### Phase Outcomes

| Phase | Worktree                                  | Implementer outcome                                                | Review outcome                         | Fix rounds | Merged |
| ----- | ----------------------------------------- | ------------------------------------------------------------------ | -------------------------------------- | ---------- | ------ |
| p01   | integration checkout (`wave-2-execution`) | DONE (b257e908 + fix 023c2229; DoD 8/8 green; codex 0 findings ×2) | passed (round 2: 0C/0I/0M/2m deferred) | 1          | n/a    |

### Review Received: p01 (round 1)

**Date:** 2026-08-26
**Review artifact:** reviews/archived/p01-review-2026-08-26T202437Z.md (reviewed head `b257e90861484c7628e1eab240d08340d781898b`, invocation auto, dispatch `w2-p01-review-001`, model opus)

**Findings:** Critical 0 · Important 0 · Medium 1 · Minor 4. Reviewer probes: reorder-class mutation (warning after the apply branch) → 1 test red; delete-class → 3 red; JSON-field delete → 5 red; focused 51/51; full DoD gates exit 0; commit touches exactly the 12 declared files.

**Dispositions (auto mode; bounded fix round via the original implementer handle, one append-only commit):**

- M1 — restamp-only apply path (`index.test.ts:513`) unpinned for the advisory; skew predicate duplicated between `index.ts:242` (`detectVersionSkew`) and `apply.ts:96` (`shouldRefreshManifestVersion`) with no test asserting agreement: **convert** — pin the restamp-only path with the same in-mock capture, and add a test (or share one predicate) proving both sites agree.
- m1 — degenerate `oatVersion` strings render a self-contradictory advisory (`index.ts:255`): **convert** — quote both values in the message.
- m2 — no multi-scope (`--scope all`) per-scope attribution coverage (`index.test.ts:533`): **convert** — parameterize the helper by scope and add one multi-scope case.
- m3 — `oat sync` advisory undocumented (`apps/oat-docs/docs/provider-sync/commands.md:48`): **address at the `document` step** (docs are shipped and already covered by this wave's bump).
- m4 — sibling commands (`init/index.ts:1187`) still restamp `oatVersion` silently: **defer — out of the source plan's scope** ("this plan only reports provenance already present in the sync manifest"); backlog candidate filed at wave close.

**Fix round 1 (`w2-p01-fix-001`, continuation through the original handle):** DONE — append-only commit `023c222948225be87955500cf6b73147ef6a75bd` (parent `11d4a2f1` root bookkeeping; task commit `b257e908` immutable; 3 files). M1 resolved by construction: `apply.ts` restamp now derives from `scopePlan.versionSkew !== undefined` (duplicate predicate and unused `OAT_VERSION` import removed); the two unreachable empty-string guards in `detectVersionSkew` were removed so the derivation is bit-for-bit the old restamp predicate; restamp-only path pinned in-mock; new coupling test (equal/older/newer). m1: both values quoted in the advisory. m2: `--scope all` cases (mixed human, mixed JSON on `user`, both stale). Focused 55/55; check/type-check 0; full `pnpm test` 3686/3686; mutations MUT-A/B/C/D/E all red (MUT-E only via the new coupling test); codex 0.149.1 zero findings. Root verified range and parent. Row `p01` → `fixes_completed`.

### Review Received: p01 (round 2, narrowed)

**Date:** 2026-08-26
**Review artifact:** reviews/archived/p01-review-2026-08-26T204852Z.md (reviewed head `023c222948225be87955500cf6b73147ef6a75bd`, range `11d4a2f1..023c2229`, prior round 1 / head `b257e908`, invocation auto, dispatch `w2-p01-review-002`, model opus)

**Findings:** Critical 0 · Important 0 · Medium 0 · Minor 2. Disposition Verification: M1, m1, m2 **verified fixed**; guard removal confirmed correct (empty `oatVersion` unreachable via `ManifestSchema` `min(1)` and `createEmptyManifest()`; the existing validation error is preserved); mutations MUT-A (2 red), MUT-B (7 red), MUT-E (1 red, the coupling test); focused 55/55; check/type-check/oxfmt/oxlint/release:check-versions exit 0.

**Verification record (fix dispositions):** what — M1/m1/m2; how — independent round-2 reviewer re-ran the mutation battery and a new probe on scratch copies; where — the round-2 artifact's `## Disposition Verification` / `## Adversarial Probes`.

**Deferred Findings (Minor):**

- p01-r2-m1 — the restamp now keys off the optional `ScopeSyncPlan.versionSkew`, so a type-legal hand-built plan omitting the field would skip restamping a stale manifest (reviewer probe PROBE-N1; `tsc` accepts it). Rationale: unreachable through `computePlans`, which always sets the field; a type-shape hardening (make the field required/nullable) is a small follow-up better taken with the sibling-command advisory work (m4 round 1); deferring avoids a third review cycle for a test-space hazard. Follow-up trigger: next touch of `sync.types.ts`.
- p01-r2-m2 — the source plan's step 1 says "only when the two non-empty strings differ" while the shipped predicate is exact inequality (the non-empty guard was unreachable and its removal is what makes restamp coupling bit-exact): **artifact wording drift in an immutable external plan**; recorded here (implementation is source of truth); no plan edit.

**Review row `p01` → `passed`.**

#### Outstanding Items

- p01-r2-m1 — restamp keyed off optional `ScopeSyncPlan.versionSkew` (deferred; trigger: next `sync.types.ts` touch; not published API — `packages/cli/package.json` declares only `bin`).
- p01-r2-m2 — source-plan step-1 wording drift (recorded; plan immutable).
- Backlog candidate (round-1 m4, scoped by final review): three sibling call sites restamp `oatVersion` silently — `init/index.ts:1187`, `remove/skill/remove-skill.ts:347`, `status/index.ts:887` — plus the pre-existing "No changes required." message on a restamp-only apply (`apply.ts:187`, the `summary.plannedOperations === 0` guard); file at wave close.
- Docs (round-1 m3 / final m5): `apps/oat-docs/docs/provider-sync/commands.md` — handled at the `document` step.

<!-- orchestration-runs-end -->

---

## Implementation Log

### 2026-08-26

- Plan gate passed on round 3; p01 dispatched → DONE (`b257e908`); review round 1 (1M/4m) → fix `023c2229` → round 2 passed (2 minors deferred).

### Review Received: final (round 1)

**Date:** 2026-08-26
**Review artifact:** reviews/archived/final-review-2026-08-26T210420Z.md (reviewed head `a4a7804d592a795d78dfa6d76e73acb2197c5232`, range `1bd5424b..a4a7804d`, invocation auto, dispatch `w2-final-review-001`, model opus)

**Findings:** Critical 0 · Important 0 · Medium 3 · Minor 6 — no code defect; all Done criteria and Review-focus items verified at HEAD from source plus nine end-to-end probes against the built CLI (incl. a `chmod 500 .oat/sync` probe proving the advisory reaches stderr before the restamp hard-fails); gates re-run green; `release:check-versions` compared 0.2.33 (origin/main `1bd5424b`) vs 0.2.34.

**Deferred Findings Re-evaluation:** p01-r2-m1 and p01-r2-m2 remain deferred (new bounding evidence: `ScopeSyncPlan`/`runSyncApply` are not published API — `packages/cli/package.json` declares only `bin`).

**Dispositions (all bookkeeping; resolved in artifact by the root, this commit):**

- M1 malformed Done-criteria table → rebuilt from the final-review coverage table.
- M2 table verified at a superseded head with a stale trailer → superseded by the final-head table (note added).
- M3 checklist order violated (archival before `summary.md`) → `summary.md` generated now and rolled up (project-log rollup), items 2–3 checked, deviation recorded in the Deviations table, W3–W4 rule adopted.
- m1 stale `oat_last_commit` → advanced with convention note. m2 Run 1 "(in progress)" / empty Outstanding Items → completed + mirrored. m3 "before any mutation" overstated → "before any sync-manifest mutation (the restamp)". m4 sibling restamp sites under-scoped → all three call sites + the "No changes required." message recorded in the backlog candidate. m5 docs → `document` step. m6 pre-existing no-op message → paired with the backlog candidate.

**Review row `final` → `fixes_completed`; narrowed round 2 next.**

### Review Received: final (round 2, narrowed)

**Date:** 2026-08-26
**Review artifact:** reviews/archived/final-review-2026-08-26T211431Z.md (reviewed head `2e106b66b78f7d80ed7eca27aa5eb7d103ec4a56`, range `a4a7804d..2e106b66`, invocation auto, dispatch `w2-final-review-002`, model opus, disposition-verification brief)

**Findings:** Critical 0 · Important 0 · Medium 0 · Minor 2 — all nine round-1 findings (M1–M3, m1–m6) re-verified fixed by direct inspection at HEAD; the range touches no code (5 project artifacts + `.oat/repo/reference/project-observations.md`), so round-1 requirements coverage is inherited; `pnpm check` exit 0, `oxfmt --check` clean on all six changed artifacts, focused suites 55/55, structural sweep found all 6 GFM tables well-formed.

**Deferred Findings Re-evaluation:** p01-r2-m1 and p01-r2-m2 remain deferred (no code changed in range).

**Dispositions (both artifact-accuracy nits; resolved by the root, this commit — root re-derived both before accepting):**

- m1 `summary.md` "+35 cases" overstated → "+14 cases (41 → 55 in the two focused suites)"; root recount of `it(`/`test(` declarations at merge-base vs HEAD: `sync/index.test.ts` 27 → 40, `manifest/manager.test.ts` 13 → 14.
- m2 backlog-candidate pointer `apply.ts:172` off by 15 lines in `implementation.md` and `summary.md` → `apply.ts:187` plus the `summary.plannedOperations === 0` guard (root confirmed `No changes required.` at :187).

**Review row `final` → `passed` at reviewed head `2e106b66`; the two minors are text-only closeout fixes in this receive commit. Next: configured exit gate (generation 1).**

### Review Received: final (gate, generation 2)

**Date:** 2026-08-26
**Review artifact:** reviews/archived/final-review-2026-08-26T222108Z.md (reviewed head `b15665e58ac42ad79230a65c1705afab0c14c500`, full range `1bd5424b..b15665e5`, invocation gate, run `17dc551d-d7cb-4c71-859e-3e830d833cba`, target `cursor-gpt-5-6-sol-xhigh`, model gpt-5.6-sol-xhigh)

**Findings:** Critical 0 · Important 0 · Medium 1 · Minor 2 — gate passed at the important threshold. The reviewer ran the full DoD in the foreground (check, type-check, test [3,686 vitest cases], build, check:skill-bumps, fetch-first release:check-versions, release:validate, build:docs, `git diff --check`), all exit 0. Generation 1 of this gate (Fable, `--avoid none`) blocked after two attempts that produced no artifact; the operator removed `--avoid none` so default same-family avoidance applies (orchestration log, "Exit-gate boundary").

**Deferred Findings Re-evaluation:** p01-r2-m1 and p01-r2-m2 re-confirmed deferrable by the gate reviewer under their existing triggers.

**Dispositions (resolved by the root, this commit):**

- M1 `implementation.md:199` canonical Deviations heading replaced by a literal `$1` (introduced by the round-2 receive script — a function-callback replacement does not expand `$1`) → heading restored verbatim as `## Deviations from Plan / Design`; table untouched; no other `$1` literal exists in the project artifacts (grep).
- m1 optional `ScopeSyncPlan.versionSkew` → remains deferred as p01-r2-m1 (same trigger: next `sync.types.ts` touch).
- m2 external-plan "non-empty strings" wording → remains deferred as p01-r2-m2 (record-only; plan immutable).

**Gate review row `final` → `passed`; exit gate generation 2 allowed. Next: post-implement sequence (summary → document → pr).**

## Deviations from Plan / Design

| Task / Review  | Source Artifact                                      | Planned / Documented                                           | Actual / Accepted                                                                                                           | Reason                                                                                                                                                                                               | Source of Truth                                                               | Follow-up                                                      |
| -------------- | ---------------------------------------------------- | -------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------- | -------------------------------------------------------------- |
| closeout order | plan.md § Implementation Complete (strictly ordered) | item 3 (`summary.md` roll-up) before item 4 (backlog archival) | backlog archival `a4a7804d` landed before `summary.md` existed; the orchestration-log synthesis (`acc0c292`) did precede it | root sequencing error — the roll-up was scheduled for the pre-approval `summary` step; `summary.md` was produced at final-review receive and rolled up before any archive step of the project itself | plan.md ordering (source of truth); deviation accepted, archival not reverted | W3–W4 rule: generate `summary.md` before `oat backlog archive` |

## Test Results

| Phase | Tests Run                                                                                   | Passed | Failed | Coverage |
| ----- | ------------------------------------------------------------------------------------------- | ------ | ------ | -------- |
| p01   | focused sync + manifest suites (55); full `pnpm test` (273 files / 3686 vitest + node:test) | all    | 0      | n/a      |

## Final Summary (for PR/docs)

**What shipped:**

- `oat sync` version-skew advisory: reports when a loaded manifest was produced by a different CLI version than the invoking one, in human (one warning per scope, before the manifest restamp) and JSON (`versionSkew` array in apply and dry-run envelopes) modes; advisory only.
- Manifest restamp on apply now derives from the same diagnostic (no duplicated predicate).
- Lockstep public-package bump 0.2.33 → 0.2.34.

**Behavioral changes (user-facing):**

- A stale manifest now yields a visible warning / structured diagnostic; nothing else changes (exit codes, counts, eligibility, manifest schema, absent/invalid handling).

**Key files / modules:** `packages/cli/src/commands/sync/*`, tests, five package manifests, `packages/cli/assets/public-package-versions.json`.

**Verification performed:** plan gate (3 rounds), per-phase review (2 rounds, mutation battery), codex cross-model reviews (×2, zero findings), full DoD post-commit and at the final head.

**Design deltas (if any):** none against the source plan's requirements; the plan's "non-empty strings" step wording is superseded by exact inequality (p01-r2-m2, recorded).

## Done-criteria confirmation (source plan)

Lifted from the **final review round 1** Requirements Coverage table
(`reviews/archived/final-review-2026-08-26T210420Z.md`), reviewer-verified at the
final head `a4a7804d592a795d78dfa6d76e73acb2197c5232` from source plus nine
end-to-end probes against the built CLI. Line references are hints as of that
head. (The earlier phase-review table verified at `b257e908` — which predated
the fix commit `023c2229` and still carried the since-resolved "→ M1" trailer —
is superseded by this one.)

| Requirement                                                                        | Status      | Notes                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                     |
| ---------------------------------------------------------------------------------- | ----------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| DC1 — stale manifest yields one pre-mutation diagnostic with scope + both versions | implemented | `detectVersionSkew` (`index.ts:264-276`) is called at the single `ScopeSyncPlan` construction site (`index.ts:348`); `logVersionSkewWarnings` (`index.ts:394-410`) runs at `index.ts:421`, before the `context.dryRun` branch and before `await runSyncApply` (`index.ts:430`). `executeSyncPlan` has exactly one call site (`apply.ts:110`) and is the only route to `saveManifest`. Exactly-one-per-scope proven by PROBE-F7; ordering proven destructively by PROBE-F8.                                                                                                                                                                                                                                                                                                                                |
| DC2 — human apply and dry-run warn without changing exit status                    | implemented | Single `context.logger.warn` per skewed scope (`index.ts:405-407`). `git diff 1bd5424b..HEAD -- apply.ts dry-run.ts` contains **no** change to any exit-code, count, or eligibility expression (verified by filtering the diff for `exit`/`plannedOperations`/`applied`/`failed` — empty). Probes: dry-run exit 0, apply exit 0, second apply exit 0.                                                                                                                                                                                                                                                                                                                                                                                                                                                     |
| DC3 — JSON apply and dry-run expose a structured diagnostic and no human text      | implemented | `versionSkew` added to both envelopes (`apply.ts:180`, `dry-run.ts:108`), always an array (`[]` when none). `logVersionSkewWarnings` early-returns under `context.json` (`index.ts:395-397`). PROBE-F2 confirms stdout is pure parseable JSON with **zero bytes on stderr**, including the dry-run no-op case.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                            |
| DC4 — equal, older, newer, absent, and invalid cases behave as stated              | implemented | Equal → `undefined` (`index.ts:270-272`), no output (PROBE-F3 second run). Older/newer symmetric (`0.0.1` and `999.0.0`, PROBE-F7). Absent → `[]` (PROBE-F9, backed by `createEmptyManifest` at `manager.ts:25-31`). Invalid → existing `CliError`, exit 1, no skew (PROBE-F6, backed by the new structural case at `manifest/manager.test.ts:85-111`). `ManifestSchema` and `manager.ts` are unmodified by the range.                                                                                                                                                                                                                                                                                                                                                                                    |
| DC5 — all five public package versions move together and release gates pass        | implemented | `origin/main` = `1bd5424b` (also the merge-base). Compared per package: `cli`, `control-plane`, `docs-config`, `docs-theme`, `docs-transforms` all `0.2.33 → 0.2.34`. `packages/cli/assets/public-package-versions.json` consistent at `0.2.34` (its 4-key shape, missing `control-plane`, is pre-existing and out of scope). `pnpm-lock.yaml` unchanged, as the wrapper predicted for workspace links. `git fetch origin` exit 0 → `pnpm release:check-versions` exit 0 ("version bump check passed"); `pnpm release:validate` exit 0 (5 tgz validated, visual `{"valid":true,"measurements":65}`).                                                                                                                                                                                                      |
| DC6 — the complete repository Definition of Done exits zero                        | implemented | Re-run at HEAD by this review: `pnpm check` 0, `pnpm type-check` 0, focused `vitest` 0 (**55/55**, 2 files), `pnpm build` 0, `pnpm run check:skill-bumps` 0 ("0 canonical skills changed"), `pnpm release:check-versions` 0, `pnpm release:validate` 0, plus file-scoped `./node_modules/.bin/oxfmt --check` 0 and `./node_modules/.bin/oxlint` 0 (0 warnings, 0 errors, 6 files). **Not re-run here:** `pnpm test` (root ran it green at `4c04963c` — 273 files / 3686) and `pnpm build:docs`; the only changes from `4c04963c..HEAD` are six `.oat/projects/**` and `.oat/repo/pjm/backlog/**` markdown files, none of which are bundled (`bundle-assets.sh` copies only `.agents/skills`, `.agents/agents`, `.oat/templates`, `.oat/scripts`, `apps/oat-docs/docs`), so neither gate's inputs changed. |
| DC7 — `git status --short` has no unexplained or out-of-scope files                | implemented | Empty at review start, after every probe, and at review end. The 6 source/test files match the source plan's `## In scope` exactly, plus `packages/cli/src/manifest/manager.test.ts`, which the plan's `## Test plan` explicitly authorizes and which `implementation.md` declares up. Probe scratch lived entirely outside the worktree and was deleted.                                                                                                                                                                                                                                                                                                                                                                                                                                                 |
| Review focus 1 — warning emitted before `executeSyncPlan` can restamp              | confirmed   | See DC1; proven destructively by PROBE-F8 (warning on stderr, restamp `EACCES`, manifest unchanged) and statically by single-call-site reachability.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                      |
| Review focus 2 — JSON mode machine-only and skew non-fatal                         | confirmed   | PROBE-F2 (0 bytes stderr, pure JSON) and PROBE-F7 JSON. Skew never touches `process.exitCode`; `apply.ts:193` remains `failed > 0 ? 1 : 0`.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                               |
| Review focus 3 — missing/corrupt manifests retain existing semantics               | confirmed   | PROBE-F6 (missing key → validation error, exit 1, no skew) and PROBE-F9 (absent file → empty manifest at invoking version, no false warning). `manifest.types.ts` / `manager.ts` unmodified; only `manager.test.ts` gained a case.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                        |

## References

- Plan: `plan.md`
- Discovery: `discovery.md`
- Orchestration log: `orchestration-log.md`
- **plan:** ---
oat_status: complete
oat_ready_for: oat-project-implement
oat_blockers: []
oat_last_updated: 2026-08-26
oat_phase: plan
oat_phase_status: complete
oat_plan_hill_phases: ['p01'] # final (only) phase; workflow.hillCheckpointDefault=final
oat_auto_review_at_hill_checkpoints: true # from workflow.autoReviewAtHillCheckpoints
oat_plan_parallel_groups: [] # solo lane — one ungrouped phase (validate-plan rejects singleton groups)
oat_plan_source: quick
oat_import_reference: null
oat_import_source_path: null
oat_import_provider: null
oat_generated: false
oat_template: false
---

# Implementation Plan: wave-2-execution (Wave 2 external-plan wrapper)

> Execute this plan using `oat-project-implement` — one ungrouped phase
> executed sequentially. Concurrency ceiling: 3 worktrees (operator decision);
> this wave uses 1.

**Goal:** Execute the 1 Wave 2 external plan (surface sync producer/invoker
version skew before mutation) through the wave→project wrapper pattern
(DR-260713-wave-project-wrapper-over).

**Architecture:** Thin wrapper. The task's **entire and only implementation
contract** is its external plan under `.oat/repo/reference/external-plans/`. The
task below carries wrapper-owned metadata exclusively: the source-plan path,
ordering/dependencies, wrapper-level verification gates, the commit convention, and
review mapping. Nothing in this file restates, narrows, or overrides the source plan.

**Commit Convention:** `{type}(p{NN}-t{NN}): {description}` — the external plan
governs commit content and granularity; the wrapper adds the `pNN-tNN` scope.

**Wrapper execution contract (applies to every task):**

1. **Drift check first.** Run the source plan's `## Drift check` against current
   HEAD (plus the rule-1 addendum below). A material mismatch (per that plan's own
   definition) is a STOP. The wave-boundary drift refresh (see record below) does
   not replace the in-worktree re-check.
2. **Execute the source plan's `## Implementation steps`** in order with each
   step's embedded Verify gate; honor its `## STOP conditions` verbatim.
3. **Confirm the source plan's `## Done criteria`**, then run the full DoD gates
   in this order, invoking each gate literally and capturing each exit code to a
   log file: `pnpm check`, `pnpm type-check`, `pnpm test`, `pnpm build`,
   `pnpm run check:skill-bumps`, `git fetch origin` then `pnpm release:check-versions`,
   `pnpm release:validate`, `pnpm build:docs`. (`pnpm lint`/`pnpm format` are not
   required — this wave touches neither `tools/smoke` nor `.agents/skills`.)
   Toolchain: Node 22.17.0 / pnpm 10.13.1; `pnpm run worktree:init` already ran.
4. **STOP → BLOCKED at phase level.** A source-plan STOP parks the phase (record
   in `state.md` `oat_blockers` + `implementation.md`).
5. **Group-dependency rule:** not applicable (single phase).
6. **Merge serialization:** not applicable (the phase runs on the integration
   checkout; no phase worktree merges).
7. **Backlog archival is NOT part of the task** — once, serialized on the
   integration branch after the phase passes (DR-260713-shared-tracked-surfaces).
8. **Phase review checklist = the source plan's `## Review focus`.**
9. **Artifact hygiene:** every agent runs `pnpm exec oxfmt --write <file>` on
   markdown it writes and reports observations for `orchestration-log.md`
   (workers report; the root appends).
10. **Commit verification after ambiguous results:** inspect `git log`/HEAD before
    retrying; record the SHA in `implementation.md`.

## Parallelism

None — one phase, executed sequentially on the integration checkout.

> The recon observations below are **non-authoritative grouping evidence only** —
> they never constrain the source plan: its own live checks govern at execution
> time.

- Write surface: `packages/cli/src/commands/sync/{sync.types,index,apply,dry-run}.ts`,
  `packages/cli/src/commands/sync/index.test.ts`, the five public package
  manifests, `pnpm-lock.yaml` (likely no-op — workspace links, no literal
  versions), and the build-generated `packages/cli/assets/public-package-versions.json`.

## Dispatch Profile

_No per-phase overrides. Runtime selection applies, capped by the project's named
dispatch policy in `state.md` (managed / `high`); provider-specific model/effort
selection is owned by runtime resolution, not this plan. Cross-model review is
embedded in the lane: shipped CLI output/provenance surface._

## Drift Refresh Record (2026-08-26, vs `1bd5424b48af0f1cd385ce42246952d16ab438f7`)

**1 PASS / 0 MINOR-DRIFT / 0 STOP.** Non-authoritative recon evidence (one bounded
read-only recon agent, Sonnet 5, native dispatch); the lane re-runs its drift
check in-worktree.

- Drift-check diff `6f443c08..1bd5424b -- packages/cli/src/commands/sync packages/cli/src/manifest`
  is empty; all six in-scope files are byte-identical to the authoring commit.
  Evidence lines: 5/7 exact, 2 off-by-one (`dry-run.ts` JSON envelope at :99,
  `apply.ts` at :169; `index.ts:238` is the manifest-path line, the `loadManifest`
  call is :243) — authoring imprecision, not drift. No `diagnostics`/`warnings`/
  `advisories` field exists in sync output (STOP #1 does not apply).
- **Rule-1 addendum (coverage gaps):** the source plan's drift command omits two
  surfaces its implementation depends on or writes. The in-worktree drift check
  MUST additionally run, before editing:
  1. `git diff --stat 6f443c08..HEAD -- packages/cli/src/shared/oat-version.ts`
     (`OAT_VERSION`, imported by `apply.ts` and `manifest/manager.ts`) — a
     change is a material mismatch to compare against the plan;
  2. `git fetch origin && git diff --stat 1bd5424b..origin/main -- packages/cli/package.json packages/control-plane/package.json packages/docs-config/package.json packages/docs-theme/package.json packages/docs-transforms/package.json pnpm-lock.yaml packages/cli/assets/public-package-versions.json`
     (the release surfaces the plan writes, revalidated against the recorded wave
     baseline `1bd5424b` on a freshly fetched `origin/main`) — any advance of the
     public-package baseline after planning is a material mismatch: STOP and
     report the new baseline rather than bumping from a stale one.
     Separately, run `git fetch origin` immediately before every
     `pnpm release:check-versions` invocation so the strict-greater guard compares
     against a current `origin/main` (the wrapper DoD sequence in the execution
     contract requires this).
- **Release-root intersection (W1 rule):** every touched file sits under
  `packages/cli/src/**` (publishable change; `versionPolicyIgnorePatterns` is
  `['assets/**']`); the plan's step 4 lockstep bump **0.2.33 → 0.2.34** is
  required and pre-planned as part of the lane. `origin/main` = `1bd5424b` at
  0.2.33, so the strict-greater guard passes at 0.2.34.
- Implementer notes (non-narrowing): `pnpm-lock.yaml` records workspace links, so
  the bump likely leaves it unchanged — an unchanged lockfile is not a failure;
  `packages/cli/assets/public-package-versions.json` is committed and regenerated by
  `pnpm build` (its 4-key shape — no `control-plane` entry — is pre-existing and
  out of scope); `packages/cli/tsconfig.json` excludes `*.test.ts` from
  `pnpm type-check`; same-directory imports use `./…`, cross-directory use aliases.

---

## Phase 01: warn-sync-version-skew (solo)

**Milestone:** the source plan's `## Done criteria` fully satisfied.

### Task p01-t01: Execute external plan — Surface sync producer and invoker version skew before mutation

**Source plan (the contract):**
`.oat/repo/reference/external-plans/2026-08-19-warn-sync-version-skew.md`

**Ordering:** solo; runs on the integration checkout (`wave-2-execution`).

**Step 1: Drift check** — per the source plan's `## Drift check`, plus the rule-1
addendum above.

**Step 2: Execute** the source plan in full.

**Step 3: Verify (wrapper gate)**

Run: the source plan's `## Done criteria` checks, then the full DoD gates from
the wrapper execution contract.
Expected: all green.

**Step 4: Cross-model review** — before committing, obtain an independent
cross-model review of the uncommitted diff via the runtime-configured reviewer
(provider/model/effort owned by dispatch configuration, not this plan);
disposition every finding in the phase report.

**Step 5: Commit**

```bash
git commit -m "feat(p01-t01): warn when oat sync manifest and invoking CLI versions differ"
```

---

## Reviews

| Scope  | Type     | Status          | Date       | Artifact                                                    | Reviewed Head                            | Invocation | Gate Target              |
| ------ | -------- | --------------- | ---------- | ----------------------------------------------------------- | ---------------------------------------- | ---------- | ------------------------ |
| p01    | code     | passed          | 2026-08-26 | reviews/archived/p01-review-2026-08-26T204852Z.md           | 023c222948225be87955500cf6b73147ef6a75bd | auto       | -                        |
| final  | code     | passed          | 2026-08-26 | reviews/archived/final-review-2026-08-26T211431Z.md         | 2e106b66b78f7d80ed7eca27aa5eb7d103ec4a56 | auto       | -                        |
| plan   | artifact | fixes_completed | 2026-08-26 | reviews/archived/artifact-plan-review-2026-08-26T192011Z.md | -                                        | -          | -                        |
| spec   | artifact | pending         | -          | -                                                           | -                                        | -          | -                        |
| design | artifact | pending         | -          | -                                                           | -                                        | -          | -                        |
| plan   | artifact | fixes_completed | 2026-08-26 | reviews/archived/artifact-plan-review-2026-08-26T193112Z.md | -                                        | -          | -                        |
| plan   | artifact | passed          | 2026-08-26 | reviews/archived/artifact-plan-review-2026-08-26T194327Z.md | -                                        | -          | -                        |
| final  | code     | passed          | 2026-08-26 | reviews/archived/final-review-2026-08-26T222108Z.md         | b15665e58ac42ad79230a65c1705afab0c14c500 | gate       | cursor-gpt-5-6-sol-xhigh |

**Status values:** `pending` → `received` → `fixes_added` → `fixes_completed` → `passed`

## Implementation Complete

Strictly ordered — each item depends on the one before it (wave-execute Step 6
closeout sequence):

1. [x] 1/1 phases, 1/1 tasks complete; the source plan's `## Done criteria`
       confirmed (recorded in `implementation.md` § Done-criteria confirmation)
2. [x] Full DoD gates green on the integration branch (final verification at
       `4c04963c`, exit codes captured per gate; re-run by the final review at `a4a7804d`)
3. [x] Orchestration-log end-of-run synthesis written (`acc0c292`), rolled up into
       `summary.md` at final-review receive — before any archive step of the project;
       note: item 4 landed one step earlier than this roll-up (deviation recorded in
       `implementation.md`)
4. [x] **Serialized backlog bookkeeping** (`a4a7804d`): `oat backlog archive
BL-260718-warn-when-oat-sync-uses` with a real outcome summary, one commit

## References

- Source plan: `.oat/repo/reference/external-plans/2026-08-19-warn-sync-version-skew.md`
- Program artifact: `.oat/repo/reference/external-plans/2026-08-19-execution-program.md`
- Program index: `.oat/repo/reference/external-plans/2026-08-19-backlog-review-plan-index.md`
- Pattern: `DR-260713-wave-project-wrapper-over`; prior wave summary
  `.oat/projects/shared/wave-1-execution/summary.md`
- **summary:** ---
oat_status: complete
oat_ready_for: null
oat_blockers: []
oat_last_updated: 2026-08-26
oat_generated: true
oat_summary_last_task: p01-t01
oat_summary_revision_count: 0
oat_summary_includes_revisions: []
---

# Summary: wave-2-execution

## Overview

Wave 2 ("Sync provenance warning") of the 2026-08-19 defect program executed a
single S-sized defect as a thin wrapper OAT project: `oat sync` silently
restamped a stale manifest `oatVersion` during apply, hiding producer/invoker
CLI version skew — the first suspect in earlier stale-tooling incidents. The
lane's contract was its immutable external plan
`2026-08-19-warn-sync-version-skew.md`.

## What Was Implemented

- **Version-skew advisory in `oat sync`** (`packages/cli/src/commands/sync/*`,
  commits `b257e908` + fix `023c2229`): each scope plan carries a
  `versionSkew` diagnostic (`scope`, `producingVersion`, `invokingVersion`)
  derived when the loaded manifest's `oatVersion` differs from `OAT_VERSION`; one
  human warning per skewed scope is logged before the dry-run/apply branch (so
  before any manifest restamp), suppressed in JSON mode where both envelopes
  (apply and dry-run, including no-op) expose the structured array (`[]` when
  none). Exit codes, planned-operation counts, apply eligibility, manifest
  schema, and absent/invalid-manifest semantics are unchanged.
- **Restamp coupled to the diagnostic:** apply's `shouldRefreshManifestVersion`
  now derives from the same diagnostic, so the advisory and the restamp cannot
  drift apart (a reviewer-named desync mutation is caught only by the new
  coupling test).
- **Tests:** ordering-before-`executeSyncPlan`, JSON-only, equal/older/newer,
  absent, invalid `oatVersion`, multi-scope attribution, coupling; +14 cases (41 → 55 in the two focused suites).
- **Lockstep bump 0.2.33 → 0.2.34** across the five public packages plus the
  regenerated `packages/cli/assets/public-package-versions.json`.

Reviews: plan artifact gate passed on round 3 (rounds 1–2 blocked on wrapper-
contract items, fixed); p01 `passed` after two rounds (mutation battery: reorder,
delete, JSON-field delete, desync all red); final review round 1: 0C/0I with
bookkeeping findings resolved in-artifact; full definition of done green at
`4c04963c`.

Exit gate: generation 1 (Fable, `--avoid none`) blocked after two attempts whose
headless child yielded on background work; the operator removed `--avoid none`
and generation 2 passed on `cursor-gpt-5-6-sol-xhigh` (run `17dc551d`, full DoD
in the foreground, 0C/0I/1M/2m — the medium was a bookkeeping heading defect).

## Key Decisions

1. **Derive the apply restamp from the skew diagnostic rather than keep a
   duplicated predicate:** the review's preferred option; removing two
   unreachable empty-string guards made the coupling bit-exact with the previous
   restamp condition while preserving the existing manifest validation error. (`DR-260826-derive-the-sync-apply-restamp`)
2. **Pre-plan the lockstep bump as part of the lane:** W1's lesson (any
   `packages/cli/src/**` change is publishable) was applied at planning time;
   the drift refresh intersected the write surface with the release roots and
   the plan gate extended the in-worktree recheck to the release surfaces the
   plan writes, with a fetch-first `release:check-versions`. (`DR-260826-pre-plan-the-lockstep-bump`)

## Design Deltas

- The source plan's step-1 wording ("only when the two non-empty strings
  differ") is superseded by exact inequality (p01-r2-m2); recorded in
  `implementation.md`, plan immutable.
- Closeout ordering: backlog archival landed one step before this summary's
  roll-up (see `implementation.md` Deviations); W3–W4 generate the summary
  before archiving.

## Notable Challenges

- The configured plan gate blocked twice on wrapper-contract precision
  (parallel-execution flag; a restated source-plan step; release-surface drift
  coverage; checklist order) before passing clean — all artifact-level.
- `worktree:init` after scaffolding reset `activeProject`; the manifest restamp
  it produced (workspace CLI 0.2.33 vs global 0.2.32) is exactly the skew this
  wave now surfaces.

## Integration Notes

- JSON consumers of `oat sync --json` get an additive `versionSkew` array in
  both apply and dry-run envelopes; human mode gains one stderr warning per
  skewed scope. Skew remains advisory.
- Sibling commands (`init`, `remove skill`, `status`) still restamp
  `oatVersion` silently — tracked as a follow-up.

## Follow-up Items

- Backlog candidate: extend the advisory to the three sibling `saveManifest`
  call sites (`init/index.ts:1187`, `remove/skill/remove-skill.ts:347`,
  `status/index.ts:887`) and reconsider the "No changes required." message on a
  restamp-only apply (`apply.ts:187`, the `summary.plannedOperations === 0` guard).
- Deferred minor p01-r2-m1: make `ScopeSyncPlan.versionSkew` non-optional on the
  next `sync.types.ts` touch.
- Docs: `apps/oat-docs/docs/provider-sync/commands.md` — advisory + JSON field
  (document step).

## Associated Issues

- `BL-260718-warn-when-oat-sync-uses` — closed (archived `a4a7804d`).

## Workflow Observations

### 2026-08-26 · structural · oat gate review · plan

target=cursor-gpt-5-6-sol-xhigh threshold=important findings=critical:0,important:2,medium:0,minor:0 exit=1 status=blocked artifact=.oat/projects/shared/wave-2-execution/reviews/artifact-plan-review-2026-08-26T192011Z.md

### 2026-08-26 · structural · oat gate review · plan

target=cursor-gpt-5-6-sol-xhigh threshold=important findings=critical:0,important:2,medium:0,minor:0 exit=1 status=blocked artifact=.oat/projects/shared/wave-2-execution/reviews/artifact-plan-review-2026-08-26T193112Z.md

### 2026-08-26 · structural · oat gate review · plan

target=cursor-gpt-5-6-sol-xhigh threshold=important findings=critical:0,important:0,medium:0,minor:0 exit=0 status=ok artifact=.oat/projects/shared/wave-2-execution/reviews/artifact-plan-review-2026-08-26T194327Z.md

### 2026-08-26 · general · feedback · closeout ordering

Observation: wave-2 archived its backlog item before summary.md existed, contradicting the wrapper plan's strictly ordered Implementation Complete checklist (synthesis + summary roll-up before archival). Impact: a final-review Medium and a recorded deviation; no data loss. Recommendation: generate summary.md immediately after the orchestration-log synthesis and before oat backlog archive; add this to the wave skill's closeout sequence wording.

## Unresolved claims

- None.
