# Backlog & Roadmap Review

**Date:** 2026-09-26
**Baseline:** branch `wave/2026-09-26-backlog` at `origin/main` `88907ec4c` (CLI
0.3.7)
**Scope:** All 114 active items under `.oat/repo/pjm/backlog/items/`
**Roadmap:** `.oat/repo/pjm/roadmap.md`
**Purpose:** Prioritize by value/effort, surface dependencies, and recommend an
execution sequence

> This review replaces the 2026-08-30 living review; its ratings were not
> carried forward. Per-item values, efforts, and quadrants come from four
> independent read-only rating lanes run against the baseline above (machine-
> local inputs under `.oat/repo/analysis/tackle-2026-09-26/`, columns marked
> **Src** `aa`–`ad`). The execution companion
> [`priority-alignment.md`](./priority-alignment.md) is dated 2026-08-30 and is
> stale relative to this review; refresh it only through the collaborative
> walkthrough.

---

## 1. Executive Summary

The backlog contains **114 active items**, all `open` (priority: 1 urgent, 18
high, 56 medium, 39 low), spanning 8 themes. Quadrant distribution: **22 Quick
Win**, **30 Strategic**, **34 Fill-in**, **26 Avoid / Defer**, **2 Close
(reconcile)**.

| Theme (lane)                                         | Count | Quadrants                                                                 | Key observation                                                                                        |
| ---------------------------------------------------- | ----- | ------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------ |
| A — Review chain and gate integrity                  | 24    | 3 Quick Win, 15 Strategic, 1 Fill-in, 5 Avoid / Defer                     | Project-shaped chain rooted in stale ReviewPlan PR #190; only four bounded carve-outs are wave-ready.  |
| B — Lifecycle skill prose and routing                | 14    | 4 Quick Win, 5 Strategic, 5 Fill-in                                       | Small skill-prose fixes that collide on skill files and pin tests; Wave 1 takes two on disjoint files. |
| C — Dispatch, providers, and recon                   | 16    | 1 Quick Win, 4 Strategic, 6 Fill-in, 4 Avoid / Defer, 1 Close (reconcile) | The dispatch-record fate decision gates launch hardening; three items are complete or superseded.      |
| D — Config and instruction sync                      | 5     | 1 Quick Win, 1 Strategic, 2 Fill-in, 1 Avoid / Defer                      | One `oat-config.ts` file cluster; run one config lane per wave.                                        |
| E — Sync engine, tools, packs, and CLI surfaces      | 20    | 7 Quick Win, 1 Strategic, 8 Fill-in, 4 Avoid / Defer                      | Most parallel-friendly lane; holds the highest-value XS fix (resolve-providers).                       |
| F — Skill validation, contract tests, and CI hygiene | 17    | 4 Quick Win, 2 Strategic, 9 Fill-in, 1 Avoid / Defer, 1 Close (reconcile) | Cheap hardening and CI hygiene; `validation/skills*.ts` is a hidden shared write.                      |
| G — Docs, explainer, wave tooling, and remote review | 12    | 1 Quick Win, 2 Strategic, 2 Fill-in, 7 Avoid / Defer                      | Mostly evaluation- or trigger-gated; docs bootstrap is the high-value item.                            |
| H — Product and policy decisions (human-only)        | 6     | 1 Quick Win, 1 Fill-in, 4 Avoid / Defer                                   | Six human-only calls; the test-only pair unblocks closeout freshness.                                  |

**Top-line recommendations:**

1. Approve and run Wave 1 (Section 5): nine wave-ready items in seven parallel
   lanes, each with clear, verifiable acceptance criteria. The batch is a
   recommendation pending operator approval.
2. Reconcile five items before the next planning pass (Section 6): archive
   **BL-260908-restore-recon-s-cheap-fan-out** — Restore recon's cheap-fan-out
   intent with per-wave routing under one approval envelope (PR #285 merged
   2026-09-12), and close or re-scope four superseded or obsolete items.
3. Keep the review-gate-integrity chain project-shaped. Carve out only the
   bounded slices, run at most one review-chain item per wave, and merge the
   three review-cap items before any of them is planned.
4. Spend operator time on five cheap decisions that unblock implementation: the
   dispatch-record fate, the test-only policy pair, template precedence, the
   review-cap consolidation, and gate-receipt ownership.
5. Refresh `roadmap.md`: its Now and Next sections still list six items that are
   archived or complete, and its 2026-08-30 sequencing map predates the W1–W7
   execution program merges.

---

## 2. Item Catalog

### Rating Key

| Rating     | Value                                                                          | Effort                                                  |
| ---------- | ------------------------------------------------------------------------------ | ------------------------------------------------------- |
| **High**   | Unblocks other items, daily workflow impact, or product milestone prerequisite | > 3 days, high complexity, or touches many files (L/XL) |
| **Medium** | Improves quality/consistency but not blocking                                  | 1-3 days, moderate complexity (M)                       |
| **Low**    | Nice-to-have or future-facing                                                  | < 1 day, straightforward, isolated change (XS/S)        |

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

**Close (reconcile)** marks items with no remaining work; Section 6 lists the
evidence.

### Rating consistency note

The lanes' values and efforts are used unchanged. Their quadrant conventions
differ at the Medium boundary. Lanes `aa` and `ab` call a High-value, bounded
Medium-effort, wave-ready item a Quick Win, and a Medium/Medium item Fill-in.
Lanes `ac` and `ad` call both Strategic, and they call Medium value at High
effort Strategic where `aa` and `ab` call it Avoid / Defer. The affected items
keep their lane quadrant below; Section 7 lists them. Execution order in Section
5 relies on wave-readiness and dependencies, not on quadrant labels alone.

### Lane A — Review chain and gate integrity (24 items)

