---
title: Config and Local State
description: Utility command groups for config discovery, backlog helpers, local paths, instruction integrity, and diagnostics.
---

# Config and Local State

This page covers the general-purpose OAT command groups that support configuration discovery, local-only state, backlog maintenance, instruction integrity, and diagnostics.

Use these commands when you need operational support around the toolkit rather than one of the deeper product lanes.

## `oat backlog ...`

Use the `oat backlog` group when you want direct CLI support for the file-backed backlog under `.oat/repo/pjm/backlog/`.

- `oat backlog init` - scaffold `.oat/repo/pjm/backlog/` with starter files and directories for a fresh repo
- `oat backlog new <title>` - validate and create a file-backed backlog item from the canonical template, then regenerate the managed index
- `oat backlog generate-id <title>` - generate a deterministic `BL-YYMMDD-slug` backlog ID from a title
- `oat backlog generate-id <title> --created-at <timestamp>` - generate a reproducible ID for a known creation timestamp
- `oat backlog archive <id>` - atomic close-out: set a terminal status, record the completion in `completed.md`, move the item into `archived/`, and regenerate the index in one step
- `oat backlog regenerate-index` - rebuild the managed backlog index table from item frontmatter

Backlog IDs are deterministic date+slug identifiers (`BL-YYMMDD-slug`) derived from the creation date and title, so two machines or worktrees produce the same ID for the same record without scanning the local checkout. The slug is capped at 30 characters at the last whole-word boundary (with trailing stop-words trimmed), so prefer concise, meaningful titles. Index regeneration is deterministic and safe to re-run when resolving an index merge conflict.

Run `oat backlog init` directly when you need to create or repair only the backlog scaffold. `oat backlog new` initializes a missing scaffold automatically after validating its inputs. This command group is primarily used by the `oat-pjm-*` project-management skills, but it is also available directly when you need to inspect or repair backlog metadata by hand.

For the end-to-end states an item moves through — and how `oat backlog archive` and `oat pjm doctor` keep the backlog honest — see [Backlog Lifecycle](backlog-lifecycle.md).

### `oat backlog new`

`oat backlog new <title> [--priority <priority>] [--scope <scope>] [--scope-estimate <size>] [--labels <labels>] [--description <text>] [--backlog-root <path>]` creates one active item and refreshes the managed backlog index.

Defaults are `priority: medium` and `scope: task`. Valid priorities are `urgent`, `high`, `medium`, `low`, and `none`; valid scopes are `idea`, `task`, `feature`, and `initiative`; scope estimates accept `XS`, `S`, `M`, `L`, `XL`, or `XXL`. Pass labels as a comma-delimited list.

The command validates all inputs before creating the scaffold or writing an item. It uses the repo-local canonical backlog template when available, falls back to the CLI's bundled template, writes structured YAML frontmatter, and rejects an ID collision in either `items/` or `archived/` without overwriting the existing record. If managed-index regeneration fails after the item write, OAT removes only the new item and restores the prior index.

### `oat backlog archive`

`oat backlog archive <id> [--wont-do] [--summary <text>] [--json] [--backlog-root <path>]` performs the full close-out for a backlog item so status flip, completed-log entry, file move, and index regeneration never drift apart.

**Arguments and flags:**

- `<id>` (required) - the backlog item id (`BL-YYMMDD-slug`); the item file must live under `items/`.
- `--wont-do` - close the item as `wont_do` instead of the default terminal status `closed`.
- `--summary <text>` - one-line outcome summary recorded in `completed.md`; required and nonblank for the default `closed` path.
- `--backlog-root <path>` - override the backlog root (defaults to `.oat/repo/pjm/backlog`).
- `--json` - emit the machine-readable result payload instead of human log lines.

**Behavior:**

- Validates the item's current `status` against the enum (`open | in_progress | closed | wont_do`); an out-of-enum value such as `done` is a hard error with a fix hint. Archiving is legal from any valid status — a `closed` item still in `items/` just gets its move finished.
- For the default `closed` path, validates and trims a nonblank `--summary` before any file or index mutation. The `wont_do` path may omit the summary and completion-ledger entry.
- Rewrites only the `status:` and `updated:` frontmatter lines (preserving any inline enum comment), then moves the item from `items/` to `archived/` with `git mv` inside a work tree, falling back to a plain rename (with a warning) outside git or if `git mv` fails.
- `closed` archives append a canonical newest-first `completed.md` entry (`YYYY-MM-DD — <id> — Title — summary`). `wont_do` archives append an entry only when `--summary` is provided. A missing `completed.md` is scaffolded from the starter template; a missing `## Completed Items` heading is scaffolded with a warning.
- Regenerates the managed backlog index after the move.
- Idempotent: re-running on an item already in `archived/` is a no-op warning with no writes.

