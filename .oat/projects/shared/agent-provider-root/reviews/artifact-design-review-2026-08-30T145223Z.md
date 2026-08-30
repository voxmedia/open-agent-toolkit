---
oat_generated: true
oat_generated_at: 2026-08-30T14:52:23Z
oat_review_scope: design
oat_review_type: artifact
oat_review_invocation: manual
oat_project: .oat/projects/shared/agent-provider-root
---

# Artifact Review: design

**Reviewed:** 2026-08-30T14:52:23Z
**Scope:** Committed `design.md` at `78b8ac3d6`, aligned to `spec.md`
**Files reviewed:** 6 project artifacts, plus focused repository evidence
**Commits:** `a3ac2a019..78b8ac3d6`

## Summary

The design is complete, internally consistent, and ready for planning after
this review is received through the project lifecycle. It covers every
specification requirement with concrete components, ordered resolution
behavior, exact-target and dependency-isolation rules, an explicit immutable
dispatch boundary, requirement-to-test scenarios, migration sequencing, and
release gates without expanding into provider materialization or a runtime/CLI
resolver.

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

## Artifact Quality

- **Completeness:** The design includes system context, data flow, components,
  data models, API boundaries, security, performance, error handling,
  requirement-to-test mapping, deployment, migration, phases, dependencies,
  risks, and references. No critical section contains a placeholder.
- **Internal consistency:** Candidate order remains `loaded -> user -> project`
  throughout. Invalid loaded targets continue to canonical tiers, while an
  all-tier miss blocks only the bounded fresh-child fallback.
- **Dispatch preservation:** Native provider dispatch remains first, and the
  existing resolver's provider/model/effort/variant target is immutable.
  Canonical Markdown resolution supplies instructions only and has no target-
  selection authority.
- **Provider boundary:** Exact unsuffixed canonical identity admits current
  Claude/Cursor base symlinks while excluding Cursor variants, Codex TOML,
  regular provider copies, broken links, escaping links, and wrong targets.
- **Ratchet readiness:** One typed parser serves both existing scan scopes, the
  six historical skill entries remain unchanged, and agent reads receive a
  separate zero-executable baseline plus mutation proof.
- **Scope control:** The design adds no CLI/runtime resolver, persistence,
  provider materialization, provider restart, catalog behavior, or dispatch-
  layer role-delivery API.

## Requirements/Design Alignment

**Evidence sources used:** `discovery.md`, `spec.md`, `design.md`, `plan.md`
(scaffold only), `implementation.md` (scaffold only), and `state.md`. Focused
repository evidence included the current provider agent views, pack-manifest-
derived portability tests, the canonical-agent validation scan, and the three
affected dispatch instruction surfaces.

### Requirements Coverage

| Requirement | Status  | Notes                                                                                                                    |
| ----------- | ------- | ------------------------------------------------------------------------------------------------------------------------ |
| FR1         | covered | Local authored binding and `loaded -> user -> project` order are defined in overview/API flow.                           |
| FR2         | covered | Exact unsuffixed same-scope canonical file/symlink identity and all required misses are explicit.                        |
| FR3         | covered | Per-dependency binding, qualified multi-root names, and two-direction isolation fixtures are specified.                  |
| FR4         | covered | Typed skill/agent parser, both scans, matcher exclusions, mutation proof, and separate baselines are specified.          |
| FR5         | covered | Five executable spellings, two live pointers, two classified examples, and a fresh full sweep are included.              |
| FR6         | covered | Miss continuation, first-valid precedence, fail-closed fallback, and both recovery commands are defined.                 |
| FR7         | covered | Documentation, generated-view sync, skill bumps, package lockstep, lint/format, and release gates are included.          |
| NFR1        | covered | Deterministic attempt order, exact evidence, invalid-target scenarios, and fail-closed behavior are test-mapped.         |
| NFR2        | covered | Existing skill portability behavior and historical evidence are protected by regression assertions.                      |
| NFR3        | covered | Read-only scope and explicit exclusions for mutation, restart, runtime resolution, and provider selection are preserved. |

### Extra Work (not in declared requirements)

None. The design-level implementation phases and fallback-composition evidence
are direct elaborations of the specification rather than scope expansion.

## Independent Evidence Checks

- Current `.claude/agents/oat-reviewer.md` and
  `.claude/agents/oat-phase-implementer.md` resolve exactly to their same-scope
  canonical `.agents/agents/*.md` files.
- Current unsuffixed Cursor base agents resolve to the same canonical files,
  while suffixed Cursor Markdown variants remain regular materialized files.
- Current Codex role variants are transformed `.codex/agents/*.toml` files;
  the design correctly keeps canonical reads under `.agents`.
- Existing review, planning, and implementation dispatch instructions already
  require exact native role/variant selection first and permit pinned fresh-
  child fallback only after pre-start native-role rejection.
- The current manifest-derived contract scan includes user-default skills and
  agents, while `packages/cli/src/validation/skills.test.ts` retains a separate
  every-canonical-agent matcher. The proposed shared parser with two retained
  scans fits those actual seams.

## Verification Commands

```bash
git diff --check origin/main..78b8ac3d6
pnpm --dir apps/oat-docs exec markdownlint-cli2 ../../.oat/projects/shared/agent-provider-root/spec.md ../../.oat/projects/shared/agent-provider-root/design.md
pnpm --filter @open-agent-toolkit/cli exec vitest run src/commands/init/tools/shared/skills-bundled-docs-contract.test.ts
```

## Recommended Next Step

Run the `oat-project-review-receive` skill, record the design artifact review
as passed, and complete the design lifecycle before generating `plan.md`.
