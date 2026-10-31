# Backlog & Roadmap Review

**Date:** 2026-10-31
**Baseline:** branch `chore/backlog-review-20261031` at `origin/main` `a79f1dada`
(lockstep 0.3.38)
**Scope:** All 142 active items under `.oat/repo/pjm/backlog/items/`
**Roadmap:** `.oat/repo/pjm/roadmap.md` (last edited 2026-10-24)
**Purpose:** Prioritize by value/effort, surface dependencies, and recommend an
execution sequence

> This review replaces the 2026-09-26 living review; its ratings were not
> carried forward. Per-item values, efforts, quadrants, and reality checks come
> from five independent read-only rating lanes run against the baseline above
> (machine-local inputs under `.oat/repo/analysis/backlog-review-2026-10-31/`).
> Each lane checked every item against current `main` (PRs, commits, file
> paths) before rating it. The execution companion
> [`priority-alignment.md`](./priority-alignment.md) is dated 2026-08-30 and is
> stale relative to this review; refresh it only through the collaborative
> walkthrough.

---

## 1. Executive Summary

The backlog holds **142 active items** (up from 114 on 2026-09-26), all `open`
(priority: 1 urgent, 16 high, 75 medium, 50 low). Since the last review, waves
2 to 4, `artifact-cleanup` (#365), the docs overhaul (#342), the docs front
door (#367 series), and `delivery-evidence-and-knowledge-preflight` (#390)
shipped, while 73 items were filed after 2026-09-26, most from the 2026-10-02
adopter audit, the docs consumer rollout, and artifact-cleanup follow-ups.
Quadrant distribution: **35 Quick Win**, **12 Strategic**, **65 Fill-in**,
**27 Avoid / Defer**, **3 Close (reconcile)**. Another 18 items are partially
delivered and need their text narrowed (section 6).

| Theme (lane)                                  | Count   | Quick Win | Strategic | Fill-in | Avoid / Defer | Close |
| --------------------------------------------- | ------- | --------- | --------- | ------- | ------------- | ----- |
| A — Review chain and gate integrity           | 27      | 7         | 7         | 11      | 2             | 0     |
| B — Goal and brief workflow                   | 6       | 1         | 0         | 3       | 2             | 0     |
| C — Lifecycle skills, artifacts, and routing  | 30      | 10        | 0         | 15      | 5             | 0     |
| D — Dispatch, providers, and recon            | 13      | 3         | 1         | 2       | 5             | 2     |
| E — Config and sync                           | 10      | 3         | 0         | 2       | 4             | 1     |
| F — CLI surfaces and tool packs               | 17      | 3         | 0         | 10      | 4             | 0     |
| G — Validation, contract tests, and CI        | 14      | 3         | 0         | 11      | 0             | 0     |
| H — Docs app and Explainer Kit                | 8       | 2         | 0         | 4       | 2             | 0     |
| I — Docs consumer rollout                     | 4       | 0         | 3         | 1       | 0             | 0     |
| J — PJM and backlog tooling                   | 3       | 1         | 0         | 2       | 0             | 0     |
| K — Product and policy decisions (human-only) | 10      | 2         | 1         | 4       | 3             | 0     |
| **Total**                                     | **142** | **35**    | **12**    | **65**  | **27**        | **3** |

**Key observations by lane:**

- **A — Review chain and gate integrity** is still the largest strategic block.
  Its identity layer (`BL-260820-emit-source-qualified`, then
  `BL-260820-bind-each-gate-review`) now rates as two Medium-effort quick wins
  that unblock the no-re-review and closeout-freshness work. ReviewPlan PR
  [#190](https://github.com/voxmedia/open-agent-toolkit/pull/190) has been open
  since August.
- **B — Goal and brief workflow** is six small follow-ups on the
  `oat-project-goal`, `oat-project-pr-progress`, and promote surfaces that can
  ship as one polish PR.
- **C — Lifecycle skills, artifacts, and routing** carries the most quick wins
  (10). Several are adopter-facing guardrails: the explicit plan approval, the
  default-branch drift warning, and the knowledge index becoming optional. They
  collide on `oat-project-implement`, `oat-project-quick-start`, and
  `oat-project-plan`, so sequence them rather than run them in parallel.
- **D — Dispatch, providers, and recon:** two items are already done. The
  dispatch broker lost its premise when phase-direct implementers became
  standard. Dispatch launch hardening (#265, #266) is the one high-value
  project here.
- **E — Config and sync** has two trust defects that every team hits: stale
  provider views after an agent rename break `oat sync`, and sync overwrites
  user Codex values. Both are bounded quick wins.
- **F — CLI surfaces and tool packs** is mostly fill-in. The exception is
  `BL-261002-honor-the-requested-scope`, an adoption-contract defect.
- **G — Validation, contract tests, and CI** is cheap hardening. Seven
  contract-test fixes can ship as one lane.
- **H and I — Docs:** the consumer rollout (lane I) is the newest strategic
  block. Its generator and check fixes contain separable quick wins
  (`oat docs generate-index --check`, the analyze next-step message).
- **J — PJM and backlog tooling:** remote planning caps
  (`BL-261002-enforce-remote-planning`) are an assurance gap the docs already
  promise.
- **K — Product and policy decisions** has ten human-only calls. Four of them
  (the `BL-261002-decide-*` family) can be settled in one operator session.

**Top-line recommendations:**

1. **Reconcile before planning.** Close the three completed items, narrow the
   18 partial items, and rewrite the roadmap's Now and Next sections, which
   still name 11 archived items (section 6). This is a bookkeeping pass of
   under a day, and every later wave depends on it.
2. **Run a correctness wave of disjoint quick wins** (Wave 1): stale provider
   views, the Codex config overwrite, requested-scope installs, misleading init
   and status messages, the hardcoded `--base main`, and the evidence-run
   `HOME` cleanup.
3. **Start `review-gate-integrity` as a spec-driven project** whose first
   milestone is the receipt-identity layer
   (`BL-260820-emit-source-qualified`, `BL-260820-bind-each-gate-review`,
   `BL-260927-mark-gate-findings-as-new-or`), with the no-re-review safety net
   (`BL-260711-skip-re-review-for-bookkeeping`) as its second milestone.

---

## 2. Item Catalog

### Rating Key

| Rating     | Value                                                                          | Effort                                           |
| ---------- | ------------------------------------------------------------------------------ | ------------------------------------------------ |
| **High**   | Unblocks other items, daily workflow impact, or product milestone prerequisite | > 3 days, high complexity, or touches many files |
| **Medium** | Improves quality/consistency but not blocking                                  | 1-3 days, moderate complexity                    |
| **Low**    | Nice-to-have or future-facing                                                  | < 1 day, straightforward, isolated change        |

### Priority Quadrants

```text
                     High Value
                        |
         STRATEGIC      |      QUICK WIN
        (plan carefully)|    (do first)
                        |
  High Effort ----------+---------- Low Effort
                        |
         AVOID /        |      FILL-IN
         DEFER          |    (slot into gaps)
                        |
                     Low Value
```

**Close (reconcile)** marks an item whose lane found it complete, superseded,
or duplicated on current `main`. Within each lane table, items are sorted by
quadrant, then ID. "Depends on" lists hard dependencies (marked) and soft
dependencies; "Reality check" records the lane's evidence against `main`.

### Rating consistency note

Five lanes rated disjoint, alphabetically split item sets with one shared
rubric. Lanes differed slightly in calibration: lanes 3 and 4 rated more
Medium-effort, adopter-facing fixes as Quick Wins, while lane 2 rated
evaluation-shaped items as Avoid / Defer. Section 5's waves were assembled
across lanes, so treat a single quadrant label as a prior, not a verdict.

### Lane A — Review chain and gate integrity (27 items)

| Item                                                                                                                                          | Pri    | Value  | Effort | Quadrant      | Rationale                                                                                                                                                                                                                                           | Depends on                                                                                                                                                          | Blocks                                                                | Reality check                                                                                                                                                                                                                                                                                                                    |
| --------------------------------------------------------------------------------------------------------------------------------------------- | ------ | ------ | ------ | ------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **BL-260711-add-activity-aware-gate** — Add activity-aware gate timeouts                                                                      | high   | High   | Medium | Quick Win     | Lost reviews on long-but-healthy gates are a recurring reliability cost, and the enabling liveness and recovery layers already exist, but the idle-kill slice first needs Codex transcript activity attributed to the gate child.                   | BL-260729-implement-reviewplan-first; BL-260820-emit-source-qualified                                                                                               | -                                                                     | partial: gate-execution-hardening (CLI 0.1.72) shipped hard budgets, liveness evidence, correlated recovery; #351 shipped the 30-minute artifact-gate default; idle-kill, early template write and idle/cap outcomes still absent (`packages/cli/src/commands/gate/activity-probes.ts:169` still labels Codex `ambient-runtime`) |
| **BL-260820-bind-each-gate-review** — Bind each gate review disposition to its exact received ledger event                                    | high   | High   | Medium | Quick Win     | Stale received events and duplicate review rows block closeout and misroute work in real runs, and the fix is a focused identity-binding plus template change with clear fixtures.                                                                  | BL-260927-derive-current-lifecycle-state; BL-260820-emit-source-qualified                                                                                           | BL-260711-skip-re-review-for-bookkeeping                              | open (`.oat/templates/plan.md:171-177` still has no `plan` placeholder row; receive does not consume an exact event identity)                                                                                                                                                                                                    |
| **BL-260820-emit-source-qualified** — Emit source-qualified provenance envelopes for review and gate receipts                                 | high   | High   | Medium | Quick Win     | A shared versioned envelope is the identity layer that exact-event binding and closeout freshness both need, and dispatch records already provide a pattern to reuse.                                                                               | BL-260711-add-root-owned-dispatch-broker                                                                                                                            | BL-260820-track-pr-closeout-evidence; BL-260820-bind-each-gate-review | open (source-qualified observations exist only for dispatch, `packages/cli/src/providers/identity/oat-dispatch-record.ts:391`; review and gate receipts have no shared envelope)                                                                                                                                                 |
| **BL-260927-mark-gate-findings-as-new-or** — Mark gate findings as new or carried over between attempts                                       | medium | High   | Medium | Quick Win     | It lets operators tell a converging gate from a stuck one, it unblocks the cap-decision umbrella item, and it needs a documented finding key plus envelope changes.                                                                                 | -                                                                                                                                                                   | BL-260818-distinguish-operator-directed                               | open: no `carried-over` marking exists in `packages/cli/src/commands/gate` or in `oat-project-review-provide/SKILL.md`                                                                                                                                                                                                           |
| **BL-261002-list-pending-required-reviews** — List pending required reviews when a project reaches a pull request                             | medium | Medium | Low    | Quick Win     | A pre-PR check of `pending` rows in the Reviews table closes an observed gap (a project reached pr_open with five reviews pending) with an S-sized change to the PR skills.                                                                         | BL-261003-persist-separate-review; BL-260820-bind-each-gate-review                                                                                                  | -                                                                     | open: `oat-project-pr-final/SKILL.md` handles `pending` only for archive eligibility (`:138`) and validates artifact paths (PRFINAL-05, `:485`); no step lists or waives pending required rows.                                                                                                                                  |
| **BL-261002-offer-a-strict-gate-reviewer** — Offer a strict gate-reviewer independence mode and align gate skill wording and decision records | medium | High   | Medium | Quick Win     | The planning skills let a gate that never produced a review pass under `onFailure: warn`, and independence fallback is invisible in JSON runs; the strict mode, skill alignment and DR supersession are bounded.                                    | BL-260830-re-evaluate-same-target-gate                                                                                                                              | -                                                                     | open: no `strict` `--avoid` value in `packages/cli/src/commands/gate/index.ts`; `oat-project-plan/SKILL.md:689` still says "avoid the same runtime"; DR-260621 and DR-260706-phase-review-gate-is-non are still `status: accepted`.                                                                                              |
| **BL-261013-classify-review-findings** — Classify review findings against the contract at every receive                                       | medium | High   | Medium | Quick Win     | It would have prevented the roughly 570-line rework in artifact-cleanup, so value is high; adding the classification to the receive skills and the gate receive, plus a fixture, is a bounded change.                                               | BL-260818-distinguish-operator-directed                                                                                                                             | BL-260818-distinguish-operator-directed                               | partial: the AGENTS.md "Before turning a review or gate finding into a fix task" rule landed in 13a851b73; the receive skills record no `accepted-requirement`/`regression`/`new-hardening` class (no matches under `.agents/skills`)                                                                                            |
| **BL-260706-front-load-recurring-gate** — Front-load recurring gate-finding classes into implementer briefs                                   | medium | High   | High   | Strategic     | Field evidence shows a recurring Critical class cost a fix-and-regate cycle every phase, but the ledger spans receive, implement, complete and final review plus the #354 within-loop repair-brief variant and fixtures.                            | BL-260818-distinguish-operator-directed; BL-260927-mark-gate-findings-as-new-or; BL-261002-wire-the-complexity-review                                               | -                                                                     | open (no recurring-invariant ledger or failure-family block in `.agents/skills` or `packages/`)                                                                                                                                                                                                                                  |
| **BL-260711-skip-re-review-for-bookkeeping** — Skip re-review for bookkeeping-only review findings                                            | urgent | High   | High   | Strategic     | Bookkeeping-only re-reviews burn reviewer tokens and cycle caps on every project, but the fix needs a content-aware classifier, gate-path disposition, a second invalid-artifact recovery slice, and contract updates across five lifecycle skills. | BL-260820-bind-each-gate-review; BL-260818-distinguish-operator-directed; BL-261002-re-review-a-phase-only-after                                                    | BL-260820-track-pr-closeout-evidence                                  | open (precursor BL-260829-order-phase-bookkeeping-before shipped in wave 2; `bookkeeping-only` classification is still path-only and reporting-only in `packages/cli/src/review-remote/narrowing.ts`)                                                                                                                            |
| **BL-260729-implement-reviewplan-first** — Implement ReviewPlan-first reviewer workflow                                                       | high   | High   | High   | Strategic     | Broad-review intake and timeout failures are a major cost and reliability driver, and the redesign touches reviewer agent, review-provide, gates, delegation and artifact transactionality.                                                         | BL-260711-add-activity-aware-gate; BL-260711-skip-re-review-for-bookkeeping; BL-260719-add-pinned-recon-agents                                                      | -                                                                     | open (no `ReviewPlan` in `.agents/skills` or `packages/`; prerequisites #185 and #186 shipped)                                                                                                                                                                                                                                   |
| **BL-260818-distinguish-operator-directed** — Design the budget-exhausted decision point for reviews and gates review-cycle cap               | medium | High   | High   | Strategic     | It absorbs three issue streams (#200, #207, #327) into one exhaustion contract with a shared authorization record across every review and gate path, which is project-sized.                                                                        | BL-260927-mark-gate-findings-as-new-or (hard); BL-261002-port-the-complexity-review; BL-261002-wire-the-complexity-review; BL-260711-skip-re-review-for-bookkeeping | BL-260706-front-load-recurring-gate                                   | partial: complexity review and `simplify` disposition at exhaustion shipped in #351 (BL-261001-run-a-complexity-review-when archived); prerequisite BL-260927-persist-quick-start-prompt archived; authorization record and extra-cycles/override/corrective dispositions open                                                   |
| **BL-260820-track-pr-closeout-evidence** — Track PR-closeout evidence freshness against the current head                                      | high   | High   | High   | Strategic     | Completing on stale evidence is a real assurance gap, but extending head-bound freshness to every closeout receipt and resume path is broad.                                                                                                        | BL-260820-emit-source-qualified; BL-260711-skip-re-review-for-bookkeeping; BL-260719-evaluate-broader-final-gate                                                    | -                                                                     | partial: exit-gate freshness via effective-delta fingerprints shipped in #164 (`.agents/skills/oat-project-implement/references/completion-and-closeout.md:505-548`); other closeout receipts not head-bound                                                                                                                     |
| **BL-260927-derive-current-lifecycle-state** — Derive current lifecycle state from one authority for review, phase, and publication status    | medium | High   | High   | Strategic     | Duplicated status is the root cause of repeated stale-status review cycles (#305, #310), and replacing it with a single transition authority is cross-cutting across skills and the CLI.                                                            | BL-260820-bind-each-gate-review; BL-260711-skip-re-review-for-bookkeeping; BL-260820-track-pr-closeout-evidence                                                     | BL-260927-detect-unfilled-placeholders                                | partial: artifact-cleanup (#365, DR-261012-journal-slots-and-state-owned) made `state.md` own gate transitions and added `oat project journal check`; there is no single authority or transition helper for review, phase, and publication status, and summary staleness is not tracked                                          |
| **BL-261002-gitignore-project-review** — Gitignore project review artifacts instead of committing them                                        | high   | High   | High   | Strategic     | Every OAT PR carries review-file churn, but the fix changes staging in four lifecycle skills, `oat init` defaults, the PRFINAL-05 ledger guard's local-only rule, synced/cloud handoffs, and adds a migration path.                                 | BL-261003-persist-separate-review; BL-261002-verify-local-scope-lifecycle                                                                                           | -                                                                     | open: only archived reviews are ignored (`packages/cli/src/commands/init/index.ts:622-623`, `init/tools/index.ts:1324,1467`, repo `.gitignore:85`); `oat-project-pr-final/SKILL.md:485` still assumes only `reviews/archived/` is gitignored.                                                                                    |
| **BL-260719-evaluate-broader-final-gate** — Evaluate broader final-gate freshness policy after narrow optimization                            | low    | Low    | Low    | Fill-in       | The precondition has been met for three months, so a short evaluation can record a proceed/defer/close decision without new code.                                                                                                                   | BL-260820-track-pr-closeout-evidence                                                                                                                                | -                                                                     | open (precondition met: narrow merge-only optimization shipped in #164, BL-260719-avoid-final-gate-reruns archived 2026-07-19)                                                                                                                                                                                                   |
| **BL-260830-wire-provide-remote-skills** — Wire provide-remote skills to the review-remote helper CLI                                         | medium | Medium | Medium | Fill-in       | It removes the bash/jq-versus-TypeScript drift risk in remote review; the helpers already exist and are tested, so the work is a public CLI wrapper, integration tests, and a skill rewrite.                                                        | -                                                                                                                                                                   | -                                                                     | open: `oat-review-provide-remote/SKILL.md:135,228` still mirror `packages/cli/src/review-remote/*.ts` in shell and say "bl-a7cd tracks wiring"; `commands/review/` has no remote command                                                                                                                                         |
| **BL-260902-file-deferred-repository** — File deferred repository follow-ups from a passing receive                                           | medium | Medium | Medium | Fill-in       | Without this, deferred non-blocking findings from a passing gate drop out of repository tracking; adding a disposition with idempotent filing, ledger rows, and structured output takes a few days.                                                 | BL-260902-append-only-lifecycle-history                                                                                                                             | -                                                                     | open: `oat-project-review-receive/SKILL.md:716,859` only records deferrals in `implementation.md` `## Deferred Findings`; no backlog or issue filing                                                                                                                                                                             |
| **BL-260927-give-gate-receipts-portable** — Give gate receipts portable ownership, path-neutral identities, and a shipped ignore rule         | medium | Medium | Medium | Fill-in       | Downstream repos can commit machine-local absolute paths, but a warning already exists, and a full ownership and fresh-clone reconcile model is one to three days.                                                                                  | BL-260820-emit-source-qualified                                                                                                                                     | BL-261002-decide-how-teams-enforce                                    | partial: #275 (cc91a2d21) warns when a receipt is not ignored (`commands/gate/index.ts:582-604`); `init/gitignore.ts` ships no gate-receipts entry, and `worktreeRoot` is still absolute (`gate/index.ts:3433`)                                                                                                                  |
| **BL-261002-re-review-a-phase-only-after** — Re-review a phase only after Critical or High findings                                           | medium | Medium | Medium | Fill-in       | Skipping re-review after Medium/Low-only rounds saves a dispatch, fix and gate per round, but it relaxes a review-integrity rule and needs a recorded policy plus skill and ledger changes.                                                         | BL-260711-skip-re-review-for-bookkeeping; BL-261013-classify-review-findings                                                                                        | -                                                                     | open: `oat-project-review-receive/SKILL.md:300,659-660` still require a passing re-review after any fixes (`fixes_completed` until re-review passes).                                                                                                                                                                            |
| **BL-261003-diagnose-review-finding** — Diagnose review finding overcounts and revalidate format-only repairs without relaunch                | medium | Medium | Medium | Fill-in       | Overcounted column-zero bullets can flip a nonblocking verdict, but same-run revalidation must preserve provenance and needs negative controls; the parser diagnosis can ship first.                                                                | BL-260711-skip-re-review-for-bookkeeping; BL-261013-classify-review-findings                                                                                        | -                                                                     | open: no commits to `packages/cli/src/commands/gate/review-verdict.ts` since 2026-10-03; gate recovery still reruns rather than revalidating a post-exit rewrite (`gate/index.ts:4200,4855-4860`).                                                                                                                               |
| **BL-261003-enforce-reconnaissance** — Enforce reconnaissance evidence and reconcile original-run review receipts                             | medium | Medium | Medium | Fill-in       | The review-provide recon contract is unenforced (a fake runtime is receive-eligible with no signal), and closing it is assurance-bearing gate validation that must compose with the provenance work.                                                | BL-260820-emit-source-qualified; BL-260927-give-gate-receipts-portable                                                                                              | -                                                                     | open: no reconnaissance signal in gate result or validation under `packages/cli/src/commands/gate/` (no `recon` match outside "reconcile").                                                                                                                                                                                      |
| **BL-261003-persist-separate-review** — Persist separate review artifacts and validate plain-file ledger references                           | medium | Medium | Medium | Fill-in       | Planning reviews returned in memory leave no durable artifact and anchor references fail PRFINAL-05, and aligning writers, templates and guard is moderate cross-skill work.                                                                        | BL-261002-gitignore-project-review; BL-260820-bind-each-gate-review                                                                                                 | BL-261002-list-pending-required-reviews                               | open: `oat-project-pr-final/SKILL.md:485` still requires every Artifact cell to resolve to a regular file, so `implementation.md#plan-review` still stops at PRFINAL-05.                                                                                                                                                         |
| **BL-261005-distinguish-stored-receipt** — Distinguish stored receipt branch return from rewritten history                                    | medium | Low    | Medium | Fill-in       | It improves diagnostics on a rare recovery path that already fails closed, but it needs real branch-return and rewrite controls.                                                                                                                    | BL-260927-give-gate-receipts-portable                                                                                                                               | -                                                                     | open: no diagnostic distinguishing branch return from rewritten ancestry found under `packages/cli/src` (only the generic "not an ancestor" reason in `project/delivery/evidence.ts:170`).                                                                                                                                       |
| **BL-261013-documentation-sync-after** — Documentation sync after closeout silently stales the exit gate                                      | low    | Low    | Medium | Fill-in       | The stale-gate drift is rare and an operator waiver already exists; reporting it needs closeout-check freshness logic plus skill prose and a fixture.                                                                                               | BL-260820-track-pr-closeout-evidence; BL-260903-project-document-should-prompt                                                                                      | -                                                                     | open: no gate-covers-HEAD check in `packages/cli/src/commands/project/closeout-check/` or the oat-project-document skill                                                                                                                                                                                                         |
| **BL-261030-report-gate-project-log** — Report gate project-log finalization in the terminal JSON envelope                                    | medium | Medium | Medium | Fill-in       | JSON-only callers cannot see whether bookkeeping finished, but the fix first requires amending a decision record, then buffering the envelope and adding held-lock fixtures.                                                                        | DR-260907-gate-log-receipts-live-under amendment (hard); BL-260927-give-gate-receipts-portable                                                                      | -                                                                     | open: the envelope is still flushed before finalization, per the decision record it must amend (`packages/cli/src/commands/gate/index.ts`)                                                                                                                                                                                       |
| **BL-260830-re-evaluate-same-target-gate** — Re-evaluate same-target gate execution                                                           | medium | Low    | Medium | Avoid / Defer | V2 speculation against an accepted deferral (DR-260621-ship-workflow-gates-at-runtime defers same-target dispatch); the provenance documentation alone is non-trivial, and the likely outcome is closing it as unnecessary complexity.              | -                                                                                                                                                                   | -                                                                     | open: DR-260621-ship-workflow-gates-at-runtime still records same-target dispatch as deferred                                                                                                                                                                                                                                    |
| **BL-261005-resolve-deferred-wave-5** — Resolve deferred Wave 5 maintenance edge cases                                                        | low    | Low    | High   | Avoid / Defer | A grab-bag of seven independent edge cases (ACMR policy, >1 MiB references, URI fragments, permalink policy, MERGE_BASE_SHA lifetime) with no observed failures, each needing its own contract and controls, so it costs a lot for little.          | BL-261012-commit-paths-should-accept                                                                                                                                | -                                                                     | open: knowledge commit snippet still uses `$MERGE_BASE_SHA` without recomputing it in its own shell (`.agents/skills/oat-repo-knowledge-index/SKILL.md:795`)                                                                                                                                                                     |

### Lane B — Goal and brief workflow (6 items)

| Item                                                                                                                        | Pri    | Value  | Effort | Quadrant      | Rationale                                                                                                                                                                                           | Depends on                            | Blocks | Reality check                                                                                                                                                                 |
| --------------------------------------------------------------------------------------------------------------------------- | ------ | ------ | ------ | ------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------- | ------ | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **BL-261011-re-project-oat-pr-status-from** — Re-project oat_pr_status from goal delivery observations at terminal closeout | low    | Medium | Low    | Quick Win     | Without it, oat-project-complete takes the open-PR branch for the wrong reason and Step 11.5 tries to edit a merged PR; the fix is one projection step in goal Step 9 or in complete's goal branch. | -                                     | -      | open: oat-project-goal Step 9 item 2 only runs `delivery refresh`; the PR fields are projected only at Step 7 (`SKILL.md:626`) and at pr-progress registration                |
| **BL-261011-guard-goal-brief-amendments** — Guard goal brief amendments against an open delivery head branch                | medium | Medium | Medium | Fill-in       | A probe confirmed the stale-review hazard, but the only exposure is a prose rule in oat-project-goal Step 8; a push-time refusal plus a test needs a design choice between three options.           | BL-261011-persist-pre-registration    | -      | open: guard is still prose only (`.agents/skills/oat-project-goal/SKILL.md` Step 8); no amendment check under `packages/cli/src`                                              |
| **BL-261011-persist-pre-registration** — Persist pre-registration review staleness for goal milestones                      | low    | Low    | Low    | Fill-in       | It costs one extra routing hop with no wrong outcome, and the fix is a persisted marker plus a router test.                                                                                         | BL-261011-guard-goal-brief-amendments | -      | open: #390 (6b17fd21f) edited pr-progress Step 5.5 for stack registration but added no staleness marker                                                                       |
| **BL-261011-route-a-standalone-out** — Route a standalone Out of Scope brief section into discovery on promotion            | low    | Low    | Low    | Fill-in       | A one-predicate change in brief promotion plus a pinned test; the text is already kept in brief-archive.md, so the value is small.                                                                  | -                                     | -      | open: `packages/cli/src/commands/project/promote/promote.ts:1198-1201` matches only `t.startsWith('constraints')`, so a standalone `## Out of Scope` is not rendered          |
| **BL-261003-reassess-lite-execution-scope** — Reassess Lite execution scope and preserve completed work on promotion        | medium | Medium | High   | Avoid / Defer | Mid-run promotion helps Lite runs that outgrow one sitting, but proving conservation of task identities, reviews and gates under autonomy authority is a large contract.                            | -                                     | -      | open: no execution estimate or reassessment in `oat-project-lite/SKILL.md` or `.oat/templates/plan-lite.md:21`; #264 delivered only planning-time promotion.                  |
| **BL-261011-automate-goal-phase-extraction** — Automate goal phase extraction into a child project                          | low    | Low    | Medium | Avoid / Defer | DR-261011-goal-milestone-extraction-is deliberately made extraction a manual amendment, and nothing shows the manual path is used often enough to justify a scaffold-and-backlink command.          | BL-261011-guard-goal-brief-amendments | -      | open: no extraction command; the `**Extracted to:**` marker appears only in `.agents/skills/oat-project-brief/references/brief-contract.md` and the delivery/closeout readers |

### Lane C — Lifecycle skills, artifacts, and routing (30 items)

| Item                                                                                                                                      | Pri    | Value  | Effort | Quadrant      | Rationale                                                                                                                                                                                                                                     | Depends on                                                                      | Blocks                             | Reality check                                                                                                                                                                                                                                                                                                                                                             |
| ----------------------------------------------------------------------------------------------------------------------------------------- | ------ | ------ | ------ | ------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------- | ---------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **BL-260830-make-documentation-aware** — Make the knowledge index optional by default for discovery and planning                          | medium | High   | Medium | Quick Win     | The operator reframed it today: it removes a blocking prerequisite from every planning entry point and resolves the docs-free repository case in #205, through bounded prose and config changes in several skills plus one config key.        | BL-260830-wire-bounded-durable-reference; BL-260830-integrate-recon-with-oat    | -                                  | open: `oat-project-discover/SKILL.md:21,134` still say "Block and require" the knowledge index; #390 (6b17fd21f) only added a mapper-dispatch preflight; reframed in #392 (a79f1dada)                                                                                                                                                                                     |
| **BL-260903-project-document-should-prompt** — project-document should prompt a re-run when review fixes change a shipped contract        | low    | Medium | Low    | Quick Win     | Stale documented contracts have already misled callers (the `record-schema.md` case), and a timestamp-versus-commit re-run prompt is a small prose change; the acceptance criteria are still `{Outcome}` placeholders and need writing first. | -                                                                               | -                                  | open: `oat-project-document/SKILL.md` sets `oat_docs_updated` but has no re-run recommendation keyed to later review-fix commits or Deviations entries                                                                                                                                                                                                                    |
| **BL-260907-recognize-phase-level** — Recognize phase-level completion records so bullet-list revision phases do not read as incomplete   | medium | Medium | Low    | Quick Win     | Archives in this shape currently misroute to implement instead of complete; the fix is a template contract line, a parser change, a provenance fixture, and a deliberate flip of one router test.                                             | BL-261012-convert-legacy-journals                                               | -                                  | open: `control-plane/src/state/tasks.ts:23-24` and `journal-records.ts:30` recognize only heading-based records; `.oat/templates/implementation.md` states no phase-level completion contract                                                                                                                                                                             |
| **BL-260927-detect-unfilled-placeholders** — Detect unfilled placeholders and frontmatter-body drift at PR-final and completion           | medium | Medium | Low    | Quick Win     | Most of the check exists, so wiring it into pr-final and extending it to the `state.md` body is small and keeps stale prose out of PR bodies.                                                                                                 | BL-260927-derive-current-lifecycle-state                                        | -                                  | partial: #365 journal check refuses template placeholder residue (`journal-check/rules.ts:1087`, 687d63b53) and `state-status-disagrees` (`:208`) at completion (`oat-project-complete/SKILL.md:611`); `oat-project-pr-final` does not run it                                                                                                                             |
| **BL-261002-add-an-explicit-plan-approval** — Add an explicit plan-approval step to quick and spec-driven projects                        | high   | High   | Medium | Quick Win     | Adopters expect to approve a plan before code is written, and an accidental re-run starts implementation today; it is a cross-surface workflow change, but the checkpoint mechanism already exists.                                           | BL-260904-make-quick-the-default-oat                                            | -                                  | open: spec-driven still scaffolds `['discovery', 'design']` and quick scaffolds `[]` (`packages/cli/src/commands/project/new/scaffold.ts:174`, `:194`), and quick-start has no plan-approval step                                                                                                                                                                         |
| **BL-261002-align-implement-complete** — Align implement, complete, and pr-final skill contracts with their actual behavior               | medium | Medium | Low    | Quick Win     | The hardcoded `--base main` produces wrong-base PRs for non-main repos, and all three fixes are small prose or command edits.                                                                                                                 | -                                                                               | -                                  | open: `oat-project-implement/SKILL.md:5` still advertises `--retry-limit`; `oat-project-complete/SKILL.md:1634` runs `gh pr create --base main`; `oat-project-pr-final/SKILL.md:93` still says "it will ask for"                                                                                                                                                          |
| **BL-261002-verify-local-scope-lifecycle** — Verify local-scope lifecycle commits and empty HiLL phase defaults                           | medium | Medium | Low    | Quick Win     | A cheap scratch-repo verification settles two suspected defects that could break the documented local scope or pause every phase.                                                                                                             | -                                                                               | BL-261002-gitignore-project-review | open: unverified; E16 text drift: `.oat/templates/plan.md:8` now documents `oat_plan_hill_phases: [] # empty = every phase`, so the check is whether that matches the documented default, while `plan-brief.md:8` says `[] = none`.                                                                                                                                       |
| **BL-261002-warn-when-the-default-branch** — Warn when the default branch has changed planned paths since the branch base                 | high   | High   | Medium | Quick Win     | A fetch and merge-base path check at plan approval and phase dispatch would have prevented about 2.5 hours of discarded work, and it is a bounded skill and helper change with two fixtures.                                                  | -                                                                               | -                                  | open: no `merge-base` check in `oat-project-quick-start`, `oat-project-plan` or `oat-project-implement`; root `AGENTS.md` carries the repo-local manual rule only, which is not shipped to users.                                                                                                                                                                         |
| **BL-261003-reconcile-oat-tracking-commit** — Reconcile OAT tracking commit cadence with resumable phase/group batching                   | medium | High   | Medium | Quick Win     | Every implement run reads two contradictory MUSTs about bookkeeping cadence, and settling on phase/group batching with flush points and resume reconciliation is bounded to the implement skill family.                                       | BL-261002-let-plans-declare-an-evidence                                         | -                                  | open: `oat-project-implement/SKILL.md:107` still mandates a tracking commit after every code commit and forbids batching, while `references/phase-execution.md:886-910` batches at phase/group boundaries.                                                                                                                                                                |
| **BL-261012-oat-wave-execute-writes-into** — oat-wave-execute writes into the roll-up-owned Workflow Observations section                 | medium | Medium | Low    | Quick Win     | The wave's synthesis is silently lost at the next roll-up; the fix is a skill and template wording change with a version bump and a roll-up demonstration.                                                                                    | -                                                                               | -                                  | open: `.agents/skills/oat-wave-execute/SKILL.md:400` and `assets/orchestration-log-template.md:53` still direct the write into `## Workflow Observations`                                                                                                                                                                                                                 |
| **BL-260830-add-remote-review-respond** — Add remote review respond and summarize skill set                                               | medium | Low    | Medium | Fill-in       | Approval-gated replies already exist in receive-remote, so the remaining summarize skill is a narrow-audience addition of moderate size.                                                                                                      | -                                                                               | -                                  | partial: `oat-review-receive-remote` Step 7 posts approval-gated GitHub replies (`.agents/skills/oat-review-receive-remote/SKILL.md:213`); no summarize skill                                                                                                                                                                                                             |
| **BL-260830-integrate-recon-with-oat** — Integrate recon with OAT discovery and quick start                                               | medium | Medium | Medium | Fill-in       | An opt-in recon path in discovery and quick-start helps evidence-heavy projects without blocking others, and it covers two skills plus resume and partial-packet tests.                                                                       | BL-261001-make-recon-controller-setup; BL-260830-make-documentation-aware       | BL-260830-integrate-recon-across   | open: `oat-project-discover` and `oat-project-quick-start` SKILL.md contain no recon offer or packet consumption                                                                                                                                                                                                                                                          |
| **BL-260830-wire-bounded-durable-reference** — Wire bounded durable-reference reads into lifecycle skills                                 | medium | Medium | Medium | Fill-in       | Bounded reads of decisions and summaries would improve planning context, but the work needs matching and token-budget rules across discovery, plan, and review, and no blocker depends on it.                                                 | BL-260830-make-documentation-aware                                              | -                                  | open: no `.oat/repo/reference` reads in `oat-project-discover`, `oat-project-plan`, or `oat-project-review-provide` SKILL.md                                                                                                                                                                                                                                              |
| **BL-260902-append-only-lifecycle-history** — Append-only lifecycle history after completion                                              | medium | Medium | Medium | Fill-in       | It fixes three linked post-completion gaps (#209, #210, #251) where the retro and completion skills give incompatible instructions; it needs a CLI log-target change, retro prose, and idempotency tests.                                     | BL-261012-rename-the-project-retro                                              | -                                  | open: `oat-project-retro/SKILL.md:110-113` still renders `project-retro.md` from the template via `--output` (overwrite); no addendum path                                                                                                                                                                                                                                |
| **BL-260908-repair-or-exempt-archived** — Repair or exempt archived project ledgers that fail the pr-final path guard                     | low    | Low    | Low    | Fill-in       | A one-decision cleanup (most likely exempting `archived/`) plus two dangling rows, with no impact on active projects.                                                                                                                         | BL-261012-convert-legacy-journals; BL-261012-read-only-journal-lint             | -                                  | open: the named projects (`pjm-refresh`, `subagent-implement-refactor`, `gate-execution-hardening`, `multi-family-dispatch`) remain in `.oat/projects/archived/` unrepaired                                                                                                                                                                                               |
| **BL-260908-restructure-the-authoring** — Restructure the authoring skills for progressive disclosure and decide proactive invocation     | low    | Low    | Medium | Fill-in       | No verified defect sits behind this redesign; it needs a decision record, a reference split, and moving every pinned sentence with its test.                                                                                                  | BL-260909-re-source-the-surviving-codex                                         | -                                  | open: #277 OPEN; both `create-oat-skill` and `create-agnostic-skill` keep `disable-model-invocation: true` and their `references/` hold only templates; the sibling factual half shipped as archived BL-260908-correct-the-factual-skill                                                                                                                                  |
| **BL-260909-show-the-brainstorm-pack** — Show the brainstorm pack in the oat-doctor dashboard example and pack enumeration                | low    | Low    | Low    | Fill-in       | Only an illustrative example table and an unstated pack-status rule remain, which is a trivial prose edit.                                                                                                                                    | -                                                                               | -                                  | partial: oat-doctor 2.0 (#300, 4a9ee6a12) dropped the hardcoded enumeration ("the skill carries no pack manifest", `oat-doctor/SKILL.md:275`); the example at `:258-262` and the derivation rule are unaddressed                                                                                                                                                          |
| **BL-261002-fix-brainstorm-and-pjm** — Fix brainstorm and PJM template contract gaps for lite mode and archive-dated                      | low    | Low    | Low    | Fill-in       | The two remaining fixes (an argument-hint flag and lite listed in the handoff templates) are cheap discoverability polish with a narrow audience.                                                                                             | -                                                                               | -                                  | partial: E6 resolved by #361 (d1e2a93c1), so `oat-brainstorm/references/destinations.md:125-126` and `SKILL.md:523-536` now route lite to `plan.md`/`oat-project-lite`; E5 still open (`oat-pjm-review-backlog/SKILL.md:4` hint lacks `--archive-dated` though `:68` documents it); E8 still open (`.oat/templates/pjm-agents.md:121-122` lists only quick-start vs new). |
| **BL-261002-fix-project-planning-skill** — Fix project planning skill handoffs and inputs across discover, spec, promote, split, and plan | medium | Medium | Medium | Fill-in       | Five contract defects can stall spec-driven handoffs or skip user flags, but the fix is prose plus contract pins spread over about six skills.                                                                                                | BL-261002-verify-local-scope-lifecycle                                          | -                                  | open: `oat-project-spec/SKILL.md:109` still requires `oat_ready_for: oat-project-spec` while `oat-project-discover/SKILL.md:538` finishes `--ready-for oat-project-design`; `oat-project-promote-spec-driven/SKILL.md:4` still advertises `--project`; `oat-project-split/SKILL.md:4` still takes only `--plan-file`.                                                     |
| **BL-261002-port-the-complexity-review** — Port the complexity-review skill into an OAT pack                                              | medium | Medium | Medium | Fill-in       | Porting gives every user the full complexity review instead of a condensed fallback that can drift, but it needs pack placement, attribution, docs and lockstep release.                                                                      | BL-261002-wire-the-complexity-review                                            | -                                  | open: no `complexity-review` skill under `.agents/skills/`; only `.agents/docs/complexity-review-fallback.md` (from #351) exists.                                                                                                                                                                                                                                         |
| **BL-261002-route-validated-archive** — Route validated archive receipts from oat-project-complete-auto to the interactive resume tail    | medium | Medium | Medium | Fill-in       | Autonomous closeout recovery after an archive-then-push failure currently needs a human, which matters only for that narrow failure path; the fix needs receipt validation and a composed recovery test.                                      | -                                                                               | -                                  | open: #351 shipped only the honest refusal (`oat-project-complete-auto/SKILL.md:190,208` "project directory absent (archived?); resume with oat-project-complete"), which is this item's baseline.                                                                                                                                                                        |
| **BL-261002-wire-the-complexity-review** — Wire the complexity review into the sibling gate-capable skills                                | medium | Medium | Medium | Fill-in       | It extends the #351 exhaustion-point review to five more skills for consistency, with contract pins and version bumps per skill.                                                                                                              | BL-261002-port-the-complexity-review                                            | -                                  | open: #351 wired implement, review-receive and quick-start only; no `complexity-review` reference in `oat-project-{plan,import-plan,design,discover,lite}/SKILL.md`.                                                                                                                                                                                                      |
| **BL-261011-add-brief-to-the-legacy** — Add brief to the legacy generate-oat-state.sh mode table                                          | low    | Low    | Low    | Fill-in       | No runtime caller invokes the script (the item's own caller audit says so), so the fix only matters to anyone running it by hand; retiring it or adding three rows is under a day.                                                            | -                                                                               | -                                  | open: `.oat/scripts/generate-oat-state.sh:277-282` and `:396-397` still list only spec-driven/quick/import                                                                                                                                                                                                                                                                |
| **BL-261012-regenerate-the-archive-aware** — Regenerate the archive-aware PR body on a synced archive resume                              | low    | Low    | Medium | Fill-in       | It affects only a recordless resume between Step 8 and cleanup, which already reports a manual update, and the change lands in the very large oat-project-complete skill; the acceptance criteria are still placeholders.                     | -                                                                               | -                                  | open: oat-project-complete still reports the skip when a resumed archive run carries no body (`.agents/skills/oat-project-complete/SKILL.md:1712`, `:1769`)                                                                                                                                                                                                               |
| **BL-261012-wrap-up-pr-cross-reference** — Wrap-up PR cross-reference without a pr/ directory                                             | low    | Low    | Low    | Fill-in       | Archived projects lost `pr/`, so wrap-up undercounts associated PRs; reading `oat_pr_url` from the archived state is a small skill edit, but the acceptance criteria are still placeholders.                                                  | -                                                                               | -                                  | open: `.agents/skills/oat-wrap-up/SKILL.md:403-404` still relies on the sibling `pr/` scan and its workaround                                                                                                                                                                                                                                                             |
| **BL-260904-make-quick-the-default-oat** — Make quick the default OAT workflow mode and spec-driven the explicit larger mode              | medium | Medium | High   | Avoid / Defer | A defensible default change, but it is a repo-wide workflow-mode sweep (CLI, skills, templates, docs, migration) whose ladder text is stale now that brief and goal exist; it needs a product decision before implementation.                 | BL-261003-reassess-lite-execution-scope                                         | -                                  | open: `project/new/index.ts:166` `.default('spec-driven')` and `scaffold.ts:676` `options.mode ?? 'spec-driven'`                                                                                                                                                                                                                                                          |
| **BL-261002-let-plans-declare-an-evidence** — Let plans declare an evidence tier per phase and reconcile tracking on driver takeover      | medium | Medium | High   | Avoid / Defer | A per-phase evidence tier would cut over-evidencing, but it is an L-sized lifecycle-wide feature bundled with an unrelated driver-takeover step, and root `AGENTS.md` already carries the docs-only evidence rule manually.                   | BL-261003-reconcile-oat-tracking-commit; BL-261002-re-review-a-phase-only-after | -                                  | open: no `evidence_tier`/evidence-tier plan field in `.oat/templates/` or `.agents/skills/`; the only mitigation is the repo-local "docs-only moves take a conservation diff and one review round" rule in root `AGENTS.md`, which is not shipped.                                                                                                                        |
| **BL-261012-convert-legacy-journals** — Convert legacy journals on a working copy                                                         | low    | Low    | Medium | Avoid / Defer | A speculative idea deferred in discovery; manual fixes already work for the few resumed legacy projects, and the converter needs real-fixture provenance.                                                                                     | BL-261012-read-only-journal-lint                                                | -                                  | open: no converter in `packages/cli/src/commands/project/journal-check/`                                                                                                                                                                                                                                                                                                  |
| **BL-261012-read-only-journal-lint** — Read-only journal lint for in-flight projects                                                      | low    | Low    | Medium | Avoid / Defer | Earlier feedback would help, but the item is a speculative deferred idea with careful never-block constraints, and the three lifecycle boundaries already catch the same problems.                                                            | -                                                                               | -                                  | open: `JOURNAL_CHECK_BOUNDARIES` is still only implement-preflight/review/completion (`packages/cli/src/commands/project/journal-check/types.ts:12`)                                                                                                                                                                                                                      |
| **BL-261012-rename-the-project-retro** — Rename the project retro to retro.md                                                             | low    | Low    | Medium | Avoid / Defer | The item itself says to take it up only with a written reader benefit; it was judged low value and touches retro skills, templates and docs.                                                                                                  | -                                                                               | -                                  | open: no rename; `project-retro.md` is still referenced across 4 skill files. Close candidate since D3 and the review judged it not worth doing                                                                                                                                                                                                                           |

### Lane D — Dispatch, providers, and recon (13 items)

| Item                                                                                                                                            | Pri    | Value  | Effort | Quadrant          | Rationale                                                                                                                                                                                                           | Depends on                                                                                                                                     | Blocks | Reality check                                                                                                                                                                                                                                                                                      |
| ----------------------------------------------------------------------------------------------------------------------------------------------- | ------ | ------ | ------ | ----------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------- | ------ | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **BL-260726-validate-cursor-pin-effort** — Validate Cursor pin effort rungs at sync time                                                        | medium | Medium | Low    | Quick Win         | Cursor silently substitutes defaults for typos, so a family-aware rung check is a small isolated catalog-validation change that turns silent wrong-model dispatch into a hard error.                                | -                                                                                                                                              | -      | partial: probe-record consistency rejects mismatched direct-ID pins (61e1d4c11 #178; `packages/cli/src/providers/cursor/codec/sync-extension.test.ts:304`); no family-aware rung validation of `frontmatterModel`, and most mappings carry no probe record                                         |
| **BL-260928-settle-codex-read-authority** — Confirm /recon launches Codex worker lanes as contract-enforced on the released CLI                 | medium | Medium | Low    | Quick Win         | One live run confirms or refutes an assurance classification that currently rests on contract text alone.                                                                                                           | -                                                                                                                                              | -      | open: the classification exists only as contract text (`.agents/skills/recon/SKILL.md:108-113`), and no live-run outcome is recorded on the item                                                                                                                                                   |
| **BL-261002-settle-dispatch-policy** — Settle dispatch policy precedence and stop legacy presets overwriting ladder columns                     | medium | High   | Medium | Quick Win         | A config value silently overrides the policy the user chose in planning, and the legacy preset destroys exact model selection; one precedence decision plus resolver and skill alignment fixes both.                | BL-261002-fix-oat-config-describe-gaps                                                                                                         | -      | open: `packages/cli/src/commands/project/dispatch-ceiling/index.ts:2558` still resolves `configCeiling ?? projectCeiling`; `workflow.dispatchCeiling.preset` is still settable (`commands/config/index.ts:192,387`).                                                                               |
| **BL-260906-harden-dispatch-launch** — Harden dispatch launch baselines and terminal reconciliation                                             | high   | High   | High   | Strategic         | Two dispatch-integrity defects (#265, #266) at the core of every implementation run; #265 needs a redesign of the no-process guard or git seam, and #266 needs an outcome matrix before it can enter a wave.        | BL-260711-add-root-owned-dispatch-broker; BL-261002-settle-dispatch-policy                                                                     | -      | open: #265 and #266 both OPEN; the wave-7 p16 partial patch is parked unlanded at `.oat/repo/reference/parked/wave-7-p16/`                                                                                                                                                                         |
| **BL-260719-add-pinned-recon-agents** — Add pinned recon agents for reusable orchestration                                                      | medium | Medium | Medium | Fill-in           | A recon worker role already exists, so the remaining value is generalizing it to any orchestrator with model-floor selection, which is a moderate dispatch-skill change.                                            | BL-260729-implement-reviewplan-first; BL-260711-add-root-owned-dispatch-broker                                                                 | -      | partial: recon skill ships a materialized `recon-worker` leaf role with per-wave routing (#248, #285, #302; `.agents/agents/recon-worker.md`), but it is recon-scoped, not a generic pinned role in `oat-project-dispatch-subagents`                                                               |
| **BL-261001-make-recon-controller-setup** — Make recon controller setup and preflight self-serve                                                | low    | Medium | Medium | Fill-in           | It reduces controller friction (an initializer, phase-aware validation, a public preflight) for a skill with a narrow audience, and spans seven bullets across the existing scripts.                                | -                                                                                                                                              | -      | open: `.agents/skills/recon/scripts/` has no manifest initializer and no public source-preflight script; the source reopening routine is still internal to `validate-packet.mjs`                                                                                                                   |
| **BL-260711-add-root-owned-dispatch-broker** — Add root-owned dispatch broker for exact OAT subagent launches                                   | high   | Low    | High   | Avoid / Defer     | The phase-direct topology the item called a fallback is now the standard implementer model, so a coordinator-to-root broker solves a nesting problem the workflow no longer requires, at broad cross-provider cost. | BL-260719-add-pinned-recon-agents; BL-260820-emit-source-qualified                                                                             | -      | partial: launcher-owned dispatch provenance via `oat project dispatch record` (#255, #315; `packages/cli/src/commands/project/dispatch/record.ts`); phase-direct execution is the default (`.agents/agents/oat-phase-implementer.md`); broker itself not built                                     |
| **BL-260830-integrate-recon-across** — Integrate recon across analysis and research workflows                                                   | medium | Medium | High   | Avoid / Defer     | It would cut duplicate reconnaissance across five skill families, but it is a broad cross-skill contract and test effort that should follow the narrower lifecycle integration and recon setup work.                | BL-260830-integrate-recon-with-oat; BL-260719-add-pinned-recon-agents; BL-261001-make-recon-controller-setup; BL-261003-enforce-reconnaissance | -      | open: no recon handoff in `analyze`, `deep-research`, `skeptic`, or `synthesize` SKILL.md (rg "recon" only hits "reconcile")                                                                                                                                                                       |
| **BL-260903-close-claude-runtime-lineage** — Close Claude runtime lineage depth and unverified provider shapes                                  | low    | Low    | Low    | Avoid / Defer     | Residue with placeholder acceptance criteria that the item says to reopen only if it recurs; Claude depth is not derivable from current evidence.                                                                   | -                                                                                                                                              | -      | open: UNVERIFIED labels remain at `providers/identity/claude-runtime-observation.ts:57` and `codex-runtime-observation.ts:10,158`                                                                                                                                                                  |
| **BL-260925-add-grok-4-7-cursor-pin** — Add Grok 4.7 Cursor pin mappings                                                                        | low    | Low    | Medium | Avoid / Defer     | It is trigger-gated on independent quality evidence, and it requires revising DR-260718-explicit-cursor-pin-mapping plus adding a new catalog syntax family.                                                        | -                                                                                                                                              | -      | open: no `grok-4.7` mapping exists in `packages/cli/src`                                                                                                                                                                                                                                           |
| **BL-261001-record-mixed-native-and-cli** — Record mixed native and CLI recon continuations in the manifest                                     | low    | Low    | Medium | Avoid / Defer     | The operator deferred it until mixed-route continuations recur, and it adds manifest schema machinery without evidence of repeated friction.                                                                        | BL-261001-recover-recon-lanes-after (hard)                                                                                                     | -      | open: the trigger dependency BL-261001-recover-recon-lanes-after is now archived, but no recurrence evidence has been recorded                                                                                                                                                                     |
| **BL-260708-verify-cursor-gpt-5-6-subagent** — Verify Cursor GPT-5.6 subagent model slugs                                                       | medium | Low    | Low    | Close (reconcile) | The verification it asks for already happened, so the only remaining work is archiving the item with a pointer to the evidence.                                                                                     | -                                                                                                                                              | -      | complete: GPT-5.6 Sol/Terra/Luna pins live-probed and approved in g01 commit 734bf4189 (`.oat/projects/shared/cursor-subagent-materialization/references/cursor-pin-verification.md`) and shipped as approved mappings in `packages/cli/src/providers/cursor/codec/catalog.ts:250-342` (fe2e9ef4a) |
| **BL-260827-refresh-provider-codex-md** — Refresh provider-codex.md for the ultra effort tier, the GPT-5.4 retirement, and per-subcommand flags | medium | Low    | Low    | Close (reconcile) | Later model-guidance refreshes already rewrote the reference, so only a one-line exec-resume flag note remains, which fits the next scheduled refresh.                                                              | -                                                                                                                                              | -      | superseded by #315, #317, #334 (`guidance_version: 2026-10-01`; GPT-5.4 kept only as direct-API routes; ultra roles excluded in `packages/cli/src/providers/codex/codec/catalog.test.ts:66-72`); exec-resume flag note still absent                                                                |

### Lane E — Config and sync (10 items)

| Item                                                                                                                                       | Pri    | Value  | Effort | Quadrant          | Rationale                                                                                                                                                                                                                                     | Depends on                                                              | Blocks                                 | Reality check                                                                                                                                                                                                                                   |
| ------------------------------------------------------------------------------------------------------------------------------------------ | ------ | ------ | ------ | ----------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------- | -------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **BL-261002-clean-up-stale-provider-views** — Clean up stale provider views and Codex entries when a canonical agent is deleted or renamed | high   | High   | Medium | Quick Win         | An ordinary agent rename leaves the whole team unable to run `oat sync` or `oat status`, and the fix is confined to provider sync cleanup plus regression tests.                                                                              | -                                                                       | -                                      | open: `packages/cli/src/providers/cursor/codec/materialize.ts:188` still throws on a dangling agent link, and no Codex agent-table pruning has landed since 2026-10-02                                                                          |
| **BL-261002-fix-oat-config-describe-gaps** — Fix oat config describe gaps and make config unset reach the layer that holds the key         | medium | Medium | Low    | Quick Win         | `config describe` is the page users go to for the owning command and unset fails silently, so correcting the catalog and adding an allowlist cross-check test is high-leverage, isolated work.                                                | BL-261002-make-the-copy-sync-strategy; BL-261002-settle-dispatch-policy | -                                      | open: `packages/cli/src/commands/config/index.ts:1272,1307` still name `oat providers set --scope project` as the owner of `sync.defaultStrategy`/`sync.providers.<name>.strategy`; no config command changes since 2026-10-02 touch unset.     |
| **BL-261002-stop-oat-sync-from-changing** — Stop oat sync from changing user values in .codex/config.toml                                  | medium | Medium | Low    | Quick Win         | Silently reversing a user's explicit Codex multi-agent or depth choice on every sync is a trust defect, and the fix is one merge function plus a regression test (or a decision record that OAT owns the keys).                               | -                                                                       | -                                      | open: `packages/cli/src/providers/codex/codec/config-merge.ts:155-161` still writes `max_depth = max(2, user, inherited)` unconditionally.                                                                                                      |
| **BL-260908-remove-the-top-level-skill** — Remove the top-level skill version read after the alias error has been quiet                    | medium | Medium | Medium | Fill-in           | It completes the recorded alias retirement in DR-260908-bundled-skills-declare; the precondition is likely already met, and the work covers the resolver change, an agents-role decision, collapsing helper copies, and `keyIdentity` parity. | -                                                                       | -                                      | open: the resolver still reads top-level `version` at `commands/shared/frontmatter.ts:432`; the step-1 error has shipped since f4c2dc4ef (#286), many releases before 0.3.38                                                                    |
| **BL-261002-make-the-copy-sync-strategy** — Make the copy sync strategy checkout-independent and settable from the CLI                     | medium | Medium | Medium | Fill-in           | `copy` is the documented choice for symlink-hostile teams, but it churns across checkouts and can only be set by hand-editing, so fixing it means path-neutral markers, a setter, and a two-checkout test.                                    | BL-260909-restamp-a-stale-copy-strategy                                 | BL-261002-fix-oat-config-describe-gaps | open: `packages/cli/src/engine/execute-plan.ts:219-223` still stamps `entry.canonical.canonicalPath` into the sentinel and marker; `packages/cli/src/commands/providers/` has no `--strategy` option.                                           |
| **BL-260724-support-provider-directory** — Support provider directory symlinks as full collection sync                                     | high   | Medium | High   | Avoid / Defer     | The remaining headline criterion is blocked on a symlinkat-class primitive Node does not expose and applies only to Claude skills, so the value-to-effort ratio is poor until the platform primitive exists.                                  | -                                                                       | -                                      | partial: adopt-only and detach-only collection aliases shipped in tool-pack-scope-provider-truthfulness (#255); `auto` creation not shipped (`collectionAliasCreationAvailable` defaults false per item status note)                            |
| **BL-260725-classify-general-sync-owned** — Classify general sync-owned dirt in project-start preflight                                    | low    | Low    | Medium | Avoid / Defer     | The item itself says prompting is already correct for every hard case and to revisit only if non-manifest sync dirt becomes recurring, so it is trigger-gated with known traps.                                                               | -                                                                       | -                                      | open                                                                                                                                                                                                                                            |
| **BL-260909-restamp-a-stale-copy-strategy** — Restamp a stale copy-strategy contentHash on skip and retire the pre-framing digest bridge   | medium | Low    | Low    | Avoid / Defer     | The remaining scope is deleting a compatibility bridge, which is cheap but gated on field installs having restamped, and that cannot be observed from the repository.                                                                         | -                                                                       | -                                      | partial: restamp-on-skip and legacy-manifest retirement classification shipped in wave 4 (#351, 4a85d2eda); the bridge is still present at `packages/cli/src/drift/detector.ts:143-168`                                                         |
| **BL-260909-use-handle-bound-traversal** — Use handle-bound traversal in the managed-copy and manifest filesystem readers                  | low    | Low    | High   | Avoid / Defer     | Exploiting this needs a local attacker racing a sync, while Node has no `openat` walk, so handle-bound hashing across four readers is broad and costly.                                                                                       | -                                                                       | -                                      | open: the limitation is still recorded at `packages/cli/src/engine/managed-copy-hash.ts:108`; no `openat`/`O_DIRECTORY` traversal exists (the acceptance criteria are unfilled `{Outcome 1}` placeholders)                                      |
| **BL-260830-add-per-claude-md-adoption-opt** — Add per-CLAUDE.md adoption opt-out for instruction sync                                     | low    | Low    | Low    | Close (reconcile) | A per-path opt-out now exists and is shared by sync and validate, so the item can close unless someone needs per-file granularity.                                                                                                            | -                                                                       | -                                      | complete: per-path `instructions.claude.excludes` shared by sync and validate (#332, #356; `packages/cli/src/commands/instructions/instructions.utils.ts:845`; `apps/oat-docs/docs/provider-sync/commands.md:241,260`); no per-file granularity |

### Lane F — CLI surfaces and tool packs (17 items)

| Item                                                                                                                                                    | Pri    | Value  | Effort | Quadrant      | Rationale                                                                                                                                                                                                                                                | Depends on                                                                        | Blocks                            | Reality check                                                                                                                                                                                                                                                                                        |
| ------------------------------------------------------------------------------------------------------------------------------------------------------- | ------ | ------ | ------ | ------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------- | --------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **BL-261002-correct-misleading-init-status** — Correct misleading init, status, and doctor messages and stop scripts from defaulting to user-scope sync | low    | Medium | Low    | Quick Win     | Several of these teach adopters commands that write into the home directory or cannot run outside this repository, and each fix is a one-line message or script change.                                                                                  | BL-260830-cli-flag-help-p2-p3-cleanup                                             | -                                 | open: `init/index.ts:1393` still says "Skip"; `status/index.ts:230` and `doctor/index.ts:1209` say `pnpm build`; `scripts/worktree/init.sh:468` runs a bare `cli -- sync`; `init/tools/project-guidance.ts:157` says `--scope all`                                                                   |
| **BL-261002-honor-the-requested-scope** — Honor the requested scope for every pack in tools install and init --setup                                    | medium | High   | Medium | Quick Win     | Writing into HOME when the user asked for project scope (and into the repository when they asked for user scope) breaks a documented adoption contract, and the fix is bounded to install/init paths plus HOME/repo snapshot tests.                      | BL-261002-provide-a-complete-oat; BL-260911-support-per-tool-scope                | -                                 | open: no tools install/remove changes since 2026-10-02; `detectDefaultBranch` still shells out to `gh repo view` (`packages/cli/src/config/oat-config.ts:2795-2798`).                                                                                                                                |
| **BL-261012-commit-paths-should-accept** — commit-paths should accept tracked files under ignored directories                                           | medium | Medium | Low    | Quick Win     | Lifecycle commits that touch tracked bundled templates fall back to `git add -f` outside the receipt primitive; staging already tracked, explicitly named paths is a bounded fix.                                                                        | -                                                                                 | BL-261005-resolve-deferred-wave-5 | open: `exact-path-commit.ts:545` still runs `git add -A` with no ignore handling; the cited `public-package-versions.json` example is stale because `.gitignore:26` has excluded it from the ignore rule since 8fa494724, and the real case is tracked `packages/cli/assets/templates/*` (29ba174eb) |
| **BL-260718-rewrite-worktree-bootstrap** — Rewrite worktree bootstrap-group as tested TypeScript command                                                | medium | Low    | Medium | Fill-in       | The bash script works, so a TypeScript port mainly buys testability and parity and is best sequenced with the wave CLI family.                                                                                                                           | BL-260718-add-oat-wave-lifecycle-cli                                              | -                                 | open (bash only: `.agents/skills/oat-wave-execute/scripts/bootstrap-group.sh`)                                                                                                                                                                                                                       |
| **BL-260830-benchmark-listprojects-before** — Benchmark listProjects before approving a summary fast path                                               | low    | Low    | Medium | Fill-in       | It is a speculative performance question with no reported slowness, and a reproducible baseline across representative repos is moderate work.                                                                                                            | -                                                                                 | -                                 | open                                                                                                                                                                                                                                                                                                 |
| **BL-260830-cli-flag-help-p2-p3-cleanup** — CLI flag/help P2-P3 cleanup                                                                                 | medium | Medium | Medium | Fill-in       | Residual flag and exit-code inconsistencies hurt consistency rather than block work, and the first step is re-auditing a legacy inventory against current grammar.                                                                                       | -                                                                                 | -                                 | open (legacy-promoted; needs re-audit)                                                                                                                                                                                                                                                               |
| **BL-260830-complete-control-plane-backed** — Complete control-plane-backed lifecycle reads                                                             | medium | Medium | Medium | Fill-in       | Moving residual plan and implementation readers to a CLI-owned surface reduces duplicated skill parsing, but it is a refactor with no blocking defect.                                                                                                   | BL-260927-derive-current-lifecycle-state                                          | -                                 | open                                                                                                                                                                                                                                                                                                 |
| **BL-260906-give-project-state-frontmatter** — Give PROJECT_STATE_FRONTMATTER_FIELDS a production consumer or delete it                                 | low    | Low    | Low    | Fill-in       | A misleading dead seam with a one-decision, sub-day fix (most likely deletion) and no user-facing impact.                                                                                                                                                | -                                                                                 | -                                 | open: `commands/shared/frontmatter.ts:23,68` exports are referenced only by `frontmatter.test.ts`                                                                                                                                                                                                    |
| **BL-260908-align-the-provider-view-json** — Align the provider-view JSON, evidence states, and docs with the human row                                 | low    | Low    | Low    | Fill-in       | Four small truthfulness fixes to `oat tools info --json` and its docs, each isolated and under a day.                                                                                                                                                    | BL-260903-retire-deprecated-pack                                                  | -                                 | open: `drift/skill-view-diagnostic.ts` still emits `providerPath` for inactive and excluded rows; `NO_PROJECTION` is applied only in the human formatter at `tools/info/skill-views.ts:454`                                                                                                          |
| **BL-260909-surface-config-warnings** — Surface config warnings on every reader path and document the warnings field                                    | medium | Medium | Medium | Fill-in       | It makes config diagnostics consistent across five surfaces and documents a JSON field, but it is not blocking, and touching several readers plus `resolve.ts` puts it at one to two days.                                                               | -                                                                                 | -                                 | open: `readOatConfigWithWarnings` is used only in `commands/config/index.ts`; `instructions.utils.ts:627,884` still call `readOatConfig`; `reference/configuration.md` does not document the `warnings` field                                                                                        |
| **BL-260911-support-per-tool-scope** — Support per-tool scope migration in oat tools migrate                                                            | medium | Low    | Medium | Fill-in       | It is a convenience for a narrow cleanup case that already has a two-command workaround, and reusing the pack-level safety checks still needs collision, symlink, and sync tests.                                                                        | -                                                                                 | -                                 | open: `--pack` is mandatory at `packages/cli/src/commands/tools/migrate/index.ts:330`; the stated priority anchor BL-260911-make-docs-bootstrap-a-front is already archived                                                                                                                          |
| **BL-261012-archive-metadata-reads-map** — Archive metadata reads map EACCES to a missing file                                                          | low    | Low    | Low    | Fill-in       | Distinguishing ENOENT from other errno values is an isolated fix to a rare permission case; the item still has placeholder acceptance criteria.                                                                                                          | -                                                                                 | -                                 | open: `readArchiveMetadataAt` still has a bare `catch { return null; }` (`packages/cli/src/commands/project/archive/archive-utils.ts:3405`)                                                                                                                                                          |
| **BL-261012-complete-state-json-refusals** — complete-state --json refusals carry structured reason codes                                               | low    | Low    | Low    | Fill-in       | It saves callers from regex-parsing refusal text, and the structured reasons already exist in the evaluator, so adding them to the error payload is cheap but serves a narrow audience.                                                                  | -                                                                                 | -                                 | open: `packages/cli/src/commands/project/complete-state/index.ts:101-136` still throws `CliError(formatJournalRefusal(...))` text only                                                                                                                                                               |
| **BL-260718-add-oat-wave-lifecycle-cli** — Add oat wave lifecycle CLI command family                                                                    | high   | Medium | High   | Avoid / Defer | Moving the proven wave mechanics into tested CLI commands is useful but L-sized and explicitly trigger-gated on operator prioritization after stoa W6 validation.                                                                                        | BL-260718-document-execution-program (hard); BL-260718-rewrite-worktree-bootstrap | -                                 | open (no `packages/cli/src/commands/wave`)                                                                                                                                                                                                                                                           |
| **BL-260901-consolidate-terminal-remote** — Consolidate terminal remote-ref advertisement parsing                                                       | low    | Low    | Medium | Avoid / Defer | A maintainability refactor whose own acceptance criteria wait until "one of those call sites next requires change"; extracting a typed parser across eight sites without a trigger is churn.                                                             | -                                                                                 | -                                 | open: `ls-remote` parsing remains in 8 non-test files under `packages/cli/src/commands/{doctor,project}/`                                                                                                                                                                                            |
| **BL-260903-retire-deprecated-pack** — Retire deprecated pack placement and dead evidence diagnostics                                                   | low    | Low    | Medium | Avoid / Defer | The item says to reopen it only on real confusion, its acceptance criteria are placeholders, and it spans several surfaces, six diagnostic codes, and sync fail-closed behavior.                                                                         | BL-260908-align-the-provider-view-json                                            | -                                 | open: deprecated `placement` still printed at `tools/list/list-tools.ts:137,189`, `tools/info/info-tool.ts:139`, `status/index.ts:674`                                                                                                                                                               |
| **BL-261002-provide-a-complete-oat** — Provide a complete OAT uninstall path and make pack removal clean up after itself                                | medium | Medium | High   | Avoid / Defer | A supported uninstall helps teams back out, but a full clean install-remove cycle across templates, ideas, sync, Codex/Cursor projections and HOME is broad; split out the fatal `remove --all` scope error and stale `tools.requiredBy` as quick fixes. | BL-261002-honor-the-requested-scope; BL-260911-support-per-tool-scope             | -                                 | open: no uninstall command in `packages/cli/src/commands/`; no changes under `commands/tools/remove` or `commands/remove` since 2026-10-02.                                                                                                                                                          |

### Lane G — Validation, contract tests, and CI (14 items)

| Item                                                                                                                                         | Pri    | Value  | Effort | Quadrant  | Rationale                                                                                                                                                                                               | Depends on                               | Blocks | Reality check                                                                                                                                                                                                                |
| -------------------------------------------------------------------------------------------------------------------------------------------- | ------ | ------ | ------ | --------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------- | ------ | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **BL-260906-make-the-dispatch-stamp** — Make the dispatch-stamp contract helper reject bold-step boundaries and normal-path shim permissions | medium | Medium | Low    | Quick Win | It closes two demonstrated mutation escapes in a regression backstop with a small helper change plus red-then-green fixtures.                                                                           | -                                        | -      | open: `__tests__/skills/dispatch-stamp-contract.ts:37` `INTERVENING_HEADING` matches only ATX headings                                                                                                                       |
| **BL-261011-clean-up-the-isolated-home** — Clean up the isolated HOME directories that evidence-grade test runs leave under TMPDIR           | low    | Medium | Low    | Quick Win | Observed disk exhaustion (3.3 GB, phases paused) is fixed by a small trap-based `pnpm test:evidence` script and an AGENTS.md pointer change.                                                            | -                                        | -      | open: no `test:evidence` script in `package.json`; AGENTS.md:92 still prescribes bare `HOME=$(mktemp -d) pnpm exec turbo run test --force`                                                                                   |
| **BL-261011-validate-skill-bumps-against** — Validate skill bumps against a stacked PR's base branch, not only origin/main                   | medium | Medium | Low    | Quick Win | A version gate that passes vacuously on stacked PRs weakens a CI guarantee, and the CLI already accepts a base ref, so the remaining work is a stacked-base wrapper or pr-final step plus a test.       | -                                        | -      | open: `validate-skill-version-bumps --base-ref` already exists (since #22, 2c05f2372), but `package.json:36` hardcodes `origin/main` and no step compares against the PR base                                                |
| **BL-260718-add-generated-runbook** — Add generated-runbook verification command pass                                                        | medium | Low    | Medium | Fill-in   | The evidence comes from an external stoa program, and no OAT runbook generator was found to attach the pass to, so value depends on first naming the generator.                                         | BL-260830-cli-flag-help-p2-p3-cleanup    | -      | open (rg finds no runbook generator in `packages/cli/src` or `.agents/skills`)                                                                                                                                               |
| **BL-260819-classify-canonical-skills-by** — Classify canonical skills by distribution, lifecycle, and tenant scope                          | medium | Medium | Medium | Fill-in   | An authoritative classification removes directory-count guesswork for docs and catalogs, and is a bounded metadata-plus-validator change.                                                               | BL-260830-decide-generic-oat-ownership   | -      | open (no distribution/lifecycle classification in `packages/cli/src/validation/skills.ts`; 86 directories under `.agents/skills`)                                                                                            |
| **BL-260827-span-based-prose-guards** — Span-based prose guards, anchored probe records, and a shared probe runner for skill contract tests  | medium | Low    | Medium | Fill-in   | The residuals are documented fail-open edges with no current bundled trigger, and generalizing guards and moving the probe runner is moderate test-tooling work.                                        | -                                        | -      | open (no probe runner under `tools/`; `.agents/skills/codex-skill/tests/codex-skill-contract.test.mjs:165` `LIST_MARKER_ONLY` still blockquote-blind)                                                                        |
| **BL-260830-live-dogfood-oat-brainstorm** — Live dogfood oat-brainstorm destination and fold-back safety                                     | medium | Low    | Medium | Fill-in   | It closes a known evidence gap on fold-back commit safety, but brainstorm has run in production since mid-2026 with no defect filed, and live runs across nine destination families take a day or more. | -                                        | -      | open: `.agents/skills/oat-brainstorm/references/dogfood-results.md` still says "Walkthrough plans only — not live runs" (last touched 2026-06-24)                                                                            |
| **BL-260906-make-the-phase-implementer** — Make the phase-implementer sweep contract test negation-aware                                     | low    | Low    | Low    | Fill-in   | A small test-robustness fix (markup-tolerant negation plus pinned controls) for a guard that currently fails closed rather than open.                                                                   | BL-260906-make-the-dispatch-stamp        | -      | open: the bare-word lookbehind `(?<!never \|not \|do not \|cannot )` remains at `init/tools/shared/post-implement-sequence-contracts.test.ts:1440`                                                                           |
| **BL-260906-project-journal-reservation** — Project journal reservation state into the smoke evidence bundle                                 | low    | Low    | Low    | Fill-in   | A fidelity-only projection gap with no current consumer, fixed in `collect.mjs` and `assertions.mjs` with one captured fixture.                                                                         | -                                        | -      | open: no `reservedAt` or `state` projection under `tools/smoke/evidence/` (`normalizeManifest` lives in `collect.mjs`)                                                                                                       |
| **BL-260907-type-check-cli-test-files** — Type-check CLI test files with a test-scoped tsconfig gate                                         | medium | Medium | Medium | Fill-in   | It catches broken tests before review, but triaging 614 pre-existing errors or building an allowlist is 1-3 days.                                                                                       | -                                        | -      | open: `packages/cli/tsconfig.json` excludes `src/**/*.test.ts`; `tsconfig.test-support.json` (#227, predates the item) covers only `__tests__/**` helpers; type-aware oxlint still uses `--ignore-pattern '**/*.test.ts'`    |
| **BL-260909-add-a-grep-by-shape-control** — Add a grep-by-shape control for own-key sweeps keyed to variable names                           | low    | Low    | Low    | Fill-in   | A scripted smoke control with an allowlist is small, but it guards a bug class that p05 already hardened and no new site has been reported since.                                                       | BL-260909-wave-7-review-polish-leftovers | -      | open: `getOwnKey` routing is present (gate/index.ts, config/index.ts, providers/ceiling/registry.ts, config/resolve.ts from #286), and no shape control exists in `tools/smoke` or `.oxlintrc.json`                          |
| **BL-260909-make-findsection-comment-aware** — Make findSection comment-aware in the bundled-docs contract test                              | low    | Low    | Low    | Fill-in   | This is an isolated test-helper fix that closes a narrow fail-open in a contract test, and it has no user-facing effect.                                                                                | -                                        | -      | open: `findSection` at `packages/cli/src/commands/init/tools/shared/skills-bundled-docs-contract.test.ts:305` is still a raw fence pass with no comment handling                                                             |
| **BL-260909-wave-7-review-polish-leftovers** — Wave-7 review polish leftovers                                                                | low    | Low    | Low    | Fill-in   | About a dozen non-behavioral nits can be swept in one change, and none of them affects users.                                                                                                           | BL-260909-add-a-grep-by-shape-control    | -      | open (line references have drifted): the rollup `/gm` reader is now `commands/project/log/rollup.ts:535`, the "on the rewrite" comment is now `commands/config/index.ts:3263`, and `OXFMT_BINARY` no longer exists in source |
| **BL-261002-let-skills-declare-their-side** — Let skills declare their side effects in metadata                                              | low    | Low    | Medium | Fill-in   | A side-effects frontmatter field plus a docs validator improves drift resistance for hand-written "without asking" lines, but it is not blocking and touches every bundled skill.                       | -                                        | -      | open: no side-effect metadata key in skill frontmatter or validator under `packages/cli/src/validation`.                                                                                                                     |

### Lane H — Docs app and Explainer Kit (8 items)

| Item                                                                                                                                    | Pri    | Value  | Effort | Quadrant      | Rationale                                                                                                                                                                                         | Depends on                             | Blocks                               | Reality check                                                                                                                                                                                                                                                             |
| --------------------------------------------------------------------------------------------------------------------------------------- | ------ | ------ | ------ | ------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------- | ------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **BL-260909-re-source-the-surviving-codex** — Re-source the surviving Codex provider claims and repair the dead provider-reference URLs | low    | Medium | Low    | Quick Win     | Authoring skills and the provider reference are what agents treat as facts, so unsourced limits and 12 dead URLs mislead them; the fix is a bounded fetch-and-edit pass.                          | -                                      | -                                    | open: `.agents/docs/skills-guide.md:275` and `:498`, `create-agnostic-skill/SKILL.md:177`, `references/skill-template.md:212` unchanged; `.agents/docs/provider-reference.md` still has 12 `developers.openai.com/codex` URLs (last touched #198)                         |
| **BL-261002-make-explainer-kit-accept-or** — Make explainer-kit accept or reject source-code inputs explicitly                          | medium | Medium | Low    | Quick Win     | The documented engineer-tour example silently drops source directories and fails with an opaque error, and reporting skipped files or ingesting the `codebase` role is a contained script change. | BL-260912-evaluate-replacing-explainer | -                                    | open: `.agents/skills/explainer-kit/scripts/bundle.mjs:39,517,531` still filters to `.md/.txt/.html/.json` with no skipped-file report; no changes to that file since 2026-10-02.                                                                                         |
| **BL-260718-document-execution-program** — Document execution-program artifact as stable OAT contract                                   | medium | Medium | Medium | Fill-in       | Its trigger (a second consumer) has fired, and a normative schema with executable validation is a bounded contract task that unblocks the wave CLI.                                               | BL-260718-add-oat-wave-lifecycle-cli   | BL-260718-add-oat-wave-lifecycle-cli | open (trigger met: program-recap recipe shipped in #161, `.agents/skills/explainer-kit/recipes/program-recap.json`; format still descriptive in `.agents/skills/oat-wave-program/assets/execution-program-template.md`)                                                   |
| **BL-261002-commit-a-headless-rendered** — Commit a headless rendered-site QA tour for the docs app                                     | medium | Medium | Medium | Fill-in       | It catches rendered defects that no static check sees, but it is a new Playwright tool with crawl, overflow, and Mermaid measurements.                                                            | -                                      | -                                    | open: `apps/oat-docs/scripts/` holds only `markdown.ts`, `skill-catalog.ts`, `skill-mapping.ts`, and `validate.ts`, and there is no headless tour                                                                                                                         |
| **BL-261002-split-the-tool-packs-page** — Split the Tool Packs page and restructure the Workflow Gates and Dispatch Policy pages        | low    | Medium | Medium | Fill-in       | New users land on a specification under Getting Started, and the page has nearly doubled since filing, but this is docs-only restructuring with link and index upkeep.                            | -                                      | -                                    | open: `apps/oat-docs/docs/getting-started/tool-packs.md` is now 81,446 bytes (item says ~45k); `workflows/advanced/workflow-gates.md` is 70,976 bytes and `dispatch-ceiling.md` is 40,726 bytes; no reference split exists under `apps/oat-docs/docs/reference/`.         |
| **BL-261002-theme-mermaid-diagrams** — Theme Mermaid diagrams and keep them readable on phones                                          | low    | Low    | Low    | Fill-in       | Only narrow-screen readability remains, which is a small CSS change for a cosmetic docs issue.                                                                                                    | -                                      | -                                    | partial: palette theming landed in #382 (c4786ac33, `packages/docs-theme/src/pele-theme.ts` maps Pele variables to `--color-fd-*` tokens) and a full-screen zoom dialog in #350 (`zoom-frame.tsx`); no inline min-width/scroll region for screens 640px wide or narrower. |
| **BL-260728-additional-visual-workflows** — Additional visual workflows                                                                 | low    | Low    | High   | Avoid / Defer | It is an open-ended evaluation of six candidate recipes with no observed demand recorded yet, and each accepted workflow needs its own contract and fixtures.                                     | -                                      | -                                    | open (dependency gate cleared: BL-260727-close-the-explainer-kit-visual and the four BL-260728 golden-recovery items are all archived)                                                                                                                                    |
| **BL-260912-evaluate-replacing-explainer** — Evaluate replacing Explainer Kit authoring guidance with a pinned Effective HTML subset    | medium | Low    | High   | Avoid / Defer | This is a speculative evaluation with a paired prototype at three viewports and a supply-chain review, and it produces no shipped change by design.                                               | -                                      | -                                    | open: the prerequisite agent-authored-recap shipped (`completed.md` 2026-09-13 entries); nothing in `.agents`, `packages`, or `apps` references effective-html                                                                                                            |

### Lane I — Docs consumer rollout (4 items)

| Item                                                                                                                                | Pri    | Value  | Effort | Quadrant  | Rationale                                                                                                                                                                                                                                                         | Depends on                                                                                                           | Blocks                                                                            | Reality check                                                                                                                                                                                                                                                                                    |
| ----------------------------------------------------------------------------------------------------------------------------------- | ------ | ------ | ------ | --------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| **BL-261024-roll-out-the-shipped-oat-docs** — Roll out the shipped OAT docs front door and approval policy to consumer repositories | high   | High   | High   | Strategic | It is the external completion of issue #367 across named consumers, including an automation approval-boundary change and real automation handoffs; it needs consumer owner authorization and multi-repo evidence.                                                 | BL-261025-close-docs-skill-workflow-gaps; BL-261025-make-oat-docs-generators; BL-261025-tighten-oat-docs-check-rules | -                                                                                 | partial: four consumer surfaces conformed on 0.3.33 with fixes in #378 and #379 (item's Delivery status); all eight checkboxes are still unticked                                                                                                                                                |
| **BL-261025-close-docs-skill-workflow-gaps** — Close docs skill workflow gaps found in the consumer rollout                         | high   | High   | High   | Strategic | Eight consolidated adopter-facing gaps (navOwner adoption path, CI recipe, init formatter loop, silent tracking failure) hit every consumer, but together they span three skills and the init and analyze CLIs.                                                   | BL-261025-make-oat-docs-generators                                                                                   | BL-261024-roll-out-the-shipped-oat-docs                                           | open: `oat docs analyze` still prints "Next: run oat docs apply" (`packages/cli/src/commands/docs/analyze.ts:41`); `{{REPO_NAME}}` still uses `basename(repoRoot)` (`docs/init/markdown.ts:81`); `references/pr-ci.md` has no `nav sync --check`                                                 |
| **BL-261025-make-oat-docs-generators** — Make OAT docs generators and writers predictable                                           | medium | Medium | High   | Strategic | It removes rollout friction (read-only freshness checks, formatter churn in consumer CI, duplicate nav rows), but its seven sub-items span generate-index, config, decision, nav sync and validation; the generate-index `--check` part is a separable quick win. | -                                                                                                                    | BL-261024-roll-out-the-shipped-oat-docs; BL-261025-close-docs-skill-workflow-gaps | open: no `--check`/stdout option in `packages/cli/src/commands/docs/index-generate/`; entry-count message unchanged (`index.ts:744`); `hasImplicitIndex` unchanged (`docs/nav/fumadocs.ts:201`)                                                                                                  |
| **BL-261025-tighten-oat-docs-check-rules** — Tighten oat docs check rules and diagnostics                                           | medium | Medium | Medium | Fill-in   | False-positive provenance hits and the one-group width bypass weaken consumer conformance, and each rule fix is local to `reader-rules.ts` or `diagrams.ts` with boundary tests.                                                                                  | -                                                                                                                    | BL-261024-roll-out-the-shipped-oat-docs                                           | open: unanchored home-path regex (`docs/check/reader-rules.ts:388`), `grouped = retained.some(...)` (`:101`), `separators.set` last-wins (`:77`) all unchanged; #382 (c4786ac33) moved rendering to pele, but diagram-freshness still warns on any Mermaid source change (`diagrams.ts:308-320`) |

### Lane J — PJM and backlog tooling (3 items)

| Item                                                                                                                | Pri  | Value | Effort | Quadrant  | Rationale                                                                                                                                                                        | Depends on | Blocks | Reality check                                                                                                                                                                                 |
| ------------------------------------------------------------------------------------------------------------------- | ---- | ----- | ------ | --------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------- | ------ | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **BL-261002-enforce-remote-planning** — Enforce remote planning approval caps, storage scope, and binding locations | high | High  | Medium | Quick Win | These are assurance boundaries the docs promise (an unapproved remote body overwrite, committed local-project metadata), and the fixes are localized but need negative controls. | -          | -      | open: `packages/cli/src/commands/pjm/remote/` is unchanged since #273 (7d70ac307); `prepareMutation` at `service.ts:3060` has no replace floor; `init/gitignore.ts` has no `pjm/remote` entry |
| **BL-260908-date-decision-record-ids** — Date decision-record IDs in local time or document UTC                     | low  | Low   | Low    | Fill-in   | A minor operator-confusion fix (choose local time or document UTC) with one test and one AGENTS.md line.                                                                         | -          | -      | open: `commands/decision/new.ts:65` derives the date from `toISOString()` (UTC); `.oat/repo/reference/decisions/AGENTS.md` states no rule                                                     |
| **BL-260928-harden-the-backlog-reference** — Harden the backlog reference rewriter's atomic replace edge cases      | low  | Low   | Low    | Fill-in   | These are rare filesystem edge cases (sudo ownership, very long names, a concurrent edit) in one module, and the work is a small isolated fix with tests.                        | -          | -      | open: the temp name is unchanged at `packages/cli/src/commands/backlog/rewrite-references.ts:176`, with no chown or ENAMETOOLONG handling                                                     |

### Lane K — Product and policy decisions (human-only) (10 items)

| Item                                                                                                                                  | Pri    | Value  | Effort | Quadrant      | Rationale                                                                                                                                                                                                       | Depends on                                                             | Blocks | Reality check                                                                                                                                                          |
| ------------------------------------------------------------------------------------------------------------------------------------- | ------ | ------ | ------ | ------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------- | ------ | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **BL-261002-decide-whether-an-existing** — Decide whether an existing provider folder should activate sync without opt-in             | medium | Medium | Low    | Quick Win     | Writing into a provider folder simply because it exists surprises adopters, and the minimum outcome is one decision record plus a clearer mismatch message.                                                     | -                                                                      | -      | open: no matching decision record exists in the decisions index (DR-261001-bootstrap-detection-boundary covers docs bootstrap, not provider activation)                |
| **BL-261002-publish-an-owner-statement** — Publish an owner statement on project stability, support, and non-goals                    | low    | Medium | Low    | Quick Win     | Adopters asked for a stability and non-goals page and it is a short docs page, but only the owner can write it.                                                                                                 | -                                                                      | -      | open: no stability, maturity or non-goals statement in `README.md` or `apps/oat-docs/docs/index.md`.                                                                   |
| **BL-260906-re-evaluate-universal-plan** — Re-evaluate universal plan proof strategy and test-first guidance                          | medium | High   | High   | Strategic     | It changes proof guidance for every plan and implementer contract and removes test theater; the full inventory, decision, cross-mode alignment, and contract checks are cross-cutting.                          | BL-261003-reassess-lite-execution-scope                                | -      | partial: DR-260906-use-proportionate-proof (3d3759a37) settled proportionate proof for Lite only; `oat-project-implement/SKILL.md:104,243` still says "TDD discipline" |
| **BL-260830-decide-generic-oat-ownership** — Decide generic OAT ownership of Jira backlog refinement                                  | medium | Low    | Low    | Fill-in       | It needs only an ownership decision, and the likely answer (org-local) affects a narrow audience.                                                                                                               | BL-260819-classify-canonical-skills-by                                 | -      | open (no Jira decision under `.oat/repo/reference/decisions/`; `create-ticket` exists as a repo-only skill)                                                            |
| **BL-261002-decide-a-supported-permission** — Decide a supported permission setup for unattended cross-runtime review                 | medium | Medium | Medium | Fill-in       | Unattended independent review currently forces a choice between a hang and a full permission bypass, but the details are unverified, and per-provider reproduction plus allowlist tests take one to three days. | -                                                                      | -      | open: no decision record exists in `.oat/repo/reference/decisions/index.md`                                                                                            |
| **BL-261002-decide-first-run-defaults** — Decide first-run defaults for project scope without origin and non-interactive pack install | medium | Medium | Medium | Fill-in       | A first project in a repo with no `origin` fails, though with a clear remedy; the decision is quick, but implementing scope plumbing across entry skills is moderate.                                           | -                                                                      | -      | open: no matching decision record exists in the decisions index                                                                                                        |
| **BL-261030-decide-whether-a-no-op-sync** — Decide whether a no-op sync should restamp the manifest oatVersion                        | low    | Low    | Low    | Fill-in       | It is decision-gated churn caused by CLI version skew; either outcome (a recorded decision plus a docs note, or a guarded save) is small.                                                                       | -                                                                      | -      | open: the no-op restamp is still pinned (`packages/cli/src/commands/sync/index.test.ts:1602`)                                                                          |
| **BL-260830-decide-whether-oat-owns** — Decide whether OAT owns dependency intelligence                                               | low    | Low    | Low    | Avoid / Defer | A speculative product-scope question with no demand evidence; the decision itself is cheap, but nothing is waiting on it, so it should wait for a real request.                                                 | -                                                                      | -      | open: no dependency-intelligence decision in `.oat/repo/reference/decisions/index.md`                                                                                  |
| **BL-260830-memory-subsystem-ownership** — Memory subsystem ownership decision for OAT                                                | low    | Low    | Low    | Avoid / Defer | The item itself defers this until provider interop and multi-project workflows mature, and the XL estimate overstates what is a decision-only deliverable.                                                      | -                                                                      | -      | open: no memory ownership decision in `.oat/repo/reference/decisions/`                                                                                                 |
| **BL-261002-decide-how-teams-enforce** — Decide how teams enforce shared gate and checkpoint rules                                    | medium | Medium | High   | Avoid / Defer | The decision is cheap, but the enforcement branch (a CI-checkable record of gate runs and a CI check) is broad, and nothing yet shows teams need it.                                                            | BL-260927-give-gate-receipts-portable; BL-260820-bind-each-gate-review | -      | open: no matching decision record exists in the decisions index                                                                                                        |

---

## 3. Dependency Graph

Edges come from each lane's hard and soft dependency and Blocks columns; an edge `X - -▶ Y` from a Blocks entry means X helps unblock Y.

```text
Legend:  ──▶  hard dependency (must complete first)
         - -▶  soft dependency (beneficial but not required)

# A — Review chain and gate integrity
BL-260711-add-activity-aware-gate - -▶ BL-260729-implement-reviewplan-first
BL-260711-add-root-owned-dispatch-broker - -▶ BL-260820-emit-source-qualified
BL-260711-skip-re-review-for-bookkeeping - -▶ BL-260729-implement-reviewplan-first
BL-260711-skip-re-review-for-bookkeeping - -▶ BL-260818-distinguish-operator-directed
BL-260711-skip-re-review-for-bookkeeping - -▶ BL-260820-track-pr-closeout-evidence
BL-260711-skip-re-review-for-bookkeeping - -▶ BL-260927-derive-current-lifecycle-state
BL-260711-skip-re-review-for-bookkeeping - -▶ BL-261002-re-review-a-phase-only-after
BL-260711-skip-re-review-for-bookkeeping - -▶ BL-261003-diagnose-review-finding
BL-260719-add-pinned-recon-agents - -▶ BL-260729-implement-reviewplan-first
BL-260719-evaluate-broader-final-gate - -▶ BL-260820-track-pr-closeout-evidence
BL-260729-implement-reviewplan-first - -▶ BL-260711-add-activity-aware-gate
BL-260818-distinguish-operator-directed - -▶ BL-260706-front-load-recurring-gate
BL-260818-distinguish-operator-directed - -▶ BL-260711-skip-re-review-for-bookkeeping
BL-260818-distinguish-operator-directed - -▶ BL-261013-classify-review-findings
BL-260820-bind-each-gate-review - -▶ BL-260711-skip-re-review-for-bookkeeping
BL-260820-bind-each-gate-review - -▶ BL-260927-derive-current-lifecycle-state
BL-260820-bind-each-gate-review - -▶ BL-261002-list-pending-required-reviews
BL-260820-bind-each-gate-review - -▶ BL-261003-persist-separate-review
BL-260820-emit-source-qualified - -▶ BL-260711-add-activity-aware-gate
BL-260820-emit-source-qualified - -▶ BL-260820-bind-each-gate-review
BL-260820-emit-source-qualified - -▶ BL-260820-track-pr-closeout-evidence
BL-260820-emit-source-qualified - -▶ BL-260927-give-gate-receipts-portable
BL-260820-emit-source-qualified - -▶ BL-261003-enforce-reconnaissance
BL-260820-track-pr-closeout-evidence - -▶ BL-260719-evaluate-broader-final-gate
BL-260820-track-pr-closeout-evidence - -▶ BL-260927-derive-current-lifecycle-state
BL-260820-track-pr-closeout-evidence - -▶ BL-261013-documentation-sync-after
BL-260830-re-evaluate-same-target-gate - -▶ BL-261002-offer-a-strict-gate-reviewer
BL-260902-append-only-lifecycle-history - -▶ BL-260902-file-deferred-repository
BL-260903-project-document-should-prompt - -▶ BL-261013-documentation-sync-after
BL-260927-derive-current-lifecycle-state - -▶ BL-260820-bind-each-gate-review
BL-260927-give-gate-receipts-portable - -▶ BL-261003-enforce-reconnaissance
BL-260927-give-gate-receipts-portable - -▶ BL-261005-distinguish-stored-receipt
BL-260927-give-gate-receipts-portable - -▶ BL-261030-report-gate-project-log
BL-260927-mark-gate-findings-as-new-or - -▶ BL-260706-front-load-recurring-gate
BL-260927-mark-gate-findings-as-new-or - -▶ BL-260818-distinguish-operator-directed
BL-260927-mark-gate-findings-as-new-or ──▶ BL-260818-distinguish-operator-directed
BL-261002-gitignore-project-review - -▶ BL-261003-persist-separate-review
BL-261002-port-the-complexity-review - -▶ BL-260818-distinguish-operator-directed
BL-261002-re-review-a-phase-only-after - -▶ BL-260711-skip-re-review-for-bookkeeping
BL-261002-verify-local-scope-lifecycle - -▶ BL-261002-gitignore-project-review
BL-261002-wire-the-complexity-review - -▶ BL-260706-front-load-recurring-gate
BL-261002-wire-the-complexity-review - -▶ BL-260818-distinguish-operator-directed
BL-261003-persist-separate-review - -▶ BL-261002-gitignore-project-review
BL-261003-persist-separate-review - -▶ BL-261002-list-pending-required-reviews
BL-261012-commit-paths-should-accept - -▶ BL-261005-resolve-deferred-wave-5
BL-261013-classify-review-findings - -▶ BL-260818-distinguish-operator-directed
BL-261013-classify-review-findings - -▶ BL-261002-re-review-a-phase-only-after
BL-261013-classify-review-findings - -▶ BL-261003-diagnose-review-finding

# B — Goal and brief workflow
BL-261011-guard-goal-brief-amendments - -▶ BL-261011-automate-goal-phase-extraction
BL-261011-guard-goal-brief-amendments - -▶ BL-261011-persist-pre-registration
BL-261011-persist-pre-registration - -▶ BL-261011-guard-goal-brief-amendments

# C — Lifecycle skills, artifacts, and routing
BL-260830-integrate-recon-with-oat - -▶ BL-260830-make-documentation-aware
BL-260830-make-documentation-aware - -▶ BL-260830-integrate-recon-with-oat
BL-260830-make-documentation-aware - -▶ BL-260830-wire-bounded-durable-reference
BL-260830-wire-bounded-durable-reference - -▶ BL-260830-make-documentation-aware
BL-260904-make-quick-the-default-oat - -▶ BL-261002-add-an-explicit-plan-approval
BL-260909-re-source-the-surviving-codex - -▶ BL-260908-restructure-the-authoring
BL-260927-derive-current-lifecycle-state - -▶ BL-260927-detect-unfilled-placeholders
BL-261001-make-recon-controller-setup - -▶ BL-260830-integrate-recon-with-oat
BL-261002-let-plans-declare-an-evidence - -▶ BL-261003-reconcile-oat-tracking-commit
BL-261002-port-the-complexity-review - -▶ BL-261002-wire-the-complexity-review
BL-261002-re-review-a-phase-only-after - -▶ BL-261002-let-plans-declare-an-evidence
BL-261002-verify-local-scope-lifecycle - -▶ BL-261002-fix-project-planning-skill
BL-261002-wire-the-complexity-review - -▶ BL-261002-port-the-complexity-review
BL-261003-reassess-lite-execution-scope - -▶ BL-260904-make-quick-the-default-oat
BL-261003-reconcile-oat-tracking-commit - -▶ BL-261002-let-plans-declare-an-evidence
BL-261012-convert-legacy-journals - -▶ BL-260907-recognize-phase-level
BL-261012-convert-legacy-journals - -▶ BL-260908-repair-or-exempt-archived
BL-261012-read-only-journal-lint - -▶ BL-260908-repair-or-exempt-archived
BL-261012-read-only-journal-lint - -▶ BL-261012-convert-legacy-journals
BL-261012-rename-the-project-retro - -▶ BL-260902-append-only-lifecycle-history

# D — Dispatch, providers, and recon
BL-260711-add-root-owned-dispatch-broker - -▶ BL-260719-add-pinned-recon-agents
BL-260711-add-root-owned-dispatch-broker - -▶ BL-260906-harden-dispatch-launch
BL-260719-add-pinned-recon-agents - -▶ BL-260711-add-root-owned-dispatch-broker
BL-260719-add-pinned-recon-agents - -▶ BL-260830-integrate-recon-across
BL-260729-implement-reviewplan-first - -▶ BL-260719-add-pinned-recon-agents
BL-260820-emit-source-qualified - -▶ BL-260711-add-root-owned-dispatch-broker
BL-260830-integrate-recon-with-oat - -▶ BL-260830-integrate-recon-across
BL-261001-make-recon-controller-setup - -▶ BL-260830-integrate-recon-across
BL-261002-fix-oat-config-describe-gaps - -▶ BL-261002-settle-dispatch-policy
BL-261002-settle-dispatch-policy - -▶ BL-260906-harden-dispatch-launch
BL-261003-enforce-reconnaissance - -▶ BL-260830-integrate-recon-across

# E — Config and sync
BL-260909-restamp-a-stale-copy-strategy - -▶ BL-261002-make-the-copy-sync-strategy
BL-261002-make-the-copy-sync-strategy - -▶ BL-261002-fix-oat-config-describe-gaps
BL-261002-settle-dispatch-policy - -▶ BL-261002-fix-oat-config-describe-gaps

# F — CLI surfaces and tool packs
BL-260718-add-oat-wave-lifecycle-cli - -▶ BL-260718-rewrite-worktree-bootstrap
BL-260718-document-execution-program - -▶ BL-260718-add-oat-wave-lifecycle-cli
BL-260718-document-execution-program ──▶ BL-260718-add-oat-wave-lifecycle-cli
BL-260718-rewrite-worktree-bootstrap - -▶ BL-260718-add-oat-wave-lifecycle-cli
BL-260830-cli-flag-help-p2-p3-cleanup - -▶ BL-261002-correct-misleading-init-status
BL-260903-retire-deprecated-pack - -▶ BL-260908-align-the-provider-view-json
BL-260908-align-the-provider-view-json - -▶ BL-260903-retire-deprecated-pack
BL-260911-support-per-tool-scope - -▶ BL-261002-honor-the-requested-scope
BL-260911-support-per-tool-scope - -▶ BL-261002-provide-a-complete-oat
BL-260927-derive-current-lifecycle-state - -▶ BL-260830-complete-control-plane-backed
BL-261002-honor-the-requested-scope - -▶ BL-261002-provide-a-complete-oat
BL-261002-provide-a-complete-oat - -▶ BL-261002-honor-the-requested-scope

# G — Validation, contract tests, and CI
BL-260830-cli-flag-help-p2-p3-cleanup - -▶ BL-260718-add-generated-runbook
BL-260830-decide-generic-oat-ownership - -▶ BL-260819-classify-canonical-skills-by
BL-260906-make-the-dispatch-stamp - -▶ BL-260906-make-the-phase-implementer
BL-260909-add-a-grep-by-shape-control - -▶ BL-260909-wave-7-review-polish-leftovers
BL-260909-wave-7-review-polish-leftovers - -▶ BL-260909-add-a-grep-by-shape-control

# H — Docs app and Explainer Kit
BL-260718-add-oat-wave-lifecycle-cli - -▶ BL-260718-document-execution-program
BL-260912-evaluate-replacing-explainer - -▶ BL-261002-make-explainer-kit-accept-or

# I — Docs consumer rollout
BL-261025-close-docs-skill-workflow-gaps - -▶ BL-261024-roll-out-the-shipped-oat-docs
BL-261025-make-oat-docs-generators - -▶ BL-261024-roll-out-the-shipped-oat-docs
BL-261025-make-oat-docs-generators - -▶ BL-261025-close-docs-skill-workflow-gaps
BL-261025-tighten-oat-docs-check-rules - -▶ BL-261024-roll-out-the-shipped-oat-docs

# K — Product and policy decisions (human-only)
BL-260819-classify-canonical-skills-by - -▶ BL-260830-decide-generic-oat-ownership
BL-260820-bind-each-gate-review - -▶ BL-261002-decide-how-teams-enforce
BL-260927-give-gate-receipts-portable - -▶ BL-261002-decide-how-teams-enforce
BL-261003-reassess-lite-execution-scope - -▶ BL-260906-re-evaluate-universal-plan

# Independent (55)
BL-260708-verify-cursor-gpt-5-6-subagent [independent]
BL-260724-support-provider-directory [independent]
BL-260725-classify-general-sync-owned [independent]
BL-260726-validate-cursor-pin-effort [independent]
BL-260728-additional-visual-workflows [independent]
BL-260827-refresh-provider-codex-md [independent]
BL-260827-span-based-prose-guards [independent]
BL-260830-add-per-claude-md-adoption-opt [independent]
BL-260830-add-remote-review-respond [independent]
BL-260830-benchmark-listprojects-before [independent]
BL-260830-decide-whether-oat-owns [independent]
BL-260830-live-dogfood-oat-brainstorm [independent]
BL-260830-memory-subsystem-ownership [independent]
BL-260830-wire-provide-remote-skills [independent]
BL-260901-consolidate-terminal-remote [independent]
BL-260903-close-claude-runtime-lineage [independent]
BL-260906-give-project-state-frontmatter [independent]
BL-260906-project-journal-reservation [independent]
BL-260907-type-check-cli-test-files [independent]
BL-260908-date-decision-record-ids [independent]
BL-260908-remove-the-top-level-skill [independent]
BL-260909-make-findsection-comment-aware [independent]
BL-260909-show-the-brainstorm-pack [independent]
BL-260909-surface-config-warnings [independent]
BL-260909-use-handle-bound-traversal [independent]
BL-260925-add-grok-4-7-cursor-pin [independent]
BL-260928-harden-the-backlog-reference [independent]
BL-260928-settle-codex-read-authority [independent]
BL-261001-record-mixed-native-and-cli [independent]
BL-261002-align-implement-complete [independent]
BL-261002-clean-up-stale-provider-views [independent]
BL-261002-commit-a-headless-rendered [independent]
BL-261002-decide-a-supported-permission [independent]
BL-261002-decide-first-run-defaults [independent]
BL-261002-decide-whether-an-existing [independent]
BL-261002-enforce-remote-planning [independent]
BL-261002-fix-brainstorm-and-pjm [independent]
BL-261002-let-skills-declare-their-side [independent]
BL-261002-publish-an-owner-statement [independent]
BL-261002-route-validated-archive [independent]
BL-261002-split-the-tool-packs-page [independent]
BL-261002-stop-oat-sync-from-changing [independent]
BL-261002-theme-mermaid-diagrams [independent]
BL-261002-warn-when-the-default-branch [independent]
BL-261011-add-brief-to-the-legacy [independent]
BL-261011-clean-up-the-isolated-home [independent]
BL-261011-re-project-oat-pr-status-from [independent]
BL-261011-route-a-standalone-out [independent]
BL-261011-validate-skill-bumps-against [independent]
BL-261012-archive-metadata-reads-map [independent]
BL-261012-complete-state-json-refusals [independent]
BL-261012-oat-wave-execute-writes-into [independent]
BL-261012-regenerate-the-archive-aware [independent]
BL-261012-wrap-up-pr-cross-reference [independent]
BL-261030-decide-whether-a-no-op-sync [independent]
```

**ID legend** (every ID used above):

| ID                                       | Title                                                                                                    |
| ---------------------------------------- | -------------------------------------------------------------------------------------------------------- |
| BL-260706-front-load-recurring-gate      | Front-load recurring gate-finding classes into implementer briefs                                        |
| BL-260708-verify-cursor-gpt-5-6-subagent | Verify Cursor GPT-5.6 subagent model slugs                                                               |
| BL-260711-add-activity-aware-gate        | Add activity-aware gate timeouts                                                                         |
| BL-260711-add-root-owned-dispatch-broker | Add root-owned dispatch broker for exact OAT subagent launches                                           |
| BL-260711-skip-re-review-for-bookkeeping | Skip re-review for bookkeeping-only review findings                                                      |
| BL-260718-add-generated-runbook          | Add generated-runbook verification command pass                                                          |
| BL-260718-add-oat-wave-lifecycle-cli     | Add oat wave lifecycle CLI command family                                                                |
| BL-260718-document-execution-program     | Document execution-program artifact as stable OAT contract                                               |
| BL-260718-rewrite-worktree-bootstrap     | Rewrite worktree bootstrap-group as tested TypeScript command                                            |
| BL-260719-add-pinned-recon-agents        | Add pinned recon agents for reusable orchestration                                                       |
| BL-260719-evaluate-broader-final-gate    | Evaluate broader final-gate freshness policy after narrow optimization                                   |
| BL-260724-support-provider-directory     | Support provider directory symlinks as full collection sync                                              |
| BL-260725-classify-general-sync-owned    | Classify general sync-owned dirt in project-start preflight                                              |
| BL-260726-validate-cursor-pin-effort     | Validate Cursor pin effort rungs at sync time                                                            |
| BL-260728-additional-visual-workflows    | Additional visual workflows                                                                              |
| BL-260729-implement-reviewplan-first     | Implement ReviewPlan-first reviewer workflow                                                             |
| BL-260818-distinguish-operator-directed  | Design the budget-exhausted decision point for reviews and gates review-cycle cap                        |
| BL-260819-classify-canonical-skills-by   | Classify canonical skills by distribution, lifecycle, and tenant scope                                   |
| BL-260820-bind-each-gate-review          | Bind each gate review disposition to its exact received ledger event                                     |
| BL-260820-emit-source-qualified          | Emit source-qualified provenance envelopes for review and gate receipts                                  |
| BL-260820-track-pr-closeout-evidence     | Track PR-closeout evidence freshness against the current head                                            |
| BL-260827-refresh-provider-codex-md      | Refresh provider-codex.md for the ultra effort tier, the GPT-5.4 retirement, and per-subcommand flags    |
| BL-260827-span-based-prose-guards        | Span-based prose guards, anchored probe records, and a shared probe runner for skill contract tests      |
| BL-260830-add-per-claude-md-adoption-opt | Add per-CLAUDE.md adoption opt-out for instruction sync                                                  |
| BL-260830-add-remote-review-respond      | Add remote review respond and summarize skill set                                                        |
| BL-260830-benchmark-listprojects-before  | Benchmark listProjects before approving a summary fast path                                              |
| BL-260830-cli-flag-help-p2-p3-cleanup    | CLI flag/help P2-P3 cleanup                                                                              |
| BL-260830-complete-control-plane-backed  | Complete control-plane-backed lifecycle reads                                                            |
| BL-260830-decide-generic-oat-ownership   | Decide generic OAT ownership of Jira backlog refinement                                                  |
| BL-260830-decide-whether-oat-owns        | Decide whether OAT owns dependency intelligence                                                          |
| BL-260830-integrate-recon-across         | Integrate recon across analysis and research workflows                                                   |
| BL-260830-integrate-recon-with-oat       | Integrate recon with OAT discovery and quick start                                                       |
| BL-260830-live-dogfood-oat-brainstorm    | Live dogfood oat-brainstorm destination and fold-back safety                                             |
| BL-260830-make-documentation-aware       | Make the knowledge index optional by default for discovery and planning                                  |
| BL-260830-memory-subsystem-ownership     | Memory subsystem ownership decision for OAT                                                              |
| BL-260830-re-evaluate-same-target-gate   | Re-evaluate same-target gate execution                                                                   |
| BL-260830-wire-bounded-durable-reference | Wire bounded durable-reference reads into lifecycle skills                                               |
| BL-260830-wire-provide-remote-skills     | Wire provide-remote skills to the review-remote helper CLI                                               |
| BL-260901-consolidate-terminal-remote    | Consolidate terminal remote-ref advertisement parsing                                                    |
| BL-260902-append-only-lifecycle-history  | Append-only lifecycle history after completion                                                           |
| BL-260902-file-deferred-repository       | File deferred repository follow-ups from a passing receive                                               |
| BL-260903-close-claude-runtime-lineage   | Close Claude runtime lineage depth and unverified provider shapes                                        |
| BL-260903-project-document-should-prompt | project-document should prompt a re-run when review fixes change a shipped contract                      |
| BL-260903-retire-deprecated-pack         | Retire deprecated pack placement and dead evidence diagnostics                                           |
| BL-260904-make-quick-the-default-oat     | Make quick the default OAT workflow mode and spec-driven the explicit larger mode                        |
| BL-260906-give-project-state-frontmatter | Give PROJECT_STATE_FRONTMATTER_FIELDS a production consumer or delete it                                 |
| BL-260906-harden-dispatch-launch         | Harden dispatch launch baselines and terminal reconciliation                                             |
| BL-260906-make-the-dispatch-stamp        | Make the dispatch-stamp contract helper reject bold-step boundaries and normal-path shim permissions     |
| BL-260906-make-the-phase-implementer     | Make the phase-implementer sweep contract test negation-aware                                            |
| BL-260906-project-journal-reservation    | Project journal reservation state into the smoke evidence bundle                                         |
| BL-260906-re-evaluate-universal-plan     | Re-evaluate universal plan proof strategy and test-first guidance                                        |
| BL-260907-recognize-phase-level          | Recognize phase-level completion records so bullet-list revision phases do not read as incomplete        |
| BL-260907-type-check-cli-test-files      | Type-check CLI test files with a test-scoped tsconfig gate                                               |
| BL-260908-align-the-provider-view-json   | Align the provider-view JSON, evidence states, and docs with the human row                               |
| BL-260908-date-decision-record-ids       | Date decision-record IDs in local time or document UTC                                                   |
| BL-260908-remove-the-top-level-skill     | Remove the top-level skill version read after the alias error has been quiet                             |
| BL-260908-repair-or-exempt-archived      | Repair or exempt archived project ledgers that fail the pr-final path guard                              |
| BL-260908-restructure-the-authoring      | Restructure the authoring skills for progressive disclosure and decide proactive invocation              |
| BL-260909-add-a-grep-by-shape-control    | Add a grep-by-shape control for own-key sweeps keyed to variable names                                   |
| BL-260909-make-findsection-comment-aware | Make findSection comment-aware in the bundled-docs contract test                                         |
| BL-260909-re-source-the-surviving-codex  | Re-source the surviving Codex provider claims and repair the dead provider-reference URLs                |
| BL-260909-restamp-a-stale-copy-strategy  | Restamp a stale copy-strategy contentHash on skip and retire the pre-framing digest bridge               |
| BL-260909-show-the-brainstorm-pack       | Show the brainstorm pack in the oat-doctor dashboard example and pack enumeration                        |
| BL-260909-surface-config-warnings        | Surface config warnings on every reader path and document the warnings field                             |
| BL-260909-use-handle-bound-traversal     | Use handle-bound traversal in the managed-copy and manifest filesystem readers                           |
| BL-260909-wave-7-review-polish-leftovers | Wave-7 review polish leftovers                                                                           |
| BL-260911-support-per-tool-scope         | Support per-tool scope migration in oat tools migrate                                                    |
| BL-260912-evaluate-replacing-explainer   | Evaluate replacing Explainer Kit authoring guidance with a pinned Effective HTML subset                  |
| BL-260925-add-grok-4-7-cursor-pin        | Add Grok 4.7 Cursor pin mappings                                                                         |
| BL-260927-derive-current-lifecycle-state | Derive current lifecycle state from one authority for review, phase, and publication status              |
| BL-260927-detect-unfilled-placeholders   | Detect unfilled placeholders and frontmatter-body drift at PR-final and completion                       |
| BL-260927-give-gate-receipts-portable    | Give gate receipts portable ownership, path-neutral identities, and a shipped ignore rule                |
| BL-260927-mark-gate-findings-as-new-or   | Mark gate findings as new or carried over between attempts                                               |
| BL-260928-harden-the-backlog-reference   | Harden the backlog reference rewriter's atomic replace edge cases                                        |
| BL-260928-settle-codex-read-authority    | Confirm /recon launches Codex worker lanes as contract-enforced on the released CLI                      |
| BL-261001-make-recon-controller-setup    | Make recon controller setup and preflight self-serve                                                     |
| BL-261001-record-mixed-native-and-cli    | Record mixed native and CLI recon continuations in the manifest                                          |
| BL-261002-add-an-explicit-plan-approval  | Add an explicit plan-approval step to quick and spec-driven projects                                     |
| BL-261002-align-implement-complete       | Align implement, complete, and pr-final skill contracts with their actual behavior                       |
| BL-261002-clean-up-stale-provider-views  | Clean up stale provider views and Codex entries when a canonical agent is deleted or renamed             |
| BL-261002-commit-a-headless-rendered     | Commit a headless rendered-site QA tour for the docs app                                                 |
| BL-261002-correct-misleading-init-status | Correct misleading init, status, and doctor messages and stop scripts from defaulting to user-scope sync |
| BL-261002-decide-a-supported-permission  | Decide a supported permission setup for unattended cross-runtime review                                  |
| BL-261002-decide-first-run-defaults      | Decide first-run defaults for project scope without origin and non-interactive pack install              |
| BL-261002-decide-how-teams-enforce       | Decide how teams enforce shared gate and checkpoint rules                                                |
| BL-261002-decide-whether-an-existing     | Decide whether an existing provider folder should activate sync without opt-in                           |
| BL-261002-enforce-remote-planning        | Enforce remote planning approval caps, storage scope, and binding locations                              |
| BL-261002-fix-brainstorm-and-pjm         | Fix brainstorm and PJM template contract gaps for lite mode and archive-dated                            |
| BL-261002-fix-oat-config-describe-gaps   | Fix oat config describe gaps and make config unset reach the layer that holds the key                    |
| BL-261002-fix-project-planning-skill     | Fix project planning skill handoffs and inputs across discover, spec, promote, split, and plan           |
| BL-261002-gitignore-project-review       | Gitignore project review artifacts instead of committing them                                            |
| BL-261002-honor-the-requested-scope      | Honor the requested scope for every pack in tools install and init --setup                               |
| BL-261002-let-plans-declare-an-evidence  | Let plans declare an evidence tier per phase and reconcile tracking on driver takeover                   |
| BL-261002-let-skills-declare-their-side  | Let skills declare their side effects in metadata                                                        |
| BL-261002-list-pending-required-reviews  | List pending required reviews when a project reaches a pull request                                      |
| BL-261002-make-explainer-kit-accept-or   | Make explainer-kit accept or reject source-code inputs explicitly                                        |
| BL-261002-make-the-copy-sync-strategy    | Make the copy sync strategy checkout-independent and settable from the CLI                               |
| BL-261002-offer-a-strict-gate-reviewer   | Offer a strict gate-reviewer independence mode and align gate skill wording and decision records         |
| BL-261002-port-the-complexity-review     | Port the complexity-review skill into an OAT pack                                                        |
| BL-261002-provide-a-complete-oat         | Provide a complete OAT uninstall path and make pack removal clean up after itself                        |
| BL-261002-publish-an-owner-statement     | Publish an owner statement on project stability, support, and non-goals                                  |
| BL-261002-re-review-a-phase-only-after   | Re-review a phase only after Critical or High findings                                                   |
| BL-261002-route-validated-archive        | Route validated archive receipts from oat-project-complete-auto to the interactive resume tail           |
| BL-261002-settle-dispatch-policy         | Settle dispatch policy precedence and stop legacy presets overwriting ladder columns                     |
| BL-261002-split-the-tool-packs-page      | Split the Tool Packs page and restructure the Workflow Gates and Dispatch Policy pages                   |
| BL-261002-stop-oat-sync-from-changing    | Stop oat sync from changing user values in .codex/config.toml                                            |
| BL-261002-theme-mermaid-diagrams         | Theme Mermaid diagrams and keep them readable on phones                                                  |
| BL-261002-verify-local-scope-lifecycle   | Verify local-scope lifecycle commits and empty HiLL phase defaults                                       |
| BL-261002-warn-when-the-default-branch   | Warn when the default branch has changed planned paths since the branch base                             |
| BL-261002-wire-the-complexity-review     | Wire the complexity review into the sibling gate-capable skills                                          |
| BL-261003-diagnose-review-finding        | Diagnose review finding overcounts and revalidate format-only repairs without relaunch                   |
| BL-261003-enforce-reconnaissance         | Enforce reconnaissance evidence and reconcile original-run review receipts                               |
| BL-261003-persist-separate-review        | Persist separate review artifacts and validate plain-file ledger references                              |
| BL-261003-reassess-lite-execution-scope  | Reassess Lite execution scope and preserve completed work on promotion                                   |
| BL-261003-reconcile-oat-tracking-commit  | Reconcile OAT tracking commit cadence with resumable phase/group batching                                |
| BL-261005-distinguish-stored-receipt     | Distinguish stored receipt branch return from rewritten history                                          |
| BL-261005-resolve-deferred-wave-5        | Resolve deferred Wave 5 maintenance edge cases                                                           |
| BL-261011-add-brief-to-the-legacy        | Add brief to the legacy generate-oat-state.sh mode table                                                 |
| BL-261011-automate-goal-phase-extraction | Automate goal phase extraction into a child project                                                      |
| BL-261011-clean-up-the-isolated-home     | Clean up the isolated HOME directories that evidence-grade test runs leave under TMPDIR                  |
| BL-261011-guard-goal-brief-amendments    | Guard goal brief amendments against an open delivery head branch                                         |
| BL-261011-persist-pre-registration       | Persist pre-registration review staleness for goal milestones                                            |
| BL-261011-re-project-oat-pr-status-from  | Re-project oat_pr_status from goal delivery observations at terminal closeout                            |
| BL-261011-route-a-standalone-out         | Route a standalone Out of Scope brief section into discovery on promotion                                |
| BL-261011-validate-skill-bumps-against   | Validate skill bumps against a stacked PR's base branch, not only origin/main                            |
| BL-261012-archive-metadata-reads-map     | Archive metadata reads map EACCES to a missing file                                                      |
| BL-261012-commit-paths-should-accept     | commit-paths should accept tracked files under ignored directories                                       |
| BL-261012-complete-state-json-refusals   | complete-state --json refusals carry structured reason codes                                             |
| BL-261012-convert-legacy-journals        | Convert legacy journals on a working copy                                                                |
| BL-261012-oat-wave-execute-writes-into   | oat-wave-execute writes into the roll-up-owned Workflow Observations section                             |
| BL-261012-read-only-journal-lint         | Read-only journal lint for in-flight projects                                                            |
| BL-261012-regenerate-the-archive-aware   | Regenerate the archive-aware PR body on a synced archive resume                                          |
| BL-261012-rename-the-project-retro       | Rename the project retro to retro.md                                                                     |
| BL-261012-wrap-up-pr-cross-reference     | Wrap-up PR cross-reference without a pr/ directory                                                       |
| BL-261013-classify-review-findings       | Classify review findings against the contract at every receive                                           |
| BL-261013-documentation-sync-after       | Documentation sync after closeout silently stales the exit gate                                          |
| BL-261024-roll-out-the-shipped-oat-docs  | Roll out the shipped OAT docs front door and approval policy to consumer repositories                    |
| BL-261025-close-docs-skill-workflow-gaps | Close docs skill workflow gaps found in the consumer rollout                                             |
| BL-261025-make-oat-docs-generators       | Make OAT docs generators and writers predictable                                                         |
| BL-261025-tighten-oat-docs-check-rules   | Tighten oat docs check rules and diagnostics                                                             |
| BL-261030-decide-whether-a-no-op-sync    | Decide whether a no-op sync should restamp the manifest oatVersion                                       |
| BL-261030-report-gate-project-log        | Report gate project-log finalization in the terminal JSON envelope                                       |

---

## 4. Parallel Lanes

These work streams can run concurrently when they do not touch the same
files. The hidden shared writes are `.agents/skills/oat-project-implement/`,
`.agents/skills/oat-project-quick-start/`, `packages/cli/src/commands/gate/`,
`packages/cli/src/commands/config/index.ts`, and the skill contract tests under
`packages/cli/src/commands/init/tools/shared/` and `packages/cli/src/validation/`.
Run at most one lane per wave on each of those surfaces.

### Lane 1: Receipt identity and review integrity

The review/gate chain, designed as one integrity model (the
`review-gate-integrity` project).

```text
emit-source-qualified ─▶ bind-each-gate-review ─▶ mark-gate-findings-as-new-or ─▶ distinguish-operator-directed
                                   └─▶ skip-re-review-for-bookkeeping ─▶ track-pr-closeout-evidence
classify-review-findings - -▶ re-review-a-phase-only-after
```

**Items in this lane:**

- **BL-260820-emit-source-qualified** — Emit source-qualified provenance envelopes for review and gate receipts
- **BL-260820-bind-each-gate-review** — Bind each gate review disposition to its exact received ledger event
- **BL-260927-mark-gate-findings-as-new-or** — Mark gate findings as new or carried over between attempts
- **BL-260818-distinguish-operator-directed** — Design the budget-exhausted decision point for reviews and gates review-cycle cap
- **BL-260711-skip-re-review-for-bookkeeping** — Skip re-review for bookkeeping-only review findings
- **BL-260820-track-pr-closeout-evidence** — Track PR-closeout evidence freshness against the current head
- **BL-261013-classify-review-findings** — Classify review findings against the contract at every receive
- **BL-261002-re-review-a-phase-only-after** — Re-review a phase only after Critical or High findings
- **BL-260927-derive-current-lifecycle-state** — Derive current lifecycle state from one authority for review, phase, and publication status

**Total estimated effort:** High
**Cross-lane dependencies:** Lane 2's review-artifact work shares the PRFINAL-05
ledger guard; `BL-260706-front-load-recurring-gate` (Front-load recurring
gate-finding classes into implementer briefs) consumes the exhaustion contract.

### Lane 2: Review artifacts and gate policy

Where review files live and how gates report.

```text
verify-local-scope-lifecycle - -▶ gitignore-project-review ◀─▶ persist-separate-review ─▶ list-pending-required-reviews
offer-a-strict-gate-reviewer   give-gate-receipts-portable ─▶ report-gate-project-log
```

**Items in this lane:**

- **BL-261002-verify-local-scope-lifecycle** — Verify local-scope lifecycle commits and empty HiLL phase defaults
- **BL-261002-gitignore-project-review** — Gitignore project review artifacts instead of committing them
- **BL-261003-persist-separate-review** — Persist separate review artifacts and validate plain-file ledger references
- **BL-261002-list-pending-required-reviews** — List pending required reviews when a project reaches a pull request
- **BL-261002-offer-a-strict-gate-reviewer** — Offer a strict gate-reviewer independence mode and align gate skill wording and decision records
- **BL-260927-give-gate-receipts-portable** — Give gate receipts portable ownership, path-neutral identities, and a shipped ignore rule
- **BL-261030-report-gate-project-log** — Report gate project-log finalization in the terminal JSON envelope

**Total estimated effort:** High
**Cross-lane dependencies:** Lane 1 (bind-each-gate-review feeds
list-pending-required-reviews).

### Lane 3: Planning guardrails and lifecycle prose

Adopter-facing fixes in the planning and implement skills.

```text
make-documentation-aware - -▶ wire-bounded-durable-reference - -▶ integrate-recon-with-oat
warn-when-the-default-branch   add-an-explicit-plan-approval   reconcile-oat-tracking-commit
align-implement-complete   detect-unfilled-placeholders   project-document-should-prompt
```

**Items in this lane:**

- **BL-260830-make-documentation-aware** — Make the knowledge index optional by default for discovery and planning
- **BL-261002-warn-when-the-default-branch** — Warn when the default branch has changed planned paths since the branch base
- **BL-261002-add-an-explicit-plan-approval** — Add an explicit plan-approval step to quick and spec-driven projects
- **BL-261003-reconcile-oat-tracking-commit** — Reconcile OAT tracking commit cadence with resumable phase/group batching
- **BL-261002-align-implement-complete** — Align implement, complete, and pr-final skill contracts with their actual behavior
- **BL-260927-detect-unfilled-placeholders** — Detect unfilled placeholders and frontmatter-body drift at PR-final and completion
- **BL-260903-project-document-should-prompt** — project-document should prompt a re-run when review fixes change a shipped contract
- **BL-261002-fix-project-planning-skill** — Fix project planning skill handoffs and inputs across discover, spec, promote, split, and plan
- **BL-260830-wire-bounded-durable-reference** — Wire bounded durable-reference reads into lifecycle skills

**Total estimated effort:** Medium per item; High in aggregate
**Cross-lane dependencies:** shares skill files with lane 1's receive changes;
sequence, do not parallelize, on `oat-project-implement`.

### Lane 4: Config, sync, and dispatch policy

One `oat-config.ts` and config-catalog cluster plus provider sync.

```text
clean-up-stale-provider-views   stop-oat-sync-from-changing
make-the-copy-sync-strategy ─▶ fix-oat-config-describe-gaps ◀─ settle-dispatch-policy
validate-cursor-pin-effort
```

**Items in this lane:**

- **BL-261002-clean-up-stale-provider-views** — Clean up stale provider views and Codex entries when a canonical agent is deleted or renamed
- **BL-261002-stop-oat-sync-from-changing** — Stop oat sync from changing user values in .codex/config.toml
- **BL-261002-make-the-copy-sync-strategy** — Make the copy sync strategy checkout-independent and settable from the CLI
- **BL-261002-fix-oat-config-describe-gaps** — Fix oat config describe gaps and make config unset reach the layer that holds the key
- **BL-261002-settle-dispatch-policy** — Settle dispatch policy precedence and stop legacy presets overwriting ladder columns
- **BL-260726-validate-cursor-pin-effort** — Validate Cursor pin effort rungs at sync time

**Total estimated effort:** Medium
**Cross-lane dependencies:** none beyond `config/index.ts` ownership.

### Lane 5: CLI surfaces and install scope

```text
honor-the-requested-scope - -▶ provide-a-complete-oat (split the quick fixes out first)
correct-misleading-init-status   commit-paths-should-accept   surface-config-warnings
```

**Items in this lane:**

- **BL-261002-honor-the-requested-scope** — Honor the requested scope for every pack in tools install and init --setup
- **BL-261002-correct-misleading-init-status** — Correct misleading init, status, and doctor messages and stop scripts from defaulting to user-scope sync
- **BL-261012-commit-paths-should-accept** — commit-paths should accept tracked files under ignored directories
- **BL-260909-surface-config-warnings** — Surface config warnings on every reader path and document the warnings field
- **BL-261002-provide-a-complete-oat** — Provide a complete OAT uninstall path and make pack removal clean up after itself

**Total estimated effort:** Medium
**Cross-lane dependencies:** `surface-config-warnings` touches config readers
shared with lane 4.

### Lane 6: Docs consumer rollout

```text
make-oat-docs-generators ─▶ close-docs-skill-workflow-gaps ─▶ roll-out-the-shipped-oat-docs
tighten-oat-docs-check-rules ─────────────────────────────────▶ roll-out-the-shipped-oat-docs
```

**Items in this lane:**

- **BL-261025-make-oat-docs-generators** — Make OAT docs generators and writers predictable
- **BL-261025-close-docs-skill-workflow-gaps** — Close docs skill workflow gaps found in the consumer rollout
- **BL-261025-tighten-oat-docs-check-rules** — Tighten oat docs check rules and diagnostics
- **BL-261024-roll-out-the-shipped-oat-docs** — Roll out the shipped OAT docs front door and approval policy to consumer repositories

**Total estimated effort:** High (consumer rollout needs owner authorization)
**Cross-lane dependencies:** none; disjoint from lifecycle skills.

### Lane 7: Contract-test and CI hygiene

**Items in this lane:**

- **BL-260906-make-the-dispatch-stamp** — Make the dispatch-stamp contract helper reject bold-step boundaries and normal-path shim permissions
- **BL-260906-make-the-phase-implementer** — Make the phase-implementer sweep contract test negation-aware
- **BL-260909-make-findsection-comment-aware** — Make findSection comment-aware in the bundled-docs contract test
- **BL-260909-add-a-grep-by-shape-control** — Add a grep-by-shape control for own-key sweeps keyed to variable names
- **BL-260909-wave-7-review-polish-leftovers** — Wave-7 review polish leftovers
- **BL-261011-validate-skill-bumps-against** — Validate skill bumps against a stacked PR's base branch, not only origin/main
- **BL-261011-clean-up-the-isolated-home** — Clean up the isolated HOME directories that evidence-grade test runs leave under TMPDIR
- **BL-260907-type-check-cli-test-files** — Type-check CLI test files with a test-scoped tsconfig gate

**Total estimated effort:** Medium in aggregate
**Cross-lane dependencies:** `validation/skills*.ts` and the shared contract
tests collide with any skill-prose lane that edits pinned sentences.

### Lane 8: Goal and brief polish

**Items in this lane:**

- **BL-261011-re-project-oat-pr-status-from** — Re-project oat_pr_status from goal delivery observations at terminal closeout
- **BL-261011-guard-goal-brief-amendments** — Guard goal brief amendments against an open delivery head branch
- **BL-261011-persist-pre-registration** — Persist pre-registration review staleness for goal milestones
- **BL-261011-route-a-standalone-out** — Route a standalone Out of Scope brief section into discovery on promotion

**Total estimated effort:** Low to Medium
**Cross-lane dependencies:** none.

---

## 5. Recommended Execution Order

### Wave 0 — Reconciliation pass (bookkeeping, no code)

Do this before anything else: section 6 lists the closes, text narrowing,
trigger revisits, and roadmap rewrite. It is a single PR touching only
`.oat/repo/`.

### Wave 1 — Confirmed breakage and adoption-facing correctness

| Order | Item                                                                                                                                                    | Effort | Rationale                                                                                                 |
| ----- | ------------------------------------------------------------------------------------------------------------------------------------------------------- | ------ | --------------------------------------------------------------------------------------------------------- |
| 1a    | **BL-261002-clean-up-stale-provider-views** — Clean up stale provider views and Codex entries when a canonical agent is deleted or renamed              | Medium | An agent rename breaks `oat sync` and `oat status` for the whole team.                                    |
| 1b    | **BL-261002-stop-oat-sync-from-changing** — Stop oat sync from changing user values in .codex/config.toml                                               | Low    | Sync silently reverses an explicit user choice on every run; #389 kept comments but not user values.      |
| 1c    | **BL-261002-honor-the-requested-scope** — Honor the requested scope for every pack in tools install and init --setup                                    | Medium | Writes into HOME or the repository against the user's requested scope.                                    |
| 1d    | **BL-261002-correct-misleading-init-status** — Correct misleading init, status, and doctor messages and stop scripts from defaulting to user-scope sync | Low    | Messages teach commands that write into HOME or only work in this repository.                             |
| 1e    | **BL-261002-align-implement-complete** — Align implement, complete, and pr-final skill contracts with their actual behavior                             | Low    | Hardcoded `--base main` opens wrong-base PRs outside `main` repositories.                                 |
| 1f    | **BL-261012-commit-paths-should-accept** — commit-paths should accept tracked files under ignored directories                                           | Low    | Lifecycle commits fall back to `git add -f`; re-verify the mechanism first (the item's example is stale). |
| 1g    | **BL-261011-clean-up-the-isolated-home** — Clean up the isolated HOME directories that evidence-grade test runs leave under TMPDIR                      | Low    | Observed 3.3 GB disk exhaustion from the AGENTS.md evidence-grade test recipe.                            |

**Parallelism:** 1a and 1b share Codex sync code (one lane); 1c and 1d share
init (one lane); 1e is skill prose; 1f and 1g are independent. Four lanes.

### Wave 2 — Planning guardrails and receive classification

| Order | Item                                                                                                                      | Effort | Rationale                                                                                                        |
| ----- | ------------------------------------------------------------------------------------------------------------------------- | ------ | ---------------------------------------------------------------------------------------------------------------- |
| 2a    | **BL-260830-make-documentation-aware** — Make the knowledge index optional by default for discovery and planning          | Medium | Operator-reframed 2026-10-31; removes a blocking prerequisite from every planning entry point and resolves #205. |
| 2b    | **BL-261002-warn-when-the-default-branch** — Warn when the default branch has changed planned paths since the branch base | Medium | Ships the root AGENTS.md manual rule to users; it would have saved about 2.5 hours of discarded work.            |
| 2c    | **BL-261002-add-an-explicit-plan-approval** — Add an explicit plan-approval step to quick and spec-driven projects        | Medium | Adopters expect plan approval before code; the checkpoint mechanism already exists.                              |
| 2d    | **BL-261003-reconcile-oat-tracking-commit** — Reconcile OAT tracking commit cadence with resumable phase/group batching   | Medium | Every implement run reads two contradictory MUSTs.                                                               |
| 2e    | **BL-261013-classify-review-findings** — Classify review findings against the contract at every receive                   | Medium | Builds the AGENTS.md lesson (about 570 lines of rework) into the receive skills.                                 |

**Parallelism:** 2a touches discover, quick-start, brief, and goal; 2b and 2c
touch quick-start and plan; 2d touches implement; 2e touches receive. Run 2a,
2d, and 2e in parallel, then 2b and 2c together.

### Wave 3 — Receipt identity (first `review-gate-integrity` milestone)

| Order | Item                                                                                                                                          | Effort | Rationale                                                                                        |
| ----- | --------------------------------------------------------------------------------------------------------------------------------------------- | ------ | ------------------------------------------------------------------------------------------------ |
| 3a    | **BL-260820-emit-source-qualified** — Emit source-qualified provenance envelopes for review and gate receipts                                 | Medium | The identity layer every later receipt item needs; dispatch records already provide the pattern. |
| 3b    | **BL-260820-bind-each-gate-review** — Bind each gate review disposition to its exact received ledger event                                    | Medium | Stale received events and duplicate rows block closeout in real runs.                            |
| 3c    | **BL-260927-mark-gate-findings-as-new-or** — Mark gate findings as new or carried over between attempts                                       | Medium | Distinguishes a converging gate from a stuck one; unblocks the cap-decision umbrella.            |
| 3d    | **BL-261002-offer-a-strict-gate-reviewer** — Offer a strict gate-reviewer independence mode and align gate skill wording and decision records | Medium | Planning can currently pass with no review under `onFailure: warn`.                              |
| 3e    | **BL-261002-list-pending-required-reviews** — List pending required reviews when a project reaches a pull request                             | Low    | Closes an observed pr_open-with-five-pending-reviews gap.                                        |

**Parallelism:** 3a then 3b are sequential (shared gate code); 3c follows 3b;
3d and 3e can run beside 3a.

### Wave 4 — Config and dispatch policy

| Order | Item                                                                                                                               | Effort | Rationale                                                                |
| ----- | ---------------------------------------------------------------------------------------------------------------------------------- | ------ | ------------------------------------------------------------------------ |
| 4a    | **BL-261002-settle-dispatch-policy** — Settle dispatch policy precedence and stop legacy presets overwriting ladder columns        | Medium | Config silently overrides the planned dispatch policy.                   |
| 4b    | **BL-261002-make-the-copy-sync-strategy** — Make the copy sync strategy checkout-independent and settable from the CLI             | Medium | The documented choice for symlink-hostile teams churns across checkouts. |
| 4c    | **BL-261002-fix-oat-config-describe-gaps** — Fix oat config describe gaps and make config unset reach the layer that holds the key | Low    | Land after 4b so the owner command it names exists.                      |
| 4d    | **BL-260726-validate-cursor-pin-effort** — Validate Cursor pin effort rungs at sync time                                           | Low    | Turns silent wrong-model Cursor dispatch into a hard error.              |

**Parallelism:** 4a and 4b in parallel; 4c after both; 4d independent.

### Wave 5 — Docs rollout quick wins, then the rollout

| Order | Item                                                                                                                                | Effort          | Rationale                                                        |
| ----- | ----------------------------------------------------------------------------------------------------------------------------------- | --------------- | ---------------------------------------------------------------- |
| 5a    | **BL-261025-make-oat-docs-generators** — Make OAT docs generators and writers predictable                                           | Medium (carved) | Ship the `generate-index --check` and stdout slice first.        |
| 5b    | **BL-261025-tighten-oat-docs-check-rules** — Tighten oat docs check rules and diagnostics                                           | Medium          | Local rule fixes with boundary tests.                            |
| 5c    | **BL-261025-close-docs-skill-workflow-gaps** — Close docs skill workflow gaps found in the consumer rollout                         | High            | Eight adopter-facing gaps that hit every consumer.               |
| 5d    | **BL-261024-roll-out-the-shipped-oat-docs** — Roll out the shipped OAT docs front door and approval policy to consumer repositories | High            | External completion of #367; needs consumer owner authorization. |

**Parallelism:** 5a and 5b in parallel; 5c after 5a; 5d last.

### Wave 6 — Fill-in sweep

Slot these into gaps as single-lane PRs:

- **Contract-test and CI hygiene** (lane 7, one PR).
- **Goal and brief polish** (lane 8, one PR). `BL-261011-re-project-oat-pr-status-from`
  (Re-project oat_pr_status from goal delivery observations at terminal closeout)
  reproduced in the 2026-10-31 closeout of a quick project: `oat_pr_status`
  still read `open` after merge and had to be corrected by hand before
  `oat-project-complete`.
- **Artifact-cleanup leftovers** once they have real acceptance criteria:
  `BL-261012-oat-wave-execute-writes-into` (oat-wave-execute writes into the
  roll-up-owned Workflow Observations section), `BL-261012-wrap-up-pr-cross-reference`
  (Wrap-up PR cross-reference without a pr/ directory),
  `BL-261012-archive-metadata-reads-map` (Archive metadata reads map EACCES to
  a missing file), `BL-261012-complete-state-json-refusals` (complete-state
  --json refusals carry structured reason codes).
- **Explainer and docs fixes:** `BL-261002-make-explainer-kit-accept-or`
  (Make explainer-kit accept or reject source-code inputs explicitly),
  `BL-260909-re-source-the-surviving-codex` (Re-source the surviving Codex
  provider claims and repair the dead provider-reference URLs).
- **Remote planning caps:** `BL-261002-enforce-remote-planning` (Enforce remote
  planning approval caps, storage scope, and binding locations) is rated a
  Quick Win but needs negative controls; give it its own PR.

### Strategic projects (outside the wave cadence)

| Item                                                                                                                                       | Recommended mode                             | Note                                                                                                                                                      |
| ------------------------------------------------------------------------------------------------------------------------------------------ | -------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **BL-260729-implement-reviewplan-first** — Implement ReviewPlan-first reviewer workflow                                                    | Spec-driven                                  | Decide PR [#190](https://github.com/voxmedia/open-agent-toolkit/pull/190)'s fate first: rebase and finish, or close and restart as a spec-driven project. |
| **BL-260711-skip-re-review-for-bookkeeping** — Skip re-review for bookkeeping-only review findings                                         | Spec-driven (inside `review-gate-integrity`) | The only `urgent` item; second milestone after Wave 3's identity layer.                                                                                   |
| **BL-260906-harden-dispatch-launch** — Harden dispatch launch baselines and terminal reconciliation                                        | Quick with design                            | Two open dispatch-integrity defects (#265, #266); the parked wave-7 p16 patch is the starting point.                                                      |
| **BL-261002-gitignore-project-review** — Gitignore project review artifacts instead of committing them                                     | Quick with design                            | Design with lane 2's ledger-guard items, or the PRFINAL-05 rule breaks.                                                                                   |
| **BL-260927-derive-current-lifecycle-state** — Derive current lifecycle state from one authority for review, phase, and publication status | Spec-driven                                  | Root of the stale-status cluster; #365 delivered the journal half.                                                                                        |
| **BL-260906-re-evaluate-universal-plan** — Re-evaluate universal plan proof strategy and test-first guidance                               | Decision first                               | Lite is settled (`DR-260906-use-proportionate-proof`); implement still says "TDD discipline".                                                             |
| **BL-260706-front-load-recurring-gate** — Front-load recurring gate-finding classes into implementer briefs                                | Quick                                        | Strong field evidence; consumes the exhaustion contract from lane 1.                                                                                      |

### Deferred

| Item                                                                                                                                     | Rationale                                                                                   |
| ---------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------- |
| **BL-260711-add-root-owned-dispatch-broker** — Add root-owned dispatch broker for exact OAT subagent launches                            | Phase-direct implementers removed its premise; candidate to close.                          |
| **BL-260724-support-provider-directory** — Support provider directory symlinks as full collection sync                                   | Blocked on a symlinkat-class primitive Node does not expose.                                |
| **BL-260718-add-oat-wave-lifecycle-cli** — Add oat wave lifecycle CLI command family                                                     | L-sized and trigger-gated; do the execution-program contract first.                         |
| **BL-260904-make-quick-the-default-oat** — Make quick the default OAT workflow mode and spec-driven the explicit larger mode             | Needs a mode-default decision now that lite, brief, and goal exist; the item text is stale. |
| **BL-261002-provide-a-complete-oat** — Provide a complete OAT uninstall path and make pack removal clean up after itself                 | Split out the `remove --all` scope error and stale `tools.requiredBy` first.                |
| **BL-261002-let-plans-declare-an-evidence** — Let plans declare an evidence tier per phase and reconcile tracking on driver takeover     | L-sized; move its driver-takeover half into BL-261003-reconcile-oat-tracking-commit.        |
| **BL-261003-reassess-lite-execution-scope** — Reassess Lite execution scope and preserve completed work on promotion                     | Large conservation contract without repeated demand.                                        |
| **BL-260912-evaluate-replacing-explainer** — Evaluate replacing Explainer Kit authoring guidance with a pinned Effective HTML subset     | Evaluation with no shipped change by design.                                                |
| **BL-260728-additional-visual-workflows** — Additional visual workflows                                                                  | Dependencies cleared but no recorded demand.                                                |
| **BL-260830-integrate-recon-across** — Integrate recon across analysis and research workflows                                            | Follows the narrower recon setup and lifecycle integration.                                 |
| **BL-260909-use-handle-bound-traversal** — Use handle-bound traversal in the managed-copy and manifest filesystem readers                | Needs a Node `openat` walk; low exploitability.                                             |
| **BL-260909-restamp-a-stale-copy-strategy** — Restamp a stale copy-strategy contentHash on skip and retire the pre-framing digest bridge | Only bridge removal remains, gated on field installs restamping.                            |
| **BL-261005-resolve-deferred-wave-5** — Resolve deferred Wave 5 maintenance edge cases                                                   | Seven unrelated edge cases with no observed failures.                                       |
| **BL-260830-re-evaluate-same-target-gate** — Re-evaluate same-target gate execution                                                      | V2 speculation against an accepted deferral; candidate to close.                            |
| Remaining Avoid / Defer items in section 2                                                                                               | Trigger-gated, speculative, or decision-gated; revisit when their trigger fires.            |

---

## 6. Reconciliation and housekeeping

### Close (reconcile) — complete or superseded

| Item                                                                                                                                            | Evidence                                                                                                       | Action                                                                      |
| ----------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------- |
| **BL-260708-verify-cursor-gpt-5-6-subagent** — Verify Cursor GPT-5.6 subagent model slugs                                                       | Pins live-probed and approved in `734bf4189`; shipped in `packages/cli/src/providers/cursor/codec/catalog.ts`. | Archive as completed.                                                       |
| **BL-260827-refresh-provider-codex-md** — Refresh provider-codex.md for the ultra effort tier, the GPT-5.4 retirement, and per-subcommand flags | Superseded by #315, #317, and #334 (`guidance_version: 2026-10-01`); only an exec-resume flag note remains.    | Archive as superseded; carry the note into the next model-guidance refresh. |
| **BL-260830-add-per-claude-md-adoption-opt** — Add per-CLAUDE.md adoption opt-out for instruction sync                                          | Per-path `instructions.claude.excludes` shared by sync and validate (#332, #356).                              | Archive as completed unless per-file granularity is wanted.                 |

### Close candidates — accepted residue or lost premise

- **BL-260711-add-root-owned-dispatch-broker** — Add root-owned dispatch broker for exact OAT subagent launches (premise removed by phase-direct implementers).
- **BL-260903-close-claude-runtime-lineage** — Close Claude runtime lineage depth and unverified provider shapes (placeholder criteria; "reopen only if it recurs").
- **BL-260903-retire-deprecated-pack** — Retire deprecated pack placement and dead evidence diagnostics (placeholder criteria; "reopen only on real confusion").
- **BL-261012-rename-the-project-retro** — Rename the project retro to retro.md (the item's own text discourages the rename).
- **BL-260830-re-evaluate-same-target-gate** — Re-evaluate same-target gate execution (speculative against an accepted deferral).

### Partial — keep open, narrow the item text

| Item                                                                                                                                       | What landed                                                         | What remains                                       |
| ------------------------------------------------------------------------------------------------------------------------------------------ | ------------------------------------------------------------------- | -------------------------------------------------- |
| **BL-260711-add-activity-aware-gate** — Add activity-aware gate timeouts                                                                   | Hard budgets, liveness, recovery (0.1.72); 30-minute default (#351) | Idle kill after Codex activity attribution         |
| **BL-260719-add-pinned-recon-agents** — Add pinned recon agents for reusable orchestration                                                 | `recon-worker` role (#248, #285, #302)                              | A generic pinned role outside recon                |
| **BL-260726-validate-cursor-pin-effort** — Validate Cursor pin effort rungs at sync time                                                   | Probe-record consistency (#178)                                     | Family-aware rung validation                       |
| **BL-260818-distinguish-operator-directed** — Design the budget-exhausted decision point for reviews and gates review-cycle cap            | Complexity review and `simplify` (#351)                             | Shared authorization record and three dispositions |
| **BL-260820-track-pr-closeout-evidence** — Track PR-closeout evidence freshness against the current head                                   | Exit-gate effective-delta freshness (#164)                          | Other closeout receipts                            |
| **BL-260830-add-remote-review-respond** — Add remote review respond and summarize skill set                                                | Approval-gated replies in `oat-review-receive-remote`               | The summarize skill                                |
| **BL-260906-re-evaluate-universal-plan** — Re-evaluate universal plan proof strategy and test-first guidance                               | `DR-260906-use-proportionate-proof` for Lite                        | Every other mode                                   |
| **BL-260909-show-the-brainstorm-pack** — Show the brainstorm pack in the oat-doctor dashboard example and pack enumeration                 | oat-doctor 2.0 dropped the hardcoded list (#300)                    | Example table and status rule                      |
| **BL-260927-derive-current-lifecycle-state** — Derive current lifecycle state from one authority for review, phase, and publication status | `state.md` owns gate transitions; journal check (#365)              | Review, phase, publication authority               |
| **BL-260927-detect-unfilled-placeholders** — Detect unfilled placeholders and frontmatter-body drift at PR-final and completion            | Journal check refuses placeholders at completion (#365)             | Run it at pr-final; `state.md` body                |
| **BL-260927-give-gate-receipts-portable** — Give gate receipts portable ownership, path-neutral identities, and a shipped ignore rule      | Unignored-receipt warning (#275)                                    | Shipped ignore rule; path-neutral `worktreeRoot`   |
| **BL-261002-fix-brainstorm-and-pjm** — Fix brainstorm and PJM template contract gaps for lite mode and archive-dated                       | Lite routing (#361)                                                 | `--archive-dated` hint; lite in handoff templates  |
| **BL-261002-theme-mermaid-diagrams** — Theme Mermaid diagrams and keep them readable on phones                                             | Palette (#382); zoom (#350)                                         | Narrow-screen readability                          |
| **BL-261013-classify-review-findings** — Classify review findings against the contract at every receive                                    | AGENTS.md rule (`13a851b73`)                                        | Classification in the receive skills               |
| **BL-261024-roll-out-the-shipped-oat-docs** — Roll out the shipped OAT docs front door and approval policy to consumer repositories        | Four consumer surfaces conformed (#378, #379)                       | All eight acceptance checkboxes                    |
| **BL-260724-support-provider-directory**, **BL-260711-add-root-owned-dispatch-broker**, **BL-260909-restamp-a-stale-copy-strategy**        | See Deferred                                                        | —                                                  |

### Triggers that have fired — revisit now

- **BL-260718-document-execution-program** — Document execution-program artifact as stable OAT contract (second consumer shipped in #161).
- **BL-260719-evaluate-broader-final-gate** — Evaluate broader final-gate freshness policy after narrow optimization (narrow optimization shipped in #164).
- **BL-260728-additional-visual-workflows** — Additional visual workflows (all four golden-recovery dependencies archived).
- **BL-261001-record-mixed-native-and-cli** — Record mixed native and CLI recon continuations in the manifest (BL-261001-recover-recon-lanes-after archived).
- **BL-260908-remove-the-top-level-skill** — Remove the top-level skill version read after the alias error has been quiet (the alias error has shipped since #286).

### Stale item text

- Ten `BL-261002-*` docs-overhaul follow-ups cite the `docs-overhaul-readme-visual`
  branch, which merged in #342; their acceptance criteria should name
  `apps/oat-docs/docs/` paths on `main`.
- Placeholder `{Outcome 1}` acceptance criteria remain on
  `BL-260827-span-based-prose-guards`, `BL-260903-project-document-should-prompt`,
  `BL-260909-use-handle-bound-traversal`, `BL-261012-archive-metadata-reads-map`,
  `BL-261012-regenerate-the-archive-aware`, and `BL-261012-wrap-up-pr-cross-reference`
  (titles in the section 3 legend). `BL-260911-support-per-tool-scope` has a
  duplicate acceptance section.
- `BL-261012-commit-paths-should-accept` cites `public-package-versions.json`,
  which is no longer ignored; the real case is tracked `packages/cli/assets/templates/*`.
- `BL-261011-validate-skill-bumps-against`'s first criterion already holds
  (`--base-ref` since #22).
- `BL-260904-make-quick-the-default-oat` still calls lite "planned".
- Root `AGENTS.md` says hook-modified files are tracked by
  `BL-260927-share-one-hook-safe-exact-path`, which is archived.

### Suggested priority changes

| Item                                                                                                                                                    | Current | Suggested      | Why                                                                             |
| ------------------------------------------------------------------------------------------------------------------------------------------------------- | ------- | -------------- | ------------------------------------------------------------------------------- |
| **BL-260830-make-documentation-aware** — Make the knowledge index optional by default for discovery and planning                                        | medium  | high           | Blocks docs-free repositories at every planning entry point; operator-reframed. |
| **BL-261013-classify-review-findings** — Classify review findings against the contract at every receive                                                 | medium  | high           | Durable form of a costly lesson.                                                |
| **BL-261003-reconcile-oat-tracking-commit** — Reconcile OAT tracking commit cadence with resumable phase/group batching                                 | medium  | high           | Self-contradiction on every implement run.                                      |
| **BL-261002-correct-misleading-init-status** — Correct misleading init, status, and doctor messages and stop scripts from defaulting to user-scope sync | low     | medium         | Teaches HOME-writing syncs to adopters.                                         |
| **BL-260927-derive-current-lifecycle-state** — Derive current lifecycle state from one authority for review, phase, and publication status              | medium  | high           | Root of the stale-status cycles.                                                |
| **BL-260711-add-root-owned-dispatch-broker** — Add root-owned dispatch broker for exact OAT subagent launches                                           | high    | low (or close) | Premise removed.                                                                |
| **BL-260718-add-oat-wave-lifecycle-cli** — Add oat wave lifecycle CLI command family                                                                    | high    | medium         | Trigger-gated.                                                                  |
| **BL-260724-support-provider-directory** — Support provider directory symlinks as full collection sync                                                  | high    | low            | Platform-blocked.                                                               |
| **BL-260830-re-evaluate-same-target-gate** — Re-evaluate same-target gate execution                                                                     | medium  | low (or close) | Speculative.                                                                    |
| **BL-260909-restamp-a-stale-copy-strategy** — Restamp a stale copy-strategy contentHash on skip and retire the pre-framing digest bridge                | medium  | low            | Only a gated bridge removal remains.                                            |

### Consolidations

- **Review artifacts:** `BL-261002-gitignore-project-review`, `BL-261003-persist-separate-review`,
  and `BL-261002-list-pending-required-reviews` share the PRFINAL-05 guard; design together.
- **Complexity review:** ship `BL-261002-port-the-complexity-review` (Port the
  complexity-review skill into an OAT pack) before or with
  `BL-261002-wire-the-complexity-review` (Wire the complexity review into the
  sibling gate-capable skills), so the wiring does not vendor the fallback into
  five more skills.
- **Discovery prerequisites:** `BL-260830-make-documentation-aware` and
  `BL-260830-wire-bounded-durable-reference` (Wire bounded durable-reference
  reads into lifecycle skills) should share one prerequisite-policy section.
- **Tool-pack truthfulness:** `BL-260903-retire-deprecated-pack` and
  `BL-260908-align-the-provider-view-json` (Align the provider-view JSON,
  evidence states, and docs with the human row) touch the same surfaces.
- **Wave tooling:** `BL-260718-document-execution-program`, then
  `BL-260718-add-oat-wave-lifecycle-cli`, then `BL-260718-rewrite-worktree-bootstrap`
  (Rewrite worktree bootstrap-group as tested TypeScript command), contract first.
- **Recon:** `BL-261001-make-recon-controller-setup` (Make recon controller
  setup and preflight self-serve), then `BL-260830-integrate-recon-with-oat`
  (Integrate recon with OAT discovery and quick start), then
  `BL-260830-integrate-recon-across`.

---

## 7. Roadmap Alignment

### How backlog items map to roadmap phases

| Roadmap Phase                                    | Status  | Backlog Items                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                        | Notes                                                                                                                                                                                                                                                                                                                 |
| ------------------------------------------------ | ------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Now                                              | Stale   | **BL-260708-verify-cursor-gpt-5-6-subagent** — Verify Cursor GPT-5.6 subagent model slugs; **BL-260711-add-root-owned-dispatch-broker** — Add root-owned dispatch broker for exact OAT subagent launches; **BL-260711-add-activity-aware-gate** — Add activity-aware gate timeouts; **BL-260729-implement-reviewplan-first** — Implement ReviewPlan-first reviewer workflow; **BL-260711-skip-re-review-for-bookkeeping** — Skip re-review for bookkeeping-only review findings; **BL-261024-roll-out-the-shipped-oat-docs** — Roll out the shipped OAT docs front door and approval policy to consumer repositories | `artifact-cleanup` is listed with PR #365 "open"; it merged. `BL-260829-make-tool-pack-scope-selection` is archived. The 2026-08-31 execution program is complete. BL-260708 is done; the broker is a close candidate.                                                                                                |
| Next                                             | Stale   | **BL-260724-support-provider-directory** — Support provider directory symlinks as full collection sync; **BL-260820-bind-each-gate-review** — Bind each gate review disposition to its exact received ledger event; **BL-260820-emit-source-qualified** — Emit source-qualified provenance envelopes for review and gate receipts; wave-workflow trio; **BL-260912-evaluate-replacing-explainer** — Evaluate replacing Explainer Kit authoring guidance with a pinned Effective HTML subset                                                                                                                          | Five Next items are archived: `BL-260828-add-project-level-oat-guidance`, `BL-260806-fail-closed-when-configured`, `BL-260718-mandatory-skill-load-clause`, `BL-260712-per-project-override`, and (via Now) `BL-260829-make-tool-pack-scope-selection`. The provider-directory item is platform-blocked.              |
| Later                                            | Current | **BL-260706-front-load-recurring-gate** — Front-load recurring gate-finding classes into implementer briefs; **BL-260719-add-pinned-recon-agents** — Add pinned recon agents for reusable orchestration; **BL-260728-additional-visual-workflows** — Additional visual workflows                                                                                                                                                                                                                                                                                                                                     | BL-260706 deserves promotion to Next on its field evidence.                                                                                                                                                                                                                                                           |
| Sequencing map and project grouping (2026-08-30) | Stale   | —                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                    | The tree names archived items (`BL-260829-order-phase-bookkeeping-before`, `BL-260806-*`, `BL-260720-add-oat-project-complete-auto`, `BL-260718-harden-full-surface-gate`, `BL-260826-populate-native-subagent`, `BL-260827-correct-scope-and-adoption`) and completed projects. Replace it with this review's waves. |

### Gaps: Roadmap items without backlog coverage

| Roadmap Item                                     | Phase      | Recommendation                                                         |
| ------------------------------------------------ | ---------- | ---------------------------------------------------------------------- |
| `artifact-cleanup` project                       | Now        | Shipped (#365); move to history and drop from Now.                     |
| 2026-08-31 execution program                     | Now        | Complete; move to history.                                             |
| `tool-pack-scope-provider-truthfulness` umbrella | Now / Next | Its owning items are archived; drop the umbrella or name what remains. |

### Orphans: Backlog items not on the roadmap

Most of the 142 items are not on the roadmap, which is expected for fill-in
work. These high-value orphans should be placed:

| Backlog Item                                                                                                                               | Recommendation                                |
| ------------------------------------------------------------------------------------------------------------------------------------------ | --------------------------------------------- |
| **BL-260830-make-documentation-aware** — Make the knowledge index optional by default for discovery and planning                           | Add to Next (Wave 2).                         |
| **BL-261002-clean-up-stale-provider-views** — Clean up stale provider views and Codex entries when a canonical agent is deleted or renamed | Add to Now (Wave 1).                          |
| **BL-261002-honor-the-requested-scope** — Honor the requested scope for every pack in tools install and init --setup                       | Add to Now (Wave 1).                          |
| **BL-261002-warn-when-the-default-branch** — Warn when the default branch has changed planned paths since the branch base                  | Add to Next (Wave 2).                         |
| **BL-261002-add-an-explicit-plan-approval** — Add an explicit plan-approval step to quick and spec-driven projects                         | Add to Next (Wave 2).                         |
| **BL-260906-harden-dispatch-launch** — Harden dispatch launch baselines and terminal reconciliation                                        | Add to Next as its own project.               |
| **BL-261002-gitignore-project-review** — Gitignore project review artifacts instead of committing them                                     | Add to Next with the review-artifact cluster. |
| **BL-260927-derive-current-lifecycle-state** — Derive current lifecycle state from one authority for review, phase, and publication status | Add to Later under `review-gate-integrity`.   |
| **BL-261025-close-docs-skill-workflow-gaps** — Close docs skill workflow gaps found in the consumer rollout                                | Group with BL-261024 in Now.                  |
| **BL-261002-enforce-remote-planning** — Enforce remote planning approval caps, storage scope, and binding locations                        | Add to Next.                                  |

---

## 8. Observations & Recommendations

### Strategic observations

1. **The backlog grew even while shipping fast.** `completed.md` records 76
   completions since 2026-09-26, yet the active count rose from 114 to 142.
   Most new filings are small, verified adopter-facing defects, so the backlog
   is healthier than its size suggests, but a regular fill-in cadence (one
   hygiene PR per wave) is needed to keep it from growing.
2. **The roadmap has stopped being the source of truth.** Its Now and Next
   sections name 11 archived items and two completed programs. Until it is
   rewritten, priority signals come only from this review and item
   frontmatter.
3. **Review/gate integrity is still the largest structural risk**, but its
   identity layer is now small and well-specified. Starting there gives the
   urgent no-re-review item a stable base instead of another ad hoc fix.
4. **Adopter feedback is the highest-value input.** The 2026-10-02 audit and
   the docs consumer rollout produced most of this review's quick wins.

### Risks

| Risk                                                                  | Mitigation                                                                                       |
| --------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------ |
| Skill-prose lanes collide on pinned contract tests and shared skills. | One lane per shared skill per wave; run the skill contract vitest suite on every skill-prose PR. |
| ReviewPlan PR #190 keeps aging and blocks review redesign decisions.  | Decide its fate (finish or close) before Wave 3 starts.                                          |
| Partial items get re-planned from stale text.                         | Narrow the 18 partial items in Wave 0 before anyone picks them up.                               |
| Consumer rollout stalls on owner authorization.                       | Ship the separable generator and check fixes first (Wave 5a and 5b).                             |

### Quick wins to tackle immediately

1. **BL-261002-clean-up-stale-provider-views** — Clean up stale provider views and Codex entries when a canonical agent is deleted or renamed (Medium, unblocks `oat sync` for teams after a rename).
2. **BL-261002-stop-oat-sync-from-changing** — Stop oat sync from changing user values in .codex/config.toml (Low, one merge function and a test).
3. **BL-261002-align-implement-complete** — Align implement, complete, and pr-final skill contracts with their actual behavior (Low, prose fixes including the hardcoded `--base main`).
4. **BL-261011-clean-up-the-isolated-home** — Clean up the isolated HOME directories that evidence-grade test runs leave under TMPDIR (Low, observed disk exhaustion).
5. **BL-260830-make-documentation-aware** — Make the knowledge index optional by default for discovery and planning (Medium, operator-prioritized).
