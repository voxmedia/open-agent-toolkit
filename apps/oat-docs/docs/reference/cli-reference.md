---
title: CLI Reference
description: Scannable reference for the current OAT CLI surface, with links to the deeper owning sections for each command family.
---

# CLI Reference

Use this page when you need a quick map of the OAT CLI rather than the full command-by-command docs. It is intentionally shallow: each section points to the owning page that documents the detailed behavior.

The CLI is also a standalone value path. You can use `oat init`, `oat sync`, `oat tools`, docs commands, repo archive sync, and repo-analysis commands without adopting the full project workflow.

## Contents

- [CLI Bootstrap](../cli-utilities/bootstrap.md) - Bootstrap a repo with `oat init`, guided setup, and initial provider adoption.
- [Tool Packs](../cli-utilities/tool-packs.md) - Install, update, inspect, migrate, and remove bundled OAT skills and agents at project or user scope.
- [Config and Local State](../cli-utilities/config-and-local-state.md) - Config, backlog, local paths, diagnostics, and related utility commands.
- [Workflow Gates](../cli-utilities/workflow-gates.md) - Per-skill final commands, review gates, and cross-runtime prompt dispatch.
- [Docs Tooling Commands](../docs-tooling/commands.md) - Docs app scaffolding, migration, index generation, and nav sync.
- [Provider Sync](../provider-sync/index.md) - Sync behavior, provider capabilities, config, and drift management.
- [Agentic Workflows](../workflows/index.md) - Tracked project execution, skills, ideas, and workflow routing.
- [Workflow & Projects](../workflows/projects/index.md) - Project lifecycle, artifacts, reviews, PR flow, and state-machine docs.
- [Repository PR Comment Analysis](../workflows/projects/repo-analysis.md) - Detailed `oat repo pr-comments ...` behavior.

## Full CLI Reference Expansion Path

Keep this page as the command-family map. Fuller command coverage should live either in the owning section for a command family or in generated/semi-generated reference pages that link back here.

Each full command reference should include:

- exact arguments, flags, defaults, aliases, and mutually exclusive options
- output examples, including `--json` shapes where the CLI supports JSON
- exit behavior for success, validation errors, missing state, and non-interactive blockers
- side effects such as file writes, generated artifacts, config mutations, branch/commit behavior, and network calls
- non-interactive usage guidance, including required flags and scripting-safe forms
- source or test references for behavior that is easy to drift, marking unknown exit-code behavior as unknown instead of inventing a contract

The first practical expansion path is to keep improving the existing owners: [Docs App Commands](../docs-tooling/commands.md), [Provider Interop Commands](../provider-sync/commands.md), [Config and Local State](../cli-utilities/config-and-local-state.md), [Tool Packs](../cli-utilities/tool-packs.md), [Workflow & Projects](../workflows/projects/index.md), and [Repository PR Comment Analysis](../workflows/projects/repo-analysis.md).

## Command Groups

