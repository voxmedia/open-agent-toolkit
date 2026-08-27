---
oat_status: in_progress
oat_ready_for: null
oat_blockers: []
oat_last_updated: 2026-08-26
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

```
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

```
                     ┌────────────────────────────┐
  skills / agents ──►│ oat project scope|push|pull │──► ref-sync ──► git runner ──► origin
                     │ prune|migrate|links|new     │        │
                     └────────────┬───────────────┘        ├──► record.ts  (.oat/projects/synced/<slug>.json)
                                  │                        └──► links/     (gh pr edit)
              project-scope.ts ◄──┴──► scaffold.ts / list.ts / archive-utils.ts / doctor
```

### Data Flow

```
new ──► ensure gitignore rule ──► empty-tree root commit ──► update-ref refs/oat/projects/<slug>
    ──► git worktree add --detach <path> <ref> ──► scaffold templates into <path>
    ──► push (commit + publish) ──► write <slug>.json ──► scaffold commit on branch (record [+ .gitignore])

push ──► fetch +ref:ref ──► rebase HEAD onto ref ──► add -A (inside worktree) ──► commit
     ──► push origin HEAD:ref ──► update-ref local ──► [PR open?] refresh links block

pull ──► fetch ──► [no checkout?] worktree prune + worktree add --detach : [dirty?] refuse : rebase
     ──► [conflict?] report files + `oat project pull --continue`

