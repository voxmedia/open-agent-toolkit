---
oat_status: in_progress
oat_ready_for: null
oat_blockers: []
oat_last_updated: 2026-09-07
oat_current_task_id: p07-t01
oat_generated: false
---

# Implementation: wave-5-execution

**Started:** 2026-09-07
**Last Updated:** 2026-09-07

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

| Phase                                                                       | Status   | Tasks | Completed |
| --------------------------------------------------------------------------- | -------- | ----- | --------- |
| Phase 01 (recover-committed-review-artifacts-after-post-selection-failures) | complete | 1     | 1/1       |
| Phase 02 (keep-instruction-sync-pointers-out-of-docs-trees)                 | complete | 1     | 1/1       |
| Phase 03 (route-incomplete-quick-projects-to-quick-start)                   | complete | 1     | 1/1       |
| Phase 04 (retry-gate-project-log-finalization-across-index-locks)           | complete | 1     | 1/1       |
| Phase 05 (add-oat-config-unset-command)                                     | complete | 1     | 1/1       |
| Phase 06 (validate-skill-script-references-against-pack-manifests)          | complete | 1     | 1/1       |
| Phase 07 (enforce-external-plan-readiness-contract)                         | pending  | 1     | 0/1       |
| Phase 08 (make-autonomous-project-recap-capability-aware)                   | pending  | 1     | 0/1       |
| Phase 09 (defer-activeproject-clearing-on-archive-completions)              | pending  | 1     | 0/1       |
| Phase 10 (make-terminal-project-status-agree-with-revision-plans)           | pending  | 1     | 0/1       |
| Phase 11 (make-consolidated-project-retirement-semantic)                    | pending  | 1     | 0/1       |

**Total:** 6/11 planned tasks completed

---

## Phase 01: recover committed review artifacts after post selection failures (p01)

**Status:** complete · **Group:** 1 · **Tasks:** p01-t01 (+ one address-now sweep commit)
**Outcome:** the gate's post-selection sub-steps are labelled and a thrown sub-step is named in the `review_failed` envelope's `postSelection`; the eligibility pipeline is one shared function; when a post-selection step throws after a validating artifact was committed, the gate re-validates the immutable snapshot (never re-parses the path; the artifact must still be present and unchanged) and emits the recovered envelope exactly once with the recovered disposition in the project log; recovery re-validation failures carry a distinct `recovery_revalidation_failed` cause and a `gate-recovery-failed` diagnostic; a decision record `DR-260907-additive-post-selection`; docs on workflow-gates and cli-reference.
**Verification:** focused gate suite 361, forced check/type-check/test `Cached: 0` (5815), check:skill-bumps 0; review round 1 (PASS with artifact-alignment findings) plus an address-now sweep.
**Deviations:** the plan's Done checkbox ("every `review_failed` envelope names `postSelection`") and two Test-plan bullets are stale against its own Outcome/step 2 and step 4 — recorded as wave-close plan corrections (no code change); `cli-reference.md:152` carried the same inaccurate prose and was corrected in the sweep (mechanical propagation).

### Task p01-t01: Execute external plan — Recover committed review artifacts after post-selection gate failures

**Status:** completed
**Commit:** `7c1988b63`; sweep `06de22c7d`

## Phase 02: keep instruction sync pointers out of docs trees (p02)

**Status:** complete · **Group:** 1 · **Tasks:** p02-t01 (+ one review-fix commit + one docs sweep)
**Outcome:** instruction-sync scanning takes an exclusion list evaluated after the `.oat/repo` carve-in, defaulting to the documentation content root derived from W1's rule; `documentation.instructionPointerExcludes` in `oat-config.ts` (fail-closed on malformed shapes, posix-normalized, absolute/escape rejected); sync and validate share one resolver; inert exclusions (no case-exact directory) are warned in human mode and reported through additive `effectiveExcludedPaths` and `exclusionWarnings` in JSON; `.oat/repo` is the single unexcludable path (its descendants are excludable); four docs pages.
**Verification:** focused 231, forced check/type-check/test `Cached: 0` (5848), check:skill-bumps 0; live reproduction of issue #238 on this repository; review rounds 1–2.
**Deviations:** two docs pages beyond the plan's named two (mechanical widening under the sweep rule); the new key is deliberately not registered in the `oat config` catalog (the plan does not scope that file) — hand-off recorded for p05.

### Task p02-t01: Execute external plan — Keep instruction-sync pointer files out of documentation content trees

**Status:** completed
**Commit:** `78f1279df`; review fix `f1790effd`; docs sweep `96a5d9480`

## Phase 03: route incomplete quick projects to quick start (p03)

**Status:** complete · **Group:** 1 · **Tasks:** p03-t01 (+ one review-fix commit)
**Outcome:** one quick-plan readiness definition (`quick_plan_ready()` in `oat-project-quick-start`, referenced with load clauses from plan, progress, and next), a CommonMark-aware fenced-block scan, absent-or-false `oat_template`, paired-quote scalars; `oat-project-plan` no longer dead-ends an incomplete quick plan; `oat-project-progress` and `oat-project-next` route not-ready quick plans (all tiers, including tier 1b) to quick-start; quick-start documents resume in place; four skill bumps with nine pins; docs page.
**Verification:** focused 322, forced check/type-check/test `Cached: 0` (5808), check:skill-bumps 4, validate-skills 64; the readiness guard executed verbatim by both reviewers; a 73/76-plan live-corpus measurement (12 not-ready → ready, 0 the other way); review rounds 1–2.
**Deviations:** the plan's `oat_template: false` wording relaxed to the repository's absent-or-false convention (`oat-project-next:182`) — wave-close plan correction; the plan's "progress has no pin" and "three pins" statements were already superseded by the 2026-09-07 refresh entry; quick-mode `discovery` rows still route to `oat-project-plan` (two-hop) — follow-up.

