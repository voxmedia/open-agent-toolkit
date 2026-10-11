---
oat_status: complete
oat_ready_for: null
oat_blockers: []
oat_last_updated: 2026-10-11
oat_generated: false
oat_template: false
---

# Design: artifact-cleanup

Lightweight design for a quick-mode project. It covers what the plan needs:
which surface owns each fix, the contracts the writers and the CLI share, the
negative controls, the documentation obligation, and the phase split. The
evidence lives in two machine-local reports
(`.oat/repo/analysis/2026-10-11-archived-artifact-audit.md` and
`…-sol-review.md`); every number the plan depends on is restated here.
Decisions D1–D13 are in `discovery.md`.

## Overview

Archived OAT projects are hard to read for four measured reasons, all in the
writers rather than the artifact names:

1. **Noise copied between files.** `oat project log rollup` copies every log
   entry verbatim into `summary.md` (median 29% of a summary, max 85%; 3,589
   lines exported into the tracked repo), and dispatch runs paste their full
   JSON record into `implementation.md` (68–73% of the two largest journals;
   records left at `child_outcome: running`).
2. **Statuses nobody reconciles.** 31% of archives keep a phase or task header
   at `pending`/`in_progress`/`blocked` or a journal `oat_status:
in_progress` after completion; 85 of 102 keep `oat_pr_status: open`.
3. **Records written where no reader looks.** 21% keep task evidence in
   tables or checklists the task parser cannot count; 10% append fix tasks,
   receipts or whole phases after `## References`; 51% leave template
   sections unfilled.
4. **Lessons split across two files.** 892 structural versus 31 judgment
   entries across 49 logs; the five `oat-execution-learnings.md` files hold
   the real gotchas.

The fix set is: a digest instead of a copy; a mode-aware terminal validator
over one canonical journal format; a slim, producer-made run record checked at
closeout; fixed append slots and slimmer templates changed together with the
writers; `state.md` as the only owner of gate transitions; learnings folded
into the project log losslessly; archive retries that cannot create twins;
and documentation updated for every changed contract. Names stay (D3).
History is not rewritten (D1); success is measured on fresh output.

## Architecture

### System Context

```text
writers (skills)                      CLI                               readers
──────────────────                    ───────────────────────────       ──────────────────
oat-project-implement refs  ──run record line──▶ project dispatch record --format line
oat-project-review-receive  ──receipts, fixes──▶ (journal slots)  ──▶ project journal check ──▶ oat-project-complete
oat-project-autonomous      ──learnings──▶ project log append --category ──▶ project log rollup (digest) ──▶ summary.md ──▶ repo export
oat-project-summary / retro ◀── project-log.md (judgment + category) ◀────────────────────────────────────────┘
oat-project-complete        ──prose rewrite, refresh, validate, archive──▶ project archive (identity-safe)
templates (.oat/templates)  ──slots──▶ scaffold ──▶ new projects
docs (apps/oat-docs, AGENTS.md, decisions) ◀── every changed contract
```

### Component Diagram

| Component                  | Owner surface                                                                                                                    | Depends on                                                                              |
| -------------------------- | -------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------- |
| Observations digest        | `packages/cli/src/commands/project/log/rollup.ts`                                                                                | log grammar; summary template section                                                   |
| Learnings fold             | `log/grammar.ts`, `log/append.ts`, `log/check.ts`, `oat-project-autonomous`, summary/retro readers                               | digest                                                                                  |
| Journal terminal validator | new `packages/cli/src/commands/project/journal-check/` (shared with `closeout-check`/`complete-state`)                           | `control-plane/state/tasks.ts`, brief phase-unit records, milestones, delivery registry |
| Slim run record            | `project dispatch record --format line` (renderer) + validator rule                                                              | journal-check                                                                           |
| Archive identity           | `project/archive/archive-utils.ts`                                                                                               | snapshot metadata                                                                       |
| Templates                  | `.oat/templates/{implementation,implementation-brief,project-log,summary}.md` and `packages/cli/assets/templates/*` registration | template contract tests                                                                 |
| Writer skills              | implement references, review-receive, complete, summary, retro, autonomous, pr-progress/pr-final (receipt placement)             | templates, CLI                                                                          |
| Documentation              | `apps/oat-docs/docs/**`, root `AGENTS.md`, decision records, skill docs mapping                                                  | everything above                                                                        |
| Probe                      | scratch projects per mode through implement → review → summary → complete                                                        | branch-built CLI and skills                                                             |

