---
oat_status: complete
oat_ready_for: null
oat_blockers: []
oat_last_updated: 2026-07-02
oat_generated: true
oat_summary_last_task: p01-t06
oat_summary_revision_count: 0
oat_summary_includes_revisions: []
---

# Summary: workflow-gate-target-selection

## Overview

This quick-mode project repaired follow-up feedback from the recently merged
workflow-gate work. Dogfooding showed that reusable lifecycle gate commands were
teaching hardcoded Codex targets, and `oat gate review` could fail provider CLIs
by passing review context and the user prompt as multiple prompt positionals.

The selected scope was a focused V1 repair: preserve the existing target
registry and runtime-avoidance model, remove hardcoded target guidance from
gate-aware lifecycle skills, and prove the CLI command shape works for Codex,
Claude, and Cursor targets.

## What Was Implemented

- `oat gate review` now assembles gate metadata, resolved project path, review
  type/scope hints, and the user prompt into one provider prompt argument before
  dispatching to the selected target.
- `cross-provider-exec` was left generic; it still appends prompt argv entries
  without review-gate-specific assembly.
- The four gate-aware lifecycle skills (`oat-project-plan`,
  `oat-project-quick-start`, `oat-project-import-plan`, and
  `oat-project-implement`) now tell reusable lifecycle gate commands to omit
  exact `--target <id>` pins by default. Each changed skill version was bumped.
- Workflow-gate docs, configuration docs, contributor skill-authoring guidance,
  repo reference notes, and prior project summaries were updated to distinguish
  reusable lifecycle gate commands from manual/debug target dispatch.
- Lockstep public package metadata and the CLI public package version asset were
  bumped from `0.1.36` to `0.1.37`.
- User-level lifecycle gate config on both the mini and laptop was updated so
  quick-start, plan, import-plan, and implement gates resolve unpinned
  `oat gate review` commands.

## Key Decisions

- **Lifecycle gate commands stay target-neutral by default.** Reusable
  `workflow.gates.skills.<skill>.command` entries should omit exact targets so
  gate execution can avoid the current runtime and choose from the configured
  target registry. Exact `--target <id>` pins remain valid for manual dispatch,
  debugging, or deliberate local/user-specific overrides.
- **Review gates own review prompt assembly.** `oat gate review` is the
  review-aware command, so it is responsible for packaging gate context, project
  context, review hints, and the user prompt into one provider prompt argument.
  The generic executor remains provider-agnostic.
- **Provider verification happens at the CLI argv boundary.** Unit coverage
  guards the command builder, and shimmed CLI smoke tests verify the real `oat`
  command path for `codex-default`, `claude-default`, and `cursor-default`
  without invoking real providers.
- **Gates V2 remains deferred.** This project intentionally avoided same-target
  or model-level dispatch policy changes; that larger target-preference work
  stays in the existing Gates V2 backlog lane.

## Integration Notes

- Treat `--target <id>` in docs or skills as an explicit override, not the
  default lifecycle gate pattern.
- When adding future review-gate behavior, preserve the invariant that provider
  CLIs receive one assembled prompt argument for `oat gate review`.
- Skill version contract tests must be updated in the same branch when guarded
  skill frontmatter versions change.

## Verification

- Focused gate tests passed, including 49 tests across `gate/index` and
  `gate/review-verdict`.
- Skill validation passed with 53 `oat-*` skills validated, and provider-view
  sync required no generated changes.
- CLI smoke checks passed for `codex-default`, `claude-default`, and
  `cursor-default` using temporary provider shims that asserted one assembled
  prompt argument.
- Mini and laptop `oat gate resolve <skill> --json` checks confirmed the four
  lifecycle gates no longer resolve hardcoded Codex targets.
- Full verification passed: `pnpm lint`, `pnpm type-check`, `pnpm test`,
  `pnpm build`, `pnpm build:docs`, and `pnpm release:validate`.
- Final code reviews and the configured `oat-project-implement` gate review
  passed with 0 critical, 0 important, 0 medium, and 0 minor findings.
