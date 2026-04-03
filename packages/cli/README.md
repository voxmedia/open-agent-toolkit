# @open-agent-toolkit/cli

Open Agent Toolkit command-line interface for provider sync, docs tooling, workflow utilities, and diagnostics.

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
- `oat docs init --app-name my-docs`
- `oat project archive sync`
- `oat doctor`

## Requirements

- Node.js `>=22.17.0`

## Docs

- [Docs Home](https://voxmedia.github.io/open-agent-toolkit/)
- [CLI Utilities](https://voxmedia.github.io/open-agent-toolkit/cli-utilities)
- [Provider Sync](https://voxmedia.github.io/open-agent-toolkit/provider-sync)
- [Reference](https://voxmedia.github.io/open-agent-toolkit/reference)
