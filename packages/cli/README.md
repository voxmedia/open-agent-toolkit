# @open-agent-toolkit/cli

Open Agent Toolkit command-line interface for provider sync, workflow tooling, docs scaffolding, and project hygiene.

## Install

```bash
npm install -g @open-agent-toolkit/cli
```

You can also run it without a global install:

```bash
npx @open-agent-toolkit/cli --help
```

## Usage

```bash
oat init --scope project
oat status --scope all
oat sync --scope all
oat config describe
oat config describe archive.s3Uri
oat project archive sync
oat project archive sync my-project
oat docs init --app-name my-docs
```

Archive lifecycle settings are managed through shared repo config:

- `archive.s3Uri`
- `archive.s3SyncOnComplete`
- `archive.summaryExportPath`

Use `oat config describe` to inspect which file owns a setting and which command surface mutates it. Completion writes dated archive snapshots to S3 and exports dated summary snapshots when those archive settings are configured.

## Related Packages

- `@open-agent-toolkit/docs-config`
- `@open-agent-toolkit/docs-theme`
- `@open-agent-toolkit/docs-transforms`

## Requirements

- Node.js `>=22.17.0`

## Docs

Repository and docs: <https://github.com/voxmedia/open-agent-toolkit>
