---
title: Approvals and Automation
description: Where a person approves in each OAT workflow mode, what runs without asking, how many agent runs a project starts, and which controls are advisory rather than enforced.
---

# Where people approve, and what runs automatically

This page shows where a person approves work in each OAT workflow mode, what
an agent does without asking, and how many agent runs a project starts. It also
says which team settings a developer can change on their own machine, and links
to the detail.

## At a glance

A HiLL (human-in-the-loop lifecycle) checkpoint is a point where the agent
stops and waits for a person to approve before it continues.

| Mode           | A person approves before code is written                                                                                                                                                   | Pauses during implementation                                                    | Reviews that run automatically                        | At the end                                                                   | Never                  |
| -------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | ------------------------------------------------------------------------------- | ----------------------------------------------------- | ---------------------------------------------------------------------------- | ---------------------- |
| No project     | You direct each step yourself                                                                                                                                                              | None                                                                            | None; run `oat-review-provide` when you want a review | OAT opens no pull request                                                    | Not applicable         |
| Lite           | Once: the requirements and the single-phase plan                                                                                                                                           | None                                                                            | Plan review, phase review, final review               | Opens a pull request by itself; no setting removes this step                 | Merges a pull request  |
| Quick          | You confirm the requirements (or the lightweight design). No plan-approval prompt: the plan is marked ready after an automatic review                                                      | First run lists the phases and asks where to stop; suggested: after every phase | Plan review, a review after every phase, final review | Opens a pull request by itself only if `workflow.postImplementSequence` asks | Merges a pull request  |
| Spec-driven    | Discovery, then the requirements and design. Planning asks you in chat to confirm the task breakdown, but no plan approval is recorded; the plan is marked ready after an automatic review | Same as quick                                                                   | Same as quick                                         | Same as quick                                                                | Merges a pull request  |
| Imported plan  | No approval step; OAT normalizes your plan and reviews it automatically                                                                                                                    | Same as quick                                                                   | Same as quick                                         | Same as quick                                                                | Merges a pull request  |
| Autonomous run | None; it answers its own questions and stops only at defined boundaries                                                                                                                    | None; it approves the final checkpoint itself after a passing final review      | All of the above, plus a review at every checkpoint   | Opens a pull request by default                                              | Merges or force-pushes |

Phase reviews need no person. The final review always runs, but an interactive
run first asks how to run it unless `workflow.reviewExecutionModel` is set. If
the final phase is a checkpoint, you approve the finished work after the final
review; with `workflow.postImplementSequence` set to `pr` or `docs-pr`, the pull
request opens before that approval.

**Quick, spec-driven, and imported projects have no plan-approval prompt.**
Planning ends with an automatic plan review. That review applies Critical and
High fixes itself and offers you the Medium and Low ones, and then the skill
marks `plan.md` ready for implementation. The planning skill
(`/oat-project-quick-start`, `/oat-project-plan`, or `/oat-project-import-plan`)
then stops: it reports the phases and names `/oat-project-implement` as the
next step, and no code is written until you run that skill (or
`/oat-project-next`, which starts it without asking). That stop is your chance
to review the plan, so read `plan.md` when planning finishes and before you run
`/oat-project-implement`. Do not re-run `/oat-project-quick-start` to continue:
on a quick project whose plan is ready, it starts implementation straight away.

What does and does not give a person a say on the plan:

- **Lite:** its single approval covers the requirements and the plan, and the
  decision is written into `plan.md`.
- **Spec-driven:** `/oat-project-plan` asks "Does this breakdown make sense? Any
  tasks missing?" in the chat and revises until you confirm. That confirmation
  is not recorded as an approval, and the automatic review that follows can
  still change the plan.
- **Quick and imported:** nothing asks you to approve or confirm the plan.
  Planning may still ask setup questions, such as which dispatch policy to use
  or whether to add gates.
- **A `plan` checkpoint does not add a pause.** Listing `plan` in a project's
  `oat_hill_checkpoints` in `state.md` does not stop the agent: the planning
  skill marks that checkpoint complete itself when it finishes.
- **First implementation run:** `oat-project-implement` lists every phase and
  asks where to pause before any task runs. That is a checkpoint question, not
  a plan approval, but it is the last point to stop before code is written. It
  is skipped when `workflow.hillCheckpointDefault` is set and in autonomous
  runs. See [HiLL Checkpoints](projects/planning/hill-checkpoints.md).
- **Autonomous runs:** no person sees the plan before implementation.

## How many agent runs does a project start?

An agent run is one model launch for one bounded job, such as implementing or
reviewing a phase. A _gate_ is an optional extra review that a skill runs as
its last step, by a separate reviewer agent, usually in a different agent tool.
No gate is configured by default.

