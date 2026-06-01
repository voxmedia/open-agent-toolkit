# @open-agent-toolkit/cli

Open Agent Toolkit command-line interface for provider sync, docs tooling, workflow utilities, and diagnostics.

The CLI also supports project-scoped instruction sync for nested `AGENTS.md` / `CLAUDE.md` files, including pointer, symlink, and hard-copy repair strategies plus Claude-only adoption.

## Install

```bash
npm install -g @open-agent-toolkit/cli
```

Run without a global install:

```bash
npx @open-agent-toolkit/cli --help
```

## Quick Start

```bash
oat init --scope project
oat status --scope all
oat sync --scope all
oat config describe
```

Additional useful entry points:

- `oat tools install`
- `oat instructions validate --strategy pointer`
- `oat instructions sync --dry-run --strategy symlink`
- `oat docs init --app-name my-docs`
- `oat pjm init` - initialize the project-management repo-reference surface after installing the pack
- `oat config dump --json`
- `oat project status --json`
- `oat project list --json`
- `oat project complete-state /path/to/project`
- `oat project archive sync`
- `oat doctor`

## Inspection Commands

Use these commands when you want structured runtime/project state out of the CLI:

- `oat config dump --json` - emit merged OAT config with per-key source attribution
- `oat project status --json` - emit the active project's full parsed control-plane state
- `oat project list --json` - emit summary state for tracked projects under the configured projects root
- `oat project complete-state <project-path>` - emit the canonical completed lifecycle shape into a tracked project's `state.md`

## Requirements

- Node.js `>=22.17.0`

## Docs

- [Docs Home](https://voxmedia.github.io/open-agent-toolkit/)
- [CLI Utilities](https://voxmedia.github.io/open-agent-toolkit/cli-utilities)
- [Provider Sync](https://voxmedia.github.io/open-agent-toolkit/provider-sync)
- [Instruction Sync](https://voxmedia.github.io/open-agent-toolkit/provider-sync/instruction-sync)
- [Reference](https://voxmedia.github.io/open-agent-toolkit/reference)
