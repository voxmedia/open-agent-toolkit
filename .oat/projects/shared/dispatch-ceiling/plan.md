---
oat_status: complete
oat_ready_for: oat-project-implement
oat_blockers: []
oat_last_updated: 2026-05-24
oat_phase: plan
oat_phase_status: complete
oat_plan_hill_phases: ['p04']
oat_auto_review_at_hill_checkpoints: true
oat_plan_parallel_groups: []
oat_plan_source: quick
oat_import_reference: null
oat_import_source_path: null
oat_import_provider: null
oat_generated: false
oat_template: false
---

# Implementation Plan: dispatch-ceiling

> Execute this plan using `oat-project-implement` - sequential, no parallelism declared.

**Goal:** Add provider-aware OAT dispatch ceilings so Codex dispatch is deterministic through pinned variants capped by a user-declared ceiling, while provider defaults remain visible but non-authoritative.

**Architecture:** Config parsing exposes `workflow.dispatchCeiling.<provider>`, project-state frontmatter stores per-project overrides, Codex sync generates pinned implementer/reviewer variants, and OAT lifecycle skills own planning/preflight prompts plus dispatch logging semantics.

**Tech Stack:** TypeScript CLI/config/sync code, Vitest tests, Markdown skills/agents/templates/docs, generated Codex TOML role views.

**Commit Convention:** `{type}(p{NN}-t{NN}): {description}` - e.g., `feat(p01-t01): add dispatch ceiling config keys`

## Planning Checklist

- [x] HiLL checkpoints confirmed from repo default (final phase only)
- [x] `oat_plan_hill_phases` set in frontmatter (`["p04"]`)
- [x] Auto-review at HiLL checkpoints enabled from repo config
- [x] Parallelism evaluated (see Parallelism)
- [x] Lightweight design captured

---

## Parallelism

Sequential, no parallel groups declared.

**Dependency / write-set analysis:**

- p01 establishes config key names, validation, and resolution behavior that p03 skill guidance and p04 docs reference.
- p02 updates Codex generated variants and managed-role behavior; p03 depends on those concrete role names.
- p03 edits multiple lifecycle skills and canonical agents that must agree on one dispatch contract.
- p04 runs sync, docs, versioning, and release validation after all shipped assets settle.

Although p01 and p02 touch mostly separate files, they both affect provider-facing dispatch semantics and test expectations. Keeping them sequential reduces merge/review overhead for this follow-up.

---

## Phase 1: Provider-aware dispatch ceiling config

Add the typed config surface and tests for repo/user/local workflow dispatch ceilings.

### Task p01-t01: Add workflow dispatch ceiling config schema

**Files:**

- Modify: `packages/cli/src/config/oat-config.ts`
- Modify: `packages/cli/src/config/oat-config.test.ts`

**Step 1: Write tests**

Add tests that:

- accept `workflow.dispatchCeiling.codex` values `low`, `medium`, `high`, `xhigh`
- accept `workflow.dispatchCeiling.claude` values `haiku`, `sonnet`, `opus`
- drop invalid provider values during normalization
- round-trip shared, local, and user workflow dispatch ceilings

Run:

```bash
pnpm --filter @open-agent-toolkit/cli exec vitest run src/config/oat-config.test.ts
```

Expected: new tests fail before implementation.

**Step 2: Implement**

Add provider-specific dispatch ceiling types and include `dispatchCeiling` in `OatWorkflowConfig` normalization for shared, local, and user config.

**Step 3: Verify**

```bash
pnpm --filter @open-agent-toolkit/cli exec vitest run src/config/oat-config.test.ts
```

Expected: tests pass.

**Step 4: Commit**

```bash
git add packages/cli/src/config/oat-config.ts packages/cli/src/config/oat-config.test.ts
git commit -m "feat(p01-t01): add dispatch ceiling config schema"
```

---

### Task p01-t02: Resolve dispatch ceiling precedence

**Files:**

- Modify: `packages/cli/src/config/resolve.ts`
- Modify: `packages/cli/src/config/resolve.test.ts`

**Step 1: Write tests**

Add tests that resolve:

- `workflow.dispatchCeiling.codex` with local > shared > user precedence
- `workflow.dispatchCeiling.claude` with local > shared > user precedence
- unset keys as default/null entries

Run:

```bash
pnpm --filter @open-agent-toolkit/cli exec vitest run src/config/resolve.test.ts
```

Expected: new tests fail before implementation.

**Step 2: Implement**

