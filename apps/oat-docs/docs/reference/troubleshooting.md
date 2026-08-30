---
title: Troubleshooting
description: 'Common issues and fixes for skills visibility, worktrees, sync, and manifest problems.'
---

# Troubleshooting

## Skills not visible in host UI

- Run: `pnpm run cli -- sync --scope all`
- Reload/restart host app session
- Verify `AGENTS.md` skills table matches `.agents/skills/*/SKILL.md`

## Worktree checkout missing provider links

- Run: `pnpm run worktree:init`
- This command installs dependencies, builds the workspace, and runs `oat sync --scope project`.

## Codex appears detected but no skill sync actions are listed

Expected for native-read skill mappings. Codex can read canonical skills without mirrored provider writes.

## Cursor appears detected but no skill sync actions are listed

Expected for native-read skill mappings. Verify project skills under
`.agents/skills` and personal skills under `~/.agents/skills`; Cursor reads
those canonical directories directly. Sync will not create `.cursor/skills`
mirrors.

Use `.cursor/skills` only for intentionally Cursor-specific packages. Interactive
`oat init` and `oat status` offer each unresolved Cursor-local skill for
canonical adoption or a remembered Keep Cursor-only choice.

## Copilot appears detected but no skill sync actions are listed

Expected for native-read skill mappings. Verify project skills under
`.agents/skills` and personal skills under `~/.agents/skills`; Copilot reads
those canonical directories directly. Sync will not create `.github/skills` or
`~/.copilot/skills` mirrors.

Legacy skills in those provider directories remain adoption candidates. Run
`oat sync --scope <project|user|all> --dry-run` before upgrading: verified clean
managed views may be removed, while changed or unverifiable paths are preserved
and detached from obsolete manifest ownership. Copilot agents and project rules
continue to sync to `.github/agents`, `~/.copilot/agents`, and
`.github/instructions`.

Interactive `oat init` and `oat status` offer each unresolved legacy skill for
canonical adoption or a remembered Keep Copilot-only choice. Keep is blocked
when a same-name canonical skill exists; rename one package before retrying.

## `sync` reports provider config mismatch

- For interactive runs, select detected providers to enable when prompted.
- For non-interactive runs, configure providers explicitly:
  - `oat providers set --scope project --enabled <providers> --disabled <providers>`
- Re-run `oat sync --scope project` after updating config.

## `instructions validate` reports `missing`, `content_mismatch`, or `stray`

- Run `oat instructions sync --dry-run` to preview changes.
- Run `oat instructions sync --strategy pointer|symlink|copy` to apply the expected `CLAUDE.md` shape.
- If mismatched `CLAUDE.md` files should be overwritten, run `oat instructions sync --force` (or combine it with `--strategy` if needed).
- If `stray` is reported, `oat instructions sync` will adopt the Claude-only file into `AGENTS.md` and then regenerate `CLAUDE.md`.
- If a broken or unreadable instruction path is reported, fix the underlying file or symlink target first; sync will intentionally skip manual-repair cases instead of forcing recovery.
- If a directory you expected to see is missing from the scan, confirm it is not under `.git`, `.oat`, `.worktrees`, or `node_modules`.
- Re-run `oat instructions validate` and confirm status is `ok`.

Use [Instruction Sync](../provider-sync/instruction-sync.md) for the full strategy matrix and state model.

## `doctor` warns about canonical directories

- Run `oat init` for the relevant scope.
- Re-run `oat doctor` after initialization.

## `doctor` warns about outdated installed OAT skills

- Run `oat init tools` to install/update bundled OAT tool packs.
- In TTY mode, select which outdated skills to update when prompted.
- In non-interactive mode, run the scoped command doctor prints:
  `oat tools update --pack <pack> --scope <scope>`.
- Per-pack install commands no longer accept the previously inert `--force`
  option.

## `sync` reports an unsafe provider parent

Errors containing `Unsafe provider parent`, `symbolic links are not allowed in
provider ancestry`, or `provider ancestry is not a directory` mean an existing
parent of a managed provider destination is a symlink or a non-directory entry.
OAT refuses to traverse, unlink, or rewrite that parent because it may be
user-managed or externally owned. Canonical content and external symlink targets
remain untouched.

Recover explicitly:

1. Inspect the reported parent and preserve or migrate any user-managed content.
2. Replace that provider parent with a real directory under the intended project
   or user sync scope.
3. Rerun sync with the matching scope:

   ```bash
   oat sync --scope project
   oat sync --scope user
   oat sync --scope all
   ```

Do not replace the parent until you understand who owns its existing target.
OAT intentionally does not automate this recovery.

## A user-installed pack is missing from shared `tools.*`

This is expected. `.oat/config.json#tools` records **project-scope** intent
only. A user install writes `tools.<pack>: true` to `~/.oat/config.json`
instead, and never touches repository config. Since every reusable pack now
defaults to user scope on a fresh install, an empty repository `tools` map is
normal.

Check effective project-plus-user availability with:

```bash
oat tools has <pack>
```

To confirm specifically that the user copy is present, run:

```bash
oat tools has <pack> --scope user
```

## `oat tools has <pack>` reports `false` for a pack I installed

Availability is complete-only: a scope counts only when every managed asset the
current release declares for it is present. A partially installed pack — for
example one missing a skill added in a newer release — reports `false`.

Read the reason from the JSON result and repair the named scope:

```bash
oat --json tools has <pack>
oat tools update --pack <pack> --scope <project|user>
```

`completeness` shows `complete`, `partial`, or `absent` per scope, and `missing`
lists the exact managed assets and paths behind a `false`.

## `status` or `doctor` reports a partial or stale pack

Both commands report managed pack state with a scoped recovery command:

- `partial` — some managed assets are missing, or intent is declared with none
  installed. Fix with `oat tools update --pack <pack> --scope <scope>`.
- `stale` — installed assets are behind the bundled release, or a managed skill
  or agent has the bundled version metadata but different canonical content.
  Expected executable-bit normalization on managed scripts is ignored. Fix with
  the same scoped update command.
- `newer` — installed assets are ahead of the bundle. This is informational and
  usually means the CLI is older than the assets; update the CLI rather than
  downgrading the pack.
- `retained-override` — a source-backed owner-owned seed differs from its
  bundled default, so OAT retains the edited copy instead of overwriting it. A
  bundle-equal seed is current and does not produce this finding. Retained
  overrides cover repository templates under `.oat/templates/` **and** seeded
  content such as `.oat/ideas/backlog.md` and `.oat/ideas/scratchpad.md`.
  Deleting the file is the right move only for a **template** you intentionally
  want OAT to seed from the bundle again; never delete seeded content you have
  edited, because the next install or update reseeds the bundled default in its
  place and your edits are gone. The finding is informational and carries no
  recovery command for exactly that reason.
- `user-agent-unmaterialized` — the pack installed canonical agents into
  `~/.agents/agents/`, but user scope materializes no provider view for them
  beyond the bundled managed role files. `oat tools update` cannot fix this.
  Install the pack at project scope (`oat tools install <pack> --scope project`)
  when you need its agents. See
  [Tool packs](../cli-utilities/tool-packs.md) for the full limitation.

## `status` or `doctor` reports `legacy-false-conflict`

An older repository left `tools.<pack>: false` in shared config while managed
assets for that pack are present. The `false` is never honored as an opt-out.
Choose one:

```bash
# adopt the existing install and rewrite intent as true
oat tools update --pack <pack> --scope <project|user>

# or remove the pack and delete the intent key entirely
oat tools remove --pack <pack> --scope <project|user>
```

## `status` or `doctor` reports `duplicate-scope`

The pack is installed at both project and user scope. This is a legitimate
state, and OAT deliberately does **not** infer which copy a provider executes.
Resolve it explicitly when you want one owner:

```bash
oat tools migrate --pack <pack> --from project --to user --dry-run
oat tools migrate --pack <pack> --from project --to user
```

The destination is installed and verified before source removal is offered, so
declining the confirmation leaves you exactly where you started — installed at
both scopes — rather than in a broken half-state.

## `oat tools migrate` leaves the pack at both scopes

That is the safe outcome, not a failure. Migration verifies the destination
first and removes the source only after an explicit confirmation. Declining, or
running non-interactively, reports status `retained-both`. Rerun the command
interactively to finish the move; the destination work is already done.

If source removal or its sync failed partway, the command prints structured
recovery instructions and retains source intent. Rerun the same command to
complete it. Never delete the source by hand while the recovery instructions are
outstanding.

