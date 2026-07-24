---
oat_generated: true
oat_generated_at: 2026-07-24T12:58:03Z
oat_review_scope: p03 pre-dispatch readiness and documentation-delta review
oat_review_type: code
oat_review_invocation: auto
oat_project: /Users/tstang/orca/workspaces/open-agent-toolkit/oat-install-config-bug/.oat/projects/shared/config-bug
oat_review_request_id: config-bug-p03-hill-readiness-20260724T1255Z
oat_dispatch_policy: high
oat_dispatch_ceiling: high
oat_dispatch_target: oat-reviewer-gpt-5-6-sol-high
oat_model_axis: selected:gpt-5.6-sol-high
oat_effort_axis: not-applicable
---

# Code Review: p03 HiLL Pre-Dispatch Readiness

**Reviewed:** 2026-07-24T12:58:03Z
**Scope:** Phase p03 readiness, substantive documentation delta, ancillary skill correction, and release/validation prerequisites
**Merged implementation HEAD:** `1cdfcccd3797c9ef452522c901391c4099781da2`
**Files reviewed:** 31 implementation, test, artifact, documentation, skill, and package files plus a repository-wide stale-claim search
**Verdict:** BLOCKED

## Summary

The merged p01 and p02 implementation is present at the supplied HEAD and both required phase reviews pass with zero findings. The five proposed documentation pages need the concrete changes listed below, and the ancillary skill/version and lockstep release steps are correctly specified. Phase p03 is not ready for approval or dispatch because its declared file scope omits a sixth user-facing page that directly contradicts the implemented effective-availability behavior.

Findings: 0 critical, 1 important, 0 medium, 0 minor

## Findings

### Critical

None.

### Important

- **The p03 documentation scope omits a lifecycle page with stale runtime-capability claims** (`apps/oat-docs/docs/workflows/projects/lifecycle.md:21`)
  - Issue: The lifecycle page says `oat-project-document` checks `tools.project-management`, and later explicitly says it uses the shared `tools.project-management` config signal (`apps/oat-docs/docs/workflows/projects/lifecycle.md:21,66`). The shipped canonical skill instead checks effective project-plus-user availability with `oat tools has project-management` (`.agents/skills/oat-project-document/SKILL.md:160-175`). The p03 task's exhaustive file list includes only the five requested pages and excludes `lifecycle.md` (`.oat/projects/shared/config-bug/plan.md:421-435`), so dispatching the task as written would knowingly leave contradictory user-facing documentation.
  - Fix: Add `apps/oat-docs/docs/workflows/projects/lifecycle.md` to p03-t01's file, formatting, and staging boundaries. Change both capability-check claims to effective availability through `oat tools has project-management`; do not describe shared `tools.*` as the runtime gate. Present this sixth-page delta for approval with the five planned pages before recording approval or dispatching p03.
  - Requirement: Discovery success criterion that user-facing tool-pack/configuration documentation match the new semantics (`discovery.md:138-155`) and p03's requirement to remove claims that shared config represents user-scope availability (`plan.md:454-459`).

### Medium

None.

### Minor

None.

## Evidence and Readiness

**Artifacts used:** `discovery.md`, `design.md`, p03 in `plan.md`, `implementation.md`, `reviews/2026-07-24-p01-code-rereview-3.md`, and `reviews/2026-07-24-p02-code-review.md`. This is a quick workflow, so no `spec.md` is required.

- Repository HEAD exactly matches the supplied merged implementation SHA, and the worktree was clean at review time.
- The passing p01 review reports zero findings and verifies project-only reconciliation plus effective `oat tools has` behavior (`reviews/2026-07-24-p01-code-rereview-3.md:24-30,69-76`).
- The passing p02 review reports zero findings and verifies planning, whole-plan preflight, and immediate per-entry path validation (`reviews/2026-07-24-p02-code-review.md:19-23,49-67`).
- Shared reconciliation scans only project scope, writes a deterministic complete map when nonempty, removes the map when empty, preserves unrelated config, and avoids unchanged writes (`packages/cli/src/commands/tools/shared/project-tools-config.ts:43-61,80-105`; tests at `packages/cli/src/commands/tools/shared/project-tools-config.test.ts:54-144`).
- `oat tools has` defaults to both concrete scopes, supports explicit project/user scope, emits plain booleans or the JSON envelope, exits 0 for valid negative results, 1 for invalid pack names, and 2 for runtime failure (`packages/cli/src/commands/tools/has/index.ts:30-72`; tests at `packages/cli/src/commands/tools/has/index.test.ts:105-177`).
- Provider destinations are guarded against lexical escape and symlinked/non-directory existing ancestry while permitting the final managed destination to be a symlink (`packages/cli/src/engine/provider-path-safety.ts:18-75`). Planning validates before classification/removal (`packages/cli/src/engine/compute-plan.ts:583-620,633-663`), and execution performs whole-plan preflight plus immediate per-entry revalidation (`packages/cli/src/engine/execute-plan.ts:201-245`).

## Substantive Documentation Delta for Approval

These are claim-level changes, not proposed prose.

### `apps/oat-docs/docs/cli-utilities/tool-packs.md`

