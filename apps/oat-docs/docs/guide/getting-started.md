---
title: CLI Bootstrap
description: 'Foundational setup via oat init for canonical directories, provider adoption, and configuration.'
---

# CLI Bootstrap

This page covers foundational CLI setup commands that prepare OAT structures and configuration before provider sync or tool-pack workflows.

## `oat init`

Purpose:

- Bootstrap canonical OAT directories for a scope
- Detect and optionally adopt provider strays
- Initialize sync configuration/manifest state
- Optionally install drift warning hooks
- Run guided setup to configure tool packs, local paths, and provider sync in one session

Key behavior:

- Idempotent initialization
- Interactive adoption in TTY mode
- JSON/non-TTY contract support
- Establishes the base structure used by `oat status`, `oat sync`, `oat init tools`, and `oat doctor`
- For project scope, creates canonical `.agents/skills/`, `.agents/agents/`, and `.agents/rules/` directories

### Guided setup

After core initialization completes, `oat init` can enter an interactive guided setup flow that walks through common post-init configuration in a single session.

**Entry paths:**

- **`--setup` flag** — `oat init --setup` enters guided setup directly on any repo (new or existing).
- **Fresh init** — when `.oat/` did not exist before init, the user is automatically prompted to enter guided setup. No flag needed.

**Steps (each independently skippable):**

1. **Tool packs** — install OAT tool packs (skills for workflows, ideas, utilities) at project scope.
2. **Local paths** — multi-select from default gitignored artifact paths (analysis, PR, reviews, ideas). Pre-existing paths are pre-checked; only new paths are added.
3. **Provider sync** — sync provider project views via `oat sync --scope project`.
4. **Summary** — reports what was configured: active providers, tool packs status, local paths added/existing, and provider sync status. Includes suggested next steps.

**Non-interactive mode:** Guided setup is never triggered in non-interactive mode (`--json`, piped input, or non-TTY), even if `--setup` is passed.

```bash
# Explicit guided setup on an existing repo
oat init --setup --scope project

# Fresh init — guided setup is offered automatically
oat init --scope project
```

Related commands:

- `oat tools ...` (tool-pack install, update, remove, list, info): `tool-packs.md`
- `oat local ...`, `oat doctor`, and other utility commands: `cli-reference.md`
- `oat status` / `oat sync` (provider sync): `provider-sync/index.md`
