---
oat_generated: true
oat_generated_at: 2026-07-01
oat_review_scope: final
oat_review_type: code
oat_review_invocation: manual
oat_project: .oat/projects/shared/workflow-gate-target-selection
---

# Code Review: final

**Reviewed:** 2026-07-01
**Scope:** final (303e91e8c1c549a13677d64f02ab79491960b7b4..HEAD) — workflow-gate target-selection regression fix
**Files reviewed:** 23 changed (core code, tests, 4 skills, 2 docs, 4 reference notes, 6 release-metadata files; `.oat/projects/*` treated as tracking artifacts)
**Commits:** ~6 task commits across Phase 1

## Summary

This is an independent, from-scratch re-verification of the final scope. The core repair is correct: `oat gate review` now assembles gate context, resolved project path, review type/scope hints, and the user prompt into exactly one provider prompt argument via `assembleReviewGatePrompt`, while `oat gate cross-provider-exec` still appends its prompt argv generically. Tests, skill version bumps, docs/reference alignment, and the lockstep 0.1.37 release bump were all independently verified and pass.

Findings: 0 critical, 0 important, 0 medium, 0 minor

## Findings

### Critical

None

### Important

None

### Medium

None

### Minor

None

## Requirements/Design Alignment

**Evidence sources used:** `discovery.md`, `plan.md`, `implementation.md`, `state.md` (quick mode — no `spec.md`/`design.md`, as expected). Requirements source is discovery + plan.

### Requirements Coverage

| Requirement (discovery/plan)                                                        | Status      | Notes                                                                                                                                                                                                                                                                                                    |
| ----------------------------------------------------------------------------------- | ----------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Review gate assembles ONE provider prompt (context + path + type/scope + user)      | implemented | `packages/cli/src/commands/gate/index.ts:1273-1289` builds `reviewPrompt` via `assembleReviewGatePrompt(...)` and calls `executeTarget(selected, [reviewPrompt], ...)`. `executeTarget` (`:669-699`) spreads `[...baseArgs, ...prompt]`, yielding base args + exactly one prompt arg. Verified by tests. |
| `cross-provider-exec` keeps generic prompt-append behavior                          | implemented | `runCrossProviderExec` (`:1215-1236`) still passes the raw `prompt: string[]` to `executeTarget`, appending each element generically. Untouched by the diff.                                                                                                                                             |
| Prompt segments joined with explicit blank-line separators (drift-risk mitigation)  | implemented | `assembleReviewGatePrompt` (`:179-184`) trims each segment, filters empties, joins with `\n\n`. Empty user prompt is safely dropped; the constant context note guarantees a non-empty prompt.                                                                                                            |
| Provider matrix (Codex/Claude/Cursor) verified at CLI level                         | implemented | New `it.each` parametrized test (`index.test.ts:1398-1465`) exercises `codex-default`/`claude-default`/`cursor-default`, asserting base args + exactly one assembled prompt and a non-blocking clean artifact. 39 gate tests pass locally.                                                               |
| All 4 gate-aware lifecycle skills guide away from hardcoded targets + version bump  | implemented | `oat-project-implement` 2.0.22→2.0.23, `oat-project-import-plan` 1.4.1→1.4.2, `oat-project-plan` 1.3.7→1.3.8, `oat-project-quick-start` 2.1.7→2.1.8; identical unpinned-target guidance in each. `skills.test.ts` contract updated to 2.1.8; validation passes (38 tests).                               |
| Workflow-gate docs prefer unpinned lifecycle commands, keep `--target` escape hatch | implemented | `workflow-gates.md` and `config-and-local-state.md` updated; unpinned example is primary, pinned example retained under manual/debug language.                                                                                                                                                           |
| Repo reference notes aligned with the new unpinned rule                             | implemented | `current-state.md`, `decision-record.md`, and both project summaries updated consistently.                                                                                                                                                                                                               |
| Lockstep public package bump 0.1.36→0.1.37                                          | implemented | All five manifests (`cli`, `control-plane`, `docs-config`, `docs-theme`, `docs-transforms`) at 0.1.37; `public-package-versions.json` in sync for its four tracked packages.                                                                                                                             |
| Live user-level gate config cleanup (mini + laptop) + provider smoke checks         | external    | Out-of-repo verification per plan p01-t06; no committed repo files expected. Cannot be independently re-verified from the diff, but the in-repo unit tests provide equivalent CLI-level evidence of the prompt-assembly and provider-matrix behavior.                                                    |

### Extra Work (not in declared requirements)

None. Every changed file maps to a plan task. The `packages/cli/assets/skills/**` bundled copies observed in the working tree are git-ignored, build-time regenerated mirrors of canonical `.agents/skills/**` (confirmed via `git check-ignore`), not committed drift.

## Edge Cases Verified

- **Empty user prompt:** `prompt.join(' ')` yields `''`, which `assembleReviewGatePrompt` filters out; the constant context note keeps the assembled prompt non-empty and single-arg. No malformed/empty argv.
- **Multi-positional user prompt:** collapsed to a single space-joined string before assembly — this is the exact regression fix (previously each word/segment became a separate provider positional).
- **Quoting/escaping:** the assembled prompt is passed as one element in the `spawn` args array (no shell interpolation), so no quoting hazard.
- **Base-arg ordering:** `[...baseArgs, reviewPrompt]` keeps provider base args first, single prompt last; tests assert `args.slice(0, baseArgs.length)` equals base args and total length is `baseArgs.length + 1`.
- **Exit-code / severity threshold:** unchanged by this diff; provider non-zero exit short-circuits before verdict parsing, and `process.exitCode = blocking ? 1 : 0` is preserved.

## Deferred Findings Ledger Disposition (final scope)

Nothing to disposition. The ledger carried 0 deferred Medium and 0 deferred Minor items into this scope, and this review adds none.

## Verification Commands

Run these to verify the implementation:

```bash
pnpm --filter @open-agent-toolkit/cli exec vitest run src/commands/gate/index.test.ts
pnpm --filter @open-agent-toolkit/cli exec vitest run src/validation/skills.test.ts
pnpm run oat:validate-skills
pnpm type-check
pnpm release:validate
```

Independently executed during this review:

- `vitest run src/commands/gate/index.test.ts` → 39 passed
- `vitest run src/validation/skills.test.ts` → 38 passed
- Version bump confirmed: all five public manifests at 0.1.37; `public-package-versions.json` in sync
- Canonical vs. bundled skill mirrors confirmed in sync (bundled path is git-ignored/generated)

## Recommended Next Step

No findings to convert. Review passes. Run the `oat-project-review-receive` skill to record this clean final review, then proceed to PR handoff.
