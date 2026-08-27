# Backlog Priority Alignment

<!-- markdownlint-disable MD013 -->

**Date:** 2026-08-19 (America/Chicago)
**Status:** Active — Post-PR #196/#198 and the 2026-08-19 skills/GitHub
triage; `BL-260729-implement-reviewplan-first` (Implement ReviewPlan-first
reviewer workflow) is in flight through draft PR #190, and OAT plugin discovery
is a second operator-reported large initiative outside this checkout's active
backlog.

One-page execution guide with scope-weighted capacity: preserve the two large
in-flight commitments and run one bounded S/M defect lane beside them. Do not
start another large feature initiative. For the full value/effort catalog,
dependency graph, and quadrant tables, see
[backlog-and-roadmap-review.md](./backlog-and-roadmap-review.md).

> This document reflects the operator's correction that ReviewPlan is already
> in flight and that plugin discovery is consuming additional large-project
> capacity. Current preference is to resolve recently encountered bugs and
> operational issues before starting broad feature work. No separate
> planning-investment column is used.

## Related sources

| Document                                                         | Role                                             |
| ---------------------------------------------------------------- | ------------------------------------------------ |
| [roadmap.md](../../roadmap.md)                                   | Authoritative Now / Next / Later execution order |
| [current-state.md](../../current-state.md)                       | Shipped capabilities and selected active backlog |
| [backlog/index.md](../index.md)                                  | Curated overview and generated item table        |
| [backlog/items/](../items/)                                      | Executable backlog records                       |
| [backlog-and-roadmap-review.md](./backlog-and-roadmap-review.md) | Full catalog, dependencies, and rating rationale |

---

## Finishing / in flight

