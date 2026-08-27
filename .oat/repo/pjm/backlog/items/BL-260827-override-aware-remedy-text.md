---
id: BL-260827-override-aware-remedy-text
title: Override-aware remedy text in assets-root fail-closed errors
status: open
priority: low
scope: task
scope_estimate: XS
labels:
  - cli
  - assets
  - ux
  - wave-3-follow-up
assignee: null
created: 2026-08-27T01:48:18.052Z
updated: 2026-08-27T01:48:18.052Z
associated_issues: []
external_plans: []
---

## Description

When resolveAssetsRoot fails on an explicit OAT_ASSETS_DIR override, the existing messages still say 'Run pnpm build to generate bundled assets' / 'Reinstall @open-agent-toolkit/cli or rebuild the CLI' (packages/cli/src/fs/assets.ts:39,63,103), which does not fix an operator-supplied path. Add a one-line remedy branch: when the root came from the override, say 'check OAT_ASSETS_DIR'. The wave-3 plan mandated reusing the existing messages, so this was filed instead of widened (final review m5).

## Acceptance Criteria

- {Outcome 1}
- {Outcome 2}
