# Claude Subagent Dispatch

Load this reference only when the active provider is Claude. Current
user-level or repository instructions override model examples in this file.

## Control Surfaces

| Surface           | Controls                                   | Qualification                                          |
| ----------------- | ------------------------------------------ | ------------------------------------------------------ |
| Native agent tool | Agent type plus optional model             | Effort may not be exposed on this surface.             |
| Agent definition  | Default model in frontmatter               | Between explicit call selection and inheritance.       |
| Workflow agent    | Agent type, model, and effort when exposed | Use only controls present in the live schema.          |
| `claude -p`       | Alias or full model ID plus CLI effort     | Verify current CLI help before constructing a route.   |
| Continuation      | Existing child handle through message send | Preserves context; a new launch creates another child. |

Native model resolution commonly follows explicit call model, agent-definition
model, then parent/session inheritance. Treat omission as a deliberate
inheritance selection. Never omit a worker model when inheritance is not the
recorded policy.

## Native Topology

Use economical workers for bounded reconnaissance and stronger workers for
context-heavy dossiers or subtle decisions. Keep cross-dossier synthesis and
user dialogue in the root caller. A dossier lead may coordinate bounded recon
only when the live host supports nesting and the caller declared it.

The current nested model enum may be visible before selection while nested
agent types become visible later. Read what the dispatcher exposes, use only a
known role from the active contract when a pre-call role list is unavailable,
and record visibility timing. Do not launch a diagnostic child solely to
satisfy a universal catalog rule.

## Surface-Aware Selection

- Select an exact accepted alias from the native enum for native dispatch.
- Select a CLI route before launch when a full model ID or explicit effort is
  required and native controls cannot express it.
- Record selector granularity such as `tier-alias` or `exact-model-id`.
- Record native effort as `not-exposed`, not globally `not-applicable`.
- Keep acceptance, outcome, runtime identity, and continuation separate.

Verify current `claude --help` before using a CLI route. Preserve the caller's
authority and construct a self-contained bounded prompt.

## Dispatch Mode and Liveness

The background-wait ceiling hazard applies only to Claude print mode
(`claude -p`). Print-mode background children are terminated after
`CLAUDE_CODE_PRINT_BG_WAIT_CEILING_MS` (600 seconds by default). Interactive
Claude Code sessions are unaffected. Print mode is reachable in autonomous
and headless invocations outside gates as well as through gate exec targets, so
do not choose an unawaitable background route there. In gate contexts, defer to
the headless inline/synchronously-awaited route contract rather than
duplicating its decision.

Nested Claude subagent transcripts live below the parent session:

```text
~/.claude/projects/<encoded-cwd>/<parent-session-id>/subagents/agent-<id>.jsonl
```

For a silent awaited child, use that specific file's mtime and size as
observable activity evidence only. Metadata change is not a health verdict and
does not alter acceptance or recovery policy.
