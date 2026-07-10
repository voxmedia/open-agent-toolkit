---
oat_status: complete
oat_ready_for: oat-project-implement
oat_blockers: []
oat_last_updated: 2026-07-10
oat_phase: plan
oat_phase_status: complete
oat_plan_source: quick
oat_plan_parallel_groups: []
oat_import_reference: null
oat_import_source_path: null
oat_import_provider: null
oat_generated: false
---

# Implementation Plan: post-implementation-sequencing

> Execute this plan using `oat-project-implement`.

**Goal:** Support structured `workflow.postImplementSequence` values with
restart-safe pre- and post-approval execution while preserving the four legacy
strings.

**Architecture:** Treat the preference as an atomic legacy-or-structured union,
normalize it into ordered step arrays, and snapshot final-closeout progress in
project state. Final review precedes pre-approval work; explicit final HiLL
approval precedes post-approval work; incomplete snapshots override normal PR
routing.

**Tech Stack:** TypeScript ESM, Commander-based CLI, Markdown lifecycle skills,
Vitest, Fumadocs, pnpm workspaces, and Turborepo.

**Commit Convention:** `{type}({scope}): {description}`

## Planning Checklist

- [x] Stable task IDs assigned
- [x] Verification and atomic commit supplied for every task
- [x] Release and generated-asset requirements included
- [x] Phase dependencies and write sets evaluated
- [ ] Implementation HiLL checkpoints confirmed at implementation preflight

## Parallelism

The plan is sequential (`oat_plan_parallel_groups: []`). Phase 2 consumes the
configuration types, normalization, and CLI retrieval contract established in
Phase 1. Phase 3 documents the final behavior from both earlier phases and then
generates shared bundled assets and lockstep release metadata. Running these
phases concurrently would create semantic drift and would race on generated CLI
assets, package versions, and full-workspace verification.

---

## Phase 1: Structured Configuration Contract

### Task p01-t01: Add the legacy-or-structured model and atomic resolution

**Files:**

- Modify: `packages/cli/src/config/oat-config.ts`
- Modify: `packages/cli/src/config/oat-config.test.ts`
- Modify: `packages/cli/src/config/resolve.ts`
- Modify: `packages/cli/src/config/resolve.test.ts`

**Step 1: Write failing configuration tests**

Cover:

- all four legacy inputs and exact normalized mappings;
- valid empty, pre-only, post-only, and two-boundary structured values;
- required arrays, closed step vocabulary, no extra keys, and global duplicate
  rejection;
- shared, local, and user round trips;
- atomic layer precedence for mixed string/object values without child-array
  merging.

Run:

```bash
pnpm --filter @open-agent-toolkit/cli exec vitest run \
  src/config/oat-config.test.ts \
  src/config/resolve.test.ts
```

Expected: New cases fail before implementation.

**Step 2: Implement the model, validation, normalization, and resolver leaf**

- Add the step, legacy sequence, structured sequence, and union types from
  `design.md`.
- Add one reusable normalizer that returns canonical ordered arrays.
- Validate structured values as exact objects with both arrays present.
- Preserve invalid-config compatibility by excluding an invalid whole value;
  never partially retain one boundary.
- Teach effective-config flattening to preserve
  `workflow.postImplementSequence` as an atomic leaf so one layer wins as a
  whole value.

**Step 3: Verify**

```bash
pnpm --filter @open-agent-toolkit/cli exec vitest run \
  src/config/oat-config.test.ts \
  src/config/resolve.test.ts
pnpm --filter @open-agent-toolkit/cli type-check
```

Expected: Focused tests and CLI type checking pass.

**Step 4: Commit**

```bash
git add packages/cli/src/config/oat-config.ts \
  packages/cli/src/config/oat-config.test.ts \
  packages/cli/src/config/resolve.ts \
  packages/cli/src/config/resolve.test.ts
git commit -m "feat(config): support structured post-implementation sequences"
```

---

### Task p01-t02: Extend config set, get, and describe for structured values

**Files:**

- Modify: `packages/cli/src/commands/config/index.ts`
- Modify: `packages/cli/src/commands/config/index.test.ts`

**Step 1: Write failing CLI tests**

Cover:

- existing legacy `set` behavior;
- quoted JSON object input at local, shared, and user scopes;
- exact validation errors with no write on invalid JSON or structure;
- legacy plain `get`, compact-JSON object `get`, and typed object value in
  `get --json`;
- list/dump formatting paths that share resolved-value serialization;
- `describe` output for both forms, allowed steps, mappings, timing, and a JSON
  example.

