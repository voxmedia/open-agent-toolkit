---
oat_status: complete
oat_ready_for: oat-project-implement
oat_blockers: []
oat_last_updated: 2026-07-10
oat_phase: plan
oat_phase_status: complete
oat_plan_parallel_groups: []
oat_plan_hill_phases: ['p04']
oat_auto_review_at_hill_checkpoints: true
oat_plan_source: quick
oat_import_reference: null
oat_import_source_path: null
oat_import_provider: null
oat_generated: false
---

# Implementation Plan: gate-review-provenance-target-safety

> Execute this plan using `oat-project-implement`.

**Goal:** Restore deterministic managed subagent dispatch as a prerequisite, then make workflow gate reviews explicit and corroborated about the configured invocation and review subject before expanding opt-in phase review gates.

**Architecture:** Fail closed when managed provider intent cannot compile concrete dispatch controls; make Codex `max` first-class; commit a complete supported reviewer/implementer catalogue; materialize custom targets into the scope that owns their configuration; and dispatch the exact registered role or an explicitly pinned fresh child without requiring provider restart. Then extend the existing gate path with minimal exec-target invocation metadata, immutable gate-owned project/invocation records, run-correlated artifact corroboration, explicit aggregated producer provenance, and one shared phase-review setup contract used by every plan-producing workflow.

**Tech Stack:** TypeScript ESM, Commander, Vitest, YAML frontmatter, Markdown-based OAT skills, Fumadocs, pnpm/Turborepo.

**Commit Convention:** `{type}({scope}): {description}`

## Planning Checklist

- [x] Quick workflow and lightweight design confirmed
- [x] Evaluated phases for parallelism
- [x] Set `oat_plan_parallel_groups: []`
- [x] Dispatch policy resolved from user config: managed `high`
- [x] Implementation regression identified and prerequisite scope authorized
- [x] Initial prerequisite plan artifact review passed
- [x] Static-catalogue and scoped-materialization revision artifact review passed

## Parallelism

The plan is sequential. Phase 0 must land first because it makes managed Codex phase dispatch concrete and fail-closed. Phases 1-3 all modify `packages/cli/src/commands/gate/index.ts` and its tests, while Phase 2 consumes the invocation/run metadata established in Phase 1. Phase 4 depends on the target-inspection API from Phase 1 and is deliberately last because phase-gate adoption must follow the safety work. Isolated worktrees would overlap resolver/config behavior, fragile gate behavior, generated skill assets, and release metadata.

---

## Phase 0: Managed Dispatch Readiness Prerequisite

### Task p00-t01: Fail closed and retain the selected Codex target

**Status:** completed (`0129dd3d`)

**Files:**

- Modify: `packages/cli/src/config/oat-config.ts`
- Modify: `packages/cli/src/config/oat-config.test.ts`
- Modify: `packages/cli/src/commands/project/dispatch-ceiling/index.ts`
- Modify: `packages/cli/src/commands/project/dispatch-ceiling/index.test.ts`
- Modify: `packages/cli/src/providers/ceiling/registry.ts`
- Modify: `packages/cli/src/providers/ceiling/registry.test.ts`

**Steps:**

1. Distinguish abstract policy resolution from runnable active-provider resolution. During preflight, a managed provider that cannot compile native dispatch controls is unresolved and blocks non-interactive execution.
2. Preserve valid built-in compilation such as Claude `high -> opus` and `frontier -> fable`, explicit inherit/default behavior, managed uncapped reviewer behavior, and deliberate cross-harness advisory routes.
3. Extend `WorkflowCodexDispatchCeiling`, `VALID_CODEX_DISPATCH_CEILINGS`, and the resolver/provider ordered value path from `low | medium | high | xhigh` to `low | medium | high | xhigh | max`, allowing the existing materializer to compile explicit `max` targets without coercion.
4. After applying a Codex effort cap, resolve the matrix target corresponding to the selected effort instead of dropping the target whenever preferred effort is below the policy cap.
5. Replace the existing lower-preferred unresolved-axis expectation with concrete model, effort, variant, source, and cap coverage for below/equal/above-cap, explicit `max` targets, reviewer, and uncapped paths. Prove the configured Cursor values remain opaque and compile unchanged: `gpt-5.6-luna-high`, `gpt-5.6-terra-xhigh`, `gpt-5.6-sol-high`, and `gpt-5.6-sol-max`.
6. After `max` resolves successfully, restore the user Codex Frontier target in `~/.oat/config.json` to `gpt-5.6-sol/max`. Verify live Codex and Cursor implementer/reviewer resolution under the configured policy; the resolver tests in step 5 pin all four Cursor tiers.

