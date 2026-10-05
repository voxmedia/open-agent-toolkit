---
title: CLI Bootstrap
description: 'Foundational setup via oat init for canonical directories, provider adoption, and configuration.'
---

# CLI Bootstrap

This page covers foundational CLI setup commands that prepare OAT structures and configuration before provider sync or tool-pack workflows.

## Quick Look

- What it does: explains the initial `oat init` setup flow and the optional guided setup path that configures packs, local paths, documentation metadata, and provider sync.
- When to use it: when you are first introducing OAT into a repo or need to re-run the guided setup path on an existing checkout.
- Primary commands: `oat init`, `oat init --setup`, `oat init --scope project`

## `oat init`

Purpose:

- Bootstrap canonical OAT directories for a scope
- Detect and optionally adopt provider strays
- Initialize sync configuration/manifest state
- Optionally install drift warning hooks
- Run guided setup to configure tool packs, local paths, documentation metadata, and provider sync in one session

Key behavior:

- Idempotent initialization
- Interactive adoption in TTY mode
- JSON/non-TTY contract support
- Establishes the base structure used by `oat status`, `oat sync`, `oat init tools`, and `oat doctor`
- Pack intent recorded during guided setup is scoped: a project-scope install writes `tools.<pack>: true` to `.oat/config.json`, a user-scope install writes it to `~/.oat/config.json`, and neither writes the other
- For project scope, creates canonical `.agents/skills/`, `.agents/agents/`, and `.agents/rules/` directories

### Guided setup

After core initialization completes, `oat init` can enter an interactive guided setup flow that walks through common post-init configuration in a single session.

**Entry paths:**

- **`--setup` flag** — `oat init --setup` enters guided setup directly on any repo (new or existing).
- **Fresh init** — when `.oat/` did not exist before init, the user is automatically prompted to enter guided setup. No flag needed.

**Steps (each independently skippable):**

