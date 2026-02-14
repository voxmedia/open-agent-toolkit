# Hooks and Safety

## Optional pre-commit hook

`oat init` can install a pre-commit check that warns on project drift.

## Safety contracts

- `sync` defaults to dry-run
- Destructive removals are limited to manifest-tracked entries
- Non-interactive mode avoids interactive prompts and respects machine-readable output contracts
