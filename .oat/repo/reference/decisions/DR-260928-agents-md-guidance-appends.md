---
id: DR-260928-agents-md-guidance-appends
title: AGENTS.md guidance appends absent managed blocks
date: 2026-09-28
status: accepted
legacy_id: null
---

# AGENTS.md guidance appends absent managed blocks

## Context

OAT guidance writers refused to touch an existing AGENTS.md: when a managed block was absent they printed a manual patch and exited 1, leaving a manual-only refresh loop (BL-260903-close-manual-only-agents-md, GitHub #322). Writing into user-owned instruction files risks clobbering content or writing through links.

## Decision

Append only absent managed blocks, opening the existing AGENTS.md with O_WRONLY | O_APPEND | O_NOFOLLOW after fstat identity checks, and never rewrite existing bytes. Hard-linked, unwritable, swapped, or non-regular targets get the zero-write manual patch with the real cause. Every --project-guidance consumer acts or rejects, zero-pack guidance is skipped, and a read-only oat tools guidance [--json] prints the block without installing assets.

## Consequences

Guidance writers exit 0 after appending instead of exiting 1 with a patch. Two concurrent runs can append the same block twice, leaving duplicate markers that block later runs; serializing appends needs a cross-process lock and is tracked in BL-260928-serialize-concurrent-agents-md. Shipped in backlog-wave-2.

## Resolution — 2026-10-10

The cross-process follow-up is implemented in `feat/october-backlog-fixes`
(commit `5a12600e0`, lint correction `222bade6e`), tracked by the archived
[Serialize concurrent AGENTS.md guidance appends](../../pjm/backlog/archived/BL-260928-serialize-concurrent-agents-md.md).
A bounded two-process first-read barrier reproduces two appends on the baseline
and proves one `appended`, one `no-change`, and a clean rerun after serialization.
The original inode, hard-link refusal, no-follow flags, and append-only writes remain.

The advisory lock lives beside the canonical target as
`<target>.oat-guidance.lock`, so direct and contained symlink aliases share it.
Preview and manual-only paths do not acquire it. Locks record host, PID, and an
ownership token. No stale lock is stolen automatically: after abrupt termination,
check the recorded host/PID and remove the lock manually only after verifying
its owner is gone. Catchable interrupts release the owned lock when the critical
section settles; SIGKILL cannot run cleanup. PR review and publication remain separate.
