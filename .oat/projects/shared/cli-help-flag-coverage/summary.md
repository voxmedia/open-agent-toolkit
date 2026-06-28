---
oat_generated: true
oat_generated_at: 2026-06-27
oat_project: cli-help-flag-coverage
oat_workflow_mode: quick
oat_status: complete
---

# Project Summary: cli-help-flag-coverage

## Overview

Triggered by a bug report — `oat sync --help` didn't mention the `--scope` flag — which an audit revealed to be one symptom of a systemic issue: `--json`, `--verbose`, `--scope`, and `--cwd` were all defined as global options on the root program, and Commander hides parent options from subcommand help unless `showGlobalOptions` is enabled (it wasn't). So none of the four appeared in any of the 107 subcommands' `--help`.

A full audit (programmatic command-tree walk + three parallel subagents) found, beyond the help-visibility gap: `--scope` was global but consumed by only ~1/3 of commands (silently accepted-and-ignored by the rest); `oat providers set` was broken on its default invocation; and five commands violated the `--json` contract. The project shipped the **P0 + P1** subset; P2/P3 were deferred to backlog item `BL-260627-cli-flag-p2-p3-cleanup`.

## What Was Implemented

- **Global-flag visibility (P1-1):** `showGlobalOptions` applied recursively across the whole command tree via a new `app/help-config.ts` — necessary because 89/99 commands register with `.addCommand()`, which (unlike `.command()`) does not inherit help config. `--json`/`--verbose`/`--cwd` now render in a `Global Options:` section on every subcommand.
- **`--scope` demotion (P1-2/P1-3):** `--scope` removed from the root globals and re-added via a shared `withScopeOption(cmd, defaultScope?)` helper on the ~22 commands that actually consume it; non-consumers no longer silently accept it. Worked with the existing `optsWithGlobals()` context wiring, so no change to the context builder.
- **`oat providers set` default fix (P0-1):** now operates project-scoped by default instead of erroring and pointing at an undocumented global flag.
- **`--json` contract pass (P1-4…P1-8):** `project validate-plan` and `project split run` now emit JSON under `--json`; `project split evaluate-signals` and `project split validate-plan` now gate JSON on `--json`; `repo pr-comments triage-collection` gained a real non-interactive/JSON path.
- **Release:** lockstep version bump of the five public packages to 0.1.35 (originally 0.1.34; re-bumped after rebasing over main's 0.1.34 release).
- **Regression guard:** `help-snapshots.test.ts` extended to lock the globals-visible + scope-local-only contract.
- **Docs:** `design-principles.md` corrected (`--scope` is per-command, not global).

## Key Decisions

- `--json`/`--verbose`/`--cwd` are genuinely global and stay global (now advertised); `--scope` is not, so it became per-command. This makes `--help` honest where a blanket `showGlobalOptions` would have advertised `--scope` on commands that ignore it.
- Recursive help-config walk over the tree rather than converting `.addCommand()`→`.command()` (which would inherit the full settings bundle and churn ~99 sites + tests).

## Verification

- Full CLI suite green (1978 tests), `pnpm lint`, `pnpm type-check`, `pnpm release:validate` all pass.
- Per-phase oat-reviewer gates: p01 pass, p02 pass, p03 pass. Final review (scope `final`): pass — 0 Critical/Important.

## Reviews

- Plan artifact review (manual): passed — 1 important (wrong source path) + 3 minor, all resolved in-plan.
- p01 / p02 / p03 code reviews: passed.
- Final review: passed. The v1 auto-review flagged 5 Minor nits (closed in a post-final polish pass); the v2 manual review (`reviews/archived/final-review-2026-06-27-v2.md`) found Important I1, fixed in phase p-rev1, then re-review passed.

## Follow-ups

- `BL-260627-cli-flag-p2-p3-cleanup` — deferred audit P2/P3 items (`--dry-run` coverage, exit codes, `migrate` semantics, logger routing, naming).
