---
title: Providers
description: 'Provider-specific path mappings for Claude, Cursor, Copilot, Gemini, and Codex adapters.'
---

# Providers

## Provider Quick Browse

=== "Claude"

    - Project: `.agents/skills` -> `.claude/skills`, `.agents/agents` -> `.claude/agents`, `.agents/rules` -> `.claude/rules`
    - User: `~/.agents/skills` -> `~/.claude/skills`, `~/.agents/agents` -> `~/.claude/agents`
    - Rule files stay `.md` and are rendered with Claude-compatible frontmatter when needed
    - Managed phase implementers and optional nested workers use the exact configured candidate returned as `providers.claude.dispatchArgs.model`; OAT passes that value as the actual Agent `model`
    - Claude's official subagent contract says existing agent directories are watched and changes load within seconds. It describes a conditional restart for the first agent added to a directory that was absent when the session started, for agents added through `--add-dir`, and when Claude starts with `--disable-slash-commands`. OAT cannot observe those session-start and launch-mode facts. After a successful provider-visible file change, the generic OAT repository policy therefore conservatively advises starting a new provider session; it does not claim that Claude hot-reloaded the file or that the application process must restart. The provider semantics were verified against [Claude Code subagent documentation](https://code.claude.com/docs/en/sub-agents) on 2026-08-31.

=== "Cursor"

    - Project skills are native-read from `.agents/skills`; agents and rules still sync to `.cursor/agents` and `.cursor/rules`
    - User skills are native-read from `~/.agents/skills`; agents still sync to `~/.cursor/agents`
    - `.cursor/skills` and `~/.cursor/skills` remain supported Cursor-only extension and adoption surfaces. OAT does not generate skill views there.
    - Interactive `oat init` and `oat status` ask for an individual disposition for each unresolved Cursor-local skill: adopt it into `.agents/skills` or keep it Cursor-only and remember the exact path in sync config
    - Keep-local is blocked when a canonical skill has the same name because Cursor does not document a safe duplicate-resolution order
    - During upgrades, OAT removes only verified clean legacy managed skill views. Changed or replaced views are preserved, detached from manifest ownership, and offered for migration.
    - Sync materializes pinned Markdown definitions for both `oat-phase-implementer` and `oat-reviewer`. Each generated name keeps the configured flat ladder ID, while an explicit verified mapping writes the separate bracket-form frontmatter model. OAT never derives one form from the other.
    - Generated definitions carry `supported-catalogue`, `project-config`, or `user-config` ownership. Project and supported output lives in the tracked `.cursor/agents` view; user-owned output lives under `~/.cursor/agents`. Cleanup reconciles only the applicable owner.
    - Managed dispatch requires `providers.cursor.dispatchArgs.variant` and launches that exact resolver-selected native agent type first. Skills do not pass a Task-level model argument or normalize Cursor model strings.
    - Cursor may silently fallback when a definition pin cannot be honored. Variant acceptance therefore establishes launcher-owned `configured` provenance only; runtime identity remains `not-reported` unless independently observed.
    - `oat doctor` checks whether each flat ID is still present in the current Cursor catalogue and reports availability drift. Catalogue availability is diagnostic and does not prove that a definition-level bracket pin ran as configured.
    - Rule files render as `.cursor/rules/*.mdc`

=== "Copilot"

    - Project skills are native-read from `.agents/skills`; agents and rules still sync to `.github/agents` and `.github/instructions`
    - User skills are native-read from `~/.agents/skills`; agents still sync to `~/.copilot/agents`
    - `.github/skills` and `~/.copilot/skills` are legacy adoption sources. OAT does not generate skill views there.
    - Interactive `oat init` and `oat status` ask for an individual disposition for each unresolved Copilot-local skill: adopt it into `.agents/skills` or keep it Copilot-only and remember the exact path in sync config
    - Keep-local is blocked when a canonical skill has the same name
    - During upgrades, OAT removes only verified clean legacy managed skill views. Changed or unverifiable views are preserved, detached from manifest ownership, and offered for adoption.
    - Rule files render as `.github/instructions/*.instructions.md`
    - Canonical always-on rules render with `applyTo: "**"` so Copilot activates them repo-wide; provider rules with exactly `applyTo: "**"` adopt back to `activation: always`
    - Comma-containing globs are not supported for Copilot rule sync because Copilot uses a comma-separated `applyTo` field

=== "Gemini"

    - Project: native-read canonical mappings (`.agents/skills` and `.agents/agents`)
    - User: native-read canonical mappings (`~/.agents/skills` and `~/.agents/agents`)
    - Gemini provider sync does not mirror to a provider-specific directory because canonical paths are read directly

