---
title: Tool Packs and Installed Assets
description: 'Tool-pack lifecycle commands (oat tools) for installing, updating, and removing skills.'
---

# Tool Packs and Installed Assets

This page covers CLI commands that manage bundled OAT tool packs and installed OAT skill/agent assets in canonical directories.

## Quick Look

- What it does: explains how bundled OAT packs are installed, updated, inspected, and removed.
- When to use it: when you need to add capabilities to a repo, update installed skills, or understand which packs own which tools.
- Primary commands: `oat tools list`, `oat tools has`, `oat tools install`, `oat tools update`, `oat tools remove`, `oat tools migrate`
- Coming from an earlier CLI: read [Upgrading from an earlier CLI](#upgrading-from-an-earlier-cli) for the changed install-scope default, PJM adoption gating, sparse `tools` config map, and per-pack `--json` shape

## Bundled packs at a glance

| Pack                 | What it provides                                                                                                                                                                                                | Allowed scopes | Fresh-install default |
| -------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------- | --------------------- |
| `core`               | Foundational diagnostics and docs access (`oat-doctor`, `oat-docs`) plus the bundled documentation tree                                                                                                         | user           | user                  |
| `docs`               | Docs and agent-instructions governance workflows, docs-app scaffold templates, and the shared tracking-resolution script                                                                                        | project, user  | user                  |
| `workflows`          | Project lifecycle skills, wave-program orchestration (`oat-wave-program`, `oat-wave-execute`), the project subagent-dispatch adapter, wrap-up reporting, reviewer agents, project templates, and helper scripts | project, user  | user                  |
| `ideas`              | Lightweight ideation and promotion flows plus idea templates                                                                                                                                                    | project, user  | user                  |
| `utility`            | Review and repo-maintenance helpers plus portable subagent-selection guidance and the provider-neutral dispatch engine                                                                                          | project, user  | user                  |
| `project-management` | File-backed backlog/reference skills plus backlog, roadmap, current-state, file-per-record decision, and AGENTS-guide templates                                                                                 | project, user  | user                  |
| `research`           | Research, analysis, comparison, and synthesis skills plus the skeptical-evaluator agent                                                                                                                         | project, user  | user                  |
| `brainstorm`         | Always-on brainstorming entry point with visual companion                                                                                                                                                       | project, user  | user                  |

Every reusable pack is a complete user-scope capability. On a **fresh** install
each pack lands at user scope by default, so capabilities follow you across
repositories. `core` is the one pack that is user-only: passing a conflicting
explicit `--scope project` is rejected rather than silently ignored.

On a **re-install**, existing placement wins. A pack already installed at
project scope stays at project scope; the fresh-install default never migrates
an existing install. Use [`oat tools migrate`](#oat-tools-migrate) when you
actually want to move one.

### Orchestration guidance and dispatch dependencies

The utility pack ships the reusable orchestration pair:

- `subagent-orchestration` owns durable task classes, model-selection
  principles, dated provider selection matrices, and refresh evidence.
- `oat-dispatch-subagents` owns capability checks, live catalog intersection,
  authorized routes, launch acceptance, recovery, and dispatch records.

Provider-aware callers load the generic principles plus exactly one provider
selection reference, then the dispatch contract plus exactly one matching
provider mechanics reference. The first reference answers which candidates
satisfy the task-class floor; the second answers how the active provider can
launch them. Root callers retain classification, selection judgment,
cross-lane synthesis, and final authority.

Custom utility selection has a directional dependency: choosing
`oat-dispatch-subagents` automatically includes `subagent-orchestration`, while
the self-contained guidance skill may be installed alone. Full utility-pack
update and removal treat both as explicit members. Removing either skill by
name does not implicitly remove the other.

The OAT lifecycle adapter intentionally lives in a separate pack:

- `workflows` owns `oat-project-dispatch-subagents`, the adapter that adds OAT
  project lifecycle context without duplicating provider mechanics.

Install both packs when project lifecycle skills need the adapter:

```bash
oat tools install utility
oat tools install workflows
```

The two packs do not need to share a scope. For example, a repository can keep
the lifecycle adapter at project scope while reusing the utility contracts from
user scope:

```bash
oat tools install workflows --scope project
oat tools install utility --scope user
```

Lifecycle skills resolve each required sibling independently from the loaded
scope, then user scope, then project scope. This makes mixed-scope placement a
supported execution path rather than relying on one frozen skills root.

Materialized **agents** from any pack that ships them (`workflows` here,
`research` elsewhere) use a two-step order instead — user scope, then project
scope — because no provider exposes a stable loaded-agent source directory to
derive a loaded scope from. They still bind each dependency independently and
still fail closed with the owning pack's install or update command. See
[Writing Skills → Portable sibling reads](../contributing/skills.md#portable-sibling-reads-skills-and-agents)
for the full contract.

The packs remain independently installable. If the workflows adapter is
present without the utility contracts, it fails closed and reports the missing
dependency instead of inventing a fallback route. Non-project analytical
skills can use the utility guidance and dispatch layers directly.

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

## Scope, intent, and inventory

Two independent facts describe a pack:

- **Intent** is what you asked for. It is stored per scope as
  `tools.<pack>: true` in that scope's config file (`.oat/config.json` for
  project scope, `~/.oat/config.json` for user scope). Intent is _true-or-absent_:
  removing a pack deletes the key rather than writing `false`.
- **Inventory** is what is actually on disk right now: every managed asset the
  release manifest declares for that pack and scope, its presence, and its
  version or content digest.

Commands report both. `oat tools list` and `oat tools info` show placement,
intent source, and completeness. `oat status` and `oat doctor` report drift
between intent and inventory with a scoped recovery command.

A pack is **complete** at a scope when every managed asset the current release
declares for that scope is present, **partial** when only some are, and
**absent** when none are.

### Where pack assets land

| Asset kind        | Project scope                                                                      | User scope                   | Ownership                                           |
| ----------------- | ---------------------------------------------------------------------------------- | ---------------------------- | --------------------------------------------------- |
| Skill             | `.agents/skills/<name>/`                                                           | `~/.agents/skills/<name>/`   | Managed — updated and removed by OAT                |
| Agent             | `.agents/agents/<name>.md`                                                         | `~/.agents/agents/<name>.md` | Managed (see the user-scope agent limitation below) |
| Template          | `.oat/templates/<name>`                                                            | `~/.oat/templates/<name>`    | Seeded once at project scope; managed at user scope |
| Script            | `.oat/scripts/<name>`                                                              | `~/.oat/scripts/<name>`      | Managed, executable                                 |
| Bundled docs tree | not applicable                                                                     | `~/.oat/docs/`               | Managed directory (core pack)                       |
| Seed file         | `.oat/ideas/…`, `.oat/projects-root`, `.oat/config.json`, project `.gitkeep` files | `~/.oat/ideas/…`             | Seeded once, then owned by you                      |

Seed files default to both scopes, so `oat tools install ideas --scope user`
creates `~/.oat/ideas/backlog.md` and `~/.oat/ideas/scratchpad.md`. Only the
`workflows` project-scaffold seeds — `.oat/projects-root`, `.oat/config.json`,
and the project `.gitkeep` files — are pinned to project scope.

#### User-scope agents reach no provider

Canonical **agents** are installed at either scope, but only project scope
materializes a provider view for them. At user scope the sync pipeline
enumerates skills only, and the sole user-scope agent materialization is the
bundled managed role file set (`oat-phase-implementer.md` and
`oat-reviewer.md`). A pack installed at user scope therefore writes its agents
to `~/.agents/agents/` where no provider can see them — for example
`oat tools install workflows --scope user` leaves `oat-codebase-mapper` without
a provider agent, and `oat tools install research --scope user` does the same
for `skeptical-evaluator`.

`oat status` and `oat doctor` name the affected agents with a
`user-agent-unmaterialized` finding rather than reporting the pack as complete
without qualification. Install the pack at **project scope** when you need its
agents; `oat tools update` cannot repair this, because it is a scope limitation
rather than drift.

Repository templates under `.oat/templates/` are **owner overrides**. Once a
project-scope template exists, OAT will not rewrite it: the managed default now
lives at user scope and in the bundle. Delete the repository copy to resume
managed-default behavior. `oat status` and `oat doctor` report retained
overrides so the divergence is visible rather than silent.

### Evolving pack membership

Packs evolve between releases. A pack that is installed at a scope is
reconciled against the **current** release membership, not the membership it
had when you first installed it:

- `oat tools update --pack <pack>` and `oat tools update --all` add newly
  bundled skills, agents, templates, and scripts to the scopes where the pack
  is already installed.
- If every managed asset went missing but intent is still declared, update
  repairs the pack from intent rather than treating it as uninstalled.
- Identical non-versioned assets are compared by content digest, so a refresh
  that changes nothing performs no write.

### Legacy `false` intent

Older repositories may still carry `tools.<pack>: false` in shared config.
That value is **not** authoritative and is never treated as an opt-out. When
managed assets exist alongside a legacy `false`, OAT reports a
`legacy-false-conflict` diagnostic and points at the scoped update command that
adopts the install. Removing the pack deletes the key entirely.

### Duplicate cross-scope installs

A pack installed at both project and user scope is a legitimate state, not an
error. OAT reports it as a `duplicate-scope` diagnostic with the affected paths
and installed versions, and **does not infer provider precedence** — which copy
a given host loads is the host's behavior, not OAT's. Resolve it explicitly
with `oat tools migrate` when you want a single owner.

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

The `project-management` pack separates **capability** from **repository
adoption**, and the two are tracked independently:

- **Install (capability)**: `oat tools install project-management` (or the
  legacy `oat init tools project-management`) installs the PJM skills and
  template sources. Like every other pack it defaults to **user** scope on a
  fresh install, so `~/.agents/skills/` and `~/.oat/templates/` receive the
  managed assets and no repository file is touched.
- **Initialize (adoption)**: `oat pjm init` instantiates the two-layer working
  repo-reference surface under `.oat/repo/`, upserts the repository `AGENTS.md`
  project-management guidance, and records explicit adoption in
  `.oat/config.json` as `pjm.initialized: true` with a `pjm.schemaVersion`.

Having the pack installed does **not** mean this repository uses PJM. Adoption
is a per-repository decision recorded by `oat pjm init`:

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

> **Current migration prerequisite:** In CLI `0.2.37`, `oat pjm migrate` still
> requires project-scope `tools.project-management: true` in `.oat/config.json`;
> a user-only pack install does not satisfy that gate. In an adopted legacy
> repository, run `oat config set tools.project-management true` before the
> migration preview. Removing this temporary coupling is tracked by
> `BL-260827-correct-scope-and-adoption`.

Decision records still require repository PJM adoption. Run `oat pjm init` first: like every repository-mutating PJM command, `oat decision init` fails closed in an unadopted repository, writes nothing, and returns `oat pjm init` as the recovery. Once the repository is adopted, `oat decision init` scaffolds only the decision surface — the decision directory, generated index, and decision-specific AGENTS guidance — without touching current state, roadmap, or backlog artifacts. It does not require the `project-management` pack. If the pack is installed later, its root guidance is maintained as a separate managed section so the decision instructions remain independently reusable.

`oat pjm init` is idempotent and non-destructive. Existing reference docs are skipped and left unchanged, so curated repo state is not overwritten on repeated runs.

### Adoption state and the write guard

`resolvePjmAdoption()` resolves one of four repository states, and every
repository-mutating PJM command checks it before writing anything:

| State                    | Meaning                                                           | Recovery       |
| ------------------------ | ----------------------------------------------------------------- | -------------- |
| `declared`               | `pjm.initialized: true` is present in `.oat/config.json`          | none needed    |
| `inferred-legacy`        | The full canonical scaffold exists without an explicit marker     | none needed    |
| `partial-initialization` | Some canonical scaffold files exist but the surface is incomplete | `oat pjm init` |
| `none`                   | The repository has not adopted PJM                                | `oat pjm init` |

`oat pjm`, `oat backlog`, and `oat decision` mutations **fail closed** for
`partial-initialization` and `none`. They write nothing and return an error
naming the repository path and `oat pjm init` as the recovery. `oat backlog
init` and `oat decision init` are no longer alternate adoption paths for the
full PJM surface.

Run `oat pjm doctor` to inspect an existing surface. It is read-only, reports
missing canonical files, leftover template frontmatter, and
legacy/loose/second-roadmap drift, and accepts `--json`. Its JSON result carries
an additive adoption object:

```json
{
  "adoption": {
    "state": "declared",
    "repoRoot": "/repo/.oat/repo",
    "recovery": null
  }
}
```

Consumers that write repository PJM state branch on `adoption.state`, not on
pack presence. Project-scope `oat doctor` aggregates the same `pjm:*` checks and
keys them on adoption state rather than on `tools.project-management`, so a
repository that adopted PJM with a user-scope pack is diagnosed correctly.

### Template precedence

PJM templates resolve through three tiers, first match wins:

1. **Repository** — `.oat/templates/<name>` in this repo. An existing repository
   template is an owner override and is never rewritten by pack updates.
2. **User** — `~/.oat/templates/<name>`, the managed default that
   `oat tools update --pack project-management --scope user` keeps current.
3. **Bundle** — the templates shipped inside the installed CLI.

Delete a repository template to fall back to the managed user default. If a
template is missing from all three tiers, the command errors rather than
inventing content.

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
- Also reports per-pack placement (`project`, `user`, `both`, `unavailable`), intent source (`declared`, `inferred-legacy`, `none`), completeness, missing managed assets, and any inventory diagnostics
- Supports `--scope` filtering and `--json` output

### `oat tools outdated`

Purpose:

- Show only tools that have available updates (status `outdated`)

Key behavior:

- Filters scan results to tools where the installed version is older than the bundled version
- Also reports non-versioned managed assets whose content has drifted from the bundle, and packs that are declared but absent, as repairable
- Displays installed and available versions side by side
- Supports `--scope` filtering and `--json` output

### `oat tools info <name>`

Purpose:

- Show detailed information about a single installed tool

Key behavior:

- Displays name, type (skill/agent), version, bundled version, pack, scope, and status
- Reports whether the tool is invocable (for skills) and whether an update is available
- Returns exit code 1 if the tool is not found in any scope

### `oat tools has <pack>`

Purpose:

- Check current availability of one bundled pack without treating shared config as a runtime capability cache

Key behavior:

- Defaults to effective availability across project and user scopes
- Accepts `--scope project`, `--scope user`, or `--scope all`
- **Availability is complete-only.** A scope counts as available only when every
  managed asset the current release declares for that scope is present. A
  partially installed pack reports `false` so callers never build on a
  half-installed capability
- Prints `true` or `false` in plain mode
- With the global `--json` flag, emits the full availability record:

```json
{
  "pack": "docs",
  "available": false,
  "scopes": [],
  "unavailableScopes": [],
  "completeness": { "project": "partial", "user": "absent" },
  "missing": [
    {
      "scope": "project",
      "asset": "skill:oat-docs-apply",
      "path": "/repo/.agents/skills/oat-docs-apply"
    }
  ]
}
```

- `scopes` lists only the scopes where the pack is **complete**;
  `unavailableScopes` lists requested scopes the pack could not be checked in —
  either because the pack does not allow that scope at all (for example
  `project` for `core`) or because the scope could not be resolved here;
  `completeness` and `missing` explain a `false` result so it is actionable
- Outside a Git repository, the default `--scope all` query still answers from
  user scope and lists `project` in `unavailableScopes` instead of failing. An
  explicit `--scope project` outside a repository is still a hard failure
- Exits `0` for every valid query, including an unavailable pack, `1` for an invalid pack or other actionable input error, and `2` for an unexpected scan or runtime failure
- `oat tools has <pack>` answers **capability availability**, not repository
  adoption. For `project-management` specifically, use
  `oat pjm doctor --json` to learn whether _this repository_ has adopted PJM

Examples:

```bash
oat tools has project-management
oat tools has brainstorm --scope user
oat --json tools has workflows
```

### `oat tools install`

Purpose:

- Install bundled OAT tool packs (`core`, `docs`, `ideas`, `workflows`, `utility`, `project-management`, `research`, `brainstorm`)

Key behavior:

- Same pack selection and install flow as `oat init tools`
- Pack-oriented install subcommands: `core`, `docs`, `ideas`, `workflows`, `utility`, `project-management`, `research`, `brainstorm`
- Interactive installs show each pack's current install location in the picker so already-installed packs are visible before you submit
- Installing is **additive**: choosing a scope for a pack never removes it from another scope. A pack installed at user scope plus a project install ends up at `project + user`, not moved
- For every pack that allows both scopes (`ideas`, `docs`, `workflows`, `utility`, `project-management`, `research`, `brainstorm`), the interactive flow offers a per-pack end-state selector (`project`, `user`, or `both`) defaulting to the pack's current placement; leaving the default makes no changes for that pack
- Fresh installs default to **user scope** for every pack; existing installs keep their current placement
- `oat init --setup` uses this same additive scope resolver. In guided setup, choosing to customize scope reaches the per-pack selector; choosing the recommended defaults, or running non-interactively, applies additive per-pack defaults without removals
- Every pack's fresh-install default is user scope (`defaultScope` in the release manifest); existing installs keep their current placement on re-install, so a re-install never moves a pack between scopes or creates a second copy at the other one. This applies to the per-pack subcommands too: a bare `oat tools install docs` in a repository where `docs` is already at project scope stays at project scope, and only an explicit `--scope` overrides that
- Removing a pack from a scope happens only when you explicitly choose a narrower end-state in the interactive flow (e.g. a pack at `both` set to `project` only). All staged removals are shown in a single change summary and applied only after one batch confirmation — declining makes no changes
- Non-interactive installs (including `--scope project`, `--scope user`, and the default pack set) are strictly additive and never remove a pack from a scope. Removal is interactive-only
- Tracks installed vs bundled skill versions and reports outdated skills
- Writes pack intent into the config file for the scope you installed into: a project install sets `tools.<pack>: true` in `.oat/config.json`, and a user install sets it in `~/.oat/config.json`. A user-only install never writes repository config
- A user-only install needs no Git repository and performs no repository writes
- Refreshes the managed `OAT tools` section in the repository-root `AGENTS.md` **only for project-scope runs of the aggregate `oat tools install`**. The per-pack subcommands (`oat tools install workflows`, `oat tools install docs`, and the rest) never write `AGENTS.md`, at either scope
- Repository `AGENTS.md` guidance for project management is owned by adoption, not by pack placement. Installing the `project-management` pack no longer upserts a managed `OAT project-management` section; `oat pjm init` writes that repository guidance when the repository actually adopts PJM
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
- For `--pack <pack>` and `--all`, an already-installed pack is reconciled to the **current** release membership in the scopes where it is installed, adding newly bundled skills, agents, templates, and scripts
- A pack whose managed assets are all missing but whose intent is still declared is repaired from intent rather than skipped
- Managed template and script companions are refreshed at **user** scope. A project-scope repository template is an owner override and is left alone
- Non-versioned assets are compared by content digest, so an identical refresh is a no-op instead of a rewrite
- Update persists inferred legacy intent only after a successful explicit mutation, so a read never rewrites your config
- `--scope all` outside a Git repository completes the user-scope work instead of failing. Unlike `oat status` and `oat doctor`, update skips project scope silently and does not name it in the result; an explicitly requested `--scope project` outside a repository is still a hard failure
- Dry-run mode with `--dry-run`; auto-sync after mutations by default
- Use `--no-sync` to skip auto-sync
- Reports tools that are already current, newer than bundled, or not bundled (custom)

### `oat tools remove`

Purpose:

- Remove installed tools (skills and agents)

Key behavior:

- Accepts a tool name, `--pack <pack>`, or `--all` (mutually exclusive)
- Removal is planned from the release manifest, so it deletes **only** assets OAT manages for that pack and scope
- Retained by design: project-scope repository template overrides, mutable seed files (`.oat/ideas/…`, `.oat/projects-root`, project `.gitkeep` files), and shared scripts still owned by another installed pack. Retained owner data is reported rather than silently skipped
- Already-missing files are not an error
- On success the pack's intent key is deleted from that scope's config file. It is never rewritten as `false`. A failed removal retains the key
- A removal that finds no trace of a pack at a scope leaves that pack's intent alone. `No tools to remove.` means no durable state changed either, so `--all` in a repository whose packs are already gone will not quietly rewrite `.oat/config.json` or destroy the intent [`oat tools update`](#oat-tools-update) restores a fully-missing pack from
- In `--json` output, the additive `packOutcomes` array reports `pack`, `scope`,
  and `removed` for each attempted pack/scope pair. Automation should use
  `removed: true` as the evidence that removal acted on that pack and its scoped
  intent was eligible to be cleared; `removed: false` is a no-op and preserves
  intent.
- Removal-triggered sync prunes exactly the canonical provider views for the removed paths in that scope, leaving other scopes and packs untouched
- Dry-run mode with `--dry-run`; auto-sync after mutations by default
- Use `--no-sync` to skip auto-sync

### `oat tools migrate`

Purpose:

- Move one installed pack between scopes with a preview, a verified
  destination, and an explicitly confirmed source removal

Key behavior:

- Requires `--pack <pack>`, `--from <scope>`, and `--to <scope>`; source and
  destination must differ
- Always previews first. The preview lists additions, duplicates, conflicts,
  planned source removals, retained owner data, and any inventory diagnostics
- `--dry-run` stops after the preview and exits `1` when the migration is
  blocked by destination conflicts
- **Destination first, source second.** The destination is installed and
  re-inventoried, and destination intent is written only after the pack is
  verified complete there. Only then is source removal offered
- Source removal requires an interactive confirmation. Declining leaves the
  pack installed at **both** scopes with the destination verified — a safe,
  recoverable state, not a failure. Non-interactive runs stop at the same point
- If source removal or its sync fails partway, the destination is kept, source
  intent is retained, and structured recovery instructions are printed. Rerun
  the same command to finish
- There is no force flag: a blocked migration is resolved by fixing the
  conflict, not by bypassing verification
- With `--json`, emits `{ "operation": "migrate", "dryRun": <boolean>, "preview": …, "status": …, "recovery": [...] }`.
  `status` is one of `previewed`, `migrated`, `retained-both`, `blocked`,
  `destination-sync-failed`, `source-removal-failed`, or `source-sync-failed`

```bash
oat tools migrate --pack docs --from project --to user --dry-run
oat tools migrate --pack docs --from project --to user
```

To roll a migration back, run it in the opposite direction. Because the
destination is always verified before the source is touched, a rollback is the
same safe two-phase operation.

## Pack intent: `tools.<pack>`

Pack intent is recorded per scope, in that scope's own config file:

| Scope   | Config file          | Key                  |
| ------- | -------------------- | -------------------- |
| project | `.oat/config.json`   | `tools.<pack>: true` |
| user    | `~/.oat/config.json` | `tools.<pack>: true` |

- Intent is **true-or-absent**. Installing writes `true` for the scope you
  installed into; removing deletes the key. OAT never writes `false`.
- A user-scope install never writes repository config, and a project-scope
  install never writes user config.
- Intent for one pack is never derived from another pack's key, and no
  command writes the full eight-pack map.
- `.oat/config.local.json` is not an intent surface; per-developer state stays
  out of pack intent.
- A manual `oat config set tools.<pack> true` is an override that the next
  lifecycle mutation for that scope may replace with the reconciled value.

Use `oat config get tools.<pack>` to inspect declared intent, and `oat tools
list`, `oat tools info <name>`, `oat status`, or `oat doctor` to inspect what is
actually installed.

Use `oat tools has <pack>` when a workflow needs current effective capability
availability across project and user scope. Availability is a capability
question; it is **not** evidence that the current repository adopted anything.
Workflows that write repository PJM state check `oat pjm doctor --json` for
adoption instead.

## Workflows pack

The workflows pack is installable at project scope, user scope, or both, and
defaults to user scope on a fresh install. A user-scope install carries the
complete versioned asset set:

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
Companion template removal is user-scope-only; project-scope removal leaves
repo-local `.oat/templates/` overrides and mutable project seeds intact. The
shared `resolve-tracking.sh` script is co-owned by the `docs` and `workflows`
packs and is retained while either pack still owns it in that scope.

## Core pack

The `core` pack contains foundational diagnostic and documentation skills:

- **oat-doctor** — Setup diagnostics with two modes: check mode (terse `brew doctor`-style warnings with fix commands) and summary mode (full dashboard of installed packs, config values, and sync status).
- **oat-docs** — Interactive Q&A skill backed by locally-bundled OAT documentation at `~/.oat/docs/`.

Key behavior:

- Core pack always installs at **user scope** (`~/.agents/skills/`). It is the only pack whose sole allowed scope is `user`, and passing a conflicting explicit `--scope` (e.g. `oat init tools core --scope project`) is rejected with an error rather than silently ignored; omit `--scope` or pass `--scope user`. This ensures core skills are available in any directory.
- `~/.oat/docs/` is a managed directory asset: its completeness and drift are compared as a whole tree, so a partially deleted docs tree is reported as a partial `core` install rather than passing silently.
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

- Docs pack installs at the selected scope and defaults to user scope on a
  fresh install.
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

- **Default user scope.** The `brainstorm` pack defaults to user scope so the
  always-on trigger fires consistently across directories and machines. Every
  other reusable pack now shares that default; the per-pack `defaultScope` lives
  in the release manifest.
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
- **Terminal-state picker filtered by effective pack availability.** When the
  user converges on a destination, the skill runs `oat tools has ideas`, `oat
tools has project-management`, and `oat tools has workflows` to filter the
  available terminal states. Pack-gated outcomes (capture-as-idea, scoped
  backlog item, project promotion, active-project fold-back) appear when the
  corresponding pack is available at project or user scope. The separate `oat
config get activeProject` lookup resolves active project state.
- **Destinations playbook.** The full set of terminal-state stanzas — trigger
  phrases, required template fields, confirmation patterns, handoff targets —
  lives at `.agents/skills/oat-brainstorm/references/destinations.md` and is
  consulted by the skill at destination-identification time.
- **Pack lifecycle.** `oat tools install brainstorm`, `oat tools update --pack
brainstorm`, and `oat tools remove --pack brainstorm` manage the skill plus
  visual-companion bundle as a unit. A project install records
  `tools.brainstorm: true` in `.oat/config.json`; a user install records it in
  `~/.oat/config.json`. Either placement satisfies `oat tools has brainstorm`.

### Auto-sync behavior

All mutation commands (`install`, `update`, `remove`, `migrate`) automatically run `oat sync --scope <scope>` after successful operations. This ensures provider views stay in sync with canonical assets without manual intervention.

Use `--no-sync` on any mutation command to skip this step.

For `oat tools install`, the follow-up sync still refreshes provider views immediately, but its removal pass is scoped to the canonical entries that were just installed. This avoids deleting unrelated provider views when a worktree has stale manifest entries for packs whose canonical content is absent locally.

Removal and migration use the symmetric contract: the follow-up sync prunes exactly the provider views for the canonical paths that were removed, in that scope only, and only after the canonical source is confirmed absent.

## Upgrading from an earlier CLI

User-scope tool packs and explicit PJM adoption changed several defaults and
exit codes. Nothing here is data-destructive, and legacy config keeps working —
`tools.<pack>: false` still parses, complete pre-adoption PJM scaffolds are
grandfathered as `inferred-legacy`, and no CLI flag was removed or renamed. But
several commands you already run behave differently.

### Install scope defaults flipped to user

Every pack's fresh-install default is now **user** scope; it used to be project
scope. A fresh `oat tools install docs` in a repository therefore lands in
`~/.agents/` rather than the repository.

Existing installs are not moved: both the aggregate installer and the per-pack
subcommands resolve an already-installed pack to its current placement, so a
re-install neither migrates the pack nor creates a second copy at the other
scope. An explicit `--scope` still wins over that. Use
[`oat tools migrate`](#oat-tools-migrate) when you actually want to move a pack.

If you already have a pack at both scopes, `oat doctor` reports it as
[`duplicate-scope`](#duplicate-cross-scope-installs) and **exits 1**. That is a
new non-zero exit for a state the previous release did not diagnose; resolve it
with `oat tools migrate`, or treat the exit code accordingly in scripts.

### PJM commands fail closed without adoption

Repository PJM state now requires explicit adoption via `oat pjm init`:

- `oat pjm doctor` **exits 1** in an unadopted repository. It previously
  reported a passing `pjm:disabled` check.
- `oat backlog init`, `oat backlog new`, `oat backlog regenerate-index`,
  `oat backlog archive`, `oat decision init`, `oat decision new`, and
  `oat decision regenerate-index` **exit 1 and write nothing** in an unadopted
  repository, naming `oat pjm init` as the recovery. Previously `init` was an
  alternate adoption path and the other subcommands were ungated.

Installing the `project-management` pack does not adopt a repository. Run
`oat pjm init` once per repository that should carry PJM state.

### The `tools` config map is now sparse

Pack intent is written as [true-or-absent](#pack-intent-toolspack). Earlier
releases wrote all eight pack keys as explicit `true`/`false` on reconcile;
current releases write `true` for installed packs and delete the key otherwise.

Scripts that read `tools.<pack> === false` now read `undefined` for a pack that
is not installed. Test for a truthy value instead. Legacy `false` values that
already exist in a config file are still read (see
[Legacy `false` intent](#legacy-false-intent)) — they are just never written.

### Per-pack install `--json` changed shape

The per-pack subcommands (`oat tools install docs`, `oat tools install
workflows`, and the rest) now emit one multi-scope payload:

```json
{
  "status": "ok",
  "pack": "docs",
  "scopes": ["user"],
  "results": [
    { "request": { "pack": "docs", "scope": "user", "scopeRoot": "/home/you" } }
  ]
}
```

Each `results` entry is a full lifecycle result; only its `request` is shown
above. The previous single-scope payload's `scope`, `targetRoot`, `assetsRoot`,
`selectedSkills`, and `result` fields are **gone**, not renamed. A script
keying on them reads `undefined` rather than failing. Read `scopes` for the
scopes acted on, and `results[].request.scopeRoot` for the target root of each.

### Other behavior changes worth knowing

- `oat tools remove --pack <pack>` deletes every managed asset the release
  manifest declares for that pack and scope, including templates and scripts. It
  previously removed only scanned skills and agents. Project-scope repository
  template overrides and other owner data are still retained and reported.
- A removal that finds no trace of a pack leaves that pack's intent alone, so
  `No tools to remove.` now means no durable state changed either.
- `oat tools info <packname>` exits `0` and prints a pack block. It previously
  reported "not found" and exited 1 for a pack name.
- `oat tools list`, `oat tools outdated`, and `oat tools remove <name>` now see
  user-scope **agents**, not just skills.
- `oat tools has <pack>` is complete-only: a partially installed pack answers
  `false`. The exit code is unchanged at `0`.
- `oat tools has` and `oat tools update --scope all` no longer fail outside a
  Git repository; see [`oat tools has`](#oat-tools-has-pack) and
  [`oat tools update`](#oat-tools-update) for exactly what each reports.

## Legacy commands

### `oat init tools`

The `oat init tools` command remains available for backward compatibility. It has the same install behavior as `oat tools install` but does not include auto-sync — you must run `oat sync --scope ...` manually after install.

### `oat remove`

The `oat remove` command group remains available for backward compatibility. It provides skill removal with dry-run/apply semantics and managed provider-view cleanup.

- `oat remove skill <name>` — remove one installed skill by name
- `oat remove skills --pack <pack>` — remove all installed skills from a bundled pack; pack membership is derived from the same release manifest the `oat tools` commands use

These commands mutate by default; use `--dry-run` to preview deletions.

Related docs:

- Diagnosing pack drift (`oat status`, `oat doctor`): `../reference/troubleshooting.md`
- Bootstrap (`oat init`): `bootstrap.md`
- Provider sync (`oat status`, `oat sync`, `oat providers ...`): `../provider-sync/index.md`
- Diagnostics and local-state commands: `config-and-local-state.md`
