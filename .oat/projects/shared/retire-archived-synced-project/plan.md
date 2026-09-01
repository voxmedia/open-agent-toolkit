---
oat_status: complete
oat_ready_for: oat-project-implement
oat_blockers: []
oat_last_updated: 2026-09-01
oat_phase: plan
oat_phase_status: complete
oat_plan_parallel_groups:
  - [p02, p03]
oat_plan_hill_phases: [p04]
oat_auto_review_at_hill_checkpoints: true
oat_plan_source: quick
oat_import_reference: null
oat_import_source_path: null
oat_import_provider: null
oat_generated: false
oat_template: false
---

# Implementation Plan: retire-archived-synced-project

> Execute this plan using `oat-project-implement`.

**Goal:** Retire completed archived synced projects from the active record and
ref namespaces without losing durable archive identity, source-commit
reachability, migration safety, or idempotent recovery.

**Architecture:** Treat the tracked synced JSON record as active/transactional
state. After local and configured remote archive durability is proven, create
and verify `refs/oat/completed/<slug>` at the source SHA, remove the checkout,
and delete the JSON record in the exact lifecycle commit. The completed ref is
authoritative terminal identity: an absent active ref or an active ref at the
same SHA are both valid terminal states. A matching active ref is a stale alias
that active project surfaces must ignore; differing SHAs remain a hard recovery
mismatch. Legacy complete records remain a recoverable transition input.

**Tech Stack:** TypeScript ESM, Commander, Zod, Git custom refs, Vitest, pnpm,
Turborepo, Fumadocs documentation.

**Commit Convention:** `{type}({task-id}): {description}`

## Planning Checklist

- [x] Requirements confirmed with user
- [x] Evaluated phases for parallelism opportunities
- [x] Declared file-disjoint parallel group for p02 and p03
- [x] Confirm implementation HiLL checkpoints when execution starts (final phase p04)

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

### Task p01-t02: Implement idempotent completed-ref terminalization

**Files:**

- Modify: `packages/cli/src/commands/project/sync/ref-sync.ts`
- Modify: `packages/cli/src/commands/project/sync/ref-sync.test.ts`
- Modify: `packages/cli/src/commands/project/sync/git.ts`
- Modify: `packages/cli/src/commands/project/sync/git.test.ts`

**Step 1: Write failure-boundary tests**

Specify a transition helper that creates/verifies the completed ref at the
bound source SHA and returns a terminal receipt for either completed-only or
matching active/completed refs. Cover fresh atomic transition, atomic rejection
with a safe completed-ref fallback, completed-only retry, matching-both retry,
mismatched SHAs, missing source, remote rejection, and local-ref reconciliation.
If the remote supports atomic push, it may create completed and delete active
together. If atomic transition is unavailable, create and verify completed but
retain active at the same SHA; never require unsafe deletion after completed is
already present.

Run:

```bash
pnpm --filter @open-agent-toolkit/cli exec vitest run src/commands/project/sync/git.test.ts src/commands/project/sync/ref-sync.test.ts
```

Expected: transition and recovery cases fail before implementation.

**Step 2: Implement the transition state machine**

Return explicit terminal receipts containing active ref, completed ref,
verified SHA, and whether the active alias was retained. Treat completed-only
and matching-both as successful terminal outcomes. Never classify a matching
active alias as active work. Fail closed on SHA mismatches and make repeated
calls converge on the same terminal result without requiring cross-ref CAS for
a no-op completed update.

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
checkout, and source refs recoverable and does not begin terminal cleanup.

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
commit, after filesystem deletion of the JSON record but before that deletion
is committed, and after lifecycle commit recovery. Assert one snapshot
identity, one exact lifecycle commit, no active JSON record on success, and a
completed ref at `archiveSourceRefSha`. The active ref may be absent or remain
as a stale alias at that exact SHA; a differing active SHA must block sealing.

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
Require a terminal receipt classified as either `completed-only` or
`matching-aliases` before deleting the record. Use archive metadata plus
completed-ref state when retrying after checkout or active-ref removal. A retry
after the JSON file has already been deleted must locate and validate the
original snapshot from the completed ref plus persisted archive metadata; it
must not create a replacement active record or choose a new dated snapshot.

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
active-alias disposition, record-retirement status, lifecycle commit, archive
path, and S3 disposition.
Prove that a durability failure returns a non-success result and leaves
completion resumable. Add a direct command-entry recovery case where the JSON
record is already absent, the completed ref matches the persisted archive
metadata, and the command resumes the original snapshot/lifecycle receipt
instead of rejecting the project or creating a second snapshot.

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
- Modify: `packages/cli/src/commands/state/generate.ts`
- Modify: `packages/cli/src/commands/state/generate.test.ts`

