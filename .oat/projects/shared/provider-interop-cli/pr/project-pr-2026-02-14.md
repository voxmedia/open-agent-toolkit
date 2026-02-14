---
oat_generated: true
oat_generated_at: 2026-02-14
oat_pr_type: project
oat_pr_scope: final
oat_project: .oat/projects/shared/provider-interop-cli
---

# PR: provider-interop-cli

## Summary

This PR delivers the provider interoperability CLI in `@oat/cli`, establishing `.agents/` as canonical and syncing managed views to Claude Code, Cursor, and Codex. It includes the full command surface (`init`, `status`, `sync`, `providers`, `doctor`), manifest-based safety and drift detection, optional git-hook drift warnings, and comprehensive test coverage. All review cycles are closed, including final re-review pass.

## Goals / Non-Goals

### Goals
- Make `.agents/` the canonical source for skills and agents (project scope), with user-scope skills support.
- Sync canonical content to provider directories safely (dry-run by default, explicit apply).
- Detect/report drift and strays with clear remediation.
- Keep provider integration extensible through adapter configuration.

### Non-Goals
- Gemini/Copilot provider support in v1.
- Rules/instructions file sync across providers.
- `.agent/` to `.agents/` migration in this release.
- User-scope subagent sync in v1.

## What Changed

- Foundation and architecture:
  - Added CLI scaffolding, command factory wiring, shared typing/contracts, logger/spinner utilities, fs helpers, and config loading.
  - Implemented provider adapters for Claude, Cursor, and Codex.
  - Added manifest schema/manager and canonical scanner.
- Sync and drift core:
  - Implemented sync plan computation/execution with marker support and safe manifest-tracked removals.
  - Added drift detection and stray detection pipelines.
- Command surface:
  - Implemented `oat init`, `oat status`, `oat sync`, `oat providers list`, `oat providers inspect`, and `oat doctor`.
  - Enforced non-interactive/JSON behavior contracts.
- Quality and release hardening:
  - Added adapter contract tests, help snapshot tests, edge-case coverage, and e2e workflow tests.
  - Closed deferred review findings in p06 and final Medium findings in p07.
  - p07 final-fix highlights:
    - Extracted shared stray adoption helper (`commands/shared/adopt-stray.ts`).
    - Removed unused runtime deps (`dotenv`, `gray-matter`, `yaml`).
    - Centralized path normalization (`toPosixPath`, `normalizeToPosixPath`).

## Verification

- `pnpm --filter=@oat/cli test`
- `pnpm --filter=@oat/cli type-check`
- `pnpm --filter=@oat/cli lint`
- `pnpm --filter=@oat/cli build`

Result: passing (`39` test files, `279` tests), type-check clean, lint clean, build successful.

## Reviews

| Scope | Type | Status | Date | Artifact |
|-------|------|--------|------|----------|
| p01 | code | passed | 2026-02-13 | reviews/p01-re-review-2026-02-13.md |
| p02 | code | passed | 2026-02-13 | reviews/p02-re-review-2026-02-13.md |
| p03 | code | passed | 2026-02-13 | reviews/p03-re-review-2026-02-13.md |
| p04 | code | passed | 2026-02-14 | reviews/p04-re-review-2026-02-14.md |
| p05 | code | passed | 2026-02-14 | reviews/p05-code-review.md |
| p06 | code | passed | 2026-02-14 | reviews/p06-code-review.md |
| final | code | passed | 2026-02-14 | reviews/final-re-review-2026-02-14.md |

## Git Context

- Branch: `provider-interop`
- Merge base: `d25643fb7a57fd977d1a9590690d26986d2d0ce8`
- Diff shortstat from merge-base: `160 files changed, 25354 insertions(+), 783 deletions(-)`

## References

- Spec: `.oat/projects/shared/provider-interop-cli/spec.md`
- Design: `.oat/projects/shared/provider-interop-cli/design.md`
- Plan: `.oat/projects/shared/provider-interop-cli/plan.md`
- Implementation: `.oat/projects/shared/provider-interop-cli/implementation.md`
- Reviews: `.oat/projects/shared/provider-interop-cli/reviews/`