Run:

```bash
pnpm --filter @open-agent-toolkit/cli exec vitest run \
  src/commands/config/index.test.ts
```

Expected: New structured-value cases fail before implementation.

**Step 2: Implement the CLI contract**

- Keep enum parsing for known legacy values and parse other input as JSON.
- Reuse the configuration validator rather than duplicating sequence rules.
- Preserve structured objects in JSON logger output and serialize them as
  compact JSON only for plain output.
- Update catalog metadata and owning-command guidance without changing layer
  precedence or flags.

**Step 3: Verify**

```bash
pnpm --filter @open-agent-toolkit/cli exec vitest run \
  src/commands/config/index.test.ts
pnpm --filter @open-agent-toolkit/cli type-check
```

Expected: Focused tests and CLI type checking pass.

**Step 4: Commit**

```bash
git add packages/cli/src/commands/config/index.ts \
  packages/cli/src/commands/config/index.test.ts
git commit -m "feat(cli): manage structured post-implementation sequences"
```

---

## Phase 2: Restart-Safe Final Closeout

### Task p02-t01: Reorder final review, sequence steps, and approval

**Files:**

- Modify: `.agents/skills/oat-project-implement/SKILL.md`
- Create: `packages/cli/src/commands/init/tools/shared/post-implement-sequence-contracts.test.ts`

**Step 1: Add failing lifecycle contract tests**

Assert that the canonical skill:

- leaves non-final plan checkpoint handling unchanged;
- defers only the final checkpoint and preserves final checkpoint auto-review;
- completes final verification and final review before pre-approval dispatch;
- snapshots configured legacy/structured values using the approved state model;
- commits each completed step and `awaiting_approval` state;
- records explicit approval before post-approval work;
- uses `not_required` only when no final checkpoint exists;
- fails fast with boundary, step, and exact resume guidance;
- resumes from the first incomplete step without re-resolving configuration;
- supplies the authoritative snapshot to every `summary`, `document`, and `pr`
  child dispatch and requires child state writes to preserve it;
- verifies the snapshot after every child returns before recording step success;
- retains the existing unset-preference prompt after any final approval.

Run:

```bash
pnpm --filter @open-agent-toolkit/cli exec vitest run \
  src/commands/init/tools/shared/post-implement-sequence-contracts.test.ts
```

Expected: The new contract suite fails against the current ordering.

**Step 2: Implement final-closeout orchestration**

- Increase the canonical `oat-project-implement` skill version once for the PR.
- Separate final from non-final checkpoint handling without weakening existing
  non-final gates or review scopes.
- Normalize the effective preference, persist the immutable snapshot after final
  review passes, and dispatch `summary`, `document`, and `pr` in order.
- Persist success/failure/approval transitions before crossing each boundary.
- Instruct every child step to merge state updates without replacing
  `oat_post_implement_sequence`, then re-read state after the child returns.
- If a child removed or altered the snapshot, restore the authoritative snapshot,
  record that step as failed, and stop with resume guidance.
- On resume, treat the snapshot as authoritative and retry only the first
  incomplete step.
- Preserve the unset-preference flow, but place its existing next-step prompt
  after final approval when a final checkpoint is configured.

**Step 3: Verify**

```bash
pnpm --filter @open-agent-toolkit/cli exec vitest run \
  src/commands/init/tools/shared/post-implement-sequence-contracts.test.ts \
  src/commands/init/tools/shared/review-skill-contracts.test.ts
pnpm oat:validate-skills
```

Expected: Sequencing and existing review contracts pass; skill validation is
clean.

**Step 4: Commit**

```bash
git add .agents/skills/oat-project-implement/SKILL.md \
  packages/cli/src/commands/init/tools/shared/post-implement-sequence-contracts.test.ts
git commit -m "feat(workflow): split post-implementation approval sequencing"
```

---

### Task p02-t02: Preserve sequence routing across PR and resume transitions

**Files:**

- Modify: `.agents/skills/oat-project-next/SKILL.md`
- Modify: `.agents/skills/oat-project-pr-final/SKILL.md`
- Modify: `packages/cli/src/commands/init/tools/shared/post-implement-sequence-contracts.test.ts`

**Step 1: Extend failing integration contracts**

Cover:

- an incomplete snapshot routes to `oat-project-implement` before summary,
  `pr_open`, or completion routing;
- a completed snapshot falls through to the existing router;
- pre-approval PR creation preserves the snapshot;
- `pr-final` reuses a sequence-completed summary but retains its existing
  summary generation when no completed summary step exists;
