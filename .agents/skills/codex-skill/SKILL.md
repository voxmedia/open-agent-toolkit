---
name: codex-skill
version: 1.3.0
description: Use when the user asks to run Codex CLI commands (codex exec, codex resume) or references OpenAI Codex workflows. Handles Codex-specific analysis, refactoring, and automated editing tasks.
disable-model-invocation: true
user-invocable: true
---

# Codex Skill Guide

## Running a Task

1. Classify the requested work as one of the task classes used by OAT model
   routing (`mechanical-recon`, `intelligent-recon`, `default-implementation`,
   `hard-reasoning`, or `consequential`), then read
   `.agents/skills/subagent-orchestration/references/provider-codex.md` and take
   the model and reasoning effort it currently lists for that class. **That
   provider reference is the source of truth for model and effort selection**;
   any model named in this guide is only a dated example and never overrides it.
   Never offer a compatibility or legacy snapshot as a default. If that reference
   is unavailable, do not fall back to the dated examples below: stop, ask the
   user for an explicit model and effort, then run exactly what they name and
   skip the step-2 matrix checks the missing reference cannot answer.
2. Resolve the model and reasoning effort:
   - If the user already supplied a model and reasoning effort, check the pairing
     against the reference's task-class matrix before running, then use it: an
     explicit user instruction outranks the dated examples. Say so once, without
     blocking, when the pairing sits below the route the matrix gives the
     classified work; confirm before launching when the reference classifies that
     model as a direct-API specialist route rather than a CLI route.
   - If the reference leaves exactly one eligible route for the class, use it
     and state the choice in your summary.
   - Only when more than one currently eligible route materially changes cost or
     capability, ask once via `AskUserQuestion`, offering each route as **one
     combined model-plus-effort choice** (the class default, its economy route,
     and its escalation route) so the answer cannot produce a pairing the
     reference does not list. Skip any route the matrix marks as direct-API
     only: this skill drives the Codex CLI. Never ask for model and effort as
     two independent questions. At the time of writing the reference routes CLI
     work among the GPT-5.6 family (`gpt-5.6-sol`, `gpt-5.6-terra`,
     `gpt-5.6-luna`), each paired with the effort its task-class matrix gives
     that route — read that matrix rather than trusting this list.
3. Select the sandbox mode required for the task; default to `-s read-only`
   unless edits or network access are necessary. Network access alone does not
   justify the broadest sandbox: grant it inside the write sandbox with
   `-s workspace-write -c sandbox_workspace_write.network_access=true`, and
   reserve `-s danger-full-access` for genuine broad-filesystem needs.
4. Assemble the command with the appropriate options:
   - `-m, --model <MODEL>`
   - `-c, --config model_reasoning_effort="<effort>"` — pass the exact effort
     string the reference pairs with the chosen model, or the one the user named
     when the reference is unavailable (for example `medium`, `high`, `xhigh`,
     or `max`); there is no dedicated effort flag
   - `-s, --sandbox <read-only|workspace-write|danger-full-access>`
   - `--approve-for-me` (routes approval requests through automatic review under
     the workspace-write sandbox) when the task must apply edits unattended —
     pair it only with `-s workspace-write`
   - `-C, --cd <DIR>`
5. Do **not** add `--skip-git-repo-check` to ordinary commands. Add it only when
   the target directory is not a Git repository, or when another documented
   Codex requirement applies. In that case, state the reason and obtain the
   user's authorization via `AskUserQuestion` before running the command.
6. When continuing a previous session, use `codex exec resume` and pipe the new
   prompt via stdin:
   `echo "your prompt here" | codex exec resume --last 2>/dev/null`.
   Resuming continues the recorded conversation; pass no configuration flags
   unless the user explicitly asks for a change. Do **not** assume the resumed
   run re-applies the original session's sandbox, approval, or repository-check
   settings — treat those as coming from the current invocation and your Codex
   configuration defaults, and say which sandbox you believe is in effect when
   you report back. The live syntax is
   `codex exec resume [OPTIONS] [SESSION_ID] [PROMPT]`: resume options such as
   `-m <MODEL>` or `-c model_reasoning_effort="<effort>"` go after `resume` and
   before the session id. The `-s/--sandbox` and `-C/--cd` flags are not
   available on `codex exec resume`: when a follow-up genuinely needs a different
   sandbox, pass `-c sandbox_mode="<read-only|workspace-write|danger-full-access>"`
   and obtain fresh authorization for any high-impact mode; start a new session
   when the working root itself must change.
7. **IMPORTANT**: By default, append `2>/dev/null` to all `codex exec` commands
   to suppress thinking tokens (stderr). Only show stderr if the user explicitly
   requests to see thinking tokens or if debugging is needed.
8. Run the command, capture stdout/stderr (filtered as appropriate), and
   summarize the outcome for the user, restating the model and effort you used
   and the authority you took them from.
9. **After Codex completes**, inform the user: "You can resume this Codex session
   at any time by saying 'codex resume' or asking me to continue with additional
   analysis or changes."

### Quick Reference

| Use case                              | Sandbox mode            | Key flags                                                                                     |
| ------------------------------------- | ----------------------- | --------------------------------------------------------------------------------------------- |
| Read-only review or analysis          | `read-only`             | `-s read-only 2>/dev/null`                                                                    |
| Apply local edits                     | `workspace-write`       | `-s workspace-write --approve-for-me 2>/dev/null`                                             |
| Network access inside a write sandbox | `workspace-write`       | `-s workspace-write -c sandbox_workspace_write.network_access=true 2>/dev/null`               |
| Broad filesystem access               | `danger-full-access`    | `-s danger-full-access 2>/dev/null` (keep the configured approval policy)                     |
| Resume recent session                 | Current config defaults | `echo "prompt" \| codex exec resume --last 2>/dev/null` (no configuration flags)              |
| Run from another directory            | Match task needs        | `-C <DIR>` plus the task's other flags `2>/dev/null`                                          |
| Target directory is not a Git repo    | Match task needs        | add `--skip-git-repo-check` only for this case, after explaining it and getting authorization |

Every row above assumes a Git repository working root and therefore keeps
Codex's repository check enabled; only the last row adds the bypass. Add
`--approve-for-me` only when the run must proceed unattended, and reserve
`--dangerously-bypass-approvals-and-sandbox` for automation that is already
externally sandboxed — it skips both confirmation and sandboxing, so it is never
the way to grant ordinary network or broad filesystem access.

## Following Up

- After every `codex` command, immediately use `AskUserQuestion` to confirm next
  steps, collect clarifications, or decide whether to resume with
  `codex exec resume --last`.
- When resuming, pipe the new prompt via stdin:
  `echo "new prompt" | codex exec resume --last 2>/dev/null`. Keep the same
  model and reasoning effort unless the user asks otherwise, and treat the
  sandbox, approval, and repository-check policy as the current defaults rather
  than as restored from the original session.
- Restate the chosen model, reasoning effort, and sandbox mode when proposing
  follow-up actions.

## Error Handling

- Stop and report failures whenever `codex --version` or a `codex exec` command
  exits non-zero; request direction before retrying.
- Before you use high-impact flags (`--skip-git-repo-check`, `--approve-for-me`,
  `--dangerously-bypass-approvals-and-sandbox`, `-s danger-full-access`,
  `-c sandbox_workspace_write.network_access=true`) ask the user for permission
  using `AskUserQuestion` unless it was already given.
- When output includes warnings or partial results, summarize them and ask how to
  adjust using `AskUserQuestion`.
