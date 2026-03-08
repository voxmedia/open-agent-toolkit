# Plan: Configurable VCS Policy + Worktree Sync for OAT Directories

## Problem

Many `.oat/` subdirectories generate high-churn content that creates git noise when committed. Different teams and users have different preferences about what should be tracked. Users need:

1. **Per-path VCS policy** — choose which `.oat/` directories are tracked vs local-only
2. **Worktree propagation** — bulk-copy all local-only directories to a new worktree so context is available even when gitignored
3. **Worktree collection** — bulk-copy artifacts back from worktree → primary workspace after work is done

### Directories in scope

Any `.oat/` subdirectory, but the common candidates include:

| Path | Default | Why local? |
|------|---------|-----------|
| `.oat/ideas/` | local (already gitignored) | Personal scratch |
| `.oat/repo/knowledge/` | tracked | High-churn AI-generated analysis |
| `.oat/repo/analysis/` | tracked | High-churn AI-generated analysis |
| `.oat/repo/reviews/` | tracked | Ad-hoc review docs accumulate fast |
| `.oat/repo/reference/` | tracked | External plans can be noisy |
| `.oat/reviews/` | tracked | Non-project-scoped reviews |
| `.oat/projects/**/reviews/` | tracked | Per-project review artifacts |
| `.oat/projects/**/pr/` | tracked | Per-project PR artifacts |

Currently, worktree bootstrap (Step 2.5) only copies `.oat/config.local.json` and `.oat/active-idea`. There's no configurable policy for anything else.

Additionally, the active-idea pointer is still stored as a standalone file (`.oat/active-idea`, `~/.oat/active-idea`) rather than in `config.local.json` alongside `activeProject`. Since we're already touching config and worktree bootstrap, this is a natural time to consolidate.

## Design

### Config Schema Extension (`.oat/config.json`)

Add a `localPaths` section to `OatConfig`:

```json
{
  "version": 1,
  "worktrees": { "root": ".worktrees" },
  "projects": { "root": ".oat/projects/shared" },
  "localPaths": [
    ".oat/repo/reviews",
    ".oat/repo/reference/external-plans",
    ".oat/repo/knowledge",
    ".oat/repo/analysis",
    ".oat/projects/**/reviews",
    ".oat/projects/**/pr"
  ]
}
```

- **`localPaths`**: Array of repo-relative paths (or glob patterns) that should be gitignored and managed as local-only.
- **Empty array or omitted** = everything tracked (current default behavior).
- Paths already gitignored (`.oat/ideas/`, `.oat/config.local.json`) are unaffected — this config governs the *additional* paths the user opts out of tracking.
- Glob patterns (e.g. `**/reviews`) are expanded at copy time but stored literally in `.gitignore`.

This is simpler than a `policy` enum — if a path is in `localPaths`, it's local. If it's not listed, it's tracked. No ambiguity.

### CLI: `oat local` command group

A focused command group for managing local-only paths:

**`oat local status`**
- Reads `localPaths` from config
- For each path: shows whether it exists, whether it's currently gitignored, file count
- Warns on paths in `localPaths` that aren't yet in `.gitignore` (config/gitignore drift)
- JSON + human output

**`oat local apply`**
- Reads `localPaths` from config
- Adds entries to `.gitignore` under a managed section:
  ```
  # OAT local paths (managed by `oat local apply` — do not edit)
  .oat/repo/reviews/
  .oat/repo/reference/external-plans/
  .oat/repo/knowledge/
  ...
  # END OAT local paths
  ```
- Idempotent — replaces managed section on re-run
- If a path is removed from `localPaths`, it's removed from the managed section (restoring tracking)
- `--apply` flag required (dry-run by default, following current convention)
- Reports additions/removals

**`oat local sync <worktree-path>`**
- **Direction auto-detected** or explicit `--to` / `--from`:
  - `--to` (default when worktree is the target): copies all `localPaths` from current repo → worktree
  - `--from`: copies from worktree → current repo
- Bulk operation — copies ALL configured local paths in one command
- No-overwrite by default; `--force` to overwrite existing files
- Skips paths that don't exist in the source (no error, just logged)
- Reports: paths copied, files copied, files skipped (already exist)
- JSON + human output

**`oat local add <path> [<path>...]`**
- Convenience: appends paths to `localPaths` in config
- Validates paths are under `.oat/`
- Deduplicates
- Reminds user to run `oat local apply` to update `.gitignore`

