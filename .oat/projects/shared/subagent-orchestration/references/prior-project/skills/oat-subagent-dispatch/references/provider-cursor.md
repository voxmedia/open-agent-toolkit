---
guidance_version: 2026-07-22
last_verified: 2026-07-22
review_after: 2026-09-04
catalog_basis: user-supplied Cursor snapshot plus current Cursor documentation
---

# Cursor Dispatch Mechanics

Load this reference only when the active provider is Cursor. Cursor IDE, CLI,
and SDK are related but distinct dispatch contexts. Model-selection policy for
this provider lives in `subagent-orchestration/references/provider-cursor.md`;
read it first. Treat every observed catalog as a volatile snapshot, never a
durable inventory.

## Control Surfaces

| Source                       | Establishes                                                  | Does not establish                                           |
| ---------------------------- | ------------------------------------------------------------ | ------------------------------------------------------------ |
| Native Task/Subagent schema  | Agent types and model choices for that dispatcher invocation | CLI or SDK account eligibility; another dispatcher's catalog |
| `cursor-agent --list-models` | Opaque model IDs accepted by that CLI account and resolver   | Native Task eligibility or definition-pin acceptance         |
| Cursor SDK catalog/schema    | Models accepted by that SDK context                          | IDE or nested-native eligibility                             |
| Cursor UI role configuration | User-selected defaults and role settings                     | Live root or nested schema without a new observation         |

Root and nested catalogs are independent, volatile observations. Equality in
one run does not establish equality in another run or nesting boundary.

Record the model selector and the service tier separately even when Cursor
encodes both in one opaque alias.

## Outer Lifecycle Native Selection

Outer lifecycle implementer and reviewer dispatch uses the exact
`providers.cursor.dispatchArgs.variant` returned by the lifecycle resolver.
The resolver maps an opaque flat model ID and owns the bracket-form model pin
inside the materialized definition; skills never parse, normalize, or
reconstruct either model string.

1. Require a non-empty resolver-returned variant for managed dispatch.
2. Launch that exact native agent type first.
3. Treat native launch acceptance plus the complete launcher payload as
   configured-invocation evidence, not observed runtime model identity.
4. Permit a replacement route only after a recorded pre-start native
   role-selection rejection of that exact variant, before any child starts.
5. After acceptance, continue only through the existing handle. Timeout,
   interruption, `BLOCKED`, missing telemetry, or self-report never authorizes
   fallback or replacement.
6. Treat an omitted variant as deliberate parent inheritance only when the
   resolver selected no managed target.
7. Record selected variant, mapped target, service tier, acceptance, outcome,
   runtime identity, and guidance version separately.

## Reviewer-Local Nested Selection

Reviewer-local recon uses `generalPurpose` with an
`exact-native-model-choice` selector. Reviewer-local reconnaissance is a
separate nested native surface. It does not use the lifecycle resolver because
no materialized lifecycle `recon` role exists.

1. Read the model choices advertised by the nested Task/Subagent dispatcher.
2. Intersect those advertised model choices with active user and repository
   model-class instructions, the selection reference, the supplied
   policy/ceiling, and the requested `model_class_floor`.
3. Use the native `generalPurpose` agent type and pass the exact model choice
   advertised by the current nested dispatcher byte-for-byte.
4. Record the selector as `model_selector` with
   `model_selector_granularity: exact-native-model-choice`.
5. Treat an omitted model as deliberate parent inheritance only for an
   unconstrained caller whose recorded policy permits inheritance. A
   class-constrained reviewer lane never omits the model.

This nested path does not call the lifecycle resolver, parse bracket-form
model pins, or reconstruct a lifecycle variant. If no exact nested selector
satisfies the floor, record `floor_satisfaction: unsatisfied` and return the
lane for caller-inline coverage without launching a weaker worker.

Do not infer Cursor IDE behavior from a headless CLI or SDK surface. Keep
bounded mechanical recon on explicit economical targets. Stronger lanes use a
floor-satisfying advertised target or remain with the primary reviewer.

## Dispatch Mode and Liveness

In an interactive Cursor session, a user message can interrupt a foreground
subagent turn. Run multi-minute implementers, fix loops, and reviewers in
background when the host provides a durable awaited handle. Headless gate
children must use an inline or synchronously awaited route and never
fire-and-forget.

The dispatch-returned agent ID addresses the background transcript:

```text
~/.cursor/projects/<encoded-cwd>/agent-transcripts/<agentId>/<agentId>.jsonl
```

Use that file's mtime and size as observable activity evidence only.

## Pre-Start CLI or SDK Routes

A deliberate CLI or SDK route is allowed only when:

- policy or current explicit authorization permits it;
- the exact selector exists in that context's catalog;
- any native mismatch and candidate set are recorded before launch;
- the prompt is self-contained and authority-bounded.

Verify current CLI or SDK help/schema. CLI or SDK completion proves configured
invocation completion, not inner native selection or runtime model identity.

## Catalog-Mismatch Advisory

Report configured candidates missing from the current catalog, nearby native
candidates, the selected route, and the exact observation boundary. Do not
remove CLI- or SDK-capable candidates solely because another native surface
cannot pin them. Do not persist an observed catalog without explicit user
choice.
