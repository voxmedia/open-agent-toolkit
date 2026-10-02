# OAT CLI: what it writes and how to remove it (observed fact sheet)

Everything below was observed by running the branch CLI against throwaway Git
repositories with a throwaway `HOME`. Each claim gives the command, its exit
code and an excerpt of the output or of the snapshot diff. If something could
not be observed, the claim says so.

## Environment

| Item           | Value                                                                                                                                                  |
| -------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------ |
| Date           | 2026-10-02                                                                                                                                             |
| Worktree       | `/Users/tstang/orca/workspaces/open-agent-toolkit/docs-overhaul-readme-visual`                                                                         |
| Branch tip     | `7537595f5` (`git -C <worktree> rev-parse --short HEAD`)                                                                                               |
| CLI version    | `0.3.14` (`oat --version`); bundled assets `packages/cli/assets/bundle-metadata.json` say `"oatVersion": "0.3.14"`                                     |
| OS             | macOS 26.4.1 (Darwin 25.4.0), arm64                                                                                                                    |
| Node / Git     | Node v25.9.0, git 2.54.0                                                                                                                               |
| Worktree state | Other agents had uncommitted doc edits under `apps/oat-docs/`. Nothing under `packages/cli/` was modified, so every run used the committed CLI source. |

**How the CLI was invoked.** All runs used
`cd <worktree> && PATH=<PATH without pnpm bin> HOME=$TMPHOME ./node_modules/.bin/tsx --tsconfig packages/cli/tsconfig.json packages/cli/src/index.ts <args> --cwd $REPO </dev/null`.
This is exactly what `pnpm -s run cli:source` runs (`package.json:16`). `pnpm`
was bypassed for two reasons. The first `pnpm -s run cli:source` run wrote
`Library/Caches/pnpm/...` files into the temp HOME and fetched npm registry
metadata, so the HOME diff was no longer only OAT's writes. `pnpm run cli` also
re-runs `bundle-assets.sh`, which would rewrite the shared assets directory
(gitignored) that other agents use. The existing assets were already built at
0.3.14.

**Non-interactive.** stdin was `/dev/null` and there was no TTY. Every command
therefore took its non-interactive path.

**Global flag.** `oat --help` lists `--cwd <path>  Override working directory`, `--json`, `--verbose`, `-V/--version`.

**Snapshots.** Before and after each step: `find` with a content hash or
symlink target for every file and empty directory in `$REPO` (excluding
`.git`) and in `$TMPHOME`, plus `git status --short --ignored`, the
`.git/hooks` listing, `git config --local`, `git for-each-ref` locally and
`git -C $BARE for-each-ref` for the origin, compared with `diff`. The `$REPO`
for each run was a fresh `git init -b main` repository with one commit
(`README.md`). Where an origin was needed it was a local `git init --bare`.

**Disclosure.** One `git commit` I ran by hand in scenario F ran the OAT
pre-commit hook with my real PATH and HOME. The hook therefore invoked the
globally installed `oat` (0.3.13) once, running `oat status --scope project --hook`.
`find ~/.oat -mmin -25` returned nothing, so it wrote nothing to the real
`~/.oat`. After that I removed the pnpm bin directory from PATH for every run.

---

## A. Obtaining the CLI

Not installed, as instructed. Read only.

| Fact                                                                                                                               | Source                                                                                                  |
| ---------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------- |
| Package name `@open-agent-toolkit/cli`, version `0.3.14`                                                                           | `packages/cli/package.json`                                                                             |
| Binary: `"bin": {"oat": "dist/index.js"}`                                                                                          | `packages/cli/package.json`                                                                             |
| `"engines": {"node": ">=22.17.0"}`                                                                                                 | `packages/cli/package.json`                                                                             |
| `"publishConfig": {"access": "public"}`; `"files": ["dist","assets","README.md"]`                                                  | `packages/cli/package.json`                                                                             |
| README states requirements plainly: "Requires Node.js 22.17 or newer and Git 2.31 or newer."                                       | `README.md:22`                                                                                          |
| README states the install command plainly: `npm install --global @open-agent-toolkit/cli`                                          | `README.md:25`                                                                                          |
| Quickstart lists prerequisites ("Node.js 22.17 or newer", "Git 2.31 or newer") but gives **no** install command                    | `apps/oat-docs/docs/getting-started/quickstart.md:14-15`                                                |
| Tool Packs shows a pinned form in the self-update section only: `npm install --global @open-agent-toolkit/cli@<validated-version>` | `apps/oat-docs/docs/getting-started/tool-packs.md:429` (read while another agent was editing this file) |
| `bootstrap.md` and `getting-started/index.md` contain no install command                                                           | grep for `npm install`/`npx` matched nothing there                                                      |

Derivable but not documented: `npx @open-agent-toolkit/cli ...` would also run
the published binary. No docs page mentions `npx`, and I did not run it.

---

## B. `oat init`

`oat init --help`: `--scope <scope>` (choices project, user, all; **default: "all"**),
`--project-guidance`, `--no-project-guidance`, `--hook`, `--no-hook`, `--setup`.

### B1. `oat init --scope project` (fresh repo) — exit 0

Output:

```text
Run "oat providers set --scope project --enabled <providers> --disabled <providers>" to configure supported providers.
Run "oat init --hook" to install optional pre-commit hook.
```

Repo diff (all untracked; `git status`: `?? .gitattributes`, `?? .gitignore`, `?? .oat/`):

```text
> ./.gitattributes
> ./.gitignore
> ./.oat/sync/manifest.json
> ./.agents/agents  [empty dir]
> ./.agents/rules   [empty dir]
> ./.agents/skills  [empty dir]
```

HOME diff: none. Hook: none. No `AGENTS.md` and no `.oat/config.json` are
created. Git does not track empty directories, so `.agents/` does not appear in
`git status` until it contains files.

Content written:

```text
# .gitattributes
# OAT core
.oat/projects/shared/** linguist-generated=true
# END OAT core

# .gitignore
# OAT core
.oat/config.local.json
.oat/state.md
.oat/projects/local/**
.oat/projects/archived/**
.oat/projects/synced/*/
!.oat/projects/local/.gitkeep
!.oat/projects/archived/.gitkeep
# END OAT core

# .oat/sync/manifest.json
{"version": 2, "oatVersion": "0.3.14", "entries": [], "collections": [], "lastUpdated": "2026-10-02T17:45:18.906Z"}
```

