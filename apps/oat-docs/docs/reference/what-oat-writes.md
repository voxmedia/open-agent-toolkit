---
title: What OAT Writes
description: 'Every file, link and Git ref that OAT commands create in your repository, under your home directory and on origin, what to commit, and how to remove all of it.'
---

# What OAT Writes

This page lists what each OAT command writes in your repository, under your
home directory and on your shared `origin` remote, which of those files belong
in Git, and how to back out of OAT completely. Everything here was observed by
running OAT CLI version 0.3.14 on macOS. The removal procedure in
[Remove everything](#remove-everything) was run end to end twice, once
originally and once in an independent re-run, and both times it returned the
repository and the home directory to their pre-OAT state.

A few terms used below. **Canonical assets** are the skills and agent
definitions OAT keeps under `.agents/`; they are the source you edit. A
**provider view** is the copy or link OAT creates from a canonical asset in the
folder a coding tool reads, such as `.claude/skills/`. **Scope** says where a
command works: `project` means the current repository, `user` means your home
directory, and `all` means both. A **tool pack** is a named bundle of skills,
agents, templates and scripts that `oat tools install` adds.

## The short version

- With `--scope project`, `oat init`, `oat sync` and `oat tools install <pack>`
  write only inside the repository. Two forms are exceptions:
  `oat tools install --scope project` without a pack name also installs the
  `core` pack under your home directory, and `oat init --scope project --setup`
  installs every pack there.
- Without `--scope`, `oat init` and `oat sync` use scope `all`, so they can
  also write under your home directory, and `oat tools install <pack>` installs
  a pack that is not yet installed under your home directory (user scope).
- The `core` pack is user-only: it installs under your home directory or not at
  all.
- Tracked projects default to **synced** scope, which keeps a project's files on
  a dedicated Git ref. Creating one commits a small pointer file to your current
  branch and pushes `refs/oat/projects/<name>` to `origin`. Apart from
  `oat project prune`, which deletes that ref again, no other command observed
  here changed `origin`, and none pushed a branch.
- There is no single uninstall command. The manual steps in
  [Remove everything](#remove-everything) return the repository's files and your
  home directory to their pre-OAT state; Git history keeps OAT's commits.

## What each command writes

Where a file already existed, OAT appended its own marked block instead of
replacing it. This held for `.gitignore`, `.gitattributes`, an existing
`pre-commit` hook and the other settings in an existing `.codex/config.toml`
(OAT does change `multi_agent` and `max_depth` there; see the
[provider table](#syncing-provider-views)). A pre-existing
`~/.claude/settings.json` was left untouched.

### Setting up

| Command                    | In the repository                                                                                                                                                    | Under your home directory                                   | On `origin` |
| -------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------- | ----------- |
| `oat init --scope project` | `.gitignore` and `.gitattributes` (created, or an `# OAT core` block appended); `.oat/sync/manifest.json`; empty `.agents/skills`, `.agents/agents`, `.agents/rules` | Nothing                                                     | Nothing     |
| `oat init` (scope `all`)   | The same as above                                                                                                                                                    | `~/.oat/sync/manifest.json` and an empty `~/.agents/skills` | Nothing     |

`oat init` creates no `AGENTS.md` and no `.oat/config.json`. Run
non-interactively, it installs no hook unless you pass `--hook`.

### The optional pre-commit hook

| Command                             | Writes                                                                                                                                                            |
| ----------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `oat init --scope project --hook`   | `.git/hooks/pre-commit`. If a hook already exists, OAT appends a marked block and keeps your lines.                                                               |
| The same, with `core.hooksPath` set | The hook goes to that path instead. With `core.hooksPath .githooks`, it was written to `.githooks/pre-commit` inside the working tree, where it can be committed. |

The hook runs `oat status --scope project --hook` only if an `oat` binary is on
your `PATH`. When provider views are out of date it prints
`oat: managed provider views are out of sync - run 'oat sync --scope project'`.
It never blocks a commit.

### Syncing provider views

`oat providers set --scope project --enabled <providers>` writes
`.oat/sync/config.json`. `oat sync` then creates views for each enabled
provider and rewrites `.oat/sync/manifest.json`, the file that records which
views OAT manages. A provider does not have to be enabled: an existing
`.claude/` directory in the repository, or `~/.claude/` in your home directory,
is enough for `oat sync` to create Claude views.

| Provider | Repository views created by `oat sync --scope project`                                                                                                                                                                                                                                                |
| -------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Claude   | `.claude/skills/<name>` and `.claude/agents/<name>.md`, relative symlinks into `.agents/`                                                                                                                                                                                                             |
| Cursor   | `.cursor/agents/`: relative symlinks for agents, plus generated model-variant files marked `# oat-managed: true`                                                                                                                                                                                      |
| Copilot  | `.github/agents/`, relative symlinks                                                                                                                                                                                                                                                                  |
| Codex    | `.codex/agents/*.toml` and `.codex/config.toml`, generated files. In an existing `config.toml`, OAT adds its `[agents.<name>]` tables and sets `[features] multi_agent = true` and `[agents] max_depth` to at least 2, changing those two values if you had set them lower; your other settings stay. |
| Gemini   | Nothing                                                                                                                                                                                                                                                                                               |

OAT creates skill views only for Claude. It reports the other providers' skill
support as `native-read` and creates no skill views for them. No generated
file contained an absolute path.

| Command                    | Under your home directory                                                                                                                                                                                                                                                                           |
| -------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `oat sync --scope project` | Nothing                                                                                                                                                                                                                                                                                             |
| `oat sync` (scope `all`)   | When it detects a provider in your home directory (observed: an existing `~/.claude/`), relative symlinks in `~/.claude/skills/` and `~/.claude/agents/` for your user-scope skills and agents, and `~/.oat/sync/manifest.json`. With no `~/.claude/` and nothing installed at user scope, nothing. |

### Installing tool packs

| Command                                    | In the repository                                                                                                                                                                                                                                           | Under your home directory                                                                                                                                                               |
| ------------------------------------------ | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `oat tools install <pack> --scope project` | The pack's skills in `.agents/skills/`, plus any agents in `.agents/agents/`, templates in `.oat/templates/` and scripts in `.oat/scripts/` it ships; `tools.<pack>: true` in `.oat/config.json`. Views for enabled providers, unless you pass `--no-sync`. | Nothing                                                                                                                                                                                 |
| `oat tools install --scope user`           | Nothing, unless the workflows pack is already installed at project scope (see [surprises](#known-surprises-in-0314))                                                                                                                                        | `~/.agents/skills/`, `~/.agents/agents/`, `~/.oat/config.json`, `~/.oat/docs/`, `~/.oat/ideas/`, `~/.oat/scripts/`, `~/.oat/templates/`. Provider links only if a provider is detected. |
| `oat tools install core`                   | Nothing                                                                                                                                                                                                                                                     | `~/.oat/config.json`, `~/.agents/skills/oat-docs`, `~/.agents/skills/oat-doctor`, and `~/.oat/docs/` (a bundled copy of these docs)                                                     |

Some packs write more at project scope. The ideas pack adds
`.oat/ideas/backlog.md` and `.oat/ideas/scratchpad.md`. The workflows pack adds
`.oat/projects-root`, `.oat/projects/local/.gitkeep`,
`.oat/projects/archived/.gitkeep` and a `projects.root` setting. Passing
`--project-guidance` adds a marked `<!-- OAT tools -->` block to `AGENTS.md`,
creating the file if needed. Installing every pack at once with
`oat tools install --scope project` puts core in your home directory and the
other seven packs in the repository, and also adds a `localPaths` setting and a
`# OAT local paths` block to `.gitignore`.

No tool pack command wrote to `origin`.

### Creating tracked projects

A tracked project is the set of planning and implementation files OAT keeps for
one piece of work. Its scope decides where those files live.

| Command                                   | In the repository                                                                                                                                                                       | On `origin`                                                  |
| ----------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------ |
| `oat project new <name>` (synced default) | Commits `.oat/projects/synced/<name>.json`, a small pointer file, to the current branch. Creates the project files in an ignored linked Git worktree at `.oat/projects/synced/<name>/`. | Pushes `refs/oat/projects/<name>`. The branch is not pushed. |
| `oat project new <name> --scope shared`   | Commits six Markdown files under `.oat/projects/shared/<name>/` to the current branch. The commit contains only those files; other staged or unstaged changes are left alone.           | Nothing                                                      |
| `oat project new <name> --scope local`    | Writes the project under `.oat/projects/local/<name>/`, which is ignored. No commit.                                                                                                    | Nothing                                                      |

Every scope also writes two ignored files: `.oat/config.local.json`, which
records the active project, and `.oat/state.md`, a generated dashboard. A
synced project also adds Git's own `.git/worktrees/<name>` and a local
`refs/oat/projects/<name>` ref.

Without an `origin` remote, the default command exits with
`Synced project creation requires a configured origin remote. Configure origin or use --scope local.`
and writes nothing. To make another scope the default, run
`oat config set projects.defaultScope shared` (or `local`), which edits the
tracked `.oat/config.json`.

## What to commit

"Ignored" means OAT's own `.gitignore` block matches the path. "Machine data"
is anything that differs between machines.

### Setup and configuration

| Path                                      | What it is                                          | Ignored? | Machine data?                        | Commit it?                                                                                                              |
| ----------------------------------------- | --------------------------------------------------- | -------- | ------------------------------------ | ----------------------------------------------------------------------------------------------------------------------- |
| `.gitignore` (OAT blocks)                 | Rules that keep OAT's local files out of Git        | No       | No                                   | Yes: these rules are what keep the local-only files below out of commits                                                |
| `.gitattributes` (OAT block)              | Marks `.oat/projects/shared/**` as generated        | No       | No                                   | Safe to commit: nothing in it differs between machines                                                                  |
| `.oat/config.json`                        | Installed packs, project settings                   | No       | No                                   | Yes: `projects.defaultScope` can only be set in this file, and `projects.root` and `localPaths` are always written here |
| `.oat/sync/config.json`                   | Which providers the repository enables              | No       | No                                   | Yes: without it, `oat sync` falls back to detecting provider folders                                                    |
| `.oat/sync/manifest.json`                 | Record of the views OAT manages                     | No       | Timestamps and OAT version; no paths | Team choice (see below)                                                                                                 |
| `.oat/config.local.json`, `.oat/state.md` | Active project; generated dashboard                 | Yes      | Yes                                  | Ignored by OAT's own rules                                                                                              |
| `AGENTS.md` (OAT block)                   | Guidance for agents, only with `--project-guidance` | No       | No                                   | Team choice (see below)                                                                                                 |
| `<hooksPath>/pre-commit`                  | The hook, when `core.hooksPath` is inside the tree  | No       | No                                   | Team choice (see below)                                                                                                 |

### Canonical assets and pack files

| Path                                                                    | What it is                             | Ignored? | Machine data? | Commit it?                                                            |
| ----------------------------------------------------------------------- | -------------------------------------- | -------- | ------------- | --------------------------------------------------------------------- |
| `.agents/skills/`, `.agents/agents/`                                    | Canonical skills and agents            | No       | No            | Yes: it is the source your team edits, and committed views link to it |
| `.oat/templates/`, `.oat/scripts/`, `.oat/ideas/`, `.oat/projects-root` | Files a pack installs at project scope | No       | No            | Team choice (see below)                                               |
| `.oat/projects/local/.gitkeep`, `.oat/projects/archived/.gitkeep`       | Placeholders                           | No       | No            | Yes: OAT's own rules explicitly un-ignore them                        |

### Provider views

| Path                                                                                         | What it is                        | Ignored? | Machine data? | Commit it?                                     |
| -------------------------------------------------------------------------------------------- | --------------------------------- | -------- | ------------- | ---------------------------------------------- |
| `.claude/skills/`, `.claude/agents/`, `.github/agents/`, symlinks in `.cursor/agents/`       | Relative symlinks into `.agents/` | No       | No            | Yes: relative links, the same on every machine |
| Generated files in `.cursor/agents/`, `.codex/agents/`, OAT's tables in `.codex/config.toml` | Generated copies                  | No       | No            | Team choice (see below)                        |

### Projects

| Path                                                         | What it is                               | Ignored?                                        | Machine data?                   | Commit it?                                                |
| ------------------------------------------------------------ | ---------------------------------------- | ----------------------------------------------- | ------------------------------- | --------------------------------------------------------- |
| `.oat/projects/shared/<name>/`                               | A shared project's files                 | No                                              | Dates only                      | OAT commits it for you                                    |
| `.oat/projects/synced/<name>.json`                           | Pointer to the synced project's ref      | No                                              | A creation timestamp            | OAT commits it for you                                    |
| `.oat/projects/synced/<name>/`                               | Linked Git worktree                      | Yes                                             | Yes: an absolute `gitdir:` path | No: contains an absolute path; ignored by OAT's own rules |
| `.oat/projects/local/<name>/`                                | A local project's files                  | Yes                                             | Dates only                      | Ignored by OAT's own rules                                |
| `.oat/projects/**/pr/`, `.oat/projects/**/reviews/archived/` | Project PR material and archived reviews | Only if the `# OAT local paths` block was added | No                              | Team choice (see below)                                   |

**Where "Team choice" applies:**

- **`.oat/sync/manifest.json`.** A sync that changes a view, or that runs with
  a different CLI version than the last one, rewrites it with new timestamps
  and its own version, so committing it adds diffs to sync commits and to
  mixed-version teams. Leaving it out means a fresh clone
  has no record of which views OAT manages. How OAT behaves in a clone without
  it is not covered here.
- **Generated provider files** (Cursor model variants, Codex agents and
  `config.toml` tables). Committed, they arrive with every clone. Not
  committed, each teammate runs `oat sync --scope project` to generate them.
  Either way, `oat tools remove` does not delete them; see
  [Backing out](#backing-out).
- **Pack files in `.oat/`** (templates, scripts, ideas, `projects-root`).
  Committed, every clone has them. Not committed, each teammate needs the same
  `oat tools install` to get them.
- **`AGENTS.md` guidance block.** It tells agents how to refresh views, but the
  command it recommends, `oat sync --scope all`, also writes under each
  reader's home directory.
- **A hook inside the working tree.** Committed, everyone using that hooks path
  gets the drift warning. A hook in `.git/hooks` is never committed.
- **`pr/` and `reviews/archived/` folders.** Whether PR material and archived
  reviews are shared through Git or stay on each machine. Whether OAT ignores
  them depends on which install command you ran; see
  [surprises](#known-surprises-in-0314).

## A new teammate after cloning

1. **Install the CLI.** The README gives
   `npm install --global @open-agent-toolkit/cli` and requires Node.js 22.17 or
   newer and Git 2.31 or newer.
2. **Check the views.** Run `oat status --scope project`. Committed symlink
   views are relative links into `.agents/`, so they point at the same files in
   every clone. A row marked `✗ missing` means a view was not committed or not
   yet generated; run `oat sync --scope project` to create it. Generated Cursor
   and Codex files exist only if your team committed them. After a sync, OAT
   reports Claude views as `restart-required`: start a new Claude Code session
   to pick them up.
3. **Add the hook if you want it.** `.git/hooks` is not part of a clone, so
   each teammate who wants the drift warning runs
   `oat init --scope project --hook`.
4. **Install personal packs separately.** User-scope packs live under each
   person's `~/.agents` and `~/.oat`, so nobody receives them from the
   repository. A teammate who wants them runs `oat tools install --scope user`,
   which installs all eight packs. Run inside a repository where the workflows
   pack is installed at project scope, it also edits that repository; see
   [surprises](#known-surprises-in-0314).
5. **Fetch synced projects explicitly.** A fresh clone does not receive
   `refs/oat/*`, so synced projects are not in it. See
   [Picking Up Projects](../workflows/projects/execution/picking-up-projects.md)
   to list and pull them. Ignored files (`.oat/config.local.json`,
   `.oat/state.md`, local projects) never travel.

## Backing out

### Stop without removing anything

Disabling a provider does not remove its views.
`oat providers set --scope project --disabled claude` only updates
`.oat/sync/config.json`. The existing `.claude/skills/` links stay, and a
following `oat sync` removes nothing. `oat status` then reports
`No managed entries found.` while the manifest still lists those links. To
remove views, use the commands below or delete them yourself.

The hook does nothing when no `oat` binary is on `PATH`, and
`oat init --scope project --no-hook` removes it.

### Supported removal commands

| Command                                                               | Removes                                                                                                                                                | Leaves behind                                                                                                                                                                                                                                   |
| --------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------ | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `oat tools remove --pack <pack> --scope project` (one pack at a time) | The pack's skills and agents in `.agents/`, their symlink views (Claude, Copilot, Cursor symlinks), and its `.oat/scripts/*.sh`                        | `.oat/templates/`, `.oat/ideas/`, `.oat/projects-root`, `.oat/config.json` (with a stale `tools.requiredBy` entry), `.oat/sync/`, both `.gitignore` blocks, `.gitattributes`, projects, empty folders, and all generated Cursor and Codex files |
| `oat tools remove --all`                                              | Nothing: exits 2 with `Pack core does not allow project scope`, with or without `--scope project`                                                      | Everything                                                                                                                                                                                                                                      |
| `oat tools remove --all --scope user`                                 | With only core installed at user scope: `~/.agents/skills/oat-docs`, `~/.agents/skills/oat-doctor`, `~/.oat/docs/` and their `~/.claude/skills/` links | `~/.oat/config.json` (now `{"version": 1}`), `~/.oat/sync/manifest.json`, an empty `~/.agents/skills/` and an empty `~/.claude/skills/`                                                                                                         |
| `oat remove skill <name> --scope project`                             | The canonical skill, its Claude view and its manifest entry                                                                                            | Nothing for that skill                                                                                                                                                                                                                          |
| `oat project prune <name>` (synced projects only)                     | The worktree, the pointer file, the local ref and the ref on `origin`; commits `chore(oat): prune synced project <name>` on the current branch         | An empty `.oat/projects/synced/`                                                                                                                                                                                                                |
| `oat init --scope project --no-hook`                                  | OAT's hook block. If the file holds only OAT's block, the whole `pre-commit` file is deleted.                                                          | Your own hook lines, byte for byte                                                                                                                                                                                                              |

No command deletes a shared or local project. `oat project prune` refuses a
shared project, and `oat project archive` moves a project to
`.oat/projects/archived/<name>` rather than deleting it.

### Remove everything

These steps were run in a repository that had adopted OAT with Claude as its
only provider, the hook, packs at project scope, core at user scope, and one
project of each scope. Afterwards the repository's files, its `.git/hooks`
folder, its local Git config and the home directory matched their pre-OAT
state exactly, and no `refs/oat/*` ref remained locally or on `origin`. The
run started with a `.gitignore` but no `.gitattributes`; adjust steps 5 and 6
if yours differ.

> [!WARNING]
> These steps delete files. Run `git status` first and commit or set aside
> anything you want to keep. `rm -r .agents` also deletes skills your team
> wrote, and `rm -r .oat` deletes every shared and local project. The home
> directory steps were verified only for a machine where `~/.oat` and
> `~/.agents` did not exist before OAT and `~/.claude/skills` was an empty
> folder OAT had created. If yours held anything of your own, remove only
> what OAT created. The same applies to a `.claude/` folder that existed in the
> repository before OAT.

1. Remove the hook: `oat init --scope project --no-hook`. In a terminal,
   `oat init` first shows the provider selection; keep the current choices.
2. Delete each synced project, including its ref on `origin`:
   `oat project prune <name>`. Without the command, run
   `git worktree remove .oat/projects/synced/<name>`,
   `git update-ref -d refs/oat/projects/<name>` and
   `git push origin --delete refs/oat/projects/<name>`, then
   `git rm .oat/projects/synced/<name>.json`.
3. Remove user-scope packs and their links in `~/.claude`:
   `oat tools remove --all --scope user`.
4. Remove each pack you installed at project scope, one command per pack:
   `oat tools remove --pack <pack> --scope project`, where `<pack>` is any of
   `ideas`, `docs`, `workflows`, `utility`, `research`, `brainstorm` and
   `project-management` that you installed. The PACK column of
   `oat tools list --scope project` shows them.
5. Untrack and delete OAT's repository files:

   ```sh
   git rm -r -q --cached .agents .claude .oat .gitattributes
   rm -r .agents .claude .oat .gitattributes
   ```

   Leave out any path that does not exist or that Git does not track;
   otherwise `git rm` stops without removing anything. If `.gitattributes`
   existed before
   OAT, leave it out too and delete only its `# OAT core` block.

6. In `.gitignore`, delete the `# OAT core` … `# END OAT core` block, the
   `# OAT local paths` … `# END OAT local paths` block if present, and the
   blank line OAT added before each.
7. Commit: `git add .gitignore && git commit -m "remove oat"`.
8. Clean the home directory. If `~/.oat` and `~/.agents` did not exist before
   OAT, run `rm -r ~/.oat ~/.agents`. Otherwise delete only `~/.oat` and the
   skills and agents OAT installed under `~/.agents`; other tools also read
   `~/.agents/skills` directly, so it may hold your own skills. Then run
   `rmdir ~/.claude/skills`, which fails safely if the folder still holds
   anything.

If you had enabled Cursor, Copilot or Codex, OAT also created the paths in the
[provider table](#syncing-provider-views). Removing those was not part of this
run.

Git history still contains the OAT commits: your commit that added OAT's files,
the project scaffold commits and the prune commit stay on your branch, and
anything you pushed stays on `origin`. Deleting `refs/oat/projects/<name>`
removes the ref, not the data: the project files it pointed to stay in
`origin`'s storage until the host garbage-collects them, so do not rely on
prune to erase sensitive content. Rewriting history is not covered here.

## Known surprises in 0.3.14

These are current behaviors as of version 0.3.14.

- `oat tools install core --scope project` prints `Installed core tool pack.`
  but writes nothing.
- `oat init --scope project --setup` installs all eight packs under your home
  directory, and runs `gh repo view`, which makes the `gh` CLI write
  `~/.local/state/gh/device-id`.
- `oat tools install --scope user` writes into the current repository when the
  workflows pack is already installed there at project scope: it adds
  `localPaths` to `.oat/config.json` and a `# OAT local paths` block to
  `.gitignore`.
- `oat tools install workflows --scope project` does not add that block, but
  `oat tools install --scope project` does, so `pr/` and `reviews/archived/`
  folders are committable in one setup and ignored in the other.
- `oat tools remove --all` fails unless you add `--scope user`.
- After removing packs, a stale `tools.requiredBy` entry stays in
  `.oat/config.json`, and `oat status` reports the utility pack as missing and
  suggests `oat tools update`.
- Removing a pack leaves its generated Cursor and Codex files, and a later
  `oat sync` reports no changes.
- An existing `.claude/` folder, in the repository or your home directory, is
  enough for `oat sync` to create Claude views without enabling Claude.
- After `oat tools install <pack> --no-sync`, running the same install again
  reports `unchanged` and creates no views; run `oat sync --scope project`.
- The `AGENTS.md` block from `--project-guidance` recommends
  `oat sync --scope all`, which also writes under your home directory.
- `oat project new --scope local` prints `Scaffold commit: skipped (--no-commit)`
  even when you did not pass that flag.
- Piping `oat tools list` or `oat status` into `head` crashes with an
  `Error: write EPIPE` stack trace.

## Not covered here

- **Interactive prompts.** Every run here was non-interactive. The hook,
  provider and local-path questions that `oat init` and `--setup` ask are
  described in [CLI Bootstrap](../getting-started/bootstrap.md).
- **Installing and upgrading the CLI.** See
  [Quickstart](../getting-started/quickstart.md) and
  [Upgrading from an earlier CLI](../getting-started/tool-packs.md#upgrading-from-an-earlier-cli).
- **Other platforms.** Only macOS was observed, where every view was a relative
  symlink or a generated file. For the copy strategy, see
  [Sync Config](../provider-sync/config.md#links-or-copies).
- **User scope for providers other than Claude.** See
  [Scope and Surface](../provider-sync/scope-and-surface.md).
- **Project management adoption** (`oat pjm init` and the `.oat/repo/` tree).
  See [Install vs. initialize](../getting-started/tool-packs.md#install-vs-initialize).
- **Instruction files and rules.** `CLAUDE.md` shims from
  `oat instructions sync`, and syncing rules from `.agents/rules`, including how
  to remove them. See [Instruction Sync](../provider-sync/instruction-sync.md).
- **Later project commands.** `oat project push`, `pull`, `archive`, `migrate`,
  archive storage, and what later lifecycle steps push to `origin`. See
  [Picking Up Projects](../workflows/projects/execution/picking-up-projects.md)
  and [Closeout Skills](../workflows/projects/closeout/closeout-skills.md).
- **Other maintenance commands.** `oat remove skills --pack`, `oat local`,
  `oat tools update`, `outdated` and `migrate`. See
  [Tool Packs](../getting-started/tool-packs.md) and
  [Config and Local State](config-and-local-state.md).
- **Files you place at a view path yourself.** See
  [Manifest and Drift](../provider-sync/manifest-and-drift.md).
- **`gh repo view` against a real GitHub remote**, and Git versions older than
  2.31.

## Related

- [Quickstart](../getting-started/quickstart.md)
- [CLI Bootstrap](../getting-started/bootstrap.md)
- [Tool Packs and Installed Assets](../getting-started/tool-packs.md)
- [Manifest and Drift](../provider-sync/manifest-and-drift.md)
- [Provider Interop CLI Scope and Surface](../provider-sync/scope-and-surface.md)
- [File Locations](file-locations.md)
- [Starting Projects](../workflows/projects/planning/starting-projects.md)
