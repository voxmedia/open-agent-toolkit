---
title: Project closeout skills
description: 'Prepare progress or final PRs, record outcomes, update documentation, handle feedback, and complete a tracked project.'
---

# Project closeout skills

Closeout separates several jobs. A PR description helps reviewers. A summary
preserves what shipped and why. Documentation explains the resulting capability
to its users. A retrospective turns execution evidence into improvement
proposals. Completion finalizes lifecycle state and any selected archive work.

| Your next job                                          | Skill                     |
| ------------------------------------------------------ | ------------------------- |
| Share one completed phase while the project continues. | `oat-project-pr-progress` |
| Open the final project PR.                             | `oat-project-pr-final`    |
| Explain execution lessons and propose improvements.    | `oat-project-retro`       |
| File tracker-bound retrospective proposals.            | `oat-project-retro-file`  |
| Turn human feedback into revision tasks.               | `oat-project-revise`      |
| Update reader documentation to match shipped behavior. | `oat-project-document`    |
| Preserve outcomes, decisions, and follow-up context.   | `oat-project-summary`     |
| Finalize the lifecycle and chosen completion actions.  | `oat-project-complete`    |

Each skill needs an existing project or its artifact. None is a substitute for
project creation. Check the active project before invoking one, and use an
explicit path only where the skill supports it.

Examples beginning with `/` are requests to your agent, not terminal commands.
Providers with `$` skill syntax use `$oat-project-summary` instead of
`/oat-project-summary`, and the same substitution applies to other skill names.
Arguments such as `p02` are skill input. They are not `oat` CLI subcommands.

During implementation, follow the stored post-implementation sequence rather
than starting another closeout sequence beside it. Configured gates, final
review, and sign-off remain separate checks. Opening a PR does not merge it,
and marking a lifecycle complete does not prove a release or deployment.
See [Implementation execution](../execution/implementation-execution.md) for
the lifecycle owner and [Reviews](../reviews/index.md) for review handoffs.

## oat-project-pr-progress

Use progress PRs to share a delivered phase without claiming the entire project
is finished. This skill builds a phase-scoped description from project
artifacts and Git history. Opening the PR is optional and user-confirmed.

**Invocation:** Name a phase, or provide an explicit commit range if the
history cannot identify that phase reliably.

```text
/oat-project-pr-progress p02
```

Supported scope inputs include `range=<sha1>..<sha2>` and `base_sha=<sha>`.
The latter means that commit through `HEAD`. Use actual verified SHAs.

**Prerequisites:** Project applicability is `required`. The project needs
`plan.md` and an active pointer, or a project name resolved when prompted.
A passed phase review is recommended before opening the PR. An unresolved
review produces a warning rather than blocking progress-description generation.
GitHub creation also needs an authenticated `gh` route and push authority.

**Example scenario:** Phase two delivers the export filter, while a later phase
still owns audit reporting. Request `p02` to produce a reviewable summary of
the filter's changes and verification. Choose progress rather than final PR
because reporting and the final project review remain unfinished.

**Expected output:** A dated artifact under `pr/`, named
`progress-{scope}-YYYY-MM-DD.md`, with scoped changes, verification, review
status, and available references. The skill warns when phase commit conventions
do not identify the intended work and asks for a better range. It excludes
local-only links and strips artifact frontmatter from the GitHub body.

For a synced project, project artifacts publish through the project-ref route
before the code PR is created. Choosing to open the PR records its URL and
refreshes project metadata. Declining leaves the description available without
claiming a PR exists.

**Next step:** Review the description and choose whether to open the progress
PR. Continue remaining project tasks through `oat-project-implement`.

## oat-project-pr-final

Use final PR when you explicitly want to publish the whole project's reviewed
change for human review. This skill creates the description, pushes the code
branch, and creates the PR. It is not a description-only variant of progress PR.

**Invocation:** Explicitly request the final PR. Optional `base=` and `title=`
inputs select its destination and title.

```text
/oat-project-pr-final base=main title="feat: add export filters"
```

