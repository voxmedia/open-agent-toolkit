---
oat_status: complete
oat_ready_for: oat-project-implement
oat_blockers: []
oat_last_updated: 2026-10-01
oat_phase: plan
oat_phase_status: complete
oat_plan_parallel_groups: []
oat_plan_hill_phases: ['p04']
oat_auto_review_at_hill_checkpoints: true
oat_plan_source: quick
oat_import_reference: null
oat_import_source_path: null
oat_import_provider: null
oat_generated: false
oat_template: false
---

# Implementation Plan: markdown-docs-bootstrap

> Execute with `oat-project-implement` after quick-start review and readiness are complete. All ten implementation tasks are complete; final acceptance reviews/gate and HiLL approval remain pending.

**Goal:** Offer plain Markdown docs bootstrap with `documentation.tooling: markdown`, authored index/context conventions, additive adoption, and nonmutating dry-run.

**Architecture:** Extend docs init with a Markdown branch using shared content-root resolution and managed-guidance classification. Preserve authored indexes independently of optional generated manifests and retain existing framework behavior.

**Tech Stack:** TypeScript ESM, Commander, Vitest, Markdown skills/templates, pnpm workspaces.

**Commit Convention:** `{type}(pNN-tNN): {description}`. Format and stage only task-owned files; inspect hook changes after each atomic commit.

## Planning Checklist

- [x] Lightweight design and review dispositions approved
- [x] Evaluated phase overlap and recorded sequential execution
- [x] Defined task ownership, observable acceptance, and verification
- [x] Selected project dispatch policy: High
- [x] Recorded optional phase gate and configured lifecycle gate choices: additional phase gates disabled; both lifecycle gates kept
- [x] Completed plan artifact review and quick-start exit gate; all findings dispositioned
- [x] Initialized implementation tracking for p01-t01 and committed readiness

Implementation setup resolved `workflow.hillCheckpointDefault: final` and `workflow.autoReviewAtHillCheckpoints: true`: stop after p04 with automatic final review. Standard root-owned phase reviews remain required; additional cross-runtime phase gates remain disabled.

## Parallelism

All phases run sequentially (`oat_plan_parallel_groups: []`). p02 consumes p01's root and preview contracts; p03 documents the resulting behavior; p04 validates the integrated bundle and versions. They share configuration semantics, skill assets, and CLI packaging, so independent implementation could produce conflicting contracts even without overlapping edits.

## Execution Contracts

- Read `design.md` and applicable instructions before each phase. Inventory all design-listed consumers before edits and again before final review.
- Use `deliberate-testing` when changing coverage. Reuse public-boundary temporary-repository harnesses and meaningful preexisting content; avoid implementation-mirroring assertions and test-only production hooks.
- Every task runs its stated verification, captures actual exit codes, formats changed files with `pnpm exec oxfmt --write <changed paths>`, checks the same paths with `--check`, and runs `git diff --check`. The path list is the exact task diff, not a broad repository glob.
- Bump each changed canonical skill once per final PR diff, including resource-only changes. Bundled skills/templates/docs are shipped CLI functionality; p04 bumps all five public packages together.
- Keep the broader backlog item open. Package drift, approval-policy changes, general `oat init` detection, other repositories, publication, merge, and deployment are outside this plan.

## Phase 1: Shared content and guidance contracts

### Task p01-t01: Resolve literal Markdown roots and protect authored indexes

**Files:** Modify `packages/cli/src/config/oat-config.ts`, `oat-config.test.ts`, `packages/cli/src/commands/docs/index-generate/index.ts`, `index.test.ts`, and existing instruction sync/validate tests. Modify `packages/cli/src/commands/instructions/instructions.utils.ts` only if the shared resolver alone does not satisfy its consumers.

**Steps:**

