---
title: Project closeout skills
description: 'Prepare progress or final PRs, record outcomes, update documentation, handle feedback, and complete a tracked project.'
---

# Project closeout skills

Closeout separates several jobs. A PR description helps reviewers. A summary
preserves what shipped and why. Documentation explains the resulting capability
to its users. A retrospective turns execution evidence into improvement
proposals. Completion finalizes lifecycle state and any selected archive work.

## Usual order

When no closeout sequence is stored for the project, finish it in this order:

1. `oat-project-summary` records what shipped and why.
2. `oat-project-document` updates reader documentation. Skip it when nothing
   that readers use has changed.
3. `oat-project-pr-final` opens the final pull request for human review.
4. Optionally, after you approve the finished work, `oat-project-retro` writes
   a retrospective, and `oat-project-retro-file` files its tracker items.
5. `oat-project-complete` finalizes the project. You can run it before or after
   the pull request merges.

Use `oat-project-pr-progress` instead of the final PR only to share one
finished phase while later phases are still in progress. Use
`oat-project-revise` whenever reviewers ask for changes on an open pull
request; it adds revision tasks, and you return to this order after they are
implemented. Lite projects run only the final PR step by default. If
`oat-project-implement` already stored a closeout sequence for the project, it
runs those steps for you, so follow that sequence instead of starting them
again by hand.

Terms used on this page:

- **Active project:** the project your checkout currently points to. The
  pointer is the `activeProject` value in `.oat/config.local.json`. Most
  closeout skills act on the active project.
- **Synced project:** a project whose artifacts live on a separate Git ref
  (`refs/oat/projects/<project>`, also called the project ref) instead of on
  your feature branch. Skills publish its artifact changes with
  `oat project push` rather than committing them to your branch.
- **PJM:** OAT's repository project-management layer: the backlog, roadmap,
  and decision records under `.oat/repo/`. A repository has adopted PJM when
  `oat pjm doctor --json` reports an `adoption.state` of `declared` or
  `inferred-legacy`.
- **Review ledger:** the `## Reviews` table in `plan.md` that records each
  review and its status.

## Pick a skill by job

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
The latter means that commit through `HEAD`. Use actual verified SHAs. An
optional `base=<branch>` sets the branch the PR targets. Without it, the skill
uses `git.defaultBranch` from `.oat/config.json`, then the remote's default
branch (`origin/HEAD`), then `main`.

**Prerequisites:** Needs an active OAT project: yes. The project needs
`plan.md`. If no project is active, the skill asks for the project name and
sets that project as active. A passed phase review is recommended before
opening the PR. An unresolved review produces a warning rather than blocking
progress-description generation. GitHub creation also needs an authenticated
`gh` route and permission to push.

**What it does without asking:** before writing the description, the skill
moves every review file at the top level of the project's `reviews/` folder
into `reviews/archived/`, and rewrites references to those files in
`plan.md`, `implementation.md`, and `state.md`. It then writes the description
file under `pr/`. It does not commit. Only after you confirm that you want the
PR opened does it push the current branch with `git push -u origin` and run
`gh pr create`. For a synced project, opening the PR also refreshes
`summary.md` and publishes the project artifacts with `oat project push`
before and after the PR is created.

**Example scenario:** Phase two delivers the export filter, while a later phase
still owns audit reporting. Request `p02` to produce a reviewable summary of
the filter's changes and verification. Choose progress rather than final PR
because reporting and the final project review remain unfinished.

**Expected output:** A dated artifact under `pr/`, named
`progress-{scope}-YYYY-MM-DD.md`, with scoped changes, verification, review
status, and available references. The skill warns when phase commit conventions
do not identify the intended work and asks for a better range. It excludes
local-only links and strips artifact frontmatter from the GitHub body.

For a synced project, project artifacts are published to the project ref with
`oat project push` before the code PR is created. Choosing to open the PR records its URL and
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

**Prerequisites:** Needs an active OAT project: yes. If no project is active,
the skill asks for the project name and sets that project as active. The
project needs `plan.md`. Spec-driven mode also requires `spec.md` and `design.md`. Quick,
import, and lite accept their mode-appropriate reduced artifacts. The latest
`final` code-review event in the plan's Reviews ledger should be `passed`.
Autonomous execution stops if it is not passed. Interactive execution warns
and asks before proceeding anyway.

PR creation requires push permission, a suitable remote, and authenticated
GitHub CLI access. Missing `gh` leads to manual creation instructions rather
than a claimed successful PR.

