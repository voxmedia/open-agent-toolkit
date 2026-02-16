# Provider Interop CLI Overview

The provider interop CLI in `packages/cli` manages canonical agent assets under `.agents/` and reconciles provider-specific views.

This capability is intentionally independent from OAT workflow artifacts. Teams can adopt interop-only usage (`init/status/sync/providers/doctor`) without using discovery/spec/design/plan/implement project workflows.

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

## Non-interop namespaces in the same CLI

- `oat project new <name>` (workflow/project scaffolding)
- `oat internal validate-oat-skills` (internal maintenance)

## Reference artifacts

- `.oat/projects/<scope>/<project>/spec.md`
- `.oat/projects/<scope>/<project>/design.md`
- `.oat/projects/<scope>/<project>/plan.md`
- `.oat/projects/<scope>/<project>/implementation.md`
