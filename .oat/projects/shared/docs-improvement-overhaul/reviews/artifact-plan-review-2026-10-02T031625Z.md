---
oat_generated: true
oat_generated_at: 2026-10-02T03:16:25Z
oat_review_scope: plan
oat_review_type: artifact
oat_review_invocation: gate
oat_project: .oat/projects/shared/docs-improvement-overhaul
oat_gate_run_id: b5d44f07-4bda-4d0d-a45b-ef06aef72067
oat_gate_target: claude-opus-5-5-high
oat_gate_runtime: claude
oat_invocation_model: claude-opus-5-5
oat_invocation_reasoning_effort: high
oat_invocation_source: exec-target-config
---

# Artifact Review: plan

**Reviewed:** 2026-10-02
**Scope:** `plan.md` artifact review (quick mode) against `discovery.md` and `design.md`
**Files reviewed:** 3 (`plan.md`, `discovery.md`, `design.md`), plus repository spot checks of the plan's path and script claims
**Commits:** n/a (artifact review; reviewed at `2e5e8e5374b101b90c5b72fde9c702d328743b38`)

**Dispatch audit (policy view):** `Dispatch: scope=plan action=review role=reviewer producer=unknown provenance=unknown model_axis=selected:claude-opus-5-5 effort_axis=selected:high dispatch_policy=high dispatch_ceiling=high target=oat-reviewer-claude-claude-opus-5-5-high`

**Reconnaissance:** not-attempted

## Review Scope

- Workflow mode: quick
- Discovery: `.oat/projects/shared/docs-improvement-overhaul/discovery.md`
- Design: `.oat/projects/shared/docs-improvement-overhaul/design.md` (lightweight design; present)
- Spec: not required in quick mode
- Plan: `.oat/projects/shared/docs-improvement-overhaul/plan.md`
- Dispatch Profile advisory: the plan has no `## Dispatch Profile` section. That is normal and is not a finding.
- Gate route: inline (runtime=claude, verified branch-local gate CLI root)

## Summary

The plan carries out the design faithfully. It has five sequential, separately mergeable phases, exact script values, file-scoped formatting and commit lines per task, and verification that targets real consumers. It also includes explicit negative controls such as guard neutralization, stale and phantom mutations, and cache-invalidation probes. Spot checks confirmed the plan's repository claims: every named skill exists, the baseline has 70 pages, `apps/oat-docs/package.json:28` declares the CLI devDependency, `docs:check-links` supports `--url/--no-external/--output`, and the pack-manifest import closure is as described. Nothing blocks implementation. Two Medium issues should be settled before p01/p02 start: an unacknowledged build cost that root `pnpm test` would pick up, and undefined inputs for the migration checks that run in CI.

Findings by severity: 0 critical, 0 high, 2 medium, 3 low

## Findings

### Critical

None

### High

None

### Medium

**M1 — Adding an app `test` script makes root `pnpm test` run the full docs `next build`, and the plan understates this** (`plan.md:65`, `plan.md:69`)

`turbo.json` defines `test` with `dependsOn: ["build"]`, meaning the same package's build. The `oat-docs` `build` is `next build`, preceded by its `prebuild` (`apps/oat-docs/package.json`). Root `pnpm build` deliberately excludes the docs app (`turbo run build --filter='!oat-docs'`). Once p01-t02 adds `test` to `oat-docs`, CI gate 3 (`pnpm test`) will run a full static export of the docs site before `tsx --test` runs. The plan says only "root tests also run docs prebuild". That undersells the change: gate 3 gets a new dependency on the whole Next build, plus extra CI time and failure surface. The planned tests use package-local Fumadocs and a CLI subprocess, so they need `^build` (CLI `dist`), not the app's own export.

_Fix guidance:_ In p01-t02, pick one approach and record it:

- Add a package-scoped Turbo override (`"oat-docs#test": { "dependsOn": ["^build"], "outputs": [] }`) and add `turbo.json` to that task's file scope.
- Or explicitly accept that `pnpm test` builds the docs site, and state the cost.

Either way, the p01-t02 cache-acceptance probe should check the chosen graph. Fix the wording at `plan.md:69` so it matches what actually runs.

**M2 — It is unclear what the CI-enrolled migration checks read, and project references are not durable CI inputs** (`plan.md:119`, `plan.md:125`)

p02-t01 adds "reusable path checks" to `apps/oat-docs/scripts/validate.ts` and `apps/oat-docs/tests/migration.test.ts` and says they "remain in CI". The route map it builds lives at `.oat/projects/shared/docs-improvement-overhaul/references/route-migration.json`. Archived projects in this repo are untracked: `git ls-files .oat/projects/archived` lists only `.gitkeep`. If any permanent check or test reads the project-scoped map, CI will fail as soon as the project is completed and archived, or it will silently need a copied fixture. The plan never says what the reusable checks assert or which inputs they use. It only distinguishes them from the phase-local preservation comparison.

