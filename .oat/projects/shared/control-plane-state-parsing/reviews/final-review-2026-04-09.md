---
oat_generated: true
oat_generated_at: 2026-04-09
oat_review_scope: final
oat_review_type: code
oat_review_invocation: auto
oat_project: .oat/projects/shared/control-plane-state-parsing
---

# Code Review: final

**Reviewed:** 2026-04-09
**Scope:** Final code review for the full `control-plane-state-parsing` implementation against discovery, design, plan, and the branch diff from `578bfa34685ddc13158c0237405aa572becccab4..HEAD`
**Files reviewed:** 55
**Commits:** `578bfa34685ddc13158c0237405aa572becccab4..HEAD`

## Summary

The core package and CLI surfaces are in place, the verification matrix was run, and the shipped commands behave as intended for the happy path. Two contract-level gaps remain: the control plane does not actually parse lifecycle state from `state.md`, and it returns absolute project paths where the design defines repo-relative paths for `ProjectState` / `ProjectSummary`.

Artifacts used for this review: `discovery.md`, `design.md`, `plan.md`, `implementation.md`, and the changed code under `packages/control-plane/` and `packages/cli/`.

## Findings

### Critical

None.

### Important

1. The state parser and project assembly never implement the planned lifecycle fields, so completed or paused projects will still be reported as `lifecycle: 'active'` with null pause metadata. The plan explicitly required `parseStateFrontmatter()` to return lifecycle information, but the parser interface omits any lifecycle or pause fields and `getProjectState()` / `listProjects()` hardcode `lifecycle: 'active'`, `pauseTimestamp: null`, and `pauseReason: null` instead. That makes the new JSON contract incorrect once `oat-project-complete` writes `oat_lifecycle: complete`, and it blocks downstream consumers from distinguishing active vs completed/paused project state. References: `.oat/projects/shared/control-plane-state-parsing/plan.md:138`, `packages/control-plane/src/state/parser.ts:13`, `packages/control-plane/src/state/parser.ts:75`, `packages/control-plane/src/project.ts:41`, `packages/control-plane/src/project.ts:105`.

### Medium

1. `ProjectState.path` and `ProjectSummary.path` are returned as absolute filesystem paths, which contradicts the design contract that defines them as repo-relative paths. `oat project status` passes an absolute path into `getProjectState()`, and both project assemblers return that absolute path unchanged. That makes the JSON output machine-specific and less stable for dashboard/automation consumers that were supposed to receive repo-relative identifiers. References: `.oat/projects/shared/control-plane-state-parsing/design.md:111`, `packages/control-plane/src/project.ts:41`, `packages/control-plane/src/project.ts:105`, `packages/cli/src/commands/project/status.ts:84`, `packages/cli/src/commands/project/list.ts:97`.

### Minor

None.

## Spec/Design Alignment

### Requirements Coverage

| Requirement                                                                     | Status      | Notes                                                                                      |
| ------------------------------------------------------------------------------- | ----------- | ------------------------------------------------------------------------------------------ |
| Pure `packages/control-plane/` read-only library with typed project aggregation | implemented | Library structure, parsers, recommender, and public exports are present.                   |
| `oat project status` and `oat project list` JSON surfaces                       | implemented | Commands are wired into the CLI and exercised by targeted tests plus manual smoke runs.    |
| `oat config dump` merged config output with source attribution                  | implemented | Resolution utility and command were added with test coverage.                              |
| `ProjectState` lifecycle and path contract from the design                      | partial     | Lifecycle is hardcoded instead of parsed, and `path` is absolute instead of repo-relative. |

### Extra Work (not in requirements)

None.

## Verification Commands

- `pnpm --filter @open-agent-toolkit/control-plane test`
- `pnpm --filter @open-agent-toolkit/control-plane lint`
- `pnpm --filter @open-agent-toolkit/control-plane type-check`
- `pnpm --filter @open-agent-toolkit/control-plane build`
- `pnpm --filter @open-agent-toolkit/cli test -- src/commands/project/status.test.ts`
- `pnpm --filter @open-agent-toolkit/cli test -- src/commands/project/list.test.ts`
- `pnpm --filter @open-agent-toolkit/cli test -- src/config/resolve.test.ts src/commands/config/dump.test.ts`
- `pnpm test`
- `pnpm lint`
- `pnpm type-check`
- `pnpm release:validate`

## Recommended Next Step

Run the `oat-project-review-receive` skill to convert these findings into plan tasks.
