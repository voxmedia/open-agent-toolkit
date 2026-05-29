---
oat_status: in_progress
oat_ready_for: null
oat_blockers: []
oat_last_updated: 2026-05-29
oat_current_task_id: p05-t01
oat_generated: false
---

# Implementation: dispatch-ceiling-ux

**Started:** 2026-05-28
**Last Updated:** 2026-05-28

> This document is used to resume interrupted implementation sessions.
>
> Conventions:
>
> - `oat_current_task_id` always points at the **next plan task to do** (not the last completed task).
> - When all plan tasks are complete, set `oat_current_task_id: null`.
> - Reviews are **not** plan tasks. Track review status in `plan.md` under `## Reviews` (e.g., `| final | code | passed | ... |`).
> - Keep phase/task statuses consistent with the Progress Overview table so restarts resume correctly.
> - Before running the `oat-project-pr-final` skill, ensure `## Final Summary (for PR/docs)` is filled with what was actually implemented.

## Progress Overview

| Phase   | Status   | Tasks | Completed |
| ------- | -------- | ----- | --------- |
| Phase 1 | complete | 3     | 3/3       |
| Phase 2 | complete | 2     | 2/2       |
| Phase 3 | complete | 2     | 2/2       |
| Phase 4 | complete | 2     | 2/2       |
| Phase 5 | pending  | 2     | 0/2       |

**Total:** 9/11 tasks completed (reopened by final review v2)

---

## Phase 1: {Phase Name}

**Status:** in_progress
**Started:** 2026-05-28

### Phase Summary (fill when phase is complete)

**Outcome (what changed):**

- {2-5 bullets describing user-visible / behavior-level changes delivered in this phase}

**Key files touched:**

- `{path}` - {why}

**Verification:**

- Run: `{command(s)}`
- Result: {pass/fail + notes}

**Notes / Decisions:**

- {trade-offs or deviations discovered during implementation}

### Task p01-t01: {Task Name}

**Status:** completed / in_progress / pending / blocked
**Commit:** {sha} (if completed)

**Outcome (required when completed):**

- {what materially changed (not “did task”, but “system now does X”)}

**Files changed:**

- `{path}` - {why}

**Verification:**

- Run: `{command(s)}`
- Result: {pass/fail + notes}

**Notes / Decisions:**

- {gotchas, trade-offs, design deltas, important context for future sessions}

**Issues Encountered:**

- {Issue and resolution}

---

### Task p01-t02: {Task Name}

**Status:** pending
**Commit:** -

**Notes:**

- {Notes will be added during implementation}

---

## Phase 2: {Phase Name}

**Status:** pending
**Started:** -

### Task p02-t01: {Task Name}

**Status:** pending
**Commit:** -

---

## Orchestration Runs

_Each run from `oat-project-implement` appends an entry below with:_
_- Run header (number, timestamp, branch, tier, policy, phase counts)_
_- Phase Outcomes table_
_- Parallel Groups list_
_- Outstanding Items_

<!-- orchestration-runs-start -->

### Run 1 — 2026-05-29

**Branch:** feat/dispatch-ceiling
**Tier:** 1 (Claude Code subagents)
**Policy:** merge-strategy=sequential, retry-limit=2, dispatch-ceiling=opus (project state)
**Phases:** 4 executed, 3 passed-clean, 0 failed-terminal, 0 stopped. Final review (scope=final) failed once on docs drift, fixed (31564a01), re-review passed. All gates green; 5 packages at 0.1.12.

#### Phase Outcomes

| Phase | Implementer         | Review             | Fix Iterations                 | Disposition                                            |
| ----- | ------------------- | ------------------ | ------------------------------ | ------------------------------------------------------ |
| p01   | DONE (model=sonnet) | fail (1 Important) | 0/2 — dispositioned to p02-t02 | committed; review fixes_completed (closed by p02-t02)  |
| p02   | DONE (model=opus)   | pass (2 Minor)     | n/a                            | committed; review passed; closed p01 regression        |
| p03   | DONE (model=sonnet) | pass (1 Med/2 Min) | n/a                            | committed; review passed; nits → final auto-review     |
| p04   | DONE (model=sonnet) | pass (via final)   | 1/2 (final docs-drift fix)     | committed; docs + lockstep 0.1.12; final review passed |

