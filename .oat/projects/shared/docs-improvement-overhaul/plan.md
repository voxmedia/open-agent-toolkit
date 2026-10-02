---
oat_status: in_progress
oat_ready_for: null
oat_blockers: []
oat_last_updated: 2026-10-01
oat_phase: plan
oat_phase_status: in_progress
oat_plan_parallel_groups: []
oat_plan_source: quick
oat_import_reference: null
oat_import_source_path: null
oat_import_provider: null
oat_generated: false
oat_template: true
---

# Implementation Plan: docs-improvement-overhaul

**Goal:** Enforce reader-first navigation, cover every supported skill, and improve the README and five bounded visual treatments.

**Architecture:** Contents determines membership/order; frontmatter determines owned labels. The shipped CLI generates ignored Fumadocs metadata with sidecar ownership tracking. A repo-specific script generates a committed, bundled skill catalog from canonical metadata and audited guide/applicability mappings. No aliases.

**Stack:** Existing TypeScript CLI, Fumadocs/Next static export, Markdown, Mermaid and one original theme-neutral SVG. No framework replacement or new visual pipeline.

**Authority:** Planning only. User authorized autonomous collaboration through plan readiness with High dispatch, not implementation, publication or merge. Five separately mergeable phases do not imply automatic PR creation.

## Planning Checklist

- [x] Quick mode, lightweight design and Fable draft-and-review selected.
- [x] High dispatch confirmed; reusable ladder complete.
- [x] Evaluate phase parallelism and preserve initial task IDs/review rows.
- [x] Leave implementation HiLL unset pending implementation-start confirmation.
- [x] Final independent computer-use QA; targeted implementer smoke after p01/p02.
- [ ] Finish artifact review and configured quick-start exit gate.

## Parallelism and Reviews

Keep all phases sequential. p02 needs the compiler, p03 needs stable routes, p04 needs migrated owners, and p05 needs the catalog/anchors. Although README and catalog are conceptually independent after p02, their integration/release surfaces overlap; no parallel phase worktrees. Within p04/p05, independent read-only audits and file-disjoint family drafts may run concurrently. Root owns shared indexes, mapping integration and version bumps.

Fable reviews design, plan and phase diffs. Built-in per-phase/final reviews remain required. Under the user's autonomous planning direction, optional additional cross-runtime phase gate remains unconfigured (documented non-interactive default); configured lifecycle gates remain enabled. These are separate from final visual QA. Artifact-review retry limit is two rewrites; configured quick-start gate retains two attempts. Exhaustion/operational failures are reported, never represented as passes.

Recommend considering a post-p02 implementation HiLL when the new structure is visible, but do not prefill it as user-approved. All implementation tasks remain pending.

## Common Verification and Release Closeout

New script names below are deliverables: p01 creates `docs:validate` and `docs:test`, enrolling them in existing CI-gated check/test scripts. p04 creates `docs:skills:generate` and `docs:skills:check`. Source validation and real-consumer tests are the useful fresh-checkout guarantee; freshly generated output compared only with itself is not drift evidence.

Each shipped phase closes with canonical bundle regeneration, applicable skill metadata bumps and lockstep public versions in CLI, control-plane, docs-config, docs-theme and docs-transforms, including lockfile changes. Root coordinates these once per final phase PR diff, not per task. Choose versions against current integration/main. README-only p03 needs no artificial package bump unless its actual diff touches shipped package/bundled content; the other four phases necessarily do.

At phase closeout run the eight AGENTS gates in order: `pnpm check`; `pnpm type-check`; `pnpm test`; `pnpm build`; `pnpm run check:skill-bumps`; fetch `origin/main` then `pnpm release:check-versions`; `pnpm release:validate`; `pnpm build:docs`. Record each actual exit code. Also run `pnpm lint` and `pnpm format` when `.agents/skills` or `tools/smoke` changes. Distinguish cached logs from executed tests, using the documented isolated-HOME forced path when necessary. Surface unrelated failures without expanding scope.

Serve `apps/oat-docs/out` under `/open-agent-toolkit/`, with no SPA fallback masking missing routes. Run `pnpm docs:check-links --url <verified-local-base-url> --no-external --output <phase-report-path>`; URL/report values are discovered at execution, not fixed ports assumed now. Record built SHA, server command, execution/display host and actual URL. Never substitute an unverified deployed build.

## Phase 1: Make the Current Sidebar Enforceable

### Task p01-t01: Compile safe Fumadocs metadata

