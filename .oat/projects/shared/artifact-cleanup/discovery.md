---
oat_status: complete
oat_ready_for: oat-project-quick-start
oat_blockers: []
oat_last_updated: 2026-10-11
oat_generated: false
oat_template: false
---

# Discovery: artifact-cleanup

## Phase Guardrails (Discovery)

Discovery is for requirements and decisions, not implementation details.

- Prefer outcomes and constraints over concrete deliverables.
- Implementation details surfaced here are captured as open questions or constraints for design.

## Initial Request

Thomas noticed that OAT lifecycle artifacts in archived projects were hard to
read ("what was going on here?"), suspected noise, and had seen incomplete
`implementation.md` files. He asked for an audit of recently archived
projects, then of all 102, and for the artifact names to be reconsidered. The
audit (Opus 5.5, `.oat/repo/analysis/2026-10-11-archived-artifact-audit.md`,
machine-local) and an independent review of it (gpt-6.1-sol,
`.oat/repo/analysis/2026-10-11-archived-artifact-audit-sol-review.md`,
machine-local) agree on the causes and, with changes, on the fixes. Thomas
asked for all of the improvements "as soon as possible", as a separate quick
project prepared now and executed in this worktree right after the
`brief-goal-workflow-modes` project ships its goal phases, because the fixes
land in the same writer skills and templates that project is editing.

This discovery condenses both reports; they remain the detailed evidence until
the design and plan supersede them. The two reports are gitignored
(`.oat/**/analysis/`), so the plan must carry the numbers it relies on.

Request classification: **well-understood**. Causes are measured, the fixes
were reviewed by two models, and Thomas decided the open policy questions
(below). Discovery is synthesized from the session rather than interviewed.

## Clarifying Questions

### Question 1: Does the archive being gitignored lose anything?

No. `.oat/projects/archived/**` and `reviews/archived/` are gitignored by
design; new worktrees sync archived projects from S3
(`scripts/sync-archived-projects-from-s3.sh`). The only artifact exported into
the tracked repo is `summary.md` (`.oat/repo/reference/project-summaries/`),
so noise there is permanent in the repository. The audit's early "not in git"
framing was withdrawn.

### Question 2: Should reviews be archived so that journal citations resolve?

No. The archive writer deliberately excludes `reviews/` from the local archive
copy and the S3 upload (`archive-utils.ts` `S3_ARCHIVE_SYNC_EXCLUDES` and the
copy filter). Thomas: "I don't want to archive reviews because it's noise."
The consequence is writer-side: the journal's Review Received sections and the
plan's Reviews rows must stand without the file, review paths are local-only
citations, and an unresolved review citation is not a defect.

### Question 3: Writers only, or also repair history?

Writers only. No archive, S3 snapshot or sealed log is rewritten, deduplicated
or backfilled. Success is measured on freshly generated output (scratch
projects driven through the lifecycle), because historical corpus metrics
cannot improve without rewriting history.

### Question 4: Which flagged behaviors are already fixed?

Per the Sol era check against the three October archives and writer history:
still current are the verbatim log roll-up into `summary.md`, misfiled appends
after `## References`, refresh-only plan tasks, the 39-line log header, and the
split between the project log and `oat-execution-learnings.md`. Partly
addressed are completion reconciliation (improved 2026-08-07 in `3a665b9c1`,
enforcement incomplete), the slim dispatch record (guidance landed 2026-09-09
in `745711a05`; October output still pastes JSON), templates, gate-transition
mirroring, durable prose, and archive retry duplicates (synced projects fixed
in `49aeb5075`; local collisions remain). Nothing is historical only.

### Question 5: Where does the project live and under what policy?

In this worktree on `feat/freestyle-project-workflow`, planning artifacts only,
not active, executed in this thread after the goal PR opens. Dispatch ceiling
frontier (Opus 5.5 high implementers, Fable 5.1 high reviewers, Astra high for
the design and plan rounds); no HiLL checkpoints; Claude self-approves the plan
after the Astra round, the artifact review and the configured plan gate, as in
the preceding project.

## Solution Space

### Approach 1: Fix the writers, templates and two CLI commands _(Recommended)_

Change what each lifecycle writer puts where, slim the templates to the slots
that get filled, make the summary roll-up a digest, validate the journal at
completion, and retire the learnings file losslessly into the project log.
Measured on fresh output. Keeps every artifact name.

- Pros: addresses every measured noise source and the status drift; no
  migration of 102 archives; compatible with the brief/goal consumers that are
  landing on the integration base.
- Cons: touches the same skills the goal project just edited (hence the
  sequencing); several small contract tests pin template and skill text.

### Approach 2: Rename the artifact set

Rename `implementation.md`, `project-log.md`, `summary.md` and the retro to
names that match their contents.

