---
oat_generated: true
oat_generated_at: 2026-09-15T04:38:25Z
oat_review_scope: plan
oat_review_type: artifact
oat_review_invocation: gate
oat_project: .oat/projects/shared/recon-1-1-2-follow-ups
oat_gate_headless: true
oat_gate_run_id: f0f323e4-a4a0-4513-b19e-8eaf638b3464
oat_gate_target: claude-fable-skip-permissions
oat_gate_runtime: claude
oat_invocation_model: fable
oat_invocation_reasoning_effort: provider-default
oat_invocation_source: exec-target-config
---

# Artifact Review: plan

**Reviewed:** 2026-09-15T04:38:25Z
**Scope:** `plan.md` for the lite project `recon-1-1-2-follow-ups` (Summary, Decisions, Product Behavior, Technical Design, Assumptions, Out of Scope, Validation Criteria, and the five `p01` tasks), re-reviewed after the seven prior gate findings were received, and checked against the current recon source tree, tracked provider projections, and release assets
**Files reviewed:** 1 artifact (`plan.md`), plus `implementation.md`, `state.md`, the archived prior review, the triage record, and the recon scripts, tests, references, docs, provider projections, CLI validation tests, and release assets the tasks touch
**Commits:** n/a (artifact review; plan committed at `9304af194`)

## Dispatch Audit

- Gate route: inline (runtime=claude, cliRoot=/Users/tstang/Library/pnpm/store/v11/links/@open-agent-toolkit/cli/0.2.73/afc23552d6e99f827184b64b9edc26ee5de02e57cf7345ac4c64143732be1c02/node_modules)
- Dispatch: scope=plan action=review role=reviewer producer=unknown provenance=unknown model_axis=selected:opus effort_axis=not-applicable dispatch_policy=high dispatch_ceiling=opus target=opus
- target: opus (launcher-selected/config-declared)
- model_axis: selected:opus (launcher-selected/config-declared)
- effort_axis: not-applicable (launcher-selected/config-declared)
- runtimeIdentity: not-reported
- Reviewer role: `~/.agents/agents/oat-reviewer.md` (canonical, executed inline per the validated `inline` gate route)

## Summary

All seven findings from the prior gate review are resolved in the plan as committed: the CLI validation pin is now in p01-t04 and p01-t05, the Cursor materialization command runs (3 tests pass), the sixth CLI uses the shared entry helper, the catalog-versus-install sentence is bound to p01-t01, the triage dispositions are explicit, the lockfile is out of the oxfmt target list, and the projection wording is correct. One new Important finding blocks: the tracked Codex projection of the worker role is a full-body copy that every prior change to the canonical role also updated, and no task or commit list includes it, so Codex hosts would keep the removed `reconcile` mode. One Medium finding corrects p01-t05's release-surface file list, which names a lockfile that lockstep bumps never touch and omits the bundled version asset they always change.

Findings: 0 critical, 1 important, 1 medium, 0 minor

## Findings

### Critical

None

### Important

1. **Hidden consumer: the tracked Codex projection `.codex/agents/recon-worker.toml` is a body copy of the canonical role and no task regenerates or commits it** — `.codex/agents/recon-worker.toml` is a 137-line `oat-managed` projection whose `developer_instructions` repeat the worker body, including the `reconcile` mode at lines 9, 21, and 98, and `.codex/config.toml:127-129` binds `[agents.recon-worker]` to that file. Both commits that ever changed `.agents/agents/recon-worker.md` (`06031f6cf`, `7c90b220a`) also changed the toml, and PR #285 committed 48 changed lines in it. Tasks p01-t01, p01-t03, p01-t04, and p01-t05 all modify the canonical role (`plan.md:166`, `280`, `340`, `451`), but none of their Files lists or `git add` commands (`plan.md:216`, `330`, `440`, `518`) name the projection, and p01-t05 Step 1 only says "refresh ... bundled assets through documented commands" (`plan.md:480-481`) without naming a sync command or its output file. No CI gate detects this drift: `.github/workflows` and `tools/smoke` contain no sync drift check, so the definition-of-done sequence in p01-t05 Step 4 passes with a stale projection. The result is a shipped behavior split: Claude and Cursor read the canonical file through symlinks (`.claude/agents/recon-worker.md`, `.cursor/agents/recon-worker.md`), while Codex workers keep the removed `reconcile` mode and never receive the background, exact-excerpt, self-validation, or no-replacement rules that Product Behaviors 1, 5, and 6 require. Fix: in p01-t05 Step 1, replace the vague "bundled assets" clause with an explicit provider-view refresh through the repository's documented sync command (`pnpm run cli -- sync --scope project`, the project-scoped form of the `oat sync` refresh named in `AGENTS.md`, so the run does not rewrite user-scope agent views), add `.codex/agents/recon-worker.toml` to the p01-t05 Files list and `git add` command, and state that `.claude` and `.cursor` views are symlinks that need no regeneration. Add a Step 2 check that `git status --porcelain .codex .cursor .claude` is empty after the sync so a second drifted projection cannot slip through.

### Medium

