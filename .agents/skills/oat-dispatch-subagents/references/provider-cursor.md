# Cursor Subagent Dispatch

Load this reference only when the active provider is Cursor. Cursor IDE and
Cursor CLI are separate harness contexts. Treat every observed catalog as a
volatile snapshot, never a durable inventory.

## Control Surfaces

| Source                       | Establishes                                                    | Does not establish                                             |
| ---------------------------- | -------------------------------------------------------------- | -------------------------------------------------------------- |
| Native Task/Subagent schema  | Agent types available for that dispatcher invocation           | CLI account eligibility or another dispatcher's native catalog |
| `cursor-agent --list-models` | Opaque flat model IDs accepted by the account CLI and resolver | Native Task eligibility or definition-pin acceptance           |
| Cursor UI role configuration | User-selected defaults and role settings                       | Live root or nested schema without a new observation           |

Root and nested catalogs are independent, volatile observations. Equality in
one run does not establish equality in another run or nesting boundary.

## Task-Class Resolution

Apply active user and repository instructions first; they override the dated
model-family examples in this provider reference. Intersect that guidance with
the exact model choices advertised by the dispatcher, the supplied policy and
ceiling, and the requested class floor:

- `mechanical-recon`: the fastest economical class suitable for deterministic
  inventories, parity, and command execution;
- `intelligent-recon`: a stronger fast class for interpretation,
  unfamiliar-code auditing, and silent-miss-prone evidence;
- `default-implementation`: a context-retentive implementation class for an
  independently bounded dossier;
- `hard-reasoning`: a strong reasoning class for ambiguity or architecture;
- `consequential`: the strongest allowed class for security, release safety,
  irreversible impact, or expensive failure.

A stale or unavailable example requires a newer eligible model meeting the
same class floor or a route one class up. Selection below the floor is
prohibited.

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
7. Record selected variant, mapped target, acceptance, outcome, and runtime
   identity separately.

## Reviewer-Local Nested Selection

Reviewer-local recon uses `generalPurpose` with an
`exact-native-model-choice` selector.
Reviewer-local reconnaissance is a separate nested native surface. It does not
use the lifecycle resolver because no materialized lifecycle `recon` role
exists.

1. Read the model choices advertised by the nested Task/Subagent dispatcher.
2. Intersect those advertised model choices with active user and repository
   model-class instructions, this provider reference, the supplied
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

Do not infer Cursor IDE behavior from a headless CLI surface. Keep bounded
mechanical recon on economical explicit targets. Stronger lanes use a
floor-satisfying target when advertised or stay with the primary reviewer.

## Dispatch Mode and Liveness

In an interactive Cursor session, a user message can interrupt a foreground
subagent turn. Run multi-minute implementers, fix loops, and reviewers in
background when the host provides a durable awaited handle; reserve foreground
for short checks. This background preference does not apply to headless gate
children, which must follow the inline/synchronously-awaited gate route
contract and never fire-and-forget.

The dispatch-returned agent ID directly addresses that background child's
transcript:

```text
~/.cursor/projects/<encoded-cwd>/agent-transcripts/<agentId>/<agentId>.jsonl
```

This is a sibling of the main thread's transcript directory. For silent-child
liveness, stat that specific file's mtime and size rather than inferring from a
directory. Metadata change is observable activity evidence, not a health
verdict.

## Pre-Start CLI Routes

Any native mismatch is recorded before launch with the route, reason, and
candidate set.

When exact outer lifecycle role selection rejects the resolver-selected
variant before launch, or a generic caller's current native intersection is
unsatisfactory, a caller may use a deliberate pre-start CLI route only when:

- the caller's fallback policy allows it;
- the exact CLI selector exists in the account catalog;
- the native mismatch, rejected variant when applicable, route, reason, and
  candidates are recorded before launch;
- the prompt is self-contained and authority-bounded.

Verify current CLI help before use. A typical shape is:

```sh
cursor-agent \
  --trust \
  --print \
  --model '<exact-opaque-model>' \
  '<self-contained bounded prompt>'
```

CLI completion proves configured invocation completion. It does not prove an
inner native selection or runtime model identity.

## Catalog-Mismatch Advisory

Report configured candidates missing from the current native catalog, nearby
native candidates as possible ladder additions, selected route, and the exact
observation boundary. Do not remove CLI-capable candidates solely because the
native surface cannot pin them, and do not write observed catalogs into durable
configuration without explicit user choice.