When `.gitignore` and `.gitattributes` already exist (tested with
`node_modules/` and `*.png binary`), OAT **appends** its marked block after a
blank line and leaves the existing lines unchanged (`git status`: ` M .gitattributes`, ` M .gitignore`).

### B2. `oat init` (no scope, so `all`) — exit 0

Same repo writes as B1. In addition, under HOME:

```text
> ~/.oat/sync/manifest.json          (same empty v2 manifest)
> ~/.agents/skills                   [empty dir]
```

### B3. Hook: `oat init --scope project --hook --json` — exit 0

JSON excerpt: `"directoriesCreated": 1, ..., "hookInstalled": true`. Created
`.git/hooks/pre-commit` (mode 755, 158 bytes):

```sh
#!/bin/sh

# >>> oat pre-commit hook >>>
if command -v oat >/dev/null 2>&1; then
  oat status --scope project --hook || true
fi
# <<< oat pre-commit hook <<<
```

What the hook does:

- It runs only if an `oat` binary is on PATH.
- It warns and never blocks, because of `|| true`.
- Observed by putting a wrapper for the branch CLI named `oat` on PATH,
  enabling Claude, adding an unsynced canonical skill and committing. The
  commit printed
  `oat: managed provider views are out of sync - run 'oat sync --scope project'`
  and `git commit` exited 0. The commit was created.
- Run directly, `oat status --scope project --hook` printed nothing and exited
  0 when everything was in sync. With drift it printed the line above and
  exited 1.

Pre-existing hook: with `.git/hooks/pre-commit` containing
`#!/bin/sh\necho user-hook-ran\n`, `--hook` **appended** the marked block after
a blank line and kept the user's lines.

`core.hooksPath`: with `git config core.hooksPath .githooks`, the output was
`Installed optional pre-commit hook at <repo>/.githooks/pre-commit.` The hook
was written into the **working tree** (`?? .githooks/`), not into `.git/hooks`.

Non-interactive default: without `--hook`, no hook is installed. Init prints
`Run "oat init --hook" ...`. Source `commands/init/index.ts:567-574`: in
interactive mode it asks `Install optional pre-commit hook for drift warnings?`.
Re-running `oat init` with neither `--hook` nor `--no-hook` keeps an existing
hook (`index.ts:561-563`).

### B4. Hook removal (verified)

- `oat init --scope project --no-hook --json`, run where the OAT-only hook was
  installed: exit 0, `"hookInstalled": false`. **The whole `pre-commit` file
  was deleted** (`.git/hooks` diff: `< pre-commit`). Re-running it in
  scenario F printed `Removed optional pre-commit hook.`
- With the user's pre-existing hook plus the appended OAT block,
  `--no-hook` removed only the OAT block. The file's SHA-1
  (`1d4e0c63...`) was byte-identical to the original user hook.

### B5. `--project-guidance` on a fresh repo — exit 0

`Project guidance: skipped — No OAT tool pack is installed, so there is no OAT tools guidance to write; AGENTS.md was left unchanged.` No `AGENTS.md` was created. See D7 for the case where `AGENTS.md` is created.

### B6. `oat init --scope project --setup` (non-interactive)

Tested in a repo that already contained `.claude/settings.json` (exit 0).

- **Tool packs:** it ran guided setup and installed **all eight packs at user scope**
  even though `--scope project` was given:
  `Installed tool packs: core (user), ideas (user), docs (user), workflows (user), utility (user), research (user), brainstorm (user), project-management (user)`.
- **HOME writes:** `~/.agents/skills` (271 files), `~/.agents/agents` (5),
  `~/.oat/config.json`, `~/.oat/docs` (103), `~/.oat/ideas` (2),
  `~/.oat/scripts` (3), `~/.oat/templates` (46).
- **gh CLI:** it also wrote `~/.local/state/gh/device-id`. This comes from the `gh` CLI:
  `detectDefaultBranch` runs `gh repo view --json defaultBranchRef` (source
  `packages/cli/src/config/oat-config.ts:2586-2596`). The scratch repo had no
  remote.
- **Repo writes:** only `.oat/config.json` = `{"version":1,"git":{"defaultBranch":"main"}}`.
- **Summary printed:** `Providers: Claude Code`, `Local paths: skipped`,
  `Documentation: skipped`, `Provider sync: skipped`.

---

## C. Providers and `oat sync`

The command is confirmed:
`oat providers set [--scope project|user (default project)] --enabled <csv> --disabled <csv>`.
`oat providers` has the subcommands `list`, `inspect`, `set`, `codex`.

### C1. Setup

Ran `oat init --scope project`, then created the canonical skill
`.agents/skills/hello-demo/SKILL.md` (frontmatter `name`, `description`).

- `oat providers list --scope project` (exit 0) showed all five providers
  (claude, cursor, codex, copilot, gemini) as `not detected`, with no writes.
  The evidence column reports skills as `entry-sync` for claude and
  `native-read` for cursor, codex, copilot and gemini.
- `oat sync --scope project --dry-run` with no provider enabled: exit 0,
  `No changes required.` / `Dry-run only: no filesystem changes were made.`
- The same command without `--dry-run`: exit 0, `No changes required.`, no writes.

### C2. Enable Claude: `oat providers set --scope project --enabled claude` — exit 0

```text
Updated provider configuration: <repo>/.oat/sync/config.json
Enabled: claude
Disabled: (none)
```

It created `.oat/sync/config.json`:
`{"version":1,"defaultStrategy":"auto","knownStrays":[],"providers":{"claude":{"enabled":true}}}`.

### C3. `oat sync --scope project --dry-run` — exit 0, no writes

```text
- create_symlink claude/hello-demo (provider path does not exist)
- [project] claude/skill:fallback-per-entry ownership=none .agents/skills -> .claude/skills
Dry-run only: no filesystem changes were made.
```

### C4. `oat sync --scope project` — exit 0

```text
- project:claude:skill:create_symlink hello-demo
Sync applied successfully.
Provider visibility [project] claude/skill: restart-required — Start a new provider session ...
```

Repo diff: `> ./.claude/skills/hello-demo -> ../../.agents/skills/hello-demo`
is a **relative symlink**. `.oat/sync/manifest.json` was rewritten with one
entry:

