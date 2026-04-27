---
oat_generated: true
oat_generated_at: 2026-04-27
oat_review_scope: final
oat_review_type: code
oat_review_invocation: manual
oat_project: /Users/thomas.stang/.superconductor/worktrees/open-agent-toolkit/sc-coherent-josephson-3667/.oat/projects/shared/skill-cli-migration
---

# Code Review: final

**Reviewed:** 2026-04-27
**Scope:** final full branch review, `172675e58cbc9b19638a195dede60e9d67186e97..HEAD`
**Files reviewed:** 25
**Commits:** 22 commits

## Summary

The migration is broadly complete: the seven in-scope skills no longer contain shell-level `grep ... state.md` reads, the canonical `oat --json project status` preamble is present, skill/package versions were bumped, and targeted verification passed. I found one Important regression risk in `oat-project-review-provide`: after the existing target-branch/worktree routing updates `PROJECT_PATH`, the new JSON status read still queries the current repo's active project rather than the redirected target worktree/project. The five prior carryover Minor findings remain Minor; none warrant elevation.

## Findings

### Critical

None

### Important

- **Target-branch review can read workflow mode from the wrong active project** (`.agents/skills/oat-project-review-provide/SKILL.md:268`)
  - Issue: Step 1.5 explicitly allows a review target to move to another worktree by rewriting `PROJECT_PATH` to `"$WORKTREE_PATH/$REL_PROJECT"` and stating that downstream artifact validation should use that adjusted path (`.agents/skills/oat-project-review-provide/SKILL.md:212`). The migrated Step 2 status preamble no longer reads `"$PROJECT_PATH/state.md"`; it runs `oat --json project status`, and `packages/cli/src/commands/project/status.ts:51`-`:85` resolves the active project from the command cwd's repo config. That means a review aimed at another worktree can validate required artifacts using the workflow mode from the original/current active project instead of the target project. If the modes differ, review gating can require or skip `spec.md`/`design.md` incorrectly.
  - Fix: In `oat-project-review-provide`, carry a status cwd/path through Step 1.5. When `WORKTREE_PATH` is selected, run the status command against that worktree and ensure its local active project points at `REL_PROJECT` before reading workflow mode, e.g. use `oat --cwd "$WORKTREE_PATH" --json project status` after verifying or setting the target worktree's `activeProject`. If the CLI cannot query an explicit project path without mutating local config, either add that CLI capability or keep this specific branch-target read on the adjusted `PROJECT_PATH/state.md` until the JSON API can preserve the old path-directed behavior.
  - Requirement: Success criterion "Running each skill in a worktree with `oat` on `$PATH` produces unchanged behavior for its status-reporting code paths."

### Minor

- **Cross-skill bash-default inconsistency on `WORKFLOW_MODE`** (`.agents/skills/oat-project-pr-progress/SKILL.md:176`)
  - Issue: `oat-project-pr-progress` keeps `WORKFLOW_MODE=${WORKFLOW_MODE:-spec-driven}` after `jq -r`, while other migrated skills rely on the documented literal `null` sentinel. Because `jq -r` emits `null` for missing keys, the bash default is effectively inert in the error path.
  - Suggestion: Follow up with a consistency sweep. Either delete this fallback to match the canonical contract or document why this skill intentionally keeps it.

- **Unused extracted variables in `oat-project-progress` drift block** (`.agents/skills/oat-project-progress/SKILL.md:210`)
  - Issue: `PHASE`, `PHASE_STATUS`, and `WORKFLOW_MODE` are extracted in the drift-detection block but only `LAST_SHA` is consumed there. This is inert, but it adds noise and can mislead future edits.
  - Suggestion: Trim the block to the consumed field or add a short note that these fields mirror the canonical preamble for parity/testing.

- **Indented preamble in `oat-project-reconcile`** (`.agents/skills/oat-project-reconcile/SKILL.md:108`)
  - Issue: The canonical shell preamble is nested inside a numbered Markdown list, so every line is indented. Bash tolerates the leading whitespace inside the fence, so this is cosmetic.
  - Suggestion: Leave as-is for this PR or normalize indentation in a future docs-only cleanup.

- **Fallback verification command in the plan trims `npx` on nvm hosts** (`.oat/projects/shared/skill-cli-migration/plan.md:440`)
  - Issue: The plan's literal `env PATH="/usr/bin:/bin"` command removes `oat`, but it also removes `npx` in nvm-managed environments. That path produces the swallowed-error `{}` branch and `null`, not the documented `quick` output. `implementation.md` records a corrected Run B that removed only the `oat` directory while retaining node tooling.
  - Suggestion: Update the plan text in a follow-up if the artifact remains active reference material.

