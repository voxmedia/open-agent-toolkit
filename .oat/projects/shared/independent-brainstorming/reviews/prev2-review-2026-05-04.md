---
oat_generated: true
oat_generated_at: 2026-05-04
oat_review_scope: prev2
oat_review_type: code
oat_review_invocation: manual
oat_project: .oat/projects/shared/independent-brainstorming
---

# Code Review: prev2 (revision 2)

**Reviewed:** 2026-05-04
**Scope:** revision phase `p-rev2` plus follow-up fixes now on HEAD
**Range:** `a1b8a039^..04911d33` (6 commits: `a1b8a039`, `589434ce`, `0bcdd611`, `4f7a6bfb`, `88c9df56`, `04911d33`)
**Files reviewed:** 22
**Workflow mode:** quick
**Artifacts available:** `discovery.md`, `design.md`, `plan.md`, `implementation.md`, `state.md`, `summary.md`

## Summary

The YAML frontmatter parse failure in `oat-brainstorm` is fixed: the description now parses cleanly and remains under the 500-character limit. The follow-up skill metadata commit also fixed the previously unrelated validation failures, so `pnpm oat:validate-skills` now passes for all 48 OAT skills. The three-tier activation contract is directionally right and most docs/dogfood updates line up with the intended behavior.

I found three blocking issues before merge: `thoughts?` still appears in the soft/ambiguous activation surface even though the contract says it is No Activation, the full CLI test suite fails in Codex-style `CODEX_CI=1` environments because the visual-companion smoke tests start the server in foreground mode, and PR #70 is currently dirty against `origin/main`.

## Findings

### Critical

None.

### Important

- **`thoughts?` is still documented as a Soft Exploratory trigger, contradicting No Activation** (`.agents/skills/oat-brainstorm/SKILL.md:4`, `.agents/skills/oat-brainstorm/SKILL.md:48`, `apps/oat-docs/docs/cli-utilities/tool-packs.md:181`)
  - Issue: The frontmatter description says ambiguous exploratory phrasing includes `"thoughts?"` and should "offer mode only after >=2 sustained exploratory turns." The contract later classifies `"thoughts?"` under No Activation, and the dogfood anti-case expects a direct advisory response with no offer. The docs repeat both classifications: `tool-packs.md` places `"thoughts?"` in the Soft Exploratory examples and then again in the advisory / No Activation examples.
  - Why it matters: This preserves the trigger-happy failure mode prev2 is meant to remove. A generic "thoughts?" should never select or later offer OAT brainstorm mode unless the user explicitly asks to brainstorm.
  - Fix guidance: Remove `"thoughts?"` from the ambiguous/soft examples in frontmatter and docs. Consider keeping frontmatter focused on hard activation plus a generic "ambiguous exploratory phrasing does not auto-enter" note, with the detailed soft/no-activation examples only in the body.
  - Verification: `rg -n 'thoughts\\?' .agents/skills/oat-brainstorm/SKILL.md apps/oat-docs/docs/cli-utilities/tool-packs.md .agents/skills/oat-brainstorm/references/dogfood-results.md` should show `thoughts?` only in No Activation / advisory contexts.

- **Full CLI tests fail under `CODEX_CI=1` because visual-companion smoke tests wait for a foreground server process to exit** (`.agents/skills/oat-brainstorm/scripts/start-server.sh:70`, `packages/cli/src/integration/visual-companion-smoke.test.ts:76`)
  - Issue: `start-server.sh` automatically sets `FOREGROUND=true` when `CODEX_CI` is present. The smoke tests spawn `start-server.sh` and resolve only on the child process `close` event. In a Codex environment where `CODEX_CI=1`, the script runs `node server.cjs` in the foreground, so the child never closes and all five smoke tests time out at 30s.
  - Evidence: `pnpm --filter @open-agent-toolkit/cli test` failed with 5/5 failures in `src/integration/visual-companion-smoke.test.ts` after 150s. Running the same smoke test with `env -u CODEX_CI` passed 5/5 in 13.30s.
  - Why it matters: The implementation notes claim the full CLI suite passes, but the suite is not runnable in the Codex environment used for this review. Since OAT explicitly supports Codex workflows, validation should not require unsetting a provider environment variable by hand.
  - Fix guidance: In the test harness, either pass `--background` when spawning `start-server.sh` or scrub `CODEX_CI` from the child environment for these tests. Keep the runtime script's foreground fallback for real Codex usage if that is still the desired behavior.
  - Verification: With `CODEX_CI=1`, run `pnpm --filter @open-agent-toolkit/cli exec vitest run src/integration/visual-companion-smoke.test.ts`; it should pass without requiring `env -u CODEX_CI`.

- **PR #70 is currently dirty against `origin/main`** (`packages/cli/package.json:3`, `packages/control-plane/package.json:3`, `packages/docs-config/package.json:3`, `packages/docs-theme/package.json:3`, `packages/docs-transforms/package.json:3`)
  - Issue: `gh pr view 70 --json mergeStateStatus` reports `DIRTY`. `git merge-tree` shows conflicts in all five lockstep package version files because `origin/main` now includes `v0.0.60` from PR #73 while this branch has `0.0.62`.
  - Why it matters: Even if the code issues are fixed, the PR is not mergeable until the branch is rebased or merged over the latest main.
  - Fix guidance: Rebase or merge `origin/main`, resolve the five package version conflicts by keeping the correct next branch version, then rerun `pnpm release:validate` and PR checks.
  - Verification: `gh pr view 70 --json mergeStateStatus` should report `CLEAN`.

