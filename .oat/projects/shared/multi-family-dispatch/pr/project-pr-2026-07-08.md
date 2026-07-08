---
oat_generated: true
oat_generated_at: 2026-07-08
oat_pr_type: project
oat_pr_scope: final
oat_project: .oat/projects/shared/multi-family-dispatch
---

# feat: add multi-family dispatch routing

## Summary

This PR extends OAT dispatch from the shipped single-family Codex/Claude contract to a multi-family dispatch system that can reason about Cursor and future model-argument providers. It adds producer identity stamps, model-family classification, layered provider/tier matrices, family-aware review-gate selection, ordered implementation route resolution, lifecycle guidance, docs, generated assets, and lockstep public package releases through `0.1.45`.

The final audit fixes are included: Cursor availability no longer probes `cursor-agent --version`, final/range gates aggregate producer families from implementation/fix stamps, and programmatic gate dispatch now has timeout/failure visibility.

## Goals / Non-Goals

- Support multi-family provider dispatch while preserving existing managed policy behavior for Codex and Claude.
- Make review gates avoid the producer family when known and degrade visibly when that guarantee cannot be proven.
- Route implementation work through ordered harness/model/effort targets without collapsing dispatch axes.
- Do not implement Gates V2 same-target/model-preference policy in this PR.

## Changes

- Added shared identity/provenance primitives and parseable `Dispatch:` producer stamps.
- Added model-family classification plus provider/tier matrix config parsing, normalization, validation, and doctor checks.
- Registered Cursor as a model-argument provider with availability/current-target helpers and live-experiment-backed confidence rules.
- Extended gate exec targets with model candidates, same-family avoidance, achieved-diversity metadata, unknown-producer fallback behavior, final/range stamp aggregation, and child-process timeouts.
- Added ordered implementation dispatch routes and updated lifecycle skills to persist producer stamps and document route escalation.
- Updated public workflow/docs pages, generated provider views/assets, DR records, and the five public package versions.

## Verification

- `pnpm --filter @open-agent-toolkit/cli test`
- `pnpm --filter @open-agent-toolkit/cli type-check`
- `pnpm --filter @open-agent-toolkit/cli lint`
- `pnpm format`
- `pnpm build:docs`
- `pnpm release:validate`
- `git diff --check`
- Push hooks: version bump check, skill version bump validation, type-check, lint, format

## Reviews

| Scope  | Type     | Status | Date       | Artifact                      |
| ------ | -------- | ------ | ---------- | ----------------------------- |
| design | artifact | passed | 2026-07-07 | signed off in-session (Q23)   |
| plan   | artifact | passed | 2026-07-07 | archived plan review artifact |
| p01    | code     | passed | 2026-07-07 | phase review consumed         |
| p02    | code     | passed | 2026-07-07 | phase review consumed         |
| p03    | code     | passed | 2026-07-07 | phase review consumed         |
| p04    | code     | passed | 2026-07-07 | phase review consumed         |
| p05    | code     | passed | 2026-07-07 | phase review consumed         |
| p06    | code     | passed | 2026-07-07 | phase review consumed         |
| final  | code     | passed | 2026-07-07 | final Fable re-review passed  |

## References

- Discovery: [discovery.md](https://github.com/voxmedia/open-agent-toolkit/blob/multi-family-dispatch/.oat/projects/shared/multi-family-dispatch/discovery.md)
- Design: [design.md](https://github.com/voxmedia/open-agent-toolkit/blob/multi-family-dispatch/.oat/projects/shared/multi-family-dispatch/design.md)
- Plan: [plan.md](https://github.com/voxmedia/open-agent-toolkit/blob/multi-family-dispatch/.oat/projects/shared/multi-family-dispatch/plan.md)
- Implementation: [implementation.md](https://github.com/voxmedia/open-agent-toolkit/blob/multi-family-dispatch/.oat/projects/shared/multi-family-dispatch/implementation.md)
- Summary: [summary.md](https://github.com/voxmedia/open-agent-toolkit/blob/multi-family-dispatch/.oat/projects/shared/multi-family-dispatch/summary.md)