#### Parallel Groups

- None. Sequential (p01, p02 singletons).

#### Dispatch Notes

- Dispatch: p01 implementation model_axis=selected:sonnet, effort_axis=not-applicable; reviewer model_axis=selected:opus (ceiling). Commit range 97c54a06..5da1cb42.
- Dispatch: p02 implementation model_axis=selected:opus (core adapter/resolver correctness); reviewer model_axis=selected:opus (ceiling). Commit range d39da22f..80d9a154. Full CLI suite green 1632/1632.
- Dispatch: p03 implementation model_axis=selected:sonnet (skill markdown copy); reviewer model_axis=selected:opus (ceiling). Commit range a52840bc..4a8d3969. Skills bumped: quick-start 2.1.4, implement 2.0.20, plan 1.3.4. validate-skill-version-bumps OK.
- Dispatch: p04 implementation model_axis=selected:sonnet (docs + lockstep release + 3 p03 nits); reviewer = final-scope review model_axis=selected:opus (ceiling). Commit range 5335f3e3..61e9db7a; final docs-drift fix 31564a01. Lockstep 0.1.11→0.1.12.

#### Outstanding Items

- p01 review Important finding: **CLOSED** by p02-t02 (resolver reads `providers.*`; blockMessage copy fixed; 2 tests rewritten). Re-verified in the p02 review — full CLI suite green 1632/1632. Review artifacts: `reviews/p01-review-2026-05-29.md`, `reviews/p02-review-2026-05-29.md`.
- p02 review: 2 Minor non-blocking findings (unreachable `unsupported`/`advisory` resolver branches — forward-looking for a future third adapter; defensive, not bugs). No fix task.
- p03 review: pass with 1 Medium + 2 Minor, all in `oat-project-implement/SKILL.md` copy, deferred to the final auto-review for disposition: (Medium) codex _advisory_ log example shows a concrete value (`high`) but advisory only occurs at null value → should render `unresolved`; (Minor) the Claude `dispatch-ceiling resolve` call in the runtime-dispatch section omits `--orchestrator-tier`, so the verify-on-upgrade flag never fires for Claude as written — wire the orchestrator's current model tier into that call; (Minor) a JSON example omits the top-level `status` field. **All three closed in p04-t00 (commit 5335f3e3).** Artifact: `reviews/p03-review-2026-05-29.md`.
- **FINAL REVIEW (scope=final): PASS** after one bounded fix. Initial verdict failed on 1 Important docs-drift finding (`reference/oat-directory-structure.md` listed removed flat keys) + 2 Minor docs items + stray root `index.md`; fixed in `31564a01`; re-review passed (0 Crit/Imp/Med). Lone remaining: 1 deferred Minor (imprecise advisory gloss in `oat-project-implement/SKILL.md` — optional polish, non-blocking). All gates green; 5 lockstep packages at 0.1.12. Artifact: `reviews/final-review-2026-05-29.md`.

<!-- orchestration-runs-end -->

---

### Review Received: final (v2)

**Date:** 2026-05-29
**Review artifact:** `reviews/archived/final-review-2026-05-29-v2.md` (manual, final scope)

A second, manual final review run after implementation completed (`97c54a06..0e80aa55`) found **2 Important findings the run's own reviews missed** — including one my opus final review passed over and one the p02 review under-rated as Minor. Both block the feature's core claims, so the project was reopened with a `p05` Review Fixes phase.

**Findings:**

- Critical: 0 · Important: 2 · Medium: 0 · Minor: 0

**New tasks added:** p05-t01, p05-t02

