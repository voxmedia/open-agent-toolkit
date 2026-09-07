---
oat_status: in_progress
oat_ready_for: null
oat_blockers: []
oat_last_updated: 2026-09-07
oat_current_task_id: null
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
| Phase 07 (enforce-external-plan-readiness-contract)                         | complete | 1     | 1/1       |
| Phase 08 (make-autonomous-project-recap-capability-aware)                   | complete | 1     | 1/1       |
| Phase 09 (defer-activeproject-clearing-on-archive-completions)              | blocked  | 1     | 0/1       |
| Phase 10 (make-terminal-project-status-agree-with-revision-plans)           | complete | 1     | 1/1       |
| Phase 11 (make-consolidated-project-retirement-semantic)                    | complete | 1     | 1/1       |
| Phase 12 (exit-gate fixes)                                                  | complete | 9     | 9/9       |

**Total:** 19/20 planned tasks completed; 1 parked (p09)

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

**Status:** complete · **Group:** 3 (sequential pair, first) · **Tasks:** p07-t01 (+ one review-fix commit)
**Outcome:** `oat-repo-improve` (2.1.2 → 2.1.3) and its plan template now distinguish plan-readiness from execution-readiness: `READY` ⇔ no unsatisfied hard dependency and `BLOCKED` ⇔ at least one (the template's biconditional), with a `## Dependencies` four-column table contract (Hard/Soft/Satisfied classes, token-boundary type matching, escaped pipes), landing-event and revalidation non-vacuity, ISO dates, and comparison-SHA wording; `skills-bundled-docs-contract.test.ts` enforces it prospectively (plans dated after the contract) and sweeps all 44 dated plans in legacy mode with an explicit allowlist; docs mirror updated.
**Verification:** focused 286, forced check/type-check/test `Cached: 0` (6006), check:skill-bumps; the parser validated against all 44 real plans (131 dependency rows, zero structure failures); review round 1 (0C/1I/2M/5m) plus round 2 (0C/0I/0M/2m).
**Deviations:** readiness rules implemented as local test helpers rather than a shipped module (the plan's In-scope names only the test file; consumers deferred); a real plan with a stale BLOCKED row serves as the negative-control fixture (left unedited per Out of scope; wave-close correction filed); the pre-existing stray template fence stays tracked as `BL-260906-repair-the-stray-fence-in-oat`.

### Task p07-t01: Execute external plan — Enforce plan-readiness versus execution-readiness in oat-repo-improve

**Status:** completed
**Commit:** `e4dfa0e27`; review fix `9c2f96ca5`

## Phase 08: make autonomous project recap capability aware (p08)

**Status:** complete · **Group:** 3 (sequential pair, second) · **Tasks:** p08-t01 (+ one review-fix commit)
**Outcome:** the autonomous project recap is capability-aware and non-blocking: a new `probe-recap-seams.mjs` in `oat-explainer-kit` classifies the five adapter seams (author, critic, browser, visual, planner) check by check against `run.mjs`'s resolvers; in autonomy the closeout runs the recap gate exactly once and attempts generation only when intent resolves to `generate` and every required seam resolves, otherwise records a capability `skip` naming the seam (an `invalid` seam stays a failure; a forged or wrong-mode probe can never produce a skip); interactive behavior unchanged; the Lite non-lite recap carve-out preserved verbatim and pinned; five skills bumped (complete 1.7.8, implement 2.3.6, summary 1.5.3, autonomous 1.0.13, explainer-kit 1.0.7) with their pins; docs and the autonomy inventory updated.
**Verification:** test:skills 856, forced check/type-check/test `Cached: 0` (6007), check:skill-bumps 10 branch-wide; review round 1 (1C/2I/1M/3m) plus round 2 (0C/0I/0M/0m).
**Deviations:** the probe treats the fact critic as a required seam per the plan although `run.mjs#resolveLifecycleCritic` returns null when it is absent (the one place the probe is stricter than the adapter — ruled by the reviewer); the pre-commit hook re-padded `.agents/docs/autonomy-contract.md` tables (semantic delta: three changes); the `oat-project-complete` bare pin is at `review-skill-contracts.test.ts:1211`, not the refresh entry's `:1089`.

### Task p08-t01: Execute external plan — Make the autonomous project recap capability-aware and non-blocking

**Status:** completed
**Commit:** `049783897`; review fix `d7f8a6ff8`

## Phase 09: defer activeproject clearing on archive completions (p09)

**Status:** blocked (parked on the plan's own STOP condition) · **Group:** 4 (sequential pair, first) · **Tasks:** p09-t01
**Outcome:** none merged. The plan's resume design rests on a false premise (the completion seal append is not idempotent and the status probe cannot see a seal), reproduced against the real CLI; executing it would widen the active-pointer window across the whole closeout and append duplicate seals. Parked work (steps 1, 2, 3, 5) preserved as a patch; two backlog items filed.
**Verification:** the new validator suite 13/13 in the worktree (uncommitted); no lane gates run (no commit).
**Deviations:** STOP → BLOCKED per wrapper rule 4; the plan requires a refresh or supersession (`BL-260907-make-the-completion-seal`); the incidental `finalize-synced-archive.mjs` stdin bug filed as `BL-260907-finalize-synced-archive-mjs`.

### Task p09-t01: Execute external plan — Defer activeProject clearing on shared archive completions

**Status:** blocked
**Commit:** - (parked; patch `w5/p09-parked-work.patch` in the orchestrator scratchpad)

## Phase 10: make terminal project status agree with revision plans (p10)

**Status:** complete · **Group:** 4 (sequential pair, second; ran on the tip after p08 because p09 parked) · **Tasks:** p10-t01 (+ one pin commit)
**Outcome:** terminal project status agrees with completed revision plans: the control-plane task parser normalizes heading dialects (`## Revision Phase p-rev1:` pairs with `prev1-t01`; ordinals compared as zero-padded strings so adjacent large ordinals stay distinct; wrong-phase and kind-mismatched task ids rejected), the recommender's post-implementation guard treats a project as terminal only when `oat_lifecycle` is `complete` AND no revision phase is incomplete, keyed on lifecycle alone with no workflow-mode branch (spec-driven, quick, and lite behave identically; `paused`/`active` still resume), and `oat-project-next` Step 1 reads `oat_lifecycle` with the Step 5.2 discriminator pinned; `HeadingDialect` deleted.
**Verification:** forced check/type-check/test `Cached: 0` (control-plane 102, cli 6008), lint, format, validate-skills, test:smoke; real archived projects re-parsed read-only (9/36 and both revision phases discovered where the old parser dropped them); review round 1 (0C/1I/1M/4m) plus round 2 (0C/0I/0M/2m).
**Deviations:** two pre-existing negative expectations in `tasks.test.ts` flipped to positives per the plan's Step 2 (cross-spelling same-phase pairing must count; the cross-phase negatives survive in a dedicated case) — ruled by the reviewer; archived projects with `**Status:** complete` and no `### Task` headings still report 0 completed (completion-format class the plan declares out of scope → follow-up).

### Task p10-t01: Execute external plan — Make terminal project status agree with completed revision plans

**Status:** completed
**Commit:** `9d0049212`; pin `aaf4c8677`

## Phase 11: make consolidated project retirement semantic (p11)

**Status:** complete · **Group:** 5 (HiLL lane; ran last on the tip after p10) · **Tasks:** p11-t01 (+ one address-now sweep commit)
**Outcome:** consolidated-project retirement is semantic: `oat-project-complete` sweeps the `absorbed_projects` / `absorbed_backlog_ids` a quick-start consolidation recorded, sweeps the active planning surfaces (roadmap, current-state, open backlog items, still-active project states under the configured `projects.root`) for future-oriented ownership language naming an absorbed slug or backlog ID and records a disposition per finding (advisory — a raw match is never a hard block on closeout; the completing project's own `absorbed_*` fields are input, never a finding), recording each disposition (incl. `deferred advisory`) in the project log INSIDE Step 3.7 — before the roll-up and seal, never after — detects an already-sealed log on a resumed completion by reading the log at `logPath`, resolves the configured `projects.root` for the still-active-project glob (93 matches here where the plan's literal glob matched zero) and excludes terminal `oat_lifecycle: complete` projects; `oat-project-quick-start` records the two fields; `lifecycle.md` documents the sweep; strictly append-only (353 added, 0 deleted).
**Verification:** forced check/type-check/test `Cached: 0` (CLI 6011), check:skill-bumps, lint, format, validate-skills, test:smoke 160; five red proofs re-run by the reviewer (all non-vacuous) plus two reviewer probes (terminal-complete exclusion vs a live claim; ordering anchors unique); review 0C/0I/1M/3m PASS; address-now sweep `w5-p11-sweep-001` (self-exemption clause, ownership-language match sentence, quick-mode-only qualifier in the docs).
**Deviations:** no re-bumps (complete 1.7.8 from p08, quick-start 2.3.10 from p03); a Lite consolidation records no `absorbed_*` fields (PR #264 in the base; plan scoped to quick-start) → follow-up filed at closeout; quick-start's pre-existing stale `PROJECT_PATH` after `oat project new` → follow-up filed; the plan's `-t 'absorbed'` verify filter skips the resume test → wave-close correction.

### Task p11-t01: Execute external plan — Make consolidated-project retirement checks semantic

**Status:** completed
**Commit:** `0bd2a2815`; sweep `a61e42b52`

## Phase 12: exit-gate fixes (p12)

**Status:** complete (every exit-gate finding from attempts 1 and 2 and the superseded launch is fixed; the gate itself is exhausted and blocked pending an operator decision) · **Group:** exit-gate fix round (worktrees A = p12-t01/t02/t03, B = p12-t05/t06/t07, C = p12-t04, D = p12-t08, E = p12-t09) · **Tasks:** p12-t01 … p12-t09
**Outcome:** all seven attempt-1 findings resolved with red-then-green controls: the gate-log append window is one critical section under a project-local advisory lock in the log module (never a Git lock; a rewrite that cannot take the lock refuses) and a commit settles only when `HEAD:project-log.md` positively carries the caller's entry (`entry-missing-after-commit` / `commit-unverified` route to the receipt); receipt staleness is decided against `HEAD:project-log.md` with exact identity; `documentation.instructionPointerExcludes` is catalogued (`string[]` through `normalizeExcludedPaths`, absolute / `..` / drive-letter entries refused, family coverage + `KEY_ORDER` removal control, five docs pages); the control-plane reader carries an executable Quick Plan Readiness predicate (34/34 verdict parity with the skill's awk guard; 51 non-quick fixtures byte-identical; `oat project status` public controls); the awk guard measures indentation in columns (tab → next multiple of four) in both copies; quick-start re-resolves `PROJECT_PATH` from `oat project new --json` (status-gated fallback) before Step 1 with a real-CLI create-path control reading `absorbed*_`back; the readiness contract backstops the plan↔source backlink in both directions (fence-aware, all link forms,`none`as a whole value).
**Verification:** per lane: focused suites, forced check/type-check/test`Cached: 0`, check:skill-bumps, lint, format, validate-skills, test:smoke (B), one or two Codex rounds (A: 2 + 1 + 1; B: 1 per task; C: 1, zero findings); fan-in on the tip: eight gates green (CLI 6036, control-plane 141), `pnpm test:smoke`, `pnpm test:skills`, root `pnpm test`all 0.
**Deviations:** t02 also changed`apps/oat-docs/docs/cli-utilities/workflow-gates.md`and removed the dead working-tree reader`projectLogContainsIdempotencyKey`from`append.ts`(its only consumer was the replaced line); t03 also changed`oat-config.ts`and`oat-config.test.ts`(the repair message and a lenient reader so`set`can repair a malformed value) and three more docs pages that claimed the key had no`oat config`entry; t04 decides every quick`plan`-phase tier by readiness (tier 3 and 1b too, matching the `oat-project-next`table) and adds an additive`quickPlanReadiness`field to`oat project status --json`; t07 also guards the item→plan half. Deferred: `unset`on a malformed stored value exits 1 (identical pre-existing behavior for`documentation.excludes`) → follow-up at closeout; five legacy `2026-08-19-_` plans carry no source backlink (exempt by legacy mode).

### Task p12-t01: (review) Make gate project-log finalization concurrency-safe and identity-verified

**Status:** completed
**Commit:** `4c7186666`→`d804cd3ff`

### Task p12-t02: (review) Classify a gate receipt as stale only against the committed log

**Status:** completed
**Commit:** `ab17b7322`→`ff4cb2a06`

### Task p12-t03: (review) Catalog documentation.instructionPointerExcludes for oat config set/unset

**Status:** completed
**Commit:** `2753eef49`→`e768163d5`

### Task p12-t04: (review) Give the control-plane recommender the quick-plan readiness predicate

**Status:** completed
**Commit:** `cd3107e38`→`f205f0478`

### Task p12-t05: (review) Measure fence indentation in columns in the quick-start readiness guard

**Status:** completed
**Commit:** `ef0f0b72f`→`60a00dde3`

### Task p12-t06: (review) Re-resolve PROJECT_PATH after quick-start scaffolds and prove the absorbed fields land

**Status:** completed
**Commit:** `d1f7a6baf`→`2bf2ae0b0`

### Task p12-t07: (review) Backstop the external-plan source backlink in the readiness contract

**Status:** completed
**Commit:** `0a6ae1118`→`97fc307ee`

### Task p12-t08: (review) Relate the source backlink to its declared source and refresh the parser comment

**Status:** completed
**Commit:** `18de7b1f1`→`dc890c0bc`

### Task p12-t09: (review) Tighten backlog-ID matching and ignore reference definitions inside HTML comments

**Status:** completed
**Commit:** `3a1df2d16`→`80b36ae05`

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

- `w5-p01-impl-001`, `w5-p02-impl-001`, `w5-p03-impl-001` — group 1 dispatched together; each target opus, model_axis selected:opus, effort_axis not-applicable, selection_reason native-catalog, task_class hard-reasoning (p01) / default-implementation (p02, p03) (plan dispatch profile). Stamps: `Dispatch: scope=p0N action=implementation role=implementer producer=unknown provenance=unknown model_axis=selected:opus effort_axis=not-applicable dispatch_policy=high dispatch_ceiling=opus target=opus`. Records `dispatch/w5-p0{1,2,3}-impl-001.json`. Briefs point the lane at its plan including the dated `Refresh applied 2026-09-07` entry where the plan carries one (p01 and p03; p02 needed no refresh).
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
- `w5-p07-impl-001` — p07 dispatched alone at the group-3 base `56e05aeb6f264e4d0ef51da7c8c61a652cd0e039` (no sync commit needed); target opus, task_class default-implementation. Record `dispatch/w5-p07-impl-001.json`.
- `w5-p07-impl-001` outcome: DONE, one commit `e4dfa0e27c6c092a7f0968af6cc735dd2e40828c` (five files; repo-improve 2.1.2 → 2.1.3, one pin). Two Codex rounds (R1 0C/6I/3M: self-satisfying template assertions — the heading appears in prose four times — fixed with line-anchored exact-count sections; dependency parsing, one-directional status agreement, failure-proved branches, corpus sweep, accepted control, fence-tracked sections, SHA wording; R2 four more Importants fixed; two rejections: the pre-existing stray fence tracked as a backlog item, and a full CommonMark table parser as disproportionate). Eleven neutralization probes; parser validated against all 44 dated plans. Real negative control: a READY plan with a stale BLOCKED row (`2026-09-02-add-exclusions-to-docs-index-generation.md`), accepted today only by legacy dating → wave-close correction.
- `w5-p07-review-001` — reviewer, target opus, eight rulings (biconditional fixtures, the real-file fixture, corpus sweep, test helpers vs shipped module, the rejections, bump/pin, the p06 seam, weaker-anywhere). Record `dispatch/w5-p07-review-001.json`.
- `w5-p07-review-001` outcome: PASS with findings, 0C/1I/2M/5m. Gates re-run forced `Cached: 0` (6006); the contract test is purely additive (813 insertions, 0 deletions) so no prior assertion weakened; all 44 dated plans still accepted; six biconditional fixtures behave in both directions, a piped code-span row is not false-rejected, the 2026-09-07 boundary exact; a post-contract plan dropped into `external-plans/` fails the sweep naming six violations; five neutralizations red. I1 (the reviewer's probe): a document with `oat_execution_program: true` and a post-contract date bypassed every prospective rule — vocabulary owned by `oat-wave-program`, undocumented in this contract, untested, unreachable today. M1: the negative control read the live defective plan, so repairing it would break CI; M2: the `index` branch untested. Rulings: leaving the live READY/BLOCKED contradiction unedited is correct (retrofit is a STOP trigger); test helpers rather than a shipped module explicitly permitted; both Codex rejections valid; no named-skill obligation; `check:skill-bumps` prints 5 branch-wide with one skill in this lane. Fix round `w5-p07-fix-001`.
- `w5-p07-fix-001` outcome: one commit `9c2f96ca5c7acaf387961b98b386f143590f0cee` (seven files incl. a new provenance-headed fixture and an `.oxfmtrc.jsonc` ignore for `__fixtures__/**`): execution programs are held to their own ledger contract (indexes, five-column status ledger with producer vocabulary tolerating `merged`/`done`, wave table), mode selected from `created` for programs since the producer template emits no plan date (Codex catch: the rules were otherwise unreachable), both real programs pass as legacy and when re-dated; the live-file control replaced by the snapshot fixture (proven by simulating the wave-close repair: old test exit 1, new test exit 0); index branch tested; docs mirror and the stray-fence scope note. One Codex round (1I/2M fixed; the `oat-wave-program` `merged` vs `done` self-contradiction tolerated and logged as a follow-up). Focused 287, CLI 6007. Record `dispatch/w5-p07-fix-001.json`.
- `w5-p07-review-002` — disposition-verification round 2 on the original reviewer handle. Record `dispatch/w5-p07-review-002.json`.
- `w5-p07-review-002` outcome: PASS (fan-in may proceed), 0C/0I/0M/2m. The round-1 P1 bypass probe now rejected on all three ledger rules; both real programs pass as written and re-dated; the fixture byte-compared against `git show 6db0457c0:<source>` (identical; the only surviving live-plan reference is the fixture's `Source:` header); index branch covered; rulings: ledger contract instead of SHA rules is the correct reading (the producer template emits none of the SHA fields), the `created` fallback is necessary and gated on programs, the `merged`/`done` tolerance correct; nine adversarial program probes and four neutralizations (incl. stripping the fixture's provenance header); corpus sweep 44 dated / 0 rejected; `oat-repo-improve` 2.1.3, no pin moved; gates forced `Cached: 0` (287 / 6007). Minors: the program `created` fallback fails OPEN for an unparseable or missing date (follow-up); the `oat-wave-program` vocabulary contradiction had no tracked item (both now in the wave's follow-up list).
- `w5-p08-impl-001` — p08 dispatched alone at the group-3 second base `8b2784643fcf56e75ae09926281e312b668867ed` (no sync commit needed); target opus, task_class hard-reasoning. Record `dispatch/w5-p08-impl-001.json`.
- `w5-p08-impl-001` outcome: DONE, one commit `049783897a03bfed27a798dfa39478b821f24f0a` (20 files, +1587/−194; five bumps by version literal). Two Codex rounds (R1 0C/3I/3M: `seamProbe` scoped to autonomous resolution, the unconditional recap attempt removed, the handoff pinned, parity with `run.mjs`, discriminated-union probe validation, explicit invocation anchors; R2 0C/2I/2M: forgery resistance (wrong-mode/unknown IDs/inconsistent partitions), interactive branch made explicit, a REAL parity bug — `resolveLifecycleCritic` raises a type error not a conflict for `{critic, criticModulePath}` — fixed by five per-resolver classifiers, docs and the `IMPLEMENT-19` gate row corrected). Four neutralization groups red (10/11/1/1). Judgment call flagged: the critic is required per the plan although the adapter returns null without one. Autonomy inventory remapped three times; the vendored `autonomy-contract.md` copies are symlinks.
- `w5-p08-review-001` — reviewer, target opus, eight rulings incl. the critic-seam judgment, verbatim snippet execution, parity probes, forgery probes. Record `dispatch/w5-p08-review-001.json`.
- `w5-p08-review-001` outcome: CHANGES REQUESTED, 1C/2I/1M/3m. C1: `tools/smoke/explainer-kit/wrapper-compatibility.test.mjs:435` still pinned `oat-explainer-kit` at `1\.0\.6` (regex-escaped), so `pnpm test:smoke` and root `pnpm test` were red — the lane's forced `turbo run test` never reaches the smoke tier and its literal sweep covered only the two named test files. I1: the invocation gate was mode-unqualified (interactive seam-less completion would regress from `failed` to blocked by `E_RECAP_OUTCOME`; the ambiguous literal pinned). I2: `assertSeamProbe` never enforced the partition its message promised (2 of 19 forged shapes survived). Rulings: the critic seam is NOT a divergence (`bind-project-sources.mjs:71` binds lifecycle recaps federated; `fact-base.mjs:27-31` throws without a critic) — probe correct as shipped; parity 29/29 with `run.mjs`'s resolvers (probed by exporting them into a mktemp copy); forgery 17/19 rejected, no shape converts an invalid seam into a skip; the five `NG` inventory mappings genuine; the 242-line reformat reduces to the three intended hunks; the Lite carve-out byte-identical and pinned; four neutralization groups red. Fix round `w5-p08-fix-001`.
- `w5-p08-fix-001` outcome: one commit `d7f8a6ff8f1d66d6dbc8fadf429179f16546647e` (10 files): the smoke pin moved to `1\.0\.7` (`test:smoke` 160/160, root `pnpm test` exit 0 — both had been red); a repo-wide fixed-string sweep of all five old versions in plain and escaped forms (the escaped regex was the only hit); both invocation gates qualified "In autonomy" with the interactive rule stated separately and a never-read-as-one clause (red-then-green on the pinned literal; the pre-existing `runOatExplainer exactly once` literal kept contiguous); `assertSeamProbe` enforces a disjoint, duplicate-free, complete five-seam partition (the review's shapes 12 and 14 now rejected); Step 3.6 states the probe-driven skip supersedes the resolved intent; the critic-seam framing recorded as a durable code comment; interactive guidance no longer offers `capability_probe`. One Codex round (0C/0I/0M/2m fixed). Record `dispatch/w5-p08-fix-001.json`. Wave rule adopted: sweep old version literals repo-wide in plain and escaped forms and run `pnpm test:smoke` whenever a skill is bumped.
- `w5-p08-review-002` — disposition-verification round 2 on the original reviewer handle. Record `dispatch/w5-p08-review-002.json`.
- `w5-p08-review-002` outcome: PASS (fan-in may proceed), 0C/0I/0M/0m. `pnpm test:smoke` 160/160 and root `pnpm test` exit 0 re-run by the reviewer (both had been red); escaped-form sweep over 2,317 tracked files clean on every code/test/skill/asset surface; interactive seam-less end state executed (guard accepts `generate` + `failed`, never `E_RECAP_OUTCOME`); all 19 forged shapes rejected; an exhaustive 3^5 = 243 real-producer host-combination probe (skip 31 / generate 1 / fail-closed 211 / spurious 0) with zero legitimate probes rejected; the two new `NG` inventory mappings ruled correct (exact table delta computed); the narrowed critic comment accurate; two neutralizations red; Lite carve-out and `PROJECT_RECAP_REACHABLE` byte-identical to base; `check:skill-bumps` 10; gates forced `Cached: 0`.
- `w5-p09-impl-001` — p09 dispatched alone at the group-4 base `956773dc6832dea1a765bfa61716e824166878fc`; target opus, task_class default-implementation. Record `dispatch/w5-p09-impl-001.json`.
- `w5-p09-impl-001` outcome: BLOCKED (parked, no commit). The plan's own STOP condition fired — "the resume design would require a second `oat project archive` invocation, a project-log append after the seal, or skipping the Step 7 artifact" — because the plan's step-3 premise ("Step 3.7's status probe sees the existing seal and skips the append") is false against the real CLI: `oat project log check` has no seal awareness (`check.ts:35`), the seal append passes no idempotency key and embeds a fresh timestamp (`SKILL.md:680`), replaying the skill's seal invocation appended a second seal both times, and the Step 3.65 router that could skip `project-log` is gated to synced non-archive completions. Widening the Step 6 guard as the plan requires would keep the pointer alive through the network-bearing closeout and make every interruption append a second seal, breaking the skill's pinned "No project-log append may follow the seal" contract and two of the plan's own acceptance items. Parked work (steps 1, 2, 3, 5: guard widening, a separate durable validator with directory + receipt modes, the shared resume branch, both docs pages; 531 insertions; no bump) preserved as a patch in the orchestrator's scratchpad; the worktree left dirty at the base; `oat-project-complete` untouched at 1.7.8. Filed: `BL-260907-make-the-completion-seal` (plan refresh/supersession: seal idempotence CLI-side or router extension) and `BL-260907-finalize-synced-archive-mjs` (incidental, higher-severity pre-existing bug: `finalize-synced-archive.mjs:94` reads stdin with `fs/promises` `readFile(0)`, so the synced deferred clear from PR #254 always fails). Per wrapper rule 4/5 the park does not block group 4's second lane or group 5: p10 and p11 run on the current tip.
- `w5-p10-impl-001` — p10 dispatched alone at `fa5caf514cbd4cfad086234fe6c03cae4cfb30ef` (the tip after p08 plus the p09 park bookkeeping; p09 contributed no commits); target opus, task_class hard-reasoning. Record `dispatch/w5-p10-impl-001.json`.
- `w5-p10-impl-001` outcome: DONE, one commit `9d004921263a639888192c8ab005733fcb762903` (eight files, +701/−38; no bump — `oat-project-next` stays at p03's 1.1.1). Two Codex rounds (R1 Important: `normalizeOrdinal` used `Number.parseInt`, collapsing huge ordinals onto one phase id — a STOP invariant — fixed with string-only normalization; Medium: nothing locked exactly `lifecycle === 'complete'` — a paused-project case added; a Minor about gate logs rejected; R2 all none). Four neutralization controls each caught by exactly one test; three archived projects re-parsed read-only. Two pre-existing negatives flipped per the plan's Step 2 (flagged for the reviewer). `test:smoke` run (0).
- `w5-p10-review-001` — reviewer, target opus, eight rulings (the flipped negatives, per-mode terminal guard incl. lite, ordinal normalization edge cases, the `oat_lifecycle` row and Step 5.2 pin, the real-artifact residue, Lite routes unchanged, weaker-anywhere, the unchanged scope files). Record `dispatch/w5-p10-review-001.json`.
- `w5-p10-review-001` outcome: PASS with follow-ups, 0C/1I/1M/4m, reconnaissance attempted. Rulings: the flipped negative is correct (Step 2's body requires collapsing the dialect distinction; its Verify sentence contradicts its own body → plan correction; only ONE expectation flipped, both surviving negatives hold); the terminal guard sits before any workflow-mode branching (43-probe sweep across spec-driven/quick/import/lite × complete/pr_open × active/paused/complete, 43/43); ordinal normalization 17/17 on the reviewer's own edge cases; skill contracts sound (1.1.1, pins untouched); Lite routes byte-identical; `validate-plan.ts`/`types.ts` unchanged as the plan requires. Real-artifact check: `workflow-friction` reports 15/25, not 0 (the report's claim was false → M1 record correction). I1 (weaker-anywhere): the widening makes bullet-list/table-only revision phases visible, so a `workflow-friction`-shaped project at `lifecycle: active` now routes to implement where it previously routed to complete — the reviewer's Fix: do NOT weaken the widening; file the completion-format follow-up the plan anticipates and pin the interaction. Three of four neutralizations re-run red. Fix round `w5-p10-fix-001` (the orchestrator first mis-scoped it toward implementing phase-level completion, then corrected to the reviewer's ruling before any edit was made).
- `w5-p10-fix-001` outcome: one documentation-and-test commit `aaf4c8677ff7889c6a1e49eb95fcfeea899d56df` (three files; `router.ts` byte-identical, `tasks.ts` comment-only): the interaction pinned in `router.test.ts` with a provenance-headed snapshot of the parser's output over the `workflow-friction` archive (no archive I/O), red-then-green in both directions (simulating the follow-up landing fails exactly the new case; removing the lifecycle guard fails it plus the two terminal cases); `BL-260907-recognize-phase-level` filed and referenced; the corpus provenance comment corrected to 42/179 (floors unchanged); a note on duplicate normalized phase ids. Report correction: `subagent-implement-refactor` 9/36/0 completed, `workflow-friction` 7/25/15 completed (p05 1/2 — its table says 2/2 while the task body reads pending), `retire-archived-synced-project` 15/15; that archive has no `## Revision Phase` section — completion lives only in the Progress Overview table and review-log bullets (the plan's out-of-scope wording verbatim). STOP clause not triggered (criterion 1 is heading-dialect normalization, fully met; completion counting is separate). One Codex round (0C/0I/0M/1m fixed). Record `dispatch/w5-p10-fix-001.json`.
- `w5-p10-review-002` — disposition-verification round 2 on the original reviewer handle. Record `dispatch/w5-p10-review-002.json`.
- `w5-p10-review-002` outcome: PASS (fan-in may proceed), 0C/0I/0M/2m. `router.ts` byte-identical by blob hash; `tasks.ts` comment-only proven mechanically; the new case and both mutations re-run (1/33 and 4/40 failed, as designed); the fixture matches a fresh read-only parse field-for-field and every provenance claim verified at its cited line; STOP not triggered; weaker-anywhere unchanged (17/17 parser, 43/43 router, three archived parses byte-identical to round 1); I1 and M1 fully dispositioned; corpus measured at 179 candidates. Minors: scaffold acceptance criteria on the new backlog item (filled by the orchestrator before the fan-in); the plan's Step 2 Verify sentence (wave-close correction).
- `w5-p11-impl-001` — p11 dispatched alone at `2d39833e547db72692af50ca00c0311dd4b67492` (the tip after p10; the base carries p03's quick-start 2.3.10 and p08's complete 1.7.8, nothing from the parked p09); target opus, task_class hard-reasoning. Record `dispatch/w5-p11-impl-001.json`.
- `w5-p11-impl-001` outcome: DONE, one commit `0bd2a2815334fece741a4f8297dee3d63feb693b` (four files, +353/−0; prose only in two already-bumped skills). Two Codex rounds (R1 3I/3M: the plan's `.oat/projects/*/state.md` glob matched nothing on this scope-nested layout — fixed; a sealed resume was undetectable because `ProjectLogCheckResult` has no seal field — now reads the log at `logPath`; stale `PROJECT_PATH` after `oat project new` — rejected as pre-existing; R2 2I/3M: the glob now resolves the configured `projects.root`; terminal `oat_lifecycle: complete` projects excluded; `deferred advisory` documented). Five red proofs; a `####` subheading that re-keyed the seal line in the autonomy inventory was replaced by a bold lead-in (cause fixed, no contract remap); the sweep raises no user prompt (plan STOP). Reported: the Lite-mode recording gap.
- `w5-p11-review-001` — reviewer, target opus, nine rulings (fail-closed retirement probes, ordering vs the seal, the configured-root glob, no re-bumps, load-contract + autonomy inventory, red proofs, docs, weaker-anywhere, the rejected Codex item). Record `dispatch/w5-p11-review-001.json`.
- `w5-p11-review-001` outcome: PASS, 0C/0I/1M/3m, reconnaissance not-attempted. Strictly append-only diff settles weaker-anywhere structurally; all five red proofs re-run non-vacuous; gates forced `Cached: 0`; glob 93 matches vs 0 for the plan's literal; versions and pins untouched; docs carry `deferred advisory` and presume nothing from p09; the stale-`PROJECT_PATH` rejection confirmed pre-existing at base. Medium: a Lite consolidation escapes the sweep (ruled a plan-scope gap — the plan's Outcome is quick-start-only and fail-closed would violate its STOP; follow-up + interim docs qualifier). Minors: the completing project's own `absorbed_*` fields self-match by construction (advisory noise); the plan's `-t 'absorbed'` filter runs 2 of 3 new tests; the orchestrator's brief ruling 2 stated the sweep/seal ordering backwards (a brief defect — the implementation and the plan agree: sweep BEFORE roll-up and seal; recorded in the orchestration log). Address-now sweep `w5-p11-sweep-001`.
- `w5-p11-sweep-001` outcome (address-now sweep, no re-review): one commit `a61e42b520512fc59b437e3980d3ac442c76d8b9` (three files, +20/−5): the match sentence disambiguated to the ownership-language reading with a bare-mention clause and the self-exemption clause (the completing project's own `absorbed_*` fields are input, never a finding), three assertions added to the existing whitespace-normalized region (red proof: deleting the exemption sentence fails exactly that assertion; restored byte-exact), and `lifecycle.md` states the recording step is quick-mode only today. No bumps, no pins, `sync --scope project` no-op; changed file 67, focused 94, forced check `Cached: 0`, check:skill-bumps, lint, format, validate-skills all 0. Record `dispatch/w5-p11-sweep-001.json`.
- `w5-p12a-impl-001` / `w5-p12b-impl-001` / `w5-p12c-impl-001` — exit-gate fix lanes dispatched in parallel at `90744c43f1f6501d80fd59307740a3af826a77a2` (A: p12-t01..t03 CLI; B: p12-t05..t07 skill prose + contract tests; C: p12-t04 control-plane); target opus, task_class hard-reasoning; briefs carry the gate artifact's findings, the seam rulings, and the no-re-bump rule. Records `dispatch/w5-p12{a,b,c}-impl-001.json`.
- `w5-p12a-impl-001` outcome: DONE, three commits `4c7186666d47f0d3cb52077a571e35097a60883d`, `ab17b732260cb5cdb026efde53d2359b3678612e`, `2753eef492abe70eec0cb98d8225daf888edb364`. I1 reproduced with a deterministic interleaving probe (writer B's entry clobbered; B's commit returned `committed` with B absent from HEAD); fix = advisory lock under the OS temp root + HEAD read-back; four red-then-green controls; the overlapping-writer control caught the lane's own `/private/var` vs `/var` path defect. Codex R1/R2 (stale-takeover ownership, settle-on-unknown) accepted and fixed. M1 reproduced (`headCarriesEntry=false … reportedState=stale`); the pre-existing stale test seeded an uncommitted entry and was corrected. I3 reproduced (`Unknown config key` on set/unset/list); Windows drive-letter bypass (Codex P2) fixed; `unset` on a malformed stored value deferred (sibling parity).
- `w5-p12b-impl-001` outcome: DONE, three commits `ef0f0b72f4d259ad4bad83f0e8518fd1a9e5e64c`, `d1f7a6baf8cc7aab40e91dc10ab18a93af96dce9`, `0a6ae111801c6f3cefb5169319628bf8390f2713`. M2 reproduced against markdown-it 14.1.0 (a tab-indented closer is fence content); `indent_columns()` in both awk copies; three fixtures. M4 reproduced live (no active project → `/state.md`; stale active project → fields land in the retired scaffold); status-gated re-resolve; three real-CLI controls (Codex Important: a failed scaffold must not fall back to the stale path — fixed). M3 reproduced (both template halves deletable with 100/100 green); backlink assertions both directions + prospective rule + mutation controls; Codex R1 (first-match parsing, whole-value `none`, fence-awareness, link forms, index-exemption controls) all fixed. `codex review` returned 401 after the first task (review endpoint auth); `codex exec -s read-only` used instead. The lane pre-trusted its worktree in `~/.codex/config.toml`.
- `w5-p12c-impl-001` outcome: DONE, one commit `cd3107e3896a6299a9558352c8eb7b7986af4f43`. I2 reproduced through `oat project status` on four scratch quick projects (a/b/c → implement); new `packages/control-plane/src/state/quick-plan-readiness.ts` attached to the `plan` artifact; router gates quick `plan`-phase routes on readiness before the `oat_ready_for` branch; 26 predicate tests, 9 router controls, 3 reader controls, 5 public `status` controls; 34/34 differential parity with the skill's shell guard; 68-fixture before/after matrix with all 51 non-quick recommendations byte-identical; Codex zero findings.
- Fan-in: `wave-5/p12a` → `ddeabab1e`, `wave-5/p12b` → `bcf907526`, `wave-5/p12c` → `368d8b8d0` (`--no-ff`, rebased in that order onto the dispatch commit; patch-ids identical for all seven lane commits); lockstep retained 0.2.63; eight gates + smoke + skills + root test green on `368d8b8d0`. Root review `w5-p12-review-001` next, then exit gate attempt 2.
- `w5-p12-review-001` — root reviewer over `90744c43f..368d8b8d0` (the three merged fix lanes), target opus; eleven verification areas incl. per-finding probes against the gate reviewer's own Fix/Requirement lines and the t04↔t05 predicate composition. Record `dispatch/w5-p12-review-001.json`. Record note: the three `w5-p12{a,b,c}-impl-001` records carry the placeholder worktree `.worktrees/wave-5/p12` and `task_class: default-implementation` from the generator; the lanes actually ran in `.worktrees/wave-5/p12a`, `p12b`, `p12c` (git-proven isolation) at the hard-reasoning class stated above — the CLI refuses to revise generic record fields, so this note is the reconciliation.
- `w5-p12-review-001` outcome: PASS, 0C/0I/2M/6m. All seven attempt-1 findings resolved as the gate reviewer worded them: t01 proven with 20 iterations of two concurrent OS processes on a log carrying a synthesis section (both run IDs survive in HEAD every time; replay singular) and a `pre-commit` hook stripping the run id (`entry-missing-after-commit`, exit 1, never `committed`); every `unlinkSync` touches only the module's own advisory lock; the shipped `quick_plan_ready()` shell guard and the compiled `evaluateQuickPlanReadiness` agree on 22 edge fixtures (zero disagreements); `oat project status` on nine scratch projects routes the three not-ready quick cases to quick-start naming the unmet clause, lite/spec-driven/import unchanged; 13 sequential cache-bypassed gates green. Mediums (records): the Progress Overview omitted Phase 12 (10/11 → 17/18) and `state.md` still called the fix round in flight — **fixed** here. Minors: three factual slips in the Phase 12 Deviations line (exit code 1 not 2; three more docs pages; `workflow-gates.md` and `oat-config.test.ts` undisclosed) — **fixed**; dispatch records' placeholder worktree/task class — **reconciled** in the note above; a stale comment in `config/index.ts` — **fixed** (carried in the receive commit `d3f098549` after commitlint rejected the standalone commit's body); the plan's t04 verify command can pass vacuously against a stale control-plane `dist` — **fixed** (build prefix added to the task); `plan.md` completion checklist counts — **fixed** (12/12 phases, 18/18 tasks); `state.md` gate block `artifact` / `reviewed_head` — **fixed** (archived path; the head the artifact declares). The reviewer's own first t04 control appeared to pass against a stale `dist` — the same mechanism as the minor.
- `w5-p12d-impl-001` — lane D (the lane-B implementer handle) in `.worktrees/wave-5/p12d` at `a5aa7d2d991fcc6f13ca065912879f7f2505da90`: p12-t08 from the superseded attempt-2 launch's Medium and Minor. Record `dispatch/w5-p12d-impl-001.json`.
- `w5-p12d-impl-001` outcome: DONE, one commit `18de7b1f170f77d317bbf183f7b35df4aef76f7c` (`skills-bundled-docs-contract.test.ts`; a comment in `quick-plan-readiness.ts`). M1 reproduced (three unrelated-link declarations accepted); the rule now extracts the declared sources (backlog IDs, `#NNN` issue refs, backticked paths, prose-scope words) and requires a link whose label or destination identifies one (type-aware bounded matching; images, inline code, and HTML comments excluded; reference links resolved through fence-aware first-wins definitions with CommonMark label normalisation; non-backtracking link regex). Eleven guards each neutralised separately with its own failing control; corpus sweep byte-identical (31 pass / 13 fail, all exempt by kind or legacy mode). Codex one round (`codex exec -s read-only`; 4I/1M/2m, all accepted and fixed: prose-scope permissiveness, substring/numeric collisions, manufactured reference links, images/inline-code links, balanced parens + label normalisation, quadratic regex, the locale sentence). Residuals recorded, not changed: label-OR-destination stays per the brief (`[BL-123](https://example.com)` accepted); prose-scope matching is heuristic; balanced parentheses one level deep. Fan-in: `wave-5/p12d` → `c66a2fdc5` (lane commit re-hashed `18de7b1f1`→`dc890c0bc`, patch-id identical); eight gates + smoke + skills + root test green (CLI 6036); worktree removed.
- `w5-p12e-impl-001` — lane E (the lane-B implementer handle) in `.worktrees/wave-5/p12e` at `f5c955732c01d282e52916dce1d7a88e459ec9f5`: p12-t09 from exit gate attempt 2's two Mediums. Record `dispatch/w5-p12e-impl-001.json`.
- `w5-p12e-impl-001` outcome: DONE, one commit `3a1df2d166db5745fc203906d65c2784ced1f0ed` (`skills-bundled-docs-contract.test.ts` only). Both classes reproduced (`BL-123foo` and `BL-123_x` accepted; a commented definition resolved); one bounded grammar (`BL` + hyphen-delimited alphanumeric segments) now drives extraction and matching (exact or one further complete `-segment`); HTML comments (terminated or to EOF) stripped before definitions and declarations, exact-length code spans stripped before links/definitions. Five guards each neutralised separately with its own failing control (two of the lane's own first controls were non-discriminating and were replaced — caught by the neutralisation sweep, not the green suite); corpus sweep byte-identical (31/13). Codex one round (0C/3I/2M/1m): commented-out declarations, unterminated comments, the extractor/matcher boundary split, a false rejection the lane's own first stripper introduced, and a duplicated control — all fixed; DECLINED and filed: entity/percent-encoded neighbouring IDs and raw HTML blocks other than comments (`BL-260907-decode-entity-and-percent`). Fan-in: `wave-5/p12e` → `0811e7bb6` (`3a1df2d16`→`80b36ae05`, patch-id identical); eight gates + smoke + skills + root test green (CLI 6036); worktree removed.

#### Phase Outcomes

| Phase | Worktree                           | Implementer outcome                                                                                | Review outcome                                                                                                              | Fix rounds |
| ----- | ---------------------------------- | -------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------- | ---------- |
| p01   | `.worktrees/wave-5/p01`            | DONE_WITH_CONCERNS (`7c1988b63` + sweep `06de22c7d`; forced CLI suite 5815)                        | passed (0C/1I/1M/4m — I1/M1 plan corrections; address-now sweep)                                                            | 0          |
| p02   | `.worktrees/wave-5/p02`            | DONE (`78f1279df` + fix `f1790effd` + sweep `96a5d9480`; forced CLI suite 5848)                    | passed (round 1 0C/2I/2M/5m → round 2 0C/0I/3M/4m)                                                                          | 1          |
| p03   | `.worktrees/wave-5/p03`            | DONE (`36a56cb64` + fix `fcc6c0f26`; forced CLI suite 5808, check:skill-bumps 4)                   | passed (round 1 0C/1I/3M/4m → round 2 0C/0I/0M/1m)                                                                          | 1          |
| p04   | `.worktrees/wave-5/p04`            | DONE (`48837edf0` + sweep `09de4c92f`; forced CLI suite 5898)                                      | passed (0C/0I/1M/5m; address-now sweep)                                                                                     | 0          |
| p05   | `.worktrees/wave-5/p05`            | DONE (`3fd3aaa62` + sweep `d779ea634`; forced CLI suite, focused 202)                              | passed (0C/0I/3M/5m; address-now sweep)                                                                                     | 0          |
| p06   | `.worktrees/wave-5/p06`            | DONE (`8432f1d4d` + fix `970aedccc`; forced CLI suite 5924)                                        | passed (round 1 0C/1I/0M/2m → round 2 0C/0I/0M/2m)                                                                          | 1          |
| p07   | `.worktrees/wave-5/p07`            | DONE (`e4dfa0e27` + fix `9c2f96ca5`; forced CLI suite 6006, check:skill-bumps 1)                   | passed (round 1 0C/1I/2M/5m → round 2 0C/0I/0M/2m)                                                                          | 1          |
| p08   | `.worktrees/wave-5/p08`            | DONE (`049783897` + fix `d7f8a6ff8`; forced CLI suite 6007, test:skills 856, check:skill-bumps 10) | passed (round 1 1C/2I/1M/3m → round 2 0C/0I/0M/0m)                                                                          | 1          |
| p09   | `.worktrees/wave-5/p09`            | BLOCKED — plan STOP (seal append not idempotent; resume premise false); parked patch preserved     | not reviewed (parked)                                                                                                       | 0          |
| p10   | `.worktrees/wave-5/p10`            | DONE (`9d0049212` + pin `aaf4c8677`; forced CLI suite 6008, control-plane 102, test:smoke 0)       | passed (round 1 0C/1I/1M/4m → round 2 0C/0I/0M/2m)                                                                          | 1          |
| p11   | `.worktrees/wave-5/p11`            | DONE (`0bd2a2815` + sweep `a61e42b52`; forced CLI suite 6011, test:smoke 160)                      | passed (0C/0I/1M/3m; address-now sweep)                                                                                     | 0          |
| p12   | `.worktrees/wave-5/p12{a,b,c,d,e}` | DONE (nine fix commits; forced CLI suite 6036, control-plane 141, smoke, skills, root test)        | passed (fix-round root review 0C/0I/2M/6m); exit gate attempt 2 blocked on records + two Mediums, all fixed; gate exhausted | 0          |

#### Group 1 fan-in — p01, p02, p03 (2026-09-07)

- Merge order p01 → p02 → p03 with `git merge --no-ff` after rebasing each lane on the integration tip (each lane's worktree-init `chore: run sync` commit — the manifest restamp 0.2.61 → 0.2.62 Lite had left behind — rode along once, `d5078ee85`). Merge commits `9c932c262` (p01), `ef4fc6b69` (p02), `d77063b96` (p03). The first merge commit was rejected by commitlint for a 111-character header (the wave-3/4 message format); the fan-in scripts now use a short header with the lane title in the body. Lane commits re-hashed by the rebase (identical `git patch-id --stable` pairs; the Reviews table keeps the pre-rebase heads the reviewers examined): 06de22c7d→d862ecb47; 7c1988b63→1f6b1c9fe; 96a5d9480→3ff67384d; f1790effd→6ed220954; 78f1279df→82898f9dc; fcc6c0f26→ea25e45e7; 36a56cb64→8f4be3270.
- Repository hygiene commit `74e37e6e2`: the Lite merge had re-added three archived wave-4 backlog items under `items/` (`pjm doctor` warned); removed by literal path and the index regenerated.
- Fan-in-owned lockstep bump 0.2.62 → 0.2.63 above freshly fetched `origin/main` (`0f47bf700`), commit `fdcb6c3ed`; `public-package-versions.json` regenerated by the build; `.oat/sync/manifest.json` restamped in the same commit (`pnpm run cli -- sync --scope project` printed the wave-4 advisory: manifest produced by 0.2.62, invoked by 0.2.63; `Manifest version refreshed; no content changes required.`).
- Integration gates (group fan-in mode), exit codes captured: `pnpm check` 0, `pnpm type-check` 0, `HOME=$(mktemp -d) pnpm exec turbo run test --force` 0 (0 cached, 10 total), `pnpm build` 0, `pnpm run check:skill-bumps` 0, `pnpm release:check-versions` 0, `pnpm release:validate` 0, `pnpm build:docs` 0. Config-integrity check: all tracked `.oat/config.json` keys present. Gates run sequentially (the p02 lane showed that concurrent asset-mutating gates in one tree produce spurious failures).
- Group-2 readiness on the merged tip: p04, p05, p06 plans are READY; p04 re-anchors on p01's gate-module changes and appends to the same docs tables (merge p01 first was honoured; p04 rebases its docs hunk), p05's family-coverage test must include p02's `documentation.instructionPointerExcludes` (parsed only in `oat-config.ts`, absent from the catalog) — its plan's refresh entry covers this. Group-1 worktrees and branches removed after the merge.

#### Group 2 fan-in — p04, p05, p06 (2026-09-07)

- Merge order p04 → p05 → p06 with `git merge --no-ff` after rebasing each lane on the integration tip (no worktree-init sync commits this time; the manifest was already 0.2.63). Merge commits `af42eba0e` (p04), `4aeea4536` (p05), `6b419ef7c` (p06). Lane commits re-hashed by the rebase (identical `git patch-id --stable` pairs; the Reviews table keeps the pre-rebase heads): 09de4c92f→7792f7583; 48837edf0→c055d5acf; d779ea634→3631ba9aa; 3fd3aaa62→98fac8ccf; 970aedccc→1eaa49997; 8432f1d4d→6db97567b.
- Lockstep retained at 0.2.63 (`origin/main` still 0.2.62); integration gates (group fan-in mode, sequential), exit codes captured: `pnpm check` 0, `pnpm type-check` 0, `HOME=$(mktemp -d) pnpm exec turbo run test --force` 0 (0 cached, 10 total), `pnpm build` 0, `pnpm run check:skill-bumps` 0, `pnpm release:check-versions` 0, `pnpm release:validate` 0, `pnpm build:docs` 0. Config-integrity check: all tracked `.oat/config.json` keys present.
- Group-3 readiness on the merged tip: p07's plan is READY and its seams (`skills-bundled-docs-contract.test.ts`, `pack-manifest.ts`) carry p06's additions (`pack-manifest.ts` byte-identical to base; the contract test gained a contiguous block); p07 owns the `oat-repo-improve` bump; p08 follows with the `oat-project-complete` bump. Group-2 worktrees and branches removed after the merge.

#### p07 fan-in — group 3, first (2026-09-07)

- `wave-5/p07` rebased onto the integration tip and merged with `git merge --no-ff` as `a59e0d24f`. Lane commits re-hashed (identical `git patch-id --stable` pairs): `e4dfa0e27`→`b09dbd49c`, `9c2f96ca5`→`1f097db93`. The lane's and the orchestrator's scope notes on `BL-260906-repair-the-stray-fence-in-oat` merged into one.
- Lockstep retained at 0.2.63; integration gates (sequential), exit codes captured: `pnpm check` 0, `pnpm type-check` 0, `HOME=$(mktemp -d) pnpm exec turbo run test --force` 0 (0 cached, 10 total), `pnpm build` 0, `pnpm run check:skill-bumps` 0, `pnpm release:check-versions` 0, `pnpm release:validate` 0, `pnpm build:docs` 0. Config-integrity check: all tracked `.oat/config.json` keys present.
- p08 readiness on the merged tip: its plan is READY; the base carries p07's `oat-repo-improve` bump and no change to the five skills p08 bumps; p07's worktree and branch removed.

#### p08 fan-in — group 3, second (2026-09-07)

- `wave-5/p08` rebased onto the integration tip and merged with `git merge --no-ff` as `28d99dbaf`. Lane commits re-hashed (identical `git patch-id --stable` pairs): `049783897`→`b4c4d879b`, `d7f8a6ff8`→`6f670166a`.
- Lockstep retained at 0.2.63; integration gates (sequential), exit codes captured: `pnpm check` 0, `pnpm type-check` 0, `HOME=$(mktemp -d) pnpm exec turbo run test --force` 0 (0 cached, 10 total), `pnpm build` 0, `pnpm run check:skill-bumps` 0, `pnpm release:check-versions` 0, `pnpm release:validate` 0, `pnpm build:docs` 0. Config-integrity check: all tracked `.oat/config.json` keys present.
- p09 readiness on the merged tip: its plan is READY; the base carries p08's `oat-project-complete` bump (1.7.8, pins at `skills.test.ts` and `review-skill-contracts.test.ts`) — p09 edits that skill's prose without re-bumping; p08's worktree and branch removed.

#### p10 fan-in — group 4, second (2026-09-07)

- `wave-5/p10` rebased onto the integration tip and merged with `git merge --no-ff` as `098efc30b`. Lane commits re-hashed (identical `git patch-id --stable` pairs): `9d0049212`→`6654df618`, `aaf4c8677`→`392eb88f0`. p09 (group 4, first) is parked with no commits, so group 4's fan-in is p10 alone.
- Lockstep retained at 0.2.63; integration gates (sequential), exit codes captured: `pnpm check` 0, `pnpm type-check` 0, `HOME=$(mktemp -d) pnpm exec turbo run test --force` 0 (0 cached, 10 total), `pnpm build` 0, `pnpm run check:skill-bumps` 0, `pnpm release:check-versions` 0, `pnpm release:validate` 0, `pnpm build:docs` 0. Config-integrity check: all tracked `.oat/config.json` keys present.
- p11 readiness on the merged tip: its plan is READY; the base carries p03's `oat-project-quick-start` (2.3.10) and p08's `oat-project-complete` (1.7.8) — p11 edits both without re-bumping; none of p09's edits are present. p10's worktree and branch removed; p09's parked worktree stays until wave close.

#### p11 fan-in — group 5 (2026-09-07)

- `wave-5/p11` rebased onto the integration tip and merged with `git merge --no-ff` as `b59bbe804`. Lane commits re-hashed (identical `git patch-id --stable` pairs): `0bd2a2815`→`e73c5ee0f`, `a61e42b52`→`b90f1d8c9`.
- Lockstep retained at 0.2.63; integration gates (sequential), exit codes captured: `pnpm check` 0, `pnpm type-check` 0, `HOME=$(mktemp -d) pnpm exec turbo run test --force` 0 (0 cached, 10 total), `pnpm build` 0, `pnpm run check:skill-bumps` 0, `pnpm release:check-versions` 0, `pnpm release:validate` 0, `pnpm build:docs` 0; `pnpm test:smoke` 0 and `pnpm test:skills` 0 run separately. Config-integrity check: all tracked `.oat/config.json` keys present.
- All eleven lanes dispositioned: ten merged, p09 parked. p11's worktree and branch removed; p09's parked worktree is removed at wave close (patch preserved in the orchestrator scratchpad).

#### p12 fan-in — exit-gate fix round (2026-09-07)

- `wave-5/p12a`, `wave-5/p12b`, `wave-5/p12c` rebased onto the integration tip (the dispatch commit `de492c60c`) and merged with `git merge --no-ff` as `ddeabab1e`, `bcf907526`, `368d8b8d0`. Lane commits re-hashed (identical `git patch-id --stable` pairs): `4c7186666`→`d804cd3ff`, `ab17b7322`→`ff4cb2a06`, `2753eef49`→`e768163d5`, `ef0f0b72f`→`60a00dde3`, `d1f7a6baf`→`2bf2ae0b0`, `0a6ae1118`→`97fc307ee`, `cd3107e38`→`f205f0478`.
- Lockstep retained at 0.2.63; integration gates (sequential), exit codes captured: `pnpm check` 0, `pnpm type-check` 0, `HOME=$(mktemp -d) pnpm exec turbo run test --force` 0 (0 cached, 10 total; CLI 6036), `pnpm build` 0, `pnpm run check:skill-bumps` 0, `pnpm release:check-versions` 0, `pnpm release:validate` 0, `pnpm build:docs` 0; `pnpm test:smoke`, `pnpm test:skills`, root `pnpm test` 0. Config-integrity check: all tracked `.oat/config.json` keys present.
- Record repair in this entry: the Phase Outcomes rows for p04–p11 had been appended inside the fan-in bullet lists by the bookkeeping script instead of the table; moved into the table (content unchanged).
- Fix worktrees retained until the fix-round root review passes; then removed.

#### Parallel Groups

- group 1: p01 + p02 + p03 (merged); group 2: p04 + p05 + p06 (merged); p07 (merged); p08 (merged); p09 (PARKED); p10 (merged); p11 (merged).

#### Outstanding Items

- Closeout: archive ten backlog items, file follow-ups, Deferred Findings, Final Summary, orchestration-log synthesis, final review, exit gate, post-implement sequence, PR; p09 stays parked (`BL-260907-make-the-completion-seal`).
- closeout: backlog archive (ten items), follow-ups, Deferred Findings, Final Summary, final review, exit gate, PR.
- p11 (group 5); then closeout with p09 recorded parked.
- p10 (group 4, second; runs on the current tip because p09 parked with no commits), p11 (group 5); then closeout. p09 needs a plan refresh (`BL-260907-make-the-completion-seal`) before it can run in a later wave.
- p09 → p10 (group 4), p11 (group 5); then closeout.
- p08 (group 3, second), then p09 → p10 (group 4), p11 (group 5); then closeout.
- p07 → p08 (group 3), p09 → p10 (group 4), p11 (group 5), each alone after the previous merge; then closeout.
- Group 2 (p04 + p05 + p06) after the group-1 fan-in; then p07 → p08, p09 → p10, p11; closeout.
- Journal note: dispatch records are immutable after the first revision; terminal outcomes live in the Dispatch Notes above.

<!-- orchestration-runs-end -->

## Implementation Log

Chronological log of implementation progress (root orchestrator; lane detail lives in the dispatch transcripts and review artifacts).

### 2026-09-07

- Final review round 1 (`w5-final-review-001`, head `5aa2f5ab4`): PASS with record corrections (0C/1I/3M/3m), all applied in `9386be825`; round 2 (`w5-final-review-002`) verified the dispositions — see Review Received: final.
- Exit gate attempt 2 blocked (0C/1I/2M/1m; attempts exhausted) → p12-t09 `3a1df2d16`→`80b36ae05`, merge `0811e7bb6`; gates green; lockstep retained 0.2.63; the gate stays `blocked` pending an operator decision.
- Exit gate attempt-2 launch killed after a passing review (superseded) → p12-t08 `18de7b1f1`→`dc890c0bc`, merge `c66a2fdc5`; gates green; lockstep retained 0.2.63.
- Exit gate attempt 1 blocked (0C/3I/4M) → Phase 12: p12a `ddeabab1e`, p12b `bcf907526`, p12c `368d8b8d0` (seven fix commits, patch-ids verified); gates green on `368d8b8d0`; lockstep retained 0.2.63.
- p11-t01 `0bd2a2815`→`e73c5ee0f`, sweep `a61e42b52`→`b90f1d8c9`; merge `b59bbe804`; lockstep retained 0.2.63. All merges complete (10 of 11; p09 parked).
- p10-t01 `9d0049212`→`6654df618`, pin `aaf4c8677`→`392eb88f0`; merge `098efc30b`; lockstep retained 0.2.63.
- p08-t01 `049783897`→`b4c4d879b`, fix `d7f8a6ff8`→`6f670166a`; merge `28d99dbaf`; lockstep retained 0.2.63.
- p07-t01 `e4dfa0e27`→`b09dbd49c`, fix `9c2f96ca5`→`1f097db93`; merge `a59e0d24f`; lockstep retained 0.2.63.
- p04-t01 `48837edf0`→`c055d5acf`, sweep `09de4c92f`→`7792f7583`; p05-t01 `3fd3aaa62`→`98fac8ccf`, sweep `d779ea634`→`3631ba9aa`; p06-t01 `8432f1d4d`→`6db97567b`, fix `970aedccc`→`1eaa49997`; merges `af42eba0e`, `4aeea4536`, `6b419ef7c`; lockstep retained 0.2.63.
- p01-t01 `7c1988b63`→`1f6b1c9fe`, sweep `06de22c7d`→`d862ecb47`; p02-t01 `78f1279df`→`82898f9dc`, fix `f1790effd`→`6ed220954`, docs sweep `96a5d9480`→`3ff67384d`; p03-t01 `36a56cb64`→`8f4be3270`, fix `fcc6c0f26`→`ea25e45e7`; merges `9c932c262`, `ef4fc6b69`, `d77063b96`; hygiene `74e37e6e2`; lockstep bump `fdcb6c3ed`.
- Wrapper authored from the program's Wave 5 section and the wave-boundary drift refresh (`f4b7c0c4f`); plan gate blocked three times on the refresh-carrying mechanism (attempts 1, 3, 4; attempt 2 superseded) and passed on attempt 5 (0 findings) after the refreshes were applied to eight source plans (`576fc11d8`).

## Deviations from Plan / Design

| Task / Review | Source Artifact                  | Planned / Documented                                                         | Actual / Accepted                                                                   | Reason                                                                                   | Source of Truth                     | Follow-up                            |
| ------------- | -------------------------------- | ---------------------------------------------------------------------------- | ----------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------- | ----------------------------------- | ------------------------------------ |
| p01 review    | source plan Test plan            | `recovers from the selected snapshot` expects the original verdict           | fail-closed: replacement bytes never recover (Done criterion 6)                     | `assertArtifactContentCurrent` in `review-verdict.ts` is out of the plan's scope         | reviewer ruling, plan Done criteria | wave-close plan correction           |
| p01 review    | source plan Done criteria        | every `review_failed` envelope names `postSelection`                         | only `unexpected_post_selection_failure` envelopes do                               | `review_did_not_complete` is out of plan scope                                           | plan In-scope                       | wave-close plan correction           |
| p03 review    | source plan readiness definition | `oat_template: false`                                                        | absent-or-false                                                                     | repository convention; 12/76 live quick plans flip not-ready → ready, none the other way | `oat-project-next` convention       | wave-close plan correction           |
| p04           | source plan step 3               | retry helper inside `commitReviewGateProjectLog` AND exported for `--commit` | retry, classification, dedupe live in `project/log/append.ts`; gate wrapper is thin | literal reading creates an import cycle; DR-260718                                       | DR-260718                           | none                                 |
| p07           | source plan In-scope             | readiness rules as a shipped module                                          | local test helpers in the contract test                                             | the plan names only the test file; consumers deferred                                    | plan In-scope                       | none                                 |
| p08           | source plan seam list            | fact critic required in both modes                                           | probe requires it; `run.mjs` returns null without one                               | the plan's rule is stricter than the runtime; pinned as a judgment call                  | plan step 2                         | none                                 |
| p09           | source plan resume design        | status probe sees the seal and skips the append                              | seal append not idempotent; probe cannot see a seal                                 | reproduced on the CLI (two seals on replay)                                              | STOP condition                      | `BL-260907-make-the-completion-seal` |
| p10           | source plan Step 2 Verify        | the `:94-127` negatives still hold                                           | same-phase cross-spelling negatives flipped; cross-phase negatives survive          | Step 2's body requires collapsing heading dialects                                       | reviewer ruling                     | wave-close plan correction           |
| p11           | source plan step 3               | `.oat/projects/*/state.md` glob                                              | configured `projects.root`, scope-nested, terminal projects excluded                | literal glob matched zero files on this layout                                           | reviewer probe (93 vs 0)            | none                                 |
| p11 review    | source plan Outcome              | consolidations record `absorbed_*` (quick-start only)                        | Lite consolidations record nothing; sweep degrades to a note                        | plan scoped to quick-start; refresh did not extend it                                    | plan Outcome                        | `BL-260907-record-absorbed-projects` |

## Test Results

| Phase | Tests Run                                                    | Passed | Failed | Coverage |
| ----- | ------------------------------------------------------------ | ------ | ------ | -------- |
| p01   | 5815 (forced CLI suite) + 361 gate                           | all    | 0      | -        |
| p02   | 5848 (forced CLI suite) + 231 focused                        | all    | 0      | -        |
| p03   | 5808 (forced CLI suite) + 322 focused                        | all    | 0      | -        |
| p04   | 5898 (forced CLI suite) + 330 focused                        | all    | 0      | -        |
| p05   | forced CLI suite + 202 focused + 59 snapshots                | all    | 0      | -        |
| p06   | 5924 (forced CLI suite) + 139 focused                        | all    | 0      | -        |
| p07   | 6006 (forced CLI suite) + 286 focused                        | all    | 0      | -        |
| p08   | 6007 (forced CLI suite) + test:skills 856                    | all    | 0      | -        |
| p09   | validator suite 13/13 (uncommitted)                          | -      | -      | parked   |
| p10   | 6008 (forced CLI suite) + control-plane 102                  | all    | 0      | -        |
| p11   | 6011 (forced CLI suite) + test:smoke 160                     | all    | 0      | -        |
| p12   | 6036 (forced CLI suite) + control-plane 141 + smoke + skills | all    | 0      | -        |

## Review Received: final

**Date:** 2026-09-07
**Review artifact (round 1):** reviews/archived/final-review-2026-09-07T142545Z.md (reviewed head `5aa2f5ab4813fcf76bb877258fda9929a3a0bb7e`, invocation manual, dispatch `w5-final-review-001`, reconnaissance attempted)

**Findings (round 1):** Critical 0 · Important 1 · Medium 3 · Minor 3 — PASS with record corrections; no code defect. Verified by the reviewer: all twelve gates green with cache bypass (`Cached: 0` on forced check/type-check/test, CLI 6011; root `pnpm test`; build; check:skill-bumps 10; release:check-versions; release:validate; test:skills 857; test:smoke 160; forced build:docs); 21/21 patch-id mappings identical and 21↔21 ledger/artifact correspondence; one commit touches release files (0.2.62 → 0.2.63) and no lane commit touches a release file, `.oat/projects/`, or the external plans (`576fc11d8` touches only Revalidation sections); all eight weaker-anywhere surfaces probed, several live (a real gate under a held `.git/index.lock` returned the true disposition with an idempotent fresh-process recovery; `unset` refused all five `set` refusal classes byte-unchanged; the readiness guard returned not-ready on a fresh quick scaffold; ten script-reference shapes extracted; six forged seam probes rejected). Residual coverage recorded honestly: p01's recovery branch could not be forced live (every reachable post-selection step is defensively contained) and rests on the focused suites plus the lane review.

**Dispositions (all record corrections, `9386be825`):**

- I1 — `state.md` not advanced at the p11 fan-in (still named p11 as in flight): **fixed** — Current Phase, Progress (p11 merge, archive, follow-ups, closeout records, round-1 result), the Implementation artifact line, and Next Milestone advanced to the closeout head; `oat_blockers` and the p09 row unchanged.
- M1 — the Phase 11 Outcome and Final Summary claimed the sweep "requires each child to prove a terminal state": **fixed** — reworded to the advisory ownership-language sweep that shipped (never a hard block); the same overstatement and an inverted seal ordering in `completed.md`'s p11 entry corrected too.
- M2 — `oat_current_task_id` pointed at the completed `p11-t01`: **fixed** (`null`).
- M3 — `BL-260907-route-quick-mode-discovery` scoped to `oat-project-next` only while `oat-project-progress` carries the same stale row: **fixed** — item title, description, and criteria widened; the Deferred Findings entry names the second skill; index regenerated.
- m1 (receipt path `<project>/gate-receipts/`), m2 (group-1 refresh note qualified to p01 and p03), m3 (archival checkbox lists ten slugs with the p09 parenthetical): **fixed**.

**Verification record:** what — the record-correction commit above; how — round 2 below verified each disposition on `9386be825` and confirmed `git diff --stat 5aa2f5ab4..9386be825` touches only wrapper and backlog files; where — this section and the archived artifacts.

**Review artifact (round 2):** reviews/archived/final-review-2026-09-07T143255Z.md (reviewed head `9386be8253f7b88abc65e04106a724c14ac55a2f`, invocation manual, dispatch `w5-final-review-002`)

**Findings (round 2):** Critical 0 · Important 0 · Medium 0 · Minor 1 — PASS. All seven dispositions verified fixed at source; `git diff --stat 5aa2f5ab4..9386be825` is seven wrapper/backlog files and the product trees (`packages`, `apps`, `tools`, `.agents`, lockfile, `.gitignore`, `turbo.json`) are tree-hash identical to the head where round 1 ran the twelve gates; forced `check` (`Cached: 0`), `check:skill-bumps`, `release:check-versions`, `pjm doctor` (declared, 0 warnings), and `validate-plan` re-run green. New m1: the orchestration-log synthesis counted twelve follow-ups (nine at closeout) where git shows thirteen (two at the p09 park, one at the p10 fix round, ten at closeout) — fixed in the receive commit.

**Review row `final` → `passed`.** The configured exit gate runs next on the closeout head.

## Review Received: final (configured exit gate, attempt 1 — blocked)

**Date:** 2026-09-07
**Gate:** run `33895672-bac5-4cb4-9a9e-474e440a9bc5`, target `codex-5-6-sol-xhigh` (diversity: unknown-producer), envelope `ok`, outcome `review_completed_blocking_findings`, `receiveEligible: true`, threshold important, blocking true, attempt `w5-exit-gate-20260907T143533Z` (launched in the foreground; the harness moved it to the background after ten minutes and it completed with a receipt).
**Review artifact:** reviews/archived/final-review-2026-09-07T144442Z.md (reviewed head `c9ad23b69d13eb47da7340a6f26c48271af04a98`, invocation gate)

**Findings:** Critical 0 · Important 3 · Medium 4 · Minor 0 — blocking; auto-disposition mode (every finding converted to a fix task in Phase 12; no deferrals).

**Dispositions:**

- I1 — concurrent gate finalizations can both settle while one `runId` is absent (`append.ts` rewrites the log without coordination; a successful commit never verifies the caller's identity): **convert → `p12-t01`**.
- I2 — the control-plane recommender bypasses the quick-plan readiness predicate (`oat project status` tells a not-ready quick plan to implement): **convert → `p12-t04`** (the p03 plan's out-of-scope note said "no routing code exists" — false for `packages/control-plane`; the plan's own Outcome says the predicate is "referenced everywhere").
- I3 — `oat config unset` omits `documentation.instructionPointerExcludes` although p05's dependency row and refresh clause require covering p02's key: **convert → `p12-t03`**.
- M1 — a pending receipt is labeled stale against the working-tree log: **convert → `p12-t02`**.
- M2 — the readiness guard treats a tab-indented fence marker as a CommonMark fence: **convert → `p12-t05`**.
- M3 — the readiness contract does not backstop the plan-to-source backlink: **convert → `p12-t07`**.
- M4 — a newly scaffolded consolidation writes `absorbed_*` through the pre-creation `PROJECT_PATH` (the deferred Minor elevated): **convert → `p12-t06`**; closes `BL-260907-re-resolve-project-path-after` in this wave.
- The gate's Deferred Findings Disposition table accepts all five deferred Mediums as filed.

**Gate row `final` (attempt 1) → `fixes_added`** (gate-written row moved forward in place with the archived path); `oat_implement_exit_gate` → `blocked`, `attempts_completed: 1`, receive completed in the following state checkpoint. Attempt 2 runs after Phase 12 lands.

## Review Received: final (configured exit gate, attempt 2 launch `w5-exit-gate-20260907T163516Z` — superseded)

**Date:** 2026-09-07
**Gate:** run `c21ea64d-8f58-4673-adbc-6f1f6821fee4`, target `codex-5-6-sol-xhigh`; the reviewer completed and the gate committed its artifact (`63214a61c`, ledger row written), but the harness killed the gate process for low system memory before the receipt was written (`w5-exit-gate-20260907T163516Z.receipt.json` empty; last events `gate-liveness`). No envelope, so the launch does not count as a completed attempt (W3 precedent): row recorded `superseded`, artifact archived, and the gate re-runs for the receipt.
**Review artifact:** reviews/archived/final-review-2026-09-07T165019Z.md (reviewed head `ebf7cbf2749f4d3c08c6377211ff712b5baa25dc`, invocation gate)

**Findings (informational, from the superseded artifact):** Critical 0 · Important 0 · Medium 1 · Minor 1 — "no blocking findings remain at the gate's Important threshold"; all seven attempt-1 findings recorded implemented. M1: the backlink rule accepts any link inside a source declaration without relating it to the declared source (`BL-123 — see [unrelated](…)` accepted) — fixed before the re-run as `p12-t08`. m1: the `quick-plan-readiness.ts` comment still describes the tab divergence p12-t05 removed — fixed before the re-run as `p12-t08`.

## Review Received: final (configured exit gate, attempt 2 — blocked; attempts exhausted)

**Date:** 2026-09-07
**Gate:** run `a720129c-9808-4d43-8ae6-4b8de92e8fdb`, target `codex-5-6-sol-xhigh` (diversity: unknown-producer), envelope `ok`, outcome `review_completed_blocking_findings`, `receiveEligible: true`, threshold important, blocking true, attempt `w5-exit-gate-20260907T173426Z` (launched in the foreground; the harness moved it to the background after ten minutes and it completed with a receipt).
**Review artifact:** reviews/archived/final-review-2026-09-07T174812Z.md (reviewed head `42c799663b1ca0c2ddeed1c12c6094bd5801fb42`, invocation gate; range from the superseded launch's head `ebf7cbf27`)

**Findings:** Critical 0 · Important 1 · Medium 2 · Minor 1 — blocking; auto-disposition mode. The reviewer records the p12-t08 change as rejecting the prior shapes and both focused suites green; the block rests on one record sentence.

**Dispositions:**

- I1 — the user-facing "Behavioral changes" bullet in `## Final Summary` still promised that consolidated projects are "retired only when their children are proven terminal" while the same artifact (and the shipped `oat-project-complete`) describe an advisory ownership-language sweep — a sentence the round-1 root-review corrections missed: **fixed in this receive commit** (record only; no product change).
- M1 — the backlog matcher accepts `BL-123foo` for a declared `BL-123` (only a following digit is rejected): **convert → `p12-t09`**.
- M2 — reference definitions inside HTML comments are collected, so a commented definition manufactures a backlink: **convert → `p12-t09`**.
- m1 — stale counts (`plan.md` checklist → 20/20 with p12-t09; the Phase 12 status line's task range; the deferred-Minor ledger still listing the `PROJECT_PATH` item p12-t06 resolved): **fixed in this receive commit**.

**Operator decision (2026-09-07):** Thomas authorized one further gate attempt on the current tip ("authorize"), after the escalation below was presented with the accumulated feedback; the authorization is recorded in `state.md` (`oat_implement_exit_gate.handoff`) and the attempt runs as attempt 3 with `max_attempts` raised to 3 for this project by that decision.

**Attempt accounting (completion-and-closeout.md, Step 14):** attempt 1 blocked and was received (Phase 12); this attempt 2 blocked and is received here; `attempts_completed` → 2 = `max_attempts`, `on_failure: block` → the gate persists `blocked` and no further gate launch is made autonomously. Per the contract the completion steps do not run; the project stays `in_progress`, and the accumulated feedback is escalated to the operator with the fixes for every finding already applied (records here; code as p12-t09) so that an operator-authorized re-run has nothing outstanding.

## Review Received: final (configured exit gate, attempt 3 (operator-authorized) — passed)

**Date:** 2026-09-07
**Gate:** run `905419ec-75d0-4ea0-9881-5425c6c54e9d`, target `codex-5-6-sol-xhigh` (diversity: unknown-producer), envelope `ok`, outcome `review_completed_gate_passed`, `receiveEligible: true`, threshold important, blocking false, attempt `w5-exit-gate-20260907T213219Z` (launched in the foreground; the harness moved it to the background after ten minutes and it completed with a receipt).
**Review artifact:** reviews/archived/final-review-2026-09-07T214334Z.md (reviewed head `34e89bbc91657e7e195aa955b6e483b9dcb63fc0`, invocation gate)

**Findings:** Critical 0 · Important 0 · Medium 2 · Minor 1 — judgment-sweep mode (passing gate).

**Dispositions:**

- M1 — the backlog matcher validates only the first character of an extension segment (`BL-123` accepts `BL-123-other_more`, `BL-123-otheré`, `BL-123-other--tail`): **deferred → `BL-260907-harden-the-external-plan`**. Test-rule hardening on a contract helper; the gate passed at its threshold and a product change now would stale it; the exact mutations are recorded as the item's required controls.
- M2 — `withoutFences()` runs before HTML comments are removed in both definition and declaration extraction (a fence opener inside a comment can hide a later valid declaration): **deferred → `BL-260907-harden-the-external-plan`** (same item; same rationale).
- m1 — `BL-260907-let-oat-config-unset-remove` said the malformed-value path exits 2; `runUnset` sets exit 1: **fixed** in this receive commit (backlog description only).
- The gate's Requirements Coverage records p01–p08, p10, p11, and every p12 task implemented, p09 parked at its declared STOP, and all deferred Mediums accepted as filed.

**Post-gate CI fix (2026-09-07):** GitHub CI on PR #275 failed one test on Linux — `instructions.utils.test.ts` › `treats a case-mismatched content root as ineffective, deterministically` expected `Apps/Docsapp/docs` but got `Apps/Docsapp`: `resolveDocumentationContentRoot` probed `<root>/docs` through the real `dirExists` while the scan used the test's injected `stat`, so on a case-sensitive host the two disagreed (the test passed on macOS for the wrong reason). Fix `7aed651ce` (`fix(p02)`): the resolver accepts a `dirExists` probe and the exclusion resolver passes one built on its injected `stat`; red-then-green proven under a mocked always-false `dirExists` (the exact CI assertion reproduced, then green); eight gates + root test green on the tip. This is a product change after the gate's reviewed head, so `oat_implement_exit_gate` is marked `stale` pending an operator decision on a re-run (attempts 3/3 consumed).

**Gate row `final` (attempt 3 (operator-authorized)) → `passed`** (gate-written row moved forward in place with the archived path); `oat_implement_exit_gate` → `allowed / passed` in the following state checkpoint.

## Final HiLL approval (IMPLEMENT-16, autonomous)

- Pre-approval sequence (configured `workflow.postImplementSequence`): summary (`summary.md` with the project-log roll-up and the promoted decision `DR-260907-pre-dispatch-refreshes-live`; carried in `394159d3b` after commitlint rejected the standalone commit's body), document (`394159d3b`: PJM current-state bullet for 0.2.63 and the roadmap line), pr (PR #275 on `origin/wave-5-execution-2026-09`; artifact `pr/project-pr-2026-09-07.md`, local-only) — all complete; no post-approval steps configured; recap intent `skip` (deferred to program close per the execution program).
- Evidence: final review row `passed` (round 2 artifact `reviews/archived/final-review-2026-09-07T143255Z.md`, head `9386be825`); fix-round review `passed` (`reviews/archived/p12-review-2026-09-07T163054Z.md`, head `368d8b8d0`); configured exit gate `allowed / passed` on attempt 3 (operator-authorized; run `905419ec`, artifact `reviews/archived/final-review-2026-09-07T214334Z.md`, 0C/0I/2M/1m, Mediums deferred to `BL-260907-harden-the-external-plan`); every descendant after the gate's reviewed head `34e89bbc9` is closeout-only bookkeeping.
- Decision: `approval: approved`, `approval_source: oat-autonomous`, `status: post_approval` → no post-approval steps → `complete`. Operator authorization: 2026-09-05 ("let it rip"), covering PR creation and merge by the root orchestrator once CI, Bugbot, and the final gate are green; the exhausted gate was escalated and the operator authorized attempt 3 on 2026-09-07 ("authorize"). This approval waives nothing.
- Completion: `oat project complete-state` recorded before merge; the archive tail is `completion tail: deferred to program close`.

## Deferred Findings

### Deferred Findings (Medium)

- p02 review round 2 M2 — a wrong-TYPED `documentation.root` is silently dropped in both modes with zero warnings (pre-existing door the inert-exclusion warnings do not cover) → `BL-260907-warn-when-documentation-root`.
- p10 review round 1 I1 (converted to a pinned interaction per the reviewer's "do not weaken — file and pin" ruling) — bullet-list / table-only completion records now surface as incomplete revision phases → `BL-260907-recognize-phase-level`.
- p11 review M1 — a Lite consolidation records no `absorbed_*` fields, so the retirement sweep degrades to its recorded note (plan-scope gap; interim quick-mode-only qualifier in `lifecycle.md`) → `BL-260907-record-absorbed-projects`.
- p09 park — the completion seal append is not idempotent and `oat project log check` cannot see a seal → `BL-260907-make-the-completion-seal`; the synced deferred clear from PR #254 always fails on a numeric-fd `readFile` → `BL-260907-finalize-synced-archive-mjs`.

### Deferred Findings (Minor)

- p12-t03 Codex — `oat config unset` on a malformed stored value exits 1 (identical pre-existing behavior for `documentation.excludes`) → `BL-260907-let-oat-config-unset-remove`.
- p12-t09 Codex (declined in the wave) — entity/percent-encoded neighbouring backlog IDs and definitions inside raw HTML blocks still satisfy the backlink rule → `BL-260907-decode-entity-and-percent`.
- p06 review — `packages/cli` test files are excluded from tsc and type-aware oxlint → `BL-260907-type-check-cli-test-files`.
- p05 review — `oat config adopt` keeps an inline copy of the surface-flag block → `BL-260907-fold-oat-config-adopt-onto`.
- p03 review (deferred) — quick-mode `discovery` rows in `oat-project-next` (and the matching row in `oat-project-progress`'s routing table) still route through `oat-project-plan` (two-hop) → `BL-260907-route-quick-mode-discovery`.
- p02 review round 2 — the inert-exclusion warning's case-sensitivity hint is wrong when a symlink resolved the target elsewhere → `BL-260907-name-the-resolved-target`.
- p06 review round 2 m1 — an escaped-underscore reference yields a trailing backslash and a false positive (zero live instances) → `BL-260907-ignore-backslash-escaped`.
- p07 fix round (Codex) — `oat-wave-program` contradicts itself on the ledger's terminal vocabulary (`merged` vs `done`) → `BL-260907-settle-the-oat-wave-program`.
- p07 review round 2 m1 — the program-document date fallback fails open → `BL-260907-fail-closed-on-unparsable`.
- p11 review m3 / Codex — quick-start resolves `PROJECT_PATH` before `oat project new` and writes through the stale value (pre-existing) → filed as `BL-260907-re-resolve-project-path-after`, then elevated by exit gate attempt 1 (M4) and **fixed in this wave as p12-t06** (the item is archived at closeout).
- p11 review m2 — the plan's `-t 'absorbed'` verify filter runs two of the three new tests → wave-close plan correction.
- p11 review m3 (process) — the orchestrator's review brief stated the sweep/seal ordering backwards; the implementation and plan agree (sweep before roll-up and seal); recorded in `orchestration-log.md`, no code change.
- p07 review — the stray four-backtick fence in the repo-improve plan template is pre-existing → `BL-260906-repair-the-stray-fence-in-oat` (already open).
- p01 review — three plan-internal inconsistencies (Done checkbox scope, the snapshot bullet, the `verdict-parse` bullet) → wave-close plan corrections.

## Final Summary (for PR/docs)

**What shipped:**

- Gate resilience: a committed review artifact that survives a post-selection failure is re-validated through the normal path's own eligibility function and returned with its real disposition (no reviewer re-dispatch; replacement bytes never recover; envelopes name `postSelection.step` / `code`); gate project-log finalization retries transient index locks on git's own contention evidence, settles only on proven identity, and leaves a durable, idempotent recovery receipt (`DR-260907-gate-log-receipts-live-under`).
- Configuration: `documentation.instructionPointerExcludes` keeps instruction-sync pointer files out of docs content trees (fail-closed on malformed values; issue #238 reproduced and closed on this repository); `oat config unset <key>` with `set`-parity refusals, aggregate-key rejection, and empty-parent pruning.
- Lifecycle routing and closeout: one quick-plan readiness predicate shared by plan 1.4.10 / progress 1.4.1 / next 1.1.1 / quick-start 2.3.10, with incomplete quick projects resuming in quick-start rather than dead-ending; the recommender treats a project as terminal only when `oat_lifecycle` is complete AND no revision phase is incomplete, on a task parser that normalizes heading dialects; the autonomous recap is capability-aware and non-blocking (explainer-kit 1.0.7 seam probe; complete 1.7.8, implement 2.3.6, summary 1.5.3, autonomous 1.0.13); consolidated-project retirement is semantic (an advisory sweep of the active planning surfaces for ownership language still naming an absorbed slug or backlog ID, each hit dispositioned before the roll-up and seal; quick-start records `absorbed_*`).
- Contracts: every `.oat/scripts` reference in shipped skill Markdown is validated against pack manifests; the repo-improve plan template (2.1.3) carries the external-plan readiness contract and the contract test sweeps all 44 dated plans.

**Behavioral changes (user-facing):**

- Lockstep public packages 0.2.62 → 0.2.63; `.oat/sync/manifest.json` restamped in the same commit.
- A gate whose post-selection step throws after a committed artifact exists no longer fails as `review_failed`; an index-lock collision during log finalization no longer loses the gate's log entry; a recovery command is printed and idempotent.
- Malformed `instructionPointerExcludes` stops sync/validate with a repair message; `oat config unset` exists.
- Incomplete quick projects route to quick-start; a project with incomplete revision phases is not reported terminal; autonomous completion skips the recap (recorded) when a required seam is missing instead of failing; a consolidating project's closeout sweeps the active planning surfaces for ownership language still naming its absorbed work and dispositions each hit before the seal (advisory; never a hard block).
- Skills with dangling script references and external plans whose status contradicts their dependency table fail the contract test.

**Key files / modules:**

- `packages/cli/src/commands/gate/index.ts`, `project/log/append.ts`, `<project>/gate-receipts/` receipts — recovery and retry.
- `packages/cli/src/config/oat-config.ts`, `commands/instructions/*`, `commands/config/index.ts` — exclusions and `unset`.
- `.agents/skills/oat-project-{plan,progress,next,quick-start,complete,implement,summary,autonomous}`, `oat-explainer-kit/scripts/probe-recap-seams.mjs`, `oat-repo-improve/references/plan-template.md` — routing, recap, retirement, readiness.
- `packages/control-plane/src/state/tasks.ts`, `recommender/router.ts` — terminal status.
- `packages/cli/src/commands/init/tools/shared/skill-script-references.ts`, `skills-bundled-docs-contract.test.ts` — script-reference and readiness contracts.

**Verification performed:**

- Per lane: plan-focused suites, forced-turbo check/type-check/test (`Cached: 0`), lint, format, validate-skills, check:skill-bumps, `test:smoke` where a skill was bumped, one or two read-only Codex rounds, and a root-owned adversarial review with live CLI probes (p02, p03, p06, p07, p08, p10 with a fix round and a round-2 verification; p01, p04, p05, p11 with an address-now sweep).
- Six fan-ins with the eight-gate definition-of-done sequence and uncached test runs (6011 CLI tests at the tip); final review and the configured exit gate recorded below.

**Design deltas (if any):**

- p09 parked on its plan's STOP (false resume premise, reproduced); ten of eleven lanes merged.
- Pre-dispatch refreshes were applied to eight source plans as dated Revalidation entries after the plan gate rejected wrapper-side addenda three times.
- See the Deviations table for the per-lane deltas (retry placement, readiness helpers, critic seam, flipped negatives, configured-root glob, Lite recording gap).

## References

- Plan: `plan.md`
- Discovery: `discovery.md`
- Program: `.oat/repo/reference/external-plans/2026-08-31-execution-program.md`
