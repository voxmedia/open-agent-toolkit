---
title: Tool Packs and Installed Assets
description: 'Tool-pack lifecycle commands (oat tools) for installing, updating, and removing skills.'
---

# Tool Packs and Installed Assets

This page covers CLI commands that manage bundled OAT tool packs and installed OAT skill/agent assets in canonical directories.

## Quick Look

- What it does: explains how bundled OAT packs are installed, updated, inspected, and removed.
- When to use it: when you need to add capabilities to a repo, update installed skills, or understand which packs own which tools.
- Primary commands: `oat tools list`, `oat tools install`, `oat tools update`, `oat tools remove`

## Bundled packs at a glance

- `core` - foundational diagnostics and docs access (`oat-doctor`, `oat-docs`)
- `docs` - docs and agent-instructions governance workflows
- `workflows` - project lifecycle skills, wrap-up reporting, reviewer agents, and core project templates
- `ideas` - lightweight ideation and promotion flows
- `utility` - review and repo-maintenance helpers
- `project-management` - file-backed backlog/reference skills plus backlog, roadmap, current-state, and decision-record templates
- `research` - research, analysis, comparison, and synthesis skills
- `brainstorm` - always-on brainstorming entry point with visual companion

## `oat tools` command group

The `oat tools` command group provides a unified interface for managing installed tools (skills and agents) across scopes.

## Install vs. initialize

The `project-management` pack has two lifecycle steps:

- **Install**: `oat tools install project-management` (or the legacy `oat init tools project-management`) copies project-management skills into `.agents/skills/` and template sources into `.oat/templates/`.
- **Initialize**: `oat pjm init` instantiates the working repo-reference surface under `.oat/repo/reference/`.

Installing the pack makes the skills and templates available; it does not create the repo's working project-management reference docs. Run `oat pjm init` when you want to scaffold the canonical PJM surface for a repo:

```bash
oat pjm init
```

The command creates missing files and directories for:

- `.oat/repo/reference/current-state.md`
- `.oat/repo/reference/roadmap.md`
- `.oat/repo/reference/decision-record.md`
- `.oat/repo/reference/backlog/`

`oat pjm init` is idempotent and non-destructive. Existing reference docs are skipped and left unchanged, so curated repo state is not overwritten on repeated runs.

Useful options:

- `--reference-root <path>` - scaffold a different reference root instead of `.oat/repo/reference/`
- `--json` - emit a machine-readable result with created and skipped paths

