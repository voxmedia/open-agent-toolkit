---
id: BL-261002-preserve-pjm-remote-settings
title: Preserve pjm.remote settings when oat pjm init or migrate --apply reruns
status: closed
priority: high
scope: task
scope_estimate: S
labels:
  - pjm
  - config
  - cli
  - safety
  - docs-overhaul-followup
assignee: null
created: 2026-10-02T18:36:26.332Z
updated: '2026-10-05T03:05:32Z'
associated_issues: []
external_plans: []
---

## Description

Rerunning `oat pjm init` or `oat pjm migrate --apply` silently deletes the whole
`pjm.remote` block from `.oat/config.json`. `initializeRepoReference` writes
`{...config, pjm: {initialized, schemaVersion}}`
(`packages/cli/src/commands/pjm/init.ts:223-231`), replacing the `pjm` object
instead of merging into it, and `writeOatConfig` does not merge with what is on
disk (`oat-config.ts:2324-2340`). `oat pjm migrate --apply` reaches the same
code (`migrate.ts:547-548`). No warning is printed.

Why it matters: remote description mode, authority policy, per-provider
settings and storage mode silently fall back to defaults. A repository that had
switched to `shared` storage reverts to `local`, which hides remote journals
already written under `.oat/repo/pjm/remote/state/`.

Reproduced with the branch CLI in a scratch repository: set
`pjm.remote.policy.authority.default user-approved` and a provider authority,
run `oat pjm init` again (exit 0, "Skipped existing: …", no warning), and
`.oat/config.json` becomes `{"version":1,"pjm":{"initialized":true,"schemaVersion":1}}`;
`oat config get pjm.remote.policy.authority.default` prints an empty line. No
init test covers `pjm.remote` preservation.

Evidence: `.oat/projects/shared/docs-improvement-overhaul/references/fable-lanes/verification/E-pjm-remote-backlog.verify.md`
(finding (f) and its reproduction steps).

Source: product defect list `.oat/projects/shared/docs-improvement-overhaul/references/product-defects-found.md` (docs-improvement-overhaul project, 2026-10-02), entry A1.

## Acceptance Criteria

- Rerunning `oat pjm init` and `oat pjm migrate --apply` on an adopted
  repository preserves every existing `pjm.*` key other than the ones the
  command owns (`initialized`, `schemaVersion`), including all of `pjm.remote`.
- A regression test seeds `pjm.remote` (description, authority default,
  provider authority, storage state) and asserts it is byte-for-byte unchanged
  after both commands; the test fails when the merge is removed.
- If either command ever must rewrite `pjm.remote`, it says so in its output
  before writing.
- The warnings about this behavior on the docs branch `docs-overhaul-readme-visual`
  (`getting-started/index.md:58`, `getting-started/tool-packs.md:1255`,
  `workflows/backlog-and-planning/backlog-lifecycle.md:253`,
  `workflows/ideas/lifecycle.md:90`, and any matching note in
  `workflows/backlog-and-planning/remote-project-management.md`) are removed
  once the fix ships.