| Command group                                   | What it covers                                                                                                                                                                                                             | Go deeper                                                                          |
| ----------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------- |
| `oat init`                                      | Bootstrap canonical OAT directories, sync config, optional hooks, and guided setup.                                                                                                                                        | [CLI Bootstrap](../cli-utilities/bootstrap.md)                                     |
| `oat tools ...`                                 | Install, inspect, update, remove, and migrate bundled OAT tool packs and assets across project and user scope.                                                                                                             | [Tool Packs](../cli-utilities/tool-packs.md)                                       |
| `oat pjm ...`                                   | Adopt PJM for a repository and record it (`init`), run read-only adoption and reference diagnostics (`doctor`), and migrate legacy layouts to `pjm/` + `reference/` (`migrate`). Adoption is separate from pack placement. | [Install vs. initialize](../cli-utilities/tool-packs.md#install-vs-initialize)     |
| `oat decision ...`                              | Create, index, and migrate file-per-record repo decisions under `reference/decisions/` (`init`, `new`, `regenerate-index`, `migrate`).                                                                                     | [Config and Local State](../cli-utilities/config-and-local-state.md#oat-decision-) |
| `oat backlog ...` / `oat local ...`             | File-backed backlog helpers, local path sync, and local-only operational support.                                                                                                                                          | [Config and Local State](../cli-utilities/config-and-local-state.md)               |
| `oat config ...` / `oat instructions ...`       | Config discovery, source-aware config dumps, supported mutations, and instruction-integrity helpers.                                                                                                                       | [Config and Local State](../cli-utilities/config-and-local-state.md)               |
| `oat gate ...`                                  | Per-skill final gate config, review-specific gate execution, exec-target registry writes, and cross-runtime prompt dispatch.                                                                                               | [Workflow Gates](../cli-utilities/workflow-gates.md)                               |
| `oat state ...` / `oat index ...` / `internal`  | Repo dashboard refresh, repo indexing, validation helpers, and diagnostics.                                                                                                                                                | [Config and Local State](../cli-utilities/config-and-local-state.md)               |
| `oat docs ...`                                  | Docs app bootstrap, migration, index generation, nav sync, and docs workflow entrypoints.                                                                                                                                  | [Docs Tooling Commands](../docs-tooling/commands.md)                               |
| `oat status` / `oat sync` / `oat providers ...` | Provider sync, drift inspection, provider configuration, and adoption behavior.                                                                                                                                            | [Provider Sync](../provider-sync/index.md)                                         |
| `oat project ...` / `oat cleanup ...`           | Project scaffolding, active-project status inspection, tracked-project listing, plan validation, archive creation, and project/artifact cleanup commands.                                                                  | [Workflow & Projects](../workflows/projects/index.md)                              |
| `oat review ...`                                | Review artifact discovery helpers, including latest-review resolution for project and ad-hoc review flows.                                                                                                                 | [Reviews](../workflows/projects/reviews.md)                                        |
| `oat repo ...`                                  | Repository-level workflows such as archive sync and PR-comment analysis.                                                                                                                                                   | [Repository Analysis](../workflows/projects/repo-analysis.md)                      |

Notable commands introduced in the current CLI surface:

- `oat project new <slug> --scope shared|local|synced [--force]` - create a
  project in an explicit scope. Without `--scope`, creation uses
  `projects.defaultScope`, which defaults to `synced`. Project slugs are
  unique across all scopes by default, including recorded or remotely
  published synced projects. `--force` deliberately permits a duplicate; use
  an explicit project path with `project open` or `project pause` whenever a
  slug is ambiguous across scopes.
- `oat project scope [project] --format value|json` - resolve a project's
  storage scope without inspecting its path manually.
- `oat project push [project] [--message <message>]` - commit pending synced
  artifacts, reconcile with the exact project ref on `origin`, publish it, and
  refresh an open PR's artifact-links block. Use `--no-refresh-pr` to skip the
  PR edit. With `--json`, success returns `status` (`pushed` or `up-to-date`),
  the full project-ref `sha`, the retained `ref`, and optional `prRefresh`;
  conflict and rejected outcomes return their corresponding `status` and exit
  nonzero.
- `oat project pull [project] [--no-commit]` - fetch and materialize or update a synced
  checkout. Resolve a rebase conflict and run `pull --continue`, or use
  `pull --abort` to return to the pre-pull state. Coordination children are
  pulled by default; `--no-children` limits the operation to the selected
  project. When pull adopts a remote project with no local discovery record,
  `--no-commit` leaves the new record uncommitted for the caller to persist.
  With `--json`, the receipt includes `status`, `sha`, and `ref`, plus
  `conflicts` when applicable and per-child results when coordination children
  were requested. A project whose authoritative ref is
  `refs/oat/completed/<project>` is terminal and cannot be pulled or opened.
  A same-SHA `refs/oat/projects/<project>` ref is only an inert alias; differing
  active and completed SHAs are reported as a terminal mismatch that must be
  repaired before lifecycle work continues.
- `oat project links [project] --format markdown|json` - render SHA-pinned
  links for the linkable artifacts on the project ref. On GitHub origins the
  artifacts become full-SHA blob links; other hosts degrade to the retained ref
  and short SHA without guessing a web URL. `--durable-summary <path>` accepts
  only a path contained in the repository, normalizes it repository-relative,
  and renders it as a code span rather than a guessed remote link. Completed
  projects resolve through `refs/oat/completed/<project>` while the rendered
  artifact URLs remain pinned to the verified full source SHA.
- `oat project pause [project]` - persist the pause state and clear the active
  project pointer. If synced publication is declined or fails after the pause
  commit is created, that clean commit is retained; address the publication
  failure and rerun `pause` to publish it.
- `oat project prune [project] [--force] [--no-commit]` - remove every
  checkout, the local and remote project refs, and the tracked record. When the
  project is omitted, the active project is used. This is the explicit
  destructive operation; `--force` may discard dirty or unpushed artifacts,
  while `--no-commit` leaves the parent-record deletion for a library caller to
  commit. If remote deletion succeeds but local checkout removal fails, the
  local ref, record, and checkouts are retained. Resolve the reported local
  obstruction and retry `prune --force`; do not run `project push`, which would
  republish the deleted remote ref. For a completed project, explicit prune
  deletes the completed ref and any same-SHA active alias but preserves durable
  local and S3 archive snapshots. A differing-SHA terminal mismatch blocks
  prune and retains both refs.
- `oat project migrate <path> --to synced [--no-commit]` - migrate an existing
  shared project to synced storage while preserving its artifacts and
  retargeting the active project pointer. `--no-commit` leaves the parent
  record and source-tree transition uncommitted for a library caller.
- `oat project list --scope shared|local|synced` - filter tracked projects by
  scope. Add `--remote` to discover project refs that do not yet have a local
  record or checkout, and `--include-coordination` to include coordination
  parents. A malformed discovery record with no materialized checkout appears
  as a `recorded-invalid` row. When the checkout is materialized, its existing
  row instead carries the restore hint and `recordError` parse diagnostic in
  `--json` output. Fully retired completed refs and same-SHA active aliases are
  omitted from active discovery. A differing-SHA active/completed pair appears
  as a `terminal-invalid` row with a recovery diagnosis. When reconciling a
  local synced record or checkout, only a verified missing
  `refs/oat/completed/<project>` result counts as absence. Transport,
  authentication, and other lookup failures fail the command closed; they are
  never converted into a `recorded-absent` row or pull guidance.
- `oat tools migrate --pack <pack> --from <scope> --to <scope>` - move one installed pack between project and user scope. Always previews first, installs and re-inventories the destination before touching the source, and offers source removal only after the destination is verified complete. Declining or running non-interactively leaves the pack installed at both scopes rather than failing. `--dry-run` stops after the preview; there is no force flag. See [Tool Packs](../cli-utilities/tool-packs.md#oat-tools-migrate).
- `oat pjm doctor --json` - read-only repository PJM diagnostics whose result carries an additive `adoption` object (`state` of `declared` | `inferred-legacy` | `partial-initialization` | `none`, `repoRoot`, and `recovery`). This, not `oat tools has project-management`, is the check that answers whether _this repository_ adopted PJM.
- `oat config dump --json` - merged config with source attribution
- `oat project status --json` - full parsed state for the active tracked project. **Stable contract for skills:** the JSON output is a typed read interface for OAT skills; the field set consumed by migrated skills is locked by `MIGRATED_FIELDS` in `packages/cli/src/commands/project/status.test.ts`. Removing or renaming any of `project.{name, path, phase, phaseStatus, workflowMode, docsUpdated, lastCommit, prStatus, prUrl}` is a breaking change and will fail the contract test.
- `oat project status --field <path>` - print one arbitrary dot-path field from the same status payload, e.g. `project.workflowMode` or `project.timestamps.stateUpdated`. Missing/null fields print `null`; object and array fields print compact JSON.
- `oat project status --project-path <path>` - read from a repo-relative or absolute project path instead of `.oat/config.local.json`'s active project pointer. Combine it with `--field` or `--shell` when a skill has already resolved the target project path.
- `oat project status --shell NAME=path ...` - print shell-safe assignments for one or more fields from one status read, e.g. `WORKFLOW_MODE='quick'`. This is the preferred multi-field read API for skills. See [Writing Skills → Reading project state](../contributing/skills.md#reading-project-state) for examples and the `npx`-backed `oat` shim contract.
- `oat review latest --json` - find the newest review artifact by `oat_generated_at`, scanning the active or specified project's `reviews/` and `reviews/archived/` directories plus ad-hoc review locations. Same-time candidates use target priority, then lifecycle recency (`final` > higher phase/task > lower phase/task). The JSON contract returns `path`, `scope`, `generatedAt`, `kind` (`project` or `adhoc`), `archived`, and `actionable`, with `null` values when no review exists. Archived project reviews remain discoverable as history but return `actionable: false`.
- `oat project list --json` - summary state for tracked projects under the configured projects root
- `oat project complete-state <project-path>` - apply the canonical completed-state mutation to a project's `state.md`; used by `oat-project-complete` during lifecycle closeout
- `oat project archive [project-path] [--project-recap-run <project-relative-path>] [--no-commit]` - archive a tracked project through the same local move, summary export, and configured S3 upload path used by completion. When omitted, the project path falls back to the active project. The optional recap path must identify a `project-recap` run inside the project's `explainers/` directory. Archive stages the selected complete package into `.oat/repo/reference/project-recaps/<YYYYMMDD-project-slug>/`, verifies every manifest-declared immutable file byte, then atomically installs the export before deleting the active project. Existing destinations, incomplete legacy hash coverage, stale bytes, path escapes, and recipe mismatches fail without removing the active project. For synced projects, a configured S3 upload must succeed before terminal cleanup. Successful closeout makes `refs/oat/completed/<project>` authoritative, deletes the tracked JSON record and nested checkout, and leaves archive metadata sufficient for an idempotent recordless retry. Legacy complete records receive a cleanup diagnosis rather than pull/open guidance. `--no-commit` is a manual/library-only option: for a synced project it still removes the checkout but deliberately omits the lifecycle commit receipt. Never pass it through `oat-project-complete`, which requires that receipt.
- `oat repo archive sync [project-name]` - hydrate archived project snapshots from the configured repo-scoped S3 archive into `.oat/projects/archived/`. The old `oat project archive sync` path remains as a deprecated shim.
- `oat project validate-plan --project-path <path>` - validates `oat_plan_parallel_groups` metadata in `plan.md`; exits non-zero on invalid. See [Implementation Execution](../workflows/projects/implementation-execution.md#parallel-phase-groups).
- `oat project log append|check|synthesize|rollup` - manage the optional append-only project observation log: append validated judgment or structural entries, inspect grammar and synthesis status, complete end-of-run synthesis, and roll observations into `summary.md` plus the configured repository ledger. See [Project Log](../cli-utilities/project-log.md).
- `oat project set-mode` — deprecated no-op. Execution mode is no longer user-selectable; emits a deprecation warning and preserves the `--json` contract.
- `oat gate review <prompt...>` - run a stateful, headless OAT review through the target registry, parse the produced review artifact, and exit nonzero for configured blocking findings. `--timeout-ms <milliseconds>` overrides target, `workflow.gateTimeouts`, environment, and scope defaults; accepted values are 1,000–14,400,000. Final/phase/range code reviews default to 30 minutes, while task code and artifact reviews default to 15 minutes. With `--json`, the result envelope on exit is the canonical completion signal: `status` is `ok` | `blocked` | `review_failed` | `artifact_missing` | `artifact_validation_failed` | `targeting_correlation_failed`, alongside `runId`, `generatedAt`, and `artifactPath` when available. `artifact_missing` means an accepted child exited cleanly without an artifact; fix synchronous review/artifact completion and start a new run, without review-receive or same-run remediation. For `targeting_correlation_failed`, correct the project declaration or artifact routing and start a new run; do not run review-receive even if an artifact path is present. For `artifact_validation_failed`, correct the artifact and rerun the gate until it revalidates as `ok` or `blocked`. Invoke `oat-project-review-receive` only when all three conditions hold: `status` is `ok` or `blocked`, `receiveEligible` is `true`, and `handoff` is non-null. `review_failed` may include structured `refusal`, `noOutputProduced`, and metadata-only `activityEvidence`; these diagnostic fields never make a run receive-eligible. After a timeout, a validated run-correlated artifact returns the ordinary `ok` or `blocked` envelope with additive `lateCompletion: true`. Duplicate run-ID matches or a changed artifact with a mismatched run ID retain `targeting_correlation_failed` and `receiveEligible: false`. Orchestrators should read the structured result rather than poll the filesystem. See [Workflow Gates](../cli-utilities/workflow-gates.md).
- `oat gate route --expect-runtime <runtime> --expect-model <model> --can-await <true|false> --json` - return the headless child route (`inline`, `delegate-sync`, or `refuse`) from provider-marker and model evidence. Ambiguous or contradictory evidence never routes inline.
- `oat gate exec <prompt...>` / `oat gate cross-provider-exec <prompt...>` - run a generic target prompt. `--timeout-ms` uses the same validated CLI override; untyped runs otherwise retain the legacy default path.
- `oat gate target set <id> --invocation-model <model|provider-default> --invocation-reasoning-effort <effort|provider-default>` - persist optional configured invocation metadata alongside an exec target without inferring it from the target command.
- `oat gate target set <id> --timeout-ms <milliseconds>` - persist a validated per-target gate budget.
- `oat gate target list --json` - inspect resolved gate targets without selecting or executing a reviewer. Each entry reports its config origin, whether it is explicitly configured and enabled, current availability, and normalized configured invocation values (`unknown` when omitted).
- `oat gate cross-provider-exec <prompt...>` - choose an available exec target while avoiding the current runtime by default, then run the prompt with the chosen target's configured base command and exit with the child status.

## `oat config` surface flags

`oat config set` supports mutually exclusive surface flags that control which config file receives the write:

- `--shared` — write to `.oat/config.json` (committed team repo settings)
- `--local` — write to `.oat/config.local.json` (per-developer repo state, gitignored)
- `--user` — write to `~/.oat/config.json` (user-level fallback, applies across all repos)

When no flag is passed, the CLI picks a sensible default per key type: structural keys (`projects.root`, `documentation.*`, etc.) go to shared, state keys (`activeProject`, etc.) go to local, workflow preferences (`workflow.*`) go to local. Pass at most one flag — the command rejects multiple surface flags.

Per-key restrictions apply: structural keys can only be written at shared scope, most state keys can only be written at local scope (`activeIdea` is the exception — it accepts both local and user), and workflow preference keys accept any non-auto surface. Legacy `autoReviewAtCheckpoints` remains shared-only; prefer `workflow.autoReviewAtHillCheckpoints`.

## `workflow.*` preference keys

The `workflow.*` namespace holds user-facing workflow preferences that let you answer repetitive confirmation prompts once and have OAT skills respect the answer automatically. Common keys:

- `workflow.hillCheckpointDefault` (`every` | `final`) — default HiLL checkpoint behavior in `oat-project-implement`
- `workflow.archiveOnComplete` (`boolean`) — skip the archive prompt in `oat-project-complete`
- `workflow.createPrOnComplete` (`boolean`) — skip the "Open a PR?" prompt in `oat-project-complete`
- `workflow.postImplementSequence` (legacy `wait` | `summary` | `pr` | `docs-pr`, or structured `{preApproval, postApproval}` arrays) — approval-aware post-implementation chaining
- `workflow.reviewExecutionModel` (`subagent` | `inline` | `fresh-session`) — default final-review execution model
- `workflow.autoReviewAtHillCheckpoints` (`boolean`) — auto-run the extra lifecycle review at HiLL checkpoints
- `workflow.autoNarrowReReviewScope` (`boolean`, default `true`) — automatically narrow re-reviews to the guarded range after the prior matching review's recorded head; set `false` to use the nominal full scope
- `workflow.autoArtifactReview.plan` (`boolean`, default `true`) — auto-run the bounded `plan.md` artifact-review loop before implementation handoff
- `workflow.autoArtifactReview.analysis` (`boolean`, default `true`) — auto-run the bounded accuracy-review loop for generated analysis artifacts before apply workflows consume them
- `workflow.gateTimeouts.code` / `workflow.gateTimeouts.artifact` (integer milliseconds from 1,000–14,400,000) — review-type budget defaults below CLI and target overrides

These workflow keys resolve through config files and defaults (`local > shared > user > default`). Some config keys have explicit environment aliases, but `workflow.autoArtifactReview.plan` and `workflow.autoArtifactReview.analysis` do not. See [Workflow preferences in the Configuration guide](../cli-utilities/configuration.md#workflow-preferences-workflow) for full descriptions, surface guidance, and cross-repo foot-gun examples.