Add dispatch ceiling keys to the default workflow config flattening path so effective config exposes value and source consistently.

**Step 3: Verify**

```bash
pnpm --filter @open-agent-toolkit/cli exec vitest run src/config/resolve.test.ts
```

Expected: tests pass.

**Step 4: Commit**

```bash
git add packages/cli/src/config/resolve.ts packages/cli/src/config/resolve.test.ts
git commit -m "feat(p01-t02): resolve dispatch ceiling precedence"
```

---

### Task p01-t03: Expose dispatch ceiling through oat config

**Files:**

- Modify: `packages/cli/src/commands/config/index.ts`
- Modify: `packages/cli/src/commands/config/index.test.ts`
- Modify: `apps/oat-docs/docs/cli-utilities/configuration.md`
- Modify: `apps/oat-docs/docs/reference/oat-directory-structure.md`

**Step 1: Write tests**

Add command tests for:

- `oat config set workflow.dispatchCeiling.codex high`
- `oat config set workflow.dispatchCeiling.claude sonnet`
- invalid enum rejection
- `oat config describe` listing and detailing the two keys

Run:

```bash
pnpm --filter @open-agent-toolkit/cli exec vitest run src/commands/config/index.test.ts
```

Expected: new tests fail before implementation.

**Step 2: Implement**

Add the two keys to `ConfigKey`, `KEY_ORDER`, workflow enum parsing, catalog descriptions, and get/set handling.

**Step 3: Update docs**

Document the config keys and show a repo-level JSON example.

**Step 4: Verify**

```bash
pnpm --filter @open-agent-toolkit/cli exec vitest run src/commands/config/index.test.ts
```

Expected: tests pass.

**Step 5: Commit**

```bash
git add packages/cli/src/commands/config/index.ts packages/cli/src/commands/config/index.test.ts apps/oat-docs/docs/cli-utilities/configuration.md apps/oat-docs/docs/reference/oat-directory-structure.md
git commit -m "feat(p01-t03): expose dispatch ceiling config keys"
```

---

## Phase 2: Deterministic Codex role variants

Generate all pinned Codex roles needed for deterministic implementer and reviewer dispatch.

### Task p02-t01: Generate Codex implementer xhigh and reviewer effort variants

**Files:**

- Modify: `packages/cli/src/providers/codex/codec/sync-extension.ts`
- Modify: `packages/cli/src/providers/codex/codec/sync-extension.test.ts`

**Step 1: Write tests**

Extend Codex sync tests to assert:

- `oat-phase-implementer-xhigh.toml` is generated with `model_reasoning_effort = "xhigh"`
- `oat-reviewer-low|medium|high|xhigh.toml` are generated from canonical `oat-reviewer.md`
- all generated variants are registered in `.codex/config.toml`
- the plan remains idempotent after apply

Run:

```bash
pnpm --filter @open-agent-toolkit/cli exec vitest run src/providers/codex/codec/sync-extension.test.ts
```

Expected: new tests fail before implementation.

**Step 2: Implement**

Generalize variant generation so both `oat-phase-implementer` and `oat-reviewer` produce low/medium/high/xhigh role files with appropriate descriptions.

**Step 3: Verify**

```bash
pnpm --filter @open-agent-toolkit/cli exec vitest run src/providers/codex/codec/sync-extension.test.ts
```

Expected: tests pass.

**Step 4: Commit**

```bash
git add packages/cli/src/providers/codex/codec/sync-extension.ts packages/cli/src/providers/codex/codec/sync-extension.test.ts
git commit -m "feat(p02-t01): generate codex dispatch effort variants"
```

---

### Task p02-t02: Keep generated Codex variants out of stray detection

**Files:**

- Modify: `packages/cli/src/commands/shared/codex-strays.test.ts`
- Modify: `packages/cli/src/commands/init/index.test.ts`

**Step 1: Write/update tests**

Update managed-role and init/sync expectations to include:

- `oat-phase-implementer-xhigh`
- `oat-reviewer-low`
- `oat-reviewer-medium`
- `oat-reviewer-high`
- `oat-reviewer-xhigh`

Run:

```bash
pnpm --filter @open-agent-toolkit/cli exec vitest run src/commands/shared/codex-strays.test.ts src/commands/init/index.test.ts
```

Expected: tests pass after expectations align with p02-t01.

**Step 2: Commit**

```bash
git add packages/cli/src/commands/shared/codex-strays.test.ts packages/cli/src/commands/init/index.test.ts
git commit -m "test(p02-t02): cover generated codex effort variants"
```