**Verify:**

```bash
pnpm --filter @open-agent-toolkit/cli exec vitest run src/config/oat-config.test.ts src/commands/project/dispatch-ceiling/index.test.ts src/providers/ceiling/registry.test.ts
pnpm --filter @open-agent-toolkit/cli type-check
pnpm run cli:source -- project dispatch-ceiling resolve --provider codex --role implementer --preflight --json
pnpm run cli:source -- project dispatch-ceiling resolve --provider codex --role reviewer --preflight --json
pnpm run cli:source -- project dispatch-ceiling resolve --provider cursor --role implementer --preflight --json
pnpm run cli:source -- project dispatch-ceiling resolve --provider cursor --role reviewer --preflight --json
```

**Commit:** `fix(dispatch): fail closed on incomplete managed targets`

---

### Task p00-t02: Generate the supported catalogue and scoped custom roles

**Files:**

- Modify: `packages/cli/config/dispatch-matrix-recommendation.json`
- Modify: `packages/cli/src/commands/config/index.ts`
- Modify: `packages/cli/src/commands/config/index.test.ts`
- Modify: `packages/cli/src/config/oat-config.test.ts`
- Modify: `packages/cli/src/providers/identity/availability.test.ts`
- Add: `packages/cli/src/providers/codex/codec/catalog.ts`
- Add: `packages/cli/src/providers/codex/codec/catalog.test.ts`
- Modify: `packages/cli/src/providers/codex/codec/shared.ts`
- Modify: `packages/cli/src/providers/codex/codec/config-merge.ts`
- Modify: `packages/cli/src/providers/codex/codec/config-merge.test.ts`
- Modify: `packages/cli/src/providers/codex/codec/sync-extension.ts`
- Modify: `packages/cli/src/providers/codex/codec/sync-extension.test.ts`
- Modify: `packages/cli/src/commands/providers/codex/materialize.ts`
- Modify: `packages/cli/src/commands/providers/codex/materialize.test.ts`
- Modify: `packages/cli/src/commands/sync/index.ts`
- Modify: `packages/cli/src/commands/sync/index.test.ts`
- Modify: `packages/cli/src/commands/status/index.ts`
- Modify: `packages/cli/src/commands/status/index.test.ts`
- Regenerate: `.codex/config.toml`
- Regenerate: `.codex/agents/oat-phase-implementer-*.toml`
- Regenerate: `.codex/agents/oat-reviewer-*.toml`
- Modify: `apps/oat-docs/docs/cli-utilities/configuration.md`
- Modify: `apps/oat-docs/docs/provider-sync/providers.md`

**Steps:**