```json
{
  "canonicalPath": ".agents/skills/hello-demo",
  "providerPath": ".claude/skills/hello-demo",
  "provider": "claude",
  "contentType": "skill",
  "contentHash": null,
  "isFile": false,
  "lastSynced": "2026-10-02T17:46:45.295Z",
  "strategy": "symlink"
}
```

`git check-ignore` matched none of `.claude/skills/hello-demo`,
`.oat/sync/manifest.json`, `.oat/sync/config.json` (exit 1). All are
committable. Manifest location: project `.oat/sync/manifest.json`, user
`~/.oat/sync/manifest.json`.

### C5. `oat status --scope project`

Text output when in sync, exit 0:

```text
Provider  Name        State      Detail
claude    hello-demo  ✓ in_sync
Provider catalog visibility:
  [project] claude/skill: not-reported (restart-required)
```

With an unsynced skill the row reads
`claude  second-demo  ✗ missing  provider entry missing`. The exit code stays
0 in text mode.

`--json` top-level keys: `packEvidence, packs, providerRefreshAdvice, reports, scope, summary`.

- `reports[]` items: `{canonical, provider, providerPath, state:{status}}`.
- `summary`: `{total, inSync, drifted, missing, stray}`.
- `packs` keys: `availability, evidence, pjm, states, unavailableScopes`.
  `pjm` = `{"state":"none","repoRoot":".oat/repo","recovery":"oat pjm init"}`.

### C6. Bare `oat sync` (default scope `all`)

- With an empty temp HOME and no `~/.claude`: it printed both `Scope: project`
  and `Scope: user`, both `No changes required.`, and **wrote nothing under HOME**.
- After user-scope packs were installed and an empty `~/.claude/` was created,
  so that `providers list --scope user` showed `claude  detected`, bare
  `oat sync` (exit 0) wrote under HOME:
  - `~/.claude/skills/<75 skills>`, each a relative symlink, e.g.
    `~/.claude/skills/analyze -> ../../.agents/skills/analyze`.
  - `~/.claude/agents/<5>.md`, each a relative symlink, e.g.
    `-> ../../.agents/agents/oat-reviewer.md`.
  - `~/.oat/sync/manifest.json` (80 entries).

  User-scope Claude was **not** enabled explicitly. Detection was enough.

### C7. Detection also drives project sync

In a repo that already had `.claude/settings.json` (committed) and no
`providers set` was run, `oat sync --scope project` (exit 0) printed
`Provider config mismatch detected [project] (unset: claude).` It still
**created** `.claude/skills/hello-demo -> ../../.agents/skills/hello-demo` and
did not create `.oat/sync/config.json`.

### C8. Other providers

Ran `oat providers set --scope project --enabled cursor,codex,copilot,gemini`
followed by `oat sync --scope project`. Both exited 0. The repo had all
non-core packs installed at project scope.

| Provider | Files created                                                                                                                          | Symlink or copy                                                                                                                                                                                                                      |
| -------- | -------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| cursor   | `.cursor/agents/` with 67 entries                                                                                                      | 5 relative symlinks (`oat-reviewer.md -> ../../.agents/agents/oat-reviewer.md`, …) plus 62 generated model-variant files (e.g. `oat-reviewer-gpt-5-6-sol-high.md`, header `# oat-managed: true`, `# oat-owner: supported-catalogue`) |
| copilot  | `.github/agents/` with 5 entries                                                                                                       | 5 relative symlinks                                                                                                                                                                                                                  |
| codex    | `.codex/agents/*.toml` (71) and `.codex/config.toml` (289 lines of `[agents.<name>]` tables with `config_file = "agents/<name>.toml"`) | generated files (copies). Each TOML starts `# oat-managed: true`                                                                                                                                                                     |
| gemini   | nothing                                                                                                                                | —                                                                                                                                                                                                                                    |

Skills are not mirrored for cursor, codex, copilot or gemini (`native-read`).
No generated file contained an absolute path (grep for `/var/folders` and
`/Users/` matched nothing).

**Existing `.codex/config.toml`.** With a user-authored
`model = "o3"` and `[mcp_servers.foo]` already present, sync kept those lines
at the top and appended OAT's `[features]`, `[agents]` and `[agents.*]`
tables. Nothing was overwritten.

---

## D. `oat tools install`

`oat tools install --help`: `--scope` (default **all**), `--no-sync`,
`--project-guidance`, `--no-project-guidance`. The pack subcommands are
`core, ideas, docs, project-management, workflows, utility, research, brainstorm`.

### D1. `oat tools install docs --scope project` (after `init --scope project`) — exit 0

```text
Auto-sync completed.
Installed docs tool pack.
Lifecycle: complete (applied)
Scope: project
Reconciled operations: 13
Run: oat sync --scope project
```

Repo writes:

- `.agents/skills/` gained 7 skills (51 files): `authoring-docs`,
  `oat-agent-instructions-analyze`, `oat-agent-instructions-apply`,
  `oat-docs-analyze`, `oat-docs-apply`, `oat-docs-authoring`,
  `oat-docs-bootstrap`.
- `.oat/templates/docs-app-fuma/**` (15 files), `docs-app-mkdocs/**` (8),
  `docs-markdown/**` (2). The two app templates contain their own
  `.gitignore` files (`node_modules/`, `.next/`, `site/`, `.venv/`, …).
- `.oat/scripts/resolve-tracking.sh`
- `.oat/config.json` = `{"version":1,"tools":{"docs":true}}`

HOME: none. No provider was enabled, so the auto-sync created no views.

### D2. `oat tools install workflows --scope project` — exit 0

`Reconciled operations: 62`. Repo writes:

- 40 skills under `.agents/skills/` (`oat-project-*`, `oat-wave-*`,
  `oat-worktree-bootstrap*`, `oat-repo-knowledge-index`, `oat-wrap-up`,
  `oat-explainer-kit`, `oat-cursor-cloud-projects`).
- `.agents/agents/oat-codebase-mapper.md`, `oat-phase-implementer.md`,
  `oat-reviewer.md`.
- Templates: `.oat/templates/{design,discovery,implementation,plan-lite,plan,project-log,project-retro,spec,state,summary}.md`.
- Scripts: `.oat/scripts/generate-oat-state.sh`, `.oat/scripts/generate-thin-index.sh`.
- `.oat/projects-root` (content `.oat/projects/shared`).
- `.oat/projects/local/.gitkeep`, `.oat/projects/archived/.gitkeep`. Both
  are _not_ ignored because of the `!` rules.