- partial PR success is reconciled before retrying the `pr` step.

Run:

```bash
pnpm --filter @open-agent-toolkit/cli exec vitest run \
  src/commands/init/tools/shared/post-implement-sequence-contracts.test.ts
```

Expected: Routing and summary-reuse cases fail before implementation.

**Step 2: Implement routing and PR integration**

- Increase each changed canonical skill version once for the PR.
- Add incomplete-sequence routing ahead of the current post-implementation
  router without changing completed-snapshot behavior.
- Require PR state updates to merge with, rather than replace, the sequence
  snapshot.
- Make PR-final summary generation sequence-aware and idempotent on resume.

**Step 3: Verify**

```bash
pnpm --filter @open-agent-toolkit/cli exec vitest run \
  src/commands/init/tools/shared/post-implement-sequence-contracts.test.ts \
  src/commands/init/tools/shared/review-skill-contracts.test.ts
pnpm oat:validate-skills
```

Expected: New integration contracts, existing review contracts, and skill
validation pass.

**Step 4: Commit**

```bash
git add .agents/skills/oat-project-next/SKILL.md \
  .agents/skills/oat-project-pr-final/SKILL.md \
  packages/cli/src/commands/init/tools/shared/post-implement-sequence-contracts.test.ts
git commit -m "feat(workflow): resume incomplete post-implementation sequences"
```

---

## Phase 3: Documentation and Release Surface

### Task p03-t01: Document structured sequencing and final approval timing

**Files:**

- Modify: `apps/oat-docs/docs/cli-utilities/configuration.md`
- Modify: `apps/oat-docs/docs/reference/cli-reference.md`
- Modify: `apps/oat-docs/docs/workflows/projects/lifecycle.md`
- Modify: `apps/oat-docs/docs/workflows/projects/implementation-execution.md`
- Modify: `apps/oat-docs/docs/workflows/projects/hill-checkpoints.md`

**Step 1: Update user-facing contracts**

Document:

- the legacy-or-structured type, exact mappings, allowed steps, duplicate rule,
  JSON authoring example, and shared-scope guidance;
- atomic precedence and plain/JSON retrieval behavior;
- final review → pre-approval → final HiLL → post-approval ordering;
- `not_required`, failure/resume behavior, and incomplete-sequence routing;
- the unchanged behavior of non-final checkpoints and the unset-preference
  fallback.

Do not hand-edit `apps/oat-docs/index.md`; regenerate it through the documented
command if source changes affect the generated index.

**Step 2: Verify**

```bash
pnpm --filter oat-docs check
pnpm docs:check-links
```

Expected: Documentation formatting, lint, and link checks pass.

**Step 3: Commit**

```bash
git add apps/oat-docs/docs/cli-utilities/configuration.md \
  apps/oat-docs/docs/reference/cli-reference.md \
  apps/oat-docs/docs/workflows/projects/lifecycle.md \
  apps/oat-docs/docs/workflows/projects/implementation-execution.md \
  apps/oat-docs/docs/workflows/projects/hill-checkpoints.md
git commit -m "docs(workflow): explain approval-aware post-implementation sequences"
```

---

### Task p03-t02: Bump lockstep packages, regenerate assets, and validate release

**Files:**

- Modify: `packages/cli/package.json`
- Modify: `packages/control-plane/package.json`
- Modify: `packages/docs-config/package.json`
- Modify: `packages/docs-theme/package.json`
- Modify: `packages/docs-transforms/package.json`
- Modify if generated: `pnpm-lock.yaml`
- Regenerate tracked: `packages/cli/assets/public-package-versions.json`
- Regenerate if changed: `apps/oat-docs/index.md`

**Step 1: Apply release metadata and generate assets**

- Bump all five public packages from the current lockstep version `0.1.46` to
  `0.1.47`.
- Refresh the lockfile if package metadata requires it.
- Run bundled-asset generation once, after all canonical skill and docs edits.
- Regenerate the docs index through the CLI source command; never hand-edit it.

```bash
bash packages/cli/scripts/bundle-assets.sh
pnpm -w run cli:source -- docs generate-index \
  --docs-dir apps/oat-docs/docs \
  --output apps/oat-docs/index.md
```

Do not run asset generation concurrently with validations that read
`packages/cli/assets`.

**Step 2: Run focused bundle and release checks**

