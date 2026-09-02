---
oat_generated: true
oat_external_plan: true
oat_external_plan_source: backlog-review
oat_external_plan_sources:
  - .oat/repo/pjm/backlog/reviews/backlog-and-roadmap-review.md
  - .oat/repo/pjm/backlog/reviews/priority-alignment.md
  - .oat/repo/pjm/backlog/items/BL-260818-require-repo-wide-call-site.md
oat_external_plan_commit: 49aeb5075971180b48c131bbd2b21b82d455bfc9
oat_external_plan_date: '2026-09-02'
oat_execution_status: READY
oat_backlog_items:
  - BL-260818-require-repo-wide-call-site
oat_issue_url: null
created: '2026-08-31T00:01:21Z'
---

# Require repo-wide call-site sweeps for cross-cutting options

> [!NOTE]
> This is an external implementation plan, not a canonical OAT project
> `plan.md`. Execute it directly, or import it for tracked OAT execution with
> `oat-project-import-plan <this-file>`.
>
> Begin with the drift check. Follow the steps and verification gates in order.
> If a STOP condition occurs, stop and report instead of improvising.

> [!IMPORTANT]
> **Execution status: READY.** The phase implementer is the normative owner.
> Add a bounded cross-cutting-option rule there and a stable contract test; do
> not redesign task planning or front-load every possible recurring gate.

## Outcome

When a task adds or changes an option consumed across module boundaries, the
phase implementer enumerates definitions and call sites repository-wide before
editing. It may widen the execution boundary only when the existing task
outcome already requires those files and no sibling ownership is crossed;
otherwise it stops with the exact discovered set. A declared file list remains
review scope, not a correctness boundary.

## Source and live evidence

- Source backlog item:
  [BL-260818-require-repo-wide-call-site — Require repo-wide call-site sweeps](../../pjm/backlog/items/BL-260818-require-repo-wide-call-site.md)
- Planned at: `origin/main` commit
  `49aeb5075971180b48c131bbd2b21b82d455bfc9` on `2026-09-02`.
- Verified evidence:
  - [explainer-improvements-v2 summary](../project-summaries/20260818-explainer-improvements-v2.md)
    at lines 75-81 and 111-114 records that `publicAccess` was threaded only
    through the declared file boundary while four external call sites retained
    a protected-mode durability regression.
  - Commit `6f20182cd` carried the incomplete boundary-scoped implementation;
    commit `159c8901c` repaired the omitted call sites.
  - `.agents/agents/oat-phase-implementer.md:348-374` says to read the declared
    file boundary and implement only the task, but contains no cross-cutting
    option exception or repo-wide sweep obligation.
  - `.agents/agents/oat-phase-implementer.md:161-240` already permits
    mechanically derived in-phase boundary widening during post-commit
    recovery and stops on non-mechanical widening. The new pre-edit rule must
    align with, not weaken, that existing distinction.
  - `.agents/skills/oat-project-implement/SKILL.md:191-216` routes phase work to
    the phase implementer, making the agent contract the narrow normative owner.
  - `packages/cli/src/commands/init/tools/shared/post-implement-sequence-contracts.test.ts:850-865`
    already tests phase-implementation sequencing and is the focused seam for a
    stable prose contract.

## Dependencies

| Type              | Dependency                                                                                            | Required state                                                                                          | Current state            |
| ----------------- | ----------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------- | ------------------------ |
| Soft coordination | [BL-260706-front-load-recurring-gate](../../pjm/backlog/items/BL-260706-front-load-recurring-gate.md) | Avoid duplicating any future generic brief guidance; this plan owns only the phase-time call-site rule. | Open, broader mechanism. |

There are no unsatisfied hard dependencies.

## Drift check

Run before editing:

```bash
git fetch origin main
git diff --stat 49aeb5075971180b48c131bbd2b21b82d455bfc9..origin/main -- .agents/agents/oat-phase-implementer.md .agents/skills/oat-project-implement/SKILL.md .agents/skills/oat-project-implement/references/phase-execution.md packages/cli/src/commands/init/tools/shared/post-implement-sequence-contracts.test.ts packages/cli/package.json packages/control-plane/package.json packages/docs-config/package.json packages/docs-theme/package.json packages/docs-transforms/package.json pnpm-lock.yaml
```

If another change already defines cross-cutting option handling, reconcile to a
single owner and refresh this plan rather than adding parallel wording.

## Repository conventions

- Canonical agent edits are bundled assets; run `oat sync --scope all` and
  inspect managed views.
- Do not edit `oat-project-implement/SKILL.md` unless the agent-level rule
  cannot be reached through the existing dispatch contract. If it is edited,
  bump that skill version exactly once.
- Run `pnpm lint && pnpm format` for `.agents` changes.
- Bump all five public package versions together and update `pnpm-lock.yaml`.
- Use semantic anchors in tests; never encode physical prose line numbers.
- Run the focused contract test independently, then the full Definition of Done.
- Do not push or open a PR unless instructed.

## Scope

### In scope

