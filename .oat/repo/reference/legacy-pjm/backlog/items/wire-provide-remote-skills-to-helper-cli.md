---
id: bl-a7cd
title: 'Wire provide-remote skills to the review-remote helper layer via a CLI command'
status: open
priority: medium
priority_reviewed: '2026-05-29'
scope: feature
scope_estimate: L
labels: ['skills', 'review', 'cli']
assignee: null
created: '2026-05-29T00:00:00Z'
updated: '2026-05-29T00:00:00Z'
associated_issues: []
---

## Description

The `remote-review` project (PR #98) shipped two provide-remote skills plus eight tested helper modules under `packages/cli/src/review-remote/` (marker parser, posted-review-body builder, line mapper, re-review narrowing, project resolver, capability probe, worktree lifecycle, reviewer-dispatch — 102 tests). However, the skills do **not** invoke those helpers at runtime: each SKILL.md executes equivalent logic inline via bash/`jq`/`gh`. So CI proves the TS helpers are correct, but the TS is not what runs when the skill fires — the skill prose is. The two can drift silently without failing CI.

The interim mitigation (shipped with the project) is documentation-only: a drift-guard `README.md` in `packages/cli/src/review-remote/` and cross-reference notes in both SKILLs naming the canonical helper functions. This item tracks the proper fix.

Proposed change:

- Add an `oat review provide-remote` CLI command (and an `oat project review provide-remote` variant, or a shared subcommand with a `--project` flag) that orchestrates the full flow in TypeScript: PR resolution, ephemeral worktree checkout (or diff-only fallback), the helper layer (marker/body/line-map/narrowing/project-resolver), and `gh api` posting.
- Rewrite both provide-remote SKILL.md files to call that command instead of hand-rolling the bash/`jq`/`gh` flow, so the 102 helper tests cover the actual runtime and drift becomes impossible.
- Add integration tests for the command (stubbed `gh`/git) covering verdict mapping, inline-comment line mapping (including renamed-file pre-image paths — see the `parsePullFilesPatch` caller-contract note), out-of-diff downgrade, and re-review narrowing with the stale-SHA guard.

Links:

- Origin: final-review (independent v4 pass) finding M2 for project `remote-review`; see archived `final-review-2026-05-29-v4.md`.
- Sibling backlog: `bl-9fb8` (remote review follow-on skill set — respond-remote / summarize-remote).

## Acceptance Criteria

- The provide-remote skills execute their core logic through the shared `review-remote` helper modules (via a CLI command), not through duplicated inline bash.
- The renamed-file pre-image path case is handled by the command (not left to caller remapping).
- Integration tests exercise the command end-to-end against stubbed `gh`/git.
- The interim drift-guard docs (README + SKILL cross-references) are removed or updated once the skills call the helpers directly.
