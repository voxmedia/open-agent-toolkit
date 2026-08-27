---
oat_status: in_progress
oat_ready_for: null
oat_blockers: []
oat_last_updated: 2026-08-27
oat_phase: plan
oat_phase_status: in_progress
oat_plan_parallel_groups: [] # groups of phases that run concurrently in worktrees; [] = fully sequential
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

**Step 2: Push a custom ref and test the three assumptions**

```bash
TREE=$(git hash-object -t tree /dev/null); C=$(git commit-tree "$TREE" -m "oat spike")
SPIKE=refs/oat/projects/spike; git update-ref "$SPIKE" "$C" && git push origin "$C:$SPIKE"
sleep 120   # give Actions time to create any run for the pushed ref
# A. No workflow run for the spike commit — authoritative negative result (NFR2):
gh run list --limit 50 --json headSha,event,headBranch --jq '.[]|select(.headSha=="'$C'")'   # expected: empty
# B. Commit renders although unreachable from any branch (FR7 assumption):
gh api "repos/{owner}/{repo}/commits/$C" --jq .sha                                              # expected: $C
gh browse "$C" --no-browser 2>/dev/null || echo "https://github.com/$(gh repo view --json nameWithOwner --jq .nameWithOwner)/commit/$C"  # open and confirm it renders
# C. Ref absent from branch list:
gh api "repos/{owner}/{repo}/branches" --jq '.[].name'                                          # expected: main only
```

Optionally also push a **branch** `oat/projects/spike` with the same commit and confirm a run **does** appear — that contrast makes the custom-ref result unambiguous.

**Step 3: Clean up**

```bash
git push origin ":$SPIKE"; cd .. && rm -rf oat-spike      # delete the spike ref and local clone only; the repository stays for the operator
```

If pushing to the disposable repository is not permitted for the implementing agent, stop and hand the three checks to the user — this task is a hard prerequisite for Phase 3's links work, not something to skip.

**Step 4: Record evidence**

Append `### p01-t10 GitHub spike` to `implementation.md` with the repository URL, spike SHA, the three raw outputs (A/B/C), timestamps, and confirmation the spike ref was deleted. If A is non-empty (a run was created for the custom ref) or B fails (commit not served), **stop the phase and surface it** — the design's contingency is a real branch under `refs/heads/oat/projects/*`, which is a design change and needs the user.

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
- Modify: `packages/cli/src/projects/split/__tests__/*` (add "split of a shared parent produces shared children")

**Step 1: Write test (RED)**

Using `createSyncedFixture()` (scaffold tests already use temp git repos; switch the new cases to the fixture so `origin` exists):

- `oat project split` of a `shared` parent → every child scaffolded under `shared/`, no refs created (NFR1); of a `synced` parent → children `synced`.

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

Command tests with an injected `pushSynced`: resolves target from path, slug, or active project; refuses non-synced project (`CliError`, message names the scope); `--message` forwarded; results map to exit codes (`pushed`/`up-to-date` → 0; `conflict`/`rejected` → 1 with the documented next-command text); `--json` envelope `{status, sha, ref, conflicts?, prRefresh?}`. `prRefresh` is `undefined` in this task (wired in p03-t03); `--no-refresh-pr` accepted and recorded.

Run: `pnpm --filter @open-agent-toolkit/cli exec vitest run src/commands/project/push/index.test.ts`
Expected: fails.

**Step 2: Implement (GREEN)**

`createProjectPushCommand(overrides)`; shared helper `resolveSyncedTarget(context, pathOrSlug, deps, opts?)` in `commands/project/sync/resolve-target.ts` (used by push/pull/links/prune/migrate) returning `SyncTarget` or throwing the scope error. Command arguments are documented as `[project-path|slug]` everywhere.

**Step 3: Verify**

Run: `pnpm --filter @open-agent-toolkit/cli exec vitest run src/commands/project/push/index.test.ts src/commands/project/sync`
Expected: green.

**Step 4: Format**

Run: `pnpm exec oxfmt --write packages/cli/src/commands/project/push/ packages/cli/src/commands/project/sync/resolve-target.ts packages/cli/src/commands/project/index.ts`

**Step 5: Commit**

