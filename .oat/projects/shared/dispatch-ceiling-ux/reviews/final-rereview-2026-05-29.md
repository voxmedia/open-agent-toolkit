---
oat_generated: true
oat_generated_at: 2026-05-29
oat_review_scope: final
oat_review_type: code
oat_review_invocation: manual
oat_project: .oat/projects/shared/dispatch-ceiling-ux
---

# Code Review: final (re-review post-p05)

**Reviewed:** 2026-05-29
**Scope:** final-scope re-review after p05 review fixes
**Files reviewed:** 4 (p05 diff) + supporting context (registry, oat-config, resolver)
**Commits:** p05 range `432ff1e9..a5193b35` (full feature range `97c54a06..a5193b35`)
**Prior review:** `reviews/archived/final-review-2026-05-29-v2.md` (2 Important findings)
**Dispatch:** model_axis selected:opus

## Summary

Both Important findings from final review v2 are genuinely closed and verified by
exercising the documented command paths (not just unit tests). The preset config key now
compiles to concrete per-provider values at write time, and unknown providers resolve as
advisory/unsupported instead of erroring. The whole-feature regression sweep is green
(1635 tests, lint, type-check), the worktree config was not mutated, and release readiness
is unchanged (5 lockstep packages at 0.1.12, sync dry-run clean). No new findings.

## Findings

### Critical

None.

### Important

None. (Both v2 Important findings closed — see Closure Confirmation below.)

### Medium

None.

### Minor

None.

## Closure Confirmation

### I1 — Preset config key compiles to concrete providers at write time → CLOSED

Verified by live commands against a disposable temp dir (no worktree mutation):

`oat --cwd <tmp> config set workflow.dispatchCeiling.preset balanced --shared` wrote:

```json
{
  "version": 1,
  "workflow": {
    "dispatchCeiling": {
      "preset": "balanced",
      "providers": { "codex": "high", "claude": "sonnet" }
    }
  }
}
```

`oat --cwd <tmp> project dispatch-ceiling resolve --provider codex --json` →
`status: resolved`, `value: high`, `source: repo-config`, `providers.codex.mode: enforced`,
`mechanism: pinned-variant`, `dispatchArgs.variant: oat-phase-implementer-high`, exit 0.

`oat --cwd <tmp> project dispatch-ceiling resolve --provider claude --json` →
`status: resolved`, `value: sonnet`, `providers.claude.mode: enforced`,
`mechanism: model-arg`, `dispatchArgs.model: sonnet`, exit 0.

Implementation: `applyWorkflowValue()` `dispatchCeiling.preset` branch now calls
`compileDispatchCeilingPreset()` and persists `preset` (provenance) plus compiled
`providers.codex`/`.claude` (`packages/cli/src/commands/config/index.ts:790-810`). The
advanced/manual `dispatchCeiling.providers.*` branch writes only the provider key and never
a `preset` key (`index.ts:813-825`), satisfying Verify item 3. `compileDispatchCeilingPreset`

- `DISPATCH_CEILING_PRESETS` is the single mapping authority; it is the only production call
  site for preset compilation (`packages/cli/src/config/dispatch-ceiling-preset.ts:17,51`).

### I2 — Unknown providers resolve as advisory/unsupported, not error → CLOSED

`oat --cwd <tmp> project dispatch-ceiling resolve --provider cursor --json` →

```json
{
  "status": "unresolved",
  "provider": "cursor",
  "value": null,
  "source": null,
  "providers": {
    "cursor": {
      "value": null,
      "mode": "unsupported",
      "mechanism": "none",
      "dispatchArgs": null,
      "verifyOnDispatch": false
    }
  }
}
```

exit 0 (non-error). Human (non-JSON) path also clean: "Cursor dispatch ceiling: unresolved /
Mode: unsupported (none)", exit 0 — no crash, no contradictory output.

Implementation: `normalizeProvider()` no longer throws for non-codex/claude names; it accepts
any trimmed non-empty provider (`packages/cli/src/commands/project/dispatch-ceiling/index.ts:125-132`).
Unknown providers route through the registry fallback `advisoryAdapter`
(`supportsCeiling: false`, `mechanism: 'none'`, `compileToDispatchArgs → null`) at
`packages/cli/src/providers/ceiling/registry.ts:118-145`.

## Correctness Scan (p05 diff)

- **Provider-type widening does not weaken codex/claude validation.** `DispatchCeilingProvider`
  widened to `'codex' | 'claude' | (string & {})`, but `isValidProviderValue()` still applies
  the strict `CODEX_VALUES`/`CLAUDE_VALUES` enum checks per provider and returns `false` for any
  other provider (`index.ts:138-154`). Config normalization (`oat-config.ts:163-186`) still only
  recognizes `providers.codex`/`providers.claude` and drops all other provider keys with the same
  enum gating as before.