```bash
pnpm --filter @open-agent-toolkit/cli exec vitest run \
  src/commands/init/tools/shared/bundle-consistency.test.ts \
  src/commands/init/tools/shared/post-implement-sequence-contracts.test.ts
pnpm release:validate
```

Expected: Canonical/bundled contracts and public package validation pass.

**Step 3: Run full repository verification sequentially**

```bash
pnpm oat:validate-skills
pnpm format
pnpm lint
pnpm type-check
pnpm test
pnpm build
pnpm build:docs
pnpm docs:check-links
pnpm release:validate
git diff --check
```

Expected: All repository, docs, build, package, and whitespace checks pass.

**Step 4: Commit**

```bash
git add packages/cli/package.json \
  packages/control-plane/package.json \
  packages/docs-config/package.json \
  packages/docs-theme/package.json \
  packages/docs-transforms/package.json \
  pnpm-lock.yaml \
  apps/oat-docs/index.md
git add -f packages/cli/assets/public-package-versions.json
git commit -m "chore(release): bump public packages to 0.1.47"
```

If an optional generated file is unchanged, omit it from `git add` rather than
treating that as a failure.

---

### Task p03-t03: Archive the shipped backlog item and verify PJM state

**Files:**

- Move: `.oat/repo/pjm/backlog/items/BL-260709-split-post-implementation.md`
  to `.oat/repo/pjm/backlog/archived/BL-260709-split-post-implementation.md`
- Modify: `.oat/repo/pjm/backlog/completed.md`
- Modify: `.oat/repo/pjm/backlog/index.md`

**Step 1: Close the backlog item through the canonical command**

Run this only after the feature, docs, and release verification tasks have
completed:

```bash
oat backlog archive BL-260709-split-post-implementation \
  --summary "Added structured pre- and post-approval sequencing with legacy compatibility and restart-safe final HiLL handling."
```

Expected: The item is closed and moved to `backlog/archived/`, a newest-first
entry is added to `backlog/completed.md`, and the managed index is regenerated.

**Step 2: Verify complete PJM closeout**

```bash
test ! -e .oat/repo/pjm/backlog/items/BL-260709-split-post-implementation.md
test -e .oat/repo/pjm/backlog/archived/BL-260709-split-post-implementation.md
rg -n "BL-260709-split-post-implementation" \
  .oat/repo/pjm/backlog/archived/BL-260709-split-post-implementation.md \
  .oat/repo/pjm/backlog/completed.md
oat pjm doctor
```

Expected: No active item remains, completion history is durable, and PJM doctor
reports no lifecycle drift.

**Step 3: Commit**

```bash
git add .oat/repo/pjm/backlog/items/BL-260709-split-post-implementation.md \
  .oat/repo/pjm/backlog/archived/BL-260709-split-post-implementation.md \
  .oat/repo/pjm/backlog/completed.md \
  .oat/repo/pjm/backlog/index.md
git commit -m "chore(pjm): close BL-260709 post-implementation sequencing"
```

---

## Reviews

| Scope  | Type     | Status  | Date       | Artifact                                                    |
| ------ | -------- | ------- | ---------- | ----------------------------------------------------------- |
| p01    | code     | pending | -          | -                                                           |
| p02    | code     | pending | -          | -                                                           |
| p03    | code     | pending | -          | -                                                           |
| final  | code     | pending | -          | -                                                           |
| spec   | artifact | passed  | 2026-07-10 | N/A (quick mode; no spec required)                          |
| design | artifact | pending | -          | -                                                           |
| plan   | artifact | passed  | 2026-07-10 | reviews/archived/artifact-plan-review-2026-07-10T120448Z.md |

**Status values:** `pending` → `received` → `fixes_added` → `fixes_completed` →
`passed`

## Implementation Complete

**Summary:**

- Phase 1: 2 tasks — structured config model, resolution, and CLI
- Phase 2: 2 tasks — final-closeout orchestration, routing, and resume safety
- Phase 3: 3 tasks — documentation, release checks, and PJM backlog closeout

**Total: 3 phases, 7 tasks**

Ready for implementation after the plan artifact review passes and implementation
preflight confirms HiLL checkpoints.

Plan review findings were resolved directly in this artifact. The user explicitly
waived the configured gate rerun on 2026-07-10.

## References

- Discovery: `discovery.md`
- Lightweight Design: `design.md`
- Backlog: `.oat/repo/pjm/backlog/items/BL-260709-split-post-implementation.md`
- Repository Instructions: `AGENTS.md`
- Docs Instructions: `apps/oat-docs/AGENTS.md`
