---
id: DR-260502-generalize-pack-default-scope
title: Generalize pack default-scope via `PACK_METADATA` rather than hardcoding
  `brainstorm`-specific paths
date: 2026-05-02
status: accepted
legacy_id: ADR-017
---

### ADR-017: Generalize pack default-scope via `PACK_METADATA` rather than hardcoding `brainstorm`-specific paths

- **Date:** 2026-05-02
- **Status:** accepted
- **Drivers:** The `independent-brainstorming` design (bl-53f0) required the new `brainstorm` pack to default to **user scope** so the always-on trigger fires across directories. The existing installer defaulted user-eligible packs to project scope in non-interactive setups, which would have silently broken the universal-availability rationale. The design-review process surfaced this as Important finding `I1` and asked us to choose between special-casing `brainstorm` in installer paths or introducing pack metadata.
- **Related:**
  - `.oat/projects/shared/independent-brainstorming/`
  - `packages/cli/src/commands/init/tools/shared/skill-manifest.ts` (`PackMetadata`, `PACK_METADATA`, `resolvePackDefaultScope`)
  - `packages/cli/src/commands/init/tools/index.ts` (`buildUserScopeChoices`, `resolvePackScopes`)
  - `core` pack's existing always-user-scope special-case (candidate for follow-up consolidation)

#### Context

`brainstorm` needs default-user-scope so `oat init`-installed users get the always-on trigger automatically across every working directory. The current installer's user-eligible default (project scope unless overridden) would have shipped `brainstorm` default-on but project-scoped — silently breaking the universal-availability acceptance criterion.

Two ways to fix it:

1. Hardcode `'brainstorm'` checks in the installer's scope-resolution code paths.
2. Introduce a generalized pack-metadata mechanism (`PACK_METADATA[name]?.defaultScope`) that any future pack can opt into.

#### Options Considered

1. **Special-case `'brainstorm'` in installer paths.** Smallest diff (~5 line if-block in two locations). Hardcodes the pack name in scope-resolution code; future packs that want user-default would need their own special-case.
2. **Pack metadata via `PACK_METADATA[name]?.defaultScope`.** (Chosen.) Slightly larger diff, but the abstraction is reusable: any future user-default-scope pack just adds an entry. Better long-term shape; consistent with how `core` _should_ eventually be expressed (currently a hardcoded always-user-scope branch).

#### Decision

Adopt option 2. Introduce `PackMetadata` interface + `PACK_METADATA` map + `resolvePackDefaultScope` helper in `skill-manifest.ts`. Wire the installer to consult metadata in both the interactive picker (`buildUserScopeChoices`) and the non-interactive resolver (`resolvePackScopes`). Existing-install detection continues to short-circuit before metadata lookup so users with a prior project-scope install of any pack don't get unexpected migrations.

`PACK_METADATA` ships with one entry: `brainstorm: { defaultScope: 'user' }`. Absence in the map falls back to `'project'`, preserving existing behavior for `ideas` / `docs` / `utility` / `research`.

#### Consequences

- Positive:
  - `brainstorm` defaults to user scope automatically across both installer paths.
  - Future packs that need user-default scope add a single metadata entry — no code change in scope-resolution paths.
  - The mechanism is shaped to consolidate `core`'s always-user-scope special-case in a follow-up.
  - Existing-install precedence is preserved, so users don't get unexpected scope migrations on re-install.
- Trade-offs:
  - Slightly larger diff than the special-case approach.
  - Pack maintainers must remember to add a `PACK_METADATA` entry when introducing user-default-scope packs (mitigated by the empty-map fallback being safe; absence just means project default).

#### Follow-ups

- Consider migrating `core`'s always-user-scope special-case into `PACK_METADATA` as a separate cleanup project. Out of scope for bl-53f0.

---
