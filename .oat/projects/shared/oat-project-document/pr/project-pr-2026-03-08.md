---
oat_generated: true
oat_generated_at: 2026-03-08
oat_pr_type: project
oat_pr_scope: final
oat_project: .oat/projects/shared/oat-project-document
---

# feat: add oat-project-document skill

## Summary

Adds `oat-project-document`, a self-contained OAT skill that reads project artifacts and implementation code to identify documentation surfaces needing updates, presents a delta plan for user approval, and applies changes — all in a single invocation. The skill integrates into the project lifecycle via an `oat_docs_updated` state field and an optional completion gate in `oat-project-complete`.

## Goals

- Provide artifact-driven documentation synthesis after implementation/review cycles
- Evaluate all documentation and instruction surfaces relevant to the project (docs directory, READMEs, reference files, AGENTS.md, provider rules)
- Support interactive (present plan, approve, apply) and autonomous (`--auto`) modes
- Integrate with `oat-project-complete` via `oat_docs_updated` state field (soft suggestion by default, hard gate when configured)
- Track three-state lifecycle: `null` (not run) | `skipped` (explicit skip) | `complete` (updates applied or none needed)

## Non-Goals

- Generating documentation content from scratch (recommends and patches, doesn't author full guides)
- Replacing `oat-docs-analyze`/`oat-docs-apply` (complementary skills with different entry points)
- Automated PR creation from documentation changes

## Changes

### Phase 1-4: Skill Definition
- Created `oat-project-document` SKILL.md with all 7 process steps: project resolution, artifact reading, code verification, surface scanning, delta assessment, approval gate, change application + state update

### Phase 5: Config Schema and Integration
- Added `OatDocumentationConfig` interface to OAT config (`root`, `tooling`, `config`, `requireForProjectCompletion`)
- Added `documentation.*` keys to `oat config get/set`
- Added `oat_docs_updated: null` field to `state.md` template
- Integrated documentation sync check into `oat-project-complete` (Step 3.6)
- Added docs sync status to state dashboard with routing to `oat-project-document`

### Phase 6: Sync and Reference Docs
- Synced skill to provider directories (claude, cursor) via `oat sync`
- Updated repo reference docs (current-state, backlog, backlog-completed)

### Phase 7: Review Fixes
- Added skill to CLI workflow bundle (`WORKFLOW_SKILLS` + bundled asset)
- Fixed skip path to set `oat_docs_updated: skipped` (was leaving as `null`)
- Added `$ALL_SUCCEEDED` tracking to prevent `complete` on partial write failures

## Verification

| Check | Result |
|-------|--------|
| `pnpm type-check` | pass |
| `pnpm --filter @oat/cli test` | 793 tests passing |
| `pnpm lint` | pass |
| `oat sync --scope all --apply` | pass |

## Reviews

| Scope | Type | Status | Date | Artifact |
|-------|------|--------|------|----------|
| final | code | passed | 2026-03-08 | reviews/final-review-2026-03-08-v2.md |

Cycle 1 found 1 Critical + 2 Important findings; all resolved in cycle 2 (0 findings).

## References

- Discovery: [discovery.md](https://github.com/tkstang/open-agent-toolkit/blob/oat-project-document/.oat/projects/shared/oat-project-document/discovery.md)
- Design: [design.md](https://github.com/tkstang/open-agent-toolkit/blob/oat-project-document/.oat/projects/shared/oat-project-document/design.md)
- Plan: [plan.md](https://github.com/tkstang/open-agent-toolkit/blob/oat-project-document/.oat/projects/shared/oat-project-document/plan.md)
- Implementation: [implementation.md](https://github.com/tkstang/open-agent-toolkit/blob/oat-project-document/.oat/projects/shared/oat-project-document/implementation.md)
- Reviews: [reviews/](https://github.com/tkstang/open-agent-toolkit/tree/oat-project-document/.oat/projects/shared/oat-project-document/reviews)
