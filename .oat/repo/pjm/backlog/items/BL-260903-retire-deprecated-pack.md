---
id: BL-260903-retire-deprecated-pack
title: Retire deprecated pack placement and dead evidence diagnostics
status: open
priority: low
scope: task
scope_estimate: M
labels:
  - tool-packs
  - evidence
  - diagnostics
  - residue
assignee: null
created: 2026-09-03T00:55:58.261Z
updated: 2026-09-03T00:55:58.261Z
associated_issues: []
external_plans: []
---

## Description

Residue from BL-260829, closed by the tool-pack-scope-provider-truthfulness project. The three originating issue-#228 defects are fixed in production with real tests: the picker no longer renders declared intent as installed, a `User scope` selection no longer silently becomes `project + user`, and Claude user-scope agents are materialized to `~/.claude/agents/` and reachable. What follows is secondary and cleanly separable.

The deprecated declaration-derived `PackInventory.placement` still ships beside the layered evidence model and is printed on surfaces the picker fix did not reach: `oat tools list` and `oat tools info` human output, and `oat status` JSON. For a declared-but-absent pack these still read `project`, which reproduces the original untruth on a different surface.

Six of the eleven pack-evidence diagnostic codes have zero production emission sites: `provider-inactive`, `provider-unsupported`, `provider-materialization-failed`, `visibility-unknown`, `refresh-required`, `restart-required`. The four-way announce distinction the item asked for is therefore not delivered on any surface, and the one live diagnostic (`provider-materialization-missing`) never populates its own `provider` field and carries no restart flag.

A provider content type with no mapping is silently skipped during sync rather than failing closed with a recovery path. `unsupportedReason` exists on the registry but has no production consumer.

Test coverage gaps: no declared-but-absent to `User scope` regression on the evidence path (`useLifecycle: true`) for ideas, utility, research or brainstorm asserting picker labels before install; and the lifecycle-path changed-only-sync gate is untested because the harness mock cannot return zero operations.

Docs never mention `realizedPlacement` or the intent-versus-installation distinction for the picker. Separately, BL-260829's own link to BL-260827-correct-scope-and-adoption is broken: it points at `items/` when the file is in `archived/`.

Low priority. Reopen only if these surfaces cause real confusion in practice.

## Acceptance Criteria

- {Outcome 1}
- {Outcome 2}