**What it does without asking:** the skill moves processed review files (those
whose review-ledger entry is `passed` or `fixes_completed`) into
`reviews/archived/` and rewrites their references. For a non-lite project, it
generates or refreshes a missing or stale `summary.md` through
`oat-project-summary` without a prompt, so that skill's commit and automatic
decision-record promotion also happen. It then writes the PR description,
pushes the current branch with `git push -u origin`, and runs
`gh pr create`. For a synced project, it also publishes the project artifacts
with `oat project push` before and after creating the PR. Besides the PR title
and base branch when you did not pass them, the only question it asks is
whether to continue when the latest final review has not passed. It never
merges the PR.

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
If the stored closeout sequence already completed its `summary` step, the
skill reuses that summary. Otherwise, for a non-lite project, a missing or
stale `summary.md` is generated or refreshed automatically before the
description is written. Lite projects never generate a summary; the skill
builds the PR summary from `plan.md` and `implementation.md` instead. The skill
does not merge the PR or silently treat completed fixes as a passed re-review.

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

**Prerequisites:** Needs an active OAT project: yes, or an explicit path to an
existing project. Generation needs available
project evidence. Missing transcript or review evidence is recorded as
unavailable, not invented. Apply mode additionally requires an existing
`references/project-retro.md` and consent for the selected changes.

**What it does without asking:** generation writes
`references/project-retro.md`, appends a one-line receipt to the project log
when one exists, and commits both. Applying an item commits that change too,
usually one commit per item. A synced project's artifact changes are
published with `oat project push` instead. A non-interactive run applies items only when
`workflow.retro.apply` is `auto`. If `workflow.retro.filing.repo` or
`workflow.retro.filing.upstream` is configured, a non-interactive run also
hands off to `oat-project-retro-file`, which can create GitHub issues and
backlog items. In an interactive run, applying and filing are offered, and
happen only after you approve them.

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

**Prerequisites:** Needs an active OAT project: yes, or an explicit path to the
retro artifact. An existing retro artifact must contain valid registers.
Eligible items are repo proposals with `Disposition: file` and upstream
proposals. Filing requires destination capability and consent. GitHub
destinations need authenticated `gh` and enabled issues. Backlog destinations
need the initialized, writable canonical backlog.

**What it does without asking:** nothing is filed until you approve it in an
interactive run, or until `workflow.retro.filing.*` config names the
destination in a non-interactive run. Once approved, it runs
`gh issue create` for issue destinations and `oat backlog new` for backlog
destinations, commits each new backlog item, and then commits the retro
writeback separately. Upstream proposals are filed as issues in the repository
named by `workflow.retro.upstreamRepo`, which defaults to the public
`voxmedia/open-agent-toolkit` repository. Check that setting before you
approve upstream items. The skill never runs `git push`, so backlog commits
stay local until you push them yourself. For a synced project, the retro
writeback is published to the project ref with `oat project push`.

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
item requires a verified match. When the source repository is private and the
destination is public, both new issue bodies and comments on existing issues
are sanitized before posting.

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

**Prerequisites:** Needs an active OAT project: yes. The active project needs
`plan.md` and `implementation.md`. An open PR is the normal entry point, but
`in_progress` and `complete` states also work. If no final PR artifact exists,
the skill warns and asks whether to continue with pre-PR feedback. The skill
runs only when you invoke it by name; agents do not start it on their own.

**What it does without asking:** the skill adds the revision tasks to
`plan.md`, updates `implementation.md` and `state.md`, and commits those three
files. A synced project publishes them with `oat project push` instead. If your
agent supports skill chaining, revise may continue straight into
`oat-project-implement`, which starts executing the new tasks. For GitHub PR
comments or a review artifact, it hands off to the matching review-receive
skill instead of writing the tasks itself.

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

**Next step:** If revise did not continue into implementation on its own, run
`oat-project-implement` to execute the revision tasks. After verification,
update the open PR and its review evidence. Revise itself does not write code
changes or declare the requested changes complete.

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

**Prerequisites:** Needs an active OAT project: yes, or an explicit project
path. The target needs `state.md` and at least `plan.md` or
`implementation.md`. Completed
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

**What it does without asking:** when the repository has adopted PJM, the
skill first runs `oat-pjm-update-repo-reference` automatically, which updates
repository reference records such as the roadmap and backlog status. It shows
the documentation plan and waits for your approval before it changes any
documentation, unless you passed `--auto`. It then commits the approved
documentation changes, and commits the `oat_docs_updated` state change
separately; a synced project publishes that state change with
`oat project push`. Choosing `[S]kip` also commits the skipped state. It does
not push your branch.

