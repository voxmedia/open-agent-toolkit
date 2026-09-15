---
name: oat-doctor
description: Use when you want to check the health of your OAT setup in one place — config, project management (PJM), agent instructions, docs, and installed tools — and then work through what it finds. Sweeps read-only, reports by area, and dives into an area on request, teaching from the bundled docs and offering exact fix commands.
argument-hint: '[--summary]'
disable-model-invocation: true
user-invocable: true
allowed-tools: Read, Bash, Glob, Grep, AskUserQuestion
metadata:
  version: 2.0.0
---

# OAT Doctor

One place to look at everything OAT knows about this checkout and this user. A run has three stages: a read-only **sweep** over five areas, a grouped **report**, and a **dive** into any area the person picks. Dives teach from the bundled docs and offer fixes; they do not apply them.

## Prerequisites

- OAT CLI installed and available as `oat` in PATH.
- At least one `oat init` has been run (project or user level). When nothing is initialized, the sweep still runs: every area then offers its bootstrap.

## Mode Assertion

**OAT MODE: Doctor (Diagnostic)**

**Purpose:** Inspect OAT setup, explain what it finds, and offer the exact fix. The sweep and the dives never write.

**BLOCKED Activities:**

- No editing configuration files, skills, templates, instruction files, PJM files, or docs.
- No creating, modifying, or deleting any file.
- No running any mutating command, with exactly one carve-out below.

**The one carve-out:** after a dive has named a fix as one of `oat config set`, `oat config unset`, `oat config adopt`, `oat pjm init`, `oat instructions sync`, `oat tools update`, or `oat tools install`, and the person has approved that exact command, run it once and report the result. Nothing else is ever run; a hand-off to another skill (`oat-docs-bootstrap`, `oat-agent-instructions-analyze`, `oat-agent-instructions-apply`, `oat-pjm-*`) is an invocation the person starts.

**ALLOWED Activities:**

- Running `oat` CLI commands with `--json` for read-only data gathering, projected to the fields named below.
- Reading files to inspect state, and reading `~/.oat/docs/` to explain it.
- Presenting findings, explanations, and recommendations.

**Self-Correction Protocol:**
If you catch yourself:

- About to run a mutating command that is not the one approved carve-out → STOP and present it as a recommendation instead.
- Editing a file to fix a problem → STOP and tell the person the fix command or the owning skill.
- Explaining a config key from memory → STOP and read the `describe` entry and the docs section named for its group.

**Recovery:**

1. Return to read-only diagnostic mode.
2. Present the needed fix as an actionable recommendation.

## Progress Indicators (User-Facing)

Print a phase banner once at start:

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
OAT ▸ DOCTOR
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

- `[1/3] Sweeping config, PJM, agent instructions, docs, and tools…`
- `[2/3] Reporting findings…`
- `[3/3] Diving into {area}…` (once per dive)

Summary mode (`--summary`) prints `[1/2] Gathering installed tools…` and `[2/2] Building dashboard…` instead.

## Process

### Step 0: Determine Mode

Read `$ARGUMENTS`:

- `--summary` → **summary mode** (Step 4 only).
- Otherwise → **sweep mode** (Steps 1–3).

Report-only rule: when `OAT_NON_INTERACTIVE=1` is set, or no user-response channel exists, the run ends after Step 2's report. Never prompt in that case, and never run a fix.

### Step 1: Sweep

Run the seven commands below and the four file checks. Every command call is projected to the fields named here with `node -e` (or `jq` when present); never print or read a raw payload — `oat doctor --json` is about 410 KB and `oat tools list --json` about 626 KB on a mid-sized repository, and neither fits a working context.

A command has **failed** only when its stdout does not parse as JSON, or the process is killed or times out. A non-zero exit with parseable JSON is a findings result: `oat doctor` and `oat pjm doctor` both exit 1 whenever any check warns, which is the normal state of a healthy repository. A failed command becomes one `warning` finding for its area whose summary names the command and quotes the first line of stderr; the sweep continues.

