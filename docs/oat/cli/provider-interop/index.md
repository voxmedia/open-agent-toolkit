# Provider Interop CLI Docs

This section describes provider interoperability behavior in `@oat/cli`.

It is a standalone adoption path and does not require workflow project artifacts.

Shared CLI conventions live in `docs/oat/cli/design-principles.md`.

## Contents

- `docs/oat/cli/provider-interop/overview.md`
  - Scope, principles, and command surface.
- `docs/oat/cli/provider-interop/commands.md`
  - Command-level behavior for provider interop (`status`, `sync`, `providers ...`).
- `docs/oat/cli/provider-interop/providers.md`
  - Provider-specific mapping behavior (Claude, Cursor, Copilot, Gemini, Codex).
- `docs/oat/cli/provider-interop/manifest-and-drift.md`
  - Manifest model, drift states, and stray adoption.
- `docs/oat/cli/provider-interop/config.md`
  - Sync config model (`.oat/sync/config.json`) and provider enablement semantics.
- `docs/oat/cli/provider-interop/hooks-and-safety.md`
  - Hook behavior and operational safety contracts.

## Related CLI docs (non-interop command families)

- `docs/oat/cli/bootstrap.md` (`oat init`)
- `docs/oat/cli/tool-packs-and-assets.md` (`oat init tools`, `oat remove`)
- `docs/oat/cli/diagnostics.md` (`oat doctor`)