**Prerequisites:** Project applicability is `required`. The project needs
`plan.md`. Spec-driven mode also requires `spec.md` and `design.md`. Quick,
import, and lite accept their mode-appropriate reduced artifacts. The latest
`final` code-review event in the plan's Reviews ledger should be `passed`.
Autonomous execution stops if it is not passed. Interactive execution warns
and asks before proceeding anyway.

PR creation requires push permission, a suitable remote, and authenticated
GitHub CLI access. Missing `gh` leads to manual creation instructions rather
than a claimed successful PR.

**Example scenario:** Export filters and audit reporting are implemented, the
latest final review has passed, and you have authorized publication. Final PR
summarizes the complete change, including review evidence and verification.
Choose it instead of progress PR because no planned phase remains to be shared
as a separate unfinished-project milestone.

**Expected output:** `pr/project-pr-YYYY-MM-DD.md`, followed by the actual PR
URL when creation succeeds. The skill checks review-ledger artifact paths
before creating a PR. It archives only eligible processed review artifacts,
keeps unresolved artifacts visible, and excludes invalid or local-only public
references. Stored exit-gate waivers remain visible in verification notes.

Project state distinguishes an artifact ready for publication from an open PR.
Existing completed summary work is reused when the stored lifecycle sequence
provides it. The skill does not merge the PR or silently treat completed fixes
as a passed re-review.

**Next step:** Review the open PR. Use `oat-project-revise` for feedback.
Completion can run before or after merge. If completion archives artifacts
while the PR is open, its archive-aware flow updates the PR description links.

## oat-project-retro

Use retrospective to explain how execution went and propose changes that can
improve later work. The summary records the product outcome. The retrospective
records incidents, lessons, and actionable repository or OAT feedback.

**Invocation:** Request generation explicitly. To apply an existing retro's
eligible repository improvements, use explicit apply wording instead.

```text
/oat-project-retro
Generate a retrospective for the active export-filter project from its logs, learnings, and available session evidence.
```

```text
/oat-project-retro
Apply the eligible repository improvements from the existing retrospective. Do not regenerate it.
```

**Prerequisites:** Project applicability is `required`. Resolve the existing
project from an explicit path or the active pointer. Generation needs available
project evidence. Missing transcript or review evidence is recorded as
unavailable, not invented. Apply mode additionally requires an existing
`references/project-retro.md` and consent for the selected changes.

**Example scenario:** An export project spent hours on a stale build and an
unclear review handoff. Generate the retro to explain each incident's impact,
response, and outcome. Propose a repository setup instruction separately from
an OAT upstream improvement. After reviewing the proposals, apply the setup
instruction through the same skill's apply mode rather than regenerating the
analysis or filing every proposal as an issue.

**Expected output:** `references/project-retro.md` with an honest evidence
inventory, execution analysis, and separate Repo Improvements and OAT Upstream
Feedback registers. Stable `RP-NN` and `UP-NN` IDs identify proposals. Each repo
item distinguishes `Disposition: apply` from `Disposition: file`.

Generation does not automatically apply or file everything. Interactive runs
offer eligible application and filing. Non-interactive application requires
`workflow.retro.apply: auto`. Without explicit filing configuration, proposals
remain unfiled. Apply mode handles approved documentation, instruction, rule,
or decision changes under its bounded contract and records their committed
references. Code follow-ups normally belong to the filing path.

**Next step:** Review the register walkthrough. Use `oat-project-retro-file`
for tracker-bound proposals. Material product, security, architecture, or
destructive changes still require direction even when auto-apply is configured.

## oat-project-retro-file

Use retro-file to turn approved tracker-bound proposals into repository or
upstream issues and backlog items. It does not apply repository edits or
generate a missing retrospective.

**Invocation:** Use the active project's retro, or provide the existing artifact
path explicitly.

```text
/oat-project-retro-file .oat/projects/shared/export-filter/references/project-retro.md
```

Replace the example path with the project's reported artifact path.