Backlog scaffolding is delegated to the lower-level [`oat backlog init`](config-and-local-state.md#oat-backlog-) helper. Use `oat pjm init` for the full PJM repo-reference surface, and use `oat backlog init` directly only when you need to create or repair the backlog sub-surface by itself.

### `oat tools list`

Purpose:

- List all installed tools with version, pack membership, scope, and update status

Key behavior:

- Scans installed skills and agents across project and user scopes
- Displays version, pack (`core`, `docs`, `ideas`, `workflows`, `utility`, `project-management`, `research`, `brainstorm`, `custom`), and status (`current`, `outdated`, `newer`, `not-bundled`)
- Supports `--scope` filtering and `--json` output

### `oat tools outdated`

Purpose:

- Show only tools that have available updates (status `outdated`)

Key behavior:

- Filters scan results to tools where the installed version is older than the bundled version
- Displays installed and available versions side by side
- Supports `--scope` filtering and `--json` output

### `oat tools info <name>`

Purpose:

- Show detailed information about a single installed tool

Key behavior:

- Displays name, type (skill/agent), version, bundled version, pack, scope, and status
- Reports whether the tool is invocable (for skills) and whether an update is available
- Returns exit code 1 if the tool is not found in any scope

### `oat tools install`

Purpose:

- Install bundled OAT tool packs (`core`, `docs`, `ideas`, `workflows`, `utility`, `project-management`, `research`, `brainstorm`)

Key behavior:

- Same pack selection and install flow as `oat init tools`
- Pack-oriented install subcommands: `core`, `docs`, `ideas`, `workflows`, `utility`, `project-management`, `research`, `brainstorm`
- Interactive installs show each pack's current install location in the picker so already-installed packs are visible before you submit
- User-scope follow-up choices are prepopulated from the current install state for user-eligible packs (`ideas`, `docs`, `utility`, `research`, `brainstorm`)
- The `brainstorm` pack defaults to user scope on fresh installs (driven by `PACK_METADATA[brainstorm].defaultScope = 'user'`); existing project-scope installs still take precedence on re-install so users do not get unexpected scope migrations
- If a user-eligible pack is already installed in both project and user scope, the installer asks whether to keep both installs or normalize the pack to user scope before it makes any cleanup changes
- Changing a user-eligible pack from project scope to user scope, or back again, is treated as a migration: the old canonical copy is removed so the pack ends in the selected scope instead of accumulating duplicate installs
- Tracks installed vs bundled skill versions and reports outdated skills
- Records installed pack state in shared repo config as `tools.<pack>: true` so other OAT workflows can detect installed capabilities without relying on filesystem heuristics
- Interactive runs can prompt to update selected outdated skills
- Successful installs report the final scope chosen for each pack, including `project + user` when both installs are preserved, and auto-sync every scope touched by the install or migration
- Install-triggered auto-sync limits removal planning to the canonical entries from the pack that was just installed, so stale manifest drift in unrelated packs does not delete other provider views
- Use `--no-sync` to skip auto-sync

### `oat tools update`

Purpose:

- Update installed tools to the latest bundled versions

Key behavior:

- Accepts a tool name, `--pack <pack>`, or `--all` (mutually exclusive)
- Compares installed versions against bundled versions and copies updated assets
- For `--pack <pack>` and `--all`, an already-installed pack is reconciled to include newly added bundled skills or agents in that same scope
- For `--pack <pack>` and `--all`, shared repo config is also reconciled from an installed-pack scan so `tools.*` reflects what is actually available and stale `true` flags are cleared
- Dry-run mode with `--dry-run`; auto-sync after mutations by default
- Use `--no-sync` to skip auto-sync
- Reports tools that are already current, newer than bundled, or not bundled (custom)

### `oat tools remove`

Purpose:

- Remove installed tools (skills and agents)

Key behavior:

- Accepts a tool name, `--pack <pack>`, or `--all` (mutually exclusive)
- Removes skill directories and agent `.md` files from canonical locations
- For `--pack <pack>` and `--all`, shared repo config is rewritten from a post-removal scan so `tools.<pack>` becomes `false` when a pack is no longer installed in any scope
- Dry-run mode with `--dry-run`; auto-sync after mutations by default
- Use `--no-sync` to skip auto-sync

## Shared config signal: `tools.*`

Tool-pack lifecycle commands now persist pack availability in shared repo config under `.oat/config.json`.

- `oat tools install <pack>` writes `tools.<pack>: true`
- `oat tools update --pack <pack>` and `oat tools update --all` rebuild the full `tools` map from installed-pack scans
- `oat tools remove --pack <pack>` and `oat tools remove --all` rebuild the same map after removals

This matters because other workflows can now check `oat config get tools.<pack>` instead of inferring capabilities from directory existence alone. For example, `oat-project-document` checks `tools.project-management` before auto-running repo-reference refresh work.

## Core pack

The `core` pack contains foundational diagnostic and documentation skills:

- **oat-doctor** — Setup diagnostics with two modes: check mode (terse `brew doctor`-style warnings with fix commands) and summary mode (full dashboard of installed packs, config values, and sync status).
- **oat-docs** — Interactive Q&A skill backed by locally-bundled OAT documentation at `~/.oat/docs/`.

Key behavior:

- Core pack always installs at **user scope** (`~/.agents/skills/`), regardless of the `--scope` flag. This ensures core skills are available in any directory.
- Core is checked by default in the `oat init tools` guided setup.
- Installation also bundles OAT documentation to `~/.oat/docs/` for the oat-docs skill.
- `oat tools update --pack core` refreshes both skills and `~/.oat/docs/` documentation.
- `oat tools update --all` also refreshes `~/.oat/docs/` when an installed core pack is reconciled.

## Docs pack

The `docs` pack contains active documentation and instruction-governance
workflows:

- **oat-docs-bootstrap** — Guide users through bootstrapping a docs app
  end-to-end: preflight detection, input gathering, scaffold (via `oat docs
init`) with capability-gated post-patches, build verification, config
  inspection, and an educational walkthrough.
- **oat-docs-analyze** — Analyze a docs surface for contract coverage, nav
  drift, stale claims, and coverage gaps.
- **oat-docs-apply** — Apply only approved, evidence-backed docs-analysis
  recommendations.
- **oat-agent-instructions-analyze** — Evaluate `AGENTS.md` and provider
  instruction coverage, quality, and drift.
- **oat-agent-instructions-apply** — Generate or update approved instruction
  files from an analysis artifact.

Key behavior:

- Docs pack installs at the selected scope, typically `project`.
- It complements the `core` pack: `oat-docs` answers questions from bundled
  docs, while the `docs` pack adds analyze/apply workflows.
- `oat tools install docs` is the preferred install path; `oat init tools docs`
  remains available for backward compatibility.
- `oat tools update --pack docs` and `oat tools remove --pack docs` manage the
  workflow skills as a unit.

## Brainstorm pack

The `brainstorm` pack ships a single skill plus a bundled visual companion for
project-independent brainstorming conversations:

- **oat-brainstorm** — Brainstorming entry point with an explicit activation
  contract. The OAT brainstorm banner is a workflow commitment marker, not a
  response style — the skill enters mode only on **Hard Activation** (explicit
  `brainstorm` verb: "let's brainstorm", "brainstorm this", "can we brainstorm
  X", "help me brainstorm X", or `/oat-brainstorm`). Ambiguous exploratory
  phrasing ("I've been thinking about", "what if we", "help me think through")
  follows the **Soft Exploratory Path** — answered conversationally
  with brainstorm-quality reasoning (options, tradeoffs, no premature
  implementation, no destination guess) without the banner. After ≥2 sustained
  exploratory turns the skill offers mode once: _"If you want, I can switch into
  structured brainstorm mode for this."_ Advisory / review / debug / PR /
  status / implementation / active-workflow questions ("thoughts?", "what's
  your take?", "does this seem right?", "why is this failing?") follow **No
  Activation** — direct response, no banner, no offer.
  Once entered, brainstorm mode runs a structured design conversation (one
  question at a time, 2-3 approaches with a recommendation) without committing
  the user to an idea or project artifact, and ends in a pack-aware
  terminal-state picker that hands off to existing OAT skills (idea capture,
  scoped backlog item, project promotion, active-project fold-back,
  doc-to-path) based on which packs are installed in the current repo. Two base
  outcomes (inline-only and write a brainstorming doc to a user-specified path)
  are always available regardless of installed packs.

Key behavior:

- **Default user scope.** The `brainstorm` pack is user-eligible and defaults
  to user scope so the always-on trigger fires consistently across directories
  and machines. This is driven by the generalized pack-metadata mechanism
  (`PACK_METADATA[brainstorm].defaultScope = 'user'`); other user-eligible
  packs (`ideas`, `docs`, `utility`, `research`) still default to project scope
  unless their metadata is updated.
- **Existing-install precedence.** Re-running install on a pack that is
  already installed at project scope preserves that scope — `defaultScope` only
  applies to fresh installs. This protects users from unexpected scope
  migrations.
- **Default-on in `oat init`.** `brainstorm` is checked by default in the
  `oat init tools` guided setup, so new repos get the brainstorming entry point
  out of the box.
- **Visual companion.** A bundled local browser-based UI (Node-based HTTP +
  WebSocket server, content-fragment authoring, per-question terminal-vs-browser
  routing) ships with the skill at `.agents/skills/oat-brainstorm/scripts/`
  and is documented in
  `.agents/skills/oat-brainstorm/references/visual-companion.md`. The companion
  is offered only when the topic is visual-likely (mockups, layout comparisons,
  diagrams, visual option comparisons). Text-likely brainstorms skip the offer
  and can surface it later if the conversation turns visual. Persistence paths
  use OAT-managed prefixes (`.oat/brainstorm/<session-id>/` repo-scope or
  `~/.oat/brainstorm/<session-id>/` user-scope).
- **Terminal-state picker filtered by `tools.<pack>` config.** When the user
  converges on a destination, the skill consults `oat config get tools.ideas`,
  `tools.project-management`, and `tools.workflows` to filter the available
  terminal states. Pack-gated outcomes (capture-as-idea, scoped backlog item,
  project promotion, active-project fold-back) only appear when the
  corresponding pack is installed.
- **Destinations playbook.** The full set of terminal-state stanzas — trigger
  phrases, required template fields, confirmation patterns, handoff targets —
  lives at `.agents/skills/oat-brainstorm/references/destinations.md` and is
  consulted by the skill at destination-identification time.
- **Pack lifecycle.** `oat tools install brainstorm`, `oat tools update --pack
brainstorm`, and `oat tools remove --pack brainstorm` manage the skill plus
  visual-companion bundle as a unit. Standard config-write semantics
  (`tools.brainstorm: true` on install) apply.

### Auto-sync behavior

All mutation commands (`install`, `update`, `remove`) automatically run `oat sync --scope <scope>` after successful operations. This ensures provider views stay in sync with canonical assets without manual intervention.

Use `--no-sync` on any mutation command to skip this step.

For `oat tools install`, the follow-up sync still refreshes provider views immediately, but its removal pass is scoped to the canonical entries that were just installed. This avoids deleting unrelated provider views when a worktree has stale manifest entries for packs whose canonical content is absent locally.

## Legacy commands

### `oat init tools`

The `oat init tools` command remains available for backward compatibility. It has the same install behavior as `oat tools install` but does not include auto-sync — you must run `oat sync --scope ...` manually after install.

### `oat remove`

The `oat remove` command group remains available for backward compatibility. It provides skill removal with dry-run/apply semantics and managed provider-view cleanup.

- `oat remove skill <name>` — remove one installed skill by name
- `oat remove skills --pack <pack>` — remove all installed skills from a bundled pack

These commands mutate by default; use `--dry-run` to preview deletions.

Related docs:

- Bootstrap (`oat init`): `bootstrap.md`
- Provider sync (`oat status`, `oat sync`, `oat providers ...`): `../provider-sync/index.md`
- Diagnostics and local-state commands: `config-and-local-state.md`