**Files:** `packages/cli/src/commands/docs/nav/{index,contents,sync}.ts`; new `fumadocs.ts`, `fumadocs.test.ts` and an ownership helper if needed; existing `sync.test.ts`.

**Work:** Add explicit framework/check options, preserving MkDocs default/YAML behavior. Distinguish local leaf/child/index ownership from cross-links. Use leaf/index titles with label mismatch checks, exact landing handling, orphan/duplicate/missing-target/fragment checks and fenced-example exclusion. Bound supported syntax as design specifies. Implement ignored sidecar path/hash ownership, refusal for unowned/externally edited files, exact stale cleanup and traversal/symlink protection. Prevalidate before writes; check mode never mutates. Do not invent a navigation DSL or infer custom loader configuration.

**Verify:** Read `deliberate-testing`. Run `pnpm --filter @open-agent-toolkit/cli exec vitest run src/commands/docs/nav/sync.test.ts src/commands/docs/nav/fumadocs.test.ts`. Include real Contents provenance, valid/invalid ownership controls, authored bytes preserved, stale-output check failure without writes, deterministic repeat and prevalidation failure with no writes. Neutralize the write-protection guard to prove its key test fails, then restore it. Record exit and executed test count.

**Format:** `pnpm exec oxfmt --write packages/cli/src/commands/docs/nav`.

**Commit:** `feat(p01-t01): compile owned Fumadocs navigation from Contents`.

### Task p01-t02: Integrate the real loader and first build

**Files:** `apps/oat-docs/package.json`, app/root ignore rules; `.oat/templates/docs-app-fuma/{package.json.template,.gitignore}`; `packages/cli/src/commands/docs/init/{scaffold.ts,scaffold.test.ts,integration.test.ts}`; `packages/cli/scripts/{bundle-inputs.mjs,bundle-assets.sh}`; root `package.json`; new `tools/docs/{validate.ts,navigation.test.ts}`.

**Work:** Generate nav before fumadocs-mdx in app and scaffold. Ignore/exclude metadata and sidecar from Git and source bundles. Add CI-enrolled docs validation/tests. Exercise generated metadata through real installed Fumadocs/MDX consumers, not only invented expected objects. Verify order, titles, root/child landing once, native canonical ownership, breadcrumbs and previous/next even when Skills precedes Workflows. Unsafe synthetic cross-links stay in body navigation rather than prompting an unreviewed loader patch. First scaffold build must work without a second generation pass.

**Verify:** `pnpm docs:test`; `pnpm docs:validate`; `pnpm --filter @open-agent-toolkit/cli exec vitest run src/commands/docs/init/scaffold.test.ts src/commands/docs/init/integration.test.ts`; `pnpm build:docs`. Test invalid sources independently of output parity; use stale/missing output for meaningful check-mode tests. Verify bundled Markdown remains present and build-only metadata is absent.

**Format:** `pnpm exec oxfmt --write apps/oat-docs/package.json package.json tools/docs packages/cli/src/commands/docs/init packages/cli/scripts/bundle-inputs.mjs`; format modified JSON templates using the supported formatter and use `git diff --check` for shell/ignore files.

**Commit:** `feat(p01-t02): enforce navigation at real consumer boundaries`.

### Task p01-t03: Align authoring instructions and verify foundation

**Files:** `apps/oat-docs/AGENTS.md`; docs `reference/docs-index-contract.md`, `docs-tooling/commands.md`, `contributing/documentation.md`, affected indexes/titles; nav guidance in `.agents/skills/oat-docs-{bootstrap,apply,analyze,authoring}/`; docs scaffold package/guidance templates where relevant; release closeout files.

**Work:** Search and update all nav-command consumers, especially bootstrap/apply, docs-index contract, app instructions and Fumadocs/MkDocs scaffold distinctions. Fix observed title/Contents mismatches and any missing physical-parent ownership entries without moving pages. Keep current root Contents order (including temporary User Guide prominence) until p02. Document generation authority, explicit framework, refusal/recovery, unsupported syntax and checks. No substantive rewrite.

**Verify:** `pnpm docs:validate`; `pnpm docs:test`; implementer computer-use smoke for current ordering/labels, landings, breadcrumb/previous-next, family links and basePath once. Save `reviews/p01-browser-smoke.md` with screenshots/actions. Shared release closeout and Fable phase-diff review. No full independent browser tour yet.

