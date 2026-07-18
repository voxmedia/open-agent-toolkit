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

| Surface              | File                     | Typical contents                                                                                                                                      | Primary CLI surface                            |
| -------------------- | ------------------------ | ----------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------- |
| Shared repo config   | `.oat/config.json`       | Repo-wide non-sync settings such as `projects.root`, `git.defaultBranch`, `documentation.*`, `archive.*`, `tools.*`, and shared `workflow.*` defaults | `oat config get/set/list/describe`, `oat gate` |
| Repo-local config    | `.oat/config.local.json` | Per-developer state for this checkout, such as `activeProject`, `lastPausedProject`, repo-local `activeIdea`, and local `workflow.*` overrides        | `oat config get/set/list/describe`, `oat gate` |
| User config          | `~/.oat/config.json`     | User-level state such as global `activeIdea` fallback, personal `workflow.*` defaults, and personal known provider strays                             | `oat config describe`, `oat gate`              |
| Provider sync config | `.oat/sync/config.json`  | Provider enablement, sync strategy, and repo-level known stray settings                                                                               | `oat providers set`, `oat config describe`     |

The main split is:

- `.oat/config.json` for shared repo behavior
- `.oat/config.local.json` for local developer state
- `~/.oat/config.json` for user-scope fallback state and personal provider-sync exceptions
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
- `workflow.gates.skills` / `workflow.gates.execTargets` — per-skill gates and cross-runtime exec targets; manage with `oat gate`
- `workflow.gateTimeouts.code` / `workflow.gateTimeouts.artifact` — default review budgets in milliseconds

Tool-pack state example:

```bash
oat config get tools.project-management
oat config set tools.project-management true
```

The `tools.*` keys are primarily maintained by `oat tools install`, `oat tools update`, and `oat tools remove`, but they are intentionally visible through `oat config` so workflows and operators can inspect or override pack-state signals when needed.

Workflow gate objects are structured config and use their own command group
instead of the scalar `oat config set` surface. See
[Workflow Gates](workflow-gates.md) for the full command surface and examples.

Gate budgets resolve per run in this order: CLI `--timeout-ms`, selected
target `timeoutMs`, `workflow.gateTimeouts` by review type,
`OAT_GATE_EXEC_TIMEOUT_MS`, then the built-in type-and-scope default. Values
must be integer milliseconds from `1,000` through `14,400,000`.

```json
{
  "workflow": {
    "gateTimeouts": {
      "code": 2400000,
      "artifact": 900000
    },
    "gates": {
      "execTargets": {
        "cursor-large-review": {
          "runtime": "cursor",
          "baseCommand": ["cursor-agent", "-p", "--force"],
          "timeoutMs": 3600000
        }
      }
    }
  }
}
```

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
- `oat repo archive sync` can later pull archive data back down from S3 and materialize the latest snapshot into the local bare archive path `.oat/projects/archived/<project>/`
- `oat-wrap-up` can write tracked reports into `<archive.wrapUpExportPath>/YYYY-MM-DD-wrap-up-<label>.md`; if the key is unset, the skill uses `.oat/repo/reference/wrap-ups/`
- every `aws` spawn (preflight `aws sts get-caller-identity`, `aws s3 ls`, `aws s3 sync`) runs with `AWS_PROFILE` / `AWS_REGION` set from `archive.awsProfile` / `archive.awsRegion` when configured, overriding any value already in the parent shell

### Credential resolution

Profile and region resolve with the following precedence per `aws` invocation, highest first:

1. CLI flag passed to `oat repo archive sync` (`--profile <profile>`, `--region <region>`)
2. The repo's shared `archive.awsProfile` / `archive.awsRegion` config
3. The parent shell's existing `AWS_PROFILE` / `AWS_REGION` env vars

If none of the three are present for a given var, OAT does not inject it — the AWS CLI's own resolution chain takes over.

`archive.awsProfile` is treated as deliberate, OAT-archive-scoped intent: if the repo declares the identity it wants to archive under, that value wins over whatever profile happens to be in the calling shell. Use `--profile` for one-off overrides; clear `archive.awsProfile` (set it to an empty string) to fall back to shell `AWS_PROFILE`.

The `oat repo archive sync` flags only override for that single invocation:

```bash
oat repo archive sync --profile work-sso --region us-east-1
```

`oat-project-complete` does not accept per-invocation flags. Set the shared config (or your shell env) ahead of time if completion needs a specific profile.