```bash
git add packages/cli/src/commands/project/push/ packages/cli/src/commands/project/sync/resolve-target.ts packages/cli/src/commands/project/index.ts
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
- Exit codes: `created`/`updated`/`up-to-date` → 0; `conflict`/`dirty` → 1 with next-command text listing conflicted files.
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
- Modify: `packages/cli/src/commands/project/list.integration.test.ts` (and `list.test.ts` if present)
- Modify: `packages/control-plane/src/types.ts` (`ProjectSummary.scope?: 'shared' | 'local' | 'synced'`) — additive optional field

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

Run: `pnpm exec oxfmt --write packages/cli/src/commands/project/list.ts packages/cli/src/commands/project/list.integration.test.ts packages/control-plane/src/types.ts`

**Step 5: Commit**

```bash
git add packages/cli/src/commands/project/list.ts packages/cli/src/commands/project/list.integration.test.ts packages/control-plane/src/types.ts
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
- Modify: `packages/cli/src/fs/io.ts` (`copyDirectory` gains an optional `filter`)
- Modify: `packages/cli/src/e2e/workflow.test.ts` (archive step)

**Step 1: Write test (RED)**

Using the fixture with a pushed synced project:

- Dirty checkout → archive refuses (`CliError`, names `oat project push`); unpushed commit → refuses; nothing archived, nothing removed.
- Clean + pushed → archive dir exists with no `.git` entry; `worktree list` has no stale entry; record has `status:'complete'` + `completedAt`; parent `ls-tree HEAD` shows the updated record (and the summary export file when `archive.summaryExportPath` is configured) in one commit `chore(oat): complete synced project <slug>`; `origin` still has the ref; `computeLinksInput` still works.
- Re-run after success → idempotent (no second commit, no error).
- `shared` project → byte-identical behavior to existing tests (existing suite unchanged).
- e2e: extend the `synced project lifecycle` describe in `packages/cli/src/e2e/workflow.test.ts` (p02-t08) with `project push` → `project archive` through the real program; assert the parent commit, absent checkout, and retained origin ref.

Run: `pnpm --filter @open-agent-toolkit/cli exec vitest run src/commands/project/archive src/e2e/workflow.test.ts`
Expected: new cases fail.

**Step 2: Implement (GREEN)**

In `archiveProjectOnCompletion`: `if (await isSyncedCheckout(source))` → precondition via `removeSyncedCheckout` dry-check (`status` must not be `dirty`/`unpushed`) → copy with a filter excluding top-level `.git` (extend `copyDirectory` with an optional `filter`) → existing export/S3 → record update → `commitRecordChange` (unless `commit:false`) → `removeSyncedCheckout`. Dependencies injected for tests.

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

Run: `pnpm --filter @open-agent-toolkit/cli exec vitest run src/commands/project/prune/index.test.ts`
Expected: fails.

**Step 2: Implement (GREEN)**

`pruneSynced(t, git, { force, commit })`: `push <remote> :<ref>` → `update-ref -d` → `removeSyncedCheckout({force})` → `rm record` → `commitRecordChange`. Command reads `state.md` from the checkout when present; otherwise it fetches the ref and reads `git show <ref>:state.md` (an active project with a record and remote ref but no checkout — fresh worktree or clone — must still be guarded); only when the ref is gone does it fall back to `.oat/projects/archived/<slug>/state.md`.

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
- **Failure injected at step 5 (`commitRecordChange` throws)** → full rollback: source restored (`git reset -q -- <src> <record>` + `git checkout -- <src>`, index clean), record file deleted, destination worktree removed, local ref deleted, **remote ref deleted** (`push :<ref>`); `status --porcelain` empty; a retry of the same migrate command then succeeds from clean preconditions.
- `--to shared` → "not supported in v1" error.

Run: `pnpm --filter @open-agent-toolkit/cli exec vitest run src/commands/project/migrate/index.test.ts`
Expected: fails.

**Step 2: Implement (GREEN)**

`migrateSharedToSynced(t, git, opts)` implementing the six-step algorithm from `design.md` with a single recovery contract: **any** failure after the ref/worktree were created rolls back everything migrate created (destination worktree, local ref, remote ref, record file, and — for step-5 failures — the source restore), so a retry always starts from the documented preconditions. Command wrapper with `--to <synced>` (choices) and `--no-commit`.

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

- Modify: `.oat/projects/shared/synced-project-scope/implementation.md` (evidence only)

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

