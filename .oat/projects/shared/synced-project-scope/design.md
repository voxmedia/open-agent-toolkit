---
oat_status: complete
oat_ready_for: oat-project-plan
oat_blockers: []
oat_last_updated: 2026-08-27
oat_generated: false
oat_template: false
---

# Design: synced-project-scope

## Overview

A `synced` project keeps its artifacts at the standard scope path `.oat/projects/synced/<slug>/`, exactly parallel to `shared/` and `local/`. The difference is storage: that directory is a **detached git worktree of the same repository**, checked out from the per-project ref `refs/oat/projects/<slug>`. The parent branch ignores the directory via the managed gitignore block (`.oat/projects/synced/*/` — directories only), so it never enters a PR; the nested worktree tracks every file inside it, so it has full history and travels through `origin` like any other git object. Skills keep reading and writing files at the path they already resolve from `activeProject`.

Three architectural decisions follow from that:

1. **Scope stays a directory convention.** No scope enum is introduced into config; scope is derived from the project path's parent directory name, and `synced` is additionally confirmed by the presence of a `.git` worktree pointer file. `projects.root` keeps meaning "the shared root"; siblings are derived via `dirname()` exactly as `archived/` is today. A new config key `projects.defaultScope` (default `synced`) drives creation.
2. **The CLI owns all git plumbing; skills own only _when_ to call it.** `oat project push|pull|prune|migrate|links|scope` encapsulate ref names, refspecs, worktree registration, rebase, and conflict reporting. Skills replace their bookkeeping `git add … && git commit …` with `oat project push` guarded by a scope check, and add `oat project pull` at arrival. This keeps the ~20 commit sites to a one-line change each and means the git mechanics exist in one tested module.
3. **A per-project tracked record is the only branch footprint.** `.oat/projects/synced/<slug>.json` (sibling of the ignored directory, so it lives inside the scope directory but matches no ignore rule) tells arriving agents and `oat project list` that the project exists. One file per project means concurrent PRs never conflict on it.

PR links are computed by the CLI from the ref's current commit and the parsed `origin` URL, emitted as a delimited block that PR-creating skills paste into the body and that `push` refreshes through `gh pr edit` whenever `state.md` records an open PR. Completion reuses the existing archive routine with worktree awareness (exclude the `.git` pointer from the snapshot; `git worktree remove` instead of `rm -rf`) and leaves the ref in place.

All load-bearing git behaviors were verified in a scratch repository during design: push to a custom ref, fresh-clone fetch + detached worktree add, conflict surfacing and `rebase --continue` inside a detached nested checkout, removal of a parent worktree that contains a nested ignored checkout (no `--force` needed), and `git clean -fd` / `-fdx` leaving the nested checkout untouched.

## Architecture

### System Context

```text
 work branch (refs/heads/feat/x)            project ref (refs/oat/projects/<slug>)
 ┌──────────────────────────────┐            ┌──────────────────────────────────┐
 │ src/…                        │            │ state.md  plan.md  design.md  …  │
 │ .oat/projects/synced/        │            │ reviews/  pr/  summary.md        │
 │   <slug>.json   ◄─ tracked   │            └──────────────────────────────────┘
 │   <slug>/       ◄─ ignored ──┼── nested detached worktree ──────┘
 │ .gitignore (OAT core block)  │
 └──────────────────────────────┘
          │ PR diff = code + <slug>.json                 │ oat project push/pull
          ▼                                              ▼
   GitHub PR body ── <!-- oat:project-links --> pinned blob/<sha>/design.md … ──► origin
```

**Key Components:**

- **Scope resolver** (`commands/shared/project-scope.ts`) — single source of truth for scope directory names, ref naming, record paths, default scope.
- **Git runner** (`commands/project/sync/git.ts`) — injectable `execFile` wrapper; every call is `git -C <dir> …` with explicit pathspecs.
- **Ref sync engine** (`commands/project/sync/ref-sync.ts`) — create, push, pull, continue, abort, remove checkout, prune, migrate.
- **Discovery record** (`commands/project/sync/record.ts`) — tracked per-project JSON with a versioned schema.
- **PR links** (`commands/project/links/`) — renders the delimited block; `refreshPrLinks()` used by push.
- **Gitignore/gitattributes management** — extends `CORE_ENTRIES`; adds a parallel managed `.gitattributes` block.
- **Archive integration** — worktree-aware copy and cleanup in `archiveProjectOnCompletion`.
- **Doctor checks** (`commands/doctor/synced-projects.ts`) — one dependency-injected check module.
- **Skill integration** — scope guard + push/pull at inventoried sites; `oat project links` embedded by PR skills.

### Component Diagram

```text
                     ┌────────────────────────────┐
  skills / agents ──►│ oat project scope|push|pull │──► ref-sync ──► git runner ──► origin
                     │ prune|migrate|links|new     │        │
                     └────────────┬───────────────┘        ├──► record.ts  (.oat/projects/synced/<slug>.json)
                                  │                        └──► links/     (gh pr edit)
              project-scope.ts ◄──┴──► scaffold.ts / list.ts / archive-utils.ts / doctor
```

### Data Flow

```text
new ──► ensure gitignore rule ──► empty-tree root commit ──► update-ref refs/oat/projects/<slug>
    ──► git worktree add --detach <path> <ref> ──► scaffold templates into <path>
    ──► push (commit + publish) ──► write <slug>.json ──► scaffold commit on branch (record [+ .gitignore])

push ──► add -A + commit (inside worktree, skipped if clean) ──► fetch +ref:ref ──► rebase onto ref
     ──► [conflict?] report files + `oat project pull --continue` : push origin HEAD:ref ──► update-ref local
     ──► [PR open?] refresh links block (from ref)

pull ──► fetch ──► [no checkout?] worktree prune + worktree add --detach : [dirty?] refuse : rebase
     ──► [conflict?] report files + `oat project pull --continue`

complete ──► finalize summary/state ──► push (final artifact commit) ──► [clean + pushed?] : refuse
         ──► archive copy (excluding .git pointer) / summary export / S3 ──► record.status = complete
         ──► commitRecordChange (record + summary export) on branch ──► worktree remove (no force) ──► ref retained
         ──► refresh PR block from ref with durable summary path
```

## Component Design

### Scope resolver — `commands/shared/project-scope.ts`

**Purpose:** single source of truth for scope names, directories, ref names, and record paths.

**Responsibilities:**

- Derive a project's scope from its path; map scope → directory.
- Detect a `synced` checkout; compute the ref and record path for a slug.
- Expose the default scope from config.

**Interfaces:**

```typescript
export type ProjectScope = 'shared' | 'local' | 'synced';
export const PROJECT_SCOPES: readonly ProjectScope[];
export const SYNCED_REF_NAMESPACE = 'refs/oat/projects';
export const SYNCED_REMOTE = 'origin';

export function resolveProjectsParent(
  repoRoot: string,
  projectsRoot: string,
): string; // dirname(root)
export function resolveScopeRoot(
  repoRoot: string,
  projectsRoot: string,
  scope: ProjectScope,
): string;
export function resolveProjectScope(
  projectPath: string,
  projectsRoot: string,
): ProjectScope | null;
export function syncedRefName(slug: string): string; // refs/oat/projects/<slug>
export function syncedRecordPath(scopeRoot: string, slug: string): string; // <scopeRoot>/<slug>.json
export async function isSyncedCheckout(projectPath: string): Promise<boolean>; // `.git` *file* present
export async function resolveDefaultScope(
  repoRoot: string,
  env: NodeJS.ProcessEnv,
): Promise<ProjectScope>;
```

