---
title: Repo Improve
description: 'Turn repository audits, maintainability reviews, and backlog sources into standalone external implementation plans.'
---

# Repo Improve

Use `oat-repo-improve` when the desired output is an executable implementation plan rather than another analysis report. Every successful run writes one or more standalone plans under `.oat/repo/reference/external-plans/`.

## Choose a source

| Source                 | Use it when                                                                                                                                          |
| ---------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------- |
| Repo audit             | You need fresh repository reconnaissance and vetted improvement findings.                                                                            |
| Maintainability review | A file-backed `oat-repo-maintainability-review` already identifies candidates. Improve verifies selected evidence without repeating the broad audit. |
| Backlog review         | A living backlog review and optional priority alignment already establish value, dependencies, and sequencing.                                       |
| Backlog directory      | You want to start from active items. Substantive backlogs should pass through backlog review and alignment before plan generation.                   |
| Backlog item           | One existing item needs enough repository investigation to become executable.                                                                        |

With no source argument, the skill probes for available review and backlog artifacts, annotates all five options, and asks which source to use.

## Set repo-audit boundaries

Fresh repo audits exclude agent-configuration directories from findings and plan candidates by default. The canonical default directory names are `.agents/`, `.claude/`, `.codex/`, and `.cursor/` at any depth. These locations commonly contain provider configuration, generated views, or externally sourced skills rather than the product surfaces being reviewed.

Before reconnaissance, improve shows that default and asks whether to:

- Keep all four exclusions.
- Include selected directory names.
- Include all four directory names.

It then asks whether any other repo-relative directories should be excluded and suggests other recognizable provider directories when present. The resolved scope is shown before work begins and is applied consistently to direct searches and delegated audit lanes.

These are findings exclusions, not absolute read prohibitions. Improve may read bounded instruction, convention, or intent files inside an excluded directory to understand the repository, but it does not turn those files into findings or plan candidates unless the user includes or explicitly targets that directory. A file cited by an artifact-backed source can still be verified after scope confirmation; symlinked provider views are never followed outside the repository.

## Output boundary

External plans are not canonical OAT project `plan.md` files. They contain self-contained context, scope, steps, verification, done criteria, and STOP conditions, but no OAT phase/task IDs or lifecycle bookkeeping.

After generation, choose either execution path:

- Execute a plan directly as a standalone handoff.
- Run `oat-project-import-plan <external-plan-path>` to preserve and normalize one plan for tracked OAT execution.

Project-sized candidates are split when possible. If inseparable work needs multiple design decisions or lacks one coherent verification boundary, improve recommends an OAT project workflow instead of emitting a mega-plan.

## Optional tracking

Plans are always the primary output. Tracking is optional and source-aware:

- `--backlog-items` creates missing PJM items for repo-audit or maintainability-review plans. Backlog-backed sources reuse their existing items and add `external_plans` reverse links.
- `--issues` previews one GitHub issue per plan, checks repository visibility and sensitive content, and requires explicit confirmation before publication. It is useful as a fallback when PJM is not installed.
- Request both modifiers explicitly to create both forms. Neither implies the other.

Failure to publish a backlog item or issue does not invalidate a successfully written plan; the skill reports partial tracking results precisely.

## Orchestration

Full repository audits use bounded read-only reconnaissance while the root
agent retains classification, vetting, prioritization, cross-lane synthesis,
and plan writing. Before launch, the caller loads the durable task classes and
model-selection principles from `subagent-orchestration` plus exactly one
active-provider selection reference.

The internal `oat-dispatch-subagents` skill then owns capability checks, live
catalog intersection, exact route selection, launch acceptance, recovery, and
dispatch records. It loads exactly one matching provider mechanics reference;
selection and mechanics references are not merged into one universal provider
contract. Dispatch is native-first. Configured project/workflow policy may
authorize required CLI or cross-runtime routes; an agent-improvised alternate
route requires explicit current-run approval.
