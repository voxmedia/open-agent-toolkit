# Manifest and Drift

## Manifest locations

- Project: `.oat/sync/manifest.json`
- User: `~/.oat/sync/manifest.json`

Manifest tracks managed mappings for safe updates/removals.

## Drift states

- `in_sync`
- `drifted` (`modified`, `broken`, `replaced`)
- `missing`
- `stray`

## Stray adoption

`init`/`status` can offer adoption of unmanaged provider entries into canonical `.agents`.
