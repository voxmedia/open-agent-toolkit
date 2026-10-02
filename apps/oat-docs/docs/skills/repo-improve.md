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

External plans are not canonical OAT project `plan.md` files. They contain self-contained context, scope, steps, verification, done criteria, and STOP conditions, but no canonical OAT phase/task IDs or lifecycle bookkeeping. External execution-readiness metadata is a separate thing and is carried deliberately: it describes whether the plan's own prerequisites have merged, not how an OAT project is moving through phases.

After generation, choose either execution path:

- Execute a plan directly as a standalone handoff.
- Run `oat-project-import-plan <external-plan-path>` to preserve and normalize one plan for tracked OAT execution.

Project-sized candidates are split when possible. If inseparable work needs multiple design decisions or lacks one coherent verification boundary, improve recommends an OAT project workflow instead of emitting a mega-plan.

## Plan readiness and execution readiness

Improve scores candidates on two independent axes. A candidate is plan-ready when it is understood well enough to write a self-contained executable plan, and execution-ready when every hard dependency it names has already merged.

A blocked candidate is still planned. Rather than dropping work whose prerequisite has not landed, improve writes the plan and records the block:

- `oat_execution_status` is `READY` or `BLOCKED` in plan frontmatter.
- A typed `## Dependencies` table marks each row `Hard`, `Soft`, or `Satisfied`, and every `Hard` row names the state that would unblock it.
- `## Landing-event impact` records what to re-anchor when a named PR or project lands, and `## Revalidation Before Execution` records when the plan must be re-checked against live state.

Plan provenance is recorded as two separate SHAs: `oat_external_plan_commit` is the full SHA of the `HEAD` whose content was actually inspected, and `oat_external_plan_main_commit` is the fetched `origin/main` or merge-base used only for comparison. They may differ, and normally do when planning happens on a branch.

Plans written before this contract landed are read in legacy mode: a short SHA, a missing comparison SHA, missing sections, and a missing status (read as `READY`) are all accepted, and those plans are never rewritten.

## Optional tracking

Plans are always the primary output. Tracking is optional and source-aware:

- `--backlog-items` creates missing PJM items for repo-audit or maintainability-review plans. Backlog-backed sources reuse their existing items and add `external_plans` reverse links.
- `--issues` previews one GitHub issue per plan, checks repository visibility and sensitive content, and requires explicit confirmation before publication. It is useful as a fallback when PJM is not installed.
- Request both modifiers explicitly to create both forms. Neither implies the other.

Failure to publish a backlog item or issue does not invalidate a successfully written plan; the skill reports partial tracking results precisely.

## Orchestration

Full repository audits use bounded read-only reconnaissance while the root
agent retains classification, vetting, prioritization, cross-lane synthesis,
and plan writing. Plan writes never move below the caller's model class — a
parallelized author runs on the caller's model and every plan is
caller-reviewed before publication or wave composition; the
`keeps external-plan writes on the caller's model class` case in
`skills-bundled-docs-contract.test.ts` is the backstop. Before launch, the
caller loads the durable task classes and model-selection principles from
`subagent-orchestration` plus exactly one active-provider selection reference.

The internal `oat-dispatch-subagents` skill then owns capability checks, live
catalog intersection, exact route selection, launch acceptance, recovery, and
dispatch records. It loads exactly one matching provider mechanics reference;
selection and mechanics references are not merged into one universal provider
contract. Dispatch is native-first. Configured project/workflow policy may
authorize required CLI or cross-runtime routes; an agent-improvised alternate
route requires explicit current-run approval.

## oat-repo-improve

**Invocation:**
`/oat-repo-improve maintainability-review .oat/repo/analysis/<review-file>.md`.
Replace the placeholder with an actual report. This is an agent instruction,
not a shell command; Codex can use `$oat-repo-improve`. You can also ask for the
skill by name. Other source modes include a repository audit, a backlog
review, a backlog directory, or an individual backlog item.

**Prerequisites:** A repository and an explicitly chosen source. A
maintainability-review source must already exist; the skill verifies its
evidence instead of silently commissioning the same review again. A
substantive full repository audit requires the managed delegation
capabilities described above. If they are unavailable, stop or explicitly
narrow the audit rather than pretending the full audit ran. No existing OAT
project is required.

