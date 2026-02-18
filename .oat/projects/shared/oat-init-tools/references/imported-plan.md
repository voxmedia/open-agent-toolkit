# Plan: Distribution — `oat init tools` and Subcommands

## Context

OAT skills and templates currently live only in the OAT repo itself. There is no mechanism to install them into other repositories. The `oat init tools` command and its subcommands are the distribution story — how OAT reaches other repos. These are P1 backlog items (B07, B10) that became unblocked after naming normalization and script migrations.

**Goal:** A user in any git repo can run `oat init tools` to interactively install OAT skills, or use `oat init tools ideas`, `oat init tools workflows`, or `oat init tools utility` for targeted pack installation. After installation, `oat sync --apply` propagates skills to provider views.

### Command Hierarchy

```
oat init                              # existing base init (canonical dirs, manifest)
oat init tools                        # interactive: ALL skills, grouped by pack, scope badges
oat init tools ideas [--scope X]      # all-or-nothing: 4 idea skills + infra + templates
oat init tools workflows              # all-or-nothing: 20 workflow skills + agents + templates + scripts
oat init tools utility [--scope X]    # interactive multi-select: utility skills (with "All" option)
```

---

## Design Decisions

| Decision | Resolution |
|---|---|
| Source resolution | **Bundle with CLI** — copy skills/templates into `packages/cli/assets/` at build time. CLI resolves its package root via `import.meta.url` to find them. Works from any repo. |
| Command structure | `oat init tools` is a Commander group under `oat init`. Bare `oat init tools` = interactive all-skills installer. Subcommands: `ideas`, `workflows`, `utility`. Confirmed: Commander supports `.action()` + `.addCommand()` on the same command (nested groups work). |
| Pack install mode | **ideas** and **workflows**: all-or-nothing (install the full pack). **utility**: interactive multi-select with "All" option. **bare `tools`**: interactive all-skills grouped by pack with scope badges. |
| Idempotency | Default: skip-if-exists. Never overwrite customized skills without consent. Report `copied[]` and `skipped[]`. |
| Update path | `--force` flag overwrites existing skills/templates/agents with upstream versions. Prompts for confirmation in interactive mode before overwriting. Reports `updated[]` alongside `copied[]` and `skipped[]`. |
| Post-copy sync | Do NOT auto-trigger. Print scope-aware reminder: `Run 'oat sync --scope {scope} --apply' to propagate skills to provider views.` |
| Scope — ideas | Support both `project` and `user` scope. Treat `all` (the global default) as `project`. **Companion fix:** update the 4 idea skills' template source paths to be level-relative via `{TEMPLATES_ROOT}` variable. |
| Scope — workflows | `project` scope only. Treat `all` as `project`. Reject `user` with error (all 20 skills hard-depend on `.oat/` project infrastructure). |
| Scope — utility | Support both `project` and `user` scope. Treat `all` as `project`. **Note:** `oat-review-provide` currently resolves output to repo-local paths (`.oat/repo/reviews/`). User-scope output (`~/.oat/reviews/`) is a future enhancement — not in scope for this plan. |
| `oat-review-provide` | **Moved to utility pack** — it's the only workflow skill that doesn't hard-require `.oat/` project infrastructure. Works in any git repo, optionally enhanced by `.oat/` state. |
| `oat-repo-knowledge-index` | **Include** in workflows pack — it's core to the workflow. |
| Script executability | `copyDirectory` uses `readFile`/`writeFile` which drops permissions. Add `chmod 0o755` after copying `.sh` scripts. |

---

## Skill Scope Eligibility

Comprehensive audit of all 25 distributable skills, classifying each by valid installation scopes based on `.oat/` dependencies:

