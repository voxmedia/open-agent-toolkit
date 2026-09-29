---
id: BL-260928-keep-instructions-sync-force
title: Keep instructions sync --force from overwriting the only CLAUDE.md behind
  an AGENTS.md link
status: open
priority: medium
scope: task
scope_estimate: S
labels:
  - instructions
  - claude
  - sync
  - safety
assignee: null
created: 2026-09-28T10:16:23.132Z
updated: 2026-09-28T10:16:23.132Z
associated_issues: []
external_plans: []
---

## Description

Follow-up from backlog-wave-2 p02 (pre-existing, recorded in commit b1c48d5bc). With a shim strategy configured, oat instructions sync --strategy pointer --force can overwrite a hand-written CLAUDE.md in the AGENTS.md -> CLAUDE.md symlink layout, destroying the only copy of the instructions behind the AGENTS.md link. Under the new none default this path is guarded (the CLAUDE.md is reported unmanaged), but the configured-strategy --force path is not. Apply the same resolves-to-this-file guard (findLinksThrough / realpath and inode checks in instructions.utils.ts) before any overwrite, with a failing-first test and a neutralize-and-restore proof.

## Acceptance Criteria

- With any shim strategy and `--force`, sync never overwrites a `CLAUDE.md` that an `AGENTS.md` resolves to (symlink, chain, or hard link); it is kept and reported.
- A failing-first test covers `AGENTS.md -> CLAUDE.md` with `--strategy pointer --force`, and a neutralize-and-restore proof shows the guard is load-bearing.
