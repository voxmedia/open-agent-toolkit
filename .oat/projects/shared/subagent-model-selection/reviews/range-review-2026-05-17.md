---
oat_generated: true
oat_generated_at: 2026-05-17
oat_review_scope: prev1-prev8
oat_review_type: code
oat_review_invocation: manual
oat_project: .oat/projects/shared/subagent-model-selection
---

# Code Review: prev1-prev8

**Reviewed:** 2026-05-17
**Scope:** Re-review of revision rounds `prev1` through `prev8`, range `491faa172a0c32b4b27515013a6f2c598f7183f9..HEAD`
**Files reviewed:** 30 files across OAT skills/agents, generated Codex views, docs, project artifacts, Codex sync-extension code/tests, Codex stray detection, `oat status`, `oat init`, and lockstep package version bumps.
**Commits:** 36 commits from `783e9309` through `859220e8`.

## Summary

The `prev1-prev8` revision range is coherent and ready to proceed. The prior `prev1-prev7` review findings are resolved: invalid `selected:xhigh` guidance is gone, stale one-line dispatch references now point at the structured `OAT Dispatch` block, review effort-axis wording is host-conditional, and generic implementer-role dispatch wording now references the selected role.

The `prev8` executable changes correctly teach both `oat status` and `oat init` to treat generated Codex effort-variant roles as managed when the Codex extension plan owns them. Targeted tests, type-check, sync dry-run, docs build, release validation, and live `oat status --scope project` all pass.

## Findings

### Critical

None.

### Important

None.

### Medium

None.

### Minor

None.

## Spec/Design Alignment

Evidence sources used: `discovery.md`, `design.md`, `plan.md`, `implementation.md`, and `summary.md`. This is a quick-mode project, so discovery, design, plan, and implementation artifacts are the operative sources.

### Requirements Coverage

| Requirement / revision intent                                                           | Status      | Notes                                                                                                                                          |
| --------------------------------------------------------------------------------------- | ----------- | ---------------------------------------------------------------------------------------------------------------------------------------------- |
| `prev1`: implementation dispatch may choose effort; review dispatch inherits by default | implemented | Current reviewer guidance is host-conditional: Codex can inherit effort, Claude Code records effort as `not-applicable`.                       |
| `prev2`: split model and effort into independent axes                                   | implemented | `model_axis` and `effort_axis` vocabulary is consistent across the main skill, agents, docs, and project artifacts.                            |
| `prev3`: selected axes must match host dispatch parameters                              | implemented | Claude Code selected model and Codex selected effort paths are explicitly tied to host dispatch mechanics.                                     |
| `prev4` / `prev5`: Codex selected effort must not drift from actual dispatch            | implemented | The final contract uses role variants for selected effort and a post-spawn mismatch gate.                                                      |
| `prev6`: Codex selected effort maps to managed low/medium/high implementer variants     | implemented | Generated `.codex/agents/oat-phase-implementer-{low,medium,high}.toml` views are registered and sync-clean.                                    |
| `prev7`: structured dispatch logs and review-finding coherence fixes                    | implemented | `OAT Dispatch` block is canonical; provider-specific escalation termini are documented; no `selected:xhigh` remains.                           |
| `prev8`: `oat status` and `oat init` recognize generated Codex role variants as managed | implemented | Both call sites pass `managedRoles` from the Codex extension plan into `detectCodexRoleStrays`; tests cover managed variants and real orphans. |
| Lockstep public package release requirements                                            | implemented | All five public packages are at `0.0.70`; release validation passes.                                                                           |

### Extra Work

None found. The code changes map to review fixes or tracked `p-rev8` tasks. Project artifact changes are lifecycle bookkeeping.

## Code Review Notes

The `prev8` code path is correct:

- `detectCodexRoleStrays` now accepts `managedRoleNames` and suppresses both config-table and `.codex/agents/*.toml` strays whose role names are generated-managed.
- `status/index.ts` computes the Codex extension plan once, reports extension drift/missing operations, then passes `new Set(codexExtensionPlan.managedRoles)` into stray detection.
- `init/index.ts` applies the same managed-role set before building adoptable Codex stray candidates.
- Tests cover managed effort variants not being reported as strays, genuine orphans still being reported, `oat status` behavior, and `oat init` behavior.

The remaining maintainability concern from the earlier range review, that effort-variant generation uses string replacement against the exported TOML shape, remains acceptable for this scope because the generated output is covered by tests and sync dry-run is clean.

## Verification Commands

Run during this review:

```bash
git diff --check 491faa172a0c32b4b27515013a6f2c598f7183f9..HEAD
pnpm --filter @open-agent-toolkit/cli exec vitest run src/commands/shared/codex-strays.test.ts src/commands/init/index.test.ts src/providers/codex/codec/sync-extension.test.ts
pnpm --filter @open-agent-toolkit/cli type-check
pnpm run cli -- sync --scope project --dry-run
pnpm run cli -- status --scope project
pnpm release:validate
pnpm build:docs
```

Results:

- `git diff --check`: passed.
- Targeted tests: 3 files, 57 tests passed.
- CLI type-check: passed.
- Sync dry-run: all managed views and Codex config in sync.
- `oat status --scope project`: no generated Codex effort-variant role strays reported.
- Release validation: passed for all five public packages at `0.0.70`.
- Docs build: passed.

## Recommended Next Step

Run `oat-project-review-receive` to mark the `prev1-prev8` review as passed, then update PR #79 with the latest `p-rev7` and `p-rev8` work.
