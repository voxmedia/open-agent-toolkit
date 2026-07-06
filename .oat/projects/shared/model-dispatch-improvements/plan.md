---
oat_status: complete
oat_ready_for: oat-project-implement
oat_blockers: []
oat_last_updated: 2026-07-05
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

# Implementation Plan: model-dispatch-improvements

> Execute this plan using `oat-project-implement`.

**Goal:** Replace ambiguous dispatch-ceiling behavior with an explicit dispatch policy contract: managed capped tiers, managed uncapped selection, and host-default inheritance.

**Architecture:** Add a durable dispatch policy model, compile it through the existing resolver/provider-adapter boundary, then update lifecycle prompts, docs, and shipped assets so user-facing copy matches behavior.

**Tech Stack:** TypeScript CLI, OAT config/state frontmatter, provider ceiling adapters, bundled Markdown skills/docs, Vitest, oxlint/oxfmt, Turborepo.

**Commit Convention:** `type(pNN-tNN): description`

## Planning Checklist

- [x] Captured quick discovery decisions
- [x] Produced lightweight design
- [x] Evaluated phases for parallelism opportunities
- [x] Set `oat_plan_parallel_groups` in frontmatter
- [x] Persisted dispatch ceiling for this project (`maximum`)

## Parallelism

This plan is intentionally sequential. Phase 1 establishes the config/data-model vocabulary that Phase 2 consumes in resolver semantics. Phase 3 updates lifecycle skills, docs, templates, and generated assets after the resolver contract is stable. Phase 4 performs release/package validation after all shipped surfaces have settled. Running these phases in parallel would create overlapping edits in config docs, skill copies, generated assets, and package metadata.

`oat_plan_parallel_groups: []`

## Phase 1: Dispatch Policy Model and Presets

Establish the durable vocabulary for managed capped tiers, managed uncapped selection, and host-default inheritance while preserving legacy dispatch-ceiling compatibility.

### Task p01-t01: Add Dispatch Policy Config Types

**Files:**

- Modify: `packages/cli/src/config/oat-config.ts`
- Modify: `packages/cli/src/config/oat-config.test.ts`
- Modify as needed: `packages/cli/src/config/resolve.ts`

**Scope:**

- Add typed config/state concepts for dispatch policy mode: `managed` and `inherit`.
- Add managed policy names: `economy`, `balanced`, `high`, `frontier`, and `uncapped`.
- Keep existing `workflow.dispatchCeiling` values readable as capped managed compatibility input.
- Ensure absent policy/ceiling state remains unresolved or legacy-compatible, not implicitly `uncapped`.

**Verification:**

```bash
pnpm --filter @open-agent-toolkit/cli test -- src/config/oat-config.test.ts
```

**Commit:** `feat(p01-t01): add dispatch policy config model`

### Task p01-t02: Add Policy Preset Compilation

**Files:**

- Modify: `packages/cli/src/config/dispatch-ceiling-preset.ts`
- Modify: `packages/cli/src/config/dispatch-ceiling-preset.test.ts`

**Scope:**

- Add managed policy compilation for `economy`, `balanced`, `high`, `frontier`, and `uncapped`.
- Compile the capped managed policies as:
  - `economy` -> Codex `medium`, Claude `sonnet`
  - `balanced` -> Codex `high`, Claude `sonnet`
  - `high` -> Codex `xhigh`, Claude `opus`
  - `frontier` -> Codex `xhigh`, Claude `fable`
- Preserve legacy `balanced`, `maximum`, and `cost-conscious` preset compatibility.
- Treat legacy `maximum` as the compatibility spelling for `high`, and legacy `cost-conscious` as the compatibility spelling for `economy`.
- Map `frontier` to Claude `fable`; keep Codex mapped to the highest currently supported effort (`xhigh`) until a concrete frontier Codex value exists.
- Represent `uncapped` explicitly without compiling it into concrete provider caps.

**Verification:**

```bash
pnpm --filter @open-agent-toolkit/cli test -- src/config/dispatch-ceiling-preset.test.ts
```

**Commit:** `feat(p01-t02): add dispatch policy presets`

### Task p01-t03: Expose Dispatch Policy Config Commands

**Files:**

- Modify: `packages/cli/src/commands/config/index.ts`
- Modify: `packages/cli/src/commands/config/index.test.ts`
- Modify if snapshots change: `packages/cli/src/commands/help-snapshots.test.ts`