1. Add an immutable supported Codex target catalogue: Luna and Terra at `low`, `medium`, `high`, and `xhigh`; Sol at those efforts plus `max`. Deterministically expand all 13 targets for both implementer and reviewer roles, yielding exactly 26 committed project variants and stable `.codex/config.toml` registrations.
2. Distinguish generated ownership as `supported-catalogue`, `user-config`, or `project-config`. Reconcile user-config custom targets only under `~/.codex`; reconcile project-config custom targets only under the project's `.codex` view and treat that output as version-controlled project state.
3. Make `oat sync --scope user|project|all` apply the corresponding reconciliation passes. Scope cleanup to matching ownership markers so a sync cannot remove supported roles, roles from another config scope, or unrelated provider entries. Use the same scoped reconciler best-effort from config mutation where practical without making hot reload a correctness requirement.
4. Replace effort-only recommended Codex cells with the confirmed ladder: `economy -> gpt-5.6-luna/high`, `balanced -> gpt-5.6-terra/xhigh`, `high -> gpt-5.6-sol/high`, and `frontier -> gpt-5.6-sol/max`. Set the recommended Claude ladder to `economy/balanced -> sonnet`, `high -> opus`, and `frontier -> fable`.
5. Change default adoption to recursively fill missing provider/tier cells while preserving existing explicit values, including the exact configured Cursor strings and custom Claude/Codex cells. Keep destructive replacement, if retained, behind a separately explicit operation.
6. Cover exact catalogue membership, stable/idempotent generation, user/project/all scope routing, ownership-safe cleanup, fresh and partial adoption, custom-value preservation, and every recommended Claude and Codex cell.

**Verify:**

```bash
pnpm --filter @open-agent-toolkit/cli exec vitest run src/commands/config/index.test.ts src/config/oat-config.test.ts src/providers/identity/availability.test.ts src/providers/codex/codec/catalog.test.ts src/providers/codex/codec/config-merge.test.ts src/providers/codex/codec/sync-extension.test.ts src/commands/providers/codex/materialize.test.ts src/commands/sync/index.test.ts src/commands/status/index.test.ts
pnpm --filter @open-agent-toolkit/cli type-check
```

**Commit:** `fix(codex): sync pinned roles by configuration scope`

---

### Task p00-t03: Use deterministic pinned dispatch across workflow reviews

**Files:**

- Modify: `.agents/skills/oat-project-implement/SKILL.md`
- Modify: `.agents/skills/oat-project-plan/SKILL.md`
- Modify: `.agents/skills/oat-project-quick-start/SKILL.md`
- Modify: `.agents/skills/oat-project-import-plan/SKILL.md`
- Modify: `.agents/skills/oat-project-plan-writing/SKILL.md`
- Modify: `.agents/skills/oat-project-review-provide/SKILL.md`
- Modify: `packages/cli/src/providers/codex/codec/sync-extension.test.ts`
- Modify: `packages/cli/src/commands/sync/index.test.ts`
- Modify: `packages/cli/src/validation/skills.test.ts`
- Modify: `apps/oat-docs/docs/workflows/projects/dispatch-ceiling.md`
- Modify: `apps/oat-docs/docs/workflows/projects/implementation-execution.md`
- Modify: `apps/oat-docs/docs/provider-sync/providers.md`

**Steps:**

1. Require every plan-producing path to treat a missing active-provider cell as unresolved, show complete recommended defaults, persist the selected setup, and re-run the resolver before implementation readiness.
2. Route spec-driven, quick-start, import-plan, provider-plan import, implementation phases, artifact reviews, and phase/final reviews through the same resolver-selected role contract.
3. For managed Codex dispatch, use the exact registered implementer/reviewer variant when the host supports role selection. When the current host cannot select it, launch a fresh Codex child with explicit model, reasoning effort, and canonical role instructions; do not require provider restart or workflow-time materialization.
4. Permit a base Codex role only for explicit inherit/default and documented managed-uncapped reviewer behavior. Missing managed targets must prompt or block, and unavailable role selection must never silently downgrade to the base reviewer.
5. Add workflow contract tests for all plan-writing paths, implementation and review dispatch, registered-role selection, pinned-child fallback, and the absence of generic managed fallback. Keep exact Cursor model-string compilation coverage in p00-t01.
6. Defer the single PR-scoped version bumps for `oat-project-implement`, `oat-project-review-provide`, `oat-project-plan-writing`, `oat-project-plan`, `oat-project-quick-start`, and `oat-project-import-plan` until each skill's final edit later in the PR.

**Verify:**