| Item                                                                                                                                      | Scope           | Notes                                                                                                                                                                                                                                                                                                                                                                          |
| ----------------------------------------------------------------------------------------------------------------------------------------- | --------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| [Implement ReviewPlan-first reviewer workflow](../items/BL-260729-implement-reviewplan-first.md) (`BL-260729-implement-reviewplan-first`) | L               | Draft PR [#190](https://github.com/voxmedia/open-agent-toolkit/pull/190), “ReviewPlan Stage A compatibility release,” last updated August 7. Its checks passed at that head, but GitHub now reports a dirty merge state. Reconcile with main, refresh dogfood evidence and checks, then compare the Stage A result with the full item criteria before closing or narrowing it. |
| OAT plugin discovery                                                                                                                      | Large discovery | Operator-reported in-flight initiative; its project artifact is not present in this checkout. Continue discovery, but do not use its capacity assumption to start another large backlog feature.                                                                                                                                                                               |

These commitments consume the large-project capacity. Alongside them, keep one
small defect lane moving sequentially. Until PR #190 lands, avoid starting
changes that overlap `oat-reviewer`, review-provide, or project-implement
contracts.

---

## Recent defect queue

Execute these one at a time in the bounded defect lane. Order favors issues
that were recently reproduced in skills-corpus, explainer, release, or stale
tooling investigations. External plans may be prepared ahead of execution so
the lane can advance without reopening broad discovery.

| Item                                                                                                                                                                          | Scope | Parallel with                              | Notes                                                                                                                   |
| ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----- | ------------------------------------------ | ----------------------------------------------------------------------------------------------------------------------- |
| [Warn when oat sync uses a different producing CLI version](../items/BL-260718-warn-when-oat-sync-uses.md) (`BL-260718-warn-when-oat-sync-uses`)                              | S     | Both large initiatives                     | First small-fix kickoff; turns silent producer skew into an actionable diagnosis after the stale-tooling investigation. |
| [Refresh codex-skill model routing and repository-check policy](../items/BL-260819-refresh-codex-skill-model.md) (`BL-260819-refresh-codex-skill-model`)                      | S     | Both large initiatives                     | Recent skills-corpus finding; correct stale routing and an unnecessarily broad bypass.                                  |
| [Bound the smoke cleanup SIGTERM harness with a timeout](../items/BL-260818-bound-the-smoke-cleanup.md) (`BL-260818-bound-the-smoke-cleanup`)                                 | S     | Both large initiatives                     | Recent observed 35-minute test wedge; normalize its duplicate placeholder criteria before execution.                    |
| [Let resolveAssetsRoot honor OAT_ASSETS_DIR and make smoke asset reads hermetic](../items/BL-260817-let-resolveassetsroot-honor.md) (`BL-260817-let-resolveassetsroot-honor`) | S     | Both large initiatives                     | Recent parallel asset-reader race; normalize its placeholder criteria before execution.                                 |
| [Detect branch-behind-published-main package versions in CI](../items/BL-260817-detect-branch-behind-published.md) (`BL-260817-detect-branch-behind-published`)               | S     | Both large initiatives                     | Recent release-hardening residue; catches version collisions the merge-base check cannot see.                           |
| [Repair verified bundled skill contract drift](../items/BL-260819-repair-verified-bundled-skill.md) (`BL-260819-repair-verified-bundled-skill`)                               | M     | Both large initiatives after smaller fixes | One release-shaped batch for four reproduced skills-corpus defects.                                                     |

After PR #190 lands, add the recent review-lifecycle defect to this lane:
[Bind each gate review disposition to its exact received ledger event](../items/BL-260820-bind-each-gate-review.md)
(`BL-260820-bind-each-gate-review`). Preserve the final Stage A event identity
instead of introducing a competing contract.

---

## Build evidence and autonomous closeout later

These remain valuable, but they are medium/large feature work. Do not start
them while ReviewPlan and plugin discovery are both active. Use the stabilized
review/event boundary rather than creating parallel schemas when capacity
returns.

| Item                                                                                                                                                                      | Scope | Parallel with                   | Notes                                                                                                                   |
| ------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----- | ------------------------------- | ----------------------------------------------------------------------------------------------------------------------- |
| [Emit source-qualified provenance envelopes for review and gate receipts](../items/BL-260820-emit-source-qualified.md) (`BL-260820-emit-source-qualified`)                | M     | Autonomous-complete preparation | Reuse ReviewPlan and exact-event identities across direct, project, and gate receipts.                                  |
| [Add oat-project-complete-auto companion skill for autonomous closeouts](../items/BL-260720-add-oat-project-complete-auto.md) (`BL-260720-add-oat-project-complete-auto`) | M     | Receipt envelope                | Replace its acceptance placeholders before kickoff; start only after configured-plus-absent closeout enforcement lands. |

---

## Additional release and test follow-ups

These are independent of the review architecture. Pull them into the bounded
defect lane only after the recent-defect queue above, or when they become the
most relevant incident class. Normalize placeholder criteria before kickoff.

| Item                                                                                                                                                                                  | Scope | Parallel with   | Notes                                                  |
| ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----- | --------------- | ------------------------------------------------------ |
| [Decide and pin the system-Chromium requirement introduced by test:skills on the merge path](../items/BL-260817-decide-and-pin-the-system.md) (`BL-260817-decide-and-pin-the-system`) | S     | Any non-CI lane | Policy decision that unlocks the RC Explainer CI test. |

---

## Dedicated follow-on projects

Do not start these while the two active lanes are occupied. Promote them only
after their listed foundations or trigger evidence exists.

| Item                                                                                                                                                                                          | Scope | Start after                                                                              |
| --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----- | ---------------------------------------------------------------------------------------- |
| [Track PR-closeout evidence freshness against the current head](../items/BL-260820-track-pr-closeout-evidence.md) (`BL-260820-track-pr-closeout-evidence`)                                    | L     | Source-qualified receipt envelope; fold or resolve the older broad-freshness evaluation. |
| [Skip re-review for bookkeeping-only review findings](../items/BL-260711-skip-re-review-for-bookkeeping.md) (`BL-260711-skip-re-review-for-bookkeeping`)                                      | M     | ReviewPlan Stage A reconciliation and exact event taxonomy.                              |
| [Distinguish operator-directed review rounds from failed fix cycles in the review-cycle cap](../items/BL-260818-distinguish-operator-directed.md) (`BL-260818-distinguish-operator-directed`) | M     | Exact event binding; retain bounded finding-scoped authorization.                        |
| [Classify canonical skills by distribution, lifecycle, and tenant scope](../items/BL-260819-classify-canonical-skills-by.md) (`BL-260819-classify-canonical-skills-by`)                       | M     | Explicit policy design and capacity for a catalog/sync initiative.                       |
| [Make explainer run durability survive ephemeral environments](../items/BL-260727-make-explainer-run-durability.md) (`BL-260727-make-explainer-run-durability`)                               | M     | An available dedicated lane and an explicit persistence policy.                          |

---

## Parallelism cheat sheet

| Can run together                                                               | Keep sequential                                                                                                                                                                                                                                                                                                                                                           |
| ------------------------------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| ReviewPlan PR #190 and OAT plugin discovery ∥ one S/M defect-plan execution    | [ReviewPlan-first reviewer workflow](../items/BL-260729-implement-reviewplan-first.md) (`BL-260729-implement-reviewplan-first`) before [exact received-event binding](../items/BL-260820-bind-each-gate-review.md) (`BL-260820-bind-each-gate-review`)                                                                                                                    |
| One small defect at a time while both large initiatives remain active          | [Configured-absent closeout enforcement](../items/BL-260806-fail-closed-when-configured.md) (`BL-260806-fail-closed-when-configured`) before [autonomous completion companion](../items/BL-260720-add-oat-project-complete-auto.md) (`BL-260720-add-oat-project-complete-auto`)                                                                                           |
| External-plan authoring for several small defects may run as one planning pass | [Exact received-event binding](../items/BL-260820-bind-each-gate-review.md) (`BL-260820-bind-each-gate-review`) before [receipt provenance envelope](../items/BL-260820-emit-source-qualified.md) (`BL-260820-emit-source-qualified`) before [current-head closeout freshness](../items/BL-260820-track-pr-closeout-evidence.md) (`BL-260820-track-pr-closeout-evidence`) |

---

## Suggested next kickoff stack

1. **Finish existing work** [Implement ReviewPlan-first reviewer workflow](../items/BL-260729-implement-reviewplan-first.md) (`BL-260729-implement-reviewplan-first`) through draft PR [#190](https://github.com/voxmedia/open-agent-toolkit/pull/190) — reconcile main, refresh Stage A dogfood/check evidence, and determine the backlog item's residual scope.
2. **Continue existing discovery** for the OAT plugin initiative — keep it as the second large commitment; do not start another broad feature project while it remains active.
3. **Kick off the bounded defect lane** with [Warn when oat sync uses a different producing CLI version](../items/BL-260718-warn-when-oat-sync-uses.md) (`BL-260718-warn-when-oat-sync-uses`) — then advance through the external-plan queue one S/M item at a time.

---

## Changelog

| Date       | Update                                                                                                                                                                                                                                                              |
| ---------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 2026-08-19 | Created after the full 44-item review, then revised for operator context: draft PR #190 and OAT plugin discovery consume large-project capacity; current preference is one sequential S/M lane for recently encountered defects, with no new large feature kickoff. |
