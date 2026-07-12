# Cursor Subagent Dispatch

Load this reference only when the active provider is Cursor. Cursor IDE and
Cursor CLI are separate harness flavors. Treat every observed catalog as a
volatile snapshot, never a durable inventory.

## Control Surfaces

| Source                       | Establishes                                                     | Does not establish                                             |
| ---------------------------- | --------------------------------------------------------------- | -------------------------------------------------------------- |
| Native Task/Subagent schema  | Roles and opaque model selectors for that dispatcher invocation | CLI account eligibility or another dispatcher's native catalog |
| `cursor-agent --list-models` | Opaque model selectors accepted by the account CLI              | Native Task eligibility                                        |
| Cursor UI role configuration | User-selected defaults and role settings                        | Live root or nested schema without a new observation           |

Root and nested catalogs are independent, volatile observations. Equality in
one run does not establish equality in another run or nesting boundary.

## Native Selection

1. Read the native model enum from the dispatcher that will launch the child.
2. Intersect configured candidates with that exact snapshot.
3. Pass the selected opaque string byte-for-byte.
4. An omitted model means deliberate parent inheritance; omission is not a
   generic default or evidence that the target was unavailable.
5. Record requested selector, acceptance, child outcome, and runtime identity
   separately.

Generic depth-2 native dispatch is supported in Cursor IDE, but production
coordinator/worker cooperation remains live-smoke evidence. Cursor CLI native
selection and nesting remain inconclusive; do not infer IDE behavior from the
presence of a headless Subagent tool.

## Pre-start CLI Routes

When the current native intersection is absent or unsatisfactory:

- a task or fix worker may use a deliberate pre-start CLI leaf selection;
- an implementation self-review owned by a below-ceiling coordinator must use
  a coordinator-owned CLI review selection when its nested catalog cannot
  satisfy the review ceiling;
- the exact CLI selector must exist in the account CLI catalog;
- record the native mismatch, selected route, reason, and candidates
  considered before launch;
- after CLI acceptance, do not launch a replacement route.

The verified CLI shape is:

```sh
cursor-agent \
  --trust \
  --print \
  --model '<exact-opaque-model>' \
  '<self-contained bounded prompt>'
```

CLI completion proves that configured invocation completed. It does not prove
an inner Task selection or runtime model identity.

## Catalog-mismatch Advisory

When configured candidates are absent from the current native catalog, report:

- configured candidates that are not natively dispatchable in this context;
- nearby native candidates as possible additions to the ladder;
- which route was selected: native, inherited, provider CLI, or blocked;
- the catalog source and observation boundary.

Do not remove CLI-capable ladder entries solely because native Task cannot pin
them. Do not write observed catalogs into durable configuration unless the user
explicitly chooses an owning configuration scope.

## Evidence Boundary

Cursor capability runs verify exact native selection, deliberate inheritance,
native nesting in IDE, and exact CLI invocation. Phase p05 live smoke owns
production-role cooperation, write-capable execution, review-ceiling behavior,
and IDE-versus-CLI workflow differences.