1. Inventory root consumers. Add regressions for literal Markdown root `docs`, custom roots, nested `docs/docs`, and existing framework roots. The full configured Markdown tree must remain excluded from pointer writes, including existing local AGENTS files.
2. Resolve explicit Markdown to the configured root itself; retain permissive tooling parsing and generic/framework fallbacks.
3. Refuse default Markdown manifest output with an explicit-output instruction. For `documentation.tooling: markdown` only, validate explicit output against the full canonical configured content root and configured authored index in addition to existing selected-source safeguards. Existing selected-source safeguards still apply to all modes. Refuse narrowed-source overwrite and symlink aliases; allow safe external output without changing the authored config index. Preserve Fumadocs-only config transition.
4. Preserve reproduction-grade negative and accepted controls: pre-change narrowed source can target the authored index; post-change rejects the same invocation for the intended output guard; valid external output succeeds. Add a Fumadocs accepted control: output to its configured `documentation.index` succeeds and preserves the existing generated-manifest config transition. Use meaningful existing index bytes and valid config. Record exact fixtures/commands and categorical outcomes in `implementation.md`.

**Verify:** `pnpm --filter @open-agent-toolkit/cli exec vitest run src/config/oat-config.test.ts src/commands/docs/index-generate/index.test.ts src/commands/instructions/instructions.utils.test.ts src/commands/instructions/instructions.integration.test.ts src/commands/instructions/sync/sync.test.ts src/commands/instructions/validate/validate.test.ts`. Assert literal paths, preserved index bytes, and no pointer writes throughout the content tree. Run `pnpm --filter @open-agent-toolkit/cli type-check`.

**Commit:** `feat(p01-t01): support markdown roots and protect authored indexes`.

### Task p01-t02: Share read-only managed guidance classification

**Files:** Modify `packages/cli/src/commands/shared/agents-md.ts` and `agents-md.test.ts`.

**Steps:** Factor a production read-only preview/classifier from upsert, sharing target/path validation, parsing, ownership, and conflict classification. Return predicted created/appended/no-change/manual-required/blocked actions without writes. Actual upsert retains all identity/recheck guards; preview remains advisory. Cover absent, identical, conflicting, unreadable, and unsafe targets using observed bytes and classifications; do not duplicate safety logic in docs init.

**Verify:** `pnpm --filter @open-agent-toolkit/cli exec vitest run src/commands/shared/agents-md.test.ts` and CLI type-check. Preview leaves all filesystem bytes unchanged; actual mutation retains existing conflict/identity protections.

**Commit:** `refactor(p01-t02): expose read-only managed guidance preview`.

## Phase 2: Markdown initialization and adoption

### Task p02-t01: Add fresh Markdown scaffold and CLI mode

**Files:** Modify `packages/cli/src/commands/docs/init/resolve-options.ts`, `scaffold.ts`, `index.ts`, `docs-commands.ts`, their existing tests, and `packages/cli/src/commands/docs/index.ts` help wiring as needed. Create `.oat/templates/docs-markdown/index.md` and `contributing.md`. Modify `packages/cli/scripts/bundle-inputs.mjs` to register `docs-markdown` in `templateDirectories`; retain the existing bundle-assets copying mechanism. Modify `packages/cli/src/commands/tools/shared/pack-manifest.ts` to add `template('docs-markdown', 'directory')` to the docs pack. Extend `packages/cli/src/commands/tools/shared/pack-lifecycle.test.ts` to assert installation of both Markdown templates and use the existing bundle consistency check.

**Steps:**

1. Add `--framework markdown`, target default `docs` in every repo shape, documentation-title reuse of `--site-name`, and Markdown-only `--adopt` validation/help. Report inapplicable app-only options. Markdown lint/format defaults to none; selected existing tools may appear in guidance but never trigger installation.
2. Reject repo root, paths outside the repository, escaping symlinks, nonempty targets without explicit adoption even with `--yes`, and incompatible declared tooling/root/index before writes.
3. Scaffold only authored index/contributing pages with useful context, title/description metadata, and real `.md` Contents links. Do not create docs-root AGENTS. Persist tooling/root/authored-index while preserving unrelated config.
4. Produce deterministic managed root Documentation guidance naming the literal root, Markdown tooling, authored index, and contributing path. Extend existing result reporting without site install/dev/build commands, package discovery/dependencies, root package/Turbo patches, or framework files.
5. Preserve Fumadocs/MkDocs prompts, replacement behavior, and results, including explicitly authorized framework initialization over configured Markdown.

