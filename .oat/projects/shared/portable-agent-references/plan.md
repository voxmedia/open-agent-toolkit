---
oat_status: in_progress
oat_ready_for: null
oat_blockers: []
oat_last_updated: 2026-08-28
oat_phase: plan
oat_phase_status: in_progress
oat_plan_hill_phases: []
oat_plan_parallel_groups: []
oat_plan_source: quick
oat_import_reference: null
oat_import_source_path: null
oat_import_provider: null
oat_generated: false
oat_template: true
---

# Implementation Plan: portable-agent-references

> Execute this plan using `oat-project-implement`.

**Goal:** Make every executable cross-skill read shipped by a user-default pack
scope-portable, and enforce that invariant across canonical skill and agent
Markdown.

**Architecture:** A manifest-driven ratchet classifies cross-skill `SKILL.md`
and `references/**/*.md` reads. Loaded skills use loaded/user/project
resolution; materialized agents use user/project resolution because no stable
cross-provider loaded-agent path exists.

**Tech Stack:** TypeScript/Vitest contract tests, canonical Markdown skills and
agents, OAT bundle/provider sync tooling, pnpm/Turborepo release gates.

**Commit Convention:** `{type}({task-id}): {description}`

## Parallelism

The plan is sequential (`oat_plan_parallel_groups: []`). Phase 1 tasks all
modify the same exact portability inventory and shared contract tests; running
them in isolated worktrees would create fragile merge conflicts and could let
one task reintroduce another task's removed baseline. Phase 2 consumes the
fully remediated Phase 1 tree and therefore cannot run independently.

## Phase 1: Global Ratchet and Portable Callers

### Task p01-t01: Generalize the user-default portability ratchet

**Files:**

- Modify:
  `packages/cli/src/commands/init/tools/shared/skills-bundled-docs-contract.test.ts`

**Step 1: Add failing matcher and asset-surface cases**

Add table-driven cases for cross-skill `SKILL.md` and nested
`references/**/*.md` targets across backticked, plain, Markdown-link, `./`, and
`../` spellings. Add manifest fixtures proving that both skill and agent assets
from user-default packs are included while non-user-default assets are not.

Run:

```bash
pnpm --filter @open-agent-toolkit/cli exec vitest run src/commands/init/tools/shared/skills-bundled-docs-contract.test.ts
```

Expected: new cases fail before the collector and matcher are generalized.

**Step 2: Implement deterministic cross-skill reference collection**

- Derive user-default skill and agent assets from `PACK_MANIFEST`.
- Enumerate authored Markdown for directory skills and single-file agents.
- Record exact `file`, `targetSkill`, and `targetPath` identities.
- Treat same-owner local references separately from cross-skill reads.
- Keep historical evidence in its existing exact baseline.
- Introduce a separate exact migration inventory for current executable debt;
  never merge it into the historical baseline.

**Step 3: Verify and format**

```bash
pnpm exec oxfmt --write packages/cli/src/commands/init/tools/shared/skills-bundled-docs-contract.test.ts
pnpm --filter @open-agent-toolkit/cli exec vitest run src/commands/init/tools/shared/skills-bundled-docs-contract.test.ts
git diff --check
```

Expected: matcher/manifest fixtures pass and the exact migration inventory
matches the current repository with source/target evidence.

**Step 4: Commit**

```bash
git add packages/cli/src/commands/init/tools/shared/skills-bundled-docs-contract.test.ts
git commit -m "test(p01-t01): generalize portable reference ratchet"
```

### Task p01-t02: Port utility-pack cross-skill reads

**Files:**

- Modify: `.agents/skills/oat-dispatch-subagents/SKILL.md`
- Modify: `.agents/skills/oat-review-provide-remote/SKILL.md`
- Modify: `.agents/skills/oat-repo-improve/SKILL.md`
- Modify:
  `packages/cli/src/commands/init/tools/shared/skills-bundled-docs-contract.test.ts`
- Modify: `packages/cli/src/validation/skills.test.ts`

**Step 1: Add portable caller assertions**

Assert loaded-skill → user → project candidate order, exact target validation,
independent roots where multiple dependencies exist, no ambient discovery, and
`utility` recovery commands. Pin the current skill versions before changing
content.

Run:

```bash
pnpm --filter @open-agent-toolkit/cli exec vitest run src/commands/init/tools/shared/skills-bundled-docs-contract.test.ts src/validation/skills.test.ts
```

Expected: the new caller assertions fail against repository-relative reads.

**Step 2: Port callers and shrink the migration inventory**

- Resolve `subagent-orchestration`, `oat-dispatch-subagents`, and
  `oat-review-provide` reference targets through independently bound installed
  roots as applicable.
