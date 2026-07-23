---
oat_status: in_progress
oat_ready_for: null
oat_blockers: []
oat_last_updated: 2026-07-22
oat_phase: plan
oat_phase_status: in_progress
oat_plan_parallel_groups:
  - [p02, p03]
oat_plan_source: quick
oat_import_reference: null
oat_import_source_path: null
oat_import_provider: null
oat_generated: false
oat_template: true
---

# Implementation Plan: subagent-orchestration

> Execute this plan using `oat-project-implement`.

**Goal:** Split portable model-selection guidance from OAT dispatch mechanics,
preserve dispatch safeguards, migrate every active consumer, and ship the
result through the utility pack and lockstep release process.

**Architecture:** A new user-invocable `subagent-orchestration` skill owns
durable task classes, dated provider mappings, and evidence refresh. Internal
`oat-dispatch-subagents` composes that guidance with provider-specific launch
mechanics and records; active callers load both layers.

**Tech Stack:** Markdown Agent Skills, TypeScript CLI manifests and Vitest
contract tests, OAT provider synchronization, pnpm/Turborepo release tooling.

**Commit Convention:** `{type}({task-id}): {description}`

## Planning Checklist

- [x] Discovery decisions validated
- [x] Lightweight design reviewed and passed
- [x] Existing review rows preserved
- [x] Adjacent phases evaluated for isolated-worktree parallelism
- [x] Parallel group declared for disjoint validation and distribution work

---

## Parallelism

- `p01` is sequential because guidance, mechanics, and active consumers form
  one semantic contract; later work must not validate or distribute a partial
  split.
- `p02` and `p03` run in parallel after `p01`. `p02` owns only
  `packages/cli/src/validation/skills.test.ts`; `p03` owns utility lifecycle
  code/tests and docs. Their writes are disjoint and their verification does
  not require each other's unmerged changes.
- `p04` runs only after both branches merge. Version selection, generated
  provider roles, sync metadata, bundled package metadata, and release gates
  must observe the complete integrated tree.

---

## Phase 1: Establish the canonical split

### Task p01-t01: Add portable model-selection guidance

**Files:**

- Create: `.agents/skills/subagent-orchestration/SKILL.md`
- Create: `.agents/skills/subagent-orchestration/references/model-selection-principles.md`
- Create: `.agents/skills/subagent-orchestration/references/evidence-and-refresh.md`
- Create: `.agents/skills/subagent-orchestration/references/provider-claude.md`
- Create: `.agents/skills/subagent-orchestration/references/provider-codex.md`
- Create: `.agents/skills/subagent-orchestration/references/provider-cursor.md`

**Step 1: Build the canonical guidance layer**

Adapt the imported guidance draft into a self-contained, user-invocable skill
at version `1.0.0`. Preserve the five task classes, independent selection axes,
one-provider loading, freshness metadata, refresh triggers, and
candidate-qualification rules. Apply the approved Opus-first Claude policy:
Opus is the hard-reasoning and consequential default, Fable is exceptional,
and stronger cyber-classifier behavior is evidence rather than an inverted
exception.

**Step 2: Format**

Run:

```bash
pnpm exec oxfmt --write '.agents/skills/subagent-orchestration/**/*.md'
```

**Step 3: Verify**

Run:

```bash
pnpm exec oxfmt --check '.agents/skills/subagent-orchestration/**/*.md'
git diff --check -- .agents/skills/subagent-orchestration
```

Expected: formatting and whitespace checks pass; all six canonical files are
present with no OAT lifecycle or launch-mechanics ownership.

**Step 4: Commit**

```bash
git add .agents/skills/subagent-orchestration
git commit -m "feat(p01-t01): add subagent orchestration guidance"
```

---

### Task p01-t02: Reduce dispatch references to mechanics

**Files:**

- Modify: `.agents/skills/oat-dispatch-subagents/SKILL.md`
- Modify: `.agents/skills/oat-dispatch-subagents/references/provider-claude.md`
- Modify: `.agents/skills/oat-dispatch-subagents/references/provider-codex.md`
- Modify: `.agents/skills/oat-dispatch-subagents/references/provider-cursor.md`
- Modify: `.agents/skills/oat-dispatch-subagents/references/record-schema.md`

**Step 1: Apply the mechanics-only contract**

