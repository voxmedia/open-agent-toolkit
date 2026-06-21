---
oat_generated: true
oat_generated_at: 2026-06-20
oat_review_scope: plan
oat_review_type: artifact
oat_review_invocation: manual
oat_project: .oat/projects/shared/workflow-end-triggers
---

# Artifact Re-Review: plan

**Reviewed:** 2026-06-20
**Scope:** Re-review of Claude's artifact updates in commit `cf02a46a` after
the prior plan review.
**Files reviewed:** 7
**Commits:** `cf02a46a`

## Summary

Claude's updates resolve most of the prior plan-review findings: V1 no longer
stores `execPolicy` on `GateConfig`, target write commands use JSON argv instead
of variadic options, and the plan footer now says "Ready for implementation."
The remaining issue is the newly pinned Codex host detector: the plan and backlog
use `CODEX_SESSION_ID`, but the current Codex host exposes `CODEX_THREAD_ID`
instead, so the fallback detector would miss Codex in this environment.

## Findings

### Critical

None.

### Important

1. **Codex built-in host detection is pinned to an env var absent from the current Codex host.**
   - Evidence: the updated design pins `codex-default.hostDetectionCommand` to
     `["sh","-c","test -n \"$CODEX_SESSION_ID\""]`
     (`.oat/projects/shared/workflow-end-triggers/design.md:138`), and the
     updated plan makes `CODEX_SESSION_ID` the detector acceptance test for
     Codex (`.oat/projects/shared/workflow-end-triggers/plan.md:64`,
     `.oat/projects/shared/workflow-end-triggers/plan.md:234`).
   - Evidence: the updated backlog's V1/V2 boundary repeats that same Codex
     detector (`.oat/repo/reference/backlog/items/gate-same-target-execution.md:41`,
     `.oat/repo/reference/backlog/items/gate-same-target-execution.md:42`).
   - Evidence from the current Codex-hosted review session: `env | sort | rg
'^(CODEX|CLAUDE|CURSOR|OPENAI|OAT)_'` shows `CODEX_THREAD_ID` and
     `CODEX_CI`, but no `CODEX_SESSION_ID`.
   - Impact: if `OAT_CURRENT_RUNTIME` is absent, `cross-provider-exec` falls
     back to built-in `hostDetectionCommand`s. With the current detector, a
     Codex-hosted run would resolve to `unknown`; under default
     `--avoid same-runtime`, `unknown` excludes nothing, so the dispatcher could
     select Codex again and fail the intended cross-runtime independence.
   - Fix guidance: do not pin Codex detection to `CODEX_SESSION_ID` unless there
     is verified evidence it is present in the supported Codex host. Either make
     the Codex detector match the actual current signal, e.g. `CODEX_THREAD_ID`
     if that is accepted as the host signal, test a small OR over known Codex
     env vars, or explicitly document that Codex has no reliable built-in
     detector and must rely on launcher-stamped `OAT_CURRENT_RUNTIME`.

### Medium

None.

### Minor

None.

## Prior Finding Disposition

| Prior finding                                            | Status   | Notes                                                                                                                                        |
| -------------------------------------------------------- | -------- | -------------------------------------------------------------------------------------------------------------------------------------------- |
| `execPolicy.avoid` configured but not consumed           | resolved | V1 moved avoidance to `cross-provider-exec --avoid`; `GateConfig` no longer carries `execPolicy`.                                            |
| `gate target set` argv surface unsafe for provider flags | resolved | Plan/design now use `--base-command-json`, `--host-detection-json`, and `--availability-json`, with explicit provider-flag round-trip tests. |
| Built-in host detection underspecified                   | partial  | Cursor is correctly pinned to `CURSOR_AGENT`; Codex is pinned to an env var absent from this Codex host.                                     |
| Footer says ready for review/merge before implementation | resolved | Footer now says "Ready for implementation."                                                                                                  |

## Plan/Design Alignment

The updated plan and design are otherwise aligned with the V1 scope:
runtime-level `same-runtime` avoidance, JSON argv target writes, no V1
same-target semantics, and same-target deferral to `bl-e6fc`. The backlog item
also preserves the V1/V2 boundary, but it should be corrected alongside the plan
so it does not carry forward the wrong Codex host detector.

### Dispatch Profile Advisory

The plan has no `## Dispatch Profile` section. That remains normal for artifact
plan review and is not a finding.

## Verification Commands

- `git status --short`
  - Result: clean before this re-review.
- `oat project status --project-path .oat/projects/shared/workflow-end-triggers --json`
  - Result: quick-mode project, plan complete, prior plan review marked passed.
- `oat project validate-plan --project-path .oat/projects/shared/workflow-end-triggers --json`
  - Result: passed; no output, exit 0.
- `env | sort | rg '^(CODEX|CLAUDE|CURSOR|OPENAI|OAT)_'`
  - Result: current Codex host exposes `CODEX_THREAD_ID` and `CODEX_CI`; no
    `CODEX_SESSION_ID`.

## Recommended Next Step

Run `oat-project-review-receive` for this re-review, update the Codex detector
in `design.md`, `plan.md`, and `bl-e6fc`, then re-run `artifact plan`.