- `.oat/config.json` became
  `{"version":1,"tools":{"docs":true,"workflows":true},"projects":{"root":".oat/projects/shared"}}`.

Printed: `Project guidance: not-requested — ... Re-run with --project-guidance ...`.
This single-pack command did **not** add `localPaths` (see D4).

### D3. `oat tools install --scope user` (into temp HOME, from inside the D1/D2 repo) — exit 0

```text
Auto-sync completed.
Installed tool packs: core (user), ideas (user), docs (project + user), workflows (project + user), utility (user), research (user), brainstorm (user), project-management (user)
Run: oat sync --scope user
```

HOME writes (431 files in a clean-HOME rerun):

- `~/.agents/skills/` (75 skill dirs, including core's `oat-docs` and `oat-doctor`)
- `~/.agents/agents/` (5)
- `~/.oat/config.json` = `{"version":1,"tools":{"core":true,"ideas":true,"docs":true,"workflows":true,"utility":true,"project-management":true,"research":true,"brainstorm":true,"requiredBy":{"utility":["research"]}}}`
- `~/.oat/docs/**` (103: a bundled copy of the docs site)
- `~/.oat/ideas/{backlog,scratchpad}.md`
- `~/.oat/scripts/` (3)
- `~/.oat/templates/**` (46)

No `~/.oat/sync/manifest.json` and no `~/.claude` links were created, because no
user provider was detected.

**Also wrote into the repo**, even with `--scope user`:

- `.oat/config.json` gained
  `"localPaths": [".oat/projects/**/pr", ".oat/projects/**/reviews/archived"]`.
- `.gitignore` gained a block:

```text
# OAT local paths
.oat/projects/**/pr/
.oat/projects/**/reviews/archived/
# END OAT local paths
```

The cause is that workflows was already at project scope, so it reported
`(project + user)`. Control: the same command in a repo with only
`init --scope project` changed nothing in the repo.

### D4. Core scope and the localPaths difference

| Command                                            | Exit | Output                                                                                                                                                                                                                                                     | Writes                                                                                                                                                                                                                                                                                                                                          |
| -------------------------------------------------- | ---- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `oat tools install core --scope project`           | 0    | `Installed core tool pack.` / `Lifecycle: complete (unchanged)`                                                                                                                                                                                            | **none**. `--json` shows `"scopes":[]`, `"targetScopes":[]`, `"sync":{"status":"not-run"}`                                                                                                                                                                                                                                                      |
| `oat tools install core` (default scope)           | 0    | `Scope: user` / `Reconciled operations: 4`                                                                                                                                                                                                                 | `~/.oat/config.json` (`{"tools":{"core":true}}`), `~/.agents/skills/oat-docs`, `~/.agents/skills/oat-doctor`, `~/.oat/docs/**` (103 files)                                                                                                                                                                                                      |
| `oat tools install --scope project` (no pack name) | 0    | `Installed tool packs: core (user), ideas (project), docs (project), workflows (project), utility (project), research (project), brainstorm (project), project-management (project)` / `Run: oat sync --scope user` / `Also run: oat sync --scope project` | Core goes to **HOME** (`~/.oat/config.json`, `~/.agents/skills/oat-docs`, `oat-doctor`, `~/.oat/docs`). The other 7 packs go to the repo (73 skill dirs, 5 agents, `.oat/ideas/{backlog,scratchpad}.md`, templates, scripts, `.oat/projects-root`, `.gitkeep`s). It **also** added `localPaths` plus the `# OAT local paths` `.gitignore` block |

So core reaches HOME when the command is the multi-pack form. That is true even
under `--scope project`. `core --scope project` is a silent no-op that still
prints "Installed".

`localPaths` is added by the multi-pack code path whenever workflows targets
project scope (`commands/init/tools/index.ts:1461-1490`). In interactive mode
that path asks
`Should shared-project PR directories and archived review history be local-only (gitignored) or version-controlled?`.
The non-interactive default is `makeLocal = true`. The single-pack
`tools install workflows --scope project` path did not add them (D2).

Config keys: `tools.<pack>: true` (plus `tools.requiredBy`) goes into
`.oat/config.json` for project scope and `~/.oat/config.json` for user scope.
`projects.root` and `localPaths` always go into the repo's `.oat/config.json`.

### D5. Auto-sync and `--no-sync`

Setup: `init`, then `providers set --enabled claude`.

1. `oat tools install docs --scope project --no-sync` exited 0. It printed no
   `Auto-sync completed.` line, created no `.claude/` and left the manifest
   unchanged. `oat status --scope project` afterwards showed
   `claude  authoring-docs  ✗ missing  provider entry missing`.
2. Re-running the same install **without** `--no-sync` printed
   `Lifecycle: complete (unchanged)` and **still created no provider views**.
3. Only an explicit `oat sync --scope project` created the 7
   `.claude/skills/<name> -> ../../.agents/skills/<name>` links.

When the install changes files and `--no-sync` is not passed, auto-sync runs
and creates the views, as in the D1, D2 and scenario F runs with Claude
enabled.

### D6. `oat tools list` / `oat tools info` (read-only, no writes)

`oat tools list` prints a table:

```text
Installed tools:
NAME                    TYPE   VERSION  PACK  SCOPE    STATUS
authoring-docs          skill  1.0.1    docs  project  current
```

`--json` keys: `packEvidence, packs, tools`. Each `tools[]` item:
`{"name","type","scope","version","bundledVersion","pack","status"}`.

`oat tools info oat-project-new` prints Type, Version, Pack, Scope, Status,
Description, Invocable, Args (`'<project-name> [--scope shared|local|synced] [--force]'`)
and Tools, then a per-provider view status for project and for user, e.g.
`claude:  in-sync (symlink)  .claude/skills/oat-project-new`.

### D7. Project guidance (`AGENTS.md`)

`oat tools install docs --scope project --project-guidance` exited 0 and
printed `Project guidance: create — Accepted project guidance created.` It
created a tracked `AGENTS.md` containing a marked block:

```text
<!-- OAT tools -->
## Tool Packs
- **Project skills directory:** `.agents/skills/` (docs packs installed at project scope)
- **Refresh provider views:** `oat sync --scope all`
...
<!-- END OAT tools -->
```

The block recommends `oat sync --scope all`, which also writes under HOME (C6).
Without `--project-guidance`, no `AGENTS.md` is written.

---

## E. Projects (`oat project new`)

`oat project new --help`: `--mode spec-driven|quick|import|lite` (default
spec-driven), `--scope shared|local|synced` (no default in help),
`--no-set-active`, `--no-dashboard`, `--no-commit`, `--force`,
`--with-project-log`, `--no-project-log`.

`oat config describe projects.defaultScope` gives `File: .oat/config.json`,
`Default: synced`, `Owning command: oat config set projects.defaultScope <shared|local|synced>`.
`oat config get projects.defaultScope` printed `synced`.

### E1. With a local bare `origin`, default scope (`oat project new demo`) — exit 0

Setup: workflows pack at project scope, setup committed and pushed.

```text
Created/updated OAT project: demo
Project path: .oat/projects/synced/demo
Scope: synced
Ref: refs/oat/projects/demo
Active project updated in local config: .oat/config.local.json
Scaffold commit: 83d06ec
```

Working tree:

- `.oat/projects/synced/demo.json` is a tracked pointer:
  `{"schemaVersion":1,"slug":"demo","scope":"synced","ref":"refs/oat/projects/demo","remote":"origin","status":"active","createdAt":...,"completedAt":null}`.
- `.oat/projects/synced/demo/` (ignored) is a **linked Git worktree** on a
  detached HEAD. `git worktree list` shows
  `.../repo/.oat/projects/synced/demo 6a1cb1c (detached HEAD)`. It contains
  `design.md`, `discovery.md`, `implementation.md`, `plan.md`, `spec.md`,
  `state.md` and the empty directories `pr/` and `reviews/`. Its `.git` file
  holds an **absolute** path:
  `gitdir: /private/var/folders/.../repo/.git/worktrees/demo`.
- `.oat/config.local.json` (ignored) = `{"version":1,"activeProject":".oat/projects/synced/demo"}`.
- `.oat/state.md` (ignored) is a generated dashboard (`oat_generated: true`).

Commits:

- On the **current branch** (`main`): `83d06ec chore(oat): scaffold demo`.
  It adds only `.oat/projects/synced/demo.json` (10 lines).
- On `refs/oat/projects/demo`: `7a54d31 chore(oat): init synced project demo`,
  then `6a1cb1c chore(oat): scaffold demo` (holds the 6 Markdown files).

Origin: `refs/oat/projects/demo` was **pushed** (bare repo gained
`6a1cb1c... refs/oat/projects/demo`). `main` on origin was **not** pushed and
stayed at the pre-scaffold commit.

A fresh `git clone` of that origin does **not** receive `refs/oat/*`. The clone
showed only `refs/heads/main`, `refs/remotes/origin/HEAD` and
`refs/remotes/origin/main`.

### E2. Without any remote, default scope — exit 1, no writes

```text
Synced project creation requires a configured origin remote. Configure origin or use --scope local.
```

`--json`: `{"status":"error","message":"Synced project creation requires a configured origin remote. Configure origin or use --scope local."}`.
The snapshot diff was empty.

### E3. `oat config set projects.defaultScope shared` — exit 0

It printed `projects.defaultScope=shared` and wrote the tracked
`.oat/config.json` (`"projects":{"root":".oat/projects/shared","defaultScope":"shared"}`).
`git status` showed ` M .oat/config.json`.

`oat config set projects.defaultScope local --local` exited 1 with
`Cannot set structural key 'projects.defaultScope' at 'local' scope. ... can only be set at shared scope (.oat/config.json).`
The surface flags are `--shared`, `--local` and `--user`. With no flag, this
key went to `.oat/config.json`.

`oat project new demo` with shared as the default, no origin needed: exit 0.

```text
Project path: .oat/projects/shared/demo
Scope: shared
Scaffold commit: af8d4c5
```

- Commit `chore(oat): scaffold demo` on the current branch adds
  `.oat/projects/shared/demo/{design,discovery,implementation,plan,spec,state}.md`
  (1130 lines). These files are tracked and not ignored, and `.gitattributes`
  marks them `linguist-generated`.
- `.oat/config.local.json` and `.oat/state.md` were written (ignored). No refs
  were pushed.
- Path-scoped commit: with an unrelated staged file (`A staged.txt`) and an
  unstaged edit present, the scaffold commit contained only the 6 project
  files. Both unrelated changes stayed as they were.

### E4. `oat config set projects.defaultScope local`, then `oat project new demo-local` — exit 0

```text
Project path: .oat/projects/local/demo-local
Scope: local
Scaffold commit: skipped (--no-commit)
```

The message says `--no-commit` although that flag was not passed. The project
files are written under `.oat/projects/local/demo-local/` (ignored). There is
no commit and no ref. `.oat/config.local.json` and `.oat/state.md` were updated.

---

## F. Removal / backing out

Supported commands found in `--help`. There is **no** `oat uninstall` and no
`oat init --remove`.

- `oat tools remove [name] [--pack <pack>] [--all] [--scope] [--dry-run] [--no-sync]`
- `oat remove skill <name> [--scope] [--dry-run]`
- `oat remove skills --pack <pack> [--scope] [--dry-run]`
- `oat providers set --disabled <csv>`
- `oat init --no-hook`
- `oat project prune [project-path|slug]` (synced only)
- `oat project archive [project-path]`
- `oat cleanup project|artifacts`
- `oat local remove <paths>`, `oat local apply`

### F0. Scenario setup (snapshot 0 = pre-OAT)

The repo had a `.gitignore` of `node_modules/` and a bare origin with `main`
pushed. The temp HOME had `~/.claude/settings.json` (simulating an installed
Claude Code). Then I ran:

```text
oat init --scope project --hook
oat providers set --scope project --enabled claude
# add .agents/skills/hello-demo/SKILL.md
oat tools install --scope project
oat sync
git add -A && git commit -m "adopt oat" && git push
oat project new demo                          # synced
oat project new demo-shared --scope shared
oat project new demo-local --scope local
```

All exited 0. The result:

- Repo: 435 new files and links.
- HOME: `~/.agents/skills/{oat-docs,oat-doctor}`, `~/.claude/skills/{oat-docs,oat-doctor}`
  (symlinks), `~/.oat/config.json`, `~/.oat/docs/**`,
  `~/.oat/sync/manifest.json`. `~/.claude/settings.json` was untouched.
- Origin: `refs/oat/projects/demo`.
- Hook: `.git/hooks/pre-commit`.

### F1. `oat tools remove --all` — **fails**

- `oat tools remove --all --scope project --dry-run`: exit **2**,
  `Pack core does not allow project scope`.
- `oat tools remove --all --dry-run` (default scope all): exit **2**, the same
  message.
- `oat tools remove --all --scope user --dry-run`: exit 0,
  `Would remove: oat-docs (user)` / `Would remove: oat-doctor (user)`.

### F2. Per-pack removal at project scope — all exit 0

Ran `oat tools remove --pack <p> --scope project` for each of ideas, docs,
workflows, utility, research, brainstorm, project-management. Each printed
`Auto-sync completed.` and `Removed: <name> (project)` lines.

Removed:

- every pack skill under `.agents/skills/` and every agent under `.agents/agents/`
- their `.claude/skills/*` and `.claude/agents/*` symlinks (pruned by the auto-sync)
- `.oat/scripts/*.sh`

Remaining in the repo:

- `.agents/skills/hello-demo` (user-authored) and its `.claude` link
- `.oat/templates/**` (all 46 template files)
- `.oat/ideas/{backlog,scratchpad}.md`
- `.oat/projects-root`
- `.oat/config.json`, now `{"tools":{"requiredBy":{"utility":["research"]}},"projects":{...},"localPaths":[...]}`
- `.oat/sync/{config,manifest}.json`
- both `.gitignore` blocks and `.gitattributes`
- the projects
- empty dirs `.agents/agents`, `.agents/rules`, `.claude/agents`, `.oat/scripts`

Stale `requiredBy` side effect: `oat status --scope project` then reported
`utility: project (absent, 10 missing) ... Fix: oat tools update --pack utility --scope project`.

Generated provider copies are **not** removed. In a repo with cursor, codex
and copilot enabled, removing workflows and research left:

- `.cursor/agents`: 62 generated model-variant files (only the 5 symlinks went)
- `.codex/agents`: 71 TOML files
- `.codex/config.toml`: 69 `[agents.*]` tables

`.github/agents` symlinks went from 5 to 0. A following `oat sync --scope project`
printed `No changes required.` / `codex:config:skip .codex/config.toml` and
removed nothing.

### F3. `oat tools remove --all --scope user` — exit 0

```text
Auto-sync completed.
Removed: oat-docs (user)
Removed: oat-doctor (user)
```

Removed `~/.agents/skills/oat-docs`, `oat-doctor`, `~/.oat/docs/**` and the two
`~/.claude/skills/*` links.

Remaining under HOME:

- `~/.oat/config.json` = `{"version": 1}`
- `~/.oat/sync/manifest.json`
- empty `~/.agents/skills/`
- empty `~/.claude/skills/` (created by OAT; `~/.claude/settings.json` was
  untouched)

### F4. `oat providers set --scope project --disabled claude` — exit 0

It only rewrote `.oat/sync/config.json` (`"claude":{"enabled":false}`). The
existing `.claude/skills/hello-demo` link **remained**.

`oat sync --scope project --dry-run` and `oat sync --scope project` (both exit 0) printed `Provider config mismatch detected [project] (disabled: claude).` /
`No changes required.` and removed nothing. `oat status --scope project`
printed `No managed entries found.`, but the manifest still listed the
`.claude/skills/hello-demo` entry.

### F5. `oat remove skill hello-demo --scope project`

Run with Claude re-enabled, exit 0: `[apply][project] removed .agents/skills/hello-demo`.
It removed the canonical skill **and** the `.claude/skills/hello-demo` link,
and the manifest `entries` became `[]`. The dry-run form printed only
`[dry-run][project] remove .agents/skills/hello-demo`.

### F6. `oat project prune demo` (synced) — exit 0

```text
Pruning demo removes refs/oat/projects/demo; pinned links will stop resolving. Durable local/S3 archives are preserved.
Pruned synced project demo.
```

- Removed the worktree `.oat/projects/synced/demo/` (and its
  `.git/worktrees/demo`) and the pointer `demo.json`.
- Deleted the local `refs/oat/projects/demo` **and the origin's
  `refs/oat/projects/demo`** (bare diff `< ... refs/oat/projects/demo`).
- Committed `chore(oat): prune synced project demo` on `main` (deletes
  `demo.json`).
- Left an empty `.oat/projects/synced/`.

On a shared project, `oat project prune .oat/projects/shared/demo-shared`
exited 1 with `Project ... is in shared scope; this command requires synced scope.`
`oat project archive <shared> --dry-run` (exit 0) only _moves_ the project to
`.oat/projects/archived/<name>`. `oat cleanup project --dry-run` reported
`scanned=2, issues=0 ... actions: none`. No command deletes shared or local
projects.

### F7. `oat init --scope project --no-hook` — exit 0

`Removed optional pre-commit hook.`, and `.git/hooks/pre-commit` was gone. See
B4 for the case of a pre-existing user hook.

### F8. Manual steps to reach the pre-OAT state (performed in the scratch repo and verified)

Starting from what remained after F2 to F7:

```sh
git rm -r -q --cached .agents .claude .oat .gitattributes   # .gitattributes did not exist before OAT
rm -r .agents .claude .oat .gitattributes                   # also removes ignored .oat/config.local.json, .oat/state.md, .oat/projects/local/*
# delete the "# OAT core ... # END OAT core" and "# OAT local paths ... # END OAT local paths" blocks
# (and the blank line OAT added before each) from .gitignore
git add .gitignore && git commit -m "remove oat"
# HOME:
rm -r ~/.oat ~/.agents          # only because neither existed before OAT
rmdir ~/.claude/skills          # empty dir OAT created; ~/.claude itself pre-existed
```

Result:

- `git rev-parse HEAD^{tree}` equalled the pre-OAT commit's tree
  (`d9feed10...` in both).
- The file, link and empty-directory snapshot of the repo and of HOME, the
  `.git/hooks` listing and `git config --local` all matched snapshot 0
  exactly, with no leftovers. `git config --get-regexp 'oat|worktree'`
  returned nothing, and `git for-each-ref 'refs/oat/*'` was empty.
- The only remaining differences are history. Local `main` keeps the OAT
  commits, and origin `main` keeps my own pushed "adopt oat" commit. Rewriting
  history was out of scope.

Manual removal of a synced project without `prune` (separate scratch repo):
all three commands exited 0.

```sh
git worktree remove .oat/projects/synced/demo
git update-ref -d refs/oat/projects/demo
git push origin --delete refs/oat/projects/demo    # " - [deleted]  refs/oat/projects/demo"
```

The tracked pointer `.oat/projects/synced/demo.json` stays committed on the
branch and must be `git rm`'d separately.

---

## G. Paths OAT created in the repository

"Ignored" means matched by OAT's own `.gitignore` block (checked with
`git check-ignore`).