**Format:** `pnpm exec oxfmt --write apps/oat-docs/AGENTS.md apps/oat-docs/docs .agents/skills/oat-docs-bootstrap .agents/skills/oat-docs-apply .agents/skills/oat-docs-analyze .agents/skills/oat-docs-authoring`; additionally format exact changed template/release files.

**Commit:** `docs(p01-t03): align navigation contracts and verify foundation`.

## Phase 2: Migrate Information Without Rewriting It

### Task p02-t01: Review the complete migration map

**Files:** project `references/route-migration.json`, `references/migration-review.md`; analysis artifact resolved by `oat-docs-analyze`; reusable path checks in `tools/docs/{validate.ts,migration.test.ts}`.

**Work:** Run bounded docs analysis on the actual app and tie approved recommendations to this plan; do not claim earlier recon was a formal analyze run. At an exact baseline SHA, inventory every page, heading, asset, source/hosted link and live consumer. Account for the initial 70 pages or explain baseline drift. Declare exact destinations and section-level accounting for consolidated router indexes. Fable reviews the map before moves. Normalization permits only identified link/frontmatter/router changes, not arbitrary paragraph stripping.

**Destination rules:** quickstart/bootstrap/tool-packs/concepts → Getting Started; existing Skills plus repository analysis → top-level Skills; configuration/local state and artifact/state contracts → Reference; backlog/remote planning → Workflows Backlog and planning; waves → Workflows Waves; Projects → lifecycle plus planning/execution/reviews/closeout; dispatch/autonomy/Cursor Cloud/programmatic execution/orchestration/evidence-layers/gates → Advanced. Preserve Provider Sync, Docs Tooling and Contributing owners. Per-page map resolves all filenames before moving.

**Verify:** Every baseline page has one destination or explicit router-consolidation accounting; every substantive section survives. Independent review checks normalization. Preservation checks are phase-local baseline comparisons, not permanent frozen-prose CI rules that would block p05 authoring. Reusable path checks remain in CI.

**Format:** `pnpm exec oxfmt --write .oat/projects/shared/docs-improvement-overhaul/references/route-migration.json .oat/projects/shared/docs-improvement-overhaul/references/migration-review.md tools/docs` and the resolved analysis artifact.

**Commit:** `docs(p02-t01): inventory and approve the information migration`.

### Task p02-t02: Apply the preservation-only move

**Files:** `apps/oat-docs/docs/**` per approved map; `apps/oat-docs/app/not-found.tsx` if no useful existing not-found owner exists.

**Work:** Apply approved analysis recommendations in the project-owned branch. If using oat-docs-apply, preserve this branch and authorization boundary rather than silently creating a second workflow. Add real section directories/indexes; preserve leaf headings and substantive prose except authorized normalization. Consolidate obsolete routers with recorded accounting. No aliases, redirects or transitional stubs. Add small Home/search recovery affordances for missing routes, not new search machinery.

**Verify:** Compare actual baseline/new content and explicit index accounting. `pnpm docs:validate`; `pnpm build:docs`; exported routes match the map, moved old routes are absent, canonical destinations exist. Browser smoke checks new hierarchy and a moved leaf; search no longer indexes removed pages.

**Format:** `pnpm --filter oat-docs docs:format`; `pnpm exec oxfmt --write apps/oat-docs/app/not-found.tsx` if edited.

**Commit:** `docs(p02-t02): migrate pages into reader-first sections`.

### Task p02-t03: Repair consumers and verify migrated journeys

**Files:** root/public package READMEs; `.agents/skills/oat-docs/SKILL.md`, `oat-doctor/SKILL.md`, `docs-completed-projects-gap-review/SKILL.md`, `subagent-orchestration/references/provider-cursor.md` under the skill root; other inventoried live consumers/templates; `tools/docs/validate.ts`; generated agent index, bundles and release files.

**Work:** Repair source/hosted consumers, including the already stale oat-docs topic map. Add executable topic-map target validation. Regenerate indexes/bundles from canonical sources. Do not rewrite archived historical evidence just because it mentions an old route. Clearly report intentional URL breakage.

**Verify:** `pnpm docs:validate`; `pnpm docs:test`; local export link crawl. Computer-use smoke: seven primary sections, choose-workflow, Skills canonical owner, an updated README link, and old-route Home/search recovery. Save `reviews/p02-browser-smoke.md`, preservation and link reports. Shared closeout plus Fable phase review.

