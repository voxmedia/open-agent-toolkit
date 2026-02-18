# CLI Docs

This section documents the OAT CLI.

The CLI is a standalone value path: you can use it without adopting OAT workflow artifacts or lifecycle skills.

## Contents

- `docs/oat/cli/design-principles.md`
  - Cross-cutting CLI design and implementation conventions.
- `docs/oat/cli/provider-interop/index.md`
  - Provider-interop command surface and behavior.

## Additional command groups

- `oat cleanup project`
  - Project-state hygiene cleanup (pointer/state/lifecycle drift), dry-run by default.
- `oat cleanup artifacts`
  - Review/reference artifact hygiene cleanup with duplicate pruning and stale triage.
- `oat project new <name>`
  - Mode-aware project scaffolding (`--mode full|quick|import`).
- `oat internal validate-oat-skills`
  - Internal validator for `oat-*` skill contracts (primary invocation: `pnpm oat:validate-skills`).
