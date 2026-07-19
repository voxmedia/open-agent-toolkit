---
oat_generated: true
oat_generated_at: 2026-07-18T22:13:06Z
oat_review_scope: p-rev1
oat_review_type: code
oat_review_invocation: manual
oat_project: .oat/projects/shared/wave-skills-promotion
oat_request_id: wave-skills-promotion-prev1-review-1
---

# Code Review: p-rev1

**Reviewed:** 2026-07-18T22:13:06Z
**Scope:** Revision phase p-rev1, commits `e6c3bda65ef7eeddb8f743121b3c35486bd20f95..582eeff2`
**Files reviewed:** 3 changed files plus the execution-program template as supporting evidence
**Commits:** 3
**Verdict:** PASS under the requested threshold (0 Critical, 0 Important); one Medium artifact-consistency finding remains

## Summary

Tasks prev1-t01 and prev1-t02 genuinely resolve their source Bugbot findings: both fixture grep sites accept template-shaped link rows and plain rows, and the sync-commit path now commits the staged set without path expansion while accurately failing its status and process exit. Task prev1-t03 clears the machine-readable blocker and updates the specifically targeted Progress and Next Milestone text, but two other `state.md` sentences still say p06 is blocked, contradicting the opened-gate state.

Findings: 0 critical, 0 important, 1 medium, 0 minor

## Findings

### Critical

None.

### Important

None.

### Medium

- **Opened p06 RC gate still described as blocked in state prose** (`.oat/projects/shared/wave-skills-promotion/state.md:54`)
  - Issue: `oat_blockers` is empty and the Blockers section says the RC gate opened, but Current Phase still says p06 “is blocked on the packaged explainer-kit v1 RC.” The Artifacts entry at line 64 separately says “p06 blocked.” These statements are stale and fail prev1-t03's requirement that frontmatter, prose, and the plan gate note be mutually consistent.
  - Fix: Update both passages to say the RC gate is open and p06 awaits PR #158 merge followed by the mandatory RC-schema plan revision and phase re-review.
  - Requirement: prev1-t03

### Minor

None.

## Requirements/Design Alignment

**Evidence sources used:** `plan.md` Phase p-rev1 task bodies; `spec.md`; `design.md`; `implementation.md`; the four PR #158 Bugbot comments (IDs 3609070068, 3609072481, 3609072482, 3609163349); changed files in the authoritative commit range; `.agents/skills/oat-wave-program/assets/execution-program-template.md`.

### Revision Coverage

| Task      | Status   | Notes                                                                                                                                                                                                    |
| --------- | -------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| prev1-t01 | resolved | Both `PROGRAM_COUNT` sites use the same ERE. It returned 2 for one template-shaped link row and one plain row; the real template row starts `\| [{ plan }](./{ file }.md)`.                              |
| prev1-t02 | resolved | `FILES` and `$FILES` are absent; `git commit` receives no path arguments. An isolated failure probe exited 1 with only `status=failed reason=sync-commit`; the corresponding successful commit exited 0. |
| prev1-t03 | partial  | Frontmatter is `oat_blockers: []`; CLI JSON reports `blockers: []`; targeted Progress/Next Milestone phrases are fixed. Stale blocked prose remains at lines 54 and 64.                                  |

### Extra Work

None. The range contains exactly the three declared commits; each commit changes only its task's single declared file.

## Verification Table

| Check                          | Method                                                                                                                                                                                                    | Result                                                                                          |
| ------------------------------ | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------- |
| Template-shaped and plain rows | Ran `printf` with `\| [mini-p01](./mini-p01-alpha-plan.md) \| ...` and `\| mini-p02 \| ...` through `grep -cE '^\| \[?mini-p0[123]'`; inspected the actual template row at line 29.                       | PASS: count 2; both README sites contain the verified ERE.                                      |
| Bash 3.2 portability           | Ran `/bin/bash -n` and searched for `mapfile` / `declare -A` under macOS `/bin/bash` 3.2.57.                                                                                                              | PASS: syntax clean; no prohibited constructs.                                                   |
| Sync-commit failure            | Materialized the fixture, used the bootstrap hook to modify and stage `.oat/sync/manifest.json`, and put a `git` shim first on `PATH` that delegates every operation except `commit`, which exits 73.     | PASS: script exited 1, emitted `status=failed reason=sync-commit`, and emitted no success line. |
| Sync-commit happy path         | Repeated the same materialized-fixture probe with real `/usr/bin/git`.                                                                                                                                    | PASS: sync commit created; script exited 0 with `status=success ... git_clean=pass`.            |
| Machine-readable blocker       | Ran `oat project status --project-path .oat/projects/shared/wave-skills-promotion --json` and asserted `.project.blockers == []`.                                                                         | PASS.                                                                                           |
| State prose consistency        | Searched `state.md` case-insensitively for blocker/blocked and RC-wait phrasing, then compared the matches with frontmatter, the Blockers section, Next Milestone, and the p06 plan gate-open checkpoint. | PARTIAL: lines 54 and 64 still call p06 blocked.                                                |
| Commit and range hygiene       | Ran `git rev-list --count`, `git diff-tree` per commit, `git diff --name-status`, `git diff --check`, and inspected all three subjects against the plan's conventional-commit format.                     | PASS: 3 commits, one declared file each, conventional subjects, no unrelated changes.           |

## Verification Commands

```bash
/bin/bash -n .agents/skills/oat-wave-execute/scripts/bootstrap-group.sh
rg -n 'mapfile|declare -A|FILES=' .agents/skills/oat-wave-execute/scripts/bootstrap-group.sh
printf '| [mini-p01](./x.md) |\n| mini-p02 |\n' | grep -cE '^\| \[?mini-p0[123]'
oat project status --project-path .oat/projects/shared/wave-skills-promotion --json | jq -e '.project.blockers == []'
rg -n '(?i)block(ed|er|ers)|when the RC ships|RC ships|waiting? for.*RC' .oat/projects/shared/wave-skills-promotion/state.md
git diff --check e6c3bda65ef7eeddb8f743121b3c35486bd20f95..582eeff2
```

## Recommended Next Step

Run `oat-project-review-receive` to convert the Medium state-prose finding into a bounded revision task, then re-run the p-rev1 review.
