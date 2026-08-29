---
oat_status: complete
oat_ready_for: oat-project-implement
oat_blockers: []
oat_last_updated: 2026-08-29
oat_phase: plan
oat_phase_status: complete
oat_plan_parallel_groups: [] # groups of phases that run concurrently in worktrees; [] = fully sequential
oat_plan_hill_phases: ['p12'] # implementation pauses after the configured exit-gate normal-route repair
oat_auto_review_at_hill_checkpoints: true
oat_plan_source: spec-driven # spec-driven | quick | imported
oat_import_reference: null
oat_import_source_path: null
oat_import_provider: null
oat_generated: false
oat_template: false
---

# Implementation Plan: synced-project-scope

> Execute this plan using `oat-project-implement` — sequential by default, parallel when `oat_plan_parallel_groups` is declared.

**Goal:** Add a `synced` project scope whose artifacts live on a per-project custom git ref (`refs/oat/projects/<slug>`) checked out as a gitignored nested worktree, so PRs, `main`, and review bots never see agent-facing artifacts while agents keep full cross-machine continuity through git alone; give reviewers SHA-pinned links to discovery/design/summary from the PR body; preserve `shared`/`local` and completion behavior unchanged.

**Architecture:** Scope stays a directory convention (`.oat/projects/{shared,synced,local}/<slug>`); the CLI owns all git plumbing through a small ref-sync engine (`create/push/pull/continue/abort/prune/migrate`) plus one allowlisted parent-branch commit helper; skills replace their bookkeeping commits with `oat project push` behind a scope guard and pull at arrival; a per-project tracked JSON record is the only branch footprint.

**Tech Stack:** TypeScript ESM, Commander 12, zod, vitest (real git in `mkdtemp` fixtures with a bare `origin`), oxlint/oxfmt, bundled skills/docs in `packages/cli`.

**Commit Convention:** `{type}(pNN-tNN): {description}` — e.g. `feat(p01-t03): add git runner`

**Format command (all tasks):** `pnpm exec oxfmt --write <files>` for TS/JSON/MD; `pnpm exec oxlint <files>` for TS. Documented in root `AGENTS.md` (`pnpm format:fix` is the repo-wide form).

**Test command shape:** `pnpm --filter @open-agent-toolkit/cli exec vitest run <path/to/file.test.ts>` scopes to one file. `pnpm --filter @open-agent-toolkit/cli test` runs the package suite.

## Planning Checklist

- [x] Defer HiLL checkpoint confirmation to oat-project-implement
- [x] Evaluated phases for parallelism opportunities (none declared — p02/p03 both touch `push`, `scaffold.ts`, and `archive-utils.ts`; p04 depends on all CLI surfaces)
- [x] Set `oat_plan_parallel_groups` in frontmatter (`[]`)
- [x] Phase gate review: disabled (user declined); Phase gate review remains disabled.
- [x] Project dispatch policy recorded in `state.md` (`managed` / `high`)

---

## Parallelism

Fully sequential. Each phase builds on the previous phase's modules; p02 and p03 both modify `commands/project/new/scaffold.ts`, `commands/project/sync/*`, and `archive-utils.ts`.

---

## Plan-level notes

- **Design deviation (sequencing only):** `design.md` Phase 3 verification says "migrate this project to `synced` and continue the remaining phases on it." That is deferred until after implementation completes, because the skills that commit bookkeeping are rewritten in p04 — migrating the active project before the running `oat-project-implement` session has the new instructions would leave phase bookkeeping unable to commit. p03-t10 dogfoods the CLI on a scratch project and p04-t10 dogfoods the rewritten skill snippets on another scratch project after the sweep lands, so FR6's manual verification still happens inside the plan; self-migration is the recommended first act after this project completes (see `## Implementation Complete`). `design.md` was aligned to this sequencing during plan review.
- **Manual tasks:** p01-t10 (GitHub spike), p03-t10 (CLI dogfood), and p04-t10 (skill-sweep dogfood) run real git against `origin` using throwaway refs/projects and clean up after themselves. All three record evidence in `implementation.md` rather than committing code.
- **Bookkeeping during this project:** this project is `shared` scope; existing skill instructions apply unchanged.

---

## Phase 1: Sync foundations

Goal: the git core exists, is proven against a bare `origin`, and the GitHub assumptions are verified. No user-facing commands yet.

### Task p01-t01: Scope resolver module

**Files:**

- Create: `packages/cli/src/commands/shared/project-scope.ts`
- Create: `packages/cli/src/commands/shared/project-scope.test.ts`

**Step 1: Write test (RED)**

`project-scope.test.ts` cases:

- `resolveScopeRoot(repo, '.oat/projects/shared', 'synced')` → `<repo>/.oat/projects/synced`; same for `local`, `shared`; absolute `projectsRoot` respected.
- `resolveProjectScope('<repo>/.oat/projects/synced/x', '.oat/projects/shared')` → `synced`; `shared/x` → `shared`; `local/x` → `local`; `archived/x` and unrelated paths → `null`.
- `syncedRefName('my-slug')` → `refs/oat/projects/my-slug`; rejects slugs failing `[a-zA-Z0-9_-]+` / leading dash (throws `CliError`).
- `syncedRecordPath(root, slug)` → `<root>/<slug>.json`.
- `isSyncedCheckout(dir)` true only when `<dir>/.git` is a **file**; false for a `.git` directory or absence.
- `resolveDefaultScope` returns `synced` when config absent, honors `projects.defaultScope` and `OAT_PROJECTS_DEFAULT_SCOPE` (inject a fake `resolveEffectiveConfig`).

Run: `pnpm --filter @open-agent-toolkit/cli exec vitest run src/commands/shared/project-scope.test.ts`
Expected: fails — module missing.

**Step 2: Implement (GREEN)**

```typescript
export type ProjectScope = 'shared' | 'local' | 'synced';
export const PROJECT_SCOPES: readonly ProjectScope[];
export const SYNCED_REF_NAMESPACE = 'refs/oat/projects';
export const SYNCED_REMOTE = 'origin';
export function resolveProjectsParent(repoRoot, projectsRoot): string;
export function resolveScopeRoot(repoRoot, projectsRoot, scope): string;
export function resolveProjectScope(
  projectPath,
  projectsRoot,
): ProjectScope | null;
export function syncedRefName(slug): string;
export function syncedRecordPath(scopeRoot, slug): string;
export async function isSyncedCheckout(projectPath): Promise<boolean>;
export async function resolveDefaultScope(
  repoRoot,
  env,
  deps?,
): Promise<ProjectScope>;
```

Reuse the slug regex from `commands/project/new/scaffold.ts` (export it from there or move to this module and import back). `resolveDefaultScope` reads `projects.defaultScope` via the same effective-config path as `resolveProjectsRoot`; until p02-t01 lands the key, treat a missing key as `synced`.

**Step 3: Verify**

Run: `pnpm --filter @open-agent-toolkit/cli exec vitest run src/commands/shared/project-scope.test.ts && pnpm exec oxlint packages/cli/src/commands/shared/project-scope.ts`
Expected: all green, no lint errors.

**Step 4: Format**

Run: `pnpm exec oxfmt --write packages/cli/src/commands/shared/project-scope.ts packages/cli/src/commands/shared/project-scope.test.ts`

**Step 5: Commit**

```bash
git add packages/cli/src/commands/shared/project-scope.ts packages/cli/src/commands/shared/project-scope.test.ts
git commit -m "feat(p01-t01): add project scope resolver"
```

---

### Task p01-t02: Gitignore rule for synced artifact directories

**Files:**

- Modify: `packages/cli/src/commands/init/gitignore.ts`
- Modify: `packages/cli/src/commands/init/gitignore.test.ts`

**Step 1: Write test (RED)**

Add cases: `CORE_ENTRIES` (exported for test, or assert via generated section text) contains `.oat/projects/synced/*/`; applying to a repo that already has the old block yields `action: 'updated'` and the new line; re-apply → `no-change`; in a temp git repo, `git check-ignore -q .oat/projects/synced/x/` exits 0 and `git check-ignore -q .oat/projects/synced/x.json` exits 1.

Run: `pnpm --filter @open-agent-toolkit/cli exec vitest run src/commands/init/gitignore.test.ts`
Expected: new cases fail.

**Step 2: Implement (GREEN)**

Append `'.oat/projects/synced/*/'` to `CORE_ENTRIES` (directories only — trailing slash). Export `isSyncedRuleApplied(repoRoot)` helper (runs `git check-ignore -q --no-index .oat/projects/synced/__probe__/`) for p02-t02's self-heal.

**Step 3: Verify**

Run: `pnpm --filter @open-agent-toolkit/cli exec vitest run src/commands/init/gitignore.test.ts`
Expected: green.

**Step 4: Format**

Run: `pnpm exec oxfmt --write packages/cli/src/commands/init/gitignore.ts packages/cli/src/commands/init/gitignore.test.ts`

**Step 5: Commit**

```bash
git add packages/cli/src/commands/init/gitignore.ts packages/cli/src/commands/init/gitignore.test.ts
git commit -m "feat(p01-t02): ignore synced artifact directories in OAT core gitignore block"
```

---

### Task p01-t03: Git runner

**Files:**

- Create: `packages/cli/src/commands/project/sync/git.ts`
- Create: `packages/cli/src/commands/project/sync/git.test.ts`

**Step 1: Write test (RED)**

Cases: `run(['rev-parse','--is-inside-work-tree'], {cwd})` in a temp repo → `code 0`, trimmed stdout; nonzero exit throws `CliError(exit 2)` unless `allowFailure`; with `allowFailure` returns `{code, stderr}`; `env` merges over `process.env`; arguments are passed as an array (spy on `execFile` to assert no shell string).

Run: `pnpm --filter @open-agent-toolkit/cli exec vitest run src/commands/project/sync/git.test.ts`
Expected: fails.

**Step 2: Implement (GREEN)**

```typescript
export interface GitResult {
  stdout: string;
  stderr: string;
  code: number;
}
export interface GitRunner {
  run(
    args: string[],
    options: { cwd: string; env?: NodeJS.ProcessEnv; allowFailure?: boolean },
  ): Promise<GitResult>;
}
export const defaultGitRunner: GitRunner; // execFile('git', args, { cwd, env })
export function createGitRunner(execFileImpl?): GitRunner; // injectable for spies
```

**Step 3: Verify**

Run: `pnpm --filter @open-agent-toolkit/cli exec vitest run src/commands/project/sync/git.test.ts`
Expected: green.

**Step 4: Format**

Run: `pnpm exec oxfmt --write packages/cli/src/commands/project/sync/git.ts packages/cli/src/commands/project/sync/git.test.ts`

**Step 5: Commit**

```bash
git add packages/cli/src/commands/project/sync/
git commit -m "feat(p01-t03): add injectable git runner for project sync"
```

---

### Task p01-t04: Synced test fixture helper

**Files:**

- Create: `packages/cli/src/__tests__/synced-fixture.ts`
- Create: `packages/cli/src/__tests__/synced-fixture.test.ts`

**Step 1: Write test (RED)**

`synced-fixture.test.ts`: `createSyncedFixture()` returns `{ originDir, cloneA, cloneB?, cleanup }`; `cloneA` has `origin` pointing at the bare repo (absolute path), `user.email/name` configured, an initial commit on `main`, the OAT core gitignore block applied; `addLinkedWorktree(cloneA, 'feat')` returns a second worktree path; `cleanup()` removes everything.

Run: `pnpm --filter @open-agent-toolkit/cli exec vitest run src/__tests__/synced-fixture.test.ts`
Expected: fails.

**Step 2: Implement (GREEN)**

Follow `scaffold.test.ts`'s `initGitRepo` pattern: `mkdtemp(join(tmpdir(), 'oat-synced-'))`, `git init -q --bare origin.git`, `git clone -q`, config user, commit `README.md`, call `applyOatCoreGitignore`, commit, push `main`. Export `createSyncedFixture(options?: { secondClone?: boolean })`, `addLinkedWorktree(repoRoot, branch)`, `readRef(dir, ref)`, `originRefs(originDir)`.

**Step 3: Verify**

Run: `pnpm --filter @open-agent-toolkit/cli exec vitest run src/__tests__/synced-fixture.test.ts`
Expected: green; temp dirs removed after run.

**Step 4: Format**

Run: `pnpm exec oxfmt --write packages/cli/src/__tests__/synced-fixture.ts packages/cli/src/__tests__/synced-fixture.test.ts`

**Step 5: Commit**

```bash
git add packages/cli/src/__tests__/synced-fixture.ts packages/cli/src/__tests__/synced-fixture.test.ts
git commit -m "test(p01-t04): add bare-origin fixture for synced scope tests"
```

---

### Task p01-t05: Discovery record module

**Files:**

- Create: `packages/cli/src/commands/project/sync/record.ts`
- Create: `packages/cli/src/commands/project/sync/record.test.ts`

**Step 1: Write test (RED)**

Cases: zod schema accepts the canonical record and rejects wrong `scope`, `ref` ≠ `syncedRefName(slug)`, unknown `schemaVersion` (error names the upgrade hint), slug/filename mismatch on read; `writeSyncedRecord` emits 2-space JSON + trailing newline (byte-exact snapshot); `readSyncedRecord` returns `null` for a missing file; `listSyncedRecords(scopeRoot)` returns records sorted by slug and ignores directories and non-`.json` files.

Run: `pnpm --filter @open-agent-toolkit/cli exec vitest run src/commands/project/sync/record.test.ts`
Expected: fails.

**Step 2: Implement (GREEN)**

```typescript
export interface SyncedProjectRecord {
  schemaVersion: 1;
  slug;
  scope: 'synced';
  ref;
  remote;
  status: 'active' | 'complete';
  createdAt;
  completedAt: string | null;
}
export const SyncedProjectRecordSchema: z.ZodType<SyncedProjectRecord>;
export function buildSyncedRecord(slug, now: Date): SyncedProjectRecord;
export async function readSyncedRecord(
  path,
): Promise<SyncedProjectRecord | null>;
export async function writeSyncedRecord(path, record): Promise<void>;
export async function listSyncedRecords(
  scopeRoot,
): Promise<SyncedProjectRecord[]>;
```

**Step 3: Verify**

Run: `pnpm --filter @open-agent-toolkit/cli exec vitest run src/commands/project/sync/record.test.ts`
Expected: green.

**Step 4: Format**

Run: `pnpm exec oxfmt --write packages/cli/src/commands/project/sync/record.ts packages/cli/src/commands/project/sync/record.test.ts`

**Step 5: Commit**

```bash
git add packages/cli/src/commands/project/sync/record.ts packages/cli/src/commands/project/sync/record.test.ts
git commit -m "feat(p01-t05): add synced project discovery record module"
```

---

### Task p01-t06: Ref sync engine — create + mutation invariants

**Files:**

- Create: `packages/cli/src/commands/project/sync/ref-sync.ts`
- Create: `packages/cli/src/commands/project/sync/ref-sync.test.ts`

**Step 1: Write test (RED)**

Using `createSyncedFixture()`:

- `createSyncedProject(target)` → `refs/oat/projects/<slug>` exists locally pointing at a commit whose tree is the empty tree (`4b825dc642cb6eb9a060e54bf8d69288fbee4904`); `<projectPath>/.git` is a file; `git -C <projectPath> rev-parse --show-toplevel` equals `projectPath`; parent `status --porcelain` is empty.
- Two different slugs → different root commit hashes, same tree hash.
- `assertNestedWorktree(target)` throws `CliError(2)` when `projectPath` is not the nested toplevel (e.g. pointing at `repoRoot`).
- `assertAllowlistedPathspecs(repoRoot, paths)` accepts record file, `.gitignore`, `.gitattributes`, a `.oat/projects/shared/<x>` dir, the configured summary export file; rejects `src/index.ts` and `.oat/projects/synced/<x>/state.md`.

Run: `pnpm --filter @open-agent-toolkit/cli exec vitest run src/commands/project/sync/ref-sync.test.ts`
Expected: fails.

**Step 2: Implement (GREEN)**

```typescript
export interface SyncTarget {
  repoRoot;
  slug;
  projectPath;
  ref;
  remote;
}
export function buildSyncTarget(repoRoot, projectsRoot, slug): SyncTarget;
export async function createSyncedProject(t, git): Promise<void>;
//  hash-object -t tree /dev/null → commit-tree → update-ref → worktree add --detach
export async function assertNestedWorktree(t, git): Promise<void>; // invariant 1
export function assertAllowlistedPathspecs(repoRoot, pathspecs, opts): void; // invariant 3
```

Invariant 2 (common-dir commands may only name `<ref>` and `projectPath`) is enforced by construction: every such call site builds args from `SyncTarget` fields only — add a unit test in p01-t07 via runner spy.

**Step 3: Verify**

Run: `pnpm --filter @open-agent-toolkit/cli exec vitest run src/commands/project/sync/ref-sync.test.ts`
Expected: green.

**Step 4: Format**

Run: `pnpm exec oxfmt --write packages/cli/src/commands/project/sync/ref-sync.ts packages/cli/src/commands/project/sync/ref-sync.test.ts`

**Step 5: Commit**

```bash
git add packages/cli/src/commands/project/sync/ref-sync.ts packages/cli/src/commands/project/sync/ref-sync.test.ts
git commit -m "feat(p01-t06): create synced project refs and worktrees with mutation invariants"
```

---

### Task p01-t07: Ref sync engine — push (commit-first)

**Files:**

- Modify: `packages/cli/src/commands/project/sync/ref-sync.ts`
- Modify: `packages/cli/src/commands/project/sync/ref-sync.test.ts`

**Step 1: Write test (RED)**

- First push after create → `pushed`; `origin` has the ref; local ref == HEAD.
- Clean checkout, nothing new → `up-to-date`, no new commit (`rev-list --count` unchanged).
- Pending edit, remote unchanged → `pushed`, one new commit with the given message.
- **Dirty local + remote advanced, non-overlapping files** (edit in cloneB, push; edit a different file in cloneA) → `pushed`; nested log shows both commits, local commit on top.
- **Dirty local + remote advanced, same file** → `conflict`, `conflicts: ['state.md']`; nested `git log` already contains the local commit; `rebase --abort` afterwards restores it.
- Concurrent race (spy runner makes `push` fail once with non-fast-forward after the rebase) → `rejected`, no `--force` anywhere in recorded args (runner spy asserts).
- Message default `chore(oat): sync <slug> artifacts` when `opts.message` absent.

Run: `pnpm --filter @open-agent-toolkit/cli exec vitest run src/commands/project/sync/ref-sync.test.ts`
Expected: new cases fail.

**Step 2: Implement (GREEN)**

```typescript
export type PushResult = {
  status: 'pushed' | 'up-to-date' | 'rejected' | 'conflict';
  sha;
  conflicts?: string[];
};
export async function pushSynced(
  t,
  git,
  opts: { message?: string },
): Promise<PushResult>;
// assertNestedWorktree → add -A → commit (skip if clean) → fetch +ref:ref (tolerate missing)
// → if !(merge-base --is-ancestor <ref> HEAD): rebase <ref> → on conflict: status conflict
// → push <remote> HEAD:<ref> (allowFailure; non-ff ⇒ rejected) → update-ref <ref> HEAD
```

**Step 3: Verify**

Run: `pnpm --filter @open-agent-toolkit/cli exec vitest run src/commands/project/sync/ref-sync.test.ts`
Expected: green.

**Step 4: Format**

Run: `pnpm exec oxfmt --write packages/cli/src/commands/project/sync/ref-sync.ts packages/cli/src/commands/project/sync/ref-sync.test.ts`

**Step 5: Commit**

```bash
git add packages/cli/src/commands/project/sync/ref-sync.ts packages/cli/src/commands/project/sync/ref-sync.test.ts
git commit -m "feat(p01-t07): implement commit-first push for synced projects"
```

---

### Task p01-t08: Ref sync engine — pull, continue, abort, multi-worktree

**Files:**

- Modify: `packages/cli/src/commands/project/sync/ref-sync.ts`
- Modify: `packages/cli/src/commands/project/sync/ref-sync.test.ts`

**Step 1: Write test (RED)**

- Fresh clone (cloneB, no checkout) → `created`; files match cloneA's pushed tree; `worktree list` in B shows the nested path.
- Second pull → `up-to-date`.
- Uncommitted edit in checkout → `dirty`, files untouched.
- Divergent committed edits (push from A after B committed locally) → `conflict`; resolve file; `continueSynced` → `updated`; subsequent `pushSynced` → `pushed`.
- `abortSynced` after conflict → HEAD is the pre-rebase local commit (`rev-parse HEAD` unchanged), status clean.
- Linked worktree case: `addLinkedWorktree(cloneA,'feat')` → pull in the linked worktree creates an independent detached checkout; push from it, pull in cloneA → identical `ls-tree` output; `git worktree remove <linked>` then `pullSynced` in cloneA still `up-to-date` (prune ran).
- Stale registration: delete the checkout directory with `rm -rf`, pull → `created` (prune before add).

Run: `pnpm --filter @open-agent-toolkit/cli exec vitest run src/commands/project/sync/ref-sync.test.ts`
Expected: new cases fail.

**Step 2: Implement (GREEN)**

```typescript
export type PullResult = {
  status: 'created' | 'updated' | 'up-to-date' | 'conflict' | 'dirty';
  sha;
  conflicts?: string[];
};
export async function pullSynced(t, git): Promise<PullResult>;
export async function continueSynced(t, git): Promise<PullResult>; // rebase --continue, GIT_EDITOR=true
export async function abortSynced(t, git): Promise<void>;
function listConflicts(t, git): Promise<string[]>; // status --porcelain, UU/AA/DU/UD rows
```

**Step 3: Verify**

Run: `pnpm --filter @open-agent-toolkit/cli exec vitest run src/commands/project/sync/ref-sync.test.ts`
Expected: green.

**Step 4: Format**

Run: `pnpm exec oxfmt --write packages/cli/src/commands/project/sync/ref-sync.ts packages/cli/src/commands/project/sync/ref-sync.test.ts`

**Step 5: Commit**

```bash
git add packages/cli/src/commands/project/sync/ref-sync.ts packages/cli/src/commands/project/sync/ref-sync.test.ts
git commit -m "feat(p01-t08): implement pull, continue, and abort for synced projects"
```

---

### Task p01-t09: Ref sync engine — parent-branch record commits and checkout removal

**Files:**

- Modify: `packages/cli/src/commands/project/sync/ref-sync.ts`
- Modify: `packages/cli/src/commands/project/sync/ref-sync.test.ts`

**Step 1: Write test (RED)**

- `commitRecordChange(repoRoot, [recordPath], msg)` stages exactly that path (runner spy: `add -- <path>`), commits, returns `{sha}`; parent `ls-tree HEAD` contains the record; nothing else staged even when an unrelated file is dirty.
- Returns `null` and makes no commit when nothing changed.
- **Pre-staged unrelated change:** stage `src/unrelated.ts` first, then call the helper for the record → the new commit's `diff-tree --name-only` lists only the record; `src/unrelated.ts` is still staged and uncommitted afterwards (NFR4). Implementation must commit with pathspecs (`git commit -m <msg> -- <pathspecs>`, the semantics the existing `commitScaffold` already relies on) — never a bare `git commit` after `git add`.
- Rejects a non-allowlisted pathspec before any `git add` (spy: no `add` call).
- `removeSyncedCheckout(t)` on clean + pushed checkout → directory gone, `worktree list` has no entry, no `--force` in args.
- Dirty checkout → returns `{status:'dirty'}` and leaves it; unpushed commit → `{status:'unpushed'}`.
- `{force:true}` on dirty → removed with `--force`.
- `preflightSyncedCheckout(t)` (non-mutating; fetches, then reports `clean` | `dirty` | `unpushed` | `absent`) never runs `worktree remove` (runner spy) and is what `removeSyncedCheckout`, archive, and prune call before mutating.
- Two branches (cloneA `feat-a`, cloneB `feat-b`) each `commitRecordChange` a different record file; merging both into `main` in the fixture produces no conflict (FR5 concurrent-PR case).

Run: `pnpm --filter @open-agent-toolkit/cli exec vitest run src/commands/project/sync/ref-sync.test.ts`
Expected: new cases fail.

**Step 2: Implement (GREEN)**

```typescript
export async function commitRecordChange(
  repoRoot,
  pathspecs,
  message,
  git,
): Promise<{ sha } | null>;
export type CheckoutPreflight = {
  status: 'clean' | 'dirty' | 'unpushed' | 'absent';
  sha?: string;
};
export async function preflightSyncedCheckout(
  t,
  git,
): Promise<CheckoutPreflight>; // read-only
export type RemoveResult = {
  status: 'removed' | 'absent' | 'dirty' | 'unpushed';
};
export async function removeSyncedCheckout(
  t,
  git,
  opts?: { force?: boolean },
): Promise<RemoveResult>;
```

**Step 3: Verify**

Run: `pnpm --filter @open-agent-toolkit/cli exec vitest run src/commands/project/sync/ref-sync.test.ts`
Expected: green.

**Step 4: Format**

Run: `pnpm exec oxfmt --write packages/cli/src/commands/project/sync/ref-sync.ts packages/cli/src/commands/project/sync/ref-sync.test.ts`

**Step 5: Commit**

```bash
git add packages/cli/src/commands/project/sync/ref-sync.ts packages/cli/src/commands/project/sync/ref-sync.test.ts
git commit -m "feat(p01-t09): add allowlisted record commits and safe checkout removal"
```

---

### Task p01-t10: GitHub custom-ref spike (manual verification)

**Files:**

- Modify: `.oat/projects/shared/synced-project-scope/implementation.md` (evidence only)

**Status: pre-verified on 2026-08-27 (see `implementation.md` → GitHub custom-ref spike).** A, A′, and C are proven and B is proven via the contents/commits API; the implementer only needs to (1) confirm the browser-rendered blob page in a logged-in session if the maintainer has not already, and (2) copy the recorded evidence into the p01-t10 section rather than re-running the pushes. Re-run the full sequence only if the disposable repository was recreated. Shell note: quote `${C}` with braces — in zsh, `$C:r` is a history modifier and silently mangles `refs/...`.

**Why a disposable repo:** every `on: push` workflow in this repository is filtered to `branches: [main]`, so "no run after pushing a custom ref here" proves nothing. The negative CI result must come from a repository whose workflow has **no** branch filter.

**Step 1: Use the maintainer-provided disposable repository and add an unfiltered push workflow**

The maintainer created `https://github.com/tkstang/disposable-test-repo-for-oat` for this spike. Do **not** create or delete repositories; deleting this one is an operator step after implementation completes (see `## Implementation Complete`).

```bash
SPIKE_REPO_URL=https://github.com/tkstang/disposable-test-repo-for-oat
git clone "$SPIKE_REPO_URL" oat-spike && cd oat-spike
mkdir -p .github/workflows && cat > .github/workflows/probe.yml <<'YML'
name: probe
on: [push]            # deliberately unfiltered: any ref push that GitHub considers a trigger runs this
jobs:
  probe:
    runs-on: ubuntu-latest
    steps: [ { run: "echo ref=$GITHUB_REF sha=$GITHUB_SHA" } ]
YML
git add -A && git commit -qm "probe workflow" && git push -u origin HEAD
# Wait until the main-branch run appears — this proves the workflow is active before the negative test.
until gh run list --json headSha,status --jq '.[]|select(.headSha=="'$(git rev-parse HEAD)'")' | grep -q .; do sleep 10; done
```

**Step 2: Push a workflow-bearing commit to a custom ref, then to a branch (the contrast is the proof)**

```bash
# Build the spike commit ON TOP of the workflow-bearing tip so its tree contains .github/workflows/probe.yml
# (a commit without the workflow file could never trigger Actions anywhere, which would make "no run" meaningless).
printf '# spike\n\nrendered from a custom ref\n' > design.md && git add design.md
TREE=$(git write-tree); git reset -q design.md; rm design.md
C=$(git commit-tree "$TREE" -p HEAD -m "oat spike"); BLOB=$(git rev-parse "${C}:design.md")
SPIKE=refs/oat/projects/spike; git update-ref "$SPIKE" "$C" && git push origin "${C}:${SPIKE}"
sleep 120   # give Actions time to create any run for the pushed ref
# A. No workflow run for the custom-ref push — the negative half (NFR2):
gh run list --limit 50 --json headSha,event,headBranch --jq '.[]|select(.headSha=="'$C'")'   # expected: empty
# A'. Positive control: the SAME commit pushed to a branch DOES run the workflow:
git push origin "${C}:refs/heads/oat-spike-branch"; sleep 120
gh run list --limit 50 --json headSha,event,headBranch --jq '.[]|select(.headSha=="'$C'")'   # expected: one run, headBranch == oat-spike-branch
# B. The *blob* URL renders for the commit while it is reachable only from the custom ref
#    (run B after deleting the branch in Step 3, then re-check it still renders):
BLOB_URL="https://github.com/$(gh repo view --json nameWithOwner --jq .nameWithOwner)/blob/$C/design.md"
curl -fsSL "$BLOB_URL" | grep -q "rendered from a custom ref" && echo "blob renders: $BLOB_URL"
gh api "repos/{owner}/{repo}/contents/design.md?ref=$C" --jq .sha                              # expected: $BLOB
# C. Ref absent from branch list once the contrast branch is deleted:
gh api "repos/{owner}/{repo}/branches" --jq '.[].name'                                          # expected: main only
```

**Step 3: Clean up**

```bash
git push origin ":refs/heads/oat-spike-branch"          # delete the contrast branch first, then re-run check B and C
git push origin ":$SPIKE"; git update-ref -d "$SPIKE"; cd .. && rm -rf oat-spike   # delete the spike ref and local clone only; the repository stays for the operator
```

If pushing to the disposable repository is not permitted for the implementing agent, stop and hand the checks to the user — this task is a hard prerequisite for Phase 3's links work, not something to skip.

**Step 4: Record evidence**

