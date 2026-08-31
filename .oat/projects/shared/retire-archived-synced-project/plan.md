---
oat_status: in_progress
oat_ready_for: null
oat_blockers: []
oat_last_updated: 2026-08-31
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

# Implementation Plan: retire-archived-synced-project

> Execute this plan using `oat-project-implement`.

**Goal:** Retire completed archived synced projects from the active record and
ref namespaces without losing durable archive identity, source-commit
reachability, migration safety, or idempotent recovery.

**Architecture:** Treat the tracked synced JSON record as active/transactional
state. After local and configured remote archive durability is proven, move the
source commit from `refs/oat/projects/<slug>` to
`refs/oat/completed/<slug>`, remove the checkout, and delete the JSON record in
the exact lifecycle commit. Legacy complete records remain a recoverable
transition input, while active project surfaces ignore completed refs and emit
precise terminal diagnoses for direct actions.

**Tech Stack:** TypeScript ESM, Commander, Zod, Git custom refs, Vitest, pnpm,
Turborepo, Fumadocs documentation.

**Commit Convention:** `{type}({task-id}): {description}`

## Planning Checklist

- [x] Requirements confirmed with user
- [x] Evaluated phases for parallelism opportunities
- [x] Declared file-disjoint parallel group for p02 and p03
- [ ] Confirm implementation HiLL checkpoints when execution starts

## Parallelism

Phase p01 establishes the completed-ref naming and transition primitives used by
all later work. Phases p02 and p03 may then run concurrently in isolated
worktrees: p02 owns archive orchestration and completion-skill integration,
while p03 owns list/open/pull/links/prune behavior and control-plane row types.
They must not both modify the shared ref-transition implementation from p01.
Phase p04 runs only after both branches merge so its end-to-end fixtures, docs,
version bump, and release gates verify the combined contract.

---

## Phase 1: Terminal Ref and Transition Foundation

### Task p01-t01: Define completed synced-ref identity

**Files:**

- Modify: `packages/cli/src/commands/shared/project-scope.ts`
- Modify: `packages/cli/src/commands/shared/project-scope.test.ts`
- Modify: `packages/cli/src/commands/project/sync/resolve-target.ts`
- Modify: `packages/cli/src/commands/project/sync/resolve-target.test.ts`

**Step 1: Write failing contract tests**

Add tests for the canonical `refs/oat/completed/<slug>` name, slug validation,
and read-only resolution of these terminal refs without treating them as active
pull targets. Cover active-only, completed-only, both-ref recovery, and
wrong-SHA states.

Run:

```bash
pnpm --filter @open-agent-toolkit/cli exec vitest run src/commands/shared/project-scope.test.ts src/commands/project/sync/resolve-target.test.ts
```

Expected: the new completed-ref cases fail before implementation.

**Step 2: Implement the ref identity contract**

Add one canonical completed-ref constructor and terminal-ref probe shape. Keep
ordinary target resolution bound to `refs/oat/projects/*`; terminal lookup is
diagnostic/recovery data and must not make a project pullable.

**Step 3: Format**

Run:

```bash
pnpm exec oxfmt --write packages/cli/src/commands/shared/project-scope.ts packages/cli/src/commands/shared/project-scope.test.ts packages/cli/src/commands/project/sync/resolve-target.ts packages/cli/src/commands/project/sync/resolve-target.test.ts
```

**Step 4: Verify**

Run the scoped Vitest command from Step 1.

Expected: all targeted tests pass.

**Step 5: Commit**

```bash
git add packages/cli/src/commands/shared/project-scope.ts packages/cli/src/commands/shared/project-scope.test.ts packages/cli/src/commands/project/sync/resolve-target.ts packages/cli/src/commands/project/sync/resolve-target.test.ts
git commit -m "feat(p01-t01): define completed synced ref identity"
```

---

### Task p01-t02: Implement idempotent active-to-completed ref transition

**Files:**

- Modify: `packages/cli/src/commands/project/sync/ref-sync.ts`
- Modify: `packages/cli/src/commands/project/sync/ref-sync.test.ts`
- Modify: `packages/cli/src/commands/project/sync/git.ts`
- Modify: `packages/cli/src/commands/project/sync/git.test.ts`