Raw access keys (`AWS_ACCESS_KEY_ID`, `AWS_SECRET_ACCESS_KEY`, and friends) remain a shell-environment concern. OAT does not expose config keys for them — set them in your shell before running `oat-project-complete` or `oat repo archive sync` and they are inherited by the spawned `aws` process unchanged.

## Repo-local and user state

Use `.oat/config.local.json` for checkout-specific workflow state:

- `activeProject`
- `lastPausedProject`
- repo-scoped `activeIdea`

Use `~/.oat/config.json` for user fallback state when no repo-local value is set:

- `activeIdea`

Repo-local and user config can also hold workflow defaults, including
`workflow.gates.*`. This is useful for personal runtime availability: for
example, one user may prefer `claude -p` as a gate target while another prefers
`codex exec`.

In practice, you usually inspect these via:

```bash
oat config get activeProject
oat config get lastPausedProject
oat config describe activeIdea
```

## Dispatch policy resolution

Dispatch configuration has two layers:

1. A reusable ordered candidate ladder owned by user, shared, or repo-local
   config.
2. A project or phase named ceiling that acts as a maximum over that ladder.

A named ceiling is a maximum constraint, not an exact model-family or effort
preference. For the full model, see
[Dispatch Policy](../workflows/projects/dispatch-ceiling.md).

### Config keys

| Key                                                    | Values                                                | Purpose                                                                                 |
| ------------------------------------------------------ | ----------------------------------------------------- | --------------------------------------------------------------------------------------- |
| `workflow.dispatchPolicy.mode`                         | `managed`, `inherit`                                  | `managed` lets OAT select exact candidates; `inherit` leaves controls to the host       |
| `workflow.dispatchPolicy.policy`                       | `economy`, `balanced`, `high`, `frontier`, `uncapped` | Default named maximum or explicit managed uncapped state                                |
| `workflow.dispatchCeiling.providers.<provider>`        | tier map or legacy bare value                         | Reusable provider candidate column                                                      |
| `workflow.dispatchCeiling.providers.<provider>.<tier>` | `candidates` cell, route, or legacy bare value        | One named tier in the provider ladder                                                   |
| `workflow.dispatchCeiling.recommendationVersion`       | string                                                | Version written by `oat config adopt dispatch-matrix` for recommendation drift tracking |
| `workflow.dispatchCeiling.preset`                      | `balanced`, `maximum`, `cost-conscious`               | Legacy policy setup alias                                                               |

### Adopt a complete ladder

Choose the owning scope explicitly:

```bash
oat config adopt dispatch-matrix --shared
oat config adopt dispatch-matrix --local
oat config adopt dispatch-matrix --user
```

Adoption fills missing provider/tier cells and preserves explicit existing
values. Planning shows the complete bundled recommendation before asking for
this scope, then rechecks the effective ladder. If explicit cells still leave
the ladder incomplete, readiness blocks; OAT does not overwrite them.

Scope determines ownership and Codex materialization:

- `--shared` and `--local` are project configuration sources. Their configured
  Codex candidates materialize into the tracked project `.codex` view.
- `--user` writes reusable personal defaults to `~/.oat/config.json`; those
  Codex candidates materialize under `~/.codex`.
- Active-project sparse candidates also materialize into the tracked project
  view.

Project-generated provider views remain visible to version control. OAT does
not auto-ignore them. A project-specific active policy or ceiling must not be
written into user `~/.oat/config.json`; store it in that project's `state.md`
even when the reusable ladder is user-owned.

### Ordered candidate cells

```json
{
  "workflow": {
    "dispatchCeiling": {
      "providers": {
        "codex": {
          "balanced": {
            "candidates": [
              {
                "harness": "codex",
                "model": "gpt-5.6-terra",
                "effort": "low"
              },
              {
                "harness": "codex",
                "model": "gpt-5.6-terra",
                "effort": "medium"
              }
            ]
          }
        },
        "claude": {
          "balanced": { "candidates": ["sonnet"] }
        },
        "cursor": {
          "balanced": {
            "candidates": ["opaque:model/lower [v1]", "opaque:model/high [v2]"]
          }
        }
      }
    }
  }
}
```

The bundled recommendation covers 13 Codex model/effort combinations: Luna and
Terra at `low`, `medium`, `high`, and `xhigh`, plus Sol at those efforts and
`max`. Claude covers `haiku`, `sonnet`, `opus`, and `fable`. Cursor covers 13
opaque configured strings. Cursor spelling never supplies capability metadata;
the configured candidate position owns the tier meaning.

