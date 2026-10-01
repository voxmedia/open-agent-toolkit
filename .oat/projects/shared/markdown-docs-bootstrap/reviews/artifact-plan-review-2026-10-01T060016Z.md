---
oat_generated: true
oat_generated_at: 2026-10-01T06:00:16Z
oat_review_scope: plan
oat_review_type: artifact
oat_review_invocation: gate
oat_project: .oat/projects/shared/markdown-docs-bootstrap
oat_gate_headless: true
oat_gate_run_id: db5ebb2c-f554-4275-aa5c-165f92ff8c4b
oat_gate_target: claude-opus-5-5-high
oat_gate_runtime: claude
oat_invocation_model: claude-opus-5-5
oat_invocation_reasoning_effort: high
oat_invocation_source: exec-target-config
---

# Artifact Review: plan

**Reviewed:** 2026-10-01
**Scope:** `plan.md` readiness for implementation (quick mode), against `discovery.md` and the approved lightweight `design.md`
**Files reviewed:** 3 (plan.md, discovery.md, design.md), plus prior plan review handoffs and the referenced source/test/script contracts
**Commits:** n/a (artifact review; reviewed at HEAD `51ef653e5`)

**Dispatch audit (policy view):** `Dispatch: scope=plan action=review role=reviewer producer=unknown provenance=unknown model_axis=selected:claude-opus-5-5 effort_axis=selected:high dispatch_policy=high dispatch_ceiling=high target=oat-reviewer-claude-claude-opus-5-5-high`

Gate route: inline (runtime=claude, cliRoot validated against `OAT_GATE_CLI_ROOT`). The resolver-selected target (claude-opus-5-5 / high) matches this gate's configured invocation, so the review ran inline under the oat-reviewer role contract.

**Reconnaissance:** not-attempted

## Summary

The plan is well-structured. It covers the approved design's components, consumers, error handling, and testing strategy with sequential phases, owned files, and concrete verification commands. Every referenced source file, test file, skill resource, docs page, and root script exists. The two prior Medium findings (build before smoke tests, explicit bundle inventory) are correctly resolved. This pass found one remaining ownership gap: the new template directory must also be registered in the tools pack manifest, which a cross-inventory consistency test enforces. It also found one scope ambiguity in the index-output guard.

Findings by severity: 0 critical, 0 high, 1 medium, 1 low

## Findings

### Critical

None

### High

None

### Medium

- **M1 — `docs-markdown` template must also be registered in the docs tools pack manifest** (`plan.md:84`, `plan.md:94`)
  - Issue: p02-t01 owns adding `docs-markdown` to `templateDirectories` in `packages/cli/scripts/bundle-inputs.mjs`. But the docs pack in `packages/cli/src/commands/tools/shared/pack-manifest.ts:221-222` separately declares `template('docs-app-mkdocs', 'directory')` and `template('docs-app-fuma', 'directory')`. `packages/cli/src/commands/init/tools/shared/bundle-consistency.test.ts:369-377` asserts that every `templateDirectories` entry appears in `PACK_MANIFEST` sources ("manifest template directory …"). So the p02-t01 change as planned fails that test. Neither `pack-manifest.ts` nor `bundle-consistency.test.ts` is in p02-t01's Files or Verify list, so the failure would first surface in p04-t02's full `pnpm test`, after the scoped p02 commit. Without the manifest entry, `oat tools install/update --pack docs` would also not distribute the new template. That breaks the plan's own "templates … through the real bundled resolver" claim for installed scopes and leaves pack-lifecycle/doctor/remove-tools expectations (`pack-lifecycle.test.ts:91-94`, `remove-tools.test.ts:1186`, `doctor/index.test.ts:1797`) unchecked for the new asset.
  - Fix: Add `packages/cli/src/commands/tools/shared/pack-manifest.ts` (`template('docs-markdown', 'directory')` in the `docs` pack) to p02-t01 Files. Add `src/commands/init/tools/shared/bundle-consistency.test.ts` and `src/commands/tools/shared/pack-lifecycle.test.ts` to its Verify vitest list. Note that p04-t01's bundled-resolution check should cover pack install of the new directory.

