# Manifest and Drift

## Manifest locations

- Project: `.oat/sync/manifest.json`
- User: `~/.oat/sync/manifest.json`

## Manifest purpose

Tracks managed mappings so the CLI can:

- detect drift safely
- avoid deleting unmanaged provider content
- execute scoped removals only for managed entries

## Drift states

- `in_sync`
- `drifted`
- `missing`
- `stray`

`drifted` reasons currently include:

- `modified`
- `broken`
- `replaced`

## Stray adoption

`oat init` and `oat status` can offer adoption of unmanaged provider entries into canonical `.agents`.

## Reference artifacts

- `.oat/projects/<scope>/<project>/spec.md` (FR2, FR3, FR6)
- `.oat/projects/<scope>/<project>/design.md`
- `packages/cli/src/manifest/**`
- `packages/cli/src/drift/**`
