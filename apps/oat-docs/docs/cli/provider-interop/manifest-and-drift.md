---
title: Manifest and Drift
description: 'Manifest tracking, drift states, and stray adoption for canonical-to-provider reconciliation.'
---

# Manifest and Drift

## Manifest locations

- Project: `.oat/sync/manifest.json`
- User: `~/.oat/sync/manifest.json`

## Manifest purpose

Tracks managed mappings so the CLI can:

- detect drift safely
- avoid deleting unmanaged provider content
- execute scoped removals only for managed entries

For transformed mappings such as project-scoped rules, the manifest stores hashes for the rendered provider output that was actually written, not the canonical source markdown. This keeps drift detection aligned with the on-disk managed file.

## Drift states

- `in_sync`
- `drifted`
- `missing`
- `stray`

`drifted` reasons currently include:

- `modified`
- `broken`
- `replaced`

Rendered rule files participate in the same drift states as other managed copies. If a provider rule file is edited directly, drift is computed against the expected rendered output for that provider.

## Stray adoption

`oat init` and `oat status` can offer adoption of unmanaged provider entries into canonical `.agents`.

For rules, adoption maps provider-native files back into `.agents/rules/*.md`:

- Claude: `.claude/rules/*.md`
- Cursor: `.cursor/rules/*.mdc`
- Copilot: `.github/instructions/*.instructions.md`

After adoption, `oat sync` regenerates the managed provider copies from the canonical rule file.

## Reference artifacts

- `.oat/projects/<scope>/<project>/spec.md` (FR2, FR3, FR6)
- `.oat/projects/<scope>/<project>/design.md`
- `packages/cli/src/manifest/**`
- `packages/cli/src/drift/**`
