---
id: BL-260627-cli-flag-p2-p3-cleanup
title: 'CLI flag/help P2–P3 cleanup (dry-run, exit codes, migrate semantics, naming)'
status: open # open | in_progress | closed | wont_do
priority: medium # urgent | high | medium | low | none
priority_reviewed: '2026-06-27'
scope: task # idea | task | feature | initiative
scope_estimate: M # XS | S | M | L | XL | XXL
labels:
  - cli
  - ux
  - tech-debt
  - dx
assignee: null
created: '2026-06-27T00:00:00Z'
updated: '2026-06-27T00:00:00Z'
associated_issues: []
oat_template: false
---

## Description

Follow-up to the `cli-help-flag-coverage` project, which shipped the audit's **P0 + P1** items (global-flag help visibility, `--scope` demotion to a per-command option, the `oat providers set` default fix, and the `--json` contract pass). The P2 and P3 findings from that audit were explicitly deferred and are captured here so they aren't lost.

Full audit: `.oat/projects/shared/cli-help-flag-coverage/references/audit.md`.

### P2 — `--dry-run` contract

- ~25 mutating commands expose no `--dry-run` path despite the repo's mutate-by-default + `--dry-run` opt-in contract. Higher-risk live-state mutators first (`project open/pause/complete-*`, `state refresh`), then the scaffolders/regenerators (`init`, `init tools <pack>`, `config set`, `local sync/add/remove`, `docs generate-index`, `docs nav sync`, `repo pr-comments collect`, `index init`, `backlog/decision init|regenerate-index`).
- `docs init` has unreachable/dead `--dry-run` code — either wire a real flag or remove the dead branch.
- Unify `migrate` semantics: `pjm migrate` and `docs migrate` are dry-run-by-default (opt-in `--apply`) while `decision migrate` mutates by default (`--dry-run` to preview). Pick one convention (repo default is mutate-by-default).

### P3 — exit codes, logger routing, naming

- `remove skills` returns exit 2 (system) for an invalid `--pack` user error; should be exit 1.
- `pjm doctor` maps diagnostic fail→2 / warn→1; reconsider against the documented 0/1/2 semantics.
- Logger bypasses: `project archive sync` deprecation banner and `repo pr-comments triage-collection` summary use `process.stderr.write` directly — route through the CLI logger.
- `internal validate-*` emit a third JSON status `failed` vs the `ok`/`error` convention used elsewhere.
- `project dispatch-ceiling resolve` declares a redundant local `--json` now that global options are shown via `showGlobalOptions`.
- Naming/description mismatches: `providers` group description omits the mutating `set`; `project new --force` description fights the flag name; `local sync --from` is a boolean that reads like a value flag; `docs analyze`/`docs apply` are no-op stubs with action-implying descriptions; two distinct `validate-plan` commands with contradictory `--json` behavior.

### Carried-over test-quality nit (deferred from P1 implementation)

- `repo/pr-comments/triage-collection` triage-comments "does not write stderr" test asserts only the positive path; add a `process.stderr.write` spy assertion. (The related P3-3 `printCommentSummary` stderr routing is covered under P3 above.)

## Acceptance Criteria

- A scoped plan decides which P2 dry-run additions ship now vs. stay deferred, prioritizing live-state mutators over idempotent scaffolders.
- `docs init` dead dry-run code is either made reachable or removed.
- `migrate` commands converge on a single dry-run/apply convention.
- P3 exit-code, logger-routing, and naming items are triaged with a clear ship/defer decision each.
- Changes preserve the existing non-interactive/JSON contracts and the lockstep public-package release policy.