| Skill | Pack | Scope | Rationale |
|---|---|---|---|
| `oat-idea-new` | ideas | project, user | Level-relative: `{IDEAS_ROOT}`, `{TEMPLATES_ROOT}`, `{ACTIVE_IDEA_FILE}` |
| `oat-idea-ideate` | ideas | project, user | Same level-relative variable set |
| `oat-idea-summarize` | ideas | project, user | Same level-relative variable set |
| `oat-idea-scratchpad` | ideas | project, user | Same level-relative variable set |
| `oat-review-provide` | **utility** | project, user | Ad-hoc review; reads git state + optional `.oat/` files. Works in any git repo. |
| `oat-project-new` | workflows | project | Creates `.oat/projects/<scope>/<name>/` structure |
| `oat-project-open` | workflows | project | Reads/lists `.oat/projects/` to select active project |
| `oat-project-clear-active` | workflows | project | Clears active project pointer in `.oat/` |
| `oat-project-discover` | workflows | project | Reads `.oat/templates/discovery.md`, writes to `.oat/projects/` |
| `oat-project-spec` | workflows | project | Reads `.oat/templates/spec.md`, writes to `.oat/projects/` |
| `oat-project-design` | workflows | project | Reads `.oat/templates/design.md`, writes to `.oat/projects/` |
| `oat-project-plan` | workflows | project | Reads `.oat/templates/plan.md`, writes to `.oat/projects/` |
| `oat-project-plan-writing` | workflows | project | Writes/refines plan within `.oat/projects/` |
| `oat-project-implement` | workflows | project | Reads `.oat/templates/implementation.md`, writes to `.oat/projects/` |
| `oat-project-import-plan` | workflows | project | Imports external plan into `.oat/projects/` structure |
| `oat-project-progress` | workflows | project | Reports progress from `.oat/projects/` state |
| `oat-project-complete` | workflows | project | Marks project complete in `.oat/projects/` |
| `oat-project-promote-full` | workflows | project | Promotes quick-start to full project in `.oat/projects/` |
| `oat-project-quick-start` | workflows | project | Creates lightweight project in `.oat/projects/` |
| `oat-project-review-provide` | workflows | project | Lifecycle-scoped review from `.oat/projects/` artifacts |
| `oat-project-review-receive` | workflows | project | Processes review feedback into `.oat/projects/` |
| `oat-project-pr-final` | workflows | project | Generates final PR description from `.oat/projects/` |
| `oat-project-pr-progress` | workflows | project | Generates progress PR from `.oat/projects/` |
| `oat-repo-knowledge-index` | workflows | project | Reads `.oat/repo/reference/`, writes `.oat/repo/` artifacts |
| `oat-worktree-bootstrap` | workflows | project | Creates/validates git worktrees; requires `.oat/` + `.agents/` |

**Summary:** 4 idea skills (project+user). 1 utility skill (project+user). 20 workflow skills (project only).

**Pack assignment:** `oat-review-provide` is in the **utility** pack — it's the only distributable skill without a hard `.oat/` project dependency. Workflows pack has 20 skills (18 `oat-project-*` + `oat-repo-knowledge-index` + `oat-worktree-bootstrap`).

---

## Asset Inventory

### `oat init ideas` distributes:

**Skills** (4 directories → `{scopeRoot}/.agents/skills/`):
- `oat-idea-new`, `oat-idea-ideate`, `oat-idea-summarize`, `oat-idea-scratchpad`

**Infrastructure** (2 files → `{scopeRoot}/.oat/ideas/`):
- `backlog.md` (from template `ideas/ideas-backlog.md`)
- `scratchpad.md` (from template `ideas/ideas-scratchpad.md`)

**Runtime templates** (2 files → `{scopeRoot}/.oat/templates/ideas/`):
- `idea-discovery.md`, `idea-summary.md`

Where `{scopeRoot}` is the project root (default) or `$HOME` (with `--scope user`).

### `oat init tools utility` distributes:

**Skills** (1+ directories → `{scopeRoot}/.agents/skills/`):
- `oat-review-provide`

Where `{scopeRoot}` is the project root (default) or `$HOME` (with `--scope user`). The skill itself is installed; its review output behavior is unchanged (repo-local).

### `oat init tools workflows` distributes:

**Skills** (20 directories → `.agents/skills/`):
- 18 `oat-project-*` skills + `oat-repo-knowledge-index` + `oat-worktree-bootstrap`

**Agents** (2 files → `.agents/agents/`):
- `oat-reviewer.md`, `oat-codebase-mapper.md`

**Templates** (6 files → `.oat/templates/`):
- `state.md`, `discovery.md`, `spec.md`, `design.md`, `plan.md`, `implementation.md`

**Scripts** (→ `.oat/scripts/`, optional at both bundle and install time + `chmod 755`):
- `generate-oat-state.sh`, `generate-thin-index.sh`
- Optional because these scripts are planned for migration to CLI commands (backlog B14/B15)

