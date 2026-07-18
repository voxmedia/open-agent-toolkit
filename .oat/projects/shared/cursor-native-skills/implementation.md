---
oat_status: in_progress
oat_ready_for: null
oat_blockers: []
oat_last_updated: 2026-07-18
oat_current_task_id: p03-t01
oat_generated: false
---

# Implementation: cursor-native-skills

**Started:** 2026-07-18
**Last Updated:** 2026-07-18

## Progress Overview

| Phase | Status      | Tasks | Completed |
| ----- | ----------- | ----- | --------- |
| p01   | complete    | 2     | 2/2       |
| p02   | complete    | 2     | 2/2       |
| p03   | in_progress | 3     | 0/3       |
| p04   | pending     | 2     | 0/2       |

**Total:** 4/9 tasks completed

## Phase 1: Native-Read Mapping and Adoption Sources

**Status:** complete

### Phase Summary

- Cursor project and user skills are native-read from `.agents/skills`.
- `.cursor/skills` is modeled separately as an adoption source.
- Init, status, drift, and skill-removal scans can inspect provider-local
  Cursor skills without making them sync targets.
- Cursor agents and rules retain their existing mappings.

**Verification:** 173 focused tests passed; package format, type-check, and lint
passed.

### Task p01-t01: Model Cursor skills as native-read

**Status:** completed  
**Commit:** `74964c2e`

Provider metadata now separates adoption directories from sync targets and
Cursor's skill mappings satisfy the native-read mapping contract.

### Task p01-t02: Scan provider-local adoption sources

**Status:** completed  
**Commit:** `c45145ce`

Provider-local adoption scans are wired through drift, init, status, and skill
removal while ordinary provider behavior remains unchanged.

## Phase 2: Safe Legacy View Retirement

**Status:** complete

### Phase Summary

- Obsolete mapping retirement now re-verifies managed provider paths before
  deletion.
- Clean legacy views are removed, missing views are untracked, and changed or
  unverified views are preserved and detached for migration.
- Project and user upgrade behavior is covered through engine, command
  integration, and end-to-end tests.

**Verification:** 74 focused tests passed; package format, type-check, and lint
passed.

### Task p02-t01: Add preservation-aware detach operations

**Status:** completed  
**Commit:** `77a1b3bb`

Retirement planning and execution now distinguish safe removal from
preservation-aware manifest detachment.

### Task p02-t02: Cover Cursor upgrade behavior end to end

**Status:** completed  
**Commit:** `510a34f6`

Integration coverage verifies clean, missing, modified, and unmanaged Cursor
skill upgrade paths at project and user scope.

## Phase 3: Per-Skill Decisions and User Config Migration

**Status:** in_progress

### Task p03-t01: Canonicalize user known-stray configuration

**Status:** pending  
**Commit:** -

### Task p03-t02: Support native-read adopt and keep-local actions

**Status:** pending  
**Commit:** -

### Task p03-t03: Wire individual choices into init and status

**Status:** pending  
**Commit:** -

## Phase 4: Documentation, Release Metadata, and Final Validation

**Status:** pending

### Task p04-t01: Update provider and configuration documentation

**Status:** pending  
**Commit:** -

### Task p04-t02: Bump public packages and run release validation

**Status:** pending  
**Commit:** -

## Orchestration Runs

<!-- orchestration-runs-start -->

### Run 1 — 2026-07-18

- Branch: `cursor-sync`
- Execution: sequential
- HiLL checkpoint: after p04
- Phase p01: complete
- Phase p02: complete
- Phase p03: next

<!-- orchestration-runs-end -->

## Implementation Log

### 2026-07-18

- [x] p01-t01: Model Cursor skills as native-read — `74964c2e`
- [x] p01-t02: Scan provider-local adoption sources — `c45145ce`
- [x] p02-t01: Add preservation-aware detach operations — `77a1b3bb`
- [x] p02-t02: Cover Cursor upgrade behavior end to end — `510a34f6`
- [ ] p03-t01: Canonicalize user known-stray configuration

**Decisions:**

- Preserve the native-read contract by keeping `providerDir` equal to the
  canonical directory and representing `.cursor/skills` as an adoption source.
- Keep the pre-existing manifest version update unstaged and outside phase
  commits.

**Blockers:** None.

## Deviations from Plan / Design

None.

## Test Results

| Phase | Tests Run | Passed | Failed | Notes                         |
| ----- | --------- | ------ | ------ | ----------------------------- |
| p01   | 173       | 173    | 0      | Format, type-check, lint pass |
| p02   | 74        | 74     | 0      | Format, type-check, lint pass |
| p03   | -         | -      | -      | Pending                       |
| p04   | -         | -      | -      | Pending                       |

## Final Summary (for PR/docs)

Pending implementation completion.

## References

- Plan: `plan.md`
- Design: `design.md`
- Discovery: `discovery.md`
