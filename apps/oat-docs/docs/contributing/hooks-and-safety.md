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

## OAT repo developer hooks

The `open-agent-toolkit` repository also ships its own managed hook scripts under
`tools/git-hooks/`. These are contributor hooks for this repo, separate from the
consumer hook snippet that `oat init` installs into other repositories.

The repo hooks source `tools/git-hooks/repo-toolchain.sh` before running pnpm
commands. The helper changes to the repo root, loads `.nvmrc` through nvm when
available, and then prefers Corepack pnpm. This keeps `commit-msg`,
`pre-commit`, `pre-push`, and `post-checkout` on the same Node/pnpm toolchain
even when a developer shell has multiple versions installed.

The repo's `pre-commit` OAT status check uses the repo-local source CLI when the
OAT source tree is present:

```bash
corepack pnpm run --silent cli:source -- status --scope project --hook
```

That avoids false sync drift from a stale globally installed `oat` while still
leaving the consumer-repo hook contract unchanged: generated hooks in other
repos continue to call `oat status --scope project --hook`.

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