- Preserve selection, launch, recovery, and review semantics.
- Fail closed with owning-pack install/update guidance.
- Remove the remediated exact entries from the migration inventory.
- Increment each changed canonical skill's frontmatter version exactly once and
  update its explicit validation pin.

**Step 3: Verify and format**

```bash
pnpm exec oxfmt --write '.agents/skills/oat-dispatch-subagents/**/*.md' '.agents/skills/oat-review-provide-remote/**/*.md' '.agents/skills/oat-repo-improve/**/*.md' packages/cli/src/commands/init/tools/shared/skills-bundled-docs-contract.test.ts packages/cli/src/validation/skills.test.ts
pnpm --filter @open-agent-toolkit/cli exec vitest run src/commands/init/tools/shared/skills-bundled-docs-contract.test.ts src/validation/skills.test.ts
pnpm lint
pnpm format
git diff --check
```

Expected: utility callers satisfy the portable contract and no longer appear
in the migration inventory.

**Step 4: Commit**

```bash
git add .agents/skills/oat-dispatch-subagents .agents/skills/oat-review-provide-remote .agents/skills/oat-repo-improve packages/cli/src/commands/init/tools/shared/skills-bundled-docs-contract.test.ts packages/cli/src/validation/skills.test.ts
git commit -m "fix(p01-t02): port utility cross-skill references"
```

### Task p01-t03: Port research-pack cross-skill reads

**Files:**

- Modify: `.agents/skills/analyze/SKILL.md`
- Modify: `.agents/skills/compare/SKILL.md`
- Modify:
  `packages/cli/src/commands/init/tools/shared/skills-bundled-docs-contract.test.ts`
- Modify: `packages/cli/src/validation/skills.test.ts`

**Step 1: Add research caller assertions**

Assert that both research skills resolve `deep-research` reference files
through the loaded/user/project skill-root contract and stop with `research`
pack recovery when the exact target is missing.

**Step 2: Port callers and remove their migration entries**

Replace repository-relative and parent-relative cross-skill reads with
installed-root bindings. Preserve the report schema and orchestration behavior.
Increment both skill versions once and update their explicit validation pins.

**Step 3: Verify and format**

```bash
pnpm exec oxfmt --write '.agents/skills/analyze/**/*.md' '.agents/skills/compare/**/*.md' packages/cli/src/commands/init/tools/shared/skills-bundled-docs-contract.test.ts packages/cli/src/validation/skills.test.ts
pnpm --filter @open-agent-toolkit/cli exec vitest run src/commands/init/tools/shared/skills-bundled-docs-contract.test.ts src/validation/skills.test.ts
pnpm lint
pnpm format
git diff --check
```

Expected: research callers are portable and their exact debt entries are gone.

**Step 4: Commit**

```bash
git add .agents/skills/analyze .agents/skills/compare packages/cli/src/commands/init/tools/shared/skills-bundled-docs-contract.test.ts packages/cli/src/validation/skills.test.ts
git commit -m "fix(p01-t03): port research cross-skill references"
```

### Task p01-t04: Port workflow review-provider references

**Files:**

- Modify: `.agents/skills/oat-project-review-provide/SKILL.md`
- Modify:
  `packages/cli/src/commands/init/tools/shared/skills-bundled-docs-contract.test.ts`
- Modify: `packages/cli/src/validation/skills.test.ts`

**Step 1: Add workflow caller assertions**

Assert that the project review skill resolves the utility-pack review artifact
template through the installed-scope contract and provides correct recovery.

**Step 2: Port the caller and remove its migration entry**

Bind the exact `oat-review-provide` template through a portable root, preserve
review output semantics, bump the skill version once, and update its validation
pin.

**Step 3: Verify and format**

```bash
pnpm exec oxfmt --write '.agents/skills/oat-project-review-provide/**/*.md' packages/cli/src/commands/init/tools/shared/skills-bundled-docs-contract.test.ts packages/cli/src/validation/skills.test.ts
pnpm --filter @open-agent-toolkit/cli exec vitest run src/commands/init/tools/shared/skills-bundled-docs-contract.test.ts src/validation/skills.test.ts
pnpm lint
pnpm format
git diff --check
```

Expected: the workflow-to-utility reference is portable and absent from the
migration inventory.

**Step 4: Commit**

```bash
git add .agents/skills/oat-project-review-provide packages/cli/src/commands/init/tools/shared/skills-bundled-docs-contract.test.ts packages/cli/src/validation/skills.test.ts
git commit -m "fix(p01-t04): port workflow review references"
```

### Task p01-t05: Port user-default agent references and remove the exemption

**Files:**

- Modify: `.agents/agents/oat-phase-implementer.md`
- Modify: `.agents/agents/oat-reviewer.md`
- Modify: `.agents/agents/oat-codebase-mapper.md`
- Modify:
  `packages/cli/src/commands/init/tools/shared/skills-bundled-docs-contract.test.ts`