- `.agents/agents/oat-phase-implementer.md` — cross-cutting option detection,
  repo-wide sweep, and mechanically-widen-or-stop rule.
- `post-implement-sequence-contracts.test.ts` — stable contract assertions and
  a negative mutation/probe.
- Managed provider views, five public package versions, and `pnpm-lock.yaml`.

### Out of scope

- Replanning the historical explainer project.
- Requiring a repo-wide sweep for every local parameter or implementation edit.
- Silently changing a task outcome, shared-file ownership, phase grouping, or
  `plan.md` structure.
- Generic recurring-gate brief design.
- Changing implementation ordering, review gates, or commit authority.

## Current state

The phase contract treats the declared file boundary as both scope and an
implicit search limit. That is safe for local changes but unsafe when adding a
configuration field, parameter, schema property, or policy option whose callers
span modules. The rule must trigger on the nature of the interface change, not
on a hard-coded symbol or the size of the declared file list.

## Implementation steps

### 1. Define the cross-cutting trigger and inventory

Add a focused subsection at the start of task execution in
`oat-phase-implementer.md`. Trigger it when a task adds or changes an option,
argument, configuration field, schema property, or policy value consumed
outside its defining module.

Require a repository-wide symbol/property sweep covering declarations,
constructors, adapters, serializers/deserializers, fixtures, mocks, tests, and
call sites. Prefer `rg` plus language-aware checks already available in the
repo; do not prescribe one tool as proof of completeness.

**Verify:** the rule would have enumerated all `publicAccess` callers cited by
the historical summary before the first edit.

### 2. Define the mechanically-widen-or-stop decision

State explicitly that a declared file boundary is review scope, not a
correctness scope. When discovered files are necessary to the already-declared
task outcome and are not owned by a sibling/parallel task, define the effective
task boundary as the original list plus the mechanically discovered files and
proceed. Record every addition in the implementation report's Task Outcomes
`Files` cell and Self-Review Observations. Do not silently edit `plan.md`.

Stop and return the exact files plus ownership conflict when the expansion
changes the outcome, crosses sibling ownership, invalidates parallelism, or
requires a new design decision. Preserve the existing no-scope-expansion rule.

**Verify:** examples distinguish a mechanical caller propagation from a new
feature or shared-file coordination decision.

### 3. Add a stable phase-contract test

Extend `post-implement-sequence-contracts.test.ts` to extract the task-execution
section and assert all four properties: cross-module trigger, repo-wide call
site inventory, file-boundary-is-not-correctness wording, and widen-or-stop
behavior with ownership protection. Also assert that an allowed expansion is
reported through the existing Task Outcomes and Self-Review surfaces.

Add a negative probe that retains generic “search call sites” wording but
removes either repository-wide scope or the stop boundary; it must fail.

**Verify:** focused test red/green proof passes after restoration.

### 4. Refresh shipped views and release bookkeeping

Run `oat sync --scope all`, inspect generated agent views, bump all five public
packages together, and update `pnpm-lock.yaml`. Bump
`oat-project-implement` only if its canonical `SKILL.md` was actually changed.

### 5. Run complete gates

Run the repository Definition of Done in order, with the focused contract test
executed independently and `origin/main` fetched immediately before version
validation.

## Test plan

- Stable semantic assertions over the phase task-execution section.
- Negative probe for a local-only sweep and for silent boundary expansion.
- Existing phase sequencing tests remain green.
- Managed-view, lint/format, package-version, release, and full repository gates.

## Done criteria

- [ ] Cross-cutting option changes trigger a repo-wide caller inventory.
- [ ] The inventory covers non-production callers and serialization boundaries.
- [ ] Mechanical expansion is allowed only inside the existing task outcome and
      without sibling ownership conflict.
- [ ] Ambiguous or ownership-changing expansion stops with exact evidence.
- [ ] `plan.md`, lifecycle ordering, and review gates are not silently changed.
- [ ] A non-vacuous contract test guards all required properties.
- [ ] Managed views, package versions, and all gates pass.
- [ ] `git status --short` contains no unexplained file.

## STOP conditions

Stop and report instead of improvising when:

- the normative phase owner moved or already contains an equivalent rule;
- “mechanical” expansion changes behavior beyond the declared task outcome;
- discovered files are owned by a sibling or active parallel lane;
- correctness requires mutating plan structure or redesigning phase dispatch;
- the negative probe does not fail when a required property is removed; or
- a named verification gate fails twice after one bounded correction.

## Revalidation Before Execution

Revalidate against current `origin/main`, the source backlog item, both cited
historical commits, the explainer summary, phase implementer, implement skill,
and focused test when main advances materially from
`49aeb5075971180b48c131bbd2b21b82d455bfc9`, phase ownership or wording changes,
the broader recurring-gate item lands, or the cited gap cannot be reproduced.
Refresh or supersede stale scope before execution.

## Review focus

- Test the trigger against local-only and genuinely cross-module options.
- Protect sibling ownership and the no-plan-mutation boundary.
- Confirm the test cannot pass on generic “search call sites” prose.
- Ensure no unrelated planning or review contract changes slipped in.