**Step 1: Write failure-boundary tests**

Specify a transition helper that creates/verifies the completed ref at the
bound source SHA and removes the active remote ref without a history gap. Cover
fresh transition, retry after completed-ref creation, retry after active-ref
deletion, both refs at the same SHA, mismatched completed SHA, missing source,
remote rejection, and local-ref cleanup. If the remote supports atomic push,
assert that the helper requests it; still verify postconditions explicitly so
retries remain safe when a prior attempt partially completed.

Run:

```bash
pnpm --filter @open-agent-toolkit/cli exec vitest run src/commands/project/sync/git.test.ts src/commands/project/sync/ref-sync.test.ts
```

Expected: transition and recovery cases fail before implementation.

**Step 2: Implement the transition state machine**

Return explicit terminal states and receipts containing active ref, completed
ref, and verified SHA. Never delete the active ref until the completed ref is
verified at the bound SHA. Fail closed on mismatches and make repeated calls
converge on the same terminal result.

Also add a completed-ref deletion primitive for the existing explicit prune
path; it must remain separate from normal completion and retain destructive
warnings.

**Step 3: Format**

```bash
pnpm exec oxfmt --write packages/cli/src/commands/project/sync/ref-sync.ts packages/cli/src/commands/project/sync/ref-sync.test.ts packages/cli/src/commands/project/sync/git.ts packages/cli/src/commands/project/sync/git.test.ts
```

**Step 4: Verify**

Run the scoped Vitest command from Step 1.

Expected: all transition, mismatch, and retry cases pass.

**Step 5: Commit**

```bash
git add packages/cli/src/commands/project/sync/ref-sync.ts packages/cli/src/commands/project/sync/ref-sync.test.ts packages/cli/src/commands/project/sync/git.ts packages/cli/src/commands/project/sync/git.test.ts
git commit -m "feat(p01-t02): add idempotent synced ref retirement"
```

---

## Phase 2: Archive Transaction and Completion Integration

> May run in parallel with p03 after p01. This phase owns archive modules,
> completion transaction tests, and `oat-project-complete`.

### Task p02-t01: Gate terminal cleanup on archive durability

**Files:**

- Modify: `packages/cli/src/commands/project/archive/archive-utils.ts`
- Modify: `packages/cli/src/commands/project/archive/archive-utils.test.ts`

**Step 1: Add durability-gate tests**

Cover local archive creation, summary/recap export, configured S3 success,
configured S3 access/sync failure, unconfigured S3, and retry from an existing
verified snapshot. Assert that a configured S3 failure leaves the record,
checkout, and active ref recoverable and does not begin terminal cleanup.

Run:

```bash
pnpm --filter @open-agent-toolkit/cli exec vitest run src/commands/project/archive/archive-utils.test.ts
```

Expected: the new fail-closed S3 and cleanup-order assertions fail.

**Step 2: Establish the durability boundary**

Keep snapshot/source-SHA binding as the write-ahead identity. Move terminal ref
and record cleanup after all required archive outputs verify. Preserve existing
shared-project and S3-unconfigured behavior.

**Step 3: Format**

```bash
pnpm exec oxfmt --write packages/cli/src/commands/project/archive/archive-utils.ts packages/cli/src/commands/project/archive/archive-utils.test.ts
```

**Step 4: Verify**

Run the scoped Vitest command from Step 1.

Expected: durability gating and existing archive tests pass.

**Step 5: Commit**

```bash
git add packages/cli/src/commands/project/archive/archive-utils.ts packages/cli/src/commands/project/archive/archive-utils.test.ts
git commit -m "feat(p02-t01): gate retirement on archive durability"
```

---

### Task p02-t02: Seal synced archives without an active record

**Files:**

- Modify: `packages/cli/src/commands/project/archive/archive-utils.ts`
- Modify: `packages/cli/src/commands/project/archive/archive-utils.test.ts`
- Modify: `packages/cli/src/commands/project/push/completion-transaction.test.ts`

**Step 1: Add transaction-interruption tests**