complete ──► summary export / archive copy (excluding .git pointer) / S3 ──► worktree remove
         ──► record.status = complete ──► ref retained
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
): Promise<{ sha: string }>;
```

**Git sequences (verified):**

- `create`: `hash-object -t tree /dev/null` → `commit-tree <tree> -m "chore(oat): init synced project <slug>"` → `update-ref <ref> <commit>` → `worktree add --detach <projectPath> <ref>`.
- `push`: `fetch <remote> +<ref>:<ref>` (missing remote ref tolerated on first push) → if HEAD is not a descendant of `<ref>`: `rebase <ref>` → `add -A` → `commit -m <message>` (skipped when the index is clean) → `push <remote> HEAD:<ref>` (never `--force`) → on success `update-ref <ref> HEAD`.
- `pull`: `fetch` → if `projectPath` absent: `worktree prune` then `worktree add --detach <projectPath> <ref>` → else if `status --porcelain` non-empty: return `dirty` → else `rebase <ref>`.
- `continue`/`abort`: `rebase --continue` with `GIT_EDITOR=true` / `rebase --abort`, then re-evaluate as pull.
- `removeSyncedCheckout`: `worktree remove --force <projectPath>` → `worktree prune`.
- `prune`: `push <remote> :<ref>` → `update-ref -d <ref>` → `removeSyncedCheckout` → delete record.
- `migrate`: `create` into a temp path → copy tracked artifact files in → first push → `git rm -r --cached -- <shared project dir>` → move directory to `synced/` (or remove and re-add worktree) → write record → single branch commit `chore(oat): migrate <slug> to synced scope`.

**Design Decisions:**

- The local ref `refs/oat/projects/<slug>` doubles as the remote mirror (fetched with a `+` refspec into the same name) — one ref, no `refs/remotes/` indirection. Each nested worktree's detached HEAD is its working state, reconciled against that ref.
- `update-ref` happens after a successful push, never before, so the local ref never claims a commit `origin` has not accepted.
- `add -A` is safe because `cwd` _is_ the nested worktree; the parent index is never addressed. A guard asserts `git rev-parse --show-toplevel` equals `projectPath` before any mutating command.
- Push performs exactly one fetch/rebase cycle; a second rejection (a genuine race) is reported as `rejected` with "pull, then push again" rather than looping.

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

**Design Decisions:** written by scaffold (create), completion (`status`, `completedAt`), and deleted by prune. Push does **not** touch the record — a per-push field would turn the record into a merge-conflict magnet across branches, and the ref on `origin` is the authority anyway.

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

**Design Decisions:** GitHub origins get `blob/<sha>/<file>` links; any other host gets the ref name + short SHA as plain text — degrade, don't guess URL schemes. `refreshPrLinks` runs `gh pr view --json body`, replaces the block, and `gh pr edit --body-file`; `gh` missing or unauthenticated returns `skipped` with a warning. Links are computed from the artifact checkout's HEAD after push, so they are never ahead of `origin`.

### Gitignore / gitattributes — `commands/init/gitignore.ts`, new `commands/init/gitattributes.ts`

`CORE_ENTRIES` gains `.oat/projects/synced/*/` (trailing slash = directories only, so `<slug>.json` stays tracked). `applyOatCoreGitattributes(repoRoot)` mirrors the gitignore block pattern (`# OAT core` / `# END OAT core` markers in `.gitattributes`) with the single entry `.oat/projects/shared/** linguist-generated=true`. Both are called from the same two sites (`oat init`, `oat tools update`). `createSyncedProject` runs `git check-ignore -q <projectPath>` and calls `applyOatCoreGitignore` when the rule is missing, so a repo that upgraded the CLI but never re-ran init still gets a correct scaffold; the changed `.gitignore` is included in the scaffold commit.

### Archive integration — `commands/project/archive/archive-utils.ts`

`archiveProjectOnCompletion` checks `isSyncedCheckout(sourcePath)`. If true: the copy uses a filter that skips the top-level `.git` pointer file, and cleanup calls `removeSyncedCheckout` instead of `rm`. Then it sets `record.status = 'complete'` / `completedAt`. Archive _target_ durability logic (`isGitignoredArchivePath` → primary checkout re-targeting) is untouched. The ref is retained.

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

### Scaffold & list

`ScaffoldProjectOptions` gains `scope?: ProjectScope` (default from `resolveDefaultScope`). For `synced`, `scaffoldProject` calls `createSyncedProject` before writing templates into the checkout, then `pushSynced` (initial commit `chore(oat): scaffold <slug>`), writes the record, and commits the record (plus `.gitignore` if changed) on the branch with the existing `commitScaffold` path. `oat project list` enumerates `shared` and `synced` siblings and reports `scope` per row; `--scope` filters.

### Skill integration

A shared snippet replaces each inventoried bookkeeping commit:

```bash
PROJECT_SCOPE=$(oat project scope "$PROJECT_PATH" --json | jq -r .scope)
if [ "$PROJECT_SCOPE" = "synced" ]; then
  oat project push "$PROJECT_PATH" --message "chore(oat): bookkeeping after p03"
else
  git add "$PROJECT_PATH/state.md" … && git commit -m "…"   # unchanged
fi
```

Arrival sites add `oat project pull "$PROJECT_PATH"` under the same guard. `oat project scope` is a tiny read-only command so skills never reimplement path parsing. PR skills call `oat project links "$PROJECT_PATH"` and paste the block into the body template; `oat-project-complete` passes `--durable-summary <path>` when the export is configured.

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

```
refs/oat/projects/<slug>            local ref = mirror of origin's ref (fetched with + refspec)
.oat/projects/synced/<slug>/.git    worktree pointer file → <common-dir>/worktrees/<id>
.oat/projects/synced/<slug>/        tree root == project directory (state.md, plan.md, …)
```

History is linear by construction (rebase-on-pull, no merges, no force). The root commit is the empty tree, so every project ref starts from an identical "init" commit.

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

All commands live under `oat project`. They resolve the project from an explicit path argument, else `activeProject`, and refuse with a scope error when the resolved project is not `synced` (except `scope` and `new`). Every command supports `--json` with a `status` field; exit code 0 for success/no-op, 1 for actionable user states (`conflict`, `rejected`, `dirty`, wrong scope, missing remote) via `CliError`, 2 for system errors.

### `oat project new <name> [--scope <shared|local|synced>] …`

Existing flags unchanged. `--scope` defaults to `projects.defaultScope`. For `synced`: creates ref + checkout, scaffolds, pushes, writes record, scaffold-commits the record (+ `.gitignore` when the block was applied). Requires a configured `origin`; otherwise fails with a hint to add one or use `--scope local`.

**JSON:** `{ status: 'ok', projectPath, scope, ref?, sha?, scaffoldCommit? }`

### `oat project push [project-path] [--message <msg>] [--no-refresh-pr]`

Commits and publishes. Refreshes the PR links block when `state.md` has `oat_pr_status: open` and `oat_pr_url` set, unless `--no-refresh-pr`.

**JSON:** `{ status: 'pushed' | 'up-to-date' | 'rejected' | 'conflict', sha, ref, conflicts?: string[], prRefresh?: 'refreshed' | 'skipped' | 'failed' }`

### `oat project pull [project-path] [--continue | --abort]`

Materializes or rebases. `--continue` after resolving conflicts; `--abort` returns to the pre-rebase state.

**JSON:** `{ status: 'created' | 'updated' | 'up-to-date' | 'conflict' | 'dirty', sha, ref, conflicts?: string[] }`

### `oat project scope [project-path]`

Read-only. `{ status: 'ok', projectPath, scope, ref?, record?: SyncedProjectRecord, checkout: 'present' | 'absent' | 'n/a' }`.

### `oat project links [project-path] [--format markdown|json] [--durable-summary <repo-relative-path>]`

Prints the block for the checkout's HEAD. `--format json` returns `LinksInput` plus rendered `markdown`.

### `oat project prune <project-path|slug> [--force]`

Refuses when `state.md` (in the checkout or the last archived snapshot) has `oat_pr_status: open` unless `--force`. Warns that pinned links will stop resolving. Removes remote ref, local ref, checkout, record.

### `oat project migrate <project-path> --to synced`

`shared` → `synced` only in v1. Refuses on a dirty artifact directory or missing `origin`. Updates `activeProject` if it pointed at the migrated path. Produces one branch commit.

### `oat project list [--scope <scope>]`

Adds a `scope` column and filter; enumerates `shared` and `synced` siblings of `projects.root`.

### Config

- `projects.defaultScope` — `shared | local | synced`, default `synced`, shared-scope structural key, env `OAT_PROJECTS_DEFAULT_SCOPE`.

### Managed files

- `.gitignore` core block: adds `.oat/projects/synced/*/`.
- `.gitattributes` core block (new): `.oat/projects/shared/** linguist-generated=true`.
- Both applied by `oat init` and `oat tools update`; the gitignore entry is also self-healed by `oat project new --scope synced`.

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
- **Parent-checkout damage:** mutating git commands assert `--show-toplevel == projectPath`; no `-A` outside the nested worktree; no force-push anywhere (NFR4).
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
- **System Errors (exit 2):** git not on PATH; git older than the minimum (worktree add on a ref requires ≥ 2.5; detected once via `git --version`); filesystem failures. Surfaced verbatim.
- **External Service Errors:** `gh` missing/unauthenticated or PR edit failing → `prRefresh: 'skipped' | 'failed'` with a warning; push still succeeds. Network failure during fetch/push → user error with the git message.

### Conflict flow (push or pull)

1. `git rebase` stops → command returns `status: 'conflict'`, `conflicts: [files]`.
2. Message: "Resolve conflicts in `.oat/projects/synced/<slug>/…`, then run `oat project pull --continue` (or `--abort`)."
3. Skill guidance: the agent resolves in place (artifact files are markdown; `state.md` is last-writer-wins by intent) and continues. `push` after a successful `--continue` completes the original operation.

### Retry Logic

Push: exactly one fetch → rebase → push cycle; a second rejection returns `rejected` (never loops, never forces). PR refresh: no retry; next push retries naturally.

### Logging

- **Info:** each git phase (`fetch`, `rebase`, `commit`, `push`), resulting SHA, PR refresh outcome.
- **Warn:** PR refresh skipped/failed; gitignore rule self-healed; `ls-remote` unavailable (doctor).
- **Error:** the categories above; JSON mode emits `{ status, error, fix }`.

## Testing Strategy

### Requirement-to-Test Mapping

| ID   | Verification       | Key Scenarios                                                                                                                                            |
| ---- | ------------------ | -------------------------------------------------------------------------------------------------------------------------------------------------------- |
| FR1  | integration        | scaffold synced → `git check-ignore` true; nested `git log` shows init + scaffold; parent `status --porcelain` shows only record                         |
| FR2  | unit               | `--scope` each value → correct directory; no flag → `projects.defaultScope`; config `shared` → shared                                                    |
| FR3  | integration        | push to bare origin; up-to-date no-op creates no commit; parent index untouched; rejected after concurrent push returns `rejected`                       |
| FR4  | integration        | fresh clone pull creates checkout; second pull `up-to-date`; dirty → `dirty`; divergent edit → `conflict` → `--continue` → push succeeds; `--abort`      |
| FR5  | unit + integration | zod schema accept/reject; two branches adding different records merge cleanly (git merge in fixture)                                                     |
| FR6  | manual + unit      | skill dogfood on this project after migrate; skill validator asserts no `git add` of `synced` paths in `oat-*` skills                                    |
| FR7  | unit + integration | render with subsets of present artifacts; replace idempotent (twice = once); missing markers appended; non-GitHub origin plain text; `gh` mocked refresh |
| FR8  | integration        | archive synced project → snapshot has no `.git`; `worktree list` has no stale entry; record `complete`; ref still on origin                              |
| FR9  | unit + integration | `CORE_ENTRIES` contains rule; upgrade of existing block idempotent; record file not ignored, directory ignored                                           |
| FR10 | integration        | two linked worktrees each pull; push from A, pull in B → identical tree; remove worktree A → pull in B still works                                       |
| FR11 | integration        | prune with open PR refuses; `--force` removes ref/record/checkout                                                                                        |
| FR12 | integration        | migrate fixture shared project → files on ref, one branch commit removing tracked files + adding record; active pointer updated; dirty → refuse          |
| FR13 | unit               | each doctor condition with injected git runner                                                                                                           |
| FR14 | manual             | `pnpm build:docs` + review                                                                                                                               |
| FR15 | unit               | gitattributes block created/updated/no-change                                                                                                            |
| NFR1 | unit + integration | existing `scaffold.test.ts`, `archive` tests, `gitignore.test.ts` pass unchanged; shared project flow unchanged in e2e                                   |
| NFR2 | manual             | push to a GitHub test repo with an `on: push` workflow → no run triggered; ref absent from branch list                                                   |
| NFR3 | integration        | push/pull with AWS env vars unset and `gh` absent                                                                                                        |
| NFR4 | integration        | parent `status --porcelain` identical before/after every sync command; no `--force` in any git args (runner spy)                                         |
| NFR5 | integration        | pull twice; interrupted rebase → `--continue`/`--abort`                                                                                                  |
| NFR6 | manual             | DoD gates incl. `check:skill-bumps`, `release:check-versions`                                                                                            |

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
4. This project dogfoods step 3 on itself before the skills sweep phase.

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

**Verification:** FR7/FR8/FR11/FR12/FR13/FR15 rows green; migrate this project to `synced` and continue the remaining phases on it.

### Phase 4: Skills, docs, release

**Goal:** the workflow uses the new scope end to end.

**Tasks:**

- Bookkeeping/arrival/PR-body sweep across inventoried skills and agents with the scope-guard snippet; skill validator rule; version bumps.
- Docs: file-locations, directory-structure, project workflow, worktrees, "reviewing an OAT PR"; editor hint.
- Lockstep package bump; full DoD gates.

**Verification:** FR6/FR14/NFR6 manual rows; dogfood a full bookkeeping cycle on this (by then synced) project.

## Dependencies

### External Dependencies

- **git ≥ 2.5** (worktree add on arbitrary commit-ish); realistically any git from the last several years.
- **gh CLI** (optional) for PR body refresh.

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
