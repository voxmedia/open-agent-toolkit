# Lifecycle intent contract

The OAT adapter resolves `projectExplainer` and `projectRecap` intent without
reading or mutating project files. Lifecycle callers pass explicit inputs to
`resolveIntent(...)` and persist only the returned `record`, when present.

## Resolution

Precedence is:

1. lifecycle mode policy;
2. valid project state;
3. `workflow.explainers.*` preference;
4. the built-in `ask` default.

`resolveIntent({ product, mode, state, preference, kickoffRequest, answer,
now })` is pure. Its result contains the effective `decision`, the
`resolutionSource`, whether a prompt is needed, an optional state `record`, and
warnings.

In autonomous mode, `projectRecap` always resolves to `generate` with source
`autonomous_policy`. A lower-precedence skip or `never` preference is overridden
and reported as a warning. Autonomous `projectExplainer` resolves to `generate`
only when the kickoff prompt explicitly requested it; otherwise it resolves to
`skip` without writing an invalid prompt-source skip record.

In interactive mode, an existing valid project record prevents another prompt.
Preferences `always` and `never` resolve directly but are not copied into
project state: doing so would freeze a workflow preference snapshot.
An unresolved `ask` prompts once. Either answer produces an `interactive`
record, so a decision made at any lifecycle gate can be persisted and reused.

## State records

Records use the Phase 1 state contract:

```yaml
oat_project_explainer:
  decision: generate
  source: kickoff_prompt
  decided_at: '2026-07-18T02:30:00Z'
oat_project_recap:
  decision: generate
  source: autonomous_policy
  decided_at: '2026-07-18T02:30:00Z'
```

Allowed decision/source pairs are:

| Product            | Allowed pairs                                                            |
| ------------------ | ------------------------------------------------------------------------ |
| `projectExplainer` | `generate/interactive`, `skip/interactive`, `generate/kickoff_prompt`    |
| `projectRecap`     | `generate/interactive`, `skip/interactive`, `generate/autonomous_policy` |

In particular, `skip/autonomous_policy` is invalid.

## Safe persistence

`hashStateContent(content)` creates the optimistic concurrency token used by
`persistIntent(...)`. A caller reads `state.md`, resolves intent, and supplies
that content hash with the chosen record. Persistence:

- accepts only a regular `state.md` file and rejects symlinks;
- validates the closed record and product-specific source matrix;
- rejects a changed file with `E_INTENT_STALE_WRITE`;
- replaces only the selected top-level intent block while preserving unrelated
  frontmatter fields and the Markdown body; and
- writes a same-directory temporary file and atomically renames it.

On a stale-write conflict, the caller must re-read state, resolve precedence
again, and decide whether a write is still required. It must not retry the old
record blindly.

## Unattended author execution

Every unattended adapter run must provide exactly one provider-neutral author
seam. In-process callers pass `author`; JSON-only and official CLI callers put
`authorModulePath` in the adapter context, naming a module whose `author` export
is a function. Missing module files, invalid exports, and direct-plus-module
conflicts fail at the adapter boundary.

The resolved callback is passed only as the `author` option to
`core.runExplainer`. It is never copied into `ExplainerRunRequestV1`,
`run-request.json`, or another retained data contract. Interactive runs may
omit an author and retain their existing reviewed-source path.

## Tracked-run finalization

`planTrackedRunFinalization(request, context)` is the shared command planner for
tracked project explainer and recap runs. The request contains `runRoot`,
`manifestPath`, `commitMode`, and optional `relocatedFrom`. Context supplies the
repository root, project name, and, for `completion-bookkeeping`, the existing
full artifact commit SHA.

The returned stages must run in order:

1. In `dedicated` mode, commit exactly the manifest-declared immutable package
   with `docs(oat): persist <recipe> for <project>`. In
   `completion-bookkeeping` mode, reuse the caller's existing lifecycle commit.
2. Replace `$ARTIFACT_COMMIT` with the created full SHA when present, then pass
   the planned durability request to the compatible core's
   `recordDurability(...)`. The core verifies commit blobs and updates records;
   it never invokes Git or creates commits.
3. Commit only `manifest.json` and `build-record.json` as the evidence update.
4. Call `verifyTrackedRunFinalization(...)`, then push once so the artifact and
   evidence commits travel together.

Artifact evidence contains retained fact-base, content, theme, and rendered
paths. It always excludes mutable `manifest.json` and `build-record.json`.
Generated Git commands use explicit pathspecs and `commit --only`; callers must
also snapshot unrelated working-tree changes before execution and supply the
before/after lists to the verifier. A mismatch prevents pushing.

An evidence-verification failure is a successful finalizer termination with
run outcome `built-not-durable`: commit the warning-bearing mutable records and
push them with the artifact commit. It does not block project completion. A
later attempt reuses the same artifact commit, supplies the current HEAD as
`currentHead`, invokes core verification again, and appends a new evidence
commit. If the manifest already contains matching durable commit evidence, the
planner returns `complete` with no commands, making repeat termination
idempotent.

For archive relocation, `relocatedFrom` identifies the prior active run for
caller reporting. The current run's immutable paths and the export bookkeeping
commit are submitted to the core; core evidence supersession remains the
authoritative relocation record.

## Completion-time archive relocation

Completion consumes the machine-readable `oat project archive --json` report.
When a recap was selected, `projectRecapExport.sourceRunRoot`,
`projectRecapExport.exportRoot`, and
`projectRecapExport.manifest.relativePath` identify the relocation. The caller
must not predict the dated export path or substitute the gitignored local
archive.

Archive completion is exactly two commits: the lifecycle bookkeeping commit, then the exported recap evidence commit. The bookkeeping commit contains the
tracked export and active-tree deletion and is passed to the finalizer as the
existing artifact commit in `completion-bookkeeping` mode. The finalizer
attests only immutable package paths under the reported export root. The
second commit contains only the updated exported `manifest.json` and
`build-record.json`; one push follows both commits.

The exported-path evidence supersedes the selected run's prior active-path evidence. Mutable records are never part of their own commit evidence, and no
path under `.oat/projects/archived/` is evidence.

Failure to verify the exported commit evidence is non-blocking. The tracked
export remains committed, the mutable records retain the warning and
`built-not-durable` outcome, and the evidence-record commit and push still
complete. A later attestation may recover durability without repeating the
archive.

Post-archive summary and PR recap links target `projectRecapExport.exportRoot`
under `.oat/repo/reference/project-recaps/` on the current head branch. The
tracked summary export and the PR body may carry that link; the gitignored
archive never does.