```bash
pnpm --filter @open-agent-toolkit/cli exec vitest run src/providers/codex/codec/sync-extension.test.ts src/commands/sync/index.test.ts src/validation/skills.test.ts
pnpm run oat:validate-skills
pnpm docs:check-links
```

**Commit:** `fix(workflow): pin managed review dispatch targets`

---

## Phase 1: Configured Invocation Provenance

### Task p01-t01: Add minimal exec-target invocation metadata

**Files:**

- Modify: `packages/cli/src/config/oat-config.ts`
- Modify: `packages/cli/src/config/oat-config.test.ts`
- Modify: `packages/cli/src/config/resolve.ts`
- Modify: `packages/cli/src/config/resolve.test.ts`

**Steps:**

1. Add `ExecTargetInvocation` with model/reasoning-effort values and the reserved `provider-default` sentinel.
2. Normalize, clone, and layer-merge nested invocation fields while preserving target tombstones and unrelated partial overrides.
3. Declare honest provider-default invocation values on built-in targets where OAT intentionally leaves controls to the provider; do not infer values from command parsing.
4. Cover explicit values, provider defaults, omission/unknown semantics, malformed values, and cross-layer overrides.

**Verify:**

```bash
pnpm --filter @open-agent-toolkit/cli exec vitest run src/config/oat-config.test.ts src/config/resolve.test.ts
pnpm --filter @open-agent-toolkit/cli type-check
```

**Commit:** `feat(gate): add configured invocation metadata`

---

### Task p01-t02: Add target mutation and inspection APIs

**Files:**

- Modify: `packages/cli/src/commands/gate/index.ts`
- Modify: `packages/cli/src/commands/gate/index.test.ts`
- Modify: `packages/cli/src/config/resolve.ts`
- Modify: `packages/cli/src/config/resolve.test.ts`
- Modify: `apps/oat-docs/docs/reference/cli-reference.md`

**Steps:**

1. Extend `oat gate target set` with optional invocation model and reasoning-effort flags.
2. Add a provenance-preserving resolved-target view, then expose it through `oat gate target list --json` with origin, explicit configuration, enabled/available state, and normalized invocation metadata.
3. Ensure built-in-only definitions are distinguishable and availability checks do not select or execute a reviewer.

**Verify:**

```bash
pnpm --filter @open-agent-toolkit/cli exec vitest run src/commands/gate/index.test.ts src/config/resolve.test.ts
pnpm run cli -- --json gate target list
```

**Commit:** `feat(gate): inspect configured review targets`

---

### Task p01-t03: Assemble and emit gate invocation provenance

**Files:**

- Modify: `packages/cli/src/commands/gate/index.ts`
- Modify: `packages/cli/src/commands/gate/index.test.ts`

**Steps:**

1. Generate the run ID before prompt assembly and derive an immutable configured invocation record after target selection.
2. Inject exact run ID, target ID, runtime, model, effort, and source values into the review prompt without parsing opaque base commands.
3. Add `gateInvocation` to success and post-selection failure JSON while preserving existing `target`, `project`, and review `invocation` fields.
4. Cover the live user-config shapes without parsing their commands: Codex `gpt-5.6-sol` with `max` effort, Claude `fable`, Cursor `gpt-5.6-sol-max`, Cursor `claude-fable-5-xhigh`, and unknown/default targets.

**Verify:**

```bash
pnpm --filter @open-agent-toolkit/cli exec vitest run src/commands/gate/index.test.ts
pnpm --filter @open-agent-toolkit/cli type-check
```

**Commit:** `feat(gate): emit invocation provenance`

---

### Task p01-t04: Stamp, parse, and validate invocation metadata

**Files:**

