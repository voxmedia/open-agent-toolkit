# Handoff: Gate CLI timeout activity evidence

Use this prompt in a separate Orca-managed worktree.

---

You are implementing a bounded, standalone Open Agent Toolkit CLI fix. Keep it
independent from the `rereview-scope-narrowing` project.

## Worktree and workflow

- Work in an Orca-managed child worktree based on current `origin/main`.
- Do **not** branch from `slow-review-triage`; that branch contains unrelated
  narrowing-project commits and work in progress.
- Suggested branch: `fix/gate-timeout-activity-evidence`.
- Before editing, follow the repository's workflow-selection gate. Recommend
  **No project workflow** because this is a small, well-understood fix, but do
  not assume the user's selection.
- After creating or switching to the worktree, run `pnpm run worktree:init`.

## Goal

Make gate execution failures diagnostically useful when the child process is
silent but its agent transcript is advancing:

1. Capture one fresh activity-probe observation when the hard timeout fires.
2. Surface the freshest evidence in human-facing failure output.

This is the small independent CLI win discussed during slow-review triage.

## Verified current behavior

- `packages/cli/src/commands/gate/activity-probes.ts` already observes
  Claude/Codex/Cursor transcript locations and returns
  `GateActivityEvidence`.
- `runChildProcess` in `packages/cli/src/commands/gate/index.ts` stores the
  latest periodic sample and includes it in `ProcessRunResult`.
- The timeout callback currently marks the run timed out and sends `SIGTERM`
  without taking a final sample. Returned evidence may therefore be stale by
  one liveness interval.
- `writeReviewGateExecutionFailure` already puts `activityEvidence` in JSON
  failure envelopes, but non-JSON output prints only the generic failure
  message.
- Existing tests around
  `packages/cli/src/commands/gate/index.test.ts:6582` verify evidence in JSON
  timeout and child-failure envelopes. They do not cover a final timeout probe
  or human-facing evidence output.

## Requirements

### Fresh timeout observation

- When the hard timeout fires, initiate a final
  `activityProbe.observe(Date.now())`.
- Do not let filesystem probing delay `SIGTERM`, extend the hard execution
  budget, or change the existing `SIGKILL` fallback.
- Coordinate child-close resolution with the final observation so the returned
  result uses it when available.
- Prevent a slower, older periodic probe from overwriting a newer final sample;
  compare observation timestamps or otherwise serialize updates.
- If the final observation is absent or fails, preserve the last valid periodic
  evidence and the existing timeout behavior.

### Human-facing diagnostics

- For non-JSON execution failures, add a concise activity-evidence diagnostic
  when evidence exists.
- Include whether transcript metadata changed since baseline and enough timing
  context to distinguish fresh activity from a stale process.
- Preserve the existing safety wording for Codex
  `scope: ambient-runtime`: explicitly say the activity is not attributable to
  this gate child.
- Do not dump raw JSON into human output.
- Keep the structured JSON contract backward compatible. Existing
  `activityEvidence` fields and failure outcomes must remain intact.

### Behavioral boundaries

- Do not change timeout defaults or timeout-source precedence.
- Do not add deadline extension, artifact polling, or incremental artifact
  writing.
- Do not alter exit codes, `receiveEligible`, artifact recovery, refusal
  handling, or gate pass/block semantics.
- Timeout-override scaling is a separate follow-up. The observed 20- and
  40-minute failures used overrides, so simply raising the 30-minute
  final-scope default is not a justified fix.

## Likely files

- `packages/cli/src/commands/gate/index.ts`
- `packages/cli/src/commands/gate/index.test.ts`
- `packages/cli/src/commands/gate/activity-probes.ts` and its test only if a
  small helper genuinely belongs there

## Tests

Add focused coverage proving:

1. A timeout takes and returns the final probe sample rather than an older
   periodic sample.
2. An older in-flight periodic probe cannot overwrite the final sample.
3. Probe absence/failure retains the last valid evidence and does not change the
   timeout outcome.
4. Human timeout output summarizes project-scoped advancing activity.
5. Human output labels ambient Codex evidence as non-attributable.
6. JSON timeout and non-timeout child-failure envelopes remain compatible.

Run at minimum:

```bash
pnpm --filter @open-agent-toolkit/cli exec vitest run src/commands/gate/index.test.ts
pnpm --filter @open-agent-toolkit/cli lint
pnpm --filter @open-agent-toolkit/cli type-check
pnpm format
```

## Release requirements

This changes shipped CLI behavior. Per repository policy:

- Bump all five lockstep public packages together from whatever version is
  current after rebasing:
  - `packages/cli`
  - `packages/control-plane`
  - `packages/docs-config`
  - `packages/docs-theme`
  - `packages/docs-transforms`
- Update the lockfile through pnpm rather than hand-editing it.
- Run `pnpm release:validate` before completion.
- Rebase before the version bump or PR handoff if the narrowing PR lands first;
  both efforts touch the lockstep versions even though their implementation
  files are independent.

## Deliverable

Implement and verify the fix, then report:

- the exact timeout/probe coordination used;
- the human-facing diagnostic wording;
- tests and release validation run;
- files and package versions changed;
- any remaining concern.

Do not include unrelated cleanup. Do not push or open a PR unless the user
explicitly authorizes that in the receiving session.
