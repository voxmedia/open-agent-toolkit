---
oat_generated: true
oat_generated_at: 2026-09-21
oat_pr_type: project
oat_pr_scope: final
oat_project: .oat/projects/shared/claude-effort-levels
---

# feat: add Claude effort-aware dispatch

## Summary

Claude managed dispatch now treats model and effort as separate target axes. OAT resolves version-aware model/effort pairs, materializes exact reviewer and phase-implementer variants, validates the generated definition and launch payload, and preserves model-only and inherited compatibility paths.

The bundled dispatch recommendation and orchestration guidance now teach Claude effort selection across Economy, Balanced, High, and Frontier policies. Explicit managed `Uncapped` effort choices use the exact model/effort candidate path, while model-only compatibility retains preferred selection and `--task-effort` remains classification provenance. Planning setup also limits lifecycle-gate questions to the active workflow plus implementation, so quick-start no longer asks about lite, import-plan, or separate plan gates.

## Goals / Non-Goals

- Add deterministic Claude effort selection for managed reviewer, implementation, and bounded-fix dispatch.
- Keep configured model and effort separate from provider-observed runtime evidence.
- Preserve legacy model-only routes, inherit behavior, existing explicit ladder cells, and Opus-first hard-reasoning guidance.
- Refresh bundled recommendations, provider guidance, docs, generated projections, and the superseding decision record.
- Scope planning gate prompts to the workflow being invoked.
- No dynamic agent broker, provider-wide reranking, automatic user-config migration, global install, deployment, or release.

## Changes

- Added Claude target resolution, capability validation, dispatch-envelope checks, and exact model/effort variant selection, including the managed `Uncapped` explicit-effort path.
- Added Claude role materialization and sync lifecycle support for reviewer and phase-implementer definitions.
- Updated dispatch records and smoke coverage to reject missing variants, unsupported effort, conflicting model controls, and launch-payload drift.
- Captured provider-derived live observations for medium/high task selection, capped review, inheritance, and settings-cap divergence.
- Updated orchestration, implementation, review, and provider-reference guidance for Claude effort selection and evidence semantics.
- Updated recommendation version `2026-09-21.1` and its generated asset while preserving explicit configured cells.
- Restricted gate setup questions in quick, plan, lite, and import workflows to their relevant lifecycle path.
- Superseded the prior Claude model-axis-only decision and documented the version-aware capability contract.
- Bumped the five public packages to `0.3.2` and regenerated shipped provider projections.

## Verification

The final post-p05-t03 verification completed the repository's CI/release sequence in order:

- `pnpm check`
- `pnpm type-check`
- `pnpm test`
- `pnpm build`
- `pnpm run check:skill-bumps`
- `git fetch origin main`
- `pnpm release:check-versions`
- `pnpm release:validate`
- `pnpm build:docs`
- `pnpm lint`
- `pnpm format`

The authoritative CLI suite passed 7,484/7,484 tests; smoke passed 163/163, skill tests 650/650, and scripts 1/1. A forced isolated Turbo run executed 10/10 tasks without cache reuse. Focused Claude dispatch/guidance tests passed 334/334, production-boundary smoke passed 4/4, and a deliberate negative control proved the shipped model-agreement guard can fail. The final receive edits also passed the docs check and the 242-test skill validation suite. Current-head CI exposed one stale derived autonomy-inventory key after the guidance edit; removing it passed the focused 5-test inventory suite and the complete `pnpm test` command.

## Reviews

- Phase reviews passed for p01 through p05 after bounded fixes where required.
- The fresh final lifecycle review after p05-t03 passed with 0 Critical, 0 High, 0 Medium, and 0 Low findings.
- The final configured exit gate passed its High threshold on `cursor-fable-5-1-high` with 0 Critical, 0 High, 0 Medium, and 2 Low findings. Both Low guidance findings were fixed during the passing-gate receive sweep.
- One Low-priority cleanup remains deferred: replace order-sensitive structural comparisons if a real producer emits equivalent payloads in a different key order. Current producers are canonical and mismatches fail closed.

## References

- [Discovery](https://github.com/voxmedia/open-agent-toolkit/blob/feat/claude-effort-levels/.oat/projects/shared/claude-effort-levels/discovery.md)
- [Plan](https://github.com/voxmedia/open-agent-toolkit/blob/feat/claude-effort-levels/.oat/projects/shared/claude-effort-levels/plan.md)
- [Implementation](https://github.com/voxmedia/open-agent-toolkit/blob/feat/claude-effort-levels/.oat/projects/shared/claude-effort-levels/implementation.md)
- [Summary](https://github.com/voxmedia/open-agent-toolkit/blob/feat/claude-effort-levels/.oat/projects/shared/claude-effort-levels/summary.md)
- [Reviews](https://github.com/voxmedia/open-agent-toolkit/tree/feat/claude-effort-levels/.oat/projects/shared/claude-effort-levels/reviews)
