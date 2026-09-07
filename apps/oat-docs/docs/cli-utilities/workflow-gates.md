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
          "command": "oat --json gate review --project \"$PROJECT_PATH\" --review-type code --review-scope final \"Use oat-project-review-provide code final for the declared project\"",
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

When `oat gate set` recognizes a direct lifecycle `oat gate review` command,
it requires the canonical global option placement `oat --json gate review`.
Missing, late, repeated, or subcommand-scoped `--json` is rejected with exit 1
before the selected shared, local, or user config layer is changed. Arbitrary
wrappers, unrelated gate commands, and provider exec-target `baseCommand`
arrays remain outside this validator.

A valid command is stored byte-for-byte. `oat gate resolve` returns that exact
string, and the lifecycle executes it unchanged; OAT does not inject, reorder,
or rewrite its shell arguments.

`oat-project-plan`, `oat-project-implement`, `oat-project-quick-start`,
`oat-project-lite`, and `oat-project-import-plan` are currently gate-aware. Gate awareness is declared
in skill frontmatter with `oat_gateable: true`, and
`oat internal validate-oat-skills` warns when config targets a missing or
non-gateable skill.

### Per-project gate overrides

Gate configuration is shared, but one project can opt out of a configured
lifecycle gate without changing any config layer. The override lives only in
that project's `state.md`:

```yaml
oat_skill_gate_overrides:
  oat-project-implement: disabled
```

The map is strict. Keys are gate-aware skill names and the only permitted value
is the literal `disabled`. Arrays, booleans, `enabled`, unknown values,
duplicate keys, and malformed maps are rejected with the offending project state
path. An absent map means follow configuration; keeping every gate leaves the
map absent.

Override keys are accepted only for skills that declare `oat_gateable: true`.
A configured gate may still be resolved and executed for a lifecycle skill that
is not gate-aware — `oat-project-discover` and `oat-project-design` are the
current examples — but because no override key for such a skill is accepted,
their configured gates apply to every project and cannot be disabled per
project.

Precedence is layered, not merged: config layers decide whether a gate exists
at all, and the project override then decides whether an existing gate runs for
that project. An override never creates configuration, so a project may record
an override for a skill that has no configured gate; the gate stays absent.
Overrides never mutate shared, local, or user config, and config changes never
rewrite a project's override.

Interactive project setup offers a keep-or-disable choice per configured gate,
one skill at a time; there is no single switch that disables every gate.
Non-interactive runs never prompt and never write a new map, and an explicit
existing map is preserved unchanged on resume and import.

Resolution is opt-in. Without `--project`, `oat gate resolve` keeps returning
the raw `GateConfig | null` that existing consumers parse:

```bash
oat gate resolve oat-project-implement --json
```

With project context it returns a discriminated envelope instead:

```bash
oat gate resolve oat-project-implement --project "$PROJECT_PATH" --json
```

The envelope's `resolution` is one of three values:

| `resolution`                     | Meaning                                   | `configuredGate` | `effectiveGate` |
| -------------------------------- | ----------------------------------------- | ---------------- | --------------- |
| `configured`                     | A configured gate runs for this project.  | the gate         | the gate        |
| `configured_disabled_by_project` | Configured, but this project disabled it. | the gate         | `null`          |
| `not_configured`                 | No gate is configured for this skill.     | `null`           | `null`          |

`configured_disabled_by_project` retains `configuredGate` so evidence of a
deliberate opt-out can never be mistaken for absent configuration. It also
carries `configSource` and a `projectOverride` record naming the
`state.md:oat_skill_gate_overrides` source.

`configSource` reports the layer that owned the decision. For
`not_configured` it is the layer that explicitly declared the skill `null`, and
`null` only when no layer mentions the skill at all, so a deliberate
layer-level disable stays distinguishable from an absent declaration.
`configuredGate` is `null` in both cases, so neither reads as configured.

Disabled is a posture, not an outcome. A project-disabled gate launches no
process and never enters the passed, missing, or failed branches. Project
progress reports every active override by skill key so the deliberate posture
stays visible to reviewers.

This mechanism covers configured lifecycle skill gates only. It does not affect
the optional `oat_phase_review_gate`, HiLL policy, or autonomous design-gate
behavior, and it cannot disable every gate with one project-wide boolean.

### Implementation exit-gate closeout

For `oat-project-implement`, the configured skill gate is a final, resumable
closeout boundary. It is independent from the root-owned phase reviews, the
mandatory final lifecycle review, and the optional `oat_phase_review_gate`.
Passing or disabling one of those mechanisms never satisfies or disables the
configured implementation gate.

