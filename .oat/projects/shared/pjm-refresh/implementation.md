---
oat_status: in_progress
oat_ready_for: null
oat_blockers: []
oat_last_updated: 2026-06-23
oat_current_task_id: p01-t03
oat_generated: false
---

# Implementation: pjm-refresh

**Started:** 2026-06-23
**Last Updated:** 2026-06-23

## Progress Overview

| Phase   | Status      | Tasks | Completed |
| ------- | ----------- | ----- | --------- |
| Phase 1 | in_progress | 5     | 2/5       |
| Phase 2 | pending     | 3     | 0/3       |
| Phase 3 | pending     | 3     | 0/3       |
| Phase 4 | pending     | 3     | 0/3       |

**Total:** 2/14 tasks completed

## Phase 1: Additive Core

**Status:** in_progress
**Started:** 2026-06-23

### Phase Summary

Pending.

### Task p01-t01: Add Shared ID and Template Helpers

**Status:** completed
**Commit:** 3ade17eb

**Outcome:**

- Added deterministic shared helpers for slug generation, UTC date prefixes,
  and template-frontmatter stripping.
- Updated PJM init to use the shared template-frontmatter stripping helper.

**Files changed:**

- `packages/cli/src/commands/shared/slug.ts` - deterministic ASCII slug helper.
- `packages/cli/src/commands/shared/slug.test.ts` - slug behavior coverage.
- `packages/cli/src/commands/shared/date-id.ts` - UTC `YYMMDD` helper.
- `packages/cli/src/commands/shared/date-id.test.ts` - date formatting coverage.
- `packages/cli/src/commands/shared/strip-template-frontmatter.ts` - shared
  template frontmatter stripping.
- `packages/cli/src/commands/shared/strip-template-frontmatter.test.ts` -
  frontmatter stripping coverage.
- `packages/cli/src/commands/pjm/init.ts` - imports the shared stripper.

**Verification:**

- Run:
  `pnpm --filter @open-agent-toolkit/cli exec vitest run src/commands/shared/slug.test.ts src/commands/shared/date-id.test.ts src/commands/shared/strip-template-frontmatter.test.ts src/commands/pjm/init.test.ts`
- Result: passed, 4 files, 23 tests.

**Notes / Decisions:**

- The first RED test run used package-relative Vitest paths and failed because
  the helper modules did not exist yet.
- `slugify` uses NFKD normalization, strips combining marks, lowercases, trims
  separators, truncates to 48 characters, and falls back to `untitled`.
- `yymmdd` uses UTC accessors to avoid local timezone drift.

---

### Task p01-t02: Rewrite Backlog IDs and Harden Index Determinism

**Status:** completed
**Commit:** 9c945de9

**Outcome:**

- Replaced hash-and-scan backlog IDs with allocator-free
  `bl-YYMMDD-slug` generation.
- Updated `oat backlog generate-id` to check item and archived filenames for
  direct collisions and report a disambiguation error instead of probing
  sequential candidates.
- Made backlog index regeneration deterministic by sorting directory entries
  before reading and using direct string comparisons with ID tie-breaks.

**Files changed:**

- `packages/cli/src/commands/backlog/shared/generate-id.ts` - date+slug
  backlog ID generation.
- `packages/cli/src/commands/backlog/shared/generate-id.test.ts` - UTC,
  slug, and determinism coverage.
- `packages/cli/src/commands/backlog/index.ts` - command contract and
  collision checks.
- `packages/cli/src/commands/backlog/index.test.ts` - CLI JSON/text and
  collision coverage.
- `packages/cli/src/commands/backlog/regenerate-index.ts` - stable filename
  and row sort ordering.
- `packages/cli/src/commands/backlog/regenerate-index.test.ts` - repeated
  regeneration and ID tie-break coverage.
- `packages/cli/src/commands/backlog/regenerate-index.readdir-order.test.ts` -
  shuffled readdir determinism coverage.

**Verification:**

- Run:
  `pnpm --filter @open-agent-toolkit/cli exec vitest run src/commands/backlog`
- Result: passed, 5 files, 22 tests.
- Run: `pnpm --filter @open-agent-toolkit/cli type-check`
- Result: passed.

**Notes / Decisions:**

- A direct filename collision is now a user-facing ambiguity rather than an
  allocator responsibility. This preserves the two-machine/no-scan design while
  still warning when a same-day same-slug item already exists.