**Prerequisites:** Project applicability is `required`. An existing retro
artifact must contain valid registers. Eligible items are repo proposals with
`Disposition: file` and upstream proposals. Filing requires destination
capability and consent. GitHub destinations need authenticated `gh` and enabled
issues. Backlog destinations need the initialized, writable canonical backlog.

**Example scenario:** The export retro proposes an OAT review-handoff fix and a
repository test-harness follow-up. Retro-file probes both destinations, checks
existing and completed work for duplicates, and presents the proposals before
filing. Choose it instead of retro apply because these items need tracked
future implementation, not immediate documentation edits.

**Expected output:** Each successfully filed or linked proposal records its
destination and filing status in the retro. Local backlog destinations also
need exact-path commit evidence and truthful pushed or unpushed visibility.
Unusable destinations are reported with an unblock action rather than silently
replaced by another destination.

Non-interactive execution uses configured destinations exactly. Destination
consent does not authorize changing an existing duplicate. Linking an existing
item requires a verified match. Public issue bodies are sanitized before
posting when their source repository is private.

**Next step:** Follow the recorded issue or backlog destination. Resolve
`no-destination` items or ambiguous duplicates before retrying. Use retro apply
for separate `Disposition: apply` items.

## oat-project-revise

Use revise to receive human feedback and re-enter implementation without
creating a new project. It writes revision tasks rather than implementing the
changes itself.

**Invocation:** State the feedback in the same request, or identify the PR or
review artifact that contains it.

```text
/oat-project-revise
The export-filter PR needs a clearer invalid-date message and a test for an empty date range.
```

**Prerequisites:** Project applicability is `required`. The active project
needs `plan.md` and `implementation.md`. An open PR is the normal entry point,
but `in_progress` and `complete` states also work. If no final PR artifact
exists, the skill warns and asks whether to continue with pre-PR feedback.

**Example scenario:** A human reviewer accepts the export design but requests
two small changes before merge. Revise turns each inline request into a task,
keeps the project history, and points implementation at the first revision.
Choose it instead of a new project because this is feedback on the existing
change, not a new feature with unrelated scope.

**Expected output:** Inline feedback creates a `p-revN` phase with
`prevN-tNN` task IDs, inserted before Implementation Complete. Plan totals,
implementation tracking, and state are updated for execution. Inline requests
are not severity-triaged. Structured GitHub feedback and review artifacts route
through their corresponding review-receive skills and use those contracts.

**Next step:** Run `oat-project-implement` to execute the revision tasks. After
verification, update the open PR and its review evidence. Revise itself does
not fix code or declare the requested changes complete.

## oat-project-document

Use document to reconcile reader documentation with the project's shipped
capabilities. It compares artifacts, source code, and existing documentation
before proposing where information belongs.

**Invocation:** Use the active project or an explicit project path. The normal
flow presents the delta for approval.

```text
/oat-project-document .oat/projects/shared/export-filter
```

For a deliberately unattended documentation pass, `--auto` applies all
recommendations without the approval pause. Autonomous lifecycle execution uses
that existing path. Select it only within the authorized documentation scope.

**Prerequisites:** Project applicability is `required`. The target needs
`state.md` and at least `plan.md` or `implementation.md`. Completed
implementation provides shipped evidence. If only a plan exists, the skill can
proceed but must identify recommendations as based on planned work rather than
verified implementation. Lite projects do not require discovery, spec, or design.

**Example scenario:** Export filters shipped, but the user guide still describes
only unfiltered exports. Document verifies the actual endpoint and CLI behavior,
finds the existing guide, and proposes additions for date syntax and failure
cases. Choose it instead of summary because the audience needs operating
instructions, not the project's decision history.

**Expected output:** An evidence-backed delta plan identifies updates, new
pages, or splits where warranted. Approved recommendations update documentation
and relevant instruction files. The skill follows local index and navigation
conventions, formats the changed files, runs relevant checks, and records
`oat_docs_updated`. It does not modify implementation source or change lifecycle
phase state.

PJM capability and repository adoption are checked separately. Missing or
unverified adoption skips PJM writers without blocking documentation-only work.
No configured docs site is required for README or plain Markdown updates.

