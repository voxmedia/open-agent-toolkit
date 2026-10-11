---
oat_generated: true
oat_generated_at: 2026-10-11T08:09:13Z
oat_review_scope: plan
oat_review_type: artifact
oat_review_invocation: gate
oat_project: .oat/projects/shared/brief-goal-workflow-modes
oat_gate_headless: true
oat_gate_run_id: b28524f9-7d10-4c30-8adb-18944a25be3a
oat_gate_target: codex-6-sol-xhigh
oat_gate_runtime: codex
oat_invocation_model: gpt-6.1-sol
oat_invocation_reasoning_effort: xhigh
oat_invocation_source: exec-target-config
---

# Artifact Review: plan, revision 5 (p09–p12)

**Reviewed:** 2026-10-11T08:09:13Z
**Scope:** Artifact-plan readiness and upstream alignment for revised phases p09–p12 only. Phases p01–p08 are implemented and reviewed; their shipped consumers are inspected only where the new goal mode depends on them.
**Workflow mode:** quick
**Files reviewed:** Three primary artifacts (`plan.md`, `discovery.md`, `design.md`), with `state.md` and `implementation.md` for scope, prior v1.5 review references, and targeted consumer contracts/source.
**Baseline:** `f5548ebfdef3f98819b9a24320c72d3597f803da`; artifact review has no code-review range.
**Reconnaissance:** not-attempted
**Dispatch audit (policy view):** `Dispatch: scope=plan action=review role=reviewer producer=unknown provenance=unknown model_axis=selected:gpt-6-astra effort_axis=selected:xhigh dispatch_policy=frontier dispatch_ceiling=xhigh target=oat-reviewer-gpt-6-astra-xhigh`

## Summary

Two High findings block readiness: the plan leaves goal revisions without a milestone-aware owner and does not cover completion's independent PR-creation path in its no-duplicate-PR guarantee. Two Medium findings concern an unqualified recovery status write and a documentation consumer left on the old artifact contract. The revised milestone parser, review subjects, successor evaluator, audit, supersession, promotion and guard controls otherwise have named owners and meaningful verification intent.

Findings by severity: 0 critical, 2 high, 2 medium, 0 low

## Review Scope

The state frontmatter points to `p09-t01`, and the journal records p09–p12 as pending. The review covers their 14 tasks (2/4/3/5), the revision-5 guard supplement, and the applicable design/discovery requirements; it does not re-open the accepted v1 work or the settled architectural choices.

The Dispatch Profile advisory was applied: p12 names the valid `frontier` maximum, matching project policy. Omitted phase rows inherit that ceiling. The recorded operator-selected implementation model is run context, not a replacement ceiling.

The branch-local headless helper returned `inline` with the expected CLI root. The resolver's policy view selects Astra xhigh; the immutable gate frontmatter records this gate's configured Sol 6.1 xhigh invocation separately. No independently observed runtime model/effort identity is claimed.

## Findings

### Critical

None

### High

- **H1 — Give goal revisions a milestone-aware owner** (`.oat/projects/shared/brief-goal-workflow-modes/plan.md:1250`).

  **Issue:** p11-t02 updates review-receive, reconcile and brainstorm, but neither it nor p11-t03 owns `oat-project-revise`. The shipped revise contract limits its taskless branch to `oat_workflow_mode: brief` (`.agents/skills/oat-project-revise/SKILL.md:202`), writes the global journal/state pointers (`:236`, `:263`), and has no milestone membership or recovery logic. It remains a public post-PR feedback entry, including the open-PR brainstorm handoff (`.agents/skills/oat-brainstorm/SKILL.md:766`). With m02 active, inline feedback on m01 therefore has no planned producer that assigns p-rev1 to m01, preserves d01's frozen scope, invalidates its evidence and leaves m02's pointer/status intact. Updating review-receive alone cannot cover inline feedback, which creates no review artifact. This conflicts with design B1/B2 and older-delivery isolation (`design.md:395`, `:400`).

  **Fix:** Add revise to p11 ownership and its contract coverage. Require an explicit milestone/delivery target, phase-only revisions with exact membership, appropriate evidence invalidation, and recovery-state writes for older deliveries instead of global pointer/status writes. Define the matching brainstorm handoff. Verify inline feedback to m01 while m02 is active through the resulting plan/journal/state and real membership/router readers; also retain an active-milestone and ordinary-brief control.