**Dependencies:** `resolveProjectsRoot` (existing `@commands/shared/oat-paths`), `resolveEffectiveConfig`.

**Design Decisions:**

- Scope is derived from the path segment, never stored — `activeProject` stays a plain path and the 26 skills' resolution idiom is untouched.
- `archived` is not a `ProjectScope`; it is a lifecycle location and keeps its existing sibling derivation in `archive-utils.ts`.
- The slug rule is the existing project-name regex (`[a-zA-Z0-9_-]+`, no leading dash), which also guarantees the ref name is a valid refname with no path traversal.

### Git runner — `commands/project/sync/git.ts`

**Purpose:** the one place git is executed for sync.

**Interfaces:**

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
export const defaultGitRunner: GitRunner; // execFile('git', args) — never a shell
```

**Design Decisions:** extracted rather than reusing `review-remote/worktree.ts` (ephemeral, HEAD-only) or `scaffold.ts`'s inline `execFileSync`, but sized to what sync needs — not a general git library. `execFile` with an args array, never string interpolation into a shell.

### Ref sync engine — `commands/project/sync/ref-sync.ts`

**Purpose:** create, publish, materialize, reconcile, and remove a project's ref and checkout.

**Interfaces:**

```typescript
export interface SyncTarget {
  repoRoot: string; // the worktree the command runs in (may itself be a linked worktree)
  slug: string;
  projectPath: string; // <scopeRoot>/<slug>
  ref: string; // refs/oat/projects/<slug>
  remote: string; // origin
}

export type PushResult = {
  status: 'pushed' | 'up-to-date' | 'rejected' | 'conflict';
  sha: string;
  conflicts?: string[];
};
export type PullResult = {
  status: 'created' | 'updated' | 'up-to-date' | 'conflict' | 'dirty';
  sha: string;
  conflicts?: string[];
};

export async function createSyncedProject(
  t: SyncTarget,
  git: GitRunner,
): Promise<void>;
export async function pushSynced(
  t: SyncTarget,
  git: GitRunner,
  opts: { message?: string },
): Promise<PushResult>;
export async function pullSynced(
  t: SyncTarget,
  git: GitRunner,
): Promise<PullResult>;
export async function continueSynced(
  t: SyncTarget,
  git: GitRunner,
): Promise<PullResult>;
export async function abortSynced(t: SyncTarget, git: GitRunner): Promise<void>;
export async function removeSyncedCheckout(
  t: SyncTarget,
  git: GitRunner,
): Promise<void>;
export async function pruneSynced(t: SyncTarget, git: GitRunner): Promise<void>;
export async function migrateSharedToSynced(
  t: SyncTarget,
  git: GitRunner,
): Promise<{ sha: string; branchCommit: string }>;

/**
 * The only path that mutates the parent branch. Stages exactly the given
 * pathspecs (each must match the parent-branch allowlist below) and commits.
 * Returns null when nothing was staged. Used by new, migrate, archive, prune.
 */
