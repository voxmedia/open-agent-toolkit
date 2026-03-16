---
oat_status: complete
oat_ready_for: plan
oat_blockers: []
oat_last_updated: 2026-03-15
oat_generated: false
---

# Discovery: oat-cli-doctor-skills

## Phase Guardrails (Discovery)

Discovery is for requirements and decisions, not implementation details.

## Initial Request

Create two complementary user-level agent skills that ship together:

1. **`/oat-doctor`** — Diagnostic and summary skill that inspects OAT setup at project and user levels. Checks for skill updates, identifies misconfigurations, summarizes what's installed, and recommends corrective actions.
2. **`/oat-docs`** — Interactive Q&A skill backed by locally-bundled OAT documentation. Lets users ask questions about OAT workflows, CLI commands, and skill authoring.

Both are recommended as user-level skill installs so they work regardless of whether you're in a project directory.

## Key Decisions

### D1: Distribution — New "core" pack (user-level)

Both skills belong in a new **"core"** pack, not utility. Rationale: these are foundational diagnostic/help skills that should always be installed at user level, regardless of project. The core pack is a selectable pack in `oat init tools` alongside ideas/workflows/utility, but always installs at user scope.

### D2: Docs resolution — `~/.oat/docs/` only

The `/oat-docs` skill resolves docs exclusively from `~/.oat/docs/`. No fallback to repo-level `apps/oat-docs/docs/` or `docs/`. If docs aren't found, the skill tells the user how to get them installed.

### D3: Docs bundling — lazy on `oat init` + `oat tools update`

Docs are bundled from `apps/oat-docs/docs/` into CLI assets and copied to `~/.oat/docs/` when the core pack is installed. Drift after CLI upgrades is handled by:

- `oat tools update` refreshes docs alongside skills (existing update flow)
- `oat init` (re-running) also refreshes docs

### D4: Doctor has two modes

- **Check mode** (default): Terse `brew doctor`-style warnings with fix commands.
- **Summary mode** (`--summary`): Full dashboard of installed packs, skills (user vs project), config values with explanations, available-but-uninstalled packs, sync status.

### D5: Doctor output — conversational only

No report file. Doctor outputs findings inline in the conversation.

### D6: Config explanations — from docs bundle

Summary mode config explanations are read from `~/.oat/docs/` at runtime. This keeps them current with the docs version and avoids duplicating documentation in the skill.

### D7: Doctor uses existing CLI commands

`oat tools list --json --scope all`, `oat tools outdated --json --scope all`, `oat config list --json`, and `oat sync --dry-run --json --scope project` provide structured data. No new CLI commands needed for the doctor skill.

### D8: Skills authored following create-oat-skill

Both skills must follow the `create-oat-skill` template conventions: mode assertion, progress banners, OAT-safe bash patterns, and the baseline structure from `create-agnostic-skill`.

## Constraints

- Must follow `create-oat-skill` template (mode assertion, progress indicators, step structure)
- Must use `allowed-tools` available in the skill context
- Doctor's data gathering via existing `oat` CLI commands with `--json` flag
- Both skills: `user-invocable: true`, `disable-model-invocation: true` (doctor), `disable-model-invocation: false` (docs — can be auto-invoked for Q&A)
- Core pack infrastructure must integrate with existing `oat init tools` and `oat tools update` flows
- `PackName` type must be extended with `'core'`

## Success Criteria

- `/oat-doctor` check mode reports actionable warnings with fix commands
- `/oat-doctor --summary` shows full dashboard with config explanations from docs
- `/oat-docs` answers questions from `~/.oat/docs/` only
- New "core" pack selectable in `oat init tools`, always user-scope
- Docs bundled to `~/.oat/docs/` via core pack install and refreshable via `oat tools update`
- `pnpm build`, `pnpm lint`, `pnpm type-check`, `pnpm --filter @oat/cli test` all pass
- Skills follow `create-oat-skill` conventions

## Out of Scope

- npm postinstall hooks for `~/.oat/` creation
- New CLI commands (`oat doctor`, `oat tools available`)
- Doctor report file output
- Schema introspection (`oat schema <command>`)

## Scope Summary

This project delivers:

1. **Two SKILL.md files** — `oat-doctor` and `oat-docs`, authored per `create-oat-skill` template
2. **New "core" pack in CLI** — `CORE_SKILLS` manifest, `install-core.ts` handler, pack registration in `oat init tools`
3. **Docs bundling** — `apps/oat-docs/docs/` bundled into CLI assets and copied to `~/.oat/docs/` on core pack install
4. **Type updates** — `PackName` extended with `'core'`, scan-tools recognizes core pack
5. **Bundle script** — core skills + docs directory added to `bundle-assets.sh`
6. **Tests** — core pack install tests, bundle consistency updated
