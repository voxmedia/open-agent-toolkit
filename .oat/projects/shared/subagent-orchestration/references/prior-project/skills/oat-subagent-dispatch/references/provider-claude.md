---
guidance_version: 2026-07-22
last_verified: 2026-07-22
review_after: 2026-09-04
---

# Claude Dispatch Mechanics

Load this reference only when the active provider is Claude. Model-selection
policy for this provider lives in
`subagent-orchestration/references/provider-claude.md`; read it first.

## Control Surfaces

| Surface           | Controls                                   | Qualification                                          |
| ----------------- | ------------------------------------------ | ------------------------------------------------------ |
| Native agent tool | Agent type plus optional model             | Effort may not be exposed.                             |
| Agent definition  | Default model in frontmatter               | Between explicit call selection and inheritance.       |
| Workflow agent    | Agent type, model, and effort when exposed | Use only live-schema controls.                         |
| `claude -p`       | Alias or full model ID plus CLI effort     | Verify current CLI help.                               |
| Continuation      | Existing child handle through message send | Preserves context; a new launch creates another child. |

Native model resolution commonly follows explicit call model, agent-definition
model, then parent/session inheritance. Treat omission as deliberate
inheritance. Never omit a worker model when inheritance is not the recorded
policy.

## Native Topology

Use economical workers for bounded reconnaissance and stronger workers for
context-heavy dossiers or subtle decisions. Keep cross-dossier synthesis and
user dialogue in the root caller. A dossier lead may coordinate bounded recon
only when the live host supports nesting and the caller declared it.

The nested model enum may be visible before selection while nested agent types
become visible later. Read what the dispatcher exposes, use only a known role
from the active contract when a pre-call role list is unavailable, and record
visibility timing. Do not launch a diagnostic child solely to obtain a catalog.

## Surface-Aware Selection

- Select an exact accepted alias from the native enum for native dispatch.
- Select a CLI route before launch when an exact model or effort is required and native controls cannot express it.
- Record selector granularity such as `tier-alias` or `exact-model-id`.
- Record native effort as `not-exposed`, not globally `not-applicable`.
- Record service tier separately; fast Claude routes are latency purchases.
- Keep acceptance, outcome, runtime identity, and continuation separate.
- Record the provider-guidance version and freshness state.

Verify current `claude --help` before a CLI route. Preserve the caller's
authority and construct a self-contained bounded prompt.

## Dispatch Mode and Liveness

The background-wait ceiling hazard applies only to Claude print mode
(`claude -p`). Print-mode background children are terminated after
`CLAUDE_CODE_PRINT_BG_WAIT_CEILING_MS` (600 seconds by default). Interactive
Claude Code sessions are unaffected. Do not choose an unawaitable background
route in print mode or a headless gate.

Nested Claude subagent transcripts live below the parent session:

```text
~/.claude/projects/<encoded-cwd>/<parent-session-id>/subagents/agent-<id>.jsonl
```

For a silent awaited child, use that file's mtime and size as observable
activity evidence only. Metadata change is not a health verdict and does not
alter acceptance or recovery policy.