### Low

- **L1 — Scope the configured-index output protection to Markdown and add a Fumadocs accepted control** (`plan.md:63-64`)
  - Issue: p01-t01 step 3 says to "Validate explicit output against the full canonical configured content root and configured authored index". It doesn't say that applies only when `documentation.tooling` is `markdown`. For Fumadocs, `documentation.index` is the generated manifest (this repository: `.oat/config.json` → `index: apps/oat-docs/index.md`). p03-t03 regenerates exactly that path with `--output apps/oat-docs/index.md`. A tooling-agnostic implementation would refuse the repository's own documented regeneration and every Fumadocs consumer's equivalent. The design scopes this guard to Markdown and keeps "Fumadocs's existing manifest transition unchanged" (`design.md:63`). Step 4's controls cover only the Markdown negative case and an external output.
  - Fix: Say explicitly that the authored-index guard applies when tooling is `markdown`. Add an accepted control in which a Fumadocs config with `--output <configured documentation.index>` still writes and transitions config as before.

## Spec/Design Alignment

### Requirements Coverage

| Requirement (discovery/design)                                         | Status  | Notes                                                                       |
| ---------------------------------------------------------------------- | ------- | --------------------------------------------------------------------------- |
| Markdown is an explicit bootstrap/CLI option (`--framework markdown`)  | covered | p02-t01 step 1; p03-t01                                                     |
| `documentation.tooling: markdown`, default root `docs`, custom roots   | covered | p01-t01 (literal root resolution), p02-t01 (config persistence)             |
| No app package, install, or site build                                 | covered | p02-t01 steps 3-4; p03-t02 file/link checks                                 |
| Explicit additive adoption, byte preservation, repeat convergence      | covered | p02-t02 steps 1-2, 4                                                        |
| Authored vs generated index ownership                                  | covered | p01-t01 step 3 (see L1 for scope clarity)                                   |
| Nested `docs` child does not steal the content root; pointer exclusion | covered | p01-t01 steps 1-2                                                           |
| Read-only managed-guidance preview; nonmutating dry-run outcomes       | covered | p01-t02; p02-t02 step 3                                                     |
| Unsafe root/symlink/config conflicts refused before writes             | covered | p02-t01 step 2                                                              |
| Framework behavior preserved, incl. authorized replacement             | covered | p02-t01 step 5; p04-t02                                                     |
| Consumer inventory (analyze/apply/authoring/document/doctor/docs)      | covered | p03-t02, p03-t03; inventory repeated at p04-t02                             |
| Bootstrap detection in preflight only; `oat init` unchanged            | covered | p03-t01                                                                     |
| Bundled template distribution                                          | partial | bundle inventory covered (p02-t01); pack manifest registration missing (M1) |
| Skill bumps, lockstep versions, CI gate order, cache-replay evidence   | covered | Execution Contracts; p04-t01; p04-t02 steps 3-4                             |
| Reproduction-grade negative/accepted controls                          | covered | p01-t01 step 4; p02-t02 step 4; p04-t02 step 2                              |
| Backlog item stays open; out-of-scope items excluded                   | covered | Execution Contracts; p04-t02                                                |

### Extra Work (not in requirements)

None

## Dispatch Profile Advisory

No `## Dispatch Profile` section is present. That is normal, and there are no ceiling rows to evaluate.

## Verification Commands

- `grep -n "docs-markdown" packages/cli/src/commands/tools/shared/pack-manifest.ts packages/cli/scripts/bundle-inputs.mjs` (after p02-t01)
- `pnpm --filter @open-agent-toolkit/cli exec vitest run src/commands/init/tools/shared/bundle-consistency.test.ts src/commands/tools/shared/pack-lifecycle.test.ts`
- `pnpm --filter @open-agent-toolkit/cli exec vitest run src/commands/docs/index-generate/index.test.ts` with a Fumadocs `--output <configured index>` accepted control

## Recommended Next Step

Run the `oat-project-review-receive` skill to disposition these findings into plan edits.