### Data Flow

A run writes one line per launch into `## Orchestration Runs` and updates it
in place with the terminal outcome. Review receive writes the receipt and any
fix task into the owning phase section and the deferred finding into `##
Deferred Findings`. Autonomous runs append judgment entries to
`project-log.md` carrying a `category`. At closeout, `project journal check`
validates the journal against `state.md` and the plan; `oat-project-complete`
rewrites stale present-tense prose in the journal's Final Summary and in
`summary.md`, runs the digest roll-up, refreshes pointers, then archives with
a stable snapshot identity. Readers (summary, retro, dashboard) consume the
same files they do today.

## Component Design

### Observations digest (D4)

`rollup.ts` currently renders every entry (`renderEntries`) under `##
Workflow Observations` in `summary.md`, and separately graduates
`general`-scope judgment entries into the repo ledger. The digest replaces
only the summary rendering:

- Input: judgment entries only (structural entries are provenance and stay in
  the log). Selection: every judgment entry with a non-empty body, newest
  first, capped at a configurable count (default 12) with a one-line "N more
  in the project log" trailer; entries whose `category` is `decision` or
  `gotcha` are never dropped by the cap.
- Each rendered lesson carries its source identity: the entry heading date
  and type, the `category` when present, and an archive locator of the form
  `project-log.md#<entry-heading-slug>` relative to the project, never a live
  `.oat/projects/shared/...` path (the export moves the file).
- The section is omitted when there is no durable lesson; counts by producer
  are available under `--json` as diagnostics, not rendered.
- General-scope graduation (`rollup.ts:232-251`, ledger dedupe by key) is
  unchanged and tested separately.
- Negative control: the old renderer copies a structural entry and a live
  path into the summary; the digest rejects both; a judgment entry with a
  category survives with its locator.

### Learnings fold (D3, Option D)

- Grammar: judgment headings keep the four types; the body gains an optional
  first line `**Category:** <gotcha|efficiency|documentation-gap|candidate-skill-content|decision|environment-limited>`
  and `**Source:** <producer or run id>`; `append` accepts `--category` and
  `--source` for judgment entries and validates the category against the six
  values; `check`, `rollup` and the parser expose `category` on parsed
  entries. The heading regex is unchanged so existing logs and readers keep
  parsing.
- `oat-project-autonomous` writes its learnings as `project log append
--type <mapped> --scope project --category <original> --area …` with the
  observation/impact/recommendation body, mapping `gotcha`,
  `environment-limited` → `friction`; `efficiency`, `candidate-skill-content`
  → `worked-well`; `documentation-gap` → `feedback`; `decision` → `feedback`
  with the category preserved. When the project log is disabled the writer
  falls back to the existing learnings file (dual write never happens).
- Summary and retro read judgment entries with categories first and the
  legacy learnings file second, deduplicating by source identity; the
  summary's "Autonomous Execution Learnings" section is retained as the
  rendering of category-bearing entries, and the brief/goal "learnings
  captured" clause (brief-contract §12) points at the same write.
- Scaffold stops creating `oat-execution-learnings.md`; `project log check`
  reports a legacy learnings file as `learnings: legacy` so complete can note
  it.
- Negative control: a learnings entry appended without `--category` is
  accepted (backward compatible) but the autonomous writer's contract test
  fails if the category is missing; a legacy file is still read by summary
  and retro.

### Journal terminal validator (D5, D6, D8)

New `oat project journal check --project <path> [--at closeout|review]
--json`, pure evaluator plus I/O, reused by `closeout-check` and
`complete-state`:

- Mode-aware. Task modes (quick, spec-driven, import, lite): normalized plan
  task ids ↔ unique `### Task` blocks (the production parser from
  `state/tasks.ts`, fence-aware), each completed block has a commit SHA or a
  recorded deferral/override, no task listed in the plan lacks a block,
  overview totals match. Brief and goal: accepted phase units, execution
  records may be `failed`/`cancelled`/`no-change` without a SHA, goal
  extraction is its own disposition, milestones and deliveries read through
  the landed readers.
- Status agreement: journal `oat_status`/`oat_ready_for`, phase and task
  `**Status:**` lines, and `state.md` `oat_phase_status`/gate freshness must
  agree with the terminal claim; a `blocked`/`in_progress` header on a
  completed phase is a refusal with the header's line.
