---
id: DR-260927-dispatch-record-validates
title: Dispatch record validates without persisting
date: 2026-09-27
status: accepted
legacy_id: null
---

# Dispatch record validates without persisting

## Context

PR #255 added `oat project dispatch record` and a per-dispatch JSON journal
under `<project>/dispatch/`. The journal's intended reader, terminal
reconciliation of every accepted dispatch (GitHub #266), was never built. PR #288
made persistence optional and off by default. As of 2026-09-27 the only journal
code in `packages/cli/src` is the writer (`commands/project/dispatch/record.ts`,
`join(projectPath, 'dispatch')`), and no skill passes `--project`.

Since PR #315 the command does have a live consumer when run without
`--project`: `oat-project-implement` requires it to return
`status: validated-only` before every managed effort-pinned Claude launch.
Deleting the command outright, as the original removal option proposed, is
therefore not possible. Tracked by `BL-260909-give-the-dispatch-record`.

## Decision

Remove the persistence path only.

- Keep `oat project dispatch record` as a validate-only command, along with its
  record schema modules
  (`providers/identity/{generic-dispatch-record,oat-dispatch-record,runtime-observation}.ts`).
- Remove the `--project` flag, the `<project>/dispatch/` journal writer, the
  journal contract, and the docs that describe persistence (CLI reference,
  `oat-dispatch-subagents` record schema, evidence-layers and scope docs).
- If #266 terminal reconciliation is built, it reads the dispatch rows the
  skills already record in `implementation.md` (`Dispatch:` stamp, launch
  status, terminal outcome). It does not read a sidecar JSON journal.

Rejected alternatives:

- Build the #266 reconciler over the JSON journal and make persistence required
  again. This is roughly L-sized and duplicates evidence that `implementation.md`
  already holds.
- Keep optional persistence and document it. That leaves a write-only artifact,
  which breaks the repository rule that a persisted artifact names its reader.

## Consequences

- No default or optional lifecycle path writes `<project>/dispatch/`. The
  `dispatch/` directories already present in archived projects stay as history
  and are not migrated.
- `BL-260906-harden-dispatch-launch` is no longer blocked on this decision. Its
  terminal-reconciliation half is rescoped to read `implementation.md` dispatch
  rows.
- `BL-260909-give-the-dispatch-record` becomes an S-sized removal task for a
  later wave (not Wave 2). It must keep the validate-only path and its tests
  green, and it bumps the `oat-dispatch-subagents` skill and the lockstep
  packages.
