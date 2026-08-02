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
- In non-interactive mode, rerun the relevant pack subcommand with `--force` if you want to overwrite outdated installed skills.

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

This is expected. `.oat/config.json#tools` records project installation state,
so a user-only install does not set `tools.<pack>` in shared repo config.

Check effective project-plus-user availability with:

```bash
oat tools has <pack>
```

To confirm specifically that the user copy is present, run:

```bash
oat tools has <pack> --scope user
```

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
- `packages/cli/src/commands/instructions/`
