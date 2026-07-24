---
oat_status: in_progress
oat_ready_for: null
oat_blockers: []
oat_last_updated: 2026-07-24
oat_phase: plan
oat_phase_status: in_progress
oat_plan_parallel_groups:
  - [p01, p02]
oat_plan_source: quick
oat_import_reference: null
oat_import_source_path: null
oat_import_provider: null
oat_generated: false
oat_template: true
---

# Implementation Plan: config-bug

> Execute this plan using `oat-project-implement`.

**Goal:** Make shared tool-pack config project-truthful, preserve effective
project-plus-user capability checks, and prevent provider sync from mutating
through symlinked destination parents.

**Architecture:** A shared project-pack reconciler and `oat tools has` query
separate persisted installation state from runtime availability. A generic sync
engine guard validates provider destination ancestry during planning and again
at apply time.

**Tech Stack:** Node.js 22, TypeScript, Commander, Vitest, pnpm/Turborepo,
oxfmt/oxlint.

**Commit Convention:** `{type}({task-id}): {description}`

## Planning Checklist

- [x] Evaluated phases for parallelism opportunities
- [x] Set `oat_plan_parallel_groups` in frontmatter
- [ ] Resolve project dispatch policy
- [ ] Configure optional phase gate review
- [ ] Complete plan artifact review

## Parallelism

Phases p01 and p02 are declared as one parallel group. Phase p01 is limited to
tool lifecycle commands, capability APIs, and canonical skill consumers. Phase
p02 is limited to the generic sync engine and its tests. Their write sets are
disjoint and each has independent focused verification.

Phase p03 runs after both because documentation must describe both shipped
behaviors, public package versions cover the combined release, and final
validation must execute against the merged result.

## Phase 1: Project Pack State and Effective Capability

### Task p01-t01: Centralize project-only pack reconciliation

**Files:**

- Create:
  `packages/cli/src/commands/tools/shared/project-tools-config.ts`
- Create:
  `packages/cli/src/commands/tools/shared/project-tools-config.test.ts`
- Modify: `packages/cli/src/commands/init/tools/index.ts`
- Modify: `packages/cli/src/commands/init/tools/index.test.ts`
- Modify: `packages/cli/src/commands/init/tools/brainstorm/index.ts`
- Modify: `packages/cli/src/commands/init/tools/brainstorm/index.test.ts`
- Modify: `packages/cli/src/commands/tools/update/index.ts`
- Modify: `packages/cli/src/commands/tools/update/config-write.test.ts`
- Modify: `packages/cli/src/commands/tools/remove/index.ts`
- Modify: `packages/cli/src/commands/tools/remove/config-write.test.ts`

**Step 1: Write failing reconciliation tests**

Cover user-only installs/updates, project-only and both-scope state, removal of
the final project pack while a user copy remains, stale union cleanup, unrelated
shared config preservation, and default-only config write suppression.

Run:

```bash
pnpm --filter @open-agent-toolkit/cli exec vitest run \
  src/commands/tools/shared/project-tools-config.test.ts \
  src/commands/tools/update/config-write.test.ts \
  src/commands/tools/remove/config-write.test.ts \
  src/commands/init/tools/index.test.ts \
  src/commands/init/tools/brainstorm/index.test.ts
```

Expected: New/updated cases fail against the project-plus-user union behavior.

**Step 2: Implement the project reconciler**

Scan project canonical assets after lifecycle mutations. Write a deterministic
full tools map only when project packs exist; otherwise remove a stale map and
skip creating a default-only `.oat/config.json`. Route aggregate install,
direct brainstorm install, update, and remove through the same helper.

**Step 3: Format**

Run:

```bash
pnpm exec oxfmt --write \
  "packages/cli/src/commands/tools/shared/project-tools-config.ts" \
  "packages/cli/src/commands/tools/shared/project-tools-config.test.ts" \
  "packages/cli/src/commands/init/tools/index.ts" \
  "packages/cli/src/commands/init/tools/index.test.ts" \
  "packages/cli/src/commands/init/tools/brainstorm/index.ts" \
  "packages/cli/src/commands/init/tools/brainstorm/index.test.ts" \
  "packages/cli/src/commands/tools/update/index.ts" \
  "packages/cli/src/commands/tools/update/config-write.test.ts" \
  "packages/cli/src/commands/tools/remove/index.ts" \
  "packages/cli/src/commands/tools/remove/config-write.test.ts"
```

**Step 4: Verify**

Re-run the focused Vitest command from Step 1.

Expected: All focused reconciliation tests pass.

**Step 5: Commit**

```bash
git add packages/cli/src/commands/init/tools \
  packages/cli/src/commands/tools/shared/project-tools-config.ts \
  packages/cli/src/commands/tools/shared/project-tools-config.test.ts \
  packages/cli/src/commands/tools/update \
  packages/cli/src/commands/tools/remove
git commit -m "fix(p01-t01): reconcile shared tool state from project scope"
```

### Task p01-t02: Add effective pack capability query

**Files:**

- Create: `packages/cli/src/commands/tools/has/has-pack.ts`
- Create: `packages/cli/src/commands/tools/has/has-pack.test.ts`
- Create: `packages/cli/src/commands/tools/has/index.ts`
- Create: `packages/cli/src/commands/tools/has/index.test.ts`
- Modify: `packages/cli/src/commands/tools/index.ts`
- Modify: `packages/cli/src/commands/help-snapshots.test.ts`

**Step 1: Write failing command tests**

Cover default effective scope, explicit project/user scope, both-scope JSON,
plain `true`/`false`, a valid unavailable pack with exit `0`, and invalid packs
with exit `1`.

Run:

```bash
pnpm --filter @open-agent-toolkit/cli exec vitest run \
  src/commands/tools/has/has-pack.test.ts \
  src/commands/tools/has/index.test.ts \
  src/commands/help-snapshots.test.ts
```

Expected: Tests fail because `oat tools has` is not registered.

**Step 2: Implement `oat tools has`**

Reuse the existing scanner and scope resolver. Default to `all`, return concrete
matching scopes, print a boolean for plain output, emit the designed JSON
envelope under `--json`, and reserve nonzero status for invalid input or runtime
failure.

**Step 3: Format**

Run:

```bash
pnpm exec oxfmt --write \
  "packages/cli/src/commands/tools/has/has-pack.ts" \
  "packages/cli/src/commands/tools/has/has-pack.test.ts" \
  "packages/cli/src/commands/tools/has/index.ts" \
  "packages/cli/src/commands/tools/has/index.test.ts" \
  "packages/cli/src/commands/tools/index.ts" \
  "packages/cli/src/commands/help-snapshots.test.ts"
```

**Step 4: Verify**

Re-run the focused Vitest command from Step 1.

Expected: Command, output, exit, and help contracts pass.

**Step 5: Commit**

```bash
git add packages/cli/src/commands/tools/has \
  packages/cli/src/commands/tools/index.ts \
  packages/cli/src/commands/help-snapshots.test.ts
git commit -m "feat(p01-t02): add effective tool pack capability query"
```

### Task p01-t03: Migrate pack-gated canonical skills

**Files:**

- Modify: `.agents/skills/oat-brainstorm/SKILL.md`
- Modify: `.agents/skills/oat-brainstorm/references/destinations.md`
- Modify: `.agents/skills/oat-project-document/SKILL.md`
- Modify: `.agents/skills/oat-project-summary/SKILL.md`
- Modify: `packages/cli/src/validation/skills.test.ts`

**Step 1: Write failing contract assertions**

Assert canonical pack-gated consumers invoke `oat tools has`, no longer use
`oat config get tools.<pack>` for runtime capability, and have compatible
`allowed-tools` entries.

Run:

```bash
pnpm --filter @open-agent-toolkit/cli exec vitest run \
  src/validation/skills.test.ts
```

Expected: New assertions fail against existing skill commands.

**Step 2: Update canonical consumers**

