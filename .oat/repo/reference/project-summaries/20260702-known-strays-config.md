---
oat_status: complete
oat_ready_for: null
oat_blockers: []
oat_last_updated: 2026-07-02
oat_generated: true
oat_summary_last_task: p03-t01
oat_summary_revision_count: 0
oat_summary_includes_revisions: []
---

# Summary: known-strays-config

## Overview

This project added an explicit way to mark intentional provider-local files as
known strays so OAT does not report them as actionable drift or offer to adopt
them into canonical `.agents`. The motivating case was a Cursor-only skill at
`.cursor/skills/cloud-environment-setup`, with support required at both
project and user configuration levels.

## What Was Implemented

- Project sync config now supports `knownStrays` in `.oat/sync/config.json`.
  Entries are normalized, de-duplicated, sorted, and validated through the sync
  config schema.
- User config now supports `knownStrays` in `~/.oat/config.json`, allowing
  personal provider-local files to be suppressed without committing repo-wide
  config changes.
- A shared `filterKnownStrays` helper centralizes exact provider-path matching
  for stray reports and adoption candidates.
- `oat status` now filters configured known strays before table output, JSON
  summaries, hook output, remediation text, and interactive adoption prompts.
- `oat init` now filters configured known strays before warnings, JSON counts,
  prompts, and adoption loops.
- Provider-sync docs now explain the config shape, exact matching behavior,
  project/user examples, and the Cursor-only skill use case.
- The five lockstep public packages were bumped to `0.1.22`, and CLI bundled
  public-package version metadata was regenerated.

## Key Decisions

- Known-stray matching is exact after path normalization, not glob-based. This
  keeps the first implementation conservative and avoids hiding unrelated
  unmanaged provider files.
- Known strays are shared provider-sync policy rather than a Cursor-specific
  exception. The same helper and config resolution path are used by `oat status`
  and `oat init`.
- Project-level entries are appropriate for team-wide intentional provider
  files, while user-level entries are appropriate for personal provider-local
  files.

## Notable Challenges

- CLI type-checking initially needed the workspace `@open-agent-toolkit/control-plane`
  build output present before the focused CLI type-check could pass. The build
  output was generated locally and not committed.
- A p03 review found one minor docs consistency issue: the sync config page's
  consumer list omitted `oat status`. That was fixed before final review.

## Integration Notes

- `knownStrays` suppresses only `stray` reports and adoption candidates. Drift
  and missing-file semantics are unchanged.
- Configured paths normalize separators, trim whitespace, remove a leading
  `./`, and remove trailing slashes before exact matching.
- Sibling paths remain visible. For example,
  `.cursor/skills/cloud-environment-setup` does not suppress
  `.cursor/skills/cloud-environment-setup-extra`.
- Final verification passed full workspace `pnpm test`, `pnpm lint`,
  `pnpm type-check`, `pnpm build`, `pnpm release:validate`, plus docs build and
  focused CLI regression tests.
