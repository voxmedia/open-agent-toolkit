# Handoff: Recon rework planning continuation

## Start here

Take over the existing quick project in:

```text
Worktree: /Users/tstang/orca/workspaces/open-agent-toolkit/recon-rework
Branch: recon-rework
Project: .oat/projects/shared/recon-rework
Workflow: quick, native
Design mode: lightweight draft
Next step: run oat-project-implement from p01-t01
```

Thomas originally authorized discovery capture and design/plan drafting, then a
stop before self-review and plan/gate review. Three plan-review cycles were later
received on 2026-09-09, and all findings were applied directly to the planning
artifacts. At the three-cycle cap Thomas manually accepted the corrected aggregate
plan and authorized pushing it for cloud execution. He then set the final project
dispatch ceiling to managed `high`.
The project remains at `oat_phase: plan` with `oat_phase_status: complete`; plan
`oat_ready_for: oat-project-implement` and `oat_template: false` expose the ready
handoff.

**Do not scaffold again, restart discovery, or launch another planning review.**
Load `oat-project-implement`, confirm implementation HiLL checkpoints, and begin
with `p01-t01`. The final appended plan-review event records manual acceptance as
`passed`; earlier events retain their historical `fixes_completed` status.

## Reading order

1. `discovery.md` — confirmed intent, decisions, scope, and boundaries.
2. `design.md` — proposed architecture, version boundary, conditional rules,
   exact target semantics, and testing strategy.
3. `plan.md` — four sequential phases and nine atomic tasks.
4. `references/source-context.md` — repository anchors, governing decisions,
   historical cautions, baseline observations.
5. `state.md` and `implementation.md` — readiness/tracker state.

These files contain the relevant context without requiring the 8,701-line export
or another agent's temporary scratchpad. Read the historical audit only to
investigate a disputed baseline claim; its early recommendations are superseded.

## Product intent to preserve

Recon's purpose is cheap, high-volume, multi-wave **evidence acquisition for an
intelligent caller**. Bounded workers find, extract, cite, reopen sources, seek
counterexamples, check coverage, and assemble dossiers. The caller evaluates the
evidence, resolves material ambiguity, and owns final conclusions.

"Adversarial," "verification," and "synthesis" are assignments, not automatic
model classes. Cheap workers can look for disagreeing evidence. Mechanical
compilation deduplicates/groups findings and preserves both sides. An optional
adversary-mode contradiction-resolution pass may seek discriminating evidence,
but exactly one terminal reconcile pass performs synthesis. If judgment needs are
foreseeable, approve an adequate terminal target up front; if they emerge after
approval, return an explicit unresolved/out-of-envelope gap rather than replacing
synthesis with another evidence search. The root retains final interpretation and
sufficiency judgment.

The user specifically wants an economical per-wave model/effort proposal so they
can push back before money is spent. A harder wave must not raise every worker.
Use existing `subagent-orchestration` provider guidance and
`oat-dispatch-subagents` selection/launch mechanics; do not embed fixed provider
model menus in recon. Keep model, effort, reasoning mode, and service tier
independent and native to the harness.

User examples included cheap Claude Haiku/Sonnet workers, Cursor Composer with
stronger consolidation as needed, and Codex Luna with Terra for interpretation.
They illustrate desired roles; they are not newly verified selector availability,
mandatory models, or a permission to weaken real capability floors.

The selected guarantee is **approved per-wave selection**. Do not claim verified
actual launch without real harness-produced evidence. No receipt framework or
native launcher rewrite is in scope.

## What has been done

- Used the user-provided existing worktree on this Mac; no worktree created.
- Ran repository bootstrap successfully with irrelevant S3 archive sync skipped.
- Scaffolded the quick project through the source CLI; scaffold commit
  `dca0c54bfbe209107cd5bf8911319303112367b7`.
- Captured discovery from the conversation and completed it through
  `oat project complete-discovery`.
- Drafted lightweight design and nine-task plan.
- Initialized the implementation tracker with zero tasks started.
- Added this handoff and a portable source map.
- Performed artifact formatting and mechanical metadata/shape checks only;
  consult implementation.md for the actual checks recorded.
- Received the manual plan artifact review generated at 2026-09-09T16:37:11Z,
  applied all 12 findings to the planning artifacts, and retained the event for
  re-review as `fixes_completed`.
- Received two further plan reviews, applied their six verification findings and
  two topology findings, and archived both events as `fixes_completed`. The final
  topology is optional adversary-mode contradiction evidence followed by exactly
  one terminal reconciliation with an independently approved target.
- Committed the drafting and review work. Discover the current handoff commit with
  `git log -3 --oneline`; no PR was created.

No implementation code, canonical skill, provider reference, governing decision,
backlog record, or public version was changed. No live-provider worker test ran.
The corrected aggregate plan is manually accepted and ready for implementation.

## Resume procedure

1. In this worktree, read applicable AGENTS.md and current installed lifecycle
   skills. Run `git status --short --branch` and `git log -3 --oneline`.
   Preserve any newer user/peer work; do not stash, reset, or change another
   worktree. The user already created this visible worktree.
2. Verify the active project resolves to this exact path. The original scaffold
   reported shared scope. Re-resolve rather than trusting a stale environment
   variable. If missing locally, use the normal project-open workflow.