- Modify: `packages/cli/src/commands/sync/index.test.ts`
- Modify: `packages/cli/src/validation/skills.test.ts`

**Step 1: Add agent portable-contract assertions**

Assert user → project order without an invented loaded-agent candidate,
independent dependency bindings, exact target checks, correct `workflows` and
`utility` recovery, and absence of executable bare agent reads. Add equivalent
coverage for the phase implementer, reviewer, and codebase mapper.

Run:

```bash
pnpm --filter @open-agent-toolkit/cli exec vitest run src/commands/init/tools/shared/skills-bundled-docs-contract.test.ts src/validation/skills.test.ts
```

Expected: assertions fail while the three agents retain bare paths.

**Step 2: Port agents and delete the exemption**

- Resolve each required sibling independently from user scope, then project
  scope.
- Preserve optional-dispatch, reviewer-reconnaissance, and codebase-mapper
  responsibilities.
- Replace the `oat-phase-implementer` test branch that requires bare paths with
  normal positive portable assertions.
- Remove all agent entries from the migration inventory.
- Increment each changed agent version once and update explicit version tests.

**Step 3: Verify generated roles and format**

Extend the sync integration contract to derive the affected Claude, Cursor,
and Codex role paths from the materialization plan/manifest, read every
generated role, require the portable resolver markers in each copy, and reject
executable bare sibling-skill paths. Cover the phase implementer, reviewer, and
codebase mapper wherever each provider materializes that role.

```bash
pnpm exec oxfmt --write .agents/agents/oat-phase-implementer.md .agents/agents/oat-reviewer.md .agents/agents/oat-codebase-mapper.md packages/cli/src/commands/init/tools/shared/skills-bundled-docs-contract.test.ts packages/cli/src/commands/sync/index.test.ts packages/cli/src/validation/skills.test.ts
pnpm --filter @open-agent-toolkit/cli exec vitest run src/commands/init/tools/shared/skills-bundled-docs-contract.test.ts src/commands/sync/index.test.ts src/validation/skills.test.ts
pnpm run cli -- sync --scope all --dry-run
pnpm lint
pnpm format
git diff --check
```

Expected: canonical agents and provider-role plans contain only portable reads;
the phase-implementer exemption no longer exists.

**Step 4: Commit**

```bash
git add .agents/agents/oat-phase-implementer.md .agents/agents/oat-reviewer.md .agents/agents/oat-codebase-mapper.md packages/cli/src/commands/init/tools/shared/skills-bundled-docs-contract.test.ts packages/cli/src/commands/sync/index.test.ts packages/cli/src/validation/skills.test.ts
git commit -m "fix(p01-t05): port user-default agent references"
```

### Task p01-t06: Finalize the zero-debt portability invariant

**Files:**

- Modify:
  `packages/cli/src/commands/init/tools/shared/skills-bundled-docs-contract.test.ts`
- Modify: `packages/cli/src/validation/skills.test.ts`

**Step 1: Remove the temporary migration inventory**

Require the manifest-derived executable finding set to be empty after applying
only the exact historical/self-reference classification. Retain deterministic
failure evidence and ensure no migration allowlist remains.

**Step 2: Add bundled-copy assertions**

Run `bundle-assets.sh` against a temporary asset root and assert the changed
skills and agents preserve candidate order, exact target binding, and
fail-closed recovery in the shipped copy.

**Step 3: Verify Phase 1**

```bash
pnpm exec oxfmt --write packages/cli/src/commands/init/tools/shared/skills-bundled-docs-contract.test.ts packages/cli/src/validation/skills.test.ts
pnpm --filter @open-agent-toolkit/cli exec vitest run src/commands/init/tools/shared/skills-bundled-docs-contract.test.ts src/validation/skills.test.ts
pnpm run check:skill-bumps
pnpm lint
pnpm format
git diff --check
```

Expected: no executable cross-skill debt remains in user-default skill or agent
Markdown and the focused suite passes.

**Step 4: Commit**

```bash
git add packages/cli/src/commands/init/tools/shared/skills-bundled-docs-contract.test.ts packages/cli/src/validation/skills.test.ts
git commit -m "test(p01-t06): enforce zero portable reference debt"
```

## Phase 2: Documentation, Packaging, and Release Validation

### Task p02-t01: Document the global skill-and-agent portability contract

**Files:**

- Modify: `apps/oat-docs/docs/contributing/skills.md`
- Modify: `apps/oat-docs/docs/cli-utilities/tool-packs.md` if the existing
  mixed-scope section cannot express the agent fallback without ambiguity

**Step 1: Update contributor guidance**

Document manifest-wide skill/agent enforcement, the distinct loaded-skill and
materialized-agent candidate orders, independent dependency roots, exact
historical baselines, and pack-specific fail-closed recovery.