Expected: parent diff at every step is only the record file (then its deletion); pull in the linked worktree shows the pushed edit; links block renders with a real `github.com/.../blob/<sha>/` URL that opens; doctor is green; after prune `git ls-remote origin 'refs/oat/projects/*'` is empty and `git status` is clean except the two record commits (scaffold, prune) which are part of the branch history — squash or keep as evidence.

**Step 2: Record evidence**

Append `### p03-t10 dogfood` to `implementation.md`: commands, observed statuses, the rendered links block, doctor output summary.

**Step 3: Verify**

Run: `git ls-remote origin 'refs/oat/projects/*'; git worktree list`
Expected: no dogfood ref; no dogfood worktree.

**Step 4: Commit**

```bash
git add .oat/projects/shared/synced-project-scope/implementation.md
git commit -m "chore(p03-t10): record synced scope dogfood evidence"
```

---

## Phase 4: Skills, docs, release

Goal: the lifecycle uses the new scope end to end; docs describe it; release gates pass.

**Canonical skill snippet** (paste verbatim, replacing each inventoried bookkeeping commit; keep the existing `shared` branch unchanged):

```bash
PROJECT_SCOPE=$(oat project scope "$PROJECT_PATH" --format value 2>/dev/null || echo shared)
if [ "$PROJECT_SCOPE" = "synced" ]; then
  oat project push "$PROJECT_PATH" --message "<same message the git commit used>"
else
  <existing git add … && git commit … lines, unchanged>
fi
```

Arrival guard: `[ "$(oat project scope "$PROJECT_PATH" --format value 2>/dev/null)" = "synced" ] && oat project pull "$PROJECT_PATH"`.

Every touched `SKILL.md` gets a `version:` bump (patch for snippet-only edits, minor when behavior text changes). `oat-phase-implementer.md` is an agent and gets its frontmatter `version` bumped too.

### Task p04-t01: Bookkeeping sweep A — authoring skills

**Files:**

- Modify: `.agents/skills/oat-project-quick-start/SKILL.md` (5 sites: `:210`, `:262`, `:460`, `:468`, `:827-829`)
- Modify: `.agents/skills/oat-project-discover/SKILL.md` (`:552-553`)
- Modify: `.agents/skills/oat-project-spec/SKILL.md` (`:440-441`)
- Modify: `.agents/skills/oat-project-design/SKILL.md` (`:324`, `:576`, `:613`, `:762`)
- Modify: `.agents/skills/oat-project-plan/SKILL.md` (Step 15)
- Modify: `.agents/skills/oat-project-import-plan/SKILL.md` (`:429-436`)

**Step 1: Apply the snippet**

Replace each commit site with the guarded form. Where a site uses `git add "$PROJECT_PATH/"` (whole dir), the `synced` branch is a single `oat project push`. Bump each `version:`.

**Step 2: Verify**

Run: `pnpm oat:validate-skills && pnpm run check:skill-bumps && ! grep -rn 'jq' .agents/skills/oat-project-{quick-start,discover,spec,design,plan,import-plan}/SKILL.md`
Expected: exit 0 — validation passes; bump check passes; the negated grep finds no `jq` (a match would make the chain exit nonzero).

**Step 3: Format**

Run: `pnpm exec oxfmt --write .agents/skills/oat-project-quick-start/SKILL.md .agents/skills/oat-project-discover/SKILL.md .agents/skills/oat-project-spec/SKILL.md .agents/skills/oat-project-design/SKILL.md .agents/skills/oat-project-plan/SKILL.md .agents/skills/oat-project-import-plan/SKILL.md`

**Step 4: Commit**

```bash
git add .agents/skills/oat-project-quick-start .agents/skills/oat-project-discover .agents/skills/oat-project-spec .agents/skills/oat-project-design .agents/skills/oat-project-plan .agents/skills/oat-project-import-plan
git commit -m "feat(p04-t01): push synced artifacts from authoring skills"
```

---

### Task p04-t02: Bookkeeping sweep B — execution skills and agent

**Files:**