### Task p03-t01: Execute external plan — Route incomplete quick projects to quick-start from plan, progress, and next

**Status:** completed
**Commit:** `36a56cb64`; review fix `fcc6c0f26`

## Phase 04: retry gate project log finalization across index locks (p04)

**Status:** complete · **Group:** 2 · **Tasks:** p04-t01 (+ one address-now sweep commit)
**Outcome:** gate project-log finalization retries bounded attempts only on git's own index-lock contention evidence (never deleting the lock; persistent vs transient classification), finalizes exactly once per `runId` across retries and competing writers (identity = `{key, body}` exact token; settlement requires a clean log carrying the entry and a moved HEAD), writes a durable receipt whose printed `recovery.command` completes finalization from a fresh process via `oat project log append --commit --idempotency-key` with no review or gate re-run (receipts refused on any runId/producer/ref/body/artifact-signature mismatch), receipts ignored by git under any projects root with a check-ignore warning, a decision record `DR-260907-gate-log-receipts-live-under`, docs on workflow-gates and project-log.
**Verification:** forced check/type-check/test `Cached: 0` (5898), focused gate + log 330; the reviewer held a real `.git/index.lock` and ran fresh-process recovery through `dist` with seven receipt-mismatch probes; review round 1 (PASS) plus an address-now sweep.
**Deviations:** the retry/classification/dedupe live in `project/log/append.ts` with `commitReviewGateProjectLog` as a thin gate-side wrapper (the plan's literal step 3 would create a `gate ↔ log` import cycle; DR-260718 is honoured); `project-log.md` widened mechanically (it enumerates the append flags); the plan's In-scope `.gitignore` wording was tied to the default projects root (review M1).

### Task p04-t01: Execute external plan — Retry gate project-log finalization across transient Git index locks

**Status:** completed
**Commit:** `48837edf0`; sweep `09de4c92f`

## Phase 05: add oat config unset command (p05)

**Status:** complete · **Group:** 2 · **Tasks:** p05-t01 (+ one address-now sweep commit)
**Outcome:** `oat config unset <key>` with the same surface flags as `set`, sharing its key parser and validation (byte-identical refusals for malformed keys; aggregate read views, `tools.*` pack intent, lifecycle state, and env-shadowed-with-nothing-stored are refused; an env-shadowed stored value is removed with a warning as `set` would rewrite it), pruning empty parents (indistinguishable from absent to every consumer), removing invalid stored values the normalizing reader would drop, `--json` `removed` field, family coverage derived from the live catalog (the two deliberately uncatalogued documentation keys stay untouched on disk), help snapshot regenerated, three docs pages.
**Verification:** forced check/type-check/test `Cached: 0`, focused config 202, help snapshots 59; the reviewer constructed all eight `set` refusal classes and nine aggregate shapes on the built CLI; review round 1 (PASS) plus an address-now sweep.
**Deviations:** `unset tools.<pack>` refuses (pinned; upheld by the review on weaker-anywhere grounds); `oat config adopt` keeps its duplicate surface-flag block (out of the plan's scope) — follow-up.

### Task p05-t01: Execute external plan — Add an oat config unset command

**Status:** completed
**Commit:** `3fd3aaa62`; sweep `d779ea634`

## Phase 06: validate skill script references against pack manifests (p06)

**Status:** complete · **Group:** 2 · **Tasks:** p06-t01 (+ one review-fix commit)
**Outcome:** a fail-closed contract in `skills-bundled-docs-contract.test.ts` backed by the new `skill-script-references` module: every `.oat/scripts/<file>` reference in a shipped skill's authored Markdown must resolve to a script some owning pack ships (shipped surface derived from the pack manifests: 74 shipped, 8 canonical-unshipped); a lossless two-stage extractor (no prefix truncation, one trailing prose mark stripped, emphasis-adjacent references caught, fragments and placeholders handled fail-closed); unshipped skills reported, never failed.
**Verification:** focused 139+, forced check/type-check/test `Cached: 0` (5924), live apply-and-restore controls on shipped skills; review rounds 1–2.
**Deviations:** the optional `findPackForAsset` in `pack-manifest.ts` was not added (`resolveOwningPack` lives in the new module), leaving `pack-manifest.ts` byte-identical for p07; scan scope is authored Markdown only (documented). The fix round deliberately replaced the orchestrator's prescribed unconditional `*` strip with paired-delimiter stripping (measured fail-open and false-positive evidence); the reviewer's round-2 ruling records the verdict.

### Task p06-t01: Execute external plan — Validate every shipped skill-to-script reference against its pack manifest

**Status:** completed
**Commit:** `8432f1d4d`; review fix `970aedccc`

## Phase 07: enforce external plan readiness contract (p07)

**Status:** pending · **Group:** group 3 (sequential pair, first) · **Tasks:** p07-t01
**Outcome:** -
**Verification:** -
**Deviations:** -

### Task p07-t01: Execute external plan — Enforce plan-readiness versus execution-readiness in oat-repo-improve

**Status:** pending
**Commit:** -

## Phase 08: make autonomous project recap capability aware (p08)

**Status:** pending · **Group:** group 3 (sequential pair, second) · **Tasks:** p08-t01
**Outcome:** -
**Verification:** -
**Deviations:** -

### Task p08-t01: Execute external plan — Make the autonomous project recap capability-aware and non-blocking

**Status:** pending
**Commit:** -

## Phase 09: defer activeproject clearing on archive completions (p09)

**Status:** pending · **Group:** group 4 (sequential pair, first) · **Tasks:** p09-t01
**Outcome:** -
**Verification:** -
**Deviations:** -

### Task p09-t01: Execute external plan — Defer activeProject clearing on shared archive completions

**Status:** pending
**Commit:** -

## Phase 10: make terminal project status agree with revision plans (p10)

**Status:** pending · **Group:** group 4 (sequential pair, second) · **Tasks:** p10-t01
**Outcome:** -
**Verification:** -
**Deviations:** -

### Task p10-t01: Execute external plan — Make terminal project status agree with completed revision plans

**Status:** pending
**Commit:** -

## Phase 11: make consolidated project retirement semantic (p11)

**Status:** pending · **Group:** group 5 · **Tasks:** p11-t01
**Outcome:** -
**Verification:** -
**Deviations:** -

### Task p11-t01: Execute external plan — Make consolidated-project retirement checks semantic

**Status:** pending
**Commit:** -

## Autonomy Gate Provenance

### Review Received: plan (attempts 1 and 2)

**Date:** 2026-09-07
**Review artifacts:** reviews/archived/artifact-plan-review-2026-09-07T042724Z.md (attempt 1, run `b26aff5c-be34-4ac1-be16-86211c5b4d48`, blocked) and reviews/archived/artifact-plan-review-2026-09-07T043343Z.md (attempt 2, run `e4f1049a-ff67-4dd7-bf0b-7226abb7f69a`, blocked with the identical findings — the orchestrator's repair script aborted before writing and the gate re-ran on the unrepaired wrapper; recorded as `superseded`). Both gate-invoked, target `codex-5-6-sol-xhigh`.
**Findings:** Critical 0 · Important 1 · Medium 1 · Minor 1 — all resolved in-artifact (gate mode, auto-disposition):

- I1 — the drift refresh found current-contract changes for p03 (progress pin, eight pins) and p10 (Lite mode in the router) that the source plans do not carry while the wrapper called its observations non-authoritative: **fixed** — a `## Wave-Boundary Refresh Addenda (authoritative)` section now applies the refreshes the program's pre-dispatch clause and each plan's Revalidation section require, as task addenda with source-plan authority (p03 pin set; p10 Lite positive/negative controls, current router anchors, `oat_lifecycle` field row; p08 Lite recap carve-out; p09/p11 pins and no-re-bump; p05 scope; p01/p04 decision index; `named-skill-load-contract.test.ts` for every skill-editing lane); each affected task points at its addendum; the record reads "0 STOP (two current-contract refreshes carried as authoritative addenda)".
- M1 — "after every merge" gate cadence: **fixed** — the contract names the fan-in boundaries (group 1, group 2, each later single-lane merge) and "before that fan-in's bookkeeping edit".
- m1 — References: **fixed** — the Wave 4 index added; the `DR-260713-*` slugs labelled as program-level provenance.

**Verification record:** what — the three in-artifact repairs; how — `oat project validate-plan` exit 0; eight tasks carry the addendum pointer; where — this section and the commit that carries it.

**Plan rows: attempt 1 → `fixes_added`, attempt 2 → `superseded`** (gate-written rows moved forward in place with the archived paths); the gate re-runs on the repaired wrapper.

### Review Received: plan (attempt 3)

**Date:** 2026-09-07
**Review artifact:** reviews/archived/artifact-plan-review-2026-09-07T044034Z.md (gate-invoked, run `80c5b964-3260-491f-8925-933ad39ed8d5`, blocked)
**Findings:** Critical 0 · Important 1 · Medium 0 · Minor 0 — resolved in-artifact:

- I1 — contract precedence was contradictory: Architecture said the external plan is the "entire and only" contract while the addenda claimed equal authority: **fixed** — Architecture now defines the complete task contract as exactly two documents (the immutable plan plus its named, non-narrowing addendum), states precedence (addendum governs current-state facts; the plan governs every requirement and the addendum may only add), and declares the Parallelism observations and Drift Refresh Record evidence-only; wrapper rules 1–2 and the addenda intro align; instruction-like sentences in the drift record became pointers to the addenda; the lane-brief contract sentence is updated to the same model.

**Verification record:** what — the wording repair; how — `oat project validate-plan` exit 0; grep shows no remaining "entire and only" phrase; where — this section and the commit that carries it.

**Plan row (attempt 3) → `fixes_added`**; the gate re-runs (attempt 4).

### Review Received: plan (attempt 4)

**Date:** 2026-09-07
**Review artifact:** reviews/archived/artifact-plan-review-2026-09-07T044657Z.md (gate-invoked, run `e8b7c6c5-d7ce-41d5-839d-0da79edeccee`, blocked)
**Findings:** Critical 0 · Important 1 · Medium 0 · Minor 0 — resolved:

- I1 — the governing `oat-wave-execute` brief rule still says the external plan is the lane's entire contract, contradicting the wrapper's plan-plus-addendum model: **fixed by taking the finding's alternative** — the refreshes were applied to the source plans themselves as dated `Refresh applied 2026-09-07 (wave-5 boundary)` entries in eight plans' `## Revalidation Before Execution` sections (the program's own pre-dispatch mechanism, used on 2026-09-03 and 2026-09-04), the wrapper's addenda section became a pointer list, Architecture and rules 1–2 returned to the single-contract model, and the lane-brief sentence matches the skill again. No skill change, no bump.

**Verification record:** what — eight plan refresh entries plus the wrapper rewrite; how — `oat project validate-plan` exit 0; `grep -c "Refresh applied 2026-09-07"` returns one per refreshed plan; the wrapper contains no addenda section; where — this section and the commit that carries it.

**Plan row (attempt 4) → `fixes_added`**; the gate re-runs (attempt 5).

### Review Received: plan (attempt 5 — passed)

**Date:** 2026-09-07
**Review artifact:** reviews/archived/artifact-plan-review-2026-09-07T045405Z.md (gate-invoked, run `3c8b9eb2-f67f-4783-b53a-5473e0a2644b`, target `codex-5-6-sol-xhigh`)
**Findings:** Critical 0 · Important 0 · Medium 0 · Minor 0 — no blocking findings; the wrapper maps all eleven lanes to pointer-only tasks, preserves the program's order and single-contract lane briefs, and carries the current-state refreshes in the source plans.

**Plan row (attempt 5) → `passed`** (gate-written row moved forward in place with the archived path). Gate history: `b26aff5c` blocked (addenda), `e4f1049a` superseded (script abort), `80c5b964` blocked (contract precedence), `e8b7c6c5` blocked (brief rule vs addenda), `3c8b9eb2` passed after the refreshes moved into the plans.

## Orchestration Runs

<!-- orchestration-runs-start -->

### Run 1 — 2026-09-07 — branch `wave-5-execution`, Tier 1 (native Claude Task dispatch), policy managed/high

Wave base `0f47bf7004166d420758d1bcd77d253007174332` (the Lite PR #264 merge); plan gate passed on attempt 5 (attempts 1/3/4 blocked on the refresh-carrying mechanism, attempt 2 superseded) — group-1 base `ca47b8040540e1e57361d97e18a73e90b2f60e7d`; each lane worktree bootstrapped at that commit with a worktree-init sync commit as its allowed descendant (view-parity ok).

#### Dispatch Notes

- `w5-p01-impl-001`, `w5-p02-impl-001`, `w5-p03-impl-001` — group 1 dispatched together; each target opus, model_axis selected:opus, effort_axis not-applicable, selection_reason native-catalog, task_class hard-reasoning (p01) / default-implementation (p02, p03) (plan dispatch profile). Stamps: `Dispatch: scope=p0N action=implementation role=implementer producer=unknown provenance=unknown model_axis=selected:opus effort_axis=not-applicable dispatch_policy=high dispatch_ceiling=opus target=opus`. Records `dispatch/w5-p0{1,2,3}-impl-001.json`. Briefs point the lane at its plan INCLUDING the dated `Refresh applied 2026-09-07` entry.
- Journal note: generic record fields are immutable after the first revision, so `child_outcome` stays at its launch value; terminal outcomes are recorded here.
- `w5-p01-impl-001` outcome: DONE_WITH_CONCERNS, one commit `7c1988b6380d3893b6c74e1f545e1580b4032566` (gate module + tests, two docs pages, decision record). Two Codex rounds: a Critical ("replacement bytes should recover the original verdict") rejected on the plan's Done criteria; two Importants fixed (emission guard; envelope-equivalence test); a round-2 Important (`review_did_not_complete` envelopes lack `postSelection`) rejected as out of plan scope. Five negative controls red. Concerns reported: a plan-internal inconsistency (Test plan vs Done criteria) resolved fail-closed.
- `w5-p01-review-001` — reviewer, target opus, eight rulings incl. the two rejections and the inconsistency, live probes on the built CLI. Record `dispatch/w5-p01-review-001.json`.
- `w5-p01-review-001` outcome: PASS with artifact-alignment findings, 0C/1I/1M/4m. Both non-minor findings are corrections to the plan's own text (I1: the Done checkbox's "every" vs the scoped Outcome/step 2 — Codex rejection upheld; the PR #246 preservation row is not the governing argument, plan scope is; M1: the Done criterion governs over the Test-plan bullet and the fail-closed reading leaves no criterion unmet). Live probes: recovered `ok`/`blocked` with the recovered disposition logged once; six non-recoverable cases → `review_failed`. Controls A/B/D + the reviewer's F red. Decision record matches. Weaker-anywhere clean. Address-now sweep `w5-p01-fix-001` for m1 (prose: re-validates the snapshot; artifact must still be present), m3 (`recovery_revalidation_failed` + `gate-recovery-failed` diagnostic), m4 (human-mode double print → buffered emission); m2 is a plan correction.
- `w5-p01-fix-001` outcome (address-now sweep, no re-review): one commit `06de22c7d` (five files): prose corrected in three artifacts (incl. `cli-reference.md:152`, mechanical propagation), sentinel cause + diagnostic with a red-then-green test, buffered human-mode emission with a red-then-green test (the red probe printed the leaked line). Focused 361, forced gates `Cached: 0`. Record `dispatch/w5-p01-fix-001.json`.
- `w5-p02-impl-001` outcome: DONE, one commit `78f1279dfb47c33f568a405ce9d28331d7048d4f` (14 files, +1357/−43). Two Codex rounds (malformed key failed open → fail-closed with a file-naming repair message; shallow path normalization → `posix.normalize` + escape rejection; parity test drives the real docs-index command; two rejections with reasons). Three negative controls red; issue #238 reproduced live on this repository. Hand-off for p05: the new key is parsed only in `oat-config.ts`.
- `w5-p02-review-001` — reviewer, target opus, eight rulings, recon attempted. Record `dispatch/w5-p02-review-001.json`.
- `w5-p02-review-001` outcome: APPROVE WITH CHANGES, 0C/2I/2M/5m. I1: `configuration.md:94` promised "never quietly dropped", which the code does not provide; I2 (reviewer's own probe): an exclusion matching no case-exact directory is silently inert while `excludedPaths` reports it — on APFS `Apps/Docsapp` reverts the docs page to `missing` while the JSON claims protection; M1: the "root cannot be excluded" guarantee had no test that can fail; M2: sync/validate abort on a malformed key they only consume for exclusion. Ruling for p05: an interface-derived family-coverage test will fail on the merged base (and on the pre-existing `documentation.index`); a catalog-union test passes. Fix round `w5-p02-fix-001`.
- `w5-p02-fix-001` outcome: one commit `f1790effdd5962414a4e0232ed6a9f919d46b6e5`: realpath case-exact classification, inert entries warned and withheld from additive `effectiveExcludedPaths`, additive `exclusionWarnings` in JSON (warnings are suppressed under `--json`), `.oat/repo/pjm` excludable (a false negative Codex found), the root-guard test proven red-then-green, documented config coupling, all minors. APFS before/after recorded. One Codex round (0C/2I/2M; one Important partly rejected with tests pinning "effective = protected"). Forced test 5848 (a concurrent-gate artifact caused a spurious first failure — gates must run sequentially in one worktree). Record `dispatch/w5-p02-fix-001.json`.
- `w5-p02-review-002` — disposition-verification round 2 on the original reviewer handle, range `78f1279df..f1790effd`. Record `dispatch/w5-p02-review-002.json`.
- `w5-p02-review-002` outcome: PASS (fan-in may proceed), 0C/0I/3M/4m, reconnaissance attempted. Provenance catch: the implementer's report cited `f1790effdc4b…`, an object that does not exist; the real fix commit is `f1790effdd5962414a4e0232ed6a9f919d46b6e5` (parent `78f1279df`), recorded here and in the ledger. All nine round-1 findings verified by probe on a force-rebuilt CLI (`/etc` now warns; the APFS mismatch yields three configured / zero effective / three warnings; M1 red-then-green; M2 doc scoping empirically accurate). Rulings: `effective = protected` semantics correct (eight-case matrix, warned ⟺ unprotected); `.oat/repo` descendants should be excludable. New Mediums (docs): `exclusionWarnings` undocumented and the page says "two additional fields" / "reported on stderr" (false under `--json`, 0 stderr lines); a wrong-TYPED `documentation.root` is silently dropped in both modes (a pre-existing door the new warnings do not cover); the "never leave `.oat/repo/**` unscanned" sentence is now literally false. Address-now sweep `w5-p02-fix-002` for the two docs Mediums; the wrong-typed-root warning filed as a follow-up. Gates green forced `Cached: 0` run sequentially (sequential gates adopted as a fan-in rule).
- `w5-p03-impl-001` outcome: DONE, one commit `36a56cb6409afd7831f705539796238732a53823` (eight files, +922/−37; four bumps, nine pins by version literal — the refresh entry's eight was itself one short). Two Codex rounds (6I/3M/1m then 5I/2M/1m: the tier-1 route gap, re-scaffold on resume, frontmatter closure, anchored skip line, the substantive-task predicate, fence-aware Reviews extraction; one Medium rejected because full YAML validation would need a CLI probe the plan's STOP excludes). Five negative controls red. Lite tables untouched.
- `w5-p03-review-001` — reviewer, target opus, eight rulings, the readiness guard executed verbatim. Record `dispatch/w5-p03-review-001.json`.
- `w5-p03-review-001` outcome: PASS with follow-ups, 0C/1I/3M/4m. Scaffold → not-ready (the Critical trigger did not fire); weaker-anywhere clean. I1: `oat-project-next` Tier 1b routed to implement with no readiness check; M1: the fence tracker treated ```and ~~~ as interchangeable (probe A1b READY); M2: condition 3 required`oat_template`PRESENT, contradicting`oat-project-next:182`(20 of 73 live quick plans omit it); M3: the Step 3 in-place clause had no test (NC6 passed). Fix round`w5-p03-fix-001` (I1, M1–M3, m1, m4; m2/m3 deferred).
- `w5-p03-fix-001` outcome: one commit `fcc6c0f2695a46642566d7205d80a300c99d66b5`: one tier-1b row (a 1b plan can never satisfy condition 2), CommonMark fence tracking (marker + run length, ≥4-space indented code), absent-or-false `oat_template` with a 76-plan corpus measurement (12 up, 0 down), Step 3 pinned, column-0 skip anchor, paired quotes. One Codex round (0C/0I/3M/1m; the `~~~yaml`-in-`~~~text` case rejected with a CommonMark trace). Record `dispatch/w5-p03-fix-001.json`.
- `w5-p03-review-002` — disposition-verification round 2 on the original reviewer handle. Record `dispatch/w5-p03-review-002.json`.
- `w5-p03-review-002` outcome: PASS (fan-in may proceed), 0C/0I/0M/1m. The single tier-1b row ruled correct (three fixtures with null/absent/non-implement `oat_ready_for` all not-ready); the fence rejection confirmed six-for-six against `micromark@4.0.2`; the corpus measurement reproduced (47→59 ready, 12 up, 0 down; scaffold still not-ready); NC6 now fails; no version or pin moved. m: the ≥4-space rules are redundant given the column-0 anchors (untested; no change).
- `w5-p02-fix-002` outcome (address-now docs sweep, no re-review): one docs-only commit `96a5d94800a809ebad10d400fd12eeb248fb87b3` (three docs pages): the three JSON exclusion fields documented with the per-mode warning channel (0 stderr lines under `--json` re-measured), the `.oat/repo` sentence reworded to the invariant that holds (carve-in never collaterally stranded; `.oat/repo` itself never excludable; deliberate descendant opt-outs honoured), three minors; the misleading symlink-warning reason deferred (code-message change). markdownlint 0 errors, docs pins 187. Record `dispatch/w5-p02-fix-002.json`.
- `w5-p04-impl-001`, `w5-p05-impl-001`, `w5-p06-impl-001` — group 2 dispatched together at the group-2 base `290590f00e25bb66f5c22ed1ad3551b37b2217fd` (no worktree-init sync commit needed; manifest already 0.2.63); each target opus, model_axis selected:opus, task_class default-implementation (plan dispatch profile). Records `dispatch/w5-p0{4,5,6}-impl-001.json`. Briefs carry the sequential-gates rule and the paste-SHAs rule adopted after group 1.
- `w5-p05-impl-001` outcome: DONE, one commit `3fd3aaa6267f5e8d70d8b624d9aa7e4b6a441a33` (six files, +906/−26). Two Codex rounds; one real defect fixed (aggregate keys permitted bulk deletion), four findings rejected with tests (`tools.*` refusal, dotted provider names, provider-root removal, `__proto__` end-to-end). Two negative controls red; real-artifact smoke through the repo-local CLI incl. the p02 uncatalogued key surviving `unset documentation.root`.
- `w5-p05-review-001` — reviewer, target opus, eight rulings incl. the three rejections and the `tools.*` refusal, recon attempted. Record `dispatch/w5-p05-review-001.json`.
- `w5-p05-review-001` outcome: PASS, 0C/0I/3M/5m. Weaker-anywhere clean (all eight `set` refusal classes refused identically by `unset`; `unset` stricter in two places); all three Codex rejections upheld by reproducing `set`'s semantics; `config list --json` emits exactly the 63 `KEY_ORDER` keys (coverage total); nine aggregate shapes rejected; `{}` and absent indistinguishable. Mediums: an INVALID stored value made `unset` claim already-unset while the key stayed on disk; the env-override guard tested the effective source not the targeted surface (and its message was wrong); the aggregate refusal was undocumented behind an exhaustive-sounding count. Address-now sweep `w5-p05-fix-001`.
- `w5-p05-fix-001` outcome (address-now sweep, no re-review): one commit `d779ea634448f81c59f4a0a234e670c492db5d05` (five files): raw-read fallback removes invalid stored values (red-then-green on a real file); env guard surface-scoped with a warning (red-then-green: the shared-surface asymmetry); five refusal classes enumerated on all three pages; `--json` `removed` documented; `oat tools remove` spelling aligned; `adopt` duplicate deferred (out of plan scope); set-worded refusal strings kept (a plan STOP forbids changing pinned messages). Focused 202, forced gates `Cached: 0`. Record `dispatch/w5-p05-fix-001.json`.
- `w5-p06-impl-001` outcome: DONE, one commit `8432f1d4d2933516a393956d7ee68b9c6957866e` (three files, +1003; `pack-manifest.ts` untouched). Two Codex rounds (fail-open extraction rewritten as a lossless two-stage scan; sharedOwner membership proven; unshipped fixture; four Markdown-boundary sub-claims fixed, the `#fragment` sub-claim rejected). Live negative controls three times; shipped surface 74/8/82 measured; `oat-project-lite` not falsely flagged.
- `w5-p06-review-001` — reviewer, target opus, eight rulings, adversarial reference corpus. Record `dispatch/w5-p06-review-001.json`.
- `w5-p06-review-001` outcome: PASS with findings, 0C/1I/0M/2m. I1 (the reviewer's own probe): Markdown emphasis adjoining a reference (`**…**`, `*…*`, `_…_`, bare trailing `**`) made the extractor fail open — proven live on `oat-docs-analyze`; graded Important not Critical (every plan-named shape caught in plain spelling; nothing previously rejected now accepted; zero live instances). Rulings: `#fragment` rejection correct; non-fence-aware scan is a win (8 of 11 live references sit in fenced shell blocks); Markdown-only scope not required wider; the tsc/type-aware-lint blind spot for test files is a wave follow-up. Fix round `w5-p06-fix-001`.
- `w5-p06-fix-001` outcome: one commit `970aedccc569a48cceba1878e9e6283ebaf1dd49` (+206/−11, same three files). The orchestrator's prescribed fix (strip a boundary run of `*` unconditionally) was implemented, measured, and reverted: it normalized `resolve-tracking.sh*` into the shipped name and truncated `generate-*` into a false positive; shipped instead is paired-delimiter stripping for `*` and `_` (a trailing run is decoration only when an opening run paired it), so `**x**`, `*x*`, `_x_`, nested `_**x**_` extract, a bare unpaired trailing `**` is skipped as a glob, and `resolve-tracking.sh_` still fails. Red-then-green: eight fixtures against the pre-fix module, two on the glue rejection, three on the pairing budget. Live probes after: the reviewer's verbatim bold probe now red; italic, nested, and the `_` typo red; bold-valid, italic-valid, and suffix-glob green. One Codex round (1I/2M: the unconditional strip fail-open accepted; the identifier character class widened to Unicode letters/digits plus `._-`; escaped/flanking underscores and raw HTML wrappers deferred with evidence). Scan boundary documented. Focused 152, CLI 5937, `pack-manifest.ts` still byte-identical. Record `dispatch/w5-p06-fix-001.json`.
- `w5-p06-review-002` — disposition-verification round 2 on the original reviewer handle. Record `dispatch/w5-p06-review-002.json`.
- `w5-p06-review-002` outcome: PASS (fan-in may proceed), 0C/0I/0M/2m. The reviewer built three modules side by side (round 1, its own round-1 prescription, the shipped round 2) and measured: the prescription silently accepted `resolve-tracking.sh*` as the shipped name and flagged `generate-*` on correct docs — the implementer was right; skipping a bare unpaired trailing `**` is acceptable (no local evidence separates emphasis from glob; it also renders visibly wrong on the page). Weaker-anywhere clean: of 38 round-1 corpus cases, 5 moved skipped → reported (the fix), 1 moved reported → skipped (`myrepo*.oat/…`, a false positive corrected), 32 unchanged. Neutralizations reproduced (8 / 2 / 3, plus a stronger 4); the verbatim bold probe red at `SKILL.md:517`; gates forced `Cached: 0` (5937). New m1: an escaped-underscore reference (`\_.oat/scripts/x.sh\_`) now yields a trailing backslash and a false positive (zero live instances; one-line fix: return null from `readOpeningEmphasis` when the run is preceded by `\`) → deferred to a follow-up; m2: raw HTML wrappers and intraword `**` are silent misses identical to round 1 (deferrals accepted).
- `w5-p04-impl-001` outcome: DONE, one commit `48837edf0be8bd42e208e7afa3ab273fb04fbf53` (nine files, +2408/−72). Two Codex rounds (lock detection narrowed to git's own contention evidence; competing-writer settlement made sound; receipt recovery bound to runId/producer/ref/body/signature; dedupe by exact token; fresh-process test through `tsx` with a private TMPDIR asserting no gate marker; six round-2 fixes). Ten negative probes red. Deviation reported: retry/classification/dedupe placed in the log module to avoid a `gate ↔ log` import cycle; `project-log.md` widened mechanically.
- `w5-p04-review-001` — reviewer, target opus, eight rulings, real held `.git/index.lock` probes. Record `dispatch/w5-p04-review-001.json`.
- `w5-p04-review-001` outcome: PASS, 0C/0I/1M/5m. Real-lock probes on the built `dist` CLI (transient → attempts 2, committed once; persistent → attempts 3, exit 1, lock untouched with unchanged mtime; hook mentions and git's advice alone → not retried); fresh-process recovery through `dist` via `sh -c` with no `oat-gate-runs` marker; seven receipt-mismatch probes all refuse and keep the receipt; four controls re-run red; weaker-anywhere clean (the old commit-failed diagnostic still fires). Module-placement deviation ruled correct (a genuine import cycle; DR-260718 honoured; the gate never opens `project-log.md`). M1: the `.gitignore` stanza is hard-coded to the default projects root, so a relocated `projects.root` tracks the receipt (inherited from the plan's In-scope wording). Address-now sweep `w5-p04-fix-001`.
- `w5-p04-fix-001` outcome (address-now sweep, no re-review): one commit `09de4c92fefe8649f1fb038692ed163e80433e6a` (seven files): `.gitignore` now carries a repository-wide `**/gate-receipts/` rule outside both managed blocks (red-then-green against the legacy stanza; controls prove the log and source files are not ignored; `git ls-files` shows no tracked receipt), `writeGateProjectLogReceipt` runs `git check-ignore` on the written path and warns only on exit status 1 through the diagnostic seam (`gate-project-log-receipt-warning`, also visible in JSON — a latent gap closed), the pending-receipt scan derives `logPath` from the gated project and reports a disagreeing recorded path as `pending`, the null-artifact receipt case documented in docs and DR, the contrived-hook residual pinned as accepted, the settlement doc comment moved. The DR's Decision paragraph had one literal glob token corrected to the repository-wide rule (reported); the index did not change. Focused 335, CLI 5903, forced gates `Cached: 0`. Record `dispatch/w5-p04-fix-001.json`.

#### Phase Outcomes

| Phase | Worktree                | Implementer outcome                                                              | Review outcome                                                   | Fix rounds |
| ----- | ----------------------- | -------------------------------------------------------------------------------- | ---------------------------------------------------------------- | ---------- |
| p01   | `.worktrees/wave-5/p01` | DONE_WITH_CONCERNS (`7c1988b63` + sweep `06de22c7d`; forced CLI suite 5815)      | passed (0C/1I/1M/4m — I1/M1 plan corrections; address-now sweep) | 0          |
| p02   | `.worktrees/wave-5/p02` | DONE (`78f1279df` + fix `f1790effd` + sweep `96a5d9480`; forced CLI suite 5848)  | passed (round 1 0C/2I/2M/5m → round 2 0C/0I/3M/4m)               | 1          |
| p03   | `.worktrees/wave-5/p03` | DONE (`36a56cb64` + fix `fcc6c0f26`; forced CLI suite 5808, check:skill-bumps 4) | passed (round 1 0C/1I/3M/4m → round 2 0C/0I/0M/1m)               | 1          |

#### Group 1 fan-in — p01, p02, p03 (2026-09-07)

- Merge order p01 → p02 → p03 with `git merge --no-ff` after rebasing each lane on the integration tip (each lane's worktree-init `chore: run sync` commit — the manifest restamp 0.2.61 → 0.2.62 Lite had left behind — rode along once, `d5078ee85`). Merge commits `9c932c262` (p01), `ef4fc6b69` (p02), `d77063b96` (p03). The first merge commit was rejected by commitlint for a 111-character header (the wave-3/4 message format); the fan-in scripts now use a short header with the lane title in the body. Lane commits re-hashed by the rebase (identical `git patch-id --stable` pairs; the Reviews table keeps the pre-rebase heads the reviewers examined): 06de22c7d→d862ecb47; 7c1988b63→1f6b1c9fe; 96a5d9480→3ff67384d; f1790effd→6ed220954; 78f1279df→82898f9dc; fcc6c0f26→ea25e45e7; 36a56cb64→8f4be3270.
- Repository hygiene commit `74e37e6e2`: the Lite merge had re-added three archived wave-4 backlog items under `items/` (`pjm doctor` warned); removed by literal path and the index regenerated.
- Fan-in-owned lockstep bump 0.2.62 → 0.2.63 above freshly fetched `origin/main` (`0f47bf700`), commit `fdcb6c3ed`; `public-package-versions.json` regenerated by the build; `.oat/sync/manifest.json` restamped in the same commit (`pnpm run cli -- sync --scope project` printed the wave-4 advisory: manifest produced by 0.2.62, invoked by 0.2.63; `Manifest version refreshed; no content changes required.`).
- Integration gates (group fan-in mode), exit codes captured: `pnpm check` 0, `pnpm type-check` 0, `HOME=$(mktemp -d) pnpm exec turbo run test --force` 0 (0 cached, 10 total), `pnpm build` 0, `pnpm run check:skill-bumps` 0, `pnpm release:check-versions` 0, `pnpm release:validate` 0, `pnpm build:docs` 0. Config-integrity check: all tracked `.oat/config.json` keys present. Gates run sequentially (the p02 lane showed that concurrent asset-mutating gates in one tree produce spurious failures).
- Group-2 readiness on the merged tip: p04, p05, p06 plans are READY; p04 re-anchors on p01's gate-module changes and appends to the same docs tables (merge p01 first was honoured; p04 rebases its docs hunk), p05's family-coverage test must include p02's `documentation.instructionPointerExcludes` (parsed only in `oat-config.ts`, absent from the catalog) — its plan's refresh entry covers this. Group-1 worktrees and branches removed after the merge.
  | p04 | `.worktrees/wave-5/p04` | DONE (`48837edf0` + sweep `09de4c92f`; forced CLI suite 5898) | passed (0C/0I/1M/5m; address-now sweep) | 0 |
  | p05 | `.worktrees/wave-5/p05` | DONE (`3fd3aaa62` + sweep `d779ea634`; forced CLI suite, focused 202) | passed (0C/0I/3M/5m; address-now sweep) | 0 |
  | p06 | `.worktrees/wave-5/p06` | DONE (`8432f1d4d` + fix `970aedccc`; forced CLI suite 5924) | passed (round 1 0C/1I/0M/2m → round 2 0C/0I/0M/2m) | 1 |

#### Parallel Groups

- group 1: p01 + p02 + p03 (merged); group 2: p04 + p05 + p06 (merged, fan-in complete); p07 → p08, p09 → p10, p11 (sequential, next).

#### Outstanding Items

- p07 → p08 (group 3), p09 → p10 (group 4), p11 (group 5), each alone after the previous merge; then closeout.
- Group 2 (p04 + p05 + p06) after the group-1 fan-in; then p07 → p08, p09 → p10, p11; closeout.
- Journal note: dispatch records are immutable after the first revision; terminal outcomes live in the Dispatch Notes above.

<!-- orchestration-runs-end -->

## Implementation Log

Chronological log of implementation progress (root orchestrator; lane detail lives in the dispatch transcripts and review artifacts).

### 2026-09-07

- p01-t01 `7c1988b63`→`1f6b1c9fe`, sweep `06de22c7d`→`d862ecb47`; p02-t01 `78f1279df`→`82898f9dc`, fix `f1790effd`→`6ed220954`, docs sweep `96a5d9480`→`3ff67384d`; p03-t01 `36a56cb64`→`8f4be3270`, fix `fcc6c0f26`→`ea25e45e7`; merges `9c932c262`, `ef4fc6b69`, `d77063b96`; hygiene `74e37e6e2`; lockstep bump `fdcb6c3ed`.
- Wrapper authored from the program's Wave 5 section and the wave-boundary drift refresh (`f4b7c0c4f`); plan gate blocked three times on the refresh-carrying mechanism (attempts 1, 3, 4; attempt 2 superseded) and passed on attempt 5 (0 findings) after the refreshes were applied to eight source plans (`576fc11d8`).

## Deviations from Plan / Design

| Task / Review | Source Artifact | Planned / Documented | Actual / Accepted | Reason | Source of Truth | Follow-up |
| ------------- | --------------- | -------------------- | ----------------- | ------ | --------------- | --------- |
| -             | -               | -                    | -                 | -      | -               | -         |

## Test Results

| Phase | Tests Run                                     | Passed | Failed | Coverage |
| ----- | --------------------------------------------- | ------ | ------ | -------- |
| p01   | 5815 (forced CLI suite) + 361 gate            | all    | 0      | -        |
| p02   | 5848 (forced CLI suite) + 231 focused         | all    | 0      | -        |
| p03   | 5808 (forced CLI suite) + 322 focused         | all    | 0      | -        |
| p04   | 5898 (forced CLI suite) + 330 focused         | all    | 0      | -        |
| p05   | forced CLI suite + 202 focused + 59 snapshots | all    | 0      | -        |
| p06   | 5924 (forced CLI suite) + 139 focused         | all    | 0      | -        |
| p07   | -                                             | -      | -      | -        |
| p08   | -                                             | -      | -      | -        |
| p09   | -                                             | -      | -      | -        |
| p10   | -                                             | -      | -      | -        |
| p11   | -                                             | -      | -      | -        |

## Final Summary (for PR/docs)

**What shipped:**

- (filled at closeout)

**Behavioral changes (user-facing):**

- (filled at closeout)

**Key files / modules:**

- (filled at closeout)

**Verification performed:**

- (filled at closeout)

**Design deltas (if any):**

- (filled at closeout)

## References

- Plan: `plan.md`
- Discovery: `discovery.md`
- Program: `.oat/repo/reference/external-plans/2026-08-31-execution-program.md`
