---
oat_status: complete
oat_ready_for: oat-project-implement
oat_blockers: []
oat_last_updated: 2026-10-02
oat_phase: plan
oat_phase_status: complete
oat_plan_parallel_groups: []
oat_plan_source: quick
oat_import_reference: null
oat_import_source_path: null
oat_import_provider: null
oat_generated: false
oat_template: false
oat_plan_hill_phases: ['p06']
oat_auto_review_at_hill_checkpoints: true
---

# Implementation Plan: docs-improvement-overhaul

**Goal:** Enforce reader-first navigation, cover every supported skill with concrete scenarios, improve the README and five bounded visual treatments, and make the whole site clear, helpful and compelling for onboarding developers and adoption decision-makers without losing documented content or capabilities.

**Architecture:** Contents determines membership/order; frontmatter determines owned labels. The shipped CLI generates ignored Fumadocs metadata with sidecar ownership tracking. A repo-specific script generates a committed, bundled skill catalog from canonical metadata and audited guide/applicability mappings. No aliases.

**Stack:** Existing TypeScript CLI, Fumadocs/Next static export, Markdown, Mermaid and one original theme-neutral SVG. No framework replacement or new visual pipeline.

**Authority:** The user invoked oat-project-implement after the reviewed planning handoff, authorizing execution with High dispatch and autonomous collaboration. During p01, Fable relayed the user's additions: phase 6 whole-site persona/editorial evaluation, universal skill scenarios, configuration choice guidance, and Codex/Fable consensus triage without waiting for the user. Publication and merge remain separate actions. Six separately mergeable phases do not imply automatic PR creation.

**Amendment boundary:** Review this amendment with Fable before p06 starts. Capture the conservation baseline in p02-t01 before any moves; apply the stronger scenario contract when p04 is authored. p01 scope is unchanged. Final independent visual QA moves from p05-t03 to p06-t05; intermediate smokes remain. Consensus cannot authorize removal or narrowing of documented content or capabilities. Such an item requires explicit user approval; otherwise keep it. Disagreement selects preserved content and the smaller rewrite, with both positions recorded.

## Planning Checklist

- [x] Quick mode, lightweight design and Fable draft-and-review selected.
- [x] High dispatch confirmed; reusable ladder complete.
- [x] Evaluate phase parallelism and preserve initial task IDs/review rows.
- [x] Leave implementation HiLL unset pending implementation-start confirmation.
- [x] Final independent computer-use QA; targeted implementer smoke after p01/p02.
- [x] Finish artifact review and configured quick-start exit gate.

## Parallelism and Reviews

### Main-foundation consolidation — authoritative execution override

