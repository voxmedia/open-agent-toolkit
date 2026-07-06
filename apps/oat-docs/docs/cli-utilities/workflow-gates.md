---
title: Workflow Gates
description: Configure per-skill final commands and cross-runtime review dispatch with oat gate.
---

# Workflow Gates

Workflow gates let a gate-aware skill run a configured final command before it
is considered done. The common use is independent review: one runtime performs
the work, then `oat gate review` dispatches a normal OAT review to another
runtime such as Codex or Claude and maps blocking review findings to the gate
exit status.

`oat gate cross-provider-exec` remains the generic child-status executor. It
selects an exec target, runs the prompt, and exits with the child process
status. Use `oat gate review` when the command is specifically an OAT review
gate that should inspect the produced review artifact.

## Gate config

Gate config lives under `workflow.gates.skills` and is keyed by skill name.

```json
{
  "workflow": {
    "gates": {
      "skills": {
        "oat-project-implement": {
          "command": "oat gate review \"Use oat-project-review-provide code final to review the current project\"",
          "description": "Run a fresh-runtime final review before implementation is considered done.",
          "onFailure": "block",
          "maxAttempts": 2
        }
      }
    }
  }
}
```

Fields:

- `command` - shell command the skill runs in its Gate Execution step.
- `onFailure` - `block`, `prompt`, or `warn`.
- `description` - optional context for the agent running the gate.
- `maxAttempts` - retry bound for `block`; defaults to `2`.

`oat-project-plan`, `oat-project-implement`, `oat-project-quick-start`, and
`oat-project-import-plan` are currently gate-aware. Gate awareness is declared
in skill frontmatter with `oat_gateable: true`, and
`oat internal validate-oat-skills` warns when config targets a missing or
non-gateable skill.

## Review gates

`oat gate review` is intentionally stateful. It is equivalent to running
`oat-project-review-provide` in another terminal or provider, so the normal
review side effects are expected:

- a review artifact is written under the project reviews directory
- the plan Reviews row is updated
- review bookkeeping commits are expected when the review workflow changes
  tracked state

Gate-produced review artifacts use `oat_review_invocation: gate` in
frontmatter. After a gate review reports a produced artifact, the host must run
or hand off to `oat-project-review-receive` before treating the review as
dispositioned. Until receive runs, the artifact is only produced, not consumed.

`oat gate review` parses the produced artifact and returns a blocking exit
status when the configured threshold is met. `cross-provider-exec` does not do
that interpretation; for generic prompts it still returns only the child process
status.