- Modify: `.agents/skills/oat-project-implement/references/plan-and-resume.md` (arrival pull where resume resolves the next boundary), `references/phase-execution.md` (`:665-667`), `references/completion-and-closeout.md` (`:112-114`, `:872-874`); `SKILL.md` version bump
- Modify: `.agents/agents/oat-phase-implementer.md` — no literal `git add` exists in this file; add a short **Synced-scope bookkeeping** paragraph under the ledger/recovery commit guidance stating that artifact and ledger commits use the scope guard + `oat project push`, while code task commits (`feat(pNN-tNN)`) are unchanged; bump frontmatter `version`
- Modify: `.agents/skills/oat-project-review-receive/SKILL.md` (`:529-534` only — `:399-400` is the generated _code_ fix-commit template and stays a branch commit; add a one-line note there: "fix tasks that edit synced artifacts use `oat project push`")
- Modify: `.agents/skills/oat-project-review-receive-remote/SKILL.md` (`:270-271`)
- Modify: `.agents/skills/oat-project-review-provide/SKILL.md` (Step 9.5 `:1064` — the required atomic commit of the review artifact + `plan.md`; for `synced` projects this becomes `oat project push` under the guard, since a branch commit cannot persist files inside the nested checkout)
- Modify: `.agents/skills/oat-project-revise/SKILL.md` (`:271-272` only — `:185-186` is the code fix-commit template; same one-line note)
- Modify: `.agents/skills/oat-project-reconcile/SKILL.md` (`:681-691`)

**Step 1: Apply the snippet**

Same as p04-t01. For `oat-phase-implementer.md`, code commits (`feat(pNN-tNN)`) are unchanged; only artifact/ledger commits become `oat project push` under the guard. Note in `phase-execution.md` that `oat state refresh` still runs first. Bump versions.

**Step 2: Verify**

Run: `pnpm oat:validate-skills && pnpm run check:skill-bumps`
Expected: pass. Note: `check:skill-bumps` only inspects `SKILL.md`; `references/*.md` edits are covered by the `SKILL.md` bump in the same skill.

**Step 3: Format**

Run: `pnpm exec oxfmt --write .agents/skills/oat-project-implement .agents/agents/oat-phase-implementer.md .agents/skills/oat-project-review-receive/SKILL.md .agents/skills/oat-project-review-receive-remote/SKILL.md .agents/skills/oat-project-review-provide/SKILL.md .agents/skills/oat-project-revise/SKILL.md .agents/skills/oat-project-reconcile/SKILL.md`

**Step 4: Commit**

```bash
git add .agents/skills/oat-project-implement .agents/agents/oat-phase-implementer.md .agents/skills/oat-project-review-receive .agents/skills/oat-project-review-receive-remote .agents/skills/oat-project-review-provide .agents/skills/oat-project-revise .agents/skills/oat-project-reconcile
git commit -m "feat(p04-t02): push synced artifacts from execution skills and phase implementer"
```

---

### Task p04-t03: Bookkeeping sweep C — summary, document, retro, brainstorm, wave

**Files:**

- Modify: `.agents/skills/oat-project-summary/SKILL.md` (`:427-447`)
- Modify: `.agents/skills/oat-project-document/SKILL.md` (`:492-510`, state commit only — doc commits stay on the branch)
- Modify: `.agents/skills/oat-project-retro/references/apply-procedure.md` (`:87-107`, `:162`, `:192-200`) + `SKILL.md` version bump
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

- Modify: `.agents/skills/oat-project-pr-final/SKILL.md` (`:280-320`: insert `oat project links "$PROJECT_PATH"` block into the body template for synced projects; `:299-301`: synced artifact paths are never linked as References — the block replaces them)
- Modify: `.agents/skills/oat-project-pr-progress/SKILL.md` (`:227-265`, `:246-247`, `:312`: same)
- Modify: `.agents/skills/oat-project-complete/SKILL.md` (steps 7–11.5: for synced projects run the design's 7-step state machine — finalize → `oat project push` → `oat project archive` (steps 3–6, commits record + summary export) → `oat project links --durable-summary <path>` → `gh pr edit`; step 10's bookkeeping commit becomes a no-op for synced projects; keep the anti-pattern note about never linking `archived/` paths)

**Step 1: Apply**

Bump versions. In `oat-project-complete`, state explicitly that archive refuses on a dirty/unpushed checkout and that the fix is `oat project push`.

**Step 2: Verify**

Run: `pnpm oat:validate-skills && pnpm run check:skill-bumps`
Expected: pass.

**Step 3: Format**

Run: `pnpm exec oxfmt --write .agents/skills/oat-project-pr-final/SKILL.md .agents/skills/oat-project-pr-progress/SKILL.md .agents/skills/oat-project-complete/SKILL.md`

**Step 4: Commit**