Exercise interruptions before completed-ref creation, after completed-ref
creation, after active-ref removal, after checkout removal, before lifecycle
commit, and after lifecycle commit recovery. Assert one snapshot identity, one
exact lifecycle commit, no active JSON record on success, no active remote ref,
and a completed ref at `archiveSourceRefSha`.

Include legacy `status: complete` records with retained active refs and absent
checkouts so rerunning archive performs the same safe terminal transition.

Run:

```bash
pnpm --filter @open-agent-toolkit/cli exec vitest run src/commands/project/archive/archive-utils.test.ts src/commands/project/push/completion-transaction.test.ts
```

Expected: the record-deletion, ref-transition, and recovery cases fail.

**Step 2: Implement terminal sealing**

Invoke the p01 transition helper with the bound source SHA, remove the synced
checkout before the terminal lifecycle commit, then delete the record and
commit the deletion together with summary/recap exports. Extend lifecycle
receipt recovery to validate deletion rather than a complete-record payload.
Use archive metadata plus completed-ref state when retrying after checkout or
active-ref removal.

**Step 3: Format**

```bash
pnpm exec oxfmt --write packages/cli/src/commands/project/archive/archive-utils.ts packages/cli/src/commands/project/archive/archive-utils.test.ts packages/cli/src/commands/project/push/completion-transaction.test.ts
```

**Step 4: Verify**

Run the scoped Vitest command from Step 1.

Expected: all transaction permutations converge on one terminal seal.

**Step 5: Commit**

```bash
git add packages/cli/src/commands/project/archive/archive-utils.ts packages/cli/src/commands/project/archive/archive-utils.test.ts packages/cli/src/commands/project/push/completion-transaction.test.ts
git commit -m "feat(p02-t02): seal synced archive without active record"
```

---

### Task p02-t03: Integrate archive reporting and completion workflow

**Files:**

- Modify: `packages/cli/src/commands/project/archive/push-runner.ts`
- Modify: `packages/cli/src/commands/project/archive/push-runner.test.ts`
- Modify: `.agents/skills/oat-project-complete/SKILL.md`

**Step 1: Add command/report tests**

Require structured output to report the completed ref, verified source SHA,
record-retirement status, lifecycle commit, archive path, and S3 disposition.
Prove that a durability failure returns a non-success result and leaves
completion resumable.

Run:

```bash
pnpm --filter @open-agent-toolkit/cli exec vitest run src/commands/project/archive/push-runner.test.ts
```

Expected: the new receipt/report assertions fail.

**Step 2: Update the lifecycle caller**

Teach `oat-project-complete` to require the terminal archive receipt before
clearing the active pointer or declaring completion. Replace guidance that says
the active project ref and complete JSON record remain permanently. Bump the
skill frontmatter version exactly once for this PR.

**Step 3: Format**

```bash
pnpm exec oxfmt --write packages/cli/src/commands/project/archive/push-runner.ts packages/cli/src/commands/project/archive/push-runner.test.ts .agents/skills/oat-project-complete/SKILL.md
```

**Step 4: Verify**

```bash
pnpm --filter @open-agent-toolkit/cli exec vitest run src/commands/project/archive/push-runner.test.ts
pnpm oat:validate-skills
pnpm run check:skill-bumps
```

Expected: archive reporting and canonical skill checks pass.

**Step 5: Commit**

```bash
git add packages/cli/src/commands/project/archive/push-runner.ts packages/cli/src/commands/project/archive/push-runner.test.ts .agents/skills/oat-project-complete/SKILL.md
git commit -m "feat(p02-t03): integrate synced archive retirement"
```

---

## Phase 3: Terminal Discovery and Action Semantics

> May run in parallel with p02 after p01. This phase must consume p01's
> terminal-ref primitives without modifying their implementation.

### Task p03-t01: Classify legacy completed synced records precisely

**Files:**

- Modify: `packages/control-plane/src/types.ts`
- Modify: `packages/cli/src/commands/project/list.ts`
- Modify: `packages/cli/src/commands/project/list.test.ts`
- Modify: `packages/cli/src/commands/project/list.integration.test.ts`

**Step 1: Add classification tests**

Cover active absent records, complete archived legacy records, complete records
without an archive snapshot, recordless completed refs, both active/completed
refs during recovery, and fully retired projects. Legacy complete rows must
never recommend pull; use a precise archive-retry/migration diagnosis where
cleanup remains pending. Fully retired projects must not appear as active.

