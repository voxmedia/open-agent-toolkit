# Add Docs to a New Repo

Use this path when you want to add an OAT-managed docs app and the docs
analyze/apply workflow to a repository.

If you are developing inside the OAT repo itself, replace `oat ...` with
`pnpm run cli -- ...`.

## What this gives you

- an MkDocs Material docs app scaffolded with OAT defaults
- `index.md`-driven navigation
- docs analysis and apply skills installed via the utility pack
- a repeatable workflow for finding gaps, verifying claims, and applying docs changes

## 1. Initialize OAT in the repo

```bash
oat init --scope project
```

This sets up the base OAT structure used by the CLI and installed tool packs.

## 2. Install the docs workflow skills

Fastest direct path:

```bash
oat init tools utility
```

Interactive path:

```bash
oat init tools
```

The utility pack installs `oat-docs-analyze` and `oat-docs-apply`.

## 3. Scaffold the docs app

```bash
oat docs init --app-name my-docs
```

Default placement:

- monorepo: `apps/my-docs`
- single-package repo: `my-docs/` at repo root

You can override the target explicitly:

```bash
oat docs init --app-name my-docs --target-dir apps/my-docs --yes
```

## 4. Start authoring docs with the OAT contract

Core rules:

- every docs directory should have an `index.md`
- every `index.md` should include a `## Contents` section
- the `## Contents` section should map sibling pages and immediate child directories

After adding or moving pages, regenerate navigation:

```bash
oat docs nav sync --target-dir apps/my-docs
```

## 5. Analyze the docs surface

Use the skill, not the CLI stub, for the real analysis workflow.

If your host supports slash-skill invocation:

```text
/oat-docs-analyze
```

Otherwise invoke the skill by name in your agent host.

What `oat-docs-analyze` checks:

- index contract coverage
- nav drift
- stale or contradicted repo-checkable claims
- missing or thin content coverage based on repo features
- contributor/setup guidance gaps

## 6. Review the artifact and apply approved changes

Run the apply skill after analysis:

```text
/oat-docs-apply
```

`oat-docs-apply` consumes the analysis artifact, asks for approval, and applies
only the approved, evidence-backed recommendations.

Important:

- `oat docs analyze` and `oat docs apply` are CLI guidance entrypoints
- the actual analysis/apply workflow runs through the skills

## Typical loop

1. `oat init --scope project`
2. `oat init tools utility`
3. `oat docs init --app-name my-docs`
4. Author docs with `index.md` + `## Contents`
5. `oat docs nav sync --target-dir apps/my-docs`
6. `/oat-docs-analyze`
7. `/oat-docs-apply`
8. Repeat as the codebase changes

## Related docs

- [`docs-apps.md`](docs-apps.md)
- [`../skills/docs-workflows.md`](../skills/docs-workflows.md)
- [`../reference/docs-index-contract.md`](../reference/docs-index-contract.md)