---

## Phase 3: Lifecycle dispatch contract updates

Update planning, implementation, template, and agent guidance to use the OAT-owned ceiling.

### Task p03-t01: Add planning-time dispatch ceiling capture

**Files:**

- Modify: `.agents/skills/oat-project-plan/SKILL.md`
- Modify: `.agents/skills/oat-project-quick-start/SKILL.md`
- Modify: `.agents/skills/oat-project-plan-writing/SKILL.md`
- Modify: `.oat/templates/state.md`
- Modify: `.oat/templates/plan.md`
- Modify: `packages/cli/src/validation/skills.test.ts`

**Step 1: Edit**

Document planning-end behavior:

- resolve repo config first, then `oat_dispatch_ceiling` project state
- if unresolved and interactive, ask for the current provider ceiling once
- store the answer in project state frontmatter
- do not prompt in non-interactive planning; leave unresolved for implementation preflight
- update templates to show the optional frontmatter shape
- replace old `xhigh` inherited-only Dispatch Profile wording
- bump changed skill frontmatter versions

**Step 2: Verify**

```bash
pnpm --filter @open-agent-toolkit/cli exec vitest run src/validation/skills.test.ts
```

Expected: skill validation passes.

**Step 3: Commit**

```bash
git add .agents/skills/oat-project-plan/SKILL.md .agents/skills/oat-project-quick-start/SKILL.md .agents/skills/oat-project-plan-writing/SKILL.md .oat/templates/state.md .oat/templates/plan.md packages/cli/src/validation/skills.test.ts
git commit -m "feat(p03-t01): capture dispatch ceiling during planning"
```

---

### Task p03-t02: Update implementation preflight and dispatch logs

**Files:**

- Modify: `.agents/skills/oat-project-implement/SKILL.md`
- Modify: `packages/cli/src/validation/skills.test.ts`

**Step 1: Edit**

Update implementation guidance to:

- resolve and print ceiling, source, Codex provider default effort, and deterministic-dispatch note before phase work
- prompt only during preflight if unresolved and interactive
- block unresolved non-interactive implementation before work starts
- keep dry-run read-only while reporting unresolved ceiling/planned behavior
- use Codex effort order `low < medium < high < xhigh`
- select `min(preferred, resolved_ceiling)` and log capped selections explicitly
- dispatch Codex reviewers via `oat-reviewer-<ceiling>` variants
- describe base/unpinned roles as provider-default/unpinned behavior
- preserve Claude model-axis behavior and `effort_axis=not-applicable`
- bump the skill version

**Step 2: Verify**

```bash
pnpm --filter @open-agent-toolkit/cli exec vitest run src/validation/skills.test.ts
```

Expected: skill validation passes.

**Step 3: Commit**

```bash
git add .agents/skills/oat-project-implement/SKILL.md packages/cli/src/validation/skills.test.ts
git commit -m "feat(p03-t02): enforce dispatch ceiling at implementation preflight"
```

---

### Task p03-t03: Align phase implementer and reviewer prompts

**Files:**

- Modify: `.agents/agents/oat-phase-implementer.md`
- Modify: `.agents/agents/oat-reviewer.md`

**Step 1: Edit**

Update agent prompts so:

- dispatch context may include `dispatch_ceiling`, `ceiling_source`, `selected_effort`, and provider default details
- reviewers no longer describe Codex as inheriting parent effort by default
- base/unpinned Codex roles are documented as provider-default/unpinned fallback behavior
- canonical agent frontmatter versions are bumped

**Step 2: Verify**

```bash
pnpm --filter @open-agent-toolkit/cli exec vitest run src/commands/shared/frontmatter.test.ts
```

Expected: frontmatter parsing tests pass.

**Step 3: Commit**

```bash
git add .agents/agents/oat-phase-implementer.md .agents/agents/oat-reviewer.md
git commit -m "feat(p03-t03): align agents with dispatch ceiling semantics"
```

---

## Phase 4: Docs, generated assets, versions, and validation

Refresh generated provider views, docs, and release metadata after behavior changes.

### Task p04-t01: Update docs and generated Codex views

**Files:**

- Modify: `apps/oat-docs/docs/workflows/projects/implementation-execution.md`
- Modify: `apps/oat-docs/docs/workflows/projects/lifecycle.md`
- Modify: `apps/oat-docs/docs/provider-sync/config.md`
- Modify: `.codex/config.toml`
- Create/modify: `.codex/agents/oat-phase-implementer-*.toml`
- Create/modify: `.codex/agents/oat-reviewer-*.toml`

