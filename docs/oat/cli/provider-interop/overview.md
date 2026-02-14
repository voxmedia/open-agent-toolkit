# Provider Interop CLI Overview

The provider interop CLI in `packages/cli` manages canonical agent assets under `.agents/` and reconciles provider-specific views.

## Scope

- Canonical directories: `.agents/skills`, `.agents/agents`
- Managed provider views: `.claude/*`, `.cursor/*`, `.codex/*` (where applicable)
- Manifest tracking: `.oat/sync/manifest.json` (project) and `~/.oat/sync/manifest.json` (user)

## Design principles

- Dry-run first
- Explicit apply for mutation
- Scoped destructive actions only for manifest-tracked entries
- Cross-provider compatibility via adapters

## Implemented command surface

- `oat init`
- `oat status`
- `oat sync`
- `oat providers list`
- `oat providers inspect`
- `oat doctor`

## Reference artifacts

- `.oat/projects/shared/provider-interop-cli/spec.md`
- `.oat/projects/shared/provider-interop-cli/design.md`
- `.oat/projects/shared/provider-interop-cli/plan.md`
- `.oat/projects/shared/provider-interop-cli/implementation.md`