3. Load `oat-project-implement/SKILL.md`. Retain stable task IDs and all review
   rows; do not copy templates over the accepted plan.
4. Read discovery/design/plan as one bundle. Discovery is sufficiently covered;
   ask only about a substantive ambiguity introduced by current evidence or
   review. Engineering proposals are identified in design rather than falsely
   recorded as user-approved schema choices.
5. Preserve the complete dispatch ladder and managed `high` project ceiling.
   Do not infer that cheap recon workers imply cheap implementation/final review
   for this contract.
6. Preserve the absent optional phase-gate setting and the explicit project
   lifecycle override that disables only `oat-project-quick-start`. Built-in phase
   reviews and implementation/final gates remain unchanged.
7. Do not run the configured quick-start gate: Thomas's manual acceptance closed
   the capped plan-review loop, and the project override records that decision.
8. Start `oat-project-implement` and confirm implementation HiLL checkpoints.
9. Implement sequentially from `p01-t01`. Each task has file ownership,
   formatting, verification, and an atomic commit. Record actual outcomes.
10. Run normal root phase reviews, final review, and configured implementation
    exit gate. Push/PR/merge and live-provider spending remain separate actions
    requiring their applicable authorization.

No fake `workflow.autoArtifactReview.plan=false` skip was persisted.
`oat_plan_hill_phases` is absent intentionally; an empty list would mean
every phase, not "undecided."

## Design proposals needing review attention

These are the main engineering choices to assess, not findings from a self-review:

- **Manifest-only v2:** retain v1 evidence kinds and legacy manifest/fingerprint
  behavior, then normalize to one internal effective routing graph. Avoid a global
  version bump that rejects all old packets.
- **Whole-target inheritance:** a complete wave override replaces the inherited
  target; do not merge partial provider/effort axes.
- **Nullable unsupported effort:** explicit absence of an independent effort
  request must remain distinguishable from silently dropping a requested control.
- **Single-terminal escalation topology:** predeclare an optional adversary-mode
  contradiction-resolution evidence pass with its own IDs/outputs/target, followed
  by exactly one terminal reconciliation under its own approved target. Evidence
  search is not judgment-bearing synthesis; conditions are not accepted-failure
  retries.
- **Condition dispositions:** record triggered/not-triggered/unresolved outside
  immutable approval, validate references and gaps, and never pretend those
  root-authored records prove native launches.
- **Economical defaults helper:** all ten modes have bounded defaults plus
  concrete reasoning for an escalated task. The helper is not a model-price or
  capability oracle.
- **Existing assurance:** retain independent review, source identity, locator,
  secrecy, immutable ledger, and atomic publication rules. Cheap workers do not
  license easier success criteria.

If a reviewer recommends a materially different product boundary, bring that
decision to Thomas. Local schema/code improvements consistent with the confirmed
intent can be handled through the normal review/fix workflow.

## Scope and coordination

Recon is its own project, separate from the recap spec-driven project and the
corrective wave 7. The other session owns triage/backlog changes. This explicit
project drafting request supersedes the earlier proposal to wait for triage merge;
it does not authorize this agent to apply that triage.

Source issue: `https://github.com/voxmedia/open-agent-toolkit/issues/274`.
At the planning baseline no new canonical backlog record for #274 was assumed.
Before shipping, find any subsequently created record and link/close it through
its owning workflow. Do not manufacture a duplicate or claim the recap issue.

Narrow shared guidance clarification is in scope. A broad provider ladder refresh,
native dispatch rewrite, new receipt producer, pricing database, or lifecycle
integration of recon is not. Preserve unrelated same-target gate policy.

## Verification and release constraints

The full plan lists the exact eight CI gates in repository order, plus lint/format
for skills and fresh non-Turbo supplements when needed. Runtime scripts/tests use
Node ESM; CLI tests use scoped `pnpm --filter @open-agent-toolkit/cli exec vitest
run ...`. Build before standalone smoke/release suites that load CLI dist.

Preserve meaningful negative controls for approval mutation and conditional
outcomes. Test the production routing helper through its CLI and fake workflow;
do not let a fake launcher provide a second untested implementation. Fixture
results cannot prove live provider qualification or actual runtime identity.

Canonical skills currently use metadata.version; roles follow their separate
current convention. Bump changed skills once per PR. All five public packages
move together for bundled functionality. Resolve versions against current
origin/main during implementation, not from the old proposal's numbers.

## Suggested next-agent opening instruction

> Take over the quick project at .oat/projects/shared/recon-rework in this
> worktree. Read handoff.md, discovery.md, design.md, plan.md, and the source map.
> Discovery is already covered. All three plan-review cycles' fixes are applied,
> and Thomas manually accepted the corrected aggregate plan at the cycle cap. The
> plan is ready for `oat-project-implement` under managed `high` dispatch.
> Confirm HiLL checkpoints, then begin at p01-t01. Preserve cheap evidence workers
> with caller-owned judgment, the single terminal reconciliation, per-wave exact
> approval, v1 compatibility, and the prohibition on invented launch provenance.
> Do not re-scaffold, launch another planning review, or change the other worktree.