**Verify:** Run `pnpm build` first to refresh packaged assets before direct bundle-backed tests. Then run `pnpm --filter @open-agent-toolkit/cli exec vitest run src/commands/docs/init/resolve-options.test.ts src/commands/docs/init/scaffold.test.ts src/commands/docs/init/index.test.ts src/commands/docs/init/integration.test.ts src/commands/docs/init/docs-commands.test.ts src/commands/docs/init/root-package.test.ts src/commands/docs/init/mkdocs-compat.test.ts src/commands/init/tools/shared/bundle-consistency.test.ts src/commands/tools/shared/pack-lifecycle.test.ts` and CLI type-check. Fresh default/custom roots produce literal config and meaningful pages/guidance; package files remain unchanged; unsafe/config conflicts fail before writes; framework controls retain existing behavior. Verify `node packages/cli/scripts/bundle-inputs.mjs --list templateDirectories` includes `docs-markdown` and the built `packages/cli/assets/templates/docs-markdown/` contains both `index.md` and `contributing.md`.

**Commit:** `feat(p02-t01): bootstrap plain markdown documentation`.

### Task p02-t02: Implement additive adoption and nonmutating dry-run

**Files:** Modify the p02 init/scaffold/result owners and existing integration tests, reusing p01 preview. Add an internal production adoption helper within docs/init if needed to keep ownership clear.

**Steps:**

1. Explicit `--adopt` adds only missing baseline files. Preserve existing page/index/local-instruction bytes; leave malformed existing indexes untouched and report audit advice. When root index is missing, map actual sibling Markdown pages and child directories with authored indexes, honoring excludes/assets. Never link absent child indexes or repair populated content automatically.
2. Repeat adoption reconciles identical config/guidance without duplicates and converges to no-change. Refuse incompatible config. Persist config only after validation and entrypoint availability; report actual partial state on failures without claiming transactionality.
3. Dry-run inspects planned file/config/guidance changes without calling mutating scaffold/config/upsert. Preserve ok/partial status vocabulary with `dryRun: true`: blocked/manual-required guidance means partial/exit 1 and planned scaffold; converged adoption means ok/exit 0 and no planned changes.
4. Keep a meaningful preexisting baseline tree and exact before/after snapshots. Record pre-change missing Markdown capability, refusal without adoption, preserved bytes with explicit adoption, and accepted fresh controls. Cover empty, populated, missing/malformed index, custom excludes, local guidance, and repeat runs. All dry-runs/refusals leave tree/config/instructions unchanged.

**Verify:** `pnpm --filter @open-agent-toolkit/cli exec vitest run src/commands/docs/init/scaffold.test.ts src/commands/docs/init/index.test.ts src/commands/docs/init/integration.test.ts src/commands/shared/agents-md.test.ts` and CLI type-check. Assert terminal/JSON exits and results, idempotence, deterministic guidance, preserved authored bytes, and complete dry-run nonmutation.

**Commit:** `feat(p02-t02): adopt markdown docs additively with dry-run`.

### Task p02-t03: (review) Encode Markdown adoption link destinations

**Files:** Modify `packages/cli/src/commands/docs/init/markdown.ts` and `integration.test.ts` only.

**Finding:** M1 from `reviews/archived/p02-review-2026-10-01T125830Z.md`; `encodeURI` preserves query/fragment delimiters and creates broken links for actual authored filenames and child indexes. Root agrees; Task Scope: Minor.

**Steps:** Encode each relative path segment as filename data while preserving slash separators. Escape characters that can terminate Markdown destinations, including parentheses. Preserve authored bytes and ordinary relative links. Add a public adoption regression with query/fragment characters, parentheses and a child directory index; resolve generated destinations through an independent URI reader and verify they address the actual existing files.

**Verify:** Build before the real CLI probe. Run the p02 ten-file direct Vitest suite and CLI type-check/lint. Reproduce the original filename defect with the old encoder, then verify encoded destinations and unchanged existing bytes with the fix. Record exact probe and categorical outcomes; no own-module mock as proof.

**Commit:** `fix(p02-t03): encode markdown adoption link destinations`.

## Phase 3: Bootstrap workflow and docs consumers

