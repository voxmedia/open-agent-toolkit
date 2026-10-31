---
oat_status: complete
oat_ready_for: null
oat_blockers: []
oat_last_updated: 2026-10-31
oat_generated: true
oat_summary_last_task: p05-t03
oat_summary_revision_count: 0
oat_summary_includes_revisions: []
oat_summary_learnings_fingerprint: 5ccf6fc10202fae3e4e609641437fcf0da3d69b5e930c980ab45c3e2fb33b45d
---

# Summary: delivery-evidence-and-knowledge-preflight

## Overview

The 2026-10-30 triage confirmed four defects against `main`, and this project fixed all of them in one PR. Three were in goal-mode delivery evidence. A stacked delivery always read stale. The configured exit gate's own review artifact staled the carrier it had just produced. `journal check` missed rewrites of committed journal lines that delivery check would later reject. The fourth was in `oat-repo-knowledge-index`, which could delete generated knowledge before it knew a mapper worker could launch, and which only launched mappers correctly on Claude.

## What Was Implemented

- **Stacked goal deliveries ([#383](https://github.com/voxmedia/open-agent-toolkit/issues/383)).** A `kind: stack` delivery's exit carrier is now judged at the stack tip. Every lower layer must first be confirmed as the tip or one of its ancestors, and a violation reports `stack-order`. Missing commits report `missing-object` or `inspection-failed` instead, so an unfetched commit never steers the operator toward supersession. Null and unreviewed-resolution carriers behave exactly as they do for `kind: pr`. `delivery check`, `delivery refresh` and the closeout check share one wrapper, `evaluateDeliveryExitCarrier`. Once a delivery is registered, milestone and delivery subjects build the same evidence scope through `latestDeliveryForMilestone`. `kind: stack` is documented, and pr-progress registers a stack by attaching to it.
- **Exit-gate bookkeeping ([#384](https://github.com/voxmedia/open-agent-toolkit/issues/384)).** The gate's own artifact commit counts as a bookkeeping successor of the carrier it produced when its Reviews row meets four conditions: Type is `code`, Invocation is `gate`, the row carries the carrier's reviewed head, and the artifact lives under `reviews/`. The artifact never becomes integrated-review evidence and never unlocks set-once delivery fields. No placeholder row is needed. Goal exit-gate guidance and brief contract §12.8 now match the configured `--review-scope final` command.
- **Journal rewrite detection ([#385](https://github.com/voxmedia/open-agent-toolkit/issues/385)).** In goal projects, `oat project journal check --at implement-preflight|review` compares the working journal with `HEAD`. It uses the exported `journalRewrites` rule that delivery evidence already applies, and refuses (exit 1) with one `journal-line-rewritten` reason per rewritten or removed committed line. Unparseable committed frontmatter also refuses, with owner `oat-project-reconcile`. Aliased absolute paths resolve through Git, and a dangling `HEAD` is a command error.
- **Knowledge-index preflight ([#355](https://github.com/voxmedia/open-agent-toolkit/issues/355)).** `oat-repo-knowledge-index` (1.4.0) resolves and authorizes a mapper route through `oat-dispatch-subagents` before any knowledge is deleted or written, on both the first-run and Refresh paths. Claude, Codex and Cursor each get a labelled route. The write probe is a `generator` request that must produce a verified file. A probe that never launched counts as a route failure, not as read-only mode. The maintainer-specific temp path is gone.
- **Release.** All five public packages are at lockstep 0.3.38. `oat-project-brief` 1.0.4, `oat-project-implement` 2.3.23, `oat-project-pr-progress` 1.3.6 and `oat-repo-knowledge-index` 1.4.0 are each bumped once. The four backlog items are archived as closed.

## Key Decisions

- **Judge stacked delivery exit carriers at the stack tip:** a stack reviewed at its tip is evaluated against the tip member's observed head only, after a stack-order check confirms each lower member is an ancestor of the tip. The check applies only to configured code carriers bound to a reviewed head; `kind: pr` and `null` keep every-member evaluation. Registration attaches an existing gh-stack set base to tip rather than creating one, and a mis-ordered stack is replaced by supersession.
- **Bind gate-artifact admission to tracked Reviews-row cells:** the gate's artifact is admitted as bookkeeping only through the append-only row's `Invocation: gate` and reviewed-head cells, plus a `reviews/` path restriction. The alternative was reading the artifact's `oat_review_phase_ids` frontmatter, but the commit being judged could rewrite that file, which would contradict the §12.8 rule that unlocks come only from tracked append-only rows.
- **Limit journal rewrite detection to goal projects at the preflight and review boundaries:** only goal mode enforces the append-only journal rule, so flagging brief projects would produce false positives. `--at completion` and `complete-state` are unchanged, so they keep judging identical bytes.
- **Route knowledge-index mappers through the generic dispatcher:** the skill must work on Codex and Cursor as well as Claude. Claude-specific launch controls (`haiku`, `run_in_background`, `Explore`) are confined to a labelled Claude route, and no knowledge is mutated before a route resolves.

## Design Deltas

- **#385 scope narrowed.** The backlog item asked for "at least goal and brief". Shipped detection is goal-only and does not report new extraction markers, which delivery evidence still rejects.
- **#384 binding differs from the issue's proposal.** Admission uses Reviews-row cells rather than artifact frontmatter, and the `reviews/` path restriction was added after p02 review found that a forged row could admit a non-review path.
- **Milestone stack deviation retracted.** p02-t01 had milestone subjects evaluate a registered stack's carrier on stored member heads. Review H1 showed that this judged the carrier on stored heads but the review on local `HEAD`, so an ungated commit could read as deliverable. p02-t03 reverted it: milestone subjects keep branch-head evaluation, and stack controls run with `--subject dNN`.
- **Stack-order rule scoped.** p01 review moved topology checks after the carrier's own checks, so null and unreviewed carriers match `kind: pr`. The contract, CLI reference and `design.md` were aligned to match.
- **#355 simplified at the review-cycle cap.** The stray-change check was removed, with a reintroduction trigger recorded in the complexity report. The contract pin was cut from 38 assertions to 10 structural ones.
- **Version retarget.** `main` reached 0.3.37 during the run (#389), so the lockstep bump moved from 0.3.37 to 0.3.38. p05 was also amended so the version-pin file is in task scope and the backlog archive is committed before the gates run.

## Notable Challenges

- **p04 hit the three-cycle review cap.** Round 1 found a Critical: the Refresh branch bypassed the preflight and could delete knowledge before a route resolved. It also found a High: the contract pin stayed green for four of six seeded regressions. Later rounds kept surfacing Mediums, the last one a regression from the Codex stray-change check. A complexity review returned "Partially compliant, recommended simplify". The operator chose simplify, and the post-simplify review passed with 0C/0H/0M/2L.
- **Fix-mode rejection in p03.** The p03 implementer (gpt-5.6-sol-medium) returned BLOCKED on Medium/Low review-fix tasks because its fix-mode contract accepts only Critical and High findings. The queued tasks were rerun as an implementation request on the same handle.
- **p05 direction-required stop.** `pnpm test` failed on nine stale skill-version pins and on two Markdown-scan failures caused by uncommitted archive moves. The phase scope had omitted the `state.md` recovery-ledger exception, so no recovery attempt could be reserved. The root amended the plan, and a phase-standing recovery (attempt 1 of 10) fixed the pins.
- **Exit-gate runtime outage.** The first exit-gate run selected `claude-opus-5-5-high`, which hit its weekly usage limit (`review_failed`; no attempt consumed). The operator retired that generation and switched the gate to the Sol target through a local override. The rerun passed with no findings.

## Tradeoffs Made

- **Workflows→utility pack dependency not declared.** After #355, `oat-repo-knowledge-index` (workflows pack) needs the utility pack's dispatch skills. The skill names the recovery commands (`oat tools install utility` or `oat tools update --pack utility`) instead of declaring a dependency, because a same-scope declaration would conflict with documented mixed-scope installs, and workflows already depends on these skills without declaring it.
- **Simplicity over the Codex stray-change check.** Under the projection's `workspace-write` sandbox, Codex lanes write only their declared outputs. This was preferred over a late `git status` check that had no baseline and misfired on unrelated dirty work.
- **Attach-only stack registration.** pr-progress records an existing stack and does not create one, which keeps registration small and leaves stack topology to gh-stack.

## Integration Notes

- The delivery-evidence negative controls ran through the production scope builder and the built CLI (`node "$REPO/packages/cli/dist/index.js" --json project delivery check` from inside each scratch repository). Each P0 guard (tip selection, stack order, gate head binding, own-evidence isolation, journal rewrite) has a recorded can-fail proof in `implementation.md`.
- The knowledge-index contract pin in `skills-bundled-docs-contract.test.ts` now makes structural assertions on whitespace-collapsed text, so rewrapping the skill's prose should not break it. Moving the preflight after Step 2, or Claude controls outside the Claude route, will.
- `journal check` reports only uncommitted rewrites. Rewrites that are already committed remain delivery check's to reject.

## Autonomous Execution Learnings

### Agent-instruction updates

- Add an explicit kickoff skip source for `projectRecap` in `oat-project-autonomous` Step 2.5, mirroring `generate/kickoff_prompt` for `projectExplainer`, and state that an operator instruction outranks the forced autonomous recap. Rationale: honoring the operator's kickoff skip meant persisting `skip/interactive` against the skill text. Still uncertain whether the forced recap was meant to override explicit operator instructions or only preferences such as `never`. oat-archive:20261031-delivery-evidence-and-knowledge-preflight#2026-10-30-feedback-operator-recap-skip-vs-autonomous-forced-recap-1

### Workflow issues

- Route Medium/Low review-fix plan tasks through `mode: implement`, or let fix mode accept queued review-fix tasks explicitly, and align the phase-implementer contract with review-receive auto-disposition. Rationale: one dispatch was wasted when the p03 implementer rejected the tasks in fix mode, while p01 and p02 implementers accepted the same shape. Still uncertain which side was out of contract. oat-archive:20261031-delivery-evidence-and-knowledge-preflight#2026-10-31-friction-fix-mode-rejects-medium-low-review-fix-tasks-1

## Explainer Outcome

- **project-recap:** skipped — operator choice

## Follow-up Items

- **Deferred (Low, p02 review L1, second part):** treat a change to an existing non-placeholder `Invocation` cell as a Reviews-row identity change in `judgeReviewRows`. It was deferred because it widens the ledger identity rule beyond #384's scope. The `reviews/` restriction already closes the non-review-path exposure. Trigger: an operator decision or a later evidence-hardening item.
- **Pack dependency:** declaring a workflows→utility dependency awaits operator sign-off.
- **Issue links:** issue comments posted at triage link pre-archive `backlog/items/` paths, which 404 after merge. The final PR description and any post-merge comments should link the `backlog/archived/` paths.
- **Out of scope:** #353, #354 and #360; a commit-time journal guard in `oat internal commit-paths`; an `oat project journal append` helper; an Amp provider adapter or an automatic inline mapper fallback.

## Associated Issues

- [#383](https://github.com/voxmedia/open-agent-toolkit/issues/383) — `BL-261030-evaluate-stacked-goal-delivery` (closed, archived)
- [#384](https://github.com/voxmedia/open-agent-toolkit/issues/384) — `BL-261030-admit-goal-exit-gate-review` (closed, archived)
- [#385](https://github.com/voxmedia/open-agent-toolkit/issues/385) — `BL-261030-flag-rewritten-committed` (closed, archived)
- [#355](https://github.com/voxmedia/open-agent-toolkit/issues/355) — `BL-261030-preflight-knowledge-index` (closed, archived)

## Workflow Observations

- **2026-10-31 · friction · Fix mode rejects Medium/Low review-fix tasks** (project, gotcha) `oat-archive:20261031-delivery-evidence-and-knowledge-preflight#2026-10-31-friction-fix-mode-rejects-medium-low-review-fix-tasks-1`
  review-receive in auto-disposition mode converts Medium and Low findings into plan fix tasks, and the implement fix loop resumes the phase implementer in mode: fix; the p03 implementer (gpt-5.6-sol-medium) returned BLOCKED because its fix-mode contract accepts only Critical/High findings, while the p01 and p02 implementers (gpt-5.6-sol-high) accepted the same shape.
  Uncertainty: whether the p01/p02 acceptance was a contract violation or the p03 rejection was over-strict.
- **2026-10-30 · feedback · Operator recap skip vs autonomous forced recap** (project, decision) `oat-archive:20261031-delivery-evidence-and-knowledge-preflight#2026-10-30-feedback-operator-recap-skip-vs-autonomous-forced-recap-1`
  The operator explicitly asked at kickoff to skip the project recap, but oat-project-autonomous Step 2.5 forces projectRecap generate/autonomous_policy and the lifecycle contract ranks lifecycle mode policy above project state; no kickoff-skip source exists for projectRecap.
  Uncertainty: Whether the forced recap was meant to override explicit operator instructions or only workflow preferences such as never.

Synthesized recommendations for categorized learnings are in the Autonomous Execution Learnings section.