| #   | Command                                 | Projection                                                                               | Feeds                                        |
| --- | --------------------------------------- | ---------------------------------------------------------------------------------------- | -------------------------------------------- |
| 1   | `oat doctor --json --scope all`         | `.checks[] \| {name, status, message}` — drop `packEvidence` and `providerRefreshAdvice` | config, tools, docs (by the check map below) |
| 2   | `oat pjm doctor --json`                 | `.adoption` and `.checks[] \| {name, status, message}`                                   | PJM                                          |
| 3   | `oat config dump --json`                | `.shared`, `.local`, `.user` (the three surface objects)                                 | config, docs                                 |
| 4   | `oat config describe --json`            | `.entries[] \| {key, group, file, scope, defaultValue, owningCommand, deprecated}`       | config                                       |
| 5   | `oat instructions validate --json`      | `.summary` and `.entries[] \| select(.status != "ok") \| {agentsPath, status, detail}`   | agent instructions                           |
| 6   | `oat tools list --json --scope all`     | `.tools[] \| {name, pack, scope, status}`                                                | tools                                        |
| 7   | `oat tools outdated --json --scope all` | `.tools[] \| {name, version, bundledVersion, scope}`                                     | tools                                        |

File checks (read-only):

- **Root instructions headings.** Read `AGENTS.md` at the repository root (and `CLAUDE.md` when it is a file rather than a pointer). Note which of these headings are present: `## Tool Packs` (written by `oat tools install --project-guidance`), `### Project Management` and `### Decision Records` (written by `oat pjm init`), `## Documentation` (written by `oat docs init` / `oat-docs-bootstrap`).
- **Sync config surfaces.** Read `.oat/sync/config.json` and `~/.oat/sync/config.json` when present, keys only. `oat config dump` does not carry the `Sync/Provider` and `User Sync` groups, so this is their only set-state source.
- **Docs surface.** Detect an existing docs surface the way `oat-docs-bootstrap`'s preflight does: `documentation.root` in the dump; a docs app under `apps/docs` or `apps/*-docs`, or any `apps/*` with a `source.config.*`, a `next.config.*` beside a `docs/` directory, or `mkdocs.yml`; a root `mkdocs.yml`; a root `docs/` or `documentation/` directory.
- **`documentation.root` on disk.** When the dump sets it, check that the directory exists.

#### Finding rules

Each finding is one line with an **area**, a **severity**, a one-line **summary**, its **evidence** (a check name, a key and its surface, or a file path), and a **fix path** (an exact command, an owning skill, or none). Severities:

- `error` — a lifecycle skill would fail or write to the wrong place.
- `warning` — drift the person should fix soon.
- `info` — a teaching opportunity or a fact with no fix path.

**Config**

