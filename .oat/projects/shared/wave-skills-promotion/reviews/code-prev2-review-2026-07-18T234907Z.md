---
oat_generated: true
oat_generated_at: 2026-07-18T23:49:07Z
oat_review_scope: p-rev2
oat_review_type: code
oat_review_invocation: manual
oat_project: .oat/projects/shared/wave-skills-promotion
---

# Code Review: p-rev2

**Reviewed:** 2026-07-18T23:49:07Z
**Scope:** Revision phase p-rev2
**Files reviewed:** 10
**Commits:** `9a190ffa054b29b7127051bb656cb9564411b3f4..f9257c72` (3 commits)

## Summary

Pass. The installer fix covers both implicated copy paths, and both regression tests start from a mode-normalized `0644` skill script before asserting an executable installed copy. The runbook and lockstep patch release satisfy the revision plan, and independent targeted tests plus release validation pass on the final committed state.

Findings: 0 critical, 0 important, 0 medium, 0 minor

## Findings

### Critical

None.

### Important

None.

### Medium

None.

### Minor

None.

## Requirements/Design Alignment

**Evidence sources used:** `spec.md`, `design.md`, `plan.md` (Phase p-rev2), `implementation.md`, `references/w6-migration-report-2026-07-18.md`, and the authoritative commit range.

### Revision Coverage

| Task      | Status      | Evidence                                                                                                                                                                      |
| --------- | ----------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| prev2-t01 | implemented | `copyDirWithVersionCheck` covers workflow installation; `copyDirWithStatus` covers `tools update`. Both call the post-copy executable normalization helper.                   |
| prev2-t02 | implemented | Runbook §1 inspects all six packed files; §2 removes stale provider views and requires clean `oat status --scope all`; the chmod workaround is explicitly retired for 0.2.1+. |
| prev2-t03 | implemented | All five public package manifests are 0.2.1; the generated public-package version asset contains 0.2.1 for every package it is designed to record.                            |

### Defect-Fix Verification

- The helper starts at `<skill destination>/scripts` and recursively chmods regular files there; it does not chmod `SKILL.md`, assets, references, or other skill content.
- Workflow installation reaches the helper through `installWorkflows` → `copyDirWithVersionCheck`.
- Skill updates reach the helper through `updateTools` → `copyDirWithStatus`.
- The workflow-install regression test explicitly changes its source fixture to `0644`, proves the fixture has no execute bits, executes `installWorkflows`, and asserts execute bits on the installed script.
- The update regression test creates an `0644` source fixture, proves it has no execute bits, invokes the real `updateTools` skill path with the real `copyDirWithStatus`, and asserts execute bits on the installed script.
- An independent package inspection confirmed the packed CLI still carries `bootstrap-group.sh` as `rw-r--r--`, so the tests reproduce the published-package condition and exercise the required install-time correction.

### Extra Work

None. Each of the three commits changes only its plan-declared files.

## Boundaries and Hygiene

| Check                                                        | Result                 |
| ------------------------------------------------------------ | ---------------------- |
| Exactly three commits in range                               | Pass                   |
| One task commit per planned revision task                    | Pass                   |
| Conventional subjects match plan                             | Pass                   |
| Declared files only                                          | Pass                   |
| Worktree at reviewed commit                                  | Pass (`HEAD=f9257c72`) |
| Final generated version asset coherent with manifests        | Pass                   |
| Concurrent-regeneration race left no committed inconsistency | Pass                   |

## Verification

| Command                                                                                                                                                            | Result                                                    |
| ------------------------------------------------------------------------------------------------------------------------------------------------------------------ | --------------------------------------------------------- |
| `pnpm --filter @open-agent-toolkit/cli exec vitest run src/commands/init/tools/workflows/install-workflows.test.ts src/commands/tools/update/update-tools.test.ts` | Pass: 2 files, 35 tests                                   |
| `pnpm release:validate`                                                                                                                                            | Pass: all 5 public packages packed and validated at 0.2.1 |
| Pack CLI to a temporary directory and inspect `bootstrap-group.sh` with `tar -tvzf`                                                                                | Pass: packed mode reproduced as `rw-r--r--`               |
| Commit-count, ancestry, status, and scoped `git diff --exit-code` checks                                                                                           | Pass                                                      |

## Verdict

**PASS** — 0 Critical and 0 Important findings.

The install-time chmod would have prevented stoa's finding on both workflow installation and `oat tools update`.

## Recommended Next Step

Receive and record this passing review in the project tracking artifacts.