export async function commitRecordChange(
  repoRoot: string,
  pathspecs: string[],
  message: string,
  git: GitRunner,
): Promise<{ sha: string } | null>;
```

**Git sequences (verified in a scratch repo during design and review):**

- `create`: `hash-object -t tree /dev/null` → `commit-tree <tree> -m "chore(oat): init synced project <slug>"` → `update-ref <ref> <commit>` → `worktree add --detach <projectPath> <ref>`.
- `push` (commit-first, so the rebase always runs on a clean checkout): nested-worktree guard → `add -A` → `commit -m <message>` (skipped when the index is clean) → `fetch <remote> +<ref>:<ref>` (missing remote ref tolerated on first push) → if HEAD is not a descendant of `<ref>`: `rebase <ref>` → on conflict return `conflict` (the checkout is now in exactly the same rebase-in-progress state as a pull conflict; `oat project pull --continue` finishes it, then `oat project push` completes the publish) → `push <remote> HEAD:<ref>` (never `--force`) → on success `update-ref <ref> HEAD`. A push with a clean index and HEAD already equal to the remote ref returns `up-to-date` without creating a commit.
- `pull`: `fetch` → if `projectPath` absent: `worktree prune` then `worktree add --detach <projectPath> <ref>` → else if `status --porcelain` non-empty: return `dirty` → else `rebase <ref>`.
- `continue`/`abort`: `rebase --continue` with `GIT_EDITOR=true` / `rebase --abort`, then re-evaluate as pull.
- `removeSyncedCheckout` (archive path): precondition `status --porcelain` empty **and** HEAD equals the fetched `<ref>` (i.e. nothing unpushed) → `worktree remove <projectPath>` (no `--force`) → `worktree prune`. Precondition failure returns `dirty` / `unpushed` and names `oat project push` as the fix.
- `prune` (project-wide): enumerate every registered checkout of `<slug>` across all worktrees of the repository (`worktree list --porcelain`, entries whose path ends in `/.oat/projects/synced/<slug>`) → apply the `removeSyncedCheckout` preconditions to each; refuse without `--force` if any is dirty or unpushed, naming the path; `--force` permits `worktree remove --force` because the user explicitly asked to discard → remove and unregister every checkout → `push <remote> :<ref>` → `update-ref -d <ref>` → delete record file → `commitRecordChange([recordPath], "chore(oat): prune synced project <slug>")`.
- `migrate` (`shared` → `synced`), one algorithm, in order:
  1. Preconditions: `git status --porcelain -- <src>` empty (source tracked and clean); `origin` configured; no existing `<ref>`, record, or `<dest>` directory; gitignore rule present (self-heal as in `create`).
  2. `create` the ref and register `<dest> = .oat/projects/synced/<slug>` as the detached worktree (empty tree).
  3. Copy every file from `<src>` into `<dest>` (source has no `.git`; nothing to exclude).
  4. In `<dest>`: `add -A` → `commit -m "chore(oat): migrate <slug> to synced scope"` → `push <remote> HEAD:<ref>` → `update-ref <ref> HEAD`.
  5. Parent branch: `git rm -r -q -- <src>` (removes index entries **and** files) → write the record → `commitRecordChange([<src>, recordPath, ".gitignore" if changed], "chore(oat): migrate <slug> to synced scope")` — exactly one branch commit.
  6. If `activeProject` pointed at `<src>`, retarget it to `<dest>`.
  - Rollback contract (one for every failure point; the pre-migration branch HEAD is captured before step 1): remove everything migrate created — `worktree remove --force <dest>`, `update-ref -d <ref>`, `push <remote> :<ref>` if the push had succeeded, delete the record file, restore `.gitignore` if this run self-healed it. For failures inside step 5 before the commit: `git reset -q -- <src> <recordPath>` and `git checkout -- <src>`. For failures after the branch commit (step 6, `activeProject` retarget): `git reset --soft <captured HEAD>` followed by the same path-scoped restore, so unrelated staged or working-tree changes that pre-dated the migration are untouched. After rollback the migration preconditions hold again, so a retry runs the full algorithm from step 1; nothing is resumed in place.
  - End-state assertions (also the integration test): `<src>` absent from the index and filesystem; `<dest>` registered (`worktree list`) and clean; parent `status --porcelain` empty after exactly one new commit; record present in `git ls-tree HEAD`; `<ref>` present on `origin`; `activeProject` retargeted.

**Mutation invariants (replace any single global guard):**

1. **Nested-worktree mutations** (`add`, `commit`, `rebase`, `rebase --continue/--abort`) run with `cwd = projectPath` and first assert `git rev-parse --show-toplevel == projectPath`. Invariant failure is a bug, not a user error: `CliError` exit 2 before any mutation.
2. **Common-dir / ref mutations** (`update-ref`, `worktree add|remove|prune`, `fetch`, `push`) run with `cwd = repoRoot` and may name only `<ref>` (or `HEAD:<ref>` / `:<ref>`) and `projectPath`. Normal publication never carries `--force`, `--force-with-lease`, or `+` on the push refspec. The sole exception is migration rollback: it may restore or delete only an invocation-owned remote state with `--force-with-lease=<ref>:<owned-sha>`, so a later competing update is never rewritten.
3. **Parent-branch index mutations** happen only through `commitRecordChange`, whose pathspec allowlist is: the project's record file, `.gitignore`, `.gitattributes`, the migration source directory (for `git rm`), and the configured `archive.summaryExportPath` file. Any other pathspec is rejected before staging. Never `add -A`, never a directory glob, never `--force`.

**Design Decisions:**

- The local ref `refs/oat/projects/<slug>` doubles as the remote mirror (fetched with a `+` refspec into the same name) — one ref, no `refs/remotes/` indirection. Each nested worktree's detached HEAD is its working state, reconciled against that ref.
- `update-ref` happens after a successful push, never before, so the local ref never claims a commit `origin` has not accepted.
- Commit-first push means a conflict is always a rebase of committed work — nothing is ever stashed, and the agent's edits are already durable in the nested history when it starts resolving.
- Push performs exactly one fetch/rebase cycle; a second rejection (a genuine race) is reported as `rejected` with "pull, then push again" rather than looping.
- Record mutations and ref pushes are distinct, explicitly ordered operations: the ref is published first, then the branch commit is made, so a failure between them leaves a retryable state (ref ahead, record stale) rather than a record that advertises something `origin` does not have.

### Discovery record — `commands/project/sync/record.ts`

**Purpose:** read/write the tracked per-project JSON; the branch-side breadcrumb.

**Interfaces:**

```typescript
export async function readSyncedRecord(
  path: string,
): Promise<SyncedProjectRecord | null>;
export async function writeSyncedRecord(
  path: string,
  record: SyncedProjectRecord,
): Promise<void>;
export async function listSyncedRecords(
  scopeRoot: string,
): Promise<SyncedProjectRecord[]>;
```

**Design Decisions:** written by scaffold (create) and migrate, updated by completion (`status`, `completedAt`), and deleted by prune. Every one of those mutations is made durable on the parent branch by the CLI itself through `commitRecordChange` (messages: `chore(oat): scaffold <slug>`, `… migrate <slug> to synced scope`, `… complete synced project <slug>`, `… prune synced project <slug>`), with `--no-commit` available for library callers that manage their own commits (mirrors the existing `commit` opt-in on `scaffoldProject`). Push does **not** touch the record — a per-push field would turn the record into a merge-conflict magnet across branches, and the ref on `origin` is the authority anyway.

### PR links — `commands/project/links/`

**Purpose:** render the delimited block and refresh an open PR.

**Interfaces:**

```typescript
export type LinkableArtifact = 'discovery.md' | 'design.md' | 'summary.md';
export const LINKABLE_ARTIFACTS: readonly LinkableArtifact[]; // allowlist; plan/state/implementation never
export interface LinksInput {
  slug: string;
  sha: string;
  ref: string;
  originUrl: string;
  present: LinkableArtifact[];
  durableSummaryPath?: string;
  pinnedAt: string;
}
export const LINKS_START = '<!-- oat:project-links:start -->';
export const LINKS_END = '<!-- oat:project-links:end -->';
export function renderLinksBlock(input: LinksInput): string;
export function replaceLinksBlock(body: string, block: string): string; // inserts at end if absent
export function parseGitHubOrigin(
  url: string,
): { owner: string; repo: string } | null; // ssh + https forms
export async function refreshPrLinks(
  t: SyncTarget,
  prUrl: string,
  deps: { gh: GhRunner },
): Promise<'refreshed' | 'skipped' | 'failed'>;
```

**Rendered block (GitHub origin):**

```markdown
<!-- oat:project-links:start -->