- **Unknown-provider path cannot report `enforced`.** `buildProviderResolution()` forces
  `mode = 'unsupported'` whenever `!adapter.supportsCeiling`, regardless of value
  (`index.ts:337-344`). Unknown providers also cannot carry a concrete value (no enum →
  `isValidProviderValue` false → value null in both config and project-state reads), so they
  resolve to `unresolved` + `unsupported`. No path reaches `enforced` for unknown providers.
- **No new dead/contradictory branches.** `isValidProviderValue` now has explicit `codex`,
  `claude`, and default-`false` branches (no dead code). `providerLabel` title-cases unknown
  names for human output (exercised, no crash). `blockMessage` references
  `providers.<provider>` (matches the nested schema).
- **No stale flat-key reads.** Grep for `dispatchCeiling.codex` / `dispatchCeiling.claude`
  (non-nested) in `packages/cli/src` finds only a code comment, no live reads. The resolver
  reads `workflow.dispatchCeiling.providers.<provider>` (`index.ts:286-304`).
- **Scope discipline.** p05 touches only the 4 planned files (config setter + test, resolver
  - test). No skill/docs drift, no out-of-scope changes.

## Spec/Design Alignment

**Evidence sources used:** `plan.md` (p05 tasks + Reviews table), `reviews/archived/final-review-2026-05-29-v2.md`,
production code (`commands/config/index.ts`, `commands/project/dispatch-ceiling/index.ts`,
`providers/ceiling/registry.ts`, `config/oat-config.ts`, `config/dispatch-ceiling-preset.ts`).

### Requirements Coverage

| Requirement / decision                                                                  | Status      | Notes                                                                                                      |
| --------------------------------------------------------------------------------------- | ----------- | ---------------------------------------------------------------------------------------------------------- |
| Presets compile immediately to concrete provider values at write time                   | Implemented | Closed by p05-t01; config-set now compiles via `compileDispatchCeilingPreset` and resolves both providers. |
| Provider adapter registry distinguishes enforced/advisory/unsupported                   | Implemented | Closed by p05-t02; unknown providers resolve advisory/unsupported via fallback adapter, never error.       |
| Single preset mapping authority (skills/resolver never re-map)                          | Implemented | `DISPATCH_CEILING_PRESETS`/`compileDispatchCeilingPreset` is the sole compile path.                        |
| Advanced/manual per-provider sets do NOT write a preset key                             | Implemented | `dispatchCeiling.providers.*` branch writes only the provider key.                                         |
| Codex enforcement via pinned variants / Claude via Task model arg / reviewer at ceiling | Implemented | Unchanged from prior passing reviews; re-confirmed via live codex/claude resolve.                          |
| No migration of old shape                                                               | Implemented | Clean-break nested schema only.                                                                            |

### Extra Work

None.

## Verification Commands

Run during this re-review:

```bash
# I1 (live, disposable temp dir — no worktree mutation):
oat --cwd <tmp> config set workflow.dispatchCeiling.preset balanced --shared
oat --cwd <tmp> project dispatch-ceiling resolve --provider codex --json   # resolved, high, enforced
oat --cwd <tmp> project dispatch-ceiling resolve --provider claude --json  # resolved, sonnet, enforced
# I2 (live):
oat --cwd <tmp> project dispatch-ceiling resolve --provider cursor --json  # unresolved, unsupported, exit 0
# Regression sweep:
pnpm --filter @open-agent-toolkit/cli test   # 1635 passed
pnpm lint                                      # 0 warnings / 0 errors
pnpm type-check                                # clean
# Release readiness:
pnpm run cli -- sync --scope project --dry-run # No changes to apply (clean)
```

Results:

- I1 closed: preset balanced → codex high (enforced), claude sonnet (enforced), exit 0.
- I2 closed: cursor → status unresolved, mode unsupported, dispatchArgs null, exit 0.
- Suite: 183 files / 1635 tests passed.
- Lint: 0 warnings / 0 errors. Type-check: clean.
- Sync project dry-run: clean ("No changes to apply").
- Lockstep packages all at 0.1.12. (A re-validate / possible patch bump after p05 is
  orchestrator-owned; current state reported only.)
- Worktree config untouched: `git status` clean before and after; temp dir removed.

## Recommended Next Step

Run `oat-project-review-receive` to record this re-review as passed (zero Critical / zero
Important). Per AGENTS lockstep policy, the orchestrator should confirm whether a patch bump

- `pnpm release:validate` is needed before merge, since p05 changed shipped CLI functionality
  on top of the existing 0.1.12 bump.
