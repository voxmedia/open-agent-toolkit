---
oat_status: complete
oat_ready_for: null
oat_blockers: []
oat_last_updated: 2026-07-01
oat_generated: true
oat_summary_last_task: p07-t01
oat_summary_revision_count: 0
oat_summary_includes_revisions: []
---

# Summary: workflow-end-triggers

## Overview

`workflow-end-triggers` added a configurable final-gate mechanism for OAT
skills. The project started from the need for independent cross-runtime
verification: for example, one runtime implements or plans, then another runtime
runs a review before the skill is considered done.

The 2026-06-29 `workflow-gate-improvements` follow-up narrowed the V1 repair to
semantic review gates and lifecycle handoff. `oat gate review` is now the
review-specific path that maps blocking review findings to gate status, while
`oat gate cross-provider-exec` remains the generic child-status executor.
Gate reviews remain stateful `oat-project-review-provide` runs: review
artifacts, Reviews row updates, and bookkeeping commits are expected, produced
artifacts use `oat_review_invocation: gate`, and the host must run or hand off
to `oat-project-review-receive` before treating the review as dispositioned.

The follow-up did not change the Gates V2 boundary. Same-target/model-level
target detection stays deferred to `bl-e6fc`; dispatch ceilings remain separate
from gate target config; trusted provider permission flags are user-level
`workflow.gates.execTargets` configuration and documentation guidance, not new
built-in defaults.

## What Was Implemented

The CLI now supports `workflow.gates.skills`, a per-skill gate map keyed by skill
name. A gate contains a command, an `onFailure` policy (`block`, `prompt`, or
`warn`), optional description text, and a retry bound for blocking gates.

The CLI also supports `workflow.gates.execTargets`, a runtime target registry
used by `oat gate cross-provider-exec`. Built-ins cover Codex, Claude, and
Cursor with runtime detection and availability commands:

- `codex-default` runs `codex exec`
- `claude-default` runs `claude -p`
- `cursor-default` runs `cursor-agent -p`

The new `oat gate` command group provides:

- `oat gate resolve <skill>`
- `oat gate set/unset <skill>`
- `oat gate target set/unset <id>`
- `oat gate review <prompt...>`
- `oat gate cross-provider-exec <prompt...>`

`cross-provider-exec` avoids the current runtime by default, chooses the
highest-priority available target with deterministic tie-breaking, supports
`--target <id>` for explicit pinning, and exits with the child command status.

Skill eligibility is explicit. `oat-project-plan` and `oat-project-implement`
now declare `oat_gateable: true` and include a standard Gate Execution step.
`oat internal validate-oat-skills` warns when configured gates target missing or
non-gateable skills.

The project also completed required release and documentation work: public
packages were bumped to `0.1.28`, repo reference docs were refreshed, and the
docs app now includes a Workflow Gates page plus related config, CLI reference,
file-location, directory-structure, and skill-authoring updates.

## Key Decisions

- **Thin gate mechanism:** Gate pass/fail is the command exit code. OAT does not
  define a verdict schema for generic `cross-provider-exec`; richer review
  interpretation belongs to `oat gate review`.
- **Stateful review gates:** `oat gate review` is a normal review-provider
  workflow with expected artifact, Reviews row, and bookkeeping side effects.
  Gate artifacts use `oat_review_invocation: gate` and require receive handoff.
- **Skill opt-in:** Gates are only executable contracts for skills that declare
  `oat_gateable: true` and carry the Gate Execution step.
- **Runtime-level V1:** `cross-provider-exec` avoids the current runtime, not the
  current model or effort setting. Same-target/model-level dispatch is deferred.
- **Explicit target config:** Gate model/effort and trusted provider permission
  flags live in `workflow.gates.execTargets`, not dispatch ceilings or built-in
  defaults.
- **Opaque target ids:** OAT treats target ids and model slugs as opaque strings.
  It does not infer model family, effort, or provider semantics from names.
- **Structured target commands:** `oat gate target set` accepts JSON argv arrays
  so provider flags such as `-p` and `--model` round-trip without Commander
  parsing ambiguity.
- **No fallback after dispatch:** Fallback only happens before dispatch while
  choosing an available target. Once a target runs, its nonzero exit is the gate
  result.

## Design Deltas

- The p02 review fix expanded the resolver phase to touch
  `packages/cli/src/config/oat-config.ts` and its tests. The resolver could not
  merge partial built-in target overrides if normalization had already dropped
  the partial object.
- Release bookkeeping also updated
  `packages/cli/assets/public-package-versions.json`, because the release
  tooling requires the generated public-package version asset to match package
  manifests.
- Full test verification exposed a stale root-help snapshot after the gate
  command registration. The snapshot fix was accepted as part of p07
  verification.

## Notable Challenges

Two phase reviews found important correctness issues before final review:

- Partial exec-target overrides were dropped during config loading before the
  resolver could merge them.
- Warning-only gateability findings initially caused `validate-oat-skills` to
  fail instead of exiting successfully with warnings.

Both issues were fixed and re-reviewed successfully. The final OAT review passed
cleanly, and the independent Claude review reported only non-blocking Minor
observations that were accepted as no-change.

## Integration Notes

Workflow gate objects are structured config and should be managed with
`oat gate`, not the scalar `oat config set` surface. Skill authors should add
`oat_gateable: true` only when the skill also contains the Gate Execution step.

`cross-provider-exec` uses built-in runtime detectors for Codex, Claude, and
Cursor. Unknown hosts exclude nothing under default `same-runtime` avoidance, so
users who need a precise target in an unsupported host can configure and pin a
target with `--target <id>` for manual dispatch or a deliberately local
override. Reusable lifecycle gate commands should normally stay unpinned so the
dispatcher can choose an available non-host runtime.

## Follow-up Items

- `bl-e6fc` tracks Gates V2: same-target execution and target-level detection.
  This is the future path for cases like staying inside Cursor while switching
  model or effort target.