**OAT project** `synced-project-scope` (synced) — pinned to `refs/oat/projects/synced-project-scope` @ `a1b2c3d` (2026-08-26)
[Discovery](https://github.com/o/r/blob/<sha>/discovery.md) · [Design](https://github.com/o/r/blob/<sha>/design.md) · [Summary](https://github.com/o/r/blob/<sha>/summary.md)
Durable summary: `docs/project-summaries/20260826-synced-project-scope.md`

<!-- oat:project-links:end -->
```

**Design Decisions:** GitHub origins get `blob/<sha>/<file>` links; any other host gets the ref name + short SHA as plain text — degrade, don't guess URL schemes. `refreshPrLinks` runs `gh pr view --json body`, replaces the block, and `gh pr edit --body-file`; `gh` missing or unauthenticated returns `skipped` with a warning. `LinksInput` is computed from the **ref**, not the checkout: `sha = rev-parse <ref>` (after fetch) and `present = ls-tree --name-only <ref>` filtered by the allowlist. That keeps links valid after push (never ahead of `origin`) and, critically, computable after completion has removed the checkout. `replaceLinksBlock` treats a start marker without an end marker (or vice versa) as malformed: it returns the body unchanged and `refreshPrLinks` reports `skipped` with a warning — it never guesses where the block ends. When `durableSummaryPath` is supplied, the durable line is appended below the ref links; the ref links themselves are always re-rendered from the ref and are never dropped.

### Gitignore / gitattributes — `commands/init/gitignore.ts`, new `commands/init/gitattributes.ts`

`CORE_ENTRIES` gains `.oat/projects/synced/*/` (trailing slash = directories only, so `<slug>.json` stays tracked). `applyOatCoreGitattributes(repoRoot)` mirrors the gitignore block pattern (`# OAT core` / `# END OAT core` markers in `.gitattributes`) with the single entry `.oat/projects/shared/** linguist-generated=true`. Both are called from the same two sites (`oat init`, `oat tools update`). `createSyncedProject` runs `git check-ignore -q <projectPath>` and calls `applyOatCoreGitignore` when the rule is missing, so a repo that upgraded the CLI but never re-ran init still gets a correct scaffold; the changed `.gitignore` is included in the scaffold commit.

### Archive integration — `commands/project/archive/archive-utils.ts`

Completion of a `synced` project is an explicit ordered state machine. `oat-project-complete` owns steps 1–2 and 7 (it already finalizes state and edits the PR); `oat project archive` owns steps 3–6 and refuses to start unless its precondition holds. Each step is safe to retry after a failure at any later step.

| #   | Owner   | Step                                                                                                                                                                                                                                                                                                                                                                                                                                                    | Retry safety                                                                        |
| --- | ------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------- |
| 1   | skill   | Finalize `summary.md` and `state.md` in the checkout through the skill-owned, path-confined completion flow (`oat project complete-state` plus exact-path project-ref publication). Receipt recovery runs before project-log or lifecycle mutations and skips this transition when a valid chain already exists.                                                                                                                                        | Idempotent file writes; retry never rewrites a valid receipt chain.                 |
| 2   | skill   | `oat project push` — the final artifact commit reaches `<ref>` on `origin`.                                                                                                                                                                                                                                                                                                                                                                             | `up-to-date` on repeat.                                                             |
| 3   | archive | **Precondition:** checkout clean and HEAD == fetched `<ref>` (nothing unpushed). Otherwise refuse with `oat project push` as the fix. Nothing below runs on a dirty or unpushed checkout.                                                                                                                                                                                                                                                               | Pure check.                                                                         |
| 4   | archive | Persist `record.archiveSnapshot` (stable snapshot name — the retry identity; the target resolver honors it instead of suffixing on retry); copy the checkout to `.oat/projects/archived/<name>` with a filter that skips the top-level `.git` pointer and `reviews/`; write archive metadata; export `summary.md` to `archive.summaryExportPath`; export the selected project recap when present; S3 sync.                                              | Re-run reuses the same snapshot/export; existing target-durability logic untouched. |
| 5   | archive | Write `record.status = 'complete'`, `completedAt`; lifecycle commit `commitRecordChange([recordPath, summaryExportFile?, ...immutableRecapExportPaths], "chore(oat): complete synced project <slug>")`; the SHA is returned as `lifecycleCommit` for recap re-attestation. The skill owns the second evidence-only commit and confines it with `git commit --only` to exactly `manifest.json` + `build-record.json`, preserving unrelated staged state. | No-op commits when already recorded; evidence commit retried alone.                 |
| 6   | archive | `removeSyncedCheckout` — `worktree remove` **without** `--force` (guaranteed safe by step 3) → `worktree prune`. The ref is retained.                                                                                                                                                                                                                                                                                                                   | Skipped when the checkout is already absent.                                        |
| 7   | skill   | Refresh the PR block from the ref: `oat project links --durable-summary <path>` → `gh pr edit` (existing step 11.5 site). Links resolve because the ref still exists.                                                                                                                                                                                                                                                                                   | Idempotent block replacement.                                                       |

For `shared` projects, archive preserves its storage and publication behavior with four explicit deltas: the snapshot omits `reviews/` (FR18), `.oat-archive-source.json` records `scope: shared`, paths outside the configured scope roots are refused, and a byte-identical existing summary or recap export is accepted as an idempotent retry. Archive target selection otherwise retains the existing ignored-primary and dated-collision behavior.

### Doctor — `commands/doctor/synced-projects.ts`

`checkSyncedProjects(repoRoot): Promise<DoctorCheck[]>`, injected through `DoctorDependencies` and pushed in `runChecksForScope`:

| Condition                                                        | Status      | Fix hint                                   |
| ---------------------------------------------------------------- | ----------- | ------------------------------------------ |
| Record exists, checkout absent                                   | warn        | `oat project pull <slug>`                  |
| Local ref ≠ remote ref (after a cheap `ls-remote`)               | warn        | `oat project pull` / `oat project push`    |
| Checkout has uncommitted changes                                 | warn        | `oat project push`                         |
| Files under `.oat/projects/synced/*/` tracked on the branch      | fail        | `oat project migrate` or `git rm --cached` |
| Record `schemaVersion` unknown                                   | fail        | upgrade CLI                                |
| `.gitignore` block lacks the synced rule                         | warn        | `oat tools update`                         |
| Editor settings hint (VS Code/Cursor, no `git.scanRepositories`) | pass + note | documented setting                         |

### Scaffold, list, open, pause

`oat project open` resolves a slug across all scope roots (ambiguity → error) and pulls an absent synced checkout before opening; `oat project pause` pushes the paused `state.md` before clearing the active pointer. Every command, skill, and agent that resolves, reads on arrival, or writes project artifacts is enumerated in the checked-in inventory that the skill validator enforces.

`ScaffoldProjectOptions` gains `scope?: ProjectScope` (default from `resolveDefaultScope`). For `synced`, `scaffoldProject` calls `createSyncedProject` before writing templates into the checkout, then `pushSynced` (initial commit `chore(oat): scaffold <slug>`), writes the record, and commits the record (plus `.gitignore` if changed) on the branch through `commitRecordChange` (the existing `commitScaffold` becomes a thin caller of it). `oat project split` seeds children and coordination parents by calling `scaffoldProject` with the parent's scope (`resolveProjectScope(parentPath, projectsRoot)`), never the config default, so a `shared` parent keeps `shared` children (NFR1). `oat project list` enumerates all three sibling roots — `shared` (`projects.root`), `synced`, and `local` — reports `scope` per row, and `--scope <shared|synced|local>` filters. Listing `local` is an explicit additive change recorded in the spec (Non-Goals / NFR1): `local` projects were never enumerated before, which the maintainer treats as an existing gap; resume of a `local` project is path-based via `activeProject` and is unchanged.

### Skill integration

A shared snippet replaces each inventoried bookkeeping commit:

```bash
PROJECT_SCOPE=$(oat project scope "$PROJECT_PATH" --format value)   # prints: shared | local | synced
if [ "$PROJECT_SCOPE" = "synced" ]; then
  oat project push "$PROJECT_PATH" --message "chore(oat): bookkeeping after p03"
else
  git add "$PROJECT_PATH/state.md" … && git commit -m "…"   # unchanged
fi
```

Arrival sites add `oat project pull "$PROJECT_PATH"` under the same guard. `oat project scope --format value` prints the bare scope word so shell skills need no JSON parser — `jq` is deliberately **not** a dependency, matching the existing skill boilerplate which only ever uses `oat config get`. `oat project scope` is a tiny read-only command so skills never reimplement path parsing. PR skills call `oat project links "$PROJECT_PATH"` and paste the block into the body template; `oat-project-complete` passes `--durable-summary <path>` when the export is configured.

**Inventoried sites (from recon):**

- Bookkeeping → push: `oat-project-quick-start` (5 sites), `oat-project-discover`, `oat-project-spec`, `oat-project-design` (4), `oat-project-plan`, `oat-project-implement` phase-execution + closeout (3), `oat-phase-implementer` ledger commits, `oat-project-review-receive` (+`-remote`), `oat-project-revise` (2), `oat-project-reconcile`, `oat-project-summary`, `oat-project-document` (2), `oat-project-import-plan`, `oat-project-complete` (2), `oat-project-retro` apply-procedure, `oat-brainstorm` fold-back + reference-file, `oat-wave-execute` gate commits.
- Arrival → pull: `oat-project-progress` (also switches enumeration to `oat project list --json`), `oat-worktree-bootstrap`, `oat-worktree-bootstrap-auto`, `oat-cursor-cloud-projects`, `oat-project-implement` resume.
- PR body: `oat-project-pr-final`, `oat-project-pr-progress`, `oat-project-complete` (the only existing `gh pr edit` site).
- Local-path sync guard: `oat-worktree-bootstrap*` / `oat local sync` must skip any directory containing a `.git` file.

## Data Models

### SyncedProjectRecord — `.oat/projects/synced/<slug>.json` (tracked)

**Purpose:** the branch-side breadcrumb: "a synced project named `<slug>` exists; pull it from this ref."

**Schema:**

```typescript
interface SyncedProjectRecord {
  schemaVersion: 1;
  slug: string; // == filename stem, == project directory name
  scope: 'synced';
  ref: string; // 'refs/oat/projects/<slug>'
  remote: string; // 'origin'
  status: 'active' | 'complete';
  createdAt: string; // ISO 8601 UTC
  completedAt: string | null;
}
```

**Validation Rules:**

- `slug` matches the existing project-name rule and equals the filename stem.
- `ref` equals `syncedRefName(slug)`; `remote` equals `origin` (constant in v1).
- Unknown `schemaVersion` → doctor `fail`; commands refuse with an upgrade hint.
- Parsed with a zod schema (repo convention).

**Storage:**

- **Location:** one file per project inside the scope directory; matches no ignore rule.
- **Persistence:** 2-space JSON with trailing newline (formatter-stable). Created by scaffold/migrate, updated by completion, deleted by prune. Never touched by push.

### Ref and worktree layout (git)

```text
refs/oat/projects/<slug>            local ref = mirror of origin's ref (fetched with + refspec)
.oat/projects/synced/<slug>/.git    worktree pointer file → <common-dir>/worktrees/<id>
.oat/projects/synced/<slug>/        tree root == project directory (state.md, plan.md, …)
```

History is linear by construction (rebase-on-pull, no merges, no force). Every project ref starts from the same empty tree (`4b825dc…`) but a distinct root commit, because the init message carries the slug; fixtures must compare tree hashes, not commit hashes, when asserting "freshly created".

### Config additions

```typescript
projects?: {
  root: string;                                   // unchanged: '.oat/projects/shared'
  defaultScope?: 'shared' | 'local' | 'synced';   // new; default 'synced'
};
```

`projects.defaultScope` is a structural, shared-scope key (same treatment as `projects.root`); env override `OAT_PROJECTS_DEFAULT_SCOPE`. Ref namespace and remote name are constants, not config, until there is a concrete reason to vary them.

### state.md and control-plane

No new `state.md` frontmatter: scope is derived from the path; push reads only the existing `oat_pr_status` / `oat_pr_url` to decide whether to refresh the PR body. `oat project list --json` rows gain `scope: ProjectScope`; `ProjectState` is unchanged.

## API Design

All commands live under `oat project`. They resolve the project from an explicit path argument, a bare slug (resolved under the `synced` root, falling back to the record file when the checkout is absent), else `activeProject`, and refuse with a scope error when the resolved project is not `synced` (except `scope` and `new`). Every command supports `--json` with a `status` field; exit code 0 for success/no-op, 1 for actionable user states (`conflict`, `rejected`, `dirty`, wrong scope, missing remote) via `CliError`, 2 for system errors.

### `oat project new <name> [--scope <shared|local|synced>] …`

Existing flags unchanged. `--scope` defaults to `projects.defaultScope`. For `synced`: creates ref + checkout, scaffolds, pushes, writes record, scaffold-commits the record (+ `.gitignore` when the block was applied). Requires a configured `origin`; otherwise fails with a hint to add one or use `--scope local`.

**JSON:** `{ status: 'ok', projectPath, scope, ref?, sha?, scaffoldCommit? }`

### `oat project push [project-path|slug] [--message <msg>] [--no-refresh-pr]`

Commits pending artifact changes first, then reconciles with `origin` and publishes (commit-first order; see Ref sync engine). Refreshes the PR links block when `state.md` has `oat_pr_status: open` and `oat_pr_url` set, unless `--no-refresh-pr`. On `conflict`, the checkout is left mid-rebase with the pending edits already committed; resolve, then `oat project pull --continue`, then `oat project push`.

**JSON:** `{ status: 'pushed' | 'up-to-date' | 'rejected' | 'conflict', sha, ref, conflicts?: string[], prRefresh?: 'refreshed' | 'skipped' | 'failed' }`

### `oat project pull [project-path|slug] [--continue | --abort]`

Materializes or rebases. `--continue` after resolving conflicts (from either a pull or a push); `--abort` returns to the pre-rebase state.

**JSON:** `{ status: 'created' | 'updated' | 'up-to-date' | 'conflict' | 'dirty', sha, ref, conflicts?: string[] }`

### `oat project scope [project-path] [--format json|value]`

Read-only. `--format value` (the shell-skill form) prints exactly one of `shared`, `local`, `synced` and nothing else. `--json` / `--format json`: `{ status: 'ok', projectPath, scope, ref?, record?: SyncedProjectRecord, checkout: 'present' | 'absent' | 'n/a' }`.

### `oat project links [project-path|slug] [--format markdown|json] [--durable-summary <repo-relative-path>]`

Prints the block for the **ref's** current commit (fetching first), so it works before, during, and after the checkout exists. `--format json` returns `LinksInput` plus rendered `markdown`.

### `oat project prune <project-path|slug> [--force] [--no-commit]`

Project-wide: acts on every registered checkout of the slug in every worktree of the repository, not only the current one. Refuses when `state.md` (in the checkout or the last archived snapshot) has `oat_pr_status: open`, or when the checkout is dirty or unpushed, unless `--force`. Warns that pinned links will stop resolving. Removes remote ref, local ref, checkout, and record, then commits the record deletion on the branch (`--no-commit` to skip).

### `oat project migrate <project-path> --to synced [--no-commit]`

`shared` → `synced` only in v1, using the six-step algorithm in Ref sync engine. Refuses on a dirty or untracked source, missing `origin`, or an existing ref/record/destination. Updates `activeProject` if it pointed at the migrated path. Produces exactly one branch commit.

### `oat project archive [project-path] [--no-commit]` (existing)

For `synced` projects: refuses unless the checkout is clean and pushed; runs steps 3–6 of the completion state machine; commits the record update (and summary export) on the branch. `--no-commit` is reserved for manual/library callers: it still removes the checkout but intentionally returns no lifecycle commit receipt, so `oat-project-complete` must never pass it. Shared projects retain their existing publication behavior subject to the explicit archive deltas documented above.

### `oat project pull` — adoption and children (FR16/FR17)

When the slug has no record and no checkout on the current branch, `pull` fetches `refs/oat/projects/<slug>`; if it exists on `origin`, it creates the checkout, writes the record, and commits it through `commitRecordChange` (`--no-commit` to skip). Nothing about the ref is rewritten and the originating branch is irrelevant — this is how a project parked on another branch, created on another machine, or created by another user becomes local. After pulling a coordination parent (`oat_kind: coordination`), `pull` reads `oat_children` from the pulled `state.md` and pulls each child the same way; `--no-children` opts out; per-child failures are reported and do not roll back the parent or siblings.

**JSON:** adds `adopted: boolean` and `children?: Array<{ slug; status }>`.

### `oat project list [--scope <shared|synced|local>] [--remote]`

`--remote` additionally runs one `ls-remote origin 'refs/oat/projects/*'` and appends rows for refs with no record on the current branch, marked `remote` (`checkout: absent`, hint `oat project pull <slug>`). Offline, `--remote` warns and lists local rows only.

### `oat project list [--scope <shared|synced|local>]`

Adds a `scope` column and filter; enumerates the `shared`, `synced`, and `local` siblings of `projects.root` (listing `local` is additive — see spec).

### Config

- `projects.defaultScope` — `shared | local | synced`, default `synced`, shared-scope structural key, env `OAT_PROJECTS_DEFAULT_SCOPE`.

### Managed files

- `.gitignore` core block: adds `.oat/projects/synced/*/`.
- `.gitattributes` core block (new): `.oat/projects/shared/** linguist-generated=true`.
- Both applied by `oat init` and `oat tools update`; the gitignore entry is also self-healed by `oat project new --scope synced`.

## Discovery across machines and users

- **What travels:** the ref (all artifact history) and, once a branch carrying it merges, the record file. The ref alone is sufficient: `oat project list --remote` and adopting `pull` (FR16) work from `ls-remote`, so a project parked on an unmerged branch, created on another machine, or created by a teammate is one command away on any checkout with git access to `origin`.
- **What does not travel:** `local` scope (never leaves the machine — unchanged), and `refs/oat/*` through GitHub **forks** (forks copy branches and tags only). `git clone` also fetches only `refs/heads/*` and `refs/tags/*`, which is why every sync command fetches the project ref explicitly; `git clone --mirror` / mirror pushes do replicate the namespace.
- **Garbage collection:** `refs/oat/projects/<slug>` is a real ref locally and on `origin`, so every object reachable from it is a GC root on both sides — the same mechanism that keeps `refs/pull/*` commits alive on GitHub. `git fetch --prune` / `git remote prune` touch only `refs/remotes/*`; `git worktree prune` touches registrations, not refs; a detached nested checkout's HEAD is itself a GC root, so unpushed artifact commits are safe too. Only `oat project prune`, an explicit `push :refs/oat/…`, or repository deletion removes them.
- **Coordination projects:** each child has its own ref and record; pulling the parent pulls the children (FR17).
- **Archive contents (FR18):** the local `archived/<name>/` snapshot and the S3 snapshot both omit `reviews/`; S3 additionally omits `pr/` as today.

## Security Considerations

### Authentication

None new. Git operations use the user's existing git credential chain for `origin`; PR refresh uses the user's existing `gh` authentication and degrades to a warning when absent. No cloud credentials are read (NFR3).

### Authorization

Whoever can push branches to `origin` can push `refs/oat/*`. Repositories that restrict pushes by ref pattern (e.g. GitHub rulesets scoped to `refs/heads/**`) are unaffected; a ruleset that denies all non-branch refs would block push with a clear remote error, surfaced verbatim.

### Data Protection

- **Encryption:** in transit via the git remote transport (SSH/HTTPS); at rest as ordinary git objects.
- **PII Handling:** artifacts are the same content as today's `shared` scope; the design moves them, it does not add data. Reviews and PR artifacts are excluded from S3 upload exactly as today.
- **Input Validation:** slugs validated by the existing project-name regex before being embedded in ref names or paths; record JSON validated with zod; PR body mutation is confined to the delimited block; artifact link targets come from a fixed allowlist.

### Threat Mitigation

- **Shell injection:** all git/gh invocations use `execFile` with argument arrays; no shell.
- **Parent-checkout damage:** the three mutation invariants in Ref sync engine — nested-worktree commands assert `--show-toplevel == projectPath`; common-dir commands may name only `<ref>` and `projectPath`; parent-branch staging goes only through `commitRecordChange` with its pathspec allowlist. No `-A` outside the nested worktree; no unleased force-push anywhere; the only leased push is the owned-SHA migration rollback, and `worktree remove --force` is limited to rollback or `prune --force` (NFR4).
- **Ref hijack / traversal:** ref names are derived from validated slugs only; `..`, `/`, and control characters are rejected upstream.
- **PR body tampering:** `replaceLinksBlock` only replaces text between the two markers; if markers are malformed (start without end), refresh is skipped with a warning rather than guessing.

## Performance Considerations

### Scalability

Every operation is proportional to the artifact tree (tens of small files), never to the repository. Fetch and push use a single refspec. `oat project list` reads one small JSON per synced project. Hundreds of retained `refs/oat/projects/*` refs cost nothing measurable on either side.

### Caching

The local ref is the cache of `origin`'s state; doctor's "behind/ahead" check uses one `ls-remote` per repo (not per project) and is skipped offline.

### Database Optimization

Not applicable — no database.

### Resource Limits

- **Memory / CPU:** negligible; child-process git.
- **Network:** one fetch + one push per bookkeeping point (~1–3 s on a typical connection). Bookkeeping frequency is unchanged from today's branch commits, which are already pushed with the branch.

## Error Handling

### Error Categories

- **User Errors (exit 1, `CliError`):** not a synced project; no `origin` remote; checkout dirty on pull; rebase conflict; push rejected after one reconcile cycle; record missing or malformed; prune refused (open PR). Each message names the state and the exact next command.
- **System Errors (exit 2):** git not on PATH; git older than the minimum (worktree add on a ref requires ≥ 2.5; detected once via `git --version`); filesystem failures. Synced rebase inspection uses portable `git rev-parse --git-path` output resolved against the checkout and does not require the Git 2.31+ `--path-format` option. Surfaced verbatim.
- **External Service Errors:** `gh` missing/unauthenticated or PR edit failing → `prRefresh: 'skipped' | 'failed'` with a warning; push still succeeds. Network failure during fetch/push → user error with the git message.

### Conflict flow (push or pull)

1. Push has already committed pending edits (commit-first), so a conflict from either command is a rebase of committed local work onto `<ref>`. `git rebase` stops → command returns `status: 'conflict'`, `conflicts: [files]`.
2. Message: "Resolve conflicts in `.oat/projects/synced/<slug>/…`, then run `oat project pull <path-or-slug> --continue` (or `oat project pull <path-or-slug> --abort`)." The target is always echoed explicitly (shell-quoted) because the conflicted project need not be `activeProject` — e.g. an adopting pull from another checkout.
3. Skill guidance: the agent resolves in place (artifact files are markdown; `state.md` is last-writer-wins by intent) and continues. `push` after a successful `--continue` completes the original operation. `--abort` restores the pre-rebase detached HEAD with the local commit intact — nothing the agent wrote is lost either way.

### Retry Logic

Push: exactly one fetch → rebase → push cycle; a second rejection returns `rejected` (never loops, never forces). PR refresh: no retry; next push retries naturally.

### Logging

- **Info:** each git phase (`fetch`, `rebase`, `commit`, `push`), resulting SHA, PR refresh outcome.
- **Warn:** PR refresh skipped/failed; gitignore rule self-healed; `ls-remote` unavailable (doctor).
- **Error:** the categories above; JSON mode emits `{ status, error, fix }`.

## Testing Strategy

### Requirement-to-Test Mapping

| ID   | Verification       | Key Scenarios                                                                                                                                                                                                                                                                                                                                                                                                             |
| ---- | ------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| FR1  | integration        | scaffold synced → `git check-ignore` true; nested `git log` shows init + scaffold; parent `status --porcelain` shows only record                                                                                                                                                                                                                                                                                          |
| FR2  | unit               | `--scope` each value → correct directory; no flag → `projects.defaultScope`; config `shared` → shared                                                                                                                                                                                                                                                                                                                     |
| FR3  | integration        | push to bare origin; up-to-date no-op creates no commit; parent index untouched; **dirty local + remote advanced (non-overlapping files) → commit, rebase, push succeeds; overlapping files → `conflict`, pending edits present in nested `git log`, `pull --continue` then `push` succeeds**; second concurrent push → `rejected`. Authority: nested checkout HEAD vs `rev-parse <ref>` on origin                        |
| FR4  | integration        | fresh clone pull creates checkout; second pull `up-to-date`; dirty → `dirty`; divergent edit → `conflict` → `--continue` → push succeeds; `--abort` leaves local commit intact                                                                                                                                                                                                                                            |
| FR5  | unit + integration | zod schema accept/reject; two branches adding different records merge cleanly (git merge in fixture); **after completion and after prune, `git ls-tree HEAD -- <record>` on the parent branch shows the updated/absent record and `status --porcelain` is empty**. Authority: parent branch committed tree                                                                                                                |
| FR6  | manual + unit      | skill-sweep dogfood on a scratch synced project after the sweep lands (plan p04-t10); skill validator asserts no `git add` of `synced` paths and no `oat project scope` output piped to `jq` in `oat-*` skills                                                                                                                                                                                                            |
| FR7  | unit + integration | render with subsets of present artifacts; replace idempotent (twice = once); missing markers appended; **malformed markers → body unchanged, `skipped`**; **with `--durable-summary`, the durable line is appended below the ref links and every ref link is still present**; links computed from ref with checkout absent; non-GitHub origin plain text; `gh` mocked refresh. Authority: rendered block string / PR body |
| FR8  | integration        | archive synced project → **refused when dirty or unpushed**; success → snapshot has no `.git`; `worktree list` has no stale entry; record `complete` committed on the parent branch; ref still on origin; `links` still renders from the ref. Authority: archive dir, parent tree, origin refs                                                                                                                            |
| FR9  | unit + integration | `CORE_ENTRIES` contains rule; upgrade of existing block idempotent; record file not ignored, directory ignored                                                                                                                                                                                                                                                                                                            |
| FR10 | integration        | two linked worktrees each pull; push from A, pull in B → identical tree; remove worktree A → pull in B still works                                                                                                                                                                                                                                                                                                        |
| FR11 | integration        | prune with open PR refuses; dirty/unpushed refuses; `--force` removes ref/record/checkout and **commits the record deletion on the parent branch**. Authority: origin refs, `worktree list`, parent tree                                                                                                                                                                                                                  |
| FR12 | integration        | migrate fixture shared project → the six end-state assertions from the algorithm (source absent from index and disk, dest registered and clean, parent clean after exactly one commit, record in `ls-tree HEAD`, ref on origin, active pointer retargeted); dirty source → refuse; failure injected before step 5 → branch untouched                                                                                      |
| FR13 | unit               | each doctor condition with injected git runner                                                                                                                                                                                                                                                                                                                                                                            |
| FR14 | manual             | `pnpm build:docs` + review                                                                                                                                                                                                                                                                                                                                                                                                |
| FR15 | unit               | gitattributes block created/updated/no-change                                                                                                                                                                                                                                                                                                                                                                             |
| FR16 | integration        | `list --remote` exposes an origin-only ref without a local record; pulling that slug in a second clone creates the checkout and commits its discovery record without rewriting the retained ref; retry is `up-to-date`                                                                                                                                                                                                    |
| FR17 | integration        | pulling a coordination parent materializes each available child, reports a missing child without rolling back successful siblings, and completes pending parent/child adoption after `pull --continue`; `--no-children` opts out                                                                                                                                                                                          |
| FR18 | integration        | archive fixtures for both shared and synced scopes contain project artifacts but omit `reviews/`; S3 sync arguments retain the `reviews/*` exclusion                                                                                                                                                                                                                                                                      |
| NFR1 | unit + integration | existing `scaffold.test.ts`, `archive` tests, `gitignore.test.ts` pass unchanged; shared project flow unchanged in e2e; **`local` project: `oat project new --scope local` lands under `local/`, appears in `list` with `scope: local` and under `--scope local` (additive), resumes via `activeProject`, and is never touched by push/pull/archive changes**. Authority: `list --json`, filesystem                       |
| NFR2 | manual             | push to a GitHub test repo with an `on: push` workflow → no run triggered; ref absent from branch list                                                                                                                                                                                                                                                                                                                    |
| NFR3 | integration        | e2e synced push/pull with every `AWS_*` variable unset and an isolated executable path containing `git` but no `gh`; JSON push succeeds with `prRefresh: skipped`, a human-mode retry emits the unavailable-CLI warning, and pull still materializes the ref                                                                                                                                                              |
| NFR4 | integration        | parent `status --porcelain` identical before/after push/pull/links/scope; for new/migrate/archive/prune the only parent-tree delta is the allowlisted pathspecs; runner spy asserts no `--force` on `push`, no `add -A` with `cwd = repoRoot`, and `worktree remove --force` only under `prune --force`                                                                                                                   |
| NFR5 | integration        | pull twice; interrupted rebase → `--continue`/`--abort`                                                                                                                                                                                                                                                                                                                                                                   |
| NFR6 | manual             | DoD gates incl. `check:skill-bumps`, `release:check-versions`                                                                                                                                                                                                                                                                                                                                                             |

### Unit Tests

- **Scope:** `project-scope.ts`, `record.ts`, `links/*`, `gitignore.ts`/`gitattributes.ts`, `doctor/synced-projects.ts`, scaffold option plumbing.
- **Coverage Target:** 90% on new modules.
- **Key Test Cases:** listed above; `GitRunner` is injected so unit tests assert exact argument arrays (and the absence of `--force` / unscoped `add`).

### Integration Tests

- **Scope:** ref-sync engine end to end; scaffold/push/pull/prune/migrate/archive against a real git.
- **Test Environment:** new fixture helper `createSyncedFixture()` in `packages/cli/src/__tests__/` — `mkdtemp` + `git init --bare origin` + one or two clones/linked worktrees with `user.email/name` set, following `scaffold.test.ts`'s `initGitRepo` pattern; cleaned in `afterEach`.
- **Key Test Cases:** the FR3/FR4/FR8/FR10/FR12 rows above.

### End-to-End Tests

- **Scope:** `packages/cli/src/e2e/workflow.test.ts` gains a `synced` variant of the project lifecycle (new → push → pull in a second worktree → archive).
- **Test Scenarios:** default scope is `synced`; `--scope shared` path unchanged.

## Deployment Strategy

### Build Process

Unchanged: Turborepo → `tsc` → `dist/`; bundled skills/templates/docs ship inside `@open-agent-toolkit/cli`.

### Deployment Steps

1. Lockstep version bump of the five public packages; version bump on every touched skill.
2. `pnpm release:validate`, then the normal npm publish pipeline.
3. Users upgrade the CLI and run `oat tools update`, which refreshes bundled skills and applies the new gitignore/gitattributes entries.

### Rollback Plan

Set `projects.defaultScope: shared` to stop creating synced projects; existing synced projects remain readable as plain files and can be migrated back manually (copy files, `git add`, `oat project prune`). Downgrading the CLI leaves synced checkouts intact but without push/pull.

### Configuration

- **Environment Variables:** `OAT_PROJECTS_DEFAULT_SCOPE` (optional override).
- **Feature Flags:** none — `projects.defaultScope` is the switch.

### Monitoring

CLI tool; `oat doctor` is the monitoring surface (FR13).

## Migration Plan

### Migration Steps (per repository)

1. Upgrade the CLI; run `oat tools update` (gitignore + gitattributes blocks, refreshed skills). Commit the managed-file change.
2. New projects default to `synced`. Nothing else changes for existing `shared`/`local` projects.
3. Optionally convert an in-flight `shared` project: `oat project migrate .oat/projects/shared/<slug> --to synced`. This yields exactly one branch commit that deletes the tracked artifacts and adds the record; the artifacts' branch history remains in git history.
4. This project dogfoods step 3 on itself as the first act after implementation completes (before its final PR), not mid-implementation — see the plan-level note in `plan.md`.

### Rollback Strategy

Reverse migration is manual and documented: copy the checkout's files into `.oat/projects/shared/<slug>/`, `git add` them, `oat project prune <slug> --force`, remove the record. No data is lost at any step because the ref is retained until prune.

### Data Validation

`oat doctor` after migration: record present, checkout present, ref in sync, no tracked files under `synced/*/`.

## Open Questions

- **GitHub acceptance of `refs/oat/*` pushes and blob rendering for those commits:** verified locally against a bare repo, not yet against GitHub. Phase 1 includes a manual spike on a scratch GitHub repo before the links component is built.
- **Editor hint content:** exact VS Code/Cursor setting to recommend (`git.scanRepositories` vs. `git.repositoryScanMaxDepth`); resolve while writing docs.
- **`oat local sync` interaction:** confirm the default `localPaths` never includes `.oat/projects/synced` and add the `.git`-file guard regardless.

## Implementation Phases

### Phase 1: Sync foundations

**Goal:** the git core exists and is proven against a bare origin.

**Tasks:**

- `project-scope.ts`, `sync/git.ts`, `sync/ref-sync.ts`, `sync/record.ts` with unit + integration tests and the `createSyncedFixture()` helper.
- Gitignore `CORE_ENTRIES` entry + tests.
- Manual spike: push a ref to a scratch GitHub repo, confirm blob URL renders and no workflow fires (NFR2, open question 1).

**Verification:** FR1/FR3/FR4/FR5/FR9/FR10/NFR4/NFR5 integration rows green.

### Phase 2: CLI surface

**Goal:** users can create and sync projects.

**Tasks:**

- `projects.defaultScope` config key (catalog, defaults, env, validation).
- `oat project new --scope`, scaffold integration, record + scaffold commit.
- `oat project push`, `pull`, `scope`; `list` scope column/filter.
- e2e workflow variant.

**Verification:** FR2 unit; e2e green; `oat project new` in this repo produces a synced project with a clean parent status.

### Phase 3: Reviewer and lifecycle surface

**Goal:** PR links, completion parity, hygiene commands.

**Tasks:**

- `links/` module + `oat project links`; PR refresh in push.
- Archive integration (filtered copy, worktree removal, record completion).
- `oat project prune`, `oat project migrate`.
- Doctor check module; gitattributes block.

**Verification:** FR7/FR8/FR11/FR12/FR13/FR15 rows green; CLI dogfood on a scratch synced project (create → push → pull in a linked worktree → links → doctor → prune). Self-migration of this project is deferred to after completion — the bookkeeping skills the running implementation session depends on are rewritten in Phase 4.

### Phase 4: Skills, docs, release

**Goal:** the workflow uses the new scope end to end.

**Tasks:**

- Bookkeeping/arrival/PR-body sweep across inventoried skills and agents with the scope-guard snippet; skill validator rule; version bumps.
- Docs: file-locations, directory-structure, project workflow, worktrees, "reviewing an OAT PR"; editor hint.
- Lockstep package bump; full DoD gates.

**Verification:** FR6/FR14/NFR6 manual rows; dogfood one rewritten bookkeeping site and one arrival site on a scratch synced project using the shipped snippets.

## Dependencies

### External Dependencies

- **git ≥ 2.5** (worktree add on arbitrary commit-ish); realistically any git from the last several years.
- **gh CLI** (optional) for PR body refresh.
- No other runtime tools for lifecycle scope detection: shell skills use `oat project scope --format value`; `jq` is not a dependency of any lifecycle snippet (unrelated skills that already use `jq`/`--jq` for GitHub API work are unaffected).

### Internal Dependencies

- `resolveProjectsRoot`, `resolveEffectiveConfig`, config catalog (`commands/config/index.ts`), `scaffoldProject`/`commitScaffold`, `applyOatCoreGitignore`, `archiveProjectOnCompletion`, `DoctorDependencies`, control-plane `listProjects`.
- Lifecycle skills and agents enumerated under Skill integration.

### Development Dependencies

- vitest fixtures with real git; no new packages.

## Risks and Mitigation

- **Nested `.git` pointer confuses a tool** (formatter, linter, `oat local sync`): Probability: Medium | Impact: Low
  - **Mitigation:** ignore rule; `.git`-file guard in local sync; doctor check.
  - **Contingency:** move checkouts to the git common dir with a symlink at the scope path (design keeps all paths behind `project-scope.ts`, so this is a one-module change).
- **GitHub rejects or does not render custom-ref commits:** Probability: Low | Impact: High
  - **Mitigation:** Phase 1 manual spike before building links.
  - **Contingency:** fall back to `refs/heads/oat/projects/<slug>` behind a constant, accepting CI filtering guidance in docs.
- **A skill still commits synced artifacts on the branch:** Probability: Medium | Impact: Medium
  - **Mitigation:** inventory-driven sweep; skill validator rule; doctor `fail` on tracked synced files.
  - **Contingency:** `oat project migrate` re-homes the files; the offending commit is a normal revert.
- **Archive copies `.git` pointer or leaves stale registration:** Probability: High if unaddressed | Impact: Medium
  - **Mitigation:** explicit filter + `worktree remove`; integration test FR8.
  - **Contingency:** `git worktree prune` and delete the stray file — both documented.
- **Stale pinned links in PR body:** Probability: Medium | Impact: Medium
  - **Mitigation:** refresh on every push while the PR is open; block shows short SHA + date.
  - **Contingency:** `oat project links` + manual `gh pr edit`.
- **Default-scope change surprises an upgraded repo:** Probability: Medium | Impact: Low
  - **Mitigation:** scaffold self-heals the gitignore rule and says so; `projects.defaultScope: shared` opts out; release notes call it out.
  - **Contingency:** none needed — `shared` remains fully supported.

## References

- Specification: `spec.md`
- Discovery: `discovery.md`
- Knowledge Base: `.oat/repo/knowledge/project-index.md`
- Architecture Docs: `.oat/repo/knowledge/architecture.md`
- Conventions: `.oat/repo/knowledge/conventions.md`