Run:

```bash
pnpm --filter @open-agent-toolkit/cli exec vitest run src/commands/project/list.test.ts src/commands/project/list.integration.test.ts
```

Expected: legacy records are incorrectly classified as `recorded-absent` before
implementation.

**Step 2: Implement terminal classifications**

Add only the row/type data needed to distinguish active absence, legacy
completion awaiting retirement, invalid recovery, and active remote discovery.
Do not enumerate `refs/oat/completed/*` as active projects.

**Step 3: Format**

```bash
pnpm exec oxfmt --write packages/control-plane/src/types.ts packages/cli/src/commands/project/list.ts packages/cli/src/commands/project/list.test.ts packages/cli/src/commands/project/list.integration.test.ts
```

**Step 4: Verify**

Run the scoped Vitest command from Step 1.

Expected: list JSON/text contracts distinguish terminal and active states.

**Step 5: Commit**

```bash
git add packages/control-plane/src/types.ts packages/cli/src/commands/project/list.ts packages/cli/src/commands/project/list.test.ts packages/cli/src/commands/project/list.integration.test.ts
git commit -m "fix(p03-t01): classify completed synced records"
```

---

### Task p03-t02: Prevent archived project resurrection through pull and open

**Files:**

- Modify: `packages/cli/src/commands/project/pull/index.ts`
- Modify: `packages/cli/src/commands/project/pull/index.test.ts`
- Modify: `packages/cli/src/commands/project/open/index.ts`
- Modify: `packages/cli/src/commands/project/open/index.test.ts`

**Step 1: Add direct-action tests**

Test pull/open by slug and path for a legacy complete record, a completed-only
ref, a both-ref recovery state, and an ordinary active absent checkout. Terminal
cases must return an actionable archive/migration diagnosis and never create a
nested checkout; active cases keep current materialization behavior.

Run:

```bash
pnpm --filter @open-agent-toolkit/cli exec vitest run src/commands/project/pull/index.test.ts src/commands/project/open/index.test.ts
```

Expected: terminal inputs currently rematerialize or fall through to generic
missing-project errors.

**Step 2: Implement terminal guards**

Use the p01 terminal probe before adoption/materialization. Keep recovery
instructions distinct for legacy record cleanup, already-retired projects, and
ref-SHA mismatches.

**Step 3: Format**

```bash
pnpm exec oxfmt --write packages/cli/src/commands/project/pull/index.ts packages/cli/src/commands/project/pull/index.test.ts packages/cli/src/commands/project/open/index.ts packages/cli/src/commands/project/open/index.test.ts
```

**Step 4: Verify**

Run the scoped Vitest command from Step 1.

Expected: archived projects cannot be reopened; active pulls still pass.

**Step 5: Commit**

```bash
git add packages/cli/src/commands/project/pull/index.ts packages/cli/src/commands/project/pull/index.test.ts packages/cli/src/commands/project/open/index.ts packages/cli/src/commands/project/open/index.test.ts
git commit -m "fix(p03-t02): block archived project resurrection"
```

---

### Task p03-t03: Align terminal links and destructive pruning

**Files:**

- Modify: `packages/cli/src/commands/project/links/compute.ts`
- Modify: `packages/cli/src/commands/project/links/index.ts`
- Modify: `packages/cli/src/commands/project/links/index.test.ts`
- Modify: `packages/cli/src/commands/project/links/render.test.ts`
- Modify: `packages/cli/src/commands/project/prune/index.ts`
- Modify: `packages/cli/src/commands/project/prune/index.test.ts`

**Step 1: Add terminal action tests**

Prove that existing rendered links remain full-SHA pinned after ref
reclassification, explicit link refresh can diagnose or read a completed ref
without reopening the project, and prune can intentionally delete a completed
ref while preserving local/S3 archives. Keep the permanent-link-loss warning
and force behavior.

Run:

```bash
pnpm --filter @open-agent-toolkit/cli exec vitest run src/commands/project/links/index.test.ts src/commands/project/links/render.test.ts src/commands/project/prune/index.test.ts
```

