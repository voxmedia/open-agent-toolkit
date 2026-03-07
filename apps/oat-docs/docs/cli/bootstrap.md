# CLI Bootstrap

This page covers foundational CLI setup commands that prepare OAT structures and configuration before provider sync or tool-pack workflows.

## `oat init`

Purpose:

- Bootstrap canonical OAT directories for a scope
- Detect and optionally adopt provider strays
- Initialize sync configuration/manifest state
- Optionally install drift warning hooks

Key behavior:

- Idempotent initialization
- Interactive adoption in TTY mode
- JSON/non-TTY contract support
- Establishes the base structure used by `oat status`, `oat sync`, `oat init tools`, and `oat doctor`

Related commands:

- `oat tools ...` (tool-pack install, update, remove, list, info): `tool-packs-and-assets.md`
- `oat status` / `oat sync` (provider interop): `provider-interop/index.md`
- `oat doctor` (diagnostics): `diagnostics.md`
