---
oat_status: complete
oat_ready_for: null
oat_blockers: []
oat_last_updated: 2026-04-23
oat_generated: true
oat_summary_last_task: prev2-t03
oat_summary_revision_count: 2
oat_summary_includes_revisions:
  - p-rev1
  - p-rev2
---

# Summary: subagent-implement-refactor

## Overview

This project evolved `oat-project-implement` from a sequential task-by-task orchestrator into a phase-oriented execution workflow. The new model dispatches each phase through `oat-phase-implementer`, keeps review gates via `oat-reviewer`, and represents parallel execution as plan metadata instead of a separate skill. The original goal was context relief and cleaner merge behavior on larger plans; the final branch also absorbed several rounds of real dogfooding feedback from Codex and Claude-hosted runs.

## What Was Implemented

**New phase implementer agent.** Added `.agents/agents/oat-phase-implementer.md` as the canonical phase worker and synced provider views, including `.codex/agents/oat-phase-implementer.toml`.

**`oat-project-implement` v2.0.x.** The skill now does capability detection, fail-closed Tier selection for Codex authorization, phase dispatch, per-phase reviewer dispatch, bounded fix loops, resumption handling, dry-run support, and phase/group bookkeeping. It no longer silently downgrades from subagent execution to inline execution when Tier 1 is available but needs authorization.

**Plan validation and template changes.** Added `oat project validate-plan`, plan metadata validation, `oat_plan_parallel_groups`, simplified implementation-template orchestration output, and removed `oat_execution_mode` from state handling.

**Quick-start and planning guidance.** `oat-project-plan` and `oat-project-quick-start` now require a real parallelism pass instead of treating sequential execution as the default planning posture. Plans must document why phases are sequential or parallel and use exact scoped verification commands.

**Review/runtime hardening from dogfooding.** Codex review dispatch was tightened to use self-contained artifact-driven reviewer packets with `fork_context: false`, plus bounded timeout/nudge fallback guidance. The workflow now distinguishes per-phase reviewer gates from optional HiLL checkpoint auto-review.

**Tool sync and bundling fixes.** `oat tools update --all` now preserves the expected bundled assets for this workflow: the phase implementer agent syncs correctly, Claude/Codex provider views stay in step, and `oat-project-implement/tests/` fixtures are not incorrectly bundled as shipped skills.

**Final polish and regression fixes.** The branch closed with a targeted re-review/fix loop that fixed the workflow-agent install test regression, reconciled stale OAT bookkeeping for `p-rev1`/`p-rev2`, corrected the final review ledger, and tightened the verification command for the bookkeeping reconciliation task.

## Key Decisions

- **One implementation skill, not two.** The separate `oat-project-subagent-implement` skill was deleted. Parallelism is now plan metadata consumed by `oat-project-implement`.
- **Phase is the dispatch unit.** This is the granularity that reduced context pressure without reintroducing the merge churn of task-level parallelism.
- **Subagent execution is the intended Tier 1 path.** Codex-specific authorization is now handled explicitly at skill start, with Tier 2 allowed only when delegation is unavailable, unresolved, or declined.
- **Artifact-driven review packets over forked thread context.** This matched actual Codex runtime constraints and kept review dispatch portable.
- **Parallelism must be authored, not guessed.** Plans must declare `oat_plan_parallel_groups` only when dependency and write-set analysis support it.

## Design Deltas During Execution

- The initial capability model was tightened so Codex cannot treat "the user did not separately ask for subagents" as a valid reason to stay inline after `$oat-project-implement` is invoked.
- HiLL checkpoint review controls were clarified: per-phase reviewer gates are built into Tier 1 implementation, while the config flag now specifically names extra HiLL checkpoint review (`workflow.autoReviewAtHillCheckpoints`).
- Quick-start planning guidance was strengthened after dogfooding showed that the template alone was not enough to make planners author useful phase-level parallelism metadata.
- Tool-update behavior was fixed after live testing showed agent sync drift and accidental bundling of test fixture directories.

## Notable Challenges

- **Self-modification risk.** The initial implementation of this project was executed via Superpowers rather than `oat-project-implement`, because the work was actively changing `oat-project-implement` itself.
- **Provider/runtime mismatch.** Codex subagent dispatch could not combine pinned specialized roles with forked full-thread context, which forced a cleaner artifact-driven review contract.
- **Bundled asset drift.** Updating skill files without synced templates/assets produced stale downstream installs until the bundling and sync paths were corrected.
- **Lifecycle bookkeeping drift.** Final review and revision bookkeeping needed an additional reconciliation pass so `plan.md`, `implementation.md`, `state.md`, and the review archive all agreed on the actual fix history.

## Release and Verification

- Public lockstep packages were bumped together to `0.0.50`:
  - `packages/cli`
  - `packages/control-plane`
  - `packages/docs-config`
  - `packages/docs-theme`
  - `packages/docs-transforms`
- Final narrowed re-review passed with zero findings.
- Final regression verification included `pnpm --filter @open-agent-toolkit/cli test` with the workflow-agent install coverage fixed.

## Revision History

### Revision 1 (`p-rev1`)

Dogfooding feedback after the first PR version drove three follow-up changes:

- make Codex reviewer dispatch artifact-driven and no-fork
- add bounded timeout / nudge fallback guidance for reviewer return-path stalls
- tighten verification guidance so phase tasks use exact scoped runner commands

### Revision 2 (`p-rev2`)

Final review feedback and closeout fixes added three more tasks:

- repair the workflow-agent install test assertions after adding the new workflow agent
- reconcile stale `p-rev1` and final-review bookkeeping
- correct the final review row and verification command so the OAT ledger matches the actual branch state

## Final Outcome

The branch now ships the phase-subagent execution model, the new planning metadata, the updated review/checkpoint semantics, and the tool-sync fixes needed to dogfood the workflow reliably across providers. The project reached a clean final re-review pass and is ready for standard OAT completion/archive.

## References

- Project artifacts: `.oat/projects/shared/subagent-implement-refactor/`
- PR artifact: `.oat/projects/shared/subagent-implement-refactor/pr/project-pr-2026-04-19.md`
- Evolved skill: `.agents/skills/oat-project-implement/SKILL.md`
- New agent: `.agents/agents/oat-phase-implementer.md`
- Planning template: `.oat/templates/plan.md`
- Implementation template: `.oat/templates/implementation.md`
- Quick-start skill: `.agents/skills/oat-project-quick-start/SKILL.md`
