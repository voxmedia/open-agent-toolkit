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
  topics.

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
  1. Record in this section:
     `Brainstorm with oat-brainstorm, started <date>; result: pending.`
  2. Add a line directly below `**Last shaped:**`:
     `**Shaping resumes at:** <next topic not yet shaped> (paused <date> for oat-brainstorm)`.
  3. Tell the user that `oat-brainstorm` writes its result as a brainstorming
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
the decisions with their reasons, and the open questions.

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
4. Check the result. This prints nothing when the copy is clean; keep a line
   only when the project deliberately uses it:

   ```bash
   grep -nE 'oat_|oat-project-|HiLL|Ready for final code review|Commit Convention|block grammar' "{project-path}/{document}.md"
   ```

Record each document in the section: its path, what it is for, and the
template it started from (or "own pattern").

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
`AGENTS.md` (`## Where records live`). A local project commits nothing,
whatever this section says about code.

### 7. User involvement

Section: `## User involvement`. What the user approves before it happens (for
example opening or merging a PR, a reshape) and what they are only told.

### 8. Reshape checkpoints

Section: `## Reshape checkpoints`. The moments to revisit the shape. Suggest
checkpoints that fit the project, for example after the first PR merges, when
the execution style changes, or before the final delivery. A reshape at a
checkpoint follows `references/reshape.md`.

## Finishing

When every topic holds an answer or a deferral, update `**Last shaped:**` and
summarize the shape for the user, listing each deferred item and when it is
due. If the commit agreement says to commit records now, commit `shape.md` and
any new documents by the records rule for the project's scope; otherwise leave
them uncommitted and say so.