- `I1` → **p05-t01**: `applyWorkflowValue()` stores `workflow.dispatchCeiling.preset` raw and never calls `compileDispatchCeilingPreset()`, so the documented recommended preset config path resolves no concrete ceiling. Compile at config-set time.
- `I2` → **p05-t02**: `normalizeProvider()` throws for non-codex/claude, so `resolve --provider cursor` errors before the registry's fallback adapter runs — violates the provider-neutral "advisory, never block" design. Route unknown providers through the fallback adapter.

**Process note:** the run's per-phase + auto-final reviews were less rigorous than this manual review (which executed the `--provider cursor` repro). Reinforces the [[verify-provider-capability-at-dispatch]] principle — verification has to actually exercise the documented paths, not just the happy path.

**Next:** Execute p05 via `oat-project-implement`, then re-review final scope (`oat-project-review-provide code final` → `oat-project-review-receive`) to reach `passed` before PR.

---

## Implementation Log

Chronological log of implementation progress.

### 2026-05-28

**Session Start:** {time}

- [x] p01-t01: {Task name} - {commit sha}
- [ ] p01-t02: {Task name} - in progress

**What changed (high level):**

- {short bullets suitable for PR/docs}

**Decisions:**

- {Decision made and rationale}

**Follow-ups / TODO:**

- {anything discovered during implementation that should be captured for later}

**Blockers:**

- {Blocker description} - {status: resolved/pending}

**Session End:** {time}

---

### 2026-05-28

**Session Start:** {time}

{Continue log...}

---

## Deviations from Plan / Design

Document any intentional deviations from the original plan, spec, or design. Include accepted review findings where the shipped implementation is source of truth and a lifecycle artifact needs alignment.

| Task / Review | Source Artifact                                  | Planned / Documented                                                                                     | Actual / Accepted                                                                                                                                                                                                                                   | Reason                                                                                                                                                                                | Source of Truth                            | Follow-up                                                                                                                       |
| ------------- | ------------------------------------------------ | -------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------- |
| p01 review    | plan.md p01 gate                                 | p01 verification gate declared `lint && type-check` only                                                 | Clean-break removal of the flat `dispatchCeiling.<provider>` key left the old resolver (`dispatch-ceiling/index.ts`) reading the dead key → 2 resolver tests red at p01 HEAD                                                                        | Resolver rework is explicitly p02-t02 work; a minimal p01 fix would be discarded by p02-t02's full rewrite                                                                            | implementation (p02-t02 restores green)    | Closed by p02-t02 (readResolvedConfigCeiling → providers.\*, blockMessage copy, 2 tests). Then flip p01 review fixes_completed. |
| p02-t01       | design.md (Provider Adapter Registry interface)  | `compileToDispatchArgs(value, ctx)` — single signature; verify-on-upgrade folded into one method         | `compileToDispatchArgs(value, role, ctx)` + a separate `verifyOnDispatch(value, ctx)` method on the adapter                                                                                                                                         | Plan p02-t01/t02 + phase brief require the `role` arg (implementer vs reviewer variant) and an explicit verify-on-upgrade surface; the design's interface block was an earlier sketch | implementation (registry.ts)               | Optionally align the design interface block to `(value, role, ctx)` + `verifyOnDispatch` in a later docs/design pass.           |
| p02-t02       | design.md (project state `oat_dispatch_ceiling`) | Resolver previously read flat `{ provider, value, source }` project-state shape                          | Resolver now reads the design's nested `{ preset?, providers: { codex?, claude? }, source }` project-state shape                                                                                                                                    | Aligns the resolver read path with the design's normalized project-state model; the old flat read shape was the pre-reshape contract                                                  | implementation (dispatch-ceiling/index.ts) | None — matches design.md Data Models.                                                                                           |
| p02-t02       | design.md (`ResolveResult`)                      | `ResolveResult` is a flat multi-provider object (`providers` map + top-level `preset`/`source`/`status`) | Kept the existing per-provider command contract (top-level `provider`/`value`/`source`/`status`/`unresolved`/`providerDefaultEffort`) and ADDED the design's `preset` + `providers.<provider>.{value,mode,mechanism,dispatchArgs,verifyOnDispatch}` | Preserves the original `--preflight`/`--json`/non-interactive single-provider contract and all existing consumers while adding the adapter-aware shape                                | implementation (dispatch-ceiling/index.ts) | Skills (p03) consume `providers.<provider>.dispatchArgs`; superset is backward compatible.                                      |

