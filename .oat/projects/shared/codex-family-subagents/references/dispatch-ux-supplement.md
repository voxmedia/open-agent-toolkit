# Dispatch UX Supplemental Discovery And Design

This supplemental note captures a side-conversation about improving the human-facing `OAT Dispatch` block. It is reference material only; the main project agent should decide whether and how to fold it into the active project scope.

## Project Disposition

Decision on 2026-07-09:

- Fold the human-facing dispatch display guidance into this project as `p03-t05`.
- Keep the parseable `Dispatch:` stamp stable in this project unless a local contract requires a narrow adjustment.
- Defer a reusable machine-readable dispatch schema / formatter to backlog item `BL-260709-add-dispatch-machine-schema`.
- Use this reference as the design input for distinguishing invocation target, OAT policy, requested controls, configured defaults, and runtime confirmation.

## Discovery

The current dispatch block can read like OAT does not know what it selected:

```text
OAT Dispatch: Phase p02 fix
Dispatch policy: high
Resolved cap: xhigh
Selected effort: provider-default
Policy source: project state
Provider default effort: xhigh
Selection mode: retry-override/no-materialized-fix-target
Route level: 2
Model axis: unresolved
Effort axis: unresolved
Dispatch target: oat-phase-implementer
Dispatch stamp: Dispatch: scope=p02 action=fix role=fix producer=unknown provenance=unknown model_axis=unresolved effort_axis=unresolved dispatch_policy=high dispatch_ceiling=xhigh target=oat-phase-implementer
Rationale: user approved a narrow retry-limit override to fix the remaining p02 skill-schema blocker; resolver still returns no materialized fix variant.
```

The main UX problems:

- `Dispatch policy: high` is ambiguous. Users may read it as provider reasoning effort. Prefer `OAT Dispatch Tier: high`.
- `producer=unknown` sounds like OAT does not know what it requested. The real uncertainty is narrower: the runtime did not independently report the actual model identity.
- `model_axis=unresolved` and `effort_axis=unresolved` are useful debug states, but poor primary UX. User-facing output should say what happened: inherited, provider default, no materialized variant, or not configured.
- `Provider default effort` is too broad unless the source is shown. OAT is reading config, not proving runtime behavior.
- `Rationale` is overloaded. It currently mixes route choice, model choice, effort choice, fallback state, and user override context.
- The display should distinguish materialized roles from standard/base roles and Task-tool argument dispatch.

Current Codex behavior observed in the repo:

- OAT resolves `providerDefaultEffort` by reading `model_reasoning_effort` from repo-local `.codex/config.toml`, then user `~/.codex/config.toml`.
- If neither file contains the value, OAT reports `unknown`.
- The value is informational only for explicit inherit/default behavior or base/unpinned fallback paths. It is not an OAT ceiling and is not runtime confirmation.

Claude and Cursor can have analogous configured-default detection if OAT can read a reliable provider config surface. The same trust boundary should apply: show the configured default and source, but do not present it as runtime-confirmed identity.

## Design Direction

Separate the dispatch display into five concepts:

1. Route: what role/subagent/target OAT asked to run.
2. OAT policy: OAT's own tier, cap, and source.
3. Requested controls: the model/effort controls OAT explicitly attempted to pass.
4. Configured defaults: provider/host defaults OAT can read from config, with source.
5. Runtime confirmation: what the runtime/model independently reported, if anything.

Recommended human-facing template:

```text
OAT Dispatch: Phase p02 fix

Route:
  Target: oat-phase-implementer
  Mode: base role
  Reason: no materialized fix role matched this dispatch

OAT policy:
  OAT Dispatch Tier: high
  Ceiling: xhigh
  Source: project state

Requested controls:
  Model: inherit from runtime/provider
  Model request mechanism: base subagent role
  Model reason: base role does not encode a model
  Effort: provider default
  Effort request mechanism: base subagent role
  Effort reason: base Codex role does not encode effort

Configured defaults:
  Effort: xhigh
  Effort source: ~/.codex/config.toml

Runtime confirmation:
  Model identity: not reported
  Effort identity: not reported
  Identity confidence: route requested, runtime identity unverified
```

