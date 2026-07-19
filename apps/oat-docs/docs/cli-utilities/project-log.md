---
title: Project Log
description: Capture append-only project observations and roll them into durable summary and ledger surfaces.
---

# Project Log

`oat project log` manages an optional, append-only `project-log.md` artifact for
workflow observations and lifecycle events. Use it to preserve evidence that
would otherwise remain in agent transcripts, then roll that evidence into
tracked project and repository references before archiving the project.

The command group is the only supported writer for the artifact. Do not edit
entries or the synthesis section by hand.

## Configure project logs

Two workflow keys control the feature:

| Key                             | Values                   | Default                                       |
| ------------------------------- | ------------------------ | --------------------------------------------- |
| `workflow.projectLog`           | `auto`, `true`, `false`  | `auto`                                        |
| `workflow.projectLogLedgerPath` | repository-relative path | `.oat/repo/reference/project-observations.md` |

```bash
oat config set workflow.projectLog auto --shared
oat config set workflow.projectLogLedgerPath .oat/repo/reference/project-observations.md --shared
```

`auto` creates the log on the first append. `true` also lets
`oat project new` scaffold the log up front. `false` skips an append when no log
exists. An existing `project-log.md` always accepts appends, regardless of the
current config value.

For one scaffold operation, `oat project new --with-project-log` forces
creation and `--no-project-log` suppresses it.

## Append entries

Judgment entries capture evidence about the project or reusable workflow:

```bash
oat project log append \
  --project .oat/projects/shared/example \
  --type friction \
  --scope project \
  --area "gate review handoff" \
  --body "The gate passed but the handoff was missing, so review receipt stopped."
```

Judgment flags:

- `--type <bug|friction|worked-well|feedback>`
- `--scope <project|general>`
- `--area <text>` — one line, at most 120 characters
- `--body <text>` — use `--body -` to read from stdin
- `--version-note <text>` — adds an `observed on` clause
- `--project <path>` — optional when an active project resolves

Structural entries record lifecycle events without duplicating larger
artifacts:

```bash
oat project log append \
  --structural \
  --producer oat-project-implement \
  --ref p03 \
  --body "Phase passed; details: .oat/projects/shared/example/implementation.md#run-3"
```

Structural entries require `--structural`, `--producer`, `--ref`, and `--body`.
Do not combine structural flags with judgment flags.

The helper produces these heading grammars in UTC:

```text
### YYYY-MM-DD · <project|general> · <bug|friction|worked-well|feedback> · <area>
### YYYY-MM-DD · structural · <producer> · <ref>
```

Prior entries are never edited or struck through. Append corrections as new
judgments that reference the original heading. Never record secret values such
as tokens, credentials, keys, or signed URLs; reference their name or source
instead.

Run `oat project log append --help` for the complete entry contract.

## Automatic workflow integration

When project logging is enabled, OAT lifecycle surfaces append structural
entries without asking agents to edit `project-log.md`:

- `oat-project-implement` records accepted subagent dispatches, STOP or park
  events, phase outcomes, and parallel-group merge results. These entries point
  to the corresponding `implementation.md` record instead of copying it.
- When `oat-project-implement` or `oat-project-review-provide` receives a review
  artifact with a `Review Orchestration` section, the root workflow validates
  the recorded waves, task classes, selected targets, outcomes, floor
  satisfaction, fallback, and primary reconciliation. It then appends exactly
  one structural entry referencing the review artifact instead of copying
  worker records. Reviewers and reconnaissance workers never write
  `project-log.md` themselves.
- `oat gate review` records exactly one entry for every terminal outcome,
  including successful and blocking verdicts, child failure, timeout,
  targeting-correlation failure, and artifact-validation failure. A log append
  failure produces a warning but never changes the gate result.
- `oat-project-summary` checks for entries, offers append-only promotion of
  reusable project judgments, and invokes `rollup` after authoring
  `summary.md`.
- `oat-project-complete` warns when synthesis is pending, requires a successful
  roll-up for a populated log, and appends the final seal entry before archive.
  No project-log entry may follow the seal.

With the default `auto` setting, the first of these append points creates the
log. With `false` and no existing artifact, automatic appends are no-ops.

## Inspect status

```bash
oat project log check --project .oat/projects/shared/example --json
```

`check` reports whether the log is absent, ready, or still awaiting synthesis;
entry counts by class, type, and scope; the last entry date; and invalid
hand-written headings. It reads only `project-log.md`.

Use `--require-synthesis` to exit with status 1 while synthesis is pending:

```bash
oat project log check --require-synthesis
```

Without that flag, normal `absent`, `ok`, and `synthesis_pending` results exit
successfully so lifecycle skills can decide whether to warn or enforce.

## Complete the synthesis

Write the end-of-run synthesis through the command:

```bash
oat project log synthesize \
  --project .oat/projects/shared/example \
  --body "The workflow was effective; preserve the gate handoff checks."
```

Use `--body -` for stdin. `synthesize` replaces the pending synthesis section
without changing entries. It fails when the log is absent or the synthesis is
already complete; append a correction judgment instead of replacing a completed
synthesis.

## Promote and roll up observations

Before roll-up, promote a reusable `project` judgment by appending a new
`general` judgment. Its body must reference the original heading. Never mutate
or annotate the original entry.

```bash
oat project log append \
  --type friction \
  --scope general \
  --area "gate review handoff" \
  --body "Promotes '### 2026-07-18 · project · friction · gate review handoff': this applies to all gate-driven reviews."
```

After `summary.md` exists, roll up the log:

```bash
oat project log rollup \
  --project .oat/projects/shared/example \
  --json
```

`rollup` writes or updates `## Workflow Observations` in `summary.md` and
appends `general` judgments to `workflow.projectLogLedgerPath`. Ledger entries
deduplicate by date and area. The command is idempotent.

The structured result contains:

- `status`: `ok` or `failed`
- `summarySection`: `written` or `updated`
- `ledgerOutcome`: `appended`, `deduplicated`, `skipped_permitted`, or `failed`
- `entriesRolledUp`: number of log entries written to the summary section

`skipped_permitted` means the default repository reference layer is absent and
no ledger path was explicitly configured; `status` remains `ok`. An explicitly
configured ledger write failure returns `status: "failed"`. Completion must not
seal or archive a project with entries until roll-up reports `status: "ok"`.

`rollup` requires an existing `summary.md`; summary authoring remains the
responsibility of the project summary workflow.