| Path                                                                   | Created by                                                                                                                                       | Tracked or ignored                                                          | Machine-specific data?                                                       | Notes                                                                                  |
| ---------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------ | --------------------------------------------------------------------------- | ---------------------------------------------------------------------------- | -------------------------------------------------------------------------------------- |
| `.gitignore` (`# OAT core` block)                                      | `oat init` (any scope incl. project)                                                                                                             | tracked                                                                     | no                                                                           | appended to an existing file                                                           |
| `.gitignore` (`# OAT local paths` block)                               | multi-pack `oat tools install` / `--setup` with workflows at project scope; also `tools install --scope user` when workflows is at project scope | tracked                                                                     | no                                                                           | ignores `.oat/projects/**/pr/`, `.oat/projects/**/reviews/archived/`                   |
| `.gitattributes`                                                       | `oat init`                                                                                                                                       | tracked                                                                     | no                                                                           | `.oat/projects/shared/** linguist-generated=true`                                      |
| `.agents/skills/`, `.agents/agents/`, `.agents/rules/`                 | `oat init` (empty dirs)                                                                                                                          | not ignored                                                                 | no                                                                           | empty dirs are invisible to Git                                                        |
| `.agents/skills/<skill>/**`                                            | `oat tools install <pack> --scope project`                                                                                                       | not ignored                                                                 | no (one bundled reference doc has the example text `cwd:/Users/alice`)       | real files (copies of bundled skills)                                                  |
| `.agents/agents/*.md`                                                  | workflows / research packs                                                                                                                       | not ignored                                                                 | no                                                                           |                                                                                        |
| `.oat/sync/manifest.json`                                              | `oat init`; rewritten by `oat sync`                                                                                                              | not ignored                                                                 | timestamps (`lastUpdated`, `lastSynced`) and `oatVersion`; no absolute paths |                                                                                        |
| `.oat/sync/config.json`                                                | `oat providers set`                                                                                                                              | not ignored                                                                 | no                                                                           |                                                                                        |
| `.oat/config.json`                                                     | `tools install`, `config set`, `--setup`                                                                                                         | not ignored                                                                 | no                                                                           | `tools.*`, `projects.*`, `localPaths`, `git.defaultBranch`                             |
| `.oat/config.local.json`                                               | `oat project new`                                                                                                                                | ignored                                                                     | `activeProject` (repo-relative)                                              |                                                                                        |
| `.oat/state.md`                                                        | `oat project new`                                                                                                                                | ignored                                                                     | generated date                                                               | dashboard                                                                              |
| `.oat/projects-root`                                                   | workflows pack                                                                                                                                   | not ignored                                                                 | no                                                                           | content `.oat/projects/shared`                                                         |
| `.oat/projects/local/.gitkeep`, `.oat/projects/archived/.gitkeep`      | workflows pack                                                                                                                                   | not ignored (negated)                                                       | no                                                                           |                                                                                        |
| `.oat/scripts/*.sh`                                                    | docs (`resolve-tracking.sh`), workflows (`generate-oat-state.sh`, `generate-thin-index.sh`)                                                      | not ignored                                                                 | no                                                                           | removed by `tools remove`                                                              |
| `.oat/templates/**`                                                    | docs, workflows, ideas, project-management packs                                                                                                 | not ignored                                                                 | no                                                                           | **not** removed by `tools remove`; the app templates contain nested `.gitignore` files |
| `.oat/ideas/{backlog,scratchpad}.md`                                   | ideas pack (project)                                                                                                                             | not ignored                                                                 | no                                                                           | not removed by `tools remove`                                                          |
| `AGENTS.md` (`<!-- OAT tools -->` block)                               | `--project-guidance` only                                                                                                                        | tracked                                                                     | no                                                                           |                                                                                        |
| `.claude/skills/<name>`                                                | `oat sync` (Claude enabled or `.claude/` detected)                                                                                               | not ignored                                                                 | no                                                                           | **relative symlink** `../../.agents/skills/<name>`                                     |
| `.claude/agents/<name>.md`                                             | `oat sync`                                                                                                                                       | not ignored                                                                 | no                                                                           | relative symlink `../../.agents/agents/<name>.md`                                      |
| `.cursor/agents/*.md`                                                  | `oat sync` (cursor)                                                                                                                              | not ignored                                                                 | no                                                                           | 5 relative symlinks plus 62 generated copies (`# oat-managed: true`)                   |
| `.github/agents/*.md`                                                  | `oat sync` (copilot)                                                                                                                             | not ignored                                                                 | no                                                                           | relative symlinks                                                                      |
| `.codex/agents/*.toml`, `.codex/config.toml`                           | `oat sync` (codex)                                                                                                                               | not ignored                                                                 | no                                                                           | generated copies; `config.toml` is merged into an existing file                        |
| `.oat/projects/shared/<name>/*.md`                                     | `oat project new --scope shared`                                                                                                                 | tracked, **committed automatically**                                        | dates only                                                                   | `pr/`, `reviews/` empty dirs                                                           |
| `.oat/projects/local/<name>/**`                                        | `oat project new --scope local`                                                                                                                  | ignored                                                                     | dates only                                                                   | no commit                                                                              |
| `.oat/projects/synced/<name>.json`                                     | `oat project new` (synced)                                                                                                                       | tracked, **committed automatically**                                        | `createdAt` timestamp                                                        | pointer to `refs/oat/projects/<name>` on `origin`                                      |
| `.oat/projects/synced/<name>/`                                         | `oat project new` (synced)                                                                                                                       | ignored                                                                     | **yes**: its `.git` file holds the absolute `gitdir:` path                   | linked worktree, detached HEAD                                                         |
| `.git/hooks/pre-commit` (or `<core.hooksPath>/pre-commit`)             | `oat init --hook`                                                                                                                                | outside the tree, or **inside** the tree when `core.hooksPath` points there | no                                                                           | marked block                                                                           |
| `.git/worktrees/<name>`, `refs/oat/projects/<name>` (local and origin) | synced `oat project new`                                                                                                                         | Git internals and remote ref                                                | absolute paths inside `.git/worktrees`                                       |                                                                                        |