Use `Runtime confirmation: not reported` instead of `producer=unknown` in primary output.

Use `OAT Dispatch Tier` instead of `Dispatch policy` where the displayed value is an OAT abstraction such as `economy`, `balanced`, `high`, `frontier`, `uncapped`, or `inherit host defaults`.

Use `Configured default` for values OAT reads from provider config. Pair the value with a source path when known:

```text
Configured defaults:
  Effort: xhigh
  Effort source: ~/.codex/config.toml
```

If no config value is known:

```text
Configured defaults:
  Effort: not known to OAT
  Effort source: no configured default found
```

Only call a value `Requested` when OAT actually attempted to send or encode it. If OAT sends no explicit effort and lets the provider decide, display:

```text
Effort: provider default
```

not:

```text
Effort: xhigh
```

unless OAT explicitly requested `xhigh`.

## Reason Fields

Avoid one overloaded `Rationale` field. Prefer split reasons:

- `Route reason`: why this role/target was chosen.
- `Model reason`: why the model was explicit, inherited, encoded, defaulted, or unavailable.
- `Effort reason`: why the effort was explicit, inherited, encoded, defaulted, capped, or unavailable.

A compact display can collapse these into `Selection reason`, but debug/details mode should keep them separate.

Example:

```text
Route reason: no materialized fix role matched this dispatch
Model reason: base role does not encode a model; model is inherited from runtime/provider
Effort reason: base Codex role does not encode effort; runtime/provider default applies
```

## Request Mechanism

Indicate how OAT attempted to pass selected controls:

- `Task tool argument`
- `materialized subagent role`
- `base subagent role`
- `provider/runtime default`
- `host inherited`
- `not applicable`

Do not make "Task tool" the main selection label. OAT selected the value; the Task tool is the request mechanism.

Example:

```text
Requested controls:
  Model: gpt-5.6-terra
  Model request mechanism: Task tool argument
  Effort: xhigh
  Effort request mechanism: Task tool argument
```

For materialized Codex:

```text
Requested controls:
  Model: gpt-5.6-terra
  Model request mechanism: materialized subagent role
  Effort: xhigh
  Effort request mechanism: materialized subagent role
```

## Example Displays

### Materialized Codex Role, Runtime Not Confirmed

```text
OAT Dispatch: Phase p02 implement

Route:
  Target: oat-phase-implementer-gpt-5.6-terra-high
  Mode: materialized Codex role
  Reason: high-tier implementation target has a materialized model/effort role

OAT policy:
  OAT Dispatch Tier: high
  Ceiling: xhigh
  Source: project state

Requested controls:
  Model: gpt-5.6-terra
  Model request mechanism: materialized subagent role
  Effort: high
  Effort request mechanism: materialized subagent role

Configured defaults:
  Not used for this dispatch

Runtime confirmation:
  Model identity: not reported
  Effort identity: not reported
  Identity confidence: materialized target requested, runtime identity unverified
```

### Standard Codex Base Role Fallback

```text
OAT Dispatch: Phase p03 fix

Route:
  Target: oat-phase-implementer
  Mode: base role
  Reason: no materialized fix role matched this dispatch

OAT policy:
  OAT Dispatch Tier: high
  Ceiling: xhigh
  Source: project state

Requested controls:
  Model: inherit from runtime/provider
  Model request mechanism: base subagent role
  Effort: provider default
  Effort request mechanism: base subagent role

Configured defaults:
  Effort: xhigh
  Effort source: ~/.codex/config.toml

Runtime confirmation:
  Model identity: not reported
  Effort identity: not reported
  Identity confidence: requested route known, model and effort inherited/defaulted
```

### Task Tool Model Argument

