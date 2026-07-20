# Codex Subagent Dispatch

Load this reference only when the active provider is Codex. Current user-level
or repository instructions override model examples in this file.

## Independent Controls

Codex may expose independent native controls for:

- registered agent type;
- model and reasoning effort;
- service tier and forked context;
- maximum nesting depth;
- sandbox and scoped writable roots.

A materialized role may package defaults, but preserve role, model, effort,
service tier, fork behavior, and authority as separate configured axes.

## Native Topology

When subagents are available, keep judgment in the root caller and delegate
bounded volume. A dossier lead may dispatch its own recon workers only when the
effective nesting depth permits it and the caller declared that topology.

Before a write-capable launch, verify the minimum scoped writable roots needed
for the task, shared Git metadata, and managed output. Native nesting does not
grant filesystem authority.

## Exact Native Selection

1. Read live registered roles and model/effort selectors.
2. Read effective depth and sandbox configuration.
3. Resolve one configured candidate allowed by policy and ceiling.
4. Use the exact registered role as `agent_type` only when guaranteed by the
   live host.
5. Use the fork mode allowed by the live schema for explicit overrides.
6. Record materialized configuration and live schema as distinct sources.

Prefer economical high-effort workers for narrow, independently verifiable
recon. Move to a context-heavier worker when success depends on reconciling
dispersed evidence, and to a stronger reasoning route when ambiguity,
consequence, or adversarial analysis dominates. Do not escalate merely because
many files must be searched.

## Task-Class Resolution

Apply active user and repository instructions first; they override the dated
model-family examples in this provider reference. Intersect that guidance with
the live model/effort selectors, registered roles, supplied policy and ceiling,
and requested class floor:

- `mechanical-recon`: an economical class and effort suitable for
  deterministic inventories, parity, and command execution;
- `intelligent-recon`: a stronger fast class for interpretation,
  unfamiliar-code auditing, and silent-miss-prone evidence;
- `default-implementation`: a context-retentive implementation class for an
  independently bounded dossier;
- `hard-reasoning`: a strong reasoning class for ambiguity or architecture;
- `consequential`: the strongest allowed class for security, release safety,
  irreversible impact, or expensive failure.

A stale or unavailable named example requires a newer eligible model meeting
the same class floor or a route one class up. Selection below the floor is
prohibited. Keep model and reasoning effort as separate recorded axes, and
record `floor_satisfaction`.

Native spawn acceptance is configured-invocation evidence. Missing runtime
model identity does not invalidate an accepted configured payload.

Only an actual role-selection rejection before child start permits another
recorded route. Timeout, interruption, `BLOCKED`, or task failure after
acceptance does not.

## Child Transcript Liveness

Each native Codex subagent gets a separate rollout:

```text
~/.codex/sessions/<YYYY>/<MM>/<DD>/rollout-<start-timestamp>-<child-thread-id>.jsonl
```

The child's `session_meta` carries `parent_thread_id`; the root rollout carries
the corresponding dispatch, steering, and result records. Because the
dispatcher knows the child thread ID at launch, resolve the child's own rollout
and inspect only its filesystem mtime and size for observable liveness
evidence. Rollouts shard by session start date: a fresh child of a long-lived
root can be in a different date directory, so resolve from the child's spawn
date, never the parent's. Metadata change is not a health verdict.

## CLI Route

When native dispatch cannot express the complete target and the route is
selected before launch, use current `codex exec --help` to construct a
self-contained invocation. A typical read-only shape is:

```sh
codex exec \
  --ephemeral \
  --sandbox read-only \
  --model '<model>' \
  -c 'model_reasoning_effort="<effort>"' \
  '<self-contained bounded prompt>'
```

Honor the caller's authorization boundary. Record model, effort, sandbox, and
route as configured invocation evidence; do not infer runtime identity from a
successful process alone.