Under HOME:

- `~/.oat/sync/manifest.json` and `~/.agents/skills/`: from `oat init` with
  default scope.
- `~/.oat/config.json`, `~/.oat/docs/**`, `~/.agents/skills/{oat-docs,oat-doctor}`:
  core pack.
- `~/.agents/**` and `~/.oat/{ideas,scripts,templates}/**`: user-scope packs.
- `~/.claude/{skills,agents}/*`: relative symlinks, created only when
  `~/.claude` exists.
- `~/.local/state/gh/device-id`: from the `gh` CLI that `--setup` invokes.

No HOME file contained an absolute path.

---

## H. Surprising or destructive observations (with reproduction)

1. **`oat tools remove --all` fails** with exit 2 and
   `Pack core does not allow project scope`, both with default scope and with
   `--scope project`. Repro: `oat tools install --scope project`, then
   `oat tools remove --all --dry-run`. Only `--all --scope user` works.
2. **`oat tools install core --scope project` is a no-op that reports
   success.** Exit 0, `Installed core tool pack.`, with no files written
   (`targetScopes: []`).
3. **A `--scope user` install writes into the current repo.** If workflows
   is already installed at project scope, `oat tools install --scope user`
   adds `localPaths` to `.oat/config.json` and a `# OAT local paths` block to
   `.gitignore` (D3).