1. **Tool packs** — install OAT tool packs. The core pack (diagnostics, passive docs access) is checked by default and always installs at user scope. Guided setup asks whether to customize per-pack scope:
   - choose **Yes** to run the per-pack scope selector for every pack that allows both scopes (`ideas`, `docs`, `workflows`, `utility`, `project-management`, `research`, `brainstorm`)
   - choose **No** to apply additive per-pack defaults without extra scope prompts
   - on a fresh install every pack defaults to **user** scope, so capabilities follow you across repositories; an existing install keeps its current placement. See [Where tool packs install](#where-tool-packs-install) below
   - after placement is chosen, repository `AGENTS.md` guidance is a separate opt-in. Accepting creates the root file with the managed `OAT tools` section when it is absent, and appends that section to an existing file or contained symlink target that lacks it, with one append-only write. An existing file is never replaced: when the section exists but differs, OAT prints a repository-relative, copy-pasteable managed-block patch instead. Declining leaves `AGENTS.md` unchanged
   - installing `project-management` installs the capability only. Adopting it for this repository is a third, separate choice made with `oat pjm init` — see [Install vs. initialize](tool-packs.md#install-vs-initialize)
2. **Local paths** — multi-select from default gitignored artifact paths (analysis, PR, reviews, ideas). Pre-existing paths are pre-checked; only new paths are added.
3. **Documentation** — detect or enter docs metadata for the repo when documentation exists. For existing plain documentation, choose **Plain Markdown** in the manual tooling menu and enter its docs root. Guided setup saves `documentation.tooling: "markdown"` and the normalized `documentation.root` while preserving the other documentation/config settings. Fumadocs remains the manual menu default; MkDocs, Docusaurus, VitePress and Nextra remain available. This choice does not add automatic Markdown detection or scaffold a framework.
4. **Provider sync** — sync provider project views via `oat sync --scope project`.
5. **Summary** — reports what was configured: active providers, tool packs status, local paths added/existing, and provider sync status. Includes suggested next steps.

Hook install note:

- The optional OAT pre-commit hook installs into Git's active hook directory.
- If a repo uses a managed hook folder such as `.githooks/`, that path must already be configured in Git, or OAT must configure it during the prompt flow before hook install.

What the hook does: before each commit it runs
`oat status --scope project --hook`, which checks whether the provider views in
this repository match their canonical sources. If views are out of date or
missing, it prints `oat: managed provider views are out of sync - run 'oat sync --scope project'`.
If it finds provider files that OAT does not manage, it prints a note to run
`oat status --scope project`. The hook only warns: it never blocks a commit,
because the hook line ends in `|| true`, and it does nothing when `oat` is not
on your `PATH`. OAT adds its lines between `# >>> oat pre-commit hook >>>` and
`# <<< oat pre-commit hook <<<` markers, appending them to an existing
`pre-commit` file rather than replacing it. In Git's default hook directory
(`.git/hooks/`) the hook belongs to your clone only and is not committed.

To remove the hook, run `oat init --scope project --no-hook` in the
repository. (Without `--scope project`, `oat init` uses scope `all` and also
writes under your home directory.) Although its
help text reads "Skip optional pre-commit hook install", the flag also removes
an OAT hook that is already installed. It deletes only the marked OAT block
and keeps any other hook content; if the file contained nothing but the OAT
block, the file is deleted (or emptied, when it is a symlink). You can also
delete the lines between the two markers by hand. To install the hook later
without prompts, run `oat init --scope project --hook`.

**Non-interactive mode:** Fresh-init guided setup offers are interactive-only. If `--setup` is passed in non-interactive mode (`--json`, piped input, non-TTY, or `OAT_NON_INTERACTIVE=1`), guided setup does not prompt: tool packs use additive defaults, local-path and documentation prompts are skipped unless already configured, and provider sync is skipped unless separately requested. Repository guidance also defaults to no write; pass `--project-guidance` to opt in explicitly or `--no-project-guidance` to record an explicit decline.

```bash
# Explicit guided setup on an existing repo
oat init --setup --scope project

# Install capabilities and create, append, or propose repository guidance
oat init --setup --project-guidance

# Write guidance for the packs already installed, without guided setup
oat init --project-guidance

# Fresh init — guided setup is offered automatically
oat init --scope project
```

### Where tool packs install

Guided setup uses the same per-pack defaults as `oat tools install`, with one
difference described at the end of this section. The `--scope` option of `oat tools install` and `oat tools remove` lists `all` as
its default in `--help`. For `oat tools install`, that default does not mean
both scopes:

- With no `--scope`, a pack that is not installed yet is installed under your
  home directory (user scope: `~/.agents/` and `~/.oat/`). A pack that is
  already installed keeps the scope it has.
- With `--scope project`, the pack is installed in this repository
  (`.agents/` and `.oat/`). With `--scope user`, it is installed under your
  home directory.

The `core` pack can only live under your home directory:

- `oat tools install --scope project`, with no pack name, installs the other
  seven packs in this repository and still installs `core` under your home
  directory.
- `oat tools install core --scope project` exits successfully and prints
  `Installed core tool pack.`, but it writes nothing, neither in the
  repository nor in your home directory.
- `oat tools remove --all --scope project` fails with
  `Pack core does not allow project scope`, and so does
  `oat tools remove --all` with no `--scope`.

The difference: guided setup does not take its pack scope from `--scope`.
`oat init --scope project --setup`, run without an interactive terminal,
installed all eight packs under the home directory. In an interactive
terminal, answer **Yes** to the per-pack scope question to choose project
scope, or install packs afterwards with `oat tools install <pack> --scope project`. See [Where packs install](tool-packs.md#where-packs-install) for
the full rules and how to remove packs.

Related commands:

- `oat tools ...` (tool-pack install, update, remove, migrate, list, info): [Tool Packs and Installed Assets](tool-packs.md)
- `oat pjm init` (adopt project management for this repository): [Install vs. initialize](tool-packs.md#install-vs-initialize)
- `oat local ...`, `oat doctor`, and other utility commands: [Config and Local State](../reference/config-and-local-state.md)
- `oat status` / `oat sync` (provider sync): [Provider Sync](../provider-sync/index.md)
