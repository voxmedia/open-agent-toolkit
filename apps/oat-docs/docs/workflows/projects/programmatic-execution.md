---
title: Programmatic Execution
description: 'How OAT launches agents through provider CLI/headless surfaces — per-harness execution shapes, cross-runtime gate exec targets, credential isolation, and the launcher-owned evidence they share.'
---

# Programmatic Execution

**Programmatic execution** is launching an agent through a provider's CLI or
headless surface — a fresh child process — rather than a native same-runtime
dispatch through the harness's own subagent tool. OAT reaches for it in exactly
three places:

1. **Cross-runtime gate reviews** — a workflow gate dispatches an independent
   reviewer to a different runtime/family than the one that produced the work.
2. **Policy-resolved CLI dispatch** — a task, reviewer, or coordinator route
   that the native same-runtime catalog cannot satisfy, resolved to a provider
   CLI before launch.
3. **Operator smoke sessions** — the smoke runner drives each harness through
   its headless flavor to capture per-harness evidence.

Programmatic execution is **never an improvised fallback**. Route authorization
comes from configured dispatch policy or a configured cross-family gate
(standing, scope-bound), or from explicit user approval for the current run.
Availability of a provider CLI is capability evidence, not authorization. See
the route tiers in
[Orchestration Model](orchestration-model.md#route-tiers-and-terminality) for
how native, policy-resolved, and improvised routes are ranked, and why an
accepted launch is terminal for automatic replacement.

## Per-harness execution surfaces

Each harness exposes different controllable axes. Verify the current CLI help
before constructing any route; the shapes below are the verified skeletons, not
a fixed flag inventory. Model strings are placeholders — provider catalogs are
volatile, so never hard-code a model name as a durable fact.

| Harness    | Verified headless shape                                                                                          | Controllable axes                                                                                                      | Caveats                                                                                              |
| ---------- | ---------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------- |
| Codex      | `codex exec --ephemeral --sandbox read-only --model '<model>' -c 'model_reasoning_effort="<effort>"' '<prompt>'` | agent type, model + reasoning effort, service tier, forked context, max nesting depth, sandbox + scoped writable roots | Model and effort are separate configured axes; native nesting grants no filesystem authority         |
| Claude     | `claude -p --model '<model-alias-or-id>' '<prompt>'`                                                             | agent type, model (alias or full ID), CLI effort when exposed                                                          | No effort axis on the native Agent surface — record it as `not-exposed`, not `not-applicable`        |
| Cursor CLI | `cursor-agent --trust --print --model '<exact-opaque-model>' '<prompt>'`                                         | opaque model selector from the account catalog                                                                         | Opaque strings pass byte-for-byte; distinct flavor from Cursor IDE — do not infer one from the other |
| Cursor IDE | (native session; no headless CLI shape)                                                                          | native Task/Subagent schema, UI role configuration                                                                     | Any CLI task dispatch from an IDE root is a recorded pre-start selection                             |

Notes per harness:

- **Codex** treats registered agent type, model, reasoning effort, service
  tier, fork behavior, sandbox, and scoped writable roots as independent
  configured axes. Use the CLI route only when native dispatch cannot express
  the complete target and the route is selected before launch. Record model,
  effort, sandbox, and route as configured-invocation evidence; a successful
  process alone does not prove runtime identity.
- **Claude** has three native control surfaces — the native Agent tool (agent
  type plus optional model), agent-definition frontmatter (default model), and
  `claude -p` (alias or full model ID plus CLI effort). Model resolution follows
  explicit-call model > agent-definition model > parent/session inheritance.
  Never omit a worker model unless inheritance is the recorded policy.
- **Cursor** keeps three control surfaces that must not be conflated: the native
  Task/Subagent schema, the account CLI catalog (`cursor-agent --list-models`),
  and Cursor UI role configuration. IDE and CLI are separate harness contexts;
  an observed catalog is a volatile snapshot, and equality in one run does not
  establish equality in another run or nesting boundary. Opaque model selectors
  are passed byte-for-byte.

## Cross-runtime gate execution

Workflow gates use programmatic execution to run a producer-independent
reviewer. `oat gate cross-provider-exec` (and the review-specific
`oat gate review`) choose from `workflow.gates.execTargets` — targets keyed by
opaque id with a declared runtime, argv `baseCommand`, priority, and optional
`models` list. OAT does not infer provider semantics from the target id.

Gate dispatch defaults to `--avoid same-family`: it detects the current runtime
via host-detection commands and picks the highest-priority available non-host,
different-family target. This **host-avoidance** is why gate targets are
independent of the harness's native subagent catalog — the point of a gate is a
route the producing context could not have selected for itself. The
lifecycle/final gate is the one flavor that may spawn a **nested managed
reviewer child inside the gate exec target**; see
[Review Flavors](review-flavors.md) for which flavor fires when and how
independent each must be.

Gates **fail closed**. If no different-family target is available, OAT records
the degraded achieved level rather than pretending diversity was achieved, and
an unavailable required-independent target blocks the gate instead of quietly
downgrading to a same-context self-review. Only summarize the execution-surface
angle here — see [Workflow Gates](../../cli-utilities/workflow-gates.md) for the
gate envelope, exec-target configuration, receive-eligibility, and completion
contract. The cross-runtime `gates.execTargets` design (host-avoidance and
independence from native catalogs) is the smoke fixture's cross-runtime gate
leg.

## Credential isolation

Some gate and smoke routes must launch a Cursor child while the driving process
is a sandboxed Codex process whose tool shells redact provider credentials. OAT
resolves this with a **runner-owned mailbox broker** rather than by threading
the secret through the child.

The disposable local gate target invokes only a committed worktree-mailbox
client; the parent broker — outside the sandbox — is what launches
`cursor-agent` with the retained key. Operator handoffs wrap Codex in the same
broker launcher. The rule is absolute: the `CURSOR_API_KEY` value must never
enter config, manifests, the mailbox, logs, prompts, or evidence. This keeps
the secret out of every sandboxed child process and every durable artifact while
still allowing a cross-runtime launch. (Conceptual only; the broker mechanics
live with the smoke runner contract.)

## Evidence

Every programmatic launch produces the **same launcher-owned dispatch record**
as a native dispatch: the selected route, exact target/model/effort axes,
selection reason, ordered candidates considered, and launch acceptance. Because
the launcher constructs the payload itself, this evidence does not depend on any
child cooperation. Runtime-observed identity is optional corroboration —
recorded as `reported` or `not-reported`, and its absence never invalidates the
configured-invocation record. See [Evidence Layers](evidence-layers.md) for the
three-layer model and how assertions bind to the launcher-owned layer.

Where relevant to a run: Claude coordinator→worker nesting and Cursor CLI
task-event observability are **validated per run by live smoke evidence**, not
asserted here as settled facts.

## Related

- [Orchestration Model](orchestration-model.md) — route tiers, native-first
  selection, and per-harness topology.
- [Review Flavors](review-flavors.md) — the four review flavors and which one
  may spawn a nested managed reviewer inside a gate.
- [Evidence Layers](evidence-layers.md) — the three-layer dispatch evidence
  model these launches feed.
- [Dispatch Policy](dispatch-ceiling.md) — candidate ladders, named ceilings,
  and the dispatch report.
- [Workflow Gates](../../cli-utilities/workflow-gates.md) — gate envelope,
  exec-target configuration, and completion contract.
- [Smoke Testing](../../contributing/smoke-testing.md) — per-harness drive
  protocols and live evidence.
