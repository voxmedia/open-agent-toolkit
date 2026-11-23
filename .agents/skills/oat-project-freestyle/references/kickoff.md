# Freestyle Kickoff: Shaping a Project

Read this when a freestyle project's `shape.md` has a topic not yet shaped: a
new project, or one whose shaping was interrupted by a detour, a restart or
compaction.

## Shaping Guard

- `shape.md` is the checklist. Each topic is one section, in the order below,
  scaffolded as `_Not yet shaped._`. Shaping resumes at the first such section.
- Write each answer into its section as it is given, then update
  `**Last shaped:**`. A restart or compaction loses nothing that is written.
- Any topic may be deferred with "decide later". Write
  `Deferred: <what is open>; due <moment>.` into the section and add one line
  to `## Undecided`: `- <topic>: <what is open>; due <moment>.` The moment is
  concrete, for example "before the first PR" or "when a second lane starts". A
  deferred topic counts as shaped.
- Shaping is complete when every topic holds an answer or a deferral.
- Ask in proportion to the project. The goal comes first because its size sets
  how much of the rest is worth asking: a small project may take one sentence
  per topic, or accept recommended defaults in one round.
- Give every question a recommendation and its tradeoff, worded so that
  accepting it is a one-word answer. Settle facts from the repository yourself;
  put decisions to the user.
- When a `**Shaping resumes at:**` line is present, a detour paused shaping:
  resume at the topic it names, then delete the line. Never redo answered
  topics. If `## Brainstorm or discovery` still reads `result: pending`, the
  detour never handed back: look for its reference file in the project's
  `brainstorming/` folder and, with the user, record it (replacing `pending`
  with its path and a one-line summary) or resume the brainstorm first.

## Before Shaping

Step 1 runs on every resume, before any write (`SKILL.md` Step 2 sends you
here); step 2 runs before the first topic. Each is skipped when it does not
apply.

1. **Claim the project.** `oat project status --project-path "{project-path}"`
   prints the recorded orchestrator branch beside this checkout's branch.
   - Unclaimed (`oat_orchestrator_branch` empty or absent, as for a linked
     child or a project created before the field existed): confirm with the
     user that this session is the project's orchestrator and that this
     checkout is on the branch it will work on, then run
     `oat project orchestrator set --project "{project-path}"`. The claim
     writes `state.md` only; save it with `shape.md` as the commit agreement
     says.
   - Claimed by another branch: this session is a lane. Stop and tell the
     user; a lane never shapes the project or writes its records.
2. **A linked child adopts or defines its shape.** When `state.md` has
   `oat_linked_from: <parent>` and every topic still reads
   `_Not yet shaped._`, the first question is whether to adopt the parent's
   shape or define a new one. Recommend adopting when the child will run the
   way the parent does.
   - **Adopt.** Find the parent's folder with `oat project list`; for a synced
     parent not pulled here, run `oat project pull <parent>` first. When the
     parent is not listed in this checkout (a local parent lives only in its
     own checkout), ask the user for the path to the parent's `shape.md`, or
     define a new shape. Copy the
     parent's `shape.md` over this project's: a snapshot, not a live link, so
     a later reshape of the parent never changes this project silently. Copy
     only `shape.md`: this project keeps its own empty `decisions.md` and
     `memories.md`. In the
     copy, reset `## Goal` to `_Not yet shaped._`, rewrite `## Documents` to
     name kinds of documents (for example "a brief and a phase journal"),
     never the parent's files, set `**Last shaped:**` to today, and add this
     line directly below it:
     `**Adopted from:** <parent>, last shaped <the parent's Last shaped: date>; adopted sections not yet confirmed.`
     Shaping then continues at `## Goal`. Once the goal is written, ask once
     whether any adopted section should differ, change only those, and end the
     line with `adopted sections confirmed <date>.` instead. A resumed session
     that finds `not yet confirmed` after the goal asks that question next.
   - **New.** Shape every topic below as for any project.

## Topics

### 1. Goal

Section: `## Goal`. Ask for the outcome, what done means, and how large the
project is (an afternoon, a few PRs, a multi-week orchestrated run). Record all
three. Use the description given at creation as the starting point, but write
only what the user confirms.

### 2. Brainstorm or discovery

Section: `## Brainstorm or discovery`. Offer this only after the goal is
written. The options:

- **None.** Record `None.` and continue.
- **Brainstorm with `oat-brainstorm`.** Before handing off:
  1. Confirm that `oat config get activeProject` prints this project's path:
     `oat-brainstorm` writes to the active project. If it does not, set it
     with `SKILL.md` Step 1's guarded block, which stops when the write fails
     or the pointer still names another project; never hand off while the
     pointer names another project.
  2. Record in this section:
     `Brainstorm with oat-brainstorm, started <date>; result: pending.`
  3. Add a line directly below `**Last shaped:**`:
     `**Shaping resumes at:** <next topic not yet shaped> (paused <date> for oat-brainstorm)`.
  4. Tell the user that `oat-brainstorm` writes its result as a brainstorming
     reference file in the project's `brainstorming/` folder, follows the
     commit agreement in `shape.md` (with that topic not yet shaped, it writes
     the file and commits and pushes nothing), and hands back to this skill.

  On return, replace `pending` with the reference file's path and a one-line
  summary, delete the `**Shaping resumes at:**` line, and continue at the topic
  it named.

- **An informal discovery pass in conversation.** `oat-project-discover`
  requires a spec-driven project, so for a freestyle project discovery is a
  conversation: explore the problem with the user, write the findings into this
  section (or into a project document the user names), and continue.

### 3. Documents

Section: `## Documents`. Agree which documents the project keeps. Review the
starting points below with the user and recommend one of: a template used as
is, a template adapted, or the project's own pattern. Lean toward the brief
style (a brief plus a phase journal) for most projects, and toward goal-style
milestones (a brief with a Milestones table) for a run of several deliveries.
Whatever the pattern, keep the core elements: the outcome, what done means,
the decisions with their reasons, and the open questions. Decisions about the
work are kept in `decisions.md`, not in a document.

#### Document Starting Points

| Template               | A starting point for                                                                                                                                                                |
| ---------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `plan-brief`           | a brief: goal, outcomes with evidence, approach, constraints, decisions, known unknowns, and phases with intent and exit evidence; add a Milestones table for goal-style milestones |
| `plan-lite`            | a single-sitting plan with validation criteria                                                                                                                                      |
| `discovery`            | a discovery record: problem, constraints, options considered, the chosen direction                                                                                                  |
| `spec`                 | requirements with priorities and verification methods                                                                                                                               |
| `design`               | architecture, components, interfaces and data shapes                                                                                                                                |
| `plan`                 | a task-by-task plan                                                                                                                                                                 |
| `implementation`       | a task journal                                                                                                                                                                      |
| `implementation-brief` | a phase journal with execution records                                                                                                                                              |

Copy a template only when the target file does not exist; the copy replaces
the target:

```bash
oat template resolve "{template}" --output "{project-path}/{document}.md"
```

#### Adapting a Copied Template

The copy is raw: it still carries the lifecycle frontmatter, placeholders and
instructions written for OAT's lifecycle skills. Before the document is used:

1. Delete the `oat_*` frontmatter keys; drop the frontmatter block when nothing
   else is left in it.
2. Fill the placeholders (`{Project Name}`, `YYYY-MM-DD`, `[...]` and `{...}`)
   or delete the ones the project does not need.