- Pros: addresses the "names no longer make sense" question directly.
- Cons: about 300 files including the control-plane task parser, plus 102
  archives and the S3 mirror; removes no noisy line. Both reviewers rejected
  it except for the learnings file.

### Approach 3: Repair the archive corpus

Rewrite statuses, dedupe twin snapshots, backfill PR state.

- Cons: rewrites sealed history; Thomas declined.

### Chosen Direction

Approach 1, with the one rename both reviewers accepted (retire new writes to
`oat-execution-learnings.md` once the project log can carry its six
categories), and with the review-citation rule from Question 2.

## Options Considered

### Option A: Digest the log into the summary versus copy it

Chosen: a bounded observations digest that omits structural entries entirely.
`summary.md` needs durable lessons and unresolved limitations, not the event
log; the archived log is provenance. Repo-wide graduation of `general`
judgments (`rollup.ts` writes them to the repo ledger) is preserved and kept
separate from summary presentation. Exported summaries must not carry live
`.oat/projects/shared/...` paths; a lesson carries archive identity plus entry
id.

### Option B: Teach the parser to read task tables versus validate one format

Chosen: one canonical journal format (`### Task pNN-tNN` blocks, and for brief
and goal the phase-unit execution records) plus validation at the terminal
boundary. The checker is mode-aware: task modes compare normalized plan task
ids against unique journal blocks, their terminal statuses and commit
evidence; brief and goal count accepted phase units and admit
failed/cancelled/no-change records without invented SHAs; goal extraction is a
separate disposition. Legacy tables are shown tolerantly or converted on a
working copy, never accepted as completion evidence. The check must share the
consumer's actual grammar and ownership rules (`state/tasks.ts`, the
fence-aware brief records), not a looser regex.

### Option C: Lint the journal for pasted dispatch JSON versus produce the slim record

Chosen: the producer emits the one-line record (request id, stamp, launch
status, terminal outcome, updated in place), and a focused artifact validator at
review and closeout rejects embedded full dispatch payloads and unresolved
terminal run states (warn while live, fail at terminal closeout). A
repository-wide lint over gitignored or in-flight journals, or a bare
`"request_id"` ban that would reject quoted incident evidence, is not the
control. Do not restore the unconditional dispatch-file mandate removed by
PR #288.

### Option D: Add three log types versus carry the learnings taxonomy

Chosen: the log's four judgment types stay; judgment entries gain a lossless
`category` carrying the autonomous taxonomy verbatim (`gotcha`, `efficiency`,
`documentation-gap`, `candidate-skill-content`, `decision`,
`environment-limited`) plus origin and source identity. Retro reads
observation/impact/recommendation and does not need six native types. The
learnings writer is retired only after autonomous, summary, retro, brief and
goal consumers read the unified representation; historical learnings readers
stay. Default scope `project`; `general` only for a reusable lesson.

## Key Decisions

| ID  | Decision                                                                                                                                                                | Rationale                                                                                          |
| --- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------- |
| D1  | Writers only; no history rewrite; success measured on fresh output                                                                                                      | Thomas; historical metrics cannot move without rewriting sealed records                            |
| D2  | Reviews are not archived; journal and plan records stand without them; review paths are local-only citations                                                            | Thomas: reviews are noise; the journal already carries findings, dispositions and fix-task sources |
| D3  | Keep `implementation.md`, `project-log.md`, `summary.md`, `reviews/`, `references/project-retro.md`; retire only new writes to `oat-execution-learnings.md`, losslessly | both reviewers; rename surface about 300 files for no noise reduction                              |
| D4  | Summary roll-up becomes a bounded observations digest without structural entries; general-scope graduation unchanged                                                    | Option A                                                                                           |
| D5  | One canonical journal format plus a mode-aware terminal validator; no second ledger; no table parsing for completion                                                    | Option B                                                                                           |
| D6  | Slim run record produced by the writer and checked at the finalization boundary                                                                                         | Option C                                                                                           |
| D7  | Fixed append anchors, template slots and the log header change together                                                                                                 | the slots only help if every writer targets them                                                   |
| D8  | `state.md` owns gate transitions; the journal keeps terminal dispositions, waivers, overrides and authority decisions                                                   | receipts are more than status mirrors                                                              |
| D9  | Mechanical refreshes belong to closeout; evidence corrections and accepted design changes remain tasks                                                                  | refresh-only tasks distort the ledger                                                              |
| D10 | Stale present-tense status prose is rewritten at closeout; real follow-ups and timestamped historical observations stay                                                 | a tense rule must not falsify history                                                              |
| D11 | Reopened work is a follow-up project or a new archive generation; local archive retries reuse identical snapshots and refuse conflicting content                        | the wave-5 double copy; keep the synced protections from `49aeb5075`                               |
| D12 | `oat_pr_status` in archives is labelled as an observation at archive time; no host-state observer                                                                       | truthful and cheap                                                                                 |
| D13 | Project runs in this worktree after the goal phases, frontier ceiling, no HiLL                                                                                          | Thomas                                                                                             |

