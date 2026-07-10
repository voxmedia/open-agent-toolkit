---
title: Workflow Gates
description: Configure per-skill final commands and family-aware review dispatch with oat gate.
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

:::note Release note: default avoidance changed
Gate dispatch now defaults to `--avoid same-family`, not `same-runtime`.
For multi-family providers such as Cursor, this prevents a gate from reviewing
with the same model family that produced the work. Use `--avoid none` only when
you intentionally allow same-family review.
:::

## Gate config

Gate config lives under `workflow.gates.skills` and is keyed by skill name.

```json
{
  "workflow": {
    "gates": {
      "skills": {
        "oat-project-implement": {
          "command": "oat gate review --project \"$PROJECT_PATH\" --review-type code --review-scope final \"Use oat-project-review-provide code final for the declared project\"",
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

Gate-originated artifacts also copy the configured invocation record that the
CLI places in the review prompt:

```yaml
oat_review_invocation: gate
oat_project: .oat/projects/shared/example
oat_gate_run_id: 00000000-0000-0000-0000-000000000000
oat_gate_target: codex-sol-max
oat_gate_runtime: codex
oat_invocation_model: gpt-5.6-sol # or provider-default | unknown
oat_invocation_reasoning_effort: max # or provider-default | unknown
oat_invocation_source: exec-target-config # or unknown
```

These fields describe configured invocation controls. They do not confirm the
model that ran, and the reviewer must not replace them with self-identification.
The CLI compares the copied values with its gate-owned record before it applies
the severity threshold.

### Review project resolution and corroboration

`--project <path-or-name>` is a declaration. OAT normalizes the declared path
and reports `projectResolutionSource: declared`. When the option is omitted,
the compatibility resolver may use the configured active project
(`active-project`) or the only project candidate (`single-candidate`); those
ambient paths report `corroboration.project: ambient` rather than pretending a
declaration was made.

After dispatch, OAT searches direct, non-archived review files across project
review directories for the unique `oat_gate_run_id`. An explicitly resolved
project is included even when it is outside the configured shared projects
root. For a declaration to corroborate, both the artifact's containing project
and its parsed, normalized `oat_project` must equal the declaration. Sibling
project writes, missing or wrong `oat_project`, missing or wrong run IDs,
outside-repository artifact project values, and duplicate run-ID matches all
fail closed before invocation-field remediation or severity evaluation.

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

| `status`                       | Exit | Meaning                                                      |
| ------------------------------ | ---- | ------------------------------------------------------------ |
| `ok`                           | 0    | Review completed; gate passed at the threshold.              |
| `blocked`                      | 1    | Review completed; findings at/above the threshold.           |
| `review_failed`                | ≠0   | The provider target exited non-zero; no verdict.             |
| `artifact_validation_failed`   | 1    | Artifact format or configured invocation fields are invalid. |
| `targeting_correlation_failed` | 1    | Run or declared-project identity did not correlate.          |

`ok` and `blocked` also include `outcome`, `artifactPath`, `counts`, `scope`,
`handoff`, `gateInvocation`, and `corroboration`. `gateInvocation` contains the
configured `runId`, `targetId`, `runtime`, `model`, `reasoningEffort`, and
`source`. `corroboration.run` and `corroboration.invocation` are each
`matched`, `missing`, or `mismatched`. `corroboration.project` is `matched` for
an explicitly declared, corroborated project and `ambient` when the command
relied on active-project or single-candidate compatibility. Expected and actual
diagnostics include the declared project, containing project, artifact
`oat_project`, normalized artifact project, matching run-ID paths, and configured
invocation. Treat any status other than `ok`/`blocked` as an operational failure,
not a passing gate.

`targeting_correlation_failed` is non-remediable by review-fix retries. Its JSON
sets `receiveEligible: false`, `remediable: false`, and `handoff: null`; do not
run review-receive for that artifact. Correct the stored project declaration or
reviewer output routing and run a new gate instead. Invocation-only mismatch
continues to use `artifact_validation_failed` and can be remediated by copying
the exact configured invocation fields.

**Drive gates through `oat gate review`, not raw provider invocation.** An
orchestrator that hand-rolls the review (for example, calling
`codex exec … oat-project-review-provide <scope>` directly) and then watches
`reviews/` for a file is reimplementing — less reliably — what the CLI already
does: `oat gate review` dispatches the provider, locates direct active project
review artifacts by the unique gate run ID, and uses before/after signatures
only for compatibility diagnostics. Archived and ad-hoc reviews remain
ineligible. It works standalone, not only
inside the `oat-project-implement` auto-loop — a one-off final review is just:

```bash
oat --json gate review \
  --project "$PROJECT_PATH" \
  --review-type code \
  --review-scope final \
  --exit-nonzero-on important \
  'Use oat-project-review-provide code final for the declared project'
