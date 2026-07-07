---
oat_status: complete
oat_ready_for: null
oat_blockers: []
oat_last_updated: 2026-07-06
oat_generated: true
oat_summary_last_task: p04-t03
oat_summary_revision_count: 0
oat_summary_includes_revisions: []
---

# Summary: model-dispatch-improvements

## Overview

This quick-mode project repaired OAT dispatch semantics after dogfooding showed
that "No ceiling" was conflating two different user intents: managed preferred
selection without a cap, and no OAT model/effort selection at all. The shipped
work introduces a dispatch policy contract that distinguishes managed caps,
managed uncapped behavior, and explicit host-default inheritance.

## What Was Implemented

- Added dispatch policy config and project-state support for `Economy`,
  `Balanced`, `High`, `Frontier`, `Uncapped`, and `Inherit Host Defaults`.
- Preserved legacy `workflow.dispatchCeiling.*` and `oat_dispatch_ceiling`
  compatibility as capped managed policy inputs, without reinterpreting absent
  state as uncapped.
- Updated the resolver so implementer/fix dispatch accepts a preferred
  effort/model and returns the selected value, selection mode, provider dispatch
  args, cap, policy source, and enforcement/advisory status.
- Added managed uncapped resolver behavior: implementer/fix dispatch selects the
  preferred target directly, while reviewer dispatch has no review target and
  falls back to the base reviewer.
- Added explicit inherit/default resolver behavior where OAT returns no selected
  dispatch args and logs provider-default or inherited behavior honestly.
- Added Claude `fable` as the Frontier model tier and kept Codex policy
  enforcement mapped to pinned effort variants.
- Updated planning, quick-start, implementation, plan-writing, templates, agent
  contracts, docs, bundled assets, and generated provider views to use the new
  policy vocabulary.
- Bumped the lockstep public package set and bundled public package version
  metadata to `0.1.41`.

## Key Decisions

- **Managed Uncapped is explicit state.** The absence of dispatch policy remains
  unresolved or legacy-compatible; it is not silently upgraded into managed
  uncapped behavior.
- **Inherit Host Defaults means no OAT selection.** This mode is the only path
  where implementation, fix, and review dispatch leave model/effort controls to
  the executing harness/provider.
- **Resolver owns preferred selection.** Implementer and fix callers pass a
  preferred effort/model to the resolver and use the resolver-returned dispatch
  args; capped policies select `min(preferred, cap)` and managed uncapped selects
  the preferred value.
- **Reviewer targets only capped policies.** Capped managed policies produce a
  deterministic reviewer target at the cap; managed uncapped and inherit/default
  reviewer paths use no-target/base-role fallback.
- **Claude remains model-axis only.** Claude Task dispatch uses the per-call
  `model` argument, including `fable` for Frontier, and keeps effort logged as
  not applicable until real usage justifies a separate effort-control model.

## Notable Challenges

- Early dogfooding exposed the original bug directly: a preferred `high`
  implementer dispatch under an `xhigh` ceiling was incorrectly treated as
  `xhigh` because the resolver was called without `--preferred`.
- Phase 1 review found that Claude `fable` had been added to config/provider
  surfaces but not the resolver's valid-value path. The resolver now uses
  canonical provider values.
- Phase 2 review found a migration-safety issue where lower-precedence new
  dispatch policy config could override higher-precedence legacy caps. The fix
  compares candidates by resolved source precedence.
- Phase 3 review found stale no-target reviewer metadata and stale lifecycle
  docs. The resolver, docs, and generated assets now use `no-review-target` and
  provider-default fallback wording where appropriate.
- Final review found unrelated project artifacts and one sidecar log example
  that still used resolver selection-mode vocabulary outside the resolver
  contract. Both were removed before final re-review passed.

## Tradeoffs Made

- The CLI command remains named `dispatch-ceiling` for compatibility, but the
  response contract is policy-aware. This avoids a broad command rename while
  letting callers move to the clearer dispatch policy model.
- Frontier is a capability-policy name, not an access guarantee. Provider
  adapters and verify-on-dispatch paths still need to report when a requested
  upgrade is advisory or not honored.
- Claude effort variants were not added. The project keeps Claude selection on
  the model axis because Task dispatch exposes a reliable `model` parameter but
  no equivalent per-call effort control.

## Integration Notes

- Codex implementer/fix dispatch must call
  `oat project dispatch-ceiling resolve --provider codex --role implementer --preferred <effort>`
  and use the returned pinned variant when one is present.
- Claude implementer/fix dispatch should call the resolver with
  `--preferred <model>` and `--orchestrator-tier <current-orchestrator-tier>` so
  upgrade verification can be surfaced accurately.
- Reviewer dispatch should use a pinned reviewer/model only for capped managed
  policies. Managed `Uncapped` and `Inherit Host Defaults` intentionally use the
  base reviewer fallback.
- Generic sidecars are outside OAT-managed implementer/reviewer/fix roles and
  should log provider-default behavior unless their actual host payload pins a
  reliable model or effort control.

## Follow-up Items

- Add Claude effort pins only if real usage shows that the gap between
  default-effort `opus` and `fable` matters enough to justify the added matrix.
- Add provider-specific entitlement detection for Frontier access only if
  verify-on-dispatch and clear downgrade/error reporting are not sufficient.
- Add future GPT 5.6 SOL-class Codex mapping only after the provider exposes a
  concrete supported value.
