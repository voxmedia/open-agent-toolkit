# Closing a Freestyle Project

Use only when the mode read in Step 1 reports `freestyle`. This path replaces
the remaining lifecycle process; do not run its gates, summary, recap, PR
preparation, mandatory bookkeeping commit or push. Freestyle requires no final
review, summary or PR. Do not invoke `oat-project-summary`,
`oat-project-pr-final` or the configured post-implement sequence.

## Retired synced archive resume

Use this section when the first Step 1 selector found freestyle mode at the
exact completed ref (`COMPLETED_REF_SHA`), whether its active alias was retained
or removed, or when the existing executor already returned a validated
`archive-resumed` result with archived `WORKFLOW_MODE="freestyle"`.

For the first-selector route, no archive execution has occurred. Preview the
existing transaction read-only before invoking its executor:

```bash
oat project archive "$PROJECT_PATH" --dry-run --json
```

Check success and retain the preview's exact destinations, including `s3Path`.
Read the archived `AGENTS.md` and `shape.md` at the preview's `archivePath`
when present. If that snapshot must be restored, read the same files from the
already fetched exact completed object with
`git show "$COMPLETED_REF_SHA:AGENTS.md"` and
`git show "$COMPLETED_REF_SHA:shape.md"`; do not pull the terminal alias or
restore records merely to learn the agreement. Apply **Archive effects and
publication authority** below to this preview and shape, including any retry
upload to S3. Missing source files or unresolved authority stop before the
executor. Only after the scope and shape permit all previewed effects, use the
existing executor and receipt decoder (set `SKILL_DIR` to this loaded skill):

```bash
# freestyle-synced-archive-resume:start
PROJECT_NAME=$(basename "$PROJECT_PATH")
ACTIVE_PROJECT_PATH="$PROJECT_PATH"
SYNCED_ARCHIVE_FINALIZE_SCRIPT="$SKILL_DIR/scripts/finalize-synced-archive.mjs"
SYNCED_ARCHIVE_ENTRY=$(node "$SKILL_DIR/scripts/execute-synced-archive-entry.mjs" \
  --repo-root "$(git rev-parse --show-toplevel)" \
  --record-path "${PROJECT_PATH}.json" \
  --project-name "$PROJECT_NAME" \
  --project-path "$PROJECT_PATH") || exit 1
SYNCED_ARCHIVE_RESUME_ASSIGNMENTS=$(node \
  "$SKILL_DIR/scripts/parse-synced-archive-resume-fields.mjs" \
  "$SYNCED_ARCHIVE_ENTRY") || exit 1
eval "$SYNCED_ARCHIVE_RESUME_ASSIGNMENTS" || exit 1
# freestyle-synced-archive-resume:end
```

For either route, `ARCHIVE_PATH` now holds the authoritative archived project,
and `ARCHIVE_OUTPUT` holds the existing transaction's validated terminal report.
Preserve them, including its original `lifecycleCommit`; do not create a
replacement receipt or commit. If the executor already returned that result,
skip the preview/executor block above and read `AGENTS.md` and `shape.md` from
that archive.

Finish only terminal reporting and the pointer clear below. Do not rejoin
lifecycle Step 8.5, refresh dashboards, update links/PRs, regenerate documents,
repeat synthesis or optional work, or invoke archive again. The original
archive agreement governs any archive-retry publication; resuming grants no
new permission to publish.

Apply the archived shape's publication agreement to the existing receipt and
exported outputs. In particular, when it permits archive's local lifecycle
commit but withholds code-branch publication, leave that commit unpushed and
report its SHA; there is no mandatory bookkeeping push. If the agreement
requires a publication that is still due, perform it only under that agreement
and verify the existing receipt was published. A failed or unresolved required
publication retains the pointer and is reported as pending. Never invent a
new commit or treat an unpersisted old answer as publication authority.

When archive is terminal and no agreed publication remains pending, use the
existing synced finalizer to revalidate the same terminal report and clear the
retained active pointer. First require that the active pointer still names
`ACTIVE_PROJECT_PATH`; if a different project is now active, leave it alone.
The mode's existing normal-path reporting rules below still apply.

```bash
# freestyle-synced-archive-finalize:start
FREESTYLE_ARCHIVE_FINALIZATION=$(printf '%s\n' "$ARCHIVE_OUTPUT" | \
  node "$SYNCED_ARCHIVE_FINALIZE_SCRIPT" \
    --project-name "$PROJECT_NAME") || exit 1
printf '%s\n' "$FREESTYLE_ARCHIVE_FINALIZATION"
# freestyle-synced-archive-finalize:end
```

Report the archive location, its original lifecycle commit, the actual
publication disposition and pointer result. End here with no lifecycle
continuation.

## 1. Resolve the project and confirm done

Use the repository root and resolved `PROJECT_PATH` from Step 1. If the synced
checkout is absent, report `oat project pull <slug>` and end without pulling;
resume this path after the user brings it here. Read the project's `AGENTS.md`
and `shape.md`. Resolve its current scope with
`oat project scope "$PROJECT_PATH" --format value`; stop on failure. Run
`oat project status --project-path "$PROJECT_PATH"` and require this checkout
to be on the claimed orchestrator branch before any record write. An unclaimed
project or a lane returns to the orchestrator; do not claim it implicitly.

Ask the user to confirm that `shape.md`'s done criteria are met. In the same
prompt offer the optional `oat-project-retro` and `oat-project-document` runs.
An unclear or unshaped goal needs shaping through `oat-project-freestyle`;
never infer done from a lifecycle phase or a paused project. A declined or
unanswered completion confirmation writes nothing.

