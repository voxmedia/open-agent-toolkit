---
oat_status: in_progress
oat_ready_for: null
oat_blockers: []
oat_last_updated: 2026-07-13
oat_phase: plan
oat_phase_status: in_progress
oat_plan_hill_phases: []
oat_plan_parallel_groups: [['p01', 'p02']]
oat_plan_source: quick
oat_import_reference: null
oat_import_source_path: null
oat_import_provider: null
oat_generated: false
oat_template: true
---

# Implementation Plan: agent-artifact-hygiene-contract

> Execute this plan using `oat-project-implement`.

**Goal:** Make repository-aware formatting a self-contained contract for every OAT artifact writer, resolve formatting once during planning for normal implementation work, and prevent dispatch-ladder adoption prompts when effective user configuration is already complete.

**Architecture:** The plan writer resolves and embeds a repository-specific fix/write command. Runtime roles, lifecycle skills, and the CLI gate-review prompt carry the same greppable fallback contract for direct or stale-plan execution paths.

**Tech Stack:** Markdown agent/skill contracts, TypeScript CLI prompt assembly and Vitest tests, OAT provider sync, pnpm workspace release validation.

**Commit Convention:** `{type}({task-id}): {description}`

## Planning Checklist

- [x] Stable task IDs assigned
- [x] Every task has bounded files, formatting, verification, and an atomic commit
- [x] Existing review rows preserved
- [x] Parallelism evaluated and declared
- [x] Phase gate review setting resolved: disabled (user declined)
- [x] Project dispatch policy selected: High

## Parallelism

Phases `p01` and `p02` are one parallel group because their write sets are disjoint: `p01` changes canonical role/skill contracts plus the skill-contract validation test, while `p02` changes only the gate command prompt and its command test. Phase `p03` runs after both because provider projection depends on finalized canonical assets and release validation covers the combined result.

## Phase 1: Canonical Planning and Runtime Contracts

### Task p01-t01: Resolve formatting once during plan authoring

**Files:**

- Modify: `.agents/skills/oat-project-plan-writing/SKILL.md`
- Modify: `packages/cli/src/validation/skills.test.ts`

**Steps:**

1. Bump `oat-project-plan-writing` from `1.2.12` to `1.2.13`.
2. Add the planner-first format-command procedure: use applicable repository instructions and relevant manifests, prefer fix/write over check-only, choose file-scoped invocation when supported, and bake the concrete command into every artifact-writing task.
3. Keep runtime discovery explicitly fallback-only when a supplied command is absent or unusable; bake the exact warn-once/no-op text when planning cannot discover a command.
4. Harden dispatch-ladder preflight to run `oat config list --json` once, validate effective provider/tier cells across config precedence, and never treat resolver `matrix: null` as ladder absence.
5. Update the planning skill version assertion and add contract assertions for effective-config ladder checking and planner-first formatting.

**Format:**

Run:

```bash
pnpm exec oxfmt --write .agents/skills/oat-project-plan-writing/SKILL.md packages/cli/src/validation/skills.test.ts
```

**Verify:**

Run:

```bash
pnpm --filter @open-agent-toolkit/cli exec vitest run src/validation/skills.test.ts
```

Expected: skill contract/version tests pass, including the complete-user-ladder/no-project-policy regression.

**Commit:**

```bash
git add .agents/skills/oat-project-plan-writing/SKILL.md packages/cli/src/validation/skills.test.ts
git commit -m "feat(p01-t01): resolve artifact formatting during planning"
```

---

### Task p01-t02: Add the runtime artifact hygiene contract

**Files:**

- Modify: `.agents/agents/oat-phase-implementer.md`
- Modify: `.agents/agents/oat-reviewer.md`
- Modify: `.agents/skills/oat-project-review-provide/SKILL.md`
- Modify: `.agents/skills/oat-project-review-receive/SKILL.md`
- Modify: `.agents/skills/oat-project-summary/SKILL.md`
- Modify: `.agents/skills/oat-project-document/SKILL.md`
- Modify: `.agents/skills/oat-project-pr-final/SKILL.md`
- Modify: `.agents/skills/oat-project-quick-start/SKILL.md`
- Modify: `packages/cli/src/validation/skills.test.ts`

**Steps:**

1. Add the approved verbatim block beginning `Artifact hygiene contract:` at each writing boundary.
2. Require agents to execute a supplied fix/write command first and discover from applicable `AGENTS.md`/`CLAUDE.md` plus relevant manifests only as fallback.
3. Preserve the fix-vs-check distinction, file scoping, unrelated-diff protection, no hardcoded formatter, and exact warn-once/no-op wording.
4. Make phase implementation run applicable repository gates over its produced diff, explicitly including artifact writes; lifecycle prose work runs only checks relevant to changed files.
5. Bump role versions to `oat-phase-implementer` `1.0.8` and `oat-reviewer` `1.1.7`.
6. Bump skill versions once: review-provide `1.3.16`, review-receive `1.5.7`, summary `1.2.1`, document `1.5.1`, pr-final `1.4.3`, quick-start `2.1.16`.
7. Update every hard-coded role/skill version assertion affected by this task.

**Format:**

Run:

```bash
pnpm exec oxfmt --write .agents/agents/oat-phase-implementer.md .agents/agents/oat-reviewer.md .agents/skills/oat-project-review-provide/SKILL.md .agents/skills/oat-project-review-receive/SKILL.md .agents/skills/oat-project-summary/SKILL.md .agents/skills/oat-project-document/SKILL.md .agents/skills/oat-project-pr-final/SKILL.md .agents/skills/oat-project-quick-start/SKILL.md packages/cli/src/validation/skills.test.ts
```