**Next step:** Review the documentation commit before pushing. Then continue
the stored closeout sequence. When you run the skill on its own, its report
points to `oat-project-complete`; if the final PR is not open yet, follow the
[usual order](#usual-order) and run `oat-project-pr-final` first.

## oat-project-summary

Use summary to preserve what actually shipped, the decisions behind it, and
follow-up context. A summary can cover meaningful partial implementation. It
does not need to wait for archive, and it is not the shorter PR description.

**Invocation:** Explicitly request generation or refresh for the active project.

```text
/oat-project-summary
Summarize the delivered export filters, the date-format decision, and the audit-reporting work we deferred.
```

**Prerequisites:** Needs an active OAT project: yes. The project needs
`implementation.md` with meaningful progress, normally at least one
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

When you run it again, the skill uses tracking fields in `summary.md` to find
tasks and revision phases added since the last run. New project-log entries or
autonomous-run learnings can also trigger an update. Content that has not
changed is kept. The `oat project log` command, not the skill, rolls project-log
entries up into the Workflow Observations section. A project log the skill
cannot read clearly is reported rather than treated as empty, and a sealed
(closed) log accepts no new entries. An Autonomous Execution Learnings section
appears only when the project has an `oat-execution-learnings.md` file with
actionable recommendations. Recorded exit-gate waivers stay explicit; the
skill does not infer them.

**What it does without asking:** when the repository has adopted PJM, every
Key Decision in `summary.md` is promoted, without a prompt, to an `accepted`
decision record under `.oat/repo/reference/decisions/`, and the decision index
is regenerated. A decision already promoted on an earlier run (same title
slug) is skipped. The skill then commits `summary.md` together with any new
decision records, project-log changes, and ledger changes; a synced project
publishes `summary.md` with `oat project push`. It does not push your branch.
It only offers, and does not create without your answer, backlog items for
follow-up entries in the project log. It does not invent tasks or silently
rewrite the execution plan.

**Next step:** Use the summary as a source for documentation, PR description,
and later project handoff. Refresh it after revisions. Complete the project
only when its lifecycle closeout requirements are satisfied.

## oat-project-complete

Use complete when you want to finalize the tracked lifecycle and its selected
completion actions. Archiving, the project recap, a summary refresh, and PR
work are separate choices with their own checks. None of them alone means the
project is complete.

**Invocation:** Select the intended active project, then request completion.

```text
/oat-project-complete
```

**Prerequisites:** Needs an active OAT project: yes. The skill does not ask
which project to use; without a valid active project it stops and points you
to `oat-project-open`. The `oat-explainer-kit` skill must be installed (in the
same skills folder, your user skills, or the project's skills) alongside this
skill's own completion scripts, or the skill stops. The skill runs only when
you invoke it by name. Before it changes anything, it runs a read-only check
that the project's stored closeout sequence is finished (or that the project
has none). If an implementation closeout is still incomplete, the skill sends
you back to `oat-project-implement`; no phase-status value bypasses that
check.

**What it does without asking:** the skill asks once, then acts. One combined
prompt asks you to confirm completion and, where they apply, whether to
archive the project, generate or refresh the summary, generate a
retrospective, generate a final project recap, and open a PR. Settings such as
`workflow.archiveOnComplete` and `workflow.createPrOnComplete` answer their
questions in advance. If final review has not passed, Medium findings were
deferred, or documentation is not marked updated, those warnings appear
together with one "continue anyway?" question. After you confirm, the skill
does the rest without further prompts: it marks the lifecycle complete, always
writes a PR description file, clears the active
project (or keeps it until an archive succeeds), commits the completion
bookkeeping, and pushes it. A yes to the PR question, or
`workflow.createPrOnComplete: true` when no PR is tracked, creates a new PR
against `main`. If a PR is already open, the skill updates its description
with `gh pr edit` when archiving or for a synced project. A summary refresh
runs `oat-project-summary`, with its own commit and decision promotion, and an
archive runs `oat project archive`, including an S3 upload when
`archive.s3SyncOnComplete` is enabled.

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

Completion changes lifecycle state through the `oat` CLI, checks whether the
summary is current, runs any retro and recap work you selected, and seals
(closes) the project log through the project-log command. When a shared or
synced project will be archived, the active project stays set until the
archive succeeds, so an archive or S3 failure leaves the completion
resumable. Every other completion clears the active project right away. Synced
projects still publish their artifacts to the project ref. The skill never
fakes completion by editing a status field by hand.

**Next step:** Confirm the reported completion and PR-update outcomes. Follow
any explicit recovery action if the flow stopped. Merge and release remain
separate operations under repository policy.