`oat-project-implement` uses `oat gate review` per phase when a project opts in
via the `oat_phase_review_gate` plan frontmatter — a non-pausing gate that runs
after each selected phase's standard reviewer passes. See
[Reviews → Phase review gate](../workflows/projects/reviews.md#phase-review-gate)
for the frontmatter contract and how passing versus blocking gates are
dispositioned.

### Gate completion signal

The canonical "how do I know the gate finished" signal is the structured result
`oat --json gate review` writes to stdout on exit, together with the process
exit code. Orchestrators should run the gate synchronously and read that
envelope — do **not** poll the `reviews/` directory for a file to appear or
watch the provider process's log for liveness. Filesystem and log-liveness
heuristics are unreliable: a re-gate can momentarily surface a prior round's
artifact, and a lingering provider side-process says nothing about whether the
review committed.

Every terminal envelope carries a `runId` (unique per gate invocation) and,
once an artifact exists, its `generatedAt` (the artifact's seconds-precision
`oat_generated_at`), so a caller can correlate the result to the exact artifact
and disambiguate re-gate rounds:

| `status`                     | Exit | Meaning                                                   |
| ---------------------------- | ---- | --------------------------------------------------------- |
| `ok`                         | 0    | Review completed; gate passed at the threshold.           |
| `blocked`                    | 1    | Review completed; findings at/above the threshold.        |
| `review_failed`              | ≠0   | The provider target exited non-zero; no verdict.          |
| `artifact_validation_failed` | 1    | Provider ran but the review artifact could not be parsed. |

`ok` and `blocked` also include `outcome`, `artifactPath`, `counts`, `scope`,
and `handoff`. Treat any status other than `ok`/`blocked` as an operational
failure, not a passing gate.

**Drive gates through `oat gate review`, not raw provider invocation.** An
orchestrator that hand-rolls the review (for example, calling
`codex exec … oat-project-review-provide <scope>` directly) and then watches
`reviews/` for a file is reimplementing — less reliably — what the CLI already
does: `oat gate review` snapshots the reviews directory, dispatches the
provider, and attributes the produced artifact by content hash, so it is immune
to a stale file lingering from a prior round. It works standalone, not only
inside the `oat-project-implement` auto-loop — a one-off final review is just:

```bash
oat --json gate review \
  --project "$PROJECT_PATH" \
  --review-type code \
  --review-scope final \
  --exit-nonzero-on important \
  'Use oat-project-review-provide code final to review the current project'
```

Read the resulting envelope and exit code; that is the whole completion
contract.

## Exec targets

`oat gate cross-provider-exec` chooses from `workflow.gates.execTargets`.
Targets are keyed by opaque id. OAT uses only the declared runtime, commands,
and priority; it does not parse model names or infer provider semantics from the
id.

Built-in targets:

| Target id        | Runtime  | Base command             | Current-host detector                   |
| ---------------- | -------- | ------------------------ | --------------------------------------- |
| `codex-default`  | `codex`  | `["codex", "exec"]`      | `CODEX_THREAD_ID` or `CODEX_SESSION_ID` |
| `claude-default` | `claude` | `["claude", "-p"]`       | `CLAUDECODE`                            |
| `cursor-default` | `cursor` | `["cursor-agent", "-p"]` | `CURSOR_AGENT`                          |

Built-in targets are conservative defaults. Trusted noninteractive gates that
need to run tools without hanging on provider approval prompts should be
configured deliberately in `workflow.gates.execTargets`; OAT should not bake
dangerous provider permission flags into built-ins.

Config layers can partially override a target or disable it with `null`. Use the
dedicated target writer instead of `oat config set` because target commands are
structured argv arrays:

```bash
oat gate target set claude-opus \
  --runtime claude \
  --base-command-json '["claude","-p","--model","opus"]' \
  --availability-json '["claude","--version"]' \
  --priority 90 \
  --layer user
```

JSON argv is intentional: provider commands often contain flags such as `-p` or
`--model`, which would be ambiguous as variadic CLI options.

### Trusted target examples

Use these examples only in trusted environments where the provider process may
read files, run tools, and write review bookkeeping without an interactive
approval prompt. They are user-level target configuration, not built-in OAT
defaults. Defining a trusted target makes it available to the dispatcher; it
does not mean shared lifecycle gate commands should pin that target.

Claude's default permission mode can block on
`Skill(oat-project-review-provide)`, `oat`, `pnpm`, and shell or tool calls. A
trusted user can opt into `--dangerously-skip-permissions` or the equivalent
`--permission-mode bypassPermissions` behavior in their target command.

Codex trusted gate automation should make sandbox and approval bypass explicit
with `--dangerously-bypass-approvals-and-sandbox`, even when the user's current
default profile already permits the needed commands.

Cursor trusted automation should use `--force`; `--yolo` is the documented alias
for the same behavior.

```bash
oat gate target set codex-5.5-xhigh \
  --runtime codex \
  --base-command-json '["codex","exec","--model","gpt-5.5","-c","model_reasoning_effort=\"xhigh\"","--dangerously-bypass-approvals-and-sandbox"]' \
  --availability-json '["codex","--version"]' \
  --priority 120 \
  --layer user

oat gate target set claude-opus-skip-permissions \
  --runtime claude \
  --base-command-json '["claude","-p","--model","opus","--dangerously-skip-permissions"]' \
  --availability-json '["claude","--version"]' \
  --priority 115 \
  --layer user

oat gate target set cursor-force \
  --runtime cursor \
  --base-command-json '["cursor-agent","-p","--force"]' \
  --availability-json '["cursor-agent","--version"]' \
  --priority 90 \
  --layer user
```

## Command surface

Inspect a skill gate:

```bash
oat gate resolve oat-project-implement --json
```

Set or clear a skill gate:

```bash
oat gate set oat-project-implement \
  --command 'oat gate review --review-type code --review-scope final "Use oat-project-review-provide code final to review the current project"' \
  --description "Run final review in another runtime" \
  --on-failure block \
  --max-attempts 2 \
  --layer user

oat gate unset oat-project-implement --layer user
```

Lifecycle gate commands should normally omit `--target <id>`. Leaving the
target unset lets the dispatcher avoid the current runtime and choose the
highest-priority available non-host target. Pin a target only for manual
dispatch, debugging, or a deliberate local/user-specific override.

Set or clear an exec target:

```bash
oat gate target set codex-high \
  --runtime codex \
  --base-command-json '["codex","exec","--model","gpt-5.5"]' \
  --availability-json '["codex","--version"]' \
  --priority 90 \
  --layer user

oat gate target unset codex-high --layer user
```

Dispatch a review through the target registry:

```bash
oat gate review \
  --review-type code \
  --review-scope final \
  "Use oat-project-review-provide code final to review the current project"
```

Leaving `--target` unset lets target priority choose the highest-priority
available non-host runtime.

For manual or debug dispatch, use `--target <id>` to pin one target and skip
detection/avoidance:

```bash
oat gate review --target codex-5.5-xhigh \
  --review-type code \
  --review-scope final \
  "Use oat-project-review-provide code final to review the current project"
```

Dispatch a generic prompt through the target registry:

```bash
oat gate cross-provider-exec "Use oat-project-review-provide to review the current project"
```

By default the dispatcher:

1. Resolves built-in and configured exec targets.
2. Detects the current runtime with host detection commands.
3. Applies `--avoid same-runtime`.
4. Checks candidate availability in descending priority order, with target id as
   the tie-breaker.
5. Runs the chosen `baseCommand` with the prompt appended.
6. Exits with the child process status.

Use `--target <id>` to pin one target and skip detection/avoidance:

```bash
oat gate cross-provider-exec --target claude-opus "Review the current project"
```

Use `--avoid none` only when you intentionally allow the current runtime to be
selected:

```bash
oat gate cross-provider-exec --avoid none "Run this gate on any available target"
```

## Failure behavior

Gate failure behavior is owned by the gate-aware skill:

| `onFailure` | Meaning                                                                              |
| ----------- | ------------------------------------------------------------------------------------ |
| `block`     | Read the gate output, attempt remediation, rerun up to `maxAttempts`, then escalate. |
| `prompt`    | Surface the failure and ask the user how to proceed.                                 |
| `warn`      | Record the failure and continue.                                                     |

`cross-provider-exec` does fallback only before dispatch, while selecting an
available target. Once a target actually runs, its exit code is the gate result;
OAT does not try another target after a failed review.

## Current limits

V1 gates avoid the current runtime, not the current model or effort setting.
Same-runtime but different-target dispatch, such as using Cursor again with a
different model slug, is future work. Until that exists, reusable lifecycle
gates should rely on default `same-runtime` avoidance for cross-runtime review;
manual and local overrides can pin an explicit reviewer target with
`--target <id>`.
