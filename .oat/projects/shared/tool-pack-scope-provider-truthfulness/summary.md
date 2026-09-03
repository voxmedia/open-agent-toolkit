---
oat_generated: true
oat_generated_at: 2026-09-03
oat_project: tool-pack-scope-provider-truthfulness
---

# Project Summary: tool-pack-scope-provider-truthfulness

## Overview

OAT reported several distinct facts under overloaded labels — declared pack
intent, realized canonical assets, provider-view materialization, running-session
catalog visibility, and native dispatch outcome — and those facts could
disagree. A user could select user scope while the picker implied project
placement; canonical agents could be complete while the active provider could
not discover them; and a generic-child fallback could be mistaken for native-role
success.

This project established one evidence model shared by the picker, installation,
inventory, synchronization, diagnostics, and dispatch reporting, and integrated
four bounded child workstreams without erasing their ownership.

## What Was Implemented

Seven phases, 30 tasks, over eight days.

- **Truthful scope (P1-P2).** Requested tool-pack scope and realized placement
  are separately observable. The picker labels packs from realized placement
  rather than declared intent, and a `User scope` selection no longer widens to
  `project + user`.
- **Provider reachability (P3).** Supported user-scope agents materialize to
  every active configured provider — Claude agents now reach
  `~/.claude/agents/` — or fail closed with a named reason.
- **Collection aliases (P4).** Exact provider collection aliases are adopted and
  detached safely, with manifest tracking and fail-closed handling of unsafe
  links. Alias _creation_ is not shipped; see Known Gaps.
- **Project guidance (P5).** A repository-root `AGENTS.md` is created when
  absent. An existing file is never modified: OAT emits a deterministic manual
  patch instead, after review reproduced a filesystem race in which replacing an
  existing file could destroy user content.
- **Dispatch provenance (P6).** One neutral generic dispatch record plus
  namespaced `oat` evidence, with closed pre-start rejection codes, 31 immutable
  configured controls, exactly one fallback per trigger, and an append-only
  `link`-only project journal that never replaces or removes a published
  revision.
- **Runtime observation (P7).** Optional metadata-only corroboration for Codex
  and Claude, projected to a neutral six-key fact set, correlated against the
  immutable configured invocation and never authoritative over it.

## Verification

All eight Definition-of-Done gates pass at `0.2.52`, forced under an isolated
`HOME` with zero cache replays: `check`, `type-check`, `test` (5,423 passing),
`build`, `check:skill-bumps`, `release:check-versions`, `release:validate`,
`build:docs`.

Thirty-five phase code-review artifacts were produced across the seven phases
(p01:1, p02:6, p03:6, p04:9, p05:5, p06:4, p07:4), plus three artifact reviews,
an Opus final review, and a cross-model gate review on Cursor
`gpt-5.6-sol-xhigh` that ran three fix rounds and a confirmation.

Provider parsing was verified against real artifacts rather than fixtures alone:
a live nested Codex dispatch (root, depth-1, depth-2) and full-corpus sweeps
through the production input path — 1,596 Codex rollouts and 2,740 Claude
transcripts, zero refusals.

## Known Gaps

Four are recorded rather than hidden:

- **FR1/FR3 provider reachability** is defined as a type but never populated;
  every lifecycle path hard-codes `providers: []`.
  `BL-260903-populate-provider-reachability`.
- **NFR1 prose redaction** is best-effort, not a guarantee. Absolute paths are
  rejected in identity and control fields; in prose, colon-prefixed forms, URL
  routes, and trailing-slash candidates survive. Amended in `spec.md`.
- **Collection alias creation** (`BL-260724`) is not shipped; behavior is
  adopt-only. Left open deliberately.
- **Claude lineage depth** is not derivable and `__proto__`-named config keys are
  dropped by the shared JSON parser.
  `BL-260903-close-claude-runtime-lineage`, `BL-260903-preserve-proto-named-config`.

## Lessons

The most reusable finding is about verification rather than the feature. Three
defects shipped green behind tests that could not fail: invented Codex fixtures
that encoded a rollout shape which does not exist, an FR10 test that mocked the
very reader that dropped the field, and NFR1 verified only on the surface that
had already been fixed. Every preceding review round was the same model class as
the implementer, and they converged on the same reading of each requirement and
reinforced it; a different model reading the requirement text fresh found all
three on its first pass.