**Format:** `pnpm exec oxfmt --write README.md packages/cli/README.md packages/docs-config/README.md packages/docs-theme/README.md packages/docs-transforms/README.md apps/oat-docs/index.md tools/docs` and exact changed skill/template/release files.

**Commit:** `docs(p02-t03): repair route consumers and verify migration`.

## Phase 3: Improve the Evaluator README

### Task p03-t01: Write a concise adoption story and original visual

**Files:** `README.md`; new `assets/readme/adoption.svg`; project `references/readme-source-check.md`.

**Work:** Lead with value, three independent capability choices, one source-verified first success and canonical docs links; contributor setup last. Keep one diagram, replacing the existing layer diagram with an original theme-neutral accessible SVG and text equivalent. No inherited GitHub theme CSS, external resources, copied artwork, duplicate theme asset or mandatory dependency arrows. Do not recreate the catalog in README.

**Verify:** Non-author verifies commands against current CLI help/source and independence claims against capability contracts. Validate SVG XML; view desktop/narrow and light/dark backgrounds. Links reach canonical destinations; an evaluator can identify capability/next action before contributor instructions.

**Format:** `pnpm exec oxfmt --write README.md .oat/projects/shared/docs-improvement-overhaul/references/readme-source-check.md`; `git diff --check` for SVG, without adding a formatter.

**Commit:** `docs(p03-t01): clarify adoption with a concise visual README`.

### Task p03-t02: Review actual README consumption

**Files:** project `reviews/p03-readme-review.md`; bounded README/SVG corrections; release files only if shipped scope changes.

**Work:** Fable reviews content and visual. On an authorized published branch, use computer use to inspect the actual GitHub README in both GitHub themes and narrow layout. This plan is not push authorization. If publication is unavailable, local preview remains provisional and actual GitHub acceptance stays outstanding for final acceptance; never call local HTML a GitHub pass.

**Verify:** Record URL/commit, theme, viewport, screenshots and actions. Correct clipping/contrast/link defects. Run applicable README/link checks and shared closeout for actual scope; do not manufacture a package bump for root README alone.

**Format:** `pnpm exec oxfmt --write README.md .oat/projects/shared/docs-improvement-overhaul/reviews/p03-readme-review.md`; `git diff --check` for SVG.

**Commit:** `docs(p03-t02): verify README consumption and record review`.

## Phase 4: Build Complete Supported-Skill Discovery

### Task p04-t01: Define and review the guide mapping

**Files:** new `apps/oat-docs/skill-docs.json`; project `references/skill-mapping-review.md`. Canonical pack manifest and skills are read-only inputs.

**Work:** Import actual shipped membership; inventory all canonical directories. Map each eligible skill to family, page/anchor and applicability, accounting for excluded names with reasons. Recompute expected 71/83 split instead of hard-coding it. Required means existing active project mandatory; optional means supported project-aware behavior also works without one; none means no existing project needed, including creators. Conditional details stay explicit. Unknown-intent no-pack skills remain currently unshipped, not permanently internal. Review mapping before prose.

**Verify:** No missing/duplicate/phantom names. Root/Fable review eight review variants together, brainstorm under Skills, worktree/Cursor Cloud under Advanced, docs and agent-instructions chains together. Future anchors are declared pending, not falsely verified present.

**Format:** `pnpm exec oxfmt --write apps/oat-docs/skill-docs.json .oat/projects/shared/docs-improvement-overhaul/references/skill-mapping-review.md`.

**Commit:** `docs(p04-t01): define canonical skill guide ownership`.

### Task p04-t02: Independently audit every applicability claim

**Files:** project `references/skill-applicability-audit.md`; corrections to `apps/oat-docs/skill-docs.json`.

**Work:** A non-author reviewer checks every included skill against actual prerequisites/invocation behavior. Record name, applicability, conditional explanation, file:line evidence, source SHA and disposition. No sampling or lifecycle-name inference. Resolve contradictions before prose; no guessed badges. Bounded audit batches are allowed, but each reviewer must not have authored that batch's mapping.

**Verify:** Audit rows equal eligible mapping rows; citations exist; no unresolved claims. Explicit controls: entry skills creating projects, project-optional worktree bootstrap, ad-hoc review and docs chains.

**Format:** `pnpm exec oxfmt --write apps/oat-docs/skill-docs.json .oat/projects/shared/docs-improvement-overhaul/references/skill-applicability-audit.md`.

**Commit:** `docs(p04-t02): verify project applicability independently`.

### Task p04-t03: Author minimum useful family coverage

