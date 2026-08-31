---
id: DR-260620-make-oat-tools-install
title: Make `oat tools install` additive; removals are interactive-only behind
  batch confirmation
date: 2026-06-20
status: accepted
legacy_id: ADR-021
---

### ADR-021: Make `oat tools install` additive; removals are interactive-only behind batch confirmation

- **Date:** 2026-06-20
- **Status:** accepted
- **Drivers:** Installing a pack at one scope was silently destroying its install at another scope (the `--scope project` override and the interactive binary user-scope prompt both moved a pack, removing it from the non-selected scope). Users expect installing somewhere to be additive, not to wipe an existing install elsewhere.
- **Related:**
  - `.oat/projects/shared/tools-install-additive-scope/` (discovery.md, design.md, plan.md, implementation.md)
  - `apps/oat-docs/docs/cli-utilities/tool-packs.md`
  - Supersedes the move/normalize UX described in `.oat/repo/reference/project-summaries/20260414-tool-install-ux.md`

#### Context

Scope was modeled as mutually exclusive (`project` XOR `user`, with `both` as a third state), and `runInitTools` reconciled the chosen scope by calling `removePackFromScope` on the non-selected scope. Choosing `project` for a pack already at `user` removed the user-level copy (and vice versa). The interactive flow reinforced this with a binary "which packs at user scope (unselected → project)" prompt.

#### Options Considered

1. **Confirmation prompt on the existing move semantics** — keep moves, prompt before stripping another scope. Rejected: still exclusive-by-default, confirmation fatigue, wrong mental model.
2. **Additive scope management with an interactive reconcile manager** — installs only ever add; removal is an explicit, confirmed action.

#### Decision

Installing is additive across every path. `resolvePackScopes` produces a per-pack desired end-state defaulting to current placement; the interactive flow offers a per-pack selector (`project / user / both`). A reconciliation step diffs current vs desired into adds/removes. Removals run only in interactive mode, surfaced as one change summary gated on a single batch confirmation (decline = no changes). Non-interactive paths (including `--scope project|user` and the default set) are strictly additive and guarded so a removal can never run non-interactively. `affectedScopes` records only changed scopes, so auto-sync never prunes a preserved scope. No `--move`/`--exclusive` flag for now; a dedicated `oat tools uninstall` is the future home for non-interactive removal.

#### Consequences

- Positive: installing a pack never destroys an existing install at another scope; removal is deliberate and visible; the no-prune guarantee is enforced via diff-scoped auto-sync.
- Negative / trade-offs: removal is no longer possible non-interactively until a future `oat tools uninstall` lands; installs idempotently copy the full desired end-state rather than adds-only (preserves the idempotent-refresh contract).

#### Follow-ups

- Consider `oat tools uninstall` for non-interactive scope removal if a real need appears.
- Minor (deferred from final review): when an outdated skill is refreshed in a preserved (non-added) scope, add that scope to `affectedScopes` so it is auto-synced.

---