Bump the canonical dispatch skill once to `1.2.0`. Rewrite Required Loading to
compose generic principles, one selection reference, and one matching mechanics
reference. Remove dated model families and recommendation matrices from the
dispatch provider references while preserving capability, authorization,
catalog intersection, native-first routing, liveness, acceptance, continuation,
and no-post-acceptance-replacement safeguards. Add optional reasoning-mode,
service-tier, and guidance-freshness evidence to the record schema without
invalidating legacy records.

**Step 2: Format**

Run:

```bash
pnpm exec oxfmt --write '.agents/skills/oat-dispatch-subagents/**/*.md'
```

**Step 3: Verify**

Run:

```bash
pnpm exec oxfmt --check '.agents/skills/oat-dispatch-subagents/**/*.md'
git diff --check -- .agents/skills/oat-dispatch-subagents
```

Expected: mechanics files are formatted; selection matrices are absent; the
Cursor pre-start rejection and no-replacement rules remain explicit.

**Step 4: Commit**

```bash
git add .agents/skills/oat-dispatch-subagents
git commit -m "refactor(p01-t02): isolate dispatch mechanics"
```

---

### Task p01-t03: Migrate canonical dispatch consumers

**Files:**

- Modify: `.agents/agents/oat-reviewer.md`
- Modify: `.agents/agents/oat-phase-implementer.md`
- Modify: `.agents/skills/oat-project-plan-writing/SKILL.md`
- Modify: `.agents/skills/oat-project-implement/SKILL.md`
- Modify: `.agents/skills/oat-project-dispatch-subagents/SKILL.md`
- Modify: `.agents/skills/oat-cursor-cloud-projects/SKILL.md`

**Step 1: Update active instructions**

Replace every selection-purpose use of the old single provider reference with
the generic principles, one provider selection reference, and one matching
mechanics reference. Preserve mechanics-only pointers, including Cursor Cloud
launch/recovery delegation. Advance each changed canonical skill or agent
version once. Do not edit generated `.claude`, `.cursor`, or `.codex` views and
do not rewrite historical autonomy/provenance tables.

**Step 2: Format**

Run:

```bash
pnpm exec oxfmt --write \
  .agents/agents/oat-reviewer.md \
  .agents/agents/oat-phase-implementer.md \
  .agents/skills/oat-project-plan-writing/SKILL.md \
  .agents/skills/oat-project-implement/SKILL.md \
  .agents/skills/oat-project-dispatch-subagents/SKILL.md \
  .agents/skills/oat-cursor-cloud-projects/SKILL.md
```

**Step 3: Verify**

Run:

```bash
pnpm exec oxfmt --check \
  .agents/agents/oat-reviewer.md \
  .agents/agents/oat-phase-implementer.md \
  .agents/skills/oat-project-plan-writing/SKILL.md \
  .agents/skills/oat-project-implement/SKILL.md \
  .agents/skills/oat-project-dispatch-subagents/SKILL.md \
  .agents/skills/oat-cursor-cloud-projects/SKILL.md
rg -n 'oat-dispatch-subagents/references' .agents/agents .agents/skills --glob '*.md'
```

Expected: formatting passes; remaining dispatch-reference matches are
mechanics-purpose or historical, and every active selection consumer names the
generic guidance layer.

**Step 4: Commit**

```bash
git add \
  .agents/agents/oat-reviewer.md \
  .agents/agents/oat-phase-implementer.md \
  .agents/skills/oat-project-plan-writing/SKILL.md \
  .agents/skills/oat-project-implement/SKILL.md \
  .agents/skills/oat-project-dispatch-subagents/SKILL.md \
  .agents/skills/oat-cursor-cloud-projects/SKILL.md
git commit -m "refactor(p01-t03): migrate dispatch consumers"
```

---

## Phase 2: Enforce guidance and mechanics contracts

### Task p02-t01: Rewrite skill boundary validation

**Files:**

- Modify: `packages/cli/src/validation/skills.test.ts`

**Step 1: Establish the failing assertions**

Replace old assertions that source model guidance from dispatch provider
references with assertions for the new guidance skill, five task classes,
freshness metadata, Opus-first durable policy, mechanics-only provider
references, additive record evidence, and all active consumer loading paths.
Add negative assertions for unambiguous named-model matrix markers in mechanics
without banning generic selector or floor terminology.

Run:

```bash
pnpm --filter @open-agent-toolkit/cli exec vitest run src/validation/skills.test.ts
```

Expected: the old one-reference assumptions fail before the assertions are
updated, then the revised test describes the approved split.

**Step 2: Format**

Run:

```bash
pnpm exec oxfmt --write packages/cli/src/validation/skills.test.ts
```

**Step 3: Verify**

Run:

```bash
pnpm --filter @open-agent-toolkit/cli exec vitest run src/validation/skills.test.ts
```

Expected: the focused skill contract suite passes.

**Step 4: Commit**

```bash
git add packages/cli/src/validation/skills.test.ts
git commit -m "test(p02-t01): enforce orchestration skill boundaries"
```

---

## Phase 3: Distribute and document the split

### Task p03-t01: Add directional utility dependency

**Files:**

- Modify: `packages/cli/src/commands/init/tools/shared/skill-manifest.ts`
- Modify: `packages/cli/scripts/bundle-inputs.mjs`
- Modify: `packages/cli/src/commands/init/tools/utility/index.ts`
- Modify: `packages/cli/src/commands/init/tools/shared/bundle-consistency.test.ts`
- Modify: `packages/cli/src/commands/init/tools/utility/index.test.ts`
- Modify: `packages/cli/src/commands/init/tools/utility/install-utility.test.ts`
- Modify: `packages/cli/src/commands/tools/shared/scan-tools.test.ts`
- Modify: `packages/cli/src/commands/tools/update/update-tools.test.ts`
- Modify: `packages/cli/src/commands/tools/remove/remove-tools.test.ts`
- Modify: `packages/cli/src/commands/remove/skills/remove-skills.test.ts`

**Step 1: Add failing lifecycle coverage**

Add `subagent-orchestration` to utility and bundle expectations. Add a custom
selection test proving that selecting `oat-dispatch-subagents` automatically
includes guidance while selecting guidance alone remains valid. Keep update,
scan, and removal pack membership explicit without inventing a reverse removal
dependency.

Run:

```bash
pnpm --filter @open-agent-toolkit/cli exec vitest run \
  src/commands/init/tools/shared/bundle-consistency.test.ts \
  src/commands/init/tools/utility/index.test.ts \
  src/commands/init/tools/utility/install-utility.test.ts \
  src/commands/tools/shared/scan-tools.test.ts \
  src/commands/tools/update/update-tools.test.ts \
  src/commands/tools/remove/remove-tools.test.ts \
  src/commands/remove/skills/remove-skills.test.ts
```

Expected: the new membership and directional-dependency assertions fail before
implementation.

**Step 2: Implement distribution behavior**

Add the new skill beside dispatch in the canonical utility and bundle
inventories. Expand custom utility selections only in the dispatch-to-guidance
direction. Preserve existing default/full-pack behavior and standalone
guidance installation.

**Step 3: Format**

Run:

```bash
pnpm exec oxfmt --write \
  packages/cli/src/commands/init/tools/shared/skill-manifest.ts \
  packages/cli/scripts/bundle-inputs.mjs \
  packages/cli/src/commands/init/tools/utility/index.ts \
  packages/cli/src/commands/init/tools/shared/bundle-consistency.test.ts \
  packages/cli/src/commands/init/tools/utility/index.test.ts \
  packages/cli/src/commands/init/tools/utility/install-utility.test.ts \
  packages/cli/src/commands/tools/shared/scan-tools.test.ts \
  packages/cli/src/commands/tools/update/update-tools.test.ts \
  packages/cli/src/commands/tools/remove/remove-tools.test.ts \
  packages/cli/src/commands/remove/skills/remove-skills.test.ts
```

**Step 4: Verify**

Re-run the seven-file Vitest command from Step 1.

Expected: utility selection, pack lifecycle, and bundle consistency tests pass.

**Step 5: Commit**

```bash
git add \
  packages/cli/src/commands/init/tools/shared/skill-manifest.ts \
  packages/cli/scripts/bundle-inputs.mjs \
  packages/cli/src/commands/init/tools/utility/index.ts \
  packages/cli/src/commands/init/tools/shared/bundle-consistency.test.ts \
  packages/cli/src/commands/init/tools/utility/index.test.ts \
  packages/cli/src/commands/init/tools/utility/install-utility.test.ts \
  packages/cli/src/commands/tools/shared/scan-tools.test.ts \
  packages/cli/src/commands/tools/update/update-tools.test.ts \
  packages/cli/src/commands/tools/remove/remove-tools.test.ts \
  packages/cli/src/commands/remove/skills/remove-skills.test.ts
git commit -m "feat(p03-t01): distribute orchestration guidance"
```