| Step                      | Runs                                                       | Limit                                                                                                                                                                  |
| ------------------------- | ---------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Plan review               | 1, plus 1 re-review after each round of fixes              | `oat_orchestration_retry_limit` in `state.md`: 2 re-reviews by default                                                                                                 |
| Each implementation phase | 1 implementer and 1 reviewer                               | A Critical or High finding adds a fix and a new review, at most 2 rounds by default                                                                                    |
| Final review              | 1 reviewer                                                 | At most 3 review cycles, then the agent stops and asks you how to proceed                                                                                              |
| Review at checkpoints     | 1 extra review at each checkpoint before the last, when on | Off unless you answer yes to the auto-review question on the first implementation run or set `workflow.autoReviewAtHillCheckpoints`; autonomous runs always turn it on |
| Gate (optional)           | 1 reviewer run per gate                                    | `maxAttempts`, 2 runs in total by default                                                                                                                              |

OAT does not estimate prices. Cost depends on your provider's pricing and on
your _dispatch policy_: the highest model tier OAT may use for subagents.
Implementers may run below that tier, but under a capped policy (Economy,
Balanced, High, or Frontier), phase and final reviews use the last model listed
for that policy's tier. See [Dispatch Policy](advanced/dispatch-ceiling.md).

**Illustration, derived from the defaults:** a three-phase quick project, run
interactively with no gates and checkpoint reviews off, where no review finds a
Critical or High problem, uses 8 agent runs: 1 plan review, 3 implementers, 3
phase reviewers, and 1 final reviewer. Each phase review that returns a Critical
or High finding adds 2 runs, a fix and a new review, at most twice per phase, so
the phases alone can reach 18. Not counted: the summary, documentation, and pull
request steps, the project explainer and project recap, and the optional phase
gate review (one extra reviewer run per selected phase). A blocked
implementation gate also reruns the final review before the gate runs again.

## What OAT does without asking

