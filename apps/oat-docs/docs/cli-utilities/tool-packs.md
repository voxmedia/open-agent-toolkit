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
- `workflows` - project lifecycle skills, wave-program orchestration (`oat-wave-program`, `oat-wave-execute`), the project subagent-dispatch adapter, wrap-up reporting, reviewer agents, and core project templates
- `ideas` - lightweight ideation and promotion flows
- `utility` - review and repo-maintenance helpers plus the provider-neutral subagent-dispatch engine
- `project-management` - file-backed backlog/reference skills plus backlog, roadmap, current-state, file-per-record decision, and AGENTS-guide templates
- `research` - research, analysis, comparison, and synthesis skills
- `brainstorm` - always-on brainstorming entry point with visual companion

### Cross-pack dispatch dependency

The reusable dispatch contracts intentionally span two packs:

- `utility` owns `oat-dispatch-subagents`, the provider-neutral engine for
  capability checks, catalog-aware selection, launch evidence, and recovery.
- `workflows` owns `oat-project-dispatch-subagents`, the adapter that adds OAT
  project lifecycle context without duplicating provider mechanics.

Install both packs when project lifecycle skills need the adapter:

```bash
oat tools install utility
oat tools install workflows
```

The packs remain independently installable. If the workflows adapter is
present without the utility engine, it fails closed and reports the missing
dependency instead of inventing a fallback route. Non-project analytical
skills can use the utility engine directly.

### Cross-pack explainer dependency

The public explainer family also spans two packs:

- `utility` owns `explainer-kit`, the destination-neutral core with its
  contracts, recipes, themes, templates, render QA, durability verifier, and
  optional publishing connector.
- `workflows` owns `oat-explainer-kit`, the adapter that resolves OAT config,
  project artifacts, output paths, and lifecycle intent.

Install the core at user scope before using the adapter:

```bash
oat tools install utility --scope user
oat tools install workflows
```

The dependency is one-way: the adapter invokes the core, while the core remains
usable without OAT. The adapter checks the installed canonical core path and
minimum compatible version before reading config or running. If the core is
missing it fails closed with the utility install command; if it is too old it
reports:

```bash
oat tools update --pack utility --scope user
```

It never falls back to a source checkout or copies core logic into the
workflows pack. See [Explainer Kit](../workflows/skills/explainer-kit.md) for
the usage and lifecycle contract.

## `oat tools` command group

The `oat tools` command group provides a unified interface for managing installed tools (skills and agents) across scopes.

### CLI updates before bundled-tool mutations

Tool packs ship inside the OAT CLI package. An older CLI can therefore install or update only the tool versions in its own bundle, while a newer stable CLI release may contain newer bundled versions. This is a bundle-freshness warning, not a claim that tools installed by the current CLI are immediately incompatible with it.

Before an eligible interactive `oat init`, `oat tools install` (including pack subcommands), or `oat tools update` mutation, OAT checks the cached stable CLI availability. If a newer version is known, it explains the bundle difference and offers, with a default answer of no, to install that exact validated version:

```bash
npm install --global @open-agent-toolkit/cli@<validated-version>
```

- Accepting updates the CLI package only, stops before changing bundled tools, and asks you to rerun the original command under the new CLI.
- Declining or aborting warns that the current bundle may be older, then continues the requested command.
- If npm fails, OAT does not run the tool mutation and reports how to retry the CLI installation.
- Dry-run, JSON, non-interactive, opted-out, CI, test, source-development, and ephemeral package-runner invocations do not prompt or install.

Set `NO_UPDATE_NOTIFIER` to a truthy value (for example, `1`, `true`, `yes`, or `on`) to suppress checks for one process; empty, `0`, and `false` do not suppress them.

Other eligible commands keep the passive update notice and never launch the installer.

## Install vs. initialize

The `project-management` pack has two lifecycle steps:

- **Install**: `oat tools install project-management` (or the legacy `oat init tools project-management`) copies project-management skills into `.agents/skills/` and template sources into `.oat/templates/`.
- **Initialize**: `oat pjm init` instantiates the two-layer working repo-reference surface under `.oat/repo/`.

Installing the pack makes the skills and templates available; it does not create the repo's working project-management reference docs. Run `oat pjm init` when you want to scaffold the canonical PJM surface for a repo:

```bash
oat pjm init
```

The canonical surface splits active operational state (under `pjm/`) from durable append-mostly references (under `reference/`). The command creates missing files and directories for:

- `.oat/repo/pjm/current-state.md`
- `.oat/repo/pjm/roadmap.md`
- `.oat/repo/pjm/backlog/`
- `.oat/repo/reference/decisions/` (file-per-record decisions plus a generated index)
- AGENTS guides at `.oat/repo/AGENTS.md`, `.oat/repo/pjm/AGENTS.md`, and `.oat/repo/reference/AGENTS.md`