---

### Task p03-t02: Update active orchestration documentation

**Files:**

- Modify: `apps/oat-docs/docs/workflows/skills/repo-improve.md`
- Modify: `apps/oat-docs/docs/workflows/projects/reviews.md`
- Modify: `apps/oat-docs/docs/workflows/projects/orchestration-model.md`
- Modify: `apps/oat-docs/docs/contributing/skills.md`
- Modify: `apps/oat-docs/docs/cli-utilities/tool-packs.md`
- Regenerate if changed: `apps/oat-docs/index.md`

**Step 1: Document the ownership split**

Teach that generic guidance owns task classes, model selection, provider
matrices, and refresh evidence while OAT dispatch owns capability, catalog,
route, launch, recovery, and records. Document two-reference loading and the
directional utility dependency. Preserve provider-neutral and root-owned
judgment language.

**Step 2: Regenerate and format**

Run:

```bash
pnpm -w run cli:source -- docs generate-index \
  --docs-dir apps/oat-docs/docs \
  --output apps/oat-docs/index.md
pnpm exec oxfmt --write \
  apps/oat-docs/docs/workflows/skills/repo-improve.md \
  apps/oat-docs/docs/workflows/projects/reviews.md \
  apps/oat-docs/docs/workflows/projects/orchestration-model.md \
  apps/oat-docs/docs/contributing/skills.md \
  apps/oat-docs/docs/cli-utilities/tool-packs.md \
  apps/oat-docs/index.md
```

**Step 3: Verify**

Run:

```bash
pnpm docs:check-links
pnpm build:docs
```

Expected: generated index, links, and docs production build pass.

**Step 4: Commit**

```bash
git add \
  apps/oat-docs/docs/workflows/skills/repo-improve.md \
  apps/oat-docs/docs/workflows/projects/reviews.md \
  apps/oat-docs/docs/workflows/projects/orchestration-model.md \
  apps/oat-docs/docs/contributing/skills.md \
  apps/oat-docs/docs/cli-utilities/tool-packs.md \
  apps/oat-docs/index.md
git commit -m "docs(p03-t02): explain orchestration skill split"
```

---

## Phase 4: Synchronize and release the integrated result

### Task p04-t01: Advance lockstep package versions

**Files:**

- Modify: `packages/cli/package.json`
- Modify: `packages/control-plane/package.json`
- Modify: `packages/docs-config/package.json`
- Modify: `packages/docs-theme/package.json`
- Modify: `packages/docs-transforms/package.json`
- Regenerate: `packages/cli/assets/public-package-versions.json`

**Step 1: Select the release version**

Refresh release evidence against the current integrated base and npm. Choose
the next common unpublished version for all five public packages; do not assume
the currently projected patch version remains available.

**Step 2: Apply and generate**

Update all five package manifests in lockstep, then run:

```bash
bash packages/cli/scripts/bundle-assets.sh
pnpm exec oxfmt --write \
  packages/cli/package.json \
  packages/control-plane/package.json \
  packages/docs-config/package.json \
  packages/docs-theme/package.json \
  packages/docs-transforms/package.json \
  packages/cli/assets/public-package-versions.json
```

**Step 3: Verify**

Run:

```bash
pnpm release:check-versions
```

Expected: lockstep and bundled public-version metadata checks pass.

**Step 4: Commit**

```bash
git add \
  packages/cli/package.json \
  packages/control-plane/package.json \
  packages/docs-config/package.json \
  packages/docs-theme/package.json \
  packages/docs-transforms/package.json \
  packages/cli/assets/public-package-versions.json
git commit -m "chore(p04-t01): bump public package versions"
```

---

### Task p04-t02: Regenerate providers and pass release gates

**Files:**

- Create: `.claude/skills/subagent-orchestration`
- Regenerate: `.oat/sync/manifest.json`
- Regenerate: `.codex/agents/oat-reviewer*.toml`
- Regenerate: `.codex/agents/oat-phase-implementer*.toml`
- Regenerate: `.cursor/agents/oat-reviewer*.md`
- Regenerate: `.cursor/agents/oat-phase-implementer*.md`
- Regenerate if changed: `packages/cli/assets/public-package-versions.json`