## Test Results

Track test execution during implementation.

| Phase | Tests Run | Passed | Failed | Coverage |
| ----- | --------- | ------ | ------ | -------- |
| 1     | -         | -      | -      | -        |
| 2     | -         | -      | -      | -        |

## Final Summary (for PR/docs)

**What shipped:**

- Provider-neutral dispatch-ceiling model. The ceiling is an OAT intent, not a provider selection. Users choose a preset (`balanced`/`maximum`/`cost-conscious`), set per-provider values directly (advanced), or pick "no ceiling".
- Presets compile to concrete per-provider values **at write time**; runtime dispatch reads only the concrete `providers.*` values, never the preset label.
- A provider **adapter registry** declares per-provider enforcement: Codex → pinned variant files; Claude → per-call Task `model`; unknown providers → advisory. Enforcement `mode` (enforced/advisory/unsupported) is computed at resolve time and never persisted to state.
- `oat project dispatch-ceiling resolve` joins stored intent × adapter and returns per-provider `{value, mode, mechanism, dispatchArgs}` (+ `verifyOnDispatch` for above-orchestrator requests), preserving the existing `--preflight`/`--json`/non-interactive contract.
- Lifecycle skills carry provider-neutral preset prompts and enforced/advisory/unsupported dispatch logs; docs updated; clean break (no migration of the old flat shape).

**Behavioral changes (user-facing):**

- Config keys changed (clean break): `workflow.dispatchCeiling.codex`/`.claude` are removed; new keys are `workflow.dispatchCeiling.preset` and `workflow.dispatchCeiling.providers.codex`/`.claude`.
- The dispatch-ceiling prompt no longer implies the feature only works under Codex/Claude; "no ceiling" is first-class.

**Key files / modules:**

- `packages/cli/src/config/oat-config.ts`, `dispatch-ceiling-preset.ts` — schema + preset compiler
- `packages/cli/src/commands/config/index.ts`, `config/resolve.ts` — config keys + effective-config
- `packages/cli/src/providers/ceiling/registry.ts` — provider adapter registry
- `packages/cli/src/commands/project/dispatch-ceiling/index.ts` — adapter-aware resolver
- `.agents/skills/oat-project-{quick-start,implement,plan}/SKILL.md` — provider-neutral prompts + dispatch logs
- `apps/oat-docs/docs/cli-utilities/configuration.md`, `workflows/projects/{implementation-execution,lifecycle}.md`, `reference/oat-directory-structure.md` — docs

**Verification performed:**

- `pnpm check`, `pnpm test` (1632/1632), `pnpm lint`, `pnpm type-check`, `pnpm build:docs`, `oat sync --scope project --dry-run` (clean), `validate-skill-version-bumps` (3 skills), `pnpm release:validate` (5 packages @ 0.1.12). Final review passed after one docs-drift fix.

**Design deltas (if any):**

- Adapter interface refined to `compileToDispatchArgs(value, role, ctx)` + explicit `verifyOnDispatch(value, ctx)` (design sketch was `(value, ctx)`).
- Resolver returns a backward-compatible superset: existing per-provider command fields + the design's `preset`/`providers.<provider>.{...}` shape.
- See `## Deviations from Plan / Design` for the full list.

## References

- Plan: `plan.md`
- Design: `design.md`
- Spec: `spec.md`
