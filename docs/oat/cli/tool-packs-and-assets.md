# Tool Packs and Installed Assets

This page covers CLI commands that manage bundled OAT tool packs and installed OAT skill assets in canonical directories.

## `oat init tools`

Purpose:
- Install bundled OAT tool packs (`ideas`, `workflows`, `utility`)
- Copy/update OAT skills and related assets into canonical directories for the selected scope

Key behavior:
- Pack-oriented install subcommands: `ideas`, `workflows`, `utility`
- Tracks installed vs bundled skill versions and reports outdated skills
- Interactive runs can prompt to update selected outdated skills
- Non-interactive runs report outdated skills without mutating them
- Pack subcommands support `--force` to overwrite instead of preserving local installed versions

Notes:
- This is an installed-asset lifecycle command, not a provider-interop sync command.
- After changing canonical assets, use `oat sync --scope ... --apply` to fan out updates to provider views.

## `oat remove`

Purpose:
- Remove installed skills and managed provider views

Key behavior:
- Dry-run by default; `--apply` performs deletions
- Supports both single-skill and pack removal workflows
- Removes canonical skill directories plus manifest-managed provider views for the selected scope(s)
- Preserves unmanaged provider views and reports warnings instead of deleting them

## `oat remove skill <name>`

Purpose:
- Remove one installed skill by name (for example, `oat-idea-scratchpad`)

Key behavior:
- Dry-run default with `--apply` opt-in
- Scope-aware execution across `project`, `user`, or `all`
- Emits structured JSON payloads in `--json` mode for dry-run/apply/not-found outcomes

## `oat remove skills --pack <ideas|workflows|utility>`

Purpose:
- Remove all installed skills from a bundled OAT pack

Key behavior:
- Pack membership is derived from installer constants (`IDEA_SKILLS`, `WORKFLOW_SKILLS`, `UTILITY_SKILLS`)
- Reuses single-skill removal behavior for each selected skill
- Dry-run default with aggregate summary; apply mode supports interactive confirmation for larger removals
- Emits a single aggregate JSON payload in `--json` mode

Related docs:
- Bootstrap (`oat init`): `bootstrap.md`
- Provider interop (`oat status`, `oat sync`, `oat providers ...`): `provider-interop/index.md`
- Diagnostics (`oat doctor`): `diagnostics.md`