| Item                                                                                                                                       | Value  | Effort | Quadrant          | Wave-ready (lane)                                                                                                                                | Dependencies / overlaps (lane)                                                                                                                                                                                                                                                                                             | Rationale (lane)                                                                                                                                                                      | Src |
| ------------------------------------------------------------------------------------------------------------------------------------------ | ------ | ------ | ----------------- | ------------------------------------------------------------------------------------------------------------------------------------------------ | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --- |
| **BL-260729-implement-reviewplan-first** — Implement ReviewPlan-first reviewer workflow                                                    | High   | High   | **Strategic**     | no: L, draft PR #190 stale since 2026-09-02, project in discovery                                                                                | root of review-gate-integrity chain (roadmap)                                                                                                                                                                                                                                                                              | Headline review-efficiency redesign; needs reconciliation and dogfooding, not a wave lane.                                                                                            | aa  |
| **BL-260820-bind-each-gate-review** — Bind each gate review disposition to its exact received ledger event                                 | High   | Medium | **Strategic**     | partial: #305 template/upsert slice yes; event binding is project-owned                                                                          | `BL-260927-derive-current-lifecycle-state` (Derive current lifecycle state from one authority for review, phase, and publication status) overlap; review-gate-integrity                                                                                                                                                    | Foundational for the chain; #305 slice (plan-row placeholder, gate target, quick scaffolds) is separable and bounded.                                                                 | aa  |
| **BL-260820-emit-source-qualified** — Emit source-qualified provenance envelopes for review and gate receipts                              | High   | High   | **Strategic**     | no: blocked by event identity; spans every producer family                                                                                       | `BL-260820-bind-each-gate-review` (Bind each gate review disposition to its exact received ledger event); overlaps `BL-260927-give-gate-receipts-portable` (Give gate receipts portable ownership, path-neutral identities, and a shipped ignore rule)                                                                     | Schema + every command family + corroboration; sequenced after event identity.                                                                                                        | aa  |
| **BL-260820-track-pr-closeout-evidence** — Track PR-closeout evidence freshness against the current head                                   | High   | High   | **Strategic**     | no: L, blocked by provenance envelope                                                                                                            | `BL-260820-emit-source-qualified` (Emit source-qualified provenance envelopes for review and gate receipts); `BL-260902-decide-test-only-freshness` (Decide test-only freshness exception for the implement exit gate) (decision)                                                                                          | Needs head-stamped receipts first; bookkeeping-head rule interacts with an undecided freshness policy.                                                                                | aa  |
| **BL-260829-order-phase-bookkeeping-before** — Order phase bookkeeping before per-phase review dispatch                                    | High   | Medium | **Quick Win**     | partial: code/prose yes; AC3 needs real multi-phase run                                                                                          | Precedes `BL-260711-skip-re-review-for-bookkeeping` (Skip re-review for bookkeeping-only review findings); shares review-gate-integrity surfaces                                                                                                                                                                           | Still open: review dispatches before Step 7 bookkeeping (phase-execution.md:683-758, 880). Recurring wasted review rounds; skill-prose change, but AC demands live multi-phase proof. | ab  |
| **BL-260711-skip-re-review-for-bookkeeping** — Skip re-review for bookkeeping-only review findings                                         | High   | High   | **Strategic**     | no: L, spec-driven project (review-gate-integrity, stuck in discovery)                                                                           | sequenced after `BL-260829-order-phase-bookkeeping-before` (Order phase bookkeeping before per-phase review dispatch) and `BL-260820-bind-each-gate-review` (Bind each gate review disposition to its exact received ledger event)                                                                                         | Urgent, clear criteria, but spans review-provide/receive, phase execution, closeout, gates, and CLI classification.                                                                   | aa  |
| **BL-260806-fail-closed-when-configured** — Fail closed when configured closeout snapshot is absent                                        | High   | Medium | **Quick Win**     | yes (CLI guard + closeout/next prose); coordinate with review-gate-integrity                                                                     | roadmap soft-sequences after provenance; no technical dep                                                                                                                                                                                                                                                                  | complete-state has no preconditions; oat-project-next 5.1 only handles an existing incomplete snapshot, not configured-plus-absent.                                                   | aa  |
| **BL-260720-add-oat-project-complete-auto** — Add oat-project-complete-auto companion skill for autonomous closeouts                       | High   | Medium | **Strategic**     | no: blocked by closeout fail-closed/freshness; ACs retain placeholders                                                                           | `BL-260806-fail-closed-when-configured` (Fail closed when configured closeout snapshot is absent), `BL-260820-track-pr-closeout-evidence` (Track PR-closeout evidence freshness against the current head) (roadmap)                                                                                                        | Real gap (wrappers left unarchived); operator guard design recorded, but precondition checks depend on snapshot/freshness work.                                                       | aa  |
| **BL-260718-harden-full-surface-gate** — Harden full-surface gate reviews against budget and recursive dispatch                            | High   | Medium | **Quick Win**     | yes                                                                                                                                              | shares gate/index.ts timeout resolution with `BL-260711-add-activity-aware-gate` (Add activity-aware gate timeouts)                                                                                                                                                                                                        | Artifact reviews still default 900 s (gate/index.ts:965-966); no in-flight/nested gate guard exists. Deterministic tests possible.                                                    | aa  |
| **BL-260711-add-activity-aware-gate** — Add activity-aware gate timeouts                                                                   | High   | Medium | **Strategic**     | partial: idle-kill + distinct outcomes yes; early template write conflicts with ReviewPlan incomplete-artifact rule                              | shares gate/index.ts with harden-full-surface-gate; reconcile with `BL-260729-implement-reviewplan-first` (Implement ReviewPlan-first reviewer workflow)                                                                                                                                                                   | Hard budgets and recovery shipped; idle timer, early artifact, idle/cap/recovered outcomes remain. No idle logic in gate code.                                                        | aa  |
| **BL-260818-distinguish-operator-directed** — Distinguish operator-directed review rounds from failed fix cycles in the review-cycle cap   | Medium | Medium | **Fill-in**       | no: overlaps `BL-260927-record-owner-overrides` (Record owner overrides of exhausted configured gates as structured state); consolidate first    | `BL-260901-add-corrective-revision` (Add corrective-revision transition after review exhaustion), `BL-260927-record-owner-overrides` (Record owner overrides of exhausted configured gates as structured state)                                                                                                            | Clear ACs, but three items now own "what happens at the cap"; merge scope before building.                                                                                            | aa  |
| **BL-260927-record-owner-overrides** — Record owner overrides of exhausted configured gates as structured state                            | Low    | Medium | **Avoid / Defer** | no: contract decision (allow override vs record why not)                                                                                         | `BL-260818-distinguish-operator-directed` (Distinguish operator-directed review rounds from failed fix cycles in the review-cycle cap)                                                                                                                                                                                     | Auditability only; spans state schema, two skills, and gate envelope finding classification.                                                                                          | ad  |
| **BL-260901-add-corrective-revision** — Add corrective-revision transition after review exhaustion                                         | Medium | Medium | **Strategic**     | no: state-model design; review-gate-integrity seam                                                                                               | review-gate-integrity family (`BL-260820-bind-each-gate-review` (Bind each gate review disposition to its exact received ledger event))                                                                                                                                                                                    | New lifecycle transition with authorization, resume, whole-history re-review; needs design within the integrity model.                                                                | ab  |
| **BL-260902-file-deferred-repository** — File deferred repository follow-ups from a passing receive                                        | Medium | Medium | **Strategic**     | no: blocked by receipt/event identity (`BL-260820-bind-each-gate-review` (Bind each gate review disposition to its exact received ledger event)) | review-gate-integrity child; oat-project-review-receive                                                                                                                                                                                                                                                                    | Receive skill has no filing disposition today; correlation fields depend on stable receipt identity.                                                                                  | ab  |
| **BL-260902-append-only-lifecycle-history** — Append-only lifecycle history after completion                                               | Medium | Medium | **Strategic**     | no: decision (#251 receipt persistence is decision-gated)                                                                                        | GitHub #209/#210/#251 open; touches oat-project-retro, oat-project-complete, log/append.ts                                                                                                                                                                                                                                 | Seal logic (`ProjectLogSealedError`, append.ts:1140) blocks post-completion appends; target location needs decision.                                                                  | ab  |
| **BL-260927-derive-current-lifecycle-state** — Derive current lifecycle state from one authority for review, phase, and publication status | High   | High   | **Strategic**     | no: L + architecture decision                                                                                                                    | related `BL-260820-bind-each-gate-review` (Bind each gate review disposition to its exact received ledger event), `BL-260711-skip-re-review-for-bookkeeping` (Skip re-review for bookkeeping-only review findings), `BL-260820-track-pr-closeout-evidence` (Track PR-closeout evidence freshness against the current head) | Root cause of repeated stale-status review cycles, but cross-skill state model redesign.                                                                                              | ad  |
| **BL-260927-detect-unfilled-placeholders** — Detect unfilled placeholders and frontmatter-body drift at PR-final and completion            | Medium | Medium | **Strategic**     | yes (coordinate with derive-current-lifecycle-state)                                                                                             | overlaps derive-current-lifecycle-state                                                                                                                                                                                                                                                                                    | Deterministic check + pr-final/complete wiring; bounded; avoid pre-empting the state-authority design.                                                                                | ad  |
| **BL-260927-give-gate-receipts-portable** — Give gate receipts portable ownership, path-neutral identities, and a shipped ignore rule      | Medium | Medium | **Strategic**     | no: ownership-model decision (durable vs ignored runtime)                                                                                        | DR-260907-gate-log-receipts; share-one-hook-safe                                                                                                                                                                                                                                                                           | Real downstream leak of absolute paths; `oat init` ignore entry is a cheap sub-slice.                                                                                                 | ad  |
| **BL-260927-share-one-hook-safe-exact-path** — Share one hook-safe exact-path commit primitive across CLI and skill lifecycle commits      | Medium | High   | **Strategic**     | no: L, cross-cutting CLI + skill commits                                                                                                         | related give-gate-receipts-portable                                                                                                                                                                                                                                                                                        | Correctness hazard with hooks, but unifies promote, ref-sync, scaffold and gate commit paths with concurrency fixtures.                                                               | ad  |
| **BL-260830-complete-control-plane-backed** — Complete control-plane-backed lifecycle reads                                                | Medium | Medium | **Avoid / Defer** | no: initiative; audit + cloud-fallback contract design                                                                                           | Many lifecycle skills; overlaps `BL-260927-derive-current-lifecycle-state` (Derive current lifecycle state from one authority for review, phase, and publication status)                                                                                                                                                   | Cross-skill audit and CLI read surface; broad blast radius vs moderate payoff.                                                                                                        | ab  |
| **BL-260830-re-evaluate-same-target-gate** — Re-evaluate same-target gate execution                                                        | Low    | High   | **Avoid / Defer** | no: decision (approve V2 or close)                                                                                                               | Gate/provenance architecture                                                                                                                                                                                                                                                                                               | Research-then-decide; likely closes as unnecessary complexity.                                                                                                                        | ab  |
| **BL-260719-evaluate-broader-final-gate** — Evaluate broader final-gate freshness policy after narrow optimization                         | Low    | Medium | **Avoid / Defer** | no: needs usage evidence + decision                                                                                                              | narrow `BL-260719-avoid-final-gate-reruns` (Avoid final-gate reruns for merge-only updates; archived) shipped (archived)                                                                                                                                                                                                   | Precondition met, but it is an evaluation gated on observed gaps; nothing indicates gaps yet.                                                                                         | aa  |
| **BL-260706-front-load-recurring-gate** — Front-load recurring gate-finding classes into implementer briefs                                | Medium | High   | **Avoid / Defer** | no: design needed (ledger location, auto-promotion to AGENTS.md), L                                                                              | none hard; touches implement + review-receive + final review                                                                                                                                                                                                                                                               | Real field evidence, but four surfaces plus an AGENTS.md auto-write policy; roadmap "Later".                                                                                          | aa  |
| **BL-260906-re-evaluate-universal-plan** — Re-evaluate universal plan proof strategy and test-first guidance                               | High   | High   | **Strategic**     | no: L + DR re-evaluation decision                                                                                                                | touches plan templates, implementer/reviewer contracts, AGENTS.md DoD                                                                                                                                                                                                                                                      | Cross-cutting policy change across every workflow mode; needs a decision record and workflow-mode change inventory. Own project.                                                      | ac  |

### Lane B — Lifecycle skill prose and routing (14 items)

| Item                                                                                                                                            | Value  | Effort | Quadrant      | Wave-ready (lane)                                                                      | Dependencies / overlaps (lane)                                                                                              | Rationale (lane)                                                                                                                      | Src |
| ----------------------------------------------------------------------------------------------------------------------------------------------- | ------ | ------ | ------------- | -------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------- | --- |
| **BL-260927-derive-or-label-the-dispatch** — Derive or label the dispatch audit line from the gate invocation in gate-originated reviews        | Medium | Low    | **Quick Win** | yes                                                                                    | none                                                                                                                        | Skill rule in `oat-project-review-provide/SKILL.md` (~:667-758) plus gate-artifact validator check and a differing-effort test.       | ad  |
| **BL-260927-require-a-per-item-walkthrough** — Require a per-item walkthrough of retro register items in the final report                       | Medium | Low    | **Quick Win** | yes                                                                                    | none                                                                                                                        | Skill-only change in `oat-project-retro/SKILL.md` plus contract test and version bump; closes #313/#297 and #329 wording.             | ad  |
| **BL-260713-root-agent-judgment-logging** — Root-agent judgment logging responsibility for project log                                          | Medium | Low    | **Quick Win** | yes                                                                                    | none; respect "never append while a child owns the worktree"                                                                | Implement skill has only structural append points; no judgment-entry trigger for surprises/workarounds. Pure skill prose, S.          | aa  |
| **BL-260927-add-a-side-effect-free-dry-run** — Add a side-effect-free dry run to oat project log append                                         | Low    | Low    | **Fill-in**   | yes                                                                                    | shares `project/log/append.ts` with polish item                                                                             | No dry-run exists today; clear three-case test matrix; operator friction only.                                                        | ad  |
| **BL-260907-recognize-phase-level** — Recognize phase-level completion records so bullet-list revision phases do not read as incomplete         | Medium | Medium | **Strategic** | partly: needs a source-precedence call (Progress table vs task bodies)                 | control-plane parser, .oat/templates/implementation.md, router.test.ts pin                                                  | Real misroute (implement instead of complete) for archive-shaped projects; template contract choice is small but explicit.            | ac  |
| **BL-260907-record-absorbed-projects** — Record absorbed projects and backlog items for Lite consolidations                                     | Medium | Low    | **Quick Win** | yes                                                                                    | skill bump + lockstep bump                                                                                                  | Confirmed: oat-project-lite has zero `absorbed_*` references. Closes the #250 stale-ownership class via the Lite path.                | ac  |
| **BL-260907-route-quick-mode-discovery** — Route quick-mode discovery rows in oat-project-next and oat-project-progress straight to quick-start | Low    | Low    | **Fill-in**   | yes                                                                                    | named-skill-load-contract.test.ts (shared with restructure-authoring); 2 skill bumps                                        | Confirmed stale: oat-project-next SKILL.md:256-257 and oat-project-progress SKILL.md:279 still name oat-project-plan.                 | ac  |
| **BL-260908-tighten-the-pr-final-ledger** — Tighten the pr-final ledger guard's prose and escaped-pipe boundary                                 | Low    | Low    | **Fill-in**   | yes                                                                                    | same SKILL.md as repair-or-exempt-archived; skill bump                                                                      | Confirmed: oat-project-pr-final SKILL.md:413 still says "ends at the next level-two heading". Prose-only; pair with repair-or-exempt. | ac  |
| **BL-260908-repair-or-exempt-archived** — Repair or exempt archived project ledgers that fail the pr-final path guard                           | Low    | Medium | **Fill-in**   | no: decision (repair vs exempt)                                                        | same skill as `BL-260908-tighten-the-pr-final-ledger` (Tighten the pr-final ledger guard's prose and escaped-pipe boundary) | 35 failing archived ledgers; the decision is the work. Exempting `archived/` is likely small once chosen.                             | ac  |
| **BL-260903-project-document-should-prompt** — project-document should prompt a re-run when review fixes change a shipped contract              | Low    | Low    | **Fill-in**   | no: placeholder ACs (direction clear; author ACs then yes)                             | oat-project-document skill                                                                                                  | `oat_docs_updated` is a status, not timestamp; detection signal needs a small design choice.                                          | ab  |
| **BL-260927-expose-a-scoped-template** — Expose a scoped template resolver command and route lifecycle skills through it                        | High   | Medium | **Strategic** | no: precedence decision needed (triage open concern)                                   | decision on user-vs-repo precedence                                                                                         | Breaks ~9 lifecycle skills for user-scope installs; resolvers disagree (`scaffold.ts` user-first vs `template-source.ts` repo-first). | ad  |
| **BL-260830-wire-bounded-durable-reference** — Wire bounded durable-reference reads into lifecycle skills                                       | Medium | Medium | **Strategic** | no: design (matching/token-budget rules)                                               | Touches discover/plan/review skills                                                                                         | Useful context injection, but budget/matching rules are unspecified design.                                                           | ab  |
| **BL-260830-make-documentation-aware** — Make documentation-aware discovery prerequisites configurable                                          | Medium | Medium | **Strategic** | no: policy/config design needed                                                        | GitHub #205 (open); touches oat-project-discover Step 3                                                                     | Real external-user pain (#205), but configurable thresholds and document classes need a design choice first.                          | ab  |
| **BL-260904-make-quick-the-default-oat** — Make quick the default OAT workflow mode and spec-driven the explicit larger mode                    | Medium | High   | **Strategic** | no: L repo-wide sweep; workflow-mode change inventory; conflicts with every skill lane | Lite shipped (PR #264); `--mode` default still `spec-driven` (project/new/index.ts:166)                                     | High-leverage UX default but cross-surface rename; run solo, not parallel with skill-editing lanes.                                   | ab  |

### Lane C — Dispatch, providers, and recon (16 items)

| Item                                                                                                                                            | Value  | Effort | Quadrant              | Wave-ready (lane)                                                                                             | Dependencies / overlaps (lane)                                                                                                                                                                                                                                                                                  | Rationale (lane)                                                                                                                                           | Src |
| ----------------------------------------------------------------------------------------------------------------------------------------------- | ------ | ------ | --------------------- | ------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------- | --- |
| **BL-260927-make-the-managed-claude** — Make the managed Claude dispatch-record input producible and self-describing                            | High   | Medium | **Strategic**         | yes (coordinate with `BL-260909-give-the-dispatch-record` (Give the dispatch record a consumer or remove it)) | `BL-260909-give-the-dispatch-record` (Give the dispatch record a consumer or remove it) (journal fate only)                                                                                                                                                                                                     | Mandatory pre-launch check unsatisfiable from docs; `resolveCanonicalRole` has no production caller; batched errors + pinned example + producer.           | ad  |
| **BL-260909-give-the-dispatch-record** — Give the dispatch record a consumer or remove it                                                       | High   | Medium | **Strategic**         | no: decision record (consumer vs removal)                                                                     | `BL-260927-make-the-managed-claude` (Make the managed Claude dispatch-record input producible and self-describing) (PR #315 validator path), #266 in `BL-260906-harden-dispatch-launch` (Harden dispatch launch baselines and terminal reconciliation)                                                          | Refined 2026-09-26: command now has a live validate-only consumer; only journal persistence lacks a reader. Decide together with managed-claude item.      | ac  |
| **BL-260906-harden-dispatch-launch** — Harden dispatch launch baselines and terminal reconciliation                                             | High   | High   | **Strategic**         | no: design decision (git seam vs no-process guard) + #266 producer matrix                                     | coupled to `BL-260909-give-the-dispatch-record` (Give the dispatch record a consumer or remove it), `BL-260927-make-the-managed-claude` (Make the managed Claude dispatch-record input producible and self-describing); parked patch wave-7-p16                                                                 | Both issues still open. Wave-7 STOP needs a redesign of where the git seam may live; #266 has no producer. Needs its own project.                          | ac  |
| **BL-260711-add-root-owned-dispatch-broker** — Add root-owned dispatch broker for exact OAT subagent launches                                   | Medium | High   | **Avoid / Defer**     | no: live-provider acceptance (Codex/Claude/Cursor), really L                                                  | overlaps `BL-260906-harden-dispatch-launch` (Harden dispatch launch baselines and terminal reconciliation), `BL-260927-make-the-managed-claude` (Make the managed Claude dispatch-record input producible and self-describing)                                                                                  | Phase-direct fallback works; index calls it optional for specialized nesting. Broad cross-provider tests need live runtimes.                               | aa  |
| **BL-260906-project-journal-reservation** — Project journal reservation state into the smoke evidence bundle                                    | Low    | Low    | **Fill-in**           | no: AC needs fixture captured from a real interrupted run                                                     | none                                                                                                                                                                                                                                                                                                            | No consumer reads the state today (fidelity only). Real-run capture requirement makes it awkward for an autonomous lane.                                   | ac  |
| **BL-260903-close-claude-runtime-lineage** — Close Claude runtime lineage depth and unverified provider shapes                                  | Low    | Low    | **Fill-in**           | no: placeholder ACs; "reopen only if recurring"                                                               | none                                                                                                                                                                                                                                                                                                            | Residue explicitly parked; only tiny wording fixes (FR9, "sanitized" docstring) are actionable.                                                            | ab  |
| **BL-260927-validate-recon-worker** — Validate recon-worker assignment envelopes deterministically before launch                                | Medium | Low    | **Quick Win**         | yes                                                                                                           | related `BL-260906-harden-dispatch-launch` (Harden dispatch launch baselines and terminal reconciliation)                                                                                                                                                                                                       | Add validator beside `.agents/skills/recon/scripts/validate-packet.mjs`; wire into `oat-reviewer.md` pre-launch guidance.                                  | ad  |
| **BL-260719-add-pinned-recon-agents** — Add pinned recon agents for reusable orchestration                                                      | Medium | High   | **Avoid / Defer**     | no: design + multi-provider materialization                                                                   | overlaps `BL-260830-integrate-recon-with-oat` (Integrate recon with OAT discovery and quick start), `BL-260830-integrate-recon-across` (Integrate recon across analysis and research workflows), `BL-260927-validate-recon-worker` (Validate recon-worker assignment envelopes deterministically before launch) | recon-worker exists for recon skill only; no pinned variants or dispatch-subagents selection. Roadmap "Later".                                             | aa  |
| **BL-260830-integrate-recon-with-oat** — Integrate recon with OAT discovery and quick start                                                     | Medium | Medium | **Strategic**         | no: blocked by recon stability; design of discovery.md recording                                              | Same recon deps as above; touches oat-project-discover / quick-start                                                                                                                                                                                                                                            | Clear intent, but lifecycle integration should wait for recon envelope validation and live-producer fixes.                                                 | ab  |
| **BL-260830-integrate-recon-across** — Integrate recon across analysis and research workflows                                                   | Medium | High   | **Avoid / Defer**     | no: L; depends on recon contract stability                                                                    | `BL-260719-add-pinned-recon-agents` (Add pinned recon agents for reusable orchestration), `BL-260927-validate-recon-worker` (Validate recon-worker assignment envelopes deterministically before launch); recon receipts lack a live producer                                                                   | Large cross-skill contract work on a recon surface still receiving fixes; defer until recon launch path is proven live.                                    | ab  |
| **BL-260908-restore-recon-s-cheap-fan-out** — Restore recon's cheap-fan-out intent with per-wave routing under one approval envelope            | High   | n/a    | **Close (reconcile)** | n/a                                                                                                           | none                                                                                                                                                                                                                                                                                                            | Suspected complete: every AC checked, PR #285 merged 2026-09-12, issue #274 CLOSED. Only archiving remains.                                                | ac  |
| **BL-260708-verify-cursor-gpt-5-6-subagent** — Verify Cursor GPT-5.6 subagent model slugs                                                       | Low    | Low    | **Fill-in**           | n/a: suspected complete, close                                                                                | none                                                                                                                                                                                                                                                                                                            | Superseded: cursor-subagent-materialization g01 verified the Sol/Terra/Luna pins via live Cursor IDE subagentStart evidence; catalog ships them.           | aa  |
| **BL-260726-validate-cursor-pin-effort** — Validate Cursor pin effort rungs at sync time                                                        | Low    | Low    | **Fill-in**           | yes                                                                                                           | `BL-260925-add-grok-4-7-cursor-pin` (Add Grok 4.7 Cursor pin mappings) (same catalog.ts)                                                                                                                                                                                                                        | Partial: probe-record consistency (AC5) shipped; no family-aware rung set or loud unknown-family/effort error. Explicit registry already limits typo risk. | aa  |
| **BL-260925-add-grok-4-7-cursor-pin** — Add Grok 4.7 Cursor pin mappings                                                                        | Low    | Medium | **Avoid / Defer**     | no: needs external quality evidence, DR revision, live re-probe                                               | DR-260718 revision                                                                                                                                                                                                                                                                                              | Deliberately deferred in #320; requires live Cursor probing and a decision-record change.                                                                  | ad  |
| **BL-260827-refresh-provider-codex-md** — Refresh provider-codex.md for the ultra effort tier, the GPT-5.4 retirement, and per-subcommand flags | Low    | Low    | **Fill-in**           | n/a: suspected superseded; confirm `ultra`, then close                                                        | `BL-260909-re-source-the-surviving-codex` (Re-source the surviving Codex provider claims and repair the dead provider-reference URLs) (adjacent)                                                                                                                                                                | Refreshed 2026-09-24 (GPT-6, 5.4 as direct-API routes); resume flag differences documented in codex-skill. Only `ultra` unmentioned.                       | aa  |
| **BL-260909-re-source-the-surviving-codex** — Re-source the surviving Codex provider claims and repair the dead provider-reference URLs         | Low    | Low    | **Fill-in**           | no: live external fetch acceptance                                                                            | overlaps restructure-the-authoring (same skills); skill bumps                                                                                                                                                                                                                                                   | ACs require live-page quotes and a fetch loop against external URLs; not verifiable in-repo.                                                               | ac  |

### Lane D — Config and instruction sync (5 items)

| Item                                                                                                                 | Value  | Effort | Quadrant          | Wave-ready (lane)                           | Dependencies / overlaps (lane)                                                 | Rationale (lane)                                                                                                                                              | Src |
| -------------------------------------------------------------------------------------------------------------------- | ------ | ------ | ----------------- | ------------------------------------------- | ------------------------------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------- | --- |
| **BL-260927-preserve-oat-config-json-key** — Preserve .oat/config.json key order and skip no-op config writes        | Medium | Low    | **Quick Win**     | yes                                         | same file as reject-malformed-nested-values                                    | `writeOatConfig` (`config/oat-config.ts:2023-2030`) always normalizes+writes; causes unrelated diffs in user repos.                                           | ad  |
| **BL-260909-reject-malformed-nested-values** — Reject malformed nested values in the strict pjm.remote shared reader | Low    | Low    | **Fill-in**       | yes                                         | none; same file as preserve-config-json-key                                    | Pre-existing latent bug in `normalizePjmRemoteSharedConfig` (`config/oat-config.ts:1027`); clear negative control; low user impact.                           | ad  |
| **BL-260830-persist-instruction-sync** — Persist instruction sync strategy in config and init                        | Medium | Medium | **Fill-in**       | yes                                         | Overlaps add-per-claude-md-adoption-opt (oat-config.ts, instructions.utils.ts) | Strategy is per-run only (`resolveInstructionSyncStrategy`, instructions.utils.ts:85-89); config key + init prompt + precedence is bounded and testable.      | ab  |
| **BL-260830-add-per-claude-md-adoption-opt** — Add per-CLAUDE.md adoption opt-out for instruction sync               | Low    | Medium | **Avoid / Defer** | no: policy design (per-run/path/file model) | Overlaps persist-instruction-sync (same config/instructions code)              | Directory-level `documentation.instructionPointerExcludes` already exists; per-file Claude-only opt-out and consistent reporting still undefined. Low demand. | ab  |
| **BL-260909-surface-config-warnings** — Surface config warnings on every reader path and document the warnings field | Medium | Medium | **Strategic**     | yes (per-surface decisions are bounded)     | none; overlaps config/index.ts with polish + reject-malformed                  | `readOatConfigWithWarnings` still used only by `commands/config/index.ts`; `instructions.utils.ts:339` uses plain `readOatConfig`.                            | ad  |

### Lane E — Sync engine, tools, packs, and CLI surfaces (20 items)

| Item                                                                                                                                     | Value  | Effort | Quadrant          | Wave-ready (lane)                                                  | Dependencies / overlaps (lane)                                                                                                                                                                                            | Rationale (lane)                                                                                                                                                               | Src |
| ---------------------------------------------------------------------------------------------------------------------------------------- | ------ | ------ | ----------------- | ------------------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | --- |
| **BL-260927-stop-resolve-providers-sh-from** — Stop resolve-providers.sh from aborting when the last auto-detect test is false           | High   | Low    | **Quick Win**     | yes                                                                | none                                                                                                                                                                                                                      | Confirmed at `resolve-providers.sh:85` under `set -euo pipefail`; breaks agent-instructions analyze/apply in most repos; XS fix + script test.                                 | ad  |
| **BL-260927-name-the-file-in-canonical** — Name the file in canonical rule parse errors and keep one bad rule from aborting sync         | Medium | Low    | **Quick Win**     | yes (small alias-vs-skip choice in scope)                          | none                                                                                                                                                                                                                      | Confirmed: three `rule-transform.ts` call `parseCanonicalRuleMarkdown(canonicalContent)` without path (`parse.ts:130` defaults `<inline>`); third-party installers trigger it. | ad  |
| **BL-260909-make-oat-sync-scope-all-report** — Make oat sync --scope all report a sibling scope's failure in the plan body               | Medium | Low    | **Quick Win**     | yes                                                                | none                                                                                                                                                                                                                      | Confirmed: global restampOnly (apply.ts:580) drives per-scope EMPTY_PLAN_SUFFIX (apply.ts:276-298, 598). Misleading output on failure; clear control.                          | ac  |
| **BL-260908-validate-the-catalog-refresh** — Validate the catalog-refresh policy state in normalizeSyncEvidence                          | Medium | Low    | **Quick Win**     | yes                                                                | none                                                                                                                                                                                                                      | Confirmed: sync-evidence.ts:181-184 casts `visibility.policy` unchecked; malformed advice can throw in a succeeded install/update/remove.                                      | ac  |
| **BL-260908-align-the-provider-view-json** — Align the provider-view JSON, evidence states, and docs with the human row                  | Low    | Low    | **Fill-in**       | yes                                                                | none                                                                                                                                                                                                                      | Four precise polish points with explicit ACs in drift/skill-view-diagnostic.ts and manifest-and-drift.md.                                                                      | ac  |
| **BL-260909-restamp-a-stale-copy-strategy** — Restamp a stale copy-strategy contentHash on skip and retire the pre-framing digest bridge | Medium | Medium | **Strategic**     | no: bridge-retirement AC depends on field installs being restamped | none in-repo                                                                                                                                                                                                              | Bug confirmed (`engine/execute-plan.ts:389-391` returns manifest untouched). Split: restamp + classifier + validator widening are wave-ready; bridge removal later.            | ad  |
| **BL-260909-use-handle-bound-traversal** — Use handle-bound traversal in the managed-copy and manifest filesystem readers                | Low    | High   | **Avoid / Defer** | no: placeholder AC; Node lacks openat primitives                   | same missing-primitive class as `BL-260903-close-manual-only-agents-md` (Close manual-only AGENTS.md refresh loop) / `BL-260724-support-provider-directory` (Support provider directory symlinks as full collection sync) | Theoretical TOCTOU, acknowledged non-worsened; Node exposes no openat-style walk, so likely XL or infeasible.                                                                  | ad  |
| **BL-260724-support-provider-directory** — Support provider directory symlinks as full collection sync                                   | Medium | High   | **Avoid / Defer** | no: blocked by missing symlinkat-class Node primitive              | tool-pack-scope-provider-truthfulness; `BL-260903-close-manual-only-agents-md` (Close manual-only AGENTS.md refresh loop) (same primitive)                                                                                | Adopt/detach shipped; headline `auto` creation impossible without a guarded primitive.                                                                                         | aa  |
| **BL-260725-classify-general-sync-owned** — Classify general sync-owned dirt in project-start preflight                                  | Low    | Medium | **Avoid / Defer** | no: parked; revisit only on recurrence                             | none                                                                                                                                                                                                                      | Item itself says prompting is the correct answer for every hard case.                                                                                                          | aa  |
| **BL-260903-close-manual-only-agents-md** — Close manual-only AGENTS.md refresh loop                                                     | High   | Medium | **Quick Win**     | yes                                                                | GitHub #322; overlaps `BL-260927-name-only-installed-pack` (Name only installed pack locations in the OAT tools guidance block) (project-guidance.ts), retire-deprecated-pack (init/tools)                                | Still open: only `manual-required`, no `appended` (init/tools/index.ts:809-896). Operator hits it on every new repo; contract fully specified incl. negative control.          | ab  |
| **BL-260927-name-only-installed-pack** — Name only installed pack locations in the OAT tools guidance block                              | Low    | Low    | **Fill-in**       | yes                                                                | overlaps `BL-260903-close-manual-only-agents-md` (Close manual-only AGENTS.md refresh loop) (`init/tools/project-guidance.ts`)                                                                                            | Cosmetic-but-misleading guidance; fixture matrix clear; `oat tools where` decision can be "defer".                                                                             | ad  |
| **BL-260903-retire-deprecated-pack** — Retire deprecated pack placement and dead evidence diagnostics                                    | Low    | Medium | **Fill-in**       | no: placeholder ACs; "reopen only if confusion"                    | Overlaps close-manual-only-agents-md (init/tools), tools list/info, status JSON                                                                                                                                           | Deprecated `placement` still ships (pack-inventory.ts:63); truthfulness residue but explicitly parked.                                                                         | ab  |
| **BL-260903-verify-the-packs-inventory** — Verify the packs:inventory path-redaction claim in troubleshooting docs                       | Low    | Low    | **Fill-in**       | yes (closing criterion stated in description)                      | none                                                                                                                                                                                                                      | Status redacts roots (status/index.ts:201-222); doctor falls back to unredacted `detail` (doctor/index.ts:1208) when no diagnostics. XS verify-or-narrow.                      | ab  |
| **BL-260906-report-errno-for-asset-root** — Report errno for asset root stat failures and reset the statRedirects test seam              | Low    | Low    | **Fill-in**       | yes                                                                | none                                                                                                                                                                                                                      | Still open: assets.ts:268 message unchanged; assets.test.ts:21 seam has no afterEach clear. Tiny, verifiable.                                                                  | ac  |
| **BL-260911-support-per-tool-scope** — Support per-tool scope migration in oat tools migrate                                             | Medium | Low    | **Quick Win**     | yes                                                                | none                                                                                                                                                                                                                      | Extends existing `commands/tools/migrate/migrate-pack.ts`; duplicate AC heading with placeholders but second AC set is clear.                                                  | ad  |
| **BL-260909-show-the-brainstorm-pack** — Show the brainstorm pack in the oat-doctor dashboard example and pack enumeration               | Low    | Low    | **Fill-in**       | no: premise largely obsolete after PR #300; re-scope               | none                                                                                                                                                                                                                      | oat-doctor 2.0 dropped the hardcoded pack enumeration ("carries no pack manifest", SKILL.md:262); only the pack-status derivation rule remains missing.                        | ad  |
| **BL-260901-consolidate-terminal-remote** — Consolidate terminal remote-ref advertisement parsing                                        | Low    | Medium | **Avoid / Defer** | no: trigger-gated ("when a call site next changes")                | Six synced-project terminal call sites                                                                                                                                                                                    | Refactor explicitly deferred until next touch; do not schedule standalone.                                                                                                     | ab  |
| **BL-260909-rewrite-inbound-references** — Rewrite inbound references when oat backlog archive moves an item                             | Medium | Low    | **Quick Win**     | yes                                                                | none                                                                                                                                                                                                                      | Recurs at every wave close; `commands/backlog/archive.ts` only rewrites frontmatter today; "rewrite or warn" choice is small.                                                  | ad  |
| **BL-260908-date-decision-record-ids** — Date decision-record IDs in local time or document UTC                                          | Low    | Low    | **Fill-in**       | no: trivial product call (local vs UTC)                            | none                                                                                                                                                                                                                      | decision/new.ts:65,122 still use toISOString (UTC). Once local-vs-UTC is chosen, it is XS.                                                                                     | ac  |
| **BL-260830-cli-flag-help-p2-p3-cleanup** — CLI flag/help P2-P3 cleanup                                                                  | Medium | Medium | **Fill-in**       | no: audit-first, scope unbounded until inventory revalidated       | Touches many command files; conflicts with any CLI lane                                                                                                                                                                   | Needs re-audit to produce a concrete list before it can be bounded; good follow-on after an audit lane.                                                                        | ab  |

### Lane F — Skill validation, contract tests, and CI hygiene (17 items)

| Item                                                                                                                                         | Value  | Effort | Quadrant              | Wave-ready (lane)                                                      | Dependencies / overlaps (lane)                                                                                                                           | Rationale (lane)                                                                                                                                                                              | Src |
| -------------------------------------------------------------------------------------------------------------------------------------------- | ------ | ------ | --------------------- | ---------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --- |
| **BL-260830-add-strict-yaml-validation** — Add strict YAML validation to oat skill validation                                                | Medium | Low    | **Quick Win**         | yes                                                                    | none                                                                                                                                                     | Partially shipped: `parseSkillFrontmatter` strict-parses (frontmatter.ts:370) and emits `skill-frontmatter-unreadable`; missing parser location, field-type schema check, bare-colon fixture. | ab  |
| **BL-260819-classify-canonical-skills-by** — Classify canonical skills by distribution, lifecycle, and tenant scope                          | Medium | Medium | **Fill-in**           | yes (retired-skill policy choice is inside the AC)                     | shared validation/skills.test.ts pins                                                                                                                    | 83 canonical dirs vs bundle; no classification contract exists. Bounded validator + docs work.                                                                                                | aa  |
| **BL-260908-remove-the-top-level-skill** — Remove the top-level skill version read after the alias error has been quiet                      | Medium | Medium | **Strategic**         | no: decision needed (scope removal to skills vs migrate 5 agent roles) | precondition likely met (step 1 shipped wave 7; main now 0.3.7) but must be recorded; frontmatter.ts:441 still reads top-level                           | Agent roles deliberately keep top-level `version:` and check:skill-bumps accepts it; removal must be scoped. Plus 5-copy walk collapse and `.inf` keyIdentity.                                | ac  |
| **BL-260908-retire-the-top-level-skill** — Retire the top-level skill version alias on the recorded schedule                                 | Low    | n/a    | **Close (reconcile)** | n/a                                                                    | remaining ACs duplicate `BL-260908-remove-the-top-level-skill` (Remove the top-level skill version read after the alias error has been quiet)            | Step 1 shipped (skills.ts:1519-1520 severity error). Unchecked ACs are step 2, owned by the split item; close as superseded by the split.                                                     | ac  |
| **BL-260906-give-project-state-frontmatter** — Give PROJECT_STATE_FRONTMATTER_FIELDS a production consumer or delete it                      | Low    | Low    | **Fill-in**           | yes (take delete path)                                                 | touches frontmatter.ts shared with `BL-260908-remove-the-top-level-skill` (Remove the top-level skill version read after the alias error has been quiet) | Still dead: only frontmatter.test.ts:9,488 reference the exports (frontmatter.ts:17,61). Deletion is the low-risk path; the wave can pick it.                                                 | ac  |
| **BL-260906-make-the-dispatch-stamp** — Make the dispatch-stamp contract helper reject bold-step boundaries and normal-path shim permissions | Low    | Low    | **Fill-in**           | yes                                                                    | none                                                                                                                                                     | Still open: `INTERVENING_HEADING` (dispatch-stamp-contract.ts:71) is ATX-only. Test-only hardening with two concrete red-then-green mutations.                                                | ac  |
| **BL-260906-make-the-phase-implementer** — Make the phase-implementer sweep contract test negation-aware                                     | Low    | Low    | **Fill-in**           | yes                                                                    | same contract-test class as dispatch-stamp / findSection                                                                                                 | Test-only; "document the accepted gap" escape keeps it bounded. Low value; regression backstop only.                                                                                          | ac  |
| **BL-260909-make-findsection-comment-aware** — Make findSection comment-aware in the bundled-docs contract test                              | Low    | Low    | **Fill-in**           | yes                                                                    | contract-test class                                                                                                                                      | Confirmed: findSection (skills-bundled-docs-contract.test.ts:305) is its own fence pass. Test-only; witness exists from p17 review.                                                           | ac  |
| **BL-260907-ignore-backslash-escaped** — Ignore backslash-escaped emphasis in skill-script reference extraction                              | Low    | Low    | **Fill-in**           | yes                                                                    | none                                                                                                                                                     | readOpeningEmphasis (skill-script-references.ts:137-147) still has no backslash check. Zero live instances; one-line fix + fixture.                                                           | ac  |
| **BL-260827-span-based-prose-guards** — Span-based prose guards, anchored probe records, and a shared probe runner for skill contract tests  | Low    | Medium | **Fill-in**           | no: placeholder ACs; wave-4 probe runner absent from repo              | none                                                                                                                                                     | Blockquote/synonym residuals are fixable, but the runner to "move under tools/" was never committed.                                                                                          | aa  |
| **BL-260909-add-a-grep-by-shape-control** — Add a grep-by-shape control for own-key sweeps keyed to variable names                           | Low    | Medium | **Avoid / Defer**     | no: design (oxlint rule vs scripted grep; shape heuristics)            | none                                                                                                                                                     | Heuristic detector with allowlist; false-positive risk and design choice. Lesson-driven, no live defect.                                                                                      | ac  |
| **BL-260909-repair-the-bare-fences-that** — Repair the bare fences that swallow headings outside .agents/skills                              | Medium | Low    | **Quick Win**         | yes                                                                    | none; shares `.agents/agents/oat-reviewer.md` with validate-recon-worker                                                                                 | AC are `{Outcome}` placeholders but description is concrete; line numbers drifted (e.g. reviewer fences now ~:478/:505) — re-locate before fixing; agent version bumps.                       | ad  |
| **BL-260909-fix-the-agents-md-unsafe** — Fix the agents-md unsafe-directory test race under parallel turbo                                   | Medium | Low    | **Quick Win**         | yes                                                                    | same flake class as stabilize-collection; notes add workflow.test.ts:476, cursor-broker.test.mjs, capture-dirty-tree.test.mjs:694                        | Confirmed: agents-md.test.ts:310 writes `join(root,'..','outside.md')` (shared tmpdir). Core fix bounded; sweep of the other three is optional scope.                                         | ac  |
| **BL-260904-stabilize-the-collection** — Stabilize the collection-detach engine integration test                                             | Low    | Low    | **Fill-in**           | yes (verification only)                                                | none                                                                                                                                                     | Fix already landed (`ddddba079`, fixture `../.agents/./skills` at engine.integration.test.ts:901); only the ten-uncached-run criterion remains. Run the loop and close.                       | ac  |
| **BL-260909-give-packages-control-plane** — Give packages/control-plane a check script so its formatting is CI-gated                         | Medium | Low    | **Quick Win**         | yes                                                                    | lockstep 5-package bump; AGENTS.md prose; lint-enrollment test                                                                                           | Confirmed: control-plane package.json:36-37 has lint/format, no check. May surface existing format violations to fix.                                                                         | ac  |
| **BL-260907-type-check-cli-test-files** — Type-check CLI test files with a test-scoped tsconfig gate                                         | Medium | Medium | **Strategic**         | yes (allowlist route), but run solo                                    | conflict magnet across many \*.test.ts                                                                                                                   | Partial: tsconfig.test-support.json covers `__tests__/**` only; `*.test.ts` still excluded (tsconfig.json:27). 614-error triage via allowlist is bounded.                                     | ac  |
| **BL-260909-wave-7-review-polish-leftovers** — Wave-7 review polish leftovers                                                                | Low    | Low    | **Fill-in**           | yes                                                                    | touches files shared with log dry-run, config items                                                                                                      | ~12 trivial, non-behavioral fixes still present (e.g. `rollup.ts:203` `/gm`, `hopCapError`); good filler lane, many files.                                                                    | ad  |

### Lane G — Docs, explainer, wave tooling, and remote review (12 items)

| Item                                                                                                                                     | Value  | Effort | Quadrant          | Wave-ready (lane)                                                      | Dependencies / overlaps (lane)                                                                                                                                                                                     | Rationale (lane)                                                                                                                                   | Src |
| ---------------------------------------------------------------------------------------------------------------------------------------- | ------ | ------ | ----------------- | ---------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | -------------------------------------------------------------------------------------------------------------------------------------------------- | --- |
| **BL-260911-make-docs-bootstrap-a-front** — Make docs bootstrap a front door for existing docs and support the docs-directory convention | High   | High   | **Strategic**     | no: cross-repo acceptance (personal-skills, pntr) + pntr workflow edit | none                                                                                                                                                                                                               | Strong value, detailed AC, but spans bootstrap/analyze/apply skills, docs, and edits to another repo; realistically L.                             | ad  |
| **BL-260718-support-fumadocs-in-oat-docs** — Support Fumadocs in oat docs nav sync (currently MkDocs-only)                               | Medium | Low    | **Quick Win**     | yes if scoped to detect-and-fail + skill wording; ACs are placeholders | none                                                                                                                                                                                                               | sync.ts:73-83 unconditionally reads mkdocs.yml; oat-docs-apply still prescribes nav sync generically. Adapter option would be M.                   | aa  |
| **BL-260912-evaluate-replacing-explainer** — Evaluate replacing Explainer Kit authoring guidance with a pinned Effective HTML subset     | Medium | High   | **Strategic**     | no: external upstream pin + paired prototype + decision                | agent-authored-recap (shipped #299)                                                                                                                                                                                | Evaluation-only with browser checks at three widths and upstream provenance; not an autonomous wave item.                                          | ad  |
| **BL-260728-additional-visual-workflows** — Additional visual workflows                                                                  | Low    | High   | **Avoid / Defer** | no: product decision + usage evidence                                  | `BL-260912-evaluate-replacing-explainer` (Evaluate replacing Explainer Kit authoring guidance with a pinned Effective HTML subset)                                                                                 | Explainer Kit just simplified (#299); decision-first, low priority.                                                                                | aa  |
| **BL-260718-add-generated-runbook** — Add generated-runbook verification command pass                                                    | Low    | Medium | **Avoid / Defer** | no: unclear producer (no OAT runbook generator found)                  | none                                                                                                                                                                                                               | Evidence is a stoa ledger signal; no in-repo generator identified to attach the pass to.                                                           | aa  |
| **BL-260718-document-execution-program** — Document execution-program artifact as stable OAT contract                                    | Low    | Medium | **Avoid / Defer** | no: trigger (second consumer) not met                                  | paired with wave CLI                                                                                                                                                                                               | Explicit trigger-gated; descriptive docs suffice until the CLI or recap recipe consumes it.                                                        | aa  |
| **BL-260718-add-oat-wave-lifecycle-cli** — Add oat wave lifecycle CLI command family                                                     | Medium | High   | **Avoid / Defer** | no: L, operator-triggered, coupled to contract item                    | `BL-260718-document-execution-program` (Document execution-program artifact as stable OAT contract)                                                                                                                | Skills work across 7 waves; CLI absorption awaits operator prioritization and a stable artifact contract.                                          | aa  |
| **BL-260718-rewrite-worktree-bootstrap** — Rewrite worktree bootstrap-group as tested TypeScript command                                 | Low    | Medium | **Fill-in**       | yes                                                                    | wave CLI family (soft)                                                                                                                                                                                             | Bash script works; parity rewrite is bounded and testable but low urgency.                                                                         | aa  |
| **BL-260830-wire-provide-remote-skills** — Wire provide-remote skills to the review-remote helper CLI                                    | Medium | High   | **Avoid / Defer** | no: L; new public CLI command + e2e                                    | Overlaps add-remote-review-respond; packages/cli/src/review-remote                                                                                                                                                 | Valuable de-duplication but L-sized and no active remote-review demand signal.                                                                     | ab  |
| **BL-260830-add-remote-review-respond** — Add remote review respond and summarize skill set                                              | Medium | High   | **Avoid / Defer** | no: L; GitHub posting needs live approval-gated acceptance             | Overlaps `BL-260830-wire-provide-remote-skills` (Wire provide-remote skills to the review-remote helper CLI) (remote skill family)                                                                                 | Two new skills plus registration/bundle tests; approval-gated posting is live behavior. Better after provide-remote runtime ownership is singular. | ab  |
| **BL-260830-live-dogfood-oat-brainstorm** — Live dogfood oat-brainstorm destination and fold-back safety                                 | Medium | Medium | **Fill-in**       | no: live acceptance (real Git-state runs)                              | Open PR #125 (brainstorm visual companion) touches same skill                                                                                                                                                      | Evidence-gathering task by definition; not autonomous-wave material.                                                                               | ab  |
| **BL-260908-restructure-the-authoring** — Restructure the authoring skills for progressive disclosure and decide proactive invocation    | Low    | Medium | **Avoid / Defer** | no: decision record (disable-model-invocation flip)                    | overlaps `BL-260909-re-source-the-surviving-codex` (Re-source the surviving Codex provider claims and repair the dead provider-reference URLs) (same two skills + skills-guide.md); named-skill-load-contract pins | No verified defect; redesign plus a policy DR. Defer; if done, bundle with the re-source item for a single bump.                                   | ac  |

### Lane H — Product and policy decisions (human-only) (6 items)

| Item                                                                                                                      | Value  | Effort | Quadrant          | Wave-ready (lane)                           | Dependencies / overlaps (lane)                                                                                                                                                                                                  | Rationale (lane)                                                                                                  | Src |
| ------------------------------------------------------------------------------------------------------------------------- | ------ | ------ | ----------------- | ------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------- | --- |
| **BL-260902-decide-test-only-freshness** — Decide test-only freshness exception for the implement exit gate               | Medium | Low    | **Quick Win**     | no: decision needed (human)                 | `BL-260826-decide-whether-test-only-paths` (Decide whether test-only paths under packages/cli/src count as publishable), `BL-260820-track-pr-closeout-evidence` (Track PR-closeout evidence freshness against the current head) | Cheap policy decision unblocking recurring closeout friction (#237); needs user choice, not a lane.               | ab  |
| **BL-260826-decide-whether-test-only-paths** — Decide whether test-only paths under packages/cli/src count as publishable | Low    | Low    | **Fill-in**       | no: operator decision; ACs are placeholders | related `BL-260902-decide-test-only-freshness` (Decide test-only freshness exception for the implement exit gate)                                                                                                               | public-package-contract.ts:133 still ignores only assets/\*\*; DR-260826 left it as an open operator policy call. | aa  |
| **BL-260830-decide-generic-oat-ownership** — Decide generic OAT ownership of Jira backlog refinement                      | Low    | Low    | **Avoid / Defer** | no: product decision                        | none                                                                                                                                                                                                                            | Pure ownership decision; no implementation until approved. Human-only.                                            | ab  |
| **BL-260830-decide-whether-oat-owns** — Decide whether OAT owns dependency intelligence                                   | Low    | Low    | **Avoid / Defer** | no: product decision                        | none                                                                                                                                                                                                                            | Pure product decision; low priority and no active demand.                                                         | ab  |
| **BL-260830-memory-subsystem-ownership** — Memory subsystem ownership decision for OAT                                    | Low    | High   | **Avoid / Defer** | no: product decision (XL)                   | none                                                                                                                                                                                                                            | Explicitly deferred until provider interop matures; no schema until approved.                                     | ab  |
| **BL-260830-benchmark-listprojects-before** — Benchmark listProjects before approving a summary fast path                 | Low    | Medium | **Avoid / Defer** | no: decision-gated (fast-path approval)     | none                                                                                                                                                                                                                            | Speculative perf work with no reported pain; benchmark alone is doable but approval step is a human decision.     | ab  |

---

## 3. Dependency Graph

```text
Legend:  ──▶  hard dependency (must complete first)
         - -▶  soft dependency (beneficial, or same-file serialization)
         [+]   bundle into one lane

Review chain (Lane A)
BL-260729-implement-reviewplan-first ──▶ BL-260820-bind-each-gate-review
BL-260820-bind-each-gate-review ──▶ BL-260820-emit-source-qualified
BL-260820-bind-each-gate-review ──▶ BL-260711-skip-re-review-for-bookkeeping
BL-260820-bind-each-gate-review ──▶ BL-260902-file-deferred-repository
BL-260829-order-phase-bookkeeping-before ──▶ BL-260711-skip-re-review-for-bookkeeping
BL-260820-emit-source-qualified ──▶ BL-260820-track-pr-closeout-evidence
BL-260902-decide-test-only-freshness ──▶ BL-260820-track-pr-closeout-evidence
BL-260826-decide-whether-test-only-paths - -▶ BL-260902-decide-test-only-freshness   (decide together)
BL-260820-track-pr-closeout-evidence ──▶ BL-260720-add-oat-project-complete-auto
BL-260806-fail-closed-when-configured ──▶ BL-260720-add-oat-project-complete-auto
BL-260718-harden-full-surface-gate - -▶ BL-260711-add-activity-aware-gate   (same gate/index.ts; harden first)
BL-260729-implement-reviewplan-first - -▶ BL-260711-add-activity-aware-gate   (reconcile early-artifact rule)
BL-260927-derive-current-lifecycle-state - -▶ BL-260927-detect-unfilled-placeholders
BL-260927-derive-current-lifecycle-state - -▶ BL-260830-complete-control-plane-backed
BL-260820-bind-each-gate-review - -▶ BL-260927-derive-current-lifecycle-state   (#305 slice overlap)
BL-260820-emit-source-qualified - -▶ BL-260927-give-gate-receipts-portable
BL-260927-give-gate-receipts-portable [+] BL-260927-share-one-hook-safe-exact-path   (#312)
BL-260818-distinguish-operator-directed [+] BL-260927-record-owner-overrides [+] BL-260901-add-corrective-revision   (merge before planning)

Dispatch and recon (Lane C)
BL-260927-make-the-managed-claude - -▶ BL-260909-give-the-dispatch-record   (constrains the removal option)
BL-260909-give-the-dispatch-record ──▶ BL-260906-harden-dispatch-launch
BL-260906-harden-dispatch-launch - -▶ BL-260711-add-root-owned-dispatch-broker
BL-260927-validate-recon-worker ──▶ BL-260830-integrate-recon-with-oat
BL-260927-validate-recon-worker ──▶ BL-260830-integrate-recon-across
BL-260719-add-pinned-recon-agents ──▶ BL-260830-integrate-recon-with-oat
BL-260719-add-pinned-recon-agents ──▶ BL-260830-integrate-recon-across
BL-260927-validate-recon-worker [+] BL-260909-repair-the-bare-fences-that   (one oat-reviewer.md bump)
BL-260726-validate-cursor-pin-effort - -▶ BL-260925-add-grok-4-7-cursor-pin   (same catalog.ts)
BL-260827-refresh-provider-codex-md - -▶ BL-260909-re-source-the-surviving-codex
BL-260909-re-source-the-surviving-codex [+] BL-260908-restructure-the-authoring

Config, sync, and tools (Lanes D, E)
BL-260927-preserve-oat-config-json-key [+] BL-260909-reject-malformed-nested-values
BL-260927-preserve-oat-config-json-key - -▶ BL-260830-persist-instruction-sync
BL-260830-persist-instruction-sync ──▶ BL-260830-add-per-claude-md-adoption-opt
BL-260927-preserve-oat-config-json-key - -▶ BL-260909-surface-config-warnings
BL-260909-surface-config-warnings - -▶ BL-260909-wave-7-review-polish-leftovers
BL-260927-add-a-side-effect-free-dry-run - -▶ BL-260909-wave-7-review-polish-leftovers
BL-260903-close-manual-only-agents-md [+] BL-260927-name-only-installed-pack
BL-260903-close-manual-only-agents-md - -▶ BL-260903-retire-deprecated-pack
BL-260909-restamp-a-stale-copy-strategy - -▶ BL-260909-use-handle-bound-traversal
BL-260911-make-docs-bootstrap-a-front - -▶ BL-260911-support-per-tool-scope

Skills, validation, and lifecycle prose (Lanes B, F)
BL-260830-add-strict-yaml-validation - -▶ BL-260819-classify-canonical-skills-by   (validation/skills*.ts)
BL-260908-retire-the-top-level-skill ──▶ BL-260908-remove-the-top-level-skill   (retire is superseded; close it)
BL-260908-remove-the-top-level-skill - -▶ BL-260906-give-project-state-frontmatter   (same frontmatter.ts)
BL-260927-derive-or-label-the-dispatch - -▶ BL-260906-make-the-dispatch-stamp   (dispatch-stamp-contract.test.ts)
BL-260907-route-quick-mode-discovery - -▶ BL-260908-restructure-the-authoring   (named-skill-load-contract.test.ts)
BL-260713-root-agent-judgment-logging [+] BL-260927-add-a-side-effect-free-dry-run
BL-260908-tighten-the-pr-final-ledger [+] BL-260908-repair-or-exempt-archived
BL-260909-fix-the-agents-md-unsafe [+] BL-260904-stabilize-the-collection

Docs, explainer, wave tooling, remote review (Lane G)
BL-260912-evaluate-replacing-explainer ──▶ BL-260728-additional-visual-workflows
BL-260718-document-execution-program ──▶ BL-260718-add-oat-wave-lifecycle-cli
BL-260718-rewrite-worktree-bootstrap - -▶ BL-260718-add-oat-wave-lifecycle-cli
BL-260830-wire-provide-remote-skills ──▶ BL-260830-add-remote-review-respond

External blockers
(no guarded symlinkat-class Node primitive) ──▶ BL-260724-support-provider-directory
(no openat-style Node walk) ──▶ BL-260909-use-handle-bound-traversal

Independent (no hard dependency on another active item)
BL-260927-stop-resolve-providers-sh-from [independent]
BL-260927-name-the-file-in-canonical [independent]
BL-260909-make-oat-sync-scope-all-report [independent]
BL-260908-validate-the-catalog-refresh [independent]
BL-260927-require-a-per-item-walkthrough [independent]
BL-260909-give-packages-control-plane [independent]
BL-260909-rewrite-inbound-references [independent]
BL-260907-record-absorbed-projects [independent]
BL-260718-support-fumadocs-in-oat-docs [independent]
BL-260903-verify-the-packs-inventory [independent]
BL-260906-report-errno-for-asset-root [independent]
BL-260907-ignore-backslash-escaped [independent]
BL-260908-align-the-provider-view-json [independent]
BL-260908-date-decision-record-ids [independent]
BL-260907-type-check-cli-test-files [independent]
BL-260904-make-quick-the-default-oat [independent; solo wave]
BL-260906-re-evaluate-universal-plan [independent]
BL-260830-make-documentation-aware [independent]
BL-260830-wire-bounded-durable-reference [independent]
BL-260830-cli-flag-help-p2-p3-cleanup [independent]
BL-260830-live-dogfood-oat-brainstorm [independent]
BL-260903-close-claude-runtime-lineage [independent]
BL-260903-project-document-should-prompt [independent]
BL-260906-project-journal-reservation [independent]
BL-260906-make-the-phase-implementer [independent]
BL-260909-make-findsection-comment-aware [independent]
BL-260827-span-based-prose-guards [independent]
BL-260909-add-a-grep-by-shape-control [independent]
BL-260725-classify-general-sync-owned [independent]
BL-260901-consolidate-terminal-remote [independent]
BL-260706-front-load-recurring-gate [independent]
BL-260719-evaluate-broader-final-gate [independent]
BL-260830-re-evaluate-same-target-gate [independent]
BL-260902-append-only-lifecycle-history [independent; decision-gated on #251]
BL-260907-recognize-phase-level [independent]
BL-260927-expose-a-scoped-template [independent; decision-gated]
BL-260830-decide-generic-oat-ownership [independent]
BL-260830-decide-whether-oat-owns [independent]
BL-260830-memory-subsystem-ownership [independent]
BL-260830-benchmark-listprojects-before [independent]
BL-260708-verify-cursor-gpt-5-6-subagent [close]
BL-260908-restore-recon-s-cheap-fan-out [close]
BL-260909-show-the-brainstorm-pack [re-scope or close]
```

**ID legend** (every ID used above):

| ID                                       | Title                                                                                                 |
| ---------------------------------------- | ----------------------------------------------------------------------------------------------------- |
| BL-260706-front-load-recurring-gate      | Front-load recurring gate-finding classes into implementer briefs                                     |
| BL-260708-verify-cursor-gpt-5-6-subagent | Verify Cursor GPT-5.6 subagent model slugs                                                            |
| BL-260711-add-activity-aware-gate        | Add activity-aware gate timeouts                                                                      |
| BL-260711-add-root-owned-dispatch-broker | Add root-owned dispatch broker for exact OAT subagent launches                                        |
| BL-260711-skip-re-review-for-bookkeeping | Skip re-review for bookkeeping-only review findings                                                   |
| BL-260713-root-agent-judgment-logging    | Root-agent judgment logging responsibility for project log                                            |
| BL-260718-add-oat-wave-lifecycle-cli     | Add oat wave lifecycle CLI command family                                                             |
| BL-260718-document-execution-program     | Document execution-program artifact as stable OAT contract                                            |
| BL-260718-harden-full-surface-gate       | Harden full-surface gate reviews against budget and recursive dispatch                                |
| BL-260718-rewrite-worktree-bootstrap     | Rewrite worktree bootstrap-group as tested TypeScript command                                         |
| BL-260718-support-fumadocs-in-oat-docs   | Support Fumadocs in oat docs nav sync (currently MkDocs-only)                                         |
| BL-260719-add-pinned-recon-agents        | Add pinned recon agents for reusable orchestration                                                    |
| BL-260719-evaluate-broader-final-gate    | Evaluate broader final-gate freshness policy after narrow optimization                                |
| BL-260720-add-oat-project-complete-auto  | Add oat-project-complete-auto companion skill for autonomous closeouts                                |
| BL-260724-support-provider-directory     | Support provider directory symlinks as full collection sync                                           |
| BL-260725-classify-general-sync-owned    | Classify general sync-owned dirt in project-start preflight                                           |
| BL-260726-validate-cursor-pin-effort     | Validate Cursor pin effort rungs at sync time                                                         |
| BL-260728-additional-visual-workflows    | Additional visual workflows                                                                           |
| BL-260729-implement-reviewplan-first     | Implement ReviewPlan-first reviewer workflow                                                          |
| BL-260806-fail-closed-when-configured    | Fail closed when configured closeout snapshot is absent                                               |
| BL-260818-distinguish-operator-directed  | Distinguish operator-directed review rounds from failed fix cycles in the review-cycle cap            |
| BL-260819-classify-canonical-skills-by   | Classify canonical skills by distribution, lifecycle, and tenant scope                                |
| BL-260820-bind-each-gate-review          | Bind each gate review disposition to its exact received ledger event                                  |
| BL-260820-emit-source-qualified          | Emit source-qualified provenance envelopes for review and gate receipts                               |
| BL-260820-track-pr-closeout-evidence     | Track PR-closeout evidence freshness against the current head                                         |
| BL-260826-decide-whether-test-only-paths | Decide whether test-only paths under packages/cli/src count as publishable                            |
| BL-260827-refresh-provider-codex-md      | Refresh provider-codex.md for the ultra effort tier, the GPT-5.4 retirement, and per-subcommand flags |
| BL-260827-span-based-prose-guards        | Span-based prose guards, anchored probe records, and a shared probe runner for skill contract tests   |
| BL-260829-order-phase-bookkeeping-before | Order phase bookkeeping before per-phase review dispatch                                              |
| BL-260830-add-per-claude-md-adoption-opt | Add per-CLAUDE.md adoption opt-out for instruction sync                                               |
| BL-260830-add-remote-review-respond      | Add remote review respond and summarize skill set                                                     |
| BL-260830-add-strict-yaml-validation     | Add strict YAML validation to oat skill validation                                                    |
| BL-260830-benchmark-listprojects-before  | Benchmark listProjects before approving a summary fast path                                           |
| BL-260830-cli-flag-help-p2-p3-cleanup    | CLI flag/help P2-P3 cleanup                                                                           |
| BL-260830-complete-control-plane-backed  | Complete control-plane-backed lifecycle reads                                                         |
| BL-260830-decide-generic-oat-ownership   | Decide generic OAT ownership of Jira backlog refinement                                               |
| BL-260830-decide-whether-oat-owns        | Decide whether OAT owns dependency intelligence                                                       |
| BL-260830-integrate-recon-across         | Integrate recon across analysis and research workflows                                                |
| BL-260830-integrate-recon-with-oat       | Integrate recon with OAT discovery and quick start                                                    |
| BL-260830-live-dogfood-oat-brainstorm    | Live dogfood oat-brainstorm destination and fold-back safety                                          |
| BL-260830-make-documentation-aware       | Make documentation-aware discovery prerequisites configurable                                         |
| BL-260830-memory-subsystem-ownership     | Memory subsystem ownership decision for OAT                                                           |
| BL-260830-persist-instruction-sync       | Persist instruction sync strategy in config and init                                                  |
| BL-260830-re-evaluate-same-target-gate   | Re-evaluate same-target gate execution                                                                |
| BL-260830-wire-bounded-durable-reference | Wire bounded durable-reference reads into lifecycle skills                                            |
| BL-260830-wire-provide-remote-skills     | Wire provide-remote skills to the review-remote helper CLI                                            |
| BL-260901-add-corrective-revision        | Add corrective-revision transition after review exhaustion                                            |
| BL-260901-consolidate-terminal-remote    | Consolidate terminal remote-ref advertisement parsing                                                 |
| BL-260902-append-only-lifecycle-history  | Append-only lifecycle history after completion                                                        |
| BL-260902-decide-test-only-freshness     | Decide test-only freshness exception for the implement exit gate                                      |
| BL-260902-file-deferred-repository       | File deferred repository follow-ups from a passing receive                                            |
| BL-260903-close-claude-runtime-lineage   | Close Claude runtime lineage depth and unverified provider shapes                                     |
| BL-260903-close-manual-only-agents-md    | Close manual-only AGENTS.md refresh loop                                                              |
| BL-260903-project-document-should-prompt | project-document should prompt a re-run when review fixes change a shipped contract                   |
| BL-260903-retire-deprecated-pack         | Retire deprecated pack placement and dead evidence diagnostics                                        |
| BL-260903-verify-the-packs-inventory     | Verify the packs:inventory path-redaction claim in troubleshooting docs                               |
| BL-260904-make-quick-the-default-oat     | Make quick the default OAT workflow mode and spec-driven the explicit larger mode                     |
| BL-260904-stabilize-the-collection       | Stabilize the collection-detach engine integration test                                               |
| BL-260906-give-project-state-frontmatter | Give PROJECT_STATE_FRONTMATTER_FIELDS a production consumer or delete it                              |
| BL-260906-harden-dispatch-launch         | Harden dispatch launch baselines and terminal reconciliation                                          |
| BL-260906-make-the-dispatch-stamp        | Make the dispatch-stamp contract helper reject bold-step boundaries and normal-path shim permissions  |
| BL-260906-make-the-phase-implementer     | Make the phase-implementer sweep contract test negation-aware                                         |
| BL-260906-project-journal-reservation    | Project journal reservation state into the smoke evidence bundle                                      |
| BL-260906-re-evaluate-universal-plan     | Re-evaluate universal plan proof strategy and test-first guidance                                     |
| BL-260906-report-errno-for-asset-root    | Report errno for asset root stat failures and reset the statRedirects test seam                       |
| BL-260907-ignore-backslash-escaped       | Ignore backslash-escaped emphasis in skill-script reference extraction                                |
| BL-260907-recognize-phase-level          | Recognize phase-level completion records so bullet-list revision phases do not read as incomplete     |
| BL-260907-record-absorbed-projects       | Record absorbed projects and backlog items for Lite consolidations                                    |
| BL-260907-route-quick-mode-discovery     | Route quick-mode discovery rows in oat-project-next and oat-project-progress straight to quick-start  |
| BL-260907-type-check-cli-test-files      | Type-check CLI test files with a test-scoped tsconfig gate                                            |
| BL-260908-align-the-provider-view-json   | Align the provider-view JSON, evidence states, and docs with the human row                            |
| BL-260908-date-decision-record-ids       | Date decision-record IDs in local time or document UTC                                                |
| BL-260908-remove-the-top-level-skill     | Remove the top-level skill version read after the alias error has been quiet                          |
| BL-260908-repair-or-exempt-archived      | Repair or exempt archived project ledgers that fail the pr-final path guard                           |
| BL-260908-restore-recon-s-cheap-fan-out  | Restore recon's cheap-fan-out intent with per-wave routing under one approval envelope                |
| BL-260908-restructure-the-authoring      | Restructure the authoring skills for progressive disclosure and decide proactive invocation           |
| BL-260908-retire-the-top-level-skill     | Retire the top-level skill version alias on the recorded schedule                                     |
| BL-260908-tighten-the-pr-final-ledger    | Tighten the pr-final ledger guard's prose and escaped-pipe boundary                                   |
| BL-260908-validate-the-catalog-refresh   | Validate the catalog-refresh policy state in normalizeSyncEvidence                                    |
| BL-260909-add-a-grep-by-shape-control    | Add a grep-by-shape control for own-key sweeps keyed to variable names                                |
| BL-260909-fix-the-agents-md-unsafe       | Fix the agents-md unsafe-directory test race under parallel turbo                                     |
| BL-260909-give-packages-control-plane    | Give packages/control-plane a check script so its formatting is CI-gated                              |
| BL-260909-give-the-dispatch-record       | Give the dispatch record a consumer or remove it                                                      |
| BL-260909-make-findsection-comment-aware | Make findSection comment-aware in the bundled-docs contract test                                      |
| BL-260909-make-oat-sync-scope-all-report | Make oat sync --scope all report a sibling scope's failure in the plan body                           |
| BL-260909-re-source-the-surviving-codex  | Re-source the surviving Codex provider claims and repair the dead provider-reference URLs             |
| BL-260909-reject-malformed-nested-values | Reject malformed nested values in the strict pjm.remote shared reader                                 |
| BL-260909-repair-the-bare-fences-that    | Repair the bare fences that swallow headings outside .agents/skills                                   |
| BL-260909-restamp-a-stale-copy-strategy  | Restamp a stale copy-strategy contentHash on skip and retire the pre-framing digest bridge            |
| BL-260909-rewrite-inbound-references     | Rewrite inbound references when oat backlog archive moves an item                                     |
| BL-260909-show-the-brainstorm-pack       | Show the brainstorm pack in the oat-doctor dashboard example and pack enumeration                     |
| BL-260909-surface-config-warnings        | Surface config warnings on every reader path and document the warnings field                          |
| BL-260909-use-handle-bound-traversal     | Use handle-bound traversal in the managed-copy and manifest filesystem readers                        |
| BL-260909-wave-7-review-polish-leftovers | Wave-7 review polish leftovers                                                                        |
| BL-260911-make-docs-bootstrap-a-front    | Make docs bootstrap a front door for existing docs and support the docs-directory convention          |
| BL-260911-support-per-tool-scope         | Support per-tool scope migration in oat tools migrate                                                 |
| BL-260912-evaluate-replacing-explainer   | Evaluate replacing Explainer Kit authoring guidance with a pinned Effective HTML subset               |
| BL-260925-add-grok-4-7-cursor-pin        | Add Grok 4.7 Cursor pin mappings                                                                      |
| BL-260927-add-a-side-effect-free-dry-run | Add a side-effect-free dry run to oat project log append                                              |
| BL-260927-derive-current-lifecycle-state | Derive current lifecycle state from one authority for review, phase, and publication status           |
| BL-260927-derive-or-label-the-dispatch   | Derive or label the dispatch audit line from the gate invocation in gate-originated reviews           |
| BL-260927-detect-unfilled-placeholders   | Detect unfilled placeholders and frontmatter-body drift at PR-final and completion                    |
| BL-260927-expose-a-scoped-template       | Expose a scoped template resolver command and route lifecycle skills through it                       |
| BL-260927-give-gate-receipts-portable    | Give gate receipts portable ownership, path-neutral identities, and a shipped ignore rule             |
| BL-260927-make-the-managed-claude        | Make the managed Claude dispatch-record input producible and self-describing                          |
| BL-260927-name-only-installed-pack       | Name only installed pack locations in the OAT tools guidance block                                    |
| BL-260927-name-the-file-in-canonical     | Name the file in canonical rule parse errors and keep one bad rule from aborting sync                 |
| BL-260927-preserve-oat-config-json-key   | Preserve .oat/config.json key order and skip no-op config writes                                      |
| BL-260927-record-owner-overrides         | Record owner overrides of exhausted configured gates as structured state                              |
| BL-260927-require-a-per-item-walkthrough | Require a per-item walkthrough of retro register items in the final report                            |
| BL-260927-share-one-hook-safe-exact-path | Share one hook-safe exact-path commit primitive across CLI and skill lifecycle commits                |
| BL-260927-stop-resolve-providers-sh-from | Stop resolve-providers.sh from aborting when the last auto-detect test is false                       |
| BL-260927-validate-recon-worker          | Validate recon-worker assignment envelopes deterministically before launch                            |

---

## 4. Parallel Lanes

These are independent work streams that can be tackled concurrently without
conflicts. The lanes match the catalog grouping in Section 2. Within a lane, the
diagram shows internal ordering and bundles; cross-lane edges are listed per
lane.

### Lane A: Review chain and gate integrity

The review-gate-integrity and review-plan-workflow projects. These items share
review ledgers, gate code (`packages/cli/src/commands/gate/index.ts`), closeout
prose, and lifecycle state. Most are project-shaped, not wave lanes; the
wave-ready slices are carved out explicitly in Section 5.

```text
BL-260729-implement-reviewplan-first
  └─▶ BL-260820-bind-each-gate-review  (#305 slice is wave-ready; event binding is project-owned)
        ├─▶ BL-260820-emit-source-qualified
        │     └─▶ BL-260820-track-pr-closeout-evidence  ◀── BL-260902-decide-test-only-freshness (lane H)
        │           └─▶ BL-260720-add-oat-project-complete-auto  ◀── BL-260806-fail-closed-when-configured
        ├─▶ BL-260711-skip-re-review-for-bookkeeping  ◀── BL-260829-order-phase-bookkeeping-before
        └─▶ BL-260902-file-deferred-repository
BL-260718-harden-full-surface-gate ─▶ BL-260711-add-activity-aware-gate  (serial: same gate/index.ts)
[merge first] BL-260818-distinguish-operator-directed + BL-260927-record-owner-overrides + BL-260901-add-corrective-revision
BL-260927-derive-current-lifecycle-state - -▶ BL-260927-detect-unfilled-placeholders, BL-260830-complete-control-plane-backed
BL-260927-give-gate-receipts-portable ◀─ ─▶ BL-260927-share-one-hook-safe-exact-path  (both cite #312)
```

**Items in this lane:**

- **BL-260729-implement-reviewplan-first** — Implement ReviewPlan-first reviewer
  workflow
- **BL-260820-bind-each-gate-review** — Bind each gate review disposition to its
  exact received ledger event
- **BL-260820-emit-source-qualified** — Emit source-qualified provenance
  envelopes for review and gate receipts
- **BL-260820-track-pr-closeout-evidence** — Track PR-closeout evidence
  freshness against the current head
- **BL-260829-order-phase-bookkeeping-before** — Order phase bookkeeping before
  per-phase review dispatch
- **BL-260711-skip-re-review-for-bookkeeping** — Skip re-review for
  bookkeeping-only review findings
- **BL-260806-fail-closed-when-configured** — Fail closed when configured
  closeout snapshot is absent
- **BL-260720-add-oat-project-complete-auto** — Add oat-project-complete-auto
  companion skill for autonomous closeouts
- **BL-260718-harden-full-surface-gate** — Harden full-surface gate reviews
  against budget and recursive dispatch
- **BL-260711-add-activity-aware-gate** — Add activity-aware gate timeouts
- **BL-260818-distinguish-operator-directed** — Distinguish operator-directed
  review rounds from failed fix cycles in the review-cycle cap
- **BL-260927-record-owner-overrides** — Record owner overrides of exhausted
  configured gates as structured state
- **BL-260901-add-corrective-revision** — Add corrective-revision transition
  after review exhaustion
- **BL-260902-file-deferred-repository** — File deferred repository follow-ups
  from a passing receive
- **BL-260902-append-only-lifecycle-history** — Append-only lifecycle history
  after completion
- **BL-260927-derive-current-lifecycle-state** — Derive current lifecycle state
  from one authority for review, phase, and publication status
- **BL-260927-detect-unfilled-placeholders** — Detect unfilled placeholders and
  frontmatter-body drift at PR-final and completion
- **BL-260927-give-gate-receipts-portable** — Give gate receipts portable
  ownership, path-neutral identities, and a shipped ignore rule
- **BL-260927-share-one-hook-safe-exact-path** — Share one hook-safe exact-path
  commit primitive across CLI and skill lifecycle commits
- **BL-260830-complete-control-plane-backed** — Complete control-plane-backed
  lifecycle reads
- **BL-260830-re-evaluate-same-target-gate** — Re-evaluate same-target gate
  execution
- **BL-260719-evaluate-broader-final-gate** — Evaluate broader final-gate
  freshness policy after narrow optimization
- **BL-260706-front-load-recurring-gate** — Front-load recurring gate-finding
  classes into implementer briefs
- **BL-260906-re-evaluate-universal-plan** — Re-evaluate universal plan proof
  strategy and test-first guidance

**Total estimated effort:** High  
**Cross-lane dependencies:** Lane H decides the test-only freshness policy that
`BL-260820-track-pr-closeout-evidence` (Track PR-closeout evidence freshness
against the current head) needs. Lane B's lifecycle-skill items edit the same
`oat-project-implement`, review, retro, and complete skills, so run at most one
review-chain item per wave. `BL-260927-derive-or-label-the-dispatch` (Derive or
label the dispatch audit line from the gate invocation in gate-originated
reviews) (lane B) edits the gate artifact validator next to this lane's gate
code.

### Lane B: Lifecycle skill prose and routing

Bounded prose and routing changes to lifecycle skills. Individually small, but
they collide on skill files, version bumps, and the
`named-skill-load-contract.test.ts` pin file.

```text
BL-260927-derive-or-label-the-dispatch   (review-provide + -remote twin)   ┐
BL-260927-require-a-per-item-walkthrough (retro)                          ├─ disjoint files; Wave 1
BL-260907-record-absorbed-projects       (lite)                           ┘
BL-260907-route-quick-mode-discovery ── shares named-skill-load-contract.test.ts ── BL-260908-restructure-the-authoring (lane G)
BL-260713-root-agent-judgment-logging + BL-260927-add-a-side-effect-free-dry-run  (both edit project-log guidance)
BL-260908-tighten-the-pr-final-ledger + BL-260908-repair-or-exempt-archived  (one pr-final bump)
BL-260927-expose-a-scoped-template  (needs precedence decision; touches ~9 lifecycle skills incl. retro)
BL-260904-make-quick-the-default-oat  (solo wave; workflow-mode change inventory)
```

**Items in this lane:**

- **BL-260927-derive-or-label-the-dispatch** — Derive or label the dispatch
  audit line from the gate invocation in gate-originated reviews
- **BL-260927-require-a-per-item-walkthrough** — Require a per-item walkthrough
  of retro register items in the final report
- **BL-260713-root-agent-judgment-logging** — Root-agent judgment logging
  responsibility for project log
- **BL-260927-add-a-side-effect-free-dry-run** — Add a side-effect-free dry run
  to oat project log append
- **BL-260907-recognize-phase-level** — Recognize phase-level completion records
  so bullet-list revision phases do not read as incomplete
- **BL-260907-record-absorbed-projects** — Record absorbed projects and backlog
  items for Lite consolidations
- **BL-260907-route-quick-mode-discovery** — Route quick-mode discovery rows in
  oat-project-next and oat-project-progress straight to quick-start
- **BL-260908-tighten-the-pr-final-ledger** — Tighten the pr-final ledger
  guard's prose and escaped-pipe boundary
- **BL-260908-repair-or-exempt-archived** — Repair or exempt archived project
  ledgers that fail the pr-final path guard
- **BL-260903-project-document-should-prompt** — project-document should prompt
  a re-run when review fixes change a shipped contract
- **BL-260927-expose-a-scoped-template** — Expose a scoped template resolver
  command and route lifecycle skills through it
- **BL-260830-wire-bounded-durable-reference** — Wire bounded durable-reference
  reads into lifecycle skills
- **BL-260830-make-documentation-aware** — Make documentation-aware discovery
  prerequisites configurable
- **BL-260904-make-quick-the-default-oat** — Make quick the default OAT workflow
  mode and spec-driven the explicit larger mode

**Total estimated effort:** Medium  
**Cross-lane dependencies:** Shares skill files with lane A;
`BL-260904-make-quick-the-default-oat` (Make quick the default OAT workflow mode
and spec-driven the explicit larger mode) conflicts with every concurrent skill
lane. `BL-260907-recognize-phase-level` (Recognize phase-level completion
records so bullet-list revision phases do not read as incomplete) touches the
control-plane parser and `router.test.ts`.

### Lane C: Dispatch, providers, and recon

Dispatch-record producibility and fate, launch hardening, recon validation and
integration, and provider model-pin references.

```text
BL-260927-make-the-managed-claude  (Wave 1; keep the validate-only consumer)
  - -▶ BL-260909-give-the-dispatch-record  (decision: journal persistence consumer vs removal)
          └─▶ BL-260906-harden-dispatch-launch  (#265 baselines, #266 reconciliation; own project)
                - -▶ BL-260711-add-root-owned-dispatch-broker
BL-260927-validate-recon-worker ─▶ BL-260830-integrate-recon-with-oat ─▶ BL-260830-integrate-recon-across
BL-260719-add-pinned-recon-agents ─▶ BL-260830-integrate-recon-with-oat, BL-260830-integrate-recon-across
BL-260726-validate-cursor-pin-effort ◀─ ─▶ BL-260925-add-grok-4-7-cursor-pin  (same catalog.ts; serialize)
BL-260827-refresh-provider-codex-md - -▶ BL-260909-re-source-the-surviving-codex
```

**Items in this lane:**

- **BL-260927-make-the-managed-claude** — Make the managed Claude
  dispatch-record input producible and self-describing
- **BL-260909-give-the-dispatch-record** — Give the dispatch record a consumer
  or remove it
- **BL-260906-harden-dispatch-launch** — Harden dispatch launch baselines and
  terminal reconciliation
- **BL-260711-add-root-owned-dispatch-broker** — Add root-owned dispatch broker
  for exact OAT subagent launches
- **BL-260906-project-journal-reservation** — Project journal reservation state
  into the smoke evidence bundle
- **BL-260903-close-claude-runtime-lineage** — Close Claude runtime lineage
  depth and unverified provider shapes
- **BL-260927-validate-recon-worker** — Validate recon-worker assignment
  envelopes deterministically before launch
- **BL-260719-add-pinned-recon-agents** — Add pinned recon agents for reusable
  orchestration
- **BL-260830-integrate-recon-with-oat** — Integrate recon with OAT discovery
  and quick start
- **BL-260830-integrate-recon-across** — Integrate recon across analysis and
  research workflows
- **BL-260908-restore-recon-s-cheap-fan-out** — Restore recon's cheap-fan-out
  intent with per-wave routing under one approval envelope
- **BL-260708-verify-cursor-gpt-5-6-subagent** — Verify Cursor GPT-5.6 subagent
  model slugs
- **BL-260726-validate-cursor-pin-effort** — Validate Cursor pin effort rungs at
  sync time
- **BL-260925-add-grok-4-7-cursor-pin** — Add Grok 4.7 Cursor pin mappings
- **BL-260827-refresh-provider-codex-md** — Refresh provider-codex.md for the
  ultra effort tier, the GPT-5.4 retirement, and per-subcommand flags
- **BL-260909-re-source-the-surviving-codex** — Re-source the surviving Codex
  provider claims and repair the dead provider-reference URLs

**Total estimated effort:** High  
**Cross-lane dependencies:** `BL-260927-validate-recon-worker` (Validate
recon-worker assignment envelopes deterministically before launch) edits
`.agents/agents/oat-reviewer.md` with `BL-260909-repair-the-bare-fences-that`
(Repair the bare fences that swallow headings outside .agents/skills) (lane F);
bundle them for one version bump. Dispatch receipts overlap lane A's provenance
items.

### Lane D: Config and instruction sync

`packages/cli/src/config/oat-config.ts`, `config/resolve.ts`,
`commands/config/index.ts`, and instruction-sync config. One lane at a time.

```text
BL-260927-preserve-oat-config-json-key + BL-260909-reject-malformed-nested-values  (Wave 1, one lane)
  ─▶ BL-260830-persist-instruction-sync ─▶ BL-260830-add-per-claude-md-adoption-opt
  ─▶ BL-260909-surface-config-warnings
  ─▶ BL-260909-wave-7-review-polish-leftovers  (lane F; its m4/m5 fixes touch config files)
```

**Items in this lane:**

- **BL-260927-preserve-oat-config-json-key** — Preserve .oat/config.json key
  order and skip no-op config writes
- **BL-260909-reject-malformed-nested-values** — Reject malformed nested values
  in the strict pjm.remote shared reader
- **BL-260830-persist-instruction-sync** — Persist instruction sync strategy in
  config and init
- **BL-260830-add-per-claude-md-adoption-opt** — Add per-CLAUDE.md adoption
  opt-out for instruction sync
- **BL-260909-surface-config-warnings** — Surface config warnings on every
  reader path and document the warnings field

**Total estimated effort:** Medium  
**Cross-lane dependencies:** `BL-260909-wave-7-review-polish-leftovers` (Wave-7
review polish leftovers) (lane F) and the project-log items in lane B touch the
same config and log files.

### Lane E: Sync engine, tools, packs, and CLI surfaces

Sync engine and drift, tools install/update evidence, pack guidance, and small
CLI surfaces. Most items are on separate files and parallelize well.

```text
BL-260927-stop-resolve-providers-sh-from        [independent, Wave 1]
BL-260927-name-the-file-in-canonical            [Wave 1; confirm sync error aggregation does not touch sync/apply.ts]
BL-260909-make-oat-sync-scope-all-report + BL-260908-validate-the-catalog-refresh  [Wave 1, separate files]
BL-260903-close-manual-only-agents-md + BL-260927-name-only-installed-pack ─▶ BL-260903-retire-deprecated-pack
BL-260909-restamp-a-stale-copy-strategy - -▶ BL-260909-use-handle-bound-traversal
BL-260724-support-provider-directory  [blocked: no guarded symlinkat-class Node primitive]
```

**Items in this lane:**

- **BL-260927-stop-resolve-providers-sh-from** — Stop resolve-providers.sh from
  aborting when the last auto-detect test is false
- **BL-260927-name-the-file-in-canonical** — Name the file in canonical rule
  parse errors and keep one bad rule from aborting sync
- **BL-260909-make-oat-sync-scope-all-report** — Make oat sync --scope all
  report a sibling scope's failure in the plan body
- **BL-260908-validate-the-catalog-refresh** — Validate the catalog-refresh
  policy state in normalizeSyncEvidence
- **BL-260908-align-the-provider-view-json** — Align the provider-view JSON,
  evidence states, and docs with the human row
- **BL-260909-restamp-a-stale-copy-strategy** — Restamp a stale copy-strategy
  contentHash on skip and retire the pre-framing digest bridge
- **BL-260909-use-handle-bound-traversal** — Use handle-bound traversal in the
  managed-copy and manifest filesystem readers
- **BL-260724-support-provider-directory** — Support provider directory symlinks
  as full collection sync
- **BL-260725-classify-general-sync-owned** — Classify general sync-owned dirt
  in project-start preflight
- **BL-260903-close-manual-only-agents-md** — Close manual-only AGENTS.md
  refresh loop
- **BL-260927-name-only-installed-pack** — Name only installed pack locations in
  the OAT tools guidance block
- **BL-260903-retire-deprecated-pack** — Retire deprecated pack placement and
  dead evidence diagnostics
- **BL-260903-verify-the-packs-inventory** — Verify the packs:inventory
  path-redaction claim in troubleshooting docs
- **BL-260906-report-errno-for-asset-root** — Report errno for asset root stat
  failures and reset the statRedirects test seam
- **BL-260911-support-per-tool-scope** — Support per-tool scope migration in oat
  tools migrate
- **BL-260909-show-the-brainstorm-pack** — Show the brainstorm pack in the
  oat-doctor dashboard example and pack enumeration
- **BL-260901-consolidate-terminal-remote** — Consolidate terminal remote-ref
  advertisement parsing
- **BL-260909-rewrite-inbound-references** — Rewrite inbound references when oat
  backlog archive moves an item
- **BL-260908-date-decision-record-ids** — Date decision-record IDs in local
  time or document UTC
- **BL-260830-cli-flag-help-p2-p3-cleanup** — CLI flag/help P2-P3 cleanup

**Total estimated effort:** Medium  
**Cross-lane dependencies:** `BL-260911-support-per-tool-scope` (Support
per-tool scope migration in oat tools migrate) is a soft follow-on of
`BL-260911-make-docs-bootstrap-a-front` (Make docs bootstrap a front door for
existing docs and support the docs-directory convention) (lane G).
`BL-260903-close-manual-only-agents-md` (Close manual-only AGENTS.md refresh
loop) shares `commands/init/tools/` with `BL-260903-retire-deprecated-pack`
(Retire deprecated pack placement and dead evidence diagnostics).

### Lane F: Skill validation, contract tests, and CI hygiene

Skill validation, prose-matcher contract tests, flaky tests, and CI gate
coverage. `packages/cli/src/validation/skills.ts` and `skills.test.ts` are a
hidden shared write, so keep at most one lane on them.

```text
BL-260830-add-strict-yaml-validation ─▶ BL-260819-classify-canonical-skills-by  (both write validation/skills*.ts)
BL-260908-retire-the-top-level-skill (close) ─▶ BL-260908-remove-the-top-level-skill ── frontmatter.ts ── BL-260906-give-project-state-frontmatter
BL-260906-make-the-dispatch-stamp + BL-260906-make-the-phase-implementer + BL-260909-make-findsection-comment-aware  (one test-only lane)
BL-260909-fix-the-agents-md-unsafe + BL-260904-stabilize-the-collection  (one flake lane)
BL-260909-give-packages-control-plane  (AGENTS.md + lockstep versions; fan-in owns versions)
BL-260907-type-check-cli-test-files  (solo or last; touches many *.test.ts)
```

**Items in this lane:**

- **BL-260830-add-strict-yaml-validation** — Add strict YAML validation to oat
  skill validation
- **BL-260819-classify-canonical-skills-by** — Classify canonical skills by
  distribution, lifecycle, and tenant scope
- **BL-260908-remove-the-top-level-skill** — Remove the top-level skill version
  read after the alias error has been quiet
- **BL-260908-retire-the-top-level-skill** — Retire the top-level skill version
  alias on the recorded schedule
- **BL-260906-give-project-state-frontmatter** — Give
  PROJECT_STATE_FRONTMATTER_FIELDS a production consumer or delete it
- **BL-260906-make-the-dispatch-stamp** — Make the dispatch-stamp contract
  helper reject bold-step boundaries and normal-path shim permissions
- **BL-260906-make-the-phase-implementer** — Make the phase-implementer sweep
  contract test negation-aware
- **BL-260909-make-findsection-comment-aware** — Make findSection comment-aware
  in the bundled-docs contract test
- **BL-260907-ignore-backslash-escaped** — Ignore backslash-escaped emphasis in
  skill-script reference extraction
- **BL-260827-span-based-prose-guards** — Span-based prose guards, anchored
  probe records, and a shared probe runner for skill contract tests
- **BL-260909-add-a-grep-by-shape-control** — Add a grep-by-shape control for
  own-key sweeps keyed to variable names
- **BL-260909-repair-the-bare-fences-that** — Repair the bare fences that
  swallow headings outside .agents/skills
- **BL-260909-fix-the-agents-md-unsafe** — Fix the agents-md unsafe-directory
  test race under parallel turbo
- **BL-260904-stabilize-the-collection** — Stabilize the collection-detach
  engine integration test
- **BL-260909-give-packages-control-plane** — Give packages/control-plane a
  check script so its formatting is CI-gated
- **BL-260907-type-check-cli-test-files** — Type-check CLI test files with a
  test-scoped tsconfig gate
- **BL-260909-wave-7-review-polish-leftovers** — Wave-7 review polish leftovers

**Total estimated effort:** Medium  
**Cross-lane dependencies:** `BL-260906-make-the-dispatch-stamp` (Make the
dispatch-stamp contract helper reject bold-step boundaries and normal-path shim
permissions) shares `dispatch-stamp-contract.test.ts` with
`BL-260927-derive-or-label-the-dispatch` (Derive or label the dispatch audit
line from the gate invocation in gate-originated reviews) (lane B).
`BL-260909-repair-the-bare-fences-that` (Repair the bare fences that swallow
headings outside .agents/skills) pairs with `BL-260927-validate-recon-worker`
(Validate recon-worker assignment envelopes deterministically before launch)
(lane C).

### Lane G: Docs, explainer, wave tooling, and remote review

Docs pack, Explainer Kit, wave tooling, remote review, brainstorm, and authoring
skills. Mostly evaluation- or trigger-gated.

```text
BL-260911-make-docs-bootstrap-a-front - -▶ BL-260911-support-per-tool-scope (lane E)
BL-260718-support-fumadocs-in-oat-docs  [independent; write real ACs first]
BL-260912-evaluate-replacing-explainer ─▶ BL-260728-additional-visual-workflows
BL-260718-document-execution-program ─▶ BL-260718-add-oat-wave-lifecycle-cli ◀─ ─ BL-260718-rewrite-worktree-bootstrap
BL-260830-wire-provide-remote-skills ─▶ BL-260830-add-remote-review-respond
BL-260908-restructure-the-authoring ◀─ ─▶ BL-260909-re-source-the-surviving-codex (lane C; bundle for one bump)
```

**Items in this lane:**

- **BL-260911-make-docs-bootstrap-a-front** — Make docs bootstrap a front door
  for existing docs and support the docs-directory convention
- **BL-260718-support-fumadocs-in-oat-docs** — Support Fumadocs in oat docs nav
  sync (currently MkDocs-only)
- **BL-260912-evaluate-replacing-explainer** — Evaluate replacing Explainer Kit
  authoring guidance with a pinned Effective HTML subset
- **BL-260728-additional-visual-workflows** — Additional visual workflows
- **BL-260718-add-generated-runbook** — Add generated-runbook verification
  command pass
- **BL-260718-document-execution-program** — Document execution-program artifact
  as stable OAT contract
- **BL-260718-add-oat-wave-lifecycle-cli** — Add oat wave lifecycle CLI command
  family
- **BL-260718-rewrite-worktree-bootstrap** — Rewrite worktree bootstrap-group as
  tested TypeScript command
- **BL-260830-wire-provide-remote-skills** — Wire provide-remote skills to the
  review-remote helper CLI
- **BL-260830-add-remote-review-respond** — Add remote review respond and
  summarize skill set
- **BL-260830-live-dogfood-oat-brainstorm** — Live dogfood oat-brainstorm
  destination and fold-back safety
- **BL-260908-restructure-the-authoring** — Restructure the authoring skills for
  progressive disclosure and decide proactive invocation

**Total estimated effort:** High  
**Cross-lane dependencies:** `BL-260830-live-dogfood-oat-brainstorm` (Live
dogfood oat-brainstorm destination and fold-back safety) overlaps open PR #125.
`BL-260908-restructure-the-authoring` (Restructure the authoring skills for
progressive disclosure and decide proactive invocation) shares the
`named-skill-load-contract.test.ts` pin with
`BL-260907-route-quick-mode-discovery` (Route quick-mode discovery rows in
oat-project-next and oat-project-progress straight to quick-start) (lane B).

### Lane H: Product and policy decisions (human-only)

Decisions only a human can make. Several are cheap and unblock implementation
items elsewhere.

```text
BL-260902-decide-test-only-freshness + BL-260826-decide-whether-test-only-paths  (decide together)
  ─▶ BL-260820-track-pr-closeout-evidence (lane A)
BL-260830-decide-generic-oat-ownership   [independent]
BL-260830-decide-whether-oat-owns        [independent]
BL-260830-memory-subsystem-ownership     [independent; deferred until provider interop matures]
BL-260830-benchmark-listprojects-before  [independent; approval-gated]
```

**Items in this lane:**

- **BL-260902-decide-test-only-freshness** — Decide test-only freshness
  exception for the implement exit gate
- **BL-260826-decide-whether-test-only-paths** — Decide whether test-only paths
  under packages/cli/src count as publishable
- **BL-260830-decide-generic-oat-ownership** — Decide generic OAT ownership of
  Jira backlog refinement
- **BL-260830-decide-whether-oat-owns** — Decide whether OAT owns dependency
  intelligence
- **BL-260830-memory-subsystem-ownership** — Memory subsystem ownership decision
  for OAT
- **BL-260830-benchmark-listprojects-before** — Benchmark listProjects before
  approving a summary fast path

**Total estimated effort:** Low (human time)  
**Cross-lane dependencies:** Other decision gates live inside implementation
items: the dispatch-record fate (lane C), template precedence (lane B), receipt
ownership (lane A), top-level version removal scope (lane F), and local-vs-UTC
decision IDs (lane E).

---

## 5. Recommended Execution Order

Waves are compositions of wave-ready items with disjoint write sets. The
review-chain rule applies throughout: at most one Lane A item that edits the
shared `oat-project-implement`, review-receive, retro, or complete skills per
wave. Every wave's fan-in owns the lockstep five-package version bump. Lanes run
`oat sync --scope project`, never `--scope all`.

### Wave 1 — Confirmed breakage and small correctness fixes (recommended; pending operator approval)

This is the recommended next batch. It is a recommendation only: the operator
approves the batch, the lane count, and the order before any plan is written.
Every item is rated wave-ready by its lane, and the defect fixes carry a
reproducible negative control.

| Order | Item                                                                                                                                     | Effort | Rationale                                                                                                                                                                               |
| ----- | ---------------------------------------------------------------------------------------------------------------------------------------- | ------ | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 1a    | **BL-260927-stop-resolve-providers-sh-from** — Stop resolve-providers.sh from aborting when the last auto-detect test is false           | Low    | Confirmed live breakage (#324) of agent-instructions analyze and apply in most repositories; XS script fix plus the first script test.                                                  |
| 1b    | **BL-260927-make-the-managed-claude** — Make the managed Claude dispatch-record input producible and self-describing                     | Medium | High-priority mandatory pre-launch check that cannot be satisfied from the docs. Keep the existing validate-only consumer; the journal-persistence fate stays with the Wave 4 decision. |
| 1c    | **BL-260927-name-the-file-in-canonical** — Name the file in canonical rule parse errors and keep one bad rule from aborting sync         | Low    | Third-party installers trigger an unnamed `<inline>` parse error that aborts sync; small alias-vs-skip choice is in scope.                                                              |
| 1d    | **BL-260927-derive-or-label-the-dispatch** — Derive or label the dispatch audit line from the gate invocation in gate-originated reviews | Low    | Every gate review currently records a possibly wrong dispatch audit line; skill rule plus a validator check and a differing-effort test.                                                |
| 1e    | **BL-260927-require-a-per-item-walkthrough** — Require a per-item walkthrough of retro register items in the final report                | Low    | Skill-only retro change with a contract test; closes #313/#297 and the #329 wording.                                                                                                    |
| 1f    | **BL-260927-preserve-oat-config-json-key** — Preserve .oat/config.json key order and skip no-op config writes                            | Low    | Stops unrelated `.oat/config.json` diffs in downstream repos. Same lane as 1g.                                                                                                          |
| 1g    | **BL-260909-reject-malformed-nested-values** — Reject malformed nested values in the strict pjm.remote shared reader                     | Low    | Latent strict-reader bug in the same `oat-config.ts`; bundling avoids a same-file conflict.                                                                                             |
| 1h    | **BL-260909-make-oat-sync-scope-all-report** — Make oat sync --scope all report a sibling scope's failure in the plan body               | Low    | User-visible false "No changes required." after a failed sibling scope; bounded fix with a single-scope control.                                                                        |
| 1i    | **BL-260908-validate-the-catalog-refresh** — Validate the catalog-refresh policy state in normalizeSyncEvidence                          | Low    | Latent throw inside an install/update/remove that already succeeded; XS cast-to-validation fix.                                                                                         |

**Parallelism:** Seven lanes can run in parallel: 1a; 1b; 1c; 1d; 1e; 1f+1g (one
config lane); 1h+1i (separate files, one or two lanes). The fan-in owns the
lockstep five-package version bump. Each skill-touching lane bumps only its own
skill (`oat-agent-instructions-analyze`, `oat-project-implement`,
`oat-project-review-provide` and its `-remote` twin, `oat-project-retro`).
Before planning 1c, confirm that its sync error aggregation does not edit
`commands/sync/apply.ts` (1h); if it does, serialize them. Keep
`BL-260906-make-the-dispatch-stamp` (Make the dispatch-stamp contract helper
reject bold-step boundaries and normal-path shim permissions) out of this wave
because 1d edits `dispatch-stamp-contract.test.ts`. None of the nine is a
review-chain item from Lane A, so the one-per-wave rule is not spent; 1b and 1e
do edit `oat-project-implement` and `oat-project-retro`, which is why Wave 2's
review-chain item waits for them to merge.

**Reconciliation in the same wave (no lane):** archive
**BL-260908-restore-recon-s-cheap-fan-out** — Restore recon's cheap-fan-out
intent with per-wave routing under one approval envelope. Every acceptance
criterion is checked and PR #285 merged on 2026-09-12. See Section 6.

### Wave 2 — Guidance loop, CI hygiene, and the first review-chain step

Builds on Wave 1's merged skill edits. Contains exactly one review-chain item
(2b).

| Order | Item                                                                                                                                            | Effort | Rationale                                                                                                                                                                                                                                   |
| ----- | ----------------------------------------------------------------------------------------------------------------------------------------------- | ------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 2a    | **BL-260903-close-manual-only-agents-md** — Close manual-only AGENTS.md refresh loop                                                            | Medium | High operator pain on every new repo (#322); contract fully specified including a negative control. Guidance lane with 2a'.                                                                                                                 |
| 2a'   | **BL-260927-name-only-installed-pack** — Name only installed pack locations in the OAT tools guidance block                                     | Low    | Same `init/tools/project-guidance.ts`; bundle into the 2a lane.                                                                                                                                                                             |
| 2b    | **BL-260829-order-phase-bookkeeping-before** — Order phase bookkeeping before per-phase review dispatch                                         | Medium | The wave's single review-chain item. Prevents repeat Important findings and must precede `BL-260711-skip-re-review-for-bookkeeping` (Skip re-review for bookkeeping-only review findings). Verify AC3 on the next real multi-phase project. |
| 2c    | **BL-260909-give-packages-control-plane** — Give packages/control-plane a check script so its formatting is CI-gated                            | Low    | Closes the documented CI formatting gap; edits AGENTS.md and the lockstep versions, so it merges through the fan-in.                                                                                                                        |
| 2d    | **BL-260909-fix-the-agents-md-unsafe** — Fix the agents-md unsafe-directory test race under parallel turbo                                      | Low    | Removes a parallel-turbo test race; optional sweep of the three sibling flakes. Flake lane with 2d'.                                                                                                                                        |
| 2d'   | **BL-260904-stabilize-the-collection** — Stabilize the collection-detach engine integration test                                                | Low    | Fix already landed; only the ten-uncached-run evidence remains. Close it from the flake lane.                                                                                                                                               |
| 2e    | **BL-260927-validate-recon-worker** — Validate recon-worker assignment envelopes deterministically before launch                                | Low    | Deterministic envelope check before recon launch; pair with 2e' for one `oat-reviewer.md` bump.                                                                                                                                             |
| 2e'   | **BL-260909-repair-the-bare-fences-that** — Repair the bare fences that swallow headings outside .agents/skills                                 | Low    | Same agent role file; re-locate the drifted line numbers first.                                                                                                                                                                             |
| 2f    | **BL-260909-rewrite-inbound-references** — Rewrite inbound references when oat backlog archive moves an item                                    | Low    | Recurs at every wave close; `oat backlog archive` rewrites only frontmatter today.                                                                                                                                                          |
| 2g    | **BL-260907-record-absorbed-projects** — Record absorbed projects and backlog items for Lite consolidations                                     | Low    | Closes the #250 stale-ownership class through the Lite path; skill-only.                                                                                                                                                                    |
| 2h    | **BL-260907-route-quick-mode-discovery** — Route quick-mode discovery rows in oat-project-next and oat-project-progress straight to quick-start | Low    | Removes a stale two-hop route; owns `named-skill-load-contract.test.ts` this wave.                                                                                                                                                          |

**Parallelism:** 2a, 2b, 2c, 2d, 2e, 2f, 2g, and 2h are separate lanes on
disjoint files. 2c merges last in the fan-in because it edits AGENTS.md and the
version files.

### Wave 3 — Gate hardening, closeout guard, and validation follow-through

Two carve-outs from the `review-gate-integrity` project (3a, 3b). Record the
carve-out in that project when the wave is planned. 3b is the wave's single
review-chain skill item.

| Order | Item                                                                                                               | Effort | Rationale                                                                                                                                                                                                  |
| ----- | ------------------------------------------------------------------------------------------------------------------ | ------ | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 3a    | **BL-260718-harden-full-surface-gate** — Harden full-surface gate reviews against budget and recursive dispatch    | Medium | Artifact reviews still default to 900 s and nothing guards recursive gate dispatch; deterministic fake-runtime tests. Must precede `BL-260711-add-activity-aware-gate` (Add activity-aware gate timeouts). |
| 3b    | **BL-260806-fail-closed-when-configured** — Fail closed when configured closeout snapshot is absent                | Medium | Closeout-integrity guard with no technical dependency; `BL-260720-add-oat-project-complete-auto` (Add oat-project-complete-auto companion skill for autonomous closeouts) later consumes it.               |
| 3c    | **BL-260830-persist-instruction-sync** — Persist instruction sync strategy in config and init                      | Medium | Config key, init prompt, and precedence; config lane runs after Wave 1's config lane merged.                                                                                                               |
| 3d    | **BL-260830-add-strict-yaml-validation** — Add strict YAML validation to oat skill validation                      | Low    | Partially shipped; adds the parser location, a field-type check, and a bare-colon fixture. Owns `validation/skills*.ts` this wave.                                                                         |
| 3e    | **BL-260718-support-fumadocs-in-oat-docs** — Support Fumadocs in oat docs nav sync (currently MkDocs-only)         | Low    | Detect-and-fail plus framework-conditional skill wording; write real ACs first (they are placeholders).                                                                                                    |
| 3f    | **BL-260911-support-per-tool-scope** — Support per-tool scope migration in oat tools migrate                       | Low    | Extends existing `tools/migrate/migrate-pack.ts`; clear second AC set.                                                                                                                                     |
| 3g    | **BL-260903-verify-the-packs-inventory** — Verify the packs:inventory path-redaction claim in troubleshooting docs | Low    | XS verify-or-narrow; possible one-line doctor fallback fix.                                                                                                                                                |

**Parallelism:** All seven are separate lanes. Before planning this wave, merge
the three review-cap items into one (see Wave 4 decisions and Section 6).

### Wave 4 — Decisions that unblock, then state-authority slices

Start the decision track as early as Wave 2; it needs operator time, not lanes.
Implementation rows follow their decisions.

| Order | Item                                                                                                                                     | Effort | Rationale                                                                                                                                                                                                                                                                                  |
| ----- | ---------------------------------------------------------------------------------------------------------------------------------------- | ------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| 4-D1  | **BL-260909-give-the-dispatch-record** — Give the dispatch record a consumer or remove it                                                | Medium | Dispatch-record fate decision: a journal-persistence consumer or removal, with the validate-only consumer kept. Gates `BL-260906-harden-dispatch-launch` (Harden dispatch launch baselines and terminal reconciliation).                                                                   |
| 4-D2  | **BL-260902-decide-test-only-freshness** — Decide test-only freshness exception for the implement exit gate                              | Low    | Decide with 4-D3; unblocks `BL-260820-track-pr-closeout-evidence` (Track PR-closeout evidence freshness against the current head) and recurring #237 friction.                                                                                                                             |
| 4-D3  | **BL-260826-decide-whether-test-only-paths** — Decide whether test-only paths under packages/cli/src count as publishable                | Low    | Same test-only classifier; release-version side of the policy.                                                                                                                                                                                                                             |
| 4-D4  | **BL-260818-distinguish-operator-directed** — Distinguish operator-directed review rounds from failed fix cycles in the review-cycle cap | Medium | Review-cap consolidation: merge with `BL-260927-record-owner-overrides` (Record owner overrides of exhausted configured gates as structured state) and `BL-260901-add-corrective-revision` (Add corrective-revision transition after review exhaustion) into one item before any planning. |
| 4-D5  | **BL-260927-expose-a-scoped-template** — Expose a scoped template resolver command and route lifecycle skills through it                 | Medium | User-vs-repo template precedence decision, then the resolver command (~9 lifecycle skills).                                                                                                                                                                                                |
| 4a    | **BL-260820-bind-each-gate-review** — Bind each gate review disposition to its exact received ledger event                               | Medium | #305 slice only (plan-row placeholder, gate target, single-row upsert, quick scaffolds). This is the wave's review-chain item; coordinate with `BL-260927-derive-current-lifecycle-state` (Derive current lifecycle state from one authority for review, phase, and publication status).   |
| 4b    | **BL-260909-restamp-a-stale-copy-strategy** — Restamp a stale copy-strategy contentHash on skip and retire the pre-framing digest bridge | Medium | Restamp, classifier, and validator-widening slice; bridge retirement waits for field installs.                                                                                                                                                                                             |
| 4c    | **BL-260909-surface-config-warnings** — Surface config warnings on every reader path and document the warnings field                     | Medium | Config lane: reader-path warnings plus docs.                                                                                                                                                                                                                                               |
| 4d    | **BL-260713-root-agent-judgment-logging** — Root-agent judgment logging responsibility for project log                                   | Low    | Project-log lane with 4d'; both edit the log-append guidance.                                                                                                                                                                                                                              |
| 4d'   | **BL-260927-add-a-side-effect-free-dry-run** — Add a side-effect-free dry run to oat project log append                                  | Low    | Three-case test matrix; same `project/log/append.ts` area.                                                                                                                                                                                                                                 |
| 4e    | **BL-260819-classify-canonical-skills-by** — Classify canonical skills by distribution, lifecycle, and tenant scope                      | Medium | Solo on `validation/skills*.ts` after 3d merged.                                                                                                                                                                                                                                           |

**Parallelism:** 4a, 4b, 4c, 4d, and 4e are separate lanes. 4-D5's
implementation collides with every lifecycle skill; schedule it as its own wave
once the precedence is decided.

### Wave 5 — Fill-in sweep

Low-value, low-effort items to slot into spare capacity in any wave, grouped so
that shared files stay in one lane.

| Order | Item                                                                                                                                         | Effort | Rationale                                                                                                |
| ----- | -------------------------------------------------------------------------------------------------------------------------------------------- | ------ | -------------------------------------------------------------------------------------------------------- |
| 5a    | **BL-260906-make-the-dispatch-stamp** — Make the dispatch-stamp contract helper reject bold-step boundaries and normal-path shim permissions | Low    | Test-only contract lane with 5a' and 5a''; after Wave 1's 1d merged.                                     |
| 5a'   | **BL-260906-make-the-phase-implementer** — Make the phase-implementer sweep contract test negation-aware                                     | Low    | Same contract-test class.                                                                                |
| 5a''  | **BL-260909-make-findsection-comment-aware** — Make findSection comment-aware in the bundled-docs contract test                              | Low    | Same contract-test class.                                                                                |
| 5b    | **BL-260906-report-errno-for-asset-root** — Report errno for asset root stat failures and reset the statRedirects test seam                  | Low    | Tiny, verifiable message and test-seam fix.                                                              |
| 5c    | **BL-260907-ignore-backslash-escaped** — Ignore backslash-escaped emphasis in skill-script reference extraction                              | Low    | One-line fix plus a fixture.                                                                             |
| 5d    | **BL-260908-align-the-provider-view-json** — Align the provider-view JSON, evidence states, and docs with the human row                      | Low    | Four precise polish points with explicit ACs.                                                            |
| 5e    | **BL-260908-tighten-the-pr-final-ledger** — Tighten the pr-final ledger guard's prose and escaped-pipe boundary                              | Low    | pr-final lane with 5e'; one skill bump.                                                                  |
| 5e'   | **BL-260908-repair-or-exempt-archived** — Repair or exempt archived project ledgers that fail the pr-final path guard                        | Medium | After the repair-vs-exempt decision.                                                                     |
| 5f    | **BL-260908-remove-the-top-level-skill** — Remove the top-level skill version read after the alias error has been quiet                      | Medium | After the scope decision (skills only vs migrating five agent roles); same `frontmatter.ts` lane as 5f'. |
| 5f'   | **BL-260906-give-project-state-frontmatter** — Give PROJECT_STATE_FRONTMATTER_FIELDS a production consumer or delete it                      | Low    | Take the delete path.                                                                                    |
| 5g    | **BL-260908-date-decision-record-ids** — Date decision-record IDs in local time or document UTC                                              | Low    | XS once local-vs-UTC is chosen.                                                                          |
| 5h    | **BL-260909-wave-7-review-polish-leftovers** — Wave-7 review polish leftovers                                                                | Low    | After the config and project-log lanes merged.                                                           |
| 5i    | **BL-260726-validate-cursor-pin-effort** — Validate Cursor pin effort rungs at sync time                                                     | Low    | Serialize with `BL-260925-add-grok-4-7-cursor-pin` (Add Grok 4.7 Cursor pin mappings) on `catalog.ts`.   |
| 5j    | **BL-260907-recognize-phase-level** — Recognize phase-level completion records so bullet-list revision phases do not read as incomplete      | Medium | After the Progress-table vs task-body source-precedence call.                                            |

**Parallelism:** 5a, 5b, 5c, 5d, 5e, 5f, 5g, 5i, and 5j are independent lanes;
5h waits for the config and log lanes.

### Strategic projects (outside the wave cadence)

These need their own OAT project, a decision, or live acceptance before a wave
can take them.

| Item                                                                                                                                       | Sequencing                                                                                                                                                                                                                 |
| ------------------------------------------------------------------------------------------------------------------------------------------ | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **BL-260729-implement-reviewplan-first** — Implement ReviewPlan-first reviewer workflow                                                    | Root of the review chain. Draft PR #190 is stale since 2026-09-02; reconcile and dogfood before any broad review lane.                                                                                                     |
| **BL-260711-skip-re-review-for-bookkeeping** — Skip re-review for bookkeeping-only review findings                                         | Urgent priority, but sequenced after `BL-260829-order-phase-bookkeeping-before` (Order phase bookkeeping before per-phase review dispatch) (Wave 2) and exact event identity.                                              |
| **BL-260820-emit-source-qualified** — Emit source-qualified provenance envelopes for review and gate receipts                              | After event identity; spans every producer family.                                                                                                                                                                         |
| **BL-260820-track-pr-closeout-evidence** — Track PR-closeout evidence freshness against the current head                                   | After provenance and the test-only freshness decision.                                                                                                                                                                     |
| **BL-260720-add-oat-project-complete-auto** — Add oat-project-complete-auto companion skill for autonomous closeouts                       | After fail-closed (Wave 3) and closeout freshness; consumes the fail-closed invariant.                                                                                                                                     |
| **BL-260711-add-activity-aware-gate** — Add activity-aware gate timeouts                                                                   | After Wave 3's gate hardening; reconcile the early-artifact rule with ReviewPlan.                                                                                                                                          |
| **BL-260927-derive-current-lifecycle-state** — Derive current lifecycle state from one authority for review, phase, and publication status | One status authority; architecture decision first. Bounds `BL-260927-detect-unfilled-placeholders` (Detect unfilled placeholders and frontmatter-body drift at PR-final and completion).                                   |
| **BL-260927-detect-unfilled-placeholders** — Detect unfilled placeholders and frontmatter-body drift at PR-final and completion            | Wave-ready per its lane, but hold until the state-authority design exists so it does not pre-empt it.                                                                                                                      |
| **BL-260902-file-deferred-repository** — File deferred repository follow-ups from a passing receive                                        | Needs stable receipt identity from `BL-260820-bind-each-gate-review` (Bind each gate review disposition to its exact received ledger event).                                                                               |
| **BL-260902-append-only-lifecycle-history** — Append-only lifecycle history after completion                                               | Decision-gated on #251 receipt persistence.                                                                                                                                                                                |
| **BL-260927-give-gate-receipts-portable** — Give gate receipts portable ownership, path-neutral identities, and a shipped ignore rule      | Ownership-model decision; the `oat init` ignore entry is a cheap sub-slice. Pair with `BL-260927-share-one-hook-safe-exact-path` (Share one hook-safe exact-path commit primitive across CLI and skill lifecycle commits). |
| **BL-260927-share-one-hook-safe-exact-path** — Share one hook-safe exact-path commit primitive across CLI and skill lifecycle commits      | Cross-cutting commit primitive with concurrency fixtures; own project.                                                                                                                                                     |
| **BL-260906-harden-dispatch-launch** — Harden dispatch launch baselines and terminal reconciliation                                        | After the Wave 4 dispatch-record decision; parked patch wave-7-p16 needs a git-seam redesign.                                                                                                                              |
| **BL-260906-re-evaluate-universal-plan** — Re-evaluate universal plan proof strategy and test-first guidance                               | Cross-mode policy change; decision record plus workflow-mode change inventory.                                                                                                                                             |
| **BL-260904-make-quick-the-default-oat** — Make quick the default OAT workflow mode and spec-driven the explicit larger mode               | Solo wave: a workflow-mode change across nearly every lifecycle skill; lanes use `oat sync --scope project`.                                                                                                               |
| **BL-260907-type-check-cli-test-files** — Type-check CLI test files with a test-scoped tsconfig gate                                       | Solo or last in a wave; the allowlist route keeps the 614-error triage bounded.                                                                                                                                            |
| **BL-260911-make-docs-bootstrap-a-front** — Make docs bootstrap a front door for existing docs and support the docs-directory convention   | High value, but cross-repo acceptance (personal-skills, pntr).                                                                                                                                                             |
| **BL-260912-evaluate-replacing-explainer** — Evaluate replacing Explainer Kit authoring guidance with a pinned Effective HTML subset       | Evaluation with an upstream pin and a paired prototype; not autonomous-wave material.                                                                                                                                      |
| **BL-260830-integrate-recon-with-oat** — Integrate recon with OAT discovery and quick start                                                | After Wave 2's recon-worker validator and live-producer fixes.                                                                                                                                                             |
| **BL-260830-make-documentation-aware** — Make documentation-aware discovery prerequisites configurable                                     | Real external pain (#205); needs a thresholds/document-class design.                                                                                                                                                       |
| **BL-260830-wire-bounded-durable-reference** — Wire bounded durable-reference reads into lifecycle skills                                  | Matching and token-budget rules are unspecified design.                                                                                                                                                                    |
| **BL-260901-add-corrective-revision** — Add corrective-revision transition after review exhaustion                                         | Plan only after the review-cap merge (Wave 4 decision D4).                                                                                                                                                                 |

### Deferred

| Item                                                                                                                                        | Rationale                                                                                                                                                                                                  |
| ------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **BL-260706-front-load-recurring-gate** — Front-load recurring gate-finding classes into implementer briefs                                 | Four surfaces plus an AGENTS.md auto-write policy; roadmap Later.                                                                                                                                          |
| **BL-260711-add-root-owned-dispatch-broker** — Add root-owned dispatch broker for exact OAT subagent launches                               | Phase-direct fallback works; needs live cross-provider acceptance. Revisit after dispatch hardening.                                                                                                       |
| **BL-260718-add-generated-runbook** — Add generated-runbook verification command pass                                                       | No in-repo runbook generator to attach the pass to.                                                                                                                                                        |
| **BL-260718-add-oat-wave-lifecycle-cli** — Add oat wave lifecycle CLI command family                                                        | Operator-triggered; waits for a stable execution-program contract.                                                                                                                                         |
| **BL-260718-document-execution-program** — Document execution-program artifact as stable OAT contract                                       | Trigger (a second consumer) not met.                                                                                                                                                                       |
| **BL-260718-rewrite-worktree-bootstrap** — Rewrite worktree bootstrap-group as tested TypeScript command                                    | Bash script works; parity rewrite is low urgency. Pair with the wave CLI when it starts.                                                                                                                   |
| **BL-260719-add-pinned-recon-agents** — Add pinned recon agents for reusable orchestration                                                  | Design plus multi-provider materialization; roadmap Later.                                                                                                                                                 |
| **BL-260719-evaluate-broader-final-gate** — Evaluate broader final-gate freshness policy after narrow optimization                          | Precondition met, but no observed gaps yet.                                                                                                                                                                |
| **BL-260724-support-provider-directory** — Support provider directory symlinks as full collection sync                                      | Blocked on a missing guarded symlinkat-class Node primitive.                                                                                                                                               |
| **BL-260725-classify-general-sync-owned** — Classify general sync-owned dirt in project-start preflight                                     | Parked; revisit only on recurrence.                                                                                                                                                                        |
| **BL-260728-additional-visual-workflows** — Additional visual workflows                                                                     | Decision-first; after the Explainer evaluation.                                                                                                                                                            |
| **BL-260927-record-owner-overrides** — Record owner overrides of exhausted configured gates as structured state                             | Merge into the review-cap item (Wave 4 D4).                                                                                                                                                                |
| **BL-260827-span-based-prose-guards** — Span-based prose guards, anchored probe records, and a shared probe runner for skill contract tests | Placeholder ACs; the wave-4 probe runner was never committed.                                                                                                                                              |
| **BL-260830-add-per-claude-md-adoption-opt** — Add per-CLAUDE.md adoption opt-out for instruction sync                                      | After `BL-260830-persist-instruction-sync` (Persist instruction sync strategy in config and init); policy design and low demand.                                                                           |
| **BL-260830-add-remote-review-respond** — Add remote review respond and summarize skill set                                                 | After the provide-remote wiring; approval-gated live posting.                                                                                                                                              |
| **BL-260830-wire-provide-remote-skills** — Wire provide-remote skills to the review-remote helper CLI                                       | L-sized with no active remote-review demand signal.                                                                                                                                                        |
| **BL-260830-benchmark-listprojects-before** — Benchmark listProjects before approving a summary fast path                                   | Speculative performance work; approval-gated.                                                                                                                                                              |
| **BL-260830-cli-flag-help-p2-p3-cleanup** — CLI flag/help P2-P3 cleanup                                                                     | Audit-first; re-inventory before it can be bounded.                                                                                                                                                        |
| **BL-260830-complete-control-plane-backed** — Complete control-plane-backed lifecycle reads                                                 | Broad blast radius; overlaps the lifecycle state-authority work.                                                                                                                                           |
| **BL-260830-decide-generic-oat-ownership** — Decide generic OAT ownership of Jira backlog refinement                                        | Product decision; no active demand.                                                                                                                                                                        |
| **BL-260830-decide-whether-oat-owns** — Decide whether OAT owns dependency intelligence                                                     | Product decision; no active demand.                                                                                                                                                                        |
| **BL-260830-integrate-recon-across** — Integrate recon across analysis and research workflows                                               | After recon launch paths are proven live.                                                                                                                                                                  |
| **BL-260830-live-dogfood-oat-brainstorm** — Live dogfood oat-brainstorm destination and fold-back safety                                    | Live-evidence task; overlaps open PR #125.                                                                                                                                                                 |
| **BL-260830-memory-subsystem-ownership** — Memory subsystem ownership decision for OAT                                                      | Deferred until provider interop matures.                                                                                                                                                                   |
| **BL-260830-re-evaluate-same-target-gate** — Re-evaluate same-target gate execution                                                         | Research-then-decide; likely closes as unnecessary.                                                                                                                                                        |
| **BL-260901-consolidate-terminal-remote** — Consolidate terminal remote-ref advertisement parsing                                           | Trigger-gated: do it when a call site next changes.                                                                                                                                                        |
| **BL-260903-close-claude-runtime-lineage** — Close Claude runtime lineage depth and unverified provider shapes                              | Parked residue; only tiny wording fixes are actionable.                                                                                                                                                    |
| **BL-260903-project-document-should-prompt** — project-document should prompt a re-run when review fixes change a shipped contract          | Author ACs first (detection signal needs a small design choice).                                                                                                                                           |
| **BL-260903-retire-deprecated-pack** — Retire deprecated pack placement and dead evidence diagnostics                                       | Parked; after the Wave 2 guidance lane if confusion recurs.                                                                                                                                                |
| **BL-260906-project-journal-reservation** — Project journal reservation state into the smoke evidence bundle                                | AC needs a fixture captured from a real interrupted run.                                                                                                                                                   |
| **BL-260908-restructure-the-authoring** — Restructure the authoring skills for progressive disclosure and decide proactive invocation       | No verified defect; bundle with `BL-260909-re-source-the-surviving-codex` (Re-source the surviving Codex provider claims and repair the dead provider-reference URLs) if done.                             |
| **BL-260909-add-a-grep-by-shape-control** — Add a grep-by-shape control for own-key sweeps keyed to variable names                          | Heuristic detector with false-positive risk; lesson-driven.                                                                                                                                                |
| **BL-260909-re-source-the-surviving-codex** — Re-source the surviving Codex provider claims and repair the dead provider-reference URLs     | Needs live external fetches; fold in the `ultra` check from `BL-260827-refresh-provider-codex-md` (Refresh provider-codex.md for the ultra effort tier, the GPT-5.4 retirement, and per-subcommand flags). |
| **BL-260909-use-handle-bound-traversal** — Use handle-bound traversal in the managed-copy and manifest filesystem readers                   | Node lacks openat primitives; revisit after the restamp fix shrinks the surface.                                                                                                                           |
| **BL-260925-add-grok-4-7-cursor-pin** — Add Grok 4.7 Cursor pin mappings                                                                    | Deliberately deferred in #320; needs quality evidence, a DR revision, and a live re-probe.                                                                                                                 |

The four remaining items without a wave slot are reconciliation candidates; see
Section 6.

---

## 6. Reconciliation and housekeeping

These are recommendations only; this review changes no item files. Apply them
through `oat backlog archive <id> --summary "<outcome>"` (or `--wont-do`) in a
PR, per the Backlog Lifecycle in `.oat/repo/pjm/AGENTS.md`.

### Suspected complete or superseded

| Item                                                                                                                                            | Recommendation                                                                                                                                                                                                                                        | Evidence (lane)                                                                                                                                                                                                                                                                                                                                                                                                      |
| ----------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **BL-260908-restore-recon-s-cheap-fan-out** — Restore recon's cheap-fan-out intent with per-wave routing under one approval envelope            | Archive as `closed` in Wave 1; remove it from roadmap Now.                                                                                                                                                                                            | Every acceptance criterion is checked; the item's close condition was PR #285 merging. PR #285 merged 2026-09-12T02:35Z (`06031f6cf`), issue #274 is closed, and `dab4ba232` (#302) further simplified recon (`ac`).                                                                                                                                                                                                 |
| **BL-260908-retire-the-top-level-skill** — Retire the top-level skill version alias on the recorded schedule                                    | Close as superseded by **BL-260908-remove-the-top-level-skill** — Remove the top-level skill version read after the alias error has been quiet, noting that step 1 shipped.                                                                           | Step 1 shipped: `packages/cli/src/validation/skills.ts:1519-1520` emits `skill-version-alias` at `severity: 'error'`. The three unchecked ACs (step 2 removal, agent-role decision, parity fixtures) are exactly the remove item's scope, so keeping both double-counts the work (`ac`).                                                                                                                             |
| **BL-260708-verify-cursor-gpt-5-6-subagent** — Verify Cursor GPT-5.6 subagent model slugs                                                       | Close with a pointer to the cursor-subagent-materialization summary; remove it from roadmap Now.                                                                                                                                                      | Likely superseded by the 2026-07-18 cursor-subagent-materialization project: its Gate g01 (2026-07-17) verified every GPT-5.6 Sol/Terra/Luna mapping through live Cursor IDE `subagentStart.subagent_model` evidence. Tracked summary: `.oat/repo/reference/project-summaries/20260718-cursor-subagent-materialization.md:21,33`; shipped pins: `packages/cli/src/providers/cursor/codec/catalog.ts:174-266` (`aa`). |
| **BL-260827-refresh-provider-codex-md** — Refresh provider-codex.md for the ultra effort tier, the GPT-5.4 retirement, and per-subcommand flags | Confirm `ultra` is absent from the current Codex catalogue, then close; otherwise fold the `ultra` line into **BL-260909-re-source-the-surviving-codex** — Re-source the surviving Codex provider claims and repair the dead provider-reference URLs. | Probably superseded: `.agents/skills/subagent-orchestration/references/provider-codex.md:2-4` was refreshed 2026-09-24 with a GPT-6 matrix, GPT-5.4 is reframed as direct-API routes (lines 37-44), and the `resume` flag gap is documented at `.agents/skills/codex-skill/SKILL.md:73-79`. Only the `ultra` tier is unmentioned; ACs are placeholders (`aa`).                                                       |
| **BL-260909-show-the-brainstorm-pack** — Show the brainstorm pack in the oat-doctor dashboard example and pack enumeration                      | Re-scope to the pack-level status derivation rule, or close as `wont_do`.                                                                                                                                                                             | Premise mostly gone: PR #300 (oat-doctor 2.0, `4a9ee6a12`) takes the pack list from live `oat tools list` (`.agents/skills/oat-doctor/SKILL.md:262`, "the skill carries no pack manifest"). AC 1 conflicts with that design; only AC 2 (status derivation) remains (`ad`).                                                                                                                                           |

### Partial — keep open, refresh the item text

| Item                                                                                                                    | What already shipped (lane evidence)                                                                                                     | What remains                                                                       |
| ----------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------- |
| **BL-260904-stabilize-the-collection** — Stabilize the collection-detach engine integration test                        | Fixture fix landed in `ddddba079` (`engine.integration.test.ts:901`) (`ac`).                                                             | Ten consecutive uncached runs; close from the Wave 2 flake lane.                   |
| **BL-260830-add-strict-yaml-validation** — Add strict YAML validation to oat skill validation                           | `parseSkillFrontmatter` strict-parses (`frontmatter.ts:370`) and `skill-frontmatter-unreadable` is emitted (`skills.ts:694-700`) (`ab`). | Parser location, field-type validation, bare-colon fixture.                        |
| **BL-260718-harden-full-surface-gate** — Harden full-surface gate reviews against budget and recursive dispatch         | Explicit timeout configuration precedence shipped (`aa`).                                                                                | 900 s artifact default (`gate/index.ts:965-966`); no recursion or in-flight guard. |
| **BL-260711-add-activity-aware-gate** — Add activity-aware gate timeouts                                                | Hard budgets, liveness evidence, and recovery shipped in CLI 0.1.72 (`aa`).                                                              | Idle-kill, early artifact, distinct outcomes.                                      |
| **BL-260726-validate-cursor-pin-effort** — Validate Cursor pin effort rungs at sync time                                | AC5 (stale probe rejected) covered by `catalog.test.ts:67-81` (`aa`).                                                                    | Family/effort parsing, rung set, loud error, older mappings.                       |
| **BL-260907-type-check-cli-test-files** — Type-check CLI test files with a test-scoped tsconfig gate                    | `tsconfig.test-support.json` covers `__tests__/**` (`ac`).                                                                               | `*.test.ts` still excluded; 614-error triage.                                      |
| **BL-260903-verify-the-packs-inventory** — Verify the packs:inventory path-redaction claim in troubleshooting docs      | `oat status` redacts roots (`status/index.ts:201-222`) (`ab`).                                                                           | Doctor falls back to raw `detail` (`doctor/index.ts:1208`); narrow docs or fix.    |
| **BL-260830-add-per-claude-md-adoption-opt** — Add per-CLAUDE.md adoption opt-out for instruction sync                  | Directory-level `documentation.instructionPointerExcludes` exists (`ab`).                                                                | Per-file Claude-only opt-out and reporting.                                        |
| **BL-260724-support-provider-directory** — Support provider directory symlinks as full collection sync                  | Adopt/detach shipped (`aa`).                                                                                                             | `auto` creation, blocked on a Node primitive.                                      |
| **BL-260908-remove-the-top-level-skill** — Remove the top-level skill version read after the alias error has been quiet | Step 1 shipped in wave 7; main is 0.3.7, so the "one release quiet" precondition is likely met (`ac`).                                   | Record the precondition; decide skills-only vs agent-role scope.                   |
| **BL-260909-give-the-dispatch-record** — Give the dispatch record a consumer or remove it                               | Refined 2026-09-26: the command has a live validate-only consumer (`ac`).                                                                | Journal persistence has no reader; decide its fate.                                |
| **BL-260719-evaluate-broader-final-gate** — Evaluate broader final-gate freshness policy after narrow optimization      | Precondition met: the narrow final-gate optimization is archived (`aa`).                                                                 | The evaluation itself.                                                             |

### Consolidations

- Merge **BL-260818-distinguish-operator-directed** — Distinguish
  operator-directed review rounds from failed fix cycles in the review-cycle
  cap, **BL-260927-record-owner-overrides** — Record owner overrides of
  exhausted configured gates as structured state, and
  **BL-260901-add-corrective-revision** — Add corrective-revision transition
  after review exhaustion into one review-cap item before any of them is
  planned. All three define what happens at an exhausted review or gate cap
  (`aa`, `ab`, `ad`).
- Decide **BL-260902-decide-test-only-freshness** — Decide test-only freshness
  exception for the implement exit gate and
  **BL-260826-decide-whether-test-only-paths** — Decide whether test-only paths
  under packages/cli/src count as publishable together; they share the
  "test-only" classifier (`aa`, `ab`).
- Bundle **BL-260908-restructure-the-authoring** — Restructure the authoring
  skills for progressive disclosure and decide proactive invocation with
  **BL-260909-re-source-the-surviving-codex** — Re-source the surviving Codex
  provider claims and repair the dead provider-reference URLs if either is done,
  for one bump per skill (`ac`).

### Roadmap housekeeping

- Remove archived items from roadmap Now/Next:
  **BL-260908-restore-recon-s-cheap-fan-out** — Restore recon's cheap-fan-out
  intent with per-wave routing under one approval envelope and
  **BL-260708-verify-cursor-gpt-5-6-subagent** — Verify Cursor GPT-5.6 subagent
  model slugs (after closing them), plus the already-archived
  `BL-260829-make-tool-pack-scope-selection` (Make tool-pack scope, provider
  reachability, and dispatch state truthful; archived 2026-09-03),
  `BL-260828-add-project-level-oat-guidance` (Add project-level OAT guidance
  prompt during init and workflow installation; archived 2026-09-03),
  `BL-260718-mandatory-skill-load-clause` (Mandatory skill-load clause for
  lifecycle steps that name skills; archived 2026-09-06), and
  `BL-260712-per-project-override` (Per-project override to disable configured
  external gates; archived 2026-09-06).
- Replace the 2026-08-30 sequencing map and project-grouping table. The
  `tool-pack-scope-provider-truthfulness` project no longer exists under
  `.oat/projects/shared/`, and its remaining active item is
  **BL-260724-support-provider-directory** — Support provider directory symlinks
  as full collection sync.
- Refresh `backlog/reviews/priority-alignment.md` (dated 2026-08-30) through the
  optional collaborative walkthrough, not silently.

---

## 7. Roadmap Alignment

### How backlog items map to roadmap phases

| Roadmap Phase                      | Status                               | Backlog Items                                                                                                                                                                                                                                                                                                                                                                                                                           | Notes                                                                                                                                          |
| ---------------------------------- | ------------------------------------ | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------- |
| Now — 2026-08-31 execution program | Complete                             | none active                                                                                                                                                                                                                                                                                                                                                                                                                             | W1–W7 merged (last: PR #286, CLI 0.2.67). Move the entry to history.                                                                           |
| Now — recon rework                 | Complete                             | **BL-260908-restore-recon-s-cheap-fan-out** — Restore recon's cheap-fan-out intent with per-wave routing under one approval envelope                                                                                                                                                                                                                                                                                                    | Archive (Section 6).                                                                                                                           |
| Now — Cursor GPT-5.6 verification  | Superseded                           | **BL-260708-verify-cursor-gpt-5-6-subagent** — Verify Cursor GPT-5.6 subagent model slugs                                                                                                                                                                                                                                                                                                                                               | Close (Section 6).                                                                                                                             |
| Now — dispatch broker              | Deferred by rating                   | **BL-260711-add-root-owned-dispatch-broker** — Add root-owned dispatch broker for exact OAT subagent launches                                                                                                                                                                                                                                                                                                                           | Rated Avoid / Defer; move to Later behind **BL-260906-harden-dispatch-launch** — Harden dispatch launch baselines and terminal reconciliation. |
| Now — review/gate integrity        | Stalled (discovery since 2026-09-02) | **BL-260729-implement-reviewplan-first** — Implement ReviewPlan-first reviewer workflow; **BL-260711-skip-re-review-for-bookkeeping** — Skip re-review for bookkeeping-only review findings; **BL-260711-add-activity-aware-gate** — Add activity-aware gate timeouts                                                                                                                                                                   | ReviewPlan PR #190 stale; skip-re-review waits on Wave 2's bookkeeping order; activity-aware waits on Wave 3's gate hardening.                 |
| Now — scope/provider truthfulness  | Complete                             | none active                                                                                                                                                                                                                                                                                                                                                                                                                             | Archived 2026-09-03; remove.                                                                                                                   |
| Next — review/gate chain           | Planned                              | **BL-260829-order-phase-bookkeeping-before** — Order phase bookkeeping before per-phase review dispatch; **BL-260806-fail-closed-when-configured** — Fail closed when configured closeout snapshot is absent; **BL-260820-bind-each-gate-review** — Bind each gate review disposition to its exact received ledger event; **BL-260820-emit-source-qualified** — Emit source-qualified provenance envelopes for review and gate receipts | Waves 2, 3, and 4 carve out order-phase, fail-closed, and the #305 slice; emit stays project-owned.                                            |
| Next — provider directory symlinks | Blocked                              | **BL-260724-support-provider-directory** — Support provider directory symlinks as full collection sync                                                                                                                                                                                                                                                                                                                                  | External Node primitive; rated Avoid / Defer.                                                                                                  |
| Next — wave-workflow follow-ups    | Trigger not met                      | **BL-260718-add-oat-wave-lifecycle-cli** — Add oat wave lifecycle CLI command family; **BL-260718-document-execution-program** — Document execution-program artifact as stable OAT contract; **BL-260718-rewrite-worktree-bootstrap** — Rewrite worktree bootstrap-group as tested TypeScript command                                                                                                                                   | Keep in Next or move to Later; the second-consumer trigger has not fired.                                                                      |
| Next — Explainer evaluation        | Planned                              | **BL-260912-evaluate-replacing-explainer** — Evaluate replacing Explainer Kit authoring guidance with a pinned Effective HTML subset                                                                                                                                                                                                                                                                                                    | Strategic evaluation; not autonomous-wave material.                                                                                            |
| Next — archived entries            | Complete                             | none active                                                                                                                                                                                                                                                                                                                                                                                                                             | Remove the project-level guidance, mandatory skill-load clause, and per-project override entries.                                              |
| Later                              | Deferred                             | **BL-260706-front-load-recurring-gate** — Front-load recurring gate-finding classes into implementer briefs; **BL-260719-add-pinned-recon-agents** — Add pinned recon agents for reusable orchestration; **BL-260728-additional-visual-workflows** — Additional visual workflows                                                                                                                                                        | Ratings agree: all Avoid / Defer.                                                                                                              |

### Gaps: Roadmap items without backlog coverage

| Roadmap Item                                                                                                                          | Phase    | Recommendation                                            |
| ------------------------------------------------------------------------------------------------------------------------------------- | -------- | --------------------------------------------------------- |
| 2026-08-31 execution program                                                                                                          | Now      | Complete; no item needed. Move to history.                |
| Archived roadmap references (tool-pack scope truthfulness, project-level guidance, mandatory skill-load clause, per-project override) | Now/Next | Already shipped; delete the entries.                      |
| Sequencing map and project grouping (2026-08-30)                                                                                      | —        | Stale; replace with this review's waves and Lane A chain. |

### Orphans: Backlog items not on the roadmap

93 of 114 active items are not on the roadmap. Most are wave-pool or deferred
items and need no roadmap entry. Add these, because they are high-value,
recommended for Waves 1–2, or project-shaped:

| Backlog Item                                                                                                                               | Recommendation                                                         |
| ------------------------------------------------------------------------------------------------------------------------------------------ | ---------------------------------------------------------------------- |
| **BL-260927-stop-resolve-providers-sh-from** — Stop resolve-providers.sh from aborting when the last auto-detect test is false             | Add to Now as part of Wave 1.                                          |
| **BL-260927-make-the-managed-claude** — Make the managed Claude dispatch-record input producible and self-describing                       | Add to Now as part of Wave 1.                                          |
| **BL-260909-give-the-dispatch-record** — Give the dispatch record a consumer or remove it                                                  | Add to Next as the dispatch-record fate decision.                      |
| **BL-260906-harden-dispatch-launch** — Harden dispatch launch baselines and terminal reconciliation                                        | Add to Next behind that decision; own project.                         |
| **BL-260903-close-manual-only-agents-md** — Close manual-only AGENTS.md refresh loop                                                       | Add to Next as Wave 2's guidance lane.                                 |
| **BL-260927-derive-current-lifecycle-state** — Derive current lifecycle state from one authority for review, phase, and publication status | Add to Next under the review/gate integrity project.                   |
| **BL-260927-expose-a-scoped-template** — Expose a scoped template resolver command and route lifecycle skills through it                   | Add to Next after the precedence decision; breaks user-scope installs. |
| **BL-260911-make-docs-bootstrap-a-front** — Make docs bootstrap a front door for existing docs and support the docs-directory convention   | Add to Next; the natural follow-on to oat-doctor 2.0.                  |
| **BL-260904-make-quick-the-default-oat** — Make quick the default OAT workflow mode and spec-driven the explicit larger mode               | Add to Later as a solo-wave workflow-mode change.                      |
| **BL-260906-re-evaluate-universal-plan** — Re-evaluate universal plan proof strategy and test-first guidance                               | Add to Later; needs a decision record.                                 |

All other orphans stay standalone: the remaining Wave 1–5 items as wave-pool
work, and the Deferred table in Section 5.

---

## 8. Observations & Recommendations

### Strategic observations

1. The backlog's value is concentrated in two decision-gated chains. Lane A
   (review chain) and Lane C (dispatch) hold most High-value items, and neither
   can move as waves until ReviewPlan PR #190 is reconciled and the
   dispatch-record fate is decided. The bounded carve-outs (Waves 2–4) keep
   progress moving without pre-empting those designs.
2. The 2026-09-26 triage added fifteen `BL-260927-*` items; ten of them are
   rated wave-ready, and six of Wave 1's nine items come from that pass. Fresh,
   reproduced triage items are the cheapest wave material.
3. Housekeeping lags shipping. One item is fully complete, three more are
   superseded or obsolete, twelve are partially shipped, and the roadmap still
   lists six archived or complete entries. Running Section 6 would bring the
   active count to about 109 and make the next review sharper.
4. Hidden shared writes, not item size, limit parallelism:
   `validation/skills*.ts`, `named-skill-load-contract.test.ts`,
   `dispatch-stamp-contract.test.ts`, `oat-config.ts`,
   `.agents/agents/oat-reviewer.md`, and the lockstep version files. The waves
   above assign each to one lane per wave.
5. Human-only decisions are a small, cheap backlog of their own (Lane H plus
   five embedded decisions). Scheduling one decision session would unblock more
   items than any single implementation lane.

### Risks

| Risk                                                                                                                             | Mitigation                                                                                                                                                       |
| -------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Wave 1's managed-Claude lane pre-empts the dispatch-record fate decision.                                                        | Keep the validate-only consumer and leave journal persistence untouched; decide its fate in Wave 4.                                                              |
| `name-the-file-in-canonical` and `make-oat-sync-scope-all-report` collide on sync error aggregation.                             | Confirm file sets at plan time; serialize if `commands/sync/apply.ts` is shared.                                                                                 |
| Review-chain carve-outs drift from the `review-gate-integrity` design.                                                           | Record each carve-out in that project; keep one review-chain item per wave.                                                                                      |
| ReviewPlan PR #190 keeps aging and blocks the chain root.                                                                        | Decide at the next planning pass whether to reconcile, restart as a spec-driven project, or close it.                                                            |
| Lane quadrant conventions differ (Section 2 note), so quadrant totals over-count Quick Wins and Fill-ins at the Medium boundary. | Treat quadrants as indicative; sequence by wave-readiness and dependencies.                                                                                      |
| Placeholder ACs (fumadocs, span-based guards, project-document prompt, bare fences) invite scope creep.                          | Write real ACs before a lane takes the item.                                                                                                                     |
| Lockstep and skill-version gates fail late.                                                                                      | Fan-in owns the five-package bump; each lane bumps only its own skill or agent role; run `pnpm run check:skill-bumps` and `pnpm release:check-versions` locally. |

### Rating inconsistencies noted (values not changed)

- **BL-260718-harden-full-surface-gate** — Harden full-surface gate reviews
  against budget and recursive dispatch: High/Medium labelled Quick Win (`aa`);
  `ac`/`ad` convention would say Strategic.
- **BL-260806-fail-closed-when-configured** — Fail closed when configured
  closeout snapshot is absent: High/Medium labelled Quick Win (`aa`).
- **BL-260829-order-phase-bookkeeping-before** — Order phase bookkeeping before
  per-phase review dispatch: High/Medium labelled Quick Win (`ab`), though AC3
  needs a live multi-phase run.
- **BL-260818-distinguish-operator-directed** — Distinguish operator-directed
  review rounds from failed fix cycles in the review-cycle cap: Medium/Medium
  labelled Fill-in (`aa`); also `BL-260819-classify-canonical-skills-by`
  (Classify canonical skills by distribution, lifecycle, and tenant scope),
  `BL-260830-cli-flag-help-p2-p3-cleanup` (CLI flag/help P2-P3 cleanup),
  `BL-260830-persist-instruction-sync` (Persist instruction sync strategy in
  config and init), and `BL-260830-live-dogfood-oat-brainstorm` (Live dogfood
  oat-brainstorm destination and fold-back safety) (`aa`/`ab`).
- **BL-260830-complete-control-plane-backed** — Complete control-plane-backed
  lifecycle reads: Medium/Medium labelled Avoid / Defer (`ab`);
  Medium-value/High-effort items in `aa`/`ab` are also Avoid / Defer while `ad`
  rates the same shape Strategic.
- **BL-260908-repair-or-exempt-archived** — Repair or exempt archived project
  ledgers that fail the pr-final path guard: Low/Medium labelled Fill-in,
  contradicting lane `ac`'s own key (Low + Medium = Avoid / Defer).
- **BL-260830-decide-generic-oat-ownership** — Decide generic OAT ownership of
  Jira backlog refinement: Low/Low labelled Avoid / Defer (`ab`,
  decision-gated); same for `BL-260830-decide-whether-oat-owns` (Decide whether
  OAT owns dependency intelligence). Item priority for the first is medium.
- **BL-260902-decide-test-only-freshness** — Decide test-only freshness
  exception for the implement exit gate: Quick Win (`ab`) but not wave-ready: it
  is a human decision.
- **BL-260927-preserve-oat-config-json-key** — Preserve .oat/config.json key
  order and skip no-op config writes: Lane value Medium vs item priority low;
  similar for `BL-260909-rewrite-inbound-references` (Rewrite inbound references
  when oat backlog archive moves an item) and
  `BL-260909-fix-the-agents-md-unsafe` (Fix the agents-md unsafe-directory test
  race under parallel turbo) (Medium vs low).

### Quick wins to tackle immediately

1. **BL-260927-stop-resolve-providers-sh-from** — Stop resolve-providers.sh from
   aborting when the last auto-detect test is false (Low effort; confirmed
   breakage in most repositories, XS fix).
2. **BL-260908-validate-the-catalog-refresh** — Validate the catalog-refresh
   policy state in normalizeSyncEvidence (Low effort; latent throw in succeeded
   lifecycle commands).
3. **BL-260909-make-oat-sync-scope-all-report** — Make oat sync --scope all
   report a sibling scope's failure in the plan body (Low effort; misleading "No
   changes required." after failure).
4. **BL-260927-name-the-file-in-canonical** — Name the file in canonical rule
   parse errors and keep one bad rule from aborting sync (Low effort; one bad
   third-party rule no longer aborts sync).
5. **BL-260927-derive-or-label-the-dispatch** — Derive or label the dispatch
   audit line from the gate invocation in gate-originated reviews (Low effort;
   correct provenance in every gate review).
6. **BL-260927-require-a-per-item-walkthrough** — Require a per-item walkthrough
   of retro register items in the final report (Low effort; skill-only, closes
   three issues).
7. **BL-260927-preserve-oat-config-json-key** — Preserve .oat/config.json key
   order and skip no-op config writes with
   **BL-260909-reject-malformed-nested-values** — Reject malformed nested values
   in the strict pjm.remote shared reader (Low effort; one config lane).
8. Archive **BL-260908-restore-recon-s-cheap-fan-out** — Restore recon's
   cheap-fan-out intent with per-wave routing under one approval envelope
   (bookkeeping only).
