---
oat_generated: true
oat_generated_at: 2026-10-01T11:22:31Z
oat_review_scope: plan
oat_review_type: artifact
oat_review_invocation: gate
oat_project: .oat/projects/shared/markdown-docs-bootstrap
oat_gate_headless: true
oat_gate_run_id: 645bbca3-db69-4867-812e-22f31388aa11
oat_gate_target: claude-opus-5-5-high
oat_gate_runtime: claude
oat_invocation_model: claude-opus-5-5
oat_invocation_reasoning_effort: high
oat_invocation_source: exec-target-config
---

# Artifact Review: plan

**Reviewed:** 2026-10-01
**Scope:** `plan.md` readiness for implementation (quick mode), checked against `discovery.md` and the approved lightweight `design.md`
**Files reviewed:** 3 (plan.md, discovery.md, design.md). Also read: the prior plan review handoffs, the archived gate artifact, and the source, test, and script contracts the plan cites
**Commits:** n/a (artifact review; reviewed at HEAD `0b98ca479`)

**Dispatch audit (policy view):** `Dispatch: scope=plan action=review role=reviewer producer=unknown provenance=unknown model_axis=selected:claude-opus-5-5 effort_axis=selected:high dispatch_policy=high dispatch_ceiling=high target=oat-reviewer-claude-claude-opus-5-5-high`

Gate route: inline (runtime=claude, cliRoot validated against `OAT_GATE_CLI_ROOT`). The resolver-selected reviewer target (claude-opus-5-5 / high) matches this gate's configured invocation. The review therefore ran inline under the `oat-reviewer` role contract.

**Reconnaissance:** not-attempted

## Summary

The plan is ready for implementation. All prior findings are correctly applied:

- Auto M1/M2: build before p03 smoke checks; explicit `bundle-inputs.mjs` inventory.
- Gate M1/L1: docs pack manifest registration plus lifecycle and consistency tests; a Markdown-only authored-index guard plus a Fumadocs accepted control.
- Final-retry M1: `pnpm build` now comes first in p02-t01 Verify.

Every cited source file, test file, root script, and bundle command exists and behaves as the plan assumes. Two Low clarity gaps remain. Neither blocks.

Findings by severity: 0 critical, 0 high, 0 medium, 2 low

## Findings

### Critical

None

### High

None

### Medium

None

### Low

- **L1 — Name index generation's duplicated `<root>/docs` heuristic as a p01-t01 step 2 consumer** (`plan.md:61-62`)
  - Issue: Step 2 says "Resolve explicit Markdown to the configured root itself" without naming which resolvers that covers. `oat docs generate-index` does not call the shared `resolveDocumentationContentRoot` (`packages/cli/src/config/oat-config.ts:2053`). It reimplements the `<root>/docs` heuristic inline for its `--docs-dir` default (`packages/cli/src/commands/docs/index-generate/index.ts:384-389`). The design requires the Markdown override to apply to "index generation's source default" too (`design.md:57`). If only the shared resolver changes, a Markdown root with a nested `docs/` child would still be indexed from the subsection whenever `--docs-dir` is omitted. Mitigation: step 1's consumer inventory and the existing parity test (`oat-config.test.ts:633`, "agrees with the docs-index generator on the directory it actually indexes") would probably catch this, but only if the new nested-Markdown regression is added to that parity test.
  - Fix: In p01-t01 step 2, name both resolvers: the shared resolver and `resolveIndexGeneratePaths`' docs-dir default. Add the Markdown nested-`docs/` fixture to the existing parity test.

- **L2 — Name the reference pages that list bundled template directories** (`plan.md:137`)
  - Issue: p03-t03 lists "CLI/config/reference pages" in general terms. Two reference pages list the shipped `.oat/templates/` directories by name and would go stale once `docs-markdown/` is added: `apps/oat-docs/docs/reference/file-locations.md:192` and `apps/oat-docs/docs/reference/oat-directory-structure.md:59`. Neither the design's consumer list nor the plan names them.
  - Fix: Add both pages to p03-t03 Files so the `docs-markdown/` template appears next to `docs-app-fuma/` and `docs-app-mkdocs/`.

## Spec/Design Alignment

### Requirements Coverage

| Requirement (discovery/design)                                             | Status  | Notes                                                                                           |
| -------------------------------------------------------------------------- | ------- | ----------------------------------------------------------------------------------------------- |
| Markdown is an explicit bootstrap/CLI option (`--framework markdown`)      | covered | p02-t01 step 1; p03-t01                                                                         |
| `documentation.tooling: markdown`, default root `docs`, custom roots       | covered | p01-t01; p02-t01 step 3                                                                         |
| No app package, install, or site build                                     | covered | p02-t01 steps 3-4; p03-t02                                                                      |
| Explicit additive adoption, byte preservation, repeat convergence          | covered | p02-t02 steps 1-2, 4                                                                            |
| Authored vs generated index ownership (Markdown-only guard)                | covered | p01-t01 steps 3-4 incl. Fumadocs accepted control                                               |
| Nested `docs` child does not take over the content root; pointer exclusion | covered | p01-t01 steps 1-2 (see L1 for the index-generate consumer)                                      |
| Read-only managed-guidance preview; nonmutating dry-run outcomes           | covered | p01-t02; p02-t02 step 3                                                                         |
| Unsafe root/symlink/config conflicts refused before writes                 | covered | p02-t01 step 2                                                                                  |
| Framework behavior preserved, incl. authorized replacement                 | covered | p02-t01 step 5; p04-t02                                                                         |
| Consumer inventory (bootstrap/analyze/apply/authoring/document/doctor)     | covered | p03-t01, p03-t02; repeated at p04-t02                                                           |
| Bootstrap detection in preflight only; `oat init` unchanged                | covered | p03-t01                                                                                         |
| Bundled template distribution                                              | covered | p02-t01 (bundle inventory + pack manifest + lifecycle/consistency tests); p04-t01 scope install |
| Docs explain commands, adoption, index ownership                           | covered | p03-t03 (see L2 for template listings)                                                          |
| Skill bumps, lockstep versions, CI gate order, cache-replay evidence       | covered | Execution Contracts; p04-t01; p04-t02 steps 3-4                                                 |
| Reproduction-grade negative/accepted controls                              | covered | p01-t01 step 4; p02-t02 step 4; p04-t02 step 2                                                  |
| Backlog item stays open; out-of-scope items excluded                       | covered | Execution Contracts; p04-t02                                                                    |

### Extra Work (not in requirements)

None

## Dispatch Profile Advisory

There is no `## Dispatch Profile` section, which is normal, so there are no ceiling rows to evaluate.

## Verification Commands

- `grep -n "config-docs-subdirectory" packages/cli/src/commands/docs/index-generate/index.ts` (after p01-t01, confirm the Markdown branch bypasses it)
- `pnpm --filter @open-agent-toolkit/cli exec vitest run src/config/oat-config.test.ts -t "agrees with the docs-index generator"`
- `grep -n "docs-markdown" apps/oat-docs/docs/reference/file-locations.md apps/oat-docs/docs/reference/oat-directory-structure.md` (after p03-t03)

## Recommended Next Step

Run the `oat-project-review-receive` skill to disposition these Low findings. They can go in as small plan edits or be deferred to the implementation-time consumer inventory.
