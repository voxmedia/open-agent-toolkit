---
title: Dispatch Policy
description: 'How OAT dispatch policy works: managed tiers, dispatch matrix cells, ordered routes, producer provenance, legacy compatibility, and provider-specific enforcement.'
---

# Dispatch Policy

OAT dispatch policy controls how `oat-project-implement` selects model or
effort controls for phase implementers, fix loops, and reviewers. The current
contract separates two ideas that used to be conflated:

- **Managed policies** keep OAT responsible for selecting model/effort controls.
- **Inherit Host Defaults** tells OAT not to select model/effort controls and to
  let the executing host/provider decide.

The CLI command is still named `oat project dispatch-ceiling resolve` for
compatibility, and legacy `workflow.dispatchCeiling.*` / `oat_dispatch_ceiling`
state is still readable as capped managed input. New configuration should use
dispatch policy terminology.

For raw config keys see [Configuration](../../cli-utilities/configuration.md);
for execution-time behavior see [Implementation Execution](implementation-execution.md).

Multi-family providers such as Cursor use the same abstract policy names, but
their concrete model values come from a dispatch matrix under
`workflow.dispatchCeiling.providers.*`. A matrix cell can be a single value, a
per-tier value, or an ordered route for escalation.

## Policy Choices

| Policy                  | Mode    | Codex cap | Claude target | Meaning                                      |
| ----------------------- | ------- | --------- | ------------- | -------------------------------------------- |
| `Economy`               | managed | `medium`  | `sonnet`      | Lower-cost managed cap                       |
| `Balanced`              | managed | `high`    | `sonnet`      | Default managed cap                          |
| `High`                  | managed | `xhigh`   | `opus`        | High-capability managed cap                  |
| `Frontier`              | managed | `xhigh`   | `fable`       | Top managed tier currently exposed by OAT    |
| `Uncapped`              | managed | none      | none          | OAT selects preferred controls without a cap |
| `Inherit Host Defaults` | inherit | none      | none          | OAT does not select model/effort controls    |

`Uncapped` is explicit managed state. It is not represented by omitting policy
state. Existing projects with absent legacy ceiling state remain unresolved or
legacy-compatible; they do not silently become managed `Uncapped`. `Unresolved`
is a deferral state for planning/preflight only. Implementation preflight must
resolve a managed policy or inherit/default mode before work starts.

## Config Shapes

Preferred managed policy config:

```bash
oat config set workflow.dispatchPolicy.policy balanced --shared
oat config set workflow.dispatchPolicy.policy frontier --shared
oat config set workflow.dispatchPolicy.policy uncapped --shared
```

`workflow.dispatchPolicy.policy` writes `workflow.dispatchPolicy.mode=managed`.
To request host defaults:

```bash
oat config set workflow.dispatchPolicy.mode inherit --shared
```

Project state uses the same shape:

```yaml
oat_dispatch_policy:
  mode: managed
  policy: balanced
  providers:
    codex: high
    claude: sonnet
  source: project-state
```

For `Uncapped`, omit provider caps:

```yaml
oat_dispatch_policy:
  mode: managed
  policy: uncapped
  source: project-state
```

For host defaults:

```yaml
oat_dispatch_policy:
  mode: inherit
  source: project-state
```

Legacy compatibility keys remain readable:

- `workflow.dispatchCeiling.preset`
- `workflow.dispatchCeiling.providers.<provider>`
- `workflow.dispatchCeiling.providers.<provider>.<tier>`
- `oat_dispatch_ceiling`

Legacy preset names map into the managed ladder: `cost-conscious` maps to
`Economy`, `balanced` maps to `Balanced`, and `maximum` maps to `High`.

## Dispatch Matrix

The dispatch matrix maps the abstract policy rung (`economy`, `balanced`,
`high`, `frontier`) to concrete provider controls. Existing bare Codex and
Claude values remain valid, and multi-family providers can use tier cells:

```bash
oat config adopt dispatch-matrix --shared
oat config set workflow.dispatchCeiling.providers.cursor.balanced composer-2.5 --shared
oat config set workflow.dispatchCeiling.providers.cursor.high gpt-5.5-xhigh --shared
```

For ordered escalation, write a route in config JSON. The resolver selects the
floor entry at escalation level `0` and advances by route entry when the
implementation/fix loop escalates:

```json
{
  "workflow": {
    "dispatchCeiling": {
      "providers": {
        "cursor": {
          "high": [
            "composer-2.5",
            { "harness": "cursor", "model": "gpt-5.5-xhigh" }
          ],
          "frontier": [
            { "harness": "cursor", "model": "gpt-5.5-xhigh" },
            { "harness": "cursor", "model": "fable-5" }
          ]
        }
      }
    }
  }
}
```

Project `state.md` may carry only sparse project-specific matrix overrides
under `oat_dispatch_policy.matrix`. The full reusable matrix belongs in user,
shared, or local config so switching harnesses mid-project re-resolves the same
abstract policy through the active provider column.

## How Resolution Works

Before dispatching a subagent, the orchestrator calls:

```bash
oat project dispatch-ceiling resolve --provider <provider> --role <implementer|reviewer> --json
```

For implementer or fix dispatch, pass the preferred runtime control:

```bash
oat project dispatch-ceiling resolve --provider codex --role implementer --preferred high --json
oat project dispatch-ceiling resolve --provider claude --role implementer --preferred opus --json
oat project dispatch-ceiling resolve --provider cursor --role implementer --preferred high --escalation-level 0 --json
```