- Add `oat tools has` to the quick command inventory and add its own command section.
- Define `oat tools has <pack>` as effective current availability, defaulting to project plus user; document `--scope project|user|all`, global `--json`, the plain `true`/`false` output, the `{ pack, available, scopes }` JSON shape, and exit codes 0/1/2.
- Change install/update/remove claims so shared `tools.*` is reconciled only from project canonical assets. User-only install/update/remove must not set a shared true flag.
- State that reconciliation writes the complete eight-pack boolean map when any project pack exists, removes the entire `tools` map when no project packs remain, preserves unrelated shared config, and does not create default-only shared config for user-only state.
- Replace workflow-capability guidance at lines 208, 229, 244, and 248-256 with the project-installation/effective-availability distinction.
- Replace the brainstorm destination-picker claims at lines 381-386 with its three `oat tools has` checks. Keep `oat config get activeProject` as the separate project-state lookup.
- Clarify that `oat config get tools.<pack>` inspects project installation state only; it is not the runtime project-or-user gate.

### `apps/oat-docs/docs/cli-utilities/configuration.md`

- Change the `tools.<pack>` catalog description at line 90 from “repo or user scopes” to project-scoped installation state in shared config.
- Explain that lifecycle reconciliation owns this shared snapshot, ignores user-only assets, removes the group when project state is empty, and preserves unrelated keys.
- Keep `oat config get tools.<pack>` as project-state inspection. If manual `oat config set tools.<pack>` remains shown, label it as a shared override that the next lifecycle reconciliation can replace, not as effective availability.
- Add `oat tools has <pack>` as the command for current project-plus-user availability, with explicit-scope and JSON discovery examples.

### `apps/oat-docs/docs/cli-utilities/config-and-local-state.md`

- Add `tools.brainstorm` to the shared tool-key inventory at lines 166-175 so all eight bundled packs are represented.
- Replace the line 176 “installed-capability signal for workflows” claim: `oat config get tools.<pack>` reports shared project installation only.
- Direct workflows and troubleshooting that need effective availability to `oat tools has <pack>`; distinguish its default all-scope result from `--scope project` and `--scope user`.
- Preserve the PJM diagnostic behavior description only where the diagnostic intentionally reads project configuration; do not generalize it into a project-plus-user capability contract.

### `apps/oat-docs/docs/provider-sync/providers.md`

- Add a provider-neutral mutation-safety contract: every create/update symlink, create/update copy, and remove destination is checked during planning, across the whole plan before apply, and again immediately before each mutation.
- State that lexical escape, a destination equal to the sync root, and any existing symlinked or non-directory parent reject mutation; the final managed destination itself may be a symlink so normal update/removal remains supported.
- State that the guard applies across provider adapters and prevents provider, canonical, external-target, and manifest mutation during preflight refusal. Avoid framing this as Claude-only.

### `apps/oat-docs/docs/reference/troubleshooting.md`

- Add an unsafe-provider-parent diagnostic section keyed to the `Unsafe provider parent` / symbolic-link / non-directory errors.
- Explain that OAT refuses to traverse or automatically unlink/rewrite the parent because ownership may be external; canonical content and external symlink targets remain untouched.
- Give the recovery action: replace the provider parent with a real directory under the intended scope, preserve/migrate any user-managed content explicitly, then rerun `oat sync --scope project|user|all`.
- Add a user-only pack-state note: absence of shared `tools.<pack>` after a user-scope install is expected; use `oat tools has <pack>` to verify effective availability and `--scope user` to isolate that scope.

### Required scope addition: `apps/oat-docs/docs/workflows/projects/lifecycle.md`

- Change both `oat-project-document` capability claims at lines 21 and 66 to say it checks effective `project-management` availability with `oat tools has project-management`.
- Remove the statement that the shared `tools.project-management` config signal drives that runtime decision.

## Ancillary Skill Correction

The planned correction is exact.

- Current version is `1.11.1` (`.agents/skills/oat-agent-instructions-analyze/SKILL.md:1-4`); p03 must bump it once to `1.11.2`.
- The stale delta-mode sentence currently points to coverage Step 5, drift Step 7, and quality Step 4 (`.agents/skills/oat-agent-instructions-analyze/SKILL.md:104-110`).
- The actual process headings establish quality as Step 3 (`:210`), coverage as Step 4 (`:297`), drift as Step 6 (`:367`), and cross-format consistency as Step 7 (`:384`).
- Required result: quality Step 3 remains repository-wide; only coverage Step 4 and drift Step 6 are delta-scoped; cross-format remains Step 7. The focused canonical-skill contract assertion planned in `packages/cli/src/validation/skills.test.ts` must lock those four facts and the `1.11.2` version.

## Release and Validation Confirmation

All five public packages are currently `0.2.14` and must move together to `0.2.15`:

- `packages/cli/package.json:3`
- `packages/control-plane/package.json:3`
- `packages/docs-config/package.json:3`
- `packages/docs-theme/package.json:3`
- `packages/docs-transforms/package.json:3`

The p03 plan includes:

- generated navigation sync: `oat docs nav sync`;
- generated index regeneration through the source CLI;
- focused skill contract testing and `pnpm run oat:validate-skills`;
- full CLI test, lint, and type-check;
- repository formatting;
- `pnpm build` and `pnpm build:docs`;
- mandatory `pnpm release:validate`.

These steps satisfy the repository's bundled-asset/public-package release policy. Any generated navigation file changed by `oat docs nav sync` must also be included in the task commit even though no navigation change is presently expected.

## Dispatch Prerequisites

1. Expand p03-t01 to include `apps/oat-docs/docs/workflows/projects/lifecycle.md` in its file, formatting, and staging boundaries.
2. Present the corrected six-page substantive delta to the user.
3. Record explicit approval in `implementation.md`.
4. Only then dispatch p03-t01. The current `implementation.md` correctly remains pending and contains no approval record (`implementation.md:147-155`).

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

Correct the p03 file boundary and approval delta, then rerun this readiness review before recording approval and dispatching the phase.