The corresponding pinned Codex variant catalogue includes
`gpt-5.6-luna-high`, `gpt-5.6-terra-xhigh`, `gpt-5.6-sol-high`, and
`gpt-5.6-sol-max`. Configuration selects from that materialized catalogue; it
does not construct an unregistered role during dispatch.

The final candidate in a named tier defines that tier's reviewer ceiling. For
implementation and fix tasks, all candidates from the lowest tier through the
named maximum remain eligible. Under High, that includes Economy, Balanced, and
High candidates.

### Record the project maximum

Project state stores the named maximum without compiled provider pins:

```yaml
oat_dispatch_policy:
  mode: managed
  policy: high
  source: project-state
```

An optional phase `Dispatch Profile` row may narrow the maximum. Blank or
`auto` uses the project value. `Uncapped` and inherit/default remain explicit
modes:

```yaml
oat_dispatch_policy:
  mode: managed
  policy: uncapped
  source: project-state
```

```yaml
oat_dispatch_policy:
  mode: inherit
  source: project-state
```

### Exact phase resolution

The project-aware resolver remains the source of truth. Preflight reads layered
config and project state without mutating either:

```bash
oat project dispatch-ceiling resolve --provider codex --preflight --json
```

For each managed capped phase, the root supplies the recorded project or
narrower phase maximum plus one exact configured phase-implementer candidate.
Optional nested work resolves separately only when launched:

```bash
oat project dispatch-ceiling resolve \
  --provider codex \
  --role implementer \
  --ceiling-tier high \
  --candidate-model gpt-5.6-terra \
  --candidate-effort medium \
  --json

oat project dispatch-ceiling resolve \
  --provider claude \
  --role implementer \
  --ceiling-tier high \
  --candidate-model sonnet \
  --json

oat project dispatch-ceiling resolve \
  --provider cursor \
  --role implementer \
  --ceiling-tier high \
  --candidate-model 'opaque:model/lower [v1]' \
  --json
```

`--ceiling-tier` is invocation-only. It accepts `economy`, `balanced`, `high`,
or `frontier`, overrides layered active-policy ceilings for that call, and never
writes user, shared, local, or project configuration. JSON reports top-level
`source: invocation`; `providers.<provider>.cellSource` still identifies the
config layer that owns the selected candidate.

The resolver fails closed when a candidate is missing, above the maximum,
ambiguous, malformed, or cannot compile exact provider controls. `--preferred`
remains compatibility behavior for legacy scalar ceilings and managed
`Uncapped`; it is not the exact managed phase-agent path.

### Provider enforcement and materialization

| Provider | Exact phase-agent or optional-child mechanism                                                        |
| -------- | ---------------------------------------------------------------------------------------------------- |
| Codex    | `providers.codex.dispatchArgs.variant` as `agent_type`, or a fresh child pinned to model plus effort |
| Claude   | `providers.claude.dispatchArgs.model` as the actual Agent `model`                                    |
| Cursor   | `providers.cursor.dispatchArgs.model` byte-for-byte as the actual opaque invocation model            |

Project sync materializes the supported Codex catalogue and every configured
project-owned candidate for both `oat-phase-implementer` and `oat-reviewer`.
User sync materializes user-owned candidates under `~/.codex`:

```bash
oat sync --scope project
oat sync --scope user
oat sync --scope all
```

Generated roles carry `supported-catalogue`, `project-config`, or `user-config`
ownership. Cleanup reconciles only the current owner. Materialization is best
effort at sync boundaries; the exact fresh-child route means workflow
correctness does not require provider restart or hot reload.

Reviewer resolution uses the final candidate at the configured review ceiling.
Codex selects the exact reviewer variant; Claude and Cursor pass the resolver's
exact model argument. Timeout retries preserve the same complete payload. A
lower reviewer candidate requires a separate reviewed contract.

Tier 2 remains target-preserving. Inline review is permitted only when the host
has verified equivalent current-host controls for explicit inherit,
managed-uncapped, or base-role behavior. Capped managed reviews still require
the exact registered role, pinned child, or resolver-returned model argument.

### Cursor validation pass and live evidence

