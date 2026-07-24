---
oat_generated: true
oat_generated_at: 2026-07-24T13:04:06Z
oat_review_scope: p03 pre-dispatch HiLL readiness re-review
oat_review_type: code
oat_review_invocation: auto
oat_project: /Users/tstang/orca/workspaces/open-agent-toolkit/oat-install-config-bug/.oat/projects/shared/config-bug
oat_review_request_id: config-bug-p03-hill-readiness2-20260724T1301Z
oat_dispatch_policy: high
oat_dispatch_ceiling: high
oat_dispatch_target: oat-reviewer-gpt-5-6-sol-high
oat_model_axis: selected:gpt-5.6-sol-high
oat_effort_axis: not-applicable
---

# Code Review: p03 HiLL Pre-Dispatch Readiness Re-review

**Reviewed:** 2026-07-24T13:04:06Z
**Scope:** Fresh p03 readiness review after correction of the documentation boundary
**Current HEAD:** `56cae3cf088bf9589eef9c78ba71b07e409b368a`
**Files reviewed:** Six target documentation pages, p03 plan and lifecycle artifacts, p01/p02 reviews and merged code, ancillary skill/test boundary, five package manifests, and repository-wide stale-claim searches
**Verdict:** READY

## Summary

The prior Important finding is resolved: `plan.md` now counts six target pages and includes `apps/oat-docs/docs/workflows/projects/lifecycle.md` in p03-t01's file boundary, substantive requirements, formatter invocation, and staging command. The corrected six-page delta covers every stale user-facing runtime-capability claim found in the docs corpus and gives the provider-parent safety behavior an accurate provider-neutral contract plus actionable recovery guidance; no additional contradictory claim requires expansion of p03.

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

## Prior Finding Resolution

| Required correction                        | Result   | Evidence                                                                                                                                                                      |
| ------------------------------------------ | -------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Six-page target count                      | Resolved | The p03 pre-dispatch gate now explicitly says “six target pages” (`plan.md:412-417`).                                                                                         |
| Lifecycle page in file boundary            | Resolved | `apps/oat-docs/docs/workflows/projects/lifecycle.md` is a declared p03-t01 modification (`plan.md:421-436`).                                                                  |
| Lifecycle page in substantive requirements | Resolved | Step 2 requires both lifecycle-guide references to use `oat tools has project-management` as the effective runtime check rather than the shared snapshot (`plan.md:455-463`). |
| Lifecycle page in formatting command       | Resolved | The page is passed to the file-scoped `pnpm exec oxfmt --write` invocation (`plan.md:478-498`).                                                                               |
| Lifecycle page in staging command          | Resolved | The page is explicitly included in `git add` (`plan.md:518-533`).                                                                                                             |

## Readiness Evidence

**Artifacts used:** `discovery.md`, `design.md`, `plan.md`, `implementation.md`, the prior blocked readiness review, `reviews/2026-07-24-p01-code-rereview-3.md`, and `reviews/2026-07-24-p02-code-review.md`. This project uses quick workflow mode; no `spec.md` is required.

- HEAD is exactly the supplied `56cae3cf`; the worktree was clean during review.
- Commits `20a43135` (p01 final repair) and `cc7e2f39` (p02 completion) are ancestors of HEAD. Their integrated commits and review/bookkeeping commits remain in branch history.
- The accepted p01 review remains at zero findings and verifies project-only reconciliation plus effective project-plus-user `oat tools has` behavior.
- The accepted p02 review remains at zero findings and verifies planning, whole-plan preflight, and immediate per-entry provider-path validation.
- Repository-wide docs searches for `tools.*`, `oat config get tools`, installed-capability wording, provider ancestry, symlink-parent, and mutation-safety claims found stale runtime-capability statements only in `tool-packs.md`, `configuration.md`, `config-and-local-state.md`, and `lifecycle.md`, all inside p03. Other provider-sync pages contain compatible general contracts; none claims that unsafe provider ancestry is traversed or automatically repaired.
- The implementation source confirms the delta: shared reconciliation scans project scope only and writes the complete eight-pack map or removes it; `oat tools has` defaults through the shared scope resolver and returns plain/JSON availability; provider mutation paths reject lexical escape, root equality, symlinked parents, and non-directory parents during preflight and per-entry execution.

## Final Six-Page Documentation Delta for Approval

These are claim-level changes suitable for direct user approval; they do not prescribe final prose.

### `apps/oat-docs/docs/cli-utilities/tool-packs.md`