Expected: completed-only refs are not handled precisely.

**Step 2: Implement terminal link/prune routing**

Resolve the completed ref only for explicit terminal-safe operations. Never
make it eligible for pull/open. Prune must delete the correct completed ref and
must not remove or rewrite the durable archive snapshot.

**Step 3: Format**

```bash
pnpm exec oxfmt --write packages/cli/src/commands/project/links/compute.ts packages/cli/src/commands/project/links/index.ts packages/cli/src/commands/project/links/index.test.ts packages/cli/src/commands/project/links/render.test.ts packages/cli/src/commands/project/prune/index.ts packages/cli/src/commands/project/prune/index.test.ts
```

**Step 4: Verify**

Run the scoped Vitest command from Step 1.

Expected: link reachability and explicit terminal pruning pass without project
rematerialization.

**Step 5: Commit**

```bash
git add packages/cli/src/commands/project/links/compute.ts packages/cli/src/commands/project/links/index.ts packages/cli/src/commands/project/links/index.test.ts packages/cli/src/commands/project/links/render.test.ts packages/cli/src/commands/project/prune/index.ts packages/cli/src/commands/project/prune/index.test.ts
git commit -m "feat(p03-t03): align completed links and pruning"
```

---

## Phase 4: Integration, Documentation, and Release Validation

### Task p04-t01: Prove the terminal lifecycle end to end

**Files:**

- Modify: `packages/cli/src/e2e/workflow.test.ts`
- Modify: `packages/cli/src/commands/project/archive/archive-utils.test.ts`
- Modify: `packages/cli/src/commands/project/list.integration.test.ts`

**Step 1: Add integration fixtures**

Run a synced project from active record/ref through completed state, local and
configured S3 archive, completed-ref transition, checkout removal, record
deletion, listing omission, pull/open rejection, link reachability, and explicit
prune. Add a legacy complete-record fixture and at least one interruption/retry
fixture crossing the p02/p03 seam.

Run:

```bash
pnpm --filter @open-agent-toolkit/cli exec vitest run src/e2e/workflow.test.ts src/commands/project/archive/archive-utils.test.ts src/commands/project/list.integration.test.ts
```

Expected: the new end-to-end expectations fail before the combined behavior is
fully integrated.

**Step 2: Reconcile integration seams**

Apply only bounded fixes required to make the p02 transaction receipts and p03
terminal classifications agree. Preserve each parallel phase's ownership and
do not redesign the completed-ref contract in integration.

**Step 3: Format**

```bash
pnpm exec oxfmt --write packages/cli/src/e2e/workflow.test.ts packages/cli/src/commands/project/archive/archive-utils.test.ts packages/cli/src/commands/project/list.integration.test.ts
```

**Step 4: Verify**

Run the scoped Vitest command from Step 1.

Expected: the full active-to-archived transition and legacy migration pass.

**Step 5: Commit**

```bash
git add packages/cli/src/e2e/workflow.test.ts packages/cli/src/commands/project/archive/archive-utils.test.ts packages/cli/src/commands/project/list.integration.test.ts
git commit -m "test(p04-t01): prove synced archive retirement end to end"
```

---

### Task p04-t02: Document, version, and validate the shipped contract

**Files:**

- Modify: `apps/oat-docs/docs/reference/cli-reference.md`
- Modify: `apps/oat-docs/docs/reference/file-locations.md`
- Modify: `apps/oat-docs/docs/reference/oat-directory-structure.md`
- Modify: `apps/oat-docs/docs/workflows/projects/lifecycle.md`
- Modify: `apps/oat-docs/docs/workflows/projects/picking-up-projects.md`
- Modify: `packages/cli/package.json`
- Modify: `packages/control-plane/package.json`
- Modify: `packages/docs-config/package.json`
- Modify: `packages/docs-theme/package.json`
- Modify: `packages/docs-transforms/package.json`
- Modify: `pnpm-lock.yaml`

**Step 1: Update user-facing contracts**

Document active versus completed ref namespaces, successful record deletion,
legacy migration/retry diagnostics, configured S3 durability, terminal link
behavior, and the distinction between completion retention and destructive
prune. Remove claims that archive permanently keeps the active record/ref.