Decisions are now file-per-record under `reference/decisions/` (created and indexed with the [`oat decision`](config-and-local-state.md#oat-decision-) command group), replacing the legacy single `decision-record.md`. Repos still on the old `reference/` layout can migrate with `oat pjm migrate`.

`oat pjm init` is idempotent and non-destructive. Existing reference docs are skipped and left unchanged, so curated repo state is not overwritten on repeated runs.

Run `oat pjm doctor` to check an existing surface after the `project-management` pack is enabled: it reports missing canonical files, leftover template frontmatter, and legacy/loose/second-roadmap drift, and accepts `--json` for machine-readable output. When the pack is disabled or not configured, doctor reports PJM as disabled and skips drift checks. The same gated checks also run under project-scope `oat doctor`.

Useful options:

- `--repo-root <path>` - scaffold a different repo-reference root instead of `.oat/repo`
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
- Installing is **additive**: choosing a scope for a pack never removes it from another scope. A user-eligible pack installed at user scope plus a project install ends up at `project + user`, not moved
- For each user-eligible pack (`ideas`, `docs`, `workflows`, `utility`, `research`, `brainstorm`), the interactive flow offers a per-pack end-state selector (`project`, `user`, or `both`) defaulting to the pack's current placement; leaving the default makes no changes for that pack
- `oat init --setup` uses this same additive scope resolver. In guided setup, choosing to customize scope reaches the per-pack selector; choosing the recommended defaults, or running non-interactively, applies additive per-pack defaults without removals
- The `brainstorm` pack defaults to user scope on fresh installs (driven by `PACK_METADATA[brainstorm].defaultScope = 'user'`); existing installs keep their current placement on re-install, so a re-install never moves a pack between scopes
- Removing a pack from a scope happens only when you explicitly choose a narrower end-state in the interactive flow (e.g. a pack at `both` set to `project` only). All staged removals are shown in a single change summary and applied only after one batch confirmation — declining makes no changes
- Non-interactive installs (including `--scope project`, `--scope user`, and the default pack set) are strictly additive and never remove a pack from a scope. Removal is interactive-only
- Tracks installed vs bundled skill versions and reports outdated skills
- Records installed pack state in shared repo config as `tools.<pack>: true` so other OAT workflows can detect installed capabilities without relying on filesystem heuristics
- Refreshes the managed `OAT tools` section in the repository-root `AGENTS.md`. When the `project-management` pack is installed, that section points agents to `.oat/repo/AGENTS.md` for active PJM and durable-reference routing, summarizes when to consult it, and gives decision-specific guidance for reviewing and creating durable records without hand-editing the generated index.
- Interactive runs can prompt to update selected outdated skills
- Successful installs report the final scope chosen for each pack, including `project + user` when a pack is installed in both, and auto-sync only the scopes actually changed by the install so untouched scopes are never re-synced or pruned
- Install-triggered auto-sync limits removal planning to the canonical entries from the pack that was just installed, so stale manifest drift in unrelated packs does not delete other provider views
- Use `--no-sync` to skip auto-sync

### `oat tools update`

Purpose:

- Update installed tools to the latest bundled versions

Key behavior:

- Accepts a tool name, `--pack <pack>`, or `--all` (mutually exclusive)
- With no target, exits without mutation and suggests the explicit bulk command `oat tools update --all`; invalid packs and conflicting targets keep their own targeted diagnostics
- Compares installed versions against bundled versions and copies updated assets
- For `--pack <pack>` and `--all`, an already-installed pack is reconciled to include newly added bundled skills or agents in that same scope
- Pack-targeted updates intentionally rewrite bundled template and script companions in place, even when the pack's installed skills are already current
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

## Workflows pack

The workflows pack is installable at project scope, user scope, or both. A
user-scope install carries the complete versioned asset set:

- skills and agents → `~/.agents/skills/` and `~/.agents/agents/`;
- templates → `~/.oat/templates/`;
- executable helper scripts → `~/.oat/scripts/`.

Use either the direct or aggregate form:

```bash
oat tools install workflows --scope user
oat init tools workflows --scope user
```

User scope intentionally skips project-root scaffolding: it does not create a
home-level `.oat/projects-root`, `.oat/projects/` tree, or projects-root config.
Projects remain anchored in the target repository. Project-scope installation
retains its existing scaffolding and local-path setup.

`oat tools update --pack workflows --scope user` refreshes all four asset
classes in place, including newly bundled skills and agents. Pack removal and a
confirmed aggregate scope reduction remove those same user-level assets.
Companion template and script removal is user-scope-only; project-scope removal
leaves repo-local `.oat/templates/` and `.oat/scripts/` assets intact.

## Core pack

The `core` pack contains foundational diagnostic and documentation skills:

- **oat-doctor** — Setup diagnostics with two modes: check mode (terse `brew doctor`-style warnings with fix commands) and summary mode (full dashboard of installed packs, config values, and sync status).
- **oat-docs** — Interactive Q&A skill backed by locally-bundled OAT documentation at `~/.oat/docs/`.

Key behavior:

- Core pack always installs at **user scope** (`~/.agents/skills/`). It does not honor a different scope, and passing a conflicting explicit `--scope` (e.g. `oat init tools core --scope project`) is rejected with an error rather than silently ignored; omit `--scope` or pass `--scope user`. This ensures core skills are available in any directory.
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