## 2. Run the selected optional work

Load the current `oat-project-retro/SKILL.md` only when the user accepted the
retro offer, and `oat-project-document/SKILL.md` only when documentation was
accepted. Run retro before documentation, then finish both before synthesis
so their project-log entries are included. Each skill follows its freestyle
path, including its own apply/content consent. A declined offer skips that
work; it is not a completion gate.

Read `shape.md`'s `## Commits, PRs and merges` agreement before any commit or
push in this path or a child skill. Unshaped, deferred or withheld permission
means leave the produced files uncommitted/unpushed and report them. Resolve
scope again before saving records: shared records use exact-path commits only
when agreed, synced records use `oat project push` only when agreed, and local
records stay uncommitted. Permission to edit content is not permission to
commit or publish it. Code-branch documentation or retro application targets
also follow the shape's commit/push agreement, independently of record scope.

## 3. Finish the project-log synthesis

Probe the actual log, without consulting a feature flag or creating a log:

```bash
oat project log check --project "$PROJECT_PATH" --json
```

Route on the structured result:

- `status: "absent"`: skip synthesis; do not create `project-log.md`.
- `status: "ambiguous"`: stop and report `ambiguity`; repair before continuing.
- `synthesisPending: true`: read the log, synthesize the run's outcomes,
  decisions and learnings into `SYNTHESIS_BODY`, then run the command below.
  Check its exit and re-probe to confirm synthesis is no longer pending.
- Existing `## End-of-run synthesis` with `synthesisPending: false`: keep it
  unchanged, including on retry. An existing log with no pending synthesis
  needs no rewrite. Do not replace an existing synthesis or append a completion
  seal; this path has no summary or roll-up dependency.

```bash
oat project log synthesize --project "$PROJECT_PATH" --body "$SYNTHESIS_BODY"
```

Run that write only for the pending case. A sealed log refusing synthesis is a
repair boundary, never permission to rewrite it by hand. Finish this step
before completing state; preserve any failure as unfinished work.

## 4. Complete state, then archive by scope

For a freestyle project, `oat project complete-state <project-path>` marks it
complete without a closeout snapshot or journal; for a synced project,
`oat project push <project-path>` publishes the completed state, subject to the
publication agreement in `shape.md`; only after that push succeeds,
`oat project archive <project-path>` archives it. Do not run archive after a
failed or withheld synced push.

```bash
oat project complete-state "$PROJECT_PATH"
```

Check success before continuing. This command writes canonical completed state;
never hand-write lifecycle fields or add a plan/journal just to close the project.
Save the exact changed records only as the scope and shape allow. For synced
scope, the agreed push must include all final outputs, including synthesis and
completed state:

```bash
PROJECT_SCOPE=$(oat project scope "$PROJECT_PATH" --format value) || exit 1
if [ "$PROJECT_SCOPE" = "synced" ]; then
  oat project push "$PROJECT_PATH" --message "chore(oat): complete freestyle project $PROJECT_SLUG" || { echo "oat: project push failed; run oat project pull, resolve the reported state, and retry" >&2; exit 1; }
fi
```

If the synced push is withheld by `shape.md` (including an unshaped or deferred
publication agreement), report **complete locally; archive pending until the
agreed push succeeds**. Retain the checkout and active pointer. Do not run
archive, clear the pointer, mark the discovery record complete by hand, or
claim durable completion. When the agreement later permits it, push the final
records and resume at archive without repeating optional work or rewriting an
existing synthesis. A push failure likewise leaves archive pending; report the
CLI diagnostic and recovery, without bypassing it.

### Archive effects and publication authority

For every scope (shared, local and synced), before any archive execution or
retry, inspect the actual effects with the existing read-only preview:

```bash
oat project archive "$PROJECT_PATH" --dry-run --json
```

Require a successful preview and explain its moves, exports, lifecycle commit
and publication destinations. A non-null `s3Path` means records will be uploaded,
including on a local or shared project. Require that the scope and
`shape.md`'s publication agreement permit every actual effect before running
archive; local records must not be uploaded automatically. Meeting done
criteria does not grant publication authority. An unshaped, deferred or withheld
agreement leaves **complete locally; archive pending because publication is not permitted**.
Retain the completed checkout and active pointer; do not invoke archive or its
retry executor, clear the pointer, or claim durable archive completion.

For shared or local scope, archive requires no project-ref push. A local archive
with no conflicting export or publication can proceed; local records stay
uncommitted. Honor the shape for shared bookkeeping commits and exports too.
Synced archive itself retires the discovery record with a parent-branch lifecycle commit,
retains completed history and may publish configured archive storage. The
agreement must allow those effects too. Do not use `--no-commit` to bypass the
synced archive receipt contract. Permission for a project-ref push alone does
not authorize an S3 upload or a code-branch push.

```bash
oat project archive "$PROJECT_PATH" --json
```

Use the real archive result, exact exported paths and lifecycle receipt; do not
invent a summary or PR artifact to satisfy archive, or implement another
archive transaction. Archive can skip an absent summary export; if a configured
export fails, follow its diagnostic and report archive pending. On interruption,
follow archive's existing retry/receipt behavior instead of manually deleting a
checkout or record. Do not automatically push the code branch; any agreed
push includes the archive's exact lifecycle commit and produced outputs.

## 5. Report the actual result

Name the project and scope, optional work performed/skipped, synthesis outcome,
exact committed or uncommitted outputs, push result and archive location or
pending reason. Clear a still-active pointer only after successful archive is
verified (and any shape-required publication succeeds), using
`oat config set activeProject ""`; never clear another active project. Do not
start a summary, review or PR. End this invocation here.
