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

- `--backlog-items` creates missing PJM (OAT project management, the repository backlog under `.oat/repo/pjm/`) items for repo-audit or maintainability-review plans. Backlog-backed sources reuse their existing items; they add `external_plans` reverse links on every successful run, with or without this modifier.
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
not a shell command. The slash form is the reliable way to start it; Codex can
use `$oat-repo-improve`, and asking for the skill by name usually works too.
Other source modes include a repository audit, a backlog review, a backlog
directory, or an individual backlog item.

**Prerequisites:** A Git repository and an explicitly chosen source. A
maintainability-review source must already exist; the skill verifies its
evidence instead of silently commissioning the same review again. A
substantive full repository audit requires managed delegation: the `utility`
tool pack (`oat tools install utility --scope user`), whose
`oat-dispatch-subagents` and `subagent-orchestration` skills let the agent
start read-only helper agents. If delegation is unavailable, stop or
explicitly narrow the audit rather than pretending the full audit ran. Needs
an active OAT project: no.

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
that is ready from work blocked on a concrete dependency. It runs
`git fetch origin main` to record the comparison SHA.

**What it does without asking:** It asks you to choose the source (when you
did not name one), the audit exclusions (for a repository audit), and which
candidates to plan; a non-interactive run picks the top three to five itself.
For a repository audit it starts read-only helper agents
through managed delegation, asking once first if your agent requires
authorization. After you pick candidates, it runs `git fetch origin main`,
writes the plan files and, for several plans, an index, and then edits each
source backlog item's frontmatter to add the plan link. It creates backlog
items only with `--backlog-items` or your answer to its one offer, and
publishes GitHub issues only after a preview and your explicit confirmation.
It never commits, pushes, edits source code, or imports a plan into an OAT
project.

**Expected output:** Standalone external plans under
`.oat/repo/reference/external-plans/`. When several plans are produced, an
index helps navigate them, but the index is not itself an importable work
unit. Each plan should carry a bounded objective, evidence, dependencies,
verification, and readiness or unblock conditions. The skill does not edit
source code or execute the plans. When the source is a backlog review,
directory, or item, it always adds an `external_plans` link and refreshes
`updated` in each source item's frontmatter after the plan is written.
Creating new backlog items or publishing GitHub issues is a separate explicit
option; issue publication requires a preview and confirmation.

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
matters. This is an agent instruction; Codex uses
`$oat-repo-maintainability-review`. The skill is explicit-invocation only, so
use the slash or `$` form rather than relying on the agent to pick it.

**Prerequisites:** A Git repository with readable source files and a clear
review scope. Needs an active OAT project: no. Decide whether you need a saved
artifact before starting: an inline review is useful for discussion but is
not a file-backed input for a later planning handoff.

**Example scenario:** Before several teams add features to an API package,
you want to know whether its tests and developer workflow will support the
growth. Review that directory, emphasize testing, and save the findings so
the team can prioritize improvements without changing product behavior
during the review.

The review considers architecture, conventions, documentation, developer
experience, testing, and maintainability. A focus changes emphasis without
removing the other dimensions. Findings pair source evidence with both a
Concern rating (severity) and a Value rating (improvement value), then
organize recommendations into now, next, and later. A high-severity concern
and a high-value improvement are not necessarily the same item.

**What it does without asking:** It asks for any missing required argument
before starting. When your agent can run subagents, it starts six of them,
one per review dimension, and merges their findings. Unless you chose
`inline`, it writes one report file to the resolved destination. It does not
modify code, commit, push, or open issues. It offers a hand-off to
`oat-repo-improve` afterwards and runs it only if you accept.

**Expected output:** An evidence-backed review, inline or written according
to the selected mode. Tracked reports live under `.oat/repo/analysis/` with a
date-based repo-review filename; repeated same-day reports receive distinct
names. Local reports go to `.oat/projects/local/analysis/`; `auto` mode
writes there when `.oat/repo/analysis/` is missing or gitignored. Pass a
local report's path explicitly to `oat-repo-improve`, which only discovers
reports under `.oat/repo/analysis/` by itself. The review does not modify
code or publish issues. Readers should be
able to trace each actionable concern to the repository material that
supports it.

**Next step:** Discuss the findings and use [oat-repo-improve](#oat-repo-improve)
to turn a saved report into external plans. If you chose inline mode, first
explicitly save a report before asking another workflow to consume its path.

## oat-repo-knowledge-index

**Invocation:** `/oat-repo-knowledge-index` in the repository you want to map
(Codex: `$oat-repo-knowledge-index`). The skill is explicit-invocation only,
so use the slash or `$` form rather than relying on the agent to pick it. It
does not require a project name or an active-project pointer.

**Prerequisites:** A Git repository, the OAT CLI, and the ability to dispatch
the `oat-codebase-mapper` subagent. A preflight checks whether background
agents can write files and switches to a read-only fallback if they cannot.
Needs an active OAT project: no. If a knowledge directory already exists,
choose whether to refresh it or skip the run. Refresh first deletes every
`.md` file in `.oat/repo/knowledge/`, hand-written files included, and then
regenerates the set. Move any notes you want to keep before you choose it.

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

**What it does without asking:** The only question is refresh-or-skip when
knowledge files already exist. Otherwise it creates `.oat/repo/knowledge/`,
starts a test subagent and then four `oat-codebase-mapper` subagents in the
background, and writes the knowledge files. It then runs
`git add .oat/repo/knowledge/` and `git commit` on your current branch with
no further prompt; that commit also includes anything you had already staged.
Afterwards it records the run in `.oat/tracking.json` and regenerates the
`.oat/state.md` dashboard with `oat state refresh`; those two files are not
part of the commit. It does not push.

**Expected output:** Eight files under `.oat/repo/knowledge/`:
`project-index.md`, `stack.md`, `architecture.md`, `structure.md`,
`conventions.md`, `testing.md`, `integrations.md`, and `concerns.md`. The
workflow also updates its tracking/dashboard surface and commits the
knowledge output on the current branch (unstage unrelated changes first; the
commit includes anything already staged). Despite its name, `project-index.md` describes the
repository; it does not require a pre-existing OAT lifecycle project.

**Next step:** Read the index and the concern or testing documents relevant
to your task. Start a project with that context, or use a focused review
when you need a deeper evaluation. Refresh deliberately when repository
changes make the captured map stale.
