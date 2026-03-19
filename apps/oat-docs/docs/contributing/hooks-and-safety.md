---
title: Hooks and Safety
description: 'Pre-commit hooks and safety contracts for provider sync mutations.'
---

# Hooks and Safety

## Optional pre-commit drift warning hook

`oat init` can install a pre-commit hook that warns when project provider views appear out of sync.

OAT installs that hook into Git's currently active hook directory. When a consumer repo keeps hooks in a repo-managed folder such as `.githooks/`, Git must be configured to use that path before install, or OAT must configure it during the hook prompt flow.

## Safety contracts

- `sync` mutates by default; use `--dry-run` to preview.
- All mutation commands write immediately unless `--dry-run` is passed.
- Removals are limited to manifest-managed entries.
- JSON/non-interactive paths avoid interactive prompts.
- Hook warnings are non-blocking by default.

## User consent expectations

- Adoption and migration operations should ask before mutation in interactive mode.
- Lifecycle completion/archival transitions should require explicit user confirmation.

## Reference artifacts

- `.oat/projects/<scope>/<project>/implementation.md` (hook + safety hardening)
- `packages/cli/src/engine/hook.ts`
- `packages/cli/src/commands/init/index.ts`
