---
id: DR-260216-use-explicit-provider-config
title: Use explicit provider config with config-aware sync remediation for
  worktree-safe interop
date: 2026-02-16
status: accepted
legacy_id: ADR-008
---

### ADR-008: Use explicit provider config with config-aware sync remediation for worktree-safe interop

- **Date:** 2026-02-16
- **Status:** accepted
- **Drivers:** Directory-detection-only provider activation caused inconsistent sync behavior across fresh worktrees and made provider intent implicit/fragile.
- **Related:**
  - `packages/cli/src/commands/init/index.ts`
  - `packages/cli/src/commands/sync/index.ts`
  - `packages/cli/src/commands/providers/set/index.ts`
  - `docs/oat/cli/provider-interop/config.md`

#### Context

When provider directories did not yet exist in a new worktree, sync behavior depended on ambient filesystem state rather than explicit user intent. This made setup brittle and caused avoidable mismatch warnings and manual remediation churn.

#### Options Considered

1. Keep provider activation purely detection-based
2. Add explicit provider config (`.oat/sync/config.json`) and teach init/sync to reconcile mismatches
3. Force users to manually edit config files and re-run sync

#### Decision

Adopt option 2:

- Persist project provider intent in `.oat/sync/config.json` (`providers.<name>.enabled`).
- Prompt for supported providers during `oat init --scope project` (interactive path).
- Add `oat providers set --scope project` for explicit enable/disable management.
- Make `oat sync --scope project` config-aware and provide deterministic mismatch remediation:
  - interactive selection in TTY mode
  - warning + exact remediation command in non-interactive mode.
- Standardize worktree bootstrap on `pnpm run worktree:init`.

#### Consequences

- Positive:
  - Provider activation is explicit and reproducible across worktrees.
  - Fresh worktrees can bootstrap sync cleanly even when provider roots are absent.
  - Less ambiguity between detected vs intended providers.
- Negative / trade-offs:
  - Additional configuration surface to maintain/document.
  - Requires clear guidance for interactive vs non-interactive remediation behavior.

#### Follow-ups

- Add lifecycle-completeness command(s) for uninstall/remove flows.
- Expand provider capability matrix and troubleshooting docs.

---
