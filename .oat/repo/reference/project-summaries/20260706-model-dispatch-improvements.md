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

This quick-mode project repaired OAT dispatch policy behavior after dogfooding
showed the older dispatch-ceiling UX was too easy to misread. The shipped model
separates managed capped policies, managed uncapped preferred selection, and
explicit host-default inheritance while keeping legacy dispatch ceiling state
compatible.

## What Was Implemented

- Added dispatch policy config support for `Economy`, `Balanced`, `High`,
  `Frontier`, `Uncapped`, and `Inherit Host Defaults`.
- Added Claude `fable` as the Frontier model tier and kept Codex Frontier mapped
  to `xhigh`.
- Updated `oat project dispatch-ceiling resolve` to return policy-aware
  selection metadata for implementer, fix, and reviewer dispatch.
- Preserved legacy `workflow.dispatchCeiling.*` and `oat_dispatch_ceiling`
  behavior as capped managed compatibility inputs.
- Updated lifecycle skills, generated Codex role variants, docs, and synced
  provider views so implementation/review logs distinguish caps, selected
  values, provider defaults, uncapped behavior, and inherit/default fallback.
- Bumped the lockstep public package set and generated public package metadata
  for the shipped CLI/skill/docs changes.

## Key Decisions

- **Absent policy is unresolved, not uncapped.** Managed `Uncapped` is explicit
  state; leaving policy unset still triggers the implementation preflight.
- **Implementer/fix dispatch uses preferred selection under policy.** Capped
  policies select `min(preferred, cap)`, while managed `Uncapped` selects the
  preferred target directly.
- **Reviewer dispatch stays deterministic only for caps.** Capped managed
  policies target the configured cap; managed `Uncapped` and `Inherit Host
Defaults` use base reviewer fallback.
- **Provider defaults are fallback context.** Codex provider default effort is
  displayed when known but is not a cap and is not managed uncapped behavior.

## Integration Notes

- The CLI command remains `oat project dispatch-ceiling resolve` for
  compatibility, but callers should treat the response as the dispatch policy
  contract.
- Codex implementer/fix callers must pass `--preferred <effort>` and use the
  resolver-returned variant rather than reusing a cap-only variant.
- Claude implementer/fix callers should pass `--preferred <model>` and
  `--orchestrator-tier` so upgrade verification can be surfaced.
- Generic sidecars remain outside OAT-managed role selection and should log
  provider-default behavior unless their actual host payload pins a reliable
  model or effort control.

## Verification

- Targeted dispatch-policy, config, provider-registry, generated-asset, skill,
  and docs tests passed through the phase agents and final fix loop.
- Full post-fix verification passed: `pnpm test`, `pnpm lint`,
  `pnpm type-check`, `pnpm build`, `pnpm build:docs`, sync status, and skill
  validation.
- Final re-review passed with no Critical, Important, Medium, or Minor findings.