**Config** (1 file):
- `.oat/projects-root` (write default `.oat/projects/shared` if absent)

---

## Implementation Steps

### Step 1: Add asset bundling to build pipeline

Create a build-time copy script that mirrors distributable assets into `packages/cli/assets/`.

**New file:** `packages/cli/scripts/bundle-assets.sh`
- Add `set -euo pipefail` at the top so missing source files fail the build immediately
- Create `$ASSETS/skills` directory before the skills copy loop
- Copy all 25 skill directories (4 ideas + 20 workflows + 1 utility), 2 agent files, all templates (project + ideas) — these are mandatory
- Scripts: use conditional copy (`[ -f ... ] && cp ...`) so the bundle succeeds even after scripts are migrated to CLI (per backlog B14/B15). The `set -e` won't trigger on `[ -f ]` short-circuit
- Use `cp -R` for directories, `cp` for files

**Script policy:** Bundle script is fail-fast for skills/templates/agents (mandatory). Scripts are optional at bundle time (conditional copy) and optional at install time (skip if not in assets). This accommodates the planned migration of `generate-oat-state.sh` and `generate-thin-index.sh` to CLI commands.

**Modify:** `packages/cli/package.json` — update build script:
```json
"build": "bash scripts/bundle-assets.sh && tsc && tsc-alias"
```

**Modify:** `turbo.json` — add `assets/**` to build outputs so Turbo caches it:
```json
"build": { "dependsOn": ["^build"], "outputs": ["dist/**", "assets/**"] }
```

**Add:** `.gitignore` entry for `packages/cli/assets/` (generated, not checked in).

### Step 2: Add `resolveAssetsRoot()` utility

**New file:** `packages/cli/src/fs/assets.ts`

Resolves the assets directory from the CLI package root using `import.meta.url`. Must handle both `dist/` (compiled) and `src/` (tsx dev) execution paths:

```ts
import { fileURLToPath } from 'node:url';
import { join, dirname } from 'node:path';
import { stat } from 'node:fs/promises';
import { CliError } from '@errors/index';

export async function resolveAssetsRoot(): Promise<string> {
  const thisFile = fileURLToPath(import.meta.url);
  const thisDir = dirname(thisFile); // dist/fs/ or src/fs/

  // Walk up to packages/cli/ — works from both dist/fs/ and src/fs/
  const cliRoot = join(thisDir, '..', '..');
  const assetsRoot = join(cliRoot, 'assets');

  try {
    const s = await stat(assetsRoot);
    if (s.isDirectory()) return assetsRoot;
  } catch { /* fall through */ }

  throw new CliError(
    'Assets directory not found. Run "pnpm build" to bundle assets.',
    2,
  );
}
```

Both `dist/fs/assets.js` and `src/fs/assets.ts` are 2 levels deep from `packages/cli/`, so the same path math works for both tsx dev and compiled execution.

### Step 3: Add `fileExists()` and `dirExists()` to shared FS utils

**Modify:** `packages/cli/src/fs/io.ts`

Add `stat` to the `node:fs/promises` import (currently: `mkdir, readdir, readFile, rename, rm, symlink, writeFile`), then add:

```ts
export async function fileExists(path: string): Promise<boolean> {
  try { return (await stat(path)).isFile(); } catch { return false; }
}

export async function dirExists(path: string): Promise<boolean> {
  try { return (await stat(path)).isDirectory(); } catch { return false; }
}
```

### Step 4: Implement `oat init tools ideas` pure logic

**New file:** `packages/cli/src/commands/init/tools/ideas/install-ideas.ts`

- Constants: `IDEA_SKILLS[]`, `INFRA_TEMPLATES[]`, `RUNTIME_TEMPLATES[]`
- `installIdeas(options: { assetsRoot: string; targetRoot: string; force?: boolean }): Promise<InstallIdeasResult>`
- Uses `dirExists`/`fileExists` from `@fs/io` for skip-if-exists checks
- When `force: true`: overwrites existing items (rm + copy for directories, overwrite for files). Tracks these in `updated[]` arrays
- When `force: false` (default): skip-if-exists
- Uses `copyDirectory` for skills, `copySingleFile` for individual files
- Returns `{ copiedSkills[], updatedSkills[], skippedSkills[], copiedInfra[], updatedInfra[], skippedInfra[], copiedTemplates[], updatedTemplates[], skippedTemplates[] }`

