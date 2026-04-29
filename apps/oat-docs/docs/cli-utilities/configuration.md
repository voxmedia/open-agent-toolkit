---
title: Configuration
description: 'How OAT configuration is split across shared repo, repo-local, user, and provider-sync surfaces.'
---

# Configuration

Use this guide when you need to answer two questions quickly:

1. Which config file owns a setting?
2. Which CLI command should I use to inspect or change it?

For the deep file-by-file reference, see:

- [File Locations](../reference/file-locations.md)
- [`.oat` Directory Structure](../reference/oat-directory-structure.md)
- [Sync Config (`.oat/sync/config.json`)](../provider-sync/config.md)

## The four config surfaces

| Surface              | File                     | Typical contents                                                                                                        | Primary CLI surface                        |
| -------------------- | ------------------------ | ----------------------------------------------------------------------------------------------------------------------- | ------------------------------------------ |
| Shared repo config   | `.oat/config.json`       | Repo-wide non-sync settings such as `projects.root`, `git.defaultBranch`, `documentation.*`, `archive.*`, and `tools.*` | `oat config get/set/list/describe`         |
| Repo-local config    | `.oat/config.local.json` | Per-developer state for this checkout, such as `activeProject`, `lastPausedProject`, and repo-local `activeIdea`        | `oat config get/set/list/describe`         |
| User config          | `~/.oat/config.json`     | User-level state such as global `activeIdea` fallback                                                                   | `oat config describe`                      |
| Provider sync config | `.oat/sync/config.json`  | Provider enablement and sync strategy settings                                                                          | `oat providers set`, `oat config describe` |

The main split is:

- `.oat/config.json` for shared repo behavior
- `.oat/config.local.json` for local developer state
- `~/.oat/config.json` for user-scope fallback state
- `.oat/sync/config.json` for provider sync only

## The fastest way to inspect config

Use `oat config` as the primary discovery surface:

```bash
oat config list
oat config get projects.root
oat config describe
oat config describe archive.s3Uri
oat config describe sync.providers.github.enabled
```

What each command is for:

- `oat config list` shows the currently resolved command-surface values for shared and repo-local keys.
- `oat config get <key>` reads one supported key value.
- `oat config set <key> <value>` updates supported shared or repo-local keys.
- `oat config describe` shows the supported config catalog across shared repo, repo-local, user, and sync/provider surfaces.
- `oat config describe <key>` shows file, scope, default, mutability, owning command, and description for one key.

### Source labels

`oat config get --json` and `oat config list` emit a `source` field identifying which config surface a resolved value came from. The current labels are:

| Label     | Meaning                                                                            |
| --------- | ---------------------------------------------------------------------------------- |
| `env`     | Value came from an environment variable override (e.g. `OAT_PROJECTS_ROOT`)        |
| `local`   | Value came from `.oat/config.local.json` (per-developer repo state)                |
| `shared`  | Value came from `.oat/config.json` (team-shared repo settings)                     |
| `user`    | Value came from `~/.oat/config.json` (user-level fallback)                         |
| `default` | No surface set the key; value is the CLI's built-in default (or `null` when unset) |

These labels match what `oat config dump` emits, so tooling that consumes either command can rely on the same vocabulary.

:::note Upgrade note
Earlier CLI versions returned `config.json` / `config.local.json` / `env` / `default` as the `source` strings. External scripts that previously matched on `"source":"config.json"` or `"source":"config.local.json"` should update to match the new `shared` / `local` labels. This change was made to align the `oat config get` / `oat config list` output with `oat config dump` and to avoid confusing users about which file was consulted.
:::

## Shared repo config you will touch most often

Common keys in `.oat/config.json`:

- `projects.root` — where tracked projects live
- `worktrees.root` — where OAT-managed worktrees live
- `git.defaultBranch` — base branch fallback for PR workflows
- `documentation.root`, `documentation.tooling`, `documentation.config` — docs-surface ownership
- `documentation.requireForProjectCompletion` — whether docs sync is a completion gate
- `archive.s3Uri` — base S3 archive prefix
- `archive.s3SyncOnComplete` — upload archived projects to S3 during completion
- `archive.summaryExportPath` — export `summary.md` into a durable tracked directory during completion
- `archive.wrapUpExportPath` — optional tracked destination for `oat-wrap-up` reports; when unset, the skill falls back to `.oat/repo/reference/wrap-ups`
- `archive.awsProfile` — optional AWS named profile forwarded as `AWS_PROFILE` to every `aws` invocation in archive flows
- `archive.awsRegion` — optional AWS region forwarded as `AWS_REGION` to every `aws` invocation in archive flows
- `tools.<pack>` — whether a bundled tool pack is currently installed in the repo or user scopes after lifecycle reconciliation

Tool-pack state example:

```bash
oat config get tools.project-management
oat config set tools.project-management true
```

The `tools.*` keys are primarily maintained by `oat tools install`, `oat tools update`, and `oat tools remove`, but they are intentionally visible through `oat config` so workflows and operators can inspect or override pack-state signals when needed.

Archive example:

```bash
oat config set archive.s3Uri s3://example-bucket/oat-archive
oat config set archive.s3SyncOnComplete true
oat config set archive.summaryExportPath .oat/repo/reference/project-summaries
oat config set archive.wrapUpExportPath .oat/repo/reference/wrap-ups
oat config set archive.awsProfile work-sso
oat config set archive.awsRegion us-east-1
```

With those values configured:

- `oat-project-complete` still archives locally into `.oat/projects/archived/<project>/`
- completion also attempts an S3 upload when AWS CLI is available and configured, storing dated snapshots such as `<archive.s3Uri>/<repo-slug>/projects/20260401-my-project/`
- completion also copies `summary.md` into `<archive.summaryExportPath>/20260401-my-project.md`
- `oat project archive sync` can later pull archive data back down from S3 and materialize the latest snapshot into the local bare archive path `.oat/projects/archived/<project>/`
- `oat-wrap-up` can write tracked reports into `<archive.wrapUpExportPath>/YYYY-MM-DD-wrap-up-<label>.md`; if the key is unset, the skill uses `.oat/repo/reference/wrap-ups/`
- every `aws` spawn (preflight `aws sts get-caller-identity`, `aws s3 ls`, `aws s3 sync`) inherits `AWS_PROFILE` / `AWS_REGION` from `archive.awsProfile` / `archive.awsRegion` when the parent shell does not already set them

### Credential resolution

Profile and region resolve with the following precedence per `aws` invocation, highest first:

1. CLI flag passed to `oat project archive sync` (`--profile <profile>`, `--region <region>`)
2. The parent shell's existing `AWS_PROFILE` / `AWS_REGION` env vars
3. The repo's shared `archive.awsProfile` / `archive.awsRegion` config

If none of the three are present for a given var, OAT does not inject it — the AWS CLI's own resolution chain takes over.

The `oat project archive sync` flags only override for that single invocation:

```bash
oat project archive sync --profile work-sso --region us-east-1
```

`oat-project-complete` does not accept per-invocation flags. Set the shared config (or your shell env) ahead of time if completion needs a specific profile.

Raw access keys (`AWS_ACCESS_KEY_ID`, `AWS_SECRET_ACCESS_KEY`, and friends) remain a shell-environment concern. OAT does not expose config keys for them — set them in your shell before running `oat-project-complete` or `oat project archive sync` and they are inherited by the spawned `aws` process unchanged.

## Repo-local and user state

Use `.oat/config.local.json` for checkout-specific workflow state:

- `activeProject`
- `lastPausedProject`
- repo-scoped `activeIdea`

Use `~/.oat/config.json` for user fallback state when no repo-local value is set:

- `activeIdea`

In practice, you usually inspect these via:

```bash
oat config get activeProject
oat config get lastPausedProject
oat config describe activeIdea
```

## Workflow preferences (`workflow.*`)