### Medium

None.

### Minor

- **OAT bookkeeping still points at the pre-follow-up prev2 commit** (`.oat/projects/shared/independent-brainstorming/state.md:3`, `.oat/projects/shared/independent-brainstorming/state.md:71`, `.oat/projects/shared/independent-brainstorming/plan.md:1883`)
  - Issue: `state.md` still has `oat_last_commit: 589434ce` and says the next milestone is a focused re-review of commit `589434ce`, but HEAD now includes the YAML fix (`4f7a6bfb`), strict-YAML backlog item (`88c9df56`), and skill metadata validation fix (`04911d33`). The implementation summary at the end of `plan.md` also stops at p-rev1 and still says `Total: 35 tasks`, while the project state says p-rev2 made the project 38/38.
  - Why it matters: This is not shipped behavior, but it makes lifecycle routing and later archive summaries less trustworthy.
  - Fix guidance: After review-receive/fixes, refresh `state.md` and the plan completion summary so they describe the current reviewed commit set.

- **New strict-YAML backlog item has minor markdown spacing issues** (`.oat/repo/reference/backlog/items/strict-yaml-validation-in-validate-skills.md:21`)
  - Issue: The description has run-together inline code: `` `verb:`was ``, ``scalar.`pnpm``, and ``returned exit 0; downstream consumers raised`mapping``.
  - Why it matters: Low-risk documentation polish, but this item is meant to be a durable backlog reference.
  - Fix guidance: Add spaces around those inline-code spans.

## Spec / Design Alignment

### Requirements Coverage

| Requirement                                                                                            | Status                                 | Notes                                                                                                                                      |
| ------------------------------------------------------------------------------------------------------ | -------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------ |
| Hard Activation only for explicit `/oat-brainstorm` or explicit `brainstorm` verb                      | implemented                            | `SKILL.md` Step 1 gates the full process on explicit brainstorm invocations or user acceptance of the soft offer.                          |
| Soft Exploratory Path answers with brainstorm-quality structure without banner on first response       | implemented                            | `SKILL.md` lines 32-46 and Step 1 lines 146-148 encode the no-banner path and one-time offer rule.                                         |
| No Activation for advisory / review / debug / PR / status / implementation / active-workflow questions | partial                                | Body and dogfood matrix classify advisory requests correctly, but frontmatter/docs still put `"thoughts?"` in the soft/ambiguous surface.  |
| Visual companion offer remains conditional                                                             | implemented                            | The activation contract suppresses visual-companion offer on soft/no-activation paths; the earlier visual-likely gating remains in Step 3. |
| Docs reflect activation tightening and prev1 minors                                                    | partial                                | Skills/ideas docs reflect the narrowed idea path and direct brainstorm entry; tool-packs docs need the `"thoughts?"` classification fix.   |
| Lockstep public packages are at `0.0.62`                                                               | implemented locally, blocked by rebase | All five local package files are at `0.0.62`; the PR has version conflicts with latest main and needs a rebase/merge resolution.           |
| `oat-brainstorm` frontmatter parses after YAML fix                                                     | implemented                            | Ruby YAML parser loaded the frontmatter successfully; `pnpm oat:validate-skills` passes for all 48 OAT skills after `04911d33`.            |

### Extra Work

- `88c9df56` adds backlog item `bl-f19a` for strict YAML validation. That is a reasonable follow-up capture for the parser gap found during dogfood, but it sits outside the p-rev2 activation contract itself.
- `04911d33` fixes the six previously unrelated skill metadata validation failures and bumps the lockstep public packages to `0.0.62`. That makes `pnpm oat:validate-skills` clean, but it is broader than the activation-contract change.

## Verification Commands

Commands run during review:

```bash
pnpm release:validate
pnpm format
pnpm lint
pnpm type-check
pnpm oat:validate-skills
pnpm --filter @open-agent-toolkit/cli test
env -u CODEX_CI pnpm --filter @open-agent-toolkit/cli exec vitest run src/integration/visual-companion-smoke.test.ts
gh pr view 70 --json headRefOid,baseRefOid,mergeStateStatus,statusCheckRollup,reviewDecision
git merge-tree $(git merge-base HEAD origin/main) HEAD origin/main
```

Results:

- `pnpm release:validate`: pass for all five public packages at `0.0.62`.
- `pnpm format`: pass.
- `pnpm lint`: pass.
- `pnpm type-check`: pass.
- `pnpm oat:validate-skills`: pass (`OK: validated 48 oat-* skills`).
- `pnpm --filter @open-agent-toolkit/cli test`: fail in current Codex environment, 5 timed-out visual companion smoke tests.
- `env -u CODEX_CI ... visual-companion-smoke.test.ts`: pass, 5/5.
- `gh pr view 70`: `mergeStateStatus` is `DIRTY`.

## Recommended Next Step

Run `oat-project-review-receive` for `prev2`, add fix tasks for the Important findings, and re-run this focused review after the branch is updated over `origin/main`.