1. **p01-t05's release-surface file list names `pnpm-lock.yaml`, which lockstep bumps never touch, and omits `packages/cli/assets/public-package-versions.json`, which they always change** — `plan.md:460` lists `pnpm-lock.yaml` as Modify and `plan.md:518` stages it, but the three most recent lockstep bump commits (`81bf04c1e`, `06031f6cf`, `3f55a3a8e`) contain no lockfile change because workspace packages depend on each other through `workspace:*`. Each of those commits does change `packages/cli/assets/public-package-versions.json` (4 insertions, 4 deletions), a tracked file that `packages/cli/scripts/bundle-assets.sh:86` rewrites every time `pnpm build` or `pnpm run cli` runs and that currently pins `0.2.74` for `cli`, `docs-config`, `docs-theme`, and `docs-transforms`. Because p01-t05 Step 4 runs `pnpm build` and `pnpm run cli` (through `oat:validate-skills` and `check:skill-bumps`), the bump regenerates that asset, but the task's `git add` list excludes it, so the commit leaves a required tracked change dirty in the working tree and the PR ships a stale bundled version file unless someone notices. Fix: replace `pnpm-lock.yaml` with `packages/cli/assets/public-package-versions.json` in the p01-t05 Files list (`plan.md:460`) and `git add` command (`plan.md:518`), and reword "refresh the lockfile" (`plan.md:480`) to "regenerate the bundled version asset through `pnpm build`".

### Minor

None

## Requirements/Design Alignment

### Requirements Coverage

| Requirement                                           | Status  | Notes                                                                                                                                                                        |
| ----------------------------------------------------- | ------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| PB1 Cursor continuity (background leaves)             | covered | p01-t01; `parseCanonicalAgentMarkdown` keeps raw frontmatter and `materialize.ts:56-62,80-86` passes `is_background` through, so the planned proof is implementable          |
| PB2 Durable lane completion (artifact over stream)    | covered | p01-t01 workflow.integration controls                                                                                                                                        |
| PB3 Truthful role availability (catalog vs install)   | covered | p01-t01 Step 1 now adds the sentence and the skill-contract assertion (prior Medium 2 resolved)                                                                              |
| PB4 Reliable bundled commands (realpath entry)        | covered | p01-t02 for the five guarded CLIs (`validate-artifact.mjs:89-90` pattern confirmed); p01-t04 routes the sixth through the shared helper (prior Medium 1 resolved)            |
| PB5 Actionable worker output rules                    | partial | p01-t03 covers canonical and symlinked views; the Codex projection is not regenerated (Important 1)                                                                          |
| PB6 Unambiguous reconciliation ownership              | partial | p01-t04 covers scripts, contracts, tests, and the `skills.test.ts:8465` pin (prior Important 1 resolved); the Codex projection keeps the `reconcile` mode (Important 1)      |
| Decision: revise triage record in the PR              | covered | p01-t05 Step 1 now states status, approval, post-merge, and backlog dispositions (prior Medium 3 resolved)                                                                   |
| Out of Scope (no locator repair, no controller retry) | honored | No task adds either mechanism                                                                                                                                                |
| Version/lockstep policy                               | partial | recon 1.1.2, recon-worker 1.0.1, and all five packages at 0.2.74 equal `origin/main`, so bumps are required; the bundled version asset is missing from the commit (Medium 1) |
| Validation criterion 1 command                        | covered | `pnpm --filter @open-agent-toolkit/cli exec vitest run src/providers/cursor/codec/materialize.test.ts` exits 0 with 3 tests (prior Important 2 resolved)                     |
| Recon regression baseline                             | covered | `node --test .agents/skills/recon/tests/*.test.mjs` passes 281 tests on the current tree                                                                                     |

### Extra Work (not in declared requirements)

None

### Dispatch Profile

No `## Dispatch Profile` section is present; this is normal and not a finding.

## Verification Commands

```bash
# Important 1: the Codex projection is a body copy that co-changes with the canonical role
grep -n "reconcile" .codex/agents/recon-worker.toml | head
git log --format=%h -- .agents/agents/recon-worker.md
git log --format=%h -- .codex/agents/recon-worker.toml
git ls-files .claude/agents/recon-worker.md .cursor/agents/recon-worker.md .codex/agents/recon-worker.toml
ls -la .claude/agents/recon-worker.md .cursor/agents/recon-worker.md
grep -rln "sync" .github/workflows tools/smoke | xargs grep -ln "drift\|--check" || echo "no sync drift gate"

# Medium 1: lockstep bumps change the bundled version asset, not the lockfile
for c in 81bf04c1e 06031f6cf 3f55a3a8e; do echo "$c lock: $(git show --stat --format= $c -- pnpm-lock.yaml | tail -1)"; echo "$c asset: $(git show --stat --format= $c -- packages/cli/assets/public-package-versions.json | tail -1)"; done
grep -n "public-package-versions" packages/cli/scripts/bundle-assets.sh

# Prior findings resolved: pin is in p01-t04/p01-t05 and the criterion-1 command runs
grep -n "skills.test.ts" .oat/projects/shared/recon-1-1-2-follow-ups/plan.md
pnpm --filter @open-agent-toolkit/cli exec vitest run src/providers/cursor/codec/materialize.test.ts; echo "exit=$?"
```

## Recommended Next Step

Run the `oat-project-review-receive` skill to convert findings into plan tasks.