The resolver returns the resolved policy, optional cap, source, provider default
effort where applicable, and provider-specific `dispatchArgs`.

Selection modes:

- `capped` - implementer/fix dispatch selects `min(preferred, cap)`.
- `uncapped` - implementer/fix dispatch selects the preferred value.
- `matrix-pinned` - a matrix cell supplied the selected provider value.
- `prompt-persisted` - an interactive prompt filled a missing cell and persisted it.
- `escalation-target` - an ordered route entry supplied the selected target.
- `review-target` - reviewer dispatch targets a configured cap when one exists.
- `no-review-target` - managed uncapped reviewer dispatch has no configured
  target and falls back to the base/unpinned reviewer.
- `inherit-default` - OAT returns no dispatch args and leaves controls to the host.
- `unresolved` - non-interactive implementation blocks before work starts.

## Provider Behavior

|                   | Codex                                                 | Claude Code                             | Cursor / model-arg providers | Unsupported provider |
| ----------------- | ----------------------------------------------------- | --------------------------------------- | ---------------------------- | -------------------- |
| Managed mechanism | Materialized roles with explicit `model` and `effort` | Task `model` argument                   | Task/CLI `model` argument    | None                 |
| Axis              | model plus effort (`low < medium < high < xhigh`)     | model (`haiku < sonnet < opus < fable`) | opaque model slug            | None                 |
| Capped policy     | materialized target selected up to cap                | selected Task model up to cap           | selected matrix cell         | advisory/unsupported |
| Uncapped          | preferred materialized target, no cap                 | preferred Task model, no cap            | preferred matrix cell        | advisory/unsupported |
| Inherit/default   | base/unpinned role follows provider default           | omit `model`                            | omit model selection         | normal behavior      |

Codex uses materialized roles because per-call model/effort controls were
unreliable in dogfooding. The resolver compiles an explicit model+effort target
into a role name such as `oat-phase-implementer-gpt-5-6-terra-xhigh`, and the
Codex spawn payload uses that role as `agent_type`. For managed `Uncapped`, OAT
still selects the preferred materialized target. If the Codex preferred value is
an effort rather than a matrix tier, OAT looks up the highest managed tier that
compiles to that effort before resolving the matrix target; for example,
`--preferred xhigh` resolves through the `frontier` matrix cell. The dispatching
host should verify whether upward effort selection is actually honored in the
current session. The old effort-only Codex pins are not the managed dispatch
contract for new projects.

Claude Code uses the per-call Task `model` argument. It has no OAT-managed
per-dispatch effort axis, so dispatch logs use `effort_axis=not-applicable`.
`Frontier` maps to Claude `fable`.

Cursor and other model-arg providers use matrix values as opaque slugs. OAT
validates availability with provider oracles when possible, but tier semantics
come from the configured matrix, not from a built-in model catalog. For Cursor,
that validation checks subagent Task eligibility, not just broad catalog
visibility, because a slug can appear in `cursor-agent models` and still be
rejected for subagent dispatch.

## Producer Provenance

Dispatch notes use a parseable single-line stamp so later gates can identify
the producer family:

```text
Dispatch: scope=p06 action=implementation role=implementer producer=gpt-5.5-xhigh provenance=declared model_axis=selected:gpt-5.5-xhigh effort_axis=not-applicable dispatch_policy=high dispatch_ceiling=xhigh target=cursor
```

`producer` is the resolved model slug when OAT knows it, otherwise `unknown`.
`provenance` is one of `declared`, `observed`, `inferred`, or `unknown`.
Concrete same-harness model arguments can be declared. Codex materialized
model+effort roles declare `model_axis=selected:<model>` and
`effort_axis=selected:<effort>` from resolver output, but producer identity
remains `unknown` unless an observed or inferred model identity is available.

## Implementer, Fix, and Reviewer Behavior

For implementer and fix dispatches:

- Capped managed policies select `min(preferred, cap)`.
- Managed `Uncapped` selects the preferred value without a cap.
- Inherit/default mode returns no model/effort dispatch args.

For reviewer dispatches:

- Capped managed policies target the configured cap for deterministic review
  quality gates.
- Managed `Uncapped` has no reviewer cap, so OAT uses the base/unpinned reviewer
  fallback and logs provider-default behavior.
- Inherit/default mode also uses the base/unpinned reviewer fallback.

Generic sidecars such as `explorer` are outside the implementer/reviewer/fix
contract. If their payload does not pin a reliable provider control, logs should
say `provider-default`.

## Dispatch Logs

Examples:

```text
Dispatch policy: balanced; selected=high; cap=high (codex, enforced — variant oat-phase-implementer-gpt-5-6-terra-high)
Dispatch policy: high; selected=xhigh; cap=xhigh (codex, enforced — variant oat-reviewer-gpt-5-6-terra-xhigh)
Dispatch policy: uncapped; selected=xhigh; cap=none (codex, enforced — variant oat-phase-implementer-gpt-5-6-sol-xhigh)
Dispatch policy: inherit host defaults; selected=none; cap=none (codex, advisory — base role follows provider default)
Dispatch policy: frontier; selected=fable; cap=fable (claude, enforced — Task model arg)
```

OAT logs `enforced` only when the provider accepted the requested control.
Above-orchestrator Claude upgrade requests may require post-dispatch
verification. Unsupported providers do not block; OAT records the policy as
advisory/unsupported and dispatch follows provider behavior.