_Fix guidance:_ In p02-t01, name the permanent assertions. Examples: every Contents target resolves, no inventoried source consumer points to a non-exported route, and old routes are absent from the export. Require that those assertions use only durable app or repository inputs. Keep `route-migration.json` and the baseline comparison as phase-local evidence that CI never reads. If a permanent old-route list is truly needed, store it under `apps/oat-docs/` and document why it exists.

### Low

**L1 — p02-t02's nav regeneration step does not name the branch CLI** (`plan.md:135`)

The canonical `oat-docs-apply` skill tells users to run bare `oat docs nav sync` (`.agents/skills/oat-docs-apply/SKILL.md:38,121,219`). The `oat` on PATH is the released 0.3.10, which supports MkDocs only: `packages/cli/src/commands/docs/nav/sync.ts:73-83` reads and writes `<appRoot>/mkdocs.yml`. It cannot accept the p01 `--framework fumadocs` flag until a release ships it. The command fails loudly, so nothing is silently corrupted. Even so, p02-t02 should name the branch invocation. Use the app prebuild or `pnpm run cli -- docs nav sync --framework fumadocs …`, and record that as part of the documented apply adaptation.

**L2 — p02-t03 formats the generated agent index with oxfmt** (`plan.md:151`)

`apps/oat-docs/index.md` is regenerated by `oat docs generate-index` and must not be hand-edited (AGENTS.md, Documentation). It is also outside `format:root`. Running `oxfmt --write` on it can create a diff against the generator's output that the next `predev`/`prebuild` regeneration reverses. That leaves a dirty tree or fails a parity check. Regenerate the file instead of formatting it, and drop it from the Format line.

**L3 — Later tasks hard-code paths that the p02 map is meant to decide** (`plan.md:223`, `plan.md:249`)

p04-t04 names `apps/oat-docs/docs/skills/index.md`, and p05-t02 names `getting-started/concepts.md`. Neither path exists yet; both depend on the approved p02 map (`plan.md:121-123`). The wording matches the design's intent. Add a note that implementers resolve these paths from the approved `route-migration.json` and re-check them before p04 and p05.

## Spec/Design Alignment

### Requirements Coverage

| Requirement (discovery success criteria / design)                        | Status  | Notes                                                                                         |
| ------------------------------------------------------------------------ | ------- | --------------------------------------------------------------------------------------------- |
| Newcomer finds install + first success without internals                 | covered | p02 Getting Started migration; p05-t02 concepts visual; p05-t03 journeys                      |
| Discover any supported skill without assuming a project                  | covered | p04 mapping, independent applicability audit, generated catalog                               |
| Each supported skill has useful canonical guidance                       | covered | p04-t03 minimum coverage; p05-t01 named gap list matches design                               |
| Authored order/labels appear in rendered site                            | covered | p01 compiler + real-loader tests + browser smoke                                              |
| Workflow entrypoints distinguish mode/project/ideas/backlog/waves        | covered | p02 destination rules preserve the Workflows sequence                                         |
| Repo links resolve; obsolete migration language removed; URLs may break  | covered | p02-t03 consumer repair, README target mapping, explicit breakage report; no aliases          |
| Drift detectable via validation                                          | partial | Covered by nav/catalog/mapping checks; see M2 for undefined migration-check inputs            |
| README value, independent choices, first success, contributor setup last | covered | p03-t01/t02, including GitHub-render acceptance pending authorization                         |
| Five purposeful visuals, accessible, theme/narrow verified               | covered | p03 SVG + p05-t02 four Mermaid treatments; p05-t03 independent computer-use QA                |
| Lockstep versions, bundles, eight DoD gates per PR                       | covered | Common Verification and Release Closeout; README-only p03 exemption is justified              |
| Deliberate-testing: real oracles, negative controls                      | covered | Guard neutralization (p01-t01), stale/phantom mutations (p04-t01/t04), real Fumadocs consumer |

### Extra Work (not in requirements)

None. The cache-invalidation probes (p01-t02, p04-t01) are verification steps for the design's "wire checks into CI" requirement, not new scope.

## Verification Commands

```bash
# M1: confirm what root test would execute for oat-docs after p01-t02
pnpm exec turbo run test --filter=oat-docs --dry=json | node -e 'const j=JSON.parse(require("fs").readFileSync(0,"utf8"));console.log(j.tasks.map(t=>t.taskId))'
# M2: confirm no CI-enrolled check reads project-scoped inputs
rg -n "\.oat/projects" apps/oat-docs/scripts apps/oat-docs/tests
# L1: confirm the released CLI is MkDocs-only before p01 ships
oat docs nav sync --help
```

## Recommended Next Step

Run the `oat-project-review-receive` skill to turn these findings into plan updates.