**Scope:**

- Add config catalog entries, validation, and descriptions for the new dispatch policy keys.
- Keep legacy dispatch-ceiling keys available and documented as compatibility aliases or legacy surfaces.
- Ensure `oat config get/list/describe/set` provides clear output for managed policies, `uncapped`, and inherit/default mode.

**Verification:**

```bash
pnpm --filter @open-agent-toolkit/cli test -- src/commands/config/index.test.ts src/commands/help-snapshots.test.ts
```

**Commit:** `feat(p01-t03): expose dispatch policy config`

### Task p01-t04: Update Provider Value Registries

**Files:**

- Modify: `packages/cli/src/providers/ceiling/registry.ts`
- Modify: `packages/cli/src/providers/ceiling/registry.test.ts`
- Modify as needed: `packages/cli/src/config/oat-config.ts`

**Scope:**

- Add Claude `fable` as the Frontier model tier.
- Update Claude tier ordering and verify-on-upgrade behavior to include `fable`.
- Keep Codex effort values unchanged unless the provider registry already exposes a new concrete frontier effort.
- Update provider tests for valid values and model argument compilation.

**Verification:**

```bash
pnpm --filter @open-agent-toolkit/cli test -- src/providers/ceiling/registry.test.ts
```

**Commit:** `feat(p01-t04): add frontier provider tiers`

## Phase 2: Resolver Semantics

Teach the dispatch resolver to compile managed capped, managed uncapped, and inherit/default behavior into honest provider dispatch args and logs.

### Task p02-t01: Read Project Dispatch Policy State

**Files:**

- Modify: `packages/cli/src/commands/project/dispatch-ceiling/index.ts`
- Modify: `packages/cli/src/commands/project/dispatch-ceiling/index.test.ts`

**Scope:**

- Add parser support for explicit project `oat_dispatch_policy` frontmatter.
- Keep fallback support for legacy `oat_dispatch_ceiling`.
- Preserve source/preset provenance for compatibility.
- Add tests proving absent state remains unresolved and legacy state remains capped managed behavior.

**Verification:**

```bash
pnpm --filter @open-agent-toolkit/cli test -- src/commands/project/dispatch-ceiling/index.test.ts
```

**Commit:** `feat(p02-t01): read dispatch policy project state`

### Task p02-t02: Implement Capped, Uncapped, and Inherit Selection

**Files:**

- Modify: `packages/cli/src/commands/project/dispatch-ceiling/index.ts`
- Modify: `packages/cli/src/commands/project/dispatch-ceiling/index.test.ts`

**Scope:**

- For capped managed implementer/fix dispatch, keep `selected = min(preferred, ceiling)`.
- For managed `uncapped`, select the preferred implementer/fix value when provider controls support it.
- Confirm whether Codex pinned variants can select an effort above the current host/session default; if not, preserve honest resolver metadata and log/document the runtime caveat.
- For inherit/default mode, return no selected dispatch args and log inherited/provider-default behavior.
- Keep reviewer dispatch targeting configured capped policy values, and make reviewer behavior explicit for `uncapped` and inherit/default where no target exists.

**Verification:**

```bash
pnpm --filter @open-agent-toolkit/cli test -- src/commands/project/dispatch-ceiling/index.test.ts
```

**Commit:** `feat(p02-t02): resolve managed dispatch policies`

### Task p02-t03: Update Resolver Output and Errors

**Files:**

- Modify: `packages/cli/src/commands/project/dispatch-ceiling/index.ts`
- Modify: `packages/cli/src/commands/project/dispatch-ceiling/index.test.ts`

**Scope:**

- Extend `selection` metadata so consumers can distinguish capped, uncapped, review-target, and inherit/default outcomes.
- Update human-readable output from "dispatch ceiling" wording toward "dispatch policy" where appropriate.
- Keep non-interactive unresolved behavior for absent/ambiguous state.
- Ensure invalid policy values report clear valid-value guidance.

**Verification:**

```bash
pnpm --filter @open-agent-toolkit/cli test -- src/commands/project/dispatch-ceiling/index.test.ts
```

**Commit:** `fix(p02-t03): clarify dispatch policy resolution output`

### Task p02-t04: Cover Provider-Specific Resolver Cases

**Files:**