- Add `oat tools has` to the quick command inventory and give it a dedicated command section.
- Define `oat tools has <pack>` as current effective availability, defaulting to project plus user. Document `--scope project|user|all`, global `--json`, plain `true`/`false`, JSON `{ pack, available, scopes }`, and exit codes `0` for valid results, `1` for invalid input, and `2` for runtime failure.
- Rewrite install/update/remove and shared-signal guidance so `tools.*` is reconciled only from project canonical assets. User-only lifecycle operations do not set a shared true flag.
- State the reconciliation contract: when any project pack exists, write the complete eight-pack boolean map; when none exists, remove the `tools` map; preserve unrelated shared config; avoid default-only config creation and unchanged writes.
- Replace workflow-capability guidance with the distinction between project installation (`oat config get tools.<pack>`) and effective availability (`oat tools has <pack>`).
- Replace brainstorm picker claims with its three effective checks for `ideas`, `project-management`, and `workflows`; retain `oat config get activeProject` only for project-state lookup.

### `apps/oat-docs/docs/cli-utilities/configuration.md`

- Define `tools.<pack>` as project-scoped installation state in shared config, not repo-or-user availability.
- Explain that lifecycle reconciliation owns the snapshot, ignores user-only assets, removes the group when project state is empty, preserves unrelated keys, and may replace a manual shared override.
- Keep `oat config get tools.<pack>` as project-state inspection. Label `oat config set tools.<pack>` as a shared override rather than an effective runtime gate.
- Add `oat tools has <pack>` as the effective project-plus-user query, with explicit-scope and JSON examples.

### `apps/oat-docs/docs/cli-utilities/config-and-local-state.md`

- Add `tools.brainstorm` to the shared inventory so all eight bundled packs are listed.
- Replace the “installed-capability signal for workflows” claim: `oat config get tools.<pack>` reports shared project installation only.
- Direct effective-availability workflows and troubleshooting to `oat tools has <pack>`, distinguishing default all-scope behavior from `--scope project` and `--scope user`.
- Preserve PJM diagnostic wording only where diagnostics intentionally read project configuration; do not generalize it into a project-plus-user runtime contract.

### `apps/oat-docs/docs/provider-sync/providers.md`

- Add the provider-neutral mutation-safety contract for create/update symlink, create/update copy, and remove: validate during planning, across the whole plan before apply, and immediately before each mutation.
- State that lexical escape, destination-equals-root, and any existing symlinked or non-directory parent reject mutation. The final managed destination may itself be a symlink for normal update/removal.
- Explain that the generic guard applies across provider adapters and that preflight refusal protects provider paths, canonical content, external targets, and manifest state. Do not frame the fix as Claude-only.

### `apps/oat-docs/docs/reference/troubleshooting.md`

- Add an unsafe-provider-parent diagnostic keyed to `Unsafe provider parent`, symbolic-link, and non-directory ancestry errors.
- Explain that OAT refuses to traverse, unlink, or rewrite the unsafe parent because it may be externally owned; canonical content and external symlink targets remain untouched.
- Give the recovery procedure: preserve or migrate user-managed content explicitly, replace the provider parent with a real directory under the intended scope, then rerun `oat sync --scope project|user|all`.
- Add a user-only pack-state note: missing shared `tools.<pack>` after user-scope installation is expected; verify effective availability with `oat tools has <pack>` and isolate user scope with `--scope user`.

### `apps/oat-docs/docs/workflows/projects/lifecycle.md`

- Change both `oat-project-document` capability claims to say it checks effective `project-management` availability with `oat tools has project-management`.
- Remove the claim that shared `tools.project-management` drives the runtime repo-reference refresh decision.

## Ancillary Skill and Release Validation

- The skill correction remains exact: `.agents/skills/oat-agent-instructions-analyze/SKILL.md` is currently `1.11.1`; p03 changes it once to `1.11.2`.
- The required sentence will identify quality as repository-wide Step 3, delta-scoped coverage as Step 4, delta-scoped drift as Step 6, and cross-format consistency as Step 7. The focused assertion in `packages/cli/src/validation/skills.test.ts` locks all four facts plus the version.
- All five public packages are currently `0.2.14`; p03 moves `packages/cli`, `packages/control-plane`, `packages/docs-config`, `packages/docs-theme`, and `packages/docs-transforms` together to `0.2.15`.
- The plan retains generated navigation sync, source-CLI index regeneration, focused skill-contract tests, skill validation, full CLI test/lint/type-check, formatting, build, docs build, and mandatory `pnpm release:validate`.

## Verification Commands

```bash
pnpm --filter @open-agent-toolkit/cli exec vitest run src/validation/skills.test.ts
oat docs nav sync
pnpm -w run cli:source -- docs generate-index --docs-dir apps/oat-docs/docs --output apps/oat-docs/index.md
pnpm run oat:validate-skills
pnpm --filter @open-agent-toolkit/cli test
pnpm --filter @open-agent-toolkit/cli lint
pnpm --filter @open-agent-toolkit/cli type-check
pnpm format
pnpm build
pnpm build:docs
pnpm release:validate
```

## Recommended Next Step

Present the six-page delta above for explicit user approval. After approval is recorded in `implementation.md`, dispatch p03-t01.