```bash
git add .agents/skills/oat-project-pr-final .agents/skills/oat-project-pr-progress .agents/skills/oat-project-complete
git commit -m "feat(p04-t05): embed pinned artifact links in PRs and complete synced projects"
```

---

### Task p04-t06: Skill validator rules for synced safety

**Files:**

- Modify: `packages/cli/src/validation/skills.ts`
- Modify: `packages/cli/src/validation/skills.test.ts`
- Create: `packages/cli/src/validation/synced-bookkeeping-sites.json`

**Step 1: Write test (RED)**

Validator fails any `oat-*` SKILL.md or `references/*.md` that (a) contains `git add` with a pathspec under `.oat/projects/synced/` (tree-wide), or (b) pipes `oat project scope` output into `jq` / parses its `--json` instead of using `--format value` (tree-wide, pattern-based: `project scope[^\n]*\|[^\n]*jq`). Do **not** ban the `jq` token globally — `oat-wrap-up`, `oat-project-review-provide-remote`, `oat-review-provide-remote`, `oat-docs-analyze`, `oat-docs-apply`, `oat-repo-knowledge-index`, `oat-agent-instructions-analyze`, and `oat-agent-instructions-apply` use `jq`/`--jq` legitimately today. Rule (c), lifecycle-scoped (`oat-project-*`, `oat-worktree-*`, `oat-brainstorm`, `oat-wave-execute`, `.agents/agents/oat-phase-implementer.md`): any `git add`/`git commit` line whose pathspec references a project-artifact variable (`$PROJECT_PATH`, `{PROJECT_PATH}`, `$ARTIFACT_PATH`, `$ACTIVE_PROJECT`, `$REVIEW_PATH`) must be preceded within the same fenced code block by the scope guard (`oat project scope … --format value`); an unguarded occurrence fails with file:line. Rule (d), inventory: a checked-in list `packages/cli/src/validation/synced-bookkeeping-sites.json` of every bookkeeping site swept in p04-t01..t05 (file + unique anchor phrase); the validator asserts each anchor still exists and is guarded, so procedural rewrites cannot silently drop a site. Fixtures: one passing guarded skill, one unguarded `$PROJECT_PATH` commit modeled on `oat-project-review-provide` Step 9.5, one with a stale inventory anchor. Passes the real skill tree after p04-t01..t05; fails a fixture skill for each rule.

Run: `pnpm --filter @open-agent-toolkit/cli exec vitest run src/validation/skills.test.ts`
Expected: fails.

**Step 2: Implement (GREEN)**

Add the two content rules alongside the existing frontmatter rules; error messages name the file and line. `design.md` Dependencies already states the narrowed rule (applied during plan review); the validator implements that wording.

**Step 3: Verify**

Run: `pnpm --filter @open-agent-toolkit/cli exec vitest run src/validation/skills.test.ts && pnpm oat:validate-skills`
Expected: green; real tree passes.

**Step 4: Format**

Run: `pnpm exec oxfmt --write packages/cli/src/validation/skills.ts packages/cli/src/validation/skills.test.ts`

**Step 5: Commit**

```bash
git add packages/cli/src/validation/skills.ts packages/cli/src/validation/skills.test.ts packages/cli/src/validation/synced-bookkeeping-sites.json
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
- Modify: `apps/oat-docs/docs/workflows/projects/index.md` (`## Contents` entry for the new page)
- Regenerate: `apps/oat-docs/index.md` via `pnpm -w run cli:source -- docs generate-index --docs-dir apps/oat-docs/docs --output apps/oat-docs/index.md`

**Step 1: Author**

Follow `apps/oat-docs/AGENTS.md` (frontmatter `title`/`description`, `.md` links in `## Contents`). Honor `oat-project-document` guidance: content traces to `design.md`; no speculation.

**Step 2: Verify**

Run: `pnpm check && pnpm build:docs && grep -n "Synced projects in worktrees" apps/oat-docs/docs/workflows/projects/implementation-execution.md`
Expected: markdownlint clean; docs build succeeds; the worktree section exists.

**Step 3: Format**

Run: `pnpm exec oxfmt --write apps/oat-docs/docs/reference/file-locations.md apps/oat-docs/docs/reference/oat-directory-structure.md apps/oat-docs/docs/reference/cli-reference.md apps/oat-docs/docs/workflows/projects/artifacts.md apps/oat-docs/docs/workflows/projects/lifecycle.md apps/oat-docs/docs/workflows/projects/pr-flow.md apps/oat-docs/docs/workflows/projects/implementation-execution.md apps/oat-docs/docs/workflows/projects/reviewing-oat-prs.md apps/oat-docs/docs/workflows/projects/index.md`