=== "Codex"

    - Skills are native-read from `.agents/skills` (no mirrored sync action for skill mappings)
    - Agents are native-read from `.agents/agents` for canonical source-of-truth workflows
    - Canonical markdown agents in `.agents/agents/*.md` are exported to Codex runtime roles:
      - `.codex/agents/<role>.toml`
      - `.codex/config.toml` (`[features] multi_agent = true`, `[agents.<role>]` upserts)
    - Codex role files include OAT managed provenance headers and are regenerated by `oat sync --scope project|user|all`
    - Project sync writes and maintains the version-controlled supported catalogue: Luna and Terra at `low`, `medium`, `high`, and `xhigh`, plus Sol at those efforts and `max`, for both `oat-phase-implementer` and `oat-reviewer` (26 pinned variants). Sync writes files; it does not create a Git commit.
    - Custom targets follow configuration provenance: user-config targets write only under `~/.codex`; shared, repo-local, and active-project targets write under the project's tracked `.codex` view.
    - User sync loads only the bundled canonical `oat-phase-implementer` and `oat-reviewer` definitions needed to expand user-config targets. It does not enable general user-agent mirroring, and it refuses stale user-role cleanup if either managed definition is unavailable.
    - Generated variants carry `supported-catalogue`, `user-config`, or `project-config` ownership. Cleanup removes stale entries only for the owner being reconciled and preserves other scopes plus unrelated Codex entries.
    - All project-generated Codex variants and config registrations are repository-owned, version-controlled output and are never auto-ignored by OAT. User-config output remains under `~/.codex`.
    - A single role can be materialized directly with `oat providers codex materialize <agent-name> --model <model-id> --effort <reasoning-effort>`; `--agent-path` selects a specific canonical markdown agent, `--role-name` overrides the generated role name, and `--scope user` writes a user-config-owned role.
    - Aggregate Codex config drift metadata (`aggregateConfigHash`) is emitted in sync/status codex extension output and intentionally not stored as a separate manifest row
    - Sync-time materialization is best effort; managed workflow correctness uses exact registered roles or a fresh child pinned to the resolved model plus reasoning effort with canonical role instructions. After a successful provider-visible file change, OAT conservatively advises starting a new Codex session so it has an opportunity to load the role. This repository policy is not a Codex hot-reload contract, an application-process restart requirement, or proof that the new session exposed the role.
    - Codex `max` is a first-class dispatch effort. It is present only for the Sol family in the committed supported catalogue, for both implementer and reviewer roles.
    - Codex multi-agent dispatch uses config-defined roles (`[agents.<name>]`) and `agent_type`
    - Codex subagent workflows require `[features] multi_agent = true` in active Codex config layers
    - Default managed Codex execution requires root (depth 0) → phase implementer (depth 1). `agents.max_depth >= 2` enables optional nested phase-agent work; sync and direct materialization still merge that capability floor without lowering a higher target value.
    - Project sync or materialization writes only the project's `.codex/config.toml`; explicit user-scope materialization writes only `~/.codex/config.toml`. Project scope may read the lower-precedence user depth, but never mutates user configuration.
    - Missing depth and explicit depth `1` are sufficient for default phase execution. Invalid values or values below `1` block managed implementation preflight. `oat doctor` explains when depth `2` optional nesting is available.
    - The phase implementer directly executes its planned tasks from one Phase Scope, preserves one bounded commit per task, and returns phase-wide verification. It does not dispatch the phase reviewer.

## Managed dispatch views

Reusable ordered candidate ladders live in `workflow.dispatchCeiling.providers`.
The project or phase named ceiling is only a maximum over those candidates; it
does not select one permanent model family for the project.

Adopt the complete ladder into an explicit owning config scope before sync:

```bash
oat config adopt dispatch-matrix --shared
oat config adopt dispatch-matrix --local
oat config adopt dispatch-matrix --user
```

Project-config candidates materialize into the tracked, version-controlled
project `.codex` and `.cursor` views. User-config candidates materialize under
`~/.codex` and `~/.cursor`. OAT does not auto-ignore project output or create
its Git commit; the team owns that repository change.

At implementation time, the root passes the recorded named maximum through
invocation-only `--ceiling-tier`, resolves one exact candidate per phase, and
dispatches one phase implementer. Codex first attempts the resolver-returned
materialized role as the native `agent_type`. The launcher records the target,
model axis, and effort axis from that resolved payload; child self-report is not
provenance and cannot replace those values.
Only an explicit pre-start native role-selection rejection permits another
target-preserving route. An accepted child, including one that later returns
`BLOCKED` or lacks telemetry, is a task outcome rather than a fallback signal.
Claude binds the exact model argument described above. Cursor launches the
exact native variant. A missing or unselectable managed target blocks rather
than falling back to the root target or a base role.

### Post-launch runtime observation

Runtime observation is a separate, optional layer from the configured
invocation above. It never changes launch, fallback, policy, ceiling, role,
authority, or any selector: it only records what a provider said about its own
child, so a configured selection and an observed identity stay independently
readable.

Codex reports child lineage, role, model, effort, and service tier through its
session and turn metadata. Claude reports model, effort, and service tier from
its on-disk transcript metadata, and lineage only as root-or-child: it emits no
depth field, so a subagent turn is recorded as `depth-unknown` rather than given
an invented depth. Cursor exposes no metadata channel and stays explicitly
`not-reported`.

