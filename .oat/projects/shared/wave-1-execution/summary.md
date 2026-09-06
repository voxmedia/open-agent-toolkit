---
oat_status: complete
oat_ready_for: null
oat_blockers: []
oat_last_updated: 2026-09-06
oat_generated: true
oat_summary_last_task: p04-t02
oat_summary_revision_count: 0
oat_summary_includes_revisions: []
---

# Summary: wave-1-execution

## Overview

Wave 1 ("CLI resolution and asset correctness") of the 2026-08-31 execution
program: four external plans, each an immutable implementation contract, run
as a thin wrapper project so the fixes could execute in parallel worktrees
with root-owned reviews, one lockstep release bump, and full integration gates
after every fan-in. The motivating defects were a docs-index generator that
resolved paths from the invoking directory and rewrote config, an asset
resolver that accepted a metadata-only bundle as a valid installation, remedy
text that told `OAT_ASSETS_DIR` users to rebuild the CLI, and no way to exclude
paths from docs-index generation.

## What Was Implemented

- **Configured docs-index paths (p01).** `oat docs generate-index` resolves
  its docs directory and output from `documentation.root` (app root
  canonical; `<root>/docs` precedence as compatibility behavior, reported as
  `docsDirSource`), defaults output to the app-root manifest, never writes the
  scaffold's authored `docs/index.md` or `mkdocs.yml`, refuses unsafe outputs
  before any write (canonical-path containment with symlink and dangling-link
  resolution, `documentation.config` and YAML refusals, unmarked Markdown
  unless `--output` names it), and updates `documentation.index` only for the
  Fumadocs bootstrap transition. `docs init` seeds the Fumadocs index at the
  app root, and its scaffold output is now the test fixture.
- **Asset-bundle structure validation (p02).** `validateAssetsBundle` stats
  the producer's seven top-level directories after the metadata and version
  checks and fails closed with exit 2 naming the first offender; non-`ENOENT`
  stat failures form a distinct "unreadable" diagnosis.
- **Source-aware asset remedies (p03).** Every asset failure routes through
  one remedy formatter keyed on the resolved root source; `OAT_ASSETS_DIR`
  failures name the override and never advise rebuild or reinstall, packaged
  failures keep both prior remedy strings verbatim, and the unreadable branch
  reports its errno.
- **Docs-index exclusions (p04).** `documentation.excludes` (JSON array) and
  `--exclude` prune generation through a bounded, root-anchored glob grammar
  implemented as a greedy two-pointer matcher (no RegExp, ReDoS-safe, verified
  against a brute-force oracle over millions of cases); a malformed stored
  value is repairable by the `oat config set` command its error names.

Lockstep public packages moved 0.2.55 → 0.2.56 once, at the group-1 fan-in.

## Key Decisions

1. **Docs-index refusals exit 1; unusable configuration exits 2.** The plan
   mandated exit 2 only for configuration resolution; the refusal set (output
   inside the indexed tree, equal to `documentation.config`, YAML, unmarked
   derived output, symlink hop cap) is actionable user error under
   `packages/cli/AGENTS.md`, so scripts can tell "your flag is wrong" from
   "your environment is broken".
2. **Fumadocs keeps updating `documentation.index` even when
   `documentation.config` is declared.** The plan's negative clause contradicted
   its own Outcome and step 1 for this repository's live config shape; the
   implementation follows the bootstrap transition, MkDocs configuration is
   never touched, and both branches are pinned by tests that fail when the
   tooling discriminator is removed.
3. **Exclusion patterns are root-anchored and minimatch-style, not
   gitignore-style.** A bare `CLAUDE.md`, `**/CLAUDE.md`, and `subdir/` have
   distinct defined behaviors, which the plan required and which gitignore
   any-depth semantics cannot provide.
4. **Lane mode never touches lockstep release files; the fan-in owns one bump
   and the full gate sequence** (program rule; existing record
   `wave-level-lockstep-bump`). Both fan-ins ran the eight-gate sequence with
   uncached tests.

## Design Deltas

- The docs-index plan's `## Current state` config-write clause was amended in
  the wave (non-narrowing reconciliation recorded in `plan.md`) after the
  final review asked for it to land rather than wait for wave-close.
- `AssetsRootSource` is exported (declaration emit forces it) although the
  plan called it internal; the `fs` barrel still exports only
  `resolveAssetsRoot`.
- Both group-2 plans were flipped `BLOCKED → READY` by the wrapper after their
  readiness checks passed on the merged tip; the p03 review caught that the
  first flip had been recorded only in the wrapper.

## Notable Challenges

- The p01 lane's Codex cross-model review took four rounds to converge on the
  containment surface: `..draft/` names mistaken for traversal, symlinked and
  dangling-link outputs bypassing containment, hop-cap fall-through, and
  relative dangling targets resolved against the lexical parent. Each round
  produced a real defect fixed before the commit.
- The root review of p01 found a P0 test that could not fail (every MkDocs
  fixture came from the scaffold, which always sets `documentation.config`);
  the fix round added a falsifiable test whose neutralization breaks two tests
  from both sides.