**Step 1: Add classification tests**

Cover active absent records, complete archived legacy records, complete records
without an archive snapshot, recordless completed refs, both active/completed
refs during recovery, and fully retired projects. Legacy complete rows must
never recommend pull; use a precise archive-retry/migration diagnosis where
cleanup remains pending. Matching active/completed refs are a fully terminal
state: the completed ref is authoritative and the matching active alias must be
ignored. Differing ref SHAs are invalid recovery states with a precise
diagnosis. Fully retired projects must not appear as active. Add dashboard-
generation cases proving that fully retired projects remain omitted and that a
visible legacy terminal state renders the same cleanup diagnosis rather than a
continuation recommendation.

Run:

```bash
pnpm --filter @open-agent-toolkit/cli exec vitest run src/commands/project/list.test.ts src/commands/project/list.integration.test.ts src/commands/state/generate.test.ts
```

Expected: legacy records are incorrectly classified as `recorded-absent` before
implementation.

**Step 2: Implement terminal classifications**

Add only the row/type data needed to distinguish active absence, legacy
completion awaiting retirement, invalid recovery, and active remote discovery.
Do not enumerate `refs/oat/completed/*` as active projects. Route terminal
classification into dashboard generation so completed-only and matching-alias
projects stay absent, legacy cleanup uses the same diagnosis, and differing
active/completed SHAs remain visible only as invalid recovery.

**Step 3: Format**

```bash
pnpm exec oxfmt --write packages/control-plane/src/types.ts packages/cli/src/commands/project/list.ts packages/cli/src/commands/project/list.test.ts packages/cli/src/commands/project/list.integration.test.ts packages/cli/src/commands/state/generate.ts packages/cli/src/commands/state/generate.test.ts
```

**Step 4: Verify**

Run the scoped Vitest command from Step 1.

Expected: list JSON/text contracts distinguish terminal and active states.

**Step 5: Commit**

```bash
git add packages/control-plane/src/types.ts packages/cli/src/commands/project/list.ts packages/cli/src/commands/project/list.test.ts packages/cli/src/commands/project/list.integration.test.ts packages/cli/src/commands/state/generate.ts packages/cli/src/commands/state/generate.test.ts
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
ref, matching active/completed refs, differing active/completed refs, and an
ordinary active absent checkout. Terminal cases must return an actionable
archive/migration diagnosis and never create a nested checkout; mismatches must
return a precise recovery error; active cases keep current materialization
behavior.

Run:

```bash
pnpm --filter @open-agent-toolkit/cli exec vitest run src/commands/project/pull/index.test.ts src/commands/project/open/index.test.ts
```

Expected: terminal inputs currently rematerialize or fall through to generic
missing-project errors.

**Step 2: Implement terminal guards**

Use the p01 terminal probe before adoption/materialization. Keep recovery
instructions distinct for legacy record cleanup, already-retired projects, and
ref-SHA mismatches. A matching active alias never makes a completed project
pullable or openable.

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
ref plus any matching active alias while preserving local/S3 archives. Keep the
permanent-link-loss warning and force behavior; refuse a mismatched active ref.

Run:

```bash
pnpm --filter @open-agent-toolkit/cli exec vitest run src/commands/project/links/index.test.ts src/commands/project/links/render.test.ts src/commands/project/prune/index.test.ts
```

Expected: completed-only refs are not handled precisely.

**Step 2: Implement terminal link/prune routing**

Resolve the completed ref only for explicit terminal-safe operations. Never
make it eligible for pull/open. Prune must delete the correct completed ref and
any matching active alias, and must not remove or rewrite the durable archive
snapshot. Differing active/completed SHAs remain a hard mismatch.

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
- Modify: `packages/cli/src/commands/project/archive/sync-runner.test.ts`
- Modify: `packages/cli/src/commands/project/list.integration.test.ts`
- Modify: `packages/cli/src/commands/state/generate.test.ts`

**Step 1: Add integration fixtures**

Run a synced project from active record/ref through completed state, local and
configured S3 archive, completed-ref transition, checkout removal, record
deletion, listing omission, pull/open rejection, link reachability, and explicit
prune. Cover both valid terminal shapes: completed-only and matching active/
completed aliases. Add a differing-SHA mismatch, a legacy complete-record
fixture, and at least one interruption/retry fixture crossing the p02/p03 seam.
Prove that archive sync can restore the recordless terminal snapshot without
recreating active state, and that dashboard generation omits fully retired
projects while rendering a precise diagnosis for legacy terminal cleanup when
applicable.

Run:

```bash
pnpm --filter @open-agent-toolkit/cli exec vitest run src/e2e/workflow.test.ts src/commands/project/archive/archive-utils.test.ts src/commands/project/archive/sync-runner.test.ts src/commands/project/list.integration.test.ts src/commands/state/generate.test.ts
```

Expected: the new end-to-end expectations fail before the combined behavior is
fully integrated.

**Step 2: Reconcile integration seams**

Reconcile fixtures and assertions only. Preserve each parallel phase's source
ownership and do not redesign the completed-ref contract in integration. If an
integration failure exposes a source defect, return it to the owning p02 or p03
phase as a separately reviewed fix task and commit rather than modifying source
outside this task's declared write set. `sync-runner.ts` is expected to require
test-only proof in p04; if that expectation is false, add an explicitly owned
p02 fix task for the source change before continuing integration.

**Step 3: Format**

```bash
pnpm exec oxfmt --write packages/cli/src/e2e/workflow.test.ts packages/cli/src/commands/project/archive/archive-utils.test.ts packages/cli/src/commands/project/archive/sync-runner.test.ts packages/cli/src/commands/project/list.integration.test.ts packages/cli/src/commands/state/generate.test.ts
```

**Step 4: Verify**

Run the scoped Vitest command from Step 1.

Expected: the full active-to-archived transition and legacy migration pass.

**Step 5: Commit**

```bash
git add packages/cli/src/e2e/workflow.test.ts packages/cli/src/commands/project/archive/archive-utils.test.ts packages/cli/src/commands/project/archive/sync-runner.test.ts packages/cli/src/commands/project/list.integration.test.ts packages/cli/src/commands/state/generate.test.ts
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
prune. State that the completed ref is authoritative, that a same-SHA active ref
may remain as an inert alias, and that differing SHAs require recovery. Remove
claims that archive permanently keeps the active record.

