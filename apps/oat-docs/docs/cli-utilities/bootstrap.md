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
   - on a fresh install every pack defaults to **user** scope, so capabilities follow you across repositories; an existing install keeps its current placement
   - after placement is chosen, repository `AGENTS.md` guidance is a separate opt-in. Accepting creates the managed `OAT tools` section only when the root file is absent. An existing file or symlink is never replaced: OAT prints a repository-relative, copy-pasteable managed-block patch instead. Declining leaves `AGENTS.md` unchanged
   - installing `project-management` installs the capability only. Adopting it for this repository is a third, separate choice made with `oat pjm init` — see [Install vs. initialize](tool-packs.md#install-vs-initialize)
2. **Local paths** — multi-select from default gitignored artifact paths (analysis, PR, reviews, ideas). Pre-existing paths are pre-checked; only new paths are added.
3. **Documentation** — detect or enter docs metadata for the repo when documentation exists.
4. **Provider sync** — sync provider project views via `oat sync --scope project`.
5. **Summary** — reports what was configured: active providers, tool packs status, local paths added/existing, and provider sync status. Includes suggested next steps.

Hook install note:

- The optional OAT pre-commit hook installs into Git's active hook directory.
- If a repo uses a managed hook folder such as `.githooks/`, that path must already be configured in Git, or OAT must configure it during the prompt flow before hook install.

**Non-interactive mode:** Fresh-init guided setup offers are interactive-only. If `--setup` is passed in non-interactive mode (`--json`, piped input, non-TTY, or `OAT_NON_INTERACTIVE=1`), guided setup does not prompt: tool packs use additive defaults, local-path and documentation prompts are skipped unless already configured, and provider sync is skipped unless separately requested. Repository guidance also defaults to no write; pass `--project-guidance` to opt in explicitly or `--no-project-guidance` to record an explicit decline.

```bash
# Explicit guided setup on an existing repo
oat init --setup --scope project

# Install capabilities and create or propose repository guidance
oat init --setup --project-guidance

# Fresh init — guided setup is offered automatically
oat init --scope project
```

Related commands:

- `oat tools ...` (tool-pack install, update, remove, migrate, list, info): `tool-packs.md`
- `oat pjm init` (adopt project management for this repository): `tool-packs.md#install-vs-initialize`
- `oat local ...`, `oat doctor`, and other utility commands: `config-and-local-state.md`
- `oat status` / `oat sync` (provider sync): `../provider-sync/index.md`