**Example scenario:** A review found that package boundaries obscure ownership
and that integration tests are difficult to run locally. Feed the saved
review to this skill so it can turn the findings into separate, bounded plans
with dependencies and verification steps. The goal is executable planning
material, not an immediate refactor of the repository.

Choose the source mode to avoid redundant work. Repository-audit mode can use
`quick`, `standard`, or `deep` effort and a focus area; these controls do not
change the other source modes. Evidence-backed sources should retain their
provenance and be checked against the current repository. Plans distinguish
the captured planning HEAD from any comparison baseline, and separate work
that is ready from work blocked on a concrete dependency.

**Expected output:** Standalone external plans under
`.oat/repo/reference/external-plans/`. When several plans are produced, an
index helps navigate them, but the index is not itself an importable work
unit. Each plan should carry a bounded objective, evidence, dependencies,
verification, and readiness or unblock conditions. The skill does not edit
source code or execute the plans. Backlog filing or issue publication is a
separate explicit option; issue publication requires a preview and
confirmation.

**Next step:** Review an individual plan and either execute it directly with
the appropriate authorization or import that single plan through
`oat-project-import-plan`. Do not import the multi-plan index or start a
blocked plan without satisfying its dependency.

## oat-repo-maintainability-review

**Invocation:**
`/oat-repo-maintainability-review --scope directory --target packages/api --mode tracked --focus testing`.
The target is illustrative: choose a directory inside your repository. Use
`--scope repo` for the whole repository. Output modes are `auto`, `tracked`,
`local`, and `inline`; select one explicitly when the report's destination
matters.

**Prerequisites:** Accessible repository evidence and a clear review scope.
An existing OAT project is not required. Decide whether you need a saved
artifact before starting: an inline review is useful for discussion but is
not a file-backed input for a later planning handoff.

**Example scenario:** Before several teams add features to an API package,
you want to know whether its tests and developer workflow will support the
growth. Review that directory, emphasize testing, and save the findings so
the team can prioritize improvements without changing product behavior
during the review.

The review considers architecture, conventions, documentation, developer
experience, testing, and maintainability. A focus changes emphasis without
removing the other dimensions. Findings pair source evidence with both
severity and improvement value, then organize recommendations into now,
next, and later. A high-severity concern and a high-value improvement are not
necessarily the same item.

**Expected output:** An evidence-backed review, inline or written according
to the selected mode. Tracked reports live under `.oat/repo/analysis/` with a
date-based repo-review filename; repeated same-day reports receive distinct
names. The review does not modify code or publish issues. Readers should be
able to trace each actionable concern to the repository material that
supports it.

**Next step:** Discuss the findings and use [oat-repo-improve](#oat-repo-improve)
to turn a saved report into external plans. If you chose inline mode, first
explicitly save a report before asking another workflow to consume its path.

## oat-repo-knowledge-index

**Invocation:** `/oat-repo-knowledge-index` in the repository you want to map.
It does not require a project name or an active-project pointer.

**Prerequisites:** A Git repository, the OAT CLI, and the mapper/delegation
capabilities required by the skill's preflight. If a knowledge directory
already exists, choose whether to refresh it or skip the run. Refresh
regenerates that knowledge surface; do not select it assuming hand-authored
additions will remain untouched.

**Example scenario:** A new teammate needs to understand which packages own
the CLI, how shared configuration reaches applications, and which test
commands are meaningful. Generate a repository knowledge index before
starting their first feature so both the teammate and later agents have a
common source-backed map.

The workflow creates a thin index, maps distinct repository concerns, and
enriches the index with the resulting knowledge. It records the repository
HEAD and merge-base provenance so readers can judge freshness. A knowledge
index is an onboarding and retrieval aid, not a declaration that all
architecture concerns have been fixed or that every future question is
answered.

**Expected output:** Eight files under `.oat/repo/knowledge/`:
`project-index.md`, `stack.md`, `architecture.md`, `structure.md`,
`conventions.md`, `testing.md`, `integrations.md`, and `concerns.md`. The
workflow also updates its tracking/dashboard surface and commits the
knowledge output. Despite its name, `project-index.md` describes the
repository; it does not require a pre-existing OAT lifecycle project.

**Next step:** Read the index and the concern or testing documents relevant
to your task. Start a project with that context, or use a focused review
when you need a deeper evaluation. Refresh deliberately when repository
changes make the captured map stale.