**Step 2: Apply lockstep release versioning**

Bump all five public package versions together and update the lockfile. Confirm
the changed `oat-project-complete` skill received exactly one frontmatter
version bump relative to `origin/main`.

**Step 3: Format**

```bash
pnpm exec oxfmt --write apps/oat-docs/docs/reference/cli-reference.md apps/oat-docs/docs/reference/file-locations.md apps/oat-docs/docs/reference/oat-directory-structure.md apps/oat-docs/docs/workflows/projects/lifecycle.md apps/oat-docs/docs/workflows/projects/picking-up-projects.md packages/cli/package.json packages/control-plane/package.json packages/docs-config/package.json packages/docs-theme/package.json packages/docs-transforms/package.json
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

### Task p04-t03: (review) Prevent completed child resurrection

**Files:**

- Modify: `packages/cli/src/commands/project/sync/ref-sync.ts`
- Modify: `packages/cli/src/commands/project/sync/ref-sync.test.ts`

**Step 1: Add terminal-child regression tests**

Cover coordination children whose remote state is completed-only, matching
active/completed aliases, and differing SHAs. Assert that terminal children are
diagnosed without creating a checkout or discovery record, while mismatches
fail with the precise recovery diagnosis.

**Step 2: Apply authoritative terminal classification**

Probe each child's active and completed refs together before adoption or
`pullSynced`. Treat completed-only and matching aliases as terminal and inert;
fail closed on differing SHAs.

**Step 3: Format and verify**

```bash
pnpm exec oxfmt --write packages/cli/src/commands/project/sync/ref-sync.ts packages/cli/src/commands/project/sync/ref-sync.test.ts
pnpm --filter @open-agent-toolkit/cli exec vitest run src/commands/project/sync/ref-sync.test.ts
```

**Step 4: Commit**

```bash
git add packages/cli/src/commands/project/sync/ref-sync.ts packages/cli/src/commands/project/sync/ref-sync.test.ts
git commit -m "fix(p04-t03): suppress completed child pulls"
```

---

### Task p04-t04: (review) Reconcile interrupted completed-only prune

**Files:**

- Modify: `packages/cli/src/commands/project/prune/index.ts`
- Modify: `packages/cli/src/commands/project/prune/index.test.ts`

**Step 1: Add interrupted-state regression tests**

Create a completed-only terminal fixture that still has a checkout, local
active ref, and tracked discovery record. Cover cleanup failure and retry
boundaries as well as the successful path.

**Step 2: Make terminal prune fail closed**

Remove any remaining checkout, local active ref, and discovery record before
deleting the completed ref. Preserve the completed ref whenever local cleanup
cannot finish safely, and continue preserving archive data.

**Step 3: Format and verify**

```bash
pnpm exec oxfmt --write packages/cli/src/commands/project/prune/index.ts packages/cli/src/commands/project/prune/index.test.ts
pnpm --filter @open-agent-toolkit/cli exec vitest run src/commands/project/prune/index.test.ts
```

**Step 4: Commit**

```bash
git add packages/cli/src/commands/project/prune/index.ts packages/cli/src/commands/project/prune/index.test.ts
git commit -m "fix(p04-t04): reconcile completed-only prune"
```

---

### Task p04-t05: (review) Fail closed on completed-ref lookup errors

**Files:**

- Modify: `packages/cli/src/commands/project/list.ts`
- Modify: `packages/cli/src/commands/project/list.test.ts`
- Modify: `packages/cli/src/commands/project/list.integration.test.ts`
- Modify: `packages/cli/src/commands/state/generate.test.ts`

**Step 1: Add transport-failure regression tests**

Cover unreachable and authentication-failing remotes for active listing and
dashboard generation. Assert that lookup failure remains an actionable terminal
diagnosis and never degrades to active or pullable guidance.

**Step 2: Classify completed-ref lookup results**

Use the shared remote-ref lookup classifier. Return absence only for a verified
missing ref and propagate precise transport/authentication failures.

**Step 3: Format and verify**

```bash
pnpm exec oxfmt --write packages/cli/src/commands/project/list.ts packages/cli/src/commands/project/list.test.ts packages/cli/src/commands/project/list.integration.test.ts packages/cli/src/commands/state/generate.test.ts
pnpm --filter @open-agent-toolkit/cli exec vitest run src/commands/project/list.test.ts src/commands/project/list.integration.test.ts src/commands/state/generate.test.ts
```

**Step 4: Run combined review regression coverage**

```bash
pnpm --filter @open-agent-toolkit/cli exec vitest run src/commands/project/sync/ref-sync.test.ts src/commands/project/prune/index.test.ts src/commands/project/list.test.ts src/commands/project/list.integration.test.ts src/commands/state/generate.test.ts src/e2e/workflow.test.ts
```

**Step 5: Commit**

```bash
git add packages/cli/src/commands/project/list.ts packages/cli/src/commands/project/list.test.ts packages/cli/src/commands/project/list.integration.test.ts packages/cli/src/commands/state/generate.test.ts
git commit -m "fix(p04-t05): fail closed on terminal lookup errors"
```

---

### Task p04-t06: (review) Accept explicit null as no recap during archive resume

**Files:**

- Modify: `.agents/skills/oat-project-complete/scripts/execute-synced-archive-entry.mjs`
- Modify: `.agents/skills/oat-project-complete/tests/resolve-synced-archive-entry.test.mjs`

**Step 1: Analyze the null/omitted receipt seam**

Trace the archive library's nullable `projectRecapExport`, the first-party JSON
producer's omitted-field representation, and the continuation parser's null-as-
absent contract. Preserve strict validation for every non-null receipt.

**Step 2: Accept both supported no-recap representations**

Update the resume guard so `null` and `undefined` both mean that no recap was
exported. Do not weaken validation of source, export root, or manifest identity
when a recap receipt is present.

**Step 3: Verify targeted behavior**

Add a recordless archive-resume case with `projectRecapExport: null`. Assert
that it reaches downstream closeout with empty recap/evidence fields and does
not attempt recap attestation.

```bash
node --test .agents/skills/oat-project-complete/tests/resolve-synced-archive-entry.test.mjs
```

**Step 4: Verify project commands and commit**

Run the repository definition-of-done gates from p04-t02, plus the skill-specific
lint, format, and validation commands required for `.agents/skills` changes.

```bash
git add .agents/skills/oat-project-complete/scripts/execute-synced-archive-entry.mjs .agents/skills/oat-project-complete/tests/resolve-synced-archive-entry.test.mjs
git commit -m "fix(p04-t06): accept null recap resume receipts"
```

---

## Reviews

| Scope          | Type     | Status          | Date       | Artifact                                                    | Reviewed Head                            | Invocation | Gate Target                   |
| -------------- | -------- | --------------- | ---------- | ----------------------------------------------------------- | ---------------------------------------- | ---------- | ----------------------------- |
| p01            | code     | fixes_completed | 2026-08-31 | reviews/archived/p01-review-2026-08-31T052034Z.md           | ce631f78b9ebdce4746ec2f1614ffb30362c3ddf | manual     | -                             |
| p01            | code     | fixes_completed | 2026-08-31 | reviews/archived/p01-review-2026-08-31T053841Z.md           | 2ccde026814c4c3f09d21d2267fe0d394c58490d | manual     | -                             |
| p01            | code     | fixes_completed | 2026-08-31 | reviews/archived/p01-review-2026-08-31T055541Z.md           | 26264a2c8ed2fc0289473a81d0f296ceb764cb76 | manual     | -                             |
| p01            | code     | fixes_completed | 2026-08-31 | reviews/archived/p01-review-2026-08-31T120543Z.md           | 3d0f106597f80f5f3c22b96d89670028b89444b5 | manual     | -                             |
| p01            | code     | passed          | 2026-08-31 | reviews/archived/p01-review-2026-08-31T122419Z.md           | c59bcc4c0f54c8541a43090eea6ebfe33e34244d | manual     | -                             |
| p02            | code     | fixes_completed | 2026-08-31 | reviews/archived/p02-review-2026-08-31T130719Z.md           | 04b2ce008344b92ca9be447434dc9398b0037abf | manual     | -                             |
| p02            | code     | fixes_completed | 2026-08-31 | reviews/archived/p02-review-2026-08-31T134233Z.md           | 87c7d690e551d58429f9dffffb83c5f44c5bb206 | manual     | -                             |
| p02            | code     | blocked         | 2026-08-31 | reviews/archived/p02-review-2026-08-31T140841Z.md           | 2a8d84388376ef0f8f367dd321010182fe1afc93 | manual     | -                             |
| p02            | code     | fixes_completed | 2026-08-31 | reviews/archived/p02-review-2026-08-31T151747Z.md           | 294d7467873c0a223bc9550356ddf7d4c50d4cf6 | manual     | -                             |
| p02            | code     | passed          | 2026-08-31 | reviews/archived/p02-review-2026-08-31T154620Z.md           | 95bb211215e469645fb9fd7e371cf665cd4b0bab | manual     | -                             |
| p03            | code     | fixes_completed | 2026-08-31 | reviews/archived/p03-review-2026-08-31T131555Z.md           | 71b350d9a2afd58ee83d3330bf1294635d0bca0c | manual     | -                             |
| p03            | code     | passed          | 2026-08-31 | reviews/archived/p03-review-2026-08-31T134913Z.md           | 28162dae60ac623c3f680a608e374afa1d0c24c5 | manual     | -                             |
| p04            | code     | passed          | 2026-08-31 | reviews/archived/p04-review-2026-08-31T170239Z.md           | 7d9e9e77275a9ffb09ec0989662ec2954b257960 | manual     | -                             |
| final          | code     | fixes_completed | 2026-08-31 | reviews/archived/final-review-2026-08-31T171506Z.md         | fd9fe6615efc32a89ea977deeb6d4cc27b51c175 | auto       | -                             |
| final          | code     | passed          | 2026-08-31 | reviews/archived/final-review-2026-08-31T180107Z.md         | 98b005960b2c5f282fadb8781d990d2ed4a159c9 | auto       | -                             |
| final          | code     | passed          | 2026-08-31 | reviews/archived/final-review-2026-08-31T232653Z.md         | eab596991e11bfb864336101b93311668ced6366 | gate       | claude-fable-skip-permissions |
| github-pr #254 | code     | fixes_completed | 2026-09-01 | reviews/archived/remote-pr-254-review-2026-09-01T221509Z.md | 3f698e213e2bcfc0217750905322cbfb3a0d48ce | -          | -                             |
| p04-t06        | code     | passed          | 2026-09-01 | reviews/archived/p04-t06-review-2026-09-01T224206Z.md       | 9c1feafb843b71cb1b995395816001823d6d5d40 | manual     | -                             |
| final          | code     | passed          | 2026-09-01 | reviews/archived/final-review-2026-09-01T225407Z.md         | a8238ae1df5fee8b404b2d4ca0aa0f685b61f81d | auto       | -                             |
| spec           | artifact | pending         | -          | -                                                           | -                                        | -          | -                             |
| design         | artifact | pending         | -          | -                                                           | -                                        | -          | -                             |
| plan           | artifact | passed          | 2026-08-31 | structured plan-review (no artifact)                        | -                                        | auto       | -                             |
| plan           | artifact | passed          | 2026-08-31 | reviews/archived/artifact-plan-review-2026-08-31T044004Z.md | -                                        | gate       | claude-fable-skip-permissions |
| final          | code     | passed          | 2026-09-01 | reviews/archived/final-review-2026-09-01T231603Z.md         | 5a05907aee3f2a5bcff776baf9e9b870b3cc1b87 | gate       | claude-fable-skip-permissions |

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
- Phase 4: 6 tasks — end-to-end proof, documentation, versioning, release
  validation, final-review terminal-path fixes, and the remote-review
  null-recap correction.

**Total: 14 tasks across 4 phases**

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
