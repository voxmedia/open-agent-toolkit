# Hooks and Safety

## Optional pre-commit drift warning hook

`oat init` can install a pre-commit hook that warns when project provider views appear out of sync.

## Safety contracts

- `sync` defaults to dry-run.
- `--apply` required for filesystem mutation.
- Removals are limited to manifest-managed entries.
- JSON/non-interactive paths avoid interactive prompts.
- Hook warnings are non-blocking by default.

## User consent expectations

- Adoption and migration operations should ask before mutation in interactive mode.
- Lifecycle completion/archival transitions should require explicit user confirmation.

## Reference artifacts

- `.oat/projects/shared/provider-interop-cli/implementation.md` (hook + safety hardening)
- `packages/cli/src/engine/hook.ts`
- `packages/cli/src/commands/init/index.ts`