### Step 5: Implement `oat init tools ideas` Commander layer

**New file:** `packages/cli/src/commands/init/tools/ideas/index.ts`

- `createInitToolsIdeasCommand(overrides?: Partial<InitIdeasDeps>): Command`
- Option: `--force` — overwrite existing skills/templates with upstream versions
- In interactive mode + `--force`: confirm before overwriting (list what will be replaced)
- In non-interactive mode + `--force`: overwrite without prompt
- DI: `buildCommandContext`, `resolveProjectRoot`, `resolveScopeRoot`, `resolveAssetsRoot`, `installIdeas`, `confirmAction`
- Scope handling:
  - `all` (default) → resolve as `project` scope (use `resolveProjectRoot`)
  - `project` → use `resolveProjectRoot(context.cwd)`
  - `user` → use `resolveScopeRoot('user', context.cwd, context.home)` (→ `$HOME`)
- Skills are installed to `{scopeRoot}/.agents/skills/`, infra to `{scopeRoot}/.oat/ideas/`, templates to `{scopeRoot}/.oat/templates/ideas/`
- Report: text mode shows counts + scope + sync reminder; JSON mode emits full result
- Export `createInitToolsIdeasCommand`

### Step 6: Implement `oat init tools workflows` pure logic

**New file:** `packages/cli/src/commands/init/tools/workflows/install-workflows.ts`

- Constants: `WORKFLOW_SKILLS[]` (20), `WORKFLOW_AGENTS[]` (2), `WORKFLOW_TEMPLATES[]` (6), `WORKFLOW_SCRIPTS[]` (2)
- `installWorkflows(options: { assetsRoot: string; targetRoot: string; force?: boolean }): Promise<InstallWorkflowsResult>`
- Same copy + skip-if-exists + force-overwrite pattern as ideas
- After copying scripts: `chmod(dest, 0o755)` to preserve executability
- Initialize `.oat/projects-root` with default if absent (never force-overwritten — this is user config)
- Returns `{ copiedSkills[], updatedSkills[], skippedSkills[], copiedAgents[], updatedAgents[], skippedAgents[], copiedTemplates[], updatedTemplates[], skippedTemplates[], copiedScripts[], updatedScripts[], skippedScripts[], projectsRootInitialized: boolean }`

### Step 7: Implement `oat init tools workflows` Commander layer

**New file:** `packages/cli/src/commands/init/tools/workflows/index.ts`

- Same DI pattern as ideas
- `createInitToolsWorkflowsCommand(overrides?): Command`
- Option: `--force` — same interactive confirm + overwrite behavior as ideas
- Scope handling: `all` → `project`; `project` → works; `user` → reject with error
- Report: per-category counts + sync reminder

### Step 7b: Implement `oat init tools utility` pure logic + Commander layer

**New file:** `packages/cli/src/commands/init/tools/utility/install-utility.ts`

- Constants: `UTILITY_SKILLS[]` (currently just `['oat-review-provide']`)
- `installUtility(options: { assetsRoot: string; targetRoot: string; skills: string[]; force?: boolean }): Promise<InstallUtilityResult>`
- Takes a `skills` array (selected by user from interactive prompt, or all if non-interactive)
- Same copy + skip-if-exists + force-overwrite pattern
- Returns `{ copiedSkills[], updatedSkills[], skippedSkills[] }`

**New file:** `packages/cli/src/commands/init/tools/utility/index.ts`

- `createInitToolsUtilityCommand(overrides?): Command`
- Option: `--force`
- Scope handling: `all` → `project`; `project` → works; `user` → works
- In interactive mode: use `selectManyWithAbort` from `@commands/shared/shared.prompts` to show multi-select with skill names. All checked by default ("All" option effect via `checked: true` on every choice).
- In non-interactive mode: install all utility skills
- Report: per-skill counts + sync reminder

### Step 7c: Implement `oat init tools` group command with interactive installer

**New file:** `packages/cli/src/commands/init/tools/index.ts`

Creates the `tools` Commander group and registers subcommands. Bare `oat init tools` runs an interactive all-skills installer.