`not-exposed` is reserved for an axis a provider genuinely does not have. It is
not a stand-in for an axis that simply went unreported on a given run, and it is
never written in place of a value the provider did report.

Observation is metadata-only. Parsers select entries by type and never read
conversation content, and raw provider output is projected through the owning
parser's allowlist before validation, so instruction text, conversation bodies,
and working directories are dropped rather than merely ignored. A missing,
unparseable, or uncorrelated
observation is `not-reported`, never a copy of the requested arguments or the
materialized pin. An observed mismatch is evidence for a human to read; it is
not a fallback trigger and cannot authorize replacement or retry.

## Materialization, refresh, and visibility

OAT reports three separate facts rather than collapsing them into “available”:

1. **Materialization** says whether the canonical asset's provider output was
   changed, current, missing, failed, unsupported, or unknown.
2. **Catalog refresh policy** is provider- and content-specific. A policy is
   `live`, `manual-refresh`, `restart-required`, or `unknown`, with its source
   and verification date.
3. **Runtime visibility** says whether the active provider catalog was actually
   observed. `oat sync`, `oat status`, `oat doctor`, and install-triggered sync
   do not query a running provider session, so they report visibility as
   `not-reported` or `unknown`, never `visible`.

After a successful provider-visible file change, `oat sync` conservatively
advises starting a new provider session so the provider has an opportunity to
load the changed asset. This repository decision was approved on 2026-08-31 and
is recorded in the active project's implementation record. It is safety
guidance, not a provider hot-reload guarantee, an instruction to restart the
application process, or proof that the new session loaded or exposed the asset.
The compatibility schema reports this session boundary as `restart-required`;
with `repository-decision` provenance, that state means “start a new provider
session,” not “restart the application.”
No advice is emitted for current/no-op, planned-only, failed, missing, inactive,
or unsupported materialization.

A truthful provider/content-specific policy takes precedence over this generic
repository decision. Claude's documented behavior remains conditional on
session-start and launch-mode facts that OAT cannot observe, so OAT does not
claim those conditions were met; the conservative new-session advice still
applies after a successful file change. Unsupported capabilities retain an
`unknown` policy rather than inheriting advice. A current file with no
current-session catalog probe is still not proof of provider visibility.

## Scope rules

- Project scope: skills + agents + rules
- User scope: skills plus capability-supported ordinary agents (provider mappings vary by adapter)
- The two bundled managed roles separately participate in Codex and Cursor extension expansion for user-owned targets
- Rules are project-scoped only in this release
- Codex user-scope sync materializes user-config custom roles under `~/.codex`; project-config and supported-catalogue output remains project-scoped and version controlled
- Cursor user-scope sync materializes user-config variants under `~/.cursor/agents`; project-config and supported-catalogue output remains project-scoped and version controlled

## Adoption model

- Stray adoption is available in `oat init` and `oat status`.
- Adoption reconciles canonical plus the adopted provider first.
- Native-read Cursor skill adoption moves the provider-local skill into `.agents/skills` without recreating a `.cursor/skills` view or manifest entry.
- Choosing Keep Cursor-only leaves the skill in place and records its exact normalized path in the project or user sync config.
- Native-read Copilot skill adoption moves a legacy provider-local skill into the matching canonical `.agents/skills` directory without recreating a `.github/skills` or `~/.copilot/skills` view or manifest entry.
- Choosing Keep Copilot-only leaves the skill in place and records its exact normalized path in the project or user sync config.
- Rule adoption normalizes provider filenames back to canonical `.agents/rules/*.md` entries before cross-provider fanout.
- Cross-provider fanout is explicit via `oat sync --scope all`.

## Provider mutation safety

The generic sync engine validates provider destinations for every operation that
creates or updates a symlink, creates or updates a copy, or removes a managed
provider path. The same guard applies across provider adapters; it is not
Claude-specific.

Validation runs at three boundaries:

1. During planning, before a provider operation is classified.
2. Across the complete mutating plan before apply starts, so an already-unsafe
   later entry cannot allow earlier provider or manifest mutations.
3. Immediately before each entry's first filesystem mutation, so ancestry that
   changes after preflight fails closed.

A mutation is refused when its destination escapes the sync scope, equals the
scope root, or has any existing parent that is a symbolic link or not a
directory. The final managed destination is excluded from the ancestry walk, so
an existing managed symlink can still be updated or removed normally.

Whole-plan preflight refusal leaves provider paths, canonical content, external
symlink targets, and manifest state unchanged. If ancestry changes after
preflight, the affected entry fails before its first removal or write and does
not gain manifest ownership. OAT does not traverse, unlink, or rewrite the
unsafe parent.

## Reference artifacts

- `.oat/projects/<scope>/<project>/spec.md` (FR5)
- `packages/cli/src/providers/**`
- `packages/cli/src/providers/shared/adapter.utils.ts`