- **Tracked public-package version manifest remains gitignored** (`packages/cli/assets/public-package-versions.json:1`)
  - Issue: The generated manifest is tracked and regenerated correctly, but prior review context notes it is also matched by gitignore. This branch did not introduce the quirk.
  - Suggestion: Follow up by negating the gitignore rule for this manifest or untracking it if the intended contract is generated-only.

## Requirements/Design Alignment

**Evidence sources used:** `discovery.md`, `plan.md`, `implementation.md`, `state.md`, prior phase/final review artifacts, actual diff for `172675e58cbc9b19638a195dede60e9d67186e97..HEAD`, changed skill files, `packages/cli/src/commands/project/status.ts`, and `packages/cli/src/commands/project/status.test.ts`. Quick mode has no `spec.md` or `design.md`; design alignment is not applicable.

### Requirements Coverage

| Requirement                                                                            | Status      | Notes                                                                                                                                                                                                        |
| -------------------------------------------------------------------------------------- | ----------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| Migrate the 7 discovered `state.md` grep/awk read paths to `oat --json project status` | partial     | All shell-level `grep ... state.md` reads are gone from migrated `oat-project-*` skills, but `oat-project-review-provide` has a target-worktree path where the JSON read can query the wrong active project. |
| Use `oat` first with `npx @open-agent-toolkit/cli` fallback                            | implemented | Preamble pattern appears in all migrated skills and fallback Run B produced `quick`.                                                                                                                         |
| Preserve null-sentinel parity with no `// ""` defaults                                 | implemented | Live parity probe showed `docsUpdated jq=null grep=null`; no `// ""` defaults found in migrated reads.                                                                                                       |
| Keep writes to `state.md` out of scope                                                 | implemented | Diff review found read-path substitutions only; state write prose/templates remain unchanged.                                                                                                                |
| Add CLI JSON contract test for migrated fields                                         | implemented | `MIGRATED_FIELDS` test exists and targeted vitest run passed 4/4.                                                                                                                                            |
| Bump touched skill versions and lockstep public package versions                       | implemented | Eight touched skills have patch bumps; five public packages are `0.0.51`; `release:validate` passed.                                                                                                         |
| Verify live preambles and fallback branch                                              | implemented | Implementation artifact records smoke tests; manual review reran parity and fallback probes successfully.                                                                                                    |

### Extra Work (not in declared requirements)

None beyond expected OAT bookkeeping/review artifacts and the regenerated public-package version manifest required by release validation.

### Carryover Re-Evaluation

The five deferred/carryover Minor findings were rechecked against branch tip. None should be elevated: they are cleanup/documentation consistency issues or a pre-existing repo hygiene quirk. The new Important finding above is separate and concerns a real target-worktree behavior regression in one migrated read path.

## Verification Commands

Run these to verify the implementation:

```bash
git diff --name-only 172675e58cbc9b19638a195dede60e9d67186e97..HEAD
grep -nrE "^[[:space:]]*[A-Z_]+=\$\(grep .*state\.md" .agents/skills/oat-project-*/SKILL.md
grep -nE 'grep[^|]*state\.md' .agents/skills/oat-project-*/SKILL.md
pnpm --filter @open-agent-toolkit/cli exec vitest run src/commands/project/status.test.ts
pnpm release:validate
pnpm lint
git diff --check 172675e58cbc9b19638a195dede60e9d67186e97..HEAD
```

Manual probes run during review:

```bash
STATE=.oat/projects/shared/skill-cli-migration/state.md
JSON=$(oat --json project status)
for pair in 'workflowMode|oat_workflow_mode' 'phase|oat_phase' 'phaseStatus|oat_phase_status' 'docsUpdated|oat_docs_updated' 'lastCommit|oat_last_commit'; do
  jq_field="${pair%|*}"
  grep_field="${pair#*|}"
  jq_val=$(echo "$JSON" | jq -r ".project.${jq_field}")
  grep_val=$(grep "^${grep_field}:" "$STATE" | head -1 | awk '{print $2}')
  printf '%s jq=%s grep=%s\n' "$jq_field" "$jq_val" "$grep_val"
done

OAT_DIR="$(dirname "$(command -v oat)")"
env PATH="$(echo "$PATH" | tr ':' '\n' | grep -v "^$OAT_DIR$" | paste -sd: -)" bash -lc '
  if command -v oat >/dev/null 2>&1; then
    echo "Unexpected: oat resolved" >&2
    exit 1
  fi
  STATUS_JSON=$(npx @open-agent-toolkit/cli --json project status 2>/dev/null || echo "{}")
  echo "$STATUS_JSON" | jq -r ".project.workflowMode"
'
```

## Recommended Next Step

Run the `oat-project-review-receive` skill to convert findings into plan tasks.
