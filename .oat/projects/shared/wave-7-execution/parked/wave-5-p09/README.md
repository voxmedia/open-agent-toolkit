# Parked wave-5 p09 work (recovered 2026-09-08)

The wave-5 lane p09 (`2026-09-02-defer-activeproject-clearing-on-archive-completions.md`,
`BL-260907-make-the-completion-seal`) parked on its own STOP without committing.
Its dirty worktree `.worktrees/wave-5/p09` was removed at the wave-5 close and the
scratchpad copy of its patch was lost to a session restart; the branch
`wave-5/p09` points at the group-4 base `956773dc6832dea1a765bfa61716e824166878fc`
and carries no p09 commit.

## Contents

| File                                        | Lines | What it is                                                                                      |
| ------------------------------------------- | ----- | ----------------------------------------------------------------------------------------------- |
| `p09-parked-tracked.patch`                  | 218   | `git diff` of the three tracked files the lane modified, against `956773dc6`                    |
| `validate-durable-archive-receipt.mjs`      | 165   | untracked `.agents/skills/oat-project-complete/scripts/validate-durable-archive-receipt.mjs`    |
| `validate-durable-archive-receipt.test.mjs` | 249   | untracked `.agents/skills/oat-project-complete/tests/validate-durable-archive-receipt.test.mjs` |

## Provenance and verification

- Source: the wave-5 p09 implementer transcript (`agent-a1873311371d94721`, request
  `w5-p09-impl-001`): every `Write`/`Edit` tool call on the five files, replayed in
  order on the `956773dc6` versions, followed by the lane's two post-edit Python
  patch scripts (one on the test, one on the validator), exactly as recorded.
- Checks against the p04 plan's step-1 Verify: `git apply --stat` = 3 files,
  117 insertions, 17 deletions; the patch is 218 lines; the two files are 165 and
  249 lines — all four figures match.
- Independent confirmation: the replayed `SKILL.md` is byte-identical to a
  dangling blob the lane had staged (`git cat-file -p c814b0605aaecf1afaaaa4d5dec0c5f5854a8450`).
- The recovered test passes 13/13 under `node --test` beside the recovered
  validator on the wave-7 base; `git apply --check p09-parked-tracked.patch`
  exits 0 at the wave-7 base `684bd3be3`.
- SHA-256: patch `ee24f4b236761f9d25ad46822a1a3a14aac2fd18644fd1dee0065a4febfbe3a1`,
  validator `4fc3569122eb94f06c39cc009f8e12a5ca8b0ba64fa82c1931a1b9db3edd1187`,
  test `4f419ca5e7abe4fbbbba700de0689963b306762d249bdfb17b473747eaceae9b`.

The p04 lane runs its step 1 against this directory (`git apply --check` on the
patch; `cp` of the two files) instead of the removed worktree. This is a
recovery of the same bytes, not a re-derivation from the parked plan's steps.