4. **`oat init --scope project --setup` installs every pack into HOME** and
   runs `gh repo view` (B6).
5. **localPaths differs by command path.** `tools install workflows --scope project`
   adds no `localPaths`. `tools install --scope project` adds them, so
   `.oat/projects/**/pr` is committable in one setup and ignored in the other
   (D2, D4).
6. **Disabling a provider leaves its views in place.**
   `providers set --disabled claude` followed by `sync` keeps the
   `.claude/skills/*` links, and `status` then says `No managed entries found.`
   (F4).
7. **Pack removal leaves generated provider copies.** Removing
   workflows/research leaves 62 `.cursor/agents` files, 71 `.codex/agents`
   TOMLs and 69 `[agents.*]` tables in `.codex/config.toml`. `oat sync`
   reports no changes (F2).
8. **Pack removal leaves state behind:** `.oat/templates/**`, `.oat/ideas/*`,
   `.oat/projects-root`, both `.gitignore` blocks, `.gitattributes`, `localPaths`
   and a stale `tools.requiredBy.utility`. The last one makes `oat status`
   report `utility ... 10 missing` and advise `oat tools update` (F2).
9. **A detected provider is synced without opt-in.** An existing `.claude/`
   directory in the repo or in HOME makes `oat sync` create Claude views
   without any `providers set`. In the repo it prints only a warning (C6, C7).
