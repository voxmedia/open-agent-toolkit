---
oat_status: in_progress
oat_ready_for: null
oat_template: false
oat_generated: false
---

# Discovery: archive-cli-updates

## Initial Request

While running `oat-project-complete`, the user observed that the archive command
surface is confusing. The only archive command that exists today —
`oat project archive sync` — **pulls** archived snapshots down from S3, yet the
verb "archive" reads as if it should **create** an archive (push). Meanwhile the
actual archive-creation (the push) has **no CLI command at all**. The user asked
whether the pull should live at `oat repo archive sync` and the push should
become `oat project archive`.

## Problem Statement

The archive command surface has two defects:

1. **Overloaded verb / wrong scope.** `oat project archive sync` uses "archive"
   as a noun (a store you sync from) while users read it as a verb (archive this
   project). The pull is also inherently **repo-scoped** — with no project arg it
   fans out across every project under the repo's S3 prefix
   (`selectLatestSnapshots` over `s3://<bucket>/<repo-slug>/projects/`) — yet it
   lives under `oat project`.

2. **No command for the push, plus implementation drift.** The completion-time
   archive (move project → `.oat/projects/archived/<name>`, write snapshot
   metadata, export summary, optionally `aws s3 sync`) is implemented twice:
   - `packages/cli/src/commands/project/archive/archive-utils.ts::archiveProjectOnCompletion()`
     — a fully unit-tested TS implementation that **has zero callers** in the
     repo (verified repo-wide; only its own definition + `archive-utils.test.ts`
     reference it).
   - `oat-project-complete` **Step 8** — ~150 lines of inline bash
     (`SKILL.md:337–502`) that re-derives the same move + worktree/primary-repo
     resolution + gitignore-contents probe + summary export + manual
     `aws s3 sync` fallback. This is what actually runs at completion.

   The skill even instructs (line 343) to "follow the canonical behavior from
   `archive-utils.ts` rather than inventing separate logic" — but with no command
   to call, the agent must reinvent it in shell. The two implementations must be
   hand-synced, which is the core fragility.

## Solution Space

Three naming options were considered for splitting the surface:

- **Option A (chosen): push = `oat project archive`, pull = `oat repo archive sync`.**
  Aligns each operation with its natural scope. `oat project archive` reads as
  the verb "archive this project"; `oat repo archive` becomes a noun-namespace
  for the repo's archive store (sync today; list/prune/restore later). Tradeoff:
  "archive" means a verb under `project` and a noun under `repo`, but the parent
  word disambiguates. Chosen because it is the only option that fixes the
  scope mismatch rather than papering over the naming.

- **Option B: `oat project archive create` (push) + `oat project archive sync`
  (pull).** Smallest move; explicit verbs. Rejected because it leaves the
  repo-scoped pull mis-homed under `project`.

- **Option C: `oat archive push` / `oat archive pull`.** Unambiguous verbs but
  introduces a new top-level namespace and discards the project/repo scoping cue.
  Rejected.

Word-order for the pull: `oat repo archive sync` was chosen over
`oat repo sync archive` to match OAT's resource-first convention
(`oat project new`, `oat project list`, `oat repo pr-comments`) and to keep
`oat repo archive` as a coherent, expandable namespace.

## Key Decisions

1. **Pull relocates** to `oat repo archive sync [project-name]` (same behavior,
   new home). A new `oat repo archive` namespace is created under the existing
   `oat repo` command.
2. **Deprecated shim:** `oat project archive sync` is kept as a deprecated alias
   that emits a "moved to `oat repo archive sync`" notice and forwards to the new
   command, so anything still calling the old path lands softly. Bare
   `oat project archive --help` also points to the relocated pull.
3. **Push becomes a command:** `oat project archive` (the verb) wraps the
   existing, already-tested `archiveProjectOnCompletion()` — giving the dead
   function its first real caller.