Fetch/diff current origin/main at every phase start and before each PR. During p02 closeout, main1fd10d9ce exposed already-shipped Fumadocs navigation (#336/#338) and plain Markdown bootstrap (#335), absent from the implementation base98d1d5246. Codex accepts Fable's main-only recommendation: retire p01's duplicate compiler/sidecar/branch-only flags, preserve main's compiler, framework detection, committed metadata, check-mode/prebuild and real-loader tests, then regenerate metadata for the p02 tree. Do not hybridize compiler implementations. p01 is superseded foundation work, not a separate delivered feature; retain its history/evidence honestly. This override supersedes earlier ignored-metadata/source-only/sidecar prescriptions throughout this plan/design.

Keep p02 moves, title repairs, consumer fixes and app route/anchor checks that add value. App validators must use main's actual command contract and self-contained tests. Any retained p01-only behavior needs a named demonstrated reader/IA requirement, not automatic portability. Sidebar family cross-links are now supported; still cap them at family links rather than per-skill catalog entries. Main Markdown capabilities and their documentation are preserved, not silently removed during conflict resolution. Current public0.3.14 must remain above main0.3.13; bundled skill versions must exceed main after reconciliation. Re-run closure gates on the integrated state; earlier passing gates are historical, not proof of changed integration.

User-approved speed amendment (2026-10-02): retain phase/task IDs but execute dependency-ready tasks concurrently, not six serial whole-phase dispatches. Start p03 README prose and p04-t01 mapping in isolated Mini worktrees while p02 closes. After the mapping schema lands, build p04-t04 catalog tooling alongside file-disjoint p04-t03 family authoring. Merge p05-t01's twelve named deep guides into p04-t03: write their full depth once, and close p05-t01 by accounting for those deliverables rather than repeating authoring. Root owns shared indexes, integration, project artifacts and release/version changes. Browser control of each display remains exclusive.

Fable owns read-only, separately source-verified scratchpad drafts for the four p05-t02 Mermaid diagrams, the p03 SVG, configuration decision guidance, and a blind all-eligible-skill applicability audit. Codex owns mapping, guide authoring, catalog code, persona reviews and integration. Reconcile the blind table against the mapping mechanically for p04-t02; do not dispatch a duplicate audit or configuration author. Source verification of all skill examples and configuration claims remains mandatory.

Run the first source-blind persona reviews on the restructured built site immediately after the p01+p02 progress PR, rather than waiting for p05. If publication authorization is still pending after local p02 acceptance, start these read-only reviews against the frozen local export instead of making reader evaluation depend on a push. This is a sequencing adaptation only; no publication authority or final acceptance is implied. Existing dense-page editorial work and mandatory configuration guidance may proceed alongside skill authoring with disjoint page ownership. Final persona rerun, complete coverage-ledger close and independent browser QA still judge the finished site.

One native/Fable review round per phase, in parallel; re-review only Critical/High corrections. Medium/Low corrections receive targeted implementer verification and a recorded disposition. Do not add mid-phase approach/map/draft review loops absent a genuine unresolved decision. Wait only a few minutes for peer input, then choose the conservative scope-preserving action and record it; a peer draft signal does not prevent an authorized send.

Release units: first progress PR contains p01+p02; README can ride only if ready and must not delay it, otherwise a separate README PR. Skill coverage/catalog/deep guides/visuals/editorial work form the remaining combined PR, splitting phase 6 only if it materially delays delivery. Confirm push authorization with the user at the first PR-ready boundary without blocking independent local work. No merge or release authority is implied.

Run the full eight gates once at phase close, with targeted checks between corrections. Do not create new receipt or negative-control artifacts for docs-only edits: use link-normalized before/after conservation diffs and source verification. Guard-neutralization proof remains for validation/write-protection code. Existing immutable baseline evidence stays intact; do not expand references merely for bookkeeping.

Fable reviews design, plan and phase diffs. Built-in per-phase/final reviews remain required. Under the user's autonomous planning direction, optional additional cross-runtime phase gate remains unconfigured (documented non-interactive default); configured lifecycle gates remain enabled. These are separate from final visual QA. Artifact-review retry limit is two rewrites; configured quick-start gate retains two attempts. Exhaustion/operational failures are reported, never represented as passes.

Autonomous final checkpoint follows the last phase, now p06. p06-t03 is explicitly a Codex/Fable consensus checkpoint, not user HiLL. Optional earlier checkpoints remain absent. Preservation-removal decisions and publication authority remain separate boundaries. Current task completion is tracked in implementation.md, not reset by this amendment.

## Common Verification and Release Closeout

New script names below are deliverables: p01 creates `docs:validate` and `docs:test`, enrolling them in existing CI-gated check/test scripts. p04 creates `docs:skills:generate` and `docs:skills:check`. Source validation and real-consumer tests are the useful fresh-checkout guarantee; freshly generated output compared only with itself is not drift evidence.

**Fresh-checkout contract:** docs:validate is source-only: invoke the branch nav compiler with `--framework fumadocs --validate-only`, validate source-derived route/anchor targets and committed catalog parity, and never require or write ignored metadata, sidecar, .source or out. Output-comparing --check is a different mode. Export/crawl assertions run only after build. App tests generate all metadata/MDX inputs into temporary fixtures through the branch CLI and never consume app-level generated output; direct `pnpm docs:test` works without a prior docs build, even though root Turbo tests still build the app by policy.

Enrollment is phased: p01-p03 validate navigation and source routes only; p04 adds mapping validation and committed catalog parity as those artifacts land. Earlier phases must not require the not-yet-created mapping or catalog block.

Each release unit closes with canonical bundle regeneration, applicable skill metadata bumps and lockstep public versions in CLI, control-plane, docs-config, docs-theme and docs-transforms, including lockfile changes. Root coordinates these once per final PR diff, not per task or concurrent lane. Choose versions against current integration/main. README-only p03 needs no artificial package bump unless its actual diff touches shipped package/bundled content.

**All-phase conservation:** p02-t01 captures exact pre-move sources plus initial implementation-base provenance, accounting for p01 changes. Inventory the real registered CLI command tree/flags, supported configuration keys and shipped skills. For the pure move, content units are page/heading-keyed sections with hashes of normalized section text; normalization is limited to explicitly approved link/frontmatter changes, with router consolidations separately accounted for. Compare hashes at named new destinations, not a semantic fact-extraction gate over all 70 pages. Only pages whose pre-existing prose is rewritten or removed need a pre-edit fact ledger and non-author verification, created at edit time in p04/p05/p06 as applicable. Additive content retains mechanical preservation evidence plus source verification for new claims. Every baseline capability/content unit and changed-page fact finishes present at a named destination, retained unchanged, or explicitly removed with user approval. Additions are tracked too. This is one-time project evidence, not frozen-prose CI; permanent validators never read project artifacts. Undocumented CLI/config capabilities form explicit gaps, never permission to remove them from the baseline.

At phase closeout run the eight AGENTS gates in order: `pnpm check`; `pnpm type-check`; `pnpm test`; `pnpm build`; `pnpm run check:skill-bumps`; fetch `origin/main` then `pnpm release:check-versions`; `pnpm release:validate`; `pnpm build:docs`. Record each actual exit code. Also run `pnpm lint` and `pnpm format` when `.agents/skills` or `tools/smoke` changes. Distinguish cached logs from executed tests, using the documented isolated-HOME forced path when necessary. Surface unrelated failures without expanding scope.

Serve `apps/oat-docs/out` under `/open-agent-toolkit/`, with no SPA fallback masking missing routes. Run `pnpm docs:check-links --url <verified-local-base-url> --no-external --output <phase-report-path>`; URL/report values are discovered at execution, not fixed ports assumed now. Record built SHA, server command, execution/display host and actual URL. Never substitute an unverified deployed build.

### Executable Tooling Home and Enrollment

Repository-only scripts/tests live in `apps/oat-docs/scripts/` and `apps/oat-docs/tests/`, where Fumadocs dependencies resolve under pnpm. They are not published CLI functionality. Add app dev dependencies `tsx`, `oxlint` and Node types using the already installed workspace versions. Use Node's test runner via tsx, not undeclared Vitest. The public CLI tests remain in its existing Vitest suite.

In p01-t02, add these exact script values:

| Manifest | Key           | Value                                                                                                                                           |
| -------- | ------------- | ----------------------------------------------------------------------------------------------------------------------------------------------- |
| root     | docs:validate | `pnpm --filter oat-docs docs:validate`                                                                                                          |
| root     | docs:test     | `pnpm --filter oat-docs test`                                                                                                                   |
| app      | docs:validate | `tsx --tsconfig tsconfig.docs-tools.json scripts/validate.ts`                                                                                   |
| app      | test          | `tsx --tsconfig tsconfig.docs-tools.json --test tests/*.test.ts`                                                                                |
| app      | type-check    | `tsc --noEmit -p tsconfig.docs-tools.json`                                                                                                      |
| app      | check         | `oxlint scripts tests && oxfmt --check scripts tests && oxfmt --check 'docs/**/*.md' && markdownlint-cli2 'docs/**/*.md' && pnpm docs:validate` |

The app's new `test`, `type-check` and extended `check` enroll automatically through existing root `turbo run test/type-check/check`; preserve those root strings and root `lint`/`lint:fix` verbatim. Turbo tests depend on each package's build, so root tests also run docs prebuild; stale committed catalog output can correctly fail both root check and root test. Preserve the existing `@open-agent-toolkit/cli: workspace:*` devDependency in the docs app (already present at package.json:28) and verify its transitive build/hash edge covers CLI nav and pack-manifest source changes. Do not add a redundant dependency or assume the edge works without a cache probe. If the actual graph omits a read input, add its narrowly scoped source/import closure to Turbo task inputs or globalDependencies and document why.

Explicit cost decision: preserve Turbo's existing test→own-build dependency. Root `pnpm test` will execute the full docs `next build`/static export, not only prebuild, before app tests. Accept that added CI time and failure surface to exercise the real build; do not add an oat-docs test override in this project. Root `pnpm build` still excludes docs, and the final build:docs gate remains required even if cached. Record the graph in p01-t02 cache acceptance.

`tsconfig.docs-tools.json` explicitly includes scripts/tests, excludes generated Next output/node_modules, uses Node types and aliases for app-local helpers and the repository pack-manifest source. Add exact `@oat-repo/pack-manifest` and `@shared/types` source aliases, not broad parent-relative/catch-all imports. Verify the full closure: pack-manifest's local `./types` also imports `@shared/types`, whose own `zod` import resolves from the CLI package. Type-check the actual closure rather than asserting two aliases alone prove correctness. Exclude scripts/tests from the main Next tsconfig so the two programs do not apply incompatible aliases. Unit tests use package-local Fumadocs; CLI integration invokes the branch CLI through a subprocess. No Fumadocs dependency is added at root.

In p04-t01, root `docs:skills:validate` forwards to `pnpm --filter oat-docs docs:skills:validate`; app value is `tsx --tsconfig tsconfig.docs-tools.json scripts/skill-mapping.ts`. In p04-t04, root generate/check wrappers forward to the same app names; app values are `tsx --tsconfig tsconfig.docs-tools.json scripts/skill-catalog.ts --write` and `tsx --tsconfig tsconfig.docs-tools.json scripts/skill-catalog.ts --check`. Final docs:validate invokes strict mapping validation (no pending flag) and catalog check. Prebuild order remains catalog check, nav generation, fumadocs-mdx, agent index. Tests cover Markdown escaping in generated catalog cells.

## Phase 1: Make the Current Sidebar Enforceable

### Task p01-t01: Compile safe Fumadocs metadata

**Files:** `packages/cli/src/commands/docs/nav/{index,contents,sync}.ts`; new `fumadocs.ts`, `fumadocs.test.ts` and an ownership helper if needed; existing `sync.test.ts`.

**Work:** Add explicit framework/check options and mutually exclusive Fumadocs-only --validate-only (source diagnostics, no output dependency/comparison/write), preserving MkDocs default/YAML behavior. Distinguish local leaf/child/index ownership from cross-links. Use leaf/index titles with label mismatch checks, exact landing handling, orphan/duplicate/missing-target/fragment checks and fenced-example exclusion. Bound supported syntax as design specifies. Implement ignored sidecar path/hash ownership, refusal for unowned/externally edited files, exact stale cleanup and traversal/symlink protection. Prevalidate before writes; check mode never mutates. Do not invent a navigation DSL or infer custom loader configuration.

**Verify:** Read `deliberate-testing`. Run `pnpm --filter @open-agent-toolkit/cli exec vitest run src/commands/docs/nav/sync.test.ts src/commands/docs/nav/fumadocs.test.ts`. Include real Contents provenance, valid/invalid ownership controls, authored bytes preserved, stale-output check failure without writes, deterministic repeat and prevalidation failure with no writes. Neutralize the write-protection guard to prove its key test fails, then restore it. Record exit and executed test count.

**Format:** `pnpm exec oxfmt --write packages/cli/src/commands/docs/nav`.

**Commit:** `feat(p01-t01): compile owned Fumadocs navigation from Contents`.

### Task p01-t02: Integrate the real loader and first build

**Files:** `apps/oat-docs/package.json`, app/root ignore rules; `.oat/templates/docs-app-fuma/{package.json.template,.gitignore}`; `packages/cli/src/commands/docs/init/{scaffold.ts,scaffold.test.ts,integration.test.ts}`; `packages/cli/scripts/{bundle-inputs.mjs,bundle-assets.sh}`; root `package.json`; new `apps/oat-docs/scripts/validate.ts`, `apps/oat-docs/tests/navigation.test.ts`, `apps/oat-docs/tsconfig.docs-tools.json`; affected current Contents/title files.

**Work:** First repair all current Contents/title mismatches and missing physical-parent ownership entries, preserving route order, headings and substantive prose; do not assume the earlier four-item sample was exhaustive. Then generate nav before fumadocs-mdx in app and scaffold. Ignore/exclude metadata and sidecar from Git and source bundles. Add CI-enrolled docs validation/tests. Exercise generated metadata through real installed Fumadocs/MDX consumers, not only invented expected objects. Verify order, titles, root/child landing once, native canonical ownership, breadcrumbs and previous/next even when Skills precedes Workflows. Unsafe synthetic cross-links stay in body navigation rather than prompting an unreviewed loader patch. First scaffold build must work without a second generation pass.

The two prebuild command strings intentionally differ: this repository invokes the branch workspace `cli:source` entry; `.oat/templates/docs-app-fuma/package.json.template` invokes the installed `oat docs nav sync --framework fumadocs` binary with its scaffold-relative target. Never copy this repository's workspace script into a consumer scaffold. Verify the generated consumer app outside the OAT workspace.

**Verify:** `pnpm docs:test`; `pnpm docs:validate`; `pnpm --filter @open-agent-toolkit/cli exec vitest run src/commands/docs/init/scaffold.test.ts src/commands/docs/init/integration.test.ts`; `pnpm build:docs`. Add a pristine-checkout control with no meta.json, sidecar, .source or out: after upstream dependencies are available, app check and direct docs:test pass and do not create app build output. Test invalid sources independently of output parity; use stale/missing output for meaningful check-mode tests. Verify bundled Markdown remains present and build-only metadata is absent.

**Format:** `pnpm exec oxfmt --write apps/oat-docs/package.json package.json apps/oat-docs/scripts apps/oat-docs/tests apps/oat-docs/tsconfig.docs-tools.json apps/oat-docs/tsconfig.json 'apps/oat-docs/docs/**/*.md' packages/cli/src/commands/docs/init packages/cli/scripts/bundle-inputs.mjs`; format modified JSON templates using the supported formatter and use `git diff --check` for shell/ignore files. Never recursively format the docs directory: ignored generated metadata is byte-owned by the nav compiler.

**Commit:** `feat(p01-t02): enforce navigation at real consumer boundaries`.

**Cache acceptance:** In a disposable validation worktree, warm app check/test caches; change the CLI nav compiler input and verify the app task hashes change/cache-miss before restoring it. Record Turbo graph/hash evidence and actual execution, not cached green logs. Include `turbo.json` in this task's file scope only if the existing workspace dependency edge proves insufficient.

### Task p01-t03: Align authoring instructions and verify foundation

**Files:** `apps/oat-docs/AGENTS.md`; docs `reference/docs-index-contract.md`, `docs-tooling/commands.md`, `contributing/documentation.md`, affected indexes/titles; nav guidance in `.agents/skills/oat-docs-{bootstrap,apply,analyze,authoring}/`; docs scaffold package/guidance templates where relevant; release closeout files.

**Work:** Search and update all nav-command consumers, especially bootstrap/apply, docs-index contract, app instructions and Fumadocs/MkDocs scaffold distinctions. Confirm the minimal source repairs from p01-t02; do not defer a prerequisite repair to this task. Keep current root Contents order (including temporary User Guide prominence) until p02. Document generation authority, explicit framework, refusal/recovery, unsupported syntax and checks. No substantive rewrite.

**Verify:** `pnpm docs:validate`; `pnpm docs:test`; implementer computer-use smoke for current ordering/labels, landings, breadcrumb/previous-next, family links and basePath once. Save `reviews/p01-browser-smoke.md` with screenshots/actions. Shared release closeout and Fable phase-diff review. No full independent browser tour yet.

**Format:** `pnpm exec oxfmt --write apps/oat-docs/AGENTS.md 'apps/oat-docs/docs/**/*.md' .agents/skills/oat-docs-bootstrap .agents/skills/oat-docs-apply .agents/skills/oat-docs-analyze .agents/skills/oat-docs-authoring`; additionally format exact changed template/release files. Exclude generated metadata and ownership sidecars.

**Commit:** `docs(p01-t03): align navigation contracts and verify foundation`.

## Phase 2: Migrate Information Without Rewriting It

### Task p02-t01: Review the complete migration map

**Execution:** Complete at `e790323680d35085f7b724862bb507c36e163d46`; actual peer approval, non-author conservation proof and intrinsic analysis review accepted. Implementation ledger remains progress authority.

**Files:** project `references/route-migration.json`, `references/migration-review.md`, `references/capability-baseline.json`, `references/content-baseline.md`; analysis artifact resolved by `oat-docs-analyze`; reusable path checks in `apps/oat-docs/scripts/validate.ts` and `apps/oat-docs/tests/migration.test.ts`.

**Work:** Run bounded docs analysis on the actual app and tie approved recommendations to this plan; do not claim earlier recon was a formal analyze run. Use the repository-canonical `.agents/skills/oat-docs-analyze/SKILL.md` and later apply skill changed in p01, loaded explicitly; do not rely on a stale installed user-scope copy. At an exact baseline SHA, inventory every page, heading, asset, source/hosted link and live consumer. Account for the initial 70 pages or explain baseline drift. Declare exact destinations and section-level accounting for consolidated router indexes. Fable reviews the map before moves. Normalization permits only identified link/frontmatter/router changes, not arbitrary paragraph stripping.

Capture the all-phase conservation baseline now, not retrospectively after p05. Record CLI commands, aliases and flags from the real registered command tree without executing operational actions; configuration keys/defaults from supported schemas/loaders with source provenance; eligible skills from real pack membership; every page/heading-keyed section and normalized-text hash. Preserve original implementation-base evidence and explain p01 additions/normalizations. A non-author checks the normalization rules and explicit router accounting; no whole-site distinct-fact extraction is required before this pure move. Initial CLI/config coverage gaps stay explicit for p06. The per-page map gives every section unit a destination; equal normalized hashes prove prose preservation. Later prose rewrites/removals first create a changed-page pre-edit fact ledger with non-author verification.

**Destination rules:** quickstart/bootstrap/tool-packs/concepts → Getting Started; existing Skills plus repository analysis → top-level Skills; configuration/local state and artifact/state contracts → Reference; project-log → Workflows Projects execution; backlog/remote planning → Workflows Backlog and planning; waves → Workflows Waves; Projects → lifecycle plus planning/execution/reviews/closeout; dispatch/autonomy/Cursor Cloud/programmatic execution/orchestration/evidence-layers/gates → Advanced. Preserve Provider Sync, Docs Tooling and Contributing owners. Per-page map resolves all filenames before moving. Confirm repo-analysis.md is repo-wide PR-comment analysis rather than a knowledge-index guide; place its actual capability deliberately, not by the ambiguous filename.

**Reviewed map amendment:** Fable approves the destinations and three route-only supersessions subject to R1/R2 in `references/fable-p02-map-review.md`. Consolidate CLI Utilities as a router with exact per-item/section destinations and a new Getting Started introduction; do not relabel the CLI-lane prose as onboarding. Individually inventory H1/anchor normalization for repurposed Home, Projects and Choose a Workflow, keeping headings aligned with titles and authored consumers accounted. This is not general heading-change authority. Add prominent Projects body links to Reference artifact/state contracts. Optional Waves promotion and dispatch filename changes are deferred; all other mapped destinations remain unchanged.

**Verify:** Every baseline page has one destination or explicit router-consolidation accounting; every substantive section survives. Independent review checks normalization. Preservation checks are phase-local baseline comparisons, not permanent frozen-prose CI rules that would block p05 authoring. Reusable path checks remain in CI.

**Permanent check inputs:** At check-time read only live source docs/frontmatter, canonical skill sources/topic tables, committed app skill mapping/catalog and README links. Assert Contents targets, anchors and source-derived canonical route targets resolve without generated output. After build, separately compare/crawl actual export routes. CI must never read `.oat/projects/**`, the migration map, archived artifacts or a baseline SHA. Old-route absence and preservation remain one-time migration evidence. In a disposable checkout with the project directory and all ignored docs output absent, install dependencies/build upstream dependencies and prove `pnpm --filter oat-docs check` passes without generating docs output.

`tests/migration.test.ts` uses self-contained temporary fixtures to exercise reusable source-path validation; it never reads project `references/route-migration.json`. Mapping/catalog checks join the permanent validator only in p04.

**Format:** `pnpm exec oxfmt --write .oat/projects/shared/docs-improvement-overhaul/references/route-migration.json .oat/projects/shared/docs-improvement-overhaul/references/migration-review.md apps/oat-docs/scripts apps/oat-docs/tests` and the resolved analysis artifact.

**Commit:** `docs(p02-t01): inventory and approve the information migration`.

### Task p02-t02: Apply the preservation-only move

**Execution:** Complete at `7f824c2276fe53d8e544842cddb6d2c268cc2aa0`; scoped conservation, executed build/export/search and bounded Mini author smoke accepted. Final independent QA and phase closeout remain separate.

**Files:** `apps/oat-docs/docs/**` per approved map; `apps/oat-docs/app/not-found.tsx` if no useful existing not-found owner exists; mechanically regenerated `apps/oat-docs/index.md` and `packages/cli/assets/public-package-versions.json` from the required build; phase-local apply/conservation evidence. Consumer and bundle closeout remains p02-t03.

**Work:** Execute the required repository-canonical oat-docs-apply workflow for approved recommendations, exact evidence, tracking, nav regeneration and verification. Deliberate project integration adaptation: reuse the implementation-authorized project/phase branch instead of its generic create-branch step; record that adaptation before applying, and do not silently spawn another branch. This plan's approval at implementation entry must cover that adaptation; planning itself creates no branch. Add real section directories/indexes; preserve leaf headings and substantive prose except authorized normalization. Consolidate obsolete routers with recorded accounting. No aliases, redirects or transitional stubs. Add small Home/search recovery affordances for missing routes, not new search machinery.

**Branch CLI:** From repo root, use `pnpm run cli:source -- docs nav sync --framework fumadocs --target-dir apps/oat-docs` (or the new app prebuild that invokes it), never released bare `oat` for the new nav capability. Record this alongside the apply branch adaptation. Agent-index regeneration likewise uses the branch command `pnpm run cli:source -- docs generate-index --docs-dir apps/oat-docs/docs --output apps/oat-docs/index.md`.

**Verify:** Compare actual baseline/new content and explicit index accounting. `pnpm docs:validate`; `pnpm build:docs`; exported routes match the map, moved old routes are absent, canonical destinations exist. Browser smoke checks new hierarchy and a moved leaf; search no longer indexes removed pages.

**Approved formatter-boundary amendment:** Preserve the original map/baseline hashes. The required formatter changes only the existing Command Groups table in `reference/cli-reference.md`: 15 inventoried third-column outer-space spans and one delimiter dash-run width. Non-author review `reviews/p02-table-formatting-proposal-review.md` approves the proposal; Fable's message-only no-objection is qualified in `references/fable-p02-table-format-review.md`. Append-only exact-span evidence and a narrowly guarded comparison may restore only these spans to before bytes for the original hash check; raw cell payloads, real table AST/topology/alignment, syntax, newlines and all other bytes stay protected. No general trim/whitespace or whole-unit formatter normalization. Verify guarded positive/negative controls and an isolated capable unlisted-edge guard-neutralization control before t02 commit; independent payload guards remain active. Original strict failure remains evidence; no content/capability removal is authorized.

**Format:** `pnpm --filter oat-docs docs:format`; `pnpm exec oxfmt --write apps/oat-docs/app/not-found.tsx` if edited.

**Commit:** `docs(p02-t02): migrate pages into reader-first sections`.

### Task p02-t03: Repair consumers and verify migrated journeys

**Execution:** Complete at `3f0c0b0bff06667a2745b492873f9ff69546aa92`; task proof accepted, phase gates and independent reviews pending.

**Mechanical consumer amendment:** Five existing CLI test consumers (nav Fumadocs, init post-implement/retro contracts, release Git support and validation skills) required literal moved-file/Home Contents updates. Root accepted these directly derived migration consumers; assertions and production compiler behavior are unchanged. Exact occurrences are inventoried in p02-t03-consumers.json.

**Reviewed correction amendment:** Native review M1 and Fable B2 require six literal inline-code guide citations repaired, plus project-free validation of unambiguous relative Markdown code paths and reader-facing link conventions. Shared actual-parser extraction may be added narrowly to the existing nav Markdown helper; no compiler behavior or new dependencies. Fable B3 and Codex consensus advance only six p02-added router sections from later duplicate cleanup: remove five redundant bullet sections, consolidate Reference General CLI Adoption Guidance while preserving its anchor, standalone CLI adoption claim and concrete routing. Preserve all doctor/remote planning safety guidance. Non-author pre-edit fact evidence and exact keepers are in references/changed-page-facts.md; append per-item outcomes after edits. Immutable original move/baseline checks remain strict and historical; semantic dispositions replace only the affected redundant-router acceptance, not protected prose checks. Reorder Getting Started Contents Quickstart, Core Concepts, CLI Bootstrap, Tool Packs. No general editorial rewrite or capability removal authorized.

**Files:** root/public package READMEs; `.agents/skills/oat-docs/SKILL.md`, `oat-doctor/SKILL.md`, `docs-completed-projects-gap-review/SKILL.md`, `subagent-orchestration/references/provider-cursor.md` under the skill root; other inventoried live consumers/templates; `apps/oat-docs/scripts/validate.ts`; generated agent index, bundles and release files.

**Work:** Repair source/hosted consumers, including the already stale oat-docs topic map. Add executable topic-map target validation and a mechanical mapping of all hosted docs targets in the five READMEs to exported routes (baseline 17 targets; account for drift). Regenerate indexes/bundles from canonical sources. Do not rewrite archived historical evidence just because it mentions an old route. Clearly report intentional URL breakage, including links in already-published npm READMEs that remain stale until a new package release.

**Verify:** `pnpm docs:validate`; `pnpm docs:test`; local export link crawl. Computer-use smoke: seven primary sections, choose-workflow, Skills canonical owner, an updated README link, and old-route Home/search recovery. Save `reviews/p02-browser-smoke.md`, preservation and link reports. Shared closeout plus Fable phase review.

**Format:** `pnpm exec oxfmt --write README.md packages/cli/README.md packages/docs-config/README.md packages/docs-theme/README.md packages/docs-transforms/README.md apps/oat-docs/scripts apps/oat-docs/tests` and exact changed skill/template/release files. Regenerate the app-root index; never post-format generated output separately from its generator.

**Commit:** `docs(p02-t03): repair route consumers and verify migration`.

## Phase 3: Improve the Evaluator README

### Task p03-t01: Write a concise adoption story and original visual

**Files:** `README.md`; new `.github/assets/readme/adoption.svg`; project `references/readme-source-check.md`.

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

Paths named in p04/p05 express the agreed destination intent. Resolve and recheck them against the approved p02 map before each phase; update task file lists if the approved map differs. Runtime/permanent checks consume the resulting durable app files, not the project map.

### Task p04-t01: Define and review the guide mapping

**Files:** new `apps/oat-docs/skill-docs.json`, `apps/oat-docs/scripts/skill-mapping.ts`, `apps/oat-docs/tests/skill-mapping.test.ts`, app/root package scripts; project `references/skill-mapping-review.md`. Canonical pack manifest and skills are read-only inputs.

**Work:** Import actual shipped membership; inventory all canonical directories. Map each eligible skill to family, page/anchor and applicability, accounting for excluded names with reasons. Recompute expected 71/83 split instead of hard-coding it. Required means existing active project mandatory; optional means supported project-aware behavior also works without one; none means no existing project needed, including creators. Conditional details stay explicit. Unknown-intent no-pack skills remain currently unshipped, not permanently internal. Add `docs:skills:validate` now: two-way inventory, exclusion/schema and anchor validation, with explicit `--allow-pending-anchors` for this task and the independent audit only. Missing/phantom names, malformed entries and duplicate ownership always fail; only not-yet-authored anchors may be pending. Review mapping before prose.

**Verify:** No missing/duplicate/phantom names. Root/Fable review eight review variants together, brainstorm under Skills, worktree/Cursor Cloud under Advanced, docs and agent-instructions chains together. Run `pnpm docs:skills:validate --allow-pending-anchors` and `pnpm docs:test`. Future anchors are declared pending, not falsely verified present. Temporary missing/phantom mapping controls must fail even with that flag.

**Format:** `pnpm exec oxfmt --write apps/oat-docs/skill-docs.json .oat/projects/shared/docs-improvement-overhaul/references/skill-mapping-review.md`.

**Commit:** `docs(p04-t01): define canonical skill guide ownership`.

**Cache acceptance:** After warming app checks/tests, change a real pack-manifest eligibility entry in a disposable validation worktree. Confirm app cache invalidation and the mapping check rejects the stale inventory; restore the input and show valid pass. Capture the actual import closure and hash evidence. If needed, narrowly update Turbo inputs; do not rely solely on existing globalDependencies. Format new scripts/tests and changed package/Turbo configs with `pnpm exec oxfmt --write apps/oat-docs/scripts apps/oat-docs/tests apps/oat-docs/package.json package.json turbo.json`.

### Task p04-t02: Independently audit every applicability claim

**Files:** project `references/skill-applicability-audit.md`; corrections to `apps/oat-docs/skill-docs.json`.

**Work:** A non-author reviewer checks every included skill against actual prerequisites/invocation behavior. Record name, applicability, conditional explanation, file:line evidence, source SHA and disposition. No sampling or lifecycle-name inference. Resolve contradictions before prose; no guessed badges. Bounded audit batches are allowed, but each reviewer must not have authored that batch's mapping.

**Verify:** Run `pnpm docs:skills:validate --allow-pending-anchors` and reconcile audit rows mechanically with eligible mapping rows; citations exist; no unresolved claims. Explicit controls: entry skills creating projects, project-optional worktree bootstrap, ad-hoc review and docs chains.

**Format:** `pnpm exec oxfmt --write apps/oat-docs/skill-docs.json .oat/projects/shared/docs-improvement-overhaul/references/skill-applicability-audit.md`.

**Commit:** `docs(p04-t02): verify project applicability independently`.

### Task p04-t03: Author minimum useful family coverage

**Files:** owner pages from reviewed mapping under docs `skills/`, `workflows/`, `docs-tooling/`, `contributing/`; affected index Contents; existing `apps/oat-docs/scripts/skill-mapping.ts` and `apps/oat-docs/tests/skill-mapping.test.ts`; project `references/skill-scenario-audit.md` and `references/changed-page-facts.md` for any rewritten/removed existing prose.

**Work:** Give every eligible skill a meaningful stable anchor, invocation, verified prerequisite, concrete example scenario/use case and outcome/next step. A scenario states a realistic situation and what this skill does for it, not just a command or paraphrased description. Use the consistent `**Example scenario:**` marker inside every mapped anchor section. A shared family scenario must name which variant applies and why, with each anchor's scenario marker linking to that explanation. Add example invocations for arguments, modes or non-obvious phrasing; near-identical variants may share an example only with explicit variant selection. Shared when-to-use context belongs once per family. Link to generated source descriptions instead of copying them everywhere. No empty-anchor coverage or whole SKILL.md duplication. This is an explicit substantial authoring task; file-disjoint family batches may be delegated, root integrates indexes.

Before rewriting or removing existing prose, capture that page's pre-edit facts in changed-page-facts.md and obtain non-author verification. New/additive guides do not require whole-site semantic extraction; keep existing protected sections and verify new claims/examples.

**Verify:** Run `pnpm docs:skills:validate` without the pending flag; all mapped anchors exist with minimum useful fields and a scenario marker inside the correct section, not elsewhere on the page. Add this marker check and self-contained missing/wrong-section controls to the p04 validator/tests, executed through `pnpm docs:test`. A non-author verifies every scenario/example invocation against SKILL.md and records file:line evidence in `references/skill-scenario-audit.md`; markers alone cannot prove usefulness or accuracy. Examples promise no nonexistent flags/behaviors. `pnpm docs:validate`; `pnpm build:docs`. Minimum guides remain subject to review even when p05 will deepen them.

**Format:** `pnpm --filter oat-docs docs:format`; `pnpm exec oxfmt --write apps/oat-docs/scripts/skill-mapping.ts apps/oat-docs/tests/skill-mapping.test.ts .oat/projects/shared/docs-improvement-overhaul/references/skill-scenario-audit.md`.

**Commit:** `docs(p04-t03): cover every supported skill at a canonical owner`.

### Task p04-t04: Generate and enforce the committed catalog

**Files:** new `apps/oat-docs/scripts/skill-catalog.ts` and `apps/oat-docs/tests/skill-catalog.test.ts`; root/app package scripts; `apps/oat-docs/docs/skills/index.md`; mapping validation; authoring instructions; bundle/release files.

**Work:** Add generate/check commands. Generate real name/description/visibility plus curated family/applicability/owner into a committed marked Skills-index block, included in CLI bundles. Validate both mapping directions, exclusions, real anchors and stale output. Run check before nav generation in predev/prebuild; builds never silently rewrite committed catalog. Universal discovery is page-body content, not 71 sidebar entries. No public catalog CLI or skill prerequisite schema change.

**Verify:** `pnpm docs:skills:generate`; `pnpm docs:skills:check`; `pnpm docs:test`; `pnpm docs:validate`. Temporary source-description/mapping/anchor mutations must fail stale/missing/phantom checks without writes; restore and show valid pass. Offline bundle catalog matches source; nav metadata remains excluded. Shared closeout and Fable phase review.

**Format:** `pnpm exec oxfmt --write apps/oat-docs/scripts apps/oat-docs/tests apps/oat-docs/skill-docs.json apps/oat-docs/docs/skills/index.md package.json apps/oat-docs/package.json` plus exact instruction/release files.

**Commit:** `feat(p04-t04): enforce generated bundled skill discovery`.

## Phase 5: Fill Named Gaps and Verify the Rendered Site

### Task p05-t01: Deepen the named thin and missing guides

**Files:** mapped research/repository/wrap-up/project-state/skill-authoring owner pages; project `references/coverage-closeout.md` and `references/changed-page-facts.md`.

**Work:** Expand exactly: analyze, compare, deep-research, skeptic, synthesize; oat-repo-knowledge-index and oat-repo-maintainability-review with repo-improve next steps; oat-wrap-up; oat-project-open, oat-project-reconcile, oat-project-clear-active; create-agnostic-skill. Add source-verified scenarios, expected output, prerequisites, safe distinctions and next actions. Remove duplicate landing link walls only where catalog/owners replace them; preserve useful prose and Contents. No unlimited rewrite.

Capture pre-edit fact ledgers only for pages whose existing prose is rewritten/removed, including link-wall removals; a non-author verifies preserved facts and the explicit duplicate/link accounting. Pure additions keep the baseline's mechanical conservation evidence.

**Verify:** Closeout accounts for each named guide and independent source verification. `pnpm docs:skills:check`; `pnpm docs:validate`; `pnpm build:docs`. A reviewer answers each thin/missing-guide question without opening SKILL.md; open/reconcile/clear distinctions remain safe and accurate.

**Format:** `pnpm --filter oat-docs docs:format`; `pnpm exec oxfmt --write .oat/projects/shared/docs-improvement-overhaul/references/coverage-closeout.md`.

**Commit:** `docs(p05-t01): fill bounded skill guidance gaps`.

### Task p05-t02: Add four purposeful docs visual treatments

**Files:** migrated Getting Started concepts page (`getting-started/concepts.md`), `provider-sync/manifest-and-drift.md`, `docs-tooling/workflows.md`, `workflows/ideas/lifecycle.md`, `contributing/markdown-features.md`; project `references/visual-source-check.md`.

**Work:** One treatment per question: first-success choice; canonical/provider ownership and drift; bootstrap/analyze/approval/apply; idea/backlog/project promotion. Rework the existing adoption diagram from guide/concepts.md in its migrated concepts page; the other three named pages get new diagrams. Quickstart gets a clear link to concepts rather than a duplicate illustration. Use existing Mermaid support. Add accessible labeling/text equivalents. Non-author verifies behavioral edges against source. Document source ownership and theme/narrow-layout expectations. No new renderer pipeline or unrelated lifecycle redraws.

**Verify:** Independent source citations for every behavioral edge, with optional/mandatory arrows distinguished. `pnpm build:docs`; local browser smoke waits for Mermaid hydration and checks readable diagrams, no clipping and useful text in both themes/narrow layouts. Scope remains four docs treatments plus the README illustration.

**Format:** `pnpm --filter oat-docs docs:format`; `pnpm exec oxfmt --write .oat/projects/shared/docs-improvement-overhaul/references/visual-source-check.md`.

**Commit:** `docs(p05-t02): illustrate four core reader journeys`.

### Task p05-t03: Verify phase visuals and release readiness

**Files:** project `reviews/p05-browser-smoke.md`, durable screenshots/evidence and phase validation record; bounded accepted fixes; bundle/release files.

**Work:** Implementer performs a focused Mini-display smoke of the four docs visual treatments and affected guides after hydration, with desktop/narrow layouts and both themes. Verify host, URL and build provenance. Final independent seven-journey acceptance is deliberately deferred to p06-t05 after editorial changes, not performed twice or claimed complete here.

**Acceptance:** Readable hydrated diagrams and adjacent text, no clipping, canonical links and honest screenshot/action evidence. Unsupported telemetry is unavailable, not zero errors. This phase smoke is not independent final acceptance.

**Verify:** `pnpm docs:validate`; `pnpm docs:test`; `pnpm docs:skills:check`; local exported-site crawl; shared release gates and applicable lint/format. Fable phase diff and native independent code review remain required. Preserve conservation accounting for changed guides and diagrams.

**Format:** Exact phase evidence and accepted-fix/release files; docs Markdown only, never generated metadata.

**Commit:** `docs(p05-t03): verify phase visuals and release readiness`.

## Phase 6: Evaluate and Improve the Whole Reader Experience

### Task p06-t01: Reconcile whole-site coverage and capabilities

**Files:** project `references/capability-baseline.json`, `references/content-baseline.md`, new `references/whole-site-coverage.md` and `references/config-choice-map.md`; no automatic content removals.

**Work:** Reconcile the p02 pre-move section hashes/capability baseline and changed-page fact ledgers against the post-p05 site and README. Re-derive CLI/config/skill surfaces from the then-current branch tree as well as the recorded baseline, so later changes cannot disappear from coverage accounting. Account for every CLI command/flag, supported config key, shipped skill, protected section and changed-page fact by canonical destination. Report undocumented/thin CLI/config/general guidance as named gaps with evidence. Inventory meaningful configuration alternatives: workflow modes/HiLL, dispatch tiers, provider enablement/scope, instruction sync, gates, docs framework, remote PJM bindings, tool-pack selection/scope, and local/shared/user configuration. Resolve actual owner pages from the migration map. Optional permanent CLI-reference completeness checks require a bounded named test design, not automatic scope expansion.

**Verify:** Non-author review of ledger extraction/reconciliation, exact baseline SHA/provenance, no missing or silently narrowed baseline items. Mark uncertain semantic mappings unresolved rather than claiming mechanical proof. Project evidence remains outside permanent CI inputs.

**Commit:** `docs(p06-t01): reconcile whole-site coverage and configuration choices`.

### Task p06-t02: Run two fresh reader-persona reviews

**Files:** project `reviews/persona-developer-01.md` and `reviews/persona-adoption-01.md` with reader-visible evidence/screenshots.

**Work:** Dispatch two fresh-context, non-author reviewers: a junior-to-mid developer onboarding to OAT, and an Engineering Manager/Tech Lead evaluating adoption. Prefer different qualifying models within the configured policy when available; disclose actual route and any same-model fallback. Reviewers see only rendered site and root README, not source, SKILL.md or project/design artifacts. Give concrete tasks: explain OAT and first success, pick a skill from a realistic scenario, choose configurations and tradeoffs; adoption lens also assesses independent adoption, workflow/team fit, governance/cost and credible limitations. They navigate actual visible pages/links/search, not a source-only audit. Serialize control of the same display.

Prefer a fresh reviewer session with its actual working directory outside the repository, given only the served URL, reader-facing README link and persona tasks. If the native host cannot bind a separate session cwd, forbid source/repository reads and disclose that source-blindness is instruction-enforced rather than claiming structural isolation. Do not supply author/project explanations to compensate for unclear pages.

**Verify:** Each reports where they got lost, undefined jargon, missing why, unsupported/unconvincing claims, and explicit clear/well-written/helpful/compelling verdicts, with page/anchor, short quoted evidence, actions and expected/actual outcomes. Record browser/build provenance and source-blindness limits. Do not prime them with author explanations or count the author's own tour as a persona review.

**Commit:** `docs(p06-t02): record onboarding and adoption persona evaluations`.

### Task p06-t03: Converge on a bounded editorial list

**Files:** project `references/editorial-consensus.md` and exact approved page/task list; evidence links to persona findings and coverage gaps.

**Mandatory carried editorial residues:** Review and correct Quickstart's remaining CLI Utilities path section and the Contents heading retained on the Choose a Workflow leaf. Fable's p02 review identifies these as phase 6 clarity work, not permission to rewrite frozen prose during migration. Optional Waves one-leaf navigation and dispatch filename alignment may be evaluated in this bounded consensus.

**Work:** Codex proposes priorities and named edits; Fable challenges evidence, conservation and scope; record both positions and the agreed bounded list. No user HiLL or wait for routine triage. If unresolved, preserve content, choose the smaller rewrite and record disagreement. Configuration decision guidance below is mandatory scope, not optional if personas overlook it. Consensus never authorizes dropping/narrowing content or capabilities; absent explicit user removal approval, retain the item. Avoid unbounded polish and feature/code redesign.

**Verify:** Every accepted edit names an owner page, reader question, baseline facts to preserve, evidence and acceptance check. Rejected/deferred findings get explicit reasons. Approval must be durable before prose changes.

**Commit:** `docs(p06-t03): agree bounded editorial improvements with Fable`.

### Task p06-t04: Apply evidence-backed editorial improvements

**Files:** Only pages/README named in the consensus list, their canonical indexes and necessary link consumers; project `references/editorial-fact-audit.md`; bundle/release files. Dense dispatch, lifecycle and implementation guidance are candidates, not blanket rewrite authority.

**Work:** Perform one editorial round on the agreed list. Before each existing-prose rewrite/removal, extract its pre-edit page facts and have a non-author verify that ledger; preserve facts/capabilities and useful examples throughout the rewrite. Add configuration decision guidance at named owners for all meaningful choices in config-choice-map: when to choose each option, tradeoffs, verified default and rationale, and a concise which-should-I-pick summary. Complete key reference remains; guidance adds to it, never substitutes. When historical default rationale is not evidenced, distinguish the verified default from an explicitly labelled recommendation/inference instead of inventing intent. Keep universal skill scenarios and useful invocation examples intact.

**Verify:** Non-author checks each changed page against its baseline fact ledger and real source, including defaults, option semantics, tradeoff claims and examples. No missing baseline facts, invented flags, unsafe capability claims or stale catalog. `pnpm docs:validate`; `pnpm docs:test`; `pnpm docs:skills:check`; build/export checks. Regenerate catalog/index/bundles only through canonical generators.

**Commit:** `docs(p06-t04): improve whole-site clarity and configuration decisions`.

### Task p06-t05: Re-evaluate readers and execute independent final acceptance

**Files:** project `reviews/persona-developer-02.md`, `reviews/persona-adoption-02.md`, `reviews/final-visual-qa.md`, durable screenshots, `references/conservation-closeout.md`, `references/final-validation.md`; bounded accepted fixes and release files.

**Work:** Fresh non-author/source-blind reviewers rerun both persona lenses on changed pages and their end-to-end journeys. Close every baseline ledger item and meaningful config-choice gap. Then an independent reviewer, preferably Fable with verified browser access, actually operates the final committed built export. Fable reports user permission for final-only dedicated Zen on laptop; verify reachability/display ownership/window isolation at execution, not now. Mini phase smokes remain separate. If Fable is blocked, use a non-author Codex reviewer tour plus Fable's labelled artifact/HTTP/exported-HTML review; never claim Fable performed computer use when he did not.

**Exit rule:** After that one editorial round and one persona re-evaluation, triage remaining negative verdicts once more by Codex/Fable consensus into bounded small fix-now items or explicitly reported residuals. Recheck affected reader tasks after small fixes; do not start another open-ended whole-site editorial/persona loop. Residual clarity/taste/adoption findings remain visible in closeout, not falsely converted to positive verdicts. Conservation failures, unsafe/false capability claims and unresolved Critical/High defects cannot be waived as residual polish; fix within the existing bounded review budget or report blocked.

Complete seven journeys using sidebar/search/links/anchors: provider-sync-only install; project-free research; choose/start workflow; named reconcile lookup; docs bootstrap/maintenance; remote backlog planning; old-route absence with useful Home/search recovery. Inspect all five visuals and actual GitHub README on an authorized published branch. Record exact built SHA, URL, server/display hosts, desktop/narrow viewports, both themes, keyboard navigation, headings/anchors, readable diagrams, clipping/overflow, breadcrumbs/previous-next and available page-error observations. Screenshots/actions/expected/actual outcomes are mandatory; unavailable telemetry is not zero errors. HTTP/crawl/source checks do not substitute for visual QA.

**Verify:** Both reader verdicts and differences from initial review, non-author fact conservation/source audit, seven journeys/five visuals, strict validators/catalog parity, exported-site crawl and all eight release gates plus applicable lint/format. Recheck affected journeys after bounded fixes. Missing browser or authorized GitHub publication leaves that acceptance pending/blocked, not passed. Final code review and configured implementation exit gate remain distinct; preserve their retries and evidence contracts.

**Commit:** `docs(p06-t05): record reader outcomes and independent final acceptance`.

### Task p06-t06: (review) Validate reference-style Markdown routes

**Files:** `apps/oat-docs/scripts/validate.ts`, existing Markdown utilities and adjacent app tests only.

**Work:** Resolve Markdown link/image references through the existing parser and definitions, preserving code-example exclusions. Public test boundary: `validateSourceRoutes`. Missing reference targets/fragments reject; valid references pass. Existing inline-only coverage missed this syntax; Markdown definitions supply independent expected destinations. Follow deliberate-testing and prove the regression control fails before fixing.

**Verify:** `pnpm docs:test`, `pnpm docs:validate`, `pnpm --filter oat-docs type-check`; format owned files only. **Commit:** `fix(p06-t06): validate reference-style documentation links`.

### Task p06-t07: (review) Correct native-read adoption guidance

**Files:** `apps/oat-docs/docs/provider-sync/manifest-and-drift.md` and regenerated bundled docs only.

**Work:** Qualify Adopt: generated provider views receive a link, while Cursor/Copilot skills are read canonically without recreating the provider-local path or adding a managed-view manifest row. Verify against `adopt-stray.ts` and its existing native-read control. No product behavior change.

**Verify:** docs validation, existing adoption test and affected-page rendered smoke after rebuilding. **Commit:** `docs(p06-t07): clarify native-read adoption effects`.

### Task p06-t08: (review) Close final whole-site reconciliation

**Files:** project `references/conservation-closeout.md`, bounded supporting inventory and implementation tracking only.

**Work:** Re-derive current command/flag, supported-config and skill surfaces without operational actions. Account for baseline/current entries, migration sections, changed-page facts and config choices using existing evidence and canonical destinations. State named gaps and uncertain semantic mappings explicitly; names alone do not prove conservation. Do not repeat family verification or create project-dependent permanent CI. Attach the native visual supplement with residuals/limits.

**Verify:** Root independently checks extraction, provenance and aggregate accounting. **Commit:** `docs(p06-t08): reconcile final coverage and conservation`.

## Reviews

| Scope          | Type     | Status          | Date       | Artifact                                                       | Reviewed Head                            | Invocation | Gate Target          |
| -------------- | -------- | --------------- | ---------- | -------------------------------------------------------------- | ---------------------------------------- | ---------- | -------------------- |
| p01            | code     | passed          | 2026-10-02 | reviews/archived/p01-code-review-round03-2026-10-02T060828Z.md | 24d1bddfbf1ea4467125c2b8ca88c65ce57fc06a | auto       | -                    |
| p01            | code     | fixes_completed | 2026-10-02 | reviews/archived/p01-code-review-round02-2026-10-02T055341Z.md | ee1675e6be034f64a644d7fdc04aee3862cf4436 | auto       | -                    |
| p01            | code     | fixes_completed | 2026-10-02 | reviews/archived/p01-code-review-2026-10-02T045526Z.md         | 6145054067bef937d74cf7e952a0c56da67f4264 | auto       | -                    |
| p02            | code     | passed          | 2026-10-02 | reviews/archived/p02-review-2026-10-02T145912Z.md              | 2173d81d1659bf2124826244a869ca54b14b49ad | auto       | -                    |
| p02-map        | artifact | fixes_completed | 2026-10-02 | reviews/archived/p02-migration-draft-review.md                 | -                                        | auto       | -                    |
| p02-map        | artifact | passed          | 2026-10-02 | reviews/archived/p02-migration-draft-review-round02.md         | -                                        | auto       | -                    |
| final          | code     | fixes_completed | 2026-10-02 | reviews/archived/final-review-2026-10-02T213720Z.md            | c0f10a8f8d3a05cd9ac4d1f2265e8bb0f7e7c697 | auto       | -                    |
| final          | code     | passed          | 2026-10-02 | reviews/archived/final-review-2026-10-02T221307Z.md            | 75c4467aba032f6dd3b9857351a064cd18ab067c | auto       | -                    |
| spec           | artifact | pending         | -          | -                                                              | -                                        | -          | -                    |
| design         | artifact | fixes_completed | 2026-10-01 | reviews/archived/fable-design-01.md                            | -                                        | manual     | -                    |
| p03            | code     | pending         | -          | -                                                              | -                                        | -          | -                    |
| p04            | code     | pending         | -          | -                                                              | -                                        | -          | -                    |
| p05            | code     | pending         | -          | -                                                              | -                                        | -          | -                    |
| p06            | code     | pending         | -          | -                                                              | -                                        | -          | -                    |
| plan-amendment | artifact | fixes_completed | 2026-10-02 | reviews/archived/phase06-plan-amendment-2026-10-02T045216Z.md  | -                                        | auto       | -                    |
| plan           | artifact | fixes_completed | 2026-10-01 | reviews/archived/plan-review-round-01.md                       | 86aa78523952ec8e324d44dc4b61dfa961414e5e | auto       | -                    |
| plan           | artifact | passed          | 2026-10-01 | reviews/archived/plan-review-round-02.md                       | 884b56d80769cb4d94fa289f34e027973137e410 | auto       | -                    |
| design         | artifact | passed          | 2026-10-01 | reviews/archived/plan-review-round-02.md                       | 884b56d80769cb4d94fa289f34e027973137e410 | manual     | -                    |
| plan           | artifact | fixes_completed | 2026-10-02 | reviews/archived/artifact-plan-review-2026-10-02T031625Z.md    | 2e5e8e5374b101b90c5b72fde9c702d328743b38 | gate       | claude-opus-5-5-high |
| plan           | artifact | passed          | 2026-10-02 | reviews/archived/artifact-plan-review-2026-10-02T032232Z.md    | fdf2953acacced6d6703763ef0c50624ad4755ef | gate       | claude-opus-5-5-high |
| plan           | artifact | passed          | 2026-10-02 | reviews/archived/plan-review-round-03.md                       | -                                        | auto       | -                    |
| design         | artifact | passed          | 2026-10-02 | reviews/archived/plan-review-round-03.md                       | -                                        | manual     | -                    |
| final          | code     | passed          | 2026-10-02 | reviews/archived/final-review-2026-10-02T222323Z.md            | 1cbdd5b6b6b7870551394db6314705b66a97abcd | gate       | claude-opus-5-5-high |

Preserved spec row is not applicable in quick mode; no spec.md required. Events are append-ordered and bound to artifact filenames; never overwrite a bound event with a different review. No code/browser review is claimed in planning.

Attempt 1 was artifact_validation_failed and ineligible for receipt; fixes_completed records independently resolved feedback, not a gate pass. Attempt 2 passed its configured threshold and was eligible for receipt; its medium/low findings were resolved in artifacts and independently re-reviewed clean. [Final receipt and peer dispositions](reviews/archived/plan-review-round-03.md) preserve both outcomes. No planning findings remain unresolved.

## Implementation Complete

Planned scope summary; implementation.md is the authoritative live task-progress ledger. Completion is not claimed by this heading.

- Phase 1: 3 tasks — enforce navigation and authoring contracts.
- Phase 2: 3 tasks — preserve information, migrate and repair consumers.
- Phase 3: 2 tasks — evaluator README and render review.
- Phase 4: 4 tasks — mapping, independent applicability audit, coverage and catalog.
- Phase 5: 3 tasks — named gaps, four docs visuals and focused phase verification.
- Phase 6: 8 tasks — conservation, fresh personas, consensus, editorial improvements, final independent acceptance and three bounded final-review corrections.

**Total: 23 tasks, 6 sequential phases.** Implementation remains authorized; final corrections and the p06 HiLL checkpoint are pending. Earlier native phase-review omissions remain disclosed, not retroactively passed.

## References

- [Discovery](discovery.md)
- [Lightweight design](design.md)
- [IA/journeys](references/ia-consensus.md), with old-route compatibility explicitly superseded
- [Technical reconnaissance](references/planning-recon.md)
- [Skill inventory](references/skill-inventory-matrix.md)
- [Visual precedents](references/visual-precedents.md)
- [Fable approach review](references/fable-approach-review.md)
- [Fable design review](reviews/archived/fable-design-01.md)
- [Orchestration log](references/orchestration-log.md)