After final verification and the mandatory final lifecycle review pass, OAT
persists `oat_implement_exit_gate` in project state before it launches the
configured command. The state records:

- `pending`, `allowed`, `blocked`, or `stale` status;
- a `configured` or `no_gate` resolution;
- `passed`, `warned`, `prompt_approved`, `project_disabled`, or `no_gate`
  allowed dispositions;
- the resolved configuration fingerprint, reviewed HEAD, implementation
  fingerprint, gate run, envelope, and receive provenance; and
- launch and receive reconciliation data needed to resume without duplicating
  an accepted run or completed receive.

Only a `not_configured` resolution is explicit success for that closeout
generation: `allowed/no_gate` with `disposition: no_gate`. A null, missing,
malformed, or unrecognized resolver result fails closed as unresolved and is
never treated as no gate. A gate this project disabled
persists `allowed/configured` with `disposition: project_disabled`, the
configured command retained as never-executed evidence, null launch and receive
provenance, and a `project_override` record. `config_fingerprint` covers the
resolved override state, so re-enabling the gate changes the fingerprint and a
stored `project_disabled` result is routed as stale instead of reused. Configured success becomes
`allowed/passed`; `warn` and an explicit `prompt` continuation persist their
own allowed dispositions only for a validated, receive-eligible `blocked`
envelope after eligible receive completes durably. Unresolved, malformed,
contradictory, validation, correlation, launch, or receive failures ignore
`onFailure` and remain blocked.

Resume correlates the persisted launch intent with the gate run marker, durable
JSON result receipt, and run-bound artifact. Eligible receive similarly
correlates the source and archived artifact, Reviews event, and bookkeeping
commit. Missing or ambiguous evidence fails closed instead of launching or
receiving again.

An allowed result remains fresh only while every commit after `reviewed_head`
contains recognized closeout-only work, such as gate receipts, project
tracking, summary/documentation/PR sequencing, final HiLL, or completion
bookkeeping. Implementation, test, skill, template, workflow configuration, or
unknown changed paths make the result stale and require a current final review
and a new gate generation.

Only an artifact with `oat_review_invocation: gate` and the matching
`oat_gate_run_id` can satisfy configured-gate provenance. A normal final
review, phase review, or manually produced independent review cannot substitute
for it.

## Review gates

`oat gate review` is intentionally stateful. It is equivalent to running
`oat-project-review-provide` in another terminal or provider, so the normal
review side effects are expected:

- a review artifact is written under the project reviews directory
- the plan Reviews row is updated
- review bookkeeping commits are expected when the review workflow changes
  tracked state

Gate-produced review artifacts use `oat_review_invocation: gate` in
frontmatter. After a gate returns a corroborated `ok` or `blocked` result with a
non-null `handoff`, the host must run or hand off to
`oat-project-review-receive` before treating the review as dispositioned. An
artifact path by itself is not receive eligibility. Until receive runs for a
receive-eligible result, the artifact is only produced, not consumed.

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

### Review producer identity

Dynamic planning workflows can declare their current parent model to a review
gate without writing a provider or model into shared/user config:

```bash
OAT_GATE_PRODUCER_IDENTITY='<model>:declared' oat gate review ...
```

This is a review-command-only bridge. `oat gate review` accepts it only when
the value is non-empty and its provenance suffix is exactly `declared`. The
gate removes the variable from the child reviewer's environment, and non-review
commands such as `oat gate cross-provider-exec` ignore it.

Producer evidence precedence is explicit `--producer-identity`, then a
qualifying implementation dispatch stamp, then the review-only environment
declaration, and finally unknown producer behavior. The environment bridge does
not replace stronger explicit or stamped evidence and does not establish
observed runtime identity.

For final and contiguous-range reviews, each in-scope implementer/fix stamp
contributes its claimable producer family. If that producer is not claimable or
has an unknown family, the gate may infer only a family exclusion from the
stamp's launcher-owned configured target. The target does not become producer
runtime identity, and generic or unclassifiable targets contribute no family.

Keep reusable gate commands producer-neutral in shared and user config.
Planning skills attach the ephemeral declaration only while executing a
resolved configured command that invokes `oat gate review`; they leave it
absent for every other gate command.

### Headless completion safety

Every `oat gate review` child receives the same headless contract through two
channels:

- environment: `OAT_GATE_HEADLESS=1`, `OAT_NON_INTERACTIVE=1`,
  `OAT_GATE_RUN_ID=<runId>`, immutable `OAT_GATE_RUNTIME` and
  `OAT_INVOCATION_MODEL` values, and checkout-local CLI/receipt paths
- prompt frontmatter: `oat_gate_headless: true` plus the target runtime and
  model

In headless mode, `oat-project-review-provide` calls the executable routing
helper instead of deciding from prose:

```bash
"$OAT_GATE_CLI_PATH" gate route \
  --expect-runtime "$OAT_GATE_RUNTIME" \
  --expect-model "$OAT_INVOCATION_MODEL" \
  --can-await true \
  --json
```

The helper returns `inline`, `delegate-sync`, or `refuse`. Inline review is
allowed when a provider marker for the expected/current child runtime is
present and trustworthy model evidence does not contradict the expected model.
That current-target marker takes precedence over inherited parent-provider
markers. Generic model variables and model variables belonging to other
providers are ignored because they may be inherited from the parent;
current-provider model evidence remains fail-closed. A missing current-target
marker or trustworthy contradiction delegates only through an awaited child
route. If no awaited route exists, the reviewer emits
`OAT_GATE_REFUSAL: <reason>` on its own line and fails closed. Headless review
never uses fire-and-forget background dispatch.

The route command must use the gate-provided checkout-local CLI; it must not
retry through bare or installed `oat`. The helper writes
`OAT_GATE_ROUTE_RECEIPT_PATH`, and the parent accepts it only when the JSON
decision shape is valid, `cliRoot` equals the checkout that launched the gate,
and `runtime` equals the selected invocation runtime. Missing, malformed,
cross-checkout, or runtime-mismatched receipts fail closed.

The gate recognizes refusal lines independently of the child exit code. A
validated run-correlated artifact still wins; without one, the envelope has
`status: review_failed`, includes `refusal`, and is not receive-eligible.

### Gate dispatch report semantics

When gate dispatch is represented in a `DispatchReportV1`, consumers require
`schemaVersion: 1` and keep three facts independent:

- `gateInvocation` is the immutable configured run ID, target, runtime, model,
  reasoning effort, and source.
- `runtimeIdentity` is observed or otherwise supported producer identity; it is
  `not-reported` when no runtime evidence exists.
- gate `diversity` describes producer/reviewer routing and achieved separation;
  it does not overwrite either configured invocation or runtime identity.

Configured target values, requested controls, producer stamps, and reviewer
self-report are not interchangeable. The human report is rendered from the
versioned object, and any parseable `Dispatch:` compatibility line is derived
from that same report rather than rebuilt from target IDs or model names.

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
| `artifact_missing`             | 1    | The child exited cleanly without producing an artifact.      |
| `artifact_validation_failed`   | 1    | Artifact format or configured invocation fields are invalid. |
| `targeting_correlation_failed` | 1    | Identity did not correlate; do not run review-receive.       |

Only `ok` and `blocked` are positive, receive-eligible review outcomes: both
follow successful identity corroboration and carry a non-null `handoff`.
`blocked` exits nonzero because of findings, while `ok` exits zero; callers must
therefore route receive from the structured status and handoff rather than from
the exit code. `review_failed` has no validated verdict and is not eligible.
For `artifact_validation_failed`, correct the artifact and rerun the gate; do
not invoke review-receive until the gate successfully revalidates it as `ok` or
`blocked`.

`artifact_missing` means the accepted headless child completed without any
review artifact. It sets `receiveEligible: false`, `remediable: false`, and
`handoff: null`. Fix the reviewer so review work, artifact creation, and
bookkeeping finish inline or through a synchronously awaited child, then start
a new gate run. Do not use review-fix retries or review-receive for the failed
run.

`ok` and `blocked` also include `receiveEligible: true`, `outcome`,
`artifactPath`, `counts`, `scope`, `handoff`, `gateInvocation`, and
`corroboration`. Invoke review-receive only when all three conditions hold:
the status is `ok` or `blocked`, `receiveEligible` is `true`, and `handoff` is
non-null. `gateInvocation` contains the
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
run review-receive for that artifact even when `artifactPath` is present.
Correct the stored project declaration or reviewer output routing and run a new
gate instead. Invocation-only mismatch continues to use
`artifact_validation_failed`; correct the exact configured invocation fields
and rerun the gate for successful revalidation before receive.

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
  --command 'oat --json gate review --project "$PROJECT_PATH" --review-type code --review-scope final "Use oat-project-review-provide code final for the declared project"' \
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