- Modify: `packages/cli/src/commands/gate/review-verdict.ts`
- Modify: `packages/cli/src/commands/gate/review-verdict.test.ts`
- Modify: `packages/cli/src/commands/gate/index.ts`
- Modify: `packages/cli/src/commands/gate/index.test.ts`
- Modify: `.agents/agents/oat-reviewer.md`
- Modify: `.agents/skills/oat-project-review-provide/SKILL.md`
- Modify: `packages/cli/src/validation/skills.test.ts`
- Modify: `apps/oat-docs/docs/cli-utilities/workflow-gates.md`
- Modify: `apps/oat-docs/docs/workflows/projects/reviews.md`
- Modify: `apps/oat-docs/docs/workflows/projects/artifacts.md`

**Steps:**

1. Add gate-only artifact fields for run ID, target, runtime, invocation model/effort, and source to reviewer guidance and templates.
2. Extend the YAML-aware verdict parser without breaking existing manual/auto artifacts.
3. Validate artifact invocation fields against the gate-owned record before applying severity thresholds; keep optional self-report identity separate and non-authoritative.
4. Document the gate-only frontmatter fields plus additive `gateInvocation` and `corroboration` JSON structures in workflow-gate, review, and artifact references.
5. Bump changed canonical agent/skill versions once and add contract coverage.

**Verify:**

```bash
pnpm --filter @open-agent-toolkit/cli exec vitest run src/commands/gate/review-verdict.test.ts src/commands/gate/index.test.ts src/validation/skills.test.ts
pnpm run oat:validate-skills
pnpm docs:check-links
```

**Commit:** `feat(review): corroborate gate invocation metadata`

---

## Phase 2: Declared Review Target Safety

> **Phase review note:** p02 intentionally defers the single PR-scoped version bumps for `oat-project-plan`, `oat-project-quick-start`, and `oat-project-import-plan` until their final edits in p04-t02. Do not flag those interim versions as missing bumps.

### Task p02-t01: Expose review-project resolution provenance

**Files:**

- Modify: `packages/cli/src/commands/gate/index.ts`
- Modify: `packages/cli/src/commands/gate/index.test.ts`

**Steps:**

1. Return `{ path, source }` from project resolution with `declared`, `active-project`, and `single-candidate` sources.
2. Preserve current explicit-name/path precedence and legacy ambient resolution.
3. Include project source in prompt context and every applicable JSON outcome.

**Verify:**

```bash
pnpm --filter @open-agent-toolkit/cli exec vitest run src/commands/gate/index.test.ts
```

**Commit:** `feat(gate): expose review project provenance`

---

### Task p02-t02: Correlate artifacts and reject project mismatches

**Files:**

- Modify: `packages/cli/src/commands/gate/review-verdict.ts`
- Modify: `packages/cli/src/commands/gate/review-verdict.test.ts`
- Modify: `packages/cli/src/commands/gate/index.ts`
- Modify: `packages/cli/src/commands/gate/index.test.ts`

**Steps:**

1. Locate the produced artifact by gate run ID across active project review directories, retaining before/after snapshots only as compatibility diagnostics.
2. Compare containing project and parsed `oat_project` with an explicitly declared normalized project.
3. Fail closed for missing/mismatched run or project identity with structured expected/actual output, a non-remediable targeting class, and no receive-eligible handoff.
4. Cover sibling-project writes, wrong frontmatter, missing run correlation, matching declarations, and ambient legacy behavior.

**Verify:**

```bash
pnpm --filter @open-agent-toolkit/cli exec vitest run src/commands/gate/review-verdict.test.ts src/commands/gate/index.test.ts
pnpm --filter @open-agent-toolkit/cli type-check
```

**Commit:** `fix(gate): reject mismatched review projects`

---

### Task p02-t03: Declare lifecycle review subjects in guidance

**Files:**

- Modify: `.agents/skills/oat-project-plan/SKILL.md`
- Modify: `.agents/skills/oat-project-quick-start/SKILL.md`
- Modify: `.agents/skills/oat-project-import-plan/SKILL.md`
- Modify: `.agents/skills/oat-project-implement/SKILL.md`
- Modify: `packages/cli/src/validation/skills.test.ts`
- Modify: `apps/oat-docs/docs/cli-utilities/workflow-gates.md`
- Modify: `apps/oat-docs/docs/contributing/skills.md`