---

### Task p01-t03: Add Decision Command Init/New/Regenerate

**Status:** pending
**Commit:** -

---

### Task p01-t04: Add Decision Migration

**Status:** pending
**Commit:** -

---

### Task p01-t05: Add Templates, AGENTS Docs, PJM Init, and Doctor Core

**Status:** pending
**Commit:** -

## Phase 2: Path Move and Migration

**Status:** pending
**Started:** -

### Task p02-t01: Move Live Backlog Defaults and Cleanup Guards to `pjm/`

**Status:** pending
**Commit:** -

---

### Task p02-t02: Add `oat pjm migrate` and Migration Prompt Asset

**Status:** pending
**Commit:** -

---

### Task p02-t03: Register Assets and Update Pack Manifests

**Status:** pending
**Commit:** -

## Phase 3: Skills and Lifecycle Destinations

**Status:** pending
**Started:** -

### Task p03-t01: Rewrite PJM Skills and Add Decision Skill

**Status:** pending
**Commit:** -

---

### Task p03-t02: Repoint Lifecycle Decision and Reference Paths

**Status:** pending
**Commit:** -

---

### Task p03-t03: Encode Content-Skill Destinations

**Status:** pending
**Commit:** -

## Phase 4: Polish, Docs, Release, and Cleanup

**Status:** pending
**Started:** -

### Task p04-t01: Update Docs, Templates, and Legacy Guidance

**Status:** pending
**Commit:** -

---

### Task p04-t02: Bump Public Packages and Run Full Verification

**Status:** pending
**Commit:** -

---

### Task p04-t03: Final Sweep and Local Audit Cleanup

**Status:** pending
**Commit:** -

**Notes:**

- Remove `/Users/tstang/code/oat-audit`.
- Remove `/tmp/oat-audit`.

## Orchestration Runs

<!-- orchestration-runs-start -->

No implementation orchestration runs yet.

<!-- orchestration-runs-end -->

## Implementation Log

### 2026-06-23

**Session Start:** project scaffolding and artifact authoring.

- Scaffolded spec-driven OAT project `pjm-refresh`.
- Copied audit bundle from `laptop` to `/Users/tstang/code/oat-audit` and
  `/tmp/oat-audit` for local validation.
- Validated live source claims before design:
  - no `oat decision` command group exists;
  - backlog IDs use hash plus local scan;
  - backlog and PJM init still default to `.oat/repo/reference`;
  - PM pack still ships `decision-record.md`;
  - `oat-project-summary` and `oat-project-pr-final` do not create decision
    records today.
- Added cleanup requirement to remove local audit copies when done.
- [x] p01-t01: Add Shared ID and Template Helpers - 3ade17eb
- [x] p01-t02: Rewrite Backlog IDs and Harden Index Determinism - 9c945de9
- Updated execution controls per user direction:
  - dispatch ceiling set to maximum (`codex: xhigh`, `claude: opus`);
  - implementation HiLL checkpoint set to `p04` only;
  - auto-review at HiLL checkpoints enabled;
  - Tier 1 subagent implementation/review authorized for subsequent phase
    execution.
- [ ] p01-t03: Add Decision Command Init/New/Regenerate - next

**Session End:** ongoing.

## Deviations from Plan / Design

| Task / Review | Source Artifact | Planned / Documented | Actual / Accepted | Reason | Source of Truth | Follow-up |
| ------------- | --------------- | -------------------- | ----------------- | ------ | --------------- | --------- |
| -             | -               | -                    | -                 | -      | -               | -         |

## Test Results

| Phase | Tests Run                                    | Passed | Failed | Coverage                                         |
| ----- | -------------------------------------------- | ------ | ------ | ------------------------------------------------ |
| 1     | shared helper + PJM init focused Vitest run  | 23     | 0      | helper and init unit coverage                    |
| 1     | backlog command and index focused Vitest run | 22     | 0      | backlog ID and deterministic index unit coverage |
| 1     | CLI package type check                       | -      | 0      | TypeScript compile coverage                      |
| 2     | -                                            | -      | -      | -                                                |
| 3     | -                                            | -      | -      | -                                                |
| 4     | -                                            | -      | -      | -                                                |

## Final Summary (for PR/docs)

Pending implementation.

## References

- Plan: `plan.md`
- Design: `design.md`
- Spec: `spec.md`
- Discovery: `discovery.md`