- **H2 — Cover completion's PR-creation path in the no-duplicate-delivery contract** (`.oat/projects/shared/brief-goal-workflow-modes/plan.md:1220`).

  **Issue:** The terminal acceptance case promises coverage without a duplicate PR, but its owned files stop at closeout-check/complete-state. p11-t02 changes implement's snapshot `pr` step and pr-final, while leaving `oat-project-complete` untouched. That skill independently sets `SHOULD_OPEN_PR=true` when `workflow.createPrOnComplete=true` and there is no tracked **open** PR (`.agents/skills/oat-project-complete/SKILL.md:290`), then directly calls `gh pr create` (`:1519`). A valid goal with all delivery members merged can satisfy coverage and the snapshot `pr` step, yet still take this second creation path. A passing complete-state check cannot prove the promised behavior of the actual completion workflow.

  **Fix:** Assign the goal completion decision to a p11 task and extend the terminal probe to the completion skill. Consume validated goal coverage when deciding whether a delivery PR is already satisfied; route genuinely uncovered delivery work through the goal registration owner. Explicitly distinguish any separately intended bookkeeping PR from another goal delivery, preserving other completion steps and non-goal behavior. With an exhaustive declaration/audit, merged deliveries, coverage-satisfied `pr` step and `createPrOnComplete=true`, prove the workflow makes no redundant delivery-creation call; retain an uncovered-scope refusal/recovery control.

### Medium

- **M1 — Scope pr-progress's status write to the active milestone** (`.oat/projects/shared/brief-goal-workflow-modes/plan.md:1250`).

  **Issue:** The pr-progress clause says to write `oat_milestone_status: reviewing` whenever refresh reports stale review/exit evidence, without qualifying the targeted milestone. The same task makes pr-progress an older-delivery recovery owner. On a stale d01 refresh while m02 is active, following this clause changes m02's status even though the recovery record targets m01. The upstream isolation rule explicitly preserves the active milestone's status as well as its pointer (`design.md:395`); the matching design “Recovery producers” paragraph is likewise unqualified at `:438`.

  **Fix:** State the two cases explicitly: active-milestone recovery may write its status; older-delivery recovery writes only the targeted recovery record/evidence. Apply that distinction to every stage owner, including implement and pr-progress. Extend `goal-recovery-evidence` with stale evidence detected at pr-progress entry while another milestone is active, asserting that milestone ID, status and both active pointers remain unchanged.

- **M2 — Include document in goal artifact-consumer coverage** (`.oat/projects/shared/brief-goal-workflow-modes/plan.md:1258`).

  **Issue:** p11-t03's planning/summary inventory omits `oat-project-document`, and no p09–p12 task updates it. Its shipped reduced-artifact branch explicitly accepts only `oat_workflow_mode: brief` (`.agents/skills/oat-project-document/SKILL.md:220`); every other mode falls through to a discovery-first, task-oriented source list (`:230`–`:237`). Goal scaffolding deliberately supplies a Project Brief and phase journal without discovery/spec/design. The configured terminal document step therefore receives conflicting source instructions even if the CLI coverage predicate passes. This is consumer alignment work, not a request to add goal discovery/spec/design artifacts.

  **Fix:** Add document to p11's file set, generalize the shared artifact contract to brief/goal, and name the goal audit/delivery evidence used for shipped results. Include it in p12's consumer-contract verification using a goal project whose only authored requirements artifact is plan.md; the document flow must use the brief/journal and accept the absent upstream files.

### Low

None

## Requirements/Design Alignment

**Evidence sources used:** Current discovery, design, plan, state and implementation artifacts; `references/astra-v15-round-1.md`, `references/astra-v15-round-2.md`, and the prior round-3 plan review for historical context. Load-bearing findings were independently checked against current consumer instructions and the complete revised task inventory.

