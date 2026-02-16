# Provider Interop CLI Docs

This section describes provider interoperability behavior in `@oat/cli`.

It is a standalone adoption path and does not require workflow project artifacts.

Shared CLI conventions live in `docs/oat/cli/design-principles.md`.

## Contents

- `docs/oat/cli/provider-interop/overview.md`
  - Scope, principles, and command surface.
- `docs/oat/cli/provider-interop/commands.md`
  - Command-level behavior (`init`, `status`, `sync`, `providers`, `doctor`).
- `docs/oat/cli/provider-interop/providers.md`
  - Provider-specific mapping behavior (Claude, Cursor, Codex).
- `docs/oat/cli/provider-interop/manifest-and-drift.md`
  - Manifest model, drift states, and stray adoption.
- `docs/oat/cli/provider-interop/hooks-and-safety.md`
  - Hook behavior and operational safety contracts.