- Placement: the last H2 is `## References`; `## Orchestration Runs` holds
  only run-record lines (no fenced block containing a dispatch record's
  `request_id`/`caller`/`role_name` triple; quoted evidence elsewhere is not
  scanned); every run record has a terminal outcome at `--at closeout`
  (warning at `--at review`); no template placeholder (`{Task Name}`,
  `{commit sha}`, `0/{N}`, `(fill when …)`) survives.
- Override: `--override <reason>` is accepted only from complete, writes a
  `### Completion override` entry into the journal's `## Deviations from Plan
/ Design` (and the structural log entry it already writes) and never
  normalizes a status silently.
- Output: `{ status: ok | refused, reasons: [{code, path, line, owner}] }`;
  `complete-state` writes nothing on refusal (existing contract).
- Negative controls, one per rule: the audit's failure shapes reproduced as
  fixtures (a `blocked` header under a completed overview; p-rev3 in the plan
  with no block; a task checklist instead of blocks; 2,690 lines under
  Deferred Findings; a `running` run record; `{Task name}` placeholders) each
  refused with the right code; a valid journal per mode passes; the
  docs-overhaul flow-style YAML frontmatter parses (the audit's own false
  positive).

### Slim run record (D6)

- `project dispatch record --format line` renders the validated record as one
  line: `request_id · target · stamp · launch_status · child_outcome`. The
  implement references instruct the root to write exactly that line under `##
Orchestration Runs` and to replace the line's outcome field when the child
  returns; nothing else from the record enters the journal. Full payloads
  stay in the dispatch input files the orchestrator already keeps outside the
  worktree.
- The validator's placement rule above is the enforcement; no repo-wide lint.
- Negative control: a journal with the audit's pasted block is refused at
  closeout and warned at review; the one-line form passes.

### Fixed slots and templates (D7)

- `.oat/templates/implementation.md`: adds `## Reviews and Gates` (one line
  per review round and gate run at its terminal outcome, with the artifact
  path marked local-only per D2) and `## Deferred Findings` before `## Final
Summary`; drops `## Implementation Log`, the per-phase `## Test Results`
  table and the "Conventions" blockquote (one free-text verification line per
  phase remains); keeps `## Deviations from Plan / Design` and has
  review-receive fill it. `implementation-brief.md` gets the same two slots
  and keeps its phase-unit records. `project-log.md`: the 39-line contract
  header becomes two lines and a docs link; the sample entry is dropped.
  `summary.md`: `## Workflow Observations` becomes the digest section with
  the omit-when-empty rule.
- Writers target the slots: review-receive writes receipts, fix tasks and
  deferred findings there; implement writes run lines and phase closeouts
  there; pr-progress/pr-final write their receipt lines there. The
  `References`-last rule is a shape check, not a substitute for ownership.
- `state.md` owns gate transitions; the journal keeps one terminal line per
  gate run plus waivers, overrides and authority decisions (D8).
- Negative control: the template contract tests and bundle registration
  cover both journal templates; a scaffolded project has no placeholder the
  validator flags once the phase sections are filled.

### Closeout prose and refresh (D9, D10, D12)

`oat-project-complete`: rewrites stale present-tense status sentences in the
journal's Final Summary and in `summary.md` ("remain pending until …") into
dated past-tense observations, keeping real follow-ups; runs the mechanical
summary/closeout refresh itself so reviewers never file refresh-only tasks;
labels `oat_pr_status`/`oat_pr_url` in the archived `state.md` as an
observation with a timestamp. Reviewer guidance (review-provide) says
refresh-only findings are not tasks.

### Archive identity (D11)

`archive-utils.ts`: a second archive of the same project with identical
content reuses the existing snapshot; conflicting content refuses with
guidance ("reopen as a follow-up project or a new generation"); the
timestamp suffix is used only for a genuinely new generation and the
metadata records `generation` and `supersedes`. The synced-scope protections
from `49aeb5075` stay. Negative control: the five twin shapes (same slug,
same completion timestamp) cannot be produced; a changed journal after
sealing refuses.

### Documentation

Every changed contract is documented in the same phase that changes it, and
the final phase audits the set:

- `apps/oat-docs/docs/reference/project-artifacts.md` (artifact set,
  slots, the learnings fold, the review-citation rule);
  `workflows/projects/execution/project-log.md` (category, digest);
  `workflows/projects/execution/index.md` and `closeout/retro.md` (where
  learnings live now); `reference/cli-reference.md` (`journal check`,
  `log append --category/--source`, `dispatch record --format line`,
  archive behavior); `reference/configuration.md` (digest cap);
  `workflows/advanced/workflow-gates.md` and `reviews/index.md` (gate lines
  in the journal, local-only review paths); the lifecycle and
  project-state-machine pages where closeout gains the validator.