3. Remove or adapt every body instruction that conflicts with the agreed
   shape, in particular:
   - a line that names an `oat-project-*` skill as the way to execute, review
     or continue the document (for example `plan-brief.md`'s "Execute this
     brief using `oat-project-implement`", or `spec.md`'s "To be filled by
     `oat-project-plan`");
   - lifecycle fields and their upkeep: `oat_current_task_id` in
     `implementation-brief.md` and `implementation.md`, and
     `oat_plan_parallel_groups` and HiLL checkpoints in the plan templates;
   - lifecycle sections: `## Parallelism`, the `## Reviews` status table and
     its status values, `## Reviews and Gates`, `## Implementation Complete`
     and "Ready for final code review and PR preparation". Reviews are
     recorded in `shape.md` instead;
   - lifecycle conventions: the `**Commit Convention:**` line in
     `plan-brief.md` and `plan.md` (commits follow `shape.md` instead), and
     `plan-brief.md`'s `**Phase block grammar (strict):**` paragraph with its
     example block, which only OAT's lifecycle parsers need.
4. Point a decisions section at `decisions.md`: decisions about the work live
   only there. For a brief-style document (`plan-brief.md` or `plan-lite.md`),
   replace the body of its `## Decisions` section with a line such as
   `Decisions about the work are in decisions.md.`, and write any decision it
   held into `decisions.md` as an entry instead.
5. Check the result. This prints nothing when the copy is clean; keep a line
   only when the project deliberately uses it:

   ```bash
   grep -nE 'oat_|oat-project-|HiLL|Ready for final code review|Commit Convention|block grammar' "{project-path}/{document}.md"
   ```

Record each document in the section: its path, what it is for, and the
template it started from (or "own pattern").

#### Adopting an Existing Plan

When the project adopts a plan written elsewhere (in another session or tool,
or for another workflow), keep its _what_ and decide its _how_:

1. Keep what the plan delivers as written: its changes, their order and its
   acceptance criteria.
2. Record each item of how it runs (its bookkeeping, gates, branches, review
   cadence and PR size) in this section beside the plan, one line each, as
   **kept**, **mapped** to a freestyle record (for example a phase tracker to
   `lanes.md` and lane reports, or a review cadence to `## Reviews`), or
   **dropped**. Carry each kept or mapped item into its topic as that topic is
   shaped.
3. A required gate, a review or an owner approval that the owner or the
   repository requires, is kept or mapped to an equivalent check, never
   dropped. Only discretionary process is dropped.

The proportionality tests in `references/reshape.md` (Checkpoint Questions)
help decide what to drop.

### 4. Execution

Section: `## Execution`. A single agent working through the documents, or an
orchestrator dispatching lanes. Where each lane runs (its own worktree or a
subagent in the orchestrator's worktree) stays the orchestrator's call per
lane; record only the execution style and any limits the user sets.

### 5. Reviews

Section: `## Reviews`. Ask _when_ first, then _who and how_.

**When.** Offer the moments that fit the agreed documents and execution:

- after planning or design documents are written or revised, whatever the
  project calls them;
- after implementation: per phase, per lane, per feature, or at the
  orchestrator's judgement;
- before merging into the integration branch.

**Who and how.** Offer only mechanisms you can observe in this session:

- the host app's own tools (its subagent or delegation tools);
- agent instruction files that carry delegation or review guidance: the
  user's, the repository's and the project's `AGENTS.md` or `CLAUDE.md`; and
- orchestration, delegation or review skills installed in project or user
  scope.

Then take any option the user names, and record its source. A mechanism the
user names but you cannot observe is unverified until its first use.

Record each review as two parts:

- **Intent:** when it happens, the independence it needs (for example a
  different model family), and the effort.
- **Mechanism:** the tool or skill, the host, where you found it, and the date
  it was last verified (or "unverified").

When a review comes due, re-check its mechanism. If it is unavailable, keep
the intent, tell the user, and log it. Reviews never block: a freestyle
project has no required reviews.

### 6. Commits, PRs and merges

Section: `## Commits, PRs and merges`. Agree who commits (records and code)
and when, when PRs open, and who merges. Until this topic holds an answer,
nothing is committed or pushed, by this skill or by `oat-brainstorm`. Once it
does, follow it together with the records rule for the project's scope in
`AGENTS.md` (`## Where records live`). In a local project the project records
stay uncommitted whatever this section says; the agreed shape still governs
code commits.

### 7. User involvement

Section: `## User involvement`. What the user approves before it happens (for
example opening or merging a PR, a reshape) and what they are only told.

### 8. Reshape checkpoints

Section: `## Reshape checkpoints`. The moments to revisit the shape. Suggest
checkpoints that fit the project, for example after the first PR merges, when
the execution style changes, or before the final delivery. At each checkpoint,
and when a plan written after shaping is accepted, the two checkpoint
questions in `references/reshape.md` are asked: does the shape still fit, and
is the plan and its process proportionate to its value. A reshape at a
checkpoint follows `references/reshape.md`.

## Finishing

When every topic holds an answer or a deferral, update `**Last shaped:**` and
summarize the shape for the user, listing each deferred item and when it is
due. If the commit agreement says to commit records now, commit `shape.md` and
any new documents by the records rule for the project's scope; otherwise leave
them uncommitted and say so.