- `activeProject` or `lastPausedProject` set to a path that does not exist → `error`; fix `oat config set activeProject ''` / `oat config set lastPausedProject ''` (the CLI refuses `unset` for these two lifecycle keys). `activeIdea` set to a missing path → `error`; fix `oat config unset activeIdea --local` (or `--user` for a user-level value).
- A set key whose `describe` entry carries `deprecated` → `warning`; summary names the key and its `deprecated.supersededBy`; when `deprecated.legacyValues` is present the finding fires only when the set value is one of those values; fix = the entry's `owningCommand` for the successor.
- A key set on a surface that is not one of the surfaces its `describe` entry's `file` names → `warning`; fix `oat config unset <key> --<surface>` then `oat config set <key> <value> --<right surface>`.
- The `dispatch-matrix` recommendation is reported only through the `project:dispatch_matrix` check (command 1, config area); there is no separate rule for it, so one gap is one finding. Its fix is `oat config adopt dispatch-matrix --shared`, and the config dive explains it from `workflow.dispatchCeiling.recommendationVersion` in the dump.
- A documented key group with nothing set on any surface → one `info` per group, expanded only in the dive.
- Synced project health: `project:synced_tracked_artifacts`, `project:synced_gitignore`, `project:synced_projects`, `project:synced_editor_hint`, and per-project `project:synced_<slug>_<kind>` checks from command 1 → severity from status, summary from the message; report them without treating an absent checkout as proof that no synced project exists (an absent checkout is materialized by `oat project pull`, which the check's message names).

**PJM**

- `adoption.state` `none` → `error` (PJM not adopted; fix `oat pjm init`); `partial-initialization` → `error` (declared but canonical files missing; fix `oat pjm init`, which completes the layout); `inferred-legacy` → `warning` (a pre-adoption layout the CLI recognizes; fix `oat pjm init` to declare it); `declared` is healthy.
- Any other `pjm:*` check with status `fail` → `error`; `warn` → `warning`; the fix path is the one the check's message implies (see the PJM dive for the map). `pjm:adoption` is excluded here: the `adoption.state` rule above owns adoption, so it is one finding with one severity.
- A `pjm:*` check name the PJM dive does not know → `info` with its message.

**Agent instructions**

- An entry with status `missing` or `content_mismatch` (the entry literal; the summary counter is spelled `contentMismatch`) → `error`; fix `oat instructions sync` (`--force` for a content mismatch the person confirms is stale).
- An entry with status `stray` → `warning`; fix `oat instructions sync` after the person decides whether the stray file should exist.
- A CLI-written heading absent while its capability is present → `warning`: no `## Tool Packs` while any pack is installed at project scope (fix `oat tools install <pack> --project-guidance`); no `### Project Management` or `### Decision Records` while PJM adoption is `declared` (fix `oat pjm init`, which rewrites the guidance); no `## Documentation` while a docs surface exists (fix: `oat-docs-bootstrap`).
- Content quality beyond presence is not judged here; route to `oat-agent-instructions-analyze`.

**Docs**

- A docs surface detected with no `documentation` config → `warning`; fix: run `oat-docs-bootstrap`, which detects the existing surface and offers the audit.
- `documentation.root` set but absent on disk → `error`; fix `oat config unset documentation.root --shared` or `oat-docs-bootstrap`.
- No docs surface and no `documentation` config (an uninitialized or docs-less repository) → `info`; fix: run `oat-docs-bootstrap` to set one up. This is what makes an empty repository offer its docs bootstrap alongside the other areas.

**Tools**

- An outdated tool → `warning`; fix `oat tools update <name> --scope <scope>` (or `oat tools update --scope <scope>` for all).
- The same pack installed at both scopes → `warning`; fix `oat tools migrate --pack <pack> --from project --to user` (or the reverse).
- A pack enabled under `tools.*` in the dump but with no installed skill → `warning`; fix `oat tools install <pack>`.

**`oat doctor` checks** (command 1). Any check with status `fail` or `warn` becomes a finding, severity from status, evidence = the check name, summary = its message, by this map (a semantic map, not a prefix rule):

| Check names                                                                                                                                                                                                                                                         | Area                                                                             |
| ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------- |
| `project:dispatch_matrix`, `project:synced_*`                                                                                                                                                                                                                       | config                                                                           |
| `project:manifest`, `project:providers`, `project:symlink_support`, `project:canonical_directories`, `project:codex_*`, `project:skill_versions`, `project:cursor_materialized_models`, and their `user:` twins; `project:pack_state`, `user:pack_state`, `packs:*` | tools                                                                            |
| `project:stale_invocations`                                                                                                                                                                                                                                         | docs (it cites doc and script file:line)                                         |
| `pjm:*`                                                                                                                                                                                                                                                             | suppressed — `oat pjm doctor` reports the same checks and the PJM area owns them |
| any other name                                                                                                                                                                                                                                                      | `info` in tools, with the message                                                |

### Step 2: Report

Print the findings grouped by area in this order: config, PJM, agent instructions, docs, tools. Within an area, errors first, then warnings. Print `info` findings as one count per area; they expand only in a dive. An area with no findings prints `(ok)`.

```text
OAT ▸ DOCTOR
Config (1 error, 1 warning, 4 info)
  ✖ activeProject points at .oat/projects/shared/x, which does not exist   [config.local]
    → oat config set activeProject ''
  ⚠ workflow.postImplementSequence uses the legacy value "docs-pr"         [shared]
    → prefer the structured form: oat config describe workflow.postImplementSequence
PJM (ok)
Agent instructions (1 warning)
  ⚠ AGENTS.md has no "### Project Management" section although PJM is adopted   [AGENTS.md]
    → oat pjm init   (or: run oat-agent-instructions-analyze)
Docs (1 warning)
  ⚠ docs/ exists but .oat/config.json has no documentation section          [docs/]
    → run oat-docs-bootstrap; it detects the surface and offers the audit
Tools (ok)
```

When every area is `(ok)` and no `info` exists, print `Your OAT setup looks good. No issues found.` and stop.

Under the report-only rule, stop here. Otherwise ask, with `AskUserQuestion`, which area to dive into: offer each area that has findings (errors, warnings, or info), plus `all` and `done`. Repeat after each dive until the person picks `done`.

### Step 3: Dives

Every dive has the same shape:

1. **Restate** the area's findings with their evidence, expanding the `info` lines.
2. **Teach** from the bundled docs and, for config, from the `describe` entries: name the page and section, read it at run time, and explain in two or three sentences what the thing does, when the person would want it, and which surface owns it. Quote nothing from memory. When `~/.oat/docs/` is absent, say so and offer `oat tools install core`; do not invent an explanation.
3. **Answer** the person's questions from the same sources.
4. **Offer** each fix as the exact command (the `describe` entry's `owningCommand` for config keys) or the owning skill, then stop. If the person approves a listed carve-out command, run that one command and report the result; otherwise the person runs it.

Docs citations below name a page under `~/.oat/docs/` (the same tree as `apps/oat-docs/docs/`) and a `##` heading; a citation must be a prefix of the real heading.

#### Config dive

Walk every distinct `group` value in the `describe` output — nine today, including `PJM Remote Shared Policy`, `Explainer Defaults (local > shared)`, and `User Sync (~/.oat/sync/config.json)`; never a hard-coded list. For each group, say what is set (from the dump or the sync files), what is deprecated, and what is unset; for an unset group, teach it from the entry descriptions and its docs section:

| Group                                                              | Docs section                                                                    |
| ------------------------------------------------------------------ | ------------------------------------------------------------------------------- |
| The five surfaces themselves (which file owns what)                | `cli-utilities/configuration.md` § The five config surfaces                     |
| `Shared Repo (.oat/config.json)`                                   | `cli-utilities/configuration.md` § Shared repo config you will touch most often |
| `Repo Local (.oat/config.local.json)`, `User (~/.oat/config.json)` | `cli-utilities/configuration.md` § Repo-local and user state                    |
| `Workflow Preferences` (dispatch policy keys)                      | `cli-utilities/configuration.md` § Dispatch policy resolution                   |
| `Workflow Preferences` (everything else)                           | `cli-utilities/configuration.md` § Workflow preferences                         |
| `Workflow Preferences` (gate keys)                                 | `cli-utilities/workflow-gates.md` § Gate config                                 |
| `Sync/Provider`, `User Sync`                                       | `cli-utilities/configuration.md` § Provider sync config is different            |
| `PJM Remote Shared Policy`                                         | `cli-utilities/remote-project-management.md`                                    |
| the `pjm.*` keys under Shared Repo                                 | `cli-utilities/backlog-lifecycle.md` § Adoption comes first                     |
| `Explainer Defaults`                                               | the entry descriptions (`oat config describe explainers.defaults.style`)        |

A deprecated key is explained through its `deprecated.supersededBy` and the successor's `owningCommand`.

#### PJM dive

State the adoption state (`declared`, `inferred-legacy`, `partial-initialization`, or `none`) and what it means (`cli-utilities/backlog-lifecycle.md` § Adoption comes first). Then each non-passing check and its fix:

| Check                                                                                                                                                                                                                                         | Fix path                                                                                                                                                                         |
| --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `pjm:adoption`                                                                                                                                                                                                                                | not reported separately: the `adoption.state` rule owns it; fix `oat pjm init`                                                                                                   |
| `pjm:canonical_files`, `pjm:template_frontmatter`, `pjm:top_level_layout`                                                                                                                                                                     | `oat pjm init` re-creates canonical files; unknown top-level folders are the person's to move (`cli-utilities/backlog-lifecycle.md` § Catching lifecycle drift)                  |
| `pjm:legacy_monoliths`, `pjm:loose_reference_files`, `pjm:second_roadmap`                                                                                                                                                                     | structural drift: `cli-utilities/backlog-lifecycle.md` § Catching lifecycle drift and the migration guidance it links; `oat-pjm-update-repo-reference` for the reference records |
| `pjm:backlog_terminal_in_items`, `pjm:backlog_completed_unarchived`                                                                                                                                                                           | `oat backlog archive <id>` for each named item, then `oat backlog regenerate-index`                                                                                              |
| `pjm:backlog_invalid_status`, `pjm:backlog_archived_open`, `pjm:backlog_duplicate_id`                                                                                                                                                         | edit the named item's frontmatter (the person), then `oat backlog regenerate-index`                                                                                              |
| `pjm:remote_schema`, `pjm:remote_binding_ids`, `pjm:remote_metadata_state`, `pjm:remote_storage_content`, `pjm:remote_policy`, `pjm:remote_concurrent_intents`, `pjm:remote_operations`, `pjm:remote_retention`, `pjm:remote_host_capability` | emitted only when a remote binding is adopted: `oat-pjm-remote` (reconcile or refresh) and `cli-utilities/remote-project-management.md`                                          |
| any other `pjm:*` name                                                                                                                                                                                                                        | `info` with the check's message; no fix path is invented                                                                                                                         |

#### Agent instructions dive

Explain the sync strategy in use (`oat instructions validate --json` `.summary`) and each non-`ok` entry with its path. Explain each missing heading: what the CLI writes there and why an agent needs it (`cli-utilities/bootstrap.md` for `## Tool Packs`; `cli-utilities/backlog-lifecycle.md` § Adoption comes first for the PJM sections). Offer `oat instructions sync`, `oat tools install <pack> --project-guidance`, or `oat pjm init` as the finding names; for wording and coverage beyond presence, hand off to `oat-agent-instructions-analyze` then `oat-agent-instructions-apply`.

#### Docs dive

Say what surface was detected and what `documentation.*` says. This dive owns no docs logic: hand off to `oat-docs-bootstrap`, which detects the existing surface and offers the audit (`oat-docs-analyze` then `oat-docs-apply`), or `oat config unset documentation.root --shared` when the root is gone.

#### Tools dive

List outdated tools with installed and bundled versions and scope, packs at both scopes, and packs enabled but not installed, each with its command. Explain scopes from `cli-utilities/tool-packs.md`.

### Step 4: Summary Mode (`--summary`)

Keep the dashboard. Gather `oat tools list --json --scope all` (projected to `{name, pack, scope, status}`) and `oat tools outdated --json --scope all`, group the tools by `pack`, and print:

```text
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
OAT ▸ DOCTOR SUMMARY
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

## Installed Packs

| Pack      | Scope   | Skills | Status   |
| --------- | ------- | ------ | -------- |
| core      | user    | 2      | current  |
| workflows | project | 40     | outdated |

## Outdated Skills

| Skill                 | Installed | Available | Scope   |
| --------------------- | --------- | --------- | ------- |
| oat-project-implement | 1.1.0     | 1.2.0     | project |

## Recommendations

- Run `oat tools update --scope {scope}` to update outdated skills.
- Run `oat-doctor` (no arguments) for the config, PJM, instructions, and docs sweep.
```

The pack list comes from the `pack` field of `oat tools list`; the skill carries no pack manifest. Omit empty sections.

## Success Criteria

- ✅ The sweep runs all seven commands and four file checks, projected, and never aborts on a non-zero exit with parseable JSON.
- ✅ The report groups findings by area and severity, folds `info` into counts, and ends with the area prompt (or ends at the report under the report-only rule).
- ✅ Every dive explains from the bundled docs and `describe` entries, names a fix path per finding, and applies nothing except one approved carve-out command.
- ✅ Every `pjm:*` check the CLI defines has a fix path or the generic `info` rule.
- ✅ Summary mode still prints the dashboard from live `oat tools list` output.
- ✅ No file is modified by the sweep, the report, or a dive.