**Step 1: Edit docs**

Document:

- OAT dispatch ceiling vs provider default effort
- planning/preflight prompt seams
- non-interactive block behavior
- Codex pinned role variants and base-role fallback meaning
- Claude model ceiling semantics
- structured dispatch log examples

**Step 2: Sync provider views**

```bash
pnpm run cli -- sync --scope project
```

Expected: generated Codex role/config changes are applied.

**Step 3: Dry-run verify sync**

```bash
pnpm run cli -- sync --scope project --dry-run
```

Expected: no changes required.

**Step 4: Commit**

```bash
git add apps/oat-docs/docs/workflows/projects/implementation-execution.md apps/oat-docs/docs/workflows/projects/lifecycle.md apps/oat-docs/docs/provider-sync/config.md .codex
git commit -m "docs(p04-t01): document dispatch ceiling behavior"
```

---

### Task p04-t02: Bump versions and run release validation

**Files:**

- Modify: `packages/cli/package.json`
- Modify: `packages/control-plane/package.json`
- Modify: `packages/docs-config/package.json`
- Modify: `packages/docs-theme/package.json`
- Modify: `packages/docs-transforms/package.json`
- Modify: `pnpm-lock.yaml`
- Modify: `.oat/projects/shared/dispatch-ceiling/implementation.md`
- Modify: `.oat/projects/shared/dispatch-ceiling/state.md`
- Modify: `.oat/state.md`

**Step 1: Bump lockstep public package versions**

Bump all five public package versions from `0.1.6` to the next patch version because this PR changes shipped CLI/bundled skill/docs assets.

**Step 2: Run validation**

```bash
pnpm check
pnpm --filter @open-agent-toolkit/cli exec vitest run src/config/oat-config.test.ts src/config/resolve.test.ts src/commands/config/index.test.ts src/providers/codex/codec/sync-extension.test.ts src/commands/shared/codex-strays.test.ts src/commands/init/index.test.ts src/validation/skills.test.ts
pnpm test
pnpm build:docs
pnpm release:validate
pnpm run cli -- internal validate-skill-version-bumps --base-ref origin/main
```

Expected: all required checks pass, or any failures are fixed before PR.

**Step 3: Commit**

```bash
git add packages/cli/package.json packages/control-plane/package.json packages/docs-config/package.json packages/docs-theme/package.json packages/docs-transforms/package.json pnpm-lock.yaml .oat/projects/shared/dispatch-ceiling/implementation.md .oat/projects/shared/dispatch-ceiling/state.md .oat/state.md
git commit -m "chore(p04-t02): validate dispatch ceiling release"
```

---

### Task p04-t03: (review) Add CLI dispatch ceiling resolver

**Files:**

- Modify: `packages/cli/src/commands/project/index.ts`
- Modify: `packages/cli/src/commands/project/status.ts` or add adjacent project command module as appropriate
- Modify: `packages/cli/src/commands/project/*.test.ts`
- Modify: `.agents/skills/oat-project-implement/SKILL.md`
- Modify: `apps/oat-docs/docs/workflows/projects/implementation-execution.md`
- Modify: `apps/oat-docs/docs/cli-utilities/configuration.md`

**Step 1: Understand the issue**

Review finding: Implementation preflight currently documents dispatch ceiling resolution in skill text, but there is no compiled CLI helper that resolves the effective ceiling, source, provider default, and unresolved/non-interactive block state for orchestrators.

Location: `.agents/skills/oat-project-implement/SKILL.md:162`

**Step 2: Implement fix**

Add a project-scoped CLI helper for dispatch ceiling resolution, using the existing config resolver and project `state.md` frontmatter:

- expose a command such as `oat project dispatch-ceiling resolve --provider codex --json`
- resolve repo config first, then `oat_dispatch_ceiling` project state/frontmatter
- report `{ provider, value, source, unresolved, providerDefaultEffort }` for Codex, using `unknown` when the provider default cannot be read
- support a non-interactive/preflight mode that exits non-zero with the documented `BLOCKED:` guidance when unresolved
- keep dry-run/read-only behavior from mutating project state
- update implementation skill/docs to call the CLI helper instead of requiring orchestrators to duplicate resolution rules

**Step 3: Verify**

Run:

```bash
pnpm --filter @open-agent-toolkit/cli exec vitest run src/commands/project
pnpm --filter @open-agent-toolkit/cli exec vitest run src/validation/skills.test.ts
pnpm run cli -- project dispatch-ceiling resolve --provider codex --json
```

Expected: project command tests pass, skill validation passes, and the resolver prints source-backed JSON for configured/resolved ceilings or the documented unresolved state.

**Step 4: Commit**

```bash
git add packages/cli/src/commands/project .agents/skills/oat-project-implement/SKILL.md apps/oat-docs/docs/workflows/projects/implementation-execution.md apps/oat-docs/docs/cli-utilities/configuration.md
git commit -m "fix(p04-t03): add dispatch ceiling resolver command"
```

---

### Task p04-t04: (review) Fix unresolved JSON preflight behavior

**Files:**

- Modify: `packages/cli/src/commands/project/dispatch-ceiling/index.ts`
- Modify: `packages/cli/src/commands/project/dispatch-ceiling/index.test.ts`
- Modify: `.agents/skills/oat-project-implement/SKILL.md` if command guidance needs wording updates
- Modify: `apps/oat-docs/docs/workflows/projects/implementation-execution.md` if docs guidance needs wording updates

**Step 1: Understand the issue**

Review finding: The documented implementation preflight command `oat project dispatch-ceiling resolve --provider <provider> --preflight --json` currently blocks unresolved runs before an interactive orchestrator can prompt, because JSON output is treated as non-interactive.

Location: `packages/cli/src/commands/project/dispatch-ceiling/index.ts:341`

**Step 2: Implement fix**

Separate JSON output format from unresolved/non-interactive block intent:

- keep `--preflight --non-interactive` as the explicit blocking path for unresolved ceilings
- make unresolved `--preflight --json` return `status: "unresolved"` and exit successfully when `--non-interactive` is not present and no true non-interactive signal requires blocking
- keep `--preflight --non-interactive --json` returning `status: "blocked"` and a non-zero exit
- preserve read-only behavior and existing resolved-ceiling output
- update skill/docs wording only if the command behavior or recommended invocation changes

**Step 3: Verify**

Run:

```bash
pnpm --filter @open-agent-toolkit/cli exec vitest run src/commands/project/dispatch-ceiling/index.test.ts
pnpm --filter @open-agent-toolkit/cli exec vitest run src/validation/skills.test.ts
pnpm run cli -- project dispatch-ceiling resolve --provider codex --preflight --json
pnpm run cli -- project validate-plan --project-path .oat/projects/shared/dispatch-ceiling
```

Expected: unresolved `--preflight --json` can report `unresolved` without blocking interactive-capable callers, while explicit non-interactive preflight still blocks before work starts.

**Step 4: Commit**

```bash
git add packages/cli/src/commands/project/dispatch-ceiling .agents/skills/oat-project-implement/SKILL.md apps/oat-docs/docs/workflows/projects/implementation-execution.md .oat/projects/shared/dispatch-ceiling/implementation.md .oat/projects/shared/dispatch-ceiling/state.md .oat/state.md
git commit -m "fix(p04-t04): allow unresolved json preflight"
```

---

## Reviews

| Scope  | Type     | Status      | Date       | Artifact                                    |
| ------ | -------- | ----------- | ---------- | ------------------------------------------- |
| p01    | code     | pending     | -          | -                                           |
| p02    | code     | pending     | -          | -                                           |
| p03    | code     | pending     | -          | -                                           |
| p04    | code     | pending     | -          | -                                           |
| final  | code     | fixes_added | 2026-05-24 | reviews/archived/final-review-2026-05-24.md |
| design | artifact | pending     | -          | -                                           |

**Status values:** `pending` -> `received` -> `fixes_added` -> `fixes_completed` -> `passed`

---

## Implementation Complete

**Summary:**

- Phase 1: 3 tasks - config schema, resolution, and CLI exposure
- Phase 2: 2 tasks - Codex generated variants and stray/init test coverage
- Phase 3: 3 tasks - planning, implementation, and agent dispatch contract updates
- Phase 4: 4 tasks - docs/generated views/versioning/validation and CLI resolver review fixes

**Total: 12 tasks**

Review fix p04-t04 is queued before final re-review can pass.

---

## References

- Discovery: `discovery.md`
- Design: `design.md`
- Prior archived project: `/Users/thomas.stang/Code/vox/open-agent-toolkit/.oat/projects/archived/subagent-model-selection`
