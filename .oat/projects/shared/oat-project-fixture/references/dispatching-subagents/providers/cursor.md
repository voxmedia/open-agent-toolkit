# Cursor Subagent Dispatch — Verified Reference

> **Status:** verified Phase p04 promotion input. Cursor IDE and Cursor CLI are
> separate harness flavors with different capability results. Catalog contents
> remain timestamped evidence only.

## Control Surfaces

Cursor exposes at least three non-equivalent sources:

| Source                       | Establishes                                                     | Does not establish                                             |
| ---------------------------- | --------------------------------------------------------------- | -------------------------------------------------------------- |
| Native Task/Subagent schema  | Roles and opaque model selectors for that dispatcher invocation | CLI account eligibility or another dispatcher's native catalog |
| `cursor-agent --list-models` | Opaque model selectors accepted by the account CLI              | Native Task eligibility                                        |
| Cursor UI role configuration | User-selected defaults and role settings                        | Live root or nested schema without a new observation           |

Treat IDE and headless CLI as separate flavors. The canonical runs used the
same root model family but exposed different root role/model catalogs, and the
historical execution log observed additional catalog changes within one IDE
conversation. No catalog list is durable.

## Cursor IDE Capability

The canonical IDE run confirmed:

- explicit byte-for-byte native model selection;
- omit-model parent inheritance in schema;
- separate root and nested native catalogs;
- generic depth-2 native dispatch;
- an explicit leaf result of `OAT_CURSOR_NESTED_SENTINEL_OK`;
- an independent exact-model CLI result of `OAT_CURSOR_CLI_SENTINEL_OK`;
- configured selectors and missing runtime identity as separate evidence.

The root and nested catalogs matched in that run. Earlier controlled child
contexts exposed a much narrower nested catalog, so equality in one run must
not become a universal claim.

The first CLI sentinel attempt was rejected before child start because
workspace trust was missing. After explicit operator approval, the same route,
selector, and prompt ran with `--trust`. This was a pre-start prerequisite
correction, not fallback after acceptance.

## Cursor CLI Capability

The fresh headless CLI root exposed a native `Subagent` tool and a root catalog,
but the sole generic topology connection closed mid-flight. The run recorded:

- `launchStatus: accepted`;
- `childOutcome: interrupted`;
- no structured native selection event;
- no nested catalog or leaf result;
- no replacement native route.

Native selection and nesting are therefore inconclusive for the CLI flavor.
Do not infer the IDE topology from the presence of a headless root tool.

The independent CLI child succeeded with an exact account-catalog selector:

```sh
cursor-agent \
  --trust \
  --print \
  --output-format json \
  --model '<exact-opaque-model>' \
  '<self-contained bounded prompt>'
```

The result contained the fixed sentinel and success metadata but no structured
Task-selection event or runtime model identity. Process completion proves the
explicit CLI invocation completed; it does not prove an inner Task selection.

## Selection Rules

1. Treat every Cursor selector as an opaque string.
2. Read the native model enum from the dispatcher that will launch the child.
3. Intersect configured candidates with that exact snapshot.
4. Pass a selected native string byte-for-byte.
5. Omit the model only for deliberate inheritance.
6. When the native intersection is absent or unsatisfactory, select an exact
   CLI target before launch.
7. Record the native mismatch, candidates considered, selected route, and
   reason.
8. After native or CLI acceptance, do not launch a replacement route.

## Catalog-Mismatch Advisory

When a configured target is absent from the current native catalog:

- report configured candidates that are not natively dispatchable here;
- report nearby native candidates only as possible additions;
- do not remove CLI-capable ladder entries solely because native Task cannot
  pin them;
- record whether the selected route is native, inherited, CLI, or blocked;
- keep observed catalogs out of durable configuration unless the user changes
  that configuration.

## Evidence Semantics

- Native IDE acceptance and child completion are separately observable.
- Headless native interruption remains an accepted launch with an interrupted
  outcome, not a pre-start rejection.
- Cursor CLI result records may omit Task-selection events and runtime model
  identity.
- Requested selector, launch status, child outcome, and runtime confirmation
  must remain separate.

## Open Boundaries

Phase p05 still owns:

- production coordinator/worker behavior in both flavors;
- review-ceiling and gate policy;
- UI configuration effects on native catalogs;
- write-capable execution;
- broader claims about root/nested catalog equality.

## Evidence

- [Cursor IDE canonical run](../verification/runs/cursor-ide/2026-07-11T210832Z/report.md)
- [Cursor CLI canonical run](../verification/runs/cursor-cli/2026-07-11T212201Z/report.md)
- [Historical catalog evidence](../../subagent-catalog-and-selection-findings.md)
- [Execution chronology](../../orchestration-execution-log.md)
- [Frozen input draft](../../dispatching-subagents-cursor-draft.md)
