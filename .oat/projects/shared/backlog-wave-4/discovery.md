---
oat_status: complete
oat_ready_for: oat-project-quick-start
oat_blockers: []
oat_last_updated: 2026-10-02
oat_generated: false
---

# Discovery: backlog-wave-4

## Phase Guardrails (Discovery)

Discovery is for requirements and decisions, not implementation details.

- Prefer outcomes and constraints over concrete deliverables (no specific scripts, file paths, or function names).
- If an implementation detail comes up, capture it as an **Open Question** for design (or a constraint), not as a deliverable list.

## Initial Request

Deliver Wave 4 of the backlog as one PR, selected through `tackle-backlog` on
2026-10-02 and approved by the operator ("Approve as proposed"). The wave
targets gate and build reliability plus the review-loop and completion
follow-ups that Wave 3 surfaced. It leads with the operator's workflow change
from Wave 3: when a review or gate budget runs out, run a complexity review
and present it with the reasons the loop stopped.

Approved batch (13 backlog items):

- `BL-261001-fail-closed-when-bundle-assets` — bundle-assets fails closed on an empty lookup
- `BL-260906-report-errno-for-asset-root` — asset-root errors report their errno
- `BL-260718-harden-full-surface-gate` — longer full-surface gate budget, nested-gate rejection
- `BL-260711-add-activity-aware-gate` — idle-kill slice only
- `BL-260909-restamp-a-stale-copy-strategy` — restamp on skip and related sync fixes (no bridge retirement)
- `BL-260927-persist-quick-start-prompt` — persist quick-start prompt approvals
- `BL-261001-run-a-complexity-review-when` — complexity review at budget exhaustion
- `BL-260713-root-agent-judgment-logging` — root judgment entries in the project log
- `BL-260720-add-oat-project-complete-auto` — opt-in autonomous completion companion skill
- `BL-260908-tighten-the-pr-final-ledger` — pr-final ledger scan boundary
- `BL-261001-downgrade-claims-that-thorough` — recon reconciler covers thorough-profile reviews
- `BL-261001-resolve-the-summary-template` — oat-wrap-up resolves its summary template
- `BL-261001-route-quick-mode-plan` — dashboard routes quick plans by readiness

Housekeeping: close `BL-260908-retire-the-top-level-skill` as superseded by
`BL-260908-remove-the-top-level-skill`.

## Clarifying Questions

### Question 1: Batch and topology

**Q:** Approve the 13-item batch as phases p01–p07, one PR, lockstep 0.3.13?
**A:** Approve as proposed.
**Decision:** One branch (`wave/2026-10-02-backlog-wave-4`), one PR, no merge.

### Question 2: complexity-review dependency

**Q:** `complexity-review` lives only in the operator's personal
`tkstang/skills` repository. Probe and degrade, or bundle it into OAT?
**A:** Probe for it and include a condensed version of the guidance in the
skill references for now; backlog an item to port it into OAT properly.
**Decision:** Exhaustion points probe for an installed `complexity-review`
skill and use it when present; otherwise the reviewer subagent follows a
condensed OAT reference. The port is `BL-261002-port-the-complexity-review`
(filed, out of scope). The condensed reference adapts external prose, so
`NOTICES.md` gains an entry.

### Question 3: Gate budget

**Q:** Full-surface (artifact and plan) gate reviews default to 30 minutes
(now 15), and a second gate for the same project and scope is rejected while
one is running?
**A:** Yes (30 min, reject duplicates).
**Decision:** Default 1,800,000 ms for full-surface reviews; a live duplicate
launch is rejected, not reused.

### Question 4: Setup

**Q:** Same routes as Waves 2–3, and update the global CLI first?
**A:** Same setup except the reviewer is GPT-6.1 Sol. The CLI update was not
authorized.
**Decision:** Claude Opus 5.5 high phase implementers; Codex GPT-6.1 Sol xhigh
reviewer through the configured gate target (which already invokes
`gpt-6.1-sol`); gates on the quick-start plan, every phase, and the final and
exit gates; dispatch policy managed/high. The global CLI stays at 0.3.10.

## Solution Space

The approach is fixed by the approved batch: implement each item against its
acceptance criteria and the decisions above. The only structural choices were
phase grouping and the two partial-scope items, covered under Key Decisions.

## Key Decisions

1. **Sequencing:** Six sequential phases plus a fan-in, grouped by write set:
   build assets, gate timeouts, sync correctness, review-loop skills,
   completion, small fixes, then release. Phases share skill version pins,
   help snapshots, and docs pages, so none run in parallel.
2. **Versions:** Each skill gets one `metadata.version` bump in the final PR
   diff, made by the first phase that changes it. The fan-in owns the
   five-package lockstep bump from 0.3.12 to 0.3.13.