### Migrate legacy lifecycle commands

Older user-level lifecycle commands often asked a reviewer to inspect the
"current project", omitted a machine-readable project declaration, or emitted
human-oriented output. Migrate each stored command to the canonical global-JSON
shape `oat --json gate review --project "$PROJECT_PATH" ...` while retaining
provider-neutral target selection. For example:

```bash
export PROJECT_PATH
oat gate set oat-project-implement \
  --command 'oat --json gate review --project "$PROJECT_PATH" --review-type code --review-scope final "Use oat-project-review-provide code final for the declared project"' \
  --description "Run final review in another runtime" \
  --on-failure block \
  --max-attempts 2 \
  --layer user
```

Apply the same command shape to `oat-project-plan`,
`oat-project-quick-start`, `oat-project-lite`, and `oat-project-import-plan` when those lifecycle
skills have configured review gates. Do not add `--target`; explicit targets
remain manual/debug or deliberate local/user-specific overrides.

Implementation closeout rejects a stored review command without global
`--json`, without `--project "$PROJECT_PATH"`, or with a shared `--target`
before launch. It does not rewrite configuration or inject, reorder, or append
arguments while executing. Migrate the declaration first; otherwise the
project remains blocked and resumable through `oat-project-implement`.

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
   stamp. A stamp whose producer is not claimable or has an unknown family may
   contribute its classifiable configured target family to aggregate avoidance
   at lower confidence.
5. Applies `--avoid same-family`.
6. Checks candidate availability in descending priority order, with target id as
   the tie-breaker.
7. Runs the chosen `baseCommand` with the selected model and prompt appended. The
   prompt is carried in argv, stdin is closed, and stdout/stderr remain captured
   for diagnostics and liveness tracking.
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

- `avoidFamilies` is the stable deduplicated union of claimable known producer
  families plus classifiable configured target families from stamps whose
  producer is not claimable or has an unknown family. A known, claimable
  producer remains authoritative over a conflicting target.
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

Gate failure behavior is owned by the gate-aware skill. The configured policy
applies only to a validated, receive-eligible `blocked` result after its
eligible receive completes durably:

| `onFailure` | Meaning                                                                              |
| ----------- | ------------------------------------------------------------------------------------ |
| `block`     | Read the gate output, attempt remediation, rerun up to `maxAttempts`, then escalate. |
| `prompt`    | Surface the failure and ask the user how to proceed.                                 |
| `warn`      | Record the failure and continue.                                                     |

`review_failed`, `artifact_validation_failed`,
`targeting_correlation_failed`, unknown or contradictory envelopes, launch
failures, and receive failures are operational failures rather than validated
blocking findings. They remain blocked regardless of `onFailure`; even `warn`
cannot turn them into an allowed disposition.

`cross-provider-exec` does fallback only before dispatch, while selecting an
available target. Once a target actually runs, its exit code is the gate result;
OAT does not try another target after a failed review.

Gate target execution has a child-process timeout. Set
the budget at the narrowest useful level. The first valid value wins:

1. command `--timeout-ms`
2. selected exec target `timeoutMs`
3. `workflow.gateTimeouts.code` or `workflow.gateTimeouts.artifact`
4. `OAT_GATE_EXEC_TIMEOUT_MS`
5. built-in type-and-scope default
6. legacy `GATE_EXEC_TIMEOUT_MS` behavior for untyped `gate exec` runs

All configured values must be integer milliseconds from `1,000` through
`14,400,000`. Invalid persisted values are ignored with a warning and
resolution continues to the next source. Code reviews at `final`, phase
(`pNN`), or phase-range (`pNN-pMM`) scope default to 1,800,000 ms (30 minutes).
Task-scoped code reviews (`pNN-tNN`) and artifact reviews default to 900,000 ms
(15 minutes). Startup output reports both the resolved value and source.

Example migration from the former single environment override:

```json
{
  "workflow": {
    "gateTimeouts": {
      "code": 2400000,
      "artifact": 900000
    },
    "gates": {
      "execTargets": {
        "cursor-large-review": {
          "runtime": "cursor",
          "baseCommand": ["cursor-agent", "-p", "--force"],
          "timeoutMs": 3600000
        }
      }
    }
  }
}
```

Use a one-off override without changing config:

```bash
oat gate review --timeout-ms 2700000 \
  --project "$PROJECT_PATH" \
  --review-type code \
  --review-scope final \
  "Use oat-project-review-provide code final for the declared project"
```

### Liveness and post-mortem evidence

Each liveness tick keeps stdout-idle time and also reports `processAlive` plus
the latest metadata-only transcript activity as `lastActivityEvidence` when
available. The probe performs bounded depth-two traversal and compares newest
mtime plus total size with its spawn baseline. It never reads transcript
contents and never changes pass/fail or receive eligibility.

When the hard timeout fires, OAT stops periodic liveness ticks, sends `SIGTERM`,
schedules the existing `SIGKILL` fallback, and then starts one final transcript
observation with the timeout timestamp. Once the child closes, result resolution
waits no longer than the one-second observation grace and does not delay either
signal. A final sample available before result resolution supersedes older
in-flight periodic work; otherwise OAT retains the latest valid periodic
evidence.

On a normal child close, OAT waits within the same one-second grace only when a
periodic transcript observation is already in flight. This preserves late
evidence but can add up to one second to an otherwise successful execution. The
one-second observation grace and five-second force-kill fallback are fixed
safety bounds, not environment-tunable settings.

Claude and Cursor evidence has `scope: project-dir`. Codex's date-sharded
sessions directory is shared across the runtime, so its evidence has
`scope: ambient-runtime`; human output labels it “ambient runtime activity (not
attributable to this gate child).” Probe errors fail soft to process and stdout
telemetry.

Timeout and child-failure JSON envelopes include the latest `activityEvidence`.
For human timeout and non-refusal child-failure output, OAT prints a second line
with this shape:

```text
Activity evidence: <runtime> <project|ambient> transcript metadata <changed|did not change> since baseline; observed <milliseconds>ms ago; latest transcript change was <milliseconds>ms before observation.
```

When the evidence scope is ambient, the line ends with `This activity is not
attributable to this gate child.` Structured refusals omit the extra human
diagnostic because the refusal itself explains why execution stopped.

Before spawn, the gate also writes a transient marker under the system temp
directory at `oat-gate-runs/<runId>.json`; startup diagnostics print its path.
The marker records target, runtime, project, review type/scope, start time,
budget, and budget source. It is deleted at terminal completion. An orphaned
marker indicates the gate parent itself stopped unexpectedly, but markers are
diagnostic only and are never used for artifact validation.

After a review target times out, OAT re-scans the project reviews for exactly
one artifact carrying that invocation's `oat_gate_run_id`. A recovered artifact
still passes through the normal project, timestamp, invocation, normalization,
threshold, and handoff checks. If those checks produce `status: ok` or
`status: blocked`, the envelope also includes `lateCompletion: true`. This is
additive recovery telemetry, not a new status: route review-receive from
`status`, `receiveEligible`, and `handoff` as usual.

When timeout recovery finds no matching run-ID path and no changed diagnostic
artifact, JSON output reports `status: review_failed`, `outcome:
review_did_not_complete`, `timedOut: true`, the timeout value, and
`noOutputProduced`. That field is `true` only when the timed-out child emitted
zero stdout and stderr bytes; it is `false` when the child emitted any captured
output.

Correlation anomalies keep their more specific failure. Multiple artifacts
carrying the run ID, or a changed artifact carrying a mismatched run ID, return
`targeting_correlation_failed` with `receiveEligible: false`. Do not receive
those artifacts; correct the project/run correlation and start a new gate run.

### Incident-to-regression mapping

| Observed failure                                         | Regression coverage                                                                                                    |
| -------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------- |
| Headless reviewer could not complete an async delegation | route unit matrix plus canonical checkout-local command, strict receipt, headless inline, and structured-refusal cases |
| Large final review exceeded the old 15-minute budget     | scope-aware resolver tests plus scaled final-scope fake-runtime case                                                   |
| Silent child looked idle while transcripts grew          | metadata-probe tests plus timeout-with-advancing-transcript fixture                                                    |
| Timeout or child failure produced no artifact            | fail-closed `noOutputProduced` fixture                                                                                 |
| Artifact carried the wrong gate run ID                   | provenance-mismatch fixture                                                                                            |
| Passing artifact lost receive routing                    | handoff and `receiveEligible` fixture                                                                                  |

## Current limits

Family diversity is selected before dispatch. If the selected provider command
starts and then fails, OAT does not try another target after dispatch. If no
different-family target is available, OAT warns, records the degraded achieved
level, and runs the best available target rather than pretending diversity was
achieved.