- `createInitToolsCommand(overrides?): Command`
- Registers: `.addCommand(createInitToolsIdeasCommand())`, `.addCommand(createInitToolsWorkflowsCommand())`, `.addCommand(createInitToolsUtilityCommand())`
- Bare `.action()` — interactive all-skills installer:
  1. Resolve assets root
  2. Build skill list grouped by pack: **Ideas** (4 skills [project|user]), **Workflows** (20 skills [project]), **Utility** (1+ skills [project|user])
  3. Use `selectManyWithAbort` with pack group headers and scope badges, all checked by default
  4. If selection includes both project-only and user-eligible skills, prompt for scope
  5. For project-only skills: install to project root. For user-eligible skills: install to selected scope root
  6. Delegates to `installIdeas`, `installWorkflows`, `installUtility` based on selection
- Non-interactive mode: install everything to project scope (safe default)
- Report: combined counts across all packs

### Step 8: Update idea skills for user-scope support

**Modify all 4 idea skill files.** Two changes per skill:

#### 8a. Level-relative template paths

Add a `TEMPLATES_ROOT` variable to the level-resolution table:

| Variable | Project Level | User Level |
|----------|--------------|------------|
| `IDEAS_ROOT` | `.oat/ideas` | `~/.oat/ideas` |
| `TEMPLATES_ROOT` | `.oat/templates/ideas` | `~/.oat/templates/ideas` |
| `ACTIVE_IDEA_FILE` | `.oat/active-idea` | `~/.oat/active-idea` |

Replace hardcoded `.oat/templates/ideas/` references with `{TEMPLATES_ROOT}/`:
- `.agents/skills/oat-idea-new/SKILL.md` — lines 72, 76, 82
- `.agents/skills/oat-idea-summarize/SKILL.md` — line 78
- `.agents/skills/oat-idea-scratchpad/SKILL.md` — lines 70, 73
- `.agents/skills/oat-idea-ideate/SKILL.md` — add `TEMPLATES_ROOT` to variable table

#### 8b. Prompt when both levels have ideas

Update the level-resolution chain in all 4 skills. Current chain silently picks project when both directories exist. New chain:

```
1. If $ARGUMENTS contains --global → user level
2. If .oat/active-idea exists and points to valid dir → project level
3. If ~/.oat/active-idea exists and points to valid dir → user level
4. If BOTH .oat/ideas/ AND ~/.oat/ideas/ exist →
     ASK: "Ideas exist at both project and user level. Where should this idea go?"
     Options: "Project (.oat/ideas/)" / "Global (~/.oat/ideas/)"
5. If .oat/ideas/ exists → project level
6. If ~/.oat/ideas/ exists → user level
7. Otherwise → ask: "Project-level or global (user-level) ideas?"
```

The key change is **new rule 4**: when both directories exist and there's no active-idea pointer to disambiguate, prompt the user. This prevents the silent project-wins default from surprising users who have ideas at both levels.

**Files to modify:**
- `.agents/skills/oat-idea-new/SKILL.md`
- `.agents/skills/oat-idea-ideate/SKILL.md`
- `.agents/skills/oat-idea-summarize/SKILL.md`
- `.agents/skills/oat-idea-scratchpad/SKILL.md`

### Step 9: Wire `tools` into `oat init`

**Modify:** `packages/cli/src/commands/init/index.ts`

Minimal change — add one import and one `.addCommand()` call:

```ts
import { createInitToolsCommand } from './tools';

// In createInitCommand():
return new Command('init')
  .description('Initialize canonical directories, manifest, and tool packs')
  .option('--hook', ...)
  .option('--no-hook', ...)
  .action(async (_options, command) => { /* existing base init logic — unchanged */ })
  .addCommand(createInitToolsCommand());
```

### Step 10: Tests

**New files:**
- `packages/cli/src/commands/init/tools/ideas/install-ideas.test.ts` — integration tests with real temp dirs
  - Fresh install: all 4 skills copied, 2 infra files created, 2 templates copied
  - Idempotent re-run: everything skipped, no errors
  - Partial state: only absent items copied
- `packages/cli/src/commands/init/tools/ideas/index.test.ts` — DI harness tests
  - Correct args forwarded to installIdeas
  - Text + JSON output shape
  - Default scope (`all`) works as project
  - `--scope user` installs to home directory
  - `--scope project` installs to project root