**Exit codes:**

- `0` - item archived, or already-archived no-op.
- `1` - actionable error: unknown id, out-of-enum current status, duplicate active/archived ID, or a missing closed-item summary. The message includes the recovery action.
- `2` - reserved for unexpected system/runtime failures.

**JSON payload (`--json`):**

On success the payload is the archive result object:

```json
{
  "id": "BL-260705-example",
  "result": "archived",
  "status": "closed",
  "completedEntry": "written",
  "movedTo": ".oat/repo/pjm/backlog/archived/BL-260705-example.md",
  "indexRegenerated": true,
  "warnings": []
}
```

`result` is `archived` or `noop` (already archived); `completedEntry` is `written`, `scaffolded`, or `skipped` (e.g. a `wont_do` archive without `--summary`); `movedTo` is the destination path or `null`. On an actionable failure the payload is `{ "result": "error", "id": "<id>", "message": "<why + fix>" }`.

For full project-management repo-reference setup, use [`oat pjm init`](tool-packs.md#install-vs-initialize). It scaffolds the two-layer PJM surface (`pjm/current-state.md`, `pjm/roadmap.md`, `reference/decisions/`, and AGENTS guides) and delegates the backlog sub-surface to `oat backlog init`.

## `oat decision ...`

Use the `oat decision` group for file-per-record decisions under `.oat/repo/reference/decisions/`. Each decision is its own file with a deterministic `DR-YYMMDD-slug` ID (the slug is capped at 30 characters at the last whole-word boundary, with trailing stop-words trimmed), and the human-facing index is a committed generated view.

- `oat decision init` - scaffold `.oat/repo/reference/decisions/`, the managed decision index, decision-scoped `AGENTS.md` guidance, and an idempotent `OAT decisions` section in the repository-root `AGENTS.md`
- `oat decision new <title>` - create a new decision record; supports `--status`, `--context`, `--decision`, `--consequences`, and `--created-at`
- `oat decision regenerate-index` - rebuild the managed decision index table from record frontmatter
- `oat decision migrate` - convert a legacy single `decision-record.md` into file-per-record decisions, preserving each old `ADR-NNN`/`DR-NNN` ID as `legacy_id`; applies by default, so pass `--dry-run` to preview the legacy-to-new mappings without writing, and `--delete-legacy` to remove the source file after a verified migration (unlike `oat pjm migrate`, which defaults to dry-run)

Pass `--context`, `--decision`, and `--consequences` together when creating a resolved decision so every substantive template section is complete in the same atomic creation step. Callers that omit them retain the template's placeholder content for later editing.

The decision index uses managed marker pairs and is deterministic, so an index merge conflict can be resolved by re-running `oat decision regenerate-index` and staging the result. Decision records replace the legacy single `decision-record.md`; repos still on the old layout migrate with `oat decision migrate` (or the broader `oat pjm migrate`).

`oat decision init` is the lightweight standalone setup path. It does not require the `project-management` tool pack and does not create current state, roadmap, or backlog artifacts. Its AGENTS guidance uses `oat decision` directly while also recognizing `oat-pjm-decision` when that optional skill is installed later.

## `oat local ...`

`oat local` manages local-only, gitignored paths that still need to follow you between the main repo and worktrees.

Common examples:

- `.oat/ideas/`
- `.oat/**/reviews/archived/`

Available commands:

- `oat local status` - show whether configured local paths exist and are gitignored
- `oat local apply` - write the managed `.gitignore` section for configured paths
- `oat local sync` - copy local paths between the main repo and a worktree
- `oat local add` / `oat local remove` - maintain the `localPaths` config entries

Use this when you want archived review history or idea scratchpads to persist locally without being committed.

## `oat config ...`

Use `oat config` for repo runtime config inspection and supported key mutation.

- `oat config get <key>` - read one resolved config value
- `oat config set <key> <value>` - update a supported shared or repo-local key
- `oat config list` - show the resolved command-surface values with source information
- `oat config dump --json` - emit the full merged config payload with per-key source attribution, suitable for automation and debugging
- `oat config describe` - list supported config surfaces and keys across shared repo, repo-local, user, and sync/provider config
- `oat config describe <key>` - show file location, scope, default, mutability, and owning command for one key

Use `oat config dump --json` when you need the whole resolved config in one machine-readable response rather than a single key or a human-oriented list view.

### Update notifications

OAT can passively report when npm's stable `latest` CLI version is newer during an ordinary interactive command run. The cache normally limits checks to once every 24 hours and same-version notices to once every 72 hours; overlapping CLI processes can each perform a check or print a notice. Ordinary eligible commands only show update guidance and do not prompt.

Before eligible interactive `oat init`, `oat tools install`, or `oat tools update` mutations, a known newer stable CLI receives special handling. These commands copy tool versions bundled with the running CLI, so OAT warns that the older CLI can only install its own bundle and that the available CLI may contain newer bundled tools. The default-no prompt offers to install the exact validated version with:

```bash
npm install --global @open-agent-toolkit/cli@<validated-version>
```

If accepted, OAT updates the CLI package, stops before changing tools, and asks you to rerun the original command under the new CLI. If declined or the prompt is aborted, OAT warns and continues with the current bundle. If npm fails, the requested tool mutation does not run and the error includes a command to retry. The warning describes possible bundle freshness; it does not claim that tools installed by the current CLI are incompatible with that CLI.

Checks, notices, and the update offer are skipped for JSON, non-interactive, CI, test, source-development, and ephemeral package-runner invocations. Guarded dry-run commands also skip the prompt and installer. Set `NO_UPDATE_NOTIFIER` to a truthy value (for example, `1`, `true`, `yes`, or `on`) to suppress checks for one process; empty, `0`, and `false` do not suppress them. Or disable checks persistently in user config:

```bash
oat config set updateNotifications false --user
```

The preference defaults to `true`; run the same command with `true` to re-enable it. Cached check and notice timestamps live in `~/.oat/update-check.json`, separate from the user-authored preference in `~/.oat/config.json`.

Dispatch policy keys are part of this surface, but provider-specific generation
still belongs to provider commands. Use `oat config describe
workflow.dispatchPolicy.policy` to inspect capped managed, managed uncapped,
inherit/default, and unresolved behavior; use `oat providers codex materialize`
or `oat sync --scope project` to create materialized Codex roles from explicit
model+effort targets.

Archive lifecycle settings live here as shared repo config:

- `archive.s3Uri`
- `archive.s3SyncOnComplete`
- `archive.summaryExportPath`
- `archive.wrapUpExportPath`
- `archive.awsProfile`
- `archive.awsRegion`

`archive.awsProfile` and `archive.awsRegion` are forwarded as `AWS_PROFILE` / `AWS_REGION` env vars into every `aws` spawn that runs during `oat-project-complete` and `oat repo archive sync`, and they override any values already set in the parent shell — the repo's archive-scoped declaration wins so users don't have to remember to unset `AWS_PROFILE` per shell. The per-invocation `oat repo archive sync --profile <profile>` and `--region <region>` flags then override the config for a single run, giving precedence `flag > config > shell env`. When neither flag nor config is set, the parent shell's `AWS_PROFILE` / `AWS_REGION` pass through unchanged. Raw access keys (`AWS_ACCESS_KEY_ID` / `AWS_SECRET_ACCESS_KEY`) remain a shell-environment concern — there is no config plumbing for them.

Tool-pack installation state also lives here as shared repo config:

- `tools.core`
- `tools.brainstorm`
- `tools.docs`
- `tools.ideas`
- `tools.project-management`
- `tools.research`
- `tools.utility`
- `tools.workflows`

This complete eight-pack map is the shared project installation snapshot.
Lifecycle reconciliation derives it only from project-scoped canonical assets;
user-only packs do not set these keys. Use `oat config get tools.<pack>` to
inspect repository installation state.

For workflow routing or troubleshooting that needs current effective
availability, run `oat tools has <pack>`. It checks project plus user scope by
default; use `--scope project` or `--scope user` to isolate one scope. The
global `--json` flag returns the matching scopes with the boolean result.

PJM diagnostics intentionally use project configuration where repository setup
is the question. Disabled or unset repos report PJM as skipped instead of
treating absent `.oat/repo/pjm/` files as drift.

Workflow automation preferences are also visible through `oat config` and can be set at local, shared, or user scope. Notable review-loop keys:

- `workflow.autoArtifactReview.plan` - default-on bounded artifact review for generated `plan.md` files before implementation handoff
- `workflow.autoArtifactReview.analysis` - default-on bounded accuracy review for generated docs and agent-instructions analysis artifacts before apply workflows consume them

Use `oat config describe workflow.autoArtifactReview.plan` or `oat config describe workflow.autoArtifactReview.analysis` to inspect precedence, defaults, and writable surfaces. Set either key to `false` only when you intentionally want to bypass that generated-artifact review loop:

```bash
oat config set workflow.autoArtifactReview.plan false --shared
oat config set workflow.autoArtifactReview.analysis false --local
```

When archive settings are configured, completion uploads dated archive snapshots to S3, exports dated summary snapshots into the configured summary reference directory, and lets `oat-wrap-up` write tracked wrap-up reports into the configured wrap-up directory.

## `oat gate ...`

Use `oat gate` when a gate-aware skill should run a configured final command
before it is considered done.

Available commands:

- `oat gate resolve <skill>` - inspect the resolved gate config for one skill
- `oat gate set <skill>` / `oat gate unset <skill>` - write or clear a skill gate
- `oat gate target set <id>` / `oat gate target unset <id>` - write or clear an exec target
- `oat gate review <prompt...>` - run a review-specific gate and map blocking review findings to exit status
- `oat gate cross-provider-exec <prompt...>` - select an available exec target and run the prompt there

Use `oat gate review` for OAT review gates. It keeps the normal stateful
review-provider workflow: the review artifact, Reviews row update, and review
bookkeeping commits are expected, and the produced review must be received with
`oat-project-review-receive` before the host treats it as dispositioned. Keep
reusable lifecycle gate commands target-neutral by omitting `--target <id>`; use
explicit target pins only for manual dispatch, debugging, or deliberately local
overrides.

Use `oat gate cross-provider-exec` for generic cross-runtime execution. It
avoids the current runtime by default, chooses a fresh Codex, Claude, or Cursor
target when available, and exits with the child process status. Target commands
are stored as JSON argv arrays, so configure them with
`oat gate target set --base-command-json ...` rather than `oat config set`.

For schema, examples, and current V1 limits, see [Workflow Gates](workflow-gates.md).

Use these reference pages for file ownership and schema details:

- [File Locations](../reference/file-locations.md)
- [`.oat` Directory Structure](../reference/oat-directory-structure.md)
- [Sync Config (`.oat/sync/config.json`)](../provider-sync/config.md)

## `oat instructions ...`

These commands validate and repair project-scoped instruction integrity between `AGENTS.md` and sibling `CLAUDE.md` files.

- `oat instructions validate` - read-only integrity check with `--strategy pointer|symlink|copy`
- `oat instructions sync` - preview or apply pointer, symlink, or hard-copy repairs

Use this command group when instruction files drift after manual edits or generated updates, or when nested project directories contain Claude-only stray files that should be adopted into canonical `AGENTS.md`.

Operational notes:

- Validation and sync use the same recursive scan model, so `--dry-run` previews the same states that `validate` reports.
- `pointer` is the default strategy; `symlink` and `copy` make file shape part of correctness.
- Unreadable canonical `AGENTS.md` files and unreadable Claude-only sources are surfaced as drift, but sync leaves them in manual-repair mode instead of guessing at recovery.

For the full state model, repair semantics, and examples, see [Instruction Sync](../provider-sync/instruction-sync.md).

## Repo state helpers

- `oat state refresh` - rebuild the generated, gitignored `.oat/state.md` dashboard for the repo
- `oat index init` - generate a lightweight `project-index.md` for orientation

## Internal helpers and diagnostics

- `oat internal validate-oat-skills` - validate `oat-*` skill contracts and metadata
- `oat doctor` - run environment and setup diagnostics, including installed-vs-bundled skill version checks

`oat doctor` is the quickest way to confirm that your runtime, directory structure, and installed OAT assets are healthy before deeper debugging. At project scope it also scans bounded repository script and documentation surfaces for known-stale CLI grammar, such as `oat --scope all sync`, and reports file/line evidence plus the current `oat sync --scope all` form. Generated provider views, OAT lifecycle artifacts, archived content, dependencies, build output, and nested worktrees are excluded.

The `/oat-doctor` skill (installed via the core pack) provides richer diagnostics with check and summary modes, including config explanations sourced from bundled documentation.
