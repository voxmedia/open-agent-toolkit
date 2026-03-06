# Docs App Commands

OAT includes a dedicated docs command family for bootstrapping and maintaining
MkDocs-based documentation apps.

## Command surface

| Command             | Purpose                                                                              |
| ------------------- | ------------------------------------------------------------------------------------ |
| `oat docs init`     | Scaffold a new MkDocs Material docs app with OAT defaults.                           |
| `oat docs nav sync` | Regenerate `mkdocs.yml` navigation from directory `index.md` `## Contents` sections. |
| `oat docs analyze`  | CLI entrypoint that points users to the `oat-docs-analyze` skill.                    |
| `oat docs apply`    | CLI entrypoint that points users to the `oat-docs-apply` skill.                      |

## `oat docs init`

Use `oat docs init` to scaffold a docs app that follows the OAT docs contract.

Key behavior:

- detects monorepo vs single-package repo shape
- defaults to `apps/<app-name>` for monorepos
- defaults to `<app-name>/` at repo root for single-package repos
- scaffolds MkDocs Material plus the OAT contributor contract
- includes `docs/index.md`, `docs/contributing.md`, and the local tooling needed to run the app

Supported flags:

- `--app-name <name>`
- `--target-dir <path>`
- `--lint <markdownlint|none>`
- `--format <prettier|none>`
- `--yes`

Example:

```bash
oat docs init --app-name my-docs --target-dir apps/my-docs --yes
```

## `oat docs nav sync`

Use nav sync after adding, removing, or renaming docs pages.

The command reads only the reserved `## Contents` section from each directory
`index.md` and regenerates the `nav:` block in `mkdocs.yml`.

Example:

```bash
oat docs nav sync --target-dir apps/oat-docs
```

Related reference:

- [`../reference/docs-index-contract.md`](../reference/docs-index-contract.md)

## `oat docs analyze` and `oat docs apply`

These CLI commands intentionally reserve the docs workflow surface without
duplicating the skill logic in Commander handlers.

- `oat docs analyze` routes users to the `oat-docs-analyze` workflow
- `oat docs apply` routes users to the `oat-docs-apply` workflow

Use the CLI entrypoints when you want discoverable command help. Use the skills
when you want the actual docs analysis/apply execution flow.

Related docs:

- [`../skills/docs-workflows.md`](../skills/docs-workflows.md)