**Files:** owner pages from reviewed mapping under docs `skills/`, `workflows/`, `docs-tooling/`, `contributing/`; affected index Contents.

**Work:** Give every eligible skill a meaningful stable anchor, invocation, verified prerequisite and outcome/next step. Shared when-to-use context belongs once per family. Link to generated source descriptions instead of copying them everywhere. No empty-anchor coverage or whole SKILL.md duplication. This is an explicit substantial authoring task; file-disjoint family batches may be delegated, root integrates indexes.

**Verify:** All mapped anchors exist with minimum useful fields. Review every family against sources; examples promise no nonexistent flags. `pnpm docs:validate`; `pnpm build:docs`. Minimum guides remain subject to review even when p05 will deepen them.

**Format:** `pnpm --filter oat-docs docs:format`.

**Commit:** `docs(p04-t03): cover every supported skill at a canonical owner`.

### Task p04-t04: Generate and enforce the committed catalog

**Files:** new `tools/docs/{skill-catalog.ts,skill-catalog.test.ts}`; root/app package scripts; `apps/oat-docs/docs/skills/index.md`; mapping validation; authoring instructions; bundle/release files.

**Work:** Add generate/check commands. Generate real name/description/visibility plus curated family/applicability/owner into a committed marked Skills-index block, included in CLI bundles. Validate both mapping directions, exclusions, real anchors and stale output. Run check before nav generation in predev/prebuild; builds never silently rewrite committed catalog. Universal discovery is page-body content, not 71 sidebar entries. No public catalog CLI or skill prerequisite schema change.

**Verify:** `pnpm docs:skills:generate`; `pnpm docs:skills:check`; `pnpm docs:test`; `pnpm docs:validate`. Temporary source-description/mapping/anchor mutations must fail stale/missing/phantom checks without writes; restore and show valid pass. Offline bundle catalog matches source; nav metadata remains excluded. Shared closeout and Fable phase review.

**Format:** `pnpm exec oxfmt --write tools/docs apps/oat-docs/skill-docs.json apps/oat-docs/docs/skills/index.md package.json apps/oat-docs/package.json` plus exact instruction/release files.

**Commit:** `feat(p04-t04): enforce generated bundled skill discovery`.

## Phase 5: Fill Named Gaps and Accept the Rendered Site

### Task p05-t01: Deepen the named thin and missing guides

**Files:** mapped research/repository/wrap-up/project-state/skill-authoring owner pages; project `references/coverage-closeout.md`.

**Work:** Expand exactly: analyze, compare, deep-research, skeptic, synthesize; oat-repo-knowledge-index and oat-repo-maintainability-review with repo-improve next steps; oat-wrap-up; oat-project-open, oat-project-reconcile, oat-project-clear-active; create-agnostic-skill. Add source-verified scenarios, expected output, prerequisites, safe distinctions and next actions. Remove duplicate landing link walls only where catalog/owners replace them; preserve useful prose and Contents. No unlimited rewrite.

**Verify:** Closeout accounts for each named guide and independent source verification. `pnpm docs:skills:check`; `pnpm docs:validate`; `pnpm build:docs`. A reviewer answers each thin/missing-guide question without opening SKILL.md; open/reconcile/clear distinctions remain safe and accurate.

**Format:** `pnpm --filter oat-docs docs:format`; `pnpm exec oxfmt --write .oat/projects/shared/docs-improvement-overhaul/references/coverage-closeout.md`.

**Commit:** `docs(p05-t01): fill bounded skill guidance gaps`.

### Task p05-t02: Add four purposeful docs visual treatments

**Files:** migrated Getting Started quickstart, `provider-sync/manifest-and-drift.md`, `docs-tooling/workflows.md`, `workflows/ideas/lifecycle.md`, `contributing/markdown-features.md`; project `references/visual-source-check.md`.

**Work:** One treatment per question: first-success choice; canonical/provider ownership and drift; bootstrap/analyze/approval/apply; idea/backlog/project promotion. Use existing Mermaid support and replace competing illustrations rather than multiplying them. Add accessible labeling/text equivalents. Non-author verifies behavioral edges against source. Document source ownership and theme/narrow-layout expectations. No new renderer pipeline or unrelated lifecycle redraws.

**Verify:** Independent source citations for every behavioral edge, with optional/mandatory arrows distinguished. `pnpm build:docs`; local browser smoke waits for Mermaid hydration and checks readable diagrams, no clipping and useful text in both themes/narrow layouts. Scope remains four docs treatments plus the README illustration.

