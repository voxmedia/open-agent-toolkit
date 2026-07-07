---
oat_status: complete
oat_ready_for: null
oat_blockers: []
oat_last_updated: 2026-07-05
oat_generated: false
oat_template: false
oat_summary_last_task: p06-t02
oat_summary_revision_count: 0
oat_summary_includes_revisions: []
---

# Summary: backlog-lifecycle-hardening

## Overview

Two downstream repos independently hit the same backlog drift: completed items were closed in frontmatter and summarized in `completed.md` but never moved to `archived/`, and some shipped without being closed at all (one carrying the invalid status `done`). The root cause was that backlog archival was pure convention — no `oat` command performed it, nothing detected when it hadn't happened, and the `oat pjm init` instruction templates never taught the lifecycle. This project made close-out a single atomic command, baked the lifecycle into the scaffold, and made drift visible in `oat doctor`.

## What Was Implemented

- **`oat backlog archive <id> [--wont-do] [--summary <text>] [--json]`** — atomic close-out: minimal-diff frontmatter rewrite (status + `updated`, preserving the enum comment), canonical newest-first `completed.md` entry (closed always, TODO-scaffolded without `--summary`; `wont_do` only with `--summary`), `git mv` to `archived/` with an `fs.rename` fallback outside git, and index regeneration. Idempotent, exit codes 0/1/2.
- **`item-status.ts`** — a dependency-free single source of truth for the status enum (`open | in_progress | closed | wont_do`), consumed by `archive`, `regenerate-index`, and `pjm doctor`. `regenerate-index` now warns on out-of-enum statuses instead of passing them through.
- **Five `pjm doctor` drift checks** (auto-surfaced in `oat doctor`): `backlog_terminal_in_items` (fail), `backlog_invalid_status` — missing/empty or out-of-enum (fail), `backlog_archived_open` (warn), `backlog_completed_unarchived` (warn), and `backlog_duplicate_id` (fail).
- **Instructions scan carve-in** — `.oat/repo/**` AGENTS.md/CLAUDE.md pairs are now scanned/synced/validated (rest of `.oat/` excluded), so `oat instructions sync` manages their shims under the consumer's chosen strategy.
- **`oat pjm init` scaffold additions** — Backlog Lifecycle and Project Kickoff Handoffs sections in `pjm/AGENTS.md`, a source-of-truth map in `reference/AGENTS.md`, pointer bullets in the repo AGENTS.md, a human-facing `.oat/repo/README.md`, and a `pjm/handoffs/README.md` convention doc; init prints an `oat instructions sync` hint and never writes CLAUDE.md.
- **Propagation** — `oat-pjm-update-repo-reference` re-pointed at the command; `oat-pjm-review-backlog` gained the kickoff-handoff workflow; new docs pages; this repo dogfooded its own `.oat/repo/pjm/` scaffold; lockstep bump of the five public packages to 0.1.41.

## Key Decisions

- **Kickoff-handoff pattern upstreamed as first-class pjm** (discovery Q4): rather than replaying a manual prompt per repo, `oat pjm init` now scaffolds `pjm/handoffs/` and the pjm template teaches the workflow, so adopting it in any repo is `oat pjm init` plus the bundled `oat-pjm-review-backlog` skill.
- **completed.md contract** (Q2): the command emits the canonical entry format with a structural newest-first append; no parsing of per-repo custom formats. Downstream conformance handled out-of-band.
- **wont_do entries** (Q3): only written with an explicit `--summary`; closed items always get an entry (TODO-scaffolded).
- **Shim management** (Q1): `oat pjm init` never writes CLAUDE.md; strategy ownership stays with `oat instructions sync` via the scan carve-in, so consumers keep their pointer/symlink/copy choice.
- **Drift-check placement**: new checks live in `pjm doctor` (auto-aggregated into `oat doctor`); `regenerate-index` warns rather than fails on invalid statuses (doctor owns enforcement).

## Design Deltas

- **p01/p02 declared as a parallel worktree group but executed sequentially** per user direction (session-created git worktrees are unreliable in this Orca-relay workspace). The plan's disjoint-write-set analysis still holds; only the execution mechanism changed.
- **`pjm:backlog_invalid_status` broadened** to also flag missing/empty status (design.md updated to match) after a review found status-less items slipped past all checks.
- **Release bumped patch (0.1.41)** rather than the plan's suggested minor, matching the repo's patch-only 0.1.x convention.

## Notable Challenges

- **Cross-runtime review caught what same-family review missed.** Per-phase and final Claude-opus reviews all passed 0C/0I, but an independent Codex review then caught an Important bug: `oat backlog archive` checked `archived/` before `items/`, so an id duplicated across both directories reported "already archived" success while leaving the live item unarchived — the command silently no-oping on the exact drift it exists to fix. Fixed by guarding the no-op on `items/` absence (a true duplicate now errors), plus the new `pjm:backlog_duplicate_id` check to detect the invariant.
- **A gate failure was misdiagnosed as an OAT bug.** The `oat gate review` Codex gate initially errored (two-positional argv to `codex exec`) and appeared to exit 0; this was the stale global `oat` binary (0.1.40), not current code — 0.1.41 assembles a single prompt and propagates child exit codes correctly. Re-running the gate through the repo-local build produced a clean cross-runtime review.

## Follow-up Items

- No open code follow-ups. The final gate review's one minor (docs listing four checks instead of five) was fixed on receive.
- Operational note: keep the global `oat` binary current (`oat tools update`) so gates don't run against a stale build.

## Associated Issues

None tracked; motivated by drift observed in the `orc` and `pjm-guidance` downstream repos.
