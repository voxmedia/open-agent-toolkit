---
title: Dispatch Policy
description: 'How OAT dispatch policy works: managed capped tiers, managed Uncapped, Inherit Host Defaults, legacy dispatch-ceiling compatibility, and provider-specific enforcement.'
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

## Policy Choices

| Policy                  | Mode    | Codex target | Claude target | Meaning                                      |
| ----------------------- | ------- | ------------ | ------------- | -------------------------------------------- |
| `Economy`               | managed | `medium`     | `sonnet`      | Lower-cost managed cap                       |
| `Balanced`              | managed | `high`       | `sonnet`      | Default managed cap                          |
| `High`                  | managed | `xhigh`      | `opus`        | High-capability managed cap                  |
| `Frontier`              | managed | `xhigh`      | `fable`       | Top managed tier currently exposed by OAT    |
| `Uncapped`              | managed | none         | none          | OAT selects preferred controls without a cap |
| `Inherit Host Defaults` | inherit | none         | none          | OAT does not select model/effort controls    |

`Uncapped` is explicit managed state. It is not represented by omitting policy
state. Existing projects with absent legacy ceiling state remain unresolved or
legacy-compatible; they do not silently become managed `Uncapped`.

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
- `workflow.dispatchCeiling.providers.codex`
- `workflow.dispatchCeiling.providers.claude`
- `oat_dispatch_ceiling`

Legacy preset names map into the managed ladder: `cost-conscious` maps to
`Economy`, `balanced` maps to `Balanced`, and `maximum` maps to `High`.

## How Resolution Works

Before dispatching a subagent, the orchestrator calls:

```bash
oat project dispatch-ceiling resolve --provider <provider> --role <implementer|reviewer> --json
```

For implementer or fix dispatch, pass the preferred runtime control:

```bash
oat project dispatch-ceiling resolve --provider codex --role implementer --preferred high --json
oat project dispatch-ceiling resolve --provider claude --role implementer --preferred opus --json
```

The resolver returns the resolved policy, optional cap, source, provider default
effort where applicable, and provider-specific `dispatchArgs`.

Selection modes:

- `capped` - implementer/fix dispatch selects `min(preferred, cap)`.
- `uncapped` - implementer/fix dispatch selects the preferred value.
- `review-target` - reviewer dispatch targets a configured cap when one exists.
- `no-review-target` - managed uncapped reviewer dispatch has no configured
  target and falls back to the base/unpinned reviewer.
- `inherit-default` - OAT returns no dispatch args and leaves controls to the host.
- `unresolved` - non-interactive implementation blocks before work starts.

## Provider Behavior

|                   | Codex                                       | Claude Code                             | Unsupported provider |
| ----------------- | ------------------------------------------- | --------------------------------------- | -------------------- |
| Managed mechanism | Pinned role variants                        | Task `model` argument                   | None                 |
| Axis              | effort (`low < medium < high < xhigh`)      | model (`haiku < sonnet < opus < fable`) | None                 |
| Capped policy     | selected pinned variant up to cap           | selected Task model up to cap           | advisory/unsupported |
| Uncapped          | preferred pinned variant, no cap            | preferred Task model, no cap            | advisory/unsupported |
| Inherit/default   | base/unpinned role follows provider default | omit `model`                            | normal behavior      |

Codex uses pinned variants because per-call effort controls were unreliable in
dogfooding. For managed `Uncapped`, OAT still selects the preferred pinned
variant; the dispatching host should verify whether upward effort selection is
actually honored in the current session.

Claude Code uses the per-call Task `model` argument. It has no OAT-managed
per-dispatch effort axis, so dispatch logs use `effort_axis=not-applicable`.
`Frontier` maps to Claude `fable`.

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
Dispatch policy: balanced; selected=high; cap=high (codex, enforced — variant oat-phase-implementer-high)
Dispatch policy: high; selected=xhigh; cap=xhigh (codex, enforced — variant oat-reviewer-xhigh)
Dispatch policy: uncapped; selected=xhigh; cap=none (codex, enforced — variant oat-phase-implementer-xhigh)
Dispatch policy: inherit host defaults; selected=none; cap=none (codex, advisory — base role follows provider default)
Dispatch policy: frontier; selected=fable; cap=fable (claude, enforced — Task model arg)
```

OAT logs `enforced` only when the provider accepted the requested control.
Above-orchestrator Claude upgrade requests may require post-dispatch
verification. Unsupported providers do not block; OAT records the policy as
advisory/unsupported and dispatch follows provider behavior.
