---
id: BL-260927-name-only-installed-pack
title: Name only installed pack locations in the OAT tools guidance block
status: open
priority: low
scope: task
scope_estimate: S
labels:
  - guidance
  - tool-packs
  - user-scope
assignee: null
created: 2026-09-27T03:35:38.090Z
updated: 2026-09-27T03:35:38.090Z
associated_issues:
  - type: github
    ref: https://github.com/voxmedia/open-agent-toolkit/issues/323
external_plans: []
---

## Description

The managed `OAT tools` block always leads with `Skills directory: .agents/skills/` and `scan .agents/skills/*/SKILL.md` (`packages/cli/src/commands/init/tools/project-guidance.ts`), even when every pack is installed at user scope, although it already adds a user-scoped skills line and per-pack scope tags. Directory existence is not a usable signal, because `oat init --scope project` creates an empty `.agents/skills/` and unrelated skills may live there. A possible follow-up is `oat tools where [--json] [<name> | --pack <pack>]`; `oat tools list --json` and `oat tools info` already report scope. Related: `BL-260903-close-manual-only-agents-md` (GitHub issue #322). Source: GitHub issue #323.

## Acceptance Criteria

- The block names `.agents/skills/` only when at least one OAT pack is installed at project scope, and names `~/.agents/skills/` for user-scope packs, deciding by pack membership.
- Project skills that belong to no pack are described separately when present.
- Fixtures cover all-user, all-project, mixed, and user-plus-unrelated-project-skill repositories.
- A decision on `oat tools where` is recorded: ship it or defer it explicitly.

## Notes

- 2026-09-27 (backlog-wave-2, p01-t06): `oat tools where` deferred by the operator on 2026-09-27. `oat tools list --json` and `oat tools info` already report scope, and the scope-aware guidance block (directories named by pack membership, unrelated project skills described separately) plus p01-t05's read-only `oat tools guidance` command cover the reported confusion. Revisit only if a lookup by skill or pack is still requested.