**Verify:**

Run:

```bash
rg -l 'Artifact hygiene contract:' .agents/agents/oat-phase-implementer.md .agents/agents/oat-reviewer.md .agents/skills/oat-project-review-provide/SKILL.md .agents/skills/oat-project-review-receive/SKILL.md .agents/skills/oat-project-summary/SKILL.md .agents/skills/oat-project-document/SKILL.md .agents/skills/oat-project-pr-final/SKILL.md .agents/skills/oat-project-quick-start/SKILL.md
pnpm run oat:validate-skills
pnpm --filter @open-agent-toolkit/cli exec vitest run src/validation/skills.test.ts
```

Expected: all eight runtime canonical files are listed and skill validation passes.

**Commit:**

```bash
git add .agents/agents/oat-phase-implementer.md .agents/agents/oat-reviewer.md .agents/skills/oat-project-review-provide/SKILL.md .agents/skills/oat-project-review-receive/SKILL.md .agents/skills/oat-project-summary/SKILL.md .agents/skills/oat-project-document/SKILL.md .agents/skills/oat-project-pr-final/SKILL.md .agents/skills/oat-project-quick-start/SKILL.md packages/cli/src/validation/skills.test.ts
git commit -m "feat(p01-t02): require hygiene for artifact writers"
```

## Phase 2: Gate-Review Prompt Enforcement

### Task p02-t01: Inject and test the gate-review hygiene contract

**Files:**

- Modify: `packages/cli/src/commands/gate/index.ts`
- Modify: `packages/cli/src/commands/gate/index.test.ts`

**Steps:**

1. Append the approved verbatim runtime contract to `REVIEW_GATE_CONTEXT_NOTE` without weakening its existing provenance and heading requirements.
2. Extend representative gate-review prompt assertions to require both `Artifact hygiene contract:` and the exact fallback warning text.
3. Keep the prompt repository-agnostic; do not name a formatter.

**Format:**

Run:

```bash
pnpm exec oxfmt --write packages/cli/src/commands/gate/index.ts packages/cli/src/commands/gate/index.test.ts
```

**Verify:**

Run:

```bash
pnpm --filter @open-agent-toolkit/cli exec vitest run src/commands/gate/index.test.ts
pnpm --filter @open-agent-toolkit/cli lint
pnpm --filter @open-agent-toolkit/cli type-check
```

Expected: prompt assembly assertions, CLI lint, and CLI type-check pass.

**Commit:**

```bash
git add packages/cli/src/commands/gate/index.ts packages/cli/src/commands/gate/index.test.ts
git commit -m "feat(p02-t01): enforce hygiene in gate review prompts"
```

## Phase 3: Provider Projection and Public Release

### Task p03-t01: Sync canonical assets and validate the release

**Files:**

- Generate/modify: sync-managed provider views under `.claude/`, `.cursor/`, and `.codex/`
- Modify: `.oat/sync/manifest.json` if regenerated
- Modify: `packages/cli/package.json`
- Modify: `packages/control-plane/package.json`
- Modify: `packages/docs-config/package.json`
- Modify: `packages/docs-theme/package.json`
- Modify: `packages/docs-transforms/package.json`

**Steps:**

1. Run `oat sync --scope all`; do not hand-edit provider views.
2. Bump all five public packages in lockstep from `0.1.60` to `0.1.61`. If a sibling project lands first, rebase and bump once from the new common version instead.
3. Audit `Artifact hygiene contract:` across canonical and generated surfaces and confirm provider projections match canonical sources.
4. Format only files changed by this task, then run focused and repository-wide validation.

**Format:**

Run after sync and version edits:

```bash
git diff --name-only -z --diff-filter=ACM | xargs -0 pnpm exec oxfmt --write
```

**Verify:**

Run:

```bash
pnpm run oat:validate-skills
pnpm exec vitest run packages/cli/src/validation/skills.test.ts packages/cli/src/commands/gate/index.test.ts
pnpm format
pnpm lint
pnpm type-check
pnpm test
pnpm build
pnpm release:validate
```

Expected: canonical/provider contract coverage is complete, all workspace gates pass, the five package versions are lockstep, and release validation passes.

**Commit:**

```bash
git add .claude .cursor .codex .oat/sync/manifest.json packages/cli/package.json packages/control-plane/package.json packages/docs-config/package.json packages/docs-theme/package.json packages/docs-transforms/package.json
git commit -m "chore(p03-t01): sync and version hygiene contracts"
```

## Reviews

| Scope  | Type     | Status  | Date | Artifact |
| ------ | -------- | ------- | ---- | -------- |
| p01    | code     | pending | -    | -        |
| p02    | code     | pending | -    | -        |
| p03    | code     | pending | -    | -        |
| final  | code     | pending | -    | -        |
| spec   | artifact | pending | -    | -        |
| design | artifact | pending | -    | -        |
| plan   | artifact | pending | -    | -        |

**Status values:** `pending` → `received` → `fixes_added` → `fixes_completed` → `passed`

## Implementation Complete

**Summary:**

- Phase 1: 2 tasks — planner-first resolution and self-contained canonical runtime contracts
- Phase 2: 1 task — CLI gate-review prompt enforcement and tests
- Phase 3: 1 task — provider sync, lockstep release bump, and full validation

**Total: 4 tasks**

Ready for code review and merge after all tasks and required reviews pass.

## References

- Discovery: `discovery.md`
- Design: `design.md`
