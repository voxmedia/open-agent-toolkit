---
oat_generated: true
oat_generated_at: 2026-07-13
oat_review_scope: final
oat_review_type: code
oat_review_invocation: auto
oat_project: /agent/repos/open-agent-toolkit/.oat/projects/shared/cli-update-notifications
model_axis: selected:gpt-5.6-sol-high
effort_axis: not-applicable
dispatch_ceiling: gpt-5.6-sol-high
ceiling_source: project state
---

# Code Review: final

**Reviewed:** 2026-07-13
**Scope:** Complete revised CLI update-notification feature
**Files reviewed:** 37 changed files plus supporting command and lifecycle sources
**Commits:** `5310ed93ce8b8d6d0f4983881009fe9f8ae5fe3c..cc149437` (41 commits)
**Verdict:** Failed - blocking Important findings remain

## Summary

The passive notifier, complete guarded Commander path classification, exact-version shell-free npm launch, Windows `npm-cli.js` resolution, success-only cancellation, decline/error behavior, suppression policy, cache behavior, documentation, and lockstep `0.1.62` release assets are implemented and well tested. The final pass is blocked because rerun display quoting is POSIX-only despite the supported Windows path, and the project's lifecycle sources were not reconciled after the interactive-guard revision. The accepted decision records also retain placeholder bodies.

Findings: 0 critical, 2 important, 1 medium, 0 minor

## Findings

### Critical

None

### Important

- **Rerun guidance is not safely quoted for Windows command shells** (`packages/cli/src/app/tool-bundle-update-guard.ts:90`)
  - Issue: `quoteDisplayArgument` always emits POSIX single-quote syntax, including the POSIX `'"'"'` sequence for embedded apostrophes. `cmd.exe` does not treat single quotes as quoting characters, so a guarded invocation containing a space-bearing value such as `--cwd "C:\Program Files\repo"` is printed as a command that does not reconstruct the original argument. Shell metacharacters are likewise not protected by those single quotes in `cmd.exe`. The installer itself is now portable, but after a successful Windows update the required full-command rerun can still be invalid or unsafe to paste.
  - Fix: Make rerun formatting platform/shell-aware (or print explicitly labeled safe PowerShell and `cmd.exe` variants), inject the formatter platform for deterministic tests, and cover spaces, embedded quotes, and command metacharacters on Windows as well as POSIX.
  - Requirement: Acceptance must print a safely quoted equivalent of the full original command for rerun.

- **Lifecycle sources still describe only the pre-revision passive release** (`.oat/projects/shared/cli-update-notifications/summary.md:24`)
  - Issue: The project summary says the feature never prompts or launches an installer and still reports release `0.1.61` (`summary.md:29-41`); the lightweight design remains notification-only (`design.md:13`); and repository current-state/backlog summaries mention only passive awareness. The revision plan and implementation correctly describe the guard and `0.1.62`, but the implementation's design-deviation table records only the older cross-process TTL delta. This leaves the project's upstream and closeout sources materially inconsistent with the defensible shipped implementation.
  - Fix: Align `summary.md`, the lightweight design, and repository reference summaries with the guarded `init`/`tools install`/`tools update` exception and `0.1.62`. Preserve the original discovery decision as historical context, but record the later inline-feedback revision explicitly in the design/deviation history rather than leaving notification-only text as the apparent final contract.

### Medium

- **Accepted feature decision records contain placeholder decisions and consequences** (`.oat/repo/reference/decisions/DR-260713-passive-notification-only.md:15`)
  - Issue: All five `DR-260713-*` records are indexed as accepted, but their `Decision` and `Consequences` sections contain only `TODO`. The passive-notification record also does not document the later guarded-command exception. The context blurbs provide partial intent, but the accepted records are not usable as durable decision evidence.
  - Fix: Populate the five accepted records with the actual decisions and consequences, and qualify passive-only behavior as applying to ordinary commands while documenting or linking the guarded mutation exception.

### Minor

None

## Requirements/Design Alignment

**Evidence sources used:** quick-mode `discovery.md`, optional `design.md`, `plan.md`, `implementation.md`, `summary.md`, `state.md`, both p-rev1 review artifacts, repository current-state/backlog and decision records, all 37 files in the authoritative range, and supporting Commander command registrations, prompt/context helpers, docs guidance, and release scripts.

### Requirements Coverage

| Requirement | Status | Notes |
| --- | --- | --- |
| Ordinary eligible commands receive passive cached stable-release notices | implemented | Strict stable versions, registry timeout, cache/check and notice TTLs, suppression, and best-effort failure handling are covered. |
| Guard every action rooted at `init`, `tools install`, and `tools update` | implemented | The root hook classifies the complete Commander parent chain; top-level and nested paths use the guard instead of the passive notifier. |
| Explain older bundled tools without claiming incompatibility | implemented | Runtime and public docs accurately describe bundle-version freshness. |
| Accept an exact validated version with shell-free portable npm execution | implemented | POSIX uses direct npm argv; Windows validates an existing absolute `npm-cli.js` and invokes it through `process.execPath`; both use `shell: false` and inherited stdio. |
| Cancel the old action and print the complete original command for rerun | partial | Success-only cancellation and full argv preservation work, but the displayed quoting is not valid for `cmd.exe`. |
| Decline/abort warns and continues; installer failure prevents mutation | implemented | Default-no/abort returns control with an explicit warning; installer and Windows-resolution failures are actionable exit-2 errors before tool mutation. |
| Suppressed, current, unavailable, dry-run, and automation paths do not prompt/install | implemented | Static eligibility, preference checks, strict version comparison, availability handling, and dry-run short-circuit are covered. |
| Release metadata and public docs reflect the final feature | implemented | Five public manifests and generated package versions are `0.1.62`; README and docs cover all three guarded entry points. |
| Lifecycle artifacts align with the revised final behavior | partial | Plan and implementation align; design, summary, repository summaries, and accepted decision records remain stale or incomplete. |

### Extra Work (not in declared requirements)

None. The authoritative range's implementation, tests, public docs, release files, and lifecycle artifacts map to the feature and its review/closeout workflow.

## Verification Commands

```bash
pnpm --filter @open-agent-toolkit/cli exec vitest run src/app/update-notifier.test.ts src/app/tool-bundle-update-guard.test.ts src/index.test.ts src/config/oat-config.test.ts src/config/resolve.test.ts src/commands/config/index.test.ts
pnpm test
pnpm lint
pnpm type-check
pnpm build
pnpm --filter oat-docs check
pnpm format
pnpm release:check-versions
pnpm release:validate
git diff --quiet 5310ed93ce8b8d6d0f4983881009fe9f8ae5fe3c..cc149437 -- pnpm-lock.yaml
git diff --check 5310ed93ce8b8d6d0f4983881009fe9f8ae5fe3c..cc149437
```

Observed results: 354/354 focused tests and the full repository test suite passed; lint, type-check, build, docs lint/format checks, repository formatting, version-bump validation, five-package release validation, lockfile stability, patch whitespace, and worktree cleanliness passed. An additional `pnpm docs:check-links` crawl ran after installing its missing Playwright browser prerequisite and found two pre-existing broken fragments in unchanged documentation pages; these are outside the authoritative range and are not scoped findings.

## Recommended Next Step

Run the `oat-project-review-receive` skill to convert the two Important and one Medium findings into bounded revision tasks, then repeat the final review.
