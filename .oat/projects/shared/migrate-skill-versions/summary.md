---
oat_status: complete
oat_ready_for: null
oat_blockers: []
oat_last_updated: 2026-09-08
oat_generated: true
oat_summary_last_task: p02-t02
oat_summary_revision_count: 0
oat_summary_includes_revisions: []
---

# Summary: migrate-skill-versions

## Overview

A quick-mode project that finished what wave 6 p04 started: the Agent Skills
spec keeps a skill's version under `metadata`, the CLI's shared resolver has
read `metadata.version` first since 0.2.64, but all 82 bundled skills still
declared only the deprecated top-level alias, so every validation run printed
82 warnings and the shipped authoring templates already produced a shape two
release-tool readers could not parse. The operator asked for the cleanup on
2026-09-08; the backlog item was raised to high and run as a standalone
project immediately after the execution program closed. Two sequential phases
on one branch: first every non-resolver reader and test sweep was made
metadata-aware and proven red-then-green while the skills still carried the
alias; then all 82 skills moved in one reviewed transformation with every pin
repointed, the retirement schedule recorded, and one lockstep bump
(0.2.64 → 0.2.65).

## What Was Implemented

- **Readers before movers (Phase 1).** `tools/release/build-explainer-rc.mjs`
  reads bundled skill versions through the CLI's built canonical resolver,
  loaded lazily after the builder's own `pnpm build` so the documented
  clean-checkout RC command keeps working; conflict, unusable, malformed, and
  absent declarations each fail with a category-specific `E_SKILL_VERSION`.
  The bundled `oat-explainer-kit/scripts/check-core.mjs` keeps a
  self-contained, dependency-free reader (an installed skill script cannot
  import the repository) bound by a parity contract test that runs a 62-fixture
  corpus and all 82 skills through both readers with zero fail-open
  divergences; the fix round routed every key and value through one
  `isPlainScalar` guard after the root review found seven fail-open shapes.
  Every version reader in the test suites — the corpus sweeps, 75 pins, the
  contract tests, the pack-lifecycle mutation, and three `node --test` files —
  reads through a shared resolver-backed test-support module or a
  frontmatter-bounded local reader, with every pinned literal unchanged.
- **The migration (Phase 2).** All 82 `.agents/skills/*/SKILL.md` declare
  `metadata.version` (merged into the existing `metadata:` map for
  `oat-repo-improve` and `triage-oat-issues`) and no top-level `version:`;
  each bumped exactly one patch step; every non-version line byte-identical.
  Pins repointed and bound to their target files (13 old values collide across
  skills); the corpus sweeps now assert `source === 'metadata'` and no
  column-0 `version:` for every skill; a meta-test re-reads the suite's own
  pins against the tree; a sameness test pins the three `node --test` readers
  byte-identical; the `oat-project-implement` line budget grew by the one line
  the migration added. `pnpm oat:validate-skills` prints zero alias warnings;
  `check:skill-bumps` validates 82 changed skills with zero findings.
- **Records and release.** `DR-260908-bundled-skills-declare` (accepted):
  bundled skills are metadata-only from 0.2.65; the alias warning becomes an
  error in the first release after 0.2.65 that changes the validator; the
  resolver's top-level read is removed one release after that error has been
  quiet; agent roles migrate when their own enforcement surface exists; the
  `check-core.mjs` exception is bound by the parity contract. Follow-up
  `BL-260908-retire-the-top-level-skill` owns both retirement steps;
  `BL-260904-migrate-bundled-skills-from` archived. `contributing/skills.md`
  states the new baseline and schedule; `AGENTS.md` notes the `pnpm build`
  prerequisite for the smoke and release suites. Lockstep 0.2.64 → 0.2.65 with
  the `.oat/sync/manifest.json` restamp.

## Key Decisions

- **One canonical reader; one recorded exception.** The release tool consumes
  the CLI's built resolver instead of a second implementation of the
  precedence rule; the bundled skill script keeps its own reader only because
  it cannot import the repository, and a parity test is the contract that
  binds it (`DR-260908-bundled-skills-declare`).
- **Agent roles deferred.** `.agents/agents/*.md` are outside both enforcement
  surfaces (the alias warning walks only skills; the bump gate's pathspec is
  `SKILL.md`), so they stay on the top-level field with the deferral written
  into the decision.
- **Retirement on a fixed, conditional schedule** rather than in this project:
  third-party skills installed from packs keep resolving through the alias
  until the read is removed, with the error as advance notice.