```text
OAT Dispatch: Phase p04 review

Route:
  Target: oat-reviewer
  Mode: standard role with explicit model argument
  Reason: provider supports model selection through Task dispatch

OAT policy:
  OAT Dispatch Tier: high
  Ceiling: opus
  Source: shared config

Requested controls:
  Model: opus
  Model request mechanism: Task tool argument
  Model reason: OAT Dispatch Tier high maps to Claude opus
  Effort: not applicable

Configured defaults:
  Model: sonnet
  Model source: ~/.claude/settings.json
  Default use: bypassed by explicit model request

Runtime confirmation:
  Model identity: not reported
  Identity confidence: explicit model argument sent, runtime identity unverified
```

### Inherit Host Defaults

```text
OAT Dispatch: Lightweight exploration

Route:
  Target: oat-researcher
  Mode: standard role
  Reason: user selected inherit host defaults

OAT policy:
  OAT Dispatch Tier: inherit host defaults
  Ceiling: none
  Source: user config

Requested controls:
  Model: inherit from runtime/provider
  Model request mechanism: host inherited
  Effort: provider default
  Effort request mechanism: provider/runtime default

Configured defaults:
  Model: cursor-small
  Model source: ~/.cursor/config.json
  Effort: not known to OAT

Runtime confirmation:
  Model identity: not reported
  Effort identity: not reported
  Identity confidence: host defaults expected, runtime identity unverified
```

### Managed Uncapped Explicit Request

```text
OAT Dispatch: User override

Route:
  Target: oat-phase-implementer-gpt-5.6-sol-xhigh
  Mode: materialized Codex role
  Reason: user requested uncapped dispatch for this phase

OAT policy:
  OAT Dispatch Tier: uncapped
  Ceiling: none
  Source: explicit override

Requested controls:
  Model: gpt-5.6-sol
  Model request mechanism: materialized subagent role
  Effort: xhigh
  Effort request mechanism: materialized subagent role

Configured defaults:
  Not used for this dispatch

Runtime confirmation:
  Model identity: not reported
  Effort identity: not reported
  Identity confidence: explicit request made, runtime identity unverified
```

## Suggested Machine Schema

A machine-friendly shape should avoid overloading `producer`:

```json
{
  "route": {
    "target": "oat-phase-implementer",
    "mode": "base-role",
    "reason": "no-materialized-fix-role"
  },
  "oatPolicy": {
    "tier": "high",
    "ceiling": "xhigh",
    "source": "project-state"
  },
  "requestedControls": {
    "model": {
      "value": "inherit",
      "mechanism": "base-subagent-role",
      "reason": "base-role-does-not-encode-model"
    },
    "effort": {
      "value": "provider-default",
      "mechanism": "base-subagent-role",
      "reason": "base-role-does-not-encode-effort"
    }
  },
  "configuredDefaults": {
    "model": null,
    "modelSource": null,
    "effort": "xhigh",
    "effortSource": "~/.codex/config.toml"
  },
  "runtimeConfirmation": {
    "modelIdentity": "not-reported",
    "effortIdentity": "not-reported",
    "identityConfidence": "route-requested-runtime-unverified"
  }
}
```

If `producer` remains in an internal/debug stamp, define it narrowly as observed runtime identity only. Do not use it for requested model or configured default. In primary logs, prefer `Runtime confirmation` and `Identity confidence`.

## Recommended Summary

The primary dispatch output should answer:

1. What did OAT route to?
2. What OAT tier/cap drove the decision?
3. What model/effort controls did OAT explicitly request?
4. If OAT relied on defaults, what configured defaults can it see and from where?
5. Did the runtime confirm actual identity?
6. Why was this route/model/effort path chosen?

The debug stamp can keep compact parseable fields, but the human-facing display should not lead with `unknown` or `unresolved` when the more accurate statement is "not reported", "inherited", "provider default", or "no materialized variant matched".