- The p04 matcher started as a RegExp compiler; Codex reproduced catastrophic
  backtracking at 5.3 s for one non-match, and the first fix was insufficient,
  so the compiler was replaced by a greedy matcher (0.17 s end-to-end).
- The wrapper's own record was truncated by a bookkeeping edit whose anchor
  matched the template's conventions note; the final review caught it and the
  file was restored from history.

## Tradeoffs Made

- Address-now sweeps for Medium/Minor review findings on p04 landed without a
  re-review (comment and docs only) to keep the group inside one fan-in;
  Important findings always got a disposition-verification round.
- Deferred Medium findings outside lane scope (packed-path guards, the
  `OAT_ASSETS_DIR` docs contract, root-level errno) became backlog items rather
  than widening lanes.

## Integration Notes

- Refusal exit codes from `oat docs generate-index` changed from an
  undifferentiated 2 to 1; no in-repo consumer branches on them, but downstream
  scripts should re-check.
- `.oat/sync/manifest.json` carries the worktree-init restamp (schema
  `version` 1 → 2 with `collections: []`, `oatVersion` 0.2.50 → 0.2.56;
  `lastSynced` values unchanged) from the lane bootstrap.
- Reviews-table reviewed heads are pre-rebase; the SHA mapping lives in
  `implementation.md` under the fan-in records.

## Follow-up Items

- `BL-260906-guard-packed-asset-directories` — packed-path guards for all
  seven required bundle directories; update the `OAT_ASSETS_DIR` docs contract.
- `BL-260906-report-errno-for-asset-root` — errno in the root-level stat
  failure; `afterEach` reset for the `statRedirects` test seam.
- `BL-260906-docs-index-follow-ups-from` — init label vs seed, hop-cap flag
  advice, empty-manifest signal, `excludes` in `--json`, `DEFAULT_SHARED_CONFIG`
  default, config-root bare-refusal regression test.
- Program close: completion tail (archive, pointer clear) and recap deferred;
  program-refresh corrections for the exclusions plan's PR #190 landing row.

## Associated Issues

- `BL-260718-fix-oat-docs-generate-index` — closed (p01)
- `BL-260827-fail-closed-on-partial-or` — closed (p02)
- `BL-260827-override-aware-remedy-text` — closed (p03)
- `BL-260902-add-an-exclusion-mechanism` — closed (p04)

## Workflow Observations

### 2026-09-05 · structural · oat gate review · plan

target=codex-5-6-sol-xhigh threshold=important findings=critical:0,important:1,medium:1,minor:1 exit=1 status=blocked artifact=.oat/projects/shared/wave-1-execution/reviews/artifact-plan-review-2026-09-05T224504Z.md

### 2026-09-06 · structural · oat-project-review-provide · reviews/final-review-2026-09-06T015333Z.md

Final gate code review recorded at reviews/final-review-2026-09-06T015333Z.md (0C/0I/1M/1m).

### 2026-09-06 · structural · oat gate review · final

target=codex-5-6-sol-xhigh threshold=important findings=critical:0,important:0,medium:1,minor:1 exit=0 status=ok artifact=.oat/projects/shared/wave-1-execution/reviews/final-review-2026-09-06T015333Z.md

### 2026-09-06 · general · friction · wave wrapper slug and branch collision

The oat-wave-execute fixed wave-N-execution slug and branch collided with the archived 2026-08 program wrapper and its stale remote branch; the wave kept the local name and pushed to origin/wave-1-execution-2026-09, deferring the archive-name collision to program close. The skill should qualify the slug or branch by program, or check archived wrappers and remote branches in preflight. (observed on oat 0.2.55)

### 2026-09-06 · general · friction · duplicate orchestrator after session restart

A session restart left the prior orchestrator instance alive on the same worktree, which scaffolded a second wrapper directory before standing down. Check ListAgents for a busy peer on the same path before scaffolding; the skill has no claim-the-tree step. (observed on oat 0.2.55)

### 2026-09-06 · general · friction · reviewer reconnaissance signal placement

A reviewer put the mandatory Reconnaissance signal in its chat reply rather than the artifact; the root validates the file, so the round was recovered through the accepted handle. Reviewer briefs should state that the line is validated in the artifact. (observed on oat 0.2.55)

### 2026-09-06 · general · friction · dispatch journal cannot close out child outcome

oat project dispatch record rejects a revision that changes child_outcome (generic fields are immutable), so a record written at acceptance never carries the terminal outcome; outcomes were recorded in implementation.md instead. Consider a terminal event kind or an outcome revision. (observed on oat 0.2.55)

### 2026-09-06 · project · worked-well · readiness flip and address-now sweep rules

Flipping successor plans to READY in the fan-in bookkeeping commit with cited evidence, and landing Medium/Minor review findings as address-now sweeps through the original implementer handle, kept both groups inside one fan-in each with zero merge conflicts. (observed on oat 0.2.55)