### Task p03-t01: Offer Markdown throughout bootstrap

**Files:** Modify `.agents/skills/oat-docs-bootstrap/SKILL.md` and `assets/AGENTS.md.template`; bump its metadata version once. Add bounded contract coverage under existing skill/smoke test conventions if it protects a real routing regression.

**Steps:** Offer Markdown explicitly. Keep plain-doc evidence detection in bootstrap preflight with config authoritative and framework evidence first. A root README alone is insufficient; empty targets remain fresh setup. Lead existing authored trees to adopt/audit, call explicit CLI adoption, and delegate content repairs to analyze/apply. Skip app/package-manager/site-build questions for Markdown while retaining context/Contents/metadata/link expectations. Config inspection, instructions, and walkthrough distinguish authored entrypoint from optional manifests. Do not scaffold docs-root AGENTS or modify general `oat init` detection/config.

**Verify:** Run `pnpm build` first to refresh the changed CLI and bundled assets, then `pnpm oat:validate-skills`, `pnpm test:skills`, and `pnpm test:smoke`. Run any newly added exact test file with `node --test <new path>` first. Inspect fresh/populated plain-doc workflow commands against branch CLI in temporary repositories and record routing/audit handoff. Adoption must not claim full OAT conformity solely from config and guidance.

**Commit:** `feat(p03-t01): offer markdown in docs bootstrap workflow`.

### Task p03-t02: Align analyze, apply, authoring, and lifecycle consumers

**Files:** Modify relevant files under `.agents/skills/oat-docs-analyze/`, `oat-docs-apply/`, and `oat-docs-authoring/`, especially analysis Step 0, `references/quality-checklist.md`, `references/docs-root-resolution.md`, and `references/oat-fumadocs-contract.md`. Inspect `oat-project-document/SKILL.md` and `oat-doctor/SKILL.md`; modify only conflicting assumptions. Bump every changed skill, including resource-only changes.

**Steps:** Markdown uses its configured content root even with nested docs. Retain authored index ownership, context, Contents, metadata, exclusions, and local instructions. Keep framework checks where applicable; Markdown uses file/link checks rather than site build/nav-generation/default-manifest assumptions. Record a compact changed/verified-unchanged inventory of every design-listed consumer in implementation tracking.

**Verify:** `pnpm oat:validate-skills` and `pnpm test:skills`. Perform source-aware walkthroughs for fresh Markdown, adopted incomplete Markdown, nested roots, and framework controls; analyze/apply must recommend gaps without overwriting context. Add automated contract tests only where they protect behavior rather than exact prose.

**Commit:** `feat(p03-t02): align docs consumers with markdown content roots`.

### Task p03-t03: Document commands and index ownership

**Files:** Update relevant existing `apps/oat-docs/docs/docs-tooling/` pages (`add-docs-to-a-repo.md`, `commands.md`, `workflows.md`), CLI/config/reference pages, and `provider-sync/instruction-sync.md`. Update authored Contents only for added/moved pages; regenerate `apps/oat-docs/index.md` through tooling.

**Steps:** Follow docs-app instructions and `oat-project-document` core guidance. Analyze the implemented delta before editing; implementation approval covers this explicit docs task. Explain Markdown selection/config, additive adoption, dry-run partial states, authored indexes, external manifests, local instructions, and existing explicit framework replacement behavior. Ground examples in branch acceptance, preserve source-artifact provenance, and omit site install/build requirements for Markdown.

**Verify:** `pnpm --filter oat-docs check`; regenerate with `pnpm -w run cli:source -- docs generate-index --docs-dir apps/oat-docs/docs --output apps/oat-docs/index.md`; run documented nav sync if Contents changed; `pnpm build:docs`. Check changed links/metadata and format exact source pages. Never hand-edit the generated manifest.

**Commit:** `docs(p03-t03): explain markdown bootstrap and authored indexes`.

## Phase 4: Integration, bundled release, and acceptance

### Task p04-t01: Apply release versions and verify bundles