3. **Partial-scope items:** `BL-260711-add-activity-aware-gate` ships only the
   idle kill and distinct outcomes; the early-artifact-template step conflicts
   with ReviewPlan's incomplete-artifact rule (`BL-260729-implement-reviewplan-first`)
   and stays open. `BL-260909-restamp-a-stale-copy-strategy` ships everything
   except retiring the compatibility bridge, which needs field installs
   restamped first. Both items are rewritten to their remaining scope and stay
   open.
4. **Narrowed item:** `BL-261001-route-quick-mode-plan` is narrowed to the
   dashboard map; the router and the progress and next skills already gate on
   quick plan readiness.
5. **Complexity-review trigger:** Runs at every budget-exhaustion point (root
   review cap, configured gate attempt exhaustion, final review cap,
   review-receive cycle cap, quick-start plan gate). One read-only subagent;
   it writes nothing and launches nothing. The operator still chooses the
   disposition, including **simplify**; agents never self-select it, also
   under `OAT_AUTONOMOUS=1`, where it is a boundary report. The optional early
   trigger stays opt-in.
6. **Autonomous completion:** A new model-invocable, non-user-invocable
   companion skill that hard-fails unless `workflow.autonomousComplete` is
   enabled, runs the existing closeout check in autonomous mode plus the
   recorded objective preconditions, and then the completion tail. Batch mode
   is deferred. `oat-wave-execute` points at it.
7. **Design depth (QS-04):** Straight to plan. Every item has acceptance
   criteria or a recorded decision, reconnaissance mapped the code, and no
   open architecture or component-boundary question remains.

## Constraints

- Gates and lifecycle skills run the installed 0.3.10 CLI and user-scope
  skills. New gate and lifecycle behavior is probed with the branch build
  (`node packages/cli/dist/index.js`) where feasible.
- `bundle-assets.sh` must never copy a source tree into its own staging
  directory; tests of the empty-lookup case run in isolation and fail closed,
  never filling the disk.
- Tests that exercise the template bundle tier inject an isolated `HOME`.
- Open PR #335 (another session) owns the docs-bootstrap skills; this wave
  does not edit them.
- Repository Definition of Done (`AGENTS.md`) gates the PR, with explicit exit
  codes and uncached test runs.

## Success Criteria

- Every in-scope acceptance criterion of the 13 items passes, with
  failing-first evidence for behavior changes and neutralize-and-restore
  proofs for guards.
- An empty bundle-inputs lookup makes `bundle-assets.sh` exit non-zero without
  copying.
- A full-surface gate review gets a 30-minute default, a duplicate live gate
  is rejected, and an idle child is killed with a distinct outcome.
- A second `oat sync` after a skipped stale entry is a no-op.
- Every exhaustion point dispatches the complexity review before the decision
  message, with a contract pin per point.
- `oat-project-complete-auto` refuses to run unless opted in.
- The full Definition of Done passes, and the PR opens at lockstep 0.3.13 with
  completed items archived and partial items rewritten.

## Out of Scope

- `BL-260818-distinguish-operator-directed` (consolidated budget-exhausted
  decision point; needs this wave's complexity slice and
  `BL-260927-mark-gate-findings-as-new-or` first).
- `BL-260711-skip-re-review-for-bookkeeping`, `BL-260927-export-only-the-recap-page`.
- Decision-gated: `BL-260907-recognize-phase-level`,
  `BL-260908-date-decision-record-ids`, `BL-260908-remove-the-top-level-skill`,
  `BL-260904-make-quick-the-default-oat`.
- Live action: `BL-260928-settle-codex-read-authority`,
  `BL-260708-verify-cursor-gpt-5-6-subagent`, `BL-260906-harden-dispatch-launch`.
- `BL-261002-port-the-complexity-review` (filed this wave).
- Docs-bootstrap items owned by open PR #335.

## Deferred Ideas

- The early-artifact-template write for gate reviews, after ReviewPlan-first.
- Retiring the copy-strategy compatibility bridge once field installs restamp.

## Open Questions

None.

## Assumptions

- The 2026-09-26 backlog ratings still hold for unchanged items; the 13 new
  or changed items and the shortlist were re-verified against `main` at
  `4f0be26d2` on 2026-10-02 (three read-only reconnaissance lanes, with the
  load-bearing claims spot-checked).
- The installed `complexity-review` skill (from `tkstang/skills`) is the
  source for the condensed reference; its behavior is taken from the installed
  copy, not re-verified upstream.
- External integrations are limited to the Codex and Claude CLIs that gates
  already run; no third-party service is involved.