**Next step:** Inspect the applied delta and verification results. Continue the
stored closeout sequence, or prepare the PR when its remaining checks are met.

## oat-project-summary

Use summary to preserve what actually shipped, the decisions behind it, and
follow-up context. A summary can cover meaningful partial implementation. It
does not need to wait for archive, and it is not the shorter PR description.

**Invocation:** Explicitly request generation or refresh for the active project.

```text
/oat-project-summary
Summarize the delivered export filters, the date-format decision, and the audit-reporting work we deferred.
```

**Prerequisites:** Project applicability is `required`. The existing project
needs `implementation.md` with meaningful progress, normally at least one
completed task. Missing implementation tracking blocks summary generation.
With no completed tasks, the process warns that the summary will be minimal.
Lite uses its plan contract and implementation results without requiring
discovery, spec, or design artifacts.

**Example scenario:** The first export phase is delivered, and another engineer
will own the reporting phase next week. Summary records the shipped filter
behavior, why the team chose its date format, the verification performed, and
the deferred reporting work. Choose it instead of retro because the main need
is product and decision continuity, not an analysis of execution incidents.

**Expected output:** `summary.md` emphasizes implementation outcomes over
planned design. Its minimum useful sections are Overview, What Was Implemented,
and Key Decisions. Meaningful sections add tradeoffs, challenges, design deltas,
revision history, and follow-up items. Empty sections are omitted rather than
left as placeholders, and the source targets fewer than 200 lines.

On rerun, tracking fields identify new tasks and revision phases. New project-log
entries or autonomous learnings can also require an update. Unchanged content
is retained. The project-log CLI owns Workflow Observations roll-up. Ambiguous
logs are reported rather than treated as empty, and sealed logs accept no new
graduation entries. Autonomous learnings appear only when their source exists
and supplies actionable recommendations. Recorded exit-gate waivers remain
explicit, not inferred.

When PJM is available and adopted, the flow can promote supported decisions and
offer follow-up graduation through their owning tools. It does not invent tasks
or silently rewrite the execution plan.

**Next step:** Use the summary as a source for documentation, PR description,
and later project handoff. Refresh it after revisions. Complete the project
only when its lifecycle closeout requirements are satisfied.

## oat-project-complete

Use complete when you want to finalize the tracked lifecycle and its selected
completion actions. Archive, recap, summary refresh, and PR work have explicit
choices and checks. They are not interchangeable signs of completion.

**Invocation:** Select the intended active project, then request completion.

```text
/oat-project-complete
```

**Prerequisites:** Project applicability is `required`. A valid active project
must resolve, and its installed completion helpers must be available. The
read-only closeout invariant must report `complete` or `not_required` before
completion writes begin. An incomplete configured, autonomous, or lite closeout
routes back to `oat-project-implement`; no phase-status value bypasses that gate.

**Example scenario:** The export project has passed final verification and its
stored closeout sequence, but the PR is still open. Complete finalizes lifecycle
state and, if selected, archives the durable artifacts and updates the existing
PR body to use valid archived references. Choose this skill instead of another
PR invocation because publication already exists and the remaining work is
lifecycle finalization. An open PR is not a completion blocker.

**Expected output:** The skill reports completed lifecycle state, bookkeeping
commit and push results, recap outcome, any archive location, and the tracked
PR. Upfront questions collect relevant choices together. Local projects use
non-archive completion. Shared and synced projects use the configured archive
preference or an explicit answer.

Completion uses the CLI's state mutation, checks summary freshness, handles
selected retro and recap work, and seals the project log through its owning
command. For durable archive flows, the active pointer remains until validated
archive completion. Archive or configured S3 failure leaves a resumable pointer.
Synced projects retain their separate project-ref publication route. The skill
does not replace those operations with a bare status-field edit.

**Next step:** Confirm the reported completion and PR-update outcomes. Follow
any explicit recovery action if the flow stopped. Merge and release remain
separate operations under repository policy.