- `packages/cli/src/commands/init/tools/workflows/install-workflows.test.ts` — integration tests
  - All 20 skills, 2 agents, 6 templates, 2 scripts copied
  - Script chmod preserved
  - `.oat/projects-root` written when absent, not overwritten when present
  - Missing source script gracefully skipped
  - Full idempotency
- `packages/cli/src/commands/init/tools/workflows/index.test.ts` — DI harness tests
  - Default scope (`all`) works as project
  - `--scope user` rejected with error
- `packages/cli/src/commands/init/tools/utility/install-utility.test.ts` — integration tests
  - `oat-review-provide` copied at project scope
  - `oat-review-provide` copied at user scope
  - Idempotent re-run
- `packages/cli/src/commands/init/tools/utility/index.test.ts` — DI harness tests
  - Interactive mode shows multi-select with all checked
  - Non-interactive installs all utility skills
  - `--scope user` works
- `packages/cli/src/commands/init/tools/index.test.ts` — tools group tests
  - Bare `oat init tools` in interactive mode shows grouped skill list
  - Non-interactive installs everything to project scope
  - Subcommands `ideas`, `workflows`, `utility` registered

**Modify:** `packages/cli/src/commands/init/index.test.ts`
- Verify bare `oat init` still works (regression)
- Verify `oat init tools` is a registered subcommand with its own subcommands

**Modify:** help snapshot tests (if they exist) to reflect `init` showing `[command]` in usage.

---

## Files Summary

| File | Action | Purpose |
|---|---|---|
| `packages/cli/scripts/bundle-assets.sh` | NEW | Build-time asset copy (with `set -euo pipefail`) |
| `packages/cli/package.json` | MODIFY | Add `bundle-assets.sh` to build |
| `turbo.json` | MODIFY | Add `assets/**` to build outputs |
| `.gitignore` | MODIFY | Ignore `packages/cli/assets/` |
| `packages/cli/src/fs/assets.ts` | NEW | `resolveAssetsRoot()` via `import.meta.url` |
| `packages/cli/src/fs/io.ts` | MODIFY | Add `stat` import, `fileExists()`, `dirExists()` |
| `packages/cli/src/commands/init/tools/index.ts` | NEW | `tools` group command + interactive all-skills installer |
| `packages/cli/src/commands/init/tools/index.test.ts` | NEW | Tools group tests |
| `packages/cli/src/commands/init/tools/ideas/install-ideas.ts` | NEW | Pure install logic |
| `packages/cli/src/commands/init/tools/ideas/index.ts` | NEW | Commander layer (project + user scope) |
| `packages/cli/src/commands/init/tools/ideas/install-ideas.test.ts` | NEW | Integration tests |
| `packages/cli/src/commands/init/tools/ideas/index.test.ts` | NEW | DI harness tests |
| `packages/cli/src/commands/init/tools/workflows/install-workflows.ts` | NEW | Pure install logic |
| `packages/cli/src/commands/init/tools/workflows/index.ts` | NEW | Commander layer (project scope only) |
| `packages/cli/src/commands/init/tools/workflows/install-workflows.test.ts` | NEW | Integration tests |
| `packages/cli/src/commands/init/tools/workflows/index.test.ts` | NEW | DI harness tests |
| `packages/cli/src/commands/init/tools/utility/install-utility.ts` | NEW | Pure install logic |
| `packages/cli/src/commands/init/tools/utility/index.ts` | NEW | Commander layer (project + user scope, interactive multi-select) |
| `packages/cli/src/commands/init/tools/utility/install-utility.test.ts` | NEW | Integration tests |
| `packages/cli/src/commands/init/tools/utility/index.test.ts` | NEW | DI harness tests |
| `packages/cli/src/commands/init/index.ts` | MODIFY | Add `tools` subcommand |
| `packages/cli/src/commands/init/index.test.ts` | MODIFY | Regression + subcommand registration |
| `.agents/skills/oat-idea-new/SKILL.md` | MODIFY | Level-relative template paths (`{TEMPLATES_ROOT}`) |
| `.agents/skills/oat-idea-ideate/SKILL.md` | MODIFY | Add `TEMPLATES_ROOT` variable |
| `.agents/skills/oat-idea-summarize/SKILL.md` | MODIFY | Level-relative template paths |
| `.agents/skills/oat-idea-scratchpad/SKILL.md` | MODIFY | Level-relative template paths |

