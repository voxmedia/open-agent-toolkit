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
- `oat project archive /path/to/project`
- `oat repo archive sync`
- `oat doctor`

## Update Notifications

On ordinary interactive command runs, OAT may print a passive notice when npm's stable `latest` CLI version is newer than the installed version. The cache normally limits checks to once every 24 hours and same-version notices to once every 72 hours; overlapping CLI processes can each perform a check or print a notice.

`oat init`, `oat tools install`, and `oat tools update` are different because they copy tools bundled with the running CLI. Before an eligible interactive mutation, a known newer CLI triggers a warning that the current CLI can only install its own bundled tool versions and that the available CLI may bundle newer versions. OAT then offers, defaulting to no, to run `npm install --global @open-agent-toolkit/cli@<validated-version>` for the exact validated stable version. Acceptance updates the CLI package, stops before changing tools, and asks you to rerun the original command. Declining or aborting continues with the current bundle after a warning. An installer failure stops the tool mutation and reports the command you can retry.

This warning does not mean tools installed from the current bundle are incompatible with the current CLI; it only identifies that a newer CLI release may include newer bundled tool versions. Dry-run, JSON, non-interactive, CI, test, source-development, and ephemeral package-runner invocations do not prompt or install. Ordinary eligible commands remain passive.

Set `NO_UPDATE_NOTIFIER` to a truthy value (for example, `1`, `true`, `yes`, or `on`) to suppress checks for one process; empty, `0`, and `false` do not suppress them. Or persist the user-level preference:

```bash
oat config set updateNotifications false --user
```

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