- Modify: `packages/cli/src/commands/project/dispatch-ceiling/index.test.ts`

**Scope:**

- Add regression cases for Codex uncapped preferred effort selecting pinned variants.
- Capture any Codex host/session-default limitation discovered while testing uncapped pinned variants so the docs do not imply unsupported upward selection.
- Add regression cases for Claude uncapped preferred model selecting Task `model`, including `fable`.
- Add inherit/default cases for Codex and Claude returning no dispatch args.
- Add unsupported-provider behavior for managed capped and uncapped policies.

**Verification:**

```bash
pnpm --filter @open-agent-toolkit/cli test -- src/commands/project/dispatch-ceiling/index.test.ts
```

**Commit:** `test(p02-t04): cover dispatch policy resolver cases`

## Phase 3: Lifecycle Skills, Templates, and Docs

Update all shipped instruction and documentation surfaces so agents and users apply the same dispatch policy contract.

### Task p03-t01: Update Planning Policy Prompts

**Files:**

- Modify: `.agents/skills/oat-project-plan/SKILL.md`
- Modify: `.agents/skills/oat-project-quick-start/SKILL.md`

**Scope:**

- Replace current dispatch-ceiling prompt copy with dispatch-policy wording.
- Present managed choices `Economy`, `Balanced`, `High`, `Frontier`, `Uncapped`, and separate `Inherit Host Defaults`.
- Persist explicit policy state for `Uncapped` and inherit/default mode.
- Bump each changed skill frontmatter `version:`.

**Verification:**

```bash
pnpm run oat:validate-skills
```

**Commit:** `docs(p03-t01): update planning dispatch policy prompts`

### Task p03-t02: Update Implementation Dispatch Instructions

**Files:**

- Modify: `.agents/skills/oat-project-implement/SKILL.md`

**Scope:**

- Update runtime dispatch selection rules for capped managed, uncapped managed, and inherit/default mode.
- Keep Codex payload-first assertions tied to pinned variants.
- Keep Claude model-axis selection via Task `model` and `effort_axis=not-applicable`.
- Clarify review behavior when capped policy exists vs when policy is `Uncapped` or inherit/default.
- Bump skill frontmatter `version:`.

**Verification:**

```bash
pnpm run oat:validate-skills
```

**Commit:** `docs(p03-t02): update implementation dispatch policy rules`

### Task p03-t03: Update Templates and Plan-Writing Guidance

**Files:**

- Modify: `.agents/skills/oat-project-plan-writing/SKILL.md`
- Modify: `.oat/templates/plan.md`
- Modify: `.oat/templates/state.md`
- Modify as needed: `.agents/agents/oat-phase-implementer.md`, `.agents/agents/oat-reviewer.md`

**Scope:**

- Update Dispatch Profile allowed Claude values to include `fable`.
- Update template comments from dispatch ceiling to dispatch policy where appropriate.
- Clarify that provider defaults are only for inherit/default or base/unpinned fallback paths.
- Bump changed skill versions where required.

**Verification:**

```bash
pnpm run oat:validate-skills
```

**Commit:** `docs(p03-t03): align dispatch policy templates`

### Task p03-t04: Update Docs Site Content

**Files:**

- Modify: `apps/oat-docs/docs/workflows/projects/dispatch-ceiling.md`
- Modify: `apps/oat-docs/docs/workflows/projects/implementation-execution.md`
- Modify: `apps/oat-docs/docs/cli-utilities/configuration.md`
- Modify: `apps/oat-docs/docs/reference/oat-directory-structure.md`
- Modify as needed: related workflow index pages

**Scope:**

- Document dispatch policy terminology and legacy dispatch-ceiling compatibility.
- Explain `Economy`, `Balanced`, `High`, `Frontier`, `Uncapped`, and `Inherit Host Defaults`.
- Explain cap-vs-target behavior for implementers/fix loops/reviewers.
- Explain provider-specific enforcement, Claude model-only Task dispatch, and any Codex host/session-default caveat discovered during resolver testing.

**Verification:**

```bash
pnpm run cli -- docs generate-index
pnpm build:docs
```

**Commit:** `docs(p03-t04): document dispatch policy model`

### Task p03-t05: Regenerate Bundled Assets and Provider Views

**Files:**

