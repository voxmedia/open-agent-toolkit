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

### Idempotent append and commit

Two optional flags let an interrupted append be replayed safely:

- `--idempotency-key <key>` — skip the append when an existing entry body
  already carries `key`, reporting `already-appended` instead of writing a
  duplicate. The key must appear in `--body` as its own whitespace-delimited
  word, since that is how a replay recognizes the entry it already wrote; a key
  glued to varying text such as a timestamp never matches its earlier self.
  Deduplication does not require `--commit`.
- `--commit` — stage and commit the log after appending, retrying a bounded
  three attempts when the failure is a transient `.git/index.lock`.

Together they are the recovery entry point for a gate whose project-log
finalization could not commit. See
[Workflow Gates](./workflow-gates.md#project-log-finalization) for the receipt
and the exact recovery command.

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
- When `oat-project-implement` or `oat-project-review-provide` receives an
  artifact-mode review, the root workflow first consumes exactly one
  `**Reconnaissance:** attempted` or
  `**Reconnaissance:** not-attempted` signal from the reviewer's brief
  confirmation. A missing, duplicate, or invalid signal fails closed before
  artifact validation or bookkeeping.
  - `attempted` requires a complete `Review Orchestration` section recording
    waves, task classes, classification rationale, selected targets,
    acceptance and outcomes, floor satisfaction, fallback, and primary
    reconciliation. The root then invokes `oat project log append` exactly once
    for one structural entry referencing the review artifact instead of copying
    worker records.
  - `not-attempted` forbids a `Review Orchestration` section and does not invoke
    `oat project log append` for review orchestration.
    Reviewers and reconnaissance workers never write `project-log.md`
    themselves.
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

It also reports whether the log carries a completion seal:

- `sealed`: `true` once the log holds a structural entry whose producer is
  `oat-project-complete` and whose ref is `seal`. Both halves are required — a
  `seal` ref from another producer is an ordinary entry.
- `seal`: `null` when unsealed, otherwise the first seal's `heading` and
  `date`, whether it is `keyed`, and the `count` of seal entries. A `count`
  above one is a log sealed twice before the seal append became idempotent.

`status` keeps its `ok` / `absent` / `synthesis_pending` values on a sealed log;
sealing is reported alongside the status, not as a status value. The one
additional status is `ambiguous`: the log's section markers can be read two
ways (a lone carriage return, U+2028, or U+2029 before a marker), or a seal is
physically present outside the parseable `## Entries` region. `check` then
exits 1 and reports an `ambiguity` reason instead of a clean verdict, the
mutators (`append`, `synthesize`) refuse the same file, and the lifecycle skills
stop rather than treat the log as empty. Bodies may use CRLF line endings; they
are stored normalized to LF (`normalizedLineEndings: true` in the result). A
lone carriage return, U+2028, or U+2029 in a body is refused.

Use `--require-synthesis` to exit with status 1 while synthesis is pending:

```bash
oat project log check --require-synthesis
```

Without that flag, normal `absent`, `ok`, and `synthesis_pending` results exit
successfully so lifecycle skills can decide whether to warn or enforce;
`ambiguous` always exits 1.

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

## The completion seal

The seal is the last entry a project log may ever receive, and `append`
enforces that rather than leaving it to convention:

- Replaying the seal reports `already-appended` and leaves exactly one seal
  entry. This holds for a seal carrying the completion skill's
  `oat-seal:<project>` key and for an unkeyed seal written before that
  convention, which is recognized by its heading instead.
- Every append carrying **new** content is refused with `status: "sealed"` and a
  non-zero exit, naming the seal that closed the log.
- A replay that `--idempotency-key` recognizes as its own earlier entry is the
  one exception: it reports `already-appended` and exits 0 even on a sealed log.
  Nothing is appended — the entry it finds necessarily predates the seal — so
  the seal stays the final entry. This is what keeps a gate
  partial-finalization receipt replayable after the project is completed. The
  key matches a whole word in an existing entry body, so an unrelated append
  whose key happens to occur in some earlier entry is reported the same way
  and likewise writes nothing.

A resumed completion therefore reads `sealed` from `check` and skips the
roll-up and the seal instead of duplicating them.

`rollup` requires an existing `summary.md`; summary authoring remains the
responsibility of the project summary workflow.