## A PJM command refuses to write and asks for `oat pjm init`

Installing the `project-management` pack installs the **capability**. It does
not adopt PJM for a repository, and `oat backlog init` / `oat decision init` are
not alternate adoption paths. `oat pjm`, `oat backlog`, and `oat decision`
mutations fail closed until adoption is recorded.

Inspect the state, then adopt:

```bash
oat pjm doctor --json   # read adoption.state
oat pjm init
```

`adoption.state` is `declared` (explicit marker present), `inferred-legacy`
(complete legacy scaffold, no marker), `partial-initialization` (incomplete
scaffold — rerun `oat pjm init`), or `none`. `oat pjm init` records
`pjm.initialized` in `.oat/config.json` after verifying the canonical scaffold.

## A PJM template change is not taking effect

PJM templates resolve repository → user → bundle, first match wins. A
repository template under `.oat/templates/` is an owner override that pack
updates never rewrite, so it shadows the managed user default.

Delete the repository copy to fall back to the managed default, or update the
managed default itself:

```bash
oat tools update --pack project-management --scope user
```

## `--scope all` fails outside a Git repository

It should not. `oat status --scope all` and `oat doctor --scope all` complete
the user-scope work and report project scope as unavailable.
`oat tools update --scope all` also completes the user-scope work, but it skips
project scope silently rather than naming it in the result, so an empty project
section there means "no repository here", not "nothing to update". An
explicitly requested `--scope project` outside a repository is still a hard
failure, which is intentional — you asked for a scope that does not exist here.

## Manifest not found or invalid

- Missing manifest: run `sync` or `init`
- Invalid manifest: repair/remove file and rerun

## Status/output mismatches with lifecycle expectations

- Reconcile `state.md`, `plan.md` review table, and `implementation.md`.
- Ensure phase/review status has been updated after reviews and fix cycles.

## An Explainer Kit recap ends as `built-needs-review`

`built-needs-review` means the required unattended visual-review chain did not
reach a valid `pass`. The run retains available output for diagnosis, but OAT
will not finalize, archive, attest, publish, or push it as a successful recap.
Do not bypass the review gate by copying the package into a durable location.

Inspect:

1. `build-record.json` and `manifest.json` for the terminal outcome and warning.
2. `qa/browser/` for all required mobile, tablet, and desktop PNG/metrics pairs.
3. `qa/visual-review/attempt-*/request.json` and `result.json` for request
   binding, critic disposition, and findings.
4. `qa/visual-review/revision.json` when a correction was requested.
5. Adapter logs for missing or invalid `browserSession`, `visualCritic`, or
   correction-provider modules.

Common causes include unavailable Chromium, a fixture or unbranded session,
missing screenshots, invalid decoded PNG dimensions, runtime/capture identity
drift, critic exceptions, evidence mutation, `fail`, and an unresolved
correction. Fix the provider or artifact problem and rebuild the recap; partial
evidence is diagnostic only.

See
[Explainer Provider Integration](../workflows/skills/explainer-kit-providers.md)
for the trusted-session and critic contracts.

## Explainer Kit resume fails with `E_APPROVAL_RESUME`

Interactive resume is same-request only. Keep the opaque `ekrt2` token returned
as `approval.resumeToken` outside the package and provide it as
`reviewedSource.resumeToken` with the complete original request.

The error is expected when:

- the token is missing, malformed, or not `ekrt2`;
- the configured output root or retained run root moved;
- `run-request.json` or a retained set-plan record changed;
- the current request differs in source binding, recipe, mode, theme, render
  strategy, privacy, public URL, durability, or publish destination; or
- the package contains a legacy `ekrt1` token.

Do not edit retained files or weaken the current request to force a match.
Restore the exact original request and package bytes. Legacy paused runs cannot
be upgraded in place; restart them to receive an authenticated `ekrt2` token.

## Reference artifacts

- `.oat/projects/<scope>/<project>/implementation.md`
- `.oat/projects/<scope>/<project>/reviews/`
- `.oat/projects/<scope>/<project>/explainers/<slug>/qa/`
- `packages/cli/src/commands/doctor/index.ts`
- `packages/cli/src/commands/status/index.ts`
- `packages/cli/src/commands/tools/shared/pack-inventory.ts`
- `packages/cli/src/commands/instructions/`
