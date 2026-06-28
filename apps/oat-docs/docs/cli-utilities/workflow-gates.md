---
title: Workflow Gates
description: Configure per-skill final commands and cross-runtime review dispatch with oat gate.
---

# Workflow Gates

Workflow gates let a gate-aware skill run a configured final command before it
is considered done. The common use is independent review: one runtime performs
the work, then `oat gate cross-provider-exec` dispatches a prompt to another
runtime such as Codex or Claude.

V1 gates are deliberately thin. A gate command passes or fails by exit code, and
the skill owns what to do next.

## Gate config

Gate config lives under `workflow.gates.skills` and is keyed by skill name.

```json
{
  "workflow": {
    "gates": {
      "skills": {
        "oat-project-implement": {
          "command": "oat gate cross-provider-exec \"Use oat-project-review-provide to review the current project\"",
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

`oat-project-plan` and `oat-project-implement` are currently gate-aware. Gate
awareness is declared in skill frontmatter with `oat_gateable: true`, and
`oat internal validate-oat-skills` warns when config targets a missing or
non-gateable skill.

## Exec targets

`oat gate cross-provider-exec` chooses from `workflow.gates.execTargets`.
Targets are keyed by opaque id. OAT uses only the declared runtime, commands,
and priority; it does not parse model names or infer provider semantics from the
id.

Built-in targets:

| Target id        | Runtime  | Base command                        | Current-host detector                   |
| ---------------- | -------- | ----------------------------------- | --------------------------------------- |
| `codex-default`  | `codex`  | `["codex", "exec"]`                 | `CODEX_THREAD_ID` or `CODEX_SESSION_ID` |
| `claude-default` | `claude` | `["claude", "-p"]`                  | `CLAUDECODE`                            |
| `cursor-default` | `cursor` | `["cursor-agent", "-p", "--force"]` | `CURSOR_AGENT`                          |

Config layers can partially override a target or disable it with `null`. Use the
dedicated target writer instead of `oat config set` because target commands are
structured argv arrays:

```bash
oat gate target set claude-opus \
  --runtime claude \
  --base-command-json '["claude","-p","--model","opus"]' \
  --availability-json '["claude","--version"]' \
  --priority 90 \
  --user
```

JSON argv is intentional: provider commands often contain flags such as `-p` or
`--model`, which would be ambiguous as variadic CLI options.

## Command surface

Inspect a skill gate:

```bash
oat gate resolve oat-project-implement --json
```

Set or clear a skill gate:

```bash
oat gate set oat-project-implement \
  --command 'oat gate cross-provider-exec "Use oat-project-review-provide to review the current project"' \
  --description "Run final review in another runtime" \
  --on-failure block \
  --max-attempts 2 \
  --user

oat gate unset oat-project-implement --user
```

Set or clear an exec target:

```bash
oat gate target set codex-high \
  --runtime codex \
  --base-command-json '["codex","exec","--model","gpt-5.5"]' \
  --availability-json '["codex","--version"]' \
  --priority 90 \
  --user

oat gate target unset codex-high --user
```

Dispatch a prompt through the target registry:

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
different model slug, is future work. Until that exists, use `--target <id>` when
you need an explicit reviewer target, or rely on the default `same-runtime`
avoidance for cross-runtime review.
