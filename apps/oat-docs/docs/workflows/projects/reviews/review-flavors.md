---
title: Review Flavors
description: 'The four OAT project review flavors, when each fires in the lifecycle, and who resolves its reviewer target.'
---

# Review Flavors

Looking for which review skill to run? Skip to
[Choosing a Review Skill](#choosing-a-review-skill), which compares the eight
review skills and then describes each one. The sections before it explain how
OAT picks and isolates the reviewer model.

OAT projects run reviews at several different lifecycle points, and those points
have different independence requirements. A self-review that checks a freshly
written plan does not need the same producer isolation as a lifecycle gate that
signs off on the final artifact. Rather than force one reviewer-selection rule
onto every point, OAT recognizes **four review flavors**, each with its own
target-resolution policy layered on the shared reviewer role class.

The distinguishing question is always _"who resolves this review's target, and
how independent must that target be from whatever produced the work?"_ The four
flavors answer it differently while preserving one invariant: the reviewer runs
**at or above the ceiling** (see [Dispatch Policy](../../advanced/dispatch-ceiling.md)). Gate
independence is project policy layered on the generic reviewer role class
described in the `oat-project-dispatch-subagents` lifecycle-role table; this page
covers _which_ flavor fires _when_ and _who_ resolves its target, and links out
for the deep review request/receive mechanics.

## Quick Look

- What it does: names the four review flavors and states who resolves each
  one's reviewer target.
- When to use it: when you need to know which review fires at a lifecycle point
  and whether it inherits, pins the ceiling, or requires an independent gate.
- Primary sources: `oat-project-implement` phase-execution mechanics, the
  `oat-project-dispatch-subagents` lifecycle-role table, and the OAT design
  decision that defined these four flavors.

## Flow map

=== "Diagram"

    ![Review flavors: planning self-review inherits the planning parent; implementation self-review resolves the dispatch ceiling to an at-ceiling pin, inherit, or an exact CLI reviewer; phase and lifecycle gates run a separate reviewer CLI from a configured exec target, and the lifecycle gate's reviewer CLI may spawn a nested reviewer child](/diagrams/review-flavors-light.svg)
    ![Review flavors: planning self-review inherits the planning parent; implementation self-review resolves the dispatch ceiling to an at-ceiling pin, inherit, or an exact CLI reviewer; phase and lifecycle gates run a separate reviewer CLI from a configured exec target, and the lifecycle gate's reviewer CLI may spawn a nested reviewer child](/diagrams/review-flavors-dark.svg)

=== "Mermaid source"

    ```mermaid
    flowchart TD
      subgraph Planning
        PL["Planning-phase\nartifact self-review"] --> PLR["Inherit planning parent"]
        PLR --> PLT["Parent model\n(root already at/above ceiling)"]
      end

      subgraph Implementation
        IM["Root-owned phase\nself-review"] --> IMR["Resolve dispatch ceiling"]
        IMR --> IMPIN["At-ceiling pin\n(ceiling final candidate)"]
        IMR --> IMINH["Inherit\n(only if dispatcher known at/above ceiling)"]
        IMR --> IMCLI["Exact CLI reviewer\n(selected pre-launch)"]
      end

      subgraph Gates
        PG["Phase review gate\n(external)"] --> PGR["Configured exec target\n(gates.execTargets)"]
        PGR --> PGT["Separate reviewer CLI\n(prefers another model family;\nfalls back with a warning)"]

        LG["Lifecycle / final gate"] --> LGR["Configured exec target\n(gates.execTargets)"]
        LGR --> LGT["Separate reviewer CLI\n(never replaced by self-review;\nfalls back with a warning)"]
        LGT -. may spawn .-> LGN["Nested managed\nreviewer child inside gate"]
      end
    ```

The dotted branch marks the only flavor that may **spawn a nested managed
reviewer child** inside the gate exec target: the lifecycle/final gate.

## The four flavors

| Flavor                              | Lifecycle point                                                    | Target resolution                                                                                                                                                                                              |
| ----------------------------------- | ------------------------------------------------------------------ | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Planning-phase artifact self-review | Auto artifact-review loop for plan/spec/design                     | Inherit the planning parent by default (root is already at/above ceiling)                                                                                                                                      |
| Implementation-phase self-review    | Phase and final code reviews dispatched by `oat-project-implement` | Resolve the dispatch ceiling; pin the ceiling's final candidate (at-ceiling pin); inherit only when the review-owning dispatcher is known to be at/above ceiling; else select an exact CLI reviewer pre-launch |
| Phase review gate (external)        | Optional non-pausing gate after a phase passes its self-review     | Separate reviewer CLI chosen from the configured exec targets (`gates.execTargets`), unconstrained by native catalog; prefers another model family but falls back with a warning; fails if no target can start |
| Lifecycle / final gate              | End-of-lifecycle sign-off                                          | Separate reviewer CLI chosen the same way; never replaced by a same-context self-review; fails if no target can start; may spawn a nested managed reviewer child inside the gate exec target                   |

The first two flavors are **self-reviews**. Planning review inherits its
producing parent by default; implementation phase review is dispatched by the
project root after the phase producer returns. The last two are **gates** — an
external, configured, producer-independent target. Phase implementation may run
_below_ the review ceiling for cost reasons, but review must never silently
inherit the below-ceiling phase agent.

Pre-plan inheritance has a narrow executable guard. When dispatch resolution
reports `unresolvedReason: policy`, an artifact review of `discovery`, `design`,
or `spec` deliberately inherits the current planning context and records
`selection_reason: inherit (pre-plan; no project policy)`. An explicit project
policy is still honored at those scopes. Missing or incomplete ladders
(`unresolvedReason: ladder | both`) fail closed, as do plan-scope artifact
reviews and every code review without a resolved policy. Gate exec-target
selection is separate and unaffected.

## Independence: what blocks and what falls back

The invariant across all four flavors is that the reviewer runs **at or above
the ceiling**. What changes between flavors is the required _independence from
the producer_ (the agent that wrote the work). For the two gate flavors, three
different things can happen, and only two of them stop the workflow:

- **Findings that block.** The reviewer ran and reported findings at or above
  the gate's threshold. The gate's `onFailure` setting decides what happens
  next: `block` fixes and reruns, `prompt` asks a person, and `warn` records
  the failure and continues.
- **Operational failures stay blocked.** The reviewer could not start, timed
  out without writing a review, or wrote a review OAT could not validate or
  match to this run. Nothing was reviewed. `oat-project-implement` and
  `oat-project-lite` keep these failures blocked whatever `onFailure` says.
  The planning skills handle them differently; see
  [When the gate finds blocking problems](../../advanced/workflow-gates.md#when-the-gate-finds-blocking-problems).
- **Reviewer selection falls back.** By default (`--avoid same-family`) the gate
  prefers a reviewer from a different model family than the producer. If none
  is available, it runs the best available reviewer instead, which can be the
  same model family or even the same agent CLI, and records a warning. It does
  not block. The gate result's `diversity.achieved` field shows what happened:
  only `different-family` means the reviewer came from another family. With
  `--avoid same-runtime`, the gate does not fall back: it fails if no other
  agent CLI is available, but it excludes the current CLI only when OAT
  recognizes it, and it never checks the model family. See
  [How independent the reviewer must be](../../advanced/workflow-gates.md#how-independent-the-reviewer-must-be).

So a gate never quietly replaces itself with a self-review in the producer's
own session, and it never reports a pass when no review ran. It does not
guarantee a reviewer from a different model family; check `diversity.achieved`
before you present a gate review as independent evidence.

Per flavor:

- **Planning self-review** needs the least independence. The planning root
  already runs at or above the review ceiling, so inheriting the parent model
  satisfies the invariant without managed re-pinning. Pinning is _possible_
  once the ceiling is resolved during planning, but it is not the default.
- **Implementation self-review** needs ceiling-level capability but not
  cross-family isolation. The root resolves the dispatch ceiling and pins the
  tier's final candidate after the phase report. Inheritance is allowed only
  when the root dispatcher is _known_ to be at or above the ceiling; otherwise
  an exact provider CLI reviewer is selected before launch. Reviewer selection
  is never delegated to the phase implementer.
- **Phase review gate** aims for cross-family independence. It runs a separate
  reviewer CLI chosen from the exec targets in `gates.execTargets`,
  unconstrained by the harness's native subagent catalog, and prefers a
  different model family as described above. If no target can start at all,
  the gate fails and stays blocked; it does not downgrade to a review in the
  producer's context. If only a same-family target is available, it runs that
  target and records a warning.
- **Lifecycle / final gate** also runs a separate reviewer CLI, chosen the same
  way, outside the producer's session. It never substitutes a same-context
  self-review, and it is the one flavor permitted to spawn a nested managed
  reviewer child _inside_ the gate exec target when the gate's own contract
  calls for it. Its reviewer can still fall back to the same model family, with
  a warning.

Gate independence is not a property of the generic reviewer class; it is project
policy layered on top of it. The dispatch adapter resolves the configured gate
target before launch and passes it as exact selection input. What fails closed
is the review itself: a gate whose reviewer cannot start, or whose review
cannot be validated, blocks instead of quietly reusing whatever produced the
work. Reviewer selection is best effort, as described above. For the
gate configuration keys and non-pausing behavior, see
[Workflow gates](../../advanced/workflow-gates.md) and the
[phase review gate](index.md#phase-review-gate) section of the review doc.

## Related

- [Reviews](index.md) — the review request/receive flows and the deep review
  contract these flavors plug into.
- [Dispatch Policy](../../advanced/dispatch-ceiling.md) — named ceilings, at-ceiling reviewer
  selection, and the Dispatch Report V1 / producer-provenance record.
- [HiLL Checkpoints](../planning/hill-checkpoints.md) — how the non-pausing phase review gate
  relates to pauseable lifecycle checkpoints.
- [Orchestration Model](../../advanced/orchestration-model.md) — the native-first dispatch
  topology these reviewer roles run inside.
- [Workflow gates](../../advanced/workflow-gates.md) — gate configuration
  and exec-target selection.
- [Smoke testing](../../../contributing/smoke-testing.md) — how the fixture makes
  these flavors observable and assertable.

## Choosing a Review Skill

The four lifecycle flavors above describe reviewer selection and independence.
The eight skills below answer a different question: **where is the review,
and where should its findings go?**

- **Provide** examines work and produces findings; **receive** triages findings
  that already exist.
- **Ad-hoc** produces standalone findings or tasks without changing project
  lifecycle artifacts; **project** uses the project's requirements, plan and
  review ledger.
- **Local** exchanges Markdown review artifacts; **remote** exchanges GitHub
  PR reviews and comments. “Remote” describes the exchange, not a requirement
  to own a second physical machine.

Put together, pick a skill by answering three questions:

1. **Is this work tracked as an OAT project?** Yes: use an `oat-project-review-*`
   skill. No, or you want findings kept out of the project: use an
   `oat-review-*` (ad-hoc) skill.
2. **Are you producing findings or acting on them?** Producing: a `provide`
   skill. Acting on findings someone already produced: a `receive` skill.
3. **Where do the findings live?** In a Markdown file in this checkout: the
   local skill. On a GitHub pull request: the `-remote` skill.

The two project remote skills are normally used as a pair, often on different
machines or by different people: the reviewer runs
`oat-project-review-provide-remote` and posts findings to the PR, then the
author runs `oat-project-review-receive-remote` in the checkout that owns the
project, which turns those findings into project tasks. The ad-hoc remote
skills pair the same way without project tracking.

**Terms used in these skill guides:**

- **Active project:** the project OAT works on in this checkout when you do
  not name one, stored as `activeProject` in the local, uncommitted
  `.oat/config.local.json`.
- **Synced project:** a project whose artifacts travel on their own Git ref on
  `origin` instead of on your branch. OAT saves its tracking changes by
  pushing that ref (`oat project push`) instead of committing on your branch.
- **Review artifact:** the Markdown file a local review writes. Project
  reviews go in the project's `reviews/` directory; once received, the file is
  moved to `reviews/archived/`.
- **Dispatch policy:** the project's rule for which models and effort levels
  OAT may use when it launches subagents such as the reviewer. See
  [Dispatch Policy](../../advanced/dispatch-ceiling.md).
- **Gate:** a configured check, usually an independent review run by another
  model, that must pass before the workflow continues. See
  [Workflow gates](../../advanced/workflow-gates.md).

| You want to                             | Ad-hoc                      | Project-scoped                      |
| --------------------------------------- | --------------------------- | ----------------------------------- |
| Review local work                       | `oat-review-provide`        | `oat-project-review-provide`        |
| Triage a local review                   | `oat-review-receive`        | `oat-project-review-receive`        |
| Review and post findings on a GitHub PR | `oat-review-provide-remote` | `oat-project-review-provide-remote` |
| Triage GitHub feedback                  | `oat-review-receive-remote` | `oat-project-review-receive-remote` |

A project-required review does not always require a previously active pointer:
project provide can resolve an explicitly named project, and remote project
provide can resolve it from the PR or `--project`. Remote project **receive**
currently requires a valid active project with its tracking artifacts; select
it before receiving. Do not infer one variant's prerequisites from its twin.

All variants use Critical, High, Medium and Low severities. A reviewer reports
the issue; receive establishes its disposition. Remote posting, replies and
any optional ad-hoc remote fix-and-push flow have separate approval boundaries.
Examples below are agent skill invocations, not terminal `oat` subcommands.

## oat-review-provide

Review a bounded set of local changes without creating or resuming an OAT
project. Scope can be unstaged changes, staged changes, an explicit file list
or a commit range. Neither this skill nor `oat-review-provide-remote` can send
the review to a different model or runtime: each runs the review inline in the
agent session where you invoke it, so to get a review from another model,
invoke the skill in that model's agent tool.

**Invocation:**

```text
/oat-review-provide staged
```

If you omit scope, the skill asks what to review and recommends unstaged work
for an in-progress review. It shows the resolved scope for confirmation.

**Needs an active OAT project:** no.

**Prerequisites:** The selected files or changes must be available locally.
No existing project or active pointer is required. Agree whether findings
should be local-only, tracked or inline; these are output policies, not
different code-review scopes.

**What it does without asking:** After you confirm the scope, it writes the
review artifact: by default to the untracked
`.oat/projects/local/orphan-reviews/`, or to `.oat/repo/reviews/` when that
directory exists and is tracked. It commits a tracked artifact only after
asking you; local and inline output is never committed unless you request it.

**Example scenario:** You staged a small callback fix that does not warrant a
tracked project. Use the ad-hoc local provide variant to review precisely that
staged diff. The reviewer can flag a missing input check without interpreting
the change as fulfillment of a project plan.

**Expected output:** Findings with severity, file locations and verification
guidance, plus the reviewed scope and artifact location or an explicit
inline-only result. File output defaults to local active orphan-review storage
unless the repository's tracked review convention applies; new findings are
not written directly into an archive.

**Next step:** Pass the active artifact to ad-hoc review-receive for triage.
If you chose inline-only output, request a file artifact when you need that
later artifact-based handoff. Reviewing does not implement the fixes; committing
a tracked review artifact is an explicit bookkeeping choice.

## oat-review-receive

Turn an existing local review into standalone tasks, preserving explicit
decisions about what will be fixed, deferred or dismissed.

**Invocation:**

```text
/oat-review-receive
```

An explicit review-artifact path can select the input. Without one, the skill
discovers active artifacts under repository-review and local orphan-review
storage, orders candidates by their recorded generation time and reports which
it selected. Archived artifacts are history, not default triage inputs.

**Needs an active OAT project:** no.

**Prerequisites:** A readable, nonempty Markdown review artifact exists. No
project is required, and this rail does not mutate `plan.md`, `state.md` or
`implementation.md`.

**What it does without asking:** After triage, it moves the consumed artifact
into the sibling `archived/` directory, adding a timestamp suffix if a file
with that name is already there. It makes no commits: if the review came from
the tracked `.oat/repo/reviews/`, commit the move yourself.

**Example scenario:** The callback review has one High finding and a Low
cleanup note. Receive shows both before asking for dispositions. You convert
the missing input check into a task and either convert the cleanup or explain
why it should be deferred. Use this local ad-hoc variant because the input is
a Markdown artifact and the output should remain outside project tracking.

**Expected output:** Severity counts, converted/deferred/dismissed decisions
with rationale, and a standalone task list inline or at a requested path.
After triage, the consumed artifact moves to its sibling archive and the
archived location is reported. A zero-findings review reports a clean result
and stops.

**Next step:** Implement the accepted tasks through your chosen development
flow, then request another review if needed. This receive skill does not
change code or silently start implementation.

## oat-review-provide-remote

Review a GitHub PR and post its findings without using project lifecycle
context. The GitHub review, rather than a local Markdown artifact on the
reviewing machine, is the handoff to the author.

**Invocation:**

```text
/oat-review-provide-remote --pr 84
```

**Needs an active OAT project:** no.

**Prerequisites:** The PR is reachable through the current repository remote,
and `gh` is installed and authenticated. No OAT project is required. The
`oat-review-provide` skill (utility pack) must also be installed, because its
review template supplies the checklist; without it the skill stops. Confirm
the selected PR, and separately approve the review body before posting it.

**What it does without asking:** After you confirm the PR number, it creates a
temporary worktree, runs `gh pr checkout` inside it and removes it when
finished; if the checkout fails, it switches to diff-only review with a
warning. It posts nothing to GitHub until you approve the review body, and it
writes no local artifact, commits nothing and pushes nothing.

**Example scenario:** A teammate opened PR 84 for the standalone callback fix.
Use remote ad-hoc provide so the findings arrive on that PR, even though the
reviewer has no active project. The skill normally acquires a temporary
worktree for context rather than changing the caller's checkout. Diff-only
mode is available with `--no-checkout`, with a degraded-context warning, and
is used automatically when the checkout fails.

**Expected output:** A single approved GitHub review containing severity
counts, inline findings where the diff supports them and body findings for
locations outside the diff. The report identifies the reviewed PR head,
scope and posting result. Critical or High findings produce
`REQUEST_CHANGES`; otherwise the verdict is `COMMENT`, not automatic approval.
No local review artifact, implementation commit or project bookkeeping is
created by this variant.

**Next step:** On the author's side, use ad-hoc remote receive to triage the
comments. For re-review, guarded prior-review metadata may narrow the scope;
if no valid prior review is available, the normal path reviews the full PR.
A failed post is not a delivered review: follow the reported diagnosis.

## oat-review-receive-remote

Fetch unresolved GitHub review feedback and turn it into standalone tasks.
This is the receiving half of the remote ad-hoc flow.

**Invocation:**

```text
/oat-review-receive-remote --pr 84
```

**Needs an active OAT project:** no.

**Prerequisites:** `npx agent-reviews` is available and GitHub authentication
is configured. No project is required. The selected PR is confirmed before
comment ingestion.

**What it does without asking:** After you confirm the PR, it fetches the
unresolved comments and builds the task list. Every action beyond that needs
your explicit yes: applying fixes, committing them and running `git push`
happen only after you accept the offer, and replies are posted to GitHub only
after you approve them.

**Example scenario:** PR 84 now has the callback finding from remote provide
and a separate reviewer comment about an edge case. Use remote ad-hoc receive
to gather the unresolved feedback, classify the actual issues and decide what
to convert. This variant is appropriate because the source is GitHub and the
accepted work should become standalone tasks, not project task IDs.

**Expected output:** A finding register and task list, with severity and
converted/deferred/dismissed counts. No unresolved comments produces a clean
status and stops. Deferrals and dismissals need concrete rationale, including
for Low findings; a GitHub changes-requested state is evidence to inspect,
not an automatic severity assignment for every comment.

**Next step:** Decide whether to implement the tasks yourself or authorize the
skill's optional fix, verification, commit and push flow. That flow requires
explicit confirmation after the task list. Posting replies is another explicit
choice, and replies distinguish fixed work from merely acknowledged tasks.
Neither optional action changes project lifecycle artifacts on this ad-hoc rail.

## oat-project-review-provide

Review project work against the requirements and artifacts appropriate to its
workflow mode. Use this when the question is not only “is the code sound?” but
also “does this work satisfy the agreed plan?”

**Invocation:**

```text
/oat-project-review-provide code p02
```

Code scope can select a task, phase, contiguous phase range or final review.
Artifact review selects an artifact instead, for example
`/oat-project-review-provide artifact plan`. Without arguments, the skill
proposes or asks for type and scope, then confirms a manual review.

**Needs an active OAT project:** yes, or a project you name explicitly in the
request.

**Prerequisites:** An initialized project must resolve from the active pointer
or an explicitly supplied project/review target. Its core artifacts must be
committed before review. Code review needs completed implementation work and
the mode-appropriate requirements sources; lite review does not require absent
discovery, spec or design artifacts. Code reviews and plan artifact reviews
also need a resolved dispatch policy (`oat_dispatch_policy` in `state.md` or
`workflow.dispatchPolicy.*` in config); without one the review stops before
launching a reviewer. Discovery, spec and design artifact reviews run without
a policy by using the current session's model.

**What it does without asking:** After you confirm the review type and scope,
it dispatches an `oat-reviewer` subagent when the host supports one (on Codex
it may first ask you to authorize that). It writes the review artifact to
`reviews/`, adds a `received` row to the Reviews table in `plan.md`, and
commits both as `chore(oat): record {scope} review artifact`; a synced project
pushes its project ref instead. It skips that commit only if you explicitly
ask to defer it and confirm. If the project's branch is checked out in another
worktree, the artifact and commit land there; if the branch differs from
yours and has no worktree, the skill stops and offers to `git checkout` that
branch, review inline only, or cancel. A review started by a gate runs with no
confirmation prompts.

**Example scenario:** Checkout-hardening has finished phase p02, including
caller updates. Request a local project code review of p02 to check those
changes against the plan and implementation evidence, not just an arbitrary
branch diff. If the project is not active, name its path or project explicitly
when asking for the review rather than switching to the ad-hoc rail by accident.

**Expected output:** A scoped review artifact in the project's active
`reviews/` directory, with requirements alignment, findings, verification
guidance and a next-step recommendation, plus a `received` row in `plan.md`
and the bookkeeping commit described above. An explicitly selected
inline-only flow does not create the ordinary artifact or commit. A blocked reviewer is not a passed
review with zero findings.

**Next step:** Use project review-receive for the active artifact. If findings
identify stale requirements artifacts rather than a code defect, preserve that
distinction during triage; do not automatically change defensible code to match
an outdated description.

## oat-project-review-receive

Process an actionable local project review and reconnect its findings to the
project's execution or artifact-editing flow.

**Invocation:**

```text
/oat-project-review-receive
```

**Needs an active OAT project:** yes, or a project you name. Without one, the
skill can only offer to hand an ad-hoc review to `oat-review-receive`.

**Prerequisites:** A valid project and an active project review must resolve.
The normal input is an actionable artifact in the top level of its `reviews/`
directory. A named project can supply the target even without an active
pointer. Historical archived reviews are not automatically received again;
discovery of an ad-hoc review routes to the ad-hoc receive skill instead.

**What it does without asking:** For a manual code review it asks you to
decide each finding, then applies your decisions without further prompts: it
adds
fix tasks to `plan.md`, updates `implementation.md` and `state.md`, moves the
review artifact to `reviews/archived/`, and commits all of that together as
`chore(oat): record review findings and add fix tasks ({scope})`. A synced
project pushes its project ref instead. The commit is required; it is
deferred only if you explicitly approve. Reviews started by checkpoint
auto-review or by a gate are dispositioned with no prompts at all, and after a
passing gate it may apply small, contained fixes directly and commit them with
the bookkeeping. When the same scope has had 3 review cycles (not counting
gate reviews), further automated cycles are blocked and the skill asks
whether to review the findings manually, proceed to the PR, or explicitly
override the limit.

**Example scenario:** The p02 reviewer found a missed caller and a stale plan
statement. Project receive explains the findings before disposition. For a
manual code review, accepted fixes become stable review-fix task IDs in the
plan; for an artifact review, approved changes are applied directly to the
artifact rather than pretending they are implementation tasks. Use the project
local variant because the input is a local project review event and its
dispositions belong in the project ledger.

**Expected output:** Finding analysis and dispositions, updated project
tracking and the review artifact moved to `reviews/archived/` under a name that
does not overwrite earlier reviews. For a code review, the skill then commits
`plan.md`,
`implementation.md`, `state.md` and the archive move together (synced projects
push the project ref instead). The outcome reports added tasks or artifact
dispositions, the review cycle count out of 3, and the next route. Reviews
started automatically or by a gate have their own disposition rules; findings
below a passing gate's threshold are still recorded, not silently erased, and
small contained fixes may be applied directly during that sweep.

**Next step:** Review any added tasks, then run implementation when ready, or
choose its offered execution handoff: execute the fix tasks now (which can
invoke `oat-project-implement` directly), review the plan first, or exit. For artifact-review changes, request a
new artifact review or follow the phase's approval flow. Final review also
resurfaces deferred Medium findings; receiving one phase review does not
automatically close the project.

## oat-project-review-provide-remote

Review a project's GitHub PR using its requirements context, then post findings
back without writing project tracking on the reviewing machine.

**Invocation:**

```text
/oat-project-review-provide-remote code p02 --pr 84 --project .oat/projects/shared/checkout-hardening
```

**Needs an active OAT project:** no. The project is found from the PR diff or
from `--project`, not from the active pointer.

**Prerequisites:** The PR is reachable and `gh` is installed and authenticated.
An existing project must resolve from exactly one project's `state.md` in the
PR diff or from the explicit `--project` path. The override is needed when the
diff identifies zero or multiple projects. Its artifacts must be available
for mode-aware review. A local active-project pointer is not required.

**What it does without asking:** After you confirm the PR number, it creates a
temporary worktree, runs `gh pr checkout` inside it (falling back to
diff-only review if that fails) and removes the worktree when finished. It
dispatches an `oat-reviewer` subagent to perform the review when the host
supports one. It posts to GitHub only after you approve the review body, and
it never writes project files, commits or pushes on the reviewing machine.

**Example scenario:** The checkout-hardening author asks another workstation
to review phase p02 on PR 84. That reviewer has no active project, and the PR
also touches an unrelated project's state. Use remote project provide with the
explicit project path so the review checks checkout-hardening's plan and posts
findings tagged for that project and scope, rather than mixing the two projects
or producing an ad-hoc review.

**Expected output:** After explicit posting approval, one GitHub review with
project and scope metadata, severity counts, supported inline findings and a
report of the PR head reviewed. The reviewing checkout is preserved through
temporary-worktree acquisition or the declared diff-only fallback. The skill
writes no local review artifact and makes no project bookkeeping, fixes,
commits or pushes on the reviewing machine. Its verdict is `REQUEST_CHANGES`
for Critical/High findings and `COMMENT` otherwise.

**Next step:** On the originating checkout, select the project and run project
remote receive. A re-review can narrow only against guarded prior metadata for
the same project, scope and invocation lineage; an unrelated project's review
must not become the baseline.

## oat-project-review-receive-remote

Bring unresolved GitHub review feedback into an existing project's task and
review ledger. Unlike ad-hoc remote receive, this skill does not directly
implement code fixes.

**Invocation:**

```text
/oat-project-open checkout-hardening
/oat-project-review-receive-remote --pr 84
```

**Needs an active OAT project:** yes. Open the project first; the reviewing
machine's ability to infer a project from the PR does not apply here.

**Prerequisites:** The active project is valid and has `plan.md`,
`implementation.md` and `state.md`. `npx agent-reviews` is available and GitHub
authentication is configured. Confirm the selected PR; the reviewing machine's
ability to infer a project does not remove this receiving variant's active
project requirement.

**What it does without asking:** After you confirm the PR, it fetches the
unresolved comments and asks you to decide each finding. It then writes a new
review artifact for this receive, adds fix tasks for the findings you
converted to `plan.md`, updates `implementation.md` and `state.md`, and commits
them in one commit, `chore(oat): record remote review findings and add fix
tasks (pr-#<N>)`. A synced project pushes its project ref instead. The commit
is required; it is deferred only if you explicitly approve. If the PR has no
unresolved comments, it still records a `passed` review in `plan.md` and
commits it as `chore(oat): record clean remote review (pr-#<N>)`. After 3
receive cycles on the same scope, it stops and asks whether to escalate the
scope or resolve the findings manually. Replies are posted to GitHub only after
you approve them, and it never implements code fixes itself.

**Example scenario:** The remote p02 review on PR 84 identified a missing
caller check. Back in the authoring checkout, open checkout-hardening and
receive that PR's unresolved feedback. The agent presents the finding and
creates a stable review-fix task in the correct project, keeping later
implementation and re-review connected to the same event.

**Expected output:** Findings and dispositions, created `pNN-tNN` task IDs when
needed, a review artifact for this receive (each receive gets its own
timestamped file), and `plan.md`, `implementation.md` and `state.md` updated
and committed together with that artifact (synced projects push the project
ref). A PR with no unresolved comments is still recorded and committed as a
passed review. After 3 receive cycles on the same scope, the skill stops and
asks how to proceed rather than silently repeating ingestion. Optional GitHub
replies require explicit approval and describe the actual disposition.

**Next step:** Run implementation for added fix tasks, then request re-review
of the relevant scope. If no tasks were needed and the review passed, follow
the reported finalization route. Receiving feedback is not itself proof that
the changes were fixed, verified, pushed or approved for merge.