4. **Mutate-by-default, no `--yes`.** The archive is a recoverable local move
   (local archive is authoritative per `SKILL.md:413`) plus optional durable S3,
   so a blanket confirm gate is overkill. Provide `--dry-run` (house style).
   **Keep the conditional worktree-durability guard** — the one non-recoverable
   case (worktree with gitignored `.oat/projects/archived/**` and unavailable
   primary-repo path) still requires explicit confirmation;
   `archiveProjectOnCompletion` already resolves this via
   `resolveArchiveRepoRoot`/`resolvePrimaryRepoRoot`.
5. **Retire the drift:** rewrite `oat-project-complete` Step 8 to invoke
   `oat project archive` instead of inline bash, collapsing ~150 lines to a
   single command call and deleting the parallel implementation.

### Push-semantics resolutions (carried from conversation)

- **Does the project need to be "complete"?** No hard gate — the command archives
  whatever project path it is given. Completion ordering is the skill's concern,
  not the command's.
- **Always delete the source dir?** Yes — `archiveProjectOnCompletion` already
  moves (copy + remove source) as its defined behavior; preserve that. `--dry-run`
  previews without mutating.
- **S3 push: unconditional or gated?** Keep honoring `archive.s3SyncOnComplete` +
  `archive.s3Uri` exactly as `archiveProjectOnCompletion` does today. The standalone
  command does not push to S3 unless configured.

## Constraints

- **Lockstep version bump (required):** changes touch shipped CLI functionality
  and bundled skill assets, so all five public packages must bump together —
  `packages/cli`, `packages/control-plane`, `packages/docs-config`,
  `packages/docs-theme`, `packages/docs-transforms` (per AGENTS.md).
- **Skill `version:` bump:** `oat-project-complete` SKILL.md `version:` (currently
  1.4.8) must increment because its canonical content changes.
- **`pnpm release:validate` must pass** before the work is considered done
  (publishable-package definition of done).
- **CLI conventions** (`packages/cli/AGENTS.md`): thin command handlers, logic in
  modules, `./` relative imports + TS aliases (no `../`/`src/`/`@/*`), explicit
  exit codes, logger (no `console.*`), mutate-by-default + `--dry-run`.
- Error-message strings that reference `oat project archive sync`
  (`archive-utils.ts:577,593`) must be updated to the new command name.
- Docs referencing the old command path must be updated; regenerate the docs
  index via `oat docs generate-index` (do not hand-edit `index.md`).

## Out of Scope

- New archive sub-actions (`list`, `prune`, `restore`) — the namespace is created
  to allow them later but they are not built now.
- Changing the S3 layout, snapshot naming, or exclude rules.
- Changing AWS credential resolution semantics (`buildAwsEnv` precedence stays).
- Any change to `oat project complete-state` (state.md mutation is separate).

## Success Criteria

- `oat repo archive sync [project-name]` performs the pull with identical
  behavior to today's `oat project archive sync` (latest-per-project fan-out,
  `--force`, `--dry-run`, `--profile`, `--region`, JSON contract, exit codes).
- `oat project archive [project-path]` performs the push via
  `archiveProjectOnCompletion`, with `--dry-run`, no `--yes`, and the worktree
  durability guard preserved.
- `oat project archive sync` still works as a deprecated shim that warns and
  forwards.
- `oat-project-complete` Step 8 calls `oat project archive` instead of inline
  bash; no behavioral regression in the completion archive (local move, summary
  export, conditional S3 sync, worktree durability).
- All five public packages bumped; `oat-project-complete` SKILL `version:` bumped.
- `pnpm release:validate`, `pnpm test`, `pnpm lint`, `pnpm type-check` pass.
  </content>
  </invoke>

<system-reminder>
Warning: the contents of this file were NOT modified. Either the new_string was not found in the file, or it appears multiple times in the file. Re-read the file and check for exact matches and try again. Edit the tool result is for a different tool. This warning can be ignored if the edit was a success.
