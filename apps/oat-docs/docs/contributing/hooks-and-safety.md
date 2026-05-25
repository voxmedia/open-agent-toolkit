---
title: Hooks and Safety
description: 'Pre-commit hooks and safety contracts for provider sync mutations.'
---

# Hooks and Safety

## Optional pre-commit drift warning hook

`oat init` can install a pre-commit hook that checks project provider sync state on every commit by invoking `oat status --scope project --hook`.

The hook distinguishes two states so unmanaged files are not reported the same as true drift:

- **Warning (managed drift or missing):** a manifest-tracked provider entry has drifted or is missing. Emits `oat: managed provider views are out of sync - run 'oat sync --scope project'` to stderr.
- **Info (unmanaged strays only):** provider files exist inside a managed directory but are not in the manifest. Emits `oat: unmanaged provider files detected - run 'oat status --scope project' to review` to stderr. Not treated as drift.

Gitignored provider files are intentionally skipped by status and hook checks, including entries ignored through `.gitignore`, `.git/info/exclude`, or standard Git exclude configuration.

The hook is non-blocking: it never fails the commit, even when managed drift is detected.

OAT installs the hook into Git's currently active hook directory. When a consumer repo keeps hooks in a repo-managed folder such as `.githooks/`, Git must be configured to use that path before install, or OAT must configure it during the hook prompt flow.

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