Config adoption and doctor validate Cursor candidates with one command-scoped
pass context. Duplicate references to the same byte-for-byte candidate share
one Task/subagent probe. If a decisive probe is unavailable, the pass resolves
the broad catalog once, with at most one `--list-models` fallback. The cache
ends with that adopt or doctor command; it is not process-global and has no
TTL.

A correlated Task start/completion pair that preserves the exact model argument
and returns the sentinel establishes that the argument is eligible for that
account and client. A structured rejection or exact allow-list exclusion can
establish `unknown-value`. Neither result identifies the backend runtime model:
`runtimeIdentity` remains `not-reported` unless trusted Cursor telemetry or
Cursor support confirms it. Parent prose and broad catalog presence are
diagnostic-only, so OAT preserves `unvalidated` when launcher evidence is
absent instead of inferring capability from candidate spelling.

The [dated GPT-5.6 Cursor verification evidence](https://github.com/voxmedia/open-agent-toolkit/blob/main/.oat/repo/reference/project-summaries/20260711-cursor-gpt-5-6-subagent-verification.md)
preserves the original text-mode pass and a versioned stream-JSON second pass.
The second pass ran a dynamic positive control and deliberate invalid control
before candidates. Both parent runs completed without a Task event, making the
controls inconclusive; the stop rule therefore executed zero of the 13
recommended candidates and did not execute exploratory
`gpt-5.6-sol-high-fast`. The recommendation remains unchanged and candidate
eligibility remains unresolved.

The tracked artifact's structured second-pass block contains only allowlisted
event structure, derived outcomes, sanitized auth-presence context, and
non-reversible identifier hashes. Exact request/session/tool-call IDs and
credential-redacted unprojected streams from that pass stay under gitignored
`.oat/projects/local/` storage for possible Cursor support diagnosis.

The same public artifact intentionally retains the sanitized historical v1
text-mode record for provenance. That older section includes command arguments
and prompts, stdout and stderr, exit and duration data, and capture-environment
details such as user-specific binary paths; it is not limited to the structured
second-pass allowlist. Re-run after a Cursor client rollout exposes Task in
headless mode or Cursor support confirms the private requests; review the open
verification item by 2026-08-08.

### Legacy compatibility

The command and docs path retain `dispatch-ceiling` for compatibility. Legacy
bare provider values, `workflow.dispatchCeiling.preset`, project
`oat_dispatch_ceiling`, and `--preferred` remain readable during migration.
Absent policy state does not mean managed `Uncapped`.

For non-interactive preflight checks:

```bash
oat project dispatch-ceiling resolve \
  --provider codex \
  --preflight \
  --non-interactive
```

An unresolved or incomplete managed ladder exits nonzero and blocks before
implementation work.

## Workflow preferences (`workflow.*`)

Workflow preferences let power users answer repetitive confirmation prompts once and have OAT workflow skills respect those answers automatically. They are the highest-value escape hatch from interactive friction when you always make the same choices.

### Preference keys

Workflow preference keys live under the `workflow.*` namespace:

- `workflow.designMode` — `collaborative`, `selective`, or `draft`. Default design interaction mode. `selective` applies only to full `oat-project-design`; quick-start lightweight design treats it as collaborative because quick-start keeps the smaller collaborative/draft choice.
- `workflow.hillCheckpointDefault` — `every` or `final`. Default HiLL checkpoint behavior in `oat-project-implement`: pause after every phase or only after the last phase. When unset, the skill prompts.
- `workflow.archiveOnComplete` — boolean. Skip the "Archive after completion?" prompt in `oat-project-complete`. When unset, the skill prompts.
- `workflow.createPrOnComplete` — boolean. Skip the "Open a PR?" prompt in `oat-project-complete`; when true, completion auto-triggers PR creation. When unset, the skill prompts.
- `workflow.postImplementSequence` — legacy `wait`, `summary`, `pr`, or `docs-pr`, or `{ "preApproval": [...], "postApproval": [...] }`. Legacy values remain strings; structured arrays contain ordered, globally unique `summary`, `document`, and `pr` steps. Pre-approval steps run after final review and before final HiLL approval; post-approval steps run only after that approval. Plain retrieval keeps legacy strings and prints structured values as compact JSON; `--json` returns the raw value.
- `workflow.reviewExecutionModel` — `subagent`, `inline`, or `fresh-session`. Default final-review execution model in `oat-project-implement`. `subagent` and `inline` run automatically. `fresh-session` is a soft preference: the skill prints guidance to run the review in another session but still offers escape hatches to `subagent` or `inline` if you change your mind. When unset, the skill prompts.
- `workflow.autoReviewAtHillCheckpoints` — boolean. Automatically run the extra lifecycle review when a HiLL checkpoint is reached. This does not control Tier 1 per-phase `oat-reviewer` gates, which run after each phase in Tier 1 regardless of this setting. When unset, the skill prompts.
- `workflow.autoNarrowReReviewScope` — boolean. Auto-narrow re-review scope to fix-task commits only in `oat-project-review-provide`. When unset, the skill prompts.
- `workflow.autoArtifactReview.plan` — boolean, default `true`. Automatically run the bounded artifact-review loop for generated `plan.md` files before implementation handoff. Set to `false` only when you intentionally want to skip the plan artifact review.
- `workflow.autoArtifactReview.analysis` — boolean, default `true`. Automatically run the bounded accuracy-review loop for generated docs and agent-instructions analysis artifacts before the matching apply workflow consumes them.
- `workflow.projectLog` — `auto`, `true`, or `false`; default `auto`. `auto` creates the append-only `project-log.md` on the first lifecycle append, `true` also enables scaffold-time creation, and `false` skips appends when no log exists. An existing artifact remains enabled regardless of the current setting.
- `workflow.projectLogLedgerPath` — repository-relative string; default `.oat/repo/reference/project-observations.md`. Sets the durable ledger target for `general` judgments written by `oat project log rollup`.
- `workflow.dispatchPolicy.mode` — `managed` or `inherit`. `managed` means OAT selects model/effort controls from `workflow.dispatchPolicy.policy`; `inherit` means OAT leaves controls to host/provider defaults.
- `workflow.dispatchPolicy.policy` — `economy`, `balanced`, `high`, `frontier`, or `uncapped`. `economy` through `frontier` are capped managed policies; `uncapped` keeps OAT-managed preferred selection without provider caps. It is distinct from `workflow.dispatchPolicy.mode=inherit`, which leaves controls to the host/provider.
- `workflow.dispatchCeiling.preset` — legacy compatibility alias (`balanced`, `maximum`, or `cost-conscious`) for capped managed policy setup.
- `workflow.dispatchCeiling.providers.<provider>` — dispatch matrix provider column or legacy bare provider target.
- `workflow.dispatchCeiling.providers.<provider>.<tier>` — one matrix cell for `economy`, `balanced`, `high`, or `frontier`.
- `workflow.dispatchCeiling.recommendationVersion` — version of the adopted recommended matrix.
- `workflow.gates.skills` / `workflow.gates.execTargets` — structured per-skill final gate commands and exec-target registry. Use `oat gate set`, `oat gate target set`, `oat gate review`, and `oat gate cross-provider-exec`; do not use `oat config set` for these objects.
- `workflow.gateTimeouts.code` / `workflow.gateTimeouts.artifact` — validated default gate-review budgets in milliseconds. Both resolve through `local > shared > user`.

The two project-log keys use the standard workflow precedence:
`local > shared > user > default`.

### HiLL plan-field semantics

`workflow.hillCheckpointDefault` controls the first implementation run's
checkpoint choice, but the confirmed selection is stored in `plan.md` as
`oat_plan_hill_phases`. The plan field has three distinct states:

| `oat_plan_hill_phases` state | Meaning                                                                                                                                                     |
| ---------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Field absent                 | Checkpoint selection is unconfirmed. This is valid before the first implementation run; a resumed run treats it as bookkeeping drift that must be resolved. |
| `[]`                         | Checkpoint after every phase boundary.                                                                                                                      |
| `["p02", "p04"]`             | Checkpoint only after the listed phases complete.                                                                                                           |

**Never write `[]` to mean no checkpoints.** It means every phase. To select
only the final checkpoint, store the final phase ID explicitly:

```yaml
oat_plan_hill_phases: ['p04']
```

With `workflow.hillCheckpointDefault: every`, the first implementation run
writes `[]`. With `workflow.hillCheckpointDefault: final`, it writes
`["<final-phase-id>"]`. An autonomous run with an absent field takes that same
explicit final-default path and enables checkpoint auto-review; it preserves an
existing valid empty or explicit list. Because autonomy itself is never
persisted, a later interactive run pauses at the stored checkpoints normally.

See [HiLL Checkpoints](../workflows/projects/hill-checkpoints.md) for timing and
approval behavior.

### Auto artifact-review preferences

`workflow.autoArtifactReview.*` controls the artifact-quality loops that run before downstream workflow steps consume generated artifacts. Both keys are default-on. Only an explicit `false` disables the matching loop:

| Key                                    | Default | Controls                                                                 |
| -------------------------------------- | ------- | ------------------------------------------------------------------------ |
| `workflow.autoArtifactReview.plan`     | `true`  | `plan.md` artifact review after plan authoring and before implementation |
| `workflow.autoArtifactReview.analysis` | `true`  | Accuracy review for generated docs and agent-instructions analysis files |

The loops use `oat-reviewer` structured-output mode. They do not write standalone review artifacts unless the calling workflow records an outcome row or tracking metadata. The retry bound comes from the project `oat_orchestration_retry_limit` setting and defaults to `2`.

### Three-layer resolution

Workflow preferences resolve through three config surfaces, with `local > shared > user > default` precedence per key. `oat config dump` can also report an `env` source for keys that have explicit environment aliases, such as `projects.root` and `worktrees.root`; `workflow.autoArtifactReview.plan` and `workflow.autoArtifactReview.analysis` do not have environment aliases and use config-file/default resolution.

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
oat config set workflow.designMode selective --user
oat config set workflow.dispatchCeiling.preset balanced --user
oat config adopt dispatch-matrix --user
oat config set workflow.autoArtifactReview.plan true --user
oat config set workflow.autoArtifactReview.analysis true --user

# Shared repo: team decision for this repo
oat config set workflow.createPrOnComplete false --shared
oat config set workflow.designMode collaborative --shared
oat config set workflow.dispatchCeiling.preset balanced --shared
oat config set workflow.dispatchCeiling.providers.cursor.high composer-2.5 --shared
oat config set workflow.autoArtifactReview.plan false --shared
oat config set workflow.projectLog auto --shared
oat config set workflow.projectLogLedgerPath .oat/repo/reference/project-observations.md --shared

# Repo-local: personal override for this repo (default when no flag)
oat config set workflow.hillCheckpointDefault every
oat config set workflow.designMode draft
oat config set workflow.dispatchCeiling.providers.codex medium  # Advanced: per-provider override
oat config set workflow.autoArtifactReview.analysis false
```

Default (no flag) targets `.oat/config.local.json` for workflow keys. Pass at most one of `--user`, `--shared`, or `--local`. Structural keys (`projects.root`, `worktrees.root`, `git.*`, `documentation.*`, `archive.*`, `tools.*`) are still shared-only regardless of flag.

### Choosing the right surface (personal vs per-repo)

Not every workflow preference belongs at user level, even though "set once, applies everywhere" is tempting. The guiding principle:

> **If a workflow preference's correctness depends on other repo-level settings, it belongs at shared (per-repo) level, not user level.**

Some preferences are **genuinely personal** — their correct value is the same for you regardless of which repo you're in. These are safe to set at `--user`:

- `workflow.hillCheckpointDefault` — your personal tolerance for mid-implementation interruption
- `workflow.designMode` — your preferred full-design interaction style. Set `selective` when you usually want low-risk sections drafted silently but high-risk sections reviewed live.
- `workflow.reviewExecutionModel` — depends on your provider environment (Claude Code, Cursor, Codex), not the repo
- `workflow.autoReviewAtHillCheckpoints` — your preference for automatic lifecycle review at HiLL checkpoints. Shared/local config can still override this when a repo should behave differently.
- `workflow.autoNarrowReReviewScope` — pure personal workflow preference, no per-repo interaction

Other preferences **depend on per-repo configuration** to be safe. These should be set at `--shared` (in each repo where they apply), not `--user`:

- `workflow.autoArtifactReview.plan` / `workflow.autoArtifactReview.analysis` — default to `true`; use shared config only when a repo intentionally opts out of generated-artifact review loops, and local config for one-off debugging or emergency bypasses.
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

Known provider strays are the narrow cross-surface exception: repo-wide
`knownStrays` entries live in `.oat/sync/config.json`, while personal
`knownStrays` entries can live in `~/.oat/config.json`.

For the provider-sync schema details, use [Sync Config (`.oat/sync/config.json`)](../provider-sync/config.md).

## Recommended workflow

When you are unsure where a setting lives:

1. Run `oat config describe`.
2. Run `oat config describe <key>` for the key you care about.
3. Use the owning command shown there.

That keeps config discovery centralized without forcing you to remember which settings belong to workflow state versus provider sync.