- **The plan gate was capped at four attempts.** Each attempt blocked on a new
  surface (HiLL semantics, reader architecture, phase-gate ordering, Format
  steps, staging manifests) with no Critical ever raised; every finding was
  fixed in the plan and the root implementation-time reviews became the
  review coverage, consistent with the repository's recorded plan-gate
  experience.

## Design Deltas

- The RC builder's clean-checkout control runs a fixture-local builder against
  a `dist`-free checkout instead of moving the repository's own `dist` aside
  (`pnpm test:release` runs files in parallel).
- The unusable-declaration message names the skill and the condition, not the
  scalar (the resolver exposes only a flag; a second parse is forbidden).
- Provider views did not change in the migration commit: `.claude/skills/*`
  are symlinks to the canonical tree and the Codex/Cursor projections carry
  only agent roles, so `oat sync` had nothing to rewrite and the manifest
  restamp landed with the CLI bump.
- `packages/cli/src/__tests__/skills/skill-version.ts` (shared reader/writer)
  and `tools/smoke/skill-version/reader-sameness.test.mjs` were added beyond
  the plan's file lists.

## Notable Challenges

- The plan gate never approved the final plan text (four blocked attempts);
  the Phase 1 review's first job was therefore verifying the plan against the
  shipped code, and it found no code defect.
- The Phase 1 review's reader probes found seven fail-open shapes in the
  self-contained reader and a whole-document scan in the three local readers;
  the fix round's Codex pass then found the same defect in the helper the fix
  was being ported from.
- Version literals collide across skills, so a blind literal sweep was
  unsafe; one multiline assertion evaded the line-bound sweep and was caught
  by the suite.
- Gate 8 (`build:docs`) replayed from cache after a docs-only edit; the forced
  run is the evidence.

## Tradeoffs Made

- Agent roles remain on the alias for now.
- The self-contained reader rejects some valid YAML forms (flow maps, block
  scalars, quote escapes) that no bundled skill uses; each is pinned as a
  documented fail-closed limit.
- The `oat-project-implement` line budget is again exactly tight (246).

## Follow-up Items

- `BL-260908-retire-the-top-level-skill` — warning → error, then remove the
  top-level read, on the recorded schedule.
- `BL-260908-report-a-changed-skill-with-no` (widened) — a present frontmatter
  block with no resolvable version passes both validators today.
- Pre-existing, unfiled: the RC builder's main-module guard does not `realpath`
  `process.argv[1]`, so a symlinked checkout silently no-ops.

## Associated Issues

- `BL-260904-migrate-bundled-skills-from` — archived (GitHub #258 follow-up).

## Workflow Observations

### 2026-09-08 · <project|general> · <bug|friction|worked-well|feedback> · <area>

````

Structural entries:

```text

### 2026-09-08 · structural · <producer> · <ref>
````

## Entries

Entries are chronological and append-only.

### 2026-09-08 · structural · oat gate review · plan

target=codex-5-6-sol-xhigh threshold=important findings=critical:0,important:2,medium:2,minor:0 exit=1 status=blocked artifact=.oat/projects/shared/migrate-skill-versions/reviews/artifact-plan-review-2026-09-08T080653Z.md run=4fac934c-78bf-4e2d-9148-93739e006cf5

### 2026-09-08 · structural · oat gate review · plan

target=codex-5-6-sol-xhigh threshold=important findings=critical:0,important:2,medium:3,minor:1 exit=1 status=blocked artifact=.oat/projects/shared/migrate-skill-versions/reviews/artifact-plan-review-2026-09-08T082541Z.md run=abb5e687-6736-46cb-a854-dbff2cac20e1

### 2026-09-08 · structural · oat gate review · plan

target=codex-5-6-sol-xhigh threshold=important findings=critical:0,important:2,medium:1,minor:0 exit=1 status=blocked artifact=.oat/projects/shared/migrate-skill-versions/reviews/artifact-plan-review-2026-09-08T084454Z.md run=a36db529-98ba-4a7b-b04f-06f45bb037e1

### 2026-09-08 · structural · oat gate review · plan

target=codex-5-6-sol-xhigh threshold=important findings=critical:0,important:2,medium:2,minor:0 exit=1 status=blocked artifact=.oat/projects/shared/migrate-skill-versions/reviews/artifact-plan-review-2026-09-08T090611Z.md run=ccc5d92e-4ae9-43e6-8722-5d97ea1b8749

### 2026-09-08 · structural · oat gate review · final

target=codex-5-6-sol-xhigh threshold=important findings=critical:0,important:0,medium:1,minor:1 exit=0 status=ok artifact=.oat/projects/shared/migrate-skill-versions/reviews/final-review-2026-09-08T123009Z.md run=d888e4e6-a1cc-4b68-8a00-6b84497680d6