**Files:** Modify versions in `packages/cli/package.json`, `packages/control-plane/package.json`, `packages/docs-config/package.json`, `packages/docs-theme/package.json`, and `packages/docs-transforms/package.json`; update `pnpm-lock.yaml` if the existing workflow requires it. Complete missing PR-scoped canonical skill bumps.

**Steps:** Fetch `origin/main`, inspect lockstep versions, and choose one shared version strictly above that base using repository policy. Build and verify Markdown templates and changed skills/resources through the real bundled resolver with an isolated test home. Install/update the docs pack in isolated user and project scopes and verify `docs-markdown/index.md` and `docs-markdown/contributing.md` are distributed by the real pack manifest. Inspect existing release scripts rather than inventing another mechanism. Confirm no framework dependency additions or unrelated upgrades. This prepares release-valid assets and does not publish them.

**Verify:** `pnpm build`, `pnpm run check:skill-bumps`, `pnpm release:check-versions`, and `pnpm release:validate`; record actual exit codes and bundled-resolution evidence.

**Commit:** `chore(p04-t01): bump lockstep packages for markdown docs support`.

### Task p04-t02: Prove integrated acceptance and complete verification

**Files:** Update this project's `implementation.md` and tracking artifacts. Link partial shipment in the source backlog item through PJM after checking adoption; keep it open. Fix acceptance defects in their owning source files with scoped commits and rerun affected checks.

**Steps:**

1. Repeat the full producer/consumer inventory. Exercise branch-built CLI on fresh/populated temporary Markdown trees, custom/nested roots, framework conflicts, unsafe paths, partial/manual guidance, and repeat adoption. Verify terminal/JSON behavior, preserved authored bytes/config/instructions, external manifest, and framework compatibility.
2. Preserve reproducible negative and accepted controls from p01/p02. Output refusal must fail for its intended guard. If a test is the sole proof of a P0 clause, neutralize its guard, confirm it fails, restore, and record evidence. Store exact probes and categorical outcomes.
3. Run CI gates in order: `pnpm check`, `pnpm type-check`, `pnpm test`, `pnpm build`, `pnpm run check:skill-bumps`, fetch `origin/main` then `pnpm release:check-versions`, `pnpm release:validate`, `pnpm build:docs`. Capture every exit explicitly and stop on failures. Run `pnpm lint` and `pnpm format` for changed skill/smoke surfaces.
4. Distinguish Turbo cache replay from execution. For evidence-grade tests, pass an isolated temporary home only to `pnpm exec turbo run test --force`; build first for separate smoke suites. Run `pnpm test:smoke`, `pnpm test:skills`, `pnpm test:scripts`, and `pnpm oat:validate-skills` separately when needed for actual execution evidence. Do not change the normal shell home or provider-review credentials.
5. Run phase/final reviews and the configured implementation exit gate under selected policy. Record dispositions and HiLL boundaries. Do not claim publication, merge, live installation, or PR creation.

**Verify:** All required gates and controls pass with durable execution evidence, skill/package versions satisfy the fresh integration base, existing framework cases pass, and the broader backlog remains open. Implementation completion remains subject to configured reviews and lifecycle checkpoints.

**Commit:** `chore(p04-t02): record markdown docs acceptance and verification`.

## Reviews

Existing scaffold rows and historical review events are preserved. Quick mode requires no spec. All approved plan edits are applied; the final cross-runtime gate passed and its two Low findings were dispositioned as already-covered scope. See `reviews/plan-gate-final-handoff.md` for receipt evidence. Implementation is in progress; p01 tasks and independent review complete.