**Step 1: Preview and apply provider synchronization**

Run:

```bash
pnpm run cli:source -- --json sync --scope project --dry-run
pnpm run cli:source -- sync --scope project
pnpm run cli:source -- --json sync --scope project --dry-run
```

Expected: the final dry-run reports no pending canonical sync changes. Cursor
skill sync remains disabled by project configuration; Codex has no ordinary
skill adapter.

**Step 2: Run focused integration checks**

Run:

```bash
pnpm --filter @open-agent-toolkit/cli exec vitest run \
  src/validation/skills.test.ts \
  src/commands/init/tools/shared/bundle-consistency.test.ts \
  src/commands/init/tools/utility/index.test.ts \
  src/commands/init/tools/utility/install-utility.test.ts \
  src/commands/tools/shared/scan-tools.test.ts \
  src/commands/tools/update/update-tools.test.ts \
  src/commands/tools/remove/remove-tools.test.ts \
  src/commands/remove/skills/remove-skills.test.ts \
  src/providers/cursor/codec/sync-extension.test.ts \
  src/providers/codex/codec/sync-extension.test.ts
```

Expected: all focused contract, lifecycle, and provider-generation tests pass.

**Step 3: Run repository and release gates**

Run:

```bash
pnpm test
pnpm lint
pnpm type-check
pnpm format
pnpm build
pnpm build:docs
pnpm release:validate
pnpm run cli:source -- --json sync --scope project --dry-run
git status --short
```

Expected: all workspace, production build, documentation, release, and sync
checks pass; only intended generated outputs remain uncommitted.

**Step 4: Commit generated outputs**

```bash
git add \
  .claude/skills/subagent-orchestration \
  .oat/sync/manifest.json \
  .codex/agents/oat-reviewer*.toml \
  .codex/agents/oat-phase-implementer*.toml \
  .cursor/agents/oat-reviewer*.md \
  .cursor/agents/oat-phase-implementer*.md \
  packages/cli/assets/public-package-versions.json
git diff --cached --quiet || \
  git commit -m "chore(p04-t02): sync providers and release assets"
```

Expected: generated provider and bundle metadata are committed; ignored
`packages/cli/assets/skills/**` files are not staged.

---

## Reviews

| Scope  | Type     | Status          | Date       | Artifact                                                      |
| ------ | -------- | --------------- | ---------- | ------------------------------------------------------------- |
| p01    | code     | pending         | -          | -                                                             |
| p02    | code     | pending         | -          | -                                                             |
| final  | code     | pending         | -          | -                                                             |
| spec   | artifact | pending         | -          | -                                                             |
| design | artifact | fixes_completed | 2026-07-22 | reviews/archived/artifact-design-review-2026-07-22T225632Z.md |
| design | artifact | passed          | 2026-07-22 | reviews/archived/artifact-design-review-2026-07-22T231919Z.md |
| p03    | code     | pending         | -          | -                                                             |
| p04    | code     | pending         | -          | -                                                             |
| plan   | artifact | pending         | -          | -                                                             |

**Status values:** `pending` → `received` → `fixes_added` →
`fixes_completed` → `passed`

**Meaning:**

- `received`: review artifact exists but findings have not been dispositioned.
- `fixes_added`: fix tasks were added to the plan.
- `fixes_completed`: fixes were applied and await re-review.
- `passed`: re-review completed without unresolved blocking findings.

---

## Implementation Complete

**Summary:**

- Phase 1: 3 tasks - canonical guidance, mechanics, and consumers
- Phase 2: 1 task - skill boundary contract validation
- Phase 3: 2 tasks - utility distribution and active documentation
- Phase 4: 2 tasks - lockstep versioning, provider sync, and release gates

**Total: 8 tasks**

Ready for code review and merge after all tasks and reviews pass.

---

## References

- Design: `design.md`
- Discovery: `discovery.md`
- Imported handoff: `references/prior-project/handoff.md`
- Imported guidance draft:
  `references/prior-project/skills/subagent-orchestration/`
- Imported dispatch draft:
  `references/prior-project/skills/oat-subagent-dispatch/`