**Format:** `pnpm --filter oat-docs docs:format`; `pnpm exec oxfmt --write .oat/projects/shared/docs-improvement-overhaul/references/visual-source-check.md`.

**Commit:** `docs(p05-t02): illustrate four core reader journeys`.

### Task p05-t03: Execute independent final visual QA and release validation

**Files:** project `reviews/final-visual-qa.md`, durable screenshots/evidence and `references/final-validation.md`; bounded accepted fixes; bundle/release files.

**Work:** Independent reviewer, preferably Fable with verified browser access, actually operates the built site through computer-use controls. Verify browser/display host, server host, URL and SHA. Complete seven journeys: provider-sync-only install; project-free research; choose/start workflow; named reconcile lookup; docs bootstrap/maintenance; remote backlog planning; old-route absence with useful Home/search recovery. Use sidebar, search, links and anchors, not only direct navigation. Inspect all five visuals and actual GitHub README when publication is authorized.

**Acceptance:** Desktop and narrow/mobile, light/dark, keyboard focus/navigation, readable headings/diagrams, no unintended overflow/clipping, correct active navigation/breadcrumb/previous-next and page-error observations when exposed. Save screenshots and URL/SHA/viewport/theme/actions/expected/actual outcomes. Unsupported telemetry is explicitly unavailable, not zero errors. Crawls, source review and build success do not substitute. Missing browser or authorized GitHub access leaves that acceptance pending/blocked, not passed.

**Verify:** `pnpm docs:validate`; `pnpm docs:test`; `pnpm docs:skills:check`; local exported-site crawl; shared release gates and applicable lint/format. Reviewer records all seven journeys/five visuals, resolves high-impact defects and rechecks affected journeys. Final source/code review and configured implementation exit gate remain distinct. Append review fixes with new task IDs rather than hiding them in completed tasks or exceeding retries.

**Format:** `pnpm exec oxfmt --write .oat/projects/shared/docs-improvement-overhaul/reviews/final-visual-qa.md .oat/projects/shared/docs-improvement-overhaul/references/final-validation.md` plus exact accepted-fix/release files.

**Commit:** `docs(p05-t03): record independent visual acceptance and validation`.

## Reviews

| Scope  | Type     | Status   | Date       | Artifact                   | Reviewed Head | Invocation | Gate Target |
| ------ | -------- | -------- | ---------- | -------------------------- | ------------- | ---------- | ----------- |
| p01    | code     | pending  | -          | -                          | -             | -          | -           |
| p02    | code     | pending  | -          | -                          | -             | -          | -           |
| final  | code     | pending  | -          | -                          | -             | -          | -           |
| spec   | artifact | pending  | -          | -                          | -             | -          | -           |
| design | artifact | received | 2026-10-01 | reviews/fable-design-01.md | -             | manual     | -           |
| p03    | code     | pending  | -          | -                          | -             | -          | -           |
| p04    | code     | pending  | -          | -                          | -             | -          | -           |
| p05    | code     | pending  | -          | -                          | -             | -          | -           |
| plan   | artifact | pending  | -          | -                          | -             | -          | -           |

Preserved spec row is not applicable in quick mode; no spec.md required. Events are append-ordered and bound to artifact filenames; never overwrite a bound event with a different review. No code/browser review is claimed in planning.

## Implementation Complete

Planned scope only: zero implementation tasks complete.

- Phase 1: 3 tasks — enforce navigation and authoring contracts.
- Phase 2: 3 tasks — preserve information, migrate and repair consumers.
- Phase 3: 2 tasks — evaluator README and render review.
- Phase 4: 4 tasks — mapping, independent applicability audit, coverage and catalog.
- Phase 5: 3 tasks — named gaps, four docs visuals and final acceptance.

**Total: 15 tasks, 5 sequential phases.** First task is p01-t01 after separate implementation authorization and HiLL setup.

## References

- [Discovery](discovery.md)
- [Lightweight design](design.md)
- [IA/journeys](references/ia-consensus.md), with old-route compatibility explicitly superseded
- [Technical reconnaissance](references/planning-recon.md)
- [Skill inventory](references/skill-inventory-matrix.md)
- [Visual precedents](references/visual-precedents.md)
- [Fable approach review](references/fable-approach-review.md)
- [Fable design review](reviews/fable-design-01.md)
- [Orchestration log](references/orchestration-log.md)