- Root `AGENTS.md` Definition of Done and the "Artifact Location" guidance
  where the journal slots change; skill `SKILL.md` prose for every edited
  writer; `apps/oat-docs/skill-docs.json` if a skill gains a docs section.
- Decision records for D1–D12 via `oat decision new`; the generated index
  regenerated; backlog items for the deferred ideas.
- The docs app check (`pnpm --filter oat-docs check`), markdownlint and
  `docs:skills:check` run in the phase that edits docs; `pnpm build:docs` in
  the final gate run.

### Probe (success criteria)

One scratch project per mode (quick, lite, brief, goal) driven with the
branch-built CLI and the changed skills through implement (one dispatched
phase, one review round with a fix), summary and complete; the generated
artifacts are checked against every success criterion in `discovery.md`.
Negative probes: the audit's failure shapes injected into a scratch journal
are refused at complete. Results recorded in `implementation.md` only; no
tracked fixtures.

## Surface dispositions

| Surface                                                                                                                                                        | Disposition                                               |
| -------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------- |
| `log/rollup.ts`, `log/grammar.ts`, `log/append.ts`, `log/check.ts`                                                                                             | change (digest, category/source, legacy learnings report) |
| `project/journal-check/*`                                                                                                                                      | new                                                       |
| `closeout-check`, `complete-state`                                                                                                                             | consume the validator; refusal shape unchanged            |
| `project/dispatch/record.ts`                                                                                                                                   | `--format line`                                           |
| `project/archive/archive-utils.ts`                                                                                                                             | identity-safe retry, generation metadata                  |
| `project/new/scaffold.ts`                                                                                                                                      | stop creating the learnings file                          |
| templates: implementation, implementation-brief, project-log, summary                                                                                          | change; bundle registration and contract tests updated    |
| skills: implement references, review-receive, review-provide, complete, summary, retro, autonomous, pr-progress, pr-final, brief contract §12 learnings clause | change                                                    |
| docs, AGENTS.md, decision records, backlog                                                                                                                     | change                                                    |
| archives, S3 snapshots, sealed logs                                                                                                                            | untouched (D1)                                            |
| artifact names                                                                                                                                                 | unchanged (D3)                                            |

## Error Handling

The validator and the archive guard fail closed with a reason code, a path
and a line, and name the owner that can fix it; `complete-state` writes
nothing on refusal. The digest never throws on a malformed entry: it skips it
and reports the skip under `--json`. The learnings writer refuses an unknown
category rather than inventing one. A legacy learnings file is reported, not
migrated.

## Testing Strategy

Unit tests per CLI component with the fixtures above; template contract tests
and help snapshots; skill contract tests re-pinned in the phase that edits a
skill (expected red until then, listed in the plan); a prove-it-can-fail per
validator rule (neutralize the rule, the fixture passes, restore); the probe
as the end-to-end evidence; the full Definition of Done in the final phase
with real runs.

## Implementation Phases

1. CLI: digest, log category/source, learnings fold readers and scaffold
   change (with tests and docs for those commands).
2. CLI: journal validator, run-record renderer, archive identity (tests,
   negative controls, docs).
3. Templates and the writer skills that target the slots (implement
   references, review-receive, review-provide, complete, summary, retro,
   autonomous, PR skills; brief contract learnings clause), with skill docs.
4. Probe per mode, documentation audit across the pages above, decision
   records, backlog, version bumps and the full gate run.

Phases 1 and 2 are write-disjoint within `packages/cli` except for shared
tests under `commands/project/__tests__`; the plan decides whether they run
as a parallel group. Phase 3 depends on both; phase 4 on everything.

## Open Questions

Resolved in this design: digest selection rule, override mechanism, category
placement. Left to the plan: the parallel-group decision for phases 1–2 and
the exact expected-red list.

## References

- `discovery.md` (decisions D1–D13, success criteria)
- `.oat/repo/analysis/2026-10-11-archived-artifact-audit.md` and
  `…-sol-review.md` (machine-local evidence)
- `packages/cli/src/commands/project/log/`, `project/archive/archive-utils.ts`,
  `packages/control-plane/src/state/tasks.ts`
- `.agents/skills/oat-project-brief/references/brief-contract.md` §12