- **Commits** once per task, plus tracking commits at each phase and review
  boundary, on your current branch. See
  [Execution Skills](projects/execution/execution-skills.md#oat-project-implement).
- **Pushes project files to `origin`.** New projects default to the _synced_
  scope: the project's files live on their own Git ref, which is pushed to
  `origin` every time a skill saves it. To stop that, run
  `oat config set projects.defaultScope shared`. This changes the team's
  committed `.oat/config.json`. Project files are then committed on your branch
  and reach `origin` only when the branch is pushed. Use the `local` scope to
  keep them on this machine only. See
  [Before your first project](projects/planning/starting-projects.md#before-your-first-project).
- **Starts subagents**, an implementer and a reviewer per phase, without asking
  each time. On Codex, when launching subagents needs authorization, it asks
  once per run.
- **Merges parallel phases into your branch.** When the plan declares a
  parallel group, it runs each phase in its own worktree and merges the phases
  that pass review into your current branch with `git merge --no-ff`.
- **Pushes your branch and opens the pull request** without confirming. The
  final-PR step (`oat-project-pr-final`) runs `git push -u origin <branch>` and
  `gh pr create`: always in lite, when `workflow.postImplementSequence` includes
  `pr`, and in autonomous runs. `oat-project-complete` opens a pull request
  without asking when `workflow.createPrOnComplete` is `true`, and it also
  pushes your branch after archiving a synced project, whether or not it opens
  a pull request. Autonomous runs also push the branch, without force, after
  each lifecycle step such as planning and implementation. See
  [Autonomous Project Execution](advanced/autonomy.md).

## Set it up the way you want

### A person approves the plan and the final result, and an independent model reviews the code

1. Run `/oat-project-quick-start` and confirm the requirements when asked, or
   `/oat-project-new` to also approve discovery and design.
2. When planning finishes, the skill stops and names `/oat-project-implement`
   as the next step. There is no plan-approval prompt, so read `plan.md` now
   and ask the agent for any changes before you start implementation; that
   reading is your plan approval, and nothing records it. Do not re-run
   `/oat-project-quick-start` to continue, because on a ready plan it starts
   implementation straight away.
3. At the first implementation prompt, choose "Stop only after the final
   phase". To make that your own default, run
   `oat config set workflow.hillCheckpointDefault final --user`. Use `--shared`
   instead only if your team has agreed that every project pauses only at the
   end. Either way, a configured value is used on each project's first
   implementation run without asking and replaces any checkpoint value already
   in `plan.md`.
4. Keep the pull request until you approve:
   `oat config set workflow.postImplementSequence wait --shared` (a legacy
   value that is still supported), then run `/oat-project-pr-final` yourself.
5. Add a review gate on implementation and commit `.oat/config.json`:

   ```bash
   oat gate set oat-project-implement \
     --command 'oat --json gate review --project "$PROJECT_PATH" --review-type code --review-scope final "Use oat-project-review-provide code final for the declared project"' \
     --on-failure block \
     --layer shared
   ```

   `--on-failure` is required. With `block`, the agent fixes findings and reruns
   the gate (2 runs in total by default), then hands over to you. The gate runs
   after the final code review and before your approval. The built-in reviewer
   targets run without permission-bypass flags and can stall on the reviewing
   tool's approval prompts; read
   [Permissions for unattended review](#permissions-for-unattended-review)
   before relying on this unattended.

> [!WARNING]
> The default independence setting falls back to the best available reviewer,
> which may be from the same model family, and only records a warning. Check
> `diversity.achieved` in the gate result: `different-family` means the review
> was independent. See
> [Workflow Gates](advanced/workflow-gates.md#how-independent-the-reviewer-must-be).

### Maximum human control

1. Work on a feature branch: `git switch -c my-change`.
2. Stop OAT from pushing project files every time it saves them.
   `oat config set projects.defaultScope shared` makes it commit them on your
   branch instead, but this edits the team's committed `.oat/config.json`, and
   the files still reach `origin` whenever that branch is pushed, for example
   when the pull request opens. To keep them on this machine only, create the
   project with the `local` scope (next step), or run
   `export OAT_PROJECTS_DEFAULT_SCOPE=local` in your shell.
3. Run `/oat-project-new my-change` (spec-driven; add `--scope local` for a
   local project) and choose the collaborative design mode, so you approve
   discovery and each design section.
4. At the first implementation prompt, keep "Stop after each phase". Check
   first with `oat config get workflow.hillCheckpointDefault`: if it prints
   `final`, the prompt will not appear and the project pauses only at the end.
   Unset it in the layer that sets it, or set `every` for yourself with
   `oat config set workflow.hillCheckpointDefault every --user` (a shared or
   local value still wins over a user value).
5. Avoid automatic pull requests: do not use lite, run
   `oat config set workflow.postImplementSequence wait --shared` (a legacy
   value that is still supported), and leave `workflow.createPrOnComplete`
   unset.

### Mostly unattended, within limits

1. Work on a feature branch; an autonomous run pushes whichever branch is
   checked out.
2. Set a dispatch policy, which autonomy never chooses:
   `oat config set workflow.dispatchPolicy.policy balanced --local`. A policy in
   config overrides each project's own choice.
3. Give any gate `--on-failure block` or `warn`; a failing `prompt` gate stops
   the run.
4. Run `/oat-project-autonomous "<your goal>"`.

It still stops at a product decision, a destructive action, an unresolved
Critical finding, a protected branch or required approval, a missing
credential, or a question it has no rule for. It never merges; review the pull
request yourself.

## Can a teammate weaken a team rule?

Yes, on their own machine. Configuration resolves local first
(`.oat/config.local.json`), then shared (the committed `.oat/config.json`),
then user (`~/.oat/config.json`). Shared beats user, but local beats shared,
and `oat init` adds `.oat/config.local.json` to `.gitignore`, so the change
never appears in a diff. A few keys, such as `projects.defaultScope`, also take
an environment variable that beats every file.

- `oat gate set oat-project-implement --disable --layer local` switches a
  shared gate off for that checkout.
- Interactive planning asks whether to keep or disable each configured gate
  for the new project. A **Disable** answer, or a hand edit, writes
  `oat_skill_gate_overrides: { oat-project-implement: disabled }` to that
  project's `state.md`, and OAT records the gate as disabled by the project.
- `oat config set workflow.autoArtifactReview.plan false --local` skips the
  automatic plan review on that machine; the plan records the skip.
- A local `workflow.hillCheckpointDefault`, or an edit to
  `oat_plan_hill_phases` in `plan.md`, changes where a project pauses.

These controls guide agents on a developer's machine; they are not an
enforcement boundary. Enforce team rules with branch protection, required
reviewers, and CI checks.

## Permissions for unattended review

An _exec target_ is a saved command that starts a reviewer tool. The built-in
targets run `codex exec`, `claude -p`, and `cursor-agent -p`, and OAT adds only
a model choice and the prompt, never a permission-bypass flag. An unattended
gate can therefore be stopped by the reviewing tool's own permission checks.

- An attended review needs no bypass, but it takes the place of a gate; it does
  not satisfy one. Leave the gate unset, choose the fresh-session option at the
  final-review prompt (or set `workflow.reviewExecutionModel` to
  `fresh-session`), and run `oat-project-review-provide code final` yourself in
  another session or agent tool that has the OAT skills installed. Answer its
  prompts, then run `oat-project-review-receive` in the original session.
- Some trusted-target examples in [Workflow Gates](advanced/workflow-gates.md)
  add a provider's permission-bypass flag. A team may choose that for a trusted
  machine; OAT does not require it.
- OAT documents no narrower permission allowlist for reviewers. If you build
  one, test it on an unattended gate before you rely on it.

## Where to go next

- [Choose a Workflow](choose-workflow.md) to pick a mode.
- [Execution Skills](projects/execution/execution-skills.md) for what
  implementation does step by step.
- [Workflow Gates](advanced/workflow-gates.md) for gate setup and limits.
- [Configuration](../reference/configuration.md) for every setting named here.