---

## Execution Order

1. **Step 1** (asset bundling) — foundation, everything depends on it
2. **Steps 2-3** (resolveAssetsRoot + fileExists/dirExists) — shared utilities
3. **Steps 4-5** (ideas pack) — simpler pack, establishes the pattern
4. **Steps 6-7** (workflows pack) — larger pack, same pattern
5. **Step 7b** (utility pack) — smallest pack, interactive multi-select
6. **Step 7c** (tools group + interactive installer) — wires packs together
7. **Step 8** (idea skill template path fix) — companion fix for user-scope support
8. **Step 9** (init group conversion) — wire tools into init
9. **Step 10** (tests) — validate end-to-end

Steps 4-5, 6-7, and 7b are independent and could be parallelized. Step 8 can be done alongside 4-7b.

---

## Verification

1. `pnpm build` — asset bundling runs, `packages/cli/assets/` populated with all expected files
2. `pnpm run cli -- init --help` — shows `tools` subcommand
3. `pnpm run cli -- init tools --help` — shows `ideas`, `workflows`, `utility` subcommands
4. `pnpm run cli -- init` — base init behavior unchanged
5. Create a temp git repo, run from there:
   - `oat init tools ideas` → skills in `.agents/skills/oat-idea-*`, templates in `.oat/templates/ideas/`, infra in `.oat/ideas/`
   - `oat init tools ideas --scope user` → same files under `$HOME/` instead
   - `oat init tools workflows` → 20 skills, agents, templates, scripts, `projects-root`
   - `oat init tools workflows --scope user` → rejected with clear error message
   - `oat init tools utility` → interactive multi-select, `oat-review-provide` installed
   - `oat init tools utility --scope user` → installed to `~/.agents/skills/`
   - Re-run all → all items skipped, no overwrites
   - Re-run with `--force` → items overwritten (interactive mode confirms first), reported as `updated`
6. `pnpm --filter @oat/cli test` — all tests pass
7. Interactive all-skills installer:
   - `oat init tools` (interactive) → shows grouped skill list with scope badges
   - Select subset → only selected packs installed
   - `oat init tools --json` (non-interactive) → installs everything to project scope
8. Scope edge cases:
   - `oat init tools ideas` (default `--scope all`) → works (treated as project)
   - `oat init tools ideas --scope project` → works
   - `oat init tools ideas --scope user` → works (installs to `~/.agents/skills/`, `~/.oat/ideas/`, `~/.oat/templates/ideas/`)
   - `oat init tools workflows --scope user` → clean error message
   - `oat init tools utility --scope user` → works
9. User-scope runtime smoke test:
   - After `oat init tools ideas --scope user`, verify `~/.agents/skills/oat-idea-scratchpad/SKILL.md` exists
   - Invoke `oat-idea-scratchpad` with `--global` flag → confirm it reads/writes under `~/.oat/ideas/` and resolves templates from `~/.oat/templates/ideas/`
   - Invoke `oat-idea-new` in a project with both `.oat/ideas/` and `~/.oat/ideas/` → confirm it prompts for level choice (new rule 4)
10. `pnpm type-check && pnpm lint` — clean

---

## Key Reference Files

| File | Role |
|---|---|
| `packages/cli/src/commands/init/index.ts` | Existing init command to convert to group |
| `packages/cli/src/commands/project/new/index.ts` | Reference: thin Commander layer with DI |
| `packages/cli/src/commands/project/new/scaffold.ts` | Reference: pure scaffolding logic, idempotency |
| `packages/cli/src/commands/init/index.test.ts` | Reference: DI harness test pattern |
| `packages/cli/src/commands/shared/shared.prompts.ts` | `selectManyWithAbort`, `confirmAction` — reuse for interactive selection |
| `packages/cli/src/fs/io.ts` | Shared FS primitives to extend |
| `packages/cli/src/fs/paths.ts` | `resolveProjectRoot`, `resolveScopeRoot` |
| `packages/cli/src/app/create-program.ts` | Global `--scope` default is `all` |
| `packages/cli/src/commands/__tests__/helpers.ts` | `createLoggerCapture()` for tests |