Workflow preferences let power users answer repetitive confirmation prompts once and have OAT workflow skills respect those answers automatically. They are the highest-value escape hatch from interactive friction when you always make the same choices.

### Preference keys

All seven workflow preference keys live under the `workflow.*` namespace:

- `workflow.hillCheckpointDefault` — `every` or `final`. Default HiLL checkpoint behavior in `oat-project-implement`: pause after every phase or only after the last phase. When unset, the skill prompts.
- `workflow.archiveOnComplete` — boolean. Skip the "Archive after completion?" prompt in `oat-project-complete`. When unset, the skill prompts.
- `workflow.createPrOnComplete` — boolean. Skip the "Open a PR?" prompt in `oat-project-complete`; when true, completion auto-triggers PR creation. When unset, the skill prompts.
- `workflow.postImplementSequence` — `wait`, `summary`, `pr`, or `docs-pr`. Controls what `oat-project-implement` chains after final review passes. `wait` stops without auto-chaining, `summary` runs only `oat-project-summary`, `pr` runs `oat-project-pr-final` (which auto-generates summary), `docs-pr` runs `oat-project-document` then `oat-project-pr-final`. When unset, the skill prompts.
- `workflow.reviewExecutionModel` — `subagent`, `inline`, or `fresh-session`. Default final-review execution model in `oat-project-implement`. `subagent` and `inline` run automatically. `fresh-session` is a soft preference: the skill prints guidance to run the review in another session but still offers escape hatches to `subagent` or `inline` if you change your mind. When unset, the skill prompts.
- `workflow.autoReviewAtHillCheckpoints` — boolean. Automatically run the extra lifecycle review when a HiLL checkpoint is reached. This does not control Tier 1 per-phase `oat-reviewer` gates, which run after each phase in Tier 1 regardless of this setting. When unset, the skill prompts.
- `workflow.autoNarrowReReviewScope` — boolean. Auto-narrow re-review scope to fix-task commits only in `oat-project-review-provide`. When unset, the skill prompts.

### Three-layer resolution

Workflow preferences resolve through three config surfaces, with `env > local > shared > user > default` precedence per key. This is the same generic resolution used by `oat config dump`:

- **User-level** (`~/.oat/config.json`): personal defaults that apply to every repo. This is where most power users should start — set preferences once, never worry about them again.
- **Shared repo** (`.oat/config.json`): team decisions for this repo. Overrides user defaults when present.
- **Repo-local** (`.oat/config.local.json`): personal override for this specific repo. Highest precedence per key.

### Setting preferences

`oat config set` supports mutually exclusive surface flags for workflow keys:

```bash
# User-level: applies to all repos on this machine
oat config set workflow.hillCheckpointDefault final --user
oat config set workflow.archiveOnComplete true --user
oat config set workflow.createPrOnComplete true --user
oat config set workflow.postImplementSequence pr --user
oat config set workflow.reviewExecutionModel subagent --user
oat config set workflow.autoReviewAtHillCheckpoints true --user
oat config set workflow.autoNarrowReReviewScope true --user

# Shared repo: team decision for this repo
oat config set workflow.createPrOnComplete false --shared

# Repo-local: personal override for this repo (default when no flag)
oat config set workflow.hillCheckpointDefault every
```

Default (no flag) targets `.oat/config.local.json` for workflow keys. Pass at most one of `--user`, `--shared`, or `--local`. Structural keys (`projects.root`, `worktrees.root`, `git.*`, `documentation.*`, `archive.*`, `tools.*`) are still shared-only regardless of flag.

### Choosing the right surface (personal vs per-repo)

Not every workflow preference belongs at user level, even though "set once, applies everywhere" is tempting. The guiding principle:

> **If a workflow preference's correctness depends on other repo-level settings, it belongs at shared (per-repo) level, not user level.**

Some preferences are **genuinely personal** — their correct value is the same for you regardless of which repo you're in. These are safe to set at `--user`:

- `workflow.hillCheckpointDefault` — your personal tolerance for mid-implementation interruption
- `workflow.reviewExecutionModel` — depends on your provider environment (Claude Code, Cursor, Codex), not the repo
- `workflow.autoReviewAtHillCheckpoints` — your preference for automatic lifecycle review at HiLL checkpoints. Shared/local config can still override this when a repo should behave differently.
- `workflow.autoNarrowReReviewScope` — pure personal workflow preference, no per-repo interaction

Other preferences **depend on per-repo configuration** to be safe. These should be set at `--shared` (in each repo where they apply), not `--user`:

- `workflow.archiveOnComplete` — correctness depends on the repo's `archive.s3Uri` / `archive.s3SyncOnComplete` being configured. A user-level `true` would try to archive in repos that aren't set up for it.
- `workflow.postImplementSequence` — correctness depends on `documentation.requireForProjectCompletion`. Setting `pr` at user level would foot-gun you in any repo that requires docs, because completion would later block on the docs gate while the PR is already open.
- `workflow.createPrOnComplete` — this key is almost always redundant with `postImplementSequence`-driven flows. When it's meaningful, its correctness depends on the same per-repo docs and PR gates. Prefer shared scope, or omit it entirely and rely on `postImplementSequence: pr` or `docs-pr` to handle PR creation at the end of implement.

**Cross-repo foot-gun example:** If you set `workflow.createPrOnComplete: true --user`, it applies to every repo you work on. In a repo with `documentation.requireForProjectCompletion: true` and `postImplementSequence: pr` (no docs step), running `oat-project-complete` would try to auto-create a PR, then immediately hit the docs gate and block you — leaving you with an open PR and a stuck completion. Your user-level preference silently asserted something that only holds in a specific shared-config shape.

**Recommended split for most users:**

```bash
# Personal defaults (apply everywhere)
oat config set workflow.hillCheckpointDefault final --user
oat config set workflow.reviewExecutionModel subagent --user
oat config set workflow.autoReviewAtHillCheckpoints true --user
oat config set workflow.autoNarrowReReviewScope true --user

# Per-repo team decisions (set in each repo where they apply)
oat config set workflow.archiveOnComplete true --shared
oat config set workflow.postImplementSequence docs-pr --shared  # or "pr" if docs aren't required
```

If you want to override a shared team decision for this specific checkout, use `--local`:

```bash
oat config set workflow.archiveOnComplete false --local  # "I don't want to archive on this specific branch checkout"
```

### Relationship to `autoReviewAtCheckpoints`

`workflow.autoReviewAtHillCheckpoints` is the preferred key. It controls whether `oat-project-implement` runs the extra lifecycle review when a configured HiLL checkpoint is reached.

This does not control Tier 1 phase gate reviews. Tier 1 always runs `oat-reviewer` after each phase. The workflow key only controls the additional `oat-project-review-provide` lifecycle review at HiLL checkpoints.

The legacy top-level `.oat/config.json` key `autoReviewAtCheckpoints` is still read as a fallback for backward compatibility. Prefer the workflow key for new config:

```bash
oat config set workflow.autoReviewAtHillCheckpoints true --user
```

If you enable this plus the other workflow preferences, you get a near-uninterrupted lifecycle: lifecycle review runs at HiLL checkpoints, fix tasks are converted automatically, and the workflow preferences skip every remaining confirmation prompt.

## Provider sync config is different

Provider sync settings are intentionally documented in the same discovery flow, but they are not owned by `oat config set`.

Examples:

```bash
oat config describe sync.defaultStrategy
oat config describe sync.providers.<name>.enabled
oat providers set --scope project --enabled claude,codex
```

Use:

- `oat config describe ...` to understand sync keys
- `oat providers set ...` to mutate sync/provider settings

For the provider-sync schema details, use [Sync Config (`.oat/sync/config.json`)](../provider-sync/config.md).

## Recommended workflow

When you are unsure where a setting lives:

1. Run `oat config describe`.
2. Run `oat config describe <key>` for the key you care about.
3. Use the owning command shown there.

That keeps config discovery centralized without forcing you to remember which settings belong to workflow state versus provider sync.
