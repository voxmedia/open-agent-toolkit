---
oat_status: in_progress
oat_ready_for: null
oat_blockers: []
oat_last_updated: 2026-07-10
oat_phase: plan
oat_phase_status: in_progress
oat_plan_source: quick
oat_plan_parallel_groups: []
oat_import_reference: null
oat_import_source_path: null
oat_import_provider: null
oat_generated: false
oat_template: true
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
- [x] Complete user-owned dispatch ladder confirmed and project named ceiling recorded
- [x] Optional Phase gate review disabled by user choice
- [ ] Post-rebase managed reviewer contract resolved and plan re-reviewed
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
  merging;
- regression coverage proving the existing dispatch candidate ladders remain
  atomic and unchanged when the new sequence leaf is introduced.

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
- Generalize the rebased resolver's existing candidate-ladder atomic-leaf
  handling so `workflow.postImplementSequence` also resolves as one whole value
  without regressing dispatch ladder flattening.

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
  `get --json`, accounting for the rebased generic plain-object formatter;
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
- Reuse the rebased `formatResolvedValue` object serialization for plain output,
  while preserving the raw structured object in JSON logger output instead of
  pre-formatting it into a string.
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
- leaves the rebased target-first dispatch ladder, phase coordinator, and exact
  task-worker target selection contracts unchanged;
- defers only the final checkpoint and preserves final checkpoint auto-review;
- completes final verification and final review before pre-approval dispatch;
- snapshots configured legacy/structured values using the approved state model;
- dispatches each snapshotted `preApproval` and `postApproval` array in its
  configured order, including valid noncanonical orders and resume after a
  partially completed noncanonical sequence;
- commits each completed step and `awaiting_approval` state;
- records explicit approval before post-approval work;
- uses `not_required` only when no final checkpoint exists;
- on a declined or deferred final HiLL response, preserves
  `awaiting_approval`, records neither approval nor failure, and runs no
  post-approval step;
- on pre-approval failure, preserves a pending approval state; on post-approval
  failure, preserves the already-recorded approval state;
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
- Keep final closeout orchestrator-owned after the rebased phase coordinator has
  finished; do not move lifecycle sequencing into task workers or weaken exact
  target selection.
- Separate final from non-final checkpoint handling without weakening existing
  non-final gates or review scopes.
- Normalize the effective preference, persist the immutable snapshot after final
  review passes, and dispatch `summary`, `document`, and `pr` in order.
- Iterate the immutable snapshot arrays in their stored order; never sort them
  or hardcode vocabulary order during initial execution or resume.
- Persist success/failure/approval transitions before crossing each boundary.
- Make the final-approval state machine explicit: decline/defer remains
  `awaiting_approval`; a pre-approval failure remains pending approval; and a
  post-approval failure retains recorded approval. Resume must never cross any
  of those boundaries implicitly.
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

### Task p02-t03: Clarify optional Phase gate review setup

**Files:**

- Modify: `.agents/skills/oat-project-plan-writing/SKILL.md`
- Modify: `.agents/skills/oat-project-quick-start/SKILL.md`
- Modify: `packages/cli/src/commands/init/tools/shared/review-skill-contracts.test.ts`

**Step 1: Add failing terminology and boundary contract tests**

Assert that the canonical planning and quick-start contracts:

- label the user choice **“Phase gate review”**, not the ambiguous “Phase
  review”;
- explain that it runs an independent configured review gate after selected
  implementation phases, is non-pausing when it passes, and is distinct from
  both HiLL approval and final artifact review;
- offer the choice only when `oat_phase_review_gate` is absent and a qualifying
  configured target exists; and
- preserve any explicit `oat_phase_review_gate` setting without probing or
  prompting.

Run:

```bash
pnpm --filter @open-agent-toolkit/cli exec vitest run \
  src/commands/init/tools/shared/review-skill-contracts.test.ts
```

Expected: The contract test fails until the terminology and explanations are
updated consistently.

**Step 2: Update the planning prompts and shared contract**

- Increase each changed canonical skill version once for the PR.
- Replace user-facing “Phase review” prompt/status language with “Phase gate
  review” in the shared plan-writing contract and quick-start caller.
- State the trigger and boundary at the prompt: the setup is offered only when
  no explicit setting exists and a qualifying configured gate target is
  available; it is not caused by an existing configured setting.
- Retain existing serialized key names and gate behavior, including the
  configured-target qualification and independence from HiLL.

**Step 3: Verify**

```bash
pnpm --filter @open-agent-toolkit/cli exec vitest run \
  src/commands/init/tools/shared/review-skill-contracts.test.ts
pnpm oat:validate-skills
```

Expected: Terminology contracts and canonical skill validation pass.

**Step 4: Commit**

```bash
git add .agents/skills/oat-project-plan-writing/SKILL.md \
  .agents/skills/oat-project-quick-start/SKILL.md \
  packages/cli/src/commands/init/tools/shared/review-skill-contracts.test.ts
git commit -m "fix(workflow): clarify phase gate review setup"
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
- the “Phase gate review” planning choice, including its configured-target
  eligibility and its independence from HiLL approval and artifact review.

Integrate these changes into the post-`#132` docs without removing its configured
gate provenance, complete dispatch ladder, target-first reviewer, or adaptive
task-worker guidance.

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
- Regenerate tracked: `packages/cli/assets/skills/` for every changed canonical
  skill and `packages/cli/assets/docs/` for the updated documentation
- Regenerate if changed: `apps/oat-docs/index.md`

**Step 1: Apply release metadata and generate assets**

- Bump all five public packages from the rebased lockstep version `0.1.48` to
  `0.1.49`.
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
git add -A packages/cli/assets
git diff --cached --check
git commit -m "chore(release): bump public packages to 0.1.49"
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

| Scope  | Type     | Status      | Date       | Artifact                                                                                                   |
| ------ | -------- | ----------- | ---------- | ---------------------------------------------------------------------------------------------------------- |
| p01    | code     | pending     | -          | -                                                                                                          |
| p02    | code     | pending     | -          | -                                                                                                          |
| p03    | code     | pending     | -          | -                                                                                                          |
| final  | code     | pending     | -          | -                                                                                                          |
| spec   | artifact | passed      | 2026-07-10 | N/A (quick mode; no spec required)                                                                         |
| design | artifact | pending     | -          | -                                                                                                          |
| plan   | artifact | fixes_added | 2026-07-10 | `reviews/artifact-plan-review-2026-07-10T213532Z.md`; three Important findings resolved; re-review pending |

**Status values:** `pending` → `received` → `fixes_added` → `fixes_completed` →
`passed`

## Implementation Complete

**Summary:**

- Phase 1: 2 tasks — structured config model, resolution, and CLI
- Phase 2: 3 tasks — final-closeout orchestration, routing, resume safety, and
  Phase gate review terminology
- Phase 3: 3 tasks — documentation, release checks, and PJM backlog closeout

**Total: 3 phases, 8 tasks**

Ready for implementation only after the complete dispatch ladder, project named
ceiling, optional Phase gate review choice, and post-rebase plan review are
recorded.

The pre-rebase gate findings were resolved directly in this artifact, and the user
waived that configured gate rerun on 2026-07-10. The later rebase onto `c5190684`
introduced new plan-writing readiness contracts, so a new managed artifact review
is required before implementation readiness is restored.

## References

- Discovery: `discovery.md`
- Lightweight Design: `design.md`
- Backlog: `.oat/repo/pjm/backlog/items/BL-260709-split-post-implementation.md`
- Repository Instructions: `AGENTS.md`
- Docs Instructions: `apps/oat-docs/AGENTS.md`