**Steps:**

1. Update lifecycle gate configuration/examples to include `--project "$PROJECT_PATH"` after each skill resolves `PROJECT_PATH`, while preserving exact configured-command execution.
2. Keep provider/model `--target` absent from reusable lifecycle commands and examples.
3. Explain declared versus ambient project resolution, mismatch failures, invalid-artifact handoff behavior, and manual/debug exceptions.
4. Add migration guidance for existing user-level lifecycle commands that currently say "current project": insert `--project "$PROJECT_PATH"` while retaining target-neutral provider selection.
5. Bump `oat-project-implement` once in this task, covering both its p00-t03 deterministic-dispatch edits and this task's lifecycle-gate guidance. Defer the single PR-scoped bumps for plan, quick-start, and import-plan until their final edits in p04-t02; add cross-skill contract tests here without interim bumps.

**Verify:**

```bash
pnpm --filter @open-agent-toolkit/cli exec vitest run src/validation/skills.test.ts
pnpm run oat:validate-skills
pnpm docs:check-links
```

**Commit:** `docs(gate): declare lifecycle review subjects`

---

## Phase 3: Aggregated Producer Provenance

### Task p03-t01: Make final and range aggregation explicit

**Files:**

- Modify: `packages/cli/src/commands/gate/index.ts`
- Modify: `packages/cli/src/commands/gate/index.test.ts`
- Modify: `apps/oat-docs/docs/cli-utilities/workflow-gates.md`
- Modify: `apps/oat-docs/docs/workflows/projects/reviews.md`

**Steps:**

1. Distinguish exact `stamp` from `aggregated-stamps` producer sources.
2. Report contributing scopes/count and keep `avoidFamilies` as the authoritative deduplicated union rather than implying the latest producer represents the aggregate.
3. Add contiguous-range coverage and preserve exact single-phase and explicit-flag precedence.

**Verify:**

```bash
pnpm --filter @open-agent-toolkit/cli exec vitest run src/commands/gate/index.test.ts
pnpm docs:check-links
```

**Commit:** `fix(gate): report aggregated producer provenance`

---

## Phase 4: Opt-In Phase Review Setup

### Task p04-t01: Define the shared phase-review setup contract

**Files:**

- Modify: `.agents/skills/oat-project-plan-writing/SKILL.md`
- Modify: `packages/cli/src/validation/skills.test.ts`

**Steps:**

1. Add a shared post-phase-ID setup procedure that preserves explicit existing settings, probes `oat gate target list --json`, and prompts only for explicitly configured, enabled, available targets.
2. Define all-phases, selected-phases, and disabled choices using the existing `oat_phase_review_gate` shape.
3. Validate selected phase IDs, specify non-interactive/probe-failure behavior, and keep the setting independent from HiLL checkpoints.
4. Bump the plan-writing skill version once and add contract tests.

**Verify:**

```bash
pnpm --filter @open-agent-toolkit/cli exec vitest run src/validation/skills.test.ts
pnpm run oat:validate-skills
```

**Commit:** `feat(plan): add phase review setup contract`

---

### Task p04-t02: Wire phase-review setup into every plan path

**Files:**

- Modify: `.agents/skills/oat-project-plan/SKILL.md`
- Modify: `.agents/skills/oat-project-quick-start/SKILL.md`
- Modify: `.agents/skills/oat-project-import-plan/SKILL.md`
- Modify: `packages/cli/src/validation/skills.test.ts`
- Modify: `apps/oat-docs/docs/workflows/projects/artifacts.md`
- Modify: `apps/oat-docs/docs/workflows/projects/reviews.md`
- Modify: `apps/oat-docs/docs/workflows/projects/lifecycle.md`

**Steps:**