10. **Project creation commits and pushes automatically.** `oat project new`
    with the default (synced) scope commits a pointer file to the current
    branch and pushes `refs/oat/projects/<name>` to `origin`. Shared scope
    commits the six project files. `oat project prune` deletes the origin ref
    (E1, E3, F6).
11. **`oat init --no-hook` deletes the whole `pre-commit` file** when it holds
    only OAT's block. It is non-destructive with a user hook: only the block
    goes (B4).
12. **With `core.hooksPath` set, the hook lands in the working tree**
    (e.g. `.githooks/pre-commit`), where it can be committed (B3).
13. **A re-run does not sync after `--no-sync`.** After
    `tools install <pack> --no-sync`, re-running without `--no-sync` reports
    `unchanged` and does not create provider views. You must run
    `oat sync --scope project` (D5).
14. **`oat project new --scope local` prints a misleading line:**
    `Scaffold commit: skipped (--no-commit)` without the flag (E4).
15. **EPIPE crash on piped output.** Piping `oat tools list` or `oat status`
    into `head` crashed with an unhandled `Error: write EPIPE` stack trace
    (`packages/cli/src/ui/logger.ts:25`).
16. Nothing was ever deleted or overwritten outside the targets above. In
    particular, the pre-existing `.gitignore`, `.gitattributes`, user hook,
    `.codex/config.toml` content and `~/.claude/settings.json` all survived.

---

## Not observed / could not run

- **Interactive prompts.** I had no TTY, so none were exercised. Read from
  source only:
  - `oat init` hook prompt `Install optional pre-commit hook for drift warnings?`
    (non-interactive: skip and print a hint)
  - `Configure Git hooks to use <path> before installing the OAT hook?`
  - provider multi-select `Select supported project providers`
    (non-interactive: print the `oat providers set ...` hint)
  - the workflows localPaths prompt (non-interactive: make them local)
  - the `--setup` steps for local paths, documentation and provider sync
    (non-interactive: skipped)
  - the CLI self-update prompt described at `tool-packs.md:420-436`
    (documented as not shown for non-interactive or source-development runs).
- **Install and alternative runners.** `npm install --global @open-agent-toolkit/cli`
  was not run (instructed), and neither was any `npx` form.
- **The published package and the `dist` build** were not exercised. All runs
  used `tsx` on the source with the prebuilt `assets/`.
- **`gh repo view` against a real GitHub remote** (it would contact GitHub).
  With no remote it failed silently and the default branch came out as `main`.
- **Other platforms.** Behaviour on Windows, Linux and other filesystems, and
  the copy fallback for symlinks: only macOS was observed, where every view was
  either a relative symlink or a generated file.
- **Provider strategies under user scope** for cursor, codex, copilot and gemini.
  Only Claude was detected or enabled at user scope.
- **Deeper project commands:** `oat project push`, `pull`, `archive` (non-dry-run),
  `migrate`, and S3 archive behaviour.
- **PJM:** `oat pjm init` and the `.oat/repo/` tree it creates.
- **Remote-ref effects of later lifecycle commands** (e.g. `project push`
  after edits).
- **`oat remove skills --pack`, `oat local remove` and `oat local apply`** were
  not executed. Only `--help` was read.
- **`oat tools update`, `outdated`, `migrate`** were not executed.
- **Instruction files:** `CLAUDE.md` shim creation (`oat instructions sync`) and
  `.agents/rules` content syncing (no rules were created).
- **Git version checks.** No test ran with Git below 2.31.