Append `### p01-t10 GitHub spike` to `implementation.md` with the repository URL, spike SHA, blob SHA, the exact blob URL that rendered, the four raw outputs (A negative, A' positive control, B, C), timestamps, and confirmation both refs were deleted. If A is non-empty **or A' is empty** (the workflow never ran even for the branch — the control failed and the negative proves nothing) the spike is inconclusive: fix the probe and re-run before recording. If A is non-empty (a run was created for the custom ref) or B fails (commit not served), **stop the phase and surface it** — the design's contingency is a real branch under `refs/heads/oat/projects/*`, which is a design change and needs the user.

**Step 5: Verify**

Run: `git ls-remote "$SPIKE_REPO_URL" 'refs/oat/*'`
Expected: empty (spike ref deleted; the repository itself remains until the operator deletes it).

**Step 6: Commit**

```bash
git add .oat/projects/shared/synced-project-scope/implementation.md
git commit -m "chore(p01-t10): record GitHub custom-ref spike evidence"
```

---

## Phase 2: CLI surface

Goal: users can create, inspect, push, pull, and list `synced` projects; the default scope is configurable.

### Task p02-t01: `projects.defaultScope` config key

**Files:**

- Modify: `packages/cli/src/config/oat-config.ts` (`OatConfig.projects`, parser/normalizer)
- Modify: `packages/cli/src/config/resolve.ts` (`DEFAULT_SHARED_CONFIG.projects.defaultScope = 'synced'`, `ENV_OVERRIDE_MAP['projects.defaultScope'] = 'OAT_PROJECTS_DEFAULT_SCOPE'`)
- Modify: `packages/cli/src/commands/config/index.ts` (`ConfigKey` union, `KEY_ORDER`, `CONFIG_CATALOG` entry after `projects.root`, enum values, `isStructuralKey`, setter switch)
- Modify: `packages/cli/src/config/resolve.test.ts`, `packages/cli/src/commands/config/index.test.ts`

**Step 1: Write test (RED)**

- Effective config default is `synced`; shared config `shared` wins over default; env `OAT_PROJECTS_DEFAULT_SCOPE=local` wins over shared; invalid value (`foo`) rejected by `oat config set` with the enum message.
- `oat config get projects.defaultScope` prints the effective value; `--json` includes `source`.
- Setting is refused on `--local`/`--user` surfaces (structural key, shared-only) — mirror the `projects.root` tests.

Run: `pnpm --filter @open-agent-toolkit/cli exec vitest run src/config/resolve.test.ts src/commands/config/index.test.ts`
Expected: new cases fail.

**Step 2: Implement (GREEN)**

Add `defaultScope?: 'shared' | 'local' | 'synced'` to `OatConfig.projects`; catalog entry: type `enum`, values from `PROJECT_SCOPES`, `defaultValue: 'synced'`, description "Scope used by `oat project new` when `--scope` is omitted." Wire `resolveDefaultScope` (p01-t01) to read this key.

**Step 3: Verify**

Run: `pnpm --filter @open-agent-toolkit/cli exec vitest run src/config src/commands/config && pnpm --filter @open-agent-toolkit/cli type-check`
Expected: green.

**Step 4: Format**

Run: `pnpm exec oxfmt --write packages/cli/src/config/oat-config.ts packages/cli/src/config/resolve.ts packages/cli/src/commands/config/index.ts packages/cli/src/config/resolve.test.ts packages/cli/src/commands/config/index.test.ts`

**Step 5: Commit**

```bash
git add packages/cli/src/config packages/cli/src/commands/config
git commit -m "feat(p02-t01): add projects.defaultScope config key"
```

---

### Task p02-t02: Scope-aware scaffold

**Files:**

- Modify: `packages/cli/src/commands/project/new/scaffold.ts`
- Modify: `packages/cli/src/commands/project/new/scaffold.test.ts`
- Modify: `packages/cli/src/commands/project/log/lifecycle.integration.test.ts` (`:134` — pass `scope: 'shared'`; the temp repo has no `origin`)
- Modify: `packages/cli/src/projects/split/seed-children.ts` (`:144`) and `packages/cli/src/projects/split/write-parent.ts` (`:189`) — children and coordination parents inherit the parent's scope via `resolveProjectScope(parentPath, projectsRoot)`, never the config default
- Modify: `packages/cli/src/projects/split/finalize.ts` (`:35-48` builds parent/child/active paths from `projectsRoot` — carry the resolved parent **scope root** through write → seed → finalize so a `synced` split finalizes and activates `synced/<child>`, never `shared/<child>`) and `packages/cli/src/commands/project/split/run.ts` (thread the scope through the split context)
- Split of a `synced` parent must **push again after all post-scaffold mutations**: `scaffoldProject` publishes each ref before `writeCoordinationParent`/`seedChildren` write `oat_children`, `oat_parent`, siblings, and discovery seeds; finalize therefore calls `pushSynced` for the parent and every child so the remote parent ref actually carries `oat_children` (FR17 depends on it)
- Modify: `packages/cli/src/projects/split/__tests__/*` (add "split of a shared parent produces shared children")

**Step 1: Write test (RED)**

Using `createSyncedFixture()` (scaffold tests already use temp git repos; switch the new cases to the fixture so `origin` exists):

- `oat project split` of a `shared` parent → every child scaffolded under `shared/`, no refs created (NFR1); of a `synced` parent → children `synced`.
- **End-to-end synced split** (fixture with origin): `oat project split` of a `synced` parent → `activeProject` is `synced/<initial-child>`; `git show refs/oat/projects/<parent>:state.md` on **origin** contains the full `oat_children` list; each child ref's `state.md` carries `oat_parent`; parent `status --porcelain` shows only the record files.

- `scaffoldProject({ scope: 'shared' })` → identical result to today's tests (path under `shared/`, scaffold commit stages the project dir). Existing tests must pass unchanged with `scope` omitted **when** `resolveDefaultScope` is injected to return `shared` — add that injection to the existing suite's default deps so they keep exercising `shared`.
- `scope: 'local'` → path under `local/`, no commit attempted.
- `scope: 'synced'` → ref created on `origin`; checkout at `synced/<slug>` with the scaffolded templates committed on the ref (`chore(oat): scaffold <slug>`); record file written; scaffold commit on the branch stages **only** the record (and `.gitignore` when the fixture lacked the rule — test both); parent `status --porcelain` empty afterwards; `activeProject` set to the synced path.
- `synced` without `origin` → `CliError` naming `--scope local` as the alternative; no ref, no directory left behind.
- `synced` in a repo missing the gitignore rule → rule applied, `.gitignore` in the scaffold commit, warning logged.

Run: `pnpm --filter @open-agent-toolkit/cli exec vitest run src/commands/project/new/scaffold.test.ts`
Expected: new cases fail.

**Step 2: Implement (GREEN)**

- `ScaffoldProjectOptions.scope?: ProjectScope`; `ScaffoldProjectDependencies` gains `resolveDefaultScope`, `gitRunner`, `createSyncedProject`, `pushSynced`, `commitRecordChange`, `writeSyncedRecord`, `applyOatCoreGitignore`, `isSyncedRuleApplied`.
- Resolve `scope` → `scopeRoot` via `resolveScopeRoot`; for `synced`: ensure `origin` (`git remote get-url origin`), self-heal gitignore, `createSyncedProject`, write templates into the checkout, `pushSynced({message:'chore(oat): scaffold <slug>'})`, `writeSyncedRecord`, then `commitRecordChange([record, '.gitignore'?], 'chore(oat): scaffold <slug>')`. `commitScaffold` becomes a thin wrapper over `commitRecordChange` for `shared` (allowlist gains "the shared project directory being scaffolded").
- Result gains `scope`, `ref?`, `sha?`.

**Step 3: Verify**

Run: `pnpm --filter @open-agent-toolkit/cli test`
Expected: the whole package suite is green (the default-scope flip touches every `scaffoldProject` caller — `lifecycle.integration.test.ts`, split, and `new/index.ts`), including all pre-existing scaffold cases.

**Step 4: Format**

Run: `pnpm exec oxfmt --write packages/cli/src/commands/project/new/scaffold.ts packages/cli/src/commands/project/new/scaffold.test.ts packages/cli/src/commands/project/log/lifecycle.integration.test.ts packages/cli/src/projects/split`

**Step 5: Commit**

```bash
git add packages/cli/src/commands/project/new/scaffold.ts packages/cli/src/commands/project/new/scaffold.test.ts packages/cli/src/commands/project/log/lifecycle.integration.test.ts packages/cli/src/projects/split
git commit -m "feat(p02-t02): scaffold projects into shared, local, or synced scope"
```

---

### Task p02-t03: `oat project new --scope`

**Files:**

- Modify: `packages/cli/src/commands/project/new/index.ts`
- Modify: `packages/cli/src/commands/project/new/index.test.ts` (create if absent)

**Step 1: Write test (RED)**

Command-level tests via `createProjectNewCommand(overrides)`: `--scope synced|shared|local` forwarded to `scaffoldProject`; invalid value → Commander choices error; omitted → `undefined` (scaffold resolves default); JSON output includes `scope`, `ref`, `sha`, `scaffoldCommit`; human output prints `Scope: synced` and `Ref: refs/oat/projects/<slug>`.

Run: `pnpm --filter @open-agent-toolkit/cli exec vitest run src/commands/project/new/index.test.ts`
Expected: fails.

**Step 2: Implement (GREEN)**

Add `.addOption(new Option('--scope <scope>', 'Project scope').choices(PROJECT_SCOPES))` next to the existing options; pass through; extend output.

**Step 3: Verify**

Run: `pnpm --filter @open-agent-toolkit/cli exec vitest run src/commands/project/new/index.test.ts && pnpm run cli -- project new --help | grep -- --scope`
Expected: green; help lists `--scope`.

**Step 4: Format**

Run: `pnpm exec oxfmt --write packages/cli/src/commands/project/new/index.ts packages/cli/src/commands/project/new/index.test.ts`

**Step 5: Commit**

```bash
git add packages/cli/src/commands/project/new/
git commit -m "feat(p02-t03): add --scope option to oat project new"
```

---

### Task p02-t04: `oat project scope`

**Files:**

- Create: `packages/cli/src/commands/project/scope/index.ts`
- Create: `packages/cli/src/commands/project/scope/index.test.ts`
- Modify: `packages/cli/src/commands/project/index.ts` (register)

**Step 1: Write test (RED)**

- Explicit path under each scope → correct `scope`; no path → `activeProject`; neither → `CliError` "no active project".
- `--format value` prints exactly `synced\n` (nothing else, even with `--verbose`).
- `--json` for synced: `{ status:'ok', projectPath, scope, ref, record, checkout:'present'|'absent' }`; for shared: `ref` absent, `checkout:'n/a'`.
- Path under `archived/` → `CliError` explaining archived projects have no scope.

Run: `pnpm --filter @open-agent-toolkit/cli exec vitest run src/commands/project/scope/index.test.ts`
Expected: fails.

**Step 2: Implement (GREEN)**

`createProjectScopeCommand(overrides)` following the `list.ts` dependency-injection shape; `--format <json|value>`; register in `createProjectCommand()`.

**Step 3: Verify**

Run: `pnpm --filter @open-agent-toolkit/cli exec vitest run src/commands/project/scope/index.test.ts && pnpm run cli -- project scope .oat/projects/shared/synced-project-scope --format value`
Expected: green; prints `shared`.

**Step 4: Format**

Run: `pnpm exec oxfmt --write packages/cli/src/commands/project/scope/index.ts packages/cli/src/commands/project/scope/index.test.ts packages/cli/src/commands/project/index.ts`

**Step 5: Commit**

```bash
git add packages/cli/src/commands/project/scope/ packages/cli/src/commands/project/index.ts
git commit -m "feat(p02-t04): add oat project scope command"
```

---

### Task p02-t05: `oat project push`

**Files:**

- Create: `packages/cli/src/commands/project/push/index.ts`
- Create: `packages/cli/src/commands/project/push/index.test.ts`
- Create: `packages/cli/src/commands/project/sync/resolve-target.ts`
- Create: `packages/cli/src/commands/project/sync/resolve-target.test.ts`
- Modify: `packages/cli/src/commands/project/index.ts`

**Step 1: Write test (RED)**

`resolve-target.test.ts`: argument forms accepted by every sync command — an explicit path; a bare slug (no path separator, matches the project-name regex) → `<syncedRoot>/<slug>`; no argument → `activeProject`; with `{ allowMissingCheckout: true }` a slug/path whose directory is absent resolves from the record file `<syncedRoot>/<slug>.json`; non-synced path → scope `CliError`; unknown slug with no record → "no synced project named …".

Command tests with an injected `pushSynced`: resolves target from path, slug, or active project; refuses non-synced project (`CliError`, message names the scope); `--message` forwarded; results map to exit codes (`pushed`/`up-to-date` → 0; `conflict`/`rejected` → 1 with the documented next-command text, which names the explicit target: `oat project pull <path-or-slug> --continue`); `--json` envelope `{status, sha, ref, conflicts?, prRefresh?}`. `prRefresh` is `undefined` in this task (wired in p03-t03); `--no-refresh-pr` accepted and recorded.

Run: `pnpm --filter @open-agent-toolkit/cli exec vitest run src/commands/project/push/index.test.ts`
Expected: fails.

**Step 2: Implement (GREEN)**

`createProjectPushCommand(overrides)`; shared helper `resolveSyncedTarget(context, pathOrSlug, deps, opts?)` in `commands/project/sync/resolve-target.ts` (used by push/pull/links/prune/migrate) returning `SyncTarget` or throwing the scope error. Command arguments are documented as `[project-path|slug]` everywhere.

**Step 3: Verify**

Run: `pnpm --filter @open-agent-toolkit/cli exec vitest run src/commands/project/push/index.test.ts src/commands/project/sync`
Expected: green.

**Step 4: Format**

Run: `pnpm exec oxfmt --write packages/cli/src/commands/project/push/ packages/cli/src/commands/project/sync/resolve-target.ts packages/cli/src/commands/project/sync/resolve-target.test.ts packages/cli/src/commands/project/index.ts`

**Step 5: Commit**

```bash
git add packages/cli/src/commands/project/push/ packages/cli/src/commands/project/sync/resolve-target.ts packages/cli/src/commands/project/sync/resolve-target.test.ts packages/cli/src/commands/project/index.ts
git commit -m "feat(p02-t05): add oat project push command"
```

---

### Task p02-t06: `oat project pull`

**Files:**

- Create: `packages/cli/src/commands/project/pull/index.ts`
- Create: `packages/cli/src/commands/project/pull/index.test.ts`
- Modify: `packages/cli/src/commands/project/index.ts`

**Step 1: Write test (RED)**

- Checkout absent but record present → target resolved from the record (path may not exist yet) and `pullSynced` invoked → `created`.
- `--continue` → `continueSynced`; `--abort` → `abortSynced`; both together → usage error.
- Exit codes: `created`/`updated`/`up-to-date` → 0; `conflict`/`dirty` → 1 with next-command text listing conflicted files **and naming the same target the user passed** (`oat project pull <path-or-slug> --continue` / `--abort`, shell-quoted); with `activeProject` pointing at a different project, recovery succeeds only with the emitted targeted command (command-level test).
- `--json` envelope.

Run: `pnpm --filter @open-agent-toolkit/cli exec vitest run src/commands/project/pull/index.test.ts`
Expected: fails.

**Step 2: Implement (GREEN)**

`createProjectPullCommand(overrides)`; pull calls `resolveSyncedTarget` with `{ allowMissingCheckout: true }` (defined and tested in p02-t05).

**Step 3: Verify**

Run: `pnpm --filter @open-agent-toolkit/cli exec vitest run src/commands/project/pull/index.test.ts`
Expected: green.

**Step 4: Format**

Run: `pnpm exec oxfmt --write packages/cli/src/commands/project/pull/ packages/cli/src/commands/project/sync/resolve-target.ts packages/cli/src/commands/project/index.ts`

**Step 5: Commit**

```bash
git add packages/cli/src/commands/project/pull/ packages/cli/src/commands/project/sync/resolve-target.ts packages/cli/src/commands/project/index.ts
git commit -m "feat(p02-t06): add oat project pull command"
```

---

### Task p02-t07: `oat project list` across scopes

**Files:**

- Modify: `packages/cli/src/commands/project/list.ts`
- Modify: `packages/cli/src/commands/project/list.integration.test.ts` and `packages/cli/src/commands/project/list.test.ts` (if present; include it in format + commit when touched)
- Modify: `packages/control-plane/README.md` (document the additive `ProjectSummary.scope` field — the package's AGENTS.md requires public API changes to be reflected there)
- Modify: `packages/control-plane/src/types.ts` — additive `ProjectSummary.scope?: 'shared' | 'local' | 'synced'` **plus** a discriminated list-row contract so rows without a materialized checkout never invent lifecycle values:

  ```typescript
  export type ProjectListRow =
    | ({ kind: 'materialized' } & ProjectSummary & {
          scope: ProjectScope;
          checkout: 'present';
        })
    | {
        kind: 'recorded-absent';
        name;
        path;
        scope: 'synced';
        checkout: 'absent';
        phase: null;
        phaseStatus: null;
        workflowMode: null;
        lifecycle: null;
        progress: null;
        recommendation: {
          skill: 'oat project pull';
          reason: 'checkout absent';
        };
      }
    | {
        kind: 'remote';
        name;
        scope: 'synced';
        origin: 'remote';
        checkout: 'absent';
        ref;
        phase: null;
        phaseStatus: null;
        workflowMode: null;
        lifecycle: null;
        progress: null;
        recommendation: {
          skill: 'oat project pull';
          reason: 'not adopted on this branch';
        };
      };
  ```

  `oat project list --json` returns `ProjectListRow[]`; the human table renders `—` for null lifecycle cells and a `Hint` column. Existing consumers of `ProjectSummary` are unaffected (materialized rows are a superset). Document in `packages/control-plane/README.md`.

**Step 1: Write test (RED)**

- Fixture with one project in each of `shared/`, `synced/` (record + checkout), `local/` → all three listed with `scope` (listing `local` is an explicit additive change — see spec Non-Goals/NFR1); a `synced` record whose checkout is absent is still listed (`checkout: absent` in JSON).
- `--scope shared|synced|local` filters; invalid value → choices error.
- Table output has a `Scope` column; existing column order otherwise unchanged (snapshot the header).
- Existing list tests pass unchanged.

Run: `pnpm --filter @open-agent-toolkit/cli exec vitest run src/commands/project/list.integration.test.ts`
Expected: new cases fail.

**Step 2: Implement (GREEN)**

`listProjects` is called once per scope root (`shared` = `projects.root`, plus the `synced` and `local` siblings when they exist); for `synced`, merge `listSyncedRecords` so absent checkouts appear; tag each summary with `scope`.

**Step 3: Verify**

Run: `pnpm --filter @open-agent-toolkit/cli exec vitest run src/commands/project/list.integration.test.ts && pnpm --filter @open-agent-toolkit/control-plane test && pnpm run cli -- project list`
Expected: green; this repo's list shows `shared` scope rows.

**Step 4: Format**

Run: `pnpm exec oxfmt --write packages/cli/src/commands/project/list.ts packages/cli/src/commands/project/list.integration.test.ts packages/cli/src/commands/project/list.test.ts packages/control-plane/src/types.ts packages/control-plane/README.md`

**Step 5: Commit**

```bash
git add packages/cli/src/commands/project/list.ts packages/cli/src/commands/project/list.integration.test.ts packages/cli/src/commands/project/list.test.ts packages/control-plane/src/types.ts packages/control-plane/README.md
git commit -m "feat(p02-t07): list projects across shared, synced, and local scopes"
```

---

### Task p02-t08: End-to-end synced lifecycle

**Files:**

- Modify: `packages/cli/src/e2e/workflow.test.ts`

**Step 1: Write test (RED)**

New `describe('synced project lifecycle')` using `createSyncedFixture({ secondClone: true })` and the real program (`createProgram` + `registerCommands`):

1. `project new demo` (no `--scope`) in cloneA → scope `synced`; parent diff since fixture base contains only `.oat/projects/synced/demo.json`.
2. Edit `state.md`; `project push demo` → `pushed`.
3. `project pull demo` in cloneB → `created`; file content matches.
4. `project new legacy --scope shared` → behaves as before (files tracked on branch).
5. `AWS_*` env vars unset and no `gh` on PATH for the whole suite (NFR3).

Run: `pnpm --filter @open-agent-toolkit/cli exec vitest run src/e2e/workflow.test.ts`
Expected: new describe fails.

**Step 2: Implement (GREEN)**

Only test code; fix any integration seams surfaced (e.g. `activeProject` normalization for the synced path).

**Step 3: Verify**

Run: `pnpm --filter @open-agent-toolkit/cli exec vitest run src/e2e/workflow.test.ts`
Expected: green.

**Step 4: Format**

Run: `pnpm exec oxfmt --write packages/cli/src/e2e/workflow.test.ts`

**Step 5: Commit**

```bash
git add packages/cli/src/e2e/workflow.test.ts
git commit -m "test(p02-t08): add synced project lifecycle e2e"
```

---

### Task p02-t09: `oat project list --remote`

**Files:**

- Modify: `packages/cli/src/commands/project/list.ts`
- Modify: `packages/cli/src/commands/project/list.integration.test.ts`

**Step 1: Write test (RED)**

Fixture with `secondClone: true`: create + push a synced project from cloneA; in cloneB (no record on its branch) `list --remote` shows the slug with `scope: synced`, `origin: remote`, `checkout: absent`, hint `oat project pull <slug>`; a project that has a local record is not duplicated; `--remote` with an unreachable origin (runner returns nonzero) → warning + local rows only, exit 0; without `--remote` the remote row is absent.

Run: `pnpm --filter @open-agent-toolkit/cli exec vitest run src/commands/project/list.integration.test.ts`
Expected: new cases fail.

**Step 2: Implement (GREEN)**

`--remote` flag → `git ls-remote origin 'refs/oat/projects/*'` via the injected runner; diff against `listSyncedRecords`; append `kind: 'remote'` rows per the `ProjectListRow` contract from p02-t07 (no invented lifecycle values; `—` placeholders in the table); offline → warning, local rows only, exit 0; JSON tests assert the exact row shape for all three kinds.

**Step 3: Verify**

Run: `pnpm --filter @open-agent-toolkit/cli exec vitest run src/commands/project/list.integration.test.ts`
Expected: green.

**Step 4: Format**

Run: `pnpm exec oxfmt --write packages/cli/src/commands/project/list.ts packages/cli/src/commands/project/list.integration.test.ts`

**Step 5: Commit**

```bash
git add packages/cli/src/commands/project/list.ts packages/cli/src/commands/project/list.integration.test.ts
git commit -m "feat(p02-t09): list remote synced projects with --remote"
```

---

### Task p02-t10: Adopting pull and coordination children

**Files:**

- Modify: `packages/cli/src/commands/project/sync/ref-sync.ts` (`pullSynced` adoption path, `pullChildren`)
- Modify: `packages/cli/src/commands/project/sync/resolve-target.ts` (slug with neither record nor checkout → `{ target, adopt: true }` when the remote ref exists)
- Modify: `packages/cli/src/commands/project/pull/index.ts` (`--no-children`, `--no-commit`, JSON `adopted`, `children`)
- Modify: `packages/cli/src/commands/project/sync/ref-sync.test.ts`, `packages/cli/src/commands/project/sync/resolve-target.test.ts`, `packages/cli/src/commands/project/pull/index.test.ts`

**Step 1: Write test (RED)**

- cloneB, no record, ref on origin: `pull <slug>` → `created`, `adopted: true`; checkout present; record written and committed (`ls-tree HEAD` shows it; commit `chore(oat): adopt synced project <slug>`); `--no-commit` leaves the record uncommitted; a second `pull` → `up-to-date`, `adopted: false`.
- Slug with no record, no checkout, no remote ref → `CliError` "no synced project named <slug> locally or on origin".
- Adoption never rewrites history: origin ref SHA identical before/after.
- Coordination fixture: parent `state.md` with `oat_kind: coordination` and `oat_children: [a, b]`, all three pushed from cloneA; in cloneB `pull parent` → parent + `a` + `b` materialized (children adopted, records committed in one commit); `--no-children` → parent only; a child whose ref is missing → reported in `children[]` with `status: 'missing'`, exit 1, parent and sibling still present.

Run: `pnpm --filter @open-agent-toolkit/cli exec vitest run src/commands/project/sync src/commands/project/pull`
Expected: new cases fail.

**Step 2: Implement (GREEN)**

`resolveSyncedTarget` gains the remote-ref fallback (one `ls-remote --exit-code origin <ref>`). **Commit ownership is single-level:** the low-level `pullSynced` never commits — when `adopt` is set it writes the record file and returns `{ …, adopted: true, pendingRecordPaths: [recordPath] }`; the `oat project pull` command orchestrates: pull the target, then (unless `--no-children`) `pullChildren(parentTarget)`, collect every successful adoption's pending record path, and call `commitRecordChange` **once** with all of them (`chore(oat): adopt synced project(s) <slugs>`), or not at all under `--no-commit`. Partial child failure: successful adoptions are still committed together, failed children are listed in `children[]` with `status`, exit code 1, and nothing is rolled back. `pullChildren` reads `oat_children` by parsing the YAML frontmatter block as an object (`YAML.parse(getFrontmatterBlock(state))`, the inverse of `write-parent.ts`'s `YAML.stringify`) — **not** `parseFrontmatterField`, which is scalar-only and would return a raw string for the block sequence; every child must satisfy the slug regex or the pull fails before any network call; the test feeds the exact block-sequence output `writeCoordinationParent` produces.

**Step 3: Verify**

Run: `pnpm --filter @open-agent-toolkit/cli exec vitest run src/commands/project/sync src/commands/project/pull`
Expected: green.

**Step 4: Format**

Run: `pnpm exec oxfmt --write packages/cli/src/commands/project/sync/ packages/cli/src/commands/project/pull/`

**Step 5: Commit**

```bash
git add packages/cli/src/commands/project/sync/ packages/cli/src/commands/project/pull/
git commit -m "feat(p02-t10): adopt remote synced projects on pull and pull coordination children"
```

---

### Task p02-t11: Scope-aware `oat project open` and `oat project pause`

**Files:**

- Modify: `packages/cli/src/commands/project/open/index.ts` (`:129-143` resolves names only under `projects.root`)
- Modify: `packages/cli/src/commands/project/pause/index.ts` (`:81-166` writes `state.md` then clears the active pointer without publishing)
- Modify: `packages/cli/src/commands/project/open/index.test.ts`, `packages/cli/src/commands/project/pause/index.test.ts`

**Step 1: Write test (RED)**

- `open <slug>` resolves across `shared`, `synced`, and `local` roots (exact match; ambiguity across scopes → error listing candidates); a synced slug with a record but no checkout → pulls (adopting if needed) before opening; sets `activeProject` to the scope-correct path.
- `open` on a **paused** synced project: `maybeResumePausedProject` rewrites `state.md` (`open/index.ts:80-119`) → `pushSynced` (`chore(oat): resume <slug>`) runs **before** `activeProject` is updated and success is reported; push failure → exit 1, `activeProject` unchanged, `state.md` left resumed locally with the error naming `oat project push`; an already-active synced project → no commit, no push (nested `rev-list --count` unchanged).
- `pause` on a synced project: writes `state.md`, then `pushSynced` (message `chore(oat): pause <slug>`) **before** clearing the active pointer; push failure leaves the pointer set and exits 1 with the push error; `shared`/`local` behavior unchanged (existing tests pass).

Run: `pnpm --filter @open-agent-toolkit/cli exec vitest run src/commands/project/open src/commands/project/pause`
Expected: new cases fail.

**Step 2: Implement (GREEN)**

Both commands use `project-scope.ts` roots and `resolveSyncedTarget`; both inject `pushSynced` — `pause` after writing the paused state, `open` when `maybeResumePausedProject` returns true — and in both the push precedes any active-pointer change.

**Step 3: Verify**

Run: `pnpm --filter @open-agent-toolkit/cli exec vitest run src/commands/project/open src/commands/project/pause`
Expected: green.

**Step 4: Format**

Run: `pnpm exec oxfmt --write packages/cli/src/commands/project/open/ packages/cli/src/commands/project/pause/`

**Step 5: Commit**

```bash
git add packages/cli/src/commands/project/open/ packages/cli/src/commands/project/pause/
git commit -m "feat(p02-t11): make oat project open and pause synced-aware"
```

---

### Task p02-t12: (review) Enforce canonical identity at every mutating sync entry point

**Files:**

- Modify: `packages/cli/src/commands/project/sync/ref-sync.ts` (shared canonical direct-child preflight and every mutating `SyncTarget` entry point)
- Modify: `packages/cli/src/commands/project/sync/ref-sync.test.ts` (real-worktree coordination-child alias regression and low-level mutation coverage)
- Modify: `packages/cli/src/commands/project/sync/resolve-target.ts`, `packages/cli/src/commands/project/sync/resolve-target.test.ts` (reuse the shared invariant without weakening command-selected checks)
- Modify: `packages/cli/src/commands/project/split/__tests__/integration/split-flow.test.ts` (internally constructed split-target alias coverage when the audit shows a reachable mutation path)

**Step 1: Write tests (RED)**

- Create a real coordination parent whose declared child path is a direct-child symlink to a sibling synced checkout. `pullChildren(parent)` must reject the alias before record access, fetch, rebase, checkout staging, or record write; assert zero Git calls through the injected runner and an unchanged sibling HEAD/worktree.
- Exercise the shared preflight through every public mutating `SyncTarget` entry point (`create`, `push`, `pull`, `continue`, `abort`, and checkout removal where applicable) so callers that construct targets directly cannot bypass slug/path/ref identity.
- Enumerate internally constructed split publication targets. If an alias can reach mutation, add a real-worktree split regression proving rejection before publication; otherwise pin the audited construction invariant in the closest focused test.
- Preserve the existing explicit-path and bare-slug command regressions for `push`, `pull`, and `open`.

Run: `pnpm --filter @open-agent-toolkit/cli exec vitest run src/commands/project/sync/ref-sync.test.ts src/commands/project/sync/resolve-target.test.ts src/commands/project/push/index.test.ts src/commands/project/pull/index.test.ts src/commands/project/open/index.test.ts src/commands/project/split/__tests__/integration/split-flow.test.ts`
Expected: the new low-level coordination-child and direct-construction cases fail before implementation.

**Step 2: Implement (GREEN)**

Move the canonical direct-child invariant into one shared low-level preflight that canonicalizes the synced root and existing checkout, derives the canonical child from the target slug, and rejects any mismatch with `CliError` before record access or Git mutation. Invoke it from every mutating `SyncTarget` entry point, including `pullChildren()` paths and any split publication path that constructs targets directly. `resolveSyncedTarget` must reuse the same invariant rather than carry a command-only copy. Absent checkouts remain valid for create/adopt flows; existing canonical worktrees and non-mutating discovery behavior remain unchanged.

**Step 3: Format and lint**

Run: `pnpm exec oxfmt --write packages/cli/src/commands/project/sync/ref-sync.ts packages/cli/src/commands/project/sync/ref-sync.test.ts packages/cli/src/commands/project/sync/resolve-target.ts packages/cli/src/commands/project/sync/resolve-target.test.ts packages/cli/src/commands/project/split/__tests__/integration/split-flow.test.ts`

Run: `pnpm exec oxlint packages/cli/src/commands/project/sync/ref-sync.ts packages/cli/src/commands/project/sync/ref-sync.test.ts packages/cli/src/commands/project/sync/resolve-target.ts packages/cli/src/commands/project/sync/resolve-target.test.ts packages/cli/src/commands/project/split/__tests__/integration/split-flow.test.ts`

**Step 4: Verify**

Run: `pnpm --filter @open-agent-toolkit/cli exec vitest run src/commands/project/sync/ref-sync.test.ts src/commands/project/sync/resolve-target.test.ts src/commands/project/push/index.test.ts src/commands/project/pull/index.test.ts src/commands/project/open/index.test.ts src/commands/project/split/__tests__/integration/split-flow.test.ts`
Expected: all focused identity and real-worktree regressions pass.

Run: `pnpm --filter @open-agent-toolkit/cli test`
Expected: the full CLI suite passes.

Run: `pnpm --filter @open-agent-toolkit/cli type-check`
Expected: TypeScript passes.

**Step 5: Commit**

```bash
git add packages/cli/src/commands/project/sync/ref-sync.ts packages/cli/src/commands/project/sync/ref-sync.test.ts packages/cli/src/commands/project/sync/resolve-target.ts packages/cli/src/commands/project/sync/resolve-target.test.ts packages/cli/src/commands/project/split/__tests__/integration/split-flow.test.ts
git commit -m "fix(p02-t12): enforce canonical sync target identity"
```

---

### Task p02-t13: (review) Isolate coordination-child failures and stabilize fresh split coverage

**Files:**

- Modify: `packages/cli/src/commands/project/sync/ref-sync.ts` (guard each coordination child across identity, record, remote, and pull work)
- Modify: `packages/cli/src/commands/project/sync/ref-sync.test.ts` (real-worktree aliased-first-child and healthy-later-child regression)
- Modify: `packages/cli/src/commands/project/pull/index.test.ts` (command-level partial-success record commit coverage, if the focused low-level regression cannot prove it)
- Modify: `packages/cli/src/commands/project/split/__tests__/integration/split-flow.test.ts` (bounded timeout for the fresh synced publication case)

**Step 1: Write test (RED)**

- Create a real coordination parent with declared children `[alias, later]`, where `alias` is a direct-child symlink to a sibling synced checkout and `later` is a healthy missing or stale child.
- Assert `pullChildren(parent)` returns an error row for `alias`, still pulls or adopts `later`, leaves the sibling alias target HEAD/worktree unchanged, and preserves successful pending adoption-record paths for the command layer to commit.
- Add command-level coverage only if needed to prove a mixed child result still commits the successful parent/child record updates.

Run: `pnpm --filter @open-agent-toolkit/cli exec vitest run src/commands/project/sync/ref-sync.test.ts src/commands/project/pull/index.test.ts`
Expected: the aliased first child aborts the call or prevents the healthy later child before implementation.

**Step 2: Implement (GREEN)**

Move identity preflight, record lookup, remote probing, and child pull into one per-child guarded helper or `try` block. Convert every child-specific failure into an `error` result and continue the loop without weakening the canonical mutation preflight or rolling back successful parent/sibling work. Give the fresh synced split publication integration test the same explicit 15-second bound as the neighboring real-Git conflict test.

**Step 3: Format and lint**

Run: `pnpm exec oxfmt --write packages/cli/src/commands/project/sync/ref-sync.ts packages/cli/src/commands/project/sync/ref-sync.test.ts packages/cli/src/commands/project/pull/index.test.ts packages/cli/src/commands/project/split/__tests__/integration/split-flow.test.ts`

Run: `pnpm exec oxlint packages/cli/src/commands/project/sync/ref-sync.ts packages/cli/src/commands/project/sync/ref-sync.test.ts packages/cli/src/commands/project/pull/index.test.ts packages/cli/src/commands/project/split/__tests__/integration/split-flow.test.ts`

**Step 4: Verify**

Run: `pnpm --filter @open-agent-toolkit/cli exec vitest run src/commands/project/sync/ref-sync.test.ts src/commands/project/pull/index.test.ts src/commands/project/split/__tests__/integration/split-flow.test.ts`
Expected: all focused isolation, partial-success, mutation-safety, and split regressions pass.

Run twice against committed HEAD: `pnpm --filter @open-agent-toolkit/cli test`
Expected: both full CLI suite runs pass without the fresh split timeout.

Run: `pnpm --filter @open-agent-toolkit/cli type-check`
Expected: TypeScript passes.

**Step 5: Commit**

```bash
git add packages/cli/src/commands/project/sync/ref-sync.ts packages/cli/src/commands/project/sync/ref-sync.test.ts packages/cli/src/commands/project/pull/index.test.ts packages/cli/src/commands/project/split/__tests__/integration/split-flow.test.ts
git commit -m "fix(p02-t13): preserve child pull isolation"
```

---

## Phase 3: Reviewer and lifecycle surface

Goal: PR links, completion parity, prune/migrate, doctor, gitattributes, local-sync guard, and a real dogfood run.

### Task p03-t01: Links block rendering

**Files:**

- Create: `packages/cli/src/commands/project/links/render.ts`
- Create: `packages/cli/src/commands/project/links/render.test.ts`

**Step 1: Write test (RED)**

- `parseGitHubOrigin` handles `git@github.com:o/r.git`, `https://github.com/o/r.git`, `https://github.com/o/r`, `ssh://git@github.com/o/r.git`; returns `null` for gitlab/bitbucket/local paths.
- `renderLinksBlock` with all three artifacts present → snapshot matching the design's block; subsets omit missing links; non-GitHub origin → plain `refs/oat/projects/<slug> @ <short-sha>` text with no URLs; `durableSummaryPath` appends the durable line after the links.
- `replaceLinksBlock`: replaces between markers; idempotent (apply twice == once); no markers → appended with a blank line; start without end (or end without start) → returns body unchanged and `{ replaced:false, malformed:true }`.
- `LINKABLE_ARTIFACTS` is exactly `['discovery.md','design.md','summary.md']`.

Run: `pnpm --filter @open-agent-toolkit/cli exec vitest run src/commands/project/links/render.test.ts`
Expected: fails.

**Step 2: Implement (GREEN)**

```typescript
export const LINKABLE_ARTIFACTS, LINKS_START, LINKS_END;
export interface LinksInput {
  slug;
  sha;
  ref;
  originUrl;
  present: LinkableArtifact[];
  durableSummaryPath?;
  pinnedAt;
}
export function parseGitHubOrigin(url): { owner; repo } | null;
export function renderLinksBlock(input): string;
export function replaceLinksBlock(
  body,
  block,
): { body; replaced: boolean; malformed: boolean };
```

**Step 3: Verify**

Run: `pnpm --filter @open-agent-toolkit/cli exec vitest run src/commands/project/links/render.test.ts`
Expected: green.

**Step 4: Format**

Run: `pnpm exec oxfmt --write packages/cli/src/commands/project/links/render.ts packages/cli/src/commands/project/links/render.test.ts`

**Step 5: Commit**

```bash
git add packages/cli/src/commands/project/links/
git commit -m "feat(p03-t01): render and replace the PR links block"
```

---

### Task p03-t02: Links from the ref + `oat project links`

**Files:**

- Create: `packages/cli/src/commands/project/links/compute.ts`
- Create: `packages/cli/src/commands/project/links/index.ts`
- Create: `packages/cli/src/commands/project/links/index.test.ts`
- Modify: `packages/cli/src/commands/project/index.ts`

**Step 1: Write test (RED)**

- `computeLinksInput(t, git)` fetches, uses `rev-parse <ref>` and `ls-tree --name-only <ref>` filtered by the allowlist; works when the checkout directory is absent (fixture: push then `removeSyncedCheckout`).
- `oat project links demo` prints the markdown block; `--format json` returns `{ ...LinksInput, markdown }`; `--durable-summary docs/x.md` appears in output; non-synced project → scope error.

Run: `pnpm --filter @open-agent-toolkit/cli exec vitest run src/commands/project/links/index.test.ts`
Expected: fails.

**Step 2: Implement (GREEN)**

`computeLinksInput(t, git, opts: { durableSummaryPath?, now })`, `createProjectLinksCommand(overrides)`, register.

**Step 3: Verify**

Run: `pnpm --filter @open-agent-toolkit/cli exec vitest run src/commands/project/links`
Expected: green.

**Step 4: Format**

Run: `pnpm exec oxfmt --write packages/cli/src/commands/project/links/ packages/cli/src/commands/project/index.ts`

**Step 5: Commit**

```bash
git add packages/cli/src/commands/project/links/ packages/cli/src/commands/project/index.ts
git commit -m "feat(p03-t02): compute PR links from the project ref and add oat project links"
```

---

### Task p03-t03: PR refresh on push

**Files:**

- Create: `packages/cli/src/commands/project/links/refresh.ts`
- Create: `packages/cli/src/commands/project/links/refresh.test.ts`
- Modify: `packages/cli/src/commands/project/push/index.ts`, `index.test.ts`

**Step 1: Write test (RED)**

- `refreshPrLinks(t, prUrl, { gh })` with a fake `GhRunner`: `gh pr view <url> --json body` → replace block → `gh pr edit <url> --body-file <tmp>` → `refreshed`; `gh` missing (`ENOENT`) → `skipped` + warning; `gh` nonzero → `failed` + warning; malformed markers → `skipped`.
- Push command: when `state.md` in the checkout has `oat_pr_status: open` and `oat_pr_url`, refresh runs after a successful push and `prRefresh` is in the envelope; `--no-refresh-pr` skips; status not `open` → not called; refresh failure never changes push exit code.

Run: `pnpm --filter @open-agent-toolkit/cli exec vitest run src/commands/project/links/refresh.test.ts src/commands/project/push/index.test.ts`
Expected: fails.

**Step 2: Implement (GREEN)**

`GhRunner` mirrors `GitRunner` (execFile `gh`). Read `oat_pr_status`/`oat_pr_url` with `parseFrontmatterScalarFields` from `@commands/shared/frontmatter`.

**Step 3: Verify**

Run: `pnpm --filter @open-agent-toolkit/cli exec vitest run src/commands/project/links src/commands/project/push`
Expected: green.

**Step 4: Format**

Run: `pnpm exec oxfmt --write packages/cli/src/commands/project/links/ packages/cli/src/commands/project/push/`

**Step 5: Commit**

```bash
git add packages/cli/src/commands/project/links/ packages/cli/src/commands/project/push/
git commit -m "feat(p03-t03): refresh PR links block on push while a PR is open"
```

---

### Task p03-t04: Completion state machine in archive

**Files:**

- Modify: `packages/cli/src/commands/project/archive/archive-utils.ts`
- Modify: `packages/cli/src/commands/project/archive/archive-utils.test.ts`
- Modify: `packages/cli/src/commands/project/archive/index.ts` (+ `index.test.ts`) for the `--no-commit` flag and JSON fields
- Modify: `packages/cli/src/commands/project/archive/push-runner.ts` (+ `push-runner.test.ts`) — owns `ArchivePushOptions`, report construction, and option plumbing: the `--no-commit` option, the `lifecycleCommit` / `recapExportPaths` / `snapshotId` report fields, and the synced commit behavior live here; `index.ts` only wires the flag
- Modify: `packages/cli/src/commands/project/sync/record.ts` (`archiveSnapshot?: string` — the stable snapshot name recorded on the first archive attempt so retries reuse it)
- Modify: `packages/cli/src/fs/io.ts` (`copyDirectory` gains an optional `filter`)
- Modify: `packages/cli/src/e2e/workflow.test.ts` (archive step)

**Step 1: Write test (RED)**

Using the fixture with a pushed synced project:

- Dirty checkout → archive refuses (`CliError`, names `oat project push`); unpushed commit → refuses; nothing archived, nothing removed.
- Clean + pushed → archive dir exists with no `.git` entry and **no `reviews/` directory** (FR18; `pr/`, `summary.md`, lifecycle files present); `worktree list` has no stale entry; record has `status:'complete'` + `completedAt`; parent `ls-tree HEAD` shows the updated record (and the summary export file when `archive.summaryExportPath` is configured) in one commit `chore(oat): complete synced project <slug>`; `origin` still has the ref; `computeLinksInput` still works.
- Re-run after success → idempotent (no second commit, no error).
- **Re-run after the checkout was removed** (record `complete`, snapshot present, `.git` pointer gone) → enters the synced path via the record, returns success with no copy, no export, no commit.
- **Retry identity:** the first attempt writes `record.archiveSnapshot = <snapshot name>` **before** any copy (runner/fs spy asserts the order); failure injected between identity persistence and the copy, after the copy, after summary export/S3, after the record commit, and before checkout removal each leave a state from which a re-run **reuses the same snapshot path and export file** (no `-<suffix>` target, no duplicate export, no second lifecycle commit) and completes; the checkout is removed only after every durable write succeeded.
- **Recap transaction (FR8/NFR1 parity with today's Steps 10–10.6):** with a selected project recap (`--project-recap-run`), the archive report exposes the exact tracked recap-export paths; the lifecycle commit made by `commitRecordChange` contains the record, the summary export, and the **immutable** recap export paths (allowlist extended to `projectRecapExport.exportRoot`, excluding `manifest.json`/`build-record.json`); the report returns that `lifecycleCommit` SHA for re-attestation; a second `commitRecordChange` (invoked by the skill after Step 10.5) commits only `manifest.json` + `build-record.json`; tests cover recap and no-recap completion, exact path containment of both commits, commit order, and recovery when the second commit fails (re-run commits only the evidence).
- `shared` project → identical to existing tests **except** that `reviews/` is no longer copied into `archived/<name>/` (FR18; update the one existing assertion that expected it, if any).
- e2e: extend the `synced project lifecycle` describe in `packages/cli/src/e2e/workflow.test.ts` (p02-t08) with `project push` → `project archive` through the real program; assert the parent commit, absent checkout, and retained origin ref.

Run: `pnpm --filter @open-agent-toolkit/cli exec vitest run src/commands/project/archive src/e2e/workflow.test.ts`
Expected: new cases fail.

**Step 2: Implement (GREEN)**

In `archiveProjectOnCompletion`: synced mode is resolved from the **scope root and record** (`resolveProjectScope(source) === 'synced'` and a record exists), not from a present `.git` pointer — so a re-run after the checkout was removed still enters the synced path. Then: if `record.status === 'complete'` and `record.archiveSnapshot` names an existing snapshot and the checkout is absent → **no-op success** (idempotent rerun). Otherwise: precondition via the **non-mutating** `preflightSyncedCheckout(t, git)` from p01-t09 (returns `clean` | `dirty` | `unpushed` | `absent`; refuse unless `clean`) → **persist `record.archiveSnapshot` first** (the retry identity; `resolveArchiveProjectTarget` honors it instead of suffixing) → copy with a filter excluding top-level `.git` (extend `copyDirectory` with an optional `filter`) → existing export/S3 → record update → `commitRecordChange([record, summaryExport, ...immutableRecapExportPaths])` (unless `commit:false`; returns `lifecycleCommit`) → `removeSyncedCheckout` (called exactly once, last, only after every durable write; test asserts the source directory still exists immediately after the copy and the record commit). The copy filter also skips `reviews/` for **every** scope (FR18) — the local snapshot no longer carries review artifacts, matching what S3 already excludes. Dependencies injected for tests.

**Step 3: Verify**

Run: `pnpm --filter @open-agent-toolkit/cli exec vitest run src/commands/project/archive src/fs src/e2e/workflow.test.ts`
Expected: green.

**Step 4: Format**

Run: `pnpm exec oxfmt --write packages/cli/src/commands/project/archive/ packages/cli/src/fs/io.ts packages/cli/src/e2e/workflow.test.ts`

**Step 5: Commit**

```bash
git add packages/cli/src/commands/project/archive/ packages/cli/src/fs/io.ts packages/cli/src/e2e/workflow.test.ts
git commit -m "feat(p03-t04): archive synced projects with worktree-aware completion"
```

---

### Task p03-t05: `oat project prune`

**Files:**

- Create: `packages/cli/src/commands/project/prune/index.ts`
- Create: `packages/cli/src/commands/project/prune/index.test.ts`
- Modify: `packages/cli/src/commands/project/sync/ref-sync.ts` (`pruneSynced`)
- Modify: `packages/cli/src/commands/project/index.ts`

**Step 1: Write test (RED)**

- `state.md` `oat_pr_status: open` → refuses without `--force`; dirty/unpushed → refuses; message warns pinned links will stop resolving.
- `--force` → remote ref gone (`ls-remote`), local ref gone, `worktree list` clean, record file deleted, parent commit `chore(oat): prune synced project <slug>` contains only the record deletion; `--no-commit` leaves the deletion staged-free (record removed from disk, not committed).
- Completed project (checkout already absent, record `complete`) → prunes ref + record without touching worktrees.
- **Active record, absent checkout, `oat_pr_status: open` on the ref** → refuses without `--force` (state read via `git show <ref>:state.md`).
- **Two parent worktrees** (cloneA + `addLinkedWorktree`) each holding a checkout of the slug: prune from cloneA preflights **both** checkouts (`git worktree list --porcelain` filtered to paths ending in `/.oat/projects/synced/<slug>`); if the linked one is dirty/unpushed → refuse without `--force`, naming that path; with clean checkouts (or `--force`) → both directories removed and unregistered, then ref + record deleted; `worktree list` shows neither.

Run: `pnpm --filter @open-agent-toolkit/cli exec vitest run src/commands/project/prune/index.test.ts`
Expected: fails.

**Step 2: Implement (GREEN)**

`pruneSynced(t, git, { force, commit })` is **project-wide**: enumerate every registered checkout for the slug across all worktrees of the repository (`worktree list --porcelain`, path suffix match) → preflight each for dirty/unpushed → refuse without `--force` if any cannot be removed safely → `removeSyncedCheckout` for each → `push <remote> :<ref>` → `update-ref -d` → `rm record` → `commitRecordChange`. Command reads `state.md` from the checkout when present; otherwise it fetches the ref and reads `git show <ref>:state.md` (an active project with a record and remote ref but no checkout — fresh worktree or clone — must still be guarded); only when the ref is gone does it fall back to `.oat/projects/archived/<slug>/state.md`.

**Step 3: Verify**

Run: `pnpm --filter @open-agent-toolkit/cli exec vitest run src/commands/project/prune src/commands/project/sync`
Expected: green.

**Step 4: Format**

Run: `pnpm exec oxfmt --write packages/cli/src/commands/project/prune/ packages/cli/src/commands/project/sync/ref-sync.ts packages/cli/src/commands/project/index.ts`

**Step 5: Commit**

```bash
git add packages/cli/src/commands/project/prune/ packages/cli/src/commands/project/sync/ref-sync.ts packages/cli/src/commands/project/index.ts
git commit -m "feat(p03-t05): add oat project prune"
```

---

### Task p03-t06: `oat project migrate --to synced`

**Files:**

- Create: `packages/cli/src/commands/project/migrate/index.ts`
- Create: `packages/cli/src/commands/project/migrate/index.test.ts`
- Modify: `packages/cli/src/commands/project/sync/ref-sync.ts` (`migrateSharedToSynced`)
- Modify: `packages/cli/src/commands/project/index.ts`

**Step 1: Write test (RED)**

Fixture with a tracked, committed `shared/legacy` project (scaffold `--scope shared`, commit):

- Success → six end-state assertions from the design: source absent from index and disk; `synced/legacy` registered (`worktree list`) and clean; parent `status --porcelain` empty with exactly one new commit `chore(oat): migrate legacy to synced scope`; record in `ls-tree HEAD`; ref on `origin` with one content commit above init; `activeProject` retargeted when it pointed at the source.
- Dirty source → refuses; untracked source → refuses; existing ref/record/destination → refuses; no `origin` → refuses.
- Failure injected at step 4 (push fails) → branch untouched (`status` empty, no new commit), destination worktree removed, local ref deleted.
- **Failure injected at step 5 (`commitRecordChange` throws before committing)** → full rollback: source restored (`git reset -q -- <src> <record>` + `git checkout -- <src>`, index clean), record file deleted, `.gitignore` restored if it was self-healed in this run, destination worktree removed, local ref deleted, **remote ref deleted** (`push :<ref>`); `status --porcelain` empty; a retry of the same migrate command then succeeds from clean preconditions.
- **Failure injected after the branch commit succeeded** (throw inside step 6, `activeProject` retarget) → rollback also moves the branch back: `git reset --soft <pre-migration HEAD>` (captured at step 1), then the same path-scoped restore as above so unrelated staged/working-tree changes present before migration are untouched (fixture pre-stages `src/unrelated.ts` and asserts it is still staged afterwards); `rev-parse HEAD` equals the captured SHA; retry succeeds.
- `--to shared` → "not supported in v1" error.

Run: `pnpm --filter @open-agent-toolkit/cli exec vitest run src/commands/project/migrate/index.test.ts`
Expected: fails.

**Step 2: Implement (GREEN)**

`migrateSharedToSynced(t, git, opts)` implementing the six-step algorithm from `design.md` with a single recovery contract: capture the pre-migration branch HEAD first; **any** failure after the ref/worktree were created rolls back everything migrate created (destination worktree, local ref, remote ref, record file, self-healed `.gitignore`, the source restore for step-5 failures, and `reset --soft <HEAD>` + path-scoped restore for failures after the branch commit), so a retry always starts from the documented preconditions and unrelated index/working-tree state is never disturbed. Command wrapper with `--to <synced>` (choices) and `--no-commit`.

**Step 3: Verify**

Run: `pnpm --filter @open-agent-toolkit/cli exec vitest run src/commands/project/migrate src/commands/project/sync`
Expected: green.

**Step 4: Format**

Run: `pnpm exec oxfmt --write packages/cli/src/commands/project/migrate/ packages/cli/src/commands/project/sync/ref-sync.ts packages/cli/src/commands/project/index.ts`

**Step 5: Commit**

```bash
git add packages/cli/src/commands/project/migrate/ packages/cli/src/commands/project/sync/ref-sync.ts packages/cli/src/commands/project/index.ts
git commit -m "feat(p03-t06): add oat project migrate for shared to synced"
```

---

### Task p03-t07: Doctor checks for synced projects

**Files:**

- Create: `packages/cli/src/commands/doctor/synced-projects.ts`
- Create: `packages/cli/src/commands/doctor/synced-projects.test.ts`
- Modify: `packages/cli/src/commands/doctor/index.ts` (`DoctorDependencies.checkSyncedProjects`, default, push in `runChecksForScope`)

**Step 1: Write test (RED)**

With an injected `GitRunner` and temp fixture, one case per design-table row: checkout absent → `warn` + `oat project pull <slug>`; local ≠ remote (fake `ls-remote`) → `warn`; uncommitted changes → `warn`; tracked files under `synced/*/` (fixture commits one) → `fail`; unknown `schemaVersion` → `fail`; gitignore rule missing → `warn` + `oat tools update`; editor hint → `pass` with note; no synced projects → single `pass`. `ls-remote` failure (offline) → skipped with `warn`-free note.

Run: `pnpm --filter @open-agent-toolkit/cli exec vitest run src/commands/doctor/synced-projects.test.ts`
Expected: fails.

**Step 2: Implement (GREEN)**

`checkSyncedProjects(repoRoot, deps): Promise<DoctorCheck[]>`; register per the `checkStaleInvocations` pattern (`index.ts:111`, `:291`, `:854`).

**Step 3: Verify**

Run: `pnpm --filter @open-agent-toolkit/cli exec vitest run src/commands/doctor && pnpm run cli -- doctor --scope project`
Expected: green; doctor runs with the new check.

**Step 4: Format**

Run: `pnpm exec oxfmt --write packages/cli/src/commands/doctor/synced-projects.ts packages/cli/src/commands/doctor/synced-projects.test.ts packages/cli/src/commands/doctor/index.ts`

**Step 5: Commit**

```bash
git add packages/cli/src/commands/doctor/
git commit -m "feat(p03-t07): add doctor checks for synced projects"
```

---

### Task p03-t08: Managed `.gitattributes` block

**Files:**

- Create: `packages/cli/src/commands/init/gitattributes.ts`
- Create: `packages/cli/src/commands/init/gitattributes.test.ts`
- Modify: `packages/cli/src/commands/init/index.ts` (call next to `applyOatCoreGitignore`)
- Modify: `packages/cli/src/commands/tools/update/index.ts` (same)

**Step 1: Write test (RED)**

`applyOatCoreGitattributes(repoRoot)` → `created` with `# OAT core` … `.oat/projects/shared/** linguist-generated=true` … `# END OAT core`; existing unrelated attributes preserved; re-apply → `no-change`; stale block → `updated`. Init and tools-update call sites invoke it (spy).

Run: `pnpm --filter @open-agent-toolkit/cli exec vitest run src/commands/init/gitattributes.test.ts`
Expected: fails.

**Step 2: Implement (GREEN)**

Extract the marker-section logic from `gitignore.ts` into a small shared `managed-block.ts` (or parametrize) and use it for both files.

**Step 3: Verify**

Run: `pnpm --filter @open-agent-toolkit/cli exec vitest run src/commands/init src/commands/tools/update`
Expected: green.

**Step 4: Format**

Run: `pnpm exec oxfmt --write packages/cli/src/commands/init/ packages/cli/src/commands/tools/update/index.ts`

**Step 5: Commit**

```bash
git add packages/cli/src/commands/init/ packages/cli/src/commands/tools/update/index.ts
git commit -m "feat(p03-t08): manage a .gitattributes block marking shared artifacts generated"
```

---

### Task p03-t09: Local-path sync skips nested worktrees

**Files:**

- Modify: `packages/cli/src/commands/local/sync.ts`
- Modify: `packages/cli/src/commands/local/sync.test.ts`

**Step 1: Write test (RED)**

A `localPaths` glob that resolves to a directory containing a `.git` **file** → entry `{ status: 'skipped', reason: 'nested-worktree' }`, nothing copied; ordinary directories unaffected; `.git` directory (a real nested repo) also skipped.

Run: `pnpm --filter @open-agent-toolkit/cli exec vitest run src/commands/local/sync.test.ts`
Expected: fails.

**Step 2: Implement (GREEN)**

Guard in `syncLocalPaths` loop before copying; surface the skip in `SyncResult` and in `oat local sync` output.

**Step 3: Verify**

Run: `pnpm --filter @open-agent-toolkit/cli exec vitest run src/commands/local`
Expected: green.

**Step 4: Format**

Run: `pnpm exec oxfmt --write packages/cli/src/commands/local/sync.ts packages/cli/src/commands/local/sync.test.ts`

**Step 5: Commit**

```bash
git add packages/cli/src/commands/local/sync.ts packages/cli/src/commands/local/sync.test.ts
git commit -m "fix(p03-t09): skip nested worktrees during local path sync"
```

---

### Task p03-t10: Dogfood on a scratch project (manual)

**Files:**

- Modify: `.codex/agents/oat-phase-implementer*.toml`, `.cursor/agents/oat-phase-implementer*.md`, `.oat/sync/manifest.json` (mechanically generated provider views and manifest produced by the required pre-dogfood `oat sync --scope all`; commit these exact managed outputs as a clean-parent prerequisite)
- Modify: `.oat/projects/shared/synced-project-scope/implementation.md` (evidence only)

**Step 0: Sync and commit generated provider views**

Run `pnpm run cli -- sync --scope all`. When canonical Phase 4 agent changes produce tracked provider-view updates, verify with `pnpm run --silent cli -- status --scope all --json` that the affected entries are `in_sync` and the summary has zero drifted or missing entries (unrelated pre-existing stray entries may keep the command exit nonzero). Run `git diff --check`, then stage exactly `.codex/agents/oat-phase-implementer*.toml`, `.cursor/agents/oat-phase-implementer*.md`, and `.oat/sync/manifest.json` and commit them as `chore(p04-t10): sync phase implementer provider views`. The subsequent dogfood must start from a clean parent.

**Step 1: Run**

From this repo, always through the source build — never the global `oat` on PATH:

```bash
oat() { pnpm run --silent cli -- "$@"; }
oat project new synced-dogfood --mode quick --no-set-active        # synced by default
git status --porcelain                                              # only .oat/projects/synced/synced-dogfood.json (+ .gitignore if the rule was self-healed — that change lands in the scaffold commit on this feature branch)
echo "dogfood" >> .oat/projects/synced/synced-dogfood/state.md
oat project push .oat/projects/synced/synced-dogfood --message "chore(oat): dogfood"
git worktree add ../oat-dogfood-wt -b tmp/dogfood
(cd ../oat-dogfood-wt && pnpm run worktree:init && oat() { pnpm run --silent cli -- "$@"; } && oat project pull synced-dogfood && cat .oat/projects/synced/synced-dogfood/state.md)
oat project links synced-dogfood
oat doctor --scope project
oat project prune synced-dogfood --force
git worktree remove ../oat-dogfood-wt && git branch -D tmp/dogfood
```

Expected: parent diff at every step is only the record file (then its deletion); pull in the linked worktree shows the pushed edit; links block renders with a real `github.com/.../blob/<sha>/` URL that opens; doctor is green; after prune `git ls-remote origin refs/oat/projects/synced-dogfood` is empty (other retained project refs are expected and must be left alone) and `git status` is clean except the two record commits (scaffold, prune) which are part of the branch history — squash or keep as evidence.

**Step 2: Record evidence**

Append `### p03-t10 dogfood` to `implementation.md`: commands, observed statuses, the rendered links block, doctor output summary.

**Step 3: Verify**

Run: `git ls-remote origin refs/oat/projects/synced-dogfood; git worktree list`
Expected: no `synced-dogfood` ref (unrelated `refs/oat/projects/*` refs may exist and are reported, not treated as failures); no dogfood worktree.

**Step 4: Commit**

```bash
git add .oat/projects/shared/synced-project-scope/implementation.md
git commit -m "chore(p03-t10): record synced scope dogfood evidence"
```

---

### Task p03-t11: Integrate upstream `origin/main` before Phase 4

**Files:**

- Merge: upstream changes from `origin/main` into `feat/synced-project-scope`
- Modify: conflict-dependent files only if the real merge reports conflicts
- Modify: `.oat/projects/shared/synced-project-scope/implementation.md` (integration evidence and exact upstream SHA)

**Step 1: Preflight and refresh upstream**

- Require a clean worktree and record the pre-merge branch HEAD, fetched `origin/main` SHA, merge base, ahead/behind counts, predicted conflicts, and changed-file overlap.
- Fetch `origin/main` again immediately before merging. If it advanced from the planned SHA, refresh the evidence and evaluate the new delta before proceeding.
- Current planning evidence: branch `0de67d1f785c50ab4aa556faaa7a05a285c8ab1d`, `origin/main` `cb69a2869fe1d5715f13a3b6d966cd9b7ea845f8`, merge base `bf7aff9cbdbbd28d5709b93dbf0af2312cb0eb22`, ahead/behind `103/10`, no changed-file overlap, and no merge-tree content conflict. Five files are deleted upstream while unchanged on the branch and should follow the upstream deletion.

**Step 2: Merge and resolve**

Run: `git merge --no-edit origin/main`

- If the merge is clean, inspect the merge commit and confirm all pre-merge feature commits remain ancestors.
- If conflicts occur, stop and enumerate every conflicted path. Resolve each path from the branch requirement plus upstream intent; never apply wholesale `ours`/`theirs`. Preserve upstream changes that do not conflict with the synced-project scope.
- Do not rebase, squash, reset, force-push, or rewrite existing task history.

**Step 3: Verify merged tree**

Run the repository CI gates in documented order, capturing each exit code:

1. `pnpm check`
2. `pnpm type-check`
3. `pnpm test`
4. `pnpm build`
5. `pnpm run check:skill-bumps`
6. `pnpm release:check-versions`
7. `pnpm release:validate`
8. `pnpm build:docs`

Also run `pnpm lint` and `pnpm format` because the branch already changes skills and smoke-covered surfaces. Run `git diff --check` across the merge result and verify the worktree is clean.

**Step 4: Review integration**

- Run a fresh root-owned review limited to the merge/conflict-resolution result and the upstream integration evidence. Zero Critical and zero Important findings are required before Phase 4.
- If the merge is conflict-free, the reviewer still checks that upstream deletions/additions landed, feature commits remain reachable, package/version state is coherent, and merged-tree verification is truthful.

**Step 5: Record evidence**

Append the exact pre/post merge SHAs, conflict disposition, verification exit codes, and review artifact to `implementation.md`. The merge commit itself owns upstream integration; commit lifecycle evidence separately as OAT bookkeeping.

---

### Task p03-t12: (review) Fail closed when a synced archive record is missing

**Files:**

- Modify: `packages/cli/src/commands/project/archive/archive-utils.ts`
- Modify: `packages/cli/src/commands/project/archive/archive-utils.test.ts`
- Modify: `packages/cli/src/commands/project/archive/index.test.ts` if command-level recovery guidance needs coverage

**Step 1: Write tests (RED)**

- Create real-Git synced checkouts below the configured synced root without their parent discovery records in clean, dirty, and unpushed states.
- Assert archive identifies synced scope from the canonical path independently of record readability, fails closed with actionable pull/adopt recovery guidance, and creates no snapshot, removes no checkout, copies no nested `.git` pointer, and mutates no worktree registration.

Run: `pnpm --filter @open-agent-toolkit/cli exec vitest run src/commands/project/archive`
Expected: the missing-record cases fail before implementation.

**Step 2: Implement (GREEN)**

Never route anything under the canonical synced scope through plain-directory archive deletion. Resolve scope first; require the synced record before constructing the target or performing durable work, and fail closed without mutation when the record is missing.

**Step 3: Verify and format**

Run: `pnpm --filter @open-agent-toolkit/cli exec vitest run src/commands/project/archive && pnpm --filter @open-agent-toolkit/cli type-check`

Run: `pnpm exec oxfmt --write packages/cli/src/commands/project/archive/archive-utils.ts packages/cli/src/commands/project/archive/archive-utils.test.ts packages/cli/src/commands/project/archive/index.test.ts`

**Step 4: Commit**

```bash
git add packages/cli/src/commands/project/archive/
git commit -m "fix(p03-t12): fail closed on missing synced archive records"
```

---

### Task p03-t13: (review) Reuse one durable archive identity across retries and exports

**Files:**

- Modify: `packages/cli/src/commands/project/archive/archive-utils.ts`
- Modify: `packages/cli/src/commands/project/archive/archive-utils.test.ts`
- Modify: `packages/cli/src/commands/project/archive/index.test.ts` and archive explainer helpers only where the retry/export contract requires it

**Step 1: Write tests (RED)**

- Persist one canonical snapshot identifier before any durable side effect and inject failures after copy, summary export, S3 export, lifecycle commit, and synced-checkout removal.
- Retry on a later date with and without a recap; assert the archive path, summary filename, S3 key, recap export, and lifecycle commit all reuse the persisted identity, never create a second dated export, and resume matching existing exports after verifying identity/content.

Run: `pnpm --filter @open-agent-toolkit/cli exec vitest run src/commands/project/archive`
Expected: retry/export identity cases fail before implementation.

**Step 2: Implement (GREEN)**

Derive every archive/export name from the persisted `archiveSnapshot` identity rather than the invocation date. Treat an existing matching export as resumable only after validating its identity/content; preserve the single-lifecycle-commit contract across every retry boundary.

**Step 3: Verify and format**

Run: `pnpm --filter @open-agent-toolkit/cli exec vitest run src/commands/project/archive && pnpm --filter @open-agent-toolkit/cli test && pnpm --filter @open-agent-toolkit/cli type-check`

Run: `pnpm exec oxfmt --write packages/cli/src/commands/project/archive/`

**Step 4: Commit**

```bash
git add packages/cli/src/commands/project/archive/
git commit -m "fix(p03-t13): preserve archive retry identity"
```

---

### Task p03-t14: (review) Preserve user `.gitignore` state during migration

**Files:**

- Modify: `packages/cli/src/commands/project/sync/ref-sync.ts`
- Modify: `packages/cli/src/commands/project/sync/ref-sync.test.ts`
- Modify: `packages/cli/src/commands/project/migrate/index.test.ts`

**Step 1: Write tests (RED)**

- Cover successful and rolled-back shared-to-synced migration when `.gitignore` has pre-existing staged edits, unstaged edits, and both states while the synced ignore rule is missing.
- Assert migration never consumes, overwrites, unstages, or commits the user's edits; it must fail before mutation when safe self-healing cannot preserve the exact index/worktree state.

Run: `pnpm --filter @open-agent-toolkit/cli exec vitest run src/commands/project/sync/ref-sync.test.ts src/commands/project/migrate/index.test.ts`
Expected: staged-state preservation cases fail before implementation.

**Step 2: Implement (GREEN)**

Before self-healing `.gitignore`, verify both its index and worktree state are safe. Fail closed with actionable guidance when the managed rule is missing and either state is dirty; do not weaken migration behavior when the rule already exists. Preserve rollback byte-for-byte and index-for-index.

**Step 3: Verify and format**

Run: `pnpm --filter @open-agent-toolkit/cli exec vitest run src/commands/project/sync/ref-sync.test.ts src/commands/project/migrate/index.test.ts && pnpm --filter @open-agent-toolkit/cli test && pnpm --filter @open-agent-toolkit/cli type-check`

Run: `pnpm exec oxfmt --write packages/cli/src/commands/project/sync/ref-sync.ts packages/cli/src/commands/project/sync/ref-sync.test.ts packages/cli/src/commands/project/migrate/index.test.ts`

**Step 4: Commit**

```bash
git add packages/cli/src/commands/project/sync/ref-sync.ts packages/cli/src/commands/project/sync/ref-sync.test.ts packages/cli/src/commands/project/migrate/index.test.ts
git commit -m "fix(p03-t14): preserve migration gitignore state"
```

---

### Task p03-t15: (review) Detect tracked synced artifacts with real Git

**Files:**

- Modify: `packages/cli/src/commands/doctor/synced-projects.ts`
- Modify: `packages/cli/src/commands/doctor/synced-projects.test.ts`

**Step 1: Write test (RED)**

Create a real Git fixture that commits a file below `synced/<slug>/`; the doctor check must fail and name the leaked tracked artifact. Add explicit coverage for unexpected `git ls-files` failures.

Run: `pnpm --filter @open-agent-toolkit/cli exec vitest run src/commands/doctor/synced-projects.test.ts`
Expected: the real-Git leak case is missed before implementation.

**Step 2: Implement (GREEN)**

Use a verified pathspec/prefix that matches descendants below the synced root without a terminal slash and treat unexpected Git failures explicitly rather than as an empty result.

**Step 3: Verify, format, and commit**

Run: `pnpm --filter @open-agent-toolkit/cli exec vitest run src/commands/doctor/synced-projects.test.ts src/commands/doctor/index.test.ts && pnpm --filter @open-agent-toolkit/cli type-check`

Run: `pnpm exec oxfmt --write packages/cli/src/commands/doctor/synced-projects.ts packages/cli/src/commands/doctor/synced-projects.test.ts`

```bash
git add packages/cli/src/commands/doctor/synced-projects.ts packages/cli/src/commands/doctor/synced-projects.test.ts
git commit -m "fix(p03-t15): detect tracked synced artifacts"
```

---

### Task p03-t16: (review) Keep PR refresh failures best-effort after push

**Files:**

- Modify: `packages/cli/src/commands/project/push/index.ts`
- Modify: `packages/cli/src/commands/project/push/index.test.ts`

**Step 1: Write tests (RED)**

After a successful `pushSynced`, make link computation and body-file writing/cleanup reject independently. Assert the command warns, reports `prRefresh: 'failed'`, preserves the successful push result and exit code, and never retries or rolls back the published ref.

Run: `pnpm --filter @open-agent-toolkit/cli exec vitest run src/commands/project/push/index.test.ts`
Expected: thrown refresh dependencies currently fail the command.

**Step 2: Implement (GREEN)**

Make PR refresh total/best-effort at the post-push boundary. Catch unexpected refresh exceptions, warn with useful context, and return the already-successful push result with failed refresh metadata.

**Step 3: Verify, format, and commit**

Run: `pnpm --filter @open-agent-toolkit/cli exec vitest run src/commands/project/push/index.test.ts && pnpm --filter @open-agent-toolkit/cli type-check`

Run: `pnpm exec oxfmt --write packages/cli/src/commands/project/push/index.ts packages/cli/src/commands/project/push/index.test.ts`

```bash
git add packages/cli/src/commands/project/push/index.ts packages/cli/src/commands/project/push/index.test.ts
git commit -m "fix(p03-t16): preserve push success on refresh errors"
```

---

### Task p03-t17: (review) Replace opaque merge digest with reproducible evidence

**Files:**

- Modify: `.oat/projects/shared/synced-project-scope/implementation.md`

**Step 1: Apply**

Replace the unreproducible binary-diff digest with direct per-path tree-object equality evidence for the 229 upstream paths and 95 feature paths, including the exact commands used and their exit results.

**Step 2: Verify and commit**

Run the recorded tree-equality commands again, then run `pnpm exec oxfmt --check .oat/projects/shared/synced-project-scope/implementation.md && git diff --check`.

```bash
git add .oat/projects/shared/synced-project-scope/implementation.md
git commit -m "docs(p03-t17): make merge evidence reproducible"
```

---

### Task p03-t18: (review) Surface local-sync skip reasons in text output

**Files:**

- Modify: `packages/cli/src/commands/local/index.ts`
- Modify: the closest command-level local sync test under `packages/cli/src/commands/local/`

**Step 1: Write test (RED)**

Assert human-readable local sync output distinguishes `nested-worktree` from destination-exists and other skipped reasons while JSON output remains unchanged.

Run: `pnpm --filter @open-agent-toolkit/cli exec vitest run src/commands/local`
Expected: text output omits the reason before implementation.

**Step 2: Implement (GREEN)**

Append the stable skip reason to human-readable skipped entries without changing the JSON contract or successful-entry output.

**Step 3: Verify, format, and commit**

Run: `pnpm --filter @open-agent-toolkit/cli exec vitest run src/commands/local && pnpm --filter @open-agent-toolkit/cli type-check`

Run: `pnpm exec oxfmt --write packages/cli/src/commands/local/`

```bash
git add packages/cli/src/commands/local/
git commit -m "fix(p03-t18): surface local sync skip reasons"
```

---

### Task p03-t19: (review) Detect index-only synced artifact leaks

**Files:**

- Modify: `packages/cli/src/commands/doctor/synced-projects.ts`
- Modify: `packages/cli/src/commands/doctor/synced-projects.test.ts`

**Step 1: Write test (RED)**

Create a real Git fixture that commits `.oat/projects/synced/<slug>/state.md`, removes or sparse-excludes the synced directory from the working tree without changing the index, and confirms `git ls-files -- .oat/projects/synced` still reports the path. Assert the doctor tracked-artifact check fails rather than returning “No synced projects found.”

Run: `pnpm --filter @open-agent-toolkit/cli exec vitest run src/commands/doctor/synced-projects.test.ts`
Expected: the index-only leak is missed before implementation.

**Step 2: Implement (GREEN)**

Run the Git index query for the synced-root pathspec unconditionally. Keep only filesystem record/checkout enumeration behind the `syncedRoot` existence check, and preserve explicit handling for unexpected Git failures.

**Step 3: Verify, format, and commit**

Run: `pnpm --filter @open-agent-toolkit/cli exec vitest run src/commands/doctor/synced-projects.test.ts src/commands/doctor/index.test.ts && pnpm --filter @open-agent-toolkit/cli test && pnpm --filter @open-agent-toolkit/cli type-check`

Run: `pnpm exec oxfmt --write packages/cli/src/commands/doctor/synced-projects.ts packages/cli/src/commands/doctor/synced-projects.test.ts`

```bash
git add packages/cli/src/commands/doctor/synced-projects.ts packages/cli/src/commands/doctor/synced-projects.test.ts
git commit -m "fix(p03-t19): detect index-only synced leaks"
```

---

## Phase 4: Skills, docs, release

Goal: the lifecycle uses the new scope end to end; docs describe it; release gates pass.

**Implementation handoff:** All eleven Phase 4 tasks are complete and the
final-head gate sequence passes. The `p04` review row remains pending for the
root-owned independent review.

**Canonical skill snippet** (paste verbatim, replacing each inventoried bookkeeping commit; keep the existing `shared` branch unchanged):

```bash
PROJECT_SCOPE=$(oat project scope "$PROJECT_PATH" --format value) || { echo "oat: cannot resolve project scope for $PROJECT_PATH; refusing to commit artifacts" >&2; exit 1; }
# fail closed: never fall back to branch bookkeeping when scope resolution fails
if [ "$PROJECT_SCOPE" = "synced" ]; then
  oat project push "$PROJECT_PATH" --message "<same message the git commit used>"
else
  <existing git add … && git commit … lines, unchanged>
fi
```

Arrival guard: `PROJECT_SCOPE=$(oat project scope "$PROJECT_PATH" --format value) || exit 1; [ "$PROJECT_SCOPE" = "synced" ] && oat project pull "$PROJECT_PATH"` — same fail-closed rule. The p04-t06 validator rule (c) additionally rejects any `|| echo shared`-style fallback (`oat project scope … ||` followed by a literal scope word) around project-artifact commits, with a fixture.

Every touched `SKILL.md` gets a `version:` bump (patch for snippet-only edits, minor when behavior text changes). `oat-phase-implementer.md` is an agent and gets its frontmatter `version` bumped too.

### Task p04-t01: Bookkeeping sweep A — authoring skills

**Files:**

- Modify: `.agents/skills/oat-project-quick-start/SKILL.md` (5 sites: `:210`, `:262`, `:460`, `:468`, `:827-829`)
- Modify: `.agents/skills/oat-project-discover/SKILL.md` (`:552-553`)
- Modify: `.agents/skills/oat-project-spec/SKILL.md` (`:440-441`)
- Modify: `.agents/skills/oat-project-design/SKILL.md` (`:324`, `:576`, `:613`, `:762`)
- Modify: `.agents/skills/oat-project-plan/SKILL.md` (Step 15)
- Modify: `.agents/skills/oat-project-import-plan/SKILL.md` (`:429-436`)
- Modify: `.agents/skills/oat-project-retro/SKILL.md` (validator prerequisite only: rename `## Progress Indicators` to `## Progress Indicators (User-Facing)` and bump `version:` now; behavioral edits remain in p04-t03, with no second version bump in this PR)
- Modify: `.agents/skills/oat-project-retro-file/SKILL.md` (validator prerequisite only: rename `## Progress Indicators` to `## Progress Indicators (User-Facing)` and bump `version:` now; behavioral edits remain in p04-t11, with no second version bump in this PR)

**Step 1: Apply the snippet**

Replace each commit site with the guarded form. Where a site uses `git add "$PROJECT_PATH/"` (whole dir), the `synced` branch is a single `oat project push`. Bump each `version:`. Also normalize the exact progress-indicator heading and bump the versions of `oat-project-retro` and `oat-project-retro-file` so the tree-wide validator can pass; do not make their later behavioral changes in this task.

**Step 2: Verify**

Run: `pnpm oat:validate-skills && pnpm run check:skill-bumps && ! grep -rn 'jq' .agents/skills/oat-project-{quick-start,discover,spec,design,plan,import-plan}/SKILL.md`
Expected: exit 0 — validation passes; bump check passes; the negated grep finds no `jq` (a match would make the chain exit nonzero).

**Step 3: Format**

Run: `pnpm exec oxfmt --write .agents/skills/oat-project-quick-start/SKILL.md .agents/skills/oat-project-discover/SKILL.md .agents/skills/oat-project-spec/SKILL.md .agents/skills/oat-project-design/SKILL.md .agents/skills/oat-project-plan/SKILL.md .agents/skills/oat-project-import-plan/SKILL.md .agents/skills/oat-project-retro/SKILL.md .agents/skills/oat-project-retro-file/SKILL.md`

**Step 4: Commit**

```bash
git add .agents/skills/oat-project-quick-start .agents/skills/oat-project-discover .agents/skills/oat-project-spec .agents/skills/oat-project-design .agents/skills/oat-project-plan .agents/skills/oat-project-import-plan .agents/skills/oat-project-retro/SKILL.md .agents/skills/oat-project-retro-file/SKILL.md
git commit -m "feat(p04-t01): push synced artifacts from authoring skills"
```

---

### Task p04-t02: Bookkeeping sweep B — execution skills and agent

**Files:**

- Modify: `.agents/skills/oat-project-implement/SKILL.md` **Step 0** (`:157-170`): before the directory/`state.md` validation and before the `${PROJECTS_ROOT}/<name>` fallback, if the configured path is under the `synced` root and a record or remote ref exists, run `oat project pull` (adopting if needed); only then apply the existing invalid-project route. `references/plan-and-resume.md` gets a one-line pointer (the pull already happened in Step 0). Also `references/phase-execution.md` (`:665-667`), `references/completion-and-closeout.md` (`:112-114`, `:872-874`); `SKILL.md` version bump
- Modify: `.agents/agents/oat-phase-implementer.md` — no literal `git add` exists in this file; add a short **Synced-scope bookkeeping** paragraph under the ledger/recovery commit guidance stating that artifact and ledger commits use the scope guard + `oat project push`, while code task commits (`feat(pNN-tNN)`) are unchanged; bump frontmatter `version`
- Modify: `.agents/skills/oat-project-review-receive/SKILL.md` (`:529-534` only — `:399-400` is the generated _code_ fix-commit template and stays a branch commit; add a one-line note there: "fix tasks that edit synced artifacts use `oat project push`")
- Modify: `.agents/skills/oat-project-review-receive-remote/SKILL.md` (`:270-271`)
- Modify: `.agents/skills/oat-project-review-provide/SKILL.md` — three sites: **Step 0** `:105` (project resolution) gains the same pull-before-validation rule as implement Step 0 (an absent synced checkout with a record/ref is pulled before the directory and `state.md` are required); Step 1.6 `:250` (committed-artifact baseline) becomes scope-aware: for `synced`, run `git -C "$PROJECT_PATH" status --porcelain -- discovery.md spec.md design.md plan.md implementation.md state.md` inside the nested checkout and stop on any pending change (the parent-worktree check cannot see inside the ignored checkout); Step 9.5 `:1064` (the required atomic commit of the review artifact + `plan.md`) becomes `oat project push` under the guard, since a branch commit cannot persist files inside the nested checkout. Add skill-contract test cases in `packages/cli/src/commands/init/tools/shared/review-skill-contracts.test.ts` asserting (a) implement Step 0 and review-provide Step 0 both contain the pull-before-validation wording for an absent synced checkout with a valid record, and (b) the Step 1.6 synced baseline wording is present
- Modify: `.agents/skills/oat-project-revise/SKILL.md` (`:271-272` only — `:185-186` is the code fix-commit template; same one-line note)
- Modify: `.agents/skills/oat-project-reconcile/SKILL.md` (`:681-691`)

**Step 1: Apply the snippet**

Same as p04-t01. For `oat-phase-implementer.md`, code commits (`feat(pNN-tNN)`) are unchanged; only artifact/ledger commits become `oat project push` under the guard. Note in `phase-execution.md` that `oat state refresh` still runs first. Bump versions.

**Step 2: Verify**

Run: `pnpm oat:validate-skills && pnpm run check:skill-bumps`
Expected: pass. Note: `check:skill-bumps` only inspects `SKILL.md`; `references/*.md` edits are covered by the `SKILL.md` bump in the same skill.

**Step 3: Format**

Run: `pnpm exec oxfmt --write .agents/skills/oat-project-implement .agents/agents/oat-phase-implementer.md .agents/skills/oat-project-review-receive/SKILL.md .agents/skills/oat-project-review-receive-remote/SKILL.md .agents/skills/oat-project-review-provide/SKILL.md .agents/skills/oat-project-revise/SKILL.md .agents/skills/oat-project-reconcile/SKILL.md packages/cli/src/commands/init/tools/shared/review-skill-contracts.test.ts`

**Step 4: Commit**

```bash
git add .agents/skills/oat-project-implement .agents/agents/oat-phase-implementer.md .agents/skills/oat-project-review-receive .agents/skills/oat-project-review-receive-remote .agents/skills/oat-project-review-provide .agents/skills/oat-project-revise .agents/skills/oat-project-reconcile packages/cli/src/commands/init/tools/shared/review-skill-contracts.test.ts
git commit -m "feat(p04-t02): push synced artifacts from execution skills and phase implementer"
```

---

### Task p04-t03: Bookkeeping sweep C — summary, document, retro, brainstorm, wave

**Files:**

- Modify: `.agents/skills/oat-project-summary/SKILL.md` (`:427-447`)
- Modify: `.agents/skills/oat-project-document/SKILL.md` (`:492-510`, state commit only — doc commits stay on the branch)
- Modify: `.agents/skills/oat-project-retro/references/apply-procedure.md` (`:87-107`, `:162`, `:192-200`); its `SKILL.md` version was already bumped in p04-t01, so do not bump it again in this PR
- Modify: `.agents/skills/oat-brainstorm/SKILL.md` (`:543-556` fold-back, `:607-611` reference file) and `references/destinations.md` (`:137-139`, `:174`)
- Modify: `.agents/skills/oat-wave-execute/SKILL.md` (`:59-66`, `:323` — gate artifact commits when the wrapper project is synced)

**Step 1: Apply the snippet**

For brainstorm fold-back, the preflight `git status --porcelain -- "$ARTIFACT_PATH"` must run inside the checkout for synced projects (`git -C "$PROJECT_PATH" status --porcelain -- <basename>`); the handoff prompt's commit hash comes from `oat project push --json`'s `sha`. Bump versions.

**Step 2: Verify**

Run: `pnpm oat:validate-skills && pnpm run check:skill-bumps`
Expected: pass.

**Step 3: Format**

Run: `pnpm exec oxfmt --write .agents/skills/oat-project-summary/SKILL.md .agents/skills/oat-project-document/SKILL.md .agents/skills/oat-project-retro .agents/skills/oat-brainstorm .agents/skills/oat-wave-execute/SKILL.md`

**Step 4: Commit**

```bash
git add .agents/skills/oat-project-summary .agents/skills/oat-project-document .agents/skills/oat-project-retro .agents/skills/oat-brainstorm .agents/skills/oat-wave-execute
git commit -m "feat(p04-t03): push synced artifacts from summary, document, retro, brainstorm, and wave skills"
```

---

### Task p04-t04: Arrival sweep and creation-skill docs

**Files:**

- Modify: `.agents/skills/oat-project-progress/SKILL.md` (`:120-145`: pull guard after resolving the active project; replace `ls -d "$PROJECTS_ROOT"/*/` with `oat project list --json`)
- Modify: `.agents/skills/oat-worktree-bootstrap/SKILL.md` (`:75-80`, `:156`, `:160-167`: pull after `oat local sync`; note nested worktrees are skipped by local sync)
- Modify: `.agents/skills/oat-worktree-bootstrap-auto/SKILL.md` (`:189-216`: same, non-interactive)
- Modify: `.agents/skills/oat-cursor-cloud-projects/SKILL.md` (`:148-167`: pull on orientation when the record exists and the checkout is absent)
- Modify: `.agents/skills/oat-project-new/SKILL.md` (document `--scope`, default `synced`, `projects.defaultScope`)
- Modify: `.agents/skills/oat-doctor/SKILL.md` (`:250`, `:261`: scope table + new check names)

**Step 1: Apply**

Arrival guard as defined above; bump versions.

**Step 2: Verify**

Run: `pnpm oat:validate-skills && pnpm run check:skill-bumps`
Expected: pass.

**Step 3: Format**

Run: `pnpm exec oxfmt --write .agents/skills/oat-project-progress/SKILL.md .agents/skills/oat-worktree-bootstrap/SKILL.md .agents/skills/oat-worktree-bootstrap-auto/SKILL.md .agents/skills/oat-cursor-cloud-projects/SKILL.md .agents/skills/oat-project-new/SKILL.md .agents/skills/oat-doctor/SKILL.md`

**Step 4: Commit**

```bash
git add .agents/skills/oat-project-progress .agents/skills/oat-worktree-bootstrap .agents/skills/oat-worktree-bootstrap-auto .agents/skills/oat-cursor-cloud-projects .agents/skills/oat-project-new .agents/skills/oat-doctor
git commit -m "feat(p04-t04): pull synced artifacts on arrival and document scope selection"
```

---

### Task p04-t05: PR and completion skills

**Files:**

- Modify: `.agents/skills/oat-project-pr-final/SKILL.md` — for `synced` projects the PR step becomes an explicit ordered sequence: (1) generate/refresh `summary.md` and the `pr/` artifact as today; (2) **`oat project push`** so the ref contains the summary and any moved artifacts (`oat project links` reads the ref — a summary that exists only in the checkout would be omitted); (3) render the block with `oat project links "$PROJECT_PATH"` and insert it into the body (`:280-320`); (4) `gh pr create`; (5) set `oat_pr_status: open` and `oat_pr_url` in `state.md` (`:408`, unchanged); (6) **`oat project push`** again so the ref carries the authoritative PR metadata and the push path refreshes the block to the new ref SHA. `:299-301`: synced artifact paths are never linked as References — the block replaces them.
- Modify: `.agents/skills/oat-project-pr-progress/SKILL.md` (`:227-265`, `:246-247`, `:312`) — same six-step sequence; **new behavior:** progress PRs must persist `oat_pr_status: open` / `oat_pr_url` in `state.md` (today they do not), otherwise p03-t03's push-time refresh never fires for mid-project PRs. Verification for both skills (manual, recorded in `implementation.md` during p04-t10): a freshly generated `summary.md` appears in the initial block; after a progress PR, one more `oat project push` re-renders the block with the new SHA.
- Modify: `.agents/skills/oat-project-complete/SKILL.md` — **first** replace the Step 1 shared-only classification (`:48-51`, `IS_SHARED_PROJECT` derived from `projects.root` prefix) with a single `PROJECT_SCOPE=$(oat project scope "$PROJECT_PATH" --format value)` and a derived `IS_DURABLE_PROJECT` that is true for `shared` **and** `synced`; then audit and update every `IS_SHARED_PROJECT` condition — archive offer `:145`, recap/export durability gate `:355`, archive execution `:442`, `:514`, link-breakage note `:716` — so `shared` and `synced` receive identical archive/recap/durable behavior (including when `workflow.archiveOnComplete` is unset) while `local` stays exactly as today; **then** steps 7–11.5 for synced projects run the design's 7-step state machine (finalize → `oat project push` → `oat project archive` (steps 3–6, commits record + summary export) → `oat project links --durable-summary <path>` → `gh pr edit`); Step 10 for synced projects is **not** a no-op: the lifecycle commit is the one `oat project archive` makes (its JSON `lifecycleCommit` SHA replaces the `git rev-parse HEAD` the skill uses today for recap re-attestation in Step 10.5); Step 10.6 retains an exact-path Git evidence commit containing only the exported `manifest.json` and `build-record.json`, because those files live under tracked `.oat/repo/reference/project-recaps/` outside the ignored synced checkout; stage the two reported paths with `git add --`, commit them directly, verify immediate parent/order and exact-path contamination, then push once so the existing two-commit-then-one-push protocol at `:588-680` is preserved exactly; the `IS_SHARED_PROJECT="false"` recap sentence at `:355` becomes scope-aware so `synced` recaps are exported and attested like `shared`; keep the anti-pattern note about never linking `archived/` paths
- Modify: `packages/cli/src/commands/init/tools/shared/review-skill-contracts.test.ts` (`:802-912` pins the shared-only wording, e.g. the `IS_SHARED_PROJECT="false"` recap sentence at `:912`) — update the pinned strings to the scope-aware wording and add an assertion that the skill classifies `synced` as durable

**Step 1: Apply**

Bump versions. In `oat-project-complete`, state explicitly that archive refuses on a dirty/unpushed checkout and that the fix is `oat project push`.

**Step 2a: Verify the skill contract test**

Run: `pnpm --filter @open-agent-toolkit/cli exec vitest run src/commands/init/tools/shared/review-skill-contracts.test.ts`
Expected: green with the updated scope-aware pins.

**Step 2: Verify**

Run: `pnpm oat:validate-skills && pnpm run check:skill-bumps`
Expected: pass.

**Step 3: Format**

Run: `pnpm exec oxfmt --write .agents/skills/oat-project-pr-final/SKILL.md .agents/skills/oat-project-pr-progress/SKILL.md .agents/skills/oat-project-complete/SKILL.md packages/cli/src/commands/init/tools/shared/review-skill-contracts.test.ts`

**Step 4: Commit**

```bash
git add .agents/skills/oat-project-pr-final .agents/skills/oat-project-pr-progress .agents/skills/oat-project-complete packages/cli/src/commands/init/tools/shared/review-skill-contracts.test.ts
git commit -m "feat(p04-t05): embed pinned artifact links in PRs and complete synced projects"
```

---

### Task p04-t06: Skill validator rules for synced safety

**Files:**

- Modify: `packages/cli/src/validation/skills.ts`
- Modify: `packages/cli/src/validation/skills.test.ts`
- Create: `packages/cli/src/validation/synced-bookkeeping-sites.json`
- Modify: `.agents/skills/oat-brainstorm/SKILL.md` (mechanical correction discovered by the new validator: resolve `PROJECT_SCOPE` inside the same fenced shell block as the fold-back artifact commit; its PR-scoped version was already bumped in p04-t03, so do not bump it again)

**Step 1: Write test (RED)**

Validator fails any `oat-*` SKILL.md or `references/*.md` that (a) contains `git add` with a pathspec under `.oat/projects/synced/` (tree-wide), or (b) pipes `oat project scope` output into `jq` / parses its `--json` instead of using `--format value` (tree-wide, pattern-based: `project scope[^\n]*\|[^\n]*jq`). Do **not** ban the `jq` token globally — `oat-wrap-up`, `oat-project-review-provide-remote`, `oat-review-provide-remote`, `oat-docs-analyze`, `oat-docs-apply`, `oat-repo-knowledge-index`, `oat-agent-instructions-analyze`, and `oat-agent-instructions-apply` use `jq`/`--jq` legitimately today. Rule (c), lifecycle-scoped (`oat-project-*`, `oat-worktree-*`, `oat-brainstorm`, `oat-wave-execute`, `.agents/agents/oat-phase-implementer.md`): any `git add`/`git commit` line whose pathspec references a project-artifact variable (`$PROJECT_PATH`, `{PROJECT_PATH}`, `$ARTIFACT_PATH`, `$ACTIVE_PROJECT`, `$REVIEW_PATH`) must be preceded within the same fenced code block by the scope guard (`oat project scope … --format value`); an unguarded occurrence fails with file:line. Rule (d), inventory: a checked-in list `packages/cli/src/validation/synced-bookkeeping-sites.json` of **every command, skill, and agent that resolves a project path, reads artifacts on arrival, or writes project artifacts** — the bookkeeping sites swept in p04-t01..t05 and p04-t11, the arrival sites, the PR/completion sites, and the CLI resolvers (`open`, `pause`, `list`, `status`, `push`, `pull`, `links`, `prune`, `migrate`, `archive`) — each with file + unique anchor phrase + kind (`resolve` | `arrival` | `write`); the validator asserts each anchor still exists and is guarded, and a separate completeness test greps `.agents/skills/oat-*` and `.agents/agents/*` for `activeProject`/`PROJECT_PATH` writers not present in the inventory, so future additions cannot silently bypass synced durability. Fixtures: one passing guarded skill, one unguarded `$PROJECT_PATH` commit modeled on `oat-project-review-provide` Step 9.5, one with a stale inventory anchor. Passes the real skill tree after p04-t01..t05; fails a fixture skill for each rule.

Run: `pnpm --filter @open-agent-toolkit/cli exec vitest run src/validation/skills.test.ts`
Expected: fails.

**Step 2: Implement (GREEN)**

Add the two content rules alongside the existing frontmatter rules; error messages name the file and line. `design.md` Dependencies already states the narrowed rule (applied during plan review); the validator implements that wording. Correct the real `oat-brainstorm` fold-back site exposed by the rule by resolving `PROJECT_SCOPE` fail-closed inside the same fenced shell block as its guarded `git add`/commit; do not rely on a variable from a prior fence.

**Step 3: Verify**

Run: `pnpm --filter @open-agent-toolkit/cli exec vitest run src/validation/skills.test.ts && pnpm oat:validate-skills`
Expected: green; real tree passes.

**Step 4: Format**

Run: `pnpm exec oxfmt --write packages/cli/src/validation/skills.ts packages/cli/src/validation/skills.test.ts packages/cli/src/validation/synced-bookkeeping-sites.json .agents/skills/oat-brainstorm/SKILL.md`

**Step 5: Commit**

```bash
git add packages/cli/src/validation/skills.ts packages/cli/src/validation/skills.test.ts packages/cli/src/validation/synced-bookkeeping-sites.json .agents/skills/oat-brainstorm/SKILL.md
git commit -m "feat(p04-t06): validate skills never stage synced artifacts or require jq"
```

---

### Task p04-t07: Documentation

**Files:**

- Modify: `apps/oat-docs/docs/reference/file-locations.md` (scopes list, record path, ref, `projects.defaultScope`)
- Modify: `apps/oat-docs/docs/reference/oat-directory-structure.md` (`synced/` layout, config table row, archive behavior for synced)
- Modify: `apps/oat-docs/docs/reference/cli-reference.md` (`project new --scope`, `scope`, `push`, `pull`, `links`, `prune`, `migrate`, `list --scope`)
- Modify: `apps/oat-docs/docs/workflows/projects/artifacts.md`, `lifecycle.md`, `pr-flow.md` (bookkeeping via push; PR links block; completion order)
- Modify: `apps/oat-docs/docs/workflows/projects/implementation-execution.md` — the worktree-facing page (FR14 worktree coverage). Add a "Synced projects in worktrees" section covering: fresh-worktree materialization (`oat project pull` on arrival, driven by the record file), one independent detached checkout per worktree reconciled through `origin`, conflict resolution with `pull --continue`/`--abort`, `oat local sync` skipping nested checkouts, and what happens to the nested checkout when a parent worktree is removed (nothing to clean up; `pull` prunes stale registrations).
- Create: `apps/oat-docs/docs/workflows/projects/reviewing-oat-prs.md` (reviewer-facing: what the record file is, what the links block is, why plan/state aren't linked, editor tip `git.scanRepositories`)
- Create: `apps/oat-docs/docs/workflows/projects/picking-up-projects.md` — "Picking up a project on another machine or from another user": `oat project list --remote`, adopting `pull`, coordination children, what travels vs. what does not (`local` never; `refs/oat/*` not through forks; clone needs the explicit fetch), why retained refs are never garbage-collected, and what the archive keeps (`reviews/` dropped) — sourced from `design.md` → Discovery across machines and users. Add to the projects `index.md` `## Contents`.
- Modify: `apps/oat-docs/docs/workflows/projects/index.md` (`## Contents` entry for the new page)
- Regenerate: `apps/oat-docs/index.md` via `pnpm -w run cli:source -- docs generate-index --docs-dir apps/oat-docs/docs --output apps/oat-docs/index.md`

**Step 1: Author**

Follow `apps/oat-docs/AGENTS.md` (frontmatter `title`/`description`, `.md` links in `## Contents`). Honor `oat-project-document` guidance: content traces to `design.md`; no speculation.

**Step 2: Verify**

Run: `pnpm check && pnpm build:docs && grep -n "Synced projects in worktrees" apps/oat-docs/docs/workflows/projects/implementation-execution.md`
Expected: markdownlint clean; docs build succeeds; the worktree section exists.

**Step 3: Format**

Run: `pnpm exec oxfmt --write apps/oat-docs/docs/reference/file-locations.md apps/oat-docs/docs/reference/oat-directory-structure.md apps/oat-docs/docs/reference/cli-reference.md apps/oat-docs/docs/workflows/projects/artifacts.md apps/oat-docs/docs/workflows/projects/lifecycle.md apps/oat-docs/docs/workflows/projects/pr-flow.md apps/oat-docs/docs/workflows/projects/implementation-execution.md apps/oat-docs/docs/workflows/projects/reviewing-oat-prs.md apps/oat-docs/docs/workflows/projects/picking-up-projects.md apps/oat-docs/docs/workflows/projects/index.md`

**Step 4: Commit**

```bash
git add apps/oat-docs/docs apps/oat-docs/index.md
git commit -m "docs(p04-t07): document the synced project scope and reviewer experience"
```

---

### Task p04-t08: Lockstep version bumps

**Files:**

- Modify: `packages/cli/package.json`, `packages/control-plane/package.json`, `packages/docs-config/package.json`, `packages/docs-theme/package.json`, `packages/docs-transforms/package.json` (`0.2.36` → `0.2.37`)
- Modify: `packages/cli/assets/public-package-versions.json` (generated lockstep asset refreshed by `pnpm release:validate`, `0.2.36` → `0.2.37`)
- Modify: `pnpm-lock.yaml` if the workspace references versions (run `pnpm install --lockfile-only`)

**Step 1: Apply**

Bump all five together (minor vs patch per repo release policy — patch unless policy says new CLI commands require minor; check `release:check-versions` output).

**Step 1a: Format**

Run: `pnpm exec oxfmt --write packages/cli/package.json packages/control-plane/package.json packages/docs-config/package.json packages/docs-theme/package.json packages/docs-transforms/package.json packages/cli/assets/public-package-versions.json` (after `pnpm install --lockfile-only` and `pnpm release:validate` refreshes the generated asset).

**Step 2: Verify**

Run: `LOGDIR=$(mktemp -d); pnpm release:check-versions > "$LOGDIR/check-versions.log" 2>&1; echo "exit=$?"; pnpm release:validate > "$LOGDIR/validate.log" 2>&1; echo "exit=$?"; rm -rf "$LOGDIR"`
Expected: both `exit=0`.

**Step 3: Commit**

```bash
git add packages/*/package.json packages/cli/assets/public-package-versions.json pnpm-lock.yaml
git commit -m "chore(p04-t08): bump public packages to 0.2.37"
```

---

### Task p04-t09: Definition-of-Done gates

**Files:**

- Modify: `.oat/projects/shared/synced-project-scope/implementation.md` (gate evidence)

**Step 1: Run every gate, capturing exit codes explicitly**

```bash
LOGDIR=$(mktemp -d)   # logs never live in the worktree — the clean-status assertions below must hold
for g in check type-check test build "run check:skill-bumps" release:check-versions release:validate build:docs; do
  pnpm $g > "$LOGDIR/gate-$(echo $g | tr ' :' '__').log" 2>&1; echo "$g exit=$?"
done
pnpm lint > "$LOGDIR/gate-lint.log" 2>&1; echo "lint exit=$?"      # required: .agents/skills touched
pnpm format > "$LOGDIR/gate-format.log" 2>&1; echo "format exit=$?"  # required: .agents/skills touched
# copy only the exit summary into implementation.md, then: rm -rf "$LOGDIR"
```

**Step 2: Fix and re-run** until every exit is 0. Every correction is committed **before** the evidence commit as its own scoped commit (`fix(p04-t09): <what>`, staging only the corrected paths; skill edits also get their version bump and pass `pnpm run check:skill-bumps`, `pnpm lint`, `pnpm format`). Record the final exit list and the fix-commit SHAs in `implementation.md`.

**Step 3: Commit**

```bash
git status --porcelain            # must be empty apart from implementation.md before this commit
git add .oat/projects/shared/synced-project-scope/implementation.md
git commit -m "chore(p04-t09): record definition-of-done gate results"
git status --porcelain            # must be empty — the task is not complete otherwise
```

---

### Task p04-t10: Skill-sweep dogfood with the shipped snippets (manual)

**Files:**

- Modify: `.oat/projects/shared/synced-project-scope/implementation.md` (evidence only)

**Step 1: Run**

Exercise at least one rewritten bookkeeping site and one arrival site end to end, using the bundled skills exactly as shipped after p04-t01..t05 and the committed provider sync from Step 0:

```bash
oat() { pnpm run --silent cli -- "$@"; }
oat project new skill-dogfood --mode quick            # synced; becomes the active project
# 1. Bookkeeping site — a REAL artifact-writing lifecycle skill, executed end to end on the prepared active project:
#    run `oat-project-summary` (writes summary.md, then its bookkeeping site pushes). Acceptance is the skill's own
#    run, not a pasted fragment; snippet-only execution is a separate mechanical check recorded alongside.
git status --porcelain                                 # parent clean except the record file already committed
git -C .oat/projects/synced/skill-dogfood log --oneline # shows the bookkeeping commit
# 2. Arrival/routing site — a REAL skill in the linked worktree: run `oat-project-progress` and confirm its Step 0 pulled
#    the checkout before reporting status (the arrival snippet alone is not the acceptance path).
git worktree add ../oat-skill-wt -b tmp/skill-dogfood
(cd ../oat-skill-wt && pnpm run worktree:init && oat() { pnpm run --silent cli -- "$@"; } && oat config set activeProject .oat/projects/synced/skill-dogfood && [ ! -d .oat/projects/synced/skill-dogfood ] && echo "checkout absent — invoking oat-project-progress now")
#    → in that worktree, invoke the REAL `oat-project-progress` skill (not `oat project pull`); its Step 0 must materialize
#      .oat/projects/synced/skill-dogfood before it reads state. Evidence: the skill transcript + `ls` afterwards.
#      (A manual `oat project pull` is a separate CLI check, not the acceptance path.)
oat project prune skill-dogfood --force
oat config set activeProject .oat/projects/shared/synced-project-scope   # restore this project as active
git worktree remove ../oat-skill-wt && git branch -D tmp/skill-dogfood
```

Expected: the skill snippet chose the `synced` branch and pushed (no `git commit` of artifacts on the branch; `git log --oneline -3` shows only record commits); the arrival snippet created the checkout in the linked worktree; prune left `git ls-remote origin refs/oat/projects/skill-dogfood` empty (unrelated retained refs are expected).

**Step 2: Record evidence**

Append `### p04-t10 skill dogfood` to `implementation.md`: which sites ran, the observed `oat project push`/`pull` JSON, and any snippet defects found. Each defect fix is its own scoped commit **before** the evidence commit (`fix(p04-t10): <skill> <what>`, staging only the corrected skill/agent files, with a version bump), so nothing is left uncommitted behind the evidence.

**Step 3: Verify**

Run: `pnpm oat:validate-skills && git ls-remote origin refs/oat/projects/skill-dogfood`
Expected: validator passes; no `skill-dogfood` ref.

If any file under `.agents/skills` or `.agents/agents` was edited in this task, also re-run the skill-covering gates with explicit exit codes and append the results to the p04-t09 gate record in `implementation.md`:

```bash
LOGDIR=$(mktemp -d)
pnpm run check:skill-bumps > "$LOGDIR/skill-bumps.log" 2>&1; echo "skill-bumps exit=$?"
pnpm lint > "$LOGDIR/lint.log" 2>&1; echo "lint exit=$?"
pnpm format > "$LOGDIR/format.log" 2>&1; echo "format exit=$?"
rm -rf "$LOGDIR"
```

All three must exit 0 before the commit below (these are the only gates covering `.agents/skills`, and CI runs neither `lint` nor `format`).

**Step 4: Commit**

```bash
git status --porcelain            # must be empty apart from implementation.md
git add .oat/projects/shared/synced-project-scope/implementation.md
git commit -m "chore(p04-t10): record skill-sweep dogfood evidence"
git status --porcelain            # must be empty — the phase is not complete otherwise
```

---

### Task p04-t11: Bookkeeping sweep D — capture, promote, autonomous, next, retro-file

**Files:**

- Modify: `.agents/skills/oat-project-capture/SKILL.md` (`:147-253` creates a project — now `synced` by default — then rewrites discovery/state/implementation without a push → push after the rewrite under the guard)
- Modify: `.agents/skills/oat-project-promote-spec-driven/SKILL.md` (artifact rewrites → push under the guard)
- Modify: `.agents/skills/oat-project-autonomous/SKILL.md` (`:240-281` persists state/learnings outside an owning lifecycle commit → push under the guard at each persistence point; arrival pull at start)
- Modify: `.agents/skills/oat-project-next/SKILL.md` (routing/orchestration entry point → arrival pull before reading state)
- Modify: `.agents/skills/oat-project-retro-file/SKILL.md` (writes destinations/statuses back to the retro artifact under the project → push under the guard; its version was already bumped in p04-t01, so do not bump it again in this PR)
- Modify: `packages/cli/src/validation/synced-bookkeeping-sites.json` (add every site above, plus `oat project open`/`pause`/`list`/`status` as CLI resolvers)

**Step 1: Apply**

Canonical snippet and arrival guard as in p04-t01..t04; bump each `version:` except `oat-project-retro-file`, whose PR-scoped bump was already made in p04-t01.

**Step 2: Verify**

Run: `pnpm oat:validate-skills && pnpm run check:skill-bumps`
Expected: pass (the p04-t06 inventory validator now asserts these sites are guarded).

**Step 3: Format**

Run: `pnpm exec oxfmt --write .agents/skills/oat-project-capture/SKILL.md .agents/skills/oat-project-promote-spec-driven/SKILL.md .agents/skills/oat-project-autonomous/SKILL.md .agents/skills/oat-project-next/SKILL.md .agents/skills/oat-project-retro-file/SKILL.md packages/cli/src/validation/synced-bookkeeping-sites.json`

**Step 4: Commit**

```bash
git add .agents/skills/oat-project-capture .agents/skills/oat-project-promote-spec-driven .agents/skills/oat-project-autonomous .agents/skills/oat-project-next .agents/skills/oat-project-retro-file packages/cli/src/validation/synced-bookkeeping-sites.json
git commit -m "feat(p04-t11): push synced artifacts from capture, promote, autonomous, next, and retro-file"
```

---

### Task p04-t12: Ensure synced completion always publishes pinned links (review)

**Files:**

- Modify: `.agents/skills/oat-project-complete/SKILL.md`
- Modify: `packages/cli/src/commands/init/tools/shared/review-skill-contracts.test.ts`

**Step 1: Understand**

Trace both the new-PR and existing-PR completion paths when recap export is disabled and `archive.summaryExportPath` is null. Preserve the existing final-ref/archive ordering and the already-completed PR-scoped skill version bump.

**Step 2: Implement**

After the final synced ref/archive SHA is known, always render `oat project links "$PROJECT_NAME" --format markdown` and insert or replace the delimited pinned-links block in the final PR body. Add `--durable-summary` only when a verified export exists, independently of `projectRecapExport`.

**Step 3: Verify**

Add contract coverage for a newly opened PR and an already-open PR with no recap and no configured summary export. Run `pnpm --filter @open-agent-toolkit/cli exec vitest run src/commands/init/tools/shared/review-skill-contracts.test.ts`, `pnpm oat:validate-skills`, `pnpm run check:skill-bumps`, `pnpm lint`, and `pnpm format`.

**Step 4: Commit**

```bash
git add .agents/skills/oat-project-complete/SKILL.md packages/cli/src/commands/init/tools/shared/review-skill-contracts.test.ts
git commit -m "fix(p04-t12): always publish synced completion links"
```

---

### Task p04-t13: Enumerate every project scope in next routing (review)

**Files:**

- Modify: `.agents/skills/oat-project-next/SKILL.md`
- Modify: `packages/cli/src/commands/init/tools/shared/review-skill-contracts.test.ts`

**Step 1: Understand**

Trace the empty and invalid active-pointer fallbacks. Preserve the existing arrival pull and the already-completed PR-scoped skill version bump.

**Step 2: Implement**

Replace the shared-root directory probe with `oat project list --json`. Distinguish a genuinely empty project list from projects that exist without a valid active pointer, and route the latter through project selection instead of project creation.

**Step 3: Verify**

Add contract cases for an absent-checkout synced record and for a local-only project. Run `pnpm --filter @open-agent-toolkit/cli exec vitest run src/commands/init/tools/shared/review-skill-contracts.test.ts`, `pnpm oat:validate-skills`, `pnpm run check:skill-bumps`, `pnpm lint`, and `pnpm format`.

**Step 4: Commit**

```bash
git add .agents/skills/oat-project-next/SKILL.md packages/cli/src/commands/init/tools/shared/review-skill-contracts.test.ts
git commit -m "fix(p04-t13): list all scopes in next routing"
```

---

### Task p04-t14: Make dirty brainstorm fold-back scope-aware (review)

**Files:**

- Modify: `.agents/skills/oat-brainstorm/SKILL.md`
- Modify: `packages/cli/src/commands/init/tools/shared/review-skill-contracts.test.ts`

**Step 1: Understand**

Follow the resolved project scope through the clean path and both dirty-worktree choices. Preserve current parent-branch Git behavior for shared/local projects and the existing PR-scoped skill version bump.

**Step 2: Implement**

For synced Option A, push the existing artifact state before applying the fold-back, then push the fold-back as a second ref commit. For synced Option B, append the fold-back and perform one `oat project push --json`, capturing its SHA. Never run parent-branch `git add` for synced artifacts.

**Step 3: Verify**

Add contract coverage for both synced dirty branches and the retained non-synced Git path. Run `pnpm --filter @open-agent-toolkit/cli exec vitest run src/commands/init/tools/shared/review-skill-contracts.test.ts`, `pnpm oat:validate-skills`, `pnpm run check:skill-bumps`, `pnpm lint`, and `pnpm format`.

**Step 4: Commit**

```bash
git add .agents/skills/oat-brainstorm/SKILL.md packages/cli/src/commands/init/tools/shared/review-skill-contracts.test.ts
git commit -m "fix(p04-t14): persist dirty synced brainstorm fold-back"
```

---

### Task p04-t15: Commit promoted summary decisions on the parent branch (review)

**Files:**

- Modify: `.agents/skills/oat-project-summary/SKILL.md`
- Modify: `packages/cli/src/commands/init/tools/shared/review-skill-contracts.test.ts`

**Step 1: Understand**

Separate synced project-ref outputs from repository-wide decision records and the managed decision index. Account for ledger append, ledger deduplication, and unrelated pre-existing staged state; retain the existing PR-scoped skill version bump.

**Step 2: Implement**

Stage and commit only the exact newly created decision records and managed index on the parent branch. Combine them with the ledger commit when a ledger append exists; otherwise create a dedicated guarded parent commit. Verify the committed paths, record the durable commit, preserve unrelated staged state, and push the synced summary separately.

**Step 3: Verify**

Add a synced summary contract or dogfood case that creates a genuinely new decision with no ledger append, and cover preservation of unrelated staged state. Run the focused contract suite, `pnpm oat:validate-skills`, `pnpm run check:skill-bumps`, `pnpm lint`, and `pnpm format`.

**Step 4: Commit**

```bash
git add .agents/skills/oat-project-summary/SKILL.md packages/cli/src/commands/init/tools/shared/review-skill-contracts.test.ts
git commit -m "fix(p04-t15): commit synced summary decisions durably"
```

---

### Task p04-t16: Make synced retro target application transactional (review)

**Files:**

- Modify: `.agents/skills/oat-project-retro/references/apply-procedure.md`
- Modify: `packages/cli/src/commands/init/tools/shared/review-skill-contracts.test.ts`
- Modify: `packages/cli/src/validation/synced-bookkeeping-sites.json` (update only the mechanically changed retro push anchor)

**Step 1: Understand**

Map the repository target commit, retro-artifact writeback, `Applied-ref`, and interruption states for synced projects. Preserve the shared/local single-commit route and the existing PR-scoped skill version bump.

**Step 2: Implement**

For synced projects, format and verify the exact repository targets, commit those paths on the parent branch first, and capture that commit plus target paths as `Applied-ref`. Then write back and push the retro artifact in a separate ref commit. Define recovery for interruption before the parent commit, between the two commits, and after both commits.

Update the existing validator inventory entry to match the new JSON-capturing retro push command; do not expand or otherwise restructure the inventory.

**Step 3: Verify**

Add contract cases for ordinary docs and decision-record targets under a synced project, including the two-commit ordering and recovery markers. Run the focused contract suite, `pnpm oat:validate-skills`, `pnpm run check:skill-bumps`, `pnpm lint`, and `pnpm format`.

**Step 4: Commit**

```bash
git add .agents/skills/oat-project-retro/references/apply-procedure.md packages/cli/src/commands/init/tools/shared/review-skill-contracts.test.ts packages/cli/src/validation/synced-bookkeeping-sites.json
git commit -m "fix(p04-t16): commit synced retro targets before writeback"
```

---

## Phase 5: Final review fixes

Close every finding from the final project review before completion, migration,
archive, or PR publication. Keep all existing PR-scoped skill and package
version bumps unchanged; changed canonical skills were already bumped once in
this PR.

### Task p05-t01: (review) Support non-archive synced completion

**Files:**

- Modify: `.agents/skills/oat-project-complete/SKILL.md`
- Modify: `packages/cli/src/commands/init/tools/shared/review-skill-contracts.test.ts`
- Modify: `apps/oat-docs/docs/reference/oat-directory-structure.md`
- Modify: `apps/oat-docs/docs/workflows/projects/lifecycle.md`
- Modify: `apps/oat-docs/docs/workflows/projects/picking-up-projects.md`
- Modify: `.cursor/skills/oat-project-complete/SKILL.md` and `.oat/sync/manifest.json` through `oat sync --scope all`

**Step 1: Understand the issue**

Review finding C1: valid synced completion with `workflow.archiveOnComplete=false` or an interactive archive decline skips the only archive-owned `LIFECYCLE_COMMIT`, later requires it, and leaves the discovery record active. Trace no-recap and selected-recap variants without assuming archive exports or parentage.

**Step 2: Implement fix**

Define an explicit non-archive synced transaction that finalizes and pushes the project ref, marks and exact-path commits the discovery record, and finalizes an optional recap against the correct ref/parent receipts. Preserve archive behavior, ref retention, retry safety, and unrelated staged state. Align docs that currently claim completion always archives. Do not bump the skill version again.

**Step 3: Verify**

Add executable contract cases for configured and interactive archive decline, each with and without a selected recap, proving completion, record status, exact commit containment, ref retention, and recovery. Run the focused contract suite, packaged completion integration tests, skill validation/bump checks, docs checks/build, provider drift check, lint, format, and diff-check.

**Step 4: Commit**

```bash
git add .agents/skills/oat-project-complete/SKILL.md .cursor/skills/oat-project-complete/SKILL.md .oat/sync/manifest.json packages/cli/src/commands/init/tools/shared/review-skill-contracts.test.ts apps/oat-docs/docs/reference/oat-directory-structure.md apps/oat-docs/docs/workflows/projects/lifecycle.md apps/oat-docs/docs/workflows/projects/picking-up-projects.md
git commit -m "fix(p05-t01): support non-archive synced completion"
```

---

### Task p05-t02: (review) Confine migration sources and reject symlinks

**Files:**

- Modify: `packages/cli/src/commands/project/migrate/index.ts`
- Modify: `packages/cli/src/commands/project/sync/ref-sync.ts`
- Modify: `packages/cli/src/commands/project/migrate/index.test.ts`

**Step 1: Understand the issue**

Review finding C2: lexical direct-child validation accepts a tracked project-root symlink, and recursive copy can publish external files while silently omitting nested symlinks.

**Step 2: Implement fix**

Before any ref, worktree, record, push, or source mutation, require an actual directory root via `lstat`, canonicalize the source and configured shared root, and require the canonical source to remain the expected direct child. Fail closed on root and nested symlinks with a clear recovery-safe error; do not silently omit entries.

**Step 3: Verify**

Add real-filesystem tests for an external root symlink and nested symlinks. Assert no ref, worktree, record, push, configuration change, or source mutation occurs. Run the focused migration/ref-sync suites, CLI type-check, scoped lint/format, and diff-check.

**Step 4: Commit**

```bash
git add packages/cli/src/commands/project/migrate/index.ts packages/cli/src/commands/project/sync/ref-sync.ts packages/cli/src/commands/project/migrate/index.test.ts
git commit -m "fix(p05-t02): confine migration sources"
```

---

### Task p05-t03: (review) Restrict prune to canonical OAT checkouts

**Files:**

- Modify: `packages/cli/src/commands/project/sync/ref-sync.ts`
- Modify: `packages/cli/src/commands/project/prune/index.test.ts`

**Step 1: Understand the issue**

Review finding C3: forced prune trusts any registered worktree whose suffix is `/synced/<slug>` and derives the trust root from the candidate itself.

**Step 2: Implement fix**

Derive allowed synced checkout paths only from registered parent worktree roots plus the configured scope-relative synced root, canonicalize them, and match exact paths. Never derive the trusted root from a removal candidate.

**Step 3: Verify**

Add real-Git tests with an unrelated registered worktree ending in `/synced/<slug>` and prove normal and forced prune leave it registered and intact while canonical OAT checkouts still prune correctly. Run focused prune/ref-sync suites, CLI type-check, scoped lint/format, and diff-check.

**Step 4: Commit**

```bash
git add packages/cli/src/commands/project/sync/ref-sync.ts packages/cli/src/commands/project/prune/index.test.ts
git commit -m "fix(p05-t03): restrict prune to canonical checkouts"
```

---

### Task p05-t04: (review) Complete migration rollback after cleanup failures

**Files:**

- Modify: `packages/cli/src/commands/project/sync/ref-sync.ts`
- Modify: `packages/cli/src/commands/project/migrate/index.test.ts`

**Step 1: Understand the issue**

Review finding I1: a failed remote-ref deletion exits migration rollback before local worktree/ref cleanup and configuration restoration.

**Step 2: Implement fix**

Run independent compensation steps with best-effort aggregation so local checkout/ref and config restoration always execute. Preserve the original failure and report every retained resource with exact recovery commands, including a remote ref that could not be deleted.

**Step 3: Verify**

Inject remote-delete failure and prove local compensation completes, retained resources are reported precisely, and retry behavior is deterministic. Run focused migration/ref-sync suites, CLI type-check, scoped lint/format, and diff-check.

**Step 4: Commit**

```bash
git add packages/cli/src/commands/project/sync/ref-sync.ts packages/cli/src/commands/project/migrate/index.test.ts
git commit -m "fix(p05-t04): finish migration rollback compensation"
```

---

### Task p05-t05: (review) Recover adoption record commits idempotently

**Files:**

- Modify: `packages/cli/src/commands/project/sync/resolve-target.ts`
- Modify: `packages/cli/src/commands/project/sync/ref-sync.ts`
- Modify: `packages/cli/src/commands/project/pull/index.ts`
- Modify: `packages/cli/src/commands/project/open/index.ts`
- Modify: `packages/cli/src/commands/project/pull/index.test.ts`
- Modify: `packages/cli/src/commands/project/open/index.test.ts`
- Modify: `packages/cli/src/commands/project/sync/resolve-target.test.ts`
- Modify: `packages/cli/src/commands/project/sync/ref-sync.test.ts`

**Step 1: Understand the issue**

Review finding I2: after the first adoption record commit fails, retry sees the record, disables adoption, and can report pull/open success without making the record durable.

**Step 2: Implement fix**

Make the adoption transaction classify record ownership and durability. Roll back only records created by the failed invocation or return an existing uncommitted/untracked record as pending until its exact-path commit succeeds. Preserve explicit `--no-commit`, unrelated staged state, and already-durable records.

**Step 3: Verify**

Add real-Git retry tests for both `project pull` and `project open` with a first commit failure, plus `--no-commit` and unrelated-state coverage. Run focused pull/open/resolve-target/ref-sync suites, CLI type-check, scoped lint/format, and diff-check.

**Step 4: Commit**

```bash
git add packages/cli/src/commands/project/sync/resolve-target.ts packages/cli/src/commands/project/sync/ref-sync.ts packages/cli/src/commands/project/pull packages/cli/src/commands/project/open
git commit -m "fix(p05-t05): recover adoption record commits"
```

---

### Task p05-t06: (review) Validate bookkeeping guard semantics per site

**Files:**

- Modify: `packages/cli/src/validation/skills.ts`
- Modify: `packages/cli/src/validation/synced-bookkeeping-sites.json`
- Modify: `packages/cli/src/validation/skills.test.ts`

**Step 1: Understand the issue**

Review finding M1: inventory validation proves only anchor presence and exempts an entire file after one listed write, so guards can disappear or new writers can bypass completeness undetected.

**Step 2: Implement fix**

Represent and validate kind-specific companion guard evidence in the same function or fenced block as each inventoried site. Make completeness site-based rather than file-based while preserving deterministic diagnostics and the current canonical inventory.

**Step 3: Verify**

Add mutations that keep a listed anchor while removing its fail-closed guard and that add a second unlisted writer to an already inventoried file. Run `skills.test.ts`, `pnpm oat:validate-skills`, `pnpm run check:skill-bumps`, CLI type-check, scoped lint/format, and diff-check.

**Step 4: Commit**

```bash
git add packages/cli/src/validation/skills.ts packages/cli/src/validation/synced-bookkeeping-sites.json packages/cli/src/validation/skills.test.ts
git commit -m "fix(p05-t06): validate bookkeeping guards per site"
```

---

### Task p05-t07: (review) Add a test-support import alias

**Files:**

- Modify: `packages/cli/tsconfig.json`
- Modify: `packages/cli/src/commands/project/archive/archive-utils.test.ts`
- Modify: `packages/cli/src/commands/project/links/index.test.ts`
- Modify: `packages/cli/src/commands/project/list.integration.test.ts`
- Modify: `packages/cli/src/commands/project/migrate/index.test.ts`
- Modify: `packages/cli/src/commands/project/new/scaffold.test.ts`
- Modify: `packages/cli/src/commands/project/open/index.test.ts`
- Modify: `packages/cli/src/commands/project/prune/index.test.ts`
- Modify: `packages/cli/src/commands/project/pull/index.test.ts`
- Modify: `packages/cli/src/commands/project/push/index.test.ts`
- Modify: `packages/cli/src/commands/project/split/__tests__/integration/split-flow.test.ts`
- Modify: `packages/cli/src/commands/project/sync/ref-sync.test.ts`
- Modify: `packages/cli/src/commands/project/sync/resolve-target.test.ts`
- Modify: `packages/cli/src/e2e/workflow.test.ts`

**Step 1: Understand the issue**

Review finding m1: changed tests use `@shared/../__tests__/synced-fixture`, violating the explicit no-alias-traversal import convention.

**Step 2: Implement fix**

Add a dedicated TypeScript test-support alias for `src/__tests__` and mechanically replace every synced fixture traversal import. Do not change test behavior or broaden production aliases.

**Step 3: Verify**

Use `rg` to prove no `@shared/../__tests__/synced-fixture` imports remain. Run the affected synced fixture suites, CLI type-check, scoped lint/format, and diff-check.

**Step 4: Commit**

```bash
git add packages/cli/tsconfig.json packages/cli/src
git commit -m "refactor(p05-t07): add synced test fixture alias"
```

---

## Phase 6: Final re-review fixes

Close every finding from final review cycle 2 before completion, migration,
archive, or PR publication. Preserve the existing final-PR skill and public
package version bumps; no finding is deferred.

### Task p06-t01: (review) Publish every late completion artifact

**Files:**

- Modify: `.agents/skills/oat-project-complete/SKILL.md`
- Modify: `packages/cli/src/commands/init/tools/shared/review-skill-contracts.test.ts`
- Sync managed provider views with `oat sync --scope all`

**Step 1: Understand the issue**

Review finding C1: non-archive synced completion captures its final project-ref
receipt before Step 7 can create the PR-description artifact. With no recap the
artifact remains local-only; with a recap an extra artifact commit can violate
the required evidence-commit parent and receipt identity.

**Step 2: Implement fix**

Move or repeat the final project-ref publication after every pre-recap project
artifact write, then use that exact receipt as `PROJECT_REF_COMMIT`. Preserve
the exact parent-branch record commit, retained ref, retry semantics, and recap
evidence commit as the immediate child of the final artifact receipt.

**Step 3: Verify**

Add executable contract coverage for an initially absent PR artifact with recap
selected and declined, including configured and interactive archive-decline
paths. Prove the retained ref contains every artifact and receipt/parent order
is exact. Run the focused skill contracts, validation/bump checks, provider
drift checks, lint, format, and diff-check.

**Step 4: Commit**

```bash
git add .agents/skills/oat-project-complete packages/cli/src/commands/init/tools/shared/review-skill-contracts.test.ts
git commit -m "fix(p06-t01): publish late completion artifacts"
```

---

### Task p06-t02: (review) Reject ignored untracked adoption records

**Files:**

- Modify: `packages/cli/src/commands/project/sync/ref-sync.ts`
- Modify: `packages/cli/src/commands/project/sync/ref-sync.test.ts`
- Modify: `packages/cli/src/commands/project/pull/index.test.ts`
- Modify: `packages/cli/src/commands/project/open/index.test.ts`

**Step 1: Understand the issue**

Review finding I2: an ignored untracked discovery record is readable but absent
from ordinary status output, so retry can misclassify it as durable after the
first exact-path add/commit fails.

**Step 2: Implement fix**

Require exact tracked/index or HEAD proof plus clean state before classifying an
adoption record as durable. Treat ignored untracked records as pending or fail
with an explicit exact-path recovery diagnostic; preserve `--no-commit`,
ownership, unrelated staged state, and already-durable behavior.

**Step 3: Verify**

Add real-Git pull and open retries with an ignored untracked record and prove no
success is reported until the exact record becomes durable. Run the focused
pull/open/ref-sync suites, CLI type-check, scoped lint/format, and diff-check.

**Step 4: Commit**

```bash
git add packages/cli/src/commands/project/sync/ref-sync.ts packages/cli/src/commands/project/sync/ref-sync.test.ts packages/cli/src/commands/project/pull/index.test.ts packages/cli/src/commands/project/open/index.test.ts
git commit -m "fix(p06-t02): verify adoption record durability"
```

---

### Task p06-t03: (review) Repair managed workflow files for current packs

**Files:**

- Modify: `packages/cli/src/commands/tools/update/index.ts`
- Modify: `packages/cli/src/commands/tools/update/config-write.test.ts`
- Modify: `packages/cli/src/commands/tools/update/update-tools.test.ts` or the closest default-dependency integration suite

**Step 1: Understand the issue**

Review finding M1: after the upstream pack-reconciliation merge, an already
current workflows pack can yield an empty reconcile plan and bypass the
existing managed `.gitignore` and `.gitattributes` repair predicate.

**Step 2: Implement fix**

Drive managed Git-file repair from the requested project-scoped workflows
target or its reconcile plan, not only the updated/current/newer tool arrays.
Preserve dry-run, scope isolation, and legacy dependency behavior.

**Step 3: Verify**

Add a default-dependency current-pack integration case proving both managed
file apply functions run when reconciliation has no content operations. Run
the focused update/reconciliation suites, CLI type-check, scoped lint/format,
and diff-check.

**Step 4: Commit**

```bash
git add packages/cli/src/commands/tools/update/index.ts packages/cli/src/commands/tools/update/config-write.test.ts packages/cli/src/commands/tools/update/update-tools.test.ts
git commit -m "fix(p06-t03): repair current workflow pack files"
```

---

## Phase 7: Operator-extended final receipt fix

Close the one Critical finding from final review cycle 3 under the user's
explicit one-cycle override. Do not expand this phase beyond the non-archive
completion receipt transaction. Preserve the existing PR-scoped skill and
public-package version bumps; do not bump either again.

### Task p07-t01: (review) Publish the final non-archive PR artifact before its receipt

**Files:**

- Modify: `.agents/skills/oat-project-complete/SKILL.md`
- Modify: `packages/cli/src/commands/init/tools/shared/review-skill-contracts.test.ts`
- Create or modify: the closest repository-backed completion transaction test harness
- Modify: `.oat/sync/manifest.json` only as required by canonical skill synchronization

**Step 1: Understand the issue**

Review finding C1: Step 7.5 captures `PROJECT_REF_COMMIT`, but Step 8.6 then
rewrites the non-archive PR-description artifact. With no selected recap the
final body remains unpublished; with a recap, publishing it can create an
extra artifact commit that breaks the required evidence-commit parent and
receipt identity.

**Step 2: Implement fix**

For non-archive synced completion, separate any preliminary pin-source receipt
from the final artifact receipt. Render the final links block before the push
whose exact SHA becomes `PROJECT_REF_COMMIT`, then require recap evidence to be
its immediate child. Preserve the exact parent-branch record commit, retained
custom ref, unrelated staged state, retry idempotence, and archive behavior.
Do not add a second `oat-project-complete` skill-version bump or a second
lockstep public-package version bump; both PR-scoped bumps already exist.

**Step 3: Verify**

Add executable repository-backed coverage for configured and interactive
archive decline, each with recap selected and declined. Prove the retained ref
is clean and contains the final PR artifact; in recap cases prove the pushed
receipt equals the exact evidence commit and that its immediate parent is the
final artifact receipt. Keep the textual contract test as a supplemental
ordering guard that explicitly includes Step 8.6. Run the focused transaction
and contract suites, skill validation and bump checks, project provider-sync
dry-run/status, scoped lint/format, and `git diff --check`.

**Step 4: Commit**

```bash
git add .agents/skills/oat-project-complete/SKILL.md .oat/sync/manifest.json packages/cli/src/commands/init/tools/shared/review-skill-contracts.test.ts <repository-backed-test-files>
git commit -m "fix(p07-t01): finalize non-archive artifact receipt"
```

---

## Phase 8: Second operator-extended recap retry fix

Close the one Critical finding from final review cycle 4 under the user's
second explicit one-cycle override. Keep this phase bounded to recap-stage
receipt recovery and executable interruption/decision coverage. Preserve the
existing PR-scoped skill and public-package version bumps; do not bump either
again.

### Task p08-t01: (review) Recover exact recap receipts across completion retries

**Files:**

- Modify: `.agents/skills/oat-project-complete/SKILL.md`
- Modify: `packages/cli/src/commands/init/tools/shared/review-skill-contracts.test.ts`
- Modify: `packages/cli/src/commands/project/push/completion-transaction.test.ts`
- Create or modify: the closest production completion-receipt recovery surface invoked by the skill, if a reusable executable surface is needed
- Modify: `.oat/sync/manifest.json` only as required by canonical skill synchronization

**Step 1: Understand the issue**

Review finding C1: Step 7.5 recognizes only a clean retained ref whose `HEAD`
is the final-artifact receipt. After recap evidence is committed or published,
`HEAD` is instead the evidence commit, so completion cannot reuse the exact
pin/final/evidence chain. The current real-Git test masks this by implementing
the missing parent unwrap in a test helper, and its configured/interactive
decision value changes only the test title.

**Step 2: Implement fix**

Add production completion recovery that recognizes both final-artifact `HEAD`
and exact recap-evidence `HEAD`. Validate commit subjects, exact changed paths,
parent ordering, the single links block, local/remote state, and the retained
ref before restoring `PROJECT_LINKS_PIN_COMMIT`, `PROJECT_REF_COMMIT`, and any
existing evidence receipt. When the exact evidence commit exists locally but
not remotely, publish that commit rather than rewriting the receipt chain.
Preserve parent-record confinement, unrelated staged state, archive behavior,
and failure-closed handling for partial or contradictory state. Do not add a
second skill-version or lockstep public-package version bump.

**Step 3: Verify**

Make the repository-backed tests exercise the production recovery surface at
interruptions after final-artifact push, after parent-record commit, after
evidence commit before push, and after evidence push. Route configured and
interactive archive decisions through actual decision handling or stop
claiming them as distinct executable cases. Prove retries preserve the exact
pin/final/evidence SHAs, retained-ref cleanliness, single final links block,
record confinement, and unrelated staged state. Run the focused transaction,
contract, archive, and skill-validation suites; project provider-sync
dry-run/status; scoped lint/format; `git diff --check`; then the complete
Definition of Done sequence in CI order.

**Step 4: Commit**

```bash
git add .agents/skills/oat-project-complete/SKILL.md .oat/sync/manifest.json packages/cli/src/commands/init/tools/shared/review-skill-contracts.test.ts packages/cli/src/commands/project/push/completion-transaction.test.ts <production-recovery-files>
git commit -m "fix(p08-t01): recover recap completion receipts"
```

---

## Phase 9: Third operator-extended exact-link and decision-entrypoint fix

Close the Critical and Important findings from final review cycle 5 under the
user's third explicit additional one-cycle override. Keep this phase bounded to
exact final-links validation and executable archive-decision CLI coverage.
Preserve the existing PR-scoped skill and public-package version bumps; do not
bump either again.

### Task p09-t01: (review) Enforce exact recovered links and CLI decision coverage

**Files:**

- Modify: `.agents/skills/oat-project-complete/scripts/recover-completion-receipts.mjs`
- Modify: `packages/cli/src/commands/project/push/completion-transaction.test.ts`
- Modify: `.agents/skills/oat-project-complete/SKILL.md` only if the executable contract needs clarification
- Modify: `packages/cli/src/commands/init/tools/shared/review-skill-contracts.test.ts` only if the textual contract changes

**Step 1: Add failing executable coverage**

Add real-Git negative cases that preserve the expected seven-character label
while contaminating the final links block with (a) another retained project ref
and (b) a different full blob-link SHA. Prove recovery fails closed before
restoring receipts. Update every configured and interactive interruption row to
execute the same Node CLI decision entrypoint and flag shape used by the skill,
parse its JSON result, and drive/assert the returned `shouldArchive` and
`source`. Preserve both decision sources and all four interruption points.

**Step 2: Implement the bounded repair**

Pass the requested retained ref into final-links validation. Require exactly
one canonical links header naming that ref and the short pin-source SHA, and
require every commit-pinned blob link in the block to use the full
`PROJECT_LINKS_PIN_COMMIT` SHA. Reject missing, mismatched, malformed, or mixed
ref/SHA state. Keep all existing clean-checkout, path, subject, parent,
local/remote, unpublished-evidence, and post-push revalidation guarantees.
Do not rerender or rewrite a valid receipt chain.

**Step 3: Verify**

Run the focused completion transaction, skill-contract, archive-command, and
archive-utility suites; direct configured/interactive CLI probes; skill tests
and validation; skill-bump checks; project provider-sync dry-run/status; scoped
lint/format; and `git diff --check`. Then run the complete Definition of Done
sequence in CI order, including a fresh `git fetch origin main` before
`pnpm release:check-versions`.

**Step 4: Commit**

```bash
git add .agents/skills/oat-project-complete/scripts/recover-completion-receipts.mjs packages/cli/src/commands/project/push/completion-transaction.test.ts .agents/skills/oat-project-complete/SKILL.md packages/cli/src/commands/init/tools/shared/review-skill-contracts.test.ts
git commit -m "fix(p09-t01): harden completion receipt link validation"
```

---

## Phase 10: Configured exit-gate remediation

Resolve every finding from configured implementation exit-gate run
`c0eed430-e033-45d7-9195-35fcacd8cb9f`. The blocking gate receive path is
autonomous, so all three Important, five Medium, and five in-scope Minor
findings are converted into 14 ordered tasks with no deferrals; the final
compound Minor is split across unrelated persistence and arrival concerns. Preserve the
existing PR-scoped skill and lockstep package version bumps; do not bump either
again merely because these same shipped surfaces are edited during remediation.

### Task p10-t01: (review) Exclude synced discovery records from doctor leak failures

**Files:**

- Modify: `packages/cli/src/commands/doctor/synced-projects.ts`
- Modify: `packages/cli/src/commands/doctor/synced-projects.test.ts`

**Step 1: Understand the issue**

Gate finding I1: the tracked-artifact probe treats the required top-level
`.oat/projects/synced/<slug>.json` discovery record as leaked checkout content,
causing `oat doctor --scope project` to fail and suggesting a destructive
untracking repair.

**Step 2: Implement fix**

Restrict leak detection to paths below synced checkout directories while
preserving top-level discovery records. Add a real-Git positive-control test
with a committed record plus existing leak-negative cases.

**Step 3: Verify**

Run: `pnpm --filter @open-agent-toolkit/cli exec vitest run src/commands/doctor/synced-projects.test.ts`

Expected: a committed discovery record passes; tracked checkout artifacts still fail.

**Step 4: Commit**

```bash
git add packages/cli/src/commands/doctor/synced-projects.ts packages/cli/src/commands/doctor/synced-projects.test.ts
git commit -m "fix(p10-t01): preserve synced discovery records in doctor"
```

### Task p10-t02: (review) Render durable summary paths repository-relative

**Files:**

- Modify: `packages/cli/src/commands/project/archive/archive-utils.ts`
- Modify: `packages/cli/src/commands/project/archive/archive-utils.test.ts`
- Modify: `packages/cli/src/commands/project/links/index.ts`
- Modify: `packages/cli/src/commands/project/links/index.test.ts`
- Modify: `.agents/skills/oat-project-complete/SKILL.md`
- Modify: `packages/cli/src/commands/project/push/completion-transaction.test.ts`

**Step 1: Understand the issue**

Gate finding I2: completion forwards the archive report's absolute
`summaryExportFile` into the PR links renderer, exposing a machine-local home
path instead of the FR7 repository-relative durable summary path.

**Step 2: Implement fix**

Normalize at the `oat project links` boundary: accept an absolute durable
summary only when it is contained under the repository, render its
repository-relative path, and reject escapes. Preserve the archive report's
absolute filesystem contract. Cover absolute input and a configured summary
export path; assert the rendered PR block contains no absolute prefix.

**Step 3: Verify**

Run: `pnpm --filter @open-agent-toolkit/cli exec vitest run src/commands/project/links/index.test.ts src/commands/project/archive/archive-utils.test.ts src/commands/project/push/completion-transaction.test.ts`

Expected: durable-summary output is repository-relative in every lane.

**Step 4: Commit**

```bash
git add packages/cli/src/commands/project/archive/archive-utils.ts packages/cli/src/commands/project/archive/archive-utils.test.ts packages/cli/src/commands/project/links/index.ts packages/cli/src/commands/project/links/index.test.ts .agents/skills/oat-project-complete/SKILL.md packages/cli/src/commands/project/push/completion-transaction.test.ts
git commit -m "fix(p10-t02): normalize durable summary paths"
```

### Task p10-t03: (review) Make non-archive completion retry reach receipt recovery

**Files:**

- Modify: `.agents/skills/oat-project-complete/SKILL.md`
- Modify: `.agents/skills/oat-project-complete/scripts/recover-completion-receipts.mjs`
- Modify: `packages/cli/src/commands/project/complete-state/index.ts`
- Modify: `packages/cli/src/commands/project/push/completion-transaction.test.ts`
- Modify: `packages/cli/src/commands/init/tools/shared/review-skill-contracts.test.ts`

**Step 1: Understand the issue**

Gate finding I3: a retry performs project-log and `complete-state` mutations
before receipt recovery, so the recovery script always sees a dirty checkout
and the tested p07-p09 interruption surface is unreachable from the real skill.

**Step 2: Implement fix**

Detect and enter recognizable receipt recovery before the project-log and
`complete-state` lifecycle mutations, then exercise the real ordered skill flow
after every interruption point. Preserve clean-checkout, exact-receipt, and
fail-closed reconciliation guarantees.

**Step 3: Verify**

Run: `pnpm --filter @open-agent-toolkit/cli exec vitest run src/commands/project/push/completion-transaction.test.ts src/commands/init/tools/shared/review-skill-contracts.test.ts`

Expected: real non-archive retries reach and validate receipt recovery without bypassing dirty-worktree protection.

**Step 4: Commit**

```bash
git add .agents/skills/oat-project-complete/SKILL.md .agents/skills/oat-project-complete/scripts/recover-completion-receipts.mjs packages/cli/src/commands/project/complete-state/index.ts packages/cli/src/commands/project/push/completion-transaction.test.ts packages/cli/src/commands/init/tools/shared/review-skill-contracts.test.ts
git commit -m "fix(p10-t03): make completion retries idempotent"
```

### Task p10-t04: (review) Probe absent synced checkouts with directory semantics

**Files:**

- Modify: `packages/cli/src/commands/doctor/synced-projects.ts`
- Modify: `packages/cli/src/commands/doctor/synced-projects.test.ts`

**Step 1: Understand the issue**

Gate finding M1: doctor probes a nonexistent checkout path without a trailing
slash or `--no-index`, so the correct directory-only ignore rule is reported as
missing whenever the checkout has not been pulled.

**Step 2: Implement fix**

Reuse the canonical directory probe semantics from `isSyncedRuleApplied` and
add a real-Git absent-checkout regression test.

**Step 3: Verify**

Run: `pnpm --filter @open-agent-toolkit/cli exec vitest run src/commands/doctor/synced-projects.test.ts`

Expected: an absent checkout with the managed ignore block produces no false gitignore warning.

**Step 4: Commit**

```bash
git add packages/cli/src/commands/doctor/synced-projects.ts packages/cli/src/commands/doctor/synced-projects.test.ts
git commit -m "fix(p10-t04): use directory probes in synced doctor"
```

### Task p10-t05: (review) Prevent duplicate synced gitignore rules

**Files:**

- Modify: `packages/cli/src/commands/project/new/scaffold.ts`
- Modify: `packages/cli/src/commands/project/new/scaffold.test.ts`
- Modify: `.gitignore`

**Step 1: Understand the issue**

Gate finding M2: scaffold self-heal compares two different rule spellings and
appends an unmanaged duplicate after applying the managed core block.

**Step 2: Implement fix**

Re-probe ignore behavior after applying the core block and append a
root-specific rule only when still required. Remove this repository's stray
duplicate and add an exact-one-rule regression test.

**Step 3: Verify**

Run: `pnpm --filter @open-agent-toolkit/cli exec vitest run src/commands/project/new/scaffold.test.ts`

Expected: the default synced rule appears exactly once inside the managed block.

**Step 4: Commit**

```bash
git add packages/cli/src/commands/project/new/scaffold.ts packages/cli/src/commands/project/new/scaffold.test.ts .gitignore
git commit -m "fix(p10-t05): deduplicate synced gitignore setup"
```

### Task p10-t06: (review) Validate every synced push receipt before publication bookkeeping

**Files:**

- Modify: `.agents/skills/oat-brainstorm/SKILL.md`
- Modify: `.agents/skills/oat-project-summary/SKILL.md`
- Modify: `.agents/skills/oat-project-retro/references/apply-procedure.md`
- Modify: `.agents/skills/oat-project-retro-file/SKILL.md`
- Modify: `packages/cli/src/validation/skills.ts`
- Modify: `packages/cli/src/validation/skills.test.ts`

**Step 1: Understand the issue**

Gate finding M3: ten command substitutions consume `.sha` without requiring a
successful `pushed` or `up-to-date` status, so conflicted or rejected pushes can
be recorded as published.

**Step 2: Implement fix**

Apply one fail-closed receipt parser shape at every identified site, surface the
CLI recovery instruction for non-success status, and add a validator rule that
prevents status-blind push receipts from returning.

**Step 3: Verify**

Run: `pnpm --filter @open-agent-toolkit/cli exec vitest run src/validation/skills.test.ts && pnpm oat:validate-skills`

Expected: only `pushed` and `up-to-date` receipts supply a publication SHA.

**Step 4: Commit**

```bash
git add .agents/skills/oat-brainstorm/SKILL.md .agents/skills/oat-project-summary/SKILL.md .agents/skills/oat-project-retro/references/apply-procedure.md .agents/skills/oat-project-retro-file/SKILL.md packages/cli/src/validation/skills.ts packages/cli/src/validation/skills.test.ts
git commit -m "fix(p10-t06): validate synced push receipts"
```

### Task p10-t07: (review) Align non-archive completion PR synchronization

**Files:**

- Modify: `.agents/skills/oat-project-complete/SKILL.md`
- Modify: `packages/cli/src/commands/init/tools/shared/review-skill-contracts.test.ts`
- Modify: `packages/cli/src/commands/project/push/completion-transaction.test.ts`

**Step 1: Understand the issue**

Gate finding M4: Step 8.6 promises a final artifact-body PR sync that Step 11.5
explicitly skips in the non-archive lane, leaving artifact and PR pin semantics
inconsistent.

**Step 2: Implement fix**

Extend Step 11.5 to synchronize the validated final artifact body for the
non-archive/open-PR lane so the artifact and GitHub body share the chosen pin.
Make skill prose and executable tests assert that same behavior.

**Step 3: Verify**

Run: `pnpm --filter @open-agent-toolkit/cli exec vitest run src/commands/init/tools/shared/review-skill-contracts.test.ts src/commands/project/push/completion-transaction.test.ts`

Expected: non-archive PR-body synchronization has one consistent owner and pin.

**Step 4: Commit**

```bash
git add .agents/skills/oat-project-complete/SKILL.md packages/cli/src/commands/init/tools/shared/review-skill-contracts.test.ts packages/cli/src/commands/project/push/completion-transaction.test.ts
git commit -m "fix(p10-t07): align non-archive PR synchronization"
```

### Task p10-t08: (review) Confine completion evidence commits and align ownership design

**Files:**

- Modify: `.agents/skills/oat-project-complete/SKILL.md`
- Modify: `packages/cli/src/commands/init/tools/shared/review-skill-contracts.test.ts`
- Modify: `.oat/projects/shared/synced-project-scope/design.md`

**Step 1: Understand the issue**

Gate finding M5: the recap-evidence commit can sweep unrelated pre-staged
content, while the skill-owned evidence and record commits diverge from the
design's CLI-only parent-index ownership statement.

**Step 2: Implement fix**

Constrain the evidence commit to its exact two paths (or route it through an
equivalent CLI surface), prove unrelated staged content cannot leak, and align
the design with the accepted, path-confined skill-owned completion transitions.
This task is the explicit artifact-alignment disposition for the design drift.

**Step 3: Verify**

Run: `pnpm --filter @open-agent-toolkit/cli exec vitest run src/commands/init/tools/shared/review-skill-contracts.test.ts && git diff --check`

Expected: completion commits cannot capture unrelated index state and the design names their bounded ownership.

**Step 4: Commit**

```bash
git add .agents/skills/oat-project-complete/SKILL.md packages/cli/src/commands/init/tools/shared/review-skill-contracts.test.ts .oat/projects/shared/synced-project-scope/design.md
git commit -m "fix(p10-t08): confine completion evidence commits"
```

### Task p10-t09: (review) Align CLI reference with shipped project commands

**Files:**

- Modify: `apps/oat-docs/docs/reference/cli-reference.md`
- Modify: `apps/oat-docs/docs/reference/file-locations.md`

**Step 1: Understand the issue**

Gate finding m1: the CLI reference omits new `--no-commit` flags, misstates
prune argument and durable-summary behavior, and does not document non-GitHub
degradation or the managed `.gitattributes` block.

**Step 2: Implement fix**

Align the reference with command definitions and add concise behavior notes for
non-GitHub origins and managed attributes.

**Step 3: Verify**

Run: `pnpm check && pnpm build:docs`

Expected: markdown lint and docs build pass with the reference matching CLI help.

**Step 4: Commit**

```bash
git add apps/oat-docs/docs/reference/cli-reference.md apps/oat-docs/docs/reference/file-locations.md
git commit -m "docs(p10-t09): align project CLI reference"
```

### Task p10-t10: (review) Restore conventional import placement in push

**Files:**

- Modify: `packages/cli/src/commands/project/push/index.ts`

**Step 1: Understand the issue**

Gate finding m2: two imports appear after the exported function, which is legal
ESM but inconsistent and easy to miss during maintenance.

**Step 2: Implement fix**

Move the imports into the module's top import block without behavior changes.

**Step 3: Verify**

Run: `pnpm --filter @open-agent-toolkit/cli exec vitest run src/commands/project/push/index.test.ts && pnpm --filter @open-agent-toolkit/cli check`

Expected: lint and type-check pass with imports grouped conventionally.

**Step 4: Commit**

```bash
git add packages/cli/src/commands/project/push/index.ts
git commit -m "refactor(p10-t10): normalize push imports"
```

### Task p10-t11: (review) Correct absent-checkout archive recovery guidance

**Files:**

- Modify: `packages/cli/src/commands/project/archive/archive-utils.ts`
- Modify: `packages/cli/src/commands/project/archive/archive-utils.test.ts`

**Step 1: Understand the issue**

Gate finding m3: archive preflight tells an operator with an absent active
checkout to run `push`, although the correct recovery is `pull`.

**Step 2: Implement fix**

Branch the recovery message on absent status and add an exact-message test.

**Step 3: Verify**

Run: `pnpm --filter @open-agent-toolkit/cli exec vitest run src/commands/project/archive/archive-utils.test.ts`

Expected: absent active checkouts direct the operator to `oat project pull`.

**Step 4: Commit**

```bash
git add packages/cli/src/commands/project/archive/archive-utils.ts packages/cli/src/commands/project/archive/archive-utils.test.ts
git commit -m "fix(p10-t11): correct archive recovery guidance"
```

### Task p10-t12: (review) Bind completion receipts to project slug and repository

**Files:**

- Modify: `.agents/skills/oat-project-complete/scripts/recover-completion-receipts.mjs`
- Modify: `packages/cli/src/commands/project/push/completion-transaction.test.ts`

**Step 1: Understand the issue**

Gate finding m4: recovery captures but does not compare the links header slug,
and blob validation does not bind GitHub owner/repository, so another project's
or repository's block can satisfy the receipt.

**Step 2: Implement fix**

Require the canonical header slug and every blob repository identity to match
the target project/repository. Add wrong-slug, wrong-repository, and duplicate
block negative cases while preserving exact ref/SHA checks.

**Step 3: Verify**

Run: `pnpm --filter @open-agent-toolkit/cli exec vitest run src/commands/project/push/completion-transaction.test.ts`

Expected: cross-project and cross-repository receipts fail closed.

**Step 4: Commit**

```bash
git add .agents/skills/oat-project-complete/scripts/recover-completion-receipts.mjs packages/cli/src/commands/project/push/completion-transaction.test.ts
git commit -m "fix(p10-t12): bind completion receipts to project identity"
```

### Task p10-t13: (review) Refresh brainstorm invariants for synced persistence

**Files:**

- Modify: `.agents/skills/oat-brainstorm/SKILL.md`
- Modify: `packages/cli/src/validation/skills.test.ts`

**Step 1: Understand the issue**

The persistence half of gate finding m5: brainstorm still describes git-only
fold-back after synced push support.

**Step 2: Implement fix**

Update brainstorm invariants for shared/local versus synced bookkeeping and add
validator coverage for both persistence branches.

**Step 3: Verify**

Run: `pnpm --filter @open-agent-toolkit/cli exec vitest run src/validation/skills.test.ts && pnpm oat:validate-skills`

Expected: brainstorm's documented invariants cover both scope branches.

**Step 4: Commit**

```bash
git add .agents/skills/oat-brainstorm/SKILL.md packages/cli/src/validation/skills.test.ts
git commit -m "fix(p10-t13): align brainstorm synced persistence"
```

### Task p10-t14: (review) Make arrival scope failures non-blocking

**Files:**

- Modify: `.agents/skills/oat-project-progress/SKILL.md`
- Modify: `.agents/skills/oat-project-next/SKILL.md`
- Modify: `packages/cli/src/validation/skills.test.ts`

**Step 1: Understand the issue**

The arrival-control-flow half of gate finding m5: progress and next hard-exit
when `activeProject` names a stale archived path, contrary to the non-blocking
arrival guidance.

**Step 2: Implement fix**

Turn scope-resolution failure on arrival into a warning that skips synced pull
without aborting the skill, and cover both arrival sites in validator tests.

**Step 3: Verify**

Run: `pnpm --filter @open-agent-toolkit/cli exec vitest run src/validation/skills.test.ts && pnpm oat:validate-skills`

Expected: a stale archived active-project path remains a warning and routing continues.

**Step 4: Commit**

```bash
git add .agents/skills/oat-project-progress/SKILL.md .agents/skills/oat-project-next/SKILL.md packages/cli/src/validation/skills.test.ts
git commit -m "fix(p10-t14): soften arrival scope failures"
```

---

## Phase 11: Exit-gate remediation verification fixes

Close the one Medium and two Minor findings from the fresh final lifecycle
review after Phase 10. This bounded phase remains part of configured exit-gate
attempt 1 remediation; attempt 2 is still unlaunched and is the final allowed
configured attempt. Convert all findings with no deferrals and preserve the
existing PR-scoped skill and lockstep package version bumps.

### Task p11-t01: (review) Execute completion retry routing before lifecycle mutation

**Files:**

- Create: `.agents/skills/oat-project-complete/scripts/resolve-completion-retry.mjs`
- Modify: `.agents/skills/oat-project-complete/SKILL.md`
- Modify: `packages/cli/src/commands/project/push/completion-transaction.test.ts`
- Modify: `packages/cli/src/commands/init/tools/shared/review-skill-contracts.test.ts`

**Step 1: Understand the issue**

Final review finding M1: Phase 10 corrected the skill's textual order, but the
transaction matrix still invokes the recovery helper directly and manually
recreates later transitions. It does not execute the pre-mutation candidate
routing that must skip Steps 3.7-7 for recognized receipts.

**Step 2: Implement fix**

Extract the pre-mutation retry decision into a small executable, skill-owned
surface and make the skill consume it. Drive all eight configured/interactive
interruption rows through that exact surface. Prove recognized candidates run
recovery before any project-log, review-move, `complete-state`, active-pointer,
or PR-artifact mutation, while dirty, contradictory, and noncandidate states
remain fail-closed or continue through the normal lane as appropriate.

**Step 3: Verify**

Run: `pnpm --filter @open-agent-toolkit/cli exec vitest run src/commands/project/push/completion-transaction.test.ts src/commands/init/tools/shared/review-skill-contracts.test.ts`

Expected: executable coverage proves the real ordered retry branch at every interruption point.

**Step 4: Commit**

```bash
git add .agents/skills/oat-project-complete/scripts/resolve-completion-retry.mjs .agents/skills/oat-project-complete/SKILL.md packages/cli/src/commands/project/push/completion-transaction.test.ts packages/cli/src/commands/init/tools/shared/review-skill-contracts.test.ts
git commit -m "test(p11-t01): execute completion retry routing"
```

### Task p11-t02: (review) Document pull no-commit behavior

**Files:**

- Modify: `apps/oat-docs/docs/reference/cli-reference.md`

**Step 1: Understand the issue**

Final review finding m1: the pull reference still omits the shipped
`--no-commit` option, leaving adopted-record persistence control undiscoverable.

**Step 2: Implement fix**

Add `[--no-commit]` to the pull synopsis and explain that it leaves an adopted
discovery record uncommitted for the caller to persist.

**Step 3: Verify**

Run: `pnpm check && pnpm build:docs`

Expected: markdown lint and the docs build pass with the pull reference aligned to CLI help.

**Step 4: Commit**

```bash
git add apps/oat-docs/docs/reference/cli-reference.md
git commit -m "docs(p11-t02): document pull no-commit behavior"
```

### Task p11-t03: (review) Reject pre-validation push SHA extraction

**Files:**

- Modify: `.agents/skills/oat-brainstorm/SKILL.md`
- Modify: `packages/cli/src/validation/skills.ts`
- Modify: `packages/cli/src/validation/skills.test.ts`
- Modify: `packages/cli/src/validation/synced-bookkeeping-sites.json` (refresh only the two brainstorm anchors changed by this task)

**Step 1: Understand the issue**

Final review finding m2: two brainstorm branches parse `.sha` with `jq` before
immediately overwriting the value through the fail-closed receipt validator.
Behavior is safe today, but the stale pattern is misleading and the validator
permits status-blind extraction before validation.

**Step 2: Implement fix**

Remove both redundant assignments and strengthen validation so extracting or
using `.sha` before the required receipt parser is rejected. Add negative and
positive validator fixtures.

**Step 3: Verify**

Run: `pnpm --filter @open-agent-toolkit/cli exec vitest run src/validation/skills.test.ts && pnpm oat:validate-skills`

Expected: the skill contains no status-blind pre-parse and the validator prevents recurrence.

**Step 4: Commit**

```bash
git add .agents/skills/oat-brainstorm/SKILL.md packages/cli/src/validation/skills.ts packages/cli/src/validation/skills.test.ts packages/cli/src/validation/synced-bookkeeping-sites.json
git commit -m "fix(p11-t03): reject pre-validation push SHA parsing"
```

---

## Phase 12: Preserve normal-route publication guards

Close the Critical regression found by the narrowed final lifecycle review
after Phase 11. This bounded phase remains part of the user-authorized
configured exit-gate closeout; gate attempt 2 is still unlaunched and remains
the final allowed configured attempt. Convert the finding with no deferral and
preserve the existing PR-scoped skill and lockstep package version bumps.

### Task p12-t01: (review) Preserve empty receipts on the normal retry route

**Files:**

- Create: `.agents/skills/oat-project-complete/scripts/parse-completion-retry-fields.mjs`
- Modify: `.agents/skills/oat-project-complete/SKILL.md`
- Modify: `packages/cli/src/commands/project/push/completion-transaction.test.ts`
- Modify: `packages/cli/src/commands/init/tools/shared/review-skill-contracts.test.ts`

**Step 1: Understand the issue**

Final review finding C1: the noncandidate router correctly returns the normal
route, but the skill decoder emits `-` placeholders for the initialized empty
pin and final-artifact receipts. The following shell `read` overwrites those
empty values, so both required `-z "$PROJECT_REF_COMMIT"` publication guards
skip on a fresh non-archive synced completion.

**Step 2: Implement fix**

Extract the retry-result validation and shell-field decoding into a small
skill-owned executable consumed by the skill. On the normal route, emit only
the route so Bash preserves empty receipt/evidence/PR variables. On recovery,
emit and validate the full receipt field set before assignment. Keep the
router's fail-closed candidate behavior and eight-row recovery matrix intact.

Add an executable consumer regression that feeds the production router's
noncandidate JSON through the exact decoder and `IFS`/`read` branch used by the
skill, proves both normal publication guards execute, and captures full-SHA
receipts. Retain dirty/contradictory negative coverage and add contract checks
that the skill invokes the decoder before assigning recovery fields.

**Step 3: Verify**

Run: `pnpm --filter @open-agent-toolkit/cli exec vitest run src/commands/project/push/completion-transaction.test.ts src/commands/init/tools/shared/review-skill-contracts.test.ts && pnpm oat:validate-skills && pnpm run check:skill-bumps && pnpm lint && pnpm format && git diff --check`

Expected: the exact production router/decoder/consumer path leaves normal-route
receipts empty until both publications capture full SHAs, while every recovery
and fail-closed case remains green.

**Step 4: Commit**

```bash
git add .agents/skills/oat-project-complete/scripts/parse-completion-retry-fields.mjs .agents/skills/oat-project-complete/SKILL.md packages/cli/src/commands/project/push/completion-transaction.test.ts packages/cli/src/commands/init/tools/shared/review-skill-contracts.test.ts
git commit -m "fix(p12-t01): preserve normal completion publications"
```

---

## Reviews

| Scope   | Type     | Status          | Date       | Artifact                                                          | Reviewed Head                            | Invocation | Gate Target                   |
| ------- | -------- | --------------- | ---------- | ----------------------------------------------------------------- | ---------------------------------------- | ---------- | ----------------------------- |
| p01     | code     | fixes_completed | 2026-08-27 | reviews/archived/code-p01-review-2026-08-27T055958Z.md            | 82525efff71247350983816d180445980330400f | auto       | -                             |
| p01     | code     | passed          | 2026-08-27 | reviews/archived/code-p01-review-2026-08-27T062203Z.md            | 60787fce522cb9685d7076b56a0862296ffd82c4 | auto       | -                             |
| p02     | code     | fixes_completed | 2026-08-27 | reviews/archived/code-p02-review-2026-08-27T071958Z.md            | 7082c2b4205c8e287d79442e4d09bc76ced8ed80 | auto       | -                             |
| p02     | code     | fixes_completed | 2026-08-27 | reviews/archived/code-p02-review-2026-08-27T075217Z.md            | 1fef87205999940086aeb9e14d0c3d80d8309c5a | auto       | -                             |
| p02     | code     | fixes_completed | 2026-08-27 | reviews/archived/code-p02-review-2026-08-27T081844Z.md            | 00c9f24efb6b4a5fd4aaaadd40765853377c9b27 | auto       | -                             |
| p02     | code     | fixes_completed | 2026-08-27 | reviews/archived/code-p02-review-2026-08-27T124656Z.md            | 7c8ee775bb12a24346927819de70cd0ff648350a | auto       | -                             |
| p02     | code     | fixes_completed | 2026-08-27 | reviews/archived/code-p02-review-2026-08-27T132942Z.md            | 7a03f675a74fbf687b75ae17e8205167d9899345 | auto       | -                             |
| p02     | code     | fixes_completed | 2026-08-27 | reviews/archived/code-p02-review-2026-08-27T153712Z.md            | fc14f074f1b7289bdf3c974999664c5c58899f60 | auto       | -                             |
| p02     | code     | fixes_completed | 2026-08-27 | reviews/archived/code-p02-review-2026-08-27T160020Z.md            | 9eff5ceef77a1716c2a56d1a594e707b263ea803 | auto       | -                             |
| p02-t13 | code     | passed          | 2026-08-27 | reviews/archived/code-p02-t13-review-2026-08-27T173345Z.md        | 9da82464b5fa93477303027a598ff3e9c768905c | auto       | -                             |
| p03-t11 | code     | passed          | 2026-08-27 | reviews/archived/p03-t11-upstream-review-2026-08-27T191902Z.md    | a72c8cf8b49afabfe33afd101f9c92a3b85f373a | manual     | -                             |
| p03     | code     | fixes_completed | 2026-08-27 | reviews/archived/code-p03-review-2026-08-27T194810Z.md            | 3ad8104319e54b9595bc5529d28624194b4c0d7a | manual     | -                             |
| p03     | code     | fixes_completed | 2026-08-27 | reviews/archived/code-p03-review-2026-08-27T202636Z.md            | 947e9d92e0b510fefa287e94c27b582bf1dc429b | manual     | -                             |
| p03-t19 | code     | passed          | 2026-08-27 | reviews/archived/code-p03-t19-review-2026-08-27T203907Z.md        | 4cf94b72b99cb1110f33720b80ce65fc9b715f98 | manual     | -                             |
| p04     | code     | fixes_completed | 2026-08-27 | reviews/archived/p04-review-2026-08-27T223316Z.md                 | 1caa8e9989c11c3ebb1355785fc1f7f502837563 | manual     | -                             |
| p04     | code     | passed          | 2026-08-27 | reviews/archived/p04-review-2026-08-27T232826Z.md                 | 743c9cbe952cf6f4ad3eeba24eabebebec9884c7 | manual     | -                             |
| final   | code     | fixes_completed | 2026-08-27 | reviews/archived/final-review-2026-08-27T234119Z.md               | c5ceac6b06ea29dba92c65834d5aa4c593813f6e | manual     | -                             |
| final   | code     | fixes_completed | 2026-08-28 | reviews/archived/final-review-2026-08-28T013142Z.md               | 30ea3ce3a561e0ce74920976884f021dc637487c | auto       | -                             |
| final   | code     | fixes_completed | 2026-08-28 | reviews/archived/final-review-2026-08-28T022122Z.md               | 9537f6dd5872cae9101c3e10a8ead997940a2cb9 | auto       | -                             |
| final   | code     | fixes_completed | 2026-08-28 | reviews/archived/final-review-2026-08-28T114926Z.md               | e22a9b1ecaafc1cb177c8ca34133e73103c30d74 | auto       | -                             |
| final   | code     | fixes_completed | 2026-08-28 | reviews/archived/final-review-2026-08-28T151732Z.md               | 10bbd92cee2291aebf027e5c6e7ac69da2bc4f2b | auto       | -                             |
| final   | code     | passed          | 2026-08-28 | reviews/archived/final-review-2026-08-28T165719Z.md               | f8bce994d2e542d7ae14bfa35a4847074e280b3c | auto       | -                             |
| final   | code     | fixes_completed | 2026-08-28 | reviews/archived/final-review-2026-08-28T174039Z.md               | 0a85a08c8bc0f7527935b7141f22856e89271f8e | gate       | claude-fable-skip-permissions |
| final   | code     | fixes_completed | 2026-08-28 | reviews/archived/final-review-2026-08-28T182836Z.md               | 300504071dd9cfbdcc0f91d6a292fc025293c6a1 | auto       | -                             |
| final   | code     | fixes_completed | 2026-08-28 | reviews/archived/final-review-2026-08-28T190306Z.md               | 07caa73e332f3bde552f95a20026f499b9c38035 | auto       | -                             |
| final   | code     | passed          | 2026-08-28 | reviews/archived/final-review-2026-08-28T192913Z.md               | a521db33c832f92208abaa95ebc12052a0b39237 | auto       | -                             |
| final   | code     | passed          | 2026-08-28 | reviews/archived/final-review-2026-08-28T194740Z.md               | badbca662babbc995eaea50a6cf50456b0f9bd88 | gate       | claude-fable-skip-permissions |
| p-rev1  | code     | passed          | 2026-08-28 | reviews/archived/p-rev1-review-2026-08-28T220327Z.md              | 17c3b80db3768261471fc7d8faf403bb31366561 | auto       | -                             |
| final   | code     | fixes_completed | 2026-08-28 | reviews/archived/final-review-2026-08-28T222140Z.md               | 1379413fb3d8bbb5b5ac9fe9fc4e00fd144ff6e9 | auto       | -                             |
| spec    | artifact | pending         | -          | -                                                                 | -                                        | -          | -                             |
| design  | artifact | fixes_completed | 2026-08-27 | reviews/archived/artifact-design-review-2026-08-27T004918Z.md     | -                                        | manual     | -                             |
| plan    | artifact | fixes_completed | 2026-08-27 | (structured auto-review x2, in-memory; findings applied in place) | -                                        | auto       | -                             |
| plan    | artifact | fixes_completed | 2026-08-27 | reviews/archived/artifact-plan-review-2026-08-27T013313Z.md       | -                                        | gate       | cursor-gpt-5-6-sol-xhigh      |
| plan    | artifact | fixes_completed | 2026-08-27 | reviews/archived/artifact-plan-review-2026-08-27T014220Z.md       | -                                        | gate       | cursor-gpt-5-6-sol-xhigh      |
| plan    | artifact | fixes_completed | 2026-08-27 | reviews/archived/artifact-plan-review-2026-08-27T015823Z.md       | -                                        | gate       | cursor-gpt-5-6-sol-xhigh      |
| plan    | artifact | fixes_completed | 2026-08-27 | reviews/archived/artifact-plan-review-2026-08-27T022840Z.md       | -                                        | gate       | cursor-gpt-5-6-sol-xhigh      |
| plan    | artifact | fixes_completed | 2026-08-27 | reviews/archived/artifact-plan-review-2026-08-27T025742Z.md       | -                                        | gate       | cursor-gpt-5-6-sol-xhigh      |
| plan    | artifact | fixes_completed | 2026-08-27 | reviews/archived/artifact-plan-review-2026-08-27T031106Z.md       | -                                        | gate       | cursor-gpt-5-6-sol-xhigh      |
| plan    | artifact | fixes_completed | 2026-08-27 | reviews/archived/artifact-plan-review-2026-08-27T032056Z.md       | -                                        | gate       | cursor-gpt-5-6-sol-xhigh      |
| plan    | artifact | fixes_completed | 2026-08-27 | reviews/archived/artifact-plan-review-2026-08-27T033204Z.md       | -                                        | gate       | cursor-gpt-5-6-sol-xhigh      |
| p13     | code     | fixes_completed | 2026-08-28 | reviews/archived/p13-review-2026-08-28T233340Z.md                 | 95cf11abb3f74fe3a63342cf8bc58bb926e1407a | gate       | claude-fable-skip-permissions |
| p13     | code     | passed          | 2026-08-29 | reviews/archived/p13-review-2026-08-29T000209Z.md                 | 85e0b7b65403a8db9be5e18f353c5cfa66592b46 | gate       | claude-fable-skip-permissions |
| final   | code     | fixes_added     | 2026-08-29 | reviews/archived/final-review-2026-08-29T002706Z.md               | ab2a05ca4a3663acc752bb186c9c3e2393f30546 | gate       | claude-fable-skip-permissions |
| final   | code     | fixes_added     | 2026-08-29 | reviews/archived/final-review-2026-08-29T051437Z.md               | d1867ee31cc8b6cf01a745c2351cde6470170557 | gate       | claude-fable-skip-permissions |
| final   | code     | fixes_added     | 2026-08-29 | reviews/archived/final-review-2026-08-29T063413Z.md               | 26f53309caca8e6360cdb24b8d1778e115a8b5e8 | gate       | claude-fable-skip-permissions |
| final   | code     | fixes_completed | 2026-08-29 | reviews/archived/final-review-2026-08-29T083908Z.md               | 4b8c598623f184b75b7de9bdfa69b3b4592539da | gate       | claude-fable-skip-permissions |
| final   | code     | passed          | 2026-08-29 | reviews/archived/final-review-2026-08-29T092432Z.md               | d40bbe3238e1653edc92e6e763ef16c76c2ba57a | gate       | claude-fable-skip-permissions |
| final   | code     | passed          | 2026-08-29 | reviews/archived/final-review-2026-08-29T094230Z.md               | ebe32dc59d134130df64c0d76a7443fd0b1464b2 | gate       | claude-fable-skip-permissions |
| remote  | code     | fixes_completed | 2026-08-29 | reviews/archived/remote-pr-227-review-2026-08-29T131316Z.md       | d1a84e7dfcf9e2487bebde9368d3d2c8bb91fe37 | -          | -                             |
| p18     | code     | passed          | 2026-08-29 | reviews/archived/p18-review-2026-08-29T133009Z.md                 | 9e73c3750357fea997d0927e8b991109c5095930 | auto       | -                             |
| final   | code     | fixes_completed | 2026-08-29 | reviews/archived/final-review-2026-08-29T134331Z.md               | 9ca20b411b07c792d169e46e812f1aef4910ea0f | auto       | -                             |
| p19     | code     | received        | 2026-08-29 | reviews/p19-review-2026-08-29T143242Z.md                          | 5d5684ebe41e3f5c41e40fd864f9108d7b1e2aa4 | auto       | -                             |

**Status values:** `pending` → `received` → `fixes_added` → `fixes_completed` → `passed`

---

## Phase p-rev1: Revision 1

Source: inline feedback (2026-08-28)

### Task prev1-t01: (revision) Integrate merged PR #226 from origin/main

**Files:**

- Merge: all paths introduced by `origin/main` merge commit
  `8cc1b3827f9c051d5d2bb078ae986aef3e9fbd80`
- Reconcile if conflicted: `.agents/skills/oat-project-implement/SKILL.md`
- Reconcile if conflicted: `.oat/sync/manifest.json`
- Reconcile if conflicted: `packages/cli/assets/public-package-versions.json`
- Reconcile if conflicted: lockstep public package `package.json` files
- Reconcile if conflicted: overlapping CLI validation tests, docs, and PJM state

**Step 1: Merge current upstream**

Fetch `origin` and merge `origin/main` into `feat/synced-project-scope` without
rewriting the published PR history. Preserve both PR #226's portable packaged
skill-reference changes and this branch's synced-project-scope behavior.

**Step 2: Resolve and verify**

Resolve every conflict semantically, then verify both parent commits remain
ancestors. Run focused skill-validation and bundled-docs contract tests for the
overlap, followed by the repository Definition of Done gates in CI order and
`pnpm lint`, `pnpm format`, and `git diff --check` where required by repository
instructions.

Expected: the merge is conflict-free or all conflicts are explicitly resolved;
the synced scope and portable packaged-reference contracts both pass; lockstep
versions remain strictly greater than current `origin/main`; all required gates
exit `0`.

**Step 3: Commit**

```bash
git merge --no-edit origin/main
```

If manual conflict resolution is required, stage only the resolved merge paths
and complete the merge commit without changing the published branch history.

---

## Phase 13: Post-merge final review fixes

Goal: close every finding from the fresh final review of the PR #226-integrated
branch, with executable regression coverage for destructive Git operations,
retry receipts, continuation behavior, archive parity, and diagnostics.

### Task p13-t01: (review) Make migration rollback ownership-safe

**Files:**

- Modify: `packages/cli/src/commands/project/sync/ref-sync.ts`
- Modify: `packages/cli/src/commands/project/sync/ref-sync.test.ts`

**Step 1: Understand the issue**

Migration rollback can delete a remote project ref created concurrently by a
different actor because rollback treats existence as ownership.

**Step 2: Implement fix**

Track whether this invocation published the ref and its exact SHA. Delete only
that owned value with an expected-old-value lease/CAS; preserve any competing
remote value.

**Step 3: Verify**

Run the focused real-Git migration tests, including a bare-origin race where a
competitor publishes between preflight and the failed migration push.

**Step 4: Commit**

```bash
git add packages/cli/src/commands/project/sync/ref-sync.ts packages/cli/src/commands/project/sync/ref-sync.test.ts
git commit -m "fix(p13-t01): lease migration rollback to owned ref"
```

### Task p13-t02: (review) Recover the exact archived lifecycle receipt on retry

**Files:**

- Modify: `packages/cli/src/commands/project/archive/archive-utils.ts`
- Modify: `packages/cli/src/commands/project/archive/archive-utils.test.ts`
- Modify: `packages/cli/src/commands/project/push/completion-transaction.test.ts`

**Step 1: Understand the issue**

After the lifecycle commit succeeds but checkout removal fails, a no-op archive
retry returns no lifecycle SHA and cannot finish the completion protocol.

**Step 2: Implement fix**

Recover the prior exact lifecycle commit only after validating its subject,
path set, record/export contents, and branch relationship; return that verified
receipt on the retry path.

**Step 3: Verify**

Run archive retry and executable completion-transaction tests spanning the
post-lifecycle interruption through successful re-attestation.

**Step 4: Commit**

```bash
git add packages/cli/src/commands/project/archive/archive-utils.ts packages/cli/src/commands/project/archive/archive-utils.test.ts packages/cli/src/commands/project/push/completion-transaction.test.ts
git commit -m "fix(p13-t02): recover archived lifecycle receipt"
```

### Task p13-t03: (review) Finish pull adoption and child work after continue

**Files:**

- Modify: `packages/cli/src/commands/project/pull/index.ts`
- Modify: `packages/cli/src/commands/project/pull/index.test.ts`
- Modify as needed: `packages/cli/src/commands/project/sync/ref-sync.ts`

**Step 1: Understand the issue**

`pull --continue` completes the rebase but skips the normal successful pull's
adoption-record commit and coordination-child pull phase.

**Step 2: Implement fix**

After successful continuation, run the same post-pull adoption preparation,
record commit, and child synchronization used by a conflict-free pull.

**Step 3: Verify**

Add and run integration tests for adoption-with-conflict and a coordination
parent with children through `--continue`.

**Step 4: Commit**

```bash
git add packages/cli/src/commands/project/pull/index.ts packages/cli/src/commands/project/pull/index.test.ts packages/cli/src/commands/project/sync/ref-sync.ts
git commit -m "fix(p13-t03): complete post-rebase pull work"
```

### Task p13-t04: (review) Isolate shared and local archive from synced records

**Files:**

- Modify: `packages/cli/src/commands/project/archive/archive-utils.ts`
- Modify: `packages/cli/src/commands/project/archive/archive-utils.test.ts`

**Step 1: Understand the issue**

Archive reads and applies a same-slug synced discovery record before knowing
that the target is shared or local, coupling unrelated project scopes.

**Step 2: Implement fix**

Resolve scope first and read/apply synced discovery state only for an actual
synced project.

**Step 3: Verify**

Run same-slug shared/synced and local/synced tests, including a malformed
unrelated synced record.

**Step 4: Commit**

```bash
git add packages/cli/src/commands/project/archive/archive-utils.ts packages/cli/src/commands/project/archive/archive-utils.test.ts
git commit -m "fix(p13-t04): isolate archive scope records"
```

### Task p13-t05: (review) Protect local-sync destination worktrees

**Files:**

- Modify: `packages/cli/src/commands/local/sync.ts`
- Modify: `packages/cli/src/commands/local/sync.test.ts`

**Step 1: Understand the issue**

`oat local sync --force` checks only the source for nested `.git` markers and
can recursively remove a nested-worktree destination.

**Step 2: Implement fix**

Inspect both source and destination before any removal or copy and skip when
either side is a nested repository or worktree.

**Step 3: Verify**

Run destination-marker tests for both `.git` file and directory forms and
preserve the existing source-marker behavior.

**Step 4: Commit**

```bash
git add packages/cli/src/commands/local/sync.ts packages/cli/src/commands/local/sync.test.ts
git commit -m "fix(p13-t05): protect local sync destinations"
```

### Task p13-t06: (review) Validate completed lifecycle state during receipt recovery

**Files:**

- Modify: `.agents/skills/oat-project-complete/scripts/recover-completion-receipts.mjs`
- Modify: `.agents/skills/oat-project-complete/SKILL.md`
- Modify: `packages/cli/src/commands/project/push/completion-transaction.test.ts`

**Step 1: Understand the issue**

Receipt recovery validates commit shape but not that the pin-source tree has
canonical completed state and a sealed completion log.

**Step 2: Implement fix**

Validate the pin-source `state.md` lifecycle fields and required completion-log
seal before accepting recovered receipts. Bump the canonical skill version for
the changed shipped skill bundle.

**Step 3: Verify**

Run repository-backed negative tests for active/incomplete state and missing or
unsealed completion logs, plus skill validation and skill-bump checks.

**Step 4: Commit**

```bash
git add .agents/skills/oat-project-complete packages/cli/src/commands/project/push/completion-transaction.test.ts
git commit -m "fix(p13-t06): validate recovered completion state"
```

### Task p13-t07: (review) Keep a stable dated synced archive identity

**Files:**

- Modify: `packages/cli/src/commands/project/archive/archive-utils.ts`
- Modify: `packages/cli/src/commands/project/archive/archive-utils.test.ts`

**Step 1: Understand the issue**

The first synced archive replaces the dated export identity with the undated
local archive directory basename.

**Step 2: Implement fix**

Keep local archive target selection separate from a persisted canonical dated
snapshot identity used by S3, summary, and recap exports.

**Step 3: Verify**

Test a first archive with no existing destination and a later-date retry,
asserting stable dated identities across all export surfaces.

**Step 4: Commit**

```bash
git add packages/cli/src/commands/project/archive/archive-utils.ts packages/cli/src/commands/project/archive/archive-utils.test.ts
git commit -m "fix(p13-t07): preserve dated archive identity"
```

### Task p13-t08: (review) Preserve warning-only synced S3 completion parity

**Files:**

- Modify: `packages/cli/src/commands/project/archive/archive-utils.ts`
- Modify: `packages/cli/src/commands/project/archive/archive-utils.test.ts`

**Step 1: Understand the issue**

Synced completion turns missing AWS tooling, unusable credentials, and S3 sync
failures into blockers even though shared completion and docs promise warnings.

**Step 2: Implement fix**

Keep synced completion warning-only on S3 failure and leave `s3Path` null while
preserving all other durability receipts.

**Step 3: Verify**

Run shared/synced parity cases for missing CLI, invalid credentials, and failed
`s3 sync`.

**Step 4: Commit**

```bash
git add packages/cli/src/commands/project/archive/archive-utils.ts packages/cli/src/commands/project/archive/archive-utils.test.ts
git commit -m "fix(p13-t08): keep synced s3 failures nonblocking"
```

### Task p13-t09: (review) Prune stale worktree registrations before enumeration

**Files:**

- Modify: `packages/cli/src/commands/project/sync/ref-sync.ts`
- Modify: `packages/cli/src/commands/project/sync/ref-sync.test.ts`

**Step 1: Understand the issue**

Prune resolves registered paths with `realpath` before pruning, so a missing
registered checkout fails before Git can clean the stale registration.

**Step 2: Implement fix**

Prune Git registrations before enumeration or canonicalize missing registered
paths without weakening live-path containment checks.

**Step 3: Verify**

Add a real-Git test with a prunable nested registration left by a removed
parent worktree and run the focused prune matrix.

**Step 4: Commit**

```bash
git add packages/cli/src/commands/project/sync/ref-sync.ts packages/cli/src/commands/project/sync/ref-sync.test.ts
git commit -m "fix(p13-t09): prune stale registrations first"
```

### Task p13-t10: (review) Diagnose one-sided synced-ref divergence

**Files:**

- Modify: `packages/cli/src/commands/doctor/synced-projects.ts`
- Modify: `packages/cli/src/commands/doctor/synced-projects.test.ts`

**Step 1: Understand the issue**

Doctor warns only when both refs exist and differ, omitting local-only and
remote-only divergence while correctly treating transport failure separately.

**Step 2: Implement fix**

Warn when exactly one successfully queried ref exists and retain the existing
offline note for actual remote transport failure.

**Step 3: Verify**

Run local-only, remote-only, unequal-present, equal-present, and offline cases.

**Step 4: Commit**

```bash
git add packages/cli/src/commands/doctor/synced-projects.ts packages/cli/src/commands/doctor/synced-projects.test.ts
git commit -m "fix(p13-t10): report one-sided ref divergence"
```

### Task p13-t11: (review) Align PJM and release metadata after final fixes

**Files:**

- Modify: `.oat/repo/pjm/current-state.md`
- Modify: `packages/cli/package.json`
- Modify: `packages/control-plane/package.json`
- Modify: `packages/docs-config/package.json`
- Modify: `packages/docs-theme/package.json`
- Modify: `packages/docs-transforms/package.json`
- Modify: `packages/cli/assets/public-package-versions.json`
- Modify: `pnpm-lock.yaml`

**Step 1: Understand the issue**

PJM still labels PR #226 and synced scope as pending at `0.2.39`; the new CLI
and bundled-skill fixes also require a fresh lockstep public package version.

**Step 2: Implement fix**

Describe both streams as merged/integrated, then bump all five public packages,
the generated version asset, and lockfile together from `0.2.40` to `0.2.41`.

**Step 3: Verify**

Run the exact CI-order Definition of Done, plus `pnpm lint`, `pnpm format`, and
`git diff --check`; fetch `origin/main` immediately before the version gate.

**Step 4: Commit**

```bash
git add .oat/repo/pjm/current-state.md packages/cli/package.json packages/control-plane/package.json packages/docs-config/package.json packages/docs-theme/package.json packages/docs-transforms/package.json packages/cli/assets/public-package-versions.json pnpm-lock.yaml
git commit -m "chore(p13-t11): align post-merge release metadata"
```

### Task p13-t12: (review) Allow receipt recovery without an enabled project log

**Files:**

- Modify: `.agents/skills/oat-project-complete/scripts/recover-completion-receipts.mjs`
- Modify: `.agents/skills/oat-project-complete/SKILL.md`
- Modify: `packages/cli/src/commands/project/push/completion-transaction.test.ts`

**Step 1: Understand the issue**

Recovery now requires `project-log.md` even though the completion workflow
supports an absent/inert project log through `--no-project-log` and config.

**Step 2: Implement fix**

Accept an absent log at the pin-source commit; when a log exists, retain the
exact final completion-seal validation. Align the skill prose and bump the
canonical skill version from `1.7.1` to `1.7.2`.

**Step 3: Verify**

Replace the missing-log negative fixture with a log-absent positive recovery
case while preserving active-state and unsealed-log negatives. Run the
repository-backed completion matrix and skill-bump validation.

**Step 4: Commit**

```bash
git add .agents/skills/oat-project-complete packages/cli/src/commands/project/push/completion-transaction.test.ts
git commit -m "fix(p13-t12): allow logless receipt recovery"
```

### Task p13-t13: (review) Scope persisted archive retry identity

**Files:**

- Modify: `packages/cli/src/commands/project/archive/archive-utils.ts`
- Modify: `packages/cli/src/commands/project/archive/archive-utils.test.ts`

**Step 1: Understand the issue**

Persisted dated archive matching uses only project and snapshot names under a
scope-shared archive root, so same-day same-slug archives can cross scopes.

**Step 2: Implement fix**

Persist and validate the originating scope or an equally strong exact archive
directory identity, and require it while resolving synced retries.

**Step 3: Verify**

Add a same-day same-slug shared/synced retry test proving the synced retry
resolves only its own directory and never sources another scope's exports.

**Step 4: Commit**

```bash
git add packages/cli/src/commands/project/archive/archive-utils.ts packages/cli/src/commands/project/archive/archive-utils.test.ts
git commit -m "fix(p13-t13): scope persisted archive retries"
```

### Task p13-t14: (review) Avoid orphan archives when record persistence fails

**Files:**

- Modify: `packages/cli/src/commands/project/archive/archive-utils.ts`
- Modify: `packages/cli/src/commands/project/archive/archive-utils.test.ts`

**Step 1: Understand the issue**

Writing the synced record after copying can leave an orphan archive directory
when record persistence fails, causing duplicate identities and ambiguity.

**Step 2: Implement fix**

Make identity persistence and archive creation failure-safe by persisting the
identity before copy or removing the invocation-owned fresh directory when the
record write fails.

**Step 3: Verify**

Inject record-write failure, assert no orphan/duplicate archive remains, and
prove a retry reuses exactly one canonical identity.

**Step 4: Commit**

```bash
git add packages/cli/src/commands/project/archive/archive-utils.ts packages/cli/src/commands/project/archive/archive-utils.test.ts
git commit -m "fix(p13-t14): clean failed archive identity writes"
```

### Task p13-t15: (review) Handle locked missing worktree registrations

**Files:**

- Modify: `packages/cli/src/commands/project/sync/ref-sync.ts`
- Modify: `packages/cli/src/commands/project/sync/ref-sync.test.ts`

**Step 1: Understand the issue**

`git worktree prune` preserves locked registrations; a locked-but-missing path
still makes `realpath` fail before the prune workflow can diagnose it.

**Step 2: Implement fix**

Canonicalize missing registrations without requiring filesystem existence, or
return a precise locked-stale diagnostic, while preserving containment checks
for live paths.

**Step 3: Verify**

Add a real-Git locked-and-missing registration case alongside the existing
removed-parent fixture and run the focused prune matrix.

**Step 4: Commit**

```bash
git add packages/cli/src/commands/project/sync/ref-sync.ts packages/cli/src/commands/project/sync/ref-sync.test.ts
git commit -m "fix(p13-t15): handle locked stale worktrees"
```

### Task p13-t16: (review) Report local ref-query failures and finalize release metadata

**Files:**

- Modify: `packages/cli/src/commands/doctor/synced-projects.ts`
- Modify: `packages/cli/src/commands/doctor/synced-projects.test.ts`
- Modify: all five lockstep public package `package.json` files
- Modify: `packages/cli/assets/public-package-versions.json`

**Step 1: Understand the issue**

Doctor is silent when local `show-ref` fails with an unexpected exit code,
unlike the explicit remote transport diagnostic. The shipped follow-up fixes
also require one fresh lockstep release increment.

**Step 2: Implement fix**

Emit a pass-level local-ref diagnostic that names the Git error without
misclassifying it as divergence. Fetch current `origin/main`, then bump the
five public packages and generated asset to the smallest strictly greater
lockstep version (expected `0.2.42` if upstream remains `0.2.39`).

**Step 3: Verify**

Run local-query failure, local-only, remote-only, equal, unequal, and offline
doctor cases, then the exact CI-order Definition of Done plus lint, format, and
diff checks.

**Step 4: Commit**

```bash
git add packages/cli/src/commands/doctor/synced-projects.ts packages/cli/src/commands/doctor/synced-projects.test.ts packages/cli/package.json packages/control-plane/package.json packages/docs-config/package.json packages/docs-theme/package.json packages/docs-transforms/package.json packages/cli/assets/public-package-versions.json
git commit -m "fix(p13-t16): report local ref query failures"
```

---

## Phase 14: Final integration review fixes

Goal: close the fresh full-range final-review findings across custom-root
compatibility, validator enforcement, configuration semantics, skill arrival,
doctor readiness, safety verification, lifecycle recovery, and residual
operator-facing correctness before PR #227 is published.

### Task p14-t01: (review) Restore custom `projects.root` compatibility

**Files:**

- Modify: `packages/cli/src/commands/shared/project-scope.ts`
- Modify: its focused tests and affected `open`, `archive`, `pause`, `prune`, and `migrate` integration tests

**Step 1: Understand the issue**

The configured `projects.root` is the shared root, but scope resolution only
recognizes literal `shared`, breaking scope/open/archive and arrival guards.

**Step 2: Implement fix**

Treat normalized `projectsRoot` as authoritative for shared projects before
deriving sibling local/synced roots; preserve synced `.git` confirmation and
audit every affected call site.

**Step 3: Verify**

Add config and `OAT_PROJECTS_ROOT` custom-root fixtures covering scope, open,
archive, pause, prune, migrate, and the arrival guard's successful shared path.

**Step 4: Commit**

```bash
git add packages/cli/src/commands
git commit -m "fix(p14-t01): restore custom project roots"
```

### Task p14-t02: (review) Repair and continuously enforce the skill inventory

**Files:**

- Modify: `packages/cli/src/validation/synced-bookkeeping-sites.json`
- Modify: root package scripts and validation tests as needed

**Step 1: Understand the issue**

The archive scope-resolution inventory anchor is stale, so
`pnpm oat:validate-skills` fails despite the CI-order gates passing.

**Step 2: Implement fix**

Anchor the inventory to the stable `isSynced` line and make the repository
skill validator part of a CI-covered check surface so future drift is visible.

**Step 3: Verify**

Run `pnpm oat:validate-skills`, the validator suites, `pnpm check`, and prove a
stale anchor fails the contract fixture.

**Step 4: Commit**

```bash
git add packages/cli/src/validation package.json
git commit -m "fix(p14-t02): enforce synced bookkeeping inventory"
```

### Task p14-t03: (review) Preserve root-less `projects.defaultScope`

**Files:**

- Modify: `packages/cli/src/config/oat-config.ts`
- Modify: config resolution tests

**Step 1: Understand the issue**

The normalizer drops `defaultScope` unless `projects.root` is also present.

**Step 2: Implement fix**

Retain either projects field independently and route invalid enum values
through the existing configuration-validation error path.

**Step 3: Verify**

Test root-less valid/invalid config files and effective default-scope behavior.

**Step 4: Commit**

```bash
git add packages/cli/src/config
git commit -m "fix(p14-t03): preserve rootless default scope"
```

### Task p14-t04: (review) Make shared/local arrival guards exit successfully

**Files:**

- Modify: `.agents/skills/oat-worktree-bootstrap/SKILL.md`
- Modify: `.agents/skills/oat-worktree-bootstrap-auto/SKILL.md`
- Modify: `.agents/skills/oat-cursor-cloud-projects/SKILL.md`
- Modify: `.agents/skills/oat-project-autonomous/SKILL.md`
- Modify: validator/contract tests

**Step 1: Understand the issue**

Four guards end with `[ synced ] && pull`, returning exit 1 for ordinary
shared/local projects despite their non-blocking contract.

**Step 2: Implement fix**

Use the safe `if` form at all sites, bump each changed skill once, and teach
the validator to reject the unsafe `&&` companion shape.

**Step 3: Verify**

Run shared/local/synced snippet cases, skill validation, version-bump checks,
and managed-provider drift checks.

**Step 4: Commit**

```bash
git add .agents/skills/oat-worktree-bootstrap .agents/skills/oat-worktree-bootstrap-auto .agents/skills/oat-cursor-cloud-projects .agents/skills/oat-project-autonomous packages/cli/src/validation packages/cli/src/commands/init/tools/shared
git commit -m "fix(p14-t04): make arrival guards nonblocking"
```

### Task p14-t05: (review) Align spec and design safety contracts

**Files:**

- Modify: `.oat/projects/shared/synced-project-scope/spec.md`
- Modify: `.oat/projects/shared/synced-project-scope/design.md`

**Step 1: Understand the issue**

Artifacts prohibit every leased push and promise byte-identical shared archive
behavior, while approved implementation uses owned-SHA leased rollback and
documented shared-path metadata/idempotency changes.

**Step 2: Implement fix**

Carve out only the owned-SHA rollback lease and enumerate the actual shared
archive deltas without weakening normal push or destructive safety invariants.

**Step 3: Verify**

Cross-check NFR1/NFR4/FR12/FR18 wording against code and run markdown checks.

**Step 4: Commit**

```bash
git add .oat/projects/shared/synced-project-scope/spec.md .oat/projects/shared/synced-project-scope/design.md
git commit -m "docs(p14-t05): align safety contracts"
```

### Task p14-t06: (review) Run doctor readiness checks without synced records

**Files:**

- Modify: `packages/cli/src/commands/doctor/synced-projects.ts`
- Modify: `packages/cli/src/commands/doctor/synced-projects.test.ts`

**Step 1: Understand the issue**

The no-records early return hides gitignore and editor readiness diagnostics a
repository needs before creating its first synced project.

**Step 2: Implement fix**

Run scope-independent readiness checks before the no-records result while
keeping per-record checks conditional.

**Step 3: Verify**

Cover record-less repositories with and without the ignore rule and editor
hint, plus existing record-aware diagnostics.

**Step 4: Commit**

```bash
git add packages/cli/src/commands/doctor/synced-projects.ts packages/cli/src/commands/doctor/synced-projects.test.ts
git commit -m "fix(p14-t06): run prerecord doctor checks"
```

### Task p14-t07: (review) Keep PJM and lockstep release metadata current

**Files:**

- Modify: `.oat/repo/pjm/current-state.md`
- Modify: all five public package manifests
- Modify: `packages/cli/assets/public-package-versions.json`

**Step 1: Understand the issue**

PJM version labels drifted again, and this final shipped fix phase requires a
fresh lockstep release increment.

**Step 2: Implement fix**

Record synced scope at the new branch release, PR #226 at its actual `0.2.39`
release, and bump all public packages/assets to the smallest version above
fresh `origin/main` (expected `0.2.43`).

**Step 3: Verify**

Fetch `origin/main`, run version and release validation, and assert PJM labels
match the final package state.

**Step 4: Commit**

```bash
git add .oat/repo/pjm/current-state.md packages/cli/package.json packages/control-plane/package.json packages/docs-config/package.json packages/docs-theme/package.json packages/docs-transforms/package.json packages/cli/assets/public-package-versions.json
git commit -m "chore(p14-t07): align final release metadata"
```

### Task p14-t08: (review) Restore a competitor ref during migration rollback

**Files:**

- Modify: `packages/cli/src/commands/project/sync/ref-sync.ts`
- Modify: `packages/cli/src/commands/project/sync/ref-sync.test.ts`

**Step 1: Understand the issue**

If migration fast-forwards over a concurrently published ref, later rollback
deletes the combined history instead of restoring the competitor's prior SHA.

**Step 2: Implement fix**

Capture the pre-publish remote SHA; restore it under a lease when it existed,
and delete only when the ref was absent before this invocation's publish.

**Step 3: Verify**

Add real bare-origin races for clean rebase + later failure, conflicting push,
later competitor update, restoration, and deletion-only ownership.

**Step 4: Commit**

```bash
git add packages/cli/src/commands/project/sync/ref-sync.ts packages/cli/src/commands/project/sync/ref-sync.test.ts
git commit -m "fix(p14-t08): restore prior remote on rollback"
```

### Task p14-t09: (review) Clean partial archives after copy failure

**Files:**

- Modify: `packages/cli/src/commands/project/archive/archive-utils.ts`
- Modify: `packages/cli/src/commands/project/archive/archive-utils.test.ts`

**Step 1: Understand the issue**

First-run copy failure can leave an invocation-owned partial directory that a
retry never reuses.

**Step 2: Implement fix**

Remove only the fresh archive directory owned by this attempt when copy or
metadata write fails; never remove a pre-existing verified archive.

**Step 3: Verify**

Inject during-copy failure and prove retry creates one dated complete archive.

**Step 4: Commit**

```bash
git add packages/cli/src/commands/project/archive/archive-utils.ts packages/cli/src/commands/project/archive/archive-utils.test.ts
git commit -m "fix(p14-t09): clean partial archive copies"
```

### Task p14-t10: (review) Complete NFR4, FR12, and receipt test assertions

**Files:**

- Modify: migration, ref-sync, push/pull, and completion transaction tests

**Step 1: Understand the issue**

Several designed end-state, parent-cleanliness, runner-mutation, and receipt
timestamp invariants are not directly asserted.

**Step 2: Implement fix**

Add the missing index/worktree/record/status assertions, runner-spy guardrails,
and timestamp-mismatch/malformed-frontmatter negatives without changing code.

**Step 3: Verify**

Run the focused real-Git migration/sync/completion matrices and ensure every
design verification row has executable evidence.

**Step 4: Commit**

```bash
git add packages/cli/src/commands/project packages/cli/src/commands/init/tools/shared
git commit -m "test(p14-t10): complete safety assertions"
```

### Task p14-t11: (review) Document archive `--no-commit` semantics

**Files:**

- Modify: `apps/oat-docs/docs/reference/cli-reference.md`
- Modify: lifecycle/design documentation and CLI help tests as needed

**Step 1: Understand the issue**

The shipped flag is absent from docs and cannot be used inside completion
because it intentionally returns no lifecycle receipt.

**Step 2: Implement fix**

Document manual-only semantics and the completion caveat; keep the completion
skill from passing the flag.

**Step 3: Verify**

Run docs checks/build and help/reference parity tests.

**Step 4: Commit**

```bash
git add apps/oat-docs/docs packages/cli/src/commands/project/archive
git commit -m "docs(p14-t11): explain archive no-commit"
```

### Task p14-t12: (review) Make brainstorm fold-back prose scope-aware

**Files:**

- Modify: `.agents/skills/oat-brainstorm/SKILL.md`
- Modify: skill contract tests

**Step 1: Understand the issue**

Normative prose still requires a branch commit for synced fold-back despite
the executable scope guard using `oat project push`.

**Step 2: Implement fix**

Align every BLOCKED/self-correction/checklist/handoff sentence with the scope
guard and bump the skill once.

**Step 3: Verify**

Run skill validation, bump checks, and fold-back contract tests.

**Step 4: Commit**

```bash
git add .agents/skills/oat-brainstorm packages/cli/src/validation packages/cli/src/commands/init/tools/shared
git commit -m "docs(p14-t12): align brainstorm foldback scope"
```

### Task p14-t13: (review) Give malformed synced records a recovery path

**Files:**

- Modify: `packages/cli/src/commands/project/sync/record.ts`
- Modify: record/target/list command tests

**Step 1: Understand the issue**

Malformed records hard-stop every sync command with no actionable remediation.

**Step 2: Implement fix**

Return an operator-state error that names safe restore/pull recovery and uses
exit 1 while keeping schema violations fail-closed.

**Step 3: Verify**

Cover malformed records through push, pull, prune, and list with exact guidance.

**Step 4: Commit**

```bash
git add packages/cli/src/commands/project/sync packages/cli/src/commands/project/list
git commit -m "fix(p14-t13): guide malformed record recovery"
```

### Task p14-t14: (review) Validate non-archive lifecycle receipts

**Files:**

- Modify: `.agents/skills/oat-project-complete/SKILL.md`
- Modify: completion transaction scripts/tests

**Step 1: Understand the issue**

The non-archive route trusts the latest record commit without checking its
subject or completed record contents.

**Step 2: Implement fix**

Fail closed unless the recovered commit has the expected lifecycle subject and
a committed `status: complete` record; bump the completion skill.

**Step 3: Verify**

Add valid recovery plus stale scaffold/adoption and malformed/incomplete record
negatives in the repository-backed matrix.

**Step 4: Commit**

```bash
git add .agents/skills/oat-project-complete packages/cli/src/commands/project/push packages/cli/src/commands/init/tools/shared
git commit -m "fix(p14-t14): validate nonarchive lifecycle receipts"
```

### Task p14-t15: (review) Restore local state after rejected pause publication

**Files:**

- Modify: `packages/cli/src/commands/project/pause/index.ts`
- Modify: pause tests

**Step 1: Understand the issue**

A rejected/conflicted synced pause leaves `state.md` locally paused and dirty.

**Step 2: Implement fix**

Restore the exact pre-pause state on non-success publication while preserving
the active pointer and actionable error.

**Step 3: Verify**

Test rejected, conflicted, successful, and retry paths with byte-equal rollback.

**Step 4: Commit**

```bash
git add packages/cli/src/commands/project/pause
git commit -m "fix(p14-t15): rollback rejected pauses"
```

### Task p14-t16: (review) Prevent cross-scope slug ambiguity at creation

**Files:**

- Modify: project scaffold and synced-create preflight
- Modify: new/open integration tests

**Step 1: Understand the issue**

Creation allows a slug that already exists in another scope, making
`open <slug>` permanently ambiguous.

**Step 2: Implement fix**

Reject cross-scope collisions by default with explicit-path/approved force
escape semantics consistent across shared/local/synced and custom roots.

**Step 3: Verify**

Cover every scope pair, custom root, remote-only synced ref, and valid explicit
path opening.

**Step 4: Commit**

```bash
git add packages/cli/src/commands/project/new packages/cli/src/commands/project/open packages/cli/src/commands/project/sync
git commit -m "fix(p14-t16): prevent cross-scope slug collisions"
```

### Task p14-t17: (review) Remove `/dev/null` from empty-tree creation

**Files:**

- Modify: `packages/cli/src/commands/project/sync/ref-sync.ts`
- Modify: focused tests

**Step 1: Understand the issue**

The empty-tree hash command depends on a Unix-only filesystem path.

**Step 2: Implement fix**

Use the canonical empty-tree object ID or stdin-safe Git plumbing without
platform-specific paths.

**Step 3: Verify**

Assert the canonical object ID and no `/dev/null` argv dependency.

**Step 4: Commit**

```bash
git add packages/cli/src/commands/project/sync/ref-sync.ts packages/cli/src/commands/project/sync/ref-sync.test.ts
git commit -m "fix(p14-t17): create empty tree portably"
```

### Task p14-t18: (review) Enforce the wave gate-commit scope guard

**Files:**

- Modify: `.agents/skills/oat-wave-execute/SKILL.md`
- Modify: synced bookkeeping inventory and validator tests

**Step 1: Understand the issue**

The wave gate-commit site has only prose, so the inventory's companion guard
cannot enforce executable synced/shared behavior.

**Step 2: Implement fix**

Add the standard executable scope guard, anchor inventory to it, and bump the
skill once.

**Step 3: Verify**

Run repository skill validation, contract tests, bump checks, and provider
drift checks.

**Step 4: Commit**

```bash
git add .agents/skills/oat-wave-execute packages/cli/src/validation packages/cli/src/commands/init/tools/shared
git commit -m "fix(p14-t18): enforce wave gate bookkeeping"
```

### Task p14-t19: (review) Refresh final closeout guidance

**Files:**

- Modify: `.oat/projects/shared/synced-project-scope/plan.md`
- Modify: final implementation/state summaries as needed

**Step 1: Understand the issue**

Closeout text claims the old gate attempt remains unlaunched and references a
stale freshness basis.

**Step 2: Implement fix**

Describe the passed historical attempt and the required post-merge refreshed
gate generation without claiming it has run before it does.

**Step 3: Verify**

Cross-check plan/state gate fields and keep task/review totals runnable.

**Step 4: Commit**

```bash
git add .oat/projects/shared/synced-project-scope
git commit -m "docs(p14-t19): refresh closeout guidance"
```

---

## Phase 15: Full-range final review fixes

Goal: close every finding from the fresh full-range review at `d1867ee3`,
including three reproduced P0/P1 regressions and all residual Medium/Minor
contract gaps, before another independent final review or PR publication.

### Task p15-t01: (review) Complete custom-root Git plumbing

**Files:** sync ref plumbing, migrate/open/pull/prune callers, and real-Git integration tests.

1. Derive migration confinement, record/source allowlists, and gitignore probes from configured roots instead of literal `.oat/projects/*` paths.
2. Cover relative, alternate, environment, and absolute custom roots across migrate, adopting pull/open, and prune; assert clean parent trees and no half-pruned state.
3. Run the focused real-Git suites and CLI type-check.
4. Commit as `fix(p15-t01): complete custom root git plumbing`.

### Task p15-t02: (review) Preserve conflict state during pause publication

**Files:** pause publication, sync recovery integration, and pause tests.

1. Never overwrite a conflicted mid-rebase file. Either preserve the conflict with targeted continue/abort guidance or abort before restoring exact pre-pause bytes.
2. Add a real two-clone conflict test proving the remote edit survives documented recovery and no false pause commit is published.
3. Run pause/ref-sync focused suites and type-check.
4. Commit as `fix(p15-t02): preserve pause conflict recovery`.

### Task p15-t03: (review) Keep shared and local creation offline

**Files:** scaffold collision preflight, split seeding tests, and runner fixtures.

1. Treat remote transport failure as an unverifiable warning for shared/local creation while preserving local-ref collision checks and synced fail-closed behavior.
2. Test shared/local creation and split with an unreachable origin, plus real collision and synced transport cases.
3. Run new/split/scaffold suites and type-check.
4. Commit as `fix(p15-t03): preserve offline project creation`.

### Task p15-t04: (review) Make invalid default scope repairable

**Files:** config normalization/commands and config tests.

1. Align invalid `projects.defaultScope` with repository config conventions while ensuring `oat config set projects.defaultScope <valid>` can repair an invalid on-disk value.
2. Include actionable file/key context without making unrelated commands inconsistent.
3. Run config command/normalizer suites and type-check.
4. Commit as `fix(p15-t04): make default scope repairable`.

### Task p15-t05: (review) Preserve default scope in root backfills

**Files:** workflow install, pack lifecycle, tools migrate, and their tests.

1. Preserve the existing `projects` object when adding a missing root at all three sites.
2. Test root-less `defaultScope` through init, tools update, and tools migrate.
3. Run focused tool lifecycle suites and type-check.
4. Commit as `fix(p15-t05): preserve project config backfills`.

### Task p15-t06: (review) Document skill validation in `pnpm check`

**Files:** `AGENTS.md`.

1. State that `pnpm check` also runs `oat:validate-skills` and clarify its distinction from lint/format.
2. Verify the command description against root scripts and run markdown/format checks.
3. Commit as `docs(p15-t06): document check skill validation`.

### Task p15-t07: (review) Align brainstorm destination reference

**Files:** `.agents/skills/oat-brainstorm/references/destinations.md` and contract tests if needed.

1. Make every fold-back option scope-aware: synced pushes; shared/local commit exact project paths.
2. Preserve the existing PR-scoped brainstorm version bump.
3. Run skill validation, brainstorm contracts, and bump checks.
4. Commit as `docs(p15-t07): align brainstorm destination scope`.

### Task p15-t08: (review) Make doctor slug extraction portable

**Files:** synced-project doctor implementation/tests.

1. Use platform-aware basename extraction for ignore probes and malformed-record diagnostics.
2. Add Windows-separator-focused unit coverage without weakening POSIX behavior.
3. Run doctor tests and type-check.
4. Commit as `fix(p15-t08): make doctor slugs portable`.

### Task p15-t09: (review) Preserve completed-record recovery state

**Files:** adoption/record recovery code, messages, and tests.

1. Ensure completed projects do not silently regenerate as active; either recover lifecycle fields from trusted state or require lossless Git restoration with explicit guidance.
2. Test completed, archived, and active malformed-record recovery paths.
3. Run record/adoption suites and type-check.
4. Commit as `fix(p15-t09): preserve recovered lifecycle state`.

### Task p15-t10: (review) Resolve single-segment custom roots correctly

**Files:** project scope resolver/tests.

1. Prevent vacuous sibling matching when `projects.root` has one relative segment; resolve against repo context or require the shared-root match first.
2. Cover absolute and relative paths containing incidental `local`/`synced` segments.
3. Run scope tests and type-check.
4. Commit as `fix(p15-t10): resolve single segment roots`.

### Task p15-t11: (review) Align the Git minimum contract

**Files:** design/docs and, if preferable, ref-sync compatibility code/tests.

1. Either document Git 2.31+ consistently or replace `--path-format=absolute` with portable plumbing matching the declared minimum.
2. Add executable coverage for the chosen contract and run docs checks.
3. Commit as `docs(p15-t11): align git compatibility`.

### Task p15-t12: (review) Classify Git spawn failures as system errors

**Files:** sync Git runner/tests.

1. Map non-numeric spawn failures such as `ENOENT` to actionable exit 2 rather than an `allowFailure` semantic result.
2. Test missing executable behavior for allow-failure and normal calls.
3. Run Git runner/ref-sync suites and type-check.
4. Commit as `fix(p15-t12): classify git spawn failures`.

### Task p15-t13: (review) Protect adopted recap exports

**Files:** archive utilities/tests.

1. Track whether the current attempt created or adopted the recap export and clean only attempt-owned output on failure.
2. Test adopted tracked/untracked exports and newly-created partial exports across retries.
3. Run archive suites and type-check.
4. Commit as `fix(p15-t13): preserve adopted recap exports`.

### Task p15-t14: (review) Harden non-archive lifecycle receipts

**Files:** completion skill/script and repository-backed contract tests.

1. Document and enforce ancestry, exact path set, slug/status/content, missing-record handling, and fresh-commit success before accepting a receipt.
2. Chain the fresh lifecycle commit and validate its SHA; add slug, non-ancestor, hook-failure, and unrelated-path negatives.
3. Preserve the existing PR-scoped completion-skill version bump and run skill/recovery matrices.
4. Commit as `fix(p15-t14): harden nonarchive receipts`.

### Task p15-t15: (review) Bind the wave project path

**Files:** wave-execute skill, inventory anchors, and contract tests.

1. Resolve and bind the active wrapper project path before the scope guard and stage only that exact path for shared/local.
2. Preserve the existing PR-scoped wave skill bump.
3. Run skill validation, contracts, and bump checks.
4. Commit as `fix(p15-t15): bind wave project bookkeeping`.

### Task p15-t16: (review) Exclude test fixtures from the package build

**Files:** CLI TypeScript/build/package configuration and packaging tests.

1. Exclude `src/__tests__/**` support fixtures from published `dist` without excluding production code or runtime test assets intentionally shipped.
2. Build/pack and assert the synced fixture is absent.
3. Run CLI build/type-check and release validation.
4. Commit as `fix(p15-t16): exclude test fixtures from cli dist`.

### Task p15-t17: (review) Restore import ordering in workflow tests

**Files:** `packages/cli/src/e2e/workflow.test.ts`.

1. Move the trailing import into the header block with no semantic test change.
2. Run the workflow suite, lint, format, and type-check.
3. Commit as `test(p15-t17): restore workflow import order`.

### Task p15-t18: (review) Complete design verification coverage

**Files:** design requirement table and e2e/archive tests.

1. Add FR16-FR18 rows and reconcile NFR3 with executable scenarios.
2. Test GitHub CLI absence during sync and shared-scope `reviews/` exclusion where promised.
3. Run focused tests plus markdown/docs checks.
4. Commit as `test(p15-t18): complete design verification matrix`.

### Task p15-t19: (review) Cover malformed records at command boundaries

**Files:** list/push/pull/prune command tests and record listing behavior as needed.

1. Add the promised command-level malformed-record cases; prefer per-record degraded listing when safe while keeping mutation commands fail-closed with recovery guidance.
2. Test mixed valid/invalid lists and exact push/pull/prune exits/messages.
3. Run affected command suites and type-check.
4. Commit as `test(p15-t19): cover malformed record commands`.

---

## Phase 16: Final full-range safety and contract fixes

Goal: close all findings from the full-range review at `26f53309`, including
three reproduced archive/sync safety regressions, three Medium lifecycle/build
risks, and fourteen residual correctness and verification gaps.

### Task p16-t01: (review) Make custom-root archive completion atomic

Derive record/source pathspec allowlists inside sync plumbing from the target's
configured roots, remove caller self-allowlisting, and add real-Git completion
archive coverage for alternate and absolute roots with clean parent state.
Verify archive/ref-sync suites and type-check; commit as
`fix(p16-t01): complete custom root archive`.

### Task p16-t02: (review) Stabilize Git outcomes across locales

Pin Git child locale to `C`, clear ambient repository redirection variables,
prefer exit-code probes where available, and test synced creation/push under a
translated locale. Verify Git/ref-sync suites; commit as
`fix(p16-t02): stabilize localized git outcomes`.

### Task p16-t03: (review) Refuse archive paths outside the repository

Canonicalize the configured root against `repoRoot` and reject any foreign or
sibling-worktree project path before copy/removal. Add a matching-segments
outside-repo regression proving no mutation. Commit as
`fix(p16-t03): confine archive project paths`.

### Task p16-t04: (review) Canonicalize symlinked absolute roots

Realpath both repository and absolute scope-root/path comparisons, cover a
symlinked temp prefix, and make scaffold failure roll back any attempt-owned
ref/worktree/record. Commit as `fix(p16-t04): canonicalize absolute roots`.

### Task p16-t05: (review) Enforce final-links scope bookkeeping

Add the missing synced conjunct to completion final-links push, make validation
join continued command lines and recognize array pathspecs, and reject broad
project-artifact staging. Preserve the existing PR-scoped skill bump. Run skill
validation/contracts/bump gate; commit as
`fix(p16-t05): enforce completion bookkeeping scope`.

### Task p16-t06: (review) Remove live builds from unit tests

Replace the in-vitest workspace build with a non-mutating packaging contract
probe against configuration or already-built output. Prove no assets/dist race
and retain package-content coverage. Commit as
`test(p16-t06): make package contract nonmutating`.

### Task p16-t07: (review) Recover non-conflict pause failures cleanly

For rejected/declined publication, either restore the pre-pause commit and
clean checkout or retain the pause commit with exact retry guidance. Add a real
remote-decline test and no-dirty-state assertions. Commit as
`fix(p16-t07): recover rejected pause publication`.

### Task p16-t08: (review) Complete pause conflict guidance

Tell operators to re-run pause after continue/push so the active pointer is
cleared, or make that finalization idempotent and automatic. Test the full
documented sequence. Commit as `fix(p16-t08): finish pause conflict recovery`.

### Task p16-t09: (review) Unify relative-root scope resolution

Resolve relative roots against repo context at all callers, remove inconsistent
segment scanning, and test split scope inheritance for single-segment roots.
Commit as `fix(p16-t09): unify relative scope roots`.

### Task p16-t10: (review) Centralize synced-root gitignore repair

Export one managed gitignore helper for scoped roots, reuse it in scaffold,
adoption, and migration, and ensure the custom rule is managed idempotently.
Commit as `refactor(p16-t10): centralize scoped gitignore repair`.

### Task p16-t11: (review) Exclude nested test support from packages

Exclude every `src/**/__tests__/**` path from published dist, retain separate
type coverage for test support, and assert no packed path contains `__tests__`.
Commit as `fix(p16-t11): exclude nested test support`.

### Task p16-t12: (review) Make the Git minimum truthful

Either implement one clear Git-version probe or align design/docs with the
actual best-effort compatibility contract and minimum. Add executable evidence
and docs checks. Commit as `docs(p16-t12): align git minimum support`.

### Task p16-t13: (review) Finish default-scope diagnostics and repair

Let doctor report invalid `defaultScope`, align command exit semantics, and
repair only the requested key without materializing a missing root. Add CLI
command tests. Commit as `fix(p16-t13): finish default scope recovery`.

### Task p16-t14: (review) Use real malformed-record boundaries

Replace hand-typed resolver failures with on-disk malformed fixtures and render
a `recorded-invalid` list row for JSON/human consumers while mutations remain
fail-closed. Commit as `test(p16-t14): exercise malformed record boundaries`.

### Task p16-t15: (review) Verify `--no-children` pull behavior

Add a focused FR17 case proving child pull is skipped while parent pull remains
correct. Commit as `test(p16-t15): cover pull no children`.

### Task p16-t16: (review) Keep archive dry-run identity stable

Read and pass persisted synced archive identity during dry-run so retries report
the same snapshot as apply. Test first-run and retry parity. Commit as
`fix(p16-t16): preserve dry run archive identity`.

### Task p16-t17: (review) Clean recap exports on summary failure

Route synced summary-export failure through attempt-owned recap cleanup without
removing adopted output. Add retry coverage. Commit as
`fix(p16-t17): clean failed recap exports`.

### Task p16-t18: (review) Make skill pushes fail closed

Add explicit push failure handling across inventoried lifecycle bookkeeping,
replace two hand-rolled scope prefix checks with `oat project scope`, document
push/pull JSON receipt fields, and validate all companion sites. Preserve
existing PR-scoped skill bumps. Commit as
`fix(p16-t18): fail closed on project push`.

### Task p16-t19: (review) Avoid half-pruned remote failures

Reorder or transactionally handle remote-ref deletion so transport failure
does not remove local checkouts first, and return actionable retry guidance.
Add real failure coverage. Commit as `fix(p16-t19): make prune failure atomic`.

### Task p16-t20: (review) Normalize invalid-slug command errors

Validate migrate/target slugs at command boundaries with exit 1, reuse the
canonical target ref, and test invalid filesystem basenames and explicit slugs.
Commit as `fix(p16-t20): normalize invalid slug errors`.

---

## Phase 17: Final lifecycle durability and provider parity

Goal: close every finding from the full-range review at `4b8c5986`, including
the lifecycle-artifact test dependency, declined pause publication recovery,
provider-view drift, and eleven contained correctness, portability, and docs
residuals.

### Task p17-t01: (review) Decouple release contracts from project artifacts

Remove the `design.md` dependency from the release-contract test or move the
asserted Git-floor contract to a durable shipped docs surface. Keep executable
coverage for quickstart and hook behavior, and prove the suite survives project
archive/migration. Commit as `test(p17-t01): decouple release contract artifacts`.

### Task p17-t02: (review) Retain clean pause commits on remote decline

Treat pre-receive and transport push failures as committed-pause publication
failures: retain a clean nested checkout when HEAD advanced, print exact retry
guidance, and add a real pre-receive-hook regression proving one pause commit
after retry. Commit as `fix(p17-t02): retain declined pause commits`.

### Task p17-t03: (review) Regenerate phase-implementer provider variants

Regenerate all Codex and Cursor model-specific phase-implementer views from the
canonical agent after the fail-closed push rule, and add parity coverage so
variant drift is detectable. Commit as `fix(p17-t03): sync implementer variants`.

### Task p17-t04: (review) Make doctor diagnose invalid default scope

Route doctor root resolution through the repair-tolerant config reader, align
command exit semantics, and add CLI-level invalid-`defaultScope` coverage.
Commit as `fix(p17-t04): diagnose invalid default scope`.

### Task p17-t05: (review) Deduplicate malformed materialized list rows

Attach malformed-record diagnostics to the materialized row or suppress the
duplicate `recorded-invalid` row, while retaining the absent-checkout degraded
row. Cover JSON and table output. Commit as
`fix(p17-t05): deduplicate invalid project rows`.

### Task p17-t06: (review) Explain prune recovery after remote deletion

Wrap local checkout-removal failure after successful remote deletion with
explicit state and safe retry guidance; cover a locked-worktree retry and guard
against accidental republish. Commit as `fix(p17-t06): guide partial prune recovery`.

### Task p17-t07: (review) Ignore custom-root archive snapshots

Manage the non-default root's archive-sibling ignore rule and remove test-owned
manual masking. Prove alternate and absolute-root completion leaves parent
status clean. Commit as `fix(p17-t07): ignore custom root archives`.

### Task p17-t08: (review) Make locale regression coverage effective

Drive locale-sensitive Git classification through a deterministic translated
stderr shim or remove redundant ineffective coverage in favor of the pinned
environment unit contract. Commit as `test(p17-t08): harden locale regression`.

### Task p17-t09: (review) Require configured commit allowlist roots

Make `projectRoots` mandatory in commit allowlist options and eliminate the
reachable hardcoded `.oat/projects` fallback. Update every caller and focused
type/runtime coverage. Commit as `refactor(p17-t09): require project roots`.

### Task p17-t10: (review) Normalize canonicalization failures

Wrap non-`ENOENT` realpath failures such as `ENOTDIR`, `ELOOP`, and `EACCES` in
path-specific `CliError` messages and test command-boundary behavior. Commit as
`fix(p17-t10): normalize canonical path errors`.

### Task p17-t11: (review) Harden skill validator command parsing

Recognize guarded/prefixed Git and project-push commands and generalize array
pathspec detection without allowing false positives. Add validator fixtures for
compound shell lines and nonstandard artifact arrays. Commit as
`fix(p17-t11): harden skill command validation`.

### Task p17-t12: (review) Document malformed project list rows

Document the `recorded-invalid` row, restore-record hint, and `recordError` JSON
field in the CLI reference, then run docs checks. Commit as
`docs(p17-t12): document invalid project rows`.

### Task p17-t13: (review) Protect scaffold gitignore edits

Apply the dirty-file guard during scaffold gitignore repair and handle an
unterminated managed block without mis-slicing or relocating user rules. Add
focused staged/unstaged and malformed-block tests. Commit as
`fix(p17-t13): protect scaffold gitignore repair`.

### Task p17-t14: (review) Clear ambient Git repository variables

Clear `GIT_COMMON_DIR`, object/alternate-object paths, namespace, and ceiling
directories for nested Git commands, with environment contract coverage.
Commit as `fix(p17-t14): isolate nested git environment`.

---

## Phase 18: Remote completion archive correction

Goal: prevent the final synced-links publication step from pushing an archived
project tree after archive side effects have already succeeded.

### Task p18-t01: (review) Prevent post-archive project push

**Finding:** Important `I1` from PR #227 comment `3886229171`.

**Step 1: Analyze the failure context**

Trace archive-enabled and archive-declined synced completion through the
pin-source push, `PROJECT_PATH` reassignment, final links rendering, final
project-ref receipt, and PR body update. Preserve the valid distinction between
the active project-ref authority and the archived PR artifact.

**Step 2: Implement the fix**

Confine `oat project push` for the final links artifact to
`PROJECT_SCOPE="synced"` with `SHOULD_ARCHIVE="false"`. Keep archive-aware link
rendering and PR-body consumption functional without requiring a
`PROJECT_REF_COMMIT` from the gitignored archive.

**Step 3: Verify targeted behavior**

Add executable contract coverage proving archive-enabled synced completion
never reaches the final project push after `PROJECT_PATH` moves, while both
configured and interactive non-archive paths still publish and validate their
full-SHA receipt. Run the focused completion transaction and skill-contract
suites plus skill validation.

**Step 4: Verify project commands and commit**

Run the relevant CI-order gates required by the changed skill/test surface,
including skill-version, formatting, lint, type, test, release, and docs
validation. Commit as `fix(p18-t01): prevent post-archive project push`.

---

## Phase 19: Final destructive-path and recovery hardening

Goal: close the final full-range review's reproduced path-identity, worktree,
and retry gaps, then align the closeout artifacts with the final implementation
state.

### Task p19-t01: (review) Require an exact project root for archive

**Finding:** Important `I1` from final review
`final-review-2026-08-29T134331Z.md`.

**Step 1: Understand the issue**

Archive currently accepts any descendant beneath a scope root and derives the
project identity from its basename. A descendant can therefore be copied as
one project while the record and checkout of another same-named project are
completed and removed.

**Step 2: Implement the fix**

Canonicalize the archive input before dry-run or mutation and require its
parent to equal the canonical shared, local, or synced scope root. Reassert the
same exact-root identity at the mutation boundary and bind the basename,
record, ref, source, and checkout to that direct child.

**Step 3: Verify**

Add shared/local descendant refusal coverage and a real-Git two-synced-project
basename-collision case proving neither project is copied, completed, or
removed. Run the focused archive/scope suites.

**Step 4: Commit**

Commit as `fix(p19-t01): require exact archive project root`.

### Task p19-t02: (review) Protect nested worktrees during local sync

**Finding:** Important `I2` from final review
`final-review-2026-08-29T134331Z.md`.

**Step 1: Understand the issue**

The local-sync guard checks only the selected root's `.git` marker. An ancestor
entry can therefore copy a nested worktree, or recursively remove it under
`--force` before copying.

**Step 2: Implement the fix**

Before any removal or copy, detect registered-worktree overlap and nested
`.git` file/directory markers beneath both source and destination trees. Refuse
the entire entry when either side overlaps a worktree; do not partially copy or
delete around it.

**Step 3: Verify**

Add ancestor-path tests in both sync directions, with absent and existing
destinations and with and without `--force`. Prove the nested checkout and its
unsaved sentinel remain untouched.

**Step 4: Commit**

Commit as `fix(p19-t02): protect nested worktrees in local sync`.

### Task p19-t03: (review) Reject external synced project roots before mutation

**Finding:** Important `I3` from final review
`final-review-2026-08-29T134331Z.md`.

**Step 1: Understand the issue**

The documented external absolute `projects.root` configuration can scaffold
and publish a synced checkout before parent-record confinement rejects it.
Rollback and the suggested prune route then also reject the outside path,
leaving local resources stranded.

**Step 2: Implement the fix**

Fail before gitignore repair, worktree creation, ref publication, or record
mutation when the resolved synced scope root is outside the canonical
repository. Preserve supported in-repository absolute and symlinked custom
roots. Align configuration documentation with the enforced constraint.

**Step 3: Verify**

Add a zero-side-effect external-root creation test covering checkout, worktree
registration, local/remote ref, record, active pointer, and parent index. Retain
positive coverage for confined custom roots and run docs checks.

**Step 4: Commit**

Commit as `fix(p19-t03): reject external synced project roots`.

### Task p19-t04: (review) Make final prune commit failure recoverable

**Finding:** Medium `M1` from final review
`final-review-2026-08-29T134331Z.md`.

**Step 1: Understand the issue**

Prune removes refs, checkouts, and the record before its final parent commit. If
that commit fails, only the staged deletion remains and target resolution no
longer finds a project for a CLI retry.

**Step 2: Implement the fix**

Provide a durable, exact-path completion route for the post-deletion boundary:
either recognize the staged record deletion as the same prune transaction or
persist a bounded receipt/tombstone. The retry must not recreate or re-delete
resources and must preserve unrelated parent changes.

**Step 3: Verify**

Inject the final record-commit failure in a real-Git test, retry through the
public CLI, and prove the exact deletion commit completes while unrelated
index/worktree state is unchanged.

**Step 4: Commit**

Commit as `fix(p19-t04): recover final prune commit failure`.

### Task p19-t05: (review) Bind archive retries to the source ref

**Finding:** Medium `M2` from final review
`final-review-2026-08-29T134331Z.md`.

**Step 1: Understand the issue**

Existing archive metadata omits the source ref/tree identity. A retry after a
post-copy failure can reuse the old archive even after a newer project commit
is pushed, then complete the record and export stale content.

**Step 2: Implement the fix**

Persist the authoritative source project-ref SHA or equivalent tree identity
before copying, include it in archive validation, and require an exact match on
retry. If the current source differs, fail with explicit recovery guidance or
start a new transactionally bound snapshot without overwriting unrelated data.

**Step 3: Verify**

Add an intervening-push retry regression proving stale archive/export content
cannot be accepted as the receipt for a newer retained ref. Preserve identical
retry idempotence.

**Step 4: Commit**

Commit as `fix(p19-t05): bind archive retry source identity`.

### Task p19-t06: (review) Refresh the durable project summary

**Finding:** Minor `m1` from final review
`final-review-2026-08-29T134331Z.md`.

**Step 1: Understand the issue**

`summary.md` still ends at `p17-t14` and omits the Phase 18 remote-review fix,
the passing Phase 18 review, the upstream PR #229 merge, and the current final
review remediation phase.

**Step 2: Implement the fix**

Regenerate or update the durable summary through the project-summary contract
so its last-task marker, phase overview, verification state, and next action
match the implemented project.

**Step 3: Verify**

Run formatting and the summary/project artifact checks; verify no stale Phase
17-only closeout claims remain.

**Step 4: Commit**

Commit as `docs(p19-t06): refresh final project summary`.

### Task p19-t07: (review) Correct the implementation resume header

**Finding:** Minor `m2` from final review
`final-review-2026-08-29T134331Z.md`.

**Step 1: Understand the issue**

The implementation header says Phase 18 review is pending even though the same
artifact records its passing result and project state has advanced.

**Step 2: Implement the fix**

Align the resume header with the completed Phase 18 review, the seven Phase 19
review tasks, and the next incomplete task without disturbing authoritative
lifecycle bookkeeping.

**Step 3: Verify**

Run plan validation and formatting, then confirm `state.md`, `plan.md`, and
`implementation.md` agree on Phase 19 progress and resume routing.

**Step 4: Commit**

Commit as `docs(p19-t07): align implementation resume state`.

---

## Implementation Complete

**Summary:**

- Phase 1: 10 tasks - Sync foundations (scope resolver, gitignore rule, git runner, fixture, record, ref-sync create/push/pull/continue/abort, record commits, GitHub spike)
- Phase 2: 13 tasks - CLI surface (`projects.defaultScope`, scope-aware scaffold, `new --scope`, `scope`, `push`, `pull`, `list`, e2e, `list --remote`, adopting pull + children, synced-aware `open`/`pause`, shared canonical mutation preflight, isolated child failures + stable split coverage)
- Phase 3: 19 tasks - Reviewer and lifecycle surface plus eight received review fixes (archive safety/retry identity, migration index safety, doctor working-tree/index leak detection, PR refresh isolation, reproducible merge evidence, local-sync text reason)
- Phase 4: 16 tasks - Skills sweep (A/B/C/D/arrival/PR), validator rules, docs, lockstep bump, DoD gates, skill-sweep dogfood, and five received-review durability/routing fixes
- Phase 5: 7 tasks - Final-review fixes for non-archive completion, migration/prune confinement, rollback/adoption recovery, semantic guard validation, and test imports
- Phase 6: 3 tasks - Final re-review fixes for late completion publication, ignored adoption-record durability, and current-pack managed-file repair
- Phase 7: 1 task - Operator-extended final receipt fix with repository-backed completion coverage
- Phase 8: 1 task - Second operator-extended recap-stage receipt recovery and interruption coverage
- Phase 9: 1 task - Third operator-extended exact final-links validation and decision-entrypoint coverage
- Phase 10: 14 tasks - Configured exit-gate remediation across doctor, completion, skill receipt handling, documentation, and project-bound recovery
- Phase 11: 3 tasks - Executable completion-retry routing, pull reference closure, and status-blind receipt hygiene
- Phase 12: 1 task - Normal-route retry decoding and publication-guard regression coverage
- Phase p-rev1: 1 task - Integrate merged PR #226 and reconcile overlapping skill, validation, docs, sync, and release surfaces
- Phase 13: 16 tasks - Post-merge final review fixes plus gate-review corrections for optional logs, scoped archive retries, failure-safe archive identity, locked stale registrations, local diagnostics, and release metadata
- Phase 14: 19 tasks - Final integration review fixes across custom roots, validators/config, arrival, doctor, safety/recovery residuals, skills/docs, and closeout alignment
- Phase 15: 19 tasks - Full-range final-review fixes for custom-root Git plumbing, conflict-safe pause recovery, offline creation, config durability, and residual portability/contract gaps
- Phase 16: 20 tasks - Final full-range safety fixes for custom-root archive completion, locale-stable Git, repository confinement, symlink canonicalization, lifecycle bookkeeping, and residual contract coverage
- Phase 17: 14 tasks - Final lifecycle durability and provider parity fixes for release contracts, declined pause publication, generated views, custom roots, diagnostics, validators, docs, and Git isolation
- Phase 18: 1 task - Remote-review correction preventing final project-ref publication from running against an archived synced project tree
- Phase 19: 7 tasks - Final destructive-path, worktree-overlap, external-root, prune/archive retry, and closeout-artifact corrections

**Total: 186 tasks**

**Recommended first act after completion:** `oat project migrate .oat/projects/shared/synced-project-scope --to synced` — dogfood the migration on this project before the final PR, then open the PR with the pinned-links block.

**Operator step after implementation:** delete the disposable spike repository `https://github.com/tkstang/disposable-test-repo-for-oat` (used by p01-t10); the implementing agent never deletes repositories.

The Phase 12 narrowed final lifecycle re-review passed with no findings, and
the historical configured exit-gate attempt subsequently passed at the
Important threshold. That stored result predates the PR #226 integration and
the Phase 13-14 effective delta, so it is not fresh closeout evidence for the
current branch. After Phase 14 receives a fresh independent final-project
review, generate and launch a refreshed configured exit gate against the
current effective delta. That refreshed gate has not run yet.

---

## References

- Design: `design.md`
- Spec: `spec.md`
- Discovery: `discovery.md`
- Design review (resolved): `reviews/archived/artifact-design-review-2026-08-27T004918Z.md`