**Step 4: Commit**

```bash
git add apps/oat-docs/docs apps/oat-docs/index.md
git commit -m "docs(p04-t07): document the synced project scope and reviewer experience"
```

---

### Task p04-t08: Lockstep version bumps

**Files:**

- Modify: `packages/cli/package.json`, `packages/control-plane/package.json`, `packages/docs-config/package.json`, `packages/docs-theme/package.json`, `packages/docs-transforms/package.json` (`0.2.32` → `0.2.33`)
- Modify: `pnpm-lock.yaml` if the workspace references versions (run `pnpm install --lockfile-only`)

**Step 1: Apply**

Bump all five together (minor vs patch per repo release policy — patch unless policy says new CLI commands require minor; check `release:check-versions` output).

**Step 2: Verify**

Run: `pnpm release:check-versions > gate.log 2>&1; echo "exit=$?"; pnpm release:validate > gate2.log 2>&1; echo "exit=$?"`
Expected: both `exit=0`.

**Step 3: Commit**

```bash
git add packages/*/package.json pnpm-lock.yaml
git commit -m "chore(p04-t08): bump public packages to 0.2.33"
```

---

### Task p04-t09: Definition-of-Done gates

**Files:**

- Modify: `.oat/projects/shared/synced-project-scope/implementation.md` (gate evidence)

**Step 1: Run every gate, capturing exit codes explicitly**

```bash
for g in check type-check test build "run check:skill-bumps" release:check-versions release:validate build:docs; do
  pnpm $g > "gate-$(echo $g | tr ' :' '__').log" 2>&1; echo "$g exit=$?"
done
pnpm lint > gate-lint.log 2>&1; echo "lint exit=$?"      # required: .agents/skills touched
pnpm format > gate-format.log 2>&1; echo "format exit=$?"  # required: .agents/skills touched
```

**Step 2: Fix and re-run** until every exit is 0. Record the final exit list in `implementation.md`.

**Step 3: Commit**

```bash
git add .oat/projects/shared/synced-project-scope/implementation.md
git commit -m "chore(p04-t09): record definition-of-done gate results"
```

---

### Task p04-t10: Skill-sweep dogfood with the shipped snippets (manual)

**Files:**

- Modify: `.oat/projects/shared/synced-project-scope/implementation.md` (evidence only)

**Step 1: Run**

Exercise at least one rewritten bookkeeping site and one arrival site end to end, using the bundled skills exactly as shipped after p04-t01..t05 (sync provider views first: `pnpm run cli -- sync --scope all`):

```bash
oat() { pnpm run --silent cli -- "$@"; }
oat project new skill-dogfood --mode quick            # synced; becomes the active project
# 1. Bookkeeping site: run `oat-project-quick-start` discovery capture in this session (or paste its Step
#    snippet verbatim into a shell) so it executes the scope guard → `oat project push`.
git status --porcelain                                 # parent clean except the record file already committed
git -C .oat/projects/synced/skill-dogfood log --oneline # shows the bookkeeping commit
# 2. Arrival site: in a linked worktree run `oat-project-progress` (or its arrival snippet) and confirm it pulls.
git worktree add ../oat-skill-wt -b tmp/skill-dogfood
(cd ../oat-skill-wt && pnpm run worktree:init && oat() { pnpm run --silent cli -- "$@"; } && oat config set activeProject .oat/projects/synced/skill-dogfood && oat project pull skill-dogfood && ls .oat/projects/synced/skill-dogfood)
oat project prune skill-dogfood --force
oat config set activeProject .oat/projects/shared/synced-project-scope   # restore this project as active
git worktree remove ../oat-skill-wt && git branch -D tmp/skill-dogfood
```

Expected: the skill snippet chose the `synced` branch and pushed (no `git commit` of artifacts on the branch; `git log --oneline -3` shows only record commits); the arrival snippet created the checkout in the linked worktree; prune left `git ls-remote origin 'refs/oat/projects/*'` empty.

**Step 2: Record evidence**

Append `### p04-t10 skill dogfood` to `implementation.md`: which sites ran, the observed `oat project push`/`pull` JSON, and any snippet defects found (fix them in the same task with a follow-up skill version bump).