**`oat local remove <path> [<path>...]`**
- Removes paths from `localPaths` in config
- Reminds user to run `oat local apply` to update `.gitignore`

### Worktree bootstrap integration

Update `oat-worktree-bootstrap` SKILL.md Step 2.5:
- After existing config/idea propagation, read `localPaths` from the copied config
- If non-empty: run `oat local sync --to <worktree-path>` (or equivalent logic)
- Log what was copied
- Non-blocking (warn on failure, don't abort bootstrap)

### `oat config` integration

Expose via `oat config list` for visibility, but don't add individual get/set keys for the array — `oat local add/remove` is the ergonomic interface for managing the list.

## Implementation Steps

### Step 1: Config schema extension
**Files:**
- `packages/cli/src/config/oat-config.ts`

**Changes:**
- Add `localPaths?: string[]` to `OatConfig` interface
- Add normalization in `normalizeOatConfig()` — filter to valid strings, deduplicate, sort
- Export a `resolveLocalPaths(config)` helper that returns the resolved array (empty if omitted)
- Add `activeIdea?: string | null` to `OatLocalConfig` interface
- Add normalization for `activeIdea` in `normalizeOatLocalConfig()` (same pattern as `activeProject`)
- Export `resolveActiveIdea(repoRoot)`, `setActiveIdea(repoRoot, ideaPath)`, `clearActiveIdea(repoRoot)` — mirrors the `activeProject` API

### Step 2: `oat local` command group — scaffolding + status
**Files (new):**
- `packages/cli/src/commands/local/index.ts` — command registration with subcommands
- `packages/cli/src/commands/local/status.ts` — status subcommand

**`status` details:**
- Read config → resolve `localPaths`
- For each path: check existence (`dirExists`), check `.gitignore` membership (string search in file)
- Output table: `path | exists | gitignored | files`
- Warn if `localPaths` has entries not in `.gitignore`

### Step 3: `oat local apply` — gitignore management
**Files (new):**
- `packages/cli/src/commands/local/apply.ts`

**Details:**
- Read `.gitignore` from repo root
- Find managed section by marker comments (or append if not present)
- Replace managed section content with current `localPaths` entries (one per line, trailing `/`)
- If `localPaths` is empty, remove managed section entirely
- Dry-run by default; `--apply` to write
- Report: lines added, lines removed, no-op if unchanged

### Step 4: `oat local sync` — bulk worktree copy
**Files (new):**
- `packages/cli/src/commands/local/sync.ts`

**Details:**
- Accept `<worktree-path>` positional arg
- `--to` (default) / `--from` flag for direction
- `--force` flag for overwrite
- Validate target is a directory (optionally validate it's a git worktree)
- For each `localPaths` entry:
  - Expand globs (e.g. `.oat/projects/**/reviews`) against source
  - Recursive copy: preserve directory structure, skip existing files unless `--force`
  - Track: dirs processed, files copied, files skipped
- Output summary table + totals
- JSON + human output

### Step 5: `oat local add` / `oat local remove`
**Files (new):**
- `packages/cli/src/commands/local/manage.ts` (both add and remove)

**Details:**
- `add`: validate paths start with `.oat/`, append to `localPaths`, deduplicate, write config
- `remove`: filter out matching paths, write config
- Both: print updated list, remind about `oat local apply`

### Step 6: Migrate active-idea pointers to config-local
**Files:**
- `packages/cli/src/config/oat-config.ts` (already extended in Step 1)
- `.agents/skills/oat-idea-new/SKILL.md`
- `.agents/skills/oat-idea-ideate/SKILL.md`
- `.agents/skills/oat-idea-summarize/SKILL.md`
- `.agents/skills/oat-idea-scratchpad/SKILL.md`
- `apps/oat-docs/docs/reference/file-locations.md`
- `apps/oat-docs/docs/reference/oat-directory-structure.md`
- `apps/oat-docs/docs/ideas/lifecycle.md`

**Config changes (Step 1 covers the schema):**
- `activeIdea` stored in `.oat/config.local.json` (repo-level) — replaces `.oat/active-idea` pointer file
- User-level ideas: stored in `~/.oat/config.json` — replaces `~/.oat/active-idea` pointer file (everything at user level is inherently local, no `.local` suffix needed)
- Need a `readUserConfig()` / `writeUserConfig()` pair for `~/.oat/config.json` (new, mirrors repo-level API)

**Skill updates (all four idea skills):**
- Replace Step 0 resolution logic:
  - Old: `cat .oat/active-idea 2>/dev/null` / `cat ~/.oat/active-idea 2>/dev/null`
  - New: read `activeIdea` from `.oat/config.local.json` (repo) / `~/.oat/config.json` (user)
  - Same precedence rules (project-level → user-level → ask)
- Replace write logic:
  - Old: `echo "$IDEA_PATH" > .oat/active-idea`
  - New: `oat config set activeIdea "$IDEA_PATH"` (or equivalent config write instruction)
- `oat-idea-new` Step 7: write via config instead of pointer file
- `oat-idea-ideate` Step 1: read via config instead of pointer file
- `oat-idea-summarize` Step 1: read + write via config instead of pointer file
- `oat-idea-scratchpad`: read via config instead of pointer file

**Hard cutover (no legacy fallback):**
- Delete `.oat/active-idea` and `~/.oat/active-idea` pointer files
- Remove pointer file references from `.gitignore`
- No migration shim — skills read/write config only

**Docs updates:**
- Update file-locations.md to reference config.local.json instead of pointer files
- Update oat-directory-structure.md
- Update ideas/lifecycle.md

### Step 7: Register command + worktree bootstrap update
**Files:**
- `packages/cli/src/commands/index.ts` (or entry point) — register `createLocalCommand()`
- `.agents/skills/oat-worktree-bootstrap/SKILL.md` — update Step 2.5

**Bootstrap changes:**
- After config copy: `activeIdea` is already in `config.local.json` (no separate file copy needed)
- Remove `.oat/active-idea` from the Step 2.5 copy loop (replaced by config)
- Read `localPaths` from config in worktree
- If non-empty: for each path, copy from source repo → worktree (same logic as `sync --to`)
- Log results, non-blocking

### Step 8: Tests
**Files (new):**
- `packages/cli/src/config/oat-config.test.ts` — test `localPaths` normalization, `resolveLocalPaths`, `activeIdea` read/write/migration
- `packages/cli/src/commands/local/status.test.ts`
- `packages/cli/src/commands/local/apply.test.ts`
- `packages/cli/src/commands/local/sync.test.ts`
- `packages/cli/src/commands/local/manage.test.ts`

### Step 9: Build, lint, type-check
- `pnpm build && pnpm lint && pnpm type-check && pnpm test`

## Design Decisions

1. **`localPaths` array vs `policy` enum**: A flat array of "these paths are local" is simpler and more flexible than a policy toggle. No need for a `"tracked"` vs `"local"` enum — presence in the list IS the policy.

2. **Glob support**: Patterns like `.oat/projects/**/reviews` handle project-scoped dirs without listing every project. Stored literally in config and `.gitignore`; expanded at copy time.

3. **`oat local` naming**: Clear, short, maps to the concept ("these are local-only paths"). Alternatives considered: `oat artifacts` (too narrow), `oat vcs` (too git-specific), `oat ignore` (conflates with `.gitignore` mechanics).

4. **Managed `.gitignore` section**: Marker comments let us own a section without touching user entries. Idempotent replacement on re-run.

5. **Bulk sync**: `oat local sync` copies ALL local paths in one command — no need to specify individual directories. This is the primary worktree use case.

6. **No-overwrite default**: Safe for worktree copy. `--force` is explicit opt-in. No merge/diff — just file copy.

7. **Dependency on dry-run flip**: `apply` uses `--apply` flag for now (current convention). When the CLI-wide flip lands, this becomes the default behavior with `--dry-run` opt-in.

8. **Active-idea migration bundled here**: The pointer file → config migration is small, touches the same systems (config, worktree bootstrap), and eliminates a special-case file from the bootstrap copy loop. After migration, worktree bootstrap only copies `config.local.json` — everything else is either in that file or governed by `localPaths`.

9. **Dual-level config for ideas**: Repo-level uses `.oat/config.local.json` (existing file). User-level uses `~/.oat/config.json` (no `.local` suffix — everything at user level is inherently local). Skills resolve with the same precedence they use today (project → user → ask), just reading from config instead of pointer files.

10. **Hard cutover**: No legacy fallback or migration shim. Delete pointer files, update skills, done. Simpler implementation and no dead code to clean up later.
