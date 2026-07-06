---
oat_status: complete
oat_ready_for: null
oat_blockers: []
oat_last_updated: 2026-07-05
oat_generated: false
oat_template: false
oat_template_name: design
---

# Design: model-dispatch-improvements

## Overview

This project revises OAT dispatch policy from a ceiling-only model into an explicit dispatch-selection contract. The key change is separating managed OAT selection from host/default inheritance: managed policies let OAT choose preferred model or effort per implementer/fix dispatch, with optional caps, while host-default mode leaves all model/effort behavior to the executing harness.

The managed policy ladder is `Economy`, `Balanced`, `High`, `Frontier`, plus `Uncapped`. `Economy` through `Frontier` define explicit maximum capability targets; `Uncapped` keeps OAT-managed preferred selection and escalation but stores no maximum cap. `Inherit Host Defaults` is separate and means OAT does not pin model or effort for implementation, fix, or review dispatch.

Provider behavior remains mechanism-specific but should be represented through one resolver contract. Codex continues using pinned effort variants. Claude continues using the Task `model` argument and leaves effort at model defaults. The implementation must preserve migration safety: existing absent ceiling state should not silently become managed uncapped behavior.

## Architecture

The dispatch policy architecture should have three layers.

First, persisted policy state records the user's intent. Managed policies include explicit capped tiers (`Economy`, `Balanced`, `High`, `Frontier`) and explicit uncapped managed selection (`Uncapped`). A separate inherit/default mode records that OAT should not choose dispatch controls. Existing absent state remains unresolved or legacy-compatible rather than being reinterpreted as `Uncapped`.

Second, the resolver compiles persisted intent plus runtime preferred selection into provider-specific dispatch arguments. For capped managed policies, implementer/fix dispatch selects `min(preferred, ceiling)`. For `Uncapped`, implementer/fix dispatch selects the preferred value without a cap. For inherit/default mode, the resolver returns no selected dispatch args and logs provider-default or inherited behavior. Review dispatch targets the configured policy ceiling when a capped policy exists; for `Uncapped` and inherit/default, review behavior must be explicit in logs because there is no maximum review target.

Third, provider adapters translate the selected value into concrete host controls. Codex maps effort values to pinned role variants. Claude maps model tiers to Task `model` arguments and keeps effort not applicable. Unsupported providers surface advisory or unsupported behavior without pretending OAT can enforce selection.

## Component Design

### Dispatch Policy Data Model

The policy data model owns the durable distinction between managed and inherited dispatch behavior. It should represent capped managed policies (`economy`, `balanced`, `high`, `frontier`), managed uncapped selection (`uncapped`), and inherit/default mode. It should preserve current concrete provider values for compatibility where possible, but avoid making absent configuration mean the new uncapped behavior.

### Dispatch Resolver

The resolver remains the single compilation point for runtime dispatch. It reads persisted policy, project state, role, provider, orchestrator tier, and optional preferred value. It returns the resolved mode, selected value, provider dispatch args, selection metadata, and enforcement/advisory status. The resolver should handle three managed paths: capped `min(preferred, ceiling)`, uncapped `preferred`, and review target selection for capped policies.

### Provider Adapters

Provider adapters remain responsible for translating selected values into concrete dispatch controls. Codex compiles selected effort into `oat-phase-implementer-*` or `oat-reviewer-*` variants. Claude compiles selected model into Task `model` args, including `fable` for Frontier where available. Unsupported providers return no dispatch args and must be logged honestly as advisory or unsupported.

### Lifecycle Skills and Prompts

Planning and implementation skills own user-facing policy selection and dispatch logs. They should present the clearer policy choices, persist explicit policy state, avoid saying provider defaults when managed selection is still active, and log Uncapped/Inherit behavior distinctly. Bundled docs and generated skill assets must match canonical skill behavior.

### Tests and Documentation

Tests should pin the contract across resolver behavior, prompt/persistence behavior, provider mappings, and migration compatibility. Documentation should explain managed selection, capped policies, Uncapped, Inherit Host Defaults, provider-specific enforcement, review behavior, and Claude's model-only Task dispatch.

## Data Models

The design should introduce a durable policy model that can express both managed and inherited dispatch behavior.

A conceptual shape:

```yaml
oat_dispatch_policy:
  mode: managed | inherit
  policy: economy | balanced | high | frontier | uncapped # managed only
  providers:
    codex: low | medium | high | xhigh | frontier? | uncapped?
    claude: haiku | sonnet | opus | fable | uncapped?
  source: project-state | repo-config | user-config | local-config | env
```

Implementation may adapt the exact key names to fit existing `workflow.dispatchCeiling` conventions, but it must preserve these semantics:

- capped managed policies have concrete per-provider caps
- `uncapped` is explicit and distinct from absent state
- `inherit` means OAT does not select dispatch controls
- existing `workflow.dispatchCeiling.providers.*` and `oat_dispatch_ceiling.providers.*` values remain readable as capped managed policies

## API Design

The resolver CLI remains the primary API:

```bash
oat project dispatch-ceiling resolve \
  --provider <provider> \
  --role <implementer|reviewer> \
  --preferred <value> \
  --json
```

The response should continue exposing provider-specific `dispatchArgs` and `selection`, but selection should distinguish capped, uncapped, and inherited/default behavior. For example, `selection` should make clear whether `selectedValue` came from `min(preferred, ceiling)`, from uncapped preferred selection, from a review target, or from no OAT selection.

Planning prompts should move from "dispatch ceiling" wording toward "dispatch policy" wording. The user-visible options should be:

- `Economy`
- `Balanced`
- `High`
- `Frontier`
- `Uncapped`
- `Inherit Host Defaults`

The config CLI should remain the supported way to inspect and set persisted values. Existing config keys can remain supported as compatibility aliases if implementation chooses a new canonical policy shape.

## Error Handling

Frontier selection must not imply guaranteed access. If a provider rejects or silently downgrades a Frontier request, OAT should report the request as advisory or not honored rather than logging it as enforced. Existing verify-on-dispatch behavior should be reused where possible, especially for Claude upgrade requests above the orchestrator model.

Invalid policy values should fail with clear messages that name valid values for the active provider and policy mode. Ambiguous legacy state should not be silently interpreted as `Uncapped`; interactive flows should prompt, while non-interactive flows should preserve the current unresolved/blocking behavior.

If a provider lacks a reliable mechanism for a selected policy, the resolver should return advisory or unsupported status with `dispatchArgs: null`. Logs should state that OAT could not enforce the policy rather than claiming a selected tier.

## Testing Strategy

Unit tests should cover resolver selection for capped policies, uncapped managed selection, and inherit/default behavior. Codex cases should verify preferred effort below a cap, preferred effort above a cap, uncapped preferred effort selecting a pinned variant, and inherit/default returning no pinned variant. Claude cases should verify capped model selection, uncapped preferred model selection, Frontier mapping to `fable`, inherit/default returning no Task model arg, and verify-on-upgrade behavior where applicable.

CLI/config tests should cover the new persisted policy shapes and backwards compatibility for existing `workflow.dispatchCeiling.providers.*` config and `oat_dispatch_ceiling` project state. They should explicitly assert that absent ceiling state is not silently treated as `Uncapped`.

Skill/docs validation should cover the planning and implementation prompt text, bundled asset sync, and release validation. The verification set should include targeted dispatch-ceiling tests, CLI type-check/lint, skill validation, docs build or docs-content checks as appropriate, and `pnpm release:validate` because bundled skills/docs and public package behavior are shipped surfaces.

## References

- Discovery: `discovery.md`