- Modify generated/provider assets as produced by commands:
  - `packages/cli/assets/**`
  - `.claude/**`
  - `.cursor/**`
  - `.codex/**`
  - `.oat/sync/manifest.json`

**Scope:**

- Run provider sync after canonical skill/template/agent updates.
- Run the CLI asset bundling path so shipped `packages/cli/assets` mirrors canonical docs/skills/templates.
- Inspect diffs to ensure generated outputs match the canonical changes and no unrelated drift is introduced.

**Verification:**

```bash
pnpm run cli -- sync --scope all
pnpm run cli -- --help >/dev/null
git diff --check
```

**Commit:** `chore(p03-t05): sync dispatch policy assets`

## Phase 4: Validation, Release Metadata, and Handoff

Run the required checks for a shipped CLI/docs/skill change and prepare the branch for implementation handoff.

### Task p04-t01: Run Targeted Dispatch Policy Tests

**Files:**

- Modify tests only if failures identify missing coverage or incorrect expectations.

**Scope:**

- Run targeted tests for config, preset compilation, provider registry, resolver, and config command behavior.
- Fix any failures within the changed contract.

**Verification:**

```bash
pnpm --filter @open-agent-toolkit/cli test -- \
  src/config/oat-config.test.ts \
  src/config/dispatch-ceiling-preset.test.ts \
  src/providers/ceiling/registry.test.ts \
  src/commands/project/dispatch-ceiling/index.test.ts \
  src/commands/config/index.test.ts \
  src/commands/help-snapshots.test.ts
```

**Commit:** `test(p04-t01): validate dispatch policy behavior`

### Task p04-t02: Run Workspace Quality Gates

**Files:**

- Modify source/tests/docs only if workspace checks reveal issues.

**Scope:**

- Run type-check, lint, formatting, skill validation, and docs build.
- Fix failures caused by this project.

**Verification:**

```bash
pnpm --filter @open-agent-toolkit/cli type-check
pnpm --filter @open-agent-toolkit/cli lint
pnpm format
pnpm run oat:validate-skills
pnpm build:docs
```

**Commit:** `chore(p04-t02): satisfy dispatch policy quality gates`

### Task p04-t03: Bump Public Package Versions and Validate Release

**Files:**

- Modify: `packages/cli/package.json`
- Modify: `packages/control-plane/package.json`
- Modify: `packages/docs-config/package.json`
- Modify: `packages/docs-theme/package.json`
- Modify: `packages/docs-transforms/package.json`
- Modify: `packages/cli/assets/public-package-versions.json`

**Scope:**

- Bump the lockstep public package set because CLI behavior, bundled skills, docs, and assets are shipped surfaces.
- Run release validation.
- Fix any release metadata mismatch.

**Verification:**

```bash
pnpm release:validate
git diff --check
```

**Commit:** `chore(p04-t03): bump public packages for dispatch policy`

## Reviews

Plan gate review findings were resolved in plan scope.

| Scope | Type     | Status  | Date       | Artifact                                            |
| ----- | -------- | ------- | ---------- | --------------------------------------------------- |
| plan  | artifact | passed  | 2026-07-05 | reviews/archived/artifact-plan-review-2026-07-05.md |
| p01   | code     | passed  | 2026-07-06 | reviews/archived/p01-review-2026-07-06-v2.md        |
| p02   | code     | passed  | 2026-07-06 | reviews/archived/p02-review-2026-07-06-v2.md        |
| p03   | code     | pending | n/a        | n/a                                                 |
| p04   | code     | pending | n/a        | n/a                                                 |
| final | code     | pending | n/a        | n/a                                                 |

## Implementation Complete

Implementation is complete when all four phases pass review and the release validation command succeeds.

| Phase | Tasks | Status   |
| ----- | ----- | -------- |
| p01   | 4     | complete |
| p02   | 4     | complete |
| p03   | 5     | pending  |
| p04   | 3     | pending  |

**Total:** 16 tasks.

## References

- Discovery: `.oat/projects/shared/model-dispatch-improvements/discovery.md`
- Design: `.oat/projects/shared/model-dispatch-improvements/design.md`
- Existing resolver: `packages/cli/src/commands/project/dispatch-ceiling/index.ts`
- Existing provider registry: `packages/cli/src/providers/ceiling/registry.ts`
- Current dispatch docs: `apps/oat-docs/docs/workflows/projects/dispatch-ceiling.md`
