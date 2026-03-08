---
oat_generated: true
oat_generated_at: 2026-03-08
oat_review_scope: final
oat_review_type: code
oat_project: .oat/projects/shared/oat-project-document
---

# Code Review: final

**Reviewed:** 2026-03-08
**Scope:** Final branch review for `oat-project-document`, covering `b803d39e18b5ced5b0a6a1572b9cf7fd4d7afac7..HEAD` plus untracked project artifacts `discovery.md` and `design.md`
**Files reviewed:** 18
**Commits:** `b803d39e18b5ced5b0a6a1572b9cf7fd4d7afac7..HEAD`

## Summary

The branch delivers the core docs-sync workflow, the new documentation config surface, and dashboard/state integration, and the declared verification commands pass. The implementation is not merge-ready yet: the new skill is not actually bundled into the workflow install path, and the `oat-project-document` contract can mark skipped or partially failed runs as resolved.

## Findings

### Critical

- **`oat-project-document` is not shipped in the workflow bundle** (`packages/cli/src/commands/init/tools/workflows/install-workflows.ts:10`)
  - Issue: The new skill is present under `.agents/skills/oat-project-document`, but `WORKFLOW_SKILLS` still omits it and there is no bundled `packages/cli/assets/skills/oat-project-document` directory. Users who install or refresh workflow tools through the CLI bundle will not receive the new skill, so the headline feature is not actually shipped through the supported install path.
  - Fix: Add `oat-project-document` to the workflow bundle list, generate the corresponding packaged asset directory, and update the workflow installer tests/counts accordingly.
  - Requirement: New post-implementation documentation sync skill is available to users via the normal OAT workflow install surface.

### Important

- **Explicit skip leaves docs-sync state unresolved** (`.agents/skills/oat-project-document/SKILL.md:335`)
  - Issue: The skill instructs the skip path to leave `oat_docs_updated` as `null`, but the surrounding lifecycle contract expects an explicit skip to become `skipped` so `oat-project-complete` can distinguish “not run yet” from “user chose to bypass docs sync”. As written, a user can skip here and still hit the completion gate later as if the step was never acknowledged.
  - Fix: Update the skip path to set `oat_docs_updated: skipped`, or change the downstream completion contract and design docs to use one consistent state model.
  - Requirement: Lifecycle integration via `oat_docs_updated` must preserve `null | skipped | complete` semantics.

- **Partial apply failures are still recorded as `complete`** (`.agents/skills/oat-project-document/SKILL.md:370`)
  - Issue: Step 6 explicitly allows continuing after documentation write failures, but Step 7 still records `oat_docs_updated: complete`. That falsely certifies documentation as synchronized even when some approved updates failed to apply.
  - Fix: Track whether every approved write succeeded and only set `complete` on a fully successful run; otherwise leave the state unresolved and surface the failures in the final report.
  - Requirement: `oat_docs_updated` should only represent a successful documentation sync.

### Minor

None

## Requirements/Design Alignment

**Evidence sources used:** `discovery.md`, `design.md`, `plan.md`, `implementation.md`

### Requirements Coverage

| Requirement | Status | Notes |
|-------------|--------|-------|
| Self-contained `oat-project-document` skill for artifact-driven docs sync | partial | Core skill flow is present, but the workflow bundle does not actually ship the new skill through CLI installs. |
| `documentation.*` config support in `.oat/config.json` | implemented | Config schema, getters/setters, and dashboard consumption are present. |
| `oat_docs_updated` lifecycle integration | partial | State field and completion/dashboard integration were added, but skip and partial-failure semantics are inconsistent with the intended contract. |
| Dashboard routing to docs sync before PR generation | implemented | `generateStateDashboard()` reads docs status and routes to `oat-project-document` once implementation is complete. |

### Extra Work (not in declared requirements)

None

## Verification Commands

Run during review:

```bash
pnpm lint
pnpm type-check
pnpm --filter @oat/cli test
```

Results:
- `pnpm lint` — pass
- `pnpm type-check` — pass
- `pnpm --filter @oat/cli test` — pass (793 tests)

## Recommended Next Step

Address the workflow-bundling gap and the `oat_docs_updated` state-contract issues, then rerun final review.
