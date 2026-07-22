---
guidance_version: 2026-07-22
last_verified: 2026-07-22
review_after: 2026-09-04
---

# Codex Dispatch Mechanics

Load this reference only when the active provider is Codex or a direct OpenAI
API route. Model-selection policy for this provider lives in
`subagent-orchestration/references/provider-codex.md`; read it first.

## Independent Controls

Codex or the OpenAI API may expose independent controls for:

- registered agent type;
- exact model and `reasoning.effort`;
- `reasoning.mode`, including `pro` where supported;
- service tier and forked context;
- maximum nesting depth;
- sandbox and scoped writable roots.

A materialized role may package defaults, but preserve role, model, effort,
reasoning mode, service tier, fork behavior, and authority separately.

## Native Topology

When subagents are available, keep judgment in the root caller and delegate
bounded volume. A dossier lead may dispatch its own recon workers only when the
effective nesting depth permits it and the caller declared that topology.

Before a write-capable launch, verify the minimum scoped writable roots needed
for the task, shared Git metadata, and managed output. Native nesting does not
grant filesystem authority.

## Exact Native Selection

1. Read live registered roles and model, effort, service-tier, and reasoning-mode selectors.
2. Read effective depth and sandbox configuration.
3. Resolve one configured candidate allowed by policy and ceiling.
4. Use the exact registered role as `agent_type` only when guaranteed by the live host.
5. Use the fork mode allowed by the live schema for explicit overrides.
6. Record materialized configuration and live schema as distinct sources.
7. Record the provider-guidance version and freshness state.

Do not escalate merely because many files must be searched. Escalate when
silent-miss risk, dispersed-context reconciliation, ambiguity, consequence, or
adversarial analysis requires it.

## Acceptance and Liveness

Native spawn acceptance is configured-invocation evidence. Missing runtime
model identity does not invalidate an accepted configured payload.

Only an actual role-selection rejection before child start permits another
recorded route. Timeout, interruption, `BLOCKED`, or task failure after
acceptance does not.

Each native Codex subagent gets a separate rollout:

```text
~/.codex/sessions/<YYYY>/<MM>/<DD>/rollout-<start-timestamp>-<child-thread-id>.jsonl
```

The child's `session_meta` carries `parent_thread_id`; the root rollout carries
the corresponding dispatch, steering, and result records. Resolve the child's
rollout from the child's spawn date. Use file mtime and size only as observable
activity evidence, never as a health verdict.

## CLI Route

When native dispatch cannot express the complete target and the route is
selected before launch, verify current `codex exec --help` and construct a
self-contained invocation. A typical read-only shape is:

```sh
codex exec \
  --ephemeral \
  --sandbox read-only \
  --model '<model>' \
  -c 'model_reasoning_effort="<effort>"' \
  '<self-contained bounded prompt>'
```

Add a service tier or reasoning mode only through controls shown by the current
CLI/schema. Honor the caller's authorization boundary. Record every selector
as configured invocation evidence; do not infer runtime identity from process
success alone.