```

Read the resulting envelope and exit code; that is the whole completion
contract.

## Exec targets

`oat gate cross-provider-exec` chooses from `workflow.gates.execTargets`.
Targets are keyed by opaque id. OAT uses the declared runtime, commands,
priority, optional `models` list, and any pinned `--model` already present in
the command. It does not infer provider semantics from the target id.

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

Targets may also define a `models` list directly in config. During selection,
OAT expands that target into `(target, model)` candidates, preserves the target
priority and model list order, and appends `--model <winner>` to the command.
A long-form target that already pins `--model` in `baseCommand` is treated as
that candidate's model and is not double-pinned.

```json
{
  "workflow": {
    "gates": {
      "execTargets": {
        "cursor-family-gate": {
          "runtime": "cursor",
          "baseCommand": ["cursor-agent", "-p", "--force"],
          "invocation": {
            "model": "composer-2.5",
            "reasoningEffort": "provider-default"
          },
          "models": ["composer-2.5", "gpt-5.5-xhigh", "claude-opus-4-8"],
          "availabilityCommand": [
            "sh",
            "-c",
            "command -v cursor-agent || command -v agent"
          ],
          "priority": 95
        }
      }
    }
  }
}
```

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
  --invocation-model gpt-5.5 \
  --invocation-reasoning-effort xhigh \
  --availability-json '["codex","--version"]' \
  --priority 120 \
  --layer user

oat gate target set claude-opus-skip-permissions \
  --runtime claude \
  --base-command-json '["claude","-p","--model","opus","--dangerously-skip-permissions"]' \
  --invocation-model opus \
  --invocation-reasoning-effort provider-default \
  --availability-json '["claude","--version"]' \
  --priority 115 \
  --layer user

oat gate target set cursor-force \
  --runtime cursor \
  --base-command-json '["cursor-agent","-p","--force"]' \
  --invocation-model provider-default \
  --invocation-reasoning-effort provider-default \
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
  --command 'oat gate review --project "$PROJECT_PATH" --review-type code --review-scope final "Use oat-project-review-provide code final for the declared project"' \
  --description "Run final review in another runtime" \
  --on-failure block \
  --max-attempts 2 \
  --layer user

oat gate unset oat-project-implement --layer user
```

Lifecycle review gate commands must declare `--project "$PROJECT_PATH"` and
omit `--target <id>`. The lifecycle skill exports `PROJECT_PATH` into the gate
command shell, validates the resolved review command, and then executes it
exactly as configured. It does not inject missing arguments. Leaving the target
unset lets the dispatcher avoid the current runtime and choose the
highest-priority available non-host target. Pin a target only for manual
dispatch, debugging, or a deliberate local/user-specific override.

### Migrate ambient lifecycle commands

Older user-level lifecycle commands often asked a reviewer to inspect the
"current project" but omitted a machine-readable declaration. Migrate each
stored `oat gate review` command by inserting `--project "$PROJECT_PATH"` and
retaining provider-neutral target selection. For example:

```bash
export PROJECT_PATH
oat gate set oat-project-implement \
  --command 'oat gate review --project "$PROJECT_PATH" --review-type code --review-scope final "Use oat-project-review-provide code final for the declared project"' \
  --description "Run final review in another runtime" \
  --on-failure block \
  --max-attempts 2 \
  --layer user
```

Apply the same command shape to `oat-project-plan`,
`oat-project-quick-start`, and `oat-project-import-plan` when those lifecycle
skills have configured review gates. Do not add `--target`; explicit targets
remain manual/debug or deliberate local/user-specific overrides.

Set or clear an exec target:

```bash
oat gate target set codex-high \
  --runtime codex \
  --base-command-json '["codex","exec","--model","gpt-5.5"]' \
  --invocation-model gpt-5.5 \
  --invocation-reasoning-effort provider-default \
  --availability-json '["codex","--version"]' \
  --priority 90 \
  --layer user

oat gate target unset codex-high --layer user

oat --json gate target list
```

`gate target list` is read-only. It reports each resolved target's origin,
explicit configuration, enabled state, current availability, and normalized
invocation values without selecting or executing a reviewer. Omitted invocation
values are reported as `unknown`; `provider-default` is an explicit configured
value, not an inference from the provider command.

Dispatch a review through the target registry:

```bash
oat gate review \
  --project "$PROJECT_PATH" \
  --review-type code \
  --review-scope final \
  "Use oat-project-review-provide code final for the declared project"
```

Leaving `--target` unset lets target priority choose the highest-priority
available non-host runtime.

For manual or debug dispatch, use `--target <id>` to pin one target and skip
detection/avoidance:

```bash
oat gate review --project "$PROJECT_PATH" --target codex-5.5-xhigh \
  --review-type code \
  --review-scope final \
  "Use oat-project-review-provide code final for the declared project"
```

Dispatch a generic prompt through the target registry:

```bash
oat gate cross-provider-exec "Use oat-project-review-provide to review the current project"
```

By default the dispatcher:

1. Resolves built-in and configured exec targets.
2. Expands target `models` into candidate `(target, model)` pairs.
3. Detects the current runtime with host detection commands.
4. Resolves producer identity from `--producer-identity` or dispatch stamps when
   available. Exact phase/task scopes use the matching stamp. `final` and
   contiguous ranges such as `p02-p03` aggregate every in-range implementer/fix
   stamp.
5. Applies `--avoid same-family`.
6. Checks candidate availability in descending priority order, with target id as
   the tie-breaker.
7. Runs the chosen `baseCommand` with the selected model and prompt appended.
8. Exits with the child process status.

Use `--target <id>` to pin one target and skip detection/avoidance:

```bash
oat gate cross-provider-exec --target claude-opus "Review the current project"
```

Use `--avoid none` only when you intentionally allow the current runtime to be
selected or same-family review to run:

```bash
oat gate cross-provider-exec --avoid none "Run this gate on any available target"
```

Use `--producer-identity <value>:<provenance>` to route manually from a known
producer when no project dispatch stamp exists:

```bash
oat gate review \
  --project "$PROJECT_PATH" \
  --producer-identity gpt-5.5-xhigh:declared \
  --review-type code \
  --review-scope final \
  "Use oat-project-review-provide code final for the declared project"
```

Gate JSON output includes `diversity` metadata with the requested avoid mode,
producer identity/provenance/confidence, reviewer target/model/family, and the
achieved level. Claimable exact phase/task matches with a known family report
producer source `stamp` without contributor fields; legacy or otherwise
non-claimable exact matches remain fully `unknown`. An explicit flag reports
`flag` and remains authoritative. Final and contiguous range scopes report
`aggregated-stamps` whenever at least one relevant stamp exists, even for a
single stamp or when no stamp has a claimable family. Their producer record uses
an unknown representative instead of presenting the latest stamp as aggregate
truth:

- `avoidFamilies` is the stable deduplicated union of claimable known families.
- `contributingScopes` is the stable document-order list of distinct scopes from
  every relevant stamp.
- `contributingStampCount` counts every relevant stamp, including unknown or
  otherwise non-claimable identities.

When no relevant aggregate stamp exists, producer source is `unknown` and the
contributor fields are absent. The achieved level is one of:

- `different-family`
- `degraded-to-different-slug`
- `same-family - no diverse target available`
- `unknown-producer`

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

Gate target execution has a child-process timeout (default 10 minutes, override
with `OAT_GATE_EXEC_TIMEOUT_MS`). When a review target times out, JSON output
reports `status: review_failed`, `outcome: review_did_not_complete`,
`timedOut: true`, and the timeout value so automation can distinguish a hung
provider prompt from a completed review with findings.

## Current limits

Family diversity is selected before dispatch. If the selected provider command
starts and then fails, OAT does not try another target after dispatch. If no
different-family target is available, OAT warns, records the degraded achieved
level, and runs the best available target rather than pretending diversity was
achieved.