**Step 3: Verify**

Run: `pnpm oat:validate-skills && git ls-remote origin 'refs/oat/projects/*'`
Expected: validator passes; no dogfood ref.

If any file under `.agents/skills` or `.agents/agents` was edited in this task, also re-run the skill-covering gates with explicit exit codes and append the results to the p04-t09 gate record in `implementation.md`:

```bash
pnpm run check:skill-bumps > gate-skill-bumps.log 2>&1; echo "skill-bumps exit=$?"
pnpm lint > gate-lint.log 2>&1; echo "lint exit=$?"
pnpm format > gate-format.log 2>&1; echo "format exit=$?"
```

All three must exit 0 before the commit below (these are the only gates covering `.agents/skills`, and CI runs neither `lint` nor `format`).

**Step 4: Commit**

```bash
git add .oat/projects/shared/synced-project-scope/implementation.md
git commit -m "chore(p04-t10): record skill-sweep dogfood evidence"
```

---

## Reviews

| Scope  | Type     | Status          | Date       | Artifact                                                          | Reviewed Head | Invocation | Gate Target              |
| ------ | -------- | --------------- | ---------- | ----------------------------------------------------------------- | ------------- | ---------- | ------------------------ |
| p01    | code     | pending         | -          | -                                                                 | -             | -          | -                        |
| p02    | code     | pending         | -          | -                                                                 | -             | -          | -                        |
| p03    | code     | pending         | -          | -                                                                 | -             | -          | -                        |
| p04    | code     | pending         | -          | -                                                                 | -             | -          | -                        |
| final  | code     | pending         | -          | -                                                                 | -             | -          | -                        |
| spec   | artifact | pending         | -          | -                                                                 | -             | -          | -                        |
| design | artifact | fixes_completed | 2026-08-27 | reviews/archived/artifact-design-review-2026-08-27T004918Z.md     | -             | manual     | -                        |
| plan   | artifact | fixes_completed | 2026-08-27 | (structured auto-review x2, in-memory; findings applied in place) | -             | auto       | -                        |
| plan   | artifact | fixes_completed | 2026-08-27 | reviews/archived/artifact-plan-review-2026-08-27T013313Z.md       | -             | gate       | cursor-gpt-5-6-sol-xhigh |
| plan   | artifact | fixes_completed | 2026-08-27 | reviews/archived/artifact-plan-review-2026-08-27T013313Z.md       | -             | gate       | cursor-gpt-5-6-sol-xhigh |
| plan   | artifact | fixes_completed | 2026-08-27 | reviews/archived/artifact-plan-review-2026-08-27T014220Z.md       | -             | gate       | cursor-gpt-5-6-sol-xhigh |
| plan   | artifact | received        | 2026-08-27 | reviews/artifact-plan-review-2026-08-27T015823Z.md                | -             | -          | -                        |

**Status values:** `pending` → `received` → `fixes_added` → `fixes_completed` → `passed`

---

## Implementation Complete

**Summary:**

- Phase 1: 10 tasks - Sync foundations (scope resolver, gitignore rule, git runner, fixture, record, ref-sync create/push/pull/continue/abort, record commits, GitHub spike)
- Phase 2: 8 tasks - CLI surface (`projects.defaultScope`, scope-aware scaffold, `new --scope`, `scope`, `push`, `pull`, `list`, e2e)
- Phase 3: 10 tasks - Reviewer and lifecycle surface (links render/compute/refresh, archive state machine, `prune`, `migrate`, doctor, gitattributes, local-sync guard, dogfood)
- Phase 4: 10 tasks - Skills sweep (A/B/C/arrival/PR), validator rules, docs, lockstep bump, DoD gates, skill-sweep dogfood

**Total: 38 tasks**

**Recommended first act after completion:** `oat project migrate .oat/projects/shared/synced-project-scope --to synced` — dogfood the migration on this project before the final PR, then open the PR with the pinned-links block.

**Operator step after implementation:** delete the disposable spike repository `https://github.com/tkstang/disposable-test-repo-for-oat` (used by p01-t10); the implementing agent never deletes repositories.

Ready for code review and merge.

---

## References

- Design: `design.md`
- Spec: `spec.md`
- Discovery: `discovery.md`
- Design review (resolved): `reviews/archived/artifact-design-review-2026-08-27T004918Z.md`