| Scope  | Type     | Status          | Date       | Artifact                                                    | Reviewed Head                            | Invocation | Gate Target          |
| ------ | -------- | --------------- | ---------- | ----------------------------------------------------------- | ---------------------------------------- | ---------- | -------------------- |
| p01    | code     | pending         | -          | -                                                           | -                                        | -          | -                    |
| p02    | code     | pending         | -          | -                                                           | -                                        | -          | -                    |
| final  | code     | pending         | -          | -                                                           | -                                        | -          | -                    |
| spec   | artifact | pending         | -          | -                                                           | -                                        | -          | -                    |
| design | artifact | pending         | -          | -                                                           | -                                        | -          | -                    |
| p03    | code     | pending         | -          | -                                                           | -                                        | -          | -                    |
| p04    | code     | pending         | -          | -                                                           | -                                        | -          | -                    |
| plan   | artifact | fixes_completed | 2026-10-01 | reviews/plan-auto-handoff.md                                | b3480f8824b175b34cdba2f76d7dcf66ee12a034 | auto       | -                    |
| plan   | artifact | passed          | 2026-10-01 | reviews/plan-auto-rereview.md                               | 1ab8e49002716294f43b63831e13b0f9576f535b | auto       | -                    |
| plan   | artifact | fixes_completed | 2026-10-01 | reviews/archived/artifact-plan-review-2026-10-01T060016Z.md | -                                        | gate       | claude-opus-5-5-high |
| plan   | artifact | fixes_completed | 2026-10-01 | reviews/plan-auto-final-retry.md                            | 4f1c0d422241214859c906efb176e5a2787ba472 | auto       | -                    |
| plan   | artifact | passed          | 2026-10-01 | reviews/archived/artifact-plan-review-2026-10-01T112231Z.md | -                                        | gate       | claude-opus-5-5-high |
| p01    | code     | fixes_completed | 2026-10-01 | reviews/p01-review-2026-10-01T120229Z.md                    | 47f4fddad5b3618e5146631b729e435a0a4a5f4a | auto       | -                    |

Record full reviewed heads and invocation provenance for actual reviews. Preserve all rows and unknown trailing cells. Mark `passed` only for a clean result; disposition residual findings before readiness.

| p02 | code | fixes_completed | 2026-10-01 | reviews/archived/p02-review-2026-10-01T125830Z.md | 95250d626e6fb7bf4f382be4d4e10eae18e330c0 | auto | - |

| p02 | code | passed | 2026-10-01 | reviews/p02-review-2026-10-01T132908Z.md | f715c2ece20b5650d64d3b55bb6b9f44b2c98495 | auto | - |

| p03 | code | fixes_completed | 2026-10-01 | reviews/p03-review-2026-10-01T140627Z.md | 1e03f88dcb5ae9713ff36a4b3327ac02d1b4f953 | auto | - |
| p04 | code | passed | 2026-10-01 | reviews/p04-review-2026-10-01T150035Z.md | f4d76f977968c4d4e00d86153e48a9781649a2d1 | auto | - |
| final | code | received | 2026-10-01 | reviews/final-review-2026-10-01T151606Z.md | f7b7acb6f041d9b016bc67af4196c40a0f689e6d | auto | - |

### Plan Review Dispositions

- Original automatic review M1/M2: user approved and resolved; first automatic re-review passed.
- First gate M1/L1: user approved and resolved; artifact consumed and archived. It passed its High threshold.
- Final automatic retry M1: user approved and resolved by moving p02 build before bundle-backed tests. The automatic retry bound is exhausted; its historical event remains fixes_completed.
- Final cross-runtime gate: passed with 0 Critical, 0 High, 0 Medium, 2 Low. Root rejected both missing-scope claims with source-verified coverage rationale; no unresolved findings or waived requirements. Artifact received, dispositioned, and archived. See `reviews/plan-gate-final-handoff.md`.

Source pointers retained for the already-planned consumer inventory: index generation's independent root default in `packages/cli/src/commands/docs/index-generate/index.ts:384-389`; resolver agreement test in `packages/cli/src/config/oat-config.test.ts:633`; template reference pages `apps/oat-docs/docs/reference/file-locations.md` and `reference/oat-directory-structure.md`.

## Implementation Complete

Implementation in progress: 10/10 tasks complete; final acceptance pending. Planned scope: 4 sequential phases, 10 atomic tasks — p01 (2), p02 (3), p03 (3), p04 (2). Replace this with a completion summary only after implementation and required reviews/gates pass.

## References

- Requirements: `discovery.md`
- Approved architecture: `design.md`
- Design review/dispositions: `reviews/design-consensus-handoff.md`
- Source backlog: `.oat/repo/pjm/backlog/items/BL-260911-make-docs-bootstrap-a-front.md`
- Instructions: `AGENTS.md`, `apps/oat-docs/AGENTS.md`
