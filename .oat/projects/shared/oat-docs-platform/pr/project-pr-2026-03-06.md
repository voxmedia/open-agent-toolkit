---
oat_generated: true
oat_generated_at: 2026-03-06
oat_pr_type: project
oat_pr_scope: final
oat_project: .oat/projects/shared/oat-docs-platform
---

# PR: oat-docs-platform

## Summary

This PR makes the docs platform a first-class OAT workflow. It adds `oat docs`
init/nav/analyze/apply surfaces, introduces a reusable MkDocs Material scaffold,
migrates the OAT docs corpus into `apps/oat-docs`, and adds the docs
analyze/apply skill pair with evidence-driven apply contracts.

This project ran in import mode, so the PR narrative is grounded in the imported
plan and the implementation artifact rather than a spec/design pair.

## Goals / Non-Goals

- Build a first-class `oat docs` CLI workflow for deterministic docs bootstrap and nav generation
- Dogfood the workflow by migrating the OAT docs corpus into a real docs app
- Add `oat-docs-analyze` and `oat-docs-apply` to mirror the agent-instructions analyze/apply model
- Non-goals for this pass: CI/pages automation, broad theme customization, and bulk legacy conversion without review

## What Changed

- Phase 1: added the `oat docs` CLI family, repo-shape-aware init resolution, MkDocs scaffold templates, and `index.md`-driven nav sync
- Phase 2: scaffolded `apps/oat-docs`, migrated `docs/oat/**` into the app, normalized the tree to the `index.md` contract, and updated live repo links
- Phase 3: added `oat-docs-analyze` and `oat-docs-apply`, wired their CLI entrypoints, dogfooded the workflow against the OAT docs app, and recorded tracking artifacts
- Follow-up hardening: ported the evidence-backed analyze/apply contract from the agent-instructions workflow into the docs skills and templates
- Final cleanup: removed dead nav code, simplified a docs nav return type, and fixed the redundant docs-app `site_description`

## Verification

- `pnpm --filter @oat/cli test -- --run packages/cli/src/commands/index.test.ts packages/cli/src/commands/help-snapshots.test.ts packages/cli/src/commands/docs/nav/sync.test.ts packages/cli/src/commands/init/tools/utility/index.test.ts`
- `pnpm --filter @oat/cli build`
- `pnpm oat:validate-skills`
- `pnpm --dir apps/oat-docs docs:build`
- `pnpm --dir apps/oat-docs docs:lint`
- `pnpm --dir apps/oat-docs docs:format:check`
- `pnpm test`
- `pnpm lint`
- `pnpm type-check`
- `pnpm build`

## Reviews

| Scope | Type | Status | Date | Artifact |
|-------|------|--------|------|----------|
| final | code | passed | 2026-03-06 | inline-only |
| plan | artifact | passed | 2026-03-05 | reviews/artifact-plan-review-2026-03-05.md |

## References

- Plan: [plan.md](https://github.com/tkstang/open-agent-toolkit/blob/mkdocs/.oat/projects/shared/oat-docs-platform/plan.md)
- Implementation: [implementation.md](https://github.com/tkstang/open-agent-toolkit/blob/mkdocs/.oat/projects/shared/oat-docs-platform/implementation.md)
- State: [state.md](https://github.com/tkstang/open-agent-toolkit/blob/mkdocs/.oat/projects/shared/oat-docs-platform/state.md)
- Imported Source: [references/imported-plan.md](https://github.com/tkstang/open-agent-toolkit/blob/mkdocs/.oat/projects/shared/oat-docs-platform/references/imported-plan.md)
- PR Artifacts: [pr/](https://github.com/tkstang/open-agent-toolkit/tree/mkdocs/.oat/projects/shared/oat-docs-platform/pr)
- Reviews: [reviews/](https://github.com/tkstang/open-agent-toolkit/tree/mkdocs/.oat/projects/shared/oat-docs-platform/reviews)