1. Invoke the shared setup after stable phase IDs and before plan artifact review in spec-driven, quick, and import workflows; document provider-plan mode as inheriting import behavior.
2. Preserve resumed/imported explicit values without re-prompting and leave disabled behavior unchanged when no target qualifies or the user declines.
3. Apply the single PR-scoped version bumps for plan, quick-start, and import-plan, covering their p00-t03 dispatch-readiness edits, p02 guidance edits, and final p04 setup edits; add all-path/no-prompt/preservation contract tests.

**Verify:**

```bash
pnpm --filter @open-agent-toolkit/cli exec vitest run src/validation/skills.test.ts
pnpm run oat:validate-skills
pnpm docs:check-links
```

**Commit:** `feat(plan): enable phase review setup across workflows`

---

### Task p04-t03: Sync, package, and validate the shipped surface

**Files:**

- Modify: `packages/cli/package.json`
- Modify: `packages/control-plane/package.json`
- Modify: `packages/docs-config/package.json`
- Modify: `packages/docs-theme/package.json`
- Modify: `packages/docs-transforms/package.json`
- Modify: `pnpm-lock.yaml`
- Regenerate: provider-linked skill/agent views managed by `oat sync`
- Regenerate: `packages/cli/assets/public-package-versions.json`

**Steps:**

1. Run `pnpm run cli -- sync --scope all` and review generated provider-view changes for canonical parity.
2. Bump the five public packages together to the next patch version and refresh the lockfile/bundled public-package metadata.
3. Run focused and full workspace validation, docs build/link checks, skill validation, and the publishable-package release guardrail.

**Verify:**

```bash
pnpm run cli -- sync --scope all
pnpm run oat:validate-skills
pnpm lint
pnpm format
pnpm type-check
pnpm test
pnpm build
pnpm build:docs
pnpm docs:check-links
pnpm release:validate
git status --short
```

**Commit:** `chore(release): validate gate provenance and phase review setup`

---

## Reviews

| Scope  | Type     | Status  | Date       | Artifact                                                    |
| ------ | -------- | ------- | ---------- | ----------------------------------------------------------- |
| p00    | code     | pending | -          | -                                                           |
| p01    | code     | pending | -          | -                                                           |
| p02    | code     | pending | -          | -                                                           |
| p03    | code     | pending | -          | -                                                           |
| p04    | code     | pending | -          | -                                                           |
| final  | code     | pending | -          | -                                                           |
| spec   | artifact | pending | -          | -                                                           |
| design | artifact | pending | -          | -                                                           |
| plan   | artifact | passed  | 2026-07-10 | reviews/archived/artifact-plan-review-2026-07-10T014435Z.md |
| plan   | artifact | passed  | 2026-07-10 | reviews/archived/artifact-plan-review-2026-07-10T024822Z.md |
| plan   | artifact | passed  | 2026-07-10 | reviews/archived/artifact-plan-review-2026-07-10T052617Z.md |

**Status values:** `pending` -> `received` -> `fixes_added` -> `fixes_completed` -> `passed`

## Implementation Complete

**Summary:**

- Phase 0: 3 tasks - fail-closed dispatch readiness, committed/scoped pinned roles, and deterministic workflow dispatch
- Phase 1: 4 tasks - configured invocation metadata, inspection, prompt/JSON provenance, and artifact validation
- Phase 2: 3 tasks - project resolution provenance, fail-closed target corroboration, and lifecycle guidance
- Phase 3: 1 task - explicit final/range producer aggregation provenance
- Phase 4: 3 tasks - shared opt-in setup, all plan paths, and release validation

**Total: 14 tasks**

Ready for implementation after the revised plan artifact review passes.

## References

- Design: `design.md`
- Discovery: `discovery.md`
- Backlog: `BL-260707-record-gate-review-model`
- Backlog: `BL-260707-declare-gate-review-target`
- Backlog: `BL-260707-support-producer-identity`
- Backlog: `BL-260707-ask-to-enable-phase-review`
- Prerequisite regression: managed Codex dispatch readiness and pre-session pinned-role availability discovered during implementation preflight
