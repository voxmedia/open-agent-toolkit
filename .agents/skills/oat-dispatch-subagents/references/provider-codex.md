# Codex Dispatch Mechanics

Load this reference only when the active provider is Codex or a direct OpenAI
API route. Model-selection policy for this provider lives in
`subagent-orchestration/references/provider-codex.md`; read it first.

## Independent Controls

Codex may expose independent native controls for:

- registered agent type;
- exact model and `reasoning.effort`;
- `reasoning.mode`, including `pro` where supported;
- service tier and forked context;
- maximum nesting depth;
- sandbox and scoped writable roots.

A materialized role may package defaults, but preserve role, model, effort,
reasoning mode, service tier, fork behavior, and authority as separate
configured axes.

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
4. Use the exact registered role as `agent_type` only when guaranteed by the
   live host.
5. Use the fork mode allowed by the live schema for explicit overrides.
6. Record materialized configuration and live schema as distinct sources.
7. Record the provider-guidance version and freshness state.

Prefer economical high-effort workers for narrow, independently verifiable
recon. Move to a context-heavier worker when success depends on reconciling
dispersed evidence, and to a stronger reasoning route when ambiguity,
consequence, or adversarial analysis dominates. Do not escalate merely because
many files must be searched.

## Task-Class Resolution

Apply active user and repository instructions first, then the dated class
guidance from the active provider selection reference. Intersect that guidance
with the live model/effort selectors, registered roles, supplied policy and
ceiling, and requested class floor:

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

Add a service tier or reasoning mode only through controls shown by the current
CLI/schema. Honor the caller's authorization boundary. Record every selector
as configured invocation evidence; do not infer runtime identity from process
success alone.

## Agent-Limit Rejections and v2 Residency

A native spawn rejected with `agent thread limit reached`
(`AgentLimitReached`) before any child is accepted is a pre-start
provider/dispatch outcome, not a worker failure, and not by itself evidence of
cumulative or lifetime thread exhaustion. The v2 lifecycle facts below are
cited from the openai/codex `rust-v0.159.2` tag; re-check them when the
installed Codex version changes.

- Before returning `AgentLimitReached`, v2 admission tries to unload an eligible
  resident. A resident is eligible only when it is completed, errored, or
  interrupted, has no active turn, has no pending mailbox items, and holds no
  residency lock
  ([`residency.rs` L99-L120](https://github.com/openai/codex/blob/rust-v0.159.2/codex-rs/core/src/agent/control/residency.rs#L99-L120),
  [eligibility L266-L272](https://github.com/openai/codex/blob/rust-v0.159.2/codex-rs/core/src/agent/control/residency.rs#L266-L272)).
  A visible completed status does not prove eligibility: status does not
  expose mailbox state, active-turn cleanup, or residency locks.
- The v2 toolset exposes `interrupt_agent`, which interrupts work but does not
  unregister the agent. Older toolsets expose `close_agent`
  ([`spec_plan.rs`](https://github.com/openai/codex/blob/rust-v0.159.2/codex-rs/core/src/tools/spec_plan.rs)).
  Never present `interrupt_agent` as a close or release.
- A queue-only message to a completed v2 agent can pin it by leaving a pending
  mailbox item
  ([openai/codex#32353](https://github.com/openai/codex/issues/32353)). Do not
  message completed agents to clean them up.
- Reports of completed residents blocking replacement are nondeterministic
  ([openai/codex#44351](https://github.com/openai/codex/issues/44351)), and
  older open-thread quota behavior
  ([openai/codex#22779](https://github.com/openai/codex/issues/22779)) is a
  different mechanism. Do not conflate either with v2 residency eviction.

On a pre-acceptance agent-limit rejection:

1. Keep every accepted artifact and record the exact rejection as a
   provider/dispatch outcome.
2. Inspect the available lifecycle tools and statuses. Release only completed
   agents whose output is already retained, and only through a close or release
   tool the live toolset supports; never close the root or an active required
   lane.
3. Do not archive or delete sessions to free capacity. Archive availability
   does not prove that it releases a v2 residency slot.
4. Make at most one admission retry, only when the caller's approved dispatch
   envelope allows retries and after the eligibility check above. A wait result
   or a completed status alone does not justify another attempt.
5. If admission still fails, use an alternate route only when the caller
   already approved it; otherwise stop and return the partial result for a
   concrete continuation amendment.

No retry or route changes model, effort, role behavior, data authority, output
limits, or reviewer blindness. Never rerun an accepted lane to free capacity.