**Step 2: Apply lockstep release versioning**

Bump all five public package versions together and update the lockfile. Confirm
the changed `oat-project-complete` skill received exactly one frontmatter
version bump relative to `origin/main`.

**Step 3: Format**

```bash
pnpm exec oxfmt --write apps/oat-docs/docs/reference/cli-reference.md apps/oat-docs/docs/reference/file-locations.md apps/oat-docs/docs/reference/oat-directory-structure.md apps/oat-docs/docs/workflows/projects/lifecycle.md apps/oat-docs/docs/workflows/projects/picking-up-projects.md packages/cli/package.json packages/control-plane/package.json packages/docs-config/package.json packages/docs-theme/package.json packages/docs-transforms/package.json pnpm-lock.yaml
```

**Step 4: Run scoped evidence-grade tests**

```bash
OAT_TEST_HOME="$(mktemp -d)"
env HOME="$OAT_TEST_HOME" pnpm exec turbo run test --force --filter=@open-agent-toolkit/cli --filter=@open-agent-toolkit/control-plane
```

Expected: Turborepo reports forced execution rather than cached replay, and all
CLI/control-plane tests pass.

**Step 5: Run CI gates in repository order**

Run each command separately and record its exit code directly:

```bash
pnpm check
pnpm type-check
pnpm test
pnpm build
pnpm run check:skill-bumps
git fetch origin main
pnpm release:check-versions
pnpm release:validate
pnpm build:docs
```

Also run the skill/format coverage that CI does not subsume for the touched
canonical skill:

```bash
pnpm lint
pnpm format
pnpm oat:validate-skills
```

Expected: every command exits 0, version gates compare strictly above current
`origin/main`, and no required gate result is inferred through a pipe.

**Step 6: Commit**

```bash
git add apps/oat-docs/docs/reference/cli-reference.md apps/oat-docs/docs/reference/file-locations.md apps/oat-docs/docs/reference/oat-directory-structure.md apps/oat-docs/docs/workflows/projects/lifecycle.md apps/oat-docs/docs/workflows/projects/picking-up-projects.md packages/cli/package.json packages/control-plane/package.json packages/docs-config/package.json packages/docs-theme/package.json packages/docs-transforms/package.json pnpm-lock.yaml
git commit -m "docs(p04-t02): document synced archive retirement"
```

---

## Reviews

| Scope  | Type     | Status  | Date | Artifact | Reviewed Head | Invocation | Gate Target |
| ------ | -------- | ------- | ---- | -------- | ------------- | ---------- | ----------- |
| p01    | code     | pending | -    | -        | -             | -          | -           |
| p02    | code     | pending | -    | -        | -             | -          | -           |
| p03    | code     | pending | -    | -        | -             | -          | -           |
| p04    | code     | pending | -    | -        | -             | -          | -           |
| final  | code     | pending | -    | -        | -             | -          | -           |
| spec   | artifact | pending | -    | -        | -             | -          | -           |
| design | artifact | pending | -    | -        | -             | -          | -           |
| plan   | artifact | pending | -    | -        | -             | -          | -           |

Status progression:
`pending` → `received` → `fixes_added` → `fixes_completed` → `passed`.

## Implementation Complete

**Summary:**

- Phase 1: 2 tasks — canonical completed refs and idempotent transition
  primitives.
- Phase 2: 3 tasks — archive durability, recordless terminal sealing, and
  completion integration.
- Phase 3: 3 tasks — terminal classification, resurrection guards, links, and
  prune behavior.
- Phase 4: 2 tasks — end-to-end proof, documentation, versioning, and release
  validation.

**Total: 10 tasks across 4 phases**

Implementation is complete when every task is committed, the final review has
passed, and all repository definition-of-done gates exit 0 with uncached test
evidence captured where required.

## References

- Discovery: `discovery.md`
- Backlog:
  `.oat/repo/pjm/backlog/items/BL-260831-retire-archived-synced-project.md`
- Existing lifecycle implementation:
  `packages/cli/src/commands/project/archive/archive-utils.ts`
- Active/terminal ref synchronization:
  `packages/cli/src/commands/project/sync/ref-sync.ts`