Migrate brainstorm destination filtering, project documentation, and project
summary checks. Add `Bash(oat tools:*)` where allowlists require it. Increment
each changed canonical skill's frontmatter version once.

**Step 3: Format**

Run:

```bash
pnpm exec oxfmt --write \
  ".agents/skills/oat-brainstorm/SKILL.md" \
  ".agents/skills/oat-brainstorm/references/destinations.md" \
  ".agents/skills/oat-project-document/SKILL.md" \
  ".agents/skills/oat-project-summary/SKILL.md" \
  "packages/cli/src/validation/skills.test.ts"
```

**Step 4: Verify**

Run:

```bash
pnpm --filter @open-agent-toolkit/cli exec vitest run \
  src/validation/skills.test.ts
pnpm run oat:validate-skills
```

Expected: Canonical skill contracts and metadata validate.

**Step 5: Commit**

```bash
git add .agents/skills/oat-brainstorm \
  .agents/skills/oat-project-document/SKILL.md \
  .agents/skills/oat-project-summary/SKILL.md \
  packages/cli/src/validation/skills.test.ts
git commit -m "fix(p01-t03): query effective pack availability in workflows"
```

## Phase 2: Provider Mutation Safety

### Task p02-t01: Add generic provider path safety guard

**Files:**

- Create: `packages/cli/src/engine/provider-path-safety.ts`
- Create: `packages/cli/src/engine/provider-path-safety.test.ts`
- Modify: `packages/cli/src/engine/index.ts`

**Step 1: Write failing guard tests**

Cover lexical escape, destination-equals-root, symlinked parent,
non-directory parent, partially missing ancestry, ordinary directories, and an
existing symlink at the final managed destination.

Run:

```bash
pnpm --filter @open-agent-toolkit/cli exec vitest run \
  src/engine/provider-path-safety.test.ts
```

Expected: Tests fail because the generic guard does not exist.

**Step 2: Implement the guard**

Validate lexical containment and walk only existing parent segments with
`lstat`. Reject symlink and non-directory ancestors without following them;
exclude the destination itself.

**Step 3: Format**

Run:

```bash
pnpm exec oxfmt --write \
  "packages/cli/src/engine/provider-path-safety.ts" \
  "packages/cli/src/engine/provider-path-safety.test.ts" \
  "packages/cli/src/engine/index.ts"
```

**Step 4: Verify**

Re-run the focused Vitest command from Step 1.

Expected: All path-safety unit cases pass.

**Step 5: Commit**

```bash
git add packages/cli/src/engine/provider-path-safety.ts \
  packages/cli/src/engine/provider-path-safety.test.ts \
  packages/cli/src/engine/index.ts
git commit -m "fix(p02-t01): guard provider mutation ancestry"
```

### Task p02-t02: Enforce path safety in sync planning and execution

**Files:**

- Modify: `packages/cli/src/engine/compute-plan.ts`
- Modify: `packages/cli/src/engine/compute-plan.test.ts`
- Modify: `packages/cli/src/engine/execute-plan.ts`
- Modify: `packages/cli/src/engine/execute-plan.test.ts`
- Modify: `packages/cli/src/engine/engine.integration.test.ts`

**Step 1: Write failing regression tests**

Reproduce `.claude/skills -> ../.agents/skills` during planning. Add stale-plan
cases that replace a formerly real provider parent before execution. Cover
create/update symlink, create/update copy, and remove while asserting canonical
and external target bytes remain unchanged.

Run:

```bash
pnpm --filter @open-agent-toolkit/cli exec vitest run \
  src/engine/compute-plan.test.ts \
  src/engine/execute-plan.test.ts \
  src/engine/engine.integration.test.ts
```

Expected: Regression cases expose traversal or unintended mutation without the
guard.

**Step 2: Integrate planning and apply checks**

Validate destinations before plan classification, preflight every mutating
entry before apply begins, and revalidate each entry immediately before its
first filesystem mutation. Do not guard `skip` or `detach`, which do not mutate
provider paths.

**Step 3: Format**

Run:

```bash
pnpm exec oxfmt --write \
  "packages/cli/src/engine/compute-plan.ts" \
  "packages/cli/src/engine/compute-plan.test.ts" \
  "packages/cli/src/engine/execute-plan.ts" \
  "packages/cli/src/engine/execute-plan.test.ts" \
  "packages/cli/src/engine/engine.integration.test.ts"
```

**Step 4: Verify**

Re-run the focused Vitest command from Step 1.

Expected: Unsafe ancestry fails closed; normal sync operations remain green.

**Step 5: Commit**

```bash
git add packages/cli/src/engine/compute-plan.ts \
  packages/cli/src/engine/compute-plan.test.ts \
  packages/cli/src/engine/execute-plan.ts \
  packages/cli/src/engine/execute-plan.test.ts \
  packages/cli/src/engine/engine.integration.test.ts
git commit -m "fix(p02-t02): block sync through symlinked provider parents"
```

## Phase 3: Documentation, Release, and Integrated Verification

### Task p03-t01: Document semantics and validate the public release

**Files:**

- Modify: `apps/oat-docs/docs/cli-utilities/tool-packs.md`
- Modify: `apps/oat-docs/docs/cli-utilities/configuration.md`
- Modify: `apps/oat-docs/docs/cli-utilities/config-and-local-state.md`
- Modify: `apps/oat-docs/docs/provider-sync/providers.md`
- Modify: `apps/oat-docs/docs/reference/troubleshooting.md`
- Modify: `packages/cli/package.json`
- Modify: `packages/control-plane/package.json`
- Modify: `packages/docs-config/package.json`
- Modify: `packages/docs-theme/package.json`
- Modify: `packages/docs-transforms/package.json`

**Step 1: Update documentation**

Document `tools.*` as project installation state, `oat tools has` as effective
availability, lifecycle reconciliation behavior, and provider-parent symlink
refusal/recovery. Remove claims that shared config represents user-scope
availability.

**Step 2: Apply lockstep release versions**

Bump all five public packages from `0.2.14` to `0.2.15` because the CLI and
bundled canonical skills ship changed behavior.

**Step 3: Format**

Run:

```bash
pnpm exec oxfmt --write \
  "apps/oat-docs/docs/cli-utilities/tool-packs.md" \
  "apps/oat-docs/docs/cli-utilities/configuration.md" \
  "apps/oat-docs/docs/cli-utilities/config-and-local-state.md" \
  "apps/oat-docs/docs/provider-sync/providers.md" \
  "apps/oat-docs/docs/reference/troubleshooting.md" \
  "packages/cli/package.json" \
  "packages/control-plane/package.json" \
  "packages/docs-config/package.json" \
  "packages/docs-theme/package.json" \
  "packages/docs-transforms/package.json"
```

**Step 4: Verify**

Run:

```bash
pnpm --filter @open-agent-toolkit/cli test
pnpm --filter @open-agent-toolkit/cli lint
pnpm --filter @open-agent-toolkit/cli type-check
pnpm format
pnpm release:validate
```

Expected: CLI tests/lint/type-check, repository formatting, version policy, and
release validation all pass.

**Step 5: Commit**

```bash
git add apps/oat-docs/docs/cli-utilities \
  apps/oat-docs/docs/provider-sync/providers.md \
  apps/oat-docs/docs/reference/troubleshooting.md \
  packages/cli/package.json \
  packages/control-plane/package.json \
  packages/docs-config/package.json \
  packages/docs-theme/package.json \
  packages/docs-transforms/package.json
git commit -m "docs(p03-t01): document scoped tools and safe provider sync"
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

**Status values:** `pending` → `received` → `fixes_added` →
`fixes_completed` → `passed`

## Implementation Complete

**Summary:**

- Phase 1: 3 tasks — project pack reconciliation and effective capability
- Phase 2: 2 tasks — provider mutation path safety
- Phase 3: 1 task — documentation, versions, and integrated verification

**Total: 6 tasks**

Ready for code review and merge after every task and required review passes.

## References

- Discovery: `discovery.md`
- Lightweight design: `design.md`
