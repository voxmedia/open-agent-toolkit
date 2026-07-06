---
oat_generated: true
oat_generated_at: 2026-07-06
oat_review_scope: final
oat_review_type: code
oat_review_invocation: gate
oat_project: .oat/projects/shared/model-dispatch-improvements
---

# Code Review: final

**Reviewed:** 2026-07-06
**Scope:** Gate-originated final independent code review for `dispatch-fixes-round-2`, range `d94561071e374a647810b1240f03a544939c65f9..b037cf53104d2e56f228d087fb2cc4b6901b4b97`
**Files reviewed:** 61
**Commits:** 45

## Summary

Independent gate-originated final review. The dispatch-policy implementation is coherent with the quick-mode discovery, design, and plan: managed capped ladder (`economy`/`balanced`/`high`/`frontier`), explicit managed `Uncapped`, explicit `Inherit Host Defaults`, legacy `dispatchCeiling`/`oat_dispatch_ceiling` compatibility without absent-state reinterpretation, and provider-specific Codex (pinned effort variants) / Claude (Task `model` axis, effort not-applicable) dispatch.

The resolver, config model, preset compiler, provider registry, config-command surface, and the `resolve.ts` integration point were read directly and hold together. All workspace quality gates pass, canonical↔bundled asset mirrors are byte-identical, changed-skill versions are bumped, the five lockstep public packages are at `0.1.41`, and the sync manifest is fully in sync (142/142). No blocking findings.

Findings: 0 critical, 0 important, 0 medium, 0 minor

## Findings

### Critical

None

### Important

None

### Medium

None

### Minor

None

## Requirements/Design Alignment

**Evidence sources used:** `discovery.md`, `design.md`, `plan.md`, `implementation.md`, `state.md`, archived p01–p04 and prior final review artifacts, and direct reading of changed source/config/docs/assets in range `d945610..b037cf53`. `spec.md` is absent as expected for this quick-mode project.

### Requirements Coverage

| Requirement                                                         | Status      | Notes                                                                                                                                                                                                                                                                                   |
| ------------------------------------------------------------------- | ----------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Managed capped ladder `Economy`/`Balanced`/`High`/`Frontier`        | implemented | `DISPATCH_POLICY_PRESETS` (`dispatch-ceiling-preset.ts:33`) compiles `economy→codex medium/claude sonnet`, `balanced→high/sonnet`, `high→xhigh/opus`, `frontier→xhigh/fable`. Config catalog, enum values, and resolver validation all include the ladder.                              |
| Managed `Uncapped` distinct from `Inherit Host Defaults`            | implemented | Resolver `selectDispatchValue` (`index.ts:661`) returns `selectionMode: 'uncapped'`/`'no-review-target'` for uncapped and `'inherit-default'` (no dispatch args) for inherit; config `applyWorkflowValue` and project-state parser keep the two modes separate.                         |
| Legacy compatibility, no absent-state reinterpretation              | implemented | `readLegacyProjectDispatchCeiling`/`readResolvedLegacyConfigCeilingCandidate` read concrete per-provider values as `legacy-ceiling`; absent state returns `null` → `unresolved`/`blocked`, never implicit uncapped. Tested at `index.test.ts:264`.                                      |
| Implementer/fix `min(preferred, cap)`; uncapped selects preferred   | implemented | `selectDispatchValue` computes `Math.min(preferredIndex, ceilingIndex)` for capped and returns `preferredValue` for uncapped. Legacy-cap-over-lower-precedence-policy precedence is covered (`index.test.ts:1046`, `:1091`).                                                            |
| Reviewer targets cap; uncapped/inherit are explicit no-target       | implemented | Reviewer path yields `review-target` (capped), `no-review-target` (uncapped), `inherit-default` (inherit), with matching human-readable notes in `writeHumanResolution`.                                                                                                                |
| Codex pinned variants; Claude model-axis with effort not-applicable | implemented | `registry.ts` codex adapter emits `oat-<role>-<effort>` variants (matching regenerated `.codex/agents/*.toml`); claude adapter emits `{ model }` and `verifyOnDispatch` only on above-orchestrator upgrades. `fable` added to `VALID_CLAUDE_DISPATCH_CEILINGS` and `CLAUDE_TIER_ORDER`. |
| Config integration for new nested keys                              | implemented | `resolve.ts` seeds `dispatchPolicy.mode/policy` defaults; `oat-config.ts` normalizes `dispatchPolicy`; config command adds catalog/enum/order/set handling with a guard preventing `mode=managed` without a policy.                                                                     |
| Skills, templates, docs, provider views, bundled assets aligned     | implemented | 4 changed canonical skills byte-identical to bundled mirrors; all 6 changed docs identical to `packages/cli/assets/docs` mirrors; agent md mirrors in sync; `oat:validate-skills` passes (53 skills); sync manifest 142/142.                                                            |
| Changed-skill version bumps                                         | implemented | oat-project-implement 2.0.24→2.0.26, oat-project-plan 1.3.8→1.3.9, oat-project-plan-writing 1.2.5→1.2.6, oat-project-quick-start 2.1.8→2.1.9.                                                                                                                                           |
| Lockstep public package bump + release validation                   | implemented | cli/control-plane/docs-config/docs-theme/docs-transforms all `0.1.41`; `public-package-versions.json` matches; `pnpm release:validate` passes.                                                                                                                                          |

### Extra Work (not in declared requirements)

None. The authoritative final diff contains no stray `multi-family-dispatch` artifacts (removed by `b4601236`), consistent with the prior final review.

## Verification Commands

```bash
git diff --check d94561071e374a647810b1240f03a544939c65f9..b037cf53104d2e56f228d087fb2cc4b6901b4b97
pnpm --filter @open-agent-toolkit/cli exec vitest run \
  src/commands/project/dispatch-ceiling/index.test.ts \
  src/config/dispatch-ceiling-preset.test.ts \
  src/providers/ceiling/registry.test.ts \
  src/config/oat-config.test.ts \
  src/commands/config/index.test.ts \
  src/validation/skills.test.ts
pnpm --filter @open-agent-toolkit/cli type-check
pnpm --filter @open-agent-toolkit/cli lint
pnpm run oat:validate-skills
pnpm release:validate
pnpm run cli -- status --scope project --json
```

Observed during this review:

- `git diff --check` clean; working tree clean before and after review.
- Targeted vitest: 6 files, 255 tests passed, 0 failed.
- `type-check` clean; `lint` 0 warnings/0 errors (492 files).
- `oat:validate-skills`: 53 skills validated.
- `release:validate`: 5 public packages at `0.1.41`.
- `status --scope project --json`: total 142, inSync 142, drifted 0, missing 0, stray 0.

## Review Notes

- This review did not edit plan/state/implementation bookkeeping beyond writing this artifact and recording the Reviews-table row per the gate contract.
- Config-over-project-state precedence (`resolveCeilingValue`) is an intentional, tested behavior (`index.test.ts:125`), not a regression; not flagged.
- Project `state.md` uses legacy `oat_dispatch_ceiling`, exercising the compatibility path by design; not flagged.

## Recommended Next Step

No blocking findings. Process via `oat-project-review-receive` (or the gate's bookkeeping path) to mark the final review passed.