## Constraints

- Integration base is `feat/freestyle-project-workflow` after p12: the brief
  and goal consumers (phase-unit records, milestones, delivery registry,
  `implementation-brief.md`, the goal and brief skills) are part of the fix
  surface. A task-only checker or a learnings merge limited to the audit's
  twelve files is insufficient.
- Lockstep public package bump and per-skill `metadata.version` bumps in the
  final PR; template changes must pass bundle registration, help snapshots and
  the template contract tests; `skills.test.ts` and
  `named-skill-load-contract.test.ts` pin skill text and are expected red until
  the phase that re-pins them.
- `rollup.ts` general-scope graduation into the repo ledger must keep working.
- The journal validator must use the production frontmatter parser and
  explicit section boundaries, not regexes over raw lines (the audit's own
  false positive on docs-improvement-overhaul came from flow-style YAML).
- Brief and goal execution records legitimately carry failed, cancelled and
  no-change statuses (`phase-execution.md:94-100`); the validator must not
  demand a SHA for them.
- Append-only logs keep saying "pending" in old entries; correction is a new
  entry, never an in-place rewrite. Only the summary and the journal's
  terminal prose are rewritten at closeout.
- No new mandatory artifacts; every added slot or field has a named consumer.

## Success Criteria

Measured by a probe that drives scratch projects (one quick, one brief, one
goal, one lite) through implement, review, summary and complete with the
branch-built CLI and the changed skills, and inspects the generated artifacts:

- Journals contain zero fenced dispatch payloads; each launch is one line with
  a terminal outcome; `## Orchestration Runs` is the only place they appear.
- Review receipts, deferred findings and fix tasks sit in the owning phase or
  the fixed `## Reviews and Gates` / `## Deferred Findings` slots; `##
References` is the last section; no template placeholder survives
  completion.
- `summary.md` carries a bounded observations section (or none) with no
  structural entries and no live `.oat/projects/shared/...` paths; the
  general-scope ledger still graduates entries.
- Completion refuses, with a named reason, a journal whose statuses disagree
  with `state.md`, a plan task with no journal block, a task block with no
  commit evidence in a task mode, or an unresolved run record; an explicit
  override is written into the journal, not only the log.
- Gate transitions appear once in `state.md`; the journal carries one terminal
  line per gate run.
- Learnings written by an autonomous run land in `project-log.md` with their
  category intact, and summary and retro read them; the learnings file is no
  longer created for new projects while existing files are still read.
- A second `oat project archive` of the same project does not create a
  timestamp-suffixed twin; reopened work is refused with the follow-up
  guidance.
- `project-log.md` for a new project starts with at most a two-line header.
- Every gate in the Definition of Done passes with real runs; skill and
  lockstep versions bumped; decision records capture D1–D12.

## Out of Scope

- Renaming `implementation.md`, `project-log.md`, `summary.md`, `reviews/` or
  `references/project-retro.md`.
- Rewriting, deduplicating or backfilling any archived project or S3 snapshot.
- Archiving reviews or any other review-retention change.
- A live PR/CI state observer for archived projects.
- Changing the task parser to accept tables or checklists as completion
  evidence.

## Deferred Ideas

- A read-only "journal lint" for in-flight projects beyond the terminal check.
- Converting legacy journals on a working copy (tooling exists only as a
  tolerant display in this project).
- A retro rename to `retro.md` (dropped by Sol as low value).

## Open Questions

- Design: the exact digest selection rule (which judgment entries qualify,
  how many, and the archive-locator format for exported summaries).
- Design: whether the override at completion is a CLI flag with a reason or a
  journal section the operator writes first.
- Design: the category field's position in the judgment heading grammar
  versus the body, given `JUDGMENT_HEADING_RE` and existing consumers.

## Assumptions

- Thomas opens the goal PR before this project starts; the goal branch is the
  base.
- The audit and Sol reports stay available locally for the duration; the plan
  carries every number it relies on.
- Opus 5.5 high implementers and Fable 5.1 high reviewers remain available.

## Risks

- Contract-test churn: template and skill pins fail until re-pinned; mitigated
  by an explicit expected-red list owned by the final phase.
- Over-strict validation blocking legitimate completions (goal extraction,
  failed execution records); mitigated by mode-aware rules and a probe per
  mode before the check is enforced.
- Writer edits colliding with any late goal-phase fix; mitigated by sequencing
  after p12 and re-reading the integration base at plan time.

## Next Steps

- Lightweight design (`design.md`), Astra (gpt-6-astra, high) design round.
- Plan, structured artifact review (Opus 5.5 high), configured plan gate, Astra
  plan round, self-approval; project left ready for `oat-project-implement`
  and not active.