| Requirement                                                       | Plan coverage                     | Assessment                                                                             |
| ----------------------------------------------------------------- | --------------------------------- | -------------------------------------------------------------------------------------- |
| B1 membership, extraction parsing and real project readers        | p09-t01, p10-t01                  | Named shared reader and surfaced errors; revise producer gap H1 remains.               |
| A1 recovery ownership and B2 explicit review subjects             | p09-t02, p11-t02                  | Named owners and guard controls; H1 and M1 remain.                                     |
| A2 immutable revisions, successor inspection and carrier subjects | p10-t02, p10-t03, p11-t01/p11-t02 | Aligned verification intent; planned proof is not claimed as executed evidence.        |
| A3 terminal declaration, exhaustive audit and read-only boundary  | p09-t01/p09-t02, p10-t03, p11-t01 | One audit predicate, both success paths, child facts and observation failures covered. |
| A4 transitive replacement coverage and historical evidence        | p09-t01, p10-t02/p10-t03, p11-t02 | Effective scopes, reciprocal links, historical bindings and negative controls covered. |
| B3 promotion and B4 observed endpoint before activation           | p10-t04, p09-t02/p11-t01          | Settled-boundary and no-write refusals have owners.                                    |
| Configured terminal lifecycle and no redundant delivery           | p10-t03, p11-t02, p12-t02         | H2 and M2 leave actual closeout consumers incomplete.                                  |
| Release, documentation, role projections and verification gates   | p12-t01–p12-t05                   | Sequential ownership and version/gate policy are explicit.                             |

**Extra work:** No finding. The proposed parser, evaluator, audit and registry machinery each has named production consumers.

## Verification Commands

Executed read-only during this artifact review:

```bash
git status --porcelain -- .oat/projects/shared/brief-goal-workflow-modes/{discovery,spec,design,plan,implementation,state}.md
git fetch origin main
git log --oneline "$(git merge-base HEAD origin/main)..origin/main" -- packages/control-plane packages/cli/src/commands/project .agents/skills .agents/agents apps/oat-docs/docs
"$OAT_GATE_CLI_PATH" gate route --json --expect-runtime codex --expect-model gpt-6.1-sol --can-await true
"$OAT_GATE_CLI_PATH" project dispatch-ceiling resolve --provider codex --role reviewer --preflight --report-scope plan --report-action review --json
"$OAT_GATE_CLI_PATH" --json project validate-plan --project-path .oat/projects/shared/brief-goal-workflow-modes
rg -n '^### Task p(09|10|11|12)-' .oat/projects/shared/brief-goal-workflow-modes/plan.md
rg -n 'oat-project-revise' .oat/projects/shared/brief-goal-workflow-modes/plan.md
rg -n 'revise|milestone|recovery' .agents/skills/oat-project-revise
rg -n 'SHOULD_OPEN_PR|gh pr create|delivery-coverage' .agents/skills/oat-project-complete/SKILL.md
pnpm exec oxfmt --check .oat/projects/shared/brief-goal-workflow-modes/plan.md
```

The core baseline was clean; fetched main had no intervening commits in the named planned paths; the route envelope and resolver were valid; validate-plan returned `{"valid": true}` with exit 0; the task inventory was 2/4/3/5; the pre-write formatting check passed. Validation checks format/metadata, not completeness of lifecycle coverage.

This is an artifact review of future work. Goal implementation is not present yet, so no goal runtime guard or remote PR mutation was executed and no positive-suite result is offered as proof of those future guarantees. The finding-specific controls above are the smallest requested additions to the plan.

### Artifact validation after writing

The branch-built `parseReviewGateVerdict` consumed the formatted artifact and returned `{critical: 0, high: 2, medium: 2, low: 0}` with `blocking: true`. Assertions matched all gate invocation fields, the headless marker, canonical heading order and the reconnaissance signal; it found one labeled policy audit and zero unlabeled audits. `review latest --actionable-project` selected this exact active artifact. File-scoped `oxfmt --write`/`--check`, `git diff --check`, and post-bookkeeping `project validate-plan` passed.

Repeat the parser inspection with:

```bash
node --input-type=module -e 'import { parseReviewGateVerdict } from "./packages/cli/dist/commands/gate/review-verdict.js"; console.log(await parseReviewGateVerdict(".oat/projects/shared/brief-goal-workflow-modes/reviews/artifact-plan-review-2026-10-11T080913Z.md"));'
```

## Recommended Next Step

Run `oat-project-review-receive` for this gate artifact. Amend the p11 consumer ownership and terminal/recovery verification before proceeding with the revised goal delivery.