**Step 2: Format and verify**

```bash
pnpm exec oxfmt --write apps/oat-docs/docs/contributing/skills.md apps/oat-docs/docs/cli-utilities/tool-packs.md
pnpm check
pnpm build:docs
git diff --check
```

Expected: documentation checks and docs build pass without navigation drift.

**Step 3: Commit**

```bash
git add apps/oat-docs/docs/contributing/skills.md apps/oat-docs/docs/cli-utilities/tool-packs.md
git commit -m "docs(p02-t01): document portable agent references"
```

### Task p02-t02: Refresh shipped assets and validate the lockstep release

**Files:**

- Modify: `.oat/sync/manifest.json`
- Modify: generated provider views selected by `oat sync --scope all`
- Modify: `packages/cli/package.json`
- Modify: `packages/control-plane/package.json`
- Modify: `packages/docs-config/package.json`
- Modify: `packages/docs-theme/package.json`
- Modify: `packages/docs-transforms/package.json`
- Modify: `packages/cli/assets/public-package-versions.json`
- Modify: lockfile only if the workspace version update requires it

**Step 1: Select and apply the release version**

Fetch `origin/main`, choose one lockstep version strictly greater than every
public package on current main, update all five packages plus the bundled
version inventory, and refresh provider views.

```bash
git fetch origin
pnpm run cli -- sync --scope all
```

**Step 2: Run the ordered repository gates with explicit exit capture**

```bash
portable_agent_gate_dir="$(mktemp -d)"
run_portable_agent_gate() {
  portable_agent_label="$1"
  shift
  "$@" >"$portable_agent_gate_dir/$portable_agent_label.log" 2>&1
  portable_agent_exit=$?
  printf '%s exit=%s\n' "$portable_agent_label" "$portable_agent_exit"
  if [ "$portable_agent_exit" -ne 0 ]; then
    tail -n 200 "$portable_agent_gate_dir/$portable_agent_label.log"
    return "$portable_agent_exit"
  fi
}

run_portable_agent_gate 01-check pnpm check || exit $?
run_portable_agent_gate 02-type-check pnpm type-check || exit $?
run_portable_agent_gate 03-test pnpm test || exit $?
run_portable_agent_gate 04-build pnpm build || exit $?
run_portable_agent_gate 05-skill-bumps pnpm run check:skill-bumps || exit $?
run_portable_agent_gate 06-release-versions pnpm release:check-versions || exit $?
run_portable_agent_gate 07-release-validate pnpm release:validate || exit $?
run_portable_agent_gate 08-build-docs pnpm build:docs || exit $?
run_portable_agent_gate 09-lint pnpm lint || exit $?
run_portable_agent_gate 10-format pnpm format || exit $?
run_portable_agent_gate 11-diff-check git diff --check || exit $?
```

Expected: every gate reports exit `0` in the documented order.

**Step 3: Commit**

Stage only the sync, provider, version, inventory, and lockfile paths actually
changed, then commit:

```bash
git commit -m "chore(p02-t02): release portable agent references"
```

## Reviews

| Scope  | Type     | Status          | Date       | Artifact                                           | Reviewed Head | Invocation                           | Gate Target |
| ------ | -------- | --------------- | ---------- | -------------------------------------------------- | ------------- | ------------------------------------ | ----------- |
| p01    | code     | pending         | -          | -                                                  | -             | -                                    | -           |
| p02    | code     | pending         | -          | -                                                  | -             | -                                    | -           |
| final  | code     | pending         | -          | -                                                  | -             | -                                    | -           |
| spec   | artifact | pending         | -          | -                                                  | -             | -                                    | -           |
| design | artifact | pending         | -          | -                                                  | -             | -                                    | -           |
| plan   | artifact | fixes_completed | 2026-08-28 | structured in-memory review                        | c47586ce      | native:oat-reviewer-gpt-5-6-sol-high | -           |
| plan   | artifact | received        | 2026-08-28 | reviews/artifact-plan-review-2026-08-28T223052Z.md | -             | -                                    | -           |

## Implementation Complete

**Summary:**

- Phase 1: 6 tasks - manifest-driven global ratchet and complete executable
  caller remediation
- Phase 2: 2 tasks - documentation, provider sync, lockstep release, and full
  verification

**Total: 8 tasks**

Ready for `oat-project-implement` after artifact review, dispatch policy
selection, and the configured quick-start gate.

## References

- Discovery: `discovery.md`
- Lightweight design: `design.md`
- Prior project record:
  `.oat/repo/reference/project-summaries/20260828-portable-skill-references.md`
- Prior independent exit review:
  `.oat/projects/archived/portable-skill-references/reviews/archived/final-review-2026-08-28T175129Z.md`
